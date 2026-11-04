(() => {
  'use strict';
  const STORAGE_KEY = 'aurora_live_events_v1';
  const COOLDOWN_MS = 45 * 60 * 1000;
  const DAILY_LIMIT = 3;
  const SETTLE_MS = 1500;

  function validateResponse(raw, context) {
    let data;
    try { data = JSON.parse(raw); } catch (_) { return null; }
    if (data?.evento !== context.evento || typeof data.mensagem !== 'string') return null;
    let text = data.mensagem.trim();
    if (!text || text.length > 320 || /[<>\n]/.test(text)) return null;
    let invalidToken = false;
    const withoutTokens = text.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => {
      if (!Object.hasOwn(context.tokens, key)) invalidToken = true;
      return '';
    });
    // A IA não escreve números livres: só pode citar tokens calculados pelo ERP.
    // Resposta que inventa números, percentuais ou placeholders usa o fallback.
    if (invalidToken || /[\d{}%]|R\$/.test(withoutTokens)) return null;
    if (/\b(um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|vinte|trinta|cem|mil)\s+(casos?|encerramentos?|por cento|dias?|reais)\b/i.test(withoutTokens)) return null;
    if (/dobrou|triplicou|duplicou|metade|duas vezes/i.test(withoutTokens)) return null;
    if (!context.flags.recorde && /novo recorde|recorde (batido|superado)|melhor dia (do ano|de todos)/i.test(withoutTokens)) return null;
    if (!context.flags.metaMensal && /meta mensal (atingida|concluída|batida)/i.test(withoutTokens)) return null;
    if (!context.flags.acimaMedia && /acima da média/i.test(withoutTokens)) return null;
    text = text.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => context.tokens[key]);
    return text.length <= 320 ? text : null;
  }

  function create(onObservation) {
    if(window.AuroraAutonomy)return window.AuroraAutonomy.create(onObservation);
    let memory = { seen: {}, day: '', count: 0, lastAt: 0 };
    let committed = null, current = null, currentInsights = null, signature = '';
    let pending = null, timer = null, flight = null, revision = 0, analyticalPending = false;

    function readLedger() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && typeof saved.seen === 'object' && saved.seen !== null) memory = {
          seen: saved.seen, day: String(saved.day || ''), count: Math.max(0, Number(saved.count) || 0), lastAt: Number(saved.lastAt) || 0, analyticalSource: typeof saved.analyticalSource === 'string' ? saved.analyticalSource : ''
        };
      } catch (_) {}
      return memory;
    }

    function saveLedger(ledger) {
      // Mantém somente um histórico curto de IDs, nunca processos ou credenciais.
      ledger.seen = Object.fromEntries(Object.entries(ledger.seen).sort((a, b) => b[1] - a[1]).slice(0, 100));
      memory = ledger;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger)); } catch (_) {}
    }

    function localObservation() {
      return currentInsights?.events.find(e => !e.type.startsWith('cases-') && e.type !== 'streak-5') || currentInsights?.common;
    }

    function cancel() {
      clearTimeout(timer); timer = null;
      if (flight) flight.abort();
      flight = null;
      revision++;
    }

    async function generate(event, expectedRevision) {
      const ledger = readLedger();
      if (ledger.seen[event.id] || !current || document.hidden) return;
      ledger.seen[event.id] = Date.now();
      if (ledger.day !== current.today) { ledger.day = current.today; ledger.count = 0; }
      const integrated = !!event.integration;
      if (window.AuroraIntegration && !integrated) { saveLedger(ledger); return; }
      const ai = integrated ? window.AuroraIntegrationAI : window.AuroraLiveAI;
      const allowed = ledger.count < DAILY_LIMIT && Date.now() - ledger.lastAt >= COOLDOWN_MS && ai?.available();
      if (!allowed) { saveLedger(ledger); return; }
      ledger.count++;
      ledger.lastAt = Date.now();
      saveLedger(ledger); // Reserva antes da rede: reload/erro não repete o evento.
      const context = AuroraLiveInsights.context(event, current);
      const controller = new AbortController();
      flight = controller;
      try {
        let text;
        if (integrated) {
          const result = await window.AuroraIntegration.generate(event.integration, { signal: controller.signal });
          if (result.source === 'groq') text = result.sections.flatMap(s => s.paragraphs).join(' ');
        } else if (window.AuroraIntegration) { return; }
        else { const raw = await ai.generate(context, { signal: controller.signal }); text = validateResponse(raw, context); }
        if (text && expectedRevision === revision && !controller.signal.aborted) {
          onObservation({ ...event, text, source: 'ai', fact: integrated ? '' : event.text });
        }
      } catch (_) {
        // O comentário local já está visível. Falha generativa não bloqueia o ERP.
      } finally {
        if (flight === controller) flight = null;
      }
    }

    function schedule() {
      clearTimeout(timer);
      if (!pending && !analyticalPending) return;
      timer = setTimeout(async () => {
        timer = null;
        let event = pending;
        pending = null;
        if (analyticalPending && window.AuroraIntegration) {
          analyticalPending = false;
          try {
            const r = AuroraIntegration.live(), ledger = readLedger(), seen = ledger.seen;
            if (ledger.analyticalSource === r.signature) return;
            ledger.analyticalSource = r.signature; saveLedger(ledger);
            const choices = r.claims.map(c => ({c,id:'integration:'+c.observationKey}));
            const choice = choices.find(x => !seen[x.id]);
            if (choice) {
              const selected = AuroraIntegration.focus(r,choice.c.id);
              const local = AuroraIntegration.local(selected);
              event = {id:choice.id,type:'analytical',category:choice.c.kind,priority:65,label:'Leitura contextual',text:local.text,source:'erp',integration:selected};
              onObservation(event);
            }
          } catch (_) {}
        }
        if (!event || (!event.integration && !currentInsights.events.some(e => e.id === event.id))) return;
        const expectedRevision = revision;
        // Web Locks evita duas abas usando simultaneamente a mesma reserva.
        if (navigator.locks?.request) {
          try {
            await navigator.locks.request('aurora-live-generation', { ifAvailable: true }, lock => lock ? generate(event, expectedRevision) : undefined);
          } catch (_) {}
        } else {
          await generate(event, expectedRevision);
        }
      }, SETTLE_MS);
    }

    function refresh(metrics, insights, confirmed = false) {
      const nextSignature = JSON.stringify(metrics);
      if (nextSignature !== signature) {
        cancel();
        const dayChanged = current && current.today !== metrics.today;
        if (dayChanged) { pending = null; committed = null; }
        signature = nextSignature;
        current = metrics;
        currentInsights = insights;
        if (pending) pending = insights.events.find(e => e.id === pending.id) || null;
        onObservation(localObservation());
      } else {
        currentInsights = insights;
      }
      if (!confirmed) return;
      // A primeira carga é uma referência; não transforma conquistas antigas em notificações.
      if (!committed || committed.today !== metrics.today) { committed = metrics; return; }
      const previous = new Set(AuroraLiveInsights.events(committed).map(e => e.id));
      const ledger = readLedger();
      const candidates = insights.events.filter(e => !previous.has(e.id) && !ledger.seen[e.id]);
      committed = metrics;
      analyticalPending = !!window.AuroraIntegration;
      const chosen = [...candidates, ...(pending ? [pending] : [])].sort((a, b) => b.priority - a.priority)[0];
      if (chosen) {
        pending = chosen;
        onObservation(chosen);
      }
      schedule();
    }

    function suspend() { cancel(); pending = null; analyticalPending = false; }
    return Object.freeze({ refresh, suspend });
  }

  window.AuroraLivePersonality = Object.freeze({ create, validateResponse, STORAGE_KEY, COOLDOWN_MS, DAILY_LIMIT });
})();
