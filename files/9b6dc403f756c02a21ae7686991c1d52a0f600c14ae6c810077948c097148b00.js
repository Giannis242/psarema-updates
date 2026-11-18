'use strict';
Object.assign(I18N.en, { fp_hours: 'Hour by hour', fp_slider: 'Hour of the day: drag to see any hour', fp_moon: 'Moon', fp_wins: 'Best windows', fp_noFc: 'No forecast yet' });
Object.assign(I18N.el, { fp_hours: 'Ώρα με ώρα', fp_slider: 'Ώρα της ημέρας: σύρετε για να δείτε κάθε ώρα', fp_moon: 'Σελήνη', fp_wins: 'Καλύτερα παράθυρα', fp_noFc: 'Δεν υπάρχει ακόμα πρόγνωση' });
// Psarema: the Forecast page (css/forecast.css), a PsNav tab: Fishbrain's BiteTime on Psarema's own numbers. Nothing here scores on its own.
// A place (your location, the spot open on the map, or an area of data/areas.js) stands for one sea cell: that spot, else the cell with the
// best fish chance from now on inside your Near me circle or the area (as Near me ranks). Per hour there: the fish chance (model.js scoreAt,
// the card's number), the going-out conditions (PsCond.rate on js/conditions.js's readings) and the go score √(fish × conditions), 0 when
// not safe, as the card's "Best time to go" and js/planner.js. Days the forecast does not reach to the evening show the calendar's outlook
// (js/calendar.js: time, moon and season only), labelled so. Worked out when the page opens or its inputs change (place, fish, method,
// forecast, weather data) and kept for them; a tap on a day or an hour only redraws. The map's hour moves only with "Show on map".
// PsForecast.open(place) opens it at 'loc', 'spot' or 'a:<area id>'; PsForecast.ms: the last compute and redraw times (ms); PsForecast.at(h): the cell and its numbers.
window.PsForecast = (() => {
  const AREAS = window.PSAREMA_AREAS || [], KEY = 'psarema-fc-v1', NDAYS = 7, CH = 100, YK = .9; // CH: the chart's height in its own units; a score of 100 reaches 90
  const ms = { calc: 0, draw: 0 };
  let root = null, pv = null, C = null, dayK = 0, selH = -1, inst = null, wxHooked = false, waitT = 0;
  const cache = new Map();
  try { pv = localStorage.getItem(KEY); } catch {}

  /* ---------- The place ---------- */
  const spotCell = () => state.picked && depth[state.focus] && !northMask[state.focus] ? state.focus : -1; // a spot you tapped on the map
  function options() { // [value, label] of every place there is
    const s = spotCell();
    return [...state.loc ? [['loc', tr('myLoc')]] : [], ...s >= 0 ? [['spot', tr('fp_spot', describe(latOf(s), lonOf(s)))]] : [], ...AREAS.map(a => ['a:' + a.id, L10(a)])];
  }
  function placeNow() { // the chosen place while it exists; else your location, the spot on the map, the area nearest the map's centre
    const o = options().map(x => x[0]);
    if (o.includes(pv)) return pv;
    if (o[0] === 'loc' || o[0] === 'spot') return o[0];
    const c = map.getCenter(); let b = null, bd = Infinity;
    for (const a of AREAS) { const d = km([c.lat, c.lng], [a.lat, a.lon]).d; if (d < bd) { bd = d; b = a; } }
    return b && 'a:' + b.id;
  }
  // The place's cell: the spot itself; else, of the scoring cells within the circle (an area's: nearer its centre than any other area's, as
  // js/conditions.js), the one with the best fish chance from now on. Best where-fit first, so the scan ends at the first cell whose bound
  // (model.js prepare's P.ub, the season and your catches' correction) cannot beat the best so far. Nothing scores (a banned fish): the sea nearest.
  function cellOf(p) {
    if (p === 'spot') return spotCell();
    const a = p?.startsWith('a:') && AREAS.find(x => 'a:' + x.id === p), c = a ? [a.lat, a.lon, a.r] : p === 'loc' && state.loc ? [...state.loc, state.radius] : null;
    if (!c) return seaNear(map.getCenter());
    const P = cur, at = (la, lo) => [(lo - WEST) / RES - .5, (NORTH - la) / RES - .5], [cx, cy] = at(c[0], c[1]), r2 = c[2] * c[2], list = [];
    const others = a ? AREAS.filter(o => o !== a).map(o => [...at(o.lat, o.lon), o.r * o.r]) : [];
    for (let j = 0; j < P.n; j++) {
      const i = P.idx[j], x = i % W, y = i / W | 0, d2 = ((x - cx) * KX) ** 2 + ((y - cy) * KY) ** 2;
      if (d2 <= r2 && !others.some(([ox, oy, or2]) => { const e = ((x - ox) * KX) ** 2 + ((y - oy) * KY) ** 2; return e < d2 && e < or2; })) list.push(i);
    }
    if (!list.length) return seaNear({ lat: c[0], lng: c[1] });
    list.sort((x, y) => P.where[y] - P.where[x]);
    const h0 = state.first, acc = new Float64Array(F.T), pm = window.PsCatch?.correction?.(P.s.id)?.max ?? 1;
    let sm = 0; for (let h = h0; h < F.T; h++) sm = Math.max(sm, P.season[h] * (P.ub ? P.ub[h] : Infinity) * pm);
    let bi_ = list[0], bs = 0;
    for (let k = 0; k < list.length && k < 3000; k++) { // ponytail: 3000 cells at most (a wide circle by boat); raise it if a best spot is ever missed
      const i = list[k]; if (100 * P.where[i] * sm <= bs) break;
      acc.fill(bs); ONE[0] = i; scoreCells(P, h0, F.T, ONE, 0, 1, 1, acc); // acc[h] rises above bs only where this cell beats it
      for (let h = h0; h < F.T; h++) if (acc[h] > bs) { bs = acc[h]; bi_ = i; }
    }
    return bi_;
  }

  /* ---------- Hour by hour at the cell ---------- */
  function inputs(i, h, ex) { // js/conditions.js inputs(), not exported there (js/planner.js keeps the same copy)
    const k = h * NN, b = a => bil(a, k, i), nw = nearW[i], ox = onx[i], oy = ony[i];
    const wave = b(F.wave), expo = wave > .01 ? clamp(-(b(F.wx) * ox + b(F.wy) * oy) / wave) : 1, cutV = 1 - nw * .8 * (1 - expo);
    const u = b(F.u), v = b(F.v), ws = Math.hypot(u, v) || .01, cutW = 1 - nw * .5 * (1 - clamp(-(u * ox + v * oy) / ws));
    const sst = sat.sst?.[i];
    return { ...ex, x: hours[h], ws0: ws, wave0: wave, cutW, cutV, ws: ws * cutW, gust: b(F.gust) * cutW, wave: wave * cutV, swell: b(F.swell) * cutV,
      period: b(F.period), cur: b(F.cur), sst: sst >= 0 ? sst : b(F.sst) };
  }
  const from = (x, y) => (Math.atan2(-x, -y) * 180 / Math.PI + 360) % 360; // where a vector (east, north) comes from
  const reads = h => { const i = C.i, k = h * NN; return { ...inputs(i, h, C.ex[h]), wdir: from(bil(F.u, k, i), bil(F.v, k, i)), vdir: from(bil(F.wx, k, i), bil(F.wy, k, i)), la: latOf(i), lo: lonOf(i) }; }; // conditions.js reads()
  const hasWx = () => isFinite(window.PsWeather?.at?.(CENTER[0], CENTER[1], state.first)?.temp);
  // A forecast day [a, b): its best windows to go, from now on today, up to 3, each the best hour left with the hours either side within 90% of
  // it, up to 3 h each way (the first is conditions.js win()); later ones within 80% of the best, an hour apart from the others.
  function dayOf(G, lo, a, b) {
    const wins = [], used = new Uint8Array(b - a);
    for (let n = 0; n < 3; n++) {
      let t = -1; for (let h = lo; h < b; h++) if (!used[h - a] && G[h].g > 0 && (t < 0 || G[h].g > G[t].g)) t = h;
      if (t < 0 || (wins.length && G[t].g < .8 * wins[0].gx)) break;
      let x = t, y = t; const k = .9 * G[t].g;
      while (x > lo && t - x < 3 && !used[x - 1 - a] && G[x - 1].g >= k) x--;
      while (y < b - 1 && y - t < 3 && !used[y + 1 - a] && G[y + 1].g >= k) y++;
      used.fill(1, Math.max(0, x - 1 - a), y + 2 - a);
      wins.push({ h: t, a: x, b: y, gx: G[t].g, g: Math.round(G[t].g), f: G[t].f, c: G[t].c.s });
    }
    return { a, b, lo, wins, g: wins[0]?.g ?? 0, r: wins[0]?.h ?? Math.min(b - 1, Math.max(lo, a + 12)) }; // r: the hour the day's row reads (its best, else midday)
  }

  /* ---------- Days the forecast does not reach: the calendar's outlook ---------- */
  // js/calendar.js astro(), outlook() and scale() (not exported there): the model's time, moon and season factors (model.js prepare: P.uni,
  // P.season) on the day's hours under a clear sky and steady pressure, its best hour, × the median ratio of this place's forecast days (their
  // best go, the number their rows show) to their own outlook (at most 1), so both kinds of day read on one scale.
  const dayUTC = t => Date.UTC(numT(t, { year: 'numeric' }), numT(t, { month: 'numeric' }) - 1, numT(t, { day: 'numeric' })); // t's Cyprus date
  const midnight = u => u - numT(u, { hour: 'numeric', hourCycle: 'h23' }) * 36e5; // Cyprus midnight of that date
  function sky(t0, t1) {
    const noon = (t0 + t1) / 2, sun = SunCalc.getTimes(new Date(noon), ...CENTER), rise = +sun.sunrise, set = +sun.sunset, month = numT(noon, { month: 'numeric' }) - 1;
    const a0 = t0 - 3 * 36e5, alt = [], major = [], minor = [];
    for (let t = a0; t <= t1 + 3 * 36e5; t += 6e5) alt.push(SunCalc.getMoonPosition(new Date(t), ...CENTER).altitude);
    for (let j = 1; j < alt.length - 1; j++) { // major ±1 h around the moon overhead or underfoot, minor ±30 min around moonrise and moonset (sources.js)
      const t = a0 + j * 6e5, q = alt[j], p = alt[j - 1], n = alt[j + 1];
      if ((q > p && q >= n) || (q < p && q <= n)) major.push([t - 36e5, t + 36e5]);
      if (Math.sign(q) !== Math.sign(p)) minor.push([t - 18e5, t + 18e5]);
    }
    const hit = (list, t) => list.some(([x, y]) => x < t + 36e5 && y > t), hrs = [];
    for (let t = t0; t < t1; t += 36e5) {
      const mid = t + 18e5;
      hrs.push({ t, rise, set, month, cloud: 0, dp: 0, illum: SunCalc.getMoonIllumination(new Date(mid)).fraction,
        period: mid >= rise - 36e5 && mid <= rise + 54e5 ? 'dawn' : mid >= set - 54e5 && mid <= set + 36e5 ? 'dusk' : mid > rise && mid < set ? 'day' : 'night',
        solunar: hit(major, t) ? 'major' : hit(minor, t) ? 'minor' : '', moonUp: clamp(alt[Math.round((mid - a0) / 6e5)] / (10 * Math.PI / 180)) });
    }
    return { hrs, rise, set, major, minor };
  }
  function outlook(D, s, mode) { // the day's best hour of time, moon and season, 0..1
    const spear = mode === 'spear', uniMax = WB.time + WB.moon * Math.max(s.moon.new, s.moon.full) + WB.press;
    let v = 0, h = null;
    if (!s.banned) for (const x of D.hrs) {
      if (s.closed?.includes(x.month + 1)) continue;
      const uni = WB.time * (spear && !daylight(x) ? Math.max(fTime(x, s), .6) : fTime(x, s)) + WB.moon * fMoon(x, s) + WB.press * fPress(x);
      const f = seasonGate(x, s) * Math.max(0, 1 - TILT * (uniMax - uni));
      if (f > v) { v = f; h = x; }
    }
    return { v, h };
  }

  /* ---------- Working it out ---------- */
  function compute(p) {
    const t0 = performance.now(), i = cellOf(p), la = latOf(i), lo = lonOf(i), wx = hasWx(), all = tlDays(0);
    const k0 = Math.max(0, all.findIndex(([a, b]) => state.first >= a && state.first < b)), hA = all[k0][0], G = [], ex = [];
    for (let h = hA; h < F.T; h++) {
      const w = wx && PsWeather.at(la, lo, h); if (w) ex[h] = { temp: w.temp, rain: w.rain, pop: w.pop, vis: w.vis, uv: w.uv, code: w.code };
      const f = Math.round(scoreAt(i, h)) || 0, c = PsCond.rate(inputs(i, h, ex[h]), state.mode); // the card's own two numbers (spear: no plankton data gives NaN, shown as 0)
      G[h] = { f, c, g: c.unsafe ? 0 : Math.sqrt(f * c.s) };
    }
    const days = [];
    for (let k = k0; k < all.length && days.length < NDAYS; k++) {
      const [a, b] = all[k]; if (k > k0 && b >= F.T && hours[b - 1].local < 20) break; // the forecast stops before this day's evening
      days.push(dayOf(G, k > k0 ? a : state.first, a, b));
    }
    if (days.length < NDAYS) { // the calendar's outlook for the rest of the week
      const u0 = dayUTC(hours[state.first].t), dayAt = k => [midnight(u0 + k * 864e5), midnight(u0 + (k + 1) * 864e5)], r = [];
      days.forEach((d, k) => { let m = 0; for (let h = d.a; h < d.b; h++) m = Math.max(m, G[h].g); const o = outlook(sky(...dayAt(k)), sp, state.mode).v; if (m > 0 && o > .05) r.push(m / (100 * o)); });
      r.sort((x, y) => x - y);
      const kk = r.length ? Math.min(1, r[r.length >> 1]) : 1;
      for (let k = days.length; k < NDAYS; k++) { const [t0_, t1] = dayAt(k), D = sky(t0_, t1), o = outlook(D, sp, state.mode); days.push({ ol: true, t0: t0_, D, h: o.h, g: Math.round(100 * o.v * kk) }); }
    }
    ms.calc = performance.now() - t0;
    return { p, i, G, ex, days, wx };
  }

  /* ---------- Drawing ---------- */
  const span = (a, b) => `${hm(hours[a].t)}–${hm(hours[b].t + 36e5)}`;
  const t0Of = d => d.ol ? d.t0 : hours[d.a].t;
  const dayName = (d, k) => k === 0 ? tr('cToday') : k === 1 ? tr('cTomorrow') : fmtT(t0Of(d) + 432e5, { weekday: 'short' });
  const goKey = g => !g ? 'none' : g >= 80 ? 'great' : g >= 65 ? 'good' : g >= 50 ? 'fair' : 'poor';
  const rateOf = c => c.unsafe ? 'unsafe' : c.s >= 80 ? 'great' : c.s >= 60 ? 'good' : c.s >= 40 ? 'fair' : 'poor'; // conditions.js rateOf
  const cCls = c => 'c-' + (c.unsafe ? 'unsafe' : c.s >= 60 ? 'good' : c.s >= 40 ? 'fair' : 'poor');
  const fmt = x => Number.isInteger(x) ? String(x) : nf(x, 1);
  const moonIc = p => { const w = p < .5, k = Math.cos(2 * Math.PI * p) * 7; // calendar.js moonSvg: lit on the right while waxing
    return `<svg class="fp-moon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.2"/><path d="M8 1A7 7 0 0 ${w ? 1 : 0} 8 15A${Math.abs(k).toFixed(2)} 7 0 0 ${w ? (k > 0 ? 0 : 1) : (k < 0 ? 0 : 1)} 8 1Z"/></svg>`; };
  const phaseOf = t => SunCalc.getMoonIllumination(new Date(t)).phase;
  function glyph(h) { // the hour's sky: weather.js's WMO code once its data is in, else the forecast's cloud cover; a clear night shows the moon
    const x = hours[h], e = C.ex[h], c = e?.code, cl = bil(F.cloud, h * NN, C.i), night = !daylight(x);
    const k = c >= 95 ? 'storm' : c >= 51 ? 'rain' : c === 45 || c === 48 || cl >= 70 ? 'cloud' : cl >= 25 ? (night ? 'cloud' : 'cloud-sun') : night ? 'moon' : 'sun';
    const tip = `${tr('k_cloud')} ${Math.round(cl)}%` + (e?.rain >= .1 ? ` · ${tr('in_rain')} ${nf(e.rain)} mm/h` : '');
    return `<span class="fp-g" title="${esc(tip)}">${ic(k)}</span>`;
  }
  // The day's 24 h, BiteTime-style: night shaded, the moon's major and minor periods as faint bands, the fish chance as a smooth area in its
  // heat colours, the conditions as a thin white curve (0 where not safe, those hours a red mark on the floor), the best windows lighter with
  // their go score on top, now dashed, the chosen hour a white line you drag (knob on the fish curve, the hour and its go in a bubble).
  // Hour k of the day spans x = k … k + 1 across the full width (today: from the forecast's first hour); the past greyed under a veil.
  const wdOf = d => Math.max(6, d.b - d.a); // the chart's width in hours: the day's (a late first hour: 6 at least)
  const pct = (x, w) => `${(x / w * 100).toFixed(2)}%`;
  function chartHtml(d) {
    const n = d.b - d.a, Wd = wdOf(d), t0 = hours[d.a].t, X = t => Math.max(0, Math.min(Wd, (t - t0) / 36e5)), G = C.G, P = x => pct(x, Wd);
    const sun = SunCalc.getTimes(new Date(t0 + 432e5), ...CENTER), fs = [], ys = [];
    let bad = '', bands = '', wins = '', ax = '';
    for (let h = d.a; h < d.b; h++) {
      const k = h - d.a, c = G[h].c;
      fs.push(+(CH - G[h].f * YK).toFixed(1)); ys.push(+(CH - (c.unsafe ? 0 : c.s) * YK).toFixed(1));
      if (c.unsafe) bad += `M${k} ${CH - 3}h1v3h-1Z`;
      if (k && hours[h].local % 3 === 0 && hours[h].local !== hours[h - 1].local) ax += `<span style="left:${P(k)}">${hm(hours[h].t).slice(0, 2)}</span>`;
    }
    for (const [list, c] of [[events.major, 'maj'], [events.minor, 'min']]) for (const [s, e] of list) if (e > t0 && s < t0 + Wd * 36e5) bands += `<rect class="fp-${c}" x="${X(s).toFixed(3)}" width="${(X(e) - X(s)).toFixed(3)}" height="${CH}"/>`;
    for (const w of d.wins) wins += `<i class="fp-wb" style="left:${P(w.a - d.a)};width:${P(w.b - w.a + 1)};--c:${solid(w.g)}"></i>`; // round 17 G: no number on each window: the hero and the bubble give it
    const past = state.first > d.a ? Math.min(n, state.first - d.a) : 0, now = state.first >= d.a && state.first < d.b ? X(Date.now()) : null;
    const fish = monotone([fs[0], ...fs, fs.at(-1)], 1), cond = monotone([ys[0], ...ys, ys.at(-1)], 1);
    const stops = [100, 85, 70, 50].map(s => `<stop offset="${(100 - s) / 50}" stop-color="${solid(s)}"/>`).join(''), grid = [25, 50, 75].map(s => `M0 ${CH - s * YK}H${Wd}`).join('');
    const k = selH - d.a, on = k >= 0 && k < n, g = on && Math.round(G[selH].g);
    const plot = `<svg viewBox="0 0 ${Wd} ${CH}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fp-heat" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${CH - 100 * YK}" y2="${CH - 50 * YK}">${stops}</linearGradient></defs>` +
      `<path class="fp-night" d="M0 0H${X(+sun.sunrise).toFixed(3)}V${CH}H0ZM${X(+sun.sunset).toFixed(3)} 0H${Wd}V${CH}H${X(+sun.sunset).toFixed(3)}Z"/>${bands}<path class="fp-grid" d="${grid}"/>` +
      `<g transform="translate(-.5 0)"><path class="fp-fa" d="${fish}V${CH}H0Z"/><path class="fp-fl" d="${fish}"/><path class="fp-cl" d="${cond}"/></g>` + (bad ? `<path class="fp-bad" d="${bad}"/>` : '') +
      (past ? `<rect class="fp-past" width="${past}" height="${CH}"/>` : '') + (now != null ? `<path class="fp-now" d="M${now.toFixed(3)} 0V${CH}"/>` : '') + `</svg><div class="fp-wbs">${wins}</div>` +
      (on ? `<div class="fp-scrub" style="left:${P(k + .5)}"><i style="top:${(fs[k] / CH * 100).toFixed(1)}%"></i></div>` +
        `<span class="fp-bub" style="left:clamp(34px, ${P(k + .5)}, calc(100% - 34px))">${selH === state.first ? esc(tr('now')) : hm(hours[selH].t)}<b style="--c:${g ? solid(g) : 'transparent'}">${g}</b></span>` : '');
    // round 17 G: sunrise and sunset in sight; what the chart's colours and marks mean, folded
    const key = `<span>${ic('sunrise', 'sm')}${hm(+sun.sunrise)}</span><span>${ic('sunset', 'sm')}${hm(+sun.sunset)}</span><details class="fp-legend"><summary>${esc(tr('g17_chartKey'))}</summary>` +
      `<span class="fp-key"><i class="k-f"></i>${esc(tr('fp_fishC'))}</span><span class="fp-key"><i class="k-c"></i>${esc(tr('cTitle'))}</span>` +
      `<span class="fp-key"><i class="k-w"></i>${esc(tr('fp_wins'))}</span><span class="fp-key"><i class="k-m"></i>${esc(tr('fp_moonP'))}</span>${bad ? `<span class="fp-key"><i class="k-u"></i>${esc(tr('fp_unsafe'))}</span>` : ''}</details>`;
    return { plot, ax, key, Wd };
  }
  function readHtml(h) { // the chosen hour (its time: the bubble) in one line: its fish chance and conditions, wind and waves; View more: the details below
    const G_ = C.G[h], o = reads(h);
    return `<span class="fp-rvs"><span>${esc(tr('cGoNums', G_.f, G_.c.s))}</span><span class="fp-wd">${arrow(o.wdir + 180)}${esc(tr('in_bft', PsWeather.beaufort(o.ws)))}</span>` +
      `<span>${ic('waves', 'sm')}${nf(o.wave)} m</span></span><button class="ui-link fp-more" data-fp-more>${esc(tr('viewMore'))}</button>`;
  }
  const solList = (list, t0) => list.filter(([a, b]) => (a + b) / 2 >= t0 && (a + b) / 2 < t0 + 864e5).map(([a, b]) => `${hm(a)}–${hm(b)}`).join(', ') || '–';
  const chip = (x, k) => `<button class="fp-chip" data-fp-h="${x.h}"${k != null ? ` data-fp-k="${k}"` : ''} aria-pressed="${k == null && selH >= x.a && selH <= x.b}" title="${esc(tr('cGoNums', x.f, x.c))}">${ic('clock', 'sm')}<span>${span(x.a, x.b)}</span>${ring(x.g, 'sm')}</button>`;
  const chipsOf = (d, k) => d.wins.length ? `<div class="fp-wins" role="group" aria-label="${esc(tr('fp_wins'))}">${[...d.wins].sort((x, y) => x.a - y.a).map(x => chip(x, k)).join('')}</div>` : ''; // in the day's order
  const olDl = d => `<dl class="fp-ol"><dt>${ic('sun', 'sm')}${esc(tr('cal_sun'))}</dt><dd>${ic('sunrise', 'sm')} ${hm(d.D.rise)} &nbsp; ${ic('sunset', 'sm')} ${hm(d.D.set)}</dd>` +
    `<dt>${ic('moon', 'sm')}${esc(tr('cal_major'))}</dt><dd>${solList(d.D.major, d.t0)}</dd><dt>${ic('clock', 'sm')}${esc(tr('cal_minor'))}</dt><dd>${solList(d.D.minor, d.t0)}</dd></dl>`;
  function heroHtml() { // the chosen day's best go: a dial, the window in large type, the verdict and its two numbers
    const d = C.days[dayK], first = dayK === 0;
    const verdict = d.ol ? tr('cal_ol') : tr('fp_v')[goKey(d.g)], w = d.wins?.[0];
    const ban = sp.banned ? tr('fp_banned') : sp.closed?.includes((d.ol ? d.D.hrs[12] : hours[d.r]).month + 1) ? tr('fp_closed') : '';
    const sub = d.ol ? (d.h ? `${tr('fp_olSub', hm(d.h.t))} · ${tr(d.h.period)}` : '') : w ? tr('cGoNums', w.f, w.c) : '';
    return `<div class="fp-hero">${ring(d.ol && !d.g ? null : d.g, 'xl')}<div class="fp-hv"><span class="lbl">${esc(first ? tr('fp_left') : `${dayName(d, dayK)} · ${dm(t0Of(d) + 432e5)}`)}</span>` +
      (w ? `<b class="fp-ht">${span(w.a, w.b)}</b><span class="fp-hs"><em class="go-${goKey(d.g)}">${esc(verdict)}</em>${sub ? ` · ${esc(sub)}` : ''}</span>` : `<b class="fp-ht sm">${esc(verdict)}</b>${sub ? `<span class="fp-hs">${esc(sub)}</span>` : ''}`) +
      `${ban ? `<small class="fp-ban">${ic('ban', 'sm')}${esc(ban)}</small>` : ''}</div></div>` + (d.ol ? `<p class="hint">${esc(tr('cal_olTip'))}</p>${olDl(d)}` : '');
  }
  function daysHtml() { // a compact row per day (its name, best go as a dial, best window, the moon by its date, then the sky, wind, waves and sea at that hour); tap: its details
    // round 16 timing: when the forecast days' best go scores sit within 3 points, say so in words instead of leaving a column of equal dials to be read as doubt
    const gs = C.days.filter(d => !d.ol).map(d => d.g), same = gs.length >= 3 && Math.max(...gs) - Math.min(...gs) <= 3 ? `<p class="hint">${esc(tr('t_sameWeek'))}</p>` : '';
    return same + `<ol class="fp-days">${C.days.map((d, k) => {
      const noon = t0Of(d) + 432e5, p = phaseOf(noon), ph = tr('phases')[Math.round(p * 8) % 8], lit = Math.round(100 * SunCalc.getMoonIllumination(new Date(noon)).fraction);
      const nm = `<span class="fp-dn"><b>${esc(dayName(d, k))}</b><small>${esc(dm(noon))}<span class="fp-mi" title="${esc(ph)}">${moonIc(p)}</span></small></span>`;
      const moonRow = [ic('moon', 'sm'), tr('fp_moon'), ph, tr('in_lit', lit)], chev = ic('chevron-down', 'fp-chev');
      const dl = rows => `<dl class="fp-dl">${rows.map(([i_, k_, v, s]) => `<div><dt>${i_}${esc(k_)}</dt><dd>${esc(v)}${s ? `<small>${esc(s)}</small>` : ''}</dd></div>`).join('')}</dl>`;
      if (d.ol) return `<li><details class="fp-day ol" name="fp-wk"><summary>${nm}${ring(d.g || null, '')}<span class="fp-dw"><span class="fp-tag">${esc(tr('cal_ol'))}</span>` +
        `<span class="fp-dr">${d.h ? `<span>${ic('clock', 'sm')}${hm(d.h.t)}</span>` : ''}</span></span>${chev}</summary>` +
        `<div class="fp-dx"><p class="hint">${d.h ? esc(tr('fp_olSub', hm(d.h.t))) + ' · ' : ''}${esc(tr('cal_olTip'))}</p>${olDl(d)}${dl([moonRow])}</div></details></li>`;
      const w = d.wins[0], o = reads(d.r), b = PsWeather.beaufort(o.ws), sun = SunCalc.getTimes(new Date(noon), ...CENTER);
      return `<li><details class="fp-day" name="fp-wk"><summary>${nm}${ring(d.g || null, '')}` +
        `<span class="fp-dw">${w ? `<b>${span(w.a, w.b)}</b>` : `<b class="none">${esc(tr('fp_v').none)}</b>`}<span class="fp-dr">${glyph(d.r)}` +
        `<span class="fp-wd" title="${esc(`${tr('k_wind')} ${compass(o.wdir)} ${Math.round(o.ws)} km/h · ${tr('gust')} ${Math.round(o.gust)}`)}">${arrow(o.wdir + 180)}${esc(tr('in_bft', b))}</span>` +
        `<span title="${esc(tr('k_waves'))}">${ic('waves', 'sm')}${nf(o.wave)} m</span><span class="fp-sst" title="${esc(tr('k_sea'))}">${ic('thermometer', 'sm')}${Math.round(o.sst)}°</span></span></span>${chev}</summary>` +
        `<div class="fp-dx"><p class="fp-dxh">${esc(tr('fp_wx', whenT(hours[d.r].t)))}${w ? ` · ${esc(tr('cGoNums', w.f, w.c))}` : ''}</p>${chipsOf(d, k)}` +
        dl([[ic('wind', 'sm'), tr('k_wind'), `${compass(o.wdir)} ${Math.round(o.ws)} km/h`, `${tr('gust')} ${Math.round(o.gust)} · ${tr('in_bft', b)}`],
          [ic('waves', 'sm'), tr('k_waves'), `${nf(o.wave)} m`, `${tr('fp_swell')} ${nf(o.swell)} m · ${Math.round(o.period)} s`],
          [ic('thermometer', 'sm'), tr('k_sea'), `${Math.round(o.sst)}°`, isFinite(o.temp) ? `${tr('fp_air')} ${Math.round(o.temp)}°` : ''],
          [ic('sun', 'sm'), tr('cal_sun'), `${hm(+sun.sunrise)} – ${hm(+sun.sunset)}`, ''], moonRow]) +
        `<button class="btn fp-hb" data-fp-day="${k}" aria-pressed="false">${ic('forecast', 'sm')}${esc(tr('fp_hours'))}</button></div></details></li>`;
    }).join('')}</ol>`;
  }
  const lastH = () => C.days.reduce((m, d) => d.ol ? m : d.b - 1, 0); // the last hour a day's chart shows (the forecast's later hours belong to no day here)
  function wxHead(h) {
    return `<h3><span>${esc(tr('fp_wx', whenT(hours[h].t)))}</span><span class="fp-step"><button class="icon-btn" data-fp-step="-1" aria-label="${esc(tr('fp_prev'))}"${h <= C.days[0].a ? ' disabled' : ''}>${ic('chevron-left')}</button>` +
      `<button class="icon-btn" data-fp-step="1" aria-label="${esc(tr('fp_next'))}"${h >= lastH() ? ' disabled' : ''}>${ic('chevron-right')}</button></span></h3>`;
  }
  let rdOpen = false; document.addEventListener('toggle', e => { if (e.target.classList?.contains('fp-more')) rdOpen = e.target.open; }, true);
  function wxHtml(h) { // the hour's go, the conditions' verdict and main reasons (the card's), then what the instruments do not show
    const G = C.G[h], c = G.c, o = reads(h), x = hours[h], k = h * NN;
    const li = r => `<li><span class="${r.sign}">${r.sign === 'plus' ? '+' : r.sign === 'no' ? '✕' : '−'}</span><span>${esc(tr(r.key, ...r.a.map(fmt)))}</span></li>`;
    const rows = [[ic('pressure', 'sm'), tr('k_press'), `${Math.round(bil(F.press, k, C.i))} hPa`, `${x.dp > .05 ? '+' : ''}${nf(Math.abs(x.dp) < .05 ? 0 : x.dp)}/24h`],
      [ic('cloud', 'sm'), tr('k_cloud'), `${Math.round(bil(F.cloud, k, C.i))}%`, ''], [ic('thermometer', 'sm'), tr('fp_air'), isFinite(o.temp) ? `${Math.round(o.temp)}°` : '–', ''],
      [ic('swell', 'sm'), tr('fp_swell'), `${nf(o.swell)} m`, `${Math.round(o.period)} s`], [ic('current', 'sm'), tr('k_current'), `${nf(o.cur)} km/h`, '']]; // round 17 G: the fish chance was the page's own number again
    return `<div class="fp-now-go"><span class="fp-gs">${ring(Math.round(G.g), 'lg')}<small class="lbl">${esc(tr('fp_go'))}</small></span><div class="cond-why ${cCls(c)}"><p><span class="cond-s"><b>${c.s}</b>/100</span> <b>${esc(tr('cVerdict', rateOf(c), tr('cMode')[state.mode]))}</b></p>` +
      (c.why.length ? `<ul class="reasons">${c.why.slice(0, 2).map(li).join('')}</ul>` : '') + `</div></div>` +
      // round 17 G: pressure, cloud, air, swell and current, folded (it stays open from hour to hour once opened)
      `<details class="fold fp-more"${rdOpen ? ' open' : ''}><summary>${ic('chevron-right')}${esc(tr('g17_moreReads'))}</summary>` +
      `<dl class="fp-rd">${rows.map(([i_, k_, v, s]) => `<div><dt>${i_}${esc(k_)}</dt><dd>${esc(v)}${s ? `<small>${esc(s)}</small>` : ''}</dd></div>`).join('')}</dl></details>`;
  }
  function topHtml(p) { // the place, the fish (a native picker under a cut-out button: the biting best first) and the way you fish
    const coll = new Intl.Collator(locale()), list = SPECIES.filter(s => !s.banned || s.id === sp.id)
      .sort((a, b) => (rank[b.id]?.s ?? -1) - (rank[a.id]?.s ?? -1) || coll.compare(fishName(a), fishName(b)));
    const opt = (v, label, on) => `<option value="${esc(v)}"${on ? ' selected' : ''}>${esc(label)}</option>`, o = options(), ar = o.filter(x => x[0].startsWith('a:'));
    return `<label class="fp-place">${ic('pin', 'sm')}<select data-fp-place aria-label="${esc(tr('fp_place'))}">` +
      o.filter(x => !x[0].startsWith('a:')).map(([v, l]) => opt(v, l, v === p)).join('') +
      (ar.length ? `<optgroup label="${esc(tr('fp_areas'))}">${ar.map(([v, l]) => opt(v, l, v === p)).join('')}</optgroup>` : '') + `</select></label>` +
      `<div class="fp-who"><label class="fp-fish">${PsPanel.fish(sp) || ic('fish')}<b>${esc(fishName(sp))}</b>${ic('chevron-down', 'sm')}` +
      `<select data-fp-fish aria-label="${esc(tr('fish'))}">${opt('all', fishName(ALL_FISH), sp.all)}${list.map(s => opt(s.id, fishName(s) + (rank[s.id] ? ` · ${rank[s.id].s}` : ''), s.id === sp.id)).join('')}</select></label>` +
      `<div class="seg fp-mode" role="group" aria-label="${esc(tr('ui_method'))}">${['boat', 'shore', 'spear'].map(m => `<button data-fp-mode="${m}" aria-pressed="${state.mode === m}" title="${esc(tr(m))}">${ic(m)}<span>${esc(tr(m))}</span></button>`).join('')}</div></div>`;
  }
  function spotHtml() { // which cell the place stands for, and the way to it on the map
    const i = C.i, la = latOf(i), lo = lonOf(i), r = C.p === 'loc' && state.loc && km(state.loc, [la, lo]);
    return `<p class="fp-spot">${ic('location', 'sm')}<span><small class="lbl">${esc(tr(C.p === 'spot' ? 'fp_this' : 'fp_bestSpot'))}</small><b>${esc(describe(la, lo))}</b>` +
      `<small>${depthM(i)} m${esc(habPart(i))}${r?.d ? ' · ' + esc(tr('away', fmtKm(r.d), compass(r.bearing))) : ''}</small></span><button class="btn sm" data-fp-map>${ic('map', 'sm')}${esc(tr('pl_show'))}</button></p>`;
  }
  const put = (k, html) => { const el = root.querySelector(`[data-fp="${k}"]`); if (el && el.psHtml !== html) el.innerHTML = el.psHtml = html; }; // only a part whose HTML changed
  const shown = () => root?.isConnected && (PsNav.current?.() ?? 'forecast') === 'forecast';
  function draw() {
    if (!shown()) return;
    const t = performance.now();
    if (!F || !hours.length) { // loading, or (round 9) the forecast failed: say which, with Retry (js/app.js retryForecast) when it failed
      const st = $('#status'), err = st?.classList.contains('error') || st?.classList.contains('offline');
      put('top', ''); root.querySelector('.fp-chc').hidden = true;
      put('hero', err ? `<div class="ui-empty">${ic('warning')}<b>${esc(tr('fp_noFc'))}</b><p>${esc(st.querySelector('span')?.textContent || '')}</p><button class="btn primary" data-ui="retry">${ic('refresh', 'sm')}${esc(tr('retry'))}</button></div>`
        : `<p class="empty loading">${esc(tr('waiting'))}</p>`);
      clearTimeout(waitT); waitT = setTimeout(draw, 1000); return;
    }
    if (!wxHooked && window.PsWeather?.ready) { wxHooked = true; PsWeather.ready.then(() => setTimeout(draw)); } // rain, fog, thunder, air temperature: in when weather.js has them
    // the answer per place and method for the fish model.js prepared last (curGen: a new fish, method or forecast), the last 8 kept
    const p = placeNow(), key = [p, p === 'spot' ? spotCell() : p === 'loc' ? state.loc : '', state.radius, state.mode, curGen, hasWx(), state.first].join('|');
    if (C?.key !== key) {
      if (cache.gen !== curGen) { cache.clear(); cache.gen = curGen; }
      C = cache.get(key) || cache.set(key, Object.assign(compute(p), { key })).get(key);
      if (cache.size > 8) cache.delete(cache.keys().next().value);
      dayK = 0; selH = -1;
    }
    const d = C.days[dayK];
    if (selH < 0 || d.ol || selH < d.a || selH >= d.b) selH = d.ol ? -1 : dayK === 0 && state.first >= d.a && state.first < d.b ? state.first : d.wins[0]?.h ?? d.r; // today: now; else the day's best time, else the hour its row reads
    // what a day or hour tap leaves as it was is built once per answer, language and map spot (the fish list, the week); the tap sets aria-pressed
    const lk = state.lang + spotCell(), L = C.L?.k === lk ? C.L : C.L = { k: lk, top: topHtml(p), spot: spotHtml(), days: daysHtml() };
    put('top', L.top); put('spot', L.spot); put('hero', heroHtml()); put('days', L.days);
    const cv = root.querySelector('[data-fp="chart"]'); cv.parentNode.hidden = d.ol;
    if (!d.ol) {
      const ch = chartHtml(d), g = Math.round(C.G[selH].g);
      put('chart', ch.plot); put('ax', ch.ax); put('key', ch.key); put('read', readHtml(selH));
      cv.setAttribute('aria-valuemax', ch.Wd - 1); cv.setAttribute('aria-valuenow', selH - d.a); cv.setAttribute('aria-valuetext', `${hm(hours[selH].t)} · ${tr('fp_go')} ${g}`);
    }
    const ob = window.PsObs?.line(latOf(C.i), lonOf(C.i)) || ''; put('obs', ob && `${ic('compass', 'sm')}${esc(ob)}`); // the latest real wind nearby (js/obs.js)
    for (const b of root.querySelectorAll('[data-fp-day]')) b.setAttribute('aria-pressed', +b.dataset.fpDay === dayK);
    put('foot', `<button class="btn" data-cal-open>${ic('calendar', 'sm')}${esc(tr('cal_title'))}</button><button class="btn" data-ui="plan">${ic('route', 'sm')}${esc(tr('pl_title'))}</button>` +
      `<p class="hint">${esc(tr('fp_how'))}</p>`);
    const wx = root.querySelector('[data-fp="wx"]'); wx.hidden = selH < 0;
    if (selH >= 0) {
      put('wxh', wxHead(selH)); put('wxb', wxHtml(selH));
      const ik = [state.lang, state.mode, sp.id].join();
      if (inst?.k !== ik) inst = Object.assign(window.PsInst?.panel() || { el: document.createElement('div'), set() {} }, { k: ik }); // the details' instruments, built once per language, method and fish
      const box = root.querySelector('[data-fp="ig"]'); if (inst.el.parentNode !== box) box.replaceChildren(inst.el);
      try { inst.set(reads(selH)); } catch (e) { console.warn(e); }
    }
    ms.draw = performance.now() - t;
  }
  const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  function render(el) {
    root = el;
    el.innerHTML = `<div class="fp-c"><div class="fp"><div class="fp-ctx"><div class="fp-top" data-fp="top"></div><div data-fp="spot"></div></div><p class="hint fp-obs" data-fp="obs"></p>` +
      `<section class="fp-today"><div class="fp-hcard" data-fp="hero" aria-live="polite"></div>` +
      `<div class="fp-chc"><div class="fp-ch" data-fp="chart" role="slider" tabindex="0" aria-valuemin="0" aria-label="${esc(tr('fp_slider'))}"></div><div class="fp-ax" data-fp="ax" aria-hidden="true"></div>` +
      `<p class="fp-read" data-fp="read"></p><div class="fp-sun" data-fp="key"></div></div></section>` +
      `<section class="fp-wk"><h3>${esc(tr('fp_days'))}</h3><div data-fp="days"></div><div class="fp-foot" data-fp="foot"></div></section>` +
      `<section class="fp-wx" data-fp="wx" hidden><div data-fp="wxh"></div><div data-fp="ig"></div><div data-fp="wxb"></div></section></div></div>`;
    if (el.psFp) return; // drawn again (a new language): its listeners are there already
    el.psFp = true;
    document.addEventListener('ps:obs', () => draw()); // new station reports (draw does nothing while the page is hidden)
    // The chart is a slider: press or drag along it (touch: sideways; up and down still scrolls the page), or the arrow keys, to pick an hour
    const pick = (cv, e) => {
      const d = C?.days[dayK], r = cv.getBoundingClientRect(); if (!d || d.ol || !r.width) return;
      const h = Math.max(d.a, Math.min(d.b - 1, d.a + Math.floor((e.clientX - r.left) / r.width * wdOf(d))));
      if (h !== selH) { selH = h; draw(); }
    };
    el.addEventListener('pointerdown', e => { const cv = e.target.closest('[data-fp="chart"]'); if (!cv) return; try { cv.setPointerCapture(e.pointerId); } catch {} pick(cv, e); });
    el.addEventListener('pointermove', e => { const cv = e.target.closest?.('[data-fp="chart"]'); if (cv?.hasPointerCapture(e.pointerId)) pick(cv, e); });
    el.addEventListener('keydown', e => {
      const d = C?.days[dayK], s = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
      if (!d || d.ol || !e.target.matches('[data-fp="chart"]') || !(s || e.key === 'Home' || e.key === 'End')) return;
      e.preventDefault(); selH = e.key === 'Home' ? d.a : e.key === 'End' ? d.b - 1 : Math.max(d.a, Math.min(d.b - 1, selH + s)); draw();
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-fp-day], [data-fp-h], [data-fp-step], [data-fp-mode], [data-fp-map], [data-fp-more]'); if (!b || b.disabled || !C) return;
      const q = b.dataset;
      if (q.fpDay || q.fpK) { // the day's chart into view (a window in a day's details: that hour too), in the frame's own layout (not a second one in the tap)
        dayK = +(q.fpDay ?? q.fpK); selH = q.fpH ? +q.fpH : -1; draw();
        requestAnimationFrame(() => root.querySelector('.fp-today')?.scrollIntoView({ block: 'start', behavior: smooth() }));
      }
      else if (q.fpH) { selH = +q.fpH; draw(); }
      else if (q.fpStep) { // the next or last hour, into the next or last day
        selH = Math.max(C.days[0].a, Math.min(lastH(), selH + +q.fpStep));
        const k = C.days.findIndex(x => !x.ol && selH >= x.a && selH < x.b); if (k >= 0) dayK = k; draw();
      }
      else if (q.fpMode) { if (q.fpMode !== state.mode) $(`#mode [data-mode="${q.fpMode}"]`)?.click(); } // ui.js: method, refresh, ranking; #mode's listener below redraws
      else if (q.fpMap != null) { const i = C.i, h = selH >= 0 ? selH : state.first; PsNav.open('map'); PsPanel.openSpot(i, { h }); }
      else if (q.fpMore != null) root.querySelector('.fp-wx')?.scrollIntoView({ block: 'start', behavior: smooth() });
    });
    el.addEventListener('change', e => {
      const s = e.target;
      if (s.matches('[data-fp-place]')) { pv = s.value; try { localStorage.setItem(KEY, pv); } catch {} draw(); }
      else if (s.matches('[data-fp-fish]') && s.value !== state.sp) { chooseFish(s.value); draw(); }
    });
  }
  // The method or language changed (here or in the app's own controls): redraw after the app's handlers
  const later = () => setTimeout(draw);
  $('#mode')?.addEventListener('click', later); $('#lang')?.addEventListener('click', later);
  new MutationObserver(later).observe($('#fish-modal'), { attributes: true, attributeFilter: ['hidden'] });

  const open = p => PsNav.open('forecast', p);
  PsNav.add('forecast', { title: () => tr('fp_title'), icon: 'forecast', tab: true, render,
    show(el, arg) { if (el !== root) render(el); if (typeof arg === 'string') pv = arg; draw(); }, hide() { clearTimeout(waitT); } });

  // Self-check: the windows (the first is conditions.js win(); the next keeps an hour apart from it)
  { const G = [5, 50, 48, 10, 4, 40, 39, 0].map(g => ({ g, f: g, c: { s: 100 } })), d = dayOf(G, 0, 0, 8);
    console.assert(d.wins[0].a === 1 && d.wins[0].b === 2 && d.wins.length === 2 && d.wins[1].a === 5 && d.wins[1].b === 6, 'forecast: windows'); }
  const at = h => C?.G[h] && { i: C.i, f: C.G[h].f, c: C.G[h].c.s, g: C.G[h].g }; // the place's cell and its numbers at hour h (tests: they match the card's)
  return { open, ms, at };
})();
