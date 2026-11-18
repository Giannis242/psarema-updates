'use strict';
// Psarema: pins on the map, Fishbrain-style (css/pins.css): your catches (PsCatch), open fish sightings (PsRecords, else the shipped
// data/sightings.js rows, which have no photos) and your saved places (localStorage). A pin is the fish's cut-out on a dark disc in a thin
// ring: white for your catches, grey for sightings; a saved place is a flag on white.
//   PsPins.focus({ kind: 'catch'|'record'|'place', id }) → flies there and opens the pin's card (the feed and the catch log call it)
//   PsPins.places() → [{ id, name, lat, lon, t, mark }]; PsPins.marks() → your marked spots (round 18 A, below)
// Nearby pins of a kind merge into a numbered bubble: a 56 px grid anchored to the world (so a pan keeps the bubbles), a cell's neighbours
// closer than ~40 px joined once. Only the view (+25%) gets pins, on pooled markers that are hidden, not removed (Leaflet rebuilds a removed
// marker's element). A zoom in spreads a bubble's pins out of it; a zoom out glides them into their new bubble (transform/opacity only).
// Nothing here listens to the hour: pins do not change with it. A tap: phones the sheet (PsMobile.showHtml), wide screens a popup;
// "View more": the catch or sighting page (PsNav), a place's own details. Saving: a long-press (right-click) on the map, or a spot's Save tool
// (js/ui.js spotTools). Layers' main list gets their three switches (sightings show from zoom 10, where they no longer bury the coast).
Object.assign(I18N.en, { ms_measure: 'Measure from here', ms_hint: 'Tap the map to add points. ✕ on the tag ends it.', ms_end: 'Stop measuring' });
Object.assign(I18N.el, { ms_measure: 'Μέτρηση από εδώ', ms_hint: 'Πατήστε στον χάρτη για να προσθέσετε σημεία. Το ✕ στην ετικέτα τη σταματά.', ms_end: 'Τέλος μέτρησης' });
window.PsPins = (() => {
  const KEY = 'psarema-places', PREF = 'psarema-pins', G = 56, REC_Z = 10, KINDS = ['record', 'catch', 'place'], NB = [[1, 0], [0, 1], [1, 1], [-1, 1]];
  const on = { catch: true, record: false, place: true }; // sightings off until asked for: a thousand lionfish would cover the fish's heat
  try { Object.assign(on, JSON.parse(localStorage.getItem(PREF))); } catch {}
  let places = [];
  try { places = (JSON.parse(localStorage.getItem(KEY)) || []).filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon)); } catch {}
  const savePlaces = () => { try { localStorage.setItem(KEY, JSON.stringify(places)); } catch {} document.dispatchEvent(new CustomEvent('ps:places')); }; // round 11: js/cloud.js syncs them
  const ALL = { catch: [], record: [], place: [] }; // what can be pinned: { kind, k (unique key), id, sp, lat, lon, t, … }
  const item = (kind, o) => ({ ...o, kind, k: kind[0] + o.id });

  /* ---------- The three sources ---------- */
  const urls = new Map(); // catch id → object URL of its photo
  function readCatches() { // PsCatch.entries(): a function in round 8, a getter before; blank trips (n 0) are not pins
    const c = window.PsCatch, a = (typeof c?.entries === 'function' ? c.entries() : c?.entries) || [];
    ALL.catch = a.filter(e => e.n !== 0 && e.sp && e.sp !== 'all' && Number.isFinite(e.lat) && Number.isFinite(e.lon)).map(e => item('catch', { id: e.id, sp: e.sp, lat: e.lat, lon: e.lon, t: e.t, e }));
  }
  const recs = new Map(); let recB = null, recStatic = false;
  const setRecs = () => { ALL.record = []; for (const r of recs.values()) if (Number.isFinite(r.lat) && Number.isFinite(r.lon) && !inNorth(r.lat, r.lon)) ALL.record.push(item('record', r)); };
  // Only while sightings show. The shipped records (1,545, no photos) always: the live ones are the newest pages only (~100–200), far fewer.
  // Their ids are js/records.js's for the same rows, so its offline copy replaces them. ponytail: a record in both (a few iNaturalist ones) shows twice.
  function loadRecs() {
    if (!shown('record')) return;
    if (!recStatic) {
      recStatic = true;
      for (const sp in SIGHT) SIGHT[sp].forEach(([lat, lon, yr, lic, mo], n) => recs.set('st-' + sp + n, { id: 'st-' + sp + n, sp, lat, lon, t: Date.UTC(yr, Math.max(mo, 1) - 1, 15), mo, lic, src: 'static' }));
      setRecs();
    }
    const R = window.PsRecords; if (!R?.query) return;
    const b = map.getBounds().pad(.5); // live rows for the view (+50%) as it moves
    if (recB?.contains(b)) return;
    recB = b;
    Promise.resolve(R.query({ bounds: b })).then(rows => { for (const r of rows || []) if (r?.id != null) recs.set(r.id, r); setRecs(); draw(); }, e => { recB = null; console.warn('Sightings:', e); });
  }
  function areaOf(la, lo) { // the fishing area around (data/areas.js), else the nearest town: a lang-free key for a place's default name
    const a = window.PsAreaGear?.areaAt?.(la, lo); if (a) return a;
    let b = PLACES[0], bd = Infinity;
    for (const p of PLACES) { const d = km([p[2], p[3]], [la, lo]).d; if (d < bd) { bd = d; b = p; } }
    return b[0];
  }
  const areaName = k => { const p = PLACES.find(q => q[0] === k); return p ? (state.lang === 'el' ? p[1] : p[0]) : window.PsAreaGear?.name?.(k) || k; };
  const isMark = p => !!p?.fish?.length; // round 18 A: a marked spot is a saved place with fish, months, method, how good (1–3) and a note
  const fishList = ids => ids.map(id => byId(id)).filter(Boolean).map(fishName);
  const placeName = p => p.name || (isMark(p) ? fishList(p.fish).slice(0, 2).join(', ') + (p.fish.length > 2 ? ` +${p.fish.length - 2}` : '') : `${areaName(p.a)} ${p.n || 1}`);
  const setPlaces = () => { ALL.place = places.map(p => item('place', { ...p, sp: p.fish?.[0] })); }; // a mark's pin: its first fish

  /* ---------- Clustering and the pooled markers ---------- */
  const shown = (kind, z = map.getZoom()) => on[kind] && (kind !== 'record' || z >= REC_Z);
  const live = new Map(), pool = []; // live: cluster key → its marker { mk, el, pp, av, n, c }
  let lastZ = null, selK = null;
  const shift = (a, b) => { const p = map.latLngToLayerPoint(a).subtract(map.latLngToLayerPoint(b)); return `translate(${p.x}px,${p.y}px)`; };
  function take() {
    const v = pool.pop(); if (v) { v.el.classList.remove('pp-off'); return v; }
    const pp = document.createElement('div'), w = { pp, sig: '', pic: null };
    pp.className = 'pp'; pp.innerHTML = '<span class="pp-av"></span><b class="pp-n"></b>'; w.av = pp.firstChild; w.n = pp.lastChild;
    w.mk = L.marker([0, 0], { icon: L.divIcon({ className: 'pp-mk', html: pp, iconSize: [44, 44] }), pane: 'pins', keyboard: false }).on('click', () => tap(w)).addTo(map);
    w.el = w.mk.getElement(); w.el.setAttribute('role', 'button');
    return w;
  }
  function leave(v, to) { // glide into the new bubble (zoom out) or shrink away, then back to the pool
    const s = v.pp.style;
    s.transform = to ? shift(to, v.c.ll) : 'scale(.5)'; s.opacity = 0; v.el.style.pointerEvents = 'none';
    setTimeout(() => {
      v.el.classList.add('pp-off'); s.transform = s.opacity = v.el.style.pointerEvents = ''; v.c = null;
      if (pool.length < 150) pool.push(v); else map.removeLayer(v.mk);
    }, 230);
  }
  const topSp = m => { const n = {}; let b = null; for (const it of m) if (it.sp && (n[it.sp] = (n[it.sp] || 0) + 1) > (n[b] || 0)) b = it.sp; return b; };
  function fill(v) {
    // the picture: the fish's cut-out; a sighting of a fish the app does not know: its photo (live records), else a fish outline
    const c = v.c, n = c.m.length, sp = n > 1 ? topSp(c.m) : c.m[0].sp, sig = c.kind + n;
    const pic = c.kind === 'place' ? CUT[sp]?.file || 'flag' : CUT[sp] ? CUT[sp].file : c.kind === 'record' ? (n > 1 ? c.m.find(it => it.thumb)?.thumb : c.m[0].thumb) || '' : ''; // a marked spot: its fish on the place's white disc
    if (v.pic !== pic) {
      v.pic = pic; v.pp.classList.toggle('ph', !!pic && !CUT[sp] && pic !== 'flag');
      v.av.innerHTML = pic === 'flag' ? ic('flag') : pic ? `<img src="${esc(pic)}" alt="" decoding="async" draggable="false">` : ic('fish');
    }
    if (v.sig !== sig) {
      v.sig = sig; v.pp.className = `pp ${c.kind}${n > 1 ? ' many' : ''}${n >= 10 ? ' big' : ''}${v.pp.classList.contains('ph') ? ' ph' : ''}`; v.n.textContent = n > 1 ? (n > 999 ? '999+' : n) : '';
      v.mk.setZIndexOffset(c.kind === 'place' ? 2000 : c.kind === 'catch' ? 1000 : 0);
    }
    v.el.setAttribute('aria-label', n > 1 ? tr('pp_nHere', n, c.kind) : titleOf(c.m[0]));
    v.el.classList.toggle('sel', c.key === '1' + selK);
  }
  function merge(cells, pre) { // a grid line can split a pair a few px apart: join a cell's neighbours closer than 0.7 cell (one pass)
    for (const c of cells.values()) {
      if (c.dead) continue;
      for (const [dx, dy] of NB) {
        const o = cells.get(pre + (c.cx + dx) + ',' + (c.cy + dy));
        if (!o || o.dead || Math.hypot(c.x / c.m.length - o.x / o.m.length, c.y / c.m.length - o.y / o.m.length) > G * .7) continue;
        c.m = c.m.concat(o.m); c.x += o.x; c.y += o.y; o.dead = true;
      }
    }
  }
  function draw() {
    if (!map._loaded) return;
    readCatches();
    const z = map.getZoom(), spread = lastZ != null && z > lastZ, glide = lastZ != null && z < lastZ, b = map.getBounds().pad(.25);
    const bs = b.getSouth(), bn = b.getNorth(), bw = b.getWest(), be = b.getEast(), next = new Map(), was = new Map(), now = new Map(), enter = [];
    if (spread) for (const v of live.values()) for (const it of v.c.m) was.set(it.k, v.c.ll);
    lastZ = z;
    for (const kind of KINDS) {
      if (!shown(kind, z)) continue;
      const cells = new Map(), pre = kind + '@' + z + ':';
      for (const it of ALL[kind]) {
        if (it.lat < bs || it.lat > bn || it.lon < bw || it.lon > be) continue;
        const p = map.project([it.lat, it.lon], z), cx = Math.floor(p.x / G), cy = Math.floor(p.y / G), key = kind === 'place' ? it.k : pre + cx + ',' + cy;
        let c = cells.get(key); if (!c) cells.set(key, c = { kind, key, cx, cy, m: [], x: 0, y: 0 });
        c.m.push(it); c.x += p.x; c.y += p.y;
      }
      if (kind !== 'place') merge(cells, pre);
      for (const c of cells.values()) {
        if (c.dead) continue;
        if (c.m.length === 1) c.key = '1' + c.m[0].k; // a lone pin keeps its marker from zoom to zoom
        c.ll = map.unproject([c.x / c.m.length, c.y / c.m.length], z); next.set(c.key, c);
        if (glide) for (const it of c.m) now.set(it.k, c.ll);
      }
    }
    for (const [key, c] of next) {
      let v = live.get(key);
      if (!v) { live.set(key, v = take()); v.mk.setLatLng(c.ll); const f = was.get(c.m[0].k); enter.push([v, f && !f.equals(c.ll) ? f : null]); }
      else if (!v.c.ll.equals(c.ll)) v.mk.setLatLng(c.ll);
      v.c = c; fill(v);
    }
    for (const [key, v] of live) if (!next.has(key)) { live.delete(key); leave(v, now.get(v.c.m[0].k)); }
    if (enter.length) { // out of the old bubble (zoom in) or grown in place; one style flush for all of them
      for (const [v, f] of enter) { const s = v.pp.style; s.transition = 'none'; s.transform = f ? shift(f, v.c.ll) : 'scale(.5)'; s.opacity = f ? '' : 0; }
      void map.getPane('pins').offsetWidth;
      for (const [v] of enter) { const s = v.pp.style; s.transition = s.transform = s.opacity = ''; }
    }
    counts();
  }
  function tap(v) { // a pin: its card; a bubble: zoom in until it spreads, or a list when its pins share a spot
    const c = v.c; if (!c) return;
    if (c.m.length === 1) return open(c.m[0]);
    const bb = L.latLngBounds(c.m.map(it => [it.lat, it.lon])), zMax = map.getMaxZoom(), z = map.getZoom();
    if (z >= zMax || map.project(bb.getNorthEast(), zMax).distanceTo(map.project(bb.getSouthWest(), zMax)) < G * .7) return show(listHtml(c), c.ll, () => listHtml(c));
    map.setView(bb.getCenter(), Math.min(zMax, Math.max(z + 1, map.getBoundsZoom(bb, false, L.point(90, 90)))));
  }

  /* ---------- Cards ---------- */
  const lic = l => !l ? '' : /^cc[-_ ]?0/i.test(l) ? 'CC0' : /^(pd|public)/i.test(l) ? tr('pp_pd') : 'CC ' + String(l).replace(/^cc[-_ ]?/i, '').toUpperCase();
  const dateOf = it => it.src === 'static' ? fmtT(it.t, it.mo === 0 ? { year: 'numeric' } : { month: 'short', year: 'numeric' }) : fmtT(it.t, { day: 'numeric', month: 'short', year: 'numeric' });
  const far = it => state.loc ? tr('pp_away', fmtKm(km(state.loc, [it.lat, it.lon]).d)) : '';
  const titleOf = it => it.kind === 'place' ? placeName(it) : byId(it.sp) ? fishName(byId(it.sp)) : it.name || it.sci || tr('pp_k').record;
  const cut = sp => CUT[sp] ? `<img class="cut" src="${esc(CUT[sp].file)}" alt="" loading="lazy" decoding="async">` : '';
  function photoOf(it) {
    if (it.kind === 'record') return it.thumb || it.photo || '';
    const p = it.kind === 'catch' && (it.e.thumb || it.e.photo); if (!(p instanceof Blob)) return '';
    let u = urls.get(it.id); if (!u) urls.set(it.id, u = URL.createObjectURL(p)); return u;
  }
  const navHref = it => window.PsNative?.isNative ? `geo:${it.lat},${it.lon}?q=${it.lat},${it.lon}(${encodeURIComponent(placeName(it))})` : mapsLink(it.lat, it.lon);
  const navAttrs = () => window.PsNative?.isNative ? '' : ' target="_blank" rel="noopener"';
  const page = id => window.PsNav && (!PsNav.pages || PsNav.pages[id]); // pages register as their modules load
  const recPage = it => window.PsRecords && page('sighting') && (!String(it.id).startsWith('st-') || PsRecords.get?.(it.id)); // a shipped row: only once records.js has it
  const hasMore = it => it.kind === 'place' || (it.kind === 'catch' ? page('catch') || window.PsCatch?.open : recPage(it) || it.sp && page('species'));
  function head(it, ph) {
    const k = it.kind, m = isMark(it);
    const sub = m ? markTxt(it) : k === 'place' ? tr('pp_savedOn', dateOf(it)) : `${dateOf(it)} · ${k === 'catch' ? tr('pp_you') : it.by || tr('pp_open')}`;
    return `<div class="pp-top"><span class="pp-th${k === 'place' ? ' flag' : ''}">${k === 'place' ? cut(it.sp) || ic('flag') : ph ? `<img src="${esc(ph)}" alt="">` : cut(it.sp) || ic('fish')}</span>` +
      `<div class="pp-ttl"><span class="lbl">${esc(m ? tr('a18_mySpot') : tr('pp_k')[k])}</span><b>${esc(titleOf(it))}</b><small>${esc(sub)}</small></div></div>`;
  }
  // a mark in words: its months (a season's name when they are one), the method, how good; its note under the card's title
  const SEASONS = { all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11], winter: [12, 1, 2] };
  const monShort = m => fmtT(Date.UTC(2026, m - 1, 15), { month: 'short', timeZone: 'UTC' }).replace('.', '');
  function monthsTxt(ms) { // all year; whole seasons by name ("Summer, Autumn"); else the months, or how many
    const S = tr('a18_seasons'); if (ms.length === 12) return S.all;
    const k = ['spring', 'summer', 'autumn', 'winter'].filter(s => SEASONS[s].every(m => ms.includes(m)));
    return k.length * 3 === ms.length ? k.map(s => S[s]).join(', ') : ms.length > 4 ? `${ms.length} ${tr('a18_months')}` : ms.map(monShort).join(', ');
  }
  const markTxt = p => [monthsTxt(p.months), tr(p.method), tr('a18_q')[p.q - 1]].join(' · ');
  function cardHtml(it) {
    const e = it.e || {}, key = esc(it.kind + ':' + it.id);
    const meta = [it.kind === 'catch' && [e.n > 1 && '×' + e.n, e.kg && nf(e.kg, 1) + ' kg', e.cm && Math.round(e.cm) + ' cm'].filter(Boolean).join(' · '),
      it.kind === 'record' && lic(it.lic), isMark(it) && it.name && fishList(it.fish).join(', '), far(it)].filter(Boolean).join(' · ');
    const route = it.kind === 'place' ? `<a class="btn" href="${esc(navHref(it))}"${navAttrs()} title="${esc(tr('directions'))}" aria-label="${esc(tr('directions'))}">${ic('route', 'sm')}</a>` : '';
    const more = hasMore(it) ? `<button class="btn primary" data-pp-more="${key}">${esc(tr('viewMore'))}${ic('chevron-right', 'sm')}</button>` : '';
    return `<div class="pp-card" data-pp="${key}">${head(it, photoOf(it))}${meta ? `<p class="pp-meta">${esc(meta)}</p>` : ''}${noteOf(it)}${more || route ? `<div class="pp-acts">${more}${route}</div>` : ''}</div>`;
  }
  const noteOf = it => isMark(it) && it.note ? `<p class="pp-meta pp-note">${esc(it.note)}</p>` : '';
  function placeHtml(it) { // a place's details: rename, where (copy), navigate there, the fishing chance there, mark it as a fishing spot (or edit the mark), delete
    const i = idxAt(it.lat, it.lon), g = gps(it.lat, it.lon), key = esc('place:' + it.id), meta = [isMark(it) && it.name && fishList(it.fish).join(', '), far(it)].filter(Boolean).join(' · ');
    return `<div class="pp-card pp-det" data-pp="${key}">${head(it)}${meta ? `<p class="pp-meta">${esc(meta)}</p>` : ''}${noteOf(it)}` +
      `<label class="pp-field"><span class="lbl">${esc(tr('pp_name'))}</span><input type="text" maxlength="60" data-pp-name="${esc(it.id)}" value="${esc(it.name)}" placeholder="${esc(placeName({ ...it, name: '' }))}" enterkeyhint="done"></label>` +
      `<div class="gps-row"><span class="gps selectable">${g}</span><button class="btn" data-copy="${g}">${ic('copy', 'sm')}${esc(tr('copy'))}</button>` +
      `<a class="btn" href="${esc(navHref(it))}"${navAttrs()}>${ic('route', 'sm')}${esc(tr('pp_nav'))}</a></div>` +
      `<div class="pp-acts">${i >= 0 && depth[i] && !northMask[i] && typeof openCell === 'function' ? `<button class="btn" data-pp-chance="${i}">${ic('fish', 'sm')}${esc(tr('pp_chance'))}</button>` : ''}` +
      `<button class="btn" data-pp-medit="${esc(it.id)}">${ic(isMark(it) ? 'edit' : 'star', 'sm')}${esc(tr(isMark(it) ? 'a18_edit' : 'a18_markIt'))}</button>` +
      `<button class="btn pp-del" data-pp-del="${esc(it.id)}">${ic('trash', 'sm')}<span>${esc(tr('pp_del'))}</span></button></div></div>`;
  }
  function listHtml(c) { // a bubble whose pins share one spot (snapped records, a favourite rock): newest first
    const m = [...c.m].sort((a, b) => b.t - a.t), max = 60;
    return `<div class="pp-card pp-list"><div class="pp-ttl"><span class="lbl">${esc(tr('pp_k')[c.kind])}</span><b>${esc(tr('pp_nHere', m.length, c.kind))}</b></div><div class="pp-rows">` +
      m.slice(0, max).map(it => `<button class="pp-row" data-pp-open="${esc(it.kind + ':' + it.id)}"><span class="pp-th sm">${it.kind === 'place' ? ic('flag') : cut(it.sp) || (it.thumb ? `<img src="${esc(it.thumb)}" alt="" loading="lazy" decoding="async">` : ic('fish'))}</span>` +
        `<span class="pp-ttl"><b>${esc(titleOf(it))}</b><small>${esc(dateOf(it))}${it.kind === 'record' && it.by ? ' · ' + esc(it.by) : ''}</small></span>${ic('chevron-right', 'sm')}</button>`).join('') +
      (m.length > max ? `<p class="hint">+${m.length - max}</p>` : '') + '</div></div>';
  }
  let pop = null, redraw = null; // redraw: the card on show, again (a language switch)
  function show(html, ll, again) {
    redraw = again;
    if (isPhone() && window.PsMobile) {
      map.closePopup(); PsMobile.showHtml(html);
      requestAnimationFrame(() => { // keep the pin in the map left above the sheet
        const s = map.getSize(), p = map.latLngToContainerPoint(ll);
        if (p.y > s.y * .42 || p.y < 90 || p.x < 30 || p.x > s.x - 30) map.panBy([p.x - s.x / 2, p.y - s.y * .3]);
      });
      return;
    }
    pop ||= L.popup({ className: 'pp-pop', offset: [0, -14], maxWidth: 300, minWidth: 270, autoPanPaddingBottomRight: [60, 20] }).on('remove', () => { if (selK) { selK = null; mark(); } });
    pop.options.autoPanPaddingTopLeft = [typeof railOpen !== 'undefined' && railOpen ? 350 : 20, 90]; // clear of the side rail, as ui.js's spot card
    pop.setLatLng(ll).setContent(html).openOn(map);
  }
  const mark = () => { for (const v of live.values()) v.el.classList.toggle('sel', v.c.key === '1' + selK); };
  function open(it, det) {
    selK = it.k; mark();
    const again = () => { const x = find(it.kind, it.id) || it; return det ? placeHtml(x) : cardHtml(x); };
    show(again(), [it.lat, it.lon], again);
  }
  function find(kind, id) {
    if (kind === 'catch') readCatches();
    return ALL[kind]?.find(it => String(it.id) === String(id)) || null;
  }
  const byKey = s => { const n = s.indexOf(':'); return find(s.slice(0, n), s.slice(n + 1)); };
  function more(it) {
    if (!it) return;
    const go = (id, arg) => { map.closePopup(); PsNav.open(id, arg); };
    if (it.kind === 'place') open(it, true);
    else if (it.kind === 'catch') page('catch') ? go('catch', it.id) : PsCatch.open();
    else if (recPage(it)) go('sighting', it.id);
    else go('species', it.sp);
  }

  /* ---------- Saved places ---------- */
  function add(lat, lon, extra, quiet) { // extra: a mark's fields (round 18 A); quiet: the caller draws and says it
    const a = areaOf(lat, lon), p = { id: 'p' + Date.now().toString(36), name: '', lat: +lat.toFixed(5), lon: +lon.toFixed(5), t: Date.now(), a,
      n: 1 + places.reduce((m, q) => q.a === a ? Math.max(m, q.n || 1) : m, 0), ...extra };
    places.push(p); savePlaces(); setPlaces();
    if (quiet) return p;
    if (!on.place) set('place', true); else draw();
    toast(tr('pp_saved', placeName(p))); window.PsNative?.haptic?.('success');
    return p;
  }
  function del(id, b) { // two taps: the first arms the button for 3 s
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.classList.add('armed'); b.lastChild.textContent = tr('pp_delSure'); setTimeout(() => { delete b.dataset.armed; b.classList.remove('armed'); b.lastChild.textContent = tr('pp_del'); }, 3000); return; }
    places = places.filter(p => p.id !== id); savePlaces(); setPlaces(); draw();
    map.closePopup(); if (isPhone() && $('#m-spot .pp-card')) PsMobile.closeSpot();
    toast(tr('pp_deleted'));
  }
  /* ---------- Round 18 A: marking a spot that produces fish (the long-press menu, the spot's details, a saved place's details) ---------- */
  // The form is the pin card's sheet (phones) or popup: fish (several), months (season chips, then each month), method, how good 1–3, a
  // note. Saved as a place with those fields (cloud-synced as places are); js/personal.js reads PsPins.marks() for the personal layer.
  const MODES = ['boat', 'shore', 'spear'];
  function cleanMark(o) { // a mark's own fields, checked (the form, the cloud): fish the app knows, months 1–12, a method, how good, a note
    const fish = [...new Set(Array.isArray(o?.fish) ? o.fish : [])].filter(id => typeof id === 'string' && id !== 'all' && byId(id)).slice(0, 12);
    if (!fish.length) return null;
    const months = [...new Set(Array.isArray(o.months) ? o.months : [])].filter(m => Number.isInteger(m) && m >= 1 && m <= 12).sort((a, b) => a - b);
    return { fish, months: months.length ? months : SEASONS.all, method: MODES.includes(o.method) ? o.method : 'shore', q: [1, 2, 3].includes(o.q) ? o.q : 2,
      note: typeof o.note === 'string' ? o.note.trim().slice(0, 300) : '' };
  }
  let mf = null; // the open form: { id (editing), lat, lon, fish, months, method, q, note, opts (the fish offered as chips) }
  function markForm(lat, lon, p) {
    const i = idxAt(lat, lon), sea = window.PsCatch?.seaCell?.(lat, lon) ?? i, cur = state.sp !== 'all' && byId(state.sp) ? [state.sp] : [];
    const likely = sea >= 0 && typeof likelyAt === 'function' ? likelyAt(sea, p?.method || state.mode, 6).map(f => f.id) : [];
    mf = p ? { id: p.id, lat: p.lat, lon: p.lon, fish: [...p.fish || cur], months: [...p.months || SEASONS.all], method: p.method || state.mode, q: p.q || 2, note: p.note || '' }
      : { lat: +lat.toFixed(5), lon: +lon.toFixed(5), fish: cur, months: [...SEASONS.all], method: state.mode, q: 2, note: '' };
    mf.opts = [...new Set([...mf.fish, ...cur, ...likely])];
    selK = null; mark(); show(formHtml(), [mf.lat, mf.lon], formHtml);
  }
  const isOn = (k, v) => k === 'fish' ? mf.fish.includes(v) : k === 'month' ? mf.months.includes(+v) : k === 'method' ? mf.method === v : k === 'q' ? mf.q === +v
    : v === 'all' ? mf.months.length === 12 : mf.months.length < 12 && SEASONS[v].every(m => mf.months.includes(m)); // a season: all its months, not all year
  const pressed = a => `data-pp-mf="${a}" aria-pressed="${isOn(...a.split(':'))}"`;
  const fishChips = () => mf.opts.map(id => `<button type="button" ${pressed('fish:' + id)}>${cut(id)}${esc(fishName(byId(id)))}</button>`).join('');
  function formHtml() {
    const f = mf, where = typeof describe === 'function' ? describe(f.lat, f.lon) : gps(f.lat, f.lon), S = tr('a18_seasons'), lbl = k => `<span class="lbl">${esc(tr(k))}</span>`;
    const rest = SPECIES.filter(s => !f.opts.includes(s.id)).sort((a, b) => fishName(a).localeCompare(fishName(b), locale()));
    return `<div class="pp-card pp-det pp-mf"><div class="pp-top"><span class="pp-th flag">${ic('star')}</span><div class="pp-ttl"><span class="lbl">${esc(tr('a18_mySpot'))}</span>` +
      `<b>${esc(tr(f.id ? 'a18_editT' : 'a18_markT'))}</b><small>${esc(where)}</small></div></div>` +
      `<div class="pp-fld">${lbl('a18_fish')}<div class="chips pp-fish">${fishChips()}</div>` +
      `<select class="ui-input pp-add" data-pp-mf-add aria-label="${esc(tr('a18_addFish'))}"><option value="">${esc(tr('a18_addFish'))}</option>${rest.map(s => `<option value="${s.id}">${esc(fishName(s))}</option>`).join('')}</select></div>` +
      `<div class="pp-fld">${lbl('a18_season')}<div class="chips">${Object.keys(SEASONS).map(k => `<button type="button" ${pressed('season:' + k)}>${esc(S[k])}</button>`).join('')}</div>` +
      `<div class="pp-months">${SEASONS.all.map(m => `<button type="button" ${pressed('month:' + m)}>${esc(monShort(m))}</button>`).join('')}</div></div>` +
      `<div class="pp-fld">${lbl('ct_method')}<div class="seg">${MODES.map(m => `<button type="button" ${pressed('method:' + m)}>${ic(m)}<span>${esc(tr(m))}</span></button>`).join('')}</div></div>` +
      `<div class="pp-fld">${lbl('a18_how')}<div class="seg">${[1, 2, 3].map(q => `<button type="button" ${pressed('q:' + q)}><span class="pp-dots">${'●'.repeat(q)}${'○'.repeat(3 - q)}</span><span>${esc(tr('a18_q')[q - 1])}</span></button>`).join('')}</div></div>` +
      `<label class="pp-field">${lbl('ct_noteP')}<textarea class="ui-input" rows="2" maxlength="300" data-pp-mf-note>${esc(f.note)}</textarea></label>` +
      `<div class="pp-acts"><button type="button" class="btn primary" data-pp-mf="save">${ic('check', 'sm')}${esc(tr('a18_save'))}</button></div></div>`;
  }
  function syncForm(r) { // the chips' pressed state from mf, in place (no redraw: the sheet keeps its scroll)
    for (const b of r.querySelectorAll('[data-pp-mf*=":"]')) b.setAttribute('aria-pressed', isOn(...b.dataset.ppMf.split(':')));
  }
  function formTap(b) {
    const [k, v] = b.dataset.ppMf.split(':'), f = mf, r = b.closest('.pp-mf'); if (!f) return;
    if (k === 'save') return saveMark();
    if (k === 'fish') f.fish = f.fish.includes(v) ? f.fish.filter(x => x !== v) : [...f.fish, v];
    else if (k === 'month') f.months = f.months.includes(+v) ? f.months.filter(m => m !== +v) : [...f.months, +v].sort((a, b) => a - b);
    else if (k === 'season') { const S = SEASONS[v], all = f.months.length === 12, has = S.every(m => f.months.includes(m));
      f.months = v === 'all' || all ? [...S] : has ? f.months.filter(m => !S.includes(m)) : [...new Set([...f.months, ...S])].sort((a, b) => a - b); }
    else if (k === 'method') f.method = v;
    else if (k === 'q') f.q = +v;
    window.PsNative?.haptic?.('tick'); syncForm(r);
  }
  function saveMark() {
    const f = mf, m = cleanMark(f);
    if (!m) { toast(tr('a18_needFish')); return; }
    if (!f.months.length) { toast(tr('a18_needMonth')); return; }
    let p = f.id && places.find(q => q.id === f.id);
    if (p) { Object.assign(p, m); savePlaces(); setPlaces(); } else p = add(f.lat, f.lon, m, true);
    if (!on.place) set('place', true); else draw();
    mf = null; toast(tr('a18_saved', placeName(p))); window.PsNative?.haptic?.('success');
    const it = find('place', p.id); if (it) open(it);
  }
  const marks = () => places.filter(isMark).map(p => ({ id: p.id, name: placeName(p), lat: p.lat, lon: p.lon, t: p.t, fish: p.fish, months: p.months, method: p.method, q: p.q, note: p.note || '' }));

  // round 17 G: one Sightings switch: these pins (every fish, from zoom 10) and the chosen fish's record dots at every zoom (js/map.js
  // drawSightings, state.layers.sightings) were two layers of the same open records; this switch drives both
  const syncDots = () => { if (typeof applyLayer !== 'function' || !state.layers) return; state.layers.sightings = on.record; applyLayer('sightings'); };
  function set(kind, val) {
    on[kind] = val; try { localStorage.setItem(PREF, JSON.stringify(on)); } catch {}
    const box = $('#lay-pp-' + kind); if (box) box.checked = val;
    if (kind === 'record') { loadRecs(); syncDots(); }
    draw(); if (typeof drawLayerCounts === 'function') drawLayerCounts();
  }

  /* ---------- The Layers popover's "Pins" group (after Fishing, as index.html's groups) ---------- */
  function counts() {
    for (const k of KINDS) {
      const el = $('#n-pp-' + k), t = k === 'record' && map.getZoom() < REC_Z ? tr('pp_zoomIn') : k === 'record' && !ALL.record.length ? '' : String(ALL[k].length);
      if (el && el.textContent !== t) el.textContent = t;
    }
  }
  {
    syncDots();
    const g = $('#lp-main'), sw = { catch: 'pp-sw', record: 'pp-sw rec', place: 'pp-sw flag' }; // round 17 G: main layers (index.html), saved places first
    if (g) {
      g.insertAdjacentHTML('beforeend', ['place', 'catch', 'record'].map(k => `<label><input type="checkbox" id="lay-pp-${k}"${on[k] ? ' checked' : ''}><i class="sw ${sw[k]}"></i> <span data-i18n="pp_l_${k}">${esc(tr('pp_l_' + k))}</span> <span class="num" id="n-pp-${k}"></span></label>`).join(''));
      g.addEventListener('change', e => { const k = e.target.id?.slice(7); if (KINDS.includes(k)) set(k, e.target.checked); });
    }
  }

  /* ---------- Events ---------- */
  map.createPane('pins').style.zIndex = 645; // over the place names (640), under the north's mask (650) and popups
  setPlaces();
  map.on('moveend', () => { loadRecs(); draw(); });
  map.on('click', () => { if (selK) { selK = null; mark(); } });
  // A long-press (a right-click on a computer): "Save place here". Android's own long-press sends contextmenu, but not every WebView or
  // emulator does, so a held touch (550 ms, < 8 px) opens it too, once; the click its release may send then must not open the sea's card.
  let lp = 0, lpAt = 0, lpXY = null, menuAt = 0;
  function menu(ll) {
    if (Date.now() - menuAt < 1000) return; menuAt = Date.now(); window.PsNative?.haptic?.('light');
    const at = `${ll.lat.toFixed(5)},${ll.lng.toFixed(5)}`, me = state.loc && km(state.loc, [ll.lat, ll.lng]); // round 9: how far, and which way, from you
    L.popup({ className: 'pp-pop pp-menu', offset: [0, -2], closeButton: false }).setLatLng(ll)
      .setContent((me ? `<p class="ms-from">${ic('my-location', 'sm')}${esc(tr('away', fmtKm(me.d), compass(me.bearing)))}</p>` : '') +
        `<button class="btn" data-pp-mark="${at}">${ic('star', 'sm')}${esc(tr('a18_markHere'))}</button>` + // round 18 A: your own spot that produces fish
        `<button class="btn" data-pp-add="${at}">${ic('flag', 'sm')}${esc(tr('pp_saveHere'))}</button><button class="btn" data-ms-start="${at}">${ic('route', 'sm')}${esc(tr('ms_measure'))}</button>`).openOn(map);
  }

  /* ---------- Measure (round 9): from a long-press, each tap adds a point; the tag at the end shows the length in km and nautical miles ---------- */
  let ms = null;
  const msTag = () => {
    let d = 0; for (let k = 1; k < ms.pts.length; k++) d += map.distance(ms.pts[k - 1], ms.pts[k]);
    const last = ms.pts.length > 1 && km([ms.pts.at(-2).lat, ms.pts.at(-2).lng], [ms.pts.at(-1).lat, ms.pts.at(-1).lng]);
    return `<span class="ms-tag-in"><b>${d < 1000 ? Math.round(d) + ' m' : fmtKm(d / 1000) + ' km'}</b><small>${nf(d / 1852, d < 1852 ? 2 : 1)} ${esc(tr('sc_nm'))}${last ? ` · ${compass(last.bearing)}` : ''}</small>` +
      `<button type="button" data-ms-end aria-label="${esc(tr('ms_end'))}">${ic('close', 'sm')}</button></span>`;
  };
  function msAdd(ll) {
    ms.pts.push(ll); ms.line.setLatLngs(ms.pts);
    L.circleMarker(ll, { pane: 'pins', radius: 3.5, weight: 2, color: '#fff', fillColor: '#121212', fillOpacity: 1, interactive: false }).addTo(ms.g);
    ms.tag.setLatLng(ll).setIcon(L.divIcon({ className: 'ms-tag', html: msTag(), iconSize: [0, 0] }));
  }
  function msStart(ll) {
    msEnd(); map.closePopup();
    const g = L.layerGroup().addTo(map);
    ms = { pts: [], g, line: L.polyline([], { pane: 'pins', color: '#fff', weight: 2, opacity: .9, dashArray: '6 5', interactive: false }).addTo(g),
      tag: L.marker(ll, { pane: 'pins', keyboard: false, zIndexOffset: 1000 }).addTo(g) };
    msAdd(ll); toast(tr('ms_hint'));
  }
  function msEnd() { if (ms) { ms.g.remove(); ms = null; } }
  map.getContainer().addEventListener('click', e => { // measuring: a tap adds a point instead of opening the sea's card
    if (!ms || e.target.closest('.leaflet-control, .leaflet-popup, .ms-tag, .leaflet-marker-icon')) return;
    e.stopPropagation(); const r = map.getContainer().getBoundingClientRect(); msAdd(map.containerPointToLatLng([e.clientX - r.left, e.clientY - r.top]));
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') msEnd(); });
  const ctr = map.getContainer(), noLp = () => { clearTimeout(lp); lp = 0; };
  map.on('contextmenu', e => { noLp(); menu(e.latlng); });
  map.on('movestart zoomstart', noLp);
  ctr.addEventListener('pointerdown', e => {
    noLp(); lpAt = 0;
    if (e.pointerType !== 'touch' || !e.isPrimary || e.target.closest('.leaflet-marker-icon, .leaflet-popup, .leaflet-control')) return;
    lpXY = [e.clientX, e.clientY];
    lp = setTimeout(() => { lp = 0; lpAt = Date.now(); const r = ctr.getBoundingClientRect(); menu(map.containerPointToLatLng([lpXY[0] - r.left, lpXY[1] - r.top])); }, 550);
  }, { passive: true });
  ctr.addEventListener('pointermove', e => { if (lp && Math.hypot(e.clientX - lpXY[0], e.clientY - lpXY[1]) > 8) noLp(); }, { passive: true });
  for (const t of ['pointerup', 'pointercancel']) ctr.addEventListener(t, noLp, { passive: true });
  ctr.addEventListener('click', e => { if (lpAt && Date.now() - lpAt < 1500) { lpAt = 0; e.stopPropagation(); } }, true);
  document.addEventListener('ps:catches', () => { for (const u of urls.values()) URL.revokeObjectURL(u); urls.clear(); draw(); });
  document.addEventListener('ps:records', () => { recB = null; loadRecs(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pp-more], [data-pp-open], [data-pp-save], [data-pp-add], [data-pp-del], [data-pp-chance], [data-ms-start], [data-ms-end], [data-pp-mark], [data-pp-markcell], [data-pp-medit], [data-pp-mf]'); if (!b) return;
    const d = b.dataset;
    if (d.ppMf) formTap(b); // round 18 A: the mark form
    else if (d.ppMark) { map.closePopup(); const [la, lo] = d.ppMark.split(',').map(Number); markForm(la, lo); }
    else if (d.ppMarkcell) markForm(latOf(+d.ppMarkcell), lonOf(+d.ppMarkcell));
    else if (d.ppMedit) { const p = places.find(q => q.id === d.ppMedit); if (p) markForm(p.lat, p.lon, p); }
    else if (d.msStart) { const [la, lo] = d.msStart.split(',').map(Number); msStart(L.latLng(la, lo)); }
    else if (d.msEnd != null) { e.stopPropagation(); msEnd(); }
    else if (d.ppMore) more(byKey(d.ppMore));
    else if (d.ppOpen) { const it = byKey(d.ppOpen); if (it) open(it); }
    else if (d.ppSave) add(latOf(+d.ppSave), lonOf(+d.ppSave));
    else if (d.ppAdd) { map.closePopup(); const [la, lo] = d.ppAdd.split(',').map(Number); add(la, lo); }
    else if (d.ppDel) del(d.ppDel, b);
    else { map.closePopup(); openCell(+d.ppChance); }
  });
  document.addEventListener('input', e => { if (mf && e.target.matches?.('[data-pp-mf-note]')) mf.note = e.target.value; });
  document.addEventListener('change', e => { // a place's new name; round 18 A: a fish added to the mark form from the list of all
    if (mf && e.target.matches?.('[data-pp-mf-add]')) {
      const id = e.target.value, r = e.target.closest('.pp-mf'); if (!id || !byId(id)) return;
      if (!mf.opts.includes(id)) mf.opts.push(id);
      if (!mf.fish.includes(id)) mf.fish.push(id);
      r.querySelector('.pp-fish').innerHTML = fishChips(); e.target.querySelector(`option[value="${id}"]`)?.remove(); e.target.value = '';
      return;
    }
    const id = e.target.dataset?.ppName, p = id && places.find(q => q.id === id); if (!p) return;
    p.name = e.target.value.trim().slice(0, 60); savePlaces(); setPlaces(); draw();
    const t = e.target.closest('.pp-card')?.querySelector('.pp-top b'); if (t) t.textContent = placeName(p);
  });
  new MutationObserver(() => { // a language switch (ui.js applyLang sets <html lang>): the pins' names, the counts, the card on show
    for (const v of live.values()) fill(v);
    counts();
    if (!redraw) return;
    if (pop?.isOpen() && pop.getContent().includes('pp-card')) pop.setContent(redraw());
    else if (isPhone() && $('#m-spot:not([hidden]) .pp-card')) PsMobile.showHtml(redraw());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const first = () => { loadRecs(); draw(); }; // after start-up: the first heat paint comes first
  if (window.requestIdleCallback) requestIdleCallback(first, { timeout: 2500 }); else setTimeout(first, 1200);

  async function focus({ kind, id } = {}) {
    if (window.PsNav?.open && PsNav.current?.() !== 'map') PsNav.open('map'); // first: phones show pages as full-screen layers over the map
    window.PsPanel?.close?.();
    let it = find(kind, id);
    if (!it && kind === 'record' && window.PsRecords?.get) {
      const r = await PsRecords.get(id); if (r) { recs.set(r.id, r); setRecs(); it = find(kind, id); }
    }
    if (!it) return false;
    if (!on[kind]) set(kind, true);
    map.once('moveend', () => { draw(); open(it); }); // setView fires it even when nothing moves
    map.setView([it.lat, it.lon], Math.max(map.getZoom(), kind === 'record' ? 14 : 13));
    return true;
  }
  // Round 11 accounts (js/cloud.js): places from the cloud (put: [{ id, name, lat, lon, t, a, n }], checked here: it is network data) and the
  // ids deleted on another phone; saved, drawn, one 'ps:places'.
  function mergePlaces(put = [], gone = []) { // (not merge(): pins.js has one of its own, for the clusters)
    const by = new Map(places.map(p => [p.id, p]));
    for (const id of gone) by.delete(id);
    for (const p of put) {
      if (!p || typeof p.id !== 'string' || !/^[\w-]{1,40}$/.test(p.id) || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) continue;
      by.set(p.id, { id: p.id, name: String(p.name || '').slice(0, 60), lat: p.lat, lon: p.lon, t: Number.isFinite(p.t) ? p.t : Date.now(),
        a: typeof p.a === 'string' ? p.a : areaOf(p.lat, p.lon), n: Number.isInteger(p.n) && p.n > 0 ? p.n : 1, ...cleanMark(p) }); // round 18 A: a mark's fields, checked
    }
    places = [...by.values()]; savePlaces(); setPlaces(); draw(); if (typeof drawLayerCounts === 'function') drawLayerCounts();
  }
  //   PsPins.marks() (round 18 A) → [{ id, name, lat, lon, t, fish: [ids], months: [1–12], method, q: 1–3, note }]: your marked spots
  return { focus, merge: mergePlaces, marks, places: () => places.map(p => ({ id: p.id, name: placeName(p), lat: p.lat, lon: p.lon, t: p.t, mark: isMark(p) })) };
})();
