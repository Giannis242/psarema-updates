'use strict';
// Psarema: every word on screen, in English and Greek.
const I18N = {
  en: {
    loading: 'Loading seabed, forecast and satellite data…',
    live: (f, s) => `Live · forecast ${hm(f)} · ${s ? 'satellite ' + dm(s) : 'no satellite data'}`,
    cached: p => p >= 100 ? 'map cached' : `map ${p}% cached`,
    loadError: 'Something went wrong while starting. Tap Retry to try again.', retry: 'Retry', fcRetrying: 'Trying the forecast again…',
    // the forecast failed (js/app.js): k = off (offline) | busy (Open-Meteo's free limit) | down (anything else); t = the next automatic try
    fcNone: (k, t) => ({ off: 'You’re offline. The map and seabed still work; the forecast loads as soon as you’re back online.', busy: 'The free forecast service is busy right now.',
      down: 'Can’t reach the forecast service right now.' }[k] + (k === 'off' ? '' : t ? ` Trying again at ${hm(t)}.` : ' Tap Retry to try again.')),
    fcSaved: (k, f) => `${{ off: 'Offline', busy: 'Forecast service busy', down: 'Forecast service not answering' }[k]} · showing the saved forecast from ${fmtT(f, { day: 'numeric' }) === fmtT(Date.now(), { day: 'numeric' }) ? hm(f) : whenT(f)}`,
    missing: f => `Missing ${f} next to this page.`,
    boat: 'Boat', shore: 'Shore', spear: 'Spear',
    fish: 'Fish', allFish: n => `All ${n} fish ›`, change: 'Change fish', chooseFish: 'Choose your fish', search: 'Search by name…',
    sortBest: 'Best chance', sortName: 'A–Z', sortSeason: 'In season', all: 'All', bottom: 'Bottom', pelagic: 'Open water', cephalopod: 'Squid & octopus',
    noMatch: 'No fish match that search.', photos: 'Photos: Wikimedia Commons contributors (hover a photo for its author and licence).',
    rules: 'Rules in Cyprus', waiting: 'Waiting for the forecast…',
    
    closedNote: 'Closed season for this fish in Cyprus right now, so the map shows no spots.', banned: 'Fishing banned', bannedNote: 'Recreational fishing for this fish is banned in Cyprus, so the map shows no spots. Release any you hook.',
    run: n => `${n} km run`,
    rarely: (n, m) => `${n} is rarely ${{ boat: 'fished from a boat', shore: 'caught from shore', spear: 'speared' }[m]}, so its scores are lowered. `,
    spearNote: 'Spearfishing: to ~25 m, calm sea. Banned from sunset to sunrise.',
    rankTip: (s, w) => `Best chance in the next 7 days: ${s}, ${w}`, calibrated: n => `adjusted with ${n} real sightings`,
    photo: (a, l) => `Photo: ${a}, ${l}, Wikimedia Commons`,
    nearMe: 'Near me', myLoc: 'My location', pickMap: 'Pick on map', pickHint: 'Tap the map where you are.', locating: 'Finding your location…',
    locDenied: 'Psarema can’t see your location. Allow it: phone Settings → Apps → Psarema → Permissions → Location.', outside: 'You are outside Cyprus waters, so Near me has nothing to show.',
    nearIntro: 'Set where you are to find good spots close to you.', nearNone: r => `Nothing good within ${r} km. Try a bigger distance or another fish.`,
    away: (d, dir) => `${d} km ${dir} of you`, bestAt: w => `best ${w}`, youAreHere: 'You are here (drag to move)', directions: 'Route',
    layers: 'Layers', l_heat: 'Fishing chance', opacity: 'Opacity', hideBelow: 'Hide below', l_zones: 'Hot-zone outlines', l_contours: 'Depth lines',
    l_structure: 'Wrecks, reefs, rocks', l_access: 'Piers, harbours, capes', l_fishing: 'Fishing spots', l_beach: 'Beaches',
    l_protected: 'Protected zones', l_labels: 'Place names',
    poor: 'Poor', fair: 'Fair', good: 'Good', excellent: 'Excellent',
    k_wind: 'Wind', k_waves: 'Waves', k_current: 'Current', k_sea: 'Sea', k_bottom: 'Bottom', k_cloud: 'Cloud', k_sun: 'Sun', k_major: 'Major',
    condAt: p => `Conditions at ${p}`, now: 'Now', best: (w, s) => `★ Best ${w} · ${s}`, bestTip: 'Jump to the best hour for this fish',
    dawn: 'dawn', day: 'day', dusk: 'dusk', night: 'night', major: 'major', minor: 'minor',
    of: (d, dir, p) => `${d} km ${dir} of ${p}`, at: p => `At ${p}`,
    copy: 'Copy', copied: 'Copied', maps: 'Map', source: 'Source', score: 'score', kmOff: 'km off', noDataHere: 'No data for this area',
    f_depth: 'Depth', f_seabed: 'Seabed', f_shore: 'From shore', f_run: 'Boat run', f_relief: 'Drop-offs, banks', f_struct: 'Wrecks, reefs, piers',
    f_edge: 'Habitat edge', f_known: 'Fishing spot', f_seen: 'Sightings', f_temp: 'Water temp', f_front: 'Fronts', f_plankton: 'Plankton', f_up: 'Upwelling',
    f_current: 'Current', f_waves: 'Waves', f_wind: 'Wind', f_settle: 'Sea settling', f_clarity: 'Clarity', f_time: 'Time of day', f_moon: 'Moon',
    f_press: 'Pressure', f_season: 'Season', f_fit: 'Like its recorded places', fitFrom: n => `learned from ${n} records`, f_farm: 'Near a fish farm', f_outfall: 'Warm-water outfall',
    flow: 'flow', none: 'none near', nearby: 'nearby', recorded: n => `${n} recorded near`, noLaunch: 'no launch point', from: (k, p) => `${k} km from ${p}`,
    surface: 'surface', bottomT: 'bottom', mixed: 'mixed layer', forecast: 'forecast', noData: 'no data', exposed: 'exposed', sheltered: 'sheltered',
    here: 'here', visibility: 'visibility', settled: 'settled', overcast: 'overcast', lit: 'lit', moonDown: 'moon below the horizon',
    hab: { unknown: 'unknown', rock: 'rock', seagrass: 'seagrass', coarse: 'gravel', sand: 'sand', mud: 'mud', other: 'mixed' },
    spot: { fishing: 'Fishing spot', wreck: 'Wreck', reef: 'Reef', rock: 'Rock / islet', dive: 'Dive site', pier: 'Pier', breakwater: 'Breakwater',
      harbour: 'Harbour / marina', slipway: 'Slipway', cape: 'Cape', beach: 'Beach' },
    kind: { 'no-take': 'no fishing', restricted: 'restricted', protected: 'protected' },
    dirs: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    phases: ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'],
    collapse: 'Collapse panel', expand: 'Expand panel', close: 'Close',
    howTitle: 'How the score works',
    how1: 'Every 250 m of sea gets a 0–100 chance for the fish you picked. First: does that fish live here? Seabed depth and type, distance from shore, how far a boat has to run, and where the species has really been recorded. Then the conditions: water temperature (at the seabed for bottom fish), time of day and overcast light, waves and wind after shelter from the coast, and current. The moon and solunar periods are shown for information; they do not change the score. Then what draws fish in: drop-offs and banks (stronger with current over them), wrecks, reefs and piers, seagrass and rock edges, temperature and plankton fronts, plankton, upwelling, and a sea settling after a blow. The month scales it all.',
    how2: 'Sea and bottom temperature and plankton are today’s satellite and ocean-model maps (~1–4 km). Wind, waves and current come from ~15 km forecast squares, adjusted per cell for shelter. Seabed, habitat and spots are 250 m. Fish profiles come from published ecology, adjusted with real sightings where there are enough; they have not been tested against real catches. The north of the island has no data.',
    how3: 'Sources: <a href="https://emodnet.ec.europa.eu/" target="_blank" rel="noopener">EMODnet</a> bathymetry and seabed habitats, <a href="https://marine.copernicus.eu/" target="_blank" rel="noopener">Copernicus Marine</a>, <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>, <a href="https://www.gbif.org/" target="_blank" rel="noopener">GBIF</a> and <a href="https://obis.org/" target="_blank" rel="noopener">OBIS</a> sightings (including iNaturalist, ORMEF, Diveboard, CROMIS, ClimateFish, Observation.org and Seawatchers; some licensed for non-commercial use only), OpenStreetMap, Wikidata, GeoNames, EEA, Cyprus fisheries orders (ΚΔΠ), FishBase and SeaLifeBase, Wikimedia Commons photos, imagery Esri, Vantor, Earthstar Geographics, and the GIS User Community.',
    how4: 'Always check protected areas, closed seasons and size limits with the Department of Fisheries and Marine Research (DFMR) before fishing.',
    // round 13 areas
    ap_under: 'Under water', ap_water: 'Water', ap_seabed: d => `Seabed from the shore to ${d} m`, ap_posidonia: 'Posidonia', ap_unmapped: 'not mapped',
    ap_coral: (k, a, b) => `Coralligenous reef: ${k} km², ${a}–${b} m deep`, ap_depth: 'Depth of the area’s sea',
    ap_reach: (d, typ, min) => `${d} m of water: about ${typ} km from shore, closest ${min} km`, ap_drops: 'Steepest drop-offs',
    ap_drop: (a, b) => `${a} → ${b} m within 500 m`, ap_off: (n, k) => n ? `off ${n} · ${k} km from shore` : `${k} km from shore`,
    ap_struct: 'What is there', ap_wrecks: 'Wrecks', ap_unnamed: n => `${n} unnamed`, ap_artReefs: 'Artificial reefs', ap_reefs: 'Reefs and rocks',
    ap_rocks: n => n === 1 ? '1 charted rock' : `${n} charted rocks`, ap_caves: 'Caves on the shore', ap_farms: 'Fish farms', ap_cages: 'sea cages', ap_onShore: 'hatchery on shore',
    ap_ports: 'Harbours and marinas', ap_rivers: 'River mouths', ap_seasonal: 'they flow only after rain', ap_zones: 'Protected zones',
    ap_noTake: n => `${n} no fishing`, ap_restr: n => `${n} restricted`, ap_prot: n => `${n} nature protection`,
    ap_gaps: 'Seabed: survey and satellite maps, an estimate between surveys. A thing not listed is not in the open data, which can be incomplete.',
    ap_src: 'Sources', ap_vis: 'Visibility by month, open water', ap_visNow: (m, mon) => `About ${m} m in ${mon}`, ap_visShort: (m, mon) => `~${m} m in ${mon}`,
    ap_est: 'How deep a white disc stays visible (Secchi depth), estimated from satellite water colour, 1 km pixels, 2022–2026. After rough seas it is less.',
    ap_inshore: 'Close to shore (first kilometre)',
    ap_murkiest: n => n ? `Murkiest stretch: off ${n}` : 'Murkiest stretch', ap_murkiestSub: z => `about ${z} m over the year`,
    ap_inshoreEst: 'Estimate from Sentinel-2 satellite pictures (60 m, 64 clear days of 2023–2026): not the water after a storm. Not checked in the water.',
    ap_here: 'Under water here', ap_hDrop: 'Drop-off', ap_hHere: 'here', ap_h_wreck: 'Wreck', ap_h_artificialReef: 'Artificial reef', ap_h_farm: 'Fish farm',
    ap_h_breakwater: 'Breakwater or pier', ap_h_river: 'River mouth', ap_h_outfall: 'Outfall', ap_hVis: 'Visibility', ap_hVisV: (z, m) => `~${z} m, usual for ${m}`, ap_hVisTurbid: (z, m) => `~${z} m, usual for ${m}: murkier than open water`,
    ap_hNote: 'Estimates from seabed and depth maps (250 m cells) and satellite water colour: the usual water of the month, not today’s. Not listed = not within reach in the open data.',
    ap_bw: 'Bathing-water quality', ap_bwLine: (k, n, c, y) => `${k} of ${n} monitored beaches: ${c} (${y} season)`, ap_bwShort: (k, n, c) => `${k}/${n} beaches ${c}`,
    ap_c_excellent: 'Excellent', ap_c_good: 'Good', ap_c_sufficient: 'Sufficient', ap_c_poor: 'Poor', ap_bwNone: 'No monitored beach in this area.',
    ap_samples: (n, a, b) => `${n} samples, ${a}–${b}: 95% of them at or below (bacteria per 100 ml)`, ap_ent: 'Enterococci', ap_limit: v => `excellent up to ${v}`,
    ap_worst: (n, e, c) => `Highest readings: ${n} (enterococci ${e}, E. coli ${c})`, ap_press: 'Pressures nearby', ap_pressNone: 'None in the open data.',
    ap_pCages: n => `Fish-farm cage sites: ${n}`, ap_pHatch: n => `Fish hatcheries on shore: ${n}`, ap_pDesal: (n, c) => `Desalination, ${n}: ${c} m³ a day (plant position approximate)`,
    ap_oDesal: 'Desalination brine outfall', ap_oPower: 'Power-station cooling-water outfall', ap_oOther: 'Other outfall',
    ap_pSewage: n => `Treated waste-water outfall to the sea: ${n}`, ap_pPorts: n => `Harbours and marinas: ${n}`, ap_pRivers: n => `River mouths (run-off after rain): ${n}`,
    // round 13 lures (js/lures.js)
    lu_top: 'Top lures now', lu_allFish: 'All fish here', lu_biting: 'Biting here now', lu_more: n => `${n} more`,
    lu_cat: n => `All lures · ${n}`, lu_how: 'How to fish it', lu_cols: 'Colours', lu_why: 'Why it ranks here', lu_inGuide: 'In its fish guide:',
    lu_usualFor: '~ Usual practice:', lu_both: 'Shore and boat', lu_depth: (a, b) => `${a}–${b} m deep`,
    lu_usual: f => `Usual practice for ${f} (in no guide)`, lu_forFish: f => `For ${f}`, lu_inMonths: m => `Its usual months: ${m}`, lu_outMonths: m => `Usual in ${m}, not now`,
    lu_shallow: d => `Too shallow here for this size (${d} m)`, lu_deep: d => `Too deep here for this size (${d} m)`, lu_none: 'No lure advice for this fish here yet.',
    lu_notNow: 'Not ranked for the fish and method on show.', lu_read: 'Further reading', lu_per: { dawn: 'dawn', day: 'day', dusk: 'dusk', night: 'night' },
    lu_foot: 'Artificial lures only. Ranked from the fish guides, this coast, the month, the hour, the seabed and the sea. ~ marks usual practice or a rule of thumb, not a source.',
    lu_sizeOk: s => `Its fish guide gives this size: ${s}`, lu_sizeNo: s => `Its fish guide gives ${s}, not this size`, lu_main: f => `A size made for ${f}`,
    lu_light: { dark: 'dark night', moon: 'moonlit night', low: 'low sun', dull: 'overcast', bright: 'bright sun', day: 'daylight' },
    lu_clear: v => `clear water (about ${v} m)`, lu_murky: v => `green, murky water (about ${v} m)`, lu_murkyNow: 'murky water now (stirred by waves)', lu_deepAt: d => `about ${d} m down`, lu_deepTyp: d => `usually about ${d} m down`, lu_top0: 'at the top',
    lu_bed: { sand: 'over sand', coarse: 'over gravel', seagrass: 'over seagrass', rock: 'over rock', mud: 'over mud' }, lu_rough: w => `white water (${w} m waves)`, lu_calm: 'flat calm',
    lu_diet: 'its main food', lu_guideNamed: 'named in its fish guide', lu_forage: f => `${f} in season`, lu_forageHere: f => `${f} in season, and this area’s guide lists them`,
    lu_e: { natReal: 'fish see detail, so a natural colour looks real', loudFake: 'a loud colour can look fake to wary fish', brightFar: 'chartreuse, orange and gold show furthest',
      outline: 'black or white gives the strongest outline', natLost: 'a natural or clear colour disappears', glow: 'glow shines for a while after a charge of light',
      uv: 'UV-bright paint shows in weak light', silhouette: 'a dark shape stands out against the sky above', noFlash: 'there is no light to flash', gold: 'gold shows better than silver',
      pale: 'white and pearl stand out', flash: 'silver and chrome flash like scales', glowWaste: 'glow is wasted in daylight', clearHide: 'a clear body hides its outline',
      redDark: 'red turns dark grey from about 10 m down and reads as a dark shape', orangeFade: 'orange fades from about 20 m down', blueGreen: 'blue and green carry deepest',
      glowDeep: 'glow stays visible in deep, dim water', sandMatch: 'pale, sandy colours match what lives on it', sandDark: 'a dark shape stands out over pale sand',
      grassMatch: 'olive and green blend in like the shrimps that live there', grassBright: 'a bright colour stands out against the dark meadow',
      rockMatch: 'browns, orange and red are the colours of crabs and rockfish', foam: 'white and pearl match the foam and bubbles', subtleLost: 'a subtle colour is lost in it',
      calmClear: 'fish look closely: ghost and natural colours', forage: 'match their colour', smallFish: 'small fish, which a sardine or sand smelt pattern copies',
      squid: 'squid and octopus, which this colour copies', shrimp: 'shrimps and crabs, which this colour copies' },
    lu_best: 'best here', lu_noWhy: 'No strong reason for or against it here now', lu_env: 'Here now', lu_vis: (v, s) => `visibility about ${v} m (${s})`,
    lu_visP: 'open-water satellite estimate for the month', lu_visS: 'today’s satellite', lu_cloud: n => `${n}% cloud`, lu_wave: w => `${w} m waves`,
    // round 13 sea
    a3_noSea: 'No wave forecast here for this hour: the sea is shown flat', a3_seaAid: 'Drawn stronger to show from afar: wave shading, gust patches, lines along the wind', a3_seaLvl: 'Sea level', a3_seaUp: 'Back up',
    // round 13 street: street view in the 3D area (js/area3d-street.js)
    sv_toggle: 'Street view', sv_loading: 'Loading street photos…', sv_count: (n, s) => `${n} places with street photos (${s}) · tap one, or tap the land for Google Street View`,
    sv_none: 'No open street photos here: tap the land to open Google Street View', sv_here: 'This spot', sv_hereTxt: 'See it at street level in another app.',
    sv_gsv: 'Google Street View', sv_gsvHere: 'Open in Google Street View here', sv_mly: 'Mapillary', sv_open: s => `Open in ${s}`, sv_pano: '360° street view', sv_photo: 'Street photo',
    sv_cpano: '360° panorama', sv_cphoto: 'Photo of the place', sv_by: w => `by ${w}`, sv_close: 'Close',
    sv_view360: 'View 360°', sv_viewPhoto: 'View photo', sv_loadingPic: 'Loading the picture…', sv_drag: 'Drag to look around · pinch to zoom', sv_failPic: 'The picture could not be loaded here. Open it on its own site below.',
    sv_pinch: 'Pinch or double-tap to zoom', sv_look: 'Look from here', sv_gsvShort: 'Street View', sv_offline: 'You’re offline: the pictures need a connection.',
    lu_fFish: 'Fish', lu_fType: 'Lure type', lu_fBudget: 'Budget', lu_allTypes: 'All lure types', lu_anyPrice: 'Any price', lu_b1: 'Cheap (€)', lu_b2: 'Up to €€',
    lu_price: ['', '€: under about €6', '€€: about €6–20', '€€€: over about €20'], lu_priceNote: 'a rough shop price for one generic lure, not a quote', lu_close: 'Close',
    lu_noMatch: 'No lure here matches these filters.', lu_moon: n => `moon ${n}% lit`,
    // round 14 ui: the first run's welcome (index.html #guide.wl), the location's reason (js/ui.js locateMe), the offline box of what loads on first use
    wl_title: 'Where and when to fish around Cyprus', wl_tour: 'Quick tour',
    wl_1: 'The coloured sea is your fish’s chance, hour by hour: blue low, orange and red best.',
    wl_2: 'Choose your fish, and boat, shore or spear, at the top of the map.',
    wl_3: 'Tap the sea for its score. View more gives the best time, baits, lures and the seabed.',
    r14_locWhy: 'To show good water near you and your dot on the map, Psarema needs your location. Tap My location to allow it.',
    r14_offLoad: 'Could not load this. It loads by itself when you are back online.',
    // round 14 rules
    rl_checked: 'Checked 14 Nov 2026 against the DFMR licence terms 2026, the Fisheries Regulations and the EU rules; where the law differs, the law applies.',
    rl_zoneChecked: 'Checked 14 Nov 2026 against the DFMR map of restricted areas (June 2026).',
    rl_bathBoat: 'Bathing area in season: no fishing here at any hour for licence holders (DFMR terms §6). Drawn from the 2025 order; the 2026 order was not found: follow the buoys and signs.',
    rl_bathShore: 'Bathing area in season: the licence terms ban fishing here at any hour (DFMR terms §6). They do not bind a rod from the shore, but keep well clear of swimmers. Drawn from the 2025 order; the 2026 order was not found: follow the signs.',
    // round 14 store: Offline areas keep the data, not the online imagery (js/offline.js)
    of_dataOnly: 'Saves the forecast and sea data for this area. Offline, the map shows the app’s own satellite imagery (about 10 m detail).',
    of_noSat: 'The sharper satellite imagery needs a connection: its licence does not allow keeping it on the device.', of_rowData: d => `Forecast and sea data · saved ${d}`,
    // round 15 heat map: the legend's ends in words (js/map.js)
    hl_lo: 'Weaker',
    l_fronts: 'Sea fronts', fr_tip: 'Dotted lines where the sea’s surface temperature changes sharply, from the latest satellite map. Fish often gather along them. A sea feature, not a fishing score.',
    fr_note: d => `Dots: temperature fronts, satellite ${d}, a sea feature. Not a score.`, fr_none: 'Sea fronts could not be loaded. Try again when online.',
    // round 15 catch loop: Share catches for science (js/catchlog.js PsShare), off unless the angler switches it on
    cs_title: 'Share catches for science', cs_sub: 'Optional · off by default', cs_switch: 'Share my catches to improve the map',
    cs_offSub: 'Off: nothing leaves this phone.', cs_onSub: 'On. Switch it off at any time: nothing more is sent.',
    cs_why: 'The map is tested against real catches with a date and a place. Yours help it get better for every angler, over time.',
    cs_whatT: 'What is shared, for each catch or blank trip', cs_neverT: 'Never shared',
    cs_what: ['The fish (on a blank trip, the fish you were after), how many, caught or only seen, and the method', 'The day and the hour',
      'The place as a square of about 2 × 2 km, never the spot itself', 'Only 7 days after the catch, never while you fish'],
    cs_never: 'Photos, notes, sizes, weights, baits, the exact place, your name, email or profile.',
    cs_who: 'Only the app’s makers see it, to test the map. It is never shown to other anglers, never published spot by spot, never sold.',
    cs_scope: 'It covers what you log on this phone from now on.', cs_earlier: n => n === 1 ? 'Also share the 1 entry already in my log' : `Also share the ${n} entries already in my log`,
    cs_status: (w, s) => `${w} waiting on this phone · ${s} sent`, cs_next: d => `The next can go on ${d}.`,
    cs_noServer: 'Nothing is sent yet: this version of the app has no server for it.',
    cs_export: 'Export for the test bench', cs_exportSub: 'Every entry in your log as it would be shared (2 km squares, no photos or notes), in the format of the map’s accuracy test.',
    cs_on: 'On', cs_off: 'Off', cs_onToast: 'Sharing on. Your next catches wait on this phone for 7 days.', cs_offToast: 'Sharing off. Nothing more will be sent.',
    cs_none: 'Nothing logged yet.', cs_added: n => n === 1 ? '1 entry added' : `${n} entries added`,
    cs_signin: 'Sharing goes through your account: sign in to send them.', cs_del: n => n ? `Delete my shared catches (${n})` : 'Delete my shared catches',
    cs_delAsk: n => `Delete ${!n ? 'everything this account' : n === 1 ? 'the entry you' : `the ${n} entries you`} shared from the server? Your own log stays on this phone. This cannot be undone.`,
    ct_seenN: n => `${n} seen`, ct_seenApart: n => `Also ${n} fish seen, not caught: not counted as catches, nor by the map’s learning.`,
    ct_seen: 'Seen, not caught', ctf_seenSub: 'Only seen (diving, from the boat), or let go before landing: nothing kept', ct_seenOf: f => `Seen · ${f}`,
    cs_deleted: 'Your shared catches were deleted from the server.', cs_delErr: 'Could not delete them now. Check your connection and try again.',
    // round 16-17 H: the map legend, the zones' words, no good water, the sea by coast (js/map.js, js/seastate.js)
    hl_best: 'Near its best', hlRel: 'Each place against what this fish’s best water scores by this method on a good day, on the same scale every day and hour: a calm good day glows, a rough one looks duller. Colours do not compare one fish with another. Tap the water for its score.',
    pz_ban: 'No fishing', pz_dim: 'Check rules', pz_rules: 'Rules apply', pz_dfmr: 'Check the rules with DFMR before you fish here.',
    pz_unclear: 'The rules for recreational fishing here are unclear, so the map dims this water: check with DFMR before you fish here.',
    ng_hour: t => `No good water at this hour. Best at ${t}`, ng_today: d => `No more good water today. Best next: ${d}`, ng_day: d => `No good water on this day. Best day: ${d}`,
    ng_week: 'No good water this week',
    sea_coast: ['west', 'north-west', 'south', 'east'], sea_calm: c => `Calm on the ${c} coast`, sea_rough: c => `Rough on the ${c} coast`,
    sea_both: (c, r) => `Calm on the ${c} coast, rough on the ${r}`, sea_allCalm: 'Calm on every coast', sea_allRough: 'Rough on every coast',
  },
  el: {
    loading: 'Φόρτωση βυθού, πρόγνωσης και δορυφορικών δεδομένων…',
    live: (f, s) => `Ζωντανά · πρόγνωση ${hm(f)} · ${s ? 'δορυφόρος ' + dm(s) : 'χωρίς δορυφορικά δεδομένα'}`,
    cached: p => p >= 100 ? 'ο χάρτης αποθηκεύτηκε' : `χάρτης ${p}%`,
    loadError: 'Κάτι πήγε στραβά στην εκκίνηση. Πατήστε «Ξανά» για νέα προσπάθεια.', retry: 'Ξανά', fcRetrying: 'Νέα προσπάθεια λήψης της πρόγνωσης…',
    fcNone: (k, t) => ({ off: 'Είστε εκτός σύνδεσης. Ο χάρτης και ο βυθός λειτουργούν· η πρόγνωση θα φορτωθεί μόλις συνδεθείτε ξανά.', busy: 'Η δωρεάν υπηρεσία πρόγνωσης είναι προσωρινά υπερφορτωμένη.',
      down: 'Δεν υπάρχει σύνδεση με την υπηρεσία πρόγνωσης αυτή τη στιγμή.' }[k] + (k === 'off' ? '' : t ? ` Νέα προσπάθεια στις ${hm(t)}.` : ' Πατήστε «Ξανά» για νέα προσπάθεια.')),
    fcSaved: (k, f) => `${{ off: 'Εκτός σύνδεσης', busy: 'Υπηρεσία πρόγνωσης υπερφορτωμένη', down: 'Η υπηρεσία πρόγνωσης δεν απαντά' }[k]} · εμφανίζεται η αποθηκευμένη πρόγνωση από ${fmtT(f, { day: 'numeric' }) === fmtT(Date.now(), { day: 'numeric' }) ? 'τις ' + hm(f) : whenT(f)}`,
    missing: f => `Λείπει το ${f} δίπλα στη σελίδα.`,
    boat: 'Σκάφος', shore: 'Ακτή', spear: 'Ψαροντούφεκο',
    fish: 'Ψάρι', allFish: n => `Όλα τα ψάρια (${n}) ›`, change: 'Αλλαγή ψαριού', chooseFish: 'Διαλέξτε ψάρι', search: 'Αναζήτηση με όνομα…',
    sortBest: 'Καλύτερη ευκαιρία', sortName: 'Α–Ω', sortSeason: 'Στην εποχή του', all: 'Όλα', bottom: 'Βυθού', pelagic: 'Ανοιχτής θάλασσας', cephalopod: 'Καλαμάρια & χταπόδια',
    noMatch: 'Κανένα ψάρι δεν ταιριάζει με την αναζήτηση.', photos: 'Φωτογραφίες: συνεισφέροντες του Wikimedia Commons (περάστε τον δείκτη πάνω από μια φωτογραφία για δημιουργό και άδεια).',
    rules: 'Κανόνες στην Κύπρο', waiting: 'Αναμονή για την πρόγνωση…',
    
    closedNote: 'Αυτή την εποχή απαγορεύεται η αλιεία αυτού του ψαριού στην Κύπρο, γι’ αυτό ο χάρτης δεν δείχνει σημεία.', banned: 'Απαγορεύεται', bannedNote: 'Η ερασιτεχνική αλιεία αυτού του ψαριού απαγορεύεται στην Κύπρο, γι’ αυτό ο χάρτης δεν δείχνει σημεία. Αφήστε ελεύθερο όποιο πιάσετε.',
    run: n => `${n} km διαδρομή`,
    rarely: (n, m) => `${n}: ${{ boat: 'σπάνια ψαρεύεται με σκάφος', shore: 'σπάνια πιάνεται από την ακτή', spear: 'σπάνια ψαρεύεται με ψαροντούφεκο' }[m]}, γι’ αυτό ο βαθμός μειώνεται. `,
    spearNote: 'Ψαροντούφεκο: ως ~25 m, ήρεμη θάλασσα. Απαγορεύεται από τη δύση ως την ανατολή του ηλίου.',
    rankTip: (s, w) => `Καλύτερη ευκαιρία στις επόμενες 7 ημέρες: ${s}, ${w}`, calibrated: n => `προσαρμοσμένο με ${n} πραγματικές παρατηρήσεις`,
    photo: (a, l) => `Φωτογραφία: ${a}, ${l}, Wikimedia Commons`,
    nearMe: 'Κοντά μου', myLoc: 'Η θέση μου', pickMap: 'Επιλογή στον χάρτη', pickHint: 'Πατήστε στον χάρτη εκεί που είστε.', locating: 'Εντοπισμός θέσης…',
    locDenied: 'Το Psarema δεν βλέπει τη θέση σας. Επιτρέψτε το: Ρυθμίσεις τηλεφώνου → Εφαρμογές → Psarema → Άδειες → Τοποθεσία.', outside: 'Είστε εκτός κυπριακών υδάτων, οπότε το Κοντά μου δεν έχει κάτι να δείξει.',
    nearIntro: 'Ορίστε πού είστε για να βρείτε καλά σημεία κοντά σας.', nearNone: r => `Τίποτα καλό σε ακτίνα ${r} km. Δοκιμάστε μεγαλύτερη απόσταση ή άλλο ψάρι.`,
    away: (d, dir) => `${d} km ${dir} από εσάς`, bestAt: w => `καλύτερα ${w}`, youAreHere: 'Είστε εδώ (σύρετε για μετακίνηση)', directions: 'Διαδρομή',
    layers: 'Επίπεδα', l_heat: 'Πιθανότητα ψαρέματος', opacity: 'Διαφάνεια', hideBelow: 'Κρύψε κάτω από', l_zones: 'Περιγράμματα θερμών ζωνών', l_contours: 'Ισοβαθείς',
    l_structure: 'Ναυάγια, ύφαλοι, βράχοι', l_access: 'Προβλήτες, λιμάνια, ακρωτήρια', l_fishing: 'Σημεία ψαρέματος', l_beach: 'Παραλίες',
    l_protected: 'Προστατευόμενες ζώνες', l_labels: 'Τοπωνύμια',
    poor: 'Χαμηλή', fair: 'Μέτρια', good: 'Καλή', excellent: 'Εξαιρετική',
    k_wind: 'Άνεμος', k_waves: 'Κύμα', k_current: 'Ρεύμα', k_sea: 'Θάλασσα', k_bottom: 'Βυθός', k_cloud: 'Νέφωση', k_sun: 'Ήλιος', k_major: 'Κύρια',
    condAt: p => `Συνθήκες: ${p}`, now: 'Τώρα', best: (w, s) => `★ Καλύτερα ${w} · ${s}`, bestTip: 'Μετάβαση στην καλύτερη ώρα για αυτό το ψάρι',
    dawn: 'αυγή', day: 'μέρα', dusk: 'σούρουπο', night: 'νύχτα', major: 'κύρια', minor: 'δευτερεύουσα',
    of: (d, dir, p) => `${d} km ${dir} από ${p}`, at: p => p, // no article: place names have every gender
    copy: 'Αντιγραφή', copied: 'Αντιγράφηκε', maps: 'Χάρτης', source: 'Πηγή', score: 'βαθμός', kmOff: 'km από ακτή', noDataHere: 'Χωρίς δεδομένα για αυτή την περιοχή',
    f_depth: 'Βάθος', f_seabed: 'Βυθός', f_shore: 'Από την ακτή', f_run: 'Διαδρομή σκάφους', f_relief: 'Απότομα, ξέρες', f_struct: 'Ναυάγια, ύφαλοι, προβλήτες',
    f_edge: 'Αλλαγή βυθού', f_known: 'Σημείο ψαρέματος', f_seen: 'Παρατηρήσεις', f_temp: 'Θερμοκρασία νερού', f_front: 'Μέτωπα', f_plankton: 'Πλαγκτόν', f_up: 'Ανάβλυση',
    f_current: 'Ρεύμα', f_waves: 'Κύμα', f_wind: 'Άνεμος', f_settle: 'Θάλασσα που ηρεμεί', f_clarity: 'Διαύγεια', f_time: 'Ώρα', f_moon: 'Φεγγάρι',
    f_press: 'Πίεση', f_season: 'Εποχή', f_fit: 'Σαν τα μέρη όπου καταγράφεται', fitFrom: n => `από ${n} καταγραφές`, f_farm: 'Κοντά σε ιχθυοτροφείο', f_outfall: 'Εκροή ζεστού νερού',
    flow: 'ροή', none: 'κανένα κοντά', nearby: 'κοντά', recorded: n => `${n} καταγραφές κοντά`, noLaunch: 'καμία γλίστρα', from: (k, p) => `${k} km από ${p}`,
    surface: 'επιφάνεια', bottomT: 'βυθός', mixed: 'στρώμα ανάμειξης', forecast: 'πρόγνωση', noData: 'χωρίς δεδομένα', exposed: 'ανοιχτό στον καιρό', sheltered: 'απάνεμο',
    here: 'εδώ', visibility: 'ορατότητα', settled: 'καθαρό', overcast: 'συννεφιά', lit: 'φωτισμένο', moonDown: 'το φεγγάρι είναι κάτω από τον ορίζοντα',
    hab: { unknown: 'άγνωστο', rock: 'βράχος', seagrass: 'ποσειδωνία', coarse: 'χαλίκι', sand: 'άμμος', mud: 'λάσπη', other: 'μικτό' },
    spot: { fishing: 'Σημείο ψαρέματος', wreck: 'Ναυάγιο', reef: 'Ύφαλος', rock: 'Βράχος / νησίδα', dive: 'Καταδυτικό σημείο', pier: 'Προβλήτα', breakwater: 'Κυματοθραύστης',
      harbour: 'Λιμάνι / μαρίνα', slipway: 'Γλίστρα', cape: 'Ακρωτήριο', beach: 'Παραλία' },
    kind: { 'no-take': 'απαγόρευση αλιείας', restricted: 'περιορισμοί', protected: 'προστατευόμενη' },
    dirs: ['Β', 'ΒΑ', 'Α', 'ΝΑ', 'Ν', 'ΝΔ', 'Δ', 'ΒΔ'],
    phases: ['Νέα Σελήνη', 'Αύξων μηνίσκος', 'Πρώτο τέταρτο', 'Αύξουσα αμφίκυρτη', 'Πανσέληνος', 'Φθίνουσα αμφίκυρτη', 'Τελευταίο τέταρτο', 'Φθίνων μηνίσκος'],
    collapse: 'Σύμπτυξη πάνελ', expand: 'Ανάπτυξη πάνελ', close: 'Κλείσιμο',
    howTitle: 'Πώς υπολογίζεται ο βαθμός',
    how1: 'Κάθε τετράγωνο θάλασσας 250 m παίρνει βαθμό 0–100 για το ψάρι που διαλέξατε. Πρώτα: ζει εδώ αυτό το ψάρι; Βάθος και τύπος βυθού, απόσταση από την ακτή, πόση διαδρομή χρειάζεται το σκάφος και πού έχει πραγματικά καταγραφεί το είδος. Μετά οι συνθήκες: θερμοκρασία νερού (στον βυθό για τα ψάρια βυθού), ώρα και συννεφιά, κύμα και άνεμος μετά την προστασία της ακτής, και ρεύμα. Το φεγγάρι και οι σεληνιακές περίοδοι φαίνονται ως πληροφορία· δεν αλλάζουν τον βαθμό. Μετά ό,τι τραβά τα ψάρια: απότομα και ξέρες (πιο δυνατά με ρεύμα από πάνω), ναυάγια, ύφαλοι και προβλήτες, όρια ποσειδωνίας και βράχου, μέτωπα θερμοκρασίας και πλαγκτού, πλαγκτόν, ανάβλυση και θάλασσα που ηρεμεί μετά από φουρτούνα. Ο μήνας τα κλιμακώνει όλα.',
    how2: 'Η θερμοκρασία επιφάνειας και βυθού και το πλαγκτόν είναι σημερινοί χάρτες δορυφόρου και ωκεανογραφικού μοντέλου (~1–4 km). Άνεμος, κύμα και ρεύμα προέρχονται από τετράγωνα πρόγνωσης ~15 km, προσαρμοσμένα ανά κελί για την προστασία της ακτής. Βυθός, ενδιαιτήματα και σημεία έχουν ανάλυση 250 m. Τα προφίλ των ψαριών βασίζονται σε δημοσιευμένη οικολογία και προσαρμόζονται με πραγματικές παρατηρήσεις όπου υπάρχουν αρκετές· δεν έχουν ελεγχθεί με πραγματικές ψαριές. Ο βορράς του νησιού δεν έχει δεδομένα.',
    how3: 'Πηγές: <a href="https://emodnet.ec.europa.eu/" target="_blank" rel="noopener">EMODnet</a> (βυθομετρία και ενδιαιτήματα), <a href="https://marine.copernicus.eu/" target="_blank" rel="noopener">Copernicus Marine</a>, <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>, παρατηρήσεις <a href="https://www.gbif.org/" target="_blank" rel="noopener">GBIF</a> και <a href="https://obis.org/" target="_blank" rel="noopener">OBIS</a> (με iNaturalist, ORMEF, Diveboard, CROMIS, ClimateFish, Observation.org και Seawatchers· ορισμένες με άδεια μόνο για μη εμπορική χρήση), OpenStreetMap, Wikidata, GeoNames, ΕΟΠ, ΚΔΠ αλιείας της Κύπρου, FishBase και SeaLifeBase, φωτογραφίες Wikimedia Commons, δορυφορικές εικόνες Esri, Vantor, Earthstar Geographics, GIS User Community.',
    how4: 'Πριν ψαρέψετε, ελέγχετε πάντα προστατευόμενες περιοχές, απαγορευμένες περιόδους και ελάχιστα μεγέθη στο Τμήμα Αλιείας και Θαλάσσιων Ερευνών (ΤΑΘΕ).',
    // round 13 areas
    ap_under: 'Κάτω από το νερό', ap_water: 'Νερό', ap_seabed: d => `Βυθός από την ακτή έως τα ${d} m`, ap_posidonia: 'Ποσειδωνία', ap_unmapped: 'αχαρτογράφητο',
    ap_coral: (k, a, b) => `Κοραλλιογενής ύφαλος: ${k} km², βάθος ${a}–${b} m`, ap_depth: 'Βάθος της θάλασσας της περιοχής',
    ap_reach: (d, typ, min) => `Νερό ${d} m: περίπου ${typ} km από την ακτή, το κοντινότερο ${min} km`, ap_drops: 'Τα πιο απότομα κοψίματα',
    ap_drop: (a, b) => `${a} → ${b} m μέσα σε 500 m`, ap_off: (n, k) => n ? `ανοιχτά: ${n} · ${k} km από την ακτή` : `${k} km από την ακτή`,
    ap_struct: 'Τι υπάρχει', ap_wrecks: 'Ναυάγια', ap_unnamed: n => `${n} χωρίς όνομα`, ap_artReefs: 'Τεχνητοί ύφαλοι', ap_reefs: 'Ύφαλοι και ξέρες',
    ap_rocks: n => n === 1 ? '1 ξέρα στον χάρτη' : `${n} ξέρες στον χάρτη`, ap_caves: 'Σπηλιές στην ακτή', ap_farms: 'Ιχθυοτροφεία', ap_cages: 'κλωβοί στη θάλασσα', ap_onShore: 'εκκολαπτήριο στη στεριά',
    ap_ports: 'Λιμάνια και μαρίνες', ap_rivers: 'Εκβολές ποταμών', ap_seasonal: 'τρέχουν μόνο μετά από βροχές', ap_zones: 'Προστατευόμενες ζώνες',
    ap_noTake: n => `${n} χωρίς ψάρεμα`, ap_restr: n => `${n} με περιορισμούς`, ap_prot: n => `${n} προστασίας της φύσης`,
    ap_gaps: 'Βυθός: χάρτες από έρευνες και δορυφόρο, εκτίμηση ανάμεσα στις έρευνες. Ό,τι δεν αναφέρεται δεν υπάρχει στα ανοιχτά δεδομένα, που μπορεί να είναι ελλιπή.',
    ap_src: 'Πηγές', ap_vis: 'Ορατότητα ανά μήνα, στα ανοιχτά', ap_visNow: (m, mon) => `${mon}: περίπου ${m} m`, ap_visShort: (m, mon) => `~${m} m (${mon})`,
    ap_est: 'Ως ποιο βάθος φαίνεται ένας λευκός δίσκος (βάθος Secchi), εκτίμηση από το χρώμα του νερού από δορυφόρο, εικονοστοιχεία 1 km, 2022–2026. Μετά από φουρτούνα είναι λιγότερο.',
    ap_inshore: 'Κοντά στην ακτή (το πρώτο χιλιόμετρο)',
    ap_murkiest: n => n ? `Το πιο θολό κομμάτι: ανοιχτά από ${n}` : 'Το πιο θολό κομμάτι', ap_murkiestSub: z => `περίπου ${z} m μέσα στον χρόνο`,
    ap_inshoreEst: 'Εκτίμηση από δορυφορικές εικόνες Sentinel-2 (60 m, 64 καθαρές μέρες 2023–2026): όχι το νερό μετά από φουρτούνα. Δεν έχει ελεγχθεί στο νερό.',
    ap_here: 'Κάτω από το νερό εδώ', ap_hDrop: 'Κόψιμο βυθού', ap_hHere: 'εδώ', ap_h_wreck: 'Ναυάγιο', ap_h_artificialReef: 'Τεχνητός ύφαλος', ap_h_farm: 'Ιχθυοτροφείο',
    ap_h_breakwater: 'Κυματοθραύστης ή προβλήτα', ap_h_river: 'Εκβολή ποταμού', ap_h_outfall: 'Αγωγός εκροής', ap_hVis: 'Ορατότητα', ap_hVisV: (z, m) => `~${z} m, συνήθως (${m})`, ap_hVisTurbid: (z, m) => `~${z} m, συνήθως (${m}): πιο θολό από τα ανοιχτά`,
    ap_hNote: 'Εκτιμήσεις από χάρτες βυθού και βάθους (κελιά 250 m) και το χρώμα του νερού από δορυφόρο: το συνηθισμένο νερό του μήνα, όχι το σημερινό. Ό,τι δεν αναφέρεται δεν βρίσκεται κοντά στα ανοιχτά δεδομένα.',
    ap_bw: 'Ποιότητα νερών κολύμβησης', ap_bwLine: (k, n, c, y) => `${k} από ${n} ακτές που παρακολουθούνται: ${c} (περίοδος ${y})`, ap_bwShort: (k, n, c) => `${k}/${n} ακτές: ${c}`,
    ap_c_excellent: 'Εξαιρετική', ap_c_good: 'Καλή', ap_c_sufficient: 'Επαρκής', ap_c_poor: 'Ανεπαρκής', ap_bwNone: 'Καμία ακτή υπό παρακολούθηση σε αυτή την περιοχή.',
    ap_samples: (n, a, b) => `${n} δείγματα, ${a}–${b}: το 95% έως (βακτήρια ανά 100 ml)`, ap_ent: 'Εντερόκοκκοι', ap_limit: v => `εξαιρετική έως ${v}`,
    ap_worst: (n, e, c) => `Υψηλότερες τιμές: ${n} (εντερόκοκκοι ${e}, E. coli ${c})`, ap_press: 'Πιέσεις κοντά', ap_pressNone: 'Καμία στα ανοιχτά δεδομένα.',
    ap_pCages: n => `Θέσεις κλωβών ιχθυοτροφείων: ${n}`, ap_pHatch: n => `Εκκολαπτήρια στη στεριά: ${n}`, ap_pDesal: (n, c) => `Αφαλάτωση, ${n}: ${c} m³ την ημέρα (θέση μονάδας κατά προσέγγιση)`,
    ap_oDesal: 'Αγωγός άλμης αφαλάτωσης', ap_oPower: 'Αγωγός νερού ψύξης ηλεκτροπαραγωγικού σταθμού', ap_oOther: 'Άλλος αγωγός εκροής',
    ap_pSewage: n => `Αγωγός επεξεργασμένων λυμάτων στη θάλασσα: ${n}`, ap_pPorts: n => `Λιμάνια και μαρίνες: ${n}`, ap_pRivers: n => `Εκβολές ποταμών (απορροή μετά από βροχές): ${n}`,
    // round 13 lures (js/lures.js)
    lu_top: 'Τα καλύτερα τεχνητά τώρα', lu_allFish: 'Όλα τα ψάρια εδώ', lu_biting: 'Τσιμπούν εδώ τώρα', lu_more: n => `Άλλα ${n}`,
    lu_cat: n => `Όλα τα τεχνητά · ${n}`, lu_how: 'Πώς ψαρεύεται', lu_cols: 'Χρώματα', lu_why: 'Γιατί είναι σε αυτή τη θέση', lu_inGuide: 'Στον οδηγό του ψαριού:',
    lu_usualFor: '~ Συνήθης πρακτική:', lu_both: 'Ακτή και σκάφος', lu_depth: (a, b) => `βάθος ${a}–${b} m`,
    lu_usual: f => `Συνήθης πρακτική για: ${f} (σε κανέναν οδηγό)`, lu_forFish: f => `Για: ${f}`, lu_inMonths: m => `Οι συνήθεις μήνες του: ${m}`, lu_outMonths: m => `Συνήθως ${m}, όχι τώρα`,
    lu_shallow: d => `Πολύ ρηχά εδώ για αυτό το μέγεθος (${d} m)`, lu_deep: d => `Πολύ βαθιά εδώ για αυτό το μέγεθος (${d} m)`, lu_none: 'Δεν υπάρχει ακόμη συμβουλή τεχνητού για αυτό το ψάρι εδώ.',
    lu_notNow: 'Δεν κατατάσσεται για το ψάρι και τον τρόπο που φαίνονται.', lu_read: 'Για περισσότερα', lu_per: { dawn: 'χάραμα', day: 'μέρα', dusk: 'σούρουπο', night: 'νύχτα' },
    lu_foot: 'Μόνο τεχνητά δολώματα. Κατάταξη από τους οδηγούς των ψαριών, την ακτή, τον μήνα, την ώρα, τον βυθό και τη θάλασσα. Το ~ σημαίνει συνήθη πρακτική ή εμπειρικό κανόνα, όχι πηγή.',
    lu_sizeOk: s => `Ο οδηγός του ψαριού δίνει αυτό το μέγεθος: ${s}`, lu_sizeNo: s => `Ο οδηγός του ψαριού δίνει ${s}, όχι αυτό το μέγεθος`, lu_main: f => `Μέγεθος φτιαγμένο για: ${f}`,
    lu_light: { dark: 'σκοτεινή νύχτα', moon: 'νύχτα με φεγγάρι', low: 'χαμηλός ήλιος', dull: 'συννεφιά', bright: 'δυνατός ήλιος', day: 'φως ημέρας' },
    lu_clear: v => `καθαρά νερά (περίπου ${v} m)`, lu_murky: v => `πράσινα, θολά νερά (περίπου ${v} m)`, lu_murkyNow: 'θολά νερά τώρα (από το κύμα)', lu_deepAt: d => `σε βάθος περίπου ${d} m`, lu_deepTyp: d => `συνήθως σε βάθος περίπου ${d} m`, lu_top0: 'στην επιφάνεια',
    lu_bed: { sand: 'πάνω από άμμο', coarse: 'πάνω από χαλίκι', seagrass: 'πάνω από ποσειδωνία', rock: 'πάνω από βράχο', mud: 'πάνω από λάσπη' }, lu_rough: w => `αφρός (κύμα ${w} m)`, lu_calm: 'μπουνάτσα',
    lu_diet: 'η κύρια τροφή του', lu_guideNamed: 'το αναφέρει ο οδηγός του ψαριού', lu_forage: f => `${f} σε εποχή`, lu_forageHere: f => `${f} σε εποχή, και στον οδηγό της περιοχής`,
    lu_e: { natReal: 'τα ψάρια βλέπουν λεπτομέρειες, άρα ένα φυσικό χρώμα μοιάζει αληθινό', loudFake: 'ένα έντονο χρώμα μπορεί να φανεί ψεύτικο στα πονηρά ψάρια',
      brightFar: 'κιτρινοπράσινο, πορτοκαλί και χρυσό φαίνονται πιο μακριά', outline: 'μαύρο ή λευκό δίνει το πιο καθαρό περίγραμμα', natLost: 'ένα φυσικό ή διάφανο χρώμα χάνεται',
      glow: 'το φωσφοριζέ φέγγει για λίγο αφού το φορτίσετε με φως', uv: 'η UV βαφή φαίνεται με λίγο φως', silhouette: 'ένα σκούρο σχήμα ξεχωρίζει κόντρα στον ουρανό από πάνω',
      noFlash: 'δεν υπάρχει φως για να γυαλίσει', gold: 'το χρυσό φαίνεται καλύτερα από το ασημί', pale: 'το λευκό και το περλέ ξεχωρίζουν', flash: 'το ασημί και το χρώμιο γυαλίζουν σαν λέπια',
      glowWaste: 'το φωσφοριζέ δεν προσφέρει τίποτα στο φως της μέρας', clearHide: 'ένα διάφανο σώμα κρύβει το περίγραμμά του',
      redDark: 'το κόκκινο γίνεται σκούρο γκρι από τα 10 m περίπου και φαίνεται σαν σκούρο σχήμα', orangeFade: 'το πορτοκαλί ξεθωριάζει από τα 20 m περίπου', blueGreen: 'το μπλε και το πράσινο φτάνουν πιο βαθιά',
      glowDeep: 'το φωσφοριζέ φαίνεται στα βαθιά, σκοτεινά νερά', sandMatch: 'τα ανοιχτά, αμμώδη χρώματα μοιάζουν με ό,τι ζει εκεί', sandDark: 'ένα σκούρο σχήμα ξεχωρίζει πάνω στην ανοιχτή άμμο',
      grassMatch: 'το λαδί και το πράσινο δένουν σαν τις γαρίδες που ζουν εκεί', grassBright: 'ένα έντονο χρώμα ξεχωρίζει πάνω στο σκούρο λιβάδι',
      rockMatch: 'καφέ, πορτοκαλί και κόκκινο είναι τα χρώματα των καβουριών και των ψαριών του βράχου', foam: 'το λευκό και το περλέ μοιάζουν με τον αφρό και τις φυσαλίδες',
      subtleLost: 'ένα διακριτικό χρώμα χάνεται μέσα του', calmClear: 'τα ψάρια κοιτάζουν προσεκτικά: διάφανα και φυσικά χρώματα', forage: 'ταιριάξτε το χρώμα τους',
      smallFish: 'μικρά ψάρια, που τα μιμείται ένα σχέδιο σαρδέλας ή αθερίνας', squid: 'καλαμάρι και χταπόδι, που τα μιμείται αυτό το χρώμα', shrimp: 'γαρίδες και καβούρια, που τα μιμείται αυτό το χρώμα' },
    lu_best: 'καλύτερο εδώ', lu_noWhy: 'Κανένας ισχυρός λόγος υπέρ ή κατά εδώ τώρα', lu_env: 'Εδώ τώρα', lu_vis: (v, s) => `ορατότητα περίπου ${v} m (${s})`,
    lu_visP: 'δορυφορική εκτίμηση ανοιχτής θάλασσας για τον μήνα', lu_visS: 'σημερινός δορυφόρος', lu_cloud: n => `νέφωση ${n}%`, lu_wave: w => `κύμα ${w} m`,
    // round 13 sea
    a3_noSea: 'Καμία πρόγνωση κυμάτων εδώ για αυτή την ώρα: η θάλασσα φαίνεται επίπεδη', a3_seaAid: 'Πιο έντονα για να φαίνονται από μακριά: σκίαση κυμάτων, ριπές, γραμμές κατά τον άνεμο', a3_seaLvl: 'Στο νερό', a3_seaUp: 'Πίσω ψηλά',
    // round 13 street: street view in the 3D area (js/area3d-street.js)
    sv_toggle: 'Προβολή δρόμου', sv_loading: 'Φόρτωση φωτογραφιών δρόμου…', sv_count: (n, s) => `${n} σημεία με φωτογραφίες δρόμου (${s}) · πατήστε ένα ή πατήστε στη στεριά για το Google Street View`,
    sv_none: 'Δεν υπάρχουν ανοιχτές φωτογραφίες δρόμου εδώ: πατήστε στη στεριά για το Google Street View', sv_here: 'Αυτό το σημείο', sv_hereTxt: 'Δείτε το σε επίπεδο δρόμου σε άλλη εφαρμογή.',
    sv_gsv: 'Google Street View', sv_gsvHere: 'Άνοιγμα στο Google Street View εδώ', sv_mly: 'Mapillary', sv_open: s => `Άνοιγμα στο ${s}`, sv_pano: 'Πανόραμα δρόμου 360°', sv_photo: 'Φωτογραφία δρόμου',
    sv_cpano: 'Πανόραμα 360°', sv_cphoto: 'Φωτογραφία του σημείου', sv_by: w => `από ${w}`, sv_close: 'Κλείσιμο',
    sv_view360: 'Προβολή 360°', sv_viewPhoto: 'Προβολή φωτογραφίας', sv_loadingPic: 'Φόρτωση της εικόνας…', sv_drag: 'Σύρετε για να κοιτάξετε γύρω · τσιμπήστε για ζουμ', sv_failPic: 'Η εικόνα δεν φορτώθηκε εδώ. Ανοίξτε τη στη δική της σελίδα παρακάτω.',
    sv_pinch: 'Τσιμπήστε ή πατήστε δύο φορές για ζουμ', sv_look: 'Δείτε από εδώ', sv_gsvShort: 'Street View', sv_offline: 'Είστε εκτός σύνδεσης: οι εικόνες θέλουν σύνδεση.',
    lu_fFish: 'Ψάρι', lu_fType: 'Είδος τεχνητού', lu_fBudget: 'Κόστος', lu_allTypes: 'Όλα τα είδη', lu_anyPrice: 'Κάθε τιμή', lu_b1: 'Φτηνά (€)', lu_b2: 'Έως €€',
    lu_price: ['', '€: κάτω από περίπου 6 €', '€€: περίπου 6–20 €', '€€€: πάνω από περίπου 20 €'], lu_priceNote: 'χονδρική τιμή καταστήματος για ένα απλό τεχνητό, όχι προσφορά', lu_close: 'Κλείσιμο',
    lu_noMatch: 'Κανένα τεχνητό εδώ δεν ταιριάζει σε αυτά τα φίλτρα.', lu_moon: n => `φεγγάρι φωτισμένο ${n}%`,
    // round 14 ui: the first run's welcome (index.html #guide.wl), the location's reason (js/ui.js locateMe), the offline box of what loads on first use
    wl_title: 'Πού και πότε να ψαρέψετε στην Κύπρο', wl_tour: 'Γρήγορη ξενάγηση',
    wl_1: 'Η χρωματιστή θάλασσα είναι η πιθανότητα για το ψάρι σας, ώρα με την ώρα: μπλε χαμηλή, πορτοκαλί και κόκκινο η καλύτερη.',
    wl_2: 'Διαλέξτε ψάρι, και βάρκα, ακτή ή ψαροντούφεκο, στην κορυφή του χάρτη.',
    wl_3: 'Πατήστε στη θάλασσα για τον βαθμό. Το «Περισσότερα» δίνει την καλύτερη ώρα, δολώματα, τεχνητά και τον βυθό.',
    r14_locWhy: 'Για να δείξει καλά νερά κοντά σας και τη θέση σας στον χάρτη, το Psarema χρειάζεται τη θέση σας. Πατήστε «Η θέση μου» για να την επιτρέψετε.',
    r14_offLoad: 'Δεν φορτώθηκε. Θα φορτώσει μόνο του μόλις συνδεθείτε ξανά.',
    // round 14 rules
    rl_checked: 'Έλεγχος 14 Νοε 2026 με τους όρους αδειών ΤΑΘΕ 2026, τους περί Αλιείας Κανονισμούς και τους κανόνες της ΕΕ· όπου ο νόμος διαφέρει, ισχύει ο νόμος.',
    rl_zoneChecked: 'Έλεγχος 14 Νοε 2026 με τον χάρτη απαγορευμένων περιοχών του ΤΑΘΕ (Ιούνιος 2026).',
    rl_bathBoat: 'Περιοχή λουομένων σε περίοδο κολύμβησης: καθόλου ψάρεμα εδώ, όλες τις ώρες, για τους αδειούχους (όροι ΤΑΘΕ §6). Σχεδιασμένη από το διάταγμα του 2025· το διάταγμα του 2026 δεν βρέθηκε: ακολουθήστε τις σημαδούρες και τις πινακίδες.',
    rl_bathShore: 'Περιοχή λουομένων σε περίοδο κολύμβησης: οι όροι αδειών απαγορεύουν το ψάρεμα εδώ όλες τις ώρες (όροι ΤΑΘΕ §6). Δεν δεσμεύουν το καλάμι από την ακτή, αλλά μείνετε μακριά από τους λουόμενους. Σχεδιασμένη από το διάταγμα του 2025· το διάταγμα του 2026 δεν βρέθηκε: ακολουθήστε τις πινακίδες.',
    // round 14 store: Offline areas keep the data, not the online imagery (js/offline.js)
    of_dataOnly: 'Αποθηκεύει την πρόγνωση και τα δεδομένα θάλασσας για αυτή την περιοχή. Χωρίς σήμα, ο χάρτης δείχνει τις δορυφορικές εικόνες που έχει η ίδια η εφαρμογή (λεπτομέρεια περίπου 10 m).',
    of_noSat: 'Οι πιο καθαρές δορυφορικές εικόνες θέλουν σύνδεση: η άδειά τους δεν επιτρέπει να μένουν στη συσκευή.', of_rowData: d => `Πρόγνωση και δεδομένα θάλασσας · αποθηκεύτηκε ${d}`,
    // round 15 heat map: the legend's ends in words (js/map.js)
    hl_lo: 'Πιο αδύναμα',
    l_fronts: 'Θαλάσσια μέτωπα', fr_tip: 'Διάστικτες γραμμές όπου η θερμοκρασία της επιφάνειας της θάλασσας αλλάζει απότομα, από τον πιο πρόσφατο δορυφορικό χάρτη. Τα ψάρια συχνά μαζεύονται κατά μήκος τους. Χαρακτηριστικό της θάλασσας, όχι βαθμός ψαρέματος.',
    fr_note: d => `Τελείες: θερμικά μέτωπα, δορυφόρος ${d}. Όχι βαθμός.`, fr_none: 'Τα θαλάσσια μέτωπα δεν φόρτωσαν. Δοκιμάστε ξανά με σύνδεση.',
    // round 15 catch loop: Share catches for science (js/catchlog.js PsShare), off unless the angler switches it on
    cs_title: 'Ψαριές για την επιστήμη', cs_sub: 'Προαιρετικό · ανενεργό αρχικά', cs_switch: 'Μοιράζομαι τις ψαριές μου για να βελτιωθεί ο χάρτης',
    cs_offSub: 'Ανενεργό: τίποτα δεν φεύγει από αυτό το τηλέφωνο.', cs_onSub: 'Ενεργό. Απενεργοποιήστε το όποτε θέλετε: δεν στέλνεται τίποτα άλλο.',
    cs_why: 'Ο χάρτης ελέγχεται με πραγματικές ψαριές που έχουν ημερομηνία και τόπο. Οι δικές σας τον βοηθούν να γίνεται καλύτερος για κάθε ψαρά, με τον καιρό.',
    cs_whatT: 'Τι μοιράζεται, για κάθε ψαριά ή άδεια έξοδο', cs_neverT: 'Δεν μοιράζονται ποτέ',
    cs_what: ['Το ψάρι (σε άδεια έξοδο, το ψάρι που ψαρεύατε), πόσα, αν πιάστηκε ή μόνο φάνηκε, και ο τρόπος ψαρέματος', 'Η μέρα και η ώρα',
      'Το σημείο ως τετράγωνο περίπου 2 × 2 km, ποτέ το ίδιο το σημείο', 'Μόνο 7 μέρες μετά την ψαριά, ποτέ ενώ ψαρεύετε'],
    cs_never: 'Φωτογραφίες, σημειώσεις, μήκη, βάρη, δολώματα, το ακριβές σημείο, το όνομα, το email ή το προφίλ σας.',
    cs_who: 'Τα βλέπουν μόνο οι δημιουργοί της εφαρμογής, για να ελέγχουν τον χάρτη. Δεν εμφανίζονται ποτέ σε άλλους ψαράδες, δεν δημοσιεύονται ανά σημείο, δεν πωλούνται.',
    cs_scope: 'Αφορά ό,τι καταγράφετε σε αυτό το τηλέφωνο από εδώ και πέρα.', cs_earlier: n => n === 1 ? 'Μοιραστείτε και την 1 καταγραφή που ήδη έχετε' : `Μοιραστείτε και τις ${n} καταγραφές που ήδη έχετε`,
    cs_status: (w, s) => `${w} σε αναμονή σε αυτό το τηλέφωνο · ${s} ${s === 1 ? 'στάλθηκε' : 'στάλθηκαν'}`, cs_next: d => `Η επόμενη μπορεί να φύγει στις ${d}.`,
    cs_noServer: 'Δεν στέλνεται τίποτα ακόμη: αυτή η έκδοση της εφαρμογής δεν έχει διακομιστή για αυτό.',
    cs_export: 'Εξαγωγή για τον έλεγχο του χάρτη', cs_exportSub: 'Όλες οι καταγραφές σας όπως θα μοιράζονταν (τετράγωνα 2 km, χωρίς φωτογραφίες ή σημειώσεις), στη μορφή του ελέγχου ακρίβειας του χάρτη.',
    cs_on: 'Ενεργό', cs_off: 'Ανενεργό', cs_onToast: 'Ενεργό. Οι επόμενες ψαριές σας περιμένουν 7 μέρες σε αυτό το τηλέφωνο.', cs_offToast: 'Ανενεργό. Δεν θα σταλεί τίποτα άλλο.',
    cs_none: 'Τίποτα καταγεγραμμένο ακόμη.', cs_added: n => n === 1 ? 'Προστέθηκε 1 καταγραφή' : `Προστέθηκαν ${n} καταγραφές`,
    cs_signin: 'Η κοινή χρήση γίνεται μέσω του λογαριασμού σας: συνδεθείτε για να σταλούν.', cs_del: n => n ? `Διαγραφή των ψαριών που μοιράστηκα (${n})` : 'Διαγραφή των ψαριών που μοιράστηκα',
    cs_delAsk: n => `Διαγραφή ${!n ? 'όλων όσων μοιράστηκε αυτός ο λογαριασμός' : n === 1 ? 'της καταγραφής που μοιραστήκατε' : `των ${n} καταγραφών που μοιραστήκατε`} από τον διακομιστή; Το δικό σας ημερολόγιο μένει σε αυτό το τηλέφωνο. Δεν αναιρείται.`,
    ct_seenN: n => `${n} ${n === 1 ? 'θέαση' : 'θεάσεις'}`, ct_seenApart: n => `Ακόμη ${n} ${n === 1 ? 'ψάρι που είδατε' : 'ψάρια που είδατε'} χωρίς να πιάσετε: δεν μετρούν ως ψαριές, ούτε στη μάθηση του χάρτη.`,
    ct_seen: 'Το είδα, δεν το έπιασα', ctf_seenSub: 'Μόνο το είδατε (κατάδυση, από τη βάρκα) ή το αφήσατε πριν βγει: τίποτα δεν κρατήθηκε', ct_seenOf: f => `Το είδα · ${f}`,
    cs_deleted: 'Οι ψαριές που μοιραστήκατε διαγράφηκαν από τον διακομιστή.', cs_delErr: 'Η διαγραφή δεν έγινε τώρα. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.',
    // round 16-17 H: the map legend, the zones' words, no good water, the sea by coast (js/map.js, js/seastate.js)
    hl_best: 'Κοντά στο καλύτερό του', hlRel: 'Κάθε σημείο σε σχέση με τη βαθμολογία των καλύτερων νερών αυτού του ψαριού με αυτή τη μέθοδο σε μια καλή μέρα, με την ίδια κλίμακα κάθε μέρα και ώρα: μια ήρεμη καλή μέρα λάμπει, μια φουρτουνιασμένη φαίνεται πιο θαμπή. Τα χρώματα δεν συγκρίνουν ένα ψάρι με άλλο. Πατήστε στο νερό για τη βαθμολογία του.',
    pz_ban: 'Απαγόρευση αλιείας', pz_dim: 'Ελέγξτε κανόνες', pz_rules: 'Ισχύουν κανόνες', pz_dfmr: 'Ελέγξτε τους κανόνες με το ΤΑΘΕ πριν ψαρέψετε εδώ.',
    pz_unclear: 'Οι κανόνες για την ερασιτεχνική αλιεία εδώ δεν είναι σαφείς, γι’ αυτό ο χάρτης χαμηλώνει αυτά τα νερά: ελέγξτε με το ΤΑΘΕ πριν ψαρέψετε εδώ.',
    ng_hour: t => `Κανένα καλό νερό αυτή την ώρα. Καλύτερα στις ${t}`, ng_today: d => `Δεν έχει άλλο καλό νερό σήμερα. Καλύτερα: ${d}`, ng_day: d => `Κανένα καλό νερό αυτή τη μέρα. Καλύτερη μέρα: ${d}`,
    ng_week: 'Κανένα καλό νερό αυτή την εβδομάδα',
    sea_coast: ['δυτική', 'βορειοδυτική', 'νότια', 'ανατολική'], sea_calm: c => `Ήρεμα στη ${c} ακτή`, sea_rough: c => `Φουρτούνα στη ${c} ακτή`,
    sea_both: (c, r) => `Ήρεμα στη ${c} ακτή, φουρτούνα στη ${r}`, sea_allCalm: 'Ήρεμα σε όλες τις ακτές', sea_allRough: 'Φουρτούνα σε όλες τις ακτές',
  },
};

