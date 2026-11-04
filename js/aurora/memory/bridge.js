/* Read-only lifecycle bridge. No polling, AI transport, ERP mutation or new UI. */
(() => {
  'use strict';
  if (!window.AuroraMemory) return;
  let midnight = null, lastDay = '';
  function refreshDay() {
    try {
      const today = getTodayLocal();
      if (today !== lastDay && typeof bd !== 'undefined') {
        lastDay = today;
        AuroraMemory.schedule(bd, typeof lastConfirmedMetas === 'undefined' ? {} : lastConfirmedMetas, today);
      }
      clearTimeout(midnight);
      if (!document.hidden) {
        // The ERP's civil clock is America/Fortaleza (UTC-3, no DST).
        const tomorrow = Date.parse(today + 'T00:00:00-03:00') + 86400000;
        midnight = setTimeout(refreshDay, Math.max(1000, tomorrow - Date.now() + 100));
      }
    } catch (_) { /* A memory failure must never block the application. */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(midnight); else refreshDay(); });
  window.addEventListener('focus', refreshDay);
  window.addEventListener('pageshow', refreshDay);
  window.addEventListener('pagehide', () => clearTimeout(midnight));
  refreshDay();
})();
