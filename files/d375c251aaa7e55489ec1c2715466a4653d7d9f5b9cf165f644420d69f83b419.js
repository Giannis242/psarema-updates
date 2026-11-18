'use strict';
// Psarema: a per-species correction of the where-fit learned from presence records (data/fit.js), and the code that fits it.
// The expert profile stays the base: the correction is exp(b·x − c) on five cell features x (ln(1+depth), its square, ln(shore km + 0.1),
// rock and seagrass cover), fitted as a penalised logistic regression of the fish's records against the other fish's records with the
// expert fit as the offset, so with no evidence it is 1. It is kept only when an inner spatial cross-validation on the records (4 folds
// of 10 km blocks) shows it beats the expert profile on blocks it was not fitted on, and only for fish with >= 30 records in >= 6 blocks.
// Shipped: data/fit.js, fitted by scripts/fit/build-fit.mjs on the open-licence records of data/sightings.js. Bench: window.benchRefit
// refits it on every training fold (eval/README.md), and it applies only while SIGHT[id] is the array that fold set.
const FIT = window.PSAREMA_FIT?.species || {}, FIT_NF = 5, SIGHT0 = { ...SIGHT }, benchFit = {};
if (window.PSAREMA_FIT && !window.PSAREMA_FIT.species) console.warn('data/fit.js is not in the js/fit.js format: learned corrections off');
const fitFor = id => { const b = benchFit[id]; return b && b.key === SIGHT[id] ? b.f : SIGHT[id] === SIGHT0[id] ? FIT[id] || null : null; };
let distQ = null; // ln(shore km + 0.1) in 256 steps (a byte per cell), made on first use
const DQ0 = Math.log(.1), DQ1 = Math.log(60.1), dqVal = q => DQ0 + q * (DQ1 - DQ0) / 255;
function distQuant() {
  if (!distQ) { distQ = new Uint8Array(N); for (let i = 0; i < N; i++) if (depth[i]) distQ[i] = Math.round(255 * clamp((Math.log(dist[i] + .1) - DQ0) / (DQ1 - DQ0))); }
  return distQ;
}
function fitFeats(i, x) { // the five features of cell i (the tables in fitTables give the same sum)
  const ld = Math.log1p(dFit[i]); x[0] = ld; x[1] = ld * ld; x[2] = Math.log(dist[i] + .1); x[3] = (habK[i] / 11 | 0) % 11 / 10; x[4] = habK[i] % 11 / 10;
  return x;
}
// The correction as three factor tables (depth, seabed key, quantised shore distance): c(i) = d[dFit[i]] · h[habK[i]] · s[distQ[i]].
const fitMemo = new WeakMap();
function fitTables(f) {
  if (fitMemo.has(f)) return fitMemo.get(f);
  const b = f.b, d = new Float64Array(DMAX + 1), h = new Float64Array(NHK), s = new Float64Array(256);
  for (let k = 0; k <= DMAX; k++) { const ld = Math.log1p(k); d[k] = Math.exp(b[0] * ld + b[1] * ld * ld - f.c); }
  for (let k = 0; k < NHK; k++) h[k] = Math.exp(b[3] * ((k / 11 | 0) % 11 / 10) + b[4] * (k % 11 / 10));
  for (let q = 0; q < 256; q++) s[q] = Math.exp(b[2] * dqVal(q));
  const T = { d, h, s, q: distQuant(), smax: Math.max(...s) };
  fitMemo.set(f, T); return T;
}
const fitC = (T, i) => T.d[dFit[i]] * T.h[habK[i]] * T.s[T.q[i]];

