#!/usr/bin/env python3
"""ChessEngine0 — local Stockfish 19 bridge.

Your stockfish19.exe is a native command-line UCI program: it reads text
commands on stdin and prints replies on stdout. Browsers cannot run .exe
files, so this tiny server (standard library only) drives the engine for
you and exposes it to the ChessEngine0 page over HTTP:

    python engine-bridge.py --engine "C:\\Users\\betza\\Downloads\\stockfish19.exe"

Then open the page and press "Connect to local Stockfish 19"
(or wait for auto-connect). Endpoints:

    GET /status                          -> {"ok": true, "engine": "Stockfish 19"}
    GET /analyse?fen=...&depth=12       -> {"best": "e2e4", "cp": 24, "mate": null}
    GET /analyse?fen=...&movetime=500   -> same, time-limited search

No third-party packages required.
"""

import argparse
import json
import queue
import re
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

INFO_RE = re.compile(r"score\s+(cp|mate)\s+(-?\d+)")


class UciEngine:
    def __init__(self, path, threads=4, hash_mb=256):
        self.proc = subprocess.Popen(
            [path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
        )
        self.lock = threading.Lock()
        self.name = "Stockfish"
        self._cmd("uci")
        self._wait_for("uciok")
        self._cmd(f"setoption name Threads value {threads}")
        self._cmd(f"setoption name Hash value {hash_mb}")
        self._cmd("isready")
        self._wait_for("readyok")

    def _cmd(self, text):
        self.proc.stdin.write(text + "\n")
        self.proc.stdin.flush()

    def _wait_for(self, token):
        while True:
            line = self.proc.stdout.readline()
            if not line:
                raise RuntimeError("engine closed stdout")
            line = line.strip()
            if line.startswith("id name "):
                self.name = line[len("id name "):]
            if token in line:
                return

    def analyse(self, fen, depth=12, movetime=0):
        """Run one search. Score is from the side-to-move's perspective."""
        with self.lock:
            self._cmd("stop")
            self._cmd("ucinewgame")
            self._cmd("isready")
            self._wait_for("readyok")
            self._cmd(f"position fen {fen}")
            if movetime and movetime > 0:
                self._cmd(f"go movetime {int(movetime)}")
            else:
                self._cmd(f"go depth {max(1, int(depth))}")
            cp, mate, best = 0, None, None
            while True:
                line = self.proc.stdout.readline()
                if not line:
                    break
                line = line.strip()
                m = INFO_RE.search(line)
                if m and line.startswith("info"):
                    if m.group(1) == "mate":
                        mate = int(m.group(2))
                        cp = 100000 if mate > 0 else -100000
                    else:
                        mate = None
                        cp = int(m.group(2))
                if line.startswith("bestmove"):
                    parts = line.split()
                    best = parts[1] if len(parts) > 1 else None
                    if best in (None, "(none)"):
                        best = None
                    break
            return {"best": best, "cp": cp, "mate": mate}


ENGINE = None


class Handler(BaseHTTPRequestHandler):
    server_version = "ChessEngine0Bridge/1.0"

    def _send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/status":
            self._send_json({"ok": True, "engine": ENGINE.name if ENGINE else "?"})
            return
        if url.path == "/analyse":
            q = parse_qs(url.query)
            fen = (q.get("fen") or [""])[0]
            if not fen:
                self._send_json({"error": "missing fen"}, 400)
                return
            try:
                depth = int((q.get("depth") or ["12"])[0])
            except ValueError:
                depth = 12
            try:
                movetime = int((q.get("movetime") or ["0"])[0])
            except ValueError:
                movetime = 0
            try:
                self._send_json(ENGINE.analyse(fen, depth, movetime))
            except Exception as exc:  # noqa: BLE001
                self._send_json({"error": str(exc)}, 500)
            return
        self._send_json({"error": "unknown endpoint"}, 404)

    def log_message(self, *args):
        pass


def main():
    ap = argparse.ArgumentParser(description="ChessEngine0 Stockfish 19 bridge")
    ap.add_argument("--engine", default=r"C:\Users\betza\Downloads\stockfish19.exe",
                    help="path to stockfish19.exe")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--hash", type=int, default=256, help="hash table MB")
    args = ap.parse_args()

    global ENGINE
    print(f"Starting {args.engine} ...")
    ENGINE = UciEngine(args.engine, threads=args.threads, hash_mb=args.hash)
    print(f"Engine ready: {ENGINE.name}")
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Bridge listening on http://127.0.0.1:{args.port}")
    print("Open ChessEngine0 and press 'Connect to local Stockfish 19'.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")


if __name__ == "__main__":
    main()