// Words for the reorganised layout, plus wording fixes from the usability review (later keys override the ones above).
Object.assign(I18N.en, {
  nOn: n => `${n} on`, helpCentre: 'Help centre', checkUpdates: 'Check for updates', appVersion: v => `Version ${v}`, updChecking: 'Checking for updates…', updLatest: 'You have the latest version', updDownloading: 'Downloading the update…', updApplying: 'Update installed, restarting…', updOff: 'Updates aren’t set up yet: install the newest APK to update', updFailed: 'Couldn’t check for updates. Check your connection',
  grpFishing: 'Fishing', grpWeather: 'Weather and sea', grpPlaces: 'Places and seabed',
  l_wind: 'Wind', l_waves: 'Waves', l_currents: 'Currents', l_rain: 'Rain and cloud', l_temp: 'Air temperature',
  playForecast: 'Play the forecast', forecastHour: 'Forecast hour', viewMore: 'View more', route: 'Route', directions: 'Route',
  best: w => `★ Best time ${w}`, bestTip: 'Jump to the hour with the best chance for this fish',
  bestUpTo: s => `chance up to ${s}`, goThere: 'Show', bestCard: (w, s) => `Highest fish chance: ${w} (${s}/100)`,
  bestHere: w => `Highest fish chance (any weather): ${w}`, whyTitle: 'Why this score', grpWhere: 'Where it lives', grpCond: 'Conditions now', grpDraw: 'What draws fish here',
  spotWeather: 'Weather here, 9 days', details: 'Details', anyMethod: 'Any method', season: 'Season',
  gust: 'gusts', runTip: 'distance by sea from the nearest harbour or slipway',
  run: n => `${n} km by sea`, allFishName: 'All fish', allFishSub: 'All in season, on one map', inSeason: n => `${n} fish in season`, likely: 'Likely here', noLoc: 'No location', locCleared: 'Location removed', dayWx: 'Highest waves and strongest wind around the island that day',
  northNoData: 'There is no data for the north of the island.', copiedToast: 'GPS position copied',
  f_access: 'Shore access', f_coast: 'Coast', noAccess: 'far from any road or path', accessM: m => `${m} m from a road or path`,
  coastType: { 0: 'unknown', 1: 'sand or pebble beach', 2: 'rocky shore', 3: 'breakwater or pier', 4: 'port (fishing usually banned)', 5: 'military or closed area' },
  bathingBan: 'Bathing area: no spearfishing in season', restrictedZone: 'Restricted area: no fishing',
  major: 'major moon period', minor: 'minor moon period', solShort: { major: 'major', minor: 'minor' }, k_major: 'Moon bite',
  allLayers: 'All layers', credits: 'Map and data credits', baits: 'Best baits', baitsHere: 'Best baits here', luresHere: 'Lures and soft plastics here',
  col_clear: 'Colours for clear water in daylight', col_murky: 'Colours for murky water', col_low: 'Colours for low light (dawn, dusk, cloud)', col_night: 'Colours for night', baitFor: f => `for ${f}`, lures: 'Lures', silicone: 'Soft plastics (silicone)', technique: 'How to fish it', where: 'Where',
  when: 'When', handling: 'Handling', eating: 'Eating', setups: 'Recommended setups', rod: 'Rod', reel: 'Reel', line: 'Main line', leader: 'Leader',
  rig: 'Rig', hook: 'Hook', gun: 'Speargun', gunLength: 'Length', yes: 'Yes', no: 'No', colours: 'Colours', weight: 'Weight', size: 'Size',
  noGear: 'A detailed gear guide for this fish is not available yet.', sources: 'Sources',
  photos: 'Photos: Wikimedia Commons contributors (tap or hover a photo for its author and licence).',
  l_zones: 'Best-area outlines', mapLabel: 'Satellite map of the sea around Cyprus with fishing chances', language: 'Language',
  k_press: 'Pressure', breakdown: 'Score breakdown', caution: 'Caution', bestTag: 'Best', sortBy: 'Sort', topAt: w => `Best spots for ${w}`,
  zoomHint: 'These show when you zoom in:', monthLetters: 'JFMAMJJASOND',
  menu: 'Menu', sheet: 'Forecast, spots and guide', sheetToggle: 'Show more or less', modeSet: m => `${m} fishing`,
  locNoFix: 'No GPS fix yet. Turn on your phone’s Location, or try outdoors.',
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  whyPlus: { f_depth: 'Right depth', f_seabed: 'Good seabed', f_shore: 'Right distance from shore', f_run: 'Short boat run', f_access: 'Easy to reach from a road',
    f_coast: 'Good coast', f_relief: 'Drop-offs and banks', f_struct: 'Wrecks, reefs or piers nearby', f_seen: 'Recorded here before', f_edge: 'Edge between seabed types',
    f_known: 'Known fishing spot', f_front: 'Temperature front', f_plankton: 'Rich, plankton-fed water', f_up: 'Cool, rich water rising', f_settle: 'Sea settling after a blow' },
  whyMinus: { f_depth: 'Depth not ideal', f_seabed: 'Seabed not ideal', f_shore: 'Wrong distance from shore', f_run: 'Long boat run', f_access: 'Hard to reach on foot',
    f_coast: 'Coast not ideal', f_temp: 'Water temperature not ideal', f_current: 'Current not ideal', f_waves: 'Sea state not ideal', f_wind: 'Too rough to fish',
    f_clarity: 'Murky water', f_time: 'Quiet time of day for it', f_moon: 'Moon phase not ideal', f_press: 'Pressure rising', f_season: 'Out of season', f_fit: 'Unlike the places it is usually recorded' },
});
Object.assign(I18N.el, {
  nOn: n => `${n} ενεργά`, helpCentre: 'Κέντρο βοήθειας', checkUpdates: 'Έλεγχος για ενημερώσεις', appVersion: v => `Έκδοση ${v}`, updChecking: 'Έλεγχος για ενημερώσεις…', updLatest: 'Έχετε την τελευταία έκδοση', updDownloading: 'Λήψη της ενημέρωσης…', updApplying: 'Η ενημέρωση εγκαταστάθηκε, επανεκκίνηση…', updOff: 'Οι ενημερώσεις δεν έχουν ρυθμιστεί ακόμα: εγκαταστήστε το νεότερο APK', updFailed: 'Ο έλεγχος απέτυχε. Ελέγξτε τη σύνδεσή σας',
  grpFishing: 'Ψάρεμα', grpWeather: 'Καιρός και θάλασσα', grpPlaces: 'Τοποθεσίες και βυθός',
  l_wind: 'Άνεμος', l_waves: 'Κύματα', l_currents: 'Ρεύματα', l_rain: 'Βροχή και νέφωση', l_temp: 'Θερμοκρασία αέρα',
  playForecast: 'Αναπαραγωγή πρόγνωσης', forecastHour: 'Ώρα πρόγνωσης', viewMore: 'Περισσότερα', route: 'Διαδρομή', directions: 'Διαδρομή',
  boat: 'Βάρκα', best: w => `★ Καλύτερη ώρα ${w}`, bestTip: 'Μετάβαση στην ώρα με την καλύτερη ευκαιρία για αυτό το ψάρι',
  bestUpTo: s => `ευκαιρία έως ${s}`, goThere: 'Εμφάνιση', bestCard: (w, s) => `Μέγιστη ευκαιρία ψαριού: ${w} (${s}/100)`,
  bestHere: w => `Μέγιστη ευκαιρία ψαριού (με κάθε καιρό): ${w}`, whyTitle: 'Γιατί αυτός ο βαθμός', grpWhere: 'Πού ζει', grpCond: 'Συνθήκες τώρα', grpDraw: 'Τι τραβά τα ψάρια εδώ',
  spotWeather: 'Καιρός εδώ, 9 ημέρες', details: 'Λεπτομέρειες', anyMethod: 'Κάθε τρόπος', season: 'Εποχή',
  gust: 'ριπές', runTip: 'απόσταση με βάρκα από το πλησιέστερο λιμάνι ή γλίστρα',
  run: n => `${n} km με βάρκα`, allFishName: 'Όλα τα ψάρια', allFishSub: 'Όλα τα ψάρια της εποχής', inSeason: n => `${n} ψάρια στην εποχή τους`, likely: 'Πιθανά εδώ', noLoc: 'Χωρίς τοποθεσία', locCleared: 'Η τοποθεσία αφαιρέθηκε', dayWx: 'Το ψηλότερο κύμα και ο δυνατότερος άνεμος γύρω από το νησί εκείνη τη μέρα',
  northNoData: 'Για το βόρειο τμήμα του νησιού δεν υπάρχουν δεδομένα.', copiedToast: 'Η θέση GPS αντιγράφηκε',
  f_access: 'Πρόσβαση από ακτή', f_coast: 'Ακτή', noAccess: 'μακριά από δρόμο ή μονοπάτι', accessM: m => `${m} m από δρόμο ή μονοπάτι`,
  coastType: { 0: 'άγνωστο', 1: 'αμμουδιά ή βότσαλο', 2: 'βραχώδης ακτή', 3: 'κυματοθραύστης ή προβλήτα', 4: 'λιμάνι (συνήθως απαγορεύεται)', 5: 'στρατιωτική ή κλειστή περιοχή' },
  bathingBan: 'Περιοχή λουομένων: όχι ψαροντούφεκο την περίοδο κολύμβησης', restrictedZone: 'Απαγορευμένη περιοχή: όχι ψάρεμα',
  major: 'κύρια σεληνιακή περίοδος', minor: 'δευτερεύουσα σεληνιακή περίοδος', solShort: { major: 'κύρια', minor: 'δευτερεύουσα' }, k_major: 'Φεγγάρι',
  allLayers: 'Όλα τα επίπεδα', credits: 'Πηγές χάρτη και δεδομένων', baits: 'Καλύτερα δολώματα', baitsHere: 'Καλύτερα δολώματα εδώ', luresHere: 'Τεχνητά και σιλικόνες εδώ',
  col_clear: 'Χρώματα για καθαρά νερά με φως ημέρας', col_murky: 'Χρώματα για θολά νερά', col_low: 'Χρώματα για λίγο φως (αυγή, σούρουπο, συννεφιά)', col_night: 'Χρώματα για νύχτα', baitFor: f => `για ${f}`, lures: 'Τεχνητά', silicone: 'Σιλικόνες', technique: 'Πώς ψαρεύεται', where: 'Πού',
  when: 'Πότε', handling: 'Χειρισμός', eating: 'Για φαγητό', setups: 'Προτεινόμενος εξοπλισμός', rod: 'Καλάμι', reel: 'Μηχανάκι', line: 'Πετονιά', leader: 'Παράμαλλο',
  rig: 'Αρματωσιά', hook: 'Αγκίστρι', gun: 'Ψαροντούφεκο', gunLength: 'Μήκος', yes: 'Ναι', no: 'Όχι', colours: 'Χρώματα', weight: 'Βάρος', size: 'Μέγεθος',
  noGear: 'Ο αναλυτικός οδηγός εξοπλισμού για αυτό το ψάρι δεν είναι ακόμα διαθέσιμος.', sources: 'Πηγές',
  photos: 'Φωτογραφίες: συνεισφέροντες του Wikimedia Commons (πατήστε ή περάστε τον δείκτη πάνω από μια φωτογραφία για δημιουργό και άδεια).',
  bottom: 'Ψάρια βυθού', pelagic: 'Πελαγικά', f_relief: 'Γκρεμοί, ξέρες', hideBelow: 'Απόκρυψη κάτω από', none: 'τίποτα κοντά',
  cached: p => p >= 100 ? 'χάρτης αποθηκευμένος' : `χάρτης αποθηκευμένος ${p}%`,
  opacity: 'Αδιαφάνεια', l_zones: 'Περιγράμματα καλύτερων περιοχών', mapLabel: 'Δορυφορικός χάρτης της θάλασσας γύρω από την Κύπρο με τις πιθανότητες ψαρέματος', language: 'Γλώσσα',
  k_press: 'Πίεση', breakdown: 'Ανάλυση βαθμού', caution: 'Προσοχή', bestTag: 'Καλύτερο', sortBy: 'Ταξινόμηση', topAt: w => `Καλύτερα σημεία για ${w}`,
  zoomHint: 'Αυτά φαίνονται όταν μεγεθύνετε:', monthLetters: 'ΙΦΜΑΜΙΙΑΣΟΝΔ',
  menu: 'Μενού', sheet: 'Πρόγνωση, σημεία και οδηγός', sheetToggle: 'Περισσότερα ή λιγότερα', modeSet: m => `Ψάρεμα: ${m}`,
  locNoFix: 'Δεν βρέθηκε ακόμη θέση GPS. Ανοίξτε την Τοποθεσία του τηλεφώνου ή δοκιμάστε σε ανοιχτό χώρο.',
  months: ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'],
  whyPlus: { f_depth: 'Σωστό βάθος', f_seabed: 'Κατάλληλος βυθός', f_shore: 'Σωστή απόσταση από την ακτή', f_run: 'Κοντινή διαδρομή με βάρκα', f_access: 'Εύκολη πρόσβαση από δρόμο',
    f_coast: 'Κατάλληλη ακτή', f_relief: 'Γκρεμοί και ξέρες', f_struct: 'Ναυάγια, ύφαλοι ή προβλήτες κοντά', f_seen: 'Έχει καταγραφεί εδώ', f_edge: 'Εκεί που αλλάζει ο βυθός',
    f_known: 'Γνωστό σημείο ψαρέματος', f_front: 'Θερμικό μέτωπο', f_plankton: 'Πλούσιο νερό με πλαγκτόν', f_up: 'Ανάβλυση κρύου, πλούσιου νερού', f_settle: 'Θάλασσα που ηρεμεί μετά τη φουρτούνα' },
  whyMinus: { f_depth: 'Όχι το ιδανικό βάθος', f_seabed: 'Όχι ο ιδανικός βυθός', f_shore: 'Λάθος απόσταση από την ακτή', f_run: 'Μεγάλη διαδρομή με βάρκα', f_access: 'Δύσκολη πρόσβαση με τα πόδια',
    f_coast: 'Όχι η ιδανική ακτή', f_temp: 'Όχι η ιδανική θερμοκρασία νερού', f_current: 'Όχι το ιδανικό ρεύμα', f_waves: 'Όχι η ιδανική θάλασσα', f_wind: 'Πολύς αέρας για ψάρεμα',
    f_clarity: 'Θολό νερό', f_time: 'Νεκρή ώρα για αυτό το ψάρι', f_moon: 'Όχι το καλύτερο φεγγάρι', f_press: 'Η πίεση ανεβαίνει', f_season: 'Εκτός εποχής', f_fit: 'Δεν μοιάζει με τα μέρη όπου συνήθως καταγράφεται' },
  how2: 'Η θερμοκρασία επιφάνειας και βυθού και το πλαγκτόν είναι σημερινοί χάρτες δορυφόρου και ωκεανογραφικού μοντέλου (~1–4 km). Άνεμος, κύμα και ρεύμα προέρχονται από τετράγωνα πρόγνωσης ~15 km, προσαρμοσμένα ανά κελί για την προστασία της ακτής. Βυθός, ενδιαιτήματα και σημεία έχουν ανάλυση 250 m. Τα προφίλ των ψαριών βασίζονται σε δημοσιευμένη οικολογία και προσαρμόζονται με πραγματικές παρατηρήσεις όπου υπάρχουν αρκετές· δεν έχουν ελεγχθεί με πραγματικές ψαριές. Για το βόρειο τμήμα του νησιού δεν υπάρχουν δεδομένα.',
});

