'use strict';
// Psarema: settings, helpers, fish profiles and the fixed 250 m seabed layers.
const PREFS = 'psarema-prefs-v3', GUIDE_SEEN = 'psarema-guide-v1';
const state = { sp: 'grouper', mode: 'boat', group: 'all', sort: 'best', h: 0, first: 0, focus: -1, picked: false, playing: null, rail: true,
  op: 85, min: 40, lang: (navigator.language || '').toLowerCase().startsWith('el') ? 'el' : 'en', radius: 10, loc: null };
try { Object.assign(state, JSON.parse(localStorage.getItem(PREFS)) || {}); } catch {}
if (!I18N[state.lang]) state.lang = 'en';
const tr = (k, ...a) => { const v = I18N[state.lang][k] ?? I18N.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
const $ = s => document.querySelector(s);
// The phone layout (css/mobile.css, js/mobile.js): narrow screens, and phones on their side. Keep the query in step with mobile.css.
const PHONE = matchMedia('(max-width: 760px), (max-height: 500px) and (max-width: 960px)'), isPhone = () => PHONE.matches;

const B = window.PSAREMA_BATHY, HAB = window.PSAREMA_HABITAT, NORTH_AREA = window.PSAREMA_NORTH, PROT = window.PSAREMA_PROTECTED, EL = window.PSAREMA_EL || {};
const TIPS = window.PSAREMA_TIPS || {}, CAL = window.PSAREMA_CALIBRATION || {}, IMG = window.PSAREMA_FISH_IMG || {}, SIGHT = window.PSAREMA_SIGHTINGS?.species || {};
const statusEl = $('#status');
const status = { key: 'loading', args: [], cls: '', pct: null, detail: '' };
function renderStatus() { // detail: the technical message under a kind sentence (app.css shows it small on errors; the tooltip has it too)
  const text = tr(status.key, ...status.args) + (status.cls === 'live' && status.pct != null ? ' · ' + tr('cached', status.pct) : ''), span = statusEl.querySelector('span');
  statusEl.className = 'status ' + status.cls; span.textContent = text; span.dataset.detail = status.detail; statusEl.title = status.detail ? `${text}\n${status.detail}` : text;
  $('#retry').hidden = !statusEl.classList.contains('error');
}
function setStatus(key, args = [], cls = '', detail = '') { Object.assign(status, { key, args, cls, detail }); renderStatus(); }
if (!B || !window.PSAREMA_SPECIES?.length) { setStatus('missing', [!B ? 'data/bathy.js' : 'data/species.js'], 'error'); throw new Error('missing data'); }

/* ---------- Constants and helpers ---------- */
const W = B.w, H = B.h, N = W * H, RES = B.res, WEST = B.west, NORTH = B.north;
const KX = RES * 111.32 * Math.cos(35 * Math.PI / 180), KY = RES * 110.57; // km per cell
const C = { lat0: 34.3, lon0: 31.95, step: 0.15, nx: 20, ny: 11 }, NN = C.nx * C.ny; // Open-Meteo sample grid
const CENTER = [34.85, 33.1], TZ = 'Asia/Nicosia', CACHE = 'psarema-v4';
const GRID_BOUNDS = [[NORTH - H * RES, WEST], [NORTH, WEST + W * RES]];
const VIEW = [[34.33, 31.95], [35.75, 34.65]]; // the whole island and its waters
// Score = 100 × habitat fit × season × sea-state gate × conditions × attractors.
const WB = { temp: .3, time: .25, moon: .1, waves: .15, current: .12, press: .08, vis: .2 }; // conditions: weighted mean
// Attractors combine as "any of them": 1 − Π(1 − affinity × strength).
const KNOWN_AFFINITY = .6, SEEN_AFFINITY = .5, EDGE_AFFINITY = { bottom: .35, cephalopod: .35, pelagic: .15 }, SETTLE_AFFINITY = { boat: .25, shore: .55, spear: 0 };
const FRONT_FULL = 0.12; // °C per km treated as a strong front (top ~5% of the 1 km satellite map)
const PLACES = [['Paphos', 'Πάφος', 34.755, 32.41], ['Coral Bay', 'Κοράλ Μπέι', 34.855, 32.36], ['Latchi', 'Λατσί', 35.04, 32.39], ['Pomos', 'Πωμός', 35.15, 32.55],
  ['Kato Pyrgos', 'Κάτω Πύργος', 35.185, 32.68], ['Akamas', 'Ακάμας', 35.1, 32.3], ['Pissouri', 'Πισσούρι', 34.655, 32.7], ['Cape Gata', 'Κάβο Γάτα', 34.565, 33.03],
  ['Limassol', 'Λεμεσός', 34.67, 33.04], ["Governor's Beach", 'Governor’s Beach', 34.71, 33.27], ['Zygi', 'Ζύγι', 34.725, 33.34], ['Mazotos', 'Μαζωτός', 34.69, 33.49],
  ['Larnaca', 'Λάρνακα', 34.91, 33.64], ['Ayia Napa', 'Αγία Νάπα', 34.98, 33.99], ['Cape Greco', 'Κάβο Γκρέκο', 34.96, 34.08], ['Protaras', 'Πρωταράς', 35.01, 34.06]];
const SPOT_GROUP = { fishing: 'fishing', wreck: 'structure', reef: 'structure', rock: 'structure', dive: 'structure',
  pier: 'access', breakwater: 'access', harbour: 'access', slipway: 'access', cape: 'access', beach: 'beach' };
const GROUP_COLOR = { fishing: '#f0a63a', structure: '#a8e6f5', access: '#9aa3ad', beach: '#d8c39a' }; // amber, pale sky (wrecks, reefs, rocks: no purple), grey, sand; access grey, not white: white circles are the top spots
const HEAT = [[35, [0, 170, 210, 0]], [45, [0, 205, 225, 115]], [55, [70, 228, 160, 170]], [65, [246, 232, 80, 210]], [75, [255, 150, 30, 232]], [85, [255, 95, 45, 246]], [95, [255, 35, 35, 255]]];
// Round 10d: the 410369e ramp, its top red instead of magenta (the owner: no pink or purple); css/tokens.css --heat-* holds the same stops
const FISH_SVG = '<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M2 16c8-11 25-14 38-8l12-7-3 15 3 15-12-7C27 30 10 27 2 16zm40-3a2 2 0 100 4 2 2 0 000-4z"/></svg>';

const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
const lerp = (a, b, t) => a + (b - a) * t;
function trap(x, a, b, c, d) { // 0 outside a..d, 1 inside b..c, linear between
  if (x >= b && x <= c) return 1;
  if (x <= a || x >= d) return 0;
  return x < b ? (x - a) / (b - a) : (d - x) / (d - c);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const b64 = s => { if (Uint8Array.fromBase64) return Uint8Array.fromBase64(s); const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; }; // a plain loop: Uint8Array.from(…, map) is ~20× slower on these MB strings
const compass = deg => tr('dirs')[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
const ddm = (v, pos, neg) => { const a = Math.abs(v), d = Math.floor(a); return `${d}°${((a - d) * 60).toFixed(3).padStart(6, '0')}′${v >= 0 ? pos : neg}`; };
const gps = (la, lo) => `${ddm(la, 'N', 'S')} ${ddm(lo, 'E', 'W')}`;
const locale = () => state.lang === 'el' ? 'el-GR' : 'en-GB';
// Intl formatters kept per locale and options: making one costs ~0.03 ms, using one ~0.0003 ms (drawWhen, drawTop, the timeline call these a lot).
const FMT = new Map(), fmtOf = (k, make) => { let f = FMT.get(k); if (!f) FMT.set(k, f = make()); return f; };
const fmtT = (t, o) => fmtOf('d' + locale() + JSON.stringify(o), () => new Intl.DateTimeFormat(locale(), { timeZone: TZ, ...o })).format(t);
const numT = (t, o) => +fmtOf('n' + JSON.stringify(o), () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o })).format(t);
const hm = t => fmtT(t, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dm = t => fmtT(t, { day: 'numeric', month: 'short' });
const whenT = t => fmtT(t, { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const latOf = i => NORTH - (Math.floor(i / W) + .5) * RES, lonOf = i => WEST + (i % W + .5) * RES;
const idxAt = (la, lo) => { const x = Math.floor((lo - WEST) / RES), y = Math.floor((NORTH - la) / RES); return x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x; };
function km(a, b) {
  const dx = (b[1] - a[1]) * 111.32 * Math.cos(a[0] * Math.PI / 180), dy = (b[0] - a[0]) * 110.57;
  return { d: Math.hypot(dx, dy), bearing: (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360 };
}
const nf = (x, d = 1) => fmtOf('f' + locale() + d, () => new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false })).format(+x); // 1.5 / 1,5 (toLocaleString's own formatter)
const fmtKm = d => d < 10 ? nf(d) : String(Math.round(d));
function heatRgba(s) {
  if (s <= HEAT[0][0]) return HEAT[0][1];
  for (let k = 1; k < HEAT.length; k++) if (s <= HEAT[k][0]) {
    const [a, ca] = HEAT[k - 1], [b, cb] = HEAT[k], t = (s - a) / (b - a);
    return ca.map((v, j) => Math.round(v + (cb[j] - v) * t));
  }
  return HEAT.at(-1)[1];
}
const solid = s => { const [r, g, b] = heatRgba(Math.max(s, 50)); return `rgb(${r},${g},${b})`; };
// round 16 timing: the words' steps are 80 / 40 / 20, from the scorecard's calibration (eval/LOG.md, round 16 timing phase 3): a fish is recorded
// about 0.4-0.6 times as often as the other fish where its score is under 20 (poor), about as often at 20-40 (fair), 1.2-1.4 times as often at
// 40-80 (good; the card cannot tell 40-60 from 60-80, so no step at 65) and 3-4 times as often from 80 (excellent). The old 80 / 65 / 50 called
// the day's best spot "poor" for any fish whose scores top out under 50, although such water holds it more often than average.
const tier = s => s >= 80 ? 'q-ex' : s >= 40 ? 'q-good' : s >= 20 ? 'q-fair' : 'q-poor'; // the word's step as a class (js/area3d.js)
const rating = s => tr(s >= 80 ? 'excellent' : s >= 40 ? 'good' : s >= 20 ? 'fair' : 'poor');
const pill = s => s == null ? '<span class="pill empty">·</span>' : `<span class="pill" style="background:${solid(s)}" title="${rating(s)}">${s}</span>`;
const ring = (s, cls = '') => s == null ? `<span class="ring empty ${cls}"><b>·</b></span>` : `<span class="ring ${cls}" style="--p:${s};--c:${solid(s)}" title="${rating(s)}"><b>${s}</b></span>`; // a score as a dial: arc length and colour are the chance (css/app.css .ring)
$('#legend').style.background = `linear-gradient(90deg,${HEAT.map(([s, c]) => `rgb(${c.slice(0, 3)}) ${(s - 35) / 60 * 100}%`)})`;

/* ---------- Fish: profiles, Greek names, tips, photos, calibration from real sightings ---------- */
function calibrate(s) { // adjust the expert profile with where the species was really recorded, when there are enough records
  const c = CAL[s.id];
  if (!c || c.n < 30 || !c.depthQ) return s;
  // Records come mostly from divers near the shore, so they only widen the tolerated depths; they never pull the best range shallower.
  const [p10, , , , p90] = c.depthQ, d = s.depth;
  const depth = [Math.min(d[0], p10), d[1], d[2], Math.max(d[3], p90)];
  const w = Math.min(.3, c.n / 300), top = Math.max(...['rock', 'seagrass', 'coarse', 'sand', 'mud'].map(k => c.habitat?.[k] ?? 0)) || 1;
  const habitat = { ...s.habitat };
  for (const k of ['rock', 'seagrass', 'coarse', 'sand', 'mud']) if (c.habitat?.[k] != null) habitat[k] = clamp(lerp(s.habitat[k], c.habitat[k] / top, w));
  return { ...s, depth, habitat, calibrated: c.n };
}
// Seasons / time of day checked against effort-corrected records (data/season-fit.js) replace the profile's own, in place so every reader sees them.
for (const s of window.PSAREMA_SPECIES) { const f = window.PSAREMA_SEASON_FIT?.[s.id]; if (f?.season?.length === 12) s.season = f.season.slice(); if (f?.activity) s.activity = { ...s.activity, ...f.activity }; }
const CY = window.PSAREMA_NAMES_CY || {}; // what Cypriots call each fish, preferred in Greek
const SPECIES = (window.PSAREMA_SPECIES || []).map(s => calibrate({ ...TIPS[s.id], ...s, el: CY[s.id]?.cy ?? s.el ?? TIPS[s.id]?.el ?? EL.species?.[s.id] ?? s.name }));
// "All fish": where = the best in-season fit of any fish (model.js); timing, draw and sea preferences from this all-round profile.
const ALL_FISH = { id: 'all', all: true, name: 'All fish', el: 'Όλα τα ψάρια', scientific: '', group: 'all', methods: ['boat', 'shore', 'spear'],
  depth: [0, 1, 40, 150], sst: [14, 17, 26, 30], habitat: { rock: .9, seagrass: .85, coarse: .7, sand: .5, mud: .3, open: .2 }, structure: .5, dropoff: .5,
  shoreKm: [0, 12], activity: { dawn: 1, day: .55, dusk: 1, night: .5 }, moon: { new: .8, full: .8 }, season: Array(12).fill(1), waves: [0, 1.5],
  current: .5, front: .4, chlorophyll: .4 };
const byId = id => id === 'all' ? ALL_FISH : SPECIES.find(s => s.id === id);
if (!byId(state.sp)) state.sp = SPECIES[0].id;
const fishName = s => state.lang === 'el' ? s.el : s.name, fishAlt = s => state.lang === 'el' ? s.name : s.el;
const fishText = (s, k) => (state.lang === 'el' ? s[k + '_el'] : s[k]) || null;
const fishRules = s => { // every rules text ends with the date it was checked and against what (round 14, eval/LOG.md)
  const r = state.lang === 'el' ? s.regulations_el || (EL.regulations ? EL.regulations(s.regulations) : s.regulations) : s.regulations;
  return r ? `${r} ${tr('rl_checked')}` : r;
};
const CUT = window.PSAREMA_FISH_CUT || {};
function fishImg(s) { // the cut-out on a transparent background when there is one, else the photo
  const cut = CUT[s.id], im = cut || IMG[s.id];
  if (!im) return `<div class="ph">${FISH_SVG}</div>`;
  return `<span class="fish-art${cut ? '' : ' photo'}"><img src="${esc(im.file)}" alt="${esc(fishName(s))}" loading="lazy" decoding="async" title="${esc(tr('photo', im.author, im.license))}" data-fb="ph"></span>`;
}
// Images in built HTML: data-fb says what a failed one does ("ph": the fish drawing in its place, "rm": it goes), data-in gives its parent
// .in once loaded. One listener here instead of onerror="…" attributes: index.html's Content-Security-Policy runs no inline handlers.
addEventListener('error', e => { const t = e.target, f = t.dataset?.fb; if (t.tagName !== 'IMG' || !f) return;
  if (f === 'ph') t.parentNode?.replaceWith(Object.assign(document.createElement('div'), { className: 'ph', innerHTML: FISH_SVG })); else t.remove(); }, true);
// round 16 P: on document, not window: an element's load event never reaches window (the DOM spec stops it at the document), so the Feed's photos stayed hidden
document.addEventListener('load', e => { const t = e.target; if (t.tagName === 'IMG' && t.hasAttribute('data-in')) t.parentNode?.classList.add('in'); }, true);
// Subresource Integrity for the CDN libraries the website loads on first use (help, dive and 3D area views load three.js): a changed file
// is refused. The Android app loads bundled copies (mobile/sync-web.mjs rewrites those URLs), which these keys then do not match.
const CDN_SRI = {
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js': 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js': 'sha384-wagZhIFgY4hD+7awjQjR4e2E294y6J2HSnd8eTNc15ZubTeQeVRZwhQJ+W6hnBsf',
};
const sri = src => CDN_SRI[src] ? { integrity: CDN_SRI[src], crossOrigin: 'anonymous' } : {};
const ic = (name, cls = '') => window.PSAREMA_ICONS ? `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>` : '';
const L10 = o => o?.[state.lang] ?? o?.en ?? ''; // pick the current language from an { en, el } text
const zoneName = z => state.lang === 'el' && EL.zoneName ? EL.zoneName(z.name) : z.name;
const zoneRules = z => (state.lang === 'el' ? EL.zoneRules?.[z.rules] ?? z.rules : z.rules) +
  (z.kind !== 'protected' && !/check with|not confirmed/i.test(z.rules) ? ` ${tr('rl_zoneChecked')}` : ''); // the zones compared with the DFMR map (round 14); the others say "check with DFMR" themselves

/* ---------- Loaded on first use: index.html leaves these out (classic scripts, so they work offline in the app too) ---------- */
const loaded = {};
function loadScripts(...srcs) { // each file once; they run in the order given; resolves when all have run
  return Promise.all(srcs.map(src => loaded[src] ||= new Promise((ok, fail) => {
    const s = Object.assign(document.createElement('script'), { src, async: false });
    s.onload = ok; s.onerror = () => { delete loaded[src]; s.remove(); fail(new Error('could not load ' + src)); };
    document.head.append(s);
  })));
}
// The help centre (data/help.js, js/help.js): this stands in for js/help.js's PsHelp until the help is first opened.
window.PsHelp ||= {
  open(host, opts) {
    loadScripts('data/help.js', 'js/help.js').then(() => { if (!$('#help-modal').hidden) PsHelp.open(host, opts); },
      e => { console.warn(e.message); closeModal('#help-modal'); $('#guide').hidden = false; }); // as ui.js does without the help
  },
  close() {}, setLang() {}, back: () => false,
};
// Gear guides and pictures (data/gear-art.js, gear-1…3.js) and each area's baits (area-baits.js): when a fish's page or a spot's card first needs them. js/ui.js
// reads them through these two objects: the gear files add to PSAREMA_GEAR; gear-art.js replaces PSAREMA_GEAR_ART, so its entries move over.
const GEAR_ART = window.PSAREMA_GEAR_ART ||= {}; window.PSAREMA_GEAR ||= {};
let gearLoad = null;
const loadGear = () => gearLoad ||= loadScripts('data/gear-art.js', 'data/gear-1.js', 'data/gear-2.js', 'data/gear-3.js', 'data/area-baits.js').then(() => {
  window.PSAREMA_GEAR_ART = Object.assign(GEAR_ART, window.PSAREMA_GEAR_ART);
  refreshOpen(); // a spot card's baits (round 17 G: the Guide tab and the full-guide sheet that also asked are gone: the species page asks itself)
}, e => { gearLoad = null; console.warn(e.message); });

/* ---------- Fixed layers: depth, habitat, north (no data), protected zones, spots ---------- */
const depth = new Uint16Array(b64(B.data).buffer);
for (let r = window.PSAREMA_INLAND || [], k = 0; k < r.length; k += 2) depth.fill(0, r[k], r[k] + r[k + 1]); // round 13: salt lakes the DTM gives 1-6 m of water are land (data/inland.js)
const hab = HAB ? b64(HAB.data) : null;
const habName = i => tr('hab')[HAB?.classes[habK[i] / 121 | 0] ?? 'unknown']; // the seabed class (survey map where there is one)
const habPart = i => { const c = HAB?.classes[habK[i] / 121 | 0]; return c && c !== 'unknown' ? ' · ' + tr('hab')[c] : ''; }; // " · rock" for a list line; nothing where the seabed is not mapped
const northMask = NORTH_AREA ? b64(NORTH_AREA.mask) : new Uint8Array(N); // 1 = north of the island: shown, but no data
const prot = PROT?.grid ? b64(PROT.grid.data) : null; // 0 none, 1 protected, 2 restricted, 3 no-take (round 16: recoded just below by each restricted zone's own rule)
// Round 16 S: a restricted zone's own rule (data/protected.js "rec") instead of one x.35 for all of them. A cell of grid code 2 takes the code of
// the restricted zone its centre lies in (a corner, for the grid's edge cells): 3 recreational fishing banned (closed, like no-take), 1 the rule text
// confirms no recreational ban (full score), 4 closed for some methods in some months (zoneShut), 2 not settled by the text: dimmed x.35 as before.
// ponytail: one code for every seasonal zone (today only the Lara reserve); a second one with other months needs a code of its own.
const zoneCode = z => z.kind === 'no-take' ? 3 : z.kind === 'restricted' ? (z.rec === 'banned' ? 3 : z.rec === 'open' ? 1 : z.rec ? 4 : 2) : z.kind === 'protected' ? 1 : 0;
const ZRANK = [0, 1, 2, 4, 3]; // which code wins where zones overlap: banned > seasonal > not settled > open
const SEASON_ZONE = (PROT?.zones || []).find(z => z.kind === 'restricted' && z.rec && typeof z.rec === 'object') || null;
const zoneShut = (mode, month) => !!SEASON_ZONE?.rec[mode]?.includes(month + 1); // month 0-11
if (prot) {
  const Z = (PROT.zones || []).filter(z => z.kind === 'restricted').map(z => { let s = 90, n = -90, w = 180, e = -180; for (const r of z.rings) for (const [la, lo] of r) { if (la < s) s = la; if (la > n) n = la; if (lo < w) w = lo; if (lo > e) e = lo; } return { z, s, n, w, e, code: zoneCode(z) }; });
  const inZ = (z, la, lo) => { let inside = false; for (const r of z.rings) for (let a = 0, b = r.length - 1; a < r.length; b = a++) if ((r[a][0] > la) !== (r[b][0] > la) && lo < (r[b][1] - r[a][1]) * (la - r[a][0]) / (r[b][0] - r[a][0]) + r[a][1]) inside = !inside; return inside; };
  const at = (la, lo) => { let c = 0; for (const q of Z) if (la >= q.s && la <= q.n && lo >= q.w && lo <= q.e && ZRANK[q.code] > ZRANK[c] && inZ(q.z, la, lo)) c = q.code; return c; };
  for (let i = 0; i < N; i++) if (prot[i] === 2) { const la = latOf(i), lo = lonOf(i), h = RES / 2; let c = at(la, lo);
    if (!c) for (const [dy, dx] of [[h, h], [h, -h], [-h, h], [-h, -h]]) { const k = at(la + dy, lo + dx); if (ZRANK[k] > ZRANK[c]) c = k; }
    if (c) prot[i] = c; }
}
// Shore access, coast type, bathing areas and restricted waters (data/access.js); each null when missing.
const ACC = window.PSAREMA_ACCESS?.w === W ? window.PSAREMA_ACCESS : null, accGrid = k => ACC?.[k] ? b64(ACC[k]) : null;
const shoreDist = accGrid('shoreDist'), coastType = accGrid('coastType'), bathing = accGrid('bathing'), restricted = accGrid('restricted');
// Decoded: drop the ~9 MB of base64 text the data files keep on window.
B.data = null; if (HAB) HAB.data = null; if (NORTH_AREA) NORTH_AREA.mask = null; if (PROT?.grid) PROT.grid.data = null;
if (ACC) for (const k of ['shoreDist', 'coastType', 'bathing', 'restricted']) ACC[k] = null;
function bathingSeason(month) { // months the spearfishing ban in bathing areas applies: late April to 30 November (2025 bathers' order) unless the data says otherwise
  const m = ACC?.bathingRule?.months;
  return Array.isArray(m) ? m.includes(month + 1) : month >= 3 && month <= 10;
}
const inNorth = (la, lo) => { const i = idxAt(la, lo); return i >= 0 && northMask[i] === 1; };
const SPOTS = (window.PSAREMA_SPOTS || []).filter(s => !inNorth(s[2], s[3]));

const dist = new Float32Array(N), onx = new Float32Array(N), ony = new Float32Array(N), coastW = new Float32Array(N), nearW = new Float32Array(N), relief = new Float32Array(N), edge = new Float32Array(N);
(function seabed() {
  const DD = Math.hypot(KX, KY);
  for (let i = 0; i < N; i++) dist[i] = depth[i] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { // chamfer distance to the nearest land cell, km
    const i = y * W + x; let d = dist[i]; if (!d) continue;
    if (x > 0) d = Math.min(d, dist[i - 1] + KX);
    if (y > 0) { d = Math.min(d, dist[i - W] + KY); if (x > 0) d = Math.min(d, dist[i - W - 1] + DD); if (x < W - 1) d = Math.min(d, dist[i - W + 1] + DD); }
    dist[i] = d;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; let d = dist[i]; if (!d) continue;
    if (x < W - 1) d = Math.min(d, dist[i + 1] + KX);
    if (y < H - 1) { d = Math.min(d, dist[i + W] + KY); if (x < W - 1) d = Math.min(d, dist[i + W + 1] + DD); if (x > 0) d = Math.min(d, dist[i + W - 1] + DD); }
    dist[i] = d;
  }
  // Integral images of depth over sea cells, for local mean depth (bathymetric position index).
  const S = new Float64Array((W + 1) * (H + 1)), Cn = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let rs = 0, rc = 0;
    for (let x = 0; x < W; x++) {
      const d = depth[y * W + x], j = (y + 1) * (W + 1) + x + 1;
      rs += d; rc += d ? 1 : 0; S[j] = S[j - W - 1] + rs; Cn[j] = Cn[j - W - 1] + rc;
    }
  }
  const mean = (x, y, r) => { // mean depth of the sea cells in the window; NaN when land fills >10% of it (a coast skews the comparison)
    const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), a = Math.max(0, y - r) * (W + 1), b = Math.min(H, y + r + 1) * (W + 1);
    const n = Cn[b + x1] - Cn[b + x0] - Cn[a + x1] + Cn[a + x0];
    return n >= .9 * (2 * r + 1) ** 2 ? (S[b + x1] - S[b + x0] - S[a + x1] + S[a + x0]) / n : NaN;
  };
  // Three terrain measures, each later scaled so the median Cyprus seabed (<300 m) scores 0 and the top 5% scores 1.
  // Speed (~half the start-up's 145 ms): sqrt for Math.hypot (same bits on this grid, checked) and a flat ring, no destructuring per cell.
  const terms = [new Float32Array(N), new Float32Array(N), new Float32Array(N)], [t0, t1, t2] = terms, RX = [2, -2, 0, 0, 2, -2, 2, -2], RY = [0, 0, 2, -2, 2, -2, -2, 2];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, d = depth[i]; if (!d) continue;
    const e = x < W - 1 && depth[i + 1] || d, w = x > 0 && depth[i - 1] || d, n = y > 0 && depth[i - W] || d, s = y < H - 1 && depth[i + W] || d;
    const sx = (e - w) / (2000 * KX), sy = (n - s) / (2000 * KY);
    t0[i] = Math.sqrt(sx * sx + sy * sy); // slope, m per m
    t1[i] = ((mean(x, y, 3) - d) / (3 + d * .05)) || 0; // positive = shallower than ~1.7 km around: bank, pinnacle, ridge
    t2[i] = ((mean(x, y, 12) - d) / (10 + d * .1)) || 0; // same over ~6 km
    const gx = (x < W - 1 ? dist[i + 1] : dist[i]) - (x > 0 ? dist[i - 1] : dist[i]), gy = (y > 0 ? dist[i - W] : dist[i]) - (y < H - 1 ? dist[i + W] : dist[i]);
    const g = Math.sqrt(gx * gx + gy * gy) || 1;
    onx[i] = gx / g; ony[i] = gy / g; // unit vector pointing offshore (east, north)
    coastW[i] = Math.exp(-dist[i] / 10); nearW[i] = Math.exp(-dist[i] / 3);
    if (hab && hab[i]) { // seagrass/rock/sand boundaries ~500 m apart: hunting edges
      let n8 = 0, diff = 0;
      for (let r = 0; r < 8; r++) {
        const xx = x + RX[r], yy = y + RY[r]; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx; if (!depth[j] || !hab[j]) continue;
        n8++; if (hab[j] !== hab[i]) diff++;
      }
      edge[i] = n8 ? clamp(diff / n8 * 2) : 0;
    }
  }
  let nv = 0; for (let i = 0; i < N; i += 3) if (depth[i] && depth[i] < 300) nv++;
  const scale = terms.map(t => { // a typed array sorts numerically, ~10× faster than an array with a comparator (no NaN here)
    const v = new Float64Array(nv); let k = 0;
    for (let i = 0; i < N; i += 3) if (depth[i] && depth[i] < 300) v[k++] = t[i];
    v.sort();
    return [v[nv >> 1], v[Math.floor(nv * .95)]];
  });
  const [[a0, b0], [a1, b1], [a2, b2]] = scale;
  for (let i = 0; i < N; i++) if (depth[i]) relief[i] = Math.max(clamp((t0[i] - a0) / (b0 - a0)), clamp((t1[i] - a1) / (b1 - a1)), clamp((t2[i] - a2) / (b2 - a2)));
})();

