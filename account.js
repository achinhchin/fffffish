// Login / signup, cloud saves and the global scoreboard (talks to /api on our server).
import { state } from "./data.js";

const canvas = document.querySelector("canvas");
const AUTOSAVE_MS = 5000;

export const account = { username: null, save: null, guest: false, online: true };
export const isLoggedIn = () => !!account.username;
export const hasSave = () => isLoggedIn() && !!account.save;

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    // non-JSON (e.g. server without API)
  }
  if (!res.ok) throw Object.assign(new Error(data.error || `request failed (${res.status})`), { status: res.status });
  return data;
}

// ---------- save snapshots ----------
const SAVE_KEYS = ["playerName", "money", "rodIndex", "ownedRods", "caughtCount", "level", "xp", "skillPoints", "skills", "technique", "journal"];

export function snapshotState() {
  const snap = {};
  for (const k of SAVE_KEYS) snap[k] = state[k];
  snap.elapsed = state.gameStartTime ? Math.max(0, time() - state.gameStartTime) : 0;
  return snap;
}

// Copies a save into the live state; returns the play time it had.
export function applySave(save) {
  for (const k of SAVE_KEYS) {
    if (save[k] !== undefined) state[k] = structuredClone(save[k]);
  }
  if (!Array.isArray(state.ownedRods) || !state.ownedRods.includes(state.rodIndex)) state.ownedRods = [0, state.rodIndex];
  return Number(save.elapsed) || 0;
}

// ---------- autosave ----------
let playing = false;
let lastSent = "";
export function setPlaying(on) {
  playing = on;
  if (on) lastSent = "";
}

async function pushSave(keepalive = false) {
  if (!isLoggedIn() || !playing) return;
  const snap = snapshotState();
  const body = JSON.stringify({ save: snap });
  // skip if nothing but the clock changed
  const key = JSON.stringify({ ...snap, elapsed: 0 });
  if (key === lastSent) return;
  lastSent = key;
  account.save = snap;
  try {
    await fetch("/api/save", { method: "PUT", headers: { "Content-Type": "application/json" }, body, keepalive, credentials: "same-origin" });
    setStatus("");
  } catch {
    lastSent = "";
    setStatus("offline - progress not saved");
  }
}
export const saveNow = () => pushSave();
setInterval(pushSave, AUTOSAVE_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") pushSave(true);
});
window.addEventListener("pagehide", () => pushSave(true));

// Legend caught: records best stats on the scoreboard and ends the run.
export async function finishRun(elapsed) {
  if (!isLoggedIn()) return;
  playing = false;
  const save = snapshotState();
  account.save = null;
  try {
    await api("PUT", "/api/save", { save, finished: elapsed });
  } catch {
    setStatus("offline - result not recorded");
  }
}

