'use strict';
// Psarema instruments (css/instruments.css): the sea and sky as a yacht's instrument panel, drawn from the forecast's own numbers.
// panel(): the spot details' Conditions grid (js/conditions.js): wind compass, wave dial, sea and rain gauges, the sun's day, the moon.
// strip(): the readings strip (map.js drawConditions: the phone sheet's readings row, the desktop HUD), each reading led by a mini instrument.
// Each is built once (per spot or place, method, fish and language); an hour step only sets text, attributes and transforms on it, so CSS
// glides the needles (transform) and the arcs (the registered --igv) and nothing is parsed again. Directions as everywhere in the app: named
// by where wind and waves come from (SW), the arrow pointing where they go. Colours: the method's own limits (js/conditions.js LIM) in
// the meaning colours, comfortable, caution, not safe; nothing else is coloured but the sun.
const PsInst = window.PsInst = (() => {
  const D = Math.PI / 180, f1 = x => Math.round(x * 10) / 10;
  const pol = (r, a) => [f1(Math.sin(a * D) * r), f1(-Math.cos(a * D) * r)]; // compass degrees (0 up, clockwise) around (0, 0)
  const arc = (r, a0, a1) => { const [x0, y0] = pol(r, a0), [x1, y1] = pol(r, a1); return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
  const from = (x, y) => (Math.atan2(-x, -y) / D + 360) % 360; // where a vector (east, north) comes from
  const put = (el, s) => { if (el.textContent !== s) el.textContent = s; }; // only what changed is written
  const attr = (el, k, v) => { if (el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const move = (el, t) => { if (el.psT !== t) { el.psT = t; el.style.transform = t; } };
  const vset = (el, v) => { const s = (Math.max(0, Math.min(1, v)) * 100).toFixed(1); if (el.psV !== s) { el.psV = s; el.style.setProperty('--igv', s); } }; // an arc's share, 0–1
  const cset = (el, c) => { if (el.psC !== c) { if (el.psC) el.classList.remove(el.psC); if (c) el.classList.add(c); el.psC = c; } };
  function turn(el, a) { // the short way round from where it points: 350° → 10° turns +20°, never −340° (and from north as it appears: −180…180°)
    const p = el.psA ?? ((a % 360) + 540) % 360 - 180, n = p + ((a - p) % 360 + 540) % 360 - 180;
    if (el.psA !== n) { el.psA = n; el.style.transform = `rotate(${n.toFixed(1)}deg)`; }
  }
  // the method's limits [comfortable, not safe] (js/conditions.js rate(): wind and gusts are not safe from the limit, waves past it)
  const zone = (x, [a, b], past) => (past ? x > b : x >= b) ? 'c-unsafe' : x > a ? 'c-fair' : 'c-good';
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  const names = () => window.PsWeather?.names?.[state.lang] || window.PsWeather?.names?.en;

  /* ---------- Dials: wind and waves ---------- */
  // 270°, open at the bottom, inside a compass bezel (a tick every 10°, the language's N on top). The value is an arc in the method's
  // colours with its caution and not-safe zones marked outside the track; a fainter arc runs on to the gusts. A bug on the bezel points where
  // it goes, a short tail where it comes from. The number in the middle; under it the Beaufort force, or the sea's shape.
  const A0 = -135, SWEEP = 270, WMAX = 60, VMAX = 3; // km/h (Bft 7), metres
  let uid = 0;
  function dialHtml(max, lim, unit, wave) {
    const at = v => A0 + SWEEP * Math.min(1, v / max), track = arc(31, A0, A0 + SWEEP);
    let tk = '', tc = '';
    for (let a = 10; a < 360; a += 10) { const [x0, y0] = pol(a % 90 ? 45 : 41.5, a), [x1, y1] = pol(48.5, a), s = `M${x0} ${y0}L${x1} ${y1}`; if (a % 90) tk += s; else tc += s; }
    return `<svg class="ig-dial" viewBox="-54 -54 108 108" role="img"><path class="ig-tk" d="${tk}"/><path class="ig-tk c" d="${tc}"/>` +
      `<text class="ig-n" y="-45">${esc(tr('dirs')[0])}</text>` +
      `<path class="ig-zone c-fair" d="${arc(37, at(lim[0]), at(lim[1]))}"/>` + (lim[1] < max ? `<path class="ig-zone c-unsafe" d="${arc(37, at(lim[1]), A0 + SWEEP)}"/>` : '') +
      `<path class="ig-trk" d="${track}"/><path class="ig-arc pk" pathLength="100" d="${track}"/><path class="ig-arc" pathLength="100" d="${track}"/>` +
      `<g class="ig-bug"><path d="M0-54L6-42.5H-6Z"/><path class="ig-tail" d="M0 41.5V50"/></g>` +
      `<text class="ig-num" y="-3">–</text><text class="ig-unit" y="15.5">${unit}</text>` +
      (wave ? `<path class="ig-sea" d="M-17 36H17"/>` : `<text class="ig-gap" y="38"></text>`) + `</svg>`;
  }
  const dialRefs = el => { const q = s => el.querySelector(s); return { svg: q('.ig-dial'), arc: q('.ig-arc:not(.pk)'), pk: q('.ig-arc.pk'), bug: q('.ig-bug'), num: q('.ig-num'), gap: q('.ig-gap'), sea: q('.ig-sea') }; };
  // The sea's shape under the wave dial: crest to trough H, wavelength 1.56·T² m (deep water), 100 m of it across 34 px, drawn 8× steeper
  // than true so a metre shows: flat when calm, long and low for a swell, short and steep for a chop.
  function seaPath(H, T) {
    const k = 34 / 100, L = Math.max(1, 1.56 * T * T) * k, a = Math.min(6, H / 2 * k * 8);
    let d = '';
    for (let x = -17; x <= 17.01; x += .85) d += `${d ? 'L' : 'M'}${f1(x)} ${f1(36 - a * Math.cos(2 * Math.PI * (x + 17) / L))}`;
    return d;
  }

  /* ---------- The sun's day and the moon ---------- */
  // The sun's altitude at the spot from local midnight to midnight (SunCalc, every 20 min) over the horizon; dawn and dusk in gold: the
  // app's own windows (an hour before sunrise to 1½ h after it, 1½ h before sunset to an hour after it, js/sources.js), the fish's prime
  // times; its highest altitude over noon; the sun at the hour, gold above the horizon, a grey ring below it.
  const SX = h => f1(6 + h / 24 * 188), SY = alt => f1(56 - alt / D * .65); // alt in radians: the horizon at 56, 80° at 4
  const sunAlt = (t, la, lo) => SunCalc.getPosition(new Date(t), la, lo).altitude;
  function sunDay(R, x, la, lo) {
    const m = x.t - x.local * 36e5; // local midnight (Cyprus keeps whole-hour offsets)
    if (R.day === m) return;
    R.day = m;
    let d = '', g = '', top = [12, 0];
    for (let k = 0; k <= 72; k++) { const a = sunAlt(m + k * 12e5, la, lo); d += `${k ? 'L' : 'M'}${SX(k / 3)} ${SY(a)}`; if (a > top[1]) top = [k / 3, a]; }
    for (const [a, b] of [[x.rise - 36e5, x.rise + 54e5], [x.set - 54e5, x.set + 36e5]]) {
      const h0 = (a - m) / 36e5, h1 = (b - m) / 36e5;
      if (h1 <= 0 || h0 >= 24) continue;
      for (let t = Math.max(a, m), j = 0; t <= Math.min(b, m + 864e5) + 1; t += 6e5, j++) g += `${j ? 'L' : 'M'}${SX((t - m) / 36e5)} ${SY(sunAlt(t, la, lo))}`;
    }
    attr(R.curve, 'd', d); attr(R.gold, 'd', g); attr(R.peak, 'x', String(SX(top[0]))); attr(R.peak, 'y', String(SY(top[1]) - 9)); put(R.peak, `${Math.round(top[1] / D)}°`);
    for (const [el, t] of [[R.rise, x.rise], [R.set, x.set]]) attr(el, 'd', `M${SX((t - m) / 36e5)} 51.5V60.5`);
    put(R.riseT, hm(x.rise)); put(R.setT, hm(x.set));
  }
  // The moon's phase drawn lit on the right (the terminator an ellipse of half-width r·|cos 2πp|), then turned as it hangs in the sky at the
  // spot: its bright limb's angle from the zenith (SunCalc: the limb's angle less the parallactic angle). Dimmed while below the horizon.
  const moonPath = (p, r) => { const k = Math.cos(2 * Math.PI * p); return `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${f1(r * Math.abs(k))} ${r} 0 0 ${k > 0 ? 0 : 1} 0 ${-r}Z`; };
  function moonAt(t, la, lo) {
    const d = new Date(t), m = SunCalc.getMoonIllumination(d), q = SunCalc.getMoonPosition(d, la, lo);
    return { phase: m.phase, lit: m.fraction, tilt: -(m.angle - q.parallacticAngle) / D - 90, up: q.altitude > 0 };
  }
  const moonSvg = (r, cls) => `<svg class="${cls}" viewBox="${-r - 1} ${-r - 1} ${2 * r + 2} ${2 * r + 2}" aria-hidden="true"><circle class="ig-mb" r="${r}"/><path class="ig-lit"/><circle class="ig-rim" r="${r}"/></svg>`;
  function moonSet(svg, mo, r) {
    const lit = svg.querySelector('.ig-lit');
    attr(lit, 'd', moonPath(mo.phase, r)); turn(lit, mo.tilt); svg.classList.toggle('down', !mo.up);
  }
  const phaseName = p => tr('phases')[Math.round(p * 8) % 8];

  /* ---------- The details' panel ---------- */
  // Wind and waves dials, sea and rain gauges stacked beside them; the sun's day across two columns, the moon. Captions are text (they
  // grow with the system's text size and wrap in Greek); the SVGs scale with their cell.
  function panel() {
    const L = PsCond.lim(state.mode), s = sp, n = ++uid, band = s.sst && !s.all, TX = t => f1(Math.max(0, Math.min(100, (t - 12) / 20 * 100))); // the sea's scale: 12–32 °C
    const el = document.createElement('div');
    el.className = 'ig';
    el.innerHTML = `<div class="ig-c ig-wind"><span class="lbl">${esc(tr('k_wind'))}</span>${dialHtml(WMAX, L.wind, 'km/h')}<span class="ig-cap"><b></b><small></small></span></div>` +
      `<div class="ig-c ig-wave"><span class="lbl">${esc(tr('k_waves'))}</span>${dialHtml(VMAX, L.wave, 'm', true)}<span class="ig-cap"><b></b><small></small></span></div>` +
      `<div class="ig-c ig-col"><div class="ig-g ig-sst"><span class="lbl">${esc(tr('k_sea'))}</span><b class="ig-big"></b>` +
      `<svg class="ig-bar" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><rect class="ig-bt" y="5" width="100" height="3" rx="1.5"/>` +
      (band ? `<rect class="ig-band" x="${TX(s.sst[0])}" y="5" width="${f1(TX(s.sst[3]) - TX(s.sst[0]))}" height="3"/><rect class="ig-band in" x="${TX(s.sst[1])}" y="4" width="${f1(TX(s.sst[2]) - TX(s.sst[1]))}" height="5" rx="1"/>` : '') +
      `<rect class="ig-mk" x="-1" y="1" width="2" height="11" rx="1"/></svg><small></small></div>` +
      `<div class="ig-g ig-rain"><span class="lbl">${esc(tr('in_rain'))}</span><b class="ig-big"></b>` +
      `<svg class="ig-bar" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><rect class="ig-bt" y="5" width="100" height="3" rx="1.5"/><rect class="ig-fill" y="4" width="100" height="5" rx="1"/></svg><small></small></div></div>` +
      // round 17 G: the sun and the moon in one card (they were two): the day's arc, and the moon beside it
      `<div class="ig-c ig-sky"><span class="lbl">${esc(tr('g17_sunMoon'))}</span><div class="ig-skyin"><div class="ig-day"><svg class="ig-sun" viewBox="0 0 200 76" aria-hidden="true">` +
      `<defs><linearGradient id="ig-alt${n}" gradientUnits="userSpaceOnUse" x2="0" y2="76"><stop offset=".737" stop-color="#fff" stop-opacity=".75"/><stop offset=".737" stop-color="#fff" stop-opacity=".18"/></linearGradient></defs>` +
      `<path class="ig-hz" d="M0 56H200"/><path class="ig-tk" d="${[6, 12, 18].map(h => `M${SX(h)} 56V59.5`).join('')}"/>` +
      `<path class="ig-curve" stroke="url(#ig-alt${n})"/><path class="ig-gold"/><path class="ig-rs"/><path class="ig-rs"/>` +
      `<text class="ig-peak"/><g class="ig-sunat"><circle class="ig-glow" r="10"/><circle class="ig-disc" r="5"/></g></svg>` +
      `<span class="ig-row"><span>${ic('sunrise', 'sm')}<b></b></span><b class="ig-per"></b><span><b></b>${ic('sunset', 'sm')}</span></span></div>` +
      `<div class="ig-moon">${moonSvg(22, 'ig-mo')}<span class="ig-cap"><b></b><small></small><small class="ig-sol"></small></span></div></div></div>`;
    const q = s => el.querySelector(s), caps = sel => [...el.querySelectorAll(sel + ' .ig-cap > *')];
    const sky = q('.ig-sun'), row = el.querySelectorAll('.ig-row b'), rs = sky.querySelectorAll('.ig-rs');
    const R = { wind: dialRefs(q('.ig-wind')), wave: dialRefs(q('.ig-wave')), wc: caps('.ig-wind'), vc: caps('.ig-wave'), mc: caps('.ig-moon'),
      sst: q('.ig-sst .ig-big'), sstMk: q('.ig-mk'), sstC: q('.ig-sst small'), rain: q('.ig-rain .ig-big'), rainF: q('.ig-fill'), rainC: q('.ig-rain small'),
      sun: { curve: sky.querySelector('.ig-curve'), peak: sky.querySelector('.ig-peak'), gold: sky.querySelector('.ig-gold'), rise: rs[0], set: rs[1], riseT: row[0], setT: row[2], at: sky.querySelector('.ig-sunat') },
      per: row[1], moon: q('.ig-mo') };
    return { el, set: v => panelSet(R, v, L, s, TX) };
  }
  // v: the readings at the spot and hour (js/conditions.js reads()): ws, gust, wdir, wave, period, swell, vdir, sst, rain, pop, code, x, la, lo
  function panelSet(R, v, L, s, TX) {
    const N = names(), x = v.x, b = PsWeather.beaufort(v.ws), d = PsWeather.douglas(v.wave);
    // wind: the needle with the wind (from + 180°), the arc to the wind and on to the gusts, each in its own limit's colour
    turn(R.wind.bug, v.wdir + 180); vset(R.wind.arc, v.ws / WMAX); vset(R.wind.pk, v.gust / WMAX);
    cset(R.wind.arc, zone(v.ws, L.wind)); cset(R.wind.pk, zone(v.gust, L.gust));
    put(R.wind.num, String(Math.round(v.ws))); put(R.wind.gap, tr('in_bft', b)); attr(R.wind.svg, 'aria-label', `${tr('k_wind')} ${Math.round(v.ws)} km/h`); // the caption under it says the rest
    put(R.wc[0], `${compass(v.wdir)} · ${tr('gust')} ${Math.round(v.gust)}`); put(R.wc[1], N?.bft[b] || '');
    // waves: the needle with the waves, the height against the method's limits, the sea's shape under it
    turn(R.wave.bug, v.vdir + 180); vset(R.wave.arc, v.wave / VMAX); vset(R.wave.pk, 0); cset(R.wave.arc, zone(v.wave, L.wave, true));
    put(R.wave.num, nf(v.wave)); attr(R.wave.sea, 'd', seaPath(v.wave, v.period)); attr(R.wave.svg, 'aria-label', `${tr('k_waves')} ${nf(v.wave)} m`);
    put(R.vc[0], `${compass(v.vdir)} · ${Math.round(v.period)} s`); put(R.vc[1], N?.sea[d] || '');
    // the sea against the fish's range (tolerated, liked); the rain, its chance, thunder
    put(R.sst, `${nf(v.sst)}°`); move(R.sstMk, `translateX(${TX(v.sst)}px)`);
    put(R.sstC, s.all || !s.sst ? '' : tr(v.sst < s.sst[1] ? 'in_sstLo' : v.sst > s.sst[2] ? 'in_sstHi' : 'in_sstOk'));
    const wet = isFinite(v.rain), thunder = v.code >= 95;
    put(R.rain, wet ? `${nf(v.rain)} mm/h` : '–'); move(R.rainF, `scaleX(${wet ? Math.sqrt(Math.min(v.rain, 10) / 10).toFixed(3) : 0})`);
    cset(R.rainF, thunder ? 'c-unsafe' : ''); cset(R.rainC, thunder ? 'c-unsafe' : '');
    put(R.rainC, thunder ? tr('in_thunder') : isFinite(v.pop) ? tr('in_pop', Math.round(v.pop)) : '');
    // the sun: today's curve once a day, the sun moved along it each hour; the hour's part of the day, in gold at dawn and dusk
    sunDay(R.sun, x, v.la, v.lo);
    const alt = sunAlt(x.t, v.la, v.lo);
    move(R.sun.at, `translate(${SX((x.t - R.sun.day) / 36e5)}px,${Math.min(69, SY(alt))}px)`); // deep in the night: at the bottom edge, still in view R.sun.at.classList.toggle('down', alt < 0);
    put(R.per, cap(tr(x.period))); R.per.classList.toggle('gold', x.period === 'dawn' || x.period === 'dusk');
    // the moon: phase, light, whether it is up, the solunar period now or the next major one
    const mo = moonAt(x.t + 18e5, v.la, v.lo), nx = !x.solunar && events.major.find(([, e]) => e > x.t);
    moonSet(R.moon, mo, 22);
    put(R.mc[0], phaseName(mo.phase)); put(R.mc[1], mo.up ? tr('in_lit', Math.round(mo.lit * 100)) : tr('in_moonDown', Math.round(mo.lit * 100)));
    put(R.mc[2], x.solunar ? tr(x.solunar === 'major' ? 'in_majorNow' : 'in_minorNow') : nx ? tr('in_nextMajor', whenT(Math.max(nx[0], x.t)).replace(' ', ' ')) : ''); // round 16 P: "Sun 15:40" stays on one line
    R.mc[2].classList.toggle('on', !!x.solunar); R.mc[2].classList.toggle('major', x.solunar === 'major');
  }

  /* ---------- The readings strip ---------- */
  // The place, then wind, waves, sea, sun and moon (phones keep the first four: css/mobile.css), each reading led by a 20 px instrument:
  // a compass with the wind's needle, the wave height's arc with the waves' needle, a thermometer, the sun on its day's arc, the moon.
  // Calm readings stay grey; wind and waves past what is comfortable for the method turn amber, past its limit red. Built once per
  // language and method, then patched: the needles glide.
  const MI = {
    wind: `<svg class="mi" viewBox="-10 -10 20 20" aria-hidden="true"><circle class="mi-ring" r="8.4"/><path class="mi-n" d="M0-6.6L-1.7-9.9H1.7Z"/><g class="mi-ndl"><path d="M0-7.4L3.2 1.6 0 .1-3.2 1.6Z"/><path class="mi-tail" d="M0 .6V7"/></g></svg>`,
    wave: `<svg class="mi" viewBox="-10 -10 20 20" aria-hidden="true"><path class="mi-trk" d="${arc(8.2, A0, A0 + SWEEP)}"/><path class="mi-arc" pathLength="100" d="${arc(8.2, A0, A0 + SWEEP)}"/>` +
      `<g class="mi-ndl"><path d="M0-4.8L2.5 1 0 0-2.5 1Z"/><path class="mi-tail" d="M0 .4V4.6"/></g></svg>`,
    sea: `<svg class="mi mi-th" viewBox="-5 -10 10 20" aria-hidden="true"><rect class="mi-trk2" x="-1.7" y="-9" width="3.4" height="14" rx="1.7"/><circle class="mi-bulb" cy="6.2" r="3.2"/><rect class="mi-lvl" x="-1.7" y="-9" width="3.4" height="14" rx="1.7"/></svg>`,
    sun: `<svg class="mi mi-sun" viewBox="0 0 28 18" aria-hidden="true"><path class="mi-hz" d="M0 15H28"/><path class="mi-day" d="M3 15A11 11 0 0 1 25 15"/><circle class="mi-s" r="2.7"/></svg>`,
  };
  function stripHtml() {
    const chip = (k, mi) => `<span class="chip" title="${esc(tr(k))}">${mi}<span></span><small></small></span>`;
    return `<span class="chip where">${ic('pin', 'sm')}<span></span></span>` + chip('k_wind', MI.wind) + chip('k_waves', MI.wave) + chip('k_sea', MI.sea) + chip('k_sun', MI.sun) +
      `<span class="chip">${moonSvg(8.2, 'mi')}<span></span></span>`;
  }
  // the readings at cell i and hour h, as the card's (model.js scoreAt: the wind and waves after the coast's shelter)
  function strip(box, i, h) {
    if (!box || !F) return;
    const key = state.lang + state.mode;
    if (box.psKey !== key) { box.psKey = key; box.innerHTML = stripHtml(); box.psR = [...box.children].map(c => ({ c, v: c.children[1], s: c.querySelector('small'), m: c.querySelector('.mi') })); }
    const [P, Wd, Wv, Se, Su, Mo] = box.psR, k = h * NN, x = hours[h], raw = n => bil(F[n], k, i), o = {}, L = PsCond.lim(state.mode);
    scoreAt(i, h, o);
    const dir = from(raw('u'), raw('v')), sh = o.ws ? o.wsEff / o.ws : 1, gust = raw('gust') * sh, sst = sat.sst?.[i] >= 0 ? sat.sst[i] : raw('sst'), where = describe(latOf(i), lonOf(i));
    const calm = c => c === 'c-good' ? '' : c; // the strip stays grey until it matters
    put(P.v, where); attr(P.c, 'title', tr('condAt', where));
    const wz = [zone(o.wsEff, L.wind), zone(gust, L.gust)]; // the worse of wind and gusts, as rate() counts both
    turn(Wd.m.querySelector('.mi-ndl'), dir + 180); cset(Wd.m, calm(wz.includes('c-unsafe') ? 'c-unsafe' : wz.includes('c-fair') ? 'c-fair' : ''));
    put(Wd.v, `${compass(dir)} ${Math.round(o.wsEff)}`); put(Wd.s, `km/h · ${tr('gust')} ${Math.round(gust)}`);
    const wa = Wv.m.querySelector('.mi-arc'); vset(wa, o.wEff / VMAX); cset(Wv.m, calm(zone(o.wEff, L.wave, true)));
    turn(Wv.m.querySelector('.mi-ndl'), from(raw('wx'), raw('wy')) + 180);
    put(Wv.v, `${nf(o.wEff)} m`); put(Wv.s, `${Math.round(raw('period'))} s`);
    move(Se.m.querySelector('.mi-lvl'), `scaleY(${Math.max(.08, Math.min(1, (sst - 12) / 20)).toFixed(3)})`); put(Se.v, `${nf(sst)}°`);
    const f = (x.t - x.rise) / (x.set - x.rise), up = f > 0 && f < 1, th = Math.PI * Math.max(0, Math.min(1, f));
    move(Su.m.querySelector('.mi-s'), `translate(${f1(14 - 11 * Math.cos(th))}px,${up ? f1(15 - 11 * Math.sin(th)) : 15}px)`); Su.m.classList.toggle('down', !up);
    put(Su.v, `${hm(x.rise)}–${hm(x.set)}`);
    const mo = moonAt(x.t + 18e5, latOf(i), lonOf(i));
    moonSet(Mo.m, mo, 8.2); put(Mo.v, `${Math.round(x.illum * 100)}%`); attr(Mo.c, 'title', phaseName(x.phase));
  }

  // Self-checks: the short way round, the arc's zones, the moon's terminator (new: a sliver, full: the whole disc).
  { const e = { style: {} }; turn(e, 350); turn(e, 10); console.assert(e.psA === 10 && e.style.transform === 'rotate(10.0deg)', 'instruments: needle turns the short way'); } // −10° (350°), then +20°
  console.assert(zone(10, [12, 28]) === 'c-good' && zone(20, [12, 28]) === 'c-fair' && zone(28.8, [12.2, 28.8]) === 'c-unsafe' && zone(1, [.5, 1], true) === 'c-fair', 'instruments: zones');
  console.assert(moonPath(0, 10).includes('A10 10 0 0 0') && moonPath(.5, 10).includes('A10 10 0 0 1 0 -10'), 'instruments: moon terminator');

  return { panel, strip };
})();
