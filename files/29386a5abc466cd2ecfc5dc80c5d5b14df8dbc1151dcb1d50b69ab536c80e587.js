'use strict';
// Psarema: the bait ranking behind PsAreaGear.baits / baitsHtml / approach (js/area-gear.js loads this file on first use, with the gear
// files and data/area-baits.js: nothing of it is in the first load). window.PsAreaBaits(H) → { ready, baits, baitsHtml, approach }; H = the
// helpers of js/area-gear.js. Checked by scripts/check-area-gear.js; against open catch reports by scripts/baits/validate.mjs.
/* global state, hours, F, bil, NN, clarityM, habK, HAB, dFit, idxAt, likelyAt, byId, pill, ring, lureImg (app globals of js/core.js, model.js, ui.js; each is optional) */
window.PsAreaBaits = ({ D, AREAS, lang, L, E, t, num, areaAt, name, fish, inSeason, gearName }) => {
  /* ---------- Best baits here now (round 10b): a small, open ranking model ----------
     PsAreaGear.baits(areaId, { sp, mode, month, hour, cell, cond, kinds, limit }) → [{ gear, name, kind: 'bait' | 'lure' | 'rig', score 0..100,
       why: [text], when: text, src: [{ title, url }], notes: [{ text, pts, basis: 'src' | 'rule' }], note, fish: [ids] }], best first.
       sp: a fish id or 'all' (the fish biting here now); mode 'shore' | 'boat' ('spear' → []: see approach); month 1–12; hour 0–23 or
       'dawn' | 'day' | 'dusk' | 'night'; cell: a sea cell index (js/core.js) for the seabed and depth there, else the area's own mix;
       cond { wave (m), clear (true | false), sst (°C) }: else the forecast hour on show, when month and hour are not given.
     PsAreaGear.baitsHtml(areaId, opts) → html, in every case (it fills itself in once the gear files have loaded).
     PsAreaGear.approach(areaId, opts)  → spearfishing: [{ fish, name, text, gun }] (technique and approach, no baits).
     The score: a start value from where the advice comes from (this coast's researched list > the fish's Cyprus-wide guide; first pick
     highest), then points for the fish's food, the month, the hour, the seabed and depth, the sea state, open catch reports and your own
     catch log. The facts and their sources are in data/area-baits.js (PSAREMA_BAIT_MODEL); a line of basis 'rule' is a rule of thumb, not a
     source. Checked against open catch reports by scripts/baits/validate.mjs (eval/LOG.md "Round 10b baits"). */
  const TB = {
    en: { title: 'Best baits here now', spearTitle: 'How to hunt here now', bait: 'Bait', lure: 'Lure', rig: 'Rig', dawn: 'dawn', day: 'day', dusk: 'dusk', night: 'night',
      bed: { rock: 'rock', seagrass: 'seagrass', coarse: 'gravel', sand: 'sand', mud: 'mud' }, rough: 'rough', calm: 'calm', murky: 'murky water', clear: 'clear water',
      local: a => `Researched for ${a}`, localGp: a => `Usual practice in ${a}`, wide: f => `From the Cyprus-wide guide for ${f}`, notLocal: 'Not among this coast’s own picks',
      listed: 'The area’s gear guide lists it', food2: c => `Its main food: ${c}`, food1: c => `It also eats ${c}`, food0: c => `Not its food (${c})`,
      foods: { fish: 'small fish', crust: 'shrimps and crabs', moll: 'shellfish', worm: 'worms', ceph: 'squid and octopus', plant: 'weed' },
      noteM: 'The guide names this month for it', noteMx: 'The guide names other months for it', noteH: p => `The guide says: ${p}`, noteHx: p => `The guide says ${p}, not now`,
      noteMode: m => `The guide’s advice is for the ${m}`, at: { dawn: 'at dawn', day: 'by day', dusk: 'at dusk', night: 'at night' }, lightP: p => `Good ${p}`, lightM: p => `Weak ${p}`, bedP: b => `Suits the ${b} here`, bedM: b => `Poor over ${b}`,
      shallow: d => `Too shallow here (${d} m)`, deep: d => `Too deep here (${d} m)`, roughP: 'Good in rough water', roughM: 'Poor in rough water', calmP: 'Good in calm water',
      murkyP: 'Good in murky water', murkyM: 'Poor in murky water', clearP: 'Good in clear water', availP: f => `${f} in season: fresh bait at hand`, availM: f => `${f} out of season: frozen only`,
      seenOnly: 'In no guide: named by an angler’s catch report', seen: s => `An angler’s report: caught on it (${s})`, seenHere: s => `Caught on it here (${s})`, mine: n => `Your log: ${n} caught on it`, mineHere: n => `Your log: ${n} caught on it here`,
      forFish: f => `For ${f}`, when: 'Best', more: n => `${n} more · why`, whyThese: 'Why these', rigs: 'Rig', none: 'No bait advice for this fish here yet.', spearNone: 'No spearfishing notes for this fish yet.',
      foot: 'Ranked from this coast’s guides, the fish’s food, the month, the hour, the seabed and the sea. ~ marks a rule of thumb, not a source.',
      fishbase: 'FishBase', guide: 'fish guide', gun: 'Gun', vis: m => `visibility ~${m} m`, biting: 'Biting here now', typical: 'typical sea temperature' },
    el: { title: 'Τα καλύτερα δολώματα εδώ τώρα', spearTitle: 'Πώς να ψαρέψετε εδώ τώρα', bait: 'Δόλωμα', lure: 'Τεχνητό', rig: 'Σύνθεση', dawn: 'χάραμα', day: 'μέρα', dusk: 'σούρουπο', night: 'νύχτα',
      bed: { rock: 'βράχος', seagrass: 'ποσειδωνία', coarse: 'χαλίκι', sand: 'άμμος', mud: 'λάσπη' }, rough: 'κύμα', calm: 'μπουνάτσα', murky: 'θολά νερά', clear: 'καθαρά νερά',
      local: a => `Από έρευνα για: ${a}`, localGp: a => `Συνήθης πρακτική: ${a}`, wide: f => `Από τον παγκύπριο οδηγό: ${f}`, notLocal: 'Δεν είναι στις επιλογές αυτής της ακτής',
      listed: 'Το αναφέρει ο οδηγός εξοπλισμού της περιοχής', food2: c => `Η κύρια τροφή του: ${c}`, food1: c => `Τρώει επίσης ${c}`, food0: c => `Δεν είναι τροφή του (${c})`,
      foods: { fish: 'μικρά ψάρια', crust: 'γαρίδες και καβούρια', moll: 'όστρακα', worm: 'σκουλήκια', ceph: 'καλαμάρι και χταπόδι', plant: 'φύκια' },
      noteM: 'Ο οδηγός αναφέρει αυτόν τον μήνα', noteMx: 'Ο οδηγός αναφέρει άλλους μήνες', noteH: p => `Ο οδηγός λέει: ${p}`, noteHx: p => `Ο οδηγός λέει ${p}, όχι τώρα`,
      noteMode: m => `Η συμβουλή του οδηγού είναι για: ${m}`, at: { dawn: 'το χάραμα', day: 'τη μέρα', dusk: 'το σούρουπο', night: 'τη νύχτα' }, lightP: p => `Καλό ${p}`, lightM: p => `Αδύναμο ${p}`, bedP: b => `Ταιριάζει εδώ: ${b}`, bedM: b => `Δεν ταιριάζει: ${b}`,
      shallow: d => `Πολύ ρηχά εδώ (${d} m)`, deep: d => `Πολύ βαθιά εδώ (${d} m)`, roughP: 'Καλό με κύμα', roughM: 'Αδύναμο με κύμα', calmP: 'Καλό με μπουνάτσα',
      murkyP: 'Καλό σε θολά νερά', murkyM: 'Αδύναμο σε θολά νερά', clearP: 'Καλό σε καθαρά νερά', availP: f => `${f} σε εποχή: φρέσκο δόλωμα`, availM: f => `${f} εκτός εποχής: μόνο κατεψυγμένο`,
      seenOnly: 'Σε κανέναν οδηγό: το αναφέρει ψαριά ψαρά', seen: s => `Αναφορά ψαρά: πιάστηκε με αυτό (${s})`, seenHere: s => `Πιάστηκε με αυτό εδώ (${s})`, mine: n => `Οι ψαριές σας: ${n} με αυτό`, mineHere: n => `Οι ψαριές σας: ${n} με αυτό εδώ`,
      forFish: f => `Για: ${f}`, when: 'Καλύτερα', more: n => `Άλλα ${n} · γιατί`, whyThese: 'Γιατί αυτά', rigs: 'Σύνθεση', none: 'Δεν υπάρχει ακόμη συμβουλή δολώματος για αυτό το ψάρι εδώ.', spearNone: 'Δεν υπάρχουν ακόμη σημειώσεις ψαροντούφεκου για αυτό το ψάρι.',
      foot: 'Κατάταξη από τους οδηγούς της ακτής, την τροφή του ψαριού, τον μήνα, την ώρα, τον βυθό και τη θάλασσα. Το ~ σημαίνει εμπειρικός κανόνας, όχι πηγή.',
      fishbase: 'FishBase', guide: 'οδηγός ψαριού', gun: 'Όπλο', vis: m => `ορατότητα ~${m} m`, biting: 'Τσιμπούν εδώ τώρα', typical: 'τυπική θερμοκρασία θάλασσας' },
  };
  const tb = (k, ...a) => { const v = TB[lang()][k] ?? TB.en[k]; return typeof v === 'function' ? v(...a) : v; };
  const BM = () => window.PSAREMA_BAIT_MODEL, AB = () => window.PSAREMA_AREA_BAITS, GEARS = () => window.PSAREMA_GEAR || {}, CAT = () => window.PSAREMA_GEAR_CATALOG || {};
  const ready = () => !!(BM() && AB());
  const PER = ['dawn', 'day', 'dusk', 'night'], MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  // Cyprus clock times of sunrise and sunset by month (to ~15 min, summer time included) and the typical sea temperature: only used when
  // the app has no forecast hour to read them from (an hour given by hand, or node).
  const RISE = [6.9, 6.5, 5.9, 6.2, 5.7, 5.5, 5.7, 6.1, 6.4, 6.8, 6.3, 6.7], SET = [16.9, 17.4, 17.8, 19.2, 19.6, 19.9, 19.9, 19.5, 18.8, 18.1, 16.7, 16.6];
  const SST = [17.5, 17, 17.5, 19, 21.5, 25, 27.5, 28.5, 27.5, 25, 22, 19];
  const periodOf = (h, m) => h < RISE[m - 1] - 1 || h > SET[m - 1] + 1 ? 'night' : h <= RISE[m - 1] + 1.5 ? 'dawn' : h >= SET[m - 1] - 1.5 ? 'dusk' : 'day'; // as js/calendar.js
  const tx = k => t(k);
  const rawFish = id => (typeof byId === 'function' && byId(id)) || (window.PSAREMA_SPECIES || []).find(x => x.id === id);

  // What a guide note says about months, hours and method, read from its English text. ponytail: word matching, not parsing; a note that
  // names no month or hour gives no points either way. Upgrade path: months / hours fields on the entries of data/area-baits.js.
  const noteFacts = new WeakMap();
  function factsOf(note) {
    if (!note || typeof note !== 'object') return {};
    let f = noteFacts.get(note); if (f) return f;
    const s = String(note.en || '').toLowerCase(), months = new Set(), per = new Set();
    for (const m of s.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:[–-]|to)\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/g))
      for (let a = MON.indexOf(m[1]), b = MON.indexOf(m[2]), k = a; ; k = (k + 1) % 12) { months.add(k + 1); if (k === b) break; }
    for (const [w, ms] of [['winter', [12, 1, 2]], ['spring', [3, 4, 5]], ['summer', [6, 7, 8]], ['autumn', [9, 10, 11]]]) if (s.includes(w)) ms.forEach(m => months.add(m));
    if (/\bnight|after dark|in the dark\b/.test(s)) per.add('night');
    if (/\bdusk|sunset|evening\b/.test(s)) per.add('dusk');
    if (/\bdawn|first light|sunrise|early morning\b/.test(s)) per.add('dawn');
    if (/\bby day|daytime|daylight|midday|mornings?\b|afternoon/.test(s)) per.add('day');
    const boat = /\bboat|\btroll|\banchor|\bdrift/.test(s), shore = /\bshore|from the (rocks|beach|breakwater|pier|mole)|\bsurf|breakwater|\bpier/.test(s);
    noteFacts.set(note, f = { months, per, mode: boat && !shore ? 'boat' : shore && !boat ? 'shore' : null });
    return f;
  }

  // Where and when: the method, month, light, seabed mix, depth and sea state the ranking is for.
  function ctx(areaId, o = {}) {
    const st = typeof state === 'object' ? state : null, now = new Date(), A = D[areaId], a = AREAS.find(x => x.id === areaId);
    const live = o.month == null && o.hour == null && st && typeof hours !== 'undefined' && hours?.[st.h] ? hours[st.h] : null; // the forecast hour on show
    const month = o.month || (live ? new Date(live.t).getMonth() + 1 : now.getMonth() + 1);
    const period = PER.includes(o.hour) ? o.hour : o.hour != null ? periodOf(+o.hour, month) : live?.period || periodOf(now.getHours() + now.getMinutes() / 60, month);
    const mode = ['shore', 'boat', 'spear'].includes(o.mode) ? o.mode : st?.mode || 'shore';
    const cell = Number.isInteger(o.cell) && o.cell >= 0 ? o.cell : -1, bed = {}; let depth = null;
    if (cell >= 0 && typeof habK !== 'undefined' && typeof HAB !== 'undefined' && HAB) { // the cell's seabed: its class and its rock / seagrass cover (js/core.js habK)
      const k = habK[cell], cls = HAB.classes[k / 121 | 0], r = (k % 121 / 11 | 0) / 10, g = k % 11 / 10, rest = 1 - r - g;
      if (r) bed.rock = r; if (g) bed.seagrass = g;
      if (rest > 0 && TB.en.bed[cls]) bed[cls] = (bed[cls] || 0) + rest;
      depth = typeof dFit !== 'undefined' ? dFit[cell] : null;
    } else if (A?.facts) { // no cell: the area's own mix (data/area-gear.js facts): its coast from the shore, its 0–40 m seabed from a boat
      const f = A.facts, c = f.coast || {}, hard = (c.rocky || 0) + (c.made || 0) + (c.port || 0), all = hard + (c.beach || 0);
      if (mode === 'shore' && all) { bed.rock = hard / all; bed.sand = (c.beach || 0) / all; }
      else { bed.rock = f.rock / 100; bed.seagrass = f.pos / 100; bed.sand = Math.max(0, 1 - bed.rock - bed.seagrass); }
    }
    let wave = o.cond?.wave ?? null, clear = o.cond?.clear ?? null, sst = o.cond?.sst ?? null, typical = false;
    if (!o.cond && live && typeof F !== 'undefined' && F && typeof bil === 'function') try { // as ui.js spotLures: clarity from chlorophyll and the last day's waves
      const i = cell >= 0 ? cell : a ? idxAt(a.lat, a.lon) : -1, k = st.h * NN;
      if (i >= 0) { wave = bil(F.wave, k, i); sst = bil(F.sst, k, i); const vis = clarityM(i), stir = bil(F.vis, k, i);
        clear = (Number.isNaN(vis) ? 1 : Math.min(1, Math.max(0, (vis - 5) / 15))) * (Number.isNaN(stir) ? 1 : stir) >= .45; }
    } catch (e) { /* a layer not loaded yet: go on without the sea state */ }
    if (!(sst > 0)) { sst = SST[month - 1]; typical = true; }
    const top = Object.entries(bed).sort((x, y) => y[1] - x[1])[0];
    return { areaId, mode, month, period, cell, bed, bedTop: top && top[1] >= .35 ? top[0] : null, depth: depth > 0 ? depth : null, wave: wave >= 0 ? wave : null, sst, typical,
      rough: wave >= .8, calm: wave != null && wave < .3, murky: clear === false, clear: clear === true, cold: sst < 18.5, warm: sst >= 24, evidence: o.evidence !== false,
      current: o.month == null && o.hour == null };
  }

  // One bait, lure or rig for one fish: its start value and the points each fact adds or takes.
  function scoreOne(x, fid, c) {
    const M = BM(), t = M.traits[x.gear] || {}, R = M.rules, notes = [], src = new Map(), kind = t.rig ? 'rig' : t.lure ? 'lure' : 'bait', s = rawFish(fid), fn = fish(fid);
    let v = x.base;
    const cite = (title, url) => { if (title && !src.has(url || title)) src.set(url || title, { title, url: url || '' }); };
    const say = (pts, text, basis = 'rule') => { if (!pts && pts !== 0) return; v += pts; const o = text && notes.find(n => n.text === text); if (o) o.pts += pts; else if (text) notes.push({ pts, text, basis }); };
    const rule = (pts, key, plain) => { const q = pts && R[key]; if (q) { say(pts, L(q), q.basis); for (const k of q.src || []) cite(M.src[k]?.t, M.src[k]?.u); } else if (pts) say(pts, plain); };
    // where the advice comes from
    if (x.local) { const ks = (x.srcKeys || []).map(k => window.PSAREMA_AREA_BAIT_SOURCES?.[k]).filter(Boolean); ks.forEach(q => cite(q.t, q.u));
      say(0, tb(ks.length ? 'local' : 'localGp', name(c.areaId)), ks.length ? 'src' : 'rule'); }
    else if (x.seenOnly) say(0, tb('seenOnly'), 'src');
    else if (x.usual) say(0, x.usual, 'rule'); // round 13 lures (js/lures.js): a lure in no guide for this fish, scored on its family's traits
    else { say(0, x.notLocal ? tb('notLocal') : tb('wide', fn), x.notLocal ? 'rule' : 'src');
      for (const u of (GEARS()[fid]?.sources || []).slice(0, 2)) cite(`${tb('guide')}: ${u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}`, u); }
    const listed = D[c.areaId]?.methods[c.mode], li = listed && (listed.best.find(i => i.gear === x.gear) ? 3 : listed.also.find(i => i.gear === x.gear) ? 2 : 0);
    if (li) say(li, tb('listed'), 'src');
    // what the guide's own note says about month, hour and method
    const nf = factsOf(x.note);
    if (nf.months?.size) say(nf.months.has(c.month) ? 3 : -6, tb(nf.months.has(c.month) ? 'noteM' : 'noteMx'), 'src');
    if (nf.per?.size) { const ps = [...nf.per].map(p => tb(p)).join(', '); say(nf.per.has(c.period) ? 3 : -4, tb(nf.per.has(c.period) ? 'noteH' : 'noteHx', ps), 'src'); }
    if (nf.mode && nf.mode !== c.mode) say(-6, tb('noteMode', t_(nf.mode)), 'src');
    // the fish's food
    const d = M.diet[fid], lv = d && t.food ? d[t.food] || 0 : null;
    if (lv != null && !t.rig) { if (lv || !t.lure) say(lv === 2 ? 5 : lv === 1 ? 1 : -4, tb('food' + lv, tb('foods')[t.food]), 'src'); // a lure need not look like food: no minus
      if (s?.scientific) cite(`${tb('fishbase')}: ${s.scientific}`, `https://www.${/squid|cuttlefish|octopus/.test(fid) ? 'sealifebase' : 'fishbase'}.se/summary/${s.scientific.replace(/ /g, '-')}.html`); }
    // light
    const lp = t.light?.[PER.indexOf(c.period)] || 0;
    rule(lp, (c.period === 'night' && t.rn) || t.rl, tb(lp > 0 ? 'lightP' : 'lightM', tb('at')[c.period]));
    // seabed and depth
    if (t.bed) { let b = 0, big = null, bv = 0; for (const [k, w] of Object.entries(c.bed)) { const p = (t.bed[k] || 0) * w; b += p; if (Math.abs(p) > Math.abs(bv)) { bv = p; big = k; } }
      b = Math.round(b); if (b) rule(b, t.rb || (b > 0 && kind === 'bait' && { rock: 'rock', seagrass: 'grass', sand: 'sand', mud: 'sand' }[big]), tb(b > 0 ? 'bedP' : 'bedM', tb('bed')[big] || big)); }
    if (t.depth && c.depth != null && (c.depth < t.depth[0] || c.depth > t.depth[1])) rule(-15, null, tb(c.depth < t.depth[0] ? 'shallow' : 'deep', Math.round(c.depth)));
    else if (t.rd && c.depth != null) rule(2, t.rd);
    // sea state and temperature
    if (c.rough && t.rough) rule(t.rough, t.rr, tb(t.rough > 0 ? 'roughP' : 'roughM'));
    if (c.calm && t.calm) rule(t.calm, t.rc, tb('calmP'));
    if (c.murky && t.murky) rule(t.murky, t.rc, tb(t.murky > 0 ? 'murkyP' : 'murkyM'));
    if (c.clear && t.clear) rule(t.clear, t.rc, tb('clearP'));
    if (c.cold) rule(t.cold ?? (t.lure && !t.noTemp ? -3 : 0), t.cold ? t.rw : 'slow');
    if (c.warm) rule(t.warm ?? (t.lure && !t.noTemp ? 3 : 0), t.warm ? t.rw : 'chase');
    // fresh or live bait: is the bait animal itself in season (the app's own season tables)?
    if (t.avail) { const best = t.avail.map(id => [rawFish(id)?.season?.[c.month - 1] ?? .6, id]).sort((p, q) => q[0] - p[0])[0], p = Math.round((best[0] - .6) * 8);
      if (p) say(p, tb(p > 0 ? 'availP' : 'availM', fish(best[1])), 'rule'); }
    if (t.aid) rule(-14, 'aid');
    // what really caught fish: open reports, then your own log
    if (c.evidence) {
      const rows = M.seen.filter(r => r[1] === fid && r[2].length <= 2 && r[2].includes(x.gear)), /* a report that names one or two things, not a family of lures */ here = rows.find(r => r[0] === c.areaId), r = here || rows[0];
      if (r) { say(here ? 6 : 3, tb(here ? 'seenHere' : 'seen', r[4]), 'src'); cite(r[4], r[5]); }
      const mine = (window.PsCatchLog?.all?.() || []).filter(e => e.kind === 'catch' && e.species === fid && e.bait === x.gear);
      if (mine.length) { const nh = mine.filter(e => areaAt(e.lat, e.lon) === c.areaId).length; say(nh ? 8 : 4, tb(nh ? 'mineHere' : 'mine', nh || mine.length), 'src'); }
    }
    // when it is at its best: the fish's active hours with the bait's light points, and the months the note or the fish's season gives
    const act = s?.activity || {}, pv = PER.map((p, i) => [(act[p] ?? .7) * 10 + (t.light?.[i] || 0) + (nf.per?.has(p) ? 4 : 0), p]).sort((p, q) => q[0] - p[0]);
    const ms = nf.months?.size ? nf.months : new Set((s?.season || []).map((w, i) => w >= .8 ? i + 1 : 0).filter(Boolean)), Mn = tx('months');
    const runs = []; for (let m = 1; m <= 12; m++) if (ms.has(m) && !ms.has(m === 1 ? 12 : m - 1)) { let e = m; while (ms.has(e % 12 + 1) && e % 12 + 1 !== m) e = e % 12 + 1; runs.push(e === m ? Mn[m - 1] : `${Mn[m - 1]}–${Mn[e - 1]}`); }
    const when = [pv.filter(p => p[0] >= pv[0][0] - 1.5).slice(0, 2).map(p => tb(p[1])).join(', '), ms.size >= 12 ? tx('allYear') : runs.join(', ')].filter(Boolean).join(' · ');
    const first = notes.shift(); notes.sort((p, q) => Math.abs(q.pts) - Math.abs(p.pts)); notes.unshift(first); // where it comes from first, then the biggest reasons
    return { gear: x.gear, name: gearName(x.gear), kind, score: Math.max(5, Math.min(98, Math.round(v))), why: notes.map(n => n.text), when, src: [...src.values()],
      notes, note: L(x.note), spec: x.spec || '', fish: [fid] };
  }
  const t_ = m => t(m).toLowerCase();

  function forFish(areaId, fid, c) {
    const g = GEARS()[fid] || {}, local = AB()[areaId]?.[fid], tr_ = BM().traits, out = new Map();
    const add = (gear, base, o) => { const q = tr_[gear] || {}; if (!CAT()[gear] || out.has(gear) || (c.mode === 'shore' && q.boat) || (c.mode === 'boat' && q.shore)) return; out.set(gear, { gear, base, ...o }); };
    (local || []).forEach((b, k) => add(b.gear, [78, 68, 61, 55][k] ?? 52, { note: b.note, srcKeys: b.src, local: 1 }));
    (g.baits || []).forEach((b, k) => add(b.gear, (b.best ? 68 : [62, 57, 52, 48, 45][k] ?? 43) - (local ? 6 : 0), { note: b.note, notLocal: !!local }));
    const soft = g.silicone?.use ? (g.silicone.ids || []).map(id => ({ gear: id, size: g.silicone.size })) : [];
    [...(g.lures || []), ...soft].forEach((l, k) => add(l.gear, [64, 58, 53, 49, 46][k] ?? 44, { note: l.note, spec: [l.weight, l.size].filter(Boolean).join(' · ') }));
    (g.setups?.[c.mode]?.rig || []).forEach((r, k) => add(r, [66, 58, 52][k] ?? 48, {}));
    if (c.evidence) for (const r of BM().seen) if (r[1] === fid && r[2].length <= 2) for (const id of r[2]) add(id, 50, { seenOnly: 1 }); // in no guide, but an open report names it
    return [...out.values()].map(x => scoreOne(x, fid, c));
  }
  // 'all': the fish that fit the cell best now (js/model.js likelyAt), else the area's own targets for the method that are in season
  function fishNow(areaId, c) {
    if (c.cell >= 0 && c.current && typeof likelyAt === 'function') { const l = likelyAt(c.cell, c.mode, 4).map(f => f.id).filter(id => GEARS()[id]); if (l.length) return l; }
    const tg = D[areaId]?.methods[c.mode]?.targets || [], on = tg.filter(([, f, to]) => inSeason(f, to, c.month));
    return (on.length ? on : tg).slice(0, 4).map(x => x[0]);
  }
  function baits(areaId, o = {}) {
    if (!ready()) return [];
    const c = ctx(areaId, o); if (c.mode === 'spear') return [];
    const spId = o.sp || (typeof state === 'object' && state.sp) || 'all', fs = spId === 'all' ? fishNow(areaId, c) : [spId], m = new Map();
    fs.forEach((fid, r) => forFish(areaId, fid, c).forEach(x => {
      const e = m.get(x.gear), sc = x.score - 5 * r; // the likeliest fish counts most
      if (!e) m.set(x.gear, { ...x, score: sc }); else { const all = [...e.fish, fid]; if (sc > e.score) Object.assign(e, x, { score: sc }); e.fish = all; }
    }));
    let list = [...m.values()];
    if (spId === 'all') for (const e of list) { e.score = Math.min(98, e.score + Math.min(3, e.fish.length - 1)); const l = tb('forFish', e.fish.map(fish).join(', ')); e.why = [l, ...e.why]; e.notes = [{ pts: 0, text: l, basis: 'src' }, ...e.notes]; }
    if (o.kinds) list = list.filter(e => o.kinds.includes(e.kind));
    list.sort((p, q) => q.score - p.score || p.gear.localeCompare(q.gear));
    return o.limit ? list.slice(0, o.limit) : list;
  }
  // Spearfishing: no baits. The technique and gun for each fish (the fish guides), best target first.
  function approach(areaId, o = {}) {
    if (!ready()) return [];
    const c = ctx(areaId, { ...o, mode: 'spear' }), spId = o.sp || (typeof state === 'object' && state.sp) || 'all';
    return (spId === 'all' ? fishNow(areaId, c) : [spId]).map(fid => { const sp = GEARS()[fid]?.setups?.spear;
      return sp && { fish: fid, name: fish(fid), text: L(sp.notes), gun: [(sp.gun || []).map(gearName).join(', '), sp.length].filter(Boolean).join(' · ') }; }).filter(Boolean);
  }

  const chip = s => typeof ring === 'function' ? ring(s, 'sm') : typeof pill === 'function' ? pill(s) : `<span class="pill">${s}</span>`; // round 14: a dial, as the area page's other lists
  const thumb = id => typeof lureImg === 'function' && window.PSAREMA_GEAR_ART?.[id] ? `<span class="ab-art">${lureImg(id)}</span>` : '';
  function ctxLine(areaId, c, o) {
    const sp = o.sp || (typeof state === 'object' && state.sp) || 'all';
    return [sp === 'all' ? `${tb('biting')}: ${fishNow(areaId, c).map(fish).join(', ')}` : fish(sp), tb(c.period), t('months')[c.month - 1],
      c.mode !== 'spear' && c.bedTop && tb('bed')[c.bedTop] + (c.depth ? ` ${Math.round(c.depth)} m` : ''),
      c.rough ? tb('rough') : c.calm ? tb('calm') : '', c.murky ? tb('murky') : c.clear ? tb('clear') : '', `${num(Math.round(c.sst))} °C${c.typical ? ` (${tb('typical')})` : ''}`].filter(Boolean).join(' · ');
  }
  // A row: the rank, the picture, the name over one short line (bait or lure, when it works best), the score; a tap opens why, the guide's note
  // and the sources (round 11: the reasons left the row, so the list reads at a glance)
  const rowHtml = (e, n) => `<li class="ab-row"><details data-g="${E(e.gear)}"><summary><span class="ab-n">${n}</span>${thumb(e.gear)}<span class="ab-name"><b>${E(e.name)}</b>` +
    `<small>${E(tb(e.kind))}${e.when ? ' · ' + E(e.when) : ''}</small></span>${chip(e.score)}</summary><div class="ab-more">` +
    `<ul class="ab-why">${e.notes.slice(0, 6).map(n => `<li class="${n.pts < 0 ? 'neg' : n.pts > 0 ? 'pos' : ''}">${n.basis === 'rule' ? '<i title="~">~</i> ' : ''}${E(n.text)}</li>`).join('')}</ul>` +
    (e.spec ? `<p class="hint">${E(typeof specText === 'function' ? specText(e.spec) : e.spec)}</p>` : '') + (e.note ? `<p class="ab-note">${E(e.note)}</p>` : '') +
    (e.src.length ? `<p class="hint ab-src">${E(t('sources'))}: ${e.src.map(s => s.url ? `<a href="${E(s.url)}" target="_blank" rel="noopener">${E(s.title)}</a>` : E(s.title)).join(' · ')}</p>` : '') +
    `</div></details></li>`;
  // o.limit (or o.top): how many rows show, 3 by default; the rest, the rig, what the ranking read (fish, hour, month, seabed, sea) and how it
  // ranks fold behind "More". o.compact: no heading (a page with its own, js/areas.js).
  function baitsHtml(areaId, o = {}) {
    const c = ctx(areaId, o), head = k => o.compact ? '' : `<div class="ab-head"><b>${E(tb(k))}</b></div>`, ctxP = `<p class="hint">${E(ctxLine(areaId, c, o))}</p>`;
    if (c.mode === 'spear') { const ap = approach(areaId, o), tips = L(D[areaId]?.methods.spear?.tips);
      return `<div class="ab ab-spear" data-area="${E(areaId)}">${head('spearTitle')}` + (ap.length ? `<ol class="ab-list">${ap.map((a, i) => `<li class="ab-row"><details${i ? '' : ' open'}><summary><span class="ab-n">${i + 1}</span>` +
        `<span class="ab-name"><b>${E(a.name)}</b><small>${E(tb('gun'))}: ${E(a.gun)}</small></span></summary><div class="ab-more"><p class="ab-note">${E(a.text)}</p></div></details></li>`).join('')}</ol>` : `<p class="hint">${E(tb('spearNone'))}</p>`) +
        (tips && !o.noTips ? `<p class="ab-note">${E(tips)}</p>` : '') + `</div>`; }
    const all = baits(areaId, o), hooks = all.filter(e => e.kind !== 'rig'), rig = all.find(e => e.kind === 'rig'), n = Math.max(1, o.limit || o.top || 3);
    for (const k of ['lure', 'bait']) { const i = hooks.findIndex(e => e.kind === k); if (i >= n && n > 1) hooks.splice(n - 1, 0, ...hooks.splice(i, 1)); } // the best lure and the best natural bait are always shown: anglers fish one or the other
    const rest = hooks.slice(n, n + 6);
    if (!hooks.length) return `<div class="ab" data-area="${E(areaId)}">${head('title')}<p class="hint">${E(tb('none'))}</p></div>`;
    return `<div class="ab${o.compact ? ' ab-compact' : ''}" data-area="${E(areaId)}" data-mode="${E(c.mode)}">${head('title')}<ol class="ab-list">${hooks.slice(0, n).map((e, i) => rowHtml(e, i + 1)).join('')}</ol>` +
      `<details class="ab-rest"><summary>${E(rest.length ? tb('more', rest.length) : tb('whyThese'))}</summary>` +
      (rest.length ? `<ol class="ab-list" start="${n + 1}">${rest.map((e, i) => rowHtml(e, n + i + 1)).join('')}</ol>` : '') +
      (rig ? `<p class="ab-rig"><span class="lbl">${E(tb('rigs'))}</span> <b>${E(rig.name)}</b> ${chip(rig.score)} <span class="hint">${E(rig.notes.slice(1).filter(x => x.pts > 0)[0]?.text || '')}</span></p>` : '') +
      ctxP + `<p class="hint ab-foot">${E(tb('foot'))}</p></details></div>`;
  }

  return { ready, baits, baitsHtml, approach, ctx, fishNow, score: scoreOne }; // ctx, fishNow, score: for js/lures.js (round 13)
};
