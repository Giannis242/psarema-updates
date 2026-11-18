'use strict';
// Psarema: the fishing-chance model and the ranking of every fish.
/* ---------- Scoring ---------- */
const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify({ sp: state.sp, mode: state.mode, group: state.group, sort: state.sort, layers: state.layers,
  op: state.op, min: state.min, rail: state.rail, lang: state.lang, radius: state.radius, loc: state.loc, tab: state.tab })); } catch {} };
const scores = new Uint8Array(N);
let cur = null, sp = byId(state.sp), best = [];

const pelagic = s => s.group === 'pelagic';
// The where-fit parts each depend on one small integer per cell (depth in m, a seabed cover key, coast type, access distance),
// so prepare() and allFit() evaluate them once per value into tables; the per-cell forms below are for the score card.
function fDepth(i, s) { const d = dFit[i]; return pelagic(s) && d >= s.depth[1] ? 1 : trap(d, ...s.depth); }
// Seabed: the fish's habitat weights mixed by cover (rock, seagrass, the rest by the soft-bottom class; core.js habK).
const NHK = HAB ? HAB.classes.length * 121 : 1;
function fHabK(k, s) {
  const h = s.habitat, c = HAB?.classes[k / 121 | 0] ?? 'unknown', r = (k / 11 | 0) % 11 / 10, g = k % 11 / 10;
  const soft = c === 'unknown' ? .6 : c === 'other' ? .5 : c === 'rock' || c === 'seagrass' ? h.sand ?? .5 : h[c] ?? .5;
  return Math.max(r * (h.rock ?? .5) + g * (h.seagrass ?? .5) + (1 - r - g) * soft, h.open ?? 0);
}
const fHab = (i, s) => fHabK(habK[i], s);
function fShore(i, s) { const [lo, hi] = s.shoreKm; return trap(dist[i], lo * .4 - .01, lo, hi, hi * 1.6 + 1); }
const fTemp = (t, s) => trap(t, ...s.sst);
const fWaves = (w, s) => trap(w, -1, s.waves[0], s.waves[1], s.waves[1] + 1);
const fCur = c => c <= 1.5 ? .3 + .7 * c / 1.5 : Math.max(.3, 1 - (c - 1.5) / 3);
// Rough water and wind make fishing harder from a moderate sea and Beaufort 4 on (half at 2 m / 35 km/h), and stop it by 3 m / 50 km/h.
// Round 10: before that ramp the score already falls gently through fishable but uncomfortable weather, by up to 35% from 10 to 25 km/h of wind
// at the spot or from 0.4 to 1.2 m of sea there, whichever is worse (a-priori numbers, not fitted). Evidence: dated angler catches fall on calmer
// days than the same place and weekday 1-3 weeks either side (scripts/fit/dynamic.mjs: the full score's P(catch day > control day) .53 -> .60,
// paired +.077 [.040, .112]; eval/LOG.md round 10). It mixes 'fish bit' with 'anglers went out': it is a when-to-go term, not fish behaviour.
const fGate0 = (wave, wind, gust) => Math.min(1 - clamp((wave - .8) / 2.2), 1 - clamp((wind - 20) / 30), 1 - clamp((gust - 40) / 35));
const fGate = (wave, wind, gust) => fGate0(wave, wind, gust) * Math.min(1 - .35 * clamp((wind - 10) / 15), 1 - .35 * clamp((wave - .4) / .8));
// round 16 timing (agent T; eval/LOG.md "Round 16 timing"): the hour and the day inside the score. S owns the rest of this file.
// The time of day is a line through the profile's four values, not four boxes: the night value while the sun is 12° or more below the
// horizon, dawn at sunrise + 15 min, day at solar noon, dusk at sunset − 15 min (the instants the bench scores), straight lines between.
// Solunar periods, pressure and the moon are OUT of the score: no record supports them (round 10 catch days, round 15 ocean days, round 16
// trip-days), and with steady pressure they held every score under 90% of its best. fMoon and fPress stay as functions at their best value
// so that uni / uniMax (here, js/calendar.js, js/forecast.js) need no change; the moon and its periods are still shown, as information.
const NAUT = new WeakMap(); // per hour object: [nautical dawn, nautical dusk]
function fTime(x, s) {
  const a = s.activity, day = lerp(a.day, (a.dawn + a.dusk) / 2, .5 * x.cloud / 100); // overcast stretches the low-light bite
  if (!(x.rise < x.set)) return x.period === 'day' ? day : a[x.period]; // an hour object without the sun's times: the old boxes
  const t = x.t + 18e5;
  let n = NAUT.get(x); if (!n) { const u = SunCalc.getTimes(new Date(t), ...CENTER); NAUT.set(x, n = [+u.nauticalDawn, +u.nauticalDusk]); }
  const at = [n[0], x.rise + 9e5, (x.rise + x.set) / 2, x.set - 9e5, n[1]], v = [a.night, a.dawn, day, a.dusk, a.night];
  if (!(t > at[0] && t < at[4])) return a.night;
  let k = 1; while (t > at[k]) k++;
  return lerp(v[k - 1], v[k], (t - at[k - 1]) / (at[k] - at[k - 1]));
}
function fMoon(x, s) { return Math.max(s.moon.new, s.moon.full); }
function fPress() { return 1; }
// end of round 16 timing
// The season read on the hour's day of the year, linear between month centres: no step at each month end.
const MPOS = new WeakMap(); // the hour's place in the year, the same for every fish: worked out once per hour, not per fish (rankAll: 55×)
const seasonAt = (x, s) => {
  let m = MPOS.get(x);
  if (m === undefined) { const t = x.t + 18e5; MPOS.set(x, m = ((t - Date.UTC(new Date(t).getUTCFullYear(), 0, 1)) / 864e5 / (365.25 / 12) - .5 + 12) % 12); }
  const m0 = Math.floor(m);
  return lerp(s.season[m0], s.season[(m0 + 1) % 12], m - m0);
};
const seasonGate = (x, s) => .25 + .75 * seasonAt(x, s);
// The time of day (P.uni) also tilts the whole hour: 1 at the fish's best time, minus TILT per unit below it. Inside base it only moves a
// score by about ±2; the tilt is the same for every cell, so the map's ranking within an hour stays. 2.5: midday about −20% and night −45%
// for a dawn-feeding fish. Round 16: the moon and pressure parts of P.uni are constants now (fMoon, fPress at their best), so they tilt nothing.
const TILT = 2.5;
const boatReach = i => trap(launchKm[i], -1, 0, 15, 35);
function modeFit(i, s, mode) { // can this way of fishing reach the cell?
  if (mode === 'shore') return dist[i] <= .5 ? 1 : 0;
  if (mode === 'spear') return trap(depth[i], -1, 0, 15, 30) * trap(dist[i], -1, 0, 1, 2); // free-diving depth, swimming distance
  return (.25 + .75 * fShore(i, s)) * (.55 + .45 * boatReach(i));
}
const daylight = x => x.t + 18e5 > x.rise && x.t + 18e5 < x.set;
function accessFitD(d, mode) { // shore anglers and spearfishers need a road or path to reach the water; d = shoreDist (10 m steps)
  if (d === 255) return 1; // more than 1 km from land: modeFit already decides
  const m = d * 10, f = m <= 300 ? 1 : m >= 2000 ? .15 : 1 - .85 * (m - 300) / 1700;
  return mode === 'spear' ? .5 + .5 * f : f;
}
const accessFit = (i, mode) => !shoreDist || mode === 'boat' ? 1 : accessFitD(shoreDist[i], mode);
const coastFitC = (c, s, mode) => c === 5 ? 0 : c === 4 ? (mode === 'shore' ? .2 : .4) : c === 2 ? lerp(.85, 1.1, s.habitat.rock ?? .5)
  : c === 1 ? lerp(.85, 1.1, s.habitat.sand ?? .5) : c === 3 ? 1.05 : 1;
