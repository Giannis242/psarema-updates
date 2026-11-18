// Psarema: PROPOSED extra ecology per species, for inputs other parts of the app are building. Nothing reads this file yet:
// the integrator decides whether and how to wire each field. null = no basis found. Values come from literature (each
// species' "sources"); values the notes call "inferred" or "reasoned" are expert judgement, not measurements.
//   turbidityPref  0..1   0 needs clear water, 0.5 indifferent, 1 seeks turbid water (e.g. vs Kd490 / plume maps)
//   fishFarm       0..1   attraction to sea-cage fish farms (attractor, like structure: 1 - prod(1 - aff * strength))
//   riverMouth     0..1   attraction to river mouths and winter runoff plumes
//   artificialReef 0..1   attraction to artificial reefs, wrecks (e.g. Zenobia) and breakwaters
//   posidoniaEdge  0..1   preference for Posidonia meadow edges / meadow-sand-rock mosaics (per species, vs the per-group edge weight)
//   tempDrop      -1..1   response to SST falling >= 2 degC within ~3 days: -1 stops feeding or leaves, +1 triggers feeding/arrival
//   postStorm     -1..1   1-3 days after a storm while the sea calms and is still stirred: + feeding boost, - avoidance
//   salinity      [min, max] psu tolerated (Levantine surface ~38.8-39.5, up to ~39.7 in late summer). Mostly AquaMaps occurrence
//                 envelopes, not physiological limits: treat the max as soft, never as a cut-off around Cyprus.
//   oxygenMin      mg/L   approximate lower tolerance
//   thermocline    0..1   association with the seasonal thermocline (summer ~20-60 m off Cyprus)
//   depthSeasonal  [{ months: [1-based], depth: [min, fullFrom, fullTo, max] }]: seabed-depth trapezoids that replace "depth" in those months
window.PSAREMA_ECOLOGY_EXTRA = {
  "sargos": {
    "turbidityPref": 0.5,
    "fishFarm": 0.6,
    "riverMouth": 0.3,
    "artificialReef": 0.8,
    "posidoniaEdge": 0.6,
    "tempDrop": null,
    "postStorm": 0.4,
    "salinity": [16.3, 39.3],
    "oxygenMin": null,
    "thermocline": 0.1,
    "depthSeasonal": [{ "months": [3, 4], "depth": [0, 2, 50, 70] }],
    "notes": "Surf-zone feeder: shelters during big storms, then returns to its home range within about a day (Medes telemetry), so a positive postStorm effect is plausible but rests on angler knowledge. Salinity is the AquaMaps surface envelope (FishBase lists brackish). Mar-Apr spawning pulses to deeper aggregation sites (20-50+ m), modelled as depthSeasonal. fishFarm, artificialReef and turbidity values are reasoned from its rocky/structure habit and euryhalinity, not from Cyprus data. fishFarm 0.6: D. sargus up to ~880 per count at some farms (Dempster 2002).",
    "sources": [
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC4954665/",
      "https://www.aquamaps.org/premap.php?SpecID=Fis-58308&cache=1",
      "https://www.fishbase.se/summary/Diplodus-sargus.html",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "tsipoura": {
    "turbidityPref": 0.6,
    "fishFarm": 0.7,
    "riverMouth": 0.6,
    "artificialReef": 0.5,
    "posidoniaEdge": 0.6,
    "tempDrop": 0.3,
    "postStorm": 0.3,
    "salinity": [15.6, 39.2],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": [{ "months": [11, 12, 1], "depth": [0, 5, 50, 100] }],
    "notes": "Euryhaline and eurythermal; uses lagoons and estuaries (FAO, FishBase), hence turbidity and riverMouth > 0.5. Autumn cooling drives the return to the sea and offshore winter spawning (FAO; Egypt), hence the positive tempDrop and the deeper winter range. fishFarm: cage escapees plus wild fish around farms; not quantified for Cyprus. Salinity is the AquaMaps surface envelope. fishFarm 0.7: S. aurata counted in hundreds at farms (Dempster 2002); farm escapees add to it.",
    "sources": [
      "https://www.fao.org/fishery/docs/CDrom/aquaculture/I1129m/file/en/en_giltheadseabr.htm",
      "https://www.aquamaps.org/premap.php?SpecID=Fis-6123&cache=1",
      "https://journals.ekb.eg/article_59206.html",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "grouper": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": 0.1,
    "artificialReef": 0.6,
    "posidoniaEdge": 0.2,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [30, 39.5],
    "oxygenMin": null,
    "thermocline": 0.3,
    "depthSeasonal": null,
    "notes": "riverMouth low: FishBase says it can enter brackish water (mainly juveniles). artificialReef: artificial reefs provide shelter and food for juveniles (La Mesa 2008). Storms: telemetry showed high sensitivity of behaviour to storms but the direction was not reported (Lenfant et al. 2007), so postStorm stays null. Thermocline: spawning happens when surface water is 25-26 degC and water at 20 m is 17-19 degC, with vertical spawning rises of 4-8 m above 20 degC (Hereu 2006; Koeck 2014); depth otherwise changes only seasonally (Koeck 2014). Salinity from the AquaMaps envelope (17.9-39.25, preferred 30.9-38.4) plus Levantine presence.",
    "sources": [
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-26140",
      "https://eprints.gla.ac.uk/173674",
      "https://int-res.com/articles/meps2006/325/m325p187.pdf",
      "https://proceedings.gcfi.org/proceedings/acoustic-telemetry-survey-of-the-dusky-grouper-epinephelus-marginatus-in-the-marine-reserve-of-cerbere-banyuls-implications-on-the-colonization-of-the-no-protected-areas-and-on-dynamics-from-reprod/",
      "https://scientiamarina.revistas.csic.es/index.php/scientiamarina/article/view/1032",
      "https://www.fishbase.se/summary/Epinephelus-marginatus.html"
    ]
  },
  "dentex": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": 0.5,
    "tempDrop": -0.4,
    "postStorm": null,
    "salinity": [35, 40],
    "oxygenMin": null,
    "thermocline": 0.9,
    "depthSeasonal": [{ "months": [6, 7, 8, 9], "depth": [5, 15, 40, 100] }, { "months": [10, 11, 12, 1, 2, 3, 4, 5], "depth": [5, 20, 60, 150] }],
    "notes": "Thermocline: during summer stratification fish stay in the warm layer above the thermocline and move up when it rises (up to 20 m and 10 degC swings within days), day and night (Aspillaga 2017). tempDrop negative: cold upwelling or a rising thermocline pushes fish shallower and away from their usual depth; the effect on feeding is inferred, not measured. depthSeasonal from the same study (summer depth set by the thermocline, otherwise each fish's usual 5-45 m range). Salinity from AquaMaps (15.6-40.2, preferred 35.0-38.8). Young are gregarious and adults solitary (FishBase); dentex seen in schools of up to 30 in Spanish reserves.",
    "sources": [
      "https://doi.org/10.1038/s41598-017-00576-z",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23108",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC5764311/"
    ]
  },
  "amberjack": {
    "turbidityPref": null,
    "fishFarm": 0.6,
    "riverMouth": 0.1,
    "artificialReef": 0.8,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [32, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "artificialReef: reef-associated adults, and juveniles aggregate under floating objects and FADs (FishBase; Morales-Nin 2000), so wrecks and FADs attract them. salinity: AquaMaps surface salinity preferred 32.05-37.22, max 39.25; extended to 39.5 because the species is common in the Levant. riverMouth: only 'occasionally entering coastal bays' (FishBase). The spawning season (May-Jul) suggests some offshore-bank aggregation, but no depth-by-season data were found. fishFarm 0.6: Seriola dumerili a dominant farm taxon at some farms (Dempster 2002).",
    "sources": [
      "https://www.aquamaps.org/preMap2.php?cache=1&SpecID=Fis-23806",
      "https://www.fishbase.se/summary/Seriola-dumerili.html",
      "https://archimer.ifremer.fr/doc/00042/15286",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "dolphinfish": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": 0,
    "artificialReef": 0.3,
    "posidoniaEdge": null,
    "tempDrop": -0.5,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0.1,
    "depthSeasonal": null,
    "notes": "Strongly associated with floating objects and FADs (FishBase; Med FAD fishery), but not with seabed structure; artificialReef is low because wrecks are not floating. thermocline: tagged fish stayed within the mixed layer, limited to about 3 C below SST (Lin et al. 2020). tempDrop: Med presence ends when autumn SST falls toward ~16-18 C (Alemany & Massuti 1998), so sharp cooling should reduce catches. Front/chlorophyll affinity is widely assumed, but no Mediterranean study was fetched.",
    "sources": [
      "https://archimer.ifremer.fr/doc/00042/15286",
      "https://ideas.repec.org/a/gam/jsusta/v12y2020i14p5793-d386524.html",
      "https://scientiamarina.revistas.csic.es/index.php/scientiamarina/article/download/960/1002/980"
    ]
  },
  "albacore": {
    "turbidityPref": 0.2,
    "fishFarm": null,
    "riverMouth": 0,
    "artificialReef": 0.1,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0.8,
    "depthSeasonal": null,
    "notes": "Epi- and mesopelagic; abundant at the surface in 15.6-19.4 C, and large fish go deeper into 13.5-25.2 C (FishBase). In the hot Levantine summer this points to strong thermocline association, but no Levantine tagging data were found. Schools may associate with floating objects (FishBase). turbidityPref: oceanic clear water.",
    "sources": [
      "https://www.fishbase.se/summary/Thunnus-alalunga.html",
      "https://www.frontiersin.org/articles/10.3389/fmars.2022.868464/full"
    ]
  },
  "leerfish": {
    "turbidityPref": 0.6,
    "fishFarm": 0.4,
    "riverMouth": 0.7,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "Adults use coastal waters including estuaries and occasionally enter lower river reaches; juveniles often enter estuaries (FishBase). In South Africa the species is estuary-dependent (Murray et al. 2018), hence riverMouth 0.7 and a mild preference for turbid water. Cyprus has few permanent rivers, so this applies mainly to winter runoff plumes. No Mediterranean data on spawning season or diel activity were found. fishFarm 0.4: Lichia amia present at some farms (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Lichia-amia.html",
      "https://cdnsciencepub.com/doi/abs/10.1139/cjfas-2017-0361",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "barracuda": {
    "turbidityPref": null,
    "fishFarm": 0.3,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "The web-search budget ran out before diel-activity, spawning or seasonality studies for Mediterranean barracudas could be checked. Activity (crepuscular/nocturnal) and season stay estimated. fishFarm 0.3: Sphyraena sphyraena recorded at farms (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Sphyraena-viridensis.html",
      "https://www.rac-spa.org/sites/default/files/doc_medkey2/mpa_sparac_cyprus.pdf",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "parrotfish": {
    "turbidityPref": 0.3,
    "fishFarm": null,
    "riverMouth": 0,
    "artificialReef": 0.4,
    "posidoniaEdge": 0.4,
    "tempDrop": -0.4,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0.1,
    "depthSeasonal": null,
    "notes": "Inferred, not measured: a light-dependent diurnal grazer of shallow algal rock, so clear water helps (turbidityPref 0.3). Warm-water affinity suggests a sharp cold snap lowers activity (tempDrop -0.4). Breakwaters carry algal turf (artificialReef 0.4). No Cyprus data for fish farms or storms.",
    "sources": [
      "https://doi.org/10.1007/s11160-022-09697-9",
      "https://www.fishbase.se/summary/Sparisoma-cretense.html",
      "https://agris.fao.org/search/en/records/66e96518cd53c72de2cad7dc"
    ]
  },
  "rabbitfish": {
    "turbidityPref": 0.4,
    "fishFarm": null,
    "riverMouth": 0.1,
    "artificialReef": 0.6,
    "posidoniaEdge": 0.6,
    "tempDrop": -0.5,
    "postStorm": null,
    "salinity": [33, 45],
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "tempDrop -0.5: feeding stops at 14 degC (Saoud 2008), so cold snaps toward that value cut feeding. Salinity: established in the hypersaline Bardawil lagoon and the Suez Canal lakes (spawning studies there), so it tolerates salinity well above the Levantine 39. Acoustic telemetry in Israel showed larger home ranges and weaker site fidelity in the Med than in the Red Sea (Pickholtz et al. 2018), so expect patchy, roaming schools. artificialReef 0.6 is inferred because breakwaters carry the algal turf it grazes.",
    "sources": [
      "https://wicri-demo.istex.fr/Wicri/Eau/explor/LotaV3/Site/fr/Main/Exploration/bibRecord.php?hk=000701",
      "https://ciesm.org/atlas/fishes_2nd_edition/Siganus_rivulatus.pdf",
      "https://cris.iucc.ac.il/en/publications/habitat-utilization-by-an-invasive-herbivorous-fish-siganus-rivul/"
    ]
  },
  "lionfish": {
    "turbidityPref": 0.4,
    "fishFarm": null,
    "riverMouth": 0,
    "artificialReef": 1,
    "posidoniaEdge": 0.1,
    "tempDrop": -0.5,
    "postStorm": null,
    "salinity": [37.5, 41.5],
    "oxygenMin": null,
    "thermocline": 0.2,
    "depthSeasonal": null,
    "notes": "artificialReef 1: wrecks, breakwaters and artificial reefs are its main Cyprus habitats (Kletou 2016; Savva 2020). posidoniaEdge 0.1: not seen in Posidonia. tempDrop -0.5: feeding stops near 16 degC (Kimball 2004). Salinity: an establishment model gives a threshold near 39.1 psu (Klaoudatos 2025), and native Red Sea water is about 40-41 psu. RELIONMED removal records (May 2020) list 21 degC bottom water at 1-26 m.",
    "sources": [
      "https://int-res.com/abstracts/meps/v283/p269-278",
      "https://www.mdpi.com/2076-3263/15/9/361",
      "https://doi.org/10.1186/s41200-016-0065-y",
      "https://iucn-medmis.org/en/node/4043"
    ]
  },
  "squid": {
    "turbidityPref": 0.3,
    "fishFarm": null,
    "riverMouth": 0.2,
    "artificialReef": 0.5,
    "posidoniaEdge": 0.4,
    "tempDrop": 0.3,
    "postStorm": null,
    "salinity": [32, 39.5],
    "oxygenMin": null,
    "thermocline": 0.4,
    "depthSeasonal": [{ "months": [12, 1, 2, 3, 4], "depth": [2, 5, 50, 120] }, { "months": [5, 6, 7, 8, 9, 10, 11], "depth": [10, 30, 150, 300] }],
    "notes": "artificialReef: in Cabrera, eggs were laid on artificial spawning attractors, and FAO says eggs go on hard objects on sand. tempDrop +0.3: autumn-winter cooling of coastal water triggers the inshore spawning migration (CIESM 2013). Salinity is from the AquaMaps preferred range (32-38.4) extended to Levantine values. Loliginids stay near the bottom by day and rise into mid-water at night (FAO survey report), so there is a moderate thermocline link. The seasonal depths come from FAO (deeper in late autumn, inshore from Jan) and CIESM 2013 (shallow spawning in cold months, deeper in warm months). turbidityPref is a reasoned guess: a visual predator that is caught with lights and jigs.",
    "sources": [
      "https://www.fao.org/4/ac479e/ac479e17.pdf",
      "https://www.ciesm.org/online/archives/abstracts/pdf/40/PG_0617.pdf",
      "https://www.fao.org/3/X3950E/X3950E11.htm",
      "https://www.aquamaps.org/premap.php?expert_id=33&SpecID=W-Msc-140271&cache=1"
    ]
  },
  "cuttlefish": {
    "turbidityPref": 0.4,
    "fishFarm": null,
    "riverMouth": 0.3,
    "artificialReef": 0.4,
    "posidoniaEdge": 0.8,
    "tempDrop": -0.3,
    "postStorm": null,
    "salinity": [30, 39.5],
    "oxygenMin": null,
    "thermocline": 0.2,
    "depthSeasonal": [{ "months": [11, 12, 1], "depth": [5, 20, 80, 150] }, { "months": [2, 3, 4, 5, 6, 7], "depth": [0, 1, 25, 50] }],
    "notes": "posidoniaEdge: spawns inshore and attaches eggs to seaweed and seagrass next to the sand it buries in (FAO, SeaLifeBase). riverMouth 0.3: SeaLifeBase notes tolerance of brackish water (Portuguese records). tempDrop -0.3: autumn cooling starts the gradual descent offshore (FAO). The winter depth comes from the Adriatic wintering depth of 50-60 m (CIESM 2004) and from SeaLifeBase (shelf grounds around 100 m in autumn-winter). The spring-summer depth comes from Adriatic spawning at 10-30 m. Salinity is from the reviewed AquaMaps preferred range (32-38.1), extended for brackish tolerance and Levantine values.",
    "sources": [
      "https://www.fao.org/4/ac479e/ac479e09.pdf",
      "https://ciesm.org/online/archives/abstracts/pdf/37/CIESM_Congress_2004_Barcelona_article_0373.htm",
      "https://www.sealifebase.se/summary/Sepia-officinalis.html",
      "https://www.aquamaps.org/premap.php?expert_id=33&SpecID=W-Msc-141444&cache=1"
    ]
  },
  "octopus": {
    "turbidityPref": 0.4,
    "fishFarm": null,
    "riverMouth": 0.1,
    "artificialReef": 0.8,
    "posidoniaEdge": 0.5,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [32, 40],
    "oxygenMin": null,
    "thermocline": 0.1,
    "depthSeasonal": null,
    "notes": "artificialReef 0.8: den-limited species. In Greece it uses dens on soft sediment, and Papadopoulo et al. found switching between dens. Pots are its traditional fishery (FAO). riverMouth is low because cephalopods are stenohaline. Salinity is the AquaMaps preferred 32.1-37.8 with max 39.4, extended to Levantine values. No seasonal depth migration was reported in the E Med census (5-25 m transects).",
    "sources": [
      "https://doi.org/10.1016/j.icesjms.2005.07.004",
      "https://doi.org/10.1186/s40317-024-00361-6",
      "https://www.aquamaps.org/premap.php?cache=1&SpecID=W-Msc-140605"
    ]
  },
  "twoband": {
    "turbidityPref": null,
    "fishFarm": 0.3,
    "riverMouth": 0.3,
    "artificialReef": 0.8,
    "posidoniaEdge": 0.5,
    "tempDrop": null,
    "postStorm": 0.3,
    "salinity": [17.7, 39.25],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "FishBase calls it euryhaline, hence a small riverMouth value. Juveniles use seagrass, hence the meadow-edge value. Salinity is the AquaMaps surface envelope. Activity is still unsourced: no diel study was found for this species, so the current values (generic diurnal Diplodus) stay. fishFarm 0.3: D. vulgaris present but scarce at farms (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Diplodus-vulgaris.html",
      "https://www.aquamaps.org/premap.php?SpecID=Fis-23480&cache=1",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "annular": {
    "turbidityPref": null,
    "fishFarm": 0.4,
    "riverMouth": 0.3,
    "artificialReef": 0.4,
    "posidoniaEdge": 0.9,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [15, 40.4],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "A seagrass and sand-mosaic species (FishBase), hence the high posidoniaEdge. It also uses Zostera/Cymodocea, which EUSeaMap may class as sand. FishBase lists brackish, hence the small riverMouth. Salinity is the AquaMaps surface envelope. fishFarm 0.4: D. annularis at farms (Dempster 2002) and second species in the Aegean cage bogue fishery (Gulluk Bay 2024).",
    "sources": [
      "https://www.fishbase.se/summary/Diplodus-annularis.html",
      "https://www.aquamaps.org/premap.php?SpecID=Fis-23475&cache=1",
      "https://doi.org/10.3354/meps242237",
      "https://doi.org/10.2478/cjf-2024-0019"
    ]
  },
  "sharpsnout": {
    "turbidityPref": null,
    "fishFarm": 0.5,
    "riverMouth": 0.2,
    "artificialReef": 0.7,
    "posidoniaEdge": 0.4,
    "tempDrop": null,
    "postStorm": 0.4,
    "salinity": [28.4, 39.3],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "Surf-zone adults (FishBase), so a positive postStorm effect is plausible (based on angler knowledge). Young can occur in brackish water and littoral pools (FishBase). Salinity is the AquaMaps surface envelope. No diel study was found. fishFarm 0.5: D. puntazzo ~130 per count at one farm (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Diplodus-puntazzo.html",
      "https://www.aquamaps.org/premap.php?SpecID=Fis-23478&cache=1",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "melanouri": {
    "turbidityPref": 0.3,
    "fishFarm": 0.7,
    "riverMouth": null,
    "artificialReef": 0.8,
    "posidoniaEdge": 0.5,
    "tempDrop": null,
    "postStorm": 0.3,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "A visual diurnal zooplanktivore in the water column above rock (Lebanon UVC), hence a slight clear-water preference. fishFarm, artificialReef and postStorm are reasoned from its habit and from angler knowledge (choppy water, groundbait). No AquaMaps envelope: FishBase lists it as Oblada melanurus with no envelope link. fishFarm 0.7: Oblada melanura among the 6 dominant farm taxa (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Oblada-melanura.html",
      "https://doi.org/10.1515/ohs-2020-0002",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "salema": {
    "turbidityPref": null,
    "fishFarm": 0.5,
    "riverMouth": null,
    "artificialReef": 0.5,
    "posidoniaEdge": 0.8,
    "tempDrop": null,
    "postStorm": -0.2,
    "salinity": [17.7, 39.25],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "During a major storm, tagged salema moved to deep sheltered areas (Pages et al., cited in Aspillaga et al. 2016), hence a slightly negative postStorm. Strong homing: fish returned to their site within 48 h (Jadot et al. 2006). In the Levant, S. salpa has declined sharply and is now rarely seen on the Lebanese coast, probably through competition with Lessepsian siganids (Harmelin-Vivien et al. 2005; Bariche et al.), so Cyprus abundance may be lower than in the W Med. Salinity is the AquaMaps surface envelope. fishFarm 0.5: Sarpa salpa among the 6 dominant farm taxa (Dempster 2002).",
    "sources": [
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC4954665/",
      "https://hal.archives-ouvertes.fr/hal-00094513",
      "https://www.fishbase.se/summary/Sarpa-salpa.html",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "bogue": {
    "turbidityPref": 0.5,
    "fishFarm": 0.9,
    "riverMouth": null,
    "artificialReef": 0.7,
    "posidoniaEdge": 0.3,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [5.2, 39.25],
    "oxygenMin": null,
    "thermocline": 0.4,
    "depthSeasonal": null,
    "notes": "Bogue is widely reported as the dominant wild fish around Mediterranean sea-cage farms (e.g. Dempster et al. 2002, MEPS; not re-fetched this session), hence fishFarm 0.9. Its diel vertical migration (night rise, FishBase) suggests some association with the thermocline in summer. Salinity is the AquaMaps surface envelope. Lm50 is 12-14 cm in Egypt. fishFarm 0.9: most abundant wild fish at Med cage farms (Dempster 2002); targeted bogue gillnet fishery at Aegean cages, 92% of catch (Gulluk Bay 2024).",
    "sources": [
      "https://www.fishbase.se/summary/Boops-boops.html",
      "https://cyprusturtles.org/uploads/home/file/Behavioural_patterns,_spatial_utilization_and_landings_composition_of_a_small-scale_fishery_in_the_eastern_Mediterranean.pdf",
      "https://doi.org/10.3354/meps242237",
      "https://doi.org/10.2478/cjf-2024-0019"
    ]
  },
  "porgy": {
    "turbidityPref": null,
    "fishFarm": 0.3,
    "riverMouth": null,
    "artificialReef": 0.6,
    "posidoniaEdge": 0.3,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [22.1, 40.5],
    "oxygenMin": null,
    "thermocline": 0.2,
    "depthSeasonal": null,
    "notes": "Young use seagrass (FishBase), hence the small posidoniaEdge value. Rare in shallow Levant UVC, so Cyprus fish are mostly on deeper rocky banks. Salinity is the AquaMaps surface envelope. No diel study was found (current values are generic for a diurnal visual predator).",
    "sources": [
      "https://www.fishbase.se/summary/Pagrus-pagrus.html",
      "https://www.aquamaps.org/premap.php?SpecID=Fis-23707&cache=1"
    ]
  },
  "pandora": {
    "turbidityPref": 0.5,
    "fishFarm": 0.3,
    "riverMouth": null,
    "artificialReef": 0.4,
    "posidoniaEdge": 0.3,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [16.3, 40.6],
    "oxygenMin": null,
    "thermocline": 0.3,
    "depthSeasonal": [{ "months": [12, 1, 2, 3], "depth": [10, 40, 150, 250] }, { "months": [4, 5, 6, 7, 8, 9, 10, 11], "depth": [5, 15, 100, 200] }],
    "notes": "Winter offshore shift (FishBase) is modelled as depthSeasonal. Juveniles concentrate in shallower water (MEDITS). Mean length falls from west to east in MEDITS, so E-Med fish are smaller. Salinity is the AquaMaps surface envelope. fishFarm 0.3: community-level: demersal fish abundance/biomass higher within 2-3 nmi of E-Med farms in spring (Machias 2005).",
    "sources": [
      "https://www.fishbase.se/summary/Pagellus-erythrinus.html",
      "https://scientiamarina.revistas.csic.es/index.php/scientiamarina/article/download/609/623/622",
      "https://doi.org/10.3354/meps288241"
    ]
  },
  "blackbream": {
    "turbidityPref": null,
    "fishFarm": 0.4,
    "riverMouth": null,
    "artificialReef": 0.6,
    "posidoniaEdge": 0.6,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [5.2, 39.25],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "Uses a seagrass/rock/sand mosaic and nests on sand in spring (FishBase), hence the meadow-edge preference. Salinity is the AquaMaps surface envelope (min reflects the Black Sea/Baltic margin).",
    "sources": [
      "https://www.fishbase.se/summary/Spondyliosoma-cantharus.html",
      "https://www.aquamaps.org/premap.php?SpecID=Fis-23826&cache=1"
    ]
  },
  "redmullet": {
    "turbidityPref": 0.6,
    "fishFarm": 0.3,
    "riverMouth": 0.4,
    "artificialReef": 0.1,
    "posidoniaEdge": 0.2,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [36, 39.5],
    "oxygenMin": null,
    "thermocline": 0.2,
    "depthSeasonal": null,
    "notes": "Muddy-bottom specialist. MEDITS: highest indices in the river-influenced N Aegean and N Adriatic. Lombarte et al. 2000: biomass mainly influenced by salinity. Hence moderate turbidityPref and riverMouth (reasoned, not measured). Spawning Apr-Jun, peak May (Kokokiris et al. 2014, doi 10.1111/jai.12292). fishFarm 0.3: community-level: demersal fish abundance/biomass higher within 2-3 nmi of E-Med farms in spring (Machias 2005).",
    "sources": [
      "https://scientiamarina.revistas.csic.es/index.php/scientiamarina/article/view/604",
      "https://int-res.com/abstracts/meps/v206/p239-249",
      "https://vliz.be/imisdocs/publications/274983.pdf",
      "https://doi.org/10.3354/meps288241"
    ]
  },
  "surmullet": {
    "turbidityPref": 0.3,
    "fishFarm": null,
    "riverMouth": 0.1,
    "artificialReef": 0.4,
    "posidoniaEdge": 0.8,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [35, 39.5],
    "oxygenMin": null,
    "thermocline": 0.2,
    "depthSeasonal": null,
    "notes": "posidoniaEdge 0.8: rough and mixed bottoms next to rock and seagrass (Lombarte et al. 2000, FishBase). Values are reasoned from habitat descriptions, not measured. Salinity follows the AquaMaps preferred max of 38.0, extended to the Levant.",
    "sources": [
      "https://int-res.com/abstracts/meps/v206/p239-249",
      "https://www.fishbase.se/summary/Mullus-surmuletus.html"
    ]
  },
  "greymullet": {
    "turbidityPref": 0.7,
    "fishFarm": 0.7,
    "riverMouth": 1,
    "artificialReef": 0.6,
    "posidoniaEdge": 0.2,
    "tempDrop": null,
    "postStorm": 0.3,
    "salinity": [0, 50],
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "riverMouth 1 and salinity: FishBase says adults often enter estuaries and rivers and use lagoons and hypersaline environments. Chelon ramada is often in polluted waters. The salinity range is approximate (euryhaline from fresh to hypersaline). fishFarm 0.6 and postStorm 0.3 are reasoned from the detritivorous diet and use of organic-rich water; no farm-aggregation study was fetched. fishFarm 0.7: Mugilidae among the 6 dominant farm taxa (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Mugil-cephalus.html",
      "https://www.fishbase.se/summary/Chelon-ramada.html",
      "https://www.fishbase.se/summary/Chelon-auratus.html",
      "https://www.fishbase.se/summary/Chelon-labrosus.html",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "meagre": {
    "turbidityPref": 0.5,
    "fishFarm": null,
    "riverMouth": 0.3,
    "artificialReef": 0.8,
    "posidoniaEdge": 0.5,
    "tempDrop": -0.3,
    "postStorm": null,
    "salinity": [30, 39.5],
    "oxygenMin": null,
    "thermocline": 0.1,
    "depthSeasonal": [{ "months": [5, 6, 7, 8, 9], "depth": [1, 3, 20, 40] }, { "months": [11, 12, 1, 2, 3], "depth": [2, 5, 45, 80] }],
    "notes": "Seasonal depths: Marques et al. 2024 (fish move to shallow aggregations in warm months, some down to 50 m in cold months). artificialReef: caves and reefs (FishBase), and the Di Iorio et al. long-term recorder sat by an artificial reef. riverMouth: FishBase says it often enters estuaries. tempDrop -0.3: activity and calling correlate positively with temperature (Di Iorio et al.), and daily distances were greater below 14 degC (Marques et al.), so the sign is uncertain.",
    "sources": [
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10850223/",
      "https://doi.org/10.1101/2020.06.03.131326",
      "https://doi.org/10.3989/scimar.2009.73n1067"
    ]
  },
  "seabass": {
    "turbidityPref": 0.7,
    "fishFarm": 0.7,
    "riverMouth": 0.8,
    "artificialReef": 0.5,
    "posidoniaEdge": 0.3,
    "tempDrop": null,
    "postStorm": 0.5,
    "salinity": [5, 40],
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "riverMouth and salinity: FishBase lists marine, brackish and freshwater habitats (estuaries, lagoons, rivers). The reviewed AquaMaps salinity min is 9.9. fishFarm 0.7: Cyprus cage farms grow seabass, so escapees are likely near farms, but this is not documented in a fetched source. turbidityPref and postStorm come from recreational surf-fishing lore and are not scientific.",
    "sources": [
      "https://www.fishbase.se/summary/Dicentrarchus-labrax.html",
      "https://www.aquamaps.org/premap.php?expert_id=7&SpecID=Fis-22755&cache=1"
    ]
  },
  "goatfish": {
    "turbidityPref": 0.5,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": 0.3,
    "posidoniaEdge": 0.6,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "posidoniaEdge 0.6 inferred from 'soft substrate between rocks', i.e. sand patches in a mosaic (CIESM). Mullids find prey with their barbels, so they depend less on clear water (turbidityPref 0.5, inferred). Reported to compete with native Mullus in Cyprus.",
    "sources": [
      "https://ciesm.org/atlas/fishes_2nd_edition/Parupeneus_forsskali.pdf",
      "https://doi.org/10.3390/jmse12071122"
    ]
  },
  "littletunny": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "Schooling, opportunistic predator of clupeoids; flocks of diving birds can mark large schools (FishBase). Eggs are shed in batches when water is warmest (FishBase); NE Med spawning peaks Jul-Aug (Kahraman 2008).",
    "sources": [
      "https://agris.fao.org/search/en/records/65e0033263b8185d9cb0a50f",
      "https://www.fishbase.se/summary/Euthynnus-alletteratus.html"
    ]
  },
  "bonito": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": 0.3,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [14, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "May enter estuaries; tolerates salinity 14-39 (FishBase), extended to the Levantine 39.5. Resident on the shelf most of the year, but moves away to spawn in early summer (Sabates & Recasens 2001).",
    "sources": [
      "https://scientiamarina.revistas.csic.es/index.php/scientiamarina/article/view/641",
      "https://www.fishbase.se/summary/Sarda-sarda.html"
    ]
  },
  "bluefish": {
    "turbidityPref": 0.3,
    "fishFarm": 0.6,
    "riverMouth": 0.4,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "Prefers clean high-energy water, but adults also enter estuaries and brackish water (FishBase). Migrates to warmer water in winter (FishBase); Aegean-Black Sea spawning migration in spring-summer (Ceyhan 2007). fishFarm 0.6: Pomatomus saltatrix in hundreds per count at some farms (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Pomatomus-saltatrix.html",
      "https://academic.oup.com/icesjms/article/64/3/531/818349",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "horsemackerel": {
    "turbidityPref": null,
    "fishFarm": 0.7,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0.4,
    "depthSeasonal": null,
    "notes": "Adults are 'usually near the bottom, at times also in surface waters', in large migratory schools (FishBase), which fits a day-bottom / night-surface pattern (night-light fishing), but no diel study was fetched. T. trachurus schools over sandy coastal bottoms (FishBase). fishFarm 0.7: Trachurus sp. among the 6 dominant farm taxa (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Trachurus-mediterraneus.html",
      "https://www.fishbase.se/summary/Trachurus-trachurus.html",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "mackerel": {
    "turbidityPref": null,
    "fishFarm": 0.4,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "Zooplanktivore that switches to small fish as it grows; caught mainly by purse seine and pelagic trawl as a sardine/anchovy by-catch (FishBase), which implies chlorophyll/productivity association, but no direct study was fetched. fishFarm 0.4: Scomber colias third in the Aegean cage bogue-fishery catch (Gulluk Bay 2024).",
    "sources": [
      "https://www.fishbase.se/summary/Scomber-colias.html",
      "https://doi.org/10.2478/cjf-2024-0019"
    ]
  },
  "garfish": {
    "turbidityPref": 0.3,
    "fishFarm": 0.3,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": 0.5,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "Eggs are attached to objects in the water by tendrils (FishBase), so spawners use vegetation and structure inshore in spring, hence the moderate posidoniaEdge. A visual surface feeder on small clupeids and anchovy (FishBase), so a mild preference for clear water. fishFarm 0.3: Belone belone present at farms in small numbers (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Belone-belone.html",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "pompano": {
    "turbidityPref": 0.2,
    "fishFarm": 0.7,
    "riverMouth": 0.3,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": 0.3,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "Found in clear water and occasionally enters lagoons and estuaries (FishBase). Reported to gather around sea-cage farms to eat pellets falling through the mesh (Wikipedia, weak source). postStorm is a mild guess for a surge-zone feeder on small crustaceans and molluscs. fishFarm 0.7: Trachinotus ovatus among the 6 dominant farm taxa (Dempster 2002).",
    "sources": [
      "https://www.fishbase.se/summary/Trachinotus-ovatus.html",
      "https://en.wikipedia.org/wiki/Trachinotus_ovatus",
      "https://doi.org/10.3354/meps242237"
    ]
  },
  "swordfish": {
    "turbidityPref": 0.2,
    "fishFarm": null,
    "riverMouth": 0,
    "artificialReef": 0,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0.6,
    "depthSeasonal": null,
    "notes": "Strong diel vertical migration: near the surface at night, below the thermocline by day (Med PSAT). This is the same 24-h pattern all year, so no seasonal seabed-depth shift is proposed. Daytime depth elsewhere tracks light penetration (clear water = deeper), hence the low turbidityPref.",
    "sources": [
      "https://digital.csic.es/bitstream/10261/326518/4/SCRS_2020_023.pdf",
      "https://iccat.int/Documents/Meetings/Docs/2007_TAGGING_REP_ENG.PDF",
      "https://agris.fao.org/search/en/records/65dfcc960f3e94b9e5dc59c3",
      "https://iccat.int/Documents/CVSP/CV052_2001/n_2/CV052020590.pdf"
    ]
  },
  "cornetfish": {
    "turbidityPref": 0.3,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": 0.4,
    "posidoniaEdge": 0.7,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0.1,
    "depthSeasonal": null,
    "notes": "A visual piscivore that ambushes or chases small schooling fish (Spicara, Boops, gobies; Kalogirou et al. 2007, Rhodes), so it prefers clear water (inferred). posidoniaEdge is inferred from reef-edge and sand-adjacent habitat.",
    "sources": [
      "https://ciesm.org/atlas/fishes_2nd_edition/Fistularia_commersonii.pdf",
      "https://www.fishbase.se/summary/Fistularia-commersonii.html"
    ]
  },
  "shortfinsquid": {
    "turbidityPref": null,
    "fishFarm": 0,
    "riverMouth": 0,
    "artificialReef": 0.1,
    "posidoniaEdge": 0,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [36, 39.5],
    "oxygenMin": null,
    "thermocline": 0.5,
    "depthSeasonal": [{ "months": [1, 2, 3, 4], "depth": [40, 100, 250, 450] }, { "months": [6, 7, 8, 9, 10, 11], "depth": [50, 120, 450, 800] }],
    "notes": "Seasonal depths: Salman 2017 found it absent from 350 m in late winter-early spring (cold) but at 550 m in warm months. Thermocline 0.5: diel vertical migration brings it to the surface layers at night (FAO, SeaLifeBase). Salinity: an offshore stenohaline species, so Levantine open-sea values.",
    "sources": [
      "https://www.trjfas.org/abstract.php?id=1058",
      "https://www.fao.org/3/X3950E/X3950E11.htm",
      "https://www.sealifebase.se/summary/Illex-coindetii.html"
    ]
  },
  "whitegrouper": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": 0.4,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [27, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "riverMouth: juveniles taken in coastal lagoons and estuaries (FishBase, Heemstra & Randall 1993). Salinity from AquaMaps (17.6-39.25, preferred 27.3-38.7). Off Senegal its seasonal migration follows upwelling (FishBase), so it may respond to cold upwelling, but there is no Levantine evidence.",
    "sources": [
      "https://www.fishbase.se/summary/Epinephelus-aeneus.html",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23120"
    ]
  },
  "goldblotch": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [29, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "AquaMaps salinity 17.9-38.1 (preferred 29.2-37.2) understates the Levant, where the species is common (Aronov & Goren 2008), so the upper bound is set to Levantine values.",
    "sources": [
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-27343",
      "https://www.avidag.co.il/wp-content/uploads/2012/01/ECOLOGY-OF-THE-MOTTLED-GROUPER.pdf"
    ]
  },
  "mottledgrouper": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [31.5, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": [{ "months": [1, 2, 3, 4, 5], "depth": [1, 5, 25, 80] }, { "months": [6, 7], "depth": [1, 10, 40, 100] }],
    "notes": "depthSeasonal: winter-spring spawning aggregations at 10-15 m; divers and fishers report aggregations at 30-40 m until mid-July (Aronov & Goren 2008). Diet is 98% fish, about 68% Siganus rabbitfish (Lessepsian), so it tracks rabbitfish on shallow rocky reefs. Salinity from AquaMaps (17.9-39.25, preferred 31.5-38.6).",
    "sources": [
      "https://www.avidag.co.il/wp-content/uploads/2012/01/ECOLOGY-OF-THE-MOTTLED-GROUPER.pdf",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23650"
    ]
  },
  "comber": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": 0.6,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [31, 40],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "posidoniaEdge: FishBase lists rock, Posidonia beds and soft bottom. Salinity from AquaMaps (15.6-40.6, preferred 31.1-38.4).",
    "sources": [
      "https://www.fishbase.se/summary/Serranus-cabrilla.html",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23810"
    ]
  },
  "paintedcomber": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": 0.8,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [34.5, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "posidoniaEdge: lives on rock and Posidonia (FishBase; March et al. 2010). Salinity from AquaMaps (15.6-39.25, preferred 34.6-38.7).",
    "sources": [
      "https://doi.org/10.3354/meps08410",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23811"
    ]
  },
  "scorpionfish": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [31.5, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "Salinity from AquaMaps (22.4-39.25, preferred 31.5-38.4).",
    "sources": [
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-30627"
    ]
  },
  "blackscorpion": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": null,
    "posidoniaEdge": 0.6,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [17, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "Very euryhaline: lives in the Black Sea (~17-18 psu; FishBase spawning data from Sinop) and the Levant. posidoniaEdge: rock and seagrass habitat (Sabat 2004).",
    "sources": [
      "https://ciesm.org/online/archives/abstracts/pdf/37/CIESM_Congress_2004_Barcelona_article_0431.htm",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-30626"
    ]
  },
  "moray": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": 0.8,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [35.5, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "artificialReef inferred from strict crevice-dwelling (FishBase; Pereira 2017), no direct study. Spawning Jul-Aug in Croatia (FishBase); reported to migrate offshore to spawn (FishBase). Salinity from AquaMaps (32.4-39.3, preferred 35.8-38.8).",
    "sources": [
      "https://doi.org/10.3354/meps12379",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-30321"
    ]
  },
  "conger": {
    "turbidityPref": null,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": 0.8,
    "posidoniaEdge": null,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [33, 39.5],
    "oxygenMin": null,
    "thermocline": null,
    "depthSeasonal": null,
    "notes": "Congers roam more widely than morays (home range ~34 ha, Pereira 2017). artificialReef inferred from hard-bottom shelter use (FishBase), no direct study. Salinity from AquaMaps (5.2-39.4, preferred 33.3-37.8).",
    "sources": [
      "https://doi.org/10.3354/meps12379",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-22866"
    ]
  },
  "rainbowwrasse": {
    "turbidityPref": 0.3,
    "fishFarm": null,
    "riverMouth": 0,
    "artificialReef": 0.4,
    "posidoniaEdge": 0.6,
    "tempDrop": -0.3,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0.2,
    "depthSeasonal": [{ "months": [12, 1, 2, 3], "depth": [2, 10, 60, 120] }, { "months": [4, 5, 6, 7, 8, 9, 10, 11], "depth": [0, 2, 40, 120] }],
    "notes": "Moves deeper in winter (FishBase; FNAM). Lives near rocks and seagrass beds (posidoniaEdge 0.6) and buries in sand at night or when frightened.",
    "sources": [
      "https://www.fishbase.se/summary/Coris-julis.html",
      "https://fishes-fnam.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/nsr_taxon.php?id=109594"
    ]
  },
  "ornatewrasse": {
    "turbidityPref": 0.3,
    "fishFarm": null,
    "riverMouth": 0,
    "artificialReef": 0.5,
    "posidoniaEdge": 0.4,
    "tempDrop": -0.4,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "Shallow thermophilic diurnal labrid, so tempDrop -0.4 is inferred from its cold sensitivity (ISPRA). The ISPRA sheet lists rocky-substrate complexity, algal cover and bottom slope as factors.",
    "sources": [
      "https://climadat.isprambiente.it/wp-content/uploads/2024/11/Scheda-indicatori_Thalassoma_definitiva.pdf",
      "https://doi.org/10.1007/s11160-022-09697-9"
    ]
  },
  "squirrelfish": {
    "turbidityPref": 0.5,
    "fishFarm": null,
    "riverMouth": 0,
    "artificialReef": 0.8,
    "posidoniaEdge": 0.1,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "FishBase lists silty reefs, wrecks and harbours, and it hides in caves and crevices, so artificialReef is 0.8. A nocturnal feeder, so water clarity matters little (inferred).",
    "sources": [
      "https://www.fishbase.se/summary/Sargocentron-rubrum.html",
      "https://ciesm.org/atlas/fishes_2nd_edition/Sargocentron_rubrum.pdf"
    ]
  },
  "leatherjacket": {
    "turbidityPref": 0.4,
    "fishFarm": null,
    "riverMouth": null,
    "artificialReef": 0.5,
    "posidoniaEdge": 0.6,
    "tempDrop": null,
    "postStorm": null,
    "salinity": null,
    "oxygenMin": null,
    "thermocline": 0,
    "depthSeasonal": null,
    "notes": "Lives on vegetated rock and seagrass and picks invertebrates off rocks (CIESM), so posidoniaEdge 0.6 is inferred. Seen as a bait-stealing nuisance and discarded by fishers (MedMIS).",
    "sources": [
      "https://ciesm.org/atlas/fishes_2nd_edition/Stephanolepis_diaspros.pdf",
      "https://iucn-medmis.org/en/species/stephanolepis-diaspros"
    ]
  },
  "toadfish": {
    "turbidityPref": 0.5,
    "fishFarm": null,
    "riverMouth": 0.2,
    "artificialReef": 0.3,
    "posidoniaEdge": 0.7,
    "tempDrop": -0.3,
    "postStorm": null,
    "salinity": [37, 41],
    "oxygenMin": null,
    "thermocline": 0.2,
    "depthSeasonal": [{ "months": [5, 6, 7, 8, 9], "depth": [0, 3, 60, 150] }, { "months": [12, 1, 2, 3], "depth": [5, 25, 150, 200] }],
    "notes": "depthSeasonal: inshore spawning presence in late spring-summer in Cyprus (Rousou 2014), and highest trawl abundance in winter at 25-150 m in Antalya (Ozbek 2017). posidoniaEdge 0.7: adults prefer Posidonia and juveniles sand (Kalogirou 2013). Salinity: establishment threshold about 39.09 psu (Klaoudatos 2025). riverMouth 0.2: one Antalya trawl location was off the Manavgat river mouth; weak basis.",
    "sources": [
      "https://doi.org/10.4194/1303-2712-v17_4_08",
      "https://doi.org/10.12681/mms.364",
      "https://doi.org/10.3354/sedao00005",
      "https://www.mdpi.com/2076-3263/15/9/361"
    ]
  },
  "weever": {
    "turbidityPref": 0.5,
    "fishFarm": null,
    "riverMouth": 0.2,
    "artificialReef": 0.05,
    "posidoniaEdge": 0.3,
    "tempDrop": null,
    "postStorm": null,
    "salinity": [23, 39.5],
    "oxygenMin": null,
    "thermocline": 0.1,
    "depthSeasonal": null,
    "notes": "A burrowing sand and mud ambush predator (FishBase). Salinity follows the AquaMaps preferred min of 23.5, extended to Levantine values. The other values are reasoned from habitat descriptions.",
    "sources": [
      "https://www.fishbase.se/summary/Trachinus-draco.html",
      "https://www.aquamaps.org/premap.php?cache=1&SpecID=Fis-30734"
    ]
  }
};