// Going-out conditions (js/conditions.js): the score, its reasons, the best time to go and the area list.
Object.assign(I18N.en, {
  cTitle: 'Conditions', cHead: 'Going out: conditions here', cMode: { boat: 'a small boat', shore: 'shore fishing', spear: 'spearfishing' },
  cVerdict: (r, m) => ({ great: `Great conditions for ${m}`, good: `Good conditions for ${m}`, fair: `Fair conditions for ${m}`, poor: `Poor conditions for ${m}`, unsafe: `Not safe for ${m}` })[r],
  cr_thunder: 'Thunderstorms: stay off the water and off the rocks', cr_windNo: (v, b) => `Wind ${v} km/h (Bft ${b}): too strong`, cr_wind: (v, b) => `Fresh wind ${v} km/h (Bft ${b})`,
  cr_windOk: (v, b) => `Light wind ${v} km/h (Bft ${b})`, cr_gustNo: g => `Gusts to ${g} km/h: too strong`, cr_gust: g => `Gusty, up to ${g} km/h`,
  cr_waveNo: h => `Waves ${h} m: too rough`, cr_wave: h => `Waves ${h} m`, cr_waveOk: h => `Calm sea, waves ${h} m`, cr_chop: (h, t) => `Short, steep chop: ${h} m every ${t} s`,
  cr_swellShore: h => `Swell ${h} m surging on the rocks: keep back from the edge`, cr_swellSpear: h => `Swell ${h} m: surge and stirred-up water`,
  cr_curNo: c => `Current ${c} km/h: too strong to swim against`, cr_cur: c => `Current ${c} km/h: tiring for a diver`, cr_rain: r => `Rain ${r} mm/h`,
  cr_fogNo: v => `Fog, ${v} km visibility: too risky`, cr_fog: v => `Poor visibility, ${v} km`, cr_hot: t => `Hot, ${t} °C: take water and shade`, cr_cold: t => `Cold, ${t} °C`,
  cr_uv: u => `UV ${u}: very strong sun, cover up`, cr_seaCold: t => `Sea ${t} °C: thick wetsuit, shorter dives`,
  cr_darkBoat: 'Dark: navigation lights on, and tell someone your plan', cr_darkShore: 'Dark: take a head torch, the rocks are slippery',
  cr_darkSpear: 'Night: spearfishing is banned from sunset to sunrise (Fisheries Reg. 17)', cr_dimSpear: 'Low light: boats see your float less well',
  cr_shelter: 'Sheltered by the coast here',
  cGo: w => `Best safe window (fish × conditions): ${w}`, cFishTop: (w, s) => `Highest fish chance (any weather): ${w}, ${s}`, cGoNums: (f, c) => `fish ${f} · conditions ${c}`,
  cGoNone: 'No safe window with a chance here in the next 7 days',
  cGoLbl: 'Best safe time to go (fish × conditions)',
  cGoHow: 'Go score = √(fish × conditions), hour by hour; hours that are not safe score 0 (red on the floor). The best window is lighter; tap the curve to see an hour.',
  cToday: 'Today', cTomorrow: 'Tomorrow', cWeek: 'This week', yesterday: 'Yesterday', pastTag: 'Past',
  noWavesAfter: w => `No wave forecast after ${w}`,
  nearWiden: r => `Look within ${r} km`,
  cAreaNone: 'No safe window', cAreaWait: 'Working out the best windows…', cGear: 'Gear for this area',
  cHow: 'Conditions (0–100) say how good it is to go out the way you fish, after the shelter the coast gives. Not safe (0): thunderstorms; a small boat in wind of Bft 5 or more, gusts from 40 km/h, waves over 1 m or fog; shore fishing in Bft 6 or more, gusts from 65 km/h or waves over 1.5 m; spearfishing in Bft 4 or more, gusts from 30 km/h, waves over 0.5 m, current from 1.5 km/h or fog. Below those limits the score drops with wind and gusts (Beaufort scale), wave height and short, steep chop, swell on the rocks (shore) and surge (spear), rain, poor visibility, heat, cold, strong UV, a cold sea for divers and darkness. Spearfishing between sunset and sunrise is banned by law, so those hours get 0. The best time to go is √(fish × conditions). Always look at the sea yourself before you go.',
});
Object.assign(I18N.el, {
  cTitle: 'Συνθήκες', cHead: 'Έξοδος: οι συνθήκες εδώ', cMode: { boat: 'μικρό σκάφος', shore: 'ψάρεμα από ακτή', spear: 'ψαροντούφεκο' },
  cVerdict: (r, m) => ({ great: `Εξαιρετικές συνθήκες για ${m}`, good: `Καλές συνθήκες για ${m}`, fair: `Μέτριες συνθήκες για ${m}`, poor: `Κακές συνθήκες για ${m}`, unsafe: `Όχι ασφαλές για ${m}` })[r],
  cr_thunder: 'Καταιγίδες: μακριά από τη θάλασσα και τα βράχια', cr_windNo: (v, b) => `Άνεμος ${v} km/h (${b} Μποφόρ): πολύ δυνατός`, cr_wind: (v, b) => `Μέτριος άνεμος ${v} km/h (${b} Μποφόρ)`,
  cr_windOk: (v, b) => `Ασθενής άνεμος ${v} km/h (${b} Μποφόρ)`, cr_gustNo: g => `Ριπές έως ${g} km/h: πολύ δυνατές`, cr_gust: g => `Ριπές έως ${g} km/h`,
  cr_waveNo: h => `Κύμα ${h} m: πολύ άγρια θάλασσα`, cr_wave: h => `Κύμα ${h} m`, cr_waveOk: h => `Ήρεμη θάλασσα, κύμα ${h} m`, cr_chop: (h, t) => `Κοφτό, απότομο κύμα: ${h} m κάθε ${t} s`,
  cr_swellShore: h => `Αποθαλασσιά ${h} m σκάει στα βράχια: μείνετε μακριά από την άκρη`, cr_swellSpear: h => `Αποθαλασσιά ${h} m: φουσκοθαλασσιά και θολό νερό`,
  cr_curNo: c => `Ρεύμα ${c} km/h: πολύ δυνατό για κολύμπι`, cr_cur: c => `Ρεύμα ${c} km/h: κουραστικό για τον δύτη`, cr_rain: r => `Βροχή ${r} mm/h`,
  cr_fogNo: v => `Ομίχλη, ορατότητα ${v} km: πολύ επικίνδυνο`, cr_fog: v => `Χαμηλή ορατότητα, ${v} km`, cr_hot: t => `Ζέστη, ${t} °C: πάρτε νερό και σκιά`, cr_cold: t => `Κρύο, ${t} °C`,
  cr_uv: u => `UV ${u}: πολύ δυνατός ήλιος, προστατευτείτε`, cr_seaCold: t => `Θάλασσα ${t} °C: χοντρή στολή, πιο σύντομες βουτιές`,
  cr_darkBoat: 'Σκοτάδι: ανάψτε τα φώτα ναυσιπλοΐας και πείτε σε κάποιον το σχέδιό σας', cr_darkShore: 'Σκοτάδι: πάρτε φακό κεφαλής, τα βράχια γλιστρούν',
  cr_darkSpear: 'Νύχτα: το ψαροντούφεκο απαγορεύεται από τη δύση ως την ανατολή του ηλίου (Καν. 17 περί Αλιείας)', cr_dimSpear: 'Λίγο φως: τα σκάφη δύσκολα βλέπουν τη σημαδούρα σας',
  cr_shelter: 'Εδώ η ακτή σάς προστατεύει',
  cGo: w => `Καλύτερο ασφαλές παράθυρο (ψάρι × συνθήκες): ${w}`, cFishTop: (w, s) => `Μέγιστη ευκαιρία ψαριού (με κάθε καιρό): ${w}, ${s}`, cGoNums: (f, c) => `ψάρι ${f} · συνθήκες ${c}`,
  cGoNone: 'Κανένα ασφαλές παράθυρο με ευκαιρία εδώ τις επόμενες 7 ημέρες',
  cGoLbl: 'Καλύτερη ασφαλής ώρα (ψάρι × συνθήκες)',
  cGoHow: 'Βαθμός εξόδου = √(ψάρι × συνθήκες), ώρα με την ώρα· οι μη ασφαλείς ώρες μετράνε 0 (κόκκινο στη βάση). Το καλύτερο παράθυρο είναι πιο ανοιχτό· πατήστε την καμπύλη για να δείτε μια ώρα.',
  cToday: 'Σήμερα', cTomorrow: 'Αύριο', cWeek: 'Εβδομάδα', yesterday: 'Χθες', pastTag: 'Παρελθόν',
  noWavesAfter: w => `Καμία πρόγνωση κύματος μετά τις ${w}`,
  nearWiden: r => `Ψάξτε σε ακτίνα ${r} km`,
  cAreaNone: 'Κανένα ασφαλές παράθυρο', cAreaWait: 'Υπολογισμός των καλύτερων παραθύρων…', cGear: 'Εξοπλισμός για την περιοχή',
  cHow: 'Οι συνθήκες (0–100) δείχνουν πόσο καλά είναι να βγείτε με τον τρόπο που ψαρεύετε, μετά την προστασία που δίνει η ακτή. Όχι ασφαλές (0): καταιγίδες· μικρό σκάφος με άνεμο 5 Μποφόρ και πάνω, ριπές από 40 km/h, κύμα πάνω από 1 m ή ομίχλη· ψάρεμα από ακτή με 6 Μποφόρ και πάνω, ριπές από 65 km/h ή κύμα πάνω από 1,5 m· ψαροντούφεκο με 4 Μποφόρ και πάνω, ριπές από 30 km/h, κύμα πάνω από 0,5 m, ρεύμα από 1,5 km/h ή ομίχλη. Κάτω από αυτά τα όρια ο βαθμός πέφτει με τον άνεμο και τις ριπές (κλίμακα Μποφόρ), το ύψος του κύματος και το κοφτό, απότομο κύμα, την αποθαλασσιά στα βράχια (ακτή) και τη φουσκοθαλασσιά (ψαροντούφεκο), τη βροχή, τη χαμηλή ορατότητα, τη ζέστη, το κρύο, τον δυνατό ήλιο (UV), την κρύα θάλασσα για τους δύτες και το σκοτάδι. Το ψαροντούφεκο από τη δύση ως την ανατολή του ηλίου απαγορεύεται από τον νόμο, άρα αυτές οι ώρες παίρνουν 0. Η καλύτερη ώρα να πάτε είναι √(ψάρι × συνθήκες). Πάντα να κοιτάτε μόνοι σας τη θάλασσα πριν βγείτε.',
});

