'use strict';
// Psarema: over-the-air web updates for the Android app (@capgo/capacitor-updater, manual mode, self-hosted).
// Turn on: set UPDATE_URL to the https folder that serves manifest.json + the zip from mobile\publish-update.ps1,
// then rebuild the APK once. The host must allow CORS (GitHub Pages does). Does nothing in a browser.
// Quiet: checked at start and on coming back after 6 h; a newer version downloads in the background and is swapped in when the
// app next leaves the screen; the next time it is seen, a small toast says it was updated. A version the plugin had to roll back
// (it never became ready) is not tried again by itself, so a bad update cannot loop.
window.PSAREMA_VERSION = '2026.11.19-1'; // version of these web files; publish-update.ps1 stamps it
(() => {
  const UPDATE_URL = 'https://giannis242.github.io/psarema-updates/'; // GitHub Pages of the Giannis242/psarema-updates repo (mobile/push-update.ps1 publishes there); '' = updater off
  const DONE = { en: 'Updated', el: 'Ενημερώθηκε' }, KEY = 'psarema-upd-v1', EVERY = 6 * 36e5;

  const cap = window.Capacitor, U = cap?.isNativePlatform?.() && cap.Plugins?.CapacitorUpdater;
  if (!U) return;
  U.notifyAppReady().catch(e => console.warn('updater:', e)); // this bundle works: stops the plugin rolling it back
  const say = (k, ...a) => typeof toast === 'function' && typeof tr === 'function' && toast(tr(k, ...a));
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };
  const running = async () => { const b = (await U.current().catch(() => null))?.bundle; return b && b.id !== 'builtin' && b.version ? b.version : window.PSAREMA_VERSION; };
  const btn = document.getElementById('mb-update'), label = document.getElementById('mb-version');
  async function showVersion() { if (label) label.textContent = tr('appVersion', await running()); }
  if (btn) { // "Check for updates" (Android app only): out of sight in index.html; Me → Help and about shows a row that clicks it
    btn.hidden = false; showVersion(); new MutationObserver(showVersion).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    let busy = false;
    btn.addEventListener('click', async () => {
      if (!UPDATE_URL) { say('updOff'); return; }
      if (busy) return; busy = true; say('updChecking');
      try { if (!(await check(true))) say('updLatest'); } catch (e) { console.warn('updater:', e); say('updFailed'); }
      busy = false;
    });
  }

  const parts = v => String(v).split(/[.-]/).map(n => +n || 0); // '2026.10.24-3' -> [2026, 10, 24, 3]
  const newer = (a, b) => {
    const x = parts(a), y = parts(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  };

  // Each start: what became of the version handed to the plugin last time, and a toast when a newer one runs (over the air or a new APK).
  (async () => {
    const p = load(), v = await running(), next = (await U.getNextBundle().catch(() => null))?.version;
    if (p.trying && p.trying !== v && p.trying !== next) p.bad = p.trying; // neither running nor waiting: rolled back
    if (p.trying !== next) p.trying = null;
    if (p.seen && newer(v, p.seen)) { // when the page is on screen (a swap happens in the background), after start-up's own toasts
      const show = () => setTimeout(() => typeof toast === 'function' && toast(`${DONE[typeof state === 'object' && state.lang === 'el' ? 'el' : 'en']} · ${tr('appVersion', v)}`), 1500);
      if (document.hidden) document.addEventListener('visibilitychange', function f() { if (!document.hidden) { document.removeEventListener('visibilitychange', f); show(); } });
      else if (document.readyState === 'complete') show(); else addEventListener('load', show, { once: true });
    }
    p.seen = v; save(p);
  })().catch(e => console.warn('updater:', e));
  if (!UPDATE_URL) return;

  async function check(now) { // now: the button — install at once; else wait for the app to go to the background
    if (navigator.onLine === false) { if (now) throw new Error('offline'); return; }
    const base = UPDATE_URL.replace(/\/?$/, '/');
    const res = await fetch(base + 'manifest.json?t=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout?.(15e3) }); // the query skips GitHub Pages' 10-minute CDN cache
    if (!res.ok) throw new Error('manifest HTTP ' + res.status);
    const txt = await res.text(); if (txt.length > 4096) throw new Error('manifest too big');
    // Security (round11/SEC/REPORT.md): only a well-formed manifest, a zip on the same https folder, a SHA-256 the plugin checks the zip against,
    // and only a newer version (never a downgrade). A signature is not checked yet: whoever controls the GitHub account controls the update.
    const m = JSON.parse(txt), zip = typeof m.url === 'string' && new URL(m.url, base).href;
    if (!/^\d{4}\.\d{2}\.\d{2}-\d+$/.test(m.version) || !zip?.startsWith(base) || !/^https:/.test(zip) || !/^[0-9a-f]{64}$/.test(m.checksum)) throw new Error('manifest refused');
    if (!newer(m.version, await running()) || (m.version === load().bad && !now)) return false; // the button may retry a bad one
    const waiting = await U.getNextBundle().catch(() => null);
    if (waiting?.version === m.version && !now) return true; // already downloaded, waiting for the background
    if (now) say('updDownloading');
    const next = waiting?.version === m.version ? waiting : await fetchBundle(m, zip, base);
    save({ ...load(), trying: m.version });
    if (now) { say('updApplying'); await U.set({ id: next.id }); return true; } // switches to the new files and reloads now
    await U.next({ id: next.id }); // the plugin swaps it in when the app next goes to the background
    return true;
  }
  // Round 17 M: delta first. manifest.json may name the release's file list (files, filesSum: mobile/delta-files.mjs). The plugin (download
  // with a manifest, @capgo/capacitor-updater 6.1+) then takes each file from the app itself or its cache of earlier updates when its SHA-256
  // matches, downloads only the others and checks each one. Anything wrong (no list, a bad checksum, an odd entry, a failed download): the
  // zip, exactly as before.
  async function fetchBundle(m, zip, base) {
    try {
      if (typeof m.files !== 'string' || !/^[0-9a-f]{64}$/.test(m.filesSum) || !window.crypto?.subtle) throw new Error('no file list');
      const href = new URL(m.files, base).href; if (!href.startsWith(base)) throw new Error('file list refused');
      const res = await fetch(href, { cache: 'no-store', signal: AbortSignal.timeout?.(30e3) }); if (!res.ok) throw new Error('file list HTTP ' + res.status);
      const buf = await res.arrayBuffer(), sum = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)), b => b.toString(16).padStart(2, '0')).join('');
      if (sum !== m.filesSum) throw new Error('file list checksum');
      const L = JSON.parse(new TextDecoder().decode(buf));
      if (L.version !== m.version || !Array.isArray(L.files) || !L.files.some(e => e?.[0] === 'index.html')) throw new Error('file list refused');
      const manifest = L.files.map(([n, h]) => {
        if (typeof n !== 'string' || !/^[\w.\-/]+$/.test(n) || n.startsWith('/') || n.split('/').includes('..') || !/^[0-9a-f]{64}$/.test(h)) throw new Error('file entry refused');
        const ext = n.lastIndexOf('.') > n.lastIndexOf('/') ? n.slice(n.lastIndexOf('.')) : ''; // mobile/delta-files.mjs names them the same way
        return { file_name: n, file_hash: h, download_url: base + 'files/' + h + ext };
      });
      return await U.download({ url: zip, version: m.version, manifest });
    } catch (e) { console.warn('updater: file by file failed, the zip instead:', e?.message || e); }
    return U.download({ url: zip, version: m.version, checksum: m.checksum });
  }
  let last = 0;
  const tick = () => { if (Date.now() - last < EVERY) return; last = Date.now(); check().catch(e => console.warn('updater:', e)); };
  setTimeout(tick, 15e3); // after the first heat map (~5 s on a budget phone): a new update then downloads and unzips while the map is in use, not while it is drawn (round 16 speed, scripts/perf/native.md)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); }); // an app left open for days still updates
})();
