window.ERPThemeEffects["natal"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);


(function() {
  // Gerador de neve suave
  const snowContainer = document.getElementById('snowContainer');
  const snowFlakes = ['❄', '❅', '❆', '•'];
  if (snowContainer) {
    for (let i = 0; i < 24; i++) {
      const flake = document.createElement('span');
      flake.className = 'snowflake';
      flake.textContent = snowFlakes[Math.floor(Math.random() * snowFlakes.length)];
      flake.style.left = (Math.random() * 100) + 'vw';
      flake.style.fontSize = (10 + Math.random() * 16) + 'px';
      flake.style.animationDuration = (8 + Math.random() * 14) + 's';
      flake.style.animationDelay = (Math.random() * 12) + 's';
      flake.style.opacity = (0.25 + Math.random() * 0.45);
      snowContainer.appendChild(flake);
    }
  }

  // Efeito de partículas de clique natalinas
  const xmasChars = ['❄️', '🎅', '🎄', '🎁', '🔔', '✨', '❤️', '🌟', '🍪'];
  const romanticAudio = new Audio('./musica.mp3');
  romanticAudio.preload = 'none';

  function popXmas(x, y) {
    const amount = 8;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = 'xmas-burst-elem';
      el.textContent = xmasChars[Math.floor(Math.random() * xmasChars.length)];
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      const angle = (Math.PI * 2 * i / amount) + Math.random() * 0.55;
      const dist = 26 + Math.random() * 50;
      el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist - 20).toFixed(1) + 'px');
      el.style.setProperty('--rot', ((-40 + Math.random() * 80).toFixed(1)) + 'deg');
      el.style.fontSize = (14 + Math.random() * 12) + 'px';
      scope.append(el);
      setTimeout(() => el.remove(), 950);
    }
  }

  window.popXmas = popXmas;

  scope.listen(document,'click', e => {
    const t = e.target;
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .santa-mascot, .side-aurora-card')) {
      popXmas(e.clientX, e.clientY);
    }
  });

  const masc = document.getElementById('santaMascot');
  const bubble = document.getElementById('santaBubble');
  let santaClicks = 0;
  let bubbleResetTimer = null;

  if (masc && bubble) {
    scope.listen(masc,'click', (e) => {
      santaClicks++;
      popXmas(e.clientX, e.clientY);

      if (santaClicks === 1) {
        romanticAudio.load();
      }

      if (santaClicks === 10) {
        santaClicks = 0;
        bubble.textContent = 'FELIZ NATAL, MEU AMOR! 🎅🎁';

        Swal.fire({
          title: '<span style="font-family:Manrope,sans-serif;font-size:24px;font-weight:800;color:#c41e3a;display:inline-block;animation:pulse 1.2s infinite;">🎄 FELIZ NATAL, MEU AMOR! 🎅❤️</span>',
          html: `
            <div class="xmas-photo-box">
              <div class="xmas-ribbon">🎀</div>
              <img src="${scope.photo}" alt="🎅É Nataaal🎄" decoding="async">
            </div>
            <p style="font-size:14px; color:#163623; font-weight:600; line-height:1.65; margin:14px 0 0;">
              Você encontrou o presente secreto do Papai Noel! 🎁❄️<br>
              Passar mais um ano ao seu lado é a minha maior bênção e meu maior presente de Natal.<br>
              Obrigado por iluminar cada dia da minha vida com esse sorriso lindo.<br>
              <span style="color:#c41e3a; font-size:16px; font-weight:800; display:inline-block; margin-top:6px;">Eu te amo com todo o meu coração! 💕🎄✨</span>
            </p>
          `,
          background: '#ffffff',
          backdrop: 'rgba(16, 56, 34, 0.72)',
          confirmButtonText: 'Eu te amo infinito! 🎅💖🎁',
          confirmButtonColor: '#c41e3a',
          customClass: { popup: 'swal2-xmas-popup' },
          willOpen: () => {
            romanticAudio.currentTime = 0;
            romanticAudio.play().catch(err => console.log('Áudio automático dependeu de clique:', err));
            for (let i = 0; i < 40; i++) {
              setTimeout(() => {
                const rx = Math.random() * (window.innerWidth - 60) + 30;
                const ry = Math.random() * (window.innerHeight * 0.7) + 50;
                popXmas(rx, ry);
              }, i * 60);
            }
          },
          didClose: () => {
            romanticAudio.pause();
            romanticAudio.currentTime = 0;
          }
        });
        return;
      }

      const msgs = [
        'Ho Ho Ho! Feliz Natal adiantado! 🎅✨',
        'Muito foco e biscoitos natalinos! 🍪🎄',
        'A Letícia merece todos os presentes do trenó! 🎁💖',
        'O meu melhor presente é você! 🌟❤️',
        'Magia de Natal ativada no ERP! ❄️✨',
        'Faltam ' + (10 - santaClicks) + ' cliques para o segredo de Natal... 🎅🎁',
        'O trenó do Polo Norte tá chegando perto... 🎄✨'
      ];
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      clearTimeout(bubbleResetTimer);
      bubbleResetTimer = setTimeout(() => {
        bubble.textContent = 'Ho Ho Ho, Letícia! 🎅🎄';
      }, 2600);
    });
  }

  const origToast = window.toast;
  window.toast = function(icon, title) {
    if (typeof origToast === 'function') origToast(icon, title);
    if (window.innerWidth > 700) popXmas(window.innerWidth - 48, 85);
  };
})();

};