// The instruments (js/instruments.js): the details' gauges and the readings strip.
Object.assign(I18N.en, {
  in_rain: 'Rain', in_bft: b => `Bft ${b}`, in_pop: p => `${p}% chance`, in_thunder: 'Thunderstorms',
  in_sstLo: 'Cool for this fish', in_sstOk: 'Right for this fish', in_sstHi: 'Warm for this fish',
  in_lit: p => `${p}% lit`, in_moonDown: p => `${p}% lit · below the horizon`,
  in_majorNow: 'Major period now', in_minorNow: 'Minor period now', in_nextMajor: w => `Next major: ${w}`, // under the moon: its solunar periods
});
Object.assign(I18N.el, {
  in_rain: 'Βροχή', in_bft: b => `${b} Μποφόρ`, in_pop: p => `Πιθανότητα ${p}%`, in_thunder: 'Καταιγίδες',
  in_sstLo: 'Κρύα για αυτό το ψάρι', in_sstOk: 'Ιδανική για αυτό το ψάρι', in_sstHi: 'Ζεστή για αυτό το ψάρι',
  in_lit: p => `${p}% φωτισμένο`, in_moonDown: p => `${p}% · κάτω από τον ορίζοντα`,
  in_majorNow: 'Κύρια περίοδος τώρα', in_minorNow: 'Δευτερεύουσα περίοδος τώρα', in_nextMajor: w => `Επόμενη κύρια: ${w}`,
});

// The 3D dive view (js/dive3d.js).
Object.assign(I18N.en, {
  dive3d: '3D dive', diveOpen: 'See the seabed here in 3D', diveNorth: 'Turn to face north',
  diveHint: 'Drag to turn · pinch or scroll to zoom · two fingers to move',
  diveLoading: 'Loading the 3D view…', diveOffline: 'The 3D view needs an internet connection the first time.', diveNoGl: 'This device can’t show 3D.',
  diveMeta: (w, h, x, s) => `${w} × ${h} km · depth drawn ×${x} · lines every ${s} m`,
});
Object.assign(I18N.el, {
  dive3d: '3D βουτιά', diveOpen: 'Δείτε τον βυθό εδώ σε 3D', diveNorth: 'Στροφή προς τον βορρά',
  diveHint: 'Σύρετε για περιστροφή · τσιμπήστε ή κυλήστε για ζουμ · δύο δάχτυλα για μετακίνηση',
  diveLoading: 'Φόρτωση της 3D προβολής…', diveOffline: 'Η 3D προβολή χρειάζεται σύνδεση στο διαδίκτυο την πρώτη φορά.', diveNoGl: 'Η συσκευή δεν μπορεί να δείξει 3D.',
  diveMeta: (w, h, x, s) => `${w} × ${h} km · βάθος μεγεθυμένο ×${x} · ισοβαθείς ανά ${s} m`,
});

