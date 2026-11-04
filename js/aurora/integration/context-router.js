/* Phase 3. Consumers only: no ERP writes, Memory mutation or background work. */
(() => {
  'use strict';
  const I = window.__auroraIntegrationParts = {};
  const freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
  const hash = value => { const s=JSON.stringify(value); let a=2166136261,b=5381; for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i);}return (a>>>0).toString(16)+(b>>>0).toString(16); };
  const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const shift = (d,n) => new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  const aborted = () => new DOMException('Cancelado','AbortError');
  function context(selection){try { const c=window.AuroraAnalytics?.getContext(selection);return c?.status==='available'?c:null; }catch(_){return null;}}
  function selection(period,channel){
    const now=today();
    if(period.start===period.end)return {period:'day',date:period.start,audience:channel};
    if(period.start.endsWith('-01') && period.end===now && period.start.slice(0,7)===now.slice(0,7))return {period:'month',audience:channel};
    return {period:'custom',start:period.start,end:period.end,audience:channel};
  }
  // Only contexts and consumer aggregates constructed by the adapters enter here.
  function request(channel,contexts,extra,scope,rebuild){
    const claims=[...extra,...contexts.flatMap(({context:c,selection:s,label,filter})=>c.findings.filter(f=>!filter||filter(f)).map(f=>I.G.fromFinding(f,c,s,label)).filter(Boolean))];
    const seen=new Set(),unique=claims.filter(c=>{const k=c.dedup||c.id;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,14);
    const presentation=window.AuroraRefinement?.getPreferences?.().style||null;
    const signature=hash(['3.1.3-whatsapp',presentation,channel,today(),scope,contexts.map(c=>c.context.contextSignature),unique]);
    return {channel,signature,presentation,day:today(),scope,claims:freeze(unique),contexts,rebuild};
  }
  // ERP mutations dispatch erp:rendered. Reuse an already checked projection until
  // that event, a source replacement, a Memory/Analytics revision or a day change.
  // Environments without the event bridge always perform the complete check.
  let epoch=0;const checked=new WeakMap();
  const eventBridge=typeof window.addEventListener==='function';
  if(eventBridge)window.addEventListener('erp:rendered',()=>{epoch++;});
  function guard(r){
    if(!eventBridge||!['reports','work-center'].includes(r.channel))return null;
    const erp=window.obterContextoERP?.();if(!erp)return null;
    return {rows:erp.bd,key:JSON.stringify([epoch,today(),erp.bd.length,erp.metas,
      window.AuroraMemory?.getAnalyticalSnapshot?.().contextSignature,
      r.contexts.map(c=>context(c.selection)?.contextSignature)])};
  }
  function current(r){
    if(r.day!==today()||(r.presentation||null)!==(window.AuroraRefinement?.getPreferences?.().style||null))return false;
    try{
      const g=guard(r),prior=checked.get(r);
      if(g&&prior&&g.rows===prior.rows&&g.key===prior.key)return true;
      const valid=r.rebuild().signature===r.signature;
      if(valid&&g)checked.set(r,g);else checked.delete(r);
      return valid;
    }catch(_){return false;}
  }
  function focus(r,id){const c=r.claims.find(c=>c.id===id);if(!c)throw Error('STALE_CLAIM');return {...r,signature:hash([r.signature,id]),claims:freeze([c]),rebuild:()=>focus(r.rebuild(),id)};}
  I.U={freeze,hash,today,shift,aborted};I.R={context,selection,request,current,focus};
})();
