'use strict';
/* Psarema hot spots (round 17 K, PINPOINT). The owner: the map "just highlights the whole section of the sea and changes its colour"; it
   should say WHERE the fish are. So by default the chance is drawn as places: the ordinary water faint (css/map-fx.css .ps-hot), and over
   it a few distinct patches where the chance peaks, outlined, in their own score's colour on the fixed scale (map.js mapRgba, LEVEL).
   The best few carry a small marker (in place of map.js's numbered pins); a tap on one says why, from agent Q's structure at the peak (js/structure.js:
   "Drop-off 20→45 m · rock edge · best 06:00–08:00"; nothing special there: its depth and seabed), and View more opens the
   spot's card. Layers > "Fishing chance (all water)" brings back the full colour over all the water, as before.
   Nothing here makes or changes a score. The patches are cut from the field the map has just painted (map.js isoF): zoomed out the 250 m
   cells (lightly blurred, as drawn), zoomed in the ~50 m picture over the view (js/fine.js), so a patch follows the drop-off or reef edge the
   fine layer draws. Every number shown is the 250 m cell's own score, as the tapped card's.
   How a patch is found, on a grid of samples ~GPX screen px apart over the view (each the best painted value under it):
     good       at least MIN_PCT % of the fish's level (map.js levelOf: the fixed scale, the same every day), so a rough day shows few or none;
     standout   at least PROM_PCT % of the level above the mean of the water within BG_PX px (and BG_M metres) around;
     a peak     a sample no lower than its 8 neighbours, at least SEP px from a better peak;
     its patch  the samples around it, joined to it, no lower than half-way from the water around up to the peak, and within R_PX px
                (R_M metres at least): about 15 km across the island's view, a few hundred metres zoomed in. Its outline is that level's own
                contour line (map.js isolines), so its shape is the chance's.
   The best KMAX in view are drawn; zoomed out (a handful of named areas) KLO. Run when the map is idle after a paint or a move (never in a
   frame), in slices of 8 ms at most; PsHot.stats: passes, their total ms, the longest slice (perf runs). map.js calls PsHot.soon() after paint(). */
