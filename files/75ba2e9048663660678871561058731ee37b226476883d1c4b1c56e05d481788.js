'use strict';
/* Psarema area in 3D (css/area3d.css): a whole fishing area (data/areas.js: the square around its circle, 18–28 km across) as one surface.
   Round 11, high resolution. Each area has a pack (scripts/area3d/build-packs.mjs: the land from the Copernicus DEM GLO-30, 30 m; the seabed
   from the EMODnet DTM, ~115 m; on a 1025 × 1025 grid cut at the OpenStreetMap coastline; the buildings of OpenStreetMap, the Lands and
   Surveys cadastre and Microsoft, heights tagged or learnt, roof shapes and colours; piers and breakwaters; trees, woods and orchards, the lit
   roads and lighthouses), bundled in data/area3d/ or else fetched once from the public data repo and kept in the Cache API. Without it (offline before
   the first open, a failed download) the bundled coarse land (data/area3d-land.bin, ~125 m) and the 250 m depth grid stand in, and the pack
   replaces them when it arrives. js/area3d-surface.js, in two workers at once, meshes the grid with level of detail and bakes its slopes,
   depths and (the other) the hour's terrain shadows into a texture, so the light keeps the full 30 m detail where the mesh is light; and the coastline as a distance
   field, so the shore is smooth at any zoom.
   Imagery: the map's Esri tiles over the whole block (2048 px on phones, 4096 on computers, capped by the GPU) and two sharper windows, redrawn
   when the camera stops and faded in: a few km around the point looked at (zoom 14–17) and the ground nearest the camera (zoom 16–19, 19 where
   Esri has it); an Offline area's saved tiles first, a parent tile when one is missing; shaded colours where there is none. Two looks: "Fish chance" (the chosen fish and hour's chance on the seabed in the map's colours,
   depth lines, the heights exaggerated, a fixed light) and "Realistic" (true scale, the sun or moon of the chosen hour from SunCalc, a sky,
   haze, water coloured by its depth with fresnel reflections and gentle waves, buildings lit by the sun: flat roofs inside parapets with solar
   water heaters, tiled pitched roofs, church domes, balconies on flats and hotels, windows by floor, some lit at night by the hour; trees near
   the camera where the map has them and the imagery shows green; the buildings' shadows on the ground near the camera, baked for the sun;
   street lights along the lit roads at night; lighthouses). Both: the
   best spots as pins (a tap: the spot's card on the map), place names, a compass and a depth ruler. One finger turns, two pinch and move.
   three.js r128 loads on first open; the view draws only while it moves (in "Realistic" the waves run while it is open and visible, ~30 fps
   on phones); buildings, trees and shadows are built near the camera only, a few ms a frame, so nothing stalls; quality by device (QUAL:
   a low-end phone, a phone, a computer); everything is freed on close.
   API: PsArea3D.open(areaId, { sp, h }) → a promise settled once the scene is built; PsArea3D.close(); PsArea3D.view → { ms, openMs, … } or null. */
