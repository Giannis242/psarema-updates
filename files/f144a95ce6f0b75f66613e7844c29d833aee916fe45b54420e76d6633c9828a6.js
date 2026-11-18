'use strict';
/* Psarema area profiles (round 13): what is under water and how clean and clear the water is, for each fishing area (data/areas.js).
   Data: data/area-profile.js (window.PSAREMA_AREA_PROFILE, ~0.25 MB, built by scripts/areas/build.mjs), loaded on first use: never at start.
   API (for the area page, the detection model and the lure colours):
     PsAreaProfile.load(inshore)               → Promise, resolved when the data is in (call it once before the two readers below).
         load(true) also brings the inshore Sentinel-2 grid (data/area-clarity.js, ~60 m, seasonal): clarityAt then knows the murky stretches.
     PsAreaProfile.of(areaId)                  → the area's profile, or null (unknown id, or not loaded yet):
         { seaKm2, shelfKm2, seabed: { to: 50, mix: { rock, posidonia, sand, coarse, mud, unknown } }   % of the seabed from shore to 50 m
           coral: { km2, d: [min, max] } | null,   bands: [% of the area's sea at 0–10, 10–30, 30–50, 50–100, 100–200, 200+ m],
           reach: { 20: { typ, min }, 50: { typ, min } }   km from shore to that depth (typical, closest),
           drops: [{ i (app cell), lat, lon, d0, d1 (m, within ~500 m), km (from shore), near: { en, el } | null }],
           wrecks: [{ n, lat, lon, d }], artReefs: [name], reefs: [name], rocks (charted rocks awash), caves: { n, names }, farms: [{ n, sp, cages, lat, lon }],
           ports: [{ en, el }], rivers: [{ n, km }], riverN, outfalls: [{ kind: 'desal' | 'power' | 'other', n, lat, lon }], desal: [{ n, cap m³/day }],
           sewage (treated waste-water outfalls to sea), zones: { noTake: [name], restricted, protected },
           bathing: { season, n, cls: { excellent: n, … }, samples: { years, n, ent95, ec95, entMax, ecMax }, worst: { n, ent95, ec95 } } | null,
           vis: [12 monthly visibilities, m, January first: open water],
           inshore: { seasons: [winter, spring, summer, autumn: { t, t90 (FNU above the open sea), open, share (% murkier than open water), z, z90 (m) } | null],
                      murky: { i (app cell), t, z, near } | null } | null      the first kilometre from shore (Sentinel-2) }
     PsAreaProfile.clarityAt(lat, lon, month)  → typical visibility in metres at that point in that month (1–12; default: this month), NaN when
         unknown or not loaded. A Secchi-type depth (js/sources.js secchiM; NOT the model's clarityM, which reads ~1.7 times more): the
         monthly climatology of 1 km satellite pixels (the nearest sea pixel within ~3 km), and, after load(true), within 2.5 km of the shore
         lowered by the season's Sentinel-2 turbidity at that ~60 m pixel where it is over the noise floor of 0.5 FNU (secchiTurbid), east of
         33.05° E only (the west tile, Pomos to Paphos, is unverified and lowers nothing). An estimate:
         the typical water of a clear day, not today's.
     PsAreaProfile.turbidityAt(lat, lon, month) → that turbidity, FNU above the open sea (0 = as clear as offshore), NaN outside the grid or not loaded.
         The raw value everywhere; west of 33.05° E (tile 36SVD) it is UNVERIFIED: likely glint, surf or bottom rather than sediment.
     PsAreaProfile.mount(el, areaId)           → draws the two folding sections ("Under water", "Water") into el (js/areas.js calls it).
     PsAreaProfile.here(i)                     → what is under water at app cell i: { depth, seabed (words), drop: { km, deg, d0, d1 } | null,
         near: [{ kind: 'wreck' | 'artificialReef' | 'farm' | 'breakwater' | 'river' | 'outfall', name, km, deg }] (each within its reach),
         vis (m, NaN until load(true) is in), turbid (true where the inshore grid lowered it) }. Phase 3: this file also adds the section
         "Under water here" to a spot's details (the drawer and the phone sheet), after the seabed section, on the Overview tab.
   Sources and licences: PSAREMA_AREA_PROFILE.sources, data/SOURCES2.md §R13. Styles: css/areas.css (.ap-*). */
