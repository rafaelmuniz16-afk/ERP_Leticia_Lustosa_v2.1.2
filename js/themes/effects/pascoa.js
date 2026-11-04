window.ERPThemeEffects["pascoa"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);


// ============================================================
// NOVO MOTOR PÁSCOA: OVOS DECORADOS E MARGARIDAS (CANVAS 60FPS)
// ============================================================
const canvas = document.getElementById('easterCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

scope.listen(window,'resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

const PASTEL_COLORS = ['#f472b6', '#38bdf8', '#34d399', '#fbbf24', '#c084fc', '#fb923c'];

class EasterEggItem {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vy = -(0.35 + Math.random() * 0.45);
    this.vx = (Math.random() - 0.5) * 0.35;
    this.rx = 11 + Math.random() * 8;
    this.ry = this.rx * 1.35;
    this.angle = (Math.random() - 0.5) * 0.4;
    this.spin = (Math.random() - 0.5) * 0.008;
    this.baseColor = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
    this.stripeColor = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
    this.alpha = 0.22 + Math.random() * 0.2;
  }

  update() {
    this.y += this.vy;
    this.x += this.vx;
    this.angle += this.spin;

    if (this.y < -50) {
      this.y = height + 40;
      this.x = Math.random() * width;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.alpha;

    // Formato de Ovo
    ctx.beginPath();
    ctx.ellipse(0, 0, this.rx, this.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.baseColor;
    ctx.fill();

    // Faixa decorativa no meio do ovinho
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.rect(-this.rx, -this.ry * 0.25, this.rx * 2, this.ry * 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = this.alpha * 0.85;
    ctx.fill();

    // Bolinhas na faixa
    ctx.fillStyle = this.stripeColor;
    for (let i = -this.rx + 4; i < this.rx; i += 7) {
      ctx.beginPath();
      ctx.arc(i, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }
}

class DaisyFlower {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vy = -(0.25 + Math.random() * 0.35);
    this.vx = (Math.random() - 0.5) * 0.4;
    this.size = 7 + Math.random() * 5;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.015;
    this.alpha = 0.28 + Math.random() * 0.25;
  }

  update() {
    this.y += this.vy;
    this.x += this.vx;
    this.angle += this.spin;

    if (this.y < -40) {
      this.y = height + 30;
      this.x = Math.random() * width;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.alpha;

    // Pétalas Brancas
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      ctx.rotate((Math.PI * 2) / 6);
      ctx.beginPath();
      ctx.ellipse(0, this.size, this.size * 0.38, this.size * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Miolo Amarelo
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();

    ctx.restore();
  }
}

const easterItems = [
  ...Array.from({length: 16}, () => new EasterEggItem()),
  ...Array.from({length: 18}, () => new DaisyFlower())
];

function animateEaster() {
  requestAnimationFrame(animateEaster);
  ctx.clearRect(0, 0, width, height);

  easterItems.forEach(item => {
    item.update();
    item.draw(ctx);
  });
}
animateEaster();

// ============================================================
// EASTER EGG DE PÁSCOA (10 CLIQUES NO COELHO COM MÚSICA)
// ============================================================
(function() {
  const easterSymbols = ['🐰','🥚','🌷','🥕','🌸','🎀','✨','💛'];
  const romanticAudio = new Audio('./musica.mp3');
  romanticAudio.preload = 'none';

  function pop(x, y) {
    const amount = 8;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = 'easter-pop';
      el.textContent = easterSymbols[Math.floor(Math.random() * easterSymbols.length)];
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      const angle = (Math.PI * 2 * i / amount) + Math.random() * 0.5;
      const dist = 26 + Math.random() * 50;
      el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist - 20).toFixed(1) + 'px');
      el.style.setProperty('--rot', ((-35 + Math.random() * 70).toFixed(1)) + 'deg');
      el.style.fontSize = (15 + Math.random() * 12) + 'px';
      scope.append(el);
      setTimeout(() => el.remove(), 950);
    }
  }

  scope.listen(document,'click', e => {
    const t = e.target;
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .bunny-mascot, .side-aurora-card')) {
      pop(e.clientX, e.clientY);
    }
  });

  const mascot = document.getElementById('bunnyMascot');
  const bubble = document.getElementById('bunnyBubble');
  let clickCount = 0;
  let bubbleTimer = null;

  if (mascot && bubble) {
    scope.listen(mascot,'click', (e) => {
      clickCount++;
      pop(e.clientX, e.clientY);

      if (clickCount === 1) {
        romanticAudio.load();
      }

      if (clickCount === 10) {
        clickCount = 0;
        bubble.textContent = 'NINHO MÁGICO! 🐰💖';

        Swal.fire({
          title: '<span style="font-family:Fredoka,cursive;font-size:26px;font-weight:700;color:#f472b6;display:inline-block;text-shadow:0 0 20px rgba(244,114,182,0.4);">🐰 OVO ENCANTADO: TE AMO, LETÍCIA! 💖</span>',
          html: `
            <div class="romantic-photo-box">
              <img src="${scope.photo}" alt="O que trazes pra mim?" decoding="async">
            </div>
            <p style="font-size:14.5px; color:#503844; font-weight:600; line-height:1.65; margin:16px 0 0;">
              Você encontrou o ninho mais florido da Páscoa! 🐰🌷🥚<br>
              A sua luz, o seu sorriso e o seu coração transformam qualquer dia comum na mais doce celebração.<br>
              Sou o homem mais feliz do mundo por ter você ao meu lado em cada estação.<br>
              <span style="color:#f472b6; font-size:16.5px; font-weight:800;">Letícia, eu te amo com todo o meu coração! 💖</span>
            </p>
          `,
          backdrop: 'rgba(80, 56, 68, 0.45)',
          confirmButtonText: 'Eu te amo de montão! 🌷',
          confirmButtonColor: '#f472b6',
          customClass: { popup: 'swal2-easter-popup' },
          willOpen: () => {
            romanticAudio.currentTime = 0;
            romanticAudio.play().catch(err => console.log('Áudio automático dependeu de interação:', err));
            for (let i = 0; i < 40; i++) {
              setTimeout(() => {
                const rx = Math.random() * (window.innerWidth - 60) + 30;
                const ry = Math.random() * (window.innerHeight * 0.7) + 50;
                pop(rx, ry);
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
        'Flores e cenourinhas pra você! 🌷',
        'Coelhinho da Páscoa que trazes pra mim? 🐰',
        'A Letícia é a mulher mais linda do mundo! 🌸',
        'Eu te amo daqui até o céu! 💕',
        'Caça aos encerramentos ativada! 🥚',
        'Faltam ' + (10 - clickCount) + ' cliques para abrir o ninho... 👀',
        'O ninho tá quase pronto... 🤫🐰'
      ];
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => {
        bubble.textContent = 'Oie Letícia, Feliz Páscoa! 🌸';
      }, 2600);
    });
  }
})();

};