(function () {
  const THREE_JS = 'vendor/three/three.min.js';
  const ORBIT_JS = 'vendor/three/OrbitControls.js';
  const LOCAL = { [THREE_JS]: 'vendor/three/three.min.js', [ORBIT_JS]: 'vendor/three/OrbitControls.js' }; // the app's bundled copies (mobile/sync-web.mjs puts them there for js/dive3d.js)
  const HALF_KM = 14, TILES = 'psarema-tiles-v1', IMG = window.PSAREMA_IMAGERY?.url || '', SURFACE_JS = 'js/area3d-surface.js';
  const PACK_V = 3, PACKS = 'psarema-area3d-v3', MODE = 'psarema-a3-mode', SEA_JS = 'js/area3d-sea.js', SKY_JS = 'js/area3d-sky.js'; // round 12: the forecast's sea (PsArea3DSea; without it, the water below) and weather (PsArea3DSky)
  const PACK_URLS = id => [`data/area3d/${id}.bin`, `https://giannis242.github.io/psarema-data/area3d/v${PACK_V}/${id}.bin`]; // bundled, else the data repo (each format in its own folder: apps not updated yet keep reading the old one)
  const SEABED = { rock: '#6f655b', seagrass: '#2f5f36', coarse: '#a39886', sand: '#d8c69c', mud: '#7c6c55', other: '#9a9078', unknown: '#a7a089' }; // as js/dive3d.js
  const LANDC = [[0, '#76784f'], [60, '#83805a'], [200, '#978d69'], [500, '#aca288'], [1000, '#c8c3b5']]; // relief without imagery: olive lowland to pale rock
  const PLACE_KINDS = new Set([0, 1, 2, 4, 5, 7]); // data/map-places.js kinds: city, town, village, cape, bay, harbour
  // walls by building kind (build-packs.mjs KIND): homes, flats and hotels, shops and offices, industry, churches, public, sheds, piers, breakwaters, quays
  const WALLS = [['#e9dfc9', '#f1ece2', '#ddcaa9', '#e6d3b3', '#f4f1ea'], ['#f2f0ea', '#e4e1d9', '#d9d6ce'], ['#d8d5ce', '#c7c3ba', '#b9c0c4'], ['#bdb9b0', '#aaa69e', '#c6c1b4'],
    ['#e6d8bb'], ['#e5dccb', '#d9d2c4'], ['#c9b99c', '#b8ad97'], ['#b7b2a8'], ['#8f8b83', '#9a958b'], ['#aca79c']];

  let loading = null, landP = null, RINGS = null, S = null, eatPop = false, after = null;
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  // quality by device: 0 a low-end phone (≤ 3 GB, ≤ 4 cores, an older GPU, or textures under 8192 px: ~55 MB of GPU memory), 1 a phone (~95 MB),
  // 2 a computer. window.PSAREMA_A3_TIER overrides it (tests).
  const QUAL = [
    { TS: 2048, TD: 1024, TN: 1024, z: 18, budget: 110000, pr: 1.25, far: 4000, solar: 700, treeR: 600, treeMax: 1200, glow: 256, coast: 1024, shadow: 0 },
    { TS: 2048, TD: 2048, TN: 2048, z: 19, budget: 160000, pr: 1.5, far: 6000, solar: 1100, treeR: 900, treeMax: 2500, glow: 256, coast: 2048, shadow: 1024 },
    { TS: 4096, TD: 2048, TN: 4096, z: 19, budget: 450000, pr: 2, far: 9000, solar: 2000, treeR: 1800, treeMax: 10000, glow: 512, coast: 2048, shadow: 2048 }];
  let TIER = null;
  function tier() {
    if ([0, 1, 2].includes(window.PSAREMA_A3_TIER)) return window.PSAREMA_A3_TIER;
    if (TIER !== null) return TIER;
    if (!coarse()) return TIER = 2;
    let gpu = '', maxTex = 4096;
    try { const g = canvas(1).getContext('webgl'), x = g.getExtension('WEBGL_debug_renderer_info'); gpu = x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : ''; maxTex = g.getParameter(g.MAX_TEXTURE_SIZE); g.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
    const weak = /Mali-(4|T|G31|G51|G52|G57)|Adreno \(TM\) ([3-5]\d\d|61[0-2])|PowerVR|Vivante|VideoCore/i.test(gpu);
    return TIER = (navigator.deviceMemory || 4) <= 3 || (navigator.hardwareConcurrency || 8) <= 4 || maxTex < 8192 || weak ? 0 : 1;
  }
  const canvas = (w, h = w) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const rgb = hex => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16) / 255);
  const nice = v => [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(s => s >= v) || 1000;
  const next = () => new Promise(ok => setTimeout(ok)); // a task of its own: a tap on Back never waits for all of the work
  const getMode = () => { try { return localStorage.getItem(MODE) !== 'heat'; } catch { return true; } }; // "Realistic" first; the last choice kept
  function addScript(src) {
    return new Promise((ok, fail) => {
      const s = Object.assign(document.createElement('script'), { src, async: true, ...sri(src) }); // js/core.js: the CDN file's hash
      s.onload = ok; s.onerror = () => { s.remove(); fail(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  const script = src => addScript(src).catch(() => addScript(LOCAL[src])); // the CDN, else the bundled copy (the Android app offline)
  function loadThree() { // shared with js/dive3d.js and js/help.js: whichever opens first loads it
    if (window.THREE?.OrbitControls) return Promise.resolve();
    return loading ||= (window.THREE ? Promise.resolve() : script(THREE_JS)).then(() => window.THREE.OrbitControls || script(ORBIT_JS)).catch(e => { loading = null; throw e; });
  }
  function loadLand() { // the coarse land heights (gzip of: u32 header length, JSON header, one byte per cell, h = (b / 255)² · hmax); null: flat land
    return landP ||= fetch('data/area3d-land.bin').then(r => { if (!r.ok) throw new Error('area3d-land.bin: ' + r.status); return r.arrayBuffer(); }).then(async ab => {
      let u = new Uint8Array(ab);
      if (u[0] === 0x1f && u[1] === 0x8b) u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      const n = new DataView(u.buffer).getUint32(0, true), head = JSON.parse(new TextDecoder().decode(u.subarray(4, 4 + n)));
      return { ...head, g: u.subarray(4 + n), lut: Float32Array.from({ length: 256 }, (_, c) => (c / 255) ** 2 * head.hmax) };
    }).catch(e => { console.warn('Psarema area 3D: no land heights,', e.message); landP = null; return null; });
  }
  async function loadPack(id) { // the area's pack: bundled, else the data repo (then kept for offline use); null when neither answers
    const [own, repo] = PACK_URLS(id);
    try { const r = await fetch(own); if (r.ok) return await r.arrayBuffer(); } catch {}
    if (window.caches) for (const k of ['psarema-area3d-v1', 'psarema-area3d-v2']) caches.delete(k).catch(() => {}); // older formats, not read again
    const store = window.caches ? await caches.open(PACKS).catch(() => null) : null;
    let r = store && await store.match(repo).catch(() => null);
    if (!r && navigator.onLine !== false) { r = await fetch(repo).catch(() => null); if (r?.ok && store) await store.put(repo, r.clone()).catch(() => {}); }
    return r?.ok ? r.arrayBuffer().catch(() => null) : null;
  }
  function surfaceOf(s, m) { // js/area3d-surface.js in a worker of its own (kept on s, so a close stops it); on the page when workers fail
    const page = () => (window.PsArea3DSurface ? Promise.resolve() : addScript(SURFACE_JS)).then(() => window.PsArea3DSurface(m));
    let w; try { w = new Worker(SURFACE_JS); } catch { return page(); }
    s.workers.add(w);
    return new Promise((ok, fail) => {
      const end = () => { w.terminate(); s.workers.delete(w); };
      w.onmessage = e => { end(); e.data.error ? fail(new Error(e.data.error)) : ok(e.data); };
      w.onerror = e => { end(); e.preventDefault?.(); if (S === s) page().then(ok, fail); else fail(new Error('closed')); }; // the worker could not start: here instead
      w.postMessage(m);
    });
  }
  const rings = () => RINGS ||= (window.PSAREMA_COAST || []).map(r => {
    let s = 90, n = -90, w = 180, e = -180;
    for (let k = 0; k < r.length; k += 2) { s = Math.min(s, r[k]); n = Math.max(n, r[k]); w = Math.min(w, r[k + 1]); e = Math.max(e, r[k + 1]); }
    return { r, s, n, w, e };
  });
  const near = (q, B) => !(q.n < B.la0 || q.s > B.la1 || q.e < B.lo0 || q.w > B.lo1);
  function coastPath(B) { // the land, one Path2D in degrees from the block's north-west corner (x east, y south)
    const p = new Path2D();
    for (const q of rings()) if (near(q, B)) { const r = q.r; for (let k = 0; k < r.length; k += 2) p[k ? 'lineTo' : 'moveTo'](r[k + 1] - B.lo0, B.la1 - r[k]); p.closePath(); }
    return p;
  }

  function coastSegs(B) { // the coastline rings that reach the block, as segments in scene metres (x east, z south from its centre): js/area3d-surface.js
    const kx = B.span / (B.lo1 - B.lo0), kz = B.span / (B.la1 - B.la0), h = B.span / 2, out = [];
    for (const q of rings()) if (near(q, B)) { const r = q.r; for (let k = 0; k < r.length; k += 2) { const j = (k + 2) % r.length; out.push((r[k + 1] - B.lo0) * kx - h, (B.la1 - r[k]) * kz - h, (r[j + 1] - B.lo0) * kx - h, (B.la1 - r[j]) * kz - h); } }
    return Float32Array.from(out);
  }

  // The block around area a (centre ± r, so the same water as its page, js/areas.js): its bounds, the 250 m cells under it (the fish chance)
  // and the shaded fallback's sea colours.
  function cut(a) {
    const half = Math.min(a.r, HALF_KM), kx = 111.32 * Math.cos(a.lat * Math.PI / 180), ky = 110.57, span = 2000 * half;
    const B = { a, half, span, la0: a.lat - half / ky, la1: a.lat + half / ky, lo0: a.lon - half / kx, lo1: a.lon + half / kx };
    B.coast = coastPath(B);
    const x0 = Math.floor((B.lo0 - WEST) / RES), x1 = Math.floor((B.lo1 - WEST) / RES), y0 = Math.floor((NORTH - B.la1) / RES), y1 = Math.floor((NORTH - B.la0) / RES);
    const list = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x; if (depth[i] && !northMask[i]) list.push(i); }
    Object.assign(B, { x0, y0, nx: x1 - x0 + 1, ny: y1 - y0 + 1, cells: Int32Array.from(list) });
    paintSea(B);
    return B;
  }
  // Without a pack: a 257 × 257 grid of the coarse land and the 250 m depths, the coast filled at the grid's own resolution (true metres, land > 0)
  function coarseGrid(B, land) {
    const M = 257, n = M * M, dla = B.la1 - B.la0, dlo = B.lo1 - B.lo0;
    const cv = canvas(M), g = cv.getContext('2d', { willReadFrequently: true });
    g.setTransform((M - 1) / dlo, 0, 0, (M - 1) / dla, .5, .5); g.fillStyle = '#fff'; g.fill(B.coast); // pixel centres on the grid points
    const px = g.getImageData(0, 0, M, M).data; cv.width = 0;
    const dep = i => depth[i] ? dFit[i] || depth[i] : 0;
    const dAt = (la, lo) => { // bilinear between cell centres, land cells 0
      const fx = (lo - WEST) / RES - .5, fy = (NORTH - la) / RES - .5, x = Math.floor(fx), y = Math.floor(fy), tx = fx - x, ty = fy - y, i = y * W + x;
      return (dep(i) * (1 - tx) + dep(i + 1) * tx) * (1 - ty) + (dep(i + W) * (1 - tx) + dep(i + W + 1) * tx) * ty;
    };
    const hAt = (la, lo) => {
      if (!land) return 0;
      const fx = (lo - land.west) / land.res - .5, fy = (land.north - la) / land.res - .5, x = Math.floor(fx), y = Math.floor(fy);
      if (x < 0 || y < 0 || x >= land.w - 1 || y >= land.h - 1) return 0;
      const tx = fx - x, ty = fy - y, k = y * land.w + x, G = land.g, U = land.lut;
      return (U[G[k]] * (1 - tx) + U[G[k + 1]] * tx) * (1 - ty) + (U[G[k + land.w]] * (1 - tx) + U[G[k + land.w + 1]] * tx) * ty;
    };
    const H = new Float32Array(n);
    for (let r = 0; r < M; r++) {
      const la = B.la1 - r / (M - 1) * dla;
      for (let c = 0; c < M; c++) { const lo = B.lo0 + c / (M - 1) * dlo, k = r * M + c; H[k] = px[k * 4 + 3] >= 128 ? Math.max(hAt(la, lo), 2) : -Math.max(dAt(la, lo), 1.5); }
    }
    const t = new Float32Array(n), sea = k => H[k] < 0; // the 250 m seabed smoothed a little (only from sea neighbours, so the shore stays put)
    for (let pass = 0; pass < 2; pass++) for (const [d, ok] of [[1, k => k % M > 0 && k % M < M - 1], [M, k => k >= M && k < n - M]]) {
      for (let k = 0; k < n; k++) { const v = H[k]; t[k] = !sea(k) || !ok(k) ? v : (2 * v + (sea(k - d) ? H[k - d] : v) + (sea(k + d) ? H[k + d] : v)) / 4; }
      H.set(t);
    }
    return { n: M, H };
  }
  // The shaded fallback's colours, as small images the texture stretches: the sea per 250 m cell (seabed, bluer with depth); and the
  // imagery's mask over the sea (opaque on land and in the shallows, a fifth past 50 m: Esri's offshore tiles differ from tile to tile).
  function paintSea(B) {
    const { nx, ny } = B, C = Object.fromEntries(Object.entries(SEABED).map(([k, v]) => [k, rgb(v)])), deep = rgb('#0a2638');
    const sea = canvas(nx, ny), sg = sea.getContext('2d'), si = sg.createImageData(nx, ny), mask = canvas(nx, ny), mg = mask.getContext('2d'), mi = mg.createImageData(nx, ny);
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = (B.y0 + y) * W + B.x0 + x, q = (y * nx + x) * 4;
      let c = C.sand, a = 255;
      if (depth[i]) {
        const h = habK[i], r = ((h / 11 | 0) % 11) / 10, g = (h % 11) / 10, cls = HAB?.classes[h / 121 | 0] ?? 'unknown', d = dFit[i] || depth[i];
        const rest = C[cls === 'rock' || cls === 'seagrass' ? 'sand' : cls] || C.unknown, f = 1 - r - g, w = Math.min(.82, 1 - Math.exp(-d / 70));
        c = [0, 1, 2].map(k => (C.rock[k] * r + C.seagrass[k] * g + rest[k] * f) * (1 - w) + deep[k] * w);
        a = 255 * (.2 + .8 * Math.max(0, 1 - d / 50));
      }
      si.data.set([c[0] * 255, c[1] * 255, c[2] * 255, 255], q); mi.data[q + 3] = a;
    }
    sg.putImageData(si, 0, 0); mg.putImageData(mi, 0, 0);
    Object.assign(B, { seaImg: sea, maskImg: mask });
  }
  function paintLand(B, n, H) { // the land's colours by height, at most 257 px across
    const st = Math.max(1, (n - 1) / 256), M = Math.round((n - 1) / st) + 1, land = canvas(M), lg = land.getContext('2d'), li = lg.createImageData(M, M), ramp = LANDC.map(([h, c]) => [h, rgb(c)]);
    for (let r = 0; r < M; r++) for (let c = 0; c < M; c++) {
      const h = H[Math.round(r * st) * n + Math.round(c * st)]; let j = 1; while (j < ramp.length - 1 && h > ramp[j][0]) j++;
      const [h0, c0] = ramp[j - 1], [h1, c1] = ramp[j], t = Math.min(1, Math.max(0, (h - h0) / (h1 - h0))), o = (r * M + c) * 4; // no arrays a pixel: ~50 ms on a phone
      li.data[o] = (c0[0] + (c1[0] - c0[0]) * t) * 255; li.data[o + 1] = (c0[1] + (c1[1] - c0[1]) * t) * 255; li.data[o + 2] = (c0[2] + (c1[2] - c0[2]) * t) * 255; li.data[o + 3] = 255;
    }
    lg.putImageData(li, 0, 0);
    if (B.landImg) B.landImg.width = 0;
    B.landImg = land; B.landH = H;
  }
  // A window Wn (lat/lon bounds) of the block as a TS px texture: the shaded colours, then the imagery (when there is some) over the shallows
  // and the whole land, the coast drawn sharp. The whole block for the base texture, a few km for the sharp window (its alpha: the mask, so
  // the sharp imagery fades out over deep water, where Esri's zooms differ in colour).
  function compose(g, TS, B, Wn, img, alpha) {
    const sx = TS / (Wn.lo1 - Wn.lo0), sy = TS / (Wn.la1 - Wn.la0), cells = [(WEST + B.x0 * RES - Wn.lo0) * sx, (Wn.la1 - NORTH + B.y0 * RES) * sy, B.nx * RES * sx, B.ny * RES * sy];
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(B.seaImg, ...cells);
    if (img) {
      const k = canvas(TS), kg = k.getContext('2d');
      kg.drawImage(img, 0, 0); kg.globalCompositeOperation = 'destination-in'; kg.imageSmoothingEnabled = true; kg.drawImage(B.maskImg, ...cells);
      g.drawImage(k, 0, 0); k.width = 0;
    }
    g.save(); g.setTransform(sx, 0, 0, sy, (B.lo0 - Wn.lo0) * sx, (Wn.la1 - B.la1) * sy); g.clip(B.coast); g.setTransform(1, 0, 0, 1, 0, 0);
    const lw = (B.lo1 - B.lo0) * sx, lh = (B.la1 - B.la0) * sy, p = lw / (B.landImg.width - 1);
    g.drawImage(B.landImg, (B.lo0 - Wn.lo0) * sx - p / 2, (Wn.la1 - B.la1) * sy - p / 2, lw + p, lh + p);
    if (img) g.drawImage(img, 0, 0);
    g.restore();
    if (alpha) { g.globalCompositeOperation = 'destination-in'; g.drawImage(B.maskImg, ...cells); g.globalCompositeOperation = 'source-over'; }
  }
  // Imagery tiles (web Mercator) laid on a lat/lon window: a few km tall, so linear inside a tile is exact to well under a pixel. A tile that
  // cannot be had (offline, beyond the saved zooms 13–15) takes the matching quarter of its parent, or of the parent's parent.
  async function tiles(g, Wn, TS, z, url, store, alive) {
    const n = 2 ** z, X = lo => (lo + 180) / 360 * n, Yt = la => (1 - Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360)) / Math.PI) / 2 * n;
    const lon = x => x / n * 360 - 180, lat = y => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
    const jobs = [], memo = new Map();
    for (let x = Math.floor(X(Wn.lo0)); x <= Math.floor(X(Wn.lo1)); x++) for (let y = Math.floor(Yt(Wn.la1)); y <= Math.floor(Yt(Wn.la0)); y++) jobs.push([x, y]);
    const get = (zz, x, y) => {
      const u = url(zz, x, y);
      if (!memo.has(u)) memo.set(u, (async () => {
        let r = store && await store.match(u).catch(() => null);
        if (!r && navigator.onLine !== false && alive()) r = await fetch(u).catch(() => null);
        return r?.ok ? r.blob().then(b => b.size === 2521 ? null : createImageBitmap(b)).catch(() => null) : null; // 2521 bytes: Esri's grey "no data" tile
      })());
      return memo.get(u);
    };
    const sx = TS / (Wn.lo1 - Wn.lo0), sy = TS / (Wn.la1 - Wn.la0); let k = 0, got = 0;
    const one = async () => {
      while (k < jobs.length && alive()) {
        const [x, y] = jobs[k++];
        let bm = await get(z, x, y), sub = null;
        for (let up = 1; !bm && up <= 2 && z - up >= 10 && alive(); up++) { bm = await get(z - up, x >> up, y >> up); if (bm) { const f = 256 >> up, m = (1 << up) - 1; sub = [(x & m) * f, (y & m) * f, f, f]; } }
        if (!bm || !alive()) continue;
        const x0 = Math.floor((lon(x) - Wn.lo0) * sx), x1 = Math.ceil((lon(x + 1) - Wn.lo0) * sx), y0 = Math.floor((Wn.la1 - lat(y)) * sy), y1 = Math.ceil((Wn.la1 - lat(y + 1)) * sy);
        if (sub) g.drawImage(bm, ...sub, x0, y0, x1 - x0, y1 - y0); else g.drawImage(bm, x0, y0, x1 - x0, y1 - y0);
        got++;
      }
    };
    await Promise.all(Array.from({ length: 6 }, one));
    for (const p of memo.values()) p.then(b => b?.close?.());
    return got;
  }
  const esriUrl = (z, x, y) => IMG.replace('{z}', z).replace('{y}', y).replace('{x}', x); // js/map-config.js: the online imagery (the token rides in its query)
  const tileStore = async () => window.PSAREMA_IMAGERY?.offline && window.caches && await caches.has(TILES).catch(() => false) ? caches.open(TILES) : null;
  async function dress(V) { // after the first frame: the app's own imagery (local, quick), then the map's Esri tiles over it
    const alive = () => S?.view?.V === V, img = canvas(V.TS), ig = img.getContext('2d'), own = window.PSAREMA_TILES, zz = V.TS > 2048 ? 14 : 13; // about a tile pixel per texel, ≤ ~200 tiles
    let eox = 0, esri = 0;
    try {
      if (own?.url) { eox = await tiles(ig, V.B, V.TS, Math.min(own.maxZoom, zz), (z, x, y) => own.url.replace('{z}', z).replace('{x}', x).replace('{y}', y), null, alive); if (eox && alive()) V.recompose(img); }
      const store = await tileStore();
      if (alive() && IMG) esri = await tiles(ig, V.B, V.TS, zz, esriUrl, store, alive);
      if (esri && alive()) V.recompose(img);
    } catch (e) { console.warn('Psarema area 3D imagery:', e); }
    if (alive()) { V.img = esri ? 'esri' : eox ? 'eox' : ''; V.credit(); }
    img.width = 0;
  }

  // The fish chance per 250 m cell of the block, in the map's colours (core.js heatRgba), below the map's "Hide below" clear
  function heat(B, sp, h) {
    const s8 = window.PsAreas?.grid ? PsAreas.grid(B.cells, sp, h) : new Uint8Array(B.cells.length), { nx, ny } = B, n = nx * ny, d = new Uint8Array(n * 4), sc = new Uint8Array(n);
    B.cells.forEach((i, k) => { if (s8[k] >= state.min) sc[((i / W | 0) - B.y0) * nx + i % W - B.x0] = s8[k]; });
    for (let q = 0; q < n; q++) if (sc[q]) d.set(heatRgba(sc[q]), q * 4);
    for (let q = 0; q < n; q++) if (!sc[q]) { // a clear texel takes its hottest neighbour's colour, so the edge fades in that colour (as js/dive3d.js)
      let b = -1, bs = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = q % nx + dx, y = (q / nx | 0) + dy, o = y * nx + x; if (x >= 0 && y >= 0 && x < nx && y < ny && sc[o] > bs) { bs = sc[o]; b = o; } }
      if (b >= 0) d.copyWithin(q * 4, b * 4, b * 4 + 3);
    }
    const own = new Set(window.PsAreas?.cells?.(B.a.id) || B.cells), inC = Uint8Array.from(B.cells, i => own.has(i)); // the area's circle: its pins and best, as its page has them
    return { d, s8: s8.map((v, k) => inC[k] ? v : 0), best: s8.reduce((m, v, k) => inC[k] && v > m ? v : m, 0) };
  }

  /* ---------- Light: the sun or the moon of the hour (SunCalc, at the area), the sky's colours ---------- */
  function light(a, h) {
    const t0 = h >= 0 && hours?.[h] ? hours[h].t : Date.now(), t = new Date(t0 + 18e5), dir = p => [-Math.sin(p.azimuth) * Math.cos(p.altitude), Math.sin(p.altitude), Math.cos(p.azimuth) * Math.cos(p.altitude)];
    const SC = window.SunCalc, sp = SC ? SC.getPosition(t, a.lat, a.lon) : { azimuth: -.6, altitude: .9 }, sa = Math.sin(sp.altitude);
    const mp = SC?.getMoonPosition(t, a.lat, a.lon), mi = SC?.getMoonIllumination(t).fraction ?? 0, moon = mp && mp.altitude > 0 ? Math.sqrt(Math.sin(mp.altitude)) * mi : 0;
    const sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); }, mix = (p, q, k) => p.map((v, i) => v + (q[i] - v) * k);
    const day = sm(-.1, .12, sa), warm = sm(.05, .45, sa), up = sm(-.03, .06, sa);
    const keys = [[-.25, '#03060d', '#0b1426'], [-.06, '#0f1a33', '#3b3a55'], [.02, '#25406f', '#e39b6c'], [.12, '#3567a6', '#e9c49c'], [.35, '#2f6db5', '#bdd5ea']].map(([s, z, hz]) => [s, rgb(z), rgb(hz)]);
    let j = 1; while (j < keys.length - 1 && sa > keys[j][0]) j++;
    const k = Math.min(1, Math.max(0, (sa - keys[j - 1][0]) / (keys[j][0] - keys[j - 1][0])));
    return { t: t0, zen: mix(keys[j - 1][1], keys[j][1], k), hor: mix(keys[j - 1][2], keys[j][2], k), night: 1 - day, bake: sa > .01 ? dir(sp) : null,
      sun: sa > -.02 || !mp ? dir(sp) : dir(mp), sunCol: sa > -.02 ? mix([1, .5, .26], [1, .96, .9], warm).map(v => v * up * 1.05) : [.16 * moon, .19 * moon, .26 * moon],
      amb: mix([.19 + .1 * moon, .23 + .1 * moon, .33 + .12 * moon], [.40, .44, .5], day) }; // a night lit by the stars (readable), more with the moon
  }
  const css = c => `rgb(${c.map(v => Math.round(v * 255)).join(',')})`;

  /* ---------- Shaders ---------- */
  const EXY = `uniform float exL, exS;\nfloat exOf(float y) { return y > 0.0 ? exL : exS; }\n`;
  const LIGHT = `uniform vec3 sun, sunCol, amb, haze; uniform float real, hazeK, hazeD, night;
uniform sampler2D cloudT; uniform vec4 cloudK, cloudO; uniform mat4 cloudInv; uniform vec2 cloudVp; // round 12, js/area3d-sky.js: the clouds' height, tile, threshold, shadow; their drift
float cloudAt(vec2 xz) { return 0.6 * texture2D(cloudT, xz / cloudK.y + cloudO.xy).r + 0.4 * texture2D(cloudT, mat2(0.77, -0.64, 0.64, 0.77) * xz / (cloudK.y * 0.63) + cloudO.zw).r; } // two tiles that never line up
float cloudSh() { if (cloudK.w < 0.001) return 1.0; vec4 q = cloudInv * vec4(gl_FragCoord.xy / cloudVp * 2.0 - 1.0, gl_FragCoord.z * 2.0 - 1.0, 1.0); vec3 p = q.xyz / q.w; // this pixel's point, then up to the clouds toward the sun
  return 1.0 - cloudK.w * smoothstep(cloudK.z - 0.06, cloudK.z + 0.2, cloudAt(p.xz + sun.xz / max(sun.y, 0.1) * (cloudK.x - p.y))); }
uniform sampler2D shOld; uniform float shMix; // round 12, js/area3d-sky.js: another hour's shadows fade in from the last ones
float shadeOf(float s, vec2 uv) { return shMix < 0.999 ? mix(texture2D(shOld, uv).r, s, shMix) : s; }
float lightK() { return cloudSh() / (0.45 + 0.75 * max(sun.y, 0.25) * (1.0 - night) + night); } // flat ground by day about as bright as the imagery; less under a cloud
vec3 hazed(vec3 c, vec3 p) { return mix(c, haze, (1.0 - exp(-max(distance(p, cameraPosition) - hazeD, 0.0) * hazeK)) * real * 0.65); } // aerial perspective past the point looked at\n`;
  // the imagery: the whole block, then two sharper windows (a few km around the point looked at; the ground nearest the camera, up to zoom 19),
  // each faded in at its edges and as it arrives; sampled outside any branch (the mipmaps need the derivatives)
  const SAMPLE = `uniform sampler2D map, detail, near; uniform vec4 dWin, nWin; uniform float dOn, nOn;
vec3 over(vec3 c, sampler2D t, vec4 w, float on, vec2 uv) { vec2 q = (uv - w.xy) * w.zw; vec4 d = texture2D(t, q); float f = min(min(q.x, q.y), min(1.0 - q.x, 1.0 - q.y));
  return mix(c, d.rgb, smoothstep(0.0, 0.15, f) * d.a * on); } // a wide fade: Esri's zoom levels differ a little in colour
vec3 imagery(vec2 uv) { return over(over(texture2D(map, uv).rgb, detail, dWin, dOn, uv), near, nWin, nOn, uv); }\n`;
  const TER_V = `${EXY}uniform float span; varying vec3 vW; varying vec2 vUv; varying float vH;
void main() { vec3 p = position; vH = p.y; p.y *= exOf(p.y); vUv = p.xz / span + 0.5; vW = p; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
  const TER_F = `${EXY}${LIGHT}${SAMPLE}uniform sampler2D heat, aux, glow, shade; uniform vec4 hb; uniform vec2 auxK; uniform float heatOn, cstep, sOn;