const coastFit = (i, s, mode) => !coastType || mode === 'boat' ? 1 : coastFitC(coastType[i], s, mode); // what the nearest coast is like
// The month a per-fish context is prepared for: the hour on show, else the forecast's first hour, else today (before any forecast).
// ponytail: one month per prepare() for the bathing-season spear ban and All fish; a forecast that crosses a month end keeps the shown hour's.
// The fish-farm and outfall seasons are per hour (P.aF, P.aO): exact, also in the bench.
const refMonth = () => hours?.[state.h]?.month ?? hours?.[0]?.month ?? new Date().getMonth();
function likelyAt(i, mode, n = 3) { // All fish: the fish that fit this cell best (same where-fit as allFit)
  const month = refMonth();
  return SPECIES.filter(f => !f.banned && !f.closed?.includes(month + 1)).map(f => ({ f, v: (f.methods.includes(mode) ? 1 : .5) * (.3 + .7 * f.season[month])
    * Math.pow(fitWhere(i, f, fDepth(i, f) * (.3 + .7 * fHab(i, f)) * modeFit(i, f, mode) * coastFit(i, f, mode)), .6) })).filter(x => x.v > .2).sort((a, b) => b.v - a.v).slice(0, n).map(x => x.f);
}
function fitWhere(i, s, x) { // the where-fit x (before the power) with the fish's learned correction (js/fit.js), if it has one
  const f = !s.all && x && fitFor(s.id);
  return f ? Math.min(1, x * fitC(fitTables(f), i)) : x;
}
function depthTable(s) { // fDepth for every depth on the grid
  const t = new Float64Array(DMAX + 1), [a, b, c, e] = s.depth, pel = pelagic(s);
  for (let d = 0; d <= DMAX; d++) t[d] = pel && d >= b ? 1 : trap(d, a, b, c, e);
  return t;
}
const habTable = s => { const t = new Float64Array(NHK); for (let k = 0; k < NHK; k++) t[k] = .3 + .7 * fHabK(k, s); return t; }; // fHab as a table

// All fish: per cell, the best where-fit of any fish that is in season and open, each weighted by how in season it is
// (pow is monotonic, so the weight goes in as w^(1/.6) and prepare() applies the power once). Cached per method and month.
// Same result, less work: a fish's fit is v = weight × seabed × depth fit, times a method × coast factor of at most 1.1; with the fish
// of each (depth, seabed) pair sorted by v, the scan stops at the first fish whose 1.1·v cannot beat the best so far. Most of the ~6,800 pairs
// are shelf cells with a pair of their own: for a pair of fewer than 8 cells, trying every fish costs less than sorting them.
let allCache = null, fitKeys = null;
// Round 16 S: All fish = the mean of the ALL_TOPK best in-season fits at the cell (1 = the best one alone, as before round 16). With one, 38% of the
// boat water sat at the ceiling and only the attractors ranked it (eval/LOG.md round 16). Fewer than ALL_TOPK fish fitting counts the rest as 0.
let ALL_TOPK = 5;
function keysOf() { // per sea cell, the number of its (depth, seabed) pair, and per pair its depth, seabed and cell count; built on first use, kept (1.6 MB)
  if (fitKeys) return fitKeys;
  const idx = new Uint16Array(N), seen = new Map(), d = [], h = [], n = [];
  for (let i = 0; i < N; i++) {
    if (!depth[i]) continue;
    const k = dFit[i] * NHK + habK[i]; let j = seen.get(k);
    if (j === undefined) { seen.set(k, j = d.length); d.push(dFit[i]); h.push(habK[i]); n.push(0); }
    idx[i] = j; n[j]++;
  }
  console.assert(d.length < 65536, 'keysOf: too many (depth, seabed) pairs for 16 bits');
  return fitKeys = { idx, d, h, n };
}
// Round 16 engine, phase 4: the finished maps of the three latest (method, month) are kept (3.2 MB each), so going back to a method does not
// work the All-fish map out again (~0.4 s of slices on a phone after every method change). The same arrays, read only.
const allDone = new Map();
function allFit(mode, month, until = Infinity) { // until: a performance.now() deadline for background warm-up; null = not finished yet
  const key = mode + month + '/' + ALL_TOPK;
  if (allCache?.key !== key && allDone.has(key)) allCache = { key, r: allDone.get(key), i: N, prof: null, lists: null }; // round 16 engine, phase 4: a method seen before
  if (allCache?.key !== key) {
    const prof = SPECIES.filter(f => !f.banned && !f.closed?.includes(month + 1)).map(f => {
      const [lo, hi] = f.shoreKm, coast = new Float64Array(256);
      for (let c = 0; c < 256; c++) coast[c] = coastFitC(c, f, mode);
      const fit = fitFor(f.id), t = fit && fitTables(fit), dep = depthTable(f), hab = habTable(f);
      if (t) { for (let d = 0; d <= DMAX; d++) dep[d] *= t.d[d] * t.smax; for (let c = 0; c < NHK; c++) hab[c] *= t.h[c]; } // the learned correction, its shore part at its largest
      const k = (f.methods.includes(mode) ? 1 : .5) * Math.pow(.3 + .7 * f.season[month], 1 / .6);
      return { f, k, v: t ? (hk, df) => k * Math.min(1, hab[hk] * dep[df]) : (hk, df) => k * hab[hk] * dep[df], // the sort key: a bound of the fit / 1.1
        hab, dep, t, coast, s0: lo * .4 - .01, s1: lo, s2: hi, s3: hi * 1.6 + 1 }; // fShore's corners
    });
    allCache = { key, r: new Float32Array(N), i: 0, prof, lists: new Array(keysOf().d.length) };
  }
  const A = allCache, { r, prof, lists } = A, boat = mode === 'boat', ctOn = coastType && !boat, K = keysOf(), TK = ALL_TOPK, top = new Float64Array(TK);
  const fit = (p, hk, df, i, br, mf0, ct) => { // weight × seabed × depth × modeFit × coastFit (× the shore part of a learned correction, capped at 1 like fitWhere)
    const w = p.hab[hk] * p.dep[df] * (boat ? (.25 + .75 * trap(dist[i], p.s0, p.s1, p.s2, p.s3)) * br : mf0) * (ct < 0 ? 1 : p.coast[ct]);
    return p.k * (p.t ? Math.min(1, w * p.t.s[p.t.q[i]] / p.t.smax) : w);
  };
  for (let i = A.i; i < N; i++) {
    if (!(i & 511) && performance.now() > until) { A.i = i; return null; }
    const d = depth[i];
    if (!d || northMask[i] || (mode === 'shore' && dist[i] > .5) || (mode === 'spear' && (d >= 30 || dist[i] >= 2))) continue; // modeFit is 0 there
    const j = K.idx[i], hk = K.h[j], df = K.d[j];
    const br = boat ? .55 + .45 * boatReach(i) : 0, mf0 = mode === 'spear' ? trap(d, -1, 0, 15, 30) * trap(dist[i], -1, 0, 1, 2) : 1, ct = ctOn ? coastType[i] : -1;
    let m = 0; // the ALL_TOPK-th best fit so far: a fish whose bound cannot beat it is skipped
    top.fill(0);
    const put = v => { if (v <= m) return; let q = TK - 1; while (q > 0 && top[q - 1] < v) { top[q] = top[q - 1]; q--; } top[q] = v; m = top[TK - 1]; };
    if (K.n[j] < 8) for (const p of prof) { if (p.v(hk, df) * 1.1 > m) put(fit(p, hk, df, i, br, mf0, ct)); }
    else {
      let L = lists[j];
      if (!L) { // the fish that can live at this depth on this seabed, best first
        const v = [];
        prof.forEach((p, q) => { const x = p.v(hk, df); if (x > 0) v.push([x, q]); });
        v.sort((a, b) => b[0] - a[0]);
        L = lists[j] = { v: v.map(x => x[0]), q: v.map(x => x[1]) };
      }
      for (let q = 0; q < L.v.length; q++) { if (L.v[q] * 1.1 <= m) break; put(fit(prof[L.q[q]], hk, df, i, br, mf0, ct)); }
    }
    let sum = 0; for (let q = 0; q < TK; q++) sum += top[q];
    r[i] = sum / TK;
  }
  if (A.i < N) { allDone.delete(key); allDone.set(key, r); if (allDone.size > 3) allDone.delete(allDone.keys().next().value); } // just finished: kept
  A.i = N; A.lists = A.prof = null; return r; // only the result stays
}
const newBuf = () => ({ where: new Float32Array(N), keep: new Float32Array(N), temp: new Float32Array(N), prod: null, seen: new Float32Array(N),
  idx: null, n: 0, sidx: null, ns: 0, nodeBase: null, nodeFront: null });
