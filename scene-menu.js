import { W, H, C, FISH_SPECIES, state, resetState } from "./data.js";
import { addEnvironment, drawer, drawFishShape, drawPanel, drawSparkle, drawCharacter, pulse } from "./art.js";
import { isTouchMode, keyHint, showNameInput, hideNameInput } from "./touch.js";

export function addWavyTitle(str, y, size, col) {
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
  const swimmers = [0, 4, 6, 9].map((k) => FISH_SPECIES[k]).map((f, i) => ({ f, off: i * 1.6, r: 170 + i * 12 }));
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
    keyHint("Press SPACE to begin"),
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
    text("", { size: 12 }),
    keyHint("Move: <- -> / A D    Act: SPACE    Technique: Q / E    Skills: K    Journal: J"),
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

  resetState();

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

  // Read typed characters from the real keydown event: KAPLAY's onCharInput
  // lowercases everything. Synthetic events from the touch buttons are ignored.
  const canvas = document.querySelector("canvas");
  const onType = (e) => {
    if (!e.isTrusted || e.ctrlKey || e.metaKey || e.altKey) return;
    if (state.playerName.length >= 12 || !/^[a-zA-Z0-9 ]$/.test(e.key)) return;
    state.playerName += e.key;
    refresh();
  };
  canvas.addEventListener("keydown", onType);

  // In touch mode a real text field sits over the name box so the phone keyboard opens.
  showNameInput(state.playerName, (name) => {
    state.playerName = name;
    refresh();
  });
  onSceneLeave(() => {
    canvas.removeEventListener("keydown", onType);
    hideNameInput();
  });
  onUpdate(() => {
    const hidden = isTouchMode();
    nameText.hidden = hidden;
    cursor.hidden = hidden;
  });

  onKeyPressRepeat("backspace", () => {
    state.playerName = state.playerName.slice(0, -1);
    refresh();
  });
  function confirmName() {
    state.playerName = state.playerName.trim();
    if (state.playerName.length === 0) state.playerName = "Noob";
    go("story");
  }
  onKeyPress("enter", confirmName);
  // the ACT button confirms in touch mode (on a keyboard, space is part of the name)
  onKeyPress("space", () => {
    if (isTouchMode()) confirmName();
  });

  add([
    text("", { size: 12 }),
    keyHint("ENTER to confirm  -  BACKSPACE to edit"),
    pos(W / 2, H / 2 + 62),
    anchor("center"),
    color(C.hudHint),
    opacity(0.8),
    layer("ui"),
  ]);
});