varying vec3 vW; varying vec2 vUv; varying float vH;
void main() {
  vec4 a = texture2D(aux, vUv * auxK.x + auxK.y);
  vec2 e = a.rg * 2.0 - 1.0, s = e * e, g = sign(e) * s / (1.0 - s);
  float ex = exOf(vH);
  vec3 n = normalize(vec3(-g.x * ex, 1.0, -g.y * ex)), c = imagery(vUv), col, ng = normalize(cross(dFdx(vW), dFdy(vW)));
  if (ng.y < 0.0) ng = -ng;
  float wall = 1.0 - smoothstep(0.3, 0.65, ng.y); // the drop at the coast (exaggerated): rock, not the imagery stretched down it
  float strata = 0.84 + 0.16 * sin(vH * 0.9 + 2.0 * sin(vW.x * 0.05 + vW.z * 0.07)); // pale limestone in bands; softer facets
  c = mix(c, (vH > 0.0 ? vec3(0.74, 0.68, 0.58) : vec3(0.32, 0.36, 0.36)) * strata, wall); n = normalize(mix(n, normalize(vec3(ng.x, 0.7, ng.z)), wall));
  float dif = max(dot(n, sun), 0.0);
  vec2 sq = (vUv - nWin.xy) * nWin.zw; float sf = min(min(sq.x, sq.y), min(1.0 - sq.x, 1.0 - sq.y)); // the buildings' shadows: the near window's
  float bs = texture2D(shade, sq).r * smoothstep(0.0, 0.05, sf) * sOn * 0.7;
  if (real > 0.5) col = c * (amb + sunCol * dif * shadeOf(a.a, vUv * auxK.x + auxK.y) * (1.0 - bs)) * lightK() + vec3(1.0, 0.66, 0.32) * texture2D(glow, vUv).r * night * (0.05 + 0.5 * dot(c, vec3(0.3, 0.5, 0.2))); // streets lit at night: brighter where the imagery is (roads, squares)
  else {
    col = c * (0.4 + 0.72 * dif);
    if (vH < 0.0) {
      vec4 h = texture2D(heat, (vW.xz - hb.xy) * hb.zw);
      col = mix(col, h.rgb * (0.72 + 0.32 * dif), h.a * heatOn * 0.92); // the map's colours, nearly as they are: they must read over the imagery
      float d = -vH / cstep, gl = abs(fract(d + 0.5) - 0.5) / max(fwidth(d), 1e-4), major = 1.0 - step(0.5, abs(mod(floor(d + 0.5), 5.0)));
      col = mix(col, vec3(0.93), clamp(1.1 - gl, 0.0, 1.0) * step(0.5, d) * (0.14 + 0.26 * major)); // depth lines, every fifth stronger
    }
  }
  gl_FragColor = vec4(hazed(col, vW), 1.0);
}`;
  const WAT_V = `uniform float span; varying vec3 vW; varying vec2 vUv;
