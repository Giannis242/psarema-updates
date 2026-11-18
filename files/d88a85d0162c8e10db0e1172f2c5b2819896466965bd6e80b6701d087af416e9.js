'use strict';
/* Psarema: how sure a place's score is (round 13 phase 3). No score changes: this only says what the score at a cell rests on.
   Three things about the PLACE, each from data the app holds (the forecast's part is js/feeds.js scoreInfo's lo / hi and lead):
     records  km to the nearest open record of any fish (data/sightings.js). The bench tests the model on those records only, so water far
              from all of them is water where the model was never checked.
     seabed   'survey' where the Cyprus survey map CY005001 covers the cell (data/surveyed.js, 9 kB, loaded a few seconds after the map),
              'model' where it is EUSeaMap's predictive map, 'none' where the seabed is unknown
     depth    rough where the chart cannot be trusted to a few metres: under 10 m (the EMODnet DTM is mostly interpolated inshore) or where
              the cell's one sounding and its mean depth differ by a third (a steep cell)
   PsSure.place(i) -> { km, bed, rough, v (0..1) }     scoreInfo takes v as its `place` part
   PsSure.line(i, info) -> the card's one line (the first weak point, or '')   PsSure.html(i, info) -> the details' "How sure" section
   A switch under Fishing chance in Layers ("Low confidence", off) hatches the water where v < .5; built when first switched on (round 15: thin
   lines at the screen's resolution in the heat's box, below).
   Not a probability: no test set here can calibrate it (eval/LOG.md rounds 10 and 13). */
