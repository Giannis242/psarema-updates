'use strict';
Object.assign(I18N.en, { spx_tOv: 'Overview', spx_tWhere: 'Where & when', spx_tBait: 'Baits & lures', spx_tRec: 'Records', spx_inSeason: 'In season',
  spx_minCm: n => `Min. ${n} cm`, spx_noMin: 'No min. size', spx_bestBy: m => `Best: ${m}`, spx_nowShort: 'now', spx_habitat: 'Habitat', spx_hours: 'When it bites',
  spx_bestHours: 'Best hours, next 24 h', spx_onMap: 'Open on map', spx_mine: 'Your catches', spx_mineNone: 'You have not logged this fish yet. Your catches and personal best show here.',
  spx_logIt: 'Log a catch', spx_mineN: 'Catches', spx_pb: 'Personal best', spx_last: 'Last caught', spx_dials: 'Chance now' });
Object.assign(I18N.el, { spx_tOv: 'Επισκόπηση', spx_tWhere: 'Πού και πότε', spx_tBait: 'Δολώματα', spx_tRec: 'Ρεκόρ', spx_inSeason: 'Στην εποχή του',
  spx_minCm: n => `Ελάχ. ${n} cm`, spx_noMin: 'Χωρίς ελάχ. μέγεθος', spx_bestBy: m => `Καλύτερα: ${m}`, spx_nowShort: 'τώρα', spx_habitat: 'Βιότοπος', spx_hours: 'Πότε τρώει',
  spx_bestHours: 'Καλύτερες ώρες, επόμενες 24 ώρες', spx_onMap: 'Στον χάρτη', spx_mine: 'Οι ψαριές σας', spx_mineNone: 'Δεν έχετε καταγράψει ακόμη αυτό το ψάρι. Εδώ θα φαίνονται οι ψαριές και το ρεκόρ σας.',
  spx_logIt: 'Καταγραφή ψαριάς', spx_mineN: 'Ψαριές', spx_pb: 'Προσωπικό ρεκόρ', spx_last: 'Τελευταία', spx_dials: 'Πιθανότητα τώρα' });