// Parts that are the same for every fish, worked out once per input (by identity: new data is a new array) instead of in every prepare():
// the plankton fit per cell (a log10 per sea cell was half a fish's prepare), fCur per forecast node-hour, and each hour's day in the ocean file.
const memo = {};
function shared(k, key, make) { const m = memo[k]; if (m && m.key.every((v, j) => v === key[j])) return m.v; memo[k] = { key, v: make() }; return memo[k].v; }
const prodMap = () => shared('prod', [sat.chl], () => {
  const a = new Float32Array(N), chl = sat.chl;
  if (chl) for (let i = 0; i < N; i++) if (depth[i]) a[i] = fChl(chl[i]) || 0;
  return a;
});
const curFit = () => shared('cur', [F], () => { const a = new Float64Array(F.cur.length); for (let k = 0; k < a.length; k++) a[k] = fCur(F.cur[k]); return a; });
const settleMax = () => shared('settle', [F], () => { let m = -Infinity; for (const v of F.settle) if (v > m) m = v; return m; });
const ocDays = () => shared('od', [hours, sat.oc, sat.oc.d0], () => Int8Array.from(hours, x => { const d = ocDay(x.t + 18e5); return d === sat.oc.d0 ? -1 : d; }));

// A scoring context for one fish and method: fixed per-cell parts plus per-hour parts on the forecast grid.
// P.idx lists the cells that can score (where > 0) and P.sidx those of SAMPLE, so the hourly loops skip the rest.
// keep and temp are filled only there: everywhere else the score is 0 whatever they hold.
// Round 16 engine, phase 2: the work is a generator (prepareGen) that hands back control every 32,768 cells (and between slices of the
// All-fish fit), so that the fish on the map can be prepared a slice at a time (prepSoon) instead of in one 0.3-0.4 s block on a phone.
// prepare() runs it to its end in one go, as before: the same lines in the same order, so the same numbers.
function prepare(s, mode, cells, buf) { const g = prepareGen(s, mode, cells, buf); let r; do r = g.next(); while (!r.done); return r.value; }
function* prepareGen(s, mode, cells, buf = newBuf()) {
  const spear = mode === 'spear', P = Object.assign(buf, { s, mode, spear, tday: -1, edgeAff: EDGE_AFFINITY[s.group] ?? .2, settleAff: SETTLE_AFFINITY[mode],
    wbase: WB.temp + WB.time + WB.moon + WB.waves + WB.press + WB.current * s.current + (spear ? WB.vis : 0) });
  const methodFit = s.methods.includes(mode) ? 1 : .5, seen = seenFor(s.id, P.seen), month = refMonth();
  const noSpear = spear && bathing && bathingSeason(month), shut = zoneShut(mode, month); // shut: the seasonal zone (core.js zoneShut) is closed for this method this month
  const aF = attrK ? ATTRACT.farm.aff[s.id] ?? 0 : 0, aO = attrK ? ATTRACT.outfall.aff[s.id] ?? 0 : 0; // fish farm halo, warm outfall: x the hour's month weight in scoreCells
  let allR = null; if (s.all) while (!(allR = allFit(mode, month, performance.now() + 8))) yield; // allFit in slices: the same result
  const fit = !s.all && fitFor(s.id), fitT = fit && fitTables(fit), den = !s.all && denFor(s.id), dn = den && denNodes();
  const depT = depthTable(s), habT = habTable(s), coastT = new Float64Array(256), accT = new Float64Array(256);
  for (let c = 0; c < 256; c++) { coastT[c] = coastType && mode !== 'boat' ? coastFitC(c, s, mode) : 1; accT[c] = shoreDist && mode !== 'boat' ? accessFitD(c, mode) : 1; }
  P.prod = prodMap();
  const { where, keep, temp, edgeAff } = P, m0 = cells ? cells.length : N, banned = s.banned, structure = s.structure, front = s.front;
  const [t0, t1, t2, t3] = s.sst, [lo, hi] = s.shoreKm, f0 = lo * .4 - .01, f3 = hi * 1.6 + 1; // fTemp, fishTemp, fShore
  if (!(P.idx?.length >= m0)) P.idx = new Int32Array(m0);
  const idx = P.idx; let n = 0;
  for (let j = 0; j < m0; j++) {
    if (!(j & 32767) && j) yield;
    const i = cells ? cells[j] : j;
    if (banned || !depth[i] || northMask[i] || (prot && (prot[i] === 3 || (shut && prot[i] === 4))) || (restricted && restricted[i] && restricted[i] !== 3) || (noSpear && bathing[i])) { where[i] = 0; continue; } // banned fish and closed waters never score
    const fd = depT[dFit[i]];
    const r = allR ? allR[i] : fd && fd * habT[habK[i]]
      * (mode === 'boat' ? (.25 + .75 * trap(dist[i], f0, lo, hi, f3)) * (.55 + .45 * boatReach(i)) : modeFit(i, s, mode)) * methodFit * coastT[coastType ? coastType[i] : 0];
    // soften with a power: several partial fits should not multiply a good spot into nothing
    let x = r * (prot && prot[i] === 2 ? .35 : 1) * accT[shoreDist ? shoreDist[i] : 0];
    if (fitT && x) x = Math.min(1, x * fitC(fitT, i)); // fitWhere(), from the tables
    if (den && x) x = Math.min(1, x * den[dn[i]]); // × the fish's record density (js/fit.js)
    where[i] = x ? Math.pow(x, .6) : 0;
    if (!where[i]) continue;
    keep[i] = (1 - structure * struct[i]) * (1 - KNOWN_AFFINITY * known[i]) * (1 - SEEN_AFFINITY * seen[i]) * (1 - edgeAff * edge[i]) * (1 - front * frontAt(i));
    const t = sat.sst ? fishTemp(i, s) : NaN;
    temp[i] = sat.sst ? Number.isNaN(t) ? .5 : trap(t, t0, t1, t2, t3) : 0; // fTemp; a gap in the map is neutral, too cold or too warm is 0
    idx[n++] = i;
  }
  P.n = n;
  if (cells) { P.sidx = idx; P.ns = n; } // ranking: the cells are SAMPLE
  else {
    if (!(P.sidx?.length >= SAMPLE.length)) P.sidx = new Int32Array(SAMPLE.length);
    let m = 0; for (const i of SAMPLE) if (where[i]) P.sidx[m++] = i;
    P.ns = m;
  }
  { // best where-fit first, for the skipping in scoreCells (ties in any order). Sorted as plain numbers, ~4× faster than with a comparator:
    // a positive float's bits grow with its value, so key = bits × SK + position (bits < 2^30, so exact below 2^53).
    const ns = P.ns, sidx = P.sidx, SK = 2 ** Math.ceil(Math.log2(ns + 1)), key = new Float64Array(ns), tmp = sidx.slice(0, ns);
    const bits = new Uint32Array(where.buffer, where.byteOffset, where.length);
    for (let j = 0; j < ns; j++) key[j] = bits[sidx[j]] * SK + j;
    key.sort();
    for (let j = 0; j < ns; j++) sidx[j] = tmp[key[ns - 1 - j] % SK];
  }
  if (F) {
    const T = F.T * NN;
    if (P.nodeBase?.length !== T) { P.nodeBase = new Float32Array(T); P.nodeFront = new Float32Array(T); }
    const { nodeBase, nodeFront } = P, fc = curFit(), cs = WB.current * s.current, fsst = F.sst, fgrad = F.grad, sst0 = !!sat.sst; // hoisted: ~10× faster
    for (let k = 0; k < T; k++) nodeBase[k] = (sst0 ? 0 : WB.temp * fTemp(fsst[k], s)) + cs * fc[k];
    if (sat.grad) nodeFront.fill(1); else for (let k = 0; k < T; k++) nodeFront[k] = 1 - s.front * clamp(fgrad[k] / FRONT_FULL);
    // Night spearfishing (licensed divers, with a torch): resting day fish are easy to approach, so they keep a fair score.
    P.uni = hours.map(x => WB.time * (spear && !daylight(x) ? Math.max(fTime(x, s), .6) : fTime(x, s)) + WB.moon * fMoon(x, s) + WB.press * fPress(x));
    // Each hour's day in the ocean file (sources.js), -1 outside it; on the satellite's own day P.temp already holds it.
    P.od = sat.oc && sat.sst ? ocDays() : null;
    P.aFm = aF; P.aOm = aO; // their largest (month weights are at most 1): the bound in scoreCells
    P.aF = aF ? Float64Array.from(hours, x => aF * ATTRACT.farm.season[x.month]) : null; P.aO = aO ? Float64Array.from(hours, x => aO * ATTRACT.outfall.season[x.month]) : null; // the attractors' season in each hour's own month
    const uniMax = WB.time + WB.moon * Math.max(s.moon.new, s.moon.full) + WB.press; // fTime, fMoon, fPress all at their best
    P.season = hours.map((x, h) => s.closed?.includes(x.month + 1) ? 0 // closed season (e.g. albacore): nothing scores
      : seasonGate(x, s) * Math.max(0, 1 - TILT * (uniMax - P.uni[h]))); // × the hour's tilt, at most 1
    // Per hour, an upper bound of the (.5 + .5·base) factor. With every attractor weight in 0..1 the gate and keep factors are at most 1,
    // so no cell scores above 100·where·season·ub[h]; the 1e-9 covers rounding. Otherwise (no such profile today) nothing is skipped.
    let nb = -Infinity; for (let k = 0; k < T; k++) if (P.nodeBase[k] > nb) nb = P.nodeBase[k];
    const unit = [s.dropoff, s.chlorophyll, s.front, s.structure, P.edgeAff, P.settleAff, KNOWN_AFFINITY, SEEN_AFFINITY, aF, aO].every(x => x >= 0 && x <= 1);
    P.ub = unit ? Float64Array.from(hours, (_, h) => P.season[h] >= 0
      ? (.5 + .5 * (nb + P.uni[h] + WB.waves + (sat.sst ? WB.temp : 0) + (spear ? WB.vis : 0)) / P.wbase) * (1 + 1e-9) : Infinity) : null;
    // With ub, scoreCells also bounds each cell's (.6 + .4·(1 − keep)) factor: keep at its least, from its fixed part and the lowest its
    // hourly parts reach (front, settle; flow ≤ 1, upwelling ≤ coastW). All fish by boat: bestOver 80 → 18 ms, the whole ranking 205 → 94.
    let fl = 1; if (!sat.grad) for (let k = 0; k < T; k++) if (nodeFront[k] < fl) fl = nodeFront[k];
    P.frontLo = fl; P.settleHi = settleMax();
  }
  return P;
}
// bil() (core.js) with the cell's weights worked out once for every field: the same arithmetic.
const NX = C.nx, bl = (a, b, fx, gx, fy, gy) => (a[b] * gx + a[b + 1] * fx) * gy + (a[b + NX] * gx + a[b + NX + 1] * fx) * fy;
// The score of cells idx[j0..j1) over hours h0..h1-1: one formula for every use, each cell's fixed inputs read once for all its hours.
// op 0: write it, rounded, into acc[j] (a zeroed byte array along idx: one hour of the map, map.js), or into `scores` without acc;
// 1: acc[h] = Math.max over the cells (bestOver);
// 2: acc[h] = the largest above 0 (ranking); 3: return the one cell's score and fill `out` (scoreAt).
// Ops 1 and 2 skip a cell-hour whose bound (prepare's P.ub, times the cell's own kub) cannot beat acc[h], which leaves every maximum as it
// was; on P.sidx (best where first) a cell with every hour skipped by P.ub alone means all later ones would be too, so they return true there. Op 0 skips a
// cell whose bound is below 0.5: it rounds to 0 (a closed season, say). Spear scores can be NaN (no plankton data) and
// Math.max keeps a NaN, so op 1 does not skip for spearfishing (the map and the ranking treat NaN as 0 anyway).
function scoreCells(P, h0, h1, idx, j0, j1, op, acc, out) {
  // Fish profiles all have different shapes, so their fields are read once here, not per cell (fWaves inlined for the same reason).
  const s = P.s, drop = s.dropoff, chla = s.chlorophyll, wv0 = s.waves[0], wv1 = s.waves[1], wv2 = s.waves[1] + 1;
  const spear = P.spear, wbase = P.wbase, settleAff = P.settleAff, uniA = P.uni, seasonA = P.season, od = P.od, [t0, t1, t2, t3] = s.sst;
  const { where, keep: keepA, temp: tempA, prod: prodA, nodeBase, nodeFront, aF, aO } = P, sst = sat.sst, chl = sat.chl, grad = sat.grad;
  const fw = F.wave, fwx = F.wx, fwy = F.wy, fu = F.u, fv = F.v, fg = F.gust, fc = F.cur, fvis = F.vis, fs = F.settle;
  const ub = op !== 3 && (op !== 1 || !spear) ? P.ub : null, sorted = ub && op && idx === P.sidx, floor = op ? acc : null; // op 0: skip what rounds to 0
  const pc = (window.PsPersonal || window.PsCatch)?.correction(s.id), pcC = pc?.cell, pcH = pc?.hour, pcM = pc ? pc.max : 1; // your own catches (js/personal.js; without it js/catchlog.js), off unless turned on
  // The map, an hour at a time (op 0 on P.idx): each cell's temperature fit on the hour's ocean day is kept for that day's other hours
  // (P.tfit[j], NaN = not yet; prepare() resets it): it was ~¼ of a render while scrubbing.
  let tfit = null;
  if (op === 0 && od && idx === P.idx && h1 === h0 + 1 && od[h0] >= 0) {
    if (P.tday !== od[h0]) { P.tday = od[h0]; if (!(P.tfit?.length >= P.n)) P.tfit = new Float64Array(P.n); P.tfit.fill(NaN, 0, P.n); }
    tfit = P.tfit;
  }
  const seaE = window.PsSea?.score ? PsSea.grid() : null, seaF = seaE && PsSea.fields(F); // round 17 day map
  for (let j = j0; j < j1; j++) {
    const i = idx[j], w = where[i], nw = nearW[i], ox = onx[i], oy = ony[i], b0 = bi[i], fx = bx[i], fy = by[i], gx = 1 - fx, gy = 1 - fy;
    const af = aF ? attrK.farm[i] / 255 : 0, ao = aO ? attrK.outfall[i] / 255 : 0; // fish farm halo, warm outfall at this cell
    const cw = coastW[i], rel = relief[i], kp = keepA[i], tp = tempA[i], pd = prodA[i], haze = spear ? (chl ? clamp((clarityM(i) - 5) / 15) : .7) : 0;
    let live = false, lastD = -2, lastT = 0; // the cell's temperature fit on day lastD of the ocean file: one per day, not per hour
    const kl = ub ? kp * (af ? 1 - P.aFm * af : 1) * (ao ? 1 - P.aOm * ao : 1) * (1 - drop * rel) * P.frontLo * (1 - chla * Math.max(pd, cw)) * (1 - settleAff * P.settleHi) : 0, kub = kl > 0 ? .6 + .4 * (1 - kl) : 1; // prepare()
    for (let h = h0; h < h1; h++) {
      const ws0 = 100 * w * seasonA[h]; // the score's first two factors, as the formula below multiplies them
      if (ub) {
        const cap = ws0 * ub[h] * pcM;
        if (floor ? cap <= floor[h] : cap < .5) continue;
        live = true; // later cells on P.sidx (less where) could still beat acc[h]: this cut depends on where alone, kub on the cell
        if (floor ? cap * kub <= floor[h] : cap * kub < .5) continue;
      } else live = true;
      const b = h * NN + b0;
      // Shelter: within a few km of the coast, waves and wind coming off the land barely reach the water.
      const wave = bl(fw, b, fx, gx, fy, gy), u = bl(fu, b, fx, gx, fy, gy), v = bl(fv, b, fx, gx, fy, gy), ws = Math.hypot(u, v) || .01;
      let expo, wEff, shelter;
      // round 17 day map (agent D; js/seastate.js, eval/LOG.md "Round 17 day map"): the waves and the wind at THIS cell from its open-water fetch
      // toward today's wind and swell (data/exposure.bin), in place of the rule below it (one offshore direction per cell, fading 3 km out).
      // seaE is null, and every score as shipped, unless PsSea.score is on and the file is in.
      if (seaE) { wEff = PsSea.at(seaE, N, i, wave, bl(seaF.sw, b, fx, gx, fy, gy), bl(seaF.sx, b, fx, gx, fy, gy), bl(seaF.sy, b, fx, gx, fy, gy), u, v, seaO); shelter = seaO[1]; expo = wave > .01 ? Math.min(1, wEff / wave) : 1; }
      else { // end of round 17 day map
        expo = wave > .01 ? clamp(-(bl(fwx, b, fx, gx, fy, gy) * ox + bl(fwy, b, fx, gx, fy, gy) * oy) / wave) : 1;
        wEff = wave * (1 - nw * .8 * (1 - expo));
        shelter = 1 - nw * .5 * (1 - clamp(-(u * ox + v * oy) / ws));
      }
      const gu = bl(fg, b, fx, gx, fy, gy) * shelter;
      let gate = fGate(wEff, ws * shelter, gu);
      if (spear) gate = Math.min(gate, 1 - clamp((wEff - .8) / .8)); // diving needs a calm sea
      const cur_ = bl(fc, b, fx, gx, fy, gy), vis = spear ? bl(fvis, b, fx, gx, fy, gy) * haze : 0; // stirred-up water × plankton haze
      let tpH = tp; // the temperature fit on this hour's day (the ocean file), else the satellite day's
      if (od && od[h] >= 0) {
        if (od[h] !== lastD) {
          lastD = od[h]; lastT = tfit ? tfit[j] : NaN;
          if (lastT !== lastT) { const t = fishTemp(i, s, lastD); lastT = Number.isNaN(t) ? .5 : trap(t, t0, t1, t2, t3); if (tfit) tfit[j] = lastT; }
        }
        tpH = lastT;
      }
      const base = (bl(nodeBase, b, fx, gx, fy, gy) + uniA[h] + WB.waves * trap(wEff, -1, wv0, wv1, wv2) + (sst ? WB.temp * tpH : 0) + WB.vis * vis) / wbase;
      const up = clamp((v * ox - u * oy) / 25) * cw; // Ekman transport 90° right of the wind; offshore transport lifts rich water
      const settle = bl(fs, b, fx, gx, fy, gy), flow = .6 + .4 * clamp(cur_ / 1.2); // drop-offs fish better with water moving over them
      const keep = kp * (af ? 1 - aF[h] * af : 1) * (ao ? 1 - aO[h] * ao : 1) * (1 - drop * rel * flow) * (grad ? 1 : bl(nodeFront, b, fx, gx, fy, gy))
        * (1 - chla * Math.max(pd, up)) * (1 - settleAff * settle);
      const score = Math.min(100, ws0 * gate * (.5 + .5 * base) * (.6 + .4 * (1 - keep)) * (pc ? pcC[i] * pcH[h] : 1));
      if (op === 0) { if (acc) acc[j] = Math.round(score); else scores[i] = Math.round(score); }
      else if (op === 1) acc[h] = Math.max(acc[h], score);
      else if (op === 2) { if (score > acc[h]) acc[h] = score; }
      else { // pre: the score before the sea-state gate (js/feeds.js scoreInfo moves the gate by the forecast's error)
        if (out) Object.assign(out, { wave, wEff, expo, ws, wsEff: ws * shelter, gust: gu, gate, cur: cur_, vis, up, settle, flow, base, keep,
          pre: Math.min(100, ws0 * (.5 + .5 * base) * (.6 + .4 * (1 - keep)) * (pc ? pcC[i] * pcH[h] : 1)) });
        return score;
      }
    }
    if (sorted && !live) return true;
  }
  return false;
}
// Round 16 engine: the temperature fit of cells P.idx[j0..j1) on day d of the ocean file, into out[j]: scoreCells' own lines (lastT), for the
// hour worker (js/map.js), which holds no ocean file and so gets each day's fit ready-made.
function tempFitDay(P, d, out, j0, j1) {
  const s = P.s, idx = P.idx, [t0, t1, t2, t3] = s.sst;
  for (let j = j0; j < j1; j++) { const t = fishTemp(idx[j], s, d); out[j] = Number.isNaN(t) ? .5 : trap(t, t0, t1, t2, t3); }
}
// Round 16 engine: what the hour worker (js/hour-worker.js, driven by js/map.js HW) is given, so that scoreCells runs there as it does here.
// The worker loads THIS file with importScripts (HW_SCRIPTS): scoreCells and everything it calls in this file are the same code in both
// places, with nothing copied. The worker has no core.js, no sources.js and no DOM, so what scoreCells reads from outside this file is listed here:
//   HW_FNS     core.js helpers, sent as their own text;
//   hwGlobals  fixed grids, the forecast's fields and constants, each under its global name (sent once per forecast);
//   HW_P       the fields of a prepare() context P that scoreCells reads (sent once per fish and method), with the sat flags (hwFish).
// A new per-cell, per-hour factor inside scoreCells (round 17 day map): write it in this file, or in a DOM-free script added to HW_SCRIPTS;
// add each fixed grid or forecast field it reads to hwGlobals and each field it keeps on P to HW_P. That is all: both paths then run it.
const HW_SCRIPTS = ['model.js', 'seastate.js']; // relative to js/hour-worker.js, loaded in this order (seastate.js: round 17 day map, PsSea.at)
const HW_FNS = () => ({ clamp, lerp, trap });
const hwSea = () => !!(window.PsSea?.score && PsSea.grid()); // round 17 day map: the per-cell sea gate is on (js/seastate.js); its grid and the swell fields go to the worker only then
const hwGlobals = () => ({ N, NN, WB, C, attrK, nearW, onx, ony, bi, bx, by, coastW, relief, PsSeaGrid: hwSea() ? PsSea.grid() : null,
  F: { T: F.T, wave: F.wave, wx: F.wx, wy: F.wy, u: F.u, v: F.v, gust: F.gust, cur: F.cur, vis: F.vis, settle: F.settle, ...(hwSea() ? { swell: F.swell, swellDir: F.swellDir } : {}) } });
