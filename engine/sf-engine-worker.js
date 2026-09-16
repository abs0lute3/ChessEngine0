/* ChessEngine0 built-in engine worker — official Stockfish 17.1 (WASM).
 * ES-module worker: bridges the engine (uci()/listen API) to the classic
 * UCI-over-postMessage protocol the page already speaks.
 * Same-origin only (needs COOP/COEP for threads — set in vercel.json). */
import Sf17179Web from './sf171-79.js';

let sf = null;
const queued = [];
let ready = false;

onmessage = (e) => {
  if (!ready) queued.push(e.data);
  else if (sf) { try { sf.uci(e.data); } catch (err) { postMessage('__error__ ' + err); } }
};

try {
  sf = await Sf17179Web({});
  sf.listen = (line) => postMessage(line);
  sf.onError = (msg) => postMessage('__error__ ' + msg);
  // Load NNUE nets shipped next to this worker (big first, then small).
  for (let idx = 0; idx <= 1; idx++) {
    try {
      const name = sf.getRecommendedNnue(idx);
      postMessage('__net__ trying idx=' + idx + ' ' + name);
      const res = await fetch(name);
      if (!res.ok) { postMessage('__net__ idx=' + idx + ' http ' + res.status); continue; }
      const buf = new Uint8Array(await res.arrayBuffer());
      postMessage('__net__ idx=' + idx + ' bytes=' + buf.byteLength);
      if (buf.byteLength > 100000) sf.setNnueBuffer(buf, idx);
    } catch (err) { postMessage('__net__ idx=' + idx + ' fail ' + err); }
  }
  ready = true;
  postMessage('__worker_ready__');
  queued.forEach((cmd) => { try { sf.uci(cmd); } catch (err) {} });
  queued.length = 0;
} catch (err) {
  postMessage('__error__ ' + (err && err.message ? err.message : err));
}
