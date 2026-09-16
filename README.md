# ChessEngine0

Chess Engine — official **Stockfish 17.1** built in, chess.com-style board with
Neo pieces, legal-move dots, arrows, clocks, captured trays, sounds,
animations, live move markers (!! ! ★ ?! ? ??) and custom engine upload.

Private board — password: `55221144`

## Run locally (needs http, not file://)
The built-in engine is multithreaded WASM and needs cross-origin isolation,
so serve the folder:
```
bunx serve .
```
Then open the printed URL. (`file://` works only with the local bridge below.)

## Built-in engine: Stockfish 17.1
Official Stockfish 17.1 (WASM + NNUE) ships in `engine/` and runs entirely in
your browser — no server, nothing to install. First load downloads ~78MB of
engine + neural nets (cached by the browser afterwards).

## Stockfish 19 (your stockfish19.exe, full power)
`stockfish19.exe` is a native command-line UCI program (stdin/stdout text).
Browsers can't run `.exe`, so the page uses a tiny local bridge:

```
# with Bun (installed):
bun engine-bridge.mjs --engine "C:\Users\betza\Downloads\stockfish19.exe"

# or with Python 3 (standard library only):
python engine-bridge.py --engine "C:\Users\betza\Downloads\stockfish19.exe"
```

Then press **Connect to local Stockfish 19** in the Engine tab
(auto-connect is attempted on load).

## Custom engine upload (browser WASM/JS builds)
- Engine tab -> Upload file(s) / folder / .zip
- Works with extracted (.js + .wasm + .nnue) or unextracted (.zip)
- Uploads persist in IndexedDB.

## Features
- Click or drag, legal-move dots + capture rings (chess.com style)
- Right-click drag: arrows (Shift=red, Alt=blue), right-click: circle marks
- Engine best-move arrow + Hint button
- Game clocks (Bullet → Classical) + player cards, captured trays + material
- Live move markers during play (!! ! ★ 📖 ✓ ?! ? ??) with chess.com colors
- Full game review with accuracy + move classifications
- Neo pieces, smooth slide animations, last-move / check / selected highlights
- Sounds: move, capture, castle, promote, check, low time, correct/incorrect
- Play vs engine, analysis mode, eval bar, PGN + FEN copy/download, resign
- Password-protected board

## Deploy to Vercel
- Framework preset: Other, no build command, output: `.`
- `vercel.json` already sets COOP/COEP headers (required by the WASM engine)
- Or: `vercel deploy --prod --cwd . --yes`
