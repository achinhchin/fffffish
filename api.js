// Accounts, saves and the global scoreboard, stored in SQLite (node:sqlite).
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SESSION_DAYS = 30;
const MAX_BODY = 64 * 1024;
const SPECIES_COUNT = 20;

export function createApi(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "fffffish.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pass_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saves (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    -- best-ever stats per player; survive starting a new game
    CREATE TABLE IF NOT EXISTS scores (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      level INTEGER NOT NULL DEFAULT 1,
      caught INTEGER NOT NULL DEFAULT 0,
      species INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 0,
      legend_time REAL,
      legends INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);

  const q = {
    userByName: db.prepare("SELECT id, username, pass_hash FROM users WHERE username = ?"),
    insertUser: db.prepare("INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)"),
    insertSession: db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"),
    sessionUser: db.prepare(
      "SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?",
    ),
    deleteSession: db.prepare("DELETE FROM sessions WHERE token = ?"),
    purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
    getSave: db.prepare("SELECT data FROM saves WHERE user_id = ?"),
    putSave: db.prepare(
      "INSERT INTO saves (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    ),
    deleteSave: db.prepare("DELETE FROM saves WHERE user_id = ?"),
    upsertScore: db.prepare(`
      INSERT INTO scores (user_id, level, caught, species, coins, legend_time, legends, updated_at)
      VALUES (:uid, :level, :caught, :species, :coins, :legend_time, :legends, :now)
      ON CONFLICT(user_id) DO UPDATE SET
        level = MAX(level, excluded.level),
        caught = MAX(caught, excluded.caught),
        species = MAX(species, excluded.species),
        coins = MAX(coins, excluded.coins),
        legend_time = CASE
          WHEN excluded.legend_time IS NULL THEN legend_time
          WHEN legend_time IS NULL THEN excluded.legend_time
          ELSE MIN(legend_time, excluded.legend_time) END,
        legends = legends + excluded.legends,
        updated_at = excluded.updated_at
    `),
    board: db.prepare(`
      SELECT u.username, s.level, s.caught, s.species, s.legend_time, s.legends,
        ROW_NUMBER() OVER (ORDER BY s.legend_time IS NULL, s.legend_time, s.level DESC, s.caught DESC, s.updated_at) AS rank
      FROM scores s JOIN users u ON u.id = s.user_id
      ORDER BY rank LIMIT 20
    `),
    myRank: db.prepare(`
      SELECT * FROM (
        SELECT s.user_id, u.username, s.level, s.caught, s.species, s.legend_time, s.legends,
          ROW_NUMBER() OVER (ORDER BY s.legend_time IS NULL, s.legend_time, s.level DESC, s.caught DESC, s.updated_at) AS rank
        FROM scores s JOIN users u ON u.id = s.user_id
      ) WHERE user_id = ?
    `),
  };
  q.purgeSessions.run(Date.now());

  // ---------- helpers ----------
  const scryptAsync = (pw, salt) =>
    new Promise((resolve, reject) => crypto.scrypt(pw, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));

  async function hashPassword(pw) {
    const salt = crypto.randomBytes(16);
    const key = await scryptAsync(pw, salt);
    return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
  }
  async function checkPassword(pw, stored) {
    const [, saltHex, keyHex] = stored.split("$");
    const key = await scryptAsync(pw, Buffer.from(saltHex, "hex"));
    const expected = Buffer.from(keyHex, "hex");
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
  }

  function json(res, status, body, headers = {}) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
    res.end(JSON.stringify(body));
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      if (!(req.headers["content-type"] || "").includes("application/json")) {
        reject(Object.assign(new Error("expected JSON"), { status: 415 }));
        return;
      }
      let size = 0;
      let tooBig = false;
      const chunks = [];
      req.on("data", (c) => {
        if (tooBig) return; // keep draining so the 413 response can be sent
        size += c.length;
        if (size > MAX_BODY) {
          tooBig = true;
          chunks.length = 0;
          reject(Object.assign(new Error("body too large"), { status: 413 }));
        } else chunks.push(c);
      });
      req.on("end", () => {
        if (tooBig) return;
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
        } catch {
          reject(Object.assign(new Error("invalid JSON"), { status: 400 }));
        }
      });
      req.on("error", reject);
    });
  }

  function cookies(req) {
    const out = {};
    for (const part of (req.headers.cookie || "").split(";")) {
      const i = part.indexOf("=");
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
  }
  function sessionCookie(req, token, maxAge) {
    const secure = req.socket.encrypted ? "; Secure" : "";
    return `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
  }
  function currentUser(req) {
    const token = cookies(req).session;
    if (!token) return null;
    return q.sessionUser.get(token, Date.now()) || null;
  }
  function startSession(req, userId) {
    const token = crypto.randomBytes(32).toString("hex");
    q.insertSession.run(token, userId, Date.now() + SESSION_DAYS * 864e5);
    return sessionCookie(req, token, SESSION_DAYS * 86400);
  }

  // simple per-IP limiter for login/signup
  const attempts = new Map();
  function rateLimited(req) {
    const ip = req.socket.remoteAddress || "?";
    const now = Date.now();
    const a = attempts.get(ip);
    if (!a || a.reset < now) {
      attempts.set(ip, { count: 1, reset: now + 10 * 60e3 });
      return false;
    }
    a.count++;
    return a.count > 30;
  }

  const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));

  // Stats for the scoreboard, clamped so a hand-edited save can't post absurd values.
  function statsFrom(save, legendTime) {
    return {
      level: int(save.level, 1, 999),
      caught: int(save.caughtCount, 0, 1e6),
      species: int(save.journal && typeof save.journal === "object" ? Object.keys(save.journal).length : 0, 0, SPECIES_COUNT),
      coins: int(save.money, 0, 1e9),
      legend_time: legendTime == null ? null : Math.max(10, Math.min(1e7, Number(legendTime) || 1e7)),
      legends: legendTime == null ? 0 : 1,
    };
  }

  const validName = (s) => typeof s === "string" && /^[A-Za-z0-9_]{3,16}$/.test(s);
  const validPass = (s) => typeof s === "string" && s.length >= 6 && s.length <= 100;

  // ---------- routes ----------
  const routes = {
    "POST /api/signup": async (req, res) => {
      if (rateLimited(req)) return json(res, 429, { error: "Too many attempts, try again later." });
      const { username, password } = await readJson(req);
      if (!validName(username)) return json(res, 400, { error: "Username: 3-16 letters, numbers or _" });
      if (!validPass(password)) return json(res, 400, { error: "Password must be at least 6 characters." });
      if (q.userByName.get(username)) return json(res, 409, { error: "That username is taken." });
      const hash = await hashPassword(password);
      let id;
      try {
        id = Number(q.insertUser.run(username, hash, Date.now()).lastInsertRowid);
      } catch {
        return json(res, 409, { error: "That username is taken." });
      }
      json(res, 200, { username, save: null }, { "Set-Cookie": startSession(req, id) });
    },

    "POST /api/login": async (req, res) => {
      if (rateLimited(req)) return json(res, 429, { error: "Too many attempts, try again later." });
      const { username, password } = await readJson(req);
      const user = typeof username === "string" ? q.userByName.get(username) : null;
      if (!user || typeof password !== "string" || !(await checkPassword(password, user.pass_hash))) {
        return json(res, 401, { error: "Wrong username or password." });
      }
      const row = q.getSave.get(user.id);
      json(res, 200, { username: user.username, save: row ? JSON.parse(row.data) : null }, { "Set-Cookie": startSession(req, user.id) });
    },

    "POST /api/logout": async (req, res) => {
      const token = cookies(req).session;
      if (token) q.deleteSession.run(token);
      json(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(req, "", 0) });
    },

    "GET /api/me": async (req, res) => {
      const user = currentUser(req);
      if (!user) return json(res, 401, { error: "not logged in" });
      const row = q.getSave.get(user.id);
      json(res, 200, { username: user.username, save: row ? JSON.parse(row.data) : null });
    },

    // body: { save } to store progress, or { finished: seconds } when the Legend is caught
    "PUT /api/save": async (req, res) => {
      const user = currentUser(req);
      if (!user) return json(res, 401, { error: "not logged in" });
      const body = await readJson(req);
      const now = Date.now();
      const save = body.save;
      if (!save || typeof save !== "object" || Array.isArray(save)) return json(res, 400, { error: "missing save" });
      const finished = body.finished ?? null;
      q.upsertScore.run({ uid: user.id, now, ...statsFrom(save, finished) });
      q.putSave.run(user.id, JSON.stringify(save), now); // kept after the ending: players can keep fishing
      json(res, 200, { ok: true });
    },

    "DELETE /api/save": async (req, res) => {
      const user = currentUser(req);
      if (!user) return json(res, 401, { error: "not logged in" });
      q.deleteSave.run(user.id);
      json(res, 200, { ok: true });
    },

    "GET /api/scoreboard": async (req, res) => {
      const user = currentUser(req);
      const row = user ? q.myRank.get(user.id) : null;
      const me = row ? { ...row, user_id: undefined } : null;
      json(res, 200, { top: q.board.all(), me });
    },
  };

  return async function handleApi(req, res, urlPath) {
    const route = routes[`${req.method} ${urlPath}`];
    if (!route) return json(res, 404, { error: "not found" });
    try {
      await route(req, res);
    } catch (err) {
      if (!res.headersSent) json(res, err.status || 500, { error: err.status ? err.message : "server error" });
      if (!err.status) console.error("[api]", err);
    }
  };
}
