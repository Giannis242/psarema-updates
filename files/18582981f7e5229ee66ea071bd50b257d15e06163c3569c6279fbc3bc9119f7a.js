'use strict';
/* Psarema structure (round 17 Q): the features fish hold on, per ~50 m sub-cell of the fine layer, and what they do to the 50 m score.
   Tiles: data/structure/t<x>_<y>.bin (scripts/structure/build.mjs; the same 15 km tiles and 300 x 300 sub-cells as data/fine), lazy, gzip:
   u32 header length | header JSON { tx, ty, n, nruns, layers } | runs | one byte a water sub-cell and layer. Layers (build.mjs has the detail):
     edgeS  5 m steps to the nearest rock boundary of the 20 m satellite seabed (255: no 20 m class here)
     drop   the depth range over ~ +-100 m, ranked inside its depth band (0-254)      rise   a local rise, ranked among the rises (0 none)
     point  a point of land or a named cape (255 a tip)                              lo, hi the shallowest and deepest water within ~100 m (m)
     (edge = the survey map's rock boundary, hard, wall, expo: built by the bench's --layers only; none of them helped, so they are not shipped)
   The score: a fish that holds on structure loses up to GAIN x its affinity of the where-fit in water with none of its features, and keeps
   all of it on them, so the best water shrinks onto the features (js/fine.js, the block marked "round 17 Q structure"). Which features count
   is USE: only those the 50 m bench confirmed (eval/LOG.md, round 17 structure). Phase 1: no feature passed as a pure cut (and the cut blanked the map).
   Phase 2: the satellite rock edge in the mean-preserving form (aff(): k) passed the rule on the cv-space lines, narrowly, and is on; the rocky-shore
   strip (rshore) did not. PsStructure.USE = [] before the first zoom-in gives the old 50 m score. The 250 m score never reads this.
   API:
     PsStructure.want(tx, ty, then)   the tile, null while it loads (then() once it is in), false: none. As PsFine.want / PsSdb.want.
     PsStructure.aff(s, mode)         a fish profile's affinities, once per fish and method
     PsStructure.gain(a, S, i)        the factor on the where-fit (after its .6 power) at sub-cell i (y * 300 + x) of tile S; cap the product at 1
     PsStructure.at(lat, lon)         { edgeM, drop, rise, point, lo, hi } at a point (values 0..1, metres; edgeM null where the 20 m map has no class), null: not loaded or no data
     PsStructure.reason(lat, lon, then)   short words for a pin, strongest first, at most 3: [{ k, text }], k one of 'wreck' 'reef' 'rock'
                                      'pier' 'point' 'pinnacle' 'dropoff' 'edge'; text in the app's language ("wreck 120 m", "drop-off 18→40 m").
                                      [] = nothing special here; null = the tile is not in yet (then() runs when it is: ask again). Cheap: a few
                                      array reads and one pass over the ~500 marks.
     PsStructure.put(buf)             hand an unzipped tile in (Node, the bench)
   Attribution: EMODnet Bathymetry and Seabed Habitats (CC BY 4.0), modified Copernicus Sentinel data 2023-2025, (c) OpenStreetMap contributors. */
