'use strict';
// Psarema: the Android app's own phone features (Capacitor plugins in mobile/), each with the web as its fallback.
//   window.PsNative = { isNative, hasGeo, canNotify, canShare, canSaveFile, watch(cb, opts), clearWatch(id), share(o), saveFile(name, data, mime),
//                       notify(n), remind(trip), cancelRemind(id), reminders(), settings(), setBrief(on, time), haptic(kind) }
// The APK also gives the page --safe-top/right/bottom/left on <html> (MainActivity: edge-to-edge on phones) and routes the
// icon's long-press shortcuts here (psarema://today | log | near).
// An over-the-air update can bring this file to an APK built before these plugins: every feature checks for its plugin first
// (Capacitor.Plugins.X exists only when the APK has it), so an old APK keeps the WebView's location and simply shows no Notifications item.
// Load it before js/ui.js: ui.js starts the location watch as it loads. Nothing here runs in a browser beyond these checks.
window.PsNative = (() => {
  const cap = window.Capacitor, isNative = !!cap?.isNativePlatform?.(), P = (isNative && cap.Plugins) || {};
  const Geo = P.Geolocation, LN = P.LocalNotifications, Sh = P.Share, Fs = P.Filesystem, H = P.Haptics, App = P.App;
  // A retry waits while the app is paused (in the background, or under a system dialog such as Google's "turn on Location Accuracy"):
  // retrying under the dialog would stack another one on it every 15 s. It runs when the app is back.
  let paused = false; const held = [];
  if (App) Promise.resolve().then(() => { App.addListener('pause', () => { paused = true; }); App.addListener('resume', () => { paused = false; held.splice(0).forEach(f => f()); }); })
    .catch(e => console.warn('pause:', e));
  const later = (fn, ms) => setTimeout(() => paused ? held.push(fn) : fn(), ms);

  /* ---------- Location (@capacitor/geolocation: Google's fused provider) ----------
     The WebView's watch runs the GPS once a second; this one takes a fix only as often as asked (interval), with GPS only for
     `high`, and drops fixes that moved less than `distance` metres without getting sharper. Callback: cb(position) or cb(null, error),
     the error's code as the web's: 1 no permission, 2 no fix or location off, 3 timed out.
     opts: { high, interval (ms), minInterval (ms), maxAge (ms), distance (m), force (the user asked: may prompt again) } */
  let gms = !!Geo, nW = 0, asked = false, geoOff = false, offSaid = false;
  const watches = new Map(); // our id -> { cid: the plugin's callback id, web: a navigator.geolocation id, retry }
  const codeOf = e => +String(e?.code ?? '').slice(-4) || 0; // 'OS-PLUG-GLOC-0003' -> 3
  const metres = (a, b) => { const k = Math.PI / 180, x = (b.longitude - a.longitude) * k * Math.cos((a.latitude + b.latitude) / 2 * k), y = (b.latitude - a.latitude) * k; return Math.hypot(x, y) * 6371e3; };
  function watch(cb, o = {}) {
    const id = ++nW, w = { last: null, at: 0 };
    watches.set(id, w);
    const live = () => watches.get(id) === w;
    const deliver = p => {
      if (!live()) return;
      const c = p.coords, l = w.last;
      if (l && o.distance && Date.now() - w.at < 120e3 && metres(l, c) < o.distance && !(c.accuracy < l.accuracy * .8)) return; // no move, no sharper: nothing new
      w.last = c; w.at = Date.now(); cb(p);
    };
    const fail = e => { if (live()) cb(null, e); };
    const web = () => {
      if (!navigator.geolocation) return fail({ code: 2, message: 'no geolocation' });
      w.web = navigator.geolocation.watchPosition(deliver, fail, o.high ? { enableHighAccuracy: true, timeout: 20000, maximumAge: o.maxAge ?? 10000 } : { enableHighAccuracy: false, maximumAge: o.maxAge ?? 60000 });
    };
    const begin = async () => {
      let st = null;
      try { st = await Geo.checkPermissions(); geoOff = false; offSaid = false; } // rejects while location is off on the phone
      catch { if (geoOff) { if (!offSaid) { offSaid = true; fail({ code: 2, message: 'location off' }); } return; } } // the plugin asked to turn it on once: not again every cycle
      if (!live()) return;
      const fine = st?.location === 'granted', coarse = st?.coarseLocation === 'granted';
      if (st && !fine && !coarse && asked) return fail({ code: 1, message: 'denied' }); // already asked since the app opened
      const high = !!o.high && (fine || !asked); // approximate only: ask for precise once, then use what was given
      if (!fine) asked = true;
      const opts = { enableHighAccuracy: high, timeout: o.interval ?? (high ? 5000 : 60000), maximumAge: o.maxAge ?? 0, minimumUpdateInterval: o.minInterval ?? (high ? 2000 : 30000) };
      const r = Geo.watchPosition(opts, (p, e) => {
        if (p) return deliver(p);
        if (!live()) return;
        const k = codeOf(e);
        drop(w); // a failed native watch is over
        if (k === 14 || k === 15) { gms = false; return web(); } // no Google Play services: the WebView's location from now on
        if (k === 3) return fail({ code: 1, message: e?.message });
        if (k === 7 || k === 9 || k === 16) geoOff = true; // location is off and the user said no to turning it on
        fail({ code: k === 10 ? 3 : 2, message: e?.message });
        if (!geoOff) w.retry = later(() => live() && begin(), 15e3); // as the web watch: keep trying
      });
      Promise.resolve(r).then(cid => { if (live() && !w.cid) w.cid = cid; else if (cid) Geo.clearWatch({ id: cid }).catch(() => {}); }, e => fail({ code: 2, message: e?.message }));
    };
    if (o.force) { asked = false; geoOff = false; offSaid = false; }
    if (gms) begin(); else web();
    return id;
  }
  function drop(w) { // stop a watch's native or web half
    clearTimeout(w.retry);
    if (w.cid) Geo.clearWatch({ id: w.cid }).catch(() => {});
    if (w.web != null) navigator.geolocation.clearWatch(w.web);
    w.cid = w.web = null;
  }
  function clearWatch(id) { const w = watches.get(id); if (!w) return; watches.delete(id); drop(w); }

  /* ---------- Haptics (@capacitor/haptics): haptic('tick' | 'light' | 'medium' | 'success' | 'warning'); nothing in a browser or an older APK ----------
     'tick': a detent's click (an hour passing under the finger, a tab). Not the plugin's selectionChanged(): on Android that is a 100 ms
     buzz (its HapticsSelectionType), a hum once the hours run by; a one-shot this short reads as a click. Ticks closer than 40 ms are
     dropped (a fast drag would buzz), and so is a tick right after a stronger one. */
  const TICK_MS = 12; // calibration: too faint on some motors → 15–20
  let hapAt = 0;
  function haptic(kind = 'light') {
    if (!H) return;
    const t = performance.now(); if (kind === 'tick' && t - hapAt < 40) return; hapAt = t;
    (kind === 'tick' ? H.vibrate({ duration: TICK_MS }) : kind === 'success' || kind === 'warning' ? H.notification({ type: kind.toUpperCase() })
      : H.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' }))?.catch?.(() => {});
  }

  /* ---------- Share (@capacitor/share: Android's share sheet) ---------- */
  // share({ title, text, url }) -> true once handed over; false when cancelled or impossible. Browsers: the Web Share API, else the clipboard.
  async function share(o = {}) {
    const { title, text, url } = o;
    if (Sh) {
      try { await Sh.share({ title, text, url, dialogTitle: title }); return true; }
      catch (e) { if (/cancel/i.test(e?.message || '')) return false; console.warn('share:', e); }
    }
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return true; }
      catch (e) { if (e?.name === 'AbortError') return false; }
    }
    const all = [title, text, url].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(all); }
    catch { const ta = Object.assign(document.createElement('textarea'), { value: all }); document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
    say('shareCopied');
    return true;
  }
  // saveFile(name, data, mime) -> true once Android's share sheet showed the file (Save to Files / Drive, mail, chat…; also when the
  // user then backs out), false where it cannot (a browser, or an APK without the plugins): the caller's own download is the fallback.
  // data: text, a Blob, an ArrayBuffer or a typed array. Written to the app's cache (@capacitor/filesystem), then shared (@capacitor/share).
  async function saveFile(name, data, mime = 'application/octet-stream') {
    if (!Sh) return false;
    const file = String(name || 'psarema.txt').replace(/[^\w.\-]+/g, '_');
    const text = typeof data === 'string';
    try {
      if (!Fs) { // an older APK: the text itself, when it is small enough to share as a message
        if (!text || data.length > 100e3) return false;
        await Sh.share({ title: file, text: data, dialogTitle: file }); return true;
      }
      const blob = text ? null : data instanceof Blob ? data : new Blob([data], { type: mime });
      const b64 = blob && await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
      const { uri } = await Fs.writeFile({ path: 'share/' + file, data: text ? data : b64, directory: 'CACHE', recursive: true, ...text ? { encoding: 'utf8' } : {} });
      await Sh.share({ title: file, files: [uri], dialogTitle: file });
      return true;
    } catch (e) {
      if (/cancel/i.test(e?.message || '')) return true;
      console.warn('saveFile:', e); return false;
    }
  }

  /* ---------- Notifications (@capacitor/local-notifications) ----------
     The daily brief: off until turned on (the permission is asked then). One notification for each of the next 7 days at the chosen
     time, planned again each time the app opens; the day that PsPlanner.briefData() covers gets its best trips, the others a nudge.
     Not opened for a week: they stop. Trip reminders: one-offs, `before` minutes ahead of a trip. All of it stays on the phone. */
  const KEY = 'psarema-notif-v1', BRIEF_IDS = [1, 2, 3, 4, 5, 6, 7].map(k => 7700 + k), TRIP0 = 7800;
  const load = () => { try { return { brief: false, time: '07:00', trips: [], ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { brief: false, time: '07:00', trips: [] }; } };
  const save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
  const T = (k, ...a) => typeof tr === 'function' ? tr(k, ...a) : k;
  const say = (k, ...a) => typeof toast === 'function' && toast(T(k, ...a));
  const cyDay = t => new Intl.DateTimeFormat('en-CA', { timeZone: typeof TZ === 'string' ? TZ : 'Asia/Nicosia' }).format(t); // YYYY-MM-DD in Cyprus
  const fmt = (t, o) => typeof fmtT === 'function' ? fmtT(t, o) : new Date(t).toLocaleString();
  const at24 = t => fmt(t, { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const lang = () => typeof state === 'object' ? state.lang : 'en';
  const forecastReady = () => typeof F !== 'undefined' && !!F;

  async function allowed(ask) { // the phone lets the app post notifications; ask: request it (Android 13+ shows its prompt once or twice, then only Settings)
    if (!LN) return false;
    let p = await LN.checkPermissions().catch(() => null);
    if (p?.display === 'granted') return true;
    if (!ask) return false;
    p = await LN.requestPermissions().catch(() => null);
    return p?.display === 'granted';
  }
  let chans = false;
  async function channels() { // Android 8+: the user can tune each channel in Settings; names in the current language
    if (chans || !LN) return; chans = true;
    await LN.createChannel({ id: 'brief', name: T('nfBrief'), description: T('nfBriefHint'), importance: 3, visibility: 1 }).catch(() => {});
    await LN.createChannel({ id: 'trips', name: T('nfTrips'), description: T('nfTripsHint'), importance: 4, visibility: 1 }).catch(() => {});
  }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
  async function briefText() { // { day: 'YYYY-MM-DD', title, body, lines } from the planner, or null
    if (!window.PsPlanner?.briefData) return null;
    try {
      const b = await withTimeout(PsPlanner.briefData(), 120e3), it = b?.items?.[0];
      if (!it || typeof hours === 'undefined' || !hours[it.hour]) return null;
      return { day: cyDay(hours[it.hour].t), t: hours[it.hour].t, title: b.title, body: T('nfBriefBody', it.title, it.body, it.score), lines: b.items.map(x => `${x.title} — ${x.body}`).join('\n') };
    } catch (e) { console.warn('brief notification:', e); return null; }
  }
  let planning = Promise.resolve();
  const planBrief = () => (planning = planning.then(planBriefNow, planBriefNow));
  async function planBriefNow() {
    if (!LN) return;
    await LN.cancel({ notifications: BRIEF_IDS.map(id => ({ id })) }).catch(() => {});
    const p = load();
    if (!p.brief || !(await allowed(false))) return;
    await channels();
    const [hh, mm] = p.time.split(':').map(Number), now = Date.now(), times = [];
    for (let d = 0; times.length < 7; d++) { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(hh, mm, 0, 0); if (t - now > 60e3) times.push(t); }
    const b = await briefText();
    const ns = times.map((t, k) => {
      const mine = b && b.day === cyDay(t);
      return { id: BRIEF_IDS[k], channelId: 'brief', title: T('nfBriefTitle', fmt(t, { weekday: 'long' })), body: mine ? b.body : T('nfBriefGeneric'),
        ...mine ? { largeBody: b.lines } : {}, schedule: { at: t, allowWhileIdle: true }, extra: { kind: 'brief' } };
    });
    await LN.schedule({ notifications: ns }).catch(e => console.warn('brief notification:', e));
    save({ ...load(), planned: Date.now(), lang: lang() });
  }
  async function setBrief(on, time) {
    const p = load();
    if (time) p.time = time;
    if (on && !(await allowed(true))) { p.brief = false; save(p); say('nfDenied'); return false; }
    p.brief = !!on; save(p);
    await planBrief();
    say(on ? 'nfOnToast' : 'nfOffToast', p.time);
    return p.brief;
  }

  // notify({ title, body, at?, id?, extra? }) -> the id, or false. Now, or at `at` (a Date or ms). Asks for the permission if needed.
  async function notify(n = {}) {
    if (!LN) { // a browser: only now, and only when already allowed
      if (n.at || !window.Notification || Notification.permission !== 'granted') return false;
      new Notification(n.title || 'Psarema', { body: n.body || '' }); return true;
    }
    if (!(await allowed(true))) { say('nfDenied'); return false; }
    await channels();
    const id = n.id ?? TRIP0 + 900 + Math.floor(Math.random() * 99);
    const when = n.at ? new Date(+n.at) : null;
    await LN.schedule({ notifications: [{ id, channelId: n.channel || 'trips', title: n.title || 'Psarema', body: n.body || '', ...n.largeBody ? { largeBody: n.largeBody } : {},
      ...when ? { schedule: { at: when, allowWhileIdle: true } } : {}, extra: n.extra || {} }] });
    return id;
  }
  // remind({ at: the trip's start (ms), title, body, cell?, before = 60 }) -> the reminder's id, or false. For "Remind me" on a trip.
  async function remind(t = {}) {
    if (!LN) return false;
    const before = t.before ?? 60, when = +t.at - before * 60e3;
    if (!(when > Date.now() + 60e3)) { say('nfTooLate'); return false; }
    const p = load(), live = p.trips.filter(x => x.when > Date.now());
    const id = TRIP0 + ((p.seq = ((p.seq || 0) + 1) % 800));
    const ok = await notify({ id, channel: 'trips', at: when, title: T('nfTripTitle', t.title || '', before), body: t.body || '', extra: { kind: 'trip', cell: t.cell ?? null, t: +t.at } }).catch(e => (console.warn('reminder:', e), false));
    if (!ok) return false;
    save({ ...p, trips: [...live, { id, at: +t.at, when, title: t.title || '', body: t.body || '', cell: t.cell ?? null }] });
    say('nfRemindSet', at24(when));
    return id;
  }
  async function cancelRemind(id) {
    if (LN) await LN.cancel({ notifications: [{ id }] }).catch(() => {});
    const p = load(); p.trips = p.trips.filter(x => x.id !== id); save(p);
  }
  const reminders = () => load().trips.filter(x => x.when > Date.now());

  // A tapped notification opens the app: the brief shows the planner's brief card; a trip reminder opens its spot at its hour.
  const whenReady = fn => { let n = 0; const go = () => forecastReady() ? fn() : ++n < 90 && setTimeout(go, 1000); go(); };
  function opened(a) {
    const x = a?.notification?.extra || {};
    if (x.kind === 'brief') whenReady(() => window.PsPlanner?.brief?.(true));
    if (x.kind === 'trip' && x.cell != null) whenReady(() => {
      const h = hours.findIndex(o => o.t + 36e5 > x.t);
      if (h >= 0 && typeof setHour === 'function') setHour(h);
      if (typeof openCell === 'function') openCell(+x.cell);
    });
  }

  // Long-press the app icon (MainActivity.shortcuts): psarema://today the daily brief, /log a new catch, /near Near me. A cold start
  // gets it too (@capacitor/app keeps the event until this listener is added); each waits for what it needs.
  const loaded = fn => document.readyState === 'complete' ? fn() : addEventListener('load', () => fn(), { once: true });
  const GO = { __proto__: null, today: () => whenReady(() => window.PsPlanner?.brief?.(true)), log: () => loaded(() => window.PsCatch?.log?.(-1)),
    near: () => loaded(() => typeof locateMe === 'function' && locateMe()) };
  if (App) Promise.resolve().then(() => App.addListener('appUrlOpen', e => GO[/^psarema:\/\/(\w+)/.exec(e?.url || '')?.[1]]?.())).catch(e => console.warn('shortcuts:', e));

  /* ---------- The settings sheet: Me → Settings → Notifications (phone layout, app only) ---------- */
  const CSS = `.nf-panel{padding:12px 14px;display:flex;flex-direction:column;gap:10px}.nf-panel h3{margin:0;font-size:15px}.nf-panel h4{margin:6px 0 0;font-size:12.5px;color:var(--muted);font-weight:600}
.nf-row{display:flex;gap:10px;align-items:center;justify-content:space-between;min-height:40px}.nf-row label{display:flex;gap:10px;align-items:center;font-size:13.5px}.nf-row input[type=checkbox]{accent-color:var(--accent);width:18px;height:18px;margin:0}
.nf-row input[type=time]{background:var(--raise);color:var(--ink);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:6px 8px;font:500 14px var(--sans);color-scheme:dark}
.nf-panel ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.nf-panel li{display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:12.5px}.nf-panel li small{display:block;color:var(--dim)}
.nf-warn{margin:0;padding:8px 10px;border-radius:var(--r-sm);background:rgb(255 170 0 / .12);color:var(--ink);font-size:12.5px}`;
  const esc_ = s => typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  async function panelHtml() {
    const p = load(), ok = await allowed(false), list = reminders();
    return `<div class="nf-panel"><h3>${esc_(T('notif'))}</h3>` +
      (p.brief && !ok ? `<p class="nf-warn">${esc_(T('nfDenied'))}</p>` : '') +
      `<div class="nf-row"><label><input type="checkbox" data-nf-brief${p.brief ? ' checked' : ''}><span>${esc_(T('nfBrief'))}</span></label><input type="time" data-nf-time value="${esc_(p.time)}" aria-label="${esc_(T('nfTime'))}"></div>` +
      `<p class="hint">${esc_(T('nfBriefHint'))}</p>` +
      `<h4>${esc_(T('nfTrips'))}</h4>` +
      (list.length ? `<ul>${list.map(x => `<li><span><b>${esc_(x.title)}</b><small>${esc_(T('nfAt', at24(x.when)))}</small></span><button class="btn ghost" data-nf-rm="${x.id}">${esc_(T('nfRemove'))}</button></li>`).join('')}</ul>`
        : `<p class="hint">${esc_(T('nfTripsNone'))}</p>`) +
      `<div><button class="btn" data-nf-test>${esc_(T('nfTest'))}</button></div></div>`;
  }
  async function settings() {
    if (!LN) return;
    if (!document.getElementById('nf-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'nf-css', textContent: CSS }));
    const html = await panelHtml();
    if (window.PsMobile?.showHtml && (typeof isPhone !== 'function' || isPhone())) PsMobile.showHtml(html);
    else { const box = document.querySelector('.nf-panel'); if (box) box.outerHTML = html; }
  }
  const redraw = () => { if (document.querySelector('.nf-panel')) settings(); };
  document.addEventListener('change', async e => {
    if (!e.target.closest?.('.nf-panel')) return;
    if (e.target.matches('[data-nf-brief]')) { e.target.disabled = true; await setBrief(e.target.checked, document.querySelector('.nf-panel [data-nf-time]')?.value); redraw(); }
    if (e.target.matches('[data-nf-time]') && e.target.value) { const p = load(); p.time = e.target.value; save(p); if (p.brief) { await planBrief(); say('nfOnToast', p.time); } }
  });
  document.addEventListener('click', async e => {
    const b = e.target.closest?.('.nf-panel button'); if (!b) return;
    if (b.dataset.nfRm) { await cancelRemind(+b.dataset.nfRm); redraw(); }
    if ('nfTest' in b.dataset) { // the brief as it would come, now (the planner's best trips once the forecast is in)
      b.disabled = true;
      const t = await briefText(), title = T('nfBriefTitle', fmt(t ? t.t : Date.now(), { weekday: 'long' })); // the day it is about (late in the day: tomorrow)
      await notify({ id: TRIP0 + 999, channel: 'brief', title, body: t ? t.body : T('nfBriefGeneric'), ...t ? { largeBody: t.lines } : {}, extra: { kind: 'brief' } }).catch(e => console.warn('notification:', e));
      b.disabled = false;
    }
  });

  if (LN) {
    try { LN.addListener('localNotificationActionPerformed', opened); } catch (e) { console.warn('notifications:', e); }
    // round 17 G: Notifications open from Me → Settings (js/me.js calls settings()); the ⋯ menu no longer has them
    document.addEventListener('DOMContentLoaded', () => { // a bell for that row, beside the app's other icons (assets/icons.js has none)
      const sprite = document.querySelector('svg symbol[id^="i-"]')?.parentNode;
      if (sprite && !document.getElementById('i-bell')) sprite.insertAdjacentHTML('beforeend', '<symbol id="i-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></symbol>');
    });
    // Each start: drop past reminders, and plan the brief's next 7 days again (at most every 6 h, or in a new language), once the
    // forecast is in and start-up's own work is done.
    addEventListener('load', () => setTimeout(() => {
      const p = load(); p.trips = p.trips.filter(x => x.when > Date.now()); save(p);
      if (p.brief && (Date.now() - (p.planned || 0) > 6 * 36e5 || p.lang !== lang())) whenReady(planBrief);
    }, 15e3));
  }

  return { isNative, hasGeo: !!Geo, canNotify: !!LN, canShare: !!Sh, canSaveFile: !!(Sh && Fs),
    watch, clearWatch, share, saveFile, notify, remind, cancelRemind, reminders, settings, setBrief, haptic };
})();
