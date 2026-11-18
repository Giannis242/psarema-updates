'use strict';
// Psarema: time-varying ocean and weather inputs, loaded in the background (window.PsOcean). Nothing here blocks start-up or throws:
// every source is optional, and one that fails only logs a console.warn. API, sources, costs and evidence: scripts/ocean/README.md.
// Needs core.js (C, NN, CENTER, trap, b64) and sources.js (blosc, DTYPE, GRID_BOUNDS, toB64, ARCO, arcoMeta, WX_MODELS, blendModels) loaded first; SunCalc for light().
(() => {
const HOUR = 36e5, DAY = 864e5, CACHE = 'psarema-ocean-v1:';
const STORM = 1.5, SINCE_CAP = 96, STIR_TAU = 24; // m of significant wave height that counts as a blow; hours; e-folding hours of stirred water
const info = {}, daily = {};
let D = null; // derived Open-Meteo history on the coarse grid, hour-major

/* ---------- Cache: localStorage with expiry; Float32Arrays as base64 ---------- */
function cacheGet(k, maxAge) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE + k), (_, v) => v && v.f32 != null ? new Float32Array(b64(v.f32).buffer) : v);
    return c && Date.now() - c.at < maxAge ? c.v : null;
  } catch { return null; }
}
function cacheSet(k, v) { // ponytail: localStorage (~0.8 MB for all of this); IndexedDB if the 5 MB quota gets tight
  try { localStorage.setItem(CACHE + k, JSON.stringify({ at: Date.now(), v }, (_, x) => x instanceof Float32Array ? { f32: toB64(new Uint8Array(x.buffer, x.byteOffset, x.byteLength)) } : x)); }
  catch { console.warn('PsOcean: no room to cache', k); }
}
async function track(name, fn) { // runs one source: never rejects, records time, bytes and the error
  const t0 = performance.now(), s = info[name] = { ok: false, kB: 0 };
  try { await fn(s); s.ok = true; }
  catch (e) { s.err = String(e?.message || e); console.warn(`PsOcean ${name} unavailable:`, e); }
  finally { s.ms = Math.round(performance.now() - t0); s.kB = Math.round(s.kB); }
}

