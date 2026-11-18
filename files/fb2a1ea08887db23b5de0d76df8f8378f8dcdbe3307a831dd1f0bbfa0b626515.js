'use strict';
// Motion (css/motion.css): what CSS cannot know. A view that appears (the card, the details, a place, a panel) rises in part by part and its
// dials sweep up from 0, the big ones counting along; a part an hour step redraws is no new view: its dial glides from the old score. Lists
// cascade in when they open (a tab, the phone sheet, the fish picker), never on the hour's rewrites. A segmented control slides its white
// over from the last choice. A new timeline chart draws its curve. Everything is watched (one MutationObserver, one click listener), so the
// drawing code stays as it is; the work runs after the change, never inside a tap's own timing. Nothing under reduced motion.
const PsMotion = window.PsMotion = (() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)'), off = () => RM.matches;
  let SPRING = ''; const spring = () => SPRING ||= getComputedStyle(document.documentElement).getPropertyValue('--spring').trim() || 'ease-out'; // css/motion.css; read at first use (a style read at load would cost the start-up a full restyle)
  const OUT = 'cubic-bezier(.33, 1, .68, 1)', outCubic = k => 1 - (1 - k) ** 3; // the same curve: a dial's sweep and its count stay together
  // once: one tap can reach the observer in two batches (a listener each); the same element is not started twice within 0.6 s
  const once = (el, k) => { const t = performance.now(); if (t - (el[k] || -1e4) < 600) return false; el[k] = t; return true; };
  const rise = (el, delay = 0, y = 6) => once(el, 'psRise') && el.animate({ opacity: [0, 1], translate: [`0 ${y}px`, '0 0'] }, { duration: 200, delay, easing: OUT, fill: 'backwards' }); // translate: never an element's own transform
  const ringsIn = nodes => [...nodes].flatMap(n => n.nodeType !== 1 ? [] : n.matches('.ring') ? [n] : [...n.querySelectorAll('.ring')]);
  const pOf = r => parseFloat(r.style.getPropertyValue('--p')); // core.js ring(): --p is the score

  // A dial to its score: from 0 (it appeared; .lg and .xl count up along) or from the score it had (from: its part was redrawn)
  function sweep(r, delay = 0, from = null) {
    const p = pOf(r); if (off() || !(p >= 0) || p === from || from == null && !once(r, 'psSweep')) return;
    const dur = from == null ? 700 : 450;
    r.animate({ '--rp': [from ?? 0, p] }, { duration: dur, delay, easing: OUT, fill: 'backwards', pseudoElement: '::before' }); // the arc (css/motion.css)
    if (from == null && r.matches('.lg, .xl')) count(r.querySelector('b'), p, delay, dur);
  }
  function count(b, to, delay, dur) { // a few dials at a time, for 0.7 s: the digits' text node rewritten each frame (no new node to observe)
    const txt = b?.firstChild, end = txt?.nodeType === 3 && txt.data; if (!end) return;
    const t0 = performance.now() + delay; txt.data = '0';
    const step = t => {
      if (!b.isConnected) return; // redrawn meanwhile (an hour step): the new one shows its score
      const k = Math.min(1, Math.max(0, (t - t0) / dur)); txt.data = k < 1 ? Math.round(to * outCubic(k)) : end;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Lists: rows rise one after another (the first ten 28 ms apart, the rest with the tenth), their dials sweeping with them
  const ROWS = ':is(.top, .area-list, .fish-grid, .pn-list, .cal-grid, .ui-list, .ui-carousel) > :not([hidden])';
  function cascade(rows, base = 0) {
    const grid = rows[0]?.parentElement.matches('.cal-grid'); // the calendar: a wave from its top left corner
    let k = 0;
    for (const el of rows) {
      if (k > 60) break;
      const d = base + (grid ? (k % 7 + (k / 7 | 0)) * 18 : Math.min(k, 10) * 28); k++;
      rise(el, d, 8); for (const r of ringsIn([el])) sweep(r, d);
    }
  }

  // A view: its parts in reading order (dial, title, numbers, reasons, conditions, best time, buttons), 35 ms apart; a part holding a list
  // (a panel's trips, a tab's spots) cascades its rows instead of moving as one box. A tab: its own children are the parts.
  const BLOCKS = ':is(.drawer-head, .sc-top, .sp-top) > *, :is(.sc, .drawer-body) > .ds > :not(.sc-top), .drawer-body > :not(.ds), .spot-pop > :not(.sp-top), .pn > *';
  // Round 16 X: the first 8 dials of a view sweep (the card's and the top of the details); the rest, under the fold, show their score at once.
  // Each sweep is a style pass a frame on the main thread for 0.45-0.7 s (an animated custom property).
  function enter(v, blocks = v.querySelectorAll(BLOCKS)) {
    let k = 0, n = 0;
    for (const b of blocks) {
      const d = Math.min(k, 8) * 35, rows = b.querySelectorAll(ROWS);
      if (rows.length) { cascade(rows, d); k += 2; continue; }
      k++; rise(b, d); for (const r of ringsIn([b])) if (n++ < 8) sweep(r, d);
    }
  }
  const cascadeIn = el => el?.classList.contains('tab') ? enter(el, el.querySelectorAll(':scope > :not([hidden])')) : el && cascade(el.querySelectorAll(ROWS));

  // Segmented controls (css/motion.css draws their white as a ::before): where the white was is measured as the finger lands (pointerdown:
  // not inside the tap's own work), and once a click moved the choice it slides over from there. Keys and scripted clicks: no slide.
  const TRACKS = '.seg, .ui-seg, .lang, .tabs, .sheet-tools .chips, #radius, .tl-dtabs', ON = ':scope > :is([aria-pressed="true"], [aria-selected="true"])';
  let slide = null;
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest?.('button'), t = b?.parentElement, a = !off() && t?.matches(TRACKS) && t.querySelector(ON);
    slide = a && a !== b ? { t, a, r: a.getBoundingClientRect() } : null;
  }, { capture: true, passive: true });
  document.addEventListener('click', e => { // after every handler (this file loads last); the next frame: a render may wait for it
    const s = slide; slide = null; if (!s || !s.t.contains(e.target)) return;
    requestAnimationFrame(() => {
      const b = s.t.isConnected && s.t.querySelector(ON); if (!b || b === s.a) return;
      const q = b.getBoundingClientRect(); if (!q.width) return;
      b.animate({ transform: [`translateX(${s.r.left - q.left}px) scaleX(${s.r.width / q.width})`, 'none'] }, { duration: 340, easing: spring(), pseudoElement: '::before' });
    });
  });

  // What appears and changes, from one observer. Views: their host got new content. Patches: a part inside a view was rewritten.
  const $id = id => document.getElementById(id);
  const splash = $id('splash'), mSpot = $id('m-spot'), drawer = $id('drawer'), tl = $id('tl'), toastEl = $id('toast'), sheet = $id('m-sheet'), areas = $id('areas-body');
  const FISH = ['fish-current', 'mb-fish'].map($id), seen = {}; // seen: the fish each one last showed
  let drew = []; // the timeline curve last drawn in: its fish and method, first hour (map.js tlFor) and when. Round 16 X: not its hours' best,
  // which js/time-view.js makes anew after every pan (the line of the water in view): the curve was drawn in again after each one, a style pass
  // every frame for 0.75 s (an SVG stroke animation runs on the main thread)
  const isView = t => t === mSpot || t === drawer || t.classList.contains('leaflet-popup-content'); // the hosts never move (js/mobile.js drags #m-sheet and swipes #m-spot by transform): only their parts
  const openTab = () => document.querySelector('#m-main > .tab:not([hidden])');
  function fishHost(rec, boot) { // another fish: its dial sweeps and its picture swims in; the same fish redrawn (rankings filling in): glides
    const h = rec.target, fresh = seen[h.id] !== state.sp, old = ringsIn(rec.removedNodes).map(pOf);
    seen[h.id] = state.sp; if (boot) return;
    ringsIn(rec.addedNodes).forEach((r, k) => fresh || !(old[k] >= 0) ? sweep(r, 80) : sweep(r, 0, old[k]));
    if (fresh && rec.addedNodes.length) for (const im of h.querySelectorAll('.fish-art img, .mb-art img'))
      im.animate({ opacity: [0, 1], translate: ['-12px 0', '0 0'] }, { duration: 460, easing: spring() });
  }
  const mo = new MutationObserver(recs => {
    if (off()) return;
    // Starting up (the splash still in the page): the reveal brings the rail, sheet, bars, timeline and legend in (css/splash.css); their
    // first contents only set what later changes are measured against
    const boot = splash?.isConnected, views = new Set(), lists = new Set();
    let toastShown = false, newToast = false;
    for (const r of recs) {
      const t = r.target;
      if (boot && !FISH.includes(t) && t !== tl && t.parentNode !== tl) continue;
      if (r.type === 'attributes') {
        if (r.attributeName === 'class') { // the phone sheet up from its peek: the tab under it cascades in
          if (/\bpeek\b/.test(r.oldValue) && !t.classList.contains('peek') && !t.classList.contains('spot')) lists.add(openTab());
        } else if (r.oldValue !== null && !t.hidden) { // shown
          if (t === toastEl) toastShown = true;
          else if (t.classList.contains('tab')) lists.add(t);
          else if (t.id === 'm-main') lists.add(openTab()); // a spot closed: back to the tab
          else if (t.id === 'near-list') lists.add(t);
          else if (t === drawer) views.add(t);
          else if (t.classList.contains('pn-modal')) views.add(t.querySelector('.pn'));
        }
        continue;
      }
      if (!r.addedNodes.length) continue;
      if (isView(t)) views.add(t);
      else if (FISH.includes(t)) fishHost(r, boot);
      else if (t === tl || t.parentNode === tl) { // map.js drew a chart: draw its curve in if it shows other hours (a day, a fish), not just a new width
        for (const n of r.addedNodes) if (n.classList?.contains('tl-chart')) {
          const now = performance.now();
          if (`${state.sp}|${state.mode}` !== drew[0] || tlFor?.from !== drew[1]) drew = [`${state.sp}|${state.mode}`, tlFor?.from, boot ? -1e4 : now];
          else if (now - drew[2] < 1e3) n.style.setProperty('--mo-t', drew[2] - now + 'ms'); // a new width mid-draw: on from there
          else continue;
          if (!boot) { n.querySelector('.tl-line')?.setAttribute('pathLength', 1); n.classList.add('mo-draw'); }
        }
      } else if (t === toastEl) newToast = true;
      else if (t === areas) { if (t.querySelector('.area-list')) lists.add(t); }
      else { const old = ringsIn(r.removedNodes).map(pOf); ringsIn(r.addedNodes).forEach((n, k) => old[k] >= 0 && sweep(n, 0, old[k])); } // a patched part: from the old score
    }
    if (newToast && !toastShown && !toastEl.hidden) for (const a of toastEl.getAnimations()) a.currentTime = 0; // a new message on show: in again, out later
    for (const v of views) if (v) enter(v);
    for (const l of lists) cascadeIn(l);
  });
  mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'], attributeOldValue: true });
  if (sheet) mo.observe(sheet, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  for (const el of [mSpot, drawer, tl, map.getPane('popupPane')]) if (el) mo.observe(el, { childList: true, subtree: true });
  for (const el of [...FISH, toastEl, areas]) if (el) mo.observe(el, { childList: true });
  // A page (js/nav.js) the first time it shows: its lists and carousels cascade in, once the page's own move has begun
  document.addEventListener('ps:page', e => {
    const s = !off() && document.querySelector(`#pages > .pg[data-page="${e.detail.id}"]:not([hidden])`);
    if (!s || s.psMo) return; s.psMo = 1;
    requestAnimationFrame(() => { let d = 60; for (const l of s.querySelectorAll('.pg-body .ui-list, .pg-body .ui-carousel')) { cascade(l.querySelectorAll(':scope > :not([hidden])'), d); d += 60; if (d > 300) break; } });
  });

  // For views drawn elsewhere, once they are in the page: PsMotion.enter(el) (its parts rise, its dials sweep), .cascade(listOrTab),
  // .sweep(ring, delay, fromScore)
  return { off, enter: v => off() || enter(v), cascade: el => off() || cascadeIn(el), sweep };
})();
// Round 14: reduced motion for the map too. Every fly and pan (a spot, an area, Near me, following you, the feed) jumps instead: Leaflet's
// own animate: false (flyTo and flyToBounds go through flyTo, panTo through setView). Read at each call: the setting can change while open.
{ const RM = matchMedia('(prefers-reduced-motion: reduce)'), P = window.L?.Map?.prototype;
  if (P) for (const [k, at] of [['flyTo', 2], ['setView', 2], ['panTo', 1]]) {
    const f = P[k]; P[k] = function (...a) { if (RM.matches) a[at] = { ...a[at], animate: false }; return f.apply(this, a); };
  } }
