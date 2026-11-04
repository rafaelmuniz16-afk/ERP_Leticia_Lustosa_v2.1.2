/* Selection over existing engine findings, never a second analytical engine. */
(() => {
 'use strict';const A=window.__auroraAutonomyParts,{hash}=A.U;
 function describe(c,r){const entry=r.contexts.find(e=>e.context.contextSignature===c.contextSignature&&e.context.findings.some(f=>f.id===c.findingId)),f=entry?.context.findings.find(f=>f.id===c.findingId);if(!c.analytical||!f||f.validity.state!=='valid'||!c.evidence.length||c.quality!=='sufficient')return null;
  const t=c.semantic.type,m=c.semantic.metrics,kind=c.semantic.memoryKind,goal=t==='goal_progress'?m.remaining===0?'reached':m.attainmentPercent>=80?'near':'below':null;
  const milestone=goal==='reached'||t==='historical_record'&&c.conclusion==='available_history_record_exceeded',ended=t==='memory_pattern_change'&&c.semantic.observedDays>=2,persistent=t.startsWith('memory_')&&t!=='memory_pattern_change'&&c.semantic.observedDays>=2;
  const rank=milestone?4:ended||f.relevance.classification==='priority'?3:persistent||f.relevance.classification==='relevant'?2:1;if(['period_summary','type_distribution'].includes(t)||c.conclusion==='stable'||goal==='below')return null;
  const category=f.category,topic=c.semantic.topic||kind||'',basis=c.semantic.basis,period=c.semantic.period;
  const windowKey=(c.selection.period==='month'&&period.start.endsWith('-01')&&!c.semantic.comparisonPeriod)||['confirmation-gap','monthly-goal'].includes(kind)?period.start.slice(0,7):period.start+':'+period.end;
  const family=hash([kind?'memory_'+kind:t,topic,basis,windowKey,c.semantic.comparisonPeriod]),meaning=hash([c.conclusion,goal,persistent,ended,f.relevance.classification]);
  const related=goal||kind==='monthly-goal'?'goal':t==='confirmation_gap'||kind==='confirmation-gap'?'gap':t==='historical_record'||kind==='daily-record'?'record':t,group=hash([related,basis,period,c.semantic.comparisonPeriod,related==='record'?c.semantic.topic||'registered':null]);
  return {c,family,meaning,id:'autonomy:'+hash([family,meaning]),category,rank,classification:['','low','moderate','high','milestone'][rank],technicalScore:f.relevance.score,group,related,f};
 }
 function collect(r){return r.claims.map(c=>describe(c,r)).filter(Boolean);}
 function select(items,l){const minimum=l.autonomy.preferences.minimumRelevance==='high'?3:2;const novel=items.filter(d=>{const prior=l.autonomy.fingerprints[d.family];const legacy=prior?.meaning!==d.meaning&&(!l.seen[d.id]||prior)&&!l.seen['integration:'+d.c.observationKey];return d.rank>=minimum&&(A.Refinement?A.Refinement.novel(d,l,legacy):legacy);});const scores=new Map(novel.map(d=>[d,(A.Refinement?.adjustment(d,l)?.delta||0)+d.technicalScore]));const compare=(a,b)=>b.rank-a.rank||scores.get(b)-scores.get(a)||a.c.id.localeCompare(b.c.id);const groups=new Map();for(const d of novel){if(!groups.has(d.group))groups.set(d.group,[]);groups.get(d.group).push(d);}const choices=[...groups.values()].map(members=>{members.sort(compare);return {lead:members[0],members};});choices.sort((a,b)=>compare(a.lead,b.lead));return choices[0]||null;}
 function validate(d,r){if(!window.AuroraIntegration?.isCurrent(r))return false;return window.AuroraAnalytics.validateConclusions({contextSignature:d.c.contextSignature,claims:[{findingId:d.c.findingId,conclusion:d.c.conclusion,values:d.c.evidence.map(e=>({id:e.id,value:e.value}))}]},d.c.selection).valid;}
 function legacyMatches(d,events){return events.some(e=>e.type==='personal-record'&&d.c.semantic.type==='historical_record'&&d.c.semantic.topic==='registered'&&d.c.semantic.period.start===d.c.semantic.period.end&&d.c.conclusion==='available_history_record_exceeded'||e.type==='monthly-goal'&&d.c.semantic.type==='goal_progress'&&d.c.semantic.metrics.remaining===0);}
 A.Relevance={collect,select,validate,legacyMatches};
})();
