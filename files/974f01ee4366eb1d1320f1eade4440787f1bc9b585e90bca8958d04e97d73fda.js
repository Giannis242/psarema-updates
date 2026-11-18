'use strict';
// Psarema: the Leaflet map, its layers and the score image.
console.assert(HEAT.every(([s, c]) => getComputedStyle(document.documentElement).getPropertyValue('--heat-' + s).trim() === `rgb(${c.slice(0, 3).join(' ')})`), 'css/tokens.css --heat-* match core.js HEAT');
/* ---------- Map ---------- */
// fadeAnimation off (round 17 Z): Leaflet faded each new tile in by setting its opacity from script at every frame, and css/app.css ran a
// .12 s transition on each of those steps: during a zoom every tile on screen was restyled, and was a layer of its own, at every frame (a third
// of the main thread's work in a pinch on a budget phone). Our own tiles are there at once and show at once; the online imagery still fades
// in over them, by one CSS animation a tile that the compositor runs alone (css/map-fx.css sat-in).
const map = L.map('map', { preferCanvas: true, zoomControl: false, maxBounds: L.latLngBounds(VIEW).pad(.25), maxBoundsViscosity: 1, zoomSnap: .5, maxZoom: 19,
  bounceAtZoomLimits: false, fadeAnimation: false }).setView([35.05, 33.3], 9);
