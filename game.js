import kaplay from "https://unpkg.com/kaplay@3001.0.19/dist/kaplay.mjs";

kaplay({
  width: 800,
  height: 600,
  letterbox: true,
  stretch: true,
  pixelDensity: Math.min(2, window.devicePixelRatio || 1),
  background: [191, 227, 240],
  font: "monospace",
  debug: false,
  global: true,
});

// ---------- layout ----------
const W = 800;
const H = 600;
const SKY_H = 360;
const PIER_Y = 430;
const PIER_X_MIN = 70;
const PIER_X_MAX = 660;
const SHOP_X = 130;
const FISH_X = 650;
const ZONE_RANGE = 65;
const PLAYER_SPEED = 180;
const BOBBER_X = FISH_X + 50;
const BOBBER_Y = 385;

// ---------- pacing ----------
const DAY_NIGHT_CYCLE = 90; // seconds for one full day/night loop
const BITE_WAIT = [0.5, 1.3]; // seconds before a bite after casting
const CATCH_WINDOW = [0.9, 0.8, 0.7, 0.6, 0.5]; // reaction window, indexed by rod tier
const LEGEND_WINDOW = 0.45;
const COOLDOWN = 0.4;

// ---------- palette ----------
const C = {
  daySkyTop: rgb(150, 205, 235),
  daySky: rgb(191, 227, 240),
  daySkyLow: rgb(232, 244, 246),
  nightSkyTop: rgb(24, 28, 58),
  nightSky: rgb(58, 66, 102),
  nightSkyLow: rgb(92, 88, 132),
  duskGlow: rgb(255, 184, 160),
  daySea: rgb(163, 214, 214),
  daySeaDeep: rgb(110, 176, 196),
  nightSea: rgb(42, 52, 84),
  nightSeaDeep: rgb(22, 28, 54),
  seaFoam: rgb(240, 252, 252),
  sun: rgb(255, 224, 168),
  sunCore: rgb(255, 246, 214),
  moon: rgb(214, 222, 242),
  moonShade: rgb(184, 194, 222),
  star: rgb(255, 250, 230),
  cloud: rgb(255, 255, 255),
  cloudShade: rgb(222, 232, 244),
  cloudNight: rgb(86, 94, 134),
  hillFar: rgb(176, 206, 222),
  hillNear: rgb(146, 190, 196),
  hillNightFar: rgb(52, 58, 94),
  hillNightNear: rgb(40, 48, 80),
  fog: rgb(245, 245, 248),
  bird: rgb(90, 96, 120),

  pierWood: rgb(214, 182, 140),
  pierWoodLight: rgb(232, 204, 164),
  pierWoodDark: rgb(186, 150, 110),
  pierOutline: rgb(176, 140, 102),
  pierPost: rgb(160, 122, 90),
  pierPostDark: rgb(128, 96, 72),
  nail: rgb(140, 110, 90),
  rope: rgb(222, 196, 150),

  stallBody: rgb(247, 205, 200),
  stallBodyDark: rgb(232, 184, 180),
  stallRoof: rgb(224, 150, 150),
  stallStripe: rgb(255, 244, 236),
  stallOutline: rgb(196, 120, 120),
  signBoard: rgb(255, 238, 214),

  playerBody: rgb(255, 179, 166),
  playerBodyDark: rgb(236, 150, 140),
  playerSkin: rgb(255, 224, 204),
  playerSkinShade: rgb(244, 200, 180),
  playerOutline: rgb(150, 100, 96),
  playerHair: rgb(130, 90, 80),
  playerHat: rgb(255, 222, 140),
  playerHatDark: rgb(236, 190, 110),
  playerHatBand: rgb(150, 200, 196),
  playerScarf: rgb(150, 212, 196),
  playerScarfDark: rgb(116, 184, 170),
  playerPants: rgb(126, 150, 196),
  playerBoot: rgb(110, 96, 120),
  playerEye: rgb(60, 48, 64),
  blush: rgb(255, 150, 160),
  rod: rgb(150, 111, 89),
  rodGrip: rgb(96, 76, 70),
  reel: rgb(200, 206, 220),
  line: rgb(255, 255, 255),

  bobber: rgb(255, 140, 140),
  legendBobber: rgb(255, 205, 90),
  bobberOutline: rgb(255, 255, 255),

  lampGlow: rgb(255, 220, 150),
  lampMetal: rgb(100, 96, 116),

  fishBlue: rgb(140, 178, 220),
  fishShadow: rgb(60, 90, 110),

  title: rgb(70, 60, 80),
  subtitle: rgb(100, 90, 110),
  hudText: rgb(60, 55, 70),
  hudHint: rgb(90, 85, 100),
  goldText: rgb(199, 145, 45),
  gold: rgb(255, 208, 96),
  goldLight: rgb(255, 238, 170),
  goodText: rgb(85, 145, 95),
  badText: rgb(180, 100, 100),

  panelBg: rgb(255, 246, 238),
  panelOutline: rgb(220, 195, 170),
  panelText: rgb(80, 70, 90),
  panelTitle: rgb(60, 50, 70),
  panelHint: rgb(120, 110, 130),
  panelHeader: rgb(248, 196, 186),
  shadow: rgb(40, 36, 60),

  winSkyTop: rgb(255, 214, 170),
  winSkyHigh: rgb(250, 170, 170),
  winSea: rgb(255, 190, 180),
  winSeaDeep: rgb(226, 150, 170),
};

// ---------- economy ----------
const ROD_TIERS = [
  { name: "Noob Rod", cost: 0, tiers: [0], tint: rgb(150, 111, 89) },
  { name: "Apprentice Rod", cost: 30, tiers: [0, 1], tint: rgb(120, 170, 150) },
  { name: "Angler Rod", cost: 90, tiers: [0, 1, 2], tint: rgb(110, 140, 200) },
  { name: "Master Rod", cost: 220, tiers: [0, 1, 2, 3], tint: rgb(180, 120, 200) },
  { name: "Legend Rod", cost: 500, tiers: [0, 1, 2, 3], legendChance: 0.35, tint: rgb(230, 170, 60) },
];
const LEGEND_ROD_INDEX = ROD_TIERS.length - 1;

const FISH_TIERS = [
  { tier: 0, name: "Noob Fish", value: 5, emoji: "🐟", col: rgb(170, 196, 214), fin: rgb(140, 166, 190) },
  { tier: 1, name: "Common Fish", value: 14, emoji: "🐠", col: rgb(255, 186, 130), fin: rgb(240, 150, 100) },
  { tier: 2, name: "Rare Fish", value: 35, emoji: "🐡", col: rgb(150, 210, 240), fin: rgb(110, 170, 220) },
  { tier: 3, name: "Epic Fish", value: 80, emoji: "🦈", col: rgb(200, 160, 240), fin: rgb(160, 120, 210) },
];
const FISH_WEIGHTS = [50, 30, 15, 5];

function pickFish(allowedTiers) {
  const weights = allowedTiers.map((t) => FISH_WEIGHTS[t]);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(0, total);
  for (let i = 0; i < allowedTiers.length; i++) {
    if (r < weights[i]) return FISH_TIERS[allowedTiers[i]];
    r -= weights[i];
  }
  return FISH_TIERS[allowedTiers[allowedTiers.length - 1]];
}

// ---------- shared state (persists across scenes) ----------
const state = {
  playerName: "Noob",
  money: 0,
  rodIndex: 0,
  caughtCount: 0,
  gameStartTime: 0,
};

// ---------- drawing helpers ----------
// Adds an object whose only job is to run `fn` every frame on the given layer.
function drawer(fn, layerName = "world", zIndex = 0) {
  return add([pos(0, 0), layer(layerName), z(zIndex), { draw: fn }]);
}

function drawArc(p, r, start, end, width, col, op = 1, ry = r) {
  const pts = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const a = ((start + ((end - start) * i) / steps) * Math.PI) / 180;
    pts.push(vec2(p.x + Math.cos(a) * r, p.y + Math.sin(a) * ry));
  }
  drawLines({ pts, width, color: col, opacity: op });
}

function lerpN(a, b, t) {
  return a + (b - a) * t;
}

function glow(p, r, col, strength = 0.25, rings = 5) {
  for (let i = rings; i >= 1; i--) {
    drawCircle({ pos: p, radius: r * (1 + i * 0.35), color: col, opacity: (strength / rings) * (rings - i + 1) * 0.5 });
  }
}

function drawCloud(x, y, s, col, shade, op) {
  const puffs = [
    [-34, 4, 16],
    [-14, -8, 22],
    [10, -12, 24],
    [32, -2, 18],
    [48, 6, 12],
  ];
  drawEllipse({ pos: vec2(x + 6 * s, y + 12 * s), radiusX: 56 * s, radiusY: 10 * s, color: shade, opacity: op });
  for (const [px, py, r] of puffs) {
    drawCircle({ pos: vec2(x + px * s, y + py * s + 3 * s), radius: r * s, color: shade, opacity: op });
  }
  for (const [px, py, r] of puffs) {
    drawCircle({ pos: vec2(x + px * s, y + py * s), radius: r * s * 0.94, color: col, opacity: op });
  }
}

// Draws a fish centred at the current transform origin, facing right.
function drawFishShape(len, body, fin, t = time(), opts = {}) {
  const h = len * 0.42;
  const wag = Math.sin(t * 10) * 0.18;
  // tail
  drawPolygon({
    pts: [
      vec2(-len * 0.38, 0),
      vec2(-len * 0.66, -h * 0.62 + wag * len * 0.3),
      vec2(-len * 0.58, 0),
      vec2(-len * 0.66, h * 0.62 + wag * len * 0.3),
    ],
    color: fin,
    triangulate: true,
  });
  // dorsal + belly fins
  drawTriangle({ p1: vec2(-len * 0.12, -h * 0.4), p2: vec2(len * 0.12, -h * 0.42), p3: vec2(-len * 0.22, -h * 0.9), color: fin });
  drawTriangle({ p1: vec2(-len * 0.05, h * 0.38), p2: vec2(len * 0.1, h * 0.36), p3: vec2(-len * 0.12, h * 0.72), color: fin });
  // body
  drawEllipse({ pos: vec2(0, 0), radiusX: len * 0.45, radiusY: h * 0.5, color: body, outline: opts.outline });
  // belly highlight
  drawEllipse({ pos: vec2(len * 0.04, h * 0.16), radiusX: len * 0.3, radiusY: h * 0.22, color: rgb(255, 255, 255), opacity: 0.35 });
  // scales / stripes
  for (let i = 0; i < 3; i++) {
    drawCircle({
      pos: vec2(-len * 0.18 + i * len * 0.12, -h * 0.05),
      radius: len * 0.06,
      start: 270,
      end: 450,
      color: fin,
      opacity: 0.5,
    });
  }
  // gill
  drawCircle({ pos: vec2(len * 0.2, 0), radius: h * 0.3, start: 110, end: 250, color: fin, opacity: 0.8 });
  // eye
  drawCircle({ pos: vec2(len * 0.3, -h * 0.1), radius: Math.max(1.5, len * 0.065), color: rgb(255, 255, 255) });
  drawCircle({ pos: vec2(len * 0.315, -h * 0.1), radius: Math.max(1, len * 0.04), color: C.playerEye });
}

