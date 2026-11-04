window.ERPThemeEffects["festa-junina"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);


// ==== FESTA JUNINA INTERATIVA & CORREIO ELEGANTE (10 CLIQUES) ====
(function() {
  const juninaEmojis = ['🌽', '🪗', '🏮', '🔥', '🎆', '🤠', '🍿', '🌾', '🍬', '✨'];
  const juninaAudio = new Audio('./musica.mp3');
  juninaAudio.preload = 'none';

  function popJunina(x, y) {
    const amount = 8;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = 'junina-particle';
      el.textContent = juninaEmojis[Math.floor(Math.random() * juninaEmojis.length)];
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      const angle = (Math.PI * 2 * i / amount) + Math.random() * 0.55;
      const dist = 28 + Math.random() * 48;
      el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist - 16).toFixed(1) + 'px');
      el.style.setProperty('--rot', ((-45 + Math.random() * 90).toFixed(1)) + 'deg');
      scope.append(el);
      setTimeout(() => el.remove(), 1000);
    }
  }

  window.popJunina = popJunina;

  scope.listen(document,'click', e => {
    const t = e.target;
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .junina-mascot, .side-aurora-card')) {
      popJunina(e.clientX, e.clientY);
    }
  });

  const masc = document.getElementById('juninaMascot');
  const bubble = document.getElementById('juninaBubble');
  let mascotClicks = 0;
  let bubbleResetTimer = null;

  if (masc && bubble) {
    scope.listen(masc,'click', (e) => {
      mascotClicks++;
      popJunina(e.clientX, e.clientY);

      if (mascotClicks === 1) {
        juninaAudio.load();
      }

      if (mascotClicks === 10) {
        mascotClicks = 0;
        bubble.textContent = 'CORREIO ELEGANTE DO RAFA! 💌🔥';

        Swal.fire({
          title: '<span style="font-family:Fredoka,sans-serif;font-size:26px;font-weight:700;color:#d9381e;display:inline-block;text-shadow:0 2px 10px rgba(217,56,30,0.2);">💌 CORREIO ELEGANTE DE SÃO JOÃO 💌</span>',
          html: `
            <div class="correio-elegante-box">
              <img src="${scope.photo}" alt="Lelê no Arraiá" decoding="async">
            </div>
            <div style="font-size:14px; color:#5c2406; font-weight:600; line-height:1.7; margin:16px auto 0; max-width:440px; text-align:center;">
              Olha a fogueira queimando o meu coração por você, Letícia! 🌽🔥<br>
              Nem toda sanfona do Nordeste, nem todo forró do Ceará consegue tocar uma música tão bonita quanto a nossa história juntos.<br>
              Você é a mulher mais talentosa, dedicada, doce e maravilhosa do mundo inteiro.<br>
              <span style="color:#d9381e; font-size:16.5px; font-weight:800; display:inline-block; margin-top:10px;">
                Eu te amo mais do que milho com manteiga e forró de arrasta-pé! Te amo infinito, meu amor! 💖🤠🪗
              </span>
            </div>
          `,
          background: '#fffdf7',
          backdrop: 'rgba(69, 26, 3, 0.65)',
          confirmButtonText: 'Eu Te Amo Sem Fim, Minha Chica Benta! 🥹💖🪗',
          confirmButtonColor: '#ea580c',
          customClass: { popup: 'swal2-junina-popup' },
          willOpen: () => {
            juninaAudio.currentTime = 0;
            juninaAudio.play().catch(err => console.log('Autoplay dependente de interação:', err));
            for (let i = 0; i < 40; i++) {
              setTimeout(() => {
                const rx = Math.random() * (window.innerWidth - 60) + 30;
                const ry = Math.random() * (window.innerHeight * 0.7) + 50;
                popJunina(rx, ry);
              }, i * 60);
            }
          },
          didClose: () => {
            juninaAudio.pause();
            juninaAudio.currentTime = 0;
          }
        });
        return;
      }

      const msgs = [
        'Anarriê! Puxa o fole, Letícia! 🪗',
        'Olha a chuva de encerramento! ... É mentiraaa! 🌽',
        'A quadrilha jurídica mais afinada do Ceará! 🤠',
        'Sou é doidinho de amor por você! 💖',
        'Fogueira acesa e metas batidas! 🔥',
        'Correio elegante: faltam ' + (10 - mascotClicks) + ' cliques... 👀',
        'Segredo junino se aproximando... 🤫🍿'
      ];
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      clearTimeout(bubbleResetTimer);
      bubbleResetTimer = setTimeout(() => {
        bubble.textContent = 'Anarriê, Letícia! 🔥';
      }, 2600);
    });
  }

  const origToast = window.toast;
  window.toast = function(icon, title) {
    if (typeof origToast === 'function') origToast(icon, title);
    if (window.innerWidth > 700) popJunina(window.innerWidth - 48, 85);
  };
})();

};