// Round 11 (the owner: zooming out past the island "shows the rest of the countries for a split second"): nothing past the allowed view at any
// moment. A pinch stops at the floor (bounceAtZoomLimits) and keeps its centre inside maxBounds (Leaflet's pinch ignores them until it ends);
// a fling glides to the bounds instead of past them and back; the imagery is clipped to the mask's box (PaddedTiles), and past the mask's
// drawn extent the map's own ground is the mask's colour (css/map-fx.css): whatever a gesture uncovers is the same dark sea.
{
  const move = map._move, anim = map._animateZoom, panBy = map.panBy; // ponytail: Leaflet 1.9.4 internals, as PaddedTiles
  map._move = function (c, z, d, s) { if (d?.pinch && this.options.maxBounds) c = this._limitCenter(L.latLng(c), z, this.options.maxBounds); return move.call(this, c, z, d, s); };
  map._animateZoom = function (c, z, ...a) { if (this.options.maxBounds) c = this._limitCenter(L.latLng(c), z, this.options.maxBounds); return anim.call(this, c, z, ...a); }; // a pinch's own end
  map.panBy = function (off, o) {
    const mb = this.options.maxBounds; if (!mb || !this._loaded) return panBy.call(this, off, o);
    const z = this.getZoom(), c = this.project(this.getCenter(), z), to = this._limitCenter(this.unproject(c.add(L.point(off)), z), z, mb);
    return panBy.call(this, this.project(to, z).subtract(c), o);
  };
}
// Round 17 Z: a pan, pinch or animated zoom under way (movestart to moveend). Work that can wait for the map to rest does (js/fine.js: fitting
// its tiles, painting them in), so the gesture's frames come first.
let mapMoving = false; const mapBusy = () => mapMoving;
map.on('movestart zoomstart', () => { mapMoving = true; }).on('moveend', () => { mapMoving = false; });
let fitted = false;
const COAST = [[34.56, 32.27], [35.71, 34.61]]; // the island itself (data/coast.js): phones fit it, as VIEW's sea margins cost a small screen too much
function fitView() {
  const phone = isPhone(), s = map.getSize(), pad = phone && (window.PsMobile?.fitPad() || s.x < s.y && [[0, 70], [0, 190]]), b = phone ? COAST : VIEW;
  if (phone && !pad) return; // before js/mobile.js a phone on its side waits for it: the portrait guess gave zoom 6.5, wider than maxBounds, and the map slid 200 px before the real fit
  const [tl, br] = !phone ? [[350, 60], [10, 10]] // the coast clear of the panel
    : pad.map(p => L.point(p).add([8, 8])); // phones: between the top bar and the sheet (js/mobile.js), 8 px clear
  const room = s.subtract(L.point(tl).add(br));
  if (room.x < 50 || room.y < 50) return; // no size yet (a page opened in a hidden tab), or the phone layout not in place yet: a later call fits
  const whole = !fitted || map.getZoom() <= map.getMinZoom(); // first fit, or still showing the whole island
  if (map._panAnim?._inProgress) { // a rotation's pan back inside the new maxBounds (js/mobile.js)
    if (!whole) { map.once('moveend', () => requestAnimationFrame(fitView)); return; } // a new floor's zoom would cut it short: after it
    // the fit replaces it (waiting showed a 250 ms slide, then a jump); its last 'moveend' must not start it again
    map.off('moveend', map._panInsideMaxBounds); map._panAnim.stop(); map.on('moveend', map._panInsideMaxBounds);
  }
  fitted = true;
  map.options.minZoom = 0; // getBoundsZoom never answers below the current floor: without this the floor could only rise (turned on its side, a phone kept the portrait zoom)
  const z = map.getBoundsZoom(b, false, L.point(tl).add(br)); // after a rotation or resize the floor follows the new size
  if (whole) map.fitBounds(b, { paddingTopLeft: tl, paddingBottomRight: br, animate: false });
  map.setMinZoom(z); // after the fit: raised first, it starts an animated zoom that swallows the fit
}
fitView();
map.on('resize', () => requestAnimationFrame(fitView)); // a frame later: js/mobile.js re-measures its sheet after a rotation in the same frame
addEventListener('DOMContentLoaded', fitView); // again once js/mobile.js has measured the sheet: the map may not change size when it does
new ResizeObserver(() => map.invalidateSize()).observe(map.getContainer()); // a map that starts hidden or unsized fits once it has a size
const zoomCtl = L.control.zoom({ position: 'bottomright' }).addTo(map);
{ // no "Leaflet" link; the data credits (a licence condition) fold into a small (i) button that opens on tap
  map.attributionControl.setPrefix(false);
  const a = map.attributionControl.getContainer(); a.classList.add('folded'); a.title = tr('credits');
  L.DomEvent.on(a, 'click', e => { if (a.classList.contains('folded')) L.DomEvent.preventDefault(e); a.classList.toggle('folded'); });
}
const LocateCtl = L.Control.extend({ options: { position: 'bottomright' }, onAdd() {
  const box = L.DomUtil.create('div', 'leaflet-bar locate'), a = L.DomUtil.create('a', '', box);
  a.href = '#'; a.innerHTML = ic('my-location') || '◎'; a.setAttribute('role', 'button');
  L.DomEvent.on(a, 'click', e => { L.DomEvent.preventDefault(e); L.DomEvent.stopPropagation(e); locateMe(); });
  this._a = a; return box;
} });
const locateCtl = new LocateCtl().addTo(map);
// Follow me (round 9): a second tap on a locate button (ui.js locateMe) keeps the dot in the middle as fixes come in (ui.js onFix → fix);
// a drag, or anything else moving the map away from you (a spot opened), stops it. Pinch and wheel zoom about the middle meanwhile.
// Every locate button ([data-ui="locate"], the map's own) says so: aria-pressed and the class "following" (css/map-fx.css).
const PsFollow = window.PsFollow = (() => {
  let on = false, at = null, own = 0;
  const btns = () => [locateCtl._a, ...document.querySelectorAll('[data-ui="locate"]')];
  function set(v) {
    if (on === !!v) return; on = !!v;
    map.options.touchZoom = map.options.scrollWheelZoom = on ? 'center' : true;
    for (const b of btns()) { b.classList.toggle('following', on); b.setAttribute('aria-pressed', on); }
    map.getContainer().classList.toggle('ps-following', on);
    document.dispatchEvent(new CustomEvent('ps:follow', { detail: on }));
    if (on && at) fix(at);
  }
  function fix(ll) { at = L.latLng(ll); if (!on) return; own++; map.panTo(at, { animate: true, duration: .4 }); map.once('moveend', () => own--); }
  map.on('dragstart', () => set(false));
  map.on('moveend', () => { if (on && !own && at && map.latLngToContainerPoint(at).distanceTo(map.getSize().divideBy(2)) > 40) set(false); });
  const tap = ll => { fix(ll); if (!map.getBounds().pad(-.1).contains(at)) return false; set(true); return true; }; // a locate tap: with you on screen, follow (else the caller flies to you)
  return { set, fix, tap, get on() { return on; } };
})();
// Leaflet keeps each pane's canvas once made, empty or not: each is a GPU layer 1.2× the screen (2× pixels on phones), re-sized, cleared
// and composited at every move. One goes once its last shape does (contours and spots below their zoom, zones, a cleared ring);
// map.getRenderer puts it back with the next shape. A frame later: a clear-and-redraw keeps its canvas, and the redraw a removal asks for
// has run (Leaflet 1.9.4 leaves it pending after a moveend's own redraw: removed sooner, the renderer drew with no canvas, a TypeError).
map.on('layerremove', ({ layer: { _renderer: r } }) => {
  if (!r || r._dropCheck) return;
  r._dropCheck = requestAnimationFrame(() => {
    r._dropCheck = 0;
    if (!map.hasLayer(r) || Object.keys(r._layers).length) return;
    map.removeLayer(r); r._redrawRequest = null; // Leaflet cancels that frame but keeps its id: back on the map, the renderer never asked for another
  });
});
for (const [name, z] of [['heat', 410], ['zones', 415], ['contours', 420], ['prot', 425], ['sight', 428], ['spots', 430], ['labels', 640], ['mask', 650]]) map.createPane(name).style.zIndex = z;
for (const p of ['labels', 'mask', 'zones']) map.getPane(p).style.pointerEvents = 'none';
// Tiles load half a screen beyond the view, so dragging uncovers imagery that is already there.
// Round 11 (the owner: "make the map load better when I zoom in and out"): an animated zoom of more than a level made Leaflet 1.9.4 reset
// each layer to the old level at its start and prune it to the few tiles under the new view (40% of the screen blank for a frame zooming
// in), and zooming out it asked for nothing wider until the end (the old tiles shrank into a dark ring). During the animation each layer
// now works at the zoom it goes to: the new level's tiles for the whole new view are asked for at once, the old level stays until they are in.
const MASK_BOX = L.latLngBounds(VIEW).pad(.04); // what the dark mask leaves clear (below)
const PaddedTiles = L.TileLayer.extend({
  options: { pad: .5 }, // round 17 M: the share of the view asked for beyond each side (0 for the online imagery: each of its tiles counts against the owner's quota)
  createTile(c, done) { // a tile across the mask's box shows only its part inside (zoomed out, the stored tiles reach the neighbours' coasts)
    const el = L.TileLayer.prototype.createTile.call(this, c, done), m = this._map, [nw, se] = this._tileCoordsToNwSe(c);
    const p0 = m.project(nw, c.z), p1 = m.project(se, c.z), q0 = m.project(MASK_BOX.getNorthWest(), c.z), q1 = m.project(MASK_BOX.getSouthEast(), c.z);
    const w = p1.x - p0.x, h = p1.y - p0.y, f = v => (Math.max(0, v) * 100).toFixed(2) + '%';
    const ins = [(q0.y - p0.y) / h, (p1.x - q1.x) / w, (p1.y - q1.y) / h, (q0.x - p0.x) / w];
    if (ins.some(v => v > 0)) el.style.clipPath = `inset(${ins.map(f).join(' ')})`;
    return el;
  },
  _getTiledPixelBounds(center) { const b = L.TileLayer.prototype._getTiledPixelBounds.call(this, center), pad = b.getSize().multiplyBy(this.options.pad); return L.bounds(b.min.subtract(pad), b.max.add(pad)); },
  _update(center) {
    const m = this._map; if (this.options.settle && m?.touchZoom?._zooming) return; // round 17 M: the online imagery waits for the fingers to lift
    if (!m?._animatingZoom) return L.TileLayer.prototype._update.call(this, center);
    const z = m._zoom; m._zoom = m._animateToZoom; // ponytail: Leaflet 1.9.4 internals (as js/chart.js HalfGrid); recheck on a Leaflet upgrade
    try { return L.TileLayer.prototype._update.call(this, center); } finally { m._zoom = z; }
  },
  // Round 17 Z: the online imagery (settle) fades each tile in by CSS (css/map-fx.css sat-in, .2 s), with the map's own tile fade off (above). Leaflet
  // then drops the level under a tile the moment it is ready, and our own tiles (another picture) flashed through it: the tile counts as shown
  // only once its fade is over, so the old level stays under it until then, as it did with Leaflet's fade.
  _tileReady(coords, err, tile) {
    if (!this.options.settle || !this._map || this._map._fadeAnimated) return L.TileLayer.prototype._tileReady.call(this, coords, err, tile);
    this._pruneTiles = L.Util.falseFn; // ponytail: Leaflet 1.9.4 internals (as _update above)
    try { L.TileLayer.prototype._tileReady.call(this, coords, err, tile); } finally { delete this._pruneTiles; }
    const t = this._tiles[this._tileCoordsToKey(coords)]; if (!t || err) { this._pruneTiles(); return; }
    t.active = false; setTimeout(() => { if (this._map) { t.active = true; this._pruneTiles(); } }, 220);
  },
  // Round 17 M: a pinch that ends exactly on a snap point (the zoom floor, a whole level) fires no 'zoom' event, and a layer that does not
  // update while zooming then stayed at its old level (the online imagery never started past its minZoom): at the move's end, the level it is at
  _onMoveEnd() {
    const m = this._map; if (!m || m._animatingZoom) return;
    const z = Math.round(m.getZoom()), o = this.options, want = z > o.maxZoom || z < o.minZoom ? undefined : this._clampZoom(z);
    if (want !== this._tileZoom) this._resetView(); else this._update();
  },
});
const IMAGERY = window.PSAREMA_IMAGERY || { url: '' }, TILE_BOUNDS = L.latLngBounds(VIEW).pad(.1); // IMAGERY: js/map-config.js, the one switch for the online imagery
const DATA_ATTR = 'EMODnet &middot; Generated using E.U. Copernicus Marine Service Information &middot; Contains modified Copernicus Sentinel data &middot; <a href="https://open-meteo.com/">Open-Meteo</a> &middot; GBIF/OBIS &middot; &copy; OpenStreetMap';
// Round 17 M: the online imagery, from zoom 12.5 (js/map-config.js 'from'), over our own tiles: each of its tiles fades in over ours as it
// arrives, so there is never a gap, and offline ours simply stay. Its terms and the owner's quota: normal loading only, no prefetch and nothing
// saved; the view itself, no margin (pad 0); Leaflet asks for the tiles nearest the centre first; the zoom's target level is asked for as a
// zoom animation starts, and nothing while fingers pinch (settle: a pinch passed through levels and asked for each one).
const tileOpts = { maxZoom: 19, maxNativeZoom: 18, className: 'sat', bounds: TILE_BOUNDS, pad: 0, settle: true, keepBuffer: 4, updateWhenIdle: false, updateWhenZooming: false };
const LOCAL_TILES = window.PSAREMA_TILES, BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const imagery = L.layerGroup().addTo(map); // the Satellite map style; js/chart.js swaps it for the Depth chart
let ownTile = () => true; // round 17 M: does our tile at these coords exist (tiles.js's index); the rest is open sea
if (LOCAL_TILES) { // the island's imagery is stored with the app, so it is there at once; sharper online imagery only beyond it
  // Round 17 M (the owner: "always loaded on all areas", "won't lag when zooming in and out"): our own tiles (Copernicus Sentinel-2, 10 m,
  // scripts/tiles/build.mjs) in two layers. The base (z7-z10) lies under everything at every zoom, a zoom-10 tile scaled up closer in, and its
  // few dozen tiles are kept (keepBuffer, and the preload below): whatever the detail or the online imagery has not drawn yet shows the island's
  // own picture, never a dark square. The detail (z11-z14) from zoom 10.5; above tiles.js's 'full' zoom it has only the coast, and inland a
  // tile shows its parent's quarter (round 17 M phase 2: 9.7 MB less in the app). Neither asks for tiles at a pinch's in-between levels (the scaled
  // ones and the base cover them) or decodes tiles it will drop. tiles.js's index lists the tiles that exist: the rest is open sea in one flat
  // tone, the map's own background (css/map-fx.css), so those tiles are empty elements, never a request or a decode.
  // Padded: zooming out, the old level's margin covers the wider view (and the online layer dropping out) until the new tiles arrive.
  // Their bounds are the stored area's (tiles.js): TILE_BOUNDS reaches past it, and the ring of tiles in between were 404s.
  const IX = {}; for (const [z, [x0, y0, w, h, b64]] of Object.entries(LOCAL_TILES.index || {})) IX[z] = { x0, y0, w, h, bits: Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)) };
  ownTile = c => { const q = IX[c.z]; if (!q) return true; const x = c.x - q.x0, y = c.y - q.y0, i = y * q.w + x; return x >= 0 && y >= 0 && x < q.w && y < q.h && !!(q.bits[i >> 3] & 1 << (i & 7)); };
  const full = LOCAL_TILES.full ?? LOCAL_TILES.maxZoom;
  const OwnTiles = PaddedTiles.extend({ createTile(c, done) {
    if (ownTile(c)) return PaddedTiles.prototype.createTile.call(this, c, done);
    const el = document.createElement('div'), up = c.z - full, p = { z: full, x: c.x >> up, y: c.y >> up };
    if (up > 0 && ownTile(p)) { // inland past 'full': the stored parent's part, scaled (and the browser's copy of it, already decoded nearby)
      const url = L.Util.template(this._url, { ...this.options, ...p }), n = 256 << up, im = new Image();
      Object.assign(el.style, { backgroundImage: `url("${url}")`, backgroundSize: `${n}px ${n}px`, backgroundPosition: `${-(c.x - (p.x << up)) * 256}px ${-(c.y - (p.y << up)) * 256}px` });
      im.onload = im.onerror = () => done(null, el); im.src = url;
    } else requestAnimationFrame(() => done(null, el)); // open sea: the background shows
    return el;
  } });
  const own = { maxZoom: 19, className: 'sat', bounds: LOCAL_TILES.bounds, updateWhenIdle: false, updateWhenZooming: false, errorTileUrl: BLANK };
  const top = Math.min(10, LOCAL_TILES.maxZoom);
  new OwnTiles(LOCAL_TILES.url, { ...own, minNativeZoom: LOCAL_TILES.minZoom, maxNativeZoom: top, keepBuffer: 99, attribution: `${LOCAL_TILES.attribution} &middot; ${DATA_ATTR}` }).addTo(imagery);
  // The minZoom sits half a step early: Leaflet picks tiles at the rounded zoom but drops them all below minZoom, so with an integer floor
  // the half step under it (zoomSnap .5) fetched the layer's tiles and threw them away on every move: flashing squares, ~50 requests a pan.
  if (LOCAL_TILES.maxZoom > top) new OwnTiles(LOCAL_TILES.url, { ...own, minZoom: top + .5, minNativeZoom: top + 1, maxNativeZoom: LOCAL_TILES.maxZoom, keepBuffer: 10 }).addTo(imagery);
  if (IMAGERY.url) new PaddedTiles(IMAGERY.url, { ...tileOpts, minZoom: IMAGERY.from ?? LOCAL_TILES.maxZoom + .5, attribution: IMAGERY.credit }).addTo(imagery);
  // the catch log's mini map (js/catchlog.js): the same tiles, index and inland fallback
  window.PsOwnTiles = o => new OwnTiles(LOCAL_TILES.url, { ...own, minNativeZoom: LOCAL_TILES.minZoom, maxNativeZoom: LOCAL_TILES.maxZoom, attribution: LOCAL_TILES.attribution, ...o });
} else if (IMAGERY.url) new PaddedTiles(IMAGERY.url, { ...tileOpts, attribution: `Imagery &copy; ${IMAGERY.credit} &middot; ${DATA_ATTR}` }).addTo(imagery);
// "Powered by Esri" on the map itself while its imagery is drawn (Esri's attribution rules; the full credits stay in the (i) and Me > Credits)
function poweredBy(m, layer) {
  if (!IMAGERY.powered || !layer) return;
  const el = L.DomUtil.create('div', 'leaflet-control powered-by'), c = L.control({ position: 'bottomright' });
  el.innerHTML = IMAGERY.powered; c.onAdd = () => el; c.addTo(m); el.parentNode.append(el); // the corner's foot, under zoom and locate
  const show = () => { el.hidden = !m.hasLayer(layer) || m.getZoom() < (layer.options.minZoom ?? 0); };
  m.on('zoomend layeradd layerremove', show); show();
}
imagery.eachLayer(l => { if (l._url === IMAGERY.url) poweredBy(map, l); });
// Round 17 M: a warm connection to the online imagery's host as a zoom nears it, so its first tiles skip the DNS and TLS set-up (a browser
// closes an unused one after ~10 s, so it is renewed while the view stays close; nothing is fetched)
if (IMAGERY.url) {
  let warm = null, at = 0; const origin = new URL(IMAGERY.url.replace(/\{.*$/, '')).origin;
  map.on('zoom', () => {
    if (map.getZoom() < (IMAGERY.from ?? 12.5) - 1.5 || navigator.onLine === false || Date.now() - at < 8e3 || !map.hasLayer(imagery)) return;
    at = Date.now(); warm?.remove(); document.head.append(warm = Object.assign(document.createElement('link'), { rel: 'preconnect', href: origin }));
  });
}
// Place names: js/map-marks.js draws our own (offline, in the app's language); Esri's reference labels (Greek and Latin twice, online only) are gone.
const labels = null;
// Preload: once the map rests, the next zoom level in and out of what is on screen goes into the browser's cache, so a pinch or a
// double tap shows imagery at once instead of blank squares. Each tile is asked for once; idle time only, and not when offline.
{
  const asked = new Set(); let t = 0;
  const preload = () => {
    if (navigator.onLine === false) return;
    const z = map.getZoom(), v = map.getPixelBounds();
    map.eachLayer(l => {
      // online layers only: the stored tiles are there at once (padded, they also cover a zoom out), so asking scoreAhead only cost requests
      // and not the online imagery (round 14): each Esri tile counts against the owner's free monthly tiles, and zooming in alone asks 4× the view
      if (!(l instanceof L.TileLayer) || !l._url || l._url === LOCAL_TILES?.url || l._url === IMAGERY.url || !l.options.bounds) return;
      const o = l.options, lb = L.latLngBounds(o.bounds), tb = L.bounds(map.project(lb.getNorthWest(), z), map.project(lb.getSouthEast(), z));
      // only the view inside the layer's bounds, as Leaflet asks: beyond them were 404s (local) and labels under the mask, 7× the tiles on screen at startup
      const x0 = Math.max(v.min.x, tb.min.x), y0 = Math.max(v.min.y, tb.min.y), x1 = Math.min(v.max.x, tb.max.x), y1 = Math.min(v.max.y, tb.max.y);
      if (x0 > x1 || y0 > y1) return;
      for (const dz of [1, -1]) {
        const z2 = Math.round(z) + dz; if (z2 < (o.minZoom ?? 0) || z2 > o.maxZoom) continue;
        const nz = Math.max(o.minNativeZoom ?? 0, Math.min(o.maxNativeZoom ?? z2, z2)), s = map.getZoomScale(nz, z) / 256; // the zoom its tiles exist at
        for (let x = Math.floor(x0 * s); x <= Math.floor(x1 * s); x++) for (let y = Math.floor(y0 * s); y <= Math.floor(y1 * s); y++) {
          const url = L.Util.template(l._url, { ...o, x, y, z: nz }); if (asked.has(url)) continue;
          asked.add(url); new Image().src = url;
        }
      }
    });
  };
  map.on('moveend', () => { clearTimeout(t); t = setTimeout(() => (window.requestIdleCallback || setTimeout)(preload), 600); });
  // Round 17 M: our base tiles (z7-z10, the whole island, a few dozen small files) are read once when the map first rests and kept in memory,
  // so the base under every zoom (above) draws at once anywhere the map goes
  const base = [];
  map.once('moveend', () => (window.requestIdleCallback || setTimeout)(() => {
    if (LOCAL_TILES?.index) for (let z = LOCAL_TILES.minZoom; z <= Math.min(10, LOCAL_TILES.maxZoom); z++) {
      const [x0, y0, w, h] = LOCAL_TILES.index[z] || [0, 0, 0, 0];
      for (let i = 0; i < w * h; i++) { const c = { z, x: x0 + i % w, y: y0 + (i / w | 0) }; if (ownTile(c)) { const im = new Image(); im.src = L.Util.template(LOCAL_TILES.url, c); base.push(im); } }
    }
  }));
}
{ // everything outside the island's waters (e.g. the mainland on large low-zoom tiles) goes dark
  const v = MASK_BOX, [s, w, n, e] = [v.getSouth(), v.getWest(), v.getNorth(), v.getEast()];
  // SVG, not canvas: a flat fill around a rectangle draws as solid-colour and empty tiles that need no GPU memory, where a canvas
  // was one more full-screen texture (2× pixels on phones) blended at every frame
  // Its colour is css/map-fx.css's --mask (the graded open sea), over the fill given here and the one js/mobile.js sets on phones
  L.polygon([[[20, 20], [20, 50], [50, 50], [50, 20]], [[s, w], [n, w], [n, e], [s, e]]], { pane: 'mask', renderer: L.svg({ pane: 'mask' }), interactive: false, stroke: false, fillColor: '#05080b', fillOpacity: 1, className: 'ps-mask' }).addTo(map);
  // Its edge, and the heat's at the grid's (just inside), fade into it over ~6% of the box: the chart sinks into the sea instead of ending
  // in a hard rectangle (a phone shows all four sides at the start). Static vector, drawn with the mask; 6% keeps Cape Andreas clear.
  // (round 17 Z: the fade is the 'mask-fade' view box, after ViewBox below)
}
// Round 11: the heat (softCells, paintFine) and the depth chart (js/chart.js) also fade out over the grid's last 4 km themselves, so where
// the grid's edge shows inside the mask's box (the west) they end in open sea, not in a hard line.
const FADE_C = 16, edgeF = (k, n) => Math.min(1, (k + .5) / FADE_C, (n - k - .5) / FADE_C);
const EFX = Float32Array.from({ length: W }, (_, x) => edgeF(x, W)), EFY = Float32Array.from({ length: H }, (_, y) => edgeF(y, H));
// Round 17 Z (the owner: "why the map lags when zooming in and out ... fix the heatmap glitching when zooming in and out"). The heat used to
// be one element over the whole grid (L.svgOverlay: 1,093 px wide at zoom 9, 34,952 at zoom 14, 139,810 at zoom 16) under a CSS clip-path of
// the whole coastline: at every frame of a pinch the browser scaled, rasterised and masked that, so the map froze and the heat showed
// stretched and unclipped until it caught up. ViewBox is what Leaflet's own canvas renderer is: a box the size of the view and a margin
// (pad), its pictures drawn into view-sized canvases ("parts"), scaled as one small layer by the zoom's own transform (as the tiles) and
// drawn again, crisp, when the map rests. Nothing in it is ever larger than the view and its margin.
//   add(draw, class, clip)  a part: a canvas over the whole box; draw(g, V) paints it (after 'sea' / 'coast': inside the shoreline clip)
//   draw(part)              paint one part again (part.on = false: its pixels are freed)
//   V                       the layout: zoom z, the box's top left (x, y) in world px at z, its size (w, h) in CSS px, dpr, and the grid's
//                           rectangle in box px (gx, gy, gw, gh: rounded as L.svgOverlay placed it, so the picture sits where it did); n: its number
// A layout is made when the map rests at another zoom or near the box's edge; during a pinch or a drag only when the view would leave the
// box (zooming out, a long fling): the parts are then drawn from the images they already have (no scoring). An animated zoom out lays the
// box out for the view it goes to before it starts (as the tiles ask for their target level), so the heat covers the screen all the way.
let SEA_P = null, SOUTH_P = null; // the sea (the grid minus every land ring), and the grid minus the north's area: unit paths over the grid (below)
function gridImage(g, V, src, fx0 = 0, fy0 = 0, fx1 = 1, fy1 = 1) { // src (covering the grid's fractions fx0..fx1, fy0..fy1) into a part, smoothed as CSS stretched it
  const k = V.dpr, X = (V.gx + fx0 * V.gw) * k, Y = (V.gy + fy0 * V.gh) * k, Wd = (fx1 - fx0) * V.gw * k, Hd = (fy1 - fy0) * V.gh * k, sw = src.width, sh = src.height;
  if (!sw || !sh || !(Wd > 0) || !(Hd > 0)) return;
  // only the source pixels under the canvas (and two around, so the smoothing at the cut's edge stays outside it): a 280,000 px wide target is never asked for
  const a = Math.max(0, Math.floor(-X / Wd * sw) - 2), b = Math.min(sw, Math.ceil((g.canvas.width - X) / Wd * sw) + 2), c = Math.max(0, Math.floor(-Y / Hd * sh) - 2), d = Math.min(sh, Math.ceil((g.canvas.height - Y) / Hd * sh) + 2);
  if (b > a && d > c) g.drawImage(src, a, c, b - a, d - c, X + a / sw * Wd, Y + c / sh * Hd, (b - a) / sw * Wd, (d - c) / sh * Hd);
}
const ViewBox = L.Layer.extend({
  options: { pane: 'overlayPane', pad: .25, opacity: 1 },
  initialize(el, o) { L.setOptions(this, o); this._el = el; this.parts = []; this.V = null; this._n = 0; el.style.cssText += ';position:absolute;left:0;top:0;pointer-events:none'; },
  add(draw, cls, clip, want) { // want(V): false where the part has nothing to show in this layout (its pixels are freed)
    const cv = L.DomUtil.create('canvas', cls || '', this._el); cv.width = cv.height = 0; cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:0'; // z-index: leaflet.css gives every canvas in a pane 100
    const p = { cv, draw, clip, want, on: true, g: null }; this.parts.push(p); return p;
  },
  onAdd(map) { L.DomUtil.addClass(this._el, 'leaflet-zoom-animated'); this.getPane().appendChild(this._el); this._el.style.opacity = this.options.opacity; this._lay(map.getCenter(), map.getZoom()); },
  onRemove() { this._el.remove(); for (const p of this.parts) p.cv.width = p.cv.height = 0; this.V = null; },
  getEvents() { return { zoom: this._onZoom, zoomanim: this._onAnim, move: this._onMove, moveend: this.sync, viewreset: this.sync }; },
  getElement() { return this._el; },
  setOpacity(o) { this.options.opacity = o; this._el.style.opacity = o; return this; },
  rect(b) { b = L.latLngBounds(b); const V = this.V, m = this._map, p = m.project(b.getNorthWest(), V.z)._round(), q = m.project(b.getSouthEast(), V.z)._round(); return [p.x - V.x, p.y - V.y, q.x - p.x, q.y - p.y]; }, // bounds in box px
  draw(p) {
    const V = this.V, cv = p.cv; if (!V) return;
    if (!p.on || p.want && !p.want(V)) { if (cv.width && !p.keep) cv.width = cv.height = 0; return; } // (keep: off for a moment, its canvas kept)
    const w = Math.round(V.w * V.dpr), h = Math.round(V.h * V.dpr), g = p.g ||= cv.getContext('2d');
    // a clipped part lies inside the grid: only the grid's rectangle on the canvas is cleared, drawn and masked (on the island's view a sixth
    // of the canvas; where the canvas has no GPU every pixel of it is the main thread's)
    const k = V.dpr, rx = p.clip ? Math.max(0, Math.floor(V.gx * k)) : 0, ry = p.clip ? Math.max(0, Math.floor(V.gy * k)) : 0;
    const rw = (p.clip ? Math.min(w, Math.ceil((V.gx + V.gw) * k)) : w) - rx, rh = (p.clip ? Math.min(h, Math.ceil((V.gy + V.gh) * k)) : h) - ry;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } else g.clearRect(0, 0, w, h);
    if (rw <= 0 || rh <= 0) return;
    g.save();
    if (p.clip) { g.beginPath(); g.rect(rx, ry, rw, rh); g.clip(); }
    // mask: a part of this box already drawn inside the 'sea' clip, opaque there (the heat's shade). The other 'sea' parts are cut to its
    // pixels (one blit) instead of clipping to the coast's path again: a scrub draws a part at every frame, and the path has ~11,000 points
    const m = p.clip === 'sea' && this.mask && this.mask !== p && this.mask.cv.width === w && this.mask.cv.height === h ? this.mask : null;
    if (p.clip && SEA_P && !m) { g.setTransform(V.gw * V.dpr, 0, 0, V.gh * V.dpr, V.gx * V.dpr, V.gy * V.dpr); if (p.clip === 'sea' && SOUTH_P) g.clip(SOUTH_P, 'evenodd'); g.clip(SEA_P, 'evenodd'); g.setTransform(1, 0, 0, 1, 0, 0); }
    p.draw(g, V);
    if (m) { g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1; g.drawImage(m.cv, rx, ry, rw, rh, rx, ry, rw, rh); }
    g.restore();
  },
  _lay(center, zoom, zooming) {
    const m = this._map, s = m.getSize(), pad = this.options.pad, w = Math.round(s.x * (1 + 2 * pad)), h = Math.round(s.y * (1 + 2 * pad)), c = m.project(center, zoom);
    const V = this.V = { z: zoom, x: Math.round(c.x - w / 2), y: Math.round(c.y - h / 2), w, h, dpr: Math.min(2, devicePixelRatio || 1), n: ++this._n };
    [V.gx, V.gy, V.gw, V.gh] = this.rect(GRID_BOUNDS);
    this._el.style.width = w + 'px'; this._el.style.height = h + 'px';
    this._place(center, zoom);
    for (const p of this.parts) this.draw(p);
    this.fire('lay', { zooming });
  },
  _place(center, zoom) { // the box where the map shows its layout at this centre and zoom (as GridLayer._setZoomTransform)
    const V = this.V, m = this._map, k = m.getZoomScale(zoom, V.z), t = L.point(V.x, V.y).multiplyBy(k).subtract(m._getNewPixelOrigin(center, zoom));
    L.DomUtil.setTransform(this._el, k === 1 ? t.round() : t, k);
  },
  _covers(center, zoom, margin = 0) { // the view at this centre and zoom lies inside the box (margin: and this share of the view around it)
    const V = this.V, m = this._map, k = m.getZoomScale(zoom, V.z), s = m.getSize(), c = m.project(center, zoom), mx = s.x * margin, my = s.y * margin;
    return c.x - s.x / 2 - mx >= V.x * k - 1 && c.y - s.y / 2 - my >= V.y * k - 1 && c.x + s.x / 2 + mx <= (V.x + V.w) * k + 1 && c.y + s.y / 2 + my <= (V.y + V.h) * k + 1;
  },
  _onZoom() { // each frame of a pinch or a flight (and the start and end of an animated zoom): the transform only; a new layout where the view leaves the box, or the picture is shown at over 1.6 times its size (the shoreline stays crisp)
    const m = this._map, c = m.getCenter(), z = m.getZoom(); if (!this.V) return;
    if (!m._animatingZoom && (!this._covers(c, z) || m.getZoomScale(z, this.V.z) > 1.6)) this._lay(c, z, true); else this._place(c, z);
  },
  _onAnim(e) { // an animated zoom starts (Leaflet's CSS transition, .25 s): to where it ends; zooming out past the box, the layout it ends on first
    if (!this.V) return;
    if (!this._covers(e.center, e.zoom)) {
      const m = this._map, el = this._el;
      el.style.transition = 'none'; this._lay(e.center, e.zoom); this._place(m.getCenter(), m.getZoom());
      el.offsetWidth; el.style.transition = ''; // ponytail: one style flush as the animation starts, as Leaflet's tile levels do (the new layout's start must not animate in from the old one's transform)
    }
    this._place(e.center, e.zoom);
  },
  _onMove() { const m = this._map; if (this.V && !m._animatingZoom && m.getZoom() === this.V.z && !this._covers(m.getCenter(), this.V.z)) this._lay(m.getCenter(), this.V.z); }, // a drag or fling past the margin
  sync() { // the map rests (moveend): a layout for this zoom and size, with at least half its margin left on every side; true if a new one was made
    const m = this._map; if (!m || !this.V || m._animatingZoom) return false;
    const c = m.getCenter(), z = m.getZoom(), s = m.getSize(), V = this.V;
    if (V.z === z && V.w === Math.round(s.x * (1 + 2 * this.options.pad)) && V.h === Math.round(s.y * (1 + 2 * this.options.pad)) && this._covers(c, z, this.options.pad / 2)) { this._place(c, z); return false; }
    this._lay(c, z); return true;
  },
});
// The mask's faded edges (see the mask above): drawn into a view-sized canvas, and only where a band is in or near the view: as an SVG over the
// whole box it was one more element 36,000 px wide at zoom 14.
{
  const v = MASK_BOX;
  const box = new ViewBox(L.DomUtil.create('div', 'mask-fade'), { pane: 'mask' }), FX = .06, FY = .08; let col = null;
  const near = V => { const [x, y, w, h] = box.rect(v); return !(x + FX * w < 0 && y + FY * h < 0 && x + w - FX * w > V.w && y + h - FY * h > V.h); }; // false: the view box lies inside the bands
  box.add((g, V) => {
    col ||= (getComputedStyle(map.getPane('mask')).getPropertyValue('--mask').trim() || '#05080b').replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3');
    const k = V.dpr, [x, y, w, h] = box.rect(v).map(t => t * k), band = (x0, y0, x1, y1, bx, by, bw, bh) => { // from (x0, y0), the mask's colour whole, to (x1, y1), none
      const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, a] of [[0, 1], [.3, .72], [.6, .3], [1, 0]]) gr.addColorStop(o, col + Math.round(a * 255).toString(16).padStart(2, '0'));
      g.fillStyle = gr; g.fillRect(bx, by, bw, bh);
    };
    band(x, 0, x + FX * w, 0, x, y, FX * w, h); band(x + w, 0, x + w - FX * w, 0, x + w - FX * w, y, FX * w, h);
    band(0, y, 0, y + FY * h, x, y, w, FY * h); band(0, y + h, 0, y + h - FY * h, x, y + h - FY * h, w, FY * h);
  }, '', null, near);
  box.addTo(map);
}
// The heat image: two layers in one view box, repainted in place (paint), so a settled change cross-fades from the old picture to the new
// (css/map-fx.css) and scrubbing swaps at once. Each layer keeps its images off screen: a coarse canvas (the whole grid: a pixel a cell, zoomed
// out one per d×d cells: softCells, boxDown), zoomed in a fine one over the view (paintFine), the island view's glow (drawGlow) and the chance
// lines at 50 / 65 / 80 as paths (drawIso); compose() draws them into the layer's part of the box, inside the shoreline clip.
const heatBox = L.DomUtil.create('div', 'heat-box');
const heat = new ViewBox(heatBox, { pane: 'heat' });
// The sea under the heat a shade darker (inside the shoreline clip), so the low blues and greens still read over bright shallows: its own part,
// under both layers (in each layer it would double while one fades in over the other)
// (drawn opaque and shown at .26, so it is also the box's mask: ViewBox.draw)
heat.mask = heat.add(g => { g.fillStyle = 'rgb(2 10 22)'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); }, 'heat-sea', 'sea'); heat.mask.cv.style.opacity = .26;
const heatLayers = [0, 1].map(n => {
  const [c, fine] = [0, 1].map(() => document.createElement('canvas'));
  c.width = W; c.height = H; fine.width = fine.height = 0;
  const ctx = e => e.getContext('2d', { willReadFrequently: true }); // plain (CPU) canvases: their pixels are written and drawn from, never shown themselves
  const lay = { ctx: ctx(c), fine, fctx: ctx(fine), fineOn: false, cut: null, iso: null, isoAt: 0, gl: null, glOn: false, glOp: 0 };
  lay.part = heat.add((g, V) => compose(lay, g, V), 'heat-layer', 'sea'); lay.el = lay.part.cv; // el: what a fade shows, hides and stacks
  if (n) { lay.el.style.visibility = 'hidden'; lay.part.on = false; }
  return lay;
});
function compose(lay, g, V) { // a layer's picture into its part: glow, coarse image, the fine image in its cut, the chance lines
  if (lay.glOn && lay.gl?.width) { g.globalAlpha = lay.glOp; gridImage(g, V, lay.gl); g.globalAlpha = 1; }
  gridImage(g, V, lay.ctx.canvas);
  if (lay.fineOn && lay.cut) gridImage(g, V, lay.fine, lay.cut.x0 / W, lay.cut.y0 / H, lay.cut.x1 / W, lay.cut.y1 / H);
  if (lay.iso) strokeIso(g, V, lay.iso);
}
// A pinch out past the fine image (the view and a quarter around it, as it was painted): beyond it the 250 m picture showed, broader than the
// 50 m one inside, as a frame around the middle of the screen until the fingers lifted. The box's new layouts during a pinch (a few per
// gesture) paint the fine image for the view they show.
heat.on('lay', e => {
  if (!e.zooming || !F || !scored) return;
  const lay = heatLayers[liveLayer], p = lay.cut, c = fineCut();
  if (p && c && lay.fineOn && (c.z < p.z || c.view[0] < p.x0 || c.view[1] < p.y0 || c.view[2] > p.x1 || c.view[3] > p.y1)) paint('auto'); // (c.z < p.z: zooming out, the view is at the fine image's edge when the box is laid out again, and past it a frame later) // (fading where the pinch leaves the 50 m range)
});
// off the map; its view canvas is kept until freeLayer (1.5 s after the last fade): a scrub or a play takes each layer in turn, and making a
// screen-sized canvas anew for every hour was a long task of its own
const hideLay = l => { l.el.style.visibility = 'hidden'; l.out?.cancel(); l.out = null; l.part.on = false; l.part.keep = true; };
let liveLayer = 0; // the layer on show
// The clip trims the heat at the water's edge (and the north's line): the spread (zoomed out) may then run onto the land, and over the line
const CLIP = !!window.PSAREMA_COAST, NCLIP = CLIP && !!NORTH_AREA?.outline;
if (CLIP) { // clip the heat at the real shoreline (data/coast.js): 250 m cells would otherwise spill onto beaches and rocks
  const m = d => Math.log(Math.tan(Math.PI / 4 + d * Math.PI / 360)), mN = m(NORTH), mS = m(NORTH - H * RES); // the image is stretched in Mercator
  const fx = lo => ((lo - WEST) / (W * RES)).toFixed(5), fy = la => ((mN - m(la)) / (mN - mS)).toFixed(5);
  let d = 'M0 0H1V1H0Z', n = d; // the sea = the whole image minus every land ring (even-odd); n: minus the north's area, which has no data
  for (const r of PSAREMA_COAST) { d += 'M'; for (let k = 0; k < r.length; k += 2) d += `${k ? 'L' : ''}${fx(r[k + 1])} ${fy(r[k])}`; d += 'Z'; }
  for (const r of NORTH_AREA?.outline || []) n += 'M' + r.map(([la, lo]) => `${fx(lo)} ${fy(la)}`).join('L') + 'Z';
  // Canvas clips (ViewBox.draw), not a CSS clip-path: 'sea' is the shore and the north's line (the heat, spread over it zoomed out: NCLIP, ends
  // there crisply), 'coast' the shore alone, the north's waters too (js/chart.js seabed relief)
  SEA_P = new Path2D(d); if (NCLIP) SOUTH_P = new Path2D(n);
}
const pins = L.layerGroup(), zones = L.layerGroup(); // zones: the chance lines' switch (ui.js LAYER_OBJ); the lines themselves are drawn in the heat (drawIso)
const spotRenderer = L.canvas({ pane: 'spots', tolerance: 4 }), sightLayer = L.layerGroup(), sightRenderer = L.canvas({ pane: 'sight' });
const spotLayers = { fishing: L.layerGroup(), structure: L.layerGroup(), access: L.layerGroup(), beach: L.layerGroup() };
const px = new Uint8ClampedArray(N * 4), px32 = new Uint32Array(px.buffer), heatData = new ImageData(px, W, H); // the heat image: RGBA, rows top-down (heatData shares px)

