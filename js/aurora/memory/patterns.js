(() => {
  'use strict';
  const M = window.__auroraMemoryParts, { S, H } = M;
  const kinds = ['production-above', 'production-below', 'confirmation-gap', 'recurring-refusals', 'type-shift', 'daily-record', 'monthly-goal', 'weekday-streak'];
  const category = { 'production-above': 'production', 'production-below': 'production', 'confirmation-gap': 'panjud', 'recurring-refusals': 'refusal', 'type-shift': 'distribution', 'daily-record': 'record', 'monthly-goal': 'goal', 'weekday-streak': 'consistency' };
  function spec(input) {
    if (!input || !kinds.includes(input.kind) || S.date(input.start) !== input.start || S.date(input.end) !== input.end || input.start > input.end) return null;
    if ((Date.parse(input.end) - Date.parse(input.start)) / S.DAY > 366) return null;
    const s = { kind: input.kind, start: input.start, end: input.end };
    if (['production-above', 'production-below', 'recurring-refusals', 'type-shift'].includes(s.kind)) {
      if (S.date(input.baselineStart) !== input.baselineStart || S.date(input.baselineEnd) !== input.baselineEnd || input.baselineStart > input.baselineEnd || input.baselineEnd >= input.start) return null;
      s.baselineStart = input.baselineStart; s.baselineEnd = input.baselineEnd;
      const n = (Date.parse(s.end) - Date.parse(s.start)) / S.DAY + 1;
      const prior = (Date.parse(s.baselineEnd) - Date.parse(s.baselineStart)) / S.DAY + 1;
      if (n !== 7 || prior !== (s.kind.startsWith('production-') ? 21 : 7)) return null;
    }
    if (s.kind === 'type-shift') { if (!['onus', 'agreement', 'success', 'inactivation'].includes(input.type)) return null; s.type = input.type; }
    if (s.kind === 'monthly-goal') { if (!Number.isFinite(input.goal) || input.goal <= 0 || input.goal > 1e9) return null; s.goal = input.goal; }
    if (['confirmation-gap', 'monthly-goal'].includes(s.kind) && (s.start.slice(0, 7) !== s.end.slice(0, 7) || !s.start.endsWith('-01'))) return null;
    return s;
  }
  function evaluate(input, h) {
    const s = spec(input); if (!s || s.end > h.today) return null;
    const c = H.range(h, s.start, s.end, ['confirmation-gap', 'monthly-goal'].includes(s.kind) ? 'reference' : 'closure');
    const p = s.baselineStart ? H.range(h, s.baselineStart, s.baselineEnd) : null;
    let met = false, score = 0, rule = '', evidence = { registered: c.registered, confirmed: c.confirmed, refused: c.refused };
    if (s.kind.startsWith('production-')) {
      if (s.end >= h.today || !h.firstDate || h.firstDate > s.baselineStart || p.registered < 15) return null;
      const average = p.registered / 3, delta = (c.registered / average - 1) * 100;
      met = s.kind === 'production-above' ? delta >= 25 : delta <= -25;
      score = delta; Object.assign(evidence, { baselineTotal: p.registered, baselineWeeks: 3, weeklyAverage: average, deltaPercent: delta });
      rule = 'Três semanas completas anteriores, ao menos 15 registros; janela fechada de sete dias; variação de pelo menos 25%. Não mede presença ou eficiência.';
    } else if (s.kind === 'confirmation-gap') {
      score = c.registered ? (c.registered - c.confirmed) / c.registered * 100 : 0;
      met = c.registered >= 10 && score >= 30;
      Object.assign(evidence, { gap: c.registered - c.confirmed, gapPercent: score, refusedIncludedInGap: true });
      rule = 'Ao menos 10 registros por ano e mês de referência; diferença para confirmações válidas de pelo menos 30%. Não indica movimentação judicial.';
    } else if (s.kind === 'recurring-refusals') {
      met = s.end < h.today && c.registered >= 10 && p.registered >= 10 && c.refused >= 3 && p.refused >= 3;
      score = c.registered ? c.refused / c.registered * 100 : 0;
      Object.assign(evidence, { priorRegistered: p.registered, priorRefused: p.refused, ratePercent: score });
      rule = 'Duas janelas consecutivas fechadas de sete dias, cada uma com pelo menos 10 registros e 3 recusas. Causas não disponíveis.';
    } else if (s.kind === 'type-shift') {
      if (s.end >= h.today || c.registered < 20 || p.registered < 20) return null;
      score = (c.types[s.type] / c.registered - p.types[s.type] / p.registered) * 100; met = Math.abs(score) >= 20;
      Object.assign(evidence, { type: s.type, count: c.types[s.type], priorCount: p.types[s.type], priorRegistered: p.registered, percentagePoints: score });
      rule = 'Duas janelas consecutivas fechadas de sete dias, ao menos 20 registros em cada; diferença absoluta de 20 pontos percentuais na participação do tipo.';
    } else if (s.kind === 'daily-record') {
      let previous = 0;
      for (const d of h.orderedDays) if (d < s.start) previous = Math.max(previous, h.days[d].registered);
      met = s.start === s.end && previous > 0 && c.registered > previous; score = c.registered;
      evidence.previousBest = previous; rule = 'Total da data supera todos os dias anteriores disponíveis. Se a data é hoje, o total é parcial.';
    } else if (s.kind === 'monthly-goal') {
      if (s.start.slice(0, 7) === h.goal.period && s.goal !== h.goal.value) return null;
      met = c.confirmed >= s.goal; score = c.confirmed; evidence.goal = s.goal;
      rule = 'Confirmações válidas por ano e mês de referência atingem a configuração confirmada observada. A meta histórica é apenas a configuração testemunhada, sem presumir versões anteriores.';
    } else if (s.kind === 'weekday-streak') {
      let n = 0, cursor = s.end;
      // The descriptor ends on the last productive weekday, never on an incomplete empty day.
      while (h.days[cursor] && ![0, 6].includes(S.weekday(cursor))) { n++; do { cursor = S.shift(cursor, -1); } while ([0, 6].includes(S.weekday(cursor))); }
      met = n >= 5; score = n; evidence.weekdays = n; rule = 'Cinco ou mais dias de segunda a sexta consecutivos com registros; não considera feriados nem presume jornada.';
    }
    if (!met) return null;
    const periodKey = ['confirmation-gap', 'monthly-goal'].includes(s.kind) ? s.start.slice(0, 7) : s.start + ':' + s.end;
    return { id: 'p1-' + S.hash([s.kind, periodKey, s.type || '', s.goal || 0]), family: s.kind + (s.type ? ':' + s.type : ''), kind: s.kind, category: category[s.kind], period: { start: s.start, end: s.end }, spec: s, evidence, score, rule, reliability: 'derived_pattern', partial: s.end === h.today, relevance: ['daily-record', 'monthly-goal'].includes(s.kind) ? 90 : 60 };
  }
  function detect(h) {
    const end = S.shift(S.monday(h.today), -1), start = S.shift(end, -6), prev = S.shift(start, -1);
    const specs = ['production-above', 'production-below'].map(kind => ({ kind, start, end, baselineStart: S.shift(start, -21), baselineEnd: prev }));
    specs.push({ kind: 'recurring-refusals', start, end, baselineStart: S.shift(start, -7), baselineEnd: prev });
    for (const type of ['onus', 'agreement', 'success', 'inactivation']) specs.push({ kind: 'type-shift', type, start, end, baselineStart: S.shift(start, -7), baselineEnd: prev });
    const month = { start: h.today.slice(0, 7) + '-01', end: h.today };
    specs.push({ kind: 'confirmation-gap', ...month }, { kind: 'daily-record', start: h.today, end: h.today });
    if (h.goal.value) specs.push({ kind: 'monthly-goal', ...month, goal: h.goal.value });
    if (h.records.currentWeekdayStreak >= 5) {
      const productive = h.orderedDays.filter(d => ![0, 6].includes(S.weekday(d)));
      const last = productive.at(-1), first = productive.at(-h.records.currentWeekdayStreak);
      if (last && first) specs.push({ kind: 'weekday-streak', start: first, end: last });
    }
    return specs.map(s => evaluate(s, h)).filter(Boolean).map(p => {
      let consecutivePeriods = 1;
      if (p.spec.baselineStart) {
        for (let i = 1; i <= 3; i++) {
          const earlier = { ...p.spec };
          for (const k of ['start', 'end', 'baselineStart', 'baselineEnd']) earlier[k] = S.shift(p.spec[k], -7 * i);
          if (!evaluate(earlier, h)) break;
          consecutivePeriods++;
        }
      }
      return { ...p, consecutivePeriods, persistent: consecutivePeriods >= 2, persistenceBasis: p.spec.baselineStart ? 'consecutive_closed_weeks' : 'observed_days_in_episode' };
    });
  }
  M.P = { spec, evaluate, detect, kinds };
})();
