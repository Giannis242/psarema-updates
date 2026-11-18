'use strict';
Object.assign(I18N.en, { ss_areas: 'Areas', ss_towns: 'Towns', ss_top: 'Biting this week', ss_clearAll: 'Clear' });
Object.assign(I18N.el, { ss_areas: 'Περιοχές', ss_towns: 'Πόλεις και χωριά', ss_top: 'Τρώνε αυτή την εβδομάδα', ss_clearAll: 'Καθαρισμός' });
// Psarema: the map's search (css/search.css), Fishbrain-style. PsSearch.mount(el) draws a search field into el; results come as you type, in
// sections: fish (English, Greek, Cypriot and scientific names), spots (the named spots, data/spots.js), areas (data/areas.js) and towns (core.js
// PLACES). Accents and case are ignored (ui.js plain: no tonos, ς = σ) and Greek typed in Latin letters matches (ui.js latin: "orfos" → Ορφός).
// Picking: a place flies the map there; a spot flies there and opens its card; a fish becomes the app's fish and opens its species page (PsNav
// 'species', js/species-page.js, when there). The empty field offers the week's best fish (a strip of cut-outs), All species (that page's index)
// and the recent searches (localStorage, with Clear). Keys: ↑ ↓ Enter, Escape. Phones: the results take the whole screen and Back closes them.
// Mounted at the top of the desktop rail, and into #m-search (the phone top bar) when that is there.
const PsSearch = window.PsSearch = (() => {
  const RECENT = 'psarema-search-recent', MAX = { fish: 5, spot: 5, area: 3, town: 3 }, MAXP = { fish: 8, spot: 8, area: 5, town: 5 }; // MAXP: phones, full screen
  const GROUP = { fish: 'ss_fish', spot: 'ss_spot', area: 'ss_areas', town: 'ss_towns', recent: 'ss_recent', browse: 'ss_browse', top: 'ss_top' };
  const SPOT_IC = { harbour: 'anchor', slipway: 'anchor', pier: 'anchor', breakwater: 'anchor', wreck: 'depth', dive: 'depth', reef: 'seabed', rock: 'seabed', cape: 'location', fishing: 'rod' };
  const AREAS = window.PSAREMA_AREAS || [], areaName = a => state.lang === 'el' ? a.el : a.en;
  let items = null;
  function index() { // made on first use: ~600 entries, each with its names folded for matching
    if (items) return items;
    const near = (la, lo) => { let b = null, bd = Infinity; for (const a of AREAS) { const d = km([la, lo], [a.lat, a.lon]).d; if (d < bd && d < a.r * 1.6) { bd = d; b = a; } } return b; };
    // round 16 P: one row per place: the same name and kind within 1.5 km (two sources, a harbour's two ends) shows once, the one at sea first
    const atSea = s => { const i = idxAt(s[2], s[3]); return i >= 0 && depth[i] ? 1 : 0; }, kept = [];
    const spots = SPOTS.filter(s => s[0] && SPOT_GROUP[s[1]]).sort((a, b) => atSea(b) - atSea(a))
      .filter(s => !kept.some(o => o[0] === s[0] && o[1] === s[1] && km([o[2], o[3]], [s[2], s[3]]).d < 1.5) && kept.push(s));
    items = [
      ...AREAS.map(a => ({ k: 'area', id: 'a:' + a.id, la: a.lat, lo: a.lon, r: a.r * 600, names: [a.en, a.el], name: () => areaName(a), sub: () => '' })), // round 17 G: no "Fishing area" under each: they sit under Areas, with the area's icon
      ...PLACES.map(([en, el, la, lo]) => ({ k: 'town', id: 'p:' + en, la, lo, r: 2500, names: [en, el], name: () => state.lang === 'el' ? el : en, sub: () => tr('ss_town') })),
      ...spots.map(s => {
        const [name, t, la, lo] = s, a = near(la, lo), i = idxAt(la, lo), dm = i >= 0 && depth[i] ? ` · ${depthM(i)} m` : '';
        return { k: 'spot', id: `s:${la},${lo}`, s, t, la, lo, r: 350, names: [name, NAME_EL[name]], name: () => placeName(name), sub: () => tr('spot')[t] + (a ? ' · ' + areaName(a) : '') + dm };
      }),
      ...SPECIES.map(s => ({ k: 'fish', id: 'f:' + s.id, sp: s, names: [s.name, s.el, s.local, CY[s.id]?.also, s.scientific], name: () => fishName(s), sub: () => fishAlt(s) })),
    ];
    for (const it of items) it.keys = it.names.filter(Boolean).map(v => { const p = plain(v); return [p, latin(p)]; });
    return items;
  }
  function score(it, q, ql) { // 3 starts with, 2 a word starts with, 1 contains; Latin-typed Greek the same, a little lower
    let best = 0;
    for (const [p, l] of it.keys) {
      const v = p.startsWith(q) ? 3 : p.includes(' ' + q) || p.includes('-' + q) || p.includes('(' + q) ? 2 : p.includes(q) ? 1
        : l.startsWith(ql) ? 2.5 : l.includes(' ' + ql) ? 1.5 : l.includes(ql) ? .5 : 0;
      if (v > best) best = v;
    }
    return best;
  }
  const pages = () => !!window.PsNav?.pages?.species; // the species pages (js/species-page.js)
  const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch { return []; } };
  const remember = id => { try { localStorage.setItem(RECENT, JSON.stringify([id, ...recent().filter(x => x !== id)].slice(0, 6))); } catch {} };
  function results(text) { // [[group key, items]…]
    const q = plain(text.trim());
    if (!q) {
      const all = index(), r = recent().map(id => all.find(it => it.id === id)).filter(Boolean);
      const top = all.filter(it => it.k === 'fish' && !it.sp.banned && rank[it.sp.id]).sort((a, b) => rank[b.sp.id].s - rank[a.sp.id].s).slice(0, 8);
      return [...top.length > 2 ? [['top', top]] : [], ...pages() ? [['browse', [{ k: 'all', name: () => tr('ss_all'), sub: () => tr('ss_allSub') }]]] : [], ...r.length ? [['recent', r]] : [],
        ['area', all.filter(it => it.k === 'area')]]; // round 16 P: the fishing areas too, a tap away, instead of an empty screen
    }
    const ql = q.replace(/ch/g, 'h').replace(/y/g, 'i'), by = { fish: [], spot: [], area: [], town: [] }, lim = isPhone() ? MAXP : MAX;
    for (const it of index()) { const v = score(it, q, ql); if (v) by[it.k].push([v, it]); }
    return Object.entries(by).filter(([, a]) => a.length).map(([k, a]) => [k, a.sort((x, y) => y[0] - x[0] || x[1].name().length - y[1].name().length).slice(0, lim[k]).map(x => x[1])]);
  }
  function mark(name, q) { // the typed part in bold, found accent-blind (each letter of the folded name points back to its letter in the name)
    if (!q) return esc(name);
    let p = ''; const at = [];
    for (let i = 0; i < name.length; i++) for (const ch of plain(name[i])) { p += ch; at.push(i); }
    const j = p.indexOf(q); if (j < 0) return esc(name);
    const a = at[j], b = at[j + q.length - 1] + 1;
    return esc(name.slice(0, a)) + '<mark>' + esc(name.slice(a, b)) + '</mark>' + esc(name.slice(b));
  }
  const cutOf = s => CUT[s.id] ? `<img src="${esc(CUT[s.id].file)}" alt="" loading="lazy" decoding="async">` : fishImg(s);
  function row(it, n, q, g) {
    const r = it.k === 'fish' && !it.sp.banned && rank[it.sp.id]?.s; // the week's best chance: the only colour here
    if (g === 'top') return `<div class="pss-tile" role="option" id="pss-o${n}" data-n="${n}" aria-selected="false"><span class="pss-stage">${cutOf(it.sp)}</span>` +
      `<b>${esc(it.name())}</b>${r ? ring(r, 'sm') : ''}</div>`;
    const art = it.k === 'fish' ? `<span class="pss-art">${cutOf(it.sp)}</span>`
      : `<span class="pss-ic">${ic(it.k === 'all' ? 'fish-list' : it.k === 'area' ? 'waves' : it.k === 'town' ? 'location' : SPOT_IC[it.t] || 'pin')}</span>`;
    const side = r ? ring(r, 'sm') : it.k === 'fish' ? '' : `<span class="pss-more">${ic(g === 'recent' ? 'clock' : 'chevron-right')}</span>`;
    return `<div class="pss-row" role="option" id="pss-o${n}" data-n="${n}" aria-selected="false">${art}<span class="pss-t"><b>${mark(it.name(), q)}</b>` +
      `${it.sub() ? `<small>${esc(it.sub())}</small>` : ''}</span>${side}</div>`;
  }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function go(it) {
    if (it.k === 'all') { PsNav.open('species'); return; }
    remember(it.id);
    if (it.k === 'fish') { if (state.sp !== it.sp.id) chooseFish(it.sp.id); if (pages()) PsNav.open('species', it.sp.id); return; } // the map shows it too, under the page
    const pad = isPhone() ? window.PsMobile?.pad?.() || {} : { paddingTopLeft: [$('#rail')?.classList.contains('collapsed') ? 20 : 350, 60] };
    map.flyToBounds(L.latLng(it.la, it.lo).toBounds(it.r * 2), { ...pad, maxZoom: it.k === 'spot' ? 15 : 13, duration: .8, animate: !reduced() });
    if (it.k === 'spot') map.once('moveend', () => openSpot(it.s)); // ui.js: the spot's card (phones: in the sheet)
    if (it.k === 'area' && window.PsAreas) PsAreas.open(it.id.slice(2)); // js/areas.js: the area's page (its 3D view, fish, spots, baits)
  }

  let n = 0;
  function mount(host) {
    if (!host || host.psSearch) return host?.psSearch;
    const id = 'pss' + n++, root = L.DomUtil.create('div', 'pss', host);
    root.innerHTML = `<div class="pss-field"><button type="button" class="pss-back" data-i18n-aria="ss_back">${ic('chevron-left')}</button>${ic('search', 'pss-lens')}` +
      `<input type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list">` +
      `<button type="button" class="pss-x" hidden data-i18n-aria="ss_clear">${ic('close')}</button></div><div class="pss-list" id="${id}-list" role="listbox" hidden></div>`;
    L.DomEvent.disableClickPropagation(root); L.DomEvent.disableScrollPropagation(root);
    const input = root.querySelector('input'), list = root.querySelector('.pss-list'), x = root.querySelector('.pss-x');
    let shown = [], act = -1, open = false, guard = false, eat = false;
    const lang = () => { input.placeholder = tr('ss_ph'); for (const [el, k] of [[input, 'ss_ph'], [x, 'ss_clear'], [root.querySelector('.pss-back'), 'ss_back']]) el.setAttribute('aria-label', tr(k)); };
    lang();
    function draw() {
      const q = plain(input.value.trim()), groups = results(input.value);
      shown = groups.flatMap(g => g[1]); act = q && shown.length ? 0 : -1;
      x.hidden = !input.value;
      let k = 0;
      list.innerHTML = groups.map(([g, a]) => `<div class="pss-grp g-${g}" role="group" aria-label="${esc(tr(GROUP[g]))}"><p class="pss-h"><span class="lbl">${esc(tr(GROUP[g]))}</span>` +
        (g === 'recent' ? `<button type="button" class="pss-clr" data-pss-clear>${esc(tr('ss_clearAll'))}</button>` : q && a.length > 1 ? `<small>${a.length}</small>` : '') +
        `</p><div class="pss-rows">${a.map(it => row(it, k++, q, g)).join('')}</div></div>`).join('') ||
        `<p class="pss-empty">${esc(q ? tr('ss_none', input.value.trim()) : tr('ss_hint'))}${q ? `<small>${esc(tr('ss_hint'))}</small>` : ''}</p>`; // round 16 P: nothing found says what to try
      hilite();
    }
    function hilite() {
      for (const r of list.querySelectorAll('[data-n]')) r.setAttribute('aria-selected', +r.dataset.n === act);
      const r = act >= 0 && list.querySelector(`[data-n="${act}"]`);
      if (r) { input.setAttribute('aria-activedescendant', r.id); r.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
    }
    function show() {
      if (open) return;
      open = true; list.hidden = false; input.setAttribute('aria-expanded', 'true'); draw();
      if (isPhone()) { // the whole screen (from <body>: a transformed bar would trap a fixed box), and a history step so Back closes it
        host.style.minHeight = host.offsetHeight + 'px'; document.body.append(root); root.classList.add('full');
        if (document.activeElement !== input) input.focus({ preventScroll: true });
        if (!history.state?.psSearch) { history.pushState({ psSearch: 1 }, ''); guard = true; }
      }
    }
    function hide(blur = true) {
      if (!open) return;
      open = false; list.hidden = true; input.setAttribute('aria-expanded', 'false'); root.classList.remove('full');
      if (blur) input.blur();
      if (root.parentNode !== host) { host.append(root); host.style.minHeight = ''; }
      if (guard) { guard = false; if (history.state?.psSearch) { eat = true; history.back(); } }
    }
    // A pick acts once the full screen's history step is gone (phones): a page or card opened sooner would push its own step before that Back lands
    let after = null;
    const run = () => { const f = after; after = null; f?.(); };
    function pick(n) { const it = shown[n]; if (!it) return; input.value = ''; after = () => go(it); hide(); if (eat) setTimeout(run, 400); else run(); }
    input.addEventListener('focus', show);
    root.addEventListener('pointerdown', e => { // phones: a tap on the bar's field opens the full screen first, then the keyboard (focus inside the tap)
      if (!isPhone() || open || !e.target.closest('.pss-field')) return;
      e.preventDefault(); show();
    });
    input.addEventListener('input', () => { if (!open) show(); else draw(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) show(); if (shown.length) { act = (act + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length; hilite(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (act >= 0) pick(act); else if (shown.length && input.value.trim()) pick(0); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (input.value) { input.value = ''; draw(); } else hide(); }
    });
    list.addEventListener('pointerdown', e => { if (!isPhone()) e.preventDefault(); }); // keep the field focused (a desktop click would blur it and close the list first)
    list.addEventListener('click', e => {
      if (e.target.closest('[data-pss-clear]')) { try { localStorage.removeItem(RECENT); } catch {} draw(); if (!isPhone()) input.focus(); return; }
      const r = e.target.closest('[data-n]'); if (r) pick(+r.dataset.n);
    });
    list.addEventListener('pointermove', e => { const r = e.target.closest('[data-n]'); if (r && +r.dataset.n !== act && e.pointerType === 'mouse') { act = +r.dataset.n; hilite(); } });
    x.addEventListener('click', () => { input.value = ''; draw(); input.focus(); });
    root.querySelector('.pss-back').addEventListener('click', () => { input.value = ''; hide(); });
    input.addEventListener('blur', () => { if (!isPhone()) setTimeout(() => { if (document.activeElement !== input) hide(false); }, 0); }); // desktop: a click elsewhere closes it
    addEventListener('popstate', e => { // before js/mobile.js's listener (capture): Back closes the results, nothing under them
      if (eat) { eat = false; e.stopImmediatePropagation(); run(); return; }
      if (guard && !history.state?.psSearch) { guard = false; e.stopImmediatePropagation(); hide(); }
    }, true);
    new MutationObserver(() => { lang(); if (open) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    return host.psSearch = { root, input, open: show, close: hide };
  }

  { // desktop: at the top of the rail, under the brand and its status line (it stays when the rail folds); phones: the top bar's slot, when there
    const at = $('#rail #status') || $('#rail .rail-head');
    if (at) { const slot = L.DomUtil.create('div', 'rail-search'); at.after(slot); mount(slot); }
    mount($('#m-search'));
  }
  return { mount, results };
})();