// ---------- DOM ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function button(label, cls, onClick) {
  const b = el("button", cls, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

// top-right bar on menu screens
const bar = el("div", "account-bar");
const barName = el("span", "account-name");
const barStatus = el("span", "account-status");
const btnBoard = button("Scoreboard", "account-link", () => openScoreboard());
const btnNew = button("New game", "account-link", async () => {
  if (!confirm("Start a new game? Your current save will be deleted.")) return;
  try {
    await api("DELETE", "/api/save");
    account.save = null;
  } catch (e) {
    alert(e.message);
  }
  renderBar();
});
const btnAuth = button("", "account-link", () => (isLoggedIn() ? logout() : openAuth()));
bar.append(barName, btnBoard, btnNew, btnAuth, barStatus);

function setStatus(msg) {
  barStatus.textContent = msg;
}
function renderBar() {
  barName.textContent = isLoggedIn() ? account.username : account.guest ? "Guest" : "";
  btnAuth.textContent = isLoggedIn() ? "Log out" : "Log in";
  btnNew.style.display = hasSave() ? "" : "none";
  btnBoard.style.display = account.online ? "" : "none";
  btnAuth.style.display = account.online ? "" : "none";
}

// modal shell
function modal(title) {
  const back = el("div", "modal-back");
  const box = el("div", "modal");
  box.append(el("h2", "modal-title", title));
  back.append(box);
  back.addEventListener("pointerdown", (e) => {
    if (e.target === back && back.dataset.dismiss !== "no") close();
  });
  const close = () => {
    back.remove();
    canvas.focus();
  };
  document.body.append(back);
  return { back, box, close };
}

// ---------- login / signup ----------
let authOpen = false;
export function openAuth() {
  if (authOpen) return;
  authOpen = true;
  let mode = "login";
  const { back, box, close } = modal("Welcome, fisherfolk");
  back.dataset.dismiss = "no";
  const tabs = el("div", "modal-tabs");
  const tabLogin = button("Log in", "tab on", () => setMode("login"));
  const tabSignup = button("Sign up", "tab", () => setMode("signup"));
  tabs.append(tabLogin, tabSignup);

  const form = el("form", "auth-form");
  const user = el("input");
  Object.assign(user, { placeholder: "username", autocomplete: "username", maxLength: 16, required: true, autocapitalize: "off", spellcheck: false });
  const pass = el("input");
  Object.assign(pass, { type: "password", placeholder: "password", autocomplete: "current-password", maxLength: 100, required: true });
  const err = el("p", "auth-error");
  const submit = el("button", "primary", "Log in");
  submit.type = "submit";
  const hint = el("p", "auth-hint", "Your catches, rods and skills are saved to your account.");
  form.append(user, pass, err, submit);

  const guest = button("Play as guest (no saving)", "link", () => {
    account.guest = true;
    try {
      sessionStorage.setItem("fffffish.guest", "1");
    } catch {
      // ignore
    }
    done();
  });
  box.append(tabs, form, hint, guest);

  function setMode(m) {
    mode = m;
    tabLogin.classList.toggle("on", m === "login");
    tabSignup.classList.toggle("on", m === "signup");
    submit.textContent = m === "login" ? "Log in" : "Create account";
    pass.autocomplete = m === "login" ? "current-password" : "new-password";
    hint.textContent =
      m === "login" ? "Your catches, rods and skills are saved to your account." : "Username: 3-16 letters, numbers or _. Password: 6+ characters.";
    err.textContent = "";
  }
  function done() {
    authOpen = false;
    close();
    renderBar();
    onAccountChange?.();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    submit.disabled = true;
    try {
      const data = await api("POST", mode === "login" ? "/api/login" : "/api/signup", { username: user.value.trim(), password: pass.value });
      account.username = data.username;
      account.save = data.save;
      account.guest = false;
      done();
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      submit.disabled = false;
    }
  });
  setTimeout(() => user.focus(), 50);
}

async function logout() {
  await pushSave();
  try {
    await api("POST", "/api/logout");
  } catch {
    // ignore
  }
  account.username = null;
  account.save = null;
  renderBar();
  onAccountChange?.();
  openAuth();
}

// ---------- scoreboard ----------
function fmtTime(sec) {
  if (sec == null) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
export async function openScoreboard() {
  const { box, close } = modal("Global Scoreboard");
  const body = el("div", "board-body", "Loading...");
  box.append(body, button("Close", "primary", close));
  try {
    const { top, me } = await api("GET", "/api/scoreboard");
    body.textContent = "";
    if (top.length === 0) {
      body.append(el("p", "auth-hint", "No scores yet. Be the first!"));
      return;
    }
    const table = el("table", "board");
    const head = el("tr");
    for (const h of ["#", "Player", "Legend", "Lv", "Fish", "Species"]) head.append(el("th", "", h));
    table.append(head);
    const row = (r) => {
      const tr = el("tr", r.username === account.username ? "me" : "");
      tr.append(
        el("td", "", r.rank),
        el("td", "", r.username),
        el("td", r.legend_time != null ? "gold" : "", fmtTime(r.legend_time)),
        el("td", "", r.level),
        el("td", "", r.caught),
        el("td", "", `${r.species}/12`),
      );
      return tr;
    };
    top.forEach((r) => table.append(row(r)));
    if (me && !top.some((r) => r.username === me.username)) {
      const gap = el("tr");
      gap.append(Object.assign(el("td", "", "..."), { colSpan: 6 }));
      table.append(gap, row(me));
    }
    body.append(table);
    body.append(el("p", "auth-hint", "Ranked by fastest Legend catch, then level, then fish caught."));
  } catch (e) {
    body.textContent = e.message;
  }
}

// ---------- menu screens ----------
let onAccountChange = null;
// Shows the account bar (intro / win). `onChange` runs after login, logout or new game.
export function showAccountBar(on, onChange = null) {
  bar.style.display = on ? "flex" : "none";
  onAccountChange = on ? onChange : null;
  if (on) {
    renderBar();
    if (!isLoggedIn() && !account.guest && account.online && ready) openAuth();
  }
}

// ---------- startup ----------
let ready = false;
try {
  account.guest = sessionStorage.getItem("fffffish.guest") === "1";
} catch {
  // ignore
}
bar.style.display = "none";
document.body.append(bar);
try {
  const me = await api("GET", "/api/me");
  account.username = me.username;
  account.save = me.save;
} catch (e) {
  // 401 = just not logged in; anything else = no API (e.g. static hosting)
  if (e.status !== 401) account.online = false;
}
ready = true;
renderBar();
