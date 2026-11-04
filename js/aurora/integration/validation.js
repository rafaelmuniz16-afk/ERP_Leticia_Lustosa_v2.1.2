/* Phase 3.1 validates every complete unit and preserves only independently proven units. */
(() => {
  'use strict';const I=window.__auroraIntegrationParts;
  const headings={context:'Panorama do recorte',evolution:'Evolução verificável',attention:'Relações para acompanhar',memory:'Continuidade no histórico',financial:'Leitura do cálculo',distribution:'Composição do recorte',goal:'Meta vigente',record:'Referência histórica'};
  const keys=(o,expected)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===expected.slice().sort().join();
  function examine(raw,r){
    const rejected=[],units=[],seen=new Set(),fail=(reason,category='format')=>({valid:false,status:'rejected',units:[],rejected:[{unit:null,reason,category}]});
    if(typeof raw!=='string'||raw.length>24000)return fail('INVALID_RESPONSE');
    let d;try{d=JSON.parse(raw.replace(/^\uFEFF/,'').trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1'));}catch(_){return fail('INVALID_JSON');}
    if(!keys(d,['signature','units'])||!Array.isArray(d.units)||!d.units.length||d.units.length>5)return fail('INVALID_SCHEMA');
    if(d.signature!==r.signature||!I.R.current(r))return fail('STALE_CONTEXT','factual');
    if(r.channel==='observa'&&d.units.length!==1)return fail('OBSERVA_LIMIT');
    for(let index=0;index<d.units.length;index++){
      const unit=d.units[index],reject=(reason,category='factual')=>rejected.push({unit:index,reason,category});
      if(!keys(unit,['claimIds','text'])||!Array.isArray(unit.claimIds)||!unit.claimIds.length||unit.claimIds.length>3||new Set(unit.claimIds).size!==unit.claimIds.length||typeof unit.text!=='string'||unit.text.length>(r.channel==='observa'?700:2000)){reject('INVALID_UNIT','format');continue;}
      const claims=unit.claimIds.map(id=>r.claims.find(c=>c.id===id));
      if(claims.some(c=>!c)){reject('UNKNOWN_CLAIM');continue;}
      if(claims.some(c=>c.kind==='financial')&&!(r.scope.authorized===true||r.scope.financial===true)){reject('FINANCIAL_NOT_AUTHORIZED');continue;}
      if(claims.some(c=>seen.has(c.id))){reject('REPEATED_CLAIM');continue;}
      let supported=true;
      for(const c of claims)if(c.analytical){
        const p={contextSignature:c.contextSignature,claims:[{findingId:c.findingId,conclusion:c.conclusion,values:c.evidence.map(e=>({id:e.id,value:e.value}))}]};
        if(!window.AuroraAnalytics.validateConclusions(p,c.selection).valid){supported=false;break;}
      }
      if(!supported){reject('UNSUPPORTED_FINDING');continue;}
      const specs=claims.map(I.Semantics.compile);
      if(new Set(specs.map(s=>s.scopeKey)).size!==1){reject('MIXED_SCOPES');continue;}
      const language=I.Language.check(unit.text,specs);
      if(!language.ok){reject(language.reason);if(Number.isInteger(language.segment))rejected.at(-1).segment=language.segment;continue;}
      claims.forEach(c=>seen.add(c.id));units.push({claims,...language});
    }
    const useful=r.claims.some(c=>!['context','distribution'].includes(c.kind));
    if(!units.length)return {valid:false,status:'rejected',units:[],rejected};
    if(!units.some(u=>u.hasExplanation))return fail('NO_EXPLANATION','factual');
    if((r.channel==='reports'&&useful||r.channel==='observa')&&!units.some(u=>u.assertions.some(a=>a.category==='fact'&&!/^(metric\.|sample\.)/.test(a.predicate)&&u.claims.some(c=>c.id===a.claimId&&!['context','distribution'].includes(c.kind)))))return fail('NO_SPECIFIC_DISCOVERY','factual');
    if(r.channel==='work-center'&&!units.some(u=>u.claims.some(c=>!c.analytical)))return fail('NO_FILTERED_DISCOVERY','factual');
    return {valid:true,status:rejected.length?'partial':'approved',units,rejected};
  }
  function inspect(raw,r){try{return examine(raw,r);}catch(_){return {valid:false,status:'rejected',units:[],rejected:[{unit:null,reason:'VALIDATION_UNAVAILABLE',category:'factual'}]};}}
  function validate(raw,r){try{const result=inspect(raw,r);return result.valid?result.units:null;}catch(_){return null;}}
  function render(units,r){
    const sections=[];
    const topics={onus:'Ônus',agreement:'Acordo',success:'Êxito',inactivation:'Inativação',other:'Outros tipos','Ônus':'Ônus','Acordo':'Acordo','Êxito':'Êxito','Inativação':'Inativação',confirmed:'Confirmações',refused:'Recusas'};
    for(const unit of units){
      const c=unit.claims[0],topic=topics[c.semantic?.topic];
      const patterns={'confirmation-gap':'diferença entre registros e confirmações','recurring-refusals':'recusas em janelas consecutivas','production-above':'produção acima da referência','production-below':'produção abaixo da referência','type-shift':'composição por tipo','daily-record':'recorde diário','monthly-goal':'meta mensal','weekday-streak':'sequência de dias úteis com registros'};
      const pattern=patterns[c.semantic?.memoryKind],contextLabel=[topic&&'Indicador: '+topic,pattern&&'Padrão: '+pattern].filter(Boolean).join(' · ');
      const scope=c.scope+(contextLabel?' · '+contextLabel:'');
      const qualifier=c.semantic?.limitations?.includes('change_normalized_per_calendar_day')?' Variações comparativas normalizadas por dia civil.':'';
      const financialBasis=c.semantic?.type==='official_financial_snapshot'?' Base oficial: mês de referência em todos os anos carregados.':'';
      let section=sections.find(s=>s.title===headings[c.kind]);if(!section){section={title:headings[c.kind],paragraphs:[]};sections.push(section);}
      section.paragraphs.push((r.channel==='observa'?(contextLabel?contextLabel+' — ':''):scope+' — ')+unit.text+qualifier+financialBasis);
    }
    return sections;
  }
  function renderLocal(sections,r){
    const explained=new Set();
    return sections.map(section=>{
      const paragraphs=section.items.map(({claim:c,variant,implication})=>{
        const form=c.forms[variant];const text=[form.lead,...(r.channel==='observa'&&r.presentation!=='analytical'||r.presentation==='objective'?[]:[form.detail]),c.implications[implication]].filter(t=>{if(!t||explained.has(t))return false;explained.add(t);return true;}).join(' ');
        return (r.channel==='observa'?'':c.scope+' — ')+I.G.renderText(text,c);
      });
      return {title:headings[section.heading],paragraphs};
    });
  }
  I.V={inspect,validate,render,renderLocal,headings};
})();
