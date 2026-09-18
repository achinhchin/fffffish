// Touch-screen support: detects mobile devices, shows a Touch ON/OFF toggle,
// and draws on-screen buttons that feed synthetic key events into KAPLAY, so
// every scene keeps using its normal keyboard bindings.
import "./engine.js";

const STORAGE_KEY = "fffffish.touchMode";
const UA = navigator.userAgent;

export const isMobileDevice =
  window.matchMedia?.("(pointer: coarse)").matches ||
  /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(UA) ||
  // iPadOS reports itself as a Mac
  (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);

function loadPref() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "on") return true;
    if (v === "off") return false;
  } catch {
    // storage blocked (private mode etc.)
  }
  return null;
}
function savePref(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
}

let touchMode = loadPref() ?? isMobileDevice;
export const isTouchMode = () => touchMode;

// ---------- key labels ----------
const TOUCH_LABELS = [
  [/ENTER to confirm {2}- {2}BACKSPACE to edit/, "tap the box to type  -  ACT to confirm"],
  [/Move: .*$/, "Move: <- ->    Act: ACT    Technique: Q / E    Skills: K    Journal: J"],
  [/Press SPACE/g, "Tap ACT"],
  [/SPACE/g, "ACT"],
  [/\bESC\b/g, "BACK"],
];
// Rewrites keyboard hints ("SPACE", "ESC"...) to the on-screen button names in touch mode.
export function keyText(str) {
  if (!touchMode || !str) return str;
  return TOUCH_LABELS.reduce((s, [re, rep]) => s.replace(re, rep), str);
}
// Component that keeps a text object's hint in sync with the current mode.
// `str` may be a function for hints that change (e.g. begin vs continue).
export function keyHint(str) {
  return {
    id: "keyHint",
    update() {
      this.text = keyText(typeof str === "function" ? str() : str);
    },
  };
}

// ---------- synthetic keys ----------
const canvas = document.querySelector("canvas");
const KEYS = {
  left: { key: "ArrowLeft", code: "ArrowLeft" },
  right: { key: "ArrowRight", code: "ArrowRight" },
  up: { key: "ArrowUp", code: "ArrowUp" },
  down: { key: "ArrowDown", code: "ArrowDown" },
  space: { key: " ", code: "Space" },
  enter: { key: "Enter", code: "Enter" },
  escape: { key: "Escape", code: "Escape" },
  q: { key: "q", code: "KeyQ" },
  e: { key: "e", code: "KeyE" },
  k: { key: "k", code: "KeyK" },
  j: { key: "j", code: "KeyJ" },
};
function sendKey(type, name) {
  canvas.dispatchEvent(new KeyboardEvent(type, { ...KEYS[name], bubbles: true, cancelable: true }));
}
export function tapKey(name) {
  sendKey("keydown", name);
  setTimeout(() => sendKey("keyup", name), 60);
}

// ---------- DOM ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// A button that holds its key down for as long as the finger is on it.
function keyButton(name, label, cls = "", caption = "") {
  const b = el("button", `tbtn ${cls}`);
  b.type = "button";
  b.tabIndex = -1;
  b.append(el("span", "tbtn-label", label));
  if (caption) b.append(el("span", "tbtn-cap", caption));
  let held = null;
  const release = () => {
    if (held === null) return;
    held = null;
    b.classList.remove("pressed");
    sendKey("keyup", name);
  };
  b.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    if (held !== null) return;
    held = ev.pointerId;
    try {
      b.setPointerCapture(ev.pointerId);
    } catch {
      // not every pointer can be captured; pointerup/cancel still release the key
    }
    b.classList.add("pressed");
    sendKey("keydown", name);
    navigator.vibrate?.(8);
  });
  b.addEventListener("pointerup", release);
  b.addEventListener("pointercancel", release);
  b.addEventListener("lostpointercapture", release);
  b.addEventListener("contextmenu", (ev) => ev.preventDefault());
  return b;
}

const controls = el("div", "touch-controls");
const dpad = el("div", "dpad");
dpad.append(
  keyButton("up", "▲", "up"),
  keyButton("left", "◀", "left"),
  keyButton("right", "▶", "right"),
  keyButton("down", "▼", "down"),
);
const actions = el("div", "actions");
actions.append(
  keyButton("escape", "BACK", "small back"),
  keyButton("q", "Q", "small q", "tech"),
  keyButton("e", "E", "small e", "tech"),
  keyButton("k", "K", "small k", "skills"),
  keyButton("j", "J", "small j", "journal"),
  keyButton("space", "ACT", "act"),
);
controls.append(dpad, actions);

const toggle = el("button", "touch-toggle");
toggle.type = "button";
toggle.tabIndex = -1;
toggle.addEventListener("click", () => {
  setTouchMode(!touchMode);
  savePref(touchMode);
  // give the keyboard back to the game after clicking the toggle
  canvas.focus();
});

// Real text field for the naming screen: phone keyboards only open for inputs.
const nameInput = el("input", "name-input");
Object.assign(nameInput, {
  type: "text",
  maxLength: 12,
  autocomplete: "off",
  autocapitalize: "words",
  spellcheck: false,
  placeholder: "tap to type",
  enterKeyHint: "done",
});
let onNameChange = null;
nameInput.addEventListener("input", () => {
  const clean = nameInput.value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 12);
  if (clean !== nameInput.value) nameInput.value = clean;
  onNameChange?.(clean);
});
nameInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    ev.preventDefault();
    nameInput.blur();
    tapKey("enter");
  }
});

document.body.append(controls, toggle, nameInput);

// The canvas fills the window and KAPLAY letterboxes the 800x600 game inside it.
function gameRect() {
  const r = canvas.getBoundingClientRect();
  const s = Math.min(r.width / 800, r.height / 600);
  return { s, x: r.left + (r.width - 800 * s) / 2, y: r.top + (r.height - 600 * s) / 2 };
}

// Keep the name field lined up with the name box drawn on the canvas at (400, 310).
function placeNameInput() {
  const { s, x, y } = gameRect();
  Object.assign(nameInput.style, {
    left: `${x + (400 - 150) * s}px`,
    top: `${y + (310 - 22) * s}px`,
    width: `${300 * s}px`,
    height: `${44 * s}px`,
    fontSize: `${Math.max(16, 22 * s)}px`,
  });
}
window.addEventListener("resize", placeNameInput);

let nameInputWanted = false;
function refreshNameInput() {
  const show = nameInputWanted && touchMode;
  nameInput.style.display = show ? "block" : "none";
  if (show) placeNameInput();
  else if (document.activeElement === nameInput) nameInput.blur();
}

// Called by the naming scene. `onChange(name)` receives sanitized text.
export function showNameInput(value, onChange) {
  nameInputWanted = true;
  onNameChange = onChange;
  nameInput.value = value;
  refreshNameInput();
}
export function hideNameInput() {
  nameInputWanted = false;
  onNameChange = null;
  refreshNameInput();
}

export function setTouchMode(on) {
  touchMode = on;
  document.body.classList.toggle("touch-mode", on);
  toggle.textContent = on ? "Touch: ON" : "Touch: OFF";
  toggle.setAttribute("aria-pressed", String(on));
  refreshNameInput();
}
setTouchMode(touchMode);

// Stop pinch/double-tap zoom and page scrolling from fighting the game.
document.addEventListener("gesturestart", (ev) => ev.preventDefault());
document.addEventListener("dblclick", (ev) => ev.preventDefault());
