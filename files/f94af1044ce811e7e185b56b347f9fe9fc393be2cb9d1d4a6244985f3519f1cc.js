'use strict';
// Psarema (round 9): what a fisherman reads on a chart, drawn by the app itself, offline, in the app's language (css/map-fx.css for the legend):
//   Names     our own place names (data/map-places.js, OpenStreetMap): towns, coastal villages, capes, bays, beaches, harbours, fishing marks; a
//             priority per zoom, collisions avoided (placed once per zoom level over the whole island, so a name across a tile edge is drawn the
//             same in both tiles), a dark halo for the satellite and the chart. They replace Esri's online labels (Greek and Latin twice).
//   Features  wrecks, artificial reefs and river mouths (data/attractors.js) as small symbols, their names from zoom 13; with the names.
//   Soundings spot depths from the depth grid (core.js depth[]), about 90 px apart, from zoom 12.5: on the chart, lighter over the satellite.
//   Shore     the coast's type along the shore from zoom 12 (data/map-shore.js, OpenStreetMap): cliff, beach, harbour wall; a key under the legend.
// Each is a switch in Layers (the map overlays, css/chart.css .lp-over), remembered in state.layers (names: the old "labels" switch).
// Tiles are PsChart.HalfGrid canvases (a level per half zoom); a tile with nothing in it is an empty div (no GPU memory).
Object.assign(I18N.en, { l_soundings: 'Spot depths', soundingsTip: 'Depths in metres across the water, from the EMODnet grid', l_shore: 'Shore type',
  shoreTip: 'Cliffs, beaches and harbour walls along the coast (OpenStreetMap)', l_features: 'Wrecks, reefs, river mouths', featuresTip: 'Wrecks, artificial reefs and river mouths, named when you zoom in',
  sh_cliff: 'Cliff', sh_beach: 'Beach', sh_wall: 'Harbour wall', ft_wreck: 'Wreck', ft_reef: 'Artificial reef', ft_river: 'River mouth' });
Object.assign(I18N.el, { l_soundings: 'Βάθη', soundingsTip: 'Βάθη σε μέτρα στη θάλασσα, από το πλέγμα EMODnet', l_shore: 'Τύπος ακτής',
  shoreTip: 'Γκρεμοί, παραλίες και λιμενοβραχίονες κατά μήκος της ακτής (OpenStreetMap)', l_features: 'Ναυάγια, ύφαλοι, εκβολές', featuresTip: 'Ναυάγια, τεχνητοί ύφαλοι και εκβολές ποταμών, με ονόματα όταν μεγεθύνετε',
  sh_cliff: 'Γκρεμός', sh_beach: 'Παραλία', sh_wall: 'Λιμενοβραχίονας', ft_wreck: 'Ναυάγιο', ft_reef: 'Τεχνητός ύφαλος', ft_river: 'Εκβολή' });
