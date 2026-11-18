'use strict';
// Psarema: live observations (window.PsObs). The latest airport wind reports (METAR) on the coast, from the Iowa Environmental Mesonet's
// keyless JSON (public domain, CORS *: a WebView can read it; aviationweather.gov sends no CORS header). Small wind markers on the map
// (Layers ▸ Weather and sea ▸ Measured wind) and PsObs.near(lat, lon) / PsObs.line(lat, lon) for "Measured at Larnaca 12 min ago".
// No open wave buoy or sea-temperature station reports near Cyprus (Copernicus INSTAC Med index, 2026-11-03), so wave/sst never appear.
// Fetched after start-up, then every 10 min while the app is in view; reports older than 3 h are dropped (offline, markers show their age).
(() => {
const SRC = 'https://mesonet.agron.iastate.edu/api/1/currents.json?network=CY__ASOS', KEY = 'psarema-obs-v1', PREF = 'psarema-obs-on';
// The coastal airports (Ercan, inland in the north, is left out). Names per language; positions come with the data.
const ST = { LCLK: ['Larnaca', 'Λάρνακα', 'στη Λάρνακα'], LCPH: ['Paphos', 'Πάφος', 'στην Πάφο'], LCRA: ['Akrotiri', 'Ακρωτήρι', 'στο Ακρωτήρι'] }; // [en, el, el "at"]
const MAXAGE = 3 * 36e5, EVERY = 10 * 6e4, KMH = 1.852, R = Math.PI / 180;
let obs = [], at = 0, layer = null, on = true;
try { on = localStorage.getItem(PREF) !== '0'; } catch {}

const name = o => ST[o.id][state.lang === 'el' ? 1 : 0];
const km = (la, lo, o) => 6371 * Math.acos(Math.min(1, Math.sin(la * R) * Math.sin(o.lat * R) + Math.cos(la * R) * Math.cos(o.lat * R) * Math.cos((lo - o.lon) * R)));
const fresh = () => obs.filter(o => Date.now() - o.at < MAXAGE);
function parse(j) { // IEM currents rows -> [{ id, lat, lon, at, kn, gustKn, dir (from, NaN = variable), t (°C), q (hPa), raw }]
  return (j.data || []).filter(r => ST[r.station] && r.sknt != null && r.utc_valid).map(r => ({
    id: r.station, lat: +r.lat, lon: +r.lon, at: Date.parse(r.utc_valid), kn: +r.sknt, gustKn: r.gust > r.sknt ? +r.gust : NaN,
    dir: r.drct == null || / VRB\d/.test(r.raw || '') ? NaN : +r.drct, t: r.tmpf == null ? NaN : Math.round((r.tmpf - 32) / 1.8),
    q: +(r.raw || '').match(/ Q(\d{4})\b/)?.[1] || NaN, raw: r.raw || '' }));
}
async function load() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    if (c && !obs.length) { obs = c.obs; at = c.at; } // the last reports at once (and offline), then fresh ones
  } catch {}
  if (Date.now() - at >= EVERY) try {
    const r = await fetch(SRC); if (!r.ok) throw new Error(`IEM ${r.status}`);
    obs = parse(await r.json()); at = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify({ at, obs })); } catch {}
  } catch (e) { console.warn('PsObs: measured wind unavailable:', e.message); }
  draw();
  document.dispatchEvent(new CustomEvent('ps:obs', { detail: { n: fresh().length } }));
  return obs;
}

/* ---------- API ---------- */
// near(): the nearest fresh report within maxKm; wind and gust in km/h like the forecast (F.wind), kn in knots as reported.
function near(lat, lon, maxKm = 50) {
  let best = null, bd = maxKm;
  for (const o of fresh()) { const d = km(lat, lon, o); if (d <= bd) { bd = d; best = o; } }
  return best && { at: best.at, wind: best.kn * KMH, gust: best.gustKn * KMH || undefined, dir: best.dir, kn: best.kn, gustKn: best.gustKn || undefined,
    station: name(best), id: best.id, km: Math.round(bd) };
}
const ago = t => tr('obs_ago', Math.max(0, Math.round((Date.now() - t) / 6e4)));
const windTxt = o => `${o.dir === o.dir ? compass(o.dir) + ' ' : ''}${Math.round(o.kn)} ${tr('obs_kn')}${o.gustKn === o.gustKn && o.gustKn ? ', ' + tr('obs_gust', Math.round(o.gustKn)) : ''}`;
const line = (lat, lon) => { const o = near(lat, lon); return o ? tr('obs_line', state.lang === 'el' ? ST[o.id][2] : o.station, ago(o.at), windTxt(o)) : ''; };

