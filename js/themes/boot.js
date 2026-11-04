(() => {
  'use strict';
  const themes = window.ERPThemeRegistry;
  const stylesheets = [...document.querySelectorAll('[data-erp-stylesheet]')];
  const key = 'erp_leticia_appearance_v1';
  const defaults = {theme:'original',layout:'auto',density:'auto',effects:true};
  function validate(input) {
    const value = input && typeof input === 'object' ? input : {};
    return {
      theme: Object.hasOwn(themes, value.theme) ? value.theme : 'original',
      layout: ['auto','side','top'].includes(value.layout) ? value.layout : 'auto',
      density: ['auto','compact','comfortable'].includes(value.density) ? value.density : 'auto',
      effects: typeof value.effects === 'boolean' ? value.effects : true
    };
  }
  let state = {...defaults};
  try { state = validate(JSON.parse(localStorage.getItem(key))); } catch (_) {}
  const root = document.documentElement;
  function apply(input, persist = true) {
    state = validate(input);
    const theme = themes[state.theme];
    // Only the selected CSS is in the cascade. Old rules and keyframes disappear.
    for (const link of stylesheets) {
      link.sheet.disabled = link.dataset.erpStylesheet !== state.theme;
    }
    root.dataset.erpTheme = state.theme;
    root.dataset.erpLayout = state.layout;
    root.dataset.erpDensity = state.density;
    root.dataset.erpEffects = String(state.effects);
    root.style.colorScheme = theme.mode;
    const font = document.getElementById('erp-theme-font');
    if (state.theme === 'original') { font.disabled = true; }
    else { if (font.getAttribute('href') !== theme.font) font.setAttribute('href', theme.font); font.disabled = false; }
    let saved = true;
    if (persist) {
      try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { saved = false; }
    }
    document.dispatchEvent(new CustomEvent('erp:appearance-change', {detail:{...state,saved}}));
    return saved;
  }
  window.ERPTheme = Object.freeze({
    themes, key, defaults: Object.freeze(defaults),
    get state() { return {...state}; }, apply
  });
  // Synchronous before body paint, including stored layout and density.
  apply(state, false);
  window.addEventListener('storage', e => {
    if (e.key !== key && e.key !== null) return;
    try { apply(e.newValue ? JSON.parse(e.newValue) : defaults, false); } catch (_) { apply(defaults, false); }
  });
})();
