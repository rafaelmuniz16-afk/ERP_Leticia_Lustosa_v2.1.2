(() => {
  'use strict';
  const M = window.__auroraMemoryParts, { S, E } = M;
  const KEY = 'aurora_memory_v1';
  function create(storage, policy) {
    let status = 'available', readFailures = 0, writeFailures = 0, rejectedEntries = 0, last = '', writes = 0, bytes = 0;
    function read() {
      const empty = { episodes: [], preferences: S.defaults() };
      try {
        const raw = storage?.getItem(KEY);
        if (!storage) { status = 'unavailable'; return empty; }
        if (!raw) { status='available'; last=''; bytes=0; return empty; }
        if (raw.length * 2 > policy.maxBytes) { status = 'oversized'; readFailures++; return empty; }
        const value = JSON.parse(raw);
        if (value?.schemaVersion !== 1) { status = 'unknown_schema'; readFailures++; return empty; }
        if (!Array.isArray(value.episodes) || value.episodes.length > 300) throw new Error('INVALID');
        status='available'; last = raw; bytes = raw.length * 2;
        const episodes = value.episodes.map(E.sanitize).filter(Boolean);
        rejectedEntries = value.episodes.length - episodes.length;
        return { episodes, preferences: S.preferences(value.preferences) };
      } catch (_) { status = storage ? 'read_failed' : 'unavailable'; readFailures++; return empty; }
    }
    function write(state, preferencePatch) {
      // Unknown future versions are preserved, never overwritten by this older reader.
      if (!storage || status === 'unknown_schema') return false;
      try {
        const fresh = read();
        if (status === 'unknown_schema' || status === 'read_failed' || status === 'oversized') return false;
        const preferences = S.preferences(preferencePatch ? { ...fresh.preferences, ...preferencePatch } : fresh.preferences);
        state.preferences = preferences;
        const payload = { schemaVersion: 1, preferences, episodes: state.episodes.map(E.sanitize).filter(Boolean) };
        let raw = JSON.stringify(payload);
        while (raw.length * 2 > policy.maxBytes && payload.episodes.length) { payload.episodes.pop(); raw = JSON.stringify(payload); }
        if (raw === last) return true;
        storage.setItem(KEY, raw); bytes = raw.length * 2; last = raw; writes++; status = 'available'; return true;
      } catch (_) { status = 'write_failed'; writeFailures++; return false; }
    }
    return { read, write, status: () => ({ state: status, readFailures, writeFailures, rejectedEntries, writes, bytes, key: KEY, deviceLocal: true }) };
  }
  M.Store = { create, KEY };
})();
