'use strict';
/* Psarema fine heat (round 13): the same model on ~50 m sub-cells where the map is zoomed in.
   Each 250 m cell is split 5 x 5. A sub-cell takes its own depth, seabed, shore distance and drop-off (data/fine/t<x>_<y>.js, built by
   scripts/fine/build.mjs from the sources the 250 m model uses, read at their own resolution) through the model's own tables and formula:
     score = 100 x where(sub-cell) x season x sea gate x conditions x attractors(sub-cell)
   The hour's part (season, gate, conditions, flow, upwelling, settle, front) is the 250 m cell's (model.js scoreAt), interpolated between
   cell centres; the points' cones (structures, known spots, sightings, farms, outfalls), the habitat edge and the relief are the 250 m
   layers interpolated, the relief plus the sub-cell's own slope minus its cell's mean. Nothing here changes a 250 m score: the list, the
   pins, the cards, the ranking, the bench and the map under zoom 13 are as they were.
   Lazy: nothing loads until the map shows a cell at >= 12 px (zoom 13); then the tiles under the view (15 km each, ~100 kB), and each
   fish's sub-cell fit in slices of 8 ms. Until a tile is ready the map shows the 250 m picture, as before.
   map.js paintFine calls PsFine.over() on the image it has just drawn. The card of a tapped spot stays the 250 m cell's: on the open
   presence records the 50 m fit ranks a fish's records no better than the 250 m fit (scripts/fine/bench.mjs, eval/LOG.md round 13), so
   this is a sharper picture of the same model, not a more accurate score.
   Round 15 (the drawing only; no score changes): the 250 m layers a sub-cell reads (boat reach, access, the coast type's factor, the front, the record
   density on its 1 km nodes) are interpolated between their centres like the hour's part, and the protected zones are read from their own
   outlines at each sub-cell (phase 2), so the picture has no 250 m or 1 km squares in it and stops at the zones' dashed lines; the
   sub-cells are shown at the inputs' own resolution (a 1 2 1 blur over the water: the DTM is ~100 m, the survey ~120 m squares); and the
   detail comes in over half a zoom level (a cell of 10.5 px, zoom 12.5: none; 16 px, zoom 13.1: all), from the zoom where the tiles start loading.
   Round 16 (drawing only): the blur runs twice (the seabed map's ~120 m squares read as squares through one pass), and the 50 m picture fades
   into the 250 m one over 2 cells wherever water has no fine score on screen (past the fine data, a tile with none, a tile still loading), so
   no tile border shows as a straight line. */
