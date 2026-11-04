// js/core/aurora.js - Ponte Oficial entre ERP e Aurora Agent

function summarizeForAI() {
  const by = {};
  if (typeof bd !== 'undefined' && Array.isArray(bd)) {
    bd.forEach(d => {
      const m = typeof getMesCorreto === 'function' ? getMesCorreto(d) : d.mesReferencia;
      if (!by[m]) by[m] = { total: 0, onus: 0, acordo: 0, exito: 0, inativacao: 0, recusados: 0, reais: 0 };
      by[m].total++;
      if (d.tipo === 'Ônus') by[m].onus++;
      if (d.tipo === 'Acordo') by[m].acordo++;
      if (d.tipo === 'Êxito') by[m].exito++;
      if (d.tipo === 'Inativação') by[m].inativacao++;
      if (d.recusado === 'Sim') by[m].recusados++;
      if (d.panjud === 'Sim') by[m].reais++;
    });
  }
  return by;
}

function appendMessage(sender, text) {
  const container = $('chatMessages');
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap ' + sender;
  const msg = document.createElement('div');
  msg.className = 'msg ' + sender;
  msg.innerHTML = typeof safeText === 'function' ? safeText(text) : text;
  wrap.appendChild(msg);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function obterContextoERP() {
  return {
    $: typeof $ === 'function' ? $ : (id => document.getElementById(id)),
    // GETTERS DINÂMICOS: se o loadCloud() recriar o bd, o agente pega o array novo na hora
    get bd() { return typeof bd !== 'undefined' ? bd : []; },
    get metas() { return typeof metas !== 'undefined' ? metas : {}; },
    get memoriaIA() { return typeof memoriaIA !== 'undefined' ? memoriaIA : []; },
    calculate: typeof calculate === 'function' ? calculate : (() => ({})),
    refreshAuroraLive: typeof refreshAuroraLive === 'function' ? refreshAuroraLive : (() => {}),
    renderAll: typeof renderAll === 'function' ? renderAll : (() => {}),
    updateMetaInput: typeof updateMetaInput === 'function' ? updateMetaInput : (() => {}),
    saveRecord: typeof saveRecord === 'function' ? saveRecord : (async () => {}),
    registrarLog: typeof registrarLog === 'function' ? registrarLog : (() => {}),
    toast: typeof toast === 'function' ? toast : (() => {}),
    formatarProcessoCNJ: typeof formatarProcessoCNJ === 'function' ? formatarProcessoCNJ : (p => p),
    validarDigitoCNJ: typeof validarDigitoCNJ === 'function' ? validarDigitoCNJ : (() => true),
    getTodayLocal: typeof getTodayLocal === 'function' ? getTodayLocal : (() => new Date().toISOString().split('T')[0]),
    getSelectedMonth: typeof getSelectedMonth === 'function' ? getSelectedMonth : (() => '10'),
    getMesCorreto: typeof getMesCorreto === 'function' ? getMesCorreto : (r => r.mesReferencia),
    uid: typeof uid === 'function' ? uid : (() => Math.random().toString(36).slice(2)),
    renderLogs: typeof renderLogs === 'function' ? renderLogs : (() => {}),
    setCurrentPage: (p) => { if (typeof currentPage !== 'undefined') currentPage = p; },
    serverMutation: typeof serverMutation === 'function' ? serverMutation : (window.serverMutation ? window.serverMutation : null),
    loadCloud: typeof loadCloud === 'function' ? loadCloud : (window.loadCloud ? window.loadCloud : null),
    API_URL: typeof API_URL !== 'undefined' ? API_URL : '',
    get apiKey() {
      // 1. Prioridade: Célula B9 da aba Metas na Planilha
      if (typeof metas !== 'undefined' && metas) {
        if (metas.B9 && String(metas.B9).startsWith('gsk_')) return String(metas.B9).trim();
        if (metas.b9 && String(metas.b9).startsWith('gsk_')) return String(metas.b9).trim();
        for (const [k, v] of Object.entries(metas)) {
          if (typeof v === 'string' && v.trim().startsWith('gsk_')) return v.trim();
        }
      }
      // 2. Fallback: chave no localStorage
      const storedKey = typeof AI_KEY !== 'undefined' ? localStorage.getItem(AI_KEY) : '';
      return String((typeof apiKey !== 'undefined' && apiKey ? apiKey : storedKey) || localStorage.getItem('groq_api_key') || '').trim();
    },
    appendMessage,
    summarizeForAI,
    configAPIKey
  };
}
window.obterContextoERP = obterContextoERP;

// O processAI() é o único manipulador oficial do envio do chat.
// O carregador fornece a mesma Promise para botão, Enter e inicialização.
let auroraEnvioPendente = false;
async function processAI() {
  const input = $('chatInputText');
  if (!input) return;
  const text = input.value.trim();
  if (!text || auroraEnvioPendente) return;
  auroraEnvioPendente = true;
  const sendButton = $('btnChatSend');
  const state = $('aiState');
  if (sendButton) sendButton.disabled = true;
  input.setAttribute('aria-busy', 'true');
  try {
    if (state) state.textContent = 'Conectando à Aurora…';
    if (typeof window.processarMensagemAurora !== 'function') {
      if (!window.AuroraAgentReady) throw new Error('O módulo da Aurora não foi carregado. Confira os arquivos js/aurora e atualize a página.');
      await window.AuroraAgentReady;
    }
    if (typeof window.processarMensagemAurora !== 'function') throw new Error('Não foi possível inicializar a Aurora. Atualize a página e tente novamente.');
    let context = obterContextoERP();
    if (!context.apiKey && !window.ERPGoalMetrics?.analyze(text)) {
      await configAPIKey();
      context = obterContextoERP();
      if (!context.apiKey) { if (state) state.textContent = 'Aguardando chave Groq · mensagem preservada'; return; }
    }
    // Obtém o contexto após a carga/configuração, para não enviar um snapshot antigo.
    const payload = { text, viaVoz: false, apiKey: context.apiKey, context };
    if (input.value.trim() === text) input.value = '';
    if (state) state.textContent = 'Aurora está respondendo…';
    const result = await window.processarMensagemAurora(payload);
    if (result?.accepted === false && !input.value) input.value = text;
    if (state) state.textContent = result?.reason === 'busy' ? 'Aguarde a resposta em andamento' : result?.error ? 'Não foi possível concluir · tente novamente' : 'Pronta para operar';
    return result;
  } catch (error) {
    if (!input.value) input.value = text;
    appendMessage('system', 'Não foi possível enviar: ' + error.message + ' Sua mensagem foi preservada.');
    if (state) state.textContent = 'Falha no envio · tente novamente';
  } finally {
    auroraEnvioPendente = false;
    if (sendButton) sendButton.disabled = false;
    input.removeAttribute('aria-busy');
  }
}

async function configAPIKey() {
  const currentKey = typeof apiKey !== 'undefined' ? apiKey : (localStorage.getItem('groq_api_key') || '');
  const result = await Swal.fire({
    title: 'Chave Groq Cloud',
    input: 'password',
    inputValue: currentKey,
    inputLabel: 'A chave pode vir da célula B9 da aba Metas na planilha ou salva manualmente aqui.',
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#4f46e5',
    inputAttributes: { autocomplete: 'off' }
  });
  if (result.isConfirmed) {
    const novaChave = (result.value || '').trim();
    if (typeof apiKey !== 'undefined') apiKey = novaChave;
    // Usa a mesma chave já declarada em config-state.js, sem migrar dados na carga.
    const storageKey = typeof AI_KEY !== 'undefined' ? AI_KEY : 'groq_api_key';
    if (novaChave) localStorage.setItem(storageKey, novaChave);
    else { localStorage.removeItem(storageKey); localStorage.removeItem('groq_api_key'); }
    if (typeof toast === 'function') toast('success', novaChave ? 'Chave salva com sucesso!' : 'Chave removida.');
    if ($('aiState')) $('aiState').textContent = novaChave ? 'Pronta para operar' : 'Aguardando chave Groq';
  }
}

function openAI() {
  $('aiDrawer')?.classList.add('ai-open');
  $('aiDrawer')?.setAttribute('aria-hidden', 'false');
  $('chatInputText')?.focus();
}

function closeAI() {
  $('aiDrawer')?.classList.remove('ai-open');
  $('aiDrawer')?.setAttribute('aria-hidden', 'true');
}
