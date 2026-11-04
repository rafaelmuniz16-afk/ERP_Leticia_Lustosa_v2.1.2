(() => {
  'use strict';
  // Todo recurso pertence ao escopo existente: a troca de tema interrompe
  // frames, áudio, listeners e partículas sem alterar dados do ERP.
  window.ERPThemeEffects['glassy-crm'] = scope => {
    const {document, window, Swal} = scope;
    const canvas = document.getElementById('glassyAmbient');
    const ctx = canvas?.getContext('2d');
    const mascot = document.getElementById('glassyMascot');
    const bubble = document.getElementById('glassyBubble');
    // APIs nativas exigem o Window real; scope.window é um Proxy de isolamento.
    const motion = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    const moving = () => window.ERPTheme.state.effects && !motion.matches;
    const audio = new scope.Audio();
    let width = 0, height = 0, last = 0, time = 0, clicks = 0, bubbleTimer = 0;
    let portrait = null, pointer = {x: .5, y: .5}, drift = {x: .5, y: .5};
    const particles = new Set();
    const streams = Array.from({length: 38}, (_, i) => ({
      x: (i + .5) / 38, y: Math.random(), speed: .018 + Math.random() * .025,
      length: 16 + Math.random() * 38, purple: i % 3 === 0
    }));
    function resize() {
      if (!ctx) return;
      width = window.innerWidth; height = window.innerHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1800 / Math.max(width, height));
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawBackground(0);
    }
    function drawBackground(dt) {
      if (!ctx || !width) return;
      drift.x += (pointer.x - drift.x) * .025; drift.y += (pointer.y - drift.y) * .025;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < 3; i++) {
        const x = width * (.2 + i * .3) + Math.sin(time * .16 + i * 2) * width * .12 + (drift.x - .5) * 40;
        const y = height * (.25 + i * .2) + Math.cos(time * .12 + i) * height * .14 + (drift.y - .5) * 30;
        const radius = Math.max(width, height) * .44;
        const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
        light.addColorStop(0, i === 1 ? 'rgba(123,74,222,.19)' : 'rgba(55,206,225,.11)');
        light.addColorStop(1, 'rgba(8,10,16,0)');
        ctx.fillStyle = light; ctx.fillRect(0, 0, width, height);
      }
      ctx.lineWidth = .7;
      streams.forEach(s => {
        s.y = (s.y + dt * s.speed) % 1.12;
        const x = s.x * width + Math.sin(time * .25 + s.x * 8) * 15;
        const y = s.y * height - 50;
        ctx.strokeStyle = s.purple ? 'rgba(182,135,255,.24)' : 'rgba(101,226,240,.2)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + s.length); ctx.stroke();
        ctx.fillStyle = s.purple ? '#b28aff70' : '#99edff65';
        ctx.fillRect(x - 1, y + s.length, 2, 2);
      });
    }
    function burst(event) {
      if (!moving() || document.hidden || particles.size >= 36) return;
      const rect = event.detail === 0 ? event.target.getBoundingClientRect?.() : null;
      const x = rect ? rect.left + rect.width / 2 : event.clientX;
      const y = rect ? rect.top + rect.height / 2 : event.clientY;
      for (let i = 0; i < 6 && particles.size < 36; i++) {
        const el = document.createElement('span');
        el.className = 'glassy-click-spark'; el.setAttribute('aria-hidden', 'true');
        el.textContent = ['◇', '✦', '01', '◈', '♡', '✧'][i];
        const angle = i * Math.PI / 3 + Math.random() * .3, distance = 28 + Math.random() * 45;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        el.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
        el.style.setProperty('--dy', Math.sin(angle) * distance - 20 + 'px');
        el.style.setProperty('--spin', (Math.random() * 100 - 50) + 'deg');
        scope.append(el); particles.add(el);
        scope.setTimeout(() => {el.remove(); particles.delete(el);}, 850);
      }
    }
    // A fotografia é composta dentro dos glifos. Não usamos getImageData:
    // funciona também em file://, sem leitura de pixels bloqueada pelo navegador.
    function preparePortrait(popup) {
      const image = popup.querySelector('.glassy-matrix-photo');
      const output = popup.querySelector('.glassy-matrix-canvas');
      const controller = new AbortController();
      const p = {popup, image, output, controller, ready: false, elapsed: 0};
      portrait = p;
      function build() {
        if (portrait !== p || !image.naturalWidth || !popup.isConnected) return;
        const w = 540, h = Math.round(w * image.naturalHeight / image.naturalWidth);
        output.width = w; output.height = h;
        const cache = document.createElement('canvas'), mask = document.createElement('canvas');
        cache.width = mask.width = w; cache.height = mask.height = h;
        const a = cache.getContext('2d'), m = mask.getContext('2d'), o = output.getContext('2d');
        if (!a || !m || !o) return; // A foto original permanece como alternativa.
        const cell = 6, row = 9, chars = '01<>[]{}:+*=#ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        m.font = 'bold 9px monospace'; m.textBaseline = 'top'; m.fillStyle = '#fff';
        for (let y = 0; y < h; y += row) for (let x = 0; x < w; x += cell) {
          m.fillText(chars[((x / cell) * 7 + (y / row) * 13) % chars.length], x, y);
        }
        a.filter = 'grayscale(1) contrast(1.25) brightness(1.5)';
        a.drawImage(image, 0, 0, w, h); a.filter = 'none';
        const tint = a.createLinearGradient(0, 0, w, h);
        tint.addColorStop(0, '#70f4ff'); tint.addColorStop(.5, '#bf8bff'); tint.addColorStop(1, '#60e8ff');
        a.globalCompositeOperation = 'multiply'; a.fillStyle = tint; a.fillRect(0, 0, w, h);
        a.globalCompositeOperation = 'destination-in'; a.drawImage(mask, 0, 0);
        Object.assign(p, {cache, ctx: o, w, h, cell, chars, ready: true,
          columns: Array.from({length: w / cell}, (_, i) => ({delay: (Math.sin(i * 17.31) + 1) * .7, speed: .85 + (i % 9) * .035}))});
        popup.querySelector('.glassy-matrix-frame').classList.add('is-ready');
        drawPortrait(0, !moving());
      }
      image.addEventListener('load', build, {signal: controller.signal});
      if (image.complete) build();
    }
    function drawPortrait(dt, still = false) {
      const p = portrait;
      if (!p?.ready || !p.popup.isConnected) return;
      p.elapsed += dt;
      const {ctx: c, w, h, cell} = p;
      c.clearRect(0, 0, w, h); c.font = 'bold 9px monospace'; c.textBaseline = 'top';
      if (still) {p.elapsed = Math.max(p.elapsed, 6); c.drawImage(p.cache, 0, 0); return;}
      // Reutiliza as colunas da foto já composta; apenas as frentes mudam.
      p.columns.forEach((col, i) => {
        const x = i * cell, reveal = Math.max(0, Math.min(h, (p.elapsed - col.delay) * h / 3.8));
        if (reveal > 0) c.drawImage(p.cache, x, 0, cell, reveal, x, 0, cell, reveal);
        const head = p.elapsed < 5.3 ? reveal : ((p.elapsed - 5.3) * 110 * col.speed + col.delay * h) % (h + 140);
        for (let j = 0; j < 7; j++) {
          const y = Math.floor((head - j * 9) / 9) * 9;
          if (y < 0 || y >= h) continue;
          c.globalAlpha = (1 - j / 7) * .8;
          c.fillStyle = j === 0 ? '#e0fcff' : i % 3 ? '#65eaff' : '#bb86ff';
          c.fillText(p.chars[(i * 11 + j + Math.floor(p.elapsed * 9)) % p.chars.length], x, y);
        }
        c.globalAlpha = 1;
      });
    }
    function closePortrait() {
      portrait?.controller.abort(); portrait = null;
      audio.pause(); try {audio.currentTime = 0;} catch (_) {}
    }
    function openSecret() {
      scope.clearTimeout(bubbleTimer);
      bubble.textContent = 'Conexão eterna desbloqueada. ♡';
      void Swal.fire({
        title: 'Rafael + Letícia · conexão eterna',
        html: '<div class="glassy-matrix-frame"><img class="glassy-matrix-photo" src="' + scope.photo + '" alt="Rafael e Letícia na fotografia Cyberpunk" decoding="async"><canvas class="glassy-matrix-canvas" role="img" aria-label="Foto de Rafael e Letícia formada por caracteres digitais ciano e roxo"></canvas></div><p class="glassy-matrix-message">Entre milhões de sinais, eu sempre encontraria você.<br><strong>Em qualquer universo, nossa conexão é real. ♡</strong></p>',
        customClass: {popup: 'glassy-matrix-popup'}, backdrop: 'rgba(3,6,13,.88)',
        confirmButtonText: 'Nossa conexão é eterna ♡', confirmButtonColor: '#7560b4',
        willOpen: popup => {
          audio.currentTime = 0; void audio.play();
        },
        didOpen: preparePortrait,
        willClose: closePortrait,
        didClose: () => {if (bubble.isConnected) bubble.textContent = 'Nossa conexão vai além do código. ◈';}
      });
    }
    function frame(now) {
      scope.requestAnimationFrame(frame);
      if (last && now - last < 1000 / 30 - .5) return;
      const dt = last ? Math.min((now - last) / 1000, .08) : 1 / 30;
      last = now; time += dt; drawBackground(dt); drawPortrait(dt);
    }
    scope.listen(window, 'resize', resize);
    scope.listen(window, 'pointermove', event => {
      pointer = {x: event.clientX / Math.max(width, 1), y: event.clientY / Math.max(height, 1)};
    }, {passive: true});
    scope.listen(document, 'click', burst);
    scope.listen(motion, 'change', () => {last = 0; if (!moving()) drawPortrait(0, true);});
    scope.listen(document, 'erp:appearance-change', () => {last = 0; if (!moving()) drawPortrait(0, true);});
    scope.listen(document, 'visibilitychange', () => {last = 0;});
    scope.listen(mascot, 'click', () => {
      clicks++;
      if (clicks === 10) {clicks = 0; openSecret(); return;}
      const messages = ['Conexão cristalina, Letícia. ◈', 'Há uma memória especial neste cristal. ♡', 'Ciano, violeta e uma surpresa só sua. ✦'];
      bubble.textContent = clicks > 6 ? 'Faltam ' + (10 - clicks) + ' toques para revelar nossa conexão. ♡' : messages[(clicks - 1) % messages.length];
      scope.clearTimeout(bubbleTimer);
      bubbleTimer = scope.setTimeout(() => {bubble.textContent = 'Toque no cristal. Existe uma surpresa aqui. ◈';}, 2800);
    });
    resize(); scope.requestAnimationFrame(frame);
  };
})();