/* ---------- My catches (js/catchlog.js) ---------- */
Object.assign(I18N.en, {
  ct_my: 'My catches', ct_log: 'Log catch', ct_logTitle: 'Log a catch', ct_caught: 'Caught fish', ct_blank: 'Nothing caught',
  ct_blankWhy: 'Blank trips count: they teach the app where and when it did not work.',
  ct_fish: 'Fish', ct_target: 'Fishing for', ct_count: 'How many', ct_method: 'Method', ct_place: 'Place', ct_time: 'When', ct_photo: 'Photo',
  ct_gps: 'Where I am', ct_spot: 'Selected spot', ct_loc: 'My set location', ct_mapc: 'Map centre',
  ct_mapcHint: 'For an exact place, tap it on the map and use Log catch on its card.',
  ct_camera: 'Camera', ct_gallery: 'Gallery', ct_noPhoto: 'Remove', ct_photoErr: 'Could not read that photo.',
  ct_note: 'Note: bait, lure, weight… (optional)', ct_save: 'Save', ct_cancel: 'Cancel',
  ct_saved: (f, n) => `Saved · ${n} ${n === 1 ? 'trip' : 'trips'} logged for ${f}`,
  ct_canLearn: f => `Enough trips for ${f}: the map can now learn from them (My catches → Learn).`,
  ct_saveErr: 'Could not save on this device.', ct_exportErr: 'Could not export on this device.',
  ct_private: 'Stays on this device. Nothing is uploaded.',
  ct_summary: (n, c, b) => `${n} ${n === 1 ? 'trip' : 'trips'} · ${c} with fish · ${b} blank`,
  ct_empty: 'Nothing logged yet. Log your catches and your blank trips: both teach the map.',
  ct_t_list: 'Log', ct_t_fish: 'By fish', ct_t_pat: 'Your patterns', ct_t_learn: 'Learn',
  ct_onMap: 'On the map', ct_export: 'Export', ct_import: 'Import',
  ct_imported: n => `Imported ${n} ${n === 1 ? 'entry' : 'entries'}`, ct_badFile: 'That file is not a Psarema catch log.',
  ct_blankOf: f => `Blank · ${f}`, ct_scoreThen: (s, r) => `The map rated it ${s} then (${r}).`, ct_noCond: 'No forecast for that time: only the sun and moon were kept.',
  ct_show: 'Show on map', ct_del: 'Delete', ct_delAsk: 'Delete this entry? This cannot be undone.', ct_gust: 'gusts',
  ct_k: { time: 'Time of day', wind: 'Wind', waves: 'Waves', water: 'Water', moon: 'Moon lit', press: 'Pressure', depth: 'Depth' },
  ct_h: ['Fish', 'Trips', 'Fish caught', 'Blank', 'With fish', 'Best spot', 'Last caught'],
  ct_hl: ['Fish', 'With fish', 'Blank', 'Personal map'],
  ct_few: n => `Only ${n} ${n === 1 ? 'trip' : 'trips'} so far: patterns this early are mostly luck. Keep logging, blank trips too.`,
  ct_avg: (r, n) => `Your average: fish on ${r}% of ${n} trips. The bar = share of trips with fish.`,
  ct_of: (c, n) => `${c} of ${n}`, ct_fewRow: 'few trips', ct_better: 'above your average', ct_worse: 'below your average',
  ct_dims: { time: 'Time of day', moon: 'Moon', press: 'Pressure, 24 h', wind: 'Wind at the spot', waves: 'Waves at the spot', sol: 'Moon bite periods', method: 'Method', spot: 'Spots' },
  ct_b: { new: 'new (under 25% lit)', half: 'half', full: 'full (over 75% lit)', fall: 'falling', steady: 'steady', rise: 'rising', calm: 'under 10 km/h', light: '10–20 km/h',
    fresh: '20–30 km/h', strong: 'over 30 km/h', flat: 'under 0.3 m', slight: '0.3–0.8 m', rough: 'over 0.8 m', major: 'major', minor: 'minor', none: 'none' },
  ct_learn: 'Learn from my catches', ct_learnSub: 'A personal correction of the fishing map',
  ct_learnWhat: 'When on, the map of each fish you have logged leans toward the places and times of day where you caught it and away from your blank trips. It starts from your first trip and grows surer with each one. It is yours alone and stays on this device. A note on the map says when it is on.',
  ct_learnHow: 'How: each trip near a place (within about 5 km, nearer counts more) moves your chance there from your overall catch rate toward what happened there; a catch of another fish counts as half a trip. With few trips the change stays small. A place never moves more than −40%…+60%, a time of day (dawn, day, dusk, night) more than −15%…+18%. A tapped spot’s breakdown shows the part it adds.',
  ct_need: (c, b) => 'Needs ' + [c && `${c} more ${c === 1 ? 'trip' : 'trips'} with fish`, b && `${b} more blank ${b === 1 ? 'trip' : 'trips'}`].filter(Boolean).join(' and '),
  ct_changes: (lo, hi, a, h) => `On: places ${lo}…${hi}, ${a} km² moved over 5%; hours ±${h}%`,
  ct_would: (lo, hi, a, h) => `Ready (off): would move places ${lo}…${hi}, ${a} km² over 5%; hours ±${h}%`,
  ct_learnOn: 'The map now learns from your catches', ct_learnOff: 'The map no longer uses your catches',
  ct_badge: 'Personal map', ct_rowVal: (f, c, b) => `×${f} · from ${c} with fish, ${b} blank`,
  f_mine: 'Your own catches',
});
Object.assign(I18N.en.whyPlus, { f_mine: 'Like where and when you catch it' });
Object.assign(I18N.en.whyMinus, { f_mine: 'Like your blank trips' });
Object.assign(I18N.el, {
  ct_my: 'Οι ψαριές μου', ct_log: 'Καταγραφή ψαριάς', ct_logTitle: 'Νέα καταγραφή', ct_caught: 'Έπιασα', ct_blank: 'Δεν έπιασα',
  ct_blankWhy: 'Οι άδειες έξοδοι μετρούν: δείχνουν στην εφαρμογή πού και πότε δεν τσίμπησε τίποτα.',
  ct_fish: 'Ψάρι', ct_target: 'Ψάρευα για', ct_count: 'Πόσα', ct_method: 'Τρόπος', ct_place: 'Σημείο', ct_time: 'Πότε', ct_photo: 'Φωτογραφία',
  ct_gps: 'Εδώ που είμαι', ct_spot: 'Επιλεγμένο σημείο', ct_loc: 'Η τοποθεσία μου', ct_mapc: 'Κέντρο χάρτη',
  ct_mapcHint: 'Για ακριβές σημείο, πατήστε το στον χάρτη και «Καταγραφή ψαριάς» στην κάρτα του.',
  ct_camera: 'Κάμερα', ct_gallery: 'Συλλογή', ct_noPhoto: 'Αφαίρεση', ct_photoErr: 'Δεν διαβάστηκε η φωτογραφία.',
  ct_note: 'Σημείωση: δόλωμα, τεχνητό, βάρος… (προαιρετικό)', ct_save: 'Αποθήκευση', ct_cancel: 'Άκυρο',
  ct_saved: (f, n) => `Αποθηκεύτηκε · ${n} ${n === 1 ? 'έξοδος' : 'έξοδοι'} για ${f}`,
  ct_canLearn: f => `Αρκετές έξοδοι για ${f}: ο χάρτης μπορεί πλέον να μάθει από αυτές (Οι ψαριές μου → Μάθηση).`,
  ct_saveErr: 'Δεν αποθηκεύτηκε σε αυτή τη συσκευή.', ct_exportErr: 'Η εξαγωγή δεν έγινε σε αυτή τη συσκευή.',
  ct_private: 'Μένει σε αυτή τη συσκευή. Τίποτα δεν ανεβαίνει.',
  ct_summary: (n, c, b) => `${n} ${n === 1 ? 'έξοδος' : 'έξοδοι'} · ${c} με ψάρι · ${b} άδειες`,
  ct_empty: 'Τίποτα ακόμη. Καταγράψτε ψαριές και άδειες εξόδους: και τα δύο βοηθούν τον χάρτη να μάθει.',
  ct_t_list: 'Λίστα', ct_t_fish: 'Ανά ψάρι', ct_t_pat: 'Τα μοτίβα σας', ct_t_learn: 'Μάθηση',
  ct_onMap: 'Στον χάρτη', ct_export: 'Εξαγωγή', ct_import: 'Εισαγωγή',
  ct_imported: n => `Εισήχθησαν ${n} ${n === 1 ? 'εγγραφή' : 'εγγραφές'}`, ct_badFile: 'Αυτό το αρχείο δεν περιέχει ψαριές του Psarema.',
  ct_blankOf: f => `Άδεια · ${f}`, ct_scoreThen: (s, r) => `Ο χάρτης το βαθμολογούσε τότε ${s} (${r}).`, ct_noCond: 'Χωρίς πρόγνωση για εκείνη την ώρα: κρατήθηκαν μόνο ήλιος και φεγγάρι.',
  ct_show: 'Στον χάρτη', ct_del: 'Διαγραφή', ct_delAsk: 'Διαγραφή αυτής της εγγραφής; Δεν αναιρείται.', ct_gust: 'ριπές',
  ct_k: { time: 'Ώρα της μέρας', wind: 'Άνεμος', waves: 'Κύμα', water: 'Νερό', moon: 'Φως σελήνης', press: 'Πίεση', depth: 'Βάθος' },
  ct_h: ['Ψάρι', 'Έξοδοι', 'Ψάρια', 'Άδειες', 'Με ψάρι', 'Καλύτερο σημείο', 'Τελευταία ψαριά'],
  ct_hl: ['Ψάρι', 'Με ψάρι', 'Άδειες', 'Προσωπικός χάρτης'],
  ct_few: n => `Μόνο ${n} ${n === 1 ? 'έξοδος' : 'έξοδοι'} ως τώρα: τόσο νωρίς τα μοτίβα είναι κυρίως τύχη. Συνεχίστε να καταγράφετε, και τις άδειες εξόδους.`,
  ct_avg: (r, n) => `Ο μέσος όρος σας: ψάρι στο ${r}% από ${n} εξόδους. Η μπάρα = μερίδιο εξόδων με ψάρι.`,
  ct_of: (c, n) => `${c} από ${n}`, ct_fewRow: 'λίγες έξοδοι', ct_better: 'πάνω από τον μέσο όρο σας', ct_worse: 'κάτω από τον μέσο όρο σας',
  ct_dims: { time: 'Ώρα της μέρας', moon: 'Σελήνη', press: 'Πίεση, 24 ώρες', wind: 'Άνεμος στο σημείο', waves: 'Κύμα στο σημείο', sol: 'Περίοδοι σελήνης', method: 'Τρόπος', spot: 'Σημεία' },
  ct_b: { new: 'νέα (κάτω από 25% φωτεινή)', half: 'μισή', full: 'πανσέληνος (πάνω από 75%)', fall: 'πέφτει', steady: 'σταθερή', rise: 'ανεβαίνει', calm: 'κάτω από 10 km/h', light: '10–20 km/h',
    fresh: '20–30 km/h', strong: 'πάνω από 30 km/h', flat: 'κάτω από 0,3 m', slight: '0,3–0,8 m', rough: 'πάνω από 0,8 m', major: 'κύρια', minor: 'δευτερεύουσα', none: 'καμία' },
  ct_learn: 'Μάθηση από τις ψαριές μου', ct_learnSub: 'Μια προσωπική διόρθωση του χάρτη ψαρέματος',
  ct_learnWhat: 'Όταν είναι ενεργό, ο χάρτης κάθε ψαριού που έχετε καταγράψει γέρνει προς τα μέρη και τις ώρες της μέρας όπου το πιάσατε και μακριά από τις άδειες εξόδους σας. Ξεκινά από την πρώτη σας έξοδο και γίνεται πιο σίγουρος με κάθε νέα. Είναι μόνο δικός σας και μένει σε αυτή τη συσκευή. Μια σήμανση στον χάρτη δείχνει πότε είναι ενεργό.',
  ct_learnHow: 'Πώς: κάθε έξοδος κοντά σε ένα μέρος (ως περίπου 5 km, όσο πιο κοντά τόσο περισσότερο μετρά) μετακινεί την ευκαιρία σας εκεί από τον συνολικό σας μέσο όρο προς αυτό που έγινε εκεί· μια ψαριά άλλου ψαριού μετρά μισή έξοδο. Με λίγες εξόδους η αλλαγή μένει μικρή. Ένα μέρος δεν αλλάζει ποτέ πάνω από −40%…+60% και μια ώρα της μέρας (αυγή, μέρα, σούρουπο, νύχτα) πάνω από −15%…+18%. Η ανάλυση ενός σημείου δείχνει το μέρος που προσθέτει.',
  ct_need: (c, b) => 'Χρειάζεται ' + [c && `${c} ακόμη ${c === 1 ? 'έξοδο' : 'εξόδους'} με ψάρι`, b && `${b} ακόμη ${b === 1 ? 'άδεια έξοδο' : 'άδειες εξόδους'}`].filter(Boolean).join(' και '),
  ct_changes: (lo, hi, a, h) => `Ενεργό: σημεία ${lo}…${hi}, ${a} km² αλλάζουν πάνω από 5%· ώρες ±${h}%`,
  ct_would: (lo, hi, a, h) => `Έτοιμο (ανενεργό): θα άλλαζε σημεία ${lo}…${hi}, ${a} km² πάνω από 5%· ώρες ±${h}%`,
  ct_learnOn: 'Ο χάρτης μαθαίνει τώρα από τις ψαριές σας', ct_learnOff: 'Ο χάρτης δεν χρησιμοποιεί πλέον τις ψαριές σας',
  ct_badge: 'Προσωπικός χάρτης', ct_rowVal: (f, c, b) => `×${f} · από ${c} με ψάρι, ${b} άδειες`,
  f_mine: 'Οι δικές σας ψαριές',
});
Object.assign(I18N.el.whyPlus, { f_mine: 'Όπως εκεί και τότε που το πιάνετε' });
Object.assign(I18N.el.whyMinus, { f_mine: 'Όπως οι άδειες έξοδοί σας' });
/* ---------- My catches, round 8: photo-first logging, the catch page, the logbook's stats (js/catchlog.js) ---------- */
Object.assign(I18N.en, {
  ct_shot: 'Take a photo', ct_shotSub: 'Optional. It stays on this device.',
  ct_pick: 'From the gallery', ct_skip: 'Skip', ct_next: 'Next', ct_back: 'Back', ct_retake: 'Another photo', ct_preparing: 'Preparing the photo…',
  ct_blankLog: 'Nothing caught? Log a blank trip', ct_whichFish: 'Which fish?', ct_search: 'Search fish', ct_likely: 'Likely here now',
  ct_likelyTip: 'Each dial: the map’s chance for that fish here, now.', ct_allFish: 'All fish, A–Z', ct_noMatch: 'No fish by that name',
  ct_details: 'Details', ct_editTitle: 'Edit catch', ct_change: 'Change', ct_len: 'Length', ct_wt: 'Weight', ct_keep: 'Kept or released',
  ct_kept: 'Kept', ct_released: 'Released', ct_bait: 'Bait or lure', ct_baitNone: 'Not noted', ct_baitFor: f => `Suggested for ${f}`,
  ct_was: 'As logged', ct_mmHint: 'Drag the map to move the pin', ct_noteP: 'Private note (optional)',
  ct_needFish: 'Pick the fish first', ct_edited: 'Saved',
  ct_page: 'Catch', ct_condThen: 'Conditions then', ct_open: w => `${w} m offshore`, ct_measured: (st, k) => `Measured at ${st}, ${k} km away`,
  ct_edit: 'Edit', ct_share: 'Share', ct_shareTitle: f => `${f} · Psarema`, ct_shareErr: 'Could not make the picture.',
  ct_area: p => `${p} area`, ct_cardTag: 'From my catch log', ct_pb: 'Personal best',
  ct_deleted: f => `Deleted · ${f}`, ct_undo: 'Undo', ct_gone: 'This catch is no longer in your log.', ct_loading: 'Loading your catches…',
  ct_t_stats: 'Stats', ct_kpi: { n: 'Catches', species: 'Species', trips: 'Trips', rate: 'With fish' },
  ct_months: 'Catches by month', ct_bests: 'Personal bests', ct_noBests: 'Add a length or weight when you log, and your records show here.',
  ct_works: 'What works for you', ct_wk: { bait: 'Baits and lures', method: 'Method', time: 'Time of day', moon: 'Moon' },
  ct_worksNote: 'Your catches only. Your patterns compares them with your blank trips.', ct_noCatch: 'No catches yet: only blank trips.',
  ct_byFish: 'By fish', ct_nCatch: n => `${n} ${n === 1 ? 'catch' : 'catches'}`, ct_tod: 'Time of day',
});
Object.assign(I18N.el, {
  ct_shot: 'Βγάλτε φωτογραφία', ct_shotSub: 'Προαιρετικά. Μένει σε αυτή τη συσκευή.',
  ct_pick: 'Από τη συλλογή', ct_skip: 'Παράλειψη', ct_next: 'Συνέχεια', ct_back: 'Πίσω', ct_retake: 'Άλλη φωτογραφία', ct_preparing: 'Ετοιμάζεται η φωτογραφία…',
  ct_blankLog: 'Δεν πιάσατε τίποτα; Καταγράψτε άδεια έξοδο', ct_whichFish: 'Ποιο ψάρι;', ct_search: 'Αναζήτηση ψαριού', ct_likely: 'Πιθανά εδώ τώρα',
  ct_likelyTip: 'Κάθε δείκτης: η πιθανότητα του χάρτη για το ψάρι εδώ, τώρα.', ct_allFish: 'Όλα τα ψάρια, Α–Ω', ct_noMatch: 'Κανένα ψάρι με αυτό το όνομα',
  ct_details: 'Λεπτομέρειες', ct_editTitle: 'Επεξεργασία ψαριάς', ct_change: 'Αλλαγή', ct_len: 'Μήκος', ct_wt: 'Βάρος', ct_keep: 'Το κρατήσατε;',
  ct_kept: 'Το κράτησα', ct_released: 'Το άφησα', ct_bait: 'Δόλωμα ή τεχνητό', ct_baitNone: 'Δεν σημειώθηκε', ct_baitFor: f => `Προτείνονται: ${f}`,
  ct_was: 'Όπως καταγράφηκε', ct_mmHint: 'Σύρετε τον χάρτη για να μετακινήσετε την πινέζα', ct_noteP: 'Προσωπική σημείωση (προαιρετικά)',
  ct_needFish: 'Διαλέξτε πρώτα το ψάρι', ct_edited: 'Αποθηκεύτηκε',
  ct_page: 'Ψαριά', ct_condThen: 'Οι συνθήκες τότε', ct_open: w => `${w} m στα ανοιχτά`, ct_measured: (st, k) => `Μέτρηση στο ${st}, ${k} km μακριά`,
  ct_edit: 'Επεξεργασία', ct_share: 'Κοινοποίηση', ct_shareTitle: f => `${f} · Psarema`, ct_shareErr: 'Η εικόνα δεν φτιάχτηκε.',
  ct_area: p => `Περιοχή: ${p}`, ct_cardTag: 'Από τις ψαριές μου', ct_pb: 'Προσωπικό ρεκόρ',
  ct_deleted: f => `Διαγράφηκε · ${f}`, ct_undo: 'Αναίρεση', ct_gone: 'Αυτή η ψαριά δεν υπάρχει πια στις καταγραφές σας.', ct_loading: 'Φορτώνονται οι ψαριές σας…',
  ct_t_stats: 'Στατιστικά', ct_kpi: { n: 'Ψαριές', species: 'Είδη', trips: 'Έξοδοι', rate: 'Με ψάρι' },
  ct_months: 'Ψαριές ανά μήνα', ct_bests: 'Προσωπικά ρεκόρ', ct_noBests: 'Βάλτε μήκος ή βάρος όταν καταγράφετε και τα ρεκόρ σας θα φαίνονται εδώ.',
  ct_works: 'Τι σας πιάνει', ct_wk: { bait: 'Δολώματα και τεχνητά', method: 'Τρόπος', time: 'Ώρα της μέρας', moon: 'Σελήνη' },
  ct_worksNote: 'Μόνο οι ψαριές σας. Τα «Μοτίβα» τις συγκρίνουν με τις άδειες εξόδους.', ct_noCatch: 'Καμία ψαριά ακόμη: μόνο άδειες έξοδοι.',
  ct_byFish: 'Ανά ψάρι', ct_nCatch: n => `${n} ${n === 1 ? 'ψαριά' : 'ψαριές'}`, ct_tod: 'Ώρα',
  ct_t_pat: 'Μοτίβα', // the tab: four fit across a phone in Greek
});

// Plan a trip and the daily brief (js/planner.js).
Object.assign(I18N.en, {
  pl_title: 'Plan a trip', pl_when: 'When', pl_w_today: 'Today', pl_w_tomorrow: 'Tomorrow', pl_w_weekend: 'Weekend', pl_w_week: 'Next 7 days', pl_w_days: 'Pick days',
  pl_how: 'How', pl_fish: 'Fish', pl_anyFish: 'Any fish', pl_dist: 'Distance', pl_anyDist: 'No limit', pl_upTo: d => `Up to ${d} km from me`,
  pl_noLoc: 'Set your location (Near me) to limit the distance.', pl_calm: 'Calm water only', pl_calmTip: 'Waves up to 0.5 m, wind up to Bft 3, gusts under 30 km/h',
  pl_busy: p => `Planning… ${p}%`, pl_none: m => `No safe trip for ${m} in that time. Try other days or another method.`,
  pl_far: (m, d) => `No fishing area within ${d} km of you. Try a longer distance.`, pl_noFish: 'No fish to plan for with this method.', pl_noDays: 'Pick at least one day.',
  pl_hint: 'Fish chance and sea together. Unsafe hours are left out.', pl_best: 'Best trips',
  pl_checked: (f, c, s) => `Checked ${f} fish at ${c} spots, hour by hour, in ${s} s`, pl_score: 'Trip score: √(fish chance × conditions)',
  pl_also: 'Also biting', pl_show: 'Show on map', pl_share: 'Share', pl_remind: 'Remind me', pl_away: d => `${d} km from you`, pl_from: (n, d) => `from ${n}, ${d} km by sea`,
  pl_baits: 'Baits to bring', pl_lures: 'Lures to bring', pl_gun: 'Speargun',
  pl_read: (dir, ws, b, g, w) => `wind ${dir} ${ws} km/h (Bft ${b}), gusts ${g} · waves ${w} m`,
  pl_seaRead: (dir, ws, b, w, t) => `Wind ${dir} ${ws} km/h (Bft ${b}) · waves ${w} m · sea ${t} °C`,
  pl_bite: { dawn: 'Dawn feeding time', day: 'Daytime bite', dusk: 'Dusk feeding time', night: 'Night feeding time' },
  pl_season: 'Peak season', pl_temp: 'Ideal water temperature',
  pl_showing: (f, m) => `Showing ${f} · ${m}`, pl_brief: 'Daily fishing brief', pl_bestWin: 'Best window', pl_off: 'Don’t show daily',
  pl_offToast: 'Daily brief off. Turn it on again in Plan a trip.', pl_briefOn: 'Show the daily brief when the app opens',
  pl_nTitle: (d, f, w) => `${d}: ${f}, ${w}`, pl_nBody: (a, s, sea) => `${a} · trip score ${s}. ${sea}`, pl_nNone: d => `${d}: no safe fishing window`,
});
Object.assign(I18N.el, {
  pl_title: 'Σχέδιο εξόδου', pl_when: 'Πότε', pl_w_today: 'Σήμερα', pl_w_tomorrow: 'Αύριο', pl_w_weekend: 'Σαββατοκύριακο', pl_w_week: 'Επόμενες 7 μέρες', pl_w_days: 'Επιλογή ημερών',
  pl_how: 'Πώς', pl_fish: 'Ψάρι', pl_anyFish: 'Όλα τα ψάρια', pl_dist: 'Απόσταση', pl_anyDist: 'Χωρίς όριο', pl_upTo: d => `Έως ${d} km από εμένα`,
  pl_noLoc: 'Ορίστε την τοποθεσία σας (Κοντά μου) για όριο απόστασης.', pl_calm: 'Μόνο ήρεμα νερά', pl_calmTip: 'Κύμα έως 0,5 m, άνεμος έως 3 Μποφόρ, ριπές κάτω από 30 km/h',
  pl_busy: p => `Σχεδιασμός… ${p}%`, pl_none: m => `Καμία ασφαλής έξοδος για ${m} εκείνες τις μέρες. Δοκιμάστε άλλες μέρες ή άλλο τρόπο.`,
  pl_far: (m, d) => `Καμία περιοχή ψαρέματος σε ${d} km από εσάς. Δοκιμάστε μεγαλύτερη απόσταση.`, pl_noFish: 'Κανένα ψάρι για σχεδιασμό με αυτόν τον τρόπο.', pl_noDays: 'Διαλέξτε τουλάχιστον μία μέρα.',
  pl_hint: 'Πιθανότητα ψαριού και θάλασσα μαζί. Οι επικίνδυνες ώρες μένουν έξω.', pl_best: 'Καλύτερες έξοδοι',
  pl_checked: (f, c, s) => `Ελέγχθηκαν ${f} ψάρια σε ${c} σημεία, ώρα προς ώρα, σε ${s} s`, pl_score: 'Βαθμός εξόδου: √(πιθανότητα ψαριού × συνθήκες)',
  pl_also: 'Τρώνε επίσης', pl_remind: 'Υπενθύμιση', pl_show: 'Στον χάρτη', pl_share: 'Κοινοποίηση', pl_away: d => `${d} km από εσάς`, pl_from: (n, d) => `από ${n}, ${d} km με βάρκα`,
  pl_baits: 'Δολώματα', pl_lures: 'Τεχνητά', pl_gun: 'Ψαροντούφεκο',
  pl_read: (dir, ws, b, g, w) => `άνεμος ${dir} ${ws} km/h (${b} Μποφόρ), ριπές ${g} · κύμα ${w} m`,
  pl_seaRead: (dir, ws, b, w, t) => `Άνεμος ${dir} ${ws} km/h (${b} Μποφόρ) · κύμα ${w} m · θάλασσα ${t} °C`,
  pl_bite: { dawn: 'Τσίμπημα της αυγής', day: 'Τσίμπημα της μέρας', dusk: 'Τσίμπημα του σούρουπου', night: 'Νυχτερινό τσίμπημα' },
  pl_season: 'Στην καλύτερη εποχή του', pl_temp: 'Ιδανική θερμοκρασία νερού',
  pl_showing: (f, m) => `Εμφάνιση: ${f} · ${m}`, pl_brief: 'Ημερήσια ενημέρωση', pl_bestWin: 'Καλύτερη ώρα', pl_off: 'Να μην εμφανίζεται κάθε μέρα',
  pl_offToast: 'Η ημερήσια ενημέρωση απενεργοποιήθηκε. Ενεργοποιήστε την ξανά στο Σχέδιο εξόδου.', pl_briefOn: 'Ημερήσια ενημέρωση όταν ανοίγει η εφαρμογή',
  pl_nTitle: (d, f, w) => `${d}: ${f}, ${w}`, pl_nBody: (a, s, sea) => `${a} · βαθμός εξόδου ${s}. ${sea}`, pl_nNone: d => `${d}: καμία ασφαλής ώρα για ψάρεμα`,
});

