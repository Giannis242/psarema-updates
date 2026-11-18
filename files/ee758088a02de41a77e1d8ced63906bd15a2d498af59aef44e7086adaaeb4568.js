'use strict';
// Psarema: the spot sheet's structure (css/spot.css). ui.js and js/mobile.js draw the short card and the details; as they redraw, this adds
// the card's labelled Directions and Save buttons, and the details' tab strip (Overview · Conditions · Gear), which shows one group of the
// details' parts at a time (CSS on the host's data-ss-tab), with the fish's cut-out behind the hero. Nothing here computes a score.
Object.assign(I18N.en, { ss_tabs: { overview: 'Overview', cond: 'Conditions', gear: 'Gear' }, ss_tabsLbl: 'Spot details', ss_save: 'Save' });
Object.assign(I18N.el, { ss_tabs: { overview: 'Επισκόπηση', cond: 'Συνθήκες', gear: 'Εξοπλισμός' }, ss_tabsLbl: 'Λεπτομέρειες σημείου', ss_save: 'Αποθήκευση' });
(() => {
  let tab = 'overview', tabFor = -1; // a new spot opens on Overview; the same spot redrawn (hour, fish, language) keeps its tab
  function card(root) { // the short card's actions: Directions with its name, then Save (pins.js handles data-pp-save)
    for (const a of root.querySelectorAll('.sc .acts')) {
      const i = a.querySelector('[data-more]')?.dataset.more, r = a.querySelector('a.btn');
      if (r && !r.querySelector('.ss-l')) r.insertAdjacentHTML('beforeend', `<span class="ss-l">${esc(tr('directions'))}</span>`);
      if (i != null && window.PsPins && !a.querySelector('[data-pp-save]')) (r || a.firstElementChild).insertAdjacentHTML('afterend',
        `<button class="btn ss-save" data-pp-save="${i}" aria-label="${esc(tr('pp_save'))}">${ic('flag', 'sm')}<span class="ss-l">${esc(tr('ss_save'))}</span></button>`);
    }
  }
  function show(host, k) {
    tab = k; host.dataset.ssTab = k;
    if (k === 'gear') window.paintLuresIn?.(host); // round 17 G: the lures' colours only once their tab shows (js/ui.js)
    for (const b of host.querySelectorAll(':scope > .ss-tabs [data-ss-tab]')) b.setAttribute('aria-selected', b.dataset.ssTab === k);
  }
  function details(host) {
    const body = host.querySelector(':scope > .drawer-body'); if (!body) return;
    if (sel.i !== tabFor) { tabFor = sel.i; tab = 'overview'; }
    if (!host.querySelector(':scope > .ss-tabs')) {
      const T = tr('ss_tabs');
      body.insertAdjacentHTML('beforebegin', `<nav class="ss-tabs" role="tablist" aria-label="${esc(tr('ss_tabsLbl'))}">` +
        Object.keys(T).map(k => `<button type="button" role="tab" data-ss-tab="${k}">${esc(T[k])}</button>`).join('') + `</nav>`);
      const im = !sp.all && (CUT[sp.id] || IMG[sp.id]); // the hero's picture: the fish's cut-out (css/spot.css .drawer-head::after)
      host.style.setProperty('--ss-fish', im ? `url("${new URL(im.file, location.href)}")` : 'none');
    }
    // Gear only when there is some (spearfishing has no baits or lures; the gear files come in after the first draw; js/area-gear.js adds its fold first)
    const g = host.querySelector(':scope > .ss-tabs [data-ss-tab=gear]'), has = !!body.querySelector(':scope > [data-s=baits] > *, :scope > [data-s=lures] > *, :scope > .ag-fold');
    if (g.hidden === has) g.hidden = !has;
    if (!has && tab === 'gear') tab = 'overview';
    if (host.dataset.ssTab !== tab ||!host.querySelector('.ss-tabs [aria-selected=true]')) show(host, tab);
  }
  const run = host => { card(host); details(host); };
  for (const s of ['#drawer', '#m-spot']) {
    const host = $(s); if (!host) continue;
    new MutationObserver(() => run(host)).observe(host, { childList: true, subtree: true }); // idempotent: its own inserts find themselves
    host.addEventListener('click', e => {
      const b = e.target.closest('.ss-tabs [data-ss-tab]'); if (!b) return;
      show(host, b.dataset.ssTab);
      const body = host.querySelector(':scope > .drawer-body'), nav = b.parentElement, sc = host.closest('.m-body');
      if (sc) { const d = body.getBoundingClientRect().top - nav.getBoundingClientRect().bottom; if (d < 0) sc.scrollTop += d; } // phones: the tab's top under the stuck strip
      else body.scrollTop = 0;
    });
  }
  const pane = map.getPane('popupPane'); // the desktop card: a Leaflet popup
  if (pane) new MutationObserver(() => card(pane)).observe(pane, { childList: true, subtree: true });
})();
