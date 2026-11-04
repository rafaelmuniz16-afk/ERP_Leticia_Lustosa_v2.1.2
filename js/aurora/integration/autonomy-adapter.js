/* Phase 4 read-only adapter. Reuses grounding and validation, not an engine copy.
 * The internal context (30 findings) avoids the old compact Observa top-five
 * truncation hiding a verified milestone behind several trend findings. */
(() => {
 'use strict';const I=window.__auroraIntegrationParts;if(!I?.Adapters)return;
 function autonomy(){const month={period:'month',audience:'internal'},day={period:'day',date:I.U.today(),audience:'internal'};
  const entries=[month,day].map(selection=>({selection,context:I.R.context(selection)})).filter(e=>e.context);
  const priority=f=>f.type==='goal_progress'&&f.metrics.remaining===0?120:f.type==='historical_record'&&f.conclusion==='available_history_record_exceeded'?110:f.type==='memory_pattern_change'?100:f.type.startsWith('memory_')&&f.continuity==='repeated'?90:f.relevance.classification==='priority'?80:f.relevance.classification==='relevant'?50:0;
  const ranked=entries.flatMap(entry=>entry.context.findings.filter(f=>!['period_summary','type_distribution'].includes(f.type)&&f.conclusion!=='stable'&&(f.type!=='goal_progress'||f.metrics.attainmentPercent>=80)&&(entry.selection.period!=='day'||f.type==='historical_record')).map(f=>({entry,f}))).sort((a,b)=>priority(b.f)-priority(a.f)||b.f.relevance.score-a.f.relevance.score);
  const contexts=ranked.map(({entry,f})=>({...entry,label:'',context:{...entry.context,findings:[f]},filter:null}));
  return I.R.request('observa',contexts,[],{period:'month',dailyRecords:I.U.today(),consumer:'autonomy-v4'},autonomy);
 }
 I.Adapters.autonomy=autonomy;
})();