// The fishing calendar (js/calendar.js)
Object.assign(I18N.en, {
  cal_title: 'Fishing calendar', cal_fc: 'Forecast', cal_ol: 'Outlook', cal_prev: 'Earlier weeks', cal_next: 'Later weeks',
  cal_fcTip: 'Forecast: the best chance that day, weather included.', cal_olTip: 'No forecast reaches this day yet, so it has no score: the season, the moon and the feeding times are below. The score comes when the forecast does.',
  cal_sun: 'Sun', cal_moon: 'Moon', cal_major: 'Major', cal_minor: 'Minor', cal_topDay: 'Best days', cal_best: 'Best days', cal_tap: 'Tap a day for its best hours, sun and moon.',
  cal_winTip: 'Feeding windows: major with the moon overhead or underfoot, minor at moonrise and moonset',
  cal_phase: ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'],
  cal_seasonLv: { peak: 'peak season', good: 'in season', fair: 'early or late season', low: 'out of season', closed: 'closed season', banned: 'fishing banned' },
  cal_bestAt: w => `Best at ${w}`, cal_go: w => `${w} on the map`,
});
Object.assign(I18N.el, {
  cal_title: 'Ημερολόγιο ψαρέματος', cal_fc: 'Πρόγνωση', cal_ol: 'Προοπτική', cal_prev: 'Προηγούμενες εβδομάδες', cal_next: 'Επόμενες εβδομάδες',
  cal_fcTip: 'Πρόγνωση: η καλύτερη πιθανότητα της μέρας, μαζί με τον καιρό.', cal_olTip: 'Η πρόγνωση δεν φτάνει ακόμη ως αυτή τη μέρα, γι’ αυτό δεν έχει βαθμό: παρακάτω η εποχή, το φεγγάρι και οι ώρες τσιμπήματος. Ο βαθμός έρχεται μαζί με την πρόγνωση.',
  cal_sun: 'Ήλιος', cal_moon: 'Φεγγάρι', cal_major: 'Κύριες', cal_minor: 'Δευτερεύουσες', cal_topDay: 'Καλύτερες μέρες', cal_best: 'Καλύτερες μέρες', cal_tap: 'Πατήστε μια μέρα για τις καλύτερες ώρες, τον ήλιο και το φεγγάρι.',
  cal_winTip: 'Ώρες τσιμπήματος: κύριες με το φεγγάρι ψηλά ή ακριβώς από κάτω, δευτερεύουσες όταν ανατέλλει και δύει',
  cal_phase: ['Νέα σελήνη', 'Αύξων μηνίσκος', 'Πρώτο τέταρτο', 'Αύξουσα αμφίκυρτη', 'Πανσέληνος', 'Φθίνουσα αμφίκυρτη', 'Τελευταίο τέταρτο', 'Φθίνων μηνίσκος'],
  cal_seasonLv: { peak: 'στην καλύτερη εποχή', good: 'στην εποχή του', fair: 'αρχή ή τέλος της εποχής', low: 'εκτός εποχής', closed: 'απαγορευμένη περίοδος', banned: 'απαγορεύεται το ψάρεμα' },
  cal_bestAt: w => `Καλύτερα στις ${w}`, cal_go: w => `${w} στον χάρτη`,
});

// Offline areas and sharing a spot (js/offline.js).
Object.assign(I18N.en, {
  offAreas: 'Offline areas', offPick: 'Area', offView: 'What the map shows now', offSave: 'Save for offline', offStop: 'Stop',
  offIntro: 'No signal where you fish? Save the area first: the map, forecast and sea data then work offline for up to 3 days.',
  offEst: m => `About ${m} MB to download`, offTooBig: 'Too large. Zoom in, or pick a fishing area.', offEmpty: 'Nothing to save here: open sea, far from the coast.',
  offNoRoom: (f, c) => `Not enough room: ${f} of ${c} MB left. Delete a saved area first.`, offOnline: 'Connect to the internet to save an area.',
  offSaving: (p, m) => `Saving… ${p}% · ${m} MB`, offDone: n => `${n}: saved for offline use`, offStopped: 'Stopped. What was saved is kept.',
  offCapHit: 'Stopped at the storage limit.', offFailed: n => `Saved, but ${n} map tiles could not be downloaded.`,
  offSaved: 'Saved areas', offNone: 'Nothing saved yet.', offRow: (m, d) => `${m} MB · saved ${d}`, offPart: 'incomplete', offShow: 'Show', offDel: 'Delete',
  offDelQ: n => `Delete the saved map of ${n}?`, offUsed: (m, c) => `Using ${m} of ${c} MB`,
  offData: (f, u) => `Forecast saved ${f}, usable without signal until ${u}.`, offNoData: 'No forecast saved yet: open the app online first.',
  offNoCache: 'This browser cannot keep maps for offline use.', offTerms: c => `Imagery © ${c}, kept on this device for your own use.`,
  share: 'Share', shTitle: 'Fishing spot', shScore: (s, r, w) => `Score ${s}/100 (${r}) at ${w}`, shCopied: 'Spot copied: paste it into a message.',
});
Object.assign(I18N.el, {
  offAreas: 'Χάρτες χωρίς σήμα', offPick: 'Περιοχή', offView: 'Ό,τι δείχνει τώρα ο χάρτης', offSave: 'Αποθήκευση για χρήση χωρίς σήμα', offStop: 'Διακοπή',
  offIntro: 'Χωρίς σήμα εκεί που ψαρεύετε; Αποθηκεύστε πρώτα την περιοχή: χάρτης, πρόγνωση και θάλασσα δουλεύουν χωρίς σήμα έως 3 μέρες.',
  offEst: m => `Περίπου ${m} MB για λήψη`, offTooBig: 'Πολύ μεγάλη. Μεγεθύνετε ή διαλέξτε μια περιοχή ψαρέματος.', offEmpty: 'Τίποτα για αποθήκευση εδώ: ανοιχτή θάλασσα, μακριά από την ακτή.',
  offNoRoom: (f, c) => `Δεν υπάρχει χώρος: απομένουν ${f} από ${c} MB. Διαγράψτε πρώτα μια αποθηκευμένη περιοχή.`, offOnline: 'Συνδεθείτε στο διαδίκτυο για να αποθηκεύσετε μια περιοχή.',
  offSaving: (p, m) => `Αποθήκευση… ${p}% · ${m} MB`, offDone: n => `${n}: αποθηκεύτηκε για χρήση χωρίς σήμα`, offStopped: 'Διακόπηκε. Ό,τι αποθηκεύτηκε κρατιέται.',
  offCapHit: 'Σταμάτησε στο όριο χώρου.', offFailed: n => `Αποθηκεύτηκε, αλλά ${n} κομμάτια του χάρτη δεν κατέβηκαν.`,
  offSaved: 'Αποθηκευμένες περιοχές', offNone: 'Δεν έχει αποθηκευτεί τίποτα ακόμη.', offRow: (m, d) => `${m} MB · αποθηκεύτηκε ${d}`, offPart: 'ελλιπής', offShow: 'Εμφάνιση', offDel: 'Διαγραφή',
  offDelQ: n => `Διαγραφή του αποθηκευμένου χάρτη: ${n};`, offUsed: (m, c) => `Χρησιμοποιούνται ${m} από ${c} MB`,
  offData: (f, u) => `Η πρόγνωση αποθηκεύτηκε ${f} και χρησιμοποιείται χωρίς σήμα έως ${u}.`, offNoData: 'Δεν έχει αποθηκευτεί πρόγνωση: ανοίξτε πρώτα την εφαρμογή με σύνδεση.',
  offNoCache: 'Αυτός ο περιηγητής δεν μπορεί να κρατήσει χάρτες για χρήση χωρίς σήμα.', offTerms: c => `Εικόνες © ${c}, αποθηκευμένες στη συσκευή για δική σας χρήση.`,
  share: 'Κοινοποίηση', shTitle: 'Σημείο ψαρέματος', shScore: (s, r, w) => `Βαθμός ${s}/100 (${r}) στις ${w}`, shCopied: 'Το σημείο αντιγράφηκε: επικολλήστε το σε ένα μήνυμα.',
});

// Map effects (js/map.js): the Contour bands option of the fishing-chance layer; heat map (round 8): the chance lines (the "zones" layer) and the legend
Object.assign(I18N.en, { l_bands: 'Contour bands', bandsTip: 'Draw the chance in 10-point bands, with smooth edges when zoomed in',
  l_zones: 'Chance lines (50 · 65 · 80)', hlTip: 'The chance of a bite at each place, at the hour shown (0–100). Lines on the map mark 50, 65 and 80.' });
Object.assign(I18N.el, { l_bands: 'Χρωματικές ζώνες', bandsTip: 'Η πιθανότητα σε ζώνες των 10 μονάδων, με ομαλά όρια όταν μεγεθύνετε',
  l_zones: 'Γραμμές πιθανότητας (50 · 65 · 80)', hlTip: 'Η πιθανότητα τσιμπήματος σε κάθε σημείο, την ώρα που φαίνεται (0–100). Οι γραμμές στον χάρτη δείχνουν το 50, το 65 και το 80.' });

// The Android app's phone features (js/native.js): notifications (⋯ menu → Notifications), trip reminders, the share sheet
Object.assign(I18N.en, {
  notif: 'Notifications', nfTime: 'Time', nfBrief: 'Daily fishing brief', nfBriefHint: 'Each day at this time: the day’s best fishing window, near you if Near me knows where you are.',
  nfTrips: 'Trip reminders', nfTripsHint: 'A reminder before a trip you planned', nfTripsNone: 'No reminders. Plan a trip and choose Remind me.',
  nfDenied: 'Notifications are blocked for Psarema. Allow them: phone Settings → Apps → Psarema → Notifications.',
  nfOnToast: t => `Daily brief on, at ${t}`, nfOffToast: 'Daily brief off', nfBriefTitle: d => `Fishing brief · ${d}`,
  nfBriefGeneric: 'Tap for today’s best hours and spots, and the sea right now.', nfBriefBody: (w, a, s) => `Best: ${w} · ${a} · trip score ${s}`,
  nfTripTitle: (t, m) => m >= 60 && m % 60 === 0 ? `In ${m / 60} h: ${t}` : `In ${m} min: ${t}`, nfTooLate: 'Too late for a reminder: the trip starts within the hour.',
  nfRemindSet: w => `Reminder set for ${w}`, nfAt: w => `Reminder ${w}`, nfRemove: 'Remove', nfTest: 'Send a test notification',
  shareCopied: 'Copied: paste it into any app',
});
Object.assign(I18N.el, {
  notif: 'Ειδοποιήσεις', nfTime: 'Ώρα', nfBrief: 'Ημερήσια ενημέρωση ψαρέματος', nfBriefHint: 'Κάθε μέρα αυτή την ώρα: η καλύτερη ώρα για ψάρεμα της μέρας, κοντά σας αν το Κοντά μου ξέρει πού είστε.',
  nfTrips: 'Υπενθυμίσεις εξόδων', nfTripsHint: 'Υπενθύμιση πριν από μια έξοδο που σχεδιάσατε', nfTripsNone: 'Καμία υπενθύμιση. Σχεδιάστε μια έξοδο και πατήστε Υπενθύμιση.',
  nfDenied: 'Οι ειδοποιήσεις του Psarema είναι αποκλεισμένες. Επιτρέψτε τις: Ρυθμίσεις τηλεφώνου → Εφαρμογές → Psarema → Ειδοποιήσεις.',
  nfOnToast: t => `Ημερήσια ενημέρωση στις ${t}`, nfOffToast: 'Η ημερήσια ενημέρωση απενεργοποιήθηκε', nfBriefTitle: d => `Ενημέρωση ψαρέματος · ${d}`,
  nfBriefGeneric: 'Πατήστε για τις καλύτερες ώρες και σημεία της μέρας, και τη θάλασσα τώρα.', nfBriefBody: (w, a, s) => `Καλύτερα: ${w} · ${a} · βαθμός εξόδου ${s}`,
  nfTripTitle: (t, m) => m >= 60 && m % 60 === 0 ? `Σε ${m / 60} ώρ.: ${t}` : `Σε ${m} λεπτά: ${t}`, nfTooLate: 'Πολύ αργά για υπενθύμιση: η έξοδος αρχίζει μέσα στην ώρα.',
  nfRemindSet: w => `Υπενθύμιση για ${w}`, nfAt: w => `Υπενθύμιση ${w}`, nfRemove: 'Αφαίρεση', nfTest: 'Δοκιμαστική ειδοποίηση',
  shareCopied: 'Αντιγράφηκε: επικολλήστε το σε οποιαδήποτε εφαρμογή',
});

// The first-run tour (js/help.js PsHelp.tour): four steps over #guide
Object.assign(I18N.en, {
  tour_skip: 'Skip', tour_back: 'Back', tour_next: 'Next', tour_go: 'Start fishing', tour_step: (n, m) => `Step ${n} of ${m}`,
  tour_t1: 'Where the fish should be',
  tour_x1: 'The coloured sea is your fish’s chance at the hour shown: blue low, green and yellow good, orange to red best. Numbered circles are the top spots; dashed outlines are protected zones.',
  tour_t2: 'Your fish, your way',
  tour_x2p: 'Pick Boat, Shore or Spear in the top bar, then tap the fish to choose what you are after, or All fish, then pick Boat, Shore or Spear under it. The map changes with both.',
  tour_x2d: 'Click the fish card at the top of the panel to choose what you are after, or All fish. The map changes with both.',
  tour_t3: 'Tap a spot',
  tour_x3: 'Tap the sea for its score and the main reasons. View more opens the full details: the best safe time to go, baits and lures, the seabed and the whole breakdown.',
  tour_honest: 'A score compares places and hours from forecasts and published fish ecology. It is a chance, not a promise of fish.',
  tour_t4: 'Plan ahead',
  tour_x4p: 'Drag the timeline to change the hour; ★ jumps to the best one. The ⋯ menu holds the trip planner, the fishing calendar, My catches, offline maps and the help centre.',
  tour_x4d: 'Drag the timeline to change the hour; ★ jumps to the best one. The buttons at the bottom of the panel open the trip planner, the fishing calendar, My catches and offline maps; ? opens the help centre.',
});
Object.assign(I18N.el, {
  tour_skip: 'Παράλειψη', tour_back: 'Πίσω', tour_next: 'Επόμενο', tour_go: 'Πάμε για ψάρεμα', tour_step: (n, m) => `Βήμα ${n} από ${m}`,
  tour_t1: 'Πού πρέπει να είναι τα ψάρια',
  tour_x1: 'Η χρωματιστή θάλασσα είναι η πιθανότητα για το ψάρι σας την ώρα που δείχνει ο χάρτης: μπλε χαμηλή, πράσινο και κίτρινο καλή, πορτοκαλί ως κόκκινο η καλύτερη. Οι αριθμημένοι κύκλοι είναι τα καλύτερα σημεία· τα διακεκομμένα περιγράμματα είναι προστατευόμενες περιοχές.',
  tour_t2: 'Το ψάρι σας, ο τρόπος σας',
  tour_x2p: 'Διαλέξτε Βάρκα, Ακτή ή Ψαροντούφεκο στην πάνω μπάρα και πατήστε το ψάρι για να διαλέξετε τι ψαρεύετε, ή Όλα τα ψάρια. Ο χάρτης αλλάζει και με τα δύο.',
  tour_x2d: 'Πατήστε την κάρτα του ψαριού πάνω στο πάνελ για να διαλέξετε τι ψαρεύετε, ή Όλα τα ψάρια, και από κάτω Βάρκα, Ακτή ή Ψαροντούφεκο. Ο χάρτης αλλάζει και με τα δύο.',
  tour_t3: 'Πατήστε ένα σημείο',
  tour_x3: 'Πατήστε στη θάλασσα για τον βαθμό και τους κύριους λόγους. Το «Περισσότερα» ανοίγει όλες τις λεπτομέρειες: την καλύτερη ασφαλή ώρα για να πάτε, δολώματα και τεχνητά, τον βυθό και την πλήρη ανάλυση.',
  tour_honest: 'Ο βαθμός συγκρίνει μέρη και ώρες με βάση την πρόγνωση και τη δημοσιευμένη οικολογία των ψαριών. Δείχνει πιθανότητα, δεν υπόσχεται ψάρια.',
  tour_t4: 'Σχεδιάστε την έξοδο',
  tour_x4p: 'Σύρετε τη γραμμή χρόνου για να αλλάξετε ώρα· το ★ πάει στην καλύτερη. Στο μενού ⋯ θα βρείτε το Σχέδιο εξόδου, το Ημερολόγιο ψαρέματος, τις Ψαριές μου, τους χάρτες χωρίς σήμα και το Κέντρο βοήθειας.',
  tour_x4d: 'Σύρετε τη γραμμή χρόνου για να αλλάξετε ώρα· το ★ πάει στην καλύτερη. Τα κουμπιά στο κάτω μέρος του πάνελ ανοίγουν το Σχέδιο εξόδου, το Ημερολόγιο ψαρέματος, τις Ψαριές μου και τους χάρτες χωρίς σήμα· το ? ανοίγει το Κέντρο βοήθειας.',
});
// It takes #guide over whenever that opens. Started here, the first app script, because nothing of the help loads at start-up (core.js
// loads data/help.js + js/help.js on first use); eval/ runs this file in node with a stub document, hence the checks.
{ const g = typeof document === 'object' && document.getElementById?.('guide');
  // round 14: not while it holds the first run's welcome (#guide.wl: its Quick tour starts the tour, js/ui.js)
  if (g) new MutationObserver(() => { if (!g.hidden && !g.classList.contains('wl')) loadScripts('js/help.js').then(() => PsHelp.tour?.(g), e => console.warn(e.message)); }).observe(g, { attributes: true, attributeFilter: ['hidden'] }); }
// UI lead (js/ui.js): the details' section headings and the method switch's name
Object.assign(I18N.en, { ui_method: 'How you fish', ui_tools: 'Position and tools', ui_bestTime: 'Best time this week' });
Object.assign(I18N.el, { ui_method: 'Πώς ψαρεύετε', ui_tools: 'Θέση και εργαλεία', ui_bestTime: 'Καλύτερη ώρα της εβδομάδας' });
// Panels (js/calendar.js): a forecast day in the calendar plans a trip that day
Object.assign(I18N.en, { cal_plan: 'Plan this day' });
Object.assign(I18N.el, { cal_plan: 'Σχέδιο για τη μέρα' });
// Desktop shell (js/ui.js, index.html): the rail's tool dock (short names; the full ones are the tooltips) and the fish card's stats
Object.assign(I18N.en, { sh_plan: 'Plan', sh_cal: 'Calendar', sh_catches: 'Catches', sh_offline: 'Offline', sh_best: '7-day best',
  sh_depth: 'Depth', sh_water: 'Water', sh_bed: 'Seabed', sh_season: 'In season' });
Object.assign(I18N.el, { sh_plan: 'Σχέδιο', sh_cal: 'Ημερολόγιο', sh_catches: 'Ψαριές', sh_offline: 'Χωρίς σήμα', sh_best: 'Μέγιστο 7 ημερών',
  sh_depth: 'Βάθος', sh_water: 'Νερό', sh_bed: 'Βυθός', sh_season: 'Στην εποχή τους' });
// A spot (js/ui.js card and details): the card's three numbers, its best-time row, the details' section chips
Object.assign(I18N.en, { sp_stat: { depth: 'Depth', seabed: 'Seabed', fromYou: 'From you', boatRun: 'Boat run', offShore: 'Off the shore' }, sp_go: 'Best time to go',
  sp_jump: { why: 'Why', go: 'Conditions', baits: 'Baits', lures: 'Lures', seabed: 'Seabed', gps: 'Tools' } });
Object.assign(I18N.el, { sp_stat: { depth: 'Βάθος', seabed: 'Βυθός', fromYou: 'Από εσάς', boatRun: 'Με βάρκα', offShore: 'Από την ακτή' }, sp_go: 'Καλύτερη ώρα για έξοδο',
  sp_jump: { why: 'Γιατί', go: 'Συνθήκες', baits: 'Δολώματα', lures: 'Τεχνητά', seabed: 'Βυθός', gps: 'Εργαλεία' } });
// A fish page's best spots when there are none (js/species-page.js; round 17 G: the "Right now" hero these came with is gone)
Object.assign(I18N.en, { now_none: 'Nothing scores well for this fish at this hour.',
  now_banned: 'Fishing for this fish is banned in Cyprus, so there is no spot to show.', now_closed: 'Closed season for this fish, so there is no spot to show.' });
Object.assign(I18N.el, { now_none: 'Τίποτα δεν βγαίνει καλό για αυτό το ψάρι αυτή την ώρα.',
  now_banned: 'Η αλιεία αυτού του ψαριού απαγορεύεται στην Κύπρο, γι’ αυτό δεν υπάρχει σημείο να δείξουμε.', now_closed: 'Κλειστή περίοδος για αυτό το ψάρι, γι’ αυτό δεν υπάρχει σημείο να δείξουμε.' });
// Touch (js/mobile.js): the sheet pulled down to refresh, inside the forecast's hour of cache
Object.assign(I18N.en, { mtFresh: t => `The forecast is up to date (${hm(t)})` });
Object.assign(I18N.el, { mtFresh: t => `Η πρόγνωση είναι ενημερωμένη (${hm(t)})` });
// Species pages (js/species-page.js): the index ("Biting near you now", A–Z) and a fish's page
Object.assign(I18N.en, { spx_sWhen: 'When', spx_sWhere: 'Where', spx_sHow: 'How', spx_sSeen: 'Sightings', spx_sRules: 'Rules', spx_find: 'Search fish', spx_sort: 'Order', spx_sBest: 'Best now', spx_sAz: 'A–Z',
  spx_title: 'Species', spx_near: 'Biting near you now', spx_inView: 'Biting in the map’s view now', spx_az: 'All fish A–Z',
  spx_within: d => `within ${d} km of you`, spx_view: 'in the map’s view', spx_island: 'all of Cyprus', spx_working: 'Working out every fish…',
  spx_noFc: 'The ranking appears once the forecast is in.', spx_showAll: n => `Show all ${n}`, spx_showLess: 'Show fewer', spx_info: f => `About ${f}`,
  spx_w_closed: 'Closed season', spx_w_rough: 'Sea too rough', spx_w_quiet: 'Quiet hour for it', spx_w_peak: 'Peak season', spx_w_off: 'Out of season',
  spx_w_water: t => `Water ${t} °C suits it`, spx_w_cold: t => `Water ${t} °C, too cold`, spx_w_warm: t => `Water ${t} °C, too warm`, spx_w_rarely: 'Rarely caught this way',
  spx_now: 'Near you now', spx_nowView: 'In view now', spx_nowAll: 'In Cyprus now', spx_week: 'Best this week', spx_showMap: 'Show on map', spx_allSpecies: 'All species', spx_closedNow: 'Closed now',
  spx_closedSeason: 'Closed season', spx_rulesFull: 'The full rules',
  spx_legalSrc: 'Legal sources', spx_where: 'Where it bites best now', spx_away: d => `${d} km from you`, spx_how: 'How to catch it',
  spx_local: a => `Local picks · ${a}`, spx_read: 'Technique, where and when', spx_peakIs: 'Best months', spx_allYear: 'All year',
  spx_fitted: 'Fitted to Cyprus records (the map uses this)', spx_profile: 'Expert profile', spx_profileUsed: 'Expert profile (the map uses this)', spx_closedMo: 'Closed',
  spx_time: 'Time of day', spx_moonNew: 'Bites better around the new moon', spx_moonFull: 'Bites better around the full moon', spx_moonSame: 'The moon makes little difference',
  spx_depth: 'Depth and seabed', spx_best: 'Best', spx_found: 'Found', spx_fromShore: 'From the shore', spx_openWater: 'open water',
  spx_struct: 'Drawn to structure: reefs, wrecks, rocks', spx_drop: 'Likes drop-offs and steep edges',
  spx_est: 'estimate', spx_estTip: 'An expert estimate in the profile, not a measured value', spx_habEst: 'How much it likes each seabed', spx_calib: n => `Depth and seabed adjusted with ${n} Cyprus records`,
  spx_water: 'Sea temperature', spx_comfort: 'Comfortable', spx_tolerates: 'Tolerates', spx_nowWater: 'Now at its best spot',
  spx_rec: 'Recorded in Cyprus', spx_recN: (n, a, b) => `${n === 1 ? 'record' : 'records'} in Cyprus waters, ${a}–${b}`, spx_recNone: 'No open records of it in Cyprus waters yet.',
  spx_recNote: 'Sightings by divers and researchers (GBIF, OBIS, iNaturalist), not catches.', spx_recMap: 'Show records on the map',
  spx_byMonth: n => `Records by month (${n} with a date)`, spx_latest: 'Latest sightings', spx_similar: 'Similar fish',
  spx_srcProfile: 'Profile and rules', spx_srcGear: 'Gear guide', spx_srcSeason: 'Season fitted to records', spx_srcRec: 'Records', spx_srcPhoto: 'Photo', spx_cutout: 'background removed' });
