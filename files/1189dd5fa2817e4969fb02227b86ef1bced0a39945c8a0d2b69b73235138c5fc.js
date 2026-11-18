'use strict';
// Psarema: live data: Open-Meteo forecast and Copernicus Marine satellite and ocean-model maps.
/* ---------- Forecast: the past 2 days, now and the next 7 days ---------- */
// PAST hours before the current one and AHEAD from it (Open-Meteo's marine waves and currents run 7+ days too); HIST more hours
// before those only feed the 24 h look-backs (settle, pressure change). Still one call per node and API: 10 days and ≤ 10 variables.
const PAST = 48, AHEAD = 168, HIST = 24;
let F = null, hours = [], events = { major: [], minor: [] };
async function getJSON(url) {
  const e = window.psEarly?.[url]; if (e) delete window.psEarly[url]; // round 14: asked for at start-up already (data/boot.js): that answer, once
  const r = await (e || fetch(url));
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}${r.status === 429 ? ' – free request limit reached' : ''}`);
  return r.json();
}
// The data: per variable a Float32Array [node * hours + hour], NaN = none (land, or past the end of a model run). Cached for an hour
// as Int16 (value × Q, -32768 = none) in base64: ~1.7 MB of localStorage for the 10 days instead of ~2.8 MB of JSON.
const feedsChanged = () => { if (typeof CustomEvent !== 'undefined' && document.dispatchEvent) setTimeout(() => document.dispatchEvent(new CustomEvent('ps:feeds')), 600); }; // 'ps:feeds': a feed has new data (after app.js has put it in place); js/feeds.js PsFeeds.list() reads it
const FC_CACHE = 'psarema-v5', Q = { wave: 100, period: 100, waveDir: 1, swell: 100, sst: 100, cur: 100, curDir: 1, wind: 10, windDir: 1, gust: 10, press: 10, cloud: 1 };
// Round 12 (the 3D sea, js/area3d-sea.js): the swell's peak period and direction and the wind sea's peak period, one byte each (0.1 s, 2°;
// 255 = none), to keep localStorage light. A cache from before them unpacks them as none (NaN): no refetch, the 3D sea estimates them.
const Q8 = { swellPer: 10, swellDir: .5, windPer: 10 };
function pack(d) {
  const c = { at: d.at, times: d.times };
  for (const k in Q) { const a = d[k], q = new Int16Array(a.length), s = Q[k]; for (let j = 0; j < a.length; j++) q[j] = a[j] === a[j] ? Math.round(a[j] * s) : -32768; c[k] = toB64(new Uint8Array(q.buffer)); }
  for (const k in Q8) { const a = d[k], q = new Uint8Array(a.length), s = Q8[k]; for (let j = 0; j < a.length; j++) q[j] = a[j] === a[j] ? Math.min(254, Math.round(a[j] * s)) : 255; c[k] = toB64(q); }
  return c;
}
function unpack(c) {
  const d = { at: c.at, times: c.times };
  for (const k in Q) { const q = new Int16Array(b64(c[k]).buffer), a = d[k] = new Float32Array(q.length), s = Q[k]; for (let j = 0; j < q.length; j++) a[j] = q[j] === -32768 ? NaN : q[j] / s; }
  for (const k in Q8) { const q = c[k] && b64(c[k]), a = d[k] = new Float32Array(d.wave.length).fill(NaN), s = Q8[k]; if (q) for (let j = 0; j < q.length; j++) if (q[j] !== 255) a[j] = q[j] / s; }
  return d;
}
// Wind and pressure: the mean of ICON-EU 7 km (best_match here) and the 9 km ECMWF IFS beats either alone at Larnaca, Paphos and Akrotiri
// (scripts/verify/wind.mjs, 35 days, sea cells: speed error 2.38 → 2.07 kt a day ahead, 2.56 → 2.21 at 3 days; pressure 0.51 → 0.44 hPa;
// direction 1–2° worse). 2 models × 5 variables is still one request and within Open-Meteo's 10-variable unit. Waves, sea temperature and
// cloud stay single-model: no open wave or sea observations near Cyprus to choose by, and cloud wasn't measured.
const WX_MODELS = ['best_match', 'ecmwf_ifs'];
function blendModels(locs, mean, first) { // in place, per location: hourly[k] = the models' mean (directions as unit vectors), or the first model's
  const R = Math.PI / 180;
  for (const p of [].concat(locs)) {
    const h = p.hourly, [A, B] = WX_MODELS;
    for (const k of first) h[k] = h[`${k}_${A}`];
    for (const k of mean) {
      const a = h[`${k}_${A}`], b = h[`${k}_${B}`] || [], dir = k.includes('direction');
      h[k] = a.map((x, i) => { const y = b[i]; return x == null || y == null ? x ?? y ?? null : !dir ? (x + y) / 2
        : (Math.atan2(Math.sin(x * R) + Math.sin(y * R), Math.cos(x * R) + Math.cos(y * R)) / R + 360) % 360; });
    }
  }
  return locs;
}
async function loadForecast() {
  try { const c = JSON.parse(localStorage.getItem(FC_CACHE)); if (c && Date.now() - c.at < 36e5) return unpack(c); } catch {}
  const pts = [];
  for (let r = 0; r < C.ny; r++) for (let c = 0; c < C.nx; c++) pts.push([(C.lat0 + r * C.step).toFixed(2), (C.lon0 + c * C.step).toFixed(2)]);
  const q = `latitude=${pts.map(p => p[0])}&longitude=${pts.map(p => p[1])}&past_hours=${PAST + HIST}&forecast_hours=${AHEAD}&timezone=GMT`;
  const [m, w] = await Promise.all([
    getJSON(`https://marine-api.open-meteo.com/v1/marine?${q}&hourly=wave_height,wave_period,wave_direction,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction,swell_wave_peak_period,swell_wave_direction,wind_wave_peak_period`),
    getJSON(`https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover&cell_selection=sea&models=${WX_MODELS}`)
      .then(w => blendModels(w, ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'pressure_msl'], ['cloud_cover'])),
  ]);
  const T0 = m[0].hourly.time.length, pick = (arr, key) => { const a = new Float32Array(NN * T0).fill(NaN); arr.forEach((p, n) => p.hourly[key].forEach((v, h) => { if (v != null) a[n * T0 + h] = v; })); return a; };
  const data = { at: Date.now(), times: m[0].hourly.time,
    wave: pick(m, 'wave_height'), period: pick(m, 'wave_period'), waveDir: pick(m, 'wave_direction'), swell: pick(m, 'swell_wave_height'),
    sst: pick(m, 'sea_surface_temperature'), cur: pick(m, 'ocean_current_velocity'), curDir: pick(m, 'ocean_current_direction'),
    wind: pick(w, 'wind_speed_10m'), windDir: pick(w, 'wind_direction_10m'), gust: pick(w, 'wind_gusts_10m'), press: pick(w, 'pressure_msl'), cloud: pick(w, 'cloud_cover'),
    swellPer: pick(m, 'swell_wave_peak_period'), swellDir: pick(m, 'swell_wave_direction'), windPer: pick(m, 'wind_wave_peak_period') };
  try { localStorage.setItem(FC_CACHE, JSON.stringify(pack(data))); } catch {}
  feedsChanged();
  return data;
}
const KEYS = [...Object.keys(Q), ...Object.keys(Q8)];
function buildFields(d) {
  const T0 = d.times.length, P = Math.max(0, T0 - PAST - AHEAD), near = [];
  // The forecast ends where no node has waves or wind any more (a model run cut short): no hour is filled with made-up calm.
  const has = (k, h) => { for (let n = 0; n < NN; n++) if (d[k][n * T0 + h] === d[k][n * T0 + h]) return true; return false; };
  let end = T0; while (end > P + 1 && !(has('wave', end - 1) && has('wind', end - 1))) end--;
  const T = end - P;
  for (let n = 0; n < NN; n++) near.push([...Array(NN).keys()].sort((a, b) =>
    ((a % C.nx - n % C.nx) ** 2 + ((a / C.nx | 0) - (n / C.nx | 0)) ** 2) - ((b % C.nx - n % C.nx) ** 2 + ((b / C.nx | 0) - (n / C.nx | 0)) ** 2)));
  const grid = a => { // [node * T0 + hour] with gaps over land -> [hour * NN + node], gaps filled from the nearest sea node
    const out = new Float32Array(T0 * NN);
    for (let n = 0; n < NN; n++) for (let h = 0; h < T0; h++) {
      let v = NaN;
      for (const m of near[n]) { v = a[m * T0 + h]; if (v === v) break; }
      out[h * NN + n] = v === v ? v : 0;
    }
    return out;
  };
  const g = {}, f = { times: d.times.slice(P, end), T, at: d.at, dp: [], cutAt: end < T0 ? Date.parse(d.times[end - 1] + 'Z') + 36e5 : 0 };
  for (const k of KEYS) { g[k] = grid(d[k]); f[k] = g[k].subarray(P * NN, end * NN); }
  for (const k of ['u', 'v', 'wx', 'wy', 'grad', 'settle', 'vis']) f[k] = new Float32Array(T * NN);
  const back = h => Math.min(24, h + P); // pressure change over 24 h (a 3 h change mostly follows the twice-daily pressure tide), scaled from fewer hours at the start
  for (let h = 0; h < T; h++) {
    let dp = 0;
    for (let n = 0; n < NN; n++) {
      const k = h * NN + n, K = (h + P) * NN + n, a = g.windDir[K] * Math.PI / 180, b = g.waveDir[K] * Math.PI / 180, wv = g.wave[K];
      f.u[k] = -g.wind[K] * Math.sin(a); f.v[k] = -g.wind[K] * Math.cos(a); // wind blowing toward (east, north), km/h
      f.wx[k] = -wv * Math.sin(b); f.wy[k] = -wv * Math.cos(b); // waves travelling toward (east, north), m
      let prev = 0;
      for (let p = Math.max(0, h + P - 24); p < h + P; p++) prev = Math.max(prev, g.wave[p * NN + n]);
      f.settle[k] = wv < 1.3 ? clamp((prev - wv) / 1) : 0; // a sea dropping after a blow stirs up food inshore
      f.vis[k] = 1 - clamp((Math.max(wv, .7 * prev) - .4) / 1.2); // stirred water stays cloudy for a while
      const c = n % C.nx, r = n / C.nx | 0;
      let gr = 0;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const cc = c + dc, rr = r + dr;
        if (cc >= 0 && rr >= 0 && cc < C.nx && rr < C.ny) gr = Math.max(gr, Math.abs(g.sst[K] - g.sst[K - n + rr * C.nx + cc]) / 15);
      }
      f.grad[k] = gr;
      if (back(h) >= 3) dp += (g.press[K] - g.press[K - back(h) * NN]) * 24 / back(h);
    }
    f.dp.push(dp / NN);
  }
  return f;
}
function buildHours() {
  const T = F.T, t0 = Date.parse(F.times[0] + 'Z');
  const alt = [];
  for (let t = t0 - 8 * 36e5; t <= t0 + (T + 8) * 36e5; t += 6e5) alt.push([t, SunCalc.getMoonPosition(new Date(t), ...CENTER).altitude]);
  events = { major: [], minor: [] };
  for (let k = 1; k < alt.length - 1; k++) {
    const [t, a] = alt[k], p = alt[k - 1][1], n = alt[k + 1][1];
    if ((a > p && a >= n) || (a < p && a <= n)) events.major.push([t - 36e5, t + 36e5]);
    if (Math.sign(a) !== Math.sign(p)) events.minor.push([t - 18e5, t + 18e5]);
  }
  const hit = (list, t) => list.some(([a, b]) => a < t + 36e5 && b > t);
  const fmt = o => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o }), fMonth = fmt({ month: 'numeric' }), fHour = fmt({ hour: 'numeric', hourCycle: 'h23' }); // numT() makes one per call (~0.05 ms): here once for every hour
  hours = F.times.map((s, h) => {
    const t = Date.parse(s + 'Z'), mid = t + 18e5, sun = SunCalc.getTimes(new Date(mid), ...CENTER), m = SunCalc.getMoonIllumination(new Date(mid));
    const moonUp = clamp(SunCalc.getMoonPosition(new Date(mid), ...CENTER).altitude / (10 * Math.PI / 180)); // 0 below the horizon, full from 10° up
    const rise = +sun.sunrise, set = +sun.sunset;
    const period = mid >= rise - 36e5 && mid <= rise + 54e5 ? 'dawn' : mid >= set - 54e5 && mid <= set + 36e5 ? 'dusk' : mid > rise && mid < set ? 'day' : 'night';
    let cloud = 0;
    for (let n = 0; n < NN; n++) cloud += F.cloud[h * NN + n];
    return { t, period, solunar: hit(events.major, t) ? 'major' : hit(events.minor, t) ? 'minor' : '', illum: m.fraction, phase: m.phase,
      cloud: cloud / NN, dp: F.dp[h], moonUp, month: +fMonth.format(t) - 1, local: +fHour.format(t), rise, set };
  });
}

