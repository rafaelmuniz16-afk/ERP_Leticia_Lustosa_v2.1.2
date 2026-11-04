(() => {
  'use strict';const I=window.__auroraIntegrationParts,{hash,today,shift}=I.U,{context,selection,request}=I.R;
  const numeric=(prefix,values,period,basis)=>Object.entries(values).filter(([,v])=>Number.isFinite(v)).map(([metric,value])=>({id:'if3-'+hash([prefix,metric,value,period,basis]),metric,value,period,basis,unit:'count'}));
  function localClaim(prefix,values,period,basis,build,options={}){
    const evidence=numeric(prefix,values,period,basis),v=k=>'{{metric:'+evidence.find(e=>e.metric===k).id+'}}',parts=build(v);
    return I.G.claim('ic3-'+hash([prefix,evidence]),prefix,evidence,[{lead:parts[0],detail:parts[1]},{lead:parts[1],detail:parts[0]}],[parts[2]],{kind:options.kind||'context',scope:options.scope||I.G.range(period),semantic:{type:prefix,period,basis,metrics:values},analytical:false,...options});
  }
  function reports(m){
    const s=selection(m.period,'reports'),c=context(s),extra=[],contexts=[];
    const matching=c && ['registered','confirmed','refused','pending'].every(k=>c.findings.find(f=>f.type==='period_summary')?.metrics[k]===m.production[k]);
    if(c)contexts.push({context:c,selection:s,label:matching?'Análise conservadora':'Histórico conservador · base distinta do resumo',filter:f=>m.production.registered>=5&&(matching||f.type.startsWith('memory_'))});
    extra.push(localClaim('report_counts',m.production,m.period,'official_report_closure_date',v=>[
      m.production.registered?`O período selecionado reúne ${v('registered')} cadastros e ${v('confirmed')} confirmações no resumo oficial.`:'Não há registros no período selecionado.',
      m.production.registered?`Recusas (${v('refused')}) e registros sem confirmação e sem recusa (${v('pending')}) são apresentados separadamente.`:'A ausência de registros não demonstra ausência de trabalho.',
      m.production.registered<5?'A amostra deste recorte é insuficiente para uma análise comparativa mais profunda.':matching?'Os números do resumo e da projeção conservadora coincidem neste recorte. As comparações abaixo identificam seus próprios períodos.':'Os critérios do resumo e da projeção conservadora podem diferir em status inválidos e duplicatas. Os números oficiais foram preservados; conclusões incompatíveis foram omitidas.'
    ],{dedup:'period_summary:'+I.G.range(m.period),kind:'context'}));
    // Report money is based on its own official calculation, not the Radar's cross-year base.
    if(m.includeFinance)for(const month of m.months.filter(x=>x.finance).slice(0,3)){
      const p={start:month.key+'-01',end:month.until};const cl=localClaim('report_finance_'+month.key,{total:month.finance.calculated},p,'official_report_year_reference_until',v=>[
        `A bonificação calculada no acompanhamento de ${month.key.split('-').reverse().join('/')} é ${v('total')}.`,
        'O valor segue as funções oficiais do resumo, separado por ano e mês de referência até a posição indicada.',
        'É um cálculo pelas regras vigentes, sem confirmação de recebimento, garantia de pagamento ou reconstrução de regras históricas.'
      ],{kind:'financial'});cl.evidence.forEach(e=>e.unit='BRL');extra.push(cl);
    }
    const rebuild=()=>{const erp=window.obterContextoERP?.();return reports(erp?window.ERPWhatsAppMetrics.build(erp.bd,erp.metas,erp.getTodayLocal(),{period:'custom',...m.period,finance:m.includeFinance}):m);};
    return request('reports',contexts,extra,{period:m.period,financial:m.includeFinance,matching,partial:m.period.end===m.today},rebuild);
  }
  function work(base,filters,result){
    const W=window.ERPWork,F=window.ERPExport.Filters,D=window.ERPExport.Data,allDates=base.rows.filter(r=>r.date&&r.date.iso<=base.today).map(r=>r.date.iso).sort();
    const limits=F.range(filters,base.today),p=limits?{start:D.fromOrdinal(limits[0]),end:D.fromOrdinal(limits[1])}:{start:allDates[0]||base.today,end:base.today};
    if(p.end>base.today)p.end=base.today;
    const s=selection(p,'work-center'),c=context(s),extra=[],contexts=[];
    const active=Object.keys(filters).filter(k=>!['period','start','end','sort','direction','sort2','direction2','ignoreAccents','statusMode'].includes(k)&&JSON.stringify(filters[k])!==JSON.stringify(W.defaults()[k]));
    const scope='Seleção atual · filtros aplicados: '+(active.length?active.map(k=>({panjud:'confirmação',recusado:'recusa',types:'tipo',obsGroups:'observações',idOp:'busca por ID',idValue:'busca por ID',cnjOp:'busca por CNJ',cnjValue:'busca por CNJ'}[k]||'filtro adicional')).filter((v,i,a)=>a.indexOf(v)===i).join(', '):'somente período');
    const m=result.metrics;
    extra.push(localClaim('work_selected',{total:m.total,confirmed:m.confirmed,unconfirmed:m.unconfirmed,refused:m.refused,review:m.review,conflict:m.conflict},p,'work_literal_filtered',v=>[
      `A seleção reúne ${v('total')} registros: ${v('confirmed')} com Panjud Sim, ${v('unconfirmed')} com Panjud Não e ${v('refused')} com recusa Sim.`,
      m.conflict?`Há ${v('conflict')} registros com ambos os status Sim; esses indicadores podem se sobrepor.`:`Há ${v('review')} registros sinalizados para conferência pelas regras existentes.`,
      'A interpretação respeita os filtros aplicados. Não confirmação e recusa são status cadastrais; não comprovam pendência jurídica nem informam causas.'
    ],{scope,kind:'context'}));
    for(const [type,count] of Object.entries(m.types).filter(([,n])=>n>0).slice(0,4))extra.push(localClaim('work_type_'+type,{count,unconfirmed:m.unconfirmedTypes[type]},p,'work_literal_filtered',v=>[
      `${type} reúne ${v('count')} registros na seleção.`,`${v('unconfirmed')} desses registros têm Panjud Não.`,
      'A composição por tipo descreve este conjunto filtrado e pode orientar a conferência; não mede complexidade ou qualidade profissional.'
    ],{scope,kind:'distribution',semantic:{type:'work_type_'+type,period:p,basis:'work_literal_filtered',topic:type,metrics:{count,unconfirmed:m.unconfirmedTypes[type]}}}));
    // Use the existing query for equivalent historical filters, without a second analytics store.
    const comparable=c?.comparison;
    const dateFixed=['dateOp','dateA','dateB','day','years','reference','dashboard'];
    if(comparable?.status==='comparable'&&!active.some(k=>dateFixed.includes(k))){
      const previous=W.query(base,{...filters,period:'custom',...comparable.previous}).metrics;
      const current=W.query(base,{...filters,period:'custom',...comparable.current}).metrics;
      if(current.total>=5&&previous.total>=5)extra.push(localClaim('work_equivalent',{current:current.total,previous:previous.total,currentRefused:current.refused,previousRefused:previous.refused},comparable.current,'work_literal_same_filters',v=>[
        `Com os mesmos filtros, a janela de ${I.G.range(comparable.current)} reúne ${v('current')} registros, contra ${v('previous')} em ${I.G.range(comparable.previous)}.`,
        `As recusas nesses recortes são ${v('currentRefused')} e ${v('previousRefused')}, respectivamente.`,
        'São janelas fechadas de comparação, com os status atuais dos registros. Isso não reconstrói o momento das confirmações ou recusas.'
      ],{scope:'Histórico com os mesmos filtros · '+scope,kind:'evolution',semantic:{type:'work_equivalent',period:comparable.current,comparisonPeriod:comparable.previous,basis:'work_literal_same_filters',metrics:{current:current.total,previous:previous.total,currentRefused:current.refused,previousRefused:previous.refused}}}));
    }
    if(c)contexts.push({context:c,selection:s,label:'Contexto GLOBAL conservador · sem os filtros da Central',filter:f=>['memory_pattern_change','confirmation_gap','production_change','refusal_change'].includes(f.type)||f.type.startsWith('memory_')});
    const rebuild=()=>{const erp=window.obterContextoERP?.();if(!erp)return work(base,filters,W.query(base,filters));const b=W.snapshot(erp.bd,erp.getTodayLocal(),window.ERPProcessCNJ?.isValid);return work(b,filters,W.query(b,filters));};
    return request('work-center',contexts,extra,{period:p,filterSignature:hash(filters),scope,partial:p.end===base.today},rebuild);
  }
  function finance(authorized=false){
    if(authorized!==true)return request('financial',[],[],{authorized:false},()=>finance(false));
    const s={period:'month',audience:'financial',includeFinancial:true,financialAuthorized:true},c=context(s);
    const contexts=c?[{context:c,selection:s,label:'Radar · mês atual · regras oficiais',filter:f=>f.type==='official_financial_snapshot'}]:[];
    return request('financial',contexts,[],{authorized:true,month:today().slice(0,7)},()=>finance(true));
  }
  function live(){
    const s={period:'month',audience:'observa'},d={period:'day',date:today(),audience:'observa'},c=context(s),daily=context(d);
    const priority=f=>f.type==='memory_pattern_change'?60:f.type.startsWith('memory_')&&f.continuity==='repeated'?50:f.type==='goal_progress'&&f.metrics.attainmentPercent>=100?45:f.type==='historical_record'?40:f.type==='confirmation_gap_change'?35:f.type==='goal_progress'?30:f.category==='panjud'?20:10;
    const useful=f=>!['period_summary','type_distribution'].includes(f.type)&&f.conclusion!=='stable'&&(f.type!=='goal_progress'||f.metrics.attainmentPercent>=80)&&(f.relevance.classification!=='informative'||f.type==='memory_pattern_change'&&f.metrics.observedDays>1);
    const entries=[...(c?[{context:c,selection:s,label:'',filter:useful}]:[]),...(daily?[{context:daily,selection:d,label:'',filter:f=>f.type==='historical_record'}]:[])];
    // Keep each finding bound to its original context while prioritizing the event.
    const ranked=entries.flatMap(entry=>entry.context.findings.filter(entry.filter).map(f=>({entry,f}))).sort((a,b)=>priority(b.f)-priority(a.f)||b.f.relevance.score-a.f.relevance.score);
    const contexts=ranked.map(({entry,f})=>({...entry,context:{...entry.context,findings:[f]},filter:null}));
    return request('observa',contexts,[],{period:'month',dailyRecords:today()},live);
  }
  I.Adapters={reports,work,finance,live};
})();
