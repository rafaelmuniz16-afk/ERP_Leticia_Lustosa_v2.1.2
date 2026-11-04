/* Aurora Analytical Engine 1: private modules, consumed by engine.js. */
(() => {
  'use strict';
  const A = window.__auroraAnalyticsParts = Object.create(null), DAY = 86400000;
  const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !s.startsWith('0000') && Number.isFinite(Date.parse(s + 'T12:00:00Z')) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;
  const shift = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
  const duration = p => Math.round((Date.parse(p.end) - Date.parse(p.start)) / DAY) + 1;
  const weekday = d => new Date(d + 'T12:00:00Z').getUTCDay();
  const monday = d => shift(d, -((weekday(d) + 6) % 7));
  const monthEnd = d => { const t = new Date(d.slice(0, 7) + '-01T12:00:00Z'); t.setUTCMonth(t.getUTCMonth() + 1); t.setUTCDate(0); return t.toISOString().slice(0, 10); };
  const previousMonth = d => shift(d.slice(0, 7) + '-01', -1).slice(0, 7);
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
  const copy = o => freeze(JSON.parse(JSON.stringify(o)));
  const hash = o => { const s = JSON.stringify(o); let a = 2166136261, b = 5381; for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ s.charCodeAt(i); } return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0'); };
  const types = ['onus', 'agreement', 'success', 'inactivation', 'other'], fields = ['registered', 'confirmed', 'refused', 'pending', 'uncertain', 'statusConflicts'];
  const empty = () => ({ ...Object.fromEntries(fields.map(k => [k, 0])), types: Object.fromEntries(types.map(k => [k, 0])) });
  const percent = (n, d) => d ? n / d * 100 : null;
  const delta = (n, p) => ({ absolute: n - p, percent: p ? (n - p) / p * 100 : null, reason: p ? null : 'zero_baseline' });
  function range(p, day) {
    if (!p || !date(p.start) || !date(p.end) || p.start > p.end || p.end > day) throw new TypeError('INVALID_RANGE');
    if (duration(p) > 3660) throw new TypeError('RANGE_TOO_LARGE');
    return { start: p.start, end: p.end };
  }
  function selection(input = {}, day) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('INVALID_SELECTION');
    const allowed = ['period','date','start','end','type','trendUnit','audience','includeFinancial','financialAuthorized'];
    if (Object.keys(input).some(k => !allowed.includes(k))) throw new TypeError('UNKNOWN_OPTION');
    const period = input.period ?? 'month', type = input.type ?? 'all', trendUnit = input.trendUnit ?? 'week', audience = input.audience ?? 'internal';
    if (!['day','week','month','last7','custom'].includes(period) || !['all', ...types].includes(type) || !['day','week','month'].includes(trendUnit) || !['internal','observa','reports','work-center','financial'].includes(audience)) throw new TypeError('INVALID_SELECTION');
    for (const k of ['includeFinancial','financialAuthorized']) if (input[k] !== undefined && typeof input[k] !== 'boolean') throw new TypeError('INVALID_BOOLEAN');
    let start, end;
    if (period === 'custom') { if (input.date !== undefined) throw new TypeError('CONFLICTING_RANGE'); start = input.start; end = input.end; }
    else {
      if (input.start !== undefined || input.end !== undefined) throw new TypeError('CONFLICTING_RANGE');
      const anchor = input.date ?? (period === 'last7' ? shift(day, -1) : day);
      if (!date(anchor) || anchor > day) throw new TypeError('INVALID_DATE');
      start = end = anchor;
      if (period === 'week') { start = monday(anchor); end = shift(start, 6); }
      if (period === 'month') { start = anchor.slice(0, 7) + '-01'; end = monthEnd(anchor); }
      if (period === 'last7') start = shift(anchor, -6);
      if (end > day) end = day;
    }
    range({ start, end }, day);
    return { period, start, end, type, trendUnit, audience, partial: end === day, basis: 'closure_date', includeFinancial: input.includeFinancial === true, financialAuthorized: input.financialAuthorized === true };
  }
  const limitations = ['loaded_records_only','current_record_status_not_status_history','closure_date_not_creation_time','absence_of_records_not_absence_of_work','causes_not_available','no_judicial_status_inference','association_not_causation','no_historical_goal_versions'];
  A.S = { DAY, date, shift, duration, weekday, monday, monthEnd, previousMonth, today, freeze, copy, hash, types, fields, empty, percent, delta, range, selection, limitations };
})();