Object.assign(I18N.el, { spx_sWhen: 'Πότε', spx_sWhere: 'Πού', spx_sHow: 'Πώς', spx_sSeen: 'Παρατηρήσεις', spx_sRules: 'Κανόνες', spx_find: 'Αναζήτηση ψαριού', spx_sort: 'Σειρά', spx_sBest: 'Καλύτερα τώρα', spx_sAz: 'Α–Ω',
  spx_title: 'Είδη ψαριών', spx_near: 'Τρώνε κοντά σας τώρα', spx_inView: 'Τρώνε στην περιοχή του χάρτη τώρα', spx_az: 'Όλα τα ψάρια Α–Ω',
  spx_within: d => `σε ${d} km από εσάς`, spx_view: 'στην περιοχή του χάρτη', spx_island: 'σε όλη την Κύπρο', spx_working: 'Υπολογίζονται όλα τα ψάρια…',
  spx_noFc: 'Η κατάταξη εμφανίζεται μόλις φορτωθεί η πρόγνωση.', spx_showAll: n => `Όλα τα ${n}`, spx_showLess: 'Λιγότερα', spx_info: f => `Σχετικά με: ${f}`,
  spx_w_closed: 'Κλειστή περίοδος', spx_w_rough: 'Πολλή φουρτούνα', spx_w_quiet: 'Ήσυχη ώρα γι’ αυτό', spx_w_peak: 'Καλύτερη εποχή', spx_w_off: 'Εκτός εποχής',
  spx_w_water: t => `Νερό ${t} °C, του ταιριάζει`, spx_w_cold: t => `Νερό ${t} °C, πολύ κρύο`, spx_w_warm: t => `Νερό ${t} °C, πολύ ζεστό`, spx_w_rarely: 'Σπάνια πιάνεται έτσι',
  spx_now: 'Κοντά σας τώρα', spx_nowView: 'Στην περιοχή τώρα', spx_nowAll: 'Στην Κύπρο τώρα', spx_week: 'Καλύτερη της εβδομάδας', spx_showMap: 'Στον χάρτη', spx_allSpecies: 'Όλα τα είδη', spx_closedNow: 'Κλειστή περίοδος',
  spx_closedSeason: 'Κλειστή περίοδος', spx_rulesFull: 'Όλοι οι κανόνες',
  spx_legalSrc: 'Νομικές πηγές', spx_where: 'Πού τρώει καλύτερα τώρα', spx_away: d => `${d} km από εσάς`, spx_how: 'Πώς ψαρεύεται',
  spx_local: a => `Τοπικές επιλογές · ${a}`, spx_read: 'Τεχνική, πού και πότε', spx_peakIs: 'Καλύτεροι μήνες', spx_allYear: 'Όλο τον χρόνο',
  spx_fitted: 'Προσαρμοσμένη σε καταγραφές στην Κύπρο (αυτή χρησιμοποιεί ο χάρτης)', spx_profile: 'Εκτίμηση ειδικών', spx_profileUsed: 'Εκτίμηση ειδικών (αυτή χρησιμοποιεί ο χάρτης)', spx_closedMo: 'Κλειστό',
  spx_time: 'Ώρα της μέρας', spx_moonNew: 'Τρώει καλύτερα κοντά στη νέα σελήνη', spx_moonFull: 'Τρώει καλύτερα κοντά στην πανσέληνο', spx_moonSame: 'Η σελήνη δεν κάνει μεγάλη διαφορά',
  spx_depth: 'Βάθος και βυθός', spx_best: 'Καλύτερα', spx_found: 'Απαντάται', spx_fromShore: 'Από την ακτή', spx_openWater: 'ανοιχτά νερά',
  spx_struct: 'Του αρέσουν οι ξέρες, τα ναυάγια και τα βράχια', spx_drop: 'Του αρέσουν οι κατωφέρειες και τα απότομα χείλη',
  spx_est: 'εκτίμηση', spx_estTip: 'Εκτίμηση ειδικών στο προφίλ, όχι μετρημένη τιμή', spx_habEst: 'Πόσο του αρέσει κάθε βυθός', spx_calib: n => `Βάθος και βυθός προσαρμοσμένα με ${n} καταγραφές στην Κύπρο`,
  spx_water: 'Θερμοκρασία θάλασσας', spx_comfort: 'Ιδανική', spx_tolerates: 'Αντέχει', spx_nowWater: 'Τώρα στο καλύτερο σημείο του',
  spx_rec: 'Καταγραφές στην Κύπρο', spx_recN: (n, a, b) => `${n === 1 ? 'καταγραφή' : 'καταγραφές'} στα νερά της Κύπρου, ${a}–${b}`, spx_recNone: 'Δεν υπάρχουν ακόμη ανοιχτές καταγραφές του στα νερά της Κύπρου.',
  spx_recNote: 'Παρατηρήσεις δυτών και ερευνητών (GBIF, OBIS, iNaturalist), όχι ψαριές.', spx_recMap: 'Οι καταγραφές στον χάρτη',
  spx_byMonth: n => `Καταγραφές ανά μήνα (${n} με ημερομηνία)`, spx_latest: 'Πρόσφατες παρατηρήσεις', spx_similar: 'Παρόμοια ψάρια',
  spx_srcProfile: 'Προφίλ και κανόνες', spx_srcGear: 'Οδηγός εξοπλισμού', spx_srcSeason: 'Εποχή από καταγραφές', spx_srcRec: 'Καταγραφές', spx_srcPhoto: 'Φωτογραφία', spx_cutout: 'αφαιρέθηκε το φόντο' });
// Round 10c, agent C: the fish picker as a page (js/ui.js drawGallery): its ranked list
Object.assign(I18N.en, { fp_bite: 'Biting now' });
Object.assign(I18N.el, { fp_bite: 'Τρώνε τώρα' });
// Map pins (js/pins.js): your catches, open sightings and saved places on the map, their cards, their main layers
Object.assign(I18N.en, { pp_l_catch: 'My catches', pp_l_record: 'Sightings', pp_l_place: 'Saved places', pp_zoomIn: 'zoom in',
  pp_k: { catch: 'Your catch', record: 'Sighting', place: 'Saved place' }, pp_you: 'You', pp_open: 'Open data', pp_pd: 'Public domain',
  pp_away: d => `${d} km from you`, pp_nHere: (n, k) => `${n} ${k === 'catch' ? 'catches' : k === 'place' ? 'places' : 'sightings'} here`,
  pp_save: 'Save this spot', pp_saveHere: 'Save place here', pp_saved: n => `Saved: ${n}`, pp_savedOn: d => `Saved ${d}`, pp_name: 'Name', pp_nav: 'Navigate',
  pp_chance: 'Chance here', pp_del: 'Delete', pp_delSure: 'Tap again to delete', pp_deleted: 'Place deleted' });
Object.assign(I18N.el, { pp_l_catch: 'Οι ψαριές μου', pp_l_record: 'Παρατηρήσεις', pp_l_place: 'Αποθηκευμένα σημεία', pp_zoomIn: 'μεγεθύνετε',
  pp_k: { catch: 'Η ψαριά σας', record: 'Παρατήρηση', place: 'Αποθηκευμένο σημείο' }, pp_you: 'Εσείς', pp_open: 'Ανοιχτά δεδομένα', pp_pd: 'Κοινό κτήμα',
  pp_away: d => `${d} km από εσάς`, pp_nHere: (n, k) => `${n} ${k === 'catch' ? 'ψαριές' : k === 'place' ? 'σημεία' : 'παρατηρήσεις'} εδώ`,
  pp_save: 'Αποθήκευση σημείου', pp_saveHere: 'Αποθήκευση σημείου εδώ', pp_saved: n => `Αποθηκεύτηκε: ${n}`, pp_savedOn: d => `Αποθηκεύτηκε ${d}`, pp_name: 'Όνομα',
  pp_nav: 'Πλοήγηση', pp_chance: 'Πιθανότητα εδώ', pp_del: 'Διαγραφή', pp_delSure: 'Πατήστε ξανά για διαγραφή', pp_deleted: 'Το σημείο διαγράφηκε' });
// Forecast page (js/forecast.js): a place's day and week, hour by hour
Object.assign(I18N.en, { fp_title: 'Forecast', fp_place: 'Place', fp_areas: 'Fishing areas', fp_spot: s => `Spot on the map: ${s}`,
  fp_bestSpot: 'Best spot here', fp_this: 'This spot', fp_left: 'Best left today', fp_go: 'Go score', fp_olSub: w => `Fish chance only · best around ${w}`,
  fp_v: { great: 'Great time to go', good: 'Good time to go', fair: 'Fair time to go', poor: 'Slow fishing', none: 'No safe time with a chance' },
  fp_fishC: 'Fish chance', fp_moonP: 'Moon periods', fp_unsafe: 'Not safe', fp_days: 'Next 7 days', fp_daysHint: 'Each day at its best time to go',
  fp_wx: w => `Weather and sea · ${w}`, fp_prev: 'Hour before', fp_next: 'Hour after', fp_air: 'Air', fp_swell: 'Swell',
  fp_banned: 'Fishing for this fish is banned in Cyprus.', fp_closed: 'Closed season for this fish.',
  fp_how: 'The go score weighs the fish chance and the sea conditions together, like a spot’s “Best time to go”. Unsafe hours score 0.' });
Object.assign(I18N.el, { fp_title: 'Πρόγνωση', fp_place: 'Τοποθεσία', fp_areas: 'Περιοχές ψαρέματος', fp_spot: s => `Σημείο στον χάρτη: ${s}`,
  fp_bestSpot: 'Καλύτερο σημείο εδώ', fp_this: 'Αυτό το σημείο', fp_left: 'Το καλύτερο που μένει σήμερα', fp_go: 'Βαθμός εξόδου', fp_olSub: w => `Μόνο πιθανότητα ψαριού · καλύτερα γύρω στις ${w}`,
  fp_v: { great: 'Εξαιρετική ώρα για ψάρεμα', good: 'Καλή ώρα για ψάρεμα', fair: 'Μέτρια ώρα για ψάρεμα', poor: 'Φτωχό ψάρεμα', none: 'Καμία ασφαλής ώρα με πιθανότητα' },
  fp_fishC: 'Πιθανότητα ψαριού', fp_moonP: 'Σεληνιακές περίοδοι', fp_unsafe: 'Μη ασφαλές', fp_days: 'Οι επόμενες 7 μέρες', fp_daysHint: 'Κάθε μέρα στην καλύτερη ώρα της για έξοδο',
  fp_wx: w => `Καιρός και θάλασσα · ${w}`, fp_prev: 'Μία ώρα πριν', fp_next: 'Μία ώρα μετά', fp_air: 'Θερμ. αέρα', fp_swell: 'Αποθαλασσιά',
  fp_banned: 'Η αλιεία αυτού του ψαριού απαγορεύεται στην Κύπρο.', fp_closed: 'Κλειστή περίοδος για αυτό το ψάρι.',
  fp_how: 'Ο βαθμός εξόδου συνδυάζει την πιθανότητα ψαριού με τις συνθήκες της θάλασσας, όπως η «Καλύτερη ώρα για έξοδο» ενός σημείου. Οι μη ασφαλείς ώρες μετρούν 0.' });