/* ---------- Copernicus Marine ARCO Zarr: several time steps of one variable over the map box ---------- */
const CM = 'https://s3.waw3-1.cloudferro.com/';
const SRC = { // dataset versions as on 2026-11-14; a retired one is replaced by its newest version on the fly (sources.js arcoMeta)
  sst16: { url: CM + 'mdl-arco-time-046/arco/SST_MED_SST_L4_NRT_OBSERVATIONS_010_004/SST_MED_SST_L4_NRT_OBSERVATIONS_010_004_a_V2_202311/timeChunked.zarr', v: 'analysed_sst', k: -273.15 },
  ssta: { url: CM + 'mdl-arco-time-046/arco/SST_MED_SST_L4_NRT_OBSERVATIONS_010_004/SST_MED_SSTA_L4_NRT_OBSERVATIONS_010_004_b_202607/timeChunked.zarr', v: 'sst_anomaly' },
  // Daily-mean currents of the 4.2 km Mediterranean model; z 140 is its top level (1 m) of 141.
  medCur: { url: CM + 'mdl-arco-time-033/arco/MEDSEA_ANALYSISFORECAST_PHY_006_013/cmems_mod_med_phy-cur_anfc_4.2km_P1D-m_202511/timeChunked.zarr', today: true, z: 140 },
  kd490: { url: CM + 'mdl-arco-geo-045/arco/OCEANCOLOUR_MED_BGC_L3_NRT_009_141/cmems_obs-oc_med_bgc-transp_nrt_l3-multi-1km_P1D_202207/geoChunked.zarr', v: 'KD490' },
};
// One grid per offset (null where that step is missing), shaped like sources.js arcoLatest(): { lat0, dLat, lon0, dLon, ny, nx, g, date }.
// Offsets count steps from the newest step, or from today's step for forecast stores (today: true), or from the step holding the time
// `at` (ms; for the test bench: past dates). z: a fixed elevation index for 4-D stores.
async function arco({ url: url0, v, k = 0, today, at, z }, offsets, s) {
  const fetchB = async (u, p) => {
    const r = await fetch(`${u}/${p}`);
    if (!r.ok) throw Object.assign(new Error(`Copernicus ${v} ${r.status}`), { status: r.status });
    const b = await r.arrayBuffer(); s.kB += b.byteLength / 1024; return b;
  };
  const [url, meta] = await arcoMeta(url0, fetchB), get = p => fetchB(url, p); // a retired store: its newest version (sources.js arcoMeta)
  const dec = (name, buf) => new DTYPE[meta[name + '/.zarray'].dtype](blosc(buf).buffer);
  const axis = async name => Array.from(dec(name, await get(`${name}/0`)), Number); // ponytail: lat/lon axes are one chunk in every store used here
  const [lat, lon] = await Promise.all([axis('latitude'), axis('longitude')]);
  const span = (ax, a, b) => { let i0 = -1, i1 = -1; ax.forEach((x, i) => { if (x >= a && x <= b) { if (i0 < 0) i0 = i; i1 = i; } }); return [i0, i1]; };
  const [y0, y1] = span(lat, GRID_BOUNDS[0][0] - .07, GRID_BOUNDS[1][0] + .07), [x0, x1] = span(lon, GRID_BOUNDS[0][1] - .07, GRID_BOUNDS[1][1] + .07);
  const A = meta[v + '/.zarray'], attrs = meta[v + '/.zattrs'], ch = A.chunks, [ct, cy, cx] = z == null ? ch : [ch[0], ch[2], ch[3]], last = A.shape[0] - 1;
  // Time: the chunk holding the last step gives its date and the step length.
  const tc = meta['time/.zarray'].chunks[0], i0 = Math.floor(last / tc) * tc, tv = dec('time', await get(`time/${i0 / tc}`));
  const [, unit, since] = meta['time/.zattrs'].units.match(/^(\w+) since (.*)$/), s0 = since.trim().replace(' ', 'T');
  const epoch = Date.parse(/T/.test(s0) ? (/Z|[+-]\d\d:?\d\d$/.test(s0) ? s0 : s0 + 'Z') : s0 + 'T00:00:00Z'), mult = { seconds: 1e3, minutes: 6e4, hours: HOUR, days: DAY }[unit];
  const lastDate = epoch + Number(tv[last - i0]) * mult, step = last > i0 ? lastDate - epoch - Number(tv[last - i0 - 1]) * mult : DAY;
  const dateAt = t => lastDate - (last - t) * step; // ponytail: assumes a regular time axis, true for these daily and hourly stores
  const fill = A.fill_value == null ? NaN : Math.fround(Number(A.fill_value)), sf = attrs.scale_factor ?? 1, off = (attrs.add_offset ?? 0) + k;
  const memo = {}, chunk = (t, gy, gx) => { const key = `${Math.floor(t / ct)}.${z == null ? '' : Math.floor(z / ch[1]) + '.'}${gy}.${gx}`; return memo[key] ||= get(`${v}/${key}`).then(b => dec(v, b)); };
  const keys = [];
  for (let gy = Math.floor(y0 / cy); gy <= Math.floor(y1 / cy); gy++) for (let gx = Math.floor(x0 / cx); gx <= Math.floor(x1 / cx); gx++) keys.push([gy, gx]);
  const ny = y1 - y0 + 1, nx = x1 - x0 + 1, zOff = z == null ? 0 : (z % ch[1]) * cy * cx;
  const one = async t => {
    if (t < 0 || t > last) return null;
    const g = new Float32Array(ny * nx).fill(NaN), tOff = (t % ct) * (z == null ? 1 : ch[1]) * cy * cx + zOff;
    const raws = await Promise.all(keys.map(([gy, gx]) => chunk(t, gy, gx))); // every spatial chunk of this step at once
    for (const [q, [gy, gx]] of keys.entries()) {
      const raw = raws[q];
      for (let y = Math.max(y0, gy * cy); y <= Math.min(y1, gy * cy + cy - 1); y++)
        for (let x = Math.max(x0, gx * cx); x <= Math.min(x1, gx * cx + cx - 1); x++) {
          const r = raw[tOff + (y - gy * cy) * cx + (x - gx * cx)];
          if (r !== fill && !Number.isNaN(r) && Math.abs(r) < 1e19) g[(y - y0) * nx + (x - x0)] = r * sf + off;
        }
    }
    return { lat0: lat[y0], dLat: lat[y0 + 1] - lat[y0], lon0: lon[x0], dLon: lon[x0 + 1] - lon[x0], ny, nx, g, date: dateAt(t) };
  };
  let base = today || at != null ? Math.min(last, last - Math.ceil((lastDate - (at ?? Date.now())) / step)) : last;
  try { await one(base); } catch (e) { if (e.status !== 403 && e.status !== 404) throw e; base--; } // the newest step can be listed before it is uploaded
  return Promise.all(offsets.map(o => one(base + o).catch(e => { console.warn(`PsOcean ${v} step ${o}:`, e); return null; })));
}
const diff = (a, b) => a && b ? { ...a, g: a.g.map((x, i) => x - b.g[i]) } : undefined;

