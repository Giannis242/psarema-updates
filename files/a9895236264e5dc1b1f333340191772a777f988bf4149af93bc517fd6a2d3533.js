'use strict';
// Psarema: the fishing calendar. Five weeks from this Monday, a day per cell, for the picked fish (or All fish) and method:
// the days the forecast covers show its best chance (weather included); the rest show an outlook from season, moon and feeding times.
// The outlook is the model's own time, moon and season factor (model.js prepare: P.uni, P.season) on made-up hours with clear sky and
// steady pressure, its best hour of the day scaled to this week's forecast so both kinds of day read on one scale.
// The shared panel (js/catchlog.js PsPanel): a sheet on wide screens, the bottom sheet on phones. Any [data-cal-open] button opens it;
// PsCalendar.open(t) at a day. A forecast day plans a trip that day (PsPlanner.open({ day })).
window.PsCalendar = (() => {
  const DAYS = 35, STEP = 6e5; // five weeks; the moon's altitude every 10 min, as sources.js buildHours
  const astroMemo = new Map(), outMemo = new Map(); // per five weeks (the sky), per fish, method and five weeks (the outlook)
  let page = 0, pick = -1, lastFish = null; // pick: the day shown below the grid; lastFish: the single fish to go back to from All fish

  // Cyprus midnight of a calendar day (u = Date.UTC(y, m, d)): 2 or 3 h before u; the clocks change at 01:00 UTC, after u.
  const midnight = u => u - numT(u, { hour: 'numeric', hourCycle: 'h23' }) * 36e5;
  const dayUTC = t => Date.UTC(numT(t, { year: 'numeric' }), numT(t, { month: 'numeric' }) - 1, numT(t, { day: 'numeric' })); // t's Cyprus date
  const monday = p => { const u = dayUTC(Date.now()); return u - (new Date(u).getUTCDay() + 6) % 7 * 864e5 + p * DAYS * 864e5; };

  /* ---------- The sky: sun, moon and feeding windows of each day, the same for every fish ---------- */
  function astro(p) {
    const mon = monday(p); let A = astroMemo.get(mon); if (A) return A;
    const days = [];
    for (let k = 0; k <= DAYS; k++) days.push({ u: mon + k * 864e5, t0: midnight(mon + k * 864e5) });
    for (let k = 0; k < DAYS; k++) days[k].t1 = days[k + 1].t0;
    days.pop();
    // Solunar windows as sources.js buildHours: major ±1 h around the moon overhead or underfoot, minor ±30 min around moonrise and moonset
    const a0 = days[0].t0 - 3 * 36e5, alt = new Float64Array((days.at(-1).t1 + 3 * 36e5 - a0) / STEP + 1), major = [], minor = [];
    for (let j = 0; j < alt.length; j++) alt[j] = SunCalc.getMoonPosition(new Date(a0 + j * STEP), ...CENTER).altitude;
    for (let j = 1; j < alt.length - 1; j++) {
      const t = a0 + j * STEP, a = alt[j], b = alt[j - 1], n = alt[j + 1];
      if ((a > b && a >= n) || (a < b && a <= n)) major.push([t - 36e5, t + 36e5]);
      if (Math.sign(a) !== Math.sign(b)) minor.push([t - 18e5, t + 18e5]);
    }
    const hit = (list, t) => list.some(([a, b]) => a < t + 36e5 && b > t), within = (list, D) => list.filter(([a, b]) => (a + b) / 2 >= D.t0 && (a + b) / 2 < D.t1);
    for (const D of days) {
      const noon = (D.t0 + D.t1) / 2, sun = SunCalc.getTimes(new Date(noon), ...CENTER), rise = +sun.sunrise, set = +sun.sunset, month = new Date(D.u).getUTCMonth();
      const ph = t => SunCalc.getMoonIllumination(new Date(t)).phase, p0 = ph(D.t0), p1 = ph(D.t1);
      const q = [0, .25, .5, .75].findIndex(x => x ? p0 <= x && p1 > x : p1 < p0); // a new moon, quarter or full moon falls on this day
      Object.assign(D, { rise, set, month, major: within(major, D), minor: within(minor, D), illum: SunCalc.getMoonIllumination(new Date(noon)).fraction,
        phase: q >= 0 ? q / 4 : ph(noon), name: q >= 0 ? q * 2 : Math.floor(ph(noon) * 4) * 2 + 1, hours: [] }); // name: tr('cal_phase')[name]
      for (let t = D.t0; t < D.t1; t += 36e5) { // the hour objects model.js reads (fTime, fMoon, fPress, seasonAt, daylight)
        const mid = t + 18e5;
        D.hours.push({ t, rise, set, month, cloud: 0, dp: 0, illum: SunCalc.getMoonIllumination(new Date(mid)).fraction,
          period: mid >= rise - 36e5 && mid <= rise + 54e5 ? 'dawn' : mid >= set - 54e5 && mid <= set + 36e5 ? 'dusk' : mid > rise && mid < set ? 'day' : 'night',
          solunar: hit(major, t) ? 'major' : hit(minor, t) ? 'minor' : '', moonUp: clamp(alt[(mid - a0) / STEP] / (10 * Math.PI / 180)) });
      }
    }
    astroMemo.set(mon, A = { mon, days });
    return A;
  }

  /* ---------- The outlook: each day's best hour of time, moon and season for this fish and method (0..1) ---------- */
  function outlook(A, s, mode) {
    const key = A.mon + s.id + mode; let O = outMemo.get(key); if (O) return O;
    const spear = mode === 'spear', uniMax = WB.time + WB.moon * Math.max(s.moon.new, s.moon.full) + WB.press;
    O = A.days.map(D => {
      let v = 0, h = null;
      if (!s.banned && !s.closed?.includes(D.month + 1)) for (const x of D.hours) {
        const uni = WB.time * (spear && !daylight(x) ? Math.max(fTime(x, s), .6) : fTime(x, s)) + WB.moon * fMoon(x, s) + WB.press * fPress(x);
        const f = seasonGate(x, s) * Math.max(0, 1 - TILT * (uniMax - uni)); // as P.season in model.js prepare
        if (f > v) { v = f; h = x; }
      }
      return { v, h, season: seasonAt(D.hours[12] || D.hours[0], s) };
    });
    outMemo.set(key, O);
    return O;
  }

  /* ---------- The forecast's best hour of a day, when the forecast covers it to 20:00 at least: all of it (as the timeline's day pills), or
     from `lo` on (the day's cell and details: today from now, as the Forecast tab's "Best left today", so its time and button are not past) ---------- */
  function fcDay(D, lo = 0) {
    if (!F || !hours.length || D.t1 <= Date.now() || D.t1 - 4 * 36e5 > hours[F.T - 1].t) return null;
    let bs = -1, bh = -1;
    for (let h = Math.max(lo, Math.round((D.t0 - hours[0].t) / 36e5)); h < F.T && hours[h].t < D.t1; h++) if (best[h] > bs) { bs = best[h]; bh = h; }
    return bh < 0 ? null : { s: Math.round(bs), h: bh };
  }
  // Outlook × k = a forecast-like score: k is this week's median ratio of forecast to outlook (the where-fit and a typical day's weather), at most 1.
  function scale() {
    const A = astro(0), O = outlook(A, sp, state.mode), r = [];
    A.days.forEach((D, j) => { const f = fcDay(D); if (f && f.s > 0 && O[j].v > .05) r.push(f.s / (100 * O[j].v)); });
    r.sort((a, b) => a - b);
    return r.length ? Math.min(1, r[r.length >> 1]) : 1;
  }

  /* ---------- Drawing ---------- */
  function moonSvg(p, size = 14) { // p: SunCalc phase, 0 new, .5 full; lit on the right while waxing (seen from Cyprus)
    const w = p < .5, k = Math.cos(2 * Math.PI * p) * 7, term = w ? (k > 0 ? 0 : 1) : (k < 0 ? 0 : 1);
    return `<svg class="cal-moon" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true"><circle cx="8" cy="8" r="7.2" fill="#3b4048"/>` +
      `<path d="M8 1A7 7 0 0 ${w ? 1 : 0} 8 15A${Math.abs(k).toFixed(2)} 7 0 0 ${term} 8 1Z" fill="#ece6d2"/></svg>`;
  }
  const seasonWord = (s, v, month) => tr('cal_seasonLv')[s.banned ? 'banned' : s.closed?.includes(month + 1) ? 'closed' : v >= .8 ? 'peak' : v >= .5 ? 'good' : v >= .25 ? 'fair' : 'low'];
  const inSeasonN = m => SPECIES.filter(f => !f.banned && !f.closed?.includes(m + 1) && f.season[m] >= .5).length; // as ui.js inSeasonCount, for that month
  const near = (w, D) => (w[0] < D.rise + 54e5 && w[1] > D.rise - 36e5) ? 'dawn' : (w[0] < D.set + 36e5 && w[1] > D.set - 54e5) ? 'dusk' : ''; // a window at dawn or dusk: the classic best
  const winList = (list, D) => list.length ? list.map(w => { const at = near(w, D);
    return `<span class="${at ? 'cal-hit' : ''}">${hm(w[0])}–${hm(w[1])}${at ? ` · ${esc(tr(at))}` : ''}</span>`; }).join('') : '–';

  function inner() {
    const A = astro(page), O = outlook(A, sp, state.mode), now = Date.now(), s = sp;
    const cells = A.days.map((D, j) => {
      const f = fcDay(D, state.first), o = O[j], past = D.t1 <= now, sc = f ? f.s : null; // the owner: a day the forecast does not reach shows no score
      return { D, f, o, past, sc: past || !sc ? null : sc };
    });
    if (pick < 0 || cells[pick].past) pick = Math.max(0, cells.findIndex(c => !c.past));
    const tops = cells.filter(c => c.sc >= 50).sort((a, b) => b.sc - a.sc).slice(0, 3); // the page's three best days
    const one = s.all ? lastFish && byId(lastFish) : s;
    // the controls (css/app.css .ui-chips, .ui-seg): the fish as chips, the method as a segmented control, then the five weeks shown
    const tools = `<div class="cal-tools"><div class="ui-chips" role="group" aria-label="${esc(tr('pl_fish'))}">` +
      (one ? `<button class="ui-chip" data-cal-fish="${esc(one.id)}" aria-pressed="${!s.all}">${ic('fish')}${esc(fishName(one))}</button>` : '') +
      `<button class="ui-chip" data-cal-fish="all" aria-pressed="${!!s.all}">${ic('fish-list')}${esc(fishName(ALL_FISH))}</button></div>` +
      `<div class="ui-seg block" role="group" aria-label="${esc(tr('pl_how'))}">${['boat', 'shore', 'spear'].map(m => `<button data-cal-mode="${m}" aria-pressed="${state.mode === m}">${esc(tr(m))}</button>`).join('')}</div></div>` +
      `<div class="cal-nav"><button class="icon-btn" data-cal-page="-1" aria-label="${esc(tr('cal_prev'))}" title="${esc(tr('cal_prev'))}"${page ? '' : ' disabled'}>${ic('chevron-left')}</button>` +
      `<span>${dm(A.days[0].t0 + 432e5)} – ${dm(A.days.at(-1).t0 + 432e5)}</span>` +
      `<button class="icon-btn" data-cal-page="1" aria-label="${esc(tr('cal_next'))}" title="${esc(tr('cal_next'))}"${page >= 10 ? ' disabled' : ''}>${ic('chevron-right')}</button></div>`;
    // a day's score as the app shows scores elsewhere (core.js pill: the timeline's day chips, the planner); only the days the forecast reaches have one
    // the key: the forecast pill, the best days' star
    const legend = `<p class="cal-legend"><span class="cal-key" title="${esc(tr('cal_fcTip'))}"><span class="pill" style="background:${solid(50)}"></span>${esc(tr('cal_fc'))}</span>` +
      `<span class="cal-key"><b class="cal-star">★</b>${esc(tr('cal_topDay'))}</span></p>`;
    const head = A.days.slice(0, 7).map(D => `<span class="cal-wd">${esc(fmtT(D.t0 + 432e5, { weekday: 'short' }))}</span>`).join('');
    const grid = cells.map(({ D, f, past, sc }, j) => {
      const date = new Date(D.u).getUTCDate(), noon = D.t0 + 432e5, today = D.t0 <= now && now < D.t1, top = tops.some(c => c.D === D);
      const label = `${fmtT(noon, { weekday: 'long', day: 'numeric', month: 'long' })}: ${sc == null ? '–' : `${tr(f ? 'cal_fc' : 'cal_ol')} ${sc}, ${rating(sc)}`}`;
      return `<button class="cal-d ${past ? 'past' : f ? 'fc' : 'ol'}${today ? ' today' : ''}${top ? ' top' : ''}" data-cal-day="${j}" aria-pressed="${j === pick}" aria-label="${esc(label)}"${past ? ' disabled' : ''}>` +
        `<span class="cal-top"><span class="cal-n">${date}${date === 1 || j === 0 ? `<small>${esc(fmtT(noon, { month: 'short' }))}</small>` : ''}</span>` +
        `${D.name % 2 ? '' : `<span title="${esc(tr('cal_phase')[D.name])}">${moonSvg(D.phase, 11)}</span>`}</span>` + // the moon only on its new, quarter and full days
        `<span class="cal-v">${past || !f ? '' : sc == null ? '<span class="pill empty">·</span>' : pill(sc)}${top ? `<span class="cal-star" title="${esc(tr('cal_topDay'))}">★</span>` : ''}</span></button>`;
    }).join('');
    return PsPanel.head('cal', 'calendar', tr('cal_title'), esc(`${fishName(s)} · ${tr(state.mode)}`)) + tools +
      `<div class="cal-main"><div class="cal-month"><div class="cal-grid" role="group" aria-label="${esc(tr('cal_title'))}">${head}${grid}</div>${legend}</div>${detail(cells[pick], s)}</div>`;
  }
  // the planner's day for a calendar day (tlDays counts the forecast's days from now), -1 when the forecast does not cover it
  const planDay = D => F ? tlDays(state.first).findIndex(([a]) => hours[a].t >= D.t0 && hours[a].t < D.t1) : -1;
  function detail({ D, f, o, sc }, s) {
    const x = f ? hours[f.h] : o.h, noon = D.t0 + 432e5, k = f ? planDay(D) : -1, go = f && f.s > 0;
    const when = x ? `${tr('cal_bestAt', hm(x.t))} · ${tr(x.period)}${x.solunar ? ` · ${tr('solShort')[x.solunar]}` : ''}` : '';
    // as the spot details' head (the rating in its colour, a quiet tag, the title) and the Forecast tab's day details (.fp-dl tiles: css/forecast.css)
    const tile = (icon, k, v, tip) => `<div${tip ? ` title="${esc(tip)}"` : ''}><dt>${icon}${esc(k)}</dt><dd>${v}</dd></div>`;
    return `<div class="cal-det" aria-live="polite"><div class="cal-dh">${ring(sc, 'lg')}<div class="cal-dt">` +
      `<span class="cal-q"><b${sc == null ? '' : ` style="color:${solid(sc)}"`}>${esc(sc == null ? seasonWord(s, o.season, D.month) : rating(sc))}</b><span class="cal-kind">${esc(tr(f ? 'cal_fc' : 'cal_ol'))}</span></span>` +
      `<h4>${esc(fmtT(noon, { weekday: 'long', day: 'numeric', month: 'long' }))}</h4>${when ? `<small>${esc(when)}</small>` : ''}</div></div>` +
      `<dl class="fp-dl cal-dl">` + tile(ic('sun', 'sm'), tr('cal_sun'), `${ic('sunrise', 'sm')}${hm(D.rise)} ${ic('sunset', 'sm')}${hm(D.set)}`) +
      tile(moonSvg(D.phase, 12), tr('cal_moon'), `${esc(tr('cal_phase')[D.name])}<small>${Math.round(D.illum * 100)}% ${esc(tr('lit'))}</small>`) +
      tile(ic('moon', 'sm'), tr('cal_major'), `<span class="cal-win">${winList(D.major, D)}</span>`, tr('cal_winTip')) +
      tile(ic('clock', 'sm'), tr('cal_minor'), `<span class="cal-win">${winList(D.minor, D)}</span>`, tr('cal_winTip')) +
      tile(ic('calendar', 'sm'), tr('season'), s.all ? esc(tr('inSeason', inSeasonN(D.month))) : `${esc(seasonWord(s, o.season, D.month))}${f ? `<small>${Math.round(o.season * 100)}%</small>` : ''}`) + `</dl>` +
      `<p class="hint">${esc(tr(f ? 'cal_fcTip' : 'cal_olTip'))}</p>` + (k >= 0 || go ? `<div class="pn-acts">` +
      (k >= 0 ? `<button class="btn primary" data-cal-plan="${k}">${ic('route', 'sm')}${esc(tr('cal_plan'))}</button>` : '') +
      (go ? `<button class="btn" data-cal-go="${f.h}">${ic('clock', 'sm')}${esc(tr('cal_go', whenT(hours[f.h].t)))}</button>` : '') + `</div>` : '') + `</div>`;
  }

  /* ---------- Open, close, controls ---------- */
  const root = () => PsPanel.root('cal');
  const draw = fresh => (fresh || root()) && PsPanel.show('cal', inner(), fresh); // closed: nothing to draw
  function open(t) { // t: a time to show its day (the timeline's day strip), else today
    page = 0; pick = -1;
    if (t != null) { const off = Math.round((dayUTC(t) - monday(0)) / 864e5); if (off >= 0) { page = Math.min(10, Math.floor(off / DAYS)); pick = off % DAYS; } }
    draw(true);
    if (!isPhone()) root()?.querySelector('.cal-d[aria-pressed="true"]')?.focus();
  }
  function close() { if (root()) PsPanel.close(); }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-cal-open]')) { open(); return; }
    if (!e.target.closest('.cal')) return;
    const b = e.target.closest('[data-cal-day], [data-cal-page], [data-cal-mode], [data-cal-fish], [data-cal-go], [data-cal-plan]'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.calDay != null) { pick = +d.calDay; draw(); root()?.querySelector('.cal-det')?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    else if (d.calPage) { page = Math.max(0, Math.min(10, page + +d.calPage)); pick = -1; draw(); }
    else if (d.calMode) { if (d.calMode !== state.mode) $(`#mode [data-mode="${d.calMode}"]`)?.click(); } // ui.js: method, refresh, ranking; redrawn below
    else if (d.calFish) { if (d.calFish !== sp.id) { if (!sp.all) lastFish = sp.id; chooseFish(d.calFish); draw(); } }
    else if (d.calGo && F) { close(); setHour(+d.calGo); }
    else if (d.calPlan) window.PsPlanner?.open({ day: +d.calPlan }); // the planner takes the calendar's place
  });
  // The fish, method or language changed while it is open (phones keep the top bar's controls in reach): redraw after the app's own handlers
  const redraw = () => setTimeout(() => { if (root()) draw(); });
  $('#mode').addEventListener('click', redraw); $('#lang').addEventListener('click', redraw);
  new MutationObserver(redraw).observe($('#fish-modal'), { attributes: true, attributeFilter: ['hidden'] });

  console.assert(midnight(Date.UTC(2026, 9, 26)) - midnight(Date.UTC(2026, 9, 25)) === 25 * 36e5, 'calendar: the day the clocks go back has 25 hours');
  return { open, close };
})();
