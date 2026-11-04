(() => {
'use strict';
function prompt(repair){return `Você é Aurora, assistente de consulta do ERP. Analise SOMENTE os agregados fornecidos. Escolha até três fatos relevantes e escreva um comentário breve e profissional sobre como conferir ou interpretar cada fato. Responda JSON {"insights":[{"fact":"chave existente em facts","comment":"comentário"}]}. O ERP imprime os fatos e números; NÃO repita números, quantidades, datas, percentuais ou números por extenso no comentário. Não calcule. Não afirme pendências jurídicas, causas de recusas, providências judiciais, movimentações, finanças, metas, recordes ou evolução. Duplicidades e divergências são motivos de conferência, não erros comprovados. Não afirme ausência de alertas se review for positivo. Prefira orientação de conferência. Sem links, HTML, emojis; até 220 caracteres por comentário.${repair?' A resposta anterior estava incompleta ou incompatível. Siga estritamente o esquema, sem números.':''}`;}
function schema(ctx){return {type:'json_schema',json_schema:{name:'aurora_work_analysis',strict:true,schema:{type:'object',additionalProperties:false,required:['insights'],properties:{insights:{type:'array',minItems:1,maxItems:3,items:{type:'object',additionalProperties:false,required:['fact','comment'],properties:{fact:{type:'string',enum:Object.keys(ctx.facts)},comment:{type:'string'}}}}}}}};}
function validate(raw,ctx){
 if(typeof raw!=='string'||raw.length>10000)return null;let data;try{data=JSON.parse(raw.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1'));}catch(_){return null;}
 if(!data||Object.keys(data).join()!=='insights'||!Array.isArray(data.insights)||!data.insights.length||data.insights.length>3)return null;
 const seen=new Set(),result=[];
 for(const item of data.insights){
  if(!item||Object.keys(item).sort().join()!=='comment,fact'||!Object.hasOwn(ctx.facts,item.fact)||typeof item.comment!=='string'||seen.has(item.fact))continue;
  const comment=item.comment.replace(/\s+/g,' ').trim(),norm=comment.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(comment.length<12||comment.length>220||/[\p{N}<>{}%$*`]|https?:|www\./iu.test(comment))continue;
  if(/\b(zero|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|mil|milhao|bilhao|metade|dobro|triplo|centenas|milhares|milhoes|bilhoes)\b|\b(um|uma) (caso|registro|dia|mes|ano)\b/.test(norm))continue;
  const claims=norm.replace(/nao (?:comprova|significa|confirma|indica|representa) (?:uma |a |um )?(?:pendencia juridica|baixa judicial|erro cadastral)/g,'');
  if(/pendencia(?:s)? juridica|judicia|sentenca|prazo processual|transito em julgado|movimentac|recusad[oa]s? (por|porque|devido)|causa da recusa|bonus|bonifica|financeir|pagamento|recebera|meta|recorde|media historica|produtividade|crescimento|aumentou|diminuiu/.test(claims))continue;
  if(ctx.review&&/sem (alertas|inconsistencias|erros)|nao ha (alertas|inconsistencias)|todos.*corret/.test(claims))continue;
  if(ctx.confirmed<ctx.total&&/todos.*confirmad|totalidade.*confirmad|integralmente confirmad/.test(claims))continue;
  if(ctx.refused&&/(?:nao ha|nao existem|sem|nenhum[oa]s?) recus/.test(claims))continue;
  if(ctx.unconfirmed&&/(?:nao ha|nao existem|sem|nenhum[oa]s?) (?:registros )?nao confirmad/.test(claims))continue;
  if(/recusas?.*(?:causad|motivadas? por|devido a)|recusa (?:ocorreu|aconteceu) por|exclu[ai]|apagu[ea]|corrija automaticamente|erro comprovado/.test(claims))continue;
  seen.add(item.fact);result.push({fact:ctx.facts[item.fact],comment});
 }return result.length?result:null;
}
async function generate(ctx,{signal}={}){
 if(window.AuroraAgentReady)await window.AuroraAgentReady;if(signal?.aborted)throw new DOMException('Cancelado','AbortError');if(!window.AuroraWorkAI)throw new Error('AI_UNAVAILABLE');
 for(let attempt=0;attempt<2;attempt++){
  if(signal?.aborted)throw new DOMException('Cancelado','AbortError');let raw;
  try{raw=await window.AuroraWorkAI.generate(ctx,{signal,repair:attempt>0});}catch(e){if(signal?.aborted)throw new DOMException('Cancelado','AbortError');if(!attempt&&['TRUNCATED_WORK_RESPONSE','INVALID_WORK_RESPONSE'].includes(e.message))continue;throw e;}
  if(signal?.aborted)throw new DOMException('Cancelado','AbortError');const result=validate(raw,ctx);if(result)return result;
 }throw new Error('INVALID_WORK_RESPONSE');
}
window.ERPWorkAI=Object.freeze({prompt,schema,validate,generate});
})();