for (const s of SPOTS) {
  const [name, t, la, lo] = s, g = SPOT_GROUP[t]; if (!g) continue;
  L.circleMarker([la, lo], { renderer: spotRenderer, radius: g === 'fishing' ? 4.5 : g === 'beach' ? 3 : 3.5, weight: 1, color: '#05080b',
    fillColor: GROUP_COLOR[g], fillOpacity: g === 'beach' ? .75 : .95, bubblingMouseEvents: false })
    .bindTooltip(() => esc(name || tr('spot')[t]), { direction: 'top', offset: [0, -4] })
    .on('click', () => openSpot(s))
    .addTo(spotLayers[g]);
}
for (const g in spotCount) $('#n-' + g).textContent = spotCount[g].toLocaleString();

// Round 16: closed water drawn as closed, not as weak water (the old black fill read as "weak"). Each zone as the score treats it (zoneCls: its
// kind and data/protected.js "rec", as js/core.js zoneCode and zoneShut, for the hour's month and the method):
//   'ban'   no fishing for anglers (no-take, rec banned, a seasonal zone while shut): a dense light hatch, a white dashed edge, the heat under it
//           greyed (paint), "No fishing";
//   'dim'   the rule text does not settle it, so the score dims it (x.35): a sparser hatch, the heat as it is, "Check rules", its tap says so;
//   'rules' no recreational ban confirmed (rec open, a seasonal zone while open): a thin dashed edge and the full heat, "Rules apply" (its tap
//           says to check with DFMR; never "fishing allowed").
// Labels from zoom 11, where they fit, never over each other; zones from zoom 9.5 (css/map-fx.css). A zone inside a larger one of its class (an
// MPA's core in its neutral zone) has no edge of its own: one dashed outline per area. Natura 2000 sites (no fishing ban confirmed, no rule) are
// not drawn: they were the dashed boxes off Paphos and the straight lines off Akamas; the tap card still names them (ui.js zoneNote).
// (padding .5, round 17 Z: Leaflet's .1 left a bare band of unhatched water at the screen's edges while a pinch zoomed out; a view each way covers a whole level)
const protLayer = L.layerGroup(), protSvg = L.svg({ pane: 'prot', padding: .5 }), ZONES = [];
function zoneCls(z, month, mode) { // month 0-11
  if (z.kind === 'no-take' || z.rec === 'banned') return 'ban';
  if (z.rec === 'open') return 'rules';
  if (z.rec && typeof z.rec === 'object') return z.rec[mode]?.includes(month + 1) ? 'ban' : 'rules'; // seasonal (Lara): shut for this method this month
  return 'dim';
}
console.assert(zoneCls({ kind: 'restricted', rec: { boat: [6] } }, 5, 'boat') === 'ban' && zoneCls({ kind: 'restricted', rec: { boat: [6] } }, 5, 'shore') === 'rules' &&
  zoneCls({ kind: 'restricted' }, 0, 'boat') === 'dim' && zoneCls({ kind: 'restricted', rec: 'open' }, 0, 'boat') === 'rules', 'zone classes');
const ZWORD = { ban: 'pz_ban', dim: 'pz_dim', rules: 'pz_rules' };
document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><pattern id="pz-h1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
  '<rect width="6" height="6" fill="#fff" fill-opacity=".05"/><path d="M1 0V6" stroke="#fff" stroke-opacity=".5" stroke-width="1.3"/></pattern>' + // the hatches (css/map-fx.css .pz-ban, .pz-dim), fixed to the map
  '<pattern id="pz-h2" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M1 0V9" stroke="#fff" stroke-opacity=".3" stroke-width="1"/></pattern></svg>');
const inRings = (la, lo, rs) => { let c = false; for (const r of rs) for (let a = 0, b = r.length - 1; a < r.length; b = a++) if ((r[a][0] > la) !== (r[b][0] > la) && lo < (r[b][1] - r[a][1]) * (la - r[a][0]) / (r[b][0] - r[a][0]) + r[a][1]) c = !c; return c; };
{
  const area = r => { let s = 0; for (let a = 0, b = r.length - 1; a < r.length; b = a++) s += (r[b][1] - r[a][1]) * (r[b][0] + r[a][0]); return Math.abs(s / 2); };
  for (const z of PROT?.zones || []) {
    if (z.kind !== 'no-take' && z.kind !== 'restricted') continue;
    const r = z.rings[0], c = r.reduce((a, p) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length], [0, 0]);
    if (inNorth(...c)) continue; // the north has no data
    const Z = { z, r, c, A: area(r), grp: z.name.split(' - ')[0], q: r.map(p => [c[0] + (p[0] - c[0]) * .9, c[1] + (p[1] - c[1]) * .9]), cls: '', b: L.latLngBounds(r) };
    Z.path = L.polygon(z.rings, { pane: 'prot', renderer: protSvg, className: 'pz', color: '#fff', dashArray: '5 4', fillColor: '#fff', fillOpacity: 0 })
      .bindTooltip(() => `<b>${esc(zoneName(z))}</b><br>${esc(tr(ZWORD[Z.cls]))}: ${esc(zoneRules(z))}${Z.cls === 'dim' ? ' ' + esc(tr('pz_unclear')) : Z.cls === 'rules' && !/DFMR/.test(z.rules) ? ' ' + esc(tr('pz_dfmr')) : ''}`, { sticky: true }).addTo(protLayer);
    Z.lab = L.marker(c, { pane: 'labels', interactive: false, keyboard: false, icon: L.divIcon({ className: 'pz-lab', html: '<span></span>', iconSize: [0, 0] }) });
    ZONES.push(Z);
  }
  // inside another of its MPA, or most of its outline (drawn 10% in towards its middle) in the other's
  for (const Z of ZONES) Z.outer = ZONES.filter(O => O !== Z && O.A > Z.A && (O.grp === Z.grp || Z.q.filter(([la, lo]) => inRings(la, lo, [O.r])).length >= .8 * Z.q.length));
}
$('#n-protected').textContent = PROT ? String(ZONES.length) : '–';
let zoneKey = '';
function zoneSync() { // each zone's class for the hour's month and the method: its look, and which heat paint greys
  const month = (hours?.[state.h] || hours?.[0])?.month ?? new Date().getMonth(), key = month + state.mode;
  if (key === zoneKey) return; zoneKey = key;
  for (const Z of ZONES) Z.cls = zoneCls(Z.z, month, state.mode);
  for (const Z of ZONES) {
    Z.path.setStyle({ stroke: !Z.outer.some(O => O.cls === Z.cls), weight: Z.cls === 'rules' ? 1 : 1.5, opacity: Z.cls === 'ban' ? .95 : Z.cls === 'dim' ? .75 : .6, dashArray: Z.cls === 'rules' ? '3 4' : '5 4' });
    Z.path.options.className = 'pz pz-' + Z.cls; Z.path.getElement?.()?.setAttribute('class', 'pz pz-' + Z.cls + ' leaflet-interactive');
    Z.labOn = !Z.outer.some(O => O.cls === Z.cls && O.grp === Z.grp); // one label per area and class: on its largest part
  }
  zoneGrey = null; zoneLabels();
}
// Round 16 X: the legend, the top bar and the scale over the map, in map-container px, are read once and again only when one of them resizes,
// the map does, or the phone sheet's peek moves them (--m-peek): reading their rects at every moveend forced a layout in the pan's last task.
let zoneBoxes = null, zoneBoxKey = '';
const zoneRO = window.ResizeObserver && new ResizeObserver(() => { zoneBoxes = null; zoneLabels(); });
function zoneBoxesNow() {
  const els = [$('#map-legend'), $('#mobile-bar'), $('.ps-scale')], s = map.getSize(), key = `${s.x},${s.y},${els[0]?.style.getPropertyValue('--m-peek')}`;
  if (zoneBoxes && key === zoneBoxKey) return zoneBoxes;
  const mb = map.getContainer().getBoundingClientRect(); zoneBoxKey = key; zoneBoxes = [];
  for (const e of els) { if (!e) continue; zoneRO?.observe(e); const r = e.getBoundingClientRect(); if (r.width) zoneBoxes.push([r.left - 4 - mb.left, r.top - 4 - mb.top, r.right + 4 - mb.left, r.bottom + 4 - mb.top]); }
  return zoneBoxes;
}
function zoneLabels() { // from zoom 11: each zone's word on its water, where the zone is big enough on screen, clear of the other labels and the place names
  if (!map.hasLayer(protLayer)) return;
  const z = map.getZoom(), view = map.getBounds().pad(.2), placed = [], names = z >= 11 ? window.PsMarks?.placeAt?.(z) || [] : [], wp = ll => map.project(ll, z);
  for (const n of names) placed.push(n.b || [n.x - 7, n.y - 7, n.x + 7, n.y + 7]); // the names and symbols js/map-marks.js drew at this zoom, in the same world pixels
  const wc = (x, y) => map.containerPointToLayerPoint([x, y]).add(map.getPixelOrigin()); // container px to world px
  for (const r of zoneBoxesNow()) { const a = wc(r[0], r[1]), b = wc(r[2], r[3]); placed.push([a.x, a.y, b.x, b.y]); }
  for (const Z of [...ZONES].sort((a, b) => (a.cls === 'ban' ? 0 : 1) - (b.cls === 'ban' ? 0 : 1) || b.A - a.A)) {
    let at = null;
    if (z >= 11 && Z.labOn && Z.cls && view.intersects(Z.b)) {
      const p0 = wp(Z.b.getNorthWest()), p1 = wp(Z.b.getSouthEast()), w = tr(ZWORD[Z.cls]).length * 5.6 + 12;
      Z.sea ||= (() => { // the sea cell inside the zone nearest its middle (a C-shaped zone's middle can be on land)
        let best = Z.c, bd = Infinity;
        for (let y = Math.floor((NORTH - Z.b.getNorth()) / RES); y <= Math.floor((NORTH - Z.b.getSouth()) / RES); y++) for (let x = Math.floor((Z.b.getWest() - WEST) / RES); x <= Math.floor((Z.b.getEast() - WEST) / RES); x++) {
          const la = NORTH - (y + .5) * RES, lo = WEST + (x + .5) * RES, d = (la - Z.c[0]) ** 2 + ((lo - Z.c[1]) * .82) ** 2;
          if (d < bd && depth[y * W + x] && inRings(la, lo, Z.z.rings)) { bd = d; best = [la, lo]; }
        }
        return best;
      })();
      const p = wp(Z.sea);
      const zw = p1.x - p0.x, zh = p1.y - p0.y;
      if (zw >= Math.min(w, 60) && zh >= 14) for (const [dx, dy] of [[0, 0], [0, -zh / 4], [0, zh / 4], [-zw / 4, 0], [zw / 4, 0], [0, -16], [0, 16]]) { // on its water, else elsewhere in it
        const box = [p.x + dx - w / 2, p.y + dy - 9, p.x + dx + w / 2, p.y + dy + 9], ll = map.unproject([p.x + dx, p.y + dy], z);
        const j = Math.floor((NORTH - ll.lat) / RES) * W + Math.floor((ll.lng - WEST) / RES); if (!depth[j] || (dx || dy) && Math.abs(dy) !== 16 && !inRings(ll.lat, ll.lng, Z.z.rings)) continue; // on water, in the zone
        if (placed.every(q => q[0] > box[2] || q[2] < box[0] || q[1] > box[3] || q[3] < box[1])) { placed.push(box); at = ll; break; }
      }
    }
    // only what changed: a label that stays where it was is not touched (each write was a style pass at every moveend)
    if (!at) { if (Z.labAt) { protLayer.removeLayer(Z.lab); Z.labAt = null; } continue; }
    if (!Z.labAt?.equals(at)) Z.lab.setLatLng(at);
    if (!Z.labAt) protLayer.addLayer(Z.lab);
    Z.labAt = at;
    const e = Z.lab.getElement()?.firstChild, word = tr(ZWORD[Z.cls]), cls = 'pz-w-' + Z.cls;
    if (e && e.textContent !== word) e.textContent = word;
    if (e && e.className !== cls) e.className = cls;
  }
}
map.on('moveend', zoneLabels); // the legend grows (the 50 m line): labels keep clear of it (zoneRO)
protLayer.on('add', () => { zoneKey = ''; zoneSync(); if (F && scored) paint(); }).on('remove', () => { if (F && scored) paint(); }); // the greyed heat comes and goes with the zones
new MutationObserver(() => zoneLabels()).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
// The heat under 'ban' zones greyed (paint): the coarse image a pixel a cell, by its centre in the outline (zoneGrey); the fine one by
// the outlines drawn at its own resolution (greyFine). Most of the colour goes and a third of the opacity: still there, plainly not to be fished.
let zoneGrey = null, zmc = null, zmask = null;
const greyPx = p => { const r = p & 255, g = p >>> 8 & 255, b = p >>> 16 & 255, l = (r * 77 + g * 151 + b * 28) >> 8; return ((p >>> 24) * .66 << 24 | b + (l - b) * .85 << 16 | g + (l - g) * .85 << 8 | r + (l - r) * .85) >>> 0; };
const zImgY = (() => { const m = d => Math.log(Math.tan(Math.PI / 4 + d * Math.PI / 360)), mN = m(NORTH), mS = m(NORTH - H * RES); return la => (mN - m(la)) / (mN - mS) * H; })(); // a latitude's image row
function zoneGreyList() { // image pixels (y·W + x) whose cell centre lies in a 'ban' zone
  const set = new Set();
  for (const Z of ZONES) {
    if (Z.cls !== 'ban') continue;
    const xa = Math.max(0, Math.floor((Z.b.getWest() - WEST) / RES)), xb = Math.min(W - 1, Math.floor((Z.b.getEast() - WEST) / RES));
    const ya = Math.max(0, Math.floor(zImgY(Z.b.getNorth())) - 1), yb = Math.min(H - 1, Math.ceil(zImgY(Z.b.getSouth())) + 1);
    for (let y = ya; y <= yb; y++) { const la = NORTH - (MROW[y] + .5) * RES; for (let x = xa; x <= xb; x++) if (inRings(la, WEST + (x + .5) * RES, Z.z.rings)) set.add(y * W + x); }
  }
  return Int32Array.from(set);
}
function greyFine(c, d32, fw, fh) { // the fine image's pixels under a 'ban' zone
  const { x0, x1, y0, y1 } = c, hit = [];
  for (const Z of ZONES) {
    if (Z.cls !== 'ban') continue;
    Z.img ||= (() => { const p = new Path2D(); for (const r of Z.z.rings) { r.forEach(([la, lo], k) => p[k ? 'lineTo' : 'moveTo']((lo - WEST) / RES, zImgY(la))); p.closePath(); } return { p, b: [(Z.b.getWest() - WEST) / RES, zImgY(Z.b.getNorth()), (Z.b.getEast() - WEST) / RES, zImgY(Z.b.getSouth())] }; })();
    const b = Z.img.b; if (b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0) hit.push(Z.img.p);
  }
  if (!hit.length) return;
  // Round 16 engine: the mask is kept while the cut and the zones stay as they are (every hour of a scrub, every repaint of a view): filling
  // the canvas and reading it back cost a paint ~10–40 ms on a phone.
  const key = [x0, x1, y0, y1, fw, fh, zoneKey, hit.length].join();
  if (zmask?.key !== key) {
    zmc ||= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const cv = zmc.canvas; if (cv.width !== fw || cv.height !== fh) Object.assign(cv, { width: fw, height: fh }); else zmc.clearRect(0, 0, fw, fh);
    const kx = fw / (x1 - x0), ky = fh / (y1 - y0); zmc.setTransform(kx, 0, 0, ky, -x0 * kx, -y0 * ky);
    for (const p of hit) zmc.fill(p);
    zmc.setTransform(1, 0, 0, 1, 0, 0);
    zmask = { key, m: zmc.getImageData(0, 0, fw, fh).data };
  }
  const m = zmask.m;
  for (let o = 0, n = fw * fh; o < n; o++) if (m[o * 4 + 3] > 127 && d32[o]) d32[o] = greyPx(d32[o]);
}

// Each fish's markers are made once (All fish: ~1,500, ~12 ms) and kept; a method change leaves the set on the map as it is.
const sightSets = new Map(); let sightOn = null;
function drawSightings() { // recorded sightings of the selected fish; All fish: every fish's, drawn lighter
  if (sightOn === sp.id) return;
  sightLayer.clearLayers(); sightOn = sp.id;
  let set = sightSets.get(sp.id);
  if (!set) {
    const all = !!sp.all, pts = [];
    for (const id of all ? Object.keys(SIGHT) : [sp.id]) { const s = all ? byId(id) : sp; if (s) for (const r of SIGHT[id] || []) if (!inNorth(r[0], r[1])) pts.push([r, s]); }
    sightSets.set(sp.id, set = pts.map(([[la, lo, yr], s]) => L.circleMarker([la, lo], { renderer: sightRenderer, pane: 'sight', radius: all ? 2 : 3, stroke: !all, weight: 1,
      color: '#05080b', fillColor: '#5ee0b0', fillOpacity: all ? .55 : .9 }).bindTooltip(() => `${esc(fishName(s))}${yr ? ` · ${yr}` : ''}`, { direction: 'top' })));
  }
  for (const m of set) sightLayer.addLayer(m);
}

let contours = null;
function buildContours() { contours = window.PsChart?.lines || null; } // Depth lines: the depth chart's lines and numbers over the satellite (js/chart.js)

