'use strict';
// Psarema: the interface. Score card and detail drawer, rail tabs, fish gallery and guide, Near me, layers, help, language.
if (window.PSAREMA_ICONS) document.body.insertAdjacentHTML('afterbegin', window.PSAREMA_ICONS);
const GEAR = window.PSAREMA_GEAR || {}, CATALOG = window.PSAREMA_GEAR_CATALOG || {}, ART = window.PSAREMA_GEAR_ART || {}, COLORS = window.PSAREMA_GEAR_COLORS || {};
const drawIcons = (root = document) => { for (const el of root.querySelectorAll('[data-icon]')) el.innerHTML = ic(el.dataset.icon); };

/* ---------- Small helpers ---------- */
let toastTimer = 0;
function toast(text) {
  const t = $('#toast'); t.textContent = text; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
}
function copyText(text) { // clipboard API first, then the old textarea route for views that refuse it
  const fallback = () => {
    const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast(tr('copiedToast')); } catch {} ta.remove();
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(tr('copiedToast')), fallback); else fallback();
}
// Markup shared by the card, the details, the lists and the guides
const kvList = (rows, raw = false) => `<dl class="kv-list">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${raw ? v : esc(v)}</dd>`).join('')}</dl>`; // raw: v is HTML
const secHtml = (icon, title, body, h = 'h4', cls = '') => body ? `<section${cls && ` class="${cls}"`}><${h}>${ic(icon, h === 'h4' ? 'sm' : '')}${esc(title)}</${h}>${body}</section>` : '';
const yesNo = o => `<span class="yesno ${o.use ? 'yes' : 'no'}">${tr(o.use ? 'yes' : 'no')}</span>`;
// [the score's dial, the rating in its colour over the fish over the place]: the card's hero (xl) and the details' head (lg); depth and seabed
// are the card's stats and the details' Seabed section
// Round 10: the model's new outputs (js/feeds.js), each shown only when it is there (nothing breaks without it):
//   scoreInfo(i, h) → { level: 'high' | 'medium' | 'low', text, reasons: [{ key, text, dir: ±1, w }] } | null   a chip beside the rating
//     (card and details, its text as the tip) and the card's two strongest reasons
//   PsFeeds.list() → [{ id, label, source, res, ageH, state: 'fresh' | 'aging' | 'stale' | 'missing', text }]   the card's data line (the
//     forecast's and the satellite's age) and the details' Data feeds (source · resolution · age; Conditions tab)
const modelHook = (f, ...a) => { try { return typeof f === 'function' ? f(...a) : null; } catch (e) { console.warn(e); return null; } };
let infoMemo = ['', null]; // one cell-hour's scoreInfo, shared by the chip and the reasons of one card; round 14: keyed by the language too (its reasons are words)
const infoOf = i => { const k = [i, state.h, state.sp, state.mode, F?.at, state.lang].join(); if (infoMemo[0] !== k) infoMemo = [k, modelHook(typeof scoreInfo === 'function' && scoreInfo, i, state.h)]; return infoMemo[1]; };
const confOf = i => { const c = infoOf(i); return ['high', 'medium', 'low'].includes(c?.level) ? { level: c.level, note: c.text } : null; };
const confChip = i => { const c = confOf(i); return c ? `<span class="conf-chip c-${c.level}"${c.note ? ` title="${esc(c.note)}"` : ''}>${esc(tr('conf_' + c.level))}</span>` : ''; };
const liveWhy = i => (Array.isArray(infoOf(i)?.reasons) ? infoOf(i).reasons : []).filter(r => r?.text && !/^r_(un)?fit$/.test(r.key)) // the seabed's fit: the score's own "right depth / seabed"
  .map(r => [r.dir < 0 ? 'minus' : 'plus', r.text]);
// [kind, text] rows as list items, each text once (scoreInfo and reasons() can name the same thing): round 10d, the card's two and the details' Why
const whyLis = (rows, max = 9) => { const seen = new Set(); return rows.filter(([, t]) => t && !seen.has(t) && seen.add(t)).slice(0, max).map(([k, t]) => `<li><span class="${k}">${k === 'plus' ? '+' : '−'}</span><span>${esc(cap(t))}</span></li>`).join(''); }; // cap: the model's reasons start lower-case ("its feeding time"), the score's own do not
const feedsOf = () => { const f = modelHook(window.PsFeeds?.list); return Array.isArray(f) && f.length ? f.map(x => ({ id: x.id, name: x.label, source: x.source, res: x.res, text: x.text,
  age: x.ageH >= 0 ? x.ageH * 36e5 : null, stale: x.state === 'stale', missing: x.state === 'missing' })) : null; };
const ageTxt = ms => !(ms >= 0) ? '–' : ms < 36e5 ? tr('ageMin', Math.max(1, Math.round(ms / 6e4))) : ms < 864e5 ? tr('ageH', Math.round(ms / 36e5)) : tr('ageD', Math.round(ms / 864e5));
const feedsSec = () => { const f = feedsOf()?.filter(x => !(x.missing && x.id === 'own')); return f?.length ? secHtml('info', tr('dataFeeds'), `<ul class="feeds">${f.map(x =>
  `<li${x.stale ? ' class="stale"' : x.missing ? ' class="none"' : ''}><span><b>${esc(x.name)}</b><small>${esc([x.source, x.res].filter(Boolean).join(' · '))}</small></span>` +
  `<em>${esc(x.missing ? tr('fd_none') : x.id === 'astro' ? '' : x.id === 'own' ? x.text?.split(', ').pop() || '' : ageTxt(x.age))}</em></li>`).join('')}</ul>`) : ''; };
const whoHtml = (i, score, sz) => [ring(score, sz), `<span class="who"><span class="rate" style="color:${solid(score)}">${rating(score)}${confChip(i)}</span>` +
  (sp.all || !window.PsSpecies ? `<b>${esc(fishName(sp))}</b>` : `<b class="sp-link" data-sp-page="${sp.id}" role="link" tabindex="0">${esc(fishName(sp))}${ic('chevron-right')}</b>`) + // the name opens the fish's page (js/species-page.js)
  `<small>${esc(describe(latOf(i), lonOf(i)))}</small></span>`];
const parts = P => Object.keys(P).map(k => `<div class="ds" data-s="${k}">${P[k]}</div>`).join('');
// Parts drawn before into root (rec.P): rewrite only those whose HTML changed. An hour step mostly changes the score and conditions, so the
// gear pictures, seabed and buttons stay put: no image reloads, no popup re-layout or auto-pan, a smaller layout.
function patch(root, P, rec) { for (const k in P) if (P[k] !== rec.P[k]) { const el = root.querySelector(`[data-s="${k}"]`); if (el) el.innerHTML = P[k]; } rec.P = P; }
// No origin: Google Maps starts the route from where the phone is as it opens (live), not from the app's last saved or dragged location
const mapsLink = (la, lo) => `https://www.google.com/maps/dir/?api=1&destination=${la.toFixed(5)},${lo.toFixed(5)}`;
const routeBtn = (la, lo, cls = 'btn') => `<a class="${cls}" href="${mapsLink(la, lo)}" target="_blank" rel="noopener">${ic('route')}${tr('directions')}</a>`;
function bestHourAt(i) { // every future hour in one scoreCells pass (its cell inputs read once), not one scoreAt per hour: same result, ~40% less time
  const acc = new Float64Array(F.T); ONE[0] = i; scoreCells(cur, state.first, F.T, ONE, 0, 1, 1, acc);
  let bs = 0, bh = state.first; for (let h = state.first; h < F.T; h++) if (acc[h] > bs) { bs = acc[h]; bh = h; }
  return { s: Math.round(bs), h: bh };
}

/* ---------- Score card (tap on the sea) and detail drawer ---------- */
const GROUP_OF = { f_depth: 'where', f_seabed: 'where', f_shore: 'where', f_run: 'where', f_access: 'where', f_coast: 'where',
  f_relief: 'draw', f_struct: 'draw', f_seen: 'draw', f_edge: 'draw', f_known: 'draw', f_front: 'draw', f_plankton: 'draw', f_up: 'draw', f_settle: 'draw', f_mine: 'where' }; // f_mine: your own catches (js/catchlog.js)
// round 16 P: the model still lists these rows, but OTA 2026.11.15-5 took them out of the score (fixed values): never a reason, a minus or a factor bar
const NOT_SCORED = new Set(['f_moon', 'f_press']);
function reasons(rows) { // the two strongest pulls and the weakest condition (a missing bonus is not a minus)
  rows = rows.filter(r => !NOT_SCORED.has(r[0]));
  const good = rows.filter(r => r[3] > 0 && r[2] >= .6 && GROUP_OF[r[0]]).sort((a, b) => b[2] * b[3] - a[2] * a[3]).slice(0, 2);
  const bad = rows.filter(r => r[3] > 0 && r[2] < .4 && GROUP_OF[r[0]] !== 'draw').sort((a, b) => a[2] - b[2]).slice(0, 1);
  return [...good.map(r => ['plus', r]), ...bad.map(r => ['minus', r])];
}
const whyText = ([k, r]) => [k, tr(k === 'plus' ? 'whyPlus' : 'whyMinus')[r[0]] || tr(r[0])]; // a reasons() row as [kind, text]
const reasonLi = ([k, r]) => `<li><span class="${k}">${k === 'plus' ? '+' : '−'}</span><span>${esc(tr(k === 'plus' ? 'whyPlus' : 'whyMinus')[r[0]] || tr(r[0]))}</span></li>`; // plain words; the numbers are in the breakdown
// A spot's extra tools, each from its optional module: log a catch (catchlog.js), save the place (pins.js: in the details only, the card's
// row is full at 44 px in Greek; a long-press on the map saves too), share (offline.js). labels: with text. Round 17 G: the 3D dive
// (dive3d.js) is one level down, in the details' More fold, with the coordinates. Round 18 A: Save is "Mark spot": the place saved with
// what it gives (fish, months, method, how good; js/pins.js markForm), which the personal layer learns from; a plain place: the long-press
const spotTools = (i, labels) => [window.PsCatch && ['plus', 'ct_log', `data-ct-log="${i}"`],
  labels && window.PsPins && ['star', 'a18_markBtn', `data-pp-markcell="${i}"`], window.PsOffline && ['share', 'share', `data-ps-share="${i}"`]].filter(Boolean)
  .map(([icn, k, a]) => `<button class="btn" ${a} title="${esc(tr(k))}" aria-label="${esc(tr(k))}">${ic(icn, 'sm')}${labels ? esc(tr(k)) : ''}</button>`).join('');
