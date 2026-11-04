(() => {
  'use strict';
  const A = window.__auroraAnalyticsParts, S = A.S;
  function index(snapshot, type) {
    const days = snapshot.days, keys = [...S.fields, ...S.types, 'activeDays'], sums = Object.fromEntries(keys.map(k => [k, [0]]));
    for (const day of days) {
      const c = type === 'all' ? day.counts : day.byType[type] || S.empty();
      for (const k of keys) sums[k].push(sums[k].at(-1) + (k === 'activeDays' ? Number(c.registered > 0) : S.types.includes(k) ? c.types[k] : c[k]));
    }
    const lower = (value, inclusive) => { let lo = 0, hi = days.length; while (lo < hi) { const mid = (lo + hi) >>> 1; if (days[mid].date < value || inclusive && days[mid].date === value) lo = mid + 1; else hi = mid; } return lo; };
    return p => {
      const lo = lower(p.start, false), hi = lower(p.end, true), v = k => sums[k][hi] - sums[k][lo], c = S.empty();
      S.fields.forEach(k => c[k] = v(k)); S.types.forEach(k => c.types[k] = v(k));
      return { ...c, days: S.duration(p), activeDays: v('activeDays'), dailyAverage: c.registered / S.duration(p), notConfirmed: c.registered - c.confirmed,
        confirmationPercent: S.percent(c.confirmed, c.registered), refusalPercent: S.percent(c.refused, c.registered), pendingPercent: S.percent(c.pending, c.registered),
        typePercent: Object.fromEntries(S.types.map(k => [k, S.percent(c.types[k], c.registered)])) };
    };
  }
  function quality(snapshot, count) {
    const flags = Object.keys(snapshot.quality).filter(k => !['missingUid','referenceDiffers'].includes(k) && snapshot.quality[k]);
    return { status: count < 5 ? 'insufficient_sample' : flags.length ? 'limited' : 'sufficient', flags, scope: 'available_source', sample: count };
  }
  function distribution(snapshot, p) {
    const out = Object.fromEntries(S.types.map(k => [k, S.empty()]));
    for (const day of snapshot.days) if (day.date >= p.start && day.date <= p.end) for (const type of S.types) {
      if (p.type !== 'all' && p.type !== type) continue;
      const c = day.byType[type]; if (c) { S.fields.forEach(k => out[type][k] += c[k]); S.types.forEach(k => out[type].types[k] += c.types[k]); }
    }
    const total = Object.values(out).reduce((n, c) => n + c.refused, 0);
    return Object.fromEntries(S.types.map(t => [t, { ...out[t], refusalPercent: S.percent(out[t].refused, out[t].registered), shareOfRefusals: S.percent(out[t].refused, total) }]));
  }
  function series(idx, p) { const start = S.duration(p) > 366 ? S.shift(p.end, -365) : p.start, points = []; for (let d = start; d <= p.end; d = S.shift(d, 1)) points.push({ date: d, ...idx({ start: d, end: d }) }); return { points, truncated: start !== p.start, fullTotalsPreserved: true }; }
  function goal(snapshot, p) {
    const g = snapshot.goal;
    if (p.type !== 'all' || p.end !== snapshot.today || p.start.slice(0, 7) !== snapshot.today.slice(0, 7) || !g?.value) return { status: 'not_applicable', reason: 'current_confirmed_goal_only' };
    let weekdays = 0; const end = S.monthEnd(snapshot.today);
    for (let d = snapshot.today; d <= end; d = S.shift(d, 1)) if (![0,6].includes(S.weekday(d))) weekdays++;
    const confirmed = g.referenceTotals.confirmed, remaining = Math.max(0, g.value - confirmed);
    return { status: 'available', period: g.period, basis: g.basis, target: g.value, confirmed, percent: confirmed / g.value * 100, remaining,
      remainingWeekdays: weekdays, requiredPerWeekday: weekdays ? Math.ceil(remaining / weekdays) : null, officialDecision: false,
      limitations: ['whole_reference_month_in_available_records','strict_memory_status_may_differ_from_legacy','weekdays_include_today_no_holidays','not_prediction'] };
  }
  function financial(snapshot, p) {
    if (!p.includeFinancial || !p.financialAuthorized) return { status: 'excluded' };
    if (p.type !== 'all' || p.period !== 'month' || p.end !== snapshot.today || p.start !== snapshot.today.slice(0,7) + '-01') return { status: 'not_applicable', reason: 'official_current_month_only' };
    try {
      if (typeof calculate !== 'function' || typeof calcFinancial !== 'function') return { status: 'unavailable', reason: 'official_functions_missing' };
      const c = calculate(snapshot.today.slice(5,7));
      if (!snapshot.goal.value || c.meta !== snapshot.goal.value) return { status: 'unavailable', reason: 'goal_not_confirmed' };
      const raw = calcFinancial(c), values = {};
      for (const k of ['percent','onus','acordo','exito','inativacao','total','idealTotal']) { if (!Number.isFinite(k==='inativacao'&&raw[k]===undefined?0:raw[k])) return { status: 'unavailable', reason: 'invalid_official_values' }; values[k] = k==='inativacao'&&raw[k]===undefined?0:raw[k]; }
      if (!Number.isFinite(c.reais)) return { status: 'unavailable', reason: 'invalid_official_values' };
      return { status: 'available', values, officialConfirmed: c.reais, officialGoal: c.meta, month: snapshot.today.slice(5,7), basis: 'official_reference_month_all_loaded_years', provenance: 'calculate_then_calcFinancial', guaranteedPayment: false, limitations: ['legacy_all_loaded_years_scope','legacy_status_and_duplicates_may_differ','calculated_bonus_not_guaranteed_payment'] };
    } catch (_) { return { status: 'unavailable', reason: 'official_calculation_failed' }; }
  }
  A.M = { index, quality, distribution, series, goal, financial };
})();
