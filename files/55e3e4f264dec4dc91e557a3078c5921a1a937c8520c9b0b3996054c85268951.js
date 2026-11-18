'use strict';
// Psarema: what the score rests on (round 10). Two things for the UI, both read-only and cheap (nothing here runs per map cell):
//
// 1. window.PsFeeds: every live input with its source, resolution, age and state.
//      PsFeeds.list()      -> [{ id, label, source, res, at (ms; 0 = none), ageH, via, state: 'fresh' | 'aging' | 'stale' | 'missing', error, text }]
//                             ids: wind, waves, current, sst, chl, depthTemp, obs, astro, own (the sea and wind of the last 24 h come with the forecast: wind / waves).  text: "Sea temperature: satellite, 1 km, 14 h old"
//      PsFeeds.get(id)     -> one of them;  PsFeeds.quality() -> 0..1, how fresh the inputs the score leans on are
//      document 'ps:feeds' fires when a feed has new data (js/sources.js) and when measured wind arrives ('ps:obs').
//
// 2. scoreInfo(i, h, P = cur) -> everything a card needs about one cell-hour, the score itself unchanged:
//      { score,                      the map's score (scoreAt)
//        lo, hi,                     the score if wind and sea come in one standard error rougher / calmer than forecast
//        conf, level,                0..1 and 'low' | 'medium' | 'high'
//        parts: { evidence, place, feeds, weather, lead },   what the confidence is made of, each 0..1
//        reasons: [{ key, text, dir (+1 helps, −1 hurts), w }],   the 3 strongest, strongest first
//        text }                      "72 · medium confidence · SST front 400 m away · swell dropping"
//    null before the forecast is in.
//
// What is measured and what is not (eval/LOG.md round 10):
//  - Wind error: the ICON + IFS mean against the Larnaca, Paphos and Akrotiri airports, 35 days (scripts/verify/wind.mjs): mean absolute
//    error 1.9 kn in the first 12 h, 2.2 kn three days ahead. The two models' disagreement does NOT say when the mean is wrong
//    (r = 0.00-0.09 with the error), so the range uses the measured error by lead time, not the spread.
//  - Wave error: nothing measures waves near Cyprus (no open buoy). 20% + 0.1 m is the usual class for Mediterranean wave models
//    against altimeters: an assumption, marked as such.
//  - The confidence is bookkeeping (how much evidence, how fresh, how far ahead, how much the weather can move the score), not a
//    probability: no test set here can calibrate it. The model itself ranks places only a little better than chance (bench AUC .55-.57),
//    so 'high' needs records or your own catches near the spot.
(() => {
const HOUR = 36e5, KN = 1.852;
Object.assign(I18N.en, {
  conf_low: 'low confidence', conf_medium: 'medium confidence', conf_high: 'high confidence',
  fd_wind: 'Wind, pressure', fd_waves: 'Waves, swell', fd_current: 'Current', fd_sst: 'Sea temperature', fd_chl: 'Plankton, clarity', fd_depthTemp: 'Temperature at depth',
  fd_obs: 'Measured wind', fd_astro: 'Sun, moon, solunar', fd_own: 'Your own catches',
  fd_srcWind: 'ICON-EU + ECMWF models', fd_srcWaves: 'MeteoFrance wave model', fd_srcCurrent: 'Mercator ocean model', fd_srcSat: 'satellite', fd_srcModel: 'Mediterranean ocean model',
  fd_srcObs: 'airport stations', fd_srcCalc: 'computed on the phone', fd_srcLog: 'your log, on this phone only',
  fd_age: h => h < 1 ? 'under 1 h old' : h < 48 ? `${Math.round(h)} h old` : `${Math.round(h / 24)} days old`, fd_none: 'not loaded', fd_now: 'exact',
  fd_trips: n => `${n} ${n === 1 ? 'trip' : 'trips'}`, fd_stations: n => `${n} ${n === 1 ? 'station' : 'stations'}`,
  r_front: d => `SST front ${d} away`, r_settle: 'swell dropping', r_building: 'sea building', r_calm: 'calm sea',
  r_cooled: (d, m) => `water at ${m} m cooling ${d} °C in 2 days`, r_prime: p => `its feeding time (${p})`, r_season: 'in season',
  r_mine: 'your own catches near here', r_mineNo: 'your blank trips near here', r_obs: (st, d) => `wind measured at ${st} is ${d} km/h off the forecast`,
  r_fit: 'the kind of water it likes', r_unfit: 'not its kind of water', r_warmYear: d => `sea ${d} °C warmer than normal`, r_coldYear: d => `sea ${d} °C colder than normal`,
  r_m: m => `${m} m`, r_km: k => `${k} km`,
});
Object.assign(I18N.el, {
  conf_low: 'χαμηλή βεβαιότητα', conf_medium: 'μέτρια βεβαιότητα', conf_high: 'υψηλή βεβαιότητα',
  fd_wind: 'Άνεμος, πίεση', fd_waves: 'Κύμα, αποθαλασσιά', fd_current: 'Ρεύμα', fd_sst: 'Θερμοκρασία θάλασσας', fd_chl: 'Πλαγκτόν, διαύγεια', fd_depthTemp: 'Θερμοκρασία στο βάθος',
  fd_obs: 'Μετρημένος άνεμος', fd_astro: 'Ήλιος, φεγγάρι, ηλιοσεληνιακά', fd_own: 'Οι δικές σας ψαριές',
  fd_srcWind: 'μοντέλα ICON-EU + ECMWF', fd_srcWaves: 'μοντέλο κύματος MeteoFrance', fd_srcCurrent: 'ωκεάνιο μοντέλο Mercator', fd_srcSat: 'δορυφόρος', fd_srcModel: 'μοντέλο Μεσογείου',
  fd_srcObs: 'σταθμοί αεροδρομίων', fd_srcCalc: 'υπολογισμός στο κινητό', fd_srcLog: 'οι καταγραφές σας, μόνο σε αυτό το κινητό',
  fd_age: h => h < 1 ? 'κάτω από 1 ώρα' : h < 48 ? `πριν από ${Math.round(h)} ${Math.round(h) === 1 ? 'ώρα' : 'ώρες'}` : `πριν από ${Math.round(h / 24)} μέρες`, fd_none: 'δεν φορτώθηκε', fd_now: 'ακριβές',
  fd_trips: n => `${n} ${n === 1 ? 'έξοδος' : 'έξοδοι'}`, fd_stations: n => `${n} ${n === 1 ? 'σταθμός' : 'σταθμοί'}`,
  r_front: d => `θερμικό μέτωπο στα ${d}`, r_settle: 'η θάλασσα πέφτει', r_building: 'η θάλασσα σηκώνει', r_calm: 'ήρεμη θάλασσα',
  r_cooled: (d, m) => `το νερό στα ${m} m κρυώνει ${d} °C σε 2 μέρες`, r_prime: p => `η ώρα που τρώει (${p})`, r_season: 'στην εποχή του',
  r_mine: 'δικές σας ψαριές εδώ κοντά', r_mineNo: 'άδειες έξοδοί σας εδώ κοντά', r_obs: (st, d) => `ο άνεμος που μετρήθηκε (${st}) διαφέρει ${d} km/h από την πρόγνωση`,
  r_fit: 'νερά που του ταιριάζουν', r_unfit: 'όχι τα νερά του', r_warmYear: d => `θάλασσα ${d} °C πιο ζεστή από το κανονικό`, r_coldYear: d => `θάλασσα ${d} °C πιο κρύα από το κανονικό`,
  r_m: m => `${m} m`, r_km: k => `${k} km`,
});

/* ---------- Feeds ---------- */
// [id, source key, resolution, hours until 'aging', hours until 'stale', () => { at, via?, n?, error? }]
const obsAll = () => { try { return window.PsObs?.all?.() || []; } catch { return []; } };
const trips = () => { try { return window.PsCatch?.entries?.() || []; } catch { return []; } };
const FEEDS = [
  ['wind', 'fd_srcWind', '7-9 km', 3, 12, () => ({ at: F?.at || 0 })],
  ['waves', 'fd_srcWaves', '8 km', 3, 12, () => ({ at: F?.at || 0 })],
  ['current', 'fd_srcCurrent', '8 km', 3, 12, () => ({ at: F?.at || 0 })],
  ['sst', 'fd_srcSat', '1 km', 36, 72, () => ({ at: sat.sst ? sat.sstDate || surfX?.sst?.date || 0 : 0, via: surfX?.via })],
  ['chl', 'fd_srcSat', '1 km', 48, 96, () => ({ at: sat.chl ? surfX?.chl?.date || sat.sstDate || 0 : 0, via: surfX?.via })],
  ['depthTemp', 'fd_srcModel', '4 km', 12, 36, () => ({ at: sat.oc ? sat.oc.made || Date.now() : 0, via: sat.oc ? 'pack' : sat.bottomT ? 'direct' : '' })],
  ['obs', 'fd_srcObs', '', 1, 3, () => { const a = obsAll(); return { at: a.reduce((m, o) => Math.max(m, o.at), 0), n: a.length }; }],
  ['astro', 'fd_srcCalc', '', Infinity, Infinity, () => ({ at: Date.now() })],
  ['own', 'fd_srcLog', '', Infinity, Infinity, () => { const n = trips().length; return { at: n ? Date.now() : 0, n }; }],
];
function feed([id, src, res, aging, stale, read]) {
  const r = read(), ageH = r.at ? Math.max(0, (Date.now() - r.at) / HOUR) : NaN, state = !r.at ? 'missing' : ageH <= aging ? 'fresh' : ageH <= stale ? 'aging' : 'stale';
  const age = !r.at ? tr('fd_none') : id === 'astro' ? tr('fd_now') : id === 'own' ? tr('fd_trips', r.n) : tr('fd_age', ageH);
  return { id, label: tr('fd_' + id), source: tr(src), res, at: r.at, ageH, via: r.via || '', state, error: r.error || '',
    text: `${tr('fd_' + id)}: ${[tr(src), id === 'obs' && r.n ? tr('fd_stations', r.n) : res, age].filter(Boolean).join(', ')}` };
}
const W_Q = { wind: .25, waves: .2, sst: .25, depthTemp: .15, chl: .1, current: .05 }, Q_STATE = { fresh: 1, aging: .75, stale: .45, missing: .3 };
const PsFeeds = window.PsFeeds = {
  list: () => FEEDS.map(feed), get: id => { const f = FEEDS.find(f => f[0] === id); return f ? feed(f) : null; },
  quality: () => FEEDS.reduce((s, f) => s + (W_Q[f[0]] || 0) * Q_STATE[feed(f).state], 0),
};
document.addEventListener?.('ps:obs', () => document.dispatchEvent(new CustomEvent('ps:feeds')));

/* ---------- One cell-hour: range, confidence, reasons ---------- */
const windSd = lead => (1.9 + .1 * Math.min(lead, 3) + .15 * Math.max(0, lead - 3)) * 1.2533 * KN; // km/h; MAE measured to 3 days (wind.mjs), assumed to keep growing after; sd = MAE·√(π/2)
const waveSd = wave => .2 * wave + .1; // m; assumption (see the header)
function frontDist(i) { // metres to the nearest strong front (frontAt ≥ .5) within 3 km, Infinity when none
  if (!sat.grad) return Infinity;
  const x0 = i % W, y0 = i / W | 0; let best = Infinity;
  for (let y = Math.max(0, y0 - 12); y <= Math.min(H - 1, y0 + 12); y++) for (let x = Math.max(0, x0 - 12); x <= Math.min(W - 1, x0 + 12); x++) {
    const j = y * W + x; if (!depth[j] || frontAt(j) < .5) continue;
    const d = Math.hypot((x - x0) * KX, (y - y0) * KY) * 1000; if (d < best) best = d;
  }
  return best <= 3000 ? best : Infinity;
}
const distTxt = m => m < 950 ? tr('r_m', Math.max(100, Math.round(m / 100) * 100)) : tr('r_km', nf(m / 1000));
function scoreInfo(i, h, P = cur) {
  if (!F || !P?.where || !hours[h]) return null;
  const s = P.s, x = hours[h], k = h * NN, o = {}, score = Math.round(scoreAt(i, h, o, P)), spear = P.spear, R = [], add = (key, dir, w, text) => { if (w > 0) R.push({ key, text, dir, w }); };
  const plus = k => tr('whyPlus')[k], minus = k => tr('whyMinus')[k];
  if (!P.where[i]) return { score: 0, lo: 0, hi: 0, conf: .9, level: 'high', parts: { evidence: 1, feeds: 1, weather: 1, lead: 1 }, reasons: [{ key: 'r_unfit', text: tr('r_unfit'), dir: -1, w: 1 }], text: `0 · ${tr('r_unfit')}` };
  // Range: the sea-state gate one standard error rougher and calmer.
  const lead = Math.max(0, (x.t - Date.now()) / 864e5), sw = windSd(lead), sh = waveSd(o.wEff);
  const gateAt = d => { let g = fGate(Math.max(0, o.wEff + d * sh), Math.max(0, o.wsEff + d * sw), Math.max(0, o.gust + d * 1.5 * sw)); if (spear) g = Math.min(g, 1 - clamp((Math.max(0, o.wEff + d * sh) - .8) / .8)); return g; };
  const lo = Math.round(Math.min(score, o.pre * gateAt(1))), hi = Math.round(Math.max(score, Math.min(100, o.pre * gateAt(-1))));
  // Confidence.
  const nRec = s.all ? 300 : (SIGHT[s.id] || []).length, pc = (window.PsPersonal || window.PsCatch)?.correction(s.id), mine = window.PsPersonal?.confAt(s.id, i) || 0;
  const parts = { evidence: clamp(.15 + .3 * clamp(Math.log10(1 + nRec) / 3) + .35 * P.seen[i] + .45 * mine), // the fish's records overall, records within ~1 km, your own trips near here
    place: window.PsSure ? PsSure.place(i).v : .5, // round 13: records of any fish nearby, surveyed or modelled seabed, how good the depth is there (js/sure.js)
    feeds: PsFeeds.quality(), weather: 1 - clamp((hi - lo) / 30), lead: 1 - .6 * clamp(lead / 10) };
  let conf = .3 * parts.evidence + .15 * parts.place + .2 * parts.feeds + .2 * parts.weather + .15 * parts.lead;
  // Reasons. Each weight is roughly the share of the score that part moves.
  const t = sat.sst ? fishTemp(i, s, ocDay(x.t + 18e5)) : bil(F.sst, k, i), ft = Number.isNaN(t) ? .5 : fTemp(t, s), tm = fTime(x, s), sea = seasonAt(x, s);
  const dw = h >= 6 ? bil(F.wave, k, i) - bil(F.wave, (h - 6) * NN, i) : 0, fd = s.front > 0 ? frontDist(i) : Infinity;
  if (o.gate < .75) add('f_wind', -1, 1 - o.gate, minus('f_wind'));
  else if (o.gate > .97 && o.wEff < .4) add('r_calm', 1, .12, tr('r_calm'));
  if (fd < Infinity) add('r_front', 1, .4 * s.front * (1 - fd / 3000) + .05, tr('r_front', distTxt(fd)));
  if (o.settle > .2 && P.settleAff > 0) add('r_settle', 1, .4 * P.settleAff * o.settle + (dw < -.15 ? .05 : 0), dw < -.15 ? tr('r_settle') : plus('f_settle'));
  else if (dw > .25) add('r_building', -1, .15 * clamp(dw), tr('r_building'));
  if (sea >= .85) add('r_season', 1, .2 * sea, tr('r_season')); else if (sea <= .45) add('f_season', -1, .75 * (1 - sea), minus('f_season'));
  // round 16 P: no pressure or solunar reason: OTA 2026.11.15-5 took both out of the score (the moon and its periods stay as information)
  if (tm >= .9) add('r_prime', 1, .25 * tm, tr('r_prime', tr(x.period))); else if (tm <= .4) add('f_time', -1, .5 * (1 - tm), minus('f_time'));
  if (ft <= .5) add('f_temp', -1, .15 * (1 - ft) + .05, minus('f_temp'));
  // Temperature at the fish's depth over the last 2 days (the ocean file's model days; the satellite's day-to-day change is too noisy: its
  // 3-day change was −1.0 °C at the median cell on a day the model and Open-Meteo both gave −0.3 to −0.5).
  const od = sat.oc ? ocDay(x.t + 18e5) : -1, d2 = od >= 2 ? oceanT(i, od) - oceanT(i, od - 2) : NaN, an = gridAt(surfX?.anom, i);
  if (d2 <= -.6 && s.group !== 'pelagic') add('r_cooled', -1, .1 * clamp(-d2 / 2) + .05, tr('r_cooled', nf(-d2), Math.min(depth[i], 200)));
  if (Math.abs(an) >= 1 && Math.abs(an) < 5) add(an > 0 ? 'r_warmYear' : 'r_coldYear', an > 0 ? 1 : -1, .04, tr(an > 0 ? 'r_warmYear' : 'r_coldYear', nf(Math.abs(an)))); // context, not a score term (eval/LOG.md: the anomaly shift did not validate)
  if (pc) { const f = pc.cell[i] * pc.hour[h]; if (f >= 1.05) add('r_mine', 1, f - 1, tr('r_mine')); else if (f <= .95) add('r_mineNo', -1, 1 - f, tr('r_mineNo')); }
  if (P.seen[i] > .3) add('f_seen', 1, .2 * P.seen[i], plus('f_seen'));
  if (P.where[i] >= .8) add('r_fit', 1, .15 * P.where[i], tr('r_fit')); else if (P.where[i] < .45) add('r_unfit', -1, .6 * (1 - P.where[i]), tr('r_unfit'));
  if (Math.abs(h - state.first) <= 1) { // right now: does the nearest station agree with the forecast wind?
    const ob = window.PsObs?.near?.(latOf(i), lonOf(i), 30), d = ob && Date.now() - ob.at < 90 * 6e4 ? ob.wind - o.ws : 0;
    if (Math.abs(d) >= 10) { add('r_obs', -1, .1 + clamp((Math.abs(d) - 10) / 30) * .3, tr('r_obs', ob.station, Math.round(Math.abs(d)))); conf *= .85; }
  }
  R.sort((a, b) => b.w - a.w);
  const level = conf < .5 || parts.feeds < .5 ? 'low' : conf < .78 ? 'medium' : 'high', // high needs records or your own catches near the spot on top of fresh feeds and settled weather
    reasons = R.slice(0, 3);
  return { score, lo, hi, conf: Math.round(conf * 100) / 100, level, parts, reasons, text: [score, tr('conf_' + level), ...reasons.map(r => r.text)].join(' · ') };
}
window.scoreInfo = scoreInfo;
})();