function drawCoin(p, r = 8) {
  drawCircle({ pos: p.add(0, 1.5), radius: r, color: C.goldText });
  drawCircle({ pos: p, radius: r, color: C.gold, outline: { width: 1.5, color: C.goldText } });
  drawCircle({ pos: p, radius: r * 0.62, color: C.goldLight, opacity: 0.6 });
  drawRect({ pos: p, width: r * 0.25, height: r * 0.9, anchor: "center", color: C.goldText, opacity: 0.7 });
  drawCircle({ pos: p.add(-r * 0.35, -r * 0.35), radius: r * 0.18, color: rgb(255, 255, 255), opacity: 0.9 });
}

function drawPanel(x, y, w, h, opts = {}) {
  const r = opts.radius ?? 16;
  drawRect({ pos: vec2(x + 3, y + 5), width: w, height: h, radius: r, color: C.shadow, opacity: 0.18 });
  drawRect({
    pos: vec2(x, y),
    width: w,
    height: h,
    radius: r,
    color: C.panelBg,
    opacity: opts.opacity ?? 1,
    outline: opts.outline === false ? undefined : { width: 3, color: C.panelOutline },
  });
}

function drawSparkle(p, s, col, op = 1) {
  drawPolygon({
    pts: [vec2(0, -s), vec2(s * 0.22, -s * 0.22), vec2(s, 0), vec2(s * 0.22, s * 0.22), vec2(0, s), vec2(-s * 0.22, s * 0.22), vec2(-s, 0), vec2(-s * 0.22, -s * 0.22)],
    pos: p,
    color: col,
    opacity: op,
    triangulate: true,
  });
}

// ---------- day/night ----------
function skyPhase() {
  return ((time() % DAY_NIGHT_CYCLE) / DAY_NIGHT_CYCLE) * Math.PI * 2;
}
function nightAmount() {
  return (1 - Math.cos(skyPhase())) / 2;
}
function duskAmount() {
  const n = nightAmount();
  return Math.pow(1 - Math.abs(2 * n - 1), 2);
}

// Precomputed scenery so it stays stable between frames.
function ridge(seed, count, base, amp) {
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const x = (i / count) * (W + 40) - 20;
    const y =
      base -
      amp * (0.55 + 0.45 * Math.sin(i * 0.9 + seed)) * (0.6 + 0.4 * Math.sin(i * 0.37 + seed * 2.1)) -
      Math.abs(Math.sin(i * 1.7 + seed)) * amp * 0.25;
    pts.push(vec2(x, y));
  }
  return pts;
}
const FAR_RIDGE = ridge(1.3, 40, SKY_H, 46);
const NEAR_RIDGE = ridge(4.1, 30, SKY_H, 24).map((p) => (p.x > 240 && p.x < 520 ? vec2(p.x, SKY_H - 2) : p));
const STARS = Array.from({ length: 90 }, () => ({
  x: rand(0, W),
  y: rand(0, SKY_H - 40) ** 1.15 / (SKY_H - 40) ** 0.15,
  r: rand(0.6, 1.8),
  tw: rand(0, Math.PI * 2),
  sp: rand(1.5, 4),
}));

function addEnvironment(withFog = true, opts = {}) {
  const clouds = Array.from({ length: 5 }, (_, i) => ({
    x: rand(-100, W + 100),
    y: 40 + i * 38 + rand(-10, 10),
    s: rand(0.6, 1.1),
    sp: rand(4, 11),
  }));
  const birds = Array.from({ length: 3 }, (_, i) => ({
    x: rand(-300, W),
    y: 80 + i * 22,
    sp: rand(26, 40),
    ph: rand(0, 6),
  }));
  const waves = Array.from({ length: 70 }, () => {
    const d = rand(0, 1);
    return { x: rand(0, W), d, sp: rand(4, 10), ph: rand(0, 6) };
  });

  // --- sky, sun/moon, stars, clouds, hills
  drawer(() => {
    const phase = skyPhase();
    const n = nightAmount();
    const dusk = duskAmount();
    const top = C.daySkyTop.lerp(C.nightSkyTop, n);
    const mid = C.daySky.lerp(C.nightSky, n);
    const low = C.daySkyLow.lerp(C.nightSkyLow, n).lerp(C.duskGlow, dusk * 0.8);

    drawRect({ pos: vec2(0, 0), width: W, height: SKY_H * 0.55, gradient: [top, mid] });
    drawRect({ pos: vec2(0, SKY_H * 0.55 - 1), width: W, height: SKY_H * 0.45 + 1, gradient: [mid, low] });

    // stars
    const starOp = Math.max(0, (n - 0.45) / 0.55);
    if (starOp > 0) {
      for (const s of STARS) {
        const tw = 0.55 + 0.45 * Math.sin(time() * s.sp + s.tw);
        drawCircle({ pos: vec2(s.x, s.y), radius: s.r, color: C.star, opacity: starOp * tw });
        if (s.r > 1.5) drawSparkle(vec2(s.x, s.y), s.r * 3 * tw, C.star, starOp * tw * 0.6);
      }
    }

    // sun or moon
    const isDayHalf = phase < Math.PI;
    const t = isDayHalf ? phase / Math.PI : (phase - Math.PI) / Math.PI;
    const bx = 80 + t * (W - 160);
    const by = 170 - Math.sin(t * Math.PI) * 110;
    const bop = 0.15 + 0.85 * Math.sin(t * Math.PI);
    const bp = vec2(bx, by);
    if (isDayHalf) {
      glow(bp, 22, C.sun, 0.55 * bop, 6);
      // soft rays
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * 360 + time() * 6;
        const dir = Vec2.fromAngle(a);
        drawLine({ p1: bp.add(dir.scale(28)), p2: bp.add(dir.scale(38 + (i % 2) * 8)), width: 3, color: C.sun, opacity: 0.45 * bop });
      }
      drawCircle({ pos: bp, radius: 22, color: C.sun, opacity: bop });
      drawCircle({ pos: bp, radius: 16, color: C.sunCore, opacity: bop });
    } else {
      glow(bp, 18, C.moon, 0.35 * bop, 5);
      drawCircle({ pos: bp, radius: 18, color: C.moon, opacity: bop });
      drawCircle({ pos: bp.add(-6, -5), radius: 4, color: C.moonShade, opacity: bop });
      drawCircle({ pos: bp.add(5, 4), radius: 5.5, color: C.moonShade, opacity: bop });
      drawCircle({ pos: bp.add(7, -7), radius: 2.5, color: C.moonShade, opacity: bop });
      drawCircle({ pos: bp.add(-4, 8), radius: 2, color: C.moonShade, opacity: bop });
    }

    // clouds
    const cloudCol = C.cloud.lerp(C.cloudNight, n).lerp(C.duskGlow, dusk * 0.35);
    const cloudShade = C.cloudShade.lerp(C.nightSkyTop, n * 0.8).lerp(C.stallRoof, dusk * 0.3);
    for (const c of clouds) {
      c.x += c.sp * dt();
      if (c.x > W + 120) c.x = -120;
      drawCloud(c.x, c.y, c.s, cloudCol, cloudShade, 0.9);
    }

    // birds (day only)
    const birdOp = Math.max(0, 1 - n * 1.8);
    if (birdOp > 0) {
      for (const b of birds) {
        b.x += b.sp * dt();
        if (b.x > W + 60) {
          b.x = rand(-400, -60);
          b.y = rand(60, 170);
        }
        const flap = Math.sin(time() * 8 + b.ph) * 5;
        const p = vec2(b.x, b.y + Math.sin(time() + b.ph) * 4);
        drawLines({ pts: [p.add(-8, -flap), p.add(-3, -1), p, p.add(3, -1), p.add(8, -flap)], width: 1.8, color: C.bird, opacity: birdOp * 0.8 });
      }
    }

    // distant hills
    const far = C.hillFar.lerp(C.hillNightFar, n).lerp(C.duskGlow, dusk * 0.25);
    const near = C.hillNear.lerp(C.hillNightNear, n).lerp(C.stallRoof, dusk * 0.15);
    for (const [ridgePts, col] of [
      [FAR_RIDGE, far],
      [NEAR_RIDGE, near],
    ]) {
      for (let i = 0; i < ridgePts.length - 1; i++) {
        const a = ridgePts[i];
        const b = ridgePts[i + 1];
        drawPolygon({ pts: [a, b, vec2(b.x, SKY_H + 1), vec2(a.x, SKY_H + 1)], color: col });
      }
    }

    // lighthouse on the far island
    const lx = 610;
    const ly = SKY_H - 4;
    const lhCol = rgb(250, 240, 236).lerp(rgb(120, 120, 150), n);
    const lhStripe = C.stallRoof.lerp(rgb(110, 70, 90), n);
    drawEllipse({ pos: vec2(lx, ly + 4), radiusX: 40, radiusY: 8, color: near });
    drawPolygon({ pts: [vec2(lx - 7, ly), vec2(lx + 7, ly), vec2(lx + 4.5, ly - 42), vec2(lx - 4.5, ly - 42)], color: lhCol });
    for (let i = 0; i < 3; i++) {
      const y0 = ly - 8 - i * 12;
      drawRect({ pos: vec2(lx - 6.5 + i * 0.6, y0 - 5), width: 13 - i * 1.2, height: 5, color: lhStripe });
    }
    drawRect({ pos: vec2(lx - 5, ly - 50), width: 10, height: 8, color: n > 0.4 ? C.lampGlow : rgb(220, 236, 244) });
    drawTriangle({ p1: vec2(lx - 7, ly - 50), p2: vec2(lx + 7, ly - 50), p3: vec2(lx, ly - 58), color: lhStripe });
    if (n > 0.35) {
      const beamOp = (n - 0.35) * 0.5;
      const sweep = Math.sin(time() * 1.2);
      const lp = vec2(lx, ly - 46);
      const tip = lp.add(sweep * 260, -20 + Math.abs(sweep) * 10);
      drawPolygon({ pts: [lp, tip.add(0, -14), tip.add(0, 14)], color: C.lampGlow, opacity: beamOp * (0.4 + 0.6 * Math.abs(sweep)) });
      glow(lp, 5, C.lampGlow, beamOp * 1.2, 4);
    }
  }, "bg", 0);

  // --- sea
  drawer(() => {
    const phase = skyPhase();
    const n = nightAmount();
    const dusk = duskAmount();
    const top = C.daySea.lerp(C.nightSea, n).lerp(C.duskGlow, dusk * 0.3);
    const deep = C.daySeaDeep.lerp(C.nightSeaDeep, n);
    drawRect({ pos: vec2(0, SKY_H), width: W, height: H - SKY_H, gradient: [top, deep] });

    // horizon shimmer line
    drawRect({ pos: vec2(0, SKY_H), width: W, height: 2, color: C.seaFoam, opacity: 0.35 - n * 0.15 });

    // reflection of the sun / moon
    const isDayHalf = phase < Math.PI;
    const t = isDayHalf ? phase / Math.PI : (phase - Math.PI) / Math.PI;
    const bx = 80 + t * (W - 160);
    const bop = Math.sin(t * Math.PI);
    const refCol = isDayHalf ? C.sunCore : C.moon;
    for (let i = 0; i < 14; i++) {
      const y = SKY_H + 6 + i * 9;
      const w = (26 - i * 1.2) * (0.7 + 0.3 * Math.sin(time() * 3 + i * 1.7));
      const off = Math.sin(time() * 1.5 + i) * 4;
      drawRect({ pos: vec2(bx + off, y), width: Math.max(4, w), height: 2.5, radius: 1, anchor: "center", color: refCol, opacity: bop * (0.55 - i * 0.035) });
    }

    // wave glints, sparser & smaller near the horizon
    for (const wv of waves) {
      wv.x += wv.sp * (0.4 + wv.d) * dt();
      if (wv.x > W + 20) wv.x = -20;
      const y = SKY_H + 8 + wv.d * wv.d * (H - SKY_H - 16);
      const len = 6 + wv.d * 18;
      const op = (0.2 + wv.d * 0.35) * (0.5 + 0.5 * Math.sin(time() * 1.4 + wv.ph));
      drawArc(vec2(wv.x, y + len * 0.5), len * 0.5, 215, 325, 1.2 + wv.d, C.seaFoam, op * (1 - n * 0.5), len * 0.3);
    }
  }, "bg", 1);

  if (withFog) {
    for (let i = 0; i < 3; i++) {
      const f = { x: rand(-200, W), y: 322 + i * 44, sp: 6 + i * 3, w: rand(260, 380) };
      drawer(() => {
        f.x += f.sp * dt();
        if (f.x > W + 200) f.x = -f.w - 100;
        for (let j = 0; j < 4; j++) {
          drawEllipse({
            pos: vec2(f.x + j * f.w * 0.25, f.y + Math.sin(j * 2.3) * 6),
            radiusX: f.w * 0.3,
            radiusY: 18,
            color: C.fog,
            opacity: 0.05,
          });
        }
      }, "fog", 0);
    }
  }

  if (opts.jumpers !== false) addJumpingFish();
}

