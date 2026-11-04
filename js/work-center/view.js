(() => {
  'use strict';
  const W=window.ERPWork,D=window.ERPExport.Data,F=window.ERPExport.Filters;
  const $=id=>document.getElementById(id),dialog=$('erpWorkDialog'),opener=$('erpWorkOpen');
  if(!dialog||!opener)return;
  let base=null,result=null,filters=W.defaults(),page=0,selected=null,detailOpener=null,flight=null,revision=0,timer=null;
  const fields=['id','processo','tipo','data','panjud','recusado','observacoes','mesReferencia'];
  const labels=['ID','Número CNJ','Tipo de encerramento','Data','Encerrado no Panjud','Recusado no Panjud','Observações','Mês de referência'];
  const quick={all:'Todos no período',unconfirmed:'Não confirmados',refused:'Recusados',confirmed:'Confirmados',pending:'Não confirmados e não recusados','Ônus':'Ônus',Acordo:'Acordo','Êxito':'Êxito','Inativação':'Inativação',today:'Registros de hoje',review:'Com inconsistências',hasObs:'Com observações',noObs:'Sem observações'};
  const cards={unconfirmed:'Não confirmados no Panjud',refused:'Recusados no Panjud',confirmed:'Confirmados no Panjud',today:'Registrados hoje',review:'Registros para conferência'};
  const text=(tag,value,className)=>{const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;};
  const button=(label,action,className)=>{const b=text('button',label,className);b.type='button';b.addEventListener('click',action);return b;};
  const source=()=>window.obterContextoERP?.()?.bd||[];
  const today=()=>typeof getTodayLocal==='function'?getTodayLocal():window.obterContextoERP().getTodayLocal();
  const status=value=>{$('wc-status').textContent=value;};
  function unchanged(){const rows=source();return base&&base.today===today()&&rows.length===base.rows.length&&base.rows.every((r,i)=>r.uid===String(rows[i]?._uid??'')&&fields.every(k=>r.record[k]===D.text(rows[i]?.[k])));}
  function cancelAI(clear=true){
    revision++;flight?.abort();flight=null;$('wc-analyze').disabled=!result?.rows.length||Boolean(result?.errors.length);
    $('wc-analyze').textContent='✦ Analisar com Aurora';$('wc-ai').setAttribute('aria-busy','false');
    if(clear){$('wc-ai-result').replaceChildren();$('wc-ai-status').textContent='Opcional · somente agregados, sem IDs, CNJs ou observações. A análise acontece apenas ao clicar.';}
  }
  function options(id,entries){const el=$(id);el.replaceChildren();entries.forEach(([key,label])=>{const o=text('option',label);o.value=key;el.append(o);});}
  options('wc-period',W.periodKeys.map(k=>[k,F.periods[k]]));
  for(const k of ['panjud','recusado'])options('wc-'+k,Object.entries({all:'Todos',sim:'Sim',nao:'Não',invalid:'Ausente / fora do padrão'}));
  options('wc-reference',[['','Todos os meses'],...Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),String(i+1).padStart(2,'0')])]);
  options('wc-sort',Object.entries(F.sortLabels));
  Object.entries(quick).forEach(([key,label])=>{const b=button(label,()=>{flush();filters=W.shortcut(filters,key,base.today);fill();update();});b.dataset.quick=key;$('wc-quick').append(b);});
  Object.entries(cards).forEach(([key,label])=>{const b=button('',()=>{flush();filters=W.card(filters,key,base.today);fill();update();$('wc-results-title').focus();},'wc-card');b.dataset.card=key;b.append(text('span',label),text('strong','0'),text('small',key==='today'?'Data de encerramento · no período':'Ver registros deste indicador'));$('wc-cards').append(b);});
  function fill(){
    for(const k of ['period','start','end','panjud','recusado','sort','direction'])$('wc-'+k).value=filters[k];
    $('wc-id').value=filters.idValue;$('wc-cnj').value=filters.cnjValue;$('wc-type').value=filters.types[0]||'';$('wc-reference').value=filters.reference[0]||'';
    $('wc-observations').value=filters.obsGroups.flat().find(r=>r.op==='contains')?.value||'';$('wc-custom').hidden=filters.period!=='custom';
  }
  function read(){
    for(const k of ['period','start','end','panjud','recusado','sort','direction'])filters[k]=$('wc-'+k).value;
    filters.idValue=$('wc-id').value.trim();filters.idOp=filters.idValue?'contains':'all';filters.cnjValue=$('wc-cnj').value.trim();filters.cnjOp=filters.cnjValue?'contains':'all';
    filters.types=$('wc-type').value?[$('wc-type').value]:[];filters.reference=$('wc-reference').value?[$('wc-reference').value]:[];
    filters.obsGroups=filters.obsGroups.filter(g=>!g.some(r=>r.op==='contains'));
    if($('wc-observations').value.trim())filters.obsGroups.push([{op:'contains',value:$('wc-observations').value.trim(),not:false}]);
  }
  function flush(){if(timer!==null){clearTimeout(timer);timer=null;read();update();}}
  function capture(){
    cancelAI();base=W.snapshot(source(),today(),window.ERPProcessCNJ?.isValid);
    const types=[...new Set([...D.knownTypes,...base.rows.map(r=>r.type),...filters.types])];options('wc-type',[['','Todos os tipos'],...types.map(k=>[k,k==='__invalid__'?'Ausente / inválido':k])]);
    $('wc-source').textContent=`Base disponível no ERP · ${base.rows.length} registros. Nuvem: ${$('sideStatus')?.textContent||'estado não informado'}. Pode incluir cache local. Atualizar consulta não sincroniza nem confirma a atualização do servidor.`;
    hideDetails(false);fill();update();
  }
  function update(resetPage=true){
    if(!base)return;cancelAI();if(resetPage){page=0;if(selected)hideDetails(false);}result=W.query(base,filters);$('wc-custom').hidden=filters.period!=='custom';
    $('wc-errors').textContent=result.errors.join(' ');$('wc-errors').hidden=!result.errors.length;
    const validPeriod=!F.validate({...W.defaults(),period:filters.period,start:filters.start,end:filters.end}).length;
    $('wc-scope').textContent=validPeriod?`Indicadores do período: ${F.periodLabel(filters,base.today)} · ${result.overview.total} registros. Os demais filtros afetam a lista abaixo. Clicar em um indicador substitui esses filtros.`:'Complete o intervalo para consultar os indicadores.';
    dialog.querySelectorAll('[data-card]').forEach(b=>{b.querySelector('strong').textContent=result.overview[b.dataset.card];b.disabled=!validPeriod;});
    $('wc-note').textContent=`Status com valores exatos Sim / Não, como no cadastro. ${result.overview.conflict} registro(s) com ambos Sim podem aparecer nos dois indicadores; ${result.overview.nonstandardStatus} com status fora do padrão. Sem confirmação não significa pendência jurídica. Duplicidades são verificadas na base inteira. Datas inválidas só aparecem em Todos os períodos.`;
    const chips=$('wc-chips');chips.replaceChildren();F.chips(filters).filter(c=>c.key!=='statusMode').forEach(chip=>{const b=button(chip.label+' ×',()=>{clearTimeout(timer);timer=null;filters=F.remove(filters,chip);fill();update();},'wc-chip');b.setAttribute('aria-label','Remover filtro: '+chip.label);chips.append(b);});
    if(!chips.children.length)chips.textContent='Toda a base disponível · sem filtros.';
    $('wc-count').textContent=`${result.rows.length} resultados de ${base.rows.length} disponíveis`;
    $('wc-result-metrics').textContent=`Nesta seleção: ${result.metrics.unconfirmed} não confirmados · ${result.metrics.refused} recusados · ${result.metrics.confirmed} confirmados · ${result.metrics.review} para conferência.`;
    for(const id of ['wc-export','wc-advanced','wc-summary'])$(id).disabled=Boolean(result.errors.length);
    $('wc-analyze').disabled=!result.rows.length||Boolean(result.errors.length);renderRows();
  }
  function renderRows(){
    const slice=W.paginate(result.rows,page);page=slice.page;const tbody=$('wc-rows');tbody.replaceChildren();
    slice.rows.forEach(r=>{const tr=document.createElement('tr');if(r.issues.length)tr.className='wc-review-row';fields.slice(0,7).forEach(k=>{const td=document.createElement('td'),value=r.record[k]||'—',display=k==='data'?D.formatDate(value):k==='observacoes'&&value.length>100?value.slice(0,100)+'…':value;td.append(text('span',display,['panjud','recusado'].includes(k)?'wc-badge':''));if(k==='id'&&r.issues.length)td.append(text('small',`${r.issues.length} alerta(s)`,'wc-alert-label'));tr.append(td);});
      const action=document.createElement('td'),detail=button('Ver detalhes',()=>showDetails(r,detail));detail.setAttribute('aria-label','Ver detalhes do ID '+(r.record.id||'sem identificação'));action.append(detail,button('Abrir no cadastro',()=>edit(r.uid)));tr.append(action);tbody.append(tr);
    });
    $('wc-empty').hidden=!!result.rows.length;$('wc-page').textContent=`Página ${page+1} de ${slice.pages} · até 25 registros`;$('wc-prev').disabled=page===0;$('wc-next').disabled=page+1===slice.pages;
  }
  function showDetails(row,origin){
    selected=row;detailOpener=origin;const dl=$('wc-detail-fields');dl.replaceChildren();fields.forEach((key,i)=>{const item=document.createElement('div');item.append(text('dt',labels[i]),text('dd',row.record[key]||'Não informado'));dl.append(item);});
    const alerts=$('wc-detail-alerts');alerts.replaceChildren();row.issues.forEach(k=>alerts.append(text('li',D.reviewLabels[k])));if(!row.issues.length)alerts.append(text('li','Nenhuma inconsistência detectada por estas regras. Isso não certifica a situação jurídica do processo.'));
    $('wc-details').hidden=false;$('wc-list').hidden=true;$('wc-detail-close').focus();$('wc-details').scrollIntoView?.({block:'nearest',behavior:'instant'});
  }
  function hideDetails(focus=true){selected=null;$('wc-details').hidden=true;$('wc-list').hidden=false;if(focus)(detailOpener?.isConnected?detailOpener:$('wc-results-title')).focus();detailOpener=null;$('wc-detail-fields').replaceChildren();$('wc-detail-alerts').replaceChildren();}
  function edit(uid){const located=W.locate(source(),uid);if(located.error){status(located.error);return;}if(typeof startEdit!=='function'){status('O cadastro original está indisponível. Recarregue o ERP.');return;}close();startEdit(located.row._uid);}
  function ensureFresh(){flush();if(!unchanged()){capture();status('A base mudou. A consulta foi atualizada.');}}
  async function analyze(){
    if(flight)return;ensureFresh();if(!result.rows.length||result.errors.length)return;
    const ctx=window.AuroraIntegration ? AuroraIntegration.work(base,structuredClone(filters),result) : W.context(base,filters,result.metrics),job=new AbortController(),token=++revision;flight=job;$('wc-analyze').disabled=true;$('wc-analyze').textContent='Aurora analisando…';$('wc-ai').setAttribute('aria-busy','true');$('wc-ai-status').textContent='Analisando os agregados desta seleção…';$('wc-ai-result').replaceChildren();
    try{
      const integrated=!!window.AuroraIntegration;
      const analysis=integrated ? await AuroraIntegration.generate(ctx,{signal:job.signal}) : null;
      const insights=integrated ? analysis.sections.flatMap(s=>s.paragraphs.map(p=>({fact:s.title,comment:p}))) : await window.ERPWorkAI.generate(ctx,{signal:job.signal});if(job.signal.aborted||revision!==token||!dialog.open)return;
      if(!unchanged()){capture();status('A base mudou durante a análise. Solicite uma nova análise da seleção atual.');return;}
      insights.forEach(item=>{const li=document.createElement('li');li.append(text('strong',item.fact),text('p',item.comment));$('wc-ai-result').append(li);});$('wc-ai-status').textContent=integrated ? (analysis.source==='groq'?'Aurora AI · texto gerado com afirmações verificadas.':'Leitura local do ERP · análise por IA indisponível.')+(analysis.validation==='partial'?' Foram mantidos apenas os parágrafos validados.':'')+' O contexto global, quando usado, está identificado separadamente.' : 'Aurora AI · números fornecidos pelo ERP; comentários para revisão humana. Não é análise jurídica.';
    }catch(e){if(job.signal.aborted||revision!==token)return;$('wc-ai-status').textContent=({NO_API_KEY:'Configure a chave Groq na Aurora para solicitar a análise.',CHAT_BUSY:'O chat da Aurora está em uso. Aguarde e tente novamente.',INVALID_WORK_RESPONSE:'A resposta não foi compatível após uma nova tentativa. Os indicadores e filtros continuam disponíveis.',TRUNCATED_WORK_RESPONSE:'A Aurora retornou uma resposta incompleta. Tente novamente.'})[e.message]||'A Aurora está indisponível agora. A consulta e a exportação continuam funcionando.';
    }finally{if(revision===token){flight=null;$('wc-analyze').disabled=false;$('wc-analyze').textContent='✦ Analisar com Aurora';$('wc-ai').setAttribute('aria-busy','false');}}
  }
  function exportResults(){ensureFresh();if(result.errors.length)return;const transfer=structuredClone(filters);close();window.ERPExport.View.open({filters:transfer,returnFocus:opener});}
  function summary(){ensureFresh();const transfer=W.summaryScope(base,filters);if(transfer.error){status(transfer.error);return;}close();window.ERPWhatsAppView.open({...transfer,returnFocus:opener});}
  function refreshFromERP(){if(dialog.open&&!unchanged()){clearTimeout(timer);timer=null;read();capture();status('Consulta atualizada com os dados disponíveis no ERP.');}}
  function cleanup(){clearTimeout(timer);timer=null;cancelAI();base=null;result=null;hideDetails(false);$('wc-rows').replaceChildren();window.removeEventListener('erp:rendered',refreshFromERP);window.removeEventListener('focus',refreshFromERP);}
  function close(){cleanup();dialog.close();}
  function open(){if(dialog.open)return;dialog.showModal();status('Somente leitura · nenhum registro é alterado pela consulta.');try{capture();}catch(e){status(e.message);}window.addEventListener('erp:rendered',refreshFromERP);window.addEventListener('focus',refreshFromERP);$('wc-close').focus();}
  $('wc-filters').addEventListener('input',e=>{if(!e.target.matches('input[type=search]'))return;cancelAI();clearTimeout(timer);timer=setTimeout(()=>{timer=null;read();update();},120);});
  $('wc-filters').addEventListener('change',e=>{
    clearTimeout(timer);timer=null;const previous=JSON.stringify(filters);
    if(e.target.id==='wc-period'&&e.target.value==='custom'&&(!$('wc-start').value||!$('wc-end').value)){const dates=F.range({...W.defaults(),period:'month'},base.today).map(D.fromOrdinal);$('wc-start').value=dates[0];$('wc-end').value=dates[1];}
    read(); // Do not replace a row between pointerdown and click on an unchanged search blur.
    if(JSON.stringify(filters)!==previous){hideDetails(false);update();}
  });
  $('wc-sort').addEventListener('change',()=>{flush();filters.sort=$('wc-sort').value;update();});$('wc-direction').addEventListener('change',()=>{flush();filters.direction=$('wc-direction').value;update();});
  $('wc-clear').addEventListener('click',()=>{clearTimeout(timer);timer=null;filters={...W.defaults(),period:'all'};fill();hideDetails(false);update();});$('wc-reload').addEventListener('click',()=>{flush();capture();status('Dados disponíveis relidos. Nenhuma sincronização foi solicitada.');});
  $('wc-prev').addEventListener('click',()=>{flush();page--;renderRows();});$('wc-next').addEventListener('click',()=>{flush();page++;renderRows();});$('wc-detail-close').addEventListener('click',()=>hideDetails());$('wc-detail-edit').addEventListener('click',()=>selected&&edit(selected.uid));
  $('wc-export').addEventListener('click',exportResults);$('wc-advanced').addEventListener('click',exportResults);$('wc-summary').addEventListener('click',summary);$('wc-analyze').addEventListener('click',analyze);opener.addEventListener('click',open);$('wc-close').addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(selected)hideDetails();else close();});dialog.addEventListener('close',()=>{if(dialog.open)return;cleanup();if(!document.querySelector('dialog[open]'))opener.focus({preventScroll:true});});
  dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusable=Array.from(dialog.querySelectorAll('button,input,select,summary,[tabindex]')).filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length),first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
  // Narrow, read-only entrance; generated text cannot enter this registry.
  function openQuery(query,event){
    const action=document.getElementById('auroraAutonomyAction');
    if(!(event instanceof window.Event)||event.isTrusted!==true||event.type!=='click'||event.currentTarget!==action)return {ok:false,reason:'USER_GESTURE_REQUIRED'};
    const allowed=['period','start','end','panjud','recusado','types','reference'];
    if(!query||typeof query!=='object'||Array.isArray(query)||Object.keys(query).some(k=>!allowed.includes(k))||query.period!=='custom')return {ok:false,reason:'QUERY_NOT_ALLOWED'};
    if(query.types&&(!Array.isArray(query.types)||query.types.some(t=>!D.knownTypes.includes(t))))return {ok:false,reason:'QUERY_NOT_ALLOWED'};
    const next={...W.defaults(),...structuredClone(query)};
    if(F.validate(next).length||next.end>today())return {ok:false,reason:'INVALID_QUERY'};
    filters=next;if(dialog.open)capture();else open();return {ok:true};
  }
  window.ERPWorkView=Object.freeze({openQuery,autonomyScope:()=>dialog.open?{filters:structuredClone(filters),period:base?.today||null}:null});
  window.addEventListener('pagehide',()=>{if(dialog.open)close();});
})();