window.PsSure = (() => {
  const FAR = 5; // km: past this a record says nothing about a cell
  let cov = null, surveyed = null, loading = null;
  // per cell, 1 at a record, 0 from FAR km on (core.js stamp). Round 14: built in idle slices once the first heat is painted (warm), not in
  // the first card's tap (~160 ms there at 4x CPU); a card before then finishes it at once. The same cones in the same order: the same values.
  let warmK = 0, warmC = null;
  const recs = () => Object.values(SIGHT).flat();
  function coverage() {
    if (cov) return cov;
    const R = recs(), c = warmC || new Float32Array(N);
    for (let k = warmC ? warmK : 0; k < R.length; k++) if (!inNorth(R[k][0], R[k][1])) stamp(c, R[k][0], R[k][1], FAR, 1);
    return cov = c;
  }
  function warm() {
    const idle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(() => f({ timeRemaining: () => 8 }), 50);
    const R = recs(); warmC = new Float32Array(N);
    const step = dl => { if (cov) return; while (warmK < R.length && dl.timeRemaining() > 3) { const r = R[warmK++]; if (!inNorth(r[0], r[1])) stamp(warmC, r[0], r[1], FAR, 1); }
      if (warmK < R.length) idle(step); else cov = warmC; };
    idle(step);
  }
  const load = () => loading ||= loadScripts('data/surveyed.js').then(() => {
    const runs = new Uint32Array(b64(window.PSAREMA_SURVEYED || '').buffer); surveyed = new Uint8Array(N);
    for (let k = 0; k < runs.length; k += 2) surveyed.fill(1, runs[k], runs[k] + runs[k + 1]);
    delete window.PSAREMA_SURVEYED;
    if (typeof refreshOpen === 'function') refreshOpen(); // an open card says "surveyed" now
  }, e => { loading = null; console.warn(e.message); });
  function place(i) {
    const c = coverage()[i], km = c > 0 ? FAR * (1 - c) : Infinity, cls = HAB?.classes[habK[i] / 121 | 0] ?? 'unknown';
    const bed = surveyed?.[i] ? 'survey' : cls === 'unknown' ? 'none' : 'model', rough = dFit[i] < 10 || Math.abs(depth[i] - dFit[i]) > Math.max(3, .3 * dFit[i]);
    return { km, bed, rough, v: .45 * c + .35 * (bed === 'survey' ? 1 : bed === 'model' ? .5 : .15) + .2 * (rough ? .5 : 1) };
  }
  // [state, text] of each point: 'good' | 'fair' | 'weak'
  function rows(i, info) {
    const p = place(i), R = [];
    R.push(p.km === Infinity ? ['weak', tr('sure_recNone', FAR)] : [p.km <= 1.5 ? 'good' : 'fair', tr('sure_rec', nf(Math.max(.1, p.km)))]);
    R.push([p.bed === 'survey' ? 'good' : p.bed === 'model' ? 'fair' : 'weak', tr('sure_bed')[p.bed]]);
    R.push([p.rough ? 'fair' : 'good', tr(p.rough ? 'sure_depthRough' : 'sure_depthOk')]);
    if (info && info.hi != null && info.score > 0) { const d = info.hi - info.lo; R.push([d >= 20 ? 'weak' : d >= 8 ? 'fair' : 'good', d >= 8 ? tr('sure_fc', info.lo, info.hi) : tr('sure_fcOk')]); }
    return R;
  }
  const scores = (i, info) => depth[i] && !northMask[i] && !(info && info.parts?.place == null); // not where the fish cannot be at all (scoreInfo: 0, and sure of it)
  function line(i, info) { // the card: the first weak point only; nothing otherwise (the details list every point)
    if (!scores(i, info)) return '';
    const w = rows(i, info).find(r => r[0] === 'weak');
    return w ? `<p class="sure-line s-weak">${esc(w[1])}</p>` : '';
  }
  function html(i, info) { // the details: every point, and what the word means
    if (!scores(i, info)) return '';
    const lv = ['high', 'medium', 'low'].includes(info?.level) ? `<b class="sure-lv">${esc(tr('conf_' + info.level))}</b>` : '';
    return `<section class="sure"><h4>${typeof ic === 'function' ? ic('info', 'sm') : ''}${esc(tr('sure_title'))}${lv}</h4><ul>${rows(i, info).map(([s, t]) => `<li class="s-${s}">${esc(t)}</li>`).join('')}</ul>` +
      `<p class="hint">${esc(tr('sure_note'))}</p></section>`;
  }
  /* ---------- the map: hatching over the water where the place part is low ---------- */
  // Round 15: thin lines at the screen's own resolution (round 13: 250 m squares of dark bands, which grew with the zoom), in the heat's own
  // box (map.js heatBox), so it moves and zooms with the heat and the shoreline clip trims it at the real coast. Where the lines stop is the
  // mask of low cells smoothed between cell centres: the measure is a 250 m one (records 5 km around, the survey per cell), not sharper.
  let mk = null, part = null, on = false;
  function mask() { // W x H, image rows in Mercator (map.js MROW): opaque over the low water, and over the land cells beside it (the clip cuts those at the shore)
    if (mk) return mk;
    const low = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (depth[i] && !northMask[i] && place(i).v < .5) low[i] = 1;
    mk = document.createElement('canvas'); mk.width = W; mk.height = H;
    const g = mk.getContext('2d'), img = g.createImageData(W, H), p = new Uint32Array(img.data.buffer);
    for (let y = 0; y < H; y++) for (let x = 0, r = MROW[y] * W; x < W; x++) {
      const i = r + x;
      if (low[i] || !depth[i] && !northMask[i] && (x && low[i - 1] || x < W - 1 && low[i + 1] || i >= W && low[i - W] || i + W < N && low[i + W])) p[y * W + x] = 0xff000000;
    }
    g.putImageData(img, 0, 0); return mk;
  }
  function lines(g, dpr, L0, T0) { // light lines over a dark casing, 45°, 7 px apart, fixed to the map (the pattern's phase follows the box)
    const n = Math.round(7 * dpr), c = document.createElement('canvas'); c.width = c.height = n;
    const q = c.getContext('2d');
    for (const [col, lw] of [['rgb(0 0 0 / .32)', 2.4], ['rgb(226 230 234 / .5)', 1]]) { q.strokeStyle = col; q.lineWidth = lw * dpr; q.beginPath(); for (const o of [-n, 0, n]) { q.moveTo(o, n); q.lineTo(o + n, 0); } q.stroke(); }
    const pat = g.createPattern(c, 'repeat'); pat.setTransform(new DOMMatrix([1, 0, 0, 1, -(L0 * dpr % n), -(T0 * dpr % n)])); return pat;
  }
  function draw() { // round 17 Z: a part of the heat's view box (map.js ViewBox), which draws it again with every new layout, inside the shoreline clip
    part ||= heat.add((g, V) => {
      g.fillStyle = lines(g, V.dpr, -V.gx, -V.gy); g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      g.globalCompositeOperation = 'destination-in'; g.imageSmoothingEnabled = true;
      gridImage(g, V, mask()); // (the clip keeps the pattern inside the grid, which the mask covers)
      g.globalCompositeOperation = 'source-over';
    }, 'sure-hatch', 'sea');
    part.cv.style.zIndex = 2; part.on = on; heat.draw(part); // over both heat layers (css/spot.css .sure-hatch loses to leaflet.css's canvas rule)
  }
  function show(v) {
    on = v; if (!on) { draw(); return; }
    load().then(() => { if (state.layers?.sure) draw(); });
  }
  addEventListener('DOMContentLoaded', () => {
    if (typeof map === 'undefined' || $('#lay-sure')) return;
    setTimeout(load, 4000); // after the first map: 9 kB
    { const t0 = performance.now(), go = () => (typeof scored !== 'undefined' && scored) || performance.now() - t0 > 8e3 ? warm() : setTimeout(go, 300); setTimeout(go, 300); } // round 14
    const after = $('#lay-bands')?.closest('.lp-sub') || $('#lay-heat')?.closest('label'); if (!after) return;
    const row = document.createElement('div'), lab = document.createElement('label'); row.className = 'lp-sub'; row.append(lab);
    lab.innerHTML = `<input type="checkbox" id="lay-sure"> <span data-i18n="l_sure">${esc(tr('l_sure'))}</span>`; lab.dataset.i18nTitle = 'sureTip'; lab.title = tr('sureTip');
    after.after(row);
    const box = lab.firstChild; box.checked = !!state.layers?.sure;
    box.addEventListener('change', () => { (state.layers ||= {}).sure = box.checked; savePrefs(); show(box.checked); });
    if (box.checked) show(true);
    heat.on('add', () => on && draw());
  });
  return { place, line, html, load };
})();
