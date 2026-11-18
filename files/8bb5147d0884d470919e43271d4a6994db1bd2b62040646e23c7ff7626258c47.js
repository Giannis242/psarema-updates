'use strict';
Object.assign(I18N.en, { mc_bar: 'Map filters' });
Object.assign(I18N.el, { mc_bar: 'Φίλτρα χάρτη' });
// Psarema on phones (css/mobile.css). The top bar floats over the map (the search pill and the menu; a row of filter chips: the fish, how you
// fish), Layers and Locate on the right under it, one draggable bottom sheet over the app's tab bar (Map · Forecast · + · Feed · Me,
// js/nav.js; its pages cover the map and the sheet): peek = the head's top, the timeline (the fish's chance through the day, the hour, Now, ★);
// half = under it the readings and Where to go (round 17 G), or the spot you tapped; full = its details. The shared panels move
// into the phone containers and back when the screen gets wide, so ui.js and map.js keep drawing into the same elements.
// Back button (Android, browser, Escape): one history entry stands guard while anything is open; Back closes the topmost.
const PsMobile = window.PsMobile = (() => { // also on window: map.js (loaded earlier) looks it up there
  const stage = $('.stage'), bar = $('#mobile-bar'), menu = $('#mb-menu'), more = $('#mb-more');
  const sheet = $('#m-sheet'), head = $('#m-head'), body = $('#m-body'), main = $('#m-main'), spotEl = $('#m-spot');
  // [panel, phone parent, before ('first' = at the top; none = at the end)]. Moved in this order and back in reverse.
  // The top bar's fish chip opens the picker (the rail's fish card stays in the rail, hidden). Round 11: the head is the status line, the
  // timeline (all the peek shows), the readings; round 17 G: then one list, Where to go (it was four tabs); the app's tab bar and its pages
  // leave the rail (js/nav.js).
  const MOVES = [['#mode', '#mb-chips'], ['#status', '#m-head', '#m-read'], ['#strip', '#m-read'], ['.leaflet-bar.locate', '.hud'],
    ['.timeline', '#m-head', '#m-read'], ['#tab-where', '#m-main'], ['#ps-tabs', '#m-nav'], ['#pages', '.stage']];
  const M = { H: 0, top: 0, head: 0, sb: 0, peek: 0, half: 0, full: 0 }; // measured px: stage, sheet top, head, safe bottom, snap heights
  const spot = { kind: '', i: -1, html: '', fit: 0, back: 0, scroll: 0 }; // kind: '' | card | detail | html
  let homes = [], active = false, level = 0, timer = 0;
  // A phone on its side: the sheet is a panel on the right that scrolls as a whole, always open (css/mobile.css, the same query);
  // levels and dragging then do nothing visible, and the map's padding is the panel's width instead of its height.
  const SIDE = matchMedia('(orientation: landscape) and (max-height: 500px) and (max-width: 960px) and (min-width: 560px)'), side = () => active && SIDE.matches;
  const scroller = () => side() ? sheet : body;
  // The sheet's heights go to the few elements that use them (css/mobile.css): set on :root, every element's style was
  // recalculated at each snap (~4 ms on a desktop, 15+ ms on a phone); here only these small subtrees are.
  const tlEl = $('.timeline'), statusEl = $('#status'); // the peek ends under the timeline (no forecast: the status line with Retry)
  const toastEl = $('#toast'), peekEls = [toastEl, $('.hud'), $('#map-legend'), map.getContainer().querySelector('.leaflet-control-container')];

  /* ---------- Sheet geometry ---------- */
  const vis = lv => lv === 0 ? M.peek : lv === 2 ? M.full : spot.kind === 'card' || spot.kind === 'html' ? Math.min(M.full, spot.fit) : M.half;
  function measure(place = true) { // reads layout; only on resize and content changes, never while dragging
    const b = side() ? sideBounds : phoneBounds; if (map.options.maxBounds !== b) map.setMaxBounds(b); // rotated: the bounds for that layout
    const H = stage.clientHeight, top = bar.offsetTop + bar.offsetHeight + 8, below = el => el?.offsetParent ? el.offsetTop + el.offsetHeight : 0; // in the head
    const hd = head.offsetHeight, sb = Math.max(0, parseFloat(getComputedStyle(body).paddingBottom) - 12) || 0, full = H - top;
    const n = { H, top, head: hd, sb, peek: head.offsetTop + Math.max(below(tlEl), below(statusEl), 30) + 10 + sb, full, half: Math.max(hd + sb + 60, Math.min(full - 90, Math.max(hd + sb + 200, Math.round(H * .56)))) }; // half: keeps ≥90 px of map; on short phones ≥200 px of list (was 140: two rows)
    if (Object.keys(n).every(k => n[k] === M[k])) return;
    const refit = window.PsMobile && !spot.kind && n.H === M.H && (n.peek !== M.peek || n.top !== M.top); // the room above the sheet changed, not the map's size (map.js refits that); an open spot pans itself
    Object.assign(M, n);
    if (spot.kind === 'card' || spot.kind === 'html') spot.fit = fitH(); // rotated: the card's height is relative to the new screen
    sheet.style.height = full + 'px';
    for (const el of peekEls) el.style.setProperty('--m-peek', M.peek + 'px');
    if (place) { apply(level, false); if (spot.kind === 'card' && level === 1) pan(spot.i); } // rotated: the spot back into view
    // The sheet grows when the forecast's timeline arrives (fitted to the 80 px loading sheet, the island sat 80 px low) and when a spot
    // closes (the island stayed panned up under the bar). fitView keeps a zoomed-in view. invalidateSize: enter() just moved the timeline.
    if (refit) { map.invalidateSize(); fitView(); }
  }
  // Snap to a level: 0 peek, 1 half (or the card's own height), 2 full. Moves by transform only (on the compositor: the map under it
  // never redraws); will-change (css .drag/.anim) only while it moves. ms, speed: a flick's own pace and speed (endDrag).
  // The glide settles like a spring: it leaves fast, runs a few px past the level (more after a harder flick, ≤14) and comes back.
  // One cubic-bezier: its y2 = 1 + .6·√(overshoot / distance), fitted to the curve's peak for x1 .2, y1 .9, x2 .3.
  const spring = (dist, speed = 0) => `cubic-bezier(.2, .9, .3, ${(1 + Math.min(.2, .6 * Math.sqrt(Math.min(14, 3 + 6 * Math.abs(speed)) / Math.max(20, Math.abs(dist))))).toFixed(3)})`;
  const glide = (ms, curve) => { // the next transform glides for ms, or (0) jumps. Inline and only while gliding: a duration left behind would ease every drag step
    sheet.style.transition = ms ? `transform ${ms}ms ${curve}` : ''; sheet.classList.toggle('anim', !!ms);
  };
  function apply(lv, anim = true, from = vis(level), ms = 280, speed = 0) {
    const v = vis(lv), top0 = lv === 2 && !side() && body.scrollTop <= 0; // round 16 X: read before the writes below (after them, it forced a layout)
    level = lv; clearTimeout(timer);
    glide(anim ? ms : 0, spring(v - from, speed)); sheet.style.transform = `translateY(${M.full - v}px)`;
    const settle = () => { body.style.height = Math.max(0, v - M.head) + 'px'; sheet.classList.toggle('peek', lv === 0); };
    if (!(anim && v < from)) settle(); // shrink the body only once the sheet has slid down
    if (anim) timer = setTimeout(() => { if (v < from) settle(); glide(0); sheet.classList.remove('drag'); }, ms + 20); else sheet.classList.remove('drag');
    stage.classList.toggle('m-full', lv === 2);
    body.style.touchAction = ''; // css/mobile.css: below full the body drags the sheet; full, it scrolls (and pulls the sheet down from its top: onScroll)
    if (top0) body.style.touchAction = 'pan-x pan-down';
    toastEl.style.setProperty('--m-vis', v + 'px'); // toasts sit just above the sheet
    sync();
  }

  /* ---------- Dragging. The head always; the body too while the sheet is below full, and at full from the top of its scroll, pulling
     down (touch-action, css/mobile.css). Follows the finger, then snaps where the flick would carry it. No layout reads in here.
     Past full or the peek it gives less and less, like a rubber band; pulled well below the peek (no spot open), it refreshes. ---------- */
  let drag = null, raf = 0;
  const haptic = kind => window.PsNative?.haptic?.(kind);
  const rubber = (o, lim) => lim * o / (o + lim); // o px past an end shows as this: soft at first, never more than lim
  const track = (p, t, x) => { p.push([t, x]); while (p.length > 2 && t - p[0][0] > 100) p.shift(); }; // a finger's last 0.1 s, for its speed
  const speedOf = (p, t) => { const a = p[0], b = p[p.length - 1]; return t - b[0] > 80 || b[0] - a[0] < 8 ? 0 : (b[1] - a[1]) / (b[0] - a[0]); }; // px/ms; held still before letting go: 0
  const PULL = 90; // px of finger past the peek that arm a refresh
  const ptr = Object.assign(document.createElement('div'), { className: 'm-ptr', innerHTML: ic('refresh') }); // its sign, riding above the sheet
  ptr.setAttribute('aria-hidden', 'true'); sheet.append(ptr);
  sheet.addEventListener('pointerdown', e => {
    if (!active || side() || e.button > 0 || drag?.moved || e.target.closest('input, select, textarea')) return; // the hour slider scrubs; the side panel only scrolls
    const inBody = body.contains(e.target);
    if (inBody && (e.pointerType === 'mouse' || level === 2 && body.scrollTop > 0)) return; // a mouse scrolls with its wheel; a scrolled list scrolls
    const y = M.full - vis(level);
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: y, y, moved: false, up: !inBody || level < 2, pts: [[e.timeStamp, e.clientY]], pull: 0 };
  }, { passive: true });
  addEventListener('pointermove', e => { // on window: a mouse can leave the head before the first move
    const d = drag; if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0, dx = Math.abs(e.clientX - d.x0);
    if (!d.moved) {
      if (Math.abs(dy) < 8 && dx < 8) return;
      if (dx > Math.abs(dy) || !d.up && dy < 0) { drag = null; return; } // sideways (a row of chips, the days, a card to the next) or up a full list: not the sheet
      d.moved = true; sheet.setPointerCapture?.(e.pointerId);
      if (sheet.classList.contains('anim')) d.base = new DOMMatrix(getComputedStyle(sheet).transform).m42; // caught mid-snap: from where it is (a style read, once)
      clearTimeout(timer); glide(0); sheet.classList.remove('peek'); sheet.classList.add('drag'); body.style.height = M.full - M.head + 'px';
    }
    track(d.pts, e.timeStamp, e.clientY);
    const y = d.base + dy, max = M.full - M.peek;
    d.y = y > max ? max + rubber(y - max, 120) : y < 0 ? -rubber(-y, 28) : y; // 28: still under the tab bar, which hides the sheet's lifted foot
    const pull = spot.kind ? 0 : Math.max(0, Math.min(1, (y - max) / PULL));
    if ((pull === 1) !== (d.pull === 1)) { ptr.classList.toggle('on', pull === 1); if (pull === 1) haptic('medium'); } // armed: a knock, and the sign lights
    d.pull = pull;
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0; const d = drag; if (!d) return;
      sheet.style.transform = `translateY(${d.y}px)`;
      if (d.pull || ptr.style.opacity) { ptr.style.opacity = d.pull || ''; ptr.style.transform = `rotate(${Math.round(d.pull * 300)}deg)`; }
    });
  }, { passive: true });
  function endDrag(e) {
    const d = drag; if (!d || e.pointerId !== d.id) return;
    drag = null; if (!d.moved) return;
    const v = speedOf(d.pts, e.timeStamp), shown = M.full - d.y, hs = [0, 1, 2].map(vis); // v: + = down
    const aim = shown - v * 170; // where the flick would carry it
    let lv = hs.reduce((b, h, k) => Math.abs(h - aim) < Math.abs(hs[b] - aim) ? k : b, 0);
    if (v < -.35) lv = Math.max(lv, [0, 1, 2].find(k => hs[k] > shown + 8) ?? 2); // a flick goes at least to the next level that way
    if (v > .35) lv = Math.min(lv, [2, 1, 0].find(k => hs[k] < shown - 8) ?? 0);
    const ms = Math.round(Math.min(360, Math.max(200, Math.abs(hs[lv] - shown) / Math.max(.8, Math.abs(v)) * 1.3))); // a fast flick lands fast
    swallowClick();
    ptr.style.opacity = ''; ptr.classList.remove('on'); // fades out (css)
    if (d.pull === 1 && e.type === 'pointerup') { refresh(); apply(0, true, shown, ms); return; }
    if (lv !== level) haptic('light');
    if (lv === 0 && spot.kind) closeSpot(0, shown, ms, v); else apply(lv, true, shown, ms, v); // swiping a spot down dismisses it
  }
  // Pulled to refresh. The forecast is kept for an hour (sources.js loadForecast): within it a reload would only read the same forecast back
  // (and Open-Meteo allows a device so many calls a day), so it says how fresh it is. Older, the page loads again, as Retry does.
  function refresh() {
    if (F && status.cls !== 'error' && Date.now() - F.at < 36e5) toast(tr('mtFresh', F.at));
    else if (navigator.onLine === false) toast(tr('offline'));
    else location.reload();
  }
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag); // the browser took the touch (a list scrolling): snap back
  body.addEventListener('scroll', () => { // at full, the top of the list hands a pull-down to the sheet
    if (level === 2 && !side() && (body.scrollTop <= 0) !== (body.style.touchAction !== '')) body.style.touchAction = body.scrollTop <= 0 ? 'pan-x pan-down' : '';
  }, { passive: true });
  body.addEventListener('wheel', e => { if (active && !side() && level < 2 && e.deltaY > 0) apply(2); }, { passive: true }); // a mouse wheel opens what it cannot scroll yet
  function swallowClick() { // the click that ends a drag must not press the button it started on
    const stop = e => { e.stopPropagation(); e.preventDefault(); };
    addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => removeEventListener('click', stop, { capture: true }), 350);
  }
  $('#m-grab').addEventListener('click', () => { if (level) { if (spot.kind) closeSpot(0); else apply(0); } else apply(1); });
  // The app's tab bar (css/mobile.css .m-nav) lies over the sheet's foot: the body's bottom padding (--sb there) keeps the content above it,
  // so the peek and every snap already count it (measure: M.sb).
  L.DomEvent.disableClickPropagation(sheet); L.DomEvent.disableScrollPropagation(sheet); // drags and scrolls in the sheet never move the map

  /* ---------- The tapped spot in the sheet ---------- */
  const xBtn = () => `<button class="icon-btn m-x" data-m-close aria-label="${esc(tr('close'))}">${ic('close')}</button>`;
  function renderSpot() {
    if (spot.kind === 'detail') drawDetails(spotEl, spot.i); // an hour step rewrites only the parts that changed (ui.js)
    else if (!(spot.kind === 'card' && patchCard(spotEl, spot.i))) spotEl.innerHTML = xBtn() + (spot.kind === 'card' ? scoreCard(spot.i) : spot.html); // the card: only its changed parts
  }
  function show(kind, i, html = '') { // the spot replaces the tabs; remember what to go back to
    if (kind !== 'html' && window.PsNav && PsNav.current() !== 'map') PsNav.open('map'); // a spot is for the map: pages make way (a panel, html, shows over them: css .paged)
    if (!spot.kind) { spot.back = level; spot.scroll = scroller().scrollTop; }
    Object.assign(spot, { kind, i, html });
    main.hidden = true; spotEl.hidden = false; sheet.classList.add('spot'); sheet.dataset.spot = kind; // css: what the head keeps of the timeline
    renderSpot(); measure(false);
  }
  const fitH = () => Math.max(M.peek + 60, Math.min(Math.round(M.H * .78), M.full - 90, M.head + spotEl.offsetHeight + 22 + M.sb)); // a card opens at its own height, up to ~3/4 of the screen (large system text still shows its Go line and buttons)
  function fit() { spot.fit = fitH(); scroller().scrollTop = 0; }
  function pan(i) { // keep the spot in the map left above the sheet
    requestAnimationFrame(() => { // a list's setView starts its zoom on the next frame: read the map after it
      if (map._animatingZoom || map._panAnim?._inProgress) { map.once('moveend', () => pan(i)); return; }
      const sz = map.getSize(), p = map.latLngToContainerPoint([latOf(i), lonOf(i)]), bottom = side() ? sz.y : sz.y - vis(1), right = side() ? sz.x - sheet.offsetWidth : sz.x;
      const top = M.top; // the legend sits low on the left, under the sheet at half
      const offX = p.x < 30 || p.x > right - 30, offY = p.y < top + 30 || p.y > bottom - 50;
      if (offX || offY) map.panBy([offX ? p.x - right / 2 : 0, offY ? p.y - (top + bottom) / 2 : 0]);
    });
  }
  function openSpot(i, detail = spot.kind === 'detail') {
    if (!active) return;
    show(detail ? 'detail' : 'card', i);
    sel.ring.setLatLng([latOf(i), lonOf(i)]).addTo(map);
    if (detail) { scroller().scrollTop = 0; apply(2); } else { fit(); apply(1); pan(i); haptic('light'); }
  }
  function showHtml(html) { // a named place (harbour, wreck, beach…)
    if (!active) return;
    sel.i = -1; sel.ring.remove();
    show('html', -1, html); fit(); apply(M.head + spotEl.offsetHeight + 22 + M.sb > spot.fit + 4 ? 2 : 1); // a page taller than the card's height opens full, ready to scroll
  }
  function spotBack() { // details → card → what was there before
    if (spot.kind !== 'detail') return closeSpot();
    spot.kind = sheet.dataset.spot = 'card'; renderSpot(); fit(); apply(1); pan(spot.i);
  }
  function closeSpot(lv = spot.back, from, ms, speed) {
    if (!spot.kind) return;
    spot.kind = ''; spotEl.innerHTML = ''; spotEl.hidden = true; main.hidden = false; sheet.classList.remove('spot'); delete sheet.dataset.spot;
    sel.i = -1; sel.ring.remove();
    if (!active) return;
    measure(false); apply(lv, true, from, ms, speed); scroller().scrollTop = spot.scroll;
  }
  spotEl.addEventListener('click', e => { if (e.target.closest('[data-m-close]')) closeSpot(); });
  new ResizeObserver(() => { // a card that grew after it opened (its weather came in, an hour added a reason) opens further; it never shrinks under you
    if (!active || drag?.moved || level !== 1 || !(spot.kind === 'card' || spot.kind === 'html')) return;
    const f = fitH(); if (f > spot.fit + 4) { spot.fit = f; apply(1); }
  }).observe(spotEl);
  // The first card and details after start-up took ~4× the later ones (text and code warming up: 120 → 30 ms at a phone's speed), so one
  // is laid out unseen once the forecast is in and the page is idle: the best spot's (the likeliest tap), else any sea cell. No pictures:
  // nothing loads or paints.
  function warm() {
    if (!active || spot.kind || !F) return;
    const i = depth[state.focus] > 0 ? state.focus : depth.findIndex((d, k) => d > 10 && !northMask[k]); if (i < 0) return;
    const el = Object.assign(document.createElement('div'), { className: 'm-spot', innerHTML: (scoreCard(i) + detailHtml(i)).replace(/<img[^>]*>/g, '') });
    el.style.cssText = 'position:absolute;visibility:hidden;contain:strict;width:100%;height:0';
    body.append(el); void el.offsetHeight; el.remove();
  }
  const warmer = new MutationObserver(() => { if ($('#status').classList.contains('live')) { warmer.disconnect(); (window.requestIdleCallback || setTimeout)(() => { try { warm(); } catch (e) { console.warn(e); } }, { timeout: 5000 }); } });
  warmer.observe($('#status'), { attributes: true, attributeFilter: ['class'] });
  const refreshSpot = () => { if (active && (spot.kind === 'card' || spot.kind === 'detail')) renderSpot(); }; // hour, fish or method changed

  /* ---------- Swiping things sideways. Moved by transform and opacity only (Web Animations), none under reduced motion. ---------- */
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const anim = (el, kf, ms, easing = 'cubic-bezier(.2, .8, .25, 1)', fill = 'none') => REDUCED.matches || !el ? null : el.animate(kf, { duration: ms, easing, fill });

  // The card: left = the next best spot, right = the one before (tops, Where to go's order). It follows the finger, slides out and the
  // other slides in; with none that way it gives a little and springs back. Up and down stay the sheet's; Back still closes the card.
  let sw = null, swRaf = 0;
  const neighbour = step => { const k = tops.findIndex(t => t.i === spot.i); return tops[k < 0 ? (step > 0 ? 0 : -1) : k + step]; };
  const hScroll = t => { for (let n = t; n && n !== spotEl; n = n.parentElement) if (n.scrollWidth > n.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(n).overflowX)) return true; return false; };
  spotEl.addEventListener('pointerdown', e => {
    sw = active && spot.kind === 'card' && e.pointerType !== 'mouse' && !e.target.closest('input, select, textarea') && !hScroll(e.target)
      ? { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, on: false, pts: [[e.timeStamp, e.clientX]] } : null;
  }, { passive: true });
  addEventListener('pointermove', e => {
    const s = sw; if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.on) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) <= Math.abs(dy) || drag?.moved) { sw = null; return; } // up or down: the sheet's
      s.on = true; spotEl.style.willChange = 'transform';
    }
    track(s.pts, e.timeStamp, e.clientX);
    s.dx = neighbour(dx < 0 ? 1 : -1) ? dx : Math.sign(dx) * rubber(Math.abs(dx), 48);
    if (!swRaf) swRaf = requestAnimationFrame(() => { swRaf = 0; if (sw) { spotEl.style.transform = `translateX(${sw.dx}px)`; spotEl.style.opacity = 1 - Math.min(.5, Math.abs(sw.dx) / innerWidth); } }); // fading as it goes
  }, { passive: true });
  function endSwipe(e) {
    const s = sw; if (!s || e.pointerId !== s.id) return;
    sw = null; if (!s.on) return;
    swallowClick();
    const v = speedOf(s.pts, e.timeStamp), step = s.dx < 0 ? 1 : -1, t = neighbour(step), W = innerWidth, o = spotEl.style.opacity;
    spotEl.style.transform = spotEl.style.willChange = spotEl.style.opacity = '';
    if (!t || e.type !== 'pointerup' || !(Math.abs(s.dx) > W * .3 || Math.abs(v) > .35 && Math.sign(v) === Math.sign(s.dx) && Math.abs(s.dx) > 24)) {
      anim(spotEl, [{ transform: `translateX(${s.dx}px)`, opacity: o || 1 }, { transform: 'none', opacity: 1 }], 280, 'cubic-bezier(.2, .9, .3, 1.15)'); // back, a touch past the middle
      return;
    }
    const out = anim(spotEl, [{ transform: `translateX(${s.dx}px)`, opacity: o || 1 }, { transform: `translateX(${-step * W * .45}px)`, opacity: 0 }], 110, 'cubic-bezier(.4, 0, 1, 1)', 'forwards');
    const swap = () => {
      out?.cancel(); if (!active || spot.kind !== 'card') return;
      openCell(t.i); // the card, the ring on the map, the readings there; its own knock (openSpot)
      anim(spotEl, [{ transform: `translateX(${step * W * .3}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], 240);
    };
    out ? out.finished.then(swap, swap) : swap();
  }
  addEventListener('pointerup', endSwipe);
  addEventListener('pointercancel', endSwipe);

  // The timeline. Each hour the finger passes clicks (a 'tick', at most one every 40 ms: js/native.js); midnight and the ★ hour knock
  // harder. In capture, before ui.js moves state.h, so the hour it leaves is still there. The slider's own input only: Play and Now are silent.
  const hourEl = $('#hour');
  hourEl.addEventListener('input', e => {
    const a = state.h, b = +e.target.value; if (!F || a === b) return;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    let knock = bestHour !== a && bestHour >= lo && bestHour <= hi && best[bestHour] >= 40; // the ★ hour, when the ★ button shows (map.js drawWhen)
    for (let k = lo + 1; k <= hi && !knock; k++) knock = hours[k].local === 0;
    haptic(knock ? 'medium' : 'tick');
  }, true);
  $('#tl').addEventListener('click', e => { if (e.target.closest('[data-day]')) haptic('tick'); });
  // A quick flick across the day's chart turns the day (to the left: the next), at the hour of day it started from; a drag that comes to
  // rest scrubs the hours, as before. They differ in how the finger leaves: a flick lifts while still moving fast, a scrub stops on its hour.
  let fl = null;
  hourEl.addEventListener('pointerdown', e => { fl = active && e.pointerType === 'touch' ? { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, h: state.h, pts: [[e.timeStamp, e.clientX]] } : null; }, { passive: true });
  hourEl.addEventListener('pointermove', e => { if (fl?.id === e.pointerId) track(fl.pts, e.timeStamp, e.clientX); }, { passive: true });
  hourEl.addEventListener('pointerup', e => {
    const f = fl; fl = null; if (!f || f.id !== e.pointerId || !F) return;
    const dx = e.clientX - f.x0, v = speedOf(f.pts, e.timeStamp);
    if (e.timeStamp - f.t0 < 400 && e.timeStamp - f.pts[f.pts.length - 1][0] < 50 && Math.abs(dx) > 40 && Math.abs(dx) > 2 * Math.abs(e.clientY - f.y0) && Math.abs(v) > .4 && Math.sign(v) === Math.sign(dx)) turnDay(dx < 0 ? 1 : -1, f.h);
  });
  function turnDay(step, from) { // the flick scrubbed on its way: the day turns from the hour it started on
    const days = [...$('#tl').querySelectorAll('[data-day]')], k = days.findIndex(d => d.getAttribute('aria-pressed') === 'true'), b = days[k + step];
    if (k < 0) return; // the whole range on show (a wide screen): no days to turn
    setHour(b ? dayHour(b, hours[from].local) : from);
    if (b) haptic('medium');
    // the new day's chart slides in from the side it came from (drawn by the time the next frame starts: render may wait for it); none that way: a nudge
    requestAnimationFrame(() => anim($('#tl .tl-chart'), b ? [{ transform: `translateX(${step * 40}px)`, opacity: .15 }, { transform: 'none', opacity: 1 }]
      : [{ transform: 'none' }, { transform: `translateX(${-step * 12}px)` }, { transform: 'none' }], b ? 240 : 200));
  }

  /* ---------- Menu, Layers, mode ---------- */
  function toggleMenu(show = menu.hidden) { menu.hidden = !show; more.setAttribute('aria-expanded', show); }
  more.addEventListener('click', () => toggleMenu());
  menu.addEventListener('click', e => { if (e.target.closest('button')) toggleMenu(false); });
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !e.target.closest('#mb-menu, #mb-more')) toggleMenu(false); }, { passive: true });
  // The map's data credits (a licence condition) live in the menu on phones: the (i) on the map is hidden (css/mobile.css)
  $('#mb-credits').addEventListener('click', () => showHtml(`<div class="spot-pop credits"><b>${tr('credits')}</b><span>${map.attributionControl.getContainer().innerHTML}</span></div>`));
  $('#mode').addEventListener('click', e => { if (active && e.target.closest('[data-mode]')) haptic('tick'); });
  // A playing forecast redraws the map every 0.7 s whether seen or not (the screen off, the app in the background: a warm pocket). Stop it.
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) $('#play').click(); });

  /* ---------- Back button ---------- */
  function topCloser() { // what Back closes now, topmost first
    if (!$('#guide').hidden) return () => closeModal('#guide');
    if (!$('#help-modal').hidden) return () => { if (!window.PsHelp?.back?.()) closeModal('#help-modal'); };
    if (!$('#fish-modal').hidden) return () => closeModal('#fish-modal');
    if ($('#cal-modal') && !$('#cal-modal').hidden) return () => PsCalendar.close(); // the calendar's own modal on wide screens (js/calendar.js; made on first open)
    if ($('.pn-modal:not([hidden])')) return () => PsPanel.close(); // the shared panel on wide screens (js/catchlog.js): this listener may hear Back before its own
    if (!$('#layers-pop').hidden) return () => toggleLayers(false);
    if (!menu.hidden) return () => toggleMenu(false);
    const page = window.PsNav && PsNav.current() !== 'map' ? () => PsNav.back() : null; // js/nav.js: the page on top, one step back
    if (!active) { // a wide screen: inside the Android app, or a page open in the rail
      if (!$('#drawer').hidden) return closeDetails;
      return document.querySelector('.leaflet-popup') ? () => map.closePopup() : page;
    }
    if (spot.kind === 'detail') return spotBack;
    if (spot.kind) return () => closeSpot(); // a spot's card closes the pages (show); a panel (html) lies over them
    if (page) return page;
    return level && !side() ? () => apply(level - 1) : null;
  }
  const guarded = () => active || !!window.Capacitor?.isNativePlatform?.() || !!window.PsNav && PsNav.current() !== 'map'; // a wide screen's browser: while a page is open
  const onGuard = () => history.state?.psGuard === 1;
  let popping = 0;
  function sync() { // one guard entry while something is open, none otherwise (so Back on a bare map leaves the app)
    if (popping) return;
    const open = guarded() && !!topCloser();
    if (open && !onGuard()) history.pushState({ psGuard: 1 }, '');
    else if (!open && onGuard()) { popping = setTimeout(() => { popping = 0; }, 1000); history.back(); }
  }
  addEventListener('popstate', () => {
    if (popping) { clearTimeout(popping); popping = 0; } // our own clean-up step
    else if (guarded()) topCloser()?.();
    sync();
  });
  addEventListener('keydown', e => { // Escape = Back on phones
    if (e.key !== 'Escape' || !active) return;
    const close = topCloser(); if (!close) return;
    e.stopImmediatePropagation(); close(); sync();
  }, true);
  const mo = new MutationObserver(sync);
  for (const id of ['#guide', '#help-modal', '#fish-modal', '#layers-pop', '#mb-menu', '#drawer']) mo.observe($(id), { attributes: true, attributeFilter: ['hidden'] });
  map.on('popupopen popupclose', sync);
  document.addEventListener('ps:page', sync); // js/nav.js: a page opened or closed

  /* ---------- Phone ⇄ wide screen ---------- */
  // The sheet covers the south: let the south coast pan up above it (without this, Leaflet pins the island mid-screen when zoomed out).
  const wideBounds = map.options.maxBounds, phoneBounds = L.latLngBounds([wideBounds.getSouth() - 4, wideBounds.getWest()], [wideBounds.getNorth() + 2, wideBounds.getEast()]);
  const sideBounds = L.latLngBounds(phoneBounds.getSouthWest(), [phoneBounds.getNorth(), phoneBounds.getEast() + 6]); // the side panel covers the east instead
  // Tall screens show a lot of map beyond the island's waters: paint it like the dimmed sea instead of near-black.
  const masks = []; map.eachLayer(l => { if (l.options.pane === 'mask' && l.setStyle) masks.push([l, l.options.fillColor]); });
  function enter() {
    active = true;
    map.setMaxBounds(phoneBounds);
    for (const [l] of masks) l.setStyle({ fillColor: '#09131d' });
    const i = sel.i >= 0 && (map.hasLayer(sel.card) || !$('#drawer').hidden) ? sel.i : -1; // a card or drawer open on the wide screen comes along
    map.closePopup(); $('#drawer').hidden = true; sel.ring.remove(); sel.autoRail = false;
    for (const [s, to, before] of MOVES) {
      const n = $(s), p = $(to); homes.push([n, n.parentNode, n.nextSibling]);
      p.insertBefore(n, before === 'first' ? p.firstChild : before ? $(before) : null);
    }
    measure(false); apply(0, false);
    map.invalidateSize(); fitView(); // the island between the bar and the sheet just measured (map.js leaves phones to this; the map is taller if the timeline was in the page)
    if (F) drawWhen(); // the ★ button is shorter here
    if (i >= 0) openCell(i);
  }
  function leave() {
    const i = spot.kind === 'card' || spot.kind === 'detail' ? spot.i : -1;
    toggleMenu(false); closeSpot(0);
    for (const [n, p, next] of homes.reverse()) p.insertBefore(n, next);
    homes = []; active = false; level = 0; map.setMaxBounds(wideBounds);
    for (const [l, fill] of masks) l.setStyle({ fillColor: fill });
    stage.classList.remove('m-full'); clearTimeout(timer); glide(0); sheet.classList.remove('drag'); sheet.style.transform = body.style.touchAction = '';
    setRail(state.rail); queueMicrotask(() => map.invalidateSize());
    if (F) drawWhen();
    if (i >= 0) openCell(i);
    sync();
  }
  const update = () => { if (isPhone() !== active) (active ? leave : enter)(); };
  PHONE.addEventListener('change', update);
  new ResizeObserver(() => { if (active) measure(); }).observe(stage);
  new ResizeObserver(() => { if (active) measure(); }).observe(head);

  // ui.js calls these when isPhone(); each first catches up with the layout in case the media-query event has not arrived yet.
  // On window before the first enter(): its fit (map.js fitView) asks fitPad.
  const api = window.PsMobile = {
    openSpot: (i, detail) => { update(); openSpot(i, detail); }, showHtml: html => { update(); showHtml(html); },
    spotBack, refreshSpot, closeSpot: () => closeSpot(),
    swapHtml: (old, html) => active && spot.kind === 'html' && spot.html === old && (old === html || (spot.html = html, renderSpot()), true), // ui.js refreshOpen: a named place's card, redrawn in place if still open
    sheet: lv => { update(); if (!active) return; if (spot.kind) closeSpot(lv); else apply(lv); }, // 0 peek, 1 half, 2 full
    pad: () => side() ? { paddingTopLeft: [8, M.top], paddingBottomRight: [sheet.offsetWidth + 8, 8] } : { paddingTopLeft: [8, M.top], paddingBottomRight: [8, vis(level)] }, // map padding for flyTo / fitBounds
    fitPad: () => { update(); return !active || !M.full ? null : side() ? [[0, M.top], [sheet.offsetWidth, 0]] : [[0, M.top], [0, M.peek]]; }, // map.js fitView: the island between the top bar and the sheet (VIEW has sea at its sides)
  };
  update();
  sync();
  return api;
})();
