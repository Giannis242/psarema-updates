'use strict';
Object.assign(I18N.en, {
  mp_pbs: 'Personal bests', mp_tCatches: 'Catches', mp_tSpecies: 'Species', mp_tStats: 'Stats', mp_inviteT: 'Create your angler profile',
  mp_inviteSub: 'Your name, photo and catches in one profile.', mp_create: 'Create profile', mp_edit: 'Edit profile',
  mp_noSpecies: 'The species you catch are listed here, with your best for each.', mp_n: n => n === 1 ? '1 catch' : `${n} catches`, mp_best: 'Best', mp_noCatch: 'No catches yet', mp_emptySub: 'Log one with + and your catches, species and personal bests show up here.', mp_rate: 'Trips with fish',
  mp_logbook: 'Open the logbook', mp_account: 'Account', mp_delSub: 'Profile and photo; catches can stay', mp_joined: d => `Since ${d}`,
  mp_local: 'Your profile, catches, saved places and settings stay on this device. Nothing of yours is uploaded.',
});
Object.assign(I18N.el, {
  mp_pbs: 'Ρεκόρ', mp_tCatches: 'Ψαριές', mp_tSpecies: 'Είδη', mp_tStats: 'Στατιστικά', mp_inviteT: 'Φτιάξτε το προφίλ ψαρά σας',
  mp_inviteSub: 'Το όνομα, η φωτογραφία και οι ψαριές σας σε ένα προφίλ.', mp_create: 'Δημιουργία προφίλ', mp_edit: 'Επεξεργασία προφίλ',
  mp_noSpecies: 'Εδώ φαίνονται τα είδη που πιάνετε, με το ρεκόρ σας για το καθένα.', mp_n: n => n === 1 ? '1 ψαριά' : `${n} ψαριές`, mp_best: 'Ρεκόρ', mp_noCatch: 'Καμία ψαριά ακόμη', mp_emptySub: 'Καταγράψτε μία με το + και εδώ θα δείτε τις ψαριές, τα είδη και τα ρεκόρ σας.', mp_rate: 'Έξοδοι με ψάρι',
  mp_logbook: 'Όλες οι καταγραφές', mp_account: 'Λογαριασμός', mp_delSub: 'Προφίλ και φωτογραφία· οι ψαριές μπορούν να μείνουν', mp_joined: d => `Από ${d}`,
  mp_local: 'Το προφίλ, οι ψαριές, τα αποθηκευμένα σημεία και οι ρυθμίσεις σας μένουν σε αυτή τη συσκευή. Τίποτα δικό σας δεν ανεβαίνει πουθενά.',
});
// Psarema: the Me page (css/me.css; a tab of js/nav.js), a profile like a fishing app's: the header (photo, name, @username, home area, how you
// fish; js/account.js PsAccount, or an invite to create the account), the numbers (catches · species · personal bests, PsCatch.stats()), three
// tabs (Catches: a photo grid · Species: what you caught, with counts and bests · Stats: by month and personal bests), then your saved places
// and the logbook, Settings (language; notifications and science sharing where they exist), Account, and Help and about folded.
// Round 17 G: the tools (calendar, Plan a trip, offline maps) are the map's ⋯ menu only; how you fish is the map's own switch; the profile
// rows were the header's pencil and invite again; the daily brief is in Notifications (js/native.js settings). Drawn on each open, and again
// when the catches or the account change while it shows.
(() => {
  let el = null, tab = 'catches';
  const shows = () => el && PsNav.current() === 'me';
  const go = ic('chevron-right', 'ui-chev');
  const row = (attrs, icon, label, side = '') => `<button class="ui-row me-row" ${attrs}>${ic(icon)}<span class="ui-row-main"><b>${esc(label)}</b></span>${side}${go}</button>`;
  const stats = () => { const s = window.PsCatch?.stats?.(); return s && typeof s.n === 'number' ? s : null; }; // the logbook's summary, when there
  const caught = () => (window.PsCatch?.entries?.() || []).filter(e => e.n > 0 && !e.seen); // round 15: a fish only seen is not a catch
  const size = b => [b.kg && `${nf(b.kg, b.kg < 10 && Math.round(b.kg * 100) % 10 ? 2 : 1)} kg`, b.cm && `${Math.round(b.cm)} cm`].filter(Boolean).join(' · ');
  const cut = sp => { const f = byId(sp); return f && PsPanel.fish(f) || ic('fish'); };
  const thumbs = new Map(); // catch id → [Blob, object URL]: made once per thumbnail
  const thumbUrl = e => { const b = e.thumb || e.photo; if (!b) return ''; let t = thumbs.get(e.id); if (t?.[0] !== b) { if (t) URL.revokeObjectURL(t[1]); thumbs.set(e.id, t = [b, URL.createObjectURL(b)]); } return t[1]; };
  const initials = n => String(n || '').trim().split(/\s+/).slice(0, 2).map(w => [...w][0] || '').join('').toUpperCase();
  const areaName = id => { const a = (window.PSAREMA_AREAS || []).find(x => x.id === id); return a ? (state.lang === 'el' ? a.el : a.en) : ''; };

  function head(p) {
    if (!p) return `<div class="ui-card me-invite"><span class="ui-av lg">${ic('user')}</span><div class="me-inv-txt"><b>${esc(tr('mp_inviteT'))}</b><p>${esc(tr('mp_inviteSub'))}</p></div>` +
      `<button class="btn primary block lg" data-me-acc="create">${ic('plus')}${esc(tr('mp_create'))}</button></div>`;
    const fav = p.fish.map(byId).filter(Boolean);
    return `<div class="me-prof"><span class="ui-av lg me-av">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : `<b>${esc(initials(p.name))}</b>`}</span>` +
      `<div class="me-who"><h3>${esc(p.name)}</h3><p class="me-handle">@${esc(p.username)}</p>` +
      `<p class="me-meta">${p.area ? `<span>${ic('pin')}${esc(areaName(p.area))}</span>` : ''}${p.styles.map(m => `<span>${ic(m)}${esc(tr(m))}</span>`).join('')}</p></div></div>` +
      (fav.length ? `<div class="ui-chips me-fav">${fav.map(f => `<button class="ui-chip" data-sp-page="${esc(f.id)}"><span class="me-favcut">${PsPanel.fish(f) || ic('fish')}</span>${esc(fishName(f))}</button>`).join('')}</div>` : '') +
      '';
  }
  function numbers(s) {
    const n = (v, label, t) => `<button class="ui-stat me-stat" data-me-tab="${t}" aria-label="${esc(`${v} ${label}`)}"><b>${v}</b><span>${esc(label)}</span></button>`;
    return `<div class="ui-card ui-grid3 me-stats">${n(s?.n || 0, tr('me_catches'), 'catches')}${n(s?.species || 0, tr('me_species'), 'species')}${n(s?.best?.length || 0, tr('mp_pbs'), 'stats')}</div>`;
  }
  const empty = () => `<div class="ui-empty me-empty">${ic('fish')}<b>${esc(tr('mp_noCatch'))}</b><p>${esc(tr('mp_emptySub'))}</p><button class="btn primary" data-me-log>${ic('plus')}${esc(tr('me_logFirst'))}</button></div>`;
  function catchesTab(C, pb) {
    if (!C.length) return empty();
    return `<div class="ui-grid3 photos me-grid">${C.map(e => { const u = thumbUrl(e), f = byId(e.sp);
      return `<button class="me-tile${u ? '' : ' cut'}" data-me-catch="${esc(e.id)}" aria-label="${esc(f ? fishName(f) : e.sp)}">${u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">` : cut(e.sp)}` +
        `${pb.has(e.id) ? `<span class="me-pb" title="${esc(tr('me_bests'))}">${ic('trophy')}</span>` : ''}<span class="me-tl">${esc(f ? fishName(f) : '')}${e.n > 1 ? ` ×${e.n}` : ''}</span></button>`; }).join('')}</div>`;
  }
  function speciesTab(C, s) {
    if (!C.length) return `<div class="ui-empty me-empty">${ic('fish-list')}<p>${esc(tr('mp_noSpecies'))}</p></div>`;
    const by = new Map(); for (const e of C) by.set(e.sp, (by.get(e.sp) || 0) + (e.n || 1));
    const best = new Map((s?.best || []).map(b => [b.sp, b]));
    return `<div class="ui-list">${[...by].sort((a, b) => b[1] - a[1]).map(([sp, n]) => { const f = byId(sp), b = best.get(sp);
      return `<button class="ui-row" data-sp-page="${esc(sp)}"><span class="ui-thumb fish">${cut(sp)}</span><span class="ui-row-main"><b>${esc(f ? fishName(f) : sp)}</b>` +
        `<small>${esc(tr('mp_n', n))}${b && size(b) ? ` · ${esc(tr('mp_best'))} ${esc(size(b))}` : ''}</small></span>${go}</button>`; }).join('')}</div>`;
  }
  function statsTab(s) {
    if (!s?.n) return empty();
    const m = Array.isArray(s.byMonth) && s.byMonth.length === 12 ? s.byMonth : null, top = m && Math.max(...m);
    const mon = k => fmtT(Date.UTC(2024, k, 15), { month: 'narrow', timeZone: 'UTC' });
    return `<div class="ui-card ui-grid2 me-stats sm"><div class="ui-stat"><b>${s.trips}</b><span>${esc(tr('me_trips'))}</span></div>` + // round 17 G: the catches are the header's number
      `<div class="ui-stat"><b>${s.trips ? Math.round(s.n / s.trips * 100) : 0}%</b><span>${esc(tr('mp_rate'))}</span></div></div>` +
      (top ? `<div class="ui-sec"><h3>${esc(tr('me_byMonth'))}</h3></div><div class="ui-card me-months" aria-hidden="true">${m.map((v, k) => `<span><i style="--h:${(v / top).toFixed(3)}"></i><small>${esc(mon(k))}</small></span>`).join('')}</div>` : '') +
      (s.best?.length ? `<div class="ui-sec"><h3>${esc(tr('me_bests'))}</h3></div><div class="ui-list">${s.best.map(b => { const f = byId(b.sp);
        return `<button class="ui-row" data-me-catch="${esc(b.id)}"><span class="ui-thumb fish">${cut(b.sp)}</span><span class="ui-row-main"><b>${esc(f ? fishName(f) : b.sp)}</b></span><span class="ui-row-end">${esc(size(b))}</span>${go}</button>`; }).join('')}</div>` : '');
  }
  function placesHtml() { // js/pins.js, when there: the saved places, in a fold
    const list = window.PsPins?.places?.(); if (!Array.isArray(list)) return '';
    return `<details class="me-fold"><summary class="ui-row me-row">${ic('pin')}<span class="ui-row-main"><b>${esc(tr('me_places'))}</b></span><span class="ui-row-end">${list.length}</span>${go}</summary>` +
      (list.length ? list.map(p => `<button class="ui-row me-sub" data-me-place="${esc(p.id)}"><span class="ui-row-main"><b>${esc(p.name)}</b></span><span class="ui-row-end">${esc(fmtT(p.t, { day: 'numeric', month: 'short' }))}</span></button>`).join('')
        : `<p class="hint me-sub">${esc(tr('me_noPlaces'))}</p>`) + '</details>';
  }
  function draw() {
    const p = window.PsAccount?.get?.(), s = stats(), C = caught(), pb = new Set((s?.best || []).map(b => b.id));
    const upd = $('#mb-update'), acct = account(p), seg = (key, list) => `<div class="seg me-seg" style="--n:${list.length}">${list.map(([v, label, icon]) =>
      `<button data-me-${key}="${v}" aria-pressed="${state[key] === v}">${icon ? ic(icon) : ''}<span>${esc(label)}</span></button>`).join('')}</div>`;
    const tabs = [['catches', 'mp_tCatches'], ['species', 'mp_tSpecies'], ['stats', 'mp_tStats']];
    const acts = el.closest('.pg')?.querySelector('.pg-acts');
    if (acts) acts.innerHTML = p ? `<button class="icon-btn" data-me-acc="edit" aria-label="${esc(tr('mp_edit'))}" title="${esc(tr('mp_edit'))}">${ic('edit')}</button>` : '';
    el.innerHTML = head(p) + numbers(s) +
      `<div class="ui-seg block me-tabs" role="tablist">${tabs.map(([t, k]) => `<button role="tab" data-me-tab="${t}" aria-selected="${tab === t}" aria-pressed="${tab === t}">${esc(tr(k))}</button>`).join('')}</div>` +
      `<div class="me-pane" role="tabpanel">${tab === 'species' ? speciesTab(C, s) : tab === 'stats' ? statsTab(s) : catchesTab(C, pb)}</div>` +
      `<div class="ui-list me-gap">${placesHtml()}${row('data-ct-open', 'book', tr('mp_logbook'))}</div>` +
      `<div class="ui-sec"><h3>${esc(tr('me_settings'))}</h3></div><div class="ui-list me-set">` +
        `<div class="me-setrow"><p class="me-k">${ic('globe')}${esc(tr('language'))}</p>${seg('lang', [['en', 'English'], ['el', 'Ελληνικά']])}</div>` +
        (window.PsNative?.canNotify ? row('data-me-notif', 'bell', tr('notif')) : '') + // the app only: the daily brief, its time, the reminders
        (window.PsShare?.visible() ? row('data-ct-open="share"', 'shield', tr('cs_title'), `<span class="ui-row-end">${esc(tr(PsShare.on() ? 'cs_on' : 'cs_off'))}</span>`) : '') + // round 15: js/catchlog.js PsShare, once the owner switched sharing on
      '</div>' +
      (acct ? `<div class="ui-sec"><h3>${esc(tr('mp_account'))}</h3></div><div class="ui-list me-acct">${acct}</div>` : '') +
      `<details class="ui-list me-fold me-about"><summary class="ui-row me-row">${ic('info')}<span class="ui-row-main"><b>${esc(tr('g17_helpAbout'))}</b>` +
        `<small>${esc(tr('g17_helpAboutSub'))}</small></span>${go}</summary>` +
        row('data-ui="help"', 'knot', tr('me_help')) + row('data-me-credits', 'globe', tr('credits')) +
        `<a class="ui-row me-row" href="privacy.html" target="_blank" rel="noopener">${ic('shield')}<span class="ui-row-main"><b>${esc(tr('me_privacy'))}</b></span>${ic('external', 'ui-chev')}</a>` +
        (upd && !upd.hidden ? row('data-me-update', 'refresh', tr('checkUpdates')) : '') +
        `<div class="ui-row me-row me-static">${ic('info')}<span class="ui-row-main"><b>${esc(tr('me_version'))}</b></span><span class="ui-row-end">${esc(window.PSAREMA_VERSION || '–')}</span></div></details>` +
      `<p class="hint me-foot">${esc(tr(window.PsCloud?.user() ? 'cl_cloudNote' : 'mp_local'))}</p>`;
  }
  // Round 11: the online account (js/cloud.js PsCloud, the screens in js/account.js): signed in, the email with how the sync stands (a tap
  // syncs now), Export, Sign out, Delete my account and data; signed out, Sign in (only when accounts are on) and Delete profile (when there is one).
  const ago = t => { const s = (Date.now() - t) / 1e3, f = new Intl.RelativeTimeFormat(locale(), { style: 'short' });
    return s < 60 ? tr('cl_now') : s < 3600 ? f.format(-Math.round(s / 60), 'minute') : s < 86400 ? f.format(-Math.round(s / 3600), 'hour') : f.format(-Math.round(s / 86400), 'day'); };
  function account(p) { // '' when there is nothing to show (no accounts, no profile): no Account heading then
    const C = window.PsCloud, u = C?.user(); // round 17 G: no Edit / Create profile rows here: the header's pencil and the invite card are those
    // accounts off (js/auth-config.js empty): no sign-in row at all, so a store reviewer never meets a "not available yet" screen (round 14 store)
    if (!u) return (C?.on ? `<button class="ui-row me-row" data-me-cl="in">${ic('user')}<span class="ui-row-main"><b>${esc(tr('cl_signin'))}</b><small>${esc(tr('cl_signinSub'))}</small></span>${go}</button>` : '') +
      (p ? `<button class="ui-row me-row me-danger" data-me-acc="delete">${ic('trash')}<span class="ui-row-main"><b>${esc(tr('ac_del'))}</b><small>${esc(tr('mp_delSub'))}</small></span>${go}</button>` : '');
    const s = C.status(), line = s.ask ? tr('cl_paused') : s.busy ? tr('cl_syncing') : s.err === 'offline' ? tr('cl_offline', s.pending) : s.err === 'auth' ? tr('cl_errAuth')
      : s.err ? tr('cl_errSync') : s.at ? tr('cl_synced', ago(s.at)) : tr('cl_never');
    return `<button class="ui-row me-row me-sync" data-me-cl="sync" aria-label="${esc(`${u.email}. ${line}. ${tr('cl_syncNow')}`)}">${ic('user')}<span class="ui-row-main"><b>${esc(u.email)}</b>` +
        `<small class="${s.err ? 'bad' : ''}">${esc(line)}</small></span>${ic('refresh', 'ui-chev me-spin' + (s.busy ? ' on' : ''))}</button>` +
      (s.ask ? row('data-me-cl="add"', 'download', tr('cl_addRow'), `<span class="ui-row-end">${s.local.catches + s.local.places}</span>`) : '') +
      row('data-me-cl="export"', 'download', tr('cl_export')) + row('data-me-cl="out"', 'logout', tr('cl_out')) +
      `<button class="ui-row me-row me-danger" data-me-cl="del">${ic('trash')}<span class="ui-row-main"><b>${esc(tr('cl_del'))}</b><small>${esc(tr('cl_delSub'))}</small></span>${go}</button>`;
  }
  async function cloud(a) {
    const C = window.PsCloud, A = window.PsAccount;
    if (a === 'in') A.signin();
    else if (a === 'sync') C.sync();
    else if (a === 'add') C.answer(true);
    else if (a === 'del') A.signin('del');
    else if (a === 'export') C.exportData().catch(e => { console.warn(e); toast(tr('ct_exportErr')); });
    else if (a === 'out') { await C.signOut(); toast(tr('cl_bye')); try { localStorage.removeItem('psarema-welcome-v1'); } catch {} A.signin('in', true); } // the first-open screen again
  }
  function credits() { // the map's and data's sources and licences: the same words as the map's (i) and the ⋯ menu
    const k = 'credits';
    PsPanel.show(k, PsPanel.head(k, 'globe', tr('credits')) + `<div class="me-credits">${map.attributionControl.getContainer().innerHTML}<p>${esc(tr('photos'))}</p></div>`, true);
  }
  function click(e) {
    const t = e.target.closest('[data-me-log], [data-me-catch], [data-me-place], [data-me-lang], [data-me-notif], [data-me-credits], [data-me-update], [data-me-tab], [data-me-acc], [data-me-cl]'); if (!t) return;
    const d = t.dataset;
    if (d.meCl) cloud(d.meCl);
    else if ('meLog' in d) window.PsCatch?.log?.(-1);
    else if (d.meTab) { if (tab !== d.meTab) { tab = d.meTab; draw(); } if (t.classList.contains('me-stat')) el.querySelector('.me-tabs')?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    else if (d.meAcc) { const A = window.PsAccount; if (!A) return; d.meAcc === 'create' ? A.open() : A.edit(d.meAcc === 'delete'); }
    else if (d.meCatch) PsNav.pages.catch ? PsNav.open('catch', d.meCatch) : window.PsCatch?.open?.(d.meCatch);
    else if (d.mePlace) { PsNav.open('map'); window.PsPins?.focus?.({ kind: 'place', id: d.mePlace }); }
    else if (d.meLang) { if (d.meLang !== state.lang) $(`#lang [data-lang="${d.meLang}"]`).click(); } // js/ui.js applyLang; the page draws again (js/nav.js)
    else if ('meNotif' in d) window.PsNative?.settings?.(); // js/native.js: the daily brief and its time, the trip reminders
    else if ('meCredits' in d) credits();
    else if ('meUpdate' in d) $('#mb-update')?.click(); // js/updater.js (the Android app; index.html keeps its button out of sight)
  }
  PsNav.add('me', { title: () => tr('nav_me'), icon: 'user', tab: true,
    show(body) {
      if (!el) { el = body; el.classList.add('me'); el.addEventListener('click', click); el.closest('.pg')?.querySelector('.pg-acts')?.addEventListener('click', click); }
      draw();
    } });
  document.addEventListener('ps:catches', () => { if (shows()) draw(); }); // js/catchlog.js: a catch logged, edited or removed
  document.addEventListener('ps:account', () => { if (shows()) draw(); }); // js/account.js: the profile made, edited or removed
  document.addEventListener('ps:cloud', () => { if (shows()) draw(); }); // js/cloud.js: signed in or out, a sync started or ended
  document.addEventListener('ps:share', () => { if (shows()) draw(); }); // round 15: Share catches for science switched on or off
})();
