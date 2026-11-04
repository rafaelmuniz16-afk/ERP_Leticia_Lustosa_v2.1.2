/* Consultas determinísticas de metas. A IA não interpreta nem calcula esses números. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ERPGoalMetrics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clean=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const months={janeiro:'01',fevereiro:'02',marco:'03',abril:'04',maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',outubro:'10',novembro:'11',dezembro:'12'};
  function analyze(query){
    const t=clean(query).trim();
    // Só perguntas diretas de déficit/progresso; evita interceptar pedidos de hipóteses e operações de escrita.
    if(!/(?:meta|objetivo|80\s*%|90\s*%|100\s*%)/.test(t))return null;
    if(!/(?:faltam?|restam?|quanto|quantos|atingir|bater|alcancar|progresso)/.test(t))return null;
    if(/(?:se eu|supondo|hipotetic|simula|projec|previs|cadastr|altera|muda|salva|registra|total de|sem panjud)/.test(t))return null;
    const explicit=Object.keys(months).find(m=>new RegExp('\\b'+m+'\\b').test(t));
    const select=[];
    if(/80\s*%/.test(t))select.push(.8);
    if(/90\s*%/.test(t))select.push(.9);
    if(/100\s*%/.test(t)||!select.length)select.push(1);
    return {mes:explicit?months[explicit]:null,faixas:select};
  }
  function response(query,ctx){
    const intent=analyze(query);if(!intent||typeof ctx?.calculate!=='function')return null;
    const month=intent.mes||ctx.getSelectedMonth?.();
    const c=ctx.calculate(month);
    if(!c||!Number.isFinite(Number(c.meta)))return null;
    const target=Math.max(0,Number(c.meta));
    const real=Math.max(0,Number(c.reais)||0);
    const label=Object.entries(months).find(([name,key])=>key===month)?.[0]||month;
    if(target===0)return `A meta de ${label} ainda não foi definida. O ERP registra ${real} encerramento${real===1?'':'s'} ${real===1?'real':'reais'} (Panjud = Sim).`;
    const parts=intent.faixas.map(f=>{
      const goal=Math.ceil(target*f-1e-9),remaining=Math.max(0,goal-real);
      return remaining===0?`${Math.round(f*100)}%: atingido`: `${Math.round(f*100)}%: faltam ${remaining} caso${remaining===1?'':'s'} ${remaining===1?'real':'reais'}`;
    });
    const progress=(real/target*100).toLocaleString('pt-BR',{maximumFractionDigits:1});
    return `Meta de ${label}: ${real} encerramentos reais confirmados no Panjud de ${target} previstos (${progress}%). ${parts.join(' · ')}. Os registros totais/cadastrados não entram no cálculo do progresso da meta.`;
  }
  return Object.freeze({analyze,response});
});
