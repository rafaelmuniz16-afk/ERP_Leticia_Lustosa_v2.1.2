(() => {
  'use strict';
  const A=window.__auroraAnalyticsParts,S=A.S;
  function build(data,snapshot,collector,idx) {
    const p=data.selection,c=data.metrics,comp=data.comparison,findings=[];
    const intersects=e=>e.spec && e.spec.start<=p.end && e.spec.end>=p.start;
    function add(type,category,metrics,conclusion,rule,options={}) {
      const period=options.period||{start:p.start,end:p.end},basis=options.basis||'closure_date';
      const compatible=snapshot.episodes.filter(e=>e.kind===options.memoryKind && e.spec.start===period.start && e.spec.end===period.end && (basis==='closure_date'?!['confirmation-gap','monthly-goal'].includes(e.kind):!!e.proof?.referenceBasis));
      const related=options.episodes||compatible;
      const continuity=options.continuity||(related.some(e=>e.state==='invalidated')?'contradicted':related.some(e=>e.revalidated&&e.observedDays>1)?'repeated':related.length?'previously_observed':'new');
      const evidence=[];
      for(const [key,value] of Object.entries(metrics)) {
        if(!Number.isFinite(value))continue;
        const metricPeriod=options.periods?.[key]||(key.startsWith('previous')&&comp.previous?comp.previous:period);
        const unit=options.units?.[key]||(key.endsWith('Percent')?'percent':key.endsWith('Points')?'percentage_points':'count');
        evidence.push(collector.add(type+(options.discriminator?':'+options.discriminator:'')+'.'+key,value,metricPeriod,basis,unit));
      }
      if(!evidence.length)return;
      const f={id:'an1-'+S.hash([type,period,p.type,basis,options.discriminator||'']),type,category,period,
        scope:{type:p.type,categoryType:S.types.includes(options.discriminator)?options.discriminator:null,basis,partial:period.end===snapshot.today,statusBasis:'current_record_status'},metrics,evidence,
        rule:{version:1,description:rule},conclusion,comparisonPeriod:options.comparisonPeriod||null,
        limitations:[...S.limitations,...(options.limitations||[])],validity:{state:'valid',sourceSignature:data.sourceSignature,contextSignature:data.contextSignature,evaluatedOn:snapshot.today},
        quality:options.quality||data.quality,sample:options.sample??c.registered,magnitude:options.magnitude||0,persistence:options.persistence||Math.max(1,...related.filter(e=>e.revalidated).map(e=>e.observedDays)),continuity,relatedEpisodes:related.map(e=>e.id)};
      f.relevance=A.E.relevance(f,snapshot.today);findings.push(f);
    }
    add('period_summary','production',{registered:c.registered,confirmed:c.confirmed,refused:c.refused,pending:c.pending,uncertain:c.uncertain,notConfirmed:c.notConfirmed,confirmationPercent:c.confirmationPercent,refusalPercent:c.refusalPercent},'period_counts_verified','Contagens conservadoras da Aurora Memory; confirmação exige Panjud Sim e recusa Não.');
    if(c.registered>=10 && c.notConfirmed/c.registered>=.3) add('confirmation_gap','panjud',{registered:c.registered,confirmed:c.confirmed,refused:c.refused,pending:c.pending,gap:c.notConfirmed,gapPercent:c.notConfirmed/c.registered*100},'confirmation_below_registration','Pelo menos 10 registros e diferença para confirmações de 30% ou mais.',{magnitude:c.notConfirmed/c.registered*100,persistence:comp.status==='comparable'&&comp.previousMetrics.registered>=10&&comp.previousMetrics.notConfirmed/comp.previousMetrics.registered>=.3?2:1});
    if(comp.status==='comparable') {
      const a=comp.currentMetrics,b=comp.previousMetrics,delta=comp.changes.registered.percent,rd=comp.changes.refused.percent;
      const common={period:comp.current,comparisonPeriod:comp.previous,sample:Math.min(a.registered,b.registered),quality:A.M.quality(snapshot,Math.min(a.registered,b.registered)),limitations:comp.normalized?['change_normalized_per_calendar_day']:[]};
      if(delta!==null&&Math.abs(delta)>=20) add('production_change','production',{registered:a.registered,previousRegistered:b.registered,changePercent:delta},delta>0?'production_increased':'production_decreased','Variação de pelo menos 20%; cinco registros em cada janela comparável.',{...common,magnitude:delta});
      if(b.refused>=3&&rd!==null&&Math.abs(rd)>=25) add('refusal_change','refusal',{refused:a.refused,previousRefused:b.refused,changePercent:rd,ratePoints:comp.percentagePoints.refusal},rd>0?'refusals_increased':'refusals_decreased','Três recusas anteriores e variação mínima de 25%. Sem inferência causal.',{...common,magnitude:rd});
      if(a.registered>=10&&b.registered>=10&&delta>=20&&comp.changes.confirmed.percent!==null&&Math.abs(comp.changes.confirmed.percent)<=10) add('production_confirmation_relation','panjud',{registered:a.registered,previousRegistered:b.registered,confirmed:a.confirmed,previousConfirmed:b.confirmed,productionChangePercent:delta,confirmationChangePercent:comp.changes.confirmed.percent},'production_growing_confirmations_stable','Produção cresce 20% e confirmações variam no máximo 10%; dez registros em cada janela.',{...common,magnitude:delta});
      if(a.registered>=10&&b.registered>=10&&b.notConfirmed/b.registered>=.3&&Math.abs(comp.percentagePoints.confirmation)>=5) add('confirmation_gap_change','panjud',{registered:a.registered,previousRegistered:b.registered,confirmed:a.confirmed,previousConfirmed:b.confirmed,gapPercent:a.notConfirmed/a.registered*100,previousGapPercent:b.notConfirmed/b.registered*100,gapChangePoints:-comp.percentagePoints.confirmation},comp.percentagePoints.confirmation>0?'confirmation_gap_reduced':'confirmation_gap_increased','Diferença anterior de pelo menos 30%; mudança de pelo menos cinco pontos; dez registros por janela.',{...common,magnitude:comp.percentagePoints.confirmation});
      if(delta!==null&&Math.abs(delta)<=10&&rd<=-25&&b.refused>=3) add('stable_production_fewer_refusals','refusal',{registered:a.registered,previousRegistered:b.registered,refused:a.refused,previousRefused:b.refused,productionChangePercent:delta,refusalChangePercent:rd},'stable_production_with_fewer_refusals','Produção varia até 10% e recusas caem ao menos 25%.',{...common,magnitude:rd});
      if(a.registered>=20&&b.registered>=20) for(const t of S.types) { const pp=comp.percentagePoints.types[t]; if(pp!==null&&Math.abs(pp)>=20) add('type_shift','distribution',{count:a.types[t],previousCount:b.types[t],sharePoints:pp},'type_share_changed','Vinte registros por janela e mudança de participação de vinte pontos.',{...common,discriminator:t,magnitude:pp}); }
    }
    if(c.registered>=10) {
      const top=S.types.reduce((a,b)=>c.types[a]>=c.types[b]?a:b),share=c.typePercent[top];
      const known=S.types.filter(t=>t!=='other');
      const balanced=c.types.other===0&&known.every(t=>Math.abs(c.typePercent[t]-100/known.length)<=10);
      add('type_distribution','distribution',{...c.types,largestSharePercent:share},share>=60?'type_distribution_concentrated':balanced?'type_distribution_balanced':'type_distribution_mixed','Concentração: 60%; equilíbrio: quatro tipos conhecidos próximos de um quarto (±10 pontos).',{discriminator:top,magnitude:share});
      for(const t of S.types) {const v=data.distribution[t];if(v.registered>=10&&v.refused>=3&&v.shareOfRefusals>=60) add('refusal_concentration','refusal',{registered:v.registered,refused:v.refused,withinTypePercent:v.refusalPercent,shareOfRefusalsPercent:v.shareOfRefusals},'refusals_concentrated_in_type','Dez registros, três recusas no tipo e 60% das recusas da janela.',{discriminator:t,magnitude:v.shareOfRefusals});}
    }
    if(data.records.status==='available') for(const [type,v] of Object.entries(data.records.values)) if(v.best && (v.exceeded||v.near) && v.best.total>=5) add('historical_record','record',{current:v.current,currentValue:v.currentValue,previousBest:v.best.total,previousValue:v.best.value,distance:v.distance,ratioPercent:v.ratioPercent},v.exceeded?'available_history_record_exceeded':'near_available_history_record','Superação ou pelo menos 90% do melhor período histórico comparável; referência com cinco registros.',{discriminator:type,periods:{previousBest:v.best.period,previousValue:v.best.period},comparisonPeriod:v.best.period,units:{currentValue:data.records.unit,previousValue:data.records.unit,distance:data.records.unit},magnitude:v.exceeded?30:15,limitations:['partial_current_is_lower_bound','record_only_in_loaded_history']});
    if(data.goal.status==='available') {
      const g=data.goal,period={start:g.period+'-01',end:snapshot.today};
      add('goal_progress','goal',{target:g.target,confirmed:g.confirmed,attainmentPercent:g.percent,remaining:g.remaining,remainingWeekdays:g.remainingWeekdays,requiredPerWeekday:g.requiredPerWeekday},'current_confirmed_goal_progress','Configuração confirmada atual; contagem conservadora por ano e mês de referência.',{period,basis:g.basis,limitations:g.limitations,magnitude:g.percent,memoryKind:'monthly-goal'});
      if(comp.status==='comparable'&&comp.changes.registered.percent>=20&&g.percent>=80&&g.percent<100) add('production_goal_relation','goal',{productionChangePercent:comp.changes.registered.percent,attainmentPercent:g.percent,remaining:g.remaining},'production_increased_and_current_goal_near','Produção cresce pelo menos 20%; meta atual entre 80% e 100%. Bases distintas, sem relação causal.',{basis:'mixed_closure_comparison_and_current_reference_goal',limitations:['different_bases_explicit_no_causal_or_projection_claim'],magnitude:comp.changes.registered.percent,periods:{productionChangePercent:comp.current}});
    }
    for(const k of ['registered','confirmed','refused',...S.types]) {
      const trend=data.trends.metrics[k]; if(['insufficient_history','oscillation'].includes(trend.classification)||!data.trends.windows.length)continue;
      const windows=data.trends.windows,metrics=Object.fromEntries(trend.values.map((v,i)=>['window'+i,v])),periods=Object.fromEntries(windows.map((w,i)=>['window'+i,{start:w.start,end:w.end}]));
      add('trend_'+k,k==='refused'?'refusal':'production',metrics,trend.classification,trend.method,{period:{start:windows[0].start,end:windows.at(-1).end},periods,units:Object.fromEntries(Object.keys(metrics).map(k=>[k,data.trends.normalization])),quality:trend.quality,sample:windows.reduce((n,w)=>n+w.metrics.registered,0),magnitude:trend.relativeChange||0,persistence:windows.length,limitations:data.trends.limitations});
    }
    const f=data.financial;
    if(f.status==='available') add('official_financial_snapshot','goal',{...f.values,officialConfirmed:f.officialConfirmed,officialGoal:f.officialGoal},'official_calculated_financial_values','Valores retornados sem transformação por calculate e calcFinancial.',{basis:f.basis,limitations:f.limitations,units:{percent:'ratio',onus:'BRL',acordo:'BRL',exito:'BRL',inativacao:'BRL',total:'BRL',idealTotal:'BRL'}});
    if(p.type==='all') for(const e of snapshot.episodes.filter(e=>e.revalidated&&e.proof&&intersects(e)).slice(0,20)) {
      const metrics=Object.fromEntries(Object.entries(e.proof.evidence).filter(([,v])=>Number.isFinite(v)));
      add('memory_'+e.kind,e.category,metrics,'revalidated_memory_pattern',e.proof.rule,{period:e.proof.period,basis:e.proof.referenceBasis?'record_year_and_reference_month':'closure_date',episodes:[e],memoryKind:e.kind,discriminator:e.id,magnitude:e.proof.score,limitations:['memory_rule_revalidated_in_current_source',...(e.proof.referenceBasis?[e.proof.referenceBasis]:[])],periods:e.spec.baselineStart?Object.fromEntries(Object.keys(metrics).filter(k=>/^(baseline|prior|weeklyAverage)/.test(k)).map(k=>[k,{start:e.spec.baselineStart,end:e.spec.baselineEnd}])):{}});
    }
    // A failed revalidation is a change in support, never proof of a judicial cause.
    if(p.type==='all') for(const e of snapshot.episodes.filter(e=>e.state==='invalidated'&&intersects(e)).slice(0,10)) {
      const reference=['confirmation-gap','monthly-goal'].includes(e.kind);
      if(reference&&e.spec.start.slice(0,7)!==snapshot.goal.period)continue;
      const current=reference?snapshot.goal.referenceTotals:idx(e.spec);
      add('memory_pattern_change',e.category,{registered:current.registered,confirmed:current.confirmed,refused:current.refused,observedDays:e.observedDays},'previous_pattern_not_revalidated','O descritor do episódio não passou na reavaliação da Aurora Memory; números atuais apresentados apenas como contexto.',{period:{start:e.spec.start,end:e.spec.end},basis:reference?'record_year_and_reference_month':'closure_date',episodes:[e],continuity:'contradicted',discriminator:e.id,sample:current.registered,quality:A.M.quality(snapshot,current.registered),limitations:['does_not_prove_cause_or_exact_transition_time','past_evidence_not_reused_as_current_fact',...(reference?['whole_reference_month_in_available_records_as_of_evaluation']:[])]});
    }
    return findings.sort((a,b)=>b.relevance.score-a.relevance.score||a.id.localeCompare(b.id));
  }
  A.R={build};
})();
