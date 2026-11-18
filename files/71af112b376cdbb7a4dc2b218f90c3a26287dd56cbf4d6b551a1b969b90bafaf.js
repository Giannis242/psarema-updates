'use strict';
// Psarema round 17 day map (agent D): the sea state at each 250 m cell, from the forecast the app already has and the cell's own
// exposure (data/exposure.bin: the open-water fetch in 16 directions, scripts/seastate/build-exposure.mjs). Lee shores are calm and
// exposed ones are not, and which is which changes with the day's wind and swell direction. Sea state only: not a fish claim.
// The numbers are a-priori physics, not fitted (eval/LOG.md "Round 17 day map"):
//   wind sea  = the smaller of the forecast's wind sea and the fetch-limited height 0.0045 x wind (km/h) x sqrt(fetch upwind, km)
//               (Shore Protection Manual, deep water: 0.0016 x U x sqrt(F / g));
//   swell     = the forecast's swell x clamp(sqrt(fetch toward where the swell comes from / 25 km), .15, 1): it bends round a headland a little;
//   waves here = sqrt(wind sea^2 + swell^2);   wind here = wind x (1 - .5 exp(-fetch upwind / 3 km)): land just upwind takes up to half.
// The forecast's wind sea is sqrt(waves^2 - swell^2); a forecast without a swell part (the benches' ERA5 days) takes as wind sea what the
// wind could raise over 128 km and calls the rest swell, from the waves' own direction.
window.PsSea = (() => {
  const KM = Float32Array.from({ length: 16 }, (_, q) => .25 * 2 ** (.6 * q)), K = .0045, S8 = 8 / Math.PI;
  // PURE, for the main thread and for a worker alike: only its arguments. E: the exposure planes (Uint8Array, 8 x n), n: cells per plane.
  // Fetch in km of cell i looking toward the compass vector (e east, nth north), between the two nearest of the 16 directions.
  function fetchKm(E, n, i, e, nth) {
    let s = Math.atan2(e, nth) * S8; if (s < 0) s += 16;
    const k = s | 0, f = s - k, k1 = (k + 1) & 15, a = KM[E[(k >> 1) * n + i] >> ((k & 1) << 2) & 15], b = KM[E[(k1 >> 1) * n + i] >> ((k1 & 1) << 2) & 15];
    return a + (b - a) * f;
  }
  // The cell's own sea for one hour. wave: forecast wave height (m); sw, sx, sy: the swell's height and its vector TOWARD (east, north), m;
  // u, v: wind toward (east, north), km/h. Fills o[0] waves here (m), o[1] the wind factor here (0.5..1), o[2] wind sea here, o[3] swell here; returns o[0].
  function at(E, n, i, wave, sw, sx, sy, u, v, o) {
    const U = Math.sqrt(u * u + v * v), fw = U > .01 ? fetchKm(E, n, i, -u, -v) : 128;
    if (sw > wave) sw = wave;
    const ws = Math.min(Math.sqrt(wave * wave - sw * sw), K * U * Math.sqrt(fw));
    let sl = sw; // a swell with no direction (the bench's climate): the mean of the 16 directions
    if (sx * sx + sy * sy > 1e-6) sl *= Math.min(1, Math.max(.15, Math.sqrt(fetchKm(E, n, i, -sx, -sy) / 25)));
    else if (sw > .01) { let t = 0; for (let k = 0; k < 16; k++) t += Math.min(1, Math.max(.15, Math.sqrt(KM[E[(k >> 1) * n + i] >> ((k & 1) << 2) & 15] / 25))); sl *= t / 16; }
    o[0] = Math.sqrt(ws * ws + sl * sl); o[1] = 1 - .5 * Math.exp(-fw / 3); o[2] = ws; o[3] = sl;
    return o[0];
  }
  // Per forecast (by identity), on its nodes [hour * NN + node]: the swell's height and vector. Pure too: reads only F's arrays.
  const FM = new WeakMap();
  function fields(F) {
    let m = FM.get(F); if (m) return m;
    const n = F.wave.length, sw = new Float32Array(n), sx = new Float32Array(n), sy = new Float32Array(n), R = Math.PI / 180;
    let part = false; if (F.swell) for (let k = 0; k < n && !part; k++) part = F.swell[k] > 0;
    let dirs = false; if (part && F.swellDir) for (let k = 0; k < n && !dirs; k++) dirs = F.swellDir[k] > 0;
    for (let k = 0; k < n; k++) {
      const w = F.wave[k] || 0;
      const s = sw[k] = part ? Math.min(F.swell[k] || 0, w) : Math.sqrt(Math.max(0, w * w - Math.min(w, K * Math.hypot(F.u[k], F.v[k]) * Math.sqrt(128)) ** 2));
      if (dirs) { sx[k] = -s * Math.sin(F.swellDir[k] * R); sy[k] = -s * Math.cos(F.swellDir[k] * R); }
      else if (w > .01) { sx[k] = F.wx[k] / w * s; sy[k] = F.wy[k] / w * s; }
    }
    FM.set(F, m = { sw, sx, sy, part, dirs }); return m;
  }

  /* ---------- the app's side: the file, the switch, the map layer ---------- */
  let E = (typeof window !== 'undefined' && window.PsSeaGrid) || null, loading = null; // PsSeaGrid: the hour worker's copy (model.js hwGlobals), there only when the per-cell gate is on
  const set = u => { E = u; return E; };
  if (typeof window !== 'undefined' && window.PSAREMA_EXPOSURE_B64) set(b64(window.PSAREMA_EXPOSURE_B64)); // the Node benches (scripts/seastate/cache/exposure-b64.js)
  const load = (url = 'data/exposure.bin') => E ? Promise.resolve(E) : loading ||= fetch(url).then(async r => {
    if (!r.ok) throw new Error('exposure.bin: ' + r.status);
    let u = new Uint8Array(await r.arrayBuffer());
    if (u[0] === 0x1f && u[1] === 0x8b) u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    const hl = new DataView(u.buffer, u.byteOffset).getUint32(0, true), head = JSON.parse(new TextDecoder().decode(u.subarray(4, 4 + hl)));
    if (head.w !== W || head.h !== H) throw new Error('exposure.bin: another grid');
    return set(u.subarray(4 + hl));
  }).catch(e => { loading = null; throw e; });
  // Waves here at cell i in hour h (m), exact, or NaN before the file is on this thread (load()). out (optional): [waves, wind factor, wind sea, swell].
  // The app's fast path is bands() below; this one is for the benches and the per-cell gate.
  const O = new Float64Array(4);
  function waveAt(i, h, out = O) {
    if (!E || !F) return NaN;
    const m = fields(F), b = h * NN;
    return at(E, N, i, bil(F.wave, b, i), bil(m.sw, b, i), bil(m.sx, b, i), bil(m.sy, b, i), bil(F.u, b, i), bil(F.v, b, i), out);
  }

  // Wave bands: 0 calm (under .3 m), 1 (.3-.6), 2 (.6-1), 3 (1-1.5), 4 rough (1.5 m and over); 255 = land or no data. The colours are the layer's (ABGR).
  const BANDS = [[.3, 0], [.6, 0x5cd6d28c], [1, 0x8c42b4f0], [1.5, 0xa02f6fe8], [Infinity, 0xb43a3ad2]];
  /* ---------- round 17 phase 2: the hour's field from a worker (js/sea-worker.js), kept by hour ----------
     PsSea.bands(h)    -> Uint8Array(N), a band per cell, for hour h of the current forecast; or null while the worker makes it (it then
                          fires 'ps:sea' on document, detail { h }). Never computes on this thread. Read only: the array is shared.
     PsSea.bandAt(i,h) -> the band of one cell, or -1 when the hour is not in yet (does not ask for it).
     The worker fetches data/exposure.bin itself, so this thread holds no exposure grid and decodes nothing. The 6 latest hours are kept.
     ponytail: one hour in flight, the latest asked wins; no Worker or no createImageBitmap = no field (bands() stays null), nothing breaks. */
  const KEEP = 6, cache = new Map(), stats = { asks: 0, got: 0, mainMs: 0, workerMs: 0 }; // mainMs: this thread's time in ask + answer, summed
  let wk = null, wkF = null, busy = -1, want = -1, cv = null, part = null, on = false;
  function ask(h) {
    if (wk === false || typeof Worker !== 'function' || !F || !(h >= 0 && h < F.T)) return;
    const t0 = performance.now();
    try {
      if (!wk) {
        const mask = new Uint8Array(N); for (let i = 0; i < N; i++) if (depth[i] && !northMask[i]) mask[i] = 1;
        wk = new Worker('js/sea-worker.js'); wk.onmessage = got; wk.onerror = e => { e.preventDefault?.(); console.warn('sea worker off:', e.message); wk.terminate(); wk = false; };
        wk.postMessage({ init: { W, H, N, NN, nx: C.nx, ny: C.ny, lon0: C.lon0, lat0: C.lat0, step: C.step, WEST, NORTH, RES, mask, mrow: typeof MROW !== 'undefined' ? MROW : null, colors: BANDS.map(b => b[1]), limits: BANDS.map(b => b[0]) } });
      }
      if (wkF !== F) { cache.clear(); busy = -1; wkF = F; wk.postMessage({ F: { at: F.at, T: F.T, wave: F.wave, swell: F.swell, swellDir: F.swellDir, u: F.u, v: F.v, wx: F.wx, wy: F.wy } }); }
      if (busy >= 0) { want = h; return; }
      busy = h; want = -1; stats.asks++; wk.postMessage({ h, at: F.at, bmp: on });
    } catch (e) { console.warn('sea worker off:', e.message); wk = false; }
    finally { stats.mainMs += performance.now() - t0; }
  }
  function got({ data: m }) {
    const t0 = performance.now(); busy = -1;
    if (m.fail) { console.warn('sea worker off:', m.fail); wk.terminate(); wk = false; return; }
    if (F && m.at === F.at) {
      cache.delete(m.h); cache.set(m.h, { a: m.a, bmp: m.bmp || null }); stats.got++; stats.workerMs += m.ms;
      while (cache.size > KEEP) { const k = cache.keys().next().value; cache.get(k).bmp?.close?.(); cache.delete(k); }
      if (on && m.h === state.h) paint();
      document.dispatchEvent(new CustomEvent('ps:sea', { detail: { h: m.h } }));
    }
    if (want >= 0 && !ready(want)) ask(want);
    stats.mainMs += performance.now() - t0;
  }
  const ready = h => { const e = wkF === F && cache.get(h); return e && (!on || e.bmp) ? e : null; };
  function bands(h) { const e = wkF === F && cache.get(h); if (e) return e.a; if (wk !== false) ask(h); return null; }
  const bandAt = (i, h) => { const e = wkF === F && cache.get(h); return e ? e.a[i] : -1; };

  // The map layer "Sea by coast": the hour's picture, made in the worker, drawn here with one drawImage. In the heat's own box (map.js heatBox).
  function paint() { // round 17 Z: the picture off screen (cv), drawn into its part of the heat's view box (map.js ViewBox), inside the shoreline clip
    if (!cv) { cv = document.createElement('canvas'); cv.width = W; cv.height = H; part = heat.add((g, V) => gridImage(g, V, cv), 'sea-coast', 'sea'); part.on = false; }
    const e = on && F ? ready(state.h) : null;
    if (!on) { part.on = false; heat.draw(part); return; }
    if (!e) { ask(state.h); return; } // the last hour's picture stays until this one is in
    const t0 = performance.now(), g = cv.getContext('2d');
    g.clearRect(0, 0, W, H); g.drawImage(e.bmp, 0, 0); part.on = true; heat.draw(part);
    stats.mainMs += performance.now() - t0;
  }
  function show(v) { on = !!v; paint(); }
  // One line for a spot's card when the sea there is rough this hour: waves of 1.5 m or more at the cell (the worker's band when it is in,
  // else the forecast's open-sea wave), or wind of Beaufort 6 or more (39 km/h). Sea state, never fish. '' otherwise.
  function warn(i, h) {
    if (!F || !(h >= 0 && h < F.T) || !depth[i]) return '';
    const b = h * NN, k = bandAt(i, h), w = bil(F.wave, b, i), ws = Math.hypot(bil(F.u, b, i), bil(F.v, b, i));
    const rough = k >= 0 ? k === 4 : w >= 1.5, bf = ws >= 39 ? window.PsWeather?.beaufort?.(ws) ?? 6 : 0;
    return rough || bf ? tr('d_seaWarn', rough ? (Math.round(w * 10) / 10).toFixed(1) : '', bf) : '';
  }
  if (typeof document === 'object' && typeof addEventListener === 'function') addEventListener('DOMContentLoaded', () => {
    if (typeof map === 'undefined' || typeof heatBox === 'undefined' || $('#lay-seacoast')) return;
    document.addEventListener('ps:hour', () => { if (on) paint(); }); // js/map.js renderNow
    const after = $('#lay-bands')?.closest('.lp-sub') || $('#lay-heat')?.closest('label'); if (!after) return;
    const row = document.createElement('div'), lab = document.createElement('label'); row.className = 'lp-sub'; row.append(lab);
    lab.innerHTML = `<input type="checkbox" id="lay-seacoast"> <span data-i18n="d_seaCoast">${esc(tr('d_seaCoast'))}</span>`; lab.dataset.i18nTitle = 'd_seaCoastTip'; lab.title = tr('d_seaCoastTip');
    after.after(row);
    const box = lab.firstChild; box.checked = !!state.layers?.seacoast;
    box.addEventListener('change', () => { (state.layers ||= {}).seacoast = box.checked; savePrefs(); show(box.checked); });
    if (box.checked) show(true);
  });
  // score: false = the shipped sea gate (js/model.js `// round 17 day map`); true = the per-cell one, once grid() is in. Off until it passes the bench.
  return { fetchKm, at, fields, load, set, grid: () => E, waveAt, bands, bandAt, warn, show, stats, BANDS, score: !!E && typeof document === 'undefined' }; // in the worker: on when it was given the grid
})();

