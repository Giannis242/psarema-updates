'use strict';
// Psarema at sea without signal, and sharing a spot (css/offline.css). Load after js/mobile.js and before js/app.js (it wraps two
// sources.js loaders that app.js calls).
// Offline areas: the forecast, satellite and ocean data are renewed and kept for the area (up to 3 days at sea); the map offline shows the
// app's own imagery (tiles-lite). Round 14 store: the online imagery's tiles are saved only when js/map-config.js says its licence allows it
// (IMAGERY.offline; Esri's does not, store/licences.md). Then its tiles at zooms 13–15 go into the Cache API and the layer takes them from
// there first: a patched L.TileLayer createTile, not a service worker, so the same code runs on http://localhost, the web and the apps.
// Once an area is saved, the satellite and ocean maps this device saved are used for up to 3 days when they cannot be fetched (the forecast
// already is: app.js). Capped at 150 MB, user-started, for personal use (Esri's terms). Nothing is sent anywhere but the tile requests.
// Hooks: PsOffline.open(), PsOffline.share(cell); any [data-ps-offline] opens the panel, any [data-ps-share="<cell>"] shares that spot.
Object.assign(I18N.en, { off_emptyP: 'Save an area below while you still have Wi‑Fi or data.' });
Object.assign(I18N.el, { off_emptyP: 'Αποθηκεύστε μια περιοχή παρακάτω όσο έχετε ακόμη Wi‑Fi ή δεδομένα.' });
const PsOffline = window.PsOffline = (() => {
  // Zooms: from the first the online imagery shows (13 in the app, whose tiles-lite end at 12; 14 on the desktop site) to 15
  const CACHE = 'psarema-tiles-v1', META = 'psarema-offline-v1', Z0 = Math.max(13, (window.PSAREMA_TILES?.maxZoom ?? 12) + 1), Z1 = 15, CAP = 150 * 1048576, KEEP = 3 * 864e5;
  const AVG = 15e3, MAX_RAW = 20000, FETCHES = 4; // ~15 KB imagery per square (measured over Limassol, Paphos, Larnaca); the names are the app's own now (js/map-marks.js)
  let areas = [];
  try { areas = JSON.parse(localStorage.getItem(META)) || []; } catch {}
  const persist = () => { try { localStorage.setItem(META, JSON.stringify(areas)); } catch {} };
  let store = null;
  const cache = () => store ||= caches.open(CACHE);
  const mb = b => nf(b / 1048576, b && b < 10 * 1048576 ? 1 : 0);
  const used = () => areas.reduce((s, a) => s + a.bytes, 0);
  const AREAS = window.PSAREMA_AREAS || [], areaName = id => { const a = AREAS.find(x => x.id === id); return a ? (state.lang === 'el' ? a.el : a.en) : ''; };
  const nameOf = a => a.area ? areaName(a.area) : a.name;

  /* ---------- Tiles: which, and served from the cache ---------- */
  const SAVE = !!(IMAGERY.url && IMAGERY.offline), esri = []; // the imagery layer has no name in map.js: found on the map
  if (SAVE) map.eachLayer(l => { if (l instanceof L.TileLayer && l._url === IMAGERY.url) esri.push(l); });
  else if (window.caches && areas.some(a => a.bytes)) { // tiles saved before round 14 (Esri's): dropped, the areas stay (their data still counts)
    caches.delete(CACHE).catch(() => {}); areas.forEach(a => { a.bytes = a.n = a.of = 0; }); persist();
  }
  const native0 = esri.map(l => l.options.maxNativeZoom);
  const urlsOf = ([z, x, y]) => esri.map(l => L.Util.template(l._url, { z, x, y }));
  function tilesOf(b) { // [z, x, y] over bounds b at zooms Z0–15: land and sea up to 12 km out (open sea looks no different from tiles-lite); null: too big
    const bb = L.latLngBounds(b), out = [];
    for (let z = Z0; z <= Z1; z++) {
      const p = map.project(bb.getNorthWest(), z).divideBy(256).floor(), q = map.project(bb.getSouthEast(), z).divideBy(256).floor();
      if ((q.x - p.x + 1) * (q.y - p.y + 1) > MAX_RAW) return null;
      for (let x = p.x; x <= q.x; x++) for (let y = p.y; y <= q.y; y++) {
        const c = map.unproject([(x + .5) * 256, (y + .5) * 256], z), i = idxAt(c.lat, c.lng);
        if (i >= 0 && dist[i] <= 12) out.push([z, x, y]);
      }
    }
    return out;
  }
  let boxes = [];
  function changed() { // after the saved areas change (and at start, online or offline): where to look in the cache, how far the map zooms into saved tiles offline
    boxes = areas.map(a => L.latLngBounds(a.b));
    const off = navigator.onLine === false && areas.length; // offline, zooms 16–17 enlarge the saved zoom 15 instead of failing to load
    esri.forEach((l, k) => { const z = off ? Z1 : native0[k]; if (l.options.maxNativeZoom !== z) { l.options.maxNativeZoom = z; l.redraw(); } });
  }
  addEventListener('online', changed); addEventListener('offline', changed);
  if (SAVE && window.caches) {
    changed();
    const create = L.TileLayer.prototype.createTile;
    L.TileLayer.prototype.createTile = function (c, done) { // a saved tile from the cache (as a blob: URL), anything else as before
      if (!boxes.length || c.z < Z0 || c.z > Z1 || this._url !== IMAGERY.url) return create.call(this, c, done);
      const tb = this._tileCoordsToBounds(c); // tilesOf saves every tile that overlaps an area
      if (!boxes.some(b => b.overlaps(tb))) return create.call(this, c, done);
      const url = this.getTileUrl(c), tile = document.createElement('img');
      let blob = '';
      const free = () => { if (blob) { URL.revokeObjectURL(blob); blob = ''; } };
      L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile)); // as Leaflet's own createTile
      L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));
      tile.addEventListener('load', free); tile.addEventListener('error', free);
      tile.alt = '';
      cache().then(s => s.match(url)).then(r => r && r.blob()).catch(() => null)
        .then(b => { if (!tile.hasAttribute('src')) tile.src = b ? blob = URL.createObjectURL(b) : url; }); // a src already: Leaflet dropped it meanwhile
      return tile;
    };
  }

  /* ---------- At sea: the saved satellite and ocean maps, up to 3 days old (sources.js reuses them for 6 h) ---------- */
  const stale = k => { if (!areas.length) return null; try { const c = JSON.parse(localStorage.getItem(k)); return c && Date.now() - c.at < KEEP ? c : null; } catch { return null; } };
  const sat0 = loadSatellite, ocean0 = loadOcean;
  window.loadSatellite = ocean => sat0(ocean).catch(e => {
    const c = stale(SAT_CACHE); if (!c) throw e;
    for (const k in ARCO) if (c[k]) c[k].g = new Float32Array(b64(c[k].g).buffer); // as sources.js reads it
    return c;
  });
  window.loadOcean = (url = OCEAN_URL) => ocean0(url).catch(e => {
    const raw = localStorage.getItem(OCEAN_CACHE), c = stale(OCEAN_CACHE); if (!c) throw e;
    // sources.js decodes it, handed over as a blob: URL; it then saves that as fresh, so the cache goes back as it was (its age stays true)
    const u = URL.createObjectURL(new Blob([JSON.stringify(c.o)], { type: 'application/json' }));
    return ocean0(u).finally(() => { URL.revokeObjectURL(u); try { localStorage.setItem(OCEAN_CACHE, raw); } catch {} });
  });
  const savedAt = k => +(localStorage.getItem(k)?.match(/^\{"at":(\d+)/)?.[1] || 0); // each cache's JSON starts with its time
  function refreshData() { // saving to go out: the forecast, satellite and ocean caches renewed now if past their usual age, so the 3 days start now
    const age = k => Date.now() - savedAt(k);
    if (age(FC_CACHE) > 36e5) loadForecast().catch(() => {});
    if (age(SAT_CACHE) > 6 * 36e5 || age(OCEAN_CACHE) > 6 * 36e5) { const oc = loadOcean().catch(() => null); loadSatellite(oc).catch(() => {}); }
  }

  /* ---------- Saving and deleting ---------- */
  let job = null, pick = 'view'; // job: the area being saved
  function target() { // the area to save: the map's view or a fishing area (data/areas.js), with its tiles and size
    const A = AREAS.find(a => a.id === pick), c = A ? L.latLng(A.lat, A.lon) : map.getCenter();
    const dLa = A && A.r / 110.57, dLo = A && A.r / (111.32 * Math.cos(A.lat * Math.PI / 180));
    const b = A ? [[A.lat - dLa, A.lon - dLo], [A.lat + dLa, A.lon + dLo]] : (v => [[v.getSouth(), v.getWest()], [v.getNorth(), v.getEast()]])(map.getBounds());
    const list = SAVE ? tilesOf(b) : [], est = list ? list.length * AVG : Infinity, free = CAP - used();
    const msg = !SAVE ? ['', tr('of_dataOnly')] : !list || est > CAP ? ['bad', tr('offTooBig')] : !list.length ? ['bad', tr('offEmpty')] : est > free ? ['bad', tr('offNoRoom', mb(Math.max(0, free)), mb(CAP))] : ['', tr('offEst', mb(est))];
    return { b, list, ok: !msg[0], msg, area: A?.id, name: A ? '' : describe(c.lat, c.lng) };
  }
  async function save() {
    if (job || SAVE && !window.caches) return;
    if (navigator.onLine === false) { toast(tr('offOnline')); return; }
    const t = target(); if (!t.ok) return;
    refreshData();
    if (!SAVE) { // the data only: the area marks where the saved forecast and sea data are used at sea
      areas.push({ id: Date.now(), area: t.area, name: t.name, b: t.b, n: 0, of: 0, bytes: 0, at: Date.now() }); persist(); changed();
      toast(tr('offDone', nameOf(t))); draw(); return;
    }
    navigator.storage?.persist?.().catch(() => {}); // ask the browser not to clear it when space runs low
    const urls = t.list.flatMap(urlsOf), s = await cache();
    job = { ...t, n: urls.length, done: 0, bytes: 0, fail: 0, stop: '' };
    draw();
    let next = 0;
    const work = async () => {
      while (next < urls.length && !job.stop) {
        const u = urls[next++];
        try {
          const hit = await s.match(u); // shared with another saved area: counted for both (ponytail: overlaps overcount, on the safe side of the cap)
          if (hit) job.bytes += (await hit.blob()).size;
          else {
            const r = await fetch(u); if (!r.ok) throw new Error(r.status);
            const b = await r.blob(); await s.put(u, new Response(b, { headers: { 'Content-Type': b.type } })); job.bytes += b.size;
          }
        } catch (e) { job.fail++; if (e.name === 'QuotaExceededError') job.stop = 'cap'; }
        job.done++;
        if (used() + job.bytes > CAP) job.stop = 'cap';
        tick();
      }
    };
    await Promise.all(Array.from({ length: FETCHES }, work));
    const j = job, ok = j.done - j.fail;
    if (ok) { areas.push({ id: Date.now(), area: j.area, name: j.name, b: j.b, n: ok, of: j.n, bytes: j.bytes, at: Date.now() }); persist(); changed(); }
    job = null;
    toast(j.stop === 'cap' ? tr('offCapHit') : j.stop ? tr('offStopped') : j.fail ? tr('offFailed', j.fail) : tr('offDone', nameOf(j)));
    draw();
  }
  async function del(id) {
    const a = areas.find(x => x.id === id);
    if (!a || job || !confirm(tr('offDelQ', nameOf(a)))) return;
    areas = areas.filter(x => x !== a); persist(); changed();
    if (!SAVE) {} // nothing of it in the cache
    else if (!areas.length) { store = null; await caches.delete(CACHE); } // the last one: everything, strays from an interrupted save too
    else {
      const keep = new Set(areas.flatMap(o => (tilesOf(o.b) || []).flatMap(urlsOf))), s = await cache();
      await Promise.all((tilesOf(a.b) || []).flatMap(urlsOf).filter(u => !keep.has(u)).map(u => s.delete(u)));
    }
    draw();
  }

  /* ---------- The panel: the shared one (js/catchlog.js PsPanel); what is saved, how full the space is, how long it lasts at sea ---------- */
  let raf = 0;
  const root = () => PsPanel.root('po');
  const newHtml = () => {
    if (SAVE && !window.caches) return `<p class="po-est bad">${esc(tr('offNoCache'))}</p>`;
    if (job) { const p = Math.floor(job.done / job.n * 100); return `<div class="po-prog" data-po-prog><div class="po-bar"><i style="width:${p}%"></i></div>` +
      `<span role="status">${esc(tr('offSaving', p, mb(job.bytes)))}</span><button class="btn sm" data-po="stop">${esc(tr('offStop'))}</button></div>`; }
    const t = target();
    return `<p class="po-est ${t.msg[0]}" role="status">${esc(t.msg[1])}</p><button class="btn primary lg block" data-po="save"${t.ok ? '' : ' disabled'}>${ic('map', 'sm')}${esc(tr('offSave'))}</button>`;
  };
  const day = t => fmtT(t, { day: 'numeric', month: 'short' });
  function html() {
    const opts = [['view', tr('offView')], ...AREAS.map(a => [a.id, areaName(a.id)])].map(([v, n]) => `<option value="${v}"${v === pick ? ' selected' : ''}>${esc(n)}</option>`).join('');
    // each saved area: its name, size and day, and whether every map tile of it came down; Show flies there and outlines it
    const btn = (k, id, icon, label, cls = '') => `<button class="btn ib${cls}" ${k}="${id}" aria-label="${esc(label)}" title="${esc(label)}">${ic(icon, 'sm')}</button>`;
    const rows = areas.map(a => `<li class="ui-row"><span class="ui-thumb po-ic${a.n < a.of ? ' part' : ''}">${ic(a.n < a.of ? 'warning' : 'check')}</span>` +
      `<span class="ui-row-main"><b>${esc(nameOf(a))}</b><small>${esc(SAVE ? tr('offRow', mb(a.bytes), day(a.at)) : tr('of_rowData', day(a.at)))}${a.n < a.of ? ` · <span class="part">${esc(tr('offPart'))} ${Math.floor(a.n / a.of * 100)}%</span>` : ''}</small></span>` +
      `<span class="pn-acts">${btn('data-po-show', a.id, 'location', tr('offShow'))}${btn('data-po-del', a.id, 'trash', tr('offDel'), ' ghost')}</span></li>`).join('');
    const fc = savedAt(FC_CACHE), u = used();
    return PsPanel.head('po', 'map', tr('offAreas')) + `<p class="pn-note">${ic('info', 'sm')}<span>${esc(tr('offIntro'))}</span></p>` +
      `<div class="ui-sec"><h3>${esc(tr('offSaved'))}</h3></div>` + (rows ? `<ul class="ui-list">${rows}</ul>` : `<div class="ui-empty po-empty">${ic('map')}<b>${esc(tr('offNone'))}</b><p>${esc(tr('off_emptyP'))}</p></div>`) +
      `<div class="ui-card po-status">${SAVE ? `<small>${esc(tr('offUsed', mb(u), mb(CAP)))}</small><div class="po-bar"><i style="width:${Math.min(100, u / CAP * 100).toFixed(1)}%"></i></div>` : ''}` +
      `<p class="${fc ? '' : 'po-est bad'}">${ic('clock', 'sm')}<span>${esc(fc ? tr('offData', whenT(fc), whenT(fc + KEEP)) : tr('offNoData'))}</span></p></div>` +
      `<div class="ui-sec"><h3>${esc(tr('offSave'))}</h3></div><div class="ui-card po-new"><label class="ui-field"><span>${esc(tr('offPick'))}</span><select class="ui-input" data-po="pick"${job ? ' disabled' : ''}>${opts}</select></label>` +
      `<div data-po-new>${newHtml()}</div></div>` +
      `<p class="hint">${esc(SAVE ? tr('offTerms', IMAGERY.credit) : tr('of_noSat'))}</p>`;
  }
  function draw(open) { // redraw the panel if it is open (or open it)
    if (!open && !root()) return;
    PsPanel.show('po', html(), open);
    tick();
  }
  const tick = () => { raf ||= requestAnimationFrame(() => { // the progress, in place
    raf = 0; const p = root()?.querySelector('[data-po-prog]'); if (!p || !job) return;
    p.querySelector('i').style.width = (job.done / job.n * 100).toFixed(1) + '%';
    p.querySelector('span').textContent = tr('offSaving', Math.floor(job.done / job.n * 100), mb(job.bytes));
  }); };
  const upd = () => { const n = root()?.querySelector('[data-po-new]'); if (n) n.innerHTML = newHtml(); tick(); };
  function close() { if (root()) PsPanel.close(); }
  function show(a) { // the saved area on the map: fitted, and outlined for a few seconds
    close(); map.fitBounds(a.b, isPhone() ? PsMobile.pad() : {});
    const r = L.rectangle(a.b, { color: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(), weight: 2, dashArray: '6 6', fill: false, interactive: false }).addTo(map);
    setTimeout(() => r.remove(), 5000);
  }
  map.on('moveend', () => { if (pick === 'view' && !job) upd(); }); // the view's size follows the map
  new MutationObserver(() => draw()).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('change', e => { if (e.target.matches?.('[data-po="pick"]')) { pick = e.target.value; upd(); } });
  document.addEventListener('click', e => {
    const t = e.target.closest?.('[data-po], [data-po-show], [data-po-del], [data-ps-offline], [data-ps-share]'); if (!t) return;
    if (t.dataset.psOffline != null) draw(true);
    else if (t.dataset.psShare != null) share(+t.dataset.psShare);
    else if (t.dataset.poDel) del(+t.dataset.poDel);
    else if (t.dataset.poShow) { const a = areas.find(x => x.id === +t.dataset.poShow); if (a) show(a); }
    else if (t.dataset.po === 'save') save();
    else if (t.dataset.po === 'stop') { if (job) job.stop = 'user'; }
  });

  /* ---------- Share a spot: the system share sheet (the app's Share plugin, or the browser's), else the clipboard ---------- */
  const plain = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); };
  function copy(text) {
    const ok = () => toast(tr('shCopied')), old = () => { // the textarea route for views that refuse the clipboard API
      const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch {} ta.remove();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, old); else old();
  }
  function shareText(i) { // the fish, place, score now, the best time (as the card says it), GPS and a Google Maps link
    const la = latOf(i), lo = lonOf(i), { score } = explain(i, state.h), go = condHtml('card', i).go, bh = go == null && bestHourAt(i);
    return [`${fishName(sp)} · ${tr(state.mode)}`, `${describe(la, lo)} · ${depthM(i)} m`, tr('shScore', score, rating(score), whenT(hours[state.h].t)),
      go != null ? plain(go) : bh.s ? tr('bestCard', whenT(hours[bh.h].t), bh.s) : '',
      `GPS ${gps(la, lo)}`, `https://www.google.com/maps/search/?api=1&query=${la.toFixed(5)},${lo.toFixed(5)}`, 'Psarema'].filter(Boolean).join('\n');
  }
  function share(i) {
    if (!F || !(i >= 0) || !depth[i]) return;
    const text = shareText(i), title = tr('shTitle'), S = window.Capacitor?.isNativePlatform?.() && Capacitor.Plugins?.Share;
    const p = S ? S.share({ title, text, dialogTitle: title }) : navigator.share ? navigator.share({ title, text }) : Promise.reject(new Error('none'));
    p.catch(e => { if (!/abort|cancel/i.test(`${e?.name} ${e?.message}`)) copy(text); }); // closing the share sheet is no failure
  }

  return { open: () => draw(true), close, share, shareText };
})();
