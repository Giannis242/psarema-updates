'use strict';
// Psarema: live ships around Cyprus (AIS), through the owner's relay (scripts/live-ais/worker.js; set-up steps in scripts/live-ais/README.md).
//   aisstream.io's free stream may not be opened from a browser and its key must stay on a server, so the app connects to a small relay that
//   holds the key and one upstream subscription for every viewer. The relay sends aisstream-format messages, singly or in batches (JSON
//   arrays); its first batch is a snapshot whose positions carry MetaData.since (settled there since) and MetaData.first (first seen).
// "Live ships" joins the Ships group of the Layers popover (#lay-ships, filled by js/vessels.js just before; its type names vs_* are reused).
// Ships are DOM markers rotated by heading (a CSS transition glides them between reports), coloured by type, sized by length, with a short
// trail; a tap opens a card (phones: the sheet, PsMobile.showHtml; wide screens: a popup) with a photo from Wikimedia Commons, else a drawing.
// Instant: the table is kept in localStorage (12 h at most, as the relay), so turning the layer on draws the last known ships at once; the
// relay's snapshot (~0.3 s after connecting) then replaces it, ships it no longer has go, the rest fade in or glide.
// Stationary (a yellow ring): within STILL_M of where it settled for longer than the hours chosen, or reports at anchor / moored and is not
//   moving. "Stationary for" is exact, from the ship's own reports (its first one at that spot to its latest; the relay's `since`), and is
//   shown only for ships that stopped while tracked: one already there when first picked up says so, with no time (never a guess).
// Local testing only: on an http://localhost page, ?liveais=ws://localhost:8765 points the layer at scripts/live-ais/mock-server.mjs
//   (synthetic ships, all labelled TEST). The shipped app (https, or Capacitor's https://localhost) never takes that override.
// Data API (debugging, tests): PsLiveShips.ships (MMSI -> ship), PsLiveShips.lookup(ship) -> its Commons photo or null.
{
  const LIVE_AIS_URL = 'wss://psarema-ais.live-ais.workers.dev'; // the relay (scripts/live-ais). Never an aisstream.io key here: keys stay on the relay.
  const PHOTO_UA = 'Psarema/1.0 (Cyprus fishing app; live ships layer)'; // Wikimedia asks API users to say who they are (add a contact URL or e-mail)

  if (window.L && typeof map !== 'undefined' && typeof LAYER_OBJ !== 'undefined' && typeof applyLayer === 'function' && $('#lay-ships')) {
    const DEV = location.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const FEED = (DEV && new URLSearchParams(location.search).get('liveais')) || LIVE_AIS_URL;
    const SUB = { BoundingBoxes: [[[34.0, 31.5], [36.0, 35.0]]], FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData', 'StaticDataReport'] };
    const STILL_M = 300, TRAIL_N = 30, TRAIL_M = 40, FADE = 10 * 60e3, HIDE = 30 * 60e3, FORGET = 12 * 3600e3, DWELL = [1, 2, 3, 6, 12, 24];
    const CATS = ['fishing', 'passenger', 'cargo', 'tanker', 'pleasure', 'other'];
    const COLOR = { fishing: '#ffa94d', passenger: '#4dabf7', cargo: '#69db7c', tanker: '#ff6b6b', pleasure: '#f2f2f3', other: '#868e96' };
    const catOf = t => t === 30 ? 'fishing' : t === 36 || t === 37 ? 'pleasure' : t >= 40 && t < 50 || t >= 60 && t < 70 ? 'passenger' : t >= 70 && t < 80 ? 'cargo' : t >= 80 && t < 90 ? 'tanker' : 'other';
    const SPEC = { 31: 'tug', 32: 'tug', 52: 'tug', 33: 'dredging', 35: 'military', 55: 'military', 36: 'sailing', 50: 'pilot', 51: 'sar' }; // AIS ship type -> a finer name
    const typeName = s => tr('ls_one')[!s.type ? 'unknown' : SPEC[s.type] || (s.type >= 40 && s.type < 50 ? 'hsc' : catOf(s.type))]; // one ship (the chips use Ship traffic's plurals)
    // Flag: the MMSI's first three digits (ITU Maritime Identification Digits) -> ISO country, named by the browser in the app's language
    const MID = new Map(('201AL202AD203AT204PT205BE206BY207BG208VA209CY210CY211DE212CY213GE214MD215MT216AM218DE219DK220DK224ES225ES226FR227FR228FR229MT230FI231FO232GB233GB234GB235GB236GI237GR238HR239GR240GR241GR242MA243HU244NL245NL246NL247IT248MT249MT250IE251IS252LI253LU254MC255PT256MT257NO258NO259NO261PL262ME263PT264RO265SE266SE267SK268SM269CH270CZ271TR272UA273RU274MK275LV276EE277LT278SI279RS' +
      '301AI303US304AG305AG306CW307AW308BS309BS310BM311BS312BZ314BB316CA319KY321CR323CU325DM327DO329GP330GD331GL332GT334HN336HT338US339JM341KN343LC345MX347MQ348MS350NI351PA352PA353PA354PA355PA356PA357PA358PR359SV361PM362TT364TC366US367US368US369US370PA371PA372PA373PA374PA375VC376VC377VC378VG379VI' +
      '401AF403SA405BD408BH410BT412CN413CN414CN416TW417LK419IN422IR423AZ425IQ428IL431JP432JP434TM436KZ437UZ438JO440KR441KR443PS445KP447KW450LB451KG453MO455MV457MN459NP461OM463PK466QA468SY470AE471AE472TJ473YE475YE477HK478BA' +
      '501TF503AU506MM508BN510FM511PW512NZ514KH515KH516CX518CK520FJ523CC525ID529KI531LA533MY536MP538MH540NC542NU544NR546PF548PH550TL553PG555PN557SB559AS561WS563SG564SG565SG566SG567TH570TO572TV574VN576VU577VU578WF' +
      '601ZA603AO605DZ607TF608SH609BI610BJ611BW612CF613CM615CG616KM617CV618TF619CI620KM621DJ622EG624ET625ER626GA627GH629GM630GW631GQ632GN633BF634KE635TF636LR637LR638SS642LY644LS645MU647MG649ML650MZ654MR655MW656NE657NG659NA660RE661RW662SD663SN664SC665SH666SO667SL668ST669SZ670TD671TG672TN674TZ675UG676CD677TZ678ZM679ZW' +
      '701AR710BR720BO725CL730CO735EC740FK745GF750GY755PY760PE765SR770UY775VE').match(/\d{3}[A-Z]{2}/g).map(s => [+s.slice(0, 3), s.slice(3)]));
    const flagOf = mmsi => { const c = mmsi >= 2e8 && mmsi < 8e8 && MID.get(Math.floor(mmsi / 1e6)); if (!c) return ''; try { return new Intl.DisplayNames([locale()], { type: 'region' }).of(c); } catch { return c; } };
    const parseT = s => { const m = /^(\S+) (\d\d:\d\d:\d\d(?:\.\d{1,3})?)\d* \+0000/.exec(s || ''); return m ? Date.parse(`${m[1]}T${m[2]}Z`) : Date.parse(s) || 0; }; // aisstream's "2026-10-25 09:12:03.123456 +0000 UTC", or ISO
    const metres = (a, b, c, d) => Math.hypot((d - b) * Math.cos((a + c) * Math.PI / 360), c - a) * 111195;
    const clean = s => String(s ?? '').replace(/@/g, ' ').replace(/\s+/g, ' ').trim(); // AIS pads text with @
    const dur = ms => { const m = Math.max(0, Math.round(ms / 60e3)); return m < 1 ? tr('ls_lt1') : m < 60 ? tr('ls_min', m) : m < 2880 ? tr('ls_hm', Math.floor(m / 60), m % 60) : tr('ls_dh', Math.floor(m / 1440), Math.floor(m % 1440 / 60)); };
    const ago = ms => tr('ls_ago', ms < 60e3 ? tr('ls_s', Math.max(0, Math.round(ms / 1e3))) : dur(ms));

    Object.assign(I18N.en, {
      l_liveships: 'Live ships', ls_need: 'Live ships need a free AIS key:', ls_seeHelp: 'see Help', ls_connecting: 'Connecting…', ls_wait: 'Connected, waiting for ships…',
      ls_live: (n, a) => `Live · ${n} on the map · last message ${a}`, ls_retry: s => `Connection lost, retrying in ${s} s`, ls_err: e => `Live feed problem: ${e}`,
      ls_mock: 'TEST FEED: synthetic ships, not real', ls_test: 'TEST', ls_only: 'Only ships stationary for over', ls_dwell: 'Stationary for over',
      ls_ringKey: h => `Yellow ring: stayed within 300 m for over ${h}, or at anchor / moored`, ls_h: h => `${h} h`,
      ls_flag: 'Flag', ls_size: 'Size', ls_speed: 'Speed', ls_kn: 'kn', ls_status: 'Status', ls_dest: 'Destination', ls_here: 'Stationary for', ls_sinceT: t => `since ${t}`,
      ls_stayed: 'Stationary', ls_pre: t => `already here when tracking began (${t}) · how long before is unknown`,
      ls_seen: 'Last report', ls_ids: 'IDs', ls_call: 'call sign',
      ls_act: 'Activity', ls_fishYes: 'Fishing now (its AIS says so)', ls_fishLikely: 'Probably fishing (a fishing vessel at fishing speed, 1.5–5 kn)', ls_fishN: n => `${n} fishing now`,
      ls_one: { fishing: 'Fishing vessel', passenger: 'Passenger', cargo: 'Cargo', tanker: 'Tanker', pleasure: 'Pleasure craft', sailing: 'Sailing boat', tug: 'Tug', hsc: 'High-speed craft',
        dredging: 'Dredger', military: 'Military, law enforcement', pilot: 'Pilot boat', sar: 'Search and rescue', other: 'Other', unknown: 'Unknown type' },
      ls_src: 'Live AIS via aisstream.io. Not for navigation.', ls_srcMock: 'Synthetic test ship (scripts/live-ais/mock-server.mjs), not real.',
      ls_photo: (by, lic) => `Photo: ${by}${lic ? ', ' + lic : ''}, Wikimedia Commons`,
      ls_lt1: 'under 1 min', ls_min: m => `${m} min`, ls_hm: (h, m) => m ? `${h} h ${m} min` : `${h} h`, ls_dh: (d, h) => `${d} d ${h} h`, ls_s: s => `${s} s`, ls_ago: a => `${a} ago`,
      ls_nav: ['Under way (engine)', 'At anchor', 'Not under command', 'Restricted manoeuvrability', 'Constrained by draught', 'Moored', 'Aground', 'Fishing', 'Under way (sailing)', '', '', 'Towing', 'Pushing or towing alongside', '', 'Emergency (AIS-SART)', ''],
    });
    Object.assign(I18N.el, {
      l_liveships: 'Πλοία τώρα', ls_need: 'Τα πλοία τώρα χρειάζονται δωρεάν κλειδί AIS:', ls_seeHelp: 'δείτε τη Βοήθεια', ls_connecting: 'Σύνδεση…', ls_wait: 'Συνδέθηκε, αναμονή για πλοία…',
      ls_live: (n, a) => `Ζωντανά · ${n} στον χάρτη · τελευταίο μήνυμα ${a}`, ls_retry: s => `Η σύνδεση χάθηκε, νέα προσπάθεια σε ${s} δευτ.`, ls_err: e => `Πρόβλημα ζωντανής ροής: ${e}`,
      ls_mock: 'ΔΟΚΙΜΑΣΤΙΚΗ ΡΟΗ: εικονικά πλοία, όχι πραγματικά', ls_test: 'ΔΟΚΙΜΗ', ls_only: 'Μόνο πλοία ακίνητα για πάνω από', ls_dwell: 'Ακίνητα για πάνω από',
      ls_ringKey: h => `Κίτρινος κύκλος: έμεινε μέσα σε 300 m για πάνω από ${h}, ή αγκυροβολημένο / δεμένο`, ls_h: h => `${h} ώρ.`,
      ls_flag: 'Σημαία', ls_size: 'Μέγεθος', ls_speed: 'Ταχύτητα', ls_kn: 'κόμβοι', ls_status: 'Κατάσταση', ls_dest: 'Προορισμός', ls_here: 'Ακίνητο για', ls_sinceT: t => `από ${t}`,
      ls_stayed: 'Ακίνητο', ls_pre: t => `ήταν ήδη εδώ όταν άρχισε η παρακολούθηση (${t}) · πόσο πριν, άγνωστο`,
      ls_seen: 'Τελευταίο σήμα', ls_ids: 'Αναγνωριστικά', ls_call: 'διακριτικό',
      ls_act: 'Δραστηριότητα', ls_fishYes: 'Ψαρεύει τώρα (το δηλώνει το AIS του)', ls_fishLikely: 'Μάλλον ψαρεύει (αλιευτικό σε ταχύτητα ψαρέματος, 1,5–5 κόμβοι)', ls_fishN: n => `${n} ψαρεύουν τώρα`,
      ls_one: { fishing: 'Αλιευτικό', passenger: 'Επιβατηγό', cargo: 'Φορτηγό', tanker: 'Δεξαμενόπλοιο', pleasure: 'Σκάφος αναψυχής', sailing: 'Ιστιοφόρο', tug: 'Ρυμουλκό', hsc: 'Ταχύπλοο',
        dredging: 'Βυθοκόρος', military: 'Πολεμικό, λιμενικό', pilot: 'Πλοηγίδα', sar: 'Έρευνα και διάσωση', other: 'Άλλο', unknown: 'Άγνωστος τύπος' },
      ls_src: 'Ζωντανό AIS μέσω aisstream.io. Όχι για ναυσιπλοΐα.', ls_srcMock: 'Εικονικό δοκιμαστικό πλοίο (scripts/live-ais/mock-server.mjs), όχι πραγματικό.',
      ls_photo: (by, lic) => `Φωτογραφία: ${by}${lic ? ', ' + lic : ''}, Wikimedia Commons`,
      ls_lt1: 'κάτω από 1 λεπτό', ls_min: m => `${m} λεπ.`, ls_hm: (h, m) => m ? `${h} ώρ. ${m} λεπ.` : `${h} ώρ.`, ls_dh: (d, h) => `${d} ημ. ${h} ώρ.`, ls_s: s => `${s} δευτ.`, ls_ago: a => `πριν από ${a}`,
      ls_nav: ['Σε πλου (μηχανή)', 'Αγκυροβολημένο', 'Ακυβέρνητο', 'Περιορισμένη ικανότητα ελιγμών', 'Περιορισμένο από το βύθισμα', 'Δεμένο', 'Προσαραγμένο', 'Αλιεύει', 'Σε πλου (ιστία)', '', '', 'Ρυμουλκεί', 'Ωθεί ή ρυμουλκεί πλευρικά', '', 'Κίνδυνος (AIS-SART)', ''],
    });

    /* Help: a "Live ships" topic joins the help centre's content when data/help.js loads (it sets window.PSAREMA_HELP) */
    const T = (en, el) => ({ en, el });
    const TOPIC = { id: 'live-ships', icon: 'ship', /* round 16 P: its own icon, not Sea safety's waves */ title: T('Live ships', 'Πλοία τώρα'), summary: T('Ships on the map right now, and what AIS can’t show', 'Τα πλοία στον χάρτη τώρα, και τι δεν δείχνει το AIS'), sections: [
      { text: [T('Layers → Ships → Live ships shows the vessels around Cyprus that broadcast AIS, moving on the map as they report. The arrow points where a ship is heading, the short line behind it shows where it has just been, and the colour gives its type. Tap a ship for its name, flag, size, speed, destination and, when Wikimedia Commons has one, a photo.',
        'Επίπεδα → Πλοία → Πλοία τώρα: τα σκάφη γύρω από την Κύπρο που εκπέμπουν AIS, να κινούνται στον χάρτη καθώς στέλνουν τη θέση τους. Το βέλος δείχνει πού πηγαίνει το πλοίο, η κοντή γραμμή πίσω του από πού μόλις πέρασε, και το χρώμα τον τύπο του. Πατήστε ένα πλοίο για όνομα, σημαία, μέγεθος, ταχύτητα, προορισμό και, όταν υπάρχει στα Wikimedia Commons, φωτογραφία.')] },
      { title: T('Ships that stay in one place', 'Πλοία που μένουν στο ίδιο σημείο'), text: [T('A yellow ring marks a ship that has stayed within about 300 m for longer than the time you choose (1 to 24 hours), or that reports being at anchor or moored. “Stationary for” is measured from the ship’s own position reports: from its first report at that spot to its latest one. It is shown only for ships that stopped while the feed was tracking them. A ship that was already there when the feed first picked it up says so, with that time and no duration, because its earlier history is not available.',
        'Ο κίτρινος κύκλος δείχνει πλοίο που έμεινε μέσα σε περίπου 300 m για περισσότερο από τον χρόνο που διαλέγετε (1 έως 24 ώρες), ή που δηλώνει ότι είναι αγκυροβολημένο ή δεμένο. Το «Ακίνητο για» μετριέται από τις δικές του αναφορές θέσης: από την πρώτη αναφορά του σε εκείνο το σημείο ως την τελευταία. Φαίνεται μόνο για πλοία που σταμάτησαν ενώ η ροή τα παρακολουθούσε. Αν ήταν ήδη εκεί όταν η ροή το εντόπισε πρώτη φορά, το λέει, με εκείνη την ώρα και χωρίς διάρκεια, γιατί το παλαιότερο ιστορικό δεν είναι διαθέσιμο.')] },
      { title: T('What it can’t show', 'Τι δεν μπορεί να δείξει'), items: [
        T('Most small fishing boats and many leisure boats carry no AIS, so they are not on the map.', 'Τα περισσότερα μικρά αλιευτικά και πολλά σκάφη αναψυχής δεν έχουν AIS, οπότε δεν φαίνονται.'),
        T('Coverage comes from volunteer AIS receivers on land. Some areas, often far offshore, can have gaps or old positions.', 'Η κάλυψη έρχεται από εθελοντικούς δέκτες AIS στη στεριά. Κάποιες περιοχές, συχνά μακριά από την ακτή, μπορεί να έχουν κενά ή παλιές θέσεις.'),
        T('Positions can be late, wrong or missing. Never use this for navigation or to avoid collisions.', 'Οι θέσεις μπορεί να αργούν, να είναι λάθος ή να λείπουν. Ποτέ μην το χρησιμοποιείτε για ναυσιπλοΐα ή για αποφυγή σύγκρουσης.'),
        T('The live layer uses mobile data while it is on. It stops two minutes after the app goes to the background.', 'Το ζωντανό επίπεδο χρησιμοποιεί δεδομένα κινητής όσο είναι ανοιχτό. Σταματά δύο λεπτά αφού η εφαρμογή πάει στο παρασκήνιο.'),
        T('AIS is broadcast openly by the ships themselves. Psarema keeps positions only for a few hours, to tell how long a ship has stayed. Please respect other fishers.', 'Το AIS το εκπέμπουν ανοιχτά τα ίδια τα πλοία. Το Psarema κρατά θέσεις μόνο για λίγες ώρες, για να ξέρει πόσο έμεινε ένα πλοίο. Σεβαστείτε τους άλλους ψαράδες.'),
      ] },
      // the owner's setup steps only while no relay is set: never in the store build (round 14 store)
      ...(LIVE_AIS_URL ? [] : [{ title: T('Setting it up (for the app owner)', 'Ρύθμιση (για τον ιδιοκτήτη της εφαρμογής)'), steps: [
        T('Sign in at aisstream.io with a GitHub account and create a free API key.', 'Συνδεθείτε στο aisstream.io με λογαριασμό GitHub και φτιάξτε δωρεάν κλειδί API.'),
        T('Deploy the small relay in scripts/live-ais of the project (a free Cloudflare Worker) and store the key there as a secret. The key never goes into the app: aisstream.io does not allow browsers to connect with it.', 'Ανεβάστε τον μικρό αναμεταδότη από το scripts/live-ais του έργου (δωρεάν Cloudflare Worker) και αποθηκεύστε εκεί το κλειδί ως μυστικό. Το κλειδί δεν μπαίνει ποτέ στην εφαρμογή: το aisstream.io δεν επιτρέπει σύνδεση από πρόγραμμα περιήγησης.'),
        T('Put the relay’s wss:// address in LIVE_AIS_URL at the top of js/live-ships.js and publish the app. The full steps are in scripts/live-ais/README.md.', 'Βάλτε τη διεύθυνση wss:// του αναμεταδότη στο LIVE_AIS_URL στην αρχή του js/live-ships.js και δημοσιεύστε την εφαρμογή. Όλα τα βήματα είναι στο scripts/live-ais/README.md.'),
      ], links: [{ href: 'https://aisstream.io', label: T('aisstream.io (free live AIS)', 'aisstream.io (δωρεάν ζωντανό AIS)') }] }]),
    ] };
    const addTopic = h => { if (h?.topics && !h.topics.some(x => x.id === TOPIC.id)) h.topics.push(TOPIC); return h; };
    if (window.PSAREMA_HELP) addTopic(window.PSAREMA_HELP);
    else { let h; Object.defineProperty(window, 'PSAREMA_HELP', { configurable: true, enumerable: true, get: () => h, set: v => { h = addTopic(v); } }); }
    const openHelp = () => {
      if (typeof toggleLayers === 'function') toggleLayers(false);
      $('#help-modal').hidden = false;
      loadScripts('data/help.js', 'js/help.js').then(() => PsHelp.open($('#help-host'), { lang: state.lang, topic: TOPIC.id, onClose: () => closeModal('#help-modal') }),
        e => { console.warn(e.message); closeModal('#help-modal'); });
    };

    /* The table: every ship heard, by MMSI. ship = { mmsi, name, call, imo, type, len, beam, dest, draught, lat, lon, sog, cog, hdg, nav, t (last
       position, ms), first (first seen), at: { lat, lon, t } (where and since when it has stayed within STILL_M), trail: [[lat, lon]…], mock, mk, ln } */
    const ships = new Map(), feed = { mock: false, error: '', last: 0 }, dirty = new Set();
    function onMsg(m) {
      if (Array.isArray(m)) { m.forEach(onMsg); return; }
      if (!m || typeof m !== 'object') return;
      if (m.Mock || m.MetaData?.Mock) feed.mock = true;
      if (m.error || m.MessageType === 'Error') { feed.error = clean(m.error || m.Error); return; }
      const md = m.MetaData || {}, b = m.Message?.[m.MessageType];
      if (!b) return; // Hello, unknown types
      const id = +(md.MMSI ?? b.UserID); if (!(id > 0)) return;
      let s = ships.get(id);
      if (!s) ships.set(id, s = { mmsi: id, trail: [], t: 0 });
      if (md.Mock) s.mock = true;
      s.old = false; feed.error = '';
      const ra = b.ReportA?.Valid ? b.ReportA : null, rb = b.ReportB?.Valid ? b.ReportB : null, st = rb || b;
      const name = clean(b.Name ?? ra?.Name) || (!s.name && clean(md.ShipName));
      if (name) s.name = name;
      if (st.CallSign) s.call = clean(st.CallSign) || s.call;
      if (b.ImoNumber > 0) s.imo = b.ImoNumber;
      const ty = b.Type ?? st.ShipType; if (ty > 0) s.type = ty;
      const d = st.Dimension; if (d && d.A + d.B > 0) { s.len = d.A + d.B; s.beam = d.C + d.D || s.beam; }
      if (b.Destination != null) s.dest = clean(b.Destination);
      if (b.MaximumStaticDraught > 0) s.draught = b.MaximumStaticDraught;
      if ('Latitude' in b) position(s, b, md);
      dirty.add(id);
    }
    function position(s, b, md) {
      const lat = b.Latitude, lon = b.Longitude, t = parseT(md.time_utc) || Date.now();
      if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180) || b.Valid === false || t < s.t) return; // 91 / 181 = no position; older than what we have
      if (s.lat != null) { // a jump faster than 60 kn is a bad fix (GPS glitch, a wrong MMSI); three in a row agreeing with each other: the ship did move
        const d = metres(s.lat, s.lon, lat, lon);
        if (d > 1000 && d / Math.max(1, (t - s.t) / 1e3) > 31 && (s.bad = (s.bad || 0) + 1) < 3) return;
      }
      s.bad = 0;
      Object.assign(s, { lat, lon, t, sog: b.Sog >= 0 && b.Sog < 102.2 ? b.Sog : null, cog: b.Cog >= 0 && b.Cog < 360 ? b.Cog : null, hdg: b.TrueHeading >= 0 && b.TrueHeading < 360 ? b.TrueHeading : null });
      if (b.NavigationalStatus != null) s.nav = b.NavigationalStatus;
      const p = s.trail.at(-1);
      if (!p || metres(p[0], p[1], lat, lon) > TRAIL_M) { s.trail.push([lat, lon]); if (s.trail.length > TRAIL_N) s.trail.shift(); s.tn = (s.tn || 0) + 1; } // tn: draw() redraws the trail only when it changed
      s.first = Math.min(s.first || t, parseT(md.first) || t);
      // Since when it has stayed here: the relay's `since` when given (worker.js: the same rule over its whole history of the ship), else
      // from this page's own reports. At anchor it swings round the anchor (as the relay, worker.js SWING_M).
      const since = parseT(md.since), swing = (s.nav === 1 || s.nav === 5) && !(s.sog > 2) ? 700 : STILL_M;
      if (since) s.at = { lat, lon, t: since };
      else if (!s.at || metres(s.at.lat, s.at.lon, lat, lon) > swing) s.at = { lat, lon, t };
      if (s.cached) { s.cached = false; s.jump = true; } // the first news after the stored table: no long glide from where it was then
    }

    /* Settings: types shown, the stationary threshold, "only stationary" */
    const KEY = 'psarema-live-ships-v1', S = { sel: ['all'], dwell: 3, only: false };
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o) { if (Array.isArray(o.sel) && o.sel.length) S.sel = o.sel; if (DWELL.includes(o.dwell)) S.dwell = o.dwell; S.only = !!o.only; } } catch {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
    const stillMs = s => s.at ? s.t - s.at.t : 0; // known, not assumed: from its first report at this spot to its latest
    const preTrack = s => s.at && s.at.t <= s.first + 60e3; // already settled when first picked up: when it got there is unknown
    const reportsStill = s => (s.nav === 1 || s.nav === 5) && !(s.sog > 1);
    const isStill = s => stillMs(s) >= S.dwell * 3600e3 || reportsStill(s);
    // Fishing now: the ship says so (navigational status 7, "engaged in fishing"), or it is a fishing vessel (AIS type 30) at the speed
    // trawls, longlines and trolling run at, 1.5-5 kn (a fishing boat at 8+ kn is going somewhere). 'yes' | 'likely' | ''.
    const fishingNow = s => s.nav === 7 ? 'yes' : s.type === 30 && s.sog >= 1.5 && s.sog <= 5 && Date.now() - s.t < FADE ? 'likely' : '';
    // Dead reckoning: a moving ship drawn where its last speed and course put it now, for up to DR_MAX after the report (class B ships
    // report every 30 s to 3 min), so it glides instead of jumping between reports.
    const DR_MAX = 180e3;
    function posNow(s) {
      const a = Math.min(Date.now() - s.t, DR_MAX) / 1e3;
      if (!(s.sog > .5) || s.cog == null || a <= 0) return [s.lat, s.lon];
      const d = s.sog * .514444 * a, r = s.cog * Math.PI / 180;
      return [s.lat + d * Math.cos(r) / 111195, s.lon + d * Math.sin(r) / (111195 * Math.cos(s.lat * Math.PI / 180))];
    }
    // A ship that is not moving stays where it is: shown (faded once stale) for HIDE_STILL after its last report, as coverage here is
    // patchy (some anchored ships are heard every 20-40 min). A moving one is hidden after HIDE: by then its position is a guess.
    const HIDE_STILL = 6 * 3600e3, moving = s => s.sog > 1 && !reportsStill(s);
    const shown = s => s.lat != null && Date.now() - s.t < (moving(s) ? HIDE : HIDE_STILL) && (S.sel.includes('all') || S.sel.includes(catOf(s.type))) && (!S.only || isStill(s));

    /* Map: trails in a canvas under the spots (no taps), ships over them */
    map.createPane('livetrails').style.zIndex = 429; map.getPane('livetrails').style.pointerEvents = 'none';
    map.createPane('liveships').style.zIndex = 435; // over the spots (430), under the place labels (640)
    const trailR = L.canvas({ pane: 'livetrails' });
    const group = L.layerGroup([], { attribution: 'Live AIS: <a href="https://aisstream.io" target="_blank" rel="noopener">aisstream.io</a>' });
    const SHIP = '<svg viewBox="-12 -12 24 24" aria-hidden="true"><path class="ls-s-arrow" d="M0-10 7 9 0 5-7 9z"/><path class="ls-s-hull" d="M0-10C4-7 4.5-2 4.5 2v7h-9V2c0-4 .5-9 4.5-12z"/><circle class="ls-s-dot" r="4.5"/></svg>';
    const sizeOf = s => s.len >= 120 ? 30 : s.len >= 40 ? 25 : s.len > 0 ? 20 : 23; // bigger ships, bigger marks (length unknown: between)
    const icon = z => L.divIcon({ className: 'ls-ship', html: `<i>${SHIP}</i>`, iconSize: [z, z] });
    const fadeIn = el => el?.animate?.([{ opacity: 0, offset: 0 }], { duration: 450, easing: 'ease-out' }); // up to its own opacity (stale ones stay dim)
    // Battery: only ships inside the view (plus a margin, vb) have a marker; a marker moves only once it is a pixel or more off (ppm: pixels
    // per metre at this zoom) and glides (CSS transition) only for steps of GLIDE_PX or more, smaller ones step (a 3 s glide of under a pixel
    // kept the screen compositing at 60 fps); the DOM is written only when a ship's look changed.
    const GLIDE_PX = 4;
    let vb = null, ppm = 0;
    const view = () => { vb = map.getBounds().pad(.25); ppm = 2 ** (map.getZoom() + 8) / (40075016.686 * Math.cos(35 * Math.PI / 180)); };
    const unmark = s => { if (s.mk) { group.removeLayer(s.mk).removeLayer(s.ln); s.mk = s.ln = s.look = null; } };
    function draw(s) {
      const at = shown(s) && posNow(s);
      if (!at || !vb.contains(at)) { unmark(s); return; }
      const c = COLOR[catOf(s.type)], z = sizeOf(s);
      if (!s.mk) {
        s.mk = L.marker(at, { pane: 'liveships', icon: icon(z) }).on('click', () => openCard(s.mmsi))
          .bindTooltip(() => esc(`${s.name || 'MMSI ' + s.mmsi} · ${typeName(s)}`), { direction: 'top', offset: [0, -z / 2] });
        s.ln = L.polyline([], { renderer: trailR, interactive: false, weight: 2, opacity: .6 });
        group.addLayer(s.ln).addLayer(s.mk);
        Object.assign(s, { dr: at, tn0: -1, dir: null, glide: false, z, jump: false }); // dr: where the marker is drawn
        fadeIn(s.mk.getElement());
      } else if (z !== s.z) { s.mk.setIcon(icon(s.z = z)); s.look = s.dir = null; s.glide = false; } // its length came in: a fresh element
      const el = s.mk.getElement(), px = metres(s.dr[0], s.dr[1], at[0], at[1]) * ppm;
      if (px >= 1) {
        const g = px >= GLIDE_PX && !s.jump; // a jump (the stored table -> live): straight there with a fade, not a long slide
        if (el && g !== s.glide) el.classList.toggle('ls-glide', s.glide = g);
        s.mk.setLatLng(at); s.dr = at;
        if (s.jump && px >= GLIDE_PX) fadeIn(el);
      }
      s.jump = false;
      if (s.trail.length > 1 && (px >= 1 || s.tn0 !== s.tn)) { s.tn0 = s.tn; s.ln.setLatLngs([...s.trail, s.dr]); }
      if (!el) return;
      const dir = s.hdg ?? (s.sog > .5 ? s.cog : null);
      if (dir != null && dir !== s.dir) { s.dir = dir; s.rot = s.rot == null ? dir : s.rot + ((dir - s.rot) % 360 + 540) % 360 - 180; el.firstChild.style.transform = `rotate(${s.rot}deg)`; } // the short way round
      const shape = dir == null ? 'dot' : s.sog > .5 ? 'arrow' : 'hull', still = isStill(s), fish = !!fishingNow(s), stale = Date.now() - s.t > FADE, label = s.name || 'MMSI ' + s.mmsi;
      const look = [c, shape, still, fish, stale, s.mmsi === openId, !!s.mock, label].join('|');
      if (look === s.look) return;
      s.look = look; s.ln.setStyle({ color: c });
      el.style.setProperty('--c', c);
      el.dataset.shape = shape;
      el.classList.toggle('ls-still', still);
      el.classList.toggle('ls-fish', fish);
      el.classList.toggle('ls-stale', stale);
      el.classList.toggle('ls-sel', s.mmsi === openId);
      el.classList.toggle('ls-mock', !!s.mock);
      el.setAttribute('aria-label', label);
    }
    let flushT = 0;
    const queue = () => { flushT ||= setTimeout(flush, 400); }; // a burst of messages = one redraw
    function flush() {
      clearTimeout(flushT); flushT = 0;
      if (document.hidden) return; // in the background: the table keeps up, the map waits (sweep on return)
      if (map.hasLayer(group)) { for (const id of dirty) { const s = ships.get(id); if (s) draw(s); } refreshCard(); }
      dirty.clear(); drawStatus();
    }
    function sweep() { // stale, stationary and hidden change with time alone
      const now = Date.now();
      for (const [id, s] of ships) if (now - s.t > FORGET) { unmark(s); ships.delete(id); }
      for (const s of ships.values()) draw(s);
      refreshCard(); drawStatus(); store();
    }
    // The table in localStorage, so the next time the layer comes on its ships are drawn at once; the relay's snapshot then replaces it.
    // Real ships only, none older than FORGET (12 h, as the relay keeps them), trails cut to their last points.
    const TKEY = 'psarema-live-ships-table-v1', DROP = new Set(['mk', 'ln', 'dr', 'tn0', 'dir', 'glide', 'look', 'rot', 'z', 'bad', 'old', 'jump', 'cached']);
    function store() {
      const list = [...ships.values()].filter(s => s.lat != null && !s.mock);
      if (list.length) try { localStorage.setItem(TKEY, JSON.stringify({ feed: FEED, list }, (k, v) => DROP.has(k) ? undefined : k === 'trail' ? v.slice(-8) : v)); } catch {}
    }
    function restore() {
      try {
        const c = JSON.parse(localStorage.getItem(TKEY)), now = Date.now(); if (c?.feed !== FEED) return;
        for (const s of c.list) if (!ships.has(s.mmsi) && now - s.t < FORGET) ships.set(s.mmsi, Object.assign(s, { cached: true }));
      } catch {}
    }
    const mc = map.getContainer(); // no gliding while the map zooms or jumps (pinch, setView): the markers go straight to their new pixels
    map.on('zoomstart viewreset', () => { if (map.hasLayer(group)) mc.classList.add('ls-zooming'); }); // layer off: no class, so no forced layout at every zoom's end below
    map.on('moveend', () => { if (mc.classList.contains('ls-zooming')) { void mc.offsetWidth; mc.classList.remove('ls-zooming'); } }); // styled first, then glide again
    let panning = false, moveT = 0; // no glide steps while the map moves; ships coming into view get their markers on the way (not mid-zoom)
    map.on('movestart', () => { panning = true; });
    map.on('move', () => { if (!moveT && map.hasLayer(group)) moveT = setTimeout(() => { moveT = 0; if (panning && !mc.classList.contains('ls-zooming')) { view(); for (const s of ships.values()) if (!s.mk) draw(s); } }, 150); });
    map.on('moveend', () => { panning = false; if (map.hasLayer(group)) { view(); redrawAll(); } });

    /* The card: phones in the sheet (ui.js openSpot does the same), wide screens in a popup that follows the ship */
    let openId = 0, pop = null;
    function openCard(id) {
      const s = ships.get(id); if (!s) return;
      const was = ships.get(openId); openId = id; if (was?.mk) draw(was); draw(s);
      if (isPhone() && window.PsMobile) PsMobile.showHtml(cardHtml(s));
      else {
        const left = typeof railOpen !== 'undefined' && railOpen ? 350 : 20; // clear of the side rail (as ui.js's spot card)
        pop = L.popup({ className: 'ls-pop', maxWidth: 300, minWidth: 280, autoPanPaddingTopLeft: [left, 90], autoPanPaddingBottomRight: [60, 20] }).setLatLng(posNow(s)).setContent(cardHtml(s)).openOn(map);
        pop.once('remove', () => { if (openId === id) { openId = 0; if (s.mk) draw(s); } });
      }
      photo(s);
    }
    function refreshCard() { // the open card's facts follow the ship
      const card = openId && document.querySelector(`.ls-card[data-mmsi="${openId}"]`), s = ships.get(openId);
      if (!card || !s) { if (openId) { openId = 0; if (s?.mk) draw(s); } return; }
      const f = facts(s); if (card.f !== f) card.querySelector('.ls-facts').innerHTML = card.f = f;
      if (pop?.isOpen()) pop.setLatLng(posNow(s));
    }
    const cardHtml = s => `<div class="ls-card" data-mmsi="${s.mmsi}" style="--c:${COLOR[catOf(s.type)]}"><div class="ls-photo">${art(catOf(s.type))}</div>
<div class="ls-head"><b>${esc(s.name || 'MMSI ' + s.mmsi)}</b><span class="ls-type">${esc(typeName(s))}</span>${s.mock ? `<span class="ls-test">${esc(tr('ls_test'))}</span>` : ''}</div>
<div class="ls-facts">${facts(s)}</div><small class="ls-src">${esc(tr(s.mock ? 'ls_srcMock' : 'ls_src'))}</small></div>`;
    function facts(s) { // the key numbers in a strip (speed, stationary for), the rest in rows
      const row = (k, v, hl) => v ? `<dt>${esc(tr(k))}</dt><dd${hl ? ' class="ls-hl"' : ''}>${esc(v)}</dd>` : '';
      const cell = (k, v, sub, hl) => `<div${hl ? ' class="ls-hl"' : ''}><small>${esc(tr(k))}</small><b>${esc(v)}</b><span>${esc(sub)}</span></div>`;
      const here = stillMs(s) >= 5 * 60e3, still = isStill(s), fish = fishingNow(s), mov = s.cog != null && s.sog > .5;
      // Stationary for: exact, from its own reports (its first one at this spot to its latest), and only for a ship that stopped while
      // tracked. One already settled when first picked up: when it got there is unknown (no free source keeps older AIS), so no time.
      return `<div class="ls-stats">${cell('ls_speed', s.sog != null ? `${nf(s.sog)} ${tr('ls_kn')}` : '–', mov ? `${Math.round(s.cog)}° ${compass(s.cog)}` : '')}` +
        (here && !preTrack(s) ? cell('ls_here', dur(stillMs(s)), tr('ls_sinceT', whenT(s.at.t)), still) : '') +
        '</div><dl>' +
        row('ls_flag', flagOf(s.mmsi)) +
        row('ls_size', s.len ? `${s.len}${s.beam ? ' × ' + s.beam : ''} m${s.draught ? ` · ${nf(s.draught)} m` : ''}` : '') +
        row('ls_status', tr('ls_nav')[s.nav] || '', still && reportsStill(s)) +
        row('ls_act', fish ? tr(fish === 'yes' ? 'ls_fishYes' : 'ls_fishLikely') : '', !!fish) +
        row('ls_stayed', here && preTrack(s) ? tr('ls_pre', whenT(s.first)) : '') +
        row('ls_dest', s.dest) +
        row('ls_seen', `${ago(Date.now() - s.t)} · ${hm(new Date(s.t))}`) +
        row('ls_ids', [`MMSI ${s.mmsi}`, s.imo && `IMO ${s.imo}`, s.call && `${tr('ls_call')} ${s.call}`].filter(Boolean).join(' · ')) + '</dl>';
    }
    // A drawing of the ship type (side view, bow to the right, on the waterline), until or instead of a photo
    const ART = {
      cargo: '<path class="h" d="M6 42H154L146 60H16Z"/><path class="c1" d="M44 30h18v12H44zM84 30h18v12H84zM124 33h16v9h-16z"/><path class="c2" d="M64 30h18v12H64zM104 30h18v12h-18zM44 22h18v8H44zM104 22h18v8h-18z"/><path class="s" d="M14 18h22v24H14z"/><path class="d" d="M16 22h18v3H16zM20 10h8v8h-8z"/>',
      tanker: '<path class="h" d="M6 44H154L146 60H16Z"/><path class="k" d="M40 41h104M140 28v13"/><path class="d" d="M88 36h6v5h-6zM14 24h20v3H14zM17 12h9v8h-9z"/><path class="s" d="M12 20h24v4H12zM12 27h24v17H12z"/>',
      passenger: '<path class="h" d="M8 42H152L142 60H18Z"/><path class="s" d="M24 34h112l-6 8H24zM32 26h92l-6 8H32zM42 18h68l-5 8H42z"/><path class="k w" d="M28 38h100M36 30h84M46 22h58"/><path class="h" d="M62 8h14l-3 10H64z"/>',
      fishing: '<path class="h" d="M28 44H136L126 60H38Z"/><path class="s" d="M96 30h22v14H96z"/><path class="d" d="M99 33h16v3H99zM34 28h4v16h-4zM50 28h4v16h-4zM34 28h20v3H34z"/><path class="k" d="M106 12v18M106 14 70 34M106 14l38 20"/>',
      pleasure: '<path class="h" d="M36 48H128L118 60H48Z"/><path class="s" d="M60 42h30l-4 6H60zM82 9v35H48zM86 11v33h36z"/><path class="k" d="M84 6v42"/>',
      other: '<path class="h" d="M28 44H136L124 60H38Z"/><path class="k f" d="M30 47h104"/><path class="s" d="M74 22h28v22H74z"/><path class="d" d="M77 26h22v4H77zM60 26h9v18h-9z"/><path class="k" d="M88 8v14"/>',
    };
    const art = c => `<svg class="ls-art" viewBox="0 0 160 72" aria-hidden="true"><defs><linearGradient id="ls-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient></defs>` +
      `${ART[c]}<path d="${ART[c].match(/d="([^"]+)"/)[1]}" fill="url(#ls-shade)"/><rect class="sea" y="56" width="160" height="16"/></svg>`;

    /* Photos: Wikimedia Commons, which files ship photos under "Category:IMO <number>" -> "<Name> (ship, <year>)". By IMO: that category's
       files, else those of the ship category under it (the one with the ship's present name, if any), files named after the IMO number or the
       ship first; failing a file so named, files that mention "IMO <number>". No IMO: the one category named exactly "<NAME> (ship, …)"
       (two ships of that name: no guess). Anonymous CORS (origin=*), identified by Api-User-Agent, cacheable answers (maxage), one lookup per
       tapped ship, remembered for 7 days (no photo: 1 day) in localStorage. */
    const PKEY = 'psarema-ship-photos-v1', API = 'https://commons.wikimedia.org/w/api.php';
    let cache = {}; try { cache = JSON.parse(localStorage.getItem(PKEY)) || {}; } catch {}
    const pending = new Map();
    async function commons(params) {
      const r = await fetch(API + '?' + new URLSearchParams({ action: 'query', format: 'json', formatversion: 2, origin: '*', maxage: 86400, smaxage: 86400, ...params }), { headers: { 'Api-User-Agent': PHOTO_UA } });
      if (!r.ok) throw new Error('Commons ' + r.status);
      return (await r.json()).query || {};
    }
    const II = { prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: 640, iiextmetadatafilter: 'Artist|LicenseShortName' };
    const text = html => clean(new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent); // Commons' credit is HTML: text only
    function pick(q, s) { // a file named after the IMO number or the ship is a portrait of it more often than not (an aerial view of a port is not)
      const score = p => (s.imo && p.title.includes('IMO ' + s.imo) ? 2 : 0) + (s.name && p.title.toUpperCase().includes(s.name.toUpperCase()) ? 1 : 0);
      const p = (q.pages || []).filter(p => /^image\/(jpeg|png|webp)$/.test(p.imageinfo?.[0]?.mime)).sort((a, b) => score(b) - score(a) || (a.index ?? 0) - (b.index ?? 0))[0];
      if (!p) return null;
      const ii = p.imageinfo[0], md = ii.extmetadata || {};
      return { src: ii.thumburl || ii.url, page: ii.descriptionurl, by: text(md.Artist?.value).slice(0, 80), lic: text(md.LicenseShortName?.value), title: p.title.replace(/^File:|\.\w+$/g, ''), score: score(p) };
    }
    async function lookup(s) {
      let cat = null;
      if (s.imo) {
        const m = (await commons({ list: 'categorymembers', cmtitle: `Category:IMO ${s.imo}`, cmtype: 'file|subcat', cmlimit: 20 })).categorymembers || [];
        const subs = m.filter(x => x.ns === 14 && /\(ship, \d{4}\)$/.test(x.title)), nm = (s.name || '').toUpperCase();
        cat = m.some(x => x.ns === 6) ? `Category:IMO ${s.imo}` : (subs.find(x => nm && x.title.toUpperCase().startsWith('CATEGORY:' + nm + ' (')) || subs[0])?.title;
      } else if (s.name) {
        const q = s.name.replace(/"/g, ''), want = 'CATEGORY:' + q.toUpperCase() + ' (SHIP, ';
        const hits = ((await commons({ list: 'search', srnamespace: 14, srlimit: 10, srsearch: `intitle:"${q}" intitle:ship` })).search || []).filter(x => x.title.toUpperCase().startsWith(want) && /\(ship, \d{4}\)$/.test(x.title));
        if (hits.length === 1) cat = hits[0].title;
      }
      let r = cat ? pick(await commons({ generator: 'categorymembers', gcmtitle: cat, gcmtype: 'file', gcmlimit: 20, ...II }), s) : null;
      if (!r?.score && s.imo) { const f = pick(await commons({ generator: 'search', gsrnamespace: 6, gsrlimit: 8, gsrsearch: `"IMO ${s.imo}"`, ...II }), s); if (f && (!r || f.score > r.score)) r = f; }
      return r;
    }
    function photo(s) {
      const key = s.imo ? 'imo' + s.imo : s.name && !s.mock ? 'name:' + s.name : ''; // test ships: only their (real) IMO numbers are looked up
      if (!key) return;
      const hit = cache[key];
      if (hit && Date.now() - hit[0] < (hit[1] ? 7 : 1) * 864e5) { showPhoto(s.mmsi, hit[1]); return; }
      if (!pending.has(key)) pending.set(key, lookup(s).then(r => {
        cache[key] = [Date.now(), r]; const ks = Object.keys(cache); for (const k of ks.slice(0, ks.length - 300)) delete cache[k];
        try { localStorage.setItem(PKEY, JSON.stringify(cache)); } catch {}
        return r;
      }, e => { console.warn('Ship photo:', e.message); return null; }).finally(() => pending.delete(key)));
      pending.get(key).then(r => showPhoto(s.mmsi, r));
    }
    function showPhoto(id, r) { // over the drawing, once it has loaded (the card keeps its height: the phone sheet sized itself to it)
      if (!r) return;
      const img = Object.assign(new Image(), { alt: r.title, decoding: 'async', className: 'ls-img' });
      img.onload = () => {
        const box = document.querySelector(`.ls-card[data-mmsi="${id}"] .ls-photo`); if (!box || box.querySelector('.ls-img')) return;
        box.append(img);
        box.insertAdjacentHTML('beforeend', `<a class="ls-credit" href="${esc(r.page)}" target="_blank" rel="noopener noreferrer" title="${esc(r.title)}">${esc(tr('ls_photo', r.by || '?', r.lic))}</a>`);
      };
      img.src = r.src;
    }

    /* Layers popover: the checkbox in the Ships group, type chips (as Ship traffic's, with the colours), the stationary filter, the feed's state */
    const chip = k => `<button type="button" data-k="${k}">${k === 'all' ? '' : `<i class="ls-dot" style="background:${COLOR[k]}"></i>`}<span></span></button>`;
    $('#lay-ships').insertAdjacentHTML('beforeend', `<label><input type="checkbox" id="lay-liveships"><i class="sw ls-sw"></i> <span data-i18n="l_liveships">${tr('l_liveships')}</span> <span class="num" id="n-liveships">AIS</span></label>
<div class="ls-panel" id="ls-panel" hidden><div class="chips" id="ls-kind">${['all', ...CATS].map(chip).join('')}</div>
<div class="ls-row"><label><input type="checkbox" id="ls-only"> <span data-i18n="ls_only">${tr('ls_only')}</span></label><select id="ls-dwell" data-i18n-aria="ls_dwell" aria-label="${esc(tr('ls_dwell'))}"></select></div>
<p class="ls-key"><i class="ls-ring"></i><span id="ls-key"></span></p><p class="ls-status" id="ls-status" role="status" hidden></p></div>
<p class="ls-need" id="ls-need" hidden><span data-i18n="ls_need">${tr('ls_need')}</span> <button type="button" id="ls-help" data-i18n="ls_seeHelp">${tr('ls_seeHelp')}</button></p>`);
    const box = $('#lay-liveships'), panel = $('#ls-panel'), kind = $('#ls-kind'), only = $('#ls-only'), dwellSel = $('#ls-dwell'), stat = $('#ls-status');
    map.getContainer().insertAdjacentHTML('beforeend', '<div class="ls-testfeed" hidden></div>'); // on the map while the TEST feed is shown
    const badge = mc.lastElementChild;
    function drawPanel() {
      box.disabled = !FEED; $('#ls-need').hidden = !!FEED; panel.hidden = !box.checked;
      for (const b of kind.querySelectorAll('[data-k]')) { b.setAttribute('aria-pressed', S.sel.includes(b.dataset.k)); b.lastChild.textContent = tr('vs_' + b.dataset.k); }
      dwellSel.innerHTML = DWELL.map(h => `<option value="${h}"${h === S.dwell ? ' selected' : ''}>${esc(tr('ls_h', h))}</option>`).join('');
      only.checked = S.only; $('#ls-key').textContent = tr('ls_ringKey', tr('ls_h', S.dwell));
      drawStatus();
    }
    let ws = null, conn = 'off', tries = 0, retryT = 0, retryIn = 0, hideT = 0, sweepT = 0, glideT = 0;
    function drawStatus() {
      const on = map.hasLayer(group); let n = 0, fishN = 0;
      if (on) for (const s of ships.values()) if (shown(s)) { n++; if (fishingNow(s)) fishN++; } // on the map, in view or not
      setText($('#n-liveships'), on && conn === 'live' ? String(n) : 'AIS');
      let txt = '', cls = '';
      if (on && feed.error) { txt = tr('ls_err', feed.error); cls = 'is-bad'; }
      else if (on && conn === 'connecting') txt = tr('ls_connecting');
      else if (on && conn === 'retry') { txt = tr('ls_retry', retryIn); cls = 'is-bad'; }
      else if (on && conn === 'live') { txt = feed.last ? tr('ls_live', n, ago(Date.now() - feed.last)) + (fishN ? ' · ' + tr('ls_fishN', fishN) : '') : tr('ls_wait'); cls = 'is-live'; }
      if (on && feed.mock) { txt = `${tr('ls_mock')} · ${txt}`; cls += ' is-mock'; }
      setText(stat, txt); stat.className = 'ls-status ' + cls; stat.hidden = !txt;
      badge.hidden = !(on && feed.mock); setText(badge, tr('ls_mock'));
    }
    const setText = (el, v) => { if (el.textContent !== v) el.textContent = v; }; // an unchanged text is not rewritten
    const redrawAll = () => { if (map.hasLayer(group)) { for (const s of ships.values()) draw(s); drawStatus(); } };
    kind.addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k, on = S.sel.includes(k);
      S.sel = k === 'all' ? ['all'] : on ? S.sel.filter(t => t !== k) : [...S.sel.filter(t => t !== 'all'), k];
      if (!S.sel.length) S.sel = ['all'];
      save(); drawPanel(); redrawAll();
    });
    only.addEventListener('change', () => { S.only = only.checked; save(); redrawAll(); });
    dwellSel.addEventListener('change', () => { S.dwell = +dwellSel.value; save(); drawPanel(); redrawAll(); refreshCard(); });
    $('#ls-help').addEventListener('click', openHelp);
    $('#lang').addEventListener('click', () => { drawPanel(); refreshCard(); }); // after js/ui.js applyLang

    /* The feed: open while the layer is on and the page is visible (a phone in a pocket stops after 2 min); back off 2 s … 60 s when it drops */
    function connect() {
      if (ws || !FEED || !map.hasLayer(group) || document.hidden) return;
      clearTimeout(retryT); conn = 'connecting'; drawStatus();
      try { ws = new WebSocket(FEED); } catch (e) { conn = 'off'; feed.error = e.message; drawStatus(); return; }
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => { tries = 0; conn = 'live'; ws.send(JSON.stringify(SUB)); drawStatus(); }; // the relay ignores it (its box is fixed); the TEST feed wants one
      ws.onmessage = e => {
        feed.last = Date.now(); let m; try { m = JSON.parse(typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data)); } catch { return; }
        const snap = Array.isArray(m) && m[0]?.MessageType === 'Hello'; // the relay's snapshot: what it knows now replaces the table
        if (snap) for (const s of ships.values()) s.old = true;
        onMsg(m);
        if (!snap) return queue();
        for (const [id, s] of ships) if (s.old) { unmark(s); ships.delete(id); } // gone since the stored table (or a dropped connection)
        flush(); // drawn at once, not after the 0.4 s that gathers a burst
      };
      ws.onclose = () => {
        ws = null;
        if (!map.hasLayer(group) || document.hidden) { conn = 'off'; drawStatus(); return; }
        retryIn = Math.min(60, 2 * 2 ** tries++); conn = 'retry'; drawStatus(); retryT = setTimeout(connect, retryIn * 1e3);
      };
    }
    function disconnect() { clearTimeout(retryT); if (ws) { ws.onclose = null; ws.close(1000); ws = null; } conn = 'off'; drawStatus(); }
    // Timers run only while the layer is on and the page is visible; in the background the feed still closes after 2 min
    function timers(on) { clearInterval(sweepT); clearInterval(glideT); sweepT = glideT = 0; if (on) { sweepT = setInterval(sweep, 30e3); glideT = setInterval(glide, 3e3); } }
    document.addEventListener('visibilitychange', () => {
      clearTimeout(hideT);
      if (document.hidden) { hideT = setTimeout(disconnect, 120e3); timers(false); if (map.hasLayer(group)) store(); }
      else { connect(); if (map.hasLayer(group)) { timers(true); sweep(); dirty.clear(); } }
    });
    const stage = document.querySelector('.stage');
    const glide = () => { // dead reckoning, every 3 s: not while the map moves or the full sheet or a page covers it (phones); the open card keeps counting
      if (!panning && !stage?.classList.contains('m-full') && !(isPhone() && stage?.classList.contains('paged'))) for (const s of ships.values()) if (s.mk && s.sog > .5 && Date.now() - s.t < DR_MAX + 4e3) draw(s);
      refreshCard();
    };
    group.on('add', () => { if (!ships.size) restore(); view(); connect(); redrawAll(); timers(!document.hidden); drawPanel(); });
    group.on('remove', () => { disconnect(); timers(false); store(); if (pop) map.closePopup(pop); drawPanel(); });

    /* Register with the app's layer switch (js/ui.js applyLayer; js/app.js applies saved layers at start). Without a relay the box stays off. */
    LAYER_OBJ.liveships = () => FEED ? group : null;
    box.checked = !!(FEED && state.layers.liveships);
    box.addEventListener('change', () => { state.layers.liveships = box.checked; applyLayer('liveships'); savePrefs(); drawPanel(); });
    drawPanel();
    window.PsLiveShips = { ships, lookup };
  }
}
