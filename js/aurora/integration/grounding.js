/* Evidence adapter and limited local fallback. Model-authored text is checked by Language/Semantics. */
(() => {
  'use strict';const I=window.__auroraIntegrationParts;
  const num=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
  const date=d=>d.split('-').reverse().join('/');
  const range=p=>p.start===p.end?date(p.start):date(p.start)+' a '+date(p.end);
  const types={onus:'Ônus',agreement:'Acordo',success:'Êxito',inactivation:'Inativação',other:'outros tipos',registered:'registros',confirmed:'confirmações',refused:'recusas'};
  function claim(id,conclusion,evidence,forms,implications,options={}){
    return {id,conclusion,evidence,forms,implications,...options};
  }
  // Analytics encodes non-type record discriminators in evidence.metric.
  // categoryType alone is null for registered/confirmed/refused; never guess the indicator.
  function topicOf(f,c){return f.scope.categoryType||(f.type==='historical_record'?c.facts.find(e=>f.evidence.includes(e.id))?.metric.match(/^historical_record:([^.]*)\./)?.[1]:f.type.startsWith('trend_')?f.type.slice(6):null)||null;}
  function fromFinding(f,c,selection,label=''){
    const topic=topicOf(f,c);
    // Do not repeat a type-specific result when it exactly equals the whole set.
    if(f.type.startsWith('trend_')&&!['trend_registered','trend_confirmed','trend_refused'].includes(f.type)){
      const total=c.findings.find(x=>x.type==='trend_registered');
      if(total&&total.conclusion===f.conclusion&&JSON.stringify(total.metrics)===JSON.stringify(f.metrics))return null;
    }
    if(f.type.startsWith('trend_')&&Object.values(f.metrics).every(v=>v===0))return null;
    if(f.type==='historical_record'&&topic!=='registered'){
      const total=c.findings.find(x=>x.type==='historical_record'&&topicOf(x,c)==='registered');
      if(total&&total.conclusion===f.conclusion&&JSON.stringify(total.metrics)===JSON.stringify(f.metrics))return null;
    }
    const facts=f.evidence.map(id=>c.facts.find(x=>x.id===id));if(facts.some(x=>!x))return null;
    const value=k=>{const e=facts.find(e=>e.metric.split('.').at(-1)===k);return e?'{{metric:'+e.id+'}}':null;};
    const v=k=>value(k)||'indisponível',m=f.metrics;let text='',detail='',imp=[],kind='context';
    const prior=f.comparisonPeriod?' em relação a '+range(f.comparisonPeriod):'';
    const scope=(label?label+' · ':'')+range(f.period);
    switch(f.type){
      case 'period_summary':
        text=m.registered?`O recorte reúne ${v('registered')} registros e ${v('confirmed')} confirmações válidas no Panjud.`:'O recorte não contém registros válidos na base carregada.';
        detail=m.registered?`Recusas (${v('refused')}), pendências sem recusa (${v('pending')}) e estados incertos (${v('uncertain')}) são situações distintas.`:'Isso não permite concluir que não houve trabalho ou atividade fora do ERP.';
        imp=[m.registered?'A data de encerramento define este recorte; o status consultado é o atual, inclusive nas datas passadas.':'Sem amostra, não há base para medir desempenho, comparar ritmo ou afirmar uma tendência.'];break;
      case 'confirmation_gap':kind='attention';text=`A diferença entre registros e confirmações é de ${v('gap')}, equivalente a ${v('gapPercent')}% do recorte.`;detail=`São ${v('registered')} registros para ${v('confirmed')} confirmações válidas. A diferença inclui recusas e estados incertos, além de pendências.`;imp=['Acompanhar separadamente as confirmações ajuda a entender quanto do volume registrado já atende ao critério Panjud; registrar e confirmar são etapas distintas.'];break;
      case 'production_change':kind='evolution';text=`A variação do volume registrado foi de ${v('changePercent')}%${prior}.`;detail=`As janelas reúnem ${v('registered')} e ${v('previousRegistered')} registros, respectivamente.`;imp=['A diferença descreve o volume disponível em períodos comparáveis; não mede presença, esforço ou qualidade profissional.'];break;
      case 'refusal_change':kind='attention';text=`A variação das recusas foi de ${v('changePercent')}%${prior}.`;detail=`O recorte atual tem ${v('refused')} recusas e o anterior, ${v('previousRefused')}.`;imp=['A mudança merece conferência dos registros recusados. Os agregados não informam os motivos e não justificam atribuir responsabilidade.'];break;
      case 'confirmation_gap_change':kind='evolution';text=`A distância proporcional entre registros e confirmações ${f.conclusion==='confirmation_gap_reduced'?'diminuiu':'aumentou'}${prior}.`;detail=`A parcela não confirmada passou de ${v('previousGapPercent')}% para ${v('gapPercent')}%.`;imp=['Isso compara os status atuais dos registros de cada janela; não comprova quando as confirmações ocorreram nem uma mudança de eficiência pessoal.'];break;
      case 'production_confirmation_relation':kind='attention';text='O volume registrado cresceu, enquanto as confirmações permaneceram próximas do período anterior.';detail=`A produção variou ${v('productionChangePercent')}% e as confirmações, ${v('confirmationChangePercent')}%${prior}.`;imp=['O avanço nos cadastros ainda não se traduz em crescimento proporcional das confirmações. Vale distinguir essas etapas ao interpretar o resultado do período.'];break;
      case 'stable_production_fewer_refusals':kind='evolution';text='O volume registrado ficou estável e houve menos recusas no recorte comparável.';detail=`Foram ${v('registered')} registros e ${v('refused')} recusas, frente a ${v('previousRegistered')} e ${v('previousRefused')}${prior}.`;imp=['A associação é verificável nos agregados, mas não identifica a causa da redução das recusas.'];break;
      case 'type_distribution':kind='distribution';text=`A distribuição por tipo está ${f.conclusion==='type_distribution_concentrated'?'concentrada em '+types[topic]:f.conclusion==='type_distribution_balanced'?'equilibrada entre os tipos conhecidos':'distribuída sem predominância pelo limiar analítico'}.`;detail=`A maior participação é de ${v('largestSharePercent')}%.`;imp=['Esse perfil ajuda a compreender a composição do volume, sem transformar quantidade em medida de complexidade ou qualidade dos casos.'];break;
      case 'type_shift':kind='distribution';text=`A participação de ${types[topic]} mudou ${v('sharePoints')} pontos percentuais${prior}.`;detail=`O tipo reúne ${v('count')} registros no recorte e ${v('previousCount')} no anterior.`;imp=['A mudança refere-se à composição dos registros, não a uma causa ou a uma previsão do próximo período.'];break;
      case 'refusal_concentration':kind='attention';text=`${types[topic]} concentra ${v('shareOfRefusalsPercent')}% das recusas do recorte.`;detail=`Dentro desse tipo há ${v('refused')} recusas em ${v('registered')} registros.`;imp=['A concentração indica um recorte útil para conferência. Ela não revela o motivo das recusas nem prova que o tipo cause problemas.'];break;
      case 'goal_progress':kind='goal';text=m.remaining===0?'O acumulado conservador alcança a meta mensal confirmada vigente.':m.attainmentPercent>=80?'O acumulado conservador está próximo da meta mensal confirmada vigente.':'O acumulado conservador ainda está abaixo da meta mensal confirmada vigente.';detail=`São ${v('confirmed')} confirmações válidas para uma meta de ${v('target')}; restam ${v('remaining')}.`;imp=['A base aqui é o ano e o mês de referência, incluindo todos os registros carregados dessa referência. Não é a contagem de encerramentos apenas do período do relatório.'];break;
      case 'historical_record':kind='record';text=f.conclusion==='available_history_record_exceeded'?`O recorte supera a melhor referência comparável disponível para ${types[topic]||'registros'}.`:`O recorte se aproxima da melhor referência comparável disponível para ${types[topic]||'registros'}.`;detail=`O valor comparável atual é ${v('currentValue')}; o anterior é ${v('previousValue')}${prior}.`;imp=['O recorde se limita ao histórico carregado. Hoje, quando incluído, ainda é parcial e não permite concluir perda de desempenho.'];break;
      case 'official_financial_snapshot':kind='financial';text=`A bonificação calculada pelas funções oficiais é de ${v('total')}.`;detail=`O cálculo usa ${v('officialConfirmed')} confirmações e meta ${v('officialGoal')} na base oficial por mês de referência, abrangendo os anos carregados.`;imp=['Este é um valor calculado pelas regras vigentes. Não confirma recebimento, não garante pagamento e não é uma projeção de renda.'];break;
      case 'memory_pattern_change':kind='memory';text='Um padrão anteriormente observado deixou de obter suporte na revalidação atual.';detail=`O recorte reavaliado tem ${v('registered')} registros, ${v('confirmed')} confirmações e ${v('refused')} recusas.`;imp=['Isso indica mudança no suporte disponível, sem provar a causa, o momento exato da mudança ou que o fato passado nunca existiu.'];break;
      default:
        if(f.type.startsWith('trend_')){
          kind='evolution';const metric=types[f.type.slice(6)]||'registros';
          const labels={stable:'estabilidade',gradual_growth:'crescimento gradual',gradual_decline:'redução gradual',abrupt_change:'mudança abrupta',isolated_oscillation:'oscilação isolada'};
          if(!labels[f.conclusion])return null;
          text=`As janelas fechadas disponíveis mostram ${labels[f.conclusion]} em ${metric}.`;
          detail='A classificação utiliza a sequência de períodos comparáveis e exclui o dia ainda em andamento.';
          imp=['Trata-se de uma descrição do histórico carregado, sem previsão do resultado futuro ou explicação causal.'];
        }else if(f.type.startsWith('memory_')){
          const e=c.episodes.find(e=>f.relatedEpisodes.includes(e.id));if(!e?.revalidated||!e.proof)return null;
          const equivalent={'monthly-goal':'goal_progress','daily-record':'historical_record'}[e.kind];
          if(e.observedDays<=1&&equivalent&&c.findings.some(x=>x.type===equivalent))return null;
          kind='memory';const labels={'confirmation-gap':'diferença entre registros e confirmações','recurring-refusals':'recusas em janelas consecutivas','production-above':'produção acima da referência','production-below':'produção abaixo da referência','type-shift':'mudança na composição por tipo','daily-record':'recorde diário','monthly-goal':'meta mensal alcançada','weekday-streak':'sequência de dias úteis com registros'};
          text=e.observedDays>1?`O padrão de ${labels[e.kind]||'atividade registrada'} continua sustentado por observações em dias distintos e pelos dados atuais.`:`A memória revalidou o padrão de ${labels[e.kind]||'atividade registrada'} neste recorte.`;
          detail=e.observedDays>1?'O padrão possui observações em dias distintos e voltou a ser sustentado pelos dados atuais.':'A lembrança foi conferida contra os dados atuais antes de entrar nesta análise.';
          imp=['A continuidade se refere ao período e à regra identificados; não significa monitoramento contínuo com o ERP fechado.'];
        }else return null;
    }
    if(f.limitations.includes('change_normalized_per_calendar_day'))detail+=' A variação percentual compara taxas por dia civil, pois os meses têm durações diferentes.';
    if(f.type==='historical_record'&&facts.some(e=>e.unit==='per_calendar_day'))detail+=' Esses valores representam registros por dia civil.';
    if(f.scope.basis==='record_year_and_reference_month'&&kind==='memory')detail+=' A base é o ano e o mês de referência, e não somente as datas do recorte.';
    const forms=[{lead:text,detail},{lead:detail,detail:text}];
    const observationKey=I.U.hash([f.conclusion,scope,f.continuity,facts.map(e=>[e.metric,e.value,e.period,e.basis])]);
    const episode=c.episodes.find(e=>f.relatedEpisodes.includes(e.id));
    const semantic={type:f.type,period:f.period,comparisonPeriod:f.comparisonPeriod,basis:f.scope.basis,topic,metrics:f.metrics,limitations:f.limitations,observedDays:episode?.observedDays||0,memoryKind:episode?.kind||null};
    return claim(f.id,f.conclusion,facts,forms,imp,{kind,scope,semantic,observationKey,analytical:true,selection,contextSignature:c.contextSignature,sourceSignature:c.sourceSignature,findingId:f.id,dedup:f.type+':'+(topic||'')+':'+range(f.period),relevance:f.relevance.score,continuity:f.continuity,partial:f.scope.partial,quality:f.quality.status});
  }
  function renderText(t,c){return t.replace(/\{\{metric:([^}]+)\}\}/g,(_,id)=>{const e=c.evidence.find(e=>e.id===id);if(!e)throw Error('INVALID_PLACEHOLDER');return e.unit==='BRL'?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(e.value):num(e.value);});}
  I.G={claim,fromFinding,renderText,range,num};
})();
