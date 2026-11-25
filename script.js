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
    'Этот цветочек — только тебе. И всё моё сердце тоже только твоё ˚₊· ͟͟͞͞➳❥'
  ];

  const PASTEL_COLORS = [
    '#eb6d99',
    '#f493b5',
    '#b287e6',
    '#f29c7c',
    '#e8b254',
    '#d95889'
  ];

  const CLICK_SYMBOLS = ['♡', '✿', '✨', '❀', '❁'];
  const SALUTE_SYMBOLS = ['♡', '♥', '✿', '❀', '❁', '🌸', '✨', '୨୧'];

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
  const complimentText = document.getElementById('compliment-text');
  const hugCounterEl = document.getElementById('hug-counter');

  const petalsCanvas = document.getElementById('petals-canvas');
  const petalsCtx = petalsCanvas.getContext('2d');
  const burstCanvas = document.getElementById('burst-canvas');
  const burstCtx = burstCanvas.getContext('2d');

  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;
  let hasOpenedCard = false;

  /* =========================================================
     НАСТРОЙКА РАЗМЕРОВ CANVAS (RETINA / HIGH-DPI)
     ========================================================= */
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
     СЛОЙ 1: ФОНОВОЕ ПАДЕНИЕ ЛЕПЕСТКОВ И МИНИ-СЕРДЕЧЕК
     ========================================================= */
  const bgParticles = [];
  const BG_SYMBOLS = ['♡', '✿', '❀'];

  function createBgParticle(startFromTop = false) {
    const isSymbol = Math.random() < 0.38;
    const size = isSymbol ? 11 + Math.random() * 9 : 7 + Math.random() * 8;
    return {
      isSymbol,
      symbol: BG_SYMBOLS[Math.floor(Math.random() * BG_SYMBOLS.length)],
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
      x: Math.random() * viewWidth,
      y: startFromTop ? -24 - Math.random() * 40 : Math.random() * viewHeight,
      size,
      speedY: 0.45 + Math.random() * 0.75,
      swayAmp: 0.4 + Math.random() * 0.85,
      swayFreq: 0.008 + Math.random() * 0.012,
      phase: Math.random() * Math.PI * 2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.02,
      alpha: 0.35 + Math.random() * 0.42
    };
  }

  function initBgParticles() {
    bgParticles.length = 0;
    const targetCount = Math.min(34, Math.max(16, Math.floor(viewWidth / 38)));
    for (let i = 0; i < targetCount; i += 1) {
      bgParticles.push(createBgParticle(false));
    }
  }

  function drawPetalShape(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.bezierCurveTo(size * 0.68, -size * 0.42, size * 0.64, size * 0.46, 0, size * 0.6);
    ctx.bezierCurveTo(-size * 0.64, size * 0.46, -size * 0.68, -size * 0.42, 0, -size * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  function renderBgParticles(step = true) {
    petalsCtx.clearRect(0, 0, viewWidth, viewHeight);

    for (let i = 0; i < bgParticles.length; i += 1) {
      const p = bgParticles[i];

      if (step) {
        p.phase += p.swayFreq;
        p.y += p.speedY;
        p.x += Math.sin(p.phase) * p.swayAmp;
        p.angle += p.spin;

        if (p.y > viewHeight + 30) {
          bgParticles[i] = createBgParticle(true);
          continue;
        }
        if (p.x < -30) p.x = viewWidth + 24;
        if (p.x > viewWidth + 30) p.x = -24;
      }

      petalsCtx.save();
      petalsCtx.translate(p.x, p.y);
      petalsCtx.rotate(p.angle);
      petalsCtx.globalAlpha = p.alpha;
      petalsCtx.fillStyle = p.color;

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

    if (!prefersReducedMotion) {
      requestAnimationFrame(() => renderBgParticles(true));
    }
  }

  /* =========================================================
     СЛОЙ 2: КЛИКИ В ЛЮБОМ МЕСТЕ И САЛЮТ ИЗ СЕРДЕЧЕК
     ========================================================= */
  const burstParticles = [];
  let burstLoopActive = false;

  function ensureBurstLoop() {
    if (!burstLoopActive) {
      burstLoopActive = true;
      requestAnimationFrame(renderBurstParticles);
    }
  }

  function spawnClickBurst(x, y) {
    const count = prefersReducedMotion ? 4 : 9;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = 1.6 + Math.random() * 2.6;
      burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.4,
        gravity: 0.06,
        drag: 0.98,
        size: 14 + Math.random() * 10,
        symbol: CLICK_SYMBOLS[Math.floor(Math.random() * CLICK_SYMBOLS.length)],
        color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
        alpha: 1,
        decay: 0.017 + Math.random() * 0.01,
        rotation: (Math.random() - 0.5) * 0.4,
        spin: (Math.random() - 0.5) * 0.06
      });
    }
    ensureBurstLoop();
  }

  function spawnSaluteCluster(cx, cy, count = 26, power = 1) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.1 + Math.random() * 4.4) * power;
      burstParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.3 * power,
        gravity: 0.085,
        drag: 0.975,
        size: 16 + Math.random() * 13,
        symbol: SALUTE_SYMBOLS[Math.floor(Math.random() * SALUTE_SYMBOLS.length)],
        color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
        alpha: 1,
        decay: 0.011 + Math.random() * 0.008,
        rotation: (Math.random() - 0.5) * 0.6,
        spin: (Math.random() - 0.5) * 0.09
      });
    }
    ensureBurstLoop();
  }

  function launchHeartSalute(originX, originY) {
    if (prefersReducedMotion) {
      spawnSaluteCluster(originX, originY, 10, 0.75);
      return;
    }

    // Первый залп прямо из кнопки
    spawnSaluteCluster(originX, originY, 26, 1.05);

    // Два дополнительных залпа салюта в верхней части экрана
    window.setTimeout(() => {
      spawnSaluteCluster(viewWidth * 0.28, viewHeight * 0.34, 22, 0.95);
    }, 150);

    window.setTimeout(() => {
      spawnSaluteCluster(viewWidth * 0.72, viewHeight * 0.3, 22, 0.95);
    }, 300);
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
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        burstParticles.splice(i, 1);
        continue;
      }

      burstCtx.save();
      burstCtx.translate(p.x, p.y);
      burstCtx.rotate(p.rotation);
      burstCtx.globalAlpha = Math.max(0, p.alpha);
      burstCtx.fillStyle = p.color;
      burstCtx.font = `${p.size}px "Nunito", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      burstCtx.textAlign = 'center';
      burstCtx.textBaseline = 'middle';
      burstCtx.fillText(p.symbol, 0, 0);
      burstCtx.restore();
    }

    if (burstParticles.length > 0) {
      requestAnimationFrame(renderBurstParticles);
    } else {
      burstLoopActive = false;
      burstCtx.clearRect(0, 0, viewWidth, viewHeight);
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
    spawnSaluteCluster(center.x, center.y, 20, 0.9);

    const openDelay = prefersReducedMotion ? 50 : 680;
    const swapDelay = prefersReducedMotion ? 80 : 480;

    window.setTimeout(() => {
      envelopeScreen.classList.add('is-hidden');

      window.setTimeout(() => {
        envelopeScreen.hidden = true;
        cardScreen.hidden = false;

        // Запускаем плавное появление после отображения элемента в DOM
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            cardScreen.classList.remove('is-hidden');
            cardScreen.classList.add('is-visible');
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            spawnSaluteCluster(viewWidth * 0.5, viewHeight * 0.24, 18, 0.85);
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
    // Защита от повтора одной и той же фразы на границе нового круга
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

    complimentText.textContent = phrase;
    hugCounterEl.textContent = `${hugCount} 🌸`;

    if (complimentBox.hidden) {
      complimentBox.hidden = false;
    }

    // Перезапускаем анимацию появления нового послания
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
     КЛИК ИЛИ ТАП В ЛЮБОМ МЕСТЕ ЭКРАНА
     ========================================================= */
  document.addEventListener('click', (event) => {
    if (event.target.closest('#hug-btn, #open-card-btn, #envelope')) {
      return;
    }
    if (event.clientX === 0 && event.clientY === 0) {
      return;
    }
    spawnClickBurst(event.clientX, event.clientY);
  });

  /* =========================================================
     ИНИЦИАЛИЗАЦИЯ
     ========================================================= */
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