/* ---------- Satellite and ocean-model maps (Copernicus Marine ARCO Zarr), daily ---------- */
const ARCO = {
  sst: { url: 'https://s3.waw3-1.cloudferro.com/mdl-arco-time-046/arco/SST_MED_SST_L4_NRT_OBSERVATIONS_010_004/SST_MED_SST_L4_NRT_OBSERVATIONS_010_004_c_V2_202311/timeChunked.zarr', v: 'analysed_sst', k: -273.15 },
  chl: { url: 'https://s3.waw3-1.cloudferro.com/mdl-arco-time-045/arco/OCEANCOLOUR_MED_BGC_L4_NRT_009_142/cmems_obs-oc_med_bgc-plankton_nrt_l4-gapfree-multi-1km_P1D_202207/timeChunked.zarr', v: 'CHL', k: 0 },
  // Mediterranean physics model, ~4.2 km daily; these stores run 9 days into the future, so take today's step.
  bottomT: { url: 'https://s3.waw3-1.cloudferro.com/mdl-arco-time-033/arco/MEDSEA_ANALYSISFORECAST_PHY_006_013/cmems_mod_med_phy-tem_anfc_4.2km_P1D-m_202511/timeChunked.zarr', v: 'bottomT', k: 0, today: true },
  mld: { url: 'https://s3.waw3-1.cloudferro.com/mdl-arco-time-033/arco/MEDSEA_ANALYSISFORECAST_PHY_006_013/cmems_mod_med_phy-mld_anfc_4.2km_P1D-m_202511/timeChunked.zarr', v: 'mlotst', k: 0, today: true },
};
const SAT_CACHE = 'psarema-sat-v2';
function lz4(src, dst, d, end) {
  let s = 0;
  while (s < src.length) {
    const tok = src[s++]; let lit = tok >> 4;
    if (lit === 15) { let b; do { b = src[s++]; lit += b; } while (b === 255); }
    for (let i = 0; i < lit; i++) dst[d++] = src[s++];
    if (s >= src.length) break;
    const off = src[s] | (src[s + 1] << 8); s += 2;
    let ml = tok & 15; if (ml === 15) { let b; do { b = src[s++]; ml += b; } while (b === 255); }
    for (ml += 4; ml > 0; ml--, d++) dst[d] = dst[d - off];
  }
  if (d !== end) throw new Error('lz4 size mismatch');
}
function blosc(buf) { // Zarr blosc chunk, lz4 codec, optional byte shuffle
  const u = new Uint8Array(buf), dv = new DataView(buf), flags = u[2], ts = u[3], nbytes = dv.getUint32(4, true), bsize = dv.getUint32(8, true);
  const out = new Uint8Array(nbytes);
  if (flags & 2) { out.set(u.subarray(16, 16 + nbytes)); return out; }
  if ((flags >> 5) !== 1 || flags & 4) throw new Error('unsupported blosc codec');
  const tmp = new Uint8Array(bsize);
  for (let b = 0; b * bsize < nbytes; b++) {
    const bs = Math.min(bsize, nbytes - b * bsize);
    let p = dv.getInt32(16 + 4 * b, true);
    const ns = !(flags & 0x10) && ts <= 16 && bsize / ts >= 128 && bs === bsize ? ts : 1, neb = bs / ns; // c-blosc1 never splits the short last block
    const target = flags & 1 && ts > 1 ? tmp : out, base = target === tmp ? 0 : b * bsize;
    for (let k = 0; k < ns; k++) {
      const cb = dv.getInt32(p, true); p += 4;
      if (cb === neb) target.set(u.subarray(p, p + cb), base + k * neb); else lz4(u.subarray(p, p + cb), target, base + k * neb, base + (k + 1) * neb);
      p += cb;
    }
    if (target === tmp) { // undo byte shuffle
      const n = Math.floor(bs / ts), o = b * bsize;
      for (let i = 0; i < n; i++) for (let j = 0; j < ts; j++) out[o + i * ts + j] = tmp[j * n + i];
      for (let i = n * ts; i < bs; i++) out[o + i] = tmp[i];
    }
  }
  return out;
}
const DTYPE = { '<f4': Float32Array, '<f8': Float64Array, '<i2': Int16Array, '<i4': Int32Array, '|i1': Int8Array, '<i8': BigInt64Array };
// Round 15: Copernicus re-versions its datasets about once a year and retires the old stores: every store above and in js/ocean.js goes on
// 2027-01-12 (…_202511 → …_202611, 'tem' → 'temp'). When a store's metadata is gone (403/404), arcoMeta() asks the open STAC catalogue
// (CORS *) for the newest released version of the same dataset and reads that instead, once per session per store (scripts/ocean-daily/build.mjs
// does the same every run). The family pattern: the dataset ID without its _YYYYMM version, 'tem' or 'temp', and any _V<n> SST version.
const STAC = 'https://stac.marine.copernicus.eu/metadata/', arcoMoved = {};
const arcoFamily = id => new RegExp('^' + id.replace(/_\d{6}$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('-tem_', '-temp?_').replace(/_V\d+$/, '_V\\d+') + '_\\d{6}$');
async function arcoNewer(url) { // -> the store URL of the newest released version of url's dataset (same kind: timeChunked / geoChunked), or null
  const m = url.match(/\/arco\/([^/]+)\/([^/]+)\/(\w+)\.zarr$/); if (!m) return null;
  const [, product, id, kind] = m, re = arcoFamily(id), json = u => fetch(u).then(r => r.ok ? r.json() : Promise.reject(new Error(`STAC ${r.status}`)));
  const ids = (await json(`${STAC}${product}/product.stac.json`)).links.filter(l => l.rel === 'item').map(l => l.href.split('/')[0])
    .filter(x => x !== id && re.test(x)).sort((a, b) => b.slice(-6).localeCompare(a.slice(-6)));
  for (const x of ids) {
    const d = await json(`${STAC}${product}/${x}/dataset.stac.json`), p = d.properties || {};
    if (!p.admp_in_preparation && !(Date.parse(p.admp_released_date) > Date.now()) && d.assets?.[kind]?.href) return d.assets[kind].href;
  }
  return null;
}
async function arcoMeta(url, get) { // -> [the store URL actually read, its .zmetadata]; get(url, path) -> ArrayBuffer, throws with .status
  const read = async u => [u, JSON.parse(new TextDecoder().decode(await get(u, '.zmetadata'))).metadata];
  if (arcoMoved[url]) return read(await arcoMoved[url]);
  try { return await read(url); } catch (e) {
    if (e.status !== 403 && e.status !== 404) throw e;
    const moved = arcoMoved[url] = arcoNewer(url).then(u => u || Promise.reject(e)); moved.catch(() => delete arcoMoved[url]);
    return read(await moved);
  }
}
async function arcoLatest({ url: url0, v, k, today }) { // latest (or today's) daily field over the map box, as a regular grid
  const fetchB = async (u, p) => { const r = await fetch(`${u}/${p}`); if (!r.ok) throw Object.assign(new Error(`Copernicus ${r.status}`), { status: r.status }); return r.arrayBuffer(); };
  const [url, meta] = await arcoMeta(url0, fetchB), get = p => fetchB(url, p);
  const decode = (name, buf) => new DTYPE[meta[name + '/.zarray'].dtype](blosc(buf).buffer);
  const axis = async name => {
    const a = meta[name + '/.zarray'], out = [];
    for (let c = 0; c * a.chunks[0] < a.shape[0]; c++) for (const x of decode(name, await get(`${name}/${c}`))) out.push(Number(x));
    return out.slice(0, a.shape[0]);
  };
  const A = meta[v + '/.zarray'], at = meta[v + '/.zattrs'], [ct, cy, cx] = A.chunks, tc = meta['time/.zarray'].chunks[0], last = A.shape[0] - 1;
  // Time axis: the chunk holding the last step (then step back to today if the store holds a forecast), fetched with the lat/lon axes: one round trip less.
  const [lat, lon, tvals] = await Promise.all([axis('latitude'), axis('longitude'), get(`time/${Math.floor(last / tc)}`).then(b => decode('time', b))]);
  const span = (ax, a, b) => { let i0 = -1, i1 = -1; ax.forEach((x, i) => { if (x >= a && x <= b) { if (i0 < 0) i0 = i; i1 = i; } }); return [i0, i1]; };
  const [y0, y1] = span(lat, GRID_BOUNDS[0][0] - .03, GRID_BOUNDS[1][0] + .03), [x0, x1] = span(lon, GRID_BOUNDS[0][1] - .03, GRID_BOUNDS[1][1] + .03);
  const keys = [];
  for (let gy = Math.floor(y0 / cy); gy <= Math.floor(y1 / cy); gy++) for (let gx = Math.floor(x0 / cx); gx <= Math.floor(x1 / cx); gx++) keys.push([gy, gx]);
  const load = t => Promise.all(keys.map(async ([gy, gx]) => ({ gy, gx, raw: decode(v, await get(`${v}/${Math.floor(t / ct)}.${gy}.${gx}`)) })));
  const [, unit, since] = meta['time/.zattrs'].units.match(/^(\w+) since (.*)$/), s0 = since.trim().replace(' ', 'T');
  const epoch = Date.parse(/T/.test(s0) ? (/Z|[+-]\d\d:?\d\d$/.test(s0) ? s0 : s0 + 'Z') : s0 + 'T00:00:00Z'), mult = { seconds: 1e3, minutes: 6e4, hours: 36e5, days: 864e5 }[unit];
  const dateAt = t => epoch + Number(tvals[t - Math.floor(last / tc) * tc]) * mult;
  let t = last;
  if (today) {
    const step = last > 0 && last % tc ? dateAt(last) - dateAt(last - 1) : 864e5;
    t = Math.min(last, last - Math.ceil((dateAt(last) - Date.now()) / step));
  }
  let chunks;
  try { chunks = await load(t); } catch (e) { if (e.status !== 403 && e.status !== 404) throw e; chunks = await load(--t); } // newest day can be listed before it is uploaded
  const fill = A.fill_value == null ? NaN : Math.fround(Number(A.fill_value)); // 1e20 fills only match at float32 precision
  const ny = y1 - y0 + 1, nx = x1 - x0 + 1, g = new Float32Array(ny * nx).fill(NaN), sf = at.scale_factor ?? 1, off = (at.add_offset ?? 0) + k, tOff = (t % ct) * cy * cx;
  for (const { gy, gx, raw } of chunks)
    for (let y = Math.max(y0, gy * cy); y <= Math.min(y1, gy * cy + cy - 1); y++)
      for (let x = Math.max(x0, gx * cx); x <= Math.min(x1, gx * cx + cx - 1); x++) {
        const r = raw[tOff + (y - gy * cy) * cx + (x - gx * cx)];
        if (r !== fill && !Number.isNaN(r) && Math.abs(r) < 1e19) g[(y - y0) * nx + (x - x0)] = r * sf + off;
      }
  const date = t >= Math.floor(last / tc) * tc ? dateAt(t) : Date.now();
  return { lat0: lat[y0], dLat: lat[y0 + 1] - lat[y0], lon0: lon[x0], dLon: lon[x0 + 1] - lon[x0], ny, nx, g, date };
}
const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
// ocean: loadOcean()'s promise, resolving null without the file. Only the bottom maps wait for it (the file has them, so they are skipped
// then); the surface maps load alongside it instead of after it (~0.2 s on fast Wi-Fi for its 0.5 MB, more on a phone network).
async function loadSatellite(ocean) { // each layer is optional: whatever loads is used
  try {
    const c = JSON.parse(localStorage.getItem(SAT_CACHE));
    if (c && Date.now() - c.at < 6 * 36e5) { for (const k of [...Object.keys(ARCO), 'anom', 'd3']) if (c[k]) c[k].g = new Float32Array(b64(c[k].g).buffer); surfX = c; feedsChanged(); return c; }
  } catch {}
  const out = { at: Date.now(), via: 'direct' }, get = k => arcoLatest(ARCO[k]).then(r => { out[k] = r; }, e => console.warn(`Copernicus ${k} unavailable:`, e));
  // The daily job's surface file first (one ~0.2 MB download: sea temperature, its 3-day change and anomaly, chlorophyll); without it, or
  // when its sea temperature is over 3 days old, the Copernicus stores themselves (~5 MB of chunks), and failing those a stale file.
  const pk = await loadSurface().catch(e => { console.warn('Daily surface file unavailable:', e.message); return null; });
  const use = via => Object.assign(out, { sst: pk.sst, chl: out.chl || pk.chl, anom: pk.anom, d3: pk.d3, via, made: pk.made });
  if (pk && Date.now() - Date.parse(pk.made) < 36 * 36e5 && Date.now() - pk.sst.date < SURFACE_MAX) use('pack'); // a daily job that stopped must not hold the map on an old day while the stores have a newer one
  await Promise.all([out.sst || get('sst'), out.chl || get('chl'), Promise.resolve(ocean).then(o => o || Promise.all([get('bottomT'), get('mld')]))]);
  if (!out.sst && pk) use('pack-stale');
  if (!out.sst) throw new Error('satellite sea temperature unavailable');
  surfX = out; feedsChanged();
  try { localStorage.setItem(SAT_CACHE, JSON.stringify(out, (k, v) => v instanceof Float32Array ? toB64(new Uint8Array(v.buffer)) : v)); } catch {}
  return out;
}
function gradient(src) { // per km on the source grid, central differences between valid cells
  const { ny, nx, g } = src, out = new Float32Array(ny * nx).fill(NaN);
  for (let y = 0; y < ny; y++) {
    const kx = Math.abs(src.dLon) * 111.32 * Math.cos((src.lat0 + y * src.dLat) * Math.PI / 180), ky = Math.abs(src.dLat) * 110.57;
    for (let x = 0; x < nx; x++) {
      const j = y * nx + x; if (Number.isNaN(g[j])) continue;
      const d = (a, b, step) => { const va = a >= 0 ? g[a] : NaN, vb = b >= 0 ? g[b] : NaN;
        return !Number.isNaN(va) && !Number.isNaN(vb) ? (va - vb) / (2 * step) : !Number.isNaN(va) ? (va - g[j]) / step : !Number.isNaN(vb) ? (g[j] - vb) / step : 0; };
      out[j] = Math.hypot(d(x < nx - 1 ? j + 1 : -1, x > 0 ? j - 1 : -1, kx), d(y < ny - 1 ? j + nx : -1, y > 0 ? j - nx : -1, ky));
    }
  }
  return { ...src, g: out };
}
function resample(src) { // onto the 250 m cells: bilinear over valid source cells, nearest valid cell for coastal gaps
  const { ny, nx, g } = src, out = new Float32Array(N).fill(NaN), FX = new Float64Array(W);
  for (let c = 0; c < W; c++) FX[c] = (lonOf(c) - src.lon0) / src.dLon; // the same for every cell of a column (and fy of a row)
  for (let row = 0, i = 0; row < H; row++) {
    const fy = (latOf(i) - src.lat0) / src.dLat, y = Math.floor(fy);
    for (let c = 0; c < W; c++, i++) {
      if (!depth[i]) continue;
      const fx = FX[c], x = Math.floor(fx);
      let s = 0, w = 0;
      for (let k = 0; k < 4; k++) { // corners (0,0), (0,1), (1,0), (1,1)
        const dy = k >> 1, dx = k & 1, yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= ny || xx >= nx) continue;
        const v = g[yy * nx + xx]; if (Number.isNaN(v)) continue;
        const wt = (dy ? fy - y : 1 - (fy - y)) * (dx ? fx - x : 1 - (fx - x)); s += v * wt; w += wt;
      }
      if (w > 0) { out[i] = s / w; continue; }
      for (let r = 1; r <= 6 && Number.isNaN(out[i]); r++) // ponytail: square-ring search, fine for the few coastal gaps
        for (let yy = Math.max(0, y - r); yy <= Math.min(ny - 1, y + r) && Number.isNaN(out[i]); yy++)
          for (let xx = Math.max(0, x - r); xx <= Math.min(nx - 1, x + r); xx++) { const v = g[yy * nx + xx]; if (!Number.isNaN(v)) { out[i] = v; break; } }
    }
  }
  return out;
}
const sat = { sst: null, grad: null, chl: null, chlGrad: null, chlFull: 1, bottomT: null, mld: null, sstDate: 0 };
/* ---------- The daily surface file (scripts/ocean-daily/build.mjs, surface.json): the satellite maps cut to Cyprus ---------- */
const SURFACE_URL = 'https://giannis242.github.io/psarema-data/surface.json', SURFACE_MAX = 3 * 864e5;
let surfX = null; // what loadSatellite last returned: { sst, chl, anom?, d3?, via: 'pack' | 'pack-stale' | 'direct', made?, at } (grids on their own lat/lon grid)
async function loadSurface(url = SURFACE_URL) { // -> { made, sst, chl?, anom?, d3? } as grids shaped like arcoLatest()'s; throws when unavailable
  const o = await getJSON(url), grid = (p, T, none, f) => p && { lat0: p.lat0, dLat: p.dLat, lon0: p.lon0, dLon: p.dLon, ny: p.ny, nx: p.nx, res: p.res,
    date: Date.parse(p.date + 'T00:00:00Z'), g: Float32Array.from(new T(b64(p.q).buffer), v => v === none ? NaN : f(v)) };
  const r = { made: o.made, sst: grid(o.sst, Int16Array, -32768, v => v / 100), d3: grid(o.d3, Int8Array, -128, v => v / 20), anom: grid(o.anom, Int8Array, -128, v => v / 10),
    chl: grid(o.chl, Uint16Array, 65535, v => 10 ** (v / 1e4 - 2.5)) };
  if (!r.sst || r.sst.g.length !== r.sst.ny * r.sst.nx) throw new Error('surface.json: no sea temperature');
  return r;
}
// A surface grid's value at a 250 m cell (nearest source cell; NaN outside or over land): for the few cells a card explains, no full resample.
const gridAt = (s, i) => { if (!s) return NaN; const y = Math.round((latOf(i) - s.lat0) / s.dLat), x = Math.round((lonOf(i) - s.lon0) / s.dLon); return y < 0 || x < 0 || y >= s.ny || x >= s.nx ? NaN : s.g[y * s.nx + x]; };
const fChl = c => clamp(Math.log10(c / .03) / Math.log10(.2 / .03)); // Levantine Sea: 0.03 mg/m³ is barren, 0.2 is rich
const frontAt = i => sat.grad ? Math.max(clamp(sat.grad[i] / FRONT_FULL) || 0, sat.chlGrad ? clamp(sat.chlGrad[i] / sat.chlFull) || 0 : 0) : 0;
const clarityM = i => sat.chl ? 1.3 / (.0166 + .0773 * Math.pow(sat.chl[i], .6715)) : NaN; // Kd490 from chlorophyll (Morel et al. 2007), ~visibility in metres
// Round 13: the visibility a person READS (spot card, area page, PsAreaProfile.clarityAt) is a Secchi-type depth in metres, ~30 m off Cyprus,
// not clarityM's 1.3 / Kd490 (~54 m), which stays the model's own input. From Kd490 (1/m): Kd(PAR) = 0.0864 + 0.884 Kd490 - 0.00137 / Kd490
// (Morel et al. 2007, Remote Sens. Environ. 111, eq. 9': the layer down to 1 / Kd490), Secchi depth = 1.7 / Kd(PAR) (Poole & Atkins 1929).
const secchiM = kd490 => 1.7 / (.0864 + .884 * kd490 - .00137 / kd490);
// The same reading where the water carries sediment: turbidity (FNU above the open sea, Sentinel-2: data/area-clarity.js) adds about
// 0.067 1/m of Kd(PAR) per FNU (the slope of Kd on suspended matter in UK coastal waters, Devlin et al. 2008, taking 1 FNU ~ 1 g/m3).
// An estimate: that slope was not measured in Cyprus water.
const secchiTurbid = (secchi, fnu) => 1.7 / (1.7 / secchi + .067 * (fnu || 0));
const belowMixed = i => sat.bottomT && depth[i] > (sat.mld?.[i] || 25); // the seabed sits under the warm surface layer

