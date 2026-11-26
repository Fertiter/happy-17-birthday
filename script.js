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

  const bouquetCanvas = document.getElementById('bouquet-canvas');
  const bouquetCtx = bouquetCanvas.getContext('2d');
  const asciiWaveLine = document.getElementById('ascii-wave-line');

  const fxCanvas = document.getElementById('fx-canvas');
  const fxCtx = fxCanvas.getContext('2d');

  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;
  let hasOpenedCard = false;
  let fxRafId = null;
  let bouquetRafId = null;

  /* =========================================================
     1. ВЫСОКОДЕТАЛИЗИРОВАННЫЙ 3D ASCII-БУКЕТ (#bouquet-canvas)
     Адаптивная сетка под экран телефона (до 118x80 символов)
     ========================================================= */
  let bCols = 104;
  let bRows = 71;
  const ASCII_RAMP = '.,:;-=+*#%@$';
  const SHADE_LEVELS = 9;

  // 9 ботанических семейств с глубокими тенями и перламутровыми краями
  const COLOR_FAMILIES = [
    { h: 344, s: 90, lMin: 18, lMax: 82 }, // 0: карминно-розовая лилия
    { h: 326, s: 90, lMin: 22, lMax: 85 }, // 1: нежная сакура
    { h: 342, s: 46, lMin: 34, lMax: 94 }, // 2: кремово-жемчужная лилия и края
    { h: 18, s: 92, lMin: 22, lMax: 84 },  // 3: персиково-коралловая
    { h: 45, s: 94, lMin: 22, lMax: 86 },  // 4: золотистое шампанское
    { h: 274, s: 84, lMin: 24, lMax: 85 }, // 5: орхидейно-лавандовая
    { h: 132, s: 68, lMin: 16, lMax: 74 }, // 6: изумрудные стебли и листва
    { h: 48, s: 98, lMin: 40, lMax: 92 },  // 7: золотая пыльца и блик банта
    { h: 332, s: 78, lMin: 14, lMax: 58 }  // 8: тёмный бархатный крап и глубина чаши
  ];

  let glyphAtlas = null;
  let atlasCellW = 8;
  let atlasCellH = 12;
  let bouquetPixelW = 720;
  let bouquetPixelH = 792;
  let zBuf = null;
  let charBuf = null;
  let colorBuf = null;
  let bouquetStars = [];

  function buildBouquetStars() {
    bouquetStars = Array.from({ length: 48 }, (_, idx) => ({
      col: Math.floor(((idx * 37 + 11) % 100) * 0.01 * bCols),
      row: Math.floor(((idx * 53 + 19) % 100) * 0.01 * bRows),
      phase: idx * 0.72,
      fam: idx % 6,
      chIdx: idx % 3 === 0 ? 7 : idx % 3 === 1 ? 6 : 0 // *, +, .
    }));
  }

  function buildBouquetAtlas() {
    const cssWidth = Math.max(250, bouquetCanvas.clientWidth || 460);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    bouquetPixelW = Math.round(cssWidth * dpr);
    bouquetPixelH = Math.round(bouquetPixelW * 1.1);
    bouquetCanvas.width = bouquetPixelW;
    bouquetCanvas.height = bouquetPixelH;

    // Подбираем плотность сетки под физическое разрешение экрана
    if (bouquetPixelW >= 780) {
      bCols = 118;
      bRows = 80;
    } else if (bouquetPixelW >= 580) {
      bCols = 104;
      bRows = 71;
    } else {
      bCols = 80;
      bRows = 54;
    }

    zBuf = new Float32Array(bCols * bRows);
    charBuf = new Int16Array(bCols * bRows);
    colorBuf = new Uint8Array(bCols * bRows);
    buildBouquetStars();

    atlasCellW = Math.max(4, Math.floor(bouquetPixelW / bCols));
    atlasCellH = Math.max(7, Math.floor(bouquetPixelH / bRows));

    const numChars = ASCII_RAMP.length;
    const totalColors = COLOR_FAMILIES.length * SHADE_LEVELS;

    glyphAtlas = document.createElement('canvas');
    glyphAtlas.width = numChars * atlasCellW;
    glyphAtlas.height = totalColors * atlasCellH;

    const actx = glyphAtlas.getContext('2d');
    const fontSize = Math.max(6, Math.round(atlasCellH * 0.94));
    actx.font = `700 ${fontSize}px "JetBrains Mono", ui-monospace, "Courier New", monospace`;
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';

    for (let famIdx = 0; famIdx < COLOR_FAMILIES.length; famIdx += 1) {
      const fam = COLOR_FAMILIES[famIdx];
      for (let shadeIdx = 0; shadeIdx < SHADE_LEVELS; shadeIdx += 1) {
        const t = shadeIdx / (SHADE_LEVELS - 1);
        const light = fam.lMin + (fam.lMax - fam.lMin) * t;
        const sat = fam.s - t * 10;
        const colorIdx = famIdx * SHADE_LEVELS + shadeIdx;
        actx.fillStyle = `hsl(${fam.h}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;

        const cy = colorIdx * atlasCellH + atlasCellH * 0.54;
        for (let chIdx = 0; chIdx < numChars; chIdx += 1) {
          const cx = chIdx * atlasCellW + atlasCellW * 0.5;
          actx.fillText(ASCII_RAMP[chIdx], cx, cy);
        }
      }
    }
  }

  /* =========================================================
     БОТАНИЧЕСКИЙ 3D-ГЕНЕРАТОР: ЛИЛИИ, КРАП, ЖИЛКИ, БУТОНЫ, ЛИСТВА
     ========================================================= */
  const ptsTmp = [];

  function rotateVec3(x, y, z, rx, ry, rz) {
    const cz = Math.cos(rz);
    const sz = Math.sin(rz);
    const x1 = x * cz - y * sz;
    const y1 = x * sz + y * cz;
    const z1 = z;

    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const y2 = y1 * cx - z1 * sx;
    const z2 = y1 * sx + z1 * cx;

    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
  }

  function localPetalPoint(u, v, radius, petalAngle, isInner) {
    const widthFactor = isInner ? 0.24 : 0.275;
    const halfW = radius * widthFactor * Math.sin(Math.pow(u, 0.68) * Math.PI);
    const r = (0.06 + 0.94 * u) * radius;
    const across = v * halfW;

    const cupZ =
      radius * (0.49 * Math.pow(u, 0.72) - 0.37 * Math.pow(u, 2.3)) +
      (isInner ? 0.036 * radius : 0);
    // Центральная жилка + мягкая волнистость краёв лепестка
    const midrib = radius * (0.072 * (1 - Math.abs(v)) - 0.038 * v * v);
    const edgeRuffle =
      radius * 0.028 * Math.sin(u * 14 + petalAngle * 2) * Math.pow(Math.abs(v), 1.6);
    const lz = cupZ + midrib + edgeRuffle;

    const ca = Math.cos(petalAngle);
    const sa = Math.sin(petalAngle);
    return [r * ca - across * sa, r * sa + across * ca, lz];
  }

  function addLily3D(cfg) {
    const { cx, cy, cz, radius, rx, ry, rz, family, edgeFamily, phase } = cfg;
    const uSteps = 22;
    const vSteps = 13;
    const eps = 0.014;

    for (let p = 0; p < 6; p += 1) {
      const petalAngle = (p * Math.PI) / 3;
      const isInner = p % 2 === 0;

      for (let iu = 0; iu < uSteps; iu += 1) {
        const u = 0.05 + (0.95 * iu) / (uSteps - 1);
        for (let iv = 0; iv < vSteps; iv += 1) {
          const v = -1 + (2 * iv) / (vSteps - 1);

          const p0 = localPetalPoint(u, v, radius, petalAngle, isInner);
          const pu = localPetalPoint(Math.min(1, u + eps), v, radius, petalAngle, isInner);
          const pv = localPetalPoint(u, Math.min(1, v + eps), radius, petalAngle, isInner);

          const tux = pu[0] - p0[0];
          const tuy = pu[1] - p0[1];
          const tuz = pu[2] - p0[2];
          const tvx = pv[0] - p0[0];
          const tvy = pv[1] - p0[1];
          const tvz = pv[2] - p0[2];

          let lnx = tuy * tvz - tuz * tvy;
          let lny = tuz * tvx - tux * tvz;
          let lnz = tux * tvy - tuy * tvx;
          const nLen = Math.hypot(lnx, lny, lnz) || 1;
          lnx /= nLen;
          lny /= nLen;
          lnz /= nLen;
          if (lnz < 0) {
            lnx = -lnx;
            lny = -lny;
            lnz = -lnz;
          }

          const wp = rotateVec3(p0[0], p0[1], p0[2], rx, ry, rz);
          const wn = rotateVec3(lnx, lny, lnz, rx, ry, rz);

          // Жилка, глубина горловины, бархатный крап и светлая кайма лепестков
          let shadeBias = -0.22 + 0.34 * u;
          let chosenFam = family;

          if (Math.abs(v) < 0.16) {
            shadeBias += 0.2;
          }
          if (u < 0.22) {
            chosenFam = 8;
            shadeBias -= 0.18;
          } else if (u < 0.68 && Math.abs(v) < 0.62) {
            const spot = Math.sin(u * 52 + v * 37 + p * 7.3) * Math.cos(u * 31 - v * 43);
            if (spot > 0.68) {
              chosenFam = 8;
              shadeBias -= 0.16;
            }
          }

          if (u > 0.84 || Math.abs(v) > 0.8) {
            shadeBias += 0.22;
            if (edgeFamily !== undefined) {
              chosenFam = edgeFamily;
            }
          }

          ptsTmp.push({
            x: cx + wp[0],
            y: cy + wp[1],
            z: cz + wp[2],
            nx: wn[0],
            ny: wn[1],
            nz: wn[2],
            fam: chosenFam,
            bias: shadeBias,
            phase
          });
        }
      }
    }

    // Центральный пестик
    for (let k = 1; k <= 8; k += 1) {
      const t = k / 8;
      const wp = rotateVec3(0.02 * radius * t, -0.04 * radius * t * t, radius * 0.42 * t, rx, ry, rz);
      ptsTmp.push({
        x: cx + wp[0],
        y: cy + wp[1],
        z: cz + wp[2],
        nx: 0,
        ny: -0.2,
        nz: 0.98,
        fam: k >= 7 ? 2 : 6,
        bias: k >= 7 ? 0.38 : 0.12,
        phase
      });
    }

    // 6 изогнутых тычинок с объёмными пыльниками
    for (let s = 0; s < 6; s += 1) {
      const ang = ((s + 0.5) * Math.PI) / 3;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      for (let step = 1; step <= 9; step += 1) {
        const t = step / 9;
        const sr = radius * 0.39 * t;
        const sz = radius * (0.1 + 0.27 * Math.sin(t * Math.PI * 0.72));
        const wp = rotateVec3(sr * ca, sr * sa, sz, rx, ry, rz);
        const isAnther = step >= 8;
        ptsTmp.push({
          x: cx + wp[0],
          y: cy + wp[1],
          z: cz + wp[2],
          nx: ca * 0.25,
          ny: sa * 0.25,
          nz: 0.94,
          fam: isAnther ? 7 : 4,
          bias: isAnther ? 0.44 : 0.14,
          phase
        });
      }
    }
  }

  function addBud3D(cx, cy, cz, len, rx, ry, rz, fam, phase) {
    // Заострённый нераскрывшийся бутон лилии
    const uSteps = 15;
    const aroundSteps = 10;
    for (let iu = 0; iu < uSteps; iu += 1) {
      const u = iu / (uSteps - 1);
      const r = len * 0.16 * Math.sin(Math.pow(u, 0.78) * Math.PI);
      const zLocal = len * u;
      for (let ia = 0; ia < aroundSteps; ia += 1) {
        const ang = (ia / aroundSteps) * Math.PI * 2;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        const wp = rotateVec3(px, py, zLocal, rx, ry, rz);
        const wn = rotateVec3(Math.cos(ang), Math.sin(ang), 0.35, rx, ry, rz);
        ptsTmp.push({
          x: cx + wp[0],
          y: cy + wp[1],
          z: cz + wp[2],
          nx: wn[0],
          ny: wn[1],
          nz: wn[2],
          fam: u < 0.3 ? 6 : fam,
          bias: -0.1 + 0.38 * u,
          phase
        });
      }
    }
  }

  function addBabysBreath3D(cx, cy, cz, phase) {
    // Веточка воздушной жемчужной гипсофилы
    for (let b = 0; b < 5; b += 1) {
      const ang = (b * Math.PI * 2) / 5 + phase;
      const dist = 0.06 + (b % 2) * 0.04;
      const bx = cx + Math.cos(ang) * dist;
      const by = cy + Math.sin(ang) * dist * 0.8;
      const bz = cz + Math.sin(b * 1.7) * 0.04;
      for (let k = 0; k < 5; k += 1) {
        const ka = (k * Math.PI * 2) / 5;
        ptsTmp.push({
          x: bx + Math.cos(ka) * 0.018,
          y: by + Math.sin(ka) * 0.018,
          z: bz + 0.01,
          nx: Math.cos(ka) * 0.3,
          ny: Math.sin(ka) * 0.3,
          nz: 0.9,
          fam: k === 0 ? 7 : 2,
          bias: 0.38,
          phase
        });
      }
    }
  }

  function addStem3D(x0, y0, z0, x1, y1, z1, x2, y2, z2) {
    const steps = 40;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const it = 1 - t;
      const bx = it * it * x0 + 2 * it * t * x1 + t * t * x2;
      const by = it * it * y0 + 2 * it * t * y1 + t * t * y2;
      const bz = it * it * z0 + 2 * it * t * z1 + t * t * z2;

      for (let off = -1; off <= 1; off += 0.5) {
        ptsTmp.push({
          x: bx + off * 0.017,
          y: by,
          z: bz + (off === 0 ? 0.018 : 0),
          nx: off * 0.55,
          ny: -0.1,
          nz: 0.82,
          fam: 6,
          bias: Math.abs(off) < 0.3 ? 0.18 : -0.12,
          phase: 0.2
        });
      }
    }
  }

  function addLeaf3D(ox, oy, oz, dirX, dirY, len, width, curveZ) {
    const uSteps = 22;
    const vSteps = 7;
    for (let iu = 0; iu < uSteps; iu += 1) {
      const u = iu / (uSteps - 1);
      const w = width * Math.sin(Math.pow(u, 0.78) * Math.PI);
      const lx = ox + dirX * len * u;
      const ly = oy + dirY * len * u + 0.14 * u * u;
      const lz = oz + curveZ * Math.sin(u * Math.PI * 0.85);

      for (let iv = 0; iv < vSteps; iv += 1) {
        const v = -1 + (2 * iv) / (vSteps - 1);
        ptsTmp.push({
          x: lx - dirY * v * w,
          y: ly + dirX * v * w * 0.5,
          z: lz + (1 - Math.abs(v)) * 0.035,
          nx: -dirY * 0.28,
          ny: -0.36,
          nz: 0.88,
          fam: 6,
          bias: -0.05 + 0.18 * (1 - Math.abs(v)) + 0.14 * u,
          phase: 0.5
        });
      }
    }
  }

  function addRibbonTie3D() {
    const yBase = 0.88;
    for (let a = -1.35; a <= 1.35; a += 0.09) {
      const rx = Math.sin(a) * 0.16;
      const rz = Math.cos(a) * 0.16 + 0.06;
      for (let dy = -0.04; dy <= 0.04; dy += 0.02) {
        ptsTmp.push({
          x: rx,
          y: yBase + dy,
          z: rz,
          nx: Math.sin(a),
          ny: 0,
          nz: Math.cos(a),
          fam: 0,
          bias: 0.28,
          phase: 1.1
        });
      }
    }

    [ -1, 1 ].forEach((side) => {
      for (let t = 0; t <= 1; t += 0.07) {
        const ang = t * Math.PI * 2;
        const bx = side * (0.06 + Math.abs(Math.sin(ang * 0.5)) * 0.15);
        const by = yBase + Math.sin(ang) * 0.06;
        const bz = 0.21 + Math.cos(ang) * 0.03;
        ptsTmp.push({
          x: bx,
          y: by,
          z: bz,
          nx: side * 0.2,
          ny: -0.2,
          nz: 0.95,
          fam: 7,
          bias: 0.28,
          phase: 1.4
        });
      }
    });
  }

  let ptCount = 0;
  let ptX, ptY, ptZ, ptNX, ptNY, ptNZ, ptFam, ptBias, ptPhase;

  function initBouquetGeometry() {
    ptsTmp.length = 0;

    // 9 пышных лилий разного наклона и глубины
    const flowers = [
      { cx: 0.02, cy: -0.76, cz: 0.10, radius: 0.39, rx: -0.34, ry: 0.04, rz: 0.1, family: 0, edgeFamily: 1, phase: 0.0 },
      { cx: -0.54, cy: -0.58, cz: -0.08, radius: 0.36, rx: -0.24, ry: -0.44, rz: -0.3, family: 2, edgeFamily: 1, phase: 0.6 },
      { cx: 0.56, cy: -0.58, cz: -0.06, radius: 0.36, rx: -0.24, ry: 0.42, rz: 0.25, family: 4, edgeFamily: 2, phase: 1.2 },
      { cx: -0.73, cy: -0.09, cz: 0.16, radius: 0.38, rx: 0.04, ry: -0.48, rz: -0.4, family: 1, edgeFamily: 2, phase: 1.8 },
      { cx: -0.21, cy: -0.25, cz: 0.33, radius: 0.37, rx: -0.10, ry: -0.18, rz: -0.12, family: 3, edgeFamily: 2, phase: 2.3 },
      { cx: 0.23, cy: -0.13, cz: 0.43, radius: 0.42, rx: -0.05, ry: 0.14, rz: 0.18, family: 2, edgeFamily: 0, phase: 2.8 },
      { cx: 0.74, cy: -0.05, cz: 0.14, radius: 0.37, rx: 0.05, ry: 0.48, rz: 0.35, family: 5, edgeFamily: 2, phase: 3.4 },
      { cx: -0.43, cy: 0.32, cz: 0.28, radius: 0.36, rx: 0.22, ry: -0.26, rz: -0.2, family: 4, edgeFamily: 3, phase: 4.0 },
      { cx: 0.44, cy: 0.30, cz: 0.26, radius: 0.36, rx: 0.20, ry: 0.28, rz: 0.22, family: 0, edgeFamily: 2, phase: 4.6 }
    ];

    flowers.forEach((fl) => {
      addLily3D(fl);
      addStem3D(
        fl.cx * 0.92,
        fl.cy + 0.06,
        fl.cz - 0.12,
        fl.cx * 0.34,
        0.58,
        0.04,
        -fl.cx * 0.18,
        1.14,
        0.06
      );
    });

    // 3 заострённых нераскрывшихся бутона сверху и по бокам
    addBud3D(-0.28, -0.82, -0.04, 0.28, -1.25, -0.35, 0.2, 1, 0.9);
    addBud3D(0.32, -0.80, -0.04, 0.28, -1.25, 0.38, -0.2, 3, 2.1);
    addBud3D(0.84, -0.34, 0.02, 0.25, -0.75, 0.85, 0.1, 5, 3.3);

    // Воздушные веточки жемчужной гипсофилы между цветами
    addBabysBreath3D(-0.38, -0.44, 0.22, 0.4);
    addBabysBreath3D(0.42, -0.42, 0.22, 1.5);
    addBabysBreath3D(-0.62, 0.18, 0.24, 2.6);
    addBabysBreath3D(0.62, 0.16, 0.22, 3.7);
    addBabysBreath3D(0.0, 0.18, 0.36, 4.4);
    addBabysBreath3D(0.02, -0.46, 0.28, 5.1);

    // Детальная изумрудная листва
    addLeaf3D(-0.18, 0.54, 0.08, -0.80, -0.28, 0.76, 0.12, 0.16);
    addLeaf3D(0.18, 0.54, 0.08, 0.80, -0.26, 0.76, 0.12, 0.16);
    addLeaf3D(-0.24, 0.66, 0.12, -0.70, 0.06, 0.64, 0.11, 0.18);
    addLeaf3D(0.24, 0.66, 0.12, 0.70, 0.06, 0.64, 0.11, 0.18);
    addLeaf3D(-0.08, 0.70, 0.20, -0.46, 0.26, 0.48, 0.09, 0.22);
    addLeaf3D(0.08, 0.70, 0.20, 0.46, 0.26, 0.48, 0.09, 0.22);
    addLeaf3D(-0.36, 0.16, -0.10, -0.68, -0.52, 0.56, 0.09, 0.05);
    addLeaf3D(0.36, 0.16, -0.10, 0.68, -0.52, 0.56, 0.09, 0.05);

    addRibbonTie3D();

    ptCount = ptsTmp.length;
    ptX = new Float32Array(ptCount);
    ptY = new Float32Array(ptCount);
    ptZ = new Float32Array(ptCount);
    ptNX = new Float32Array(ptCount);
    ptNY = new Float32Array(ptCount);
    ptNZ = new Float32Array(ptCount);
    ptFam = new Uint8Array(ptCount);
    ptBias = new Float32Array(ptCount);
    ptPhase = new Float32Array(ptCount);

    for (let i = 0; i < ptCount; i += 1) {
      const p = ptsTmp[i];
      ptX[i] = p.x;
      ptY[i] = p.y;
      ptZ[i] = p.z;
      ptNX[i] = p.nx;
      ptNY[i] = p.ny;
      ptNZ[i] = p.nz;
      ptFam[i] = p.fam;
      ptBias[i] = p.bias;
      ptPhase[i] = p.phase;
    }
    ptsTmp.length = 0;
  }

  let targetUserYaw = 0;
  let targetUserPitch = 0;
  let userYaw = 0;
  let userPitch = 0;
  let shimmerWaveStart = -10;
  let bloomStartTime = 0;

  const HEARTBEAT_BAR_FRAMES = [
    '[ · . * o O ♡ O o * . · ]',
    '[ . * o O ♡ ✿ ♡ O o * . ]',
    '[ * o O ♡ ✿ ♥ ✿ ♡ O o * ]',
    '[ . * o O ♡ ✿ ♡ O o * . ]'
  ];
  let barTick = 0;
  let lastBarUpdate = 0;

  function renderBouquetFrame(nowMs) {
    if (!hasOpenedCard || document.hidden || !glyphAtlas || !zBuf) {
      bouquetRafId = null;
      return;
    }

    const timeSec = nowMs * 0.001;
    if (bloomStartTime === 0) {
      bloomStartTime = timeSec;
    }

    const bloomElapsed = Math.min(1, (timeSec - bloomStartTime) / 1.05);
    const bloomEase = prefersReducedMotion ? 1 : 1 - Math.pow(1 - bloomElapsed, 3);
    const bloomScale = 0.28 + 0.72 * bloomEase;

    userYaw += (targetUserYaw - userYaw) * 0.09;
    userPitch += (targetUserPitch - userPitch) * 0.09;

    const autoYaw = prefersReducedMotion ? 0 : Math.sin(timeSec * 0.7) * 0.22;
    const autoPitch = prefersReducedMotion ? 0 : Math.cos(timeSec * 0.5) * 0.065;

    const yaw = autoYaw + userYaw;
    const pitch = autoPitch + userPitch;

    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cx = Math.cos(pitch);
    const sx = Math.sin(pitch);

    let lx = prefersReducedMotion ? 0.35 : Math.cos(timeSec * 1.15) * 0.58;
    let ly = prefersReducedMotion ? -0.45 : -0.45 + Math.sin(timeSec * 0.85) * 0.2;
    let lz = 0.86;
    const lLen = Math.hypot(lx, ly, lz);
    lx /= lLen;
    ly /= lLen;
    lz /= lLen;

    const shimmerAge = timeSec - shimmerWaveStart;
    const shimmerActive = shimmerAge >= 0 && shimmerAge < 1.3;
    const shimmerY = 1.2 - shimmerAge * 2.0;

    zBuf.fill(-999);
    charBuf.fill(-1);

    const scaleX = bCols * 0.41 * bloomScale;
    const scaleY = bRows * 0.39 * bloomScale;
    const centerCol = bCols * 0.5;
    const centerRow = bRows * 0.51;
    const maxCharIdx = ASCII_RAMP.length - 1;

    for (let i = 0; i < ptCount; i += 1) {
      const sway = prefersReducedMotion
        ? 0
        : Math.sin(timeSec * 1.35 + ptPhase[i]) * 0.015 * (1 - Math.max(0, ptY[i]));

      const px0 = ptX[i] + sway;
      const py0 = ptY[i];
      const pz0 = ptZ[i];

      const rx1 = px0 * cy + pz0 * sy;
      const rz1 = -px0 * sy + pz0 * cy;
      const ry2 = py0 * cx - rz1 * sx;
      const rz2 = py0 * sx + rz1 * cx;

      const persp = 2.65 / (2.65 - rz2 * 0.55);
      const gx = Math.round(centerCol + rx1 * scaleX * persp);
      const gy = Math.round(centerRow + ry2 * scaleY * persp);

      if (gx < 0 || gx >= bCols || gy < 0 || gy >= bRows) continue;

      const cellIdx = gy * bCols + gx;
      if (rz2 <= zBuf[cellIdx]) continue;
      zBuf[cellIdx] = rz2;

      const nrx = ptNX[i] * cy + ptNZ[i] * sy;
      const nrz1 = -ptNX[i] * sy + ptNZ[i] * cy;
      const nry = ptNY[i] * cx - nrz1 * sx;
      const nrz = ptNY[i] * sx + nrz1 * cx;

      let dot = nrx * lx + nry * ly + nrz * lz;
      if (dot < 0) dot = -dot * 0.32;

      const iridWave = prefersReducedMotion
        ? 0
        : Math.sin(py0 * 3.1 - timeSec * 2.2 + ptPhase[i] * 0.7) * 0.12;

      let pulseBoost = 0;
      if (shimmerActive) {
        const dist = Math.abs(py0 - shimmerY);
        if (dist < 0.35) {
          pulseBoost = (1 - dist / 0.35) * 0.45;
        }
      }

      const depthCue = (rz2 + 0.75) * 0.16;
      let lum = 0.18 + dot * 0.62 + ptBias[i] * 0.54 + depthCue + iridWave + pulseBoost;
      if (lum < 0.05) lum = 0.05;
      if (lum > 1) lum = 1;

      const chIdx = Math.min(maxCharIdx, Math.max(0, Math.round(lum * maxCharIdx)));
      const shadeIdx = Math.min(
        SHADE_LEVELS - 1,
        Math.max(0, Math.round(lum * (SHADE_LEVELS - 1)))
      );

      charBuf[cellIdx] = chIdx;
      colorBuf[cellIdx] = ptFam[i] * SHADE_LEVELS + shadeIdx;
    }

    bouquetCtx.clearRect(0, 0, bouquetPixelW, bouquetPixelH);

    // Звёздное небо в пустых клетках
    for (let s = 0; s < bouquetStars.length; s += 1) {
      const st = bouquetStars[s];
      const cIdx = st.row * bCols + st.col;
      if (charBuf[cIdx] >= 0) continue;

      const tw = (Math.sin(timeSec * 2.4 + st.phase) + 1) * 0.5;
      if (tw < 0.18) continue;

      const shade = Math.min(SHADE_LEVELS - 1, Math.floor(tw * SHADE_LEVELS));
      const colorIdx = st.fam * SHADE_LEVELS + shade;
      bouquetCtx.drawImage(
        glyphAtlas,
        st.chIdx * atlasCellW,
        colorIdx * atlasCellH,
        atlasCellW,
        atlasCellH,
        st.col * atlasCellW,
        st.row * atlasCellH,
        atlasCellW,
        atlasCellH
      );
    }

    // Отрисовка плотного цветного 3D ASCII-букета
    for (let row = 0; row < bRows; row += 1) {
      const dy = row * atlasCellH;
      const rowOffset = row * bCols;
      for (let col = 0; col < bCols; col += 1) {
        const idx = rowOffset + col;
        const ch = charBuf[idx];
        if (ch < 0) continue;

        bouquetCtx.drawImage(
          glyphAtlas,
          ch * atlasCellW,
          colorBuf[idx] * atlasCellH,
          atlasCellW,
          atlasCellH,
          col * atlasCellW,
          dy,
          atlasCellW,
          atlasCellH
        );
      }
    }

    if (asciiWaveLine && nowMs - lastBarUpdate > 280 && !prefersReducedMotion) {
      lastBarUpdate = nowMs;
      barTick += 1;
      asciiWaveLine.textContent = HEARTBEAT_BAR_FRAMES[barTick % HEARTBEAT_BAR_FRAMES.length];
    }

    if (!prefersReducedMotion || bloomElapsed < 1) {
      bouquetRafId = requestAnimationFrame(renderBouquetFrame);
    } else {
      bouquetRafId = null;
    }
  }

  function startBouquetLoop() {
    if (!hasOpenedCard) return;
    buildBouquetAtlas();
    if (bouquetRafId === null) {
      bouquetRafId = requestAnimationFrame(renderBouquetFrame);
    }
  }

  bouquetCanvas.addEventListener('pointermove', (event) => {
    const rect = bouquetCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    targetUserYaw = Math.max(-0.7, Math.min(0.7, nx * 0.65));
    targetUserPitch = Math.max(-0.32, Math.min(0.32, ny * 0.28));
  });

  bouquetCanvas.addEventListener('pointerleave', () => {
    targetUserYaw = 0;
    targetUserPitch = 0;
  });

  bouquetCanvas.addEventListener('click', (event) => {
    shimmerWaveStart = performance.now() * 0.001;
    if (event.clientX > 0 || event.clientY > 0) {
      spawnClickBloom(event.clientX, event.clientY);
    }
  });

  /* =========================================================
     2. ПЕРЕДНИЙ СПРАЙТОВЫЙ CANVAS (ЛЕПЕСТКИ + КЛИКИ + САЛЮТ)
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
      spriteBank.set(
        key,
        PALETTE.map((color) => buildSprite(key, color))
      );
    });
  }

  function getSprite(key, colorIdx) {
    const variants = spriteBank.get(key) || spriteBank.get('♡');
    return variants[((colorIdx % variants.length) + variants.length) % variants.length];
  }

  function resizeFxCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;

    fxCanvas.width = Math.floor(viewWidth * dpr);
    fxCanvas.height = Math.floor(viewHeight * dpr);
    fxCanvas.style.width = `${viewWidth}px`;
    fxCanvas.style.height = `${viewHeight}px`;
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

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
      alpha: 0.3 + Math.random() * 0.24
    };
  }

  function initAmbientParticles() {
    ambientParticles.length = 0;
    const count = prefersReducedMotion
      ? 10
      : Math.min(24, Math.max(12, Math.floor(viewWidth / 52)));
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

  function spawnSaluteCluster(cx, cy, count = 22, power = 1) {
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

  function renderFxFrame(step = true) {
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
      fxRafId = requestAnimationFrame(() => renderFxFrame(true));
    } else {
      fxRafId = null;
    }
  }

  /* =========================================================
     3. ОТКРЫТИЕ КОНВЕРТА И ПЕРЕХОД К ОТКРЫТКЕ
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
            bloomStartTime = 0;
            startBouquetLoop();
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
     4. КНОПКА «ОБНИМАШКИ И ЦВЕТОЧЕК» С ПЕЧАТЬЮ ФРАЗ
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
     5. КЛИК / ТАП В ЛЮБОМ МЕСТЕ ЭКРАНА
     ========================================================= */
  document.addEventListener('click', (event) => {
    if (event.target.closest('#hug-btn, #open-card-btn, #envelope, #bouquet-canvas')) {
      return;
    }
    if (event.clientX === 0 && event.clientY === 0) {
      return;
    }
    spawnClickBloom(event.clientX, event.clientY);
  });

  /* =========================================================
     6. ИНИЦИАЛИЗАЦИЯ И РЕСАЙЗ
     ========================================================= */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (fxRafId !== null) {
        cancelAnimationFrame(fxRafId);
        fxRafId = null;
      }
      if (bouquetRafId !== null) {
        cancelAnimationFrame(bouquetRafId);
        bouquetRafId = null;
      }
    } else {
      if (!prefersReducedMotion && fxRafId === null) {
        renderFxFrame(true);
      }
      if (hasOpenedCard && bouquetRafId === null) {
        bouquetRafId = requestAnimationFrame(renderBouquetFrame);
      }
    }
  });

  let resizeDebounce = null;
  window.addEventListener('resize', () => {
    resizeFxCanvas();
    if (prefersReducedMotion) {
      renderFxFrame(false);
    }
    if (hasOpenedCard) {
      window.clearTimeout(resizeDebounce);
      resizeDebounce = window.setTimeout(() => {
        buildBouquetAtlas();
        if (prefersReducedMotion) {
          bouquetRafId = requestAnimationFrame(renderBouquetFrame);
        }
      }, 120);
    }
  });

  initBouquetGeometry();
  initSpriteBank();
  resizeFxCanvas();
  initAmbientParticles();
  renderFxFrame(!prefersReducedMotion);
})();