// Every so often a little fish leaps out of the water in the distance.
function addJumpingFish() {
  let jump = null;
  let nextJump = time() + rand(2, 5);
  const splashes = [];
  drawer(() => {
    if (!jump && time() > nextJump) {
      const x = rand(60, W - 60);
      jump = { x, y: rand(372, 410), t: 0, dir: chance(0.5) ? 1 : -1, len: rand(12, 18), fish: FISH_TIERS[randi(0, 3)] };
      splashes.push({ x: jump.x, y: jump.y, t: 0 });
    }
    if (jump) {
      jump.t += dt();
      const d = 1.0;
      const k = jump.t / d;
      const px = jump.x + jump.dir * k * 50;
      const py = jump.y - Math.sin(k * Math.PI) * 38;
      const ang = jump.dir > 0 ? -60 + k * 120 : 180 + 60 - k * 120;
      pushTransform();
      pushTranslate(vec2(px, py));
      pushRotate(ang);
      if (jump.dir < 0) pushScale(vec2(1, -1));
      drawFishShape(jump.len, jump.fish.col, jump.fish.fin);
      popTransform();
      if (k >= 1) {
        splashes.push({ x: px, y: jump.y, t: 0 });
        jump = null;
        nextJump = time() + rand(4, 9);
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.t += dt();
      const k = s.t / 0.9;
      if (k >= 1) {
        splashes.splice(i, 1);
        continue;
      }
      drawEllipse({ pos: vec2(s.x, s.y), radiusX: 4 + k * 22, radiusY: 1.5 + k * 5, fill: false, outline: { width: 1.5, color: C.seaFoam }, color: C.seaFoam, opacity: (1 - k) * 0.8 });
      for (let j = 0; j < 5; j++) {
        const a = -150 + j * 30;
        const dir = Vec2.fromAngle(a);
        const pp = vec2(s.x, s.y).add(dir.scale(k * 14)).add(0, k * k * 18);
        drawCircle({ pos: pp, radius: 1.8 * (1 - k), color: C.seaFoam, opacity: 1 - k });
      }
    }
  }, "bg", 2);
}

function pulse(obj, speed = 3) {
  obj.onUpdate(() => {
    obj.opacity = 0.6 + Math.sin(time() * speed) * 0.4;
  });
}

function floatingText(msg, col, atPos) {
  const raw = atPos ? atPos : vec2(W / 2, PIER_Y - 90);
  const p = vec2(Math.max(110, Math.min(W - 110, raw.x)), raw.y);
  const t = add([
    text(msg, { size: 16 }),
    pos(p),
    anchor("center"),
    color(col),
    opacity(1),
    scale(0.6),
    z(60),
    layer("fx"),
    {
      draw() {
        // soft pill behind the text
        drawRect({
          pos: vec2(0, 1),
          width: this.width + 22,
          height: this.height + 10,
          radius: 12,
          anchor: "center",
          color: C.panelBg,
          opacity: this.opacity * 0.75,
        });
      },
    },
  ]);
  let age = 0;
  t.onUpdate(() => {
    age += dt();
    const s = age < 0.15 ? lerpN(0.6, 1.1, age / 0.15) : Math.max(1, 1.1 - (age - 0.15) * 1.5);
    t.scale = vec2(s);
    t.pos.y -= 24 * dt();
    t.opacity -= dt() * 0.8;
    if (t.opacity <= 0) destroy(t);
  });
}

// Burst of little sparkles / droplets.
function burst(p, col, count = 10, spread = 80) {
  for (let i = 0; i < count; i++) {
    const v = Vec2.fromAngle(rand(-160, -20)).scale(rand(spread * 0.4, spread));
    const size = rand(2, 4.5);
    const o = add([
      pos(p),
      layer("fx"),
      z(55),
      {
        vel: v,
        life: 0,
        draw() {
          drawSparkle(vec2(0, 0), size * (1 - this.life), col, 1 - this.life);
        },
      },
    ]);
    o.onUpdate(() => {
      o.life += dt() * 1.4;
      o.vel.y += 240 * dt();
      o.pos = o.pos.add(o.vel.scale(dt()));
      if (o.life >= 1) destroy(o);
    });
  }
}

// ---------- the fisherfolk ----------
// Draws the character at the current transform, feet at (0,0), facing right.
// `pose` = { walk, fishing, biting, blink, rodTint }
function drawCharacter(pose) {
  const t = time();
  const walkCycle = pose.walk ? t * 12 : 0;
  const bounce = pose.walk ? Math.abs(Math.sin(walkCycle)) * 2.5 : Math.sin(t * 2.2) * 0.8;
  const legSwing = pose.walk ? Math.sin(walkCycle) * 4 : 0;
  const O = C.playerOutline;

  // shadow
  drawEllipse({ pos: vec2(0, 1), radiusX: 16 - bounce, radiusY: 3.5, color: C.shadow, opacity: 0.22 });

  // legs + boots
  for (const [side, sw] of [
    [-5, -legSwing],
    [5, legSwing],
  ]) {
    const lift = pose.walk ? Math.max(0, Math.sin(walkCycle + (side < 0 ? Math.PI : 0))) * 2 : 0;
    drawRect({ pos: vec2(side + sw * 0.5 - 3, -14 - bounce * 0.4), width: 6, height: 10, radius: 2, color: C.playerPants, outline: { width: 1.5, color: O } });
    drawRect({ pos: vec2(side + sw - 4, -5 - lift), width: 10, height: 6, radius: 3, color: C.playerBoot, outline: { width: 1.5, color: O } });
    drawRect({ pos: vec2(side + sw - 2, -4.5 - lift), width: 4, height: 1.5, radius: 1, color: rgb(255, 255, 255), opacity: 0.25 });
  }

  pushTransform();
  pushTranslate(vec2(0, -bounce));

  // back arm
  drawRect({ pos: vec2(-12, -34), width: 7, height: 15, radius: 3.5, angle: 12 + legSwing * 2, color: C.playerBodyDark, outline: { width: 1.5, color: O } });

  // raincoat body
  drawPolygon({
    pts: [vec2(-11, -38), vec2(11, -38), vec2(14, -12), vec2(-14, -12)],
    color: C.playerBody,
    outline: { width: 2, color: O },
    radius: 4,
  });
  // coat hem shade + pocket + buttons
  drawRect({ pos: vec2(-13.5, -16), width: 27, height: 4, color: C.playerBodyDark, opacity: 0.8 });
  drawRect({ pos: vec2(2, -25), width: 8, height: 6, radius: 2, color: C.playerBodyDark, outline: { width: 1, color: O } });
  drawLine({ p1: vec2(-1, -36), p2: vec2(-1, -13), width: 1.2, color: O, opacity: 0.6 });
  for (const by of [-31, -24, -17]) {
    drawCircle({ pos: vec2(-3.5, by), radius: 1.4, color: rgb(255, 255, 255), outline: { width: 0.8, color: O } });
  }

  // scarf
  const flutter = Math.sin(t * 5) * 2 + (pose.walk ? 3 : 0);
  drawPolygon({
    pts: [vec2(-6, -38), vec2(-14 - flutter, -35 + Math.sin(t * 6) * 1.5), vec2(-15 - flutter, -28 + Math.sin(t * 6 + 1)), vec2(-9, -30)],
    color: C.playerScarfDark,
    outline: { width: 1.2, color: O },
  });
  drawRect({ pos: vec2(-11, -41), width: 22, height: 7, radius: 3.5, color: C.playerScarf, outline: { width: 1.5, color: O } });
  for (let i = 0; i < 3; i++) {
    drawLine({ p1: vec2(-6 + i * 6, -40.5), p2: vec2(-4 + i * 6, -34.5), width: 1, color: C.playerScarfDark });
  }

  // head
  const head = vec2(1, -53);
  drawCircle({ pos: head, radius: 14, color: C.playerSkin, outline: { width: 2, color: O } });
  // hair tufts peeking out from under the hat
  drawCircle({ pos: head.add(-10, -3), radius: 5.5, color: C.playerHair });
  drawCircle({ pos: head.add(-12, 2), radius: 4, color: C.playerHair });
  drawCircle({ pos: head.add(8, -6), radius: 3.5, color: C.playerHair });
  // ear
  drawCircle({ pos: head.add(-8, 3), radius: 3.2, color: C.playerSkinShade, outline: { width: 1.2, color: O } });

  // face
  const blink = pose.blink;
  const eyeY = head.y + 1;
  for (const ex of [head.x + 3, head.x + 10]) {
    if (blink) {
      drawLine({ p1: vec2(ex - 2, eyeY), p2: vec2(ex + 2, eyeY), width: 1.5, color: C.playerEye });
    } else {
      drawEllipse({ pos: vec2(ex, eyeY), radiusX: 2, radiusY: 2.8, color: C.playerEye });
      drawCircle({ pos: vec2(ex + 0.7, eyeY - 1.1), radius: 0.9, color: rgb(255, 255, 255) });
    }
  }
  drawEllipse({ pos: vec2(head.x - 1, eyeY + 5), radiusX: 3, radiusY: 1.8, color: C.blush, opacity: 0.55 });
  drawEllipse({ pos: vec2(head.x + 12.5, eyeY + 5), radiusX: 1.8, radiusY: 1.6, color: C.blush, opacity: 0.55 });
  if (pose.biting) {
    drawCircle({ pos: vec2(head.x + 7, eyeY + 7), radius: 2.2, color: C.playerEye });
  } else {
    drawArc(vec2(head.x + 7, eyeY + 4.5), 2.5, 20, 160, 1.3, C.playerEye);
  }

  // bucket hat
  drawEllipse({ pos: head.add(0, -7), radiusX: 19, radiusY: 4.5, color: C.playerHatDark, outline: { width: 1.8, color: O } });
  drawPolygon({
    pts: [head.add(-12, -8), head.add(-9, -20), head.add(9, -20), head.add(12, -8)],
    color: C.playerHat,
    outline: { width: 1.8, color: O },
    radius: 3,
  });
  drawRect({ pos: head.add(-11.5, -12), width: 23, height: 3.5, color: C.playerHatBand });
  drawCircle({ pos: head.add(-8, -10.3), radius: 2, color: C.stallRoof });
  drawLine({ p1: head.add(-4, -18), p2: head.add(4, -18), width: 1.5, color: rgb(255, 255, 255), opacity: 0.6 });

  // rod
  const hand = vec2(10, -27);
  const baseAngle = pose.fishing ? -28 : -58;
  const shake = pose.biting ? Math.sin(t * 50) * 4 : 0;
  const rodAngle = baseAngle + shake;
  const rodLen = 46;
  const bend = pose.biting ? 10 : pose.fishing ? 4 : 1;
  const dir = Vec2.fromAngle(rodAngle);
  const nrm = vec2(-dir.y, dir.x);
  const rodPts = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    rodPts.push(hand.add(dir.scale(rodLen * k)).add(nrm.scale(-bend * k * k * -1)));
  }
  drawLines({ pts: rodPts.slice(0, 5), width: 3.5, color: pose.rodTint, join: "round" });
  drawLines({ pts: rodPts.slice(4), width: 2, color: pose.rodTint, join: "round" });
  drawLine({ p1: hand.sub(dir.scale(6)), p2: hand.add(dir.scale(7)), width: 5, color: C.rodGrip });
  // line guides
  for (const k of [3, 5, 7]) drawCircle({ pos: rodPts[k], radius: 1.4, color: C.reel });
  // reel
  const reel = hand.add(dir.scale(3)).add(nrm.scale(4));
  drawCircle({ pos: reel, radius: 3.5, color: C.reel, outline: { width: 1, color: O } });
  drawLine({ p1: reel, p2: reel.add(Vec2.fromAngle(t * (pose.biting ? 900 : 0)).scale(3)), width: 1, color: O });
  const tip = rodPts[rodPts.length - 1];

  // front arm + hand holding the rod
  drawPolygon({
    pts: [vec2(3, -36), vec2(9, -37), hand.add(3, 2), hand.add(-2, 3)],
    color: C.playerBody,
    outline: { width: 1.5, color: O },
  });
  drawCircle({ pos: hand, radius: 3.6, color: C.playerSkin, outline: { width: 1.5, color: O } });

  popTransform();
  return tip.add(0, -bounce);
}

