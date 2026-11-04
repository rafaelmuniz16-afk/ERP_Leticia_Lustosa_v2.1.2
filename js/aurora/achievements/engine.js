(() => {
  'use strict';
  const DAY = 86400000, C = window.AuroraAchievementCatalog;
  const fieldNames = ['_uid','data','tipo','panjud','recusado'];
  const value = v => v == null ? '' : String(v);
  function date(value) {
    const s = String(value || '').split(/[T ]/)[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || s.slice(0,4) === '0000') return '';
    const t = Date.parse(s + 'T12:00:00Z');
    return Number.isFinite(t) && new Date(t).toISOString().slice(0,10) === s ? s : '';
  }
  const shift = (d,n) => new Date(Date.parse(d+'T12:00:00Z') + DAY*n).toISOString().slice(0,10);
  const weekday = d => new Date(d+'T12:00:00Z').getUTCDay();
  const monday = d => shift(d,-((weekday(d)+6)%7));
  const increment = (m,k) => m.set(k,(m.get(k)||0)+1);
  const maximum = map => { let n=0; for (const v of map.values()) n=Math.max(n,v); return n; };
  const atLeast = (map,n) => { let count=0; for (const v of map.values()) if (v>=n) count++; return count; };
  function* aggregateSteps(records, today) {
    if (!date(today) || today !== date(today)) throw new Error('Data de avaliação inválida.');
    const stats = Object.fromEntries(Object.keys(C.metrics).map(k=>[k,0]));
    const quality = {invalidDates:0,futureDates:0,duplicateRows:0,conflictingUids:0,missingUid:0,statusConflicts:0,unknownTypes:0,invalidRows:0};
    const unique = new Map(), unkeyed = [], objects = new WeakSet(), conflicts = new Set();
    let work=0;
    for (const r of Array.isArray(records) ? records : []) {
      if(++work % 500===0) yield;
      if (!r || typeof r !== 'object' || Array.isArray(r)) { quality.invalidRows++; continue; }
      if (objects.has(r)) { quality.duplicateRows++; continue; } objects.add(r);
      const id = value(r._uid);
      if (!id.trim()) { quality.missingUid++; unkeyed.push(r); continue; }
      if (!unique.has(id)) unique.set(id,r);
      else {
        quality.duplicateRows++;
        // Sem revisão/horário confiável, não escolhemos arbitrariamente uma versão.
        if (fieldNames.some(k=>value(unique.get(id)[k])!==value(r[k]))) conflicts.add(id);
      }
    }
    quality.conflictingUids = conflicts.size;
    const days=new Map(), weeks=new Map(), months=new Map(), years=new Map(), confirmedDays=new Set(), monthTypes=new Map(), dates=new Map();
    function consume(r) {
      const raw=value(r.data);
      if(!dates.has(raw)) { const d=date(raw);dates.set(raw,{d,ym:d.slice(0,7),year:d.slice(0,4),week:d?monday(d):''}); }
      const {d,ym,year,week}=dates.get(raw);
      if (!d) { quality.invalidDates++; return; }
      if (d>today) { quality.futureDates++; return; }
      stats.total++;
      increment(days,d); increment(weeks,week); increment(months,ym); increment(years,year);
      if (r.panjud==='Sim' && r.recusado==='Não') { stats.confirmed++; confirmedDays.add(d); }
      if (r.panjud==='Sim' && r.recusado==='Sim') quality.statusConflicts++;
      const type={'Ônus':'onus',Acordo:'acordo','Êxito':'exito','Inativação':'inativacao'}[r.tipo];
      if (type && Object.hasOwn(stats,type)) {
        stats[type]++;
        if (!monthTypes.has(ym)) monthTypes.set(ym,new Set()); monthTypes.get(ym).add(type);
      } else quality.unknownTypes++;
    }
    for (const [id,r] of unique) { if(++work % 500===0) yield;if (!conflicts.has(id)) consume(r); }
    for(const r of unkeyed) { if(++work % 500===0) yield;consume(r); }
    Object.assign(stats,{days:days.size,weeks:weeks.size,months:months.size,years:years.size,confirmedDays:confirmedDays.size,
      daily:maximum(days),weekly:maximum(weeks),monthly:maximum(months),annual:maximum(years),
      days3:atLeast(days,3),weeks5:atLeast(weeks,5),months10:atLeast(months,10),
      types:['onus','acordo','exito'].filter(k=>stats[k]>0).length,
      minType:Math.min(stats.onus,stats.acordo,stats.exito),
      diverseMonths:[...monthTypes.values()].filter(s=>s.size===3).length});
    let last='', streak=0;
    for (const d of [...days.keys()].sort()) {
      if(++work % 500===0) yield;
      if ([0,6].includes(weekday(d))) continue;
      let previous=shift(d,-1); while ([0,6].includes(weekday(previous))) previous=shift(previous,-1);
      streak=previous===last ? streak+1 : 1; last=d; stats.streak=Math.max(stats.streak,streak);
    }
    return {stats,quality,today};
  }
  function aggregate(records,today) {
    const steps=aggregateSteps(records,today);let step;
    do{step=steps.next();}while(!step.done);return step.value;
  }
  async function evaluateAsync(records,today,{signal,yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0))}={}) {
    const steps=aggregateSteps(records,today);
    while(true) {
      if(signal?.aborted){const error=new Error('Avaliação cancelada.');error.name='AbortError';throw error;}
      const step=steps.next();if(step.done)return evaluate(step.value);
      await yieldTask();
    }
  }
  function evaluateRule(rule,stats) {
    if (rule.operator==='gte') {
      const current = Number.isFinite(stats[rule.metric]) ? Math.max(0,stats[rule.metric]) : 0;
      return {operator:'gte',metric:rule.metric,target:rule.target,current,met:current>=rule.target,percent:Math.min(100,current/rule.target*100)};
    }
    const conditions=rule.conditions.map(r=>evaluateRule(r,stats));
    const met=rule.operator==='all' ? conditions.every(c=>c.met) : conditions.some(c=>c.met);
    // AND: menor requisito; OR: melhor alternativa. Nunca somar unidades diferentes.
    const percent=(rule.operator==='all' ? Math.min : Math.max)(...conditions.map(c=>c.percent));
    return {operator:rule.operator,conditions,met,percent};
  }
  function evaluate(aggregateResult) {
    let blocked=false,completedLevels=0,completedMissions=0;
    const levels=C.levels.map(def=>{
      const locked=blocked;
      const missions=def.missions.map(definition=>{
        const progress=evaluateRule(definition,aggregateResult.stats);
        return {...definition,progress,current:progress.current??null,percent:progress.percent,met:progress.met,unlocked:!locked&&progress.met,
          state:locked ? (progress.met?'requisito-alcancado':'bloqueada') : progress.met?'concluida':'pendente'};
      });
      const met=missions.every(m=>m.met),complete=!locked&&met;
      if (complete) completedLevels++; else blocked=true;
      completedMissions+=missions.filter(m=>m.unlocked).length;
      return {...def,missions,complete,locked,state:complete?'concluido':locked?'bloqueado':'atual',done:missions.filter(m=>m.met).length};
    });
    const currentLevel=Math.min(70,completedLevels+1);
    return {...aggregateResult,version:C.VERSION,levels,completedLevels,completedMissions,currentLevel,current:levels[currentLevel-1],finished:completedLevels===70};
  }
  function createCache() {
    let previous='',result=null,builds=0;
    return {get(records,today) {
      // Checa somente campos relevantes; detecta edição in-place e troca de data.
      const seen=new WeakMap();
      const signature=JSON.stringify([today,(Array.isArray(records)?records:[]).map((r,i)=>{
        if(!r||typeof r!=='object')return null;
        if(seen.has(r))return {copyOf:seen.get(r)};
        seen.set(r,i);return fieldNames.map(k=>value(r[k]));
      })]);
      if (signature!==previous || !result) { result=evaluate(aggregate(records,today)); previous=signature; builds++; }
      return result;
    },get builds(){return builds;}};
  }
  const STORAGE_KEY='aurora_achievements_ui_v2';
  function transition(raw,result) {
    const valid = raw && raw.version===C.VERSION && Number.isInteger(raw.bestRank) && raw.bestRank>=0 && raw.bestRank<=70;
    const old = valid ? raw : null;
    const animations = typeof raw?.animations==='boolean' ? raw.animations : true;
    const state={version:C.VERSION,animations,initialized:!!old?.initialized,lastRank:result.completedLevels,bestRank:Math.max(old?.bestRank||0,result.completedLevels)};
    let notice='';
    if (result.stats.total>0 && !state.initialized) { state.initialized=true; notice=raw&&raw.version!==C.VERSION?'recalculated':'history'; }
    else if (state.initialized && result.completedLevels>(old?.bestRank||0)) notice=result.finished?'complete':'level';
    else if (old && result.completedLevels<old.lastRank) notice='recalculated';
    return {state,notice};
  }
  window.AuroraAchievementEngine=Object.freeze({aggregate,evaluate,evaluateAsync,evaluateRule,date,monday,createCache,transition,STORAGE_KEY});
})();
