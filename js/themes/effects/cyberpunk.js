window.ERPThemeEffects["cyberpunk"] = function(scope){
const {window,document,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,Audio,Swal}=scope;
const $=id=>document.getElementById(id);


// ============================================================
// MOTOR CYBERPUNK: GRADE 3D E CHUVA DE PACOTES DE DADOS (CANVAS 60FPS)
// ============================================================
const canvas = document.getElementById('cyberCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

scope.listen(window,'resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

class DataStream {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.speed = 1.8 + Math.random() * 3.5;
    this.length = 18 + Math.random() * 35;
    this.color = Math.random() > 0.4 ? '#00f3ff' : '#ff0055';
    this.alpha = 0.2 + Math.random() * 0.45;
  }

  update() {
    this.y += this.speed;
    if (this.y > height + 40) {
      this.y = -40;
      this.x = Math.random() * width;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y + this.length);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y + this.length, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}

const streams = Array.from({length: 32}, () => new DataStream());

let gridOffset = 0;
function animateCyber() {
  requestAnimationFrame(animateCyber);
  ctx.clearRect(0, 0, width, height);

  // Grade de Perspectiva 3D Futurista no Rodapé
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
  ctx.lineWidth = 1;
  const horizon = height * 0.72;

  // Linhas Verticais em Perspectiva
  const centerX = width / 2;
  for (let x = -width; x < width * 2; x += 65) {
    ctx.beginPath();
    ctx.moveTo(centerX + (x - centerX) * 0.15, horizon);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Linhas Horizontais em Movimento
  gridOffset = (gridOffset + 0.4) % 24;
  for (let y = horizon; y <= height; y += (y - horizon) * 0.32 + 5) {
    const curY = y + gridOffset * ((y - horizon) / (height - horizon));
    if (curY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(width, curY);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Partículas de Pacotes de Dados
  streams.forEach(s => {
    s.update();
    s.draw(ctx);
  });
}
animateCyber();

// ============================================================
// EASTER EGG CYBERPUNK (10 CLIQUES NO ANDROIDE COM MÚSICA)
// ============================================================
(function() {
  const cyberSymbols = ['🤖','⚡','💾','🧬','🛰️','💎','🔋','✨'];
  const romanticAudio = new Audio('./musica.mp3');
  romanticAudio.preload = 'none';

  function pop(x, y) {
    const amount = 8;
    for (let i = 0; i < amount; i++) {
      const el = document.createElement('span');
      el.className = 'cyber-pop';
      el.textContent = cyberSymbols[Math.floor(Math.random() * cyberSymbols.length)];
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
    if (t.closest('button, input, select, textarea, .nav-btn, .kpi, .panel-head, .summary-row, .badge, .icon-btn, .cyber-mascot, .side-aurora-card')) {
      pop(e.clientX, e.clientY);
    }
  });

  const mascot = document.getElementById('cyberMascot');
  const bubble = document.getElementById('cyberBubble');
  let clickCount = 0;
  let bubbleTimer = null;
  function revealBubble(message) {
    if (!bubble) return;
    bubble.textContent=message;
    bubble.classList.add('is-visible');
    clearTimeout(bubbleTimer);
    bubbleTimer=setTimeout(()=>{
      bubble.classList.remove('is-visible');
      bubble.textContent='Sistemas online, Letícia! ⚡';
    }, 3100);
  }

  if (mascot && bubble) {
    scope.listen(mascot,'click', (e) => {
      clickCount++;
      pop(e.clientX, e.clientY);

      // Efeito de pulso ciano no terminal
      document.body.style.backgroundColor = '#041829';
      setTimeout(() => document.body.style.backgroundColor = '', 80);

      if (clickCount === 1) {
        romanticAudio.load();
      }

      if (clickCount === 10) {
        clickCount = 0;
        revealBubble('LINK OVERRIDE! ⚡💖');

        Swal.fire({
          title: '<span style="font-family:Orbitron,sans-serif;font-size:24px;font-weight:900;color:#00f3ff;display:inline-block;text-shadow:0 0 25px rgba(0,243,255,0.7);letter-spacing:1px;">⚡ PROTOCOLO ETERNO: TE AMO, LETÍCIA! 💙</span>',
          html: `
            <div class="romantic-photo-box">
              <img src="${scope.photo}" alt="Te amo muitão!" decoding="async">
            </div>
            <p style="font-size:15px; color:#d8e8fc; font-weight:600; line-height:1.65; margin:16px 0 0; font-family:'Rajdhani',sans-serif;">
              Você acessou o núcleo de dados secreto da matriz! 🤖⚡💙<br>
              Em qualquer linha temporal, realidade virtual ou universo cyberpunk,<br>
              você sempre foi e sempre será a minha conexão mais pura e verdadeira.<br>
              <span style="color:#00f3ff; font-size:17px; font-weight:800; text-shadow:0 0 10px rgba(0,243,255,0.5);">Letícia, meu amor por você é um código imutável e infinito! ⚡💖✨</span>
            </p>
          `,
          backdrop: 'rgba(3, 6, 13, 0.88)',
          confirmButtonText: 'Eu te amo na velocidade da luz! 🤖⚡💖',
          confirmButtonColor: '#00f3ff',
          customClass: { popup: 'swal2-cyber-popup' },
          willOpen: () => {
            romanticAudio.currentTime = 0;
            romanticAudio.play().catch(err => console.log('Áudio dependeu de clique:', err));
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
        'Sinal neural 100% sincronizado! ⚡',
        'Processamento quântico ativado! 💾',
        'A Letícia hackeou meu coração! 🤖',
        'Eu te ama em todas as matrizes! 💕',
        'Overclock de produtividade ativo! 🚀',
        'Faltam ' + (10 - clickCount) + ' pulsos para a sobrecarga... 👀',
        'Compilando surpresa quântica... 🤫⚡'
      ];
      revealBubble(msgs[Math.floor(Math.random() * msgs.length)]);
    });
  }
})();

};