window.PsMarks = (() => {
  const P = window.PSAREMA_MAP_PLACES, SH = window.PSAREMA_MAP_SHORE, A = window.PSAREMA_ATTRACTORS;
  const mx = lon => (lon + 180) / 360, my = lat => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2; // Web Mercator, 0–1
  const R = () => Math.min(2, window.devicePixelRatio || 1), on = k => state.layers[k] !== false;
  const isChart = () => window.PsChart?.style === 'chart';

  /* ---------- What can be placed: names and features, each [en, el, lat, lon, style, minZoom, rank, symbol, nameZoom] ---------- */
  const STY = { // font, fill, letter-spacing
    city: ['600 14px', '#fff'], town: ['600 12.5px', '#f1f1f1'], village: ['500 11.5px', '#e4e4e4'], locality: ['500 10.5px', '#c9c9c9'],
    cape: ['italic 500 11px', '#e8e2d6'], bay: ['italic 500 12px', '#b9d3e6', 1], beach: ['500 10.5px', '#ecdcae'], harbour: ['500 11px', '#e0e6ea'],
    islet: ['italic 500 11px', '#e4e4e4'], rock: ['italic 500 10.5px', '#d6dde2'], feature: ['500 10.5px', '#f0f0f0'],
  };
  const items = [];
  // Round 16 (the lead: beach names covered the heat at Protaras, zoom 13): beaches and localities from zoom 14, rocks from 13; a generic name
  // ("Swimming spot", "Marina") only from 15; a double name ("Vrissi Beach | Sunrise Beach") its first part. In placeAt: a name already placed
  // within 10 km is not placed again, and a name beside a symbol takes the side with the least sea under it (off the water, so off the heat).
  const LATER = { beach: 14, locality: 14, rock: 13 }, GENERIC = /^(swimming spot|marina|beach)$/i;
  for (const r of P?.rows || []) {
    const k = P.kinds[r[4]], en = r[0].split(' | ')[0], el = r[1].split(' | ')[0], z0 = Math.max(r[5], GENERIC.test(en) ? 15 : LATER[k] || 0);
    items.push([en, el, r[2], r[3], k, z0, r[6], ['cape', 'beach', 'harbour', 'rock', 'islet'].includes(k) ? 'dot' : '', z0]);
  }
  const FT = { wreck: [12, 13.5], artificialReef: [12, 13.5], river: [12.5, 14] }; // symbol from, name from (round 16: half a level to a level later, the coast's view was busy)
  for (const kind in FT) for (const p of A?.points?.[kind] || []) {
    if (typeof inNorth === 'function' && inNorth(p[0], p[1])) continue;
    if (kind === 'river' && !p[4]) continue; // unnamed streams: the river layer has hundreds
    const nm = String(p[4] || '').replace(/ ?\(.*?\)| artificial-reef/gi, '').trim();
    items.push([nm, nm, p[0], p[1], 'feature', FT[kind][0], 90, kind, FT[kind][1]]);
  }
  items.sort((a, b) => a[5] - b[5] || b[6] - a[6]);

  /* ---------- Placement, once per zoom level and language: greedy by priority, against every box placed before ---------- */
  const mctx = document.createElement('canvas').getContext('2d'), placed = new Map();
  // Round 10: the best spots' pins up to zoom 11 (map.js spacePins → avoid): names keep clear of them: above, below, left or right of
  // their place, or give way (pins win). Mercator 0–1 points with their screen boxes [left, top, right, bottom] around the point.
  let pinBoxes = [], pinSig = '';
  const font = k => `${STY[k][0]} Inter, system-ui, sans-serif`;
  function placeAt(z) {
    const avoid = pinBoxes.length && z < 11, key = z + state.lang + on('labels') + on('features') + (avoid ? pinSig : ''); let out = placed.get(key); if (out) return out;
    const s = 256 * 2 ** z, G = 128, grid = new Map(); out = [];
    const cells = (b, f) => { for (let gx = Math.floor(b[0] / G); gx <= Math.floor(b[2] / G); gx++) for (let gy = Math.floor(b[1] / G); gy <= Math.floor(b[3] / G); gy++) f(gx + ',' + gy); };
    const free = b => { let ok = true; cells(b, k => { for (const o of grid.get(k) || []) if (o[0] < b[2] && o[2] > b[0] && o[1] < b[3] && o[3] > b[1]) ok = false; }); return ok; };
    const take = b => cells(b, k => { let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(b); });
    if (avoid) for (const [px, py, b] of pinBoxes) take([px * s + b[0], py * s + b[1], px * s + b[2], py * s + b[3]]);
    const seen = new Map(), km10 = s * 10 / (360 * 91.2); // a name's places so far; 10 km in world px (a degree of longitude here is ~91 km)
    const seaAt = (x, y) => { const gx = Math.floor((x / s * 360 - 180 - WEST) / RES), gy = Math.floor((NORTH - Math.atan(Math.sinh(Math.PI * (1 - 2 * y / s))) * 180 / Math.PI) / RES); return gx >= 0 && gy >= 0 && gx < W && gy < H && depth[gy * W + gx] ? 1 : 0; };
    const sea = b => { let n = 0; for (const fx of [.15, .5, .85]) for (const fy of [.3, .7]) n += seaAt(b[0] + (b[2] - b[0]) * fx, b[1] + (b[3] - b[1]) * fy); return n; }; // of 6 points
    for (const it of items) {
      const [en, el, la, lo, k, z0, , sym, zn] = it; if (z < z0) continue;
      if (k === 'feature' ? !on('features') : !on('labels')) continue;
      const x = mx(lo) * s, y = my(la) * s, t = z >= zn ? (state.lang === 'el' ? el : en) : '';
      const sb = sym ? [x - 6, y - 6, x + 6, y + 6] : null; // the symbol's own box
      if (sb && !free(sb)) continue;
      if (!t) { if (sym && k === 'feature') { take(sb); out.push({ x, y, k, sym }); } continue; }
      if (seen.get(t)?.some(([px, py]) => Math.abs(px - x) < km10 && Math.abs(py - y) < km10)) continue; // the same name close by: once
      mctx.font = font(k); const w = mctx.measureText(t).width + (STY[k][2] || 0) * t.length, h = parseFloat(STY[k][0].match(/([\d.]+)px/)[1]) + 2;
      // text: centred on a town; beside a symbol, right, then left, above, below
      const spots = sym ? [[x + 8, y - h / 2, 'left'], [x - 8 - w, y - h / 2, 'left'], [x - w / 2, y - 8 - h, 'left'], [x - w / 2, y + 8, 'left']] : avoid ? [[x - w / 2, y - h / 2], [x - w / 2, y - h - 9], [x - w / 2, y + 9], [x - w / 2, y + 24], [x - w - 8, y - h / 2], [x + 8, y - h / 2], [x - w - 38, y - h / 2], [x + 38, y - h / 2]] : [[x - w / 2, y - h / 2, 'left']];
      let boxes = spots.map(([bx, by]) => [bx - 2, by - 1, bx + w + 2, by + h + 1]);
      if (sym) boxes = boxes.map((b, i) => [sea(b), i, b]).sort((p, q) => p[0] - q[0] || p[1] - q[1]).map(p => p[2]); // beside a symbol: the drier side first
      for (const b of boxes) {
        if (!free(b)) continue;
        take(b); if (sb) take(sb); out.push({ x, y, k, sym, t, tx: b[0] + 2, ty: b[1] + 1 + h / 2, b }); (seen.get(t) || seen.set(t, []).get(t)).push([x, y]); break;
      }
    }
    placed.set(key, out); return out;
  }

  /* ---------- Symbols ---------- */
  function symbol(g, sym, x, y) {
    g.lineCap = g.lineJoin = 'round';
    if (sym === 'dot') { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fillStyle = '#f2f2f2'; g.strokeStyle = 'rgba(8,10,12,.85)'; g.lineWidth = 1.5; g.stroke(); g.fill(); return; }
    const path = () => { g.beginPath();
      if (sym === 'wreck') { g.moveTo(x - 6, y); g.lineTo(x + 6, y); for (const d of [-3, 0, 3]) { g.moveTo(x + d, y - 3.5); g.lineTo(x + d, y + 3.5); } } // the chart's wreck: a hull and its masts
      else if (sym === 'artificialReef') { g.rect(x - 4.5, y - 4.5, 9, 9); g.moveTo(x - 4.5, y); g.lineTo(x + 4.5, y); g.moveTo(x, y - 4.5); g.lineTo(x, y + 4.5); }
      else { g.moveTo(x - 5, y - 2); g.quadraticCurveTo(x - 2.5, y - 5, x, y - 2); g.quadraticCurveTo(x + 2.5, y + 1, x + 5, y - 2); g.moveTo(x - 5, y + 2.5); g.quadraticCurveTo(x - 2.5, y - .5, x, y + 2.5); g.quadraticCurveTo(x + 2.5, y + 5.5, x + 5, y + 2.5); } };
    path(); g.strokeStyle = 'rgba(8,10,12,.85)'; g.lineWidth = 4; g.stroke();
    path(); g.strokeStyle = sym === 'river' ? '#8fd0ff' : '#fff'; g.lineWidth = 1.5; g.stroke();
  }

  /* ---------- One tile layer over the heat (pane labels, under the pins): shore types, soundings, then symbols and names ---------- */
  // One layer, not two: each is one more screen-sized layer composited at every pan frame (zoom 12 pans were slower with two).
  const SHC = ['#d08b5b', '#ead592', '#e3e7ea'], shoreLines = (SH?.lines || []).map(l => { // to Mercator 0–1 points, with a box
    const p = [], n = (l.length - 1) / 2; let la = l[1], lo = l[2], x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (let k = 0; k < n; k++) { if (k) { la += l[1 + 2 * k]; lo += l[2 + 2 * k]; } const x = mx(lo / 1e5), y = my(la / 1e5); p.push(x, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { k: l[0], p, bb: [x0, y0, x1, y1] };
  });
  const SOUND_Z = 12.5, SHORE_Z = 12; // round 16: soundings from 12.5 (were 11.5: numbers over the heat at the coast's view)
  const Marks = PsChart.HalfGrid.extend({
    options: { pane: 'labels', updateWhenZooming: false, keepBuffer: 1, noWrap: true, bounds: L.latLngBounds(VIEW), attribution: 'Names, shore &copy; OpenStreetMap contributors (ODbL)' },
    createTile(c) {
      const z = c.z ?? this._tileZoom, s = 256 * 2 ** z, ox = c.x * 256, oy = c.y * 256, chart = isChart();
      const labs = placeAt(z).filter(l => (l.b ? l.b[2] : l.x + 7) > ox - 4 && (l.b ? l.b[0] : l.x - 7) < ox + 260 && (l.b ? l.b[3] : l.y + 7) > oy - 4 && (l.b ? l.b[1] : l.y - 7) < oy + 260);
      const doS = on('soundings') && z >= SOUND_Z, doL = on('shore') && z >= SHORE_Z;
      const lines = doL ? shoreLines.filter(o => o.bb[2] * s > ox - 4 && o.bb[0] * s < ox + 260 && o.bb[3] * s > oy - 4 && o.bb[1] * s < oy + 260) : [];
      // soundings: one per block of cells ~90 px wide, anchored to the grid, so every tile picks the same; at the block's middle cell, if it is sea
      const snd = [];
      if (doS) {
        const cell = RES / 360 * s, B = Math.max(1, Math.round(90 / cell)), lon0 = (ox - 30) / s * 360 - 180, lon1 = (ox + 286) / s * 360 - 180;
        const lat = y => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / s))) * 180 / Math.PI, la0 = lat(oy + 286), la1 = lat(oy - 30);
        const gx0 = Math.floor((lon0 - WEST) / RES / B), gx1 = Math.floor((lon1 - WEST) / RES / B), gy0 = Math.floor((NORTH - la1) / RES / B), gy1 = Math.floor((NORTH - la0) / RES / B);
        for (let by = Math.max(0, gy0); by <= gy1; by++) for (let bx = Math.max(0, gx0); bx <= gx1; bx++) {
          const cx = bx * B + (B >> 1) + (by & 1 ? B >> 2 : 0), cy = by * B + (B >> 1); if (cx >= W || cy >= H) continue; // odd rows nudged: a lattice, not a grid
          const i = cy * W + cx, d = depth[i]; if (!d || d < 2 || northMask[i]) continue;
          const x = mx(lonOf(i)) * s, y = my(latOf(i)) * s; if (labs.some(l => l.b ? x > l.b[0] - 10 && x < l.b[2] + 10 && y > l.b[1] - 7 && y < l.b[3] + 7 : Math.abs(x - l.x) < 14 && Math.abs(y - l.y) < 10)) continue; // clear of names and symbols
          snd.push([x, y, d >= 100 ? String(Math.round(d / 10) * 10) : String(Math.round(d))]);
        }
      }
      if (!lines.length && !snd.length && !labs.length) return L.DomUtil.create('div');
      const cv = L.DomUtil.create('canvas'), r = R(), g = cv.getContext('2d'); cv.width = cv.height = 256 * r;
      g.setTransform(r, 0, 0, r, 0, 0); g.lineCap = g.lineJoin = 'round';
      for (const pass of [0, 1]) for (const o of lines) { // a dark casing, then the colour
        g.beginPath(); for (let k = 0; k < o.p.length; k += 2) g[k ? 'lineTo' : 'moveTo'](o.p[k] * s - ox, o.p[k + 1] * s - oy);
        const w = (o.k === 2 ? 2.2 : 1.8) * (z >= 14 ? 1.3 : 1);
        g.strokeStyle = pass ? SHC[o.k] : 'rgba(6,8,10,.6)'; g.lineWidth = pass ? w : w + 2; g.stroke();
      }
      g.font = `italic 500 ${z >= 13 ? 10.5 : 9.5}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      for (const [x, y, t] of snd) {
        g.strokeStyle = chart ? 'rgba(14,22,30,.5)' : 'rgba(4,8,14,.6)'; g.lineWidth = 2.5; g.strokeText(t, x - ox, y - oy);
        g.fillStyle = chart ? 'rgba(222,232,240,.82)' : 'rgba(255,255,255,.62)'; g.fillText(t, x - ox, y - oy);
      }
      g.textAlign = 'left'; g.setTransform(r, 0, 0, r, -ox * r, -oy * r);
      for (const l of labs) if (l.sym) symbol(g, l.sym, l.x, l.y);
      g.textBaseline = 'middle'; g.lineJoin = 'round';
      for (const l of labs) if (l.t) {
        g.font = font(l.k); if (STY[l.k][2]) g.letterSpacing = STY[l.k][2] + 'px'; else g.letterSpacing = '0px';
        g.strokeStyle = 'rgba(8,10,13,.82)'; g.lineWidth = 3; g.strokeText(l.t, l.tx, l.ty);
        g.fillStyle = STY[l.k][1]; g.fillText(l.t, l.tx, l.ty);
      }
      return cv;
    },
  });
  const names = new Marks();

  /* ---------- Switches ---------- */
  state.layers.soundings ??= true; state.layers.shore ??= true; state.layers.features ??= true;
  function apply() {
    if (['labels', 'features', 'soundings', 'shore'].some(on)) names.addTo(map); else map.removeLayer(names);
    drawKey();
  }
  const redraw = () => { placed.clear(); if (map.hasLayer(names)) names.redraw(); };
  LAYER_OBJ.labels = () => { apply(); return null; }; // ui.js's Place names switch (state.layers.labels) now drives ours
  const over = $('#layers-pop .lp-over');
  if (over) {
    const row = (k, icon, label, tip, num = '') => `<label data-i18n-title="${tip}" title="${esc(tr(tip))}"><input type="checkbox" id="lay-${k}"${on(k) ? ' checked' : ''}>${ic(icon)}<span data-i18n="${label}">${esc(tr(label))}</span>${num}</label>`;
    over.insertAdjacentHTML('beforeend', row('soundings', 'depth', 'l_soundings', 'soundingsTip', ' <span class="num">m</span>') + row('shore', 'shore', 'l_shore', 'shoreTip') +
      row('features', 'pin', 'l_features', 'featuresTip'));
    const lab = $('#lay-labels')?.closest('label'); if (lab) { lab.insertAdjacentHTML('afterbegin', ic('flag')); over.append(lab); }
    for (const k of ['soundings', 'shore', 'features']) $('#lay-' + k).addEventListener('change', e => { state.layers[k] = e.target.checked; savePrefs(); placed.clear(); apply(); redraw(); });
    $('#lay-labels')?.addEventListener('change', () => { placed.clear(); redraw(); });
  }
  /* the shore key, under the fishing legend, while the shore shows */
  const hl = $('.hl'); hl?.insertAdjacentHTML('beforeend', '<div class="ml-key" id="ml-key" hidden></div>');
  function drawKey() {
    const el = $('#ml-key'); if (!el) return;
    const show = on('shore') && map.getZoom() >= SHORE_Z && !isPhone(); el.hidden = !show; if (!show) return; // round 16: phones show no heat guide, so no key in it (css/map-fx.css)
    const html = ['sh_cliff', 'sh_beach', 'sh_wall'].map((k, n) => `<span><i style="background:${SHC[n]}"></i>${esc(tr(k))}</span>`).join('');
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  map.on('zoomend', drawKey); PHONE.addEventListener('change', drawKey);
  document.addEventListener('ps:style', redraw); // soundings read lighter over the satellite
  new MutationObserver(() => { placed.clear(); if (map.hasLayer(names)) names.redraw(); drawKey(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  apply();
  function avoid(list) { // [[lat, lon, [l, t, r, b]]]: redrawn only when the pins move
    const sig = list.map(p => p[0].toFixed(3) + p[1].toFixed(3) + p[2]).join(); if (sig === pinSig) return;
    pinSig = sig; pinBoxes = list.map(([la, lo, b]) => [mx(lo), my(la), b]); redraw();
  }
  return { names, placeAt, redraw, avoid, items: items.length };
})();