void main() { vW = position; vUv = position.xz / span + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const WAT_F = `${LIGHT}uniform sampler2D aux, coast; uniform vec2 auxK; uniform vec3 skyZ, skyH; uniform float time;
varying vec3 vW; varying vec2 vUv;
vec2 wave(vec2 p, vec2 d, float L, float a, float fw) { float k = 6.2832 / L; return d * (a * k * cos(dot(p, d) * k - sqrt(9.81 * k) * time)) * (1.0 - smoothstep(L * 0.12, L * 0.45, fw)); }
void main() {
  vec4 t = texture2D(aux, vUv * auxK.x + auxK.y);
  if (texture2D(coast, vUv).r < 0.5) discard; // land: the coastline's distance field (smooth at any zoom, not the grid's steps)
  float dep = pow(max(t.b * 255.0 - 1.0, 0.0) / 254.0, 2.0) * 400.0, fw = length(fwidth(vW.xz));
  vec2 p = vW.xz, sl = wave(p, vec2(0.83, 0.55), 61.0, 0.55, fw) + wave(p, vec2(0.36, 0.93), 23.0, 0.22, fw) + wave(p, vec2(0.98, -0.2), 11.0, 0.09, fw) + wave(p, vec2(-0.5, 0.87), 4.7, 0.035, fw);
  vec3 n = normalize(vec3(-sl.x, 1.0, -sl.y)), V = normalize(cameraPosition - vW), R = reflect(-V, n);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  vec3 sky = mix(skyH, skyZ, sqrt(clamp(R.y, 0.0, 1.0)));
  vec3 body = mix(vec3(0.06, 0.36, 0.40), vec3(0.01, 0.07, 0.15), 1.0 - exp(-dep / 40.0)) * (amb + sunCol * max(sun.y, 0.0)) * lightK();
  float rough = mix(700.0, 40.0, smoothstep(1.0, 30.0, fw)), spec = pow(max(dot(R, sun), 0.0), rough) * rough / 700.0 * 3.0; // far away the glints merge into a soft sheen
  vec3 col = mix(body, sky, fres) + sunCol * spec;
  float alpha = max(clamp(1.0 - exp(-dep / 12.0), 0.18, 0.95), fres); // the imagery shows through the shallows; deeper, the water's own colour
  float foam = (1.0 - smoothstep(0.2, 1.4, dep)) * (0.6 + 0.4 * sin(dep * 7.0 - time * 1.4 + (p.x - p.y) * 0.02)) * (1.0 - smoothstep(6.0, 30.0, fw));
  col = mix(col, vec3(0.9) * (amb + sunCol * 0.8), foam * 0.55); alpha = max(alpha, foam * 0.6);
  gl_FragColor = vec4(hazed(col, vW), alpha);
}`;
  // buildings: walls, roofs, domes (kind 14) and the instanced solar water heaters (kind 15, plain colours); g: the ground under them
  const BLD_V = `${EXY}attribute float g; attribute vec4 c; varying vec3 vW; varying float vRel; varying vec4 vC; varying float vTint;
#ifdef USE_INSTANCING
${SAMPLE}uniform float span, treeR; attribute float tree;
#endif
void main() { vec3 p = position; vTint = 0.5;
#ifdef USE_INSTANCING
  p = (instanceMatrix * vec4(p, 1.0)).xyz; vTint = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453); // each tree or heater a shade of its own
  if (tree > 0.5) { // one program with the heaters (one less to compile)
    // a tree from a wood, forest, orchard or park stands only where the imagery (the sharpest it has) shows green; a mapped one (mirrored)
    // always; all shrink away towards the edge of the trees' range
    vec3 o = instanceMatrix[3].xyz, im = imagery(o.xz / span + 0.5);
    float mapped = step(dot(cross(instanceMatrix[0].xyz, instanceMatrix[1].xyz), instanceMatrix[2].xyz), 0.0);
    float green = step(im.r + im.g + im.b, 1.49) * step(im.r * 1.02, im.g) * step(im.b * 1.08, im.g);
    p = o + (p - o) * max(mapped, green) * (1.0 - smoothstep(treeR * 0.75, treeR, distance(o.xz, cameraPosition.xz)));
  }
#endif
  vRel = p.y; p.y = g * exOf(g) + p.y; vW = p; vC = c; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
  const BLD_F = `${LIGHT}${SAMPLE}uniform float span, lit; varying vec3 vW; varying float vRel; varying vec4 vC; varying float vTint;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float band(float x, float a, float b, float w) { return clamp((x - a) / w + 0.5, 0.0, 1.0) * clamp((b - x) / w + 0.5, 0.0, 1.0); } // 1 from a to b, its edges soft over a pixel
void main() {
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  if (dot(n, cameraPosition - vW) < 0.0) n = -n;
  float kind = floor(vC.a * 15.0 + 0.5);
  bool roof = n.y > 0.6, plain = kind > 13.5, works = kind > 6.5 && !plain;
  vec3 base = vC.rgb * (plain ? 0.8 + 0.4 * vTint : 1.0);
  if (roof && !plain) base = mix(base * 0.92, imagery(vW.xz / span + 0.5) * 1.08, works ? 0.35 : 0.62); // the roof's own colour from the imagery
  vec3 L = real > 0.5 ? sun : normalize(vec3(-0.5, 0.8, -0.35)), lc = real > 0.5 ? sunCol : vec3(0.7), am = real > 0.5 ? amb : vec3(0.45);
  float ao = roof || plain ? 1.0 : mix(0.6, 1.0, smoothstep(-1.0, 5.0, vRel));
  float dif = max(dot(n, L), 0.0), K = real > 0.5 ? lightK() : 1.0;
  vec3 col = base * (am + lc * dif) * ao * K;
  if (!roof && kind < 6.5) { // windows: a floor every 3.1 m (homes 3.0), a bay every 3.4 m (homes 3.8); at night some lit (lit: the hour's share)
    float flats = step(0.5, kind) * step(kind, 1.5), shops = step(1.5, kind) * step(kind, 2.5);
    float fl = vRel / mix(3.1, 3.0, step(kind, 0.5)), bay = dot(vW.xz, normalize(vec2(-n.z, n.x))) / mix(3.4, 3.8, step(kind, 0.5));
    vec2 f = fract(vec2(fl, bay)), w = max(vec2(fwidth(fl), fwidth(bay)), 1e-4);
    float aa = 1.0 - smoothstep(0.35, 0.9, max(w.x, w.y)), front = shops * (1.0 - step(4.2, vRel)); // shops: glass fronts at street level
    float balc = flats * step(2.9, vRel); // flats and hotels: a balcony along each floor: the slab's edge, a railing, the recess behind in shade
    float win = mix(band(f.x, 0.32, 0.8, w.x) * band(f.y, 0.22, 0.78, w.y), band(vRel, 0.3, 3.5, fwidth(vRel)) * band(f.y, 0.06, 0.94, w.y), front) * step(0.9, vRel);
    win = max(win, balc * band(f.x, 0.34, 0.86, w.x) * band(f.y, 0.14, 0.86, w.y)); // balcony doors above the railing
    float slab = balc * band(f.x, -0.01, 0.07, w.x), rail = balc * band(f.x, 0.07, 0.34, w.x);
    vec3 glass = mix(vec3(0.17, 0.2, 0.24), haze, 0.4) * (am + lc * 0.35) * K;
    col *= mix(1.0, 0.74, balc * (1.0 - slab) * aa);
    col = mix(col, glass, win * 0.55 * aa);
    col = mix(col, base * (am + lc * (max(L.y, 0.0) * 0.9 + dif * 0.2)) * K * 1.08, slab * aa);
    col = mix(col, vec3(0.9, 0.9, 0.88) * (am + lc * dif) * K, rail * aa * 0.7);
    float on = step(1.0 - lit * mix(1.0, 1.25, flats), hash(vec3(floor(fl), floor(bay), floor(vW.x * 0.013) + floor(vW.z * 0.017))));
    col += vec3(1.0, 0.74, 0.42) * mix(0.2 * lit * step(0.9, vRel), win * max(on, front * 0.9), aa) * night * 1.15; // too small to see one by one: their average glow
  }
  gl_FragColor = vec4(hazed(col, vW), 1.0);
}`;

  function sheet(T, cols, rows, put) { // a grid of points with colours: put(c, r) → [x, y, z, r, g, b]
    const pos = new Float32Array(cols * rows * 3), col = new Float32Array(cols * rows * 3), idx = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const v = put(c, r), k = (r * cols + c) * 3; pos.set(v.slice(0, 3), k); col.set(v.slice(3), k); }
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) { const a = r * cols + c; idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setIndex(idx);
    return g;
  }

  function build(B, R, host, sp, h, LT) {
    LT = window.PsArea3DSky?.light(LT, B.a, h) || LT; // round 12: the hour's light under its clouds
    const T = window.THREE, t0 = performance.now(), cz = coarse(), half = B.span / 2, span = B.span, dla = B.la1 - B.la0, dlo = B.lo1 - B.lo0;
    const xOf = lo => (lo - B.lo0) / dlo * span - half, zOf = la => (B.la1 - la) / dla * span - half;
    const renderer = new T.WebGLRenderer({ antialias: !cz, alpha: true, powerPreference: cz ? 'default' : 'high-performance' });
    const Qt = QUAL[tier()]; let pr = Math.min(window.devicePixelRatio || 1, Qt.pr); const gaps = []; // the pixel ratio: lowered while frames run slow (a weak GPU)
    renderer.setPixelRatio(pr);
    renderer.setClearColor(0x000000, 0);
    const gl = renderer.capabilities, maxTex = gl.maxTextureSize, canvasEl = renderer.domElement, scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1, 10, span * 30);
    const FIX = new T.Vector3(-.5, .8, -.35).normalize(), V3 = a => new T.Vector3(...a);
    let real = getMode(), Hn = R.n, HH = R.H, api = null;
    const ex = R.ex, exL = () => real ? 1 : ex, exS = exL;
    const yT = (x, z) => { // the surface's true height at a point (bilinear on the grid)
      const f = Hn - 1, fc = Math.min(f - .001, Math.max(0, (x / span + .5) * f)), fr = Math.min(f - .001, Math.max(0, (z / span + .5) * f)), c = fc | 0, r = fr | 0, tx = fc - c, ty = fr - r, k = r * Hn + c;
      return (HH[k] * (1 - tx) + HH[k + 1] * tx) * (1 - ty) + (HH[k + Hn] * (1 - tx) + HH[k + Hn + 1] * tx) * ty;
    };
    const yD = y => y * (y > 0 ? exL() : exS()); // true height → shown
    const prof = {}, slow = [], timed = (k, f) => { const t = performance.now(), r = f(), d = Math.round(performance.now() - t); prof[k] = Math.max(prof[k] || 0, d); if (d > 20 && slow.length < 40) slow.push(k + ' ' + d); return r; }; // the longest main-thread steps (api.prof, api.slow)

    // textures: the composed base, the two sharp windows (detail: a few km; near: the ground nearest the camera), the fish chance, the
    // surface's slopes / depth / light
    const TS = Math.min(Qt.TS, maxTex), TD = Math.min(Qt.TD, maxTex), TN = Math.min(Qt.TN, maxTex), tcv = canvas(TS), dcv = canvas(TD), ncv = canvas(TN);
    const V = { B, TS, TD, TN, img: '', hi: false, gen: 0 };
    const tex = new T.CanvasTexture(tcv), dtex = new T.CanvasTexture(dcv), ntex = new T.CanvasTexture(ncv);
    for (const t of [tex, dtex, ntex]) { t.flipY = false; t.anisotropy = Math.min(cz ? 8 : 16, renderer.capabilities.getMaxAnisotropy()); } // sharp at a slant
    timed('paintLand', () => paintLand(B, R.n, R.H));
    const whole = { lo0: B.lo0, lo1: B.lo1, la0: B.la0, la1: B.la1 };
    const Hd = timed('heat', () => heat(B, sp, h)), heatTex = new T.DataTexture(Hd.d, B.nx, B.ny, T.RGBAFormat, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, T.LinearFilter, T.LinearFilter);
    heatTex.needsUpdate = true;
    const U = { map: { value: tex }, detail: { value: dtex }, dWin: { value: new T.Vector4(0, 0, 1, 1) }, dOn: { value: 0 }, heat: { value: heatTex }, heatOn: { value: 1 },
      aux: { value: null }, auxK: { value: new T.Vector2(1, 0) }, exL: { value: 1 }, exS: { value: 1 }, span: { value: span }, cstep: { value: 10 },
      hb: { value: new T.Vector4(xOf(WEST + B.x0 * RES), zOf(NORTH - B.y0 * RES), dlo / (span * B.nx * RES), dla / (span * B.ny * RES)) }, // the heat texture's corner and texels per unit
      sun: { value: FIX.clone() }, sunCol: { value: V3(LT.sunCol) }, amb: { value: V3(LT.amb) }, haze: { value: V3(LT.hor) }, hazeK: { value: 1 / span }, hazeD: { value: 0 }, real: { value: 0 },
      skyZ: { value: V3(LT.zen) }, skyH: { value: V3(LT.hor) }, night: { value: LT.night }, time: { value: 0 }, glow: { value: null },
      cloudT: { value: null }, cloudK: { value: new T.Vector4() }, cloudO: { value: new T.Vector4() }, cloudInv: { value: new T.Matrix4() }, cloudVp: { value: new T.Vector2(1, 1) }, shOld: { value: null }, shMix: { value: 1 } };
    Object.assign(U, { near: { value: ntex }, nWin: { value: new T.Vector4(0, 0, 1, 1) }, nOn: { value: 0 }, coast: { value: null }, shade: { value: null }, sOn: { value: 0 } }); // coast: js/area3d-surface.js coastField; shade: shadows()
    const terrain = new T.Mesh(new T.BufferGeometry(), new T.ShaderMaterial({ uniforms: U, vertexShader: TER_V, fragmentShader: TER_F, extensions: { derivatives: true } }));
    terrain.frustumCulled = false; scene.add(terrain);
    const sky = window.PsArea3DSky?.create(T, { U, span, a: B.a, h, cz, LIGHT, renderer, scene, host, tier: tier(), bake: LT.bake, wake: () => V.wake?.(), quality: q => sea?.setQuality?.(q) }); // "Realistic": wind, clouds, rain (js/area3d-sky.js)
    const sea = window.PsArea3DSea?.create(T, { U, span, a: B.a, h, cz, tier: tier(), LIGHT, renderer, host, wake: () => V.wake?.(), fly: (...a) => flyTo(...a), controls: () => controls }); // "Realistic": the water (js/area3d-sea.js)
    const wGeo = sea ? null : new T.PlaneGeometry(span, span, 1, 1); wGeo?.rotateX(-Math.PI / 2);
    const water = sea ? sea.mesh : new T.Mesh(wGeo, new T.ShaderMaterial({ uniforms: U, vertexShader: WAT_V, fragmentShader: WAT_F, extensions: { derivatives: true }, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
    water.renderOrder = 3; water.frustumCulled = false; scene.add(water);
    const surfGeo = new T.PlaneGeometry(span, span); surfGeo.rotateX(-Math.PI / 2); // "Fish chance": the sea surface, faint
    const surf = new T.Mesh(surfGeo, new T.MeshBasicMaterial({ color: 0x3a8fb5, transparent: true, opacity: .1, depthWrite: false })); surf.renderOrder = 3; scene.add(surf);
    const litAt = t => { const hr = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Nicosia' }).format(t); return hr >= 17 && hr < 23 ? .6 : hr >= 23 || hr < 1 ? .4 : hr < 5 ? .15 : hr < 7 ? .3 : .5; };
    U.lit = { value: litAt(LT.t) }; // the share of windows lit at night, by the hour
    const bldMat = new T.ShaderMaterial({ uniforms: U, vertexShader: BLD_V, fragmentShader: BLD_F, extensions: { derivatives: true }, side: T.DoubleSide });
    const deco = new T.Group(), ruler = new T.Group(); scene.add(deco, ruler); // what depends on the heights' scale: rebuilt by applyEx()

    // HTML labels that follow points in the scene ('ground': a place name, on the surface at the current scale)
    const labHost = host.querySelector('.a3-labels'), labels = [], tmp = new T.Vector3();
    const label = (html, cls, v, ground) => { const el = document.createElement('div'); el.className = 'a3-lab ' + cls; el.innerHTML = `<span>${html}</span>`; labHost.append(el); const L_ = { el, v, ground, kind: cls.split(' ')[0], w: 0 }; labels.push(L_); return L_; };
    label(esc(tr('dirs')[0]), 'north', new T.Vector3(0, 0, -half - span * .05)); // first: names and tags give way to it
    let tops = []; const top = span * .035;
    const setPins = s8 => { // the best spots as pins; again for another hour
      for (let k = labels.length - 1; k >= 0; k--) if (labels[k].kind === 'pin') { labels[k].el.remove(); labels.splice(k, 1); }
      tops = window.PsAreas?.pick ? PsAreas.pick(B.cells, s8, state.mode === 'boat' ? 2 : 1, 6, Math.max(40, state.min)) : [];
      const n0 = labels.length;
      tops.forEach(({ i, s }, k) => label(`<button type="button" class="a3-pin" data-a3-spot="${i}" aria-label="${esc(`#${k + 1} · ${s} · ${describe(latOf(i), lonOf(i))}`)}"><b>${k + 1}</b>${ring(s, 'sm')}</button>`, 'pin', new T.Vector3(xOf(lonOf(i)), top, zOf(latOf(i)))));
      labels.splice(1, 0, ...labels.splice(n0)); // after north: the place names give way to them
    };
    setPins(Hd.s8);
    const placed = [], inB = (la, lo) => la >= B.la0 && la <= B.la1 && lo >= B.lo0 && lo <= B.lo1;
    for (const p of [...(window.PSAREMA_MAP_PLACES?.rows || [])].filter(p => PLACE_KINDS.has(p[4]) && p[5] <= 12 && inB(p[2], p[3])).sort((p, q) => q[6] - p[6])) {
      if (placed.length >= 9) break; // towns, villages, capes, bays, harbours: the most important first, ~1.6 km apart at least
      if (placed.some(q => q[0] === p[0] || Math.hypot((q[3] - p[3]) * 91.2, (q[2] - p[2]) * 110.6) < 1.6)) continue;
      placed.push(p);
      label(esc(state.lang === 'el' ? p[1] : p[0]), 'place k' + p[4], new T.Vector3(xOf(p[3]), 0, zOf(p[2])), true);
    }
    const tick = span * .012, lift = span * 6e-4;
    let marks = [], rulerLabs = [], minY = 0, maxY = 0, base = 0;
    const lineMat = o => new T.LineBasicMaterial({ color: 0xffffff, transparent: true, ...o });
    const STRATA = ['#6b563f', '#4e3d2c', '#5d4834', '#3c2f23', '#2a211a'].map(rgb), SF = [0, .12, .38, .68, 1], wTop = rgb('#4aa6c8'), wBot = rgb('#06223a');
    const wallMat = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }), colMat = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, transparent: true, opacity: .4, depthWrite: false });
    const ringGeo = new T.RingGeometry(span * .004, span * .0065, 32); ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95, side: T.DoubleSide, depthWrite: false });
    const mats = [wallMat, colMat, ringMat, lineMat({ opacity: .25 }), lineMat({ opacity: .7 }), lineMat({ opacity: .85 }), lineMat({ opacity: .8, depthTest: false })];
    const segs = (pts, mat, order) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); const l = new T.LineSegments(g, mat); l.renderOrder = order; return l; };
    function applyEx() { // the block's sides and frame, the coastline, the pins' stems and rings, the depth ruler and the labels at the current scale
      U.exL.value = exL(); U.exS.value = exS();
      for (const o of [...deco.children, ...ruler.children]) { if (o.geometry !== ringGeo) o.geometry.dispose(); o.parent.remove(o); }
      minY = yD(R.minH); maxY = yD(R.maxH); base = minY - span * .03;
      const maxD = Math.max(1, -R.minH), st = Math.max(1, Math.round((Hn - 1) / 256));
      const edge = (cOf, rOf) => { const out = []; for (let q = 0; q < Hn; q += st) { const c = cOf(q), r = rOf(q); out.push([(c / (Hn - 1) - .5) * span, yD(HH[r * Hn + c]), (r / (Hn - 1) - .5) * span]); } return out; };
      for (const e of [edge(c => c, () => 0), edge(c => c, () => Hn - 1), edge(() => 0, r => r), edge(() => Hn - 1, r => r)]) { // earth down to the base; the water column over the seabed
        deco.add(new T.Mesh(sheet(T, e.length, SF.length, (c, r) => { const [x, y, z] = e[c]; return [x, y + (base - y) * SF[r], z, ...STRATA[r]]; }), wallMat));
        const w = new T.Mesh(sheet(T, e.length, 2, (c, r) => { const [x, y, z] = e[c], yy = r ? Math.min(0, y) : 0, f = -yy / (-minY || 1); return [x, yy, z, ...wTop.map((v, q) => v + (wBot[q] - v) * f)]; }), colMat);
        w.renderOrder = 2; deco.add(w);
      }
      const cs = [[-half, -half], [half, -half], [half, half], [-half, half]], fr = [];
      cs.forEach(([x, z], q) => { const [x2, z2] = cs[(q + 1) % 4]; fr.push(x, 0, z, x2, 0, z2, x, 0, z, x, base, z); });
      deco.add(segs(fr, mats[3], 0));
      if (!real) { // the coastline, on the surface
        const cl = [], at = (la, lo) => [xOf(lo), Math.max(0, yD(yT(xOf(lo), zOf(la)))) + lift, zOf(la)];
        for (const q of rings()) if (near(q, B)) { const r = q.r; for (let k = 2; k < r.length; k += 2) if (inB(r[k - 2], r[k - 1]) && inB(r[k], r[k + 1])) cl.push(...at(r[k - 2], r[k - 1]), ...at(r[k], r[k + 1])); }
        deco.add(segs(cl, mats[4], 4));
      }
      const stems = []; // the best spots: a stem from the seabed up out of the water, a ring on the seabed
      for (const { i } of tops) {
        const x = xOf(lonOf(i)), z = zOf(latOf(i)), y = Math.min(yD(yT(x, z)), -exS());
        stems.push(x, y, z, x, top, z);
        const rg = new T.Mesh(ringGeo, ringMat); rg.position.set(x, y + lift, z); rg.renderOrder = real ? 2 : 4; deco.add(rg); // "Realistic": under the water, seen through it
      }
      deco.add(segs(stems, mats[5], 5));
      const cstep = nice(Math.max(maxD, 20) / 14), rstep = nice(maxD / 4.5), rl = [0, 0, 0, 0, -maxD * exS(), 0];
      U.cstep.value = cstep; marks = [];
      for (let d = 0; d <= maxD + 1e-6; d += rstep) { rl.push(0, -d * exS(), 0, tick, -d * exS(), 0); marks.push(d); }
      ruler.add(segs(rl, mats[6], 6));
      for (const L_ of rulerLabs) { L_.el.remove(); labels.splice(labels.indexOf(L_), 1); }
      rulerLabs = []; for (let q = marks.length - 1; q >= 0; q--) rulerLabs[q] = label(`${marks[q]}${marks[q] ? ' m' : ''}`, 'tick', new T.Vector3()); // the deepest first: it stays when they crowd
      for (const L_ of labels) if (L_.ground) L_.v.y = Math.max(0, yD(yT(L_.v.x, L_.v.z))) + lift * 4;
      for (const c of cells.values()) if (c.mesh) bound(c);
      host.querySelector('.a3-meta').textContent = real ? tr('a3_metaR', fmtKm(span / 1000), whenT(LT.t)) : tr('a3_meta', fmtKm(span / 1000), ex, cstep);
      if (fit.done) controls.maxDistance = radius() * 1.8;
    }

    // buildings, piers and breakwaters: per 1 km cell, shown within 1.7× the camera's distance to the point it looks at (2.5–6 km; 9 on
    // computers), built when first shown, a few cells a frame; their solar water heaters ("Realistic" only, instanced) within ~1.1 km (2 km on
    // computers) of a cell's centre
    const CELL = 1000, SOLAR = Qt.solar, cells = new Map(), PARA = .9, OVER = .35, mtx = new T.Matrix4();
    const TERRA = ['#a95a3f', '#b4643f', '#9e4f39', '#b8704e'].map(h => rgb(h).map(x => x * 255)), c565 = v => [(v >> 11) * 255 / 31, (v >> 5 & 63) * 255 / 63, (v & 31) * 255 / 31];
    let Bd = null, nBuilt = 0, nSolar = 0, heaterGeo = null, cellMs = 0; const later = [];
    function setBuildings(b) {
      Bd = b; if (!b) return;
      for (let i = 0; i < b.k.length; i++) {
        let x = 0, z = 0; const s = b.s[i], e = b.s[i + 1];
        for (let j = s; j < e; j++) { x += b.v[2 * j]; z += b.v[2 * j + 1]; }
        const cx = Math.floor((x / (e - s) + half) / CELL), czz = Math.floor((z / (e - s) + half) / CELL), key = cx * 1000 + czz;
        let c = cells.get(key); if (!c) cells.set(key, c = { list: [], x: (cx + .5) * CELL - half, z: (czz + .5) * CELL - half, mesh: null, g: 0, top: 0 });
        c.list.push(i);
      }
    }
    const bound = c => { c.mesh.geometry.boundingSphere = new T.Sphere(new T.Vector3(c.x, yD(c.g), c.z), CELL * .75 + c.top + Math.abs(yD(c.g) - c.g)); };
    function box(xs, zs, k) { // the footprint's tightest box over its own edge directions: centre, long axis u, half length and width, how full
      let best = null, ar = 0;
      for (let j = 0; j < k; j++) {
        const j2 = (j + 1) % k, dx = xs[j2] - xs[j], dz = zs[j2] - zs[j], l = Math.hypot(dx, dz); ar += xs[j] * zs[j2] - xs[j2] * zs[j];
        if (l < .5) continue;
        const ux = dx / l, uz = dz / l; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
        for (let m = 0; m < k; m++) { const p = xs[m] * ux + zs[m] * uz, q = zs[m] * ux - xs[m] * uz; a0 = Math.min(a0, p); a1 = Math.max(a1, p); b0 = Math.min(b0, q); b1 = Math.max(b1, q); }
        const A = (a1 - a0) * (b1 - b0); if (!best || A < best.A) best = { A, ux, uz, a0, a1, b0, b1 };
      }
      if (!best) return null;
      let { ux, uz, a0, a1, b0, b1 } = best;
      if (b1 - b0 > a1 - a0) [ux, uz, a0, a1, b0, b1] = [-uz, ux, b0, b1, -a1, -a0]; // the long side along u (v: u turned a right angle)
      const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
      return { cx: ca * ux - cb * uz, cz: ca * uz + cb * ux, ux, uz, hl: (a1 - a0) / 2, hw: (b1 - b0) / 2, ar: Math.abs(ar) / 2, fill: Math.abs(ar) / 2 / best.A };
    }
    function heaters(xs, zs, k, want, y, out) { // a solar water heater's spots on a flat roof: a grid 2.6 × 2.4 m, 1.1 m in from the edges
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let j = 0; j < k; j++) { x0 = Math.min(x0, xs[j]); x1 = Math.max(x1, xs[j]); z0 = Math.min(z0, zs[j]); z1 = Math.max(z1, zs[j]); }
      const spots = [];
      for (let z = z0 + 1.2; z < z1 - 1.1; z += 2.4) for (let x = x0 + 1.3; x < x1 - 1.2; x += 2.6) {
        let inside = false, d = 1e9;
        for (let j = 0, m = k - 1; j < k; m = j++) {
          const ax = xs[m], az = zs[m], ex = xs[j] - ax, ez = zs[j] - az, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
          d = Math.min(d, Math.hypot(x - ax - t * ex, z - az - t * ez));
          if ((az > z) !== (zs[j] > z) && x < ex * (z - az) / ez + ax) inside = !inside;
        }
        if (inside && d > 1.1) spots.push(x, z);
      }
      const n = spots.length / 2, st = Math.max(1, n / want);
      for (let q = 0; q < Math.min(n, want); q++) { const p = Math.floor(q * st) * 2; out.push(spots[p], y, spots[p + 1], ((spots[p] * 7.3 + spots[p + 1] * 3.1) % 1) * .3 - .15); }
    }
    class Buf { // a typed array that grows as it is pushed to (a big cell's plain arrays took ~20 ms on a phone to turn into typed ones)
      constructor(A) { this.a = new A(4096); this.length = 0; }
      push(...v) { if (this.length + v.length > this.a.length) { const b = new this.a.constructor(this.a.length * 2); b.set(this.a); this.a = b; } for (const x of v) this.a[this.length++] = x; return this.length; }
      get view() { return this.a.slice(0, this.length); }
    }
    function buildCell(c, until) { // one geometry per cell: walls from 1.5 m under the ground, the roof (flat inside a parapet, pitched, a
      // dome); built across frames until the time is up (a dense km takes ~90 ms on a phone). true: the cell is done
      const b = Bd, j0 = c.job ||= { k: 0, P: new Buf(Float32Array), G: new Buf(Float32Array), C: new Buf(Uint8Array), I: new Buf(Uint32Array), sol: [], gs: 0 }, { P, G, C, I, sol } = j0, t0 = performance.now();
      const vert = (x, y, z, g, col, kind) => { P.push(x, y, z); G.push(g); C.push(col[0], col[1], col[2], kind * 17); return G.length - 1; };
      const tri = (p, q, r) => I.push(p, q, r);
      for (let n = 0; j0.k < c.list.length; j0.k++, n++) {
        if (n && !(n & 3) && performance.now() > until) { cellMs = Math.max(cellMs, performance.now() - t0); return false; }
        const i = c.list[j0.k], s = b.s[i], k = b.s[i + 1] - s, kind = b.k[i] & 15, works = kind >= 7, ht = b.h[i], pal = WALLS[kind] || WALLS[0];
        const wc = b.c[2 * i] ? c565(b.c[2 * i]) : rgb(pal[i % pal.length]).map(x => x * 255), xs = [], zs = [], gr = [];
        let roof = works ? 0 : b.k[i] >> 4 & 7, gmax = -1e9;
        for (let j = 0; j < k; j++) { xs.push(b.v[2 * (s + j)]); zs.push(b.v[2 * (s + j) + 1]); gr.push(yT(xs[j], zs[j])); gmax = Math.max(gmax, gr[j]); }
        const gTop = works ? Math.max(0, gmax) : gmax; j0.gs += gTop; c.top = Math.max(c.top, ht); // harbour works: their top above the sea
        const sh = roof || (kind < 2 && !works) ? box(xs, zs, k) : null;
        const pitched = (roof === 1 || roof === 2 || roof === 6 || roof === 7) && sh && sh.fill > .72 && k <= 16, dome = (roof === 5 || roof === 7) && sh;
        if (roof && !pitched && roof !== 3 && roof !== 4 && !dome) roof = 0; // a pitched roof over an odd footprint: flat
        const rc = b.c[2 * i + 1] ? c565(b.c[2 * i + 1]) : pitched || roof === 3 ? TERRA[i % 4] : wc;
        const rise = !sh ? 0 : pitched ? Math.min(ht * .45, sh.hw * (kind === 4 ? .58 : .5)) : roof === 3 ? Math.min(ht * .4, Math.min(sh.hw, sh.hl) * .5) : roof === 4 ? Math.min(ht * .3, sh.hw * .36) : 0;
        const eave = Math.max(Math.min(2.4, ht), ht - rise), parapet = !roof && !works && (kind < 3 || kind === 5) && ht >= 4 && k >= 4;
        const vOf = (x, z) => (z * sh.ux - x * sh.uz) - (sh.cz * sh.ux - sh.cx * sh.uz); // across the box, from its middle
        const top = xs.map((x, j) => roof === 4 ? eave + rise * (vOf(x, zs[j]) + sh.hw) / (2 * sh.hw) : pitched || roof === 3 ? eave : ht);
        const v0 = G.length;
        for (let j = 0; j < k; j++) { vert(xs[j], works ? -1 : -1.5, zs[j], gr[j], wc, kind); vert(xs[j], top[j], zs[j], gTop, wc, kind); }
        for (let j = 0; j < k; j++) { const lo = v0 + 2 * j, hi = lo + 1, lo2 = v0 + 2 * ((j + 1) % k), hi2 = lo2 + 1; tri(lo, lo2, hi2); tri(lo, hi2, hi); }
        const at = (a, v, y, col) => vert(sh.cx + a * sh.ux - v * sh.uz, y, sh.cz + a * sh.uz + v * sh.ux, gTop, col, kind); // a point in the box's frame
        let domeAt = eave;
        if (pitched) { // gabled (round: as gabled) or hipped, the eaves overhanging; the gables in the walls' colour
          const hip = roof === 2, dip = rise * OVER / sh.hw, ye = eave - dip, yr = eave + rise, L = sh.hl + (hip ? OVER : 0), W = sh.hw + OVER, rl = hip ? Math.max(0, sh.hl - sh.hw) : sh.hl;
          const a1 = at(-L, -W, ye, rc), a2 = at(L, -W, ye, rc), b2 = at(L, W, ye, rc), b1 = at(-L, W, ye, rc), r1 = at(-rl, 0, yr, rc), r2 = at(rl, 0, yr, rc);
          tri(a1, a2, r2); tri(a1, r2, r1); tri(b2, b1, r1); tri(b2, r1, r2);
          if (hip) { tri(b1, a1, r1); tri(a2, b2, r2); }
          else { tri(at(-L, -W, ye, wc), at(-L, 0, yr, wc), at(-L, W, ye, wc)); tri(at(L, W, ye, wc), at(L, 0, yr, wc), at(L, -W, ye, wc)); }
          domeAt = eave + rise * .55;
        } else if (roof === 3) { // pyramidal: up to a point over the middle
          const ap = vert(xs.reduce((p, x) => p + x, 0) / k, eave + rise, zs.reduce((p, z) => p + z, 0) / k, gTop, rc, kind), r0 = G.length;
          for (let j = 0; j < k; j++) vert(xs[j], eave, zs[j], gTop, rc, kind);
          for (let j = 0; j < k; j++) tri(ap, r0 + j, r0 + (j + 1) % k);
        } else { // flat (inside a parapet: its far sides show over it) or skillion: a fan, or a full triangulation
          const r0 = G.length, y = parapet ? ht - PARA : ht;
          for (let j = 0; j < k; j++) vert(xs[j], roof === 4 ? top[j] : y, zs[j], gTop, rc, kind);
          if (b.k[i] & 128) for (const [p, q, r] of T.ShapeUtils.triangulateShape(xs.map((x, j) => new T.Vector2(x, zs[j])), [])) tri(r0 + p, r0 + q, r0 + r);
          else for (let j = 1; j < k - 1; j++) tri(r0, r0 + j, r0 + j + 1);
          domeAt = y;
          if (!roof && kind < 2 && !works && ht >= 3 && ht < 40 && sh && sh.ar >= 30 && (kind || (i * 2654435761 >>> 0) % 100 >= 8)) { // most homes and flats (not towers): solar water heaters
            const fl = Math.max(1, Math.round(ht / 3.1)), want = kind ? Math.min(40, Math.max(2, Math.round(fl * sh.ar / 130))) : sh.ar < 180 ? 1 : sh.ar < 400 ? 2 : Math.min(5, Math.round(sh.ar / 200));
            heaters(xs, zs, k, want, gTop + y, sol);
          }
        }
        if (dome) { // a dome (a church's on a drum)
          const R = roof === 7 ? Math.min(sh.hw * .62, 6) : Math.min(sh.hw, sh.hl) * .95, y0 = roof === 7 ? domeAt + R * .6 : domeAt, dc = b.c[2 * i + 1] ? rc : TERRA[(i + 1) % 4], d0 = G.length, S = 10;
          for (let r = 0; r <= 4; r++) for (let q = 0; q < S; q++) { const ph = r / 4 * Math.PI / 2, th = q / S * 2 * Math.PI; vert(sh.cx + R * Math.cos(ph) * Math.cos(th), y0 + R * Math.sin(ph), sh.cz + R * Math.cos(ph) * Math.sin(th), gTop, dc, 14); }
          for (let r = 0; r < 4; r++) for (let q = 0; q < S; q++) { const p = d0 + r * S + q, p2 = d0 + r * S + (q + 1) % S; tri(p, p2, p2 + S); tri(p, p2 + S, p + S); }
          if (roof === 7) {
            const w0 = G.length;
            for (let q = 0; q < S; q++) { const th = q / S * 2 * Math.PI, x = sh.cx + R * Math.cos(th), z = sh.cz + R * Math.sin(th); vert(x, domeAt - .3, z, gTop, wc, 14); vert(x, y0, z, gTop, wc, 14); }
            for (let q = 0; q < S; q++) { const p = w0 + 2 * q, p2 = w0 + 2 * ((q + 1) % S); tri(p, p2, p2 + 1); tri(p, p2 + 1, p + 1); }
          }
          c.top = Math.max(c.top, y0 + R);
        }
      }
      const geo = new T.BufferGeometry(), nv = G.length, idx = nv > 65535 ? I.view : Uint16Array.from(I.view);
      geo.setAttribute('position', new T.BufferAttribute(P.view, 3)); geo.setAttribute('g', new T.BufferAttribute(G.view, 1)); geo.setAttribute('c', new T.BufferAttribute(C.view, 4, true)); geo.setIndex(new T.BufferAttribute(idx, 1));
      c.mesh = new T.Mesh(geo, bldMat); c.g = j0.gs / c.list.length; bound(c); c.bytes = nv * 20 + idx.byteLength;
      c.sol = sol.length ? Float32Array.from(sol) : null; c.job = null;
      scene.add(c.mesh); nBuilt += c.list.length; cellMs = Math.max(cellMs, performance.now() - t0);
      return true;
    }
    function heater() { // one solar water heater, facing south (+z): a dark panel tilted 40°, a white tank above its back (22 triangles)
      const P = [], C = [], quad = (p, q, r, t, col) => { for (const v of [p, q, r, p, r, t]) { P.push(...v); C.push(...col, 255); } };
      quad([-1, .35, .45], [1, .35, .45], [1, .99, -.32], [-1, .99, -.32], [38, 50, 70]);
      const ring = a => [1.2 + .27 * Math.sin(a), -.55 + .27 * Math.cos(a)], tank = [232, 232, 226];
      for (let q = 0; q < 6; q++) { const [y0, z0] = ring(q * Math.PI / 3), [y1, z1] = ring((q + 1) * Math.PI / 3); quad([-.85, y0, z0], [.85, y0, z0], [.85, y1, z1], [-.85, y1, z1], tank); }
      for (const x of [-.85, .85]) for (const q of [1, 3]) { const [y0, z0] = ring(0), [y1, z1] = ring(q * Math.PI / 3), [y2, z2] = ring((q + 1) * Math.PI / 3), [y3, z3] = ring((q + 2) * Math.PI / 3); quad([x, y0, z0], [x, y1, z1], [x, y2, z2], [x, y3, z3], tank); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('c', new T.BufferAttribute(Uint8Array.from(C), 4, true)); g.setAttribute('g', new T.Float32BufferAttribute(new Float32Array(P.length / 3), 1)); g.setAttribute('tree', g.attributes.g); // zeros: not a tree
      return g;
    }
    function buildSolar(c) {
      const n = c.sol.length / 4, m = new T.InstancedMesh(heaterGeo ||= heater(), bldMat, n);
      for (let q = 0; q < n; q++) { mtx.makeRotationY(c.sol[4 * q + 3]); mtx.setPosition(c.sol[4 * q], c.sol[4 * q + 1], c.sol[4 * q + 2]); m.setMatrixAt(q, mtx); }
      m.frustumCulled = false; c.solM = m; c.bytes += n * 64; nSolar += n; scene.add(m);
    }
    // the buildings' shadows on the ground near the camera, for the hour's sun: each footprint swept away from the sun (the hull of it and of
    // its copy moved by height / tan(the sun's altitude), at most 250 m), filled on the near window's grid, a few hundred buildings a frame
    let shJob = null;
    function shadows(w) { // a new near window: start again
      U.sOn.value = 0; shJob = null;
      if (!Qt.shadow || !LT.bake || !Bd || !w) return;
      const list = [], m = 260;
      for (const c of cells.values()) if (c.x + CELL / 2 > w.x0 - m && c.x - CELL / 2 < w.x0 + w.size + m && c.z + CELL / 2 > w.z0 - m && c.z - CELL / 2 < w.z0 + w.size + m) for (const i of c.list) list.push(i);
      shJob = { w, list, i: 0, a: new Uint8Array(Qt.shadow * Qt.shadow), dx: -LT.bake[0] / LT.bake[1], dz: -LT.bake[2] / LT.bake[1] }; // metres of shadow per metre of height
    }
    function stepShadows(until) {
      const j = shJob, G = Qt.shadow, k = G / j.w.size, b = Bd, hull = [];
      for (; j.i < j.list.length; j.i++) {
        if (!(j.i & 31) && performance.now() > until) return;
        const i = j.list[j.i], s0 = b.s[i], n = b.s[i + 1] - s0; if ((b.k[i] & 15) >= 7) continue;
        let dx = j.dx * b.h[i], dz = j.dz * b.h[i]; const l = Math.hypot(dx, dz); if (l > 250) { dx *= 250 / l; dz *= 250 / l; }
        const P = []; for (let q = s0; q < s0 + n; q++) { const x = (b.v[2 * q] - j.w.x0) * k, z = (b.v[2 * q + 1] - j.w.z0) * k; P.push([x, z], [x + dx * k, z + dz * k]); }
        P.sort((p, q) => p[0] - q[0] || p[1] - q[1]); hull.length = 0; // the convex hull (monotone chain)
        for (const pass of [P, P.slice().reverse()]) { const st = hull.length; for (const p of pass) { while (hull.length >= st + 2) { const o = hull[hull.length - 2], a2 = hull[hull.length - 1]; if ((a2[0] - o[0]) * (p[1] - o[1]) - (a2[1] - o[1]) * (p[0] - o[0]) <= 0) hull.pop(); else break; } hull.push(p); } hull.pop(); }
        let z0 = G, z1 = -1; for (const p of hull) { z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
        for (let r = Math.max(0, Math.floor(z0)); r <= Math.min(G - 1, Math.ceil(z1)); r++) { // filled by rows between its two crossings
          const zc = r + .5; let x0 = G, x1 = -1;
          for (let q = 0, m = hull.length - 1; q < hull.length; m = q++) { const [ax, az] = hull[m], [bx, bz] = hull[q]; if ((az > zc) !== (bz > zc)) { const x = ax + (zc - az) / (bz - az) * (bx - ax); x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
          for (let x = Math.max(0, Math.round(x0)); x < Math.min(G, Math.round(x1)); x++) j.a[r * G + x] = 255;
        }
      }
      U.shade.value?.dispose();
      const t = U.shade.value = new T.DataTexture(j.a, G, G, T.LuminanceFormat, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, T.LinearFilter, T.LinearFilter);
      t.needsUpdate = true; U.sOn.value = 1; shJob = null; wake();
    }
    function lod() { // which cells show; the wanted ones built nearest first, ~6 ms a frame; the sharp imagery fading in. true: more to do
      if (later.length && api?.firstAt) { later.shift()(); return true; } // work put off until the view is up, one piece a frame
      let fading = lodWorld(camera.position);
      if (shJob) { timed('shadows', () => stepShadows(performance.now() + (cz ? 4 : 6))); fading = true; }
      for (const lv of [LV.n, LV.d]) if (lv.fade) { const k = Math.min(1, (performance.now() - lv.fade) / 350); lv.on.value = k; if (k >= 1) lv.fade = 0; fading = true; }
      if (!Bd) return fading;
      const want = [], p = camera.position, far = Math.min(Qt.far, Math.max(2500, p.distanceTo(controls.target) * 1.7));
      for (const c of cells.values()) {
        const d = Math.hypot(p.x - c.x, p.z - c.z, p.y - yD(c.g)), on = d < far;
        if (c.mesh) c.mesh.visible = on; else if (on) want.push([d, c]);
        if (c.sol && real && d < SOLAR && !c.solM) timed('solar', () => buildSolar(c));
        if (c.solM) c.solM.visible = real && d < SOLAR;
      }
      if (!want.length) return fading;
      want.sort((a1, b1) => a1[0] - b1[0]);
      const until = performance.now() + (cz ? 5 : 6); let k = 0;
      while (k < want.length && buildCell(want[k][1], until) && performance.now() < until) k++;
      return true; // more to build, or the last one just made: draw it
    }

    // the world around the buildings ("Realistic" only): trees per 1 km cell within ~0.9 km (1.8 km on computers; at most 2500 a cell on phones), instanced per kind (the
    // single trees and tree rows as mapped; woods, forests, orchards and parks filled on a jittered grid, not on buildings or lit roads); at
    // night street lights along the lit roads and the lighthouses' beacons; the lighthouses' towers
    const TREE_R = Qt.treeR, TREE_MAX = Qt.treeMax, tcells = new Map(), world = new T.Group(); scene.add(world);
    const TREES = [ // kind: trunk radius, height, colour; crown: bottom, [height, radius] rings, top, colour
      [.18, 2, '#5a4632', 1.6, [[2.6, 2.4], [4, 2.2]], 5.4, '#3f5b2d'], // broadleaf
      [.2, 4, '#5b4834', 3.5, [[5, 2.6], [6.5, 2.2]], 7.6, '#2e4627'], // pine (Calabrian: a tall trunk, a flat-topped crown)
      [.22, 7.5, '#7a6a52', 0, [], 0, '#4f6e33'], // palm: the leaves below
      [.22, 1.2, '#4e4234', 1, [[1.8, 2.3], [2.7, 2]], 3.4, '#7a8661'], // olive: low, silver-green
      [.15, .8, '#4a3c2c', .5, [[2.5, .9], [5.5, .7]], 8.5, '#263b22'], // cypress
      [.12, .8, '#4e4234', .6, [[1.4, 1.5], [2.3, 1.3]], 3, '#2f4f22'], // citrus
    ];
    let Wd = null, treeGeo = [], nTrees = 0, nLamps = 0;
    const lampU = { pr: { value: pr }, real: U.real, night: U.night };
    U.treeR = { value: TREE_R };
    function treeShape(k) { // one tree, a few dozen triangles, plain colours
      const [tr, th, tc, cb, rings, ct, cc] = TREES[k], P = [], C = [], col = h => rgb(h).map(x => x * 255);
      const tri = (a, b, c, cl) => { for (const v of [a, b, c]) { P.push(...v); C.push(...cl, 255); } };
      const ring = (y, r, n, q) => [r * Math.cos(q / n * 2 * Math.PI), y, r * Math.sin(q / n * 2 * Math.PI)];
      for (let q = 0; q < 3; q++) { const a = ring(0, tr, 3, q), b = ring(0, tr, 3, q + 1), c = ring(th, tr * .7, 3, q + 1), d = ring(th, tr * .7, 3, q); tri(a, b, c, col(tc)); tri(a, c, d, col(tc)); }
      if (k === 2) for (let q = 0; q < 7; q++) { const a = q / 7 * 2 * Math.PI, e = [3 * Math.cos(a), th - 1.1, 3 * Math.sin(a)], s = [.35 * Math.cos(a + 1.6), 0, .35 * Math.sin(a + 1.6)];
        tri([0, th + .2, 0], [e[0] / 2 + s[0], th + .35, e[2] / 2 + s[2]], e, col(cc)); tri([0, th + .2, 0], e, [e[0] / 2 - s[0], th + .35, e[2] / 2 - s[2]], col(cc)); }
      else {
        const lv = [[cb, 0], ...rings, [ct, 0]], n = 5;
        for (let r = 0; r < lv.length - 1; r++) for (let q = 0; q < n; q++) {
          const tw = r * .5, a = ring(lv[r][0], lv[r][1], n, q + tw), b = ring(lv[r][0], lv[r][1], n, q + 1 + tw), c = ring(lv[r + 1][0], lv[r + 1][1], n, q + 1 + tw + .5), d = ring(lv[r + 1][0], lv[r + 1][1], n, q + tw + .5);
          const sh = col(cc).map(v => v * (.86 + .14 * (r / lv.length))); tri(a, b, c, sh); if (lv[r + 1][1]) tri(a, c, d, sh);
        }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('c', new T.BufferAttribute(Uint8Array.from(C), 4, true)); g.setAttribute('g', new T.Float32BufferAttribute(new Float32Array(P.length / 3), 1)); g.setAttribute('tree', new T.Float32BufferAttribute(new Float32Array(P.length / 3).fill(1), 1));
      return g;
    }
    function setWorld(w) {
      for (const o of [...world.children]) { world.remove(o); o.dispose?.(); if (o.userData.own) { o.geometry.dispose(); if (o.material !== bldMat) o.material.dispose(); } } // the tree kinds' shapes stay
      tcells.clear(); nTrees = nLamps = 0; Wd = w; if (!w) return;
      const nC = Math.ceil(span / CELL), cellAt = (cx, cz_) => { const k = cx * 1000 + cz_; let c = tcells.get(k); if (!c) tcells.set(k, c = { cx, cz: cz_, x: (cx + .5) * CELL - half, z: (cz_ + .5) * CELL - half, singles: [], areas: [], rows: [], roads: [], meshes: null }); return c; };
      for (let i = 0; i < w.tk.length; i++) { const cx = Math.floor((w.txy[2 * i] + half) / CELL), cz_ = Math.floor((w.txy[2 * i + 1] + half) / CELL); if (cx >= 0 && cz_ >= 0 && cx < nC && cz_ < nC) cellAt(cx, cz_).singles.push(i); }
      for (const [L, key] of [[w.areas, 'areas'], [w.rows, 'rows'], [w.roads, 'roads']]) for (let i = 0; i < L.k.length; i++) { // each line or area: the cells its bounds reach
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let j = L.s[i]; j < L.s[i + 1]; j++) { x0 = Math.min(x0, L.v[2 * j]); x1 = Math.max(x1, L.v[2 * j]); z0 = Math.min(z0, L.v[2 * j + 1]); z1 = Math.max(z1, L.v[2 * j + 1]); }
        for (let cx = Math.max(0, Math.floor((x0 + half) / CELL)); cx <= Math.min(nC - 1, Math.floor((x1 + half) / CELL)); cx++) for (let cz_ = Math.max(0, Math.floor((z0 + half) / CELL)); cz_ <= Math.min(nC - 1, Math.floor((z1 + half) / CELL)); cz_++) cellAt(cx, cz_)[key].push(i);
      }
    }
    function blocked(c) { // the cell's buildings, the woods' clearings and the lit roads on a 4 m grid (filled in plain arrays: a canvas took
      // ~20 ms on a phone): no tree there
      const G = 250, k = G / CELL, a = new Uint8Array(G * G), X = x => (x - c.x + CELL / 2) * k, Z = z => (z - c.z + CELL / 2) * k;
      const fill = (v, s0, e) => { // a polygon, by rows between its crossings
        let z0 = G, z1 = 0; for (let j = s0; j < e; j++) { const z = Z(v[2 * j + 1]); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
        for (let r = Math.max(0, Math.floor(z0)); r <= Math.min(G - 1, Math.ceil(z1)); r++) {
          const zc = r + .5, xs = [];
          for (let j = s0, m = e - 1; j < e; m = j++) { const za = Z(v[2 * m + 1]), zb = Z(v[2 * j + 1]); if ((za > zc) !== (zb > zc)) xs.push(X(v[2 * m]) + (zc - za) / (zb - za) * (X(v[2 * j]) - X(v[2 * m]))); }
          xs.sort((p, q) => p - q);
          for (let q = 0; q + 1 < xs.length; q += 2) for (let x = Math.max(0, Math.round(xs[q])); x < Math.min(G, Math.round(xs[q + 1])); x++) a[r * G + x] = 1;
        }
      };
      const bc = cells.get(c.cx * 1000 + c.cz), list = Bd && bc ? bc.list : [];
      return { a, im: null, i: 0, done: false, at: (x, z) => { const px = Math.floor(X(x)), pz = Math.floor(Z(z)); return px < 0 || pz < 0 || px >= G || pz >= G ? -1 : pz * G + px; },
        step(until) { // the buildings until the time is up, then the woods' clearings and the roads (~7 m wide)
          for (; this.i < list.length; this.i++) { if (!(this.i & 63) && performance.now() > until) return; const i = list[this.i]; fill(Bd.v, Bd.s[i], Bd.s[i + 1]); }
          const A_ = Wd.areas; for (const i of c.areas) if (A_.k[i] >> 3 === 3) fill(A_.v, A_.s[i], A_.s[i + 1]);
          const R_ = Wd.roads; for (const i of c.roads) for (let j = R_.s[i]; j < R_.s[i + 1] - 1; j++) {
            const ax = X(R_.v[2 * j]), az = Z(R_.v[2 * j + 1]), dx = X(R_.v[2 * j + 2]) - ax, dz = Z(R_.v[2 * j + 3]) - az, n = Math.ceil(Math.hypot(dx, dz) * 2);
            for (let t = 0; t <= n; t++) { const px = Math.round(ax + dx * t / n), pz = Math.round(az + dz * t / n); for (let q = -1; q <= 1; q++) for (let p = -1; p <= 1; p++) if (px + p >= 0 && pz + q >= 0 && px + p < G && pz + q < G) a[(pz + q) * G + px + p] = 1; }
          }
          this.done = true;
        } };
    }
    function greenOf(c, b) { // the imagery under the cell, the sharpest there is (as the shaders take it), read back small: a wild tree only where it is green
      if (!V.img) return;
      const G = 250, cv = canvas(G), g = cv.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = true;
      g.drawImage(tcv, (c.x - CELL / 2 + half) / span * TS, (c.z - CELL / 2 + half) / span * TS, CELL / span * TS, CELL / span * TS, 0, 0, G, G);
      for (const lv of [LV.d, LV.n]) if (lv.w && lv.on.value > 0) { const w = lv.w, s_ = lv.T / w.size; g.drawImage(lv.cv, (c.x - CELL / 2 - w.x0) * s_, (c.z - CELL / 2 - w.z0) * s_, CELL * s_, CELL * s_, 0, 0, G, G); }
      b.im = g.getImageData(0, 0, G, G).data; cv.width = 0;
    }
    function buildTrees(c, until) { // across frames until the time is up (a forest's km took ~30 ms on a phone): its stages kept on c.tj. true: done
      if (!c.singles.length && !c.areas.length && !c.rows.length) { c.meshes = []; return true; } // only roads here
      const w = Wd, x0 = c.x - CELL / 2, z0 = c.z - CELL / 2, j = c.tj ||= { pts: TREES.map(() => []), busy: null, green: false, a: 0, iz: null };
      const hash = (p, q) => { const v = Math.sin(p * 127.1 + q * 311.7) * 43758.5453; return v - Math.floor(v); };
      const put = (k, x, z, mapped) => { if (x < x0 || z < z0 || x >= x0 + CELL || z >= z0 + CELL || j.busy.a[j.busy.at(x, z)] !== 0 || !mapped && !green(j.busy.at(x, z))) return; const y = yT(x, z); if (y > .3) j.pts[k].push(x, y - .2, z, hash(x, z) + mapped); };
      if (!j.busy?.done) { timed('trees:blocked', () => (j.busy ||= blocked(c)).step(until)); return false; } // each in frames of its own
      if (!j.green) { j.green = true; timed('trees:green', () => greenOf(c, j.busy)); return false; }
      const im = j.busy.im, green = o => !im || (im[4 * o] + im[4 * o + 1] + im[4 * o + 2] < 380 && im[4 * o + 1] > im[4 * o] * 1.02 && im[4 * o + 1] > im[4 * o + 2] * 1.08); // as the trees' shader: dark and green, not soil
      if (j.a === 0 && j.iz === null) {
        for (const i of c.singles) { const x = w.txy[2 * i], z = w.txy[2 * i + 1]; j.pts[w.tk[i]].push(x, yT(x, z) - .2, z, hash(x, z) + 1); } // as mapped: even on a pavement
        for (const i of c.rows) { const L = w.rows; for (let q0 = L.s[i]; q0 < L.s[i + 1] - 1; q0++) { const ax = L.v[2 * q0], az = L.v[2 * q0 + 1], bx = L.v[2 * q0 + 2], bz = L.v[2 * q0 + 3], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 7)); for (let q = 0; q < n; q++) put(L.k[i] & 7, ax + (bx - ax) * q / n, az + (bz - az) * q / n, 1); } }
      }
      for (; j.a < c.areas.length; j.a++, j.iz = null) { // a jittered grid on world coordinates (cells meet seamlessly), rows filled between the outline's crossings
        const i = c.areas[j.a], L = w.areas, kind = L.k[i] & 7, dens = L.k[i] >> 3, sp = [7, 6.5, 15][dens], jit = dens === 1 ? .08 : .4, s0 = L.s[i], e = L.s[i + 1];
        if (dens === 3) continue; // a clearing: blocked()
        for (j.iz ??= Math.floor(z0 / sp); j.iz * sp < z0 + CELL; j.iz++) {
          if (performance.now() > until) return false;
          const iz = j.iz, z = (iz + .5) * sp, xs = [];
          for (let q0 = s0, m = e - 1; q0 < e; m = q0++) { const az = L.v[2 * m + 1], bz = L.v[2 * q0 + 1]; if ((az > z) !== (bz > z)) xs.push(L.v[2 * m] + (z - az) / (bz - az) * (L.v[2 * q0] - L.v[2 * m])); }
          xs.sort((p, q) => p - q);
          for (let q = 0; q + 1 < xs.length; q += 2) for (let ix = Math.ceil(Math.max(xs[q], x0) / sp - .5); (ix + .5) * sp < Math.min(xs[q + 1], x0 + CELL); ix++)
            put(kind, (ix + .5 + (hash(ix, iz) - .5) * 2 * jit) * sp, z + (hash(iz, ix) - .5) * 2 * jit * sp, 0);
        }
      }
      const total = j.pts.reduce((n, p) => n + p.length / 4, 0), keep = Math.min(1, TREE_MAX / Math.max(1, total)); // too many: thinned evenly
      c.meshes = []; c.tj = null;
      j.pts.forEach((p, k) => {
        const n = Math.floor(p.length / 4 * keep); if (!n) return;
        const m = new T.InstancedMesh(treeGeo[k] ||= treeShape(k), bldMat, n), st = p.length / 4 / n, sc = new T.Vector3(), q4 = new T.Quaternion(), up = new T.Vector3(0, 1, 0), at = new T.Vector3();
        for (let q = 0; q < n; q++) { const o = Math.floor(q * st) * 4, h = p[o + 3] % 1, s_ = .6 + .8 * h * h; sc.set(p[o + 3] >= 1 ? -s_ : s_, s_ * (.85 + .3 * ((h * 7.31) % 1)), s_); /* mirrored: mapped */ q4.setFromAxisAngle(up, h * 6.283); mtx.compose(at.set(p[o], p[o + 1], p[o + 2]), q4, sc); m.setMatrixAt(q, mtx); }
        m.frustumCulled = false; c.meshes.push(m); world.add(m); nTrees += n; c.bytes = (c.bytes || 0) + n * 64;
      });
      return true;
    }
    function lodWorld(p) { // the trees near the camera, the nearest cell a little each frame. true: more to build
      world.visible = real; if (!Wd) return false;
      let near = null, nd = TREE_R;
      for (const c of tcells.values()) {
        const d = Math.hypot(p.x - c.x, p.z - c.z), on = real && d < TREE_R + CELL * .7;
        if (c.meshes) for (const m of c.meshes) m.visible = on; else if (on && d < nd) { nd = d; near = c; }
      }
      lampU.pr.value = pr;
      if (near) timed('trees', () => buildTrees(near, performance.now() + (cz ? 4 : 6)));
      return !!near;
    }
    function setLamps() { // at night: a lamp every ~30 m along the lit roads (on alternate sides), the lighthouses' beacons, the towers by day too
      for (const o of [...world.children]) if (o.userData.lamps) { world.remove(o); o.geometry.dispose(); if (o.material !== bldMat) o.material.dispose(); } // again for another hour
      const w = Wd, P = [], S_ = [];
      if (LT.night > .15) for (let i = 0; i < w.roads.k.length; i++) {
        const c = w.roads.k[i], step = c ? 32 : 28, off = c ? 5 : 9; let carry = step / 2, side = 1;
        for (let j = w.roads.s[i]; j < w.roads.s[i + 1] - 1; j++) {
          const ax = w.roads.v[2 * j], az = w.roads.v[2 * j + 1], dx = w.roads.v[2 * j + 2] - ax, dz = w.roads.v[2 * j + 3] - az, l = Math.hypot(dx, dz);
          for (; carry < l; carry += step, side = -side) { const x = ax + dx * carry / l - dz / l * off * side, z = az + dz * carry / l + dx / l * off * side; P.push(x, yT(x, z) + 7, z); S_.push(c === 2 ? .7 : 1); }
          carry -= l;
        }
      }
      const tw = [], tc = [];
      for (let i = 0; i < w.lights.length; i += 3) {
        const x = w.lights[i], z = w.lights[i + 1], h = w.lights[i + 2], g0 = yT(x, z), n = 8;
        for (let q = 0; q < n; q++) for (const [y0, y1, r0, r1, cl] of [[-1, h * .9, 2.4, 1.7, [236, 234, 228]], [h * .9, h, 1.9, 1.9, [60, 64, 70]], [h, h + 1.6, 1.4, .2, [190, 64, 52]]]) {
          const a0 = q / n * 2 * Math.PI, a1 = (q + 1) / n * 2 * Math.PI, v = (r, a, y) => [x + r * Math.cos(a), g0 + y, z + r * Math.sin(a)];
          for (const p of [v(r0, a0, y0), v(r0, a1, y0), v(r1, a1, y1), v(r0, a0, y0), v(r1, a1, y1), v(r1, a0, y1)]) { tw.push(...p); tc.push(...cl, 14 * 17); }
        }
        if (LT.night > .15) { P.push(x, g0 + h * .95, z); S_.push(4); }
      }
      if (tw.length) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(tw, 3)); g.setAttribute('c', new T.BufferAttribute(Uint8Array.from(tc), 4, true)); g.setAttribute('g', new T.Float32BufferAttribute(new Float32Array(tw.length / 3), 1)); const m = new T.Mesh(g, bldMat); m.userData.own = m.userData.lamps = true; world.add(m); }
      nLamps = 0; if (!P.length) return;
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('size', new T.Float32BufferAttribute(S_, 1));
      const lamps = new T.Points(g, new T.ShaderMaterial({ uniforms: lampU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        vertexShader: `attribute float size; uniform float pr; varying float vS, vF; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vS = size; vF = clamp(2500.0 / -mv.z, 0.3, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(size * 3000.0 / -mv.z, 2.0, 4.0 + size * 5.0) * pr; }`, // far ones dimmer: a carpet, not a glare
        fragmentShader: `uniform float real, night; varying float vS, vF; void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = dot(q, q); if (r > 1.0) discard;
          gl_FragColor = vec4(mix(vec3(1.0, 0.72, 0.4), vec3(1.0, 0.96, 0.85), step(2.0, vS)) * (exp(-r * 4.0) + 0.35 * exp(-r * 1.2)) * smoothstep(0.3, 0.8, night) * vF * real, 1.0); }` })); // on from dusk
      lamps.frustumCulled = false; lamps.renderOrder = 5; lamps.userData.own = lamps.userData.lamps = true; world.add(lamps); nLamps = P.length / 3;
    }

    function setGlow() { // at night: the light of the streets: the lit roads and, dimmer, the buildings, summed on a small grid and blurred (black by day)
      U.glow.value?.dispose();
      const G = LT.night > .2 && Bd ? Qt.glow : 1, a = new Float32Array(G * G), k = G / span, out = new Uint8Array(G * G);
      if (G > 1) { // typed arrays, no canvas: drawing 80 000 outlines and the roads as paths took ~100 ms on a phone
        const add = (x, z, v) => { const px = (x + half) * k | 0, pz = (z + half) * k | 0; if (px >= 0 && pz >= 0 && px < G && pz < G) a[pz * G + px] += v; };
        for (let i = 0; i < Bd.k.length; i++) if ((Bd.k[i] & 15) < 7) add(Bd.v[2 * Bd.s[i]], Bd.v[2 * Bd.s[i] + 1], Wd ? .12 : .3);
        const R_ = Wd?.roads; if (R_) for (let i = 0; i < R_.k.length; i++) for (let q = R_.s[i]; q < R_.s[i + 1] - 1; q++) {
          const ax = R_.v[2 * q], az = R_.v[2 * q + 1], dx = R_.v[2 * q + 2] - ax, dz = R_.v[2 * q + 3] - az, n = Math.ceil(Math.hypot(dx, dz) * k * 2);
          for (let t = 0; t < n; t++) add(ax + dx * t / n, az + dz * t / n, .5 / (k * 2) / 60); // ~1 a pixel along 60 m of street
        }
        const b = new Float32Array(G * G);
        for (let pass = 0; pass < 2; pass++) { // a box blur, across then down
          const [src, dst, st, ln] = pass ? [b, a, G, 1] : [a, b, 1, G];
          for (let l = 0; l < G; l++) for (let q = 0; q < G; q++) { const o = l * ln + q * st; let sum = 0, nn = 0; for (let d = -2; d <= 2; d++) { const qq = q + d; if (qq >= 0 && qq < G) { sum += src[l * ln + qq * st]; nn++; } } dst[o] = sum / nn; }
        }
        for (let q = 0; q < G * G; q++) out[q] = Math.min(255, a[q] * 255);
      }
      const t = new T.DataTexture(out, G, G, T.LuminanceFormat, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, T.LinearFilter, T.LinearFilter); t.needsUpdate = true; U.glow.value = t;
    }
    function setSurface(R2) { // the mesh and its slopes / depth / light texture; again when the pack replaces the coarse surface
      Hn = R2.n; HH = R2.H; R = R2; V.hi = !!R2.head;
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(R2.pos, 3)); geo.setIndex(new T.BufferAttribute(R2.idx, 1));
      terrain.geometry.dispose(); terrain.geometry = geo;
      if (R2.coast) { U.coast.value?.dispose(); const C = Math.sqrt(R2.coast.length), ct = U.coast.value = new T.DataTexture(R2.coast, C, C, T.LuminanceFormat, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, T.LinearFilter, T.LinearFilter); ct.needsUpdate = true; }
      U.aux.value?.dispose();
      const at = new T.DataTexture(R2.aux, Hn, Hn, T.RGBAFormat, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, T.LinearFilter, gl.isWebGL2 ? T.LinearMipmapLinearFilter : T.LinearFilter);
      at.generateMipmaps = gl.isWebGL2; at.needsUpdate = true; U.aux.value = at; U.auxK.value.set((Hn - 1) / Hn, .5 / Hn); // the grid points on the texel centres
      sea?.setSurface(R2); sky?.setSurface(R2);
      for (const c of cells.values()) { if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); } if (c.solM) { scene.remove(c.solM); c.solM.dispose?.(); } }
      cells.clear(); nBuilt = nSolar = 0; timed("setBuildings", () => setBuildings(R2.b)); timed("setWorld", () => setWorld(R2.w || null));
      later.push(() => Wd && timed("setLamps", setLamps), () => timed("setGlow", setGlow)); // the night's lights: after the first frame, one a frame
      if (R2.head && B.landH !== HH) timed("paintLand", () => paintLand(B, Hn, HH)); // not twice for the same heights
      timed("applyEx", applyEx);
      if (api) { api.tris = R2.tris; api.M = Hn; api.hi = V.hi; api.work = R2.ms; V.credit(); }
    }
    function setMode(r) {
      const lum = r ? Math.min(1, LT.amb[1] * 1.6 + LT.sunCol[1] * .6) : 1; wallMat.color.setScalar(lum); colMat.color.setScalar(lum); // the block's sides in the hour's light
      real = r; U.real.value = r ? 1 : 0; U.sun.value.copy(r ? V3(LT.sun) : FIX); water.visible = r; surf.visible = !r;
      host.style.background = r ? `linear-gradient(180deg, ${css(LT.zen)} 0%, ${css(LT.hor)} 62%, ${css(LT.hor)} 100%)` : ''; // the sky of the hour
      host.classList.toggle('is-real', r); host.classList.toggle('no-heat', r);
      applyEx();
    }

    // camera and touch controls (as js/dive3d.js); close enough for the buildings
    const controls = new T.OrbitControls(camera, canvasEl);
    Object.assign(controls, { enableDamping: true, dampingFactor: .09, rotateSpeed: cz ? .7 : .8, zoomSpeed: .9, panSpeed: .8, screenSpacePanning: false,
      maxPolarAngle: Math.PI * .47, minDistance: 250 });
    controls.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_PAN };
    const sph = new T.Spherical(), fov = camera.fov * Math.PI / 180;
    const radius = () => { const hf = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect), rs = .5 * Math.hypot(span, span, maxY - base); return (camera.aspect < 1 ? .8 : .9) * rs / Math.sin(Math.min(fov, hf) / 2); }; // the block about fits (a tall phone: its corners may go off the sides)
    let fly = null, w0 = 0, h0 = 0, raf = 0, touched = false, lastMove = 0, checked = true, lastDraw = 0, idleT = 0;
    const setView = (r, phi, theta, tg) => { controls.target.copy(tg); camera.position.setFromSpherical(sph.set(r, phi, theta)).add(tg); camera.lookAt(tg); };
    function flyTo(r, phi, theta, tg, ms) {
      sph.setFromVector3(tmp.copy(camera.position).sub(controls.target));
      const d = ((theta - sph.theta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; // the short way round
      fly = { a: [sph.radius, sph.phi, sph.theta], b: [r, phi, sph.theta + d], ta: controls.target.clone(), tb: tg.clone(), t0: performance.now(), ms };
      wake();
    }
    const clampTarget = () => { const tg = controls.target; tg.x = Math.max(-half, Math.min(half, tg.x)); tg.z = Math.max(-half, Math.min(half, tg.z)); tg.y = Math.max(minY, Math.min(maxY, tg.y)); };
    controls.addEventListener('start', () => { fly = null; if (!touched) { touched = true; host.classList.add('is-touched'); } wake(); });
    controls.addEventListener('change', () => { clampTarget(); lastMove = performance.now(); checked = false; wake(); }); // also a jump from outside the controls
    function fit() { // also checked every frame: ResizeObserver can lag behind on some WebViews
      const w = host.clientWidth, hh = host.clientHeight;
      if (!w || !hh || (w === w0 && hh === h0)) return;
      w0 = w; h0 = hh; renderer.setSize(w, hh, false); camera.aspect = w / hh; fit.done = true;
      const pan = host.querySelector('.a3-panel'), lift_ = pan.offsetWidth > w * .6 ? (pan.offsetHeight - host.querySelector('.a3-top').offsetHeight) / 2 : 0;
      if (lift_ > 0) camera.setViewOffset(w, hh, 0, lift_, w, hh); else camera.clearViewOffset(); // phones: the block in the room the panel leaves
      controls.maxDistance = radius() * 1.8;
      if (touched) return;
      if (fly) fly.b[0] = radius();
      else if (controls.target.lengthSq()) { sph.setFromVector3(tmp.copy(camera.position).sub(controls.target)); setView(radius(), sph.phi, sph.theta, controls.target); }
    }
    // the sharp imagery windows, redrawn once the camera stops if it moved on or zoomed: "near", the ground between the camera and the point
    // it looks at (the foreground is nearer than that point), ~1.25× the camera's distance across, at zoom 16–19 (19 where Esri has it);
    // "detail", 4× that around the point looked at, zoom 14–17. Each fades in over 0.35 s.
    const LV = { n: { cv: ncv, tex: ntex, T: TN, win: U.nWin, on: U.nOn, zmax: Qt.z, gen: 0, w: null, fade: 0 }, d: { cv: dcv, tex: dtex, T: TD, win: U.dWin, on: U.dOn, zmax: 17, gen: 0, w: null, fade: 0 } };
    const zoomFor = (T_, size) => Math.round(Math.log2(40075016 * Math.cos(B.a.lat * Math.PI / 180) * T_ / (256 * size))); // a tile pixel about a texel
    function checkDetail() {
      const d = camera.position.distanceTo(controls.target), tg = controls.target, cp = camera.position, ns = Math.min(2500, Math.max(450, d * 1.25)), ds = Math.max(2400, ns * 4);
      const want = (lv, cx, cz_, size, on) => {
        if (!on) { if (lv.on.value) { lv.on.value = 0; lv.w = null; lv.gen++; if (lv === LV.n) shadows(null); wake(); } return null; }
        const w = lv.w, x0 = Math.max(-half, Math.min(half - size, cx - size / 2)), z0 = Math.max(-half, Math.min(half - size, cz_ - size / 2));
        if (w && Math.abs(w.x0 + w.size / 2 - x0 - size / 2) < w.size * .2 && Math.abs(w.z0 + w.size / 2 - z0 - size / 2) < w.size * .2 && size / w.size > .65 && size / w.size < 1.5) return null;
        return () => refreshDetail(lv, x0, z0, size);
      };
      const n = want(LV.n, tg.x + (cp.x - tg.x) * .3, tg.z + (cp.z - tg.z) * .3, ns, d < 6000), dd = want(LV.d, tg.x, tg.z, ds, ds < span * .5);
      (async () => { await n?.(); await dd?.(); })(); // the near one first: it is what the eye is on
    }
    async function refreshDetail(lv, x0, z0, size) {
      if (!IMG) return; // no online imagery set: the block keeps the app's own
      const gen = ++lv.gen, g0 = V.gen, alive = () => S?.view?.V === V && V.gen === g0 && lv.gen === gen, TT = lv.T;
      const Wn = { lo0: B.lo0 + (x0 + half) / span * dlo, lo1: B.lo0 + (x0 + size + half) / span * dlo, la1: B.la1 - (z0 + half) / span * dla, la0: B.la1 - (z0 + size + half) / span * dla };
      let z = Math.max(14, Math.min(lv.zmax, zoomFor(TT, size)));
      if (z === 19 && !(await has19(Wn))) z = 18; // zoom 19 covers towns only
      const img = canvas(TT); let got = 0;
      try { got = await tiles(img.getContext('2d'), Wn, TT, z, esriUrl, await tileStore(), alive); } catch (e) { console.warn('Psarema area 3D imagery:', e); }
      if (alive() && got) {
        const g = lv.cv.getContext('2d'); timed('compose', () => { g.clearRect(0, 0, TT, TT); compose(g, TT, B, Wn, img, true); }); lv.tex.needsUpdate = true; V.upl = lv === LV.n ? 'near' : 'detail';
        lv.win.value.set((x0 + half) / span, (z0 + half) / span, span / size, span / size); lv.on.value = 0; lv.fade = performance.now();
        lv.w = { x0, z0, size, z }; if (lv === LV.n) { api.near = lv.w; shadows(lv.w); } else api.detail = lv.w; wake();
      }
      img.width = 0;
    }
    async function has19(Wn) { // Esri's tile map: is most of the window there at zoom 19? (a missing tile comes back as a grey "no data" picture)
      const n = 2 ** 19, x0 = Math.floor((Wn.lo0 + 180) / 360 * n), x1 = Math.floor((Wn.lo1 + 180) / 360 * n), Yt = la => Math.floor((1 - Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360)) / Math.PI) / 2 * n);
      const y0 = Yt(Wn.la1), y1 = Yt(Wn.la0);
      if (!IMG.includes('/MapServer/tile/{z}/{y}/{x}')) return false;
      const j = await fetch(IMG.replace('/tile/{z}/{y}/{x}', `/tilemap/19/${y0}/${x0}/${x1 - x0 + 1}/${y1 - y0 + 1}`)).then(r => r.ok ? r.json() : null).catch(() => null);
      return !!j?.data?.length && j.data.reduce((s, v) => s + v, 0) > j.data.length * .7;
    }
    const rose = host.querySelector('.a3-rose'), corners = [[-half, -half], [half, -half], [half, half], [-half, half]];
    function draw() {
      let bc = corners[0], bd = Infinity;
      for (const c of corners) { const d = (camera.position.x - c[0]) ** 2 + (camera.position.z - c[1]) ** 2; if (d < bd) { bd = d; bc = c; } }
      ruler.position.set(bc[0], 0, bc[1]); ruler.rotation.y = bc[0] > 0 ? 0 : Math.PI;
      marks.forEach((d, q) => rulerLabs[q].v.set(bc[0] + Math.sign(bc[0]) * tick * 1.6, -d * exS(), bc[1]));
      const cd = camera.position.distanceTo(controls.target); // near and far planes that follow the camera: depth precision at the water's edge
      camera.near = Math.max(2, cd * .01); camera.far = cd * 3 + span * 3; camera.updateProjectionMatrix(); U.hazeD.value = cd;
      timed(V.upl ? 'render+' + V.upl : 'render', () => renderer.render(scene, camera)); V.upl = ''; // with any texture uploads
      for (const L_ of labels) {
        tmp.copy(L_.v).project(camera);
        L_.off = tmp.z > 1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1; L_.x = (tmp.x + 1) / 2 * w0; L_.y = (1 - tmp.y) / 2 * h0;
        if (!L_.off) L_.el.style.transform = `translate(${L_.x.toFixed(1)}px,${L_.y.toFixed(1)}px)`;
      }
      const taken = []; // north, the spots' tags, then place names, best first (the order they were added): one that would overlap a shown one waits for a closer view
      for (const L_ of labels) {
        let off = L_.off;
        if (!off) { // the depth ruler's marks last
          L_.w ||= L_.el.firstChild.offsetWidth || 60;
          const bx = L_.kind === 'north' ? [L_.x - 10, L_.x + 10, L_.y - 10, L_.y + 10] : L_.kind === 'tick' ? [L_.x, L_.x + L_.w, L_.y - 6.5, L_.y + 6.5] : [L_.x - L_.w / 2 - 3, L_.x + L_.w / 2 + 3, L_.y - (L_.kind === 'pin' ? 32 : 17), L_.y + 1]; // tags and names sit centred over their point
          off = taken.some(t => bx[0] < t[1] && bx[1] > t[0] && bx[2] < t[3] && bx[3] > t[2]);
          if (!off) taken.push(bx);
        }
        if (L_.vis !== !off) { L_.vis = !off; L_.el.style.visibility = off ? 'hidden' : ''; }
      }
      rose.style.transform = `rotate(${Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z)}rad)`; // north on screen
      api.frames++;
    }
    const prev = new T.Vector3(), tg = new T.Vector3(), eps2 = (span * 2e-5) ** 2;
    function frame(now) {
      raf = -1; // a frame is running: wake() from inside it must not start a second loop
      if (api.paused) { raf = 0; return; } // round 13 street: no frames under its full-screen photo viewer (js/area3d-street.js); wake() resumes
      fit();
      let busy = false;
      if (fly) {
        const k = Math.min(1, (now - fly.t0) / fly.ms), e = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2, [a, b] = [fly.a, fly.b];
        setView(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e, tg.copy(fly.ta).lerp(fly.tb, e));
        busy = k < 1; if (!busy) fly = null;
      } else { prev.copy(camera.position); controls.update(); busy = prev.distanceToSquared(camera.position) > eps2; }
      if (busy) { lastMove = now; checked = false; }
      if (lod()) busy = true;
      const waves = real && !document.hidden && (!sea || sea.moving);
      if (!busy && waves && cz && now - lastDraw < 30) { raf = requestAnimationFrame(frame); return; } // only the water moves: ~30 fps on phones
      if ((busy || waves) && lastDraw && now - lastDraw < 400 && gaps.push(now - lastDraw) >= 30) { // frames slower than ~22 fps: fewer pixels
        const m = gaps.sort((p, q) => p - q)[15]; gaps.length = 0;
        if (m > 45 && pr > .75) { pr = Math.max(.75, pr - .25); renderer.setPixelRatio(pr); w0 = 0; api.pr = pr; }
      }
      U.time.value = now / 1000; lastDraw = now;
      draw();
      if (!api.firstAt) api.firstAt = performance.now();
      if (!checked && !busy && now - lastMove > 300) { checked = true; checkDetail(); }
      clearTimeout(idleT);
      if (!busy && !waves && !checked) idleT = setTimeout(() => { if (!checked && S?.view === api) { checked = true; checkDetail(); } }, 320);
      raf = (busy || waves) && !document.hidden ? requestAnimationFrame(frame) : 0;
    }
    function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
    V.wake = wake;
    V.recompose = img => { compose(tcv.getContext('2d'), TS, B, whole, img); tex.needsUpdate = true; V.upl = 'base'; wake(); };
    const ro = new ResizeObserver(() => wake()); ro.observe(host);
    const onVis = () => { if (!document.hidden) wake(); };
    document.addEventListener('visibilitychange', onVis);
    const onLost = e => e.preventDefault(), onRestored = () => wake();
    canvasEl.addEventListener('webglcontextlost', onLost); canvasEl.addEventListener('webglcontextrestored', onRestored);

    V.credit = () => {
      const el = host.querySelector('.a3-cred'); if (!el) return;
      el.textContent = tr('a3_cred2', V.img === 'esri' ? window.PSAREMA_IMAGERY.credit + (window.PSAREMA_IMAGERY.powered ? ' (Powered by Esri)' : '') : V.img === 'eox' ? 'Copernicus Sentinel-2' : tr('a3_noImg'), V.hi, !!Bd?.k.length);
      el.title = V.hi ? 'Copernicus DEM GLO-30: © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. Seabed: EMODnet Bathymetry DTM (CC BY 4.0). Buildings, piers, breakwaters, trees, roads and lighthouses: © OpenStreetMap contributors (ODbL 1.0); buildings and floors: Cyprus Department of Lands and Surveys open data, curated by SURF Lab, University of Cyprus (CC BY 4.0); Microsoft Global ML Building Footprints (ODbL 1.0); heights in part from 3D-GloBFP (Che et al. 2024, CC BY 4.0).' : '';
    };
    timed('composeBase', () => compose(tcv.getContext('2d'), TS, B, whole, null));
    timed('setSurface', () => setSurface(R));
    timed('setMode', () => setMode(real));
    later.unshift(() => timed('warm', () => { const w = new T.Scene(); w.add(new T.InstancedMesh(heaterGeo ||= heater(), bldMat, 1)); renderer.compile(w, camera); })); // the heaters' and trees' program as the view flies in, not when the first one comes into view (~70 ms)
    host.querySelector('.a3-stage').appendChild(canvasEl);
    fit();
    // open: from straight above (the map) down to a view from the sea onto the coast
    const R0 = radius(), PHI = .95, TH = R.theta, home = new T.Vector3(0, base * .15, 0);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setView(R0, PHI, TH, home); wake(); }
    else { setView(R0 * 1.6, .02, TH, home); flyTo(R0, PHI, TH, home, 1600); }

    api = {
      ms: performance.now() - t0, firstAt: 0, frames: 0, sea, sky, ex, span, theta: R.theta, work: R.ms, best: Hd.best, tops, tier: tier(), TS, TD, TN, maxTex, pr, M: Hn, tris: R.tris, hi: V.hi, renderer, scene, camera, controls, V, detail: null, near: null,
      get mode() { return real ? 'real' : 'heat'; }, get buildings() { return Bd ? Bd.k.length : 0; }, get built() { return nBuilt; }, get solar() { return nSolar; }, get cellMs() { return Math.round(cellMs); }, prof, slow, get trees() { return nTrees; }, get lamps() { return nLamps; }, ground: (x, z) => yT(x, z), // true metres (scripts/area3d/shots.mjs aims its near views with it)
      gpuMB() { // an estimate of what the view holds on the GPU: textures (with mipmaps), the meshes
        let b = (TS * TS + TD * TD + TN * TN) * 4 * 4 / 3 + Hn * Hn * 4 * (gl.isWebGL2 ? 4 / 3 : 1) + B.nx * B.ny * 4 + R.pos.byteLength + R.idx.byteLength;
        for (const c of cells.values()) if (c.mesh) b += c.bytes;
        for (const c of tcells.values()) b += c.bytes || 0;
        return Math.round(b / 1048576);
      },
      setMode(r) { setMode(r); try { localStorage.setItem(MODE, r ? 'real' : 'heat'); } catch {} wake(); },
      upgrade(R2) { setSurface(R2); wake(); },
      setHour(h) { // round 12 (the panel's ‹ ›): another forecast hour: the sun or moon and its shadows, the sea, wind and sky, the fish chance
        if (!F || !(h >= 0 && h < F.T) || h === S?.h) return;
        sky?.fadeFrom(); // the sun and sky fade with the sea
        const wasNight = LT.night > .2; S.h = h; LT = light(B.a, h); LT = window.PsArea3DSky?.light(LT, B.a, h) || LT;
        U.sunCol.value.set(...LT.sunCol); U.amb.value.set(...LT.amb); U.haze.value.set(...LT.hor); U.skyH.value.set(...LT.hor); U.skyZ.value.set(...LT.zen); U.night.value = LT.night; U.lit.value = litAt(LT.t);
        const H2 = heat(B, sp, h); heatTex.image.data.set(H2.d); heatTex.needsUpdate = true; api.best = H2.best; setPins(H2.s8); api.tops = tops;
        if (wasNight !== LT.night > .2) { setGlow(); if (Wd) setLamps(); } // the streets' glow and lamps: the same every night hour
        setMode(real); sea?.setHour(h); sky?.setHour(h, LT); shadows(LV.n.w); // the buildings' shadows for the new sun
        const f = byId(sp); host.querySelector('.a3-ttl small').textContent = [f && fishName(f), whenT(hours[h].t)].filter(Boolean).join(' · '); badge(host, H2.best);
        wake();
      },
      north() { sph.setFromVector3(tmp.copy(camera.position).sub(controls.target)); flyTo(sph.radius, sph.phi, 0, controls.target, 700); },
      dispose() {
        if (raf > 0) cancelAnimationFrame(raf);
        raf = -1; fly = null; clearTimeout(idleT); ro.disconnect(); controls.dispose(); V.gen++; sea?.dispose(); sky?.dispose();
        document.removeEventListener('visibilitychange', onVis);
        canvasEl.removeEventListener('webglcontextlost', onLost); canvasEl.removeEventListener('webglcontextrestored', onRestored);
        const seen = new Set();
        scene.traverse(o => { for (const x of [o.geometry, o.material]) if (x && !seen.has(x)) { seen.add(x); x.dispose(); } });
        for (const x of [tex, dtex, ntex, heatTex, U.aux.value, U.coast.value, U.shade.value, U.glow.value, ringGeo, ...mats]) x?.dispose();
        tcv.width = dcv.width = ncv.width = 0;
        for (const k of ['seaImg', 'landImg', 'maskImg']) if (B[k]) B[k].width = 0;
        cells.clear(); Bd = HH = null;
        renderer.dispose(); renderer.forceContextLoss(); canvasEl.remove();
      },
    };
    return api;
  }

  /* ---------- The overlay ---------- */
  function shell(a, sp, h) {
    const el = document.createElement('div'), x = h >= 0 && hours?.[h], s = byId(sp), real = getMode();
    el.className = 'a3' + (real ? ' no-heat' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `${L10(a)} · 3D`);
    const words = ['poor', 'fair', 'good', 'excellent'].map(k => `<span>${esc(tr(k))}</span>`).join('');
    const bar = `linear-gradient(90deg,${HEAT.map(([v, c]) => `rgb(${c.slice(0, 3)}) ${(v - 35) / 60 * 100}%`)})`;
    el.innerHTML = `<div class="a3-stage"></div><div class="a3-labels"></div>
