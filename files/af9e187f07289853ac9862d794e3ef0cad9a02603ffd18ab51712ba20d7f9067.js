'use strict';
// Psarema's top-level pages (css/nav.css), Fishbrain-style: the map, and pages over it (Forecast, Feed, Me; pushed ones: a species, a catch, a sighting).
//   PsNav.add(id, { title: () => text, icon: 'name', tab?: true, big?: false, render(el, arg), show?(el, arg), hide?() }) registers a page; modules call it as they load.
//     A tab page opens on a large title (css/nav.css .pg.big; big: false = the compact bar only); .pg.scrolled while its body is scrolled.
//     render fills the page's element the first time it opens (and again after a language change; a page without show: also for a new arg);
//     show runs on every open (arg: whatever open() was given); hide when it goes (another page on top, or the map).
//     el is the page's scrolling body. Its header has an actions slot a page may fill: el.closest('.pg')?.querySelector('.pg-acts').
//   PsNav.open(id, arg) shows a page ('map' = close every page); PsNav.back() → false when already at the map; PsNav.current() → id.
//   document fires 'ps:page' { detail: { id } } after each change.
// The five places (#ps-tabs: Map · Forecast · + · Feed · Me): on phones the tab bar at the screen's foot (js/mobile.js moves it into #m-nav),
// on wide screens a row at the rail's head. A tab page replaces the one showing (each keeps its scroll); any other page is pushed on top, with a back
// arrow. Phones: pages are full-screen layers over the map (never unmounted) and under the tab bar; Back and Escape close the topmost first
// (js/mobile.js topCloser). Wide screens: the page fills the rail under its row. Nothing is drawn before a page first opens.
const PsNav = window.PsNav = (() => {
  const pages = {}, host = $('#pages'), bar = $('#ps-tabs'), stage = $('.stage'), rail = $('#rail');
  const actsRO = window.ResizeObserver && new ResizeObserver(es => { for (const e of es) e.target.closest('.pg').style.setProperty('--pg-acts-w', e.target.offsetWidth + 'px'); });
  let stack = [], gen = 0, runs = []; // stack: [{ id, arg }], the top last (empty: the map); gen, runs: the transition under way
  const top = () => stack[stack.length - 1];
  const current = () => top()?.id || 'map';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const anim = (el, kf, ms) => { if (REDUCED.matches) return null; const a = el.animate(kf, { duration: ms, easing: 'cubic-bezier(.2, .8, .25, 1)' }); runs.push(a); return a; };
  const fire = () => document.dispatchEvent(new CustomEvent('ps:page', { detail: { id: current() } }));
  const add = (id, def) => { pages[id] = { ...def, sec: pages[id]?.sec }; };

  function sec(id) { // the page's section: header (back, title, actions) and its scrolling body; made on first open
    const p = pages[id];
    if (!p.sec) {
      p.sec = Object.assign(document.createElement('section'), { className: 'pg', hidden: true,
        innerHTML: `<header class="pg-head"><button class="icon-btn pg-back" data-nav-back>${ic('chevron-left')}</button><h2 class="pg-title" id="pg-t-${id}" tabindex="-1"></h2><div class="pg-acts"></div></header><div class="pg-body"></div>` });
      p.sec.dataset.page = id; p.sec.setAttribute('aria-labelledby', 'pg-t-' + id);
      const s = p.sec, body = s.lastChild, acts = s.querySelector('.pg-acts');
      body.addEventListener('scroll', () => s.classList.toggle('scrolled', body.scrollTop > (s.classList.contains('big') ? 30 : 4)), { passive: true });
      actsRO?.observe(acts); // the large title keeps clear of the actions beside it
      host.append(p.sec);
    }
    return p.sec;
  }
  function fill(e) { // draws the entry's page: render the first time (or stale), show each time
    const p = pages[e.id], s = sec(e.id), body = s.lastChild;
    const back = s.querySelector('.pg-back'); back.hidden = p.tab && stack[0] === e; back.setAttribute('aria-label', tr('nav_back'));
    try {
      if (!s.dataset.r || !p.show && s._arg !== e.arg) { s.dataset.r = 1; p.render?.(body, e.arg); }
      p.show?.(body, e.arg);
    } catch (err) { console.error(`page ${e.id}:`, err); }
    s._arg = e.arg;
    const title = p.title?.(e.arg) || '';
    s.querySelector('.pg-title').textContent = title;
    s.classList.toggle('big', back.hidden && p.big !== false); body.dataset.title = title;
  }
  function settle() { // every page but the top one hidden (its scroll kept for its return), and the host with none
    const t = top() && pages[top().id].sec;
    for (const id in pages) { const s = pages[id].sec; if (s && s !== t && !s.hidden) { if (s._yAt !== gen) s._y = s.lastChild.scrollTop; s.hidden = true; } }
    host.hidden = !t;
  }
  // The stack becomes `next`. how: 'tab' (a tab in place of what shows), 'push', 'pop', 'close' (to the map). Motion by transform and opacity
  // (Web Animations, none under reduced motion), below. A new move first finishes the one under way.
  function go(next, how) {
    const g = ++gen; for (const a of runs.splice(0)) a.finish();
    const from = top(), a = from && pages[from.id].sec;
    // Round 16 X: the scroll of the page that goes is read here, before this move writes anything (no layout of its own); read in settle,
    // after the new page was drawn, it forced a layout of that page inside the tap
    if (a && !a.hidden) { a._y = a.lastChild.scrollTop; a._yAt = g; }
    if (from) try { pages[from.id].hide?.(); } catch (err) { console.error(err); }
    stack = next;
    const to = top(), b = to && sec(to.id), leaving = how === 'pop' || how === 'close';
    if (to && isPhone() && $('#m-sheet').dataset.spot === 'html') PsMobile.closeSpot(); // a panel (catches, calendar…) shown over the last page goes with it
    if (b) {
      host.hidden = false; fill(to);
      // shown again: its scroll back in the next frame, before it paints (setting it here forced a layout of the whole page inside the tap);
      // from the top (a page shown again starts there anyway): only its header's state
      if (b.hidden) { b.hidden = false; const y = b._y; if (y) requestAnimationFrame(() => { if (!b.hidden) { b.lastChild.scrollTop = y; b.lastChild.dispatchEvent(new Event('scroll')); } }); else b.classList.remove('scrolled'); }
      b.style.zIndex = leaving ? 1 : 2;
    }
    if (a && a !== b) a.style.zIndex = leaving ? 2 : 1;
    // one set of moves for every page: push = in from the right over the page it leaves, which drifts a quarter left; pop = the reverse;
    // a tab = a short fade up in place; from the map = rises in; to the map = sinks away
    const other = a && a !== b, X = 'translateX(100%)', Q = 'translateX(-25%)';
    if (how === 'push' && other) anim(a, [{ transform: 'none' }, { transform: Q }], 280);
    if (how === 'pop' && b && other) anim(b, [{ transform: Q }, { transform: 'none' }], 260);
    const run = leaving ? other && anim(a, how === 'pop' ? [{ transform: 'none' }, { transform: X }] : [{ opacity: 1 }, { opacity: 0, transform: 'translateY(16px)' }], how === 'pop' ? 260 : 200)
      : b && anim(b, how === 'push' ? [{ transform: X }, { transform: 'none' }] : [{ opacity: 0, transform: `translateY(${how === 'tab' ? 8 : 16}px)` }, { opacity: 1, transform: 'none' }], how === 'push' ? 280 : how === 'tab' ? 180 : 220);
    const done = () => { if (g === gen) settle(); };
    if (run && a && a !== b && how !== 'tab') run.finished.then(done, done); else done(); // the page left behind stays under (push) or on top (pop) while it moves
    layout(); fire();
    // round 14: a screen reader (and the keyboard) starts on the page that opened, not behind it (unless the page put focus in itself).
    // Round 16 X: in the next frame, where it shares the frame's own style pass: here, focus() forced that pass inside the tap's task
    if (b && !leaving) requestAnimationFrame(() => { if (g === gen && !b.hidden && !b.contains(document.activeElement)) b.querySelector('.pg-title').focus({ preventScroll: true }); });
  }
  function layout() { // the tab that shows (Map when no tab page leads the stack), and the rail on wide screens
    const tab = stack[0] && pages[stack[0].id].tab ? stack[0].id : 'map';
    for (const b of bar.querySelectorAll('[data-nav]')) b.dataset.nav === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
    stage.classList.toggle('paged', !!stack.length); rail.classList.toggle('paged', !!stack.length && !isPhone()); // css/nav.css
    if (!isPhone() && typeof setRail === 'function') setRail(stack.length ? true : state.rail); // a page opens a collapsed rail; the map gives it back
  }
  function open(id, arg) {
    if (id === 'map' || !pages[id]) { if (stack.length) go([], 'close'); return; }
    const t = top();
    if (t?.id === id && t.arg === arg) { fill(t); return; } // already showing: drawn again (show), nothing moves
    if (pages[id].tab) go([{ id, arg }], stack.length ? 'tab' : 'rise');
    else go([...stack, { id, arg }], 'push');
  }
  const back = () => { if (!stack.length) return false; go(stack.slice(0, -1), stack.length > 1 ? 'pop' : 'close'); return true; };

  // The tab bar. The tab showing again: back to its first page, or (there already) to its top. + logs a catch (js/catchlog.js).
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-nav]'); if (!b) return;
    const id = b.dataset.nav; window.PsNative?.haptic?.('tick');
    if (id === 'log') { window.PsCatch?.log?.(-1); return; }
    if (id !== 'map' && !pages[id]) { toast(tr('nav_none')); return; }
    if (id !== 'map' && stack[0]?.id === id) { if (stack.length > 1) go([stack[0]], 'pop'); else pages[id].sec.lastChild.scrollTo({ top: 0, behavior: REDUCED.matches ? 'auto' : 'smooth' }); return; }
    open(id);
  });
  host.addEventListener('click', e => { if (e.target.closest('[data-nav-back]')) back(); });
  // Wide screens: Escape closes the page once nothing over it is open (phones: js/mobile.js). Before js/ui.js's own Escape, which closes those;
  // not from a field (the search clears or closes itself).
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || isPhone() || !stack.length || e.target.closest?.('input, textarea, select') ||
      document.querySelector('.modal:not([hidden]), .leaflet-popup') || !$('#drawer').hidden || !$('#layers-pop').hidden) return;
    back();
  }, true);
  // Phones: a popup on the map (a pin, a place) is for seeing: the pages make way. (A spot's card does the same: js/mobile.js show.)
  map.on('popupopen', () => { if (stack.length && isPhone()) go([], 'close'); });
  // A new language: every page drawn so far is drawn again when it next opens; the one showing, now.
  new MutationObserver(() => { for (const id in pages) delete pages[id].sec?.dataset.r; if (top()) fill(top()); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  PHONE.addEventListener('change', () => queueMicrotask(layout)); // after js/mobile.js has moved the pieces

  // The search slot's stand-in (until js/search.js mounts the real one): the fish picker, typing ready
  $('#m-search').addEventListener('click', e => { if (e.target.closest('[data-srch-ph]')) { openGallery(); $('#fish-search').focus(); } });

  return { add, open, back, close: () => open('map'), current, pages };
})();