/* ---------- Finer seabed (data/terrain.js, optional): rock and seagrass cover, and the cell's mean depth ---------- */
// habK = seabed class × 121 + tenths of rock cover × 11 + tenths of seagrass cover; fHabK (model.js) mixes a fish's habitat weights by cover.
// dFit = the depth the fish fit uses: the DTM mean over the 250 m cell (bathy.js samples one ~100 m point, which aliases steep inshore slopes).
// Without the file (or beyond its 500 m shelf) both come from bathy.js and habitat.js, as before. depth[] stays the land/sea and display grid.
const TER = window.PSAREMA_TERRAIN?.w === W && window.PSAREMA_TERRAIN.h === H && HAB && String(window.PSAREMA_TERRAIN.classes) === String(HAB.classes) ? window.PSAREMA_TERRAIN : null;
function terrain(name, f) { // f(i, value) for every cell where the layer has a value (run-length cell sets of quantised codes)
  const L = TER?.layers[name]; if (!L) return;
  const runs = new Uint32Array(b64(TER.cells[L.mask]).buffer), raw = b64(L.data), q = L.type === 'u8' ? raw : new Uint16Array(raw.buffer), none = L.type === 'u8' ? 255 : 65535;
  for (let r = 0, k = 0; r < runs.length; r += 2) for (let i = runs[r], e = i + runs[r + 1]; i < e; i++, k++) if (q[k] !== none) f(i, L.offset + L.scale * q[k]);
}
const habK = new Uint16Array(N), dFit = depth.slice();
const depthM = i => dFit[i] || depth[i]; // the depth every card, list and page shows for a cell: the one the score uses (round 14: cards showed bathy.js's point depth, details and the area page this one)
let DMAX = 0; for (let i = 0; i < N; i++) if (depth[i] > DMAX) DMAX = depth[i];
(function finerSeabed() {
  const rockC = HAB?.classes.indexOf('rock'), grassC = HAB?.classes.indexOf('seagrass');
  for (let i = 0; i < N; i++) { const c = hab ? hab[i] : 0; habK[i] = c * 121 + (c === rockC ? 110 : c === grassC ? 10 : 0); } // one class = full cover
  if (!TER) return;
  const rock = new Uint8Array(N), grass = new Uint8Array(N);
  terrain('rockFrac', (i, v) => { rock[i] = Math.round(v * 10); });
  terrain('posFrac', (i, v) => { grass[i] = Math.round(v * 10); });
  terrain('seabed', (i, c) => { if (depth[i]) habK[i] = c * 121 + rock[i] * 11 + Math.min(grass[i], 10 - rock[i]); });
  terrain('depth', (i, v) => { if (depth[i]) dFit[i] = Math.min(DMAX, Math.max(1, Math.round(v))); });
})();