/* ---------- Map: one small marker per station (arrow toward where the wind blows, knots, age) ---------- */
const arrow = o => o.kn < 1 ? '<i class="obs-calm"></i>' : o.dir !== o.dir ? '<i class="obs-vrb"></i>'
  : `<svg viewBox="0 0 10 10" style="transform:rotate(${(o.dir + 180) % 360}deg)" aria-hidden="true"><path d="M5 .5l3.2 4.2H6V9.5H4V4.7H1.8z" fill="currentColor"/></svg>`;
const short = t => tr('obs_short', Math.max(0, Math.round((Date.now() - t) / 6e4)));
function card(o) {
  const time = new Intl.DateTimeFormat(state.lang === 'el' ? 'el-GR' : 'en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(o.at);
  return `<div class="obs-card"><div class="obs-top">${ic('wind', 'sm')}<b>${esc(tr('obs_at', name(o)))}</b></div>
<div class="obs-big"><span class="obs-arr">${arrow(o)}</span><b>${Math.round(o.kn)}</b> ${esc(tr('obs_kn'))} <small>${Math.round(o.kn * KMH)} km/h</small></div>
<p>${esc(windTxt(o))} · ${esc(time)} (${esc(ago(o.at))})</p>
${o.t === o.t || o.q === o.q ? `<p>${[o.t === o.t && tr('obs_air', o.t), o.q === o.q && `${o.q} hPa`].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
<p class="obs-raw">${esc(o.raw)}</p><p class="obs-src">${esc(tr('obs_src'))}</p></div>`;
}
function draw() {
  if (!layer) return;
  layer.clearLayers();
  if (!on) return;
  for (const o of fresh()) {
    const strong = o.kn >= 16 || o.gustKn >= 22; // Bft 5 or gusts from 40 km/h: where the app's conditions call a small boat not safe
    L.marker([o.lat, o.lon], { pane: 'obs', keyboard: false, title: `${name(o)} ${windTxt(o)}`,
      icon: L.divIcon({ className: 'obs-mk' + (strong ? ' strong' : ''), iconSize: [44, 44], html: `<span>${arrow(o)}<b>${Math.round(o.kn)}</b><small>${esc(tr('obs_kn'))} · ${short(o.at)}</small></span>` }) })
      .on('click', e => isPhone() && window.PsMobile ? (map.closePopup(), PsMobile.showHtml(card(o)))
        : L.popup({ className: 'obs-pop', offset: [0, -6] }).setLatLng(e.latlng).setContent(card(o)).openOn(map)).addTo(layer);
  }
  const n = $('#n-obs'); if (n) n.textContent = on && fresh().length ? String(fresh().length) : 'METAR';
}
function set(v) {
  on = v; try { localStorage.setItem(PREF, v ? '1' : '0'); } catch {}
  const b = $('#lay-obs'); if (b) b.checked = v;
  if (v && Date.now() - at >= EVERY) load(); else draw();
  if (typeof drawLayerCounts === 'function') drawLayerCounts();
}
if (window.L && typeof map !== 'undefined') {
  map.createPane('obs').style.zIndex = 643; // over the place names (640), under the pins (645)
  layer = L.layerGroup().addTo(map);
  map.attributionControl?.addAttribution('Forecast models ICON (DWD) and IFS (<a href="https://www.ecmwf.int/" target="_blank" rel="noopener">ECMWF</a>, CC BY 4.0) via Open-Meteo · '
    + 'Measured wind: airport METAR via <a href="https://mesonet.agron.iastate.edu/" target="_blank" rel="noopener">Iowa Environmental Mesonet</a>');
  const items = $('#layers-pop .lp-grp[data-grp="weather"] .lp-items');
  if (items) {
    items.insertAdjacentHTML('beforeend', `<label><input type="checkbox" id="lay-obs"${on ? ' checked' : ''}><i class="sw obs-sw"></i> <span data-i18n="l_obs">${esc(tr('l_obs'))}</span> <span class="num" id="n-obs">METAR</span></label>`);
    $('#lay-obs').addEventListener('change', e => set(e.target.checked));
  }
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); // names and ages in the new language
  // After start-up (the first heat paint comes first), then every 10 min while in view; a return to the app catches up at once.
  const first = () => load();
  if (window.requestIdleCallback) requestIdleCallback(first, { timeout: 3000 }); else setTimeout(first, 1500);
  setInterval(() => { if (!document.hidden) load(); }, 5 * 6e4); // load() fetches only when the data is 10 min old, else redraws the ages; ~7 kB a fetch
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - at >= EVERY) load(); });
}
window.PsObs = { near, line, all: () => fresh().map(o => ({ ...o, station: name(o) })), load, set };
})();