const gpsRow = (la, lo) => `<div class="gps-row"><span class="gps selectable">${gps(la, lo)}</span><button class="btn" data-copy="${gps(la, lo)}">${ic('copy', 'sm')}${tr('copy')}</button></div>`;
// The card's three numbers, each a value over a micro label: depth · seabed · how far (from you once there is a location, else the boat run, else off the shore)
const statsHtml = i => {
  const r = state.loc && km(state.loc, [latOf(i), lonOf(i)]), hab = habPart(i).slice(3), d = dist[i];
  const far = r ? [`${fmtKm(r.d)} km`, 'fromYou'] : state.mode === 'boat' && LAUNCH[launchOf[i]] && launchKm[i] >= .5 ? [`${launchKm[i].toFixed(0)} km`, 'boatRun'] : [d < 1 ? `${Math.max(1, Math.round(d * 20)) * 50} m` : `${fmtKm(d)} km`, 'offShore'];
  return `<dl class="sc-stats">${[[`${depthM(i)} m`, 'depth'], hab && [hab, 'seabed'], far].filter(Boolean).map(([v, k]) => `<div><dt>${esc(tr('sp_stat')[k])}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
};
// The best time to go as one row of the card (js/conditions.js draws the same): a tap goes to that hour
const goRow = (h, when, nums) => `<button class="sc-best" data-hour="${h}">${ic('clock')}<span><small class="lbl">${esc(tr('sp_go'))}</small> <b>${esc(when)}</b> <small>${esc(nums)}</small></span>${ic('chevron-right', 'sm')}</button>`;
const zoneNote = i => {
  const p = [latOf(i), lonOf(i)], z = prot && prot[i] ? zoneAt(...p) : null, notes = [];
  if (z) notes.push(`${esc(zoneName(z))} (${esc(tr('kind')[z.kind])}): ${esc(zoneRules(z))}`);
  if (restricted && restricted[i]) notes.push(esc(L10(ACC.restrictedReasons?.[restricted[i]]) || tr('restrictedZone')));
  if (bathing && bathing[i] && state.mode === 'spear') notes.push(esc(tr('bathingBan')));
  else if (bathing && bathing[i] && bathingSeason((hours[state.h] || hours[0])?.month ?? new Date().getMonth())) notes.push(esc(tr(state.mode === 'boat' ? 'rl_bathBoat' : 'rl_bathShore'))); // scores stay (lead, round 14): a warning, DFMR terms §6
  { const sw = window.PsSea?.warn(i, state.h); if (sw) notes.push(esc(sw)); } // round 17 D: rough sea at this place this hour (js/seastate.js): sea state, not fish
  return notes.map(n => `<div class="zone-warn" title="${n}">${ic('ban', 'sm')}<span>${n}</span></div>`).join(''); // n is escaped; the card shows 2 lines (app.css)
};
const sel = { i: -1, autoRail: false, card: L.popup({ className: 'card-pop', maxWidth: 290, minWidth: 290 }),
  // marks the place the card or drawer describes: a ring and a beam that come in once (css/map-fx.css), again when it moves to another place
  ring: L.marker([0, 0], { icon: L.divIcon({ className: 'sel-mark', html: '<i class="sm-beam"></i><i class="sm-ring"></i>', iconSize: [0, 0] }), pane: 'spots', interactive: false, keyboard: false, zIndexOffset: -600 })
    // a new place: put the element back in, so its animations start over (no getAnimations: that forces a style pass in the tap's task)
    .on('move', ({ target: m, oldLatLng: a, latlng: b }) => { const el = m.getElement(); if (el && !b.equals(a)) el.parentNode.append(el); }) };
sel.card.on('remove', () => { if ($('#drawer').hidden) { sel.i = -1; sel.ring.remove(); } });
const likelyLine = i => { if (!sp.all) return ''; const f = likelyAt(i, state.mode); return f.length ? `<p class="likely">${ic('fish-list', 'sm')}<span><b>${tr('likely')}:</b> ${f.map(x => esc(fishName(x))).join(', ')}</span></p>` : ''; };
const condHtml = (k, i) => { try { return window.PsCond?.[k](i) || {}; } catch (e) { console.warn(e); return {}; } }; // going-out conditions (js/conditions.js)
// Best baits here: those of the fish that fit this spot (the picked fish; for All fish the likeliest few here): this stretch of coast's own
// picks for the fish (data/area-baits.js), else its Cyprus-wide ones (data/gear-*.js).
// A bait counts more when it is a fish's first pick or marked best, and adds up when several of the spot's fish take it. None for spearfishing.
function spotBaits(i) {
  if (state.mode === 'spear') return [];
  if (!gearLoad) { loadGear(); return []; } // the first card loads the gear files, then redraws (core.js)
  const m = new Map(), here = window.PSAREMA_AREA_BAITS?.[window.PsAreaGear?.areaAt(latOf(i), lonOf(i))] || {};
  (sp.all ? likelyAt(i, state.mode, 3) : [sp]).forEach((f, r) => (here[f.id] || GEAR[f.id]?.baits || []).slice(0, 4).forEach((b, k) => {
    if (!m.has(b.gear)) m.set(b.gear, { id: b.gear, fish: [], best: false, note: L10(b.note), w: 0 });
    const e = m.get(b.gear); e.fish.push(fishName(f)); e.best ||= !!b.best; e.w += (b.best ? 4 : 1) / (1 + k) / (1 + r); // best beats the list's first pick
  }));
  return [...m.values()].sort((a, b) => b.w - a.w).slice(0, 4);
}
const baitSec = i => { const b = spotBaits(i); return secHtml('fish', tr('baitsHere'), b.length ? `<div class="gear-grid">${b.map(x =>
  gearCard(x.id, sp.all ? tr('baitFor', x.fish.join(', ')) : x.note, x.best)).join('')}</div>` : ''); };
// Lures and soft plastics here: the same fish, and for each lure its two colours (of those the guide lists for it) that suit this spot
// and hour, by the usual rule the guides' own soft-plastic notes give: natural in clear water by day, bright in murky water, gold or
// pink in low light, dark or glow at night. Water: the chlorophyll clarity and the last day's waves (F.vis); light: the hour and cloud.
const COL_GROUP = { natural: 'nat', silver: 'nat', sardine: 'nat', green_silver: 'nat', chartreuse: 'brt', white: 'brt', pink: 'brt', orange: 'brt', red_head: 'brt', red: 'brt',
  gold: 'gold', black: 'dark', purple: 'dark', glow: 'glow' };
const COL_PREF = { clear: { nat: 3, gold: 1, brt: 1 }, murky: { brt: 3, gold: 2, dark: 1, nat: 1 }, low: { gold: 3, brt: 2, nat: 1, dark: 1, glow: 1 }, night: { dark: 3, glow: 3, brt: 1 } };
const BOAT_ONLY = new Set(['tai_rubber', 'inchiku', 'slow_jig', 'trolling_skirt', 'squid_jig_vertical']); // vertical jigging and trolling: no use from the shore
function spotLures(i) {
  if (state.mode === 'spear' || !F) return null;
  const x = hours[state.h], k = state.h * NN, vis = clarityM(i), stir = bil(F.vis, k, i);
  const clear = (Number.isNaN(vis) ? 1 : clamp((vis - 5) / 15)) * (Number.isNaN(stir) ? 1 : stir) >= .45;
  const light = x.period === 'night' ? 'night' : x.period === 'day' && x.cloud < 70 ? (clear ? 'clear' : 'murky') : 'low', pref = COL_PREF[light], m = new Map();
  (sp.all ? likelyAt(i, state.mode, 3) : [sp]).forEach((f, r) => {
    const g = GEAR[f.id]; if (!g) return;
    const soft = g.silicone?.use ? (g.silicone.ids || []).map(id => ({ gear: id, size: g.silicone.size, colors: g.silicone.colors })) : [];
    [...(g.lures || []), ...soft].filter(l => state.mode === 'boat' || !BOAT_ONLY.has(l.gear)).slice(0, 4).forEach((l, k) => {
      if (!m.has(l.gear)) m.set(l.gear, { id: l.gear, fish: [], colors: [], size: [l.weight, l.size].filter(Boolean).join(' · '), w: 0 });
      const e = m.get(l.gear), n = fishName(f); if (!e.fish.includes(n)) e.fish.push(n); // a lure can be in both of a fish's lists
      for (const c of l.colors || []) if (!e.colors.includes(c)) e.colors.push(c); e.w += 1 / (1 + k) / (1 + r);
    });
  });
  const rank = c => pref[COL_GROUP[c]] ?? 0; // a stable sort: equal colours keep the guide's order
  return { light, lures: [...m.values()].sort((a, b) => b.w - a.w).slice(0, 4).map(e => ({ ...e, colors: [...e.colors].sort((a, b) => rank(b) - rank(a)).slice(0, 2) })) };
}
const lureSec = i => { const o = spotLures(i); return secHtml('lure', tr('luresHere'), o?.lures.length ? `<p class="hint">${tr('col_' + o.light)}</p><div class="gear-grid">${o.lures.map(x =>
  gearCard(x.id, sp.all ? tr('baitFor', x.fish.join(', ')) : x.size, false, x.colors)).join('')}</div>` : ''); };
