window.ERPThemeEffects["halloween"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);


// ============================================================
// MOTOR SPOOKY: MORCEGOS E NÉVOA FANTASMAGÓRICA (CANVAS 60FPS)
// ============================================================
const canvas = document.getElementById('spookyCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

scope.listen(window,'resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

class Bat {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * (height * 0.65);
    this.vx = (Math.random() - 0.5) * 2.2 + 0.8;
    this.vy = (Math.random() - 0.5) * 1.2;
    this.size = 10 + Math.random() * 8;
    this.wingAngle = 0;
    this.wingSpeed = 0.16 + Math.random() * 0.1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy + Math.sin(this.wingAngle) * 0.6;
    this.wingAngle += this.wingSpeed;

    if (this.x > width + 40) this.x = -40;
    if (this.x < -40) this.x = width + 40;
    if (this.y > height * 0.75) this.vy = -Math.abs(this.vy);
    if (this.y < 30) this.vy = Math.abs(this.vy);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(255, 120, 31, 0.45)';
    ctx.beginPath();
    
    // Silhueta simples de morcego
    const wing = Math.sin(this.wingAngle) * 6;
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-this.size * 0.6, -wing - 4, -this.size, -wing);
    ctx.quadraticCurveTo(-this.size * 0.5, wing * 0.5 + 4, 0, 4);
    ctx.quadraticCurveTo(this.size * 0.5, wing * 0.5 + 4, this.size, -wing);
    ctx.quadraticCurveTo(this.size * 0.6, -wing - 4, 0, 0);
    ctx.fill();
    ctx.restore();
  }
}

class GhostParticle {
  constructor() {
    this.x = Math.random() * width;
    this.y = height + Math.random() * 40;
    this.vy = -(0.5 + Math.random() * 0.9);
    this.vx = (Math.random() - 0.5) * 0.5;
    this.size = 14 + Math.random() * 26;
    this.alpha = 0.05 + Math.random() * 0.12;
    this.color = Math.random() > 0.5 ? 'rgba(157, 78, 221,' : 'rgba(255, 120, 31,';
  }

  update() {
    this.y += this.vy;
    this.x += this.vx;
    if (this.y < -50) {
      this.y = height + 30;
      this.x = Math.random() * width;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `${this.color} ${this.alpha})`;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff781f';
    ctx.fill();
    ctx.restore();
  }
}

const bats = Array.from({length: 9}, () => new Bat());
const ghosts = Array.from({length: 16}, () => new GhostParticle());

function animateSpooky() {
  requestAnimationFrame(animateSpooky);
  ctx.clearRect(0, 0, width, height);

  ghosts.forEach(g => {
    g.update();
    g.draw(ctx);
  });

  bats.forEach(b => {
    b.update();
    b.draw(ctx);
  });
}
animateSpooky();

// ============================================================
// EASTER EGG DE HALLOWEEN (10 CLIQUES NA ABÓBORA COM MÚSICA)
// ============================================================
(function() {
  const spookySymbols = ['🎃','👻','🦇','🍬','🕷️','💀','🧙‍♀️','🕸️'];
  const romanticAudio = new Audio('./musica.mp3');
  romanticAudio.preload = 'none';

  function pop(x, y) {
    const amount = 8;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = 'spooky-pop';
      el.textContent = spookySymbols[Math.floor(Math.random() * spookySymbols.length)];
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
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .pumpkin-mascot, .side-aurora-card')) {
      pop(e.clientX, e.clientY);
    }
  });

  const mascot = document.getElementById('pumpkinMascot');
  const bubble = document.getElementById('pumpkinBubble');
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
        bubble.textContent = 'FEITIÇO DO AMOR! 🎃💜';

        Swal.fire({
          title: '<span style="font-family:Creepster,cursive;font-size:32px;font-weight:400;color:#ff781f;display:inline-block;text-shadow:0 0 25px rgba(255,120,31,0.6);letter-spacing:1px;">🎃 FEITIÇO ETERNO: TE AMO, LETÍCIA! 💜</span>',
          html: `
            <div class="romantic-photo-box">
              <img src="${scope.photo}" alt="🎃🦇TE AMOOO🎃🦇" decoding="async">
            </div>
            <p style="font-size:14.5px; color:#ebdff7; font-weight:600; line-height:1.65; margin:16px 0 0;">
              Você encontrou o grande feitiço da abóbora! 🎃👻<br>
              Nenhum monstro, fantasma ou processo difícil é páreo pra mulher incrível que você é.<br>
              Obrigado por iluminar meus dias e transformar minha vida no melhor lugar do mundo.<br>
              <span style="color:#ff781f; font-size:16.5px; font-weight:800;">Letícia, meu amor por você atravessa todas as vidas e dimensões! 💖🕯️</span>
            </p>
          `,
          backdrop: 'rgba(5, 3, 8, 0.8)',
          confirmButtonText: 'Eu te amo de morrer! 🥹💜',
          confirmButtonColor: '#ff781f',
          customClass: { popup: 'swal2-spooky-popup' },
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
        'Gostosuras ou travessuras? 🍬',
        'Cuidado com os fantasmas da meta! 👻',
        'A Letícia bota o terror na concorrência! 🎃',
        'Eu te amo mais que poção mágica! 💕',
        'Abracadabra, meta batida! 🧙‍♀️',
        'Faltam ' + (10 - clickCount) + ' cliques para invocar o segredo... 👀',
        'O caldeirão tá quase fervendo... 🤫🎃'
      ];
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => {
        bubble.textContent = 'Buuuh! Oi, Letícia! 👻';
      }, 2600);
    });
  }
})();

};
