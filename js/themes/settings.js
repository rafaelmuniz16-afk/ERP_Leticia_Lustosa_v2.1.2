(() => {
  'use strict';
  const api = window.ERPTheme;
  const root = document.documentElement;
  const dialog = document.getElementById('erp-settings');
  const grid = document.getElementById('erp-theme-grid');
  const status = document.getElementById('erp-theme-status');
  const decor = document.getElementById('erp-theme-visuals');
  const previewPalettes = {
    original:['#fff7fc','#5d4568','#fff'],claro:['#f8fafc','#e2e8f0','#fff'],
    escuro:['#07090e','#111a2d','#19243c'],natal:['#f7faf8','#103822','#fff'],
    'ano-novo':['#05070d','#111728','#182035'],pascoa:['#faf7f2','#ebdcd0','#fff'],
    'festa-junina':['#fffbf2','#78350f','#fff8e8'],halloween:['#07050a','#160e22','#1f1430'],
    terror:['#050406','#29080c','#1f0f1b'],cyberpunk:['#03060d','#0d1527','#141f38'],
    'glassy-crm':['#0d1018','#2d293e','#343144']
  };
  for (const theme of Object.values(api.themes)) {
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'erp-theme-card'; card.dataset.theme = theme.id;
    card.setAttribute('aria-label', 'Aplicar tema ' + theme.name);
    card.setAttribute('aria-pressed', 'false');
    const palette = previewPalettes[theme.id];
    ['bg','side','surface'].forEach((key,i) => card.style.setProperty('--preview-'+key,palette[i]));
    card.style.setProperty('--preview-primary',theme.primary);
    card.style.setProperty('--preview-secondary',theme.secondary);
    // Static internal miniatures; never mount a second ERP or execute source scripts.
    card.innerHTML = '<span class="erp-preview" aria-hidden="true"><span class="erp-preview-side"><span>'+theme.icon+'</span><i></i><i></i><i></i></span><span class="erp-preview-main"><i class="erp-preview-title"></i><i class="erp-preview-tile"></i><i class="erp-preview-tile"></i><i class="erp-preview-tile"></i><span class="erp-preview-chart"><i style="height:35%"></i><i style="height:60%"></i><i style="height:45%"></i><i style="height:85%"></i><i style="height:65%"></i></span></span></span>';
    const name=document.createElement('strong'); name.textContent=theme.name;
    const desc=document.createElement('span'); desc.className='erp-theme-desc'; desc.textContent=theme.description;
    const state=document.createElement('span'); state.className='erp-card-state';
    card.append(name,desc,state);
    card.addEventListener('click', () => {
      const saved=api.apply({...api.state,theme:theme.id});
      announce(saved,'Tema '+theme.name+' aplicado.');
    });
    grid.appendChild(card);
  }
  function announce(saved,message) {
    status.textContent=message+(saved ? ' Preferência salva.' : ' Não foi possível salvar neste navegador; a mudança vale apenas nesta sessão.');
  }
  let opener;
  function openSettings(event) {
    opener=event.currentTarget;
    if(!dialog.open) dialog.showModal();
    window.ERPGlassyThemeCarousel?.revealActive();
    (grid.querySelector('[aria-pressed="true"]') || document.getElementById('erp-close-settings')).focus({preventScroll:true});
  }
  ['erp-open-settings','erp-open-settings-top'].forEach(id=>document.getElementById(id).addEventListener('click',openSettings));
  document.getElementById('erp-close-settings').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(opener?.isConnected) opener.focus({preventScroll:true});});
  dialog.addEventListener('click',e=>{
    const rect=dialog.getBoundingClientRect();
    if(e.target===dialog && (e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom)) dialog.close();
  });
  ['layout','density','effects'].forEach(key=>{
    document.getElementById('erp-'+key).addEventListener('change', e=>{
      const value=key==='effects'?e.target.checked:e.target.value;
      const saved=api.apply({...api.state,[key]:value});
      announce(saved,'Aparência atualizada.');
    });
  });
  document.getElementById('erp-reset-theme').addEventListener('click',()=>{
    const saved=api.apply(api.defaults); announce(saved,'Visual Original restaurado.');
  });
  let renderedTheme=null,previousLayout=null,previousDensity=null,chartPaint=null;
  function scheduleChartPaint(){
    if(chartPaint!==null)cancelAnimationFrame(chartPaint);
    chartPaint=requestAnimationFrame(()=>{
      chartPaint=null;
      if(window.Chart)Object.values(Chart.instances).forEach(chart=>{
        if(['tiposChart','linhaChart'].includes(chart.canvas?.id)){chart.resize();chart.update('none');}
      });
    });
  }
  document.fonts?.addEventListener('loadingdone',scheduleChartPaint);
  function syncView() {
    const state=api.state, theme=api.themes[state.theme];
    const changed=renderedTheme!==state.theme;
    if(changed) {
      ERPThemeRuntime.unmount();
      decor.innerHTML=theme.decor;
      document.querySelector('.brand').outerHTML=theme.brand;
      document.getElementById('erp-theme-extras')?.remove();
      const extras=document.createElement('div');extras.id='erp-theme-extras';extras.innerHTML=theme.extras;
      document.querySelector('.brand').after(extras);
      const header=document.querySelector('.topbar > div:first-child');header.innerHTML=theme.header;
      Object.entries(theme.static).forEach(([selector,contents])=>document.querySelectorAll(selector).forEach((node,i)=>{if(contents[i]!==undefined)node.innerHTML=contents[i];}));
      ['sideCount','loadingTitle'].forEach(id=>{const el=document.getElementById(id);if(theme.idStyles[id])el.setAttribute('style',theme.idStyles[id]);else el.removeAttribute('style');});
      document.querySelectorAll('.kpi-icon').forEach((node,i)=>{if(theme.kpiIcons[i])node.innerHTML=theme.kpiIcons[i];});
      document.querySelectorAll('.sidebar .nav-btn:not(#erp-open-settings) .nav-icon').forEach((node,i)=>{if(theme.navIcons[i])node.innerHTML=theme.navIcons[i];});
      renderedTheme=state.theme;
      ERPThemeRuntime.mount(state.theme);
      const mascot=decor.querySelector('[class$="-mascot"]');
      if(mascot){mascot.setAttribute('tabindex','0');mascot.setAttribute('role','button');mascot.setAttribute('aria-label',mascot.title||'Mascote: clique para descobrir a surpresa');mascot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mascot.click();}});}
    }
    ERPThemeRuntime.refresh();
    grid.querySelectorAll('.erp-theme-card').forEach(card=>{
      const selected=card.dataset.theme===state.theme;
      card.setAttribute('aria-pressed',String(selected));
      card.querySelector('.erp-card-state').textContent=selected?'✓ Em uso':'Aplicar tema';
    });
    window.ERPGlassyThemeCarousel?.sync();
    // Bar percentages share the exact same palette as the doughnut.
    window.syncTypesChartPalette?.();
    const colorHost=document.getElementById('erpTypeInsights')?.closest('.analytics');
    const palette=window.ERPChartPalette?.forTheme(theme);
    if(colorHost && palette) ['--erp-onus','--erp-acordo','--erp-exito','--erp-inativacao'].forEach((k,i)=>colorHost.style.setProperty(k,palette.types[i]));
    if (palette?.types?.[3]) document.documentElement.style.setProperty('--erp-inativacao',palette.types[3]);
    document.getElementById('erp-active-label').textContent='Em uso: '+theme.name;
    document.getElementById('erp-layout').value=state.layout;
    document.getElementById('erp-density').value=state.density;
    document.getElementById('erp-effects').checked=state.effects;
    if(changed||previousLayout!==state.layout||previousDensity!==state.density)scheduleChartPaint();
    previousLayout=state.layout;previousDensity=state.density;
  }
  document.addEventListener('erp:appearance-change',syncView);
  // The plugin runs for every new chart created by the unmodified original render.
  // Snapshots contain only presentation properties; numbers and labels are untouched.
  if(window.Chart) {
    const datasetKeys=['backgroundColor','borderColor','borderWidth','fill','tension','pointRadius','pointBackgroundColor','pointBorderColor','pointBorderWidth'];
    Chart.register({id:'erpAppearance',beforeUpdate(chart){
      const activeTheme=api.themes[api.state.theme];
      const preset=activeTheme.charts[chart.canvas?.id];if(!preset)return;
      const palette=window.ERPChartPalette?.forTheme(activeTheme);
      chart.data.datasets.forEach(d=>datasetKeys.forEach(key=>{if(key in preset.style)d[key]=structuredClone(preset.style[key]);else delete d[key];}));
      const opts=preset.options;
      if(chart.config.type==='doughnut') {
        // Chart Fase 4.1: mantém as cores específicas de cada tema, aprimorando a apresentação.
        chart.options.cutout='72%';
        const colors=palette?.types || preset.style.backgroundColor || [];
        const blend=(hex,light,amount)=>{
          if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
          return '#'+[1,3,5].map(i=>{
            const c=parseInt(hex.slice(i,i+2),16);
            return Math.round(c*(1-amount)+light*amount).toString(16).padStart(2,'0');
          }).join('');
        };
        const h=Math.max(chart.height||chart.canvas?.height||310,1);
        const ctx=chart.ctx;
        chart.data.datasets.forEach(dataset=>{
          dataset.backgroundColor=colors.map(hex=>{
            const g=ctx.createLinearGradient(0,0,h*.15,h);
            g.addColorStop(0,blend(hex,255,.28));
            g.addColorStop(.5,hex);
            g.addColorStop(1,blend(hex,0,.16));
            return g;
          });
          dataset.borderWidth=0; dataset.borderRadius=9;
          dataset.spacing=5;dataset.hoverOffset=9;
        });
      }
      if(chart.config.type==='line' && palette){
        chart.data.datasets.forEach(d=>{
          d.borderColor=palette.line;
          d.backgroundColor=palette.lineFill;
          d.pointBackgroundColor=palette.linePoint;
          d.pointBorderColor=palette.line;
        });
      }
      const legend=chart.options.plugins.legend;
      if(opts.plugins?.legend){
        const spec=opts.plugins.legend;legend.display=chart.config.type==='doughnut'?false:(spec.display??true);legend.position=spec.position??'top';
        if(spec.labels){Object.assign(legend.labels,spec.labels);legend.labels.color=spec.labels.color??Chart.defaults.color;legend.labels.font={...Chart.defaults.font,...spec.labels.font};}
      }
      if(chart.config.type==='line')['x','y'].forEach(axis=>{
        const spec=opts.scales?.[axis]||{};
        chart.options.scales[axis].ticks.color=spec.ticks?.color??Chart.defaults.color;
        chart.options.scales[axis].ticks.font={...Chart.defaults.font,...spec.ticks?.font};
        chart.options.scales[axis].grid.color=spec.grid?.color??Chart.defaults.borderColor;
        chart.options.scales[axis].grid.display=spec.grid?.display??true;
      });
    }});
  }
  syncView();
})();