// The short card (a tap on the sea): the score, a little info, View more. Card and details read in one order: score (and where) → rules
// here → why → when to go; the details add baits, lures, seabed and tools. One card shows at a time (the map's popup or the phone sheet).
const cardKey = i => [i, state.sp, state.mode, state.lang].join();
let cardRec = null; // the card on show: its key and parts
// The card: a hero (the score's dial, rating, fish, place), three numbers, the rules here, the reasons, the conditions in one line, the best time
// as a row, then View more and the tools as icons. Only the hero, reasons, conditions and best time change with the hour.
function cardParts(i) {
  const { score, rows } = explain(i, state.h), why = reasons(rows), cd = condHtml('card', i), bh = cd.go == null ? bestHourAt(i) : null, [dial, who] = whoHtml(i, score, 'xl'), r = tr('directions');
  return { top: `<div class="sc-top">${dial}${who}</div>`, sure: window.PsSure?.line(i, infoOf(i)) || '', stats: statsHtml(i), zone: zoneNote(i), why: ((w => w ? `<ul class="reasons sc-why">${w}</ul>` : '')(whyLis([...liveWhy(i), ...why.map(whyText)], 2))) + likelyLine(i),
    cond: cd.why || '', go: cd.go ?? (bh.s ? goRow(bh.h, bh.h === state.h ? tr('now') : whenT(hours[bh.h].t), tr('bestUpTo', bh.s)) : ''), // the best time to go (it has the fish score too)
    acts: `<div class="acts"><button class="btn primary" data-more="${i}">${tr('viewMore')}${ic('chevron-right', 'sm')}</button>` +
      `<a class="btn" href="${mapsLink(latOf(i), lonOf(i))}" target="_blank" rel="noopener" title="${esc(r)}" aria-label="${esc(r)}">${ic('route', 'sm')}</a>${spotTools(i, false)}</div>` };
}
function scoreCard(i) { cardRec = { key: cardKey(i), P: cardParts(i) }; return `<div class="sc" data-key="${cardRec.key}">${parts(cardRec.P)}</div>`; } // js/mobile.js draws the phone's card with it
function patchCard(host, i) { // the card in host again (an hour step): only its changed parts. false: host shows no card or another one (draw it with scoreCard)
  const el = host?.querySelector('.sc[data-key]'), key = cardKey(i); if (!el || el.dataset.key !== key || cardRec?.key !== key) return false;
  patch(el, cardParts(i), cardRec); return true;
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
function moreConditions(i) { // the readings the weather strip leaves out, labelled
  const h = state.h, k = h * NN, x = hours[h], n = k + nearestNode(i), o = {};
  scoreAt(i, h, o);
  const od = ocDay(x.t + 18e5), bt = od >= 0 ? oceanT(i, od) : sat.bottomT?.[i]; // the seabed's water on this hour's day
  const rows = [[tr('k_current'), `${arrow(F.curDir[n])} ${nf(o.cur)} km/h`], bt === bt && bt != null && [tr('k_bottom'), `${nf(bt)} °C · ${depthM(i)} m`],
    [tr('k_press'), `${Math.round(bil(F.press, k, i))} hPa ${x.dp > .3 ? '↑' : x.dp < -.3 ? '↓' : '→'} ${nf(Math.abs(x.dp))}`],
    [tr('k_cloud'), `${Math.round(bil(F.cloud, k, i))}%`], [cap(tr('major')), nextWindow(events.major, x.t)]].filter(Boolean);
  return kvList(rows, true);
}
// The details, in one order on every screen: score (head) → rules here → why → conditions and when to go → baits → lures → seabed →
// position and tools → folds: gear (js/area-gear.js), weather, ships (js/vessels.js), breakdown. The folds stay as you left them across
// redraws and spots. Each part is one element marked data-s, so an hour step rewrites only the parts whose HTML changed (drawDetails:
// baits and seabed never do, lures only when the light changes), and a fold's body is drawn only while it is open (the 9-day weather card alone is ~50 KB of HTML).
const SEABED = ['f_depth', 'f_seabed', 'f_struct', 'f_shore', 'f_run']; // the place itself, from the score's own rows (the same at every hour)
const seabedSec = rows => { const r = rows.filter(x => SEABED.includes(x[0])); return secHtml('seabed', tr('ap_here'), r.length ? kvList(r.map(x => [tr(x[0]), x[0] === 'f_struct' && x[1] === tr('none') ? tr('p_noneKm') : x[1]])) : ''); }; // round 16 P: no wreck or pier within reach of the score (core.js stamps 0.6-1.2 km), while Under water here may name one 3 km off
const folds = { wx: false, more: false }, foldBody = {}; // foldBody: the shown spot's fold bodies, drawn when opened
document.addEventListener('toggle', e => { // toggle does not bubble: caught on the way down
  const k = e.target.dataset?.fold; if (!k) return;
  folds[k] = e.target.open;
  const b = e.target.querySelector(':scope > [data-s]'), rec = e.target.closest('.drawer-body')?.psDrawn;
  if (b && e.target.open && !b.firstChild) { const html = foldBody[k]?.() || ''; b.innerHTML = html; if (rec) rec.P[k] = html; }
}, true);
const fold = (k, title, body) => `<details class="fold ${k === 'wx' ? 'wx-sec' : k}" data-fold="${k}"${folds[k] ? ' open' : ''}><summary>${ic('chevron-right')}${title}</summary><div data-s="${k}">${body}</div></details>`;
function detailParts(i) {
  const { score, rows } = explain(i, state.h), p = [latOf(i), lonOf(i)], why = reasons(rows), cd = condHtml('drawer', i), bh = cd.body ? null : bestHourAt(i), [dial, who] = whoHtml(i, score, 'lg');
  foldBody.wx = () => { const wx = window.PsWeather?.spotCard ? (() => { try { return PsWeather.spotCard(...p); } catch (e) { console.warn(e); return ''; } })() : '';
    return moreConditions(i) + (wx ? `<div class="ps-weather">${wx}</div>` : ''); };
  // round 17 G: one level down, drawn only when opened: the position (coordinates, Copy), the 3D dive, the data's sources and ages, the score's factors
  const breakdown = () => { const r = explain(i, state.h).rows.filter(x => !NOT_SCORED.has(x[0])), table = g => r.filter(x => (GROUP_OF[x[0]] || 'cond') === g).map(([k, v, f]) =>
    `<tr><td>${tr(k)}</td><td>${esc(v)}</td><td><div class="bar${f < .4 ? ' lo' : ''}"><i style="width:${Math.round(clamp(f) * 100)}%"></i></div></td></tr>`).join(''); // a weak factor in the caution colour
    return ['where', 'cond', 'draw'].map(g => { const t = table(g); return t ? `<section class="factor-group"><h4 class="lbl">${tr(g === 'where' ? 'grpWhere' : g === 'cond' ? 'grpCond' : 'grpDraw')}</h4><table class="factors">${t}</table></section>` : ''; }).join(''); };
  foldBody.more = () => secHtml('pin', tr('ui_tools'), gpsRow(...p) + (window.PsDive ? `<div class="spot-tools"><button class="btn" data-dive-open="${i}">${ic('depth', 'sm')}${esc(tr('dive3d'))}</button></div>` : '')) +
    feedsSec() + secHtml('info', tr('breakdown'), breakdown());
  const close = tr('close'), P = {
    zone: zoneNote(i),
    why: secHtml('info', tr('whyTitle'), (w => w ? `<ul class="reasons">${w}</ul>` : '')(whyLis([...liveWhy(i), ...why.map(whyText)])) + likelyLine(i)),
    go: cd.body || (bh.s && bh.h !== state.h ? // the conditions and the best time to go (js/conditions.js); without them, the fish's own best hour
      `<div class="best-time">${ic('clock', 'lg')}<div><b>${esc(tr('bestHere', whenT(hours[bh.h].t)))}</b><small>${tr('bestUpTo', bh.s)}</small></div><button class="btn" data-hour="${bh.h}">${tr('goThere')}</button></div>` : ''),
    baits: baitSec(i), lures: lureSec(i), seabed: seabedSec(rows), sure: window.PsSure?.html(i, infoOf(i)) || '', // round 13: how sure (js/sure.js)
    gps: `<div class="spot-tools d-acts">${routeBtn(...p)}${spotTools(i, true)}</div>`, // Directions, Log catch, Save, Share
    wx: folds.wx ? foldBody.wx() : '', more: folds.more ? foldBody.more() : '',
  }, J = tr('sp_jump'); // the head's chips: a jump to each section there is
  return { head: `${dial}${who}${cd.badge || ''}<button class="icon-btn" data-close-drawer aria-label="${close}" data-tip="${close}">${ic('close')}</button>` +
    `<nav class="d-jump">${Object.keys(J).filter(k => P[k]).map(k => `<button type="button" data-jump="${k}">${esc(J[k])}</button>`).join('')}</nav>`, ...P };
}
document.addEventListener('click', e => { // a chip of the details' head: its section to the top, clear of the head (phones: the head sticks inside the scroll)
  const b = e.target.closest('[data-jump]'), host = b?.closest('.drawer, .m-spot'), el = host?.querySelector(`.drawer-body [data-s="${b.dataset.jump}"] > *`); if (!el) return;
  const head = host.querySelector('.drawer-head');
  el.style.scrollMarginTop = (getComputedStyle(head).position === 'sticky' ? head.offsetHeight : 0) + 10 + 'px';
  el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
const composeDetails = ({ head, wx, more, ...body }) => `<div class="drawer-head" data-s="head">${head}</div><div class="drawer-body">${parts(body)}` +
  fold('wx', tr('spotWeather'), wx) + fold('more', tr('g17_spotMore'), more) + `</div>`;
const detailHtml = i => composeDetails(detailParts(i)); // js/mobile.js draws the phone sheet's details with it
// The details into a host (#drawer): a new spot, fish, method or language draws it all (js/area-gear.js and js/vessels.js then add their
// folds); the same again (an hour step, weather data arriving) rewrites only the parts that changed, keeping the scroll and those folds.
function drawDetails(host, i) {
  const key = [i, state.sp, state.mode, state.lang].join(), was = host.querySelector('.drawer-body')?.psDrawn, P = detailParts(i);
  if (was?.key === key) { patch(host, P, was); return; }
  const top = was?.i === i ? host.querySelector('.drawer-body').scrollTop : 0; // the same spot redrawn (fish, method, language) keeps its place
  host.innerHTML = composeDetails(P);
  const body = host.querySelector('.drawer-body'); body.psDrawn = { key, i, P }; if (top) body.scrollTop = top; // round 16 X: a new spot starts at the top anyway (the write forced a layout of the whole details in the tap)
}
function openCell(i) {
  if (i < 0 || !depth[i]) return;
  if (northMask[i]) { toast(tr('northNoData')); return; }
  state.focus = i; state.picked = true; sel.i = i; drawConditions();
  if (isPhone()) { PsMobile.openSpot(i); return; } // phones: the card is the bottom sheet's content (js/mobile.js)
  if (!$('#drawer').hidden) { openDetails(i); return; }
  const ll = [latOf(i), lonOf(i)], left = railOpen ? 350 : 20;
  Object.assign(sel.card.options, { autoPanPaddingTopLeft: [left, 70], autoPanPaddingBottomRight: [60, 20] });
  sel.card.setLatLng(ll).setContent(scoreCard(i)).openOn(map); sel.ring.setLatLng(ll).addTo(map);
  // Zoomed out, the map's bounds stop its pan short: a tall card above a northern or western spot (or one under the rail) would stay cut
  // off. Can the map move far enough to show it all? If not, the drawer instead, which always fits.
  const el = sel.card.getElement(), p = map.latLngToContainerPoint(ll), pb = map.getPixelBounds(), nw = map.project(map.options.maxBounds.getNorthWest(), map.getZoom());
  if (p.y + Math.max(0, pb.min.y - nw.y) < el.offsetHeight + 80 || p.x + Math.max(0, pb.min.x - nw.x) < left + el.offsetWidth / 2) { map.stop(); openDetails(i); }
}
function openDetails(i) {
  sel.i = i;
  if (isPhone()) { PsMobile.openSpot(i, true); return; } // the same sheet, opened full
  if (innerWidth < 1100 && railOpen) { setRail(false); sel.autoRail = true; } // tablets: rail and drawer together leave no map
  const d = $('#drawer'), was = !d.hidden; drawDetails(d, i); d.hidden = false;
  if (!was) d.querySelector('button')?.focus({ preventScroll: true }); // keyboard and screen-reader users land in what just opened
  map.closePopup(sel.card); // the drawer replaces the small card
  sel.ring.setLatLng([latOf(i), lonOf(i)]).addTo(map);
}
function closeDetails() {
  if (isPhone()) { PsMobile.spotBack(); return; } // back to the short card
  $('#drawer').hidden = true; sel.ring.remove(); if (!map.hasLayer(sel.card)) sel.i = -1;
  if (sel.autoRail) { sel.autoRail = false; setRail(true); }
}
function refreshOpen() { // keep whatever is open in step with the hour, fish and method
  drawBanner();
  try { window.PsCond?.drawAreas(); } catch (e) { console.warn(e); } // the area list (it recomputes only when the fish or method change)
  if (namedSpot) { // a named place's card: the same score as the map and the tap card for the hour on show
    const html = spotPopHtml(namedSpot.s);
    if (namedSpot.pop ? map.hasLayer(namedSpot.pop) : PsMobile.swapHtml(namedSpot.html, html)) { if (html !== namedSpot.html) namedSpot.pop?.setContent(html); namedSpot.html = html; } else namedSpot = null; // closed
  }
  if (sel.i < 0) return;
  if (isPhone()) { PsMobile.refreshSpot(); return; }
  if (!$('#drawer').hidden) drawDetails($('#drawer'), sel.i);
  if (map.hasLayer(sel.card) && !patchCard(sel.card.getElement(), sel.i)) sel.card.setContent(scoreCard(sel.i));
}
let namedSpot = null; // the named place whose card is open { s, html, pop }: refreshOpen redraws it, so its score follows the hour, fish and method (round 14)
function spotPopHtml(s) {
  const [name, t, la, lo, src] = s;
  const i = idxAt(la, lo), sc = i >= 0 && depth[i] ? scores[i] : null;
  const html = `<div class="spot-pop"><div class="sp-top">${sc != null ? ring(sc, 'lg') : ''}<span class="who"><span class="rate"${sc != null ? ` style="color:${solid(sc)}"` : ''}>${sc != null ? rating(sc) : tr('spot')[t]}</span>` +
    `<b>${esc(placeName(name) || tr('spot')[t])}</b><small>${tr('spot')[t]}${i >= 0 && depth[i] ? ` · ${depthM(i)} m` : ''}</small></span></div>` + // a named place, with the fish's chance there when it is at sea
    `<span class="sp-src">${tr('source')}: ${esc(window.PSAREMA_SPOT_SOURCES?.[src] ?? src)}</span>` + gpsRow(la, lo) + `</div>`;
  return html;
}
function openSpot(s) {
  const html = spotPopHtml(s); namedSpot = { s, html, pop: null };
  if (isPhone()) { PsMobile.showHtml(html); return; }
  namedSpot.pop = L.popup({ className: 'card-pop', maxWidth: 290, minWidth: 290 }).setLatLng([s[2], s[3]]).setContent(html).openOn(map);
}

/* ---------- Banner ---------- */
let bannerOff = null; // the fish whose ban note was dismissed
function drawBanner() {
  const closed = F && sp.closed?.includes(hours[state.h].month + 1), b = $('#banner'), hide = !F || !(sp.banned || closed) || bannerOff === sp.id;
  if (b.hidden !== hide) b.hidden = hide;
  const html = hide ? '' : `${ic('ban')}<span>${esc(tr(sp.banned ? 'bannedNote' : 'closedNote'))}</span><button class="icon-btn" data-close-banner aria-label="${tr('close')}">${ic('close')}</button>`;
  if (html && b.psHtml !== html) b.innerHTML = b.psHtml = html; // every hour step asks: the same note is not written again
}

/* ---------- Fish panel, guide tab and full guide ---------- */
const GROUPS = ['all', 'bottom', 'pelagic', 'cephalopod'], METHODS = ['all', 'boat', 'shore', 'spear'];
const monthNow = () => hours[0]?.month ?? new Date().getMonth();
const monthsBar = s => `<span class="months" title="${tr('season')}">${s.season.map((v, m) => `<i class="${m === monthNow() ? 'now' : ''}" style="--v:${v}"></i>`).join('')}</span>`; // the gallery's cards (the full guide's labelled bar went with it)
const gearName = id => L10(CATALOG[id]?.name) || id.replace(/_/g, ' ');
const ynText = o => esc(L10(o.what).replace(/^(yes|no|ναι|όχι)\s*[:,.]\s*/i, '')); // the yes/no pill already says it
/* ---------- Lure colours: each 3D lure picture repainted in the colours listed under it ---------- */
// A lure with a colour map (data/gear-img/<id>-mask.png from scripts/gear3d: red = body, green = back, black = hooks, eyes, line) gets
// its first colour on the body and its second on the back. The render's own light, shade and glitter stay: each region's brightness
// is scaled so that its average lands on the new colour. Two-tone colours bring their own back (sardine: blue over silver); red head
// paints the front fifth red. Painted once per lure and colour pair (kept as a blob URL); <img data-lure> are filled in as they appear.
const TWO = { sardine: ['#cfd6dc', '#2f5f9e'], green_silver: ['#cfd6dc', '#3f8a52'] }; // [body, back]
const lureImg = (id, colors) => colors?.length && window.PSAREMA_GEAR_MASKED?.includes(id)
  ? `<img data-lure="${id}" data-cols="${colors.slice(0, 2).join(',')}" src="data/gear-img/${id}.webp" alt="" width="400" height="250" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;display:block">`
  : ART[id] || '';
const painted = new Map(), rgb = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
const loadImg = src => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
function paintLure(id, cols) {
  const key = id + '|' + cols;
  if (!painted.has(key)) painted.set(key, Promise.all([loadImg(`data/gear-img/${id}.webp`), loadImg(`data/gear-img/${id}-mask.png`)]).then(([b, m]) => {
    const W = b.naturalWidth, H = b.naturalHeight, cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(m, 0, 0, W, H); const M = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H); g.drawImage(b, 0, 0, W, H); const img = g.getImageData(0, 0, W, H), B = img.data;
    const [c1, c2] = cols.split(','), col = k => rgb(COLORS[k]?.hex || '#888888');
    let body = col(c1), back = c2 ? col(c2) : body.map(v => v * .6), head = null;
    if (TWO[c1]) [body, back] = TWO[c1].map(rgb); else if (TWO[c2]) back = rgb(TWO[c2][1]);
    if (c1 === 'red_head') { head = col('red_head'); body = rgb('#f4f4f4'); back = c2 && c2 !== 'red_head' ? col(c2) : body; }
    else if (c2 === 'red_head') { head = col('red_head'); back = body; }
    let sr = 0, wr = 0, sg = 0, wg = 0, x0 = W, x1 = 0; // each region's mean brightness, and the painted span (for the head)
    for (let k = 0, n = W * H; k < n; k++) {
      const a = M[k * 4 + 3] / 255, r = M[k * 4] / 255 * a, gg = M[k * 4 + 1] / 255 * a; if (r + gg < .05) continue;
      const L = (.2126 * B[k * 4] + .7152 * B[k * 4 + 1] + .0722 * B[k * 4 + 2]) / 255;
      sr += L * r; wr += r; sg += L * gg; wg += gg; const x = k % W; if (x < x0) x0 = x; if (x > x1) x1 = x;
    }
    const mr = sr / (wr || 1) || .5, mg = sg / (wg || 1) || .5, hx = x0 + .2 * (x1 - x0);
    for (let k = 0, n = W * H; k < n; k++) { // no allocation per pixel: this ran 20–46 ms on a slow phone right as a card opened
      const a = M[k * 4 + 3] / 255, r = M[k * 4] / 255 * a, gg = M[k * 4 + 1] / 255 * a, p = Math.min(1, r + gg); if (p < .02) continue;
      const L = (.2126 * B[k * 4] + .7152 * B[k * 4 + 1] + .0722 * B[k * 4 + 2]) / 255, s = L / ((r * mr + gg * mg) / (r + gg)), hi = Math.max(0, s - 1.1) * 255 * .5; // above the mean: highlights stay bright
      const hd = head && k % W < hx, wr = r / (r + gg), sc = Math.min(s, 1.1);
      for (let j = 0; j < 3; j++) B[k * 4 + j] += (Math.min(255, (hd ? head[j] : wr * body[j] + (1 - wr) * back[j]) * sc + hi) - B[k * 4 + j]) * p;
    }
    g.putImageData(img, 0, 0);
    return new Promise(ok => cv.toBlob(bl => ok(URL.createObjectURL(bl)), 'image/webp', .9));
  }).catch(e => { console.warn('lure colours:', id, e); return null; }));
  return painted.get(key);
}
{ // watched only where gear cards appear (drawer, phone spot sheet, fish panel, fish guide, map popups): not every tile and marker of a pan
  // round 14: not inside a closed fold (gear in a fold not yet opened: pictures and repaints nobody sees);
  // they are painted when it opens. Round 17 G: nor in a spot's Gear tab while another tab shows (js/spot-sheet.js paints them as it opens)
  const paintIn = im => { if (im.closest('details:not([open]), [data-ss-tab]:not([data-ss-tab="gear"])')) return; paintLure(im.dataset.lure, im.dataset.cols).then(u => { if (u) im.src = u; }); };
  window.paintLuresIn = root => { for (const im of root.querySelectorAll('img[data-lure]')) paintIn(im); };
  const lureObs = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) for (const im of n.matches('img[data-lure]') ? [n] : n.querySelectorAll('img[data-lure]')) paintIn(im); });
  document.addEventListener('toggle', e => { if (e.target.open) for (const im of e.target.querySelectorAll?.('img[data-lure]') || []) paintIn(im); }, true);
  for (const el of [$('#drawer'), $('#m-spot'), $('#pages'), map.getPane('popupPane')]) if (el) lureObs.observe(el, { childList: true, subtree: true });
}
// round 16 P: a lure's size line in the app's language (the gear files write it in English: '7–14 g head')
const specText = t => tr('p_spec').reduce((v, [e, g]) => v.split(e).join(g), String(t));
function gearCard(id, sub = '', isBest = false, colors) { // colour names as text: phones cannot hover
  const sw = colors?.length ? `<span class="swatches">${colors.map(c => `<span><i style="background:${COLORS[c]?.hex || '#888'}"></i>${esc(L10(COLORS[c]?.name) || c)}</span>`).join('')}</span>` : '';
  return `<div class="gear${isBest ? ' best' : ''}" title="${esc(L10(CATALOG[id]?.desc))}"><div class="art">${lureImg(id, colors)}${isBest ? `<span class="tag-best">${tr('bestTag')}</span>` : ''}</div>` +
    `<b>${esc(gearName(id))}</b>${sub ? `<small>${esc(specText(sub))}</small>` : ''}${sw}</div>`;
}
const softCards = o => o.ids.map(id => gearCard(id, o.size || '', false, o.colors)).join(''); // soft plastics, with their size and colours when known
function setupHtml(m, st) {
  const kv = [];
  if (st.rod?.length) kv.push([tr('rod'), st.rod.map(gearName).join(', ')]);
  if (st.reel?.length) kv.push([tr('reel'), st.reel.map(gearName).join(', ')]);
  if (st.line?.main) kv.push([tr('line'), st.line.main]);
  if (st.line?.leader) kv.push([tr('leader'), st.line.leader]);
  if (st.rig?.length) kv.push([tr('rig'), st.rig.map(gearName).join(', ')]);
  if (st.hook) kv.push([tr('hook'), st.hook]);
  if (st.gun?.length) kv.push([tr('gun'), st.gun.map(gearName).join(', ')]);
  if (st.length) kv.push([tr('gunLength'), st.length]);
  return kvList(kv) + (L10(st.notes) ? `<p class="text">${esc(L10(st.notes))}</p>` : '');
}
const ALL_ART = `<div class="ph all">${ic('fish-list', 'lg')}</div>`; // All fish has no photo
const allBest = () => { let m = 0; for (const id in rank) m = Math.max(m, rank[id].s); return m; }; // the best single fish anywhere in the next 7 days
const inSeasonCount = () => { const m = monthNow(); return SPECIES.filter(f => !f.banned && !f.closed?.includes(m + 1) && f.season[m] >= .5).length; };
// Round 16 X phase 2: the fish's panels are written only when their text changed: the background ranking (model.js rankAll) draws them
// again at every step, and each rewrite made new pictures, a style pass and the dial's sweep (js/motion.js) for the same content
const putHtml = (el, html) => { if (el.psHtml !== html) { el.psHtml = html; el.innerHTML = html; } };
function drawFishPanel() {
  const s = sp, hb = Object.entries(s.habitat).sort((a, b) => b[1] - a[1]).filter(([k, v]) => v >= .5 && k !== 'open').map(([k]) => tr('hab')[k]);
  const r = rank[s.id], best = s.all ? allBest() || null : r && !s.banned ? r.s : null;
  // [art · name, other names · 7-day dial · stats]: the rail lays it out as a hero (big cut-out on top), phones as a row (app.css .fish-current)
  const stats = s.all ? [['sh_season', inSeasonCount()]] : [['sh_depth', `${s.depth[1]}–${s.depth[2]} m`], ['sh_water', `${s.sst[1]}–${s.sst[2]} °C`], ['sh_bed', hb.slice(0, 2).join(', ')]];
  putHtml($('#fish-current'), `${s.all ? ALL_ART : fishImg(s)}<span class="fc-body"><span class="lbl">${tr('fish')}</span><span class="fc-name">${esc(fishName(s))}</span>` +
    `<span class="fc-sub">${s.all ? esc(tr('allFishSub')) : `${esc(fishAlt(s))} · <i>${esc(s.scientific)}</i>`}</span>` +
    `<span class="fc-change">${ic('fish-list', 'sm')}${tr('allFish', SPECIES.length)}</span></span>` +
    (best != null ? `<span class="fc-dial"${r && !s.all ? ` title="${esc(tr('rankTip', r.s, whenT(hours[r.h].t)))}"` : ''}>${ring(best, 'lg')}<small>${tr('sh_best')}</small></span>` : '') +
    `<span class="fc-stats">${stats.filter(x => x[1] !== '').map(([k, v]) => `<span><small>${tr(k)}</small><b>${esc(v)}</b></span>`).join('')}</span>`);
  $('#fish-current').title = s.calibrated ? tr('calibrated', s.calibrated) : '';
  const im = CUT[s.id] || IMG[s.id], chance = s.all ? allBest() || null : r && !s.banned ? r.s : null; // phones: the top bar's fish chip
  const ranked = SPECIES.filter(x => rank[x.id] && rank[x.id].s >= 40 && x.methods.includes(state.mode)).sort((a, b) => rank[b.id].s - rank[a.id].s).slice(0, 4);
  // All fish: the three best bets' cut-outs fanned, the best in front, their names under the title (no rankings yet: the list icon)
  const trio = s.all ? ranked.filter(x => CUT[x.id]).slice(0, 3) : [], name = `<b>${esc(fishName(s))}</b>`;
  const art = trio.length ? trio.map((x, k) => `<img class="f${k}" src="${esc(CUT[x.id].file)}" alt="">`).reverse().join('') : s.all || !im ? ic('fish-list', 'lg') : `<img src="${esc(im.file)}" alt="">`;
  putHtml($('#mb-fish'), `<span class="mb-art${trio.length ? ' all' : ''}">${art}${chance != null ? ring(chance, 'sm') : ''}</span>` +
    (trio.length ? `<span class="mb-txt">${name}<small>${esc(trio.map(x => fishName(x)).join(' · '))}</small></span>` : name) + ic('chevron-down')); // phones: a chip in the filter row that opens the picker
  const warn = $('#sp-warn'); // round 17 G: the Guide tab's warning, now over Where to go (the rest of that tab is the fish's page)
  warn.hidden = s.methods.includes(state.mode) && state.mode !== 'spear';
  warn.textContent = (s.methods.includes(state.mode) ? '' : tr('rarely', fishName(s), state.mode)) + (state.mode === 'spear' ? tr('spearNote') : '');
  const wf = $('#where-fish'); wf.dataset.spPage = s.all ? '' : s.id; wf.innerHTML = `${ic(s.all ? 'fish-list' : 'book', 'sm')}<span>${esc(s.all ? tr('spx_allSpecies') : tr('g17_fishPage', fishName(s)))}</span>${ic('chevron-right', 'sm')}`;
  for (const b of $('#mode').children) b.setAttribute('aria-pressed', b.dataset.mode === state.mode);
}
// Fish search: no accents or case (ς = σ), and Greek names typed in Latin letters ("orfos" finds Ορφός, "barbouni" Μπαρμπούνι)
const plain = v => (v || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');
const GR_LAT = { α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', τ: 't', υ: 'i', φ: 'f', χ: 'h', ψ: 'ps', ω: 'o' };
const latin = v => v.replace(/μπ/g, 'b').replace(/ντ/g, 'd').replace(/γκ/g, 'g').replace(/ου/g, 'ou').replace(/αυ/g, 'av').replace(/ευ/g, 'ev').replace(/[α-ω]/g, c => GR_LAT[c] ?? c);
console.assert(latin(plain('Ορφός')) === 'orfos' && latin(plain('Μπαρμπούνι')) === 'barbouni' && plain('ΣΟΡΚΌΣ') === 'σορκοσ', 'fish search folds accents and Greek letters');
let galKey = '', galRank = null, galN = -1; // what the grid was last drawn for, and from which ranking (model.js rank: replaced each run, filled in steps)
function drawGallery(full) {
  const key = [state.lang, state.sp, state.group, state.gmethod, state.sort, $('#fish-search').value, monthNow(), isPhone()].join('|'), grid = $('#fish-grid');
  if (full !== true && key === galKey && grid.firstChild) { // the same list (model.js ranking in steps while it shows): only the dials fill in; no card moves or is rebuilt
    for (const c of grid.querySelectorAll('.fish-card[data-id]')) {
      const s = byId(c.dataset.id), v = s.all ? allBest() || null : rank[s.id]?.s, old = c.querySelector(':scope > .ring'), h = ring(v, 'sm');
      if (s.banned || s.all && v == null || old?.outerHTML === h) continue;
      if (old) old.outerHTML = h; else c.querySelector('.body').insertAdjacentHTML('beforebegin', h);
    }
    return;
  }
  galKey = key; galRank = rank; galN = Object.keys(rank).length;
  const q = plain($('#fish-search').value.trim()), ql = q.replace(/ch/g, 'h').replace(/y/g, 'i'); // ql: the Latin spelling as latin() writes it
  $('#fish-groups').innerHTML = GROUPS.map(g => `<button data-g="${g}" aria-pressed="${g === state.group}">${tr(g)}</button>`).join('');
  $('#fish-methods').innerHTML = METHODS.map(m => `<button data-m="${m}" aria-pressed="${m === (state.gmethod || 'all')}">${m === 'all' ? tr('anyMethod') : ic(m, 'sm') + tr(m)}</button>`).join('');
  const so = $('#fish-sort');
  if (so.dataset.lang !== state.lang) { so.dataset.lang = state.lang; so.innerHTML = [['best', 'sortBest'], ['season', 'sortSeason'], ['name', 'sortName']].map(([k, t]) => `<option value="${k}">${tr(t)}</option>`).join(''); } // rebuilt only on a language change, so an open list survives redraws
  so.value = state.sort;
  const m = monthNow(), coll = new Intl.Collator(locale()), gm = state.gmethod || 'all', every = q && isPhone(); // phones hide the filters while you search: search every fish
  const list = SPECIES.filter(s => (every || state.group === 'all' || s.group === state.group) && (every || gm === 'all' || s.methods.includes(gm)) &&
    (!q || [s.name, s.el, s.local, CY[s.id]?.also, s.scientific].some(v => { const p = plain(v); return p.includes(q) || latin(p).includes(ql); })));
  list.sort(state.sort === 'name' ? (a, b) => coll.compare(fishName(a), fishName(b))
    : state.sort === 'season' ? (a, b) => b.season[m] - a.season[m]
    : (a, b) => (rank[b.id]?.s ?? -1) - (rank[a.id]?.s ?? -1));
  const allCard = !q && state.group === 'all' ? `<button class="fish-card all" data-id="all" aria-pressed="${state.sp === 'all'}">${ALL_ART}${allBest() ? ring(allBest(), 'sm') : ''}` +
    `<span class="body"><b>${esc(tr('allFishName'))}</b><small>${esc(tr('allFishSub'))}</small><span class="row2"><small>${esc(tr('inSeason', inSeasonCount()))}</small></span></span></button>` : '';
  $('#fish-grid').innerHTML = allCard + (list.length ? list.map(s => `<button class="fish-card" data-id="${s.id}" aria-pressed="${s.id === state.sp}">${fishImg(s)}` +
    (s.banned ? `<span class="flag ban">${ic('ban', 'sm')}${tr('banned')}</span>` : s.warning ? `<span class="flag" title="${esc(fishText(s, 'warning'))}">${ic('warning', 'sm')}${tr('caution')}</span>` : '') +
    (s.banned ? '' : ring(rank[s.id]?.s, 'sm')) + // the week's best chance, as a dial on the stage (css/sheets.css)
    `<span class="body"><b>${esc(fishName(s))}</b><small>${esc(fishAlt(s))}</small><span class="row2"><small>${s.methods.map(x => ic(x, 'sm')).join(' ')}</small>${monthsBar(s)}` +
    (window.PsSpecies ? `<span class="sp-info" data-sp-page="${s.id}" role="button" aria-label="${esc(tr('spx_info', fishName(s)))}" title="${esc(tr('spx_info', fishName(s)))}">${ic('info', 'sm')}</span>` : '') + // its page, not picking it
    `</span></span></button>`).join('')
    : `<p class="empty">${esc(tr('noMatch'))}</p>`) + `<p class="grid-credit">${esc(tr('photos'))}</p>`; // the photo credit closes the list instead of taking a footer's height
  $('#fish-foot').innerHTML = window.PsSpecies ? `<button class="btn" data-sp-page="">${ic('book', 'sm')}${esc(tr('spx_allSpecies'))}</button>` : ''; // the species pages' index
}
function openGallery() {
  if (state.gmMode !== state.mode) state.gmethod = state.gmMode = state.mode; // the method filter starts on the way you fish
  if (isPhone()) $('#fish-search').value = ''; // a fresh list each time (the filters hide while a search is typed)
  $('#fish-modal').hidden = false; $('#fish-search').placeholder = tr('search'); drawGallery(rank !== galRank || Object.keys(rank).length !== galN); if (!isPhone()) $('#fish-search').focus(); // drawn afresh only when something changed since it last showed
  for (const b of document.querySelectorAll('.sheet-tools [aria-pressed="true"]')) b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); // phones: the chosen chip may sit off the end of its row
}
function closeModal(id) {
  $(id).hidden = true;
  if (id === '#help-modal') window.PsHelp?.close?.();
  if (id === '#guide') { $(id).classList.remove('wl'); try { localStorage.setItem(GUIDE_SEEN, '1'); } catch {} } // seen, however it was closed (Got it, Back, backdrop, Escape); round 14: the welcome once
}
// Round 14: the first run's welcome (#guide.wl, js/app.js). Quick tour turns its card into the five-step tour (js/help.js); its EN / ΕΛ is the app's language switch.
function startTour() { const g = $('#guide'); loadScripts('js/help.js').then(() => { g.classList.remove('wl'); window.PsHelp?.tour?.(g); }, e => console.warn(e.message)); } // the welcome stays until the tour takes the card
$('#guide').addEventListener('click', e => { const b = e.target.closest('[data-wl-lang]'); if (b) $(`#lang [data-lang="${b.dataset.wlLang}"]`)?.click(); });
$('#guide').addEventListener('keydown', e => { // round 14 phase 2: the welcome keeps the keyboard inside it (the tour has its own: js/help.js)
  if (e.key !== 'Tab' || !$('#guide').classList.contains('wl')) return;
  const f = [...$('#guide').querySelectorAll('button')].filter(b => b.offsetParent), a = f[0], z = f.at(-1), at = document.activeElement;
  if (e.shiftKey ? at === a || at.id === 'guide-title' : at === z) { e.preventDefault(); (e.shiftKey ? z : a).focus(); }
});
function chooseFish(id) { state.sp = id; closeModal('#fish-modal'); refresh(); }
$('#fish-search').addEventListener('input', drawGallery);
$('#fish-groups').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) { state.group = b.dataset.g; drawGallery(); savePrefs(); } });
$('#fish-methods').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { state.gmethod = b.dataset.m; drawGallery(); } });
$('#fish-sort').addEventListener('change', e => { state.sort = e.target.value; drawGallery(); savePrefs(); });
$('#fish-grid').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) chooseFish(b.dataset.id); });

