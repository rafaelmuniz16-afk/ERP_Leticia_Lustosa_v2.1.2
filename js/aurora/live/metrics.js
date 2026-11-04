(() => {
  'use strict';

  const DAY = 86400000;
  const HISTORY_DAYS = 20;
  const MIN_HISTORY = 3;

  function validDate(value) {
    const date = typeof normalizeDate === 'function' ? normalizeDate(value) : String(value || '').split(/[T ]/)[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
    const time = Date.parse(date + 'T12:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? date : '';
  }

  function shiftDate(date, days) {
    return new Date(Date.parse(date + 'T12:00:00Z') + days * DAY).toISOString().slice(0, 10);
  }

  function isWeekday(date) {
    const day = new Date(date + 'T12:00:00Z').getUTCDay();
    return day !== 0 && day !== 6;
  }

  function workingDaysRemaining(today) {
    const [year, month] = today.split('-').map(Number);
    const end = new Date(Date.UTC(year, month, 0, 12)).toISOString().slice(0, 10);
    let days = 0;
    for (let day = today; day <= end; day = shiftDate(day, 1)) if (isWeekday(day)) days++;
    return days;
  }

  function build(records, goals, today) {
    if (!validDate(today)) throw new Error('Data de referência inválida para o Aurora Live.');
    const year = today.slice(0, 4), month = today.slice(5, 7);
    const byDate = new Map();
    let monthReal = 0, previousReal = 0, todayReal = 0, invalidDates = 0;
    for (const row of records || []) {
      const date = validDate(row.data);
      if (!date) { invalidDates++; continue; }
      // Datas completas: não mistura anos, nem conta encerramentos futuros.
      if (date.slice(0, 4) !== year || date > today) continue;
      byDate.set(date, (byDate.get(date) || 0) + 1);
      const reference = typeof getMesCorreto === 'function' ? getMesCorreto(row) : String(row.mesReferencia || date.slice(5, 7)).padStart(2, '0');
      if (reference === month && row.panjud === 'Sim') {
        monthReal++;
        if (date < today) previousReal++;
        else todayReal++;
      }
    }

    const days = [...byDate].sort(([a], [b]) => a.localeCompare(b));
    const history = days.filter(([date]) => date < today);
    const baseline = history.slice(-HISTORY_DAYS);
    const count = byDate.get(today) || 0;
    const average = baseline.length >= MIN_HISTORY ? baseline.reduce((sum, [, n]) => sum + n, 0) / baseline.length : null;
    // Índice de base 100: 100 = média dos últimos 20 dias COM encerramentos,
    // anteriores a hoje e do mesmo ano. Sem pesos, pontos artificiais ou teto.
    // Não presume jornada nos dias sem registros. Exige três dias de histórico.
    const power = average === null ? null : Math.round(count / average * 100);
    const delta = average === null ? null : (count / average - 1) * 100;
    const record = history.reduce((best, [date, total]) => total > best.total ? { date, total } : best, { date: null, total: 0 });
    const isRecord = history.length > 0 && count > record.total;
    const best = isRecord || !record.date && count > 0 ? { date: today, total: count } : record;
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = shiftDate(today, i - 6);
      return { date, count: date.slice(0, 4) === year ? byDate.get(date) || 0 : null };
    });
    const periodStart = shiftDate(today, -14);
    // Compara duas janelas fechadas, sem confrontar hoje (incompleto) com dias inteiros.
    const canComparePeriods = periodStart.slice(0, 4) === year && !!days.length && days[0][0] <= periodStart;
    let recentTotal = 0, priorTotal = 0;
    for (let i = 1; i <= 14; i++) {
      const n = byDate.get(shiftDate(today, -i)) || 0;
      if (i <= 7) recentTotal += n; else priorTotal += n;
    }
    const periodDelta = canComparePeriods && priorTotal > 0 ? (recentTotal / priorTotal - 1) * 100 : null;

    let streak = 0, cursor = today;
    while (!isWeekday(cursor)) cursor = shiftDate(cursor, -1);
    // Hoje ainda está em andamento: a ausência de registro não quebra a sequência anterior.
    if (cursor === today && !byDate.get(cursor)) {
      do { cursor = shiftDate(cursor, -1); } while (!isWeekday(cursor));
    }
    while (cursor.slice(0, 4) === year && byDate.get(cursor)) {
      streak++;
      do { cursor = shiftDate(cursor, -1); } while (!isWeekday(cursor));
    }

    const configuredGoal = Number(goals?.[month]);
    const goal = Number.isFinite(configuredGoal) && configuredGoal > 0 ? configuredGoal : null;
    const remainingDays = workingDaysRemaining(today);
    // Ritmo necessário calculado com o saldo ANTES de hoje, para não diminuir
    // a referência a cada caso. Só usa Panjud=Sim do mês de referência atual.
    // Metas do ERP são mensais e não têm ano próprio; usa a configuração vigente.
    const dailyGoal = goal && isWeekday(today) && remainingDays > 0 && previousReal < goal
      ? Math.ceil((goal - previousReal) / remainingDays) : null;
    const annualTotal = days.reduce((sum, [, n]) => sum + n, 0);
    return {
      today, year, month, count, todayReal, monthReal, goal, dailyGoal, remainingDays,
      dailyGoalReached: dailyGoal !== null && todayReal >= dailyGoal,
      monthlyGoalReached: goal !== null && monthReal >= goal,
      average, power, delta, historyDays: baseline.length, historyStart: baseline[0]?.[0] || null,
      record, best, isRecord, toBeat: record.date ? Math.max(0, record.total - count + 1) : null,
      last7, periodDelta, recentTotal, priorTotal, canComparePeriods, streak, annualTotal, invalidDates
    };
  }

  window.AuroraLiveMetrics = Object.freeze({ build, validDate, shiftDate, workingDaysRemaining, HISTORY_DAYS, MIN_HISTORY });
})();
