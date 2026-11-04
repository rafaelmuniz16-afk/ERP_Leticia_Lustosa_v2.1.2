(() => {
  'use strict';
  const M = window.__auroraMemoryParts, S = M.S;
  const fields = ['data', 'mesReferencia', 'tipo', 'panjud', 'recusado'];
  const string = v => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
  const bucket = (map, key) => map[key] || (map[key] = S.emptyCounts());
  function* build(rows, goal, today) {
    if (!Array.isArray(rows) || S.date(today) !== today) throw new TypeError('INVALID_SOURCE');
    const quality = { invalidRows: 0, invalidDates: 0, futureDates: 0, duplicateRows: 0, conflictingUids: 0, missingUid: 0, invalidReference: 0, referenceDiffers: 0, unknownTypes: 0, statusConflicts: 0, unknownStatus: 0 };
    const keyed = new Map(), unkeyed = [], seen = new WeakSet(), conflicts = new Set();
    let work = 0;
    for (const row of rows) {
      if (++work % 500 === 0) yield;
      if (!row || typeof row !== 'object' || Array.isArray(row)) { quality.invalidRows++; continue; }
      if (seen.has(row)) { quality.duplicateRows++; continue; } seen.add(row);
      const r = fields.map(k => string(row[k])), uid = string(row._uid);
      if (!uid.trim()) { quality.missingUid++; unkeyed.push(r); }
      else if (!keyed.has(uid)) keyed.set(uid, r);
      else { quality.duplicateRows++; if (keyed.get(uid).some((v, i) => v !== r[i])) conflicts.add(uid); }
    }
    quality.conflictingUids = conflicts.size;
    const h = { today, goal, days: {}, statusByType: {}, weeks: {}, months: {}, years: {}, references: {}, total: S.emptyCounts(), quality, inputCount: rows.length, firstDate: null, lastDate: null };
    const dateCache = new Map();
    function consume(r) {
      let d = dateCache.get(r[0]);
      if (d === undefined) { d = S.date(r[0]); dateCache.set(r[0], d); }
      if (!d) { quality.invalidDates++; return; }
      if (d > today) { quality.futureDates++; return; }
      h.firstDate = !h.firstDate || d < h.firstDate ? d : h.firstDate;
      h.lastDate = !h.lastDate || d > h.lastDate ? d : h.lastDate;
      const c = S.emptyCounts(); c.registered = 1;
      // Refusal precedence matches the existing aggregate report, not a rewrite of ERP totals.
      if (r[4] === 'Sim') c.refused = 1;
      else if (r[3] === 'Sim' && r[4] === 'Não') c.confirmed = 1;
      else if (r[3] === 'Não' && r[4] === 'Não') c.pending = 1;
      else c.uncertain = 1;
      if (!['Sim', 'Não'].includes(r[3]) || !['Sim', 'Não'].includes(r[4])) quality.unknownStatus++;
      if (r[3] === 'Sim' && r[4] === 'Sim') { c.statusConflicts = 1; quality.statusConflicts++; }
      const types = { 'Ônus': 'onus', Acordo: 'agreement', 'Êxito': 'success', 'Inativação': 'inactivation' };
      const type = Object.hasOwn(types, r[2]) ? types[r[2]] : null;
      c.types[type || 'other'] = 1;
      const cross = h.statusByType[d] || (h.statusByType[d] = {});
      S.add(bucket(cross, type || 'other'), c);
      if (!type) quality.unknownTypes++;
      const raw = r[1].trim(), ref = raw === '' ? d.slice(5, 7) : /^(?:0?[1-9]|1[0-2])$/.test(raw) ? raw.padStart(2, '0') : '';
      if (!ref) quality.invalidReference++;
      else { if (ref !== d.slice(5, 7)) quality.referenceDiffers++; S.add(bucket(h.references, d.slice(0, 4) + '-' + ref), c); }
      for (const [map, key] of [[h.days, d], [h.weeks, S.monday(d)], [h.months, d.slice(0, 7)], [h.years, d.slice(0, 4)]]) S.add(bucket(map, key), c);
      S.add(h.total, c);
    }
    for (const [id, row] of keyed) { if (++work % 500 === 0) yield; if (!conflicts.has(id)) consume(row); }
    for (const row of unkeyed) { if (++work % 500 === 0) yield; consume(row); }
    h.orderedDays = Object.keys(h.days).sort();
    let best = { date: null, registered: 0 }, streak = 0, longest = 0, last = '';
    for (const d of h.orderedDays) {
      if (++work % 500 === 0) yield;
      if (h.days[d].registered > best.registered) best = { date: d, registered: h.days[d].registered };
      if ([0, 6].includes(S.weekday(d))) continue;
      let previous = S.shift(d, -1); while ([0, 6].includes(S.weekday(previous))) previous = S.shift(previous, -1);
      streak = last === previous ? streak + 1 : 1; longest = Math.max(longest, streak); last = d;
    }
    let cursor = today, current = 0;
    while ([0, 6].includes(S.weekday(cursor))) cursor = S.shift(cursor, -1);
    if (cursor === today && !h.days[cursor]) { do { cursor = S.shift(cursor, -1); } while ([0, 6].includes(S.weekday(cursor))); }
    while (h.days[cursor]) { current++; do { cursor = S.shift(cursor, -1); } while ([0, 6].includes(S.weekday(cursor))); }
    h.records = { bestDay: best, longestWeekdayStreak: longest, currentWeekdayStreak: current };
    // Canonical aggregate signature: row order, CNJ, descriptions and keys have no influence.
    h.signature = 'h1-' + S.hash([today, goal, h.orderedDays.map(d => [d, h.days[d], ['onus', 'agreement', 'success', 'inactivation', 'other'].map(t => h.statusByType[d][t] || null)]), Object.keys(h.references).sort().map(k => [k, h.references[k]]), quality]);
    return h;
  }
  function range(h, start, end, basis = 'closure') {
    const c = S.emptyCounts();
    if (basis === 'reference') { if (start.slice(0, 7) !== end.slice(0, 7)) throw new TypeError('REFERENCE_REQUIRES_ONE_MONTH'); return S.add(c, h.references[start.slice(0, 7)] || S.emptyCounts()); }
    for (const d of h.orderedDays) { if (d > end) break; if (d >= start) S.add(c, h.days[d]); }
    return c;
  }
  M.H = { build, range };
})();
