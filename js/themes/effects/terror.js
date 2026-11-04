window.ERPThemeEffects["terror"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);


// ============================================================
// MOTOR DE HORROR: ESTÁTICA VHS, GOTAS DE SANGUE E OLHOS OCULTOS
// ============================================================
const canvas = document.getElementById('horrorCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

scope.listen(window,'resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

class BloodDrip {
  constructor() {
    this.x = Math.random() * width;
    this.y = -20;
    this.speed = 1.2 + Math.random() * 2.8;
    this.length = 15 + Math.random() * 35;
    this.width = 1.2 + Math.random() * 2.2;
    this.alpha = 0.35 + Math.random() * 0.45;
  }

  update() {
    this.y += this.speed;
    if (this.y > height + 50) {
      this.y = -30;
      this.x = Math.random() * width;
      this.speed = 1.2 + Math.random() * 2.8;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y + this.length);
    ctx.strokeStyle = `rgba(180, 0, 20, ${this.alpha})`;
    ctx.lineWidth = this.width;
    ctx.stroke();

    // Gota na ponta
    ctx.beginPath();
    ctx.arc(this.x, this.y + this.length, this.width * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 0, 26, ${this.alpha * 1.2})`;
    ctx.fill();
    ctx.restore();
  }
}

class CreepyEyeWatcher {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * (width - 120) + 60;
    this.y = Math.random() * (height - 120) + 60;
    this.w = 28 + Math.random() * 16;
    this.h = this.w * 0.55;
    this.life = 0;
    this.maxLife = 120 + Math.random() * 140;
    this.open = 0;
    this.state = 'opening';
    this.color = Math.random() > 0.4 ? '#e6001a' : '#ffea00';
  }

  update() {
    this.life++;
    if (this.state === 'opening') {
      this.open += 0.04;
      if (this.open >= 1) { this.open = 1; this.state = 'staring'; }
    } else if (this.state === 'staring') {
      if (this.life > this.maxLife - 30) this.state = 'closing';
    } else if (this.state === 'closing') {
      this.open -= 0.05;
      if (this.open <= 0) { this.reset(); }
    }
  }

  draw(ctx) {
    if (this.open <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    const currentH = Math.max(1, this.h * this.open);
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w, currentH, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 5, 8, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 0, 26, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Íris e Pupila que te observa
    ctx.beginPath();
    ctx.arc(0, 0, currentH * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, currentH * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    ctx.restore();
  }
}

const drips = Array.from({length: 22}, () => new BloodDrip());
const watchers = Array.from({length: 7}, () => new CreepyEyeWatcher());

function animateHorror() {
  requestAnimationFrame(animateHorror);
  ctx.clearRect(0, 0, width, height);

  // Ruído analógico sutil
  ctx.fillStyle = 'rgba(255, 0, 20, 0.015)';
  for (let i = 0; i < 28; i++) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    ctx.fillRect(rx, ry, 2 + Math.random() * 4, 1);
  }

  watchers.forEach(w => {
    w.update();
    w.draw(ctx);
  });

  drips.forEach(d => {
    d.update();
    d.draw(ctx);
  });
}
animateHorror();

// ============================================================
// EASTER EGG DE HORROR PSICOLÓGICO (10 CLIQUES NO OLHO COM MÚSICA)
// ============================================================
(function() {
  const horrorSymbols = ['👁️','🩸','🫀','💀','⚰️','🖤','⚡','🕷️'];

  function pop(x, y) {
    const amount = 8;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = 'blood-pop';
      el.textContent = horrorSymbols[Math.floor(Math.random() * horrorSymbols.length)];
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
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .eye-mascot, .side-aurora-card')) {
      pop(e.clientX, e.clientY);
    }
  });

  const mascot = document.getElementById('eyeMascot');
  const bubble = document.getElementById('eyeBubble');
  let clickCount = 0;
  let bubbleTimer = null;

  if (mascot && bubble) {
    scope.listen(mascot,'click', (e) => {
      clickCount++;
      pop(e.clientX, e.clientY);

      // Flash na tela ao tocar no olho
      document.body.style.backgroundColor = '#380007';
      setTimeout(() => document.body.style.backgroundColor = '', 80);

      if (clickCount === 10) {
        clickCount = 0;
        bubble.textContent = 'PACTO ETERNO! 🫀🩸';

        Swal.fire({
          title: '<span style="font-family:Creepster,cursive;font-size:32px;color:#e6001a;display:inline-block;text-shadow:0 0 30px rgba(230,0,26,0.8);letter-spacing:1px;">👁️ PACTO SANGUÍNEO: TE AMO, LETÍCIA! 🫀</span>',
          html: `
            <div class="romantic-photo-box">
              <video data-erp-theme-video playsinline controls preload="none" aria-label="Easter egg de Terror: JumpScare"></video>
            </div>
            <p style="font-size:14.5px; color:#ebdce0; font-weight:600; line-height:1.65; margin:16px 0 0;">
              Você desafiou o abismo e encontrou o relicário eterno! 👁️🩸🖤<br>
              Nem a escuridão mais densa, nem o terror mais bizarro apagam a certeza de que você é a luz da minha vida.<br>
              Meu coração bate por você em todas as frequências e até o fim dos tempos.<br>
              <span style="color:#ff1a35; font-size:16.5px; font-weight:800;">Letícia, eu te amo até a última gota da minha alma! 🫀🩸💀</span>
            </p>
          `,
          backdrop: 'rgba(10, 0, 3, 0.92)',
          confirmButtonText: 'Eu te amo eternamente! 🩸',
          confirmButtonColor: '#e6001a',
          customClass: { popup: 'swal2-horror-popup' },
          willOpen: () => {
            for (let i = 0; i < 40; i++) {
              setTimeout(() => {
                const rx = Math.random() * (window.innerWidth - 60) + 30;
                const ry = Math.random() * (window.innerHeight * 0.7) + 50;
                pop(rx, ry);
              }, i * 60);
            }
          }
        });
        return;
      }

      const msgs = [
        'Eu nunca fecho meu olho... 👁️',
        'Você sente o calafrio? 🩸',
        'A Letícia reina até no submundo! 💀',
        'Eu te amo além da morte! 🖤',
        'Ouço sussurros nas paredes... 🤫',
        'Faltam ' + (10 - clickCount) + ' toques para consumar o ritual... 👀',
        'O olho está prestes a sangrar... 🩸👁️'
      ];
      bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => {
        bubble.textContent = 'Eu vejo você, Letícia... 🩸';
      }, 2600);
    });
  }
})();

};
