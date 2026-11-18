'use strict';
Object.assign(I18N.en, { cg_title: 'Go score, hour by hour', cAreaWarn: { fair: 'fair sea', poor: 'rough sea' } });
Object.assign(I18N.el, { cg_title: 'Βαθμός εξόδου, ώρα με την ώρα', cAreaWarn: { fair: 'μέτρια θάλασσα', poor: 'φουρτούνα' } });
// Psarema: going-out conditions. For the way you fish (state.mode), a cell and an hour: how good and how safe it is to go, 0–100,
// with the main reasons in plain words. The sea comes from the forecast nodes (F, bilinear per cell as in model.js) after the cell's
// shelter from the coast (onx/ony/nearW: the fish score's own shelter); rain, thunder, fog, air temperature and UV come from
// js/weather.js (PsWeather.at(lat, lon, h)). Worked out only for the open card (every hour, past 2 days to 7 ahead, cached per cell; it
// always shows the selected hour, past or future) and for samples of each area in data/areas.js (today, tomorrow and the best of the rest
// of the week, in the background): nothing per cell while the hour is scrubbed. Best times to go are searched from now on only.
const PsCond = window.PsCond = (() => {
  /* ---------- Rules ---------- */
  // Beaufort upper limits, km/h (WMO scale, the same as weather.js).
  const BFT = [1.1, 5.8, 12.2, 19.8, 28.8, 38.9, 50, 61.9, 74.9, 88.2, 102.6, 117.7], bft = w => { let b = 0; while (b < 12 && w >= BFT[b]) b++; return b; };
  // Per method: [comfortable, limit]. The factor is 1 up to the first value and falls to .4 at the limit; at or past the limit it is not safe.
  // The not-safe limits are the app's own (weather.js SAFE): a small open boat up to Bft 4, waves 1 m, gusts 40 km/h, no fog;
  // shore up to Bft 5, waves 1.5 m, gusts 65; spearfishing up to Bft 3, waves 0.5 m, gusts 30, current 1.5 km/h, no fog.
  // Comfortable: Bft 2 (light breeze, glassy wavelets) for boats and divers, Bft 3 for shore; Douglas 2 "smooth" (≤ 0.5 m) seas.
  const LIM = {
    boat: { wind: [12.2, 28.8], gust: [25, 40], wave: [.5, 1], fog: true, chop: .4, dark: .7 },
    shore: { wind: [19.8, 38.9], gust: [40, 65], wave: [.75, 1.5], fog: false, chop: 0, dark: .9 },
    spear: { wind: [12.2, 19.8], gust: [20, 30], wave: [.25, .5], fog: true, chop: .2, dark: .3, cur: [.9, 1.5] },
  };
  const DARK = { boat: 'cr_darkBoat', shore: 'cr_darkShore', spear: 'cr_darkSpear' };
  const ramp = (x, a, b, d = .6) => 1 - d * clamp((x - a) / (b - a)); // 1 up to a, 1 − d from b
  const r1 = x => Math.round(x * 10) / 10, r0 = Math.round;
  // o: the readings at a cell and hour (inputs()); m: boat | shore | spear. -> { s: 0..100, unsafe, why: [{ sign, key, a }] worst first }
  function rate(o, m) {
    const L = LIM[m], R = [], add = (f, sign, key, ...a) => R.push({ f, sign, key, a });
    if (o.code >= 95) add(0, 'no', 'cr_thunder'); // WMO weather codes 95–99: thunderstorm. Lightning: off the water (NOAA/NWS lightning safety)
    const ws = r0(o.ws), b = bft(o.ws);
    if (o.ws >= L.wind[1]) add(0, 'no', 'cr_windNo', ws, b); else add(ramp(o.ws, ...L.wind), 'minus', 'cr_wind', ws, b);
    const g = r0(o.gust);
    if (o.gust >= L.gust[1]) add(0, 'no', 'cr_gustNo', g); else add(ramp(o.gust, ...L.gust, .3), 'minus', 'cr_gust', g);
    const wv = r1(o.wave);
    if (o.wave > L.wave[1]) add(0, 'no', 'cr_waveNo', wv); else add(ramp(o.wave, ...L.wave), 'minus', 'cr_wave', wv);
    // Steepness H/L with the deep-water wavelength L = gT²/2π ≈ 1.56·T² m: swell is below ~1/50, a young wind sea ~1/30–1/20, and waves
    // break near 1/7. Short, steep chop is what pounds and swamps a small boat (and slaps a diver's snorkel), more than the height alone.
    if (L.chop && o.wave >= .3 && o.period > 0) add(1 - L.chop * clamp((o.wave / (1.56 * o.period ** 2) - .025) / .03), 'minus', 'cr_chop', wv, r0(o.period));
    // Swell on rocks: waves washing anglers off rocks are the main danger of rock fishing (NSW rock fishing safety guidance); a long
    // period swell carries more energy (∝ H²T) and runs further up, so from 7 s it counts as higher. Divers: swell = surge and murky water.
    if (m === 'shore') add(1 - .5 * clamp((o.swell * Math.max(1, Math.sqrt(o.period / 7)) - .5) / 1), 'minus', 'cr_swellShore', r1(o.swell));
    if (m === 'spear') add(1 - .5 * clamp((o.swell - .2) / .4), 'minus', 'cr_swellSpear', r1(o.swell));
    // Current: a free-diver swims ~1–2 km/h and tires fast against 0.5–1 knot (0.9–1.85 km/h); the app's limit is 1.5 km/h.
    if (L.cur) { if (o.cur >= L.cur[1]) add(0, 'no', 'cr_curNo', r1(o.cur)); else add(ramp(o.cur, ...L.cur), 'minus', 'cr_cur', r1(o.cur)); }
    // Rain: moderate from 2.5 mm/h, heavy from 7.6 (AMS glossary); a diver is wet anyway.
    if (o.rain >= .2) add(1 - (m === 'spear' ? .25 : .5) * clamp(o.rain / 4), 'minus', 'cr_rain', r1(o.rain));
    // Fog is visibility under 1 km (WMO); a small boat without radar, or a diver's float, is not seen in it. Mist up to 5 km.
    if (o.vis < 1000 && L.fog) add(0, 'no', 'cr_fogNo', r1(o.vis / 1000));
    else if (o.vis < 5000) add(1 - .4 * clamp((5000 - o.vis) / 4000), 'minus', 'cr_fog', r1(o.vis / 1000));
    // Heat and cold on an exposed boat or rock (heat stress climbs from ~30–32 °C, NWS heat index bands; no humidity here), UV from 8
    // ("very high", WHO UV index: avoid the midday sun, cover up). In the water the air matters half as much.
    const k = m === 'spear' ? .5 : 1;
    if (o.temp > 30) add(1 - .4 * k * clamp((o.temp - 30) / 10), 'minus', 'cr_hot', r0(o.temp));
    if (o.temp < 10) add(1 - .3 * k * clamp((10 - o.temp) / 10), 'minus', 'cr_cold', r0(o.temp));
    if (o.uv >= 8) add(1 - .2 * k * clamp((o.uv - 7) / 4), 'minus', 'cr_uv', r0(o.uv));
    // A diver loses heat ~25× faster in water than in air: below ~20 °C it takes a thick (5–7 mm) suit and shorter sessions.
    if (m === 'spear' && o.sst < 20) add(1 - .35 * clamp((20 - o.sst) / 5), 'minus', 'cr_seaCold', r0(o.sst));
    // Darkness: spearfishing needs daylight (at night only with a licence, torch and buddy: boats cannot see a diver); a small boat at
    // night needs navigation lights (COLREGs) and is harder to find; on the shore, slippery rocks.
    const mid = o.x.t + 18e5;
    if (!(mid > o.x.rise && mid < o.x.set)) m === 'spear' ? add(0, 'no', DARK[m]) : add(L.dark, 'minus', DARK[m]); // a speargun from sunset to sunrise is banned (Fisheries Reg. 17(2)(α), KDP 416/2019; Reg. (EU) 2019/1241 Annex IX C.7)
    else if (m === 'spear' && (mid < o.x.rise + 36e5 || mid > o.x.set - 36e5)) add(.85, 'minus', 'cr_dimSpear');
    const unsafe = R.some(r => r.sign === 'no');
    let s = 1; for (const r of R) s *= r.f;
    const why = R.filter(r => r.f < .97).sort((x, y) => x.f - y.f); // stable: unsafe (f 0) first, then the largest cuts
    if (!unsafe) {
      if (why.length < 3 && ((o.cutW < .8 && o.ws0 > 12) || (o.cutV < .7 && o.wave0 > .3))) why.push({ sign: 'plus', key: 'cr_shelter', a: [] });
      if (why.length < 2 && R[0].f >= .97) why.push({ sign: 'plus', key: 'cr_windOk', a: [ws, b] });
      if (why.length < 2 && R[2].f >= .97) why.push({ sign: 'plus', key: 'cr_waveOk', a: [wv] });
    }
    return { s: unsafe ? 0 : Math.round(100 * s), unsafe, why: why.slice(0, 3) };
  }

  /* ---------- Readings at a cell ---------- */
  // ex: { temp, rain, vis, uv, code } from weather.js (missing until its data is in: those rules then simply don't apply)
  function inputs(i, h, ex) {
    const k = h * NN, b = a => bil(a, k, i), nw = nearW[i], ox = onx[i], oy = ony[i];
    const wave = b(F.wave), expo = wave > .01 ? clamp(-(b(F.wx) * ox + b(F.wy) * oy) / wave) : 1, cutV = 1 - nw * .8 * (1 - expo); // as model.js
    const u = b(F.u), v = b(F.v), ws = Math.hypot(u, v) || .01, cutW = 1 - nw * .5 * (1 - clamp(-(u * ox + v * oy) / ws));
    const sst = sat.sst?.[i];
    return { ...ex, x: hours[h], ws0: ws, wave0: wave, cutW, cutV, ws: ws * cutW, gust: b(F.gust) * cutW, wave: wave * cutV, swell: b(F.swell) * cutV,
      period: b(F.period), cur: b(F.cur), sst: sst >= 0 ? sst : b(F.sst) }; // the satellite map has gaps (NaN): then the forecast
  }
  let wxOn = false; // weather.js has its rain/temperature/visibility/UV data
  const hasWx = () => wxOn ||= !!F && isFinite(window.PsWeather?.at?.(CENTER[0], CENTER[1], state.first)?.temp);
  function extras(la, lo) { // every hour at a spot or area centre (weather.js's data come on a ~40 km grid)
    const out = [];
    if (hasWx()) for (let h = 0; h < F.T; h++) { const o = PsWeather.at(la, lo, h); if (o) out[h] = { temp: o.temp, rain: o.rain, pop: o.pop, vis: o.vis, uv: o.uv, code: o.code }; } // pop: the rain gauge's
    return out;
  }
  let hooked = false, wxWait = 0; // wxWait: 0 not waiting yet, a timer while the areas wait for weather.js, -1 done waiting
  function hook() { if (!hooked && window.PsWeather?.ready) { hooked = true; PsWeather.ready.then(() => { wxWait = -1; if (F) refreshOpen(); }); } } // its data came in (or failed)

  /* ---------- Best time to go ---------- */
  // Go = √(fish × conditions), the geometric mean: both must be decent. A not-safe hour is 0 whatever the fish.
  const goOf = (f, c) => c.unsafe ? 0 : Math.sqrt(f * c.s);
  function win(G, lo, hi) { // the best hour (the first of equals) and the hours either side within 90% of it, up to 3 h each way (a trip)
    let t = lo; for (let h = lo; h < hi; h++) if (G[h].g > G[t].g) t = h;
    if (!(G[t].g > 0)) return null;
    let a = t, b = t; const k = .9 * G[t].g;
    while (a > lo && t - a < 3 && G[a - 1].g >= k) a--;
    while (b < hi - 1 && b - t < 3 && G[b + 1].g >= k) b++;
    return { h: t, a, b };
  }
  let spotC = null;
  function spot(i) { // every hour at one cell (the selected one can be any), cached until the cell, fish, method or weather data change
    const wx = hasWx();
    if (spotC && spotC.i === i && spotC.mode === state.mode && spotC.best === best && spotC.wx === wx) return spotC;
    const ex = extras(latOf(i), lonOf(i)), G = [];
    let fb = state.first; // the fish's own best hour from now, whatever the weather
    for (let h = 0; h < F.T; h++) { const c = rate(inputs(i, h, ex[h]), state.mode), f = Math.round(scoreAt(i, h)); G[h] = { c, f, g: goOf(f, c) }; if (h > state.first && f > G[fb].f) fb = h; }
    return spotC = { i, mode: state.mode, best, wx, G, ex, fb, w: win(G, state.first, F.T), lang: '' }; // w: the best time to go, from now on
  }

  /* ---------- HTML: card, drawer ---------- */
  const rateOf = c => c.unsafe ? 'unsafe' : c.s >= 80 ? 'great' : c.s >= 60 ? 'good' : c.s >= 40 ? 'fair' : 'poor';
  const cls = c => 'c-' + (c.unsafe ? 'unsafe' : c.s >= 60 ? 'good' : c.s >= 40 ? 'fair' : 'poor');
  const verdict = c => tr('cVerdict', rateOf(c), tr('cMode')[state.mode]);
  const fmt = x => Number.isInteger(x) ? String(x) : nf(x, 1);
  const li = r => `<li><span class="${r.sign}">${r.sign === 'plus' ? '+' : r.sign === 'no' ? '✕' : '−'}</span><span>${esc(tr(r.key, ...r.a.map(fmt)))}</span></li>`;
  const num = c => `<span class="cond-num ${cls(c)}" title="${esc(verdict(c))}"><small>${esc(tr('cTitle'))}</small><span><b>${c.s}</b>/100</span></span>`;
  // flat: the verdict colour as an edge, the verdict (on the card its number first: "92/100 Great conditions…"), then the reasons (the card: the main one only)
  const whyHtml = (c, n, withNum) => `<div class="cond-why ${cls(c)}"><p>${withNum ? `<span class="cond-s" title="${esc(tr('cTitle'))}"><b>${c.s}</b>/100</span> ` : ''}<b>${esc(verdict(c))}</b></p>` +
    (n && c.why.length ? `<ul class="reasons">${c.why.slice(0, n).map(li).join('')}</ul>` : '') + `</div>`;
  const span = w => { const e = hours[w.b].t + 36e5; return `${whenT(hours[w.a].t)}–${hours[w.a].local > hours[w.b].local ? whenT(e) : hm(e)}`; }; // past midnight: the day again
  function card(i) { // the short card (the peek): the verdict in one line (and, when it is not safe, why), the best time to go under them (ui.js goRow)
    if (!F) return {};
    hook();
    const S = spot(i), c = S.G[state.h].c, w = S.w;
    return { why: whyHtml(c, c.unsafe ? 1 : 0, true), go: w ? goRow(w.h, span(w), tr('cGoNums', S.G[w.h].f, S.G[w.h].c.s)) : `<p class="cond-none">${esc(tr('cGoNone'))}</p>` };
  }
  // The go score hour by hour, as the timeline draws the best chance (map.js drawTimeline): one smooth curve coloured by the score (the past
  // greyed), its area fading down; nights darker, a hairline at midnight, now dashed, the best window lighter, the hours that are not safe a
  // red mark on the floor. Chart units: hour h at x = h + 1 (monotone() wants a point per unit; the ends padded flat), .5 … T + .5 stretched
  // to the width, 0 … CH down. The past's hatching and the playhead are HTML over it (a stretched pattern or knob would distort).
  const CH = 40;
  function goChart(S) {
    const T = F.T, G = S.G, w = S.w, n = S.k, hi = Math.max(1, ...G.map(x => x.g)), ys = G.map(x => r1(3 + (CH - 6) * (1 - x.g / hi))); // the spot's best hour at the top
    let stops = '', night = '', bad = '', sep = '', n0 = 0, b0 = -1;
    for (let h = 0; h < T; h++) {
      const x = hours[h];
      stops += `<stop offset="${((h + 1) / (T + 1)).toFixed(4)}" stop-color="${h < state.first ? greyed(G[h].g) : solid(G[h].g)}"/>`;
      if (x.period === 'night') { if (!h || hours[h - 1].period !== 'night') n0 = h; if (h === T - 1 || hours[h + 1].period !== 'night') night += `M${n0 + .5} 0H${h + 1.5}V${CH}H${n0 + .5}Z`; }
      if (G[h].c.unsafe) { if (b0 < 0) b0 = h; if (h === T - 1 || !G[h + 1].c.unsafe) { bad += `M${b0 + .5} ${CH - 3}H${h + 1.5}V${CH}H${b0 + .5}Z`; b0 = -1; } }
      if (h && x.local === 0) sep += `M${h + .5} 0V${CH}`;
    }
    const line = monotone([ys[0], ...ys, ys[T - 1]], 1);
    return { ys, html: `<div class="cg" aria-hidden="true"><svg viewBox=".5 0 ${T} ${CH}" preserveAspectRatio="none"><defs>` +
      `<linearGradient id="cg-c${n}" gradientUnits="userSpaceOnUse" x2="${T + 1}">${stops}</linearGradient>` +
      `<linearGradient id="cg-v${n}" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></linearGradient>` +
      `<mask id="cg-m${n}" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#cg-v${n})"/></mask></defs>` +
      (w ? `<rect class="cg-win" x="${w.a + .5}" width="${w.b - w.a + 1}" height="${CH}"/>` : '') +
      `<path class="tl-night" d="${night}"/><path d="${line}V${CH}H0Z" fill="url(#cg-c${n})" mask="url(#cg-m${n})"/>` + (sep ? `<path class="cg-sep" d="${sep}"/>` : '') +
      `<path class="cg-now" d="M${state.first + .5} 0V${CH}"/>` + (bad ? `<path class="cg-bad" d="${bad}"/>` : '') + `<path class="cg-line" d="${line}" stroke="url(#cg-c${n})"/></svg>` +
      `<b class="cond-past" style="width:${(state.first / T * 100).toFixed(2)}%"></b><i class="cg-ph"><b></b></i></div>` };
  }
  // ui.js rewrites a details part only when its HTML changes. The conditions part's is the same at every hour (its <ps-cond> names the
  // spot's block), so an hour step leaves it alone and drawer() fills the block in place: the verdict, the instruments (js/instruments.js),
  // "Go there" and the curve's playhead; nothing is parsed, and the needles glide. The block is built once per spot and language, off the
  // page; the <ps-cond> that shows it (the desktop drawer or the phone sheet) takes it over.
  let live = null, condN = 0;
  window.customElements?.define('ps-cond', class extends HTMLElement {
    connectedCallback() { if (!this.firstChild && live?.k === +this.dataset.k) { this.appendChild(live.el); fill(live, state.h); } }
  });
  function build(S) {
    const w = S.w, fb = S.fb, top = S.G[fb].f > (w ? S.G[w.h].f : 0) ? esc(tr('cFishTop', whenT(hours[fb].t), S.G[fb].f)) : ''; // the fish's own best: a sub-line, so only one "best" leads
    // the window first, its numbers under it; "Go there" (hidden while the map is on that hour)
    const go = w ? `<div class="best-time">${ic('clock', 'lg')}<div><small>${esc(tr('cGoLbl'))}</small><b>${esc(span(w))}</b><small>${esc(tr('cGoNums', S.G[w.h].f, S.G[w.h].c.s))}</small>${top ? `<small>${top}</small>` : ''}</div>` +
      `<button class="btn" data-hour="${w.h}">${tr('goThere')}</button></div>` : `<p class="cond-none">${esc(tr('cGoNone'))}${top ? `<br>${top}` : ''}</p>`;
    let days = '';
    for (let s = 0, h = 1; h <= F.T; h++) if (h === F.T || hours[h].local === 0) { // a weekday under each day (none under a short first or last day)
      days += `<span style="flex:${h - s}">${h - s >= 8 ? esc(fmtT(hours[s].t, { weekday: 'short' })) : ''}</span>`; s = h;
    }
    const ch = goChart(S), inst = window.PsInst?.panel(), el = document.createElement('div');
    el.className = 'cond-live';
    el.innerHTML = `<div class="cond-v"></div>${go}<div class="cg-card"><span class="lbl">${esc(tr('cg_title'))}</span>${ch.html}<div class="cond-days" aria-hidden="true">${days}</div>` +
      `<p class="hint">${esc(tr('cGoHow'))}</p></div>`; // the go curve as a card of its own, its key under it
    if (inst) el.firstChild.after(inst.el);
    const cg = el.querySelector('.cg'), ph = cg.querySelector('.cg-ph');
    cg.addEventListener('click', e => { const r = cg.getBoundingClientRect(); if (F && r.width) setHour(Math.max(0, Math.min(F.T - 1, Math.floor((e.clientX - r.left) / r.width * F.T)))); }); // a tap picks its hour
    return { k: S.k, S, el, v: el.firstChild, inst, go: w && el.querySelector('.best-time [data-hour]'), ph, kn: ph.firstChild, ys: ch.ys, why: '' };
  }
  function fill(L, h) { // the block at hour h: only what changed is written
    const S = L.S, why = whyHtml(S.G[h].c, 3);
    if (L.why !== why) L.v.innerHTML = L.why = why;
    if (L.inst) try { L.inst.set(reads(S, h)); } catch (e) { console.warn(e); }
    if (L.go && L.go.hidden !== (S.w.h === h)) L.go.hidden = S.w.h === h;
    L.ph.style.transform = `translateX(${((h + .5) / F.T * 100).toFixed(2)}%)`; L.kn.style.transform = `translateY(${(L.ys[h] / CH * 100).toFixed(1)}%)`;
  }
  // the instruments' readings: the conditions' own (after the coast's shelter), with where the wind and waves come from
  const from = (x, y) => (Math.atan2(-x, -y) * 180 / Math.PI + 360) % 360;
  function reads(S, h) {
    const i = S.i, k = h * NN, b = a => bil(a, k, i);
    return { ...inputs(i, h, S.ex[h]), wdir: from(b(F.u), b(F.v)), vdir: from(b(F.wx), b(F.wy)), la: latOf(i), lo: lonOf(i) };
  }
  function drawer(i) {
    if (!F) return {};
    hook();
    const S = spot(i), c = S.G[state.h].c;
    if (S.lang !== state.lang) { S.lang = state.lang; S.k = ++condN; }
    if (live?.k !== S.k) live = build(S); else if (live.el.isConnected) fill(live, state.h); // an hour step: in place
    return { badge: num(c), body: `<section class="cond-sec"><h4>${ic('waves', 'sm')}${tr('cHead')}</h4><ps-cond data-k="${S.k}"></ps-cond></section>` };
  }

  /* ---------- Areas: best windows today, tomorrow and later in the week ---------- */
  const AREAS = window.PSAREMA_AREAS || [];
  const members = []; // per area, filled by compute() an area at a time (~1 ms each), inside its slices
  function memberCells(a) { // the area's sea cells every 500 m that lie within its radius and nearer its centre than any other's
    const out = [], cx = (a.lon - WEST) / RES, cy = (NORTH - a.lat) / RES, rx = Math.ceil(a.r / KX), ry = Math.ceil(a.r / KY);
    for (let y = Math.max(0, Math.round(cy - ry)); y <= Math.min(H - 1, cy + ry); y += 2)
      for (let x = Math.max(0, Math.round(cx - rx)); x <= Math.min(W - 1, cx + rx); x += 2) {
        const i = y * W + x; if (!depth[i] || northMask[i]) continue;
        const p = [latOf(i), lonOf(i)], d = km([a.lat, a.lon], p).d;
        if (d <= a.r && !AREAS.some(o => o !== a && km([o.lat, o.lon], p).d < Math.min(d, o.r + 1e-9))) out.push(i);
      }
    return out;
  }
  const reach = (i, m) => m === 'shore' ? dist[i] <= .5 : m === 'spear' ? depth[i] < 30 && dist[i] < 2 : dist[i] <= 5; // where each method fishes
  function pick(list, gap, n = 30) { // up to n cells at least `gap` km apart, in list order
    const out = [];
    for (const i of list) {
      const x = i % W, y = i / W | 0;
      if (out.every(j => Math.hypot((j % W - x) * KX, ((j / W | 0) - y) * KY) >= gap)) out.push(i);
      if (out.length === n) break;
    }
    return out;
  }
  const exArea = new Map(); // area id -> weather.js extras at its centre (they come on a ~40 km grid: the centre stands for the area)
  function areaStart(a, mem, mode) {
    // Cells the fish can score in (best where-fit first, spread out); none (a banned fish, or out of reach): conditions alone, fish "·".
    let cells = pick(mem.filter(i => cur.where[i] > 0).sort((x, y) => cur.where[y] - cur.where[x]), 1);
    const fish = cells.length > 0;
    if (!fish) cells = pick(mem.filter(i => reach(i, mode)), 2);
    if (!exArea.has(a.id) && hasWx()) exArea.set(a.id, extras(a.lat, a.lon));
    return { a, fish, cells, ex: exArea.get(a.id) || [], G: [] };
  }
  function areaHour(r, h, mode) { // the area's best cell that hour
    let top = { g: 0 };
    for (const i of r.cells) {
      const f = r.fish ? Math.round(scoreAt(i, h)) : 0;
      if (r.fish && f * 100 <= top.g * top.g) continue; // even conditions 100 could not beat the best so far: no need to rate it
      const c = rate(inputs(i, h, r.ex[h]), mode); if (c.unsafe) continue;
      const g = r.fish ? goOf(f, c) : c.s;
      if (g > top.g) top = { g, i, f, c: c.s };
    }
    r.G[h] = top;
  }
  function areaEnd(r, days) { // today's and tomorrow's best windows, and the best one of the days after (it names its day)
    const d = days.map(([d0, d1]) => { const w = win(r.G, d0, d1); return w && { ...r.G[w.h], ...w }; });
    const later = d.slice(2).reduce((x, y) => y && (!x || y.g > x.g) ? y : x, null), out = [d[0], d[1], later && { ...later, day: true }];
    return { a: r.a, fish: r.fish, d: out, top: Math.max(0, ...out.map(x => x?.g ?? 0)) };
  }
  const A = { key: [], run: 0, rows: null, ver: 0, shown: '' };
  function compute(run) { // area by area, hour by hour, in 12 ms slices (a week of ~30 cells per area), so taps and the timeline never wait on it
    const days = tlDays(state.first), mode = state.mode, out = [];
    let k = 0, h = state.first, r = null;
    const step = () => {
      if (run !== A.run) return;
      if (!seenSoon()) { A.key = []; return; } // hidden meanwhile: stop, and start again once it shows
      const until = performance.now() + 12;
      do {
        if (k === AREAS.length) { A.rows = out.sort((x, y) => (y.fish - x.fish) || (y.top - x.top)); A.ver++; drawAreas(); return; }
        if (!r) r = areaStart(AREAS[k], members[k] ||= memberCells(AREAS[k]), mode);
        else if (h < F.T) areaHour(r, h++, mode);
        else { out.push(areaEnd(r, days)); r = null; k++; h = state.first; }
      } while (performance.now() < until);
      setTimeout(step, 0);
    };
    setTimeout(step, 0);
  }
  // One row per area, read at a glance (round 11): the name, its best window this week (today, tomorrow or the day it falls on) and the fish's
  // chance then in its heat colour; the sea only when it is a caution (the windows already leave out hours that are not safe). A tap opens
  // the area's page (js/areas.js, before this file's own listener; without it, the window on the map).
  function renderAreas() {
    const box = $('#areas-body');
    if (!A.rows) { box.innerHTML = `<div class="hint">${esc(tr('cAreaWait'))}</div>`; return; } // app.css shows a lone hint as the empty-list box
    box.innerHTML = `<ol class="area-list">${A.rows.map(r => {
      const k = r.d.reduce((x, y, n) => y && (x < 0 || y.g > r.d[x].g) ? n : x, -1), d = r.d[k], name = esc(L10(r.a));
      if (!d) return `<li class="area ar"><button class="a-name" data-area="${r.a.id}" data-h="-1" data-i="-1"><span class="ar-t"><b>${name}</b><small>${esc(tr('cAreaNone'))}</small></span>${ic('chevron-right', 'sm')}</button></li>`;
      const day = k === 0 ? tr('cToday') : k === 1 ? tr('cTomorrow') : fmtT(hours[d.h].t, { weekday: 'long' }), c = rateOf({ s: d.c });
      const warn = c === 'fair' || c === 'poor' ? ` <i class="${cls({ s: d.c })}">· ${esc(tr('cAreaWarn')[c])}</i>` : '';
      return `<li class="area ar"><button class="a-name" data-area="${r.a.id}" data-h="${d.h}" data-i="${d.i}" title="${esc(`${L10(r.a)} · ${whenT(hours[d.h].t)} · ${tr('cGoNums', r.fish ? d.f : '–', d.c)}`)}">` +
        `<span class="ar-t"><b>${name}</b><small>${esc(day)} ${hm(hours[d.a].t)}–${hm(hours[d.b].t + 36e5)}${warn}</small></span>` +
        (r.fish ? `<span class="ar-s" style="color:${solid(d.f)}">${d.f}</span>` : '') + `${ic('chevron-right', 'sm')}</button></li>`;
    }).join('')}</ol>`;
  }
  // The list is worked out only while it can be seen (round 17 G: its fold under Where to go open; the rail open; phones: the sheet up): no work for a list nobody looks at.
  const seen = box => box.checkVisibility?.({ checkVisibilityCSS: true, visibilityProperty: true }) ?? true;
  // round 16 X: the 12 ms slices below look at most every 0.1 s: each look is a style pass, and while the sheet is dragged every frame dirties it
  let seenAt = -1e9, seenV = true;
  const seenSoon = () => { const t = performance.now(); if (t - seenAt > 100) { seenAt = t; seenV = seen($('#areas-body')); } return seenV; };
  function drawAreas() { // ui.js refreshOpen() calls this after every render: recomputes only when the fish, method or weather data change
    const box = $('#areas-body'); if (!box || !F || !AREAS.length || !seen(box)) return;
    hook();
    // weather.js's extras land just after the first render: wait for them (up to 4 s) rather than work every area out twice
    const wx = hasWx(), wait = !wx && wxWait >= 0 && !!window.PsWeather?.attach;
    if (wait && !wxWait) { wxWait = setTimeout(() => { wxWait = -1; drawAreas(); }, 4000); setTimeout(hook, 0); } // app.js attaches weather.js right after the first render
    const key = [best, state.mode, wx];
    if (!wait && key.some((v, k) => v !== A.key[k])) { A.key = key; A.rows = null; A.ver++; compute(++A.run); } // the wait box, not another fish's or method's windows
    const sig = `${A.ver}|${state.lang}|${state.mode}`;
    if (sig !== A.shown) { A.shown = sig; renderAreas(); }
  }
  // Round 16 X: from the outside (every render, every class change of the sheet: each snap and drag), once in the next frame. Its
  // checkVisibility needs styles: called in the middle of a render or a snap, it forced a style pass there that the frame then did again
  let areasRaf = 0;
  const drawAreasSoon = () => { areasRaf ||= requestAnimationFrame(() => { areasRaf = 0; drawAreas(); }); };
  // shown again (the tab, the rail, the phone sheet): catch up then
  const showing = new MutationObserver(drawAreasSoon);
  for (const [s, a] of [['#areas-fold', 'open'], ['#rail', 'class'], ['#m-main', 'hidden'], ['#m-sheet', 'class']]) { const el = $(s); if (el) showing.observe(el, { attributes: true, attributeFilter: [a] }); }
  $('#areas-body')?.addEventListener('click', e => {
    const b = e.target.closest('[data-area]'); if (!b || !F) return;
    const a = AREAS.find(x => x.id === b.dataset.area), i = +b.dataset.i;
    if (i >= 0) { setHour(+b.dataset.h); map.setView([latOf(i), lonOf(i)], Math.max(map.getZoom(), 12)); openCell(i); } // like a top spot
    else map.flyTo([a.lat, a.lon], Math.max(map.getZoom(), 11), { duration: .6 });
  });

  // Self-check of the rules (day and night at 12:00 / 00:00 UTC on a day with sunrise 04:00, sunset 15:00 UTC).
  const day = { t: 12 * 36e5, rise: 4 * 36e5, set: 15 * 36e5 }, night = { ...day, t: 0 };
  const calm = { x: day, ws: 8, ws0: 8, gust: 14, wave: .3, wave0: .3, swell: .1, period: 4, cur: .2, sst: 24, temp: 26, rain: 0, vis: 30000, uv: 6, code: 1, cutW: 1, cutV: 1 };
  console.assert(rate(calm, 'boat').s >= 90 && !rate(calm, 'boat').unsafe, 'conditions: calm day is great for a boat');
  console.assert(rate({ ...calm, ws: 30 }, 'boat').unsafe && !rate({ ...calm, ws: 30 }, 'shore').unsafe, 'conditions: Bft 5 stops boats, not shore');
  console.assert(rate({ ...calm, code: 95 }, 'shore').unsafe && rate({ ...calm, code: 95 }, 'shore').why[0].key === 'cr_thunder', 'conditions: thunder first');
  console.assert(rate({ ...calm, x: night }, 'spear').s < 40 && rate({ ...calm, x: night }, 'boat').s < rate(calm, 'boat').s, 'conditions: dark');
  console.assert(rate({ ...calm, wave: .8, period: 3.5 }, 'boat').why.some(r => r.key === 'cr_chop'), 'conditions: steep chop');
  console.assert(win([{ g: 1 }, { g: 5 }, { g: 4.6 }, { g: 2 }], 0, 4).a === 1 && win([{ g: 1 }, { g: 5 }, { g: 4.6 }, { g: 2 }], 0, 4).b === 2, 'conditions: window');

  return { card, drawer, drawAreas: drawAreasSoon, rate, lim: m => LIM[m] }; // lim: the instruments' zones (js/instruments.js)
})();