const struct = new Float32Array(N), known = new Float32Array(N);
function stamp(arr, la, lo, r, gain) { // cone of influence around a point, radius r km
  const cx = (lo - WEST) / RES - .5, cy = (NORTH - la) / RES - .5, rx = Math.ceil(r / KX), ry = Math.ceil(r / KY);
  for (let y = Math.max(0, Math.round(cy) - ry); y <= Math.min(H - 1, Math.round(cy) + ry); y++)
    for (let x = Math.max(0, Math.round(cx) - rx); x <= Math.min(W - 1, Math.round(cx) + rx); x++) {
      const d = Math.hypot((x - cx) * KX, (y - cy) * KY);
      if (d >= r) continue;
      const i = y * W + x, v = gain * (1 - d / r);
      if (v > arr[i]) arr[i] = v;
    }
}
const spotCount = { fishing: 0, structure: 0, access: 0, beach: 0 };
for (const [, t, la, lo] of SPOTS) {
  const g = SPOT_GROUP[t]; if (!g) continue;
  spotCount[g]++;
  if (g === 'structure') stamp(struct, la, lo, 1.2, 1);
  else if (t === 'pier' || t === 'breakwater' || t === 'harbour') stamp(struct, la, lo, .6, .8);
  if (t === 'fishing') stamp(known, la, lo, .8, 1);
}
// Fish farms and power-station outfalls (data/attractors.js, optional) as attractors, from the literature only: no presence record lies near
// them (divers avoid both), so the bench cannot test them (eval/LOG.md). Farm halo: wild fish aggregate around sea cages (Dempster et al. 2002;
// Fernandez-Jover et al. 2008), most in Jun–Nov. Warm outfall: a winter refuge (Teixeira et al. 2009). Strength = a kernel 0..1 in bytes.
const ATTR = window.PSAREMA_ATTRACTORS?.w === W && window.PSAREMA_ATTRACTORS.h === H ? window.PSAREMA_ATTRACTORS : null;
const toByte = g => { const u = new Uint8Array(g.length); for (let i = 0; i < g.length; i++) u[i] = Math.round(255 * clamp(g[i])); return u; }; // a plain loop, as b64(): Uint8Array.from(…, map) took ~115 ms of start-up here
const attrK = ATTR && { farm: toByte(ATTR.kernel('farm', .3, 1.5)), outfall: toByte(ATTR.kernel('outfallPower', .5, 2)) };
const affOf = o => Object.fromEntries(Object.entries(o).flatMap(([a, ids]) => ids.split(' ').map(id => [id, +a])));
const ATTRACT = { // per fish affinity and per month weight (Jan..Dec); eval/patches/exp-attract.js, scripts/terrain/RECOMMEND.md 3.C, data/ecology-extra.js
  farm: { aff: affOf({ .9: 'bogue', .7: 'tsipoura melanouri greymullet seabass horsemackerel pompano', .6: 'sargos amberjack bluefish', .5: 'sharpsnout salema',
    .4: 'leerfish annular blackbream mackerel', .3: 'barracuda twoband porgy pandora redmullet garfish' }), season: [.6, .6, .6, .6, .6, 1, 1, 1, 1, 1, 1, .6] },
  outfall: { aff: affOf({ .5: 'seabass greymullet bluefish leerfish tsipoura barracuda' }), season: [1, 1, 1, 1, .5, .1, .1, .1, .1, .1, .5, 1] },
};
const NAMED = SPOTS.filter(s => s[0] && SPOT_GROUP[s[1]] && s[1] !== 'beach');
// The capes as Greek speakers say them (the open data has only Latin names); wrecks, marinas and beaches keep the names they go by.
const NAME_EL = { 'Cape Akamas': 'Ακρωτήρι Ακάμα', 'Cape Apostolos Andreas': 'Ακρωτήρι Αποστόλου Ανδρέα', 'Cape Aspron': 'Ακρωτήρι Άσπρο', 'Cape Dolos': 'Ακρωτήρι Δόλος',
  'Cape Drepano': 'Ακρωτήρι Δρέπανο', 'Cape Drepanum': 'Ακρωτήρι Δρέπανο', 'Cape Gata': 'Ακρωτήρι Γάτας', 'Cape Greko': 'Κάβο Γκρέκο', 'Cape Kokkina': 'Ακρωτήρι Κόκκινα',
  'Cape Kormakitis': 'Ακρωτήρι Κορμακίτη', 'Cape Limniti': 'Ακρωτήρι Λιμνίτη', 'Cape Pomos': 'Ακρωτήρι Πωμού', 'Cape Pyla': 'Ακρωτήρι Πύλας',
  'Cape Zephyros': 'Ακρωτήρι Ζέφυρος', 'Cape Zevgari': 'Ακρωτήρι Ζευγάρι' };