function drawBobber(p, legend, biting) {
  const col = legend && biting ? C.legendBobber : C.bobber;
  if (legend && biting) glow(p, 8, C.gold, 0.9, 5);
  // reflection
  drawEllipse({ pos: p.add(0, 7), radiusX: 6, radiusY: 2, color: col, opacity: 0.25 });
  // antenna
  drawLine({ p1: p.add(0, -5), p2: p.add(0, -12), width: 1.5, color: C.bobberOutline });
  drawCircle({ pos: p.add(0, -12.5), radius: 1.8, color: col });
  // body
  drawCircle({ pos: p, radius: 6.5, color: C.bobberOutline, outline: { width: 1.5, color: rgb(140, 120, 130) } });
  drawCircle({ pos: p, radius: 6.5, start: 180, end: 360, color: col });
  drawRect({ pos: p, width: 13, height: 1.8, anchor: "center", color: rgb(120, 110, 130), opacity: 0.6 });
  drawCircle({ pos: p.add(-2.5, -3), radius: 1.6, color: rgb(255, 255, 255), opacity: 0.8 });
  // water line
  drawEllipse({ pos: p.add(0, 4.5), radiusX: 8.5, radiusY: 2.2, fill: false, outline: { width: 1.2, color: C.seaFoam }, color: C.seaFoam, opacity: 0.7 });
}

// ---------- scenes ----------
layers(["bg", "fog", "world", "fx", "ui"], "world");

function addWavyTitle(str, y, size, col) {
  const letters = [];
  const spacing = size * 0.62;
  const startX = W / 2 - ((str.length - 1) * spacing) / 2;
  const hues = [rgb(255, 170, 160), rgb(255, 200, 140), rgb(150, 212, 196), rgb(140, 190, 230), rgb(200, 170, 230)];
  for (let i = 0; i < str.length; i++) {
    const base = vec2(startX + i * spacing, y);
    const shadowL = add([text(str[i], { size }), pos(base.add(3, 4)), anchor("center"), color(C.shadow), opacity(0.15), layer("ui")]);
    const l = add([text(str[i], { size }), pos(base), anchor("center"), color(hues[i % hues.length].lerp(col, 0.35)), rotate(0), layer("ui")]);
    l.onUpdate(() => {
      const k = Math.sin(time() * 3 - i * 0.55);
      l.pos.y = base.y + k * 6;
      shadowL.pos.y = base.y + 4 + k * 6;
      l.angle = Math.cos(time() * 3 - i * 0.55) * 5;
    });
    letters.push(l);
  }
  return letters;
}

scene("intro", () => {
  addEnvironment(true);

  // swimming fish around the title
  const swimmers = FISH_TIERS.map((f, i) => ({ f, off: i * 1.6, r: 170 + i * 12 }));
  drawer(() => {
    for (const s of swimmers) {
      const a = time() * 0.5 + s.off;
      const p = vec2(W / 2 + Math.cos(a) * s.r * 1.3, H / 2 + 150 + Math.sin(a) * 30);
      pushTransform();
      pushTranslate(p);
      pushScale(vec2(Math.sin(a) > 0 ? -1 : 1, 1).scale(1));
      drawFishShape(26, s.f.col, s.f.fin);
      popTransform();
    }
  }, "fx", 0);

  drawer(() => {
    drawPanel(W / 2 - 230, H / 2 - 130, 460, 190, { opacity: 0.82 });
    for (let i = 0; i < 3; i++) {
      drawSparkle(vec2(W / 2 - 200 + i * 200, H / 2 - 128 + Math.sin(time() * 2 + i) * 3), 5 + Math.sin(time() * 4 + i) * 2, C.gold, 0.9);
    }
  }, "ui", -1);

  addWavyTitle("fffffish", H / 2 - 70, 58, C.title);
  add([
    text("a quiet little fishing game", { size: 16 }),
    pos(W / 2, H / 2 - 4),
    anchor("center"),
    color(C.subtitle),
    layer("ui"),
  ]);
  drawer(() => {
    const y = H / 2 + 22;
    drawLine({ p1: vec2(W / 2 - 120, y), p2: vec2(W / 2 - 20, y), width: 1.5, color: C.panelOutline });
    drawLine({ p1: vec2(W / 2 + 20, y), p2: vec2(W / 2 + 120, y), width: 1.5, color: C.panelOutline });
    pushTransform();
    pushTranslate(vec2(W / 2, y));
    drawFishShape(20, C.stallRoof, C.stallOutline);
    popTransform();
  }, "ui", 1);

  const prompt = add([
    text("Press SPACE to begin", { size: 16 }),
    pos(W / 2, H / 2 + 100),
    anchor("center"),
    color(C.hudText),
    opacity(1),
    layer("ui"),
  ]);
  pulse(prompt);
  drawer(() => {
    drawRect({ pos: vec2(W / 2, H / 2 + 100), width: 250, height: 34, radius: 17, anchor: "center", color: C.panelBg, opacity: 0.55 + Math.sin(time() * 3) * 0.15, outline: { width: 2, color: C.panelOutline } });
  }, "ui", -1);

  add([
    text("Move: <- / -> or A / D    Act: SPACE", { size: 12 }),
    pos(W / 2, H - 30),
    anchor("center"),
    color(C.hudHint),
    opacity(0.8),
    layer("ui"),
  ]);

  onKeyPress("space", () => go("naming"));
});