/* ---------- Rendering ---------- */
const LUT = new Uint8ClampedArray(101 * 4), LUT32 = new Uint32Array(LUT.buffer); // LUT32: the same bytes, one pixel per entry
// Contour bands (a layer option): each score drawn in its 10-point band's middle colour (40–49 as 45), so the chance reads as iso-bands
const BAND = Uint8Array.from({ length: 101 }, (_, s) => Math.min(100, s - s % 10 + 5)), LUTB = new Uint8ClampedArray(101 * 4), LUTB32 = new Uint32Array(LUTB.buffer);
const ON = new Uint8Array(101); // 1 where a score shows (paintFine interpolates between those only)
// Round 15: what the paint reads, a colour every tenth of a point (LUT above stays one a point). The blurred and interpolated
// field is fractional; looked up a whole point at a time, a weak hour (its ramp stretched over 1 … 17) drew every point as a band of its own,
// and the bands' edges as steps. Bands (the Contour bands option) stay whole points: LUTFB32[k] is the band of k / 10.
const LUTF32 = new Uint32Array(1001), LUTFB32 = new Uint32Array(1001), px32Of = c => (c[0] | c[1] << 8 | c[2] << 16 | c[3] << 24) >>> 0;
// Round 9: Hide below hides real scores, except a fish's best 25 points of the hour: dusky grouper at its best 52 had 462 of its 23,649 cells
// at 40+, a few specks; its best 25 points draw where it is best.
// Round 17 (the owner: "each day's heatmap looks too identical"): one fixed colour scale per fish and method, the same on every day and hour,
// so a rough day reads duller and a good one glows. Round 16's ramp ranked the water shown each hour (its top 5 % always red, the next 20 %
// amber), which made every day the same picture (agent D: 30–50 % of the top 5 % cells change between days; the colours hid it).
//   LEVEL  the fish's own reference for the method: what its best water scores on a good day, 70 % of its ceiling in perfect conditions
//          (100 · its best where-fit · its best season-and-hour factor over the forecast: levelOf; the fixture week's calm day reaches 67 %).
//          Fixed for the fish and method; never read from the day's sea. A day better than that is red; a rough one stays cool.
//   FIX    the ramp over the score as a share of LEVEL (core.js HEAT positions), with its points at 20 / 40 / 80 % as the rating's steps. Most
//          of its colours sit inside 40–80 %: green at 40, yellow by 55, orange by 70, red from 80.
//   AFLOOR fair and good water drawn at least half opaque, so an ordinary day still reads as colour, not grey.
// On the fixture week (scripts/fit/r16-time/mkfc-week.mjs) dusky grouper by boat tops 25 on the rough day and 42 on the calm one, 89–100 % of
// its water under 20: on the absolute score (LEVEL 100) every day was a faint blue (round 17, try a3). Colours are not comparable across fish
// (no level for that yet): when agent S's per-fish level ships, it replaces levelOf here, the one place; LEVEL = 100 is the plain score.
// The top-spot pins stay relative (drawTop): they still show where today's best water is. ANC still ranks the hour's water (its histogram
// SHARE: workHour), for the whole island's glow only (drawGlow: where; the colour is FIX's).
let rangeHi = 95, ANC = [1, 1, 1, 95], LEVEL = 100;
const SHARE = new Uint32Array(101);
const FIX = [[0, 36], [10, 40], [20, 46], [40, 56], [50, 61.5], [60, 67], [70, 73], [80, 81], [90, 88], [100, 95]]; // [% of LEVEL, position on core.js HEAT]
const AFLOOR = n => n < 8 ? 0 : n < 20 ? (n - 8) / 12 * 140 : n < 40 ? 140 + (n - 20) * 2.5 : 190; // the map's own opacity floor, 0–255, by % of LEVEL
function levelOf(P) {
  let w = 0, s = 0; for (let j = 0; j < P.n; j++) { const v = P.where[P.idx[j]]; if (v > w) w = v; }
  for (const v of P.season || []) if (v > s) s = v;
  const L = 70 * w * s; return L >= 1 ? Math.min(100, Math.max(25, Math.round(L))) : 100; // 25 at least: a fish barely in season is not blown up to red
}
const rangeCut = () => Math.min(state.min, Math.max(1, rangeHi - 25)); // scores under this are not drawn
const rangeLo = () => Math.max(rangeCut(), rangeHi - 55, 1);
function anchors() { // [lowest shown, first score of the top 25 %, first of the top 5 %, best] of this hour's drawn water (the glow's tiers)
  const cut = Math.max(1, rangeCut()), lo = rangeLo(), hi = rangeHi; let n = 0;
  for (let v = cut; v <= 100; v++) n += SHARE[v];
  const top = p => { let acc = 0; for (let v = 100; v > cut; v--) if ((acc += SHARE[v]) >= p * n) return v; return cut; };
  const a1 = Math.min(hi, Math.max(lo, top(.25))), a2 = Math.min(hi, Math.max(a1, top(.05)));
  return [lo, a1, a2, Math.max(hi, lo)];
}
const pct = s => s * 100 / LEVEL; // a score as a share of the fish's ceiling
const relP = n => { // a share's position on HEAT, straight between FIX's points
  if (!(n > 0)) return FIX[0][1]; if (n >= 100) return 95;
  let k = 1; while (FIX[k][0] < n) k++;
  const [a, p] = FIX[k - 1], [b, q] = FIX[k]; return p + (q - p) * (n - a) / (b - a);
};
const mapRgba = s => { const n = pct(s), c = heatRgba(relP(n)), f = AFLOOR(n); return f > c[3] ? [c[0], c[1], c[2], f] : c; };
const tint = v => `rgb(${mapRgba(v).slice(0, 3).map(c => c + (255 - c) * .55 | 0)})`; // a chance line's colour: its score's, lighter than the water around it
const absTint = v => `rgb(${heatRgba(v).slice(0, 3).map(c => c + (255 - c) * .3 | 0)})`; // a real score's own colour (as the dials)
let lutV = 0; // bumped with every new colour table
function buildLut() { // the colours depend on the cut (Hide below and the hour's best) and LEVEL: rebuilt when either moves
  lutV++;
  const cut = rangeCut();
  for (let s = 0; s <= 100; s++) LUT.set(s < cut || !s ? [0, 0, 0, 0] : mapRgba(s), s * 4);
  for (let s = 0; s <= 100; s++) { LUTB32[s] = s < cut || !s ? 0 : LUT32[BAND[s]]; ON[s] = LUT[s * 4 + 3] ? 1 : 0; }
  for (let k = 0; k <= 1000; k++) { const r = (k + 5) / 10 | 0; LUTF32[k] = r < cut || !r ? 0 : px32Of(mapRgba(k / 10)); LUTFB32[k] = LUTB32[k / 10 | 0]; } // shown where its nearest whole score shows, as before
  for (let s = 0; s <= 100; s++) { const c = heatRgba(relP(pct(s))); GLC[s] = c[0] | c[1] << 8 | c[2] << 16; } // the glow's colours (drawGlow)
  drawLegend();
}
console.assert((() => { const L = LEVEL; LEVEL = 50; const ok = relP(0) === 36 && relP(20) === 46 && relP(80) === 81 && relP(100) === 95 && relP(30) === 51 && pct(25) === 50 &&
  FIX.every((p, k) => !k || p[0] > FIX[k - 1][0] && p[1] > FIX[k - 1][1]) && mapRgba(15)[3] >= 165 && mapRgba(2.5)[3] < 60; LEVEL = L; return ok; })(), 'fixed ramp');
// The legend (wide screens; phones hide it): the fixed ramp, "Weaker" at its start and "Near its best" at its end. Its title (hlRel) says the
// scale is the fish's own and the same every day.
{
  const bar = $('#legend'), words = bar?.nextElementSibling;
  if (bar) {
    if (words?.classList.contains('legend-words')) words.remove();
    bar.outerHTML = `<div class="hl" data-i18n-title="hlRel"><div class="hl-t lbl">${ic('fish', 'sm')}<span data-i18n="l_heat"></span></div>` +
      `<div class="hl-bar" id="legend"></div><div class="hl-w"><span data-i18n="hl_lo"></span><span data-i18n="hl_best"></span></div><div class="hl-note" id="hl-note" hidden></div></div>`;
    $('#legend').style.background = `linear-gradient(90deg,${Array.from({ length: 21 }, (_, k) => { const n = k * 5, c = heatRgba(relP(n)); return `rgba(${c.slice(0, 3)},${Math.max(.3, Math.max(c[3], AFLOOR(n)) / 255).toFixed(2)}) ${n}%`; })})`;
  }
}
{ const sw = $('#lay-zones')?.nextElementSibling; if (sw?.classList.contains('sw')) sw.style.color = absTint(80); } // the Chance lines switch's swatch: the ramp's (index.html's own is its fallback)
function drawLegend() { const bar = $('#legend'); if (bar) bar.classList.toggle('none', rangeHi < rangeCut()); } // nothing shows: a grey bar (css/map-fx.css)
console.assert(BAND[40] === 45 && BAND[49] === 45 && BAND[100] === 100, 'bands');
{ // the Contour bands option, under Fishing chance in Layers (an option of that layer, so not counted as a layer of its own)
  const row = L.DomUtil.create('div', 'lp-sub'), lab = L.DomUtil.create('label', '', row);
  lab.innerHTML = '<input type="checkbox" id="lay-bands"> <span data-i18n="l_bands"></span>'; lab.dataset.i18nTitle = 'bandsTip';
  $('#lay-heat')?.closest('label')?.after(row);
  const box = lab.firstChild; box.checked = !!state.layers?.bands;
  box.addEventListener('change', () => { state.layers.bands = box.checked; savePrefs(); if (F) paint(); });
}
// Round 10: "My catches" under Fishing chance, once js/personal.js offers a switch: PsPersonal.enabled() / setEnabled(on) (it rescores itself)
addEventListener('DOMContentLoaded', () => {
  const P = window.PsPersonal; if (typeof P?.setEnabled !== 'function' || $('#lay-mine')) return;
  const row = L.DomUtil.create('div', 'lp-sub'), lab = L.DomUtil.create('label', '', row);
  lab.innerHTML = `<input type="checkbox" id="lay-mine"> <span data-i18n="l_mine">${esc(tr('l_mine'))}</span>`; lab.dataset.i18nTitle = 'mineTip'; lab.title = tr('mineTip');
  ($('#lay-bands')?.closest('.lp-sub') || $('#lay-heat')?.closest('label'))?.after(row);
  const box = lab.firstChild; box.checked = !!P.enabled?.();
  box.addEventListener('change', () => { try { P.setEnabled(box.checked); } catch (e) { console.warn(e); } });
  for (const ev of ['ps:personal', 'ps:catches']) document.addEventListener(ev, () => { box.checked = !!P.enabled?.(); }); // the catch log's own switch moves it too
});
// Round 11: the chance covers the same water at every zoom (the owner: patches must not grow zoomed out and shrink zoomed in). Rounds 9–10
// spread each score over ±0.5–1.5 km under zoom 11, glowed ~7 px under 9.5 and blurred the small image in screen pixels; now every zoom
// draws one field: each cell's score, lightly blurred over the cells that show (3×3, as soften), with a soft edge where the share of showing
// cells around falls from .42 to .12: about half a cell either side of the line mid-way between a showing cell and one that does not, the same
// in metres at every zoom. Zoomed in, paintFine draws that field finer over the view; zoomed out (a cell under ¾ of a screen px), blocks of
// d×d cells are averaged (premultiplied: no pixel takes paint where no water shows; a block partly covered keeps its water's colour and shows
// at √ of its cover, so a thin reef band stays readable without reaching past its own pixels).
let softKey = '', soft = null; // the coarse image last made here (paint)
let paintedD = 0, paintStale = false; // paintedD: the cells per image pixel last painted (1: one a cell)
const cellPx = () => RES * 256 * 2 ** map.getZoom() / 360; // a cell's width on screen, in px
const DIVS = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60]; // each tiles the grid exactly (W and H are multiples of 60)
const lowFor = sx => DIVS.find(d => d * sx >= .75) || 60;
console.assert(W % 60 === 0 && H % 60 === 0 && lowFor(1) === 1 && lowFor(.32) === 3 && lowFor(.05) === 15, 'lowFor');
const EDGE = Float32Array.from({ length: 17 }, (_, n) => Math.min(1, Math.max(0, (n / 16 - .12) / .3))); // cover (n of 16) → alpha, as paintFine's edge
let fH = null, fN = null, fN32 = null, f8 = null; // the row pass of the blur (sums of scores and of showing cells), and the field the chance lines follow (image rows)
function softCells(src, lut32, rnd) { // px32 (image rows): each cell's blurred score in the ramp's colour, faded by cover; true if any shows
  if (!fH) { fH = new Uint16Array(N); fN = new Uint8Array(N); fN32 = new Uint32Array(fN.buffer); f8 = new Uint8Array(N); }
  fH.fill(0); fN.fill(0); px32.fill(0); f8.fill(0);
  const on = ON, h = fH, n1 = fN;
  for (const [list, len] of [[shownIdx, shownN], [CLIP && COASTAL || shownIdx, CLIP && COASTAL ? COASTAL.length : 0]]) for (let k = 0; k < len; k++) { // the cells that score (0 off shownIdx: workHour), and the shore's land cells toShore lent a score
    const i = list[k], v = src[i]; if (!v || !on[v]) continue;
    const x = i % W; h[i] += 2 * v; n1[i] += 2; if (x) { h[i - 1] += v; n1[i - 1]++; } if (x < W - 1) { h[i + 1] += v; n1[i + 1]++; }
  }
  let vis = 0;
  for (let y = 0, W4 = W >> 2; y < H; y++) {
    const g = MROW[y], r0 = g * W, ru = g ? r0 - W : r0, rd = g < H - 1 ? r0 + W : r0, ku = g ? 1 : 0, kd = g < H - 1 ? 1 : 0, o = y * W, ey = EFY[g]; // the grid's first and last rows: no row past them
    for (let w = 0; w < W4; w++) {
      if (!(fN32[(r0 >> 2) + w] | fN32[(ru >> 2) + w] | fN32[(rd >> 2) + w])) continue; // four cells with nothing showing around
      for (let x = w << 2, e = x + 4; x < e; x++) {
        const i = r0 + x, n = 2 * fN[i] + ku * fN[ru + x] + kd * fN[rd + x], t = EDGE[n] * ey * EFX[x]; if (!t) continue; // the grid's edge: fading out
        const s = (2 * fH[i] + ku * fH[ru + x] + kd * fH[rd + x]) / n, c = lut32[s * 10 + rnd | 0]; if (!c) continue;
        px32[o + x] = t === 1 ? c : c & 0xffffff | (c >>> 24) * t << 24; vis = 1;
        if (t === 1) f8[o + x] = s + .5 | 0; // the lines: inside a patch only (its edge shows in the colour), as paintFine
      }
    }
  }
  if (vis && map.hasLayer(protLayer)) for (const o of zoneGrey ||= zoneGreyList()) if (px32[o]) px32[o] = greyPx(px32[o]); // round 16: under closed water
  return vis;
}
const lowImgs = [];
const lowImg = d => lowImgs[d] ||= (() => { const img = new ImageData(W / d, H / d); return { img, p32: new Uint32Array(img.data.buffer) }; })();
let boxS = new Float32Array(0);
function boxDown(d) { // px32 → a pixel per d×d cells
  const o = lowImg(d), w = W / d, h = H / d, q = o.p32, d2 = d * d;
  if (boxS.length < w * 5) boxS = new Float32Array(w * 5);
  const S = boxS;
  for (let by = 0; by < h; by++) {
    S.fill(0, 0, w * 5);
    for (let y = by * d, ye = y + d; y < ye; y++) for (let x = 0, k = y * W; x < W; x++, k++) {
      const p = px32[k]; if (!p) continue;
      const a = p >>> 24, b = (x / d | 0) * 5;
      S[b] += (p & 255) * a; S[b + 1] += (p >>> 8 & 255) * a; S[b + 2] += (p >>> 16 & 255) * a; S[b + 3] += a; S[b + 4]++;
    }
    for (let bx = 0, b = 0, k = by * w; bx < w; bx++, b += 5, k++) {
      const A = S[b + 3]; if (!A) { q[k] = 0; continue; }
      q[k] = (Math.round(A / S[b + 4] * Math.sqrt(S[b + 4] / d2)) << 24 | Math.round(S[b + 2] / A) << 16 | Math.round(S[b + 1] / A) << 8 | Math.round(S[b] / A)) >>> 0;
    }
  }
  return o.img;
}
// Leaflet stretches the image evenly in Web Mercator, but grid rows are evenly spaced in latitude: left as is, the heat sits
// up to ~1.7 rows (~400 m) too far north, i.e. on the south coast's beaches. So each image row reads the grid row at its real latitude.
const imgLat = (() => { const m = d => Math.log(Math.tan(Math.PI / 4 + d * Math.PI / 360)), mN = m(NORTH), mS = m(NORTH - H * RES);
  return y => (2 * Math.atan(Math.exp(mN - y / H * (mN - mS))) - Math.PI / 2) * 180 / Math.PI; })(); // the latitude at image row y (0 at the top, H at the bottom)
