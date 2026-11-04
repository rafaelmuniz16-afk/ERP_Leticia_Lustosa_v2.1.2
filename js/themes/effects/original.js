window.ERPThemeEffects["original"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);


// ==== FOFURA INTERATIVA & EASTER EGG (10 CLIQUES COM MÚSICA) ====
(function() {
  const cuteChars = ['💖','🩷','✨','🌟','💜','💫','⭐','🦄'];
  const romanticAudio = new Audio('./musica.mp3');
  romanticAudio.preload = 'none';

  function pop(x, y) {
    const amount = 7;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = (i % 2 ? 'cute-heart' : 'cute-star');
      el.textContent = cuteChars[Math.floor(Math.random() * cuteChars.length)];
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      const angle = (Math.PI * 2 * i / amount) + Math.random() * 0.55;
      const dist = 24 + Math.random() * 46;
      el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist - 18).toFixed(1) + 'px');
      el.style.setProperty('--rot', ((-35 + Math.random() * 70).toFixed(1)) + 'deg');
      el.style.fontSize = (13 + Math.random() * 11) + 'px';
      scope.append(el);
      setTimeout(() => el.remove(), 1000);
    }
  }

  window.popCute = pop;

  scope.listen(document,'click', e => {
    const t = e.target;
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .unicorn-mascot, .side-aurora-card')) {
      pop(e.clientX, e.clientY);
    }
  });

  const masc = document.getElementById('unicornMascot');
  const bubble = document.getElementById('unicornBubble');
  let unicornClicks = 0;
  let bubbleResetTimer = null;

  if (masc && bubble) {
    scope.listen(masc,'click', (e) => {
      unicornClicks++;
      pop(e.clientX, e.clientY);

      if (unicornClicks === 1) {
        romanticAudio.load();
      }

      if (unicornClicks === 10) {
        unicornClicks = 0;
        bubble.textContent = 'SURPRESA! 💖';

        Swal.fire({
          title: '<span style="font-family:Manrope,sans-serif;font-size:25px;font-weight:800;background:linear-gradient(135deg,#df6ba6,#9a78e7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:inline-block;animation:heartPulseTitle 1.2s infinite;">💖 TE AMO, LETÍCIA! 💖</span>',
          html: `
            <div class="romantic-photo-box">
              <img src="${scope.photo}" alt="Te amo, Leticia" decoding="async">
            </div>
            <p style="font-size:14px; color:#6b4d70; font-weight:600; line-height:1.6; margin:14px 0 0;">
              Você achou o segredo! 💖<br>
              Obrigado por ser essa mulher extraordinária e fazer minha vida infinitamente mais leve e feliz.<br>
              <span style="color:#d85c9d; font-size:16px; font-weight:800;">Eu te amo muito! 💕</span>
            </p>
          `,
          background: '#fff8fc',
          backdrop: 'rgba(93, 69, 104, 0.65)',
          confirmButtonText: 'Eu te amo infinito! 💖',
          confirmButtonColor: '#df6ba6',
          customClass: { popup: 'swal2-romantic-popup' },
          willOpen: () => {
            romanticAudio.currentTime = 0;
            romanticAudio.play().catch(err => console.log('Áudio automático dependeu de clique:', err));
            for (let i = 0; i < 35; i++) {
              setTimeout(() => {
                const rx = Math.random() * (window.innerWidth - 60) + 30;
                const ry = Math.random() * (window.innerHeight * 0.7) + 50;
                pop(rx, ry);
              }, i * 65);
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
        'Clicou em mim! 💖',
        'Glitter e foco ativados! ✨',
        'A Letícia é a melhor do mundo! 🌸',
        'Tudo fica bem com unicórnios! 🦄',
        'Eu te amo infinitamente! 💕',
        'Faltam ' + (10 - unicornClicks) + ' cliques para o segredo... 👀',
        'Você está quase descobrindo a surpresa... 🤫💖'
      ];
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      clearTimeout(bubbleResetTimer);
      bubbleResetTimer = setTimeout(() => {
        bubble.textContent = 'Oii, Letícia 💖';
      }, 2400);
    });
  }

  const origToast = window.toast;
  window.toast = function(icon, title) {
    if (typeof origToast === 'function') origToast(icon, title);
    if (window.innerWidth > 700) pop(window.innerWidth - 48, 85);
  };
})();

};