// Live observations (js/obs.js): measured wind at the coastal airports, on the map and for a place ("Measured at Larnaca 12 min ago")
Object.assign(I18N.en, { l_obs: 'Measured wind', obs_kn: 'kn', obs_gust: g => `gusts ${g} kn`, obs_air: t => `Air ${t} °C`,
  obs_ago: m => m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`, obs_short: m => m < 60 ? `${m}′` : `${Math.round(m / 60)} h`,
  obs_line: (at, ago, w) => `Measured at ${at} ${ago}: ${w}`, obs_at: s => `Measured wind · ${s}`,
  obs_src: 'Airport weather report (METAR) via the Iowa Environmental Mesonet. Measured on land by the coast: out at sea the wind is often stronger.' });
Object.assign(I18N.el, { l_obs: 'Μετρημένος άνεμος', obs_kn: 'κόμβοι', obs_gust: g => `ριπές έως ${g} κόμβους`, obs_air: t => `Θερμοκρασία ${t} °C`,
  obs_ago: m => m < 60 ? `πριν από ${m} ${m === 1 ? 'λεπτό' : 'λεπτά'}` : `πριν από ${Math.round(m / 60)} ${Math.round(m / 60) === 1 ? 'ώρα' : 'ώρες'}`,
  obs_short: m => m < 60 ? `${m}′` : `${Math.round(m / 60)} ώρ.`,
  obs_line: (at, ago, w) => `Μετρήθηκε ${at} ${ago}: ${w}`, obs_at: s => `Μετρημένος άνεμος · ${s}`,
  obs_src: 'Δελτίο καιρού αεροδρομίου (METAR) μέσω του Iowa Environmental Mesonet. Μετριέται στη στεριά δίπλα στην ακτή: στ’ ανοιχτά ο άνεμος είναι συχνά πιο δυνατός.' });
// Shell (js/nav.js, js/me.js): the tab bar, the pages' frame, the search's stand-in, the Me page
Object.assign(I18N.en, { nav_label: 'Main', nav_map: 'Map', nav_forecast: 'Forecast', nav_log: 'Log a catch', nav_feed: 'Feed', nav_me: 'Me', nav_back: 'Back',
  nav_search: 'Search fish', nav_none: 'This page is not ready yet.',
  me_title: 'Your fishing', me_sub: 'Kept on this device · no account', me_catches: 'Catches', me_trips: 'Trips', me_species: 'Species', me_byMonth: 'Catches by month',
  me_bests: 'Personal bests', me_empty: 'No catches yet. Log one with + to see your numbers and bests here.', me_logFirst: 'Log your first catch',
  me_places: 'Saved places', me_noPlaces: 'No saved places yet. Save one from the map.', me_help: 'Help and knots', me_settings: 'Settings',
  me_version: 'Version', me_privacy: 'Privacy policy',
  me_local: 'Your catches, saved places and settings stay on this device. Nothing is uploaded.' });
Object.assign(I18N.el, { nav_label: 'Κύριο μενού', nav_map: 'Χάρτης', nav_forecast: 'Πρόγνωση', nav_log: 'Καταγραφή ψαριάς', nav_feed: 'Ροή', nav_me: 'Προφίλ', nav_back: 'Πίσω',
  nav_search: 'Αναζήτηση ψαριού', nav_none: 'Αυτή η σελίδα δεν είναι έτοιμη ακόμη.',
  me_title: 'Το ψάρεμά σας', me_sub: 'Μόνο σε αυτή τη συσκευή · χωρίς λογαριασμό', me_catches: 'Ψαριές', me_trips: 'Έξοδοι', me_species: 'Είδη', me_byMonth: 'Ψαριές ανά μήνα',
  me_bests: 'Προσωπικά ρεκόρ', me_empty: 'Καμία ψαριά ακόμη. Καταγράψτε μία με το + για να δείτε εδώ αριθμούς και ρεκόρ.', me_logFirst: 'Καταγράψτε την πρώτη σας ψαριά',
  me_places: 'Αποθηκευμένα σημεία', me_noPlaces: 'Κανένα σημείο ακόμη. Αποθηκεύστε ένα από τον χάρτη.', me_help: 'Βοήθεια και κόμποι', me_settings: 'Ρυθμίσεις',
  me_version: 'Έκδοση', me_privacy: 'Πολιτική απορρήτου',
  me_local: 'Ψαριές, σημεία και ρυθμίσεις μένουν σε αυτή τη συσκευή. Τίποτα δεν ανεβαίνει.' });
// Feed (js/feed.js): open fish sightings (iNaturalist, GBIF) and your catches; one sighting. Sightings, never "catches".
Object.assign(I18N.en, { fd_title: 'Feed', fd_one: 'Sighting', fd_kind: 'Sighting', fd_near: 'Near me', fd_all: 'All Cyprus', fd_ours: 'Psarema fish', fd_every: 'All species',
  fd_fish: 'Fish', fd_refresh: 'Load the newest sightings', fd_intro: 'Sightings: fish that divers and naturalists saw and shared as open data on iNaturalist and GBIF. They are not catches.',
  fd_you: 'You', fd_yourCatch: 'Your catch', fd_released: 'released', fd_away: d => `${d} km away`, fd_anon: 'Observer not named', fd_builtIn: 'Built into the app',
  fd_noLoc: 'Turn on your location to see sightings near you.', fd_locate: 'Use my location', fd_empty: 'No sightings match these filters yet.',
  fd_emptyNear: n => `No sightings within ${n} km of you yet. Try All Cyprus.`, fd_older: 'Load older sightings',
  fd_static: 'You’re offline, so these are the sightings built into the app (no photos). The newest load when you’re back online.',
  fd_saved: t => `Can’t reach iNaturalist or GBIF right now. Showing the sightings saved ${t}.`, fd_moreErr: 'Couldn’t load more sightings.', fd_retry: 'Try again',
  fd_end: 'That’s every open sighting loaded for these filters.', fd_gone: 'This sighting isn’t loaded any more. Open the Feed to load it again.',
  fd_when: 'When', fd_where: 'Where', fd_from: 'From you', fd_seen: 'Seen by', fd_lic: 'Licence', fd_src: 'Source', fd_photoLic: l => `photo ${l}`,
  fd_inat: 'iNaturalist, research grade (the community agreed on the species)', fd_showMap: 'Show on map', fd_fishPage: 'About this fish', fd_open: s => `Open on ${s}`,
  fd_honest: 'A sighting is a fish someone saw and photographed, often while diving or snorkelling, and shared as open data. It is not a catch, and it doesn’t mean the fish is there now.' });
Object.assign(I18N.el, { fd_title: 'Ροή', fd_one: 'Παρατήρηση', fd_kind: 'Παρατήρηση', fd_near: 'Κοντά μου', fd_all: 'Όλη η Κύπρος', fd_ours: 'Ψάρια του Psarema', fd_every: 'Όλα τα είδη',
  fd_fish: 'Ψάρια', fd_refresh: 'Φόρτωση των νεότερων παρατηρήσεων', fd_intro: 'Παρατηρήσεις: ψάρια που είδαν δύτες και φυσιοδίφες και τα μοιράστηκαν ως ανοιχτά δεδομένα στο iNaturalist και στο GBIF. Δεν είναι ψαριές.',
  fd_you: 'Εσείς', fd_yourCatch: 'Η ψαριά σας', fd_released: 'απελευθερώθηκε', fd_away: d => `${d} km από εσάς`, fd_anon: 'Χωρίς όνομα παρατηρητή', fd_builtIn: 'Ενσωματωμένες στην εφαρμογή',
  fd_noLoc: 'Ενεργοποιήστε την τοποθεσία σας για να δείτε παρατηρήσεις κοντά σας.', fd_locate: 'Η τοποθεσία μου', fd_empty: 'Δεν υπάρχουν ακόμη παρατηρήσεις με αυτά τα φίλτρα.',
  fd_emptyNear: n => `Δεν υπάρχουν ακόμη παρατηρήσεις σε ακτίνα ${n} km από εσάς. Δοκιμάστε «Όλη η Κύπρος».`, fd_older: 'Φόρτωση παλαιότερων',
  fd_static: 'Είστε εκτός σύνδεσης, γι’ αυτό βλέπετε τις παρατηρήσεις που έχει η εφαρμογή (χωρίς φωτογραφίες). Οι νεότερες φορτώνουν μόλις συνδεθείτε.',
  fd_saved: t => `Δεν υπάρχει σύνδεση με το iNaturalist ή το GBIF αυτή τη στιγμή. Βλέπετε τις παρατηρήσεις που αποθηκεύτηκαν ${t}.`, fd_moreErr: 'Δεν φόρτωσαν περισσότερες παρατηρήσεις.', fd_retry: 'Ξανά',
  fd_end: 'Αυτές είναι όλες οι ανοιχτές παρατηρήσεις που φορτώθηκαν για αυτά τα φίλτρα.', fd_gone: 'Αυτή η παρατήρηση δεν είναι πια φορτωμένη. Ανοίξτε τη Ροή για να φορτωθεί ξανά.',
  fd_when: 'Πότε', fd_where: 'Πού', fd_from: 'Από εσάς', fd_seen: 'Παρατηρητής', fd_lic: 'Άδεια', fd_src: 'Πηγή', fd_photoLic: l => `φωτογραφία ${l}`,
  fd_inat: 'iNaturalist, ερευνητικού επιπέδου (η κοινότητα συμφώνησε για το είδος)', fd_showMap: 'Δείτε στον χάρτη', fd_fishPage: 'Για αυτό το ψάρι', fd_open: s => `Άνοιγμα στο ${s}`,
  fd_honest: 'Παρατήρηση είναι ένα ψάρι που κάποιος είδε και φωτογράφισε, συχνά σε κατάδυση ή με μάσκα, και το μοιράστηκε ως ανοιχτά δεδομένα. Δεν είναι ψαριά, ούτε σημαίνει ότι το ψάρι βρίσκεται εκεί τώρα.' });
// Map (js/chart.js, js/search.js): map styles and the depth chart, the scale bar, the map search
Object.assign(I18N.en, { mapStyle: 'Map style', st_sat: 'Satellite', st_chart: 'Depth chart', l_seamarks: 'Nautical marks',
  seamarksTip: 'Buoys, beacons, lights and anchorages from OpenSeaMap, when zoomed in (needs the internet)',
  chartNote: 'Depth chart: EMODnet depths on a 250 m grid, in metres. Works offline. Not for navigation.', sc_km: 'km', sc_m: 'm', sc_nm: 'nm',
  ss_ph: 'Search places, spots and fish', ss_place: 'Places', ss_spot: 'Spots', ss_fish: 'Fish', ss_recent: 'Recent', ss_none: q => `Nothing found for “${q}”`,
  ss_hint: 'Type a place, a spot or a fish, in English or Greek', ss_clear: 'Clear', ss_back: 'Back', ss_browse: 'Browse', ss_all: 'All species', ss_allSub: 'What is biting near you, and every fish A–Z', ss_town: 'Coastal town' });
Object.assign(I18N.el, { mapStyle: 'Στυλ χάρτη', st_sat: 'Δορυφόρος', st_chart: 'Χάρτης βάθους', l_seamarks: 'Ναυτικά σήματα',
  seamarksTip: 'Σημαντήρες, φανοί, φάροι και αγκυροβόλια από το OpenSeaMap, όταν μεγεθύνετε (χρειάζεται ίντερνετ)',
  chartNote: 'Χάρτης βάθους: βάθη του EMODnet σε κάνναβο 250 μέτρων, σε μέτρα. Λειτουργεί χωρίς σύνδεση. Όχι για ναυσιπλοΐα.', sc_km: 'km', sc_m: 'm', sc_nm: 'ν.μ.',
  ss_ph: 'Ψάξτε μέρος ή ψάρι', ss_place: 'Μέρη', ss_spot: 'Σημεία', ss_fish: 'Ψάρια', ss_recent: 'Πρόσφατα', ss_none: q => `Δεν βρέθηκε τίποτα για «${q}»`,
  ss_hint: 'Γράψτε ένα μέρος, ένα σημείο ή ένα ψάρι, στα ελληνικά ή στα αγγλικά', ss_clear: 'Καθαρισμός', ss_back: 'Πίσω', ss_browse: 'Περιήγηση', ss_all: 'Όλα τα είδη', ss_allSub: 'Τι τσιμπάει κοντά σας και όλα τα ψάρια από το Α ως το Ω', ss_town: 'Παραλιακός οικισμός' });
// Feed › Reports (js/feed.js, data/reports.js): published catches from news, official and club pages
Object.assign(I18N.en, { fd_rep: 'Reports', fd_report: 'Report', fd_catch: 'Catch', fd_readRep: 'Read the report', fd_pubDate: 'date of publication',
  fd_repPlace: 'The area the report names, not an exact spot', fd_repIntro: 'Catches around Cyprus reported in the news and on official and club pages, in our own words with a link to the source. No names.',
  fd_repHonest: 'A report is a published story about a catch. Psarema summarises the facts and links to the original; the place is the area it names, and it doesn’t mean the fish is there now.' });
Object.assign(I18N.el, { fd_rep: 'Αναφορές', fd_report: 'Αναφορά', fd_catch: 'Ψαριά', fd_readRep: 'Διαβάστε την αναφορά', fd_pubDate: 'ημερομηνία δημοσίευσης',
  fd_repPlace: 'Η περιοχή που αναφέρει, όχι ακριβές σημείο', fd_repIntro: 'Ψαριές γύρω από την Κύπρο από ειδήσεις και επίσημες σελίδες ή σελίδες συλλόγων, με δικά μας λόγια και σύνδεσμο στην πηγή. Χωρίς ονόματα.',
  fd_repHonest: 'Η αναφορά είναι δημοσιευμένη είδηση για μια ψαριά. Το Psarema συνοψίζει τα στοιχεία και παραπέμπει στο πρωτότυπο· το σημείο είναι η περιοχή που αναφέρει και δεν σημαίνει ότι το ψάρι είναι εκεί τώρα.' });

/* ---------- Round 10 (UI agent A): the model's confidence, data freshness and your-catches layer, where the model provides them (js/ui.js, js/map.js) ---------- */
Object.assign(I18N.en, { conf_high: 'High confidence', conf_medium: 'Medium confidence', conf_low: 'Low confidence',
  dataFeeds: 'Data feeds', ageMin: n => `${n} min ago`, ageH: n => `${n} h ago`, ageD: n => `${n} d ago`,
  l_mine: 'Learn from my catches', mineTip: 'Adjust the fishing map to the trips you logged (kept on this phone)' });
Object.assign(I18N.el, { conf_high: 'Υψηλή βεβαιότητα', conf_medium: 'Μέτρια βεβαιότητα', conf_low: 'Χαμηλή βεβαιότητα',
  dataFeeds: 'Πηγές δεδομένων', ageMin: n => `πριν ${n} ${n === 1 ? 'λεπτό' : 'λεπτά'}`, ageH: n => `πριν ${n} ${n === 1 ? 'ώρα' : 'ώρες'}`, ageD: n => `πριν ${n} ${n === 1 ? 'μέρα' : 'μέρες'}`,
  l_mine: 'Μάθηση από τις ψαριές μου', mineTip: 'Προσαρμόστε τον χάρτη στις εξόδους που καταγράψατε (μένουν σε αυτό το κινητό)' });

/* ---------- Round 10b (3D areas agent): the fishing areas on the map, the area page and the area in 3D (js/areas.js, js/area3d.js) ---------- */
Object.assign(I18N.en, { l_areas: 'Fishing areas', ar_view3d: 'View in 3D', ar_3dSub: 'Land, seabed, buildings and the fish chance', ar_biting: 'Biting best now',
  ar_spots: f => `Best spots · ${f}`, ar_noFc: 'The forecast is still loading: the fish and spots follow once it is in.', ar_none: 'No fish has a chance here at this hour.',
  ar_noSpots: 'Not biting here at this hour.', ar_around: r => `${r} km around`, ar_openA: n => `${n}: area page`,
  a3_loading: 'Building the area in 3D…', a3_hint: 'Drag to turn · pinch or scroll to zoom · two fingers to move · tap a pin for its spot', a3_bare: 'Terrain', a3_heat: 'Fish chance',
  a3_meta: (w, x, s) => `${w} × ${w} km · heights ×${x} · depth lines every ${s} m`, a3_credits: s => `Imagery ${s} · land SRTM, EU-DEM · depths EMODnet`,
  a3_noImg: 'none (offline): shaded relief' });
Object.assign(I18N.el, { l_areas: 'Περιοχές ψαρέματος', ar_view3d: 'Δείτε σε 3D', ar_3dSub: 'Στεριά, βυθός, κτίρια και πιθανότητα ψαρέματος', ar_biting: 'Τσιμπάνε καλύτερα τώρα',
  ar_spots: f => `Καλύτερα σημεία · ${f}`, ar_noFc: 'Η πρόγνωση φορτώνει ακόμη· τα ψάρια και τα σημεία θα φανούν μόλις έρθει.', ar_none: 'Κανένα ψάρι δεν έχει πιθανότητα εδώ αυτή την ώρα.',
  ar_noSpots: 'Δεν τσιμπά εδώ αυτή την ώρα.', ar_around: r => `${r} km γύρω`, ar_openA: n => `${n}: σελίδα περιοχής`,
  a3_loading: 'Δημιουργία της περιοχής σε 3D…', a3_hint: 'Σύρετε για περιστροφή · τσιμπήστε ή κυλήστε για ζουμ · δύο δάχτυλα για μετακίνηση · πατήστε μια καρφίτσα για το σημείο', a3_bare: 'Ανάγλυφο', a3_heat: 'Πιθανότητα',
  a3_meta: (w, x, s) => `${w} × ${w} km · ύψη ×${x} · ισοβαθείς ανά ${s} m`, a3_credits: s => `Εικόνες ${s} · ξηρά SRTM, EU-DEM · βάθη EMODnet`,
  a3_noImg: 'καμία (χωρίς σήμα): σκιασμένο ανάγλυφο' });
// Round 11 (3D agent): the high-resolution areas (js/area3d.js): the "Realistic" look and the sources of the detailed terrain and buildings
Object.assign(I18N.en, { a3_real: 'Realistic', a3_metaR: (w, t) => `${w} × ${w} km · true scale · light at ${t}`,
  a3_cred2: (s, hi, b) => hi ? `Imagery ${s} · land Copernicus DEM GLO-30 (© DLR, Airbus, EU/ESA) · depths EMODnet${b ? ' · buildings © OpenStreetMap contributors, Cyprus DLS, Microsoft' : ''}` : `Imagery ${s} · land SRTM, EU-DEM · depths EMODnet` });
Object.assign(I18N.el, { a3_real: 'Ρεαλιστικό', a3_metaR: (w, t) => `${w} × ${w} km · πραγματική κλίμακα · φως στις ${t}`,
  a3_cred2: (s, hi, b) => hi ? `Εικόνες ${s} · ξηρά Copernicus DEM GLO-30 (© DLR, Airbus, ΕΕ/ESA) · βάθη EMODnet${b ? ' · κτίρια © συντελεστές OpenStreetMap, ΤΚΧ Κύπρου, Microsoft' : ''}` : `Εικόνες ${s} · ξηρά SRTM, EU-DEM · βάθη EMODnet` });
// Round 12 (3D sea agent): the forecast's sea and wind over the 3D view (js/area3d-sea.js); directions are where they come from
Object.assign(I18N.en, { a3_waves: (h, p, d) => `Waves ${h} m · ${p} s · from ${d}`, a3_swell: (h, p, d) => `Swell ${h} m · ${p} s · from ${d}`,
  a3_wind: (w, d, g) => `Wind ${w} km/h ${d}, gusts ${g}`, a3_hPrev: 'An hour earlier', a3_hNext: 'An hour later' });
Object.assign(I18N.el, { a3_waves: (h, p, d) => `Κύματα ${h} m · ${p} s · από ${d}`, a3_swell: (h, p, d) => `Αποθαλασσία ${h} m · ${p} s · από ${d}`,
  a3_wind: (w, d, g) => `Άνεμος ${w} km/h ${d}, ριπές ${g}`, a3_hPrev: 'Μία ώρα νωρίτερα', a3_hNext: 'Μία ώρα αργότερα' });

/* ---------- Round 10c, agent S (spot): the spot's page (js/spot-page.js) and its Best times (js/conditions.js days) ---------- */
Object.assign(I18N.en, { sg_act: { route: 'Route', save: 'Save', log: 'Log catch', share: 'Share' }, sg_now: 'Now', sg_at: w => `At ${w}`, sg_days: 'Best times, 7 days',
  sg_today: 'Today', sg_best: 'The best window this week', sg_noSafe: 'No safe time', sg_fishAt: t => `Fish best at ${t}, whatever the weather`, sg_fish: 'How to fish here',
  sg_areaGear: a => `Gear for this area · ${a}`, sg_area3d: 'Area in 3D', sg_sea: 'Seabed', sg_sea3d: 'Seabed and 3D',
  cWord: { great: 'Great conditions', good: 'Good conditions', fair: 'Fair conditions', poor: 'Poor conditions', unsafe: 'Not safe' } });
Object.assign(I18N.el, { sg_act: { route: 'Διαδρομή', save: 'Αποθήκευση', log: 'Ψαριά', share: 'Κοινοποίηση' }, sg_now: 'Τώρα', sg_at: w => `Στις ${w}`, sg_days: 'Καλύτερες ώρες, 7 ημέρες',
  sg_today: 'Σήμερα', sg_best: 'Το καλύτερο παράθυρο της εβδομάδας', sg_noSafe: 'Καμία ασφαλής ώρα', sg_fishAt: t => `Το ψάρι στο καλύτερο στις ${t}, με κάθε καιρό`, sg_fish: 'Πώς να ψαρέψετε εδώ',
  sg_areaGear: a => `Εξοπλισμός για την περιοχή · ${a}`, sg_area3d: 'Η περιοχή σε 3D', sg_sea: 'Βυθός', sg_sea3d: 'Βυθός και 3D',
  cWord: { great: 'Εξαιρετικές συνθήκες', good: 'Καλές συνθήκες', fair: 'Μέτριες συνθήκες', poor: 'Κακές συνθήκες', unsafe: 'Όχι ασφαλές' } });

/* ---------- Round 10c, agent M (the map tab): the sheet's peek header, the When tab's area rows ---------- */
Object.assign(I18N.en, { pk_now: 'Best spots now', pk_at: 'Best spots', m_areasHint: 'Each area’s best time this week. Tap one for its page.' });
Object.assign(I18N.el, { pk_now: 'Καλύτερα σημεία τώρα', pk_at: 'Καλύτερα σημεία', m_areasHint: 'Η καλύτερη ώρα κάθε περιοχής αυτή την εβδομάδα. Πατήστε μία για τη σελίδα της.' });

/* ---------- Round 11, agent I: keys the code used that were missing (round11/I/i18n-check.js) ---------- */
// offline: js/mobile.js refresh(), pulled to refresh with an older forecast and no connection (it showed the bare key)
Object.assign(I18N.en, { offline: 'You’re offline. Pull down again when you’re back online.' });
Object.assign(I18N.el, { offline: 'Είστε εκτός σύνδεσης. Τραβήξτε ξανά προς τα κάτω μόλις συνδεθείτε.' });

// round 13 detection
Object.assign(I18N.en, { fine_on: '50 m detail', fine_load: 'Loading 50 m detail…',
  l_sure: 'Low confidence', sureTip: 'Hatches the water where the score rests on little: no record of any fish within 5 km and no surveyed seabed. Not a forecast of bad fishing.',
  sure_title: 'How sure', sure_rec: k => `A fish record ${k} km away`, sure_recNone: k => `No fish record within ${k} km: untested water`,
  sure_bed: { survey: 'Seabed from a survey', model: 'Seabed from a model, not surveyed', none: 'Seabed unknown' },
  sure_depthOk: 'Depth well charted', sure_depthRough: 'Depth rough here (steep, or under 10 m)',
  sure_fc: (a, b) => `Weather could move the score: ${a} to ${b}`, sure_fcOk: 'Weather settled for this hour',
  sure_note: 'What the score rests on here. It is not a probability of a catch.' });
// round 13 detection
Object.assign(I18N.el, { fine_on: 'Λεπτομέρεια 50 μ', fine_load: 'Φόρτωση λεπτομέρειας 50 μ…',
  l_sure: 'Χαμηλή βεβαιότητα', sureTip: 'Γραμμοσκιάζει τα νερά όπου ο βαθμός στηρίζεται σε λίγα: καμία καταγραφή ψαριού σε 5 km και βυθός χωρίς χαρτογράφηση. Δεν σημαίνει κακό ψάρεμα.',
  sure_title: 'Πόσο σίγουρο', sure_rec: k => `Καταγραφή ψαριού σε ${k} km`, sure_recNone: k => `Καμία καταγραφή ψαριού σε ${k} km: αδοκίμαστα νερά`,
  sure_bed: { survey: 'Βυθός από χαρτογράφηση', model: 'Βυθός από μοντέλο, όχι χαρτογραφημένος', none: 'Άγνωστος βυθός' },
  sure_depthOk: 'Βάθος καλά χαρτογραφημένο', sure_depthRough: 'Βάθος κατά προσέγγιση εδώ (απότομο, ή κάτω από 10 m)',
  sure_fc: (a, b) => `Ο καιρός μπορεί να αλλάξει τον βαθμό: ${a} έως ${b}`, sure_fcOk: 'Σταθερός καιρός αυτή την ώρα',
  sure_note: 'Σε τι στηρίζεται ο βαθμός εδώ. Δεν είναι πιθανότητα ψαριάς.' });

// round 16 P
Object.assign(I18N.en, { p_noneKm: 'none within 1 km', p_a3Touch: 'Drag to turn · pinch to zoom · two fingers to move · tap a pin for its spot', p_diveTouch: 'Drag to turn · pinch to zoom · two fingers to move',
  p_spec: [] }); // p_spec: [English words in a lure's size line, the language's own] (ui.js specText)
// round 16 P
Object.assign(I18N.el, { p_noneKm: 'κανένα σε 1 km', p_a3Touch: 'Σύρετε για περιστροφή · τσιμπήστε για ζουμ · δύο δάχτυλα για μετακίνηση · πατήστε μια καρφίτσα για το σημείο', p_diveTouch: 'Σύρετε για περιστροφή · τσιμπήστε για ζουμ · δύο δάχτυλα για μετακίνηση',
  p_spec: [['no weight (trolling)', 'χωρίς βάρος (συρτή)'], ['hooks no', 'αγκίστρια νο'], ['head', 'μολυβοκεφαλή'], ['sinker', 'βαρίδι'], ['hooks', 'αγκίστρια']] });

// round 16 T
Object.assign(I18N.en, { t_sameWeek: 'Similar all week: the sea and the season hardly change here, so no day stands out.' });
// round 16 T
Object.assign(I18N.el, { t_sameWeek: 'Παρόμοια όλη την εβδομάδα: η θάλασσα και η εποχή σχεδόν δεν αλλάζουν εδώ, καμία μέρα δεν ξεχωρίζει.' });

// round 17 D
Object.assign(I18N.en, { d_seaCoast: 'Sea by coast', d_seaCoastTip: 'Waves at each stretch of coast this hour, from the forecast wind and swell and how open the water is to them. Clear water is calm (a lee shore); colour is rougher. Sea state, not fish.',
  d_seaWarn: (w, b) => 'Rough sea here this hour: ' + [w && `waves about ${w} m`, b && `wind Bft ${b}`].filter(Boolean).join(', ') });
// round 17 D
Object.assign(I18N.el, { d_seaCoast: 'Θάλασσα ανά ακτή', d_seaCoastTip: 'Το κύμα σε κάθε κομμάτι ακτής αυτή την ώρα, από τον άνεμο και τη φουσκοθαλασσιά της πρόγνωσης και το πόσο ανοιχτά είναι τα νερά σε αυτά. Καθαρό νερό σημαίνει γαλήνη (απάνεμη ακτή)· το χρώμα πιο ταραγμένη θάλασσα. Κατάσταση θάλασσας, όχι ψάρια.',
  d_seaWarn: (w, b) => 'Ταραγμένη θάλασσα εδώ αυτή την ώρα: ' + [w && `κύμα περίπου ${String(w).replace('.', ',')} m`, b && `άνεμος ${b} Bft`].filter(Boolean).join(', ') });
// round 17 G
Object.assign(I18N.en, { g17_helpAbout: 'Help and about', g17_helpAboutSub: 'Help centre, credits, privacy, version', g17_moreLayers: 'More layers', g17_mapDetails: 'Map details',
  g17_spxMore: 'Depth, seabed, water and sources', g17_spxAllGear: 'All baits and lures', g17_arAbout: 'About this area',
  // phase 2: Where to go (one list on the map), the fish's page from it
  g17_byArea: 'By area, this week', g17_anywhere: 'Anywhere', g17_fishPage: f => `${f}: guide, baits and rules`,
  g17_spotMore: 'More: position, 3D dive, data, score breakdown', g17_chartKey: 'Key', g17_moreReads: 'More readings: pressure, cloud, air, swell, current',
  g17_sunMoon: 'Sun and moon',
  // phase 3: the area page's lures, folded under Best baits
  g17_arLures: 'All lures, with filters' });
// round 17 G
Object.assign(I18N.el, { g17_helpAbout: 'Βοήθεια και πληροφορίες', g17_helpAboutSub: 'Κέντρο βοήθειας, πηγές, απόρρητο, έκδοση', g17_moreLayers: 'Περισσότερα επίπεδα', g17_mapDetails: 'Λεπτομέρειες χάρτη',
  g17_spxMore: 'Βάθος, βυθός, νερό και πηγές', g17_spxAllGear: 'Όλα τα δολώματα και τα τεχνητά', g17_arAbout: 'Η περιοχή',
  g17_byArea: 'Ανά περιοχή, αυτή την εβδομάδα', g17_anywhere: 'Παντού', g17_fishPage: f => `${f}: οδηγός, δολώματα και κανόνες`,
  g17_spotMore: 'Περισσότερα: θέση, 3D κατάδυση, δεδομένα, ανάλυση βαθμού', g17_chartKey: 'Υπόμνημα', g17_moreReads: 'Περισσότερα: πίεση, νέφωση, αέρας, φουσκοθαλασσιά, ρεύμα',
  g17_sunMoon: 'Ήλιος και φεγγάρι',
  g17_arLures: 'Όλα τα τεχνητά, με φίλτρα' });
// round 17 Q
Object.assign(I18N.en, { st_wreck: 'wreck', st_reef: 'reef', st_rock: 'rock', st_pier: 'pier', st_point: 'point', st_pinnacle: 'pinnacle', st_dropoff: 'drop-off', st_edge: 'rock edge' });
// round 17 Q
Object.assign(I18N.el, { st_wreck: 'ναυάγιο', st_reef: 'ύφαλος', st_rock: 'βράχος', st_pier: 'μόλος', st_point: 'κάβος', st_pinnacle: 'ξέρα', st_dropoff: 'γκρεμός', st_edge: 'άκρη βράχου' });
// round 17 U
Object.assign(I18N.en, { u_best: 'Best day', u_calm: 'Calm', u_windy: 'Windy', u_rough: 'Rough' });
// round 17 U
Object.assign(I18N.el, { u_best: 'Καλύτερη μέρα', u_calm: 'Ήρεμα', u_windy: 'Αέρας', u_rough: 'Φουρτούνα' });
// round 17 K: the hot spots (js/hotspots.js)
Object.assign(I18N.en, { l_allwater: 'Fishing chance (all water)', hs_allTip: 'Colour all the water by its chance, as before, instead of only the hot spots',
  hs_title: 'Hot spot', hs_depth: d => `${d} m deep`, hs_best: w => `best ${w}` });
Object.assign(I18N.el, { l_allwater: 'Πιθανότητα ψαρέματος (όλα τα νερά)', hs_allTip: 'Χρωματίζει όλο το νερό ανάλογα με την πιθανότητα, όπως πριν, αντί μόνο τα θερμά σημεία',
  hs_title: 'Θερμό σημείο', hs_depth: d => `βάθος ${d} m`, hs_best: w => `καλύτερα ${w}` });
// round 18 A: marking your spots (js/pins.js), the personal layer learning from them (js/personal.js), the 3-tap log and the blank trip,
// exact positions for science and the CSV export (js/catchlog.js). Some keys of earlier rounds are renamed here ("…and spots").
Object.assign(I18N.en, { a18_mySpot: 'My spot', a18_markT: 'Mark a spot that produces fish', a18_editT: 'Edit my spot', a18_markHere: 'Mark my fishing spot here',
  a18_markBtn: 'Mark spot', a18_markIt: 'Mark as fishing spot', a18_edit: 'Edit spot', a18_fish: 'Fish', a18_addFish: 'Add a fish…', a18_season: 'When', a18_how: 'How good',
  a18_seasons: { all: 'All year', spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }, a18_months: 'months', a18_q: ['Some fish', 'Good', 'Very good'],
  a18_save: 'Save spot', a18_needFish: 'Pick at least one fish', a18_needMonth: 'Pick at least one month', a18_saved: n => `Spot saved: ${n}`,
  a18_csv: 'Export my data (CSV)',
  a18_exact: 'Share exact positions for science (helps the fish map)',
  a18_exactNeedsOn: 'Needs the switch above. Until then nothing leaves this phone.',
  a18_exactOffSub: 'Off: each entry leaves rounded to a square of about 2 × 2 km.',
  a18_exactOnSub: 'On: the exact place your phone’s GPS logged, with its accuracy, goes only to the app’s makers, into a table no angler can read, you included. Never shown to anyone. A place you set by hand still goes as the square.',
  a18_exactOnToast: 'Exact positions on, for entries sent from now', a18_exactOffToast: 'Exact positions off: only the 2 km square leaves',
  a18_whatExact: 'The exact place your GPS logged and its accuracy in metres, because you switched exact positions on (a place set by hand: the square)',
  a18_neverExact: 'Photos, notes, sizes, weights, baits, your name, email or profile.',
  l_mine: 'Learn from my catches and spots', mineTip: 'Adjust the fishing map to the trips you logged and the spots you marked (kept on this phone)',
  ct_learn: 'Learn from my catches and spots', ct_learnOn: 'The map now learns from your catches and spots', ct_learnOff: 'The map no longer uses your catches and spots',
  ct_learnHow: 'How: each trip near a place (within about 5 km, nearer counts more) moves your chance there from your overall catch rate toward what happened there; a catch of another fish counts as half a trip. A spot you marked counts as 1 to 3 catches there (by how good it is), only for its fish, its months and its method, and leaves your overall rate alone. With little evidence the change stays small. A place never moves more than −40%…+60%, a time of day (dawn, day, dusk, night) more than −15%…+18%. A tapped spot’s breakdown shows the part it adds.',
  ct_rowVal: (f, c, b, m) => `×${f} · from ${c} with fish, ${b} blank${m ? `, ${m === 1 ? '1 marked spot' : `${m} marked spots`}` : ''}`,
  pp_l_place: 'Saved places and spots', me_places: 'Saved places and spots', ct_blankLog: 'Fished here, caught nothing' });
// round 18 A
Object.assign(I18N.el, { a18_mySpot: 'Το πόστο μου', a18_markT: 'Σημειώστε ένα πόστο που βγάζει ψάρι', a18_editT: 'Επεξεργασία πόστου', a18_markHere: 'Σημείωση πόστου εδώ',
  a18_markBtn: 'Πόστο', a18_markIt: 'Σημείωση ως πόστο', a18_edit: 'Επεξεργασία', a18_fish: 'Ψάρια', a18_addFish: 'Προσθήκη ψαριού…', a18_season: 'Πότε', a18_how: 'Πόσο καλό',
  a18_seasons: { all: 'Όλο τον χρόνο', spring: 'Άνοιξη', summer: 'Καλοκαίρι', autumn: 'Φθινόπωρο', winter: 'Χειμώνας' }, a18_months: 'μήνες', a18_q: ['Λίγα ψάρια', 'Καλό', 'Πολύ καλό'],
  a18_save: 'Αποθήκευση πόστου', a18_needFish: 'Επιλέξτε τουλάχιστον ένα ψάρι', a18_needMonth: 'Επιλέξτε τουλάχιστον έναν μήνα', a18_saved: n => `Το πόστο αποθηκεύτηκε: ${n}`,
  a18_csv: 'Εξαγωγή δεδομένων σε πίνακα',
  a18_exact: 'Κοινή χρήση ακριβών θέσεων για την επιστήμη (βοηθά τον χάρτη ψαριών)',
  a18_exactNeedsOn: 'Χρειάζεται τον διακόπτη από πάνω. Ως τότε τίποτα δεν φεύγει από το κινητό.',
  a18_exactOffSub: 'Ανενεργό: κάθε καταγραφή φεύγει στρογγυλεμένη σε τετράγωνο περίπου 2 × 2 km.',
  a18_exactOnSub: 'Ενεργό: το ακριβές σημείο που κατέγραψε το GPS του κινητού, με την ακρίβειά του, πηγαίνει μόνο στους δημιουργούς της εφαρμογής, σε πίνακα που κανένας ψαράς δεν διαβάζει, ούτε εσείς. Δεν εμφανίζεται ποτέ σε κανέναν. Ένα σημείο που ορίσατε με το χέρι φεύγει πάλι ως τετράγωνο.',
  a18_exactOnToast: 'Ακριβείς θέσεις ενεργές, για ό,τι στέλνεται από τώρα', a18_exactOffToast: 'Ακριβείς θέσεις ανενεργές: φεύγει μόνο το τετράγωνο των 2 km',
  a18_whatExact: 'Το ακριβές σημείο του GPS και η ακρίβειά του σε μέτρα, επειδή ενεργοποιήσατε τις ακριβείς θέσεις (σημείο που ορίσατε με το χέρι: το τετράγωνο)',
  a18_neverExact: 'Φωτογραφίες, σημειώσεις, μήκη, βάρη, δολώματα, το όνομα, το email ή το προφίλ σας.',
  l_mine: 'Μάθηση από τις ψαριές και τα πόστα μου', mineTip: 'Προσαρμόστε τον χάρτη στις εξόδους που καταγράψατε και στα πόστα που σημειώσατε (μένουν σε αυτό το κινητό)',
  ct_learn: 'Μάθηση από τις ψαριές και τα πόστα μου', ct_learnOn: 'Ο χάρτης μαθαίνει τώρα από τις ψαριές και τα πόστα σας', ct_learnOff: 'Ο χάρτης δεν χρησιμοποιεί πλέον τις ψαριές και τα πόστα σας',
  ct_learnHow: 'Πώς: κάθε έξοδος κοντά σε ένα μέρος (ως περίπου 5 km, όσο πιο κοντά τόσο περισσότερο μετρά) μετακινεί την ευκαιρία σας εκεί από τον συνολικό σας μέσο όρο προς αυτό που έγινε εκεί· μια ψαριά άλλου ψαριού μετρά μισή έξοδο. Ένα πόστο που σημειώσατε μετρά σαν 1 έως 3 ψαριές εκεί (ανάλογα με το πόσο καλό είναι), μόνο για τα ψάρια, τους μήνες και τον τρόπο του, και δεν αλλάζει τον συνολικό σας μέσο όρο. Με λίγα στοιχεία η αλλαγή μένει μικρή. Ένα μέρος δεν αλλάζει ποτέ πάνω από −40%…+60% και μια ώρα της μέρας (αυγή, μέρα, σούρουπο, νύχτα) πάνω από −15%…+18%. Η ανάλυση ενός σημείου δείχνει το μέρος που προσθέτει.',
  ct_rowVal: (f, c, b, m) => `×${f} · από ${c} με ψάρι, ${b} άδειες${m ? `, ${m === 1 ? '1 πόστο' : `${m} πόστα`}` : ''}`,
  pp_l_place: 'Αποθηκευμένα σημεία και πόστα', me_places: 'Αποθηκευμένα σημεία και πόστα', ct_blankLog: 'Ψάρεψα εδώ, δεν έπιασα τίποτα' });