/* ---------- Water temperature at depth, day by day: the MED model cut to Cyprus 3× a day (scripts/ocean-daily, on GitHub) ---------- */
// ocean.json: the 4.2 km model's temperature at 13 depths (1-200 m) and mixed-layer depth for the timeline's 10 days. Each 250 m cell reads
// the profile of its nearest model sea cell at its own seabed depth: next to a steep coast that is the shelf water at that depth, where the
// model's bottomT map gives the deep sea's (a 40 m spot read ~14 °C instead of ~22 °C).
const OCEAN_URL = 'https://giannis242.github.io/psarema-data/ocean.json', OCEAN_CACHE = 'psarema-ocean-v1'; // round 14: data/boot.js asks for both daily files early: keep its two URLs and cache keys in step
async function loadOcean(url = OCEAN_URL) { // -> the decoded file with each cell's column, level and weight; throws when unavailable
  let o = null;
  try { const c = JSON.parse(localStorage.getItem(OCEAN_CACHE)); if (c && Date.now() - c.at < 6 * 36e5) o = c.o; } catch {}
  if (!o) { o = await getJSON(url); try { localStorage.setItem(OCEAN_CACHE, JSON.stringify({ at: Date.now(), o })); } catch {} }
  const cells = new Uint16Array(b64(o.cells).buffer), n = cells.length, L = o.depths.length, t = b64(o.t), at = new Int16Array(o.ny * o.nx).fill(-1);
  cells.forEach((j, c) => { at[j] = c; });
  const col = new Int16Array(N).fill(-1), lv = new Uint8Array(N), wt = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!depth[i]) continue;
    const fy = (latOf(i) - o.lat0) / o.dLat, fx = (lonOf(i) - o.lon0) / o.dLon, y0 = Math.round(fy), x0 = Math.round(fx);
    let c = -1, bd = Infinity;
    for (let r = 0; r <= 3 && c < 0; r++) // the nearest model sea cell (square rings, ~13 km at most)
      for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) {
        const a = y >= 0 && x >= 0 && y < o.ny && x < o.nx ? at[y * o.nx + x] : -1, dd = (y - fy) ** 2 + (x - fx) ** 2;
        if (a >= 0 && dd < bd) { bd = dd; c = a; }
      }
    if (c < 0) continue;
    let top = L - 1; while (top > 0 && t[c * L + top] === 255) top--; // the column's deepest level with water (first day)
    const z = Math.min(depth[i], o.depths[top]); let k = 0; while (k < top && o.depths[k + 1] <= z) k++;
    col[i] = c; lv[i] = k; wt[i] = k < top ? Math.round(255 * clamp((z - o.depths[k]) / (o.depths[k + 1] - o.depths[k]))) : 0;
  }
  feedsChanged();
  return { n, L, t, mld: b64(o.mld), col, lv, wt, day: new Map(o.dates.map((s, d) => [s, d])), d0: -1, made: Date.parse(o.made) || 0 }; // d0: the satellite SST's day (app.js); made: when the daily job built it
}
const ocDay = ms => sat.oc?.day.get(new Date(ms).toISOString().slice(0, 10)) ?? -1; // the file's day of a time, -1 outside it
function oceanT(i, d) { // °C at the cell's seabed depth (≤ 200 m) on day d; NaN with no column
  const o = sat.oc, c = o.col[i]; if (c < 0) return NaN;
  const b = (d * o.n + c) * o.L + o.lv[i], v0 = o.t[b], v1 = o.t[b + 1], w = o.wt[i] / 255;
  return v0 === 255 ? NaN : 10 + (w && v1 !== 255 ? v0 + (v1 - v0) * w : v0) / 10;
}
const surfDelta = (i, d) => { // the model's surface change from the satellite's day to day d, °C
  const o = sat.oc, c = o.col[i]; if (c < 0 || o.d0 < 0) return 0;
  const a = o.t[(d * o.n + c) * o.L], b = o.t[(o.d0 * o.n + c) * o.L]; return a === 255 || b === 255 ? 0 : (a - b) / 10;
};
const mixedAt = (i, d) => { const o = sat.oc, c = o.col[i], v = c < 0 ? 255 : o.mld[d * o.n + c]; return v === 255 ? NaN : v; };
// The water a fish feels on day d of the ocean file (default: the satellite's day): bottom fish at the seabed, the others at the surface
// (the satellite map, moved by the model's change since). Without the file: today's maps, the bottom map under the mixed layer.
const fishTemp = (i, s, d = sat.oc?.d0 ?? -1) => s.group === 'pelagic' ? sat.sst[i] + (d >= 0 ? surfDelta(i, d) : 0)
  : d >= 0 ? (t => Number.isNaN(t) ? sat.sst[i] : t)(oceanT(i, d)) : belowMixed(i) ? sat.bottomT[i] : sat.sst[i];