scene("naming", () => {
  addEnvironment(true);

  state.playerName = "";
  state.money = 0;
  state.rodIndex = 0;
  state.caughtCount = 0;

  // little portrait of the fisherfolk
  let blinkUntil = 0;
  let nextBlink = time() + 2;
  drawer(() => {
    drawPanel(W / 2 - 210, H / 2 - 170, 420, 280, { opacity: 0.88 });
    if (time() > nextBlink) {
      blinkUntil = time() + 0.12;
      nextBlink = time() + rand(2, 4);
    }
    pushTransform();
    pushTranslate(vec2(W / 2, H / 2 - 104));
    pushScale(vec2(1.25));
    drawCharacter({ walk: false, fishing: false, biting: false, blink: time() < blinkUntil, rodTint: C.rod });
    popTransform();
    // input box
    drawRect({ pos: vec2(W / 2, H / 2 + 10), width: 300, height: 44, radius: 12, anchor: "center", color: rgb(255, 255, 255), outline: { width: 2, color: C.panelOutline } });
  }, "ui", -1);

  add([
    text("What should we call you, fisherfolk?", { size: 17 }),
    pos(W / 2, H / 2 - 44),
    anchor("center"),
    color(C.subtitle),
    layer("ui"),
  ]);

  const nameText = add([
    text("", { size: 26 }),
    pos(W / 2, H / 2 + 10),
    anchor("center"),
    color(C.title),
    layer("ui"),
  ]);
  const cursor = add([
    text("_", { size: 26 }),
    pos(W / 2, H / 2 + 10),
    anchor("left"),
    color(C.stallRoof),
    opacity(1),
    layer("ui"),
  ]);

  function refresh() {
    nameText.text = state.playerName;
    cursor.pos.x = W / 2 + nameText.width / 2 + 4;
  }
  refresh();

  cursor.onUpdate(() => {
    cursor.opacity = Math.sin(time() * 6) > 0 ? 1 : 0;
  });

  onCharInput((ch) => {
    if (state.playerName.length >= 12) return;
    if (/^[a-zA-Z0-9 ]$/.test(ch)) {
      state.playerName += ch;
      refresh();
    }
  });
  onKeyPressRepeat("backspace", () => {
    state.playerName = state.playerName.slice(0, -1);
    refresh();
  });
  onKeyPress("enter", () => {
    if (state.playerName.trim().length === 0) state.playerName = "Noob";
    go("game");
  });

  add([
    text("ENTER to confirm  -  BACKSPACE to edit", { size: 12 }),
    pos(W / 2, H / 2 + 62),
    anchor("center"),
    color(C.hudHint),
    opacity(0.8),
    layer("ui"),
  ]);
});

