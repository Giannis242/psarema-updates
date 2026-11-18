'use strict';
// Psarema: ship traffic (data/vessels.js). Past AIS records, not live tracking:
//   hours of ships per km² per month, EMODnet Vessel Density, 13 ship types, every month of 2017–2024, on EMODnet's own 1 km grid (EPSG:3035);
//   ship passages per km² per month, EMSA Route Density, 5 groups, January 2025 – July 2026;
//   ports (Eurostat port calls via EMODnet), harbours, anchorages and ferry routes (OpenStreetMap).
// Data API (also in the test bench, without the map):
//   PsVessels.field(types, year, month) -> Float32Array over the stored cells (null: no data that month); types: ids or ['all'];
//     year: 2017…2024 | 2025, 2026 (passages) | 'avg' (2022–2024 mean); month 0-11, 12 = the year's mean month
//   PsVessels.cellAt(lat, lon) -> stored cell index or −1 · cellValue(j, types, year, month) · series(j, types, year) -> 12 values
//   PsVessels.at(lat, lon, month, year = 'avg') -> { fishing, …, all } (null off the data) · get(type, month) -> Float32Array on the 0.01° grid
//     (V.w × V.h from V.west / V.north, NaN = no data; the 2022–2024 mean; month omitted = the year's mean) · codes(type, year): a decoded chunk
// The map layers add themselves to the Layers popover (js/ui.js LAYER_OBJ / applyLayer / state.layers); a "Ship traffic here" fold joins
// the spot drawer (#drawer, #m-spot) through a MutationObserver, as js/area-gear.js does.
// data/vessels.js (3.9 MB) is not in index.html: the app loads it when Ship traffic, its ports or the fold is first opened (ready() below);
// PsVessels is built on first use once it has run (the test bench can load it with --patch=data/vessels.js).
{
  let pv = null;
  Object.defineProperty(window, 'PsVessels', { configurable: true, get: () => pv ||= window.PSAREMA_VESSELS?.grid ? api(window.PSAREMA_VESSELS) : undefined });
  function api(V) {
    const bytes = s => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
    const G = V.grid, GW = G.w, WN = G.w * G.h, MASK = bytes(G.mask), POS = new Int32Array(WN).fill(-1), IDX = [];
    for (let i = 0; i < WN; i++) if (MASK[i >> 3] >> (i & 7) & 1) { POS[i] = IDX.length; IDX.push(i); }
    const NC = IDX.length, NL = new Int32Array(NC), NU = new Int32Array(NC), NR = new Int32Array(NC); // left, up, up-right neighbours
    IDX.forEach((i, j) => { NL[j] = i % GW ? POS[i - 1] : -1; NU[j] = i >= GW ? POS[i - GW] : -1; NR[j] = i >= GW && (i + 1) % GW ? POS[i - GW + 1] : -1; });

    // ETRS89-LAEA (EPSG:3035) forward, GRS80: the same formulas as scripts/vessels/build-vessels.mjs
    const A = 6378137, FL = 1 / 298.257222101, E2 = 2 * FL - FL * FL, E = Math.sqrt(E2), RAD = Math.PI / 180;
    const q = s => (1 - E2) * (s / (1 - E2 * s * s) - Math.log((1 - E * s) / (1 + E * s)) / (2 * E)), QP = q(1), RQ = A * Math.sqrt(QP / 2);
    const B0 = Math.asin(q(Math.sin(52 * RAD)) / QP), SB0 = Math.sin(B0), CB0 = Math.cos(B0), DD = A * Math.cos(52 * RAD) / Math.sqrt(1 - E2 * Math.sin(52 * RAD) ** 2) / (RQ * CB0);
    const laea = (lat, lon) => { // -> [column, row] on the stored window, in cells
      const b = Math.asin(q(Math.sin(lat * RAD)) / QP), l = (lon - 10) * RAD, sb = Math.sin(b), cb = Math.cos(b), cl = Math.cos(l), k = RQ * Math.sqrt(2 / (1 + SB0 * sb + CB0 * cb * cl));
      return [(4321000 + k * DD * cb * Math.sin(l) - G.x0) / G.cell, (G.y0 - 3210000 - k / DD * (CB0 * sb - SB0 * cb * cl)) / G.cell];
    };
    const cellAt = (lat, lon) => { const [c, r] = laea(lat, lon), x = Math.floor(c), y = Math.floor(r); return x < 0 || y < 0 || x >= GW || y >= G.h ? -1 : POS[y * GW + x]; };

    // A chunk (one type × one year): adaptive binary range decoder, the mirror of encodeChunk() in the builder
    const BK = Uint8Array.from({ length: 64 }, (_, c) => c === 0 ? 0 : 1 + Math.min(5, Math.floor((c - 1) / V.steps)));
    function decode(s, nm) {
      const b = bytes(s), out = new Uint8Array(nm * NC), pz = new Uint16Array(4096).fill(1024), pt = new Uint16Array(4096 * 64).fill(1024);
      let range = 0xFFFFFFFF, code = 0, p = 0;
      for (let k = 0; k < 5; k++) code = (code * 256 + (b[p++] | 0)) >>> 0;
      for (let m = 0; m < nm; m++) {
        const o = m * NC;
        for (let j = 0; j < NC; j++) { // one bit "non-zero?", then 6 bits of the code (the bit decoding is written out: ~2× faster than a closure)
          const ctx = (((m ? BK[out[o - NC + j]] : 7) * 8 + (NL[j] < 0 ? 7 : BK[out[o + NL[j]]])) * 8 + (NU[j] < 0 ? 7 : BK[out[o + NU[j]]])) * 8 + (NR[j] < 0 ? 7 : BK[out[o + NR[j]]]);
          let pr = pz[ctx], bound = (range >>> 11) * pr, hit = code >= bound;
          if (hit) { code -= bound; range -= bound; pz[ctx] = pr - (pr >> 5); } else { range = bound; pz[ctx] = pr + ((2048 - pr) >> 5); }
          if (range < 16777216) { range = range * 256 >>> 0; code = (code * 256 + (b[p++] | 0)) >>> 0; }
          if (!hit) continue;
          let n = 1;
          for (let k = 0, base = ctx * 64; k < 6; k++) {
            pr = pt[base + n]; bound = (range >>> 11) * pr;
            if (code >= bound) { code -= bound; range -= bound; pt[base + n] = pr - (pr >> 5); n = n * 2 + 1; } else { range = bound; pt[base + n] = pr + ((2048 - pr) >> 5); n *= 2; }
            if (range < 16777216) { range = range * 256 >>> 0; code = (code * 256 + (b[p++] | 0)) >>> 0; }
          }
          out[o + j] = n - 64;
        }
      }
      return out;
    }

    const TYPES = V.types.map(t => t.id), FLOOR = Object.fromEntries(V.types.map(t => [t.id, t.floor])), RD = V.rd, AVG = V.years.filter(y => y >= 2022);
    const LUT = {}, lut = f => LUT[f] || (LUT[f] = Float32Array.from({ length: 64 }, (_, c) => c ? f * 10 ** ((c - 1) / V.steps) : 0));
    const isRd = y => !!RD && RD.years.includes(y), nmOf = y => isRd(y) ? RD.months[RD.years.indexOf(y)] : 12;
    const cache = new Map(); // decoded chunks, the 48 last used (~0.5 MB each)
    function codes(t, y) {
      const k = t + y; let c = cache.get(k);
      if (c) cache.delete(k);
      else {
        const s = isRd(y) ? RD.data[t]?.[RD.years.indexOf(y)] : V.vd[t]?.[V.years.indexOf(y)];
        if (!s) throw new Error(`vessels: no data for ${t} ${y}`);
        c = decode(s, nmOf(y)); if (cache.size >= 48) cache.delete(cache.keys().next().value);
      }
      cache.set(k, c); return c;
    }
    const parts = (sel, y) => { // the stored layers a selection is made of (EMSA years: the EMSA groups the types fall in)
      const s = sel.includes('all') ? (isRd(y) ? RD.groups : TYPES) : sel;
      return isRd(y) ? [...new Set(s.map(t => RD.groups.includes(t) ? t : RD.of[t]).filter(Boolean))] : s.filter(t => TYPES.includes(t));
    };
    const yearsOf = y => y === 'avg' ? AVG : [y], chunks = (sel, y) => yearsOf(y).flatMap(yy => parts(sel, yy).map(t => [t, yy])); // the chunks field() decodes
    const monthsOf = (y, m) => { const nm = nmOf(y); return m === 12 ? [...Array(nm).keys()] : m < nm ? [m] : []; };
    function field(sel, y, m) {
      const f = new Float32Array(NC); let n = 0;
      for (const yy of yearsOf(y)) {
        const ms = monthsOf(yy, m); if (!ms.length) continue;
        for (const t of parts(sel, yy)) { const c = codes(t, yy), l = lut(isRd(yy) ? RD.floor : FLOOR[t]); for (const mm of ms) for (let j = 0, o = mm * NC; j < NC; j++) f[j] += l[c[o + j]]; }
        n += ms.length;
      }
      if (!n) return null;
      if (n > 1) for (let j = 0; j < NC; j++) f[j] /= n;
      return f;
    }
    function cellValue(j, sel, y, m) {
      let s = 0, n = 0;
      for (const yy of yearsOf(y)) {
        const ms = monthsOf(yy, m); if (!ms.length) continue;
        for (const t of parts(sel, yy)) { const c = codes(t, yy), l = lut(isRd(yy) ? RD.floor : FLOOR[t]); for (const mm of ms) s += l[c[mm * NC + j]]; }
        n += ms.length;
      }
      return n ? s / n : NaN;
    }
    const series = (j, sel, y) => [...Array(12).keys()].map(m => cellValue(j, sel, y, m));
    function at(lat, lon, m = 12, y = 'avg') {
      const j = cellAt(lat, lon); if (j < 0) return null;
      return Object.fromEntries([...(isRd(y) ? RD.groups : TYPES), 'all'].map(t => [t, cellValue(j, [t], y, m)]));
    }
    let compat = null; // the 0.01° grid -> stored cell
    function get(t, m = 12) {
      if (!compat) { compat = new Int32Array(V.w * V.h); for (let i = 0; i < compat.length; i++) compat[i] = cellAt(V.north - (Math.floor(i / V.w) + .5) * V.res, V.west + (i % V.w + .5) * V.res); }
      const f = field([t], 'avg', m), g = new Float32Array(compat.length);
      for (let i = 0; i < g.length; i++) g[i] = compat[i] < 0 || !f ? NaN : f[compat[i]];
      return g;
    }
    return { field, cellAt, cellValue, series, at, get, codes, chunks, laea, POS, NC, isRd, nmOf, types: [...TYPES, 'all'], years: V.years, rdYears: RD?.years || [],
      units: V.units, source: V.source, notes: V.notes };
  }

  /* ---------- Map layers (the app only) ---------- */
  if (window.L && typeof map !== 'undefined' && typeof LAYER_OBJ !== 'undefined' && typeof applyLayer === 'function' && $('#layers-pop')) {
    let V = null, PV = null, G = null, RD = null, YEARS = []; // set by ready() once data/vessels.js has loaded
    let loading = null;
    const ready = () => loading ||= (box.parentElement.classList.add('vs-loading'), loadScripts('data/vessels.js')).finally(() => box.parentElement.classList.remove('vs-loading')).then(() => { // the label pulses while 3.9 MB come in
      V = window.PSAREMA_VESSELS; PV = window.PsVessels; G = V.grid; RD = V.rd; YEARS = [...V.years, ...(RD?.years || []), 'avg'];
      if (!S.sel.every(t => PV.types.includes(t))) S.sel = ['all'];
      if (!YEARS.includes(S.year)) S.year = V.years.at(-1);
      buildMarks();
    }, e => { loading = null; throw e; });
    const need = f => ready().then(f, e => console.warn('Ship traffic unavailable:', e.message)); // runs f once the data is there
    Object.assign(I18N.en, {
      grpShips: 'Ships', l_vessels: 'Ship traffic', l_shipmarks: 'Ports, anchorages, ferries', vs_all: 'All ships',
      vs_fishing: 'Fishing', vs_service: 'Service', vs_dredging: 'Dredging, underwater work', vs_sailing: 'Sailing', vs_pleasure: 'Pleasure craft', vs_hsc: 'High-speed craft',
      vs_tug: 'Tug, towing', vs_passenger: 'Passenger', vs_cargo: 'Cargo', vs_tanker: 'Tanker', vs_military: 'Military, law enforcement', vs_other: 'Other', vs_unknown: 'Unknown',
      vs_g_fishing: 'Fishing', vs_g_leisure: 'Leisure', vs_g_passenger: 'Passenger', vs_g_merchant: 'Cargo, tankers', vs_g_work: 'Work boats', vs_g_other: 'Other',
      vs_hours: 'hours of ships per km² per month', vs_passages: 'ship passages per km² per month', vs_h: 'h',
      vs_avg: '2022–24 average', vs_emsa: 'passages', vs_gHours: 'Hours (EMODnet)', vs_gPass: 'Passages (EMSA)', vs_mean: 'average month', vs_play: 'Play the months', vs_pause: 'Pause', vs_year: 'Year', vs_month: 'Month',
      vs_here: (w, ym) => `Here (${w}), ${ym}`, vs_cell: '1 km²', vs_hint: 'Hover or tap the sea for numbers', vs_none: 'Here: no data', vs_nodata: 'no data yet',
      vs_byMonth: y => `by month, ${y}`, vs_fold: 'Ship traffic here', vs_zero: 'none', vs_allShips: 'All ships',
      vs_note: 'Past AIS records, not live tracking. Most small fishing and leisure boats carry no AIS, so inshore boating shows little; ports and marinas count moored boats.',
      vs_noteRd: 'EMSA counts routes crossing each 1 km cell, in 5 groups: leisure, work boats and the rest are in “Other”.',
      vs_anchorage: 'Anchorage', vs_ferry: 'Ferry route', vs_track: 'Fairway / leading line', vs_tss: 'Traffic separation', vs_harbour: 'Harbour',
      vs_cat: { marina: 'Marina', marina_no_facilities: 'Small harbour', fishing: 'Fishing shelter', roro: 'Ro-ro berth', '': 'Harbour' },
      vs_calls: (n, y) => `${n} ship calls in ${y}`, vs_goods: kt => `goods ${kt} thousand t`, vs_pax: k => `passengers ${k} thousand`, vs_portSrc: 'Eurostat via EMODnet',
    });
    Object.assign(I18N.el, {
      grpShips: 'Πλοία', l_vessels: 'Κίνηση πλοίων', l_shipmarks: 'Λιμάνια, αγκυροβόλια, πορθμεία', vs_all: 'Όλα τα πλοία',
      vs_fishing: 'Αλιευτικά', vs_service: 'Βοηθητικά', vs_dredging: 'Βυθοκόροι, υποβρύχιες εργασίες', vs_sailing: 'Ιστιοφόρα', vs_pleasure: 'Σκάφη αναψυχής', vs_hsc: 'Ταχύπλοα',
      vs_tug: 'Ρυμουλκά', vs_passenger: 'Επιβατηγά', vs_cargo: 'Φορτηγά', vs_tanker: 'Δεξαμενόπλοια', vs_military: 'Πολεμικά, λιμενικά', vs_other: 'Άλλα', vs_unknown: 'Άγνωστα',
      vs_g_fishing: 'Αλιεία', vs_g_leisure: 'Αναψυχή', vs_g_passenger: 'Επιβατηγά', vs_g_merchant: 'Φορτηγά, δεξαμενόπλοια', vs_g_work: 'Σκάφη εργασίας', vs_g_other: 'Άλλα',
      vs_hours: 'ώρες πλοίων ανά km² τον μήνα', vs_passages: 'διελεύσεις πλοίων ανά km² τον μήνα', vs_h: 'ώρ.',
      vs_avg: 'Μ.Ο. 2022–24', vs_emsa: 'διελεύσεις', vs_gHours: 'Ώρες (EMODnet)', vs_gPass: 'Διελεύσεις (EMSA)', vs_mean: 'μέσος μήνας', vs_play: 'Αναπαραγωγή μηνών', vs_pause: 'Παύση', vs_year: 'Έτος', vs_month: 'Μήνας',
      vs_here: (w, ym) => `Εδώ (${w}), ${ym}`, vs_cell: '1 km²', vs_hint: 'Περάστε ή πατήστε στη θάλασσα για αριθμούς', vs_none: 'Εδώ: χωρίς δεδομένα', vs_nodata: 'δεν υπάρχουν ακόμη δεδομένα',
      vs_byMonth: y => `ανά μήνα, ${y}`, vs_fold: 'Κίνηση πλοίων εδώ', vs_zero: 'κανένα', vs_allShips: 'Όλα τα πλοία',
      vs_note: 'Παλιές καταγραφές AIS, όχι ζωντανή παρακολούθηση. Τα περισσότερα μικρά αλιευτικά και σκάφη αναψυχής δεν έχουν AIS, οπότε η παράκτια κίνηση φαίνεται λίγη· λιμάνια και μαρίνες μετρούν δεμένα σκάφη.',
      vs_noteRd: 'Ο EMSA μετρά διαδρομές που περνούν κάθε κελί 1 km, σε 5 ομάδες: αναψυχή, σκάφη εργασίας και τα υπόλοιπα είναι στα «Άλλα».',
      vs_anchorage: 'Αγκυροβόλιο', vs_ferry: 'Γραμμή πορθμείου', vs_track: 'Δίαυλος / γραμμή οδηγός', vs_tss: 'Διαχωρισμός κυκλοφορίας', vs_harbour: 'Λιμάνι',
      vs_cat: { marina: 'Μαρίνα', marina_no_facilities: 'Μικρό λιμανάκι', fishing: 'Αλιευτικό καταφύγιο', roro: 'Ράμπα ro-ro', '': 'Λιμάνι' },
      vs_calls: (n, y) => `${n} αφίξεις πλοίων το ${y}`, vs_goods: kt => `φορτία ${kt} χιλ. τόνοι`, vs_pax: k => `επιβάτες ${k} χιλ.`, vs_portSrc: 'Eurostat μέσω EMODnet',
    });
    const PORT_EL = { Lemesos: ['Limassol (Lemesos)', 'Λεμεσός'], Larnaka: ['Larnaca', 'Λάρνακα'], Zygi: ['Zygi', 'Ζύγι'], Dekeleia: ['Dhekelia', 'Δεκέλεια'], 'Ayia Napa': ['Ayia Napa', 'Αγία Νάπα'], Moni: ['Moni', 'Μονή'] };
    const SHIP_EL = { 'Container ship': ['container', 'εμπορευματοκιβώτια'], 'General cargo, non-specialised': ['general cargo', 'γενικό φορτίο'], 'Liquid bulk tanker': ['tanker', 'δεξαμενόπλοια'],
      'Dry bulk carrier': ['dry bulk', 'χύδην ξηρό'], 'Passenger ship (excluding cruise ship)': ['passenger', 'επιβατηγά'], 'Cruise ship': ['cruise', 'κρουαζιερόπλοια'],
      'Offshore activities vessel': ['offshore', 'υπεράκτια'], 'Other type of vessel (dredger, research vessel, other)': ['other', 'άλλα'], 'Fishing vessel': ['fishing', 'αλιευτικά'],
      'Dry cargo barge': ['barge', 'φορτηγίδες'], 'Specialised carrier': ['specialised', 'ειδικά'] };
    const GROUPS = [['fishing', ['fishing']], ['leisure', ['pleasure', 'sailing']], ['passenger', ['passenger', 'hsc']], ['merchant', ['cargo', 'tanker']],
      ['work', ['tug', 'service', 'dredging']], ['other', ['military', 'other', 'unknown']]];
    const el = () => state.lang === 'el';

    /* Settings: types, year (kept), month (this month at each start); checked against the data by ready() (year: the latest by default) */
    const KEY = 'psarema-vessels-v2';
    const S = { sel: ['all'], year: null, month: new Date().getMonth() };
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null'), old = localStorage.getItem('psarema-vessels-v1');
      if (o) { if (Array.isArray(o.sel) && o.sel.length) S.sel = o.sel; S.year = o.year ?? null; }
      else if (old) S.sel = { fishing: ['fishing'], passcargo: ['passenger', 'cargo'], recreational: ['sailing', 'pleasure'] }[old] || ['all'];
    } catch {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ sel: S.sel, year: S.year })); } catch {} };
    const rdNow = () => PV.isRd(S.year);

    /* Colours: log scale; hours 0.1 → 1000+, passages 1 → 1000+. Round 10: grey through amber to a warm white (no blue or purple; not the
       fish ramp's teal and green, so the two layers never read as one), lightness rising (light colours: they sit on dark imagery) */
    const STOPS = [[-.1, 96, 96, 96, 70], [0, 120, 120, 118, 120], [.25, 186, 132, 70, 175], [.5, 236, 146, 46, 210], [.75, 255, 196, 92, 235], [1, 255, 244, 204, 250]];
    const scale = () => rdNow() ? [0, 3] : [-1, 3]; // log10 of the ends of the bar
    const rgba = v => {
      const [a, b] = scale(), t = (Math.log10(v) - a) / (b - a);
      if (!(t >= STOPS[0][0])) return STOPS[0].slice(1);
      for (let k = 1; k < STOPS.length; k++) if (t <= STOPS[k][0]) { const p = STOPS[k - 1], s = STOPS[k], f = (t - p[0]) / (s[0] - p[0]); return p.slice(1).map((c, i) => Math.round(c + (s[i + 1] - c) * f)); }
      return STOPS.at(-1).slice(1);
    };
    const grad = STOPS.filter(s => s[0] >= 0).map(s => `rgb(${s.slice(1, 4)}) ${s[0] * 100}%`).join(',');

    /* The field shown and its colours (per stored cell); premultiplied channels for the smooth low-zoom drawing. A frame = one month's. */
    const keyOf = (m = S.month) => `${S.sel}|${S.year}|${m}`;
    function frameOf(m) {
      const NC = PV.NC, F = PV.field(S.sel, S.year, m), COL = new Uint32Array(NC), PR = new Uint8Array(NC), PG = new Uint8Array(NC), PB = new Uint8Array(NC), PA = new Uint8Array(NC);
      if (F) for (let j = 0; j < NC; j++) if (F[j] > 0) {
        const [r, g, b, a] = rgba(F[j]); COL[j] = (a << 24 | b << 16 | g << 8 | r) >>> 0;
        PR[j] = r * a / 255; PG[j] = g * a / 255; PB[j] = b * a / 255; PA[j] = a;
      }
      return { key: keyOf(m), F, COL, PR, PG, PB, PA };
    }
    let cur = { key: '' }, nxt = null; // the month shown; the next one, worked out ahead while the months play (prep)
    function compute() { const k = keyOf(); if (k !== cur.key) cur = nxt?.key === k ? nxt : frameOf(S.month); }

    /* Tiles: each canvas pixel looks up its 1 km cell (crisp from zoom 10, blended between cell centres below), then land is cut out
       with the shoreline of data/coast.js, as the fishing colours are */
    // Touch screens: tiles at 1.5× at most (a smooth colour field; ~45% fewer pixels to work out than 2×), as the wind layer (js/weather.js)
    const TS = 256, DPR = Math.min(matchMedia('(pointer: coarse)').matches ? 1.5 : 2, window.devicePixelRatio || 1), CS = Math.round(TS * DPR), K = CS / 16, GN = 17;
    const mercLat = (y, n) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI, mercY = la => (1 - Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360)) / Math.PI) / 2;
    const RINGS = (window.PSAREMA_COAST || []).map(r => { let s = 90, n = -90, w = 180, e = -180; for (let k = 0; k < r.length; k += 2) { s = Math.min(s, r[k]); n = Math.max(n, r[k]); w = Math.min(w, r[k + 1]); e = Math.max(e, r[k + 1]); } return { r, s, n, w, e }; });
    let SCR = null; // one pixel buffer for the tiles drawn at once
    function tilePx(img, c, fr) { // a tile's pixels for one frame, into img (an ImageData)
      const px = new Uint32Array(img.data.buffer); px.fill(0);
      if (!fr.F) return img;
      const { COL, PR, PG, PB, PA } = fr, POS = PV.POS;
      const n = TS * 2 ** c.z, gx = new Float64Array(GN * GN), gy = new Float64Array(GN * GN);
      for (let b = 0; b < GN; b++) { const la = mercLat(c.y * TS + b * TS / 16, n); for (let a = 0; a < GN; a++) { const [x, y] = PV.laea(la, (c.x * TS + a * TS / 16) / n * 360 - 180); gx[b * GN + a] = x; gy[b * GN + a] = y; } }
      const smooth = c.z < 10, W = G.w, H = G.h;
      for (let py = 0; py < CS; py++) {
        const fb = (py + .5) / K, b = Math.min(15, fb | 0), v = fb - b;
        for (let pxi = 0; pxi < CS; pxi++) {
          const fa = (pxi + .5) / K, a = Math.min(15, fa | 0), u = fa - a, k = b * GN + a;
          const X = (gx[k] + (gx[k + 1] - gx[k]) * u) * (1 - v) + (gx[k + GN] + (gx[k + GN + 1] - gx[k + GN]) * u) * v;
          const Y = (gy[k] + (gy[k + 1] - gy[k]) * u) * (1 - v) + (gy[k + GN] + (gy[k + GN + 1] - gy[k + GN]) * u) * v;
          if (!smooth) { const x = Math.floor(X), y = Math.floor(Y); if (x < 0 || y < 0 || x >= W || y >= H) continue; const j = POS[y * W + x]; if (j >= 0) px[py * CS + pxi] = COL[j]; continue; }
          const x0 = Math.floor(X - .5), y0 = Math.floor(Y - .5), wx = X - .5 - x0, wy = Y - .5 - y0; let R = 0, Gc = 0, Bc = 0, Al = 0;
          for (let d = 0; d < 4; d++) {
            const x = x0 + (d & 1), y = y0 + (d >> 1); if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const j = POS[y * W + x]; if (j < 0) continue;
            const w = (d & 1 ? wx : 1 - wx) * (d >> 1 ? wy : 1 - wy); R += PR[j] * w; Gc += PG[j] * w; Bc += PB[j] * w; Al += PA[j] * w;
          }
          if (Al >= 1) px[py * CS + pxi] = (Math.round(Al) << 24 | Math.min(255, Bc * 255 / Al) << 16 | Math.min(255, Gc * 255 / Al) << 8 | Math.min(255, R * 255 / Al)) >>> 0;
        }
      }
      return img;
    }
    function showTile(t, img = tilePx(SCR ||= new ImageData(CS, CS), t.c, cur)) { // put the pixels, then cut the land out
      const g = t.cv.getContext('2d'), c = t.c, n = TS * 2 ** c.z; g.clearRect(0, 0, CS, CS);
      if (!cur.F) return;
      g.putImageData(img, 0, 0);
      const x0 = c.x * TS, y0 = c.y * TS, w = x0 / n * 360 - 180, e = (x0 + TS) / n * 360 - 180, no = mercLat(y0, n), so = mercLat(y0 + TS, n);
      g.globalCompositeOperation = 'destination-out'; g.beginPath();
      for (const R of RINGS) {
        if (R.e < w || R.w > e || R.n < so || R.s > no) continue;
        for (let k = 0; k < R.r.length; k += 2) { const X = ((R.r[k + 1] + 180) / 360 * n - x0) * DPR, Y = (mercY(R.r[k]) * n - y0) * DPR; k ? g.lineTo(X, Y) : g.moveTo(X, Y); }
        g.closePath();
      }
      g.fill(); g.globalCompositeOperation = 'source-over';
    }
    map.createPane('vessels').style.zIndex = 412; // over the fishing colours (410), under outlines, spots and labels
    map.getPane('vessels').style.pointerEvents = 'none';
    const tiles = new Map(), tkey = c => `${c.x}:${c.y}:${c.z}`, BOUNDS = L.latLngBounds([[34.2, 31.85], [35.9, 34.9]]); // tile: { cv, c, next, nextKey }
    // willReadFrequently keeps a tile's drawing on the CPU: on the GPU (putImageData, then the coastline cut) every month step cost a 0.7 s frame
    // on a phone with software GL, ~28 fps instead of ~12 while playing
    // New tiles are drawn in slices of ≤ 12 ms, the month's chunks decoded first (one per slice at most), then the tiles nearest the centre
    // (Leaflet's order), each fading in when done: switching the layer on or panning never freezes the map (the first draw was one 0.3 s
    // task here, over a second on a phone).
    const todo = []; let pumpT = 0;
    function pump() {
      pumpT = 0; const end = performance.now() + 12, k = cur.key;
      for (const [t, y] of PV.chunks(S.sel, S.year)) { PV.codes(t, y); if (performance.now() > end) { pumpT = setTimeout(pump); return; } }
      compute(); if (cur.key !== k) drawLegend(); // its "no data yet" waits for the frame
      while (todo.length && performance.now() < end) { const t = todo.shift(); if (tiles.get(tkey(t.c)) === t) { showTile(t); t.done(null, t.cv); } } // unloaded meanwhile: skipped
      if (todo.length) pumpT = setTimeout(pump);
    }
    const Tiles = L.GridLayer.extend({ createTile(c, done) {
      const t = { cv: document.createElement('canvas'), c, done }; t.cv.width = t.cv.height = CS; t.cv.getContext('2d', { willReadFrequently: true });
      tiles.set(tkey(c), t); todo.push(t); pumpT ||= setTimeout(pump); return t.cv;
    } });
    const layer = new Tiles({ pane: 'vessels', opacity: .9, tileSize: TS, keepBuffer: 1, updateWhenZooming: false, className: 'vs-tiles', bounds: BOUNDS });
    layer.on('tileunload', e => tiles.delete(tkey(e.coords)));
    function redraw() { compute(); for (const t of tiles.values()) showTile(t, t.nextKey === cur.key ? t.next : undefined); drawLegend(); refreshFolds(); if (playing) prep(); }
    // While the months play, the next month is decoded, worked out and drawn off screen in idle time, one piece per slice, so a step only
    // puts pixels (working out and drawing every tile at the step was a 0.1–0.15 s task on a phone).
    const idle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 900 }) : setTimeout(() => f({ timeRemaining: () => 8 }), 30);
    function prep() {
      const m = nextMonth(), k = keyOf(m), jobs = [...PV.chunks(S.sel, S.year).map(([t, y]) => () => PV.codes(t, y)), () => { if (nxt?.key !== k) nxt = frameOf(m); },
        ...[...tiles.values()].map(t => () => { if (t.nextKey !== k) { t.next = tilePx(t.next || new ImageData(CS, CS), t.c, nxt); t.nextKey = k; } })];
      const work = dl => { do { if (!playing || keyOf(nextMonth()) !== k) return; jobs.shift()(); } while (jobs.length && dl.timeRemaining() > 4); if (jobs.length) idle(work); };
      idle(work);
    }

    /* Layers popover: a "Ships" group before "Places and seabed": the traffic field with its type chips, and the ports/anchorages overlay */
    const chip = t => `<button type="button" data-k="${t}" data-i18n="vs_${t}">${tr('vs_' + t)}</button>`;
    const pop = $('#layers-pop'), before = pop.querySelector('h4[data-i18n="grpPlaces"]') || pop.querySelector('.lp-head');
    const html = `<h4 data-i18n="grpShips">${tr('grpShips')}</h4>
<label><input type="checkbox" id="lay-vessels"><i class="sw" style="background:linear-gradient(90deg,#787876,#ec922e,#fff4cc)"></i> <span data-i18n="l_vessels">${tr('l_vessels')}</span> <span class="num">AIS · 1 km</span></label>
<div class="vs-types" id="vessel-kind"><div class="chips">${chip('all')}</div>${GROUPS.map(([g, ts]) => `<div class="vs-group"><small data-i18n="vs_g_${g}">${tr('vs_g_' + g)}</small><div class="chips">${ts.map(chip).join('')}</div></div>`).join('')}</div>
<label><input type="checkbox" id="lay-shipmarks"><i class="sw" style="background:#7fd1ff"></i> <span data-i18n="l_shipmarks">${tr('l_shipmarks')}</span> <span class="num">OSM</span></label>`;
    const host = $('#lay-ships'); // index.html's folding "Ships" group (its summary is the heading; the h4 is hidden there)
    host ? host.insertAdjacentHTML('beforeend', html) : before ? before.insertAdjacentHTML('beforebegin', html) : pop.insertAdjacentHTML('beforeend', html);
    const box = $('#lay-vessels'), chips = $('#vessel-kind'), mbox = $('#lay-shipmarks');
    const drawChips = () => { chips.hidden = !box.checked; for (const b of chips.querySelectorAll('[data-k]')) b.setAttribute('aria-pressed', S.sel.includes(b.dataset.k)); };
    chips.addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k, on = S.sel.includes(k);
      S.sel = k === 'all' ? ['all'] : on ? S.sel.filter(t => t !== k) : [...S.sel.filter(t => t !== 'all'), k];
      if (!S.sel.length) S.sel = ['all'];
      save(); drawChips(); if (map.hasLayer(layer)) { redraw(); drawHere(); }
    });

    /* Legend under the fishing legend: title, year / month / play, colour bar with real numbers, "here" readout with a 12-month sparkline */
    ($('#wx-fold') || $('#map-legend')).insertAdjacentHTML('beforeend', '<div id="vessel-legend"></div>'); // in the legend's fold with the weather keys (index.html, ui.js drawWeatherLegend)
    const lg = $('#vessel-legend');
    let built = false, hereJ = -1, hereOff = false, playing = null;
    const monthName = (m, f = 'short') => new Intl.DateTimeFormat(locale(), { month: f }).format(new Date(2025, m, 15));
    const yearLabel = y => y === 'avg' ? tr('vs_avg') : PV.isRd(y) ? `${y} · ${tr('vs_emsa')}` : String(y);
    const when = (m = S.month, y = S.year) => m === 12 ? `${yearLabel(y)}, ${tr('vs_mean')}` : `${monthName(m)} ${y === 'avg' ? tr('vs_avg') : y}`;
    const typeName = t => tr('vs_' + t);
    const selName = () => S.sel.includes('all') ? tr('vs_all') : S.sel.map(typeName).join(', ');
    const fmt = v => !(v > 0) ? '0' : v < .1 ? nf(v, 2) : v < 10 ? nf(v, 1) : v < 100 ? String(Math.round(v)) : String(+v.toPrecision(2)); // 5100, not 5134: the codes are ±21%
    const withUnit = (v, rd = rdNow()) => rd ? fmt(v) : `${fmt(v)} ${tr('vs_h')}`; // passages: a plain count (the heading says passages)
    function spark(vals, cur, w = 120, h = 22) { // 12 months on a baseline, whole pixels (crisp); the month shown in white, as the selected hour in the timeline
      const mx = Math.max(...vals.filter(v => v > 0), 0), bw = Math.floor(w / 12), H = h - 1, bh = v => mx ? Math.max(1, Math.round(v / mx * H)) : 1;
      return `<svg class="vs-spark" viewBox="0 0 ${bw * 12} ${h}" width="${bw * 12}" height="${h}" aria-hidden="true"><rect class="vs-base" y="${H}" width="${bw * 12}" height="1"/>${vals.map((v, m) => Number.isNaN(v)
        ? `<rect x="${m * bw + (bw >> 1) - 1}" y="${H - 2}" width="2" height="2" class="vs-na"/>`
        : `<rect x="${m * bw + 1}" y="${H - bh(v)}" width="${bw - 2}" height="${bh(v)}"${m === cur ? ' class="vs-cur"' : ''}><title>${esc(monthName(m))}: ${esc(withUnit(v))}</title></rect>`).join('')}</svg>`;
    }
    function build() {
      built = true;
      lg.innerHTML = `<div class="ps-weather ps-wx-legend vs-legend"><div class="ps-wx-ltitle vs-title"></div>
<div class="vs-time"><button type="button" class="vs-play"></button><select class="vs-year"></select><input type="range" class="vs-month" min="0" max="12" step="1"></div>
<div class="vs-when"></div><div class="ps-wx-bar" style="background:linear-gradient(90deg,${grad})"></div><div class="ps-wx-ticks vs-ticks"></div>
<div class="vs-unit"></div><div class="vs-here"></div><div class="ps-wx-note vs-note"></div></div>`;
      const yr = lg.querySelector('.vs-year'), mo = lg.querySelector('.vs-month');
      yr.addEventListener('change', () => { S.year = YEARS.find(y => String(y) === yr.value) ?? S.year; save(); redraw(); drawHere(); });
      mo.addEventListener('input', () => { S.month = +mo.value; redraw(); drawHere(); });
      lg.querySelector('.vs-play').addEventListener('click', () => play(!playing));
    }
    function drawLegend() {
      if (!map.hasLayer(layer)) { lg.hidden = true; return; }
      if (!built) build();
      lg.hidden = false;
      const yr = lg.querySelector('.vs-year'), mo = lg.querySelector('.vs-month'), pb = lg.querySelector('.vs-play'), [a, b] = scale();
      lg.querySelector('.vs-title').textContent = `${tr('l_vessels')} · ${selName()}`;
      const opt = y => `<option value="${y}"${y === S.year ? ' selected' : ''}>${esc(y === 'avg' ? tr('vs_avg') : String(y))}</option>`;
      yr.innerHTML = `<optgroup label="${esc(tr('vs_gHours'))}">${[...V.years, 'avg'].map(opt).join('')}</optgroup>` + (RD ? `<optgroup label="${esc(tr('vs_gPass'))}">${RD.years.map(opt).join('')}</optgroup>` : '');
      yr.setAttribute('aria-label', tr('vs_year')); mo.setAttribute('aria-label', tr('vs_month')); mo.value = S.month;
      mo.setAttribute('aria-valuetext', when());
      pb.innerHTML = ic(playing ? 'pause' : 'play', 'sm') || (playing ? 'II' : '▶'); pb.setAttribute('aria-label', tr(playing ? 'vs_pause' : 'vs_play')); pb.title = tr(playing ? 'vs_pause' : 'vs_play');
      lg.querySelector('.vs-when').innerHTML = `<b>${esc(when())}</b>${cur.F ? '' : ` · ${esc(tr('vs_nodata'))}`}`;
      const ticks = []; for (let d = a; d <= b; d++) ticks.push(10 ** d);
      lg.querySelector('.vs-ticks').innerHTML = ticks.map((t, k) => `<span style="left:${k / (ticks.length - 1) * 100}%">${t < 1 ? nf(t, 1) : t}${k === ticks.length - 1 ? '+' : ''}</span>`).join('');
      lg.querySelector('.vs-unit').textContent = tr(rdNow() ? 'vs_passages' : 'vs_hours');
      lg.querySelector('.vs-note').textContent = `${rdNow() ? tr('vs_noteRd') + ' ' : ''}${tr('vs_note')} ${rdNow() ? 'EMSA' : 'EMODnet'}, CC BY 4.0.`;
      drawHere();
    }
    function drawHere() {
      const box = lg.querySelector('.vs-here'); if (!box) return;
      if (hereJ < 0) { box.innerHTML = `<span class="vs-hint">${esc(tr(hereOff ? 'vs_none' : 'vs_hint'))}</span>`; return; }
      const types = S.sel.includes('all') ? (rdNow() ? RD.groups : PV.types.filter(t => t !== 'all')) : S.sel;
      const shown = rdNow() ? [...new Set(types.map(t => RD.groups.includes(t) ? t : RD.of[t]))] : types;
      let rows = shown.map(t => [t, PV.cellValue(hereJ, [t], S.year, S.month)]);
      if (S.sel.includes('all')) rows = rows.filter(r => r[1] > 0).sort((p, q) => q[1] - p[1]).slice(0, 4);
      const total = PV.cellValue(hereJ, S.sel, S.year, S.month);
      box.innerHTML = `<div class="vs-hhead">${esc(tr('vs_here', tr('vs_cell'), when()))}${rdNow() ? ' · ' + esc(tr('vs_emsa')) : ''}</div>` +
        `<div class="vs-hrows">${rows.map(([t, v]) => `<span>${esc(typeName(t))} <b>${esc(withUnit(v))}</b></span>`).join('')}` +
        (S.sel.includes('all') || S.sel.length > 1 ? `<span>${esc(S.sel.includes('all') ? tr('vs_allShips') : '∑')} <b>${esc(withUnit(total))}</b></span>` : '') + '</div>' +
        `<div class="vs-hspark">${spark(PV.series(hereJ, S.sel, S.year), S.month)}<small>${esc(tr('vs_byMonth', yearLabel(S.year)))}</small></div>`;
    }
    const setHere = ll => { if (!map.hasLayer(layer)) return; const j = PV.cellAt(ll.lat, ll.lng); if (j === hereJ && hereOff === (j < 0)) return; hereJ = j; hereOff = j < 0; drawHere(); };
    let queued = null;
    map.on('mousemove', e => { if (!map.hasLayer(layer)) return; if (!queued) requestAnimationFrame(() => { setHere(queued); queued = null; }); queued = e.latlng; }); // layer off: no frame per mouse move
    map.on('click', e => setHere(e.latlng));
    const nextMonth = () => { const nm = S.year === 'avg' ? 12 : PV.nmOf(S.year); return S.month >= nm - 1 ? 0 : S.month + 1; }; // 2026: January–July
    function play(on) {
      clearInterval(playing); playing = null;
      if (on && map.hasLayer(layer)) { playing = setInterval(() => { S.month = nextMonth(); redraw(); }, 1100); prep(); }
      else { nxt = null; for (const t of tiles.values()) t.next = t.nextKey = null; } // the buffers ahead go
      drawLegend();
    }
    let resume = false; // the months stop playing while the app is in the background (the WebView's timers keep running), and go on when it is back
    document.addEventListener('visibilitychange', () => { if (document.hidden) { resume = !!playing; if (playing) play(false); } else if (resume) { resume = false; play(true); } });
    layer.on('add', () => { drawLegend(); drawChips(); }); // not redraw(): Leaflet has just drawn every tile (createTile), a second pass doubled the cost
    layer.on('remove', () => { play(false); hereJ = -1; hereOff = false; drawLegend(); });

    /* Ports, harbours, anchorages, ferry routes (OpenStreetMap seamarks; Eurostat port calls via EMODnet) */
    map.createPane('vesselmarks').style.zIndex = 427; // over the protected areas (425), under sightings and spots
    const marks = L.layerGroup(), mp = 'vesselmarks';
    const pairs = a => { const o = []; for (let k = 0; k < a.length; k += 2) o.push([a[k], a[k + 1]]); return o; };
    const LINE = { ferry: { color: '#7fd1ff', weight: 2, dashArray: '7 6', opacity: .9 }, track: { color: '#e6e6e6', weight: 1.5, dashArray: '2 4', opacity: .85 }, tss: { color: '#ff7b6b', weight: 2, opacity: .9 } };
    // The dots are drawn in the spots' canvas (map.js spotRenderer): every canvas covers the whole map, so one of their own, under it,
    // never got a tap (it went to the map: the fishing card). Hit area: 10 px around the dot, a fingertip.
    const Dot = L.CircleMarker.extend({ _clickTolerance() { return this.options.weight / 2 + 10; } }), dot = { renderer: spotRenderer, bubblingMouseEvents: false };
    function buildMarks() { // once the data is there (ready)
      const SM = V.seamarks || { lines: [], areas: [], points: [] };
      for (const [kind, ...ll] of SM.areas) L.polygon(pairs(ll), { pane: mp, color: kind === 'tss' ? '#ff7b6b' : '#ffd166', weight: 1.3, dashArray: '4 3', fillColor: '#ffd166', fillOpacity: .12, bubblingMouseEvents: false })
        .bindTooltip(() => tr(kind === 'tss' ? 'vs_tss' : 'vs_anchorage'), { sticky: true }).addTo(marks);
      for (const [kind, name, ...ll] of SM.lines) L.polyline(pairs(ll), { pane: mp, ...LINE[kind], bubblingMouseEvents: false })
        .bindTooltip(() => `${tr('vs_' + kind)}${name ? ': ' + esc(name) : ''}`, { sticky: true }).addTo(marks);
      for (const [kind, name, nameEl, lat, lon, cat] of SM.points) new Dot([lat, lon], kind === 'anchorage'
        ? { ...dot, radius: 4, color: '#ffd166', weight: 1.5, fillColor: '#1b1b1b', fillOpacity: .8 }
        : { ...dot, radius: 4, color: '#7fd1ff', weight: 1.5, fillColor: '#7fd1ff', fillOpacity: .55 })
        .bindTooltip(() => { const n = el() && nameEl || name; return kind === 'anchorage' ? `${tr('vs_anchorage')}${n ? ': ' + esc(n) : ''}` : `${n ? `<b>${esc(n)}</b> · ` : ''}${esc(tr('vs_cat')[cat] || tr('vs_harbour'))}`; }).addTo(marks);
      // A port's numbers: phones show them in the sheet, as a tapped place (ui.js openSpot); wide screens in a popup
      for (const p of V.ports || []) new Dot([p.lat, p.lon], { ...dot, radius: 7, color: '#ffffff', weight: 2, fillColor: '#7fd1ff', fillOpacity: .35 })
        .bindTooltip(() => esc(PORT_EL[p.name]?.[el() ? 1 : 0] || p.name))
        .on('click', e => { if (isPhone() && window.PsMobile) { e.target.closeTooltip(); PsMobile.showHtml(portHtml(p)); } else L.popup({ className: 'vs-port-pop', maxWidth: 260 }).setLatLng([p.lat, p.lon]).setContent(portHtml(p)).openOn(map); })
        .addTo(marks);
    }
    const portHtml = p => {
      const nm = PORT_EL[p.name]?.[el() ? 1 : 0] || p.name, calls = Object.entries(p.calls).filter(([k]) => k !== 'Total').sort((a, b) => b[1] - a[1]);
      return `<div class="spot-pop vs-port"><b>${esc(nm)}</b><p>${esc(tr('vs_calls', p.calls.Total ?? calls.reduce((s, c) => s + c[1], 0), p.year))}</p>` + // laid out as a place's popup (app.css .spot-pop)
        (calls.length ? `<p class="vs-calls">${calls.map(([k, n]) => `${esc(SHIP_EL[k]?.[el() ? 1 : 0] || k)} ${n}`).join(' · ')}</p>` : '') +
        [p.thousand_of_tonnes != null && tr('vs_goods', nf(p.thousand_of_tonnes, 0)), p.pasf_1000 != null && tr('vs_pax', nf(p.pasf_1000, 0))].filter(Boolean).map(s => `<p>${esc(s)}</p>`).join('') +
        `<small class="hint">${esc(tr('vs_portSrc'))}, CC BY 4.0</small></div>`;
    };

    /* Register with the app's layer switch: ship traffic is a colour field like waves / rain / temperature (one at a time, fishing colours dimmed).
       Both layers are null to the app until the data has loaded; turning one on loads it, then shows it. */
    LAYER_OBJ.vessels = () => PV && layer; LAYER_OBJ.shipmarks = () => PV && marks;
    if (typeof FIELDS !== 'undefined' && !FIELDS.includes('vessels')) FIELDS.push('vessels');
    const dim = () => { if (typeof setHeatOp === 'function') setHeatOp(); };
    box.checked = !!state.layers.vessels; mbox.checked = !!state.layers.shipmarks;
    box.addEventListener('change', () => {
      state.layers.vessels = box.checked;
      if (box.checked && typeof FIELDS !== 'undefined') for (const f of FIELDS) if (f !== 'vessels' && state.layers[f]) { state.layers[f] = false; const b = $('#lay-' + f); if (b) b.checked = false; applyLayer(f); }
      applyLayer('vessels'); dim(); drawChips(); savePrefs();
      if (box.checked && !PV) need(() => { applyLayer('vessels'); dim(); });
    });
    mbox.addEventListener('change', () => { state.layers.shipmarks = mbox.checked; applyLayer('shipmarks'); savePrefs(); if (mbox.checked && !PV) need(() => applyLayer('shipmarks')); });
    layer.on('add remove', () => { box.checked = map.hasLayer(layer); drawChips(); }); // another field switched it off
    if (state.layers.vessels || state.layers.shipmarks) need(() => { if (state.layers.vessels) { applyLayer('vessels'); dim(); } if (state.layers.shipmarks) applyLayer('shipmarks'); });
    drawChips(); drawLegend();
    $('#lang').addEventListener('click', () => { drawLegend(); for (const b of chips.querySelectorAll('[data-k]')) b.textContent = tr('vs_' + b.dataset.k); }); // after js/ui.js applyLang

    /* "Ship traffic here" in the spot drawer (desktop) and the spot sheet (phones): every type in this 1 km cell for the layer's year and month */
    let foldOpen = false;
    function foldBody(j) {
      const rd = PV.isRd(S.year), ts = rd ? RD.groups : PV.types.filter(t => t !== 'all');
      const rows = ts.map(t => [t, PV.cellValue(j, [t], S.year, S.month)]), all = PV.cellValue(j, ['all'], S.year, S.month);
      const on = rows.filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]), off = rows.filter(r => !(r[1] > 0)), mx = on[0]?.[1] || 1;
      const u = v => withUnit(v, rd);
      // app.css .bar (as the score breakdown), filled in the map's colour for that value; divs, not p: the host .fold styles its paragraphs
      return `<div class="vs-fold-body"><div class="hint">${esc(tr('vs_cell'))} · ${esc(when())} · ${esc(tr(rd ? 'vs_passages' : 'vs_hours'))}</div>` +
        (on.length ? `<ul class="vs-rows">${on.map(([t, v]) => `<li><span>${esc(typeName(t))}</span><span class="bar"><i style="width:${Math.max(3, Math.round(Math.log10(1 + v) / Math.log10(1 + mx) * 100))}%;background:rgb(${rgba(v).slice(0, 3)})"></i></span><b>${esc(u(v))}</b></li>`).join('')}</ul>` : '') +
        (off.length ? `<div class="hint">${esc(tr('vs_zero'))}: ${off.map(r => esc(typeName(r[0]))).join(', ')}</div>` : '') +
        `<div class="vs-hspark"><span>${esc(tr('vs_allShips'))} <b>${esc(Number.isNaN(all) ? tr('vs_nodata') : u(all))}</b></span>${spark(PV.series(j, ['all'], S.year), S.month, 132, 24)}<small>${esc(tr('vs_byMonth', yearLabel(S.year)))}</small></div>` +
        `<div class="hint">${esc(tr('vs_note'))} ${rd ? 'EMSA' : 'EMODnet'}, CC BY 4.0.</div></div>`;
    }
    function addFold(host) {
      const body = host.querySelector('.drawer-body');
      if (!body || body.querySelector('.vs-fold') || typeof sel !== 'object' || sel.i < 0 || typeof latOf !== 'function') return;
      if (!state.layers.vessels) return; // round 17 G: a spot's ship traffic only while the Ship traffic layer is on (Layers → More layers → Ships)
      const la = latOf(sel.i), lo = lonOf(sel.i);
      if (PV ? PV.cellAt(la, lo) < 0 : !BOUNDS.contains([la, lo])) return; // before the data has loaded: inside the traffic grid's frame
      const d = document.createElement('details'), sum = () => `${typeof ic === 'function' ? ic('chevron-right') : ''}${esc(tr('vs_fold'))}${PV ? ` · ${esc(when())}` : ''}`;
      d.className = 'fold vs-fold'; d.open = foldOpen;
      d.innerHTML = `<summary>${sum()}</summary>`;
      const fill = () => { if (d.open) need(() => { // loaded and decoded only when opened
        if (d.querySelector('.vs-fold-body')) return;
        const j = PV.cellAt(la, lo); d.firstElementChild.innerHTML = sum();
        d.insertAdjacentHTML('beforeend', j < 0 ? `<div class="vs-fold-body hint">${esc(tr('vs_none'))}</div>` : foldBody(j));
      }); };
      d.addEventListener('toggle', () => { foldOpen = d.open; fill(); });
      d.refresh = () => { d.firstElementChild.innerHTML = sum(); d.querySelector('.vs-fold-body')?.remove(); fill(); }; // refreshFolds()
      body.insertBefore(d, body.querySelector(':scope > .fold.more')); fill(); // before the details' More fold (js/ui.js)
    }
    // The layer's year or month changed (redraw): an open drawer keeps its parts until the spot changes (js/ui.js), so the fold follows here.
    function refreshFolds() { for (const d of document.querySelectorAll('.vs-fold')) d.refresh?.(); }
    for (const s of ['#drawer', '#m-spot']) { const host = document.querySelector(s); if (host) new MutationObserver(() => addFold(host)).observe(host, { childList: true }); }
  }
}
