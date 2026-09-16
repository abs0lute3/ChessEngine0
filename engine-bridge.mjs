#!/usr/bin/env bun
/* ChessEngine0 — local Stockfish 19 bridge (Bun/Node version).
 *
 * Your stockfish19.exe is a native command-line UCI program (stdin/stdout
 * text commands). Browsers can't run .exe files, so this tiny server drives
 * the engine for you and exposes it to the ChessEngine0 page over HTTP.
 *
 *   bun engine-bridge.mjs --engine "C:\Users\betza\Downloads\stockfish19.exe"
 *
 * Then open the page and press "Connect to local Stockfish 19".
 *
 *   GET /status                        -> {"ok":true,"engine":"Stockfish 19"}
 *   GET /analyse?fen=...&depth=12     -> {"best":"e2e4","cp":24,"mate":null}
 *   GET /analyse?fen=...&movetime=500 -> same, time-limited search
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import readline from "node:readline";

const args = process.argv.slice(2);
function opt(name, def) {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : def;
}
const ENGINE_PATH = opt("--engine", "C:\\Users\\betza\\Downloads\\stockfish19.exe");
const PORT = parseInt(opt("--port", "8765"), 10);
const THREADS = opt("--threads", "4");
const HASH = opt("--hash", "256");

const child = spawn(ENGINE_PATH, [], { stdio: ["pipe", "pipe", "ignore"] });
child.on("error", (e) => { console.error("Failed to start engine:", e.message); process.exit(1); });

const rl = readline.createInterface({ input: child.stdout });
const waiters = []; // {token, resolve}
let engineName = "Stockfish";
rl.on("line", (raw) => {
  const line = raw.trim();
  if (line.startsWith("id name ")) engineName = line.slice(8);
  for (let i = waiters.length - 1; i >= 0; i--) {
    if (line.includes(waiters[i].token)) { waiters[i].resolve(line); waiters.splice(i, 1); }
  }
  if (pendingSearch && (line.startsWith("info ") || line.startsWith("bestmove"))) {
    pendingSearch.lines.push(line);
    if (line.startsWith("bestmove")) {
      const p = pendingSearch; pendingSearch = null; finishSearch(p);
    }
  }
});
function finishSearch(p) {
  let cp = 0, mate = null, best = null;
  for (const l of p.lines) {
    const m = l.match(/score\s+(cp|mate)\s+(-?\d+)/);
    if (m && l.startsWith("info")) {
      if (m[1] === "mate") { mate = parseInt(m[2], 10); cp = mate > 0 ? 100000 : -100000; }
      else { mate = null; cp = parseInt(m[2], 10); }
    }
    if (l.startsWith("bestmove")) {
      const parts = l.split(/\s+/);
      best = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
    }
  }
  p.resolve({ best, cp, mate });
}
function send(cmd) { child.stdin.write(cmd + "\n"); }
function waitFor(token) { return new Promise((res) => waiters.push({ token, resolve: res })); }

let pendingSearch = null;
let chain = Promise.resolve();
function analyse(fen, depth, movetime) {
  const run = () => new Promise((resolve) => {
    pendingSearch = { lines: [], resolve };
    send("stop");
    send("ucinewgame");
    send("isready");
    waitFor("readyok").then(() => {
      send(`position fen ${fen}`);
      send(movetime > 0 ? `go movetime ${movetime}` : `go depth ${Math.max(1, depth)}`);
    });
  });
  chain = chain.then(run, run);
  return chain;
}

send("uci");
await waitFor("uciok");
send(`setoption name Threads value ${THREADS}`);
send(`setoption name Hash value ${HASH}`);
send("isready");
await waitFor("readyok");
console.log(`Engine ready: ${engineName}`);

createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, engine: engineName }));
  } else if (u.pathname === "/analyse") {
    const fen = u.searchParams.get("fen") || "";
    if (!fen) { res.writeHead(400, { "Content-Type": "application/json" }); res.end('{"error":"missing fen"}'); return; }
    const depth = parseInt(u.searchParams.get("depth") || "12", 10) || 12;
    const movetime = parseInt(u.searchParams.get("movetime") || "0", 10) || 0;
    analyse(fen, depth, movetime).then((j) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(j));
    }).catch((e) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end('{"error":"unknown endpoint"}');
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Bridge listening on http://127.0.0.1:${PORT}`);
  console.log("Open ChessEngine0 and press 'Connect to local Stockfish 19'.");
});
