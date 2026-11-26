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

  // Палитра оттенков HSL для плавного переливания (розовый, персик, золото, лаванда)
  const IRIDESCENT_HUES = [336, 350, 18, 40, 278, 315];
  const CLICK_SYMBOLS = ['♡', '✿', '✨', '❀', '❁', '✦', '✧'];
  const SALUTE_SYMBOLS = ['♡', '♥', '✿', '❀', '❁', '🌸', '✨', '୨୧', '✦'];
  const TRAIL_SYMBOLS = ['✧', '✦', '♡', '✿', '·'];

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

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

  const petalsCanvas = document.getElementById('petals-canvas');
  const petalsCtx = petalsCanvas.getContext('2d');
  const burstCanvas = document.getElementById('burst-canvas');
  const burstCtx = burstCanvas.getContext('2d');

  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;
  let hasOpenedCard = false;
  let bgRafId = null;
  let burstRafId = null;

  /* =========================================================
     ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ЦВЕТА И РАЗМЕРОВ
     ========================================================= */
  function pickHue() {
    return IRIDESCENT_HUES[Math.floor(Math.random() * IRIDESCENT_HUES.length)];
  }

  function hslColor(hue, sat = 84, light = 72) {
    const normalized = ((hue % 360) + 360) % 360;
    return `hsl(${normalized.toFixed(1)}, ${sat}%, ${light}%)`;
  }

  function resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;

    [petalsCanvas, burstCanvas].forEach((canvas) => {
      canvas.width = Math.floor(viewWidth * dpr);
      canvas.height = Math.floor(viewHeight * dpr);
      canvas.style.width = `${viewWidth}px`;
      canvas.style.height = `${viewHeight}px`;
    });

    petalsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    burstCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* =========================================================
     ЖИВОЙ АНИМИРОВАННЫЙ ASCII-БУКЕТ (ПОКАДРОВАЯ СМЕНА СИМВОЛОВ)
     Все символы строго 1-колоночные ASCII — вёрстка никогда не сдвигается.
     ========================================================= */
  const sparkEls = Array.from(document.querySelectorAll('#ascii-bouquet [data-spark]'));
  const coreEls = Array.from(document.querySelectorAll('#ascii-bouquet [data-core]'));
  const petalEls = Array.from(document.querySelectorAll('#ascii-bouquet [data-petal]'));
  const knotEl = document.querySelector('#ascii-bouquet [data-knot]');

  const SPARK_FRAMES = [' ', ' ', '.', '+', '*', "'", '+', ' ', ' '];
  const CORE_FRAMES = ['*o*', 'oO*', '*@*', '+o+', '*o*'];
  const PETAL_FRAMES = ['*', 'o', '+', ':', '*'];
  const KNOT_FRAMES = ['*', 'o', '+', '@'];

  let asciiTick = 0;
  let asciiTimer = null;

  function stepAsciiBouquet() {
    if (document.hidden || !hasOpenedCard) return;
    asciiTick += 1;

    sparkEls.forEach((el, idx) => {
      const frameIdx = (asciiTick + idx * 2) % SPARK_FRAMES.length;
      el.textContent = SPARK_FRAMES[frameIdx];
    });

    coreEls.forEach((el, idx) => {
      const frameIdx = Math.floor((asciiTick + idx) / 2) % CORE_FRAMES.length;
      el.textContent = CORE_FRAMES[frameIdx];
    });

    petalEls.forEach((el, idx) => {
      const frameIdx = Math.floor((asciiTick + idx * 2) / 3) % PETAL_FRAMES.length;
      el.textContent = PETAL_FRAMES[frameIdx];
    });

    if (knotEl) {
      knotEl.textContent = KNOT_FRAMES[Math.floor(asciiTick / 2) % KNOT_FRAMES.length];
    }
  }

  function startAsciiBouquetLoop() {
    if (prefersReducedMotion || asciiTimer !== null) return;
    stepAsciiBouquet();
    asciiTimer = window.setInterval(stepAsciiBouquet, 240);
  }

  /* =========================================================
     СЛОЙ 1: ПЕРЕЛИВАЮЩИЕСЯ ЛЕПЕСТКИ, СИМВОЛЫ И ВОСХОДЯЩИЕ ИСКРЫ
     ========================================================= */
  const fallingItems = [];
  const risingSparks = [];
  const BG_SYMBOLS = ['♡', '✿', '❀', '❁', '✦', '✧', '୨୧'];

  function createFallingItem(startFromTop = false) {
    const isSymbol = Math.random() < 0.48;
    const size = isSymbol ? 11 + Math.random() * 10 : 7 + Math.random() * 8;
    return {
      isSymbol,
      symbol: BG_SYMBOLS[Math.floor(Math.random() * BG_SYMBOLS.length)],
      baseHue: pickHue(),
      hueSpeed: 0.25 + Math.random() * 0.35,
      x: Math.random() * viewWidth,
      y: startFromTop ? -26 - Math.random() * 40 : Math.random() * viewHeight,
      size,
      speedY: 0.42 + Math.random() * 0.72,
      swayAmp: 0.45 + Math.random() * 0.85,
      swayFreq: 0.008 + Math.random() * 0.012,
      phase: Math.random() * Math.PI * 2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.022,
      alpha: 0.36 + Math.random() * 0.44
    };
  }

  function createRisingSpark(startFromBottom = false) {
    return {
      symbol: Math.random() < 0.5 ? '✧' : '·',
      baseHue: pickHue(),
      x: Math.random() * viewWidth,
      y: startFromBottom ? viewHeight + 16 + Math.random() * 30 : Math.random() * viewHeight,
      size: 10 + Math.random() * 7,
      speedY: 0.32 + Math.random() * 0.52,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.03 + Math.random() * 0.04
    };
  }

  function initBgParticles() {
    fallingItems.length = 0;
    risingSparks.length = 0;

    const fallCount = Math.min(36, Math.max(18, Math.floor(viewWidth / 34)));
    for (let i = 0; i < fallCount; i += 1) {
      fallingItems.push(createFallingItem(false));
    }

    const sparkCount = Math.min(16, Math.max(8, Math.floor(viewWidth / 85)));
    for (let i = 0; i < sparkCount; i += 1) {
      risingSparks.push(createRisingSpark(false));
    }
  }

  function drawPetalShape(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.56);
    ctx.bezierCurveTo(size * 0.7, -size * 0.42, size * 0.65, size * 0.46, 0, size * 0.62);
    ctx.bezierCurveTo(-size * 0.65, size * 0.46, -size * 0.7, -size * 0.42, 0, -size * 0.56);
    ctx.closePath();
    ctx.fill();
  }

  function renderBgParticles(step = true) {
    petalsCtx.clearRect(0, 0, viewWidth, viewHeight);
    const now = performance.now() * 0.04;

    for (let i = 0; i < risingSparks.length; i += 1) {
      const s = risingSparks[i];
      if (step) {
        s.phase += s.twinkleSpeed;
        s.y -= s.speedY;
        s.x += Math.sin(s.phase * 0.6) * 0.25;
        if (s.y < -20) {
          risingSparks[i] = createRisingSpark(true);
          continue;
        }
      }

      const twinkleAlpha = 0.22 + (Math.sin(s.phase) + 1) * 0.3;
      petalsCtx.save();
      petalsCtx.translate(s.x, s.y);
      petalsCtx.globalAlpha = twinkleAlpha;
      petalsCtx.fillStyle = hslColor(s.baseHue + now * 0.2, 86, 75);
      petalsCtx.font = `${s.size}px "Nunito", "Segoe UI Emoji", sans-serif`;
      petalsCtx.textAlign = 'center';
      petalsCtx.textBaseline = 'middle';
      petalsCtx.fillText(s.symbol, 0, 0);
      petalsCtx.restore();
    }

    for (let i = 0; i < fallingItems.length; i += 1) {
      const p = fallingItems[i];
      if (step) {
        p.phase += p.swayFreq;
        p.y += p.speedY;
        p.x += Math.sin(p.phase) * p.swayAmp;
        p.angle += p.spin;
        p.baseHue += p.hueSpeed;

        if (p.y > viewHeight + 32) {
          fallingItems[i] = createFallingItem(true);
          continue;
        }
        if (p.x < -30) p.x = viewWidth + 24;
        if (p.x > viewWidth + 30) p.x = -24;
      }

      petalsCtx.save();
      petalsCtx.translate(p.x, p.y);
      petalsCtx.rotate(p.angle);
      petalsCtx.globalAlpha = p.alpha;
      petalsCtx.fillStyle = hslColor(p.baseHue, 82, 72);

      if (p.isSymbol) {
        petalsCtx.font = `${p.size}px "Nunito", "Segoe UI Emoji", sans-serif`;
        petalsCtx.textAlign = 'center';
        petalsCtx.textBaseline = 'middle';
        petalsCtx.fillText(p.symbol, 0, 0);
      } else {
        drawPetalShape(petalsCtx, p.size);
      }

      petalsCtx.restore();
    }

    if (!prefersReducedMotion && !document.hidden) {
      bgRafId = requestAnimationFrame(() => renderBgParticles(true));
    } else {
      bgRafId = null;
    }
  }

  /* =========================================================
     СЛОЙ 2: КЛИКИ, СЛЕД И ПАРАМЕТРИЧЕСКИЙ САЛЮТ-СЕРДЦЕ
     ========================================================= */
  const burstParticles = [];

  function ensureBurstLoop() {
    if (burstRafId === null && !document.hidden) {
      burstRafId = requestAnimationFrame(renderBurstParticles);
    }
  }

  function addBurstParticle(opts) {
    burstParticles.push({
      x: opts.x,
      y: opts.y,
      vx: opts.vx,
      vy: opts.vy,
      gravity: opts.gravity ?? 0.06,
      drag: opts.drag ?? 0.975,
      size: opts.size ?? 16,
      symbol: opts.symbol,
      hue: opts.hue ?? pickHue(),
      hueSpeed: opts.hueSpeed ?? (0.8 + Math.random() * 1.4),
      alpha: opts.alpha ?? 1,
      decay: opts.decay ?? 0.015,
      rotation: opts.rotation ?? (Math.random() - 0.5) * 0.4,
      spin: opts.spin ?? (Math.random() - 0.5) * 0.07,
      twinklePhase: Math.random() * Math.PI * 2
    });
  }

  function spawnClickBloom(x, y) {
    if (prefersReducedMotion) {
      for (let i = 0; i < 5; i += 1) {
        const angle = (Math.PI * 2 * i) / 5;
        addBurstParticle({
          x,
          y,
          vx: Math.cos(angle) * 1.4,
          vy: Math.sin(angle) * 1.4 - 0.6,
          size: 15,
          symbol: CLICK_SYMBOLS[i % CLICK_SYMBOLS.length],
          decay: 0.03
        });
      }
      ensureBurstLoop();
      return;
    }

    // Нежное кольцо из светящихся микро-символов вокруг точки нажатия
    const ringCount = 8;
    const baseHue = pickHue();
    for (let i = 0; i < ringCount; i += 1) {
      const angle = (Math.PI * 2 * i) / ringCount;
      addBurstParticle({
        x,
        y,
        vx: Math.cos(angle) * 2.5,
        vy: Math.sin(angle) * 2.5,
        gravity: 0.01,
        drag: 0.94,
        size: 12,
        symbol: i % 2 === 0 ? '✧' : '·',
        hue: baseHue + i * 16,
        hueSpeed: 1.6,
        decay: 0.024,
        spin: 0.05
      });
    }

    // Основные вылетающие сердечки и цветочки
    const scatterCount = 10;
    for (let i = 0; i < scatterCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 3.1;
      addBurstParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        gravity: 0.058,
        drag: 0.978,
        size: 14 + Math.random() * 10,
        symbol: CLICK_SYMBOLS[Math.floor(Math.random() * CLICK_SYMBOLS.length)],
        hue: baseHue + i * 14,
        hueSpeed: 1.3,
        decay: 0.015 + Math.random() * 0.009
      });
    }

    ensureBurstLoop();
  }

  function spawnTrailSpark(x, y) {
    addBurstParticle({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 0.55,
      vy: -0.45 - Math.random() * 0.55,
      gravity: -0.005,
      drag: 0.98,
      size: 10 + Math.random() * 6,
      symbol: TRAIL_SYMBOLS[Math.floor(Math.random() * TRAIL_SYMBOLS.length)],
      hueSpeed: 1.8,
      alpha: 0.82,
      decay: 0.026,
      spin: 0.04
    });
    ensureBurstLoop();
  }

  function spawnSaluteCluster(cx, cy, count = 26, power = 1) {
    const startHue = pickHue();
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.1 + Math.random() * 4.5) * power;
      addBurstParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.3 * power,
        gravity: 0.082,
        drag: 0.974,
        size: 16 + Math.random() * 13,
        symbol: SALUTE_SYMBOLS[Math.floor(Math.random() * SALUTE_SYMBOLS.length)],
        hue: startHue + i * 11,
        hueSpeed: 1.5,
        decay: 0.011 + Math.random() * 0.008
      });
    }
    ensureBurstLoop();
  }

  // Салют-созвездие в форме сердца из переливающихся символов
  function spawnHeartFormation(cx, cy) {
    const points = 34;
    const scale = Math.min(viewWidth, viewHeight) * 0.0068;
    const startHue = pickHue();

    for (let i = 0; i < points; i += 1) {
      const t = (Math.PI * 2 * i) / points;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)
      );

      addBurstParticle({
        x: cx,
        y: cy,
        vx: hx * scale * 0.145,
        vy: hy * scale * 0.145,
        gravity: 0.016,
        drag: 0.935,
        size: i % 2 === 0 ? 18 : 15,
        symbol: i % 3 === 0 ? '♡' : i % 3 === 1 ? '✿' : '✨',
        hue: startHue + (i * 360) / points * 0.45,
        hueSpeed: 1.7,
        decay: 0.0088,
        rotation: 0,
        spin: 0.025
      });
    }
    ensureBurstLoop();
  }

  function launchHeartSalute(originX, originY) {
    if (prefersReducedMotion) {
      spawnSaluteCluster(originX, originY, 10, 0.75);
      return;
    }

    // 1. Фонтан сердечек и цветов прямо из кнопки
    spawnSaluteCluster(originX, originY, 26, 1.05);

    // 2. Большое символьное сердце-салют в центре неба
    window.setTimeout(() => {
      spawnHeartFormation(viewWidth * 0.5, viewHeight * 0.33);
    }, 140);

    // 3. Два боковых переливающихся залпа
    window.setTimeout(() => {
      spawnSaluteCluster(viewWidth * 0.22, viewHeight * 0.36, 20, 0.92);
      spawnSaluteCluster(viewWidth * 0.78, viewHeight * 0.32, 20, 0.92);
    }, 320);
  }

  function renderBurstParticles() {
    burstCtx.clearRect(0, 0, viewWidth, viewHeight);

    for (let i = burstParticles.length - 1; i >= 0; i -= 1) {
      const p = burstParticles[i];
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.hue += p.hueSpeed;
      p.twinklePhase += 0.16;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        burstParticles.splice(i, 1);
        continue;
      }

      const shimmerLight = 68 + Math.sin(p.twinklePhase) * 9;
      burstCtx.save();
      burstCtx.translate(p.x, p.y);
      burstCtx.rotate(p.rotation);
      burstCtx.globalAlpha = Math.max(0, p.alpha);
      burstCtx.fillStyle = hslColor(p.hue, 86, shimmerLight);
      burstCtx.font = `${p.size}px "Nunito", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      burstCtx.textAlign = 'center';
      burstCtx.textBaseline = 'middle';
      burstCtx.fillText(p.symbol, 0, 0);
      burstCtx.restore();
    }

    if (burstParticles.length > 0 && !document.hidden) {
      burstRafId = requestAnimationFrame(renderBurstParticles);
    } else {
      burstRafId = null;
      if (burstParticles.length === 0) {
        burstCtx.clearRect(0, 0, viewWidth, viewHeight);
      }
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
    spawnSaluteCluster(center.x, center.y, 24, 0.95);

    const openDelay = prefersReducedMotion ? 50 : 680;
    const swapDelay = prefersReducedMotion ? 80 : 480;

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
     КНОПКА «ОБНИМАШКИ И ЦВЕТОЧЕК» С НЕПОВТОРЯЮЩИМИСЯ ФРАЗАМИ
     ========================================================= */
  let phraseBag = [];
  let lastPhraseIndex = -1;
  let hugCount = 0;

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

  hugBtn.addEventListener('click', (event) => {
    hugCount += 1;
    const phrase = getNextCompliment();

    complimentBadge.textContent = BADGE_STATUSES[(hugCount - 1) % BADGE_STATUSES.length];
    complimentText.textContent = phrase;
    hugCounterEl.textContent = `${hugCount} 🌸`;

    if (complimentBox.hidden) {
      complimentBox.hidden = false;
    }

    complimentBox.classList.remove('is-popping');
    void complimentBox.offsetWidth;
    complimentBox.classList.add('is-popping');

    const hasPointerCoords = event.clientX > 0 || event.clientY > 0;
    const origin = hasPointerCoords
      ? { x: event.clientX, y: event.clientY }
      : getElementCenter(hugBtn);

    launchHeartSalute(origin.x, origin.y);
  });

  /* =========================================================
     КЛИК / ТАП В ЛЮБОМ МЕСТЕ ЭКРАНА И ЛЁГКИЙ СЛЕД НА ДЕСКТОПЕ
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

  if (hasFinePointer && !prefersReducedMotion) {
    let lastTrailTime = 0;
    document.addEventListener('mousemove', (event) => {
      const now = performance.now();
      if (now - lastTrailTime < 60) return;
      lastTrailTime = now;
      spawnTrailSpark(event.clientX, event.clientY);
    });
  }

  /* =========================================================
     ИНИЦИАЛИЗАЦИЯ И ЭКОНОМИЯ БАТАРЕИ В ФОНОВОЙ ВКЛАДКЕ
     ========================================================= */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (bgRafId !== null) {
        cancelAnimationFrame(bgRafId);
        bgRafId = null;
      }
      if (burstRafId !== null) {
        cancelAnimationFrame(burstRafId);
        burstRafId = null;
      }
    } else {
      if (!prefersReducedMotion && bgRafId === null) {
        renderBgParticles(true);
      }
      if (burstParticles.length > 0) {
        ensureBurstLoop();
      }
    }
  });

  window.addEventListener('resize', () => {
    resizeCanvases();
    if (prefersReducedMotion) {
      renderBgParticles(false);
    }
  });

  resizeCanvases();
  initBgParticles();
  renderBgParticles(!prefersReducedMotion);
})();
