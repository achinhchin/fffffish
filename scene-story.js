import { W, H, C, FISH_SPECIES, STORY_OPENING, STORY_ENDING, EPILOGUES, state } from "./data.js";
import { addEnvironment, drawer, drawPanel, drawIllustration, drawSparkle, drawFishShape, drawCloud, glow, pulse } from "./art.js";
import { keyText, keyHint } from "./touch.js";
import { finishRun, showAccountBar } from "./account.js";

// Shows story pages one by one with a typewriter effect.
// The last page may be a choice; `onDone(choice)` is called at the end.
function runStory(pages, { onDone, skippable }) {
  const fill = (s) => s.replaceAll("{name}", state.playerName);
  let page = 0;
  let shown = 0;
  let choice = 0; // 0 = let it go, 1 = keep it
  const full = () => fill(pages[page].text);

  const body = add([
    text("", { size: 16, width: 500, align: "center", lineSpacing: 6 }),
    pos(W / 2, H / 2 + 38),
    anchor("top"),
    color(C.panelText),
    layer("ui"),
    z(5),
  ]);

  drawer(() => {
    drawRect({ pos: vec2(0, 0), width: W, height: H, color: C.shadow, opacity: 0.35 });
    drawPanel(W / 2 - 290, 50, 580, 500, { opacity: 0.95, radius: 20 });
    drawIllustration(pages[page].art, vec2(W / 2, 175));

    // page dots
    for (let i = 0; i < pages.length; i++) {
      drawCircle({ pos: vec2(W / 2 + (i - (pages.length - 1) / 2) * 16, 520), radius: i === page ? 5 : 3.5, color: i === page ? C.stallRoof : C.panelOutline });
    }

    const done = shown >= full().length;
    if (done && pages[page].choice) {
      const opts = ["<- Let it go", "Keep it ->"];
      opts.forEach((label, i) => {
        const p = vec2(W / 2 + (i === 0 ? -120 : 120), 470);
        const on = choice === i;
        drawRect({
          pos: p,
          width: 200,
          height: 40,
          radius: 20,
          anchor: "center",
          color: on ? C.goldLight : C.panelBg,
          outline: { width: on ? 3 : 2, color: on ? C.gold : C.panelOutline },
        });
        if (on) drawSparkle(p.add(-86, 0), 5 + Math.sin(time() * 5) * 1.5, C.gold);
        drawText({ text: label, size: 15, pos: p, anchor: "center", color: on ? C.panelTitle : C.panelHint });
      });
    } else if (done) {
      drawText({
        text: keyText(page < pages.length - 1 ? "SPACE to continue" : "SPACE to begin"),
        size: 13,
        pos: vec2(W / 2, 486),
        anchor: "center",
        color: C.hudHint,
        opacity: 0.6 + Math.sin(time() * 4) * 0.4,
      });
    }
    if (skippable) drawText({ text: keyText("ESC to skip"), size: 11, pos: vec2(W / 2 + 270, 536), anchor: "right", color: C.panelHint });
  }, "ui", 0);

  onUpdate(() => {
    shown = Math.min(full().length, shown + dt() * 45);
    body.text = full().slice(0, Math.floor(shown));
  });

  function advance() {
    if (shown < full().length) {
      shown = full().length;
      return;
    }
    if (pages[page].choice) {
      onDone(choice === 0 ? "free" : "keep");
      return;
    }
    if (page < pages.length - 1) {
      page++;
      shown = 0;
    } else {
      onDone();
    }
  }
  onKeyPress(["space", "enter"], advance);
  onKeyPress(["left", "a"], () => {
    choice = 0;
  });
  onKeyPress(["right", "d"], () => {
    choice = 1;
  });
  if (skippable) onKeyPress("escape", () => onDone());
}

scene("story", () => {
  addEnvironment(true, { jumpers: false });
  runStory(STORY_OPENING, { skippable: true, onDone: () => go("game") });
});

scene("ending", ({ elapsed }) => {
  addEnvironment(false, { rain: 0.75, jumpers: false });
  runStory(STORY_ENDING, { skippable: false, onDone: (choice) => go("win", { choice, elapsed }) });
});