scene("game", () => {
  addEnvironment(true);
  state.gameStartTime = time();

  // ---------- pier ----------
  const deckX = PIER_X_MIN - 30;
  const deckW = PIER_X_MAX - PIER_X_MIN + 60;
  const plankShades = Array.from({ length: Math.ceil(deckW / 18) }, () => rand(-0.12, 0.12));
  const grain = Array.from({ length: 26 }, () => ({ x: rand(deckX + 4, deckX + deckW - 40), y: rand(PIER_Y + 13, PIER_Y + 26), w: rand(14, 40) }));
  const postXs = [];
  for (let x = deckX + 14; x < deckX + deckW; x += 74) postXs.push(x);

  // posts + their reflections (behind the deck)
  drawer(() => {
    const n = nightAmount();
    const post = C.pierPost.lerp(C.nightSea, n * 0.5);
    const postDark = C.pierPostDark.lerp(C.nightSeaDeep, n * 0.5);
    for (const x of postXs) {
      const top = PIER_Y + 20;
      const water = PIER_Y + 92;
      drawRect({ pos: vec2(x - 6, top), width: 12, height: water - top, color: post, outline: { width: 1.5, color: postDark } });
      drawRect({ pos: vec2(x + 2, top), width: 3, height: water - top, color: postDark, opacity: 0.5 });
      // barnacles / algae near the waterline
      drawRect({ pos: vec2(x - 6, water - 12), width: 12, height: 12, color: rgb(120, 170, 140), opacity: 0.45 });
      drawCircle({ pos: vec2(x - 3, water - 14), radius: 1.5, color: rgb(230, 230, 220), opacity: 0.7 });
      drawCircle({ pos: vec2(x + 3, water - 18), radius: 1.2, color: rgb(230, 230, 220), opacity: 0.7 });
      // wobbling reflection
      for (let i = 0; i < 8; i++) {
        const wob = Math.sin(time() * 2.5 + i * 0.9 + x) * 2.5;
        drawRect({ pos: vec2(x - 6 + wob, water + i * 5), width: 12 - i * 0.6, height: 3, color: postDark, opacity: 0.3 - i * 0.035 });
      }
      // ripple ring
      const rk = (time() * 0.6 + x * 0.01) % 1;
      drawEllipse({ pos: vec2(x, water), radiusX: 9 + rk * 14, radiusY: 2 + rk * 3, fill: false, outline: { width: 1.2, color: C.seaFoam }, color: C.seaFoam, opacity: (1 - rk) * 0.6 });
    }
    // cross braces
    for (let i = 0; i < postXs.length - 1; i++) {
      const a = postXs[i];
      const b = postXs[i + 1];
      drawLine({ p1: vec2(a + 4, PIER_Y + 30), p2: vec2(b - 4, PIER_Y + 70), width: 4, color: postDark, opacity: 0.8 });
    }
  }, "world", 0);

  // deck
  drawer(() => {
    const n = nightAmount();
    const wood = C.pierWood.lerp(C.nightSky, n * 0.35);
    const woodLight = C.pierWoodLight.lerp(C.nightSky, n * 0.35);
    const woodDark = C.pierWoodDark.lerp(C.nightSeaDeep, n * 0.35);
    // shadow on water
    drawRect({ pos: vec2(deckX + 6, PIER_Y + 28), width: deckW, height: 10, color: C.shadow, opacity: 0.12 });
    // top surface planks
    for (let i = 0; i < plankShades.length; i++) {
      const x = deckX + i * 18;
      const w = Math.min(18, deckX + deckW - x);
      const sh = plankShades[i];
      const col = sh > 0 ? woodLight.lerp(wood, 1 - sh * 4) : wood.lerp(woodDark, -sh * 3);
      drawRect({ pos: vec2(x, PIER_Y), width: w, height: 11, color: col });
      drawLine({ p1: vec2(x, PIER_Y), p2: vec2(x, PIER_Y + 11), width: 1, color: woodDark, opacity: 0.6 });
    }
    drawRect({ pos: vec2(deckX, PIER_Y), width: deckW, height: 2, color: rgb(255, 255, 255), opacity: 0.25 });
    // front fascia beam
    drawRect({ pos: vec2(deckX, PIER_Y + 11), width: deckW, height: 17, color: wood, outline: { width: 2, color: C.pierOutline } });
    drawRect({ pos: vec2(deckX, PIER_Y + 23), width: deckW, height: 5, color: woodDark, opacity: 0.5 });
    for (const g of grain) {
      drawLine({ p1: vec2(g.x, g.y), p2: vec2(g.x + g.w, g.y + 0.5), width: 1, color: woodDark, opacity: 0.45 });
    }
    for (const x of postXs) {
      drawCircle({ pos: vec2(x - 3, PIER_Y + 17), radius: 1.6, color: C.nail });
      drawCircle({ pos: vec2(x + 3, PIER_Y + 21), radius: 1.6, color: C.nail });
    }
    drawRect({ pos: vec2(deckX, PIER_Y), width: deckW, height: 28, fill: false, outline: { width: 2, color: C.pierOutline } });
  }, "world", 1);

  // pier props: bollards with rope, crates, bucket, lamp post, sign
  drawer(() => {
    const n = nightAmount();
    // rope railing between bollards
    const bollards = [deckX + 6, 330, deckX + deckW - 6];
    for (const bx of bollards) {
      drawRect({ pos: vec2(bx - 5, PIER_Y - 16), width: 10, height: 16, radius: 2, color: C.pierPost, outline: { width: 1.5, color: C.pierPostDark } });
      drawEllipse({ pos: vec2(bx, PIER_Y - 16), radiusX: 6.5, radiusY: 2.5, color: C.pierWoodLight, outline: { width: 1.2, color: C.pierPostDark } });
      drawRect({ pos: vec2(bx - 5.5, PIER_Y - 11), width: 11, height: 3, color: C.rope });
    }

    // stacked crates near the shop
    const cx = 196;
    for (const [dx, dy, s] of [
      [0, 0, 22],
      [22, 0, 20],
      [9, -22, 18],
    ]) {
      const x = cx + dx;
      const y = PIER_Y + dy - s;
      drawRect({ pos: vec2(x, y), width: s, height: s, color: C.pierWoodDark, outline: { width: 1.5, color: C.pierPostDark } });
      drawRect({ pos: vec2(x + 2, y + 2), width: s - 4, height: s - 4, fill: false, outline: { width: 1, color: C.pierPostDark } });
      drawLine({ p1: vec2(x + 2, y + 2), p2: vec2(x + s - 2, y + s - 2), width: 1.5, color: C.pierPostDark, opacity: 0.8 });
    }
    // fish peeking out of the top crate
    pushTransform();
    pushTranslate(vec2(cx + 18, PIER_Y - 44));
    pushRotate(-25);
    drawFishShape(14, FISH_TIERS[1].col, FISH_TIERS[1].fin, 0);
    popTransform();

    // bucket near the fishing spot
    const bx = 596;
    drawPolygon({ pts: [vec2(bx - 10, PIER_Y - 18), vec2(bx + 10, PIER_Y - 18), vec2(bx + 8, PIER_Y), vec2(bx - 8, PIER_Y)], color: C.playerHatBand, outline: { width: 1.5, color: C.playerOutline } });
    drawEllipse({ pos: vec2(bx, PIER_Y - 18), radiusX: 10, radiusY: 3, color: rgb(90, 130, 150), outline: { width: 1.2, color: C.playerOutline } });
    drawRect({ pos: vec2(bx - 9, PIER_Y - 11), width: 18, height: 2, color: rgb(255, 255, 255), opacity: 0.4 });
    drawArc(vec2(bx, PIER_Y - 18), 10, 190, 350, 1.2, C.lampMetal, 1, 9);
    if (state.caughtCount > 0) {
      pushTransform();
      pushTranslate(vec2(bx + 2, PIER_Y - 22));
      pushRotate(70);
      drawFishShape(11, FISH_TIERS[0].col, FISH_TIERS[0].fin, 0);
      popTransform();
    }

    // lamp post in the middle of the pier
    const lx = 420;
    drawRect({ pos: vec2(lx - 2, PIER_Y - 82), width: 4, height: 82, color: C.lampMetal });
    drawRect({ pos: vec2(lx - 5, PIER_Y - 6), width: 10, height: 6, radius: 2, color: C.lampMetal });
    drawLine({ p1: vec2(lx, PIER_Y - 80), p2: vec2(lx + 12, PIER_Y - 82), width: 3, color: C.lampMetal });
    const lamp = vec2(lx + 13, PIER_Y - 70);
    if (n > 0.3) {
      const k = Math.min(1, (n - 0.3) / 0.4) * (0.9 + 0.1 * Math.sin(time() * 9));
      glow(lamp, 10, C.lampGlow, 0.9 * k, 6);
      drawEllipse({ pos: vec2(lamp.x, PIER_Y + 2), radiusX: 50, radiusY: 6, color: C.lampGlow, opacity: 0.25 * k });
    }
    drawRect({ pos: lamp.add(0, -4), width: 11, height: 13, radius: 3, anchor: "center", color: n > 0.3 ? C.lampGlow : rgb(240, 240, 230), outline: { width: 1.5, color: C.lampMetal } });
    drawTriangle({ p1: lamp.add(-7, -10), p2: lamp.add(7, -10), p3: lamp.add(0, -15), color: C.lampMetal });

    // "fish here" sign post
    const sx = FISH_X - 30;
    drawRect({ pos: vec2(sx - 1.5, PIER_Y - 30), width: 3, height: 30, color: C.pierPostDark });
    drawRect({ pos: vec2(sx, PIER_Y - 34), width: 66, height: 16, radius: 4, anchor: "center", color: C.signBoard, outline: { width: 1.5, color: C.pierOutline } });
    drawText({ text: "fish here", size: 10, pos: vec2(sx, PIER_Y - 34), anchor: "center", color: C.panelText });
  }, "world", 2);

  // ---------- shop stall ----------
  const hangingFish = [
    { dx: -26, f: FISH_TIERS[0], ph: 0 },
    { dx: 0, f: FISH_TIERS[2], ph: 1.3 },
    { dx: 26, f: FISH_TIERS[1], ph: 2.1 },
  ];
  drawer(() => {
    const n = nightAmount();
    const x0 = SHOP_X - 46;
    const w = 92;
    const bottom = PIER_Y;
    // poles
    for (const px of [x0 + 4, x0 + w - 4]) {
      drawRect({ pos: vec2(px - 3, bottom - 96), width: 6, height: 96, color: C.pierWoodDark, outline: { width: 1.5, color: C.pierOutline } });
    }
    // back wall with vertical planks
    drawRect({ pos: vec2(x0 + 6, bottom - 86), width: w - 12, height: 54, color: C.stallBodyDark });
    for (let i = 1; i < 6; i++) {
      drawLine({ p1: vec2(x0 + 6 + i * 13.3, bottom - 86), p2: vec2(x0 + 6 + i * 13.3, bottom - 32), width: 1, color: C.stallOutline, opacity: 0.35 });
    }
    // shelf with jars
    drawRect({ pos: vec2(x0 + 8, bottom - 60), width: w - 16, height: 3, color: C.pierWoodDark });
    const jarCols = [C.playerScarf, C.playerHat, C.fishBlue, C.blush];
    for (let i = 0; i < 4; i++) {
      const jx = x0 + 16 + i * 19;
      drawRect({ pos: vec2(jx, bottom - 71), width: 10, height: 11, radius: 2, color: jarCols[i], outline: { width: 1, color: C.stallOutline } });
      drawRect({ pos: vec2(jx + 1, bottom - 74), width: 8, height: 3, color: C.pierWoodDark });
      drawRect({ pos: vec2(jx + 2, bottom - 69), width: 2, height: 6, color: rgb(255, 255, 255), opacity: 0.6 });
    }
    // rods leaning in the corner
    for (let i = 0; i < 3; i++) {
      drawLine({ p1: vec2(x0 + 12 + i * 4, bottom - 32), p2: vec2(x0 + 18 + i * 7, bottom - 84), width: 2, color: ROD_TIERS[i + 1].tint });
    }
    // counter
    drawRect({ pos: vec2(x0, bottom - 34), width: w, height: 34, color: C.stallBody, outline: { width: 2, color: C.stallOutline } });
    drawRect({ pos: vec2(x0 - 3, bottom - 38), width: w + 6, height: 6, radius: 2, color: C.pierWoodLight, outline: { width: 1.5, color: C.pierOutline } });
    for (let i = 1; i < 4; i++) {
      drawLine({ p1: vec2(x0, bottom - 34 + i * 8.5), p2: vec2(x0 + w, bottom - 34 + i * 8.5), width: 1, color: C.stallOutline, opacity: 0.35 });
    }
    // little fish emblem on the counter
    pushTransform();
    pushTranslate(vec2(SHOP_X, bottom - 16));
    drawCircle({ pos: vec2(0, 0), radius: 11, color: C.panelBg, outline: { width: 1.5, color: C.stallOutline } });
    drawFishShape(14, C.stallRoof, C.stallOutline, 0);
    popTransform();

    // striped awning with scalloped edge
    const ay = bottom - 104;
    const stripes = 7;
    const sw = (w + 16) / stripes;
    drawPolygon({ pts: [vec2(x0 + 4, ay - 8), vec2(x0 + w - 4, ay - 8), vec2(x0 + w + 8, ay + 12), vec2(x0 - 8, ay + 12)], color: C.stallStripe, outline: { width: 2, color: C.stallOutline } });
    for (let i = 0; i < stripes; i += 2) {
      const xa = x0 - 8 + i * sw;
      const topA = lerpN(x0 + 4, x0 + w - 4, (i * sw) / (w + 16));
      const topB = lerpN(x0 + 4, x0 + w - 4, ((i + 1) * sw) / (w + 16));
      drawPolygon({ pts: [vec2(topA, ay - 8), vec2(topB, ay - 8), vec2(xa + sw, ay + 12), vec2(xa, ay + 12)], color: C.stallRoof });
    }
    for (let i = 0; i < stripes; i++) {
      const cxs = x0 - 8 + i * sw + sw / 2;
      drawCircle({ pos: vec2(cxs, ay + 12), radius: sw / 2, start: 0, end: 180, color: i % 2 === 0 ? C.stallRoof : C.stallStripe, outline: { width: 1.5, color: C.stallOutline } });
    }
    // sign on top
    drawRect({ pos: vec2(SHOP_X, ay - 18), width: 70, height: 20, radius: 6, anchor: "center", color: C.signBoard, outline: { width: 2, color: C.stallOutline } });
    drawText({ text: "TACKLE", size: 12, pos: vec2(SHOP_X, ay - 17), anchor: "center", color: C.stallOutline });

    // hanging fish decorations
    for (const h of hangingFish) {
      const sway = Math.sin(time() * 2 + h.ph) * 6;
      const top = vec2(SHOP_X + h.dx, ay + 14);
      drawLine({ p1: top, p2: top.add(0, 8), width: 1, color: C.stallOutline });
      pushTransform();
      pushTranslate(top.add(0, 14));
      pushRotate(90 + sway);
      drawFishShape(14, h.f.col, h.f.fin, 0);
      popTransform();
    }

    // lantern hanging from the awning corner
    const lan = vec2(x0 + w + 4, ay + 26 + Math.sin(time() * 2) * 1);
    drawLine({ p1: vec2(x0 + w + 4, ay + 12), p2: lan.add(0, -8), width: 1, color: C.lampMetal });
    if (n > 0.3) glow(lan, 6, C.lampGlow, Math.min(1, (n - 0.3) * 2), 5);
    drawRect({ pos: lan, width: 9, height: 12, radius: 3, anchor: "center", color: n > 0.3 ? C.lampGlow : C.stallStripe, outline: { width: 1.5, color: C.lampMetal } });
  }, "world", 3);

  // player
  const player = add([
    pos(PIER_X_MIN, PIER_Y),
    scale(1, 1),
    z(10),
    layer("world"),
    {
      walkTimer: 0,
      blinkUntil: 0,
      nextBlink: 0,
      rodTip: vec2(0, 0),
      draw() {
        if (time() > this.nextBlink) {
          this.blinkUntil = time() + 0.12;
          this.nextBlink = time() + rand(2, 5);
        }
        this.rodTip = drawCharacter({
          walk: this.walkTimer > 0,
          fishing: fishState === "waiting" || fishState === "biting",
          biting: fishState === "biting",
          blink: time() < this.blinkUntil,
          rodTint: ROD_TIERS[state.rodIndex].tint,
        });
      },
    },
  ]);
  player.onUpdate(() => {
    player.walkTimer = Math.max(0, player.walkTimer - dt());
  });

  function nearZone(x, center) {
    return Math.abs(x - center) < ZONE_RANGE;
  }

  onKeyDown(["left", "a"], () => {
    if (shopOpen) return;
    const before = player.pos.x;
    player.pos.x = Math.max(PIER_X_MIN, player.pos.x - PLAYER_SPEED * dt());
    if (player.pos.x !== before) player.walkTimer = 0.08;
    player.scale.x = -1;
  });
  onKeyDown(["right", "d"], () => {
    if (shopOpen) return;
    const before = player.pos.x;
    player.pos.x = Math.min(PIER_X_MAX, player.pos.x + PLAYER_SPEED * dt());
    if (player.pos.x !== before) player.walkTimer = 0.08;
    player.scale.x = 1;
  });

  // zone indicators: a gentle bouncing arrow over the shop / fishing spot
  drawer(() => {
    if (shopOpen || fishState !== "idle") return;
    for (const zx of [SHOP_X, FISH_X]) {
      if (!nearZone(player.pos.x, zx)) continue;
      const y = (zx === SHOP_X ? PIER_Y - 150 : PIER_Y - 104) + Math.sin(time() * 5) * 4;
      drawTriangle({ p1: vec2(zx - 7, y), p2: vec2(zx + 7, y), p3: vec2(zx, y + 9), color: C.gold, outline: { width: 1.5, color: C.goldText } });
    }
  }, "fx", 0);

  // ---------- HUD ----------
  const hudMoney = add([text("", { size: 15 }), pos(52, 18), anchor("left"), fixed(), layer("ui"), color(C.hudText), z(31)]);
  const hudName = add([text("", { size: 14 }), pos(0, 18), anchor("center"), fixed(), layer("ui"), color(C.hudText), z(31)]);
  const hudRod = add([text("", { size: 14 }), pos(W - 18, 18), anchor("right"), fixed(), layer("ui"), color(C.hudText), z(31)]);
  const hudHint = add([text("", { size: 13 }), pos(W / 2, H - 26), anchor("center"), fixed(), layer("ui"), color(C.hudHint), z(31)]);

  drawer(() => {
    // coin pill
    const moneyW = hudMoney.width + 52;
    drawRect({ pos: vec2(12, 6), width: moneyW, height: 26, radius: 13, color: C.panelBg, opacity: 0.85, outline: { width: 2, color: C.panelOutline } });
    drawCoin(vec2(32, 19), 8);
    // name + catch count pill
    const nameW = hudName.width + 60;
    const nameX = 12 + moneyW + 10;
    hudName.pos.x = nameX + nameW / 2 + 12;
    drawRect({ pos: vec2(nameX, 6), width: nameW, height: 26, radius: 13, color: C.panelBg, opacity: 0.85, outline: { width: 2, color: C.panelOutline } });
    pushTransform();
    pushTranslate(vec2(nameX + 18, 19));
    drawFishShape(18, FISH_TIERS[0].col, FISH_TIERS[0].fin, time() * 0.3);
    popTransform();
    // rod pill with tier pips
    const rodW = hudRod.width + 70;
    const rodX = W - 12 - rodW;
    drawRect({ pos: vec2(rodX, 6), width: rodW, height: 26, radius: 13, color: C.panelBg, opacity: 0.85, outline: { width: 2, color: C.panelOutline } });
    for (let i = 0; i < ROD_TIERS.length; i++) {
      const owned = i <= state.rodIndex;
      drawCircle({ pos: vec2(rodX + 14 + i * 9, 19), radius: 3.2, color: owned ? ROD_TIERS[i].tint : C.panelOutline, opacity: owned ? 1 : 0.6 });
    }
    // bottom hint pill
    if (hudHint.text) {
      const hw = Math.max(200, hudHint.width + 40);
      const hot = fishState === "biting";
      drawRect({
        pos: vec2(W / 2, H - 26),
        width: hw * (hot ? 1 + Math.sin(time() * 20) * 0.03 : 1),
        height: 28,
        radius: 14,
        anchor: "center",
        color: hot ? (isLegendBite ? C.goldLight : rgb(255, 225, 220)) : C.panelBg,
        opacity: 0.88,
        outline: { width: 2, color: hot ? (isLegendBite ? C.gold : C.stallRoof) : C.panelOutline },
      });
    }
  }, "ui", 30);

  // ---------- fishing state machine ----------
  let fishState = "idle"; // idle | waiting | biting | cooldown
  let bobber = null;
  let isLegendBite = false;
  let biteDeadline = 0;

  function clearBobber() {
    if (!bobber) return;
    const b = bobber;
    bobber = null;
    b.fadeOut(0.25).onEnd(() => destroy(b));
  }

  function startCast() {
    fishState = "waiting";
    isLegendBite = false;
    player.scale.x = 1;
    const castStart = time();
    const myBobber = add([
      pos(BOBBER_X, BOBBER_Y),
      opacity(1),
      layer("world"),
      z(5),
      {
        castStart,
        rings: [],
        nextRing: 0,
        draw() {
          // fly in along an arc for the first moment of the cast
          const k = Math.min(1, (time() - castStart) / 0.35);
          if (k < 1) return;
          for (const r of this.rings) {
            drawEllipse({
              pos: vec2(0, 5),
              radiusX: 8 + r.k * 26,
              radiusY: 2 + r.k * 6,
              fill: false,
              outline: { width: 1.5, color: this.legend ? C.gold : C.seaFoam },
              color: C.seaFoam,
              opacity: (1 - r.k) * 0.8 * this.opacity,
            });
          }
          drawBobber(vec2(0, 0), isLegendBite, fishState === "biting" && bobber === myBobber);
        },
      },
    ]);
    bobber = myBobber;

    myBobber.onUpdate(() => {
      if (fishState === "waiting" && bobber === myBobber) {
        myBobber.pos.y = BOBBER_Y + Math.sin(time() * 5) * 3;
      }
      if (time() > myBobber.nextRing) {
        myBobber.rings.push({ k: 0 });
        myBobber.nextRing = time() + (fishState === "biting" ? 0.15 : 0.9);
      }
      for (const r of myBobber.rings) r.k += dt() * 0.9;
      myBobber.rings = myBobber.rings.filter((r) => r.k < 1);
    });

    // splash when it lands
    wait(0.35, () => {
      if (bobber === myBobber) burst(vec2(BOBBER_X, BOBBER_Y), C.seaFoam, 8, 60);
    });

    const rod = ROD_TIERS[state.rodIndex];
    const legendRoll = state.rodIndex === LEGEND_ROD_INDEX && chance(rod.legendChance);
    const delay = rand(BITE_WAIT[0], BITE_WAIT[1]);

    wait(0.35 + delay, () => {
      if (fishState !== "waiting" || bobber !== myBobber) return;
      isLegendBite = legendRoll;
      myBobber.legend = legendRoll;
      onBite(myBobber);
    });
  }

  // fishing line from rod tip to bobber, plus the fish shadow circling below
  drawer(() => {
    if (!bobber || (fishState !== "waiting" && fishState !== "biting")) return;
    const tip = vec2(player.pos.x + player.rodTip.x * player.scale.x, player.pos.y + player.rodTip.y);
    const target = bobber.pos.add(0, -12);
    const age = time() - bobber.castStart;
    const k = Math.min(1, age / 0.35);
    // bobber flying out
    const end = k < 1 ? tip.lerp(target, k).add(0, -Math.sin(k * Math.PI) * 60) : target;
    if (k < 1) drawBobber(end.add(0, 12), false, false);
    const sag = fishState === "biting" ? 2 : 14;
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      pts.push(tip.lerp(end, u).add(0, Math.sin(u * Math.PI) * sag));
    }
    drawLines({ pts, width: 1, color: C.line, opacity: 0.85 });

    // shadow of a fish sniffing around
    const fp = vec2(BOBBER_X + Math.cos(time() * 1.3) * 24, BOBBER_Y + 22 + Math.sin(time() * 2.6) * 4);
    const toward = fishState === "biting" ? vec2(BOBBER_X, BOBBER_Y + 10) : fp;
    pushTransform();
    pushTranslate(toward);
    pushScale(vec2(-Math.sin(time() * 1.3) > 0 ? 1 : -1, 0.5));
    drawEllipse({ pos: vec2(0, 0), radiusX: isLegendBite ? 26 : 13, radiusY: isLegendBite ? 10 : 6, color: C.fishShadow, opacity: 0.3 });
    popTransform();
  }, "world", 9);

  function onBite(myBobber) {
    fishState = "biting";
    biteDeadline = time() + (isLegendBite ? LEGEND_WINDOW : CATCH_WINDOW[state.rodIndex]);
    myBobber.pos.y += 10;
    myBobber.rings = [];
    myBobber.nextRing = 0;
    burst(myBobber.pos, isLegendBite ? C.gold : C.seaFoam, isLegendBite ? 16 : 8, 70);
    if (isLegendBite) shake(4);

    const mark = add([
      text(isLegendBite ? "!!" : "!", { size: isLegendBite ? 30 : 24 }),
      pos(myBobber.pos.x, myBobber.pos.y - 34),
      anchor("center"),
      color(isLegendBite ? C.goldText : C.badText),
      opacity(1),
      scale(1),
      layer("fx"),
      z(20),
      {
        draw() {
          drawCircle({ pos: vec2(0, 1), radius: 17, color: rgb(255, 255, 255), opacity: this.opacity * 0.9, outline: { width: 2, color: isLegendBite ? C.gold : C.stallRoof } });
        },
      },
    ]);
    let age = 0;
    mark.onUpdate(() => {
      age += dt();
      mark.scale = vec2(age < 0.1 ? lerpN(0.4, 1.2, age / 0.1) : 1.2 - Math.min(0.2, (age - 0.1) * 2));
      mark.pos.y -= 20 * dt();
      mark.opacity -= dt() * 1.2;
      if (mark.opacity <= 0) destroy(mark);
    });
  }

  function failCast(msg) {
    fishState = "cooldown";
    floatingText(msg, C.badText, vec2(player.pos.x, PIER_Y - 100));
    clearBobber();
    wait(COOLDOWN, () => {
      fishState = "idle";
    });
  }

  // A caught fish arcs from the water up into the player's bucket.
  function flyingCatch(fish) {
    const from = vec2(BOBBER_X, BOBBER_Y);
    const to = vec2(player.pos.x, PIER_Y - 70);
    let age = 0;
    const o = add([
      pos(from),
      layer("fx"),
      z(40),
      {
        draw() {
          pushTransform();
          pushRotate(Math.sin(age * 20) * 20 - 20);
          drawFishShape(18 + fish.tier * 4, fish.col, fish.fin, age * 3, { outline: { width: 1, color: C.playerOutline } });
          popTransform();
        },
      },
    ]);
    o.onUpdate(() => {
      age += dt();
      const k = Math.min(1, age / 0.6);
      o.pos = from.lerp(to, k).add(0, -Math.sin(k * Math.PI) * 80);
      if (k >= 1) {
        burst(o.pos, C.gold, 6, 50);
        destroy(o);
      }
    });
  }

  function succeedCatch() {
    fishState = "cooldown";
    if (isLegendBite) {
      clearBobber();
      const elapsed = time() - state.gameStartTime;
      go("win", {
        name: state.playerName,
        money: state.money,
        elapsed,
        catches: state.caughtCount + 1,
      });
      return;
    }
    const rod = ROD_TIERS[state.rodIndex];
    const fish = pickFish(rod.tiers);
    state.money += fish.value;
    state.caughtCount++;
    burst(vec2(BOBBER_X, BOBBER_Y), C.seaFoam, 10, 80);
    flyingCatch(fish);
    floatingText(`+${fish.value} ${fish.emoji} ${fish.name}`, C.goodText, vec2(player.pos.x, PIER_Y - 100));
    clearBobber();
    wait(COOLDOWN, () => {
      fishState = "idle";
    });
  }

  // ---------- shop ----------
  let shopOpen = false;
  let shopPanel = null;

  function buildShopPanel() {
    const panel = add([pos(W / 2, H / 2), anchor("center"), z(50), layer("ui"), fixed()]);
    const nextIndex = state.rodIndex + 1;
    const hasNext = nextIndex < ROD_TIERS.length;
    const nextRod = hasNext ? ROD_TIERS[nextIndex] : null;
    const afford = hasNext && state.money >= nextRod.cost;

    // backdrop + panel art
    panel.add([
      {
        draw() {
          drawRect({ pos: vec2(-W / 2, -H / 2), width: W, height: H, color: C.shadow, opacity: 0.3 });
          drawPanel(-200, -120, 400, 240, { radius: 18 });
          // header ribbon
          drawRect({ pos: vec2(-200, -120), width: 400, height: 44, radius: [18, 18, 0, 0], color: C.panelHeader });
          for (let i = 0; i < 10; i++) {
            drawCircle({ pos: vec2(-180 + i * 40, -76), radius: 7, start: 0, end: 180, color: C.panelHeader });
          }
          drawRect({ pos: vec2(-200, -120), width: 400, height: 240, radius: 18, fill: false, outline: { width: 3, color: C.panelOutline } });
          // rod illustration
          const tint = (nextRod ?? ROD_TIERS[state.rodIndex]).tint;
          const base = vec2(-150, 50);
          const tip = vec2(-110, -40);
          drawLine({ p1: base, p2: tip, width: 4, color: tint });
          drawLine({ p1: base, p2: base.lerp(tip, 0.2), width: 7, color: C.rodGrip });
          drawCircle({ pos: base.lerp(tip, 0.15).add(6, 2), radius: 5, color: C.reel, outline: { width: 1, color: C.playerOutline } });
          drawLines({ pts: [tip, tip.add(4, 20), tip.add(6, 36)], width: 1, color: C.panelHint });
          drawCircle({ pos: tip.add(6, 40), radius: 4, color: C.bobber });
          if (!hasNext || nextIndex === LEGEND_ROD_INDEX) {
            for (let i = 0; i < 3; i++) {
              drawSparkle(tip.add(-10 + i * 12, -6 + Math.sin(time() * 3 + i) * 5), 4 + Math.sin(time() * 5 + i) * 1.5, C.gold);
            }
          }
          // tier pips
          for (let i = 0; i < ROD_TIERS.length; i++) {
            const owned = i <= state.rodIndex;
            const isNext = i === nextIndex;
            const p = vec2(-40 + i * 24 + 28, 86);
            drawCircle({ pos: p, radius: 7, color: owned ? ROD_TIERS[i].tint : C.panelBg, outline: { width: 2, color: isNext ? C.gold : C.panelOutline } });
          }
          if (afford) {
            drawRect({ pos: vec2(40, 40), width: 190, height: 28, radius: 14, anchor: "center", color: rgb(220, 240, 222), opacity: 0.7 + Math.sin(time() * 4) * 0.2, outline: { width: 2, color: C.goodText } });
          }
          if (hasNext) drawCoin(vec2(-22, 2), 8);
        },
      },
    ]);

    panel.add([text("Tackle Shop", { size: 20 }), anchor("center"), pos(0, -98), color(C.panelTitle)]);

    if (hasNext) {
      panel.add([text(nextRod.name, { size: 18 }), anchor("left"), pos(-36, -38), color(C.panelText)]);
      panel.add([
        text(`Cost: ${nextRod.cost} coins`, { size: 15 }),
        anchor("left"),
        pos(-8, 2),
        color(afford ? C.goldText : C.panelText),
      ]);
      panel.add([
        text(afford ? "SPACE to buy" : `Need ${nextRod.cost - state.money} more coins`, { size: 14 }),
        anchor("center"),
        pos(40, 40),
        color(afford ? C.goodText : C.badText),
      ]);
    } else {
      panel.add([
        text("You wield the finest rod\nin the sea.", { size: 15, align: "center" }),
        anchor("center"),
        pos(40, -24),
        color(C.panelText),
      ]);
      panel.add([text("Go find your legend.", { size: 16 }), anchor("center"), pos(40, 30), color(C.goldText)]);
    }
    panel.add([text("ESC to close", { size: 12 }), anchor("center"), pos(0, 108), color(C.panelHint)]);
    return panel;
  }

  function openShop() {
    shopOpen = true;
    shopPanel = buildShopPanel();
  }
  function closeShop() {
    shopOpen = false;
    if (shopPanel) {
      destroy(shopPanel);
      shopPanel = null;
    }
  }
  function attemptPurchase() {
    const nextIndex = state.rodIndex + 1;
    if (nextIndex >= ROD_TIERS.length) {
      closeShop();
      return;
    }
    const nextRod = ROD_TIERS[nextIndex];
    if (state.money >= nextRod.cost) {
      state.money -= nextRod.cost;
      state.rodIndex = nextIndex;
      closeShop();
      burst(vec2(player.pos.x, PIER_Y - 60), C.gold, 14, 90);
      floatingText(`Bought ${nextRod.name}!`, C.goldText, vec2(player.pos.x, PIER_Y - 100));
    }
  }

  onKeyPress("escape", () => {
    if (shopOpen) closeShop();
  });

  // ---------- input ----------
  onKeyPress("space", () => {
    if (shopOpen) {
      attemptPurchase();
      return;
    }
    if (nearZone(player.pos.x, SHOP_X) && fishState === "idle") {
      openShop();
      return;
    }
    if (nearZone(player.pos.x, FISH_X)) {
      if (fishState === "idle") {
        startCast();
        return;
      }
      if (fishState === "waiting") {
        failCast("Too early!");
        return;
      }
      if (fishState === "biting") {
        succeedCatch();
        return;
      }
    }
  });

  // ---------- per-frame ----------
  function computeHint() {
    if (shopOpen) return "";
    if (fishState === "waiting") return "wait for it...";
    if (fishState === "biting") return isLegendBite ? "NOW! SPACE to hook the legend!" : "SPACE now!";
    if (fishState === "cooldown") return "";
    if (nearZone(player.pos.x, SHOP_X)) return "SPACE to open the shop";
    if (nearZone(player.pos.x, FISH_X)) return "SPACE to cast your line";
    return "<- -> to walk";
  }

  onUpdate(() => {
    player.pos.x = Math.max(PIER_X_MIN, Math.min(PIER_X_MAX, player.pos.x));

    if (fishState === "biting" && time() > biteDeadline) {
      failCast(isLegendBite ? "The legend slipped away..." : "It got away...");
    }

    hudMoney.text = `${state.money}`;
    hudName.text = `${state.playerName}  x${state.caughtCount}`;
    hudRod.text = `${ROD_TIERS[state.rodIndex].name}`;
    hudHint.text = computeHint();
  });
});

