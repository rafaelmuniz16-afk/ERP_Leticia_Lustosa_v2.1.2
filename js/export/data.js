/* Projeções somente leitura. Não acessa armazenamento, rede ou regras financeiras. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.ERPExport ||= {}).Data = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fields = ['id', 'processo', 'tipo', 'data', 'panjud', 'recusado', 'observacoes'];
  const headers = ['ID', 'Nº Processo', 'Tipo de encerramento', 'Data', 'Encerrado no Panjud', 'Recusados no Panjud', 'Observações'];
  const knownTypes = ['Ônus', 'Acordo', 'Êxito', 'Inativação'];
  const text = v => v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const normalize = (v, accents = true) => {
    const s = text(v).trim().toLocaleLowerCase('pt-BR');
    return accents ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
  };
  const idKey = v => normalize(v).replace(/\s+/g, ' ');
  const digits = v => text(v).replace(/\D/g, '');
  const status = v => ['sim', 'nao'].includes(normalize(v)) ? normalize(v) : 'invalid';
  const dayMS = 86400000;
  function date(value) {
    const s = text(value).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ]\d{2}:\d{2})/.exec(s);
    if (!m) { const b = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); if (b) m = [b[0], b[3], b[2], b[1]]; }
    if (!m) return null;
    const y = +m[1], month = +m[2], d = +m[3];
    const dt = new Date(0); dt.setUTCFullYear(y, month - 1, d); dt.setUTCHours(0, 0, 0, 0);
    if (y < 1 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== d) return null;
    return { iso: `${m[1]}-${m[2]}-${m[3]}`, y, month, d, weekday: dt.getUTCDay(), ordinal: dt.getTime() / dayMS };
  }
  function fromOrdinal(n) { return new Date(n * dayMS).toISOString().slice(0, 10); }
  function formatDate(v) { const d = date(v); return d ? `${String(d.d).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${String(d.y).padStart(4, '0')}` : text(v); }
  function reference(v) { const s = text(v).trim(); return /^\d{1,2}$/.test(s) && +s >= 1 && +s <= 12 ? String(+s).padStart(2, '0') : ''; }
  function snapshot(source, today, validateCNJ) {
    if (typeof validateCNJ !== 'function') throw new Error('Validador CNJ do ERP indisponível. Recarregue a página.');
    const td = date(today); if (!td) throw new Error('Data local do ERP indisponível.');
    const ids = new Map(), processes = new Map();
    const rows = (Array.isArray(source) ? source : []).map((item, index) => {
      const r = item || {}, record = {};
      [...fields, 'mesReferencia'].forEach(k => { record[k] = text(r[k]); });
      const id = idKey(r.id), cnj = digits(r.processo), rawProcess = text(r.processo);
      const structure = /^[\d.\-\s]+$/.test(rawProcess) && cnj.length === 20;
      const validCNJ = structure && validateCNJ(rawProcess);
      if (id) ids.set(id, (ids.get(id) || 0) + 1);
      // Non-numeric legacy values are also comparable, without grouping every invalid value together.
      const processKey = /^[\d.\-\s]+$/.test(rawProcess) ? cnj : normalize(rawProcess);
      if (processKey) processes.set(processKey, (processes.get(processKey) || 0) + 1);
      return { index, record: Object.freeze(record), date: date(r.data), reference: reference(r.mesReferencia),
        id, cnj, processKey, validCNJ, segments: validCNJ ? { year: cnj.slice(9, 13), branch: cnj.slice(13, 14), court: cnj.slice(14, 16), origin: cnj.slice(16) } : null,
        type: typeof r.tipo === 'string' && r.tipo.trim() ? r.tipo.trim() : '__invalid__',
        panjud: status(r.panjud), recusado: status(r.recusado), hasObs: Boolean(text(r.observacoes).trim()) };
    });
    rows.forEach(r => {
      r.duplicateID = Boolean(r.id && ids.get(r.id) > 1);
      r.duplicateCNJ = Boolean(r.processKey && processes.get(r.processKey) > 1);
      const quality = [];
      if (r.duplicateID) quality.push('duplicateID');
      if (r.duplicateCNJ) quality.push('duplicateCNJ');
      if (!r.validCNJ) quality.push('invalidCNJ');
      if (!r.hasObs) quality.push('noObs');
      if (!r.date) quality.push('invalidDate');
      if (r.date && r.date.ordinal > td.ordinal) quality.push('futureDate');
      if (r.date && r.reference && +r.reference !== r.date.month) quality.push('referenceMismatch');
      if (!knownTypes.includes(r.type)) quality.push('unknownType');
      if (r.panjud === 'invalid' || r.recusado === 'invalid' || (r.panjud === 'sim' && r.recusado === 'sim')) quality.push('statusIssue');
      if (['id', 'processo', 'tipo', 'data', 'panjud', 'recusado', 'mesReferencia'].some(k => !r.record[k].trim())) quality.push('missingEssential');
      r.quality = Object.freeze(quality); Object.freeze(r);
    });
    return Object.freeze({ rows: Object.freeze(rows), today: td.iso, capturedAt: new Date().toISOString() });
  }
  // Read-only checks shared by the work query and export.
  const reviewLabels = Object.freeze({ duplicateID:'Possível duplicidade de ID na base disponível', duplicateCNJ:'Possível duplicidade de processo na base disponível', invalidCNJ:'CNJ ausente ou reprovado pelo validador do ERP', invalidDate:'Data ausente ou inválida', futureDate:'Data posterior ao dia atual do ERP', referenceMismatch:'Mês de referência diferente do mês da data', invalidReference:'Referência ausente ou fora de 01 a 12', unknownType:'Tipo fora das opções do cadastro', statusConflict:'Panjud e Recusado estão simultaneamente como Sim', invalidStatus:'Status ausente ou fora dos valores exatos Sim / Não', missingEssential:'Campo essencial ausente' });
  const literalStatus = v => v === 'Sim' ? 'sim' : v === 'Não' ? 'nao' : 'invalid';
  function review(row) {
    const keys = row.quality.filter(k => !['noObs','statusIssue','unknownType'].includes(k));
    if (!row.reference) keys.push('invalidReference');
    if (!knownTypes.includes(row.record.tipo)) keys.push('unknownType');
    if (row.panjud === 'sim' && row.recusado === 'sim') keys.push('statusConflict');
    if (literalStatus(row.record.panjud) === 'invalid' || literalStatus(row.record.recusado) === 'invalid') keys.push('invalidStatus');
    return keys;
  }
  function stats(rows, statusMode = 'normalized') {
    const types = new Map(); let confirmed = 0, refused = 0, min = '', max = '', invalidDates = 0;
    rows.forEach(r => {
      const type = r.record.tipo || '(sem tipo)'; types.set(type, (types.get(type) || 0) + 1);
      if ((statusMode === 'literal' ? literalStatus(r.record.panjud) : r.panjud) === 'sim') confirmed++;
      if ((statusMode === 'literal' ? literalStatus(r.record.recusado) : r.recusado) === 'sim') refused++;
      if (r.date) { if (!min || r.date.iso < min) min = r.date.iso; if (!max || r.date.iso > max) max = r.date.iso; } else invalidDates++;
    });
    return { total: rows.length, types: Array.from(types), confirmed, refused, min, max, invalidDates };
  }
  return Object.freeze({ fields, headers, knownTypes, text, normalize, idKey, digits, status, date, fromOrdinal, formatDate, reference, snapshot, stats, review, reviewLabels, literalStatus });
});