(() => {
  'use strict';
  // O seletor é funcional, independente da preferência de efeitos decorativos.
  let mounted = null;

  function mount() {
    const grid = document.getElementById('erp-theme-grid');
    const cards = grid ? [...grid.querySelectorAll('.erp-theme-card')] : [];
    if (mounted || !cards.length) return;
    const abort = new AbortController();
    const original = cards.map(card => Object.fromEntries(
      ['style', 'tabindex', 'aria-hidden'].map(name => [name, card.getAttribute(name)])
    ));
    let index = Math.max(0, cards.findIndex(card => card.dataset.theme === window.ERPTheme.state.theme));
    let start = null, suppressClick = false;
    const root = document.createElement('section');
    root.id = 'glassyThemeCarousel';
    root.setAttribute('aria-label', 'Glassy Carousel — temas do ERP');
    root.setAttribute('aria-roledescription', 'carrossel');
    root.innerHTML = '<div class="glassy-carousel-head"><span>GLASSY CAROUSEL</span><p>Explore os temas com as setas ou arraste os cartões.</p></div>' +
      '<div class="glassy-stage"></div>' +
      '<div class="glassy-dock"><button type="button" data-glassy-action="prev" aria-label="Tema anterior">‹</button>' +
      '<div class="glassy-dock-caption"><strong></strong><span class="glassy-position"></span></div>' +
      '<button type="button" data-glassy-action="apply">Aplicar tema</button>' +
      '<button type="button" data-glassy-action="next" aria-label="Próximo tema">›</button></div>' +
      '<p class="glassy-announcement" role="status" aria-live="polite" aria-atomic="true"></p>';
    grid.before(root);
    const stage = root.querySelector('.glassy-stage');
    stage.append(grid); // Preserva os botões, suas prévias e o fluxo original de aplicação.
    const on = (el, name, fn, options = {}) => el.addEventListener(name, fn, {...options, signal: abort.signal});

    function render(announce = false) {
      cards.forEach((card, at) => {
        let offset = at - index;
        if (offset > cards.length / 2) offset -= cards.length;
        if (offset < -cards.length / 2) offset += cards.length;
        const depth = Math.abs(offset), hidden = depth > 3;
        card.style.setProperty('--glassy-offset', offset);
        card.style.setProperty('--glassy-depth', depth);
        card.style.setProperty('--glassy-scale', 1 - depth * .085);
        card.style.zIndex = String(cards.length - depth);
        card.dataset.glassyHidden = String(hidden);
        card.classList.toggle('glassy-centered', offset === 0);
        card.tabIndex = offset === 0 ? 0 : -1;
        card.setAttribute('aria-hidden', String(hidden));
      });
      const card = cards[index], name = card.querySelector('strong').textContent;
      const active = card.dataset.theme === window.ERPTheme.state.theme;
      root.querySelector('.glassy-dock-caption strong').textContent = name;
      root.querySelector('.glassy-position').textContent = (index + 1) + ' de ' + cards.length + (active ? ' · Em uso' : ' · Prévia');
      const apply = root.querySelector('[data-glassy-action="apply"]');
      apply.textContent = active ? 'Em uso' : 'Aplicar tema';
      apply.disabled = active;
      if (announce) root.querySelector('.glassy-announcement').textContent = name + '. Tema ' + (index + 1) + ' de ' + cards.length + (active ? '. Em uso.' : '. Pressione Aplicar tema para selecionar.');
    }
    function move(step, focus = false) {
      index = (index + step + cards.length) % cards.length;
      render(true);
      if (focus) cards[index].focus({preventScroll: true});
    }
    function revealActive() {
      index = Math.max(0, cards.findIndex(card => card.dataset.theme === window.ERPTheme.state.theme));
      render();
    }
    on(root, 'click', event => {
      // Um gesto de arraste não deve aplicar o tema sob o ponteiro.
      if (suppressClick && stage.contains(event.target)) {
        suppressClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, {capture: true});
    on(root, 'click', event => {
      switch (event.target.closest('[data-glassy-action]')?.dataset.glassyAction) {
        case 'prev': move(-1); break;
        case 'next': move(1); break;
        case 'apply': cards[index].click(); break;
      }
    });
    on(root, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const focus = !!event.target.closest('.erp-theme-card');
      if (event.key === 'Home' || event.key === 'End') {
        index = event.key === 'Home' ? 0 : cards.length - 1;
        render(true);
        if (focus) cards[index].focus({preventScroll: true});
      } else move(event.key === 'ArrowLeft' ? -1 : 1, focus);
    });
    on(grid, 'focusin', event => {
      const at = cards.indexOf(event.target.closest('.erp-theme-card'));
      if (at >= 0 && at !== index) { index = at; render(); }
    });
    on(stage, 'pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      suppressClick = false;
      start = {id: event.pointerId, x: event.clientX, y: event.clientY};
    });
    on(stage, 'pointerup', event => {
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? -1 : 1, grid.contains(document.activeElement));
        suppressClick = true;
      }
    });
    on(stage, 'pointercancel', () => { start = null; });
    on(stage, 'pointerleave', () => { start = null; });
    mounted = {
      render, revealActive,
      dispose() {
        const restoreFocus = root.contains(document.activeElement) && !grid.contains(document.activeElement);
        abort.abort();
        cards.forEach((card, at) => {
          Object.entries(original[at]).forEach(([name, value]) => {
            if (value === null) card.removeAttribute(name); else card.setAttribute(name, value);
          });
          card.classList.remove('glassy-centered');
          delete card.dataset.glassyHidden;
        });
        root.before(grid);
        root.remove();
        mounted = null;
        if (restoreFocus && document.getElementById('erp-settings').open) {
          grid.querySelector('[aria-pressed="true"]')?.focus({preventScroll: true});
        }
      }
    };
    render();
  }
  function sync() {
    if (document.documentElement.dataset.erpTheme === 'glassy-crm') {
      mount();
      mounted?.render();
    } else mounted?.dispose();
  }
  // settings.js chama sync após criar/atualizar os botões, inclusive na recarga.
  window.ERPGlassyThemeCarousel = Object.freeze({sync, revealActive: () => mounted?.revealActive()});
  window.addEventListener('pagehide', () => mounted?.dispose());
  window.addEventListener('pageshow', sync);
})();