const MROW = Int16Array.from({ length: H }, (_, y) => Math.min(H - 1, Math.max(0, Math.floor((NORTH - imgLat(y + .5)) / RES))));
const shore = new Uint8Array(N);
let COASTAL = null; // inner land cells with a sea neighbour: the rest of the land has only land (0) around it
function toShore(src) { // land cells next to the sea take their best sea neighbour; the shoreline clip then trims them at the water's edge
  if (!COASTAL) {
    const a = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!depth[i] && (depth[i - 1] || depth[i + 1] || depth[i - W] || depth[i + W])) a.push(i); }
    COASTAL = Int32Array.from(a);
  }
  shore.set(src);
  for (const i of COASTAL) shore[i] = Math.max(src[i - 1], src[i + 1], src[i - W], src[i + W]);
  return shore;
}
// fade 'auto' (round 17 Z: a repaint after a zoom or pan, or as the 50 m tiles come in): into the hidden layer too, which then takes the other's
// place at once, as a repaint in place did, unless the 50 m detail's share of the picture changed (lay.zf: zooming through 12.5 to 13.1, tiles
// arriving): then it fades in over a quarter second, so the 50 m picture never pops in or out.
// fade: into the hidden layer, then that layer fades in over the other (every hour or fish change: workHour; round 15: scrubbing too; round 17: 250 ms, 200 while scrubbing); else into the layer on show, at once.
// quick (scrubbing): the chance lines wait for the settle (drawZones), so a drag only recolours.
let isoF = null, isoStale = false, freeT = 0; // isoF: the field the lines follow, the one just painted: sample (i, j) sits at box fraction (ox + (i + .5)·kx, oy + (j + .5)·ky)
// pre (round 16 engine): the coarse image of these scores as the paint worker made it (PP below): { vis, img, f8 }; without it, made here.
function paint(fade = false, quick = false, pre = null) {
  if (!map.hasLayer(heat) || document.hidden) { paintStale = true; return; } // off, or a hidden page: painted when it is back (freeHeat)
  paintStale = false; zoneSync();
  const bands = !!state.layers?.bands, d = paintedD = lowFor(cellPx()); let src = null, vis, img;
  // round 17 Z: the coarse image is made once per hour, colours, block size and zones (softKey): a repaint after a zoom or a pan (the fine image
  // over a new view) puts the same pixels back; making them again was ~20 ms of every zoom's last task on a budget phone
  const key = [shownTok, lutV, bands, d, map.hasLayer(protLayer), zoneKey].join();
  if (pre) { vis = pre.vis; img = pre.img; if (!fH) softCells(scores, LUTF32, .5); f8 = pre.f8; softKey = ''; } // (the blur's buffers exist from here on, as after any paint)
  else if (key === softKey && fH) { vis = soft.vis; img = soft.img; }
  else {
    src = CLIP ? toShore(scores) : scores; // the shore's land cells take their sea's score: the shoreline clip trims them
    vis = softCells(src, bands ? LUTFB32 : LUTF32, bands ? 0 : .5); img = d > 1 ? boxDown(d) : heatData; // bands: each score's band (floor), else the nearest
    softKey = key; soft = { vis, img };
  }
  isoF = vis ? { f: f8, w: W, h: H, ox: 0, oy: 0, kx: 1 / W, ky: 1 / H } : null; // the lines follow the cells (zoomed in: the fine image, paintFine)
  // The pixels go straight into the layer's canvas: no image file per hour (a 3 MB BMP blob + object URL cost ~36 ms a frame on a phone)
  const lay = heatLayers[fade ? liveLayer ^ 1 : liveLayer], cut = lay.cut = fineCut(), cv = lay.ctx.canvas;
  if (cv.width !== img.width || cv.height !== img.height) Object.assign(cv, { width: img.width, height: img.height }); // another block size, or freed: a cleared canvas
  if (!vis) lay.ctx.clearRect(0, 0, cv.width, cv.height); else lay.ctx.putImageData(img, 0, 0);
  lay.zf = 0;
  if (cut && vis) { paintFine(lay, cut, src || (CLIP ? toShore(scores) : scores), bands); lay.ctx.clearRect(cut.x0, cut.y0, cut.x1 - cut.x0, cut.y1 - cut.y0); } // the fine image in place of that part
  else lay.fineOn = false;
  if (!vis) isoF = null;
  const old = heatLayers.find(l => l !== lay); // fading: the one on show; else the one fading out, if any
  if (quick) { if (old.iso && old.part.on) { old.iso = null; heat.draw(old.part); } lay.iso = old.iso = null; lay.isoAt = old.isoAt = 0; isoStale = true; } else drawIso(lay); // both: the one under a fade too
  // the layer's picture into the view box (compose); on the island's view the glow is drawn in the next frame's callback (glowSoon below) and
  // composes it there, before that frame is shown: once an hour, not twice (a scrub paints every frame)
  lay.part.on = true; if (!glowOn()) heat.draw(lay.part);
  // The fade: the new picture over the old (z-index), its opacity 0 → 1 in 180 ms on the compositor; the old stays whole under it until then,
  // so the map never dims mid-way (two half-faded layers did). Anything else (scrubbing) ends a running fade at once.
  lay.out?.cancel(); lay.out = null; // (a layer still fading out, round 17 Z below, is painted anew)
  lay.anim?.finish(); // round 16 engine: the fade it started itself (the layers have no other animation); getAnimations() forced a style pass a paint (~2–8 ms on a phone)
  if (fade) old.anim?.finish(); // the hour under the new one whole: a fade over a fade dimmed the map
  if (fade) {
    liveLayer ^= 1; Object.assign(lay.el.style, { visibility: '', opacity: '', zIndex: 1 }); old.el.style.zIndex = 0;
    clearTimeout(hideT);
    if (REDUCE.matches || fade === 'auto' && Math.abs(lay.zf - (old.zf || 0)) < .08) { hideT = 0; hideLay(old); }
    else {
      const ms = quick ? 200 : 250; lay.anim = lay.el.animate({ opacity: [0, 1] }, { duration: ms, easing: 'ease-out' }); hideT = setTimeout(() => hideLay(old), ms + 20);
      // round 17 Z: the detail coming in or going out draws other water than the picture under it (thin bands for broad patches), which showed
      // through whole and went at once when the fade ended: here the old picture fades out as well (later than the new one comes in, so no dip)
      if (fade === 'auto') old.out = old.el.animate({ opacity: [1, 0] }, { duration: ms, easing: 'ease-in', fill: 'forwards' });
    } // round 17: a quarter second, so the eye catches what changed
    clearTimeout(freeT); freeT = setTimeout(() => freeLayer(old), 1500); // the faded-out layer's pixels go once it rests (playing: never)
  } else if (hideT) { clearTimeout(hideT); hideT = 0; hideLay(old); }
  glowSoon();
  window.PsHot?.soon(); // round 17 K: the hot spots are cut from isoF, the field just painted (js/hotspots.js), when the thread is idle
}
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)');
// Round 16 engine, phase 2: while the next fish or method is being prepared (model.js prepSoon) the map on show is the previous one's: dimmed
// (its .12 s fade is css/map-fx.css .heat-box: set inline, the transition replaced Leaflet's own on the box, and an animated zoom then jumped the heat to its end)
function heatWait(on) { heatBox.style.opacity = on ? '.45' : ''; } // ('' as it always was: back to the stylesheet's)
// Round 16: the whole island's view (the lead: "a thin, hard-to-see ribbon"; phase 2: "still a thin line"). Under zoom 10 a soft glow lies
// under the heat around the hour's best water: its top 5 % widened by 3 km, the rest of its top 25 % by 1.5 km, then blurred (~4 km), so where
// to go reads at a glance; it fades out from zoom 9 to 10, where the heat itself is wide enough. Round 17: where it lies still ranks the hour's
// water (ANC), but its colour is that water's own score on the fixed scale (FIX, LEVEL) and its strength follows it too (faint where the best is
// poor, full from 80 % of LEVEL): a rough day glows dull, a good one bright. A 1.5 km image (GD × GD cells a pixel) in each heat layer (so clipped to the
// sea as the heat is, and cross-fading with it from hour to hour and day to day), drawn a frame after the heat: the first paint does not wait
// for it. The best spots' tags name the place there instead of the fish (drawTop, css/map-fx.css .ps-zlo).
const GD = 6, GW = W / GD, GH = H / GD, IROW = Int16Array.from({ length: H }, (_, g) => Math.min(H - 1, zImgY(NORTH - (g + .5) * RES) | 0)); // a grid row's image row
const GLC = new Uint32Array(101); // a score's colour on the fixed scale, no alpha (buildLut)
const glowK = n => n < 20 ? .3 : n < 40 ? .3 + (n - 20) * .0175 : n < 80 ? .65 + (n - 40) * .00875 : 1; // its strength by the score's share of LEVEL
let glow = null, glowQ = 0; // the work buffers
const glowOn = () => map.getZoom() < 10 && scored && !!F;
function drawGlow() {
  glowQ = 0;
  const lay = heatLayers[liveLayer], on = glowOn();
  for (const l of heatLayers) if (l.glOn && (l !== lay || !on)) { l.glOn = false; if (l.part.on) heat.draw(l.part); }
  if (!on) return;
  glow ||= { img: new ImageData(GW, GH), a: new Float32Array(GW * GH), b: new Float32Array(GW * GH), m: new Float32Array(GW * GH), n: new Float32Array(GW * GH) };
  if (!lay.gl) { const c = lay.gl = document.createElement('canvas'); Object.assign(c, { width: GW, height: GH }); lay.gx = c.getContext('2d', { willReadFrequently: true }); }
  lay.glOn = true; lay.glOp = +Math.max(0, Math.min(1, 10 - map.getZoom())).toFixed(2);
  const { a, b, m, n } = glow, A = ANC, cut = Math.max(1, rangeCut());
  a.fill(0); b.fill(0); m.fill(0); n.fill(0);
  if (A[3] > A[0]) for (let k = 0; k < shownN; k++) { // a: 1 the top 5 %, .5 the rest of the top 25 %; m: the best score there
    const i = shownIdx[k], s = scores[i]; if (s < A[1] || s < cut) continue;
    const p = (IROW[i / W | 0] / GD | 0) * GW + (i % W / GD | 0), w = s >= A[2] ? 1 : .5; if (w > a[p]) a[p] = w; if (s > m[p]) m[p] = s;
  }
  for (let y = 0, p = 0; y < GH; y++) for (let x = 0; x < GW; x++, p++) { // widened: the top 5 % by 2 pixels (a disc), the top 25 % by 1
    const v = a[p]; if (!v) continue; const r = v === 1 ? 2 : 1, M = m[p];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= GW || Y >= GH || dx * dx + dy * dy > r * r + 1) continue; const q = Y * GW + X; if (v > b[q]) b[q] = v; if (M > n[q]) n[q] = M; }
  }
  for (let p = 0; p < GW * GH; p++) { a[p] = b[p]; m[p] = n[p] * b[p]; } // weights, and scores x weights: blurred alike, their ratio is the score around
  const box = (src, dst, step, cnt, len) => { // a running mean of 7 along rows (step 1) or columns (step GW)
    for (let o = 0; o < cnt; o++) { const base = step === 1 ? o * GW : o; let sum = 0;
      for (let k = -3; k < len; k++) { if (k + 3 < len) sum += src[base + (k + 3) * step]; if (k - 4 >= 0) sum -= src[base + (k - 4) * step]; if (k >= 0) dst[base + k * step] = sum / 7; } }
  };
  for (let r = 0; r < 2; r++) { box(a, b, 1, GH, GW); box(b, a, GW, GW, GH); box(m, n, 1, GH, GW); box(n, m, GW, GW, GH); }
  const d = new Uint32Array(glow.img.data.buffer);
  for (let p = 0; p < GW * GH; p++) { const v = a[p]; if (v < .01) { d[p] = 0; continue; } const s = Math.min(100, m[p] / v + .5 | 0); d[p] = (GLC[s] | Math.min(1, v * 2.6) * 205 * glowK(pct(s)) << 24) >>> 0; }
  lay.gx.putImageData(glow.img, 0, 0);
  heat.draw(lay.part); // under the heat, in the layer's own picture (compose)
}
const glowSoon = () => { if (!glowQ && (glow || glowOn())) glowQ = requestAnimationFrame(drawGlow); };
map.on('zoomend', glowSoon);
// Round 17 phase 4: rough water as a quiet default cue (the lead: on a rough day the exposed coast should read rough at a glance, sheltered
// water clear). Over the cells whose waves this hour are 1–1.5 m (band 3) a faint cool sheen, like spray, at 1.5 m and over (band 4) a
// stronger one: it shows on the dark open sea and washes the heat under it paler, never recolours it, and with no lines it never meets the
// zones' hatch. (A dark veil, tried first, did not show on the dark sea, where a rough coast mostly is.) Coastal water only, full to 4 km
// from land and gone by 8 km (core.js dist): a rough day's whole open sea under a sheen read as fog over a box, not as a rough coast. Sea state from
// js/seastate.js (PsSea.bands: the worker's per-cell wave bands), never a score. A half-resolution image (2 × 2 cells a pixel, their mean,
// so its edges are soft) over the heat in the heat's box, so clipped to the sea; two canvases cross-fading over 250 ms (none under reduced
// motion: css/map-fx.css); drawn when the hour settles (120 ms after the last change) or when the worker's field comes in, off the paint
// loop. Off while the "Sea by coast" layer shows the bands itself. PsVeil: draws and their ms on this thread, for the perf runs.
const PsVeil = window.PsVeil = (() => {
  const D = 2, VW = W / D, VH = H / D, AL = [0, 0, 0, 30, 62], RGB = 228 << 16 | 214 << 8 | 196; // alpha by band (0–255); the colour (196, 214, 228), ABGR
  // round 17 Z: each picture off screen (src), drawn into its part of the heat's view box; a part's pixels go 300 ms after it has faded out
  const src = [0, 1].map(() => Object.assign(document.createElement('canvas'), { width: VW, height: VH }));
  const parts = src.map(c => { const p = heat.add((g, V) => gridImage(g, V, c), 'rough-veil', 'sea'); p.on = false; p.cv.style.cssText += ';z-index:2;opacity:0'; return p; }), cv = parts.map(p => p.cv);
  const off = k => { cv[k].style.opacity = 0; clearTimeout(parts[k].t); parts[k].t = setTimeout(() => { if (parts[k].on && cv[k].style.opacity === '0') { parts[k].on = false; heat.draw(parts[k]); } }, 300); };
  const img = new ImageData(VW, VH), d32 = new Uint32Array(img.data.buffer), stats = { n: 0, ms: 0 };
  let near = null; // per cell, how coastal it is: 1 to 4 km from land, 0 from 8 km
  let live = 0, drawnH = -1, drawnF = null, t = 0;
  function hide() { off(0); off(1); drawnH = -1; }
  function draw() {
    t = 0;
    if (!F || !scored || !map.hasLayer(heat) || state.layers?.seacoast) { hide(); return; }
    const h = state.h; if (h === drawnH && drawnF === F) return;
    const b = window.PsSea?.bands?.(h); if (!b) return; // 'ps:sea' calls again once the worker has it
    const t0 = performance.now(); let any = 0;
    if (!near) { near = new Float32Array(N); for (let i = 0; i < N; i++) { const d = dist[i]; near[i] = d <= 4 ? 1 : d >= 8 ? 0 : (8 - d) / 4; } } // a loop: Float32Array.from with a mapper took ~70 ms
    for (let y = 0, o = 0; y < VH; y++) {
      const r0 = MROW[y * D] * W, r1 = MROW[y * D + 1] * W;
      for (let x = 0, c = 0; x < VW; x++, o++, c += D) {
        const p = r0 + c, q = r1 + c, a = (b[p] < 5 ? AL[b[p]] * near[p] : 0) + (b[p + 1] < 5 ? AL[b[p + 1]] * near[p + 1] : 0) + (b[q] < 5 ? AL[b[q]] * near[q] : 0) + (b[q + 1] < 5 ? AL[b[q + 1]] * near[q + 1] : 0);
        d32[o] = a >= 4 ? ((a / 4 | 0) << 24 | RGB) >>> 0 : 0; any |= a >= 4;
      }
    }
    const k = live ^ 1; src[k].getContext('2d').putImageData(img, 0, 0);
    if (any) { parts[k].on = true; heat.draw(parts[k]); cv[k].style.opacity = 1; } else off(k);
    off(live); live = k; drawnH = h; drawnF = F;
    stats.n++; stats.ms += performance.now() - t0;
  }
  const soon = () => { clearTimeout(t); t = setTimeout(draw, 120); };
  document.addEventListener('ps:hour', soon);
  document.addEventListener('ps:sea', e => { if (e.detail?.h === state.h) soon(); });
  document.addEventListener('change', e => { if (e.target?.id === 'lay-seacoast') { drawnH = -1; soon(); } });
  heat.on('add', () => { drawnH = -1; soon(); }).on('remove', hide);
  return { stats, draw };
})();
let hideT = 0;
const freeLayer = l => { for (const c of [l.ctx.canvas, l.fine]) c.width = c.height = 0; l.cut = l.iso = null; l.isoAt = 0; l.fineOn = false; l.part.on = l.part.keep = false; heat.draw(l.part); }; // a 0×0 canvas holds no pixels
function freeHeat() { heatLayers.forEach(freeLayer); fineImg = zmask = null; fineF = new Float32Array(0); fH = fN = fN32 = f8 = isoF = null; softKey = ''; paintStale = true; } // ~8–18 MB on a phone
heat.on('remove', freeHeat);
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (map.hasLayer(heat)) freeHeat(); } else if (paintStale && F && scored && map.hasLayer(heat)) paint(); });
// Zoomed in (from zoom 11, where a 250 m cell is ~3.6 px), the browser's smoothing between cells shows their staircase. So the part of
// the image under the view (and a quarter screen around it, for panning) is also drawn finer, a pixel per 3–4 screen px (16 a cell at
// most), from the score itself interpolated between cell centres and then coloured: edges, bands and lines follow smooth curves. Inside a
// patch the interpolation is cubic (Catmull-Rom, kept within its four cells' range, so it never shows a chance no cell has): no creases
// along the cells' edges. At a patch's edge only the corners that show count, bilinearly, so the colour fades out there instead of running
// down the ramp to 0 (a blue rim on everything). Its cost follows the screen, not the zoom. In its place the coarse canvas is left clear.
function fineCut() { // that part, in image pixels (columns and Mercator rows), and the fine image's size; null when cells are small
  const a = map.latLngToContainerPoint([NORTH, WEST]), b = map.latLngToContainerPoint([NORTH - H * RES, WEST + W * RES]), sx = (b.x - a.x) / W, sy = (b.y - a.y) / H;
  if (!(sx >= 3)) return null;
  const s = map.getSize(), mx = s.x / 4, my = s.y / 4, ix = v => Math.min(W, Math.max(0, (v - a.x) / sx)), iy = v => Math.min(H, Math.max(0, (v - a.y) / sy));
  const c = { x0: Math.floor(ix(-mx)), x1: Math.ceil(ix(s.x + mx)), y0: Math.floor(iy(-my)), y1: Math.ceil(iy(s.y + my)), view: [ix(0), iy(0), ix(s.x), iy(s.y)], z: map.getZoom() };
  if (c.x1 <= c.x0 || c.y1 <= c.y0) return null;
  const k = Math.max(Math.min(Math.max(sx / 1.5, 3), 4), sx / 16); // screen px a fine pixel: 3–4, 1.2+ a cell; past 16 px a cell the browser's own smoothing is as good
  c.fw = Math.ceil((c.x1 - c.x0) * sx / k); c.fh = Math.ceil((c.y1 - c.y0) * sy / k); c.sx = sx;
  return c;
}
const cubicW = (t, w, o) => { const t2 = t * t, t3 = t2 * t; w[o] = (2 * t2 - t3 - t) / 2; w[o + 1] = (3 * t3 - 5 * t2 + 2) / 2; w[o + 2] = (4 * t2 - 3 * t3 + t) / 2; w[o + 3] = (t3 - t2) / 2; }; // Catmull-Rom
let fineImg = null, fineF = new Float32Array(0), fineCol = new Int32Array(0), fineWx = new Float32Array(0), fineCW = new Float32Array(0);
let colV = new Float32Array(0), colN = colV, colC = colV, colLo = colV, colHi = colV, colIn = new Uint8Array(0); // per cell column of the cut, for one fine row
let softV = new Float32Array(0), softC = softV, softH = softV, softO = new Uint8Array(0), softN = softO; // the cut's cells: value, cover; the blur's inputs and row pass
// A light blur of the cells first (binomial, over the cells that show only): zoomed in, the model's cell-to-cell grain (a few points, in
// stripes 3–4 cells apart) read as a mosaic or a weave and drew the lines as squiggles, and patch edges followed the cells' staircase. Each
// cell gets the blurred value of the showing cells around it and how much of its window shows (cover, 0–1): edges then run where cover is
// ½, rounded, mid-way between a showing cell and one that does not. 3×3 at every zoom (round 11: a 5×5 under 6 px a cell moved the edges
// at zoom 11.5, and softCells draws the same field zoomed out). The pins still give each peak's own score.
function soften(f, ca, rA, rw, rh) {
  const m = rw * rh;
  if (softV.length < m) { softV = new Float32Array(m); softC = new Float32Array(m); softH = new Float32Array(m); softO = new Uint8Array(m); softN = new Uint8Array(m); }
  const v = softV, cv = softC, hs = softH, o = softO, hn = softN, on = ON, R = 1, K = [1, 2, 1], KK = 16;
  for (let y = 0, k = 0; y < rh; y++) for (let x = 0, i = (rA + y) * W + ca; x < rw; x++, k++, i++) { const s = f[i], u = on[s]; o[k] = u; v[k] = u * s; }
  // Each pass unrolled away from the borders (a loop over the kernel cost ~3× as much: ~5 → ~1.5 ms zoomed in on a desktop); at them, the taps that exist
  const edge = (a, b, k, i, d, n) => { let s = 0, c = 0; for (let t = -R; t <= R; t++) if (i + t >= 0 && i + t < n) { const q = K[t + R]; s += q * a[k + t * d]; c += q * b[k + t * d]; } return [s, c]; };
  for (let y = 0; y < rh; y++) for (let x = 0, k = y * rw; x < rw; x++, k++) {
    if (x < R || x >= rw - R) { [hs[k], hn[k]] = edge(v, o, k, x, 1, rw); continue; }
    hs[k] = v[k - 1] + v[k + 1] + 2 * v[k]; hn[k] = o[k - 1] + o[k + 1] + 2 * o[k];
  }
  const r1 = rw;
  for (let y = 0, k = 0; y < rh; y++) for (let x = 0; x < rw; x++, k++) {
    let s, n;
    if (y < R || y >= rh - R) [s, n] = edge(hs, hn, k, y, rw, rh);
    else { s = hs[k - r1] + hs[k + r1] + 2 * hs[k]; n = hn[k - r1] + hn[k + r1] + 2 * hn[k]; }
    v[k] = n ? s / n : 0; cv[k] = n / KK;
  }
}
function paintFine(lay, c, f, bands) {
  const { x0, x1, y0, y1, fw, fh } = c, lut32 = bands ? LUTFB32 : LUTF32, rnd = bands ? 0 : .5, on = ON; // bands: each score's band (floor), else the nearest tenth
  if (lay.fine.width !== fw || lay.fine.height !== fh) Object.assign(lay.fine, { width: fw, height: fh });
  if (fineImg?.width !== fw || fineImg.height !== fh) fineImg = new ImageData(fw, fh);
  if (fineF.length < fw * fh) fineF = new Float32Array(fw * fh);
  const d32 = new Uint32Array(fineImg.data.buffer), fv = fineF; d32.fill(0); fv.fill(0, 0, fw * fh);
  if (fineCol.length < fw + 1) { fineCol = new Int32Array(fw + 1); fineWx = new Float32Array(fw); fineCW = new Float32Array(fw * 4); }
  const fc = fineCol, fwx = fineWx, cw = fineCW;
  for (let fx = 0; fx < fw; fx++) { const g = Math.min(W - 1.001, Math.max(0, x0 + (fx + .5) * (x1 - x0) / fw - .5)), col = g | 0; fc[fx] = col; fwx[fx] = g - col; cubicW(g - col, cw, fx * 4); }
  fc[fw] = -1; // ends the last run of pixels between the same two cell columns
  const ca = Math.max(0, fc[0] - 1), cb = Math.min(W - 1, fc[fw - 1] + 2), nc = cb - ca + 1; // the cell columns a row reads
  if (colIn.length < nc + 2) { [colV, colN, colC, colLo, colHi] = [0, 0, 0, 0, 0].map(() => new Float32Array(nc + 2)); colIn = new Uint8Array(nc + 2); }
  const cV = colV, cN = colN, cC = colC, cLo = colLo, cHi = colHi, cI = colIn;
  cI[nc] = cI[nc + 1] = 0; // past the grid's last column: never inside
  const gy = fy => Math.min(H - 1.001, Math.max(0, (NORTH - imgLat(y0 + (fy + .5) * (y1 - y0) / fh)) / RES - .5)); // the grid row (fractional) under fine row fy
  const rA = Math.max(0, (gy(0) | 0) - 1), rh = Math.min(H - 1, (gy(fh - 1) | 0) + 2) - rA + 1;
  const n0 = .12, n1 = .42; // the edge's fade, in cover (a lone showing cell peaks at ¼, a one-cell band at ½): softCells' EDGE
  soften(f, ca, rA, nc, rh);
  const sv = softV, sc = softC;
  for (let fy = 0; fy < fh; fy++) {
    const g = gy(fy), r = g | 0, wy = g - r, uy = 1 - wy, o = fy * fw;
    const R0 = (Math.max(0, r - 1) - rA) * nc, R1 = (r - rA) * nc, R2 = R1 + nc, R3 = (Math.min(H - 1, r + 2) - rA) * nc, y2 = wy * wy, y3 = y2 * wy;
    const a0 = (2 * y2 - y3 - wy) / 2, a1 = (3 * y3 - 5 * y2 + 2) / 2, a2 = (4 * y2 - 3 * y3 + wy) / 2, a3 = (y3 - y2) / 2; // cubicW, inline
    let any = 0;
    for (let j = 0; j < nc; j++) { // down each column once: the cubic, and the bilinear weighted by cover (n: the cover there)
      const c1 = sc[R1 + j], c2 = sc[R2 + j], n = c1 * uy + c2 * wy;
      cN[j] = n;
      if (!n) { cI[j] = cC[j] = 0; continue; } // nothing shows here
      const p0 = sv[R0 + j], p1 = sv[R1 + j], p2 = sv[R2 + j], p3 = sv[R3 + j];
      cV[j] = a0 * p0 + a1 * p1 + a2 * p2 + a3 * p3; cC[j] = p1 * c1 * uy + p2 * c2 * wy;
      cLo[j] = p1 < p2 ? p1 : p2; cHi[j] = p1 < p2 ? p2 : p1; cI[j] = +(sc[R0 + j] === 1 && c1 === 1 && c2 === 1 && sc[R3 + j] === 1); any = 1;
    }
    if (!any) continue;
    for (let fx = 0, end; fx < fw; fx = end) { // a run of pixels between the same two cell columns: their values read once
      const j = fc[fx] - ca, nL = cN[j], nR = cN[j + 1];
      for (end = fx + 1; fc[end] === fc[fx];) end++;
      if (nL + nR === 0) continue;
      if (j && nL > .999 && nR > .999 && cI[j - 1] & cI[j] & cI[j + 1] & cI[j + 2]) { // inside a patch: cubic across too, within the four cells' range
        const v0 = cV[j - 1], v1 = cV[j], v2 = cV[j + 1], v3 = cV[j + 2], lo = cLo[j] < cLo[j + 1] ? cLo[j] : cLo[j + 1], hi = cHi[j] > cHi[j + 1] ? cHi[j] : cHi[j + 1];
        for (let x = fx, q = fx * 4; x < end; x++, q += 4) {
          let s = cw[q] * v0 + cw[q + 1] * v1 + cw[q + 2] * v2 + cw[q + 3] * v3; s = s < lo ? lo : s > hi ? hi : s;
          d32[o + x] = lut32[s * 10 + rnd | 0]; fv[o + x] = s;
        }
        continue;
      }
      const vL = cC[j], vR = cC[j + 1];
      for (let x = fx; x < end; x++) {
        const wx = fwx[x], n = nL + (nR - nL) * wx; if (n <= n0) continue;
        const s = (vL + (vR - vL) * wx) / n, k = s * 10 + rnd | 0;
        if (n >= n1) { d32[o + x] = lut32[k]; fv[o + x] = s; continue; }
        const t = (n - n0) / .3; // over a patch's edge: fading out; no lines there (-1), or all three bunched along every edge
        d32[o + x] = lut32[k] & 0xffffff | (lut32[k] >>> 24) * t << 24; fv[o + x] = -1;
      }
    }
  }
  lay.zf = window.PsFine?.over(c, d32, fv, fw, fh, lut32, rnd) || 0; if (map.hasLayer(protLayer)) greyFine(c, d32, fw, fh); // round 13: zoomed in on water with fine data, the ~50 m sub-cells' own scores over this picture (js/fine.js)
  if (x0 < FADE_C || x1 > W - FADE_C || rA < FADE_C || rA + rh > H - FADE_C) for (let fy = 0, o = 0; fy < fh; fy++) { // by the grid's edge: fading out, as softCells
    const ey = EFY[gy(fy) | 0];
    for (let fx = 0; fx < fw; fx++, o++) { const e = ey * EFX[fc[fx]], p = d32[o]; if (e < 1 && p) d32[o] = p & 0xffffff | (p >>> 24) * e << 24; }
  }
  lay.fctx.putImageData(fineImg, 0, 0); lay.fineOn = true; // drawn over its cut (lay.cut) by compose
  isoF = { f: fv, w: fw, h: fh, ox: x0 / W, oy: y0 / H, kx: (x1 - x0) / fw / W, ky: (y1 - y0) / fh / H };
}
console.assert((() => { const w = new Float32Array(4); cubicW(.3, w, 0); return Math.abs(w[0] + w[1] + w[2] + w[3] - 1) < 1e-6; })(), 'cubic weights sum to 1');
// The chance lines (the "zones" layer): where the field just painted crosses 50, 65 and 80, by marching squares over a sample every ~4
// screen px, the crossings stitched into lines and drawn through their midpoints as smooth curves, over the view and a tenth of a screen
// around it at the screen's own resolution: thin, crisp, a dark casing under each so it reads on bright shallows and the dark chart alike;
// the 80 line with a soft glow; rings under 8 px (specks) left out, and nothing along a patch's own edge (its colour shows it; there all
// three lines bunched into stripes): only where the chance crosses them inside the water. Stitched, a line is one stroke: as many short segments, their seams
// showed as beads. They replace the 65+ outlines (Leaflet polylines: busy zoomed out, and they ran along the shore over the land).
const ISO = [[50, 1, .5], [65, 1.3, .85], [80, 1.6, .95]]; // score, width (CSS px), opacity
function isolines(f, w, i0, i1, j0, j1, st, lv, Ax, Bx, Ay, By) { // each level's lines, { h, t: points (canvas px), ring }
  const n = lv.length, open = lv.map(() => new Map()), done = lv.map(() => []), lo = lv[0], hi = lv[n - 1], sw = st * w;
  for (let y = j0; y + st <= j1; y += st) for (let x = i0, i = y * w + i0; x + st <= i1; x += st, i += st) {
    const a = f[i], b = f[i + st], d = f[i + sw], c = f[i + sw + st]; // corners clockwise from the top left: a b / d c
    const mn = a < b ? (a < c ? (a < d ? a : d) : c < d ? c : d) : b < c ? (b < d ? b : d) : c < d ? c : d; if (mn >= hi || mn <= 0) continue; // ≤ 0: a patch's edge or nothing: the colour shows the edge
    const mx = a > b ? (a > c ? (a > d ? a : d) : c > d ? c : d) : b > c ? (b > d ? b : d) : c > d ? c : d; if (mx < lo) continue;
    for (let k = 0; k < n; k++) {
      const L = lv[k]; if (mn >= L || mx < L) continue;
      const id = (a >= L) << 3 | (b >= L) << 2 | (c >= L) << 1 | (d >= L);
      const e = id === 5 || id === 10 ? ((id === 5) === ((a + b + c + d) / 4 >= L) ? SADDLE[0] : SADDLE[1]) : SEG[id]; // a saddle: by the middle
      for (let s = 0; s < e.length; s += 2) {
        const g1 = e[s], g2 = e[s + 1];
        join(open[k], done[k], edgeKey(g1, i, st, sw), Ax * edgeX(g1, x, a, b, c, d, L, st) + Bx, Ay * edgeY(g1, y, a, b, c, d, L, st) + By,
          edgeKey(g2, i, st, sw), Ax * edgeX(g2, x, a, b, c, d, L, st) + Bx, Ay * edgeY(g2, y, a, b, c, d, L, st) + By);
      }
    }
  }
  return done.map((out, k) => { for (const [key, q] of open[k]) if (key === q.s) out.push(q); return out; }); // an open line is in its map at both ends
}
const edgeX = (g, x, a, b, c, d, L, st) => g === 0 ? x + st * (L - a) / (b - a) : g === 1 ? x + st : g === 2 ? x + st * (L - d) / (c - d) : x; // where edge g crosses L
const edgeY = (g, y, a, b, c, d, L, st) => g === 0 ? y : g === 1 ? y + st * (L - b) / (c - b) : g === 2 ? y + st : y + st * (L - a) / (d - a);
const edgeKey = (g, i, st, sw) => g === 0 ? 2 * i : g === 1 ? 2 * (i + st) + 1 : g === 2 ? 2 * (i + sw) : 2 * i + 1; // an edge's id: its first sample, across (even) or down (odd)
// edges 0 top, 1 right, 2 bottom, 3 left; each case's segments as edge pairs (corner bits a 8, b 4, c 2, d 1)
const SEG = [, [3, 2], [2, 1], [3, 1], [0, 1], , [0, 2], [0, 3], [0, 3], [0, 2], , [0, 1], [3, 1], [1, 2], [3, 2]], SADDLE = [[0, 3, 1, 2], [0, 1, 3, 2]];
// A line is points h reversed, then t (h takes points added at its start), between edges s and e; flipping it is a swap
const flipLine = q => { [q.h, q.t] = [q.t, q.h]; [q.s, q.e] = [q.e, q.s]; };
const linePts = q => { const p = []; for (let m = q.h.length - 2; m >= 0; m -= 2) p.push(q.h[m], q.h[m + 1]); for (const v of q.t) p.push(v); return p; };
function join(open, done, k1, x1, y1, k2, x2, y2) { // a segment from edge k1 to edge k2 onto the lines that end there
  const f = open.get(k1), g = open.get(k2);
  if (!f && !g) { const q = { h: [], t: [x1, y1, x2, y2], s: k1, e: k2, ring: false }; open.set(k1, q); open.set(k2, q); return; }
  if (f) open.delete(k1); if (g) open.delete(k2);
  if (f && g) {
    if (f === g) { f.ring = true; done.push(f); return; } // its two ends meet
    if (f.e !== k1) flipLine(f); if (g.s !== k2) flipLine(g); // f … k1 → k2 … g
    for (const v of linePts(g)) f.t.push(v);
    f.e = g.e; open.set(f.e, f); return;
  }
  if (f) { if (f.e !== k1) flipLine(f); f.t.push(x2, y2); f.e = k2; open.set(k2, f); }
  else { if (g.s !== k2) flipLine(g); g.h.push(x1, y1); g.s = k1; open.set(k1, g); }
}
console.assert((() => { // a 3×3 field with a peak in the middle: one ring around it
  const L = isolines(Float32Array.of(1, 1, 1, 1, 9, 1, 1, 1, 1), 3, 0, 2, 0, 2, 1, [5], 1, 0, 1, 0)[0]; // i1, j1: the last sample
  return L.length === 1 && L[0].ring && linePts(L[0]).length === 8;
})(), 'chance lines stitch');
function drawIso(lay) { // the lines over the heat's view box, from isoF: as paths (lay.iso), stroked by compose (strokeIso)
  const V = heat.V; isoStale = false; lay.iso = null; if (!V) return;
  lay.isoAt = V.n;
  const bw = V.gw, bh = V.gh, dpr = V.dpr, w = Math.round(V.w * dpr), h = Math.round(V.h * dpr);
  const lv = ISO.filter(([v]) => v >= rangeCut());
  if (!isoF || !state.layers.zones || !lv.length) return;
  const { f, w: fw, h: fh, ox, oy, kx, ky } = isoF, Ax = kx * bw * dpr, Bx = ((ox + kx / 2) * bw + V.gx) * dpr, Ay = ky * bh * dpr, By = ((oy + ky / 2) * bh + V.gy) * dpr; // a sample's place in the part's pixels
  const clampI = (v, n) => Math.min(n - 1, Math.max(0, v | 0)), st = Math.max(1, Math.round(4 * dpr / Ax)); // only the samples under the canvas (and one around), ~4 px apart
  const on = v => v - v % st; // the samples marched on stay put as the view moves, so redrawn lines do not shift
  const lines = isolines(f, fw, on(clampI(-Bx / Ax - st, fw)), clampI((w - Bx) / Ax + st, fw), on(clampI(-By / Ay - st, fh)), clampI((h - By) / Ay + st, fh), st, lv.map(([v]) => v), Ax, Bx, Ay, By);
  const P = lines.map(qs => { // through the midpoints of each line's points: a smooth curve that still passes each crossing closely
    const p = new Path2D();
    for (const q of qs) {
      const v = linePts(q), n = v.length;
      if (q.ring) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let m = 0; m < n; m += 2) { x0 = Math.min(x0, v[m]); x1 = Math.max(x1, v[m]); y0 = Math.min(y0, v[m + 1]); y1 = Math.max(y1, v[m + 1]); } if (x1 - x0 < 8 * dpr && y1 - y0 < 8 * dpr) continue; }
      p.moveTo(v[0], v[1]);
      for (let m = 2; m < n - 2; m += 2) p.quadraticCurveTo(v[m], v[m + 1], (v[m] + v[m + 2]) / 2, (v[m + 1] + v[m + 3]) / 2);
      p.lineTo(v[n - 2], v[n - 1]); if (q.ring) p.closePath();
    }
    return p;
  });
  lay.iso = { P, lv, z: V.z, x: V.x, y: V.y, tints: lv.map(([v]) => tint(v)), glow: tint(90) };
}
function strokeIso(g, V, I) { // a layer's chance lines into its part; made for another layout (a pinch or drag under way): scaled and moved to this one, the same widths
  const dpr = V.dpr, k = map.getZoomScale(V.z, I.z), lv = I.lv, P = I.P;
  g.save(); g.setTransform(k, 0, 0, k, (I.x * k - V.x) * dpr, (I.y * k - V.y) * dpr);
  g.lineJoin = g.lineCap = 'round';
  if (lv.at(-1)[0] === 80) { g.strokeStyle = I.glow; for (const [lw, al] of [[10, .06], [6, .1], [3.5, .16]]) { g.globalAlpha = al; g.lineWidth = lw * dpr / k; g.stroke(P.at(-1)); } } // the glow
  g.strokeStyle = '#000'; lv.forEach(([, lw], n) => { g.globalAlpha = .4; g.lineWidth = (lw + 1.6) * dpr / k; g.stroke(P[n]); });
  lv.forEach(([, lw, al], n) => { g.strokeStyle = I.tints[n]; g.globalAlpha = al; g.lineWidth = lw * dpr / k; g.stroke(P[n]); });
  g.restore();
}
heat.on('add', () => { if (paintStale && F) paint(); });
// Round 15: sea fronts, a display layer (Layers > Weather and sea, off at first): the daily job's front lines on the satellite maps
// (js/sources.js loadFronts, fetched when first switched on), each front pixel joined to its neighbours, read as it is (no resampling), the
// 1 km pixel steps rounded off. Sea-temperature fronts only, dotted light grey (the app's sea marks are grey; colour is the heat's). A sea
// feature, not a score: the legend says so while it shows (the score's own front term, sources.js frontAt, reads its own gradient map).
(() => {
  let layer = null, loading = null, row = null, key = null;
  const MINPIX = 6;
  function lines(G) { // a grid's front pixels as chains of [lat, lon], Chaikin-rounded
    const { nx, ny, g } = G, on = k => g[k] > 0, at = k => [G.lat0 + (k / nx | 0) * G.dLat, G.lon0 + k % nx * G.dLon], nb = new Map(), out = [];
    const link = (a, b) => { (nb.get(a) || nb.set(a, []).get(a)).push(b); (nb.get(b) || nb.set(b, []).get(b)).push(a); };
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const k = y * nx + x; if (!on(k) || inNorth(...at(k))) continue;
      const e = x < nx - 1 && on(k + 1), s = y < ny - 1 && on(k + nx);
      if (e) link(k, k + 1); if (s) link(k, k + nx);
      if (y < ny - 1 && x < nx - 1 && on(k + nx + 1) && !e && !s) link(k, k + nx + 1); // diagonals only where no corner pixel joins them
      if (y < ny - 1 && x && on(k + nx - 1) && !on(k - 1) && !s) link(k, k + nx - 1);
    }
    const used = new Set(), ek = (a, b) => a < b ? a * 1e7 + b : b * 1e7 + a;
    const walk = (a, b) => { const p = [a, b]; used.add(ek(a, b)); for (let q = b, prev = a; nb.get(q).length === 2;) { const n = nb.get(q).find(v => v !== prev); if (used.has(ek(q, n))) break; used.add(ek(q, n)); p.push(n); prev = q; q = n; } return p; };
    for (const [a, ns] of nb) if (ns.length !== 2) for (const b of ns) if (!used.has(ek(a, b))) out.push(walk(a, b)); // from ends and junctions
    for (const [a, ns] of nb) for (const b of ns) if (!used.has(ek(a, b))) out.push(walk(a, b)); // closed loops
    const round = c => { const r = [c[0]]; for (let k = 0; k + 1 < c.length; k++) { const [a, o] = c[k], [b, q] = c[k + 1]; r.push([.75 * a + .25 * b, .75 * o + .25 * q], [.25 * a + .75 * b, .25 * o + .75 * q]); } r.push(c.at(-1)); return r; };
    return out.filter(p => p.length >= MINPIX).map(p => round(round(round(p.map(at))))); // a front of 6 pixels (~5 km) or more, its 1 km steps rounded off
  }
  function build(f) {
    const ren = L.canvas({ pane: 'zones' }), g = L.layerGroup(), add = (G, dash) => { if (!G) return; const P = lines(G);
      L.polyline(P, { renderer: ren, color: '#000', opacity: .45, weight: 5, dashArray: dash, interactive: false, lineCap: 'round', lineJoin: 'round' }).addTo(g);
      L.polyline(P, { renderer: ren, color: '#eef1f4', opacity: .95, weight: 3, dashArray: dash, interactive: false, lineCap: 'round', lineJoin: 'round' }).addTo(g); };
    add(f.sst, '.1 7'); // dotted: unlike the chance lines (solid, the ramp's colours) and the zones (white dashes). ponytail: plankton fronts left out (thick with short loops on the map); add them if asked
    key = f.sst?.date || f.made; return g;
  }
  function note(on) { // the legend's line while it shows: what the lines are, from when, and that they are not a score
    let e = $('#hl-front'); if (!on) { if (e) e.hidden = true; return; }
    if (!e) { e = document.createElement('div'); e.className = 'hl-front'; e.id = 'hl-front'; ($('#hl-fine') || $('#hl-note'))?.after(e); }
    e.hidden = false; e.textContent = tr('fr_note', key ? fmtT(key, { day: 'numeric', month: 'short' }) : '–');
  }
  function show(on) {
    if (!on) { if (layer) map.removeLayer(layer); note(false); return; }
    loading ||= loadFronts().then(f => { layer = build(f); }, e => { loading = null; console.warn(e.message); throw e; });
    loading.then(() => { if (state.layers.fronts) { layer.addTo(map); note(true); } }, () => { if (row) row.querySelector('input').checked = state.layers.fronts = false; savePrefs(); note(false); toast(tr('fr_none')); });
  }
  addEventListener('DOMContentLoaded', () => {
    const after = $('#lay-temp')?.closest('label'); if (!after || typeof loadFronts !== 'function') return;
    row = document.createElement('label'); row.dataset.i18nTitle = 'fr_tip'; row.title = tr('fr_tip');
    row.innerHTML = `<input type="checkbox" id="lay-fronts"><i class="sw" style="background:radial-gradient(circle,#eef1f4 1.6px,transparent 1.9px) 0 50% / 4.5px 9px repeat-x;border-radius:0"></i> <span data-i18n="l_fronts">${esc(tr('l_fronts'))}</span>`;
    after.after(row);
    const box = row.firstChild; box.checked = !!state.layers?.fronts;
    box.addEventListener('change', () => { state.layers.fronts = box.checked; savePrefs(); show(box.checked); });
    if (box.checked) show(true);
    new MutationObserver(() => { if (layer && map.hasLayer(layer)) note(true); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  });
})();
console.assert(MROW[0] === 0 && MROW[H - 1] === H - 1 && MROW.every((v, y) => !y || v >= MROW[y - 1]), 'heat rows follow Mercator');
console.assert(W % 4 === 0, 'paint reads whole 32-bit words per row');
// Round 17 Z: in a task of its own, after the one that ends the move (tiles, pins, labels): the box is laid out there at once, from the images
// it has (sharp where the zoom did not change them), and this follows a frame later; a gesture that has started again by then is left alone
// (its own end comes here).
let restQ = false;
map.on('moveend', () => {
  if (!F || !map.hasLayer(heat)) return;
  heat.sync(); // the box for the resting view first (its own moveend handler then finds it made)
  if (!restQ) { restQ = true; soonTask(() => { restQ = false; if (F && scored && map.hasLayer(heat) && !mapBusy()) heatRest(); }); }
});
function heatRest() { // a new zoom's block size or sharpness, the view past the fine image's margin, or 50 m tiles that came in meanwhile: paint again (~1 ms zoomed in);
  // a new layout of the view box only: the lines again, from the same field
  const lay = heatLayers[liveLayer], p = lay.cut, c = fineCut();
  if (window.PsFine?.take?.()) { paint('auto'); return; }
  if (lowFor(cellPx()) !== paintedD || !c !== !p || c && (c.z !== p.z || c.view[0] < p.x0 || c.view[1] < p.y0 || c.view[2] > p.x1 || c.view[3] > p.y1)) paint((c || p)?.sx > 10 || lay.zf ? 'auto' : false); // (auto: where the 50 m detail is, was or comes in)
  else if (state.layers.zones && isoF && lay.isoAt !== heat.V.n) { drawIso(lay); heat.draw(lay.part); }
}
function drawZones() { if (F && scored && map.hasLayer(heat)) { const lay = heatLayers[liveLayer]; drawIso(lay); heat.draw(lay.part); } } // the chance lines on or off (ui.js), or after a scrub (settle)
// Scrubbing the timeline, holding an arrow key or playing can ask for many renders a frame: after a render, the next waits for the
// next frame and draws the latest hour, fish and method. renderNow() draws at once.
let renderQueued = false, renderedAt = -1e9, scored = false, hiddenPlay = false;
const flushRender = () => { if (renderQueued) renderNow(); };
function render() {
  if (document.hidden && state.playing) { hiddenPlay = true; return; } // playing in a hidden page: nothing to see, the hour shows when it is back
  if (renderQueued) return;
  if (performance.now() - renderedAt > 50) { renderNow(); return; }
  renderQueued = true; requestAnimationFrame(flushRender); setTimeout(flushRender, 50); // the timer: pages that get no frames (hidden) still draw
}
// Each hour's map is kept: its scores along cur.idx, a byte a cell, for this cur only (curGen, model.js). An hour is scored in slices of
// SLICE_MS, so a tap, a drag or the timeline never waits behind a big map (a pelagic fish or All fish by boat: ~525k cells, ~40 ms an hour
// on a desktop, several times that on a phone); the old picture stays until the new one is whole. Once the hour has been moved, a slow map's
// neighbouring hours are scored ahead in background slices (HOURS_AROUND each way, HOURS_MB at most, never in a hidden page), so scrubbing
// and playing then show them at once. Round 16: a big map's hours come from a worker (HW, below), so the main thread only paints them.
const hourMaps = new Map(), SLICE_MS = 8, HOURS_AROUND = 12, HOURS_MB = 24;
let hourGen = -1, hourMs = 0, hourMoved = false, hourLast = -1, hourJob = null, hourJobT = false, aheadTask = false;
let shownIdx = new Int32Array(0), shownN = 0, shownGen = -1; // the cells `scores` holds a score for (0 off them): cur.idx when it was shown
const soonTask = (f, bg) => window.scheduler?.postTask ? scheduler.postTask(f, { priority: bg ? 'background' : 'user-visible' }) : setTimeout(f, bg ? 20 : 0);
function hourMap(h) {
  if (hourGen !== curGen) { hourMaps.clear(); hourGen = curGen; hourMs = 0; hourMoved = false; }
  let e = hourMaps.get(h);
  if (!e) hourMaps.set(h, e = { a: new Uint8Array(cur.n), j: 0, ms: 0 });
  return e;
}
function scoreSlice(e, h, until) { // more of hour h's map, until the deadline; true once it is whole
  while (e.j < cur.n) {
    const t = performance.now(), j1 = Math.min(cur.n, e.j + 8192);
    scoreCells(cur, h, h + 1, cur.idx, e.j, j1, 0, e.a); e.j = j1; e.ms += performance.now() - t;
    if (e.j === cur.n) hourMs = e.ms;
    else if (performance.now() > until) return false;
  }
  return true;
}
let settleTimer = 0;
function renderNow() {
  renderQueued = false;
  document.dispatchEvent(new CustomEvent('ps:hour', { detail: { h: state.h } })); // round 17 day map: the hour on the map is (re)drawn; js/seastate.js listens
  // While scrubbing (renders < 300 ms apart) the spot list, outlines and open card wait until it settles: they cost ~20 ms a frame on a phone.
  // The heat fades from the old hour (or fish) to the new only when not scrubbing: playing, Now, ★, a tap.
  const busy = performance.now() - renderedAt < 300;
  drawConditions(); drawTimeline(); drawWhen();
  hourMap(state.h); if (hourLast !== state.h) { hourMoved ||= hourLast >= 0; hourLast = state.h; }
  hourJob = { h: state.h, fade: true, busy }; workHour(); // round 15: scrubbing fades too (120 ms, each hour over the last whole one): the map no longer jumps hour to hour // a small map is whole after the first slice: on the map at once, as it always was
  renderedAt = performance.now();
}
const pumpHour = () => { hourJobT = false; workHour(); };
// Round 16 engine, phase 2: the paint worker. The coarse image of a big map (softCells, and boxDown zoomed out) cost 80-150 ms a paint on a
// budget phone, a long task at every hour of a scrub. For a map of HW_MIN cells or more it is made in a second worker of js/hour-worker.js
// by those same functions (sent as their own text with their tables: the same pixels), from a copy of the hour's bytes and the hour's
// colour table; the page puts the pixels on the canvas and draws the rest (the fine image zoomed in, lines, glow) as before. One image at a
// time, the newest asked for next; an image that arrives after the hour has moved on is still shown, so the map keeps moving under a
// scrub. The first paint, small maps, a zoom or option change while an image is made, no Worker, any failure: paint() makes it here.
const PP = { w: null, busy: false, next: null, gen: -1, zg: undefined, tok: 0, off: false, t: 0 };
let shownTok = 0, settleDue = false;
function ppEnd(off) {
  PP.w?.terminate(); clearTimeout(PP.t);
  const redo = (PP.busy || PP.next) && !document.hidden;
  Object.assign(PP, { w: null, busy: false, next: null, gen: -1, zg: undefined, off: PP.off || !!off });
  if (off) console.warn('paint worker off:', off);
  if (redo && F && scored) paint(true, false);
}
function ppSend() {
  const q = PP.next; PP.next = null; PP.busy = true; PP.tok = q.tok;
  PP.w.postMessage({ paint: q.m }, [q.m.a.buffer]);
  clearTimeout(PP.t); PP.t = setTimeout(() => ppEnd('no answer'), HW_WAIT);
}
function ppAsk(e, fade, busy) { // the coarse image of the hour just put into `scores`, from the paint worker; false: paint() makes it
  if (PP.off || HW.off || typeof Worker !== 'function' || shownN < HW_MIN || !map.hasLayer(heat) || document.hidden) return false;
  try {
    if (!PP.w) {
      if (CLIP && !COASTAL) toShore(scores);
      PP.w = new Worker('js/hour-worker.js');
      PP.w.onmessage = ppGot; PP.w.onerror = ev => { ev.preventDefault?.(); ppEnd(ev.message || 'error'); };
      PP.w.postMessage({ fns: { softCells: String(softCells), boxDown: String(boxDown), toShore: String(toShore), lowImg: String(lowImg), greyPx: String(greyPx) },
        set: { W, H, N, MROW, EFX, EFY, EDGE, CLIP, COASTAL, ON: new Uint8Array(101), scores: new Uint8Array(N), shore: new Uint8Array(N), px32: new Uint32Array(N),
          lowImgs: [], boxS: new Float32Array(0), fH: null, fN: null, fN32: null, f8: null, zoneGrey: null, shownIdx: null, shownN: 0 } });
    }
    zoneSync(); // as paint(): the zones of this hour's month, before their grey list is read
    const bands = !!state.layers?.bands, grey = map.hasLayer(protLayer), zg = grey ? (zoneGrey ||= zoneGreyList()) : null, m = { tok: shownTok, a: e.a.slice(), on: ON.slice(),
      lut: (bands ? LUTFB32 : LUTF32).slice(), rnd: bands ? 0 : .5, d: lowFor(cellPx()), grey };
    if (PP.gen !== shownGen) { m.idx = shownIdx; PP.gen = shownGen; }
    if (grey && zg !== PP.zg) { m.zoneGrey = zg; PP.zg = zg; }
    if (PP.next) { if (PP.next.m.idx) m.idx = PP.next.m.idx; if (PP.next.m.zoneGrey !== undefined && m.zoneGrey === undefined) m.zoneGrey = PP.next.m.zoneGrey; } // the one it replaces never left
    PP.next = { m, tok: shownTok, fade, busy, bands, grey, lutV };
    PP.cur = PP.busy ? PP.cur : null;
    if (!PP.busy) { PP.cur = PP.next; ppSend(); }
    return true;
  } catch (err) { ppEnd(err.message || 'failed'); return false; }
}
function ppGot({ data: m }) {
  clearTimeout(PP.t); PP.busy = false;
  const q = PP.cur, now = m.tok === shownTok; PP.cur = PP.next;
  if (PP.next) ppSend();
  if (!q || !F || !scored || !map.hasLayer(heat) || document.hidden) { paintStale = true; return; }
  if (m.d !== lowFor(cellPx()) || q.bands !== !!state.layers?.bands || q.grey !== map.hasLayer(protLayer) || (now && q.lutV !== lutV)) { if (now) paint(q.fade, q.busy); return; } // the zoom or an option changed meanwhile
  paint(q.fade, now ? q.busy : true, { vis: m.vis, img: new ImageData(new Uint8ClampedArray(m.px.buffer), W / m.d, H / m.d), f8: m.f8 });
  if (now && isoStale && !settleDue) drawZones(); // the lists were settled before the image came: the lines now
}
document.addEventListener('visibilitychange', () => { if (document.hidden) ppEnd(); });
function showHour(e, fade, busy) { // a whole hour map into `scores` and onto the map
  let lvNew = false; // round 17: a new fish or method, a new LEVEL
  if (shownGen !== hourGen) { shownIdx = cur.idx.slice(0, cur.n); shownN = cur.n; shownGen = hourGen; const L = levelOf(cur); lvNew = L !== LEVEL; LEVEL = L; } // prepare() reuses cur.idx: a copy
  let hi = 0; scores.fill(0); SHARE.fill(0); for (let j = 0, a = e.a; j < shownN; j++) { const v = scores[shownIdx[j]] = a[j]; SHARE[v]++; if (v > hi) hi = v; }
  const hiNew = hi !== rangeHi; rangeHi = hi; ANC = anchors(); if (hiNew || lvNew) buildLut(); // the cut follows the hour's best (round 9); ANC ranks its water for the glow (round 16)
  const first = !scored; scored = true; shownTok++;
  if (first || !ppAsk(e, fade, busy)) paint(fade, busy); // a big map: its image from the paint worker (ppGot paints)
}
function workHour() { // the hour waiting for its map: a slice of it (a big map: asked of the worker), then onto the map once whole
  if (!hourJob) return;
  const e = hourMap(hourJob.h);
  if (e.j < cur.n && HW.early?.gen === curGen && HW.early.h === hourJob.h) { e.a = HW.early.a; e.j = cur.n; e.ms = hourMs = HW.early.ms; HW.early = null; } // scored while the fish was made ready
  if (e.j < cur.n) { const r = hwAsk(hourJob.h); if (r) { if (r === 2 && !hourJobT) { hourJobT = true; soonTask(pumpHour); } return; } }
  if (!scoreSlice(e, hourJob.h, performance.now() + SLICE_MS)) { if (!hourJobT) { hourJobT = true; soonTask(pumpHour); } return; }
  const { fade, busy } = hourJob; hourJob = null;
  showHour(e, fade, busy);
  clearTimeout(settleTimer);
  if (busy) { settleDue = true; settleTimer = setTimeout(settle, 180); } else settle();
  scoreAhead();
}
// Round 16 engine: the hour worker. A big map (HW_MIN cells or more: All fish or an open-water fish by boat, ~525k cells) took 0.3-0.5 s of
// main-thread slices an hour on a budget phone, so a finger on the timeline never saw the map move. Its hours are now scored in a worker by
// model.js scoreCells itself (js/hour-worker.js loads model.js with importScripts: one scoring code, nothing copied), an hour a job, the newest
// hour asked for next; the bytes come back as a transferable and the main thread only paints. A map that arrives after the finger has moved
// on is still shown (quick, without the lists): the map follows a scrub a step behind instead of standing still. Small maps (most fish:
// ~25k cells, a few ms) stay on the main thread, as does everything the worker cannot do (below), a browser without Worker, and any
// failure or silence of the worker (HW_WAIT): the old path, same scores.
// The worker gets copies of the grids scoreCells reads (model.js hwGlobals, hwFish: ~25 MB once, ~13 MB a fish) and, per ocean day, the cells' temperature fit
// (model.js tempFitDay, made here in slices: it has no ocean file). It ends when the page is hidden.
// ponytail: one worker, one hour at a time, no abort (a fish change waits for the hour in flight, < 0.5 s); spearfishing and a personal
// catch correction stay on the main thread (their maps are small or rare). Two workers if a scrub should follow every hour.
const HW = { w: null, F: null, gen: -1, busy: -1, days: [], tf: null, off: false, t: 0 }, HW_MIN = 60000, HW_WAIT = 8000;
// Whether a fish's map is the worker's: asked once per fish and method (gen), not at every hour (phase 3: the personal correction reads localStorage each time it is asked; a change of it prepares the fish again, so a new gen)
const hwOk = (P = cur, gen = curGen) => { if (HW.okGen !== gen) { HW.okGen = gen; HW.ok = P.n >= HW_MIN && !P.spear && !(window.PsPersonal || window.PsCatch)?.correction(P.s.id); } return HW.ok && !HW.off && typeof Worker === 'function'; };
function hwEnd(off) { // the worker goes (a hidden page, a new forecast); off: for good, the main thread scores from here on
  HW.w?.terminate(); clearTimeout(HW.t);
  Object.assign(HW, { w: null, F: null, gen: -1, busy: -1, days: [], tf: null, off: HW.off || !!off });
  if (off) { console.warn('hour worker off:', off); if (hourJob) workHour(); }
}
// P, gen (phase 3): a fish still being made ready (model.js prepSoon) and the number curGen will take when it is on the map.
function hwAsk(h, P = cur, gen = curGen) { // hour h of cur's map from the worker. 0: not its work (score here); 1: asked or waiting its turn, hwGot goes on; 2: call again (a slice of the day's temperatures was made)
  if (!hwOk(P, gen)) return 0;
  try {
    if (HW.F !== F) hwEnd();
    if (!HW.w) {
      HW.w = new Worker('js/hour-worker.js');
      HW.w.onmessage = hwGot; HW.w.onerror = e => { e.preventDefault?.(); hwEnd(e.message || 'error'); };
      HW.w.postMessage({ fns: Object.fromEntries(Object.entries(HW_FNS()).map(([k, f]) => [k, String(f)])), set: hwGlobals(), scripts: HW_SCRIPTS });
      HW.F = F;
    }
    if (HW.busy >= 0) return P === cur ? 1 : 2; // (the fish to come: again when the hour in flight is back)
    if (HW.gen !== gen) { // this fish and method (model.js hwFish)
      HW.w.postMessage(hwFish(P));
      HW.gen = gen; HW.days = []; HW.tf = null;
    }
    const day = P.od ? P.od[h] : -1;
    if (day >= 0 && !HW.days.includes(day)) { // the day's temperature fit of every cell, in slices
      if (HW.tf?.day !== day || HW.tf.gen !== gen) HW.tf = { day, gen, a: new Float64Array(P.n), j: 0 };
      const q = HW.tf, until = performance.now() + SLICE_MS;
      while (q.j < P.n) { const j1 = Math.min(P.n, q.j + 4096); tempFitDay(P, day, q.a, q.j, j1); q.j = j1; if (j1 < P.n && performance.now() > until) return 2; }
      HW.w.postMessage({ tfit: q.a, day }, [q.a.buffer]); HW.tf = null;
      HW.days.push(day); if (HW.days.length > 2) HW.days.shift();
    }
    HW.w.postMessage({ h, gen, day }); HW.busy = h;
    clearTimeout(HW.t); HW.t = setTimeout(() => hwEnd('no answer'), HW_WAIT);
    return 1;
  } catch (e) { hwEnd(e.message || 'failed'); return hourJob ? 1 : 0; } // hwEnd went on with the hour on the main thread
}
function hwGot({ data: m }) {
  HW.busy = -1; clearTimeout(HW.t);
  if (m.gen !== curGen || hourGen !== curGen) { if (m.gen >= curGen) HW.early = m; if (hourJob) workHour(); return; } // another fish since: its own hour now; the fish to come (prepSoon): kept for its first render
  const e = hourMap(m.h); e.a = m.a; e.j = cur.n; e.ms = hourMs = m.ms;
  if (hourJob && hourJob.h !== m.h && !document.hidden) { clearTimeout(settleTimer); showHour(e, true, true); } // the finger has moved on: this hour meanwhile
  if (hourJob) workHour(); else scoreAhead();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) hwEnd(); else if (hourJob) workHour(); });
