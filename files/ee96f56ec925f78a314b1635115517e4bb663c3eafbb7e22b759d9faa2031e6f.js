'use strict';
// Psarema: the seabed relief (js/chart.js), worked out off the main thread (round 16 X: ~0.9 s of it at every start on a budget phone).
// A hill-shade of the depth grid, lit from the north-west: chart.js posts { depth, W, H, N, RES, NORTH, MROW } and gets the image's pixels
// (RGBA, one Uint32 each) back. Loaded as a classic script instead (a worker that cannot start), it only defines reliefPixels for chart.js.
function reliefPixels({ depth, W, H, N, RES, NORTH, MROW }) {
  const mY = RES * 111320, h = new Float32Array(N);
  for (let i = 0; i < N; i++) h[i] = depth[i] ? -20 * Math.sqrt(depth[i]) : NaN; // land: no height (its neighbours stand in for it)
  // The grid's deep water is resampled from coarser surveys: shaded raw, its steps and seams showed as streaks and a weave. A binomial blur
  // (5 taps, twice, each way: ~±1 km) over the sea only keeps the banks and the shelf edge and drops the grain.
  const t2 = new Float32Array(N), K = [1, 4, 6, 4, 1];
  const pass = (a, b, step, n, len) => { // along rows (step 1, n W) or columns (step W, n H)
    for (let s = 0; s < len; s++) for (let k = 0; k < n; k++) {
      const i = step === 1 ? s * W + k : k * W + s; if (a[i] !== a[i]) { b[i] = NaN; continue; }
      let v = 0, w = 0; for (let t = -2; t <= 2; t++) { const kk = k + t; if (kk < 0 || kk >= n) continue; const q = a[i + t * step]; if (q === q) { v += K[t + 2] * q; w += K[t + 2]; } }
      b[i] = v / w;
    }
  };
  for (let r = 0; r < 2; r++) { pass(h, t2, 1, W, H); pass(t2, h, W, H, W); }
  // Round 9: past the shelf (150 → 400 m) three more passes blend in: the slopes' survey seams read as streaks (the north coast) at two
  const hs = h.slice(); for (let r = 0; r < 3; r++) { pass(hs, t2, 1, W, H); pass(t2, hs, W, H, W); }
  for (let i = 0; i < N; i++) { const d = depth[i]; if (d > 150) { const k = d > 400 ? 1 : (d - 150) / 250; h[i] += (hs[i] - h[i]) * k; } }
  const p = new Uint32Array(W * H), Z = 5, c45 = Math.SQRT1_2, lx = -.5, ly = -.5, lz = c45; // light: NW, 45° up
  for (let y = 0; y < H; y++) {
    const gy = MROW[y], mX = mY * Math.cos((NORTH - gy * RES) * Math.PI / 180), up = gy > 0 ? -W : 0, dn = gy < H - 1 ? W : 0;
    for (let x = 0, i = gy * W; x < W; x++, i++) {
      const v = h[i]; if (v !== v) continue;
      const l = x > 0 ? h[i - 1] : v, r = x < W - 1 ? h[i + 1] : v, u = h[i + up], d = h[i + dn];
      const gx = Z * ((r === r ? r : v) - (l === l ? l : v)) / (2 * mX), gyy = Z * ((d === d ? d : v) - (u === u ? u : v)) / (2 * mY); // dh/dx east, dh/dy south
      const s = (-gx * lx - gyy * ly + lz) / Math.sqrt(gx * gx + gyy * gyy + 1) - lz; // n·L minus flat ground's
      const dw = depth[i] < 200 ? 1 : depth[i] > 900 ? 0 : ((900 - depth[i]) / 700) ** 2; // fades out past 200 m: the deep floor's coarse survey read as cloud (grey patches off Limassol)
      const a = (s > 0 ? 60 * Math.tanh(s * 8) : Math.min(150, -s * 650)) * dw | 0; // light faces softer than shade, and they level off: a long slope facing the light (the north coast's shelf) read as a white band
      if (a > 3) p[y * W + x] = s > 0 ? (a << 24 | 0xffffff) >>> 0 : (a << 24) >>> 0;
    }
  }
  return p;
}
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) onmessage = e => { const p = reliefPixels(e.data); postMessage(p, [p.buffer]); };