/* ---------- Record density: the fish's share of the records within ~10 km (eval/LOG.md round 4, eval/patches/m4-den.js) ---------- */
// For a fish with >= DEN_MIN records: F = (P + a·pi) / ((B + a)·pi), clamped to e^±1.5, where P / B are Gaussian sums (10 km, cut at 3σ)
// of its records / of the other fish's records (one sampling event, cell × year, counts 1), pi = its share of all records. Above 1 where
// it makes up more of the nearby records than of all records, below 1 where it makes up less; 1 far from any record. On ~1 km nodes
// (4 × 4 cells), multiplied into the where-fit like the correction above. Shipped: built from data/sightings.js on first use.
// Bench: benchRefit builds it from the fold's training records as data/sightings.js would hold them.
const DEN_BW = 10, DEN_A = 10, DEN_MIN = 20, DEN_CLAMP = 1.5, DST = 4, DNX = Math.ceil(W / DST), DNY = Math.ceil(H / DST);
let denIdx = null; // node of each cell (16 bits), made on first use
const denNodes = () => { if (!denIdx) { denIdx = new Uint16Array(N); for (let i = 0; i < N; i++) denIdx[i] = ((i / W | 0) >> 2) * DNX + ((i % W) >> 2); } return denIdx; };
function denSplat(out, recs, wOf) { // out[node] += w · exp(-d² / 2·DEN_BW²) for each record (separable, within 3σ)
  const sx = DEN_BW / (DST * KX), sy = DEN_BW / (DST * KY), rx = Math.ceil(3 * sx), ry = Math.ceil(3 * sy), kx = new Float64Array(2 * rx + 2);
  for (const r of recs) {
    const w = wOf(r); if (!w) continue;
    const cy = (r.cell / W | 0) / DST, cx = (r.cell % W) / DST, c = .5 - .5 / DST; // node x's centre is x + c in these units
    const y0 = Math.max(0, Math.ceil(cy - ry)), y1 = Math.min(DNY - 1, Math.floor(cy + ry)), x0 = Math.max(0, Math.ceil(cx - rx)), x1 = Math.min(DNX - 1, Math.floor(cx + rx));
    for (let x = x0; x <= x1; x++) kx[x - x0] = Math.exp(-(((x + c - cx) / sx) ** 2) / 2);
    for (let y = y0; y <= y1; y++) { const ky = w * Math.exp(-(((y + c - cy) / sy) ** 2) / 2), row = y * DNX; for (let x = x0; x <= x1; x++) out[row + x] += ky * kx[x - x0]; }
  }
}
const denAll = new WeakMap(); // per record list: every record's event-weighted sum (B = this minus the fish's own)
function denMap(id, recs) { // recs: [{ sp, cell, w }]; a Float32Array of factors per node, or null (fewer than DEN_MIN records)
  const mine = recs.filter(r => r.sp === id); if (mine.length < DEN_MIN) return null;
  const tb = recs.reduce((a, r) => a + (r.sp === id ? 0 : r.w), 0); if (!tb) return null;
  if (!denAll.has(recs)) { const A = new Float64Array(DNX * DNY); denSplat(A, recs, r => r.w); denAll.set(recs, A); }
  const A = denAll.get(recs), P = new Float64Array(DNX * DNY), Q = new Float64Array(DNX * DNY), pi = mine.length / tb, F = new Float32Array(DNX * DNY);
  denSplat(P, mine, () => 1); denSplat(Q, mine, r => r.w);
  const lo = Math.exp(-DEN_CLAMP), hi = Math.exp(DEN_CLAMP);
  for (let k = 0; k < F.length; k++) F[k] = Math.min(hi, Math.max(lo, (P[k] + DEN_A * pi) / ((Math.max(0, A[k] - Q[k]) + DEN_A) * pi)));
  return F;
}
function eventWeights(recs) { // one sampling event (cell × year: the shipped records name no dataset) counts 1
  const ev = new Map(); for (const r of recs) ev.set(r.cell + '|' + r.y, (ev.get(r.cell + '|' + r.y) || 0) + 1);
  for (const r of recs) r.w = 1 / ev.get(r.cell + '|' + r.y);
  return recs;
}
let sightRecs = null; const denShip = {}, benchDen = {};
function shippedDen(id) {
  if (!sightRecs) { sightRecs = []; for (const [sp, rows] of Object.entries(SIGHT0)) for (const [la, lo, y] of rows) { const cell = idxAt(la, lo); if (cell >= 0 && depth[cell] && !northMask[cell]) sightRecs.push({ sp, cell, y }); } eventWeights(sightRecs); }
  return id in denShip ? denShip[id] : denShip[id] = denMap(id, sightRecs);
}
const denFor = id => { const b = benchDen[id]; return b && b.key === SIGHT[id] ? b.f : SIGHT[id] === SIGHT0[id] ? shippedDen(id) : null; };
const denAt = (D, i) => D[denNodes()[i]];