// SST change over 3 and 5 days (1/16° L4, ~1.5 MB) and today's anomaly against 1991–2020 (~0.5 MB).
async function loadSst(s) {
  let c = cacheGet('sst', 6 * HOUR);
  if (!c) {
    const each = (src, o) => arco(src, o, s).catch(e => { console.warn('PsOcean SST:', e); return []; }); // either store alone is still useful
    const [[t0, t3, t5], [an]] = await Promise.all([each(SRC.sst16, [0, -3, -5]), each(SRC.ssta, [0])]);
    if (!t0 && !an) throw new Error('no SST');
    cacheSet('sst', c = { sstAnom: an || undefined, dSst3: diff(t0, t3), dSst5: diff(t0, t5) });
  }
  Object.assign(daily, c); s.date = (c.sstAnom || c.dSst3)?.date;
}
// Water clarity: the newest cloud-free Kd490 of the last 5 days (1 km L3, ~1.3 MB), with its age in days.
async function loadKd(s) {
  let c = cacheGet('kd490', 6 * HOUR);
  if (!c) {
    const days = (await arco(SRC.kd490, [0, -1, -2, -3, -4], s)).filter(Boolean); // newest first
    if (!days.length) throw new Error('no Kd490');
    const kd = new Float32Array(days[0].g.length).fill(NaN), age = kd.slice();
    for (const d of days) {
      const a = Math.floor((Date.now() - d.date) / DAY);
      for (let i = 0; i < kd.length; i++) if (Number.isNaN(kd[i]) && d.g[i] > 0) { kd[i] = d.g[i]; age[i] = a; }
    }
    cacheSet('kd490', c = { kd490: { ...days[0], g: kd }, kdAge: { ...days[0], g: age } });
  }
  Object.assign(daily, c); s.date = c.kd490.date;
}
// Opt-in: today, tomorrow and the day after for the bottom temperature and mixed-layer depth that sources.js loads for today only (~2.5 MB more).
async function loadMedDays(s) {
  let c = cacheGet('medDays', 6 * HOUR);
  if (!c) {
    const [bottomT, mld] = await Promise.all([arco(ARCO.bottomT, [0, 1, 2], s), arco(ARCO.mld, [0, 1, 2], s)]);
    cacheSet('medDays', c = { bottomT, mld });
  }
  Object.assign(daily, c);
}

// Opt-in: surface current (m/s, toward east and north) today, tomorrow and the day after (~3–6 MB: each chunk holds 2 days of the whole sea).
async function loadMedCur(s) {
  let c = cacheGet('medCur', 6 * HOUR);
  if (!c) {
    const [curU, curV] = await Promise.all(['uo', 'vo'].map(v => arco({ ...SRC.medCur, v }, [0, 1, 2], s)));
    cacheSet('medCur', c = { curU, curV });
  }
  Object.assign(daily, c);
}

