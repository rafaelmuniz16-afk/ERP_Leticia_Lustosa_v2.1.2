/* A closed semantic grammar over model-authored prose, not a phrase selector.
 * Every clause must parse completely and be entailed by a declared finding.
 * Unrecognized language is rejected; an evidence ID alone never approves text.
 */
(() => {
  'use strict';
  const I=window.__auroraIntegrationParts;
  const norm=s=>s.normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const subjects={registered:'(?:os registros(?: cadastrados)?|os cadastros|a producao(?: registrada)?|o volume(?: de registros| registrado)?)',confirmed:'(?:as confirmacoes(?: validas)?(?: no panjud)?)',refused:'(?:as recusas(?: no panjud)?)',onus:'(?:onus|os registros de onus)',agreement:'(?:acordos|os acordos)',success:'(?:exitos|os exitos)',inactivation:'(?:inativacoes|as inativacoes|registros de inativacao)',other:'(?:outros tipos|os demais tipos)'};
  const verbs={growth:'(?:cresceu|cresceram|aumentou|aumentaram|avancou|avancaram|mostra(?:m)? crescimento|apresenta(?:m)? crescimento|esta(?:o)? em crescimento)',decline:'(?:diminuiu|diminuiram|recuou|recuaram|caiu|cairam|mostra(?:m)? reducao|apresenta(?:m)? queda)',stable:'(?:(?:permaneceu|permaneceram|ficou|ficaram|esta|estao) estave(?:l|is)|mostra(?:m)? estabilidade)',abrupt:'(?:mostra(?:m)? uma mudanca abrupta|apresenta(?:m)? mudanca abrupta)',isolated:'(?:mostra(?:m)? uma oscilacao isolada|apresenta(?:m)? oscilacao isolada)'};
  const nounRoles={registered:'registros(?: cadastrados)?|cadastros|encerramentos cadastrados',confirmed:'confirmacoes(?: validas)?(?: no panjud)?',refused:'recusas(?: no panjud)?',pending:'registros sem confirmacao e sem recusa|pendencias sem recusa',unconfirmed:'registros com panjud nao|registros nao confirmados',uncertain:'registros com status incerto|estados incertos',review:'registros para conferencia',conflict:'registros com ambos os status sim',previous_registered:'registros anteriores',previous_confirmed:'confirmacoes anteriores',previous_refused:'recusas anteriores',gap:'registros de diferenca',remaining:'confirmacoes restantes',goal:'confirmacoes como meta',type_count:'registros deste tipo'};
  const scalarRoles={registered:'(?:o total|o numero) de registros',confirmed:'(?:o total|o numero) de confirmacoes',refused:'(?:o total|o numero) de recusas',goal:'a meta(?: mensal)?(?: vigente)?',remaining:'o restante para a meta',gap:'a diferenca entre registros e confirmacoes',gap_percent:'a parcela sem confirmacao|a proporcao nao confirmada',previous_gap_percent:'a parcela anterior sem confirmacao',goal_percent:'o progresso da meta|o percentual de atingimento',production_change:'a variacao da producao|a variacao dos registros',refusal_change:'a variacao das recusas',confirmation_change:'a variacao das confirmacoes',record_current:'o valor comparavel atual',record_previous:'o valor comparavel anterior',largest_share:'a maior participacao',refusal_share:'a participacao deste tipo nas recusas',type_shift:'a mudanca de participacao deste tipo',bonus:'a bonificacao calculada|o valor calculado da bonificacao',bonus_onus:'a bonificacao de onus',bonus_acordo:'a bonificacao de acordos',bonus_exito:'a bonificacao de exitos',bonus_inativacao:'a bonificacao de inativacoes'};
  // These are semantic recognizers, never used to generate a user-facing sentence.
  const rules=[
    ['gap.present','fact','(?:os registros(?: cadastrados)? (?:superam|excedem) as confirmacoes(?: no panjud)?|as confirmacoes(?: no panjud)? (?:ficam|estao) abaixo (?:dos registros|do volume registrado)|(?:ha|existe) uma diferenca entre (?:registros|cadastros) e confirmacoes)'],
    ['gap.reduced','fact','(?:a (?:(?:diferenca|distancia) proporcional|parcela nao confirmada)(?: entre registros e confirmacoes)? (?:diminuiu|recuou|foi reduzida)|a proporcao de confirmacoes aumentou)'],
    ['gap.increased','fact','(?:a (?:(?:diferenca|distancia) proporcional|parcela nao confirmada)(?: entre registros e confirmacoes)? (?:aumentou|cresceu)|a proporcao de confirmacoes diminuiu)'],
    ['relation.production_confirmation','fact','(?:as confirmacoes(?: no panjud)? (?:ainda )?nao acompanham proporcionalmente (?:a producao|o crescimento dos registros)|o crescimento dos registros nao se traduziu em crescimento proporcional das confirmacoes)'],
    ['share.refused.growth','fact','a (?:participacao|proporcao) das recusas (?:aumentou|cresceu)'],
    ['share.refused.decline','fact','a (?:participacao|proporcao) das recusas (?:diminuiu|recuou)'],
    ['sample.empty','fact','(?:nao ha registros(?: validos)?|o recorte (?:esta vazio|nao contem registros))'],
    ['sample.present','fact','(?:ha registros(?: disponiveis)?|o recorte contem registros)'],
    ['sample.small','fact','a amostra (?:e pequena|e limitada|tem poucos registros)'],
    ['counts.all_confirmed','fact','(?:todos os registros(?: do recorte)? estao confirmados|as confirmacoes correspondem ao total de registros)'],
    ['counts.overlap','fact','(?:os indicadores de confirmacao e recusa (?:se sobrepoem|podem se sobrepor)|ha registros com ambos os status sim)'],
    ['goal.reached','fact','(?:(?:a meta(?: mensal)?(?: vigente)?) (?:foi atingida|foi alcancada|esta atingida)|o acumulado(?: conservador)? (?:atingiu|alcancou) a meta(?: mensal)?(?: vigente)?)'],
    ['goal.near','fact','(?:o acumulado(?: conservador)? (?:esta proximo|se aproxima) da meta(?: mensal)?(?: vigente)?|a meta(?: mensal)?(?: vigente)? esta proxima de ser atingida)'],
    ['goal.below','fact','(?:o acumulado(?: conservador)? (?:ainda )?esta abaixo da meta(?: mensal)?(?: vigente)?|a meta(?: mensal)?(?: vigente)? ainda nao foi atingida)'],
    ['record.exceeded','fact','(?:o recorte (?:supera|ultrapassa) a melhor referencia(?: comparavel)?(?: disponivel)?|ha um recorde no historico carregado)'],
    ['record.near','fact','o recorte (?:esta proximo|se aproxima) da melhor referencia(?: comparavel)?(?: disponivel)?'],
    ['distribution.concentrated','fact','a distribuicao por tipo (?:esta|e) concentrada'],
    ['distribution.balanced','fact','a distribuicao por tipo (?:esta|e) equilibrada'],
    ['distribution.mixed','fact','(?:a distribuicao por tipo nao apresenta predominancia|nao ha predominancia de um tipo)'],
    ['distribution.changed','fact','a participacao deste tipo (?:mudou|apresenta mudanca)'],
    ['distribution.refusals','fact','(?:as recusas estao concentradas neste tipo|este tipo concentra as recusas)'],
    ['distribution.filtered','fact','(?:a composicao por tipo descreve a selecao atual|este tipo faz parte da selecao filtrada)'],
    ['comparison.same_filters','fact','(?:as janelas foram comparadas com os mesmos filtros|a comparacao preserva os mesmos filtros)'],
    ['memory.repeated','fact','(?:o padrao(?: observado)? (?:continua|permanece) sustentado pelos dados atuais|a continuidade do padrao foi revalidada|o padrao foi observado em dias distintos e continua sustentado)'],
    ['memory.revalidated','fact','(?:o padrao(?: observado)? foi revalidado nos dados atuais|a memoria revalidou o padrao)'],
    ['memory.ended','fact','(?:o padrao(?: anterior| observado)? (?:perdeu suporte|deixou de ter suporte) na revalidacao atual|os dados atuais nao sustentam mais o padrao anterior)'],
    ['financial.calculated','fact','a bonificacao (?:foi|e) calculada pelas regras vigentes'],
    ['definition.stages','definition','(?:registrar e confirmar (?:sao|representam) etapas distintas|cadastros e confirmacoes (?:sao|representam) indicadores diferentes)'],
    ['definition.goal','definition','(?:a meta(?: mensal)?(?: vigente)? (?:considera|acompanha|depende das) confirmacoes(?: validas)?(?: no panjud)?|a base da meta e o ano e o mes de referencia)'],
    ['definition.financial','definition','(?:o valor segue as regras vigentes|a base financeira segue o mes de referencia)'],
    ['definition.statuses','definition','(?:confirmacao e recusa sao status cadastrais|os filtros delimitam a selecao analisada)'],
    ['operation.separate','operation','(?:(?:vale|convem|e util) (?:separar|distinguir) (?:os )?registros (?:das|e as) confirmacoes(?: para interpretar o resultado)?|essa diferenca (?:e relevante|merece atencao) para interpretar o progresso(?: atual)?)'],
    ['operation.confirmations','operation','(?:(?:vale|convem|e util) (?:acompanhar|conferir) (?:as )?confirmacoes(?: separadamente)?|acompanhar as confirmacoes ajuda a distinguir cadastro de confirmacao)'],
    ['operation.refusals','operation','(?:(?:vale|convem|e util) (?:conferir|revisar|acompanhar) (?:os registros recusados|as recusas)(?: deste recorte)?|a concentracao indica um recorte util para conferencia)'],
    ['operation.compare','operation','(?:(?:vale|convem|e util) comparar (?:as janelas|os periodos) (?:com os mesmos criterios|equivalentes)|a comparacao ajuda a interpretar a evolucao do recorte)'],
    ['operation.goal','operation','(?:(?:vale|convem|e util) acompanhar (?:o acumulado de confirmacoes|o progresso da meta)(?: separadamente)?|separar a base da meta da producao ajuda a interpretar o progresso)'],
    ['operation.revalidate','operation','(?:(?:vale|convem|e util) revalidar o padrao nos proximos registros|a revalidacao distingue memoria de evidencia atual)'],
    ['operation.composition','operation','(?:(?:vale|convem|e util) observar a composicao (?:por tipo|da selecao)|a composicao ajuda a interpretar o conjunto filtrado)'],
    ['operation.review','operation','(?:(?:vale|convem|e util) conferir os registros da selecao|a leitura deve respeitar os filtros aplicados)'],
    ['limit.sample','limitation','(?:a amostra (?:nao permite|e insuficiente para) (?:comparar periodos|afirmar uma tendencia|uma analise mais profunda)|a ausencia de registros nao demonstra ausencia de trabalho)'],
    ['limit.causes','limitation','(?:(?:os dados(?: disponiveis)?|os registros(?: disponiveis)?|os agregados) nao (?:informam|demonstram|comprovam|explicam|permitem determinar) (?:as causas|a causa da diferenca|os motivos das recusas)|nao e possivel determinar (?:as causas|a causa da diferenca|os motivos das recusas) (?:com|pelos) (?:estes dados|os dados disponiveis))'],
    ['limit.performance','limitation','(?:esses numeros nao medem (?:esforco|qualidade profissional|complexidade dos casos)|o volume registrado nao mede qualidade profissional)'],
    ['limit.forecast','limitation','(?:os dados nao permitem prever o resultado futuro|isso nao e uma previsao)'],
    ['limit.status_date','limitation','(?:(?:os status consultados|os status dos registros) sao os atuais|os dados nao informam quando (?:as confirmacoes|as recusas) ocorreram)'],
    ['limit.loaded_history','limitation','(?:o recorde se limita ao historico carregado|a referencia se limita aos dados disponiveis)'],
    ['limit.financial_forecast','limitation','(?:os dados nao permitem prever a renda futura|isso nao e uma projecao de renda)'],
    ['limit.payment','limitation','(?:(?:o calculo|o valor calculado|a bonificacao calculada) nao (?:confirma recebimento|garante pagamento|comprova pagamento)|nao ha confirmacao de recebimento no contexto financeiro)'],
    ['limit.continuity','limitation','(?:a continuidade nao significa monitoramento continuo|a memoria so e utilizada apos revalidacao|a mudanca de suporte nao revela o momento exato da mudanca)']
  ].map(([predicate,category,pattern])=>({predicate,category,pattern,regex:new RegExp('^(?:'+pattern+')$')}));
  const equivalents=[
    ['gap.present','fact','(?:(?:o numero|o total|o volume) de (?:registros|cadastros|encerramentos cadastrados) (?:supera|excede) (?:o numero|o total|o volume) de confirmacoes(?: no panjud)?|(?:ha|existe) uma diferenca entre (?:os )?(?:registros|cadastros|encerramentos cadastrados) e (?:as )?confirmacoes(?: no panjud)?|(?:os registros|os cadastros|os encerramentos cadastrados) (?:sao mais numerosos|estao em maior numero) que as confirmacoes(?: no panjud)?)'],
    ['definition.stages','definition','(?:(?:o cadastro|o registro) e a confirmacao (?:sao|representam) (?:etapas|indicadores) (?:distintos|distintas|diferentes)|(?:registros|encerramentos cadastrados) e confirmacoes(?: no panjud)? (?:sao|representam) (?:etapas|indicadores|metricas) (?:distintos|distintas|diferentes)|(?:cadastrar|registrar) (?:um encerramento|um registro|um processo) nao (?:equivale a|significa) (?:confirma-lo|sua confirmacao)(?: no panjud)?|o volume cadastrado nao equivale ao volume confirmado)'],
    ['definition.goal','definition','(?:a meta(?: mensal)?(?: vigente)? (?:considera|acompanha|depende de|depende das|e baseada nas|e medida pelas) (?:as )?confirmacoes(?: validas)?(?: no panjud)?)'],
    ['goal.below','fact','(?:a meta(?: mensal)?(?: vigente)? nao foi (?:atingida|alcancada)|o acumulado de confirmacoes(?: validas)? (?:ainda )?esta abaixo da meta(?: mensal)?(?: vigente)?)'],
    ['goal.near','fact','(?:a meta(?: mensal)?(?: vigente)? esta perto de ser (?:atingida|alcancada)|o acumulado de confirmacoes(?: validas)? se aproxima da meta(?: mensal)?(?: vigente)?)'],
    ['goal.reached','fact','(?:a meta(?: mensal)?(?: vigente)? (?:ja )?foi (?:atingida|alcancada)|o acumulado de confirmacoes(?: validas)? (?:atingiu|alcancou) a meta(?: mensal)?(?: vigente)?)'],
    ['operation.confirmations','operation','(?:(?:vale|convem|e util) acompanhar (?:a diferenca entre registros e confirmacoes|o volume de confirmacoes(?: no panjud)?)|essa diferenca merece acompanhamento|acompanhar separadamente registros e confirmacoes ajuda a interpretar o resultado)'],
    ['operation.refusals','operation','(?:(?:vale|convem|e util) revisar (?:a distribuicao das recusas|os registros com recusa)|essa concentracao merece conferencia)'],
    ['limit.causes','limitation','(?:(?:os dados|os registros)(?: disponiveis)? nao permitem (?:identificar|afirmar|concluir) (?:as causas|os motivos das recusas|a causa da diferenca)|nao ha (?:dados|informacoes) (?:suficientes )?para (?:determinar|afirmar) (?:as causas|os motivos das recusas))']
  ];
  for(const[predicate,category,pattern]of equivalents)rules.push({predicate,category,pattern,regex:new RegExp('^(?:'+pattern+')$')});
  for(const [topic,subject] of Object.entries(subjects))for(const [direction,verb] of Object.entries(verbs))rules.push({predicate:'direction.'+topic+'.'+direction,category:'fact',pattern:subject+' '+verb+'(?: (?:nas janelas fechadas|no recorte comparavel|em relacao ao periodo anterior))?',regex:new RegExp('^'+subject+' '+verb+'(?: (?:nas janelas fechadas|no recorte comparavel|em relacao ao periodo anterior))?$')});
  const licensed=(spec,p)=>p.startsWith('direction.')?spec.predicates.some(x=>['change.','trend.'].some(prefix=>x===prefix+p.slice(10))):spec.predicates.includes(p);
  function clean(text){
    if(typeof text!=='string'||/[<>\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(text))return null;
    return text.normalize('NFKC').replace(/\*\*([^*\n]+)\*\*/g,'$1').replace(/\*([^*\n]+)\*/g,'$1').replace(/_([^_\n]+)_/g,'$1').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/^\s*[-•]\s+/gm,'').replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
  }
  function check(text,specs){
    const original=clean(text);if(!original||original.length>2000)return {ok:false,reason:'INVALID_TEXT'};
    const refs=[];let invalid=false;
    let substituted=original.replace(/\{\{\s*(metric|period|previous)\s*:\s*([\w-]+)\s*\}\}/g,(_,kind,id)=>{
      const owner=specs.find(s=>kind==='metric'?s.numbers.some(n=>n.id===id):s.claimId===id&&(kind!=='previous'||s.previous));
      if(!owner){invalid=true;return '';}
      const key='zzref'+String.fromCharCode(97+refs.length)+'zz';refs.push({key,kind,id,owner,number:owner.numbers.find(n=>n.id===id)});return key;
    });
    // A literal is accepted ONLY in an existing typed numeric clause, with the
    // exact official display value, unit, role and scope. No arithmetic/coercion.
    substituted=substituted.replace(/(?:R\$\s*)?-?\d+(?:[.,]\d+)*/g,literal=>{
      const key='zzref'+String.fromCharCode(97+refs.length)+'zz';
      refs.push({key,kind:'literal',literal});return key;
    });
    if(invalid||/[{}]|\p{N}/u.test(substituted)||refs.length>20)return {ok:false,reason:'UNVERIFIED_REFERENCE_OR_NUMBER'};
    const display=n=>n.unit==='BRL'?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n.value):I.G.num(n.value);
    const evidenceMatch=(ref,role)=>{
      if(ref?.kind==='metric')return ref.number.role===role?ref:null;
      if(ref?.kind!=='literal')return null;
      for(const owner of specs){const number=owner.numbers.find(n=>n.role===role&&norm(display(n))===norm(ref.literal));if(number)return {...ref,kind:'metric',number,owner,id:number.id};}
      return null;
    };
    const assertion=ref=>({claimId:ref.owner.claimId,predicate:'metric.'+ref.id,category:'fact',reference:ref.key});
    let semanticIssue=null;
    function atomic(raw){
      let s=raw.replace(/^(?:alem disso|ao mesmo tempo|por outro lado)(?:,)? /,'').replace(/^(?:neste recorte|nesse recorte|neste periodo|nesse periodo|no recorte (?:analisado|selecionado)|no periodo (?:selecionado|analisado)|na leitura dos dados)(?:,)? /,'');
      s=s.replace(/^(?:alem disso|ao mesmo tempo|por outro lado)(?:,)? /,'');
      // This comparison proves only the goal state, never an external cause.
      const goalPair=s.match(/^(zzref[a-z]zz) confirmacoes(?: validas)?(?: no panjud)? (?:foram registradas|estao registradas) (?:sobre o objetivo de|para (?:a )?meta de|diante (?:do objetivo|da meta) de) (zzref[a-z]zz)$/);
      if(goalPair){
        const confirmed=evidenceMatch(refs.find(x=>x.key===goalPair[1]),'confirmed'),goal=evidenceMatch(refs.find(x=>x.key===goalPair[2]),'goal');
        if(confirmed&&goal&&confirmed.owner.claimId===goal.owner.claimId&&confirmed.number.unit==='count'&&goal.number.unit==='count'&&Number.isFinite(confirmed.number.value)&&confirmed.number.value>=0&&Number.isFinite(goal.number.value)&&goal.number.value>0){
          const state=confirmed.number.value<goal.number.value?'goal.below':'goal.reached';
          if(licensed(confirmed.owner,state))return [{...assertion(confirmed),goalEvidence:state},assertion(goal)];
        }
        semanticIssue='GOAL_EVIDENCE_MISMATCH';return null;
      }
      const number=s.match(/^(?:ha|foram registrados|o recorte reune|a selecao reune) (zzref[a-z]zz) (.+)$/);
      if(number){const token=refs.find(x=>x.key===number[1]);for(const[role,noun]of Object.entries(nounRoles)){const ref=evidenceMatch(token,role);if(new RegExp('^(?:'+noun+')$').test(number[2])&&ref&&ref.number.unit==='count')return [assertion(ref)];}}
      const scalar=s.match(/^(.+?) (?:e de|e|chega a|corresponde a|representa) (zzref[a-z]zz)( ?%| pontos percentuais| por dia civil)?$/);
      if(scalar){const token=refs.find(x=>x.key===scalar[2]);for(const[role,noun]of Object.entries(scalarRoles)){const ref=evidenceMatch(token,role);if(new RegExp('^(?:'+noun+')$').test(scalar[1])&&ref){
        const unit=ref.number.unit;scalar[3]=scalar[3]?.trim();if(scalar[3]==='%'&&unit!=='percent'||scalar[3]==='pontos percentuais'&&unit!=='percentage_points')return null;
        if(unit==='percent'&&scalar[3]!=='%'||unit==='percentage_points'&&scalar[3]!=='pontos percentuais')return null;
        if(unit==='per_calendar_day'&&scalar[3]!=='por dia civil'||scalar[3]==='por dia civil'&&unit!=='per_calendar_day')return null;
        return [assertion(ref)];
      }}}
      const period=s.match(/^o periodo analisado e (zzref[a-z]zz)$/);if(period){const ref=refs.find(x=>x.key===period[1]);if(ref?.kind==='period')return [{claimId:ref.owner.claimId,predicate:'period',category:'frame'}];}
      const comparison=s.match(/^a comparacao considera (zzref[a-z]zz) em relacao a (zzref[a-z]zz)$/);if(comparison){const a=refs.find(x=>x.key===comparison[1]),b=refs.find(x=>x.key===comparison[2]);if(a?.kind==='period'&&b?.kind==='previous'&&a.owner.claimId===b.owner.claimId)return [{claimId:a.owner.claimId,predicate:'periods',category:'frame'}];}
      for(const rule of rules)if(rule.regex.test(s)){const owner=specs.find(spec=>licensed(spec,rule.predicate)&&!(rule.predicate.startsWith('direction.')&&s.endsWith('em relacao ao periodo anterior')&&!spec.predicates.includes('change.'+rule.predicate.slice(10))));if(owner)return [{claimId:owner.claimId,predicate:rule.predicate,category:rule.category}];}
      return null;
    }
    let steps=0;
    function clause(s,depth=0){
      if(++steps>180||depth>10)return null;s=s.trim();const a=atomic(s);if(a)return a;
      if(s.startsWith('como ')){const comma=s.indexOf(',');if(comma>5){const premise=clause(s.slice(5,comma),depth+1),consequence=clause(s.slice(comma+1),depth+1);if(premise?.every(x=>x.category==='definition')&&consequence?.every(x=>x.category==='operation'))return [...premise,...consequence];}}
      // Narrow logical explanation: a licensed goal state backed by its own
      // typed counts, or an operational suggestion explained by its definition.
      for(const link of s.matchAll(/\s+(porque|pois|ja que)\s+/g)){
        const left=clause(s.slice(0,link.index),depth+1),right=clause(s.slice(link.index+link[0].length),depth+1);
        if(!left||!right)continue;
        const goalProof=left.length===1&&['goal.below','goal.reached'].includes(left[0].predicate)&&right.length===2&&right[0].goalEvidence===left[0].predicate&&right.every(x=>x.claimId===left[0].claimId);
        const operations={'definition.stages':['operation.separate','operation.confirmations'],'definition.goal':['operation.goal']};
        const definitionProof=right.length===1&&left.length===1&&operations[right[0].predicate]?.includes(left[0].predicate)&&left[0].claimId===right[0].claimId;
        if(goalProof||definitionProof)return [...left,...right];
      }
      // Coordinated clauses are parsed recursively; nothing is discarded.
      const connectors=/\s*,?\s+(enquanto|mas|e tambem|alem disso|ao mesmo tempo|por outro lado|por isso|assim|e),?\s+/g;
      for(const match of s.matchAll(connectors)){
        const left=clause(s.slice(0,match.index),depth+1);if(!left)continue;
        const right=clause(s.slice(match.index+match[0].length),depth+1);if(!right)continue;
        if(['por isso','assim'].includes(match[1])&&!right.every(x=>x.category==='operation'))continue;
        return [...left,...right];
      }
      for(const comma of s.matchAll(/,\s+/g)){const left=clause(s.slice(0,comma.index),depth+1),right=clause(s.slice(comma.index+comma[0].length),depth+1);if(left&&right)return [...left,...right];}
      return null;
    }
    const segments=substituted.split(/[.!?;\n]+/).map(s=>norm(s)).filter(Boolean);if(!segments.length||segments.length>12)return {ok:false,reason:'INVALID_CLAUSE_COUNT'};
    const assertions=[];for(const s of segments){const parsed=clause(s);if(!parsed)return {ok:false,reason:semanticIssue||'UNSUPPORTED_MEANING',segment:segments.indexOf(s)};assertions.push(...parsed);}
    if(assertions.length>20)return {ok:false,reason:'EXCESSIVE_ASSERTIONS'};
    const substantive=assertions.filter(x=>x.category==='fact');
    if(!substantive.length||specs.some(spec=>!substantive.some(x=>x.claimId===spec.claimId)))return {ok:false,reason:'UNUSED_OR_GENERIC_SUPPORT'};
    const signatures=assertions.map(x=>x.claimId+':'+x.predicate);if(new Set(signatures).size!==signatures.length)return {ok:false,reason:'REPETITION'};
    const resolved=original.replace(/\{\{\s*(metric|period|previous)\s*:\s*([\w-]+)\s*\}\}/g,(_,kind,id)=>{
      const ref=refs.find(r=>r.id===id&&r.kind===kind);if(kind==='metric')return ref.number.unit==='BRL'?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(ref.number.value):I.G.num(ref.number.value);
      return I.G.range(kind==='previous'?ref.owner.previous:ref.owner.period);
    });
    return {ok:true,text:resolved,template:original,assertions,hasExplanation:assertions.some(x=>['operation','limitation','definition'].includes(x.category))};
  }
  function contract(specs){
    const selected=rules.filter(rule=>specs.some(s=>licensed(s,rule.predicate))).map(({predicate,pattern,category})=>({predicate,category,grammar:pattern}));
    const roles=new Set(specs.flatMap(s=>s.numbers.map(n=>n.role))),subset=o=>Object.fromEntries(Object.entries(o).filter(([k])=>roles.has(k)));
    return {version:'3.1',normalization:'NFKC, whitespace, case/accent-insensitive recognition; bold/italic wrappers; original wording retained',composition:'Full clauses joined by punctuation or e/mas/enquanto/além disso/ao mesmo tempo/por outro lado. Como [verified definition], [supported operation] also allowed. por isso/assim only before a supported operational suggestion, never between factual claims. porque/pois/já que only for a goal state proved by its typed goalPair, or a supported operation explained by its corresponding definition.',rules:selected,numeric:{goalPair:'{{metric:CONFIRMED}} confirmações foram registradas sobre o objetivo de {{metric:GOAL}}. Use tokens oficiais dos papéis confirmed e goal, unidade count e mesmo claim. Pode explicar com porque/pois/já que somente o estado de meta comprovado.',count:'[Há | O recorte reúne | A seleção reúne] {{metric:ID}} [noun matching role]',scalar:'[subject matching role] [é | é de | corresponde a | representa | chega a] {{metric:ID}} [mandatory %, pontos percentuais or por dia civil matching unit]',nouns:subset(nounRoles),subjects:subset(scalarRoles)},periods:'O período analisado é {{period:claimId}}. A comparação considera {{period:claimId}} em relação a {{previous:claimId}}.'};
  }
  I.Language={check,contract,clean,norm};
})();
