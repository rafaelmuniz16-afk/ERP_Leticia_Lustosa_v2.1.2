/* Explicit opt-in only; no financial requests on boot/render. */
(() => {
  'use strict';const button=document.getElementById('auroraFinanceAnalyze'),dialog=document.getElementById('auroraFinanceDialog');
  if(!button||!dialog)return;const output=document.getElementById('auroraFinanceOutput'),status=document.getElementById('auroraFinanceStatus'),allow=document.getElementById('auroraFinanceAllow'),generate=document.getElementById('auroraFinanceGenerate');let job=null,revision=0;
  function cancel(){revision++;job?.abort();job=null;generate.disabled=false;}
  function invalidate(){cancel();output.textContent='';status.textContent='Os dados mudaram. Solicite uma nova análise do mês atual.';}
  button.addEventListener('click',()=>{allow.checked=false;output.textContent='';status.textContent='Analisa o mês atual pelas regras oficiais, independentemente do mês selecionado no dashboard.';dialog.showModal();allow.focus();window.addEventListener('erp:rendered',invalidate);});
  allow.addEventListener('change',()=>{cancel();output.textContent='';status.textContent=allow.checked?'Autorização concedida para esta análise.':'Informações financeiras não serão enviadas.';});
  generate.addEventListener('click',async()=>{
    if(job)return;if(!allow.checked){status.textContent='Marque a autorização para analisar os valores financeiros.';return;}
    job=new AbortController();const controller=job,token=++revision;generate.disabled=true;status.textContent='Consultando o cálculo oficial…';
    try{const r=await AuroraIntegration.generate(AuroraIntegration.finance(true),{signal:controller.signal});if(token!==revision||!dialog.open)return;
      output.replaceChildren();
      for(const section of r.sections){const h=document.createElement('h3');h.textContent=section.title;output.append(h);for(const text of section.paragraphs){const p=document.createElement('p');p.textContent=text;output.append(p);}}
      if(!r.sections.length)output.textContent='O cálculo contextual está indisponível. Verifique a meta confirmada do mês atual.';
      status.textContent=r.source==='groq'?'Aurora AI · texto gerado com valores oficiais verificados.':'Leitura local do ERP · análise por IA indisponível.';if(r.validation==='partial')status.textContent+=' Foram mantidos apenas os parágrafos validados.';}
    catch(_){if(token===revision)status.textContent='A análise não ficou disponível. Os valores do Radar continuam acessíveis.';}
    finally{if(token===revision){job=null;generate.disabled=false;}}
  });
  document.getElementById('auroraFinanceClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{cancel();allow.checked=false;output.textContent='';window.removeEventListener('erp:rendered',invalidate);button.focus();});
  window.addEventListener('pagehide',()=>{cancel();if(dialog.open)dialog.close();});
})();
