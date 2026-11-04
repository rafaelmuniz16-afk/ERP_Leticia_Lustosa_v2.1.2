// ==== RADAR: 15 DIAGNÓSTICOS EM TEMPO REAL ====
let diagnosticIndex = 0;
let diagnosticTimer = null;

function get15BusinessDiagnostics() {
  const c = calculate();
  const f = calcFinancial(c);
  const hoje = getTodayLocal();
  const casosHoje = bd.filter(d => normalizeDate(d.data) === hoje && getMesCorreto(d) === c.month).length;

  const now = new Date();
  const year = now.getFullYear();
  const idx = parseInt(c.month, 10) - 1;
  let startMes = new Date(year, idx, 1);
  let endMes = new Date(year, idx + 1, 0);
  let diasUteisTotais = 0;
  let diasUteisRestantes = 0;

  for (let d = new Date(startMes); d <= endMes; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) diasUteisTotais++;
  }

  if (idx === now.getMonth()) {
    for (let d = new Date(now); d <= endMes; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) diasUteisRestantes++;
    }
  } else if (idx > now.getMonth()) {
    diasUteisRestantes = diasUteisTotais;
  } else {
    diasUteisRestantes = 0;
  }

  const pctMeta = c.meta > 0 ? (c.reais / c.meta) * 100 : 0;
  const taxaHomologacao = c.quant > 0 ? Math.round((c.reais / c.quant) * 100) : 0;
  const ganhoPerdidoRecusados = c.recusados * 3;
  const diferencaPara100 = Math.max(0, f.idealTotal - f.total);

  let projecaoFechamento = c.reais;
  let diasDecorridos = Math.max(1, diasUteisTotais - diasUteisRestantes);
  if (diasDecorridos > 0 && diasUteisRestantes > 0) {
    let mediaDiaria = c.reais / diasDecorridos;
    projecaoFechamento = Math.round(c.reais + (mediaDiaria * diasUteisRestantes));
  }

  const d = [];
  d.push('📈 Projeção: ritmo para fechar o mês com ~' + projecaoFechamento + ' casos reais.');
  if (pctMeta >= 100) d.push('🏆 Faixa máxima (100%) garantida no bolso com honras!');
  else if (pctMeta >= 90) d.push('🎯 Faixa de 90% ativa! Faltam só ' + Math.max(0, c.meta - c.reais) + ' casos p/ 100%');
  else if (pctMeta >= 80) d.push('💰 Faixa de 80% atingida! Faltam ' + Math.max(0, Math.ceil(c.meta * 0.9) - c.reais) + ' p/ 90%');
  else d.push('🎯 Faltam ' + Math.max(0, Math.ceil(c.meta * 0.8) - c.reais) + ' casos reais para ativar o bônus (80%)');

  d.push('💵 Ganho real atual consolidado: ' + formatMoney(f.total));
  if (diferencaPara100 > 0) d.push('✨ Bater 100% adiciona +' + formatMoney(diferencaPara100) + ' de bônus na sua conta');
  else d.push('⭐ Bônus máximo conquistado: teto financeiro de ' + formatMoney(f.idealTotal) + '!');

  d.push('⏱️ Meta diária necessária: ' + dailyTarget(c.faltaReais, c.month));
  d.push('⚡ Hoje você já registrou ' + casosHoje + ' caso(s) neste mês');
  d.push('✅ Taxa de conversão Panjud: ' + taxaHomologacao + '% dos seus casos foram homologados');

  if (c.recusados > 0) d.push('⚠️ ' + c.recusados + ' recusado(s) Panjud tiraram ~' + formatMoney(ganhoPerdidoRecusados) + ' da meta real');
  else d.push('💎 Zero recusados no Panjud: precisão operacional de 100%!');

  d.push('💼 Ônus (R$ 4 a 100%): ' + c.onus + ' casos = ' + formatMoney(f.idealOnus));
  d.push('🤝 Acordo (R$ 3 a 100%): ' + c.acordo + ' casos = ' + formatMoney(f.idealAcordo));
  d.push('🎉 Êxito (R$ 2 a 100%): ' + c.exito + ' casos = ' + formatMoney(f.idealExito));
  d.push('📁 Inativação (R$ 1 a 100%): ' + c.inativacao + ' casos = ' + formatMoney(f.idealInativacao));
  d.push('📊 Balanço: ' + c.quant + ' casos cadastrados contra ' + c.reais + ' confirmados Panjud');
  d.push('📅 Restam ' + diasUteisRestantes + ' dia(s) útil(eis) de trabalho até fechar o mês');

  if (c.quant > 0) {
    const [maxTipo, maxCount] = [['Ônus',c.onus], ['Acordo',c.acordo], ['Êxito',c.exito], ['Inativação',c.inativacao]].reduce((a,b)=>b[1]>a[1]?b:a);
    const maxPct = Math.round(maxCount / c.quant * 100);
    d.push('📌 Mix: ' + maxTipo + ' é o tipo líder representando ' + maxPct + '% da carteira');
  } else {
    d.push('📌 Cadastre encerramentos para traçar o mix da carteira');
  }

  d.push('🏁 Placar global: ' + c.reais + ' de ' + c.meta + ' necessários (' + pctMeta.toFixed(1) + '% batido)');
  return d;
}

