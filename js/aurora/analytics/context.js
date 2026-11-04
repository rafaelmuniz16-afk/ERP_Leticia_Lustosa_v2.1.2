(() => {
  'use strict';
  const A=window.__auroraAnalyticsParts,S=A.S;
  const forbiddenClaims=['causes_of_refusals','judicial_status_or_block','professional_quality_or_attendance','guaranteed_bonus_payment','unobserved_historical_goals','causation_from_association','expired_or_invalidated_episode_as_current_fact'];
  function build(data) {
    if(data.status!=='available')return {schemaVersion:1,status:data.status,reason:data.reason,contextSignature:null,facts:[],findings:[],allowedConclusions:[],forbiddenClaims};
    const limit=data.selection.audience==='observa'?5:30,findings=data.findings.slice(0,limit),ids=new Set(findings.flatMap(f=>f.evidence)),facts=data.evidence.filter(e=>ids.has(e.id));
    return {schemaVersion:1,status:'available',dataStatus:data.dataStatus,selection:data.selection,contextSignature:data.contextSignature,sourceSignature:data.sourceSignature,
      facts,findings,relationships:findings.filter(f=>/relation|stable_production/.test(f.type)),comparison:data.comparison,trends:data.trends,
      episodes:data.episodes.slice(0,limit),limitations:data.limitations,financial:data.financial,
      allowedConclusions:findings.map(f=>({findingId:f.id,conclusion:f.conclusion,evidence:f.evidence,period:f.period,basis:f.scope.basis,quality:f.quality,relevance:f.relevance})),forbiddenClaims,
      numericContract:{version:1,placeholder:'{{metric:ev1-ID}}',fields:['id','value','unit','period','basis'],roundingDecimals:[0,6]},
      capabilities:{readOnly:true,networkCalls:0,autoPresents:false,freeProseSemanticallyValidated:false}};
  }
  const keys=(o,allowed)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>allowed.includes(k));
  function validate(proposal,context) {
    const errors=[],fail=code=>{if(!errors.includes(code))errors.push(code)},used=new Set(),claimed=new Set();
    if(context.status!=='available')fail('CONTEXT_UNAVAILABLE');
    if(!keys(proposal,['contextSignature','claims','template']))fail('INVALID_PROPOSAL');
    if(!proposal||proposal.contextSignature!==context.contextSignature||!context.contextSignature)fail('STALE_CONTEXT');
    const facts=new Map((context.facts||[]).map(f=>[f.id,f])),findings=new Map((context.findings||[]).map(f=>[f.id,f]));
    if(!Array.isArray(proposal?.claims)||!proposal.claims.length||proposal.claims.length>30)fail('INVALID_CLAIMS');
    else for(const claim of proposal.claims) {
      if(!keys(claim,['findingId','conclusion','values'])){fail('INVALID_CLAIM');continue;}
      const finding=findings.get(claim.findingId);
      if(!finding||finding.conclusion!==claim.conclusion||finding.validity.state!=='valid'){fail('UNSUPPORTED_CONCLUSION');continue;}
      if(claimed.has(finding.id))fail('DUPLICATE_CLAIM');claimed.add(finding.id);
      if(!Array.isArray(claim.values)||claim.values.length!==finding.evidence.length){fail('INCOMPLETE_EVIDENCE');continue;}
      const seen=new Set();
      for(const item of claim.values){
        if(!keys(item,['id','value','decimals'])){fail('INVALID_VALUE');continue;}
        const f=facts.get(item.id),decimal=item.decimals;
        if(!f||!finding.evidence.includes(item.id)||seen.has(item.id)){fail('UNSUPPORTED_EVIDENCE');continue;}
        seen.add(item.id);used.add(item.id);
        if(decimal!==undefined&&(!Number.isInteger(decimal)||decimal<0||decimal>6)){fail('INVALID_ROUNDING');continue;}
        const expected=decimal===undefined?f.value:Number(f.value.toFixed(decimal));
        if(typeof item.value!=='number'||!Number.isFinite(item.value)||Math.abs(item.value-expected)>1e-9)fail('VALUE_MISMATCH');
      }
      if(finding.evidence.some(id=>!seen.has(id)))fail('INCOMPLETE_EVIDENCE');
    }
    let renderedText=null;
    if(proposal?.template!==undefined) {
      const t=proposal.template;
      if(typeof t!=='string'||t.length>4000)fail('INVALID_TEMPLATE');
      else {
        const rx=/\{\{metric:(ev1-[a-f0-9]{16})\}\}/g,plain=t.replace(rx,'');
        if(/[\p{N}<>]/u.test(plain)||/[{}]/.test(plain))fail('UNVERIFIED_TEMPLATE_LITERAL');
        renderedText=t.replace(rx,(_,id)=>{if(!used.has(id)||!facts.has(id)){fail('UNSUPPORTED_PLACEHOLDER');return '';}return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:6}).format(facts.get(id).value)});
      }
    }
    const valid=errors.length===0;
    return S.copy({valid,errors,contextSignature:context.contextSignature,renderedText:valid?renderedText:null,safeToPresent:valid&&proposal.template===undefined,languageStatus:proposal?.template!==undefined?'requires_consumer_semantic_review':'structured_codes_only',limitations:['numeric_validator_does_not_certify_free_prose_semantics','not_permission_for_autonomous_messages']});
  }
  A.Context={build,validate};
})();