/* ---------- Help centre ---------- */
const helpOpts = () => ({ lang: state.lang, onClose: () => closeModal('#help-modal') }); // the help's own close button closes the sheet too
function openHelp() {
  $('#help-modal').hidden = false;
  if (window.PsHelp?.open) PsHelp.open($('#help-host'), helpOpts());
  else { $('#help-host').innerHTML = ''; $('#guide').hidden = false; closeModal('#help-modal'); }
}

/* ---------- Where to go: the best spots at the hour on the map, or near you ---------- */
// One row of a leaderboard (css/spot.css .top; the first three stand out): its rank · place over depth, seabed (and the boat run) over the
// spot's best time this week and its distance · the score's dial. Round 17 G: no mini-map and no day line (a canvas and a curve per row).
const spotRow = (n, i, s, attr, h, dist = '', distTip = '') => { const p = [latOf(i), lonOf(i)];
  return `<li><button class="row" ${attr} title="${gps(...p)}"><span class="rank">${n + 1}</span>` +
    `<span class="t-main"><span class="t-name">${esc(describe(...p))}</span><span class="t-meta">${depthM(i)} m${esc(habPart(i))}${state.mode === 'boat' && LAUNCH[launchOf[i]] && launchKm[i] >= .5 ? ` · ${tr('run', launchKm[i].toFixed(0))}` : ''}</span>` + // at a harbour: no "0 km"
    `<span class="t-when">${h >= 0 ? `<b title="${esc(tr('ui_bestTime'))}">${ic('clock', 'sm')}${esc(whenT(hours[h].t))}</b>` : ''}${dist ? `<span title="${esc(distTip)}">${esc(dist)}</span>` : ''}</span></span>` +
    `<span class="t-side">${ring(s, 'sm')}</span></button></li>`; };
