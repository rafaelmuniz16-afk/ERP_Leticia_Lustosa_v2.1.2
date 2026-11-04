window.ERPThemeEffects["ano-novo"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);
function updateCountdown() {
  const now = new Date();
  const currentYear = now.getFullYear();
  let target = new Date(currentYear, 11, 31, 23, 59, 59);
  if (now > target) {
    target = new Date(currentYear + 1, 11, 31, 23, 59, 59);
  }
  const diff = target - now;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / 1000 / 60) % 60);
  const s = Math.floor((diff / 1000) % 60);

  const timerEl = $('countdownTimer');
  if (timerEl) {
    timerEl.textContent = `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  }
}
setInterval(updateCountdown, 1000);
updateCountdown();


// ============================================================
// MOTOR DE FOGOS DE ARTIFÍCIO CONTÍNUO, ABUNDANTE E SUAVE (CANVAS 60FPS)
// ============================================================
const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

scope.listen(window,'resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

const PALETTES = [
  ['#ffe29a', '#f5c042', '#df9f28', '#ffffff'], // Ouro Nobre
  ['#fcd5ce', '#f8edeb', '#ffb5a7', '#ffffff'], // Champanhe Rosé
  ['#64dfdf', '#48cae4', '#00b4d8', '#ffffff'], // Ciano Glacial
  ['#70e000', '#38b000', '#9ef01a', '#ffffff'], // Esmeralda Virada
  ['#e0aaff', '#c77dff', '#9d4edd', '#ffffff']  // Roxo Imperial
];

class Rocket {
  constructor(startX, startY, targetX, targetY, palette) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.palette = palette;

    const angle = Math.atan2(targetY - startY, targetX - startX);
    // Velocidade de subida suave e cadenciada
    const speed = 4.8 + Math.random() * 2.2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.trail = [];
    this.exploded = false;
  }

  update() {
    this.trail.push({x: this.x, y: this.y, alpha: 1});
    if (this.trail.length > 7) this.trail.shift();

    this.x += this.vx;
    this.y += this.vy;

    if (this.vy < 0 && this.y <= this.targetY) {
      this.exploded = true;
    }
  }

  draw(ctx) {
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const a = (i / this.trail.length) * 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 235, 170, ${a})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffe29a';
    ctx.fill();
    ctx.restore();
  }
}

class SparkleParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    
    const angle = Math.random() * Math.PI * 2;
    // Expansão lenta e elegante
    const speed = 1.0 + Math.random() * 3.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.gravity = 0.038;
    this.friction = 0.978;
    this.alpha = 1;
    this.decay = 0.007 + Math.random() * 0.009;
    this.size = 1.5 + Math.random() * 1.8;
  }

  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let rockets = [];
let particles = [];

function spawnRocket(customX = null, customY = null) {
  const startX = width * 0.1 + Math.random() * (width * 0.8);
  const startY = height;
  const targetX = customX !== null ? customX : width * 0.08 + Math.random() * (width * 0.84);
  const targetY = customY !== null ? customY : height * 0.08 + Math.random() * (height * 0.42);
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  rockets.push(new Rocket(startX, startY, targetX, targetY, palette));
}

function explode(x, y, palette) {
  // Quantidade equilibrada por explosão para máxima fluidez
  const count = 30 + Math.floor(Math.random() * 16);
  for (let i = 0; i < count; i++) {
    const col = palette[Math.floor(Math.random() * palette.length)];
    particles.push(new SparkleParticle(x, y, col));
  }
}

// Disparo contínuo e volumoso de fogos pelo céu
let autoTimer = 0;
function animateFireworks() {
  requestAnimationFrame(animateFireworks);

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'lighter';

  autoTimer++;
  // Dispara novo foguete a cada ~18 frames para criar festa contínua e rica
  if (autoTimer % 18 === 0) {
    spawnRocket();
    // Em alguns momentos, lança fogos em dupla
    if (Math.random() > 0.45) {
      setTimeout(() => spawnRocket(), 140);
    }
  }

  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.update();
    r.draw(ctx);
    if (r.exploded) {
      explode(r.x, r.y, r.palette);
      rockets.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}
animateFireworks();

// ============================================================
// EASTER EGG DE RÉVEILLON (10 CLIQUES NO BRINDE COM MÚSICA)
// ============================================================
(function() {
  const reveillonSymbols = ['🥂','🍾','✨','🌟','⭐','🎆','💛','💫'];
  const romanticAudio = new Audio('./musica.mp3');
  romanticAudio.preload = 'none';

  function pop(x, y) {
    const amount = 8;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = 'sparkle-pop';
      el.textContent = reveillonSymbols[Math.floor(Math.random() * reveillonSymbols.length)];
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      const angle = (Math.PI * 2 * i / amount) + Math.random() * 0.5;
      const dist = 26 + Math.random() * 50;
      el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist - 20).toFixed(1) + 'px');
      el.style.setProperty('--rot', ((-35 + Math.random() * 70).toFixed(1)) + 'deg');
      el.style.fontSize = (14 + Math.random() * 12) + 'px';
      scope.append(el);
      setTimeout(() => el.remove(), 950);
    }
  }

  scope.listen(document,'click', e => {
    const t = e.target;
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .toast-mascot, .side-aurora-card')) {
      pop(e.clientX, e.clientY);
    }
  });

  const mascot = document.getElementById('toastMascot');
  const bubble = document.getElementById('toastBubble');
  let clickCount = 0;
  let bubbleTimer = null;

  if (mascot && bubble) {
    scope.listen(mascot,'click', (e) => {
      clickCount++;
      pop(e.clientX, e.clientY);

      // Dispara salva no canvas no local clicado
      spawnRocket(e.clientX, e.clientY * 0.4);

      if (clickCount === 1) {
        romanticAudio.load();
      }

      if (clickCount === 10) {
        clickCount = 0;
        bubble.textContent = 'FELIZ ANO NOVO! 🥂✨';

        // Bateria especial de fogos
        for(let f = 0; f < 6; f++) {
          setTimeout(() => spawnRocket(), f * 180);
        }

        Swal.fire({
          title: '<span style="font-family:Cinzel,serif;font-size:24px;font-weight:900;color:#f5d179;display:inline-block;text-shadow:0 0 20px rgba(229,179,66,0.5);">✨ FELIZ ANO NOVO, MEU AMOR! ✨</span>',
          html: `
            <div class="romantic-photo-box">
              <img src="${scope.photo}" alt="Te amo, Leticia! 💕" decoding="async">
            </div>
            <p style="font-size:14.5px; color:#f0f4fc; font-weight:600; line-height:1.65; margin:16px 0 0;">
              Você encontrou o segredo das taças da virada! 🥂🎆<br>
              Que este novo ano chegue transbordando saúde, conquistas de metas e a certeza de que ter você ao meu lado é a maior bênção da minha vida.<br>
              <span style="color:#f5d179; font-size:16.5px; font-weight:800;">Letícia, eu te amo com todo o meu coração e pra toda a eternidade! 💖🍾</span>
            </p>
          `,
          backdrop: 'rgba(3, 5, 10, 0.75)',
          confirmButtonText: 'Eu te amo infinitamente! 💖🥂',
          confirmButtonColor: '#bd8e2b',
          customClass: { popup: 'swal2-reveillon-popup' },
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
        'Brinde à melhor mulher do mundo! 🥂',
        'Que 2026 venha com tudo! ✨',
        'Um ano novo de metas batidas! 🏆',
        'Eu te ama pra sempre! 💕',
        'Paz, amor e muita prosperidade! 🍾',
        'Faltam ' + (10 - clickCount) + ' cliques para o grande brinde... 👀',
        'Quase lá pra surpresa da virada... 🤫🥂'
      ];
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => {
        bubble.textContent = 'Feliz Ano Novo, Letícia! ✨';
      }, 2600);
    });
  }
})();

};