// round 17 H dayLine: one short line of how the sea lies by coast on the picked day (js/map.js drawWhen shows it in the hour's tags), from
// this file's own wave bands at the day's midday hour, over the sea cells that touch the shore. A coast is calm when 70 % of its shore water
// is under 0.6 m (bands 0–1) and rough when 40 % is 1 m or more (bands 3–4): "Calm on the south coast, rough on the west", "Rough on every
// coast", or nothing when no coast stands out. Coasts by position: west of 32.5° E, east from 33.9° E, the north-west from 34.95° N between
// them, the south the rest (the north has no data). Sea state only, never a fish claim. Cached per forecast, day and language; the midday
// field is asked of the worker once, and the tags are redrawn when it comes in ('ps:sea').
// PsSea.dayLine(h, first) -> '' or the line, in the app's language (first: the forecast's present hour, unused: every day gets its own line).
if (typeof document === 'object') PsSea.dayLine = (() => {
  const by = new Map(), want = new Set(); let forF = null, shore = null;
  function coasts() { // [cell, coast] pairs: 0 west, 1 north-west, 2 south, 3 east
    const out = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (!depth[i] || northMask[i] || depth[i - 1] && depth[i + 1] && depth[i - W] && depth[i + W]) continue;
      const la = NORTH - (y + .5) * RES, lo = WEST + (x + .5) * RES;
      out.push(i, lo < 32.5 ? 0 : lo >= 33.9 ? 3 : la >= 34.95 ? 1 : 2);
    }
    return Int32Array.from(out);
  }
  document.addEventListener('ps:sea', e => {
    if (!want.delete(e.detail?.h)) return;
    for (const m of want) PsSea.bands(m); // one the worker dropped for a later ask: asked again
    if (typeof drawWhen === 'function' && F) drawWhen();
  });
  return h => {
    if (!F || !(h >= 0 && h < F.T)) return '';
    if (forF !== F) { forF = F; by.clear(); want.clear(); }
    let a = h; while (a > 0 && hours[a - 1].local < hours[a].local) a--; // the day's first hour
    let m = a; while (m + 1 < F.T && hours[m].local < 12 && hours[m + 1].local > hours[m].local) m++; // its midday, or its last hour
    const key = a + state.lang; if (by.has(key)) return by.get(key);
    const b = PsSea.bands(m); if (!b) { want.add(m); return ''; }
    shore ||= coasts();
    const n = [0, 0, 0, 0], calm = [0, 0, 0, 0], rough = [0, 0, 0, 0];
    for (let k = 0; k < shore.length; k += 2) { const v = b[shore[k]], c = shore[k + 1]; if (v > 4) continue; n[c]++; if (v <= 1) calm[c]++; else if (v >= 3) rough[c]++; }
    let cb = -1, rb = -1, cs = .7, rs = .4, all = 0, allC = 0, allR = 0;
    for (let c = 0; c < 4; c++) {
      if (!n[c]) continue; all++; const p = calm[c] / n[c], q = rough[c] / n[c];
      if (p >= .7) allC++; if (q >= .4) allR++;
      if (p >= cs) { cs = p; cb = c; } if (q >= rs) { rs = q; rb = c; }
    }
    const C = tr('sea_coast');
    const line = !all ? '' : allC === all ? tr('sea_allCalm') : allR === all ? tr('sea_allRough')
      : cb >= 0 && rb >= 0 ? tr('sea_both', C[cb], C[rb]) : cb >= 0 ? tr('sea_calm', C[cb]) : rb >= 0 ? tr('sea_rough', C[rb]) : '';
    by.set(key, line); return line;
  };
})();
