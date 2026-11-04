(() => {
  'use strict';
  if (window.AuroraAgentReady) return;
  const base = document.currentScript.src;
  const local = location.protocol === 'file:';
  const version = new URL(base).searchParams.get('v');
  const module = new URL('../auroraAgent.js', base), bundle = new URL('agent.bundle.js', base);
  if (version) { module.searchParams.set('v', version); bundle.searchParams.set('v', version); }
  const moduleURL = module.href, bundleURL = bundle.href;
  // file:// não permite imports ES em navegadores comuns. O bundle local é
  // gerado dos MESMOS módulos; HTTP/GitHub Pages preserva os imports originais.
  const load = local ? new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = bundleURL;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Não foi possível carregar js/aurora/agent.bundle.js.'));
    document.head.append(script);
  }) : import(moduleURL);
  let timeout;
  const deadline = new Promise((_,reject) => {
    timeout = setTimeout(() => reject(new Error('O carregamento da Aurora demorou demais. Confira a conexão e os arquivos do projeto.')),15000);
  });
  window.AuroraAgentReady = Promise.race([load,deadline]).then(() => {
    if (typeof window.processarMensagemAurora !== 'function') throw new Error('O agente não registrou o manipulador de mensagens.');
    document.dispatchEvent(new CustomEvent('aurora:ready'));
    return window.processarMensagemAurora;
  }).finally(() => clearTimeout(timeout));
  // Evita rejeição não tratada quando a carga falha antes do primeiro envio.
  // processAI aguarda a Promise original e informa o erro, sem perder o texto.
  window.AuroraAgentReady.catch(() => {
    const state = document.getElementById('aiState');
    if (state) state.textContent = 'Aurora indisponível · confira o carregamento';
  });
})();
