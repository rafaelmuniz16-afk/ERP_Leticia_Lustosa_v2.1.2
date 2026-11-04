/* Shares the Autonomy lock and ledger. Evaluations never authorize ERP actions. */
(() => {
 'use strict';const A=window.__auroraAutonomyParts,{Store:S,Policy:P,U,Relevance:R}=A,F=A.RefinementPolicy;if(!F)return;
 let active=null,ui=null,resetTicket=null;const counters={feedbackSaved:0,duplicates:0,conflicts:0,stale:0,invalid:0,resets:0,adjusted:0,equivalentBlocked:0};
 const notify=()=>ui?.refresh();
 const state=()=>{const l=S.read();return {l,...F.decode(l.autonomy.refinement)};};
 function preferences(){const d=state();let style='objective';try{const p=window.AuroraMemory?.getPreferences?.()||window.AuroraMemory?.getContext({period:'events',audience:'observa'})?.preferences;style=p?.style==='explanatory'?'analytical':p?.style||style;}catch(_){}
  return U.freeze({style:['objective','balanced','analytical'].includes(style)?style:'objective',useFeedback:d.ok?d.value.enabled:false,available:d.ok&&S.getStatus()==='available'});
 }
 function valid(a=active){try{return !!(a&&Date.now()-a.at<F.limits.feedbackMs&&A.Context.current().signature===a.context&&R.validate(a.d,a.r));}catch(_){return false;}}
 function present(d,r,source='local'){active={id:'autonomy:'+U.hash([d.id,r.signature,Date.now()]),d,r,source,at:Date.now(),context:A.Context.current().signature};resetTicket=null;notify();}
 function invalidate(){active=null;notify();}
 function current(){const d=state();if(!d.ok||S.getStatus()!=='available'||!valid())return null;const entry=d.value.feedback.find(e=>e.id===active.id);return U.freeze({id:active.id,value:entry?.value||null,reason:entry?.reason||null,revision:U.hash(entry||null)});}
 async function feedback(input,event){
  const button=input?.value==='positive'?'auroraFeedbackUseful':'auroraFeedbackNotUseful';
  if(!input||Object.keys(input).some(k=>!['id','value','reason','revision'].includes(k))||!['positive','negative'].includes(input.value)||!(input.reason==null||F.reasons.includes(input.reason))||!(P.gesture(event,button)||P.gesture(event,'auroraFeedbackReason','change')&&input.value==='negative')){counters.invalid++;return {ok:false,reason:'INVALID_FEEDBACK_OR_GESTURE'};}
  const a=active;if(!valid(a)||a.id!==input.id){counters.stale++;return {ok:false,reason:'OBSERVATION_STALE'};}
  const result=await S.locked(l=>{
   const parsed=F.decode(l.autonomy.refinement);if(!parsed.ok)return {ok:false,reason:parsed.reason};
   if(a!==active||!valid(a)){counters.stale++;return {ok:false,reason:'OBSERVATION_STALE'};}
   const v=parsed.value,prior=v.feedback.find(e=>e.id===input.id),reason=input.value==='negative'?input.reason||null:null;
   if(prior?.value===input.value&&prior.reason===reason){counters.duplicates++;return {ok:true,duplicate:true};}
   if(U.hash(prior||null)!==input.revision){counters.conflicts++;return {ok:false,reason:'FEEDBACK_CONFLICT'};}
   // Revalidate even when the user reports an apparent error. Utility is not truth.
   const s=a.d.c.semantic,entry={id:a.id,eventId:a.d.id,family:F.identity(a.d),type:s.type,category:a.d.category,period:s.period,context:a.r.signature,meaning:a.d.meaning,at:Date.now(),value:input.value,reason,source:a.source,contract:1,validity:'verified_at_feedback'};
   v.feedback=v.feedback.filter(e=>e.id!==input.id);v.feedback.push(entry);v.revision++;l.autonomy.refinement=F.decode(v).value;
   const ok=S.write(l);if(ok)counters.feedbackSaved++;return {ok,reason:ok?reason==='apparently_incorrect'?'EVIDENCE_RECHECKED_REPORT_NOT_PROOF':'FEEDBACK_SAVED':'STORAGE_UNAVAILABLE'};
  },true);notify();return result;
 }
 async function setPreferences(input,event){
  const keys=input&&Object.keys(input);if(keys?.length!==1)return {ok:false,reason:'INVALID_PREFERENCE'};const key=keys[0],value=input[key];
  if(key==='style'?!['objective','balanced','analytical'].includes(value):key!=='useFeedback'||typeof value!=='boolean')return {ok:false,reason:'INVALID_PREFERENCE'};
  if(!P.gesture(event,key==='style'?'auroraStyle':'auroraUseFeedback','change'))return {ok:false,reason:'GESTURE_REQUIRED'};
  // Cancel a stale generation before waiting for its shared lock.
  if(key==='style')window.dispatchEvent?.(new CustomEvent('aurora:style-changed'));
  const result=await S.locked(l=>{const parsed=F.decode(l.autonomy.refinement);if(!parsed.ok)return {ok:false,reason:parsed.reason};
   if(key==='style'){try{window.AuroraMemory.setPreferences({style:value},{authorized:true});const p=window.AuroraMemory.getStatus().persistence;return {ok:p.state==='available',reason:p.state};}catch(_){return {ok:false,reason:'MEMORY_PREFERENCE_UNAVAILABLE'};}}
   parsed.value.enabled=value;parsed.value.revision++;l.autonomy.refinement=parsed.value;return {ok:S.write(l)};
  },true);notify();return result;
 }
 async function resetAdaptation(event){if(!P.gesture(event,'auroraResetAdaptation'))return {ok:false,reason:'GESTURE_REQUIRED'};
  const result=await S.locked(l=>{const d=F.decode(l.autonomy.refinement);if(!d.ok)return {ok:false,reason:d.reason};d.value.epoch=Date.now();d.value.revision++;l.autonomy.refinement=d.value;const ok=S.write(l);if(ok)counters.resets++;return {ok};},true);notify();return result;
 }
 function requestErase(event){if(!P.gesture(event,'auroraEraseFeedback'))return {ok:false,reason:'GESTURE_REQUIRED'};const d=state();if(!d.ok)return {ok:false,reason:d.reason};resetTicket={revision:d.value.revision,expires:Date.now()+60000};return {ok:true};}
 async function erase(event){if(!P.gesture(event,'auroraConfirmErase')||!resetTicket||Date.now()>resetTicket.expires)return {ok:false,reason:'CONFIRMATION_REQUIRED'};const ticket=resetTicket;resetTicket=null;
  const result=await S.locked(l=>{const d=F.decode(l.autonomy.refinement);if(!d.ok)return {ok:false,reason:d.reason};if(d.value.revision!==ticket.revision)return {ok:false,reason:'FEEDBACK_CHANGED_CONFIRM_AGAIN'};d.value.feedback=[];d.value.epoch=Date.now();d.value.revision++;l.autonomy.refinement=d.value;return {ok:S.write(l)};},true);notify();return result;
 }
 function getStatus(){const d=state(),entries=d.ok?d.value.feedback:[];return U.freeze({version:'5.0.0',storage:S.getStatus(),schema:d.ok?'available':d.reason,preferences:preferences(),...counters,positive:entries.filter(e=>e.value==='positive').length,negative:entries.filter(e=>e.value==='negative').length,categories:[...new Set(entries.map(e=>e.category))],retained:entries.length,limits:F.limits,officialDataWrites:0,networkCalls:0,polling:false});}
 A.Refinement={present,invalidate,source:source=>{if(active){active.source=source;notify();}},remember:F.remember,novel:(d,l,legacy)=>{const n=F.novel(d,l,legacy);if(legacy&&!n)counters.equivalentBlocked++;return n;},adjustment:(d,l)=>{const x=F.adjustment(d,l);if(x.delta)counters.adjusted++;return x;}};
 window.AuroraRefinement=U.freeze({current,feedback,getPreferences:preferences,setPreferences,resetAdaptation,requestErase,erase,cancelErase:()=>{resetTicket=null;},getStatus,getFeedback:()=>{const d=state();return U.freeze(d.ok?U.copy(d.value.feedback):[]);},bindUI:adapter=>{if(!ui){ui=adapter;notify();}}});
 window.addEventListener?.('storage',e=>{if(e.key===S.KEY||e.key==='aurora_memory_v1'||e.key===null){resetTicket=null;notify();}});
})();
