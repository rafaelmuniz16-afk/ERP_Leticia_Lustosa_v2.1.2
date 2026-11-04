(() => {
  'use strict';
  const M = window.__auroraMemoryParts, { S, H } = M;
  const audiences = ['internal', 'observa', 'reports', 'work-center', 'financial'];
  function scope(input = {}, today) {
    const period = input.period || 'month', audience = input.audience || 'internal';
    if (!audiences.includes(audience)) throw new TypeError('INVALID_AUDIENCE');
    let start = today, end = today;
    if (period === 'week') start = S.monday(today);
    else if (['month', 'events'].includes(period)) start = today.slice(0, 7) + '-01';
    else if (period === 'year') start = today.slice(0, 4) + '-01-01';
    else if (period === 'trends') start = S.shift(today, -28);
    else if (period === 'custom') { start = input.start; end = input.end; }
    else if (period !== 'day') throw new TypeError('INVALID_PERIOD');
    if (S.date(start) !== start || S.date(end) !== end || start > end || end > today) throw new TypeError('INVALID_RANGE');
    if ((Date.parse(end) - Date.parse(start)) / S.DAY > 36600) throw new TypeError('RANGE_TOO_LARGE');
    return { period, start, end, audience, basis: 'closure_date', partial: end === today };
  }
  function build(h, state, input = {}, status) {
    const today = h?.today || status.today, sc = today ? scope(input, today) : null;
    const limitations = [
      'Somente dados disponíveis neste navegador; a memória episódica não é sincronizada entre dispositivos.',
      'Datas de encerramento do ERP não são horários de cadastro nem prova de baixa judicial.',
      'Ausência de registros não comprova ausência de trabalho; os padrões não explicam causas ou eficiência pessoal.',
      'Confirmação válida: Panjud=Sim e recusa=Não. Recusa tem precedência; outros estados são sinalizados.',
      'Metas não têm histórico de versões. Apenas a configuração confirmada do mês atual é usada.',
      'Assinaturas identificam agregados para deduplicação; não são autenticação criptográfica.'
    ];
    const ready = !!h && status.dataStatus === 'available';
    const current = ready ? H.range(h, sc.start, sc.end) : null;
    let comparison = null;
    if (ready && !sc.partial) {
      const n = Math.round((Date.parse(sc.end) - Date.parse(sc.start)) / S.DAY) + 1;
      const end = S.shift(sc.start, -1), start = S.shift(sc.start, -n), previous = H.range(h, start, end);
      if (h.firstDate && h.firstDate <= start && previous.registered >= 5) comparison = { start, end, previous, deltaPercent: (current.registered / previous.registered - 1) * 100, reliability: 'derived_pattern', method: 'Períodos fechados adjacentes com igual duração; ao menos cinco registros na referência. Comparação descritiva, não padrão persistente.' };
    }
    const intersects = p => p && p.start <= sc.end && p.end >= sc.start;
    const patterns = ready ? state.patterns.filter(p => intersects(p.period)).slice(0, 20) : [];
    const recentEpisodes = state.episodes.filter(e => sc && (e.kind === 'presentation' ? e.lastReferenceDate >= sc.start && e.firstReferenceDate <= sc.end : intersects(e.spec)))
      .sort((a, b) => b.lastObserved.localeCompare(a.lastObserved)).slice(0, sc?.audience === 'observa' ? 5 : 20)
      .map(e => ({ ...e, state: !ready && e.state === 'current' ? 'historical' : e.state, revalidated: ready && e.kind !== 'presentation' && !['invalidated', 'expired', 'archived'].includes(e.state) }));
    if (sc?.partial) limitations.push('O período inclui hoje e está incompleto; não há comparação com período fechado.');
    if (!ready) limitations.push('Projeções indisponíveis ou em atualização: nenhum agregado anterior deve ser usado como fato atual.');
    if (ready && Object.entries(h.quality).some(([k, v]) => k !== 'missingUid' && v)) limitations.push('Há exclusões ou alertas de qualidade; consulte dataQuality.');
    return S.copy({ schemaVersion: 1, scope: sc, evaluatedAt: status.lastUpdate, sourceSignature: ready ? h.signature : null,
      dataStatus: ready ? h.total.registered ? 'available' : h.inputCount ? 'no_valid_data' : 'empty' : status.dataStatus,
      current: current && { ...current, reliability: 'verified_fact' }, comparison, patterns, recentEpisodes,
      goal: ready && sc.end === today && sc.start.slice(0, 7) === today.slice(0, 7) ? { ...h.goal, referenceTotals: h.references[h.goal.period] || S.emptyCounts(), basis: 'record_year_and_reference_month', reliability: 'verified_fact' } : null,
      records: ready ? { ...h.records, scope: 'all_available_history', evaluatedOn: today, bestDay: { ...h.records.bestDay, partial: h.records.bestDay.date === today }, reliability: 'verified_fact' } : null, dataQuality: ready ? h.quality : null, preferences: { ...state.preferences, reliability: 'preference' },
      hypotheses: [], limitations, capabilities: { readOnly: true, generatesAI: false, executesActions: false, autoPresents: false } });
  }
  M.Context = { scope, build };
})();
