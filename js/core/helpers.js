const $ = id => document.getElementById(id);
const monthName = m => MONTHS.find(x => x[0] === String(m))?.[1] || '—';

// DATA OFICIAL LOCAL (AMERICA/FORTALEZA - UTC-3)
function getTodayLocal() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
  } catch(e) {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
}

function setLoading(show, title='Sincronizando…') {
  $('loadingTitle').textContent = title;
  $('loading').classList.toggle('show', show);
}

function toast(icon, title) {
  Swal.fire({toast: true, position: 'top-end', showConfirmButton: false, timer: 2800, timerProgressBar: true, icon, title});
}

function normalizeDate(v) {
  if(!v) return '';
  let s = String(v);
  return s.includes('T') ? s.split('T')[0] : s.includes(' ') ? s.split(' ')[0] : s;
}

function getMesCorreto(d) {
  let m = d.mesReferencia;
  if(!m || isNaN(parseInt(m))) {
    let dt = normalizeDate(d.data);
    return dt && dt.includes('-') ? dt.split('-')[1] : '00';
  }
  return String(parseInt(m)).padStart(2,'0');
}

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function safeText(value) {
  return escapeHTML(value).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

function parseNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function setConn(state, label) {
  const dot = $('sideDot');
  dot.className = 'status-dot ' + (state === 'online' ? 'status-online' : state === 'syncing' ? 'status-syncing' : 'status-offline');
  $('sideStatus').textContent = label;
}

