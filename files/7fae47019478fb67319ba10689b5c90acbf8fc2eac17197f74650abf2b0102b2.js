'use strict';
// Psarema: open fish sightings, live: what divers and naturalists saw and shared under an open licence. Sightings, never catches.
// Used by the Feed (js/feed.js), the map pins (js/pins.js) and the species pages.
//   PsRecords.query({ bounds?: L.LatLngBounds, near?: [lat, lon, km], sp?: id, days?, photos? }) → Promise<[record]>, newest first, of what is
//     loaded. The first call loads: the saved copy (under 6 h old), else the APIs, else (offline, failing) data/sightings.js. With sp it also
//     fetches that fish's newest iNaturalist sightings, once per saved copy.
//   more() → Promise<boolean> the next page of the source furthest behind (false: nothing more or it failed); refresh() reloads from the APIs;
//   front() → ms: every source is loaded down to this time, so a later page only adds older records (the feed shows down to it);
//   get(id) → the record or null; info() → { src: 'live'|'cache'|'static', at, err, busy, end }.
//   record: { id, sp (app fish id or null), sci, name (English common name, else scientific), lat, lon, t (ms), photo?, thumb?, by, lic,
//             plic? (the photo's licence when not the record's), url, src: 'inat'|'gbif'|'static', ds? (GBIF dataset), mo? (static: month, 0 unknown) }
//   document fires 'ps:records' { detail: { n } } when new records arrive.
// Sources (free, keyless, Access-Control-Allow-Origin * for any Origin, so the app's https://localhost too; checked from http://localhost:8417):
//   iNaturalist API v2 /observations: the v1 search has no field list (50 observations = 4.1 MB), v2 with `fields` sends ~0.8 KB each.
//     Research grade, observation AND photo licence CC0 / CC BY / CC BY-NC, open coordinates only (threatened fish such as the dusky grouper are
//     obscured by iNaturalist, so they never come), not captive, accuracy ≤ 1 km or unknown, newest observed first. The box is the app grid
//     (iNaturalist place 10289 "Cyprus" stops at the shore; the box also takes boat and offshore records); the north and inland are dropped here.
//   GBIF /occurrence/search: human observations since 2015, same licences, from every dataset except iNaturalist's own copy (that comes direct).
//     GBIF cannot sort by date, so it is read a whole year at a time, newest year first. Its backbone has no class over most fish orders, so the
//     taxa are the Catalogue of Life ones (checklistKey): ray-finned fishes 8VR36, sharks and rays LB, cephalopods 7NF3H.
// ≤ 1 request a second to each API. Cached in localStorage (one key, ~0.3 KB a record) for 6 h; refresh() or a stale copy reloads page 1.
const PsRecords = window.PsRecords = (() => {
  const KEY = 'psarema-rec-v1', AGE = 6 * 3600e3, PER = 100, Y0 = 2015;
  const LIC_Q = 'cc0,cc-by,cc-by-nc';
  const INAT = 'https://api.inaturalist.org/v2/observations?swlat=34.225&swlng=31.875&nelat=35.875&nelng=34.875&quality_grade=research' +
    `&license=${LIC_Q}&photo_license=${LIC_Q}&geoprivacy=open&taxon_geoprivacy=open&captive=false&acc_below_or_unknown=1000&order_by=observed_on&order=desc` +
    '&locale=en&fields=(id:!t,observed_on:!t,time_observed_at:!t,license_code:!t,location:!t,obscured:!t,positional_accuracy:!t,' +
    'taxon:(name:!t,preferred_common_name:!t),photos:(url:!t,license_code:!t),user:(login:!t,name:!t))';
  const FISH = '&taxon_id=47178,47273,47459'; // iNaturalist: ray-finned fishes, sharks and rays, cephalopods (the app has squid, cuttlefish, octopus)
  const GBIF = 'https://api.gbif.org/v1/occurrence/search?decimalLatitude=34.225,35.875&decimalLongitude=31.875,34.875&hasCoordinate=true' +
    '&hasGeospatialIssue=false&occurrenceStatus=PRESENT&basisOfRecord=HUMAN_OBSERVATION&license=CC0_1_0&license=CC_BY_4_0&license=CC_BY_NC_4_0' +
    '&checklistKey=7ddf754f-d193-4cc9-b351-99906754a03b&taxonKey=8VR36&taxonKey=LB&taxonKey=7NF3H';
  const INAT_DS = '50c9509d-22c7-4a22-a47d-8c48425ef4a7'; // iNaturalist research-grade observations, as GBIF republishes them

  /* ---------- The app's fish by scientific name ---------- */
  // "Sphyraena spp. (S. sphyraena, …)", "Mugil cephalus, Chelon spp.": binomials map to the fish, "Genus spp." the whole genus.
  // ask: the name(s) a per-fish iNaturalist query uses (taxon_name takes one name: a genus when the fish is several of one genus).
  const SYN = { Liza: 'Chelon', 'Oblada melanurus': 'Oblada melanura' }; // the current names where the app's list keeps an older one
  const bin = new Map(), gen = new Map(), ask = {};
  for (const s of SPECIES) {
    let g = ''; const by = {};
    for (const [, a, b] of (s.scientific || '').matchAll(/([A-Z][a-z]+|[A-Z]\.)\s+([a-z]+\.?)/g)) {
      if (a.length > 2) g = a;
      (by[g] ||= []).push(b);
      if (b === 'spp.') gen.set(g, s.id); else bin.set(`${g} ${b}`, s.id);
    }
    ask[s.id] = Object.entries(by).map(([g, bs]) => bs.length > 1 || bs[0] === 'spp.' ? g : `${g} ${bs[0]}`);
  }
  const spOf = sci => { const [g0, e] = sci.split(' '), g = SYN[g0] || g0, b = SYN[`${g} ${e}`] || `${g} ${e}`; return bin.get(b) ?? gen.get(g) ?? null; };

  // On a sea cell of the app grid or next to one (~250 m: photos from the shore), and not in the north: drops reservoirs, rivers, inland towns.
  const atSea = (la, lo) => {
    const i = idxAt(la, lo); if (i < 0 || northMask[i]) return false;
    for (let dy = -W; dy <= W; dy += W) for (let dx = -1; dx <= 1; dx++) if (depth[i + dy + dx] > 0) return true;
    return false;
  };
  // A licence code, URL or name → 'cc0' | 'cc-by' | 'cc-by-nc', else '' (ND, SA, all rights reserved, unknown: never shown)
  const licOf = s => {
    s = String(s || '').toLowerCase().replace(/[\s_]+/g, '-');
    if (/zero|cc0/.test(s)) return 'cc0';
    const m = /(?:licenses\/|cc-)(by(?:-nc|-nd|-sa)*)(?![a-z])/.exec(s);
    return m && (m[1] === 'by' || m[1] === 'by-nc') ? 'cc-' + m[1] : '';
  };
  const two = s => String(s || '').split(' ').slice(0, 2).join(' '); // species level ("Diplodus sargus sargus" → "Diplodus sargus")

  function fromInat(o) {
    const [la, lo] = String(o.location).split(',').map(Number), lic = licOf(o.license_code), sci = two(o.taxon?.name), t = Date.parse(o.time_observed_at || o.observed_on);
    if (!sci.includes(' ') || o.obscured || !lic || !t || o.positional_accuracy > 1000 || !atSea(la, lo)) return null;
    const p = o.photos?.find(p => licOf(p.license_code)), u = p?.url || '', pl = p && licOf(p.license_code);
    return { id: 'inat:' + o.id, sp: spOf(sci), sci, name: o.taxon.preferred_common_name || sci, lat: la, lon: lo, t,
      ...u && { photo: u.replace('/square.', '/medium.'), thumb: u.replace('/square.', '/small.') }, ...pl && pl !== lic && { plic: pl },
      by: o.user?.name || o.user?.login || '', lic, url: 'https://www.inaturalist.org/observations/' + o.id, src: 'inat' };
  }
  function fromGbif(o) {
    const la = o.decimalLatitude, lo = o.decimalLongitude, lic = licOf(o.license), sci = two(o.species), t = Date.parse(String(o.eventDate).split('/')[0]);
    if (!sci.includes(' ') || !lic || !t || o.coordinateUncertaintyInMeters > 1000 || !atSea(la, lo)) return null;
    const m = o.media?.find(m => m.type === 'StillImage' && /^https?:\/\//.test(m.identifier) && licOf(m.license)), pl = m && licOf(m.license);
    const ph = m?.identifier.replace(/^http:/, 'https:'); // the app's WebView blocks plain http
    return { id: 'gbif:' + o.key, sp: spOf(sci), sci, name: o.vernacularName || sci, lat: la, lon: lo, t, ...ph && { photo: ph, thumb: ph },
      ...pl && pl !== lic && { plic: pl }, by: o.recordedBy || o.rightsHolder || '', ds: o.datasetName || '', lic, url: 'https://www.gbif.org/occurrence/' + o.key, src: 'gbif' };
  }
  function statics() { // data/sightings.js: the same open sources cleaned and snapped to the sea when the app was built; a year and month, no photos
    const m = new Map(), L = { cc0: 'cc0', by: 'cc-by', 'by-nc': 'cc-by-nc' };
    for (const [sp, rows] of Object.entries(SIGHT)) {
      const s = byId(sp); if (!s) continue;
      rows.forEach(([la, lo, y, l, mo], n) => m.set('st-' + sp + n, { id: 'st-' + sp + n, sp, sci: s.scientific, name: s.name, lat: la, lon: lo,
        t: Date.UTC(y, Math.max(mo, 1) - 1, 15), mo, by: '', lic: L[l] || '', url: '', src: 'static' }));
    }
    return m;
  }

  /* ---------- Network: ≤ 1 request a second to each host ---------- */
  const slot = {};
  async function get(url) {
    const h = url.slice(8, url.indexOf('/', 8)), at = Math.max(Date.now(), slot[h] || 0);
    slot[h] = at + 1000;
    if (at > Date.now()) await new Promise(r => setTimeout(r, at - Date.now()));
    if (navigator.onLine === false) throw new Error('offline');
    const r = await fetch(url, { signal: AbortSignal.timeout?.(20000) });
    if (!r.ok) throw new Error(`${h} ${r.status}`);
    return r.json();
  }

  /* ---------- State: the loaded records and where each source's next page starts ---------- */
  // inat: page, last (its records are complete from here up), end; gbif: dq (its dataset filter), years [[y, n]] newest first, yi, off, last, end, ready
  const blank = () => ({ at: 0, recs: new Map(), inat: { page: 0, last: Infinity, end: false }, gbif: null, spAt: {} });
  let S = blank(), src = 'live', err = '', restored = false, tried = 0, first = null;
  const pend = {}; // source → its request under way
  function restore() {
    if (restored) return; restored = true;
    try { const c = JSON.parse(localStorage.getItem(KEY)); if (c?.recs) { S = { ...c, recs: new Map(c.recs.map(r => [r.id, r])) }; src = 'cache'; } } catch {}
  }
  function save() { if (src !== 'static') try { localStorage.setItem(KEY, JSON.stringify({ ...S, recs: [...S.recs.values()] })); } catch (e) { console.warn('records: not saved', e.name); } }
  const fire = () => document.dispatchEvent(new CustomEvent('ps:records', { detail: { n: S.recs.size } }));
  const add = (s, rows) => { for (const r of rows) if (r && !s.recs.has(r.id)) s.recs.set(r.id, r); };

  async function inatPage(s) {
    const i = s.inat, j = await get(`${INAT}${FISH}&per_page=${PER}&page=${i.page + 1}`), last = j.results.at(-1);
    add(s, j.results.map(fromInat)); i.page++;
    if (last) i.last = Date.parse(last.observed_on) + 864e5; // the end of its day: that day may go on into the next page
    i.end = j.results.length < PER || i.page * PER >= j.total_results;
  }
  async function gbifStart(s) { // its datasets but iNaturalist's copy, then their years, then the newest year
    const q = `${GBIF}&year=${Y0},${new Date().getFullYear()}&limit=0&facetLimit=200`;
    const ds = (await get(q + '&facet=datasetKey')).facets?.[0]?.counts.map(c => c.name).filter(k => k !== INAT_DS) || [];
    const dq = ds.map(k => '&datasetKey=' + k).join('');
    const years = !ds.length ? [] : (await get(q + dq + '&facet=year')).facets?.[0]?.counts.map(c => [+c.name, c.count]).sort((a, b) => b[0] - a[0]) || [];
    s.gbif = { dq, years, yi: 0, off: 0, last: Infinity, end: !years.length };
    if (years.length) await gbifPage(s);
    s.gbif.ready = true;
  }
  async function gbifPage(s) {
    const g = s.gbif, [y, n] = g.years[g.yi], j = await get(`${GBIF}${g.dq}&year=${y}&limit=300&offset=${g.off}`);
    add(s, j.results.map(fromGbif)); g.off += j.results.length;
    if (j.endOfRecords || g.off >= n) { g.last = Date.UTC(y, 0, 1); g.yi++; g.off = 0; g.end = g.yi >= g.years.length; }
  }
  const named = s => { // GBIF often has no English name: the one iNaturalist gives the same species
    const common = new Map(); for (const r of s.recs.values()) if (r.src === 'inat' && r.name !== r.sci) common.set(r.sci, r.name);
    for (const r of s.recs.values()) if (r.src === 'gbif' && common.has(r.sci)) r.name = common.get(r.sci);
  };
  const run = (k, job) => pend[k] ||= job().finally(() => { pend[k] = null; }); // one request per source at a time

  let fresh = null; // the refresh under way
  function refresh() { // a fresh first page from each API; the records shown stay until it arrives, and stay when it fails
    return fresh ||= (async () => {
      tried = Date.now();
      const n = blank(); n.at = Date.now();
      try { await inatPage(n); }
      catch (e) {
        err = e.message; console.warn('records:', e.message);
        if (!S.recs.size) { S = { ...blank(), recs: statics() }; S.inat.end = true; S.gbif = { end: true }; src = 'static'; fire(); }
        return;
      }
      S = n; src = 'live'; err = ''; named(S); save(); fire();
      startGbif(n);
    })().finally(() => { fresh = null; });
  }
  function startGbif(s) {
    pend.gbif = gbifStart(s).then(() => { if (s === S) { named(s); save(); fire(); } }, e => { console.warn('records: GBIF', e.message); if (!s.gbif?.ready) s.gbif = { end: true }; })
      .finally(() => { pend.gbif = null; });
  }
  function load() { // waits only when there is nothing to show yet
    restore();
    if (Date.now() - S.at > AGE && Date.now() - tried > 60e3) first = refresh();
    else if (src === 'cache' && !S.gbif?.ready && !S.gbif?.end && !pend.gbif) startGbif(S); // saved before GBIF's first year came in
    return S.recs.size && src !== 'static' ? Promise.resolve() : first || Promise.resolve();
  }
  const live = k => k === 'inat' ? !S.inat.end : !!S.gbif?.ready && !S.gbif.end; // GBIF counts once its first year is in
  const front = () => Math.max(live('inat') ? S.inat.last : -Infinity, live('gbif') ? S.gbif.last : -Infinity);
  async function more() {
    await load();
    const k = live('inat') && (!live('gbif') || S.inat.last >= S.gbif.last) ? 'inat' : live('gbif') ? 'gbif' : '', s = S;
    if (!k) return false;
    return run(k, () => k === 'inat' ? inatPage(s) : gbifPage(s)).then(() => { if (s === S) { named(S); save(); fire(); } err = ''; return true; },
      e => { err = e.message; console.warn('records:', e.message); return false; });
  }
  async function fetchSp(sp) { // that fish's newest 50 on iNaturalist, once per saved copy (the general pages reach a rare fish late or never)
    if (src === 'static' || S.spAt[sp] || !ask[sp]) return;
    S.spAt[sp] = Date.now(); const s = S;
    try { for (const nm of ask[sp]) add(s, (await get(`${INAT}&taxon_name=${encodeURIComponent(nm)}&per_page=50`)).results.map(fromInat)); }
    catch (e) { delete s.spAt[sp]; console.warn('records:', e.message); return; }
    if (s === S) { named(S); save(); fire(); }
  }
  async function query(o = {}) {
    await load();
    if (o.sp) await fetchSp(o.sp);
    const now = Date.now(), b = o.bounds, nr = o.near, out = [];
    for (const r of S.recs.values()) if ((!o.sp || r.sp === o.sp) && (!o.days || now - r.t <= o.days * 864e5) && (!o.photos || r.photo) &&
      (!b || b.contains([r.lat, r.lon])) && (!nr || km([nr[0], nr[1]], [r.lat, r.lon]).d <= nr[2])) out.push(r);
    return out.sort((a, b) => b.t - a.t);
  }

  // Self-check: licence spellings from both APIs, and names the app's list spells another way
  console.assert(['cc-by-nc', 'http://creativecommons.org/licenses/by-nc-nd/4.0/', 'CC_BY_4_0', 'http://creativecommons.org/publicdomain/zero/1.0/legalcode', 'cc-by-sa'].map(licOf).join() === 'cc-by-nc,,cc-by,cc0,', 'records: licences');
  console.assert(spOf('Oblada melanurus') === 'melanouri' && spOf('Sphyraena flavicauda') === 'barracuda' && spOf('Liza ramada') === 'greymullet' && spOf('Nonexistus imaginarius') === null, 'records: names');

  // Credits: the map's attribution (the phone's "Map and data credits" shows the same)
  map.attributionControl?.addAttribution('Sightings <a href="https://www.inaturalist.org/" target="_blank" rel="noopener">iNaturalist</a> · <a href="https://www.gbif.org/" target="_blank" rel="noopener">GBIF</a> observers (CC0, CC BY, CC BY-NC)');

  return { query, more, front, get: id => (restore(), S.recs.get(id) || null), refresh: () => first = refresh(), spOf, licOf,
    info: () => ({ src, at: S.at, err, busy: !!(fresh || pend.inat || pend.gbif), end: front() === -Infinity }) };
})();
