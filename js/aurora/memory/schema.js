/* Aurora Memory 1: private building blocks, consumed and removed by core.js. */
(() => {
  'use strict';
  const M = window.__auroraMemoryParts = Object.create(null);
  const DAY = 86400000;
  const date = value => {
    if (typeof value !== 'string') return '';
    const s = value.split(/[T ]/)[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || s.startsWith('0000')) return '';
    const t = Date.parse(s + 'T12:00:00Z');
    return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s ? s : '';
  };
  const shift = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
  const weekday = d => new Date(d + 'T12:00:00Z').getUTCDay();
  const monday = d => shift(d, -((weekday(d) + 6) % 7));
  const freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
  const copy = o => freeze(JSON.parse(JSON.stringify(o)));
  const hash = value => {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    let a = 2166136261, b = 5381;
    for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ s.charCodeAt(i); }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  };
  const categories = ['production', 'panjud', 'refusal', 'distribution', 'record', 'goal', 'consistency', 'observation'];
  const defaults = () => ({ preferredCategories: [], mutedCategories: [], intensity: 'existing', style: 'objective', maxObservationsPerDay: null, presentation: 'existing', origin: 'default' });
  function preferences(input) {
    const p = defaults(), v = input || {};
    for (const k of ['preferredCategories', 'mutedCategories']) if (Array.isArray(v[k])) p[k] = [...new Set(v[k].filter(x => categories.includes(x)))];
    if (['existing', 'quiet', 'normal'].includes(v.intensity)) p.intensity = v.intensity;
    if (['objective', 'explanatory', 'balanced', 'analytical'].includes(v.style)) p.style = v.style;
    if (Number.isInteger(v.maxObservationsPerDay) && v.maxObservationsPerDay >= 0 && v.maxObservationsPerDay <= 10) p.maxObservationsPerDay = v.maxObservationsPerDay;
    if (['existing', 'compact'].includes(v.presentation)) p.presentation = v.presentation;
    if (v.origin === 'user') p.origin = 'user';
    return p;
  }
  const emptyCounts = () => ({ registered: 0, confirmed: 0, refused: 0, pending: 0, uncertain: 0, statusConflicts: 0, types: { onus: 0, agreement: 0, success: 0, inactivation: 0, other: 0 } });
  function add(a, b) {
    for (const k of ['registered', 'confirmed', 'refused', 'pending', 'uncertain', 'statusConflicts']) a[k] += b[k];
    for (const k of Object.keys(a.types)) a.types[k] += b.types[k];
    return a;
  }
  function goals(input, today) {
    // Never enumerate the configuration object: it may also contain the API key.
    const n = Number(input?.[today.slice(5, 7)]);
    return { period: today.slice(0, 7), value: Number.isFinite(n) && n > 0 && n <= 1e9 ? n : null, provenance: 'current_confirmed_configuration', historicalVersions: false };
  }
  M.S = { DAY, date, shift, weekday, monday, freeze, copy, hash, categories, defaults, preferences, emptyCounts, add, goals };
})();
