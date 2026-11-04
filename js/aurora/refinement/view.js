(() => {
 'use strict';const api=window.AuroraRefinement;if(!api)return;const $=id=>document.getElementById(id);let observed=null,pendingPreference=0;
 const notice=(id,text)=>{const el=$(id);if(el){el.textContent=text;el.hidden=!text;}};
 function refresh(force=false){const next=api.current(),p=api.getPreferences();if(observed?.id!==next?.id)notice('auroraFeedbackStatus','');observed=next;
  $('auroraFeedback').hidden=!next;for(const[value,id]of [['positive','auroraFeedbackUseful'],['negative','auroraFeedbackNotUseful']])$(id).setAttribute('aria-pressed',String(next?.value===value));
  $('auroraFeedbackReasonLabel').hidden=next?.value!=='negative';$('auroraFeedbackReason').value=next?.reason||'';
  if(!pendingPreference){if(force||document.activeElement!==$('auroraStyle'))$('auroraStyle').value=p.style;if(force||document.activeElement!==$('auroraUseFeedback'))$('auroraUseFeedback').checked=p.useFeedback;}
 }
 async function evaluate(value,event){const current=observed;if(!current)return;const result=await api.feedback({id:current.id,revision:current.revision,value,reason:value==='negative'?$('auroraFeedbackReason').value||null:null},event);refresh();notice('auroraFeedbackStatus',result?.ok?result.reason==='EVIDENCE_RECHECKED_REPORT_NOT_PROOF'?'Avaliação registrada. As evidências atuais foram conferidas; o relato não altera os dados.':'Avaliação registrada.':result?.reason==='FEEDBACK_CONFLICT'?'A avaliação foi atualizada em outra aba. Confira antes de avaliar novamente.':'Esta observação não está disponível para avaliação agora.');}
 $('auroraFeedbackUseful')?.addEventListener('click',e=>evaluate('positive',e));$('auroraFeedbackNotUseful')?.addEventListener('click',e=>evaluate('negative',e));$('auroraFeedbackReason')?.addEventListener('change',e=>evaluate('negative',e));
 for(const[key,id]of [['style','auroraStyle'],['useFeedback','auroraUseFeedback']])$(id)?.addEventListener('change',async e=>{pendingPreference++;const result=await api.setPreferences({[key]:key==='style'?e.currentTarget.value:e.currentTarget.checked},e);pendingPreference--;refresh(true);notice('auroraRefinementStatus',result?.ok?'Preferência salva.':'Não foi possível salvar esta preferência agora.');});
 $('auroraResetAdaptation')?.addEventListener('click',async e=>{const result=await api.resetAdaptation(e);notice('auroraRefinementStatus',result?.ok?'Priorização redefinida. As avaliações anteriores foram mantidas para consulta.':'Não foi possível redefinir agora.');});
 $('auroraEraseFeedback')?.addEventListener('click',e=>{if(api.requestErase(e)?.ok){$('auroraEraseDialog').showModal();$('auroraCancelErase').focus();}});
 $('auroraConfirmErase')?.addEventListener('click',async e=>{const result=await api.erase(e);$('auroraEraseDialog').close();notice('auroraRefinementStatus',result?.ok?'Avaliações apagadas. Histórico, memória operacional e cotas preservados.':'As avaliações mudaram ou não puderam ser apagadas. Abra a confirmação novamente.');});
 $('auroraCancelErase')?.addEventListener('click',()=>{$('auroraEraseDialog').close();});$('auroraEraseDialog')?.addEventListener('close',()=>{api.cancelErase();$('auroraEraseFeedback').focus();});
 for(const id of ['auroraStyle','auroraUseFeedback'])$(id)?.addEventListener('blur',()=>queueMicrotask(()=>refresh()));
 api.bindUI(Object.freeze({refresh}));
})();