/* ---------- Open-Meteo: past 5 days + next 4, on every second node of the forecast grid (60 nodes) ---------- */
const G = { nx: 10, ny: 6, n: 60 };
const HKEYS = ['rain24', 'rain72', 'wave72', 'sinceStorm', 'waveTrend', 'stir', 'u24', 'v24', 'dp24', 'airSea'];
async function loadHistory(s) {
  let r = cacheGet('hist', 2 * HOUR);
  if (!r) {
    const la = [], lo = [];
    for (let y = 0; y < G.ny; y++) for (let x = 0; x < G.nx; x++) { la.push((C.lat0 + 2 * y * C.step).toFixed(2)); lo.push((C.lon0 + 2 * x * C.step).toFixed(2)); }
    // ponytail: sea cells for everything; rain over the catchments inland would need land points too
    const q = `latitude=${la}&longitude=${lo}&past_days=5&forecast_days=4&timezone=GMT&cell_selection=sea`;
    const get = async url => { const res = await fetch(url); if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`); const t = await res.text(); s.kB += t.length / 1024; return JSON.parse(t); };
    const [m, w] = await Promise.all([
      get(`https://marine-api.open-meteo.com/v1/marine?${q}&hourly=wave_height,sea_surface_temperature`),
      get(`https://api.open-meteo.com/v1/forecast?${q}&hourly=precipitation,temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl&models=${WX_MODELS}`) // the same blend as the forecast (sources.js)
        .then(w => blendModels(w, ['wind_speed_10m', 'wind_direction_10m', 'pressure_msl'], ['precipitation', 'temperature_2m']))]);
    const Th = Math.min(m[0].hourly.time.length, w[0].hourly.time.length);
    const near = [...Array(G.n).keys()].map(i => [...Array(G.n).keys()].sort((a, b) =>
      Math.hypot(a % G.nx - i % G.nx, (a / G.nx | 0) - (i / G.nx | 0)) - Math.hypot(b % G.nx - i % G.nx, (b / G.nx | 0) - (i / G.nx | 0))));
    const arr = (src, key) => { // [hour * 60 + node]; a node with no value (marine data over land) takes the nearest node's
      const a = new Float32Array(Th * G.n);
      for (let h = 0; h < Th; h++) for (let i = 0; i < G.n; i++) {
        let v = null; for (const j of near[i]) { v = src[j].hourly[key][h]; if (v != null) break; }
        a[h * G.n + i] = v ?? NaN;
      }
      return a;
    };
    r = { t0: Date.parse(m[0].hourly.time[0] + 'Z'), Th, wave: arr(m, 'wave_height'), sst: arr(m, 'sea_surface_temperature'), rain: arr(w, 'precipitation'),
      t2m: arr(w, 'temperature_2m'), ws: arr(w, 'wind_speed_10m'), wd: arr(w, 'wind_direction_10m'), p: arr(w, 'pressure_msl') };
    cacheSet('hist', r);
  }
  D = derive(r); s.date = r.t0 + 5 * DAY;
}
// Trailing-window history per node and hour; NaN where the window reaches before the first hour.
function derive(r, n = G.n) {
  const { Th } = r, o = { t0: r.t0, Th };
  for (const k of HKEYS) o[k] = new Float32Array(Th * n).fill(NaN);
  const sum = (a, i, h, w) => { let x = 0; for (let j = h - w + 1; j <= h; j++) x += a[j * n + i]; return x; };
  for (let i = 0; i < n; i++) {
    let lastStorm = -Infinity, stir = 0;
    for (let h = 0; h < Th; h++) {
      const k = h * n + i, wv = r.wave[k];
      if (wv >= STORM) lastStorm = h;
      if (h - lastStorm <= SINCE_CAP || h >= SINCE_CAP) o.sinceStorm[k] = Math.min(SINCE_CAP, h - lastStorm); // hours since the sea was last rough
      stir = Math.max(wv, stir * Math.exp(-1 / STIR_TAU)); o.stir[k] = h >= 3 * STIR_TAU ? stir : NaN; // wave height remembered with a 24 h decay
      o.airSea[k] = r.t2m[k] - r.sst[k];
      if (h >= 6) o.waveTrend[k] = wv - r.wave[k - 6 * n]; // m per 6 h; below 0 = the sea is going down
      if (h >= 24) o.dp24[k] = r.p[k] - r.p[k - 24 * n];
      if (h >= 23) {
        o.rain24[k] = sum(r.rain, i, h, 24);
        let u = 0, v = 0;
        for (let j = h - 23; j <= h; j++) { const a = r.wd[j * n + i] * Math.PI / 180, s = r.ws[j * n + i]; u -= s * Math.sin(a); v -= s * Math.cos(a); }
        o.u24[k] = u / 24; o.v24[k] = v / 24; // mean wind vector of the last 24 h, toward (east, north), km/h like F.u, F.v
      }
      if (h >= 71) {
        o.rain72[k] = sum(r.rain, i, h, 72);
        let mx = 0; for (let j = h - 71; j <= h; j++) mx = Math.max(mx, r.wave[j * n + i]); o.wave72[k] = mx;
      }
    }
  }
  return o;
}
// The forecast-grid node n sits at coarse row r/2, column min(c/2, 9): bilinear weights, computed once.
const UP = typeof C === 'undefined' ? [] : Array.from({ length: NN }, (_, nn) => {
  const fr = (nn / C.nx | 0) / 2, fc = Math.min(nn % C.nx / 2, G.nx - 1), r0 = Math.min(Math.floor(fr), G.ny - 2), c0 = Math.min(Math.floor(fc), G.nx - 2);
  return [r0 * G.nx + c0, fc - c0, fr - r0];
});
function hourly(times) { // on the 220-node forecast grid: { key: Float32Array(T * NN) } indexed [h * NN + node] like F; null before the history loads
  if (!D) return null;
  const T = times.length, out = {};
  for (const k of HKEYS) out[k] = new Float32Array(T * NN).fill(NaN);
  times.forEach((t, h) => {
    const j = Math.round(((+t || Date.parse(t + 'Z')) - D.t0) / HOUR); if (!(j >= 0 && j < D.Th)) return;
    for (let nn = 0; nn < NN; nn++) {
      const [b0, wx, wy] = UP[nn], b = j * G.n + b0;
      for (const k of HKEYS) { const a = D[k]; out[k][h * NN + nn] = (a[b] * (1 - wx) + a[b + 1] * wx) * (1 - wy) + (a[b + G.nx] * (1 - wx) + a[b + G.nx + 1] * wx) * wy; }
    }
  });
  return out;
}