// The best spots (map.js drawTop calls it with the spots it picked): a spot's best hour is the same at every hour, so it is worked out once
// per spot, fish and method (~0.1 ms each), and the list is written only when its HTML changed.
// round 17 G: no good water at this hour (night, a rough day): the next good time instead, the map's own line (map.js noGoodNext), a tap to it
const nextGood = () => { const r = noGoodNext(); return `<li class="empty">${r.h >= 0 ? `<button class="btn where-ng" data-hour="${r.h}">${ic('clock', 'sm')}<span>${esc(r.text)}</span>${ic('chevron-right', 'sm')}</button>` : esc(r.text)}</li>`; };
const spotBest = { key: '', h: new Map() };
function drawSpotList(list) {
  $('#top-when').textContent = tr('topAt', whenT(hours[state.h].t));
  const key = [state.sp, state.mode, state.first, F.T].join(); if (spotBest.key !== key) { spotBest.key = key; spotBest.h.clear(); }
  const bh = i => spotBest.h.get(i) ?? spotBest.h.set(i, bestHourAt(i).h).get(i);
  const html = list.length ? list.map((t, n) => { const r = state.loc && km(state.loc, t.p); // and how far from you, once there is a location
    return spotRow(n, t.i, t.s, `data-n="${n}"`, bh(t.i), r ? `${fmtKm(r.d)} km` : '', r ? tr('away', fmtKm(r.d), compass(r.bearing)) : ''); }).join('')
    : sp.banned ? `<li class="empty">${esc(tr('bannedNote'))}</li>` : nextGood();
  const ol = $('#top'); if (ol.psHtml !== html) ol.innerHTML = ol.psHtml = html;
}

