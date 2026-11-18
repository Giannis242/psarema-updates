'use strict';
// Psarema: map styles (Layers > Map style) and the depth chart (css/chart.css): Fishbrain's depth map, drawn from the 250 m EMODnet grid the app
// ships (core.js depth[]), so it works offline and needs no tiles.
//   Satellite = map.js's imagery group. Depth chart = the water tinted by depth in slate steps (shallow light, deep dark), the land and its crisp shore
//   from data/coast.js, contour lines 5–2000 m (the round depths brighter) with their depths written along them as on a nautical chart.
//   Overlays: Depth lines (#lay-contours, map.js buildContours: the lines and numbers alone, over the satellite) and Nautical marks (OpenSeaMap seamarks).
//   The choice is state.layers.style ('chart' or unset) and state.layers.seamarks, saved with the other layers.
// Speed: nothing runs at start-up unless the chart is the saved style, and then only after the first heat paint. The contours are traced once, one depth
// per idle slice (PsChart.stats.buildMs); tiles (L.GridLayer, 256 px at the screen's pixel ratio, a level per half zoom so lines and numbers keep their
// size at the map's half steps) draw a few per frame; the numbers are placed once per zoom level over the whole chart, so one crossing a tile edge is
// drawn identically in both tiles. Also here: the map's scale bar (km and nautical miles).
Object.assign(I18N.en, { l_relief: 'Seabed relief', reliefTip: 'The shape of the seabed, shaded as if lit from the north-west: banks, reefs and drop-offs stand out' });
Object.assign(I18N.el, { l_relief: 'Ανάγλυφο βυθού', reliefTip: 'Το σχήμα του βυθού, σκιασμένο σαν να φωτίζεται από τα βορειοδυτικά: ξέρες, ύφαλοι και απότομα βαθιά ξεχωρίζουν' });
const PsChart = window.PsChart = (() => {
  const LV = [5, 10, 20, 30, 50, 100, 200, 500, 1000, 1500, 2000];
  const MAJOR = new Set([10, 50, 100, 200, 500, 1000, 2000]);
  const LINE_Z = { 5: 11, 10: 9.5, 20: 10.5, 30: 11, 50: 9, 100: 8, 200: 0, 500: 0, 1000: 0, 1500: 10, 2000: 8.5 }; // each line from this zoom (shallow ones crowd the shore zoomed out)
  const NUM_Z = { 5: 12, 10: 11, 20: 11.5, 30: 12, 50: 10, 100: 10, 200: 9, 500: 9.5, 1000: 9.5, 1500: 11, 2000: 10 }; // and its numbers from this one
  const ORDER = [200, 50, 100, 10, 20, 500, 1000, 30, 5, 2000, 1500]; // who wins a crowded spot: the shelf an angler fishes first
  const WATER = ['#6b8291', '#60788a', '#566f80', '#4d6576', '#455c6c', '#3d5262', '#354857', '#2d3e4c', '#263442', '#202c39', '#1b2531', '#161f2a']; // 0–5 m … 2000 m+
  const LAND = '#2a2b2d', SHORE = 'rgba(196,205,211,.9)';
  const mx = lon => (lon + 180) / 360, my = lat => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2; // Web Mercator, 0–1
  const stats = { buildMs: 0, buildWallMs: 0, tiles: 0, tileMs: 0, labelMs: 0 };
  const idle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(() => f({ timeRemaining: () => 0 }), 16);

  /* ---------- Contours: traced once, one depth per idle slice ---------- */
  let geo = null, building = null;
  const onFrame = (x, y) => x < .6 || y < .6 || x > W - .6 || y > H - .6; // d3 closes rings along the grid's edge: those runs are no depth line
  function pack(pts, closed) { // [[gx, gy]…] in grid cells → Mercator x,y pairs, the box, and (lines) the length so far at each point
    const n = pts.length, p = new Float64Array(n * 2), cum = new Float64Array(n);
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (let k = 0; k < n; k++) {
      const x = mx(WEST + pts[k][0] * RES), y = my(NORTH - pts[k][1] * RES);
      p[2 * k] = x; p[2 * k + 1] = y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (k) cum[k] = cum[k - 1] + Math.hypot(x - p[2 * k - 2], y - p[2 * k - 1]);
    }
    return { p, cum, bb: [x0, y0, x1, y1], closed };
  }
  function traceLevel(v) {
    const fills = [], lines = [];
    for (const poly of d3.contours().size([W, H]).thresholds([v])(depth)[0].coordinates) for (const r of poly) {
      const m = r.length - 1; // d3 repeats the first point at the end
      fills.push(pack(r.slice(0, m), true)); // the fill: the ring without the repeat (its runs along the grid's edge stay: trace needs short steps)
      const f = r.findIndex(q => onFrame(...q));
      if (f < 0) { lines.push(pack(r.slice(0, m), true)); continue; }
      for (let k = 0, seg = []; k <= m; k++) { const q = r[(f + k) % m]; if (!onFrame(...q)) seg.push(q); else { if (seg.length > 2) lines.push(pack(seg, false)); seg = []; } }
    }
    return { fills, lines };
  }
  function heatPainted() { // the first heat paint (map.js `scored`), or 8 s: the chart never delays it
    // round 14: and d3, now loaded async (index.html): only the chart's contours use it, so it no longer holds up the page's first parse
    return new Promise(ok => { const t0 = performance.now(), wait = () => ((typeof scored !== 'undefined' && scored) || performance.now() - t0 > 8e3) && window.d3 ? idle(ok) : setTimeout(wait, 250); wait(); });
  }
  const build = () => building ||= heatPainted().then(() => new Promise(done => {
    const t0 = stats.startAt = performance.now(), levels = [];
    const step = dl => {
      do { const t = performance.now(); levels.push(traceLevel(LV[levels.length])); stats.buildMs += performance.now() - t; }
      while (levels.length < LV.length && dl.timeRemaining() > 12); // at least one depth a slice (~10 ms on a desktop)
      if (levels.length < LV.length) { idle(step); return; }
      const t = performance.now(), coast = [];
      for (const r of window.PSAREMA_COAST || []) { // lat,lon pairs, closed; long straight stretches cut into steps of a cell at most, as trace needs
        const pts = [];
        for (let k = 0; k < r.length - 2; k += 2) {
          const x = (r[k + 1] - WEST) / RES, y = (NORTH - r[k]) / RES, x2 = (r[k + 3] - WEST) / RES, y2 = (NORTH - r[k + 2]) / RES, n = Math.ceil(Math.hypot(x2 - x, y2 - y));
          for (let j = 0; j < n; j++) pts.push([x + (x2 - x) * j / n, y + (y2 - y) * j / n]);
        }
        coast.push(pack(pts, true));
      }
      stats.buildMs += performance.now() - t;
      geo = { levels, coast };
      const fonts = document.fonts?.load ? Promise.all(['600 11px Inter', '500 10px Inter'].map(f => document.fonts.load(f))).catch(() => {}) : null;
      Promise.resolve(fonts).then(() => { stats.buildWallMs = performance.now() - t0; done(geo); });
    };
    idle(step);
  }));

  /* ---------- Drawing a tile ---------- */
  // One ring or line into the current path, in tile pixels, smoothed (a quadratic through the midpoints). Points beyond the tile's margin are pulled
  // onto it, and runs along one side of it dropped: the margin is wider than three steps of any line, so nothing the tile shows changes (fill or
  // stroke), and a ring around the island costs a tile a handful of path points, not thousands. tol: points closer than that to the last kept one
  // are skipped (zoomed out, many fall in one pixel); it is measured before the pull, so every tile keeps the same points.
  let X = new Float64Array(4096), Y = new Float64Array(4096), E = new Uint8Array(4096);
  function trace(ctx, o, s, ox, oy, lo, hi, tol) {
    const p = o.p, n = p.length >> 1, closed = o.closed;
    if (n > X.length) { X = new Float64Array(n); Y = new Float64Array(n); E = new Uint8Array(n); }
    let m = 0;
    for (let i = 0, lx = 1e12, ly = 1e12; i < n; i++) {
      const x = p[2 * i] * s - ox, y = p[2 * i + 1] * s - oy;
      if (i && i < n - 1 && Math.abs(x - lx) < tol && Math.abs(y - ly) < tol) continue;
      lx = x; ly = y;
      const cx = x < lo ? lo : x > hi ? hi : x, cy = y < lo ? lo : y > hi ? hi : y;
      X[m] = cx; Y[m] = cy; E[m] = cx === x && cy === y ? 0 : (cx === lo) | (cx === hi) << 1 | (cy === lo) << 2 | (cy === hi) << 3; m++; // E: the sides a pulled point lies on
    }
    if (m < 2) return;
    const pr = k => k ? k - 1 : m - 1, nx = k => k < m - 1 ? k + 1 : 0;
    let atMid, last = 0; // last: the last point drawn (a run along one side is judged from there, so a corner it turns at is always kept)
    const vertex = k => {
      const a = pr(k), b = nx(k);
      if (E[k]) { if (!(E[last] & E[k] & E[b])) { ctx.lineTo(X[k], Y[k]); atMid = false; last = k; } return; } // a pulled point: straight, dropped amid a run along one side
      if (!atMid) ctx.lineTo((X[a] + X[k]) / 2, (Y[a] + Y[k]) / 2);
      ctx.quadraticCurveTo(X[k], Y[k], (X[k] + X[b]) / 2, (Y[k] + Y[b]) / 2); atMid = true; last = k;
    };
    if (closed) {
      if (E[0]) ctx.moveTo(X[0], Y[0]); else ctx.moveTo((X[m - 1] + X[0]) / 2, (Y[m - 1] + Y[0]) / 2);
      atMid = !E[0];
      for (let k = E[0] ? 1 : 0; k < m; k++) vertex(k);
      ctx.closePath();
    } else {
      ctx.moveTo(X[0], Y[0]); atMid = false;
      for (let k = 1; k < m - 1; k++) vertex(k);
      ctx.lineTo(X[m - 1], Y[m - 1]);
    }
  }
  const font = (maj, z) => `${maj ? 600 : 500} ${(maj ? 11 : 10) + (z >= 13 ? 1 : 0)}px Inter, system-ui, sans-serif`; // a size up zoomed in, where there is room
  const mctx = document.createElement('canvas').getContext('2d'), widths = new Map();
  const textW = (t, maj, z) => { const k = font(maj, z) + t; if (!widths.has(k)) { mctx.font = font(maj, z); widths.set(k, mctx.measureText(t).width); } return widths.get(k); };
  function draw(cv, c, full, r) {
    const ctx = cv.getContext('2d'), z = c.z, s = 256 * 2 ** z, ox = c.x * 256, oy = c.y * 256;
    const cell = RES / 360 * s * 1.25, M = Math.max(12, 5 * cell), lo = -M, hi = 256 + M, tol = .4; // cell: one grid step in pixels (taller than wide in Mercator)
    const wx0 = (ox - M) / s, wy0 = (oy - M) / s, wx1 = (ox + 256 + M) / s, wy1 = (oy + 256 + M) / s;
    const hit = bb => bb[2] >= wx0 && bb[0] <= wx1 && bb[3] >= wy0 && bb[1] <= wy1;
    ctx.setTransform(r, 0, 0, r, 0, 0);
    if (full) { // the water: the shallowest step, then each deeper one over it (a contour ring set = the sea at least that deep)
      ctx.fillStyle = WATER[0]; ctx.fillRect(0, 0, 256, 256);
      geo.levels.forEach((g, k) => {
        ctx.beginPath(); let any = false;
        for (const o of g.fills) if (hit(o.bb)) { trace(ctx, o, s, ox, oy, lo, hi, tol); any = true; }
        if (any) { ctx.fillStyle = WATER[k + 1]; ctx.fill('evenodd'); }
      });
      if (chartRelief) { // round 9: the seabed relief drawn into the chart's own tiles (one layer, not a full-screen overlay over it: pans were 25 % slower)
        if (!reliefCv.width) shade();
        const x0 = mx(WEST) * s - ox, x1 = mx(WEST + W * RES) * s - ox, y0 = my(NORTH) * s - oy, y1 = my(NORTH - H * RES) * s - oy, kx = W / (x1 - x0), ky = H / (y1 - y0);
        const sx = Math.max(0, Math.floor(-x0 * kx) - 1), sy = Math.max(0, Math.floor(-y0 * ky) - 1), ex = Math.min(W, Math.ceil((256 - x0) * kx) + 1), ey = Math.min(H, Math.ceil((256 - y0) * ky) + 1);
        if (ex > sx && ey > sy) { ctx.imageSmoothingEnabled = true; ctx.drawImage(reliefCv, sx, sy, ex - sx, ey - sy, x0 + sx / kx, y0 + sy / ky, (ex - sx) / kx, (ey - sy) / ky); }
      }
    }
    const labs = labelsAt(z).filter(l => l.x + l.r > ox && l.x - l.r < ox + 256 && l.y + l.r > oy && l.y - l.r < oy + 256);
    ctx.save();
    if (labs.length) { // the lines break under their numbers, as on a nautical chart
      ctx.beginPath(); ctx.rect(-8, -8, 272, 272);
      for (const l of labs) {
        const cs = Math.cos(l.a), sn = Math.sin(l.a), hw = l.w / 2 + 3, hh = 6.5, x = l.x - ox, y = l.y - oy;
        ctx.moveTo(x - cs * hw + sn * hh, y - sn * hw - cs * hh); ctx.lineTo(x + cs * hw + sn * hh, y + sn * hw - cs * hh);
        ctx.lineTo(x + cs * hw - sn * hh, y + sn * hw + cs * hh); ctx.lineTo(x - cs * hw - sn * hh, y - sn * hw + cs * hh); ctx.closePath();
      }
      ctx.clip('evenodd');
    }
    ctx.lineJoin = ctx.lineCap = 'round';
    geo.levels.forEach((g, k) => {
      const v = LV[k]; if (z < LINE_Z[v]) return;
      const maj = MAJOR.has(v);
      ctx.beginPath(); let any = false;
      for (const o of g.lines) if (hit(o.bb)) { trace(ctx, o, s, ox, oy, lo, hi, tol); any = true; }
      if (!any) return;
      ctx.strokeStyle = full ? `rgba(214,228,238,${v === 200 ? .72 : maj ? .5 : .24})` : `rgba(236,246,252,${v === 200 ? .9 : maj ? .68 : .38})`;
      ctx.lineWidth = (v === 200 ? 1.3 : maj ? 1 : .75) * (z >= 13 ? 1.2 : 1);
      ctx.stroke();
    });
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const l of labs) { // a soft dark halo: legible on the light shallows and on imagery
      ctx.setTransform(r, 0, 0, r, 0, 0); ctx.translate(l.x - ox, l.y - oy); ctx.rotate(l.a);
      ctx.font = font(l.maj, z); ctx.lineWidth = full ? 2.5 : 3; ctx.strokeStyle = full ? 'rgba(14,22,30,.55)' : 'rgba(5,10,19,.78)'; ctx.strokeText(l.t, 0, .5);
      ctx.fillStyle = full ? (l.maj ? '#e9eff3' : '#c8d4dc') : '#fff'; ctx.fillText(l.t, 0, .5);
    }
    if (full) { // the land over all of it (numbers the grid put in salt lakes too), and its shore, crisp
      ctx.setTransform(r, 0, 0, r, 0, 0); ctx.beginPath(); let any = false;
      for (const o of geo.coast) if (hit(o.bb)) { trace(ctx, o, s, ox, oy, lo, hi, tol); any = true; }
      if (any) { ctx.fillStyle = LAND; ctx.fill('evenodd'); ctx.strokeStyle = SHORE; ctx.lineWidth = z >= 12 ? 1.2 : .9; ctx.stroke(); }
    }
    // Round 11: the grid ends in open sea: the chart fades out over its last 4 km (map.js FADE_C cells, as the heat), nothing past it
    const gx0 = mx(WEST) * s - ox, gx1 = mx(WEST + W * RES) * s - ox, gy0 = my(NORTH) * s - oy, gy1 = my(NORTH - H * RES) * s - oy, fx = (gx1 - gx0) * FADE_C / W, fy = (gy1 - gy0) * FADE_C / H;
    if (gx0 + fx > 0 || gx1 - fx < 256 || gy0 + fy > 0 || gy1 - fy < 256) {
      ctx.setTransform(r, 0, 0, r, 0, 0); ctx.globalCompositeOperation = 'destination-in';
      for (const [a, b, k, across] of [[gx0, gx1, FADE_C / W, 1], [gy0, gy1, FADE_C / H, 0]]) {
        const g = across ? ctx.createLinearGradient(a, 0, b, 0) : ctx.createLinearGradient(0, a, 0, b);
        for (const [o, c] of [[0, 'rgba(0,0,0,0)'], [k, '#000'], [1 - k, '#000'], [1, 'rgba(0,0,0,0)']]) g.addColorStop(o, c);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* ---------- Depth numbers: placed once per zoom level over the whole chart ---------- */
  // Every GAP pixels along each line, where the line runs straight enough under the number, on the sea, and clear of numbers placed before it.
  const labels = new Map();
  function labelsAt(z) {
    let out = labels.get(z); if (out) return out;
    const t0 = performance.now(), s = 256 * 2 ** z, G = 128, grid = new Map(); out = [];
    const near = (x0, y0, x1, y1, f) => { for (let gx = Math.floor(x0 / G); gx <= Math.floor(x1 / G); gx++) for (let gy = Math.floor(y0 / G); gy <= Math.floor(y1 / G); gy++) f(gx + ',' + gy); };
    const free = b => { let ok = true; near(b[0], b[1], b[2], b[3], k => { for (const o of grid.get(k) || []) if (o[0] < b[2] && o[2] > b[0] && o[1] < b[3] && o[3] > b[1]) ok = false; }); return ok; };
    const take = b => near(b[0], b[1], b[2], b[3], k => { let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(b); });
    for (const v of ORDER) {
      if (z < NUM_Z[v]) continue;
      const maj = MAJOR.has(v), t = String(v), w = textW(t, maj, z), half = w / 2 + 4, GAP = maj ? 400 : 520;
      for (const o of geo.levels[LV.indexOf(v)].lines) {
        const cum = o.cum, n = cum.length, len = cum[n - 1] * s; if (len < 2 * half + 24) continue;
        const at = d => { // the point d pixels along the line
          const u = d / s; let a = 0, b = n - 1;
          while (b - a > 1) { const c = (a + b) >> 1; if (cum[c] <= u) a = c; else b = c; }
          const f = (u - cum[a]) / ((cum[b] - cum[a]) || 1);
          return [(o.p[2 * a] + (o.p[2 * b] - o.p[2 * a]) * f) * s, (o.p[2 * a + 1] + (o.p[2 * b + 1] - o.p[2 * a + 1]) * f) * s];
        };
        // start each depth at its own offset, so neighbouring lines' numbers do not stack in a column
        for (let d = GAP * (.3 + (ORDER.indexOf(v) % 4) * .12); d < len - half; d += GAP) {
          for (const dd of [0, GAP * .18, -GAP * .18, GAP * .36]) {
            const m = d + dd; if (m < half || m > len - half) continue;
            const [ax, ay] = at(m - half), [bx, by] = at(m + half);
            if (Math.hypot(bx - ax, by - ay) < 1.84 * half) continue; // too curved under the number
            let a = Math.atan2(by - ay, bx - ax); if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI; // never upside down
            const [x, y] = at(m), i = idxAt(Math.atan(Math.sinh(Math.PI * (1 - 2 * y / s))) * 180 / Math.PI, x / s * 360 - 180);
            if (i < 0 || !depth[i]) continue; // on land (the grid's shore runs outside the real one in places)
            const cs = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a)), ex = cs * (w / 2 + 6) + sn * 9, ey = sn * (w / 2 + 6) + cs * 9;
            const b = [x - ex, y - ey, x + ex, y + ey];
            if (!free(b)) continue;
            take(b); out.push({ x, y, a, t, w, maj, r: Math.max(ex, ey) + 2 });
            break;
          }
        }
      }
    }
    labels.set(z, out); stats.labelMs += performance.now() - t0;
    return out;
  }

  /* ---------- The tile layers ---------- */
  const queue = []; let pumping = 0;
  function pump() { // a few tiles per task, nearest the centre first (Leaflet asks in that order), so the map keeps answering
    pumping = 0;
    const end = performance.now() + 10;
    while (queue.length && performance.now() < end) {
      const [cv, c, full, r, done] = queue.shift(); if (!cv.parentNode) continue; // pruned before its turn
      const t = performance.now(); draw(cv, c, full, r); stats.tileMs += performance.now() - t; stats.tiles++;
      done(null, cv);
    }
    if (queue.length) pumping = setTimeout(pump, 0);
  }
  map.createPane('chart').style.zIndex = 250; // over the imagery (tilePane 200), under the heat (410): no imagery filter (app.css) on these tiles
  // Leaflet rounds the tile level to a whole zoom: at the map's half steps (zoomSnap .5) the lines and numbers then showed at 71 %. A level per half
  // step instead (Leaflet 1.9.4's _setView with that one change). js/map-marks.js's names and soundings use it too (PsChart.HalfGrid).
  const HalfGrid = L.GridLayer.extend({
    _setView(center, zoom, noPrune, noUpdate) {
      const tz = Math.round(zoom * 2) / 2;
      if (!noUpdate || (this.options.updateWhenZooming && tz !== this._tileZoom)) {
        this._tileZoom = tz;
        this._abortLoading?.(); this._updateLevels(); this._resetGrid(); this._update(center);
        if (!noPrune) this._pruneTiles();
        this._noPrune = !!noPrune;
      }
      this._setZoomTransforms(center, zoom);
    },
  });
  const Chart = HalfGrid.extend({
    options: { pane: 'chart', updateWhenZooming: false, keepBuffer: 2, noWrap: true, bounds: L.latLngBounds(GRID_BOUNDS).pad(.02), full: true },
    createTile(c, done) {
      const cv = L.DomUtil.create('canvas', 'ps-chart-tile'), r = Math.min(2, window.devicePixelRatio || 1);
      cv.width = cv.height = Math.round(256 * r);
      build().then(() => { queue.push([cv, c, this.options.full, r, done]); if (!pumping) pumping = setTimeout(pump, 0); });
      return cv;
    }
  });
  const chart = new Chart({ attribution: DATA_ATTR }), lines = new Chart({ full: false });
  Object.assign(map.createPane('seamarks').style, { zIndex: 645, pointerEvents: 'none' }); // over the heat: buoys and lights stay visible
  const seamarks = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { pane: 'seamarks', minZoom: 11, maxZoom: 17,
    attribution: 'Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors (ODbL)' });

  /* ---------- Seabed relief (round 9): a hill-shade of the shipped depth grid, one still image over either style, under the heat ---------- */
  // Lit from the north-west, as relief maps are. Height is the square root of depth (×20, then ×5 in slope): the shelf an angler fishes (reefs,
  // banks, the 20–100 m drop-offs) reads, where true depth would show only the deep slope. Grid rows are read at each image row's Mercator
  // latitude (map.js MROW), and the sea clip (map.js #sea-clip) trims it at the real shore. Made when first shown (~15 ms), freed when hidden.
  map.createPane('relief').style.cssText = 'z-index:255;pointer-events:none'; // over the imagery and the chart's water (250), under the heat (410)
  // Round 17 Z: the image off screen (reliefCv), drawn into a view-sized canvas inside the shore's clip (map.js ViewBox): as an element over
  // the whole grid under a CSS clip-path of the coastline it was, like the heat, scaled and masked whole at every frame of a zoom.
  const reliefCv = document.createElement('canvas'), relief = new ViewBox(L.DomUtil.create('div', 'ps-relief'), { pane: 'relief' });
  const reliefPart = relief.add((g, V) => gridImage(g, V, reliefCv), '', 'coast');
  // Round 16 X: the shading is js/relief-worker.js, worked out in a worker (~0.9 s of main thread at every start on a budget phone); on the
  // main thread only if a worker cannot start (the same file as a script then defines reliefPixels).
  let reliefJob = 0;
  function shade() {
    const t = performance.now(), job = ++reliefJob, args = { depth, W, H, N, RES, NORTH, MROW };
    const put = p => {
      if (job !== reliefJob || !map.hasLayer(relief)) return; // hidden meanwhile: nothing to draw (shown again: worked out again)
      if (reliefCv.width !== W) Object.assign(reliefCv, { width: W, height: H });
      reliefCv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(p.buffer), W, H), 0, 0); relief.draw(reliefPart);
      stats.reliefMs = +(performance.now() - t).toFixed(1);
    };
    const here = () => { if (window.reliefPixels) { put(reliefPixels(args)); return; } const sc = document.createElement('script'); sc.src = 'js/relief-worker.js'; sc.onload = () => put(reliefPixels(args)); document.head.append(sc); };
    try {
      const w = new Worker('js/relief-worker.js');
      w.onmessage = e => { w.terminate(); put(e.data); };
      w.onerror = e => { e.preventDefault?.(); w.terminate(); if (job === reliefJob) here(); };
      w.postMessage(args); // the grid is copied (1.6 MB), not moved: the app keeps using it
    } catch { here(); }
  }
  reliefCv.width = reliefCv.height = 0; // a new canvas is 300×150: 0×0 until shaded
  relief.on('add', () => { if (!reliefCv.width) shade(); });
  let chartRelief = state.layers.relief !== false, reliefReady = false; // the chart's tiles draw the relief themselves (draw)
  function applyRelief() { // over the satellite: the overlay; the chart: in its tiles. Off: its ~4 MB back
    const want = state.layers.relief !== false;
    if (want && style !== 'chart') relief.addTo(map); else map.removeLayer(relief);
    if (!want) reliefCv.width = reliefCv.height = 0;
    if (chartRelief !== want) { chartRelief = want; if (style === 'chart') chart.redraw(); }
  }

  /* ---------- Map style: Satellite or Depth chart ---------- */
  let style = state.layers.style === 'chart' ? 'chart' : 'sat';
  LAYER_OBJ.contours = () => style === 'chart' ? null : lines; // the chart has its own lines: the overlay is only for the satellite (ui.js applyLayer)
  LAYER_OBJ.seamarks = () => seamarks;
  function setStyle(st, save) {
    style = st === 'chart' ? 'chart' : 'sat';
    const on = style === 'chart';
    map.getContainer().classList.toggle('ps-chart', on);
    if (on) { map.removeLayer(imagery); map.removeLayer(lines); chart.addTo(map); }
    else { imagery.addTo(map); map.removeLayer(chart); applyLayer('contours'); }
    if (reliefReady) applyRelief();
    for (const b of document.querySelectorAll('.lp-card')) b.setAttribute('aria-checked', b.dataset.style === style);
    const dl = $('#lay-contours'); if (dl) dl.disabled = on; // the chart always has its lines: the overlay switch rests meanwhile
    if (save) { state.layers.style = on ? 'chart' : undefined; savePrefs(); }
    document.dispatchEvent(new Event('ps:style')); // js/map-marks.js: soundings in the style's colours
  }

  // The Map style section, at the top of Layers: two picture cards and the chart's note. Round 17 G: its overlays (relief, sea marks; js/map-marks.js
  // adds soundings, shore types, features and place names) are a group of More layers; Depth lines are a main layer (index.html)
  const pop = $('#layers-pop'), head = pop?.querySelector('.lp-head');
  if (head) {
    const satSrc = LOCAL_TILES ? L.Util.template(LOCAL_TILES.url, { z: 10, x: 606, y: 406 }) : L.Util.template(IMAGERY.url, { z: 10, x: 606, y: 406 }); // Limassol's coast
    const shore = 'M-2-2H72C67 7 60 11 53 15S41 17 33 23 15 31-2 37Z';
    const chartArt = `<svg viewBox="0 0 96 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="96" height="60" fill="${WATER[10]}"/><g fill="none">` +
      [[78, 8], [58, 6], [40, 4], [26, 2], [14, 0]].map(([w, k]) => `<path d="${shore}" stroke="rgba(214,228,238,.45)" stroke-width="${w + 1.4}"/><path d="${shore}" stroke="${WATER[k]}" stroke-width="${w}"/>`).join('') +
      `</g><path d="${shore}" fill="${LAND}" stroke="${SHORE}" stroke-width="1"/><text x="74" y="47" fill="#d3dde4" font-size="7" font-weight="600" font-family="Inter, sans-serif" transform="rotate(-24 74 47)">200</text></svg>`;
    const sec = L.DomUtil.create('div', 'lp-style');
    sec.innerHTML = `<p class="lbl" data-i18n="mapStyle"></p><div class="lp-cards" role="radiogroup" data-i18n-aria="mapStyle">` +
      `<button type="button" class="lp-card" role="radio" data-style="sat"><span class="lp-thumb"><img src="${esc(satSrc)}" alt="" loading="lazy" decoding="async"></span><span data-i18n="st_sat"></span></button>` +
      `<button type="button" class="lp-card" role="radio" data-style="chart"><span class="lp-thumb">${chartArt}</span><span data-i18n="st_chart"></span></button></div>` +
      `<p class="hint" data-i18n="chartNote"></p>`;
    const over = L.DomUtil.create('div', 'lp-grp');
    over.dataset.grp = 'map';
    over.innerHTML = `<h4 data-i18n="g17_mapDetails"></h4><div class="lp-over"><label data-i18n-title="reliefTip" title="${esc(tr('reliefTip'))}"><input type="checkbox" id="lay-relief">${ic('seabed')}<span data-i18n="l_relief"></span></label>` +
      `<label data-i18n-title="seamarksTip" title="${esc(tr('seamarksTip'))}"><input type="checkbox" id="lay-seamarks">${ic('anchor')}<span data-i18n="l_seamarks"></span> <span class="num" translate="no">OpenSeaMap</span></label></div>`;
    head.after(sec); ($('#lp-more') || sec).append(over);
    sec.addEventListener('click', e => { const b = e.target.closest('[data-style]'); if (b && b.dataset.style !== style) setStyle(b.dataset.style, true); });
    const sm = $('#lay-seamarks'); sm.checked = !!state.layers.seamarks;
    sm.addEventListener('change', () => { state.layers.seamarks = sm.checked; applyLayer('seamarks'); savePrefs(); });
    const rl = $('#lay-relief'); rl.checked = state.layers.relief !== false; // on unless turned off
    rl.addEventListener('change', () => { state.layers.relief = rl.checked; applyRelief(); savePrefs(); });
  }
  setStyle(style, false);
  heatPainted().then(() => { reliefReady = true; applyRelief(); }); // after the first heat paint: never in its way
  if (state.layers.seamarks) applyLayer('seamarks');

  /* ---------- Scale bar: kilometres and nautical miles ---------- */
  const nice = v => { const p = 10 ** Math.floor(Math.log10(v)), d = v / p; return p * (d >= 5 ? 5 : d >= 2 ? 2 : 1); }; // the largest 1-2-5 step ≤ v
  const Scale = L.Control.extend({ options: { position: 'bottomright' }, onAdd() {
    const el = L.DomUtil.create('div', 'ps-scale'); el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span><i></i><b></b></span><span><i></i><b></b></span>';
    const [mI, mB, nI, nB] = el.querySelectorAll('i, b'), MAXW = 84;
    const up = () => {
      if (isPhone()) return; // round 16: hidden on phones (css/map-fx.css); drawn when the screen gets wide (PHONE below)
      const y = map.getSize().y / 2, m = map.distance(map.containerPointToLatLng([0, y]), map.containerPointToLatLng([MAXW, y])); // metres across MAXW px here
      if (!(m > 0)) return;
      const km = nice(m) , nm = nice(m / 1852);
      mI.style.width = (MAXW * km / m).toFixed(1) + 'px'; nI.style.width = (MAXW * nm * 1852 / m).toFixed(1) + 'px';
      mB.textContent = km >= 1000 ? `${km / 1000} ${tr('sc_km')}` : `${km} ${tr('sc_m')}`;
      nB.textContent = `${nf(nm, nm < 1 ? (nm < .1 ? 2 : 1) : 0)} ${tr('sc_nm')}`;
    };
    map.on('zoomend moveend', up); this._up = up; requestAnimationFrame(up); PHONE.addEventListener('change', up);
    new MutationObserver(up).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); // the units' words
    return el;
  } });
  new Scale().addTo(map);

  return { stats, setStyle, get style() { return style; }, lines, chart, labelsAt, build, relief, HalfGrid, WATER };
})();