/* ---------- Light: sun, twilight and moon over the island, cloud-adjusted (no network) ---------- */
// Clear-sky illuminance on a level surface, log10 lux, by sun altitude (standard twilight values: horizon ~600 lux, civil twilight ~3 lux, nautical ~0.01 lux).
const SUN_LUX = [[-18, -3.2], [-12, -2], [-6, .5], [-3, 1.6], [0, 2.8], [5, 3.9], [10, 4.3], [20, 4.6], [30, 4.8], [60, 5], [90, 5.08]];
const MOON_FULL = .25, NIGHT = .001; // lux: full moon at the zenith; starlight and airglow
function sunLux(deg) {
  if (deg <= SUN_LUX[0][0]) return 0;
  for (let k = 1; k < SUN_LUX.length; k++) if (deg <= SUN_LUX[k][0]) {
    const [a, la] = SUN_LUX[k - 1], [b, lb] = SUN_LUX[k];
    return 10 ** (la + (lb - la) * (deg - a) / (b - a));
  }
  return 10 ** SUN_LUX.at(-1)[1];
}
function moonLux(alt, frac) { // alt in radians; lunar phase law of Krisciunas & Schaefer (1991), extinction 0.2 mag per airmass
  if (alt <= 0) return 0;
  const a = Math.acos(Math.min(1, Math.max(-1, 2 * frac - 1))) * 180 / Math.PI, sh = Math.max(Math.sin(alt), .05);
  return MOON_FULL * 10 ** (-.4 * (.026 * a + 4e-9 * a ** 4 + .2 * (1 / sh - 1))) * sh;
}
// Per hour starting at times[h] (strings like F.times, or ms): mean over six 10-minute steps. cloud: % per hour (e.g. hours.map(x => x.cloud)).
function light(times, cloud) {
  const T = times.length, o = {};
  for (const k of ['sunAlt', 'crep', 'moonAlt', 'moonI', 'lux']) o[k] = new Float32Array(T);
  const [la, lo] = CENTER;
  times.forEach((t, h) => {
    const t0 = +t || Date.parse(t + 'Z'), cf = 1 - .75 * Math.pow((cloud?.[h] ?? 0) / 100, 3.4); // Kasten & Czeplak (1980) cloud factor
    let crep = 0, mi = 0, lx = 0;
    for (let q = 0; q < 6; q++) {
      const d = new Date(t0 + (q + .5) * 6e5), sun = SunCalc.getPosition(d, la, lo).altitude * 180 / Math.PI;
      const ml = moonLux(SunCalc.getMoonPosition(d, la, lo).altitude, SunCalc.getMoonIllumination(d).fraction);
      crep += trap(sun, -12, -6, 4, 12) / 6; // the low-light changeover around sunrise and sunset
      mi += ml * cf / MOON_FULL / 6; lx += Math.log10((sunLux(sun) + ml + NIGHT) * cf) / 6;
    }
    const mid = new Date(t0 + HOUR / 2);
    o.sunAlt[h] = SunCalc.getPosition(mid, la, lo).altitude * 180 / Math.PI;
    o.moonAlt[h] = SunCalc.getMoonPosition(mid, la, lo).altitude * 180 / Math.PI; o.crep[h] = crep; o.moonI[h] = mi; o.lux[h] = lx;
  });
  return o;
}