const HW_P = ['spear', 'wbase', 'settleAff', 'uni', 'season', 'od', 'where', 'keep', 'temp', 'prod', 'nodeBase', 'nodeFront', 'aF', 'aO', 'aFm', 'aOm', 'ub', 'frontLo', 'settleHi', 'n'];
function hwFish(P) { // copies: prepare() reuses its buffers for the next fish
  const o = { s: Object.fromEntries(Object.entries(P.s).filter(([, v]) => typeof v !== 'function')), idx: P.idx.slice(0, P.n), tday: -1 };
  for (const k of HW_P) o[k] = P[k];
  return { P: o, set: { sat: { sst: !!sat.sst, chl: !!sat.chl, grad: !!sat.grad } } }; // scoreCells only asks whether each satellite map is there
}
const ONE = new Int32Array(1), seaO = new Float64Array(4); // seaO: round 17 day map
function scoreAt(i, h, out, P = cur) {
  if (!P.where[i] && !out) return 0;
  ONE[0] = i; return scoreCells(P, h, h + 1, ONE, 0, 1, 3, null, out);
}
const bestOver = P => { const acc = new Float64Array(hours.length); scoreCells(P, 0, hours.length, P.sidx, 0, P.ns, 1, acc); return Array.from(acc); };
let curGen = 0, genSeq = 0; // curGen: a new number at every prepCurrent / prepSoon (map.js keeps the hours it scored for one cur only); genSeq hands them out, so a dropped prepSoon's number is never used
function prepCurrent() {
  prepJob++; prepWait(false); // a prepSoon still at work is dropped: this one is the fish on the map now
  sp = byId(state.sp); curGen = ++genSeq;
  if (!F) { cur ||= newBuf(); return; } // nothing is scored before the forecast is in (app.js prepares again then)
  cur = prepare(sp, state.mode, null, cur || newBuf());
  best = bestOver(cur);
}
// Round 16 engine, phase 2: prepCurrent() without the freeze, for a tap on a fish or a method (js/ui.js refresh). The new fish is prepared
// into a second buffer and its best-hour line worked out, PREP_FIRST ms at once (a small fish on a fast device is done there and then, as
// before) and the rest in slices of SLICE ms; until it is whole the map, the cards and `sp` stay the previous fish's, the heat dimmed
// (map.js heatWait). Then cur, sp, best and curGen change together and then() draws. Same numbers as prepCurrent(): prepare()'s own lines,
// and bestOver's maximum taken 100 cells at a time (as rankAll does). ponytail: a second buffer (~13 MB) is kept for the next switch.
let prepJob = 0, prepBusy = false, spareBuf = null;
const PREP_FIRST = 24;
function prepWait(on) { prepBusy = on; if (typeof heatWait === 'function') heatWait(on); }
function prepSoon(then) {
  if (!F) { prepCurrent(); then(); return; }
  // Phase 3: once the fish is prepared, its first hour is asked of the hour worker at once (map.js hwAsk, under the number curGen will take),
  // so the map is being scored while the best-hour line is worked out here; slices follow each other without setTimeout's 4 ms gaps;
  // and the buffer of the fish before goes after the swap (~13 MB; the next switch makes its own).
  const job = ++prepJob, gen = ++genSeq, s = byId(state.sp), g = prepareGen(s, state.mode, null, spareBuf ||= newBuf());
  const soon = f => window.scheduler?.postTask ? scheduler.postTask(f, { priority: 'user-visible' }) : setTimeout(f, 0);
  let P = null, acc = null, j = 0, first = true, warm = typeof hwAsk === 'function' ? 2 : 0;
  const step = () => {
    if (job !== prepJob) return; // a later tap, or prepCurrent() itself (a new forecast): that one draws
    const until = performance.now() + (first ? PREP_FIRST : SLICE); let tried = false;
    do {
      if (!P) { const r = g.next(); if (r.done) { P = r.value; acc = new Float64Array(hours.length); } }
      else if (warm === 2 && !tried) { tried = true; warm = hwAsk(state.h, P, gen); } // 2: the worker is busy, or a slice of the day's temperatures was made: again next slice
      else if (j < P.ns) { const j1 = Math.min(P.ns, j + 100); j = scoreCells(P, 0, hours.length, P.sidx, j, j1, 1, acc) ? P.ns : j1; } // bestOver, a piece at a time
      else { cur = P; spareBuf = null; sp = s; curGen = gen; best = Array.from(acc); prepWait(false); then(); return; }
    } while (performance.now() < until);
    if (first) { first = false; prepWait(true); }
    soon(step);
  };
  step();
}
function habText(i) { // the seabed in words, e.g. "rock 40% · seagrass 30% · sand 30%"
  const k = habK[i], r = (k / 11 | 0) % 11, g = k % 11, t = tr('hab'), c = HAB?.classes[k / 121 | 0] ?? 'unknown';
  if (r === 10 || g === 10) return t[r === 10 ? 'rock' : 'seagrass'];
  return [r && `${t.rock} ${r * 10}%`, g && `${t.seagrass} ${g * 10}%`, t[c === 'rock' || c === 'seagrass' ? 'sand' : c] + (r || g ? ` ${100 - 10 * (r + g)}%` : '')].filter(Boolean).join(' · ');
}
function explain(i, h) {
  const fit = !sp.all && fitFor(sp.id), den = !sp.all && denFor(sp.id), fitK = (fit ? fitC(fitTables(fit), i) : 1) * (den ? denAt(den, i) : 1);
  const x = hours[h], k = h * NN, n = nearestNode(i), o = {}, score = Math.round(scoreAt(i, h, o)), s = sp;
  const od = ocDay(x.t + 18e5), t = sat.sst ? fishTemp(i, s, od) : bil(F.sst, k, i), launch = LAUNCH[launchOf[i]], nSeen = (SIGHT[s.id] || []).filter(([la, lo]) => km([la, lo], [latOf(i), lonOf(i)]).d < 1).length;
  const mixed = od >= 0 ? mixedAt(i, od) : sat.mld?.[i], surf = sat.sst && sat.sst[i] + (od >= 0 ? surfDelta(i, od) : 0); // the hour's day
  const tempText = !sat.sst ? `${nf(t)} °C ${tr('forecast')}` : s.group !== 'pelagic' && (od >= 0 ? depth[i] > (mixed || 25) : belowMixed(i))
    ? `${tr('bottomT')} ${nf(t)} °C (${tr('surface')} ${nf(surf)}, ${tr('mixed')} ${Math.round(mixed || 25)} m)` : `${tr('surface')} ${nf(t)} °C`;
  const spear = state.mode === 'spear'; // modeFit's free-diving depth (≤ 30 m) belongs to the depth reason, its swimming distance to the shore one
  const rows = [
    ['f_depth', `${dFit[i]} m`, fDepth(i, s) * (spear ? trap(depth[i], -1, 0, 15, 30) : 1), 1],
    ['f_seabed', habText(i), fHab(i, s), hab ? 1 : 0],
    ['f_shore', `${nf(dist[i])} km`, spear ? trap(dist[i], -1, 0, 1, 2) : modeFit(i, s, state.mode), 1],
    ['f_run', launch ? tr('from', nf(launchKm[i]), launch[0] || tr('spot')[launch[1]].toLowerCase()) : tr('noLaunch'), boatReach(i), state.mode === 'boat' ? 1 : 0],
    ['f_access', !shoreDist || shoreDist[i] === 255 ? '–' : shoreDist[i] >= 250 ? tr('noAccess') : tr('accessM', shoreDist[i] * 10), accessFit(i, state.mode), shoreDist && state.mode !== 'boat' ? 1 : 0],
    ['f_coast', coastType ? tr('coastType')[coastType[i]] : '–', Math.min(1, coastFit(i, s, state.mode)), coastType && state.mode !== 'boat' ? 1 : 0],
    ['f_relief', `${Math.round(relief[i] * 100)}% · ${tr('flow')} ${Math.round((o.flow - .6) / .4 * 100)}%`, relief[i] * o.flow, s.dropoff],
    ['f_struct', struct[i] ? `${Math.round(struct[i] * 100)}%` : tr('none'), struct[i], s.structure],
    ['f_seen', nSeen ? tr('recorded', nSeen) : tr('none'), cur.seen[i], SIGHT[s.id] ? SEEN_AFFINITY : 0],
    ['f_edge', `${Math.round(edge[i] * 100)}%`, edge[i], cur.edgeAff],
    ...['farm', 'outfall'].map(k => ['f_' + k, `${Math.round((attrK?.[k][i] ?? 0) / 2.55)}%`, (attrK?.[k][i] ?? 0) / 255, attrK?.[k][i] ? (ATTRACT[k].aff[s.id] ?? 0) * ATTRACT[k].season[x.month] : 0]),
    ['f_known', known[i] ? tr('nearby') : tr('none'), known[i], known[i] ? KNOWN_AFFINITY : 0],
    ['f_temp', tempText, fTemp(t, s), 1],
    ['f_front', `${nf(sat.grad ? sat.grad[i] : bil(F.grad, k, i), 2)} °C/km`, sat.grad ? frontAt(i) : clamp(bil(F.grad, k, i) / FRONT_FULL), s.front],
    ['f_plankton', sat.chl ? `${nf(sat.chl[i], 3)} mg/m³` : tr('noData'), cur.prod[i], sat.chl ? s.chlorophyll : 0],
    ['f_up', `${Math.round(o.up * 100)}%`, o.up, s.chlorophyll],
    ['f_current', `${nf(o.cur)} km/h`, fCur(o.cur), s.current],
    ['f_waves', `${nf(o.wave)} m → ${nf(o.wEff)} m ${tr('here')} (${tr(o.expo > .5 ? 'exposed' : 'sheltered')})`, fWaves(o.wEff, s), 1],
    ['f_wind', `${compass(F.windDir[k + n])} ${Math.round(o.ws)} → ${Math.round(o.wsEff)} km/h`, o.gate, 1],
    ['f_settle', `${Math.round(o.settle * 100)}%`, o.settle, cur.settleAff],
    ['f_clarity', sat.chl ? `~${Math.round(secchiM(1.3 / clarityM(i)))} m ${tr('visibility')}, ${Math.round(bil(F.vis, k, i) * 100)}% ${tr('settled')}` : `${Math.round(o.vis * 100)}%`, o.vis, cur.spear ? 1 : 0],
    ['f_time', tr(x.period) + (x.solunar ? ` · ${tr(x.solunar)}` : '') + (x.period === 'day' && x.cloud > 50 ? ` · ${tr('overcast')}` : ''), fTime(x, s), 1],
    // round 16 timing: no moon or pressure rows: they are out of the score (see the round 16 timing block); the moon and its periods are shown elsewhere, as information
    ['f_season', tr('months')[x.month], seasonAt(x, s), 1], // nominative month: Intl gives the Greek genitive
    ...(fit || den ? [['f_fit', `${tr('fitFrom', fit ? fit.n : (SIGHT[s.id] || []).length)} · ×${nf(fitK, 2)}`, Math.min(1, fitK), 1]] : []), // learned correction × record density
    ...((window.PsPersonal || window.PsCatch)?.row(i, h) || []),
  ].filter(r => r[3] > 0);
  return { score, rows };
}
function zoneAt(la, lo) { // protected zone containing the point, by ray casting
  for (const z of PROT?.zones || []) {
    let inside = false;
    for (const r of z.rings) for (let a = 0, b = r.length - 1; a < r.length; b = a++)
      if ((r[a][0] > la) !== (r[b][0] > la) && lo < (r[b][1] - r[a][1]) * (la - r[a][0]) / (r[b][0] - r[a][0]) + r[a][1]) inside = !inside;
    if (inside) return z;
  }
  return null;
}