function scoreAhead() { // the next hour around the one shown (nearest first) of a slow map, in a background slice
  if (aheadTask || hourJob || !hourMoved || hourMs < 12 || document.hidden) return;
  let h = -1;
  for (let d = 1; d <= HOURS_AROUND && h < 0; d++) for (const k of [state.h + d, state.h - d]) if (k >= 0 && k < F.T && !(hourMaps.get(k)?.j === cur.n)) { h = k; break; }
  if (h < 0) return;
  while ((hourMaps.size + 1) * cur.n > HOURS_MB * 1e6) { // the farthest hour goes
    let far = state.h; for (const k of hourMaps.keys()) if (Math.abs(k - state.h) > Math.abs(far - state.h)) far = k;
    if (Math.abs(far - state.h) <= Math.abs(h - state.h)) return; hourMaps.delete(far);
  }
  const r = hwAsk(h); // a big map: the worker's
  if (r === 1) return;
  aheadTask = true;
  if (r) { soonTask(() => { aheadTask = false; scoreAhead(); }, true); return; }
  soonTask(() => { aheadTask = false; if (hourGen === curGen && !hourJob && !document.hidden) { scoreSlice(hourMap(h), h, performance.now() + SLICE_MS); scoreAhead(); } }, true);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) return; if (hiddenPlay) { hiddenPlay = false; if (F) render(); } else if (F) scoreAhead(); });