// round 16 P: the towns, islets, headlands and fishing harbours named after places, in Greek too (they showed "1,2 km Ν από Amphitheatre", "από Paphos"); wrecks, marinas and beaches keep theirs
Object.assign(NAME_EL, { 'Paphos': 'Πάφος', 'Coral Bay': 'Κοράλ Μπέι', 'Yeronissos': 'Γερόνησος', 'Cape Yeraniso': 'Ακρωτήρι Γερόνησος', 'Amphitheatre': 'Αμφιθέατρο',
  "St George's Island": 'Νησί Αγίου Γεωργίου', 'Agiou Georgiou Pegeias': 'Άγιος Γεώργιος Πέγειας', 'Kouklia': 'Κούκλια', 'Moni': 'Μονή', 'Kiti': 'Κίτι', 'Ak Kiti': 'Ακρωτήρι Κίτι',
  'Pyla': 'Πύλα', 'Paralimni': 'Παραλίμνι', 'Latsiou': 'Λατσί', 'Xylotymvou': 'Ξυλότυμπου', 'Ormidelas': 'Ορμήδεια', 'Sotira Lemesou': 'Σωτήρα Λεμεσού', 'Arkrotiriou': 'Λιμάνι Ακρωτηρίου',
  'Ayia Napa Harbour': 'Λιμάνι Αγίας Νάπας', 'Alaminos Harbour': 'Λιμάνι Αλαμινού', 'Port of Vasilikos': 'Λιμάνι Βασιλικού', 'New Limassol Port': 'Νέο Λιμάνι Λεμεσού', 'Limassol Old Port': 'Παλιό Λιμάνι Λεμεσού' });
