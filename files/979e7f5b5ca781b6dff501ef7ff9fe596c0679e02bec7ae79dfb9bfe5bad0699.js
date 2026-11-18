'use strict';
Object.assign(I18N.en, { // round 8: the full-screen logger (#ct-flow) and the catches grid
  ctf_step: (n, m) => `Step ${n} of ${m}`, ctf_photoT: 'Add a photo', ctf_fishT: 'What did you catch?', ctf_targetT: 'What were you after?', ctf_detT: 'Details',
  ctf_whereT: 'Where and when', ctf_whereS: 'Drag the map to put the pin where you caught it.', ctf_now: 'Now', ctf_locating: 'Finding you…', ctf_noFix: 'No location yet',
  ctf_doneT: 'Catch logged!', ctf_doneBlank: 'Trip logged', ctf_newPB: 'New personal best', ctf_view: 'View catch', ctf_done: 'Done', ctf_another: 'Log another',
  ctf_relSub: 'Put back alive', ctf_less: 'One fewer', ctf_more: 'One more', ctf_discard: 'Discard this catch?', ctf_tap: 'Tap a fish to pick it.',
  ctf_blankS: 'A blank trip teaches the map where it did not work.', ctf_score: 'Map score', ctf_skipT: 'Skip the photo',
  ct_blankTag: 'Blank trip', ct_blankBtn: 'Blank trip', ct_blanks: 'Blanks', ct_hours: 'Hours fishing', ct_hoursN: n => n === 1 ? '1 hour fishing' : `${n} hours fishing`,
});
Object.assign(I18N.el, {
  ctf_step: (n, m) => `Βήμα ${n} από ${m}`, ctf_photoT: 'Προσθέστε φωτογραφία', ctf_fishT: 'Τι πιάσατε;', ctf_targetT: 'Τι ψαρεύατε;', ctf_detT: 'Λεπτομέρειες',
  ctf_whereT: 'Πού και πότε', ctf_whereS: 'Σύρετε τον χάρτη για να βάλετε την καρφίτσα εκεί που το πιάσατε.', ctf_now: 'Τώρα', ctf_locating: 'Εντοπισμός…', ctf_noFix: 'Χωρίς θέση ακόμη',
  ctf_doneT: 'Η ψαριά καταγράφηκε!', ctf_doneBlank: 'Η έξοδος καταγράφηκε', ctf_newPB: 'Νέο προσωπικό ρεκόρ', ctf_view: 'Δείτε την ψαριά', ctf_done: 'Τέλος', ctf_another: 'Καταγραφή κι άλλης',
  ctf_relSub: 'Επέστρεψε ζωντανό στη θάλασσα', ctf_less: 'Ένα λιγότερο', ctf_more: 'Ένα ακόμη', ctf_discard: 'Απόρριψη αυτής της καταγραφής;', ctf_tap: 'Πατήστε ένα ψάρι για να το επιλέξετε.',
  ctf_blankS: 'Μια άδεια έξοδος δείχνει στον χάρτη πού δεν τσίμπησε τίποτα.', ctf_score: 'Βαθμός χάρτη', ctf_skipT: 'Χωρίς φωτογραφία',
  ct_blankTag: 'Άδεια έξοδος', ct_blankBtn: 'Άδεια έξοδος', ct_blanks: 'Άδειες', ct_hours: 'Ώρες ψαρέματος', ct_hoursN: n => n === 1 ? '1 ώρα ψάρεμα' : `${n} ώρες ψάρεμα`,
});
// Icons the shared set (assets/icons.js) lacks, same 24×24 outline style; added once, any file may use them through ic()
if (!document.getElementById('i-camera')) document.body.insertAdjacentHTML('beforeend', '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
  [['camera', '<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/>'],
    ['image', '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m21 15.5-5-5L6 20"/>'],
    ['trophy', '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3.2 4M16 6h3a3 3 0 0 1-3.2 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>'],
    ['edit', '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>']]
    .filter(([k]) => !document.getElementById('i-' + k))
    .map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join('') + '</svg>');
// The panel shell (css/catchlog.css .pn-*) that My catches, the calendar, Plan a trip and Offline areas share; this file loads first of them.
// Wide screens: a sheet over the map, one at a time, closed by its ×, the backdrop, Escape or Back (its own history entry, so Back in the
// Android app on a tablet closes the sheet, not the app). Phones: the bottom sheet's content (js/mobile.js showHtml; its × and Back close it).
//   show(key, html, fresh) draws panel `key` in place, keeping its scroll (fresh: a new view, which also opens it) → its element, or null
//   when it is closed and not fresh; root(key) → its element while open; onClose(key, fn) runs however it closes (nothing works while closed);
//   head(key, icon, title, sub) → the one header (sub: a short micro-label line, html); openSpot(i, { fish, mode, h }) → a spot from a panel:
//   its card on the map; where(i) → a spot in words; fish(s) → its cut-out picture, or '' (css .pn-cut).
const PsPanel = window.PsPanel = (() => {
  const M = {}, hooks = {};
  let wide = '', phone = '', guard = false, eat = false; // the key shown on the wide screen / in the phone sheet; guard: our Back entry is on the history
  const root = key => wide === key ? M[key].firstChild.firstChild : document.querySelector(`#m-spot:not([hidden]) > [data-pn="${key}"]`);
  const head = (key, icon, title, sub = '') => `<header class="pn-head"><span class="pn-ic">${ic(icon)}</span><div class="pn-ttl"><h2 id="${key}-t">${esc(title)}</h2>` +
    `${sub ? `<p class="lbl pn-sub">${sub}</p>` : ''}</div><button class="icon-btn pn-x" data-pn-close aria-label="${esc(tr('close'))}">${ic('close')}</button></header>`;
  const fish = s => CUT[s?.id] ? `<img class="pn-cut" src="${esc(CUT[s.id].file)}" alt="" loading="lazy" decoding="async">` : '';
  const closed = k => { if (k) hooks[k]?.(); };
  function show(key, html, fresh) {
    let r = root(key);
    if (!r && !fresh) return null;
    if (isPhone()) {
      if (r && !fresh) { r.innerHTML = html; return r; } // in place: the sheet keeps its height and scroll
      hide(); if (phone !== key) { closed(phone); phone = key; }
      PsMobile.showHtml(`<div class="pn ${key}" data-pn="${key}">${html}</div>`);
      return root(key);
    }
    let m = M[key];
    if (!m) {
      m = M[key] = Object.assign(document.createElement('div'), { id: key + '-modal', className: 'modal pn-modal', hidden: true,
        innerHTML: `<div class="sheet glass pn-sheet"><div class="pn ${key}" data-pn="${key}"></div></div>` });
      m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', key + '-t');
      m.addEventListener('click', e => { if (e.target === m) close(); });
      document.body.append(m);
    }
    r = m.firstChild.firstChild;
    const top = fresh ? 0 : r.scrollTop;
    r.innerHTML = html; r.scrollTop = top;
    if (wide !== key) {
      drop(); wide = key; m.hidden = false;
      if (!guard) try { history.pushState({ psPanel: 1 }, ''); guard = true; } catch {}
    }
    return r;
  }
  function drop() { const k = wide; if (!k) return; wide = ''; M[k].hidden = true; closed(k); } // the wide screen's sheet, history untouched
  function hide() { drop(); if (guard) { guard = false; if (history.state?.psPanel) { eat = true; history.back(); } } }
  function close() { hide(); if (phone && root(phone)) PsMobile.closeSpot(); }
  // phones: the sheet shows something else now (a spot, the × , Back, a swipe): that panel is closed
  new MutationObserver(() => { if (phone && !root(phone)) { const k = phone; phone = ''; closed(k); } }).observe($('#m-spot'), { childList: true });
  addEventListener('popstate', e => { // before js/mobile.js's own listener (capture): Back closes the sheet, and our own step back is no Back
    if (eat) { eat = false; e.stopImmediatePropagation(); return; }
    if (guard && !history.state?.psPanel) { guard = false; e.stopImmediatePropagation(); drop(); }
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && wide) { e.stopImmediatePropagation(); close(); } }, true);
  document.addEventListener('click', e => { if (e.target.closest('[data-pn-close]')) close(); });
  function openSpot(i, o = {}) { // the fish, method and hour first (a toast says what changed), then the spot's card, as a tap on the map
    if (!(i >= 0) || !depth[i]) return;
    close();
    const fish = o.fish && o.fish !== 'all' && o.fish !== state.sp && byId(o.fish) ? o.fish : '', mode = o.mode && o.mode !== state.mode ? o.mode : '';
    if (fish || mode) { if (mode) state.mode = mode; if (fish) state.sp = fish; refresh(); if (mode && F) rankAll(); toast(tr('pl_showing', fishName(byId(state.sp)), tr(state.mode))); }
    if (F && o.h >= 0) setHour(o.h);
    map.setView([latOf(i), lonOf(i)], Math.max(map.getZoom(), 12)); openCell(i);
  }
  const where = i => `${describe(latOf(i), lonOf(i))} · ${depthM(i)} m${habPart(i)}`; // as the score card says it
  return { show, root, close, head, fish, openSpot, where, onClose: (key, fn) => { hooks[key] = fn; } };
})();

