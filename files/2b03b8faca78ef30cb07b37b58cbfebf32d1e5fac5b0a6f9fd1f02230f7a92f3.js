'use strict';
// Psarema round 16 engine: the hour worker (driven by js/map.js HW). It scores one hour of a big map with model.js scoreCells, off the
// page's thread. The scoring code is not copied here: the worker loads js/model.js itself (importScripts, the list is model.js HW_SCRIPTS),
// so whatever scoreCells does on the page it does here. It has no core.js, no sources.js and no DOM; what scoreCells reads from them comes in
// messages (model.js HW_FNS, hwGlobals, hwFish say what). Any error here ends the worker and the page scores as before (map.js hwEnd).
// Messages, each part optional and handled in this order:
//   fns      { name: function text }   core.js helpers (clamp, lerp, trap), made global
//   set      { name: value }           globals: the fixed grids, the forecast's fields, constants, the sat flags
//   scripts  [file, …]                 loaded with importScripts, relative to this file
//   P        the fish and method on the map: the fields of model.js prepare()'s context that scoreCells reads
//   tfit, day  every cell's temperature fit on a day of the ocean file (model.js tempFitDay; the two latest days are kept)
//   h, gen, day  score hour h; answers { gen, h, a: a byte a cell along P.idx (transferred), ms }
// Round 16 phase 2: a second worker of this same file paints a big map's coarse image (map.js PP). It loads no model: map.js sends the text
// of its own softCells, boxDown, toShore, lowImg and greyPx (fns) and their tables (set), so the pixels are the page's own, made here.
//   paint    { tok, a, on, lut, rnd, d, grey, idx?, zoneGrey? }  answers { tok, vis, d, px (the image's pixels, transferred), f8, ms }
self.window = self; // scoreCells looks for window.PsPersonal: none here (a personal correction keeps the map on the page's thread)
self.state = {}; self.byId = () => null; self.HAB = null; // what model.js's first lines read as it loads
self.fishTemp = self.clarityM = () => NaN; // never reached: each day's temperature fit arrives ready (P.tfit), and spearfishing stays on the page
self.map = { hasLayer: () => hwGrey }; self.protLayer = null; // softCells asks whether the closed zones show: the page says (paint.grey)
let hwP = null, hwGrey = false;
const hwT = new Map();
onmessage = ({ data: m }) => {
  if (m.fns) for (const k in m.fns) self[k] = (0, eval)('(' + m.fns[k] + ')');
  if (m.set) Object.assign(self, m.set);
  if (m.scripts) importScripts(...m.scripts);
  if (m.P) { hwP = m.P; hwT.clear(); }
  if (m.tfit) { hwT.set(m.day, m.tfit); if (hwT.size > 2) hwT.delete(hwT.keys().next().value); }
  if (m.paint) {
    const p = m.paint, t = performance.now();
    if (p.idx) { self.shownIdx = p.idx; self.shownN = p.idx.length; }
    if (p.zoneGrey !== undefined) self.zoneGrey = p.zoneGrey;
    hwGrey = p.grey; ON.set(p.on);
    scores.fill(0); for (let j = 0, a = p.a, idx = shownIdx; j < a.length; j++) scores[idx[j]] = a[j]; // map.js showHour
    const vis = softCells(CLIP ? toShore(scores) : scores, p.lut, p.rnd); // map.js paint()
    let px;
    if (p.d > 1) { boxDown(p.d); px = lowImg(p.d).p32.slice(); } else { px = px32; self.px32 = new Uint32Array(N); }
    const f = f8.slice();
    postMessage({ tok: p.tok, vis, d: p.d, px, f8: f, ms: performance.now() - t }, [px.buffer, f.buffer]);
  }
  if (m.h >= 0) {
    const a = new Uint8Array(hwP.n), t = performance.now();
    if (m.day >= 0) { hwP.tday = m.day; hwP.tfit = hwT.get(m.day); }
    scoreCells(hwP, m.h, m.h + 1, hwP.idx, 0, hwP.n, 0, a);
    postMessage({ gen: m.gen, h: m.h, a, ms: performance.now() - t }, [a.buffer]);
  }
};