/* ---------- Near me ---------- */
let youMarker = null, radiusRing = null, nearList = [];
const RADII = [5, 25, 100]; // round 17 G: three distances (were seven) after Anywhere; a saved one between snaps to the next one up
state.radius = RADII.find(r => r >= state.radius) || RADII[RADII.length - 1];
// Near me's message box (app.css: the empty-list box, with an icon): the intro, locating, errors, or nothing found (with a wider search)
function nearMsg(text, icon = 'my-location', extra = '') { const m = $('#near-msg'); m.innerHTML = text ? `${ic(icon, 'lg')}<span>${esc(text)}</span>${extra}` : ''; m.hidden = !text || state.tab !== 'near'; }
function setLocation(la, lo, fly = true) {
  if (!L.latLngBounds(VIEW).pad(.05).contains([la, lo])) { nearMsg(tr('outside'), 'warning'); return; }
  state.loc = [+la.toFixed(5), +lo.toFixed(5)]; savePrefs();
  if (!youMarker) youMarker = L.marker(state.loc, { icon: L.divIcon({ className: 'you', html: '<i class="you-hd"></i><i class="you-dot"></i>', iconSize: [16, 16] }), pane: 'spots', zIndexOffset: 1000, keyboard: false }) // css/map-fx.css
    .bindTooltip(() => tr('youAreHere'), { direction: 'top', offset: [0, -8] }).addTo(map);
  else youMarker.setLatLng(state.loc);
  if (!radiusRing) radiusRing = L.circle(state.loc, { radius: state.radius * 1000, color: '#5aa9ff', weight: 1, dashArray: '4 4', fill: false, interactive: false, pane: 'zones' }).addTo(map);
  else radiusRing.setLatLng(state.loc).setRadius(state.radius * 1000);
  if (fly) map.flyToBounds(radiusRing.getBounds(), { ...isPhone() ? PsMobile.pad() : { paddingTopLeft: [350, 60] }, duration: .6, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
  findNear(); // no tab switch: callers that need Near me open it, and a saved location must not override the saved tab
}
// Live position, as a maps app shows it: a blue dot and its accuracy circle that follow you. A small move only moves them; once you are
// 300 m (or a twentieth of the circle) from where Near me last looked, its list is worked out again. The map flies to you only when you ask (the locate buttons).
// The app asks for your location once, on its first start (see LOC_ASKED below); the watch pauses while the app is in the background.
// Battery: the WebView's GPS watch takes a fix every second. So GPS runs until a fix within GOOD_M (at most SEEK at a time), then the cheap
// network watch takes over, with GPS again every REFRESH or as soon as a cheap fix shows a move. While you move (GPS speed over 1 m/s) GPS
// stays on, as in a maps app. A fix inside the circle shown that is not sharper is jitter: nothing is redrawn.
const GOOD_M = 50, SEEK = 30e3, REFRESH = 60e3;
let watchId = null, wantWatch = false, flyNext = false, fix = null, fixAcc = Infinity, accRing = null, hiAcc = false, gpsT = 0;
function onFix(p) {
  const { latitude: la, longitude: lo, accuracy, speed, heading } = p.coords, d = fix ? km(fix, [la, lo]).d * 1000 : Infinity;
  const hd = heading != null && heading >= 0 && speed > .5, you = youMarker?.getElement(); // moving: the dot's beam points where you head (null/NaN still)
  if (you) { you.classList.toggle('hd', hd); if (hd) you.style.setProperty('--hd', `${Math.round(heading)}deg`); }
  if (hiAcc && accuracy <= GOOD_M) startWatch(speed > 1); // a good fix: moving, GPS stays on; still, it rests
  else if (!hiAcc && d > accuracy + fixAcc) startWatch(); // the cheap watch says you moved: GPS
  if (!flyNext && d < Math.max(fixAcc, accuracy) && accuracy > fixAcc / 2) return;
  fix = [la, lo]; fixAcc = accuracy;
  if (!L.latLngBounds(VIEW).pad(.05).contains(fix)) { if (flyNext) { flyNext = false; nearMsg(tr('outside'), 'warning'); } return; }
  if (!accRing) accRing = L.circle(fix, { radius: accuracy, color: '#5aa9ff', weight: 1, opacity: .45, fillColor: '#5aa9ff', fillOpacity: .1, interactive: false, pane: 'zones' }).addTo(map);
  else accRing.setLatLng(fix).setRadius(accuracy);
  if (flyNext || !state.loc || km(state.loc, fix).d > Math.max(.3, state.radius / 20)) { const fly = flyNext; flyNext = false; nearMsg(''); setLocation(la, lo, fly); } // a wide circle: a bigger move first
  else { youMarker?.setLatLng(fix); radiusRing?.setLatLng(fix); }
  window.PsFollow?.fix(fix); // following you (map.js): the map keeps you in the middle
}
function onFixError(e) { // 1: no permission; 2: no fix (location turned off); 3: timed out, the watch keeps trying
  if (e.code === 3 && fix || e.code !== 1 && !hiAcc) return; // the cheap watch (often no network fix at sea): GPS tries again after REFRESH
  if (!flyNext) { // the app's own watch, not the locate button: no message, no dot, and no asking again (the owner: only the locate button asks)
    if (e.code === 1 || window.Capacitor?.isNativePlatform?.() && /off/.test(e.message || '')) stopWatch(); // denied, or the phone's location is off
    return;
  }
  flyNext = false;
  const msg = tr(e.code === 1 ? 'locDenied' : 'locNoFix'); nearMsg(msg, 'warning'); toast(msg);
  if (e.code === 1) stopWatch();
}
// In the Android app (js/native.js, an APK with @capacitor/geolocation) the same two watches come from the phone's own location service,
// which takes a fix only as often as asked: GPS every 5 s (not every second), the cheap one each minute, and drops fixes that did not move.
let watchNat = false; // watchId is PsNative's, not the WebView's
const hasGeo = () => !!(window.PsNative?.hasGeo || navigator.geolocation);
function clearGeo() { if (watchId != null) watchNat ? PsNative.clearWatch(watchId) : navigator.geolocation.clearWatch(watchId); watchId = null; }
function startWatch(hi = true) { // hi: GPS for up to SEEK (called again, SEEK more), then the cheap watch; the cheap one: GPS after REFRESH
  if (!hasGeo()) return;
  wantWatch = true;
  clearTimeout(gpsT); gpsT = setTimeout(startWatch, hi ? SEEK : REFRESH, !hi);
  if (watchId != null && hi === hiAcc) return;
  clearGeo();
  hiAcc = hi; watchNat = !!window.PsNative?.hasGeo;
  watchId = watchNat ? PsNative.watch((p, e) => p ? onFix(p) : onFixError(e), hi ? { high: true, interval: 5000, minInterval: 2000, maxAge: 10000, distance: 5, force: flyNext }
    : { high: false, interval: 60000, minInterval: 30000, maxAge: 60000, distance: 25 }) // force: the locate button may ask for the permission again
    : navigator.geolocation.watchPosition(onFix, onFixError, hi ? { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 } : { enableHighAccuracy: false, maximumAge: 60000 });
}
function stopWatch(forget = true) { clearTimeout(gpsT); clearGeo(); if (forget) wantWatch = false; }
document.addEventListener('visibilitychange', () => { if (document.hidden) stopWatch(false); else if (wantWatch) startWatch(); });
function locateMe(go) { // go: the Near tab's My location (the user's yes); the map's locate button and other ways in first say why (round 14)
  if (isPhone()) PsMobile.sheet(!locOk && !go ? 2 : 1); else if (!railOpen) setRail(true); // the reason: the sheet up, so My location shows under it
  showTab('near');
  if (!hasGeo()) { nearMsg(tr('locDenied'), 'warning'); return; }
  if (!locOk && !go) { drawNear(); $('#loc-me').focus({ preventScroll: true }); return; } // never allowed yet: the one-line reason and My location, no system question
  if (!locOk) { locOk = true; try { localStorage.setItem(LOC_ASKED, '1'); } catch {} }
  if (fix && watchId != null) { window.PsFollow?.tap(fix) || setLocation(...fix); startWatch(); return; } // already watching you: fly there, or with you on screen follow you (map.js PsFollow); a fresh GPS fix
  nearMsg(tr('locating')); flyNext = true; stopWatch(); startWatch();
}
// Round 14 (store release): nothing asks for the location at start. The first time, the Near tab says in one line why it is needed and
// My location asks (the system's own question); a locate tap elsewhere opens that tab. Allowed once (or on a phone where it already is),
// the app follows you when it is on, without asking or complaining (no dot when it is off), and the locate buttons go straight to it.
const LOC_ASKED = 'psarema-loc-asked'; // also set on the first start by older versions: those users were asked then
let locOk = (() => { try { return !!localStorage.getItem(LOC_ASKED); } catch { return true; } })();
const locYes = () => { locOk = true; startWatch(); drawNear(); };
if (window.Capacitor?.isNativePlatform?.()) window.Capacitor.Plugins?.Geolocation?.checkPermissions?.() // rejects while the phone's location is off
  .then(st => { if (st?.location === 'granted' || st?.coarseLocation === 'granted') locYes(); }, () => {});
else navigator.permissions?.query({ name: 'geolocation' }).then(p => { if (p.state === 'granted') locYes(); }, () => {});
function findNear() { // best cells within the radius, each with its best hour over the next 7 days
  if (!state.loc || !F) { drawNear(); return; } // also marks the radius and No location before there is a location
  const [la, lo] = state.loc, R = state.radius, cx = Math.floor((lo - WEST) / RES), cy = Math.floor((NORTH - la) / RES);
  // The cells that can score (cur.idx) within R; a wide circle scores an even sample of ~3000 of them (shore spots are a thin strip,
  // so a coarse grid would miss them). ponytail: a stride, not a spatial pick; fine while the list shows only 5.
  const within = [], cands = [], R2 = R * R;
  for (let j = 0; j < cur.n; j++) {
    const i = cur.idx[j], dx = (i % W - cx) * KX, dy = ((i / W | 0) - cy) * KY;
    if (dx * dx + dy * dy <= R2) within.push(i);
  }
  for (let k = 0, step = Math.max(1, Math.ceil(within.length / 3000)); k < within.length; k += step) {
    const i = within[k], b = bestHourAt(i);
    if (b.s >= 40) { const d = km([la, lo], [latOf(i), lonOf(i)]); cands.push({ i, s: b.s, h: b.h, d: d.d, dir: d.bearing }); }
  }
  cands.sort((a, b) => b.s - a.s || a.d - b.d);
  const gap = Math.max(state.mode === 'boat' ? 1.5 : .75, R / 20); // a wide circle: its five spots spread out, not all in one bay
  nearList = [];
  for (const c of cands) { if (nearList.every(n => km([latOf(n.i), lonOf(n.i)], [latOf(c.i), lonOf(c.i)]).d > gap)) nearList.push(c); if (nearList.length === 5) break; }
  drawNear();
}
function drawNear() {
  const near = state.tab === 'near'; // Anywhere (data-r 0) or one of the distances
  for (const b of $('#radius').children) b.setAttribute('aria-pressed', near ? +b.dataset.r === state.radius : b.dataset.r === '0');
  $('#loc-none').setAttribute('aria-pressed', !state.loc);
  $('#loc-me').classList.toggle('primary', !state.loc); // no location yet: the one thing to do
  const list = $('#near-list'), wider = RADII.find(r => r > state.radius);
  if (!near || !state.loc || !F) { list.hidden = true; nearMsg(near && !state.loc ? tr(locOk ? 'nearIntro' : 'r14_locWhy') : ''); return; }
  if (!nearList.length) { list.hidden = true; nearMsg(tr('nearNone', state.radius), 'search', wider ? `<button class="btn" data-r="${wider}">${esc(tr('nearWiden', wider))}</button>` : ''); return; }
  nearMsg('');
  list.hidden = false;
  list.innerHTML = nearList.map((c, n) => spotRow(n, c.i, c.s, `data-near="${n}"`, c.h, `${fmtKm(c.d)} km ${compass(c.dir)}`, tr('away', fmtKm(c.d), compass(c.dir)))).join('');
}
const drawRadius = () => { $('#radius').innerHTML = `<button data-r="0">${esc(tr('g17_anywhere'))}</button>` + RADII.map(r => `<button data-r="${r}">${r} km</button>`).join(''); };
drawRadius();
$('#radius').addEventListener('click', e => { // Anywhere: the best spots at the hour; a distance: the best near you (phones: the new circle fits above the sheet)
  const b = e.target.closest('[data-r]'); if (!b) return; const r = +b.dataset.r;
  if (r) state.radius = r; showTab(r ? 'near' : 'spots'); savePrefs();
  if (r && state.loc) setLocation(...state.loc, isPhone()); else drawNear();
});
$('#near-msg').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) $(`#radius [data-r="${b.dataset.r}"]`).click(); }); // nothing found: the next distance up
function clearLocation() { // forget the location and stop following it: nothing is stored, Near me waits for one
  state.loc = null; savePrefs(); stopWatch(); fix = null;
  youMarker?.remove(); radiusRing?.remove(); accRing?.remove(); youMarker = radiusRing = accRing = null;
  nearList = []; drawNear(); toast(tr('locCleared'));
}
$('#near-list').addEventListener('click', e => {
  const b = e.target.closest('[data-near]'); if (!b) return;
  const c = nearList[+b.dataset.near];
  setHour(c.h); map.setView([latOf(c.i), lonOf(c.i)], Math.max(map.getZoom(), 13)); openCell(c.i);
});