const placeName = n => state.lang === 'el' && NAME_EL[n] || n;
// Round 16 engine, phase 4: each fish's cones are stamped once and kept as the cells they touch and their values (a few kB a fish); every
// later prepare() of that fish (the ranking after each method change, a fish picked again) writes those back instead of stamping again.
const seenMemo = new Map();
const seenFor = (id, buf) => { // species sightings as a cone of 0.8 km around each record
  buf.fill(0);
  // round 18 lead: the memo holds only while SIGHT[id] is the same list of the same length. Keyed by the fish alone, it served stale cones
  // whenever the sightings changed (the bench's folds swap them; the app can add records later): the card's cv-time month lines fell .014.
  const recs = SIGHT[id] || [];
  let m = seenMemo.get(id);
  if (m && m[2] === recs && m[3] === recs.length) { for (let k = 0, c = m[0], v = m[1]; k < c.length; k++) buf[c[k]] = v[k]; return buf; }
  const c = [];
  for (const [la, lo] of recs) if (!inNorth(la, lo)) stamp(buf, la, lo, .8, 1);
  if (recs.length) for (let i = 0; i < N; i++) if (buf[i]) c.push(i);
  seenMemo.set(id, m = [Int32Array.from(c), Float32Array.from(c, i => buf[i]), recs, recs.length]);
  return buf;
};

