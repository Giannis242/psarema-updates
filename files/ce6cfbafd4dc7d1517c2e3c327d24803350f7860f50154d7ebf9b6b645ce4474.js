'use strict';
// Psarema: your own water (window.PsPersonal). An on-device layer that adapts one fish's map to this angler's logged trips. Nothing leaves
// the phone: it reads the catch log through PsCatch.entries() (js/catchlog.js) and returns the factor model.js scoreCells multiplies in.
//
// Model: a Beta-Binomial with kernel-weighted counts. For fish s, every logged trip is effort near its spot (a trip for s, or a blank trip,
// counts 1; a trip that landed another fish counts OTHER: you were there, but maybe not fishing for s) and a catch of s is a success.
//   pi      = (C + 1) / (T + 2)                       your overall share of trips with s (Laplace)
//   P, B    = Gaussian sums (SIG km) of successes / effort around a place
//   theta   ~ Beta(P + A0·pi, B − P + A0·(1 − pi))     the share near that place; with no trips nearby it is the prior, mean pi
//   factor  = E[theta] / pi, clamped to CLAMP           1 with no evidence; one catch moves its spot by a few %, ten by tens of %
//   conf    = 1 − sd(theta) / sd(prior)                 0 with no trips nearby .. → 1 with many
// The same for the time of day (dawn / day / dusk / night, HCLAMP). A0 pseudo-trips of prior is the shrinkage: scripts/fit/replay.mjs
// replays the public angler catches in time order (learn from the first k, score the rest) and eval/LOG.md round 10 has the lift curve.
// ponytail: place and time of day only; moon, pressure and bait per fish need far more trips than one angler logs in a season.
// Round 18 A: your marked spots (js/pins.js PsPins.marks(): "a spot that produces fish") join as pseudo-catches of weight MARK_W[how good]
// at the spot, only for their fish, months (refMonth: the hour on the map) and method. They add to the evidence near the spot (P and B)
// but not to your overall rate pi, which stays the share of your real trips: a mark says "this place beats my average", not "I catch a lot".
// Alone, a "very good" mark lifts its spot by ~+40%; the same clamp holds; the time of day ignores them (a mark has no hour).
(() => {
const SIG = 5, A0 = 4, OTHER = .5, CLAMP = [.6, 1.6], HCLAMP = [.85, 1.18], ST = 4, PX = Math.ceil(W / ST), PY = Math.ceil(H / ST), PREF = 'psarema-catch-prefs', MARK_W = [0, 1, 2, 3];
const PERIODS = ['dawn', 'day', 'dusk', 'night'];
const lim = (x, [a, b]) => x < a ? a : x > b ? b : x;
function splat(out, cell, w, sig) { // out[node] += w · exp(−d² / 2σ²) on ~1 km nodes (4 × 4 cells), within 3σ
  const sx = sig / (ST * KX), sy = sig / (ST * KY), cx = (cell % W) / ST - .5 + .5 / ST, cy = (cell / W | 0) / ST - .5 + .5 / ST;
  for (let y = Math.max(0, Math.ceil(cy - 3 * sy)); y <= Math.min(PY - 1, Math.floor(cy + 3 * sy)); y++) {
    const ky = w * Math.exp(-(((y - cy) / sy) ** 2) / 2);
    for (let x = Math.max(0, Math.ceil(cx - 3 * sx)); x <= Math.min(PX - 1, Math.floor(cx + 3 * sx)); x++) out[y * PX + x] += ky * Math.exp(-(((x - cx) / sx) ** 2) / 2);
  }
}
function periodOf(e) { // the logged conditions' time of day, else from the trip's time (sources.js buildHours' rule)
  if (e.snap?.period) return e.snap.period;
  if (!e.t || typeof SunCalc === 'undefined') return null;
  const sun = SunCalc.getTimes(new Date(e.t), ...CENTER), rise = +sun.sunrise, set = +sun.sunset;
  return e.t >= rise - 36e5 && e.t <= rise + 54e5 ? 'dawn' : e.t >= set - 54e5 && e.t <= set + 36e5 ? 'dusk' : e.t > rise && e.t < set ? 'day' : 'night';
}
const beta = (P, B, pi, a) => { const al = P + a * pi, be = Math.max(0, B - P) + a * (1 - pi), n = al + be; return [al / n, Math.sqrt(al * be / (n * n * (n + 1)))]; }; // mean, sd
// trips: [{ cell, sp, n (0 = blank), t?, snap?, mark?, w? }] (PsCatch.entries()' shape; mark: a marked spot's pseudo-catches, w of them); id: the fish;
// hrs: the forecast hours (hours[].period).
// -> null with no usable trip, else { cell: Float32Array(N) factor, hour: Float32Array(hrs.length), max, lo, hi, hlo, hhi, km2, nC, nB, nM, conf(i) 0..1, period: { dawn… } }
function fit(trips, id, hrs = [], o = {}) {
  const sig = o.sig ?? SIG, a = o.a ?? A0, T = trips.filter(e => e.cell >= 0 && depth[e.cell] && (e.sp === id || e.sp === 'all' || e.n > 0 || o.allBlanks));
  const hit = e => e.sp === id && e.n > 0, wOf = e => hit(e) || !e.n ? 1 : OTHER, real = T.filter(e => !e.mark), C = real.filter(hit).length, Wt = real.reduce((s, e) => s + wOf(e), 0);
  if (!T.length || (!T.some(hit) && !T.some(e => !e.n))) return null; // only other fish's catches: nothing to say about this one
  const pi = (C + 1) / (Wt + 2), P = new Float32Array(PX * PY), B = new Float32Array(PX * PY), sd0 = beta(0, 0, pi, a)[1];
  for (const e of T) { const w = e.mark ? e.w : 1; splat(B, e.cell, wOf(e) * w, sig); if (hit(e)) splat(P, e.cell, w, sig); }
  const cell = new Float32Array(N).fill(1); let lo = 1, hi = 1, moved = 0;
  const R = Math.ceil(3 * sig / Math.min(KX, KY)) + ST, ys = T.map(e => e.cell / W | 0), xs = T.map(e => e.cell % W); // only the box the trips' kernels reach
  for (let y = Math.max(0, Math.min(...ys) - R); y <= Math.min(H - 1, Math.max(...ys) + R); y++) for (let x = Math.max(0, Math.min(...xs) - R); x <= Math.min(W - 1, Math.max(...xs) + R); x++) {
    const i = y * W + x; if (!depth[i] || northMask[i]) continue;
    const k = (y / ST | 0) * PX + (x / ST | 0); if (!B[k]) continue;
    const f = cell[i] = lim(beta(P[k], B[k], pi, a)[0] / pi, CLAMP);
    if (f < lo) lo = f; if (f > hi) hi = f; if (Math.abs(f - 1) > .05) moved++;
  }
  const period = {}; // time of day: the same shrinkage over the four periods
  for (const p of PERIODS) { const E = T.filter(e => periodOf(e) === p); period[p] = lim(beta(E.filter(hit).length, E.reduce((s, e) => s + wOf(e), 0), pi, a)[0] / pi, HCLAMP); }
  const hour = Float32Array.from(hrs, x => period[x.period] ?? 1), hv = Object.values(period), hlo = Math.min(1, ...hv), hhi = Math.max(1, ...hv);
  const conf = i => { const k = ((i / W | 0) / ST | 0) * PX + (i % W / ST | 0); return B[k] ? Math.max(0, 1 - beta(P[k], B[k], pi, a)[1] / sd0) : 0; };
  return { cell, hour, max: hi * hhi, lo, hi, hlo, hhi, km2: moved * KX * KY, nC: C, nB: real.length - C, nM: T.length - real.length, conf, period, pi };
}

/* ---------- The app: the log's entries, the learning switch (the catch log's own preference), a memo per fish ---------- */
let ver = 0, memo = new Map(), memoKey = null, prefS, prefOn = false, prefFresh = false;
const api = window.PsPersonal = { fit, off: false, // off: set true while scoring "as the model alone" (e.g. the conditions saved with a catch)
  // round 16 X: parsed only when the stored text changed (model.js scoreCells asks once per call: thousands of parses a spot card)
  // round 16 engine, phase 4: read from localStorage once, then again only after the preference was written (prefChanged: setEnabled here, the
  // catch log's savePref, another tab's 'storage' event): scoreCells asks at every call, and each read cost a storage round trip
  enabled() { if (!prefFresh) { try { const s = localStorage.getItem(PREF); if (s !== prefS) { prefS = s; prefOn = !!JSON.parse(s)?.learn; } prefFresh = true; } catch { return false; } } return prefOn; },
  prefChanged() { prefFresh = false; },
  setEnabled(on) { // the map's own switch (js/map.js #lay-mine): saves the choice in the catch log's preference, rescores, fires 'ps:personal' (the log re-reads its switch there)
    try { localStorage.setItem(PREF, JSON.stringify({ ...JSON.parse(localStorage.getItem(PREF) || '{}'), learn: !!on })); } catch {}
    prefFresh = false; ver++; if (typeof F !== 'undefined' && F && typeof refresh === 'function') { refresh(); rankAll(); }
    document.dispatchEvent(new CustomEvent('ps:personal', { detail: { on: !!on } }));
  },
  model(id) { // the fitted layer for a fish from the log and your marked spots as they are now (whatever the switch says), or null
    if (id === 'all') return null;
    const list = window.PsCatch?.entries?.() || [], mo = refMonth() + 1, mode = state.mode;
    if (memoKey?.[0] !== ver || memoKey[1] !== hours || memoKey[2] !== list.length || memoKey[3] !== mode || memoKey[4] !== mo) { memo = new Map(); memoKey = [ver, hours, list.length, mode, mo]; }
    if (!memo.has(id)) {
      // round 18 A: the marks for this fish, method and month. ponytail: the map's method; a spot card scoring another method uses the same marks.
      const M = (window.PsPins?.marks?.() || []).filter(m => m.method === mode && m.months.includes(mo) && m.fish.includes(id))
        .map(m => ({ cell: window.PsCatch?.seaCell?.(m.lat, m.lon) ?? idxAt(m.lat, m.lon), sp: id, n: 1, mark: true, w: MARK_W[m.q] || 1 }));
      memo.set(id, fit(list.filter(e => !e.seen).concat(M), id, hours)); // round 15: a fish only seen is neither a catch nor a blank
    }
    return memo.get(id);
  },
  correction: id => api.off || !api.enabled() ? null : api.model(id), // what model.js scoreCells multiplies in: { cell, hour, max } or null
  confAt: (id, i) => api.correction(id)?.conf(i) ?? 0, // 0..1: how much of your own evidence sits near cell i
  row(i, h) { // explain()'s "your own catches" row: key, text, fit 0..1 (0.5 = no change), weight
    const c = api.correction(sp.id); if (!c) return [];
    const f = c.cell[i] * c.hour[h];
    return [['f_mine', tr('ct_rowVal', nf(f, 2), c.nC, c.nB, c.nM), clamp((f - .6) / .8), 1]];
  },
};
document.addEventListener?.('ps:catches', () => { ver++; });
// round 18 A: a mark added, edited or deleted (js/pins.js): learnt again, and the map rescored while the switch is on (the log's own changes rescore in js/catchlog.js)
document.addEventListener?.('ps:places', () => { ver++; if (api.enabled() && typeof F !== 'undefined' && F && typeof refresh === 'function') { refresh(); rankAll(); } });
if (typeof addEventListener === 'function') addEventListener('storage', () => { prefFresh = false; }); // the switch flipped in another tab

// PsPersonal.check() (the bench's replay and smoke tests call it): catches lift their spot, blanks lower theirs, more trips move it more, nothing moves far away, one catch moves little.
api.check = () => {
  const sea = SAMPLE.filter(i => dFit[i] > 10 && dFit[i] < 60), a = sea[50], b = sea[sea.length - 50], far = sea[sea.length >> 1];
  const mk = (c, nb) => [...Array(c)].map(() => ({ cell: a, sp: 'x', n: 1 })).concat([...Array(nb)].map(() => ({ cell: b, sp: 'x', n: 0 })));
  const one = fit(mk(1, 0), 'x'), few = fit(mk(3, 2), 'x'), many = fit(mk(12, 8), 'x');
  console.assert(one.cell[a] >= 1 && one.cell[a] < 1.25 && few.cell[a] > one.cell[a] - 1e-6 && many.cell[a] > few.cell[a] && many.cell[b] < few.cell[b] && few.cell[b] < 1, 'PsPersonal: catches lift, blanks lower, more trips more');
  console.assert(many.cell[far] === 1 || Math.abs(many.cell[far] - 1) < .02 || km([latOf(far), lonOf(far)], [latOf(a), lonOf(a)]).d < 3 * SIG || km([latOf(far), lonOf(far)], [latOf(b), lonOf(b)]).d < 3 * SIG, 'PsPersonal: far water untouched');
  console.assert(many.conf(a) > few.conf(a) && few.conf(a) > 0 && many.conf(a) < 1 && fit([{ cell: a, sp: 'y', n: 1 }], 'x') === null, 'PsPersonal: confidence grows with trips; other fish alone say nothing');
  // round 18 A: a marked spot lifts its own water, more when it is better, within the clamp; far water and your overall rate stay as they were
  const mark = q => ({ cell: a, sp: 'x', n: 1, mark: true, w: MARK_W[q] }), m1 = fit([mark(1)], 'x'), m3 = fit([mark(3)], 'x'), mb = fit(mk(0, 4).concat(mark(3)), 'x');
  console.assert(m1.cell[a] > 1.1 && m3.cell[a] > m1.cell[a] && m3.cell[a] <= CLAMP[1] + 1e-6 && m3.nM === 1 && m3.nC === 0 && m3.pi === .5, 'PsPersonal: a mark lifts its spot, more when better');
  console.assert(mb.cell[a] > 1.2 && mb.cell[b] < 1 && (mb.cell[far] === 1 || Math.abs(mb.cell[far] - 1) < .02 || km([latOf(far), lonOf(far)], [latOf(a), lonOf(a)]).d < 3 * SIG || km([latOf(far), lonOf(far)], [latOf(b), lonOf(b)]).d < 3 * SIG), 'PsPersonal: a mark among blanks still lifts; far water untouched');
  return [one.cell[a], few.cell[a], many.cell[a], many.cell[b], m1.cell[a], m3.cell[a]].map(v => +v.toFixed(3));
};
})();
