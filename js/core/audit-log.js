// ==== AUDITORIA ====
function registrarLog(acao, idCaso, detalhes) {
  if (!Array.isArray(logsAuditoria)) logsAuditoria = [];
  const dataAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' });
  const novoLog = { dataHora: dataAtual, acao, idCaso, detalhes };
  logsAuditoria.unshift(novoLog);
  if(logsAuditoria.length > 200) logsAuditoria.pop(); 
  localStorage.setItem(LOGS_KEY, JSON.stringify(logsAuditoria));
  renderLogs();
  
  fetch(API_URL, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify({acao: 'salvarLog', dataHora: dataAtual, acaoLog: acao, idCaso: idCaso, detalhes: detalhes})
  }).catch(err => console.log('Erro de log:', err));
}

function renderLogs() {
  const tbody = $('logsTable');
  if(!tbody) return;
  tbody.replaceChildren();
  if (!Array.isArray(logsAuditoria)) logsAuditoria = [];
  if(!logsAuditoria.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhum log registrado ainda.</td></tr>';
    return;
  }
  logsAuditoria.forEach(l => {
    const tr = document.createElement('tr');
    let badgeClass = 'b-acordo';
    if(l.acao.includes('CADASTRAR')) badgeClass = 'b-exito';
    if(l.acao.includes('APAGAR')) badgeClass = 'b-onus';
    tr.innerHTML = '<td style="white-space:nowrap">' + l.dataHora + '</td><td><span class="badge ' + badgeClass + '">' + l.acao + '</span></td><td><strong>' + l.idCaso + '</strong></td><td style="color:var(--muted); max-width:400px;">' + l.detalhes + '</td>';
    tbody.appendChild(tr);
  });
}

