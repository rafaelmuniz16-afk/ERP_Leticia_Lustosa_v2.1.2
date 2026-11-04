/* Presentation policy only. No records, model calls or analytical conclusions. */
(() => {
 'use strict';const A=window.__auroraAutonomyParts,{hash,date,copy}=A.U;
 const reasons=['repetitive','low_relevance','generic','long','out_of_context','apparently_incorrect','other'];
 const categories=['production','panjud','refusal','distribution','record','goal','consistency','observation'];
 const limits=Object.freeze({retentionMs:30*86400000,maxEntries:40,maxBytes:24000,minSamples:5,minDays:3,adjustment:5,feedbackMs:10*60000});
 const defaults=()=>({version:1,enabled:true,epoch:0,revision:0,feedback:[]});
 const timestamp=n=>Number.isSafeInteger(n)&&n>=0&&n<=Date.now()+60000;
 const hex=s=>typeof s==='string'&&/^[a-f0-9]{1,32}$/.test(s);
 function decode(raw){
  if(raw===undefined)return {ok:true,value:defaults()};
  if(!raw||raw.version!==1||!Array.isArray(raw.feedback)||typeof raw.enabled!=='boolean'||!timestamp(raw.epoch)||!Number.isSafeInteger(raw.revision)||raw.revision<0)return {ok:false,reason:raw?.version>1?'FUTURE_SCHEMA':'INVALID_REFINEMENT'};
  const v={version:1,enabled:raw.enabled,epoch:raw.epoch,revision:raw.revision,feedback:[]},seen=new Set();
  for(const e of raw.feedback.slice(-120).sort((a,b)=>(b?.at||0)-(a?.at||0))){
   if(!e||!/^autonomy:[a-f0-9]{16}$/.test(e.id)||!hex(e.family)||!hex(e.context)||!hex(e.meaning)||!categories.includes(e.category)||!/^\w[\w-]{0,55}$/.test(e.type)||!date(e.period?.start)||!date(e.period?.end)||e.period.start>e.period.end||!timestamp(e.at)||Date.now()-e.at>=limits.retentionMs||!['positive','negative'].includes(e.value)||!(e.reason===null||reasons.includes(e.reason))||!['local','groq','fallback'].includes(e.source)||e.contract!==1||e.validity!=='verified_at_feedback'||seen.has(e.id))continue;
   seen.add(e.id);v.feedback.push({id:e.id,eventId:/^autonomy:[a-f0-9]{16}$/.test(e.eventId)?e.eventId:e.id,family:e.family,type:e.type,category:e.category,period:{start:e.period.start,end:e.period.end},context:e.context,meaning:e.meaning,at:e.at,value:e.value,reason:e.value==='negative'?e.reason:null,source:e.source,contract:1,validity:'verified_at_feedback'});
  }
  v.feedback=v.feedback.slice(0,limits.maxEntries).reverse();while(JSON.stringify(v).length*2>limits.maxBytes&&v.feedback.length)v.feedback.shift();return {ok:true,value:v};
 }
 const preserve=raw=>{const d=decode(raw);return d.ok?d.value:copy(raw);};
 function identity(d){const s=d.c.semantic;return hash([s.memoryKind||s.type,s.topic||null,s.basis]);}
 function adjustment(d,l){
  const state=decode(l.autonomy.refinement);if(!state.ok||!state.value.enabled)return {delta:0,reason:'ADAPTATION_DISABLED',samples:0};
  if(d.rank>=3)return {delta:0,reason:'PROTECTED_IMPORTANCE',samples:0};
  const v=state.value,list=v.feedback.filter(e=>e.family===identity(d)&&e.at>v.epoch),days=new Set(list.map(e=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(e.at)))),positive=list.filter(e=>e.value==='positive').length;
  if(list.length<limits.minSamples||days.size<limits.minDays)return {delta:0,reason:'INSUFFICIENT_FEEDBACK',samples:list.length};
  const ratio=positive/list.length,delta=ratio>=.8?limits.adjustment:ratio<=.2?-limits.adjustment:0;
  return {delta,reason:delta>0?'RECURRENT_USEFUL':delta<0?'RECURRENT_NOT_USEFUL':'MIXED_FEEDBACK',samples:list.length};
 }
 // A second key in the SAME fingerprint map recognizes equivalent analytical
 // representations. No text similarity, independent ledger or network request.
 function semantic(d){
  const s=d.c.semantic,kind=s.memoryKind,related=s.type==='confirmation_gap'||kind==='confirmation-gap'?'confirmation-gap':s.type==='goal_progress'||kind==='monthly-goal'?'monthly-goal':s.type;
  const open=d.c.selection?.period==='month'&&!s.comparisonPeriod;
  const period=open?s.period.start.slice(0,7):s.period;
  const conclusion=related==='confirmation-gap'&&s.type!=='memory_pattern_change'?'gap_supported':related==='monthly-goal'?s.metrics.remaining===0||kind==='monthly-goal'?'goal_reached':'goal_near':d.c.conclusion;
  return {family:hash(['refinement',related,s.basis,period,s.comparisonPeriod||null,s.topic||null,d.c.selection?.type||'all',s.observedDays>=2]),meaning:hash([conclusion,s.observedDays>=2,s.type==='memory_pattern_change',d.rank>=3?d.rank:2])};
 }
 function novel(d,l,legacy){const p=semantic(d),prior=l.autonomy.fingerprints[p.family];return prior?prior.meaning!==p.meaning:legacy;}
 function remember(l,items){
  const current=new Map();for(const d of items){const p=semantic(d);current.set(p.family,p.meaning);}
  // Absence from a bounded candidate list is not proof that a pattern ended.
  // Only an explicit, revalidated memory_pattern_change changes its meaning.
  for(const [family,meaning]of current)l.autonomy.fingerprints[family]={meaning,at:Date.now(),origin:'refinement'};
 }
 A.RefinementPolicy={decode,preserve,defaults,limits,reasons,categories,identity,adjustment,semantic,novel,remember};
})();