/* ---------- Where to go: Anywhere or near you (round 17 G: it was four tabs); state.tab keeps which ('spots' | 'near') ---------- */
function showTab(name) {
  state.tab = name === 'near' ? 'near' : 'spots';
  const near = state.tab === 'near';
  $('#top').hidden = near; $('.where .sk-cap').hidden = near; $('#near-btns').hidden = !near;
  drawNear();
}
function refresh() { // round 16 engine: the fish is prepared in slices (model.js prepSoon), then drawn; a quick one is done within this call, as before
  savePrefs(); prepSoon(() => { drawFishPanel(); drawSightings(); if (F) { render(); findNear(); } });
}
$('#mode').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; state.mode = b.dataset.mode; refresh(); if (F) rankAll(); });
$('#top').addEventListener('click', e => {
  const b = e.target.closest('[data-n]'); if (!b) return;
  const t = tops[+b.dataset.n];
  map.setView(t.p, Math.max(map.getZoom(), 12));
  openCell(t.i);
});
let railOpen = true;
function setRail(open_) { // what is shown now; state.rail keeps only the user's own choice
  railOpen = open_;
  $('#rail').classList.toggle('collapsed', !open_);
  $('#rail-toggle').setAttribute('aria-expanded', open_);
  const t = $('#rail-toggle'); t.setAttribute('aria-label', t.dataset.tip = tr(open_ ? 'collapse' : 'expand'));
}
function toggleLayers(force) {
  const pop = $('#layers-pop'), show = force ?? pop.hidden;
  if (show) { groupLayers(); drawLayerCounts(); }
  pop.hidden = !show; $('#layers-btn').setAttribute('aria-expanded', show);
}
// Round 17 G: the heat switch's options (js/map.js Contour bands and My water, js/sure.js How sure) are written right under it, in the main
// list; they belong with the opacity under More layers. Moved each time the panel opens (some come at DOMContentLoaded, after this file).
function groupLayers() { const rows = $('#lp-main').querySelectorAll(':scope > .lp-sub'); if (rows.length) $('#lp-more .lp-grp[data-grp="fishing"] .lp-items').prepend(...rows); }
function drawLayerCounts() { // More layers' summary: how many of its layers are on, so folded it still says what the map shows
  const m = $('#lp-more'), n = m.querySelectorAll(':is(.lp-items, .lp-over) > label > input:checked').length; m.querySelector('.lp-n').textContent = n ? tr('nOn', n) : '';
}
const LGRP = 'psarema-layers-open'; // ['more'] while More layers is unfolded
try { $('#lp-more').open = (JSON.parse(localStorage.getItem(LGRP)) || []).includes('more'); } catch {}
$('#lp-more').addEventListener('toggle', e => { try { localStorage.setItem(LGRP, JSON.stringify(e.target.open ? ['more'] : [])); } catch {} });
document.addEventListener('pointerdown', e => { if (!$('#layers-pop').hidden && !e.target.closest('.layers-wrap')) toggleLayers(false); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  for (const id of MODALS) if (!$(id).hidden) { closeModal(id); return; }
  if (!$('#layers-pop').hidden) { toggleLayers(false); return; }
  if (!$('#drawer').hidden) { closeDetails(); return; }
  map.closePopup();
});
for (const el of [$('#rail'), $('.hud'), $('#drawer'), $('#banner'), $('#mobile-bar')]) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); }
function setHour(h) { // any hour: the past 2 days (looking back) through the forecast
  state.h = Math.min(F.T - 1, Math.max(0, h)); $('#hour').value = state.h; render();
  window.PsWeather?.setHour?.(state.h);
}
$('#hour').addEventListener('input', e => setHour(+e.target.value));
function togglePlay() { // plays the forecast: from now, round again
  const on = !state.playing; $('#play-icon').innerHTML = ic(on ? 'pause' : 'play') || (on ? '❚❚' : '▶');
  if (on) state.playing = setInterval(() => setHour(state.h < state.first || state.h >= F.T - 1 ? state.first : state.h + 1), 700); else { clearInterval(state.playing); state.playing = null; }
}
// Every button of the page in one handler: data-ui names what it does (index.html), data-close the sheet it closes; the cards' and
// details' buttons carry their own (data-more, data-hour, …). Only the containers with their own lists listen for themselves.
const UI = { gallery: openGallery, help: openHelp, plan: () => window.PsPlanner?.open(), locate: () => locateMe(true), tour: startTour, 'loc-none': clearLocation,
  layers: () => toggleLayers(), 'layers-close': () => toggleLayers(false), rail: () => { state.rail = !railOpen; setRail(state.rail); savePrefs(); },
  now: () => F && setHour(state.first), best: () => F && setHour(bestHour), play: () => F && togglePlay(), retry: () => retryForecast() }; // retry: js/app.js (the forecast again, no reload). bestHour: future hours only (map.js drawWhen)
