window.ERPThemeEffects["claro"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);


(function() {
  const quantumSparks = ['✦', '✨', '💎', '🔷', '⚡', '💫', '🌟'];
  const executiveAudio = new Audio('./musica.mp3');
  executiveAudio.preload = 'none';

  function popQuantum(x, y) {
    const amount = 8;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = 'gemini-spark';
      el.textContent = quantumSparks[Math.floor(Math.random() * quantumSparks.length)];
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      const angle = (Math.PI * 2 * i / amount) + Math.random() * 0.55;
      const dist = 26 + Math.random() * 45;
      el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist - 16).toFixed(1) + 'px');
      el.style.setProperty('--rot', ((-45 + Math.random() * 90).toFixed(1)) + 'deg');
      el.style.color = ['#0284c7', '#2563eb', '#7c3aed', '#db2777'][Math.floor(Math.random() * 4)];
      scope.append(el);
      setTimeout(() => el.remove(), 900);
    }
  }

  window.popQuantum = popQuantum;

  scope.listen(document,'click', e => {
    const t = e.target;
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .gemini-mascot, .side-aurora-card')) {
      popQuantum(e.clientX, e.clientY);
    }
  });

  const masc = document.getElementById('geminiMascot');
  const bubble = document.getElementById('geminiBubble');
  let geminiClicks = 0;
  let bubbleResetTimer = null;

  if (masc && bubble) {
    scope.listen(masc,'click', (e) => {
      geminiClicks++;
      popQuantum(e.clientX, e.clientY);

      if (geminiClicks === 1) {
        executiveAudio.load();
      }

      if (geminiClicks === 10) {
        geminiClicks = 0;
        bubble.textContent = 'ACESSO RESTRITO DESBLOQUEADO 💖';

        Swal.fire({
          title: '<span style="font-family:Manrope,sans-serif;font-size:24px;font-weight:800;background:linear-gradient(135deg,#0284c7,#db2777);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:inline-block;letter-spacing:-0.5px;">PARA O MEU AMOR, LETÍCIA ✨💖</span>',
          html: `
            <div class="executive-photo-box">
              <img src="${scope.photo}" alt="Te amo eternamente!" decoding="async">
            </div>
            <div style="font-size:13.5px; color:#475569; font-weight:500; line-height:1.7; margin:16px auto 0; max-width:440px; text-align:center;">
              Você desbloqueou o coração deste sistema... e o meu também! 🌟<br>
              Ver a sua inteligência, determinação e foco profissional todos os dias me enche de orgulho e admiração.<br>
              Você é a pessoa mais incrível que já conheci, minha melhor parceira de vida e o meu maior amor.<br>
              <span style="color:#2563eb; font-size:15.5px; font-weight:800; display:inline-block; margin-top:8px;">
                Eu te amo com todo o meu coração, hoje e para sempre! 💕🚀
              </span>
            </div>
          `,
          background: '#ffffff',
          backdrop: 'rgba(15, 23, 42, 0.45)',
          confirmButtonText: 'Eu Te Amo Infinitamente 💖',
          confirmButtonColor: '#2563eb',
          customClass: { popup: 'swal2-executive-light-popup' },
          willOpen: () => {
            executiveAudio.currentTime = 0;
            executiveAudio.play().catch(err => console.log('Autoplay dependente de interação:', err));
            for (let i = 0; i < 40; i++) {
              setTimeout(() => {
                const rx = Math.random() * (window.innerWidth - 60) + 30;
                const ry = Math.random() * (window.innerHeight * 0.7) + 50;
                popQuantum(rx, ry);
              }, i * 60);
            }
          },
          didClose: () => {
            executiveAudio.pause();
            executiveAudio.currentTime = 0;
          }
        });
        return;
      }

      const msgs = [
        'Núcleo Gemini operando com excelência. ✦',
        'Produtividade e foco em nível máximo, Letícia! 📊',
        'Eu tenho um orgulho imenso de você! 💖',
        'Conexão estável e métricas em ascensão! 🚀',
        'Você é brilhante em tudo que faz! ✨',
        'Protocolo de segurança: faltam ' + (10 - geminiClicks) + ' toques... 👀',
        'Descriptografando mensagem especial... 🤫'
      ];
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      clearTimeout(bubbleResetTimer);
      bubbleResetTimer = setTimeout(() => {
        bubble.textContent = 'Sistemas prontos, Letícia. ✨';
      }, 2600);
    });
  }

  const origToast = window.toast;
  window.toast = function(icon, title) {
    if (typeof origToast === 'function') origToast(icon, title);
    if (window.innerWidth > 700) popQuantum(window.innerWidth - 48, 85);
  };
})();

};
