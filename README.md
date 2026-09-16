# ChessEngine0

Chess Engine — Stockfish 19-ready, chess.com-style board with Neo pieces,
legal-move dots, arrows, captured trays, sounds, animations, live move
markers (!! ! ★ ?! ? ??) and custom engine upload.

Private board — password: `55221144`

## Run locally
Just open `index.html`, or serve the folder:
```
bunx serve .
```

## Stockfish 19 (your stockfish19.exe)
`stockfish19.exe` is a native command-line UCI program: it reads text
commands on stdin and prints replies on stdout. Browsers cannot run `.exe`
files, so the page uses a tiny local bridge (no dependencies):

```
# with Bun (installed):
bun engine-bridge.mjs --engine "C:\Users\betza\Downloads\stockfish19.exe"

# or with Python 3 (standard library only):
python engine-bridge.py --engine "C:\Users\betza\Downloads\stockfish19.exe"
```

Then press **Connect to local Stockfish 19** in the Engine tab
(auto-connect is attempted on load). Without the bridge, the built-in
browser engine is used automatically.

## Custom engine upload (browser WASM/JS builds)
- Engine tab -> Upload file(s) / folder / .zip
- Works with extracted (.js + .wasm + .nnue) or unextracted (.zip)
- Uploads persist in IndexedDB.

## Features
- Click or drag, legal-move dots + capture rings (chess.com style)
- Right-click drag: arrows (Shift=red, Alt=blue), right-click: circle marks
- Engine best-move arrow + Hint button
- Captured-piece trays with material score
- Live move markers during play (!! ! ★ B ✓ ?! ? ??) with chess.com colors + popup
- Full game review with accuracy + move classifications
- Neo pieces, smooth slide animations, last-move / check / selected highlights
- Sounds: move, capture, castle, promote, check, game start/end, correct/incorrect
- Play vs engine, analysis mode, eval bar, PGN + FEN copy/download, resign
- Password-protected board

## Deploy to Vercel
- Framework preset: Other, no build command, output: `.`
- Or: `vercel deploy --prod --cwd . --yes`
