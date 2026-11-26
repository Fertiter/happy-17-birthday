(() => {
  'use strict';

  /* =========================================================
     ПЕРСОНАЛИЗАЦИЯ: МАССИВ НЕЖНЫХ ФРАЗ И КОМПЛИМЕНТОВ
     Можешь менять эти строки или добавлять новые в список!
     ========================================================= */
  const COMPLIMENTS = [
    'Обнимаю тебя крепко-крепко! Спасибо, что ты есть в моей жизни ✿',
    'Твоя улыбка — мой любимый рассвет. Улыбайся чаще, солнце ♡',
    'Дарю тебе самый нежный цветочек и миллион тёплых поцелуев 🌸',
    'С тобой даже самый обычный день превращается в маленькое чудо ✨',
    'Ты невероятно красивая, добрая и самая особенная девушка на свете ୨୧',
    'Пусть в твои 17 лет сбудется всё, о чём ты тихо мечтаешь перед сном ❀',
    'Каждый разговор с тобой делает меня самым счастливым человеком ♡',
    'Если тебе станет грустно — просто вспомни, как сильно я тебя люблю ❁',
    'Твои глаза сияют ярче любых звёзд — я могу смотреть в них бесконечно ✧',
    'Этот цветочек — только тебе. И всё моё сердце тоже только твоё ˚₊· ͟͟͞͞➳❥'
  ];

  const BADGE_STATUSES = [
    '✧ обнимашки отправлены ♡',
    '✿ цветочек передан тебе',
    '˚₊· тёплый лучик любви ❥',
    '୨୧ нежный комплимент для тебя'
  ];

  const PALETTE = ['#ff5e9c', '#ff9370', '#f5bd42', '#56b8f5', '#a66dff', '#ff7eb8'];
  const AMBIENT_KEYS = ['petal', 'petal', '♡', '✿', '❀', '✦', '✧'];
  const CLICK_KEYS = ['♡', '✿', '✨', '❀', '❁', '✦', '✧'];
  const SALUTE_KEYS = ['♡', '♥', '✿', '❀', '❁', '🌸', '✨', '୨୧', '✦'];
  const MAX_BURST_PARTICLES = 160;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     ЭЛЕМЕНТЫ ИНТЕРФЕЙСА
     ========================================================= */
  const envelopeScreen = document.getElementById('envelope-screen');
  const cardScreen = document.getElementById('card-screen');
  const envelope = document.getElementById('envelope');
  const openCardBtn = document.getElementById('open-card-btn');

  const hugBtn = document.getElementById('hug-btn');
  const complimentBox = document.getElementById('compliment-box');
  const complimentBadge = document.getElementById('compliment-badge');
  const complimentText = document.getElementById('compliment-text');
  const hugCounterEl = document.getElementById('hug-counter');

  const asciiWaveLine = document.getElementById('ascii-wave-line');
  const fxCanvas = document.getElementById('fx-canvas');
  const fxCtx = fxCanvas.getContext('2d');

  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;
  let hasOpenedCard = false;
  let rafId = null;

  /* =========================================================
     ПРЕДВАРИТЕЛЬНЫЙ РЕНДЕР СПРАЙТОВ (ZERO-LAG 60-120 FPS)
     Символы рисуются на мини-канвасы 1 раз при запуске,
     а в анимации используется только быстрый drawImage().
     ========================================================= */
  const SPRITE_SIZE = 44;
  const spriteBank = new Map();

  function drawVectorPetal(ctx, half) {
    const r = half * 0.56;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 1.15, -r * 0.65, r * 1.05, r * 0.72, 0, r);
    ctx.bezierCurveTo(-r * 1.05, r * 0.72, -r * 1.15, -r * 0.65, 0, -r);
    ctx.closePath();
    ctx.fill();
  }

  function buildSprite(key, color) {
    const off = document.createElement('canvas');
    off.width = SPRITE_SIZE;
    off.height = SPRITE_SIZE;
    const ctx = off.getContext('2d');
    const half = SPRITE_SIZE / 2;

    ctx.translate(half, half);
    ctx.fillStyle = color;

    if (key === 'petal') {
      drawVectorPetal(ctx, half);
    } else {
      ctx.font = '26px "Nunito", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key, 0, 1);
    }
    return off;
  }

  function initSpriteBank() {
    const uniqueKeys = Array.from(new Set([...AMBIENT_KEYS, ...CLICK_KEYS, ...SALUTE_KEYS]));
    uniqueKeys.forEach((key) => {
      const variants = PALETTE.map((color) => buildSprite(key, color));
      spriteBank.set(key, variants);
    });
  }

  function getSprite(key, colorIdx) {
    const variants = spriteBank.get(key) || spriteBank.get('♡');
    return variants[((colorIdx % variants.length) + variants.length) % variants.length];
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;

    fxCanvas.width = Math.floor(viewWidth * dpr);
    fxCanvas.height = Math.floor(viewHeight * dpr);
    fxCanvas.style.width = `${viewWidth}px`;
    fxCanvas.style.height = `${viewHeight}px`;
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* =========================================================
     ЖИВОЙ АНИМИРОВАННЫЙ ASCII-БУКЕТ И ПУЛЬС-ПАНЕЛЬ
     ========================================================= */
  const sparkEls = Array.from(document.querySelectorAll('#ascii-bouquet [data-spark]'));
  const coreEls = Array.from(document.querySelectorAll('#ascii-bouquet [data-core]'));
  const petalEls = Array.from(document.querySelectorAll('#ascii-bouquet [data-petal]'));
  const knotEl = document.querySelector('#ascii-bouquet [data-knot]');

  const SPARK_FRAMES = [' ', ' ', '.', '+', '*', "'", '+', ' ', ' '];
  const CORE_FRAMES = ['*o*', 'oO*', '*@*', '+o+', '*o*'];
  const PETAL_FRAMES = ['*', 'o', '+', ':', '*'];
  const KNOT_FRAMES = ['*', 'o', '+', '@'];

  const HEARTBEAT_BAR_FRAMES = [
    '[ · . * o O ♡ O o * . · ]',
    '[ . * o O ♡ ✿ ♡ O o * . ]',
    '[ * o O ♡ ✿ ♥ ✿ ♡ O o * ]',
    '[ . * o O ♡ ✿ ♡ O o * . ]'
  ];

  let asciiTick = 0;
  let asciiTimer = null;

  function stepAsciiBouquet() {
    if (document.hidden || !hasOpenedCard) return;
    asciiTick += 1;

    sparkEls.forEach((el, idx) => {
      el.textContent = SPARK_FRAMES[(asciiTick + idx * 2) % SPARK_FRAMES.length];
    });

    coreEls.forEach((el, idx) => {
      el.textContent = CORE_FRAMES[Math.floor((asciiTick + idx) / 2) % CORE_FRAMES.length];
    });

    petalEls.forEach((el, idx) => {
      el.textContent = PETAL_FRAMES[Math.floor((asciiTick + idx * 2) / 3) % PETAL_FRAMES.length];
    });

    if (knotEl) {
      knotEl.textContent = KNOT_FRAMES[Math.floor(asciiTick / 2) % KNOT_FRAMES.length];
    }

    if (asciiWaveLine) {
      asciiWaveLine.textContent = HEARTBEAT_BAR_FRAMES[asciiTick % HEARTBEAT_BAR_FRAMES.length];
    }
  }

  function startAsciiBouquetLoop() {
    if (prefersReducedMotion || asciiTimer !== null) return;
    stepAsciiBouquet();
    asciiTimer = window.setInterval(stepAsciiBouquet, 240);
  }

  /* =========================================================
     ЕДИНЫЙ ХОЛСТ: ЛЕПЕСТКИ + КЛИКИ + САЛЮТ-СЕРДЦЕ
     ========================================================= */
  const ambientParticles = [];
  const burstParticles = [];

  function createAmbientParticle(fromTop = false) {
    const key = AMBIENT_KEYS[Math.floor(Math.random() * AMBIENT_KEYS.length)];
    return {
      key,
      colorIdx: Math.floor(Math.random() * PALETTE.length),
      x: Math.random() * viewWidth,
      y: fromTop ? -26 - Math.random() * 40 : Math.random() * viewHeight,
      size: key === 'petal' ? 13 + Math.random() * 9 : 14 + Math.random() * 8,
      speedY: 0.45 + Math.random() * 0.65,
      swayAmp: 0.35 + Math.random() * 0.75,
      swayFreq: 0.012 + Math.random() * 0.014,
      phase: Math.random() * Math.PI * 2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.025,
      alpha: 0.32 + Math.random() * 0.25
    };
  }

  function initAmbientParticles() {
    ambientParticles.length = 0;
    const count = prefersReducedMotion
      ? 10
      : Math.min(26, Math.max(14, Math.floor(viewWidth / 48)));
    for (let i = 0; i < count; i += 1) {
      ambientParticles.push(createAmbientParticle(false));
    }
  }

  function pushBurst(opts) {
    if (burstParticles.length >= MAX_BURST_PARTICLES) {
      burstParticles.shift();
    }
    burstParticles.push({
      key: opts.key,
      colorIdx: opts.colorIdx ?? Math.floor(Math.random() * PALETTE.length),
      x: opts.x,
      y: opts.y,
      vx: opts.vx,
      vy: opts.vy,
      gravity: opts.gravity ?? 0.06,
      drag: opts.drag ?? 0.975,
      size: opts.size ?? 20,
      alpha: opts.alpha ?? 1,
      decay: opts.decay ?? 0.016,
      angle: opts.angle ?? (Math.random() - 0.5) * 0.4,
      spin: opts.spin ?? (Math.random() - 0.5) * 0.07,
      colorShiftTick: 0
    });
  }

  function spawnClickBloom(x, y) {
    const baseColor = Math.floor(Math.random() * PALETTE.length);
    const ringCount = prefersReducedMotion ? 4 : 8;

    for (let i = 0; i < ringCount; i += 1) {
      const a = (Math.PI * 2 * i) / ringCount;
      pushBurst({
        key: i % 2 === 0 ? '✧' : '♡',
        colorIdx: baseColor + i,
        x,
        y,
        vx: Math.cos(a) * 2.4,
        vy: Math.sin(a) * 2.4,
        gravity: 0.015,
        drag: 0.94,
        size: 16,
        decay: 0.024
      });
    }

    const scatterCount = prefersReducedMotion ? 4 : 10;
    for (let i = 0; i < scatterCount; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.6 + Math.random() * 3.1;
      pushBurst({
        key: CLICK_KEYS[Math.floor(Math.random() * CLICK_KEYS.length)],
        colorIdx: baseColor + i,
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 1.4,
        gravity: 0.06,
        drag: 0.975,
        size: 18 + Math.random() * 10,
        decay: 0.016 + Math.random() * 0.008
      });
    }
  }

  function spawnSaluteCluster(cx, cy, count = 24, power = 1) {
    const startColor = Math.floor(Math.random() * PALETTE.length);
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const spd = (2.1 + Math.random() * 4.3) * power;
      pushBurst({
        key: SALUTE_KEYS[Math.floor(Math.random() * SALUTE_KEYS.length)],
        colorIdx: startColor + i,
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 2.2 * power,
        gravity: 0.08,
        drag: 0.972,
        size: 20 + Math.random() * 12,
        decay: 0.012 + Math.random() * 0.007
      });
    }
  }

  function spawnHeartFormation(cx, cy) {
    const points = 32;
    const scale = Math.min(viewWidth, viewHeight) * 0.0068;
    const startColor = Math.floor(Math.random() * PALETTE.length);

    for (let i = 0; i < points; i += 1) {
      const t = (Math.PI * 2 * i) / points;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)
      );

      pushBurst({
        key: i % 3 === 0 ? '♡' : i % 3 === 1 ? '✿' : '✨',
        colorIdx: startColor + Math.floor(i / 4),
        x: cx,
        y: cy,
        vx: hx * scale * 0.145,
        vy: hy * scale * 0.145,
        gravity: 0.016,
        drag: 0.935,
        size: i % 2 === 0 ? 22 : 18,
        decay: 0.009,
        angle: 0,
        spin: 0.025
      });
    }
  }

  function launchHeartSalute(originX, originY) {
    if (prefersReducedMotion) {
      spawnSaluteCluster(originX, originY, 10, 0.75);
      return;
    }

    spawnSaluteCluster(originX, originY, 22, 1.05);

    window.setTimeout(() => {
      spawnHeartFormation(viewWidth * 0.5, viewHeight * 0.33);
    }, 130);

    window.setTimeout(() => {
      spawnSaluteCluster(viewWidth * 0.22, viewHeight * 0.36, 16, 0.9);
      spawnSaluteCluster(viewWidth * 0.78, viewHeight * 0.32, 16, 0.9);
    }, 300);
  }

  function renderFrame(step = true) {
    fxCtx.clearRect(0, 0, viewWidth, viewHeight);

    for (let i = 0; i < ambientParticles.length; i += 1) {
      const p = ambientParticles[i];
      if (step) {
        p.phase += p.swayFreq;
        p.y += p.speedY;
        p.x += Math.sin(p.phase) * p.swayAmp;
        p.angle += p.spin;

        if (p.y > viewHeight + 30) {
          ambientParticles[i] = createAmbientParticle(true);
          continue;
        }
        if (p.x < -28) p.x = viewWidth + 24;
        if (p.x > viewWidth + 28) p.x = -24;
      }

      const sprite = getSprite(p.key, p.colorIdx);
      const half = p.size / 2;
      fxCtx.save();
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.angle);
      fxCtx.globalAlpha = p.alpha;
      fxCtx.drawImage(sprite, -half, -half, p.size, p.size);
      fxCtx.restore();
    }

    for (let i = burstParticles.length - 1; i >= 0; i -= 1) {
      const b = burstParticles[i];
      b.vx *= b.drag;
      b.vy = b.vy * b.drag + b.gravity;
      b.x += b.vx;
      b.y += b.vy;
      b.angle += b.spin;
      b.alpha -= b.decay;
      b.colorShiftTick += 1;

      if (b.colorShiftTick % 14 === 0) {
        b.colorIdx += 1;
      }

      if (b.alpha <= 0) {
        burstParticles.splice(i, 1);
        continue;
      }

      const sprite = getSprite(b.key, b.colorIdx);
      const half = b.size / 2;
      fxCtx.save();
      fxCtx.translate(b.x, b.y);
      fxCtx.rotate(b.angle);
      fxCtx.globalAlpha = Math.max(0, b.alpha);
      fxCtx.drawImage(sprite, -half, -half, b.size, b.size);
      fxCtx.restore();
    }

    if (!prefersReducedMotion && !document.hidden) {
      rafId = requestAnimationFrame(() => renderFrame(true));
    } else {
      rafId = null;
    }
  }

  /* =========================================================
     ОТКРЫТИЕ КОНВЕРТА И ПЕРЕХОД К ОТКРЫТКЕ
     ========================================================= */
  function getElementCenter(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function openCard(triggerEl) {
    if (hasOpenedCard) return;
    hasOpenedCard = true;

    openCardBtn.disabled = true;
    envelope.classList.add('is-opening');

    const center = getElementCenter(triggerEl || envelope);
    spawnSaluteCluster(center.x, center.y, 22, 0.92);

    const openDelay = prefersReducedMotion ? 50 : 620;
    const swapDelay = prefersReducedMotion ? 80 : 420;

    window.setTimeout(() => {
      envelopeScreen.classList.add('is-hidden');

      window.setTimeout(() => {
        envelopeScreen.hidden = true;
        cardScreen.hidden = false;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            cardScreen.classList.remove('is-hidden');
            cardScreen.classList.add('is-visible');
            startAsciiBouquetLoop();
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });

            if (!prefersReducedMotion) {
              spawnHeartFormation(viewWidth * 0.5, viewHeight * 0.25);
            }
          });
        });
      }, swapDelay);
    }, openDelay);
  }

  envelope.addEventListener('click', () => openCard(envelope));
  envelope.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCard(envelope);
    }
  });
  openCardBtn.addEventListener('click', () => openCard(openCardBtn));

  /* =========================================================
     КНОПКА «ОБНИМАШКИ И ЦВЕТОЧЕК» С ПЕЧАТЬЮ ФРАЗ
     ========================================================= */
  let phraseBag = [];
  let lastPhraseIndex = -1;
  let hugCount = 0;
  let typeTimer = null;

  function refillPhraseBag() {
    phraseBag = COMPLIMENTS.map((_, idx) => idx);
    for (let i = phraseBag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [phraseBag[i], phraseBag[j]] = [phraseBag[j], phraseBag[i]];
    }
    if (phraseBag.length > 1 && phraseBag[phraseBag.length - 1] === lastPhraseIndex) {
      [phraseBag[0], phraseBag[phraseBag.length - 1]] = [
        phraseBag[phraseBag.length - 1],
        phraseBag[0]
      ];
    }
  }

  function getNextCompliment() {
    if (phraseBag.length === 0) {
      refillPhraseBag();
    }
    const index = phraseBag.pop();
    lastPhraseIndex = index;
    return COMPLIMENTS[index];
  }

  function typeTextSmoothly(targetEl, fullText) {
    if (typeTimer !== null) {
      window.clearInterval(typeTimer);
      typeTimer = null;
    }

    if (prefersReducedMotion) {
      targetEl.textContent = fullText;
      return;
    }

    const chars =
      typeof Intl !== 'undefined' && Intl.Segmenter
        ? Array.from(
            new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(fullText),
            (seg) => seg.segment
          )
        : Array.from(fullText);
    let cursor = 0;
    targetEl.textContent = '';

    typeTimer = window.setInterval(() => {
      cursor = Math.min(chars.length, cursor + 3);
      targetEl.textContent = chars.slice(0, cursor).join('');
      if (cursor >= chars.length) {
        window.clearInterval(typeTimer);
        typeTimer = null;
      }
    }, 18);
  }

  hugBtn.addEventListener('click', (event) => {
    hugCount += 1;
    const phrase = getNextCompliment();

    complimentBadge.textContent = BADGE_STATUSES[(hugCount - 1) % BADGE_STATUSES.length];
    hugCounterEl.textContent = `${hugCount} 🌸`;

    if (complimentBox.hidden) {
      complimentBox.hidden = false;
    }

    complimentBox.classList.remove('is-popping');
    void complimentBox.offsetWidth;
    complimentBox.classList.add('is-popping');

    typeTextSmoothly(complimentText, phrase);

    const hasPointerCoords = event.clientX > 0 || event.clientY > 0;
    const origin = hasPointerCoords
      ? { x: event.clientX, y: event.clientY }
      : getElementCenter(hugBtn);

    launchHeartSalute(origin.x, origin.y);
  });

  /* =========================================================
     КЛИК / ТАП В ЛЮБОМ МЕСТЕ ЭКРАНА
     ========================================================= */
  document.addEventListener('click', (event) => {
    if (event.target.closest('#hug-btn, #open-card-btn, #envelope')) {
      return;
    }
    if (event.clientX === 0 && event.clientY === 0) {
      return;
    }
    spawnClickBloom(event.clientX, event.clientY);
  });

  /* =========================================================
     ИНИЦИАЛИЗАЦИЯ И ОПТИМИЗАЦИЯ ПРИ СМЕНЕ ВКЛАДКИ
     ========================================================= */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (!prefersReducedMotion && rafId === null) {
      renderFrame(true);
    }
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
    if (prefersReducedMotion) {
      renderFrame(false);
    }
  });

  initSpriteBank();
  resizeCanvas();
  initAmbientParticles();
  renderFrame(!prefersReducedMotion);
})();
