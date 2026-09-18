import { W, H, SKY_H, PIER_Y, PIER_X_MIN, PIER_X_MAX, SHOP_X, FISH_X, DAY_NIGHT_CYCLE, C, RODS, FISH_SPECIES, state, weather } from "./data.js";

// ---------- drawing helpers ----------
// Adds an object whose only job is to run `fn` every frame on the given layer.
export function drawer(fn, layerName = "world", zIndex = 0) {
  return add([pos(0, 0), layer(layerName), z(zIndex), { draw: fn }]);
}

export function drawArc(p, r, start, end, width, col, op = 1, ry = r) {
  const pts = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const a = ((start + ((end - start) * i) / steps) * Math.PI) / 180;
    pts.push(vec2(p.x + Math.cos(a) * r, p.y + Math.sin(a) * ry));
  }
  drawLines({ pts, width, color: col, opacity: op });
}

export function lerpN(a, b, t) {
  return a + (b - a) * t;
}

export function glow(p, r, col, strength = 0.25, rings = 5) {
  for (let i = rings; i >= 1; i--) {
    drawCircle({ pos: p, radius: r * (1 + i * 0.35), color: col, opacity: (strength / rings) * (rings - i + 1) * 0.5 });
  }
}

export function drawCloud(x, y, s, col, shade, op) {
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
export function drawFishShape(len, body, fin, t = time(), opts = {}) {
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

export function drawCoin(p, r = 8) {
  drawCircle({ pos: p.add(0, 1.5), radius: r, color: C.goldText });
  drawCircle({ pos: p, radius: r, color: C.gold, outline: { width: 1.5, color: C.goldText } });
  drawCircle({ pos: p, radius: r * 0.62, color: C.goldLight, opacity: 0.6 });
  drawRect({ pos: p, width: r * 0.25, height: r * 0.9, anchor: "center", color: C.goldText, opacity: 0.7 });
  drawCircle({ pos: p.add(-r * 0.35, -r * 0.35), radius: r * 0.18, color: rgb(255, 255, 255), opacity: 0.9 });
}

export function drawPanel(x, y, w, h, opts = {}) {
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

export function drawSparkle(p, s, col, op = 1) {
  drawPolygon({
    pts: [vec2(0, -s), vec2(s * 0.22, -s * 0.22), vec2(s, 0), vec2(s * 0.22, s * 0.22), vec2(0, s), vec2(-s * 0.22, s * 0.22), vec2(-s, 0), vec2(-s * 0.22, -s * 0.22)],
    pos: p,
    color: col,
    opacity: op,
    triangulate: true,
  });
}

// ---------- day/night ----------
export function skyPhase() {
  return ((time() % DAY_NIGHT_CYCLE) / DAY_NIGHT_CYCLE) * Math.PI * 2;
}
export function nightAmount() {
  return (1 - Math.cos(skyPhase())) / 2;
}
export function duskAmount() {
  const n = nightAmount();
  return Math.pow(1 - Math.abs(2 * n - 1), 2);
}

// Precomputed scenery so it stays stable between frames.
export function ridge(seed, count, base, amp) {
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
export const FAR_RIDGE = ridge(1.3, 40, SKY_H, 46);
export const NEAR_RIDGE = ridge(4.1, 30, SKY_H, 24).map((p) => (p.x > 240 && p.x < 520 ? vec2(p.x, SKY_H - 2) : p));
export const STARS = Array.from({ length: 90 }, () => ({
  x: rand(0, W),
  y: rand(0, SKY_H - 40) ** 1.15 / (SKY_H - 40) ** 0.15,
  r: rand(0.6, 1.8),
  tw: rand(0, Math.PI * 2),
  sp: rand(1.5, 4),
}));

export function addEnvironment(withFog = true, opts = {}) {
  weather.rain = weather.target = opts.rain ?? 0;
  weather.flash = 0;
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
    // shifted a quarter turn so the sun peaks at midday and sets at dusk
    const phase = (skyPhase() + Math.PI / 2) % (Math.PI * 2);
    const n = nightAmount();
    const dusk = duskAmount();
    const r = weather.rain;
    const top = C.daySkyTop.lerp(C.nightSkyTop, n).lerp(C.rainSkyTop.lerp(C.nightSkyTop, n), r * 0.75);
    const mid = C.daySky.lerp(C.nightSky, n).lerp(C.rainSkyLow.lerp(C.nightSky, n), r * 0.7);
    const low = C.daySkyLow.lerp(C.nightSkyLow, n).lerp(C.duskGlow, dusk * 0.8 * (1 - r)).lerp(C.rainSkyLow.lerp(C.nightSkyLow, n), r * 0.6);

    drawRect({ pos: vec2(0, 0), width: W, height: SKY_H * 0.55, gradient: [top, mid] });
    drawRect({ pos: vec2(0, SKY_H * 0.55 - 1), width: W, height: SKY_H * 0.45 + 1, gradient: [mid, low] });

    // stars
    const starOp = Math.max(0, (n - 0.45) / 0.55) * (1 - r);
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
    const bop = (0.15 + 0.85 * Math.sin(t * Math.PI)) * (1 - r * 0.85);
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
    const cloudCol = C.cloud.lerp(C.cloudNight, n).lerp(C.duskGlow, dusk * 0.35).lerp(C.rainCloud.lerp(C.cloudNight, n), r);
    const cloudShade = C.cloudShade.lerp(C.nightSkyTop, n * 0.8).lerp(C.stallRoof, dusk * 0.3).lerp(C.rainCloudShade.lerp(C.nightSkyTop, n), r);
    for (const c of clouds) {
      c.x += c.sp * dt();
      if (c.x > W + 120) c.x = -120;
      drawCloud(c.x, c.y, c.s * (1 + r * 0.5), cloudCol, cloudShade, 0.9);
    }
    // heavy storm clouds roll in along the top when it rains
    if (r > 0.01) {
      for (let i = 0; i < 4; i++) {
        const x = ((i * 240 + time() * 14) % (W + 240)) - 120;
        drawCloud(x, 30 + (i % 2) * 14, 1.5, cloudCol.lerp(cloudShade, 0.4), cloudShade, r * 0.95);
      }
    }

    // birds (day only)
    const birdOp = Math.max(0, 1 - n * 1.8) * (1 - r);
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
    // shifted a quarter turn so the sun peaks at midday and sets at dusk
    const phase = (skyPhase() + Math.PI / 2) % (Math.PI * 2);
    const n = nightAmount();
    const dusk = duskAmount();
    const r = weather.rain;
    const top = C.daySea.lerp(C.nightSea, n).lerp(C.duskGlow, dusk * 0.3).lerp(C.rainSea.lerp(C.nightSea, n), r * 0.6);
    const deep = C.daySeaDeep.lerp(C.nightSeaDeep, n).lerp(C.nightSea, r * 0.4);
    drawRect({ pos: vec2(0, SKY_H), width: W, height: H - SKY_H, gradient: [top, deep] });

    // horizon shimmer line
    drawRect({ pos: vec2(0, SKY_H), width: W, height: 2, color: C.seaFoam, opacity: 0.35 - n * 0.15 });

    // reflection of the sun / moon
    const isDayHalf = phase < Math.PI;
    const t = isDayHalf ? phase / Math.PI : (phase - Math.PI) / Math.PI;
    const bx = 80 + t * (W - 160);
    const bop = Math.sin(t * Math.PI) * (1 - r * 0.9);
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
  addRain();
}

// Every so often a little fish leaps out of the water in the distance.
export function addJumpingFish() {
  let jump = null;
  let nextJump = time() + rand(2, 5);
  const splashes = [];
  drawer(() => {
    if (!jump && time() > nextJump) {
      const x = rand(60, W - 60);
      jump = { x, y: rand(372, 410), t: 0, dir: chance(0.5) ? 1 : -1, len: rand(12, 18), fish: FISH_SPECIES[randi(0, 9)] };
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

export function pulse(obj, speed = 3) {
  obj.onUpdate(() => {
    obj.opacity = 0.6 + Math.sin(time() * speed) * 0.4;
  });
}

export function floatingText(msg, col, atPos) {
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
export function burst(p, col, count = 10, spread = 80) {
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
export function drawCharacter(pose) {
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
  const baseAngle = pose.fishing ? -28 : -58 - (pose.charge || 0) * 34;
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

export function drawBobber(p, legend, biting) {
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


// ---------- pier, props and tackle shop (static scenery for the game scene) ----------
export function addPierScenery() {
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
    drawFishShape(14, FISH_SPECIES[4].col, FISH_SPECIES[4].fin, 0);
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
      drawFishShape(11, FISH_SPECIES[0].col, FISH_SPECIES[0].fin, 0);
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
    { dx: -26, f: FISH_SPECIES[0], ph: 0 },
    { dx: 0, f: FISH_SPECIES[6], ph: 1.3 },
    { dx: 26, f: FISH_SPECIES[4], ph: 2.1 },
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
      drawLine({ p1: vec2(x0 + 12 + i * 4, bottom - 32), p2: vec2(x0 + 18 + i * 7, bottom - 84), width: 2, color: RODS[i + 2].tint });
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
}

// ---------- rain ----------
// Rain streaks are drawn once into two screen-sized textures (near + far) and
// scrolled, so a downpour costs a handful of sprite draws instead of hundreds
// of individual lines.
function makeRainLayer(name, count, len, width, alpha) {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  g.strokeStyle = `rgba(214, 226, 240, ${alpha})`;
  g.lineWidth = width;
  g.lineCap = "round";
  g.beginPath();
  for (let i = 0; i < count; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const l = len * (0.7 + Math.random() * 0.6);
    // draw wrapped copies so the texture tiles seamlessly
    for (const [ox, oy] of [[0, 0], [-W, 0], [0, -H], [-W, -H], [W, 0], [0, H]]) {
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox - l * 0.18, y + oy - l);
    }
  }
  g.stroke();
  loadSprite(name, cv);
}
makeRainLayer("rainFar", 140, 11, 1, 0.45);
makeRainLayer("rainNear", 70, 18, 1.6, 0.6);

function drawRainLayer(name, speed, op) {
  // scroll down (and slightly right) with wrap-around
  const ox = ((time() * speed * 0.18) % W + W) % W;
  const oy = ((time() * speed) % H + H) % H;
  for (const dx of [ox - W, ox]) {
    for (const dy of [oy - H, oy]) {
      drawSprite({ sprite: name, pos: vec2(dx, dy), opacity: op });
    }
  }
}

// Falling rain, splashes and the odd lightning flash. Draws nothing when it's dry.
export function addRain() {
  const splashes = [];
  let bolt = null;
  let splashDebt = 0;
  drawer(() => {
    const r = weather.rain;
    // lightning only in a heavy storm
    if (r > 0.8 && chance(dt() * 0.06)) {
      weather.flash = 1;
      const x = rand(120, W - 120);
      const pts = [vec2(x, 0)];
      let y = 0;
      while (y < SKY_H - 30) {
        y += rand(20, 45);
        pts.push(vec2(pts[pts.length - 1].x + rand(-22, 22), y));
      }
      bolt = { pts, life: 1 };
      shake(3);
    }
    if (weather.flash > 0) {
      drawRect({ pos: vec2(0, 0), width: W, height: H, color: C.flash, opacity: weather.flash * 0.45 });
      weather.flash = Math.max(0, weather.flash - dt() * 2.5);
    }
    if (bolt) {
      drawLines({ pts: bolt.pts, width: 6, color: C.flash, opacity: bolt.life * 0.35 });
      drawLines({ pts: bolt.pts, width: 2, color: C.flash, opacity: bolt.life });
      bolt.life -= dt() * 3;
      if (bolt.life <= 0) bolt = null;
    }
    if (r <= 0.01 && splashes.length === 0) return;

    if (r > 0.01) {
      drawRainLayer("rainFar", 420, Math.min(1, r * 1.4));
      if (r > 0.35) drawRainLayer("rainNear", 640, (r - 0.35) / 0.65);
    }

    // a few splash ripples on the water / droplets on the deck
    splashDebt += dt() * 45 * r;
    while (splashDebt >= 1 && splashes.length < 30) {
      splashDebt -= 1;
      const x = rand(0, W);
      const onDeck = chance(0.3) && x > PIER_X_MIN - 30 && x < PIER_X_MAX + 30;
      splashes.push({ x, y: onDeck ? PIER_Y + rand(0, 3) : rand(SKY_H + 6, H), deck: onDeck, k: 0 });
    }
    splashDebt = Math.min(splashDebt, 1);
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.k += dt() * 3;
      if (s.k >= 1) {
        splashes.splice(i, 1);
        continue;
      }
      if (s.deck) {
        drawCircle({ pos: vec2(s.x, s.y - s.k * 5), radius: 1.3, color: C.rain, opacity: 1 - s.k });
      } else {
        const sc = 0.5 + ((s.y - SKY_H) / (H - SKY_H)) * 0.8;
        drawEllipse({ pos: vec2(s.x, s.y), radiusX: (2 + s.k * 7) * sc, radiusY: (0.8 + s.k * 2) * sc, color: C.rain, opacity: (1 - s.k) * 0.35 });
      }
    }
  }, "fx", -5);
}

// ---------- tackle ----------
export function drawLure(p, legend, biting) {
  if (legend && biting) glow(p, 8, C.gold, 0.9, 5);
  drawEllipse({ pos: p.add(0, 6), radiusX: 7, radiusY: 2, color: C.seaFoam, opacity: 0.3 });
  pushTransform();
  pushTranslate(p);
  pushRotate(-20 + Math.sin(time() * 6) * 12);
  drawEllipse({ pos: vec2(0, 0), radiusX: 8, radiusY: 4, color: rgb(214, 220, 236), outline: { width: 1.2, color: rgb(120, 126, 150) } });
  drawEllipse({ pos: vec2(1, 0), radiusX: 4, radiusY: 2, color: legend && biting ? C.gold : C.bobber });
  drawCircle({ pos: vec2(-3, -1.5), radius: 1.2, color: rgb(255, 255, 255) });
  drawArc(vec2(10, 3), 2.5, -90, 150, 1.2, rgb(120, 126, 150));
  popTransform();
  drawSparkle(p.add(-5, -6), 2 + Math.sin(time() * 8) * 1.2, rgb(255, 255, 255), 0.9);
}

export function drawDrop(p, s = 1, col = C.fishBlue) {
  drawCircle({ pos: p.add(0, 2 * s), radius: 4 * s, color: col });
  drawTriangle({ p1: p.add(-3.6 * s, 0.6 * s), p2: p.add(3.6 * s, 0.6 * s), p3: p.add(0, -6 * s), color: col });
  drawCircle({ pos: p.add(-1.4 * s, 2 * s), radius: 1 * s, color: rgb(255, 255, 255), opacity: 0.8 });
}

export function drawStatBar(x, y, w, k, col) {
  drawRect({ pos: vec2(x, y), width: w, height: 8, radius: 4, color: C.panelOutline, opacity: 0.45 });
  drawRect({ pos: vec2(x, y), width: Math.max(8, w * Math.min(1, k)), height: 8, radius: 4, color: col });
}

export function drawPips(x, y, filled, total, col, r = 4, gap = 11) {
  for (let i = 0; i < total; i++) {
    drawCircle({ pos: vec2(x + i * gap, y), radius: r, color: i < filled ? col : C.panelBg, outline: { width: 1.5, color: i < filled ? col.darken(40) : C.panelOutline } });
  }
}

// ---------- story illustrations (drawn centred on c, roughly 300x150) ----------
export function drawIllustration(kind, c) {
  const t = time();
  const frame = () => {
    drawRect({ pos: c, width: 300, height: 150, radius: 12, anchor: "center", color: rgb(255, 255, 255), opacity: 0.5, outline: { width: 2, color: C.panelOutline } });
  };
  const water = (col1, col2) => {
    drawRect({ pos: c.add(-150, -75), width: 300, height: 150, gradient: [col1, col2] });
  };
  const rainLines = (op) => {
    for (let i = 0; i < 26; i++) {
      const x = c.x - 145 + ((i * 37 + t * 160) % 290);
      const y = c.y - 70 + ((i * 53 + t * 380) % 130);
      drawLine({ p1: vec2(x, y), p2: vec2(x - 2, y - 10), width: 1.2, color: C.rain, opacity: op });
    }
  };

  if (kind === "letter") {
    frame();
    const p = c.add(0, Math.sin(t * 2) * 3);
    pushTransform();
    pushTranslate(p);
    pushRotate(-4);
    drawRect({ pos: vec2(3, 5), width: 150, height: 96, radius: 6, anchor: "center", color: C.shadow, opacity: 0.15 });
    drawRect({ pos: vec2(0, 0), width: 150, height: 96, radius: 6, anchor: "center", color: C.signBoard, outline: { width: 2, color: C.panelOutline } });
    drawLines({ pts: [vec2(-73, -46), vec2(0, 8), vec2(73, -46)], width: 2, color: C.panelOutline });
    drawLine({ p1: vec2(-73, 46), p2: vec2(-18, 0), width: 1.5, color: C.panelOutline, opacity: 0.7 });
    drawLine({ p1: vec2(73, 46), p2: vec2(18, 0), width: 1.5, color: C.panelOutline, opacity: 0.7 });
    // wax seal heart
    drawCircle({ pos: vec2(0, 8), radius: 13, color: C.stallRoof, outline: { width: 1.5, color: C.stallOutline } });
    drawCircle({ pos: vec2(-3, 5), radius: 3.5, color: C.stallOutline });
    drawCircle({ pos: vec2(3, 5), radius: 3.5, color: C.stallOutline });
    drawTriangle({ p1: vec2(-6.4, 6.5), p2: vec2(6.4, 6.5), p3: vec2(0, 13), color: C.stallOutline });
    // fish doodle "stamp"
    drawRect({ pos: vec2(50, -28), width: 30, height: 24, anchor: "center", color: rgb(255, 255, 255), outline: { width: 1.2, color: C.panelOutline } });
    pushTranslate(vec2(50, -28));
    drawFishShape(20, C.fishBlue, C.playerScarfDark, t);
    popTransform();
    drawSparkle(c.add(100, -45), 5 + Math.sin(t * 4) * 2, C.gold);
    drawSparkle(c.add(-110, 40), 4 + Math.sin(t * 4 + 2) * 2, C.gold);
  } else if (kind === "rod") {
    water(C.daySky, C.daySea);
    drawRect({ pos: c.add(-150, 10), width: 300, height: 65, radius: [0, 0, 12, 12], color: C.daySea });
    const base = c.add(-90, 60);
    const tip = c.add(40, -50);
    drawLine({ p1: base, p2: tip, width: 5, color: C.rod });
    drawLine({ p1: base, p2: base.lerp(tip, 0.18), width: 8, color: C.rodGrip });
    for (const k of [0.4, 0.6, 0.8]) {
      const lp = base.lerp(tip, k);
      drawEllipse({ pos: lp.add(6, -2), radiusX: 6, radiusY: 3, color: C.playerScarf, opacity: 0.9 });
    }
    const sway = Math.sin(t * 1.5) * 6;
    drawLines({ pts: [tip, tip.add(20 + sway * 0.5, 30), tip.add(34 + sway, 58)], width: 1.2, color: C.line });
    drawBobber(tip.add(34 + sway, 64), false, false);
    drawArc(tip.add(34 + sway, 70), 14 + Math.sin(t * 2) * 3, 200, 340, 1.2, C.seaFoam, 0.8, 4);
  } else if (kind === "legend") {
    water(C.nightSky, C.nightSeaDeep);
    const p = c.add(Math.sin(t * 0.8) * 60, 20 + Math.sin(t * 1.6) * 6);
    glow(p, 28, C.gold, 0.8, 6);
    pushTransform();
    pushTranslate(p);
    pushScale(vec2(Math.cos(t * 0.8) > 0 ? 1 : -1, 1));
    drawFishShape(80, C.gold, rgb(236, 160, 70), t);
    popTransform();
    rainLines(0.6);
  } else if (kind === "pier") {
    water(C.daySky, C.daySea);
    drawRect({ pos: c.add(-150, 40), width: 300, height: 14, color: C.pierWood, outline: { width: 2, color: C.pierOutline } });
    for (const x of [-120, -40, 40, 120]) drawRect({ pos: c.add(x - 4, 54), width: 8, height: 21, color: C.pierPost });
    pushTransform();
    pushTranslate(c.add(-20, 40));
    pushScale(vec2(1.3));
    drawCharacter({ walk: false, fishing: true, biting: false, blink: Math.sin(t * 1.3) > 0.97, rodTint: C.rod });
    popTransform();
    drawSparkle(c.add(95, -40), 6 + Math.sin(t * 3) * 2, C.gold);
  } else if (kind === "taut") {
    water(C.rainSkyTop, C.nightSea);
    const bp = c.add(40, 20 + Math.sin(t * 30) * 2);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.8 + i / 3) % 1;
      drawEllipse({ pos: bp.add(0, 6), radiusX: 10 + k * 60, radiusY: 3 + k * 12, fill: false, outline: { width: 1.5, color: C.gold }, color: C.gold, opacity: 1 - k });
    }
    drawLine({ p1: c.add(-150, -75), p2: bp.add(0, -12), width: 1.5, color: C.line });
    drawBobber(bp, true, true);
    rainLines(0.7);
  } else if (kind === "rise") {
    water(C.rainSkyTop, C.nightSea);
    const k = (t * 0.35) % 1;
    const p = c.add(0, 60 - Math.sin(k * Math.PI) * 60);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 360 + t * 20;
      drawPolygon({ pts: [p, p.add(Vec2.fromAngle(a - 5).scale(160)), p.add(Vec2.fromAngle(a + 5).scale(160))], color: C.goldLight, opacity: 0.12 });
    }
    glow(p, 30, C.gold, 0.8, 6);
    pushTransform();
    pushTranslate(p);
    pushRotate(-70 + k * 60);
    drawFishShape(90, C.gold, rgb(236, 160, 70), t);
    popTransform();
    drawRect({ pos: c.add(-150, 50), width: 300, height: 25, radius: [0, 0, 12, 12], color: C.nightSea, opacity: 0.85 });
    rainLines(0.6);
  } else if (kind === "eyes") {
    water(C.rainSkyLow, C.rainSea);
    const p = c.add(-20, 10 + Math.sin(t * 1.5) * 4);
    glow(p.add(40, 0), 50, C.gold, 0.4, 5);
    pushTransform();
    pushTranslate(p);
    drawFishShape(260, C.gold, rgb(236, 160, 70), t * 0.3, { outline: { width: 2.5, color: C.goldText } });
    popTransform();
    // a slow blink
    if (Math.sin(t * 0.9) > 0.96) drawRect({ pos: p.add(78, -11), width: 22, height: 22, radius: 11, anchor: "center", color: C.gold });
    rainLines(0.5);
  } else if (kind === "choice") {
    water(C.rainSkyLow, C.rainSea);
    drawRect({ pos: c.add(-150, 30), width: 150, height: 12, color: C.pierWood, outline: { width: 2, color: C.pierOutline } });
    pushTransform();
    pushTranslate(c.add(-70, 30));
    pushScale(vec2(1.25));
    drawCharacter({ walk: false, fishing: false, biting: false, blink: Math.sin(t * 1.3) > 0.97, rodTint: RODS[RODS.length - 1].tint });
    popTransform();
    const p = c.add(70, 40 + Math.sin(t * 2) * 5);
    glow(p, 26, C.gold, 0.6, 5);
    pushTransform();
    pushTranslate(p);
    pushScale(vec2(-1, 1));
    pushRotate(-25);
    drawFishShape(80, C.gold, rgb(236, 160, 70), t);
    popTransform();
    drawRect({ pos: c.add(0, 52), width: 150, height: 23, radius: [0, 0, 12, 0], color: C.rainSea, opacity: 0.8 });
    rainLines(0.45);
  }
}