// Psarema: the species pages (css/species-page.css), Fishbrain-style, built only from what the app's data says: the profiles and their
// sources (data/species*.js), tips and Greek names (species-tips.js, el.js, names-cy.js: core.js SPECIES), fitted seasons (season-fit.js),
// the gear guides (gear-*.js, gear-catalog.js, area-baits.js: loaded on first use, core.js loadGear), the open records (sightings.js), the rules.
// Every chance is model.js's own (prepare + scoreCells, for the method and the map's hour); nothing here changes what the model outputs.
//   PsNav.open('species')     the index: "Biting near you now", every fish ranked by its best chance at the map's hour within Near me's
//                             radius of you (else in the map's view), with why in a line; then every fish A–Z with a search.
//   PsNav.open('species', id) one fish: a hero (the cut-out on a gradient, its names, quick facts: the chance now, the season this month, the
//                             legal minimum size, the best method), then tabs: Overview (rules, the season as a calendar strip, habitat: depth,
//                             seabed, water; similar fish, sources) · Where & when (near you now and best this week, the best spots now as cards:
//                             a tap flies there and opens the spot's card; the chance an hour for the next 24 h, time of day) · Baits & lures
//                             (setups and gear tiles per method) · Records (your own catches and personal best, js/catchlog.js PsCatch; its
//                             records in Cyprus, and the latest live ones from js/records.js PsRecords, when it is there).
//   [data-sp-page="id"] anywhere opens that page ("" = the index): js/ui.js puts it on the spot card's fish name, the gallery and Where to go (round 17 G).
// Speed: the ranking runs when the index opens, in 12 ms slices, over at most ~3000 cells a fish (a coarser grid on a wide view) and one hour,
// and is kept until the forecast, method, hour or place change. A fish's best spots score every 2nd cell of the sea at the one hour.
const PsSpecies = window.PsSpecies = (() => {
  const SF = window.PSAREMA_SEASON_FIT || {}, GEARS = () => window.PSAREMA_GEAR || {};
  const KXD = 111.32 * Math.cos(35 * Math.PI / 180), KYD = 110.57, CAP = 3000, SLICE_MS = 12; // km per degree (core.js); cells a fish when ranking
  const HABS = ['rock', 'seagrass', 'coarse', 'sand', 'mud', 'open'], TOD = [['dawn', 'sunrise'], ['day', 'sun'], ['dusk', 'sunset'], ['night', 'moon']];
  const LEGAL = /eur-lex|cylaw|gov\.cy|iccat|webgate\.ec/, METHODS3 = ['boat', 'shore', 'spear'];
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return String(u); } };
  const links = urls => { const n = {}; return [...new Set(urls)].map(u => { const h = host(u), k = n[h] = (n[h] || 0) + 1; // one site cited twice reads "iccat.int · iccat.int (2)", not a doubled word
    return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(k > 1 ? `${h} (${k})` : h)}</a>`; }).join(' · '); };
  const monthOf = () => hours[state.h]?.month ?? new Date().getMonth();
  const closedIn = (s, m = monthOf()) => !!s.closed?.includes(m + 1);
  const minSize = s => s.regulations?.match(/minimum (?:landing )?size (\d+(?:\.\d+)?) ?cm/i)?.[1]; // as the rules text gives it
  const mon = m => fmtT(Date.UTC(2026, m, 15), { month: 'short' });
  const runs = on => { // [first, last] month of each stretch where on[m], round the year's end; 'all' = every month
    if (on.every(Boolean)) return 'all';
    const r = []; for (let m = 0; m < 12; m++) if (on[m] && !on[(m + 11) % 12]) { let e = m; while (on[(e + 1) % 12]) e = (e + 1) % 12; r.push([m, e]); }
    return r;
  };
  const runText = r => r === 'all' ? tr('spx_allYear') : r.map(([a, b]) => a === b ? mon(a) : `${mon(a)}–${mon(b)}`).join(', ');
  const cut = s => CUT[s.id] ? `<img src="${esc(CUT[s.id].file)}" alt="" loading="lazy" decoding="async">` : ic('fish');
  const placeOf = i => describe(latOf(i), lonOf(i)) + (state.loc ? ` · ${fmtKm(km(state.loc, [latOf(i), lonOf(i)]).d)} km` : '');
  const sec = (k, icon, title, body, tag = '') => body ? `<section class="spx-sec sx-${k}"><h3>${ic(icon, 'sm')}<span>${esc(title)}</span>${tag}</h3>${body}</section>` : '';
  const est = (s, ...k) => k.some(x => s.estimated?.includes(x)) ? `<span class="spx-est" title="${esc(tr('spx_estTip'))}">${esc(tr('spx_est'))}</span>` : '';
  let buf = null; const buffer = () => buf ||= newBuf(); // model.js's per-cell buffers (~13 MB): kept only while a page shows
  const timing = {}; // measured: index ranking (wall and busy ms), a page's draw, its best spots (ms)

  /* ---------- Near you now: each fish's best chance at the map's hour over the sea near you, or in the map's view ---------- */
  function area() {
    if (state.loc) { const [la, lo] = state.loc, r = state.radius; return { key: `l${la},${lo},${r}`, r, c: state.loc, la0: la - r / KYD, la1: la + r / KYD, lo0: lo - r / KXD, lo1: lo + r / KXD }; }
    const b = map.getBounds(), a = { la0: b.getSouth(), la1: b.getNorth(), lo0: b.getWest(), lo1: b.getEast() };
    return { ...a, key: 'v' + Object.values(a).map(v => v.toFixed(2)).join() };
  }
  function cellsIn(a) { // the sea cells of the area, on a grid coarse enough for about CAP of them
    const x0 = Math.max(0, Math.floor((a.lo0 - WEST) / RES)), x1 = Math.min(W - 1, Math.floor((a.lo1 - WEST) / RES));
    const y0 = Math.max(0, Math.floor((NORTH - a.la1) / RES)), y1 = Math.min(H - 1, Math.floor((NORTH - a.la0) / RES));
    if (x1 < x0 || y1 < y0) return [];
    const k = Math.max(1, Math.ceil(Math.sqrt((x1 - x0 + 1) * (y1 - y0 + 1) / 2 / CAP))), out = []; // about half of a box is sea
    for (let y = y0; y <= y1; y += k) for (let x = x0; x <= x1; x += k) {
      const i = y * W + x; if (!depth[i] || northMask[i]) continue;
      if (a.r && Math.hypot((lonOf(i) - a.c[1]) * KXD, (latOf(i) - a.c[0]) * KYD) > a.r) continue;
      out.push(i);
    }
    return out;
  }
  function ctx() { // the place the ranking is for: its cells, what to call it, a cache key
    const a = area(); let cells = cellsIn(a), where = a.r ? 'loc' : 'view';
    if (!cells.length) { cells = SAMPLE; where = 'island'; } // all land in view (or no sea near you): the whole coast
    return { cells, where, key: [where === 'island' ? 'i' : a.key, state.mode, state.h, sat.sstDate].join('|') };
  }
  // The fish's best score over the cells at hour h (scoreCells op 2, 64 cells at a time, best where-fit first, so it stops early), the cell
  // that reaches it, and why in a few words from the model's own parts there: feeding time, season, water temperature, a rough sea.
  function best(s, cells, h, P0 = buffer()) {
    if (s.banned) return { s, v: null, i: -1, why: [['banned']] };
    const x = hours[h], P = prepare(s, state.mode, cells, P0), acc = new Float64Array(F.T); let hit = -1, i = -1;
    for (let j = 0; j < P.ns; j += 64) { const b = acc[h], end = scoreCells(P, h, h + 1, P.sidx, j, Math.min(P.ns, j + 64), 2, acc); if (acc[h] > b) hit = j; if (end) break; }
    const o = {}; // the same formula again for the cells of the last chunk that raised the best: the first that reaches it is the place
    if (hit >= 0) for (let j = hit, e = Math.min(P.ns, hit + 64); j < e && i < 0; j++) { ONE[0] = P.sidx[j]; if (scoreCells(P, h, h + 1, ONE, 0, 1, 3, null, o) >= acc[h]) i = P.sidx[j]; }
    const why = [];
    if (closedIn(s, x.month)) why.push(['closed']);
    else {
      const tm = fTime(x, s), se = seasonAt(x, s);
      if (i >= 0 && o.gate < .5) why.push(['rough']);
      if (tm >= .8) why.push(['bite', x.period]); else if (tm < .4) why.push(['quiet']);
      if (se >= .8) why.push(['peak']); else if (se < .4) why.push(['off']);
      const t = i >= 0 ? waterAt(i, s, h) : NaN;
      if (t === t) { const f = fTemp(t, s); if (f < .4) why.push([t < s.sst[1] ? 'cold' : 'warm', t]); else if (f >= .9) why.push(['water', t]); }
      if (!s.methods.includes(state.mode)) why.unshift(['rarely']);
    }
    return { s, v: Math.round(acc[h]), i, why: why.slice(0, 2) };
  }
  const waterAt = (i, s, h) => sat.sst ? fishTemp(i, s, ocDay(hours[h].t + 18e5)) : bil(F.sst, h * NN, i); // as explain() reads it
  const whyText = r => r.why.map(([k, a]) => k === 'bite' ? tr('pl_bite')[a] : k === 'banned' ? tr('banned') : tr('spx_w_' + k, a == null ? a : nf(a))).join(' · ');
  let near = { key: '', F: null, list: null }, runId = 0, busyKey = '', busyRun = 0;
  function rankNear(done) { // every fish, a slice of wall time at a time (taps and the map never wait long), then done(near)
    const c = ctx();
    if (near.F === F && near.key === c.key && near.list) { done(near); return; }
    if (busyKey === c.key && busyRun === runId) return; // that one is under way already (the wide screen's look again)
    const id = busyRun = ++runId; busyKey = c.key; const h = state.h, list = [], t0 = performance.now(); let k = 0, busy = 0;
    const step = () => {
      if (id !== runId) return;
      const t1 = performance.now(), until = t1 + SLICE_MS;
      do list.push(best(SPECIES[k++], c.cells, h)); while (k < SPECIES.length && performance.now() < until);
      busy += performance.now() - t1;
      if (k < SPECIES.length) { setTimeout(step, 0); return; }
      near = { key: c.key, F, list, where: c.where, h, n: c.cells.length }; busyKey = '';
      Object.assign(timing, { rankMs: Math.round(performance.now() - t0), rankBusy: Math.round(busy), rankCells: c.cells.length });
      done(near);
    };
    setTimeout(step, 0);
  }
  const nearNow = s => { const c = F && ctx(); return c && near.F === F && near.key === c.key ? near.list.find(x => x.s === s) : null; };
  function nearOf(s) { // this fish near you: now (from the ranking when it is current) and its best hour this week, over the same cells
    if (!F || s.banned) return null;
    const c = ctx(), r = near.F === F && near.key === c.key ? near.list.find(x => x.s === s) : best(s, c.cells, state.h);
    const P = prepare(s, state.mode, c.cells, buffer()), acc = new Float64Array(F.T); scoreCells(P, state.first, F.T, P.sidx, 0, P.ns, 2, acc);
    let wv = 0, wh = state.first; for (let h = state.first; h < F.T; h++) if (acc[h] > wv) { wv = acc[h]; wh = h; } // the first hour that reaches it
    return { ...r, where: c.where, wv: Math.round(wv), wh, acc };
  }
  const whereText = w => w === 'loc' ? tr('spx_within', state.radius) : tr(w === 'view' ? 'spx_view' : 'spx_island');

  /* ---------- The index ---------- */
  const qOf = s => [s.name, s.el, s.local, CY[s.id]?.also, s.scientific].map(v => { const p = plain(v); return p + ' ' + latin(p); }).join(' ');
  function indexHtml() {
    const coll = new Intl.Collator(locale()), az = [...SPECIES].sort((a, b) => coll.compare(fishName(a), fishName(b)));
    const sk = Array.from({ length: 6 }, (_, k) => `<li class="spx-sk" style="--i:${k}"><span class="spx-row"><span class="spx-n"></span><span class="spx-cut"></span><span class="spx-main"><i class="sk-bar" style="width:${50 + k * 7 % 30}%"></i><i class="sk-bar sm" style="width:40%"></i></span><span class="ring empty"></span></span></li>`).join('');
    return `<div class="spx spx-index"><section class="spx-now"><div class="spx-nowh"><h3>${ic('star', 'sm')}<span>${esc(tr(state.loc ? 'spx_near' : 'spx_inView'))}</span></h3><p class="spx-sub" data-spx="sub">${esc(F ? tr('spx_working') : tr('spx_noFc'))}</p></div>` +
      `<ol class="spx-rank" data-spx="rank">${F ? sk : ''}</ol><button class="btn spx-all" data-spx-act="all" hidden></button></section>` +
      `<section class="spx-sec spx-azs"><h3>${ic('fish-list', 'sm')}<span>${esc(tr('spx_az'))}</span><small class="spx-count">${SPECIES.length}</small></h3>` +
      `<label class="spx-find">${ic('search', 'sm')}<input type="search" data-spx="q" autocomplete="off" placeholder="${esc(tr('search'))}" aria-label="${esc(tr('search'))}"></label>` +
      `<div class="spx-az" data-spx="az">${az.map(s => `<button class="spx-card" data-sp-page="${s.id}" data-q="${esc(qOf(s))}"><span class="spx-stage">${cut(s)}</span>` +
        (s.banned ? `<span class="spx-flag ban">${ic('ban', 'sm')}${esc(tr('banned'))}</span>` : closedIn(s) ? `<span class="spx-flag ban">${ic('ban', 'sm')}${esc(tr('spx_closedNow'))}</span>` : '') +
        `<span class="spx-cb"><b>${esc(fishName(s))}</b><small>${esc(fishAlt(s))}</small></span><span class="spx-cr" data-r="${s.id}"></span></button>`).join('')}</div>` +
      `<p class="hint" data-spx="none" hidden>${esc(tr('noMatch'))}</p><p class="grid-credit">${esc(tr('photos'))}</p></section></div>`;
  }
  const SHOW = 8; // ranked rows shown before "Show all"
  function fillRank(root) {
    const ol = root.querySelector('[data-spx="rank"]'); if (!ol) return;
    if (!F) { waitForecast(); return; }
    rankNear(r => {
      if (!ol.isConnected) return;
      const list = [...r.list].sort((a, b) => (b.v ?? -1) - (a.v ?? -1) || fishName(a.s).localeCompare(fishName(b.s), locale()));
      ol.innerHTML = list.map((x, n) => `<li${n >= SHOW ? ' class="spx-more"' : ''}><button class="spx-row" data-sp-page="${x.s.id}"><span class="spx-n">${x.v == null ? '' : n + 1}</span>` +
        `<span class="spx-cut">${cut(x.s)}</span><span class="spx-main"><b>${esc(fishName(x.s))}</b><small class="spx-why">${esc(whyText(x))}</small>` +
        (x.i >= 0 && x.v ? `<small class="spx-at">${ic('pin', 'sm')}<span>${esc(placeOf(x.i))} · ${depthM(x.i)} m</span></small>` : '') + '</span>' +
        (x.v == null ? `<span class="spx-flag ban">${ic('ban', 'sm')}</span>` : ring(x.v)) + '</button></li>').join('');
      root.querySelector('[data-spx="sub"]').textContent = [tr(state.mode), whenT(hours[r.h].t), r.where !== 'view' && whereText(r.where)].filter(Boolean).join(' · ');
      const all = root.querySelector('[data-spx-act="all"]'); all.hidden = list.length <= SHOW; all.textContent = tr('spx_showAll', list.length);
      for (const x of list) { const d = root.querySelector(`[data-r="${x.s.id}"]`); if (d && x.v != null) d.innerHTML = ring(x.v, 'sm'); }
    });
  }
  let waitT = 0;
  const waitForecast = () => { clearTimeout(waitT); waitT = setTimeout(() => { if (!view) return; if (F) draw(); else waitForecast(); }, 1500); }; // no event for it: look again
  function search(root, v) {
    const q = plain(v.trim()), ql = q.replace(/ch/g, 'h').replace(/y/g, 'i'); let n = 0;
    for (const c of root.querySelectorAll('.spx-card')) { const on = !q || c.dataset.q.includes(q) || c.dataset.q.includes(ql); c.hidden = !on; n += on; }
    root.querySelector('.spx-index').classList.toggle('searching', !!q); root.querySelector('[data-spx="none"]').hidden = !!n;
  }

  /* ---------- A fish's page ---------- */
  function seasonSvg(s) { // the season the map uses as a calendar strip, a cell a month filled to its value (the fitted curve, when there is one),
    // the profile's own as a tick in each cell; this month outlined, the closed ones red
    const f = SF[s.id], was = f?.was?.length === 12 ? f.was : null, now = monthOf(), L = [...tr('monthLetters')];
    const peak = runs(s.season.map((v, m) => v >= .8 && !closedIn(s, m))), closed = s.closed?.length ? runs(s.season.map((_, m) => closedIn(s, m))) : null;
    return `<p class="spx-big">${peak.length || peak === 'all' ? `<span class="lbl">${esc(tr('spx_peakIs'))}</span><b>${esc(runText(peak))}</b>` : ''}` +
      (closed ? `<span class="lbl bad">${esc(tr('spx_closedSeason'))}</span><b class="bad">${esc(runText(closed))}</b>` : '') + '</p>' +
      `<div class="spx-cal" role="img" aria-label="${esc(tr('season'))}">${s.season.map((v, m) => `<div class="${[closedIn(s, m) && 'closed', m === now && 'now', v >= .8 && 'peak'].filter(Boolean).join(' ')}" ` +
        `style="--v:${Math.max(v, .04).toFixed(2)}${was ? `;--w:${was[m].toFixed(2)}` : ''}"><i></i>${was ? '<u></u>' : ''}<b>${L[m]}</b></div>`).join('')}</div>` +
      `<p class="spx-key"><span><i class="k-bar"></i>${esc(tr(was ? 'spx_fitted' : 'spx_profileUsed'))}</span>${was ? `<span><i class="k-line"></i>${esc(tr('spx_profile'))}</span>` : ''}` +
      (closed ? `<span><i class="k-bar closed"></i>${esc(tr('spx_closedMo'))}</span>` : '') + '</p>';
  }
  function hoursHtml(nv) { // the chance an hour for the next 24 h over the same cells as the dials (nearOf: model.js's best cell each hour)
    if (!nv?.acc || !F) return '';
    const h0 = state.h, vs = []; for (let h = h0; h < Math.min(F.T, h0 + 24); h++) vs.push(Math.round(nv.acc[h]));
    const top = Math.max(...vs);
    if (vs.length < 2 || top <= 0) return ''; // no chance in any hour (a closed season): no empty chart under an empty "best hours"
    const good = vs.map(v => top > 0 && v >= top - 3), spans = []; // the best hours: within 3 of the best
    for (let k = 0; k < vs.length; k++) if (good[k] && !good[k - 1]) { let e = k; while (good[e + 1]) e++; spans.push([k, e]); }
    const day0 = fmtT(hours[h0].t, { day: 'numeric' }), at = k => (fmtT(hours[h0 + k].t, { day: 'numeric' }) === day0 ? hm : whenT)(hours[h0 + k].t); // round 16 P: a window on another day names it ("13:00–18:00, Mon 05:00–13:00")
    const text = spans.slice(0, 2).map(([a, b]) => a === b ? at(a) : `${at(a)}–${hm(hours[h0 + b].t + 36e5)}`).join(', ');
    return `<p class="spx-big"><span class="lbl">${esc(tr('spx_bestHours'))}</span><b>${esc(text)}</b>${ring(top)}</p>` +
      `<div class="spx-hrs" style="--n:${vs.length}">${vs.map((v, k) => `<i${good[k] ? ' class="top"' : ''} style="--v:${(Math.max(v, 3) / 100).toFixed(2)};--c:${solid(v)}" title="${esc(at(k))} · ${v}"></i>`).join('')}</div>` +
      `<div class="spx-hax" style="--n:${vs.length}">${vs.map((_, k) => k % 6 ? '' : `<span style="grid-column:${k + 1}/span 6">${esc(at(k))}</span>`).join('')}</div>`;
  }
  function mineHtml(s) { // your own catches of it (js/catchlog.js, kept on this device): how many, the personal best, the latest ones
    const all = window.PsCatch?.entries?.(); if (!all) return '';
    const mine = all.filter(e => e.sp === s.id && e.n > 0), size = e => [e.kg && `${nf(e.kg, e.kg % 1 ? 1 : 0)} kg`, e.cm && `${nf(e.cm, e.cm % 1 ? 1 : 0)} cm`].filter(Boolean).join(' · ');
    if (!mine.length) return `<div class="spx-mine0"><span class="spx-mi">${ic('fish')}</span><p>${esc(tr('spx_mineNone'))}</p><button class="btn" data-ct-log="-1">${ic('plus', 'sm')}${esc(tr('spx_logIt'))}</button></div>`;
    const pb = mine.filter(e => e.kg || e.cm).sort((a, b) => (b.kg || 0) - (a.kg || 0) || (b.cm || 0) - (a.cm || 0))[0]; // weight first, then length (as catchlog.js)
    const stat = (v, k) => `<div><b>${esc(v)}</b><span>${esc(tr(k))}</span></div>`;
    return `<div class="spx-stats">${stat(String(mine.length), 'spx_mineN')}${stat(pb ? size(pb) : '–', 'spx_pb')}${stat(dm(mine[0].t), 'spx_last')}</div>` +
      `<div class="spx-mrows">${(pb && !mine.slice(0, 4).includes(pb) ? [pb, ...mine.slice(0, 3)] : mine.slice(0, 4)).map(e => `<button class="spx-mrow" data-spx-catch="${esc(e.id)}">` +
        `<span class="spx-mi">${ic(e === pb ? 'star' : e.mode || 'fish', 'sm')}</span><span class="spx-main"><b>${esc(size(e) || fishName(s))}${e === pb ? ` <small class="spx-pbt">${esc(tr('spx_pb'))}</small>` : ''}</b>` +
        `<small>${esc([dm(e.t) + ' ' + new Date(e.t).getFullYear(), e.lat != null && describe(e.lat, e.lon)].filter(Boolean).join(' · '))}</small></span>${ic('chevron-right', 'sm')}</button>`).join('')}</div>`;
  }
  function todHtml(s) {
    const x = hours[state.h], a = s.activity, top = Math.max(...TOD.map(([p]) => a[p]));
    const at = { dawn: x && hm(x.rise), dusk: x && hm(x.set) };
    const moon = s.moon.new - s.moon.full > .05 ? 'spx_moonNew' : s.moon.full - s.moon.new > .05 ? 'spx_moonFull' : 'spx_moonSame';
    return `<div class="spx-tod">${TOD.map(([p, icn]) => `<div class="${x?.period === p ? 'now' : ''}${a[p] === top ? ' top' : ''}"><span class="spx-col"><i style="--v:${a[p]}"></i></span>` +
      `${ic(icn, 'sm')}<b>${esc(cap(tr(p)))}</b><small>${at[p] ? esc(at[p]) : '&nbsp;'}</small></div>`).join('')}</div><p class="spx-note">${ic('moon', 'sm')}<span>${esc(tr(moon))}</span>${est(s, 'moon')}</p>`;
  }
  function depthHtml(s) {
    const ax = f => s.estimated?.includes(f) ? '≈ ' : '', [d0, d1, d2, d3] = s.depth, X = d => (Math.sqrt(d / d3) * 100).toFixed(1) + '%', h = s.habitat, hk = HABS.filter(k => h[k] != null);
    const hab = hk.map(k => `<div><span>${esc(k === 'open' ? tr('spx_openWater') : tr('hab')[k])}</span><i style="--v:${h[k]}"></i></div>`).join('');
    const notes = [s.structure >= .6 && ['spx_struct', 'structure'], s.dropoff >= .6 && ['spx_drop', 'dropoff']].filter(Boolean)
      .map(([k, f]) => `<p class="spx-note">${ic('seabed', 'sm')}<span>${esc(tr(k))}</span>${est(s, f)}</p>`).join('');
    return `<div class="spx-gauge" aria-hidden="true"><i class="tol" style="left:${X(d0)};right:${(100 - parseFloat(X(d3))).toFixed(1)}%"></i><i class="ok" style="left:${X(d1)};right:${(100 - parseFloat(X(d2))).toFixed(1)}%"></i></div>` +
      `<dl class="spx-kv"><div><dt>${esc(tr('spx_best'))}</dt><dd>${ax('depth')}${d1}–${d2} m</dd></div><div><dt>${esc(tr('spx_found'))}</dt><dd>${ax('depth')}${d0}–${d3} m</dd></div>` +
      `<div><dt>${esc(tr('spx_fromShore'))}</dt><dd>${ax('shoreKm')}${nf(s.shoreKm[0], s.shoreKm[0] % 1 ? 1 : 0)}–${nf(s.shoreKm[1], s.shoreKm[1] % 1 ? 1 : 0)} km</dd></div></dl>` +
      `<p class="spx-sub2">${ax('habitat')}${esc(tr('spx_habEst'))}</p><div class="spx-hab">${hab}</div>${notes}` +
      (ax('depth') || ax('shoreKm') || ax('habitat') ? `<p class="hint spx-ax">≈ ${esc(tr('spx_estTip'))}</p>` : '') + (s.calibrated ? `<p class="hint">${esc(tr('spx_calib', s.calibrated))}</p>` : '');
  }
  function waterHtml(s, tNow) {
    const [t0, t1, t2, t3] = s.sst, lo = 8, hi = 34, X = t => ((clamp((t - lo) / (hi - lo))) * 100).toFixed(1) + '%';
    return `<div class="spx-gauge temp" aria-hidden="true"><i class="tol" style="left:${X(t0)};width:calc(${X(t3)} - ${X(t0)})"></i><i class="ok" style="left:${X(t1)};width:calc(${X(t2)} - ${X(t1)})"></i>` +
      (tNow === tNow && tNow != null ? `<i class="mark" style="left:${X(tNow)}"></i>` : '') + `</div><div class="spx-scale"><span>${lo} °C</span><span>${hi} °C</span></div>` +
      `<dl class="spx-kv"><div><dt>${esc(tr('spx_comfort'))}</dt><dd>${nf(t1, t1 % 1 ? 1 : 0)}–${nf(t2, t2 % 1 ? 1 : 0)} °C</dd></div><div><dt>${esc(tr('spx_tolerates'))}</dt><dd>${nf(t0, t0 % 1 ? 1 : 0)}–${nf(t3, t3 % 1 ? 1 : 0)} °C</dd></div>` +
      (tNow === tNow && tNow != null ? `<div class="now"><dt>${esc(tr('spx_nowWater'))}</dt><dd>${nf(tNow)} °C</dd></div>` : '') + '</dl>';
  }
  function rulesHtml(s) { // round 17 G: the minimum size and open / closed now are the hero's chips, the closed months the season's line: the rules in full
    const rules = fishRules(s), legal = (s.sources || []).filter(u => LEGAL.test(host(u)));
    return (rules ? `<details class="spx-fold"><summary>${ic('chevron-right', 'sm')}<span>${esc(tr('spx_rulesFull'))}</span></summary><p class="text selectable">${esc(rules)}</p>` +
        (legal.length ? `<p class="spx-links">${esc(tr('spx_legalSrc'))}: ${links(legal)}</p>` : '') + '</details>' : '');
  }
  function howHtml(s, m) {
    const g = GEARS()[s.id];
    if (!g) return gearLoad ? `<p class="text">${esc(fishText(s, 'tips') || '')}</p><p class="hint">${esc(tr('noGear'))}</p>` : `<p class="hint">${esc(tr('loading'))}</p>`;
    const ms = METHODS3.filter(k => s.methods.includes(k) || g.setups?.[k]), st = g.setups?.[m];
    const seg = ms.length > 1 ? `<div class="seg spx-seg" role="group" style="grid-template-columns:repeat(${ms.length},minmax(0,1fr))">${ms.map(k =>
      `<button data-spx-m="${k}" aria-pressed="${k === m}">${ic(k)}<span>${esc(tr(k))}</span></button>`).join('')}</div>` : '';
    const grid = cards => cards ? `<div class="gear-grid">${cards}</div>` : '';
    const lures = (g.lures || []).filter(l => m === 'boat' || !BOAT_ONLY.has(l.gear));
    const where = state.loc || spots?.[0]?.p, aid = where && window.PsAreaGear?.areaAt(...where), picks = aid && window.PSAREMA_AREA_BAITS?.[aid]?.[s.id];
    const read = [['technique', 'book'], ['where', 'map'], ['when', 'clock'], ['handling', 'hook'], ['eating', 'info']].filter(([k]) => L10(g[k]))
      .map(([k, icn]) => `<div><h4>${ic(icn, 'sm')}${esc(tr(k))}</h4><p class="text">${esc(L10(g[k]))}</p></div>`).join('');
    const fold = read ? `<details class="spx-fold"${s.banned ? ' open' : ''}><summary>${ic('chevron-right', 'sm')}<span>${esc(tr('spx_read'))}</span></summary><div class="spx-read">${read}</div></details>` : '';
    if (s.banned) return fold; // not to be fished: only what its guide says (what to do if one is hooked)
    let html = seg + (st ? `<div class="spx-setup"><h4>${ic(m, 'sm')}${esc(tr('setups'))}</h4>${setupHtml(m, st)}</div>` : '');
    if (m !== 'spear') {
      html += window.PsAreaGear?.luresHtml?.(aid || null, { sp: s.id, mode: m, compact: true, top: 3 }) || ''; // round 13: top lures now (js/lures.js), at the area near you or the best spot
      if (picks?.length) html += `<h4>${ic('pin', 'sm')}${esc(tr('spx_local', PsAreaGear.name(aid)))}</h4>` + grid(picks.slice(0, 4).map(b => gearCard(b.gear, L10(b.note), b.best)).join(''));
      let all = ''; // round 17 G: the guide's whole bait, lure and soft-plastic lists, folded under the picks above
      if (g.baits?.length) all += `<h4>${esc(tr('baits'))}</h4>` + grid(g.baits.map(b => gearCard(b.gear, L10(b.note), b.best)).join(''));
      if (lures.length) all += `<h4>${esc(tr('lures'))}</h4>` + grid(lures.map(l => gearCard(l.gear, [l.weight, l.size, L10(l.note)].filter(Boolean).join(' · '), false, l.colors)).join(''));
      if (g.silicone) all += `<h4>${esc(tr('silicone'))}</h4>` + (g.silicone.use && g.silicone.ids?.length ? grid(softCards(g.silicone)) : '') + `<p class="text">${yesNo(g.silicone)} · ${ynText(g.silicone)}</p>`;
      if (all) html += `<details class="spx-fold"><summary>${ic('chevron-right', 'sm')}<span>${esc(tr('g17_spxAllGear'))}</span></summary><div class="spx-allgear">${all}</div></details>`;
    }
    return html + fold;
  }
  let spots = null; // the fish's best spots now, as the page shows them (null: not worked out yet)
  function spotsFor(s) { // the best spots for the fish at the map's hour: the map's own pins for the fish on show, else every 3rd sea cell scored here
    if (!F || s.banned || closedIn(s)) return [];
    if (s.id === state.sp && tops.length) return tops.slice(0, 5);
    const t0 = performance.now(), P = prepare(s, state.mode, grid3(), buffer()), acc = new Uint8Array(P.n), bb = new Map();
    scoreCells(P, state.h, state.h + 1, P.idx, 0, P.n, 0, acc);
    for (let j = 0; j < P.n; j++) { // the best cell of each 6×6 block (as map.js drawTop), then spaced out
      const v = acc[j]; if (v < 40) continue;
      const i = P.idx[j], b = ((i / W | 0) / 6 | 0) * W + (i % W / 6 | 0), o = bb.get(b); if (!o || v > o[0]) bb.set(b, [v, i]);
    }
    const out = [], gap = state.mode === 'boat' ? 3 : 1.5;
    for (const [v, i] of [...bb.values()].sort((a, b) => b[0] - a[0])) { const p = [latOf(i), lonOf(i)]; if (out.every(t => km(t.p, p).d > gap)) out.push({ s: v, i, p }); if (out.length === 5) break; }
    timing.spotsMs = Math.round(performance.now() - t0);
    return out;
  }
  let G3 = null; const grid3 = () => G3 ||= (() => { const a = []; for (let y = 1; y < H; y += 3) for (let x = 1; x < W; x += 3) { const i = y * W + x; if (depth[i] && !northMask[i]) a.push(i); } return a; })();
  // the best spots now as a row of cards that scrolls sideways: the dial, the place, depth and seabed; a tap flies there
  const spotsHtml = s => spots === null ? `<ol class="spx-spots">${[0, 1, 2].map(k => `<li class="spx-sk" style="--i:${k}"><span class="spx-spot"><span class="ring lg empty"></span><i class="sk-bar" style="width:80%"></i><i class="sk-bar sm" style="width:50%"></i></span></li>`).join('')}</ol>` : !F ? `<p class="hint">${esc(tr('waiting'))}</p>` : s.banned ? `<p class="hint">${esc(tr('now_banned'))}</p>` : closedIn(s) ? `<p class="hint">${esc(tr('now_closed'))}</p>`
    : !spots.length ? `<p class="hint">${esc(tr('now_none'))}</p>` : `<ol class="spx-spots">${spots.map((t, n) => `<li><button class="spx-spot" data-spx-go="${t.i}"><span class="spx-sn">#${n + 1}</span>${ring(t.s, 'lg')}` +
      `<b>${esc(describe(t.p[0], t.p[1]))}</b><small>${depthM(t.i)} m${esc(habPart(t.i))}</small>${state.loc ? `<small>${esc(tr('spx_away', fmtKm(km(state.loc, t.p).d)))}</small>` : ''}` +
      `<span class="spx-go">${ic('map', 'sm')}${esc(tr('spx_onMap'))}</span></button></li>`).join('')}</ol>`;
  // Records: the island once (a pixel per 2×2 cells, sea darker with depth, land grey, as the spot lists' mini-maps were), each record a dot on it
  const X0 = 100, Y0 = 40, CW = 525, CH = 280; let island = null;
  function islandCanvas() {
    if (island) return island;
    island = Object.assign(document.createElement('canvas'), { width: CW, height: CH });
    const g = island.getContext('2d'), im = g.createImageData(CW, CH), px = im.data;
    for (let y = 0, o = 0; y < CH; y++) for (let x = 0; x < CW; x++, o += 4) {
      const i = (Y0 + y * 2) * W + X0 + x * 2, d = depth[i], t = clamp(Math.log1p(d) / Math.log1p(1500));
      if (!d) px.set(northMask[i] ? [44, 42, 39] : [62, 59, 54], o); else px.set([lerp(30, 9, t), lerp(56, 16, t), lerp(70, 24, t)], o);
      px[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); return island;
  }
  function drawRecords(cv, rows) {
    const g = cv.getContext('2d'), k = cv.width / CW, P = (la, lo) => [((lo - WEST) / RES - X0) / 2 * k, ((NORTH - la) / RES - Y0) / 2 * k];
    g.imageSmoothingQuality = 'high'; g.drawImage(islandCanvas(), 0, 0, cv.width, cv.height);
    const y1 = Math.max(...rows.map(r => r[2]));
    for (const r of rows) { const [x, y] = P(r[0], r[1]), a = r[2] >= y1 - 5 ? 1 : .6; g.fillStyle = `rgb(255 255 255 / ${.16 * a})`; g.beginPath(); g.arc(x, y, 7 * k, 0, 7); g.fill(); g.fillStyle = `rgb(255 255 255 / ${.95 * a})`; g.beginPath(); g.arc(x, y, 3.2 * k, 0, 7); g.fill(); } // the last 5 years brighter
    if (state.loc) { const [x, y] = P(...state.loc); g.fillStyle = '#5aa9ff'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * k; g.beginPath(); g.arc(x, y, 4 * k, 0, 7); g.fill(); g.stroke(); }
  }
  function recordsHtml(s) {
    const rows = SIGHT[s.id] || [];
    if (!rows.length) return `<p class="hint">${esc(tr('spx_recNone'))}</p><div data-spx="live"></div>`;
    const ys = rows.map(r => r[2]), byM = Array(12).fill(0); for (const r of rows) if (r[4]) byM[r[4] - 1]++;
    const mx = Math.max(...byM), nm = byM.reduce((a, b) => a + b, 0);
    return `<p class="spx-big"><b>${rows.length}</b><span>${esc(tr('spx_recN', rows.length, Math.min(...ys), Math.max(...ys)))}</span></p>` +
      `<button class="spx-recmap" data-spx-act="recmap" aria-label="${esc(tr('spx_recMap'))}"><canvas width="${CW * 2}" height="${CH * 2}"></canvas><span class="btn">${ic('map', 'sm')}${esc(tr('spx_recMap'))}</span></button>` +
      (nm ? `<div class="spx-bym" title="${esc(tr('spx_byMonth', nm))}">${byM.map((v, m) => `<i style="--v:${mx ? v / mx : 0}"${m === monthOf() ? ' class="now"' : ''}></i>`).join('')}</div>` +
        `<div class="spx-mo">${[...tr('monthLetters')].map((l, m) => `<b${m === monthOf() ? ' class="now"' : ''}>${l}</b>`).join('')}</div><p class="hint">${esc(tr('spx_byMonth', nm))}</p>` : '') +
      `<p class="spx-note">${ic('info', 'sm')}<span>${esc(tr('spx_recNote'))}</span></p><div data-spx="live"></div>`;
  }
  function fillLive(root, s) { // the latest open sightings with photos (js/records.js), when that module is there
    const box = root.querySelector('[data-spx="live"]'); if (!box || !window.PsRecords?.query) return;
    Promise.resolve(PsRecords.query({ sp: s.id })).then(list => {
      if (!box.isConnected || !list?.length) return;
      const last = list.filter(r => r.src !== 'static').sort((a, b) => b.t - a.t).slice(0, 6); if (!last.length) return; // offline: the shipped records are the map above
      box.innerHTML = `<h4>${esc(tr('spx_latest'))}</h4><div class="spx-live">${last.map(r => `<a class="spx-rec" href="${esc(r.url || '#')}" target="_blank" rel="noopener" data-spx-rec="${esc(r.id)}">` +
        `<span class="spx-ph">${r.thumb || r.photo ? `<img src="${esc(r.thumb || r.photo)}" alt="" loading="lazy" decoding="async">` : ic('eye')}</span>` +
        `<b>${esc(dm(r.t))} ${new Date(r.t).getFullYear()}</b><small>${esc(describe(r.lat, r.lon))}</small><small>${esc([r.by, r.lic && r.lic.toUpperCase().replace(/^CC-/, 'CC ')].filter(Boolean).join(' · '))}</small></a>`).join('')}</div>`;
    }, e => console.warn('species page: sightings', e));
  }
  function similar(s) { // the same kind of fish on alike seabed, depth and water: a plain likeness of the profiles
    const hv = o => HABS.map(k => o.habitat[k] ?? 0), a = hv(s), na = Math.hypot(...a) || 1, mid = d => Math.log1p((d[1] + d[2]) / 2);
    return SPECIES.filter(x => x !== s).map(x => { const b = hv(x), cos = a.reduce((t, v, k) => t + v * b[k], 0) / na / (Math.hypot(...b) || 1);
      return [x, (x.group === s.group) + cos - Math.abs(mid(x.depth) - mid(s.depth)) / 3 - Math.abs(x.sst[1] + x.sst[2] - s.sst[1] - s.sst[2]) / 20]; })
      .sort((p, q) => q[1] - p[1]).slice(0, 4).map(p => p[0]);
  }
  function sourcesHtml(s) {
    const g = GEARS()[s.id], c = CUT[s.id] || IMG[s.id], list = (k, urls) => urls?.length ? `<div><h4>${esc(tr(k))}</h4><p class="spx-links">${links(urls)}</p></div>` : '';
    return list('spx_srcProfile', s.sources) + list('spx_srcGear', g?.sources) + list('spx_srcSeason', SF[s.id]?.sources) +
      `<div><h4>${esc(tr('spx_srcRec'))}</h4><p class="spx-links"><a href="https://www.gbif.org" target="_blank" rel="noopener">GBIF.org</a> · <a href="https://obis.org" target="_blank" rel="noopener">OBIS</a> · ` +
      `<a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a> <span class="hint">(CC0, CC BY, CC BY-NC)</span></p></div>` +
      (c ? `<div><h4>${esc(tr('spx_srcPhoto'))}</h4><p class="spx-links"><a href="${esc(c.url || '#')}" target="_blank" rel="noopener">${esc(c.author)}</a> · ${esc(c.license)}${c.derived ? ` · ${esc(tr('spx_cutout'))}` : ''}</p></div>` : '');
  }
  let method = '', tab = 'ov';
  const TABS = [['ov', 'spx_tOv'], ['ww', 'spx_tWhere'], ['bait', 'spx_tBait'], ['rec', 'spx_tRec']];
  function factsHtml(s, nv) { // the quick facts under the name: the chance now, the season this month, the legal minimum size, the best way to fish it
    // (round 17 G: no Caution chip: the warning itself is the first thing under the tabs)
    const v = s.season[monthOf()], ms = minSize(s), m0 = s.methods[0], chip = (icn, t, c = '') => `<span class="spx-fact${c && ' ' + c}">${icn}<span>${esc(t)}</span></span>`;
    const season = s.banned ? [tr('banned'), 'bad'] : closedIn(s) ? [tr('spx_closedNow'), 'bad'] : v >= .8 ? [tr('spx_w_peak'), 'on'] : v >= .4 ? [tr('spx_inSeason')] : [tr('spx_w_off')];
    return (nv?.v != null && !closedIn(s) ? chip(ring(nv.v, 'sm'), tr('spx_nowShort'), 'score') : '') + chip(ic(s.banned || closedIn(s) ? 'ban' : 'calendar', 'sm'), ...season) +
      chip(ic('shield', 'sm'), ms ? tr('spx_minCm', nf(+ms, 0)) : tr('spx_noMin')) + (m0 && !s.banned ? chip(ic(m0, 'sm'), tr('spx_bestBy', tr(m0))) : '');
  }
  function pageHtml(s) {
    const t0 = performance.now(), g = GEARS()[s.id], x = hours[state.h], nv = nearOf(s), t1 = timing.nearMs = Math.round(performance.now() - t0), danger = fishText(s, 'warning'), tip = fishText(s, 'tips');
    if (!s.methods.includes(method) && !g?.setups?.[method]) method = s.methods.includes(state.mode) ? state.mode : s.methods[0];
    const dial = (v, lbl, when, sub) => `<div class="spx-dial">${ring(v, 'lg')}<span><span class="lbl">${esc(lbl)}</span><b>${esc(when)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>`;
    // none when it has no chance all week (a closed season): two 0 dials and a time would mislead
    const dials = nv && x && (nv.v || nv.wv) ? dial(nv.v ?? null, tr(nv.where === 'loc' ? 'spx_now' : nv.where === 'view' ? 'spx_nowView' : 'spx_nowAll'), hm(x.t), nv.where === 'loc' ? whereText('loc') : '') +
      dial(nv.wv, tr('spx_week'), whenT(hours[nv.wh].t)) : ''; // both over the same cells: near you, else the map's view
    const sims = similar(s), panel = (k, body) => `<div class="spx-panel" role="tabpanel" id="spx-p-${k}" aria-labelledby="spx-t-${k}"${k === tab ? '' : ' hidden'}>${body}</div>`;
    return `<div class="spx spx-page" data-sp="${s.id}"><header class="spx-hero"><div class="spx-art">${fishImg(s)}</div><div class="spx-id"><p class="lbl">${esc(tr(s.group))}</p>` +
      `<h2>${esc(fishName(s))}</h2><p class="spx-alt">${esc(fishAlt(s))} · <i>${esc(s.scientific)}</i></p></div><div class="spx-facts">${factsHtml(s, nv)}</div>` +
      `<div class="spx-acts"><button class="btn primary" data-spx-act="map">${ic('map', 'sm')}${esc(tr('spx_showMap'))}</button><button class="btn" data-sp-page="">${ic('fish-list', 'sm')}${esc(tr('spx_allSpecies'))}</button></div></header>` +
      `<div class="tabs spx-tabs" role="tablist">${TABS.map(([k, key]) => `<button role="tab" id="spx-t-${k}" aria-controls="spx-p-${k}" aria-selected="${k === tab}" data-spx-tab="${k}">${esc(tr(key))}</button>`).join('')}</div>` +
      panel('ov', (danger ? `<p class="danger">${ic('warning')}<span>${esc(danger)}</span></p>` : '') +
        (L10(g?.summary) || tip ? `<p class="spx-lede" data-spx="lede">${esc(L10(g?.summary) || tip)}</p>` : '') +
        sec('season', 'calendar', tr('season'), seasonSvg(s), est(s, 'season')) + sec('rules', 'shield', tr('rules'), rulesHtml(s)) +
        sec('sim', 'fish-list', tr('spx_similar'), `<div class="spx-sims">${sims.map(x => { const r = nearNow(x); return `<button class="spx-card sm" data-sp-page="${x.id}"><span class="spx-stage">${cut(x)}</span>` +
          `<span class="spx-cb"><b>${esc(fishName(x))}</b><small>${esc(fishAlt(x))}</small></span><span class="spx-cr">${r?.v != null ? ring(r.v, 'sm') : ''}</span></button>`; }).join('')}</div>`) +
        // round 17 G: the profile's depth, seabed and water, and its sources, one tap away
        `<details class="spx-fold spx-more"><summary>${ic('chevron-right', 'sm')}<span>${esc(tr('g17_spxMore'))}</span></summary><div class="spx-morein">` +
          `<div class="spx-pair">${sec('depth', 'seabed', tr('spx_habitat'), depthHtml(s))}${sec('water', 'thermometer', tr('spx_water'), `<div data-spx="water">${waterHtml(s)}</div>`, est(s, 'sst'))}</div>` +
          sec('src', 'book', tr('sources'), sourcesHtml(s)) + '</div></details>' +
        // round 17 G: how the score works (it was the map's Guide tab): the model's own honest words, one tap away
        `<details class="spx-fold spx-howscore"><summary>${ic('chevron-right', 'sm')}<span>${esc(tr('howTitle'))}</span></summary><div class="spx-read">` +
          `<p class="text">${esc(tr('how1'))}</p><p class="text">${esc(tr('cHow'))}</p><p class="text">${esc(tr('how2'))}</p><p class="text">${tr('how3')}</p><p class="text">${esc(tr('how4'))}</p></div></details>`) +
      panel('ww', (dials ? `<div class="spx-dials">${dials}</div>` : '') +
        sec('where', 'pin', tr('spx_where'), `<div data-spx="where">${spotsHtml(s)}</div>`, x ? `<small class="spx-h3sub">${esc(hm(x.t))} · ${esc(tr(state.mode))}</small>` : '') +
        sec('tod', 'clock', tr('spx_hours'), (s.banned ? '' : hoursHtml(nv)) + todHtml(s), est(s, 'activity'))) +
      panel('bait', sec('how', 'rod', tr('spx_how'), `<div data-spx="how">${howHtml(s, method)}</div>`)) +
      panel('rec', sec('mine', 'star', tr('spx_mine'), `<div data-spx="mine">${mineHtml(s)}</div>`) + sec('rec', 'eye', tr('spx_rec'), recordsHtml(s))) + '</div>';
  }
  function setTab(k) { // one panel shows; when the bar is stuck at the top, the new panel starts right under it
    const el = view?.el; if (!el) return; tab = k;
    for (const b of el.querySelectorAll('[data-spx-tab]')) b.setAttribute('aria-selected', b.dataset.spxTab === k);
    let p = null; for (const q of el.querySelectorAll('.spx-panel')) { q.hidden = q.id !== 'spx-p-' + k; if (!q.hidden) p = q; }
    const bar = el.querySelector('.spx-tabs'), y = p && el.scrollTop + p.getBoundingClientRect().top - el.getBoundingClientRect().top - bar.offsetHeight; // el: the page's scrolling body
    if (p && el.scrollTop > y) el.scrollTop = y;
    if (k === 'bait') paintLures(el);
    if (k === 'rec' && view?.id) recMap(el, byId(view.id));
  }

  /* ---------- Drawing, events ---------- */
  let view = null, watchT = 0; // { el, id } on show ('' = the index)
  function draw() {
    if (!view?.el.isConnected) { view = null; return; }
    const { el, id } = view, s = id && byId(id), t0 = performance.now();
    if (s && !s.all) {
      clearInterval(watchT); spots = null; el.innerHTML = pageHtml(s);
      requestAnimationFrame(() => setTimeout(() => { // after the page has painted: its best spots, the records' map
        if (view?.el !== el || view.id !== id) return;
        fillSpots(el, s); recMap(el, s);
      }));
      fillLive(el, s); paintLures(el);
      if (!gearLoad || !GEARS()[s.id]) loadGear()?.then(() => { if (view?.el === el && view.id === id) { redrawHow(); const l = el.querySelector('[data-spx="lede"]'), g = GEARS()[s.id]; if (l && L10(g?.summary)) l.textContent = L10(g.summary); } });
      timing.pageMs = Math.round(performance.now() - t0);
    } else {
      el.innerHTML = indexHtml(); fillRank(el); timing.indexMs = Math.round(performance.now() - t0);
      // Wide screens: the map and the hour stay in reach beside the page, so the ranking follows them (a look every 1.5 s while it shows)
      clearInterval(watchT); if (!isPhone()) watchT = setInterval(() => { if (view?.el === el && !view.id && F && ctx().key !== near.key) fillRank(el); }, 1500);
    }
  }
  function fillSpots(el, s) { // the best spots now, then what hangs on the first: the water there, the area's local baits
    spots = spotsFor(s);
    el.querySelector('[data-spx="where"]').innerHTML = spotsHtml(s);
    if (spots[0]) el.querySelector('[data-spx="water"]').innerHTML = waterHtml(s, waterAt(spots[0].i, s, state.h));
    if (!state.loc && spots[0]) redrawHow();
  }
  // ui.js colours only its own hosts. Round 16 X: not in a hidden tab (setTab paints them as it opens): each new lure and colour pair is a
  // pixel loop over the whole picture, and these were for pictures nobody saw yet
  const paintLures = root => { for (const im of root.querySelectorAll('img[data-lure]')) if (!im.closest('[hidden]')) paintLure(im.dataset.lure, im.dataset.cols).then(u => { if (u) im.src = u; }); };
  function recMap(el, s) { // the records' map, drawn once its tab shows (setTab)
    const cv = el.querySelector('.spx-recmap canvas'); if (!cv || cv.dataset.drawn || cv.closest('[hidden]')) return;
    const t1 = performance.now(); drawRecords(cv, SIGHT[s.id] || []); cv.dataset.drawn = 1; timing.recMs = Math.round(performance.now() - t1);
  }
  function redrawHow() { const box = view?.el.querySelector('[data-spx="how"]'), s = view && byId(view.id); if (box && s) { box.innerHTML = howHtml(s, method); paintLures(box); } }
  function onClick(e) {
    const t = e.target.closest('[data-spx-act], [data-spx-go], [data-spx-m], [data-spx-rec], [data-spx-tab], [data-spx-catch], .sx-how .gear'); if (!t || !view) return;
    const d = t.classList.contains('gear') ? { spxGear: '' } : t.dataset, s = view.id && byId(view.id);
    if (d.spxTab) setTab(d.spxTab);
    else if (d.spxCatch) window.PsCatch?.open?.(d.spxCatch);
    else if (d.spxM) { method = d.spxM; redrawHow(); }
    else if (d.spxGear != null) t.classList.toggle('full'); // a clamped note in full
    else if (d.spxGo) { const i = +d.spxGo; PsNav.open('map'); PsPanel.openSpot(i, { fish: s.id, mode: state.mode, h: state.h }); } // fly there, the card open, as a tap on the map
    else if (d.spxRec) { if (window.PsRecords?.get && (!PsNav.pages || PsNav.pages.sighting)) { e.preventDefault(); PsNav.open('sighting', d.spxRec); } }
    else if (d.spxAct === 'all') { const r = view.el.querySelector('.spx-rank'); r.classList.toggle('open'); t.textContent = r.classList.contains('open') ? tr('spx_showLess') : tr('spx_showAll', r.children.length); }
    else if (d.spxAct === 'map' || d.spxAct === 'recmap') {
      PsNav.open('map'); if (state.sp !== s.id) chooseFish(s.id);
      const rows = d.spxAct === 'recmap' && SIGHT[s.id];
      if (rows?.length) { const b = $('#lay-pp-record'); if (b && !b.checked) b.click(); map.fitBounds(L.latLngBounds(rows.map(r => [r[0], r[1]])).pad(.15), { maxZoom: 11 }); } // round 17 G: the one Sightings switch (js/pins.js)
    }
  }
  function open(id) { // from a [data-sp-page] tap: the fish picker or the old full guide go first, the page comes over the map
    if (!$('#fish-modal').hidden) closeModal('#fish-modal');
    PsNav.open('species', id || undefined);
  }
  document.addEventListener('click', e => { // capture: before the gallery's own handler picks the fish
    const t = e.target.closest('[data-sp-page]'); if (!t || !window.PsNav) return;
    e.preventDefault(); e.stopPropagation(); open(t.dataset.spPage);
  }, true);
  document.addEventListener('keydown', e => { const t = e.key === 'Enter' && e.target.closest?.('[data-sp-page]:not(button)'); if (t) { e.preventDefault(); open(t.dataset.spPage); } });
  document.addEventListener('ps:catches', () => { const b = view?.id && view.el.querySelector('[data-spx="mine"]'); if (b) b.innerHTML = mineHtml(byId(view.id)); }); // logged, edited or loaded
  const hosts = new WeakSet();
  function render(el) { if (hosts.has(el)) return; hosts.add(el); el.classList.add('spx-host'); el.addEventListener('click', onClick); el.addEventListener('input', e => { if (e.target.matches('[data-spx="q"]')) search(el, e.target.value); }); }
  window.PsNav?.add('species', {
    title: () => view?.id ? fishName(byId(view.id)) : tr('spx_title'), icon: 'fish', render, // js/nav.js draws the page again for a new language
    show(el, arg) {
      render(el); runId++;
      if (el._spx !== (arg || '')) { tab = 'ov'; for (let e = el; e && e !== document.body; e = e.parentElement) if (e.scrollTop) e.scrollTop = 0; } // another fish (one body serves them all): from the top, on Overview
      view = { el, id: el._spx = arg || '' }; method = ''; draw();
    },
    hide() { view = null; runId++; buf = null; clearTimeout(waitT); clearInterval(watchT); },
  });
  return { open, near: () => near, timing };
})();
