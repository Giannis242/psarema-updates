/* Psarema weather: canvas map layers (wind particles, waves, currents, rain/cloud, air temperature), a spot chart over the
   forecast's hours (the past 2 days shaded, then the next 7) and a sea-safety summary. Classic script, exposes window.PsWeather.
   Needs Leaflet 1.9; SunCalc (optional) shades nights. Fine grid data comes from the app's forecast F ([h*NN + n] Float32Arrays);
   rain/temperature/visibility/UV are fetched here for a coarse 8×5 grid, for the same hours as F, and cached for an hour. */
(function () {
'use strict';

const S = { getF: () => null, getHour: () => 0, getLang: () => 'en', h: null, isSea: null, G: null, wx: null, on: true, vis: true };
const R = Math.PI / 180, TZ = 'Asia/Nicosia';
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const isEl = () => S.getLang() === 'el';
const L2 = (en, el) => isEl() ? el : en;
const num = (x, d, el) => (+x).toLocaleString(el ? 'el-GR' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }); // same as the app's nf()
const deg = (x, y) => (Math.atan2(x, y) / R + 360) % 360; // compass bearing of the vector (east, north)
const DIRS = { en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], el: ['Β', 'ΒΑ', 'Α', 'ΝΑ', 'Ν', 'ΝΔ', 'Δ', 'ΒΔ'] };
const compass = (d, el) => DIRS[el ? 'el' : 'en'][Math.round(d / 45) % 8];

/* ---------- Scales ---------- */
// Beaufort upper limits in km/h (WMO m/s limits × 3.6); Douglas sea-state lower limits in metres (codes 2..9).
const BFT = [1.1, 5.8, 12.2, 19.8, 28.8, 38.9, 50, 61.9, 74.9, 88.2, 102.6, 117.7];
const BFT_N = { en: ['Calm', 'Light air', 'Light breeze', 'Gentle breeze', 'Moderate breeze', 'Fresh breeze', 'Strong breeze', 'Near gale', 'Gale', 'Strong gale', 'Storm', 'Violent storm', 'Hurricane'],
  el: ['Νηνεμία', 'Υποπνέων', 'Ασθενής', 'Λεπτός', 'Μέτριος', 'Λαμπρός', 'Ισχυρός', 'Σφοδρός', 'Ορμητικός', 'Θυελλώδης', 'Θύελλα', 'Σφοδρή θύελλα', 'Τυφώνας'] };
const DOUG = [.1, .5, 1.25, 2.5, 4, 6, 9, 14];
const DOUG_N = { en: ['Calm (glassy)', 'Calm (rippled)', 'Smooth', 'Slight', 'Moderate', 'Rough', 'Very rough', 'High', 'Very high', 'Phenomenal'],
  el: ['Ήρεμη (λάδι)', 'Ήρεμη (ρυτίδες)', 'Λεία', 'Ελαφρά κυματώδης', 'Μέτρια κυματώδης', 'Κυματώδης', 'Πολύ κυματώδης', 'Τρικυμιώδης', 'Πολύ τρικυμιώδης', 'Θαλασσοταραχή'] };
const bft = w => { let b = 0; while (b < 12 && w >= BFT[b]) b++; return b; };
const douglas = m => m < .02 ? 0 : 1 + DOUG.filter(t => m >= t).length;

// Colours: wind by Beaufort 0..8+, fields as [value, r, g, b, alpha] stops (bright on a dimmed satellite map).
const WC = ['#a9c6ff', '#7fd3ff', '#5ee6d6', '#7ff08a', '#e4f05a', '#ffc94a', '#ff8a3d', '#ff5252', '#ff40b0'];
const WAVE = [[0, 30, 110, 200, 0], [.25, 40, 150, 225, 80], [.5, 40, 195, 215, 115], [1.25, 90, 220, 120, 140], [2.5, 240, 215, 70, 155], [4, 255, 120, 50, 170], [6, 230, 50, 150, 185]];
const TEMP = [[0, 110, 90, 255, 120], [8, 70, 150, 255, 120], [14, 50, 200, 220, 120], [19, 90, 215, 120, 120], [24, 225, 220, 80, 125], [29, 255, 160, 60, 130], [34, 245, 80, 60, 140], [40, 200, 40, 150, 150]];
const RAIN = [[.1, 150, 200, 255, 110], [.5, 90, 160, 255, 150], [2, 60, 100, 245, 175], [5, 140, 70, 235, 195], [10, 230, 60, 200, 210]];
const CUR = [[.3, '#9fd8ff'], [.6, '#62e0d0'], [1, '#a6ec6a'], [1.5, '#ffd24a'], [Infinity, '#ff7b52']]; // km/h upper limits
const curIdx = s => CUR.findIndex(c => s < c[0]);
function lut(stops) { // 256 RGBA entries over 0..last stop
  const o = new Uint8ClampedArray(1024), max = stops[stops.length - 1][0];
  for (let i = 0; i < 256; i++) {
    const v = i / 255 * max; let j = 1;
    while (j < stops.length - 1 && v > stops[j][0]) j++;
    const a = stops[j - 1], b = stops[j], t = clamp((v - a[0]) / (b[0] - a[0]), 0, 1);
    for (let c = 0; c < 4; c++) o[i * 4 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * t;
  }
  return o;
}
const LUT = { wave: lut(WAVE), temp: lut(TEMP), rain: lut(RAIN) };
const rgb = (l, v, max) => { const i = (clamp(v / max, 0, 1) * 255 | 0) * 4; return `rgb(${l[i]} ${l[i + 1]} ${l[i + 2]})`; };

/* ---------- Grids and projection ---------- */
// Coarse grid for the extra variables: 8 × 5 = 40 points over the same extent as the app's grid.
const RG = { lat0: 34.3, lon0: 31.95, dlat: 1.5 / 4, dlon: 2.85 / 7, nx: 8, ny: 5, n: 40 };
const bil = (G, a, k, fx, fy) => {
  const c = fx | 0, r = fy | 0, x = fx - c, y = fy - r, b = k + r * G.nx + c;
  return (a[b] * (1 - x) + a[b + 1] * x) * (1 - y) + (a[b + G.nx] * (1 - x) + a[b + G.nx + 1] * x) * y;
};
const gx = (G, lon) => clamp((lon - G.lon0) / G.dlon, 0, G.nx - 1.0001), gy = (G, lat) => clamp((lat - G.lat0) / G.dlat, 0, G.ny - 1.0001);
const mercY = lat => { const s = Math.sin(lat * R); return .5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); }; // 0..1 of the world
const unmercY = y => 360 / Math.PI * Math.atan(Math.exp((.5 - y) * 2 * Math.PI)) - 90;
const toPx = (v, lat, lon) => [(lon + 180) / 360 * v.scale - v.ox, mercY(lat) * v.scale - v.oy];
const hour = () => { const F = S.getF(); return F ? clamp(Math.round(S.h ?? S.getHour() ?? 0), 0, F.T - 1) : 0; };
const sea = (lat, lon) => !S.isSea || S.isSea(lat, lon);

