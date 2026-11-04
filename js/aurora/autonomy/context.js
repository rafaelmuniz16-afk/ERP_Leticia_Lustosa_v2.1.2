/* Structured application state only; no personal fields leave this router. */
(() => {
 'use strict';const A=window.__auroraAutonomyParts,{hash,today,date}=A.U,el=id=>document.getElementById(id),value=id=>el(id)?.value;
 function current(){let module='live',scope={month:today().slice(5,7)},manual=false;
  if(el('erpWorkDialog')?.open){module='work-center';manual=true;scope=window.ERPWorkView?.autonomyScope?.()||{unavailable:true};}
  else if(el('erpSummaryDialog')?.open){module='reports';manual=true;scope={period:value('erpSummaryPeriod'),start:date(value('erpSummaryStart'))?value('erpSummaryStart'):null,end:date(value('erpSummaryEnd'))?value('erpSummaryEnd'):null,financial:el('erpSummaryFinance')?.checked===true};}
  else if(el('auroraFinanceDialog')?.open){module='financial';manual=true;scope={month:today().slice(0,7),authorized:el('auroraFinanceAllow')?.checked===true};}
  else if(document.querySelector?.('dialog[open]')){module='other-dialog';manual=true;scope={};}
  else if(el('aiDrawer')?.classList?.contains('ai-open')){module='chat';manual=true;scope={};}
  else if(value('filterMonth')&&value('filterMonth')!==today().slice(5,7)){scope={month:value('filterMonth')};manual=true;}
  return {module,manual,signature:hash([module,scope,today()])};
 }A.Context={current};
})();
