'use strict';
// Psarema: the features the first heat map does not need (round 16 V, start-up speed).
// What loads when is the FEATURES table below, and only there. index.html marks each of their files <script type="ps/lazy" data-lazy="<feature>"
// src="…"> (the browser leaves those alone; the bench pages still read every src, in order), in the order they run. A feature with idle: true
// loads once the first heat map is painted, one feature per idle moment, in the table's order; the others load on first use only.
// Every way in waits for its feature:
//   stubs: the module's own global, until its file replaces it, with these methods: a call loads the feature, then calls the real one (a
//          promise of its answer), so `window.PsPlanner?.brief()` and the like keep working, and ui.js draws the same buttons;
//   taps:  [selector, (button) => what its own click listener does, enter?]: a tap before the feature is in is held here (capture phase, nothing
//          else hears it), then that is done once it has loaded; enter: Enter on such an element that is no button too;
//   pages: js/nav.js pages it adds ([id, tab?]): a stand-in page that loads the feature and then draws the real page in its place;
//   after: what its file missed by coming after the start-up.
// Moving a feature: change its tags' type in index.html (ps/boot ⇄ ps/lazy) and its row here; a new one needs its ways in listed, or it
// never loads. PsLazy.need(feature) → a promise settled once its scripts have run (each file once: js/core.js loadScripts);
// PsLazy.ready(feature) → true once in. This file loads before js/mobile.js (index.html): the Back and Escape forwarders below must run
// before mobile.js's own, as in js/catchlog-back.js.
const PsLazy = window.PsLazy = (() => {
  const FEATURES = {
    areagear: { idle: true, after: () => { // a spot card drawn before it came: its gear fold and ranked baits now (the file's observers see a change)
      if (typeof F !== 'undefined' && F && sel.i >= 0) refreshOpen();
      for (const s of ['#drawer', '#m-spot']) { const h = $(s), n = document.createTextNode(''); if (h) { h.append(n); n.remove(); } }
    } },
    feed: { idle: true, pages: [['feed', true], ['sighting']] },
    liveships: { idle: true, after: () => { if (state.layers?.liveships) applyLayer('liveships'); } }, // js/app.js applies the saved layers at start
    calendar: { idle: true, stubs: { PsCalendar: ['open', 'close'] }, taps: [['[data-cal-open]', () => PsCalendar.open()]] },
    planner: { idle: true, stubs: { PsPlanner: ['open', 'brief', 'briefData'] } }, // js/app.js asks for the daily brief after the first map; js/native.js briefData
    forecast: { idle: true, pages: [['forecast', true]] },
    species: { idle: true, stubs: { PsSpecies: ['open'] }, pages: [['species']], taps: [['[data-sp-page]', b => PsSpecies.open(b.dataset.spPage), true]] }, // the tap before the fish picker's own
    me: { idle: true, pages: [['me', true]] },
    dive3d: { stubs: { PsDive: ['open', 'close'] }, taps: [['[data-dive-open]', b => PsDive.open(b.dataset.diveOpen)]] }, // ui.js shows a spot's 3D dive button while PsDive is there
    area3d: { stubs: { PsArea3D: ['open', 'close'] } }, // js/areas.js: the area page's 3D button
  };
  const tags = [...document.querySelectorAll?.('script[type="ps/lazy"][data-lazy]') || []], files = {};
  if (!tags.length) return { need: k => Promise.reject(new Error('no lazy feature ' + k)), ready: () => false }; // the bench pages (eval/): none
  for (const t of tags) (files[t.dataset.lazy] ||= []).push(t.getAttribute('src'));
  for (const k in files) if (!FEATURES[k]) console.warn(`index.html: lazy feature ${k} is not in js/lazy.js: it never loads`);
  const got = {}, ok = {};
  function need(k) {
    if (!files[k]) return Promise.reject(new Error('no lazy feature ' + k));
    return got[k] ||= loadScripts(...files[k]).then(() => {
      ok[k] = true; try { FEATURES[k].after?.(); } catch (e) { console.warn(e); }
      console.assert(Object.keys(I18N.en).every(k => k in I18N.el), 'every English text has a Greek one'); // js/app.js's check, for the texts this feature added
    }, e => { delete got[k]; console.warn(e.message); throw e; });
  }
  const ready = k => !!ok[k];

  const taps = [];
  for (const [k, f] of Object.entries(FEATURES)) {
    if (!files[k]) continue; // back in the start-up list (ps/boot): its own file does all of this
    for (const [name, methods] of Object.entries(f.stubs || {})) {
      const s = window[name] = { view: null };
      for (const m of methods) s[m] = (...a) => need(k).then(() => { const r = window[name]; if (r === s) throw new Error(name + ' did not load'); return r[m](...a); });
    }
    for (const [sel, run, enter] of f.taps || []) taps.push([k, sel, run, enter]);
  }
  const hold = (e, k, run, b) => { e.preventDefault(); e.stopImmediatePropagation(); need(k).then(() => run(b)).catch(err => console.warn(err.message)); };
  document.addEventListener('click', e => { for (const [k, sel, run] of taps) { const b = !ok[k] && e.target.closest?.(sel); if (b) return hold(e, k, run, b); } }, true);
  document.addEventListener('keydown', e => { // Enter on a tap target that is no button (js/species-page.js does the same for its links)
    if (e.key === 'Enter') for (const [k, sel, run, enter] of taps) { const b = enter && !ok[k] && e.target.closest?.(sel + ':not(button)'); if (b) return hold(e, k, run, b); }
  }, true);
  // The lure sheet's Back and Escape (js/lures.js sets them; js/area-gear.js adds the same two once it loads: each stops the event when it acts)
  addEventListener('popstate', e => window.PsLureBack?.(e), true);
  addEventListener('keydown', e => window.PsLureKey?.(e), true);

  // The stand-in pages, once every start-up script is in (data/boot.js sends DOMContentLoaded then): the feature, then the real page in their
  // place (its own PsNav.add keeps the section; render runs again).
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.PsNav) return;
    for (const [k, f] of Object.entries(FEATURES)) if (files[k]) for (const [id, tab] of f.pages || []) if (!PsNav.pages[id]) PsNav.add(id, { title: () => '', tab: !!tab, show(el, arg) {
      need(k).then(() => { const s = PsNav.pages[id]?.sec; if (s) delete s.dataset.r; if (PsNav.current() === id) PsNav.open(id, arg); }).catch(() => {});
    } });
  }, { once: true });

  // The idle features: after the first heat paint (js/map.js `scored`; 10 s at most, e.g. no forecast), one per idle moment
  const rest = () => new Promise(r => window.requestIdleCallback ? requestIdleCallback(r, { timeout: 2000 }) : setTimeout(r, 200));
  const idle = Object.keys(FEATURES).filter(k => FEATURES[k].idle && files[k]), t0 = performance.now();
  const go = async () => { for (const k of idle) { await rest(); await need(k).catch(() => {}); } };
  const wait = () => (typeof scored !== 'undefined' && scored) || performance.now() - t0 > 10e3 ? go() : setTimeout(wait, 250);
  setTimeout(wait, 250);
  return { need, ready };
})();
