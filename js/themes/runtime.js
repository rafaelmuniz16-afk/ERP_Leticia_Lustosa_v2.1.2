
(() => {
  'use strict';
  const assets = window.ERPThemeAssets;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = null, serial = 0, pageSuspended = false;

  function createScope(theme) {
    const id = ++serial,
      abort = new AbortController(),
      timeouts = new Set(),
      intervals = new Map(),
      frames = new Map(),
      nodes = new Set(),
      audio = new Set(),
      globals = new Map();

    let disposed = false,
      frameId = null,
      sequence = 0,
      lastFrame = 0,
      ticking = false,
      renderedFrames = 0;

    const themeAssets = assets.themes[theme];
    const mediaControls = new Map();
    const backgroundColor = document.body.style.backgroundColor;
    const animated = () =>
      !disposed &&
      !document.hidden &&
      !pageSuspended &&
      ERPTheme.state.effects &&
      !motion.matches;

    function prune() {
      for (const n of nodes) {
        if (!n.isConnected) nodes.delete(n);
      }
    }

    function ensureFrame() {
      if (animated() && frames.size && !frameId && !ticking) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    function tick(now) {
      frameId = null;
      if (!animated()) return;

      // A física dos efeitos é calibrada para 60 quadros/s.
      if (lastFrame && now - lastFrame < 1000 / 60 - 0.7) {
        ensureFrame();
        return;
      }

      lastFrame = now;
      ticking = true;
      renderedFrames++;

      const callbacks = [...frames.values()];
      frames.clear();

      try {
        for (const cb of callbacks) {
          if (!disposed) cb(now);
        }
      } finally {
        ticking = false;
        ensureFrame();
      }
    }

    function frame(cb) {
      const token = ++sequence;
      frames.set(token, cb);
      ensureFrame();
      return token;
    }

    function timeout(cb, delay, ...args) {
      if (disposed) return 0;

      const handle = window.setTimeout(() => {
        timeouts.delete(handle);
        if (!disposed) cb(...args);
        prune();
      }, delay);

      timeouts.add(handle);
      return handle;
    }

    function clearTimeoutOwned(handle) {
      window.clearTimeout(handle);
      timeouts.delete(handle);
    }

    function interval(cb, delay, ...args) {
      const key = ++sequence;
      const entry = {
        cb: () => {
          if (!disposed) cb(...args);
        },
        delay,
        handle: null
      };

      intervals.set(key, entry);

      if (!document.hidden && !pageSuspended) {
        entry.handle = window.setInterval(entry.cb, delay);
      }

      return key;
    }

    function clearIntervalOwned(key) {
      const entry = intervals.get(key);
      if (entry) window.clearInterval(entry.handle);
      intervals.delete(key);
    }

    function refresh() {
      if (!animated() && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
        lastFrame = 0;
      }

      for (const entry of intervals.values()) {
        if ((document.hidden || pageSuspended) && entry.handle) {
          window.clearInterval(entry.handle);
          entry.handle = null;
        } else if (
          !document.hidden &&
          !pageSuspended &&
          !entry.handle
        ) {
          entry.handle = window.setInterval(entry.cb, entry.delay);
        }
      }

      ensureFrame();
    }

    const facade = new Proxy(window, {
      get: (target, key) => target[key],
      set: (target, key, value) => {
        if (!globals.has(key)) {
          globals.set(key, {
            descriptor: Object.getOwnPropertyDescriptor(target, key),
            value
          });
        } else {
          globals.get(key).value = value;
        }

        target[key] = value;
        return true;
      }
    });

    function mediaNotice(filename, message) {
      const popup = window.Swal?.getPopup();
      if (popup?.dataset.erpEffectScope !== String(id)) return;

      let note = [...popup.querySelectorAll('.erp-media-status')]
        .find(n => n.dataset.asset === filename);

      if (!note) {
        note = document.createElement('p');
        note.className = 'erp-media-status';
        note.dataset.asset = filename;
        note.setAttribute('role', 'status');

        popup.querySelector('.swal2-html-container')?.append(note);
      }

      note.textContent = message;
    }

    function clearNotice(filename) {
      const popup = window.Swal?.getPopup();
      if (popup?.dataset.erpEffectScope !== String(id)) return;

      for (const note of popup.querySelectorAll('.erp-media-status')) {
        if (note.dataset.asset === filename) note.remove();
      }
    }

    function ownMedia(media, filename, type) {
      const urls = assets.candidates(filename, type);
      let index = 0, wantsPlayback = false, released = false;

      const nativeLoad = media.load.bind(media);
      const nativePlay = media.play.bind(media);
      const nativePause = media.pause.bind(media);

      const available = () =>
        !disposed && !released && urls.length > 0;

      function source() {
        if (!media.getAttribute('src') && available()) {
          media.src = urls[index];
        }
      }

      function play() {
        if (!available()) return Promise.resolve();

        wantsPlayback = true;
        source();

        return nativePlay().catch(error => {
          if (
            !available() ||
            !wantsPlayback ||
            error.name === 'AbortError'
          ) {
            return;
          }

          if (error.name === 'NotAllowedError') {
            mediaNotice(
              filename,
              'O navegador bloqueou a reprodução automática. Use o controle de reprodução desta mídia.'
            );

            const popup = window.Swal?.getPopup();

            if (popup?.dataset.erpEffectScope === String(id)) {
              media.controls = true;

              if (!media.isConnected) {
                popup.querySelector('.swal2-html-container')
                  ?.append(media);
              }
            }
          }
        });
      }

      media.preload = 'none';

      media.load = () => {
        if (available()) {
          source();
          nativeLoad();
        }
      };

      media.play = play;
      media.pause = () => {
        wantsPlayback = false;
        nativePause();
      };

      media.addEventListener('error', () => {
        if (!available()) return;

        if (index + 1 < urls.length) {
          media.src = urls[++index];
          nativeLoad();

          if (wantsPlayback) void play();
        } else {
          mediaNotice(
            filename,
            'Não foi possível carregar ' + filename +
            '. Confira esse arquivo na raiz ou na pasta assets do projeto.'
          );
        }
      }, { signal: abort.signal });

      media.addEventListener('loadeddata', () => {
        if (available()) {
          assets.remember(filename, media.currentSrc || media.src);
          clearNotice(filename);
        }
      }, { signal: abort.signal });

      const control = {
        release() {
          if (released) return;

          released = true;
          wantsPlayback = false;
          nativePause();
          media.removeAttribute('src');
          nativeLoad();
          audio.delete(media);
          mediaControls.delete(media);
        }
      };

      audio.add(media);
      mediaControls.set(media, control);

      return media;
    }

    function OwnedAudio() {
      return ownMedia(
        new window.Audio(),
        themeAssets.audio,
        'audio'
      );
    }

    function stopAudio() {
      for (const media of audio) {
        media.pause();

        try {
          media.currentTime = 0;
        } catch (_) {}
      }
    }

    function bindPhoto(img) {
      const filename = themeAssets.photo;
      const urls = assets.candidates(filename, 'photo');
      let index = 0;

      function next() {
        if (disposed || !img.isConnected) return;

        if (index + 1 < urls.length) {
          img.src = urls[++index];
        } else {
          img.hidden = true;

          mediaNotice(
            filename,
            'Não foi possível carregar ' + filename +
            '. Confira esse arquivo na raiz ou na pasta assets do projeto.'
          );
        }
      }

      img.addEventListener('error', next, {
        signal: abort.signal
      });

      img.addEventListener('load', () => {
        assets.remember(filename, img.currentSrc || img.src);
        clearNotice(filename);
      }, {
        signal: abort.signal
      });
    }

    const scopedSwal = Object.create(window.Swal || null);

    scopedSwal.fire = options => {
      if (disposed || !window.Swal) {
        return Promise.resolve({ isDismissed: true });
      }

      const open = options.willOpen;
      const close = options.willClose;
      const videos = [];

      return window.Swal.fire({
        ...options,

        customClass: {
          ...options.customClass,
          popup: (options.customClass?.popup || '') +
            ' erp-easter-egg'
        },

        willOpen: popup => {
          popup.dataset.erpEffectScope = String(id);

          popup.querySelectorAll('.swal2-html-container img')
            .forEach(bindPhoto);

          popup.querySelectorAll('video[data-erp-theme-video]')
            .forEach(video => {
              ownMedia(video, themeAssets.video, 'video');
              videos.push(video);
              void video.play();
            });

          open?.(popup);
        },

        willClose: popup => {
          stopAudio();

          for (const video of videos) {
            mediaControls.get(video)?.release();
          }

          close?.(popup);
        }
      });
    };

    const scope = {
      window: facade,
      document,

      // Recalcula o caminho quando a mídia for solicitada.
      // Assim, uma abertura posterior usa o caminho memorizado
      // após a primeira carga bem-sucedida.
      get photo() {
        return assets.candidates(themeAssets.photo, 'photo')[0] || '';
      },

      get video() {
        return assets.candidates(themeAssets.video, 'video')[0] || '';
      },

      setTimeout: timeout,
      clearTimeout: clearTimeoutOwned,
      setInterval: interval,
      clearInterval: clearIntervalOwned,
      requestAnimationFrame: frame,
      Audio: OwnedAudio,
      Swal: scopedSwal,
      stopAudio,
      refresh,

      listen(target, type, callback, options) {
        if (target === facade) target = window;

        // Um efeito recém-montado não processa o clique que
        // selecionou seu próprio tema.
        const wrapped = e => {
          if (e.target?.closest?.('#erp-settings')) return;
          if (!disposed) callback(e);
        };

        const opts = typeof options === 'boolean'
          ? { capture: options }
          : options || {};

        target.addEventListener(type, wrapped, {
          ...opts,
          signal: abort.signal
        });
      },

      append(node) {
        if (!animated()) return node;

        document.body.appendChild(node);
        nodes.add(node);

        return node;
      },

      stats() {
        prune();

        return {
          theme,
          frames: frames.size,
          renderedFrames,
          timeouts: timeouts.size,
          intervals: intervals.size,
          particles: nodes.size,
          disposed
        };
      },

      dispose() {
        if (disposed) return;

        disposed = true;
        abort.abort();

        if (frameId) {
          window.cancelAnimationFrame(frameId);
        }

        for (const h of timeouts) {
          window.clearTimeout(h);
        }

        for (const entry of intervals.values()) {
          window.clearInterval(entry.handle);
        }

        frames.clear();
        timeouts.clear();
        intervals.clear();

        for (const n of nodes) n.remove();
        nodes.clear();

        stopAudio();

        for (const control of [...mediaControls.values()]) {
          control.release();
        }

        audio.clear();

        const popup = window.Swal?.getPopup();

        if (popup?.dataset.erpEffectScope === String(id)) {
          window.Swal.close();
        }

        for (const [key, old] of globals) {
          if (window[key] === old.value) {
            if (old.descriptor) {
              Object.defineProperty(window, key, old.descriptor);
            } else {
              delete window[key];
            }
          }
        }

        globals.clear();
        document.body.style.backgroundColor = backgroundColor;
      }
    };

    return scope;
  }

  window.ERPThemeRuntime = Object.freeze({
    mount(theme) {
      current?.dispose();
      current = createScope(theme);
      ERPThemeEffects[theme](current);
    },

    unmount() {
      current?.dispose();
      current = null;
    },

    refresh() {
      current?.refresh();
    },

    stats() {
      return current?.stats() || null;
    }
  });

  function visibility() {
    document.documentElement.dataset.erpPaused = String(document.hidden);
    current?.refresh();

    if (document.hidden) current?.stopAudio();
  }

  document.addEventListener('visibilitychange', visibility);

  motion.addEventListener('change', () => current?.refresh());

  window.addEventListener('pagehide', e => {
    pageSuspended = true;
    current?.refresh();
    current?.stopAudio();

    if (!e.persisted) {
      current?.dispose();
      current = null;
    }
  });

  window.addEventListener('pageshow', () => {
    pageSuspended = false;
    current?.refresh();
  });
})();
