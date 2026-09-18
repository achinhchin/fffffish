import {
  W,
  H,
  PIER_Y,
  PIER_X_MIN,
  PIER_X_MAX,
  SHOP_X,
  FISH_X,
  ZONE_RANGE,
  PLAYER_SPEED,
  BOBBER_X,
  BOBBER_Y,
  BITE_WAIT,
  LEGEND_WINDOW,
  COOLDOWN,
  C,
  RODS,
  TECHNIQUES,
  SKILLS,
  SKILL_MAX,
  FISH_SPECIES,
  FISH_WEIGHTS,
  TIER_NAMES,
  xpToNext,
  state,
  weather,
} from "./data.js";
import {
  addEnvironment,
  addPierScenery,
  drawer,
  drawCharacter,
  drawBobber,
  drawLure,
  drawFishShape,
  drawCoin,
  drawPanel,
  drawSparkle,
  drawDrop,
  drawStatBar,
  drawPips,
  floatingText,
  burst,
  nightAmount,
  lerpN,
} from "./art.js";
import { keyText } from "./touch.js";

// ---------- fishing math ----------
// Combined numbers from the equipped rod, skills and weather.
function stats() {
  const rod = RODS[state.rodIndex];
  const s = state.skills;
  return {
    rod,
    window: rod.window * (1 + 0.1 * s.reflex),
    power: rod.power * (1 + 0.12 * s.strength),
    luck: rod.luck + (rod.rainLuck || 0) * weather.rain + 0.1 * s.luck,
    coinMult: 1 + 0.06 * s.luck,
    waitMult: (1 - 0.1 * s.patience) * (1 - 0.35 * weather.rain),
  };
}

function speciesAvailable(sp) {
  if (sp.cond === "night") return nightAmount() > 0.55;
  if (sp.cond === "rain") return weather.rain > 0.3;
  return true;
}

function weightedPick(items, weightOf) {
  const total = items.reduce((a, it) => a + weightOf(it), 0);
  let r = rand(0, total);
  for (const it of items) {
    if (r < weightOf(it)) return it;
    r -= weightOf(it);
  }
  return items[items.length - 1];
}

// Luck bends the tier odds toward rarer fish; the species then sets size & value.
function rollCatch(luck, valueMult) {
  const tier = weightedPick(RODS[state.rodIndex].tiers, (t) => FISH_WEIGHTS[t] * (1 + luck * t * 0.9));
  const pool = FISH_SPECIES.filter((sp) => sp.tier === tier && speciesAvailable(sp));
  // weather/night fish are the exciting ones, so they get a bit more weight when around
  const species = weightedPick(pool, (sp) => (sp.cond ? 2 : 1));
  const [lo, hi] = species.size;
  const size = Math.round(rand(lo, hi));
  const k = (size - lo) / (hi - lo);
  const value = Math.max(1, Math.round(species.base * (0.7 + 0.6 * k) * valueMult));
  return { species, size, value, tier };
}

const TUG_R0 = 46;
const TUG_TARGET = 12;

