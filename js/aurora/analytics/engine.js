/* Read-only, on-demand API. No timers, listeners, network or persistent writes. */
(() => {
  'use strict';
  const A=window.__auroraAnalyticsParts;delete window.__auroraAnalyticsParts;
  if(!A?.S||!A.M||!A.C||!A.T||!A.E||!A.R||!A.Context)return;
  const {S,M,C,T,E,R,Context}=A,cache=new Map(),indexes=new Map();let lastSignature=null,generation=0;
  const diagnostics={analyses:0,cacheHits:0,indexBuilds:0,sourceInvalidations:0,failures:0,lastDurationMs:0};
  function source(){
    try {
      const s=window.AuroraMemory?.getAnalyticalSnapshot?.();
      if(!s||s.schemaVersion!==1)return {error:'memory_contract_unavailable'};
      if(!['available','empty','no_valid_data'].includes(s.dataStatus))return {error:'memory_'+s.dataStatus};
      if(s.today!==S.today())return {error:'memory_day_stale'};
      if(!Array.isArray(s.days)||!s.sourceSignature||!s.contextSignature)return {error:'invalid_memory_contract'};
      if(s.contextSignature!==lastSignature){cache.clear();indexes.clear();lastSignature=s.contextSignature;diagnostics.sourceInvalidations++;}
      return {snapshot:s};
    }catch(_){diagnostics.failures++;return {error:'memory_failed'};}
  }
  const index=(s,type)=>{if(!indexes.has(type)){indexes.set(type,M.index(s,type));diagnostics.indexBuilds++;}return indexes.get(type)};
  function analyze(input={}){
    // Validate even when Memory is unavailable. Current civil clock belongs to the ERP.
    const p=S.selection(input,S.today()),read=source();
    if(read.error)return S.copy({schemaVersion:1,status:'unavailable',reason:read.error,contextSignature:null});
    const snapshot=read.snapshot,key=JSON.stringify(p),financial=p.includeFinancial&&p.financialAuthorized;
    if(!financial&&cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);diagnostics.cacheHits++;return value;}
    const started=performance.now();
    try {
      const idx=index(snapshot,p.type),metrics=idx(p),fin=M.financial(snapshot,p);
      const contextSignature='ac1-'+S.hash([snapshot.contextSignature,p,generation,financial?fin:null]);
      const result={schemaVersion:1,status:'available',dataStatus:snapshot.dataStatus,selection:p,sourceSignature:snapshot.sourceSignature,contextSignature,metrics,
        quality:M.quality(snapshot,metrics.registered),dataQuality:snapshot.quality,distribution:M.distribution(snapshot,p),series:M.series(idx,p),
        comparison:C.automatic(idx,p,snapshot),dailyReference:C.dailyReference(idx,p,snapshot),records:C.records(idx,p,snapshot),trends:T.build(idx,p,snapshot),goal:M.goal(snapshot,p),financial:fin,
        episodes:snapshot.episodes.filter(e=>e.spec.start<=p.end&&e.spec.end>=p.start),limitations:[...S.limitations,...(p.partial?['current_period_incomplete']:[])]};
      const evidence=E.collector(snapshot.sourceSignature,contextSignature);result.findings=R.build(result,snapshot,evidence,idx);result.evidence=evidence.all();
      const value=S.freeze(result);diagnostics.analyses++;diagnostics.lastDurationMs=performance.now()-started;
      if(!financial){cache.set(key,value);while(cache.size>12)cache.delete(cache.keys().next().value);}
      return value;
    }catch(_){diagnostics.failures++;return S.copy({schemaVersion:1,status:'unavailable',reason:'analysis_failed',contextSignature:null});}
  }
  function comparePeriods(current,previous,options={}){
    if(!options||typeof options!=='object'||Object.keys(options).some(k=>k!=='type')||!['all',...S.types].includes(options.type||'all'))throw new TypeError('INVALID_OPTIONS');
    const day=S.today();S.range(current,day);S.range(previous,day);const read=source();if(read.error)return S.copy({status:'unavailable',reason:read.error});
    try{
      const s=read.snapshot,type=options.type||'all',result=C.compare(index(s,type),current,previous,s);
      return S.copy({...result,schemaVersion:1,type,sourceSignature:s.sourceSignature,contextSignature:'ac1-'+S.hash([s.contextSignature,current,previous,type,generation]),evaluatedOn:s.today,dataQuality:s.quality});
    }catch(_){diagnostics.failures++;return S.copy({status:'unavailable',reason:'comparison_failed'})}
  }
  const getContext=input=>S.freeze(Context.build(analyze(input)));
  const select=(field,input)=>analyze(input)[field]||S.freeze([]);
  function invalidate(){cache.clear();indexes.clear();lastSignature=null;generation++;return getStatus()}
  const getStatus=()=>S.copy({schemaVersion:1,...diagnostics,cachedSelections:cache.size,cachedIndexes:indexes.size,readOnly:true,networkCalls:0,officialDataWrites:0,autoPresents:false});
  window.AuroraAnalytics=Object.freeze({analyze,comparePeriods,getTrends:input=>select('trends',input),getRelations:input=>S.freeze(select('findings',input).filter(f=>/relation|stable_production/.test(f.type))),getFindings:input=>select('findings',input),getEvidence:input=>select('evidence',input),getContext,validateConclusions:(proposal,input)=>Context.validate(proposal,getContext(input)),invalidate,getStatus});
})();