// Field images cover the node extent at FRES degrees, rows evenly spaced in Mercator y so a plain stretch matches the map.
const FRES = .004;
let FG = null;
function fg() {
  if (FG) return FG;
  const G = S.G, w0 = G.lon0, e = G.lon0 + (G.nx - 1) * G.dlon, s = G.lat0, n = G.lat0 + (G.ny - 1) * G.dlat;
  const w = Math.round((e - w0) / FRES), h = Math.round((n - s) / FRES), yn = mercY(n), ys = mercY(s);
  const lat = Float64Array.from({ length: h }, (_, j) => unmercY(yn + (ys - yn) * (j + .5) / h));
  const lon = Float64Array.from({ length: w }, (_, i) => w0 + (e - w0) * (i + .5) / w);
  let mask = null;
  if (S.isSea) { mask = new Uint8Array(w * h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) mask[j * w + i] = S.isSea(lat[j], lon[i]) ? 1 : 0; }
  return FG = { w, h, w0, e, s, n, mask, fx: lon.map(x => gx(G, x)), fy: lat.map(y => gy(G, y)), rx: lon.map(x => gx(RG, x)), ry: lat.map(y => gy(RG, y)) };
}
function fieldImage(paint) { // paint(data, geometry) fills RGBA
  const g = fg(), cv = document.createElement('canvas'); cv.width = g.w; cv.height = g.h;
  const cx = cv.getContext('2d'), img = cx.createImageData(g.w, g.h);
  paint(img.data, g);
  cx.putImageData(img, 0, 0);
  return cv;
}
function drawField(ctx, v, cv) { // only the visible part, so deep zooms don't stretch a huge image
  const g = fg(), [x0, y0] = toPx(v, g.n, g.w0), [x1, y1] = toPx(v, g.s, g.e);
  const a = Math.max(0, x0), b = Math.max(0, y0), c = Math.min(v.w, x1), d = Math.min(v.h, y1);
  if (c <= a || d <= b) return;
  const kx = g.w / (x1 - x0), ky = g.h / (y1 - y0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(cv, (a - x0) * kx, (b - y0) * ky, (c - a) * kx, (d - b) * ky, a, b, c - a, d - b);
}
function lutPaint(d, o, l, v, max) { if (v !== v) return; /* NaN = no data */ const i = (clamp(v / max, 0, 1) * 255 | 0) * 4; d[o] = l[i]; d[o + 1] = l[i + 1]; d[o + 2] = l[i + 2]; d[o + 3] = l[i + 3]; }
function each(v, step, cb) { // world-aligned sample points (staggered rows) inside the grid extent, so they don't jitter on pan
  const g = fg();
  for (let Y = Math.ceil(v.oy / step) * step; Y < v.oy + v.h; Y += step) {
    const lat = unmercY(Y / v.scale), off = (Math.round(Y / step) & 1) * step / 2;
    if (lat < g.s || lat > g.n) continue;
    for (let X = Math.ceil((v.ox - off) / step) * step + off; X < v.ox + v.w; X += step) {
      const lon = X / v.scale * 360 - 180;
      if (lon >= g.w0 && lon <= g.e) cb(X - v.ox, Y - v.oy, lat, lon);
    }
  }
}
function arrow(p, x, y, ang, len, head) { // ang: travel bearing in degrees
  const sx = Math.sin(ang * R), sy = -Math.cos(ang * R), hx = x + sx * len / 2, hy = y + sy * len / 2;
  p.moveTo(x - sx * len / 2, y - sy * len / 2); p.lineTo(hx, hy);
  for (const s of [-1, 1]) { const a = (ang + 180 + s * 28) * R; p.moveTo(hx, hy); p.lineTo(hx + Math.sin(a) * head, hy - Math.cos(a) * head); }
}
function strokeHalo(ctx, p, color, width) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgb(0 0 0 / .55)'; ctx.lineWidth = width + 2; ctx.stroke(p);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(p);
}
const derived = new WeakMap(); // per forecast: current as (east, north) components so it interpolates across 0°/360°
function curUV(F) {
  let d = derived.get(F);
  if (!d) {
    const u = new Float32Array(F.cur.length), w = new Float32Array(F.cur.length);
    for (let k = 0; k < u.length; k++) { u[k] = F.cur[k] * Math.sin(F.curDir[k] * R); w[k] = F.cur[k] * Math.cos(F.curDir[k] * R); }
    derived.set(F, d = { u, v: w });
  }
  return d;
}
const wxHour = (F, h) => S.wx ? S.wx.idx.get(F.times[h]) : undefined; // extra data is aligned by timestamp
let SANS = '';
const sans = () => SANS || (SANS = getComputedStyle(document.documentElement).getPropertyValue('--sans').trim() || 'sans-serif');