// Distance by sea from the nearest harbour or slipway (breadth-first over sea cells; Manhattan steps scaled to ~straight-line km).
const LAUNCH = SPOTS.filter(s => s[1] === 'harbour' || s[1] === 'slipway');
const launchKm = new Float32Array(N).fill(Infinity), launchOf = new Int16Array(N).fill(-1); // index into LAUNCH (a few hundred)
(function boatRange() {
  const q = new Int32Array(N); let qh = 0, qt = 0;
  LAUNCH.forEach(([, , la, lo], k) => {
    const c = idxAt(la, lo); if (c < 0) return;
    const cx = c % W, cy = c / W | 0; let bestJ = -1, bd = 1e9;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const j = y * W + x; if (!depth[j] || northMask[j]) continue;
      if (dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; bestJ = j; }
    }
    if (bestJ >= 0 && launchKm[bestJ] === Infinity) { launchKm[bestJ] = 0; launchOf[bestJ] = k; q[qt++] = bestJ; }
  });
  const step = (KX + KY) / 2 * .79;
  const visit = (i, j) => {
    if (j < 0 || j >= N || !depth[j] || northMask[j] || launchKm[j] !== Infinity) return;
    launchKm[j] = launchKm[i] + step; launchOf[j] = launchOf[i]; q[qt++] = j;
  };
  while (qh < qt) { // west, east, north, south
    const i = q[qh++], x = i % W;
    if (x > 0) visit(i, i - 1);
    if (x < W - 1) visit(i, i + 1);
    visit(i, i - W); visit(i, i + W);
  }
})();

