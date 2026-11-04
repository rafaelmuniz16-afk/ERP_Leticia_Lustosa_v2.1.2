(() => {
  'use strict';
  // Reutiliza apenas a estrutura de metadados e presets; nenhum dado do ERP.
  const theme = structuredClone(window.ERPThemeRegistry.escuro);
  const icon = path => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  Object.assign(theme, {
    id: 'glassy-crm', name: 'Glassy CRM', mode: 'dark', icon: '◈',
    description: 'Vidro fumê, luz violeta e ciano, com Glassy Carousel exclusivo.',
    primary: '#b5a1ff', secondary: '#74d9eb', decor: '<canvas id="glassyAmbient" aria-hidden="true"></canvas><button type="button" id="glassyMascot" class="glassy-mascot" title="Cristal Glassy: toque dez vezes para revelar a surpresa"><span aria-hidden="true">◈</span><span id="glassyBubble" class="glassy-bubble">Toque no cristal. Existe uma surpresa aqui. ◈</span></button>', extras: '', idStyles: {},
    font: window.ERPThemeRegistry.original.font,
    source: 'Referências fornecidas: Glassy CRM / Glassy Carousel V2',
    brand: '<div class="brand"><div class="brand-mark">' + icon('<path d="m12 3 9 9-9 9-9-9Z"/><path d="m12 7 5 5-5 5-5-5Z"/>') + '</div><div><div class="brand-title">Leticia Lustosa</div><div class="brand-sub">ERP • Encerramentos 2026</div></div></div>',
    header: '<div class="eyebrow">GLASSY CRM <span class="glassy-live-dot"></span></div><h1 class="page-title">Olá, Letícia</h1><p class="page-subtitle">Seu espaço de trabalho · Encerramentos 2026</p>',
    static: {
      '.eyebrow': ['GLASSY CRM <span class="glassy-live-dot"></span>'],
      '.page-title': ['Olá, Letícia'], '.page-subtitle': ['Seu espaço de trabalho · Encerramentos 2026'],
      '.side-aurora-name': ['Aurora Live'], '.side-aurora-tag': ['RADAR'], '.side-aurora-avatar': ['✦'],
      '.side-card-title': ['Conexão com a nuvem']
    },
    navIcons: [
      icon('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
      icon('<path d="M12 5v14M5 12h14"/>'),
      icon('<path d="M8 3h8l4 4v14H4V3Z"/><path d="M8 11h8M8 15h8M8 7h3"/>'),
      icon('<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>'),
      icon('<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>')
    ],
    kpiIcons: ['◈', '↯', '✓', '◎']
  });
  for (const [id, chart] of Object.entries(theme.charts)) {
    if (id === 'tiposChart') Object.assign(chart.style, {backgroundColor: ['#ac95fb', '#68cfdf', '#89d0b8'], borderColor: '#1b1d29'});
    if (id === 'linhaChart') Object.assign(chart.style, {borderColor: '#79daec', backgroundColor: 'rgba(121,218,236,.08)', pointBackgroundColor: '#eefaff', borderWidth: 2});
  }
  window.ERPThemeRegistry['glassy-crm'] = theme;
})();