window.PsStructure = (() => {
  const TILE = 60, SUB = 5, TW = TILE * SUB, NT = TW * TW, GW = 1200, GH = 660, WEST = 31.875, NORTH = 35.875, FRES = .0025 / SUB, TXN = GW / TILE, TYN = GH / TILE, KEEP = 6;
  const API = { GAIN: .6, NORM: true, HIST: null, USE: ['edgeS'] }; // GAIN: how hard featureless water is cut. USE: the features in the 50 m score: the satellite rock edge alone (phase 2; [] = off, the score as before)
  const slots = new Array(TXN * TYN).fill(null); let index = null, indexP = null, use = 0;
  async function get(f) {
    const r = await fetch('data/structure/' + f); if (!r.ok) throw new Error(f + ': ' + r.status);
    let u = new Uint8Array(await r.arrayBuffer());
    if (u[0] === 0x1f && u[1] === 0x8b) u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    return u.buffer;
  }
  function decode(buf) {
    const hl = new DataView(buf).getUint32(0, true), H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))), runs = new Uint32Array(buf, 4 + hl, H.nruns * 2);
    const S = { tx: H.tx, ty: H.ty, n: H.n, at: new Int32Array(NT).fill(-1) }; let o = 4 + hl + H.nruns * 8;
    for (let r = 0, k = 0; r < runs.length; r += 2) for (let i = runs[r], e = i + runs[r + 1]; i < e; i++) S.at[i] = k++;
    for (const name of H.layers) { S[name] = new Uint8Array(buf, o, H.n); o += H.n; }
    return S;
  }
  const put = buf => { const S = decode(buf); slots[S.ty * TXN + S.tx] = { S, used: ++use }; return S; };
  function want(tx, ty, then) {
    if (tx < 0 || ty < 0 || tx >= TXN || ty >= TYN) return false;
    const k = ty * TXN + tx, id = `t${tx}_${ty}`;
    if (slots[k]?.S) { slots[k].used = ++use; return slots[k].S; }
    if (typeof fetch !== 'function' || typeof document === 'undefined') return false; // Node: only what put() handed in
    if (index === null) { (indexP ||= get('index.json').then(b => { const J = JSON.parse(new TextDecoder().decode(b)); index = new Set(J.tiles); API.HIST = J.hist || null; }, () => { index = false; })).then(() => { if (want(tx, ty, then) !== null && then) then(); }); return null; } // then() once: when the tile is in, or there is none
    if (!index || !index.has(id) || slots[k]?.failed) return false;
    if (!slots[k]) {
      const e = slots[k] = { S: null, used: ++use };
      get(id + '.bin').then(b => { if (slots[k] === e) e.S = decode(b); then && then(); }, () => { e.failed = true; then && then(); });
      let n = 0, old = -1; for (let q = 0; q < slots.length; q++) if (slots[q]?.S) { n++; if (old < 0 || slots[q].used < slots[old].used) old = q; }
      if (n > KEEP) slots[old] = null;
    }
    return null;
  }
  /* ---------- the score ---------- */
  // A feature's value 0..1 from its byte: edge: 1 on the boundary, 0 from 100 m; drop: 0 to the band's median, 1 in its top 5%; the rest as stored.
  const VAL = { rshore: b => b / 255, edge: b => b >= 20 ? 0 : 1 - b / 20, edgeS: b => b >= 20 ? 0 : 1 - b / 20, drop: b => b <= 127 ? 0 : Math.min(1, (b - 127) / 114), rise: b => b / 254, hard: b => b / 255, wall: b => b / 255, point: b => b / 255, expo: b => b / 255 };
  // How much a fish cares, from its own profile (data/species*.js): the seabed edge by its rock habitat, the relief by its drop-off affinity, marks by
  // its structure affinity. A boat does not fish a harbour wall (eval/LOG.md round 16, cause 3).
  function aff(s, mode) {
    const rock = s.habitat?.rock ?? 0, st = s.structure ?? 0, dr = s.dropoff ?? 0;
    const all = { rshore: rock, edge: rock, edgeS: rock, drop: dr, rise: dr, hard: st, wall: mode === 'boat' ? 0 : .7 * st, point: .7 * Math.max(st, dr), expo: .5 * rock }, a = { names: [], w: [], max: 0 };
    for (const n of API.USE) if (all[n] > 0) { a.names.push(n); a.w.push(all[n]); if (all[n] > a.max) a.max = all[n]; }
    // Phase 2, mean-preserving: k = 1 / the mean of m^.6 over the method's nearshore water, from the feature's histogram in index.json (HIST[mode][name]:
    // 256 counts), so the water on a feature rises as much as the rest falls and the picture keeps its level.
    // ponytail: several features together take the product of their own k (exact for one feature); a joint histogram if a combination ever ships.
    a.k = 1;
    if (API.NORM && API.HIST?.[mode]) a.names.forEach((n, q) => { const h = API.HIST[mode][n]; if (!h) return; let s = 0, t = 0; for (let b = 0; b < 256; b++) if (h[b]) { t += h[b]; s += h[b] * Math.pow(1 - API.GAIN * a.w[q] * (1 - VAL[n](b)), .6); } if (s) a.k *= t / s; });
    return a;
  }
  const gain = (a, S, i) => S.at[i] < 0 || !a.max ? 1 : Math.pow(mult(a, S, i), .6) * a.k; // the factor on the where-fit (after its .6 power); the caller caps the product at 1
  function mult(a, S, i) {
    if (!a.max || !API.GAIN) return 1;
    const k = S.at[i]; if (k < 0) return 1;
    let miss = 1; for (let q = 0; q < a.names.length; q++) { const L = S[a.names[q]]; if (L) miss *= 1 - a.w[q] * VAL[a.names[q]](L[k]); }
    return 1 - API.GAIN * Math.max(0, a.max - (1 - miss));
  }
  /* ---------- a point ---------- */
  function sub(lat, lon, then) { // [tile, sub-cell index] | null (loading) | false
    const gx = Math.floor((lon - WEST) / FRES), gy = Math.floor((NORTH - lat) / FRES), S = want(gx / TW | 0, gy / TW | 0, then);
    return S ? [S, (gy % TW) * TW + gx % TW] : S;
  }
  function at(lat, lon) {
    const p = sub(lat, lon), k = p ? p[0].at[p[1]] : -1; if (k < 0) return null;
    const S = p[0], v = n => S[n] ? VAL[n](S[n][k]) : 0;
    const e = S.edgeS || S.edge;
    return { edgeM: e && e[k] !== 255 ? e[k] * 5 : null, drop: v('drop'), rise: v('rise'), point: v('point'), lo: S.lo ? S.lo[k] : null, hi: S.hi ? S.hi[k] : null };
  }
  // The marks behind hard / wall, for a pin's words: [lat, lon, kind]
  let marks = null;
  const KIND = { wreck: 'wreck', reef: 'reef', rock: 'rock', dive: 'reef', pier: 'pier', breakwater: 'pier', harbour: 'pier' };
  function marksOf() {
    if (marks) return marks; marks = [];
    for (const [, t, la, lo] of window.PSAREMA_SPOTS || []) if (KIND[t]) marks.push([la, lo, KIND[t]]);
    const P = window.PSAREMA_ATTRACTORS?.points || {};
    for (const p of P.wreck || []) marks.push([p[0], p[1], 'wreck']); for (const p of P.artificialReef || []) marks.push([p[0], p[1], 'reef']);
    return marks;
  }
  const word = (k, en) => typeof tr === 'function' && tr('st_' + k) !== 'st_' + k ? tr('st_' + k) : en; // js/i18n.js, the block "round 17 Q"
  function reason(lat, lon, then) {
    const p = sub(lat, lon, then); if (p === null) return null;
    const v = at(lat, lon), out = []; if (!v) return out;
    let best = null, bd = 250; const kx = 111320 * Math.cos(lat * Math.PI / 180);
    for (const m of marksOf()) { const d = Math.hypot((m[0] - lat) * 110570, (m[1] - lon) * kx); if (d < bd) { bd = d; best = m; } }
    if (best) out.push({ k: best[2], s: 2 - bd / 250, text: `${word(best[2], best[2])} ${Math.max(10, Math.round(bd / 10) * 10)} m` });
    if (v.point >= .5) out.push({ k: 'point', s: 1 + v.point, text: word('point', 'point') });
    if (v.rise >= .6) out.push({ k: 'pinnacle', s: .9 + v.rise, text: word('pinnacle', 'pinnacle') + (v.lo != null ? ` ${v.lo} m` : '') });
    if (v.drop >= .8 && v.hi - v.lo >= 4) out.push({ k: 'dropoff', s: .8 + v.drop, text: `${word('dropoff', 'drop-off')} ${v.lo}→${v.hi}${v.hi >= 254 ? '+' : ''} m` });
    if (v.edgeM != null && v.edgeM <= 60) out.push({ k: 'edge', s: 1.5 - v.edgeM / 120, text: word('edge', 'rock edge') });
    return out.sort((a, b) => b.s - a.s).slice(0, 3).map(({ k, text }) => ({ k, text }));
  }
  return Object.assign(API, { want, put, decode, aff, mult, gain, at, reason, VAL });
})();
