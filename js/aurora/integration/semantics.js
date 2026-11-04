/* Phase 3.1: declarative entailments. No narrative sentences and no new ERP calculations. */
(() => {
  'use strict';
  const I=window.__auroraIntegrationParts;
  const last=s=>s.split('.').at(-1);
  const directions={production_increased:['registered','growth'],production_decreased:['registered','decline'],refusals_increased:['refused','growth'],refusals_decreased:['refused','decline']};
  const trends={gradual_growth:'growth',gradual_decline:'decline',stable:'stable',abrupt_change:'abrupt',isolated_oscillation:'isolated'};
  const roles={registered:'registered',confirmed:'confirmed',refused:'refused',pending:'pending',unconfirmed:'unconfirmed',uncertain:'uncertain',review:'review',conflict:'conflict',previousRegistered:'previous_registered',previousConfirmed:'previous_confirmed',previousRefused:'previous_refused',gap:'gap',gapPercent:'gap_percent',previousGapPercent:'previous_gap_percent',target:'goal',officialGoal:'goal',officialConfirmed:'confirmed',remaining:'remaining',attainmentPercent:'goal_percent',currentValue:'record_current',previousValue:'record_previous',largestSharePercent:'largest_share',shareOfRefusalsPercent:'refusal_share',sharePoints:'type_shift',current:'registered',previous:'previous_registered',currentRefused:'refused',unconfirmedTypes:'unconfirmed'};
  function compile(c){
    const m=c.semantic?.metrics||{},type=c.semantic?.type||'',predicates=new Set(),add=(...x)=>x.forEach(p=>predicates.add(p));
    const registered=m.registered??(type==='work_selected'?m.total:undefined);
    if(Number.isFinite(registered)){add(registered===0?'sample.empty':'sample.present');if(registered<5)add('sample.small');if(m.confirmed<registered)add('gap.present');if(m.confirmed===registered&&registered>0)add('counts.all_confirmed');}
    if(type==='confirmation_gap')add('gap.present');
    if(directions[c.conclusion])add('change.'+directions[c.conclusion].join('.'));
    if(type==='refusal_change'&&m.ratePoints>0)add('share.refused.growth');
    if(type==='refusal_change'&&m.ratePoints<0)add('share.refused.decline');
    if(type.startsWith('trend_')&&trends[c.conclusion])add('trend.'+type.slice(6)+'.'+trends[c.conclusion]);
    if(type==='production_confirmation_relation')add('change.registered.growth','change.confirmed.stable','relation.production_confirmation');
    if(type==='stable_production_fewer_refusals')add('change.registered.stable','change.refused.decline');
    if(type==='confirmation_gap_change')add(c.conclusion==='confirmation_gap_reduced'?'gap.reduced':'gap.increased');
    if(type==='goal_progress'){
      add(m.remaining===0?'goal.reached':m.attainmentPercent>=80?'goal.near':'goal.below','definition.goal');
      // Being near a goal does not entail reaching it. Use the engine's remainder.
      if(m.remaining>0)add('goal.below');
    }
    if(type==='historical_record')add(c.conclusion==='available_history_record_exceeded'?'record.exceeded':'record.near','limit.loaded_history');
    if(type==='type_distribution')add('distribution.'+(c.conclusion==='type_distribution_concentrated'?'concentrated':c.conclusion==='type_distribution_balanced'?'balanced':'mixed'));
    if(type==='type_shift')add('distribution.changed');
    if(type==='refusal_concentration')add('distribution.refusals');
    if(type.startsWith('work_type_'))add('distribution.filtered');
    if(type==='work_equivalent')add('comparison.same_filters','operation.compare');
    if(type==='memory_pattern_change')add('memory.ended');
    else if(type.startsWith('memory_'))add(c.semantic.observedDays>1?'memory.repeated':'memory.revalidated');
    if(c.kind==='financial')add('financial.calculated','definition.financial','limit.payment','limit.financial_forecast');
    if(type==='work_selected')add('definition.statuses','operation.review');
    if(m.conflict>0)add('counts.overlap');
    if(c.semantic?.comparisonPeriod||type.startsWith('trend_'))add('operation.compare','limit.status_date');
    if(predicates.has('gap.present')||predicates.has('relation.production_confirmation')||type==='confirmation_gap_change')add('definition.stages','operation.separate','operation.confirmations');
    if(type.includes('refusal')||m.refused>0)add('operation.refusals');
    if(type==='goal_progress')add('operation.goal');
    if(c.kind==='memory')add('operation.revalidate','limit.continuity');
    if(c.kind==='distribution')add('operation.composition');
    if(c.kind==='record')add('operation.compare');
    if(type==='report_counts')add('definition.stages');
    add('limit.causes','limit.performance','limit.forecast','limit.status_date');
    if(predicates.has('sample.empty')||predicates.has('sample.small'))add('limit.sample');
    const numbers=c.evidence.map(e=>{
      const key=last(e.metric);let role=roles[key];
      if(key==='total')role=e.unit==='BRL'?'bonus':type==='work_selected'?'registered':null;
      if(key==='count')role=type==='type_shift'||type.startsWith('work_type_')?'type_count':null;
      if(key==='current')role=type==='work_equivalent'?'registered':type==='historical_record'?(['registered','confirmed','refused'].includes(c.semantic.topic)?c.semantic.topic:'type_count'):null;
      if(key==='previous')role=type==='work_equivalent'?'previous_registered':null;
      if(key==='changePercent')role=type==='refusal_change'?'refusal_change':'production_change';
      if(key==='productionChangePercent')role='production_change';
      if(key==='confirmationChangePercent')role='confirmation_change';
      if(e.unit==='BRL'&&['onus','acordo','exito','inativacao'].includes(key))role='bonus_'+key;
      return {id:e.id,token:'{{metric:'+e.id+'}}',role:role||null,value:e.value,unit:e.unit,period:e.period};
    }).filter(e=>e.role);
    return {claimId:c.id,conclusion:c.conclusion,kind:c.kind,scope:c.scope,
      scopeKey:I.U.hash([c.semantic?.basis,c.semantic?.period,c.scope,c.semantic?.topic,c.semantic?.memoryKind]),
      period:c.semantic?.period,previous:c.semantic?.comparisonPeriod||null,topic:c.semantic?.topic||null,limitations:c.semantic?.limitations||[],
      memoryKind:c.semantic?.memoryKind||null,predicates:[...predicates],numbers,
      periodToken:'{{period:'+c.id+'}}',previousToken:c.semantic?.comparisonPeriod?'{{previous:'+c.id+'}}':null};
  }
  I.Semantics={compile};
})();