scene("win", ({ name, money, elapsed, catches }) => {
  const sparkles = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(0, H), sp: rand(10, 30), s: rand(2, 5), ph: rand(0, 6) }));
  const confetti = Array.from({ length: 60 }, () => ({
    x: rand(0, W),
    y: rand(-H, 0),
    sp: rand(40, 90),
    rot: rand(0, 360),
    rs: rand(-200, 200),
    col: [C.stallRoof, C.gold, C.playerScarf, C.fishBlue, C.playerHat][randi(0, 5)],
  }));

  drawer(() => {
    const horizon = H * 0.6;
    drawRect({ pos: vec2(0, 0), width: W, height: horizon, gradient: [C.winSkyHigh, C.winSkyTop] });
    // sun setting behind the sea
    const sunP = vec2(W / 2, horizon);
    glow(sunP, 70, C.gold, 0.6, 7);
    // rotating god-rays
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 360 + time() * 8;
      const d1 = Vec2.fromAngle(a - 4);
      const d2 = Vec2.fromAngle(a + 4);
      drawPolygon({ pts: [sunP, sunP.add(d1.scale(600)), sunP.add(d2.scale(600))], color: C.goldLight, opacity: 0.12 });
    }
    drawCircle({ pos: sunP, radius: 70, color: C.gold, opacity: 0.7 });
    drawCircle({ pos: sunP, radius: 54, color: C.goldLight, opacity: 0.6 });
    drawCloud(140 + Math.sin(time() * 0.3) * 20, 120, 1, rgb(255, 236, 226), rgb(250, 200, 190), 0.9);
    drawCloud(640 + Math.sin(time() * 0.25 + 2) * 20, 90, 0.8, rgb(255, 236, 226), rgb(250, 200, 190), 0.9);
    // sea
    drawRect({ pos: vec2(0, horizon), width: W, height: H - horizon, gradient: [C.winSea, C.winSeaDeep] });
    for (let i = 0; i < 12; i++) {
      const y = horizon + 6 + i * 9;
      const w = (120 - i * 7) * (0.8 + 0.2 * Math.sin(time() * 3 + i));
      drawRect({ pos: vec2(W / 2 + Math.sin(time() * 2 + i) * 6, y), width: w, height: 3, radius: 1.5, anchor: "center", color: C.goldLight, opacity: 0.6 - i * 0.04 });
    }
    // rising sparkles
    for (const s of sparkles) {
      s.y -= s.sp * dt();
      if (s.y < -10) {
        s.y = H + 10;
        s.x = rand(0, W);
      }
      drawSparkle(vec2(s.x, s.y), s.s * (0.6 + 0.4 * Math.sin(time() * 4 + s.ph)), C.goldLight, 0.8);
    }
  }, "bg", 0);

  // the Legend God Fish, leaping with a crown
  drawer(() => {
    const t = time();
    const p = vec2(W / 2, H / 2 - 128 + Math.sin(t * 2) * 8);
    glow(p, 44, C.gold, 0.5, 6);
    pushTransform();
    pushTranslate(p);
    pushRotate(Math.sin(t * 2) * 6 - 8);
    drawFishShape(110, C.gold, rgb(236, 160, 70), t * 0.6, { outline: { width: 2.5, color: C.goldText } });
    // crown
    pushTranslate(vec2(12, -30));
    pushRotate(10);
    drawPolygon({
      pts: [vec2(-16, 0), vec2(-16, -14), vec2(-8, -6), vec2(0, -18), vec2(8, -6), vec2(16, -14), vec2(16, 0)],
      color: C.goldLight,
      outline: { width: 2, color: C.goldText },
      triangulate: true,
    });
    for (const [x, col] of [
      [-10, C.stallRoof],
      [0, C.fishBlue],
      [10, C.playerScarf],
    ]) {
      drawCircle({ pos: vec2(x, -4), radius: 2.5, color: col });
    }
    popTransform();
    for (let i = 0; i < 5; i++) {
      const a = t * 60 + i * 72;
      drawSparkle(p.add(Vec2.fromAngle(a).scale(80, 50)), 5 + Math.sin(t * 5 + i) * 2, rgb(255, 255, 255), 0.9);
    }
  }, "fx", 0);

  drawer(() => {
    drawPanel(W / 2 - 230, H / 2 - 66, 460, 150, { opacity: 0.9 });
    for (const c of confetti) {
      c.y += c.sp * dt();
      c.x += Math.sin(time() * 2 + c.rot) * 20 * dt();
      c.rot += c.rs * dt();
      if (c.y > H + 10) {
        c.y = -10;
        c.x = rand(0, W);
      }
      drawRect({ pos: vec2(c.x, c.y), width: 8, height: 4 * Math.abs(Math.cos((c.rot * Math.PI) / 180)) + 1, anchor: "center", angle: c.rot, color: c.col });
    }
  }, "ui", -1);

  add([
    text(`${name} caught the`, { size: 20 }),
    pos(W / 2, H / 2 - 42),
    anchor("center"),
    color(C.title),
    layer("ui"),
  ]);
  const titleText = add([
    text("Legend God Fish!", { size: 30 }),
    pos(W / 2, H / 2 - 6),
    anchor("center"),
    color(C.goldText),
    scale(1),
    layer("ui"),
  ]);
  titleText.onUpdate(() => {
    titleText.scale = vec2(1 + Math.sin(time() * 3) * 0.04);
  });

  const mm = Math.floor(elapsed / 60);
  const ss = Math.floor(elapsed % 60)
    .toString()
    .padStart(2, "0");
  add([
    text(`${money} coins earned   -   ${catches} fish caught`, { size: 14 }),
    pos(W / 2, H / 2 + 36),
    anchor("center"),
    color(C.panelText),
    layer("ui"),
  ]);
  add([
    text(`time: ${mm}:${ss}`, { size: 14 }),
    pos(W / 2, H / 2 + 60),
    anchor("center"),
    color(C.panelText),
    layer("ui"),
  ]);

  const prompt = add([
    text("Press SPACE to play again", { size: 14 }),
    pos(W / 2, H - 60),
    anchor("center"),
    color(C.title),
    opacity(1),
    layer("ui"),
  ]);
  pulse(prompt);

  onKeyPress("space", () => go("intro"));
});

go("intro");
