'use strict';
// Psarema start-up. The big grids come as data/<name>.bin (scripts/pack-data.mjs packs them from the data/<name>.js the generators write):
// gzip of { the .js with each base64 text replaced by __psb[k], the bytes of those texts }. They are fetched in parallel from the
// <head> preloads, decoded and run here, giving exactly the globals the .js files gave. index.html's app scripts (type="ps/boot", so the
// browser does not run them as it parses) then run in order: js/core.js reads the grids as it loads.
window.PsData = (() => {
  const toB64 = u => { // the text js/core.js decodes with b64(): native in current browsers, else in 32 KB slices
    if (u.toBase64) return u.toBase64();
    let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  };
  function unpack(u) { // inflated .bin -> { js, blobs: the base64 texts }
    const n = new DataView(u.buffer, u.byteOffset).getUint32(0, true), head = JSON.parse(new TextDecoder().decode(u.subarray(4, 4 + n)));
    let p = 4 + n;
    const blobs = head.blobs.map(([codec, len, w]) => {
      let b = u.subarray(p, p += len);
      if (codec === 1) { // 16-bit grid w wide: zigzag residuals of the a + b - c predictor, low bytes then high bytes (bathy: a third of the size)
        const m = len >> 1, v = new Uint16Array(m);
        for (let i = 0; i < m; i++) {
          const r = b[i] | b[m + i] << 8, x = i % w, up = i >= w;
          v[i] = (x && up ? v[i - 1] + v[i - w] - v[i - w - 1] : x ? v[i - 1] : up ? v[i - w] : 0) + ((r >>> 1) ^ -(r & 1)); // wraps mod 2^16 like the packer
        }
        b = new Uint8Array(v.buffer);
      }
      return toB64(b);
    });
    return { js: head.js, blobs };
  }
  const script = src => new Promise(ok => document.head.append(Object.assign(document.createElement('script'), { src, onload: ok, onerror: ok })));
  function run({ js, blobs }) { // as a classic script would: the .js set its globals on window. From a blob: URL, not as inline text, so
    // index.html's Content-Security-Policy needs no 'unsafe-inline' for scripts (round 11 security)
    window.__psb = blobs;
    const u = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
    return script(u).then(() => { URL.revokeObjectURL(u); document.head.querySelector(`script[src="${u}"]`)?.remove(); delete window.__psb; });
  }
  async function get(url) {
    const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`);
    let u = new Uint8Array(await r.arrayBuffer());
    if (u[0] === 0x1f && u[1] === 0x8b) { // gzip (a server may already have inflated it)
      if (!window.DecompressionStream) return script(url.replace(/\.bin$/, '.js')); // older browsers: the generator's own .js
      u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    }
    return unpack(u);
  }
  // Each file decodes as it arrives; they run in the given order. A missing file leaves its global unset, as a missing script did (js/core.js copes).
  const load = urls => Promise.all(urls.map(u => get(u).catch(e => console.warn('data:', e.message)))).then(ps => ps.reduce((q, p) => p?.js ? q.then(() => run(p)) : q, Promise.resolve()));
  return { unpack, load };
})();

{ // index.html only (the bench pages call PsData.load themselves)
  const bins = [...document.querySelectorAll?.('link[rel=preload][href$=".bin"]') || []].map(l => l.href);
  if (bins.length && navigator.onLine !== false) { // Round 14: the two daily files the first heat map waits for (js/sources.js loadSurface,
    // loadOcean) are asked for now, while the grids decode and the app's scripts load (~1.5 s on a phone), when this device's copy is 6 h
    // old or more (sources.js's rule; each cache's JSON starts {"at":…). sources.js getJSON takes the answer. URLs and keys as in sources.js.
    window.psEarly = {};
    for (const [url, key] of [['https://giannis242.github.io/psarema-data/surface.json', 'psarema-sat-v2'], ['https://giannis242.github.io/psarema-data/ocean.json', 'psarema-ocean-v1']]) {
      let at = 0; try { at = +(/^\{"at":(\d+)/.exec((localStorage.getItem(key) || '').slice(0, 32))?.[1] || 0); } catch {}
      if (Date.now() - at >= 6 * 36e5) { const p = fetch(url); p.catch(() => {}); psEarly[url] = p; }
    }
  }
  if (bins.length) {
    performance.mark('ps-data-start');
    const data = PsData.load(bins).then(() => performance.measure('ps-data', 'ps-data-start'));
    const parsed = new Promise(ok => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ok, { once: true }) : ok());
    let tags = [];
    parsed.then(() => { // fetch the app's scripts while the data still downloads
      tags = [...document.querySelectorAll('script[type="ps/boot"]')];
      for (const t of tags) document.head.append(Object.assign(document.createElement('link'), { rel: 'preload', as: 'script', href: t.src }));
    });
    Promise.all([data, parsed]).then(() => {
      let last = null;
      for (const t of tags) document.body.append(last = Object.assign(document.createElement('script'), { src: t.src, async: false })); // in order
      const done = () => { // the scripts missed the page's DOMContentLoaded (and maybe load): send them again for the listeners they added
        performance.measure('ps-boot', 'ps-data-start');
        document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
        if (document.readyState === 'complete') dispatchEvent(new Event('load'));
        // The website keeps itself in a service worker (sw.js) for instant, offline repeat visits; not in the Android app (its files are
        // local) nor on http:// dev servers (add ?sw to test one), where a cached copy would hide edits.
        if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.() && (location.protocol === 'https:' || /[?&]sw\b/.test(location.search)))
          setTimeout(() => navigator.serviceWorker.register('sw.js').catch(e => console.warn('service worker:', e.message)), 3000);
      };
      if (last) { last.onload = last.onerror = done; } else done();
    });
  }
}
