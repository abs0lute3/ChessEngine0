# ChessEngine0

Chess Engine — chess.com-style board with Neo pieces, legal-move dots, sounds, animations and custom engine upload.

## Run locally
Just open `index.html`, or serve the folder:
```
bunx serve .
```

## Deploy to Vercel
- Framework preset: Other, no build command, output: `.`
- Or: `vercel deploy --prod --cwd . --yes`

## Custom engine upload
- Engine tab -> Upload file(s) / folder / .zip
- Works with extracted (.js + .wasm + .nnue) or unextracted (.zip)
- Native `.exe` (like stockfish19.exe) cannot run in browsers — use a WASM build from https://github.com/nmrugg/stockfish.js
- Uploads persist in IndexedDB.

## Features
- Click or drag, legal-move dots + capture rings (chess.com style)
- Neo pieces, smooth slide animations, last-move / check / selected highlights, coordinates
- Sounds: move, capture, castle, promote, check, game start/end
- Play vs engine, analysis mode, eval bar, PGN copy/download, game review with accuracy

