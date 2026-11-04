function fillMonths() {
  const fm = $('filterMonth'), fr = $('mesReferenciaForm');
  fm.innerHTML = MONTHS.map(([v,n]) => '<option value="' + v + '">' + n + '</option>').join('');
  fr.innerHTML = MONTHS.map(([v,n]) => '<option value="' + v + '">' + n + '</option>').join('');
  const now = getTodayLocal().split('-')[1];
  const last = localStorage.getItem(LAST_MONTH_KEY) || now;
  const chosen = MONTHS.some(x => x[0] === last) ? last : '06';
  fm.value = chosen;
  fr.value = chosen;
  updateMetaInput();
}

function getSelectedMonth() { return $('filterMonth').value; }
function updateMetaInput() { $('metaInput').value = parseNum(metas[getSelectedMonth()]); }

function getFiltered() {
  const month = getSelectedMonth();
  let rows = bd.filter(d => getMesCorreto(d) === month);
  const tipo = $('filterTipo').value, pan = $('filterEncerrado').value, q = $('searchInput').value.trim(), dStart = $('dateStart').value, dEnd = $('dateEnd').value;
  if(tipo !== 'Todos') rows = rows.filter(d => d.tipo === tipo);
  if(pan !== 'Todos') rows = rows.filter(d => d.panjud === pan);
  if(q) rows = rows.filter(d => ERPCaseSearch.matches(d,q));
  if(dStart) rows = rows.filter(d => normalizeDate(d.data) >= dStart);
  if(dEnd) rows = rows.filter(d => normalizeDate(d.data) <= dEnd);
  return rows;
}

// js/core/calculations.js

function calculate(mesOverride = null) {
  const month = (typeof mesOverride === 'string' && mesOverride) ? mesOverride.padStart(2, '0') : getSelectedMonth();
  const meta = parseNum(metas[month]);
  const rows = bd.filter(d => (typeof getMesCorreto === 'function' ? getMesCorreto(d) : d.mesReferencia) === month);

  return calculateRows(rows, meta, month);
}

// Mesmo cálculo, com entrada explícita para consultas somente leitura.
function calculateRows(rows, meta, month) {
  const total = rows.length;
  const onus = rows.filter(d => d.tipo === 'Ônus').length;
  const acordo = rows.filter(d => d.tipo === 'Acordo').length;
  const exito = rows.filter(d => d.tipo === 'Êxito').length;
  const inativacao = rows.filter(d => d.tipo === 'Inativação').length;
  const recusados = rows.filter(d => d.recusado === 'Sim').length;
  const reais = rows.filter(d => d.panjud === 'Sim').length;
  const totais = total - recusados;
  const faltaReais = meta - reais;
  const faltaQuant = meta - total;

  // Monta a distribuição por dia para o gráfico de linhas (linhaChart)
  const perDay = {};
  rows.forEach(d => {
    const rawData = (typeof normalizeDate === 'function') ? normalizeDate(d.data) : d.data;
    if (rawData) {
      const partes = String(rawData).split('-');
      const diaNum = partes.length === 3 ? parseInt(partes[2], 10) : parseInt(rawData, 10);
      if (!isNaN(diaNum)) {
        perDay[diaNum] = (perDay[diaNum] ? perDay[diaNum] : 0) + 1;
      }
    }
  });

  return {
    month,
    meta,
    quant: total,
    totais,
    reais,
    recusados,
    onus,
    acordo,
    exito,
    inativacao,
    faltaReais,
    faltaQuant,
    rows,
    perDay
  };
}

function dailyTarget(falta, month) {
  if(falta <= 0) return 'Meta batida! 🏆';
  const now = new Date();
  now.setHours(0,0,0,0);
  const year = now.getFullYear(), idx = parseInt(month, 10) - 1;
  let start = new Date(year, idx, 1), end = new Date(year, idx + 1, 0);
  if(idx < now.getMonth()) return 'Mês encerrado';
  if(idx === now.getMonth()) start = new Date(now);
  let days = 0;
  for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if(day !== 0 && day !== 6) days++;
  }
  if(!days) return 'Sem dias úteis';
  return Math.max(0, Math.ceil(falta / days)) + ' casos/dia';
}

function calcFinancial(c) {
  const p = c.meta > 0 ? c.reais / c.meta : 0;
  let r = {onus: 0, acordo: 0, exito: 0, inativacao: 0};
  if(p >= 1) {
    r = {onus: c.onus * 4, acordo: c.acordo * 3, exito: c.exito * 2, inativacao: (c.inativacao || 0) * 1};
  } else if(p >= .9) {
    r = {onus: c.onus * 2.2, acordo: c.acordo * 1.7, exito: c.exito * 1.2, inativacao: (c.inativacao || 0) * .6};
  } else if(p >= .8) {
    r = {onus: c.onus * 1.1, acordo: c.acordo * .85, exito: c.exito * .6, inativacao: (c.inativacao || 0) * .5};
  }
  return {percent: p, ...r, total: r.onus + r.acordo + r.exito + r.inativacao, idealOnus: c.onus * 4, idealAcordo: c.acordo * 3, idealExito: c.exito * 2, idealInativacao: (c.inativacao || 0) * 1, idealTotal: c.onus * 4 + c.acordo * 3 + c.exito * 2 + (c.inativacao || 0) * 1};
}