const MODALS = ['#fish-modal', '#guide', '#help-modal'];
document.addEventListener('click', e => {
  if (MODALS.includes('#' + e.target.id)) { closeModal('#' + e.target.id); return; } // the backdrop
  const b = e.target.closest('[data-ui], [data-close], [data-copy], [data-more], [data-close-drawer], [data-close-banner], [data-hour]'); if (!b) return;
  const d = b.dataset;
  if (d.ui) UI[d.ui]?.();
  else if (d.close) closeModal(d.close);
  else if (d.copy != null) copyText(d.copy);
  else if (d.more) openDetails(+d.more);
  else if (d.closeDrawer != null) closeDetails();
  else if (d.closeBanner != null) { bannerOff = sp.id; drawBanner(); }
  else if (F) setHour(+d.hour);
});

/* ---------- Layers ---------- */
state.layers = { heat: true, zones: true, contours: false, sightings: false, fishing: true, structure: true, access: false, beach: false, protected: true, labels: true,
  wind: false, waves: false, currents: false, rain: false, temp: false, ...state.layers };
// round 17 G: state.layers.sightings follows the one Sightings switch (js/pins.js syncDots); its own box is gone // the pins (js/pins.js) show sightings now: the old dots start off, once
const WEATHER_LAYERS = ['wind', 'waves', 'currents', 'rain', 'temp'];
const FIELDS = ['waves', 'rain', 'temp']; // colour fields: one at a time, and the fishing colours dim under it
const MIN_Z = { contours: 10, structure: 11, access: 11, beach: 11 }; // dense layers show only zoomed in
const LAYER_OBJ = { heat: () => heat, zones: () => zones, contours: () => contours, labels: () => labels, protected: () => protLayer,
  sightings: () => sightLayer, fishing: () => spotLayers.fishing, structure: () => spotLayers.structure, access: () => spotLayers.access, beach: () => spotLayers.beach };
for (const w of WEATHER_LAYERS) LAYER_OBJ[w] = () => window.PsWeather?.layers?.[w] || null;
const setHeatOp = () => heat.setOpacity(state.op / 100 * (FIELDS.some(f => state.layers[f] && LAYER_OBJ[f]()) ? .35 : 1));
function applyLayer(name) {
  const on = state.layers[name] && map.getZoom() >= (MIN_Z[name] || 0);
  if (name === 'contours' && on && !contours) buildContours();
  const layer = LAYER_OBJ[name]();
  if (layer) { if (on) layer.addTo(map); else map.removeLayer(layer); }
  if (name === 'heat') on ? pins.addTo(map) : map.removeLayer(pins);
  if ((name === 'zones' || name === 'heat') && F) drawZones();
  if (WEATHER_LAYERS.includes(name) || name === 'vessels') { drawWeatherLegend(); setHeatOp(); }
}
map.on('zoomend', () => { for (const name in MIN_Z) applyLayer(name); });
function drawWeatherLegend() { // shown on the map, under the fishing legend, in a fold named after the layers that are on (ship traffic's own legend joins it: js/vessels.js)
  const on = WEATHER_LAYERS.filter(w => state.layers[w] && LAYER_OBJ[w]()), ships = !!(state.layers.vessels && LAYER_OBJ.vessels?.());
  $('#wx-fold').hidden = !on.length && !ships;
  $('#wx-names').textContent = [...on.map(w => tr('l_' + w)), ...ships ? [tr('l_vessels')] : []].join(' · ');
  $('#weather-legend').innerHTML = on.map(w => { try { return PsWeather.legend(w); } catch { return ''; } }).join('');
}
$('#wx-fold').open = !isPhone(); // phones: the map first, the colour keys a tap away
const OWN_LAYERS = Object.keys(LAYER_OBJ).filter(n => { const box = $('#lay-' + n); if (box) box.checked = state.layers[n]; return box; });
$('#layers-pop').addEventListener('change', e => {
  const name = e.target.id.slice(4), box = e.target;
  if (box.type === 'checkbox' && OWN_LAYERS.includes(name)) {
    state.layers[name] = box.checked;
    if (box.checked && FIELDS.includes(name)) for (const f of FIELDS) if (f !== name && state.layers[f]) { state.layers[f] = $('#lay-' + f).checked = false; applyLayer(f); }
    applyLayer(name); savePrefs();
  }
  drawLayerCounts();
});
const opEl = $('#heat-op'), minEl = $('#min-score'), fillRange = el => el.style.setProperty('--v', (el.value - el.min) / (el.max - el.min) * 100 + '%'); // the lit part of the track (app.css .slider)
opEl.value = state.op; $('#heat-op-v').textContent = state.op; setHeatOp(); fillRange(opEl);
opEl.addEventListener('input', () => { state.op = +opEl.value; $('#heat-op-v').textContent = state.op; setHeatOp(); fillRange(opEl); savePrefs(); });
minEl.value = state.min; $('#min-score-v').textContent = state.min; buildLut(); fillRange(minEl);
minEl.addEventListener('input', () => { state.min = +minEl.value; $('#min-score-v').textContent = state.min; buildLut(); fillRange(minEl); if (F) paint(); savePrefs(); });

/* ---------- Map pointer: readout, taps ---------- */
let hoverQueued = null, readHtml = '';
map.on('mousemove', e => {
  if (hoverQueued) { hoverQueued = e.latlng; return; }
  hoverQueued = e.latlng;
  requestAnimationFrame(() => {
    const { lat, lng } = hoverQueued; hoverQueued = null;
    const i = idxAt(lat, lng), r = $('#readout');
    if (i < 0 || !depth[i] || !F) { r.hidden = true; return; }
    r.hidden = false;
    const html = northMask[i] ? `<span>${esc(tr('noDataHere'))}</span>` : `<span><b>${scores[i]}</b> ${rating(scores[i])}</span><span>${depthM(i)} m${esc(habPart(i))}</span>` +
      `<span>${nf(dist[i])} ${tr('kmOff')}</span>${sat.sst ? `<span>${nf(sat.sst[i])}°</span>` : ''}`;
    if (html !== readHtml) r.innerHTML = readHtml = html; // the pointer moves within one 250 m cell for many frames: no layout for the same words
  });
});
map.on('mouseout', () => { $('#readout').hidden = true; });
map.on('click', e => {
  if (F) openCell(idxAt(e.latlng.lat, e.latlng.lng));
});

// Round 16 X phase 2: the states css asked :has() about on .stage, .app and #map, as classes on them (has-drawer, has-layers, has-brief,
// has-error, has-popup). Their subtrees hold the map, which changes at every move (tiles, markers, labels): each change made the browser
// look through the whole map again for a .drawer, a #status.error or a popup (most of the style time of a pan or a zoom).
{
  const stage = $('.stage'), app = $('.app'), mapEl = map.getContainer(), st = $('#status');
  const sync = () => {
    stage.classList.toggle('has-drawer', !$('#drawer').hidden);
    stage.classList.toggle('has-layers', !$('#layers-pop').hidden);
    stage.classList.toggle('has-brief', !!stage.querySelector(':scope > .pl-brief-card:not([hidden])')); // js/planner.js (wide screens)
    app.classList.toggle('has-error', st.classList.contains('error'));
  };
  const mo = new MutationObserver(sync);
  mo.observe(stage, { subtree: true, attributes: true, attributeFilter: ['hidden'] }); // the drawer, Layers, the brief card shown or hidden
  mo.observe(st, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sync).observe(stage, { childList: true }); // the brief card put in or taken out (a second observer: observing the same node again replaces the options; its children only, not every tile)
  sync();
  let pops = 0; // open popups (a pin, a place, a ship): #map.has-popup
  map.on('popupopen', () => mapEl.classList.toggle('has-popup', ++pops > 0)).on('popupclose', () => mapEl.classList.toggle('has-popup', (pops = Math.max(0, pops - 1)) > 0));
}

/* ---------- Language ---------- */
function applyLang() {
  document.documentElement.lang = state.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = tr(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', tr(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = tr(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-i18n-tip]')) el.setAttribute('aria-label', el.dataset.tip = tr(el.dataset.i18nTip)); // icon buttons: name and tooltip
  for (const b of document.querySelectorAll('#lang > button, [data-wl-lang]')) b.setAttribute('aria-pressed', (b.dataset.lang || b.dataset.wlLang) === state.lang); // round 14: and the welcome's
  locateCtl._a.title = tr('myLoc');
  for (const [b, en, el] of [[zoomCtl._zoomInButton, 'Zoom in', 'Μεγέθυνση'], [zoomCtl._zoomOutButton, 'Zoom out', 'Σμίκρυνση']]) b.setAttribute('aria-label', b.title = state.lang === 'el' ? el : en);
  map.attributionControl.getContainer().title = tr('credits');
  setRail(railOpen); renderStatus(); drawFishPanel(); drawLayerCounts();
  if (!$('#fish-modal').hidden) { $('#fish-search').placeholder = tr('search'); drawGallery(); }
  if (!$('#help-modal').hidden && window.PsHelp?.open) PsHelp.open($('#help-host'), helpOpts());
  drawRadius(); drawNear(); // Anywhere in the new language; the list, or why there is none
  if (F) { drawTimeline(); drawTop(); drawConditions(); drawWhen(); refreshOpen(); drawWeatherLegend(); }
}
$('#lang').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) { state.lang = b.dataset.lang; savePrefs(); applyLang(); } });