/* ---------- Extra variables: Open-Meteo, coarse grid, cached 1 h ---------- */
const WX_KEY = 'psarema-wx-v2';
const WXV = { temp: 'temperature_2m', rain: 'precipitation', pop: 'precipitation_probability', code: 'weather_code', vis: 'visibility', uv: 'uv_index' };
async function loadExtra(times) { // times: F's hours (GMT), the first to the last
  try { const c = JSON.parse(localStorage.getItem(WX_KEY)); if (c && Date.now() - c.at < 36e5 && c.times[0] === times[0]) return c; } catch {}
  const la = [], lo = [];
  for (let r = 0; r < RG.ny; r++) for (let c = 0; c < RG.nx; c++) { la.push((RG.lat0 + r * RG.dlat).toFixed(3)); lo.push((RG.lon0 + c * RG.dlon).toFixed(3)); }
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&hourly=${Object.values(WXV)}&start_hour=${times[0]}&end_hour=${times[times.length - 1]}&timezone=GMT&cell_selection=nearest`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = await res.json(), d = { at: Date.now(), times: j[0].hourly.time };
  for (const v of Object.values(WXV)) d[v] = j.map(p => p.hourly[v]);
  try { localStorage.setItem(WX_KEY, JSON.stringify(d)); } catch {}
  return d;
}
function buildExtra(d) { // -> { idx: time -> hour, temp/rain/...: Float32Array [h*40 + n], NaN for gaps }
  const T = d.times.length, o = { idx: new Map(d.times.map((t, i) => [t, i])) };
  for (const [k, v] of Object.entries(WXV)) {
    const a = o[k] = new Float32Array(T * RG.n);
    for (let n = 0; n < RG.n; n++) for (let h = 0; h < T; h++) a[h * RG.n + n] = d[v][n][h] ?? NaN;
  }
  return o;
}

/* ---------- Canvas layer base: a canvas over the view (+10% margin), re-placed on moveend, CSS-scaled while zooming ---------- */
const PAD = .1;
const Base = L.Layer.extend({
  options: { pane: 'overlayPane', maxDpr: 2 }, // canvas pixels per CSS pixel, at most
  onAdd() {
    const c = this._c = L.DomUtil.create('canvas', 'ps-wx-canvas leaflet-zoom-animated');
    c.style.pointerEvents = 'none';
    this.getPane().appendChild(c);
    this._ctx = c.getContext('2d');
    this._v = null;
    this._reset();
  },
  onRemove() { L.DomUtil.remove(this._c); this._c = this._v = null; },
  getEvents() { return { zoom: this._zoomAnim, zoomanim: this._zoomAnim, moveend: this._reset, resize: this._reset, viewreset: this._reset }; },
  _zoomAnim(e) {
    const m = this._map, z = e.zoom ?? m.getZoom();
    if (this._c && this._nw) L.DomUtil.setTransform(this._c, m._latLngToNewLayerPoint(this._nw, z, e.center ?? m.getCenter()), m.getZoomScale(z, this._zoom));
  },
  _reset() {
    const m = this._map, c = this._c; if (!c) return;
    const sz = m.getSize(); if (!sz.x || !sz.y) return; // hidden map: keep the last view until it is sized again
    const p = sz.multiplyBy(PAD).round(), w = sz.x + 2 * p.x, h = sz.y + 2 * p.y, dpr = Math.min(window.devicePixelRatio || 1, this.options.maxDpr);
    const tl = m.containerPointToLayerPoint(p.multiplyBy(-1)).round(), old = this._v;
    L.DomUtil.setPosition(c, tl); // also drops the zoom transform
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    }
    this._nw = m.layerPointToLatLng(tl); this._zoom = m.getZoom();
    const o = m.getPixelOrigin().add(tl); // world pixel of the canvas corner
    this._v = { w, h, dpr, scale: 256 * Math.pow(2, this._zoom), ox: o.x, oy: o.y };
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._onView(old);
  },
  _onView() { this.redraw(); },
  redraw() {
    const v = this._v, F = S.getF(); if (!v) return this;
    this._ctx.clearRect(0, 0, v.w, v.h);
    if (F && S.G) this._draw(this._ctx, v, F, hour());
    return this;
  },
  _cached(key, make) { if (this._key !== key) { this._key = key; this._img = make(); } return this._img; },
});

/* ---------- 1. Wind particles ---------- */
// Phones heat up under a full-screen canvas repainted at 60 fps: touch screens and small CPUs draw 30 fps (motion, fade and
// age are scaled by dt, so trails look the same), with ~20% fewer particles (DENS) and at most 2500 (a tablet's screen). It stops after a
// minute without input (20 s on touch screens: ~¼ of a phone's CPU while it runs) — the trails stay, still — and resumes on any touch, key
// or view change; with reduced motion it settles for 1.5 s
// after each view or hour change, then stays still. While the map zooms it keeps running on its CSS-scaled canvas (pausing froze it).
const COARSE = matchMedia('(pointer: coarse)').matches, REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const MAXP = COARSE ? 2500 : 5000, DENS = COARSE ? 260 : 210, FADE = .95, K = .07; // px² per particle, trail fade per 60 fps frame, px per frame per km/h
const GAP = 1000 / (COARSE || navigator.hardwareConcurrency <= 4 ? 30 : 60) - 4; // ms between drawn frames, with vsync slack
const IDLE = () => REDUCED.matches ? 1500 : COARSE ? 20e3 : 60e3;
// Multiplying 8-bit alpha by .95 gets stuck at 9/255, leaving a faint haze of old trails. Every 20th frame the fade is a
// filtered self-copy that also subtracts 10/255. Filters cost ~4 ms here, too much for every frame; no ctx.filter = haze stays.
let DG;
function deghost(ctx) {
  if (DG === undefined) {
    DG = 'filter' in ctx ? 'url(#ps-wx-deghost)' : '';
    if (DG) document.body.insertAdjacentHTML('beforeend', `<svg aria-hidden="true" width="0" height="0" style="position:absolute"><filter id="ps-wx-deghost" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="${FADE}" intercept="-.04"/></feComponentTransfer></filter></svg>`);
  }
  return DG;
}
const Wind = Base.extend({
  // Repainted every frame (a full-canvas fade, and a filtered copy every 20th): on touch screens 1.5× instead of 2× fills ~45% fewer pixels a
  // frame on the phone's GPU. The trails stay 1 CSS px wide, a little softer; the static layers keep 2× for their arrows and labels.
  options: { maxDpr: COARSE ? 1.5 : 2 },
  initialize(o) {
    L.setOptions(this, o);
    this._tick = this._frame.bind(this); this._f = 0; this._act = 0;
    this._px = new Float32Array(MAXP); this._py = new Float32Array(MAXP); this._age = new Float32Array(MAXP);
    this._seg = WC.map(() => new Float32Array(MAXP * 4)); this._cnt = new Int32Array(WC.length); this._n = 0;
  },
  onRemove(m) { this._stop(); Base.prototype.onRemove.call(this, m); },
  redraw() { this._start(); return this; },
  _onView(old) {
    const v = this._v, G = S.G, ctx = this._ctx; if (!G) return;
    const same = old && this._n, zoomed = same && v.scale !== old.scale;
    if (same) { // pan or zoom: keep the trails, moved (and scaled) with the map, so nothing restarts from blank; a pan keeps the particles too
      const k = v.scale / old.scale, dx = old.ox * k - v.ox, dy = old.oy * k - v.oy, c = this._c;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(c, dx * v.dpr, dy * v.dpr, c.width * k, c.height * k); ctx.restore();
      for (let i = 0; i < this._n; i++) { this._px[i] = this._px[i] * k + dx; this._py[i] = this._py[i] * k + dy; }
    } else ctx.clearRect(0, 0, v.w, v.h);
    // Grid coords: fx is linear in x; fy comes from a per-row table (Mercator).
    this._ax = 360 / v.scale / G.dlon; this._bx = (v.ox / v.scale * 360 - 180 - G.lon0) / G.dlon;
    const fy = this._fy = new Float32Array(Math.ceil(v.h) + 1);
    for (let y = 0; y < fy.length; y++) { const f = (unmercY((y + v.oy) / v.scale) - G.lat0) / G.dlat; fy[y] = f >= 0 && f <= G.ny - 1 ? Math.min(f, G.ny - 1.0001) : -1; }
    const [xa, yb] = toPx(v, G.lat0, G.lon0), [xb, ya] = toPx(v, G.lat0 + (G.ny - 1) * G.dlat, G.lon0 + (G.nx - 1) * G.dlon);
    this._box = [Math.max(0, xa), Math.max(0, ya), Math.min(v.w, xb), Math.min(v.h, yb)];
    const [a, b, c, d] = this._box, n0 = same && !zoomed ? this._n : 0; // a zoom respawns them all: zoomed out, the old ones sat packed in the old view
    this._n = c > a && d > b ? Math.min(MAXP, Math.round((c - a) * (d - b) / DENS)) : 0;
    for (let i = n0; i < this._n; i++) this._spawn(i);
    this._start();
  },
  _spawn(i) {
    const [a, b, c, d] = this._box;
    this._px[i] = a + Math.random() * (c - a); this._py[i] = b + Math.random() * (d - b); this._age[i] = 40 + Math.random() * 90;
  },
  _live() { return this._map && this._v && this._n && S.on && S.getF() && performance.now() - this._act < IDLE(); }, // also while zooming: the canvas is CSS-scaled with the map meanwhile
  _start() { this._act = performance.now(); if (!this._raf && this._live()) { this._t = 0; this._raf = requestAnimationFrame(this._tick); } },
  _stop() { cancelAnimationFrame(this._raf); this._raf = 0; },
  _frame(t) {
    this._raf = 0;
    if (!this._live()) return; // paused: hidden page, map covered, idle or no data; restarted by events
    this._raf = requestAnimationFrame(this._tick);
    if (this._t && t - this._t < GAP) return; // 30 fps on phones; also caps 90–144 Hz screens
    const F = S.getF(), ctx = this._ctx, G = S.G, nx = G.nx, k = hour() * G.n, U = F.u, V = F.v;
    const dt = this._t ? clamp((t - this._t) / 16.7, .25, 3) : 1; this._t = t;
    // Trails stay in the grid's box (+ one segment), so only that fades: zoomed out it is a fifth of the canvas. destination-out,
    // unlike destination-in, leaves the rest alone.
    const [x0, y0, x1, y1] = this._box;
    if (++this._f % 20 || !deghost(ctx)) { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = `rgb(0 0 0 / ${1 - FADE ** dt})`; ctx.fillRect(x0 - 24, y0 - 24, x1 - x0 + 48, y1 - y0 + 48); }
    else { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = deghost(ctx); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(this._c, 0, 0); ctx.restore(); }
    ctx.globalCompositeOperation = 'source-over';
    const seg = this._seg, cnt = this._cnt.fill(0), px = this._px, py = this._py, age = this._age, fyt = this._fy, ax = this._ax, bx = this._bx, mx = nx - 1.0001, s = K * dt, ny = fyt.length;
    for (let i = 0; i < this._n; i++) {
      const x = px[i], y = py[i], fx = ax * x + bx, fy = y >= 0 && y < ny ? fyt[y | 0] : -1;
      if ((age[i] -= dt) < 0 || fx < 0 || fx > mx || fy < 0) { this._spawn(i); continue; }
      const c = fx | 0, r = fy | 0, a = fx - c, b = fy - r, o = k + r * nx + c;
      const u = (U[o] * (1 - a) + U[o + 1] * a) * (1 - b) + (U[o + nx] * (1 - a) + U[o + nx + 1] * a) * b;
      const w = (V[o] * (1 - a) + V[o + 1] * a) * (1 - b) + (V[o + nx] * (1 - a) + V[o + nx + 1] * a) * b;
      const sp = Math.sqrt(u * u + w * w); let q = 0;
      while (q < 8 && sp >= BFT[q]) q++;
      const X = x + u * s, Y = y - w * s, j = cnt[q]++ * 4, sg = seg[q];
      sg[j] = x; sg[j + 1] = y; sg[j + 2] = X; sg[j + 3] = Y;
      px[i] = X; py[i] = Y;
    }
    ctx.lineWidth = 1; ctx.lineCap = 'butt'; // width 1 + butt caps keep Skia on its fast stroke path (~10× cheaper than 1.25 round)
    for (let q = 0; q < WC.length; q++) {
      const sg = seg[q], m = cnt[q] * 4; if (!m) continue;
      ctx.beginPath();
      for (let j = 0; j < m; j += 4) { ctx.moveTo(sg[j], sg[j + 1]); ctx.lineTo(sg[j + 2], sg[j + 3]); }
      ctx.strokeStyle = WC[q]; ctx.stroke();
    }
  },
});

/* ---------- 2. Waves: height field (or swell) + direction arrows ---------- */
const Waves = Base.extend({
  options: { swell: false },
  setSwell(on) { this.options.swell = !!on; return this.redraw(); },
  _draw(ctx, v, F, h) {
    const sw = this.options.swell, G = S.G, k = h * G.n;
    drawField(ctx, v, this._cached([F.at, h, sw].join(), () => fieldImage((d, g) => {
      const a = sw ? F.swell : F.wave;
      for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
        const o = j * g.w + i;
        if (!g.mask || g.mask[o]) lutPaint(d, o * 4, LUT.wave, bil(G, a, k, g.fx[i], g.fy[j]), 6);
      }
    })));
    const p = new Path2D();
    each(v, 64, (x, y, lat, lon) => {
      if (!sea(lat, lon)) return;
      const fx = gx(G, lon), fy = gy(G, lat), H = bil(G, F.wave, k, fx, fy);
      if (H >= .05) arrow(p, x, y, deg(bil(G, F.wx, k, fx, fy), bil(G, F.wy, k, fx, fy)), clamp(10 + 9 * H, 10, 40), 4 + Math.min(H, 3) * 1.2);
    });
    strokeHalo(ctx, p, 'rgb(255 255 255 / .9)', 1.5);
  },
});

/* ---------- 3. Currents: arrows coloured and sized by speed ---------- */
const Currents = Base.extend({
  _draw(ctx, v, F, h) {
    const G = S.G, k = h * G.n, c = curUV(F), ps = CUR.map(() => new Path2D());
    each(v, 46, (x, y, lat, lon) => {
      if (!sea(lat, lon)) return;
      const fx = gx(G, lon), fy = gy(G, lat), u = bil(G, c.u, k, fx, fy), w = bil(G, c.v, k, fx, fy), s = Math.hypot(u, w);
      if (s >= .03) arrow(ps[curIdx(s)], x, y, deg(u, w), 8 + 26 * Math.min(s / 1.5, 1), 4);
    });
    ps.forEach((p, i) => strokeHalo(ctx, p, CUR[i][1], 1.6));
  },
});

/* ---------- 4. Rain and cloud: precipitation field over a cloud haze, with icons for significant weather ---------- */
const icon = c => c >= 95 ? '⛈' : c >= 85 ? '🌨' : c >= 80 ? '🌦' : c >= 71 ? '🌨' : c >= 51 ? '🌧' : c >= 45 ? '🌫' : '';
function nodes(ctx, v, cb) { // coarse nodes in view, thinned to every other one when closer than 36 px
  const step = (RG.dlon / 360 * v.scale) < 36 ? 2 : 1;
  for (let r = 0; r < RG.ny; r += step) for (let c = 0; c < RG.nx; c += step) {
    const [x, y] = toPx(v, RG.lat0 + r * RG.dlat, RG.lon0 + c * RG.dlon);
    if (x > -20 && y > -20 && x < v.w + 20 && y < v.h + 20) cb(x, y, r * RG.nx + c);
  }
}
const Rain = Base.extend({
  _draw(ctx, v, F, h) {
    const G = S.G, k = h * G.n, X = S.wx, q = wxHour(F, h);
    drawField(ctx, v, this._cached([F.at, h, q].join(), () => fieldImage((d, g) => {
      for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
        const o = (j * g.w + i) * 4, p = q == null ? 0 : bil(RG, X.rain, q * RG.n, g.rx[i], g.ry[j]);
        if (p >= .1) { lutPaint(d, o, LUT.rain, p, 10); continue; }
        const cl = bil(G, F.cloud, k, g.fx[i], g.fy[j]);
        if (cl > 15) { d[o] = 222; d[o + 1] = 228; d[o + 2] = 235; d[o + 3] = (cl - 15) * 1.05; }
      }
    })));
    if (q == null) return;
    ctx.font = `20px ${sans()}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgb(0 0 0 / .7)'; ctx.shadowBlur = 4;
    nodes(ctx, v, (x, y, n) => { const s = icon(X.code[q * RG.n + n]); if (s) ctx.fillText(s, x, y); });
    ctx.shadowBlur = 0;
  },
});