/* ---------- Ranking every fish: best chance over the forecast (F.T hours), for the current method ---------- */
// Runs in slices of SLICE ms of wall time, one small piece of work at a time (on a slow phone a slice just does less), so taps
// and the timeline never wait long behind it. Background work stops while the page is hidden (a phone in a pocket) and goes on when shown.
const SLICE = 12;
const onShown = f => document.addEventListener('visibilitychange', f, { once: true }); // the next change of a hidden page: it is shown
let rank = {}, rankRun = 0, rankBuf = null; // rankBuf (~16 MB) lives only while a ranking runs
// Round 16 engine, phase 4: its slices run in idle time where the browser has it (within 300 ms at the latest), so a tap, a spot sheet or a
// scrub goes first; before, a slice followed the last at once and the ranking's ~1-3 s of work sat in front of whatever the finger did next.
const rankIdle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 300 }) : setTimeout(f, 0);
function rankAll() {
  const run = ++rankRun, acc = new Float64Array(F.T); rank = {}; let k = 0, P = null, s = null, j = 0, first = 0;
  const step = () => {
    if (run !== rankRun) return;
    if (document.hidden) { onShown(step); return; }
    const until = performance.now() + SLICE;
    do {
      if (!P) { // the next fish
        if (k >= SPECIES.length) { // done: free the buffer and warm the All-fish map in slices, so picking it is instant
          rankBuf = null;
          const warm = () => { if (run !== rankRun) return; if (document.hidden) onShown(warm); else if (!allFit(state.mode, refMonth(), performance.now() + SLICE)) rankIdle(warm); };
          setTimeout(warm, 50); return;
        }
        s = SPECIES[k++];
        if (!s.banned) { P = prepare(s, state.mode, SAMPLE, rankBuf ||= newBuf()); first = state.first; acc.fill(0); j = 0; }
      } else if (j < P.n) { // each hour's best over 100 more sample cells (true: the rest cannot beat it)
        const j1 = Math.min(P.n, j + 100);
        j = scoreCells(P, first, F.T, P.sidx, j, j1, 2, acc) ? P.n : j1;
      } else {
        let bs = 0, bh = first; for (let h = first; h < F.T; h++) if (acc[h] > bs) { bs = acc[h]; bh = h; } // the first hour that reaches the best
        rank[s.id] = { s: Math.round(bs), h: bh }; P = null;
        if (k % 5 === 0 || k === SPECIES.length) { drawFishPanel(); if (!$('#fish-modal').hidden) drawGallery(); }
      }
    } while (performance.now() < until);
    rankIdle(step);
  };
  setTimeout(step, 30);
}