function settle() { settleDue = false; const f = state.focus; if (isoStale) drawZones(); drawTop(); if (state.focus !== f) drawConditions(); refreshOpen(); } // drawTop may move the focus spot the readings follow (renderNow drew them for the old one)

function describe(la, lo) {
  let b = null;
  for (const [name, , sla, slo] of NAMED) { const r = km([sla, slo], [la, lo]); if (r.d < 2.5 && (!b || r.d < b.d)) b = { ...r, name: placeName(name) }; }
  if (!b) for (const [en, el, pla, plo] of PLACES) { const r = km([pla, plo], [la, lo]); if (!b || r.d < b.d) b = { ...r, name: state.lang === 'el' ? el : en }; }
  return b.d < .25 ? tr('at', b.name) : tr('of', fmtKm(b.d), compass(b.bearing), b.name);
}
let tops = [];
const B6 = 6, BW = Math.ceil(W / B6), blockBest = new Int32Array(BW * Math.ceil(H / B6));
// The 8 numbered pins are made once and hourMoved: rebuilt each settle, their DOM was redone and their pop restarted at every hour.
// Each: a ring at the spot itself with its rank in it (css/map-fx.css); the three best in view also wear a dark tag on a stem over it,
// "#rank" and the score as a dial (core.js ring()), so the peaks read at a glance and the rest stay quiet. Its element is kept: drawTop
// sets only the score and colour, and only when they change; a move only swaps which three wear the tag (markDials).
const pinEls = [], pinSet = [];
map.createPane('tops').style.zIndex = 646; // over the catch and sighting pins (js/pins.js, 645): the best spots' dials stay readable; under the north's mask (650)
const pinMarks = Array.from({ length: 8 }, (_, n) => {
  const el = pinEls[n] = L.DomUtil.create('div', n ? 'tp' : 'tp tp1');
  el.innerHTML = `<i class="tp-ring"><b>${n + 1}</b></i><span class="tp-cap"><b>#${n + 1}</b><span class="ring sm"><b></b></span><em class="tp-who"></em><em class="tp-where"></em></span>`;
  return L.marker([0, 0], { icon: L.divIcon({ className: 'top-pin', html: el, iconSize: [0, 0] }), keyboard: false, pane: 'tops' }).on('click', () => tops[n] && openCell(tops[n].i));
});
const placeOf = ([la, lo]) => { let b = PLACES[0], bd = Infinity; for (const p of PLACES) { const d = (p[2] - la) ** 2 + ((p[3] - lo) * .82) ** 2; if (d < bd) { bd = d; b = p; } } return state.lang === 'el' ? b[1] : b[0]; }; // the nearest of the coast's main places (core.js)
function drawTop() {
  // The best cell of each 6×6 block (the first in reading order on a tie), from the cells that can score only (scores are 0 off shownIdx): ~2 ms → ~0.1
  const cands = []; blockBest.fill(-1);
  for (let k = 0; k < shownN; k++) {
    const i = shownIdx[k], s = scores[i]; if (s < 40) continue;
    const b = ((i / W | 0) / B6 | 0) * BW + (i % W / B6 | 0), j = blockBest[b];
    if (j < 0 || s > scores[j] || s === scores[j] && i < j) blockBest[b] = i;
  }
  for (const i of blockBest) if (i >= 0) cands.push([scores[i], i]);
  cands.sort((a, b) => b[0] - a[0]); // stable: ties keep block order
  const gap = state.mode === 'boat' ? 3 : 1.5;
  tops = [];
  for (const [s, i] of cands) {
    const p = [latOf(i), lonOf(i)];
    if (tops.every(t => km(t.p, p).d > gap)) tops.push({ s, i, p });
    if (tops.length === 8) break;
  }
  drawSpotList(tops); // Where to go (ui.js)
  tops.forEach((t, n) => {
    pinMarks[n].setLatLng(t.p);
    // round 15: the tag names the fish and the hour (All fish: the fish likeliest there, js/model.js likelyAt)
    const el = pinEls[n], who = sp.all ? likelyAt(t.i, state.mode, 1)[0] : sp, name = who ? fishName(who) : '', at = hm(hours[state.h].t), label = name ? `${name} · ${at}` : at, key = t.s + label + t.i + state.lang; if (pinSet[n] === key) return;
    pinSet[n] = key; el.style.setProperty('--c', solid(t.s)); el.style.setProperty('--p', t.s); el.querySelector('.ring b').textContent = t.s; el.querySelector('.tp-who').innerHTML = name ? `<span>${esc(name)}</span> · ${at}` : at; // the name gives way (…), the hour stays
    el.querySelector('.tp-where').innerHTML = `<span>${esc(placeOf(t.p))}</span> · ${at}`; // round 16: the whole island's view names the place (css/map-fx.css)
    el.title = `#${n + 1} · ${t.s} · ${rating(t.s)} · ${label}`;
  });
  spacePins(); noGood();
  if (!state.picked && tops[0]) state.focus = tops[0].i; // conditions follow the best spot until a cell is clicked
}
// Round 17 phase 4 (the lead: on a rough day the pins vanish and the map just looks empty): when no water scores 40 ("good", core.js rating)
// at the hour shown, one short line on the map says so and where to look instead, from the same numbers as the day chips (best: the best
// chance each hour): a better hour this day ("No good water at this hour. Best at 07:00"), else the week's best day from now ("No good water
// today. Best day: Fri 20"), else "No good water this week". A tap goes to that hour (that day: its best hour).
// Round 17 G: the words and the hour come from noGoodNext(), so the Where to go list (js/ui.js drawSpotList) says the same as the map.
let ngEl = null, ngTo = -1;
function noGood() {
  ngEl ||= (() => { const b = L.DomUtil.create('button', 'no-good', map.getContainer()); b.type = 'button'; b.hidden = true; L.DomEvent.disableClickPropagation(b); b.addEventListener('click', () => { if (ngTo >= 0 && !b.hidden) setHour(ngTo); }); return b; })();
  if (tops.length || !F || !scored || !map.hasLayer(heat)) { ngEl.hidden = true; return; }
  const r = noGoodNext(); ngTo = r.h; ngEl.textContent = r.text; ngEl.disabled = r.h < 0; ngEl.hidden = false;
}
function noGoodNext() { // { text, h }: the line for an hour with no good water, and the hour it points to (-1: none this week)
  const days = tlDays(), di = days.findIndex(([a, b]) => state.h >= a && state.h < b), td = days.findIndex(([a, b]) => state.first >= a && state.first < b);
  const top = (a, b) => { let k = -1; for (let h = Math.max(a, state.first); h < b; h++) if (k < 0 || best[h] > best[k]) k = h; return k; }; // the best hour from now on
  let text = '', k = di >= 0 ? top(...days[di]) : -1;
  if (k >= 0 && best[k] >= 40) text = tr('ng_hour', hm(hours[k].t));
  else {
    k = -1; let bd = -1;
    // round 17 G: from today, the next day with good water ("Best next"; ★ stays the week's single best hour); from another day, the week's best day
    days.forEach(([a, b], d) => { if (d === di || b <= state.first || di === td && bd >= 0) return; const h = top(a, b); if (h >= 0 && best[h] >= 40 && (k < 0 || di === td || best[h] > best[k])) { k = h; bd = d; } });
    text = bd < 0 ? tr('ng_week') : tr(di === td ? 'ng_today' : 'ng_day', `${dayName(days, bd)} ${hm(hours[k].t)}`); // round 17 G: the hour a tap goes to, named ("Tomorrow 07:00")
  }
  return { text, h: k };
}
function spacePins() { // zoomed out, a pin whose capsule would touch a better-ranked one's stays off the map (the list keeps every spot)
  const shown = [], hot = window.PsHot?.owns(); // round 17 K: the hot spots' own markers stand in for the pins (js/hotspots.js; Layers > Fishing chance (all water): the pins)
  pinMarks.forEach((m, n) => {
    const p = n < tops.length && !hot && map.latLngToLayerPoint(m.getLatLng());
    if (p && shown.every(q => Math.abs(q.x - p.x) >= 62 || Math.abs(q.y - p.y) >= 36)) { shown.push(p); pins.addLayer(m); } else pins.removeLayer(m);
  });
  markDials();
  // round 9: up to the coast's villages (zoom 11) the place names (js/map-marks.js) keep clear of the pins: the three best shown with their tag over them
  window.PsAreas?.space(); // the fishing areas' names give way to the pins too (js/areas.js)
  window.PsMarks?.avoid(hot ? PsHot.avoidList() : map.getZoom() < 11 ? pinMarks.filter(m => pins.hasLayer(m)).map((m, k) => { const ll = m.getLatLng(); return [ll.lat, ll.lng, k < 3 ? [-38, -52, 38, 12] : [-12, -12, 12, 12]]; }) : []);
}
function markDials() { // the three best-ranked pins in view wear the tag (8 bounds checks a move)
  const v = map.getBounds(); let k = 0;
  pinMarks.forEach((m, n) => { const on = k < 3 && pins.hasLayer(m) && v.contains(m.getLatLng()); k += on; pinEls[n].classList.toggle('dial', on); });
}
map.on('zoomend', spacePins);
map.on('moveend', markDials);
// Round 9: the whole island (under zoom 9.5) is the best spots' view: the live wind / current chips (js/obs.js, css/map-fx.css) sat on their tags
const zoomClass = () => { const c = map.getContainer().classList, z = map.getZoom(); c.toggle('ps-zlo', z < 9.5); c.toggle('ps-zhi', z >= 10.5); }; // round 16: ps-zhi, the coast's view (css/map-fx.css)
map.on('zoomend', zoomClass); zoomClass();