/* ---------- API ---------- */
const LOADERS = { history: loadHistory, sst: loadSst, kd490: loadKd, medDays: loadMedDays, medCur: loadMedCur }, started = {};
// Default: the history and the SST change/anomaly; the others are opt-in, e.g. load(['kd490']) (scripts/ocean/RECOMMEND.md says why).
const load = (names = ['history', 'sst']) => Promise.all(names.map(k => started[k] ||= track(k, LOADERS[k]))).then(() => api);
const api = globalThis.PsOcean = { load, get ready() { return load(); }, daily, hourly, light, info, derive, HKEYS, arco: (src, offsets) => arco(src, offsets, { kB: 0 }) };
if (typeof document !== 'undefined') { // start on our own once the page has loaded, behind the app's own downloads
  const auto = () => setTimeout(() => load(), 3000);
  document.readyState === 'complete' ? auto() : addEventListener('load', auto, { once: true });
}

// Self-check of the derivations on a made-up 100-hour series at one node: 1 mm of rain an hour, a 2 m sea for hours 60–70, else 0.5 m.
{
  const Th = 100, f = g => Float32Array.from({ length: Th }, (_, h) => g(h));
  const o = derive({ t0: 0, Th, wave: f(h => h >= 60 && h <= 70 ? 2 : .5), sst: f(() => 22), rain: f(() => 1), t2m: f(() => 20), ws: f(() => 10), wd: f(() => 0), p: f(h => 1010 + h / 24) }, 1);
  console.assert(o.rain24[50] === 24 && o.rain72[80] === 72 && Number.isNaN(o.rain24[22]), 'PsOcean rain windows');
  console.assert(o.sinceStorm[80] === 10 && o.sinceStorm[99] === 29 && Number.isNaN(o.sinceStorm[5]) && o.wave72[80] === 2, 'PsOcean storm memory');
  console.assert(Math.abs(o.stir[80] - 2 * Math.exp(-10 / 24)) < 1e-3 && Number.isNaN(o.stir[50]) && Math.abs(o.v24[50] + 10) < 1e-4 && Math.abs(o.dp24[50] - 1) < 1e-3 && o.airSea[0] === -2, 'PsOcean wind, pressure, stir');
  console.assert(Math.abs(sunLux(0) - 631) < 1 && Math.abs(moonLux(Math.PI / 2, 1) - MOON_FULL) < 1e-9 && moonLux(Math.PI / 2, .5) / MOON_FULL < .12, 'PsOcean light');
}
})();
