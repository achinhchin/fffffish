// Minimal zero-dependency static file server for local dev.
// Serves HTTP on HTTP_PORT (2025) and HTTPS on HTTPS_PORT (2026).
// HTTPS is optional: if no certificate can be found or generated, or it fails
// its startup self-check, the HTTP server keeps running on its own.
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HTTP_PORT = Number(process.env.HTTP_PORT || process.env.PORT || 2025);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 2026);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.join(ROOT, "certs");

// Where to look for a certificate, in order: SSL_CERT/SSL_KEY env vars,
// cert.pem + key.pem in the project folder, then certs/ (auto-generated).
function findCert() {
  if (process.env.SSL_CERT || process.env.SSL_KEY) {
    return { cert: process.env.SSL_CERT, key: process.env.SSL_KEY, from: "SSL_CERT / SSL_KEY" };
  }
  for (const dir of [ROOT, CERT_DIR]) {
    const cert = path.join(dir, "cert.pem");
    const key = path.join(dir, "key.pem");
    if (fs.existsSync(cert) && fs.existsSync(key)) return { cert, key, from: path.relative(ROOT, cert) };
  }
  return null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain" });
  res.end(body);
}

function handler(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    send(res, 400, "Bad Request");
    return;
  }
  const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
  const rel = path.relative(ROOT, filePath);

  // Stay inside the project, and never serve dotfiles (.git) or TLS certificates/keys.
  if (
    rel.startsWith("..") ||
    path.isAbsolute(rel) ||
    rel.split(path.sep).some((p) => p.startsWith(".")) ||
    rel.startsWith("certs") ||
    path.extname(rel).toLowerCase() === ".pem"
  ) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "404 Not Found: " + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

// Listen without letting a bind error (e.g. port in use) crash the process.
function listen(server, port, label) {
  return new Promise((resolve) => {
    server.once("error", (err) => {
      console.warn(`[${label}] could not start on port ${port}: ${err.message}`);
      resolve(false);
    });
    server.listen(port, () => resolve(true));
  });
}

// ---------- HTTP ----------
const httpServer = http.createServer(handler);
if (await listen(httpServer, HTTP_PORT, "http")) {
  console.log(`fffffish running at http://localhost:${HTTP_PORT}`);
}

// ---------- HTTPS ----------
function loadOrCreateCert() {
  let found = findCert();
  if (!found) {
    console.log("[https] no certificate found, generating a self-signed one in certs/ ...");
    found = { cert: path.join(CERT_DIR, "cert.pem"), key: path.join(CERT_DIR, "key.pem"), from: "certs/cert.pem (self-signed)" };
    fs.mkdirSync(CERT_DIR, { recursive: true });
    execFileSync(
      "openssl",
      [
        "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "825",
        "-keyout", found.key, "-out", found.cert,
        "-subj", "/CN=localhost",
        "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
      ],
      { stdio: "ignore" },
    );
  }
  console.log(`[https] using certificate from ${found.from}`);
  return { cert: fs.readFileSync(found.cert), key: fs.readFileSync(found.key) };
}

// Fetch the index page over HTTPS to confirm TLS actually works end to end.
function selfCheck(port) {
  return new Promise((resolve) => {
    const req = https.get({ host: "127.0.0.1", port, path: "/", rejectUnauthorized: false, timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200 ? null : `unexpected status ${res.statusCode}`);
    });
    req.on("timeout", () => req.destroy(new Error("timed out")));
    req.on("error", (err) => resolve(err.message));
  });
}

async function startHttps() {
  let creds;
  try {
    creds = loadOrCreateCert();
  } catch (err) {
    console.warn(`[https] disabled, no usable certificate: ${err.message}`);
    return;
  }

  let httpsServer;
  try {
    httpsServer = https.createServer(creds, handler);
  } catch (err) {
    console.warn(`[https] disabled, invalid certificate/key: ${err.message}`);
    return;
  }
  // Bad handshakes from clients should never take the server down.
  httpsServer.on("tlsClientError", () => {});

  if (!(await listen(httpsServer, HTTPS_PORT, "https"))) return;
  httpsServer.on("error", (err) => console.warn(`[https] ${err.message}`));

  const problem = await selfCheck(HTTPS_PORT);
  if (problem) {
    console.warn(`[https] self-check failed (${problem}), shutting HTTPS down; HTTP keeps running`);
    httpsServer.close();
    return;
  }
  console.log(`fffffish running at https://localhost:${HTTPS_PORT} (verified)`);
}

await startHttps();