/* ---------- Round 15: currents and fronts from the same daily job, loaded only when something asks (not on the first map's path) ---------- */
// Both return grids shaped like arcoLatest()'s. For fronts read cells with gridAt() (nearest pixel): resample() would smear the lines.
const CURRENTS_URL = 'https://giannis242.github.io/psarema-data/currents.json', FRONTS_URL = 'https://giannis242.github.io/psarema-data/fronts.json';
const packGrid = (p, g, date = p.date) => ({ lat0: p.lat0, dLat: p.dLat, lon0: p.lon0, dLon: p.dLon, ny: p.ny, nx: p.nx, res: p.res, date: Date.parse(date + 'T00:00:00Z'), g });
// The Mediterranean model's (1/24°) daily-mean current at ~1 m: { made, level, days: [{ date: 'YYYY-MM-DD', u, v }] }, u / v in m/s toward east / north, NaN on land.
async function loadCurrents(url = CURRENTS_URL) {
  const o = await getJSON(url), n = o.ny * o.nx, U = new Int8Array(b64(o.u).buffer), V = new Int8Array(b64(o.v).buffer);
  const day = (A, d) => packGrid(o, Float32Array.from(A.subarray(d * n, d * n + n), q => q === -128 ? NaN : q / 100), o.dates[d]);
  return { made: Date.parse(o.made), level: o.level, days: o.dates.map((date, d) => ({ date, u: day(U, d), v: day(V, d) })) };
}
// Front lines on the satellite maps: { made, sst?, chl? }, g = the front's gradient on its pixels (°C/km; log10(mg/m³) per km), 0 on sea away from a front, NaN on land.
async function loadFronts(url = FRONTS_URL) {
  const o = await getJSON(url), grid = p => p && packGrid(p, Float32Array.from(b64(p.q), q => q === 255 ? NaN : q * p.unit));
  return { made: Date.parse(o.made), sst: grid(o.sst), chl: grid(o.chl) };
}

// Round 14: a forecast this device does not hold, or holds over an hour old (loadForecast's own rule), is asked for as this file loads,
// not when js/app.js starts it: the app's other scripts (the model's fit, the map, the interface; ~0.5 s on a phone) run meanwhile. app.js's
// first loadForecast() takes that request; later calls (Retry, back online) ask afresh. index.html only (the bench pages load their own data).
// The cache's age from its first characters (pack(): {"at":…), not a parse of its ~1.7 MB.
if (typeof document === 'object' && window.PsData && document.querySelector?.('link[rel=preload][href$=".bin"]') && navigator.onLine !== false) {
  let at = 0; try { at = +(/^\{"at":(\d+)/.exec((localStorage.getItem(FC_CACHE) || '').slice(0, 32))?.[1] || 0); } catch {}
  if (Date.now() - at >= 36e5) { const load = loadForecast, early = load(); early.catch(() => {}); let first = true; loadForecast = () => first ? (first = false, early) : load(); }
}
