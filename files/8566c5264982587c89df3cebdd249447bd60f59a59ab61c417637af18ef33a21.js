'use strict';
// Psarema: start-up. Loads the forecast and satellite maps, then wires the weather layers and background work.

// round 14 store: no start-up prefetch of the online imagery any more (Esri's terms forbid harvesting its tiles; store/licences.md)

// The splash (css/splash.css) lifts once the first heat map is drawn, after a 3 s wait at most, or at once when the forecast fails; first
// in this file, so nothing below can keep it up (index.html also lifts it by itself after 8 s). It stops catching taps the moment it fades.
// Its story plays through once first (index.html's script keeps its end in data-end; reduced motion: a still frame for 0.9 s).
// A forecast from this device's cache (a repeat visit) gets the short reveal; reduced motion or a hidden page none at all.
const splash = document.getElementById('splash'), still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden;
let fcMs = 1e9; // how long the forecast took: a few ms from the cache, seconds from the network
function reveal() {
  if (!splash?.isConnected || splash.classList.contains('out')) return;
  const left = splash.dataset.end - performance.now(); // the story still running (its end can move while it waits to start: ask again soon)
  if (left > 0 && !document.hidden) { setTimeout(reveal, Math.min(left, 100)); return; }
  if (still()) { splash.remove(); return; }
  const quick = fcMs < 300;
  splash.classList.add('out', ...quick ? ['quick'] : []);
  setTimeout(() => splash.remove(), quick ? 450 : 1000); // the reveal's rules end with it, each piece at rest where it was
}
setTimeout(reveal, 3000); // a slow network: the app (map, seabed, tools, skeleton lists) rather than a logo; the heat fades in when it comes
const heatIn = () => { // map.js sets `scored` with the first heat painted (its first hour can take a few slices)
  if (!scored) { setTimeout(heatIn, 16); return; }
  if (splash?.isConnected) reveal();
  else if (!still()) map.getPane('heat').animate({ opacity: [0, 1] }, { duration: 500, easing: 'ease-out' });
};

for (const k of ['psarema-v1', 'psarema-v2', 'psarema-v3', 'psarema-v4', 'psarema-wx-v1', 'psarema-sat-v1', 'psarema-prefs-v1', 'psarema-prefs-v2']) try { localStorage.removeItem(k); } catch {} // older versions' caches
drawIcons();
setRail(!(innerWidth && innerWidth <= 760) && state.rail); // phones open on the map
showTab(state.tab || 'spots');
setStatus('loading');
applyLang();
prepCurrent();
drawSightings();
for (const name in LAYER_OBJ) if (!['heat', 'zones', ...WEATHER_LAYERS].includes(name)) applyLayer(name);
if (state.loc) setLocation(...state.loc, false);
try { if (!localStorage.getItem(GUIDE_SEEN)) { $('#guide').classList.add('wl'); $('#guide').hidden = false; $('#guide-title').focus({ preventScroll: true }); } } catch {} // round 14: the first run opens on the welcome (index.html), not the tour; a screen reader starts at its title
if (!window.PsWeather) for (const w of WEATHER_LAYERS) $('#lay-' + w)?.closest('label')?.setAttribute('hidden', '');