// Each cell's position inside the Open-Meteo sample grid, for bilinear smoothing.
const bi = new Uint8Array(N), bx = new Float32Array(N), by = new Float32Array(N); // bi: a node number, below NN = 220
for (let i = 0; i < N; i++) {
  const gx = Math.min(Math.max((lonOf(i) - C.lon0) / C.step, 0), C.nx - 1.0001), gy = Math.min(Math.max((latOf(i) - C.lat0) / C.step, 0), C.ny - 1.0001);
  const c = Math.floor(gx), r = Math.floor(gy);
  bi[i] = r * C.nx + c; bx[i] = gx - c; by[i] = gy - r;
}
function bil(a, k, i) {
  const b = k + bi[i], fx = bx[i], fy = by[i];
  return (a[b] * (1 - fx) + a[b + 1] * fx) * (1 - fy) + (a[b + C.nx] * (1 - fx) + a[b + C.nx + 1] * fx) * fy;
}
const nearestNode = i => bi[i] + (bx[i] > .5 ? 1 : 0) + (by[i] > .5 ? C.nx : 0);
// Every 6th cell of scoreable sea: used for the timeline bars and for ranking all fish.
const SAMPLE = [];
for (let y = 3; y < H; y += 6) for (let x = 3; x < W; x += 6) { const i = y * W + x; if (depth[i] && !northMask[i] && !(prot && prot[i] === 3)) SAMPLE.push(i); }
