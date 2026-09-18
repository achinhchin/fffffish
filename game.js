import kaplay from "https://unpkg.com/kaplay@3001.0.19/dist/kaplay.mjs";

kaplay({
  width: 800,
  height: 600,
  letterbox: true,
  stretch: true,
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

// ---------- pacing ----------
const DAY_NIGHT_CYCLE = 90; // seconds for one full day/night loop
const BITE_WAIT = [0.5, 1.3]; // seconds before a bite after casting
const CATCH_WINDOW = [0.9, 0.8, 0.7, 0.6, 0.5]; // reaction window, indexed by rod tier
const LEGEND_WINDOW = 0.45;
const COOLDOWN = 0.4;

// ---------- palette ----------
const C = {
  daySky: rgb(191, 227, 240),
  nightSky: rgb(58, 66, 102),
  daySea: rgb(163, 214, 214),
  nightSea: rgb(42, 52, 84),
  sun: rgb(255, 224, 168),
  moon: rgb(214, 222, 242),
  fog: rgb(245, 245, 248),

  pierWood: rgb(214, 182, 140),
  pierOutline: rgb(176, 140, 102),
  stallBody: rgb(247, 205, 200),
  stallRoof: rgb(224, 150, 150),
  stallOutline: rgb(196, 120, 120),

  playerBody: rgb(255, 179, 166),
  playerSkin: rgb(255, 224, 204),
  playerOutline: rgb(196, 140, 128),
  rod: rgb(150, 111, 89),

  bobber: rgb(255, 140, 140),
  legendBobber: rgb(255, 205, 90),
  bobberOutline: rgb(255, 255, 255),

  title: rgb(70, 60, 80),
  subtitle: rgb(100, 90, 110),
  hudText: rgb(60, 55, 70),
  hudHint: rgb(90, 85, 100),
  goldText: rgb(199, 145, 45),
  goodText: rgb(85, 145, 95),
  badText: rgb(180, 100, 100),

  panelBg: rgb(255, 246, 238),
  panelOutline: rgb(220, 195, 170),
  panelText: rgb(80, 70, 90),
  panelTitle: rgb(60, 50, 70),
  panelHint: rgb(120, 110, 130),

  winSkyTop: rgb(255, 214, 170),
  winSea: rgb(255, 190, 180),
};

// ---------- economy ----------
const ROD_TIERS = [
  { name: "Noob Rod", cost: 0, tiers: [0] },
  { name: "Apprentice Rod", cost: 30, tiers: [0, 1] },
  { name: "Angler Rod", cost: 90, tiers: [0, 1, 2] },
  { name: "Master Rod", cost: 220, tiers: [0, 1, 2, 3] },
  { name: "Legend Rod", cost: 500, tiers: [0, 1, 2, 3], legendChance: 0.35 },
];
const LEGEND_ROD_INDEX = ROD_TIERS.length - 1;

const FISH_TIERS = [
  { tier: 0, name: "Noob Fish", value: 5, emoji: "🐟" },
  { tier: 1, name: "Common Fish", value: 14, emoji: "🐠" },
  { tier: 2, name: "Rare Fish", value: 35, emoji: "🐡" },
  { tier: 3, name: "Epic Fish", value: 80, emoji: "🦈" },
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

// ---------- day/night + fog ----------
function skyPhase() {
  return ((time() % DAY_NIGHT_CYCLE) / DAY_NIGHT_CYCLE) * Math.PI * 2;
}

function addEnvironment(withFog = true) {
  const sky = add([rect(W, SKY_H), pos(0, 0), color(C.daySky), layer("bg")]);
  const sea = add([rect(W, H - SKY_H), pos(0, SKY_H), color(C.daySea), layer("bg")]);
  const body = add([circle(16), pos(W / 2, 90), color(C.sun), opacity(1), layer("bg")]);

  onUpdate(() => {
    const phase = skyPhase();
    const night = (1 - Math.cos(phase)) / 2;
    sky.color = C.daySky.lerp(C.nightSky, night);
    sea.color = C.daySea.lerp(C.nightSea, night);

    const isDayHalf = phase < Math.PI;
    const t = isDayHalf ? phase / Math.PI : (phase - Math.PI) / Math.PI;
    body.pos.x = 80 + t * (W - 160);
    body.pos.y = 150 - Math.sin(t * Math.PI) * 100;
    body.color = isDayHalf ? C.sun : C.moon;
    body.opacity = 0.15 + 0.85 * Math.sin(t * Math.PI);
  });

  if (withFog) {
    for (let i = 0; i < 2; i++) {
      const fog = add([
        rect(340, 46, { radius: 20 }),
        pos(rand(-200, W), 330 + i * 55),
        color(C.fog),
        opacity(0.12),
        layer("fog"),
      ]);
      const speed = 6 + i * 3;
      fog.onUpdate(() => {
        fog.pos.x += speed * dt();
        if (fog.pos.x > W + 200) fog.pos.x = -340;
      });
    }
  }
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
    z(60),
    layer("fx"),
  ]);
  t.onUpdate(() => {
    t.pos.y -= 24 * dt();
    t.opacity -= dt() * 0.8;
    if (t.opacity <= 0) destroy(t);
  });
}

// ---------- scenes ----------
layers(["bg", "fog", "world", "fx", "ui"], "world");

scene("intro", () => {
  addEnvironment(true);

  add([text("fffffish", { size: 56 }), pos(W / 2, H / 2 - 70), anchor("center"), color(C.title), layer("ui")]);
  add([
    text("a quiet little fishing game", { size: 16 }),
    pos(W / 2, H / 2 - 10),
    anchor("center"),
    color(C.subtitle),
    layer("ui"),
  ]);

  const prompt = add([
    text("Press SPACE to begin", { size: 16 }),
    pos(W / 2, H / 2 + 60),
    anchor("center"),
    color(C.hudHint),
    opacity(1),
    layer("ui"),
  ]);
  pulse(prompt);

  add([
    text("Move: <- / -> or A / D    Act: SPACE", { size: 12 }),
    pos(W / 2, H - 30),
    anchor("center"),
    color(C.hudHint),
    opacity(0.7),
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

  add([
    text("What should we call you,", { size: 18 }),
    pos(W / 2, H / 2 - 90),
    anchor("center"),
    color(C.subtitle),
    layer("ui"),
  ]);
  add([
    text("fisherfolk?", { size: 18 }),
    pos(W / 2, H / 2 - 64),
    anchor("center"),
    color(C.subtitle),
    layer("ui"),
  ]);

  const nameText = add([
    text("", { size: 26 }),
    pos(W / 2, H / 2),
    anchor("center"),
    color(C.title),
    layer("ui"),
  ]);
  const cursor = add([
    text("_", { size: 26 }),
    pos(W / 2, H / 2),
    anchor("left"),
    color(C.title),
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
    pos(W / 2, H / 2 + 60),
    anchor("center"),
    color(C.hudHint),
    opacity(0.7),
    layer("ui"),
  ]);
});

scene("game", () => {
  addEnvironment(true);
  state.gameStartTime = time();

  // pier deck
  add([
    rect(PIER_X_MAX - PIER_X_MIN + 60, 30),
    pos(PIER_X_MIN - 30, PIER_Y),
    color(C.pierWood),
    outline(2, C.pierOutline),
    layer("world"),
  ]);

  // shop stall
  add([
    rect(70, 60, { radius: 6 }),
    pos(SHOP_X - 35, PIER_Y - 60),
    color(C.stallBody),
    outline(2, C.stallOutline),
    layer("world"),
  ]);
  add([
    rect(90, 14, { radius: 4 }),
    pos(SHOP_X - 45, PIER_Y - 72),
    color(C.stallRoof),
    outline(2, C.stallOutline),
    layer("world"),
  ]);
  add([text("shop", { size: 12 }), pos(SHOP_X, PIER_Y - 32), anchor("center"), color(C.panelText), layer("world")]);

  // fishing spot marker
  add([
    text("~ fish here ~", { size: 11 }),
    pos(FISH_X, PIER_Y - 14),
    anchor("center"),
    color(C.hudHint),
    opacity(0.7),
    layer("world"),
  ]);

  // player
  const player = add([pos(PIER_X_MIN, PIER_Y), scale(1, 1), z(10), layer("world")]);
  player.add([
    rect(26, 30, { radius: 8 }),
    anchor("bot"),
    pos(0, 0),
    color(C.playerBody),
    outline(2, C.playerOutline),
  ]);
  player.add([
    circle(11),
    anchor("center"),
    pos(0, -40),
    color(C.playerSkin),
    outline(2, C.playerOutline),
  ]);
  player.add([rect(4, 44, { radius: 2 }), anchor("bot"), pos(13, -18), rotate(-50), color(C.rod)]);

  function nearZone(x, center) {
    return Math.abs(x - center) < ZONE_RANGE;
  }

  onKeyDown(["left", "a"], () => {
    if (shopOpen) return;
    player.pos.x -= PLAYER_SPEED * dt();
    player.scale.x = -1;
  });
  onKeyDown(["right", "d"], () => {
    if (shopOpen) return;
    player.pos.x += PLAYER_SPEED * dt();
    player.scale.x = 1;
  });

  // ---------- HUD ----------
  add([rect(W, 34), pos(0, 0), color(C.panelBg), opacity(0.5), fixed(), layer("ui"), z(30)]);
  const hintBg = add([
    rect(320, 26, { radius: 13 }),
    pos(W / 2, H - 24),
    anchor("center"),
    color(C.panelBg),
    opacity(0.5),
    fixed(),
    layer("ui"),
    z(30),
  ]);
  const hudMoney = add([
    text("", { size: 15 }),
    pos(16, 9),
    fixed(),
    layer("ui"),
    color(C.hudText),
    z(31),
  ]);
  const hudRod = add([
    text("", { size: 15 }),
    pos(W - 16, 9),
    anchor("topright"),
    fixed(),
    layer("ui"),
    color(C.hudText),
    z(31),
  ]);
  const hudHint = add([
    text("", { size: 13 }),
    pos(W / 2, H - 24),
    anchor("center"),
    fixed(),
    layer("ui"),
    color(C.hudHint),
    z(31),
  ]);

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
    const myBobber = add([
      circle(6),
      pos(FISH_X + 50, 385),
      color(C.bobber),
      outline(2, C.bobberOutline),
      opacity(1),
      layer("world"),
      z(5),
    ]);
    bobber = myBobber;

    myBobber.onUpdate(() => {
      if (fishState === "waiting" && bobber === myBobber) {
        myBobber.pos.y = 385 + Math.sin(time() * 5) * 3;
      }
    });

    const rod = ROD_TIERS[state.rodIndex];
    const legendRoll = state.rodIndex === LEGEND_ROD_INDEX && chance(rod.legendChance);
    const delay = rand(BITE_WAIT[0], BITE_WAIT[1]);

    wait(delay, () => {
      if (fishState !== "waiting" || bobber !== myBobber) return;
      isLegendBite = legendRoll;
      onBite(myBobber);
    });
  }

  function onBite(myBobber) {
    fishState = "biting";
    biteDeadline = time() + (isLegendBite ? LEGEND_WINDOW : CATCH_WINDOW[state.rodIndex]);
    myBobber.pos.y += 10;
    myBobber.color = isLegendBite ? C.legendBobber : C.bobber;

    const mark = add([
      text(isLegendBite ? "!!" : "!", { size: isLegendBite ? 26 : 20 }),
      pos(myBobber.pos.x, myBobber.pos.y - 24),
      anchor("center"),
      color(isLegendBite ? C.goldText : C.badText),
      opacity(1),
      layer("fx"),
      z(20),
    ]);
    mark.onUpdate(() => {
      mark.pos.y -= 20 * dt();
      mark.opacity -= dt() * 1.2;
      if (mark.opacity <= 0) destroy(mark);
    });
  }

  function failCast(msg) {
    fishState = "cooldown";
    floatingText(msg, C.badText, vec2(player.pos.x, PIER_Y - 90));
    clearBobber();
    wait(COOLDOWN, () => {
      fishState = "idle";
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
    floatingText(`+${fish.value} ${fish.emoji} ${fish.name}`, C.goodText, vec2(player.pos.x, PIER_Y - 90));
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
    panel.add([
      rect(360, 190, { radius: 16 }),
      anchor("center"),
      color(C.panelBg),
      outline(3, C.panelOutline),
    ]);
    panel.add([
      text("Tackle Shop", { size: 20 }),
      anchor("center"),
      pos(0, -72),
      color(C.panelTitle),
    ]);

    const nextIndex = state.rodIndex + 1;
    if (nextIndex < ROD_TIERS.length) {
      const nextRod = ROD_TIERS[nextIndex];
      const afford = state.money >= nextRod.cost;
      panel.add([text(nextRod.name, { size: 18 }), anchor("center"), pos(0, -28), color(C.panelText)]);
      panel.add([
        text(`Cost: ${nextRod.cost} coins`, { size: 15 }),
        anchor("center"),
        pos(0, 2),
        color(afford ? C.goldText : C.panelText),
      ]);
      panel.add([
        text(afford ? "Press SPACE to buy" : `Need ${nextRod.cost - state.money} more coins`, { size: 14 }),
        anchor("center"),
        pos(0, 38),
        color(afford ? C.goodText : C.badText),
      ]);
    } else {
      panel.add([
        text("You wield the finest rod\nin the sea.", { size: 16 }),
        anchor("center"),
        pos(0, -14),
        color(C.panelText),
      ]);
      panel.add([
        text("Go find your legend.", { size: 16 }),
        anchor("center"),
        pos(0, 24),
        color(C.goldText),
      ]);
    }
    panel.add([
      text("ESC to close", { size: 12 }),
      anchor("center"),
      pos(0, 78),
      color(C.panelHint),
    ]);
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
      floatingText(`Bought ${nextRod.name}!`, C.goldText, vec2(player.pos.x, PIER_Y - 90));
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

    hudMoney.text = `${state.playerName}   coins: ${state.money}`;
    hudRod.text = `${ROD_TIERS[state.rodIndex].name}`;
    hudHint.text = computeHint();
  });
});

scene("win", ({ name, money, elapsed, catches }) => {

  add([rect(W, H * 0.62), pos(0, 0), color(C.winSkyTop), layer("bg")]);
  add([rect(W, H * 0.4), pos(0, H * 0.6), color(C.winSea), layer("bg")]);
  add([circle(60), pos(W / 2, H * 0.58), color(C.goldText), opacity(0.35), layer("bg")]);

  add([text("🐋", { size: 60 }), pos(W / 2, H / 2 - 118), anchor("center"), layer("fx")]);
  add([
    text(`${name} caught the`, { size: 20 }),
    pos(W / 2, H / 2 - 46),
    anchor("center"),
    color(C.title),
    layer("ui"),
  ]);
  add([
    text("Legend God Fish!", { size: 30 }),
    pos(W / 2, H / 2 - 10),
    anchor("center"),
    color(C.goldText),
    layer("ui"),
  ]);

  const mm = Math.floor(elapsed / 60);
  const ss = Math.floor(elapsed % 60)
    .toString()
    .padStart(2, "0");
  add([
    text(`${money} coins earned   -   ${catches} fish caught`, { size: 14 }),
    pos(W / 2, H / 2 + 38),
    anchor("center"),
    color(C.panelText),
    layer("ui"),
  ]);
  add([
    text(`time: ${mm}:${ss}`, { size: 14 }),
    pos(W / 2, H / 2 + 62),
    anchor("center"),
    color(C.panelText),
    layer("ui"),
  ]);

  const prompt = add([
    text("Press SPACE to play again", { size: 14 }),
    pos(W / 2, H - 60),
    anchor("center"),
    color(C.hudHint),
    opacity(1),
    layer("ui"),
  ]);
  pulse(prompt);

  onKeyPress("space", () => go("intro"));
});

go("intro");