/* ---------- 5. Air temperature: field + labels ---------- */
const Temp = Base.extend({
  _draw(ctx, v, F, h) {
    const X = S.wx, q = wxHour(F, h); if (q == null) return;
    drawField(ctx, v, this._cached([F.at, h, q].join(), () => fieldImage((d, g) => {
      for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) lutPaint(d, (j * g.w + i) * 4, LUT.temp, bil(RG, X.temp, q * RG.n, g.rx[i], g.ry[j]), 40);
    })));
    ctx.font = `600 12px ${sans()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgb(0 0 0 / .65)'; ctx.fillStyle = '#fff';
    nodes(ctx, v, (x, y, n) => { const t = X.temp[q * RG.n + n]; if (isFinite(t)) { const s = Math.round(t) + '°'; ctx.strokeText(s, x, y); ctx.fillText(s, x, y); } });
  },
});

const layers = { wind: new Wind(), waves: new Waves(), currents: new Currents(), rain: new Rain(), temp: new Temp() };
const redrawAll = () => { for (const l of Object.values(layers)) if (l._map) l.redraw(); };

/* ---------- Point values, summary, spot card ---------- */
function at(lat, lon, h) {
  const F = S.getF(), G = S.G; if (!F || !G) return null;
  h = clamp(h | 0, 0, F.T - 1);
  const fx = gx(G, lon), fy = gy(G, lat), k = h * G.n, b = a => bil(G, a, k, fx, fy), c = curUV(F), cu = b(c.u), cv = b(c.v);
  const o = { t: Date.parse(F.times[h] + 'Z'), wind: b(F.wind), gust: b(F.gust), windDir: deg(-b(F.u), -b(F.v)), wave: b(F.wave), period: b(F.period),
    swell: b(F.swell), waveDir: deg(-b(F.wx), -b(F.wy)), cur: Math.hypot(cu, cv), curDir: deg(cu, cv), sst: b(F.sst), cloud: b(F.cloud), press: b(F.press) };
  const X = S.wx, q = wxHour(F, h);
  if (q != null) {
    const rx = gx(RG, lon), ry = gy(RG, lat), r = a => bil(RG, a, q * RG.n, rx, ry);
    Object.assign(o, { temp: r(X.temp), rain: r(X.rain), pop: r(X.pop), vis: r(X.vis), uv: r(X.uv), code: X.code[q * RG.n + Math.round(ry) * RG.nx + Math.round(rx)] });
  }
  return o;
}

// Thresholds: shore anglers on rocks and breakwaters, small open boats (< 7 m), freedivers/spearfishers. Thunder rules out all three.
const SAFE = {
  shore: o => o.wave <= 1.5 && o.wind < BFT[5] && o.gust < 65,             // up to Bft 5, waves ≤ 1.5 m
  boat: o => o.wave <= 1 && o.wind < BFT[4] && o.gust < 40 && !(o.vis < 1000), // up to Bft 4, waves ≤ 1 m, no fog
  spear: o => o.wave <= .5 && o.wind < BFT[3] && o.gust < 30 && o.cur < 1.5 && !(o.vis < 1000), // up to Bft 3, smooth sea, weak current
};
const ACT = { en: { shore: 'shore fishing', boat: 'small boat', spear: 'spearfishing' }, el: { shore: 'ψάρεμα από ακτή', boat: 'μικρό σκάφος', spear: 'ψαροντούφεκο' } };
function summary(lat, lon, h) {
  const o = at(lat, lon, h ?? hour()); if (!o) return null;
  const b = bft(o.wind), d = douglas(o.wave), thunder = o.code >= 95, safeFor = {};
  for (const k in SAFE) safeFor[k] = !thunder && SAFE[k](o);
  const text = {};
  for (const lg of ['en', 'el']) {
    const el = lg === 'el', n = (x, dd) => num(x, dd, el), ok = [], no = [];
    for (const k in safeFor) (safeFor[k] ? ok : no).push(ACT[lg][k]);
    const warn = [];
    if (thunder) warn.push(el ? 'Πιθανές καταιγίδες.' : 'Thunderstorms likely.');
    if (o.vis < 1000) warn.push(el ? `Ομίχλη, ορατότητα ${n(o.vis / 1000, 1)} km.` : `Fog, visibility ${n(o.vis / 1000, 1)} km.`);
    if (o.rain >= .5) warn.push(el ? `Βροχή ${n(o.rain, 1)} mm/h.` : `Rain ${n(o.rain, 1)} mm/h.`);
    if (o.uv >= 8) warn.push(el ? `UV ${n(o.uv, 0)}: προστασία από τον ήλιο.` : `UV ${n(o.uv, 0)}: cover up.`);
    text[lg] = (el
      ? `Άνεμος ${compass(o.windDir, el)} ${n(o.wind, 0)} km/h, ριπές ${n(o.gust, 0)} (${b} Μποφόρ, ${BFT_N.el[b].toLowerCase()}). Κύμα ${n(o.wave, 1)} m, ${DOUG_N.el[d].toLowerCase()}, ${n(o.period, 0)} s.`
      : `Wind ${compass(o.windDir, el)} ${n(o.wind, 0)} km/h, gusts ${n(o.gust, 0)} (Bft ${b}, ${BFT_N.en[b].toLowerCase()}). Waves ${n(o.wave, 1)} m, ${DOUG_N.en[d].toLowerCase()}, ${n(o.period, 0)} s.`)
      + (warn.length ? ' ' + warn.join(' ') : '')
      + (ok.length ? (el ? ` Κατάλληλο για: ${ok.join(', ')}.` : ` OK for: ${ok.join(', ')}.`) : '')
      + (no.length ? (el ? ` Δεν συνιστάται: ${no.join(', ')}.` : ` Not advised: ${no.join(', ')}.`) : '');
  }
  return { text, beaufort: b, seaState: d, safeFor, at: o };
}

let chartId = 0;
function spotCard(lat, lon) {
  const F = S.getF(), el = isEl();
  if (!F) return `<div class="ps-weather ps-wx-card"><p class="ps-wx-text">${L2('Forecast loading…', 'Φόρτωση πρόγνωσης…')}</p></div>`;
  const T = F.T, P = Array.from({ length: T }, (_, h) => at(lat, lon, h)), h0 = hour(), sm = summary(lat, lon, h0), loc = el ? 'el-GR' : 'en-GB';
  const W = 340, x0 = 2, x1 = 338, dx = (x1 - x0) / T, X = h => x0 + h * dx, f1 = x => x.toFixed(1), bw = f1(dx > 3 ? dx - .8 : dx), bo = dx > 3 ? .4 : 0; // ~200 h: bars without gaps
  const fmtH = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }), fmtD = new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: TZ });
  const top = 12, bot = 172, wy = [26, 70], vy = [80, 108], ry = [118, 134], ty = [146, 170], out = [];
  const now = P.findIndex(o => o.t + 36e5 > Date.now()), pid = 'ps-wx-past' + ++chartId; // the past hours before it, hatched as in the timeline (an id per chart: the drawer and the phone sheet can both hold one)
  if (now > 0) out.push(`<pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="6" fill="#fff" fill-opacity=".09"/></pattern>`,
    `<rect x="${x0}" y="${top}" width="${f1(X(now) - x0)}" height="${bot - top}" fill="url(#${pid})"/>`);
  // Nights (SunCalc at the spot), day boundaries in Cyprus time
  if (window.SunCalc) {
    const t0 = P[0].t, t1 = t0 + T * 36e5, tx = t => clamp(x0 + (t - t0) / 36e5 * dx, x0, x1), sun = [];
    for (let t = t0 - 864e5; t < t1 + 864e5; t += 864e5) { const s = SunCalc.getTimes(new Date(t), lat, lon); sun.push([+s.sunrise, +s.sunset]); }
    out.push(`<rect class="ps-wx-night" x="${x0}" y="${top}" width="${f1(tx(sun[0][0]) - x0)}" height="${bot - top}"/>`);
    for (let i = 0; i < sun.length; i++) {
      const a = tx(sun[i][1]), b = i + 1 < sun.length ? tx(sun[i + 1][0]) : x1;
      if (b > a) out.push(`<rect class="ps-wx-night" x="${f1(a)}" y="${top}" width="${f1(b - a)}" height="${bot - top}"/>`);
    }
  }
  P.forEach((o, h) => {
    const lh = +fmtH.format(o.t);
    if (lh === 0) out.push(`<line class="ps-wx-day" x1="${f1(X(h))}" x2="${f1(X(h))}" y1="${top}" y2="${bot}"/>`);
    if (lh === 12) out.push(`<text class="ps-wx-axis" x="${f1(X(h + .5))}" y="184" text-anchor="middle">${fmtD.format(o.t)}</text>`);
  });
  // Wind bars by Beaufort, gust line, direction arrows every 3 h
  const wmax = Math.max(30, Math.ceil(Math.max(...P.map(o => o.gust)) / 10) * 10), wY = x => wy[1] - x / wmax * (wy[1] - wy[0]);
  P.forEach((o, h) => out.push(`<rect x="${f1(X(h) + bo)}" y="${f1(wY(o.wind))}" width="${bw}" height="${f1(wy[1] - wY(o.wind))}" fill="${WC[Math.min(bft(o.wind), 8)]}" opacity=".85"/>`));
  out.push(`<polyline class="ps-wx-gust" points="${P.map((o, h) => f1(X(h + .5)) + ',' + f1(wY(o.gust))).join(' ')}"/>`);
  for (let h = 1, st = T > 96 ? 6 : 3; h < T; h += st) out.push(`<path class="ps-wx-dir" d="M0-4L3 3 0 1.5-3 3Z" transform="translate(${f1(X(h + .5))} 19) rotate(${Math.round(P[h].windDir + 180)})"/>`);
  // Wave bars
  const vmax = Math.max(1.5, ...P.map(o => o.wave)), vY = x => vy[1] - x / vmax * (vy[1] - vy[0]);
  P.forEach((o, h) => out.push(`<rect x="${f1(X(h) + bo)}" y="${f1(vY(o.wave))}" width="${bw}" height="${f1(vy[1] - vY(o.wave))}" fill="${rgb(LUT.wave, Math.max(o.wave, .3), 6)}" opacity=".9"/>`));
  // Rain bars (opacity = probability) and air temperature line, when the extra data is in
  const hasWx = P.some(o => isFinite(o.temp)), rains = P.map(o => isFinite(o.rain) ? o.rain : 0), rmax = Math.max(2, ...rains);
  P.forEach((o, h) => { if (rains[h] >= .05) out.push(`<rect x="${f1(X(h) + bo)}" y="${f1(ry[1] - rains[h] / rmax * (ry[1] - ry[0]))}" width="${bw}" height="${f1(rains[h] / rmax * (ry[1] - ry[0]))}" fill="${rgb(LUT.rain, Math.max(rains[h], 1), 10)}" opacity="${f1(.35 + .65 * (o.pop || 0) / 100)}"/>`); });
  const temps = P.map(o => o.temp).filter(isFinite), tmin = Math.min(...temps), tmax = Math.max(...temps), tY = x => ty[1] - (x - tmin + 1) / (tmax - tmin + 2) * (ty[1] - ty[0]);
  if (hasWx) out.push(`<polyline class="ps-wx-temp" points="${P.map((o, h) => isFinite(o.temp) ? f1(X(h + .5)) + ',' + f1(tY(o.temp)) : '').filter(Boolean).join(' ')}"/>`);
  // Labels and cursor
  const n = (x, d) => num(x, d, el), lab = (y, s) => out.push(`<text class="ps-wx-label" x="${x0 + 3}" y="${y}">${s}</text>`);
  lab(wy[0] + 7, `${L2('Wind', 'Άνεμος')} · ${L2('gusts to', 'ριπές έως')} ${n(Math.max(...P.map(o => o.gust)), 0)} km/h`);
  lab(vy[0] + 7, `${L2('Waves', 'Κύμα')} · ${L2('max', 'έως')} ${n(Math.max(...P.map(o => o.wave)), 1)} m`);
  lab(ry[0] + 7, hasWx ? `${L2('Rain', 'Βροχή')} · ${n(rains.reduce((a, b) => a + b, 0), 1)} mm` : L2('Rain · loading…', 'Βροχή · φόρτωση…'));
  if (hasWx) lab(ty[0] + 5, `${L2('Air', 'Αέρας')} ${n(tmin, 0)}–${n(tmax, 0)} °C`);
  const cx = X(h0 + .5), when = new Intl.DateTimeFormat(loc, { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(P[h0].t);
  out.push(`<line class="ps-wx-cursor" x1="${f1(cx)}" x2="${f1(cx)}" y1="${top}" y2="${bot}"/>`,
    `<text class="ps-wx-axis ps-wx-now" x="${f1(clamp(cx, 34, W - 34))}" y="9" text-anchor="middle">${when}</text>`);
  const chips = Object.keys(SAFE).map(k => `<span class="ps-wx-chip ${sm.safeFor[k] ? 'ok' : 'no'}">${sm.safeFor[k] ? '✓' : '✕'} ${ACT[el ? 'el' : 'en'][k]}</span>`).join('');
  return `<div class="ps-weather ps-wx-card">
<div class="ps-wx-head"><b>${el ? `${sm.beaufort} Μποφόρ` : `Bft ${sm.beaufort}`}</b><span>${BFT_N[el ? 'el' : 'en'][sm.beaufort]}</span><b>Douglas ${sm.seaState}</b><span>${DOUG_N[el ? 'el' : 'en'][sm.seaState]}</span></div>
<p class="ps-wx-text">${sm.text[el ? 'el' : 'en']}</p>
<div class="facts ps-wx-chips">${chips}</div>
<svg class="ps-wx-chart" viewBox="0 0 ${W} 188" role="img" aria-label="${L2('Weather, the past 2 days and the next 7', 'Καιρός, οι 2 προηγούμενες και οι 7 επόμενες ημέρες')}">${out.join('')}</svg>
</div>`;
}

/* ---------- Legends ---------- */
const grad = stops => { const max = stops[stops.length - 1][0]; return `linear-gradient(to right, ${stops.map(s => `rgb(${s[1]} ${s[2]} ${s[3]}) ${(s[0] / max * 100).toFixed(1)}%`).join(', ')})`; };
function bar(title, stops, ticks, unit, note = '') {
  const max = stops[stops.length - 1][0];
  return `<div class="ps-weather ps-wx-legend"><div class="ps-wx-ltitle">${title}</div><div class="ps-wx-bar" style="background:${grad(stops)}"></div>
<div class="ps-wx-ticks">${ticks.map((t, i) => `<span style="left:${(t / max * 100).toFixed(1)}%">${isEl() ? String(t).replace('.', ',') : t}${i === ticks.length - 1 ? ' ' + unit : ''}</span>`).join('')}</div>${note}</div>`;
}
function legend(name) {
  const el = isEl(), lg = el ? 'el' : 'en';
  if (name === 'wind') return `<div class="ps-weather ps-wx-legend"><div class="ps-wx-ltitle">${L2('Wind · Beaufort and km/h', 'Άνεμος · Μποφόρ και km/h')}</div>
<div class="ps-wx-cells">${WC.map((c, b) => `<span title="${BFT_N[lg][b]}"><i style="background:${c}"></i><b>${b}${b === 8 ? '+' : ''}</b><small>${b ? Math.round(BFT[b - 1]) : 0}</small></span>`).join('')}</div></div>`;
  if (name === 'waves') {
    const sw = layers.waves.options.swell;
    return bar(sw ? L2('Swell height', 'Ύψος αποθαλασσιάς') : L2('Wave height · arrows show travel', 'Ύψος κύματος · τα βέλη δείχνουν την πορεία'), WAVE, [0, 1, 2.5, 4, 6], 'm',
      `<div class="ps-wx-note">Douglas: ${[2, 3, 4, 5, 6].map(d => `${d} ${DOUG_N[lg][d].toLowerCase()}`).join(' · ')}</div>`);
  }
  if (name === 'currents') return `<div class="ps-weather ps-wx-legend"><div class="ps-wx-ltitle">${L2('Current · km/h', 'Ρεύμα · km/h')}</div>
<div class="ps-wx-cells">${CUR.map((c, i) => `<span title="${i ? num(CUR[i - 1][0], 1, el) : 0}${isFinite(c[0]) ? '–' + num(c[0], 1, el) : '+'} km/h"><i style="background:${c[1]}"></i><small>${i ? num(CUR[i - 1][0], 1, el) : 0}${isFinite(c[0]) ? '' : '+'}</small></span>`).join('')}</div>
<div class="ps-wx-note">1 ${L2('knot', 'κόμβος')} = ${num(1.85, 2, el)} km/h</div></div>`;
  if (name === 'rain') return bar(L2('Rain · mm/h, white haze = cloud', 'Βροχή · mm/h, λευκή άχνα = σύννεφα'), RAIN, [.1, 2, 5, 10], 'mm/h',
    `<div class="ps-wx-note">🌫 ${L2('fog', 'ομίχλη')} · 🌧 ${L2('rain', 'βροχή')} · 🌦 ${L2('showers', 'μπόρες')} · ⛈ ${L2('thunder', 'καταιγίδα')}</div>`);
  if (name === 'temp') return bar(L2('Air temperature', 'Θερμοκρασία αέρα'), TEMP, [0, 10, 20, 30, 40], '°C');
  return '';
}

/* ---------- Public API ---------- */
window.PsWeather = {
  layers,
  ready: null, // resolves when the rain/temperature data is in (or failed)
  attach(o) {
    S.map = o.map; S.getF = o.getForecast || S.getF; S.getHour = o.getHour || S.getHour; S.getLang = o.getLang || S.getLang; S.isSea = o.isSea || null;
    const C = o.grid; S.G = { lat0: C.lat0, lon0: C.lon0, dlat: C.step, dlon: C.step, nx: C.nx, ny: C.ny, n: C.nx * C.ny }; FG = null;
    if (o.pane) {
      if (!o.map.getPane(o.pane)) { const p = o.map.createPane(o.pane); p.style.zIndex = 405; }
      o.map.getPane(o.pane).style.pointerEvents = 'none';
      for (const l of Object.values(layers)) l.options.pane = o.pane;
    }
    // The wind runs only while its map can be seen: not with the page hidden, the map off-screen, a modal open, or the phone's
    // sheet open full (.stage.m-full; on a phone on its side the sheet is a side panel, css/mobile.css, and the map stays in view).
    const stage = o.map.getContainer().closest('.stage'), modals = document.querySelectorAll('.modal');
    const SIDE = matchMedia('(orientation: landscape) and (max-height: 500px) and (max-width: 960px) and (min-width: 560px)');
    const covered = () => stage?.classList.contains('m-full') && !SIDE.matches || [...modals].some(m => !m.hidden);
    const setOn = () => { const on = !document.hidden && S.vis && !covered(); if (on !== S.on) { S.on = on; if (on) layers.wind._start(); } };
    document.addEventListener('visibilitychange', setOn);
    SIDE.addEventListener('change', setOn);
    const mo = new MutationObserver(setOn);
    if (stage) mo.observe(stage, { attributeFilter: ['class'] });
    for (const m of modals) mo.observe(m, { attributeFilter: ['hidden'] });
    setOn(); // the first-run guide may be open already
    if (window.IntersectionObserver) new IntersectionObserver(es => { S.vis = es[es.length - 1].isIntersecting; setOn(); }).observe(o.map.getContainer());
    const wake = () => { if (!REDUCED.matches) layers.wind._start(); }; // after the idle stop; cheap when running (one time stamp)
    for (const e of ['pointerdown', 'pointermove', 'wheel', 'keydown']) document.addEventListener(e, wake, { capture: true, passive: true });
    this.ready = loadExtra(S.getF().times).then(d => { S.wx = buildExtra(d); redrawAll(); }, e => console.warn('Weather extras unavailable:', e.message));
    return this;
  },
  setHour(h) { S.h = h; redrawAll(); return this; },
  legend,
  spotCard,
  summary,
  at, // the readings alone, without summary()'s text: cheap enough for every hour

  beaufort: bft,
  douglas,
  names: { en: { bft: BFT_N.en, sea: DOUG_N.en }, el: { bft: BFT_N.el, sea: DOUG_N.el } }, // Beaufort and Douglas words (js/instruments.js captions)
};
})();