const arrow = deg => `<svg width="11" height="11" viewBox="0 0 10 10" style="transform:rotate(${deg}deg)" aria-hidden="true"><path d="M5 .5l3 4H6v5H4v-5H2z" fill="currentColor"/></svg>`;
const seaNear = ll => { let b = SAMPLE[0], bd = Infinity; for (const j of SAMPLE) { const d = (latOf(j) - ll.lat) ** 2 + ((lonOf(j) - ll.lng) * .82) ** 2; if (d < bd) { bd = d; b = j; } } return b; }; // nearest scoreable sea cell
function nextWindow(list, t) { const w = list.find(([, b]) => b > t); return w ? `${hm(w[0])}–${hm(w[1])}` : '–'; }
function drawConditions() { // the readings that matter most, as mini instruments (js/instruments.js: built once, patched each hour); the drawer has the rest (moreConditions in ui.js)
  if (F) PsInst.strip($('#strip'), state.focus >= 0 ? state.focus : seaNear(map.getCenter()), state.h); // nothing scores yet (a fish that is not biting): the sea mid-map
}
let tlFor = null, tlPh = null; // tlPh: the playhead, all an hour step moves
const tlDays = (from = 0) => { const d = []; for (let h = from; h < F.T; h++) h === from || hours[h].local === 0 ? d.push([h, h + 1]) : d[d.length - 1][1] = h + 1; return d; }; // [from, to) per local day
function dayName(days, k) { // Yesterday, Today, Tomorrow, else e.g. "Thu 29"
  const r = k - days.findIndex(([a, b]) => state.first >= a && state.first < b);
  return r === -1 ? tr('yesterday') : r === 0 ? tr('cToday') : r === 1 ? tr('cTomorrow') : fmtT(hours[days[k][0]].t, { weekday: 'short', day: 'numeric' });
}
// The best chance anywhere, hour by hour, as one smooth curve coloured along its length by each hour's chance, its area fading down;
// night hours darker bands, the past hatched and greyed, now a dashed line, the hour on the map a white line with a knob on the curve.
// round 17 U (the owner, twice: "dude!!"): the wide strip drew every day's curve side by side, nine copies of the same two humps. The humps
// are the fish's daily rhythm (dawn and dusk), the same every day by design; the one day factor with evidence is the sea. So on every screen
// only the day picked draws its 24 h curve, and the days are a strip of cards of what really differs (dayCards): the day's best chance in
// the map's own fixed colours (levelOf), its gap to the day picked (+3, −2), its best window, and the sea then at the water in view (the
// readings strip's numbers: model.js scoreAt, after the coast's shelter) as a wind arrow, Beaufort and waves. A word only where it is true.
// Drawn in px (again when the width changes), so lines and knob keep their size. Hour k sits at k·dx, where the native slider over it puts it.
let tlW = 0; // the track's width (it does not depend on what is drawn in it)
new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w !== tlW) { tlW = w; tlFor = null; if (F) drawTimeline(); } }).observe($('#tl'));
const tlH = () => 36; // the chart's height: css/timeline.css lays #hour over it at the same height
const greyed = s => { const c = heatRgba(Math.max(s, 50)), l = (3 * c[0] + 6 * c[1] + c[2]) / 10; return `rgb(${c.slice(0, 3).map(v => (v + 3 * l) / 4 | 0)})`; }; // the past: its chance's colour, mostly grey
function monotone(ys, dx) { // an SVG path through (k·dx, ys[k]): cubic and monotone between hours (as d3's curveMonotoneX), so it never shows a chance no hour has
  const n = ys.length, s = ys.slice(1).map((y, k) => (y - ys[k]) / (dx || 1)), f = v => v.toFixed(1); // dx 0: a hidden track (another page open): no NaN in the path
  const m = ys.map((_, k) => k === 0 ? s[0] : k === n - 1 ? s[n - 2] : (Math.sign(s[k - 1]) + Math.sign(s[k])) * Math.min(Math.abs(s[k - 1]), Math.abs(s[k]), Math.abs(s[k - 1] + s[k]) / 4));
  let p = `M0,${f(ys[0])}`;
  for (let k = 1; k < n; k++) p += `C${f((k - 2 / 3) * dx)},${f(ys[k - 1] + m[k - 1] * dx / 3)} ${f((k - 1 / 3) * dx)},${f(ys[k] - m[k] * dx / 3)} ${f(k * dx)},${f(ys[k])}`;
  return n > 1 ? p : p + `H${f(dx)}`; // a one-hour stub: flat across
}
const movePh = () => { const k = state.h - tlFor.from; tlPh.style.transform = `translateX(${(k * tlFor.dx).toFixed(1)}px)`; tlPh.firstChild.style.transform = `translateY(${tlFor.ys[k].toFixed(1)}px)`; };
// round 17 U: the cards' parts. lvOf: the fish's colour level (levelOf): the map's own once it shows this fish, else worked out once a fish.
const tlLv = { g: -1, v: 100 }, lvOf = () => shownGen === curGen ? LEVEL : tlLv.g === curGen ? tlLv.v : (tlLv.g = curGen, tlLv.v = levelOf(cur));
const lvCol = (s, lv) => `rgb(${heatRgba(relP(s * 100 / lv)).slice(0, 3)})`; // a score in the heat map's fixed colours (FIX), as the map draws it
let seaAt = '', seaI = -1;
function seaCell() { // round 17 U: the water in view: the open spot, else the sea nearest the map's middle (the readings strip's cell, no spot open)
  if (typeof sel !== 'undefined' && sel.i >= 0) return sel.i;
  const c = map.getCenter(), k = c.lat.toFixed(4) + c.lng.toFixed(4); if (k !== seaAt) { seaAt = k; seaI = seaNear(c); } return seaI;
}
// round 17 U. Per day (the whole day, as the Calendar's: today's best may be behind us): its best hour t, its window p..q (the hours either side within 90 % of it, up to 3 h each way,
// as the Forecast tab's windows) and the sea at cell i then. The word: Rough past the method's limit for wind or waves, Windy past its
// comfortable wind, Calm when wind and waves are both comfortable (js/conditions.js LIM, the instruments' zones), none in between. Shown
// only when the days' seas differ (the same word on every day says nothing) and some day stands out, never on a past day. ★ Best day: the day of the ★ hour
// (drawWhen's bestHour), unless every day from today is within 3 points: then T's "Similar all week" line instead, once.
function dayCards(days, i) {
  const L = window.PsCond?.lim(state.mode), o = {};
  const out = days.map(([a, b]) => {
    let t = a; for (let h = a; h < b; h++) if (best[h] > best[t]) t = h;
    const k = .9 * best[t]; let p = t, q = t;
    while (p > a && t - p < 3 && best[p - 1] >= k) p--;
    while (q < b - 1 && q - t < 3 && best[q + 1] >= k) q++;
    for (const x in o) delete o[x];
    scoreAt(i, t, o);
    const n = t * NN, u = bil(F.u, n, i), v = bil(F.v, n, i), ws = o.wsEff ?? Math.hypot(u, v), wv = o.wEff ?? bil(F.wave, n, i);
    const sea = !L ? '' : ws >= L.wind[1] || wv > L.wave[1] ? 'rough' : ws > L.wind[0] ? 'windy' : wv <= L.wave[0] ? 'calm' : '';
    return { top: Math.round(best[t]), p, q, ws, wv, deg: Math.atan2(u, v) * 180 / Math.PI, past: b <= state.first, sea, v: '' };
  });
  const fut = out.filter(d => !d.past), tops = fut.map(d => d.top), similar = fut.length >= 3 && Math.max(...tops) - Math.min(...tops) <= 3;
  if (!similar && fut.some(d => d.sea !== fut[0].sea)) for (const d of fut) d.v = d.sea;
  let bh = state.first; for (let h = state.first; h < F.T; h++) if (best[h] > best[bh]) bh = h;
  const bd = out[days.findIndex(([a, b]) => bh >= a && bh < b)];
  if (bd && !similar) { bd.star = true; bd.v = 'best'; }
  return { out, similar };
}
const hh = x => String(x % 24).padStart(2, '0'), signed = d => d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '±0';
function drawTimeline() { // round 17 U: one day's curve under a strip of day cards, on every screen
  if (typeof PsTimeView !== 'undefined') best = PsTimeView.of(best); // round 16 timing view: the line of the water in view (js/time-view.js)
  tlW ||= $('#tl').clientWidth; // before the observer's first call (it waits for a frame: none in a hidden page)
  const all = tlDays(), t0 = all.find(([a, b]) => state.first >= a && state.first < b)?.[0] ?? 0;
  // round 17 G: the day chips are today and the days ahead; the past days only while the hour on show is in one (looking back from elsewhere)
  const days = state.h >= t0 ? all.filter(([, b]) => b > state.first) : all, di = Math.max(0, days.findIndex(([a, b]) => state.h >= a && state.h < b)), [from, to] = days[di];
  const si = seaCell(), lv = lvOf();
  const same = tlFor && tlFor.best === best && tlFor.lang === state.lang && tlFor.nd === days.length && tlFor.si === si && tlFor.lv === lv; // the same days, scale and cards
  if (same && tlFor.from === from && tlFor.to === to) { movePh(); return; } // the same chart: only the playhead moves
  const hi = Math.max(...best), span = Math.max(hi - Math.min(...best), 20); // one scale for all days so they compare; the best hour at the top
  const n = to - from, ch = tlH(), dx = tlW / Math.max(1, n - 1), X = h => ((h - from) * dx).toFixed(1);
  const ys = best.slice(from, to).map(sc => 6 + (ch - 8) * (hi ? .86 * clamp((hi - sc) / span) : .94)); // 6 px over the top for the knob; nothing scores (banned or closed fish): flat
  let stops = '', night = '', hrs = '', n0 = 0;
  for (let h = from; h < to; h++) {
    const x = hours[h];
    stops += `<stop offset="${n > 1 ? ((h - from) / (n - 1)).toFixed(4) : 0}" stop-color="${h < state.first || !hi ? greyed(best[h]) : lvCol(best[h], lv)}"/>`; // round 17 U: the cards' colours
    if (x.period === 'night') {
      if (h === from || hours[h - 1].period !== 'night') n0 = h;
      if (h === to - 1 || hours[h + 1].period !== 'night') night += `M${Math.max(0, (n0 - from - .5) * dx).toFixed(1)} 0H${Math.min(tlW, (h - from + .5) * dx).toFixed(1)}V${ch}H${Math.max(0, (n0 - from - .5) * dx).toFixed(1)}Z`;
    }
    if (x.local && x.local % 3 === 0 && hours[h - 1]?.local !== x.local) hrs += `<em style="left:${X(h)}px">${hh(x.local)}</em>`; // every 3 h; once on the night the clocks go back
  }
  const line = monotone(ys, dx), now = state.first >= from && state.first < to;
  const chart = `<div class="tl-chart"><svg width="${tlW}" height="${ch}" viewBox="0 0 ${tlW} ${ch}" aria-hidden="true"><defs>` +
    `<linearGradient id="tl-c" gradientUnits="userSpaceOnUse" x2="${tlW}">${stops}</linearGradient>` +
    `<linearGradient id="tl-v" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></linearGradient>` +
    `<mask id="tl-m"><rect width="100%" height="100%" fill="url(#tl-v)"/></mask>` +
    `<pattern id="tl-x" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V5" stroke="#fff" stroke-opacity=".1" stroke-width="1.5"/></pattern></defs>` +
    `<path class="tl-night" d="${night}"/><path d="${line}V${ch}H0Z" fill="url(#tl-c)" mask="url(#tl-m)"/>` +
    (state.first > from ? `<rect width="${now ? X(state.first) : tlW}" height="${ch}" fill="url(#tl-x)"/>` : '') +
    (now ? `<path class="tl-nowl" d="M${X(state.first)} 0V${ch}"/>` : '') +
    `<path class="tl-line" d="${line}" stroke="url(#tl-c)"/></svg><i class="tl-ph"><b></b></i>${hrs}</div>`;
  const tl = $('#tl'), wk = same ? tlFor.wk : dayCards(days, si);
  let strip = tlFor?.strip;
  if (!same) { // a card a day: name (★ the best day), best chance, gap to the day picked; best window and the word; the sea then
    const cut = F.cutAt ? `<span class="tl-cut">${esc(tr('noWavesAfter', whenT(F.cutAt)))}</span>` : ''; // the wave forecast ended early: so does the timeline
    strip = `<div class="tl-dtabs">${days.map(([a, b], k) => {
      const d = wk.out[k], nm = dayName(days, k), w = `${hh(hours[d.p].local)}–${hh(hours[d.q].local + 1)}`, bf = window.PsWeather?.beaufort?.(d.ws) ?? 0;
      const tip = `${nm} · ${d.top} · ${w} · ${tr('k_wind')} ${compass(d.deg + 180)} ${Math.round(d.ws)} km/h · ${tr('k_waves')} ${nf(d.wv)} m`;
      return `<button type="button" class="tl-dc${d.past ? ' past' : a <= state.first ? ' today' : ''}" data-day="${a}" data-end="${b}" aria-pressed="false" title="${esc(tip)}">` +
        `<span class="tl-d1"><b>${d.star ? '<i class="tl-star">★</i>' : ''}${esc(nm)}</b><span class="pill" style="background:${lvCol(d.top, lv)}">${d.top}</span><small class="tl-df"></small></span>` +
        `<span class="tl-d2">${w}${d.v ? `<em class="tl-dv ${d.v}">${esc(tr('u_' + d.v))}</em>` : ''}</span>` +
        `<span class="tl-d3">${arrow(d.deg)}${esc(tr('in_bft', bf))} · ${nf(d.wv)} m</span></button>`;
    }).join('')}${cut}</div>` + (wk.similar ? `<p class="tl-same" title="${esc(tr('t_sameWeek'))}">${esc(tr('t_sameWeek'))}</p>` : '');
  }
  // Round 16 X: a move gives the line of the water in view (js/time-view.js), so "best" is new after every pan; the strip is written again
  // only when its own text changed, and then scrolled to the day: else only the chart, and no layout read for the scroll
  const keep = tlFor?.strip === strip && tl.firstElementChild?.matches('.tl-dtabs'), moved = !keep || tlFor.di !== di;
  if (keep) tl.lastElementChild.outerHTML = chart; else tl.innerHTML = strip + chart;
  tl.classList.add('one-day');
  if (moved) { // the day picked: pressed, and every other card's gap to it (+3, −2)
    const bs = tl.firstElementChild.querySelectorAll('[data-day]'), top = wk.out[di].top;
    bs.forEach((b, k) => { b.setAttribute('aria-pressed', k === di); b.querySelector('.tl-df').textContent = k === di ? '' : signed(wk.out[k].top - top); });
    const s = tl.firstElementChild, on = bs[di], glide = keep && !matchMedia('(prefers-reduced-motion: reduce)').matches; // the day picked in the middle of
    requestAnimationFrame(() => s.scrollTo({ left: on.offsetLeft - (s.clientWidth - on.offsetWidth) / 2, behavior: glide ? 'smooth' : 'auto' })); // its strip, next frame
  }
  Object.assign($('#hour'), { min: from, max: to - 1, value: state.h }); // the slider spans what is shown
  tlFor = { best, from, to, lang: state.lang, di, dx, ys, nd: days.length, strip, si, lv, wk }; tlPh = tl.querySelector('.tl-ph'); movePh();
}
function dayHour(b, want = hours[state.h].local) { // the hour a day button goes to: the hour of day `want` where that day has it (js/mobile.js turns days by a flick too)
  const d = +b.dataset.day, end = +b.dataset.end;
  let h = d; for (let k = d; k < end; k++) if (hours[k].local === want) { h = k; break; }
  return h < state.first && end > state.first ? state.first : h; // today: from now on, not back in time
}
$('#tl').addEventListener('click', e => { const b = e.target.closest('[data-day]'); if (b && F) setHour(dayHour(b)); }); // phones: the day chips
PHONE.addEventListener('change', () => { tlFor = null; if (F) drawTimeline(); }); // rotating or resizing across the phone width
let bestHour = 0;
const whenSet = {}; // what drawWhen last wrote: an hour step rewrites only what changed (the day, tags and ★ button mostly stay), so the bar's layout is left alone
const putWhen = (sel, v, html) => { if (whenSet[sel] !== v) { whenSet[sel] = v; $(sel)[html ? 'innerHTML' : 'textContent'] = v; } };
const NARROW = matchMedia('(max-width: 1180px)'); // a desktop window this narrow: the ★ button says just the time, as on phones (css/timeline.css)
NARROW.addEventListener('change', () => F && drawWhen());
function drawWhen() {
  const x = hours[state.h], t = hm(x.t), d = fmtT(x.t, { weekday: 'short', day: 'numeric', month: 'short' });
  putWhen('#when-time', t); putWhen('#when-day', d);
  $('#hour').setAttribute('aria-valuetext', `${t}, ${d}`); // a screen reader says the hour, not the slider's index
  // Round 17 hook for agent D (js/seastate.js, PsSea): a picked day's one line of what differs from today, read from the forecast's wind and
  // waves by coast and worded as sea state ("Calmer on the north coast", "Rough west coast: lee side best"). Not in PsSea yet: D adds
  // PsSea.dayLine(h, first) -> '' or a short sentence in the app's language; called at every hour step, so it caches by day.
  const dayLine = state.h >= state.first && window.PsSea?.dayLine?.(state.h, state.first) || '';
  putWhen('#when-tags', (state.h < state.first ? `<span class="tag past">${tr('pastTag')}</span>` : '') +
    `<span class="tag">${tr(x.period)}</span>${x.solunar ? `<span class="tag ${x.solunar}" title="${esc(tr(x.solunar))}">${ic('moon')}${tr('solShort')[x.solunar]}</span>` : ''}` +
    (dayLine ? `<span class="tag day-line">${esc(dayLine)}</span>` : ''), true);
  bestHour = state.first; // the best hour from now on: the past is only for looking back
  for (let h = state.first; h < F.T; h++) if (best[h] > best[bestHour]) bestHour = h;
  const bb = $('#best-btn'), w = whenT(hours[bestHour].t), long = tr('best', w, Math.round(best[bestHour])), short = isPhone() || NARROW.matches, hide = !(best[bestHour] >= 40);
  if (bb.hidden !== hide) bb.hidden = hide;
  putWhen('#best-btn', short ? `★ ${w}` : long); // phones and narrow windows: just the time
  const tip = short ? `${long}\n${tr('bestTip')}` : tr('bestTip'); if (bb.title !== tip) bb.title = tip;
}
