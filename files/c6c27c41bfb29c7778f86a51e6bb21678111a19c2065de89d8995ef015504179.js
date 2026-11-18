/* Psarema: the shallow coast at ~20 m from Sentinel-2 (round 15, seabed agent): depth, seabed class and structure, each with a confidence.
   Tiles are built by scripts/seabed-s2/{sdb,pack}.mjs and are NOT in the app bundle: a tile comes from data/sdb/v1/ if the build ships it,
   else from the public data repo (kept in the Cache API after the first read), like the 3D packs of js/area3d.js. Nothing loads until asked.
   Grid: each 250 m app cell (js/core.js: 1200 x 660, west 31.875, north 35.875, 0.0025 deg) split 12 x 12 (0.000208 deg, ~19 x 23 m);
   tiles of 60 x 60 cells (15 km, the same tiles as data/fine/). One byte per pixel and layer, 255 = none:
     depth  0.1 m under the surface     err   0.1 m, the error to expect of depth (about 2 in 3 laser depths fall within it)
     cls    bits 0-1: 1 rock / reef, 2 Posidonia, 3 sand / soft; bit 2: sand hole in Posidonia      conf  probability of that class x 250
     slope  degrees x 4 (plane through ~60 m)      rug   0.02 m, roughness about that plane
     rockE, posE   2.5 m: distance to the nearest rock / Posidonia boundary, either side, capped 632 m
   All of it is an ESTIMATE. Depth against 23,254 ICESat-2 laser depths: mean error 0.6 m at 0-5 m, 0.8 at 5-10, 1.3-1.7 at 10-16 (the EMODnet
   DTM at the same points 0.8-1.5, 0.9, 1.3-1.8); no value where the water is optically deep or the bed dark. Classes against the survey map
   CY005001, held-out: 79 % agree (Posidonia 87 %, sand 79 %, rock 30 %: rock is the weak class); conf is honest (conf 0.9+ agrees 95 %, 0.5-0.6
   56 %). Slope and rug are real on sand and rock; over Posidonia their high values are mostly the dark bed read as depth (relief: 'doubtful').

   API (metres, positive down):
     PsSdb.want(tx, ty, then)   the decoded tile, null while it loads (then() runs once it is in), false if there is none. As PsFine.want.
     PsSdb.load(lat, lon)       Promise of the tile under a point (null: none, or it could not be read). A read that failed counts as none for
                                30 s (PsSdb.RETRY), then the next want() / load() asks again; coming back online asks again at once.
     PsSdb.at(lat, lon)         { depth, err } of the pixel under a point, from a tile already loaded; null = no estimate (or not loaded).
     PsSdb.trust(depth, err)    recommended rule: depth <= 16 m and err <= max(1 m, 25 % of depth). Deeper, the map reads too shallow: fall back.
     PsSdb.depthAt(lat, lon, fallback)   depth if trusted, else fallback (the caller's own depth).
     PsSdb.seabedAt(lat, lon)   { cls: 'rock' | 'posidonia' | 'sand', conf 0..1, sandHole, rockEdgeM, posEdgeM, slopeDeg, rugM, relief: 'ok' | 'doubtful' };
                                slopeDeg / rugM null where the depth is not trusted; null = no class here (or not loaded).
     PsSdb.cell(T, cx, cy)      a 250 m cell's 12 x 12 block in tile T (cx, cy: app cell column and row): { o, d, e, cls, conf, slope, rug, rockE, posE }
                                = the block's offset and the tile's byte arrays: value = arr[o + sy * 12 + sx]. null: no data in the cell.
     PsSdb.put(buf)             hand an (unzipped) tile in as an ArrayBuffer: Node, tests (scripts/seabed-s2/read.mjs).
   Attribution: contains modified Copernicus Sentinel data 2023-2025; EMODnet Bathymetry and Seabed Habitats (CC BY 4.0); NASA ICESat-2. */
