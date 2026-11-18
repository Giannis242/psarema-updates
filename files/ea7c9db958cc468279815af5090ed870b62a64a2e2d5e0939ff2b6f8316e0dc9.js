'use strict';
// Psarema: season / activity overrides checked against effort-corrected Cyprus records. When a fish has an entry, its `season`
// (and `activity`, if given) replaces the value in data/species*.js. Shape: { id: { season?: [Jan..Dec] 0..1, activity?: {dawn, day, dusk, night},
// was: the curve it replaces, basis, note, sources } }. Wiring: js/core.js, before SPECIES is built (see eval/patches/season-fit.js for the bench).
// Method (eval/, 2026-10-24): a fish's monthly record share = its records / sampling events (dataset, 250 m cell, day) that month, other fish
// as background, the bench's 10 km block and year splits for testing. Record-fitted month shapes did NOT hold out of sample: refitted inside
// every bench fold they changed pooled month AUC by -0.007 [-0.017, 0.014] (cv-space) and +0.001 [-0.017, 0.015] (cv-time, fitted < 2024,
// scored 2024+; eval/results/sf-b2 -> sf-after2), because records come in campaigns (one site, one diver, one year). So no fitted shapes are shipped. What held: for three
// year-round residents the literature curve points the wrong way in every split, and a flat curve beats it in all bench variants.
// Activity: not changed. Diel record shares did not beat the literature activity out of sample (leave-one-year-out AUC .52 vs .52), and
// night records of day fish are resting fish seen by night divers, not feeding fish.
// Derived values only: no records are shipped here (eval/data/truth.js stays in eval/).
window.PSAREMA_SEASON_FIT = {
  rabbitfish: {
    season: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    was: [0.4, 0.3, 0.3, 0.4, 0.6, 0.8, 1, 1, 1, 0.9, 0.7, 0.5],
    basis: 'records',
    note: 'Present year-round: no reliable month pattern in 148 dated Cyprus records (GBIF, OBIS, iNaturalist, 1990-2026). The old summer peak came from the spawning season (May-Aug) and points the wrong way against effort-corrected records: season-only AUC .42 on records before 2024 (chosen on these), .48 on 2024+. Bench month AUC (boat, TGB; eval/results/season-fit-before -> season-fit) with the flat curve: clean .57 -> .60, cv-space .56 -> .59, 2024+ records .55 -> .59 (clean-time) / .55 -> .59 (cv-time); the where-fit alone scores .60, so the old season cost .03-.04. Fitted month shapes did not hold up spatially (cv-space .56 -> .53).',
    sources: ['https://www.gbif.org/dataset/50c9509d-22c7-4a22-a47d-8c48425ef4a7', 'https://www.inaturalist.org/', 'https://www.gbif.org/dataset/8ce8e762-1ebd-4b8c-9b4b-3810e6b19b68',
      'https://cris.iucc.ac.il/en/publications/habitat-utilization-by-an-invasive-herbivorous-fish-siganus-rivul/'],
  },
  octopus: {
    season: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    was: [1, 1, 1, 0.9, 0.8, 0.65, 0.55, 0.55, 0.65, 0.9, 1, 1],
    basis: 'records + literature',
    note: 'Present year-round. The old winter peak described large adults (spawning late winter-spring); summer brings the main settlement, so more but smaller octopus are near the coast then (Katsanevakis & Verriopoulos 2006, E Med visual census; lifespan 12-15 months). Against 28 dated Cyprus records the winter-peak curve points the wrong way: season-only AUC .49 before 2024 (12 records), .42 on 2024+ (16). Bench month AUC (boat, TGB) with the flat curve: clean .51 -> .58, cv-space .51 -> .58, clean-time .49 -> .57, cv-time .49 -> .57 (where-fit alone .53). Caveat: the choice used all years (too few records before 2024), so the 2024+ gain is not a clean test; the spatial-block test (cv-space) is.',
    sources: ['https://doi.org/10.1016/j.icesjms.2005.07.004', 'https://www.gbif.org/dataset/50c9509d-22c7-4a22-a47d-8c48425ef4a7', 'https://www.inaturalist.org/'],
  },
  moray: {
    season: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    was: [0.6, 0.6, 0.6, 0.7, 0.8, 0.9, 1, 1, 0.9, 0.8, 0.7, 0.6],
    basis: 'records + literature',
    note: 'Present year-round: a territorial resident with a home range of about 19 ha (Pereira et al. 2017, acoustic tagging). The old summer peak had no seasonal source and points the wrong way against 29 dated Cyprus records: season-only AUC .40 before 2024 (chosen on these), .39 on 2024+. Bench month AUC (boat, TGB) with the flat curve: clean .44 -> .47, cv-space .44 -> .47, clean-time .41 -> .41, cv-time .40 -> .41 (where-fit alone .45).',
    sources: ['https://doi.org/10.3354/meps12379', 'https://www.fishbase.se/summary/Muraena-helena.html', 'https://www.gbif.org/dataset/50c9509d-22c7-4a22-a47d-8c48425ef4a7', 'https://www.inaturalist.org/'],
  },
};