// Orquestra o card existente. Fórmulas financeiras acima permanecem intactas.
let diagnosticFadeTimer = null;
let diagnosticPaused = false;
let liveMetrics = null;
let liveInsights = null;
let liveCache = null;
let liveRenderSignature = '';
const livePersonality = AuroraLivePersonality.create(item => {
  AuroraLiveView.observation(item);
  // Receipt only: no message text, credentials, new generation or ledger changes.
  try { window.AuroraMemory?.observePresentation({ type: item?.type, source: item?.source === 'ai' ? 'ai' : 'local' }, getTodayLocal()); } catch (_) {}
});

// Históricos amplos cedem tempo ao navegador; o catálogo fica atualizado ao concluir.
window.addEventListener('aurora:achievements-ready', event => {
  if (liveMetrics) liveInsights = AuroraLiveInsights.build(liveMetrics, get15BusinessDiagnostics(), event.detail);
});

function refreshAuroraLive(options = {}) {
  const today = getTodayLocal();
  const goal = metas[today.slice(5, 7)];
  const dirty = options.confirmed || !liveCache || liveCache.rows !== bd || liveCache.length !== bd.length || liveCache.today !== today || liveCache.goal !== goal;
  if (dirty) {
    try { window.AuroraMemory?.schedule(bd, lastConfirmedMetas, today); } catch (_) {}
    liveMetrics = AuroraLiveMetrics.build(bd, metas, today);
    const progression = window.AuroraAchievements?.refresh(bd, today, !!options.confirmed) || null;
    liveInsights = AuroraLiveInsights.build(liveMetrics, get15BusinessDiagnostics(), progression);
    liveCache = { rows: bd, length: bd.length, today, goal };
    const signature = JSON.stringify(liveMetrics);
    if (signature !== liveRenderSignature) {
      AuroraLiveView.render(liveMetrics, liveInsights);
      liveRenderSignature = signature;
    }
  }
  livePersonality.refresh(liveMetrics, liveInsights, !!options.confirmed);
  refreshBusinessDiagnostic();
}

// Atualizar valores não navega: filtros, cadastros e sincronização mantêm o índice.
function refreshBusinessDiagnostic() {
  if (!$('sideAuroraMsg') || diagnosticFadeTimer !== null) return;
  const pool = AuroraLiveInsights.financial(get15BusinessDiagnostics());
  if (pool.length) AuroraLiveView.radar(pool[diagnosticIndex], diagnosticIndex, pool.length);
}

function rotateBusinessDiagnostic() {
  const msgEl = $('sideAuroraMsg');
  if (!msgEl) return;
  refreshAuroraLive();
  const pool = AuroraLiveInsights.financial(get15BusinessDiagnostics());
  if (!pool.length) return;
  diagnosticIndex = (diagnosticIndex + 1) % pool.length;
  clearTimeout(diagnosticFadeTimer);
  msgEl.style.opacity = '0.25';
  diagnosticFadeTimer = setTimeout(() => {
    diagnosticFadeTimer = null;
    // Usa os dados atuais, mesmo que tenham sido sincronizados durante o fade.
    refreshBusinessDiagnostic();
    msgEl.style.opacity = '1';
  }, 220);
}

function stopDiagnosticLoop() {
  clearInterval(diagnosticTimer); diagnosticTimer = null;
  const pendingAdvance = diagnosticFadeTimer !== null;
  clearTimeout(diagnosticFadeTimer); diagnosticFadeTimer = null;
  // Conclui somente um avanço que já veio do botão ou do intervalo.
  if (pendingAdvance) refreshBusinessDiagnostic();
  if ($('sideAuroraMsg')) $('sideAuroraMsg').style.opacity = '1';
}

function startDiagnosticLoop(confirmed = true) {
  refreshAuroraLive({ confirmed });
  // Reentrante: sincronizar não reinicia a posição nem a cadência em andamento.
  if (diagnosticTimer === null && !document.hidden && !diagnosticPaused) diagnosticTimer = setInterval(rotateBusinessDiagnostic, 8500);
}

function toggleDiagnosticRotation() {
  diagnosticPaused = !diagnosticPaused;
  $('auroraRadarPause').textContent = diagnosticPaused ? 'Retomar' : 'Pausar';
  $('auroraRadarPause').setAttribute('aria-pressed', String(diagnosticPaused));
  if (diagnosticPaused) stopDiagnosticLoop();
  else startDiagnosticLoop(false);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopDiagnosticLoop(); livePersonality.suspend(); }
  else startDiagnosticLoop(false);
});
window.addEventListener('pagehide', () => { stopDiagnosticLoop(); livePersonality.suspend(); });
window.addEventListener('pageshow', () => { if (!document.hidden) startDiagnosticLoop(false); });
