'use strict';
/* Psarema fishing areas (data/areas.js) on the map, and each area's own page (css/areas.css). The 3D view is js/area3d.js.
   Map: every area a quiet dashed ring with its name (zoom 8.5–13; a name that would touch a nearer one stays off), switched in Layers
   ("Fishing areas", a main layer); a tap on the name opens the area's page. The area list under When (js/conditions.js): a tap on an area's
   name opens its page too (its day cells still go to the best spot).
   Page: PsNav 'area' (arg = areaId): the fish biting best there at the map's hour (the model's own scores: model.js prepare /
   scoreCells over the area's sea cells), the best spots of the chosen fish (a tap: the spot's card on the map), the baits and lures there
   (PsAreaGear, js/area-gear.js, when it has them), then View in 3D and what is under water (round 17 G: last).
   API: PsAreas.open(id) · PsAreas.cells(id) → the area's sea cells (Int32Array) · PsAreas.grid(cells, sp, h) → Uint8Array, the score of each
   cell for fish sp at hour h · PsAreas.pick(cells, s8, gapKm, n, min) → the n best cells at least gapKm apart [{ i, s }] · PsAreas.free(). */
window.PsAreas = (() => {
  const AREAS = window.PSAREMA_AREAS || [], byA = id => AREAS.find(a => a.id === id);
  const CUBE = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 4 7.3v9.4l8 4.5 8-4.5V7.3zM4 7.3l8 4.5 8-4.5M12 11.8v9.4"/></svg>';

  /* ---------- The model over an area (no change to any score: model.js's own prepare and scoreCells) ---------- */
  const cellsC = new Map();
  function cells(id) { // the area's sea cells (250 m) within its radius
    const a = byA(id); if (!a) return new Int32Array(0);
    let c = cellsC.get(id); if (c) return c;
    const cx = (a.lon - WEST) / RES - .5, cy = (NORTH - a.lat) / RES - .5, rx = Math.ceil(a.r / KX), ry = Math.ceil(a.r / KY), out = [];
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(H - 1, Math.ceil(cy + ry)); y++)
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(W - 1, Math.ceil(cx + rx)); x++) {
        const i = y * W + x; if (depth[i] && !northMask[i] && Math.hypot((x - cx) * KX, (y - cy) * KY) <= a.r) out.push(i);
      }
    cellsC.set(id, c = Int32Array.from(out)); return c;
  }
  let buf = null, T8 = null; const buffer = () => buf ||= newBuf(); // model.js's per-cell buffers (~13 MB): only while a page or the 3D view needs them
  const free = () => { buf = T8 = null; };
  function grid(cs, sp, h) {
    const out = new Uint8Array(cs.length), s = byId(sp);
    if (!F || !s || s.banned || !(h >= 0 && h < hours.length)) return out;
    const P = prepare(s, state.mode, cs, buffer()), acc = new Uint8Array(P.n);
    scoreCells(P, h, h + 1, P.idx, 0, P.n, 0, acc); // op 0: each cell's score, as the map's (P.idx is sorted best-where first: back through T8)
    T8 ||= new Uint8Array(N);
    for (let j = 0; j < P.n; j++) T8[P.idx[j]] = acc[j];
    for (let k = 0; k < cs.length; k++) out[k] = T8[cs[k]];
    for (let j = 0; j < P.n; j++) T8[P.idx[j]] = 0;
    return out;
  }
  function pick(cs, s8, gap, n, min = 1) { // the best cells, at least gap km apart (as map.js drawTop)
    const o = []; for (let k = 0; k < cs.length; k++) if (s8[k] >= min) o.push(k);
    o.sort((p, q) => s8[q] - s8[p]);
    const out = [];
    for (const k of o) {
      const i = cs[k], x = i % W, y = i / W | 0;
      if (out.every(t => Math.hypot((t.i % W - x) * KX, ((t.i / W | 0) - y) * KY) >= gap)) out.push({ i, s: s8[k] });
      if (out.length === n) break;
    }
    return out;
  }
  // Every fish's best chance over the area at hour h (scoreCells op 2, best where-fit first, so it stops early), a slice of wall time at a
  // time (taps and the map never wait), then done([{ s, v }]) best first.
  let runId = 0;
  function rank(id, h, done) {
    const run = ++runId, cs = cells(id), list = [], acc = new Float64Array(hours.length); let k = 0;
    const step = () => {
      if (run !== runId || !F) return;
      const until = performance.now() + 12;
      while (k < SPECIES.length && performance.now() < until) {
        const s = SPECIES[k++]; if (s.banned) continue;
        const P = prepare(s, state.mode, cs, buffer()); acc[h] = 0;
        scoreCells(P, h, h + 1, P.sidx, 0, P.ns, 2, acc);
        const v = Math.round(acc[h]); if (v > 0) list.push({ s, v });
      }
      if (k < SPECIES.length) { setTimeout(step, 0); return; }
      list.sort((p, q) => q.v - p.v); done(list);
    };
    setTimeout(step, 0);
  }

  /* ---------- The page ---------- */
  // Round 11 (the owner: less text, easier for an everyday angler): how good it is now in one line, then Best now (3 fish, More for the
  // rest), Best spots (3) and Best baits (3, js/area-baits.js compact: each row folds its reasons away). Round 17 G: the lures after them,
  // then "About this area" last: View in 3D and the two folds of what is under water and how clear it is.
  Object.assign(I18N.en, { ar_bestNow: 'Best now', ar_baits: 'Best baits', ar_more: 'More', ar_less: 'Less', ar_quiet: 'Quiet here now' });
  Object.assign(I18N.el, { ar_bestNow: 'Καλύτερα τώρα', ar_baits: 'Καλύτερα δολώματα', ar_more: 'Περισσότερα', ar_less: 'Λιγότερα', ar_quiet: 'Ήσυχα εδώ τώρα' });
  const P = { id: null, h: -1, sp: null, el: null, list: null, all: false };
  const gapKm = () => state.mode === 'boat' ? 2 : 1;
  const cut = s => CUT[s.id] ? `<img src="${esc(CUT[s.id].file)}" alt="" loading="lazy" decoding="async">` : ic('fish');
  const skel = n => Array.from({ length: n }, (_, k) => `<li class="ui-row ar-sk"><span class="ui-skel" style="--i:${k};width:44px;height:28px"></span><span class="ui-row-main"><span class="ui-skel" style="--i:${k};width:55%;height:12px"></span></span></li>`).join('');
  const sec = (t, attr = '') => `<div class="ui-sec"><h3${attr}>${esc(t)}</h3></div>`;
  function pageHtml() {
    return `<div class="ar" data-ar-id="${esc(P.id)}">` + (F ? `<div class="ar-now" data-ar="now"><span class="ui-skel" style="width:44px;height:44px;border-radius:50%"></span><span class="ui-skel" style="width:60%;height:14px"></span></div>` : '') +
      (!F ? `<p class="empty loading ar-wait">${esc(tr('ar_noFc'))}</p>` : sec(tr('ar_bestNow')) + `<ol class="ui-list ar-fish" data-ar="fish">${skel(3)}</ol>` +
        sec('', ' data-ar="spotsT"') + `<ol class="ui-list ar-spots" data-ar="spots">${skel(3)}</ol>`) +
      `<div data-ar="baitsSec" hidden>${sec(tr('ar_baits'))}</div><div class="ar-baits" data-ar="baits"></div>` +
      // round 13: artificial lures (js/lures.js). Round 17 G: folded and worked out only when opened: Best baits above already ranks the top lures
      `<details class="fold ar-lufold" data-ar="luresSec" hidden><summary>${ic('chevron-right')}<span>${esc(tr('g17_arLures'))}</span></summary><div class="ar-lures" data-ar="lures"></div></details>` +
      sec(tr('g17_arAbout')) + `<button type="button" class="ar-hero" data-ar-3d><span class="ar-cube">${CUBE}</span><b>${esc(tr('ar_view3d'))}</b>${ic('chevron-right')}</button>` +
      `<div class="ap-host" data-ar="profile"></div></div>`; // round 13: under water and water quality (js/area-profile.js)
  }
  function nowLine() { // how good it is here now: the best fish's score, its rating and name; the method and hour, small
    const box = P.el?.querySelector('[data-ar="now"]'); if (!box || !P.list) return;
    const r = P.list[0], x = hours[state.h], sub = esc([tr(state.mode), x && whenT(x.t)].filter(Boolean).join(' · '));
    box.innerHTML = r ? `${ring(r.v)}<span><b>${esc(rating(r.v))} · ${esc(fishName(r.s))}</b><small>${sub}</small></span>` : `<span><b>${esc(tr('ar_quiet'))}</b><small>${sub}</small></span>`;
  }
  function fishRows() {
    const box = P.el?.querySelector('[data-ar="fish"]'); if (!box || !P.list) return;
    const top = P.list.slice(0, P.all ? 8 : 3);
    if (P.sp !== 'all' && !top.some(r => r.s.id === P.sp)) { const r = P.list.find(r => r.s.id === P.sp); if (r) top.push(r); } // the chosen fish stays in the list
    box.innerHTML = top.length ? top.map(({ s, v }) => `<li><button type="button" class="ui-row ar-f" data-ar-sp="${esc(s.id)}" aria-pressed="${s.id === P.sp}">` +
      `<span class="ui-thumb fish">${cut(s)}</span><span class="ui-row-main"><b>${esc(fishName(s))}</b></span>${ring(v)}</button></li>`).join('') +
      (P.list.length > 3 ? `<li><button type="button" class="ar-more" data-ar-all aria-expanded="${P.all}">${esc(tr(P.all ? 'ar_less' : 'ar_more'))}${ic('chevron-down', 'sm')}</button></li>` : '')
      : `<li class="ui-row"><span class="hint">${esc(tr('ar_none'))}</span></li>`;
  }
  let spotsNow = [];
  function spotRows() {
    const box = P.el?.querySelector('[data-ar="spots"]'); if (!box) return;
    const s = byId(P.sp), cs = cells(P.id);
    P.el.querySelector('[data-ar="spotsT"]').textContent = tr('ar_spots', s ? fishName(s) : '');
    spotsNow = s && !s.banned ? pick(cs, grid(cs, P.sp, state.h), gapKm(), 3) : [];
    box.innerHTML = spotsNow.length ? spotsNow.map(({ i, s }, n) => `<li><button type="button" class="ui-row ar-spot" data-ar-spot="${i}"><span class="ar-n">${n + 1}</span>` +
      `<span class="ui-row-main"><b>${esc(describe(latOf(i), lonOf(i)))}</b><small>${esc(`${depthM(i)} m · ${habText(i)}`)}</small></span>${ring(s, 'sm')}${ic('chevron-right')}</button></li>`).join('')
      : `<li class="ui-row"><span class="hint">${esc(tr(s?.banned ? 'banned' : 'ar_noSpots'))}</span></li>`;
    baits();
  }
  function baits() { // js/area-gear.js (the baits agent): the three best baits for the chosen fish there, each folding its reasons; else its gear list
    const box = P.el?.querySelector('[data-ar="baits"]'), G = window.PsAreaGear; if (!box || !G) return;
    let html = '';
    try { html = typeof G.baitsHtml === 'function' ? G.baitsHtml(P.id, { sp: P.sp, mode: state.mode, compact: true, top: 3, ...spotsNow[0] && { cell: spotsNow[0].i } }) : G.html?.(P.id, state.mode) || ''; }
    catch (e) { console.warn('Psarema area baits:', e); }
    box.innerHTML = html; P.el.querySelector('[data-ar="baitsSec"]').hidden = !html;
    const fold = P.el.querySelector('[data-ar="luresSec"]'); fold.hidden = state.mode === 'spear' || !G.luresHtml; // no lures for a speargun
    P.el.querySelector('[data-ar="lures"]').innerHTML = ''; if (fold.open) lures();
  }
  function lures() { // round 13: the lures ranked for this fish (or all fish biting here), method, month and hour, and the whole catalogue (its fold open)
    const box = P.el?.querySelector('[data-ar="lures"]'), G = window.PsAreaGear; if (!box || !G || box.firstChild) return;
    try { box.innerHTML = G.luresHtml?.(P.id, { sp: P.sp, mode: state.mode, seg: true, ...spotsNow[0] && { cell: spotsNow[0].i } }) || ''; } catch (e) { console.warn('Psarema area lures:', e); }
  }
  document.addEventListener('toggle', e => { if (e.target.dataset?.ar === 'luresSec' && e.target.open && P.el?.contains(e.target)) lures(); }, true);
  function show(el, id) {
    const a = byA(id); if (!a) { el.innerHTML = ''; return; }
    if (P.id !== id) { P.sp = null; P.all = false; } // another area: its own first choice
    Object.assign(P, { id, el, h: state.h, list: null });
    el.innerHTML = pageHtml();
    window.PsAreaProfile?.mount(el.querySelector('[data-ar="profile"]'), id);
    if (!F) { baits(); waitFc(); return; }
    rank(id, state.h, list => {
      if (P.id !== id || P.el !== el) return;
      P.list = list;
      if (!P.sp) { // the app's fish, unless it has little chance here now: then the fish biting best here
        const mine = list.find(r => r.s.id === state.sp);
        P.sp = mine?.v >= 50 || !list.length ? (byId(state.sp)?.banned ? null : state.sp) : list[0].s.id;
      }
      nowLine(); fishRows(); spotRows();
    });
  }
  let fcT = 0;
  function waitFc() { // the forecast not in yet: draw the page again once it is (while it shows)
    clearTimeout(fcT);
    fcT = setTimeout(() => { if (PsNav.current() !== 'area' || !P.el) return; if (F) show(P.el, P.id); else waitFc(); }, 1500);
  }
  function open(id) {
    const a = byA(id); if (!a) return;
    PsNav.open('area', id);
    if (!isPhone()) map.flyToBounds(L.latLng(a.lat, a.lon).toBounds(a.r * 2000), { paddingTopLeft: [($('#rail')?.offsetWidth || 0) + 20, 60], paddingBottomRight: [20, 20], duration: .6 }); // wide screens: the map beside the page shows the area
  }
  PsNav.add('area', { title: id => byA(id) ? L10(byA(id)) : '', icon: 'waves', big: false, render() {}, show,
    hide() { runId++; clearTimeout(fcT); if (!document.querySelector('.a3')) free(); } });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ar-3d], [data-ar-sp], [data-ar-spot], [data-ar-all]'); if (!b || !P.el?.contains(b)) return;
    const d = b.dataset;
    if (b.hasAttribute('data-ar-3d')) window.PsArea3D?.open(P.id, { sp: P.sp || state.sp, h: state.h }).catch(err => console.warn(err.message));
    else if (b.hasAttribute('data-ar-all')) { P.all = !P.all; fishRows(); }
    else if (d.arSp) { P.sp = d.arSp; for (const x of P.el.querySelectorAll('[data-ar-sp]')) x.setAttribute('aria-pressed', String(x === b)); spotRows(); }
    else openSpot(+d.arSpot, P.sp);
  });
  function openSpot(i, sp) { // the spot's card on the map, for the fish it was ranked for (js/catchlog.js PsPanel.openSpot switches fish and says so)
    if (window.PsPanel?.openSpot) { PsPanel.openSpot(i, { fish: sp, h: state.h }); return; }
    if (isPhone()) PsNav.open('map');
    map.setView([latOf(i), lonOf(i)], Math.max(map.getZoom(), 12)); openCell(i);
  }

  /* ---------- The map: a dashed ring and a name per area ---------- */
  const KEY = 'psarema-areas-layer', Z0 = 8.5, Z1 = 13;
  let on = true; try { on = localStorage.getItem(KEY) !== '0'; } catch {}
  map.createPane('areaLines').style.cssText = 'z-index:416;pointer-events:none'; // over the chance (410) and hot-zone lines (415), under depth lines (420)
  map.createPane('areaTags').style.zIndex = 641; // over the place names (640), under the live readings (643) and pins (645)
  const lines = L.layerGroup(), tags = L.layerGroup(), mk = [];
  function build() { // on first show. The name sits on the ring on the sea side (towards the middle of the area's sea): clear of the town names
    const svg = L.svg({ pane: 'areaLines' }); // the map draws on a canvas (preferCanvas): the rings in SVG, so css/areas.css styles them
    for (const a of AREAS) {
      L.circle([a.lat, a.lon], { radius: a.r * 1000, renderer: svg, interactive: false, className: 'ar-ring', weight: 1, fill: false }).addTo(lines);
      let x = 0, y = 0; for (const i of cells(a.id)) { x += (lonOf(i) - a.lon) * KX / RES; y += (latOf(i) - a.lat) * KY / RES; }
      const l = Math.hypot(x, y) || 1, at = [a.lat + y / l * a.r * RES / KY, a.lon + x / l * a.r * RES / KX];
      const m = L.marker(at, { icon: L.divIcon({ className: 'ar-mk', html: `<span class="ar-tag">${CUBE}<b></b></span>`, iconSize: [0, 0] }), pane: 'areaTags', keyboard: false })
        .on('click', () => open(a.id)).addTo(tags);
      m.a = a; mk.push(m);
    }
  }
  function space() { // names in the language; a name that would touch an earlier one (data/areas.js order, west to east) stays off at this zoom
    if (!map.hasLayer(tags)) return;
    // round 11: and one that would cover a best spot's pin (map.js spacePins: the three best wear a tag over them) gives way to it
    const pinB = typeof pinMarks === 'undefined' ? [] : pinMarks.filter(m => pins.hasLayer(m)).map((m, k) => { const p = map.latLngToLayerPoint(m.getLatLng()), b = k < 3 ? [-38, -52, 38, 12] : [-12, -12, 12, 12]; return [p.x + b[0], p.y + b[1], p.x + b[2], p.y + b[3]]; });
    // Round 16 X: every name written, then every width read (one layout, its width kept on the marker for the language: a zoom past Z0/Z1
    // makes new elements), then each one shown or not. Reading a width after the last one's class changed was a layout per name.
    const shown = [], els = mk.map(m => m.getElement());
    els.forEach((el, k) => { const m = mk[k]; if (el && el.dataset.l !== state.lang) { el.dataset.l = state.lang; el.setAttribute('role', 'button'); el.setAttribute('aria-label', tr('ar_openA', L10(m.a))); el.querySelector('b').textContent = L10(m.a); } });
    els.forEach((el, k) => { const m = mk[k]; if (el && m.wl !== state.lang) { const w = el.firstChild.offsetWidth; if (w) { m.w = w; m.wl = state.lang; } else m.w = 90; } }); // hidden (ar-off): measured when it next shows
    els.forEach((el, k) => {
      if (!el) return;
      const m = mk[k], w = m.w, p = map.latLngToLayerPoint(m.getLatLng());
      const ok = shown.every(q => Math.abs(q.x - p.x) > (q.w + w) / 2 + 6 || Math.abs(q.y - p.y) > 24) && pinB.every(b => b[0] > p.x + w / 2 + 2 || b[2] < p.x - w / 2 - 2 || b[1] > p.y + 12 || b[3] < p.y - 12);
      el.classList.toggle('ar-off', !ok); if (ok) shown.push({ x: p.x, y: p.y, w });
    });
  }
  function vis() {
    const z = map.getZoom(), show_ = on && z >= Z0 && z < Z1;
    if (show_ && !mk.length) build();
    for (const g of [lines, tags]) if (show_ !== map.hasLayer(g)) show_ ? g.addTo(map) : g.remove();
    if (show_) space();
  }
  function set(v) {
    on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch {}
    const box = $('#lay-areas'); if (box) box.checked = v;
    vis(); if (typeof drawLayerCounts === 'function') drawLayerCounts();
  }
  { // Layers: "Fishing areas", a main layer after Protected areas (round 17 G)
    const after = $('#lay-protected')?.closest('label');
    if (after) {
      const lab = document.createElement('label');
      lab.innerHTML = `<input type="checkbox" id="lay-areas"${on ? ' checked' : ''}><i class="sw ar-sw"></i> <span data-i18n="l_areas">${esc(tr('l_areas'))}</span> <span class="num">${AREAS.length}</span>`;
      after.after(lab);
      lab.firstChild.addEventListener('change', e => set(e.target.checked));
    }
  }
  map.on('zoomend', vis);
  $('#areas-body')?.addEventListener('click', e => { // Where to go's By area list: the name opens the area's page (before js/conditions.js's own listener)
    const b = e.target.closest('.a-name[data-area]'); if (!b || !byA(b.dataset.area)) return;
    e.stopPropagation(); open(b.dataset.area);
  }, true);
  new MutationObserver(vis).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  if (window.requestIdleCallback) requestIdleCallback(vis, { timeout: 2500 }); else setTimeout(vis, 1200); // after start-up: the first heat paint comes first

  return { open, cells, grid, pick, free, space, byId: byA };
})();