scene("win", ({ choice, elapsed }) => {
  const epi = EPILOGUES[choice];
  finishRun(elapsed); // puts this run on the global scoreboard
  showAccountBar(true);
  onSceneLeave(() => showAccountBar(false));
  const sparkles = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(0, H), sp: rand(10, 30), s: rand(2, 5), ph: rand(0, 6) }));
  const confetti = Array.from({ length: 60 }, () => ({
    x: rand(0, W),
    y: rand(-H, 0),
    sp: rand(40, 90),
    rot: rand(0, 360),
    rs: rand(-200, 200),
    col: [C.stallRoof, C.gold, C.playerScarf, C.fishBlue, C.playerHat][randi(0, 5)],
  }));
  const horizon = H * 0.6;
  const splashes = [];

  drawer(() => {
    drawRect({ pos: vec2(0, 0), width: W, height: horizon, gradient: [C.winSkyHigh, C.winSkyTop] });
    // sun setting behind the sea
    const sunP = vec2(W / 2, horizon);
    glow(sunP, 70, C.gold, 0.6, 7);
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
    for (const s of sparkles) {
      s.y -= s.sp * dt();
      if (s.y < -10) {
        s.y = H + 10;
        s.x = rand(0, W);
      }
      drawSparkle(vec2(s.x, s.y), s.s * (0.6 + 0.4 * Math.sin(time() * 4 + s.ph)), C.goldLight, 0.8);
    }
  }, "bg", 0);

  // the Legend: mounted with a crown, or leaping free across the sea
  drawer(() => {
    const t = time();
    if (choice === "keep") {
      const p = vec2(W / 2, H / 2 - 150 + Math.sin(t * 2) * 4);
      glow(p, 44, C.gold, 0.5, 6);
      drawRect({ pos: p, width: 200, height: 90, radius: 14, anchor: "center", color: rgb(214, 170, 120), outline: { width: 4, color: C.goldText } });
      drawRect({ pos: p, width: 184, height: 74, radius: 10, anchor: "center", color: rgb(255, 238, 214) });
      pushTransform();
      pushTranslate(p);
      pushRotate(-6);
      drawFishShape(120, C.gold, rgb(236, 160, 70), 0, { outline: { width: 2.5, color: C.goldText } });
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
        drawSparkle(p.add(Vec2.fromAngle(t * 60 + i * 72).scale(120, 60)), 5 + Math.sin(t * 5 + i) * 2, rgb(255, 255, 255), 0.9);
      }
    } else {
      // leaping in a loop over the sea
      const k = (t * 0.45) % 1;
      const x = lerp(140, W - 140, k);
      const p = vec2(x, horizon + 10 - Math.sin(k * Math.PI) * 250);
      if (k < 0.02 && !splashes.some((s) => s.t < 0.1)) splashes.push({ x: 140, t: 0 });
      if (k > 0.98 && !splashes.some((s) => s.x > W / 2 && s.t < 0.1)) splashes.push({ x: W - 140, t: 0 });
      glow(p, 30, C.gold, 0.5, 6);
      pushTransform();
      pushTranslate(p);
      pushRotate(-50 + k * 100);
      drawFishShape(100, C.gold, rgb(236, 160, 70), t, { outline: { width: 2.5, color: C.goldText } });
      popTransform();
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.t += dt();
        if (s.t > 1) {
          splashes.splice(i, 1);
          continue;
        }
        drawEllipse({ pos: vec2(s.x, horizon + 12), radiusX: 10 + s.t * 50, radiusY: 3 + s.t * 10, fill: false, outline: { width: 2, color: rgb(255, 255, 255) }, color: C.goldLight, opacity: 1 - s.t });
      }
    }
  }, "fx", 0);

  drawer(() => {
    drawPanel(W / 2 - 280, H / 2 - 76, 560, 220, { opacity: 0.92 });
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

  add([text(epi.lead.replace("{name}", state.playerName), { size: 20 }), pos(W / 2, H / 2 - 52), anchor("center"), color(C.title), layer("ui")]);
  const titleText = add([text(epi.title, { size: 30 }), pos(W / 2, H / 2 - 16), anchor("center"), color(C.goldText), scale(1), layer("ui")]);
  titleText.onUpdate(() => {
    titleText.scale = vec2(1 + Math.sin(time() * 3) * 0.04);
  });
  add([text(epi.text, { size: 13, align: "center", lineSpacing: 5 }), pos(W / 2, H / 2 + 30), anchor("center"), color(C.subtitle), layer("ui")]);

  const mm = Math.floor(elapsed / 60);
  const ss = Math.floor(elapsed % 60)
    .toString()
    .padStart(2, "0");
  const found = Object.keys(state.journal).length;
  add([
    text(`${state.money} coins   -   ${state.caughtCount + 1} fish caught   -   Lv ${state.level}`, { size: 13 }),
    pos(W / 2, H / 2 + 80),
    anchor("center"),
    color(C.panelText),
    layer("ui"),
  ]);
  add([
    text(`journal ${found}/${FISH_SPECIES.length}   -   time ${mm}:${ss}`, { size: 13 }),
    pos(W / 2, H / 2 + 104),
    anchor("center"),
    color(C.panelText),
    layer("ui"),
  ]);

  const prompt = add([text("", { size: 14 }), keyHint("SPACE keep fishing    N new game"), pos(W / 2, H - 50), anchor("center"), color(C.title), opacity(1), layer("ui")]);
  pulse(prompt);

  // the story is over, but the sea isn't: keep fishing with everything you have
  onKeyPress("space", () => {
    if (!document.querySelector(".modal-back")) go("game", { elapsed, postGame: true });
  });
  onKeyPress("n", () => {
    if (!document.querySelector(".modal-back") && confirm("Start over from the beginning? This run's progress will be replaced.")) go("naming");
  });
});