// Offline or the forecast service failing: the forecast this device saved (up to 3 days old; sources.js only reuses it for an hour) rather
// than nothing, and the status line says why. With nothing saved the map, seabed and tools still work: a few calm tries (Open-Meteo's free
// tier is shared, so never a flood), at once when back online, and Retry. The status keeps the technical message as its detail.
let offline = false, why = 'off', whyMsg = '', busy = false, tries = 0, retryTimer = 0;
const RETRY = [20, 60, 300, 900]; // seconds before each automatic try
const savedForecast = () => { try { const c = JSON.parse(localStorage.getItem(FC_CACHE)); if (c && Date.now() - c.at < 3 * 864e5) return unpack(c); } catch {} return null; };
const failure = e => navigator.onLine === false ? 'off' : / 429\b/.test(e.message) ? 'busy' : 'down'; // fetch fails with a TypeError when there is no network
function getForecast() {
  const t = performance.now(); busy = true;
  return loadForecast().then(d => { fcMs = performance.now() - t; offline = navigator.onLine === false; return d; },
    e => { const c = savedForecast(); if (!c) throw Object.assign(e, { fc: true }); offline = true; why = failure(e); whyMsg = e.message; return c; });
}
function failed(e) { // nothing to show: say why, kindly, and when the next try is (offline: the 'online' event tries)
  busy = false;
  if (!e.fc) { console.error(e); setStatus('loadError', [], 'error', e.message); reveal(); return; } // a fault in the start below, not the network
  const k = failure(e), wait = k !== 'off' && RETRY[tries];
  clearTimeout(retryTimer);
  if (wait) retryTimer = setTimeout(() => document.hidden ? addEventListener('visibilitychange', retryForecast, { once: true }) : retryForecast(), wait * 1e3);
  setStatus('fcNone', [k, wait ? Date.now() + wait * 1e3 : 0], k === 'off' ? 'error offline' : 'error', e.message);
  reveal();
}
function retryForecast() { // Retry, the timer, back online. Nothing past the forecast has run yet, so the start runs again (a fault after it: reload)
  if (busy) return;
  if (F) { location.reload(); return; }
  clearTimeout(retryTimer); tries++;
  setStatus('fcRetrying');
  start(getForecast());
}
addEventListener('online', () => { // back online: load what failed, replace a saved forecast that is over an hour old, or just say so
  if (!F) retryForecast();
  else if (offline && Date.now() - F.at > 36e5) location.reload();
  else if (status.key === 'fcSaved') { offline = false; setStatus('live', [F.at, sat.sstDate], 'live'); }
});
addEventListener('offline', () => { if (F && status.cls === 'live') setStatus('fcSaved', ['off', F.at], 'live offline'); }); // mid-session: the forecast in hand still works; say so calmly
const forecast = getForecast(); // first: it is the longest wait
const ocean = loadOcean().catch(e => { console.warn('Daily ocean file unavailable:', e.message); return null; }); // temperature at depth (sources.js)
// Each step below is its own task, run once its data is in, so the browser paints the map and takes taps in between. With every file
// cached they all resolve at once: start-up was then one ~0.6 s freeze (2–3 s on a phone) before even the satellite imagery showed.
const nextTask = v => new Promise(ok => setTimeout(ok, 0, v));
const satellite = loadSatellite(ocean).catch(e => { console.warn('Satellite data unavailable:', e); return null; }).then(nextTask).then(s => {
  if (s) { // onto the 250 m cells (~65 ms) as soon as the maps are in, often while the forecast still downloads
    sat.sst = resample(s.sst); sat.grad = resample(gradient(s.sst)); sat.sstDate = s.sst.date;
    if (s.chl) {
      sat.chl = resample(s.chl);
      sat.chlGrad = resample(gradient({ ...s.chl, g: s.chl.g.map(Math.log10) })); // plankton fronts: change in log chlorophyll per km
      const v = []; for (let i = 0; i < N; i += 7) if (depth[i] && !northMask[i] && !Number.isNaN(sat.chlGrad[i])) v.push(sat.chlGrad[i]);
      v.sort((a, b) => a - b); sat.chlFull = v[Math.floor(v.length * .95)] || 1;
    }
    if (s.bottomT) sat.bottomT = resample(s.bottomT);
    if (s.mld) sat.mld = resample(s.mld);
  }
  return s;
});
const start = fc => Promise.all([fc, satellite, ocean]).then(nextTask).then(([d, s, o]) => {
  if (o) { sat.oc = o; const ds = ocDay(s?.sst?.date || Date.now()); o.d0 = ds >= 0 ? ds : ocDay(Date.now()); } // the satellite's day, else today
  F = buildFields(d);
  buildHours();
  state.first = Math.max(0, F.times.findIndex(t => Date.parse(t + 'Z') + 36e5 > Date.now())); // the current hour: the past 2 days before it, the forecast from it
  state.h = state.first;
  Object.assign($('#hour'), { min: 0, max: F.T - 1, value: state.h, disabled: false });
  prepCurrent();
  applyLayer('heat'); applyLayer('zones');
  render(); heatIn();
  return s;
}).then(nextTask).then(s => { // the rest a task later: the browser shows the first map in between
  drawBanner();
  findNear();
  drawFishPanel();
  if (window.PsWeather?.attach) {
    try {
      map.createPane('weather').style.zIndex = 418; map.getPane('weather').style.pointerEvents = 'none';
      PsWeather.attach({ map, getForecast: () => F, grid: C, getHour: () => state.h, getLang: () => state.lang, pane: 'weather',
        isSea: (la, lo) => { const i = idxAt(la, lo); return i < 0 || depth[i] > 0; } }); // waves and currents only over water (outside the grid is open sea)
      PsWeather.setHour?.(state.h);
      for (const w of WEATHER_LAYERS) applyLayer(w);
    } catch (e) { console.warn('Weather layers unavailable:', e); }
  }
  if (offline) setStatus('fcSaved', [why, F.at], 'live offline', whyMsg); else setStatus('live', [F.at, s ? sat.sstDate : 0], 'live');
  rankAll();
  setTimeout(() => window.PsPlanner?.brief(), 1500); // the daily "Today" brief (js/planner.js): once a day, after the first render
}).catch(failed);
start(forecast);
// "Now" follows the clock while the app stays open or comes back from the background: an app left open past the hour (or midnight)
// kept the old now, so Today, the timeline, the calendar and the planner went stale. A map showing the old now moves on with it;
// one looking at another hour stays there. A forecast wholly in the past (back days later): reload for a new one.
function tickNow() {
  if (!F || document.hidden) return;
  const nf = F.times.findIndex(t => Date.parse(t + 'Z') + 36e5 > Date.now());
  if (nf < 0) { if (navigator.onLine !== false) location.reload(); return; }
  if (nf === state.first) return;
  const was = state.h === state.first; state.first = nf;
  tlFor = null; drawTimeline(); setHour(was ? nf : state.h); // tlFor (map.js): the past shading moved, so the chart is drawn anew
}
setInterval(tickNow, 60e3);
document.addEventListener('visibilitychange', tickNow);

// Self-check of the helpers the score depends on.
console.assert(trap(5, 0, 2, 8, 10) === 1 && trap(1, 0, 2, 8, 10) === .5 && trap(11, 0, 2, 8, 10) === 0 && trap(0, 0, 0, 8, 10) === 1, 'trap');
console.assert(gps(34.5, 33.25) === '34°30.000′N 33°15.000′E', 'gps format');
console.assert(Object.keys(I18N.en).every(k => k in I18N.el), 'every English text has a Greek one');
console.assert((() => { const u = unpack(pack({ at: 1, times: ['t'], ...Object.fromEntries(KEYS.map(k => [k, Float32Array.of(12, NaN)])) }));
  return KEYS.every(k => u[k][0] === 12 && Number.isNaN(u[k][1])); })(), 'forecast cache keeps values and gaps');