// Psarema: My catches. A catch log kept only on this device (IndexedDB): each catch (photo, fish, size, bait or lure, kept or released) or
// blank trip with the conditions then and there, a page per catch (shared as a picture), a logbook (personal bests, months, what works for
// you), your own patterns, and an opt-in personal correction of the fishing map learned from them. Nothing is sent anywhere; export and
// import are a JSON file you save or pick. Loaded after js/mobile.js and before js/nav.js (the catch page registers on DOMContentLoaded).
// Hooks: [data-ct-open="list|stats|pat|learn"] opens the logbook ("fish" = stats), [data-ct-log="<cell>"] logs a catch there (-1: the open
// spot or where you are); PsCatch.correction(fishId) is the per-cell × per-hour factor model.js scoreCells multiplies in; PsCatch.row(i, h)
// is the "Your own catches" row for explain(). PsCatch.entries() → the loaded entries, newest first; PsCatch.stats() → the logbook's
// numbers; PsCatch.open(id) → the catch's page (open() or open(tab): the logbook); PsCatch.card(id) → its share picture (a PNG Blob);
// document fires 'ps:catches' after any change (and once loaded).
const PsCatch = window.PsCatch = (() => {
  const DB = 'psarema-catches', ST = 'catches', PREF = 'psarema-catch-prefs', MODES = ['boat', 'shore', 'spear'], TABS = ['list', 'stats', 'pat', 'learn'];
  const NEED_C = 5, NEED_B = 2; // trips with fish and blank trips of a fish before the map learns from them
  const pref = { learn: false, map: true };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF))); } catch {}
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch {} window.PsPersonal?.prefChanged?.(); }; // round 16 engine: js/personal.js keeps what it read
  const hush = on => { quiet = on; if (window.PsPersonal) PsPersonal.off = on; }; // scoring "as the model alone": neither learning layer applies
  let list = [], ready = false, ver = 0, form = null, quiet = false, mm = null, mmRO = null, page = null, navOk = false;
  const view = { tab: 'list', fish: null }; // fish: the logbook's filter ('' = all)

  /* ---------- Storage: one IndexedDB store, photos (≤ 1600 px) and their thumbnails as Blobs in the entries ---------- */
  // An entry: { id, t, sp, mode, lat, lon, cell, n (0 = a blank trip), note, photo?, thumb?, cm?, kg?, bait? (a gear catalogue id), released?, snap,
  //   acc? (round 18 A: the GPS fix's accuracy in m, when the place came from it) }
  let dbp = null;
  const db = () => dbp ||= new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id' });
    r.onsuccess = () => ok(r.result); r.onerror = () => { dbp = null; no(r.error); };
  });
  const run = (mode, f) => db().then(d => new Promise((ok, no) => {
    const t = d.transaction(ST, mode), q = f(t.objectStore(ST));
    t.oncomplete = () => ok(q?.result); t.onerror = t.onabort = () => no(t.error);
  }));
  const sortList = () => list.sort((x, y) => y.t - x.t || (x.id < y.id) - (x.id > y.id)); // newest first; the same minute: the later id (its base-36 time) first
  const load = () => run('readonly', s => s.getAll()).then(a => { list = a; sortList(); ready = true; }, e => console.warn('Catch log unavailable:', e));
  const urls = new Map(); // 'photo:id' / 'thumb:id' → an object URL, made when first shown
  const blobUrl = (e, k = 'photo') => { const b = e[k] || e.photo; if (!b) return ''; const key = k + ':' + e.id; let u = urls.get(key); if (!u) urls.set(key, u = URL.createObjectURL(b)); return u; };
  const dropUrl = id => { for (const k of ['photo:', 'thumb:']) { const u = urls.get(k + id); if (u) { URL.revokeObjectURL(u); urls.delete(k + id); } } };
  const fire = () => document.dispatchEvent(new CustomEvent('ps:catches'));

  /* ---------- Helpers ---------- */
  const lim = (x, a, b) => x < a ? a : x > b ? b : x;
  const r2 = x => x == null || !Number.isFinite(+x) ? null : Math.round(x * 100) / 100;
  const caught = e => e.n > 0 && !e.seen, blank = e => !e.n, seenOnly = e => e.n > 0 && !!e.seen; // round 15: a seen fish is neither a catch nor a blank
  const fishOf = id => byId(id) || ALL_FISH;
  // a blank trip for "all fish" counts against every fish; seen-only entries count in no statistic or learning (withSeen: the list itself)
  const tripsOf = (id, withSeen) => (id ? list.filter(e => e.sp === id || (e.sp === 'all' && !e.n)) : list).filter(e => withSeen || !seenOnly(e));
  const pct = f => (f >= 1 ? '+' : '−') + Math.round(Math.abs(f - 1) * 100) + '%';
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  const dtLocal = t => new Date(t - new Date(t).getTimezoneOffset() * 6e4).toISOString().slice(0, 16); // for <input type="datetime-local">
  const when = t => fmtT(t, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    ...new Date(t).getFullYear() !== new Date().getFullYear() && { year: 'numeric' } });
  const dec = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(x) && x > 0 ? x : null; }; // "2,4" (Greek) or "2.4"
  const nfx = x => nf(x, Math.round(x * 100) % 10 ? 2 : Math.round(x * 10) % 10 ? 1 : 0); // 2 → "2", 2.4 → "2.4", 2.45 → "2.45"
  const sizeTxt = e => [e.cm && `${nfx(e.cm)} cm`, e.kg && `${nfx(e.kg)} kg`].filter(Boolean).join(' · ');
  const CATS = window.PSAREMA_GEAR_CATALOG || {}, gearTxt = id => L10(CATS[id]?.name) || String(id).replace(/_/g, ' ');
  const norm = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/ς/g, 'σ').toLowerCase(); // search: "σαργος" finds Σαργός
  // a fish's search key: every name it goes by (in Greek it shows its Cypriot name, "Σορκός", so "Σαργός" is data/names-cy.js "also"), folded, and in Latin letters too ("sargos")
  const fkey = s => { const p = norm([s.name, s.el, s.local, CY[s.id]?.also, s.scientific, s.id].filter(Boolean).join(' ')); return p + ' ' + latin(p); };
  const area = (la, lo) => { let b = null; for (const p of PLACES) { const d = km([p[2], p[3]], [la, lo]).d; if (!b || d < b[0]) b = [d, p]; } return b[1][state.lang === 'el' ? 1 : 0]; }; // the nearest town: shared pictures name it, never the spot
  const whereTxt = (la, lo) => { const i = seaCell(la, lo); return i >= 0 ? PsPanel.where(i) : describe(la, lo); };
  const placeOf = e => e.cell >= 0 ? PsPanel.where(e.cell) : describe(e.lat, e.lon);
  const titleOf = e => !blank(e) ? (e.seen ? tr('ct_seenOf', fishName(fishOf(e.sp))) : fishName(fishOf(e.sp))) + (e.n > 1 ? ` ×${e.n}` : '') : tr('ct_blankOf', fishName(fishOf(e.sp))); // round 15: seen, not caught
  function seaCell(la, lo) { // the cell to score: the place itself, or the nearest sea within ~1 km (shore anglers stand on land)
    const i0 = idxAt(la, lo); if (i0 < 0) return -1;
    if (depth[i0] && !northMask[i0]) return i0;
    const x0 = i0 % W, y0 = i0 / W | 0; let best = -1, bd = 1e9;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = x0 + dx, y = y0 + dy, j = y * W + x, d = dx * dx + dy * dy;
      if (x >= 0 && y >= 0 && x < W && y < H && depth[j] && !northMask[j] && d < bd) { bd = d; best = j; }
    }
    return best;
  }
  function sky(t) { // time of day and moon for any date (buildHours' rules), when the forecast does not cover it
    const d = new Date(t), sun = SunCalc.getTimes(d, ...CENTER), m = SunCalc.getMoonIllumination(d), rise = +sun.sunrise, set = +sun.sunset;
    const period = t >= rise - 36e5 && t <= rise + 54e5 ? 'dawn' : t >= set - 54e5 && t <= set + 36e5 ? 'dusk' : t > rise && t < set ? 'day' : 'night';
    return { period, illum: r2(m.fraction), phase: r2(m.phase), local: numT(t, { hour: 'numeric', hourCycle: 'h23' }) };
  }
  const hourOf = t => { if (!F || !hours.length) return -1; const h = Math.floor((t - hours[0].t) / 36e5); return h >= 0 && h < hours.length ? h : -1; };
  let pbuf = null; // one scoring buffer for the log's own one-cell scores (model.js newBuf: four grids)
  // The conditions then and there as the model saw them, without the personal part. Another fish or method is prepared for this one
  // cell and swapped in while explain() runs (it reads sp, cur and state.mode), then put back.
  function snapshot(s, mode, i, t) {
    const o = { ...sky(t), depth: depth[i], dist: r2(dist[i]) }, h = hourOf(t);
    if (h < 0) return o;
    const x = hours[h], k = h * NN, keep = [sp, cur, state.mode], swap = s !== sp || mode !== state.mode;
    hush(true);
    try {
      if (swap) { sp = s; state.mode = mode; cur = prepare(s, mode, [i], pbuf ||= newBuf()); }
      const { score, rows } = explain(i, h), q = {};
      scoreAt(i, h, q);
      Object.assign(o, { score, rows: rows.map(r => [r[0], String(r[1]), r2(r[2]), r2(r[3])]), ws: r2(q.ws), wsEff: r2(q.wsEff), gust: r2(bil(F.gust, k, i)),
        wdir: Math.round(F.windDir[k + nearestNode(i)]), wave: r2(q.wave), wEff: r2(q.wEff), cur: r2(q.cur), sst: r2(sat.sst ? sat.sst[i] : bil(F.sst, k, i)),
        dp: r2(x.dp), cloud: Math.round(x.cloud), solunar: x.solunar, illum: r2(x.illum), period: x.period });
    } catch (err) { console.warn('Catch conditions:', err); }
    finally { hush(false); if (swap) [sp, cur, state.mode] = keep; }
    return o;
  }
  const OBS_NUM = ['at', 'wind', 'gust', 'dir', 'wave', 'sst', 'km'];
  function obsAt(la, lo, t) { // the latest real measurement near the place (js/obs.js), kept when it was taken within 3 h of the catch
    try {
      const o = window.PsObs?.near?.(la, lo, 30); if (!o || !(Math.abs(o.at - t) < 3 * 36e5)) return null;
      const r = { station: String(o.station || '').slice(0, 60) };
      for (const k of OBS_NUM) if (Number.isFinite(o[k])) r[k] = k === 'at' ? o[k] : r2(o[k]);
      return r;
    } catch { return null; }
  }
  function conditions(s, mode, la, lo, t) { const i = seaCell(la, lo), q = i >= 0 ? snapshot(s, mode, i, t) : sky(t), ob = obsAt(la, lo, t); if (ob) q.obs = ob; return q; }
  // The fish likeliest at cell i: the where-fit's top 12 (model.js likelyAt), each with the model's chance there at the hour of t
  // (as the map would score it, without your own correction), likeliest first. No forecast for that hour: the where-fit order alone.
  function likelyNow(i, mode, t) {
    const L = likelyAt(i, mode, 12), h = hourOf(t);
    if (h < 0) return L.map(s => ({ s, v: null }));
    hush(true);
    try { return L.map(s => ({ s, v: Math.round(scoreAt(i, h, {}, prepare(s, mode, [i], pbuf ||= newBuf()))) })).sort((a, b) => b.v - a.v); }
    catch (err) { console.warn('Likely fish:', err); return L.map(s => ({ s, v: null })); }
    finally { hush(false); }
  }

  /* ---------- Personal bests and the logbook's numbers ---------- */
  let pbMemo = [-1, null];
  const better = (a, b) => (a.kg || 0) - (b.kg || 0) || (a.cm || 0) - (b.cm || 0); // weight first, then length
  function bests() { // fish id → its biggest catch with a length or weight
    if (pbMemo[0] === ver) return pbMemo[1];
    const m = new Map();
    for (const e of list) if (caught(e) && (e.kg || e.cm)) { const b = m.get(e.sp); if (!b || better(e, b) > 0) m.set(e.sp, e); }
    return (pbMemo = [ver, m])[1];
  }
  const isPB = e => caught(e) && bests().get(e.sp) === e;
  function summary() { // PsCatch.stats(): n = catches (entries with fish), trips (with the blank ones), species caught, each fish's best, catches per calendar month
    const C = list.filter(caught), byMonth = Array(12).fill(0);
    for (const e of C) byMonth[numT(e.t, { month: 'numeric' }) - 1]++;
    return { n: C.length, trips: list.length - list.filter(seenOnly).length, seen: list.filter(seenOnly).length, species: new Set(C.map(e => e.sp)).size, // seen: fish only seen, counted apart
      best: [...bests().values()].map(e => ({ sp: e.sp, kg: e.kg ?? null, cm: e.cm ?? null, id: e.id })), byMonth };
  }

  /* ---------- Learning: a small personal correction of one fish's map ---------- */
  // Each trip's outcome minus your own catch rate R (a catch +, a blank −) is spread over (1) the sea within ~2.4 km of its spot, a
  // Gaussian of 0.8 km, and (2) every cell of alike depth (log scale) and rock / seagrass cover, at a quarter weight (a few trips at one
  // reef say more about that reef than about all rock at that depth); and over every hour of the same time of day, moon light and pressure
  // trend. Each cell or hour gets Σ w·r / (Σ w + K0): with little evidence it shrinks to 0. The factor is 1 + strength × that, capped:
  // places −20%…+25%, hours ±12%. Pure: the same log gives the same arrays.
  const SIG = .8, REACH = 2.4, HAB_W = .25, K0 = 5, A_CELL = .8, A_HOUR = .6;
  const onSea = trips => trips.filter(e => e.cell >= 0 && depth[e.cell]);
  const enough = trips => { const E = onSea(trips), c = E.filter(caught).length; return c >= NEED_C && E.length - c >= NEED_B; }; // learn() would answer
  function learn(trips) {
    const E = onSea(trips), nC = E.filter(caught).length, nB = E.length - nC;
    if (nC < NEED_C || nB < NEED_B) return null;
    const R = (nC + 1) / (E.length + 2), res = E.map(e => (caught(e) ? 1 : 0) - R);
    const S = new Float32Array(N), Wt = new Float32Array(N), rx = Math.ceil(REACH / KX), ry = Math.ceil(REACH / KY);
    E.forEach((e, k) => {
      const cx = e.cell % W, cy = e.cell / W | 0;
      for (let y = Math.max(0, cy - ry); y <= Math.min(H - 1, cy + ry); y++) for (let x = Math.max(0, cx - rx); x <= Math.min(W - 1, cx + rx); x++) {
        const d2 = ((x - cx) * KX) ** 2 + ((y - cy) * KY) ** 2; if (d2 > REACH * REACH) continue;
        const j = y * W + x, w = Math.exp(-d2 / (2 * SIG * SIG)); S[j] += w * res[k]; Wt[j] += w;
      }
    });
    const feat = c => [Math.log1p(dFit[c]), (habK[c] / 11 | 0) % 11 / 10, habK[c] % 11 / 10], fe = E.map(e => feat(e.cell));
    const pair = new Map(), cell = new Float32Array(N).fill(1); // the seabed part depends only on the (depth, seabed) pair: once per pair
    let lo = 1, hi = 1, moved = 0;
    for (let i = 0; i < N; i++) {
      if (!depth[i] || northMask[i]) continue;
      const key = dFit[i] * NHK + habK[i]; let p = pair.get(key);
      if (!p) {
        const [ld, r, g] = feat(i); let s = 0, w = 0;
        fe.forEach(([ld0, r0, g0], k) => { const v = HAB_W * Math.exp(-((ld - ld0) ** 2) / .18) * Math.max(0, 1 - .5 * (Math.abs(r - r0) + Math.abs(g - g0))); s += v * res[k]; w += v; });
        pair.set(key, p = [s, w]);
      }
      const f = cell[i] = lim(1 + A_CELL * (S[i] + p[0]) / (Wt[i] + p[1] + K0), .8, 1.25);
      if (f < lo) lo = f; if (f > hi) hi = f; if (Math.abs(f - 1) > .05) moved++;
    }
    const hour = Float32Array.from(hours, x => {
      let s = 0, w = 0;
      E.forEach((e, k) => {
        const q = e.snap; if (!q?.period || q.illum == null) return;
        const v = (q.period === x.period ? 1 : .3) * Math.exp(-((x.illum - q.illum) ** 2) / .125) * (q.dp == null ? 1 : Math.exp(-((x.dp - q.dp) ** 2) / 8));
        s += v * res[k]; w += v;
      });
      return lim(1 + A_HOUR * s / (w + K0), .88, 1.12);
    });
    let hlo = 1, hhi = 1; for (const v of hour) { if (v < hlo) hlo = v; if (v > hhi) hhi = v; }
    return { cell, hour, max: hi * hhi, lo, hi, hlo, hhi, km2: moved * KX * KY, nC, nB };
  }
  const memo = new Map(); let memoKey = null;
  function learnt(id, lazy) { // learn(id), kept until the log or the forecast hours change; lazy: undefined until it is worked out
    if (!ready || id === 'all') return null;
    if (memoKey?.[0] !== ver || memoKey[1] !== hours) { memo.clear(); memoKey = [ver, hours]; }
    if (!memo.has(id)) { if (lazy && enough(tripsOf(id))) return undefined; memo.set(id, learn(tripsOf(id))); }
    return memo.get(id);
  }
  function check() { // PsCatch.check() in the console: catches lift their spot, blanks lower theirs, more trips move it more, too few move nothing
    const sea = SAMPLE.filter(i => dFit[i] > 10 && dFit[i] < 60), a = sea[50], b = sea[sea.length - 50];
    const trips = (c, nb) => [...Array(c)].map(() => ({ cell: a, n: 1, snap: { period: 'dawn', illum: .5, dp: 0 } })).concat([...Array(nb)].map(() => ({ cell: b, n: 0, snap: { period: 'day', illum: .5, dp: 0 } })));
    const few = learn(trips(5, 2)), many = learn(trips(20, 8)), dawn = hours.findIndex(x => x.period === 'dawn'), day = hours.findIndex(x => x.period === 'day');
    console.assert(!learn(trips(4, 2)) && !learn(trips(5, 1)), 'needs 5 trips with fish and 2 blank');
    console.assert(few.cell[a] > 1.05 && few.cell[b] < .95 && many.cell[a] >= few.cell[a] && many.cell[b] <= few.cell[b], 'catches lift, blanks lower, more trips more');
    console.assert(many.lo >= .8 && many.hi <= 1.25 && many.max <= 1.25 * 1.12 + 1e-6, 'capped');
    console.assert(dawn < 0 || day < 0 || few.hour[dawn] > 1 && few.hour[day] < 1, 'hours like the catches lift');
    console.assert(nfx(2) === nf(2, 0) && nfx(2.4) === nf(2.4, 1) && nfx(2.45) === nf(2.45, 2) && dec('2,4') === 2.4 && dec('') === null && dec('-1') === null, 'sizes');
    console.assert(norm('Σαργός') === norm('σαργος'), 'search ignores accents and final sigma');
    console.assert(!byId('sargos') || fkey(byId('sargos')).includes(norm('σαργος')) && fkey(byId('sargos')).includes('sorkos'), 'search knows every name of a fish, in Latin letters too');
    return [few, many].map(r => [r.cell[a], r.cell[b]].map(v => +v.toFixed(3)));
  }
  const correction = id => pref.learn && !quiet && hours.length ? learnt(id) : null;
  function row(i, h) { // explain()'s row: key, text, fit 0..1 (0.5 = no change), weight
    const c = correction(sp.id); if (!c) return [];
    const f = c.cell[i] * c.hour[h];
    return [['f_mine', tr('ct_rowVal', nf(f, 2), c.nC, c.nB), lim((f - .75) / .5, 0, 1), 1]];
  }

  /* ---------- On the map: the catches (a fallback: js/pins.js draws them as pins when it is there), and a note in the legend while your catches shape it ---------- */
  const layer = L.layerGroup();
  function drawLayer() {
    layer.clearLayers();
    if (!pref.map || !list.length || window.PsPins) { layer.remove(); return; }
    for (const e of [...list].reverse()) L.circleMarker([e.lat, e.lon], { pane: 'spots', radius: !blank(e) ? 6 : 5, weight: 2, color: !blank(e) ? '#0d3321' : '#e6e6e6',
      fillColor: !blank(e) ? '#4fd18b' : '#555', fillOpacity: .95 })
      .bindTooltip(() => `${esc(titleOf(e))} · ${esc(when(e.t))}`, { direction: 'top', offset: [0, -6] })
      .on('click', ev => { L.DomEvent.stopPropagation(ev); openCatch(e.id); }).addTo(layer);
    layer.addTo(map);
  }
  let badge = null;
  function drawBadge() {
    badge ||= $('#map-legend')?.appendChild(Object.assign(document.createElement('button'), { className: 'ct-badge', type: 'button' }));
    if (!badge) return;
    const c = (window.PsPersonal || { correction })?.correction(sp.id); // the layer the map uses (js/model.js scoreCells)
    badge.hidden = !c; badge.dataset.ctOpen = 'learn'; badge.title = tr('ct_learnOn');
    if (c) badge.innerHTML = `${ic('star', 'sm')}<span>${esc(tr('ct_badge'))}</span><small>${pct(c.lo * c.hlo)}…${pct(c.hi * c.hhi)}</small>`;
  }
  function changed(rescore) { // the log or the learning switch changed: the markers, the legend note, the map's scores, what is open, the event
    ver++; fire(); // first: js/personal.js forgets what it learned from the old log (an edit or an import keeps the count) before the map is scored again
    drawLayer(); drawBadge();
    if (rescore && pref.learn && F) { refresh(); rankAll(); }
    if (isOpen()) draw();
    if (form?.step === 'done') drawFlow();
    if (page?.el.isConnected) showPage(page.el, page.id);
  }

  /* ---------- The views: the logbook in the shared panel (PsPanel above); logging in a full-screen flow of its own (#ct-flow) ---------- */
  const isOpen = () => !!PsPanel.root('ct');
  const dropMini = () => { mmRO?.disconnect(); mmRO = null; mm?.remove(); mm = null; }; // the observer first: on a removed map invalidateSize throws
  function endForm() { if (form?.url) URL.revokeObjectURL(form.url); form = null; dropMini(); }
  const close = () => { if (isOpen()) PsPanel.close(); };
  function draw(fresh) { if (fresh || isOpen()) PsPanel.show('ct', journalHtml(), fresh); } // fresh: another view (a tab), from its top; else in place
  const chip = (act, v, on, label) => `<button type="button" data-ct="${act}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
  const press = (t, on) => { for (const b of t.parentElement.children) b.setAttribute('aria-pressed', on(b)); }; // a .seg or .chips in place: no redraw

  /* ---------- Logging, full screen, a step at a time: photo → fish → details → where and when, then "Catch logged" ---------- */
  // A layer over everything (the tab bar too) on phones, a tall card over a scrim on wide screens. A progress bar on top; Back and Next
  // at the foot, under the thumb. The system Back steps back (our own history entry, as PsPanel's); × leaves, asking first once something
  // is chosen. Everything but the fish is optional and has a default (where you are, now).
  const STEPS = ['photo', 'fish', 'details', 'where'];
  let flow = null, fGuard = false, fEat = null; // the layer; our Back entry is on the history; what runs once our own step back has landed
  const flowOpen = () => !!flow && !flow.hidden;
  const root = () => flowOpen() ? flow : null;
  function placesFor(i) { // where you are first; a spot you opened over a km away first instead (you are logging that spot, not your position)
    const at = i >= 0 ? i : sel.i, gps = fix && { k: 'ct_gps', la: fix[0], lo: fix[1], acc: fixAcc }, spot = at >= 0 && depth[at] && { k: 'ct_spot', la: latOf(at), lo: lonOf(at) };
    const places = (gps && spot && km([gps.la, gps.lo], [spot.la, spot.lo]).d > 1 ? [spot, gps] : [gps, spot]).filter(Boolean);
    if (!places.length && state.loc) places.push({ k: 'ct_loc', la: state.loc[0], lo: state.loc[1] });
    if (!places.length) { const c = map.getCenter(); places.push({ k: 'ct_mapc', la: c.lat, lo: c.lng }); }
    return places;
  }
  const blankForm = () => ({ step: 'photo', got: true, sp: '', count: 1, mode: state.mode, places: [], place: 0, at: null, time: dtLocal(Date.now()),
    note: '', photo: null, thumb: null, url: '', busy: false, cm: '', kg: '', bait: '', released: null, seen: false, likely: null, hours: 3 });
  // round 18 A: "Fished here, caught nothing": straight to its details (the map's fish as the target, its method, how long, here and now),
  // so a blank trip is two taps, this and Save; the fish step stays one Back away
  function logBlank() { log(-1); Object.assign(form, { got: false, sp: state.sp, step: 'details' }); drawFlow(true); }
  function log(i) {
    endForm();
    form = Object.assign(blankForm(), { sp: state.sp === 'all' ? '' : state.sp, places: placesFor(i) });
    // round 18 A: the exact GPS place filled in by itself: no fix yet but location allowed before: the watch starts, and the fix replaces
    // the starting place once it comes (unless the angler picked one). Never asks: the system question stays with the locate buttons.
    if (!fix && typeof locOk !== 'undefined' && locOk && typeof startWatch === 'function') { startWatch(); waitFix(form, 0, true); }
    openFlow();
  }
  function edit(id) { // the same flow from its details, the entry's own place first
    const e = list.find(x => x.id === id); if (!e) return;
    endForm();
    form = Object.assign(blankForm(), { id, step: 'details', got: !blank(e), sp: e.sp, count: e.n || 1, mode: e.mode, time: dtLocal(e.t), note: e.note || '',
      places: [{ k: 'ct_was', la: e.lat, lo: e.lon }, ...placesFor(-1).filter(p => p.k !== 'ct_mapc')], photo: e.photo || null, thumb: e.thumb || null,
      url: e.photo ? URL.createObjectURL(e.photo) : '', cm: e.cm ? String(e.cm) : '', kg: e.kg ? String(e.kg) : '', bait: e.bait || '', released: e.released ?? null, seen: !!e.seen, hours: e.hours || 3 });
    openFlow();
  }
  function openFlow() {
    if (!flow) {
      flow = Object.assign(document.createElement('div'), { id: 'ct-flow', className: 'ctf', hidden: true });
      flow.setAttribute('role', 'dialog'); flow.setAttribute('aria-modal', 'true'); flow.setAttribute('aria-labelledby', 'ctf-t');
      flow.addEventListener('click', e => { if (e.target === flow && form?.step === 'done') closeFlow(); }); // the scrim (wide screens), once saved
      document.body.append(flow);
    }
    flow.hidden = false;
    if (!fGuard) try { history.pushState({ psLog: 1 }, ''); fGuard = true; } catch {}
    drawFlow(true);
  }
  function closeFlow(then) { // then: what to open next, once our history entry is gone (a page opened before would lose its own)
    if (!flowOpen()) { then?.(); return; }
    flow.hidden = true; flow.innerHTML = ''; endForm();
    if (fGuard) { fGuard = false; if (history.state?.psLog) { fEat = then || true; history.back(); return; } }
    then?.();
  }
  const dirty = () => form && form.step !== 'done' && (form.photo || STEPS.indexOf(form.step) > 0);
  const leave = () => { if (!dirty() || confirm(tr('ctf_discard'))) closeFlow(); return !flowOpen(); };
  function stepBy(d) { // the foot's Back and Next (Next on the last step saves)
    const f = form; if (!f) return;
    const k = STEPS.indexOf(f.step) + d;
    if (k < 0 || (STEPS[k] === 'photo' && !f.got)) { leave(); return; } // a blank trip has no photo step to go back to
    if (d > 0 && f.step === 'fish' && (!f.sp || f.got && f.sp === 'all')) { toast(tr('ct_needFish')); return; }
    if (k >= STEPS.length) { save(); return; }
    f.step = STEPS[k]; if (f.step === 'fish') f.likely = null;
    drawFlow(true, d);
  }
  window.PsCatchBack = e => { // the system Back: one step back (js/catchlog-back.js: before js/mobile.js's listener)
    if (fEat) { const t = fEat; fEat = null; e.stopImmediatePropagation(); if (typeof t === 'function') t(); return; }
    if (!fGuard || history.state?.psLog) return;
    fGuard = false; e.stopImmediatePropagation();
    if (form && STEPS.indexOf(form.step) > 0) stepBy(-1); else if (leave()) return;
    try { history.pushState({ psLog: 1 }, ''); fGuard = true; } catch {}
  };
  window.PsCatchKey = e => { if (e.key === 'Escape' && flowOpen()) { e.stopImmediatePropagation(); if (form?.step === 'done') closeFlow(); else leave(); } };
  function drawFlow(fresh, dir = 1) { // fresh: a new step, from its top (dir: -1 when it came back)
    const f = form; if (!flowOpen() || !f) return;
    const y = fresh ? 0 : flow.querySelector('.ctf-body')?.scrollTop || 0;
    dropMini();
    flow.innerHTML = `<div class="ctf-card${fresh ? dir < 0 ? ' in-back' : ' in' : ''}" data-step="${f.step}">${f.step === 'done' ? doneHtml() : stepHtml()}</div>`;
    flow.querySelector('.ctf-body').scrollTop = y;
    if (f.step === 'where') mountMini(flow);
    if (fresh) flow.querySelector('#ctf-t')?.focus({ preventScroll: true });
  }
  const here = () => form.at ? { la: form.at[0], lo: form.at[1] } : form.places[form.place];
  const timeOf = f => Math.min(Date.now(), new Date(f.time).getTime() || Date.now());
  const title = (t, sub) => `<h2 class="ctf-h" id="ctf-t" tabindex="-1">${esc(t)}</h2>${sub ? `<p class="ctf-sub">${esc(sub)}</p>` : ''}`;
  // round 17 G: the phone knows where you are (GPS) and it is now: Details saves at once, with "here, now" as a line that opens Where and when
  // (one tap fewer for the usual catch; nothing asked that the phone already knows)
  const hereNow = f => !f.id && !f.at && f.place === 0 && f.places[0]?.k === 'ct_gps' && Math.abs(Date.now() - new Date(f.time)) < 30 * 6e4;
  function stepHtml() {
    const f = form, n = STEPS.length, k = STEPS.indexOf(f.step), last = k === n - 1 || f.step === 'details' && hereNow(f), noFish = f.step === 'fish' && (!f.sp || f.got && f.sp === 'all');
    const body = { photo: photoStep, fish: fishStep, details: detailStep, where: whereStep }[f.step]();
    return `<header class="ctf-top"><button type="button" class="icon-btn ctf-x" data-ct="close" aria-label="${esc(tr('close'))}">${ic('close')}</button>` +
      `<div class="ctf-prog" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${k + 1}" aria-label="${esc(tr('ctf_step', k + 1, n))}">` +
      `${STEPS.map((s, j) => `<i${j < k ? ' class="on"' : j === k ? ' class="now"' : ''}></i>`).join('')}</div>` +
      (f.id ? `<button type="button" class="btn sm primary ctf-save" data-ct="save"${f.busy ? ' disabled' : ''}>${esc(tr('ct_save'))}</button>` : '') + // round 17 G: no "2/4" beside the dots
      `</header><div class="ctf-body">${body}</div>` +
      `<footer class="ctf-foot">${k ? `<button type="button" class="btn lg ctf-prev" data-ct="prev">${ic('chevron-left', 'sm')}${esc(tr('ct_back'))}</button>` : ''}` +
      `<button type="button" class="btn lg primary ctf-next" data-ct="${last ? 'save' : 'next'}"${f.busy || noFish ? ' disabled' : ''}>` +
      (last ? `${ic('check', 'sm')}${esc(tr('ct_save'))}` : `${esc(tr(f.step === 'photo' && !f.url ? 'ct_skip' : 'ct_next'))}${ic('chevron-right', 'sm')}`) + `</button></footer>`;
  }
  const camIn = '<input type="file" accept="image/*" capture="environment" data-ct-photo hidden>', galIn = '<input type="file" accept="image/*" data-ct-photo hidden>';
  function photoStep() { // a big camera target, the gallery; a blank trip from here too
    const f = form;
    if (f.busy) return title(tr('ctf_photoT')) + `<div class="ctf-shot busy">${ic('camera')}<b>${esc(tr('ct_preparing'))}</b></div>`;
    if (f.url) return title(tr('ctf_photoT')) + `<figure class="ctf-shot has"><img src="${f.url}" alt=""></figure>` +
      `<div class="ctf-two"><label class="btn lg">${ic('camera', 'sm')}${esc(tr('ct_retake'))}${camIn}</label><button type="button" class="btn lg" data-ct="nophoto">${ic('trash', 'sm')}${esc(tr('ct_noPhoto'))}</button></div>`;
    return title(tr('ctf_photoT'), tr('ct_shotSub')) +
      `<label class="ctf-shot">${ic('camera')}<b>${esc(tr('ct_shot'))}</b><small>${esc(tr('ct_camera'))}</small>${camIn}</label>` +
      `<label class="btn lg ctf-gal">${ic('image', 'sm')}${esc(tr('ct_pick'))}${galIn}</label>` +
      `<button type="button" class="btn lg ctf-blank" data-ct="blank">${ic('minus', 'sm')}${esc(tr('ct_blankLog'))}</button>`; // round 16 P: the title's line already says where the photo stays; round 18 A: a full button, as clear as the gallery's
  }
  function fishStep() { // search, the likeliest fish here and now (the model's chance as dials) as big tiles, then every fish A–Z
    const f = form, p = here(), i = seaCell(p.la, p.lo);
    f.likely ||= i >= 0 ? likelyNow(i, f.mode, timeOf(f)) : [];
    const card = (s, v) => `<button type="button" class="ct-fc${s.id === f.sp ? ' on' : ''}" data-ct="pick" data-v="${s.id}" aria-pressed="${s.id === f.sp}" ` +
      `data-k="${esc(fkey(s))}"><span class="ct-fpic">${PsPanel.fish(s) || ic(s.all ? 'fish-list' : 'fish')}</span>` +
      `<span class="ct-fn">${esc(fishName(s))}</span>${v != null ? ring(v, 'sm') : ''}</button>`;
    const all = [...SPECIES].sort((a, b) => fishName(a).localeCompare(fishName(b), locale()));
    return `<div class="ctf-stick">${title(tr(f.got ? 'ctf_fishT' : 'ctf_targetT'))}<div class="ct-find">${f.url ? `<img src="${f.url}" alt="">` : ''}` +
      `<label class="ct-q">${ic('search', 'sm')}<input type="search" data-ct-q placeholder="${esc(tr('ct_search'))}" aria-label="${esc(tr('ct_search'))}" autocomplete="off" enterkeyhint="search"></label></div></div>` +
      (f.likely.length ? `<section class="ct-likely"><h3>${esc(tr('ct_likely'))}</h3><div class="ct-grid big">${f.likely.slice(0, 6).map(x => card(x.s, x.v)).join('')}</div>` +
        `${f.likely[0].v != null ? `<p class="hint">${esc(tr('ct_likelyTip'))}</p>` : ''}</section>` : '') +
      `<section class="ct-allf"><h3>${esc(tr('ct_allFish'))}</h3><div class="ct-grid">${(f.got ? all : [ALL_FISH, ...all]).map(s => card(s)).join('')}</div>` +
      `<p class="empty ct-none" hidden>${ic('search')}<span>${esc(tr('ct_noMatch'))}</span></p></section>`;
  }
  function filterFish(q) {
    const r = root(); if (!r) return;
    const k = norm(q.trim()), kl = k.replace(/ch/g, 'h').replace(/y/g, 'i'); let n = 0; // kl: a Latin spelling as latin() writes it (js/ui.js drawGallery)
    r.querySelector('.ct-likely')?.toggleAttribute('hidden', !!k);
    for (const b of r.querySelectorAll('.ct-allf .ct-fc')) { const hit = !k || b.dataset.k.includes(k) || b.dataset.k.includes(kl); b.hidden = !hit; n += hit; }
    r.querySelector('.ct-none').hidden = n > 0;
  }
  function baitOpts(s, mode, v) { // the fish's own baits and lures first (data/gear-*.js, once loaded), then the catalogue's; spearguns for spearfishing
    const G = window.PSAREMA_GEAR?.[s.id], CN = window.PSAREMA_GEAR_CATS || {};
    const sug = mode === 'spear' || !G ? [] : [...new Set([...G.baits || [], ...G.lures || []].map(b => b.gear))].filter(id => CATS[id]);
    const ids = c => Object.keys(CATS).filter(id => CATS[id].cat === c && !sug.includes(id)).sort((a, b) => gearTxt(a).localeCompare(gearTxt(b), locale()));
    const grp = (label, a) => a.length ? `<optgroup label="${esc(label)}">${a.map(id => `<option value="${id}"${id === v ? ' selected' : ''}>${esc(gearTxt(id))}</option>`).join('')}</optgroup>` : '';
    return `<option value="">${esc(tr('ct_baitNone'))}</option>` + grp(tr('ct_baitFor', fishName(s)), sug) + (mode === 'spear' ? ['spear'] : ['baits', 'lures']).map(c => grp(L10(CN[c]) || c, ids(c))).join('');
  }
  function detailStep() { // weight and length, how many, method, bait, released, a note: all optional (a blank trip: method and note)
    const f = form, s = fishOf(f.sp), k = t => `<span class="ctf-k">${esc(t)}</span>`;
    const num = (key, label, unit) => `<label class="ctf-num">${k(label)}<span class="ctf-numin"><input type="text" inputmode="decimal" value="${esc(f[key])}" placeholder="0" ` +
      `data-ct-f="${key}" aria-label="${esc(label)} (${unit})" autocomplete="off"><i>${unit}</i></span></label>`;
    if (typeof loadGear === 'function' && f.got && f.mode !== 'spear' && !window.PSAREMA_GEAR?.[s.id]) loadGear()?.then?.(() => { // the fish's own baits, once the gear files are in
      const el = root()?.querySelector('[data-ct-f="bait"]'); if (el && form) el.innerHTML = baitOpts(fishOf(form.sp), form.mode, form.bait);
    });
    return title(tr('ctf_detT')) +
      `<div class="ct-sum"><span class="ct-sumpic">${f.url ? `<img src="${f.url}" alt="">` : PsPanel.fish(s) || ic('fish')}</span>` +
      `<span class="pn-main"><b>${esc(f.got ? fishName(s) : tr('ct_blankOf', fishName(s)))}</b><small>${esc(tr(f.got ? f.seen ? 'ct_seen' : 'ct_caught' : 'ct_blank'))}</small></span>` +
      `<span class="ct-sumacts"><label class="btn ib" title="${esc(tr('ct_photo'))}" aria-label="${esc(tr('ct_photo'))}">${ic('camera', 'sm')}${galIn}</label>` +
      `<button type="button" class="btn" data-ct="step" data-v="fish">${esc(tr('ct_change'))}</button></span></div>` +
      (hereNow(f) ? `<button type="button" class="ctf-line ctf-here" data-ct="step" data-v="where">${ic('location')}<span class="ctf-lm"><b>${esc(whereTxt(here().la, here().lo))}</b>` +
        `<small>${esc(tr('ctf_now'))}</small></span><span class="btn sm">${esc(tr('ct_change'))}</span></button>` : '') +
      (f.got ? `<label class="ctf-line ctf-rel">${ic('eye')}<span class="ctf-lm"><b>${esc(tr('ct_seen'))}</b><small>${esc(tr('ctf_seenSub'))}</small></span>` + // round 15: seen or let go, nothing kept
        `<input type="checkbox" class="ctf-sw" role="switch" data-ct-seen${f.seen ? ' checked' : ''}></label>` : '') +
      (f.got && !f.seen ? `<div class="ctf-nums">${num('kg', tr('ct_wt'), 'kg')}${num('cm', tr('ct_len'), 'cm')}</div>` : '') +
      (f.got ? '' +
        `<div class="ctf-line">${k(tr('ct_count'))}<span class="ctf-stepper"><button type="button" class="icon-btn" data-ct="cnt" data-v="-1" aria-label="${esc(tr('ctf_less'))}">${ic('minus')}</button>` +
        `<input type="number" inputmode="numeric" min="1" max="999" value="${f.count}" data-ct-f="count" aria-label="${esc(tr('ct_count'))}">` +
        `<button type="button" class="icon-btn" data-ct="cnt" data-v="1" aria-label="${esc(tr('ctf_more'))}">${ic('plus')}</button></span></div>` : '') +
      `<div class="ctf-fld">${k(tr('ct_method'))}<div class="ctf-opts" role="group" aria-label="${esc(tr('ct_method'))}">${MODES.map(m => chip('mode', m, f.mode === m, ic(m) + `<span>${esc(tr(m))}</span>`)).join('')}</div></div>` +
      (f.got ? (f.seen ? '' : `<label class="ctf-fld">${k(tr('ct_bait'))}<select class="ctf-in" data-ct-f="bait">${baitOpts(s, f.mode, f.bait)}</select></label>` +
        `<label class="ctf-line ctf-rel">${ic('waves')}<span class="ctf-lm"><b>${esc(tr('ct_released'))}</b><small>${esc(tr('ctf_relSub'))}</small></span>` +
        `<input type="checkbox" class="ctf-sw" role="switch" data-ct-rel${f.released ? ' checked' : ''}></label>`) : `<div class="ctf-line">${k(tr('ct_hours'))}<span class="ctf-stepper"><button type="button" class="icon-btn" data-ct="hrs" data-v="-1" aria-label="${esc(tr('ctf_less'))}">${ic('minus')}</button>` +
        `<input type="number" inputmode="numeric" min="1" max="24" value="${f.hours}" data-ct-f="hours" aria-label="${esc(tr('ct_hours'))}">` +
        `<button type="button" class="icon-btn" data-ct="hrs" data-v="1" aria-label="${esc(tr('ctf_more'))}">${ic('plus')}</button></span></div>` +
        `<p class="pn-note">${ic('info', 'sm')}<span>${esc(tr('ctf_blankS'))}</span></p>`) +
      `<label class="ctf-fld">${k(tr('ct_noteP'))}<textarea class="ctf-in" rows="3" maxlength="300" data-ct-f="note">${esc(f.note)}</textarea></label>`;
  }
  function whereStep() { // a big map with the pin in the middle, where it is in words, the places to start from, when
    const f = form, p = here(), geo = !f.places.some(q => q.k === 'ct_gps') && typeof hasGeo === 'function' && hasGeo();
    return title(tr('ctf_whereT'), tr('ctf_whereS')) +
      `<div class="ct-mm-box ctf-map"><div class="ct-mm"></div><span class="ct-mm-pin">${ic('pin')}</span></div>` +
      `<p class="ctf-where">${ic('location', 'sm')}<span class="ct-where">${esc(whereTxt(p.la, p.lo))}</span></p>` +
      `<div class="ctf-places" role="group" aria-label="${esc(tr('ct_place'))}">${f.places.map((q, j) => chip('place', j, !f.at && f.place === j, ic(q.k === 'ct_gps' ? 'my-location' : 'pin', 'sm') + esc(tr(q.k)))).join('')}` +
      (geo ? `<button type="button" data-ct="locate">${ic('my-location', 'sm')}${esc(tr('ct_gps'))}</button>` : '') + `</div>` +
      `<div class="ctf-fld"><span class="ctf-k">${esc(tr('ct_time'))}</span><div class="ctf-when"><input class="ctf-in" type="datetime-local" value="${f.time}" max="${dtLocal(Date.now())}" ` +
      `data-ct-f="time" aria-label="${esc(tr('ct_time'))}"><button type="button" class="btn lg" data-ct="now">${esc(tr('ctf_now'))}</button></div></div>`;
  }
  function waitFix(f, n = 0, quiet) { // after "Where I am": the first fix (ui.js), up to 20 s; quiet (round 18 A, the flow's start): no message, and not over a place the angler chose
    if (form !== f) return;
    if (!fix && n < 40) { setTimeout(waitFix, 500, f, n + 1, quiet); return; }
    if (quiet && (!fix || f.at || f.place !== 0 || f.step === 'done' || f.id)) return;
    if (fix) Object.assign(f, { places: [{ k: 'ct_gps', la: fix[0], lo: fix[1], acc: fixAcc }, ...f.places.filter(q => q.k !== 'ct_gps')], place: 0, at: null, likely: null });
    else toast(tr('ctf_noFix'));
    if (f.step === 'where' || quiet && f.step === 'details' && !flow?.contains(document.activeElement?.closest?.('input, textarea, select'))) drawFlow(); // details: its Save and the "here, now" line
  }
  function doneHtml() { // saved: the catch big, its size, a personal best, share it, see it, or log another
    const f = form, e = list.find(x => x.id === f.saved); if (!e) return '<div class="ctf-body"></div>';
    const s = fishOf(e.sp), u = blobUrl(e), got = !blank(e), facts = [got && sizeTxt(e), e.released && tr('ct_released')].filter(Boolean); // the count is in the title
    return `<header class="ctf-top"><button type="button" class="icon-btn ctf-x" data-ct="close" aria-label="${esc(tr('close'))}">${ic('close')}</button></header>` +
      `<div class="ctf-body ctf-done"><div class="ctf-hero${u ? ' photo' : ''}${got ? '' : ' blank'}">${got ? `<span class="ctf-burst" aria-hidden="true">${'<i></i>'.repeat(12)}</span>` : ''}` +
      `${u ? `<img src="${u}" alt="">` : PsPanel.fish(s) || ic('fish')}<span class="ctf-tick">${ic('check')}</span></div>` +
      title(tr(caught(e) ? 'ctf_doneT' : 'ctf_doneBlank')) + `<p class="ctf-dname">${esc(titleOf(e))}</p>` +
      (facts.length ? `<div class="ct-facts">${facts.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : '') +
      (isPB(e) ? `<p class="ctf-pb">${ic('trophy', 'sm')}${esc(tr('ctf_newPB'))}</p>` : '') + (f.msg ? `<p class="ctf-sub">${esc(f.msg)}</p>` : '') + `</div>` +
      `<footer class="ctf-foot col"><button type="button" class="btn lg primary" data-ct="share" data-id="${esc(e.id)}">${ic('share', 'sm')}${esc(tr('ct_share'))}</button>` +
      `<div class="ctf-two"><button type="button" class="btn lg" data-ct="view" data-id="${esc(e.id)}">${esc(tr('ctf_view'))}</button><button type="button" class="btn lg" data-ct="close">${esc(tr('ctf_done'))}</button></div>` +
      `<button type="button" class="btn ghost ctf-again" data-ct="log">${ic('plus', 'sm')}${esc(tr('ctf_another'))}</button></footer>`;
  }
  // The place on the map: the pin stays in the middle and the map moves under it.
  // The app's own imagery (tiles/tiles.js, there offline), sharper online imagery when zoomed in past it.
  function mountMini(r) {
    const el = r.querySelector('.ct-mm'); if (!el) return;
    const p = here(), T = window.PSAREMA_TILES;
    const z = p.k === 'ct_mapc' ? Math.max(9, Math.min(13, Math.round(map.getZoom() * 2) / 2)) : 13; // round 16 P: no fix and no spot: the map's own view (the coast in sight), not 13 over inland fields
    mm = L.map(el, { zoomControl: false, center: [p.la, p.lo], zoom: z, minZoom: 8, maxZoom: 19, zoomSnap: .5, maxBounds: L.latLngBounds(VIEW).pad(.25) });
    mm.attributionControl.setPrefix(false); // the imagery's licences ask for the credit wherever it shows (round 14 store): the map's (i) fold
    { const a = mm.attributionControl.getContainer(); a.classList.add('folded'); a.title = tr('credits');
      L.DomEvent.on(a, 'click', e => { if (a.classList.contains('folded')) L.DomEvent.preventDefault(e); a.classList.toggle('folded'); }); }
    // round 17 M: the map's own tiles (js/map.js PsOwnTiles: its index, open sea drawn as the background, inland z14 from the parent tile), so no
    // missing tile shows the page's grey; the sea's tone behind them
    if (T) { el.style.background = T.sea || ''; (window.PsOwnTiles?.({ pad: 0, keepBuffer: 2 }) || L.tileLayer(T.url, { minNativeZoom: T.minZoom, maxNativeZoom: T.maxZoom, bounds: T.bounds, maxZoom: 19, className: 'sat', errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', attribution: T.attribution })).addTo(mm); }
    if (navigator.onLine !== false && IMAGERY.url) poweredBy(mm, L.tileLayer(IMAGERY.url, { minZoom: IMAGERY.from ?? (T ? T.maxZoom + .5 : 0), maxZoom: 19, maxNativeZoom: 18, className: 'sat', attribution: IMAGERY.credit }).addTo(mm)); // js/map-config.js
    const m = mm;
    m.on('moveend', () => {
      if (m !== mm || !form) return;
      const c = m.getCenter(), q = form.places[form.place], moved = km([c.lat, c.lng], [q.la, q.lo]).d > .03, r = root();
      form.at = moved ? [c.lat, c.lng] : null; form.likely = null;
      for (const b of r?.querySelectorAll('[data-ct="place"]') || []) b.setAttribute('aria-pressed', !moved && +b.dataset.v === form.place);
      const w = r?.querySelector('.ct-where'); if (w) w.textContent = whereTxt(c.lat, c.lng);
    });
    (mmRO = new ResizeObserver(() => { if (m === mm && el.isConnected) m.invalidateSize(); })).observe(el);
  }
  // A photo: at most 1600 px on the long side as JPEG 0.8 (a 3–8 MB phone photo comes to ~300 KB) and a 320 px thumbnail for the lists
  const bitmap = b => createImageBitmap(b, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(b));
  function jpeg(b, px, q) {
    const k = Math.min(1, px / Math.max(b.width, b.height)), c = Object.assign(document.createElement('canvas'), { width: Math.round(b.width * k), height: Math.round(b.height * k) });
    c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
    return new Promise((ok, no) => c.toBlob(x => x ? ok(x) : no(new Error('no JPEG')), 'image/jpeg', q));
  }
  async function shrink(file) { const b = await bitmap(file); try { return await Promise.all([jpeg(b, 1600, .8), jpeg(b, 320, .75)]); } finally { b.close?.(); } }
  async function thumbOf(blob) { const b = await bitmap(blob); try { return await jpeg(b, 320, .75); } finally { b.close?.(); } }
  async function addPhoto(file) {
    const f = form; f.busy = true; drawFlow();
    try {
      const [photo, thumb] = await shrink(file); if (form !== f) return;
      if (f.url) URL.revokeObjectURL(f.url);
      Object.assign(f, { photo, thumb, url: URL.createObjectURL(photo) });
      const age = Date.now() - file.lastModified; // a photo from the gallery: about when it was taken
      if (!f.id && age > 10 * 6e4 && age < 30 * 864e5) { f.time = dtLocal(file.lastModified); f.likely = null; }
      if (f.step === 'photo') f.step = 'fish';
    } catch (err) { console.warn('Photo:', err); toast(tr('ct_photoErr')); }
    if (form === f) { f.busy = false; drawFlow(true); }
  }
  async function save() {
    const f = form; if (!f || f.busy) return;
    if (!f.sp || f.got && f.sp === 'all') { toast(tr('ct_needFish')); f.step = 'fish'; drawFlow(true); return; }
    const p = here(), s = fishOf(f.sp), old = f.id && list.find(x => x.id === f.id), was = enough(tripsOf(f.sp));
    // an edit at the same time and place keeps the conditions it saved then (the forecast may not cover that hour any more)
    const same = old && f.time === dtLocal(old.t) && Math.abs(p.la - old.lat) < 1e-4 && Math.abs(p.lo - old.lon) < 1e-4;
    const t = same ? old.t : timeOf(f), la = same ? old.lat : +p.la.toFixed(5), lo = same ? old.lon : +p.lo.toFixed(5);
    let snap = same && old.sp === s.id && old.mode === f.mode ? old.snap : conditions(s, f.mode, la, lo, t);
    if (same && snap.score == null && old.snap?.wsEff != null) snap = { ...old.snap, score: undefined, rows: undefined }; // another fish, its hour no longer forecast: the weather then, no score
    const e = { id: f.id || 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t, sp: s.id, mode: f.mode, lat: la, lon: lo,
      cell: seaCell(la, lo), n: f.got ? lim(Math.round(+f.count) || 1, 1, 999) : 0, note: f.note.trim().slice(0, 300), photo: f.photo, snap };
    if (f.thumb) e.thumb = f.thumb;
    const acc = same ? old.acc : !f.at && p.acc; if (acc > 0 && Number.isFinite(acc)) e.acc = lim(Math.round(acc), 1, 5000); // round 18 A: the GPS fix's accuracy, m (a place set by hand has none)
    if (!f.got) e.hours = lim(Math.round(+f.hours) || 1, 1, 24); // a blank trip: how long you fished (PsCatchLog.all, the on-device learning)
    if (f.got && f.seen) e.seen = true; // round 15: seen (or let go before landing), nothing kept: no size, bait or kept/released
    else if (f.got) { const cm = dec(f.cm), kg = dec(f.kg); if (cm) e.cm = Math.min(cm, 500); if (kg) e.kg = Math.min(kg, 1000); if (f.bait) e.bait = f.bait; if (f.released != null) e.released = f.released; }
    f.busy = true; // one save, however many taps
    try { await run('readwrite', st => st.put(e)); } catch (err) { console.warn(err); toast(tr('ct_saveErr')); f.busy = false; return; }
    f.busy = false;
    list = list.filter(x => x.id !== e.id); list.push(e); sortList(); dropUrl(e.id);
    changed(true); window.PsNative?.haptic?.('success');
    if (!old) window.PsShare?.add(e.id); // round 15: queued for science only while the angler's switch is on
    if (form !== f) return; // closed while it saved
    if (old) { toast(tr('ct_edited')); closeFlow(page?.id === e.id && page.el.isConnected ? null : () => openCatch(e.id)); return; } // an edit: back to its page
    if (!was && !pref.learn && enough(tripsOf(e.sp))) toast(tr('ct_canLearn', fishName(s)));
    Object.assign(f, { step: 'done', saved: e.id, msg: tr('ct_saved', fishName(s), tripsOf(e.sp === 'all' ? '' : e.sp).length) }); drawFlow(true); // the celebration
  }

  /* ---------- The catch's page (PsNav 'catch'): the photo, the fish and its size, when and where, the conditions then ---------- */
  const arrow = d => `<svg class="ct-arw" viewBox="-12 -12 24 24" aria-hidden="true" style="transform:rotate(${Math.round(d + 180)}deg)"><path d="M0-9.5L6 6 0 2.5-6 6Z"/></svg>`; // where the wind went
  const moonSvg = p => { const k = Math.cos(2 * Math.PI * p); return `<svg class="ct-moon" viewBox="-10 -10 20 20" aria-hidden="true"><circle r="9"/><path d="M0-9A9 9 0 0 1 0 9A${(9 * Math.abs(k)).toFixed(1)} 9 0 0 ${k > 0 ? 0 : 1} 0-9Z"${p > .5 ? ' transform="scale(-1 1)"' : ''}/></svg>`; }; // lit on the right while waxing (as instruments.js)
  function tiles(q) { // the conditions saved with the catch, as small instrument tiles (the depth is in the place line)
    const K = tr('ct_k'), D = tr('ct_dims'), B = tr('ct_b'), T = [];
    const tile = (label, big, small, pic) => `<div class="ct-tile"><span class="lbl">${esc(label)}</span><span class="ct-tv">${pic}<b>${esc(big)}</b></span>${small ? `<small>${esc(small)}</small>` : ''}</div>`;
    if (q.period) T.push(tile(tr('ct_tod'), cap(tr(q.period)), q.solunar ? cap(tr(q.solunar)) : '', ic({ dawn: 'sunrise', dusk: 'sunset', day: 'sun', night: 'moon' }[q.period])));
    if (q.wsEff != null) T.push(tile(K.wind, `${q.wdir != null ? compass(q.wdir) + ' ' : ''}${Math.round(q.wsEff)}`, `km/h${q.gust != null ? ` · ${tr('ct_gust')} ${Math.round(q.gust)}` : ''}`, q.wdir != null ? arrow(q.wdir) : ic('wind')));
    if (q.wEff != null) T.push(tile(K.waves, `${nf(q.wEff)} m`, q.wave != null && Math.abs(q.wave - q.wEff) > .05 ? tr('ct_open', nf(q.wave)) : '', ic('waves')));
    if (q.sst != null) T.push(tile(K.water, `${nf(q.sst)} °C`, '', ic('thermometer')));
    if (q.dp != null) T.push(tile(K.press, cap(B[q.dp < -1 ? 'fall' : q.dp > 1 ? 'rise' : 'steady']), `${q.dp > .05 ? '+' : ''}${nf(Math.abs(q.dp) < .05 ? 0 : q.dp)} hPa/24h`, ic('pressure')));
    if (q.illum != null) T.push(tile(D.moon, `${Math.round(q.illum * 100)}%`, q.phase != null ? tr('phases')[Math.round(q.phase * 8) % 8] : '', moonSvg(q.phase ?? (q.illum > .5 ? .5 : 0))));
    return T.length ? `<div class="ct-tiles">${T.join('')}</div>` : '';
  }
  function pageHtml(e) { // a post: the photo full width with the fish over it, its numbers, when and where, the actions, then the conditions then
    const s = fishOf(e.sp), u = blobUrl(e), q = e.snap || {}, got = !blank(e), id = esc(e.id), o = q.obs;
    const stat = (v, k) => `<div><b>${esc(v)}</b><span class="lbl">${esc(k)}</span></div>`;
    const stats = [got && e.kg && stat(`${nfx(e.kg)} kg`, tr('ct_wt')), got && e.cm && stat(`${nfx(e.cm)} cm`, tr('ct_len')), // the count is in the title
      `<div><b class="ct-sm">${ic(e.mode, 'sm')}${esc(tr(e.mode))}</b><span class="lbl">${esc(tr('ct_method'))}</span></div>`].filter(Boolean);
    const meta = [['clock', `${fmtT(e.t, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${hm(e.t)}`], ['pin', placeOf(e)],
      !got && e.hours && ['clock', tr('ct_hoursN', e.hours)], e.bait && ['lure', gearTxt(e.bait)], e.released != null && [e.released ? 'waves' : 'fish', tr(e.released ? 'ct_released' : 'ct_kept')]].filter(Boolean);
    const why = q.rows?.length ? reasons(q.rows) : [];
    const btn = (act, icon, label, cls = '') => `<button type="button" class="btn${cls}" data-ct="${act}" data-id="${id}">${ic(icon, 'sm')}<span>${esc(label)}</span></button>`;
    return `<article class="ct-page${got ? '' : ' blank'}" data-id="${id}"><figure class="ct-hero ui-bleed${u ? '' : ' cut'}">` +
      `${u ? `<img src="${u}" alt="${esc(fishName(s))}">` : PsPanel.fish(s) || ic('fish')}${isPB(e) ? `<span class="ct-pb">${ic('trophy', 'sm')}${esc(tr('ct_pb'))}</span>` : ''}` +
      `<figcaption class="ct-ph"><div><h2>${esc(titleOf(e))}</h2>${s.scientific ? `<i>${esc(s.scientific)}</i>` : ''}</div>${q.score != null ? ring(q.score, 'lg') : ''}</figcaption></figure>` +
      `<div class="ct-stats">${stats.join('')}</div>` +
      `<ul class="ct-meta">${meta.map(([i, t]) => `<li>${ic(i, 'sm')}<span>${esc(t)}</span></li>`).join('')}</ul>` +
      (e.note ? `<p class="ct-note selectable">${esc(e.note)}</p>` : '') +
      `<div class="ct-pacts">${btn('share', 'share', tr('ct_share'), ' primary')}${btn('goto', 'map', tr('ct_show'))}${btn('edit', 'edit', tr('ct_edit'))}${btn('del', 'trash', tr('ct_del'), ' ghost')}</div>` +
      `<h3>${esc(tr('ct_condThen'))}</h3>${tiles(q)}` +
      (o && o.station ? `<p class="hint ct-obs">${ic('location', 'sm')}<span>${esc(tr('ct_measured', o.station, o.km != null ? fmtKm(o.km) : '–'))}: ` +
        `${esc([o.wind != null && `${tr('k_wind').toLowerCase()} ${Math.round(o.wind)} km/h`, o.wave != null && `${tr('k_waves').toLowerCase()} ${nf(o.wave)} m`, o.sst != null && `${nf(o.sst)} °C`].filter(Boolean).join(' · '))}</span></p>` : '') +
      (q.score != null ? `<p class="hint">${esc(tr('ct_scoreThen', q.score, rating(q.score)))}</p>` : `<p class="hint">${esc(tr('ct_noCond'))}</p>`) +
      (why.length ? `<ul class="reasons">${why.map(reasonLi).join('')}</ul>` : '') + `</article>`;
  }
  function showPage(el, id) {
    if (!el) return;
    const e = list.find(x => x.id === id); page = { el, id };
    el.innerHTML = e ? pageHtml(e) : `<p class="empty">${ic('fish')}<span>${esc(tr(ready ? 'ct_gone' : 'ct_loading'))}</span></p>`;
  }
  function openCatch(id) { // the page (js/nav.js); without it, in the panel shell
    if (navOk) { PsNav.open('catch', id); return; }
    const r = PsPanel.show('ctp', PsPanel.head('ctp', 'fish', tr('ct_page')) + '<div></div>', true); showPage(r?.lastChild, id);
  }
  document.addEventListener('DOMContentLoaded', () => { // the synthetic one data/boot.js sends once every script ran: js/nav.js is in
    if (navOk || !window.PsNav?.add) return; navOk = true;
    PsNav.add('catch', { title: () => tr('ct_page'), icon: 'fish', render: showPage, show: showPage, hide: () => { page = null; } });
  });

  /* ---------- The share picture: 1080 × 1350 (4:5, what feeds show whole), the photo or the cut-out, the fish, size, day, area, conditions ---------- */
  const loadImg = src => { const im = new Image(); im.src = src; return im.decode().then(() => im, () => null); };
  async function card(id) {
    const e = list.find(x => x.id === id); if (!e) throw new Error('no such catch');
    const s = fishOf(e.sp), q = e.snap || {}, Wd = 1080, Ht = 1350, PH = 900, X = 72, name = titleOf(e);
    const c = Object.assign(document.createElement('canvas'), { width: Wd, height: Ht }), g = c.getContext('2d');
    const font = (w, px) => `${w} ${px}px Inter, 'Segoe UI', Roboto, Arial, sans-serif`;
    await Promise.all(['700 76px', '600 40px', '500 32px'].map(f => Promise.resolve(document.fonts?.load?.(`${f} Inter`, name + 'ΑΩ')).catch(() => {})));
    g.fillStyle = '#121212'; g.fillRect(0, 0, Wd, Ht);
    const img = e.photo ? await bitmap(e.photo).catch(() => null) : CUT[s.id] ? await loadImg(CUT[s.id].file) : null;
    if (e.photo && img) { const k = Math.max(Wd / img.width, PH / img.height); g.drawImage(img, (Wd - img.width * k) / 2, (PH - img.height * k) / 2, img.width * k, img.height * k); }
    else {
      const rg = g.createRadialGradient(Wd / 2, PH * .45, 40, Wd / 2, PH * .45, 640); rg.addColorStop(0, '#333'); rg.addColorStop(1, '#141414');
      g.fillStyle = rg; g.fillRect(0, 0, Wd, PH);
      if (img) { const k = Math.min(Wd * .78 / img.width, PH * .62 / img.height); g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
        if (blank(e)) g.filter = 'grayscale(1) brightness(.6)'; g.drawImage(img, (Wd - img.width * k) / 2, PH * .45 - img.height * k / 2, img.width * k, img.height * k); g.restore(); }
    }
    img?.close?.();
    const fade = g.createLinearGradient(0, PH - 300, 0, PH); fade.addColorStop(0, 'rgba(18,18,18,0)'); fade.addColorStop(1, '#121212');
    g.fillStyle = fade; g.fillRect(0, PH - 300, Wd, 300);
    const text = (t, x, y, f, color, max) => { g.font = f; g.fillStyle = color; let s = String(t); if (max) while (s.length > 1 && g.measureText(s).width > max) s = s.slice(0, -2) + '…'; g.fillText(s, x, y); };
    if (isPB(e)) { // the personal best tag, white with dark text, as in the app
      g.font = font(650, 30); const t = tr('ct_pb'), w = g.measureText(t).width + 40;
      g.fillStyle = '#f5f5f5'; g.beginPath(); g.roundRect ? g.roundRect(X - 8, 56, w, 54, 8) : g.rect(X - 8, 56, w, 54); g.fill(); text(t, X + 12, 94, font(650, 30), '#121212');
    }
    const ringR = 58, cx = Wd - X - ringR, cy = PH + 6;
    if (q.score != null) { // the map's chance then, as the app's dial
      g.lineWidth = 11; g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(cx, cy, ringR, 0, 2 * Math.PI); g.stroke();
      g.strokeStyle = solid(q.score); g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * q.score / 100); g.stroke();
      g.textAlign = 'center'; text(q.score, cx, cy + 15, font(700, 44), '#f5f5f5'); g.textAlign = 'left';
    }
    const maxW = Wd - 2 * X - (q.score != null ? 2 * ringR + 24 : 0);
    text(name, X, PH + 30, font(700, 76), '#f5f5f5', maxW);
    const facts = [caught(e) && sizeTxt(e), e.released != null && tr(e.released ? 'ct_released' : 'ct_kept')].filter(Boolean).join(' · ');
    let y = PH + 100;
    if (facts) { text(facts, X, y, font(600, 44), '#f5f5f5', Wd - 2 * X); y += 64; }
    text(`${fmtT(e.t, { day: 'numeric', month: 'long', year: 'numeric' })} · ${tr('ct_area', area(e.lat, e.lon))}`, X, y, font(500, 34), '#a6a6a6', Wd - 2 * X); y += 56;
    const K = tr('ct_k'), cond = [q.wsEff != null && `${K.wind} ${q.wdir != null ? compass(q.wdir) + ' ' : ''}${Math.round(q.wsEff)} km/h`, q.wEff != null && `${K.waves} ${nf(q.wEff)} m`,
      q.sst != null && `${K.water} ${nf(q.sst)} °C`, q.illum != null && `${tr('ct_dims').moon} ${Math.round(q.illum * 100)}%`].filter(Boolean).join('  ·  ');
    if (cond) text(cond, X, y, font(500, 28), '#8e8e8e', Wd - 2 * X);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(X, Ht - 108, Wd - 2 * X, 2);
    text('Psarema', X, Ht - 50, font(700, 34), '#f5f5f5'); g.textAlign = 'right'; text(tr('ct_cardTag'), Wd - X, Ht - 50, font(500, 28), '#8e8e8e', 600); g.textAlign = 'left';
    return new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('no PNG')), 'image/png'));
  }
  const download = (blob, name) => { const a = Object.assign(document.createElement('a'), { download: name, href: URL.createObjectURL(blob) }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3e4); };
  async function shareCatch(id) { // the Android app: its share sheet (Save, chats…); a browser: the Web Share API with the file, else a download
    const e = list.find(x => x.id === id); if (!e) return;
    let blob; try { blob = await card(id); } catch (err) { console.warn(err); toast(tr('ct_shareErr')); return; }
    const name = `psarema-${e.sp}-${new Date(e.t).toISOString().slice(0, 10)}.png`, file = new File([blob], name, { type: 'image/png' });
    if (await window.PsNative?.saveFile?.(name, blob, 'image/png')) return;
    if (navigator.canShare?.({ files: [file] })) try { await navigator.share({ files: [file], title: tr('ct_shareTitle', titleOf(e)) }); return; } catch (err) { if (err?.name === 'AbortError') return; }
    download(blob, name);
  }

  /* ---------- The logbook: log, stats (bests, months, what works), your patterns, learning ---------- */
  function journal(tab) {
    view.tab = tab === 'fish' ? 'stats' : TABS.includes(tab) ? tab : 'list';
    view.fish ??= tripsOf(state.sp === 'all' ? '' : state.sp, true).length ? (state.sp === 'all' ? '' : state.sp) : '';
    draw(true);
  }
  const loggedFish = () => [...new Set(list.map(e => e.sp))].filter(id => id !== 'all' && byId(id)).sort((a, b) => fishName(byId(a)).localeCompare(fishName(byId(b)), locale()));
  function journalHtml() {
    const nc = list.filter(caught).length, ns = list.filter(seenOnly).length, nt = list.length - ns;
    const top = PsPanel.head('ct', 'fish', tr('ct_my'), list.length ? esc(tr('ct_summary', nt, nc, nt - nc) + (ns ? ' · ' + tr('ct_seenN', ns) : '')) : '') +
      `<div class="pn-acts ct-tools"><button type="button" class="btn primary" data-ct="log">${ic('plus', 'sm')}${tr('ct_log')}</button>` +
      `<button type="button" class="btn" data-ct="blanklog">${ic('minus', 'sm')}${esc(tr('ct_blankBtn'))}</button>` + // round 10: a blank trip in one tap
      (window.PsPins ? '' : `<label class="btn ghost"><input type="checkbox" data-ct-map${pref.map ? ' checked' : ''}>${tr('ct_onMap')}</label>`) + // pins have their own switch (Layers)
      `<button type="button" class="btn ghost" data-ct="export"${list.length ? '' : ' disabled'}>${ic('share', 'sm')}${tr('ct_export')}</button>` +
      `<label class="btn ghost">${tr('ct_import')}<input type="file" accept=".json,application/json" data-ct-import hidden></label>` +
      `<button type="button" class="btn ghost ct-csv" data-ct="csv"${list.length || window.PsPins?.marks?.().length ? '' : ' disabled'}>${ic('download', 'sm')}${esc(tr('a18_csv'))}</button></div>`; // round 18 A
    const priv = `<p class="pn-note">${ic('shield', 'sm')}<span>${esc(tr(window.PsCloud?.user?.() ? 'cl_cloudNote' : 'ct_private'))}</span></p>`; // signed in: the log is in the account too (js/cloud.js)
    if (!list.length) return top + `<p class="empty">${ic('fish')}<span>${esc(tr('ct_empty'))}</span></p>` + priv;
    const ids = loggedFish(), filt = view.tab === 'list' || view.tab === 'pat';
    if (view.fish && !ids.includes(view.fish)) view.fish = '';
    return top + `<div class="pn-tabs ct-tabs" role="group">${TABS.map(k => chip('tab', k, view.tab === k, tr('ct_t_' + k))).join('')}</div>` +
      (filt ? `<select class="ct-filter" data-ct-filter aria-label="${esc(tr('ct_fish'))}"><option value="">${esc(fishName(ALL_FISH))}</option>${ids.map(id =>
        `<option value="${id}"${id === view.fish ? ' selected' : ''}>${esc(fishName(byId(id)))}</option>`).join('')}</select>` : '') +
      ({ list: listTab, stats: statsTab, pat: patTab, learn: learnTab })[view.tab]() + priv;
  }
  const thumb = e => { const u = blobUrl(e, 'thumb'); return u ? `<img src="${u}" alt="" loading="lazy" decoding="async">` : PsPanel.fish(fishOf(e.sp)) || ic(!blank(e) ? 'fish' : 'minus'); };
  function listTab() { // newest first, a grid of picture tiles under a heading per month
    let m = '', out = '';
    for (const e of tripsOf(view.fish, true)) {
      const k = fmtT(e.t, { month: 'long', year: 'numeric' });
      if (k !== m) { out += (m ? '</div>' : '') + `<h3>${esc(cap(k))}</h3><div class="ct-tgrid">`; m = k; }
      out += tileHtml(e);
    }
    return out + (m ? '</div>' : '');
  }
  function tileHtml(e) { // one tile: your photo (or the fish's cut-out), what and how big over its foot, a personal best; opens the catch's page
    const got = !blank(e), u = blobUrl(e, 'thumb'), big = got && (e.kg ? `${nfx(e.kg)} kg` : e.cm ? `${nfx(e.cm)} cm` : '');
    return `<button type="button" class="ct-tile-c${got ? '' : ' blank'}${u ? ' photo' : ''}" data-ct="page" data-id="${esc(e.id)}" aria-label="${esc([titleOf(e), big, when(e.t)].filter(Boolean).join(', '))}">` +
      `<span class="ct-tpic">${u ? `<img src="${u}" alt="" loading="lazy" decoding="async">` : PsPanel.fish(fishOf(e.sp)) || ic(got ? 'fish' : 'minus')}</span>` +
      (isPB(e) ? `<span class="ct-tpb" title="${esc(tr('ct_pb'))}">${ic('trophy', 'sm')}</span>` : '') +
      `<span class="ct-tcap"><b>${esc(got && !e.seen ? fishName(fishOf(e.sp)) + (e.n > 1 ? ` ×${e.n}` : '') : titleOf(e))}</b><small>${esc(big || dm(e.t))}</small></span></button>`;
  }
  const cbar = (label, n, hi) => `<div class="ct-bar"><span class="ct-bl">${esc(label)}</span><span class="ct-track"><i style="width:${Math.round(n / hi * 100)}%"></i></span><span class="ct-bn">${esc(tr('ct_nCatch', n))}</span></div>`;
  const mon = m => fmtOf('ctm' + locale(), () => new Intl.DateTimeFormat(locale(), { month: 'short' })).format(new Date(2026, m, 15));
  function statsTab() { // the numbers, catches by month, personal bests, what works for you (your catches only: counts, not rates), then by fish
    const S = summary(), C = list.filter(caught), hi = Math.max(1, ...S.byMonth), now = numT(Date.now(), { month: 'numeric' }) - 1, peak = S.byMonth.indexOf(hi);
    const kpi = (v, k) => `<div><b>${v}</b><span class="lbl">${esc(tr('ct_kpi')[k])}</span></div>`;
    const months = `<div class="ct-months" role="img" aria-label="${esc(S.byMonth.map((n, m) => `${mon(m)} ${n}`).join(', '))}">${S.byMonth.map((n, m) =>
      `<div class="${[m === now && 'now', !n && 'zero'].filter(Boolean).join(' ')}" title="${esc(`${tr('months')[m]}: ${tr('ct_nCatch', n)}`)}"><span class="ct-mn">${m === peak && n ? n : ''}</span>` +
      `<i style="--v:${(n / hi).toFixed(3)}"></i><span class="ct-ml">${esc(mon(m).replace('.', ''))}</span></div>`).join('')}</div>`;
    const B = [...bests().values()].sort((a, b) => fishName(fishOf(a.sp)).localeCompare(fishName(fishOf(b.sp)), locale()));
    const pbs = B.length ? `<div class="pn-list">${B.map(e => `<button type="button" class="pn-item pn-line ct-item" data-ct="page" data-id="${esc(e.id)}"><span class="ct-thumb">${thumb(e)}</span>` +
      `<span class="pn-main"><b>${esc(fishName(fishOf(e.sp)))}</b><small>${esc(`${dm(e.t)} ${new Date(e.t).getFullYear()} · ${area(e.lat, e.lon)}`)}</small></span><span class="ct-big">${esc(sizeTxt(e))}</span></button>`).join('')}</div>`
      : `<p class="hint">${esc(tr('ct_noBests'))}</p>`;
    const top = (key, label) => { const m = new Map(); for (const e of C) { const k = key(e); if (k) m.set(k, (m.get(k) || 0) + 1); } const a = [...m].sort((x, y) => y[1] - x[1]).slice(0, 5); return a.map(([k, n]) => cbar(label(k), n, a[0][1])).join(''); };
    const Wk = tr('ct_wk'), sec = (t, body) => body ? `<section class="ct-sec"><h4 class="lbl">${esc(t)}</h4>${body}</section>` : '';
    const moonK = q => q?.illum == null ? null : q.illum < .25 ? 'new' : q.illum > .75 ? 'full' : 'half';
    return `<div class="ct-kpis">${kpi(S.n, 'n')}${kpi(S.species, 'species')}${kpi(S.trips, 'trips')}${kpi((S.trips ? Math.round(S.n / S.trips * 100) : 0) + '%', 'rate')}</div>` + (S.seen ? `<p class="hint">${ic('eye', 'sm')} ${esc(tr('ct_seenApart', S.seen))}</p>` : '') +
      `<h3>${esc(tr('ct_months'))}</h3>${months}<h3>${ic('trophy', 'sm')}${esc(tr('ct_bests'))}</h3>${pbs}<h3>${esc(tr('ct_works'))}</h3>` +
      (C.length ? `<div class="ct-works">${sec(Wk.bait, top(e => e.bait, gearTxt))}${sec(Wk.method, top(e => e.mode, m => tr(m)))}${sec(Wk.time, top(e => e.snap?.period, p => cap(tr(p))))}` +
        `${sec(Wk.moon, top(e => moonK(e.snap), k => cap(tr('ct_b')[k])))}</div><p class="hint">${esc(tr('ct_worksNote'))}</p>` : `<p class="hint">${esc(tr('ct_noCatch'))}</p>`) +
      `<h3>${esc(tr('ct_byFish'))}</h3>${fishTab()}`;
  }
  const spotKey = e => Math.round(e.lat / .02) + ',' + Math.round(e.lon / .02); // ~2 km squares
  function fishTab() {
    const rows = loggedFish().filter(id => tripsOf(id).length).map(id => { // a fish only seen has no row here
      const T = tripsOf(id), C = T.filter(caught), own = C.reduce((a, e) => a + e.n, 0), spots = new Map();
      for (const e of C) spots.set(spotKey(e), [...spots.get(spotKey(e)) || [], e]);
      const best = [...spots.values()].sort((a, b) => b.length - a.length)[0]?.[0];
      return `<tr><td>${esc(fishName(byId(id)))}</td><td class="n">${T.length}</td><td class="n">${own}</td><td class="n">${T.length - C.length}</td>` +
        `<td class="n">${Math.round(C.length / T.length * 100)}%</td><td>${best ? esc(describe(best.lat, best.lon)) : '–'}</td><td>${C[0] ? esc(fmtT(C[0].t, { day: 'numeric', month: 'short' })) : '–'}</td></tr>`;
    });
    const h = tr('ct_h');
    return `<div class="ct-scroll"><table class="ct-table"><thead><tr>${h.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  // Your patterns: trips with fish against blank trips under each condition. Counts as they are; a bucket is marked better or worse than
  // your average only with 3+ trips and when its rate, pulled 2 trips' worth toward your average, still differs by 15 points.
  const DIMS = [
    ['time', q => q?.period, ['dawn', 'day', 'dusk', 'night'], k => tr(k)],
    ['moon', q => q?.illum == null ? null : q.illum < .25 ? 'new' : q.illum > .75 ? 'full' : 'half', ['new', 'half', 'full']],
    ['press', q => q?.dp == null ? null : q.dp < -1 ? 'fall' : q.dp > 1 ? 'rise' : 'steady', ['fall', 'steady', 'rise']],
    ['wind', q => q?.wsEff == null ? null : q.wsEff < 10 ? 'calm' : q.wsEff < 20 ? 'light' : q.wsEff < 30 ? 'fresh' : 'strong', ['calm', 'light', 'fresh', 'strong']],
    ['waves', q => q?.wEff == null ? null : q.wEff < .3 ? 'flat' : q.wEff < .8 ? 'slight' : 'rough', ['flat', 'slight', 'rough']],
    ['sol', q => q?.score == null ? null : q.solunar || 'none', ['major', 'minor', 'none']],
  ];
  function bar(label, c, n, R) {
    const s = (c + 2 * R) / (n + 2), tag = n < 3 ? ['', 'ct_fewRow'] : s >= R + .15 ? ['up', 'ct_better'] : s <= R - .15 ? ['down', 'ct_worse'] : null;
    return `<div class="ct-bar"><span class="ct-bl">${esc(cap(label))}</span><span class="ct-track"><i style="width:${Math.round(c / n * 100)}%"></i></span>` +
      `<span class="ct-bn">${esc(tr('ct_of', c, n))}${tag ? ` <em class="${tag[0]}">${esc(tr(tag[1]))}</em>` : ''}</span></div>`;
  }
  function patTab() {
    const T = tripsOf(view.fish), nc = T.filter(caught).length, R = nc / T.length, B = tr('ct_b'), D = tr('ct_dims');
    if (!T.length) return `<p class="ct-warn">${ic('warning', 'sm')}<span>${esc(tr('ct_few', 0))}</span></p>`; // only seen fish so far
    const sec = (title, rows) => rows.length ? `<section class="ct-sec"><h3>${esc(title)}</h3>${rows.join('')}</section>` : '';
    const count = (key, ks, label) => ks.map(k => { const g = T.filter(e => key(e) === k); return g.length ? bar(label(k), g.filter(caught).length, g.length, R) : ''; }).filter(Boolean);
    const spots = new Map(); for (const e of T) spots.set(spotKey(e), [...spots.get(spotKey(e)) || [], e]);
    const top = [...spots.values()].sort((a, b) => b.length - a.length).slice(0, 6);
    return (T.length < 10 ? `<p class="ct-warn">${ic('warning', 'sm')}<span>${esc(tr('ct_few', T.length))}</span></p>` : '') +
      `<p class="hint">${esc(tr('ct_avg', Math.round(R * 100), T.length))}</p>` +
      DIMS.map(([k, f, ks, label = x => B[x]]) => sec(D[k], count(e => f(e.snap), ks, label))).join('') +
      sec(D.method, count(e => e.mode, MODES, m => tr(m))) +
      sec(D.spot, top.map(g => bar(describe(g[0].lat, g[0].lon), g.filter(caught).length, g.length, R)));
  }
  let learning = 0;
  function learnTab() { // each fish's learning pass (~30 ms on a desktop) in a task of its own: the tab opens at once and fills in
    const rows = loggedFish().map(id => {
      const T = tripsOf(id).filter(e => e.cell >= 0), c = T.filter(caught).length, b = T.length - c, st = window.PsPersonal ? PsPersonal.model(id) : learnt(id, true), on = st && pref.learn; // js/personal.js learns from the first trip
      if (st === undefined) { learning ||= setTimeout(() => { learning = 0; learnt(id); if (view.tab === 'learn') draw(); }); return `<tr><td>${esc(fishName(byId(id)))}</td><td class="n">${c}</td><td class="n">${b}</td><td>…</td></tr>`; }
      const text = !st ? tr('ct_need', Math.max(0, NEED_C - c), Math.max(0, NEED_B - b))
        : tr(on ? 'ct_changes' : 'ct_would', pct(st.lo), pct(st.hi), nf(st.km2, 0), hours.length ? Math.round(Math.max(st.hhi - 1, 1 - st.hlo) * 100) : 0);
      return `<tr class="${st ? on ? 'on' : 'ready' : ''}"><td>${esc(fishName(byId(id)))}</td><td class="n">${c}</td><td class="n">${b}</td><td>${esc(text)}</td></tr>`;
    });
    const h = tr('ct_hl');
    return `<label class="pn-check ct-switch"><input type="checkbox" data-ct-learn${pref.learn ? ' checked' : ''}><span><b>${esc(tr('ct_learn'))}</b><small>${esc(tr('ct_learnSub'))}</small></span></label>` +
      `<p>${esc(tr('ct_learnWhat'))}</p><p class="hint">${esc(tr('ct_learnHow'))}</p>` +
      (PsShare.visible() ? `<button type="button" class="btn ghost" data-ct-open="share">${ic('shield', 'sm')}${esc(tr('cs_title'))} · ${esc(tr(PsShare.on() ? 'cs_on' : 'cs_off'))}</button>` : '') + // round 15: once the owner switched sharing on
      `<div class="ct-scroll"><table class="ct-table"><thead><tr>${h.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }

  /* ---------- Export, import, delete (with undo), show on the map ---------- */
  const toData = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(b); });
  async function exportFile() { // a JSON file with the photos inline (thumbnails are made again on import), saved by the browser like any download
    try {
      const catches = await Promise.all(list.map(async e => ({ ...e, thumb: undefined, photo: e.photo ? await toData(e.photo) : null })));
      const name = `psarema-catches-${new Date().toISOString().slice(0, 10)}.json`, json = JSON.stringify({ app: 'psarema-catches', v: 2, at: Date.now(), catches });
      if (await window.PsNative?.saveFile?.(name, json, 'application/json')) return; // the Android app: written to its cache, then the share sheet (a WebView ignores downloads)
      download(new Blob([json], { type: 'application/json' }), name);
    } catch (err) { console.warn(err); toast(tr('ct_exportErr')); }
  }
  // Round 18 A: "Export my data (CSV)": every catch, blank trip, fish only seen and marked spot, with its exact position, one row each (a spot:
  // one row per fish), for the owner to hand to the bench before accounts exist. The first 13 columns are agent B's template
  // (store/data-template.csv, store/data-collection.md; scripts/catches/import.mjs reads them and ignores the rest):
  //   date YYYY-MM-DD and time HH:MM, Cyprus time; part_of_day, site, depth_m: empty (the time and place are known); lat, lon as logged
  //   (5 decimals); accuracy_m: the GPS fix's accuracy (empty for a place set by hand); fish: the app's fish id (a blank trip: the fish it
  //   was for with count 0, 'any' when it was for any fish); count; method boat | shore | spear; source 'own log (app <a random id made
  //   once on this phone>)': one phone's rows stay together, no name; permission 'testing only' (the owner may change it).
  // Then this app's own: kind catch | blank | seen | spot; id; hours (a blank's time fishing); weight_kg, length_cm, bait (gear id),
  // released; months (a spot: 1–12, ';'-separated), quality (a spot: 1–3); note. A spot has no date, time or count: it is not a trip, so
  // the importer leaves it out until it reads kind = spot. No photos, no conditions. UTF-8 with a BOM (Excel reads the Greek), CRLF, RFC 4180.
  const CSV = ['date', 'time', 'part_of_day', 'lat', 'lon', 'site', 'accuracy_m', 'fish', 'count', 'method', 'depth_m', 'source', 'permission',
    'kind', 'id', 'hours', 'weight_kg', 'length_cm', 'bait', 'released', 'months', 'quality', 'note'];
  const csvCell = v => { if (v == null) return ''; let s = String(v); if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; // a note can't run as a formula
  const exportId = () => { try { let s = localStorage.getItem('psarema-export-id'); if (!s) localStorage.setItem('psarema-export-id', s = Math.random().toString(36).slice(2, 10)); return s; } catch { return 'x'; } };
  function csvText(E = list, M = window.PsPins?.marks?.() || []) {
    const ymd = t => fmtOf('a18ymd', () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })).format(t);
    const hm = t => fmtOf('a18hm', () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })).format(t);
    const base = { source: `own log (app ${exportId()})`, permission: 'testing only' }, ll = x => +x.toFixed(5);
    const rows = E.map(e => ({ ...base, date: ymd(e.t), time: hm(e.t), lat: ll(e.lat), lon: ll(e.lon), accuracy_m: e.acc, fish: e.sp === 'all' ? 'any' : e.sp, count: e.n, method: e.mode,
      kind: seenOnly(e) ? 'seen' : caught(e) ? 'catch' : 'blank', id: e.id, hours: blank(e) ? e.hours : null, weight_kg: e.kg, length_cm: e.cm, bait: e.bait, released: e.released, note: e.note || null }));
    for (const m of M) for (const id of m.fish) rows.push({ ...base, lat: ll(m.lat), lon: ll(m.lon), fish: id, method: m.method, kind: 'spot', id: `${m.id}:${id}`, months: m.months.join(';'), quality: m.q, note: m.note || null });
    return '\ufeff' + [CSV.join(','), ...rows.map(r => CSV.map(k => csvCell(r[k])).join(','))].join('\r\n') + '\r\n';
  }
  async function exportCsv() {
    const M = window.PsPins?.marks?.() || []; if (!list.length && !M.length) { toast(tr('cs_none')); return; }
    try {
      const name = `psarema-my-data-${new Date().toISOString().slice(0, 10)}.csv`, text = csvText(list, M);
      if (await window.PsNative?.saveFile?.(name, text, 'text/csv')) return; // the Android app: its share sheet (a WebView ignores downloads)
      download(new Blob([text], { type: 'text/csv;charset=utf-8' }), name);
    } catch (err) { console.warn(err); toast(tr('ct_exportErr')); }
  }
  const num = (x, a, b) => typeof x === 'number' && x >= a && x <= b ? x : null;
  const SNAP_NUM = ['score', 'depth', 'dist', 'ws', 'wsEff', 'gust', 'wdir', 'wave', 'wEff', 'cur', 'sst', 'dp', 'cloud', 'illum', 'phase', 'local'];
  function clean(e) { // an imported entry: only known fields of the right kind; the cell is worked out again from the position
    if (!e || typeof e.id !== 'string' || !/^[\w-]{1,40}$/.test(e.id)) return null;
    const t = num(e.t, 0, Date.now() + 864e5), la = num(e.lat, 33.5, 36.5), lo = num(e.lon, 31, 35.5), n = num(e.n, 0, 999);
    if (t == null || la == null || lo == null || n == null || !(e.sp === 'all' || byId(e.sp)) || !MODES.includes(e.mode)) return null;
    const q = e.snap && typeof e.snap === 'object' ? e.snap : {}, snap = {};
    for (const k of SNAP_NUM) if (Number.isFinite(q[k])) snap[k] = q[k];
    if (['dawn', 'day', 'dusk', 'night'].includes(q.period)) snap.period = q.period;
    if (['major', 'minor', ''].includes(q.solunar)) snap.solunar = q.solunar;
    if (Array.isArray(q.rows)) snap.rows = q.rows.filter(r => Array.isArray(r) && /^f_[a-z_]+$/.test(r[0]) && Number.isFinite(r[2]) && Number.isFinite(r[3])).map(r => [r[0], String(r[1]).slice(0, 120), r[2], r[3]]);
    if (q.obs && typeof q.obs === 'object') { const o = { station: String(q.obs.station ?? '').slice(0, 60) }; for (const k of OBS_NUM) if (Number.isFinite(q.obs[k])) o[k] = q.obs[k]; snap.obs = o; }
    const m = typeof e.photo === 'string' && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(e.photo);
    const out = { id: e.id, t, sp: e.sp, mode: e.mode, lat: la, lon: lo, cell: seaCell(la, lo), n: Math.round(n), note: typeof e.note === 'string' ? e.note.slice(0, 300) : '',
      photo: m ? new Blob([b64(m[2])], { type: m[1] }) : null, snap };
    const cm = num(e.cm, .1, 500), kg = num(e.kg, .001, 1000);
    if (cm != null) out.cm = cm; if (kg != null) out.kg = kg;
    if (typeof e.bait === 'string' && /^[a-z0-9_]{1,40}$/.test(e.bait)) out.bait = e.bait;
    if (typeof e.released === 'boolean') out.released = e.released;
    if (e.seen === true && out.n > 0) out.seen = true; // round 15
    const hrs = num(e.hours, 0, 48); if (hrs != null) out.hours = hrs;
    const acc = num(e.acc, 1, 5000); if (acc != null) out.acc = acc; // round 18 A
    return out;
  }
  async function importFile(file) {
    let good;
    try { // size caps first (round 11 security): a huge or endless file must not freeze the phone; a real log with photos is a few MB to ~100 MB
      if (!(file.size <= 200 * 2 ** 20)) throw new Error('file too big');
      const d = JSON.parse(await file.text()); if (d?.app !== 'psarema-catches' || !Array.isArray(d.catches) || d.catches.length > 20000) throw new Error('not a catch log'); good = d.catches.map(clean).filter(Boolean); }
    catch (err) { console.warn(err); toast(tr('ct_badFile')); return; }
    await Promise.all(good.map(async e => { if (e.photo) { const t = await thumbOf(e.photo).catch(() => null); if (t) e.thumb = t; } }));
    try { await run('readwrite', s => { for (const e of good) s.put(e); }); } catch (err) { console.warn(err); toast(tr('ct_saveErr')); return; }
    good.forEach(e => dropUrl(e.id)); await load(); changed(true); toast(tr('ct_imported', good.length));
  }
  let undoT = 0;
  function undoToast(text, fn) { // the app's toast with an Undo button, a few seconds
    let u = $('#ct-undo');
    if (!u) { u = Object.assign(document.createElement('div'), { id: 'ct-undo', className: 'toast ct-undo', hidden: true, innerHTML: '<span></span><button type="button"></button>' }); u.setAttribute('role', 'status'); document.body.append(u); }
    const t = $('#toast'); t.hidden = true; u.style.setProperty('--m-vis', t.style.getPropertyValue('--m-vis'));
    u.firstChild.textContent = text; u.lastChild.textContent = tr('ct_undo');
    u.lastChild.onclick = () => { clearTimeout(undoT); u.hidden = true; fn(); };
    u.hidden = false; clearTimeout(undoT); undoT = setTimeout(() => { u.hidden = true; }, 6000);
  }
  async function del(id) { // at once, no question: Undo puts it back
    const e = list.find(x => x.id === id); if (!e) return;
    try { await run('readwrite', s => s.delete(id)); } catch (err) { console.warn(err); toast(tr('ct_saveErr')); return; }
    list = list.filter(x => x !== e); dropUrl(id);
    if (page?.id === id && page.el.isConnected) { page = null; if (!(navOk && PsNav.back())) PsPanel.close(); }
    changed(true);
    undoToast(tr('ct_deleted', titleOf(e)), async () => {
      try { await run('readwrite', s => s.put(e)); } catch (err) { console.warn(err); toast(tr('ct_saveErr')); return; }
      list.push(e); sortList(); changed(true);
    });
  }
  function goto(id) { // the pin (js/pins.js) or the catch's spot with its card, for its fish and method, at its hour while the forecast still covers it
    const e = list.find(x => x.id === id); if (!e) return;
    if (!pref.map) { pref.map = true; savePref(); drawLayer(); }
    if (window.PsPins?.focus) { if (navOk) PsNav.open('map'); PsPanel.close(); PsPins.focus({ kind: 'catch', id }); return; }
    if (e.cell >= 0 && F) { PsPanel.openSpot(e.cell, { fish: e.sp, mode: e.mode, h: hourOf(e.t) }); return; }
    PsPanel.close(); // on land, far from the sea: the place itself
    map.fitBounds(L.latLng(e.lat, e.lon).toBounds(1500), isPhone() ? PsMobile.pad() : { paddingTopLeft: [railOpen ? 350 : 20, 60] });
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-ct-open], [data-ct-log], [data-ct]'); if (!t || t.disabled) return;
    if (t.dataset.ctOpen != null) { t.dataset.ctOpen === 'share' ? PsShare.open() : journal(t.dataset.ctOpen); return; }
    if (t.dataset.ctLog != null) { log(+t.dataset.ctLog); return; }
    const v = t.dataset.v, f = form, id = t.dataset.id;
    switch (t.dataset.ct) {
      case 'close': if (flowOpen()) { if (f?.step === 'done') closeFlow(); else leave(); } else close(); break;
      case 'next': stepBy(1); break;
      case 'prev': stepBy(-1); break;
      case 'view': closeFlow(() => openCatch(id)); break;
      case 'step': if (f) { f.step = v; if (v === 'fish') f.likely = null; drawFlow(true, -1); } break;
      case 'hrs': if (f) { f.hours = lim((Math.round(+f.hours) || 1) + +v, 1, 24); const n = root()?.querySelector('[data-ct-f="hours"]'); if (n) n.value = f.hours; } break;
      case 'blanklog': logBlank(); break;
      case 'blank': if (f) { f.got = false; f.sp = state.sp; f.step = 'details'; drawFlow(true); } break; // round 18 A: as logBlank
      case 'pick': if (f) { f.sp = v; f.step = 'details'; drawFlow(true); window.PsNative?.haptic?.('tick'); } break;
      case 'nophoto': if (f) { URL.revokeObjectURL(f.url); Object.assign(f, { photo: null, thumb: null, url: '' }); drawFlow(); } break;
      case 'cnt': if (f) { f.count = lim((Math.round(+f.count) || 1) + +v, 1, 999); const n = root()?.querySelector('[data-ct-f="count"]'); if (n) n.value = f.count; } break;
      case 'now': if (f) { f.time = dtLocal(Date.now()); f.likely = null; const n = root()?.querySelector('[data-ct-f="time"]'); if (n) { n.max = n.value = f.time; } } break;
      case 'locate': if (f && typeof startWatch === 'function') { startWatch(); t.disabled = true; t.textContent = tr('ctf_locating'); waitFix(f); } break;
      case 'mode': if (f) {
        f.mode = v; f.likely = null; press(t, b => b === t);
        const sel = root()?.querySelector('[data-ct-f="bait"]'); if (sel) { if (v === 'spear' || CATS[f.bait]?.cat === 'spear') f.bait = ''; sel.innerHTML = baitOpts(fishOf(f.sp), v, f.bait); }
      } break;
      case 'place': if (f) { f.place = +v; f.at = null; f.likely = null; press(t, b => b === t); const p = here(); mm?.setView([p.la, p.lo], mm.getZoom()); } break;
      case 'save': save(); break;
      case 'log': log(-1); break; // the logbook's button, or Log another
      case 'tab': view.tab = v; draw(true); break;
      case 'export': exportFile(); break;
      case 'csv': exportCsv(); break;
      case 'page': openCatch(id); break;
      case 'goto': goto(id); break;
      case 'edit': edit(id); break;
      case 'share': shareCatch(id); break;
      case 'del': del(id); break;
    }
  });
  const onField = e => { const k = e.target.dataset?.ctF; if (k && form) { form[k] = e.target.value; if (k === 'time') form.likely = null; } };
  document.addEventListener('input', e => { onField(e); if (e.target.matches?.('[data-ct-q]')) filterFish(e.target.value); });
  document.addEventListener('change', e => {
    const t = e.target; onField(e);
    if (t.matches('[data-ct-photo]') && t.files[0] && form) addPhoto(t.files[0]);
    else if (t.matches('[data-ct-rel]') && form) form.released = t.checked; // touched: on released, off kept
    else if (t.matches('[data-ct-seen]') && form) { form.seen = t.checked; drawFlow(); } // round 15: the size, bait and kept/released rows go
    else if (t.matches('[data-ct-import]') && t.files[0]) importFile(t.files[0]);
    else if (t.matches('[data-ct-filter]')) { view.fish = t.value; draw(); }
    else if (t.matches('[data-ct-map]')) { pref.map = t.checked; savePref(); drawLayer(); }
    else if (t.matches('[data-ct-learn]')) { pref.learn = t.checked; savePref(); changed(true); if (!pref.learn && F) { refresh(); rankAll(); } toast(tr(pref.learn ? 'ct_learnOn' : 'ct_learnOff')); }
  });

  document.addEventListener('click', e => { if (e.target.closest('#lang [data-lang]')) setTimeout(() => { drawBadge(); if (isOpen()) draw(); drawFlow(); if (page?.el.isConnected) showPage(page.el, page.id); }); }); // after ui.js applies the language
  new MutationObserver(() => drawBadge()).observe($('#fish-current'), { childList: true }); // ui.js drawFishPanel: another fish (or the forecast's hours)
  document.addEventListener('ps:places', () => { drawBadge(); if (view.tab === 'learn' && isOpen()) draw(); }); // round 18 A: a marked spot (js/pins.js) shapes the personal map too

  document.addEventListener('ps:personal', e => { pref.learn = !!e.detail?.on; drawBadge(); if (view.tab === 'learn') draw(); }); // the map's own switch (PsPersonal.setEnabled) changed it
  load().then(() => changed(pref.learn));
  // Round 11 accounts (js/cloud.js): records from the cloud. put: [{ id, t, sp, mode, lat, lon, n, note, cm, kg, bait, released, hours, snap,
  // photo: Blob | null }] (the export format with the photo as a Blob), each checked by clean() as an import is; gone: the ids deleted on
  // another phone. Stored, then one 'ps:catches'. Rejects when the store cannot be written (the sync tries again later).
  async function merge(put = [], gone = []) {
    const good = put.map(e => { const c = clean({ ...e, photo: null }); if (c && e.photo instanceof Blob) c.photo = e.photo; return c; }).filter(Boolean);
    await Promise.all(good.map(async e => { if (e.photo) { const t = await thumbOf(e.photo).catch(() => null); if (t) e.thumb = t; } }));
    await run('readwrite', s => { for (const e of good) s.put(e); for (const id of gone) s.delete(id); });
    for (const id of [...good.map(e => e.id), ...gone]) dropUrl(id);
    if (page && gone.includes(page.id) && page.el.isConnected) { page = null; if (!(navOk && PsNav.back())) PsPanel.close(); }
    await load(); changed(true);
  }
  const open = x => x == null || x === 'fish' || TABS.includes(x) ? journal(x) : openCatch(x);
  // The log for other modules (round 10: the on-device learning layer): a plain copy of each record, newest first; the stored format is unchanged.
  //   PsCatchLog.all() → [{ id, kind: 'catch' | 'blank' | 'seen' (round 15: seen, nothing kept), species (fish id; a blank: the target, 'all' = any fish), n (fish caught, 0 = blank),
  //     lat, lon, cell (sea cell index or -1), time (ms), method ('boat' | 'shore' | 'spear'), hours (a blank's hours fishing, else null),
  //     kg, cm, bait (gear id), released (true | false | null), snap (the conditions saved with it) }]
  //   PsCatchLog.ready() → true once loaded; document fires 'ps:catches' after every change.
  window.PsCatchLog = { ready: () => ready, all: () => list.map(e => ({ id: e.id, kind: seenOnly(e) ? 'seen' : caught(e) ? 'catch' : 'blank', species: e.sp, n: e.n, lat: e.lat, lon: e.lon, cell: e.cell,
    time: e.t, method: e.mode, hours: e.hours ?? null, kg: e.kg ?? null, cm: e.cm ?? null, bait: e.bait ?? null, released: e.released ?? null, snap: e.snap || {} })) };
  return { open, log, blank: logBlank, correction, row, check, card, stats: id => id ? learnt(id) : summary(), entries: () => list, merge, seaCell, csvText }; // round 18 A: seaCell for js/personal.js, csvText for tests
})();

// Round 15 catch loop: "Share catches for science". The honest limit of the map's accuracy test (eval/README.md) is its truth: dated
// catches with a place. With the angler's explicit consent (a switch, OFF by default, revocable at any time), the catches and blank trips
// logged on this phone go into a queue here, and each leaves only in a coarse, delayed form:
//   { sid, species, n, seen, method, cell_lat, cell_lon, day, hour }
//   sid: a random id per shared entry (not the catch id); species: the fish id (a blank trip: the fish it was for, 'all' = any; n = 0);
//   seen: true when the fish was only seen or let go before landing, nothing kept (round 15: the protected rays);
//   cell_lat / cell_lon: the index of the 0.02° square (about 2.2 × 1.8 km; floor(lat / 0.02)), a FIXED grid so repeated catches from one
//   mark never average towards it, as random jitter would; day 'YYYY-MM-DD' and hour 0-23, Cyprus time; never before 7 days after the catch.
//   Never: photos, notes, sizes, weights, baits, conditions, the exact place, a name, email or profile.
// Why 0.02°: today's angler truth has a median uncertainty of 8 km (only 5 of its 76 scorable catches are within 1.5 km), so a 1.45 km
// square is among the sharpest truth the bench has, while a reef or rock mark (~100 m) stays hidden in about 4 km² of sea. Snapping
// eval/angler/catches.json to 0.01°, 0.02° or 0.05° moved no pooled angler AUC beyond its CI (scripts/catches/bench.mjs --grid, round 15).
// Nothing leaves this phone unless accounts are configured (js/auth-config.js) with share: true, the angler is signed in AND this switch is
// on (js/cloud.js share(), into scripts/catches/share.sql's insert-only table). Until the owner sets share: true, users see none of it: no
// Settings row, no Learn-tab link, no panel. The owner's way in meanwhile: open the app with ?share-debug (remembered on that device,
// ?share-debug=0 forgets it), or PsShare.open() in the console (the Android app: chrome://inspect). In that mode the panel also offers
// "Export for the test bench": the log in this form as eval/angler/FORMAT.md rows (scripts/catches/bench.mjs runs the bench on them).
//   PsShare = { live(), visible(), on(), set(on), add(id), addAll(), status(), due(), sent(ids, refused), gone(), forget(sids), cellOf(lat, lon),
//     shared(e), rows(entries), exportFile(), open() }; document fires 'ps:share' after any change.
const PsShare = window.PsShare = (() => {
  const KEY = 'psarema-share-v1', G = .02, DELAY = 7 * 864e5;
  // S: { on, exact (round 18 A), since (ms), q: { catch id: sid } queued, s: { catch id: sid } sent (kept to delete them later, also after switching off) }
  let S = { on: false, exact: false, since: 0, q: {}, s: {} };
  try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && typeof o === 'object') S = { ...S, ...o, on: o.on === true, exact: o.exact === true }; } catch {}
  let dbg = false;
  try { const q = new URLSearchParams(location.search).get('share-debug'); if (q != null) q === '0' ? localStorage.removeItem('psarema-share-debug') : localStorage.setItem('psarema-share-debug', '1'); dbg = localStorage.getItem('psarema-share-debug') === '1'; } catch {}
  const live = () => !!(window.PsCloud?.on && window.PSAREMA_AUTH?.share === true), visible = () => live() || dbg;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} document.dispatchEvent(new CustomEvent('ps:share')); };
  const sid = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => (b % 36).toString(36)).join(''); // ponytail: b % 36 is slightly uneven; it only has to be unique per angler
  const list = () => window.PsCatch?.entries?.() || [];
  const ymd = t => fmtOf('csYmd', () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })).format(t);
  const cellOf = (la, lo) => { const y = Math.floor(la / G), x = Math.floor(lo / G); return { cell_lat: y, cell_lon: x, lat: +((y + .5) * G).toFixed(5), lon: +((x + .5) * G).toFixed(5) }; };
  // The entry as it would leave the phone (the server's row), or null. Its square is the one of the sea cell it was scored at (a shore angler's
  // spot on land: the nearest sea within ~1 km), so the square always holds sea for the bench; an entry with no sea that near is not shared.
  // Round 18 A: with the angler's second switch ("Share exact positions for science", off by default, only while sharing is on) the row also
  // carries exact_lat, exact_lon (as logged, 5 decimals) and exact_acc_m (the GPS fix's accuracy), all three or none, read when the row is
  // sent: switched off meanwhile, the queue goes coarse again. None for a place set by hand (no accuracy) or one outside the row's own square
  // (a shore spot on land whose nearest sea is in the next square): scripts/catches/share.sql refuses those. Into the same insert-only
  // table, never to another user.
  function shared(e, id = S.q[e?.id] || S.s[e?.id] || '', exact = S.on && S.exact) {
    if (!e || !Number.isFinite(e.t) || !(e.cell >= 0) || !['boat', 'shore', 'spear'].includes(e.mode)) return null;
    const c = cellOf(latOf(e.cell), lonOf(e.cell)), in1 = (v, k) => Math.abs(v - (k + .5) * G) <= .01;
    const x = exact && e.acc >= 1 && e.acc <= 5000 && Number.isFinite(e.lat) && Number.isFinite(e.lon) && in1(e.lat, c.cell_lat) && in1(e.lon, c.cell_lon);
    return { sid: id, species: e.sp, n: Math.max(0, Math.round(e.n) || 0), seen: e.seen === true && e.n > 0, method: e.mode, cell_lat: c.cell_lat, cell_lon: c.cell_lon, day: ymd(e.t), hour: numT(e.t, { hour: 'numeric', hourCycle: 'h23' }) % 24,
      ...x && { exact_lat: +e.lat.toFixed(5), exact_lon: +e.lon.toFixed(5), exact_acc_m: Math.round(e.acc) } };
  }
  // eval/angler/FORMAT.md rows (the bench reads them as eval/angler/catches.json does, or through scripts/catches/bench.mjs): a blank trip is
  // a row without a species (the bench counts it as anglers' effort, the background), a catch is 'scorable'. who: the source, one per angler.
  const region = (la, lo) => lo < 32.75 ? (la > 34.95 ? 'Polis-Chrysochou' : 'Paphos') : lo < 33.25 ? 'Limassol' : lo < 33.87 ? 'Larnaca' : 'AyiaNapa-Protaras';
  function benchRow(r, who = 'psarema-app') {
    const f = r.n > 0 && byId(r.species), x = r.exact_lat != null, la = x ? r.exact_lat : +((r.cell_lat + .5) * G).toFixed(5), lo = x ? r.exact_lon : +((r.cell_lon + .5) * G).toFixed(5);
    const half = Math.hypot(G / 2 * 111320, G / 2 * 111320 * Math.cos(la * Math.PI / 180)); // the square's half-diagonal: ~1.45 km
    return { id: `app_log-${r.sid}`, species_id: f ? f.id : null, species_scientific: f ? f.scientific || null : null,
      species_raw: f ? f.name : `blank trip (for ${byId(r.species)?.name || 'any fish'})`, species_note: null, count: r.n, weight_kg: null, length_cm: null,
      // round 18 A: an exact row: the place as logged, its uncertainty the GPS fix's accuracy (10 m at least)
      place_raw: x ? 'exact position' : `0.02° square ${r.cell_lat}/${r.cell_lon}`, lat: la, lon: lo, uncertainty_m: x ? Math.max(10, r.exact_acc_m) : Math.ceil(half / 50) * 50,
      position_basis: x ? 'app catch log, exact position as logged' : 'app catch log, rounded to a 0.02° square',
      region: region(la, lo), date: r.day, date_precision: 'day', date_basis: 'stated', month: +r.day.slice(5, 7), year: +r.day.slice(0, 4),
      time: `${String(r.hour).padStart(2, '0')}:30`, method: r.method, technique: null, depth_m: null, bait_lure: null, // :30, the middle of the hour
      source_type: 'app_log', source_url: who, quote: '', confidence: 'high', flags: ['app_log', ...r.n > 0 ? r.seen ? ['seen_not_caught'] : [] : ['blank_trip']], notes: null, scorable: !!f };
  }
  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619); return (h >>> 0).toString(36); };
  const rows = (E = list()) => E.map(e => shared(e, S.q[e.id] || S.s[e.id] || 'x' + hash(e.id))).filter(Boolean).map(r => benchRow(r));
  // the queue: what is due (7 days after the catch), with its catch id; a queued catch deleted meanwhile simply never leaves
  const byCatch = () => new Map(list().map(e => [e.id, e]));
  const due = (now = Date.now()) => { if (!S.on) return []; const M = byCatch(); return Object.keys(S.q).map(id => [id, M.get(id)]).filter(([, e]) => e && e.t + DELAY <= now).map(([id, e]) => ({ id, row: shared(e) })).filter(x => x.row); };
  function sent(ids, refused) { for (const id of ids) if (S.q[id]) { if (!refused) S.s[id] = S.q[id]; delete S.q[id]; } save(); } // js/cloud.js: the server took them (or refused them for good)
  // the shared entries whose catch is no longer in the log (deleted here, or on another phone): js/cloud.js deletes them on the server too
  const gone = () => { if (!window.PsCatchLog?.ready?.()) return []; const M = byCatch(); return Object.entries(S.s).filter(([id]) => !M.has(id)).map(([, s]) => s); };
  function forget(sids = null) { for (const id in S.s) if (!sids || sids.includes(S.s[id])) delete S.s[id]; save(); } // deleted on the server
  function status() {
    const M = byCatch(), q = Object.keys(S.q).filter(id => M.has(id)), next = Math.min(...q.map(id => M.get(id).t + DELAY));
    return { on: S.on, live: live(), user: !!window.PsCloud?.user?.(), waiting: q.length, sent: Object.keys(S.s).length, next: Number.isFinite(next) ? Math.max(next, Date.now()) : 0, other: S.on ? list().filter(e => !S.q[e.id] && !S.s[e.id]).length : 0 };
  }
  function set(on) { // off: the queue is dropped (nothing more leaves); what was sent stays listed, to delete it
    S.on = !!on; if (on) S.since = Date.now(); else { S.q = {}; S.exact = false; } // round 18 A: switched on again, exact positions are asked again
    save(); toast(tr(on ? 'cs_onToast' : 'cs_offToast'));
  }
  function setExact(on) { S.exact = !!on; save(); toast(tr(on ? 'a18_exactOnToast' : 'a18_exactOffToast')); } // round 18 A
  function add(id) { if (S.on && id && !S.q[id] && !S.s[id]) { S.q[id] = sid(); save(); } } // a catch just logged on this phone
  function addAll() { if (!S.on) return 0; let n = 0; for (const e of list()) if (!S.q[e.id] && !S.s[e.id]) { S.q[e.id] = sid(); n++; } save(); return n; } // the angler's own tap

  async function exportFile() {
    const R = rows(); if (!R.length) { toast(tr('cs_none')); return; }
    const name = `psarema-bench-catches-${ymd(Date.now())}.json`, json = JSON.stringify(R, null, 1);
    try {
      if (await window.PsNative?.saveFile?.(name, json, 'application/json')) return; // the Android app: its share sheet (a WebView ignores downloads)
      const a = Object.assign(document.createElement('a'), { download: name, href: URL.createObjectURL(new Blob([json], { type: 'application/json' })) });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3e4);
    } catch (err) { console.warn(err); toast(tr('ct_exportErr')); }
  }

  /* ---------- The panel (PsPanel 'cs'): the switch, the queue, what is shared and what never is, the export ---------- */
  function html() {
    const st = status(), li = (icon, x) => `<li>${ic(icon, 'sm')}<span>${esc(x)}</span></li>`, btn = (k, icon, label, cls = '') => `<button type="button" class="btn ${cls}" data-cs="${k}">${ic(icon, 'sm')}${esc(label)}</button>`;
    const signin = st.live && !st.user && (st.on || st.sent); // sending, and deleting, need the account
    return PsPanel.head('cs', 'shield', tr('cs_title'), esc(tr('cs_sub'))) +
      `<p>${esc(tr('cs_why'))}</p>` +
      `<label class="pn-check ct-switch"><input type="checkbox" data-cs-on${st.on ? ' checked' : ''}><span><b>${esc(tr('cs_switch'))}</b><small>${esc(tr(st.on ? 'cs_onSub' : 'cs_offSub'))}</small></span></label>` +
      // round 18 A: the second, separate switch (off by default; only with sharing on): exact positions instead of the 2 km square
      `<label class="pn-check ct-switch cs-exact"><input type="checkbox" data-cs-exact${S.exact ? ' checked' : ''}${st.on ? '' : ' disabled'}><span><b>${esc(tr('a18_exact'))}</b>` +
        `<small>${esc(tr(!st.on ? 'a18_exactNeedsOn' : S.exact ? 'a18_exactOnSub' : 'a18_exactOffSub'))}</small></span></label>` +
      (st.on || st.sent ? `<ul class="cs-what cs-st">${li('clock', tr('cs_status', st.waiting, st.sent))}${st.on && st.live && st.user && st.waiting ? li('info', tr('cs_next', dm(st.next))) : ''}` +
        `${st.on ? li('info', tr('cs_scope')) : ''}${!st.live ? li('info', tr('cs_noServer')) : signin ? li('user', tr('cs_signin')) : ''}</ul>` : '') +
      (signin || st.on && st.other || st.live && st.user ? `<div class="pn-acts">${signin ? btn('signin', 'user', tr('cl_signin'), 'primary') : ''}` +
        `${st.on && st.other ? btn('all', 'plus', tr('cs_earlier', st.other)) : ''}${st.live && st.user ? btn('del', 'trash', tr('cs_del', st.sent), 'ghost') : ''}</div>` : '') +
      `<h3>${esc(tr('cs_whatT'))}</h3><ul class="cs-what">${tr('cs_what').map((x, k) => li('check', k === 2 && S.exact && st.on ? tr('a18_whatExact') : x)).join('')}</ul>` + // round 18 A: the place line follows the exact switch
      `<h3>${esc(tr('cs_neverT'))}</h3><ul class="cs-what">${li('ban', tr(S.exact && st.on ? 'a18_neverExact' : 'cs_never'))}</ul><p class="hint">${esc(tr('cs_who'))}</p>` +
      (dbg ? `<div class="cs-exp"><button type="button" class="btn ghost" data-cs="export"${list().length ? '' : ' disabled'}>${ic('share', 'sm')}${esc(tr('cs_export'))}</button><p class="hint">${esc(tr('cs_exportSub'))}</p></div>` : '');
  }
  async function delAll() { // "Delete my shared catches": from the server (js/cloud.js), then forgotten here; the log itself is untouched
    if (!confirm(tr('cs_delAsk', status().sent))) return; // also with 0 here: another phone, or before a reinstall, may have shared
    try { await window.PsCloud.shareDelete(); toast(tr('cs_deleted')); } catch (err) { console.warn(err); toast(tr('cs_delErr')); }
  }
  const open = () => PsPanel.show('cs', html(), true);
  const redraw = () => { if (PsPanel.root('cs')) PsPanel.show('cs', html()); };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-cs]'); if (!t || t.disabled) return;
    if (t.dataset.cs === 'export') exportFile();
    else if (t.dataset.cs === 'all') toast(tr('cs_added', addAll()));
    else if (t.dataset.cs === 'del') delAll();
    else if (t.dataset.cs === 'signin') window.PsAccount?.signin?.();
  });
  document.addEventListener('change', e => { if (e.target.matches?.('[data-cs-on]')) set(e.target.checked); else if (e.target.matches?.('[data-cs-exact]')) setExact(e.target.checked); });
  for (const ev of ['ps:share', 'ps:catches', 'ps:cloud']) document.addEventListener(ev, redraw);
  document.addEventListener('click', e => { if (e.target.closest('#lang [data-lang]')) setTimeout(redraw); }); // after ui.js applies the language

  // Self-check: the grid keeps no more than its square, a blank trip is background, the day and hour are Cyprus time
  console.assert((() => {
    const c = cellOf(34.70737, 33.04512), r = shared({ id: 'x', t: Date.UTC(2026, 6, 1, 4, 20), sp: 'sargos', mode: 'shore', cell: idxAt(34.6712, 33.0505), n: 2 }, 's1');
    const b = benchRow({ ...r, n: 0 }), k = benchRow(r);
    return c.cell_lat === 1735 && c.cell_lon === 1652 && c.lat === 34.71 && c.lon === 33.05 && r.cell_lat === 1733 && r.cell_lon === 1652 && r.hour === 7 && r.day === '2026-07-01'
      && b.species_id === null && !b.scorable && b.flags.includes('blank_trip') && k.scorable === !!byId('sargos') && k.uncertainty_m === 1450 && k.time === '07:30';
  })(), 'PsShare: coarse grid and bench rows');
  console.assert((() => { // round 18 A: exact places only when asked, all three columns, only with a GPS accuracy and inside the row's square
    const e = { id: 'x', t: Date.UTC(2026, 6, 1, 4, 20), sp: 'sargos', mode: 'shore', cell: idxAt(34.6712, 33.0505), n: 2, lat: 34.67123, lon: 33.05051, acc: 12 };
    const c = shared(e, 's1', false), x = shared(e, 's1', true), k = benchRow(x), hand = shared({ ...e, acc: undefined }, 's1', true), out = shared({ ...e, lat: 34.70123 }, 's1', true);
    return !('exact_lat' in c) && x.exact_lat === 34.67123 && x.exact_lon === 33.05051 && x.exact_acc_m === 12 && x.cell_lat === c.cell_lat && Math.abs(x.exact_lat - (x.cell_lat + .5) * G) <= .0101
      && k.lat === 34.67123 && k.uncertainty_m === 12 && !('exact_lat' in hand) && !('exact_lat' in out);
  })(), 'PsShare: exact places only with the switch, all or none, inside the square');
  return { live, visible, on: () => S.on, exact: () => S.on && S.exact, set, setExact, add, addAll, status, due, sent, gone, forget, cellOf, shared, rows, exportFile, open };
})();
