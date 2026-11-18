// Psarema: which rods and gear to use in each fishing area (ids of data/areas.js), per method, ranked "best" and "also works".
// Rendered by js/area-gear.js (window.PsAreaGear.html(areaId, mode)).
//
// facts: computed 2026-10-24 from the app's own layers, 250 m cells of each area (nearest centre within r):
//   coast  = coast type of the sea cells touching land (data/access.js, OSM + EMODnet), % of the mapped coast ("unknown" cells left out);
//   d10..d100 = median distance (km) from land to the 10/20/50/100 m depth line (data/terrain.js, EMODnet DTM);
//   drop   = median km from the waterline to the nearest mapped drop-off (slope >= 8°, 3–300 m deep), null = none within ~10 km;
//   pos / rock = mean Posidonia / rock-reef cover of the 0–40 m seabed (EMODnet Seabed Habitats, CY005001).
// targets: [species id (data/species*.js), first month, last month] — from species depth/habitat/season data matched to the area, and the sources.
// gear: catalogue ids (data/gear-catalog.js). src: key into PSAREMA_AREA_GEAR_SOURCES, 'data' = the facts above; no src = general practice.
window.PSAREMA_AREA_GEAR_SOURCES = {
  fbblog: { t: 'FishingBooker – Fishing in Cyprus', u: 'https://fishingbooker.com/blog/fishing-in-cyprus/' },
  dom: { t: 'DOM – Fishing in Cyprus', u: 'https://dom.com.cy/en/live/blog/fishing-in-cyprus/' },
  alllim: { t: 'All About Limassol – Fishing by the shore', u: 'https://allaboutlimassol.com/en/fishing-by-the-shore' },
  fwg: { t: 'Fishing World Guide – Fishing in Cyprus', u: 'https://www.fishingworldguide.com/en/blog/angeln-in-zypern' },
  zygi: { t: 'Zygi community – fishing village', u: 'https://zygi.com/en/?p=930' },
  safari: { t: 'FishingBooker – Akamas inshore charter (Peyia/Polis)', u: 'https://fishingbooker.com/charters/view/49787' },
  tui: { t: 'TUI – Deep sea fishing trip, Ayia Napa/Protaras', u: 'https://www.tui.co.uk/things-to-do/ayia-napa/deep-sea-fishing-boat-trip-9-122974/' },
  chapel: { t: 'Duikersgids – Chapel dive site, Cape Greco', u: 'https://www.duikersgids.nl/en/dive-spots/chapel' },
  zenobia: { t: 'Scubaverse – Zenobia wreck', u: 'https://scubaverse.com/zenobia-wreck-recognised-as-an-important-source-of-income-for-cyprus/' },
  ladysmile: { t: 'Visit Cyprus – Lady’s Mile Beach', u: 'https://www.visitcyprus.com/discover-cyprus/sun-sea/beaches/lady-s-mile-beach/' },
  relion: { t: 'LIFE RELIONMED – lionfish removal, Cyprus', u: 'https://webgate.ec.europa.eu/life/publicWebsite/project/LIFE16-NAT-CY-000832/preventing-a-lionfish-invasion-in-the-mediterranean-through-early-response-and-targeted-removal' },
  kdp: { t: 'Fisheries Regulations KDP 416/2019 and MPA orders (cylaw.org; see the map’s protected zones)', u: 'http://www.cylaw.org/KDP/data/2019_1_416.pdf' },
  farms: { t: 'Dempster et al. 2002 – wild fish at Mediterranean fish farms', u: 'https://int-res.com/abstracts/meps/v242/p237-252/' },
  data: { t: 'Psarema seabed and coast layers (EMODnet Bathymetry & Seabed Habitats, OpenStreetMap, EEA)', u: '' },
};

