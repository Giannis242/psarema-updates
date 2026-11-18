'use strict';
Object.assign(I18N.en, { fd_views: 'Feed view', fd_private: 'Only on this phone', fd_art: 'Drawing, not a photo', fd_mapHint: 'Tap to show it on the map',
  fd_area: 'Area named in the report' });
Object.assign(I18N.el, { fd_views: 'Προβολή ροής', fd_private: 'Μόνο σε αυτό το τηλέφωνο', fd_art: 'Σχέδιο, όχι φωτογραφία', fd_mapHint: 'Πατήστε για να το δείτε στον χάρτη',
  fd_area: 'Περιοχή που αναφέρει η είδηση' });
// Round 8: every item is a post card (header: avatar, title, place · time ago, a kind badge; a big media area: the photo, else a drawn
// header of the fish's cut-out over a depth gradient, labelled as a drawing; a row of fact chips; the text; a footer: who and the licence).
// Your own catches wear your local account (window.PsAccount, 'ps:account') when there is one. A sighting's or report's page: a hero, the
// fact chips and rows, a small locator map drawn from data/coast.js (offline, no tiles), and the actions.
// Psarema: the Feed (css/feed.css), Fishbrain's catch feed made honestly from open data: the newest fish sightings in Cyprus waters (js/records.js
// PsRecords: iNaturalist and GBIF observers, each with their name and licence) and your own catches (PsCatch, marked You). A sighting is a fish
// someone saw, never a catch, and the page says so. Filters: Near me / All Cyprus; Psarema's fish / all species / one fish (round 17 G: one
// picker, a native list under a button, where a row of ~20 chips with pictures was).
// Pages (js/nav.js): 'feed' (a tab) and 'sighting' (arg: a record id): the photo, what, when, where, who, the licence, Show on map (PsPins.focus,
// else a marker), the fish's own page, and the original on iNaturalist / GBIF (a target=_blank link: the Android app hands those to the browser).
// Nothing loads before the Feed first opens. The list draws 10 cards at a time as you scroll and asks PsRecords for the next page at its end;
// after 3 pages that add nothing to what shows (a filter that matches little), a button asks before loading more (mobile data at sea).
const PsFeed = window.PsFeed = (() => {
  const PREF = 'psarema-feed-v1', STEP = 10, NEAR_KM = 25, IDLE = 3;
  const f = { near: false, rep: false, pick: '' }; // rep: the Reports view (published catches) instead of sightings // pick: '' Psarema's fish, '*' every species, else one fish id
  try { Object.assign(f, JSON.parse(localStorage.getItem(PREF))); } catch {}
  const keep = () => { try { localStorage.setItem(PREF, JSON.stringify(f)); } catch {} };
  const R = () => window.PsRecords, page = id => !!window.PsNav?.pages?.[id];
  let root = null, rows = [], shown = 0, gen = 0, busy = false, failed = false, idle = 0, io = null;

  /* ---------- Words ---------- */
  const AREAS = window.PSAREMA_AREAS || [];
  function areaOf(la, lo) { // the fishing area it is in (data/areas.js), or ''
    let b = null, bd = Infinity;
    for (const a of AREAS) { const d = km([a.lat, a.lon], [la, lo]).d; if (d < a.r && d < bd) { b = a; bd = d; } }
    return b ? (state.lang === 'el' ? b.el : b.en) : '';
  }
  const placeOf = (la, lo) => areaOf(la, lo) || describe(la, lo); // else "2.1 km SW of Paphos"
  const ymd = t => Date.parse(fmtOf('ymd', () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })).format(t));
  function ago(r) { // by calendar day in Cyprus (many records have a date and no time): today, yesterday, 3 days ago, 2 months ago
    if (r.src === 'static' || r.rep && r.mo) return fmtT(r.t, r.mo ? { month: 'long', year: 'numeric' } : { year: 'numeric' });
    const d = Math.round((ymd(r.t) - ymd(Date.now())) / 864e5), rf = fmtOf('rel' + locale(), () => new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' }));
    return d > -30 ? rf.format(Math.min(d, 0), 'day') : d > -365 ? rf.format(Math.round(d / 30.44), 'month') : rf.format(Math.round(d / 365.25), 'year');
  }
  const licName = l => !l ? '' : l === 'cc0' ? 'CC0' : l.toUpperCase().replace(/^CC-/, 'CC ');
  const srcName = s => ({ inat: 'iNaturalist', gbif: 'GBIF' })[s] || tr('fd_builtIn');
  const nameOf = r => { const s = r.sp && byId(r.sp); return s ? fishName(s) : r.name || r.sci; };
  const av = sp => CUT[sp] ? `<img src="${esc(CUT[sp].file)}" alt="" loading="lazy" decoding="async">` : ic('fish');
  const far = r => state.loc ? km(state.loc, [r.lat, r.lon]).d : null;

  /* ---------- Your catches (js/catchlog.js), as feed rows ---------- */
  const urls = new Map(); // catch id → its photo's object URL
  function catches() {
    const C = window.PsCatch; if (!C) return [];
    const list = (typeof C.entries === 'function' ? C.entries() : C.entries) || [];
    const out = [];
    for (const e of list) {
      if (e.n === 0 || !e.sp || !byId(e.sp)) continue; // a blank trip is not a catch
      const lat = e.lat ?? (e.cell >= 0 ? latOf(e.cell) : NaN), lon = e.lon ?? (e.cell >= 0 ? lonOf(e.cell) : NaN);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      let photo = urls.get(e.id); if (!photo && e.photo instanceof Blob) urls.set(e.id, photo = URL.createObjectURL(e.photo));
      out.push({ id: 'you:' + e.id, cid: e.id, you: true, sp: e.sp, lat, lon, t: e.t, photo, n: e.n, kg: e.kg, cm: e.cm, mode: e.mode, released: e.released, note: e.note });
    }
    return out;
  }

  /* ---------- Published catch reports (data/reports.js): news, official and club pages; facts and a link, never who ---------- */
  let reps = null; // id → report row, built once
  function reports() {
    if (!reps) {
      reps = new Map();
      for (const x of window.PSAREMA_REPORTS?.rows || []) {
        const [y, m, d] = x.date.split('-').map(Number);
        reps.set(x.id, { ...x, rep: true, sp: x.sci ? R()?.spOf?.(x.sci) ?? null : null, name: x.name, t: Date.UTC(y, (m || 1) - 1, d || 15), mo: d ? 0 : m });
      }
    }
    return [...reps.values()];
  }
  const repText = r => state.lang === 'el' && r.el || r.en;
  const repFacts = r => [r.n > 1 && '×' + r.n, r.kg && nf(r.kg, r.kg < 10 ? 1 : 0) + ' kg', r.cm && Math.round(r.cm) + ' cm', r.method].filter(Boolean);

  /* ---------- Your local account (js by agent 6): a name and a picture on your own posts, when there is one ---------- */
  function acct() {
    let p = null; try { p = window.PsAccount?.get?.(); } catch {}
    const name = p && String(p.name || p.displayName || '').trim(), pic = p && (p.avatar || p.photo || p.pic);
    return name ? { name, pic: typeof pic === 'string' && /^(data:image\/|blob:|https?:|assets\/)/.test(pic) ? pic : '' } : null;
  }
  const initials = s => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => [...w][0]).join('').toUpperCase();

  /* ---------- Post cards: header, media (a fixed box, so nothing jumps as it loads), fact chips, text, footer ---------- */
  const KIND = r => r.you ? ['k-you', tr('fd_you')] : r.rep ? ['k-rep', tr('fd_report')] : ['k-sg', tr('fd_kind')];
  // The drawn header (no photo, or while one loads or after it fails): the cut-out over a depth gradient, never passed off as a photo
  const art = sp => `<div class="fd-art" aria-hidden="true">${CUT[sp] ? `<img src="${esc(CUT[sp].file)}" alt="" loading="lazy" decoding="async">` : ic('fish')}` +
    `<span class="fd-art-lbl">${esc(tr('fd_art'))}</span></div>`;
  const photoImg = (src, alt = '') => `<img class="fd-pic" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" data-in data-fb="rm">`; // js/core.js: .in on load, gone on error
  function facts(r, dist = true) { // [icon, text] chips: how many, how heavy, how long, how (method or your mode), released, how far
    const d = dist ? far(r) : null;
    return [r.n > 1 && ['fish', '×' + r.n], r.kg && ['', nf(r.kg, r.kg < 10 ? 1 : 0) + ' kg'], r.cm && ['', Math.round(r.cm) + ' cm'],
      r.method && ['hook', r.method], r.mode && [r.mode, tr(r.mode)], r.released && ['check', tr('fd_released')], d != null && ['pin', fmtKm(d) + ' km']].filter(Boolean);
  }
  const chipRow = (r, dist) => { const x = facts(r, dist); return x.length ? `<ul class="fd-facts">${x.map(([i, t]) => `<li>${i ? ic(i, 'sm') : ''}<span>${esc(t)}</span></li>`).join('')}</ul>` : ''; };
  function card(r) {
    const name = nameOf(r), me = r.you && acct(), [kc, kt] = KIND(r); // round 17 G: the scientific name is on the post's page, not the card
    const where = r.rep ? r.place : placeOf(r.lat, r.lon);
    const avatar = me ? `<span class="fd-av me">${me.pic ? `<img src="${esc(me.pic)}" alt="">` : esc(initials(me.name))}</span>` : `<span class="fd-av">${av(r.sp)}</span>`;
    const text = r.rep ? repText(r) : r.you ? r.note : '';
    const foot = r.you ? `${ic('shield', 'sm')}<span>${esc(tr('fd_private'))}</span>`
      : r.rep ? `${ic('book', 'sm')}<span>${esc(r.pub)}</span>`
      : `${ic('eye', 'sm')}<span>${[r.src !== 'static' && esc(r.by || tr('fd_anon')), esc(srcName(r.src))].filter(Boolean).join(' · ')}</span>${r.lic ? `<b class="fd-lic">${esc(licName(r.lic))}</b>` : ''}`;
    return `<article class="fd-card ${kc}" ${r.you ? `data-fd-catch="${esc(r.cid)}"` : `data-fd-rec="${esc(r.id)}"`} tabindex="0" role="link" aria-label="${esc(`${name} · ${kt}`)}">` +
      `<header class="fd-hd">${avatar}<span class="fd-ttl"><b>${esc(me ? me.name : name)}</b><small>${esc([where, ago(r)].filter(Boolean).join(' · '))}</small></span>` +
      `<span class="fd-badge">${esc(kt)}</span></header>` +
      `<div class="fd-media${r.photo ? ' ph' : ''}">${art(r.sp)}${r.photo ? photoImg(r.photo) : ''}</div>` +
      `<div class="fd-body">${me ? `<p class="fd-what">${esc(name)}</p>` : ''}${chipRow(r)}` +
      (text ? `<p class="fd-tx">${esc(text)}</p>` : '') + `</div>` +
      `<footer class="fd-ft">${foot}</footer></article>`;
  }
  const skel = n => Array.from({ length: n }, () => '<div class="fd-card fd-skel" aria-hidden="true"><div class="fd-hd"><span class="fd-av"></span><span class="fd-ttl"><b></b><i></i></span></div><div class="fd-media"></div><div class="fd-ft"><b></b></div></div>').join('');

  /* ---------- The page ---------- */
  const q = s => root.querySelector(s);
  function render(el) {
    root = el;
    const acts = el.closest('.pg')?.querySelector('.pg-acts'), rf = `<button class="icon-btn fd-rf" data-fd="refresh" aria-label="${esc(tr('fd_refresh'))}" title="${esc(tr('fd_refresh'))}">${ic('refresh')}</button>`;
    if (acts) { acts.querySelector('.fd-rf')?.remove(); acts.insertAdjacentHTML('beforeend', rf); acts.querySelector('.fd-rf').onclick = click; }
    el.innerHTML = `<div class="fd">` +
      `<div class="fd-bar"><div class="fd-seg fd-tabs" role="group" aria-label="${esc(tr('fd_views'))}">${['near', 'all', 'rep'].map(k => `<button data-fd="${k}">${esc(tr('fd_' + k))}</button>`).join('')}</div>${acts ? '' : rf}</div>` +
      `<label class="fd-pick">${ic('fish', 'sm')}<b></b>${ic('chevron-down', 'sm')}<select data-fd-picks aria-label="${esc(tr('fd_fish'))}"></select></label>` +
      `<p class="fd-intro">${ic('eye', 'sm')}<span>${esc(tr('fd_intro'))}</span></p><div class="fd-msg" role="status"></div>` +
      `<div class="fd-list">${skel(2)}</div><div class="fd-more"></div></div>`;
    io?.disconnect();
    io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) step(); }, { rootMargin: '0px 0px 900px 0px' });
    shown = 0; rows = [];
    el.onclick = click;
    el.onchange = e => { const v = e.target.matches?.('[data-fd-picks]') && e.target.value; if (v === false || v === f.pick) return; f.pick = v; keep(); root.scrollTop = 0; rebuild(true); }; // the fish picker
    el.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.fd-card[tabindex]')) { e.preventDefault(); click(e); } };
  }
  const visible = () => root?.isConnected && !root.closest('[hidden]');
  function marks() { for (const b of root.querySelectorAll('.fd-seg [data-fd]')) b.setAttribute('aria-pressed', String(f.rep ? b.dataset.fd === 'rep' : b.dataset.fd !== 'rep' && (b.dataset.fd === 'near') === f.near)); }

  async function rebuild(reset) { // the rows for the filters; drawn again from the top only when something changed above what shows
    if (!root) return;
    const g = ++gen, Rx = R(), one = f.pick && f.pick !== '*' ? f.pick : '', loc = state.loc, near = f.near && loc ? [loc[0], loc[1], NEAR_KM] : null;
    if (reset) idle = 0;
    q('.fd-intro span').textContent = tr(f.rep ? 'fd_repIntro' : 'fd_intro');
    if (f.rep) { // every report at once, newest first: a few hundred rows, no paging
      const all = reports();
      rows = all.filter(r => one ? r.sp === one : f.pick !== '' || r.sp).sort((a, b) => b.t - a.t);
      q('.fd-msg').innerHTML = ''; q('.fd-list').innerHTML = ''; shown = 0;
      draw(STEP); picker(all); return;
    }
    if (f.near && !loc && !f.rep) { // no location: say how to get one
      q('.fd-msg').innerHTML = `<div class="empty fd-note">${ic('my-location')}<p>${esc(tr('fd_noLoc'))}</p><div class="fd-btns"><button class="btn primary" data-fd="locate">${esc(tr('fd_locate'))}</button>` +
        `<button class="btn" data-fd="all">${esc(tr('fd_all'))}</button></div></div>`;
      q('.fd-list').innerHTML = ''; q('.fd-more').innerHTML = ''; rows = []; shown = 0; picker([]); return;
    }
    if (!shown) q('.fd-list').innerHTML = skel(2);
    let recs = [], base = [];
    try { if (Rx) { recs = await Rx.query({ ...one && { sp: one }, ...near && { near } }); base = one ? await Rx.query(near ? { near } : {}) : recs; } }
    catch (e) { console.warn('feed:', e); }
    if (g !== gen || !root) return;
    const fr = one ? -Infinity : Rx?.front() ?? -Infinity; // down to where every source is loaded: a later page only adds below it
    const mineAll = catches().filter(c => !near || km(loc, [c.lat, c.lon]).d <= NEAR_KM), mine = mineAll.filter(c => !one || c.sp === one);
    const next = [...recs.filter(r => (f.pick !== '' || r.sp) && (one || r.t >= fr)), ...mine.filter(c => one || c.t >= fr)].sort((a, b) => b.t - a.t);
    const same = !reset && shown && next.length >= shown && next.slice(0, shown).every((r, k) => r.id === rows[k].id);
    rows = next;
    if (!same) { q('.fd-list').innerHTML = ''; shown = 0; }
    note(); draw(Math.max(shown, STEP)); picker([...base, ...mineAll]);
  }
  function note() { // offline, the saved copy, failing: one quiet line over the list
    const i = R()?.info(), msg = q('.fd-msg'), at = i && fmtT(i.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    msg.innerHTML = !i ? '' : i.src === 'static' ? `<p class="fd-warn">${ic('warning', 'sm')}<span>${esc(tr('fd_static'))}</span></p>`
      : i.err && i.src === 'cache' ? `<p class="fd-warn">${ic('warning', 'sm')}<span>${esc(tr('fd_saved', at))}</span></p>` : '';
  }
  function draw(n) { // cards up to n, then the foot: the sentinel, a skeleton while loading, a retry, Load more, the end or the empty state
    if (n > shown) { q('.fd-list').insertAdjacentHTML('beforeend', rows.slice(shown, n).map(card).join('')); shown = Math.min(n, rows.length); }
    const i = R()?.info(), end = f.rep || !i || i.end, more = q('.fd-more'), last = shown >= rows.length, ask = last && !end && idle >= IDLE;
    const btn = (k, icon, label) => `<button class="btn" data-fd="${k}">${ic(icon, 'sm')}${esc(label)}</button>`;
    more.innerHTML = !last ? '' : busy ? skel(1) : failed ? `<div class="fd-end"><span>${esc(tr('fd_moreErr'))}</span>${btn('more', 'refresh', tr('fd_retry'))}</div>`
      : ask ? `<div class="fd-end">${btn('more', 'chevron-down', tr('fd_older'))}</div>` : !end ? (i.busy && !rows.length ? skel(1) : '')
      : rows.length ? `<p class="fd-end">${esc(tr('fd_end'))}</p>`
      : `<div class="empty fd-note">${ic('fish')}<p>${esc(f.near ? tr('fd_emptyNear', NEAR_KM) : tr('fd_empty'))}</p>${f.near ? `<div class="fd-btns"><button class="btn" data-fd="all">${esc(tr('fd_all'))}</button></div>` : ''}</div>`;
    io.unobserve(more); if (!failed && !ask && !(end && last)) io.observe(more); // observing again reports it at once while it still shows
  }
  async function step() { // the next cards, else the next page from the APIs
    if (!visible() || f.near && !state.loc && !f.rep) return; // round 16 P: Near me with no location asks for one: no skeleton under it, no pages loaded for nothing
    if (shown < rows.length) { draw(shown + STEP); return; }
    if (f.rep) return;
    if (busy || failed || idle >= IDLE || !R() || R().info().end) return;
    busy = true; draw(shown);
    const had = rows.length, ok = await R().more();
    busy = false; failed = !ok && !R().info().end;
    if (!visible()) return;
    await rebuild();
    idle = rows.length > had ? 0 : idle + 1; draw(shown);
  }
  function picker(list) { // Psarema's fish, every species, then each fish loaded (within reach with Near me), most sightings first, with how many
    const box = q('[data-fd-picks]'); if (!box) return;
    const n = {}; for (const r of list) if (r.sp) n[r.sp] = (n[r.sp] || 0) + 1;
    const ids = Object.keys(n).sort((a, b) => n[b] - n[a]), one = f.pick && f.pick !== '*' ? f.pick : '';
    if (one && !ids.includes(one)) ids.unshift(one);
    const o = (k, label) => `<option value="${esc(k)}"${f.pick === k ? ' selected' : ''}>${esc(label)}</option>`;
    const html = o('', tr('fd_ours')) + o('*', tr('fd_every')) + ids.map(id => o(id, fishName(byId(id)) + (n[id] ? ` · ${n[id]}` : ''))).join('');
    if (html !== box.psHtml) { box.psHtml = html; box.innerHTML = html; } // the same list is not written again
    box.parentNode.querySelector('b').textContent = f.pick === '' ? tr('fd_ours') : f.pick === '*' ? tr('fd_every') : fishName(byId(f.pick)); // the button's words
  }
  function click(e) {
    const t = e.target.closest('[data-fd], [data-fd-rec], [data-fd-catch]'); if (!t) return;
    const d = t.dataset;
    if (d.fdRec) { PsNav.open('sighting', d.fdRec); return; }
    if (d.fdCatch) { if (page('catch')) PsNav.open('catch', d.fdCatch); else window.PsCatch?.open?.('list'); return; }
    switch (d.fd) {
      case 'near': case 'all': if (f.rep || f.near !== (d.fd === 'near')) { f.rep = false; f.near = d.fd === 'near'; keep(); marks(); root.scrollTop = 0; rebuild(true); } break;
      case 'rep': if (!f.rep) { f.rep = true; keep(); marks(); root.scrollTop = 0; rebuild(true); } break;
      case 'refresh': if (R() && !t.hasAttribute('aria-busy')) {
        t.setAttribute('aria-busy', 'true'); rows = []; shown = 0; failed = false; q('.fd-list').innerHTML = skel(2); q('.fd-more').innerHTML = '';
        R().refresh().finally(() => { t.removeAttribute('aria-busy'); rebuild(true); });
      } break;
      case 'more': failed = false; idle = 0; step(); break;
      case 'locate': PsNav.open('map'); if (typeof locateMe === 'function') locateMe(); break;
    }
  }
  // New records or catches: redraw now when the Feed shows (it draws afresh whenever it opens)
  const update = () => { if (visible() && !busy) rebuild(); };
  document.addEventListener('ps:records', update);
  document.addEventListener('ps:catches', update);
  document.addEventListener('ps:account', () => { // your name and picture on your own posts: draw the shown cards again
    if (!visible() || !rows.length) return;
    const n = shown; q('.fd-list').innerHTML = ''; shown = 0; draw(Math.max(n, STEP));
  });

  /* ---------- One sighting ---------- */
  let mark = null; // the stand-in marker when there are no pins (js/pins.js)
  // The locator: the coast around the place (data/coast.js, drawn once as one path in km: x east of 32°E, y south of 36°N), a dot at
  // a sighting, a wider soft ring for a report (the area it names, not a spot). No tiles, so it shows offline too.
  const KX = 111.32 * Math.cos(35 * Math.PI / 180), KY = 111.32;
  let coastD = null;
  function coastPath() {
    if (coastD == null) {
      coastD = '';
      for (const ring of window.PSAREMA_COAST || []) {
        let px = NaN, py = NaN, s = '';
        for (let k = 0; k < ring.length; k += 2) {
          const x = (ring[k + 1] - 32) * KX, y = (36 - ring[k]) * KY;
          if (s && Math.abs(x - px) + Math.abs(y - py) < .12) continue; // ~120 m: finer than a pixel at this zoom
          s += (s ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2); px = x; py = y;
        }
        coastD += s + 'Z';
      }
    }
    return coastD;
  }
  function mini(r, place) {
    const W = 30, H = 12, x = (r.lon - 32) * KX, y = (36 - r.lat) * KY, c = `cx="${x.toFixed(2)}" cy="${y.toFixed(2)}"`;
    return `<button type="button" class="sg-mm" data-sg="map" aria-label="${esc(tr('fd_showMap'))}">` +
      `<svg viewBox="${(x - W / 2).toFixed(2)} ${(y - H / 2).toFixed(2)} ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
      `<path class="sg-mm-land" d="${coastPath()}" vector-effect="non-scaling-stroke"/>` +
      (r.rep ? `<circle class="sg-mm-area" ${c} r="2.4" vector-effect="non-scaling-stroke"/>` : `<circle class="sg-mm-halo" ${c} r="1.1"/>`) +
      `<circle class="sg-mm-dot" ${c} r=".42" vector-effect="non-scaling-stroke"/></svg>` +
      `<span class="sg-mm-cap">${ic('pin', 'sm')}<span><b>${esc(place)}</b><small>${esc(tr(r.rep ? 'fd_area' : 'fd_mapHint'))}</small></span>${ic('chevron-right', 'sm')}</span></button>`;
  }
  // One sighting or report: the hero, who and where, the fact chips, the text, the rows, the locator, the actions, the honesty note
  function sheet(el, r, o) {
    const s = r.sp && byId(r.sp), name = nameOf(r), [kc, kt] = KIND(r), d = far(r);
    const list = [...o.rows.slice(0, 2), d != null && ['fd_from', esc(fmtKm(d) + ' km')], ...o.rows.slice(2)].filter(Boolean);
    el.scrollTop = 0; el.innerHTML = `<article class="sg ${kc}">` +
      `<figure class="sg-hero${o.big ? ' ph' : ''}">${art(r.sp)}${o.big ? photoImg(o.big, name) : ''}<span class="fd-badge">${esc(kt)}</span></figure>` +
      `<header class="sg-hd"><span class="fd-av lg">${av(r.sp)}</span><div><h3>${esc(name)}</h3>${o.sub ? `<p>${o.sub}</p>` : ''}` +
      `<small>${esc([o.place, ago(r)].join(' · '))}</small></div></header>` +
      chipRow(r, false).replace('fd-facts', 'fd-facts sg-chips') + (o.text ? `<p class="sg-tx">${esc(o.text)}</p>` : '') +
      `<dl class="sg-facts">${list.map(([k, v]) => `<div><dt class="lbl">${esc(tr(k))}</dt><dd>${v}</dd></div>`).join('')}</dl>` +
      mini(r, o.place) +
      `<div class="sg-acts"><button type="button" class="btn primary" data-sg="map">${ic('map', 'sm')}${esc(tr('fd_showMap'))}</button>` +
      (s && page('species') ? `<button type="button" class="btn" data-sg="fish">${ic('fish', 'sm')}${esc(tr('fd_fishPage'))}</button>` : '') +
      (r.url ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${ic('external', 'sm')}${esc(o.open)}</a>` : '') + `</div>` +
      `<p class="hint sg-note">${ic('info', 'sm')}<span>${esc(tr(o.honest))}</span></p></article>`;
    el.onclick = e => {
      const b = e.target.closest('[data-sg]'); if (!b) return;
      if (b.dataset.sg === 'fish') { PsNav.open('species', r.sp); return; }
      const fly = () => { // no pins (or a report): a marker of our own, gone after a while
        PsNav.open('map'); mark?.remove();
        const m = mark = L.circleMarker([r.lat, r.lon], { radius: 9, color: '#f5f5f5', weight: 2, fillColor: '#121212', fillOpacity: .9 }).addTo(map)
          .bindTooltip(esc(name), { permanent: true, direction: 'top', offset: [0, -10] });
        map.flyTo([r.lat, r.lon], Math.max(map.getZoom(), r.rep ? 12 : 13), { duration: .6, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
        setTimeout(() => m.remove(), 12000);
      };
      if (!r.rep && window.PsPins?.focus) Promise.resolve(PsPins.focus({ kind: 'record', id: r.id })).then(ok => ok || fly(), fly); else fly();
    };
  }
  function repDetail(el, r) { // one published report: the facts in our words, the place it names, and the article
    const DAY = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
    const when = (r.mo ? ago(r) : fmtT(r.t, DAY) + ' · ' + ago(r)) + (r.pubd ? ' · ' + tr('fd_pubDate') : '');
    sheet(el, r, { place: r.place, sub: r.sci ? `<i>${esc(r.sci)}</i>` : '', text: repText(r), open: tr('fd_readRep'), honest: 'fd_repHonest',
      rows: [['fd_when', esc(when)], ['fd_where', `${esc(r.place)}<small>${esc(tr('fd_repPlace'))}</small>`],
        ['fd_src', `${esc(r.pub)}<small>${esc(r.title)}</small>`]] });
  }
  function detail(el, id) {
    if (String(id).startsWith('rep:')) { reports(); const x = reps.get(id); if (x) { repDetail(el, x); return; } }
    const r = R()?.get(id);
    if (!r) { el.innerHTML = `<div class="empty fd-note">${ic('eye')}<p>${esc(tr('fd_gone'))}</p></div>`; return; }
    const s = r.sp && byId(r.sp), name = nameOf(r), area = areaOf(r.lat, r.lon), DAY = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' };
    const when = r.src === 'static' ? ago(r) : `${fmtT(r.t, r.t % 864e5 ? { ...DAY, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : { ...DAY, timeZone: 'UTC' })} · ${ago(r)}`; // a date alone is UTC midnight
    sheet(el, r, { place: placeOf(r.lat, r.lon), big: r.src === 'inat' ? r.photo?.replace('/medium.', '/large.') : r.photo, open: tr('fd_open', srcName(r.src)), honest: 'fd_honest',
      sub: `<i>${esc(r.sci)}</i>${s && r.name && r.name !== r.sci && r.name.toLowerCase() !== name.toLowerCase() ? ' · ' + esc(r.name) : ''}`,
      rows: [['fd_when', esc(when)], ['fd_where', `${esc(describe(r.lat, r.lon))}<small>${area ? esc(area) + ' · ' : ''}${esc(gps(r.lat, r.lon))}</small>`],
        r.src !== 'static' && ['fd_seen', esc(r.by || tr('fd_anon'))],
        ['fd_lic', esc(licName(r.lic) + (r.plic ? ' · ' + tr('fd_photoLic', licName(r.plic)) : '')) + (r.ds ? `<small>${esc(r.ds)}</small>` : '')],
        ['fd_src', esc(r.src === 'inat' ? tr('fd_inat') : srcName(r.src))]] });
  }

  PsNav.add('feed', { title: () => tr('fd_title'), icon: 'feed', tab: true, render,
    show(el) { if (el !== root || !root.firstChild) render(el); marks(); rebuild(); }, hide() { io?.disconnect(); } });
  PsNav.add('sighting', { title: id => tr(String(id).startsWith('rep:') ? 'fd_report' : 'fd_one'), icon: 'eye', render: detail });
  return { rows: () => rows, filters: f };
})();
