(() => {
  'use strict';
  const A = window.__auroraAnalyticsParts, S = A.S;
  const fullMonth = p => p.start.endsWith('-01') && S.monthEnd(p.start) === p.end;
  function compare(idx, current, previous, snapshot) {
    const c = S.range(current, snapshot.today), p = S.range(previous, snapshot.today);
    const result = { status: 'not_applicable', current: c, previous: p, basis: 'closure_date', currentMetrics: idx(c), previousMetrics: idx(p), limitations: ['current_status_for_both_periods','loaded_history_coverage_only'] };
    result.quality = A.M.quality(snapshot, Math.min(result.currentMetrics.registered, result.previousMetrics.registered));
    if (c.end === snapshot.today || p.end === snapshot.today) return { ...result, reason: 'incomplete_day' };
    if (!(p.end < c.start || c.end < p.start)) return { ...result, reason: 'overlapping_periods' };
    const normalized = S.duration(c) !== S.duration(p) && fullMonth(c) && fullMonth(p);
    if (S.duration(c) !== S.duration(p) && !normalized) return { ...result, reason: 'unequal_duration' };
    if (!snapshot.firstDate || snapshot.firstDate > (c.start < p.start ? c.start : p.start)) return { ...result, reason: 'insufficient_history_coverage' };
    const cm = result.currentMetrics, pm = result.previousMetrics, unit = normalized ? 'per_calendar_day' : 'count';
    const changes = Object.fromEntries(S.fields.map(k => [k, S.delta(cm[k] / (normalized ? cm.days : 1), pm[k] / (normalized ? pm.days : 1))]));
    changes.dailyAverage = S.delta(cm.dailyAverage, pm.dailyAverage);
    const points = (a, b) => a === null || b === null ? null : a - b;
    const percentagePoints = { confirmation: points(cm.confirmationPercent, pm.confirmationPercent), refusal: points(cm.refusalPercent, pm.refusalPercent), types: Object.fromEntries(S.types.map(t => [t, points(cm.typePercent[t], pm.typePercent[t])])) };
    return { ...result, status: Math.min(cm.registered, pm.registered) >= 5 ? 'comparable' : 'insufficient_sample', reason: Math.min(cm.registered, pm.registered) >= 5 ? null : 'minimum_five_each', normalized, unit, changes, percentagePoints };
  }
  function automatic(idx, p, snapshot) {
    let current = { start: p.start, end: p.end }, previous;
    if (p.partial) {
      if (p.period === 'day') return { status: 'not_applicable', reason: 'incomplete_day', current };
      current.end = S.shift(current.end, -1);
      if (current.start > current.end) return { status: 'not_applicable', reason: 'no_completed_days', current: null };
    }
    if (p.period === 'week') previous = { start: S.shift(current.start, -7), end: S.shift(current.end, -7) };
    else if (p.period === 'month') {
      const start = S.previousMonth(current.start) + '-01', end = S.monthEnd(start);
      if (fullMonth(current)) previous = { start, end };
      else { const n = Math.min(S.duration(current), S.duration({start,end})); current.end = S.shift(current.start, n - 1); previous = { start, end: S.shift(start, n - 1) }; }
    } else previous = { start: S.shift(current.start, -S.duration(current)), end: S.shift(current.start, -1) };
    return { ...compare(idx, current, previous, snapshot), currentDayExcluded: p.partial };
  }
  function dailyReference(idx, p, snapshot) {
    if (p.period !== 'day') return { status: 'not_applicable' };
    const windows = [];
    for (let i = 1; i <= 8; i++) { const d = S.shift(p.start, -7 * i); if (snapshot.firstDate && d >= snapshot.firstDate) windows.push({ date: d, registered: idx({start:d,end:d}).registered }); }
    const total = windows.reduce((n, w) => n + w.registered, 0), sufficient = windows.length >= 4 && total >= 20;
    return { status: sufficient ? 'sufficient' : 'insufficient_sample', method: 'previous_same_weekday_up_to_eight', windows, average: windows.length ? total / windows.length : null, currentComparable: sufficient && !p.partial, reason: p.partial ? 'incomplete_day' : null };
  }
  function records(idx, p, snapshot) {
    if (!['day','week','month'].includes(p.period)) return { status: 'not_applicable', reason: 'calendar_period_required' };
    const n = S.duration(p), complete = p.period === 'month' && fullMonth(p), starts = new Set();
    for (const d of snapshot.days) if (d.date < p.start) starts.add(p.period === 'day' ? d.date : p.period === 'week' ? S.monday(d.date) : d.date.slice(0,7) + '-01');
    const current = idx(p), keys = ['registered', ...S.types], best = {};
    for (const start of starts) {
      let end = S.shift(start, n - 1);
      if (p.period === 'month') { if (complete) end = S.monthEnd(start); else if (end > S.monthEnd(start)) continue; }
      if (end >= p.start || start < snapshot.firstDate) continue;
      const c = idx({start,end}), days = S.duration({start,end});
      for (const k of keys) { const total = k === 'registered' ? c.registered : c.types[k], value = complete ? total / days : total; if (!best[k] || value > best[k].value) best[k] = { period: {start,end}, total, value }; }
    }
    return { status: Object.keys(best).length ? 'available' : 'insufficient_history', basis: 'loaded_history_only', partialCurrent: p.partial, unit: complete ? 'per_calendar_day' : 'count',
      values: Object.fromEntries(keys.map(k => { const total = k === 'registered' ? current.registered : current.types[k], value = complete ? total / n : total, b = best[k]; return [k, { current: total, currentValue: value, best: b || null, distance: b ? Math.max(0, b.value - value) : null, ratioPercent: b?.value ? value / b.value * 100 : null, exceeded: !!b && value > b.value, near: !!b && value >= b.value * .9 && value <= b.value }]; })) };
  }
  A.C = { compare, automatic, dailyReference, records };
})();
