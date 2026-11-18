'use strict';
// Psarema: Plan a trip, and the daily brief. window.PsPlanner = { open(), brief(force), briefData() }.
// A trip is a day, a time window, an area of data/areas.js with its best spot, and a target fish, ranked by the app's own "go" score:
// √(fish chance × conditions), as js/conditions.js, whose safety rules (PsCond.rate) leave every unsafe hour out. Nothing here scores:
// fish chances come from model.js (prepare, scoreCells, explain), conditions from PsCond.rate, baits and lures from ui.js.
// The search is exact over its cells (every 250 m along the shore, 500 m for divers, 1 km by boat; then the spot refined at 250 m):
//   - a fish is scored at a cell and hour only if model.js's bound (P.ub) times the best conditions possible there that hour could still
//     beat the area's best so far; cells come best where-fit first, so the first that cannot ends the area for that fish;
//   - conditions are rated only where such a score needs them, kept for the other fish (they do not depend on the fish), and skipped
//     where even the coast's most shelter leaves the wind, gusts or waves past PsCond's own "not safe" limits;
//   - a fish that cannot beat the list's last trip is not scored at all, and the likeliest fish go first so that bar rises early.
// Runs in 12 ms slices (a phone just does less per slice); each answer is kept per input until the forecast changes.
Object.assign(I18N.en, { pl_noneT: 'No trips found', pl_opts: 'Fish, distance and sea', pl_noReach: 'The forecast does not reach those days yet.' });
Object.assign(I18N.el, { pl_noneT: 'Δεν βρέθηκαν έξοδοι', pl_opts: 'Ψάρι, απόσταση και θάλασσα', pl_noReach: 'Η πρόγνωση δεν φτάνει ακόμα σε αυτές τις μέρες.' });
window.PsPlanner = (() => {
  const AREAS = window.PSAREMA_AREAS || [], nA = AREAS.length, ALSO = .85, SLICE = 12, PREFS_KEY = 'psarema-plan-v1', BRIEF_KEY = 'psarema-brief-v1';
  const STEP = { shore: 1, spear: 2, boat: 4 }, METHODS = ['boat', 'shore', 'spear'], WINS = ['today', 'tomorrow', 'weekend', 'week', 'days'], DISTS = [0, 10, 25, 50, 100];
  const reach = (i, m) => m === 'shore' ? dist[i] <= .5 : m === 'spear' ? depth[i] < 30 && dist[i] < 2 : launchKm[i] < 35; // where model.js modeFit is above 0
  const BFT = [1.1, 5.8, 12.2, 19.8, 28.8, 38.9, 50, 61.9, 74.9, 88.2, 102.6, 117.7], bft = w => { let b = 0; while (b < 12 && w >= BFT[b]) b++; return b; }; // as conditions.js
  const load = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  /* ---------- Cells: each area's sea within reach of the method, on the method's grid (nearest area centre, as conditions.js) ---------- */
  const members = {};
  function areaCells(mode) {
    if (members[mode]) return members[mode];
    const st = STEP[mode], C = AREAS.map(a => ({ x: (a.lon - WEST) / RES - .5, y: (NORTH - a.lat) / RES - .5, kx: RES * 111.32 * Math.cos(a.lat * Math.PI / 180), r2: a.r * a.r }));
    return members[mode] = AREAS.map((a, k) => {
      const c = C[k], rx = Math.ceil(a.r / c.kx), ry = Math.ceil(a.r / KY), out = [];
      for (let y = Math.max(0, Math.ceil((c.y - ry) / st) * st); y <= Math.min(H - 1, c.y + ry); y += st)
        for (let x = Math.max(0, Math.ceil((c.x - rx) / st) * st); x <= Math.min(W - 1, c.x + rx); x += st) {
          const i = y * W + x; if (!depth[i] || northMask[i] || !reach(i, mode)) continue;
          const d2 = ((x - c.x) * c.kx) ** 2 + ((y - c.y) * KY) ** 2; if (d2 > c.r2) continue;
          if (!C.some((o, j) => { if (j === k) return false; const e = ((x - o.x) * o.kx) ** 2 + ((y - o.y) * KY) ** 2; return e < d2 && e < o.r2; })) out.push(i);
        }
      return out;
    });
  }
  // How far you travel: to the spot from the shore, to the harbour or slipway the boat leaves from (straight line, km).
  const travel = (i, mode) => { if (!state.loc) return null; const L = mode === 'boat' ? LAUNCH[launchOf[i]] : null; return km(state.loc, L ? [L[2], L[3]] : [latOf(i), lonOf(i)]).d; };

  /* ---------- Days ---------- */
  const WD = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' }), weekend = h => /Sat|Sun/.test(WD.format(hours[h].t));
  // the forecast's days from now on; a last day it stops before the evening is left out (as the Forecast tab and the calendar do: a
  // "trip" in the few night hours it has would be no answer)
  const fcDays = () => { const d = tlDays(state.first), l = d.at(-1); if (d.length > 1 && l[1] >= F.T && hours[l[1] - 1].local < 20) d.pop(); return d; };
  function pickDays(q) { // [from, to) hours of each chosen day, from now on
    const days = fcDays();
    if (q.win === 'today') return days.slice(0, 1);
    if (q.win === 'tomorrow') return days.slice(1, 2);
    if (q.win === 'weekend') { const k = days.findIndex(d => weekend(d[0])); return k < 0 ? [] : days.slice(k, k + 2).filter(d => weekend(d[0])); }
    if (q.win === 'days') return days.filter((_, k) => q.days.includes(k));
    return days;
  }
  function dayLabel(h) { const days = tlDays(state.first), k = days.findIndex(([a, b]) => h >= a && h < b);
    return k === 0 ? tr('cToday') : k === 1 ? tr('cTomorrow') : fmtT(hours[h].t, { weekday: 'short', day: 'numeric', month: 'short' }); }

  /* ---------- Conditions: conditions.js's readings at a cell, then its rules ---------- */
  function inputs(i, h, ex) { // the same as conditions.js inputs() (not exported there)
    const k = h * NN, b = a => bil(a, k, i), nw = nearW[i], ox = onx[i], oy = ony[i];
    const wave = b(F.wave), expo = wave > .01 ? clamp(-(b(F.wx) * ox + b(F.wy) * oy) / wave) : 1, cutV = 1 - nw * .8 * (1 - expo);
    const u = b(F.u), v = b(F.v), ws = Math.hypot(u, v) || .01, cutW = 1 - nw * .5 * (1 - clamp(-(u * ox + v * oy) / ws));
    const sst = sat.sst?.[i];
    return { ...ex, x: hours[h], ws0: ws, wave0: wave, cutW, cutV, ws: ws * cutW, gust: b(F.gust) * cutW, wave: wave * cutV, swell: b(F.swell) * cutV,
      period: b(F.period), cur: b(F.cur), sst: sst >= 0 ? sst : b(F.sst) };
  }
  const calmOk = o => o.wave <= .5 && o.ws < BFT[3] && o.gust < 30; // calm water only: Douglas 2 "smooth", up to Bft 3, gusts under 30 km/h
  function condAt(i, h, ex, q) { const o = inputs(i, h, ex), c = !q.calm || calmOk(o) ? PsCond.rate(o, q.mode) : null; return { s: c && !c.unsafe ? c.s : 0, o, c }; }
  // PsCond.rate's own "not safe" limits for a method (wind, gusts, waves), read from it once: the smallest value it calls unsafe on a calm,
  // bright day (a bisection, ~90 calls). Read rather than copied, so they follow conditions.js if its rules change.
  const LIMS = {};
  function limits(mode) {
    if (LIMS[mode]) return LIMS[mode];
    const x = hours[state.first], calm = { x: { ...x, t: (x.rise + x.set) / 2 - 18e5 }, ws: 0, ws0: 0, gust: 0, wave: 0, wave0: 0, swell: 0, period: 0, cur: 0, sst: 30, cutW: 1, cutV: 1 };
    const lim = k => { let lo = 0, hi = 300; for (let n = 0; n < 30; n++) { const m = (lo + hi) / 2; if (PsCond.rate({ ...calm, [k]: m }, mode).unsafe) hi = m; else lo = m; } return hi; };
    return LIMS[mode] = { ws: lim('ws'), gust: lim('gust'), wave: lim('wave') };
  }
  const hasWx = () => isFinite(window.PsWeather?.at?.(CENTER[0], CENTER[1], state.first)?.temp);
  function extras(a, h0, h1) { // rain, fog, thunder, air temperature, UV at the area centre (weather.js data come on a ~40 km grid), as conditions.js
    const out = [];
    if (hasWx()) for (let h = h0; h < h1; h++) { const o = PsWeather.at(a.lat, a.lon, h); if (o) out[h] = { temp: o.temp, rain: o.rain, vis: o.vis, uv: o.uv, code: o.code }; }
    return out;
  }
  function win(G, lo, hi) { // conditions.js win(): the best hour (the first of equals) and the hours either side within 90% of it, up to 3 h each way
    let t = lo; for (let h = lo; h < hi; h++) if (G[h].g > G[t].g) t = h;
    if (!(G[t].g > 0)) return null;
    let a = t, b = t; const k = .9 * G[t].g;
    while (a > lo && t - a < 3 && G[a - 1].g >= k) a--;
    while (b < hi - 1 && b - t < 3 && G[b + 1].g >= k) b++;
    return { h: t, a, b };
  }
  // ui.js and model.js read the fish, method and hour from globals: borrow them for one synchronous call, then put them back.
  function as(s, mode, h, P, fn) {
    const s0 = sp, c0 = cur, m0 = state.mode, h0 = state.h;
    sp = s; cur = P; state.mode = mode; state.h = h;
    try { return fn(); } finally { sp = s0; cur = c0; state.mode = m0; state.h = h0; }
  }
  function whyOf(rows, x, c) { // the top reasons: where and what draws the fish (ui.js reasons), its timing, then the main drawback
    const v = k => rows.find(r => r[0] === k)?.[2] ?? 0, out = [];
    let minus = null;
    for (const [k, r] of reasons(rows)) if (k === 'plus') out.push({ sign: 'plus', key: 'wp', id: r[0] }); else minus = { sign: 'minus', key: 'wm', id: r[0] };
    const timing = [v('f_time') >= .8 && { sign: 'plus', key: 'pl_bite', a: [x.period] }, v('f_season') >= .85 && { sign: 'plus', key: 'pl_season' }, // round 16 P: no solunar or pressure reason (out of the score since OTA 2026.11.15-5)
      v('f_temp') >= .9 && { sign: 'plus', key: 'pl_temp' }].filter(Boolean);
    out.push(...timing.slice(0, 4 - out.length - 1));
    const cm = c?.why.find(r => r.sign === 'minus' || r.sign === 'no');
    if (cm && (!minus || c.s < 70)) minus = { sign: 'minus', key: cm.key, a: cm.a };
    if (minus) out.push(minus);
    return out;
  }

  /* ---------- The search ---------- */
  // Runs a generator in slices; resolves with { v: its value, busy (ms of work), wall (ms) }. p.cancel() stops it.
  function job(gen) {
    let stop = false, busy = 0; const t0 = performance.now();
    const p = new Promise((ok, fail) => {
      const step = () => {
        if (stop) return;
        const s = performance.now(), until = s + SLICE; let r;
        try { do r = gen.next(); while (!r.done && performance.now() < until); } catch (e) { fail(e); return; }
        busy += performance.now() - s;
        if (r.done) ok({ v: r.value, busy, wall: performance.now() - t0 }); else setTimeout(step, 0);
      };
      setTimeout(step, 0);
    });
    p.cancel = () => { stop = true; };
    return p;
  }
  // q: { win, days, mode, fish ('any' or an id), dist (km, 0 = any), calm, K }; st: progress and counts, read while it runs.
  function* search(q, st) {
    const days = pickDays(q); if (!days.length) return { trips: [], why: q.win === 'days' ? 'pl_noDays' : 'pl_noReach' }; // you picked none, or the forecast ends before them
    const h0 = days[0][0], h1 = days.at(-1)[1], nS = h1 - h0, inWin = new Uint8Array(nS);
    for (const [a, b] of days) inWin.fill(1, a - h0, b - h0);
    const mem = areaCells(q.mode); yield;
    const cells = [], slotA = [], slot = new Map();
    mem.forEach((list, a) => { for (const i of list) if (!q.dist || !state.loc || travel(i, q.mode) <= q.dist) { slot.set(i, cells.length); cells.push(i); slotA.push(a); } });
    if (!cells.length) return { trips: [], why: 'pl_far' };
    const CELLS = Int32Array.from(cells), ex = [], condS = new Float32Array(cells.length * nS).fill(NaN);
    for (const a of AREAS) { ex.push(extras(a, h0, h1)); yield; }
    const lim = limits(q.mode);
    const cond = (k, h) => {
      const j = k * nS + h - h0; let s = condS[j];
      if (s === s) return s;
      // The least wind, gusts and waves the coast's shelter can leave here (conditions.js cuts them by at most ½, ½ and 0.8 × nearW):
      // already at the "not safe" limit (or past calm water), and the full rating is not needed.
      const i = cells[k], b = h * NN, nw = nearW[i], cw = 1 - .5 * nw, ws = Math.hypot(bil(F.u, b, i), bil(F.v, b, i)) * cw, gust = bil(F.gust, b, i) * cw, wave = bil(F.wave, b, i) * (1 - .8 * nw);
      if (ws >= lim.ws || gust >= lim.gust || wave >= lim.wave || q.calm && !calmOk({ ws, gust, wave })) s = 0;
      else { s = condAt(i, h, ex[slotA[k]][h], q).s; st.rated++; }
      return condS[j] = s;
    };
    const month = hours[h0].month, mine = q.mode === state.mode;
    const fish = (q.fish === 'any' ? SPECIES.filter(s => s.methods.includes(q.mode)) : [byId(q.fish)]).filter(s => s && !s.banned)
      .map(s => [s, mine && rank[s.id] ? rank[s.id].s : 100 * s.season[month]]).sort((a, b) => b[1] - a[1]).map(x => x[0]); // likeliest first: the bar rises sooner
    if (!fish.length) return { trips: [], why: 'pl_noFish' };
    Object.assign(st, { fish: fish.length, cells: cells.length, done: 0 });
    // The best conditions any cell of an area can have that hour: its rain, fog, heat, UV and darkness (the same for the whole area) over a
    // flat calm sea, every sea factor of PsCond.rate at 1. 0 = safe nowhere there (thunder): that hour is skipped outright.
    const cUB = new Float32Array(nA * nS);
    for (let a = 0; a < nA; a++) for (let h = h0; h < h1; h++) if (inWin[h - h0]) {
      const c = PsCond.rate({ ...ex[a][h], x: hours[h], ws: 0, ws0: 0, gust: 0, wave: 0, wave0: 0, swell: 0, period: 0, cur: 0, sst: 30, cutW: 1, cutV: 1 }, q.mode);
      cUB[a * nS + h - h0] = c.unsafe ? 0 : c.s;
    }
    // Per area and hour, the best go of any fish and cell so far (G), with its cell and fish. q.perFish (the brief): each fish its own G,
    // and one trip per fish (its best area, day and hour), so the list names different fish.
    const G0 = new Float32Array(nA * nS), Gi0 = new Int32Array(nA * nS), Gs = new Int16Array(nA * nS), bound = new Float32Array(fish.length), perFish = [];
    const acc = new Float64Array(F.T), floor = new Float64Array(F.T), one = new Int32Array(1);
    let kth = 0, buf = newBuf();
    for (let fi = 0; fi < fish.length; fi++) {
      const s = fish[fi]; st.done++;
      const P = prepare(s, q.mode, CELLS, buf); yield;
      if (!P.ns) continue;
      let sm = 0; for (let h = h0; h < h1; h++) if (inWin[h - h0]) sm = Math.max(sm, P.season[h] * (P.ub ? P.ub[h] : Infinity));
      bound[fi] = Math.sqrt(Math.min(100, 100 * P.where[P.sidx[0]] * sm) * 100); // the best go this fish could have anywhere then
      if (bound[fi] <= kth) { st.skipped++; continue; } // cannot reach the list
      const G = q.perFish ? new Float32Array(nA * nS) : G0, Gi = q.perFish ? new Int32Array(nA * nS) : Gi0, bk = AREAS.map(() => []);
      for (let j = 0; j < P.ns; j++) bk[slotA[slot.get(P.sidx[j])]].push(P.sidx[j]); // each area's cells, best where-fit first
      for (let a = 0; a < nA; a++) {
        const o = a * nS - h0;
        for (const i of bk[a]) {
          const w = 100 * P.where[i]; let live = false;
          for (let h = h0; h < h1; h++) { // the fish score that, with the best conditions possible there, would beat the area's best
            const u = inWin[h - h0] ? cUB[o + h] : 0;
            floor[h] = u ? G[o + h] * G[o + h] / u : Infinity;
            if (u && (!P.ub || w * P.season[h] * P.ub[h] > floor[h])) live = true;
          }
          if (!live) break; // the cells after this one fit worse: none of them can do better either
          for (let h = h0; h < h1; h++) acc[h] = floor[h];
          one[0] = i; scoreCells(P, h0, h1, one, 0, 1, 2, acc); st.scored++; // acc[h] rises above floor[h] only where the score does
          const k = slot.get(i);
          for (let h = h0; h < h1; h++) {
            if (!(acc[h] > floor[h])) continue;
            const c = cond(k, h); if (!c) continue;
            const g = Math.sqrt(acc[h] * c), j = o + h;
            if (g > G[j]) { G[j] = g; Gi[j] = i; Gs[j] = fi; }
          }
          yield;
        }
      }
      let peaks = []; // the best of each area and day so far (per fish: each fish's best): the K-th is the bar
      if (q.perFish) {
        let b = -1; for (let j = 0; j < nA * nS; j++) if (G[j] > (b < 0 ? 0 : G[b])) b = j;
        if (b >= 0) { const h = b % nS + h0, d = days.find(([d0, d1]) => h >= d0 && h < d1); perFish.push({ a: b / nS | 0, d0: d[0], d1: d[1], h, g: G[b], s, i0: Gi[b] }); }
        peaks = perFish.map(t => t.g);
      } else for (let a = 0; a < nA; a++) for (const [d0, d1] of days) { let m = 0; for (let h = d0; h < d1; h++) m = Math.max(m, G[a * nS + h - h0]); if (m) peaks.push(m); }
      peaks.sort((x, y) => y - x); kth = peaks[q.K - 1] || 0;
    }
    // One trip per area and day: its best fish and hour (per fish: each fish's own best).
    let trips = perFish;
    if (!q.perFish) for (let a = 0; a < nA; a++) for (const [d0, d1] of days) {
      let b = -1;
      for (let h = d0; h < d1; h++) { const j = a * nS + h - h0; if (G0[j] > (b < 0 ? 0 : G0[b])) b = j; }
      if (b >= 0) trips.push({ a, d0, d1, h: b - a * nS + h0, g: G0[b], s: fish[Gs[b]], i0: Gi0[b] });
    }
    trips = trips.sort((x, y) => y.g - x.g).slice(0, q.K);
    // Each trip's spot, refined on the 250 m cells around it at its hour; then its window and details at that spot.
    const out = [];
    for (const t of trips) {
      const s = t.s, i0 = t.i0, R = STEP[q.mode] >> 1 || 1, x0 = i0 % W, y0 = i0 / W | 0, nb = [], e = ex[t.a];
      for (let y = Math.max(0, y0 - R); y <= Math.min(H - 1, y0 + R); y++) for (let x = Math.max(0, x0 - R); x <= Math.min(W - 1, x0 + R); x++) {
        const i = y * W + x; if (depth[i] && !northMask[i] && reach(i, q.mode) && (!q.dist || !state.loc || travel(i, q.mode) <= q.dist)) nb.push(i);
      }
      const P = prepare(s, q.mode, Int32Array.from(nb), buf);
      let bi_ = i0, bg = 0;
      for (const i of nb) { const f = scoreAt(i, t.h, null, P); if (!f) continue; const g = Math.sqrt(f * condAt(i, t.h, e[t.h], q).s); if (g > bg) { bg = g; bi_ = i; } }
      const i = bi_, D = [];
      acc.fill(0); one[0] = i; scoreCells(P, t.d0, t.d1, one, 0, 1, 1, acc);
      for (let h = t.d0; h < t.d1; h++) { const c = acc[h] > 0 ? condAt(i, h, e[h], q).s : 0; D[h] = { g: Math.sqrt(acc[h] * c), f: acc[h], c }; }
      const w = win(D, t.d0, t.d1) || { h: t.h, a: t.h, b: t.h }, hp = w.h, cd = condAt(i, hp, e[hp], q), k = hp * NN, L = q.mode === 'boat' ? LAUNCH[launchOf[i]] : null;
      const trip = { a: t.a, i, h: hp, wa: w.a, wb: w.b, mode: q.mode, fish: s.id, g: Math.round(D[hp].g), f: Math.round(D[hp].f), c: D[hp].c, also: [],
        dir: (Math.atan2(-bil(F.u, k, i), -bil(F.v, k, i)) * 180 / Math.PI + 360) % 360, ws: cd.o.ws, gust: cd.o.gust, wave: cd.o.wave,
        d: travel(i, q.mode), launch: L && { name: L[0], type: L[1], km: launchKm[i] } };
      if (!q.lite) { // the brief shows neither, so it skips them
        trip.why = whyOf(as(s, q.mode, hp, P, () => explain(i, hp).rows), hours[hp], cd.c);
        trip.gear = q.mode === 'spear' ? { gun: GEAR[s.id]?.setups?.spear?.gun || [] } : as(s, q.mode, hp, P, () => ({ baits: spotBaits(i), lures: spotLures(i)?.lures || [] }));
      }
      out.push(Object.defineProperty(trip, 'C', { value: D.map(x => x.c) })); // the spot's conditions by hour, for the step below (not enumerable: not kept in copies)
      yield;
    }
    // Also biting: other fish at the same spot and hours (so the same sea) within 85% of the trip's score. Only fish whose best possible
    // score then can reach that are scored, on all the trips' spots at once.
    if (!q.lite && out.length) {
      const spots = Int32Array.from(out.map(t => t.i)), minG = Math.min(...out.map(t => t.g));
      for (let fi = 0; fi < fish.length; fi++) {
        if (!(bound[fi] >= ALSO * minG)) continue;
        const s = fish[fi], P = prepare(s, q.mode, spots, buf);
        for (const t of out) {
          if (s.id === t.fish || !P.where[t.i] || bound[fi] < ALSO * t.g) continue;
          acc.fill(0); one[0] = t.i; scoreCells(P, t.wa, t.wb + 1, one, 0, 1, 1, acc);
          let g = 0, f = 0; for (let h = t.wa; h <= t.wb; h++) { const x = Math.sqrt(acc[h] * t.C[h]); if (x > g) { g = x; f = acc[h]; } }
          if (g >= ALSO * t.g) t.also.push({ id: s.id, f: Math.round(f), g });
        }
        yield;
      }
      for (const t of out) t.also = t.also.sort((p, r) => r.g - p.g).slice(0, 3).map(({ id, f }) => ({ id, f }));
    }
    buf = null;
    return { trips: out.sort((p, r) => r.g - p.g) };
  }
  // Answers kept per input (language-free: drawn in the language of the moment); a new forecast, location or weather data is a new input.
  const cache = new Map();
  const keyOf = q => JSON.stringify([q.win, q.win === 'days' ? q.days : 0, q.mode, q.fish, q.dist && state.loc ? [q.dist, state.loc] : 0, q.calm, q.K, !!q.lite, !!q.perFish, F.at, state.first, sat.sstDate, hasWx()]);
  function run(q, st) {
    const key = keyOf(q);
    if (cache.has(key)) return Object.assign(Promise.resolve(cache.get(key)), { cancel() {} });
    const p = job(search(q, st));
    const r = p.then(x => { const v = { ...x.v, busy: x.busy, wall: x.wall, st: { ...st } }; cache.set(key, v); if (cache.size > 12) cache.delete(cache.keys().next().value); api.last = v; return v; });
    r.cancel = p.cancel; return r;
  }
  const newSt = () => ({ fish: 0, cells: 0, done: 0, scored: 0, rated: 0, skipped: 0 });

  /* ---------- Drawing ---------- */
  const cls = s => 'c-' + (s >= 60 ? 'good' : s >= 40 ? 'fair' : 'poor'), rateOf = s => s >= 80 ? 'great' : s >= 60 ? 'good' : s >= 40 ? 'fair' : 'poor';
  const span = t => `${hm(hours[t.wa].t)}–${hm(hours[t.wb].t + 36e5)}`;
  const num = x => typeof x === 'number' && !Number.isInteger(x) ? nf(x, 1) : x;
  const said = r => r.key === 'wp' ? tr('whyPlus')[r.id] : r.key === 'wm' ? tr('whyMinus')[r.id] ?? tr(r.id) : r.key === 'pl_bite' ? tr('pl_bite')[r.a[0]] : tr(r.key, ...(r.a || []).map(num));
  const li = r => `<li><span class="${r.sign === 'plus' ? 'plus' : 'minus'}">${r.sign === 'plus' ? '+' : '−'}</span><span>${esc(said(r))}</span></li>`;
  const gearChip = (id, colors = []) => `<span>${ART[id] ? `<i class="art">${ART[id]}</i>` : ''}${esc(gearName(id))}` +
    colors.slice(0, 2).map(c => `<i class="dot" style="background:${COLORS[c]?.hex || '#888'}" title="${esc(L10(COLORS[c]?.name) || c)}"></i>`).join('') + `</span>`;
  const gearRow = (title, chips) => chips.length ? `<div class="sc-baits"><b>${esc(title)}</b><span>${chips.join('')}</span></div>` : '';
  const gearHtml = g => g.gun ? gearRow(tr('pl_gun'), g.gun.map(id => gearChip(id)))
    : gearRow(tr('pl_baits'), g.baits.slice(0, 3).map(b => gearChip(b.id))) + gearRow(tr('pl_lures'), g.lures.slice(0, 3).map(l => gearChip(l.id, l.colors)));
  const where = t => `${esc(L10(AREAS[t.a]))} · ${esc(describe(latOf(t.i), lonOf(t.i)))}`;
  // A trip as one list row (css/catchlog.css .pn-line), in the planner and the brief alike: the trip score as a dial (large on the planner's
  // cards), when, the fish, where, the fish's cut-out
  const line = (t, n, day) => `<button class="pn-line pl-line" data-trip="${n}">${ring(t.g, day ? 'lg' : '')}` +
    `<span class="pn-main"><span class="lbl">${day ? esc(dayLabel(t.h)) + ' · ' : ''}${span(t)}</span><b>${esc(fishName(byId(t.fish)))}</b>` +
    `<small>${where(t)}${t.d != null ? ' · ' + esc(tr('pl_away', fmtKm(t.d))) : ''}</small></span><span class="pl-cut">${PsPanel.fish(byId(t.fish))}</span></button>`;
  function tripHtml(t, n) {
    const s = byId(t.fish), b = bft(t.ws);
    const meta = [`${depthM(t.i)} m${habPart(t.i)}`, t.launch && tr('pl_from', t.launch.name || tr('spot')[t.launch.type].toLowerCase(), fmtKm(t.launch.km))].filter(Boolean);
    const ib = (k, icon, label) => `<button class="btn ib" ${k}="${n}" aria-label="${esc(label)}" title="${esc(label)}">${ic(icon, 'sm')}</button>`; // a compact action: icon, words in the tooltip
    return `<li class="pn-item pl-trip${n ? '' : ' best'}">${line(t, n, true)}` +
      `<div class="pn-body"><p class="pl-fish">${ic('fish', 'sm')}<b>${esc(fishName(s))}</b>${pill(t.f)}` +
      (t.also.length ? `<small>${esc(tr('pl_also'))}: ${t.also.map(x => `${esc(fishName(byId(x.id)))} ${x.f}`).join(', ')}</small>` : '') + `</p>` +
      `<p class="pl-safe"><span class="pill cpill ${cls(t.c)}" title="${esc(tr('cTitle'))}">${t.c}</span><span><b>${esc(tr('cVerdict', rateOf(t.c), tr('cMode')[t.mode]))}</b> · ` +
      `${esc(tr('pl_read', compass(t.dir), Math.round(t.ws), b, Math.round(t.gust), nf(t.wave)))}</span></p>` +
      (t.why?.length ? `<ul class="reasons">${t.why.map(li).join('')}</ul>` : '') + (t.gear ? gearHtml(t.gear) : '') +
      `<div class="pl-foot"><span class="hint">${esc(meta.join(' · '))}</span><span class="pn-acts">` +
      (window.PsOffline?.share ? ib('data-share', 'share', tr('pl_share')) : '') + // js/offline.js, when there
      (window.PsNative?.canNotify ? ib('data-remind', 'clock', tr('pl_remind')) : '') + // the app only (js/native.js)
      `<button class="btn primary" data-trip="${n}">${ic('map', 'sm')}${esc(tr('pl_show'))}</button></span></div></div></li>`;
  }
  // a trip's spot: its card on the map (View more there opens the details), for the trip's fish, method and hour
  function openTrip(t) { if (t) { dropBrief(); PsPanel.openSpot(t.i, { fish: t.fish, mode: t.mode, h: t.h }); } }

  /* ---------- The planner ---------- */
  const q = { win: 'week', fish: 'any', dist: 0, calm: false, ...load(PREFS_KEY), days: [0], mode: state.mode, K: 8 };
  let shown = null, pending = null, st = newSt(), tick = 0;
  const root = () => PsPanel.root('pl');
  PsPanel.onClose('pl', () => { pending?.cancel(); pending = null; clearInterval(tick); }); // closed: no search goes on
  // The choices, Fishbrain-style: when as a row of chips (the days you pick in a second row), how as a segmented control, then the fish,
  // the distance and calm water as rows of one grouped list (css/app.css .ui-chips, .ui-seg, .ui-list, .ui-row, .ui-switch)
  function formHtml() {
    const days = fcDays(), coll = new Intl.Collator(locale());
    const list = SPECIES.filter(s => !s.banned && s.methods.includes(q.mode)).sort((a, b) => coll.compare(fishName(a), fishName(b)));
    const chips = (set, label, items) => `<div class="ui-chips" role="group" aria-label="${esc(label)}" data-set="${set}">${items.map(([v, text, on]) => `<button class="ui-chip" data-v="${v}" aria-pressed="${on}">${text}</button>`).join('')}</div>`;
    return `<div class="pl-form">` +
      chips('win', tr('pl_when'), WINS.map(w => [w, esc(tr('pl_w_' + w)), q.win === w])) +
      (q.win === 'days' ? chips('days', tr('pl_w_days'), days.map((d, k) => [k, esc(dayLabel(d[0])), q.days.includes(k)])) : '') +
      `<div class="ui-seg block" role="group" aria-label="${esc(tr('pl_how'))}" data-set="mode">${METHODS.map(m => `<button data-v="${m}" aria-pressed="${q.mode === m}">${esc(tr(m))}</button>`).join('')}</div>` +
      `<div class="ui-list pl-opts" role="group" aria-label="${esc(tr('pl_opts'))}">` +
      `<label class="ui-row" for="pl-fish">${ic('fish')}<span class="ui-row-main"><b>${esc(tr('pl_fish'))}</b></span><select id="pl-fish" class="pl-sel" data-set="fish"><option value="any">${esc(tr('pl_anyFish'))}</option>` +
      list.map(s => `<option value="${s.id}"${s.id === q.fish ? ' selected' : ''}>${esc(fishName(s))}</option>`).join('') + `</select></label>` +
      (state.loc ? `<label class="ui-row" for="pl-dist">${ic('location')}<span class="ui-row-main"><b>${esc(tr('pl_dist'))}</b></span><select id="pl-dist" class="pl-sel" data-set="dist">` +
          DISTS.map(d => `<option value="${d}"${d === q.dist ? ' selected' : ''}>${esc(d ? tr('pl_upTo', d) : tr('pl_anyDist'))}</option>`).join('') + `</select></label>`
        : `<div class="ui-row">${ic('location')}<span class="ui-row-main"><b>${esc(tr('pl_dist'))}</b><small>${esc(tr('pl_noLoc'))}</small></span></div>`) +
      `<label class="ui-row">${ic('waves')}<span class="ui-row-main"><b>${esc(tr('pl_calm'))}</b><small>${esc(tr('pl_calmTip'))}</small></span><input type="checkbox" class="ui-switch" role="switch" data-set="calm"${q.calm ? ' checked' : ''}></label></div></div>`;
  }
  function resHtml() {
    const skel = t => `<p class="hint pl-prog">${esc(t)}</p>` + [0, 1, 2].map(i => `<div class="pl-skel" style="--i:${i}"><span class="ui-skel round"></span><span><i class="ui-skel title"></i><i class="ui-skel line"></i></span></div>`).join(''); // the trips' shape while they come
    if (!F) return skel(tr('waiting'));
    if (!shown) return skel(tr('pl_busy', st.fish ? Math.round(st.done / st.fish * 100) : 0));
    if (!shown.trips.length) return `<div class="ui-empty">${ic('route')}<b>${esc(tr('pl_noneT'))}</b><p>${esc(tr(shown.why || 'pl_none', tr('cMode')[q.mode], q.dist))}</p></div>`;
    return `<p class="pn-note pl-hint">${ic('info', 'sm')}<span>${esc(tr('pl_hint'))}</span></p><ol class="pn-list">${shown.trips.map(tripHtml).join('')}</ol>` +
      `<p class="hint pl-stats">${esc(tr('pl_checked', shown.st.fish - shown.st.skipped, shown.st.cells, nf(shown.wall / 1000, shown.wall < 1000 ? 2 : 1)))}</p>`;
  }
  const footHtml = () => `<div class="ui-list pl-brief-on"><label class="ui-row">${ic('sunrise')}<span class="ui-row-main"><b>${esc(tr('pl_briefOn'))}</b></span><input type="checkbox" class="ui-switch" role="switch" data-brief${load(BRIEF_KEY).off ? '' : ' checked'}></label></div>`;
  const inner = () => PsPanel.head('pl', 'route', tr('pl_title')) + formHtml() + `<div class="pl-res" aria-live="polite">${resHtml()}</div>` + footHtml();
  function draw(fresh) {
    const r = (fresh || root()) && PsPanel.show('pl', inner(), fresh); if (!r) return; // closed: nothing to draw
    for (const row of r.querySelectorAll('.pl-form .ui-chips')) { // phones scroll a chip row sideways: its choice in view
      const b = row.querySelector('[aria-pressed="true"]'), d = b && b.getBoundingClientRect().right - row.getBoundingClientRect().right + 8;
      if (d > 0) row.scrollLeft += d;
    }
  }
  const drawRes = () => { const r = root()?.querySelector('.pl-res'); if (r) r.innerHTML = resHtml(); };
  const keep = () => save(PREFS_KEY, { win: q.win, fish: q.fish, dist: q.dist, calm: q.calm }); // your own choices: not the days (counted from today), nor the method, nor a day the calendar picked
  function plan() { // the gear files first: the trips name their baits and lures (the answer is kept, so it must have them)
    const s0 = byId(q.fish); if (q.fish !== 'any' && (!s0 || s0.banned || !s0.methods.includes(q.mode))) q.fish = 'any'; // the fish list is the method's
    pending?.cancel(); shown = null; st = newSt();
    if (!F) return;
    const me = pending = { cancel() { this.off = true; this.p?.cancel(); } }, args = { ...q, days: [...q.days] }, mySt = st;
    clearInterval(tick); tick = setInterval(drawRes, 250); // the progress line
    Promise.resolve(loadGear()).catch(() => {}).then(() => me.off ? null : (me.p = run(args, mySt)))
      .then(v => { if (me !== pending || !v) return; clearInterval(tick); shown = v; drawRes(); }, e => { clearInterval(tick); console.warn('planner:', e); });
  }
  let calDay = false;
  function open(o) { // o.day: that day of the forecast (js/calendar.js), else your last choice
    q.mode = state.mode; // the way you fish now; changed here, showing a trip changes the app's too
    if (o?.day >= 0) { q.win = 'days'; q.days = [o.day]; } else if (calDay) q.win = load(PREFS_KEY).win || 'week';
    calDay = o?.day >= 0;
    dropBrief(); plan(); draw(true); // plan first: the panel opens on its progress (phones: the sheet fits what it is given, so the results keep room: planner.css)
    if (!isPhone()) root()?.querySelector('.ui-chip[aria-pressed="true"]')?.focus();
  }
  document.addEventListener('click', e => {
    const r = e.target.closest('.pl, .pl-brief'); if (!r) return;
    const sh = e.target.closest('[data-share]'); if (sh) { const t = shown?.trips[+sh.dataset.share]; if (t) window.PsOffline?.share(t.i); return; }
    const rm = e.target.closest('[data-remind]'); if (rm) { const t = shown?.trips[+rm.dataset.remind]; // an hour before the trip's window opens
      if (t) PsNative.remind({ at: hours[t.wa].t, title: `${fishName(byId(t.fish))} · ${L10(AREAS[t.a])}`, body: describe(latOf(t.i), lonOf(t.i)), cell: t.i }); return; }
    const tb = e.target.closest('[data-trip]');
    if (tb) { const list = r.classList.contains('pl-brief') ? briefTrips : shown?.trips; openTrip(list?.[+tb.dataset.trip]); return; }
    if (e.target.closest('[data-pl-open]')) { dropBrief(); open(); return; }
    if (e.target.closest('[data-brief-off]')) { save(BRIEF_KEY, { ...load(BRIEF_KEY), off: true }); dropBrief(); toast(tr('pl_offToast')); return; }
    if (e.target.closest('#pl-brief [data-pn-close]')) { dropBrief(); return; } // the wide screen's card (PsPanel closes the sheet on phones)
    const b = e.target.closest('[data-set] [data-v]'); if (!b) return;
    const set = b.parentNode.dataset.set, v = b.dataset.v;
    if (set === 'days') { const k = +v; q.days = q.days.includes(k) ? q.days.filter(x => x !== k) : [...q.days, k].sort((x, y) => x - y); if (!q.days.length) q.days = [k]; }
    else q[set] = v;
    calDay = false; keep(); plan(); draw(); // plan first: the redraw then shows its progress, not the last answer
  });
  document.addEventListener('change', e => {
    if (!e.target.closest('.pl')) return;
    if (e.target.matches('[data-brief]')) { save(BRIEF_KEY, { ...load(BRIEF_KEY), off: !e.target.checked }); return; }
    const set = e.target.dataset.set; if (!set) return;
    q[set] = set === 'calm' ? e.target.checked : set === 'dist' ? +e.target.value : e.target.value;
    calDay = false; keep(); plan(); drawRes();
  });
  $('#lang')?.addEventListener('click', () => setTimeout(() => { draw(); if ($('#pl-brief') || PsPanel.root('brief')) showBrief(); })); // after ui.js's applyLang

  /* ---------- The daily brief ---------- */
  let briefTrips = null, briefSea = null, briefH = 0;
  const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(Date.now()); // YYYY-MM-DD in Cyprus
  const dropBrief = () => { $('#pl-brief')?.remove(); if (PsPanel.root('brief')) PsPanel.close(); };
  function seaAt(i, h) { // the sea where you are (or at the best trip) at that hour, for the way you fish
    const k = h * NN, w = hasWx() && PsWeather.at(latOf(i), lonOf(i), h);
    const o = inputs(i, h, w && { temp: w.temp, rain: w.rain, vis: w.vis, uv: w.uv, code: w.code }), c = PsCond.rate(o, state.mode);
    return { i, dir: (Math.atan2(-bil(F.u, k, i), -bil(F.v, k, i)) * 180 / Math.PI + 360) % 360, ws: o.ws, wave: o.wave, sst: o.sst, s: c.unsafe ? 0 : c.s, unsafe: c.unsafe, mode: state.mode };
  }
  function briefHtml() { // the panel header, the sea, the day's best three (the best first: one tap opens its spot), the planner
    const t0 = briefTrips[0], sea = briefSea, day = briefH;
    const verdict = sea.unsafe ? tr('cVerdict', 'unsafe', tr('cMode')[sea.mode]) : tr('cVerdict', rateOf(sea.s), tr('cMode')[sea.mode]);
    return PsPanel.head('brief', 'sunrise', dayLabel(day), esc(`${tr('pl_brief')} · ${fmtT(hours[day].t, { weekday: 'long', day: 'numeric', month: 'long' })}`)) +
      `<p class="pl-sea"><span class="pill cpill ${sea.unsafe ? 'c-unsafe' : cls(sea.s)}">${sea.unsafe ? '✕' : sea.s}</span><span><b>${esc(verdict)}</b>` +
      `<small>${esc(tr('pl_seaRead', compass(sea.dir), Math.round(sea.ws), bft(sea.ws), nf(sea.wave), nf(sea.sst)))} · ${esc(describe(latOf(sea.i), lonOf(sea.i)))}</small></span></p>` +
      (t0 ? `<h3>${esc(tr('pl_bestWin'))}</h3><ol class="pn-list">${briefTrips.map((t, n) => `<li class="pn-item${n ? '' : ' best'}">${line(t, n)}</li>`).join('')}</ol>`
        : `<div class="ui-empty">${ic('route')}<b>${esc(tr('pl_noneT'))}</b><p>${esc(tr('pl_none', tr('cMode')[state.mode]))}</p></div>`) +
      `<div class="pn-acts pl-bfoot"><button class="btn primary" data-pl-open>${ic('route', 'sm')}${esc(tr('pl_title'))}</button><button class="btn ghost" data-brief-off>${esc(tr('pl_off'))}</button></div>`;
  }
  function showBrief() { // phones: the bottom sheet; wide screens: a card under the top bar, the map still in reach
    if (isPhone()) { PsPanel.show('brief', briefHtml(), true); return; }
    const html = `<div class="pn pl-brief" data-pn="brief">${briefHtml()}</div>`;
    const old = $('#pl-brief'), el = Object.assign(document.createElement('section'), { id: 'pl-brief', className: 'pl-brief-card glass' });
    el.setAttribute('aria-label', tr('pl_brief')); el.innerHTML = html;
    if (old) old.replaceWith(el); else $('.stage').append(el);
    L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el);
  }
  // The day's best 3 for the way you fish, near you (40 km) or else island-wide: today, or tomorrow once today has under 5 hours left.
  // Three different fish, each at its best place and time. A one-day search without the details is the planner's lightest (and cached);
  // weather.js's rain and fog data are waited for up to 4 s. The sea: now for today, else at tomorrow's best trip (or 8 in the morning).
  const forecastIn = () => F ? Promise.resolve() : new Promise((ok, no) => { let n = 0; const t = setInterval(() => { if (F) { clearInterval(t); ok(); } else if (++n > 60) { clearInterval(t); no(new Error('no forecast')); } }, 1000); });
  function briefCompute() {
    return forecastIn().then(() => window.PsWeather?.ready && !hasWx() ? Promise.race([PsWeather.ready, new Promise(ok => setTimeout(ok, 4000))]) : null).then(() => {
      const days = fcDays(), q1 = { win: days[0][1] - days[0][0] >= 5 || !days[1] ? 'today' : 'tomorrow', days: [], mode: state.mode, fish: 'any', dist: state.loc ? 40 : 0, calm: false, K: 3, lite: true, perFish: true };
      return run(q1, newSt()).then(v => v.trips.length || !q1.dist ? v : run({ ...q1, dist: 0 }, newSt())).then(v => { // nothing near you: island-wide
        const pick = v.trips;
        const h = q1.win === 'today' ? state.first : pick[0]?.h ?? Math.min(F.T - 1, days[1][0] + 8);
        return { trips: pick, h, sea: seaAt(state.loc ? seaNear({ lat: state.loc[0], lng: state.loc[1] }) : pick[0]?.i ?? seaNear({ lat: CENTER[0], lng: CENTER[1] }), h) };
      });
    });
  }
  // Once a day when the app opens (app.js calls it after the first render), unless turned off; force: show it now anyway.
  function brief(force) {
    const pref = load(BRIEF_KEY), today = dayKey();
    if (!force && (pref.off || pref.day === today)) return;
    if (!force && isPhone()) return; // the owner: the phone's bottom section shows the day's curve, never fish ratings by itself (the brief: its notification, Plan a trip)
    briefCompute().then(({ trips, sea, h }) => {
      if (!force && (!$('#guide').hidden || !$('#m-spot').hidden || !$('#fish-modal').hidden || $('.pn-modal:not([hidden])') || (window.PsNav && PsNav.current() !== 'map'))) return; // something else is open (a page too): another time
      briefTrips = trips; briefSea = sea; briefH = h;
      showBrief(); save(BRIEF_KEY, { ...load(BRIEF_KEY), day: today });
    }).catch(e => console.warn('brief:', e));
  }
  // The same brief as text, for a notification (js native side): { title, body, items: [{ title, body, hour, cell, fish, score }] }, current language.
  function briefData() {
    return briefCompute().then(({ trips, sea, h }) => {
      const t = trips[0], day = dayLabel(h);
      const seaTxt = (sea.unsafe ? tr('cVerdict', 'unsafe', tr('cMode')[sea.mode]) : tr('cVerdict', rateOf(sea.s), tr('cMode')[sea.mode])) + '. ' + tr('pl_seaRead', compass(sea.dir), Math.round(sea.ws), bft(sea.ws), nf(sea.wave), nf(sea.sst)) + '.';
      const item = x => ({ title: `${span(x)} · ${fishName(byId(x.fish))}`, body: `${L10(AREAS[x.a])} · ${describe(latOf(x.i), lonOf(x.i))}`, hour: x.h, cell: x.i, fish: x.fish, score: x.g });
      return t ? { title: tr('pl_nTitle', day, fishName(byId(t.fish)), span(t)), body: tr('pl_nBody', L10(AREAS[t.a]), t.g, seaTxt), items: trips.map(item) }
        : { title: tr('pl_nNone', day), body: seaTxt, items: [] };
    });
  }

  const api = { open, brief, briefData, last: null };
  return api;
})();