scene("game", () => {
  addEnvironment(true);
  addPierScenery();
  state.gameStartTime = time();

  // ---------- weather ----------
  weather.nextChange = time() + rand(15, 30);
  onUpdate(() => {
    if (time() > weather.nextChange) {
      if (weather.target === 0) {
        if (chance(0.55)) {
          weather.target = rand(0.55, 1);
          weather.nextChange = time() + rand(20, 40);
          floatingText("It's starting to rain...", C.hudText, vec2(W / 2, 140));
        } else {
          weather.nextChange = time() + rand(10, 20);
        }
      } else {
        weather.target = 0;
        weather.nextChange = time() + rand(30, 55);
        floatingText("The rain is clearing up", C.hudText, vec2(W / 2, 140));
      }
    }
    const d = weather.target - weather.rain;
    weather.rain += Math.sign(d) * Math.min(Math.abs(d), dt() * 0.25);
  });

  // ---------- state ----------
  let panel = null; // null | "shop" | "skills" | "journal"
  let sel = 0; // selected row in the open panel
  let denyAt = -10; // last time the shop refused a purchase
  let fishState = "idle"; // idle | charging | waiting | biting | reeling | tugging | cooldown
  let bobber = null;
  let isLegendBite = false;
  let biteDeadline = 0;
  let catchInfo = null;
  let chargeStart = 0;
  let reel = null;
  let tug = null;

  const tech = () => TECHNIQUES[state.technique];
  const lineOut = () => ["charging", "waiting", "biting", "reeling", "tugging"].includes(fishState);
  const hooked = () => ["biting", "reeling", "tugging"].includes(fishState);
  const chargePower = () => 0.5 - 0.5 * Math.cos((time() - chargeStart) * 3.2);

  // ---------- player ----------
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
          fishing: fishState === "waiting" || hooked(),
          biting: hooked(),
          charge: fishState === "charging" ? chargePower() : 0,
          blink: time() < this.blinkUntil,
          rodTint: RODS[state.rodIndex].tint,
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

  function walk(dir) {
    if (panel || lineOut()) return;
    const before = player.pos.x;
    player.pos.x = Math.max(PIER_X_MIN, Math.min(PIER_X_MAX, player.pos.x + dir * PLAYER_SPEED * dt()));
    if (player.pos.x !== before) player.walkTimer = 0.08;
    player.scale.x = dir;
  }
  onKeyDown(["left", "a"], () => walk(-1));
  onKeyDown(["right", "d"], () => walk(1));

  // bouncing arrow over the shop / fishing spot
  drawer(() => {
    if (panel || fishState !== "idle") return;
    for (const zx of [SHOP_X, FISH_X]) {
      if (!nearZone(player.pos.x, zx)) continue;
      const y = (zx === SHOP_X ? PIER_Y - 150 : PIER_Y - 104) + Math.sin(time() * 5) * 4;
      drawTriangle({ p1: vec2(zx - 7, y), p2: vec2(zx + 7, y), p3: vec2(zx, y + 9), color: C.gold, outline: { width: 1.5, color: C.goldText } });
    }
  }, "fx", 0);

  // ---------- casting ----------
  function clearBobber() {
    reel = null;
    tug = null;
    if (!bobber) return;
    const b = bobber;
    bobber = null;
    b.fadeOut(0.25).onEnd(() => destroy(b));
  }

  function startCast(power = 0) {
    fishState = "waiting";
    isLegendBite = false;
    catchInfo = null;
    player.scale.x = 1;
    const kind = tech().id;
    const castStart = time();
    const home =
      kind === "deep"
        ? vec2(BOBBER_X - 10 + power * 70, BOBBER_Y - power * 16)
        : kind === "lure"
          ? vec2(BOBBER_X + 12, BOBBER_Y - 2)
          : vec2(BOBBER_X, BOBBER_Y);
    const sc = kind === "deep" ? 1 - power * 0.35 : 1;

    const myBobber = add([
      pos(home),
      opacity(1),
      layer("world"),
      z(5),
      {
        castStart,
        home,
        kind,
        sc,
        rings: [],
        nextRing: 0,
        draw() {
          if (time() - castStart < 0.35) return; // still flying out
          const hot = bobber === myBobber && hooked();
          for (const r of this.rings) {
            drawEllipse({
              pos: vec2(0, 5 * sc),
              radiusX: (8 + r.k * 26) * sc,
              radiusY: (2 + r.k * 6) * sc,
              fill: false,
              outline: { width: 1.5, color: isLegendBite && hot ? C.gold : C.seaFoam },
              color: C.seaFoam,
              opacity: (1 - r.k) * 0.8 * this.opacity,
            });
          }
          pushTransform();
          pushScale(vec2(sc));
          if (kind === "lure") drawLure(vec2(0, 0), isLegendBite, hot);
          else drawBobber(vec2(0, 0), isLegendBite, hot);
          popTransform();
        },
      },
    ]);
    bobber = myBobber;

    myBobber.onUpdate(() => {
      if (bobber !== myBobber) return;
      const t = time();
      if (fishState === "waiting") myBobber.pos = home.add(0, Math.sin(t * 5) * 3 * sc);
      else if (fishState === "biting") myBobber.pos = home.add(0, 10 * sc);
      else if (fishState === "reeling" && reel) myBobber.pos = home.add((reel.fish - 0.5) * 36, 8 + Math.sin(t * 25) * 2);
      else if (fishState === "tugging" && tug) myBobber.pos = home.add(Math.sin(t * 20) * 1.5, (time() < tug.dipUntil ? 12 : 5) * sc);
      if (time() > myBobber.nextRing) {
        myBobber.rings.push({ k: 0 });
        myBobber.nextRing = time() + (hooked() ? 0.15 : 0.9);
      }
      for (const r of myBobber.rings) r.k += dt() * 0.9;
      myBobber.rings = myBobber.rings.filter((r) => r.k < 1);
    });

    // splash when it lands
    wait(0.35, () => {
      if (bobber === myBobber) burst(home, C.seaFoam, 8, 60);
    });

    const delay = rand(BITE_WAIT[0], BITE_WAIT[1]) * stats().waitMult * (kind === "deep" ? 1.4 + power : 1);
    wait(0.35 + delay, () => {
      if (fishState !== "waiting" || bobber !== myBobber) return;
      onBite(myBobber, power);
    });
  }

  function onBite(myBobber, power) {
    const s = stats();
    const t = tech();
    const reflexBoost = 1 + 0.1 * state.skills.reflex;
    const legendChance = s.rod.legendChance ? s.rod.legendChance + (t.id === "deep" ? 0.15 * power : 0) + 0.1 * weather.rain : 0;
    isLegendBite = chance(legendChance);
    catchInfo = isLegendBite
      ? { legend: true, tier: 4 }
      : rollCatch(s.luck + t.luck + (t.id === "deep" ? power * 0.8 : 0), t.valueMult * s.coinMult);

    burst(myBobber.pos, isLegendBite ? C.gold : C.seaFoam, isLegendBite ? 16 : 8, 70);
    if (isLegendBite) shake(4);
    showBiteMark(myBobber.pos);

    if (t.id === "deep") {
      startTug();
    } else {
      fishState = "biting";
      biteDeadline = time() + (isLegendBite ? LEGEND_WINDOW * reflexBoost : s.window);
    }
  }

  function showBiteMark(p) {
    const legend = isLegendBite;
    const mark = add([
      text(legend ? "!!" : "!", { size: legend ? 30 : 24 }),
      pos(p.x, p.y - 34),
      anchor("center"),
      color(legend ? C.goldText : C.badText),
      opacity(1),
      scale(1),
      layer("fx"),
      z(20),
      {
        draw() {
          drawCircle({ pos: vec2(0, 1), radius: 17, color: rgb(255, 255, 255), opacity: this.opacity * 0.9, outline: { width: 2, color: legend ? C.gold : C.stallRoof } });
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

  // ---------- lure: reel minigame ----------
  function startReel() {
    fishState = "reeling";
    const s = stats();
    const d = catchInfo.tier;
    reel = {
      fish: 0.5,
      target: rand(0.2, 0.8),
      nextTarget: 0,
      zone: 0.5,
      vel: 0,
      progress: 0.3,
      inside: true,
      d,
      zoneW: Math.min(0.42, 0.14 + 0.06 * s.power) * (catchInfo.legend ? 0.8 : 1),
      gain: 0.2 + 0.07 * s.power,
      loss: 0.14 + d * 0.035,
    };
  }

  function updateReel() {
    const r = reel;
    if (time() > r.nextTarget) {
      r.target = rand(0.05, 0.95);
      r.nextTarget = time() + rand(0.5, 1.3) * (1 - r.d * 0.12);
    }
    const sp = (0.2 + r.d * 0.18) * dt();
    r.fish += Math.max(-sp, Math.min(sp, r.target - r.fish));
    r.vel += (isKeyDown("space") ? 2.4 : -2.0) * dt();
    r.vel *= Math.exp(-1.5 * dt());
    r.zone += r.vel * dt();
    const half = r.zoneW / 2;
    if (r.zone < half) {
      r.zone = half;
      r.vel = Math.abs(r.vel) * 0.3;
    }
    if (r.zone > 1 - half) {
      r.zone = 1 - half;
      r.vel = -Math.abs(r.vel) * 0.3;
    }
    r.inside = Math.abs(r.fish - r.zone) < half;
    r.progress += (r.inside ? r.gain : -r.loss) * dt();
    if (r.progress >= 1) succeedCatch();
    else if (r.progress <= 0) failCast(catchInfo.legend ? "The legend broke free..." : "It broke free...");
  }

  // ---------- deep line: tug timing ----------
  function startTug() {
    fishState = "tugging";
    const legend = catchInfo.legend;
    tug = {
      count: 0,
      needed: 3 + (catchInfo.tier >= 3 ? 1 : 0) + (legend ? 2 : 0),
      dur: Math.max(0.5, 1.1 - catchInfo.tier * 0.1 - (legend ? 0.25 : 0)),
      tol: 3 + 4 * stats().window,
      ringStart: time() + 0.35,
      dipUntil: 0,
    };
  }
  const tugRadius = () => TUG_R0 * (1 - (time() - tug.ringStart) / tug.dur);

  function attemptTug() {
    if (time() < tug.ringStart) return; // between tugs
    if (Math.abs(tugRadius() - TUG_TARGET) <= tug.tol) {
      tug.count++;
      tug.dipUntil = time() + 0.2;
      burst(bobber.pos, catchInfo.legend ? C.gold : C.seaFoam, 6, 50);
      if (tug.count >= tug.needed) succeedCatch();
      else tug.ringStart = time() + 0.4;
    } else {
      failCast("The line snapped!");
    }
  }

  // ---------- results ----------
  function failCast(msg) {
    fishState = "cooldown";
    floatingText(msg, C.badText, vec2(player.pos.x, PIER_Y - 100));
    clearBobber();
    wait(COOLDOWN, () => {
      fishState = "idle";
    });
  }

  // A caught fish arcs from the water up into the player's hands.
  function flyingCatch(species, tier) {
    const from = bobber ? bobber.pos.clone() : vec2(BOBBER_X, BOBBER_Y);
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
          drawFishShape(18 + tier * 5, species.col, species.fin, age * 3, { outline: { width: 1, color: C.playerOutline } });
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

  function addXp(amount) {
    state.xp += amount;
    let delay = 0.9;
    while (state.xp >= xpToNext(state.level)) {
      state.xp -= xpToNext(state.level);
      state.level++;
      state.skillPoints++;
      const lvl = state.level;
      wait(delay, () => {
        floatingText(`Level ${lvl}! +1 skill point (K)`, C.goldText, vec2(player.pos.x, PIER_Y - 140));
        burst(vec2(player.pos.x, PIER_Y - 60), C.gold, 14, 90);
      });
      delay += 0.9;
      const unlocked = TECHNIQUES.find((t) => t.unlock === lvl);
      if (unlocked) {
        wait(delay, () => floatingText(`New technique: ${unlocked.name}! (Q / E)`, C.goodText, vec2(player.pos.x, PIER_Y - 140)));
        delay += 0.9;
      }
    }
  }

  function succeedCatch() {
    fishState = "cooldown";
    const info = catchInfo;
    if (info.legend) {
      clearBobber();
      go("ending", { elapsed: time() - state.gameStartTime });
      return;
    }
    const name = info.species.name;
    const prevBest = state.journal[name];
    state.journal[name] = Math.max(prevBest ?? 0, info.size);
    state.money += info.value;
    state.caughtCount++;

    burst(bobber ? bobber.pos : vec2(BOBBER_X, BOBBER_Y), C.seaFoam, 10, 80);
    flyingCatch(info.species, info.tier);
    floatingText(`+${info.value} ${info.species.emoji} ${name} ${info.size}cm`, C.goodText, vec2(player.pos.x, PIER_Y - 100));
    if (prevBest === undefined) {
      wait(0.5, () => floatingText("New species! (J)", C.goldText, vec2(player.pos.x, PIER_Y - 125)));
    } else if (info.size > prevBest) {
      wait(0.5, () => floatingText("New size record!", C.goldText, vec2(player.pos.x, PIER_Y - 125)));
    }
    addXp(info.value + info.tier * 4);
    clearBobber();
    wait(COOLDOWN, () => {
      fishState = "idle";
    });
  }

  // ---------- techniques ----------
  function selectTech(i) {
    if (panel || lineOut() || i === state.technique) return;
    const t = TECHNIQUES[i];
    if (t.unlock > state.level) {
      floatingText(`${t.name} unlocks at Lv ${t.unlock}`, C.badText, vec2(player.pos.x, PIER_Y - 100));
      return;
    }
    state.technique = i;
    floatingText(`Technique: ${t.name}`, C.hudText, vec2(player.pos.x, PIER_Y - 100));
  }
  function cycleTech(dir) {
    const unlocked = TECHNIQUES.map((_, i) => i).filter((i) => TECHNIQUES[i].unlock <= state.level);
    if (unlocked.length < 2) {
      selectTech((state.technique + dir + TECHNIQUES.length) % TECHNIQUES.length);
      return;
    }
    const idx = unlocked.indexOf(state.technique);
    selectTech(unlocked[(idx + dir + unlocked.length) % unlocked.length]);
  }
  onKeyPress("q", () => cycleTech(-1));
  onKeyPress("e", () => cycleTech(1));
  ["1", "2", "3"].forEach((k, i) => onKeyPress(k, () => selectTech(i)));

  // ---------- panels ----------
  function togglePanel(name) {
    if (lineOut()) return;
    panel = panel === name ? null : name;
    sel = name === "shop" ? state.rodIndex : 0;
  }
  onKeyPress("k", () => togglePanel("skills"));
  onKeyPress("j", () => togglePanel("journal"));
  onKeyPress("escape", () => {
    panel = null;
  });
  function moveSel(dir) {
    const n = panel === "shop" ? RODS.length : panel === "skills" ? SKILLS.length : 0;
    if (n) sel = (sel + dir + n) % n;
  }
  onKeyPress(["up", "w"], () => moveSel(-1));
  onKeyPress(["down", "s"], () => moveSel(1));
  onKeyPress(["left", "right"], () => {
    if (panel === "shop") moveSel(isKeyDown("left") ? -1 : 1);
  });

  function shopAction() {
    const rod = RODS[sel];
    if (state.ownedRods.includes(sel)) {
      if (state.rodIndex !== sel) {
        state.rodIndex = sel;
        floatingText(`Equipped ${rod.name}`, C.hudText, vec2(player.pos.x, PIER_Y - 100));
      }
      return;
    }
    if (state.money >= rod.cost) {
      state.money -= rod.cost;
      state.ownedRods.push(sel);
      state.rodIndex = sel;
      burst(vec2(player.pos.x, PIER_Y - 60), C.gold, 14, 90);
      floatingText(`Bought ${rod.name}!`, C.goldText, vec2(player.pos.x, PIER_Y - 100));
    } else {
      denyAt = time();
    }
  }

  function spendPoint() {
    const sk = SKILLS[sel];
    if (state.skillPoints <= 0 || state.skills[sk.id] >= SKILL_MAX) {
      denyAt = time();
      return;
    }
    state.skillPoints--;
    state.skills[sk.id]++;
    burst(vec2(W / 2 - 60, 250 + sel * 40), C.gold, 8, 50);
  }

  // ---------- input ----------
  onKeyPress("space", () => {
    if (panel === "shop") return shopAction();
    if (panel === "skills") return spendPoint();
    if (panel === "journal") {
      panel = null;
      return;
    }
    if (fishState === "tugging") return attemptTug();
    if (fishState === "waiting") return failCast("Too early!");
    if (fishState === "biting") return tech().id === "lure" ? startReel() : succeedCatch();
    if (fishState !== "idle") return;
    if (nearZone(player.pos.x, SHOP_X)) {
      panel = "shop";
      sel = state.rodIndex;
      return;
    }
    if (nearZone(player.pos.x, FISH_X)) {
      if (tech().id === "deep") {
        fishState = "charging";
        chargeStart = time();
      } else {
        startCast();
      }
    }
  });
  onKeyRelease("space", () => {
    if (fishState === "charging") startCast(Math.max(0.05, chargePower()));
  });

  // ---------- fishing line, fish shadow, minigame overlays in the world ----------
  drawer(() => {
    if (fishState === "charging") {
      const k = chargePower();
      const p = vec2(player.pos.x, PIER_Y - 112);
      drawRect({ pos: p, width: 70, height: 14, radius: 7, anchor: "center", color: C.panelBg, opacity: 0.9, outline: { width: 2, color: C.panelOutline } });
      drawRect({ pos: p.add(-32, -4), width: 64 * k, height: 8, radius: 4, color: C.fishBlue.lerp(C.gold, k) });
      drawText({ text: "DEPTH", size: 10, pos: p.add(0, -16), anchor: "center", color: C.hudText });
      return;
    }
    if (!bobber || !(fishState === "waiting" || hooked())) return;
    const tip = vec2(player.pos.x + player.rodTip.x * player.scale.x, player.pos.y + player.rodTip.y);
    const target = bobber.pos.add(0, bobber.kind === "lure" ? -2 : -12 * bobber.sc);
    const k = Math.min(1, (time() - bobber.castStart) / 0.35);
    // tackle flying out
    const end = k < 1 ? tip.lerp(target, k).add(0, -Math.sin(k * Math.PI) * 60) : target;
    if (k < 1) {
      if (bobber.kind === "lure") drawLure(end, false, false);
      else drawBobber(end.add(0, 12), false, false);
    }
    const sag = hooked() ? 2 : 14;
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      pts.push(tip.lerp(end, u).add(0, Math.sin(u * Math.PI) * sag));
    }
    drawLines({ pts, width: 1, color: C.line, opacity: 0.85 });

    // shadow of a fish sniffing around below the tackle
    const home = bobber.home;
    const fp = hooked() ? bobber.pos.add(0, 10) : vec2(home.x + Math.cos(time() * 1.3) * 24, home.y + 22 + Math.sin(time() * 2.6) * 4);
    const big = isLegendBite || (catchInfo && catchInfo.tier >= 3);
    pushTransform();
    pushTranslate(fp);
    pushScale(vec2((-Math.sin(time() * 1.3) > 0 ? 1 : -1) * bobber.sc, 0.5 * bobber.sc));
    drawEllipse({ pos: vec2(0, 0), radiusX: big ? 26 : 13, radiusY: big ? 10 : 6, color: isLegendBite ? C.gold : C.fishShadow, opacity: 0.3 });
    popTransform();

    // deep line: shrinking timing ring
    if (fishState === "tugging" && tug && time() >= tug.ringStart) {
      const r = tugRadius();
      const good = Math.abs(r - TUG_TARGET) <= tug.tol;
      const c = bobber.pos;
      drawCircle({ pos: c, radius: TUG_TARGET + tug.tol, fill: false, color: C.gold, outline: { width: tug.tol * 2, color: C.goldLight }, opacity: 0.35 });
      drawCircle({ pos: c, radius: TUG_TARGET, fill: false, color: C.gold, outline: { width: 2, color: C.goldText } });
      if (r > 0) drawCircle({ pos: c, radius: r, fill: false, color: C.line, outline: { width: 3, color: good ? C.goodText : rgb(255, 255, 255) } });
    }
    if (fishState === "tugging" && tug) {
      const n = tug.needed;
      for (let i = 0; i < n; i++) {
        const p = bobber.pos.add((i - (n - 1) / 2) * 13, -62);
        drawCircle({ pos: p, radius: 5, color: i < tug.count ? C.gold : C.panelBg, outline: { width: 1.5, color: C.goldText } });
      }
    }
  }, "world", 9);

  // ---------- HUD ----------
  function pill(x, y, w, opts = {}) {
    drawRect({
      pos: vec2(x, y),
      width: w,
      height: 26,
      radius: 13,
      color: opts.bg ?? C.panelBg,
      opacity: 0.88,
      outline: { width: 2, color: opts.border ?? C.panelOutline },
    });
  }
  const tw = (str, size) => formatText({ text: str, size }).width;

  drawer(() => {
    // row 1: coins, name + level, rod
    const money = `${state.money}`;
    const moneyW = tw(money, 15) + 50;
    pill(12, 6, moneyW);
    drawCoin(vec2(32, 19), 8);
    drawText({ text: money, size: 15, pos: vec2(46, 19), anchor: "left", color: C.hudText });

    const nameStr = `${state.playerName}  Lv ${state.level}`;
    const nameX = 12 + moneyW + 8;
    const nameW = tw(nameStr, 14) + 30;
    pill(nameX, 6, nameW);
    drawText({ text: nameStr, size: 14, pos: vec2(nameX + 15, 17), anchor: "left", color: C.hudText });
    const xpK = state.xp / xpToNext(state.level);
    drawRect({ pos: vec2(nameX + 14, 25), width: nameW - 28, height: 3, radius: 1.5, color: C.panelOutline, opacity: 0.6 });
    drawRect({ pos: vec2(nameX + 14, 25), width: (nameW - 28) * xpK, height: 3, radius: 1.5, color: C.playerScarfDark });

    const rod = RODS[state.rodIndex];
    const rodW = tw(rod.name, 14) + 44;
    pill(W - 12 - rodW, 6, rodW);
    drawCircle({ pos: vec2(W - 12 - rodW + 16, 19), radius: 5, color: rod.tint, outline: { width: 1.5, color: rod.tint.darken(40) } });
    drawText({ text: rod.name, size: 14, pos: vec2(W - 26, 19), anchor: "right", color: C.hudText });

    // row 2: technique, skills, journal, weather
    const t = tech();
    const techStr = `Q < ${t.name} > E`;
    const techW = tw(techStr, 12) + 26;
    pill(12, 38, techW, { bg: C.goldLight, border: C.gold });
    drawText({ text: techStr, size: 12, pos: vec2(12 + techW / 2, 51), anchor: "center", color: C.hudText });

    const skStr = "K skills";
    const skX = 12 + techW + 8;
    const skW = tw(skStr, 12) + 26 + (state.skillPoints > 0 ? 18 : 0);
    pill(skX, 38, skW);
    drawText({ text: skStr, size: 12, pos: vec2(skX + 13, 51), anchor: "left", color: C.hudText });
    if (state.skillPoints > 0) {
      const bp = vec2(skX + skW - 16, 51);
      drawCircle({ pos: bp, radius: 8 + Math.sin(time() * 6) * 1, color: C.stallRoof });
      drawText({ text: `${state.skillPoints}`, size: 11, pos: bp, anchor: "center", color: rgb(255, 255, 255) });
    }

    const found = Object.keys(state.journal).length;
    const jStr = `J journal ${found}/${FISH_SPECIES.length}`;
    const jX = skX + skW + 8;
    const jW = tw(jStr, 12) + 26;
    pill(jX, 38, jW);
    drawText({ text: jStr, size: 12, pos: vec2(jX + 13, 51), anchor: "left", color: C.hudText });

    if (weather.rain > 0.05) {
      const storm = weather.rain > 0.8;
      const wStr = storm ? "storm" : "rain";
      const wW = tw(wStr, 12) + 40;
      pill(W - 12 - wW, 38, wW, { bg: rgb(226, 236, 248), border: C.fishBlue });
      drawDrop(vec2(W - 12 - wW + 16, 50), 1, C.fishBlue);
      drawText({ text: wStr, size: 12, pos: vec2(W - 25, 51), anchor: "right", color: C.hudText });
    }

    // bottom hint
    const hint = keyText(computeHint());
    if (hint) {
      const hw = Math.max(200, tw(hint, 13) + 40);
      const hot = hooked() || fishState === "charging";
      drawRect({
        pos: vec2(W / 2, H - 26),
        width: hw * (fishState === "biting" ? 1 + Math.sin(time() * 20) * 0.03 : 1),
        height: 28,
        radius: 14,
        anchor: "center",
        color: hot ? (isLegendBite ? C.goldLight : rgb(255, 225, 220)) : C.panelBg,
        opacity: 0.88,
        outline: { width: 2, color: hot ? (isLegendBite ? C.gold : C.stallRoof) : C.panelOutline },
      });
      drawText({ text: hint, size: 13, pos: vec2(W / 2, H - 26), anchor: "center", color: C.hudHint });
    }

    // lure reel bar
    if (fishState === "reeling" && reel) {
      const x0 = W / 2 - 170;
      const y0 = H - 108;
      drawPanel(x0, y0, 340, 60, { radius: 14 });
      const bx = x0 + 20;
      const bw = 300;
      drawRect({ pos: vec2(bx, y0 + 14), width: bw, height: 20, radius: 10, gradient: [C.daySea, C.daySeaDeep], horizontal: true });
      drawRect({
        pos: vec2(bx + (reel.zone - reel.zoneW / 2) * bw, y0 + 12),
        width: reel.zoneW * bw,
        height: 24,
        radius: 10,
        color: reel.inside ? rgb(190, 236, 196) : rgb(255, 255, 255),
        opacity: 0.75,
        outline: { width: 2, color: reel.inside ? C.goodText : C.panelOutline },
      });
      pushTransform();
      pushTranslate(vec2(bx + reel.fish * bw, y0 + 24 + Math.sin(time() * 20) * 1.5));
      pushScale(vec2(reel.target > reel.fish ? 1 : -1, 1));
      const sp = catchInfo.legend ? { col: C.gold, fin: rgb(236, 160, 70) } : catchInfo.species;
      drawFishShape(22, sp.col, sp.fin, time() * 2, { outline: { width: 1, color: C.playerOutline } });
      popTransform();
      drawRect({ pos: vec2(bx, y0 + 42), width: bw, height: 7, radius: 3.5, color: C.panelOutline, opacity: 0.5 });
      drawRect({ pos: vec2(bx, y0 + 42), width: bw * Math.max(0, Math.min(1, reel.progress)), height: 7, radius: 3.5, color: reel.progress > 0.25 ? C.gold : C.badText });
    }
  }, "ui", 30);

  function computeHint() {
    if (panel) return "";
    const t = tech().id;
    if (fishState === "charging") return "release SPACE to cast!";
    if (fishState === "waiting") return "wait for it...";
    if (fishState === "biting") {
      if (isLegendBite) return "NOW! SPACE to hook the legend!";
      return t === "lure" ? "SPACE to hook it!" : "SPACE now!";
    }
    if (fishState === "reeling") return "HOLD SPACE to lift the zone, keep the fish inside!";
    if (fishState === "tugging") return "SPACE when the ring meets the gold circle!";
    if (fishState === "cooldown") return "";
    if (nearZone(player.pos.x, SHOP_X)) return "SPACE to open the shop";
    if (nearZone(player.pos.x, FISH_X)) return t === "deep" ? "HOLD SPACE to charge a deep cast" : `SPACE to cast (${tech().name})`;
    return "<- -> walk   Q/E technique   K skills   J journal";
  }

  // ---------- panels ----------
  drawer(() => {
    if (!panel) return;
    drawRect({ pos: vec2(0, 0), width: W, height: H, color: C.shadow, opacity: 0.3 });
    if (panel === "shop") drawShop();
    else if (panel === "skills") drawSkills();
    else if (panel === "journal") drawJournal();
  }, "ui", 50);

  function panelFrame(x0, y0, w, h, title) {
    drawPanel(x0, y0, w, h, { radius: 18 });
    drawRect({ pos: vec2(x0, y0), width: w, height: 44, radius: [18, 18, 0, 0], color: C.panelHeader });
    for (let i = 0; i < Math.floor(w / 40); i++) {
      drawCircle({ pos: vec2(x0 + 20 + i * 40, y0 + 44), radius: 7, start: 0, end: 180, color: C.panelHeader });
    }
    drawRect({ pos: vec2(x0, y0), width: w, height: h, radius: 18, fill: false, outline: { width: 3, color: C.panelOutline } });
    drawText({ text: title, size: 20, pos: vec2(x0 + w / 2, y0 + 23), anchor: "center", color: C.panelTitle });
  }
  const denied = () => time() - denyAt < 0.4;

  function drawShop() {
    const x0 = W / 2 - 290;
    const y0 = H / 2 - 180;
    panelFrame(x0, y0, 580, 360, "Tackle Shop");
    drawCoin(vec2(x0 + 500, y0 + 23), 8);
    drawText({ text: `${state.money}`, size: 15, pos: vec2(x0 + 514, y0 + 23), anchor: "left", color: C.panelTitle });

    // rod list
    for (let i = 0; i < RODS.length; i++) {
      const r = RODS[i];
      const y = y0 + 66 + i * 30;
      const owned = state.ownedRods.includes(i);
      if (i === sel) {
        const shakeX = denied() ? Math.sin(time() * 60) * 3 : 0;
        drawRect({ pos: vec2(x0 + 14 + shakeX, y - 12), width: 236, height: 26, radius: 10, color: C.goldLight, outline: { width: 2, color: C.gold } });
      }
      drawCircle({ pos: vec2(x0 + 30, y + 1), radius: 5, color: r.tint });
      drawText({ text: r.name, size: 13, pos: vec2(x0 + 42, y + 1), anchor: "left", color: C.panelText });
      if (i === state.rodIndex) drawText({ text: "in hand", size: 11, pos: vec2(x0 + 240, y + 1), anchor: "right", color: C.goodText });
      else if (owned) drawText({ text: "owned", size: 11, pos: vec2(x0 + 240, y + 1), anchor: "right", color: C.panelHint });
      else {
        const afford = state.money >= r.cost;
        drawText({ text: `${r.cost}`, size: 12, pos: vec2(x0 + 240, y + 1), anchor: "right", color: afford ? C.goldText : C.panelHint });
      }
    }

    // details
    const r = RODS[sel];
    const dx = x0 + 272;
    drawRect({ pos: vec2(dx, y0 + 56), width: 292, height: 250, radius: 12, color: rgb(255, 255, 255), opacity: 0.55 });
    const base = vec2(dx + 30, y0 + 150);
    const tip = vec2(dx + 70, y0 + 70);
    if (r.legendChance) for (let i = 0; i < 3; i++) drawSparkle(tip.add(-10 + i * 12, Math.sin(time() * 3 + i) * 5), 4 + Math.sin(time() * 5 + i) * 1.5, C.gold);
    drawLine({ p1: base, p2: tip, width: 4, color: r.tint });
    drawLine({ p1: base, p2: base.lerp(tip, 0.2), width: 7, color: C.rodGrip });
    drawCircle({ pos: base.lerp(tip, 0.15).add(6, 2), radius: 5, color: C.reel, outline: { width: 1, color: C.playerOutline } });
    drawLines({ pts: [tip, tip.add(4, 20), tip.add(6, 36)], width: 1, color: C.panelHint });
    drawCircle({ pos: tip.add(6, 40), radius: 4, color: C.bobber });
    drawText({ text: r.name, size: 17, pos: vec2(dx + 96, y0 + 76), anchor: "left", color: C.panelTitle });
    drawText({ text: r.desc, size: 11, pos: vec2(dx + 96, y0 + 96), anchor: "topleft", color: C.panelHint, lineSpacing: 4 });

    const rows = [
      ["Timing", r.window / 1.3, C.playerScarfDark],
      ["Power", r.power / 2.1, C.stallRoof],
      ["Luck", r.luck / 0.5, C.goodText],
    ];
    rows.forEach(([label, k, col], i) => {
      const y = y0 + 176 + i * 22;
      drawText({ text: label, size: 12, pos: vec2(dx + 16, y), anchor: "left", color: C.panelText });
      drawStatBar(dx + 80, y - 4, 190, k, col);
    });
    const fy = y0 + 244;
    drawText({ text: "Fish", size: 12, pos: vec2(dx + 16, fy), anchor: "left", color: C.panelText });
    drawText({ text: r.tiers.map((t) => TIER_NAMES[t]).join(" "), size: 10, pos: vec2(dx + 80, fy), anchor: "left", color: C.panelHint });
    const special = r.legendChance ? "can hook the Legend God Fish" : r.rainLuck ? "extra luck while it rains" : "";
    if (special) drawText({ text: special, size: 11, pos: vec2(dx + 16, fy + 22), anchor: "left", color: C.goldText });

    let action;
    let col = C.goodText;
    if (sel === state.rodIndex) action = "You're holding this one";
    else if (state.ownedRods.includes(sel)) action = "SPACE to equip";
    else if (state.money >= r.cost) action = `SPACE to buy for ${r.cost}`;
    else {
      action = `Need ${r.cost - state.money} more coins`;
      col = C.badText;
    }
    drawText({ text: keyText(action), size: 14, pos: vec2(dx + 146, y0 + 290), anchor: "center", color: col });
    drawText({ text: keyText("up/down browse   ESC close"), size: 11, pos: vec2(W / 2, y0 + 340), anchor: "center", color: C.panelHint });
  }

  function drawSkills() {
    const x0 = W / 2 - 260;
    const y0 = H / 2 - 190;
    panelFrame(x0, y0, 520, 380, "Fishing Skills");

    const need = xpToNext(state.level);
    drawText({ text: `Level ${state.level}`, size: 16, pos: vec2(x0 + 24, y0 + 70), anchor: "left", color: C.panelTitle });
    drawStatBar(x0 + 130, y0 + 66, 220, state.xp / need, C.playerScarfDark);
    drawText({ text: `${state.xp}/${need} xp`, size: 11, pos: vec2(x0 + 360, y0 + 70), anchor: "left", color: C.panelHint });
    drawText({
      text: `points: ${state.skillPoints}`,
      size: 13,
      pos: vec2(x0 + 496, y0 + 70),
      anchor: "right",
      color: state.skillPoints > 0 ? C.goldText : C.panelHint,
    });

    SKILLS.forEach((sk, i) => {
      const y = y0 + 106 + i * 40;
      if (i === sel) {
        const shakeX = denied() ? Math.sin(time() * 60) * 3 : 0;
        drawRect({ pos: vec2(x0 + 14 + shakeX, y - 6), width: 492, height: 36, radius: 10, color: C.goldLight, outline: { width: 2, color: C.gold } });
      }
      drawText({ text: sk.name, size: 15, pos: vec2(x0 + 28, y + 6), anchor: "left", color: C.panelTitle });
      drawText({ text: sk.desc, size: 10, pos: vec2(x0 + 28, y + 21), anchor: "left", color: C.panelHint });
      drawPips(x0 + 300, y + 12, state.skills[sk.id], SKILL_MAX, C.playerScarfDark, 6, 17);
      if (i === sel && state.skillPoints > 0 && state.skills[sk.id] < SKILL_MAX) {
        drawText({ text: keyText("+ SPACE"), size: 11, pos: vec2(x0 + 494, y + 12), anchor: "right", color: C.goodText });
      }
    });

    drawText({ text: "Techniques", size: 14, pos: vec2(x0 + 24, y0 + 276), anchor: "left", color: C.panelTitle });
    TECHNIQUES.forEach((t, i) => {
      const y = y0 + 298 + i * 20;
      const open = state.level >= t.unlock;
      drawCircle({ pos: vec2(x0 + 30, y), radius: 5, color: open ? (i === state.technique ? C.gold : C.goodText) : C.panelOutline });
      drawText({ text: `${i + 1}. ${t.name}`, size: 12, pos: vec2(x0 + 42, y), anchor: "left", color: open ? C.panelText : C.panelHint });
      drawText({ text: open ? t.desc : `unlocks at Lv ${t.unlock}`, size: 10, pos: vec2(x0 + 150, y), anchor: "left", color: C.panelHint });
    });
    drawText({ text: keyText("up/down choose   SPACE spend point   ESC close"), size: 11, pos: vec2(W / 2, y0 + 366), anchor: "center", color: C.panelHint });
  }

  function drawJournal() {
    const x0 = W / 2 - 300;
    const y0 = H / 2 - 190;
    const found = Object.keys(state.journal).length;
    panelFrame(x0, y0, 600, 380, `Fish Journal  ${found}/${FISH_SPECIES.length}`);
    FISH_SPECIES.forEach((sp, i) => {
      const cx = x0 + 22 + (i % 4) * 140;
      const cy = y0 + 60 + Math.floor(i / 4) * 100;
      const best = state.journal[sp.name];
      const known = best !== undefined;
      drawRect({ pos: vec2(cx, cy), width: 130, height: 90, radius: 10, color: known ? rgb(255, 255, 255) : C.panelBg, opacity: 0.8, outline: { width: 1.5, color: known ? C.panelOutline : rgb(230, 220, 210) } });
      pushTransform();
      pushTranslate(vec2(cx + 65, cy + 30));
      if (known) drawFishShape(46, sp.col, sp.fin, time() + i);
      else drawFishShape(46, rgb(200, 196, 204), rgb(186, 180, 192), 0);
      popTransform();
      drawText({ text: known ? sp.name : "???", size: 12, pos: vec2(cx + 65, cy + 60), anchor: "center", color: known ? C.panelText : C.panelHint });
      drawText({ text: known ? `best ${best}cm` : TIER_NAMES[sp.tier], size: 10, pos: vec2(cx + 65, cy + 76), anchor: "center", color: C.panelHint });
      for (let s = 0; s <= sp.tier; s++) drawSparkle(vec2(cx + 12 + s * 9, cy + 12), 3.5, known ? C.gold : C.panelOutline);
      if (sp.cond === "rain") drawDrop(vec2(cx + 116, cy + 12), 0.9, C.fishBlue);
      if (sp.cond === "night") {
        drawCircle({ pos: vec2(cx + 116, cy + 13), radius: 5.5, color: C.goldText });
        drawCircle({ pos: vec2(cx + 119, cy + 11), radius: 4.5, color: known ? rgb(255, 255, 255) : C.panelBg });
      }
    });
    drawText({ text: keyText("drop = only in rain   moon = only at night   J / ESC close"), size: 11, pos: vec2(W / 2, y0 + 366), anchor: "center", color: C.panelHint });
  }

  // ---------- per-frame ----------
  onUpdate(() => {
    if (fishState === "biting" && time() > biteDeadline) {
      failCast(isLegendBite ? "The legend slipped away..." : "It got away...");
    }
    if (fishState === "reeling" && reel) updateReel();
    if (fishState === "tugging" && tug && time() >= tug.ringStart && tugRadius() < TUG_TARGET - tug.tol) {
      failCast(isLegendBite ? "The legend slipped the hook..." : "It slipped the hook...");
    }
  });
});