window.PsHot = (() => {
  const GPX = 5, BG_PX = 60, BG_M = 600, MIN_PCT = 45, PROM_PCT = 6, R_PX = 30, R_M = 200, SEP = 22, KMAX = 8, KLO = 5, MARK = 3, LOZ = 10;
  const stats = { n: 0, ms: 0, max: 0, last: null };
  map.createPane('hot').style.cssText = 'z-index:413;pointer-events:none'; // over the chance (410) and ship tracks (412), under the hot-zone lines (415) and the closed zones' hatch (425)
  map.createPane('hotmarks').style.zIndex = 644; // over the place names (640) and live readings (643), under the catch pins (645)
  const ren = L.canvas({ pane: 'hot', padding: .25 }), shapes = L.layerGroup([], { pane: 'hot' }), marks = L.layerGroup([], { pane: 'hotmarks' });
  const pop = L.popup({ className: 'hs-pop', closeButton: false, maxWidth: 260, minWidth: 180, offset: [0, -10], autoPanPadding: [16, 90] });
  let spots = [], q = 0;

  const on = () => !!(F && scored && map.hasLayer(heat) && !state.layers?.allwater && !document.hidden);
  function mode() { // the default look (hot spots over a faint wash) or the full colour; Layers' switch and the heat's own
    const hot = owns();
    map.getContainer().classList.toggle('ps-hot', hot);
    if (hot) { shapes.addTo(map); marks.addTo(map); soon(); } else { avoid = []; map.removeLayer(shapes); map.removeLayer(marks); map.closePopup(pop); }
    if (typeof spacePins === 'function') spacePins(); // the numbered pins off (on), and the names' room
  }
  // The work runs in slices of at most SLICE ms when the thread is idle (a budget phone took 5–90 ms for a whole pass): a new paint or move
  // starts it again from the top, a slice that runs out of time goes on at the next idle moment.
  const SLICE = 8, idle = f => typeof requestIdleCallback === 'function' ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 50);
  let job = null, jobMs = 0, until = 0;
  function soon() { job = null; if (!q) q = idle(run); } // after this frame, when the main thread is idle
  function run(dl) {
    q = 0;
    if (!on()) { job = null; spots = []; shapes.clearLayers(); marks.clearLayers(); return; }
    if (map._animatingZoom) { soon(); return; } // mid-pinch: when it lands
    const t0 = performance.now(); until = t0 + Math.min(SLICE, Math.max(3, dl?.timeRemaining?.() ?? SLICE));
    if (!job) { job = pass(); jobMs = 0; }
    const r = job.next(), ms = performance.now() - t0; jobMs += ms; stats.max = Math.max(stats.max, ms);
    if (!r.done) { q = idle(run); return; }
    job = null; stats.n++; stats.ms += jobMs; stats.last = { ms: +jobMs.toFixed(2), spots: spots.length, z: map.getZoom() };
  }
  const late = () => performance.now() > until;
  function* pass() { const s = yield* find(); if (late()) yield; spots = s; draw(); }

  /* ---------- finding the patches ---------- */
  let V = new Float32Array(0), BG = V, T1 = V, T2 = V, OWN = new Int16Array(0);
  const mPerPx = () => { const c = map.getCenter(); return 40075016.686 * Math.cos(c.lat * Math.PI / 180) / 2 ** (map.getZoom() + 8); };
  function boxMean(v, gw, gh, r) { // BG: the mean of v over the samples > 0 within r (a square), else 0; two passes of running sums
    const s1 = T1, n1 = T2;
    for (let y = 0; y < gh; y++) {
      let s = 0, n = 0; const o = y * gw;
      for (let x = -r; x < gw; x++) {
        const a = x + r; if (a < gw && v[o + a] > 0) { s += v[o + a]; n++; }
        const b = x - r - 1; if (b >= 0 && v[o + b] > 0) { s -= v[o + b]; n--; }
        if (x >= 0) { s1[o + x] = s; n1[o + x] = n; }
      }
    }
    for (let x = 0; x < gw; x++) {
      let s = 0, n = 0;
      for (let y = -r; y < gh; y++) {
        const a = y + r; if (a < gh) { s += s1[a * gw + x]; n += n1[a * gw + x]; }
        const b = y - r - 1; if (b >= 0) { s -= s1[b * gw + x]; n -= n1[b * gw + x]; }
        if (y >= 0) BG[y * gw + x] = n > .5 ? s / n : 0;
      }
    }
  }
  function clear(sz) { // the map's rows not under the phone's top bar or sheet (container px)
    if (!isPhone()) return [8, sz.y - 8];
    const m = map.getContainer().getBoundingClientRect(), top = $('#mobile-bar')?.getBoundingClientRect(), sh = $('#m-sheet')?.getBoundingClientRect();
    return [Math.max(8, (top?.bottom ?? 0) - m.top + 14), Math.min(sz.y - 8, (sh?.top ?? 1e9) - m.top - 14)];
  }
  function* find() {
    const f = isoF; if (!f) return [];
    const a = map.latLngToContainerPoint([NORTH, WEST]), b = map.latLngToContainerPoint([NORTH - H * RES, WEST + W * RES]), bw = b.x - a.x, bh = b.y - a.y, sz = map.getSize();
    const Ax = f.kx * bw, Bx = a.x + (f.ox + f.kx / 2) * bw, Ay = f.ky * bh, By = a.y + (f.oy + f.ky / 2) * bh; // sample (i, j) → container px (as map.js drawIso)
    const p = Math.max(1, Math.round(GPX / Ax)), gp = p * Ax, mpp = mPerPx(), rb = Math.max(BG_PX, BG_M / mpp), M = rb; // gp: a grid step, px
    const cl = (v, n) => Math.min(n, Math.max(0, v));
    const i0 = cl(Math.floor((-M - Bx) / Ax), f.w), i1 = cl(Math.ceil((sz.x + M - Bx) / Ax), f.w), j0 = cl(Math.floor((-M - By) / Ay), f.h), j1 = cl(Math.ceil((sz.y + M - By) / Ay), f.h);
    const gw = Math.ceil((i1 - i0) / p), gh = Math.ceil((j1 - j0) / p), n = gw * gh; if (n <= 0) return [];
    if (V.length < n) { V = new Float32Array(n); BG = new Float32Array(n); T1 = new Float32Array(n); T2 = new Float32Array(n); OWN = new Int16Array(n); }
    const v = V, ff = f.f; v.fill(0, 0, n);
    if (ff === f8) for (let k = 0; k < shownN; k++) { // zoomed out the field is the whole grid (image rows): only the cells that score (map.js shownIdx; IROW: a grid row's image row)
      const c = shownIdx[k], i = c % W, j = IROW[c / W | 0];
      if (i >= i0 && i < i1 && j >= j0 && j < j1) { const s = ff[j * W + i]; if (s > 0) { const g = ((j - j0) / p | 0) * gw + ((i - i0) / p | 0); if (s > v[g]) v[g] = s; } }
      if (!(k & 8191) && late()) yield;
    }
    else for (let j = j0; j < j1; j++) {
      const o = ((j - j0) / p | 0) * gw, r = j * f.w; for (let i = i0; i < i1; i++) { const s = ff[r + i]; if (s > 0) { const g = o + ((i - i0) / p | 0); if (s > v[g]) v[g] = s; } }
      if (!(j & 15) && late()) yield;
    }
    if (late()) yield;
    boxMean(v, gw, gh, Math.max(2, Math.round(rb / gp)));
    if (late()) yield;
    const [t, bt] = clear(sz), R = Math.max(R_PX, R_M / mpp) / gp, vx0 = (8 - Bx) / Ax / p - i0 / p, vx1 = (sz.x - 8 - Bx) / Ax / p - i0 / p, vy0 = (t - By) / Ay / p - j0 / p, vy1 = (bt - By) / Ay / p - j0 / p; // the open view, in grid steps
    const out = grow(v, gw, gh, BG, OWN, Math.max(1, LEVEL * MIN_PCT / 100), Math.max(2, LEVEL * PROM_PCT / 100), R * R, (SEP / gp) ** 2,
      map.getZoom() < LOZ ? KLO : KMAX, (x, y) => x >= vx0 && x <= vx1 && y >= vy0 && y <= vy1);
    const geo = (gx, gy) => map.containerPointToLatLng([Bx + (i0 + gx * p + (p - 1) / 2) * Ax, By + (j0 + gy * p + (p - 1) / 2) * Ay]);
    const cellPx = RES * 256 * 2 ** map.getZoom() / 360, hw = Math.max(1, Math.ceil(gp / cellPx / 2)), res = [];
    for (const o of out) {
      if (!o.seen) continue;
      if (late()) yield;
      const ll = geo(o.x, o.y), c = idxAt(ll.lat, ll.lng); let i = -1;
      if (c >= 0) { const cx = c % W, cy = c / W | 0; for (let dy = -hw; dy <= hw; dy++) for (let dx = -hw; dx <= hw; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const j = y * W + x; if (scores[j] && (i < 0 || scores[j] > scores[i])) i = j; } } // the best 250 m cell under the peak: its score, its card
      const rs = i >= 0 && rings(o, v, gw, gh, Ax * p, Bx + (i0 + (p - 1) / 2) * Ax, Ay * p, By + (j0 + (p - 1) / 2) * Ay);
      if (rs?.length) res.push({ ...o, ll, i, rings: rs });
    }
    return res;
  }
  // The peaks and their patches on a gw × gh grid of values v (0: no water), bg the water's mean around each sample, own a work array:
  // [{ id, k, x, y, s, lev, cnt, box, seen }], the best first, until kmax of them are seen (in the view: seen(x, y))
  function grow(v, gw, gh, bg, own, thr, prom, R2, sep2, kmax, seen) {
    const peaks = [], out = [], stack = []; let nSeen = 0;
    for (let y = 1; y < gh - 1; y++) for (let x = 1, k = y * gw + 1; x < gw - 1; x++, k++) {
      const s = v[k]; if (s < thr || s - bg[k] < prom) continue;
      if (s < v[k - 1] || s < v[k + 1] || s < v[k - gw] || s < v[k + gw] || s < v[k - gw - 1] || s < v[k - gw + 1] || s < v[k + gw - 1] || s < v[k + gw + 1]) continue;
      peaks.push(k);
    }
    peaks.sort((u, w) => v[w] - v[u] || u - w);
    own.fill(-1, 0, gw * gh);
    for (const k of peaks) {
      if (own[k] >= 0) continue;
      const px = k % gw, py = k / gw | 0;
      if (out.some(o => (o.x - px) ** 2 + (o.y - py) ** 2 < sep2)) continue;
      const s = v[k], lev = Math.max(thr, s - Math.max(prom, (s - bg[k]) / 2)), id = out.length;
      let cnt = 0, x0 = px, x1 = px, y0 = py, y1 = py; own[k] = id; stack.push(k);
      while (stack.length) { // the samples joined to the peak at its level or above, within R
        const c = stack.pop(), cx = c % gw, cy = c / gw | 0; cnt++;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        for (let d = 0; d < 4; d++) {
          const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || (nx - px) ** 2 + (ny - py) ** 2 > R2) continue;
          const e = ny * gw + nx; if (own[e] !== -1 || v[e] < lev) continue;
          own[e] = id; stack.push(e);
        }
      }
      const o = { id, k, x: px, y: py, s, lev, cnt, box: [x0, y0, x1, y1], seen: seen(px, py) }; // seen: its peak on screen (the margin's patches only keep the view's from growing into them)
      out.push(o); if (o.seen && ++nSeen >= kmax) break;
    }
    return out;
  }
  console.assert((() => { // two hills on flat water: two patches, the higher first, each only its own hill; a shoulder is not a peak of its own
    const gw = 16, gh = 12, v = new Float32Array(gw * gh).fill(10), bg = new Float32Array(gw * gh).fill(12), own = new Int16Array(gw * gh);
    const hill = (cx, cy, top) => { for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const d = Math.hypot(x - cx, y - cy); if (d < 3) v[y * gw + x] = Math.max(v[y * gw + x], top - d * 6); } };
    hill(4, 5, 40); hill(11, 6, 30); v[6 * gw + 6] = 29; // a shoulder of the first hill
    const o = grow(v, gw, gh, bg, own, 15, 4, 25, 4, 5, () => true);
    return o.length === 2 && o[0].x === 4 && o[0].s === 40 && o[1].x === 11 && own[6 * gw + 6] === 0 && own[6 * gw + 11] === 1 && own[0] === -1 && o[0].cnt > 1 && o[0].cnt < 30;
  })(), 'hot spots: peaks and patches');
  function rings(o, v, gw, gh, ax, bx, ay, by) { // the patch's outline: its level's contour around its own samples, as [lat, lng] rings
    const [x0, y0, x1, y1] = o.box, X0 = x0 - 2, Y0 = y0 - 2, w = x1 - x0 + 5, h = y1 - y0 + 5, f = new Float32Array(w * h), own = OWN, lev = o.lev;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gx = X0 + x, gy = Y0 + y, k = gy * gw + gx, inG = gx >= 0 && gy >= 0 && gx < gw && gy < gh;
      f[y * w + x] = !inG ? 1e-3 : own[k] === o.id ? v[k] : Math.max(1e-3, Math.min(v[k], lev - .5)); // its own samples as they are, the rest under its level
    }
    const L = isolines(f, w, 0, w - 1, 0, h - 1, 1, [lev], ax, bx + X0 * ax, ay, by + Y0 * ay)[0]; // map.js: the chance lines' marching squares
    const out = [];
    for (const r of L) {
      if (!r.ring) continue;
      let pt = linePts(r); if (pt.length < 6) continue;
      for (let n = 0; n < 2; n++) { const s = []; for (let m = 0; m < pt.length; m += 2) { const k = (m + 2) % pt.length; s.push(.75 * pt[m] + .25 * pt[k], .75 * pt[m + 1] + .25 * pt[k + 1], .25 * pt[m] + .75 * pt[k], .25 * pt[m + 1] + .75 * pt[k + 1]); } pt = s; } // Chaikin, twice: round, not stepped
      const ll = []; for (let m = 0; m < pt.length; m += 2) ll.push(map.containerPointToLatLng([pt[m], pt[m + 1]]));
      out.push(ll);
    }
    return out;
  }

  /* ---------- drawing ---------- */
  const rgb = s => { const c = mapRgba(s); return `rgb(${c[0]},${c[1]},${c[2]})`; }; // the score's colour on the map's fixed scale
  function draw() {
    shapes.clearLayers(); marks.clearLayers();
    const lo = map.getZoom() < LOZ, nm = lo ? KLO : MARK, sz = map.getSize();
    for (const o of spots.slice().reverse()) { // the best drawn last, on top
      const c = rgb(o.s), t = tint(o.s);
      L.polygon(o.rings, { renderer: ren, interactive: false, stroke: true, color: c, weight: lo ? 24 : 10, opacity: lo ? .45 : .3, fill: false }).addTo(shapes); // a soft glow around (zoomed out: the area's mark)
      L.polygon(o.rings, { renderer: ren, interactive: false, stroke: true, color: '#000', weight: 3.4, opacity: .5, fill: false }).addTo(shapes); // a dark casing: it reads on bright shallows
      L.polygon(o.rings, { renderer: ren, interactive: false, stroke: true, color: t, weight: 1.6, opacity: .95, fill: true, fillColor: c, fillOpacity: .8 }).addTo(shapes);
    }
    avoid = []; const taken = [];
    for (const o of spots) { // the best few, each with its tag clear of a better one's
      if (avoid.length >= nm) break;
      const s = scores[o.i], name = lo ? placeOf([o.ll.lat, o.ll.lng]) : '', p = map.latLngToContainerPoint(o.ll);
      const w = 26 + (name ? Math.min(110, name.length * 6.5) + 5 : 0), box = [[-8, -12, 9 + w, 12], [-9 - w, -12, 8, 12]].map(c => [c, [p.x + c[0], p.y + c[1], p.x + c[2], p.y + c[3]]]); // the dot and its tag to the right, else to the left (css .hs-tag)
      const k = box.findIndex(([, r]) => r[0] >= 2 && r[2] <= sz.x - 2 && !taken.some(q => q[0] < r[2] + 4 && r[0] < q[2] + 4 && q[1] < r[3] + 4 && r[1] < q[3] + 4)); if (k < 0) continue;
      taken.push(box[k][1]); avoid.push([o.ll.lat, o.ll.lng, box[k][0]]);
      const html = `<i class="hs-dot" style="--c:${rgb(s)}"></i><span class="hs-tag"><b>${s}</b>${name ? `<span>${esc(name)}</span>` : ''}</span>`;
      L.marker(o.ll, { pane: 'hotmarks', keyboard: false, riseOnHover: true, zIndexOffset: 100 - taken.length, title: `${tr('hs_title')} · ${s}`,
        icon: L.divIcon({ className: 'hs-pin' + (taken.length > 1 ? '' : ' hs-1') + (k ? ' hs-l' : ''), html, iconSize: [0, 0] }) }).on('click', () => open(o)).addTo(marks);
    }
    window.PsMarks?.avoid(avoidList()); // the place names keep clear of them (as of the pins: map.js spacePins)
  }
  let avoid = [];
  const avoidList = () => map.getZoom() < 11 ? avoid : [];
  const owns = () => !!(map.hasLayer(heat) && !state.layers?.allwater); // the hot spots' markers stand in for map.js's numbered pins

  /* ---------- the tap: why here ---------- */
  function open(o) {
    const i = o.i, s = scores[i], who = sp.all ? likelyAt(i, state.mode, 1)[0] : sp, at = hm(hours[state.h].t);
    // again once agent Q's structure tile is in, but only once: with the 50 m layer loading tiles too, the structure cache (KEEP 6) could evict
    // this tile before the second ask, and each re-open restarted the card's pop-in animation, so it stayed invisible (lead, after the zoom merge)
    const w = why(o, () => { if (pop.isOpen() && pop.hsOf === o && !o.asked) { o.asked = true; open(o); } });
    pop.hsOf = o;
    pop.setLatLng(o.ll).setContent(`<div class="hs-h">${ring(s, 'sm')}<span><b>${esc(rating(s))}</b> · ${who ? esc(fishName(who)) + ' · ' : ''}${at}</span></div>` +
      `<p class="hs-why">${esc(w)}</p><button class="btn" type="button" data-hs-more="${i}">${esc(tr('viewMore'))}</button>`).openOn(map);
  }
  document.addEventListener('click', e => { const b = e.target.closest?.('[data-hs-more]'); if (b) { map.closePopup(pop); openCell(+b.dataset.hsMore); } });
  function why(o, then) { // what is there (js/structure.js at the peak: wreck, drop-off, point, rock edge …; else its depth and seabed), and when it is best
    const i = o.i, q = window.PsStructure?.reason(o.ll.lat, o.ll.lng, then), parts = q?.length ? q.map(r => r.text) : [tr('hs_depth', depthM(i))];
    const c = !q?.length && HAB?.classes[habK[i] / 121 | 0]; if (c && c !== 'unknown') parts.push(tr('hab')[c]);
    const w = bestWindow(i); if (w) parts.push(tr('hs_best', w));
    const t = parts.join(' · '); return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function bestWindow(i) { // this spot's best hours on the day shown (today: from now): the best and its neighbours within 10 % of it
    const d = tlDays().find(([a, b]) => state.h >= a && state.h < b); if (!d) return '';
    const a = d[0] < state.first && state.first < d[1] ? state.first : d[0], b = d[1]; if (a >= b) return '';
    const acc = new Float64Array(F.T); ONE[0] = i; scoreCells(cur, a, b, ONE, 0, 1, 1, acc); // as ui.js bestHourAt
    let k = a; for (let h = a; h < b; h++) if (acc[h] > acc[k]) k = h;
    if (!(acc[k] > 0)) return '';
    let h0 = k, h1 = k; while (h0 > a && acc[h0 - 1] >= acc[k] * .9) h0--; while (h1 < b - 1 && acc[h1 + 1] >= acc[k] * .9) h1++;
    return `${hm(hours[h0].t)}–${hm(hours[h1].t + 36e5)}`;
  }

  /* ---------- the switch: Layers > Fishing chance (all water) ---------- */
  {
    const lab = document.createElement('label'); lab.dataset.i18nTitle = 'hs_allTip'; lab.title = tr('hs_allTip');
    lab.innerHTML = `<input type="checkbox" id="lay-allwater"> <span data-i18n="l_allwater">${esc(tr('l_allwater'))}</span>`;
    $('#lay-heat')?.closest('label')?.after(lab);
    const box = lab.firstChild; box.checked = !!state.layers?.allwater;
    box.addEventListener('change', () => { state.layers.allwater = box.checked; savePrefs(); mode(); });
  }
  heat.on('add remove', () => requestAnimationFrame(mode));
  map.on('moveend', soon);
  map.on('zoomstart', () => map.closePopup(pop));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) soon(); });
  new MutationObserver(() => { if (spots.length) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); // the areas' names
  addEventListener('DOMContentLoaded', mode);
  return { soon, stats, spots: () => spots, mode, owns, avoidList };
})();
