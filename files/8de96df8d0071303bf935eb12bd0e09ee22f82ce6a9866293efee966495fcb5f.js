'use strict';
// round 16 timing view (agent T): the day chips, the 24 h line and the ★ hour follow the water in view, not the island's best cell.
// `best[h]` (js/model.js) was the largest score over the whole island in hour h, so a chip was a maximum over places of a maximum over
// hours: some lee shore is calm on most days, and the one day signal with evidence, the sea state at a place, never showed.
// Here best[h] is the largest score over the scoring cells inside the map's bounds; with a spot open, that spot's own score. With the
// whole island in view, or fewer than 20 scoring cells in view, it is the island's line as before. No score changes: only which cells
// the line is taken over. Hook: js/map.js drawTimeline() calls PsTimeView.of(best); panning and zooming refresh it once the map rests.
const PsTimeView = (() => {
  const MAXC = 800, MINC = 20, REST = 300; // cells scored at most, cells needed, ms after the last move
  let island = null, view = null, key = '', timer = 0;
  const stats = {}; // what the last lines cost (scripts/fit/r16-time/diag-whole.js)
  const spot = () => typeof sel !== 'undefined' && sel.i >= 0 && cur.where[sel.i] > 0 ? sel.i : -1;
  const keyNow = () => { const b = map.getBounds(); return [curGen, spot(), b.getWest().toFixed(4), b.getSouth().toFixed(4), b.getEast().toFixed(4), b.getNorth().toFixed(4)].join('|'); };
  function compute() {
    key = keyNow();
    const P = cur, si = spot(), b = map.getBounds(), n = b.getNorth(), s = b.getSouth(), w = b.getWest(), e = b.getEast();
    let idx;
    if (si >= 0) idx = Int32Array.of(si);
    else {
      let all = true;
      for (let j = 0; j < P.ns && all; j++) { const i = P.sidx[j], la = latOf(i), lo = lonOf(i); all = la <= n && la >= s && lo >= w && lo <= e; }
      if (all) return island; // the whole island's scoring water is in view
      const x0 = Math.max(0, Math.floor((w - WEST) / RES)), x1 = Math.min(W - 1, Math.floor((e - WEST) / RES)), y0 = Math.max(0, Math.floor((NORTH - n) / RES)), y1 = Math.min(H - 1, Math.floor((NORTH - s) / RES)), a = [];
      for (let y = y0; y <= y1; y++) for (let i = y * W + x0, z = y * W + x1; i <= z; i++) if (P.where[i] > 0) a.push(i);
      if (a.length < MINC) return island;
      const step = Math.ceil(a.length / MAXC); // ponytail: every step-th cell when the view holds more than MAXC; a kept list of the best cells if a line ever looks jumpy
      idx = Int32Array.from(step > 1 ? a.filter((_, j) => j % step === 0) : a);
    }
    const acc = new Float64Array(hours.length), t0 = performance.now();
    scoreCells(P, 0, hours.length, idx, 0, idx.length, 1, acc);
    stats.viewCells = idx.length; stats.viewMs = performance.now() - t0;
    return Array.from(acc);
  }
  function of(b) { // drawTimeline's hook: a line it has not seen is the island's fresh one (prepCurrent ran)
    if (b === view) return b;
    island = b; view = compute(); whole(b);
    return view;
  }
  // The island's own line over EVERY cell, so that no view can stand above it (model.js takes it over every 6th cell, SAMPLE, and a
  // view takes every cell: Paphos once read 83 against the island's 78). No score can pass 100 x where x P.season[h] (every other
  // factor is at most 1, your own catches at most their max), so only cells whose where-fit could beat the sampled line somewhere are
  // scored, about SLICE ms at a time in idle time, starting from the sampled line. Then the line is swapped in and drawn once.
  const CHUNK = 200, SLICE = 8, idle = window.requestIdleCallback || (fn => setTimeout(fn, 30));
  function whole(b) {
    const P = cur, gen = curGen, T = hours.length, pcM = Math.max(1, (window.PsPersonal || window.PsCatch)?.correction(P.s.id)?.max ?? 1);
    let need = Infinity; for (let h = 0; h < T; h++) if (P.season[h] > 0) need = Math.min(need, b[h] / (100 * P.season[h] * pcM));
    if (!P.ub) return; // a profile whose factors could pass 1 (model.js prepare, `unit`): no bound, so the sampled line stays
    if (!(need > 0 && need < Infinity)) return; // nothing scores, or no number yet (spearfishing without plankton data): the sampled line stays
    // round 16 engine: the candidate list is made in the first idle slice, not in the tap's own task (a callback over ~525k cells: 30-60 ms on a phone)
    let idx = null, j = 0; const acc = Float64Array.from(b);
    Object.assign(stats, { cells: P.n, cand: 0, ms: 0, slices: 0, maxSlice: 0, done: false });
    const step = () => {
      if (gen !== curGen || island !== b) return; // another fish, method or forecast: its own job runs
      if (!idx) { const t0 = performance.now(), a = new Int32Array(P.n); let m = 0; for (let q = 0; q < P.n; q++) { const i = P.idx[q]; if (P.where[i] >= need) a[m++] = i; } idx = a.subarray(0, m); stats.cand = m; stats.ms = stats.maxSlice = performance.now() - t0; stats.slices = 1; idle(step); return; }
      const t = performance.now(); do scoreCells(P, 0, T, idx, j, Math.min(idx.length, j += CHUNK), 1, acc); while (j < idx.length && performance.now() - t < SLICE); // spearfishing skips nothing (model.js op 1), so a slice is cut by the clock, not by a count
      const d = performance.now() - t; stats.ms += d; stats.slices++; stats.maxSlice = Math.max(stats.maxSlice, d);
      if (j < idx.length) { idle(step); return; }
      const full = Array.from(acc), shown = view === b; island = full; stats.done = true;
      if (shown) { best = view = full; drawTimeline(); drawWhen(); } // eslint-disable-line no-global-assign
    };
    idle(step);
  }
  function rest() { // the map came to rest, or a spot opened or closed: a new line only when the view, the spot or the fish changed
    timer = 0;
    if (!F || !island || !cur?.where || keyNow() === key) return;
    best = view = compute(); // eslint-disable-line no-global-assign
    drawTimeline(); drawWhen();
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(rest, REST); };
  if (typeof map !== 'undefined' && map?.on) { // not in the test bench (no map there)
    map.on('moveend zoomend click popupopen popupclose', later);
    document.addEventListener('click', later, { passive: true }); // a spot sheet opened or closed without the map moving
  }
  return { of, stats, island: () => island }; // island(): the whole island's line, whatever is in view
})();
