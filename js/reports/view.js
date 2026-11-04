(() => {
  'use strict';
  let openDialog;
  const $ = id => document.getElementById(id);
  async function copyText(text, field) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
    }
    const active = document.activeElement, start = field.selectionStart, end = field.selectionEnd;
    field.focus(); field.select(); field.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = typeof document.execCommand === 'function' && document.execCommand('copy'); } catch (_) {}
    if (copied) { field.setSelectionRange(start, end); active?.focus({ preventScroll: true }); }
    return !!copied; // Em falha, mantém a seleção para Ctrl+C/toque longo.
  }
  function bind() {
    const dialog = $('erpSummaryDialog'), opener = $('erpSummaryOpen'), preview = $('erpSummaryPreview');
    if (!dialog || !opener || dialog.dataset.bound) return;
    dialog.dataset.bound = 'true';
    let selection = null, metrics = null, dirty = false, generated = false;
    let pending = null, flight = null, generation = 0, generating = false, copying = false, valid = true;
    const modeInputs = [...dialog.querySelectorAll('[name=erpSummaryMode]')];
    const controls = [...modeInputs, $('erpSummaryPeriod'), $('erpSummaryFinance'), $('erpSummaryStart'), $('erpSummaryEnd')];
    const status = message => { $('erpSummaryStatus').textContent = message; };
    function currentToday() { return window.obterContextoERP().getTodayLocal(); }
    function readSelection() {
      return { mode: modeInputs.find(input => input.checked).value, period: $('erpSummaryPeriod').value,
        start: $('erpSummaryStart').value, end: $('erpSummaryEnd').value, finance: $('erpSummaryFinance').checked };
    }
    function fillControls(value) {
      modeInputs.forEach(input => { input.checked = input.value === value.mode; });
      $('erpSummaryPeriod').value = value.period; $('erpSummaryFinance').checked = value.finance;
      $('erpSummaryStart').value = value.start; $('erpSummaryEnd').value = value.end;
      syncControls();
    }
    function syncControls() {
      const current = readSelection();
      $('erpSummaryDates').hidden = current.period !== 'custom';
      $('erpSummaryGenerate').hidden = current.mode !== 'detailed';
      $('erpSummaryAIHelp').hidden = current.mode !== 'detailed';
      $('erpSummaryGenerate').disabled = generating || copying || !valid || !!pending;
      $('erpSummaryGenerate').textContent = generating ? 'Aurora analisando…' : '✦ Gerar com Aurora';
      $('erpSummaryGenerate').setAttribute('aria-busy', String(generating));
      $('erpSummaryCopy').disabled = copying || !valid || !!pending || !preview.value.trim();
      $('erpSummaryRefresh').disabled = !!pending || copying;
      controls.forEach(control => { control.disabled = !!pending || copying; });
    }
    function cancelGeneration() {
      generation++; flight?.abort(); flight = null; generating = false; syncControls();
    }
    function makeMetrics(candidate) {
      const ctx = window.obterContextoERP();
      return ERPWhatsAppMetrics.build(ctx.bd, ctx.metas, ctx.getTodayLocal(), candidate);
    }
    function render(candidate, value) {
      selection = { ...candidate }; metrics = value; dirty = false; generated = false; valid = true;
      fillControls(selection); preview.value = ERPWhatsAppMetrics.format(metrics);
      $('erpSummaryScope').textContent = 'Produção: ' + ERPWhatsAppMetrics.fmtDate(metrics.period.start) + ' a ' + ERPWhatsAppMetrics.fmtDate(metrics.period.end) + '. Acumulados mensais são identificados separadamente. Dados disponíveis no ERP, sem nova consulta à nuvem.';
      $('erpSummarySource').textContent = selection.mode === 'detailed' ? 'Base local · aguardando Aurora' : 'Simples · sem IA';
      status(selection.mode === 'detailed' ? 'Clique em Gerar com Aurora para acrescentar a análise.' : 'Resumo pronto para revisar e copiar.');
      syncControls();
    }
    function confirm(action, message) {
      pending = action; $('erpSummaryConfirm').hidden = false;
      $('erpSummaryConfirm').querySelector('p').textContent = message;
      syncControls(); $('erpSummaryKeep').focus();
    }
    function dismissConfirmation() {
      pending = null; $('erpSummaryConfirm').hidden = true; syncControls();
    }
    function update() {
      cancelGeneration();
      const candidate = readSelection();
      let value;
      try { value = makeMetrics(candidate); valid = true; }
      catch (error) { valid = false; status(error.message + ' A prévia anterior foi preservada.'); syncControls(); return; }
      if (dirty) {
        confirm(() => render(candidate, makeMetrics(candidate)), 'Você editou a prévia. Substituir sua edição pelo resumo da seleção atual?');
      } else render(candidate, value);
    }
    async function generate() {
      if (generating || copying || pending || !valid) return;
      const candidate = readSelection();
      const run = async () => {
        let value;
        try { value = makeMetrics(candidate); }
        catch (error) { status(error.message); return; }
        render(candidate, value);
        const revision = ++generation, controller = new AbortController();
        flight = controller; generating = true; syncControls(); status('Aurora analisando os indicadores agregados…');
        try {
          const comments = await ERPWhatsAppAI.generate(value, { signal: controller.signal });
          if (revision !== generation || controller.signal.aborted || !dialog.open || dirty) return;
          const latest = makeMetrics(candidate);
          if (JSON.stringify(latest) !== JSON.stringify(value)) {
            render(candidate, latest); status('A base mudou durante a análise. Prévia atualizada; gere novamente se desejar.'); return;
          }
          preview.value = ERPWhatsAppMetrics.format(value, comments); generated = true;
          const localFallback = comments?.integration === true && comments.source === 'local';
          $('erpSummarySource').textContent = localFallback ? 'Leitura local · sem IA aprovada' : 'Detalhado · Aurora AI';
          status(localFallback
            ? 'A Groq respondeu, mas a análise não passou na validação. Foi incluída uma leitura local baseada nos dados verificados do ERP, sem apresentar textos rejeitados da IA.'
            : comments?.integration
              ? 'Aurora AI · texto gerado com afirmações verificadas.' + (comments.validation === 'partial' ? ' Foram mantidos apenas os parágrafos validados.' : '') + (comments.cached ? ' Análise válida reutilizada.' : '')
              : 'Análise gerada pela Aurora. Revise antes de copiar.');
        } catch (error) {
          if (revision !== generation || controller.signal.aborted) return;
          const messages = {
            NO_API_KEY: 'Configure sua chave da Groq na Aurora para gerar a análise. O resumo simples está disponível.',
            CHAT_BUSY: 'O chat da Aurora está em uso. Aguarde a resposta; o resumo simples continua disponível.',
            AURORA_LOAD_FAILED: 'O módulo da Aurora não carregou. Recarregue a página; o resumo simples foi preservado.',
            AURORA_UNAVAILABLE: 'A Aurora ainda não está disponível. Confira seu carregamento e tente novamente.',
            ANALYTICAL_CONTEXT_UNAVAILABLE: 'A memória analítica ainda não está disponível. Aguarde a atualização do ERP e tente novamente.',
            GROQ_AUTH: 'A Groq recusou a chave configurada. Confira a chave nas configurações da Aurora.',
            GROQ_FORBIDDEN: 'A Groq recusou o acesso. Confira as permissões da chave e dos modelos na sua conta Groq.',
            GROQ_RATE_LIMIT: 'O limite de uso da Groq foi atingido. Aguarde antes de tentar novamente; o resumo simples foi preservado.',
            GROQ_TIMEOUT: 'A Groq demorou além do limite de resposta. Tente novamente em instantes; o resumo simples foi preservado.',
            GROQ_SCHEMA: 'A Groq não aceitou o formato solicitado. Atualize os arquivos da correção do WhatsApp e recarregue a página.',
            GROQ_REQUEST: 'A Groq recusou a solicitação de análise. O resumo simples foi preservado. Código: GROQ_REQUEST.',
            GROQ_UNAVAILABLE: 'O serviço da Groq está indisponível. Tente novamente mais tarde.',
            CONTEXTUAL_NETWORK_ERROR: 'Não foi possível concluir a conexão com a Groq. Confira a conexão e tente novamente.',
            CONTEXTUAL_FORMAT_REJECTED: 'A Aurora respondeu, mas o formato continuou inválido após uma tentativa de correção. Mantivemos o resumo simples.',
            CONTEXTUAL_CONTENT_REJECTED: 'A Aurora respondeu, mas não foi possível validar uma análise útil após a correção. Mantivemos o resumo simples, sem apresentar afirmações não verificadas.',
            STALE_INTEGRATION_CONTEXT: 'Os dados ou o período mudaram durante a análise. Atualize a prévia e gere novamente.',
            REPORT_BUSY: 'A geração anterior está sendo encerrada. Tente novamente em instantes.',
            TRUNCATED_REPORT_RESPONSE: 'A resposta da Aurora veio incompleta mesmo após uma nova tentativa. O resumo simples permanece disponível.',
            REPORT_REFUSED: 'A Aurora não disponibilizou uma análise para esta solicitação. O resumo simples permanece disponível.',
            INVALID_REPORT_RESPONSE: 'A Aurora não retornou uma análise compatível mesmo após uma nova tentativa. Mantivemos o resumo simples, sem análise de IA.'
          };
          status(messages[error.message] || 'Não foi possível gerar a análise agora. O resumo simples permanece disponível.');
          $('erpSummarySource').textContent = 'Simples · análise não gerada';
        } finally {
          if (revision === generation) { generating = false; flight = null; syncControls(); }
        }
      };
      if (dirty) confirm(run, 'Gerar uma análise substituirá a prévia que você editou. Deseja continuar?');
      else await run();
    }
    function close() {
      cancelGeneration(); dismissConfirmation();
      if (selection) fillControls(selection);
      valid = true; dialog.close();
    }
    let returnFocus = opener;
    openDialog = (options = {}) => {
      if (dialog.open) return;
      returnFocus = options.returnFocus || opener;
      $('erpSummaryHandoff').textContent = options.notice || '';
      $('erpSummaryHandoff').hidden = !options.notice;
      const today = currentToday(); $('erpSummaryStart').max = today; $('erpSummaryEnd').max = today;
      if (!selection) selection = { mode: 'simple', period: 'today', start: today, end: today, finance: false };
      fillControls(options.selection ? { ...selection, ...options.selection } : selection); dialog.showModal();
      if (options.selection || !dirty) update(); else status('Sua edição anterior foi preservada nesta aba. Atualizar prévia consulta os dados atuais.');
      if (!pending) $('erpSummaryClose').focus();
    };
    opener.addEventListener('click', () => openDialog());
    $('erpSummaryClose').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => { cancelGeneration(); dismissConfirmation(); if (!document.querySelector('dialog[open]')) returnFocus.focus({ preventScroll: true }); });
    // Proteção adicional para implementações incompletas de dialog.
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button,input,select,textarea')].filter(el => !el.disabled && !el.closest('[hidden]') && (el.type !== 'radio' || el.checked));
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    controls.forEach(control => control.addEventListener('change', update));
    $('erpSummaryRefresh').addEventListener('click', update);
    $('erpSummaryGenerate').addEventListener('click', generate);
    $('erpSummaryKeep').addEventListener('click', () => {
      dismissConfirmation(); fillControls(selection); valid = true;
      if (!$('erpSummaryHandoff').hidden) $('erpSummaryHandoff').textContent = 'Sua edição e o período anterior foram preservados. A solicitação de mudança de período não foi aplicada. Confira a prévia e o escopo abaixo; o resumo não aplica os filtros detalhados da Central.';
      status('Sua edição foi mantida.'); syncControls(); preview.focus();
    });
    $('erpSummaryReplace').addEventListener('click', async () => {
      const action = pending; dismissConfirmation();
      preview.focus();
      try { await action?.(); } catch (error) { status(error.message); }
    });
    preview.addEventListener('input', () => {
      dirty = true; cancelGeneration();
      $('erpSummarySource').textContent = generated
        ? ($('erpSummarySource').textContent.includes('Leitura local') ? 'Leitura local · editada por você' : 'Aurora AI · editada por você')
        : 'Editado por você';
      status('Edição preservada. A cópia usará exatamente este texto.'); syncControls();
    });
    $('erpSummaryCopy').addEventListener('click', async () => {
      if (copying || !valid || pending || !preview.value.trim()) return;
      copying = true; syncControls();
      try {
        const success = await copyText(preview.value, preview);
        if (dialog.open) status(success ? 'Resumo copiado! Cole na conversa que você escolher.' : 'Não foi possível copiar automaticamente. O texto está selecionado: use Ctrl+C, Cmd+C ou toque longo > Copiar.');
      } catch (_) { preview.focus(); preview.select(); status('Selecione e copie o texto manualmente.'); }
      finally { copying = false; syncControls(); }
    });
    window.addEventListener('pagehide', cancelGeneration);
  }
  window.ERPWhatsAppView = Object.freeze({ bind, copyText, open: options => { bind(); return openDialog?.(options); } });
  bind();
})();