<header class="a3-top"><button class="a3-x" data-a3="close" aria-label="${esc(tr('nav_back'))}">${ic('chevron-left') || '‹'}</button><div class="a3-ttl"><b>${esc(L10(a))}</b><small>${esc([s && fishName(s), x && whenT(x.t)].filter(Boolean).join(' · '))}</small></div></header>
<button class="a3-compass" data-a3="north" aria-label="${esc(tr('diveNorth'))}" title="${esc(tr('diveNorth'))}"><svg class="a3-rose" viewBox="-20 -20 40 40" aria-hidden="true"><path class="n" d="M0-15 5 0H-5z"/><path class="s" d="M0 15 5 0H-5z"/><text y="-17.5" text-anchor="middle">${esc(tr('dirs')[0])}</text></svg></button>
<div class="a3-panel">
  <div class="a3-seg" role="group"><button data-a3="heat" aria-pressed="${!real}">${esc(tr('a3_heat'))}<i class="a3-best"></i></button><button data-a3="real" aria-pressed="${real}">${esc(tr('a3_real'))}</button></div>
  <div class="a3-heat"><div class="a3-bar" style="background:${bar}"></div><div class="a3-words">${words}</div></div>
  <small class="a3-meta"></small><small class="a3-cred"></small>
</div>
<p class="a3-hint">${esc(tr(matchMedia('(pointer: coarse)').matches ? 'p_a3Touch' : 'a3_hint'))}</p>
<div class="a3-msg" role="status"><span class="a3-spin"></span><span>${esc(tr('a3_loading'))}</span></div>`;
    el.querySelector('.a3-seg').insertAdjacentHTML('afterend', `<button type="button" class="a3-svt" data-a3="street" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM3.5 12c0 1.8 3.8 3.3 8.5 3.3s8.5-1.5 8.5-3.3M12 3.5c-2.2 2.3-3.3 5.1-3.3 8.5"/></svg><span>${esc(tr('sv_toggle'))}</span></button><small class="a3-svs" role="status"></small>`); // round 13 street: the toggle (js/area3d-street.js)
    return el;
  }
  function badge(el, v) { const b = el.querySelector('.a3-best'); b.className = v >= 1 ? 'a3-best pill ' + tier(v) : 'a3-best'; b.style.background = v >= 1 ? solid(v) : ''; b.textContent = v >= 1 ? v : ''; } // the best chance on its button
  function setMsg(text, retry) {
    const m = S?.el.querySelector('.a3-msg'); if (!m) return;
    m.hidden = !text;
    if (text) m.innerHTML = `<span>${esc(text)}</span>${retry ? `<button class="a3-btn" data-a3="retry">${esc(tr('retry'))}</button>` : ''}`;
  }
  function open(id, o = {}) {
    const a = (window.PSAREMA_AREAS || []).find(x => x.id === id);
    if (!a) return Promise.reject(new Error('PsArea3D.open: no such area ' + id));
    if (S) teardown();
    const sp = o.sp && byId(o.sp) ? o.sp : state.sp, h = F ? Math.min(F.T - 1, Math.max(0, o.h ?? state.h)) : -1;
    const el = shell(a, sp, h);
    document.body.appendChild(el);
    S = { el, a, sp, h, view: null, workers: new Set() };
    el.addEventListener('click', onClick);
    try { history.pushState({ ...(history.state || {}), psArea3d: 1 }, ''); } catch {}
    el.querySelector('.a3-x').focus({ preventScroll: true });
    return start(S, performance.now());
  }
  function start(s, t0) {
    const packP = loadPack(s.a.id), Qt = QUAL[tier()], budget = Qt.budget, LT = light(s.a, s.h);
    return Promise.all([loadThree(), ...[[SEA_JS, 'PsArea3DSea'], [SKY_JS, 'PsArea3DSky']].map(([f, k]) => window[k] || addScript(f).catch(e => console.warn('Psarema area 3D:', e.message)))]).then(async () => {
      const pack = await Promise.race([packP, new Promise(ok => setTimeout(ok, 1500))]); // undefined: still on its way (the coarse surface first)
      if (S !== s) return;
      await next(); if (S !== s) return;
      const B = cut(s.a), job = async m => { // two workers at once (js/area3d-surface.js): the mesh; the hour's light and the coastline
        const base = { span: B.span, sun: LT.bake, budget, ...m }, [R, L] = await Promise.all([surfaceOf(s, { ...base, part: 'mesh' }), surfaceOf(s, { ...base, part: 'light', coast: coastSegs(B), coastC: Qt.coast })]);
        for (let k = 0; k < L.light.length; k++) R.aux[4 * k + 3] = L.light[k];
        return Object.assign(R, { coast: L.coast, ms: { ...R.ms, light: L.ms } });
      };
      let R = pack ? await job({ pack }).catch(e => { console.warn('Psarema area 3D pack:', e.message); return null; }) : null;
      if (S !== s) return;
      if (!R) { const land = await loadLand(); if (S !== s) return; R = await job(coarseGrid(B, land)); }
      if (S !== s) return;
      await next(); if (S !== s) return;
      try { s.view = build(B, R, s.el, s.sp, s.h, LT); }
      catch (e) { console.warn('Psarema area 3D: unavailable', e); setMsg(tr('diveNoGl')); return; }
      setMsg('');
      const v = s.view; badge(s.el, v.best);
      v.V.credit();
      v.openMs = performance.now() - t0; v.t0 = t0;
      dress(v.V);
      if (pack === undefined) packP.then(p => p && S === s ? job({ pack: p, ex: R.ex }) : null).then(R2 => { if (R2 && S === s && s.view) { s.view.upgrade(R2); s.view.upgradedMs = performance.now() - t0; } })
        .catch(e => { if (S === s) console.warn('Psarema area 3D pack:', e.message); });
    }).catch(e => {
      if (S !== s) return;
      console.warn('Psarema area 3D:', e.message);
      setMsg(tr('diveOffline'), true);
    });
  }
  function onClick(e) {
    const b = e.target.closest('[data-a3], [data-a3-spot]'); if (!b || !S) return;
    if (b.dataset.a3Spot) { goSpot(+b.dataset.a3Spot); return; }
    const act = b.dataset.a3;
    if (act === 'close') close();
    else if (act === 'retry') { S.el.querySelector('.a3-msg').innerHTML = `<span class="a3-spin"></span><span>${esc(tr('a3_loading'))}</span>`; start(S, performance.now()); }
    else if (act === 'north') S.view?.north();
    else if (act === 'street') { const s = S; (window.PsArea3DStreet ? Promise.resolve() : addScript('js/area3d-street.js')).then(() => { if (S === s) PsArea3DStreet.toggle(s, b); }, e => console.warn('Psarema area 3D:', e.message)); } // round 13 street: markers where there are street photos, loaded on the first tap
    else if (act === 'h-' || act === 'h+') S.view?.setHour(S.h + (act === 'h+' ? 1 : -1)); // round 12: the hour (js/area3d-sea.js's panel row)
    else if (act === 'heat' || act === 'real') {
      S.el.querySelectorAll('.a3-seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      S.el.classList.toggle('no-heat', act === 'real');
      S.view?.setMode(act === 'real');
    }
  }
  function goSpot(i) { // close, then (once the view's history step is gone) the spot's card on the map for the fish and hour shown here
    const { sp, h } = S;
    close(() => {
      if (window.PsPanel?.openSpot) PsPanel.openSpot(i, { fish: sp, h });
      else { if (isPhone()) PsNav?.open('map'); map.setView([latOf(i), lonOf(i)], Math.max(map.getZoom(), 12)); openCell(i); }
    });
  }
  function teardown() {
    if (!S) return;
    const s = S; S = null;
    for (const w of s.workers) w.terminate();
    try { s.view?.dispose(); } catch (e) { console.warn(e); }
    s.el.remove();
    landP = null; // the coarse land heights too: fetched again, from the cache, on the next open
    if (window.PsNav?.current?.() !== 'area') window.PsAreas?.free?.();
  }
  function close(then) {
    if (!S) { then?.(); return; }
    teardown();
    if (history.state?.psArea3d) { eatPop = true; after = then || null; history.back(); } else then?.();
  }
  addEventListener('popstate', e => window.PsArea3DStreet?.back(e), true); addEventListener('keydown', e => { if (e.key === 'Escape') window.PsArea3DStreet?.back(e); }, true); // round 13 street: Back and Escape close its photo viewer, then its card, before the view (they run first: added first)
  // Back (Android, browser) closes the view, not the page under it: this listener must run before js/mobile.js's own (index.html order)
  addEventListener('popstate', e => {
    if (eatPop) { eatPop = false; e.stopImmediatePropagation(); const f = after; after = null; f?.(); return; }
    if (S && !history.state?.psArea3d) { e.stopImmediatePropagation(); teardown(); }
  }, true);
  addEventListener('keydown', e => { if (S && e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); close(); } }, true);

  window.PsArea3D = { open, close: () => close(), get view() { return S?.view || null; } };
})();