window.PSAREMA_AREA_GEAR = {
  /* ------------------------------------------------------------------ Pomos – Kato Pyrgos */
  pomos: {
    facts: { coast: { beach: 47, rocky: 24, made: 10, port: 0, mil: 19 }, d10: 0.36, d20: 0.9, d50: 1.4, d100: 1.9, drop: 1.1, pos: 59, rock: 5 },
    character: {
      en: 'North-facing Tylliria coast: pebble and sand coves between rocky points, with fishing shelters at Pomos and Kato Pyrgos. The seabed drops faster than almost anywhere in the west — 20 m under 1 km out, 100 m about 2 km out — over dense Posidonia. Exposed to northerly and westerly winds; calm in southerlies.',
      el: 'Βόρεια ακτή της Τηλλυρίας: κολπίσκοι με βότσαλο και άμμο ανάμεσα σε βραχώδη ακρωτήρια, με αλιευτικά καταφύγια στον Πωμό και στον Κάτω Πύργο. Ο βυθός βαθαίνει πιο γρήγορα από σχεδόν οπουδήποτε στη δύση — 20 μ. σε λιγότερο από 1 χλμ., 100 μ. περίπου στα 2 χλμ. — πάνω από πυκνή ποσειδωνία. Εκτεθειμένη σε βοριάδες και δυτικούς· ήρεμη με νοτιάδες.' },
    avoid: {
      en: 'Military: the Kokkina enclave between Pachyammos and Kato Pyrgos and the buffer zone east of Kato Pyrgos — no access by land or sea. The Oceanid Natura 2000 site covers this coast (no fishing ban confirmed).',
      el: 'Στρατιωτικές ζώνες: ο θύλακας των Κοκκίνων ανάμεσα σε Πάχυαμμο και Κάτω Πύργο και η νεκρή ζώνη ανατολικά του Κάτω Πύργου — καμία πρόσβαση από στεριά ή θάλασσα. Η ακτή ανήκει στην περιοχή Natura 2000 «Oceanid» (δεν έχει επιβεβαιωθεί απαγόρευση αλιείας).' },
    sources: ['dom', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['sargos', 10, 4], ['tsipoura', 10, 2], ['melanouri', 4, 10], ['squid', 11, 3], ['bluefish', 10, 1], ['leerfish', 9, 12]],
        best: [
          { gear: 'spinning_rod', spec: '2.7–3 m · 10–40 g', src: 'data', why: { en: 'Deep water within a cast of the points: minnows and casting jigs for bluefish and leerfish at first light.', el: 'Βαθιά νερά σε απόσταση βολής από τα ακρωτήρια: ψαράκια και jig ρίψης για γοφάρι και λίτσα με το πρώτο φως.' } },
          { gear: 'bolognese_rod', spec: '5–6 m', why: { en: 'Float in the foam off the shelter breakwaters and rocky points for white and saddled seabream.', el: 'Φελλός στον αφρό στους κυματοθραύστες του καταφυγίου και στα βράχια για σορκό και μελάνα.' } },
          { gear: 'eging_rod', spec: '2.4–2.6 m · egi 2.5–3.0', src: 'data', why: { en: 'Squid come close where deep water meets the shore: dusk and dark, Nov–Mar.', el: 'Τα καλαμάρια πλησιάζουν εκεί που τα βαθιά φτάνουν στην ακτή: σούρουπο και νύχτα, Νοέ–Μαρ.' } },
          { gear: 'reel_spin_m', spec: '3000–4000', why: { en: 'One reel covers spinning and light casting here.', el: 'Ένα μηχανάκι καλύπτει spinning και ελαφρύ πεταχτάρι.' } },
          { gear: 'braid', spec: 'PE 0.8–1.2 + fluoro 0.30–0.40 mm', why: { en: 'Thin braid casts far; the fluoro leader survives the rocks.', el: 'Το λεπτό νήμα πετά μακριά· το fluoro παράμαλλο αντέχει στα βράχια.' } },
          { gear: 'minnow', spec: '9–12 cm', why: { en: 'Dawn and dusk along the points; sardine or silver colours.', el: 'Χαράματα και σούρουπο στα ακρωτήρια· χρώματα σαρδέλας ή ασημί.' } },
        ],
        also: [
          { gear: 'surf_rod', spec: '4–4.2 m · 80–150 g', src: 'data', why: { en: 'Pebble coves at night in winter for gilthead and white seabream; the bottom shelves fast, so no need for 200 g.', el: 'Κολπίσκοι με βότσαλο τη νύχτα τον χειμώνα για τσιπούρα και σορκό· ο βυθός βαθαίνει γρήγορα, δεν χρειάζονται 200 γρ.' } },
          { gear: 'lrf_rod', spec: '≤ 8 g', why: { en: 'Harbour walls at night: comber, painted comber and small bream on 2–5 g jig heads.', el: 'Τοίχοι λιμανιών τη νύχτα: χάννος, πέρκα και μικρά σπαροειδή με μολυβοκεφαλές 2–5 γρ.' } },
          { gear: 'casting_jig', spec: '20–40 g', why: { en: 'When bluefish or bonito break the surface off the points.', el: 'Όταν γοφάρια ή παλαμίδες χτυπούν στον αφρό μπροστά στα ακρωτήρια.' } },
          { gear: 'shrimp', why: { en: 'The all-round float bait for bream on the rocks.', el: 'Το δόλωμα για όλα τα σπαροειδή με φελλό στα βράχια.' } },
        ],
        tips: { en: 'Fish the rocky points and the shelter breakwaters in daylight; the open coves fish best at night in calm southerly weather. A northerly swell makes the low rocks dangerous.', el: 'Τη μέρα ψάρεψε τα βραχώδη ακρωτήρια και τους μόλους των καταφυγίων· οι ανοιχτοί κολπίσκοι αποδίδουν τη νύχτα με ήρεμο νοτιά. Με βόρεια φουσκοθαλασσιά τα χαμηλά βράχια είναι επικίνδυνα.' },
      },
      boat: {
        targets: [['dentex', 4, 10], ['porgy', 1, 4], ['pandora', 4, 8], ['grouper', 6, 10], ['amberjack', 6, 11], ['littletunny', 8, 11], ['dolphinfish', 9, 11]],
        best: [
          { gear: 'slow_jig_rod', spec: 'PE 1.5–2 · jigs 120–200 g', src: 'data', why: { en: 'Reef edges at 40–120 m only 2–3 km out: slow jigs for dentex, red porgy and groupers.', el: 'Άκρες ξέρας στα 40–120 μ., μόλις 2–3 χλμ. έξω: slow jig για συναγρίδα, φαγκρί και ορφό.' } },
          { gear: 'reel_conv', why: { en: 'Conventional reel for the slow-jig rod and for deep bottom drops.', el: 'Μηχανάκι τυμπάνου για το slow jigging και τα βαθιά ψαρέματα βυθού.' } },
          { gear: 'boat_rod', spec: '100–200 g sinker', why: { en: 'Drift the 30–80 m slope with shrimp or squid for pandora and red porgy.', el: 'Ντρίφτ στην κατωφέρεια 30–80 μ. με γαρίδα ή καλαμάρι για λυθρίνι και φαγκρί.' } },
          { gear: 'tai_rubber', spec: '60–120 g', why: { en: 'Steady drop-and-wind over the edges picks up porgy, pandora and dentex.', el: 'Σταθερό κατέβασμα και μάζεμα στις άκρες: φαγκρί, λυθρίνι, συναγρίδα.' } },
          { gear: 'trolling_rod', spec: 'feathers & skirts · 6–7 knots', why: { en: 'Little tunny and bonito run along the steep shelf in autumn; dolphinfish further out, Sep–Nov.', el: 'Καρβούνια και παλαμίδες κινούνται στην απότομη υφαλοκρηπίδα το φθινόπωρο· κυνηγοί πιο έξω, Σεπ–Νοέ.' } },
        ],
        also: [
          { gear: 'livebait_rig', why: { en: 'A bogue caught on a sabiki, fished over the drop-off for dentex and amberjack.', el: 'Γόππα από τσαπαρί, στην κατωφέρεια για συναγρίδα και μινέρι.' } },
          { gear: 'jigging_rod', spec: 'metal jigs 150–250 g', why: { en: 'Amberjack along the drop-off in summer–autumn.', el: 'Μινέρι στην κατωφέρεια καλοκαίρι–φθινόπωρο.' } },
          { gear: 'inchiku', spec: '80–150 g', why: { en: 'Bounced on rough bottom for comber, scorpionfish and groupers.', el: 'Χτυπητό σε τραχύ βυθό για χάννο, σκορπιό και ορφό.' } },
          { gear: 'sabiki', why: { en: 'Catch bogue and horse mackerel for live bait first.', el: 'Πρώτα γόππες και σαυρίδια για ζωντανό δόλωμα.' } },
        ],
        tips: { en: 'A short run from the Pomos shelter reaches deep water. Stay west of the Kokkina enclave and out of the buffer zone east of Kato Pyrgos; westerlies and northerlies raise a steep sea here.', el: 'Από το καταφύγιο του Πωμού φτάνεις γρήγορα στα βαθιά. Μείνε δυτικά του θύλακα των Κοκκίνων και έξω από τη νεκρή ζώνη ανατολικά του Κάτω Πύργου· με δυτικούς και βοριάδες σηκώνεται απότομος κυματισμός.' },
      },
      spear: {
        targets: [['sargos', 1, 12], ['octopus', 10, 5], ['grouper', 6, 10], ['parrotfish', 6, 10], ['greymullet', 5, 10], ['dentex', 5, 9]],
        best: [
          { gear: 'gun_band', spec: '90–100 cm', why: { en: 'North-coast water is clear in southerly weather: longer shots over Posidonia edges at 8–20 m.', el: 'Με νοτιά τα νερά της βόρειας ακτής καθαρίζουν: μακρύτερες βολές στις άκρες της ποσειδωνίας στα 8–20 μ.' } },
          { gear: 'spear_float', why: { en: 'Required, and boats from the shelters pass close to the points.', el: 'Υποχρεωτική, και τα σκάφη των καταφυγίων περνούν κοντά στα ακρωτήρια.' } },
        ],
        also: [
          { gear: 'gun_pneu', spec: '60–75 cm', why: { en: 'Short and handy in the holes at the base of the rocky points.', el: 'Κοντό και ευέλικτο στις τρύπες στη βάση των ακρωτηρίων.' } },
          { gear: 'gloves', why: { en: 'Rough rock, urchins and scorpionfish spines.', el: 'Τραχιά βράχια, αχινοί και αγκάθια σκορπιών.' } },
        ],
        tips: { en: 'Work the rocky points and the Posidonia–rock border at 5–20 m; with deep water so close, watch for passing amberjack and dentex. Keep 100 m from bathing areas and well away from the Kokkina military zone.', el: 'Δούλεψε τα βραχώδη ακρωτήρια και το όριο ποσειδωνίας–βράχου στα 5–20 μ.· με τόσο κοντινά βαθιά, πρόσεχε για περαστικά μινέρια και συναγρίδες. Κράτα 100 μ. από τις περιοχές λουομένων και μακριά από τη στρατιωτική ζώνη των Κοκκίνων.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Polis – Latchi */
  polis: {
    facts: { coast: { beach: 58, rocky: 19, made: 22, port: 0, mil: 0 }, d10: 0.63, d20: 1.4, d50: 2.1, d100: 3.1, drop: 2.5, pos: 51, rock: 3 },
    character: {
      en: 'Chrysochou Bay: long sand-and-pebble beaches at Polis and Argaka, Latchi harbour’s breakwaters, and rockier shore west towards the Baths of Aphrodite. The shelf is gentle — 10 m about 600 m out, 20 m ~1.4 km, 100 m ~3 km — over Posidonia and sand. Latchi is the main charter and dive port of the north-west.',
      el: 'Κόλπος Χρυσοχούς: μεγάλες παραλίες με άμμο και βότσαλο σε Πόλη και Αργάκα, οι κυματοθραύστες του λιμανιού του Λατσιού και πιο βραχώδης ακτή δυτικά προς τα Λουτρά της Αφροδίτης. Ήπια κλίση — 10 μ. περίπου στα 600 μ., 20 μ. ~1,4 χλμ., 100 μ. ~3 χλμ. — σε ποσειδωνία και άμμο. Το Λατσί είναι το κύριο λιμάνι για ναυλωμένα σκάφη και καταδύσεις στα βορειοδυτικά.' },
    avoid: {
      en: 'Chalavro MPA just west of Latchi: no fishing at all, not even with a rod from the shore, and no boats. Kakoskali MPA on the Akamas coast further west: no recreational fishing. Polis–Gialia Natura 2000 site (no fishing ban confirmed).',
      el: 'Θαλάσσια προστατευόμενη περιοχή Χαλαύρου, λίγο δυτικά του Λατσιού: καμία αλιεία, ούτε με καλάμι από την ακτή, και καμία διέλευση σκαφών. ΘΠΠ Κακοσκάλι στην ακτή του Ακάμα πιο δυτικά: απαγορεύεται η ερασιτεχνική αλιεία. Περιοχή Natura 2000 Πόλης–Γιαλιάς (δεν έχει επιβεβαιωθεί απαγόρευση αλιείας).' },
    sources: ['dom', 'safari', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['tsipoura', 10, 3], ['sargos', 10, 4], ['squid', 11, 3], ['melanouri', 4, 10], ['bluefish', 10, 1], ['garfish', 12, 4]],
        best: [
          { gear: 'surf_rod', spec: '4.2–4.5 m · 100–150 g', src: 'data', why: { en: 'Polis and Argaka beaches shelve gently: long casts at night, Oct–Mar, for gilthead and white seabream.', el: 'Οι παραλίες Πόλης και Αργάκας βαθαίνουν ήπια: μακριές βολές τη νύχτα, Οκτ–Μαρ, για τσιπούρα και σορκό.' } },
          { gear: 'bolognese_rod', spec: '5–7 m', src: 'dom', why: { en: 'Latchi harbour breakwaters: float with groundbait for white and saddled seabream and salema.', el: 'Κυματοθραύστες του Λατσιού: φελλός με μάλαγρα για σορκό, μελάνα και σάρπα.' } },
          { gear: 'eging_rod', spec: '2.4–2.6 m · egi 2.5–3.0', why: { en: 'Latchi harbour walls and the rocks west of it at dusk, Nov–Mar.', el: 'Τοίχοι του λιμανιού του Λατσιού και τα βράχια δυτικά του, σούρουπο, Νοέ–Μαρ.' } },
          { gear: 'reel_spin_l', spec: '5000–6000', why: { en: 'For the surf rod: line capacity and a strong drag.', el: 'Για το surf: χωρητικότητα και δυνατό φρένο.' } },
          { gear: 'surf_rig', spec: 'leader 1.5–3 m · fluoro 0.25–0.30 mm', why: { en: 'A long, light leader drifts the bait naturally in the wash.', el: 'Μακρύ, λεπτό παράμαλλο που κινεί φυσικά το δόλωμα στο κύμα.' } },
          { gear: 'worm', why: { en: 'Ragworm for gilthead and bream; switch to crab when small fish strip the hook.', el: 'Σκουλήκι για τσιπούρα και σορκό· καβούρι όταν τα μικρά καθαρίζουν το αγκίστρι.' } },
        ],
        also: [
          { gear: 'spinning_rod', spec: '2.7 m · 10–30 g', why: { en: 'Bluefish and garfish in winter from the harbour mouth and rocks; small spoons or pencils for garfish.', el: 'Γοφάρι και βελονίδα τον χειμώνα από το στόμιο του λιμανιού και τα βράχια· μικρά κουταλάκια ή pencil για βελονίδα.' } },
          { gear: 'lrf_rod', why: { en: 'Light jig heads along the harbour walls at night for comber and small bream.', el: 'Ελαφριές μολυβοκεφαλές στους τοίχους του λιμανιού τη νύχτα για χάννο και μικρά σπαροειδή.' } },
          { gear: 'crab', why: { en: 'Big gilthead bait that small fish can’t steal.', el: 'Δόλωμα για μεγάλες τσιπούρες που δεν το κλέβουν τα μικρά.' } },
          { gear: 'bread', why: { en: 'Grey mullet in the harbour with bread groundbait.', el: 'Κέφαλοι στο λιμάνι με ψωμί και μάλαγρα ψωμιού.' } },
        ],
        tips: { en: 'The beaches fish best once a northerly blow has dropped and the water is still a little coloured. Avoid bathing areas on summer days; fish them at night or off-season.', el: 'Οι παραλίες αποδίδουν μόλις πέσει ο βοριάς και το νερό είναι ακόμη λίγο θολό. Απόφυγε τις περιοχές λουομένων τις καλοκαιρινές μέρες· ψάρεψέ τες νύχτα ή εκτός σεζόν.' },
      },
      boat: {
        targets: [['pandora', 4, 8], ['porgy', 1, 4], ['scorpionfish', 1, 12], ['dentex', 4, 10], ['littletunny', 8, 11], ['dolphinfish', 9, 11], ['squid', 11, 3]],
        best: [
          { gear: 'boat_rod', spec: '2–3 hooks · 80–150 g', why: { en: 'Drift 30–80 m over sand and rock edges for pandora, red porgy and scorpionfish.', el: 'Ντρίφτ στα 30–80 μ. σε άμμο και άκρες ξέρας για λυθρίνι, φαγκρί και σκορπιό.' } },
          { gear: 'trolling_rod', spec: 'feathers, skirts, diving minnows', src: 'safari', why: { en: 'Little tunny and bonito in the bay in autumn; dolphinfish further out, Sep–Nov.', el: 'Καρβούνια και παλαμίδες στον κόλπο το φθινόπωρο· κυνηγοί πιο έξω, Σεπ–Νοέ.' } },
          { gear: 'slow_jig_rod', spec: '120–200 g', src: 'data', why: { en: 'Reef edges past the 100 m line (≈3 km out) for dentex and groupers.', el: 'Άκρες ξέρας πέρα από τα 100 μ. (≈3 χλμ.) για συναγρίδα και ορφό.' } },
          { gear: 'reel_conv', why: { en: 'For slow jigging and trolling.', el: 'Για slow jigging και συρτή.' } },
          { gear: 'squid_bait', why: { en: 'Tough strip bait that stays on in the drift.', el: 'Ανθεκτικό φιλέτο που μένει στο αγκίστρι στο ντρίφτ.' } },
        ],
        also: [
          { gear: 'squid_jig_vertical', why: { en: 'Drift at dusk over 15–40 m in winter for squid.', el: 'Ντρίφτ το σούρουπο σε 15–40 μ. τον χειμώνα για καλαμάρια.' } },
          { gear: 'tai_rubber', spec: '60–100 g', why: { en: 'Porgy and pandora on the sand–rock edge.', el: 'Φαγκρί και λυθρίνι στο όριο άμμου–βράχου.' } },
          { gear: 'inchiku', spec: '80–120 g', why: { en: 'Comber and scorpionfish on rough ground.', el: 'Χάννος και σκορπιός σε τραχύ βυθό.' } },
        ],
        tips: { en: 'Latchi to the Akamas reefs is a short run; go early, before the afternoon westerly. No passage or fishing in the Chalavro and Kakoskali MPAs. Charters also leave Polis on request (FishingBooker).', el: 'Από το Λατσί ως τις ξέρες του Ακάμα η διαδρομή είναι μικρή· βγες νωρίς, πριν από τον απογευματινό δυτικό. Καμία διέλευση ή αλιεία στις ΘΠΠ Χαλαύρου και Κακοσκάλι.' },
      },
      spear: {
        targets: [['sargos', 1, 12], ['octopus', 10, 5], ['grouper', 6, 10], ['parrotfish', 6, 10], ['greymullet', 5, 10], ['cuttlefish', 2, 5]],
        best: [
          { gear: 'gun_band', spec: '90–100 cm', why: { en: 'Clear water around the islets and the rocky shore towards Akamas.', el: 'Καθαρά νερά γύρω από τις νησίδες και τη βραχώδη ακτή προς τον Ακάμα.' } },
          { gear: 'spear_float', why: { en: 'Required; Latchi has heavy boat traffic in summer.', el: 'Υποχρεωτική· το Λατσί έχει πολλή κίνηση σκαφών το καλοκαίρι.' } },
        ],
        also: [
          { gear: 'gun_band', spec: '75 cm', why: { en: 'Shorter gun in Posidonia and holes near Polis.', el: 'Κοντύτερο όπλο σε ποσειδωνία και τρύπες κοντά στην Πόλη.' } },
          { gear: 'gloves', why: { en: 'Urchins and rough rock.', el: 'Αχινοί και τραχιά βράχια.' } },
        ],
        tips: { en: 'The best ground is the rocky shore and islets towards Akamas, outside the Chalavro and Kakoskali MPAs. Stay well clear of Latchi harbour mouth and the boat lanes.', el: 'Τα καλύτερα σημεία είναι η βραχώδης ακτή και οι νησίδες προς τον Ακάμα, έξω από τις ΘΠΠ Χαλαύρου και Κακοσκάλι. Κράτα απόσταση από το στόμιο του λιμανιού και τους διαδρόμους των σκαφών.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Akamas */
  akamas: {
    facts: { coast: { beach: 23, rocky: 77, made: 0, port: 0, mil: 0 }, d10: 0.36, d20: 1.1, d50: 1.8, d100: 2.7, drop: 1.6, pos: 65, rock: 14 },
    character: {
      en: 'Wild, roadless peninsula: three-quarters of the mapped coast is rock and low cliff, the rest the turtle beaches of Lara and Toxeftra. 20 m is about 1 km out and 100 m under 3 km; Posidonia covers about two-thirds of the shallow seabed, with reef patches. No harbours: the shore is reached by 4×4 tracks, boats come from Latchi or Agios Georgios.',
      el: 'Άγρια χερσόνησος χωρίς δρόμους: τα τρία τέταρτα της ακτής είναι βράχια και χαμηλοί γκρεμοί, τα υπόλοιπα οι παραλίες χελωνών της Λάρας και της Τοξεύτρας. Τα 20 μ. είναι περίπου 1 χλμ. έξω και τα 100 μ. κάτω από 3 χλμ.· η ποσειδωνία καλύπτει περίπου τα δύο τρίτα του ρηχού βυθού, με κομμάτια ξέρας. Χωρίς λιμάνια: στην ακτή φτάνεις με 4×4, τα σκάφη έρχονται από Λατσί ή Άγιο Γεώργιο.' },
    avoid: {
      en: 'Lara–Toxeftra turtle reserve: 1 Jun–30 Sep no boats, no anchoring and no fishing except from the shore; boat passage also banned in May and October. Kakoskali MPA on the north coast west of the Baths of Aphrodite: no recreational fishing. The whole peninsula is Natura 2000. Keep off the nesting beaches at night in summer.',
      el: 'Καταφύγιο χελωνών Λάρας–Τοξεύτρας: 1 Ιουν–30 Σεπ καμία διέλευση ή αγκυροβόληση και καμία αλιεία εκτός από την ακτή· απαγόρευση διέλευσης και τον Μάιο και τον Οκτώβριο. ΘΠΠ Κακοσκάλι στη βόρεια ακτή δυτικά από τα Λουτρά της Αφροδίτης: απαγορεύεται η ερασιτεχνική αλιεία. Όλη η χερσόνησος είναι Natura 2000. Μακριά από τις παραλίες ωοτοκίας τη νύχτα το καλοκαίρι.' },
    sources: ['safari', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['leerfish', 9, 12], ['bluefish', 10, 1], ['barracuda', 8, 12], ['amberjack', 6, 11], ['sargos', 10, 4], ['octopus', 10, 5]],
        best: [
          { gear: 'spinning_rod', spec: '2.7–3 m · 15–50 g', src: 'safari', why: { en: 'Rocky points with deep water close in: minnows, pencils and casting jigs for leerfish, bluefish and barracuda at first light.', el: 'Βραχώδη ακρωτήρια με βαθιά νερά κοντά: ψαράκια, pencil και jig ρίψης για λίτσα, γοφάρι και σφύρνα με το πρώτο φως.' } },
          { gear: 'shore_jig_rod', spec: '3 m · 40–100 g', why: { en: 'For amberjack and big leerfish from the deepest rocks: heavy metals and stickbaits.', el: 'Για μινέρι και μεγάλες λίτσες από τα πιο βαθιά βράχια: βαριά μεταλλικά και stickbait.' } },
          { gear: 'reel_spin_l', spec: '5000–8000', why: { en: 'Strong drag to stop a fish before it reaches the rocks.', el: 'Δυνατό φρένο για να σταματήσεις το ψάρι πριν φτάσει στα βράχια.' } },
          { gear: 'braid', spec: 'PE 1.5–2.5 + fluoro 0.50–0.60 mm', why: { en: 'Heavy leader against reef and teeth.', el: 'Χοντρό παράμαλλο για ξέρα και δόντια.' } },
          { gear: 'stickbait', spec: '12–16 cm', src: 'safari', why: { en: 'Big-fish lure when bait is pushed to the surface; popping is also used here.', el: 'Τεχνητό για μεγάλα ψάρια όταν η τροφή βγαίνει στην επιφάνεια· εδώ δουλεύει και το popping.' } },
          { gear: 'casting_jig', spec: '30–60 g', why: { en: 'Long casts into the wind to reach passing schools.', el: 'Μακριές βολές κόντρα στον αέρα ως τα περαστικά κοπάδια.' } },
        ],
        also: [
          { gear: 'bolognese_rod', spec: '5–6 m', why: { en: 'Foam off the rocks for white seabream in winter.', el: 'Αφρός στα βράχια για σορκό τον χειμώνα.' } },
          { gear: 'popper', why: { en: 'Calm early mornings over shallow reef.', el: 'Ήρεμα πρωινά πάνω από ρηχή ξέρα.' } },
          { gear: 'octopus_jig', why: { en: 'Dragged slowly over rock and sand for octopus, Oct–May.', el: 'Αργό σύρσιμο σε βράχο και άμμο για χταπόδι, Οκτ–Μάι.' } },
          { gear: 'lrf_rod', why: { en: 'Comber, painted comber and wrasse in the gullies.', el: 'Χάννος, πέρκα και γύλοι στα κανάλια των βράχων.' } },
        ],
        tips: { en: 'Go in pairs: there is no help nearby and no phone signal in places. West and north-west swell makes the low rocks dangerous. Carry all rubbish and line out.', el: 'Πήγαινε με παρέα: δεν υπάρχει βοήθεια κοντά και σε σημεία ούτε σήμα. Με δυτική και βορειοδυτική φουσκοθαλασσιά τα χαμηλά βράχια είναι επικίνδυνα. Πάρε μαζί σου όλα τα σκουπίδια και τις πετονιές.' },
      },
      boat: {
        targets: [['dentex', 4, 10], ['grouper', 6, 10], ['porgy', 1, 4], ['amberjack', 6, 11], ['pandora', 4, 8], ['littletunny', 8, 11]],
        best: [
          { gear: 'slow_jig_rod', spec: 'PE 1.5–2 · 150–250 g', src: 'data', why: { en: 'Steep reef edges at 40–150 m within 3 km of the shore: dentex, groupers, red porgy.', el: 'Απότομες άκρες ξέρας στα 40–150 μ. σε 3 χλμ. από την ακτή: συναγρίδα, ορφός, φαγκρί.' } },
          { gear: 'jigging_rod', spec: 'metal jigs 150–250 g', src: 'safari', why: { en: 'Amberjack along the drop-off; jigging is a local charter method here.', el: 'Μινέρι στην κατωφέρεια· το jigging το κάνουν εδώ και τα ναυλωμένα σκάφη.' } },
          { gear: 'reel_conv', why: { en: 'For slow jigging and heavy bottom work.', el: 'Για slow jigging και βαρύ ψάρεμα βυθού.' } },
          { gear: 'livebait_rig', spec: 'circle hook · fluoro 0.60–0.80 mm', why: { en: 'A live bogue over the reef edge: the classic for dentex and amberjack.', el: 'Ζωντανή γόππα στην άκρη της ξέρας: το κλασικό για συναγρίδα και μινέρι.' } },
          { gear: 'tai_rubber', spec: '80–150 g', why: { en: 'Porgy and pandora in deeper water.', el: 'Φαγκρί και λυθρίνι σε βαθύτερα νερά.' } },
        ],
        also: [
          { gear: 'trolling_rod', why: { en: 'Little tunny and bonito in autumn off the points.', el: 'Καρβούνια και παλαμίδες το φθινόπωρο έξω από τα ακρωτήρια.' } },
          { gear: 'sabiki', why: { en: 'Catch the live bait on the spot.', el: 'Πιάσε επιτόπου το ζωντανό δόλωμα.' } },
          { gear: 'inchiku', why: { en: 'Groupers and comber on rough ground.', el: 'Ορφοί και χάννοι σε τραχύ βυθό.' } },
        ],
        tips: { en: 'Remember the summer boat ban off Lara–Toxeftra (Jun–Sep) and the passage ban in May and October. Open to westerly swell: plan the return before the afternoon wind.', el: 'Θυμήσου την καλοκαιρινή απαγόρευση σκαφών στη Λάρα–Τοξεύτρα (Ιουν–Σεπ) και την απαγόρευση διέλευσης τον Μάιο και τον Οκτώβριο. Ανοιχτό σε δυτική φουσκοθαλασσιά: κανόνισε την επιστροφή πριν από τον απογευματινό αέρα.' },
      },
      spear: {
        targets: [['grouper', 6, 10], ['dentex', 5, 9], ['amberjack', 6, 10], ['sargos', 1, 12], ['octopus', 10, 5]],
        best: [
          { gear: 'gun_band', spec: '100–110 cm', why: { en: 'Some of the clearest water in Cyprus over rock and Posidonia: long shots at passing dentex and amberjack.', el: 'Από τα πιο καθαρά νερά της Κύπρου, σε βράχο και ποσειδωνία: μακριές βολές σε περαστικές συναγρίδες και μινέρια.' } },
          { gear: 'gun_pneu', spec: '75–90 cm', why: { en: 'Holes and ledges for groupers.', el: 'Τρύπες και σπηλιές για ορφούς.' } },
          { gear: 'spear_float', why: { en: 'Required; your only visible mark on a remote coast.', el: 'Υποχρεωτική· το μόνο ορατό σου σημάδι σε απομονωμένη ακτή.' } },
        ],
        also: [
          { gear: 'gloves', why: { en: 'Sharp rock, scorpionfish and lionfish spines.', el: 'Κοφτερά βράχια, αγκάθια σκορπιών και λεοντόψαρων.' } },
        ],
        tips: { en: 'Ambush on the rock edges at 8–20 m. Groupers grow slowly: leave small ones. No spearfishing in Kakoskali MPA; with the summer boat ban at Lara, enter from the shore there.', el: 'Καρτέρι στις άκρες των βράχων στα 8–20 μ. Οι ορφοί μεγαλώνουν αργά: άφησε τους μικρούς. Όχι ψαροντούφεκο στην ΘΠΠ Κακοσκάλι· με την καλοκαιρινή απαγόρευση σκαφών στη Λάρα, μπες από την ακτή.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Paphos – Coral Bay */
  paphos: {
    facts: { coast: { beach: 23, rocky: 45, made: 30, port: 0, mil: 0 }, d10: 0.63, d20: 1.3, d50: 2.3, d100: 3.5, drop: 2.1, pos: 57, rock: 12 },
    character: {
      en: 'Rocky, reef-fringed coast: low limestone platforms north of the harbour towards Coral Bay and Agios Georgios, sand-and-pebble beaches at Geroskipou and Coral Bay, and a long line of breakwaters along Kato Paphos. 10 m lies ~600 m out, 20 m ~1.3 km and 100 m ~3.5 km; Posidonia covers over half the shallow seabed, with rock patches and several wrecks.',
      el: 'Βραχώδης ακτή με ξέρες: χαμηλές ασβεστολιθικές πλάκες βόρεια του λιμανιού προς Κοράλ Μπέι και Άγιο Γεώργιο, παραλίες με άμμο και βότσαλο σε Γεροσκήπου και Κοράλ Μπέι, και σειρά κυματοθραυστών στην Κάτω Πάφο. Τα 10 μ. είναι ~600 μ. έξω, τα 20 μ. ~1,3 χλμ. και τα 100 μ. ~3,5 χλμ.· η ποσειδωνία καλύπτει πάνω από τον μισό ρηχό βυθό, με βράχια και αρκετά ναυάγια.' },
    avoid: {
      en: 'No fishing at all in the Pegeia Sea Caves MPA (Edro III wreck area — not even from the shore), in the Bania MPA by the harbour, or in the Geroskipou artificial-reef MPA (Laboe wreck). Lara–Toxeftra summer rules to the north. Moulia marine area (Geroskipou): anchoring limits. About a third of the coast is bathing area in summer.',
      el: 'Καμία αλιεία στη ΘΠΠ Θαλάσσιων Σπηλιών Πέγειας (περιοχή ναυαγίου Edro III — ούτε από την ακτή), στη ΘΠΠ Μπάνια δίπλα στο λιμάνι, ή στη ΘΠΠ τεχνητού υφάλου Γεροσκήπου (ναυάγιο Laboe). Βόρεια ισχύουν οι καλοκαιρινοί κανόνες Λάρας–Τοξεύτρας. Θαλάσσια περιοχή Μούλιας (Γεροσκήπου): περιορισμοί αγκυροβόλησης. Περίπου το ένα τρίτο της ακτής είναι περιοχή λουομένων το καλοκαίρι.' },
    sources: ['fbblog', 'fwg', 'dom', 'safari', 'relion', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['sargos', 10, 4], ['tsipoura', 10, 3], ['seabass', 11, 3], ['squid', 11, 3], ['leerfish', 9, 12], ['barracuda', 8, 12], ['melanouri', 4, 10]],
        best: [
          { gear: 'spinning_rod', spec: '2.7–3 m · 10–40 g', src: 'fbblog', why: { en: 'The rocks north of Paphos are the most productive shore: minnows and soft shads at dawn for leerfish, barracuda and sea bass.', el: 'Τα βράχια βόρεια της Πάφου είναι η πιο αποδοτική ακτή: ψαράκια και σιλικόνες shad τα χαράματα για λίτσα, σφύρνα και λαβράκι.' } },
          { gear: 'bolognese_rod', spec: '5–7 m', src: 'fwg', why: { en: 'Rock platforms and Kato Paphos breakwaters: float with groundbait for white seabream, gilthead and saddled seabream.', el: 'Βραχώδεις πλάκες και κυματοθραύστες της Κάτω Πάφου: φελλός με μάλαγρα για σορκό, τσιπούρα και μελάνα.' } },
          { gear: 'eging_rod', spec: '2.4–2.6 m · egi 2.5–3.5', why: { en: 'Harbour and breakwaters at dusk, Nov–Mar: squid and cuttlefish over the Posidonia.', el: 'Λιμάνι και κυματοθραύστες το σούρουπο, Νοέ–Μαρ: καλαμάρια και σουπιές πάνω από την ποσειδωνία.' } },
          { gear: 'reel_spin_m', spec: '3000–4000', why: { en: 'Covers spinning and float fishing.', el: 'Καλύπτει spinning και φελλό.' } },
          { gear: 'braid', spec: 'PE 0.8–1.2 + fluoro 0.30–0.40 mm', why: { en: 'Abrasion-proof leader for the reef edges.', el: 'Παράμαλλο που αντέχει στις άκρες της ξέρας.' } },
          { gear: 'minnow', spec: '9–12 cm', why: { en: 'Dawn and dusk over the platforms.', el: 'Χαράματα και σούρουπο πάνω από τις πλάκες.' } },
        ],
        also: [
          { gear: 'surf_rod', spec: '4.2 m · 80–150 g', why: { en: 'Geroskipou and Coral Bay sand at night in winter for gilthead.', el: 'Άμμος Γεροσκήπου και Κοράλ Μπέι τη νύχτα τον χειμώνα για τσιπούρα.' } },
          { gear: 'lrf_rod', why: { en: 'Harbour lights at night: comber, small bream, juvenile barracuda.', el: 'Φώτα του λιμανιού τη νύχτα: χάννοι, μικρά σπαροειδή, μικρές σφύρνες.' } },
          { gear: 'soft_shad', spec: '7–10 cm · 7–14 g head', why: { en: 'Slow over Posidonia for sea bass and barracuda.', el: 'Αργά πάνω από ποσειδωνία για λαβράκι και σφύρνα.' } },
          { gear: 'shrimp', why: { en: 'Float bait for all the bream.', el: 'Δόλωμα φελλού για όλα τα σπαροειδή.' } },
        ],
        tips: { en: 'Fish the rock platforms north of town only in calm seas. Stay out of the Pegeia Sea Caves MPA: shore rods are banned there too.', el: 'Ψάρευε τις βραχώδεις πλάκες βόρεια της πόλης μόνο με ήρεμη θάλασσα. Μείνε έξω από τη ΘΠΠ Θαλάσσιων Σπηλιών Πέγειας: εκεί απαγορεύεται και το καλάμι από την ακτή.' },
      },
      boat: {
        targets: [['amberjack', 6, 11], ['pandora', 4, 8], ['grouper', 6, 10], ['dentex', 4, 10], ['albacore', 6, 8], ['dolphinfish', 9, 11]],
        best: [
          { gear: 'boat_rod', spec: '2–3 hooks · 80–150 g', src: 'fbblog', why: { en: 'Rocky bottoms off Paphos hold pandora, amberjack and groupers.', el: 'Οι βραχώδεις βυθοί έξω από την Πάφο έχουν λυθρίνια, μινέρια και ορφούς.' } },
          { gear: 'slow_jig_rod', spec: '120–200 g', why: { en: 'Reef edges at 50–120 m for dentex, groupers and porgy.', el: 'Άκρες ξέρας στα 50–120 μ. για συναγρίδα, ορφό και φαγκρί.' } },
          { gear: 'jigging_rod', spec: 'metal jigs 150–250 g', src: 'fwg', why: { en: 'Amberjack over the deeper rock; jigging and trolling are the local boat methods.', el: 'Μινέρι στα βαθύτερα βράχια· jigging και συρτή είναι οι τοπικές μέθοδοι από σκάφος.' } },
          { gear: 'reel_conv', why: { en: 'For slow jigging and trolling.', el: 'Για slow jigging και συρτή.' } },
          { gear: 'trolling_rod', spec: 'skirts & feathers · 6–8 knots', src: 'fbblog', why: { en: 'Tuna offshore from May to August; dolphinfish Sep–Nov.', el: 'Τόνοι στα ανοιχτά από Μάιο ως Αύγουστο· κυνηγοί Σεπ–Νοέ.' } },
          { gear: 'tai_rubber', spec: '60–120 g', why: { en: 'Pandora and porgy on the sand–rock edge.', el: 'Λυθρίνι και φαγκρί στο όριο άμμου–βράχου.' } },
        ],
        also: [
          { gear: 'livebait_rig', why: { en: 'Live bogue for amberjack and dentex.', el: 'Ζωντανή γόππα για μινέρι και συναγρίδα.' } },
          { gear: 'inchiku', why: { en: 'Groupers and comber.', el: 'Ορφοί και χάννοι.' } },
          { gear: 'squid_jig_vertical', why: { en: 'Squid at dusk in winter.', el: 'Καλαμάρια το σούρουπο τον χειμώνα.' } },
        ],
        tips: { en: 'Agios Georgios (Pegeia) harbour is the closest launch for the northern reefs, where amberjack, pandora and groupers are even better (FishingBooker). Boats may not pass or anchor in the Sea Caves MPA.', el: 'Το λιμανάκι του Αγίου Γεωργίου (Πέγεια) είναι το πιο κοντινό σημείο για τις βόρειες ξέρες, όπου μινέρια, λυθρίνια και ορφοί είναι ακόμη καλύτερα. Απαγορεύεται η διέλευση και η αγκυροβόληση στη ΘΠΠ Θαλάσσιων Σπηλιών.' },
      },
      spear: {
        targets: [['sargos', 1, 12], ['octopus', 10, 5], ['grouper', 6, 10], ['parrotfish', 6, 10], ['greymullet', 5, 10], ['lionfish', 5, 11]],
        best: [
          { gear: 'gun_band', spec: '90–100 cm', why: { en: 'Reef and Posidonia edges at 5–20 m along the Coral Bay–Agios Georgios coast.', el: 'Άκρες ξέρας και ποσειδωνίας στα 5–20 μ. στην ακτή Κοράλ Μπέι–Άγιου Γεωργίου.' } },
          { gear: 'spear_float', why: { en: 'Required; tourist boats run along this coast.', el: 'Υποχρεωτική· τουριστικά σκάφη κινούνται κατά μήκος της ακτής.' } },
          { gear: 'gloves', src: 'relion', why: { en: 'Lionfish are common here and their spines are venomous.', el: 'Τα λεοντόψαρα είναι συχνά εδώ και τα αγκάθια τους είναι δηλητηριώδη.' } },
        ],
        also: [
          { gear: 'gun_pneu', spec: '75 cm', why: { en: 'Holes and caves in the reef.', el: 'Τρύπες και σπηλιές της ξέρας.' } },
        ],
        tips: { en: 'About a third of the coast is bathing area: no spearfishing there in season. Taking invasive lionfish helps the reef (LIFE RELIONMED).', el: 'Περίπου το ένα τρίτο της ακτής είναι περιοχή λουομένων: όχι ψαροντούφεκο εκεί όσο ισχύει. Το ψάρεμα του ξενικού λεοντόψαρου βοηθά την ξέρα (LIFE RELIONMED).' },
      },
    },
  },

  /* ------------------------------------------------------------------ Petra tou Romiou – Pissouri */
  pissouri: {
    facts: { coast: { beach: 36, rocky: 49, made: 2, port: 2, mil: 13 }, d10: 0.72, d20: 1.6, d50: 2.7, d100: 4.5, drop: null, pos: 18, rock: 3 },
    character: {
      en: 'White chalk cliffs and headlands (Cape Aspro, Petra tou Romiou) between wide pebble and sand bays at Pissouri and Avdimou. The shelf is broad and sandy — 20 m about 1.5 km out, 100 m ~4.5 km — with little Posidonia and no steep drop-off mapped near shore. Jubilee Shoal, a reef off Petra tou Romiou, is the standout structure.',
      el: 'Λευκοί κρητιδικοί γκρεμοί και ακρωτήρια (Κάβο Άσπρο, Πέτρα του Ρωμιού) ανάμεσα σε μεγάλους κόλπους με βότσαλο και άμμο σε Πισσούρι και Αυδήμου. Πλατιά αμμώδης υφαλοκρηπίδα — 20 μ. περίπου στα 1,5 χλμ., 100 μ. ~4,5 χλμ. — με λίγη ποσειδωνία και χωρίς απότομη κατωφέρεια κοντά στην ακτή. Η ξέρα Jubilee έξω από την Πέτρα του Ρωμιού είναι η κύρια δομή.' },
    avoid: {
      en: 'Episkopi Sovereign Base Area ranges on the east side: military, no access. Cape Aspro–Petra tou Romiou Natura 2000 site (no fishing ban confirmed). Petra tou Romiou and Pissouri beaches are bathing areas in summer.',
      el: 'Πεδία βολής της Βρετανικής Βάσης Επισκοπής στα ανατολικά: στρατιωτική ζώνη, καμία πρόσβαση. Περιοχή Natura 2000 Κάβο Άσπρο–Πέτρα του Ρωμιού (δεν έχει επιβεβαιωθεί απαγόρευση αλιείας). Οι παραλίες Πέτρας του Ρωμιού και Πισσουρίου είναι περιοχές λουομένων το καλοκαίρι.' },
    sources: ['data', 'kdp'],
    methods: {
      shore: {
        targets: [['tsipoura', 10, 3], ['sargos', 10, 4], ['pompano', 7, 10], ['bluefish', 10, 1], ['annular', 5, 10]],
        best: [
          { gear: 'surf_rod', spec: '4.2–4.5 m · 100–175 g', src: 'data', why: { en: 'Wide sandy bays with a gentle slope: cast beyond the break at night, Oct–Mar, for gilthead and white seabream.', el: 'Πλατιοί αμμώδεις κόλποι με ήπια κλίση: βολή πέρα από το κύμα τη νύχτα, Οκτ–Μαρ, για τσιπούρα και σορκό.' } },
          { gear: 'reel_spin_l', spec: '6000+', why: { en: 'Big spool and drag for long surf casts.', el: 'Μεγάλη μπομπίνα και φρένο για μακριές βολές surf.' } },
          { gear: 'mono', spec: { en: '0.28–0.30 mm + 0.50–0.57 mm shock leader', el: '0,28–0,30 mm + σοκ λίντερ 0,50–0,57 mm' }, why: { en: 'A shock leader stops crack-offs when casting 150 g.', el: 'Το σοκ λίντερ προστατεύει από σπασίματα στη βολή των 150 γρ.' } },
          { gear: 'surf_rig', spec: 'leader 1.5–3 m', why: { en: 'Long leader drifting in the wash, the way gilthead feed on sand.', el: 'Μακρύ παράμαλλο στο κύμα, όπως τρώει η τσιπούρα στην άμμο.' } },
          { gear: 'worm', why: { en: 'Ragworm or Korean worm; crab for big gilthead.', el: 'Σκουλήκι· καβούρι για μεγάλες τσιπούρες.' } },
        ],
        also: [
          { gear: 'spinning_rod', spec: '2.7 m · 15–40 g', why: { en: 'Cape Aspro rocks at dawn: casting jigs and minnows for bluefish, pompano in late summer.', el: 'Βράχια στο Κάβο Άσπρο τα χαράματα: jig ρίψης και ψαράκια για γοφάρι, λιτσούι στο τέλος του καλοκαιριού.' } },
          { gear: 'bottom_rig', spec: '30–60 g · hooks 10–8', why: { en: 'Light casting rig for annular seabream and small bream by day.', el: 'Ελαφριά σύνθεση πεταχτού για σπάρους και μικρά σπαροειδή τη μέρα.' } },
          { gear: 'crab', why: { en: 'Selective bait for big gilthead.', el: 'Επιλεκτικό δόλωμα για μεγάλες τσιπούρες.' } },
        ],
        tips: { en: 'Fish the bay corners where sand meets rock, around dusk. The chalk cliffs crumble: don’t fish under overhangs.', el: 'Ψάρεψε τις γωνίες των κόλπων, εκεί που η άμμος συναντά τον βράχο, γύρω στο σούρουπο. Οι κρητιδικοί γκρεμοί θρυμματίζονται: μην ψαρεύεις κάτω από προεξοχές.' },
      },
      boat: {
        targets: [['redmullet', 9, 3], ['surmullet', 9, 12], ['pandora', 4, 8], ['amberjack', 6, 11], ['dentex', 4, 10], ['littletunny', 8, 11]],
        best: [
          { gear: 'boat_rod', spec: 'light · 50–100 g', src: 'data', why: { en: 'Drift the wide sandy shelf at 20–60 m for red mullet, striped red mullet and pandora.', el: 'Ντρίφτ στην πλατιά αμμώδη υφαλοκρηπίδα στα 20–60 μ. για στρίλια, μπαρμπούνι και λυθρίνι.' } },
          { gear: 'bottom_rig', spec: '2–3 hooks · 8–4', why: { en: 'Fine droppers with worm or shrimp for the mullets.', el: 'Λεπτά παράμαλλα με σκουλήκι ή γαρίδα για στρίλιες και μπαρμπούνια.' } },
          { gear: 'slow_jig_rod', spec: '100–180 g', why: { en: 'Jubilee Shoal and other rock patches for dentex and amberjack.', el: 'Ξέρα Jubilee και άλλα βράχια για συναγρίδα και μινέρι.' } },
          { gear: 'livebait_rig', why: { en: 'A live bogue over the shoal for amberjack and dentex.', el: 'Ζωντανή γόππα πάνω από την ξέρα για μινέρι και συναγρίδα.' } },
          { gear: 'worm', why: { en: 'The red mullet bait.', el: 'Το δόλωμα για στρίλιες και μπαρμπούνια.' } },
        ],
        also: [
          { gear: 'trolling_rod', why: { en: 'Little tunny and bonito in autumn along the 50–100 m line.', el: 'Καρβούνια και παλαμίδες το φθινόπωρο στη γραμμή των 50–100 μ.' } },
          { gear: 'tai_rubber', why: { en: 'Pandora on the sand–rock edge.', el: 'Λυθρίνι στο όριο άμμου–βράχου.' } },
          { gear: 'sabiki', why: { en: 'Live bait for the shoal.', el: 'Ζωντανό δόλωμα για την ξέρα.' } },
        ],
        tips: { en: 'Rock is scarce: mark the rock patches and drift over the sand between them. Jubilee Shoal is a popular dive site — give flagged dive boats room.', el: 'Ο βράχος είναι λίγος: σημάδεψε τα βραχώδη σημεία και κάνε ντρίφτ στην άμμο ανάμεσά τους. Η ξέρα Jubilee είναι δημοφιλές καταδυτικό σημείο — άφησε χώρο στα σκάφη με σημαία κατάδυσης.' },
      },
      spear: {
        targets: [['sargos', 1, 12], ['octopus', 10, 5], ['cuttlefish', 2, 5], ['greymullet', 5, 10], ['surmullet', 4, 10]],
        best: [
          { gear: 'gun_band', spec: '90–100 cm', why: { en: 'Good visibility over sand: longer shots at fish on the isolated rocks and the cliff base.', el: 'Καλή ορατότητα πάνω από άμμο: μακρύτερες βολές σε ψάρια στα μεμονωμένα βράχια και στη βάση των γκρεμών.' } },
          { gear: 'spear_float', why: { en: 'Required.', el: 'Υποχρεωτική.' } },
        ],
        also: [
          { gear: 'gun_band', spec: '75 cm', why: { en: 'Short gun for octopus and cuttlefish in the shallows.', el: 'Κοντό όπλο για χταπόδια και σουπιές στα ρηχά.' } },
          { gear: 'gloves', why: { en: 'Weevers bury in this sand; their spines are venomous.', el: 'Οι δράκαινες χώνονται σε αυτή την άμμο· τα αγκάθια τους είναι δηλητηριώδη.' } },
        ],
        tips: { en: 'Fish gather on the scarce rock: the cliff base and the rocks of Petra tou Romiou (outside the summer bathing area) and, by boat, Jubilee Shoal — deep, for experienced freedivers only.', el: 'Τα ψάρια μαζεύονται στα λίγα βράχια: στη βάση των γκρεμών, στα βράχια της Πέτρας του Ρωμιού (εκτός περιόδου λουομένων) και, με σκάφος, στην ξέρα Jubilee — βαθιά, μόνο για έμπειρους.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Akrotiri – Lady's Mile */
  akrotiri: {
    facts: { coast: { beach: 34, rocky: 5, made: 0, port: 10, mil: 48 }, d10: 0.68, d20: 1.6, d50: 2.7, d100: 4.2, drop: 5.7, pos: 26, rock: 4 },
    character: {
      en: 'Mostly sand: the 5 km Lady’s Mile beach on the east side of the Akrotiri peninsula and the shallows towards Cape Gata, with the Akrotiri fishing shelter. Nearly half of the mapped coast is military (RAF Akrotiri, Sovereign Base Area) and closed. Very shallow inshore — 10 m ~700 m out, 20 m ~1.6 km, 100 m ~4 km — over sand and patchy Posidonia.',
      el: 'Κυρίως άμμος: η παραλία Lady’s Mile μήκους 5 χλμ. στην ανατολική πλευρά της χερσονήσου του Ακρωτηρίου και τα ρηχά προς το Κάβο Γάτα, με το αλιευτικό καταφύγιο Ακρωτηρίου. Σχεδόν η μισή ακτή είναι στρατιωτική (RAF Ακρωτηρίου, Βρετανική Βάση) και κλειστή. Πολύ ρηχά κοντά — 10 μ. ~700 μ. έξω, 20 μ. ~1,6 χλμ., 100 μ. ~4 χλμ. — σε άμμο και διάσπαρτη ποσειδωνία.' },
    avoid: {
      en: 'RAF Akrotiri and the base coast (military, no access); the approach to Limassol’s new port at the north-east end; the 100 m no-fishing zone round the fish farm off Lady’s Mile.',
      el: 'RAF Ακρωτηρίου και η ακτή της βάσης (στρατιωτική, καμία πρόσβαση)· η είσοδος του νέου λιμανιού Λεμεσού στο βορειοανατολικό άκρο· η ζώνη 100 μ. χωρίς αλιεία γύρω από την ιχθυοκαλλιέργεια έξω από το Lady’s Mile.' },
    sources: ['alllim', 'dom', 'ladysmile', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['tsipoura', 10, 3], ['seabass', 11, 3], ['sargos', 10, 4], ['pompano', 7, 10], ['bluefish', 10, 1], ['cuttlefish', 2, 5]],
        best: [
          { gear: 'surf_rod', spec: '4.2–4.5 m · 100–150 g', src: 'alllim', why: { en: 'Lady’s Mile is long, flat and shallow: distance reaches the first trough; gilthead and sea bass on winter nights.', el: 'Το Lady’s Mile είναι μακρύ, επίπεδο και ρηχό: η απόσταση σε φτάνει στο πρώτο βάθυμα· τσιπούρες και λαβράκια τις χειμωνιάτικες νύχτες.' } },
          { gear: 'reel_spin_l', spec: '6000+', why: { en: 'Line capacity for long casts.', el: 'Χωρητικότητα για μακριές βολές.' } },
          { gear: 'mono', spec: { en: '0.25–0.30 mm + shock leader', el: '0,25–0,30 mm + σοκ λίντερ' }, why: { en: 'Clean sand: a lighter main line casts further.', el: 'Καθαρή άμμος: πιο λεπτή κύρια πετονιά πετά πιο μακριά.' } },
          { gear: 'surf_rig', spec: 'leader 2–3 m', why: { en: 'A long leader for shy fish in clear, shallow water.', el: 'Μακρύ παράμαλλο για επιφυλακτικά ψάρια σε καθαρά ρηχά νερά.' } },
          { gear: 'worm', why: { en: 'Ragworm; crab or mussel for big gilthead.', el: 'Σκουλήκι· καβούρι ή μύδι για μεγάλες τσιπούρες.' } },
        ],
        also: [
          { gear: 'spinning_rod', spec: '2.7–3 m · 10–30 g', why: { en: 'Minnows and soft shads in the surf at dusk for sea bass and bluefish, autumn–winter.', el: 'Ψαράκια και σιλικόνες στο κύμα το σούρουπο για λαβράκι και γοφάρι, φθινόπωρο–χειμώνα.' } },
          { gear: 'eging_rod', src: 'dom', why: { en: 'Akrotiri shelter breakwater: cuttlefish in spring, squid in winter.', el: 'Μόλος του καταφυγίου Ακρωτηρίου: σουπιές την άνοιξη, καλαμάρια τον χειμώνα.' } },
          { gear: 'bolognese_rod', why: { en: 'Float off the shelter breakwater for bream.', el: 'Φελλός στον μόλο του καταφυγίου για σπαροειδή.' } },
        ],
        tips: { en: 'Bream bite best on calm, sunny winter days; sea bass all year, best in winter (All About Limassol). Rod fishing is allowed in bathing areas, but fish at night or off-season when the beach is busy.', el: 'Η τσιπούρα τρώει καλύτερα τις ήρεμες, ηλιόλουστες μέρες του χειμώνα· το λαβράκι όλο τον χρόνο, καλύτερα τον χειμώνα. Το καλάμι επιτρέπεται στις περιοχές λουομένων, αλλά ψάρευε νύχτα ή εκτός σεζόν όταν η παραλία έχει κόσμο.' },
      },
      boat: {
        targets: [['pandora', 4, 8], ['redmullet', 9, 3], ['squid', 11, 3], ['littletunny', 8, 11], ['amberjack', 6, 11]],
        best: [
          { gear: 'boat_rod', spec: '60–120 g', src: 'data', why: { en: 'Drift the sandy shelf at 20–60 m for pandora and red mullet.', el: 'Ντρίφτ στην αμμώδη υφαλοκρηπίδα στα 20–60 μ. για λυθρίνι και στρίλια.' } },
          { gear: 'squid_jig_vertical', why: { en: 'Dusk drift over 15–40 m, Nov–Mar.', el: 'Ντρίφτ το σούρουπο σε 15–40 μ., Νοέ–Μαρ.' } },
          { gear: 'trolling_rod', spec: 'feathers & skirts', why: { en: 'Off Cape Gata in autumn for little tunny and bonito.', el: 'Έξω από το Κάβο Γάτα το φθινόπωρο για καρβούνια και παλαμίδες.' } },
          { gear: 'reel_spin_m', spec: '3000–4000', why: { en: 'Light bottom and squid work.', el: 'Για ελαφρύ βυθό και καλαμάρια.' } },
          { gear: 'shrimp', why: { en: 'Best general bottom bait on sand.', el: 'Το καλύτερο γενικό δόλωμα βυθού στην άμμο.' } },
        ],
        also: [
          { gear: 'slow_jig_rod', why: { en: 'Wrecks and the bank south-west of Cape Gata (~165 m).', el: 'Ναυάγια και η ξέρα νοτιοδυτικά του Κάβο Γάτα (~165 μ.).' } },
          { gear: 'livebait_rig', src: 'farms', why: { en: 'Amberjack around the fish farm, outside the 100 m zone.', el: 'Μινέρια γύρω από την ιχθυοκαλλιέργεια, έξω από τη ζώνη των 100 μ.' } },
          { gear: 'tai_rubber', why: { en: 'Pandora on the edges.', el: 'Λυθρίνι στις άκρες.' } },
        ],
        tips: { en: 'Launch from the Akrotiri shelter or Limassol. Stay 100 m from fish-farm cages (no fishing of any kind) and out of the base’s restricted waters.', el: 'Βγες από το καταφύγιο Ακρωτηρίου ή τη Λεμεσό. Κράτα 100 μ. από τους κλωβούς ιχθυοκαλλιέργειας (καμία αλιεία) και έξω από τα απαγορευμένα νερά της βάσης.' },
      },
      spear: {
        targets: [['octopus', 10, 5], ['cuttlefish', 2, 5], ['greymullet', 5, 10], ['sargos', 1, 12], ['surmullet', 4, 10]],
        best: [
          { gear: 'gun_band', spec: '75–90 cm', why: { en: 'Mostly shallow sand and Posidonia patches: a short gun for cuttlefish, octopus and mullet in 2–8 m.', el: 'Κυρίως ρηχή άμμος και κομμάτια ποσειδωνίας: κοντό όπλο για σουπιές, χταπόδια και κεφάλους στα 2–8 μ.' } },
          { gear: 'spear_float', why: { en: 'Required.', el: 'Υποχρεωτική.' } },
        ],
        also: [
          { gear: 'gloves', why: { en: 'Weevers on the sand.', el: 'Δράκαινες στην άμμο.' } },
        ],
        tips: { en: 'Little rock: the Cape Gata end and the shelter breakwater base (outside the bathing season). Much of the peninsula coast is military and off-limits.', el: 'Λίγος βράχος: η άκρη του Κάβο Γάτα και η βάση του μόλου του καταφυγίου (εκτός περιόδου λουομένων). Μεγάλο μέρος της ακτής είναι στρατιωτικό και απαγορευμένο.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Limassol */
  limassol: {
    facts: { coast: { beach: 24, rocky: 0, made: 59, port: 17, mil: 0 }, d10: 0.72, d20: 1.6, d50: 2.3, d100: 4.0, drop: 4.8, pos: 42, rock: 6 },
    character: {
      en: 'A city coast of rock breakwaters: almost 60% of the mapped shoreline is groynes, piers, marina and old-port walls, with short sandy beaches between them and the port to the west. Shallow and gentle — 10 m ~700 m out, 20 m ~1.6 km, 100 m ~4 km — over sand and Posidonia. Fish farms lie offshore to the south and east.',
      el: 'Ακτή πόλης με πέτρινους κυματοθραύστες: σχεδόν το 60% της ακτογραμμής είναι μόλοι, προβλήτες, μαρίνα και τοίχοι του παλιού λιμανιού, με μικρές αμμουδιές ανάμεσα και το λιμάνι στα δυτικά. Ρηχά και ήπια — 10 μ. ~700 μ., 20 μ. ~1,6 χλμ., 100 μ. ~4 χλμ. — σε άμμο και ποσειδωνία. Ιχθυοκαλλιέργειες στα ανοιχτά νότια και ανατολικά.' },
    avoid: {
      en: 'No fishing at all in the Dasoudi artificial-reef MPA and the Amathounta MPA (east of the city), inside the port, or within 100 m of fish-farm cages. Swimming zones cover most beaches in summer (no spearfishing there in season).',
      el: 'Καμία αλιεία στη ΘΠΠ τεχνητού υφάλου Δασουδίου και στη ΘΠΠ Αμαθούντας (ανατολικά της πόλης), μέσα στο λιμάνι ή σε 100 μ. από κλωβούς ιχθυοκαλλιέργειας. Οι ζώνες λουομένων καλύπτουν τις περισσότερες παραλίες το καλοκαίρι (όχι ψαροντούφεκο εκεί όσο ισχύουν).' },
    sources: ['alllim', 'dom', 'farms', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['sargos', 10, 4], ['seabass', 11, 3], ['tsipoura', 10, 3], ['melanouri', 4, 10], ['greymullet', 5, 10], ['squid', 11, 3], ['cuttlefish', 2, 5]],
        best: [
          { gear: 'bolognese_rod', spec: '5–7 m', src: 'dom', why: { en: 'The groynes and Molos / Old Port walls: float with bread-and-sardine groundbait for white and saddled seabream and grey mullet.', el: 'Μόλοι και τοίχοι Μόλου / Παλιού Λιμανιού: φελλός με μάλαγρα ψωμιού και σαρδέλας για σορκό, μελάνα και κέφαλο.' } },
          { gear: 'lrf_rod', spec: '1.8–2.3 m · 0.5–8 g', why: { en: 'Breakwater gaps and lit walls at night: soft grubs on 2–5 g heads for comber, painted comber and small bream.', el: 'Ανοίγματα μόλων και φωτισμένοι τοίχοι τη νύχτα: σιλικόνες grub σε μολυβοκεφαλές 2–5 γρ. για χάννους, πέρκες και μικρά σπαροειδή.' } },
          { gear: 'eging_rod', spec: '2.4–2.6 m · egi 2.5–3.0', why: { en: 'Dusk on the outer groynes: cuttlefish Feb–May, squid Nov–Mar.', el: 'Σούρουπο στους εξωτερικούς μόλους: σουπιές Φεβ–Μάι, καλαμάρια Νοέ–Μαρ.' } },
          { gear: 'reel_spin_s', spec: '2500', why: { en: 'Light reel for float, LRF and eging.', el: 'Ελαφρύ μηχανάκι για φελλό, LRF και eging.' } },
          { gear: 'float_rig', spec: '1–3 g · leader 0.16–0.20 mm', why: { en: 'Fine leader for wary fish in clear, calm harbour water.', el: 'Λεπτό παράμαλλο για επιφυλακτικά ψάρια σε καθαρά, ήρεμα νερά.' } },
          { gear: 'groundbait', why: { en: 'Keeps bream and mullet in front of the groyne.', el: 'Κρατά σπαροειδή και κεφάλους μπροστά στον μόλο.' } },
        ],
        also: [
          { gear: 'spinning_rod', spec: '2.4–2.7 m · 10–30 g', src: 'alllim', why: { en: 'Sea bass at dawn near harbours and stream mouths, best in winter.', el: 'Λαβράκια τα χαράματα κοντά σε λιμάνια και εκβολές ρεμάτων, καλύτερα τον χειμώνα.' } },
          { gear: 'surf_rod', spec: '4.2 m · 80–150 g', src: 'alllim', why: { en: 'Open sandy beaches west of the Marina towards Karnagio, winter nights, for gilthead.', el: 'Ανοιχτές αμμουδιές δυτικά της Μαρίνας προς το Καρνάγιο, χειμωνιάτικες νύχτες, για τσιπούρα.' } },
          { gear: 'bread', why: { en: 'Mullet bait on the float.', el: 'Δόλωμα για κέφαλο στον φελλό.' } },
          { gear: 'soft_grub', spec: '5–7 cm', why: { en: 'The LRF lure for comber.', el: 'Η σιλικόνη LRF για χάννους.' } },
        ],
        tips: { en: 'Bream bite on sunny winter days; sea bass all year but best in winter, near harbours and stream mouths. The docks are fishable day and night. Quieter spots: west of the Marina towards Karnagio and Parekklisia beach (All About Limassol).', el: 'Η τσιπούρα τρώει τις ηλιόλουστες χειμωνιάτικες μέρες· το λαβράκι όλο τον χρόνο, καλύτερα τον χειμώνα, κοντά σε λιμάνια και εκβολές. Οι προβλήτες ψαρεύονται μέρα και νύχτα. Πιο ήσυχα σημεία: δυτικά της Μαρίνας προς το Καρνάγιο και η παραλία Παρεκκλησιάς.' },
      },
      boat: {
        targets: [['amberjack', 6, 11], ['bluefish', 10, 1], ['pandora', 4, 8], ['littletunny', 8, 11], ['squid', 11, 3], ['redmullet', 9, 3]],
        best: [
          { gear: 'boat_rod', spec: '60–120 g', why: { en: 'Sand and Posidonia at 20–60 m: pandora, annular seabream, red mullet.', el: 'Άμμος και ποσειδωνία στα 20–60 μ.: λυθρίνι, σπάρος, στρίλια.' } },
          { gear: 'spinning_rod', spec: '2.4–2.7 m · 20–60 g', src: 'farms', why: { en: 'Cast jigs and poppers at bluefish and amberjack hunting near the fish farms, outside the 100 m zone.', el: 'Jig και popper σε γοφάρια και μινέρια που κυνηγούν κοντά στις ιχθυοκαλλιέργειες, έξω από τη ζώνη των 100 μ.' } },
          { gear: 'squid_jig_vertical', why: { en: 'Dusk drift over 15–40 m, Nov–Mar.', el: 'Ντρίφτ το σούρουπο σε 15–40 μ., Νοέ–Μαρ.' } },
          { gear: 'trolling_rod', why: { en: 'Little tunny and bonito in autumn along the 50–100 m line.', el: 'Καρβούνια και παλαμίδες το φθινόπωρο στη γραμμή των 50–100 μ.' } },
          { gear: 'reel_spin_m', spec: '4000', why: { en: 'One reel for casting and bottom work.', el: 'Ένα μηχανάκι για ρίψεις και βυθό.' } },
        ],
        also: [
          { gear: 'sabiki', src: 'farms', why: { en: 'Bogue and horse mackerel gather near the farms: live bait.', el: 'Γόππες και σαυρίδια μαζεύονται κοντά στις ιχθυοκαλλιέργειες: ζωντανό δόλωμα.' } },
          { gear: 'livebait_rig', why: { en: 'Live bogue for amberjack.', el: 'Ζωντανή γόππα για μινέρι.' } },
          { gear: 'slow_jig_rod', why: { en: 'Deeper edges past 100 m, ~4 km out.', el: 'Βαθύτερες άκρες πέρα από τα 100 μ., ~4 χλμ. έξω.' } },
        ],
        tips: { en: 'No fishing within 100 m of farm cages; the wild fish round them spread out at dawn and dusk. A boat licence is needed; the bag limit is 10 kg, or 5 kg + 1 fish, per trip.', el: 'Καμία αλιεία σε 100 μ. από κλωβούς· τα άγρια ψάρια γύρω τους σκορπίζουν χαράματα και σούρουπο. Χρειάζεται άδεια σκάφους· όριο 10 κιλά, ή 5 κιλά + 1 ψάρι, ανά έξοδο.' },
      },
      spear: {
        targets: [['greymullet', 5, 10], ['sargos', 1, 12], ['octopus', 10, 5], ['cuttlefish', 2, 5], ['seabass', 11, 3]],
        best: [
          { gear: 'gun_band', spec: '75–90 cm', why: { en: 'Water near the city is often hazy: a short gun along breakwater bases and Posidonia at 2–10 m.', el: 'Τα νερά κοντά στην πόλη είναι συχνά θολά: κοντό όπλο στις βάσεις των μόλων και στην ποσειδωνία στα 2–10 μ.' } },
          { gear: 'spear_float', why: { en: 'Required; heavy boat and jet-ski traffic.', el: 'Υποχρεωτική· πολλή κίνηση σκαφών και τζετ σκι.' } },
        ],
        also: [
          { gear: 'gun_pneu', spec: '60–75 cm', why: { en: 'Holes between breakwater boulders.', el: 'Τρύπες ανάμεσα στις πέτρες των μόλων.' } },
        ],
        tips: { en: 'Most breakwaters are inside summer bathing zones: spear them in autumn–winter. Keep away from the port and marinas (one guide says 500 m) and the Dasoudi and Amathounta MPAs.', el: 'Οι περισσότεροι μόλοι είναι μέσα σε ζώνες λουομένων το καλοκαίρι: ψάρευέ τους φθινόπωρο–χειμώνα. Μακριά από το λιμάνι και τις μαρίνες (ένας οδηγός λέει 500 μ.) και από τις ΘΠΠ Δασουδίου και Αμαθούντας.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Zygi – Mazotos */
  zygi: {
    facts: { coast: { beach: 24, rocky: 27, made: 25, port: 10, mil: 15 }, d10: 0.83, d20: 1.7, d50: 3.6, d100: 5.9, drop: 6.3, pos: 54, rock: 6 },
    character: {
      en: 'A low, mixed coast: rock platforms and coves between Governor’s Beach and Mazotos, the Zygi fishing shelter, Vasilikos port and the naval base, with sand-and-pebble beaches. The gentlest slope on the south coast — 10 m ~800 m out, 20 m ~1.7 km, 100 m ~6 km — over wide Posidonia meadows. Fish farms lie offshore between Governor’s Beach and Zygi.',
      el: 'Χαμηλή, μικτή ακτή: βραχώδεις πλάκες και κολπίσκοι ανάμεσα σε Governor’s Beach και Μαζωτό, το αλιευτικό καταφύγιο του Ζυγίου, το λιμάνι Βασιλικού και η ναυτική βάση, με παραλίες από άμμο και βότσαλο. Η πιο ήπια κλίση στη νότια ακτή — 10 μ. ~800 μ., 20 μ. ~1,7 χλμ., 100 μ. ~6 χλμ. — σε μεγάλα λιβάδια ποσειδωνίας. Ιχθυοκαλλιέργειες στα ανοιχτά, από Governor’s Beach ως Ζύγι.' },
    avoid: {
      en: 'Agios Georgios Alamanou MPA: no fishing at all, even from the shore (shore to 5 m depth). Vasilikos port and the naval base at Zygi are closed. 100 m no-fishing zones round each fish farm.',
      el: 'ΘΠΠ Αγίου Γεωργίου Αλαμάνου: καμία αλιεία, ούτε από την ακτή (από την ακτή ως τα 5 μ. βάθος). Το λιμάνι Βασιλικού και η ναυτική βάση στο Ζύγι είναι κλειστά. Ζώνες 100 μ. χωρίς αλιεία γύρω από κάθε ιχθυοκαλλιέργεια.' },
    sources: ['zygi', 'dom', 'alllim', 'farms', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['sargos', 10, 4], ['parrotfish', 6, 10], ['rabbitfish', 6, 10], ['squid', 11, 3], ['tsipoura', 10, 3], ['melanouri', 4, 10]],
        best: [
          { gear: 'bolognese_rod', spec: '4–6 m', src: 'zygi', why: { en: 'Rock platforms and the shelter breakwater: float for white seabream, saddled seabream and parrotfish.', el: 'Βραχώδεις πλάκες και ο μόλος του καταφυγίου: φελλός για σορκό, μελάνα και σκάρο.' } },
          { gear: 'float_rig', spec: '1–2 g · hook 12–8', why: { en: 'Light float in the shallow surge over the platforms.', el: 'Ελαφρύς φελλός στον ρηχό αφρό πάνω από τις πλάκες.' } },
          { gear: 'algae', why: { en: 'Green weed on a small hook for rabbitfish and salema in summer.', el: 'Φύκι σε μικρό αγκίστρι για κουρκούνες και σάρπες το καλοκαίρι.' } },
          { gear: 'eging_rod', spec: '2.4–2.6 m', src: 'zygi', why: { en: 'Winter squid are a Zygi speciality: dusk on the shelter breakwater.', el: 'Τα χειμωνιάτικα καλαμάρια είναι σπεσιαλιτέ του Ζυγίου: σούρουπο στον μόλο του καταφυγίου.' } },
          { gear: 'reel_spin_s', spec: '2500', why: { en: 'Light reel for float and eging.', el: 'Ελαφρύ μηχανάκι για φελλό και eging.' } },
          { gear: 'shrimp', why: { en: 'Float bait for the bream.', el: 'Δόλωμα φελλού για τα σπαροειδή.' } },
        ],
        also: [
          { gear: 'surf_rod', spec: '4.2–4.5 m · 100–150 g', src: 'data', why: { en: 'Governor’s Beach and Mazotos beaches in winter for gilthead; the slope is gentle, so cast far.', el: 'Governor’s Beach και παραλίες Μαζωτού τον χειμώνα για τσιπούρα· η κλίση είναι ήπια, πέτα μακριά.' } },
          { gear: 'lrf_rod', why: { en: 'Comber and small bream in the rock gullies at night.', el: 'Χάννοι και μικρά σπαροειδή στα κανάλια των βράχων τη νύχτα.' } },
          { gear: 'spinning_rod', why: { en: 'Bluefish and barracuda in autumn from rocky points.', el: 'Γοφάρια και σφύρνες το φθινόπωρο από βραχώδη ακρωτήρια.' } },
        ],
        tips: { en: 'The shelter and its breakwater are the easiest spot; the rock shelf west to Governor’s Beach is quieter. Agios Georgios Alamanou is now an MPA where even shore rods are banned.', el: 'Το καταφύγιο και ο μόλος του είναι το πιο εύκολο σημείο· η βραχώδης ακτή δυτικά ως το Governor’s Beach είναι πιο ήσυχη. Ο Άγιος Γεώργιος Αλαμάνου είναι πλέον ΘΠΠ όπου απαγορεύεται και το καλάμι από την ακτή.' },
      },
      boat: {
        targets: [['amberjack', 6, 11], ['bluefish', 10, 1], ['redmullet', 9, 3], ['pandora', 4, 8], ['squid', 11, 3], ['porgy', 1, 4]],
        best: [
          { gear: 'boat_rod', spec: 'light · 50–100 g', src: 'zygi', why: { en: 'Posidonia and sand at 15–60 m: red mullet, pandora, annular and red porgy — the catches Zygi is known for.', el: 'Ποσειδωνία και άμμος στα 15–60 μ.: στρίλια, λυθρίνι, σπάρος και φαγκρί — τα ψάρια που είναι γνωστό το Ζύγι.' } },
          { gear: 'squid_jig_vertical', src: 'zygi', why: { en: 'Drift at dusk over 15–40 m in winter.', el: 'Ντρίφτ το σούρουπο σε 15–40 μ. τον χειμώνα.' } },
          { gear: 'spinning_rod', spec: '2.4–2.7 m · 20–60 g', src: 'farms', why: { en: 'Casting jigs and poppers at bluefish and amberjack around the farms, outside 100 m.', el: 'Jig ρίψης και popper σε γοφάρια και μινέρια γύρω από τις ιχθυοκαλλιέργειες, έξω από τα 100 μ.' } },
          { gear: 'livebait_rig', why: { en: 'Live bogue near the farms for amberjack.', el: 'Ζωντανή γόππα κοντά στις ιχθυοκαλλιέργειες για μινέρι.' } },
          { gear: 'worm', why: { en: 'Red mullet bait.', el: 'Δόλωμα για στρίλια.' } },
        ],
        also: [
          { gear: 'trolling_rod', why: { en: 'Little tunny in autumn along the 50–100 m line.', el: 'Καρβούνια το φθινόπωρο στη γραμμή των 50–100 μ.' } },
          { gear: 'slow_jig_rod', why: { en: 'Deeper edges 5–6 km out.', el: 'Βαθύτερες άκρες 5–6 χλμ. έξω.' } },
          { gear: 'sabiki', why: { en: 'Live bait first.', el: 'Πρώτα το ζωντανό δόλωμα.' } },
        ],
        tips: { en: 'Long, gentle shelf: 100 m is ~6 km out. Farms draw wild fish especially Jun–Nov; never fish within 100 m of the cages. Keep clear of Vasilikos port traffic and the naval base.', el: 'Μακριά, ήπια υφαλοκρηπίδα: τα 100 μ. είναι ~6 χλμ. έξω. Οι ιχθυοκαλλιέργειες τραβούν άγρια ψάρια ιδίως Ιουν–Νοέ· ποτέ σε 100 μ. από τους κλωβούς. Μακριά από την κίνηση του λιμανιού Βασιλικού και τη ναυτική βάση.' },
      },
      spear: {
        targets: [['octopus', 10, 5], ['parrotfish', 6, 10], ['rabbitfish', 6, 10], ['sargos', 1, 12], ['cuttlefish', 2, 5], ['greymullet', 5, 10]],
        best: [
          { gear: 'gun_band', spec: '75–90 cm', src: 'zygi', why: { en: 'Shallow rock and Posidonia at 2–10 m: parrotfish, rabbitfish, white seabream, octopus.', el: 'Ρηχός βράχος και ποσειδωνία στα 2–10 μ.: σκάροι, κουρκούνες, σορκοί, χταπόδια.' } },
          { gear: 'spear_float', why: { en: 'Required.', el: 'Υποχρεωτική.' } },
          { gear: 'gloves', why: { en: 'Rabbitfish spines are venomous.', el: 'Τα αγκάθια της κουρκούνας είναι δηλητηριώδη.' } },
        ],
        also: [
          { gear: 'gun_pneu', spec: '60 cm', why: { en: 'Holes in the platforms.', el: 'Τρύπες στις πλάκες.' } },
        ],
        tips: { en: 'Good beginner ground: shallow, sheltered reef where amateurs spear alongside the professional fishermen (Zygi). Stay out of the Alamanou MPA and the farm zones.', el: 'Καλό μέρος για αρχάριους: ρηχή, προστατευμένη ξέρα όπου ερασιτέχνες ψαρεύουν δίπλα στους επαγγελματίες. Μακριά από τη ΘΠΠ Αλαμάνου και τις ζώνες των ιχθυοκαλλιεργειών.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Larnaca Bay */
  larnaca: {
    facts: { coast: { beach: 52, rocky: 4, made: 38, port: 5, mil: 2 }, d10: 1.4, d20: 2.1, d50: 3.3, d100: 4.2, drop: 4.6, pos: 39, rock: 3 },
    character: {
      en: 'A wide, shallow bay of sand and Posidonia: long beaches from Mackenzie to Pervolia and along the Dhekelia road, about 70 groynes and breakwaters, Larnaca marina and port, and almost no natural rock. The flattest nearshore of all areas — 10 m only ~1.4 km out, 20 m ~2 km, 100 m ~4 km. Several wrecks, including the Zenobia, are protected.',
      el: 'Πλατύς, ρηχός κόλπος με άμμο και ποσειδωνία: μεγάλες παραλίες από Μακένζι ως Περβόλια και στον δρόμο Δεκέλειας, περίπου 70 μόλοι και κυματοθραύστες, η μαρίνα και το λιμάνι της Λάρνακας, και σχεδόν καθόλου φυσικός βράχος. Ο πιο επίπεδος βυθός κοντά στην ακτή — 10 μ. μόλις στα ~1,4 χλμ., 20 μ. ~2 χλμ., 100 μ. ~4 χλμ. Αρκετά ναυάγια, ανάμεσά τους η Ζηνοβία, προστατεύονται.' },
    avoid: {
      en: 'No fishing within 500 m of the Zenobia wreck, in the artificial-reef MPA with the LEF1 and Elpida wrecks (off the Dhekelia road), or at the desalination plant by the airport. No fishing inside the port. The Dhekelia base coast is military.',
      el: 'Καμία αλιεία σε 500 μ. από το ναυάγιο της Ζηνοβίας, στη ΘΠΠ τεχνητού υφάλου με τα ναυάγια LEF1 και Ελπίδα (στον δρόμο Δεκέλειας), ή στη μονάδα αφαλάτωσης δίπλα στο αεροδρόμιο. Καμία αλιεία μέσα στο λιμάνι. Η ακτή της βάσης Δεκέλειας είναι στρατιωτική.' },
    sources: ['dom', 'fwg', 'zenobia', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['tsipoura', 10, 3], ['sargos', 10, 4], ['seabass', 11, 3], ['cuttlefish', 2, 5], ['squid', 11, 3], ['bluefish', 10, 1], ['greymullet', 5, 10]],
        best: [
          { gear: 'surf_rod', spec: '4.2–4.5 m · 100–200 g', src: 'data', why: { en: 'Very shallow beaches — 10 m is ~1.4 km out — so distance matters: long casts at night, Oct–Mar, for gilthead and white seabream.', el: 'Πολύ ρηχές παραλίες — τα 10 μ. είναι ~1,4 χλμ. έξω — άρα μετράει η απόσταση: μακριές βολές τη νύχτα, Οκτ–Μαρ, για τσιπούρα και σορκό.' } },
          { gear: 'reel_spin_l', spec: '6000–8000', why: { en: 'Big spool for 120 m+ casts.', el: 'Μεγάλη μπομπίνα για βολές 120 μ. και πάνω.' } },
          { gear: 'mono', spec: { en: '0.28–0.30 mm + 0.57 mm shock leader', el: '0,28–0,30 mm + σοκ λίντερ 0,57 mm' }, why: { en: 'Needed for 150–200 g casts.', el: 'Απαραίτητο για βολές 150–200 γρ.' } },
          { gear: 'surf_rig', spec: 'leader 2–3 m · fluoro 0.25–0.30 mm', why: { en: 'Long leader in the shallow wash.', el: 'Μακρύ παράμαλλο στο ρηχό κύμα.' } },
          { gear: 'worm', why: { en: 'Ragworm; crab or mussel for big gilthead.', el: 'Σκουλήκι· καβούρι ή μύδι για μεγάλες τσιπούρες.' } },
          { gear: 'bolognese_rod', spec: '5–7 m', src: 'fwg', why: { en: 'Groynes and the marina wall: float with groundbait for white and saddled seabream and mullet.', el: 'Μόλοι και ο τοίχος της μαρίνας: φελλός με μάλαγρα για σορκό, μελάνα και κέφαλο.' } },
        ],
        also: [
          { gear: 'eging_rod', spec: 'egi 2.5–3.0', why: { en: 'Groynes over Posidonia: cuttlefish Feb–May, squid Nov–Mar.', el: 'Μόλοι πάνω από ποσειδωνία: σουπιές Φεβ–Μάι, καλαμάρια Νοέ–Μαρ.' } },
          { gear: 'spinning_rod', spec: '2.7 m · 10–30 g', why: { en: 'Bluefish and garfish in winter from groyne tips; small spoons and pencils.', el: 'Γοφάρι και βελονίδα τον χειμώνα από τις άκρες των μόλων· μικρά κουταλάκια και pencil.' } },
          { gear: 'lrf_rod', why: { en: 'Marina and pier lights at night.', el: 'Φώτα μαρίνας και προβλήτων τη νύχτα.' } },
          { gear: 'mussel', why: { en: 'Top gilthead bait on the groynes.', el: 'Κορυφαίο δόλωμα για τσιπούρα στους μόλους.' } },
        ],
        tips: { en: 'Fish where groyne tips or dark Posidonia patches break the sand. Local anglers gather at the marina, port and Finikoudes (DOM); bream and mullet take simple bait rigs there (Fishing World Guide).', el: 'Ψάρευε εκεί που οι άκρες των μόλων ή σκούρα κομμάτια ποσειδωνίας σπάνε την άμμο. Οι ντόπιοι μαζεύονται στη μαρίνα, στο λιμάνι και στις Φοινικούδες· εκεί σπαροειδή και κέφαλοι τρώνε σε απλές συνθέσεις με δόλωμα.' },
      },
      boat: {
        targets: [['redmullet', 9, 3], ['pandora', 4, 8], ['littletunny', 8, 11], ['bluefish', 10, 1], ['squid', 11, 3], ['porgy', 1, 4]],
        best: [
          { gear: 'boat_rod', spec: '60–150 g', src: 'data', why: { en: 'Drift sand and mud at 20–60 m for red mullet, pandora and annular seabream.', el: 'Ντρίφτ σε άμμο και λάσπη στα 20–60 μ. για στρίλια, λυθρίνι και σπάρο.' } },
          { gear: 'trolling_rod', why: { en: 'Little tunny, bonito and bluefish in the bay, autumn–winter.', el: 'Καρβούνια, παλαμίδες και γοφάρια στον κόλπο, φθινόπωρο–χειμώνα.' } },
          { gear: 'squid_jig_vertical', why: { en: 'Squid come into the bay in winter: dusk drift over 15–40 m.', el: 'Τα καλαμάρια μπαίνουν στον κόλπο τον χειμώνα: ντρίφτ το σούρουπο σε 15–40 μ.' } },
          { gear: 'reel_spin_m', spec: '3000–4000', why: { en: 'Light bottom and squid work.', el: 'Για ελαφρύ βυθό και καλαμάρια.' } },
          { gear: 'shrimp', why: { en: 'Best all-round bottom bait.', el: 'Το καλύτερο γενικό δόλωμα βυθού.' } },
        ],
        also: [
          { gear: 'slow_jig_rod', why: { en: 'The shelf edge past 100 m, 4–8 km out, for porgy and dentex.', el: 'Η άκρη της υφαλοκρηπίδας πέρα από τα 100 μ., 4–8 χλμ. έξω, για φαγκρί και συναγρίδα.' } },
          { gear: 'spinning_rod', why: { en: 'Cast metals into feeding boils marked by birds.', el: 'Μεταλλικά στα κοπάδια που τρώνε, εκεί που δείχνουν τα πουλιά.' } },
          { gear: 'inchiku', why: { en: 'Pandora and comber on the rough patches.', el: 'Λυθρίνι και χάννος στα τραχιά σημεία.' } },
        ],
        tips: { en: 'Most wrecks here are no-fishing zones (the Zenobia lies at ~42 m, 500 m ban); fish the open sand and the shelf edge instead.', el: 'Τα περισσότερα ναυάγια εδώ είναι ζώνες χωρίς αλιεία (η Ζηνοβία είναι στα ~42 μ., απαγόρευση 500 μ.)· ψάρεψε την ανοιχτή άμμο και την άκρη της υφαλοκρηπίδας.' },
      },
      spear: {
        targets: [['cuttlefish', 2, 5], ['octopus', 10, 5], ['greymullet', 5, 10], ['sargos', 1, 12]],
        best: [
          { gear: 'gun_band', spec: '75–90 cm', why: { en: 'Shallow sand and Posidonia: a short gun for cuttlefish, octopus and mullet.', el: 'Ρηχή άμμος και ποσειδωνία: κοντό όπλο για σουπιές, χταπόδια και κεφάλους.' } },
          { gear: 'spear_float', why: { en: 'Required.', el: 'Υποχρεωτική.' } },
        ],
        also: [
          { gear: 'gun_pneu', spec: '60 cm', why: { en: 'Groyne boulders.', el: 'Πέτρες των μόλων.' } },
        ],
        tips: { en: 'Visibility drops for days after a southerly blow over the muddy bottom. The best rock is around Cape Kiti and Pervolia. A quarter of the coast is bathing area: no spearfishing there in season.', el: 'Η ορατότητα πέφτει για μέρες μετά από νοτιά λόγω του λασπώδους βυθού. Ο καλύτερος βράχος είναι γύρω από το Κάβο Κίτι και τα Περβόλια. Το ένα τέταρτο της ακτής είναι περιοχή λουομένων: όχι ψαροντούφεκο εκεί όσο ισχύει.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Ayia Napa – Cape Greco */
  ayianapa: {
    facts: { coast: { beach: 44, rocky: 41, made: 10, port: 0, mil: 6 }, d10: 0.55, d20: 1.1, d50: 2.1, d100: 3.9, drop: 5.0, pos: 56, rock: 27 },
    character: {
      en: 'Limestone coast with sea caves, low cliffs and rocky points between sandy coves (Makronissos, Nissi, Pantachou, Kermia), Ayia Napa harbour, and the Cape Greco headland. The rockiest seabed of all areas (about a quarter of the 0–40 m bottom is rock) mixed with Posidonia; 20 m about 1.1 km out and 100 m ~4 km, deepening fastest off the cape. Very clear water.',
      el: 'Ασβεστολιθική ακτή με θαλάσσιες σπηλιές, χαμηλούς γκρεμούς και βραχώδη ακρωτήρια ανάμεσα σε αμμουδερούς κολπίσκους (Μακρόνησος, Νησί, Πανταχού, Κερμιά), το λιμάνι της Αγίας Νάπας και το ακρωτήριο Κάβο Γκρέκο. Ο πιο βραχώδης βυθός από όλες τις περιοχές (περίπου το ένα τέταρτο του βυθού 0–40 μ.) με ποσειδωνία· 20 μ. περίπου στα 1,1 χλμ. και 100 μ. ~4 χλμ., πιο απότομα στο ακρωτήριο. Πολύ καθαρά νερά.' },
    avoid: {
      en: 'Cape Greco MPA covers the cape from Kermia beach round to Konnos: recreational fishing is banned in the core and neutral zones — assume the same in the whole reported area. Also no fishing in the Ayia Napa sea-caves MPA east of the harbour (not even from the shore) or the MUSAN underwater-museum MPA. Over half the coast is bathing area in summer.',
      el: 'Η ΘΠΠ Κάβο Γκρέκο καλύπτει το ακρωτήριο από την παραλία Κερμιά ως τον Κόννο: η ερασιτεχνική αλιεία απαγορεύεται στον πυρήνα και στις ουδέτερες ζώνες — θεώρησε το ίδιο σε όλη την περιοχή. Επίσης καμία αλιεία στη ΘΠΠ θαλάσσιων σπηλιών ανατολικά του λιμανιού (ούτε από την ακτή) και στη ΘΠΠ του υποβρύχιου μουσείου MUSAN. Πάνω από τη μισή ακτή είναι περιοχή λουομένων το καλοκαίρι.' },
    sources: ['fbblog', 'dom', 'tui', 'fwg', 'chapel', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['leerfish', 9, 12], ['bluefish', 10, 1], ['littletunny', 8, 11], ['barracuda', 8, 12], ['sargos', 10, 4], ['squid', 11, 3], ['melanouri', 4, 10]],
        best: [
          { gear: 'spinning_rod', spec: '2.7–3 m · 15–50 g', src: 'data', why: { en: 'Rocky points with deep water close in (west of town, and between the sea caves and Kermia): minnows, pencils and casting jigs at first light.', el: 'Βραχώδη ακρωτήρια με βαθιά νερά κοντά (δυτικά της πόλης, και ανάμεσα στις σπηλιές και την Κερμιά): ψαράκια, pencil και jig ρίψης με το πρώτο φως.' } },
          { gear: 'shore_jig_rod', spec: '3 m · 40–100 g', why: { en: 'When little tunny and bluefish run in autumn, 40–60 g metals reach the boils; amberjack too.', el: 'Όταν περνούν καρβούνια και γοφάρια το φθινόπωρο, μεταλλικά 40–60 γρ. φτάνουν στα κοπάδια· και για μινέρι.' } },
          { gear: 'reel_spin_l', spec: '5000–6000', why: { en: 'Fast retrieve and strong drag for pelagics.', el: 'Γρήγορο μάζεμα και δυνατό φρένο για πελαγικά.' } },
          { gear: 'braid', spec: 'PE 1.2–2 + fluoro 0.40–0.60 mm', why: { en: 'Long casts, and a leader against sharp limestone.', el: 'Μακριές βολές, και παράμαλλο για τον κοφτερό ασβεστόλιθο.' } },
          { gear: 'casting_jig', spec: '30–60 g', why: { en: 'Reach the schools; silver in this clear water.', el: 'Φτάνεις τα κοπάδια· ασημί σε αυτά τα καθαρά νερά.' } },
          { gear: 'minnow', spec: '12–14 cm', why: { en: 'Leerfish and barracuda along the rocks at dawn and dusk.', el: 'Λίτσες και σφύρνες στα βράχια χαράματα και σούρουπο.' } },
        ],
        also: [
          { gear: 'bolognese_rod', why: { en: 'Foam off the rocks and the harbour wall for white and saddled seabream.', el: 'Αφρός στα βράχια και στον τοίχο του λιμανιού για σορκό και μελάνα.' } },
          { gear: 'eging_rod', why: { en: 'Harbour and rocky coves at dusk, Nov–Mar; natural colours in clear water.', el: 'Λιμάνι και βραχώδεις κολπίσκοι το σούρουπο, Νοέ–Μαρ· φυσικά χρώματα στα καθαρά νερά.' } },
          { gear: 'stickbait', why: { en: 'Big-fish option on calm mornings.', el: 'Για μεγάλα ψάρια τα ήρεμα πρωινά.' } },
          { gear: 'lrf_rod', why: { en: 'Comber and wrasse in the gullies.', el: 'Χάννοι και γύλοι στα κανάλια.' } },
        ],
        tips: { en: 'Cape Greco’s famous cliffs are almost all inside the MPA, where recreational fishing is banned (FishingBooker): fish the rocks west of town instead. Swell on high rock is dangerous: never fish wet ledges alone.', el: 'Οι γνωστοί γκρεμοί του Κάβο Γκρέκο είναι σχεδόν όλοι μέσα στη ΘΠΠ, όπου απαγορεύεται η ερασιτεχνική αλιεία: ψάρεψε τα βράχια δυτικά της πόλης. Φουσκοθαλασσιά σε ψηλά βράχια είναι επικίνδυνη: ποτέ μόνος σε βρεγμένες πλάκες.' },
      },
      boat: {
        targets: [['littletunny', 8, 11], ['albacore', 6, 8], ['dolphinfish', 8, 11], ['barracuda', 8, 10], ['dentex', 4, 10], ['grouper', 6, 10], ['porgy', 1, 4]],
        best: [
          { gear: 'trolling_rod', spec: '6–8 knots · feathers, skirts, minnows', src: 'tui', why: { en: 'Tuna from early June to mid-August, then barracuda and mackerel to the end of October; dolphinfish late summer–autumn.', el: 'Τόνοι από αρχές Ιουνίου ως μέσα Αυγούστου, μετά σφύρνες και κολιοί ως τέλη Οκτωβρίου· κυνηγοί τέλος καλοκαιριού–φθινόπωρο.' } },
          { gear: 'reel_conv', why: { en: 'Trolling and slow jigging.', el: 'Συρτή και slow jigging.' } },
          { gear: 'mono', spec: { en: '0.40–0.50 mm (trolling)', el: '0,40–0,50 mm (συρτή)' }, why: { en: 'Stretch cushions strikes at trolling speed.', el: 'Η ελαστικότητα απορροφά το χτύπημα στην ταχύτητα της συρτής.' } },
          { gear: 'slow_jig_rod', spec: '120–250 g · 60–150 m', src: 'dom', why: { en: 'Deep reef off the cape, outside the MPA: dentex, groupers, porgy, comber; amberjack in the deep water.', el: 'Βαθιές ξέρες έξω από το ακρωτήριο, εκτός ΘΠΠ: συναγρίδα, ορφός, φαγκρί, χάννος· μινέρι στα βαθιά.' } },
          { gear: 'trolling_skirt', why: { en: 'The offshore tuna and dolphinfish lure.', el: 'Το τεχνητό για τόνους και κυνηγούς στα ανοιχτά.' } },
        ],
        also: [
          { gear: 'jigging_rod', why: { en: 'Amberjack on the deep edges.', el: 'Μινέρι στις βαθιές άκρες.' } },
          { gear: 'boat_rod', why: { en: 'Bottom rigs for pandora and porgy.', el: 'Συνθέσεις βυθού για λυθρίνι και φαγκρί.' } },
          { gear: 'squid_jig_vertical', why: { en: 'Squid at dusk in winter.', el: 'Καλαμάρια το σούρουπο τον χειμώνα.' } },
        ],
        tips: { en: 'Trips leave from Ayia Napa marina and harbour or Pernera (FishingBooker). Fish only outside the MPA lines; north of the cape the Nisia area bans anchoring at 15–40 m.', el: 'Οι έξοδοι γίνονται από τη μαρίνα και το λιμάνι της Αγίας Νάπας ή την Περνέρα. Ψάρευε μόνο έξω από τα όρια της ΘΠΠ· βόρεια του ακρωτηρίου, στην περιοχή Νησιά, απαγορεύεται η αγκυροβόληση στα 15–40 μ.' },
      },
      spear: {
        targets: [['grouper', 6, 10], ['sargos', 1, 12], ['octopus', 10, 5], ['parrotfish', 6, 10], ['lionfish', 5, 11], ['dentex', 5, 9]],
        best: [
          { gear: 'gun_band', spec: '100–110 cm', why: { en: 'Exceptionally clear water: a longer gun for open-water shots at bream, dentex and parrotfish.', el: 'Εξαιρετικά καθαρά νερά: μακρύτερο όπλο για βολές στα ανοιχτά σε σπαροειδή, συναγρίδες και σκάρους.' } },
          { gear: 'gun_pneu', spec: '75 cm', why: { en: 'Caves and holes in the limestone.', el: 'Σπηλιές και τρύπες στον ασβεστόλιθο.' } },
          { gear: 'spear_float', why: { en: 'Required; heavy tourist-boat traffic.', el: 'Υποχρεωτική· πολλή κίνηση τουριστικών σκαφών.' } },
          { gear: 'gloves', src: 'chapel', why: { en: 'Lionfish and morays live on these reefs.', el: 'Λεοντόψαρα και σμέρνες ζουν σε αυτές τις ξέρες.' } },
        ],
        also: [],
        tips: { en: 'The best cape reef (e.g. Chapel, to 40 m, with groupers, bream, lionfish, morays) is inside the MPA — no spearfishing. In season over half the coast is bathing area. Legal ground: rocky stretches west of town and between the sea caves and Kermia, outside the buoyed zones, or further out by boat.', el: 'Οι καλύτερες ξέρες του ακρωτηρίου (π.χ. Chapel, ως 40 μ., με ορφούς, σπαροειδή, λεοντόψαρα, σμέρνες) είναι μέσα στη ΘΠΠ — όχι ψαροντούφεκο. Την περίοδο λουομένων πάνω από τη μισή ακτή απαγορεύεται. Επιτρέπεται: βραχώδη κομμάτια δυτικά της πόλης και ανάμεσα στις σπηλιές και την Κερμιά, έξω από τις σημαδεμένες ζώνες, ή πιο έξω με σκάφος.' },
      },
    },
  },

  /* ------------------------------------------------------------------ Protaras – Paralimni */
  protaras: {
    facts: { coast: { beach: 40, rocky: 24, made: 22, port: 0, mil: 14 }, d10: 0.36, d20: 0.8, d50: 1.5, d100: 3.1, drop: 1.1, pos: 50, rock: 19 },
    character: {
      en: 'Steep coast of small sandy bays (Fig Tree Bay, Vrysi, Pernera, Kapparis) between rocky points, with jetties and the Paralimni fishing shelters. The deepest water close to shore of all areas — 10 m ~350 m out, 20 m ~800 m, 50 m ~1.5 km, 100 m ~3 km — with drop-offs often under 1 km off. Rock and Posidonia; clear water.',
      el: 'Απότομη ακτή με μικρούς αμμουδερούς κόλπους (Συκιά, Βρύση, Περνέρα, Καππαρής) ανάμεσα σε βραχώδη ακρωτήρια, με προβλήτες και τα αλιευτικά καταφύγια του Παραλιμνίου. Τα πιο βαθιά νερά κοντά στην ακτή από όλες τις περιοχές — 10 μ. ~350 μ., 20 μ. ~800 μ., 50 μ. ~1,5 χλμ., 100 μ. ~3 χλμ. — με κατωφέρειες συχνά σε λιγότερο από 1 χλμ. Βράχος και ποσειδωνία· καθαρά νερά.' },
    avoid: {
      en: 'Paralimni artificial-reef MPA (with the Liberty and Nemesis III wrecks): no fishing. The Cape Greco MPA starts at Konnos to the south. Nisia marine area (Konnos–Fig Tree Bay): no anchoring at 15–40 m. Two-thirds of the coast is bathing area in summer. The buffer zone and fenced Famagusta lie to the north.',
      el: 'ΘΠΠ τεχνητού υφάλου Παραλιμνίου (με τα ναυάγια Liberty και Nemesis III): καμία αλιεία. Νότια, από τον Κόννο, αρχίζει η ΘΠΠ Κάβο Γκρέκο. Θαλάσσια περιοχή Νησιά (Κόννος–Συκιά): απαγόρευση αγκυροβόλησης στα 15–40 μ. Τα δύο τρίτα της ακτής είναι περιοχή λουομένων το καλοκαίρι. Βόρεια βρίσκονται η νεκρή ζώνη και η περιφραγμένη Αμμόχωστος.' },
    sources: ['fwg', 'fbblog', 'tui', 'data', 'kdp'],
    methods: {
      shore: {
        targets: [['littletunny', 8, 11], ['bluefish', 10, 1], ['barracuda', 8, 12], ['squid', 11, 3], ['sargos', 10, 4], ['melanouri', 4, 10], ['amberjack', 6, 11]],
        best: [
          { gear: 'spinning_rod', spec: '2.7–3 m · 15–50 g', src: 'data', why: { en: 'Deep water within a cast of the points: little tunny, bluefish and barracuda chasing bait in autumn.', el: 'Βαθιά νερά σε απόσταση βολής από τα ακρωτήρια: καρβούνια, γοφάρια και σφύρνες κυνηγούν τροφή το φθινόπωρο.' } },
          { gear: 'shore_jig_rod', spec: '3 m · 40–80 g', src: 'data', why: { en: 'Drop-offs a few hundred metres out put amberjack in range of heavy metals.', el: 'Κατωφέρειες λίγες εκατοντάδες μέτρα έξω φέρνουν το μινέρι στην εμβέλεια βαριών μεταλλικών.' } },
          { gear: 'eging_rod', spec: '2.4–2.6 m · egi 2.5–3.5', why: { en: 'Deep water close in brings squid under the rocks and jetties at dusk, Nov–Mar.', el: 'Τα βαθιά κοντά στην ακτή φέρνουν καλαμάρια κάτω από τα βράχια και τις προβλήτες το σούρουπο, Νοέ–Μαρ.' } },
          { gear: 'reel_spin_l', spec: '5000–6000', why: { en: 'Pelagics run hard; a 4000 does for eging.', el: 'Τα πελαγικά τραβούν δυνατά· για eging αρκεί ένα 4000.' } },
          { gear: 'casting_jig', spec: '30–60 g', why: { en: 'The lure for surface boils.', el: 'Το τεχνητό για τα κοπάδια στην επιφάνεια.' } },
          { gear: 'egi', spec: '2.5–3.5', why: { en: 'Natural colours by day in clear water; orange or pink at dusk.', el: 'Φυσικά χρώματα τη μέρα στα καθαρά νερά· πορτοκαλί ή ροζ το σούρουπο.' } },
        ],
        also: [
          { gear: 'bolognese_rod', why: { en: 'Foam off the rocky points for white and saddled seabream.', el: 'Αφρός στα βραχώδη ακρωτήρια για σορκό και μελάνα.' } },
          { gear: 'lrf_rod', why: { en: 'Jetties and the shelter at night.', el: 'Προβλήτες και καταφύγιο τη νύχτα.' } },
          { gear: 'popper', why: { en: 'Calm early mornings off the points.', el: 'Ήρεμα πρωινά μπροστά στα ακρωτήρια.' } },
        ],
        tips: { en: 'The rocky points between the bays fish best at first light, before swimmers arrive. Jetties are busy in summer: fish them at night or off-season.', el: 'Τα βραχώδη ακρωτήρια ανάμεσα στους κόλπους αποδίδουν με το πρώτο φως, πριν έρθουν οι λουόμενοι. Οι προβλήτες έχουν κόσμο το καλοκαίρι: ψάρευέ τες νύχτα ή εκτός σεζόν.' },
      },
      boat: {
        targets: [['grouper', 6, 10], ['amberjack', 6, 11], ['dentex', 4, 10], ['littletunny', 8, 11], ['dolphinfish', 9, 11], ['albacore', 6, 8], ['squid', 11, 3]],
        best: [
          { gear: 'slow_jig_rod', spec: '120–250 g', src: 'fwg', why: { en: '100 m is only ~3 km out, the shortest run to deep reef on the island: groupers, amberjack, dentex.', el: 'Τα 100 μ. είναι μόλις ~3 χλμ. έξω, η πιο κοντινή βαθιά ξέρα στο νησί: ορφοί, μινέρια, συναγρίδες.' } },
          { gear: 'jigging_rod', spec: 'metal jigs 150–250 g', src: 'fwg', why: { en: 'Amberjack on the edges.', el: 'Μινέρι στις άκρες.' } },
          { gear: 'reel_conv', why: { en: 'For slow jigging and trolling.', el: 'Για slow jigging και συρτή.' } },
          { gear: 'trolling_rod', src: 'tui', why: { en: 'Tuna Jun–mid Aug, then barracuda and mackerel to October; little tunny and dolphinfish in autumn.', el: 'Τόνοι Ιούν–μέσα Αυγ, μετά σφύρνες και κολιοί ως τον Οκτώβριο· καρβούνια και κυνηγοί το φθινόπωρο.' } },
          { gear: 'livebait_rig', why: { en: 'Live bogue on the drop-off for amberjack and dentex.', el: 'Ζωντανή γόππα στην κατωφέρεια για μινέρι και συναγρίδα.' } },
        ],
        also: [
          { gear: 'squid_jig_vertical', why: { en: 'Dusk drift over 20–60 m in winter.', el: 'Ντρίφτ το σούρουπο σε 20–60 μ. τον χειμώνα.' } },
          { gear: 'boat_rod', why: { en: 'Bottom rigs for pandora and porgy.', el: 'Συνθέσεις βυθού για λυθρίνι και φαγκρί.' } },
          { gear: 'tai_rubber', why: { en: 'Porgy and dentex on the edges.', el: 'Φαγκρί και συναγρίδα στις άκρες.' } },
        ],
        tips: { en: 'Boats leave from Pernera, the Paralimni shelters and Ayia Napa. No anchoring at 15–40 m in the Nisia area; don’t fish the Liberty and Nemesis III wrecks (MPA).', el: 'Τα σκάφη βγαίνουν από Περνέρα, τα καταφύγια του Παραλιμνίου και την Αγία Νάπα. Όχι αγκυροβόληση στα 15–40 μ. στην περιοχή Νησιά· όχι ψάρεμα στα ναυάγια Liberty και Nemesis III (ΘΠΠ).' },
      },
      spear: {
        targets: [['grouper', 6, 10], ['dentex', 5, 9], ['amberjack', 6, 10], ['sargos', 1, 12], ['octopus', 10, 5], ['lionfish', 5, 11]],
        best: [
          { gear: 'gun_band', spec: '100–110 cm', why: { en: 'Clear water and steep rock: long shots at fish on the drop-off.', el: 'Καθαρά νερά και απότομος βράχος: μακριές βολές σε ψάρια στην κατωφέρεια.' } },
          { gear: 'gun_pneu', spec: '75–90 cm', why: { en: 'Holes and ledges for groupers.', el: 'Τρύπες και σπηλιές για ορφούς.' } },
          { gear: 'spear_float', why: { en: 'Essential: summer boat and jet-ski traffic is heavy.', el: 'Απαραίτητη: πολλή κίνηση σκαφών και τζετ σκι το καλοκαίρι.' } },
        ],
        also: [
          { gear: 'gloves', why: { en: 'Lionfish and scorpionfish spines.', el: 'Αγκάθια λεοντόψαρων και σκορπιών.' } },
        ],
        tips: { en: 'Drop-offs a few hundred metres out suit experienced freedivers. Bathing zones cover two-thirds of the coast in season, so spear the rocky stretches between them, or come in autumn–winter.', el: 'Κατωφέρειες λίγες εκατοντάδες μέτρα έξω, για έμπειρους. Οι ζώνες λουομένων καλύπτουν τα δύο τρίτα της ακτής την περίοδο που ισχύουν: ψάρεψε τα βραχώδη κομμάτια ανάμεσα ή έλα φθινόπωρο–χειμώνα.' },
      },
    },
  },
};
