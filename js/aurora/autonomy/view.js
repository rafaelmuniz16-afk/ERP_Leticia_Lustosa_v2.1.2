(() => {
 'use strict';const api=window.AuroraAutonomy;if(!api)return;const $=id=>document.getElementById(id);let proposalId=null;const fields={enabled:'auroraProactive',suggestions:'auroraSuggestions',generative:'auroraProactiveAI',minimumRelevance:'auroraRelevance'};
 function preferences(){const p=api.getPreferences();for(const[key,id]of Object.entries(fields)){const e=$(id);if(!e)continue;if(key==='minimumRelevance')e.value=p[key];else e.checked=p[key];}}
 function proposal(value){proposalId=value?.id||null;if(!$('auroraAutonomySuggestion'))return;$('auroraAutonomySuggestion').hidden=!value;$('auroraAutonomyAction').textContent=value?.label||'';$('auroraAutonomyStatus').hidden=true;}
 function notice(message){const e=$('auroraAutonomyStatus');if(e){e.textContent=message;e.hidden=false;}}
 for(const[key,id]of Object.entries(fields))$(id)?.addEventListener('change',async event=>{const value=key==='minimumRelevance'?event.currentTarget.value:event.currentTarget.checked,result=await api.setPreferences({[key]:value},event);preferences();$('auroraAutonomyPreferencesStatus').textContent=result?.ok?'Preferência salva. As consultas manuais continuam disponíveis; a autonomia não altera registros.':'Não foi possível salvar a preferência agora. Nenhuma permissão adicional foi concedida.';});
 $('auroraAutonomyAction')?.addEventListener('click',event=>api.execute(proposalId,event));$('auroraAutonomyDismiss')?.addEventListener('click',event=>{if(api.dismiss(proposalId,event)?.ok)notice('Sugestão ignorada.');});api.bindUI(Object.freeze({proposal,preferences,notice}));
})();
