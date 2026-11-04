(() => {
  'use strict';
  const M = window.__auroraMemoryParts, { S, P } = M;
  const states = ['current', 'historical', 'superseded', 'invalidated', 'expired', 'archived'];
  const liveTypes = ['personal-record', 'monthly-goal', 'daily-goal', 'cases-100', 'cases-50', 'streak-5', 'above-average', 'near-record'];
  const iso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(Date.parse(s)).toISOString() === s;
  const id = s => typeof s === 'string' && /^(?:e1|p1|o1)-[a-f0-9]{16}$/.test(s);
  function sanitize(raw) {
    if (!raw || !id(raw.id) || !S.categories.includes(raw.category) || !states.includes(raw.state) || !iso(raw.firstObserved) || !iso(raw.lastObserved) || !iso(raw.evaluatedAt)) return null;
    if (raw.firstObserved > raw.lastObserved || S.date(raw.lastReferenceDate) !== raw.lastReferenceDate || S.date(raw.firstReferenceDate) !== raw.firstReferenceDate) return null;
    const receipt = raw.kind === 'presentation', s = receipt ? null : P.spec(raw.spec);
    if (receipt ? !liveTypes.includes(raw.eventType) : !s) return null;
    if (!receipt && (raw.kind !== s.kind || typeof raw.patternId !== 'string' || !id(raw.patternId))) return null;
    const evidence = {};
    const allowed = ['registered', 'confirmed', 'refused', 'baselineTotal', 'baselineWeeks', 'weeklyAverage', 'deltaPercent', 'gap', 'gapPercent', 'priorRegistered', 'priorRefused', 'ratePercent', 'count', 'priorCount', 'percentagePoints', 'previousBest', 'goal', 'weekdays'];
    for (const k of allowed) if (Number.isFinite(raw.evidence?.[k]) && Math.abs(raw.evidence[k]) <= 1e12) evidence[k] = raw.evidence[k];
    if (['onus', 'agreement', 'success', 'inactivation'].includes(raw.evidence?.type)) evidence.type = raw.evidence.type;
    return { id: raw.id, kind: receipt ? 'presentation' : s.kind, category: receipt ? 'observation' : raw.category, patternId: receipt ? null : raw.patternId,
      spec: s, eventType: receipt ? raw.eventType : null, state: raw.state, firstObserved: raw.firstObserved, lastObserved: raw.lastObserved, evaluatedAt: raw.evaluatedAt,
      firstReferenceDate: raw.firstReferenceDate, lastReferenceDate: raw.lastReferenceDate,
      evidence, sourceSignature: /^h1-[a-f0-9]{16}$/.test(raw.sourceSignature) ? raw.sourceSignature : '',
      score: Number.isFinite(raw.score) && Math.abs(raw.score) <= 1e12 ? raw.score : 0,
      relevance: Number.isInteger(raw.relevance) ? Math.max(0, Math.min(100, raw.relevance)) : 0,
      relatedId: id(raw.relatedId) ? raw.relatedId : null,
      continuity: ['new', 'stable', 'increased', 'decreased', 'ended', 'corrected', 'recurrence'].includes(raw.continuity) ? raw.continuity : 'new',
      observedDays: Number.isInteger(raw.observedDays) ? Math.max(1, Math.min(10000, raw.observedDays)) : 1,
      presented: { count: Number.isInteger(raw.presented?.count) ? Math.max(0, Math.min(10000, raw.presented.count)) : 0, lastAt: iso(raw.presented?.lastAt) ? raw.presented.lastAt : null, source: ['local', 'ai'].includes(raw.presented?.source) ? raw.presented.source : null },
      expiresOn: S.date(raw.expiresOn) || raw.lastReferenceDate, reliability: receipt ? 'presentation_receipt' : 'historical_episode' };
  }
  function reconcile(episodes, patterns, h, at) {
    const active = new Map(patterns.map(p => [p.id, p])); let deduplicated = 0, invalidated = 0;
    for (const e of episodes) {
      if (e.kind === 'presentation' || e.state === 'expired' || e.state === 'archived') continue;
      const p = active.get(e.patternId);
      if (!p) {
        const proof = P.evaluate(e.spec, h);
        e.evaluatedAt = at;
        if (!proof) { if (e.state !== 'invalidated') invalidated++; e.state = 'invalidated'; e.continuity = e.spec.end < h.today ? 'corrected' : 'ended'; }
        else { e.state = e.spec.end < h.today ? 'historical' : 'superseded'; e.evidence = proof.evidence; e.sourceSignature = h.signature; }
      }
    }
    for (const p of patterns) {
      let e = episodes.find(e => e.patternId === p.id && !['expired', 'archived'].includes(e.state));
      if (e) {
        deduplicated++;
        const delta = p.score - e.score, material = Math.abs(delta) >= (['panjud', 'production', 'distribution', 'refusal'].includes(p.category) ? 5 : 1);
        e.continuity = e.state === 'invalidated' ? 'recurrence' : material ? delta > 0 ? 'increased' : 'decreased' : 'stable';
        if (e.lastReferenceDate !== h.today) e.observedDays++;
      } else {
        const related = episodes.filter(x => x.kind === p.kind && x.spec?.type === p.spec.type).sort((a, b) => b.lastObserved.localeCompare(a.lastObserved))[0];
        if (related?.state === 'current') related.state = 'superseded';
        e = { id: 'e1-' + S.hash([p.id, at]), kind: p.kind, category: p.category, patternId: p.id, firstObserved: at, firstReferenceDate: h.today, observedDays: 1, relatedId: related?.id || null, continuity: related ? 'recurrence' : 'new', presented: { count: 0, lastAt: null, source: null }, reliability: 'historical_episode', eventType: null };
        episodes.push(e);
      }
      Object.assign(e, { spec: p.spec, state: 'current', evidence: p.evidence, score: p.score, relevance: p.relevance, sourceSignature: h.signature, lastObserved: at, evaluatedAt: at, lastReferenceDate: h.today, expiresOn: h.today });
    }
    return { episodes, deduplicated, invalidated };
  }
  function presentation(episodes, input, today, at) {
    if (!input || !liveTypes.includes(input.type) || !['local', 'ai'].includes(input.source)) return false;
    const key = 'o1-' + S.hash([input.type, today, input.source]);
    if (episodes.some(e => e.id === key)) return false;
    episodes.push({ id: key, kind: 'presentation', category: 'observation', eventType: input.type, patternId: null, spec: null, state: 'historical',
      firstObserved: at, lastObserved: at, evaluatedAt: at, firstReferenceDate: today, lastReferenceDate: today, evidence: {}, sourceSignature: '', score: 0, relevance: 20, relatedId: null, continuity: 'new', observedDays: 1,
      presented: { count: 1, lastAt: at, source: input.source }, expiresOn: today, reliability: 'presentation_receipt' });
    return true;
  }
  M.E = { sanitize, reconcile, presentation, states };
})();
