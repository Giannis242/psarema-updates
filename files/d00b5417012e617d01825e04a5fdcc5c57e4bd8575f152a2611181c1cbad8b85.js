'use strict';
// Psarema: rods and gear for each fishing area (data/area-gear.js, areas in data/areas.js).
//   PsAreaGear.html(areaId, mode)  → compact HTML ('' for an unknown area); mode 'shore' | 'boat' | 'spear' (default: the app's mode)
//   PsAreaGear.areaAt(lat, lon)    → areaId of the nearest area centre within its radius, or null
//   PsAreaGear.name(areaId)        → the area's name in the current language
//   PsAreaGear.baits / baitsHtml / approach → the ranked "best baits here now" (round 10b: see the block further down)
//   PsAreaGear.lures / luresHtml → the ranked artificial lures and their catalogue (round 13: js/lures.js, data/lures.js, on first use)
// It also adds a folded "Gear for this area" section to the spot drawer / phone sheet (#drawer, #m-spot) whenever they redraw,
// so ui.js and mobile.js need no change. Gear pictures come from ui.js gearCard() when it is loaded.
window.PsAreaGear = (() => {
  const D = window.PSAREMA_AREA_GEAR || {}, SRC = window.PSAREMA_AREA_GEAR_SOURCES || {}, AREAS = window.PSAREMA_AREAS || [];
  /* global state, gearCard, loadGear, byId, fishName, ic, sel, latOf, lonOf (app globals from js/core.js and js/ui.js; each is optional) */
  const lang = () => (typeof state === 'object' ? state.lang : document.documentElement.lang) === 'el' ? 'el' : 'en';
  const L = o => o == null ? '' : typeof o === 'string' ? o : o[lang()] ?? o.en ?? '';
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const T = {
    en: { shore: 'Shore', boat: 'Boat', spear: 'Spearfishing', targets: 'Main targets', best: 'Best gear', also: 'Also works', tips: 'Tips', avoid: 'Avoid',
      sources: 'Sources', shownFor: 'Shown for', gp: 'general practice', data: 'seabed data', here: 'Gear for this area', now: 'in season now', allYear: 'all year',
      beach: 'Sand/pebble', rocky: 'Rocky', made: 'Breakwater/pier', port: 'Port', mil: 'Military', out: (d, km) => `${d} m ≈ ${km} km out`,
      drop: km => `Drop-off ≈ ${km} km`, noDrop: 'No steep drop-off near shore', pos: p => `Posidonia ${p}%`, rockBed: p => `Rock ${p}%`, bed: '(0–40 m seabed)',
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    el: { shore: 'Ακτή', boat: 'Σκάφος', spear: 'Ψαροντούφεκο', targets: 'Κύρια ψάρια', best: 'Καλύτερος εξοπλισμός', also: 'Δουλεύουν επίσης', tips: 'Συμβουλές', avoid: 'Προσοχή',
      sources: 'Πηγές', shownFor: 'Για', gp: 'γενική πρακτική', data: 'δεδομένα βυθού', here: 'Εξοπλισμός για την περιοχή', now: 'τώρα σε εποχή', allYear: 'όλο τον χρόνο',
      beach: 'Άμμος/βότσαλο', rocky: 'Βράχια', made: 'Μόλοι/προβλήτες', port: 'Λιμάνι', mil: 'Στρατιωτικό', out: (d, km) => `${d} μ. ≈ ${km} χλμ. έξω`,
      drop: km => `Κατωφέρεια ≈ ${km} χλμ.`, noDrop: 'Χωρίς απότομη κατωφέρεια κοντά', pos: p => `Ποσειδωνία ${p}%`, rockBed: p => `Βράχος ${p}%`, bed: '(βυθός 0–40 μ.)',
      months: ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'] },
  };
  const t = k => T[lang()][k] ?? T.en[k];
  const num = v => lang() === 'el' ? String(v).replace('.', ',') : String(v);
  // Gear specs are short English strings ('leader 2–3 m · fluoro 0.25 mm'); these few words get Greek (PE, fluoro, jig, egi stay as anglers say them).
  const SPEC_EL = [['circle hook', 'κυκλικό αγκίστρι'], ['metal jigs', 'μεταλλικά jig'], ['diving minnows', 'ψαράκια βάθους'], ['minnows', 'ψαράκια'], ['feathers', 'φτερά'],
    ['skirts', 'καλαμαράκια'], ['knots', 'κόμβοι'], ['sinker', 'μολύβι'], ['hooks', 'αγκίστρια'], ['hook', 'αγκίστρι'], ['leader', 'παράμαλλο'], ['head', 'κεφαλή'], ['light', 'ελαφρύ'], ['jigs', 'jig']];
  const spec = o => typeof o === 'string' && lang() === 'el' ? SPEC_EL.reduce((s, [e, g]) => s.replace(new RegExp(`\\b${e}\\b`, 'g'), g), o) : L(o);

  const KX = 111.32 * Math.cos(35 * Math.PI / 180), KY = 110.57; // km per degree, as js/core.js
  function areaAt(lat, lon) {
    let best = null, bd = Infinity;
    for (const a of AREAS) { const d = Math.hypot((lon - a.lon) * KX, (lat - a.lat) * KY); if (d <= a.r && d < bd) { bd = d; best = a.id; } }
    return best;
  }
  const name = id => { const a = AREAS.find(x => x.id === id); return a ? a[lang()] || a.en : id; };

  const fish = id => {
    const s = typeof byId === 'function' ? byId(id) : null;
    if (s && typeof fishName === 'function') return fishName(s);
    const p = (window.PSAREMA_SPECIES || []).find(x => x.id === id);
    return lang() === 'el' ? window.PSAREMA_NAMES_CY?.[id]?.cy || p?.name || id : p?.name || id;
  };
  const inSeason = (f, to, m) => f <= to ? m >= f && m <= to : m >= f || m <= to;
  const target = ([id, f, to]) => {
    const now = inSeason(f, to, new Date().getMonth() + 1), M = t('months');
    const when = (to % 12) + 1 === f ? t('allYear') : `${M[f - 1]}–${M[to - 1]}`;
    return `<span class="ag-fish${now ? ' now' : ''}"${now ? ` title="${E(t('now'))}"` : ''}><b>${E(fish(id))}</b> ${E(when)}</span>`;
  };
  const gearName = id => L(window.PSAREMA_GEAR_CATALOG?.[id]?.name) || id.replace(/_/g, ' ');
  const card = it => typeof gearCard === 'function' ? gearCard(it.gear, spec(it.spec))
    : `<div class="gear"><b>${E(gearName(it.gear))}</b>${it.spec ? `<small>${E(spec(it.spec))}</small>` : ''}</div>`;
  const srcTag = k => !k ? t('gp') : k === 'data' ? t('data') : SRC[k]?.t.split(' – ')[0] || k;
  // no "Best" badge on each card: the heading says it. Spans and divs, not p: the host .fold styles its paragraphs (app.css .fold p).
  const item = it => `<li class="ag-item">${card(it)}<div class="ag-why"><span>${E(L(it.why))}</span><span class="hint ag-src">${E(srcTag(it.src))}</span></div></li>`;

  function facts(f) {
    if (!f) return '';
    const c = Object.entries(f.coast || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${t(k)} ${v}%`);
    const d = [[20, f.d20], [100, f.d100]].filter(x => x[1] != null).map(([z, km]) => t('out')(z, num(km)));
    const s = [...c, ...d, f.drop == null ? t('noDrop') : t('drop')(num(f.drop)), `${t('pos')(f.pos)} · ${t('rockBed')(f.rock)} ${t('bed')}`];
    return `<div class="facts">${s.map(x => `<span>${E(x)}</span>`).join('')}</div>`; // app.css .facts, as in the fish panel
  }

  function html(areaId, mode) {
    const A = D[areaId]; if (!A) return '';
    mode = A.methods[mode] ? mode : A.methods[typeof state === 'object' && state.mode] ? state.mode : 'shore';
    const M = A.methods[mode];
    const srcs = (A.sources || []).map(k => SRC[k]).filter(Boolean);
    return `<div class="ag" data-area="${E(areaId)}" data-mode="${E(mode)}">` +
      (typeof state === 'object' && mode === state.mode ? '' : `<div class="hint">${E(t('shownFor'))}: ${E(t(mode))}</div>`) + // the hosts name the area; the method only when it is not the app's
      `<p class="ag-char">${E(L(A.character))}</p>${facts(A.facts)}` +
      (M.targets?.length ? `<h4>${E(t('targets'))}</h4><div class="facts ag-targets">${M.targets.map(target).join('')}</div>` : '') +
      (M.best?.length ? `<h4>${E(t('best'))}</h4><ul class="ag-list">${M.best.map(item).join('')}</ul>` : '') +
      (M.also?.length ? `<h4>${E(t('also'))}</h4><ul class="ag-list ag-also">${M.also.map(item).join('')}</ul>` : '') +
      (M.tips ? `<h4>${E(t('tips'))}</h4><p class="ag-tips">${E(L(M.tips))}</p>` : '') +
      (A.avoid ? `<div class="ag-avoid"><b>${E(t('avoid'))}:</b> ${E(L(A.avoid))}</div>` : '') +
      (srcs.length ? `<div class="hint ag-sources">${E(t('sources'))}: ${srcs.map(s => s.u ? `<a href="${E(s.u)}" target="_blank" rel="noopener">${E(s.t)}</a>` : E(s.t)).join(' · ')}</div>` : '') +
      `</div>`;
  }

  /* ---------- Best baits here now (round 10b) ----------
     The ranking is js/area-baits.js (its header has the model and the full option list), loaded on first use together with the gear files:
     PsAreaGear.baits(areaId, { sp, mode, month, hour, cell }) → [{ gear, name, kind: 'bait' | 'lure' | 'rig', score 0..100, why: [text], when,
       src: [{ title, url }] }] best first ([] until the files are in, and for spearfishing);
     PsAreaGear.baitsHtml(areaId, opts) → html at once: a place-holder that fills itself in when the files arrive;
     PsAreaGear.approach(areaId, opts) → spearfishing: [{ fish, name, text, gun }]. */
  const H = { D, AREAS, lang, L, E, t, num, areaAt, name, fish, inSeason, gearName };
  let rank = null, rankLoad = null, waitN = 0; const waiting = new Map();
  // Round 14: offline on first use, a waiting box says so instead of a grey block for ever (it keeps its data-*-wait: filled once it loads),
  // and it tries again when the phone is back online
  const off = k => { if (typeof document === 'object') for (const el of document.querySelectorAll(`[data-${k}-wait]`)) el.innerHTML = `<p class="ag-off">${typeof ic === 'function' ? ic('warning') : ''}<span>${E(typeof tr === 'function' ? tr('r14_offLoad') : '')}</span></p>`; };
  if (typeof addEventListener === 'function') addEventListener('online', () => { if (waiting.size) needRank(); if (luWait.size) needLures(); });
  const R = () => { rank ||= window.PsAreaBaits?.(H) || null; return rank?.ready() ? rank : null; };
  const needRank = () => rankLoad ||= Promise.all([typeof loadGear === 'function' && loadGear(), typeof loadScripts === 'function' && loadScripts('js/area-baits.js')])
    .then(() => { if (!R()) { rankLoad = null; off('ab'); return; } // offline on first use: try again next time (round 14: and say so)
      for (const [k, [a, o]] of waiting) { const el = document.querySelector(`[data-ab-wait="${k}"]`); if (el) el.outerHTML = R().baitsHtml(a, o); } waiting.clear();
      for (const s of ['#drawer', '#m-spot']) { const host = document.querySelector(s); if (host) swapBaits(host); } }, e => { rankLoad = null; off('ab'); console.warn(e.message); });
  const baits = (areaId, o) => R()?.baits(areaId, o) || (needRank(), []);
  const approach = (areaId, o) => R()?.approach(areaId, o) || (needRank(), []);
  function baitsHtml(areaId, o = {}) {
    if (R()) return R().baitsHtml(areaId, o);
    const id = ++waitN; waiting.set(id, [areaId, o]); needRank();
    return `<div class="ab ab-wait" data-ab-wait="${id}"><div class="ab-skel"></div></div>`;
  }
  /* ---------- Lures (round 13): the artificial-lure catalogue and its ranking (js/lures.js + data/lures.js, on first use, after the bait
     ranking it builds on). PsAreaGear.lures(areaId, opts) → ranked rows ([] until loaded, and for spearfishing); luresHtml(areaId, opts) →
     html at once (a place-holder until loaded; '' for spearfishing). opts as baits(), plus compact (no catalogue), top, seg (fish / all switch). */
  let lu = null, luLoad = null; const luWait = new Map();
  const LU = () => { if (!R()) return null; lu ||= window.PsLures?.({ ...H, R: R() }) || null; return lu?.ready() ? lu : null; };
  const needLures = () => luLoad ||= Promise.resolve(needRank()).then(() => typeof loadScripts === 'function' && loadScripts('data/lures.js', 'js/lures.js'))
    .then(() => { if (!LU()) { luLoad = null; off('lu'); return; }
      for (const [k, [a, o]] of luWait) { const el = document.querySelector(`[data-lu-wait="${k}"]`); if (el) el.outerHTML = LU().html(a, o); } luWait.clear(); }, e => { luLoad = null; off('lu'); console.warn(e.message); });
  const lures = (areaId, o) => LU()?.rank(areaId, o) || (needLures(), []);
  function luresHtml(areaId, o = {}) {
    if (LU()) return LU().html(areaId, o);
    if ((o.mode || (typeof state === 'object' && state.mode)) === 'spear') return '';
    const id = ++waitN; luWait.set(id, [areaId, o]); needLures();
    return `<div class="lu lu-wait" data-lu-wait="${id}"><div class="ab-skel"></div></div>`;
  }

  // Spot drawer (desktop) and spot sheet (phones): ui.js / mobile.js rebuild their innerHTML on every redraw; re-add the fold each time.
  let foldOpen = false, artIn = false;
  function addFold(host) {
    const body = host.querySelector('.drawer-body');
    if (!body || body.querySelector('.ag-fold') || typeof sel !== 'object' || sel.i < 0 || typeof latOf !== 'function') return;
    const id = areaAt(latOf(sel.i), lonOf(sel.i));
    if (!D[id]) return;
    const d = document.createElement('details');
    d.className = 'fold ag-fold';
    d.innerHTML = `<summary>${typeof ic === 'function' ? ic('chevron-right') : ''}${E(t('here'))} · ${E(name(id))}</summary>`;
    // the content only once it is open: the drawer redraws on every hour step, and parsing ~8 KB of gear cards each time cost ~2 ms (desktop)
    const fill = () => {
      if (!d.open || d.querySelector('.ag')) return;
      d.insertAdjacentHTML('beforeend', (typeof state === 'object' && state.mode === 'spear' ? baitsHtml(id, { cell: sel.i, noTips: true }) : '') + html(id)); // spearfishing: how to hunt here, then the gear
      // the gear pictures (data/gear-art.js): spearfishing cards never ask for them, and an hour step no longer redraws this fold
      if (!artIn && typeof loadGear === 'function') loadGear()?.then(() => { artIn = true; if (d.isConnected) { d.querySelectorAll('.ag, .ab').forEach(x => x.remove()); fill(); } });
    };
    d.open = foldOpen; fill();
    d.addEventListener('toggle', () => { foldOpen = d.open; fill(); });
    body.insertBefore(d, body.querySelector('.wx-sec') || body.querySelector('.breakdown')); // the drawer's order: … gear, weather, ships, breakdown
  }
  // The details' "Best baits here" section (js/ui.js baitSec draws plain cards): the ranked list in their place, for the tapped cell, the
  // fish, method and hour on show. ui.js redraws that section only when its own cards change, so the hour is checked on every change in
  // the host (a key compare); rows you opened stay open.
  function swapBaits(host) {
    if (typeof sel !== 'object' || sel.i < 0 || typeof latOf !== 'function' || typeof state !== 'object' || state.mode === 'spear') return;
    if (!R()) { if (host.querySelector('.drawer-body [data-s="baits"] .gear-grid')) needRank(); return; } // ui.js's own cards until the ranking is in
    const old = host.querySelector('.drawer-body [data-s="baits"] :is(.gear-grid, .ab)'); if (!old) return;
    const key = [sel.i, state.sp, state.mode, state.lang, state.h].join();
    if (old.dataset.abKey === key) return;
    const open = [...old.querySelectorAll('details[open][data-g]')].map(x => x.dataset.g), box = document.createElement('div');
    box.innerHTML = baitsHtml(areaAt(latOf(sel.i), lonOf(sel.i)), { cell: sel.i });
    const el = box.firstElementChild; el.dataset.abKey = key;
    for (const g of open) el.querySelector(`details[data-g="${g}"]`)?.setAttribute('open', '');
    old.replaceWith(el);
  }
  // the lure sheet's Back and Escape (js/lures.js sets PsLureBack and PsLureKey; it loads later): window listeners run in the order added, and this file comes before js/mobile.js
  if (typeof addEventListener === 'function') { addEventListener('popstate', e => window.PsLureBack?.(e), true); addEventListener('keydown', e => window.PsLureKey?.(e), true); }
  for (const s of ['#drawer', '#m-spot']) {
    const host = document.querySelector(s);
    if (host) new MutationObserver(() => { addFold(host); swapBaits(host); }).observe(host, { childList: true, subtree: true });
  }

  const lureSheet = (areaId, o, id) => LU()?.sheetHtml(areaId, o, id) || '', lureFilters = () => LU()?.flt || null; // round 13: the self-check's handles
  return { html, areaAt, name, baits, baitsHtml, approach, lures, luresHtml, lureSheet, lureFilters };
})();
