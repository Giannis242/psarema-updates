'use strict';
// Psarema accounts (round 11): sign-in and sync with the owner's Supabase project (js/auth-config.js; round11/accounts/SETUP.md and
// supabase.sql). No SDK: Supabase Auth (GoTrue) and PostgREST over fetch. Every redirect (an email link, Google) uses PKCE, so the code a
// link carries is useless to anyone but this app on this device. The screens are js/account.js; the Me page's rows js/me.js.
// Session: localStorage 'psarema-auth-v1' { access_token, refresh_token, expires_at (s), user: { id, email } }: the browser's / WebView's
// private storage of this app (Android: the app's own sandbox; not the Keystore, which no installed plugin offers). Refreshed a minute
// before it expires; offline the app stays signed in with the last session; dropped only when the server says it is dead.
// Sync: one table (items: kind 'catch' | 'place' | 'profile', id, data, mtime, deleted) and a private photo bucket, two-way and
// offline-first. A local change is noticed when it happens (ps:catches, ps:places, ps:account, and a scan at each sync), stamped with the
// time and pushed; the rows changed on the server since the last pull are applied unless this phone's copy is newer (last write wins per
// record; a deletion is a row with deleted = true, a tombstone). Sync never drops local data: a record from the cloud is applied only once
// its photo is down, and nothing is uploaded from a phone that had data before signing in until the user says so (status().ask).
// Round 15: "Share catches for science" (js/catchlog.js PsShare), a separate, opt-in upload into scripts/catches/share.sql's insert-only table.
//   PsCloud = { on, google, user(), status(), signUp, signIn, sendLink, verify, oauth, signOut, deleteAccount, sync, answer, exportData, share, shareDelete }
//   document fires 'ps:cloud' (detail: status()) after any change.
const PsCloud = window.PsCloud = (() => {
  const C = window.PSAREMA_AUTH || {}, base = String(C.url || '').trim().replace(/\/+$/, ''), key = String(C.anonKey || '').trim();
  const KEY = 'psarema-auth-v1', PK = 'psarema-pkce-v1', SK = 'psarema-sync-v1:', BUCKET = 'photos';
  const role = k => { try { return JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { return ''; } };
  const secret = /^sb_secret_/.test(key) || role(key) === 'service_role';
  if (secret) console.error('js/auth-config.js holds a SECRET key: accounts are off. Use the anon / publishable key, and replace the leaked key in Supabase.');
  const on = !!(base && key && !secret && /^https:\/\/[\w.-]+(:\d+)?$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base));
  const native = !!window.Capacitor?.isNativePlatform?.(), App = native && window.Capacitor.Plugins?.App;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const json = s => { try { return JSON.parse(s); } catch { return null; } };
  let ses = on ? json(ls.get(KEY)) : null;
  if (!ses?.refresh_token || !ses.user?.id) ses = null;
  let S = null, sUid = '', busy = null, again = false, err = '', applying = false, refreshing = null, rT = 0, lastCode = '';
  const status = () => ({ on, user: ses?.user || null, busy: !!busy, at: S?.at || 0, err, pending: S ? Object.values(S.k).filter(o => o.dirty).length : 0, ask: !!S?.ask, local: S?.ask ? counts() : null });
  const fire = () => document.dispatchEvent(new CustomEvent('ps:cloud', { detail: status() }));

  /* ---------- HTTP: errors carry { code (GoTrue error_code, or 'offline' / 'network'), status } ---------- */
  async function call(path, { method = 'GET', body, token, headers = {}, raw } = {}) {
    const blob = body instanceof Blob; let r;
    try {
      r = await fetch(base + path, { method, body: body === undefined ? undefined : blob ? body : JSON.stringify(body), signal: AbortSignal.timeout?.(30e3),
        headers: { apikey: key, ...token && { Authorization: 'Bearer ' + token }, ...body !== undefined && !blob && { 'Content-Type': 'application/json' }, ...headers } });
    } catch { throw Object.assign(new Error('no connection'), { code: navigator.onLine === false ? 'offline' : 'network' }); }
    if (raw && r.ok) return r;
    const t = await r.text().catch(() => ''), j = json(t);
    if (!r.ok) throw Object.assign(new Error(j?.msg || j?.message || j?.error_description || t.slice(0, 200) || r.statusText),
      { code: j?.error_code || (typeof j?.code === 'string' ? j.code : '') || j?.error || '', status: r.status });
    return j;
  }
  const enc = encodeURIComponent;

  /* ---------- Auth ---------- */
  const b64u = a => btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  async function pkce() { // a new verifier kept on this device; the server gets only its SHA-256
    const v = b64u(crypto.getRandomValues(new Uint8Array(48)));
    ls.set(PK, v);
    return { code_challenge: b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))), code_challenge_method: 's256' };
  }
  const back = () => native ? 'psarema://auth' : location.origin + location.pathname; // where email links and Google come back to (SETUP.md: redirect URLs)
  function keep(s) {
    ses = s; ls.set(KEY, s ? JSON.stringify(s) : null);
    clearTimeout(rT); if (s) rT = setTimeout(token, Math.max(5e3, (s.expires_at - 60) * 1e3 - Date.now())); // refreshed a minute early while the app runs
    if (!s) { S = null; sUid = ''; } else if (sUid !== s.user.id) { S = load(s.user.id); sUid = s.user.id; } // a refresh keeps the sync state in hand
    fire();
  }
  const take = j => keep({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1e3) + (j.expires_in || 3600), user: { id: j.user.id, email: j.user.email } });
  function token() { // a fresh access token; null when signed out, or offline with an expired one (the session stays)
    if (!ses) return Promise.resolve(null);
    const other = json(ls.get(KEY)); if (other?.refresh_token && other.user?.id === ses.user.id && other.refresh_token !== ses.refresh_token) ses = other; // another tab refreshed it (a rotated refresh token)
    if (ses.expires_at - 60 > Date.now() / 1e3) return Promise.resolve(ses.access_token);
    return refreshing ||= call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: ses.refresh_token } })
      .then(j => { take(j); return j.access_token; }, e => { if (e.status === 400 || e.status === 401 || e.status === 403) ended(); return null; })
      .finally(() => { refreshing = null; });
  }
  function ended() { keep(null); typeof toast === 'function' && toast(tr('cl_ended')); } // the refresh token was revoked or expired: signed out here
  async function authed(fn) { // fn(token); a 401 (the server ended the token early: a clock off, a revoked session) refreshes once and tries again
    const t = await token(); if (!t) throw Object.assign(new Error('no session'), { code: !ses ? 'auth' : navigator.onLine === false ? 'offline' : 'network' });
    try { return await fn(t); } catch (e) {
      if (e.status !== 401 || !ses) throw e;
      ses.expires_at = 0; const t2 = await token(); if (!t2) throw Object.assign(e, { code: ses ? 'network' : 'auth' });
      return fn(t2);
    }
  }
  async function signUp(email, password) {
    const j = await call('/auth/v1/signup?redirect_to=' + enc(back()), { method: 'POST', body: { email, password, ...await pkce() } });
    if (j?.access_token) { take(j); return started(); } // email confirmations off in Supabase: signed in at once
    return 'confirm';
  }
  async function signIn(email, password) { take(await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })); return started(); }
  async function sendLink(email) { await call('/auth/v1/otp?redirect_to=' + enc(back()), { method: 'POST', body: { email, create_user: false, ...await pkce() } }); }
  // the code from the email, typed in (type 'email' takes a new account's confirmation code and a sign-in link's code alike)
  async function verify(email, code) { take(await call('/auth/v1/verify', { method: 'POST', body: { email, token: code, type: 'email' } })); return started(); }
  async function oauth() { // the system browser (a WebView may not show Google's sign-in), back through psarema://auth in the app
    const q = new URLSearchParams({ provider: 'google', redirect_to: back(), ...await pkce() });
    location.assign(base + '/auth/v1/authorize?' + q);
  }
  async function exchange(code) { // a link or Google came back with ?code=: worth something only with this device's verifier
    const v = ls.get(PK); if (!v) throw Object.assign(new Error('no verifier'), { code: 'other_device' });
    const j = await call('/auth/v1/token?grant_type=pkce', { method: 'POST', body: { auth_code: code, code_verifier: v } });
    ls.set(PK, null); take(j); return started();
  }
  async function signOut() {
    if (!ses) return;
    await sync().catch(() => {}); // what is waiting goes up first (offline: it stays marked on this phone for the next sign-in)
    const t = ses.expires_at > Date.now() / 1e3 ? ses.access_token : null;
    if (t) call('/auth/v1/logout?scope=local', { method: 'POST', token: t }).catch(() => {}); // the refresh token revoked on the server
    keep(null);
  }
  // Delete the account: its photos first (the database cannot delete Storage files itself), then the account with all its rows
  // (supabase.sql delete_my_account; items go with the user). Throws offline; nothing is deleted on this phone here.
  const deleteAccount = () => authed(async t => {
    const uid = ses.user.id;
    for (let k = 0; k < 20; k++) {
      const list = await call('/storage/v1/object/list/' + BUCKET, { method: 'POST', token: t, body: { prefix: uid, limit: 1000, offset: 0 } });
      if (!list?.length) break;
      await call('/storage/v1/object/' + BUCKET, { method: 'DELETE', token: t, body: { prefixes: list.map(o => `${uid}/${o.name}`) } });
    }
    await call('/rest/v1/rpc/delete_my_account', { method: 'POST', token: t, body: {} });
    window.PsShare?.forget?.(); // the shared catches went with the account (on delete cascade)
    ls.set(SK + uid, null); keep(null);
  });

  /* ---------- What is synced: the catch log (js/catchlog.js), saved places (js/pins.js), the profile (js/account.js) ---------- */
  // list() → the local records, or null while they are not loaded (never read as "all deleted"); data(e) → what goes up (photo: the
  // photo's byte size, its version mark, 0 = none); apply(put, gone) → the owner module stores records from the cloud and fires its event.
  const SRC = {
    catch: { list: () => window.PsCatchLog?.ready?.() ? window.PsCatch?.entries?.() || [] : null, blob: e => e.photo || null,
      data: e => ({ t: e.t, sp: e.sp, mode: e.mode, lat: e.lat, lon: e.lon, n: e.n, note: e.note || '', cm: e.cm ?? null, kg: e.kg ?? null, bait: e.bait ?? null,
        released: e.released ?? null, hours: e.hours ?? null, snap: e.snap || {}, photo: e.photo?.size || 0, ...e.seen && { seen: true }, ...e.acc != null && { acc: e.acc } }), // seen, acc (round 18): only when set, so older records keep their hash
      can: () => typeof window.PsCatch?.merge === 'function', apply: (put, gone) => PsCatch.merge(put, gone) },
    place: { list: () => (json(ls.get('psarema-places')) || []).filter(p => p && typeof p.id === 'string'), blob: () => null, // read-only: js/pins.js owns it
      // round 18 A: a marked spot's fields only when set, so older places keep their hash (js/pins.js checks them coming back)
      data: p => ({ name: p.name || '', lat: p.lat, lon: p.lon, t: p.t ?? null, a: p.a ?? null, n: p.n ?? null, ...p.fish?.length && { fish: p.fish, months: p.months, method: p.method, q: p.q, note: p.note || '' } }),
      can: () => typeof window.PsPins?.merge === 'function', apply: (put, gone) => PsPins.merge(put, gone) },
    profile: { list: () => { const A = window.PsAccount; if (!A?.raw) return null; const p = A.raw(); return p === undefined ? null : p ? [{ ...p, id: 'me' }] : []; },
      blob: () => window.PsAccount.photoBlob(), data: ({ id, ...p }) => p,
      can: () => !!window.PsAccount?.apply, apply: (put, gone) => PsAccount.apply(put[0] || null, gone.length > 0) },
  };
  const hash = o => { let h = 2166136261; for (const c of JSON.stringify(o)) h = Math.imul(h ^ c.codePointAt(0), 16777619); return (h >>> 0).toString(36); };
  const objName = (uid, kind, id) => `${uid}/${kind}-${id}`;
  function counts() { const c = SRC.catch.list() || [], p = SRC.place.list(); return { catches: c.length, places: p.length }; }
  // S (localStorage, per account): { cur: the last pull's newest updated_at, at: last sync (ms), ask: 1 while waiting for "add this phone's
  // data?", k: { 'kind:id': { m: mtime, h: hash of the local copy, ph: the photo size in the bucket, del: 1 deleted, dirty: 1 to push } } }
  function load(uid) { const s = json(ls.get(SK + uid)); return s?.k ? s : { cur: '', at: 0, k: {}, fresh: 1 }; }
  const save = () => { if (S && ses) ls.set(SK + ses.user.id, JSON.stringify(S)); };
  async function started() { // just signed in: a phone that already has catches or places asks before they go into the account
    for (let k = 0; k < 50 && !window.PsCatchLog?.ready?.(); k++) await new Promise(ok => setTimeout(ok, 100));
    if (S.fresh) { delete S.fresh; const n = counts(); if (n.catches + n.places) S.ask = 1; save(); }
    ls.set('psarema-welcome-v1', 'in'); fire();
    if (!S.ask) sync();
    return 'in';
  }
  function answer(yes) { if (!S) return; if (yes) { delete S.ask; save(); sync(); } fire(); } // "Not now" keeps sync off on this phone (Me offers it again)

  function scan() { // local changes since the last look: stamped now (later than anything known for them), marked to push
    if (!S || S.ask || applying) return 0;
    const now = Date.now(); let n = 0;
    for (const kind in SRC) {
      const s = SRC[kind], L = s.list(); if (!L) continue;
      const seen = new Set();
      for (const e of L) {
        const k = kind + ':' + e.id, h = hash(s.data(e)), o = S.k[k]; seen.add(k);
        if (!o || o.h !== h || o.del) { S.k[k] = { ...o, m: Math.max(now, (o?.m || 0) + 1), h, dirty: 1, del: 0 }; n++; }
      }
      for (const k in S.k) if (k.startsWith(kind + ':') && !seen.has(k) && !S.k[k].del) { S.k[k] = { ...S.k[k], m: Math.max(now, S.k[k].m + 1), h: '', del: 1, dirty: 1 }; n++; }
    }
    if (n) save();
    return n;
  }
  const index = kind => new Map((SRC[kind].list() || []).map(e => [kind + ':' + e.id, e]));
  async function push(t) {
    const uid = ses.user.id, todo = Object.entries(S.k).filter(([, o]) => o.dirty); if (!todo.length) return;
    const idx = { catch: index('catch'), place: index('place'), profile: index('profile') }, rows = [], after = [];
    for (const [k, o] of todo) {
      const [kind, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)], e = idx[kind]?.get(k), d = e && !o.del ? SRC[kind].data(e) : null;
      if (d?.photo && d.photo !== o.ph) { // the photo first, so a row never points at a missing one
        const b = SRC[kind].blob(e);
        if (b) { await call(`/storage/v1/object/${BUCKET}/${objName(uid, kind, id)}`, { method: 'POST', token: t, body: b, headers: { 'Content-Type': b.type || 'image/jpeg', 'x-upsert': 'true' } }); o.ph = d.photo; }
      }
      if (!d?.photo && o.ph) after.push([k, objName(uid, kind, id)]);
      rows.push([k, o.m, { user_id: uid, kind, id, data: d || {}, mtime: o.m, deleted: !d }]);
    }
    const sent = async part => {
      await call('/rest/v1/items?on_conflict=user_id,kind,id', { method: 'POST', token: t, body: part.map(r => r[2]), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
      for (const [k, m] of part) if (S.k[k]?.m === m) delete S.k[k].dirty; // not if it changed again meanwhile
    };
    for (let i = 0; i < rows.length; i += 50) {
      const part = rows.slice(i, i + 50);
      try { await sent(part); }
      catch (e) { // one bad row must not block the rest: one by one, and a row the server refuses for good stays on this phone only
        if (!(e.status >= 400 && e.status < 500) || e.status === 401) throw e;
        for (const r of part) try { await sent([r]); } catch (e2) { if (!(e2.status >= 400 && e2.status < 500) || e2.status === 401) throw e2; console.warn('Sync refused', r[0], e2.message); if (S.k[r[0]]) { delete S.k[r[0]].dirty; S.k[r[0]].bad = 1; } }
      }
      save();
    }
    if (after.length) { // photos no longer used (a catch deleted, or its photo removed)
      await call('/storage/v1/object/' + BUCKET, { method: 'DELETE', token: t, body: { prefixes: after.map(a => a[1]) } });
      for (const [k] of after) if (S.k[k]) S.k[k].ph = 0;
      save();
    }
  }
  async function photo(t, kind, id, size, local) { // the record's photo as a Blob: this phone's copy when it is the same, else from the bucket
    const b = local && SRC[kind].blob(local);
    if (b?.size === size) return b;
    const r = await call(`/storage/v1/object/${BUCKET}/${objName(ses.user.id, kind, id)}`, { token: t, raw: true }).catch(e => { if (e.status === 400 || e.status === 404) return null; throw e; });
    return r ? r.blob() : null; // gone from the bucket (replaced meanwhile): the record without it; the next change brings it
  }
  async function pull(t) {
    const since = S.cur ? new Date(Date.parse(S.cur) - 60e3).toISOString() : '1970-01-01T00:00:00Z'; // a minute back: a slow write is not missed
    let cur = S.cur, held = false;
    for (let off = 0; off < 1e5; off += 500) {
      const rows = await call(`/rest/v1/items?select=kind,id,data,mtime,deleted,updated_at&updated_at=gt.${enc(since)}&order=updated_at.asc,kind.asc,id.asc&limit=500&offset=${off}`, { token: t });
      const newer = rows.filter(r => SRC[r.kind] && !(S.k[r.kind + ':' + r.id]?.m >= r.mtime));
      for (const kind in SRC) {
        const mine = newer.filter(r => r.kind === kind); if (!mine.length) continue;
        if (!SRC[kind].can()) { held = true; continue; } // the module cannot take records yet (an older file): pulled again next time
        const idx = index(kind), put = [], gone = [];
        for (const r of mine) {
          const k = kind + ':' + r.id;
          if (r.deleted) { gone.push(r.id); continue; }
          put.push({ ...r.data, id: r.id, photo: r.data?.photo ? await photo(t, kind, r.id, r.data.photo, idx.get(k)) : null });
        }
        applying = true;
        try { await SRC[kind].apply(put, gone); } finally { applying = false; }
        const now = index(kind);
        for (const r of mine) { // what this phone now holds for each: its own hash, so the next scan sees no change
          const k = kind + ':' + r.id, e = now.get(k);
          S.k[k] = e ? { m: r.mtime, h: hash(SRC[kind].data(e)), ph: r.data?.photo || 0 } : { m: r.mtime, h: '', del: 1, ph: 0 }; // refused here: kept in the cloud, not deleted
        }
      }
      if (!held && rows.length) cur = rows[rows.length - 1].updated_at;
      if (rows.length < 500) break;
    }
    S.cur = cur; save();
  }
  /* ---------- Round 15: Share catches for science (js/catchlog.js PsShare; scripts/catches/share.sql) ---------- */
  // Only when the owner switched it on (auth-config share: true), the angler is signed in and their own switch is on. One insert per due
  // entry (7 days after the catch; coarse by construction, PsShare.shared), never a read; then the shared entries whose catch was deleted
  // are deleted on the server too. The server answers 425 (too early by its clock) or 429 (its daily limits): kept, tried at the next sync.
  const shareOn = on && C.share === true;
  let sharing = null;
  async function shareUp(t) {
    const P = window.PsShare;
    for (const { id, row } of P.due()) {
      try { await call('/rest/v1/shared_catches', { method: 'POST', token: t, body: row, headers: { Prefer: 'return=minimal' } }); P.sent([id]); }
      catch (e) {
        const later = x => !(x.status >= 400 && x.status < 500) || [401, 425, 429].includes(x.status); // offline, the session, not yet, too many: next time
        if (later(e)) throw e;
        if (row.exact_lat != null) { // round 18 A: a server without the exact-place columns yet (share.sql before round 18): the coarse row, as before
          const { exact_lat, exact_lon, exact_acc_m, ...coarse } = row;
          try { await call('/rest/v1/shared_catches', { method: 'POST', token: t, body: coarse, headers: { Prefer: 'return=minimal' } }); P.sent([id]); console.warn('Shared catch sent without its exact position', e.status, e.message); continue; }
          catch (e2) { if (later(e2)) throw e2; }
        }
        console.warn('Shared catch refused', e.status, e.message); P.sent([id], true); // refused for good (a check failed): never tried again
      }
    }
    const gone = P.gone();
    if (gone.length) { await call('/rest/v1/rpc/delete_my_shared', { method: 'POST', token: t, body: { sids: gone } }); P.forget(gone); }
  }
  function share() { // runs with every sync (its own consent, its own table: also while the account sync waits for "add this phone's data?")
    if (!shareOn || !ses || !window.PsShare?.gone) return Promise.resolve();
    return sharing ||= authed(shareUp).catch(e => { if (![425, 429].includes(e.status) && e.code !== 'offline' && e.code !== 'network') console.warn('Share:', e.status || '', e.message); })
      .finally(() => { sharing = null; });
  }
  // "Delete my shared catches": every row this account shared (delete_my_shared with no list); throws offline, nothing forgotten then
  const shareDelete = () => authed(t => call('/rest/v1/rpc/delete_my_shared', { method: 'POST', token: t, body: {} })).then(() => window.PsShare?.forget?.());

  function sync() { // push what changed here, then pull what changed elsewhere; one at a time, another round if something changed meanwhile
    share();
    if (!on || !ses || !S || S.ask) return Promise.resolve(false);
    if (busy) { again = true; return busy; }
    busy = (async () => {
      try {
        const first = !S.at; // this phone's first sync with the account: the account's copies first (its profile wins over a guest's), then this phone's
        await authed(async t => { if (first) await pull(t); scan(); await push(t); await pull(t); });
        if (!S) return false; // signed out meanwhile (the session ended)
        S.at = Date.now(); err = ''; save(); return true;
      } catch (e) {
        err = e.code === 'offline' || e.code === 'network' ? 'offline' : e.status === 401 || e.code === 'auth' ? 'auth' : 'server';
        if (err === 'server') console.warn('Sync:', e.status || '', e.message);
        return false;
      } finally { busy = null; fire(); if (again) { again = false; setTimeout(sync, 800); } }
    })();
    fire(); return busy;
  }
  addEventListener('popstate', e => window.PsAuthBack?.(e), true); // the sign-in screen's Back (js/account.js): this file loads before js/mobile.js, whose listener must come later
  let soon = 0;
  const changed = () => { if (!ses || applying) return; if (scan()) fire(); clearTimeout(soon); soon = setTimeout(sync, 2500); }; // stamped now, sent a moment later
  for (const ev of ['ps:catches', 'ps:places', 'ps:account']) document.addEventListener(ev, changed);

  /* ---------- Export: everything this account holds on this phone, one JSON file (the catches part is the catch log's import format) ---------- */
  const dataUrl = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(b); });
  async function exportData() {
    await sync();
    const catches = await Promise.all((SRC.catch.list() || []).map(async e => ({ ...e, thumb: undefined, photo: e.photo ? await dataUrl(e.photo) : null })));
    const prof = SRC.profile.list()?.[0], pb = prof && SRC.profile.blob();
    const out = { app: 'psarema-catches', v: 2, at: Date.now(), account: ses ? { id: ses.user.id, email: ses.user.email } : null,
      profile: prof ? { ...SRC.profile.data(prof), photo: pb ? await dataUrl(pb) : null } : null, places: SRC.place.list(), catches };
    const name = `psarema-my-data-${new Date().toISOString().slice(0, 10)}.json`, text = JSON.stringify(out);
    if (await window.PsNative?.saveFile?.(name, text, 'application/json')) return;
    const a = Object.assign(document.createElement('a'), { download: name, href: URL.createObjectURL(new Blob([text], { type: 'application/json' })) });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3e4);
  }

  /* ---------- Coming back from an email link or Google; staying in step ---------- */
  let back0 = null; // the last return, for js/account.js to show: { r: 'pending' } while it is exchanged, then { r: 'in' | an error } (a new object each time)
  async function arrived(url) {
    const u = new URL(url), q = new URLSearchParams(u.search + '&' + u.hash.slice(1)), code = q.get('code'), bad = q.get('error_code') || q.get('error');
    if (!code && !bad || code && code === lastCode) return; // the same link twice (the app's start and its event): once
    lastCode = code || '';
    if (!native) history.replaceState(history.state, '', location.pathname); // the code leaves the address bar
    if (ses && !ls.get(PK)) return; // signed in, nothing asked for: an old or foreign link, ignored
    back0 = { r: 'pending' };
    try {
      if (bad) throw Object.assign(new Error(q.get('error_description') || bad), { code: q.get('error_code') || bad });
      back0 = { r: await exchange(code) };
    } catch (e) { back0 = { r: e }; }
    document.dispatchEvent(new CustomEvent('ps:cloud-back', { detail: back0 }));
  }
  if (on) {
    if (!native && /[?&#](code|error)=/.test(location.href)) arrived(location.href);
    if (App) Promise.resolve().then(async () => {
      App.addListener('appUrlOpen', e => /^psarema:\/\/auth/.test(e?.url || '') && arrived(e.url));
      const l = await App.getLaunchUrl?.().catch(() => null); if (/^psarema:\/\/auth/.test(l?.url || '') && ls.get(PK)) arrived(l.url); // a cold start from the link
      App.addListener('resume', () => { if (Date.now() - (S?.at || 0) > 6e4) sync(); });
    }).catch(e => console.warn('auth links:', e));
    addEventListener('online', () => sync());
    let shareT = 0; document.addEventListener('ps:share', () => { clearTimeout(shareT); shareT = setTimeout(share, 1500); }); // round 15: the switch, a catch added to the queue
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (S?.at || 0) > 6e4) sync(); });
    setInterval(() => { if (!document.hidden && ses) sync(); }, 5 * 6e4);
    addEventListener('storage', e => { if (e.key === KEY) { const s = json(e.newValue); if (!s) { ses = null; S = null; fire(); } else if (s.user?.id === ses?.user.id) ses = s; } }); // signed out in another tab
    if (ses) { keep(ses); addEventListener('load', () => setTimeout(sync, 4e3), { once: true }); } // after start-up's own work
  }

  // iPhone: no "Continue with Google" until Sign in with Apple sits next to it (App Store guideline 4.8; round 14 store); email works there
  return { on, google: on && !!C.google && window.Capacitor?.getPlatform?.() !== 'ios', user: () => ses?.user || null, status, signUp, signIn, sendLink, verify, oauth, signOut, deleteAccount, sync, answer, exportData,
    share, shareDelete, returned: () => back0, _scan: scan };
})();
