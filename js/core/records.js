// ==== CRUD FORMULÁRIO ====
async function saveRecord(registro) { return await serverMutation('salvar', {registro}); }
async function editServer(registro) { return await serverMutation('editar', {registro}); }
async function deleteServer(uidValue) { return await serverMutation('apagar', {uid: uidValue}); }

function formData() {
  return {
    id: $('idCaso').value.trim(),
    processo: $('numProcesso').value.trim(),
    tipo: $('tipoEncerramento').value,
    data: $('dataEncerramento').value,
    panjud: $('panjud').value,
    recusado: $('recusado').value,
    observacoes: $('observacoes').value.trim(),
    mesReferencia: $('mesReferenciaForm').value
  };
}

function clearForm() {
  editUid = null;
  $('processForm').reset();
  $('dataEncerramento').value = getTodayLocal();
  $('mesReferenciaForm').value = getSelectedMonth();
  $('formTitle').textContent = 'Novo registro';
  $('btnSubmit').textContent = '✓ Salvar registro';
  $('btnCancel').style.display = 'none';
  setTimeout(() => $('idCaso')?.focus(), 50);
}

function startEdit(uidValue) {
  const r = bd.find(x => String(x._uid) === String(uidValue));
  if(!r) return;
  editUid = uidValue;
  $('idCaso').value = r.id || '';
  $('numProcesso').value = r.processo || '';
  $('tipoEncerramento').value = r.tipo || 'Ônus';
  $('dataEncerramento').value = normalizeDate(r.data);
  $('mesReferenciaForm').value = getMesCorreto(r);
  $('panjud').value = r.panjud || 'Não';
  $('recusado').value = r.recusado || 'Não';
  $('observacoes').value = r.observacoes || '';
  $('formTitle').textContent = 'Editar registro';
  $('btnSubmit').textContent = '✓ Atualizar registro';
  $('btnCancel').style.display = 'inline-flex';
  document.getElementById('cadastro').scrollIntoView({behavior: 'smooth', block: 'start'});
  setTimeout(() => $('idCaso')?.focus(), 50);
}

async function handleSubmit(e) {
  e.preventDefault();
  if($('panjud').value === 'Sim' && $('recusado').value === 'Sim') {
    toast('error', 'Um caso não pode ser encerrado e recusado no Panjud ao mesmo tempo.');
    return;
  }
  const data = formData();
  if(!data.id || !data.processo) {
    toast('warning', 'Preencha ID e número do processo.');
    return;
  }
  try {
    setLoading(true, editUid ? 'Atualizando registro…' : 'Salvando registro…');
    if(editUid) {
      data._uid = editUid;
      await editServer(data);
      const idx = bd.findIndex(x => String(x._uid) === String(editUid));
      if(idx >= 0) bd[idx] = data;
      registrarLog('EDITAR', data.id, 'Processo: ' + data.processo + ' | Tipo alterado: ' + data.tipo + ' | Panjud: ' + data.panjud);
      toast('success', 'Registro confirmado pela nuvem.');
    } else {
      data._uid = uid();
      await saveRecord(data);
      bd.push(data);
      registrarLog('CADASTRAR', data.id, 'Processo: ' + data.processo + ' | Tipo: ' + data.tipo + ' | Panjud: ' + data.panjud);
      toast('success', 'Novo registro confirmado pela nuvem.');
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(bd));
    clearForm();
    renderAll();
    setConn('online', 'Online');
    refreshAuroraLive({ confirmed: true });
  } catch(err) {
    toast('error', err.message);
    setConn('offline', 'Falha na nuvem');
  } finally {
    setLoading(false);
  }
}

async function deleteRecord(uidValue) {
  const r = bd.find(x => String(x._uid) === String(uidValue));
  if(!r) return;
  const result = await Swal.fire({
    title: 'Excluir este caso?',
    html: '<div style="font-size:12px;text-align:left"><b>ID:</b> ' + escapeHTML(r.id) + '<br><b>Processo:</b> ' + escapeHTML(r.processo) + '<br><b>Tipo:</b> ' + escapeHTML(r.tipo) + '</div>',
    showCancelButton: true,
    confirmButtonText: 'Excluir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3f5a',
    reverseButtons: true
  });
  if(!result.isConfirmed) return;
  try {
    setLoading(true, 'Excluindo registro…');
    await deleteServer(uidValue);
    bd = bd.filter(x => String(x._uid) !== String(uidValue));
    localStorage.setItem(CACHE_KEY, JSON.stringify(bd));
    registrarLog('APAGAR', r.id, 'Processo: ' + r.processo + ' removido do sistema.');
    renderAll();
    toast('success', 'Registro removido com confirmação da nuvem.');
    setConn('online', 'Online');
    refreshAuroraLive({ confirmed: true });
  } catch(err) {
    toast('error', err.message);
    setConn('offline', 'Falha na nuvem');
  } finally {
    setLoading(false);
  }
}

async function saveMeta() {
  const month = getSelectedMonth(), value = parseNum($('metaInput').value);
  const previous = lastConfirmedMetas[month] ?? 0;
  metas[month] = value;
  localStorage.setItem(META_KEY, JSON.stringify(metas));
  renderAll();
  clearTimeout(metaSaveTimer);
  metaSaveTimer = setTimeout(async () => {
    try {
      setConn('syncing', 'Salvando meta…');
      await serverMutation('salvarMeta', {mes: month, meta: value});
      lastConfirmedMetas[month] = value;
      toast('success', 'Meta confirmada pela nuvem.');
      setConn('online', 'Online');
      refreshAuroraLive({ confirmed: true });
    } catch(err) {
      metas[month] = previous;
      localStorage.setItem(META_KEY, JSON.stringify(metas));
      updateMetaInput();
      renderAll();
      toast('error', 'A meta não foi confirmada pelo servidor.');
      setConn('offline', 'Falha na nuvem');
    }
  }, 900);
}