window.PsFine = (() => {
  const SUB = 5, TILE = 60, TW = SUB * TILE, NT = TW * TW, FRES = RES / SUB, MINPX = 10.5, FULLPX = 16, WARMPX = 7, KEEP = 6, TXN = W / TILE, TYN = H / TILE, RAMP = 6, RAMPC = 2;
  const slots = new Array(TXN * TYN).fill(null); // per tile: { T: the decoded tile (null while it loads), used }
  let index = null, indexP = null, use = 0;

  /* ---------- tiles ---------- */
  function decode(raw) {
    const runs = new Uint32Array(b64(raw.runs).buffer), dep = b64(raw.depth), lo = b64(raw.habLo), hi = b64(raw.habHi), sh = b64(raw.shore), rl = b64(raw.rel);
    const T = { tx: raw.tx, ty: raw.ty, x0: raw.tx * TW, y0: raw.ty * TW, d: new Uint16Array(NT), hk: new Uint16Array(NT), sh: new Uint8Array(NT), rl: new Uint8Array(NT),
      tw: new Uint8Array(NT), ctx: new Int32Array(TILE * TILE).fill(-1), gen: -1, w: null, kp: null, rf: null, S: null, win: null };
    for (let r = 0, k = 0; r < runs.length; r += 2) for (let i = runs[r], e = i + runs[r + 1]; i < e; i++, k++) {
      T.d[i] = Math.min(DMAX, dep[k] <= 150 ? dep[k] : 150 + (dep[k] - 150) * 10); T.hk[i] = lo[k] | hi[k] << 8; T.sh[i] = sh[k]; T.rl[i] = rl[k];
    }
    // The 250 m cell whose hour and masks a sub-cell uses: its own, or for a land cell with water in it (the real shoreline) the nearest sea cell
    const has = new Uint8Array(TILE * TILE), cellOf = i => ((i / TW | 0) / SUB | 0) * TILE + (i % TW / SUB | 0);
    for (let i = 0; i < NT; i++) if (T.d[i]) has[cellOf(i)] = 1;
    for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
      if (!has[py * TILE + px]) continue;
      const gx = raw.tx * TILE + px, gy = raw.ty * TILE + py; let best = -1, bd = 99;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = gx + dx, y = gy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const j = y * W + x; if (depth[j] && !northMask[j] && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = j; }
      }
      T.ctx[py * TILE + px] = best;
    }
    // How much of a sub-cell is the fine score: 0 at the fine data's outer edge (open water beyond 3 km / 60 m), 1 from 6 sub-cells in,
    // so the 50 m picture runs into the 250 m one without a line. Chamfer distance from the sea sub-cells of cells that have no fine data.
    // ponytail: a tile's own cells only; where the outer edge runs within 300 m of a tile's border the ramp can step there. A halo if it shows.
    const dd = new Uint8Array(NT).fill(RAMP);
    for (let i = 0; i < NT; i++) {
      if (T.d[i] || has[cellOf(i)]) continue;
      const j = (T.ty * TILE + ((i / TW | 0) / SUB | 0)) * W + T.tx * TILE + (i % TW / SUB | 0);
      if (depth[j] && !northMask[j]) dd[i] = 0;
    }
    for (let y = 0; y < TW; y++) for (let x = 0, i = y * TW; x < TW; x++, i++) { let v = dd[i]; if (x && dd[i - 1] + 1 < v) v = dd[i - 1] + 1; if (y && dd[i - TW] + 1 < v) v = dd[i - TW] + 1; dd[i] = v; }
    for (let y = TW - 1; y >= 0; y--) for (let x = TW - 1, i = y * TW + x; x >= 0; x--, i--) { let v = dd[i]; if (x < TW - 1 && dd[i + 1] + 1 < v) v = dd[i + 1] + 1; if (y < TW - 1 && dd[i + TW] + 1 < v) v = dd[i + TW] + 1; dd[i] = v; }
    for (let i = 0; i < NT; i++) T.tw[i] = T.d[i] ? Math.round(255 * dd[i] / RAMP) : 0;
    T.z = zonesIn(T);
    return T;
  }
  // Round 15: the protected zones at the sub-cells, from their outlines (data/protected.js, as map.js draws them; the 250 m grid prot[] is
  // made from the same): 1 protected, 2 restricted, 3 no-take, the strictest where they overlap; null when none reaches the tile. Even-odd
  // scanlines through the sub-cell centres, as scripts/fine/build.mjs fills the land.
  const ZK = { protected: 1, restricted: 2, 'no-take': 3 };
  function zonesIn(T) {
    const n0 = NORTH - T.y0 * FRES, w0 = WEST + T.x0 * FRES; let z = null;
    for (const Z of PROT?.zones || []) {
      const code = zoneCode(Z); if (!code) continue; // round 16 S scoring: the zone's own rule (core.js zoneCode), not its kind alone
      let s = 90, n = -90, w = 180, e = -180; for (const r of Z.rings) for (const [la, lo] of r) { if (la < s) s = la; if (la > n) n = la; if (lo < w) w = lo; if (lo > e) e = lo; }
      const ya = Math.max(0, Math.floor((n0 - n) / FRES)), yb = Math.min(TW - 1, Math.ceil((n0 - s) / FRES)); if (ya > yb || e < w0 || w > w0 + TW * FRES) continue;
      z ||= new Uint8Array(NT);
      for (let y = ya; y <= yb; y++) {
        const lat = n0 - (y + .5) * FRES, xs = [];
        for (const r of Z.rings) for (let k = 0, m = r.length; k < m; k++) { const [a0, o0] = r[(k + m - 1) % m], [a1, o1] = r[k]; if ((a0 > lat) !== (a1 > lat)) xs.push(o0 + (lat - a0) / (a1 - a0) * (o1 - o0)); }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const a = Math.max(0, Math.ceil((xs[k] - w0) / FRES - .5)), b = Math.min(TW - 1, Math.ceil((xs[k + 1] - w0) / FRES - .5) - 1);
          for (let x = a, i = y * TW + a; x <= b; x++, i++) if (ZRANK[z[i]] < ZRANK[code]) z[i] = code; // round 16 S scoring
        }
      }
    }
    return z;
  }
  const tileAt = (tx, ty) => tx >= 0 && ty >= 0 && tx < TXN && ty < TYN ? slots[ty * TXN + tx]?.T || null : null;
  function want(tx, ty, then) { // the tile, or null while it loads (then() once it is in); false: there is none
    const id = `t${tx}_${ty}`, k = ty * TXN + tx;
    if (!index) { indexP ||= loadScripts('data/fine/index.js').then(() => { index = new Set(window.PSAREMA_FINE_INDEX?.tiles || []); then(); }, e => { indexP = null; console.warn(e.message); }); return null; }
    if (!index.has(id)) return false;
    let e = slots[k];
    if (!e) {
      e = slots[k] = { T: null, used: 0 };
      loadScripts(`data/fine/${id}.js`).then(() => { const raw = window.PSAREMA_FINE?.[id]; if (!raw || slots[k] !== e) return; e.T = decode(raw); delete window.PSAREMA_FINE[id]; then(); },
        err => { slots[k] = null; console.warn(err.message); });
    }
    e.used = ++use;
    let n = 0, old = -1; // more than KEEP tiles decoded: the one least lately on screen goes (~1.5 MB each)
    for (let q = 0; q < slots.length; q++) if (slots[q]?.T) { n++; if (old < 0 || slots[q].used < slots[old].used) old = q; }
    if (n > KEEP && old !== k) slots[old] = null;
    return e.T;
  }

  /* ---------- the where-fit of a sub-cell: model.js prepare(), on the sub-cell's depth d (m), seabed key hk and shore distance ds (km) ---------- */
  const shoreKm = (code, c) => code < 254 ? code * .02 : Math.max(5.08, dist[c]);
  // The learned correction's shore table was fitted on the 250 m grid, whose nearest water is one cell (~0.23 km) from land: not read nearer than that
  const fitQ = ds => Math.round(255 * clamp((Math.log(Math.max(ds, KX) + .1) - DQ0) / (DQ1 - DQ0)));
  function tablesFor(P) {
    const s = P.s, mode = P.mode, month = refMonth(), boat = mode === 'boat', [lo, hi] = s.shoreKm; // model.js prepare()'s month (round 15: was today's)
    const o = { s, mode, boat, spear: mode === 'spear', methodFit: s.methods.includes(mode) ? 1 : .5, depT: depthTable(s), habT: habTable(s), coastT: new Float64Array(256), accT: new Float64Array(256),
      noSpear: mode === 'spear' && bathing && bathingSeason(month), lo, hi, f0: lo * .4 - .01, f3: hi * 1.6 + 1, fitT: null, den: null, dn: null, prof: null };
    for (let c = 0; c < 256; c++) { o.coastT[c] = coastType && !boat ? coastFitC(c, s, mode) : 1; o.accT[c] = shoreDist && !boat ? accessFitD(c, mode) : 1; }
    if (s.all) o.prof = SPECIES.filter(f => !f.banned && !f.closed?.includes(month + 1)).map(f => { // model.js allFit(): the best in-season fit of any fish
      const [a, b] = f.shoreKm, coast = new Float64Array(256), fit = fitFor(f.id);
      for (let c = 0; c < 256; c++) coast[c] = coastFitC(c, f, mode);
      return { k: (f.methods.includes(mode) ? 1 : .5) * Math.pow(.3 + .7 * f.season[month], 1 / .6), hab: habTable(f), dep: depthTable(f), t: fit && fitTables(fit), coast, s0: a * .4 - .01, s1: a, s2: b, s3: b * 1.6 + 1 };
    }).sort((p, q) => q.k - p.k);
    else { const fit = fitFor(s.id); o.fitT = fit && fitTables(fit); o.den = denFor(s.id); o.dn = o.den && denNodes(); }
    return o;
  }
  // c: the 250 m cell whose masks, launch, coast type and access the sub-cell takes; fc >= 0: the learned correction as that cell has it;
  // at (build): { br, af, dn } boat reach, access and record density between cell (node) centres; z the sub-cell's own zone code (-1: cell c's);
  // cj / cw the four cells around and their weights, for the coast type. Without it, cell c's own (scripts/fine/bench.mjs).
  const coastF = (t, at, ct) => at ? t[at.cj[0]] * at.cw[0] + t[at.cj[1]] * at.cw[1] + t[at.cj[2]] * at.cw[2] + t[at.cj[3]] * at.cw[3] : t[ct];
  // round 16 S scoring: the seabed around a sub-cell. habMix: the seabed keys of the 5 x 5 sub-cells around sub-cell i of tile T, weights 1 2 3 2 1 each
  // way (half-width ~150 m), water sub-cells of the tile only; habAt: a seabed table read through that mix. The seabed map comes in ~120-250 m squares,
  // which a sub-cell's own key turned into square blobs (eval/LOG.md round 16 phase 3).
  // ponytail: the mix stops at the tile's border, so the outermost 100 m of a tile is mixed over fewer sub-cells; a halo of the neighbour's keys if it shows.
  const HM = { n: 0, k: new Int32Array(25), w: new Float64Array(25) }, HW = [1, 2, 3, 2, 1];
  function habMix(T, i) {
    const x0 = i % TW, y0 = i / TW | 0; let n = 0, sum = 0;
    for (let dy = -2; dy <= 2; dy++) { const y = y0 + dy; if (y < 0 || y >= TW) continue;
      for (let dx = -2; dx <= 2; dx++) { const x = x0 + dx; if (x < 0 || x >= TW) continue;
        const j = y * TW + x; if (!T.d[j]) continue;
        const wt = HW[dy + 2] * HW[dx + 2], key = T.hk[j]; let q = 0; while (q < n && HM.k[q] !== key) q++;
        if (q === n) { HM.k[n] = key; HM.w[n] = 0; n++; }
        HM.w[q] += wt; sum += wt; } }
    for (let q = 0; q < n; q++) HM.w[q] /= sum;
    HM.n = n; return HM;
  }
  const habAt = (t, hk, hm) => { if (!hm || hm.n < 2) return t[hk]; let s = 0; for (let q = 0; q < hm.n; q++) s += t[hm.k[q]] * hm.w[q]; return s; };
  // round 16 S scoring: closed water at a sub-cell (after around()): 1 closed, 0 open. The cells' masks (port, military, charted no-fishing; bathing in
  // season for spearfishing) between the four cell centres around, closed from one half: no outlines of those are shipped (data/access.js holds grids
  // only), so this rounds the squares' corners and moves no straight edge. Handing charted cells to the zone outlines was tried and dropped: it would
  // open 14% of the closed water, where the charted areas are larger than the shipped outlines (eval/LOG.md round 16 phase 3).
  function shutAt(T, x, y, c, o) {
    const bath = o.noSpear && bathing ? j => bathing[j] ? 1 : 0 : null;
    return mixF(j => (restricted && restricted[j] && restricted[j] !== 3) || (bath && bath(j)) ? 1 : 0, c) >= .5 ? 1 : 0;
  }
  const shutSub = (T, x, y, o) => { const c = T.ctx[(y / SUB | 0) * TILE + (x / SUB | 0)]; if (c < 0) return 1; around(T.x0 + x, T.y0 + y); return shutAt(T, x, y, c, o); }; // scripts/fit/r16-spots/holes-check.mjs
  function whereF(o, c, d, hk, ds, fc = -1, at = null, hm = null) { // hm (round 16 S scoring): habMix() of the sub-cell, or null = its own seabed key
    const zc = at && at.z >= 0 ? at.z : prot ? prot[c] : 0;
    if (o.s.banned || zc === 3 || (zc === 4 && zoneShut(o.mode, refMonth())) /* round 16 S scoring */ || (at && at.shut >= 0 ? at.shut : (restricted && restricted[c] && restricted[c] !== 3) || (o.noSpear && bathing[c]))) return 0; // round 16 S scoring: at.shut
    const mf = o.boat ? .55 + .45 * (at ? at.br : boatReach(c)) : o.spear ? trap(d, -1, 0, 15, 30) * trap(ds, -1, 0, 1, 2) : ds <= .5 ? 1 : 0;
    if (!mf) return 0;
    const ct = coastType && !o.boat ? coastType[c] : -1;
    let r = 0;
    if (o.prof) {
      const q = fitQ(ds);
      const TK = ALL_TOPK, top = o.top ||= new Float64Array(TK); let m = 0; top.fill(0); // round 16 S scoring: the mean of the ALL_TOPK best fits, as model.js allFit
      for (const p of o.prof) {
        if (p.k * 1.1 <= m) break; // best weight first: no later fish can beat the ALL_TOPK-th best
        const w = habAt(p.hab, hk, hm) * p.dep[d] * (o.boat ? (.25 + .75 * trap(ds, p.s0, p.s1, p.s2, p.s3)) * mf : mf) * (ct < 0 ? 1 : coastF(p.coast, at, ct));
        const v = p.k * (p.t ? Math.min(1, w * (fc >= 0 ? fitC(p.t, fc) : p.t.d[d] * habAt(p.t.h, hk, hm) * p.t.s[q])) : w);
        if (v > m) { let q = TK - 1; while (q > 0 && top[q - 1] < v) { top[q] = top[q - 1]; q--; } top[q] = v; m = top[TK - 1]; } // round 16 S scoring
      }
      for (let q = 0; q < TK; q++) r += top[q] / TK; // round 16 S scoring
    } else {
      const fd = o.depT[d]; if (!fd) return 0;
      r = fd * habAt(o.habT, hk, hm) * (o.boat ? (.25 + .75 * trap(ds, o.f0, o.lo, o.hi, o.f3)) * mf : mf) * o.methodFit * (ct < 0 ? 1 : coastF(o.coastT, at, ct));
    }
    let x = r * (zc === 2 ? .35 : 1) * (at ? at.af : shoreDist && !o.boat ? o.accT[shoreDist[c]] : 1);
    if (o.fitT && x) x = Math.min(1, x * (fc >= 0 ? fitC(o.fitT, fc) : o.fitT.d[d] * habAt(o.fitT.h, hk, hm) * o.fitT.s[fitQ(ds)]));
    if (o.den && x) x = Math.min(1, x * (at ? at.dn : o.den[o.dn[c]]));
    return x ? Math.pow(x, .6) : 0;
  }

  /* ---------- between cell centres: the four 250 m cells around a sub-cell and their weights ---------- */
  const NJ = new Int32Array(4), NWT = new Float64Array(4);
  function around(gx, gy) { // global sub-cell (gx, gy) -> NJ (cells), NWT (weights, sum 1)
    const px = gx / SUB | 0, py = gy / SUB | 0, ox = (gx % SUB + .5) / SUB - .5, oy = (gy % SUB + .5) / SUB - .5;
    const qx = Math.min(W - 1, Math.max(0, px + (ox < 0 ? -1 : 1))), qy = Math.min(H - 1, Math.max(0, py + (oy < 0 ? -1 : 1))), wx = Math.abs(ox), wy = Math.abs(oy);
    NJ[0] = py * W + px; NJ[1] = py * W + qx; NJ[2] = qy * W + px; NJ[3] = qy * W + qx;
    NWT[0] = (1 - wx) * (1 - wy); NWT[1] = wx * (1 - wy); NWT[2] = (1 - wx) * wy; NWT[3] = wx * wy;
  }
  const mixAll = a => a[NJ[0]] * NWT[0] + a[NJ[1]] * NWT[1] + a[NJ[2]] * NWT[2] + a[NJ[3]] * NWT[3]; // a layer with a value on every cell
  function mixSea(a, c) { // a layer of the sea cells only (0 on land): over the sea cells around, else the sub-cell's own cell c
    let s = 0, w = 0;
    for (let k = 0; k < 4; k++) if (depth[NJ[k]]) { s += a[NJ[k]] * NWT[k]; w += NWT[k]; }
    return w ? s / w : a[c];
  }
  function mixF(f, c) { // as mixSea, for a value of a cell f(j)
    let s = 0, w = 0;
    for (let k = 0; k < 4; k++) { const j = NJ[k]; if (depth[j] && !northMask[j]) { s += f(j) * NWT[k]; w += NWT[k]; } }
    return w ? s / w : f(c);
  }
  function denBil(D, gx, gy) { // the record density (js/fit.js: on nodes of DST x DST cells) at sub-cell (gx, gy), bilinear between node centres
    const u = Math.min(DNX - 1, Math.max(0, (gx + .5) / SUB / DST - .5)), v = Math.min(DNY - 1, Math.max(0, (gy + .5) / SUB / DST - .5));
    const x = Math.min(DNX - 2, u | 0), y = Math.min(DNY - 2, v | 0), wu = u - x, wv = v - y, k = y * DNX + x;
    return (D[k] * (1 - wu) + D[k + 1] * wu) * (1 - wv) + (D[k + DNX] * (1 - wu) + D[k + DNX + 1] * wu) * wv;
  }

  /* ---------- a tile's fixed part for the fish and method on the map (cur), in slices ---------- */
  let building = null;
  function build(T, then) {
    if (building?.gen === curGen) return; // one tile at a time: the next is asked for by the paint that follows this one
    // round 17 Q structure (scoring): the tile's structure features (js/structure.js, data/structure/). Not in yet: the 250 m picture stays and the
    // paint that follows the load builds the tile; none (false): the fit as before.
    const st = window.PsStructure?.USE.length ? PsStructure.want(T.tx, T.ty, then) : false; if (st === null) return; // USE empty: nothing is fetched, the fit as before
    const gen = curGen, P = cur, o = tablesFor(P), s = P.s, stA = st && PsStructure.aff(s, P.mode); // round 17 Q structure: stA
    // The fish-farm halo and warm outfalls at each sub-cell (0..255); their weight is the hour's (P.aF[h], P.aO[h]: the hour's own month), in over()
    const fa = P.aF && new Uint8Array(NT), oa = P.aO && new Uint8Array(NT);
    const w = new Float32Array(NT), kp = new Uint8Array(NT), rf = new Uint8Array(NT), job = building = { gen }, at = { br: 0, af: 1, dn: 1, z: -1, shut: -1, cj: new Int32Array(4), cw: new Float64Array(4) }; let y = 0;
    const fAF = shoreDist && !o.boat && (j => o.accT[shoreDist[j]]), zones = !!PROT?.zones, ctOn = coastType && !o.boat;
    const step = () => {
      if (building !== job) return; // another fish took over
      if (gen !== curGen) { building = null; then(); return; }
      if (mapBusy()) { setTimeout(step, 60); return; } // round 17 Z: not while the map pans or zooms: the gesture's frames first
      const until = performance.now() + 8;
      for (; y < TW && performance.now() < until; y++) for (let x = 0, i = y * TW; x < TW; x++, i++) {
        const d = T.d[i]; if (!d) continue;
        const c = T.ctx[(y / SUB | 0) * TILE + (x / SUB | 0)]; if (c < 0) continue;
        around(T.x0 + x, T.y0 + y);
        if (o.boat) at.br = mixF(boatReach, c);
        if (fAF) at.af = mixF(fAF, c);
        at.z = zones ? T.z ? T.z[i] : 0 : -1;
        at.shut = shutAt(T, x, y, c, o); // round 16 S scoring
        if (ctOn) { // the coast type's factor between the sea cells around (a categorical layer: each type's factor, weighted)
          let ws = 0; for (let k = 0; k < 4; k++) { const j = NJ[k], ok = depth[j] && !northMask[j]; at.cj[k] = ok ? coastType[j] : coastType[c]; at.cw[k] = ok ? NWT[k] : 0; ws += at.cw[k]; }
          if (ws) for (let k = 0; k < 4; k++) at.cw[k] /= ws; else { at.cw[0] = 1; at.cj[0] = coastType[c]; }
        }
        if (o.den) at.dn = denBil(o.den, T.x0 + x, T.y0 + y);
        const v = whereF(o, c, d, T.hk[i], shoreKm(T.sh[i], c), -1, at, habMix(T, i)); if (!v) continue; // round 16 S scoring: habMix
        // round 17 Q structure: the where-fit shrinks onto the features this fish holds on (rock edge, drop-off, rise, wreck / reef / rock, wall, point):
        // all of it on a feature, down to 1 - GAIN x the fish's affinity of it in water with none. Inside the .6 power, as every part of the where-fit.
        w[i] = st ? Math.min(1, v * PsStructure.gain(stA, st, i)) : v; // phase 2: mean-preserving (up on a feature as much as down off it)
        kp[i] = Math.round(255 * (1 - s.structure * mixAll(struct)) * (1 - KNOWN_AFFINITY * mixAll(known)) * (1 - SEEN_AFFINITY * mixAll(P.seen)) * (1 - P.edgeAff * mixSea(edge, c)) * (1 - s.front * mixF(frontAt, c))); // model.js P.keep
        if (fa) fa[i] = Math.round(mixAll(attrK.farm)); if (oa) oa[i] = Math.round(mixAll(attrK.outfall));
        rf[i] = Math.round(255 * clamp(mixSea(relief, c) + (T.rl[i] - 127) / 127));
      }
      if (y < TW) { setTimeout(step, 0); return; }
      Object.assign(T, { w, kp, rf, fa, oa, gen }); building = null; then();
    };
    setTimeout(step, 0);
  }

  /* ---------- the hour's part of a 250 m cell (season x gate x conditions; flow; the hourly attractors) ---------- */
  const O = {};
  function hourOf(j, h, out, k) { // into out[k..k+2]: A, flow, X
    const P = cur, s = P.s;
    if (!P.where[j]) { const t = sat.sst ? fishTemp(j, s) : NaN; P.temp[j] = sat.sst ? (t !== t ? .5 : trap(t, ...s.sst)) : 0; } // prepare() fills it only where the 250 m cell scores
    scoreAt(j, h, O, P);
    const pc = (window.PsPersonal || window.PsCatch)?.correction(s.id);
    out[k] = 100 * P.season[h] * O.gate * (.5 + .5 * O.base) * (pc ? pc.cell[j] * pc.hour[h] : 1);
    out[k + 1] = O.flow;
    out[k + 2] = (sat.grad ? 1 : bil(P.nodeFront, h * NN, j)) * (1 - s.chlorophyll * Math.max(P.prod[j], O.up)) * (1 - P.settleAff * O.settle);
  }
  // The cells under the window, each worked out when first asked for
  const hw = { x0: 0, y0: 0, w: 0, h: 0, v: new Float64Array(0), ok: new Uint8Array(0), hour: -1 };
  function hourWin(x0, y0, x1, y1, h) {
    const w = x1 - x0, n = w * (y1 - y0);
    if (hw.ok.length < n) { hw.v = new Float64Array(n * 3); hw.ok = new Uint8Array(n); }
    hw.ok.fill(0, 0, n); Object.assign(hw, { x0, y0, w, h: y1 - y0, hour: h });
  }
  function hourAt(j) { // -> index into hw.v, or -1 (land, the north, outside the window)
    const x = j % W - hw.x0, y = (j / W | 0) - hw.y0; if (x < 0 || y < 0 || x >= hw.w || y >= hw.h || !depth[j] || northMask[j]) return -1;
    const k = y * hw.w + x;
    if (!hw.ok[k]) { hourOf(j, hw.hour, hw.v, k * 3); hw.ok[k] = 1; }
    return k * 3;
  }
  /* ---------- onto the map: paintFine's image (d32 colours, fv scores), fw x fh over image columns x0..x1 and Mercator rows y0..y1 ---------- */
  let shown = '', chip = null;
  function note(st) { // the legend's line: '' | 'on' | 'load'
    if (st === shown) return; shown = st;
    chip ||= (() => { const e = document.createElement('div'); e.className = 'hl-fine'; e.id = 'hl-fine'; $('#hl-note')?.after(e); return e; })();
    chip.hidden = !st; chip.dataset.i18n = st === 'load' ? 'fine_load' : 'fine_on'; chip.textContent = st ? tr(chip.dataset.i18n) : ''; chip.classList.toggle('busy', st === 'load');
  }
  // Round 17 Z: fine data that comes in while the map pans or zooms is painted when it rests (stale), and fades in (map.js paint 'auto')
  let stale = false;
  const again = () => { if (!F || !scored || !map.hasLayer(heat)) return; if (mapBusy()) { stale = true; return; } if (cellPx() > MINPX) paint('auto'); else warm(); };
  // Round 17 Z (the 50 m picture popped in a moment after a zoom ended: its tiles were only asked for once it showed): from zoom 12 (a cell of
  // 7 px, half a level before the detail starts) the tiles under the middle half of the view, what a zoom in will show, are loaded and fitted
  // for the fish on the map while the map rests, one at a time, so the detail is there when the zoom arrives. Up to four tiles (KEEP is six).
  function warm() {
    const sx = cellPx(); if (!(sx >= WARMPX) || !cur?.s || !F || !scored || !map.hasLayer(heat) || mapBusy()) return;
    const b = map.getBounds().pad(sx > MINPX ? 0 : -.25), x0 = Math.max(0, Math.floor((b.getWest() - WEST) / RES)), x1 = Math.min(W - 1, Math.floor((b.getEast() - WEST) / RES));
    const y0 = Math.max(0, Math.floor((NORTH - b.getNorth()) / RES)), y1 = Math.min(H - 1, Math.floor((NORTH - b.getSouth()) / RES)); let n = 0;
    for (let ty = y0 / TILE | 0; ty <= (y1 / TILE | 0); ty++) for (let tx = x0 / TILE | 0; tx <= (x1 / TILE | 0); tx++) {
      if (++n > 4) return;
      const T = want(tx, ty, again); if (T && T.gen !== curGen) { build(T, again); return; }
    }
  }
  map.on('moveend', warm); // (stale: map.js heatRest takes it, in the task after the move's end)
  const take = () => { const s = stale; stale = false; return s; };
  const U = new Float64Array(4), TQ = new Float64Array(4), NB = new Int32Array(9), WOFF = [.4, .2, 0, .2, .4], DOFF = [0, 0, 1, 2, 2]; // a sub-cell's weight towards, and column / row of, the next cell
  let colU = new Int32Array(0), colW = new Float32Array(0), colC = new Int32Array(0), pF = new Float32Array(0), pT = pF, pD = new Uint16Array(0);
  function val(gx, gy, q) { // sub-cell (gx, gy)'s score into U[q] and its fine share into TQ[q]: 1; land: 0; no fine data there (none, not loaded, outside): -1
    const T = tileAt(gx / TW | 0, gy / TW | 0); if (!T || T.gen !== curGen || !T.win) return -1;
    const x = gx - T.x0, y = gy - T.y0; if (x < T.win[0] || y < T.win[1] || x >= T.win[2] || y >= T.win[3]) return -1;
    const s = T.S[y * TW + x]; if (s < 0) return s === -1 ? 0 : -1;
    U[q] = s; TQ[q] = T.tw[y * TW + x] / 255; return 1;
  }
  // The sub-cells at the inputs' resolution: a 1 2 1 blur (~100 m) over the water sub-cells of the tile's window (land stays -1). Sampled
  // straight, the 50 m grid of ~100 m data drew a mosaic, and at zoom 13 (a sub-cell under 3 px, a fine pixel 4) an aliased one.
  // ponytail: the tile's own sub-cells only; at a tile's border the blur is one-sided (a seam of a few points at most). A halo if it shows.
  let BV = new Float32Array(0), BN = BV;
  function smooth(T) {
    const [a0, b0, a1, b1] = T.win, w = a1 - a0, h = b1 - b0, S = T.S;
    if (BV.length < w * h) { BV = new Float32Array(w * h); BN = new Float32Array(w * h); }
    for (let y = 0, k = 0; y < h; y++) for (let x = 0, i = (b0 + y) * TW + a0; x < w; x++, k++, i++) {
      const v = S[i], l = x ? S[i - 1] : -1, r = x < w - 1 ? S[i + 1] : -1;
      let s = 0, n = 0; if (v >= 0) { s = 2 * v; n = 2; } if (l >= 0) { s += l; n++; } if (r >= 0) { s += r; n++; }
      BV[k] = s; BN[k] = n;
    }
    for (let y = 0, k = 0; y < h; y++) for (let x = 0, i = (b0 + y) * TW + a0; x < w; x++, k++, i++) {
      if (S[i] < 0) continue;
      let s = 2 * BV[k], n = 2 * BN[k]; if (y) { s += BV[k - w]; n += BN[k - w]; } if (y < h - 1) { s += BV[k + w]; n += BN[k + w]; }
      S[i] = s / n;
    }
  }
  function over(c, d32, fv, fw, fh, lut32, rnd) {
    stale = false;
    if (!(c.sx > MINPX) || !cur?.s || !F) { note(''); return 0; }
    const zf = Math.min(1, (c.sx - MINPX) / (FULLPX - MINPX)); // the detail's share by zoom: none to a cell of 10.5 px (zoom 12.5), all from 16 (13.1)
    const { x0, x1, y0, y1 } = c, gy0 = Math.max(0, Math.floor((NORTH - imgLat(y0)) / RES) - 1), gy1 = Math.min(H, Math.ceil((NORTH - imgLat(y1)) / RES) + 1);
    const cx0 = Math.max(0, x0 - 1), cx1 = Math.min(W, x1 + 1), ready = [], h = state.h, drop = cur.s.dropoff, fH = cur.aF?.[h] ?? 0, oH = cur.aO?.[h] ?? 0; let pending = false; // fH, oH: the hour's farm and outfall weights (model.js prepare)
    for (let q = 0; q < slots.length; q++) if (slots[q]?.T) slots[q].T.win = null;
    for (let ty = gy0 / TILE | 0; ty <= ((gy1 - 1) / TILE | 0); ty++) for (let tx = cx0 / TILE | 0; tx <= ((cx1 - 1) / TILE | 0); tx++) {
      const T = want(tx, ty, again);
      if (T === false) continue;
      if (!T) { pending = true; continue; }
      if (T.gen !== curGen) { pending = true; build(T, again); continue; }
      ready.push(T);
    }
    note(pending ? 'load' : ready.length ? 'on' : '');
    if (!ready.length) return 0;
    hourWin(cx0, gy0, cx1, gy1, h);
    const hv = hw.v;
    for (const T of ready) { // the hour's score of the tile's sub-cells under the window, a 250 m cell at a time: the hour between cell centres, each cell looked up once
      const S = T.S ||= new Float32Array(NT), bx = T.tx * TILE, by = T.ty * TILE, PX0 = Math.max(cx0, bx), PX1 = Math.min(cx1, bx + TILE), PY0 = Math.max(gy0, by), PY1 = Math.min(gy1, by + TILE);
      const kpA = T.kp, rfA = T.rf, wA = T.w, faA = T.fa, oaA = T.oa;
      T.win = [(PX0 - bx) * SUB, (PY0 - by) * SUB, (PX1 - bx) * SUB, (PY1 - by) * SUB];
      for (let py = PY0; py < PY1; py++) for (let px = PX0; px < PX1; px++) {
        const cc = T.ctx[(py - by) * TILE + px - bx], b = (py - by) * SUB * TW + (px - bx) * SUB;
        if (cc < 0) { for (let q = 0; q < SUB * SUB; q++) S[b + (q / SUB | 0) * TW + q % SUB] = -2; continue; } // a cell with no fine data (-2; land is -1)
        for (let q = 0; q < 9; q++) { const x = px + q % 3 - 1, y = py + (q / 3 | 0) - 1; NB[q] = x < 0 || y < 0 || x >= W || y >= H ? -1 : hourAt(y * W + x); }
        for (let sy = 0; sy < SUB; sy++) for (let sx = 0, i = b + sy * TW; sx < SUB; sx++, i++) {
          const w0 = wA[i];
          if (!w0) { S[i] = T.d[i] ? 0 : -1; continue; } // water that cannot score: 0; land: -1
          const wx = WOFF[sx], wy = WOFF[sy], qx = DOFF[sx], qy = DOFF[sy];
          let w = 0, A = 0, fl = 0, X = 0, k = NB[4], wq = (1 - wx) * (1 - wy);
          if (k >= 0) { w += wq; A += wq * hv[k]; fl += wq * hv[k + 1]; X += wq * hv[k + 2]; }
          k = NB[3 + qx]; wq = wx * (1 - wy); if (k >= 0 && wq) { w += wq; A += wq * hv[k]; fl += wq * hv[k + 1]; X += wq * hv[k + 2]; }
          k = NB[qy * 3 + 1]; wq = (1 - wx) * wy; if (k >= 0 && wq) { w += wq; A += wq * hv[k]; fl += wq * hv[k + 1]; X += wq * hv[k + 2]; }
          k = NB[qy * 3 + qx]; wq = wx * wy; if (k >= 0 && wq) { w += wq; A += wq * hv[k]; fl += wq * hv[k + 1]; X += wq * hv[k + 2]; }
          if (!w) { k = hourAt(cc); if (k < 0) { S[i] = 0; continue; } w = 1; A = hv[k]; fl = hv[k + 1]; X = hv[k + 2]; }
          const kv = kpA[i] / 255 * (fH && faA ? 1 - fH * faA[i] / 255 : 1) * (oH && oaA ? 1 - oH * oaA[i] / 255 : 1); // keep, with the hour's farm and outfall weights
          const v = Math.min(100, w0 * A / w * (.6 + .4 * (1 - kv * (1 - drop * rfA[i] / 255 * fl / w) * X / w))); // model.js scoreCells, its last line
          S[i] = v === v ? v : 0; // spearfishing without plankton data: NaN, drawn as nothing (as the 250 m map)
        }
      }
      smooth(T); smooth(T); // round 16: twice (a 1 4 6 4 1 blur, ~50 m): the seabed's 120–250 m squares read as squares through one pass
    }
    const cut = rangeCut(), cutC = lut32[Math.max(cut, 1) * 10], n = fw * fh;
    if (colU.length < fw) { colU = new Int32Array(fw); colW = new Float32Array(fw); colC = new Int32Array(fw); }
    if (pF.length < n) { pF = new Float32Array(n); pT = new Float32Array(n); pD = new Uint16Array(n); }
    for (let fx = 0; fx < fw; fx++) { const g = x0 + (fx + .5) * (x1 - x0) / fw, u = g * SUB - .5; colU[fx] = Math.floor(u); colW[fx] = u - colU[fx]; colC[fx] = Math.min(W - 1, g | 0); }
    // Round 16: each pixel's fine score (pF, -1 none) and share (pT); where water has no fine score (past the fine data, a tile with none, a tile
    // still loading) a seed (pD 0). The fine share then fades to 0 over RAMPC cells towards the nearest seed (a chamfer distance in pixels), so the
    // 50 m picture runs into the 250 m one across a tile's border as it does at the fine data's own edge (T.tw): no straight seams.
    let seeds = 0;
    for (let fy = 0, o = 0; fy < fh; fy++) {
      const V = (NORTH - imgLat(y0 + (fy + .5) * (y1 - y0) / fh)) / FRES - .5, v0 = Math.floor(V), wv = V - v0, ty = v0 / TW | 0, oneRow = v0 >= 0 && ((v0 + 1) / TW | 0) === ty;
      const row = Math.min(H - 1, Math.max(0, Math.floor((V + .5) / SUB))) * W; // the 250 m row under it: is a pixel with no fine score water?
      let T = null, tx = -1;
      for (let fx = 0; fx < fw; fx++, o++) {
        pF[o] = -1; pD[o] = 65535;
        const u0 = colU[fx], wu = colW[fx];
        let sum = 0, ws = -1, wt = 0, miss = 0;
        if (oneRow && u0 >= 0 && ((u0 + 1) / TW | 0) === (u0 / TW | 0)) { // the four sub-cells in one tile, inside its window, all with a score: read straight
          if ((u0 / TW | 0) !== tx) { tx = u0 / TW | 0; T = tileAt(tx, ty); if (T && (T.gen !== curGen || !T.win)) T = null; }
          if (!T) { ws = 0; miss = 1; } // no fine data in this tile, or not ready yet
          else {
            const x = u0 - T.x0, y = v0 - T.y0, win = T.win;
            if (x >= win[0] && y >= win[1] && x + 1 < win[2] && y + 1 < win[3]) {
              const i = y * TW + x, S = T.S, a0 = S[i], a1 = S[i + 1], a2 = S[i + TW], a3 = S[i + TW + 1];
              if (a0 >= 0 && a1 >= 0 && a2 >= 0 && a3 >= 0) {
                const tw = T.tw, w0 = (1 - wu) * (1 - wv), w1 = wu * (1 - wv), w2 = (1 - wu) * wv, w3 = wu * wv;
                sum = w0 * a0 + w1 * a1 + w2 * a2 + w3 * a3; ws = 1; wt = (w0 * tw[i] + w1 * tw[i + 1] + w2 * tw[i + TW] + w3 * tw[i + TW + 1]) / 255;
              } else if (a0 < 0 && a1 < 0 && a2 < 0 && a3 < 0) { ws = 0; miss = +(a0 === -2 || a1 === -2 || a2 === -2 || a3 === -2); } // land (-1), or past the fine data (-2)
            }
          }
        }
        if (ws < 0) {
          ws = 0;
          for (let q = 0; q < 4; q++) {
            const wq = (q & 1 ? wu : 1 - wu) * (q >> 1 ? wv : 1 - wv); if (!(wq > 0)) continue;
            const r = val(u0 + (q & 1), v0 + (q >> 1), q);
            if (r > 0) { sum += wq * U[q]; ws += wq; wt += wq * TQ[q]; } else if (r < 0) miss = 1;
          }
        }
        if (!ws) { const j = row + colC[fx]; if (miss && depth[j] && !northMask[j]) { pD[o] = 0; seeds++; } continue; } // no fine data here: the 250 m picture stays
        pF[o] = sum / ws; pT[o] = wt / ws * zf; // t: the fine score's share (it fades into the 250 m score at the fine data's outer edge)
      }
    }
    const R5 = 5 * RAMPC * fw / (x1 - x0); // the fade's length in fifths of a pixel (5 a step across, 7 a diagonal one)
    if (seeds) { // chamfer distance to the nearest seed, two passes
      for (let y = 0, o = 0; y < fh; y++) for (let x = 0; x < fw; x++, o++) {
        let d = pD[o]; if (!d) continue;
        if (x && pD[o - 1] + 5 < d) d = pD[o - 1] + 5;
        if (y) { const u = o - fw; if (pD[u] + 5 < d) d = pD[u] + 5; if (x && pD[u - 1] + 7 < d) d = pD[u - 1] + 7; if (x < fw - 1 && pD[u + 1] + 7 < d) d = pD[u + 1] + 7; }
        pD[o] = d;
      }
      for (let y = fh - 1, o = n - 1; y >= 0; y--) for (let x = fw - 1; x >= 0; x--, o--) {
        let d = pD[o]; if (!d) continue;
        if (x < fw - 1 && pD[o + 1] + 5 < d) d = pD[o + 1] + 5;
        if (y < fh - 1) { const u = o + fw; if (pD[u] + 5 < d) d = pD[u] + 5; if (x < fw - 1 && pD[u + 1] + 7 < d) d = pD[u + 1] + 7; if (x && pD[u - 1] + 7 < d) d = pD[u - 1] + 7; }
        pD[o] = d;
      }
    }
    for (let o = 0; o < n; o++) {
      const f = pF[o]; if (f < 0) continue;
      const t = seeds && pD[o] < R5 ? pT[o] * pD[o] / R5 : pT[o], co = fv[o];
      if (!(t > 0)) continue;
      const s = co > 0 ? co + (f - co) * t : f, a = co > 0 ? 1 : t, e = s >= cut ? 1 : (s - cut) / 1.5 + 1; // under the cut: fading out over 1.5 points
      if (e <= 0) { d32[o] = 0; fv[o] = 0; continue; }
      const col = s >= cut ? lut32[s * 10 + rnd | 0] : cutC, al = a * e;
      d32[o] = al >= 1 ? col : (col & 0xffffff | (col >>> 24) * al << 24) >>> 0; fv[o] = al >= 1 ? s : -1; // a faded pixel carries no chance line (as paintFine's edges)
    }
    return zf * (pending ? .5 : 1); // round 17 Z: the detail's share of the picture (map.js fades a repaint in where it changed); half while tiles are still to come
  }

  return { over, take, decode, tablesFor, whereF, shoreKm, SUB, TILE, tileAt, habMix, shutSub }; // decode … TILE: scripts/fine/bench.mjs; tileAt: round15/heat/steps-month.json (the month-boundary check)
})();