window.PsAreaProfile = (() => {
  let loading = null;
  const D = () => window.PSAREMA_AREA_PROFILE || null;
  const load = inshore => (loading ||= loadScripts('data/area-profile.js').catch(e => { loading = null; throw e; }))
    .then(() => inshore && (loadingFine ||= loadScripts('data/area-clarity.js').catch(e => { loadingFine = null; throw e; })));
  const WEST_UNVERIFIED = 33.05; // ° E
  const dec = typeof b64 === 'function' ? b64 : s => Uint8Array.from(atob(s), c => c.charCodeAt(0)); // core.js b64 in the app; node checks have no core.js
  let loadingFine = null, fine = null; // the inshore grid: Map app cell → its place in the data, and the bytes
  const SEASON = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0]; // month (0 = January) → winter, spring, summer, autumn
  function turbidityAt(lat, lon, month = new Date().getMonth() + 1) {
    const C = window.PSAREMA_AREA_CLARITY; if (!C || !(month >= 1 && month <= 12)) return NaN;
    if (!fine) {
      const runs = new Uint32Array(dec(C.cells).buffer), at = new Map(); let k = 0; // round 14: core.js b64 (Uint8Array.from with a map was ~180 ms of the first details at 4× CPU)
      for (let r = 0; r < runs.length; r += 2) for (let i = runs[r]; i < runs[r] + runs[r + 1]; i++) at.set(i, k++);
      fine = { at, q: dec(C.data), n: k * C.sub * C.sub };
    }
    const gx = Math.floor((lon - C.west) / C.res * C.sub), gy = Math.floor((C.north - lat) / C.res * C.sub), k = fine.at.get((gy / C.sub | 0) * C.w + (gx / C.sub | 0));
    if (k === undefined || gx < 0 || gy < 0) return NaN;
    const b = fine.q[SEASON[month - 1] * fine.n + k * C.sub * C.sub + (gy % C.sub) * C.sub + gx % C.sub];
    return b === 255 ? NaN : b * C.scale;
  }
  const of = id => D()?.areas[id] ?? null;
  let grid = null;
  function clarityAt(lat, lon, month = new Date().getMonth() + 1) {
    const C = D()?.clarity; if (!C || !(month >= 1 && month <= 12)) return NaN;
    grid ||= dec(C.data); // round 14: core.js b64, the same bytes, ~20× faster
    const x0 = Math.round((lon - C.west) / C.dLon), y0 = Math.round((C.north - lat) / C.dLat), o = (month - 1) * C.w * C.h;
    let best = NaN, bd = 3.5; // pixels
    for (let y = Math.max(0, y0 - 3); y <= Math.min(C.h - 1, y0 + 3); y++) for (let x = Math.max(0, x0 - 3); x <= Math.min(C.w - 1, x0 + 3); x++) {
      const b = grid[o + y * C.w + x], d = Math.hypot(x - x0, y - y0);
      if (b !== 255 && d < bd) { bd = d; best = b * C.scale; }
    }
    const t = turbidityAt(lat, lon, month);
    // under the noise floor (0.5 FNU): as the open water. West of WEST_UNVERIFIED (Sentinel-2 tile 36SVD, Pomos to Paphos: scripts/areas/s2-clarity.mjs
    // tileOf) the turbidity is not verified (likely glint, surf or bottom, not sediment): it lowers nothing there until it is.
    return t >= window.PSAREMA_AREA_CLARITY?.noise && lon >= WEST_UNVERIFIED && !Number.isNaN(best) ? secchiTurbid(best, t) : best;
  }

  /* ---------- the two sections on the area page ---------- */
  const MIX = [['rock', '#b08968'], ['posidonia', '#4fd18b'], ['sand', '#e3cf8f'], ['coarse', '#a6a6a6'], ['mud', '#6b7785'], ['unknown', '#3a3a3a']];
  const BAND = ['0–10', '10–30', '30–50', '50–100', '100–200', '200+'], BLUE = ['#bfe3f2', '#8cc8e6', '#5aa9d6', '#3b82b8', '#2a5f91', '#1d3f66'];
  const habT = k => k === 'posidonia' ? tr('ap_posidonia') : k === 'unknown' ? tr('ap_unmapped') : tr('hab')[k];
  const bar = segs => `<div class="ap-bar">${segs.filter(s => s[0] > 0).map(([v, c]) => `<i style="flex:${v};background:${c}"></i>`).join('')}</div>`;
  const key = segs => `<p class="ap-key">${segs.filter(s => s[0] > 0).map(([v, c, t]) => `<span><i style="background:${c}"></i>${esc(t)} <b>${v}%</b></span>`).join('')}</p>`;
  const row = (t, v) => v ? `<li><span>${esc(t)}</span><b>${v}</b></li>` : '';
  const list = a => a.map(esc).join(', ');
  const src = (...k) => `<p class="ap-src">${esc(tr('ap_src'))}: ${esc(k.map(x => D().sources[x].split(':')[0].split(',')[0]).join(' · '))}</p>`;

  function under(p) {
    const mix = MIX.map(([k, c]) => [p.seabed.mix[k], c, habT(k)]), bands = p.bands.map((v, k) => [v, BLUE[k], BAND[k] + ' m']);
    const named = p.wrecks.filter(w => w.n), blank = p.wrecks.length - named.length;
    const farms = [...new Set(p.farms.map(f => `${f.n} (${tr(f.cages ? 'ap_cages' : 'ap_onShore')})`))]; // one owner's two sites: once
    const z = p.zones, zs = [z.noTake.length && tr('ap_noTake', z.noTake.length), z.restricted && tr('ap_restr', z.restricted), z.protected && tr('ap_prot', z.protected)].filter(Boolean);
    const rows = row(tr('ap_wrecks'), list([...named.map(w => w.d ? `${w.n} (${w.d} m)` : w.n), ...blank ? [tr('ap_unnamed', blank)] : []])) +
      row(tr('ap_artReefs'), list(p.artReefs)) + row(tr('ap_reefs'), list([...p.reefs, ...p.rocks ? [tr('ap_rocks', p.rocks)] : []])) +
      row(tr('ap_caves'), p.caves.n ? esc(p.caves.n + (p.caves.names.length ? ': ' + p.caves.names.join(', ') : '')) : '') +
      row(tr('ap_farms'), list(farms)) + row(tr('ap_ports'), list(p.ports.map(L10))) +
      row(tr('ap_rivers'), p.riverN ? esc(`${p.riverN}${p.rivers.some(r => r.n) ? ': ' + p.rivers.filter(r => r.n).map(r => r.n).join(', ') : ''} · ${tr('ap_seasonal')}`) : '') +
      row(tr('ap_zones'), list(zs));
    return `<h4>${esc(tr('ap_seabed', p.seabed.to))}</h4>${bar(mix)}${key(mix)}` +
      (p.coral ? `<p class="ap-line">${esc(tr('ap_coral', fmtKm(p.coral.km2), p.coral.d[0], p.coral.d[1]))}</p>` : '') +
      `<h4>${esc(tr('ap_depth'))}</h4>${bar(bands)}${key(bands)}` +
      [20, 50].map(d => Number.isFinite(p.reach[d].typ) ? `<p class="ap-line">${esc(tr('ap_reach', d, fmtKm(p.reach[d].typ), fmtKm(p.reach[d].min)))}</p>` : '').join('') +
      (p.drops.length ? `<h4>${esc(tr('ap_drops'))}</h4><ol class="ui-list">${p.drops.map(d => `<li><button type="button" class="ui-row ap-drop" data-ar-spot="${d.i}"><span class="ui-row-main"><b>${esc(tr('ap_drop', d.d0, d.d1))}</b>` +
        `<small>${esc(tr('ap_off', d.near && L10(d.near), fmtKm(d.km)))}</small></span>${ic('chevron-right')}</button></li>`).join('')}</ol>` : '') +
      (rows ? `<h4>${esc(tr('ap_struct'))}</h4><ul class="ap-rows">${rows}</ul>` : '') + `<p class="ap-src">${esc(tr('ap_gaps'))}</p>` + src('hab', 'dtm', 'osm', 'ha', 'prot');
  }
  function water(p) {
    const m = new Date().getMonth(), max = Math.max(...p.vis), mon = tr('months');
    const vis = `<div class="ap-vis" role="img" aria-label="${esc(p.vis.map((v, k) => `${mon[k]} ${v} m`).join(', '))}">${p.vis.map((v, k) =>
      `<span${k === m ? ' class="now"' : ''}><b>${v}</b><i style="height:${Math.round(v / max * 44)}px"></i><small>${esc(mon[k].slice(0, 1))}</small></span>`).join('')}</div>`;
    const b = p.bathing, s = b?.samples, lim = (v, max) => `<div class="ap-lim"><i style="width:${Math.min(100, Math.round(v / max * 100))}%"></i></div>`;
    const bw = !b ? `<p class="ap-line">${esc(tr('ap_bwNone'))}</p>` : Object.entries(b.cls).map(([c, n]) => `<p class="ap-line"><b>${esc(tr('ap_bwLine', n, b.n, I18N[state.lang]['ap_c_' + c] ?? I18N.en['ap_c_' + c] ?? c, b.season))}</b></p>`).join('') +
      (s ? `<p class="ap-line">${esc(tr('ap_samples', s.n, s.years[0], s.years[1]))}</p><ul class="ap-rows">` +
        `<li><span>${esc(tr('ap_ent'))}</span><b>${s.ent95} <small>${esc(tr('ap_limit', 100))}</small>${lim(s.ent95, 100)}</b></li>` +
        `<li><span>E. coli</span><b>${s.ec95} <small>${esc(tr('ap_limit', 250))}</small>${lim(s.ec95, 250)}</b></li></ul>` +
        (b.worst && b.n > 1 ? `<p class="ap-src">${esc(tr('ap_worst', b.worst.n, b.worst.ent95, b.worst.ec95))}</p>` : '') : '');
    const O = { desal: 'ap_oDesal', power: 'ap_oPower', other: 'ap_oOther' }, cages = p.farms.filter(f => f.cages).length;
    const press = [cages && tr('ap_pCages', cages), p.farms.length - cages && tr('ap_pHatch', p.farms.length - cages),
      ...p.desal.map(d => tr('ap_pDesal', d.n, d.cap.toLocaleString(state.lang))), ...p.outfalls.map(o => tr(O[o.kind]) + (o.n ? ` (${o.n})` : '')),
      p.sewage && tr('ap_pSewage', p.sewage), p.ports.length && tr('ap_pPorts', p.ports.length), p.riverN && tr('ap_pRivers', p.riverN)].filter(Boolean);
    return `<h4>${esc(tr('ap_vis'))}</h4><p class="ap-line"><b>${esc(tr('ap_visNow', p.vis[m], mon[m]))}</b></p>${vis}<p class="ap-src">${esc(tr('ap_est'))}</p>` +
      (p.inshore?.murky ? `<h4>${esc(tr('ap_inshore'))}</h4>` + // round 13 phase 2b: the season-by-season numbers are too uncertain to show (eval/LOG.md)
        (`<button type="button" class="ui-row ap-drop ap-murky" data-ar-spot="${p.inshore.murky.i}"><span class="ui-row-main"><b>${esc(tr('ap_murkiest', p.inshore.murky.near && L10(p.inshore.murky.near)))}</b><small>${esc(tr('ap_murkiestSub', p.inshore.murky.z))}</small></span>${ic('chevron-right')}</button>`) +
        `<p class="ap-src">${esc(tr('ap_inshoreEst'))}</p>` : '') +
      `<h4>${esc(tr('ap_bw'))}</h4>${bw}` +
      `<h4>${esc(tr('ap_press'))}</h4>` + (press.length ? `<ul class="ap-dots">${press.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : `<p class="ap-line">${esc(tr('ap_pressNone'))}</p>`) +
      src('kd', ...p.inshore?.murky ? ['s2c'] : [], 'eea', 'ha', 'osm');
  }
  function html(id) {
    const p = of(id); if (!p) return '';
    const top = MIX.map(([k]) => [p.seabed.mix[k], habT(k)]).filter(s => s[0] > 0 && s[1] !== tr('ap_unmapped')).sort((a, b) => b[0] - a[0]).slice(0, 3).map(s => `${s[1]} ${s[0]}%`).join(' · ');
    const b = p.bathing, m = new Date().getMonth(), best = b && Object.entries(b.cls).sort((x, y) => y[1] - x[1])[0];
    const wat = [tr('ap_visShort', p.vis[m], tr('months')[m]), best && tr('ap_bwShort', best[1], b.n, I18N[state.lang]['ap_c_' + best[0]] ?? best[0])].filter(Boolean).join(' · ');
    const fold = (k, icon, t, sub, body) => `<details class="ap" data-ap="${k}"><summary>${ic(icon)}<span class="ui-row-main"><b>${esc(t)}</b><small>${esc(sub)}</small></span>${ic('chevron-down')}</summary><div class="ap-body">${body}</div></details>`;
    return fold('under', 'seabed', tr('ap_under'), top, under(p)) + fold('water', 'eye', tr('ap_water'), wat, water(p)); // round 14: an icon each, as the page's other rows
  }
  // Round 14: two skeleton rows while the data comes (first open: ~0.25 MB), and a line saying so when it cannot (offline): it tries again once online
  const skel = () => [0, 1].map(k => `<div class="ap-sk"><span class="ui-skel" style="--i:${k};width:20px;height:20px"></span><span class="ui-row-main"><span class="ui-skel" style="--i:${k};width:${k ? 34 : 46}%;height:13px"></span><span class="ui-skel" style="--i:${k};width:${k ? 62 : 70}%;height:10px"></span></span></div>`).join('');
  function mount(el, id) {
    if (!el) return;
    if (!D()) el.innerHTML = skel();
    load().then(() => { if (el.isConnected) el.innerHTML = html(id); }, e => {
      console.warn('Psarema area profile:', e.message);
      if (!el.isConnected) return;
      el.innerHTML = `<p class="ap-off">${ic('warning')}<span>${esc(tr('r14_offLoad'))}</span></p>`;
      addEventListener('online', () => { if (el.isConnected) mount(el, id); }, { once: true });
    });
  }

  /* ---------- "Under water here": a spot's details (round 13 phase 3) ---------- */
  const REACH = { wreck: 5, artificialReef: 5, farm: 5, breakwater: 2, river: 3, outfall: 3 }; // km: farther is not "near"
  const bearing = (la, lo, la1, lo1) => (Math.atan2((lo1 - lo) * KX, (la1 - la) * KY) * 180 / Math.PI + 360) % 360; // KX, KY: km per cell, both axes one RES
  function dropNear(i) { // the nearest cell (within 3 km, 3–60 m deep) from which the seabed falls 20 m or more within ~500 m: the build's rule
    const x0 = i % W, y0 = i / W | 0; let best = null;
    for (let y = Math.max(2, y0 - 11); y <= Math.min(H - 3, y0 + 11); y++) for (let x = Math.max(2, x0 - 13); x <= Math.min(W - 3, x0 + 13); x++) {
      const c = y * W + x, d = dFit[c], km = Math.hypot((x - x0) * KX, (y - y0) * KY);
      if (!depth[c] || d < 3 || d > 60 || km > 3 || best && km >= best.km) continue;
      let dm = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = c + dy * W + dx; if (depth[j] && Math.hypot(dx * KX, dy * KY) <= .6) dm = Math.max(dm, dFit[j]); }
      if (dm - d >= 20) best = { km, deg: bearing(latOf(i), lonOf(i), latOf(c), lonOf(c)), d0: d, d1: dm };
    }
    return best;
  }
  function here(i) {
    const la = latOf(i), lo = lonOf(i), A = window.PSAREMA_ATTRACTORS?.points || {}, near = [];
    for (const kind in REACH) {
      let b = null;
      for (const k of kind === 'outfall' ? ['outfallDesal', 'outfallPower', 'outfallOther'] : [kind]) for (const p of A[k] || []) {
        const km = Math.max(0, Math.hypot((p[1] - lo) * KX, (p[0] - la) * KY) / RES - (p[3] || 0)); // minus the feature's own radius: 0 = inside
        if (km <= REACH[kind] && (!b || km < b.km)) b = { kind, sub: k, name: (p[4] || '').replace(/ artificial-reef( MPA)?$/, ''), km, deg: bearing(la, lo, p[0], p[1]) };
      }
      if (b) near.push(b);
    }
    const base = clarityAt(la, lo), t = turbidityAt(la, lo);
    return { depth: depthM(i), seabed: habText(i), drop: dropNear(i), near, vis: base, turbid: t >= window.PSAREMA_AREA_CLARITY?.noise && lo >= WEST_UNVERIFIED };
  }
  const far = (km, deg, r = Math.round(km * 10) / 10) => km < .13 ? tr('ap_hHere') : `${km < 1 ? Math.round(km * 20) * 50 + ' m' : nf(r, r % 1 ? 1 : 0) + ' km'} ${compass(deg)}`; // round 16 P: 1,8 km in Greek, as everywhere else
  function hereHtml(i) {
    const h = here(i), O = { outfallDesal: 'ap_oDesal', outfallPower: 'ap_oPower', outfallOther: 'ap_oOther' }, mon = tr('months')[new Date().getMonth()];
    // round 17 G: no depth and seabed rows: the section these join (js/ui.js seabedSec, "Under water here") has them already
    const rows = [h.drop && [tr('ap_hDrop'), `${h.drop.d0} → ${h.drop.d1} m · ${far(h.drop.km, h.drop.deg)}`],
      ...h.near.map(n => [tr('ap_h_' + n.kind), [n.kind === 'outfall' ? tr(O[n.sub]) : n.name, far(n.km, n.deg)].filter(Boolean).join(' · ')]),
      [tr('ap_hVis'), Number.isNaN(h.vis) ? '…' : tr(h.turbid ? 'ap_hVisTurbid' : 'ap_hVisV', Math.round(h.vis), mon)]].filter(Boolean);
    return kvList(rows) + `<p class="ap-src">${esc(tr('ap_hNote'))}</p>`;
  }
  function addHere(host) { // ui.js / mobile.js redraw the details' innerHTML for a new spot: put the section back each time (as js/area-gear.js does its fold)
    const body = host.querySelector('.drawer-body'); if (!body || typeof sel !== 'object' || !(sel.i >= 0) || !depth[sel.i]) return;
    const key = [sel.i, state.lang, D() && window.PSAREMA_AREA_CLARITY ? 1 : 0].join(); let el = body.querySelector('.ap-here');
    if (el?.dataset.k === key) return;
    if (!el) { el = document.createElement('div'); el.className = 'ap-here'; } // inside the details' Under water section, after its rows
    const into = body.querySelector(':scope > [data-s="seabed"] > section'); if (!into) return; if (el.parentNode !== into) into.append(el);
    el.dataset.k = key; el.innerHTML = hereHtml(sel.i);
    if (!key.endsWith('1')) load(true).then(() => addHere(host), e => console.warn('Psarema area profile:', e.message)); // the visibility follows once its data is in
  }
  for (const s of ['#drawer', '#m-spot']) { const host = $(s); if (host) new MutationObserver(() => addHere(host)).observe(host, { childList: true, subtree: true }); }

  return { load, of, clarityAt, turbidityAt, here, mount, html };
})();
