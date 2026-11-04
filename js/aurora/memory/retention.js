(() => {
  'use strict';
  const M = window.__auroraMemoryParts, S = M.S;
  const defaults = { maxEpisodes: 150, maxBytes: 240000, days: { production: 90, panjud: 90, refusal: 120, distribution: 90, record: 365, goal: 365, consistency: 180, observation: 30 } };
  function policy(input = {}) {
    const p = { maxEpisodes: defaults.maxEpisodes, maxBytes: defaults.maxBytes, days: { ...defaults.days } };
    if (Number.isInteger(input.maxEpisodes)) p.maxEpisodes = Math.max(10, Math.min(300, input.maxEpisodes));
    if (Number.isInteger(input.maxBytes)) p.maxBytes = Math.max(20000, Math.min(500000, input.maxBytes));
    for (const k of S.categories) if (Number.isInteger(input.days?.[k])) p.days[k] = Math.max(1, Math.min(730, input.days[k]));
    return p;
  }
  function apply(episodes, today, p) {
    let expired = 0, removed = 0;
    const unique = new Map();
    for (const e of episodes) {
      e.expiresOn = S.shift(e.lastObserved.slice(0, 10), p.days[e.category]);
      if (e.expiresOn < today && e.state !== 'expired') { e.state = 'expired'; expired++; }
      // Seven-day tombstone window for diagnostics, then discard.
      if (S.shift(e.expiresOn, 7) < today) { removed++; continue; }
      if (!unique.has(e.id) || unique.get(e.id).lastObserved < e.lastObserved) unique.set(e.id, e);
    }
    const result = [...unique.values()].sort((a, b) => (b.state !== 'expired') - (a.state !== 'expired') || b.relevance - a.relevance || b.lastObserved.localeCompare(a.lastObserved));
    removed += Math.max(0, result.length - p.maxEpisodes);
    return { episodes: result.slice(0, p.maxEpisodes), expired, removed };
  }
  M.R = { policy, apply };
})();
