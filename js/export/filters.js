(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./data.js') : root.ERPExport.Data);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ERPExport.Filters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  const periods = { all: 'Todos os períodos', today: 'Hoje', yesterday: 'Ontem', beforeYesterday: 'Anteontem', last7: 'Últimos 7 dias', last15: 'Últimos 15 dias', last30: 'Últimos 30 dias', last60: 'Últimos 60 dias', last90: 'Últimos 90 dias', week: 'Semana atual', previousWeek: 'Semana anterior', month: 'Mês atual', previousMonth: 'Mês anterior', quarter: 'Trimestre atual', previousQuarter: 'Trimestre anterior', semester: 'Semestre atual', previousSemester: 'Semestre anterior', year: 'Ano atual', previousYear: 'Ano anterior', custom: 'Intervalo personalizado' };
  const textOps = { all: 'Sem filtro', exact: 'Igual a', contains: 'Contém', starts: 'Começa com', ends: 'Termina com', notEqual: 'Diferente de', notContains: 'Não contém', list: 'Um dos valores (vírgula ou linha)', empty: 'Vazio', filled: 'Preenchido', duplicate: 'Duplicado na base', unique: 'Único na base' };
  const obsOps = { contains: 'Contém texto', notContains: 'Não contém texto', exact: 'Texto exato', starts: 'Começa com', ends: 'Termina com', empty: 'Vazias', filled: 'Preenchidas', anyWords: 'Qualquer palavra', allWords: 'Todas as palavras', noWords: 'Nenhuma palavra', phrases: 'Uma das expressões (uma por linha)' };
  const dateOps = { all: 'Sem condição adicional', exact: 'Exatamente em', before: 'Antes de', after: 'Depois de', onBefore: 'No dia ou antes', onAfter: 'No dia ou depois', between: 'Entre (inclusive)', outside: 'Fora do intervalo' };
  const qualityLabels = { duplicateID: 'ID duplicado', duplicateCNJ: 'Processo duplicado', invalidCNJ: 'CNJ inválido ou ausente', noObs: 'Sem observações', invalidDate: 'Data inválida ou ausente', futureDate: 'Data futura', referenceMismatch: 'Referência divergente da data', unknownType: 'Tipo desconhecido', statusIssue: 'Status conflitantes ou incompletos', missingEssential: 'Campo essencial ausente', clean: 'Sem ocorrências detectadas' };
  const statusOps = { all: 'Todos', sim: 'Sim', nao: 'Não', invalid: 'Ausente / inválido', notSim: 'Diferente de Sim (inclui inválidos)', notNao: 'Diferente de Não (inclui inválidos)' };
  const sortLabels = { source: 'Ordem original', date: 'Data', id: 'ID', cnj: 'Nº Processo', type: 'Tipo de encerramento', reference: 'Mês de referência', panjud: 'Encerrado no Panjud', recusado: 'Recusado no Panjud', hasObs: 'Presença de observações' };
  function defaults() { return { period: 'all', start: '', end: '', dateOp: 'all', dateA: '', dateB: '', day: '', weekdays: [], dayGroup: 'all', years: [], reference: [], referenceRelation: 'all', types: [], excludeTypes: [], panjud: 'all', recusado: 'all', statusIssue: 'all', idOp: 'all', idValue: '', cnjOp: 'all', cnjValue: '', cnjYear: '', cnjBranch: '', cnjCourt: '', cnjOrigin: '', obsGroups: [], ignoreAccents: true, quality: [], sort: 'source', direction: 'asc', sort2: 'source', direction2: 'asc', dashboard: null, statusMode: 'normalized', workReview: false }; }
  function monthStart(y, m) { const d = new Date(0); d.setUTCFullYear(y, m, 1); d.setUTCHours(0, 0, 0, 0); return d.getTime() / 86400000; }
  function range(f, today) {
    const t = D.date(today); if (!t) throw new Error('Data local inválida.');
    let a = t.ordinal, b = a;
    if (f.period === 'all') return null;
    if (f.period === 'custom') return [D.date(f.start)?.ordinal, D.date(f.end)?.ordinal];
    if (f.period === 'yesterday') a = b = a - 1;
    else if (f.period === 'beforeYesterday') a = b = a - 2;
    else if (/^last\d+$/.test(f.period)) a -= +f.period.slice(4) - 1;
    else if (['week', 'previousWeek'].includes(f.period)) { a -= (t.weekday + 6) % 7 + (f.period === 'previousWeek' ? 7 : 0); b = a + 6; }
    else if (!['today', 'yesterday', 'beforeYesterday'].includes(f.period)) {
      const unit = f.period.replace(/^previous/, '').toLowerCase();
      const n = { month: 1, quarter: 3, semester: 6, year: 12 }[unit];
      if (!n) throw new Error('Período desconhecido.');
      const m = Math.floor((t.month - 1) / n) * n - (f.period.startsWith('previous') ? n : 0);
      a = monthStart(t.y, m); b = monthStart(t.y, m + n) - 1;
    }
    return [a, b];
  }
  const noValueOps = new Set(['all', 'empty', 'filled', 'duplicate', 'unique', 'valid', 'invalid']);
  function validate(f) {
    const e = [];
    function interval(a, b, label) { if (!D.date(a) || !D.date(b)) e.push(`${label}: informe duas datas válidas.`); else if (D.date(a).ordinal > D.date(b).ordinal) e.push(`${label}: início posterior ao fim.`); }
    if (!periods[f.period]) e.push('Selecione um período válido.');
    if (f.period === 'custom') interval(f.start, f.end, 'Período');
    if (f.dateOp !== 'all') {
      if (['between', 'outside'].includes(f.dateOp)) interval(f.dateA, f.dateB, 'Condição de data');
      else if (!D.date(f.dateA)) e.push('Condição de data: informe uma data válida.');
    }
    if (f.day && (!/^\d{1,2}$/.test(f.day) || +f.day < 1 || +f.day > 31)) e.push('Dia do mês deve estar entre 1 e 31.');
    for (const prefix of ['id', 'cnj']) if (!noValueOps.has(f[prefix + 'Op'])) {
      const v = f[prefix + 'Value'];
      if (!String(v).trim() || (prefix === 'cnj' && !D.digits(v))) e.push(`${prefix === 'id' ? 'ID' : 'Processo'}: informe o valor da busca.`);
    }
    for (const [key, size] of [['cnjYear', 4], ['cnjBranch', 1], ['cnjCourt', 2], ['cnjOrigin', 4]]) if (f[key] && !new RegExp(`^\\d{${size}}$`).test(f[key])) e.push(`${key === 'cnjYear' ? 'Ano do processo' : key === 'cnjBranch' ? 'Ramo' : key === 'cnjCourt' ? 'Tribunal' : 'Origem'}: use ${size} dígito(s).`);
    f.obsGroups.forEach((g, i) => g.forEach(r => {
      if (!obsOps[r.op] || (!['empty', 'filled'].includes(r.op) && !String(r.value).trim())) e.push(`Observações, grupo ${i + 1}: complete a condição.`);
      else if (['anyWords', 'allWords', 'noWords'].includes(r.op) && !/[\p{L}\p{N}_]/u.test(String(r.value))) e.push(`Observações, grupo ${i + 1}: informe ao menos uma palavra.`);
    }));
    return e;
  }
  function compareText(value, op, query, normalize, duplicate) {
    const v = normalize(value), q = normalize(query);
    switch (op) {
      case 'all': return true; case 'empty': return !String(value ?? '').trim(); case 'filled': return Boolean(String(value ?? '').trim());
      case 'duplicate': return duplicate; case 'unique': return Boolean(v) && !duplicate;
      case 'exact': return v === q; case 'notEqual': return v !== q; case 'contains': return v.includes(q); case 'notContains': return !v.includes(q);
      case 'starts': return v.startsWith(q); case 'ends': return v.endsWith(q);
      case 'list': return Boolean(v) && String(query).split(/[,\n]+/).filter(s => s.trim()).map(normalize).filter(Boolean).includes(v);
      default: return false;
    }
  }
  function observation(value, rule, accents) {
    const norm = v => D.normalize(v, accents), v = norm(value), q = norm(rule.value);
    // Words are literal tokens; phrases remain literal substrings. No regular expressions from users.
    const words = q.match(/[\p{L}\p{N}_]+/gu) || [];
    const tokens = new Set(v.match(/[\p{L}\p{N}_]+/gu) || []);
    let hit;
    switch (rule.op) {
      case 'anyWords': hit = words.some(w => tokens.has(w)); break;
      case 'allWords': hit = words.length > 0 && words.every(w => tokens.has(w)); break;
      case 'noWords': hit = words.every(w => !tokens.has(w)); break;
      case 'phrases': hit = String(rule.value).split(/\r?\n/).filter(s => s.trim()).some(s => v.includes(norm(s))); break;
      default: hit = compareText(value, rule.op, rule.value, norm, false);
    }
    return rule.not ? !hit : hit;
  }
  function matchStatus(v, op) { return op === 'all' || (op === 'notSim' ? v !== 'sim' : op === 'notNao' ? v !== 'nao' : v === op); }
  function dashboardMatch(r, d) {
    // Import preserves the dashboard's legacy comparisons, including its reference fallback.
    let m = r.record.mesReferencia;
    const rawDate = r.record.data.split(/[T ]/)[0];
    m = !m || isNaN(parseInt(m)) ? (rawDate.includes('-') ? rawDate.split('-')[1] : '00') : String(parseInt(m)).padStart(2, '0');
    return (!d.month || m === d.month) && (!d.type || r.record.tipo === d.type) && (!d.panjud || r.record.panjud === d.panjud)
      && (!d.query || (typeof ERPCaseSearch !== 'undefined' ? ERPCaseSearch.matches(r.record,d.query) : [r.record.id,r.record.processo].some(v=>String(v||'').toLowerCase().includes(d.query.toLowerCase()))))
      && (!d.start || rawDate >= d.start) && (!d.end || rawDate <= d.end);
  }
  function run(snapshot, input) {
    const f = { ...defaults(), ...input }, errors = validate(f);
    if (errors.length) return { rows: [], errors, stats: D.stats([]) };
    const limits = range(f, snapshot.today), a = D.date(f.dateA)?.ordinal, b = D.date(f.dateB)?.ordinal;
    const groups = { weekdays: [1, 2, 3, 4, 5], saturday: [6], sunday: [0], weekend: [0, 6] };
    const rows = snapshot.rows.filter(r => {
      if (f.dashboard && !dashboardMatch(r, f.dashboard)) return false;
      if (limits && (!r.date || r.date.ordinal < limits[0] || r.date.ordinal > limits[1])) return false;
      if (f.dateOp !== 'all') {
        if (!r.date) return false; const n = r.date.ordinal;
        if (!({ exact: n === a, before: n < a, after: n > a, onBefore: n <= a, onAfter: n >= a, between: n >= a && n <= b, outside: n < a || n > b }[f.dateOp])) return false;
      }
      if (f.day && (!r.date || r.date.d !== +f.day)) return false;
      if (f.weekdays.length && (!r.date || !f.weekdays.map(Number).includes(r.date.weekday))) return false;
      if (f.dayGroup !== 'all' && (!r.date || !groups[f.dayGroup]?.includes(r.date.weekday))) return false;
      if (f.years.length && (!r.date || !f.years.map(Number).includes(r.date.y))) return false;
      if (f.reference.length && !f.reference.includes(r.reference)) return false;
      if (f.referenceRelation === 'invalid' && r.reference) return false;
      if (['same', 'different'].includes(f.referenceRelation) && (!r.date || !r.reference || ((+r.reference === r.date.month) !== (f.referenceRelation === 'same')))) return false;
      if (f.types.length && !f.types.includes(r.type)) return false;
      if (f.excludeTypes.includes(r.type)) return false;
      const pan = f.statusMode === 'literal' ? D.literalStatus(r.record.panjud) : r.panjud;
      const refused = f.statusMode === 'literal' ? D.literalStatus(r.record.recusado) : r.recusado;
      if (!matchStatus(pan, f.panjud) || !matchStatus(refused, f.recusado)) return false;
      if (f.workReview && !D.review(r).length) return false;
      if (f.statusIssue === 'conflict' && !(r.panjud === 'sim' && r.recusado === 'sim')) return false;
      if (f.statusIssue === 'incomplete' && !(r.panjud === 'invalid' || r.recusado === 'invalid')) return false;
      if (!compareText(r.record.id, f.idOp, f.idValue, D.idKey, r.duplicateID)) return false;
      if (f.cnjOp === 'unique' ? (!r.processKey || r.duplicateCNJ) : f.cnjOp === 'valid' ? !r.validCNJ : f.cnjOp === 'invalid' ? r.validCNJ : !compareText(r.record.processo, f.cnjOp, f.cnjValue, D.digits, r.duplicateCNJ)) return false;
      for (const [key, seg] of [['cnjYear', 'year'], ['cnjBranch', 'branch'], ['cnjCourt', 'court'], ['cnjOrigin', 'origin']]) if (f[key] && r.segments?.[seg] !== f[key]) return false;
      if (!f.obsGroups.every(g => g.length === 0 || g.some(rule => observation(r.record.observacoes, rule, f.ignoreAccents)))) return false;
      if (f.quality.length && !f.quality.some(q => q === 'clean' ? r.quality.length === 0 : r.quality.includes(q))) return false;
      return true;
    });
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
    const value = (r, key) => key === 'source' ? r.index : key === 'date' ? r.date?.ordinal ?? null : r[key];
    function compare(x, y, key, dir) {
      const av = value(x, key), bv = value(y, key);
      if (av == null || bv == null) return av == null ? (bv == null ? 0 : 1) : -1; // invalid dates always last
      const c = typeof av === 'number' || typeof av === 'boolean' ? Number(av) - Number(bv) : collator.compare(String(av), String(bv));
      return c * (dir === 'desc' ? -1 : 1);
    }
    rows.sort((x, y) => compare(x, y, f.sort, f.direction) || compare(x, y, f.sort2, f.direction2) || x.index - y.index);
    return { rows, errors: [], stats: D.stats(rows, f.statusMode) };
  }
  function shortcut(input, value) {
    const f = { ...input, panjud: 'all', recusado: 'all', statusIssue: 'all' };
    if (['confirmed', 'confirmedNotRefused'].includes(value)) f.panjud = 'sim';
    if (['unconfirmed', 'pending'].includes(value)) f.panjud = 'nao';
    if (value === 'refused') f.recusado = 'sim';
    if (['notRefused', 'confirmedNotRefused', 'pending'].includes(value)) f.recusado = 'nao';
    if (['conflict', 'incomplete'].includes(value)) f.statusIssue = value;
    return f;
  }
  function chips(f) {
    const out = [], add = (key, label, keys = [key]) => out.push({ key, label, keys });
    if (f.period !== 'all') add('period', `Período: ${periods[f.period]}${f.period === 'custom' ? ` (${D.formatDate(f.start)} a ${D.formatDate(f.end)})` : ''}`, ['period', 'start', 'end']);
    if (f.dateOp !== 'all') add('dateOp', `${dateOps[f.dateOp]} ${D.formatDate(f.dateA)}${['between', 'outside'].includes(f.dateOp) ? ' a ' + D.formatDate(f.dateB) : ''}`, ['dateOp', 'dateA', 'dateB']);
    if (f.day) add('day', `Dia do mês: ${f.day}`);
    if (f.dayGroup !== 'all') add('dayGroup', `Dias: ${{ weekdays: 'segunda a sexta', saturday: 'sábado', sunday: 'domingo', weekend: 'fim de semana' }[f.dayGroup]}`);
    if (f.weekdays.length) add('weekdays', `Dias da semana: ${f.weekdays.map(n => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][n]).join(' OU ')}`);
    for (const [key, label] of [['years', 'Ano da data'], ['reference', 'Mês de referência'], ['types', 'Tipo'], ['excludeTypes', 'EXCETO tipo']]) if (f[key].length) add(key, `${label}: ${f[key].map(v => v === '__invalid__' ? 'ausente/inválido' : v).join(' OU ')}`);
    if (f.referenceRelation !== 'all') add('referenceRelation', `Referência: ${{ same: 'igual ao mês da data', different: 'diferente do mês da data', invalid: 'ausente/inválida' }[f.referenceRelation]}`);
    for (const key of ['panjud', 'recusado']) if (f[key] !== 'all') add(key, `${key === 'panjud' ? 'Encerrado' : 'Recusado'}: ${statusOps[f[key]]}`);
    if (f.statusIssue !== 'all') add('statusIssue', `Status: ${f.statusIssue === 'conflict' ? 'ambos Sim' : 'ausente/inválido em ao menos um campo'}`);
    for (const prefix of ['id', 'cnj']) if (f[prefix + 'Op'] !== 'all') add(prefix + 'Op', `${prefix.toUpperCase()}: ${{ ...textOps, valid: 'Válido', invalid: 'Inválido' }[f[prefix + 'Op']]} ${noValueOps.has(f[prefix + 'Op']) ? '' : f[prefix + 'Value']}`, [prefix + 'Op', prefix + 'Value']);
    for (const [key, label] of [['cnjYear', 'Ano CNJ'], ['cnjBranch', 'Ramo'], ['cnjCourt', 'Tribunal'], ['cnjOrigin', 'Origem']]) if (f[key]) add(key, `${label}: ${f[key]}`);
    f.obsGroups.forEach((g, i) => { if (g.length) add(`obs:${i}`, `Obs. (${g.map(r => `${r.not ? 'NÃO ' : ''}${obsOps[r.op]}${['empty', 'filled'].includes(r.op) ? '' : ': ' + r.value}`).join(' OU ')})`); });
    if (f.obsGroups.length && !f.ignoreAccents) add('ignoreAccents', 'Busca: distingue acentos');
    if (f.statusMode === 'literal') add('statusMode', 'Status: valores exatos do cadastro (Sim / Não)');
    if (f.workReview) add('workReview', 'Conferência cadastral (observações opcionais)');
    if (f.quality.length) add('quality', `Qualidade: ${f.quality.map(q => qualityLabels[q]).join(' OU ')}`);
    if (f.dashboard) for (const [key, value] of Object.entries(f.dashboard)) if (value && key !== 'search') add('dashboard:' + key, `Dashboard · ${{ month: 'referência (com fallback original)', type: 'tipo', panjud: 'encerrado', query: 'busca em ID ou processo (múltiplos termos)', start: 'data inicial', end: 'data final' }[key]}: ${value}`);
    return out;
  }
  function remove(input, chip) {
    const f = structuredClone(input), def = defaults();
    if (chip.key.startsWith('obs:')) f.obsGroups.splice(+chip.key.slice(4), 1);
    else if (chip.key.startsWith('dashboard:')) { delete f.dashboard[chip.key.slice(10)]; if (Object.keys(f.dashboard).every(k => k === 'search')) f.dashboard = null; }
    else if (chip.key === 'ignoreAccents') f.ignoreAccents = true;
    else chip.keys.forEach(k => { f[k] = def[k]; });
    return f;
  }
  function periodLabel(f, today) { const r = range(f, today); return r ? `${D.formatDate(D.fromOrdinal(r[0]))} a ${D.formatDate(D.fromOrdinal(r[1]))}` : 'Todos os períodos'; }
  return Object.freeze({ defaults, periods, textOps, obsOps, dateOps, qualityLabels, statusOps, sortLabels, range, validate, run, shortcut, chips, remove, periodLabel, observation, compareText });
});
