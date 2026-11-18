'use strict';
// Psarema: artificial lures (round 13). The catalogue is data/lures.js; this file ranks it and draws the "Lures" section of an area page
// (js/areas.js) and the compact "Top lures now" of a fish's page (js/species-page.js). Loaded on first use by js/area-gear.js (needLures),
// after the gear files and the bait ranking (js/area-baits.js), which it builds on: nothing of it is in the first load.
//   window.PsLures(H) → { ready, rank, html }; H = js/area-gear.js's helpers plus R, the bait ranking.
//   rank(areaId, { sp, mode, month, hour, cell, cond }) → [{ id, x (the catalogue entry), score, fish, gfish, gcols, notes, src, when }], best first.
// How a lure scores: its family is scored by the bait ranking for each fish (R.baits, kinds lure: this coast, the fish's guide, its food, the
// month, the light, the seabed and depth, the sea, catch reports, your log); a family the fish's guide does not list starts lower, as usual
// practice (R.score, basis "rule"). Then this size's own points: the weight or length the fish's guide gives for the family (+4 / −4, source),
// the size's main targets, listed first in the catalogue (+3, rule), its usual months (+4 / −5) and the depth it is fished in (−12 outside).
// With all fish: the likeliest fish counts most (−5 a place, as the baits) and a lure for several gets up to +3. Every reason carries its basis.
// Colours (phase 2): each row's colours are ordered by how they suit this place and moment, each with its reasons (fitCols, further down).
// Phase 3: filters on the area page (fish, shore or boat, lure type, budget: a rough price band per lure), a row's fold with its three best colours
// and a View more button that opens the lure's detail sheet (a <dialog>); the light of any hour from SunCalc (sun, moon) and the forecast's cloud.
//   sheetHtml(areaId, opts, lureId) → that sheet's html, flt → the filters (both for the self-check).
// Drawings: one small SVG symbol per lure shape (#lu-s-<shape>), painted through CSS variables (--b body, --k back, --h head) per colour.
/* global state, I18N, pill, ring, ic, hours, F, bil, NN, idxAt, latOf, lonOf, clarityM, SunCalc, byId */
window.PsLures = ({ D, AREAS, lang, L, E, t, num, name, fish, inSeason, R }) => {
  const LD = () => window.PSAREMA_LURES, BM = () => window.PSAREMA_BAIT_MODEL, GEARS = () => window.PSAREMA_GEAR || {};
  const ready = () => !!(LD() && BM());
  const tx = (k, ...a) => { const I = typeof I18N === 'object' ? I18N : {}, v = I[lang()]?.[k] ?? I.en?.[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
  let fam = null; const FAM = () => fam ||= Object.fromEntries(LD().fams.map(f => [f.id, f])), COL = () => LD().colours;
  const mRange = ([a, b]) => { const M = t('months'); return `${M[a - 1]}–${M[b - 1]}`; };

  /* ---------- Ranking ---------- */
  const guide = new Map(); // fish → Map(lure family id of the gear catalogue → { cols: Set(colours its guide names), size: the weight and size it gives })
  function guideOf(fid) {
    let m = guide.get(fid); if (m) return m;
    const g = GEARS()[fid] || {}, put = (id, cs, size) => { const o = m.get(id) || { cols: new Set(), size: '' }; (cs || []).forEach(k => o.cols.add(k)); o.size ||= size; m.set(id, o); }; m = new Map();
    for (const l of g.lures || []) put(l.gear, l.colors, [l.weight, l.size].filter(Boolean).join(' · '));
    if (g.silicone?.use) for (const id of g.silicone.ids || []) put(id, g.silicone.colors, g.silicone.size || '');
    if (Object.keys(GEARS()).length) guide.set(fid, m); // not kept before the gear files are in
    return m;
  }
  // "10–30 g · 7–12 cm" → [{ a, b, u }]; a size fits the guide's when each unit they share overlaps it (more than an end point)
  const rngs = s => [...String(s || '').matchAll(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*(g|cm)\b/g)].map(m => ({ a: +m[1], b: +(m[2] || m[1]), u: m[3] }));
  function sizeFit(mine, theirs) { // true, false, or null (no unit in common)
    const A = rngs(mine), Bs = rngs(theirs), both = A.filter(p => Bs.some(q => q.u === p.u));
    return both.length ? both.every(p => Bs.some(q => q.u === p.u && (Math.max(p.a, q.a) < Math.min(p.b, q.b) || (p.a === p.b || q.a === q.b) && Math.max(p.a, q.a) <= Math.min(p.b, q.b)))) : null;
  }
  const whenOf = (w, x) => x.months ? [String(w || '').split(' · ')[0], mRange(x.months)].filter(Boolean).join(' · ') : w || '';
  const cache = new Map();
  function rank(areaId, o = {}) {
    if (!ready()) return [];
    const q = { mode: o.mode, month: o.month, hour: o.hour, cell: o.cell, cond: o.cond }, c = R.ctx(areaId, q);
    if (c.mode === 'spear') return [];
    const sp = o.sp || (typeof state === 'object' && state.sp) || 'all', fs = sp === 'all' ? R.fishNow(areaId, c) : [sp], en = envOf(areaId, c, o);
    const key = [areaId, sp, c.mode, c.month, c.period, c.cell, c.wave, c.clear, c.sst, en.vis, en.band, en.light, en.cloud, lang(), window.PsCatchLog?.all?.()?.length].join('|');
    if (cache.has(key)) return cache.get(key);
    const T = BM().traits, out = new Map();
    fs.forEach((fid, r) => {
      const ranked = new Map(R.baits(areaId, { ...q, mode: c.mode, sp: fid, kinds: ['lure'] }).map(e => [e.gear, e])), gd = guideOf(fid);
      LD().lures.forEach((x, ord) => {
        if (!x.mode.includes(c.mode) || !x.fish.includes(fid)) return;
        const p = x.parent.find(g => ranked.has(g)), e = p ? ranked.get(p) : R.score({ gear: x.parent[0], base: 44, usual: tx('lu_usual', fish(fid)) }, fid, c);
        const notes = e.notes.map(n => ({ ...n })), first = notes.shift(); let v = e.score;
        const add = (pts, text, basis = 'rule') => { v += pts; notes.push({ pts, text, basis }); };
        const gs = p && gd.get(p)?.size, fit = gs ? sizeFit(x.size, gs) : null; // the size the fish's guide gives for this family
        if (fit != null) add(fit ? 4 : -4, tx(fit ? 'lu_sizeOk' : 'lu_sizeNo', rngs(gs).map(r => r.a === r.b ? `${r.a} ${r.u}` : `${r.a}–${r.b} ${r.u}`).join(' · ')), 'src');
        if (x.fish.indexOf(fid) < 2) add(3, tx('lu_main', fish(fid))); // the catalogue lists a size's main targets first
        if (x.months) { const on = inSeason(x.months[0], x.months[1], c.month); add(on ? 4 : -5, tx(on ? 'lu_inMonths' : 'lu_outMonths', mRange(x.months))); }
        const pd = T[p || x.parent[0]]?.depth, d = c.depth; // the family's own depth limit already counted: not twice
        if (x.depth && d != null && !(pd && (d < pd[0] || d > pd[1])) && (d < x.depth[0] || d > x.depth[1])) add(-12, tx(d < x.depth[0] ? 'lu_shallow' : 'lu_deep', Math.round(d)));
        notes.sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts)); notes.unshift(first);
        const gcols = new Set(x.parent.flatMap(g => [...(gd.get(g)?.cols || [])]).filter(k => COL()[k]));
        const row = { id: x.id, x, ord, score: Math.max(5, Math.min(98, Math.round(v))) - 5 * r, fish: [fid], gfish: x.parent.some(g => gd.has(g)) ? [fid] : [], gcols, notes, src: e.src, when: whenOf(e.when, x) };
        const prev = out.get(x.id);
        if (!prev) { out.set(x.id, row); return; }
        const merged = { fish: [...prev.fish, fid], gfish: [...prev.gfish, ...row.gfish], gcols: new Set([...prev.gcols, ...gcols]) };
        if (row.score > prev.score) Object.assign(prev, row); Object.assign(prev, merged);
      });
    });
    const list = [...out.values()];
    if (sp === 'all') for (const e of list) { e.score = Math.min(98, e.score + Math.min(3, e.fish.length - 1)); e.notes = [{ pts: 0, text: tx('lu_forFish', e.fish.map(fish).join(', ')), basis: 'src' }, ...e.notes]; }
    list.sort((a, b) => b.score - a.score || a.ord - b.ord);
    Object.assign(list, { c, en, areaId }); for (const e of list) e.cfit = fitCols(e, list);
    if (cache.size > 40) cache.clear();
    cache.set(key, list); return list;
  }

  /* ---------- Colours: why each one suits this place and moment (phase 2) ----------
     Read for the area (its sea cell when the page has one, else its centre), the method, the month and the hour on show:
     - water clarity: PsAreaProfile.clarityAt (the area's monthly open-water satellite estimate), else today's satellite (js/sources.js clarityM),
       in bands: clear ≥ 15 m, average 6–15 m, murky < 6 m; "murky now" when the forecast's waves have stirred it (R.ctx). The bands are how anglers
       judge water, not one dataset's scale (the profile's numbers may move to a Secchi scale: Cyprus open water stays "clear" in either);
     - light: dawn and dusk, the sun's height and the cloud at that hour (the forecast), the moon at night;
     - how deep the lure swims (its zone; trolled lures their running depth; bottom lures the cell's depth); the seabed under a bottom lure;
     - white water (waves ≥ 0.8 m) near the top or from the shore, flat calm in clear water;
     - the small fish in season (the app's season tables; this area's own guide lists them) and the fish's food (the FishBase rows of the bait model);
     - the colours its fish guide names.
     Each line is "rule" (the light-and-colour rules of thumb: natural in clear water, bright or contrast in murky, silhouettes and glow in the dark,
     gold in low light, reds fade first with depth) or "src" (the fish guide, the season tables, the diet rows). The points are judgements, not fitted. */
  const VIS = { clear: 15, murky: 6 };
  let profLoad = null;
  // The moment the colours are read for (ms): the forecast hour on show, else now; an hour given by hand (o.hour 0–23 with o.month) on the
  // Cyprus clock (UTC+3 April–October, else +2: summer time to within its last-Sunday edges). A named period ('dawn', …) has no clock time.
  function momentOf(c, o) {
    if (c.current) return typeof hours !== 'undefined' && typeof state === 'object' && hours?.[state.h] ? hours[state.h].t + 18e5 : Date.now();
    const hr = o.hour != null && /^\d+(\.\d+)?$/.test(String(o.hour)) ? +o.hour : null; if (hr == null) return null;
    return Date.UTC(new Date().getFullYear(), c.month - 1, 15) + (hr + .5 - (c.month >= 4 && c.month <= 10 ? 3 : 2)) * 36e5;
  }
  function envOf(areaId, c, o = {}) {
    const a = AREAS.find(x => x.id === areaId), cell = c.cell >= 0 ? c.cell : -1;
    const lat = cell >= 0 && typeof latOf === 'function' ? latOf(cell) : a?.lat ?? 34.9, lon = cell >= 0 && typeof lonOf === 'function' ? lonOf(cell) : a?.lon ?? 33.3;
    const i = cell >= 0 ? cell : a && typeof idxAt === 'function' ? idxAt(a.lat, a.lon) : -1, P = window.PsAreaProfile;
    let vis = NaN, vsrc = '', cloud = null, moon = null, light = { dawn: 'low', dusk: 'low', day: 'day', night: 'dark' }[c.period];
    if (P?.clarityAt && a) { vis = P.clarityAt(lat, lon, c.month); if (vis > 0) vsrc = 'p'; else if (P.load && !profLoad) needProfile(); }
    if (!(vis > 0) && c.current && i >= 0 && typeof clarityM === 'function') { vis = clarityM(i); if (vis > 0) vsrc = 's'; }
    const t = momentOf(c, o);
    if (t != null) try { // that moment: its cloud here (the forecast hour that holds it), the sun's height by day, the moon by night (SunCalc)
      const k = typeof F === 'object' && F?.times && F.cloud ? F.times.findIndex(s => Math.abs(Date.parse(s + 'Z') + 18e5 - t) < 18e5 + 1) : -1;
      if (k >= 0 && i >= 0 && typeof bil === 'function') cloud = bil(F.cloud, k * NN, i);
      else if (c.current && typeof hours !== 'undefined' && hours?.[state.h]) cloud = hours[state.h].cloud ?? null;
      if (typeof SunCalc === 'object') {
        const d = new Date(t), deg = r => r * 180 / Math.PI;
        if (c.period === 'night') { const f = SunCalc.getMoonIllumination(d).fraction, up = Math.max(0, Math.min(1, deg(SunCalc.getMoonPosition(d, lat, lon).altitude) / 10)); // as js/sources.js moonUp
          moon = Math.round(f * 100); light = f * up >= .5 ? 'moon' : 'dark'; }
        else if (c.period === 'day') light = cloud >= 70 ? 'dull' : deg(SunCalc.getPosition(d, lat, lon).altitude) >= 35 && cloud != null && cloud < 40 ? 'bright' : 'day'; // no cloud known: not "bright"
      }
    } catch (e) { /* a forecast layer not in yet: the hour's period only */ }
    vis = vis > 0 ? Math.round(vis) : null;
    return { vis, vsrc, light, moon, cloud: cloud == null ? null : Math.round(cloud), band: c.murky ? 'murky' : vis ? vis >= VIS.clear ? 'clear' : vis < VIS.murky ? 'murky' : 'mid' : null };
  }
  function needProfile() { // the area profiles (~0.25 MB) once, then the lure sections on show again with their clarity
    profLoad = Promise.resolve(window.PsAreaProfile.load()).then(() => {
      cache.clear(); if (!D2) return;
      for (const r of D2.querySelectorAll('[data-lu-root]')) { const o = optsOf(r); if (o) redraw(r, o); }
    }, e => console.warn('lure colours: area profiles', e?.message));
  }
  const workDepth = (x, c) => { const z = x.zone || FAM()[x.fam].zone, d = c.depth;
    return z === 'top' ? 0 : z === 'shallow' ? 2 : x.run ? (x.run[0] + x.run[1]) / 2 : z === 'mid' ? Math.min(d ?? 8, c.mode === 'shore' ? 6 : 15)
      : d ?? (c.mode === 'shore' ? 6 : x.depth ? (x.depth[0] + x.depth[1]) / 2 : 30); };
  const deepK = (x, c) => c.depth == null && ['bottom', 'mid'].includes(x.zone || FAM()[x.fam].zone) ? 'lu_deepTyp' : 'lu_deepAt'; // no sea cell: the size's usual depth, not this place's
  // the seabed under a bottom lure: the cell's, or (no cell) the area's 0–40 m mix, only for a lure fished in that depth
  const bedOf = (x, c) => (x.zone || FAM()[x.fam].zone) === 'bottom' && (c.cell >= 0 || workDepth(x, c) <= 40) ? c.bedTop : null;
  const rawFish = id => (typeof byId === 'function' && byId(id)) || (window.PSAREMA_SPECIES || []).find(s => s.id === id);
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  function fitCols(e, { c, en, areaId }) { // → [{ k, pts, notes: [{ pts, text, basis }] }], best first
    const x = e.x, Cm = COL(), M = BM(), fid = e.fish[0], diet = (fid && M.diet[fid]) || {}, food = M.traits[x.parent[0]]?.food, Ef = tx('lu_e');
    const z = x.zone || FAM()[x.fam].zone, wd = workDepth(x, c), Lt = en.light, night = Lt === 'dark' || Lt === 'moon', day = !night && Lt !== 'low', lt = tx('lu_light')[Lt];
    const here = new Set((D[areaId]?.methods[c.mode]?.targets || []).filter(([, f, to]) => inSeason(f, to, c.month)).map(r => r[0]));
    return [...new Set([...x.cols, ...e.gcols])].filter(k => Cm[k]).map((k, ord) => {
      const C0 = Cm[k], T = new Set(String(C0.t || '').split(' ')), notes = [];
      const say = (pts, cond, eff, basis = 'rule') => notes.push({ pts, text: eff ? `${cap(cond)}: ${eff}` : cap(cond), basis });
      if (night) { /* in the dark the light decides: no clarity line */ }
      else if (en.band === 'clear') { const cd = tx('lu_clear', num(en.vis)); if (T.has('nat')) say(3, cd, Ef.natReal); if (T.has('br') && day) say(-2, cd, Ef.loudFake); }
      else if (en.band === 'murky') { const cd = c.murky || !en.vis ? tx('lu_murkyNow') : tx('lu_murky', num(en.vis));
        if (T.has('br') || T.has('gold')) say(3, cd, Ef.brightFar); else if (T.has('dk') || T.has('wh')) say(2, cd, Ef.outline);
        if (T.has('clr')) say(-3, cd, Ef.natLost); else if (T.has('nat')) say(-2, cd, Ef.natLost); }
      if (wd >= 30) { /* 30 m and more down the surface light hardly reaches: the depth lines below decide */ }
      else if (Lt === 'dark') { if (T.has('gl')) say(4, lt, Ef.glow); if (T.has('uv')) say(2, lt, Ef.uv); if (T.has('dk')) say(3, lt, Ef.silhouette); if (T.has('fl')) say(-2, lt, Ef.noFlash); }
      else if (Lt === 'moon') { if (T.has('dk')) say(3, lt, Ef.silhouette); if (T.has('gl')) say(1, lt, Ef.glow); }
      else if (Lt === 'low') { if (T.has('gold')) say(3, lt, Ef.gold); if (T.has('dk')) say(2, lt, Ef.silhouette); if (T.has('uv')) say(2, lt, Ef.uv); }
      else if (Lt === 'dull') { if (T.has('gold')) say(2, lt, Ef.gold); if (T.has('wh')) say(2, lt, Ef.pale); if (T.has('gl')) say(-1, lt, Ef.glowWaste); }
      else if (Lt === 'bright') { if (T.has('fl') && !T.has('gold')) say(3, lt, Ef.flash); if (T.has('clr')) say(2, lt, Ef.clearHide); if (T.has('gl')) say(-2, lt, Ef.glowWaste); }
      else { if (T.has('fl') && !T.has('gold')) say(1, lt, Ef.flash); if (T.has('gl')) say(-2, lt, Ef.glowWaste); }
      if (wd >= 10 && !night) { const cd = tx(deepK(x, c), Math.round(wd)); // light dims and reds go first with depth
        if (T.has('red')) say(-2, cd, Ef.redDark); else if (T.has('or') && wd >= 20) say(-2, cd, Ef.orangeFade);
        if (T.has('bg') && wd >= 15) say(2, cd, Ef.blueGreen); if (T.has('gl') && wd >= 30) say(3, cd, Ef.glowDeep); }
      const bed = bedOf(x, c), bd = bed && tx('lu_bed')[bed];
      if (bed === 'sand' || bed === 'coarse') { if (T.has('sand')) say(2, bd, Ef.sandMatch); else if (T.has('dk')) say(1, bd, Ef.sandDark); }
      else if (bed === 'seagrass') { if (T.has('grass')) say(2, bd, Ef.grassMatch); else if (T.has('br')) say(1, bd, Ef.grassBright); }
      else if (bed === 'rock' && T.has('rock')) say(2, bd, Ef.rockMatch);
      if (c.rough && (z !== 'bottom' || c.mode === 'shore')) { const cd = tx('lu_rough', num(c.wave.toFixed(1))); if (T.has('wh')) say(3, cd, Ef.foam); else if (T.has('clr') || T.has('nat')) say(-1, cd, Ef.subtleLost); }
      else if (c.calm && en.band === 'clear' && !night && (T.has('clr') || T.has('nat'))) say(T.has('clr') ? 2 : 1, tx('lu_calm'), Ef.calmClear);
      if (C0.f && food === 'fish' && (diet.fish || 0) >= 1) { // a fish-shaped lure for a fish eater: the small fish it copies
        if (C0.f === 'baitfish') { if (diet.fish >= 2) say(2, tx('lu_diet'), Ef.smallFish); }
        else if ((rawFish(C0.f)?.season?.[c.month - 1] ?? 0) >= .8) say(here.has(C0.f) ? 4 : 3, tx(here.has(C0.f) ? 'lu_forageHere' : 'lu_forage', fish(C0.f)), Ef.forage, 'src');
      }
      if (C0.fd === 'ceph' && (diet.ceph || 0) >= 2) say(3, tx('lu_diet'), Ef.squid, 'src');
      if (C0.fd === 'crust' && (diet.crust || 0) >= 2) say(3, tx('lu_diet'), Ef.shrimp, 'src');
      if (e.gcols.has(k)) say(3, tx('lu_guideNamed'), '', 'src');
      notes.sort((p, q) => (q.pts > 0) - (p.pts > 0) || Math.abs(q.pts) - Math.abs(p.pts)); // the reasons for it first, then against
      return { k, pts: notes.reduce((s, n) => s + n.pts, 0), notes, ord };
    }).sort((p, q) => q.pts - p.pts || p.ord - q.ord);
  }
  function envLine(x, { c, en }) { // what the colours were read for, in one line
    const wd = workDepth(x, c);
    return `${tx('lu_env')}: ` + [c.murky ? tx('lu_murkyNow') : en.vis ? tx('lu_vis', num(en.vis), tx(en.vsrc === 'p' ? 'lu_visP' : 'lu_visS')) : '', tx('lu_light')[en.light], en.moon != null && tx('lu_moon', en.moon),
      en.cloud != null && tx('lu_cloud', en.cloud), c.wave != null && tx('lu_wave', num(c.wave.toFixed(1))),
      bedOf(x, c) && tx('lu_bed')[bedOf(x, c)], wd ? tx(deepK(x, c), Math.round(wd)) : tx('lu_top0')].filter(Boolean).join(' · ');
  }

  /* ---------- Drawings: one symbol per shape, head on the left, viewBox 64 × 32 ---------- */
  const O = 'stroke="#fff" stroke-opacity=".3" stroke-width=".6" stroke-linejoin="round"';
  const B = d => `<path d="${d}" style="fill:var(--b)" ${O}/>`, K = d => `<path d="${d}" style="fill:var(--k)"/>`, HD = d => `<path d="${d}" style="fill:var(--h,transparent)"/>`;
  const eye = (x, y, r = 1.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f4e04d"/><circle cx="${x}" cy="${y}" r="${r * .5}" fill="#1b1b1b"/>`;
  const line = (d, w = .8, c = '#c6ced4') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const treble = (x, y) => line(`M${x} ${y}v3.4m0 0a1.8 1.8 0 0 1-3.6 0m3.6 0a1.8 1.8 0 0 0 3.6 0`);
  const sheen = d => line(d, .8, 'rgb(255 255 255 / .4)'), lead = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#9aa3aa" ${O}/>`;
  const fishBody = (body, back, head, ex, ey, hooks, extra = '') => extra + B(body) + K(back) + HD(head) + eye(ex, ey) + hooks.map(h => treble(...h)).join('');
  const SH = {
    jig: B('M5 16C9 11.5 36 10.5 59 13.5C45 20.5 15 21.5 5 16Z') + K('M5 16C9 11.5 36 10.5 59 13.5C40 14.5 20 15 5 16Z') + sheen('M16 18C28 18.5 40 17.5 50 15.6') + eye(11, 15.2) + line('M6 15.4c-2.6 1.2-3 4-1.4 6a1.9 1.9 0 0 0 3-1.3'),
    slow: B('M5 16C12 8.5 46 8 59 15C46 23.5 12 23.5 5 16Z') + K('M5 16C12 8.5 46 8 59 15C42 14 20 14.5 5 16Z') + sheen('M16 19C28 20 42 19 52 16.6') + eye(11, 14.6) + line('M6 15.4c-2.6 1.2-3 4-1.4 6a1.9 1.9 0 0 0 3-1.3'),
    minnow: fishBody('M11 16C12 10.5 30 9.5 46 11C54 12 58.5 14 59 16C56.5 19 48 21 34 21.3C20 21.8 12 20.5 11 16Z', 'M11 16C12 10.5 30 9.5 46 11C54 12 58.5 14 59 16C46 14.2 26 13.6 11 16Z',
      'M11 16C12 10.5 17 10 21 10.4V21.2C16 21 12 20 11 16Z', 16, 14.6, [[28, 21.3], [47, 19.8]], '<path d="M11.5 17.5L3.5 21.5C2 22.5 3 24.5 5 23.8L13 19.6Z" fill="#cfe8f5" fill-opacity=".55"/>'),
    diver: fishBody('M11 16C12 10.5 30 9.5 46 11C54 12 58.5 14 59 16C56.5 19 48 21 34 21.3C20 21.8 12 20.5 11 16Z', 'M11 16C12 10.5 30 9.5 46 11C54 12 58.5 14 59 16C46 14.2 26 13.6 11 16Z',
      'M11 16C12 10.5 17 10 21 10.4V21.2C16 21 12 20 11 16Z', 16, 14.6, [[28, 21.3], [47, 19.8]], '<path d="M11.5 17L1.5 25C0 26.5 1.5 29 3.5 28L13.5 19.6Z" fill="#cfe8f5" fill-opacity=".55"/>'),
    stick: fishBody('M5 16C8 11 30 10 50 11.8C56 12.6 59.5 14.5 59.5 16C58 18 50 20.2 30 20.6C12 21 6 19.5 5 16Z', 'M5 16C8 11 30 10 50 11.8C56 12.6 59.5 14.5 59.5 16C44 14.4 22 14 5 16Z',
      'M5 16C8 11 12 10.6 16 10.5V20.9C10 20.6 6 19 5 16Z', 10, 14.5, [[26, 20.6], [46, 19.6]]),
    pencil: fishBody('M4 16C7 13 28 12 50 13.3L60.5 16L50 18.7C28 20 7 19 4 16Z', 'M4 16C7 13 28 12 50 13.3L60.5 16C44 15.2 22 15 4 16Z', 'M4 16C7 13 11 12.6 15 12.5V19.5C10 19.3 7 18.8 4 16Z', 9, 15, [[24, 19.4], [44, 18.6]]),
    popper: fishBody('M7 10.5C22 9 44 10 58 14.8C58.8 15.8 58.8 16.6 58 17.4C44 21.5 22 22.6 7 21.5C8.6 18 8.6 14 7 10.5Z', 'M7 10.5C22 9 44 10 58 14.8C58.8 15.8 58.8 16 58.4 16.2C44 14.5 22 14.2 7.9 15Z',
      'M7 10.5C10 10.2 13 10 16 10V22.1C13 22 10 21.8 7 21.5C8.6 18 8.6 14 7 10.5Z', 12.5, 14, [[26, 22], [46, 20.4]]) + '<ellipse cx="7.4" cy="16" rx="1.6" ry="5.2" fill="#1b1b1b" fill-opacity=".55"/>',
    shad: B('M10 16C11 11.5 24 10.8 38 12.6C44 13.4 48 14.6 50 15.4V16.6C48 17.4 44 18.8 38 19.6C24 21.2 11 20.5 10 16Z') + B('M49 15.2L53.5 14.2V17.8L49 16.8Z') + B('M55.5 10C57.4 10 58 13 58 16S57.4 22 55.5 22S53 19 53 16S53.6 10 55.5 10Z') +
      K('M10 16C11 11.5 24 10.8 38 12.6C44 13.4 48 14.6 50 15.4C38 14.6 22 14.6 10 16Z') + lead(7, 16, 4) + eye(6.2, 15, 1.1) + line('M9.5 13.4C13 8 20 8 23 11.8', .9),
    grub: B('M10 16C11 13 20 12.4 30 13.2C34 13.6 36 14.6 36 16C36 17.4 34 18.4 30 18.8C20 19.6 11 19 10 16Z') + B('M35 15C42 11 52 7 58 11.5C62.5 15.5 57 24 50.5 21C55 21.5 58 17.6 54.8 14.8C51 12 44 16.4 35.5 17.2Z') +
      K('M10 16C11 13 20 12.4 30 13.2C34 13.6 36 14.6 36 16C26 15.2 18 15.2 10 16Z') + line('M16 13.2v5.4M20 13v5.8M24 13v5.8', .5, 'rgb(0 0 0 / .25)') + lead(7, 16, 3.6) + eye(6.2, 15, 1),
    slug: B('M8.5 16C10 12.2 26 11.6 42 13.6L60.5 15.6V16.4L42 18.4C26 20.4 10 19.8 8.5 16Z') + K('M8.5 16C10 12.2 26 11.6 42 13.6L60.5 15.6C44 15 24 15 8.5 16Z') + lead(6, 16, 3.4) + eye(5.3, 15.1, 1),
    worm: B('M8 15C14 12 20 12.4 26 14.6S38 18 44 15.4S54 12.6 60.5 14.6L60.5 16.4C54 14.8 49 17.4 44 18.2S32 18.4 26 17S14 15 8 17.4Z') + K('M8 15C14 12 20 12.4 26 14.6S38 18 44 15.4S54 12.6 60.5 14.6C54 14.2 49 16 44 16.6S32 16.6 26 15.6S14 14 8 16Z') + lead(6, 16, 3.2),
    creature: B('M16 16C17 12.5 28 12 38 13.6C43 14.4 46 15.2 46 16C46 16.8 43 17.6 38 18.4C28 20 17 19.5 16 16Z') + B('M16.5 14.5C10 8 3 9.2 3.6 12.4C4.2 15 9.6 14 16 15.6Z') + B('M16.5 17.5C10 24 3 22.8 3.6 19.6C4.2 17 9.6 18 16 16.4Z') +
      B('M45 16L56 11.5C58.5 13 59 19 56 20.5Z') + K('M16 16C17 12.5 28 12 38 13.6C43 14.4 46 15.2 46 16C36 15 26 15 16 16Z') + line('M24 18.6l-3 4M29 18.8l-2 4.4M34 18.5l-1 4.4', .7, '#8e9aa3') + eye(19, 14.6, 1.1),
    shrimp: B('M10 13.5C14 9.4 30 8.6 44 11.2C52 12.8 56.6 16 58.4 19.4L52.4 18.6C46 17.6 40 18.8 30 19.8C18 20.6 11 18.6 10 13.5Z') + B('M52 18.6L60 22.5L56.5 16.6Z') +
      K('M10 13.5C14 9.4 30 8.6 44 11.2C52 12.8 56.6 16 58.4 19.4C48 14.6 28 12.8 10 13.5Z') + line('M24 10v9.6M32 9.6v9.8M40 10.4v8.4', .5, 'rgb(0 0 0 / .25)') + line('M11 12.5C6 8 3 6 1 6M11 13C6 11 3 11 1 12M20 19.8l-2 4M26 19.8l-1.4 4M32 19.6l-.8 4', .6) +
      '<circle cx="14" cy="12.4" r="1" fill="#1b1b1b"/>',
    egi: B('M8 16C9.5 11 28 9.6 46 12C52 12.8 54.5 14.6 54.5 16C54.5 17.4 52 19.2 46 20C28 22.4 9.5 21 8 16Z') + K('M8 16C9.5 11 28 9.6 46 12C52 12.8 54.5 14.6 54.5 16C40 14.6 22 14.6 8 16Z') +
      '<path d="M15 12.2L10 6.5L22 10.8Z M15 19.8L10 25.5L22 21.2Z" style="fill:var(--k)" fill-opacity=".85"/>' + '<path d="M6.5 17.5L18 21.6L17 24.2L5 19.6Z" fill="#9aa3aa"/>' +
      '<circle cx="13.5" cy="14.8" r="2" fill="#f4f4f4"/><circle cx="13.5" cy="14.8" r="1.2" fill="#1b1b1b"/>' + line('M54 16l6-4.5M54 16l7-1.6M54 16l7 1.6M54 16l6 4.5M54 16l4.5-6.2M54 16l4.5 6.2', .8),
    octo: B('M6 16C6 10.5 20 9.6 28 12.6V19.4C20 22.4 6 21.5 6 16Z') + K('M6 16C6 10.5 20 9.6 28 12.6V16C20 15.2 12 15.4 6 16Z') + eye(11, 14.2) +
      '<path d="M28 13C36 11 44 14 52 11M28 15C38 14 46 17 54 15M28 17C38 18 46 15 54 18M28 19C36 21 44 18 52 21" fill="none" style="stroke:var(--b)" stroke-width="1.3" stroke-linecap="round"/>' +
      line('M50 22C56 25 60 22 58 18M52 10C58 7 61 10 59 14', 1.1),
    spoon: B('M7 16C7 10.8 28 9.4 50 12.6C55.5 13.4 56.8 18.6 50 19.4C28 22.6 7 21.2 7 16Z') + K('M10 15C14 12.2 30 11.6 48 13.6C38 14.6 22 15 10 15Z') + sheen('M14 18.4C26 19.4 38 18.6 47 17') +
      `<circle cx="4.6" cy="16" r="1.4" fill="none" stroke="#c6ced4" stroke-width=".7"/>` + line('M55 16h3') + treble(58.5, 16),
    spinner: line('M3 16H60', .8) + '<ellipse cx="17" cy="12.4" rx="9" ry="4.4" transform="rotate(-14 17 12.4)" style="fill:var(--b)" ' + O + '/>' + '<circle cx="26" cy="16" r="1.4" fill="#c6ced4"/>' +
      K('M28 13.2C34 12 42 13 45 16C42 19 34 20 28 18.8Z') + treble(52, 16),
    inchiku: B('M5 16C6 10.6 22 9.4 34 12.6L36 13.6V18.4L34 19.4C22 22.6 6 21.4 5 16Z') + K('M5 16C6 10.6 22 9.4 34 12.6L36 13.6V16C24 14.8 14 15 5 16Z') + eye(11, 15, 1.7) +
      '<path d="M36 14C44 11 50 15 59 11M36 15.4C44 14 52 17 60 15M36 16.6C44 18 52 15.6 60 18M36 18C44 21 50 17 58 21.4" fill="none" style="stroke:var(--k)" stroke-width="1.4" stroke-linecap="round"/>' + line('M42 19v3a1.6 1.6 0 0 1-3.2 0', .8),
    tai: '<circle cx="13" cy="16" r="7" style="fill:var(--b)" ' + O + '/>' + sheen('M9 12.4a5 5 0 0 1 5-2') + eye(10.5, 15, 1.3) +
      '<path d="M19 13C30 9 40 14 52 10M19.6 15C32 13 42 17 56 14M19.6 17C32 19 42 15 56 18M19 19C30 23 40 18 52 22M52 10c4-2 6 1 3 3M56 14c4-1 5 2 2 3" fill="none" style="stroke:var(--k)" stroke-width="1.6" stroke-linecap="round"/>' + line('M24 21v3a1.6 1.6 0 0 1-3.2 0', .8),
    vibe: fishBody('M6 14C9 7.6 30 6.4 44 9C52 10.6 58.5 13.6 58.5 16C56 19.5 50 22.4 40 23C24 24 10 22 6 14Z', 'M6 14C9 7.6 30 6.4 44 9C52 10.6 58.5 13.6 58.5 16C44 12.6 24 12 6 14Z', 'M6 14C9 7.6 14 7 19 7.2V23.6C12 23 8 20 6 14Z', 11.5, 13, [[26, 23.4], [46, 22]]) +
      '<circle cx="20" cy="6.4" r="1.2" fill="none" stroke="#c6ced4" stroke-width=".7"/>',
    blade: fishBody('M6 16C10 9.6 34 8.6 56 12.2L59 16L56 19.8C34 23.4 10 22.4 6 16Z', 'M6 16C10 9.6 34 8.6 56 12.2L59 16C40 14.4 22 14.4 6 16Z', '', 11, 15, [[14, 21], [52, 19.6]]) + '<circle cx="24" cy="11.4" r=".9" fill="#1b1b1b"/><circle cx="30" cy="11" r=".9" fill="#1b1b1b"/><circle cx="36" cy="11.1" r=".9" fill="#1b1b1b"/>',
    feather: '<path d="M15 12C26 6 44 7 60 10C46 11 30 13 15 14Z M15 14.5C28 12.5 46 13 61 16C46 17 28 17.5 15 17.5Z M15 18C30 19 44 21 60 22C44 25 26 24 15 20Z" style="fill:var(--b)" ' + O + '/>' +
      line('M16 13C30 10 44 9.4 58 10M16 16C30 15.4 46 15.6 60 16M16 19C30 20.6 44 21.8 58 22', .5, 'rgb(0 0 0 / .2)') + K('M3 16C3 12.2 9 11 15 12V20C9 21 3 19.8 3 16Z') + eye(7.5, 15, 1.5),
    skirt: B('M19 11C30 10.2 44 10 56 9.4L54 12.6L60 14L54.4 16L60 18L54 19.4L56 22.6C44 22 30 21.8 19 21Z') + line('M24 13H52M24 16H54M24 19H52', .5, 'rgb(0 0 0 / .18)') + K('M3 16C3 11.4 10 10.4 19 11V21C10 21.6 3 20.6 3 16Z') + eye(8, 14.6, 2),
    sabiki: line('M2 7H60', .7) + line('M60 7v4', .7) + '<ellipse cx="60" cy="15" rx="2" ry="3.2" fill="#9aa3aa"/>' +
      [10, 24, 38, 52].map(x => line(`M${x} 7v4`, .6) + B(`M${x} 11C${x - 2.2} 14 ${x - 2.2} 19 ${x} 22C${x + 2.2} 19 ${x + 2.2} 14 ${x} 11Z`) + line(`M${x} 12.4v8`, .9, 'var(--k)') + line(`M${x} 22v2a1.6 1.6 0 0 1-3.2 0`, .7)).join(''),
  };
  const D2 = typeof document === 'object' && document.body ? document : null;
  if (D2 && !D2.getElementById('lu-sprite')) D2.body.insertAdjacentHTML('beforeend', `<svg id="lu-sprite" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>` +
    Object.entries(SH).map(([k, v]) => `<symbol id="lu-s-${k}" viewBox="0 0 64 32">${v}</symbol>`).join('') + '</defs></svg>');

  /* ---------- The section ---------- */
  // The app's rule: a tap shows the essentials, "View more" the details. A row opens to its three best colours here and the main reasons;
  // View more opens the lure's detail sheet (a <dialog>: Back, Escape, the × or a tap outside close it). The area page's section has filters
  // (fish, shore or boat, lure type, budget); type, budget and "all fish" are kept while the app runs, the fish and the method stay with the
  // section (the area page's own choice of fish or method sets them again).
  const vars = id => { const k = COL()[id] || COL().silver; return `--b:${k.b};--k:${k.k}${k.h ? `;--h:${k.h}` : ''}`; };
  const art = (x, col, cls = 'lu-svg') => `<svg class="${cls}" viewBox="0 0 64 32" aria-hidden="true" style="${vars(col)}"><use href="#lu-s-${x.shape || FAM()[x.fam].shape}" width="64" height="32"/></svg>`;
  const chip = s => typeof ring === 'function' ? ring(s, 'sm') : typeof pill === 'function' ? pill(s) : `<span class="pill">${s ?? '·'}</span>`; // round 14: a dial, as the area page's other lists
  const icon = (k, cls = 'sm') => typeof ic === 'function' ? ic(k, cls) : '';
  const euro = p => '€'.repeat(p || 0);
  // best first for this place and moment (fitCols); without a ranking, the colours its fish guide names first, then the catalogue's order
  const colsOf = e => e.cfit ? e.cfit.map(f => f.k).slice(0, 8)
    : [...e.x.cols.filter(k => e.gcols.has(k)), ...[...e.gcols].filter(k => !e.x.cols.includes(k)), ...e.x.cols.filter(k => !e.gcols.has(k))].slice(0, 8);
  const blank = (x, list) => { const e = { id: x.id, x, score: null, fish: [], gfish: [], gcols: new Set(), notes: [], src: [], when: '' }; if (list?.c) e.cfit = fitCols(e, list); return e; };
  const modeT = m => m.length > 1 ? tx('lu_both') : t(m[0]);
  const noteLi = n => `<li class="${n.pts < 0 ? 'neg' : n.pts > 0 ? 'pos' : ''}">${n.basis === 'rule' ? '<i title="~">~</i> ' : ''}${E(n.text)}</li>`;
  function row(e, n) { // the lure drawn in its best colour here, its colours as dots, the best one named; size, best time and price band
    const cs = colsOf(e);
    return `<li class="ab-row lu-row"><details data-lu="${E(e.id)}"><summary><span class="ab-n">${n || ''}</span><span class="ab-art lu-art">${art(e.x, cs[0])}</span>` +
      `<span class="ab-name"><b>${E(L(e.x.name))}</b><small>${E([e.x.size, euro(e.x.price), e.when].filter(Boolean).join(' · '))}</small>` +
      `<span class="lu-sw">${cs.slice(0, 6).map(k => `<i style="${vars(k)}"></i>`).join('')}${e.cfit?.[0]?.pts > 0 ? `<em>${E(L(COL()[cs[0]]))}</em>` : ''}</span></span>${chip(e.score)}</summary><div class="ab-more lu-more"></div></details></li>`;
  }
  const colHtml = (x, f, i, lines = 2) => `<li class="lu-col${i < 2 && f.pts > 0 ? ' best' : ''}">${art(x, f.k, '')}<span class="lu-cn"><b>${E(L(COL()[f.k]))}${i < 2 && f.pts > 0 ? ` <small>${E(tx('lu_best'))}</small>` : ''}</b>` +
    (f.notes?.length ? f.notes.slice(0, lines).map(n => `<span class="lu-cw${n.pts < 0 ? ' neg' : ''}">${n.pts < 0 ? '−' : '+'} ${n.basis === 'rule' ? '<i title="~">~</i> ' : ''}${E(n.text)}</span>`).join('')
      : `<span class="lu-cw neg">${E(tx('lu_noWhy'))}</span>`) + '</span></li>';
  function foldHtml(e) { // a row opened: its three best colours here with the main reason each, why it ranks there, View more
    const fits = (e.cfit || []).slice(0, 3);
    return (fits.length ? `<ul class="lu-cols">${fits.map((c, i) => colHtml(e.x, c, i, 1)).join('')}</ul>` : '') +
      (e.notes.length ? `<ul class="ab-why">${e.notes.slice(0, 3).map(noteLi).join('')}</ul>` : `<p class="hint">${E(tx('lu_notNow'))}</p>`) +
      `<button type="button" class="btn lu-view" data-lu-view="${E(e.id)}">${E(tx('viewMore'))}${icon('chevron-right')}</button>`;
  }
  function moreHtml(e, list) { // the detail sheet's body: what, where, price, how to fish it, every colour and why here, why it ranks there, the fish, sources
    const x = e.x, f = FAM()[x.fam], M = BM(), rd = f.read && M.src[f.read], gf = new Set(x.fish.filter(id => x.parent.some(g => guideOf(id).has(g))));
    const fits = e.cfit || colsOf(e).map(k => ({ k, pts: 0, notes: [] }));
    const meta = [modeT(x.mode), x.depth && tx('lu_depth', x.depth[0], x.depth[1])].filter(Boolean).join(' · '); // the size and price head the sheet
    const fishL = (ids, k) => ids.length ? `<p class="lu-fish"><span class="lbl">${E(tx(k))}</span> ${E(ids.map(fish).join(', '))}</p>` : '';
    const src = [...e.src.map(s => s.url ? `<a href="${E(s.url)}" target="_blank" rel="noopener">${E(s.title)}</a>` : E(s.title)),
      ...(rd ? [`${E(tx('lu_read'))}: <a href="${E(rd.u)}" target="_blank" rel="noopener">${E(rd.t)}</a>`] : [])];
    return `<p class="hint">${E(meta)}</p>` + (x.price ? `<p class="hint"><i class="lu-r">~</i> ${E(tx('lu_price')[x.price])} · ${E(tx('lu_priceNote'))}</p>` : '') +
      `<h5>${E(tx('lu_how'))}</h5><p class="ab-note"><i class="lu-r">~</i> ${E(L(f.how))}</p><p><i class="lu-r">~</i> ${E(L(x.note))}</p>` +
      `<h5>${E(tx('lu_cols'))}</h5>${list?.c ? `<p class="hint lu-env">${E(envLine(x, list))}</p>` : ''}<ul class="lu-cols">${fits.slice(0, 8).map((c, i) => colHtml(x, c, i)).join('')}</ul>` +
      (e.notes.length ? `<h5>${E(tx('lu_why'))}</h5><ul class="ab-why">${e.notes.slice(0, 10).map(noteLi).join('')}</ul>` : `<p class="hint">${E(tx('lu_notNow'))}</p>`) +
      fishL([...gf], 'lu_inGuide') + fishL(x.fish.filter(id => !gf.has(id)), 'lu_usualFor') +
      (src.length ? `<p class="hint ab-src">${E(t('sources'))}: ${src.join(' · ')}</p>` : '');
  }
  function sheetHtml(e, list) { // the whole lure: a big drawing in its best colour here, its name, family, size and price, then moreHtml
    const x = e.x, cs = colsOf(e);
    return `<div class="lu-sh"><header class="lu-sh-head"><span class="lu-sh-art">${art(x, cs[0])}</span><span class="lu-sh-t"><b>${E(L(x.name))}</b>` +
      `<small>${E([L(FAM()[x.fam]), x.size, euro(x.price)].filter(Boolean).join(' · '))}</small></span>${e.score != null ? (typeof ring === 'function' ? ring(e.score) : chip(e.score)) : ''}` +
      `<button type="button" class="icon-btn lu-x" data-lu-close aria-label="${E(tx('lu_close'))}">${icon('close', '') || '×'}</button></header>` +
      `<div class="lu-sh-body">${moreHtml(e, list)}</div></div>`;
  }
  const flt = { all: false, fam: '', budget: 0 }; // the area page's filters kept while the app runs
  const passes = (e, o) => !o.seg || ((!flt.fam || e.x.fam === flt.fam) && (!flt.budget || e.x.price <= flt.budget));
  function catHtml(o) { // the whole catalogue (as filtered), a fold per family, best first inside it for the fish, method and hour on show
    const list = rank(o.areaId, o), by = new Map(list.map(e => [e.id, e]));
    return LD().fams.map(f => {
      const ls = LD().lures.filter(x => x.fam === f.id).map(x => by.get(x.id) || blank(x, list)).filter(e => passes(e, o)).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      return ls.length ? `<details class="lu-fam"${o.seg && flt.fam ? ' open' : ''}><summary><span class="ab-art lu-art">${art(ls[0].x, colsOf(ls[0])[0])}</span><b>${E(L(f))}</b><small>${ls.length}</small>${icon('chevron-down')}</summary>` +
        `<p class="ab-note"><i class="lu-r">~</i> ${E(L(f.how))}</p><ol class="ab-list">${ls.map(e => row(e, 0)).join('')}</ol></details>` : '';
    }).join('');
  }
  function filterBar(sp, fish0, mode) { // native selects (the phone's own picker) and the shore / boat switch
    const opt = (v, l, on) => `<option value="${E(v)}"${on ? ' selected' : ''}>${E(l)}</option>`;
    const sel = (k, lab, body) => `<label class="lu-sel"><span>${E(tx(lab))}</span><select data-lu-f="${k}">${body}</select></label>`;
    const others = [...new Set(LD().lures.flatMap(x => x.fish))].filter(id => id !== fish0).sort((a, b) => fish(a).localeCompare(fish(b), lang()));
    return `<div class="lu-flt">` + sel('sp', 'lu_fFish', (fish0 !== 'all' ? opt(fish0, fish(fish0), sp === fish0) : '') + opt('all', tx('lu_allFish'), sp === 'all') + others.map(id => opt(id, fish(id), sp === id)).join('')) +
      `<div class="seg lu-seg" role="group">${['shore', 'boat'].map(m => `<button type="button" data-lu-mode="${m}" aria-pressed="${m === mode}"><span>${E(t(m))}</span></button>`).join('')}</div>` +
      sel('fam', 'lu_fType', opt('', tx('lu_allTypes'), !flt.fam) + LD().fams.map(f => opt(f.id, L(f), flt.fam === f.id)).join('')) +
      sel('budget', 'lu_fBudget', ['lu_anyPrice', 'lu_b1', 'lu_b2'].map((k, b) => opt(b, tx(k), flt.budget === b)).join('')) + `</div>`;
  }
  function html(areaId, o = {}) {
    if (!ready()) return '';
    const c = R.ctx(areaId, o); if (c.mode === 'spear') return '';
    const fish0 = o.fish || o.sp || (typeof state === 'object' && state.sp) || 'all', sp = o.seg && flt.all ? 'all' : o.sp || fish0;
    const oo = { ...o, sp, fish: fish0, mode: c.mode }, list = rank(areaId, oo).filter(e => passes(e, oo)), n = Math.max(1, o.top || 5), top = [], rest = [], per = {};
    for (const e of list) { const f = e.x.fam; if (top.length < n && (per[f] || 0) < 2) { top.push(e); per[f] = (per[f] || 0) + 1; } else rest.push(e); } // two a family at most in the top: one jig in four sizes is not four choices
    while (top.length < n && rest.length) top.push(rest.shift()); // unless the fish takes few families (squid: egi), or one type is chosen
    top.sort((a, b) => b.score - a.score || a.ord - b.ord);
    const more = rest.slice(0, o.compact ? 5 : 10), nCat = LD().lures.filter(x => passes({ x }, oo)).length;
    if (o.compact && !top.length) return ''; // a fish's page: nothing to say for a fish no lure is used for
    const keep = { areaId, sp, fish: fish0, mode: c.mode, cell: o.cell, month: o.month, hour: o.hour, cond: o.cond, seg: o.seg, compact: o.compact, top: o.top };
    const ctxL = [o.compact && areaId && name(areaId), sp === 'all' ? `${tx('lu_biting')}: ${R.fishNow(areaId, c).map(fish).join(', ')}` : fish(sp), t(c.mode), tx('lu_per')[c.period],
      t('months')[c.month - 1]].filter(Boolean).join(' · ');
    return `<div class="lu${o.compact ? ' lu-compact' : ''}" data-lu-root data-lu-o="${E(JSON.stringify(keep))}">${o.seg ? filterBar(sp, fish0, c.mode) : ''}` +
      `<div class="lu-head"><b>${E(tx('lu_top'))}</b><small>${E(ctxL)}</small></div>` +
      (top.length ? `<ol class="ab-list">${top.map((e, i) => row(e, i + 1)).join('')}</ol>` : `<p class="empty lu-none">${E(tx(o.seg && (flt.fam || flt.budget) ? 'lu_noMatch' : 'lu_none'))}</p>`) + // round 14: the app's empty box
      (more.length ? `<details class="ab-rest"><summary>${E(tx('lu_more', more.length))}</summary><ol class="ab-list" start="${n + 1}">${more.map((e, i) => row(e, n + i + 1)).join('')}</ol></details>` : '') +
      (o.compact || !nCat ? '' : `<details class="lu-cat"><summary>${E(tx('lu_cat', nCat))}${icon('chevron-down')}</summary><div class="lu-catbody"></div></details>`) +
      `<p class="hint ab-foot">${E(tx('lu_foot'))}</p></div>`;
  }
  const optsOf = root => { try { return JSON.parse(root.dataset.luO); } catch { return null; } };
  function redraw(root, o) { // the section again with new choices; rows that were open stay open
    const open = [...root.querySelectorAll(':scope > .ab-list details[open][data-lu]')].map(d => d.dataset.lu), box = D2.createElement('div');
    box.innerHTML = html(o.areaId, o); const n = box.firstElementChild; if (!n) return;
    root.replaceWith(n); for (const k of open) n.querySelector(`details[data-lu="${k}"]`)?.setAttribute('open', '');
  }
  let dlg = null, guard = false, eat = false;
  function openSheet(e, list) {
    if (!dlg) {
      dlg = D2.createElement('dialog'); dlg.className = 'lu-sheet'; D2.body.append(dlg);
      dlg.addEventListener('click', ev => { if (ev.target === dlg || ev.target.closest('[data-lu-close]')) closeSheet(); }); // the dialog itself is only hit outside its sheet
      dlg.addEventListener('cancel', ev => { ev.preventDefault(); closeSheet(); });
      window.PsLureKey = ev => { if (ev.key === 'Escape' && dlg.open) { ev.stopImmediatePropagation(); ev.preventDefault(); closeSheet(); } };
      window.PsLureBack = ev => { // Back closes the sheet only, and our own step back is no Back (js/area-gear.js hears popstate before js/mobile.js)
        if (eat) { eat = false; ev.stopImmediatePropagation(); return; }
        if (guard && !history.state?.psLure) { guard = false; ev.stopImmediatePropagation(); dlg.close(); }
      };
    }
    dlg.innerHTML = sheetHtml(e, list);
    if (!dlg.open) { dlg.showModal(); try { history.pushState({ psLure: 1 }, ''); guard = true; } catch {} }
    dlg.querySelector('.lu-sh-body').scrollTop = 0;
  }
  function closeSheet() { if (dlg?.open) dlg.close(); if (guard) { guard = false; if (history.state?.psLure) { eat = true; history.back(); } } }
  const entryOf = (o, id) => { const x = LD().lures.find(y => y.id === id), list = rank(o.areaId, o); return x && [list.find(e => e.id === id) || blank(x, list), list]; };
  if (D2) {
    D2.addEventListener('toggle', ev => { // 'toggle' does not bubble: caught on the way down
      const d = ev.target; if (!d.open || !d.closest) return;
      const root = d.closest('[data-lu-root]'), o = root && optsOf(root); if (!o) return;
      if (d.dataset.lu) { const m = d.querySelector(':scope > .lu-more'), en = m && !m.firstChild && entryOf(o, d.dataset.lu); if (en) m.innerHTML = foldHtml(en[0]); }
      else if (d.classList.contains('lu-cat')) { const b = d.querySelector('.lu-catbody'); if (b && !b.firstChild) b.innerHTML = catHtml(o); }
    }, true);
    D2.addEventListener('click', ev => {
      const b = ev.target.closest?.('[data-lu-mode], [data-lu-view]'), root = b?.closest('[data-lu-root]'), o = root && optsOf(root); if (!o) return;
      if (b.dataset.luView) { const en = entryOf(o, b.dataset.luView); if (en) openSheet(...en); }
      else if (b.dataset.luMode !== o.mode) redraw(root, { ...o, mode: b.dataset.luMode });
    });
    D2.addEventListener('change', ev => {
      const s = ev.target.closest?.('select[data-lu-f]'), root = s?.closest('[data-lu-root]'), o = root && optsOf(root); if (!o) return;
      const k = s.dataset.luF, v = s.value;
      if (k === 'sp') { flt.all = v === 'all'; redraw(root, { ...o, sp: v }); }
      else { flt[k] = k === 'budget' ? +v : v; redraw(root, o); }
    });
  }
  // sheetHtml for the self-check (node): the sheet of one lure for an area and options
  return { ready, rank, html, flt, sheetHtml: (areaId, o, id) => { const en = entryOf({ ...o, areaId }, id); return en ? sheetHtml(...en) : ''; } };
};
