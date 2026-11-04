(() => {
  'use strict';
  const M = window.__auroraMemoryParts;
  delete window.__auroraMemoryParts;
  if (!M?.S || !M.H || !M.P || !M.E || !M.R || !M.Store || !M.Context) return;
  const { S, H, P, E, R, Store, Context } = M;
  let analyticalSnapshot = null;
  let initialized = false, store, policy, history = null, revision = 0, pending = null, timer = null;
  let state = { episodes: [], preferences: S.defaults(), patterns: [] };
  const status = { initialized: false, schemaVersion: 1, dataStatus: 'uninitialized', today: null, lastUpdate: null, updates: 0, scans: 0, reused: 0, cancelled: 0, deduplicated: 0, expired: 0, removed: 0, invalidated: 0, contextInvalidations: 0, failures: 0, lastDurationMs: 0, yields: 0 };
  const now = () => new Date().toISOString();
  const clock = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  // Read-only readiness signal for consumers; no change to aggregation or persistence.
  function notifyReady(){try{if(typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('aurora:memory-ready',{detail:{sourceSignature:history?.signature||null}}));}catch(_){}}
  function initialize(options = {}) {
    if (initialized) return getStatus();
    policy = R.policy(options.retention);
    let storage;
    try { storage = Object.hasOwn(options, 'storage') ? options.storage : window.localStorage; } catch (_) { storage = null; }
    store = Store.create(storage, policy); const saved = store.read();
    state = { ...saved, patterns: [] }; initialized = status.initialized = true;
    status.dataStatus = 'awaiting_data'; return getStatus();
  }
  function maintenance(today = status.today) {
    initialize();
    if (S.date(today) !== today) return getStatus();
    analyticalSnapshot = null;
    const r = R.apply(state.episodes, today, policy); state.episodes = r.episodes;
    status.expired += r.expired; status.removed += r.removed; store.write(state); return getStatus();
  }
  function invalidate() {
    initialize(); analyticalSnapshot = null; revision++; history = null; state.patterns = []; status.dataStatus = 'stale'; status.contextInvalidations++;
    clearTimeout(timer); timer = null; pending = null; return getStatus();
  }
  async function update(rows, goals, today) {
    initialize(); analyticalSnapshot = null; const version = ++revision, started = clock();
    clearTimeout(timer); timer = null; pending = null;
    if (!Array.isArray(rows) || S.date(today) !== today) { history = null; state.patterns = []; status.dataStatus = 'invalid_input'; status.failures++; return getStatus(); }
    status.today = today; status.dataStatus = 'updating'; status.scans++;
    try {
      const steps = H.build(rows, S.goals(goals, today), today); let step;
      while (!(step = steps.next()).done) {
        await new Promise(resolve => setTimeout(resolve, 0)); status.yields++;
        if (version !== revision) { status.cancelled++; return getStatus(); }
      }
      if (version !== revision) { status.cancelled++; return getStatus(); }
      const h = step.value, at = now();
      if (history?.signature === h.signature) { status.reused++; status.dataStatus = 'available'; status.lastDurationMs = clock() - started; notifyReady(); return getStatus(); }
      const patterns = P.detect(h), result = E.reconcile(state.episodes, patterns, h, at);
      state.episodes = result.episodes; state.patterns = patterns; history = h;
      status.deduplicated += result.deduplicated; status.invalidated += result.invalidated;
      status.updates++; status.contextInvalidations++; status.lastUpdate = at; status.dataStatus = 'available';
      maintenance(today); status.lastDurationMs = clock() - started; notifyReady();
      return getStatus();
    } catch (_) {
      if (version === revision) { history = null; state.patterns = []; status.dataStatus = 'degraded'; status.failures++; }
      return getStatus();
    }
  }
  function schedule(rows, goals, today) {
    initialize(); analyticalSnapshot = null;
    if (!Array.isArray(rows) || S.date(today) !== today) { invalidate(); status.dataStatus = 'invalid_input'; status.failures++; return; }
    // Coalesces render + confirmed notifications; only the latest source can commit.
    revision++; status.dataStatus = 'updating'; status.today = S.date(today) || null;
    pending = { rows, goals: S.goals(goals, today), today }; clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null; const p = pending; pending = null;
      if (p) update(p.rows, { [p.today.slice(5, 7)]: p.goals.value }, p.today);
    }, 0);
  }
  function getStatus() {
    return S.copy({ ...status, episodes: state.episodes.length, activePatterns: status.dataStatus === 'available' ? state.patterns.length : 0, persistence: store?.status() || { state: 'uninitialized' }, retention: policy || R.policy(), integrity: { uniqueEpisodeIds: new Set(state.episodes.map(e => e.id)).size === state.episodes.length, validEpisodes: state.episodes.every(e => !!E.sanitize(e)), officialDataWrites: 0, networkCalls: 0 } });
  }
  // Additive read-only projection for Phase 2. No new persistent schema or rules.
  function getAnalyticalSnapshot() {
    initialize();
    if (!history || status.dataStatus !== 'available') return S.copy({ schemaVersion: 1, dataStatus: status.dataStatus, today: status.today, sourceSignature: null });
    if (analyticalSnapshot) return analyticalSnapshot;
    const h = history;
    const episodes = state.episodes.filter(e => e.kind !== 'presentation').map(e => {
      const eligible = !['expired', 'archived', 'invalidated'].includes(e.state) && e.expiresOn >= h.today;
      const p = eligible ? P.evaluate(e.spec, h) : null;
      const reference = ['confirmation-gap', 'monthly-goal'].includes(e.kind);
      return { id: e.id, kind: e.kind, category: e.category, spec: e.spec, state: e.state, continuity: e.continuity,
        observedDays: e.observedDays, firstReferenceDate: e.firstReferenceDate, lastReferenceDate: e.lastReferenceDate,
        expiresOn: e.expiresOn, relatedId: e.relatedId, presented: e.presented.count, revalidated: !!p,
        proof: p ? { evidence: p.evidence, rule: p.rule, period: p.period, score: p.score, evaluatedOn: h.today,
          statusBasis: 'current_record_status', referenceBasis: reference ? 'whole_reference_month_in_available_records_as_of_evaluation' : null } : null };
    }).sort((a, b) => a.id.localeCompare(b.id));
    analyticalSnapshot = S.copy({ schemaVersion: 1, dataStatus: h.total.registered ? 'available' : h.inputCount ? 'no_valid_data' : 'empty', today: h.today,
      sourceSignature: h.signature, contextSignature: 'ma1-' + S.hash([h.signature, episodes]), firstDate: h.firstDate, lastDate: h.lastDate,
      inputCount: h.inputCount, quality: h.quality, days: h.orderedDays.map(date => ({ date, counts: h.days[date], byType: h.statusByType[date] })),
      goal: { ...h.goal, referenceTotals: h.references[h.goal.period] || S.emptyCounts(), basis: 'record_year_and_reference_month' }, episodes });
    return analyticalSnapshot;
  }
  const getContext = input => { initialize(); return Context.build(history, state, input, status); };
  const getPatterns = () => S.copy(status.dataStatus === 'available' ? state.patterns : []);
  function getEpisodes(options = {}) {
    initialize();
    if (options.state && !E.states.includes(options.state)) throw new TypeError('INVALID_STATE');
    const limit = Number.isInteger(options.limit) ? Math.max(0, Math.min(150, options.limit)) : 50;
    return S.copy(state.episodes.filter(e => !options.state || e.state === options.state).sort((a, b) => b.lastObserved.localeCompare(a.lastObserved)).slice(0, limit).map(e => ({ ...e, revalidated: status.dataStatus === 'available' && e.kind !== 'presentation' && !['invalidated', 'expired', 'archived'].includes(e.state), state: status.dataStatus !== 'available' && e.state === 'current' ? 'historical' : e.state })));
  }
  function recordEpisode(patternId) {
    if (status.dataStatus !== 'available' || !state.patterns.some(p => p.id === patternId)) throw new TypeError('UNVERIFIED_EPISODE');
    const existing = state.episodes.find(e => e.patternId === patternId && e.state === 'current');
    return existing ? S.copy(existing) : null;
  }
  function observePresentation(item, today) {
    initialize(); if (S.date(today) !== today) return false;
    const added = E.presentation(state.episodes, item, today, now()); if (added) maintenance(today); return added;
  }
  function setPreferences(input, options = {}) {
    initialize(); if (options.authorized !== true) throw new TypeError('AUTHORIZATION_REQUIRED');
    state.preferences = S.preferences({ ...state.preferences, ...input, origin: 'user' }); store.write(state, { ...input, origin: 'user' }); return S.copy(state.preferences);
  }
  function resetPreferences(options = {}) {
    initialize(); if (options.authorized !== true) throw new TypeError('AUTHORIZATION_REQUIRED');
    state.preferences = S.defaults(); store.write(state, S.defaults()); return S.copy(state.preferences);
  }
  const getPreferences = () => { initialize(); const fresh=store.read(); if(store.status().state==='available')state.preferences=fresh.preferences; return S.copy(state.preferences); };
  window.AuroraMemory = Object.freeze({ getPreferences, initialize, update, schedule, getAnalyticalSnapshot, getContext, getPatterns, getEpisodes, recordEpisode, observePresentation, invalidate, getStatus, maintenance, setPreferences, resetPreferences });
})();
