(() => {
  'use strict';
  const A=window.__auroraAnalyticsParts,S=A.S;
  function collector(sourceSignature,contextSignature) {
    const facts=new Map();
    return { add(metric,value,period,basis='closure_date',unit='count') {
      if(!Number.isFinite(value)) throw new TypeError('NON_FINITE_EVIDENCE');
      const id='ev1-'+S.hash([sourceSignature,contextSignature,metric,period,basis,unit]);
      if(facts.has(id) && facts.get(id).value!==value) throw new TypeError('EVIDENCE_COLLISION');
      facts.set(id,{id,metric,value,unit,period:{start:period.start,end:period.end},basis,sourceSignature,contextSignature,reliability:'verified_calculation'});return id;
    }, all:()=>[...facts.values()].sort((a,b)=>a.id.localeCompare(b.id)) };
  }
  function relevance(f,today) {
    const parts={magnitude:Math.min(25,Math.round(Math.abs(f.magnitude||0)/2)),sample:Math.min(15,Math.floor(f.sample/10)),persistence:Math.min(15,Math.max(0,f.persistence-1)*5),
      novelty:f.continuity==='new'?10:0,goal:f.category==='goal'?10:0,contradiction:f.continuity==='contradicted'?10:0,
      recency:f.period.end>=S.shift(today,-7)?10:0,redundancy:f.continuity==='repeated'?-10:0,quality:f.quality.status==='sufficient'?10:f.quality.status==='limited'?-15:-50};
    const score=Math.max(0,Math.min(100,Object.values(parts).reduce((a,b)=>a+b,0)));
    return {score,classification:f.sample<5||f.quality.status==='insufficient_sample'?'informative':score>=65&&f.quality.status==='sufficient'?'priority':score>=35?'relevant':'informative',components:parts,meaning:'operational_not_legal_severity'};
  }
  A.E={collector,relevance};
})();