window.PsSdb = (() => {
  const V = 1, SUB = 12, CS = SUB * SUB, TILE = 60, GW = 1200, GH = 660, WEST = 31.875, NORTH = 35.875, RES = 0.0025, TXN = GW / TILE, TYN = GH / TILE, KEEP = 8, STORE = 'psarema-sdb-v' + V;
  const URLS = f => [`data/sdb/v${V}/${f}`, `https://giannis242.github.io/psarema-data/sdb/v${V}/${f}`]; // bundled, else the data repo (a new format gets a new folder)
  const slots = new Array(TXN * TYN).fill(null); // per tile: { T: decoded (null while it loads), used }
  let index = null, indexP = null, indexAt = 0, use = 0; // index false / a slot { failed }: could not be read (offline and never read before)
  const RETRY = 30000, again = at => Date.now() - at >= RETRY; // a failed read counts as "none" for 30 s, then the next want() asks again; coming back online asks at once
  if (typeof addEventListener === 'function') addEventListener('online', () => { if (index === false) { index = null; indexP = null; } for (let k = 0; k < slots.length; k++) if (slots[k]?.failed) slots[k] = null; });
  async function get(f) { // the file's bytes (unzipped), or null
    const [own, repo] = URLS(f); let r = await fetch(own).catch(() => null);
    if (!r?.ok) {
      const store = window.caches ? await caches.open(STORE).catch(() => null) : null;
      r = store && await store.match(repo).catch(() => null);
      if (!r && navigator.onLine !== false) { r = await fetch(repo).catch(() => null); if (r?.ok && store) await store.put(repo, r.clone()).catch(() => {}); }
    }
    if (!r?.ok) return null;
    let u = new Uint8Array(await r.arrayBuffer());
    if (u[0] === 0x1f && u[1] === 0x8b) u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); // (a server may already have unzipped it)
    return u.buffer;
  }
  function decode(buf) { // Uint32 json length | json | Uint32 runs | layers
    const hl = new DataView(buf).getUint32(0, true), H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))), runs = new Uint32Array(buf, 4 + hl, H.nruns * 2);
    const T = { tx: H.tx, ty: H.ty, cellAt: new Int32Array(TILE * TILE).fill(-1) }; let o = 4 + hl + H.nruns * 8;
    for (let r = 0, k = 0; r < runs.length; r += 2) for (let i = runs[r], end = i + runs[r + 1]; i < end; i++) T.cellAt[i] = k++;
    for (const name of H.layers) { T[name] = new Uint8Array(buf, o, H.n * CS); o += H.n * CS; }
    T.d = T.depth; T.e = T.err; return T;
  }
  const put = buf => { const T = decode(buf), k = T.ty * TXN + T.tx; slots[k] = { T, used: ++use }; (index ||= new Set()).add(`t${T.tx}_${T.ty}`); return T; };
  function want(tx, ty, then) {
    if (tx < 0 || ty < 0 || tx >= TXN || ty >= TYN) return false;
    const id = `t${tx}_${ty}`, k = ty * TXN + tx;
    if (slots[k]?.T) { slots[k].used = ++use; return slots[k].T; }
    if (typeof fetch !== 'function' || typeof document === 'undefined') return false; // Node: only what put() handed in
    if (index === false && again(indexAt)) { index = null; indexP = null; }
    if (index === null) { (indexP ||= get('index.json').then(b => { index = b ? new Set(JSON.parse(new TextDecoder().decode(b)).tiles) : false; }, () => { index = false; }).then(() => { indexAt = Date.now(); })).then(() => then && then()); return null; }
    if (!index || !index.has(id)) return false;
    if (slots[k]?.failed) { if (!again(slots[k].failed)) return false; slots[k] = null; }
    if (!slots[k]) {
      const e = slots[k] = { T: null, used: ++use };
      e.p = get(id + '.bin').then(b => { if (slots[k] !== e) return; if (b) e.T = decode(b); else e.failed = Date.now(); then && then(); }, () => { e.failed = Date.now(); then && then(); });
      let n = 0, old = -1; // more than KEEP tiles decoded (~1-2 MB each): the one least lately used goes
      for (let q = 0; q < slots.length; q++) if (slots[q]?.T) { n++; if (old < 0 || slots[q].used < slots[old].used) old = q; }
      if (n > KEEP) slots[old] = null;
    }
    return null;
  }
  async function load(lat, lon) { // waits on the read in flight, whoever started it
    const tx = Math.floor((lon - WEST) / RES / TILE), ty = Math.floor((NORTH - lat) / RES / TILE);
    for (;;) { const T = want(tx, ty); if (T !== null) return T || null; await (index === null ? indexP : slots[ty * TXN + tx]?.p); }
  }
  const cell = (T, cx, cy) => { const k = T.cellAt[(cy - T.ty * TILE) * TILE + cx - T.tx * TILE]; return k < 0 ? null : { o: k * CS, d: T.d, e: T.e, cls: T.cls, conf: T.conf, slope: T.slope, rug: T.rug, rockE: T.rockE, posE: T.posE }; };
  function pixel(lat, lon) { // [cell block, offset of the pixel] or null
    const gx = Math.floor((lon - WEST) / RES * SUB), gy = Math.floor((NORTH - lat) / RES * SUB), cx = gx / SUB | 0, cy = gy / SUB | 0;
    if (gx < 0 || gy < 0 || cx >= GW || cy >= GH) return null;
    const T = slots[(cy / TILE | 0) * TXN + (cx / TILE | 0)]?.T, c = T && cell(T, cx, cy);
    return c ? [c, c.o + (gy % SUB) * SUB + gx % SUB] : null;
  }
  function at(lat, lon) { const p = pixel(lat, lon); return !p || p[0].d[p[1]] === 255 ? null : { depth: p[0].d[p[1]] / 10, err: p[0].e[p[1]] / 10 }; }
  const trust = (depth, err) => depth <= 16 && err <= Math.max(1, .25 * depth);
  const depthAt = (lat, lon, fallback) => { const v = at(lat, lon); return v && trust(v.depth, v.err) ? v.depth : fallback; };
  const NAMES = [null, 'rock', 'posidonia', 'sand'];
  function seabedAt(lat, lon) {
    const p = pixel(lat, lon); if (!p || p[0].cls[p[1]] === 255) return null;
    const [c, o] = p, k = c.cls[o] & 3, has = c.slope[o] !== 255, posE = c.posE[o] * 2.5;
    return { cls: NAMES[k], conf: c.conf[o] / 250, sandHole: !!(c.cls[o] & 4), rockEdgeM: c.rockE[o] * 2.5, posEdgeM: posE, slopeDeg: has ? c.slope[o] / 4 : null, rugM: has ? c.rug[o] * .02 : null,
      relief: k === 2 || posE < 40 ? 'doubtful' : 'ok' }; // on or beside Posidonia the dark bed reads as depth
  }
  return { V, SUB, TILE, URLS, RETRY, want, load, at, trust, depthAt, seabedAt, cell, put, decode };
})();