/* ---------- Fitting (bench folds and scripts/fit/build-fit.mjs) ---------- */
function solveLin(A, b) { // Gaussian elimination with partial pivoting (6 × 6)
  const n = b.length, M = A.map((r, k) => [...r, b[k]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let v = M[r][n]; for (let k = r + 1; k < n; k++) v -= M[r][k] * x[k]; x[r] = v / M[r][r]; }
  return x;
}
// L2-penalised logistic regression with an offset; Z flat [n*nf]; returns [b..., intercept]. Newton with step halving: plain Newton
// overshoots when the offsets are far from the records' base rate (expert fit near 0 => offset -7) and then diverges (intercept -2e7).
function fitLogit(Z, y, w, off, lambda, nf) {
  const n = y.length, d = nf + 1; let b = new Float64Array(d);
  const loss = b => { // penalised deviance / 2
    let L = 0; for (let k = 0; k < n; k++) { let e = b[nf] + off[k]; for (let j = 0; j < nf; j++) e += b[j] * Z[k * nf + j]; L += w[k] * ((e > 0 ? e + Math.log1p(Math.exp(-e)) : Math.log1p(Math.exp(e))) - y[k] * e); }
    for (let a = 0; a < nf; a++) L += lambda / 2 * b[a] * b[a];
    return L;
  };
  let L0 = loss(b);
  for (let it = 0; it < 30; it++) {
    const g = new Float64Array(d), Hs = new Float64Array(d * d);
    for (let k = 0; k < n; k++) {
      let e = b[nf] + off[k]; for (let j = 0; j < nf; j++) e += b[j] * Z[k * nf + j];
      const q = 1 / (1 + Math.exp(-e)), r = w[k] * (q - y[k]), h = w[k] * q * (1 - q);
      for (let a = 0; a < d; a++) { const za = a < nf ? Z[k * nf + a] : 1; g[a] += r * za; for (let c = a; c < d; c++) Hs[a * d + c] += h * za * (c < nf ? Z[k * nf + c] : 1); }
    }
    for (let a = 0; a < d; a++) for (let c = 0; c < a; c++) Hs[a * d + c] = Hs[c * d + a];
    for (let a = 0; a < nf; a++) { g[a] += lambda * b[a]; Hs[a * d + a] += lambda; }
    Hs[d * d - 1] += 1e-6;
    const step = solveLin([...Array(d)].map((_, a) => Array.from(Hs.subarray(a * d, a * d + d))), Array.from(g));
    let t = 1, nb, L1;
    for (let h = 0; h < 30; h++, t /= 2) { nb = b.map((v, a) => v - t * step[a]); L1 = loss(nb); if (L1 <= L0) break; }
    if (!(L1 <= L0)) break;
    b = nb; L0 = L1;
    if (t * Math.max(...step.map(Math.abs)) < 1e-5) break;
  }
  return b;
}
function wAUC(s, y, w, sel) { // weighted Mann-Whitney AUC over the selected points (ties count half)
  const k = sel.slice().sort((a, b) => s[a] - s[b]); let auc = 0, cn = 0, tp = 0;
  for (let i = 0; i < k.length;) { let P = 0, Q = 0; const v = s[k[i]]; for (; i < k.length && s[k[i]] === v; i++) { if (y[k[i]]) P += w[k[i]]; else Q += w[k[i]]; } auc += P * (cn + Q / 2); cn += Q; tp += P; }
  return tp && cn ? auc / (tp * cn) : NaN;
}
const block10 = i => Math.floor((i / W | 0) * KY / 10) * 1000 + Math.floor((i % W) * KX / 10); // 10 km blocks, as the bench
const expertProfile = id => ({ ...TIPS[id], ...window.PSAREMA_SPECIES.find(s => s.id === id) }); // before calibrate(): fitted on records itself
const expertX = (i, s) => Math.max(1e-3, fDepth(i, s) * (.3 + .7 * fHab(i, s)) * (.25 + .75 * fShore(i, s)));
// recs: [{ sp, cell, w (event weight), exo (from an exotic-only survey) }]; returns { b, c, n, lambda } or null (keep the expert profile).
function fitSpecies(id, recs, exotic) {
  const s = expertProfile(id), pos = recs.filter(r => r.sp === id), bg = recs.filter(r => r.sp !== id && (exotic || !r.exo));
  if (pos.length < 30 || !bg.length || new Set(pos.map(r => block10(r.cell))).size < 6) return null;
  const all = [...pos, ...bg], n = all.length, nf = FIT_NF, y = Uint8Array.from(all, r => r.sp === id ? 1 : 0), wb = bg.reduce((a, r) => a + r.w, 0);
  const w = Float64Array.from(all, r => r.sp === id ? 1 : r.w * pos.length / wb); // the background weighs as much as the records, one sampling event = 1
  const X = new Float64Array(n * nf), x = new Float64Array(nf); all.forEach((r, k) => X.set(fitFeats(r.cell, x), k * nf));
  const off = Float64Array.from(all, r => Math.log(expertX(r.cell, s))), m = new Float64Array(nf), sd = new Float64Array(nf), W0 = w.reduce((a, v) => a + v, 0);
  for (let k = 0; k < n; k++) for (let j = 0; j < nf; j++) m[j] += w[k] * X[k * nf + j] / W0;
  for (let k = 0; k < n; k++) for (let j = 0; j < nf; j++) sd[j] += w[k] * (X[k * nf + j] - m[j]) ** 2 / W0;
  for (let j = 0; j < nf; j++) sd[j] = Math.sqrt(sd[j]) || 1;
  const Z = X.map((v, k) => (v - m[k % nf]) / sd[k % nf]), idx = [...Array(n).keys()];
  // Inner spatial CV: which penalty, if any, beats the expert profile on blocks it was not fitted on (pooled, and in all folds but one)
  const LAMBDAS = [3, 10, 30, 100], fo = Int32Array.from(all, r => ((block10(r.cell) * 2654435761) >>> 0) % 4), held = LAMBDAS.map(() => Float64Array.from(off));
  for (let f = 0; f < 4; f++) {
    const tr = idx.filter(k => fo[k] !== f), te = idx.filter(k => fo[k] === f);
    if (!te.length || !tr.some(k => y[k])) continue;
    const Zt = new Float64Array(tr.length * nf); tr.forEach((k, q) => Zt.set(Z.subarray(k * nf, k * nf + nf), q * nf));
    const sub = (a, T) => T.from(tr, k => a[k]);
    LAMBDAS.forEach((L, q) => { const b = fitLogit(Zt, sub(y, Uint8Array), sub(w, Float64Array), sub(off, Float64Array), L, nf); for (const k of te) { let e = off[k]; for (let j = 0; j < nf; j++) e += b[j] * Z[k * nf + j]; held[q][k] = e; } });
  }
  const base = wAUC(off, y, w, idx), folds = [0, 1, 2, 3].map(f => idx.filter(k => fo[k] === f)).filter(t => t.filter(k => y[k]).length >= 3);
  let best = -1, bestA = base + .01;
  LAMBDAS.forEach((L, q) => { const a = wAUC(held[q], y, w, idx), wins = folds.filter(t => wAUC(held[q], y, w, t) > wAUC(off, y, w, t)).length;
    if (a > bestA && wins >= Math.max(2, folds.length - 1)) { bestA = a; best = q; } });
  if (best < 0) return null;
  const bz = fitLogit(Z, y, w, off, LAMBDAS[best], nf), b = Array.from({ length: nf }, (_, j) => bz[j] / sd[j]);
  const eta = pos.map((r, k) => b.reduce((a, v, j) => a + v * X[k * nf + j], 0)).sort((p, q) => p - q);
  const r4 = v => +v.toPrecision(4);
  return { b: b.map(r4), c: r4(eta[Math.floor(.9 * (eta.length - 1))]), n: pos.length, lambda: LAMBDAS[best] }; // c: the factor is 1 at the fish's top-10% record cells
}
// The bench calls this for every training fold (records r: sp, cell, w, exo, y, lic); EXOTIC is the bench's list of Lessepsian fish.
// The record density sees the fold as data/sightings.js would hold it: open licences (CC0 / CC BY / CC BY-NC), the app's fish only.
const fitCache = new Map(), denCache = new Map(), shipFolds = new Map();
window.benchRefit = (id, train) => {
  const fold = train.length + '|' + train.reduce((a, r) => (a + r.cell * 7 + r.m) % 1e9, 0), key = id + '|' + fold; // the same fold is refitted once per method
  if (!fitCache.has(key)) fitCache.set(key, fitSpecies(id, train, typeof EXOTIC !== 'undefined' && EXOTIC.has(id)));
  benchFit[id] = { f: fitCache.get(key), key: SIGHT[id] };
  if (!shipFolds.has(fold)) shipFolds.set(fold, eventWeights(train.filter(r => r.sp !== '_other' && ['cc0', 'by', 'by-nc'].includes(r.lic)).map(r => ({ sp: r.sp, cell: r.cell, y: r.y }))));
  if (!denCache.has(key)) denCache.set(key, denMap(id, shipFolds.get(fold)));
  benchDen[id] = { f: denCache.get(key), key: SIGHT[id] };
};
