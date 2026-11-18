// Profile fact-check 2026-10-26 (profiles agent; eval/profiles-v2, paired bench in eval/LOG.md). Changed here, with evidence (URLs also in each fish's sources):
//   whitegrouper.season: [0.4, 0.4, 0.4, 0.5, 0.7, 0.9, 1, 1, 0.9, 0.8, 0.6, 0.5] -> [0.7, 0.7, 0.7, 0.7, 0.8, 0.9, 1, 1, 0.9, 0.9, 0.8, 0.7]. Gulf of Antalya seasonal trawl survey (Aug 2009-Apr 2010, 25-200 m): present in every season, highest abundance at 75 m in February (Ozgur Ozbek et al.): no winter absence.
//   comber.depth: [5, 15, 150, 400] -> [5, 15, 100, 250]. Gulf of Antalya trawl survey, density by depth 25/50/75/100/150/200 m ~ 108/401/~160/374/24/41 ind/km2: at 150-200 m only 5-10% of the peak, so full fit ends at 100 m.
(window.PSAREMA_SPECIES ||= []).push(...[
  {
    "id": "whitegrouper",
    "name": "White grouper",
    "scientific": "Epinephelus aeneus",
    "local": "Sfyrida (Σφυρίδα)",
    "el": "Σφυρίδα",
    "group": "bottom",
    "methods": ["boat", "spear"],
    "depth": [5, 20, 100, 200],
    "sst": [14, 17, 29, 32],
    "habitat": { "rock": 0.8, "seagrass": 0.3, "coarse": 0.7, "sand": 0.8, "mud": 0.6, "open": 0 },
    "structure": 0.6,
    "dropoff": 0.6,
    "shoreKm": [0.5, 8],
    "activity": { "dawn": 0.9, "day": 0.7, "dusk": 1, "night": 0.3 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.7, 0.7, 0.7, 0.7, 0.8, 0.9, 1, 1, 0.9, 0.9, 0.8, 0.7],
    "waves": [0, 1.2],
    "current": 0.5,
    "front": 0.2,
    "chlorophyll": 0.2,
    "regulations": "Minimum size 45 cm total length (DFMR recreational licence terms 2026 §13, Fisheries Reg. 11; the same size as Reg. (EU) 2019/1241 Annex IX; applies to all recreational catch). Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Ελάχιστο μέγεθος 45 cm ολικό μήκος (όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 §13, Καν. 11 των περί Αλιείας Κανονισμών· το ίδιο μέγεθος με τον Καν. (ΕΕ) 2019/1241, Παράρτημα IX· ισχύει για κάθε ερασιτεχνικό αλίευμα). Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Live bogue or squid, or slow-pitch jigs, over rock–sand and mud edges 20–80 m from a boat; dawn and dusk, June–October.",
    "tips_el": "Ζωντανή γόπα ή καλαμάρι, ή αργά jig, σε όρια βράχου–άμμου και λάσπης 20–80 m από σκάφος· αυγή και σούρουπο, Ιούνιο–Οκτώβριο.",
    "warning": "Minimum size 45 cm TL. IUCN Near Threatened; females first mature at about 50–60 cm, so smaller fish have not yet spawned.",
    "warning_el": "Ελάχιστο μέγεθος 45 cm. Σχεδόν απειλούμενο είδος (IUCN)· τα θηλυκά ωριμάζουν στα 50–60 cm περίπου, άρα τα μικρότερα δεν έχουν γεννήσει ακόμη.",
    "estimated": ["structure", "dropoff", "shoreKm", "activity", "moon", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Epinephelus-aeneus.html",
      "https://ejournals.epublishing.ekt.gr/index.php/hcmr-med-mar-sc/article/view/19756",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/epinephelus-aeneus_en",
      "https://eur-lex.europa.eu/eli/reg/2019/1241/oj",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23120",
      "https://blackmeditjournal.org/volumes-archive/vol19-2013/vol-19-2013-no-1/spatio-temporal-patterns-of-abundance-biomass-and-length-weight-relationship-of-white-grouper-epinephelus-aeneus-geoffroy-saint-hilaire-1817-pisces-serranidae-in-the-gulf-of-antalya/",
      "https://avesis.cu.edu.tr/yayin/d67ef2e5-ec40-4d82-b351-0aebde1c6274/gonad-histology-and-spawning-pattern-of-the-white-grouper-epinephelus-aeneus-from-iskenderun-bay-turkey-iskenderun-korfezinden-yakalanan-lagos-epinephelus-aeneus-larda-ureme-modeli-ve-gonat-histolojisi",
      "https://www.fishbase.se/Ecology/FishEcologySummary.php?StockCode=440&GenusName=Epinephelus&SpeciesName=aeneus",
      "https://blackmeditjournal.org/wp-content/uploads/22_45elif.pdf"
    ]
  },
  {
    "id": "goldblotch",
    "name": "Goldblotch grouper",
    "scientific": "Epinephelus costae",
    "local": "Stira (Στήρα)",
    "el": "Στήρα",
    "group": "bottom",
    "methods": ["boat", "spear"],
    "depth": [2, 10, 80, 200],
    "sst": [12, 16, 29, 32],
    "habitat": { "rock": 1, "seagrass": 0.4, "coarse": 0.6, "sand": 0.5, "mud": 0.3, "open": 0 },
    "structure": 0.7,
    "dropoff": 0.7,
    "shoreKm": [0.1, 3],
    "activity": { "dawn": 0.9, "day": 0.8, "dusk": 1, "night": 0.2 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.4, 0.4, 0.4, 0.5, 0.8, 1, 1, 0.9, 0.8, 0.7, 0.5, 0.4],
    "waves": [0, 1],
    "current": 0.5,
    "front": 0.2,
    "chlorophyll": 0.1,
    "regulations": "Minimum size 45 cm total length (DFMR recreational licence terms 2026 §13, Fisheries Reg. 11; the same size as Reg. (EU) 2019/1241 Annex IX; applies to all recreational catch). Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Ελάχιστο μέγεθος 45 cm ολικό μήκος (όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 §13, Καν. 11 των περί Αλιείας Κανονισμών· το ίδιο μέγεθος με τον Καν. (ΕΕ) 2019/1241, Παράρτημα IX· ισχύει για κάθε ερασιτεχνικό αλίευμα). Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Spearfishing: lie still at rock–sand edges 8–25 m and let it come close; boat: live bait or small jigs by reefs. Best May–October.",
    "tips_el": "Ψαροντούφεκο: καρτέρι σε όρια βράχου–άμμου 8–25 m· από σκάφος ζωντανό δόλωμα ή μικρά jig δίπλα σε υφάλους. Καλύτερα Μάιο–Οκτώβριο.",
    "warning": "Minimum size 45 cm TL. Juveniles live in small groups in shallow water: check the size before you shoot or keep one.",
    "warning_el": "Ελάχιστο μέγεθος 45 cm. Τα νεαρά ζουν σε μικρές ομάδες στα ρηχά: ελέγξτε το μέγεθος πριν το χτυπήσετε ή το κρατήσετε.",
    "estimated": ["structure", "dropoff", "shoreKm", "activity", "moon", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Epinephelus-costae.html",
      "https://www.avidag.co.il/wp-content/uploads/2012/01/ECOLOGY-OF-THE-MOTTLED-GROUPER.pdf",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/epinephelus-costae_en",
      "https://eur-lex.europa.eu/eli/reg/2019/1241/oj",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-27343",
      "https://www.fao.org/4/t0540e/t0540e21.pdf",
      "https://www.fishbase.se/Ecology/FishEcologySummary.php?StockCode=9546&GenusName=Epinephelus&SpeciesName=costae"
    ]
  },
  {
    "id": "mottledgrouper",
    "name": "Mottled grouper",
    "scientific": "Mycteroperca rubra",
    "local": "Pigga (Πίγγα)",
    "el": "Πίγγα",
    "group": "bottom",
    "methods": ["spear", "boat"],
    "depth": [1, 5, 35, 150],
    "sst": [13, 16, 30, 32],
    "habitat": { "rock": 1, "seagrass": 0.4, "coarse": 0.4, "sand": 0.2, "mud": 0.05, "open": 0 },
    "structure": 0.9,
    "dropoff": 0.7,
    "shoreKm": [0.05, 2],
    "activity": { "dawn": 0.9, "day": 1, "dusk": 0.7, "night": 0.05 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.7, 0.9, 1, 1, 1, 0.8, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
    "waves": [0, 1],
    "current": 0.4,
    "front": 0.1,
    "chlorophyll": 0.1,
    "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Eats mostly rabbitfish: spear shallow rocky reefs 5–25 m by day, or drift a live kourkouna by rock from a boat. All year.",
    "tips_el": "Τρώει κυρίως κουρκούνες: ψαροντούφεκο σε ρηχούς βραχώδεις υφάλους 5–25 m τη μέρα, ή ζωντανή κουρκούνα από σκάφος. Όλο τον χρόνο.",
    "warning": "No EU minimum size, but look-alike Epinephelus groupers must be 45 cm+. Spawns in large shallow aggregations Feb–May: spare them.",
    "warning_el": "Δεν έχει ελάχιστο μέγεθος ΕΕ, όμως οι όμοιοι ροφοί Epinephelus θέλουν 45 cm+. Γεννά σε μεγάλα κοπάδια στα ρηχά Φεβρουάριο–Μάιο: αφήστε τα.",
    "estimated": ["dropoff", "shoreKm", "moon", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Mycteroperca-rubra.html",
      "https://www.avidag.co.il/wp-content/uploads/2012/01/ECOLOGY-OF-THE-MOTTLED-GROUPER.pdf",
      "https://www.seaaroundus.org/doc/publications/wp/2013/Ulman-et-al-Cyprus.pdf",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/mycteroperca-rubra_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23650"
    ]
  },
  {
    "id": "comber",
    "name": "Comber",
    "scientific": "Serranus cabrilla",
    "local": "Channos (Χάννος)",
    "el": "Χάννος",
    "group": "bottom",
    "methods": ["boat", "shore"],
    "depth": [5, 15, 100, 250],
    "sst": [13, 16, 27, 30],
    "habitat": { "rock": 0.9, "seagrass": 0.9, "coarse": 0.7, "sand": 0.5, "mud": 0.3, "open": 0 },
    "structure": 0.5,
    "dropoff": 0.5,
    "shoreKm": [0.2, 5],
    "activity": { "dawn": 1, "day": 1, "dusk": 0.9, "night": 0.1 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.9, 0.9, 0.9, 1, 1, 0.9, 0.8, 0.7, 0.8, 0.9, 1, 1],
    "waves": [0, 1.2],
    "current": 0.4,
    "front": 0.1,
    "chlorophyll": 0.2,
    "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Size 6–8 hooks with squid or shrimp strips on a paternoster, drifting over rock and Posidonia edges 15–60 m; daytime, all year.",
    "tips_el": "Αγκίστρια Νο 6–8 με λωρίδες καλαμαριού ή γαρίδα σε αρματωσιά βυθού, ντρίφτα σε βράχο και ποσειδώνια 15–60 m· μέρα, όλο τον χρόνο.",
    "warning": null,
    "warning_el": null,
    "estimated": ["structure", "dropoff", "shoreKm", "activity", "moon", "season", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Serranus-cabrilla.html",
      "https://acikerisim.balikesir.edu.tr/xmlui/handle/20.500.12462/7495",
      "https://www.seaaroundus.org/doc/publications/wp/2013/Ulman-et-al-Cyprus.pdf",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/serranus-cabrilla_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23810",
      "https://www.fishbase.se/Reproduction/SpawningList.php?ID=1353&GenusName=Serranus&SpeciesName=cabrilla&fc=289&StockCode=1371",
      "https://www.fishbase.se/Ecology/FishEcologySummary.php?StockCode=1371&GenusName=Serranus&SpeciesName=cabrilla",
      "https://blackmeditjournal.org/wp-content/uploads/2.ELIF_OZGUR.pdf"
    ]
  },
  {
    "id": "paintedcomber",
    "name": "Painted comber",
    "scientific": "Serranus scriba",
    "local": "Perka (Πέρκα)",
    "el": "Πέρκα",
    "group": "bottom",
    "methods": ["shore", "boat", "spear"],
    "depth": [0, 2, 30, 100],
    "sst": [13, 16, 28, 31],
    "habitat": { "rock": 1, "seagrass": 0.9, "coarse": 0.5, "sand": 0.2, "mud": 0.1, "open": 0 },
    "structure": 0.7,
    "dropoff": 0.3,
    "shoreKm": [0, 1],
    "activity": { "dawn": 0.9, "day": 1, "dusk": 0.7, "night": 0.05 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.7, 0.7, 0.8, 0.9, 1, 0.9, 0.8, 0.8, 0.8, 0.9, 0.8, 0.7],
    "waves": [0, 1],
    "current": 0.2,
    "front": 0.05,
    "chlorophyll": 0.2,
    "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Shrimp, worm or squid on small hooks, or tiny soft lures, cast by rocks and Posidonia from shore; daytime, all year.",
    "tips_el": "Γαρίδα, σκουλήκι ή καλαμάρι σε μικρά αγκίστρια, ή μικρά σιλικονάκια, δίπλα σε βράχια και ποσειδώνια από την ακτή· μέρα, όλο τον χρόνο.",
    "warning": null,
    "warning_el": null,
    "estimated": ["sst", "structure", "dropoff", "shoreKm", "moon", "season", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Serranus-scriba.html",
      "https://www.seaaroundus.org/doc/publications/wp/2013/Ulman-et-al-Cyprus.pdf",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/serranus-scriba_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://doi.org/10.3354/meps08410",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-23811",
      "https://www.fishbase.se/Ecology/FishEcologySummary.php?StockCode=1957&GenusName=Serranus&SpeciesName=scriba"
    ]
  },
  {
    "id": "scorpionfish",
    "name": "Red scorpionfish",
    "scientific": "Scorpaena scrofa",
    "local": "Skorpios (Σκορπιός)",
    "el": "Σκορπιός (κόκκινος)",
    "group": "bottom",
    "methods": ["boat", "spear"],
    "depth": [10, 25, 150, 400],
    "sst": [12, 15, 26, 30],
    "habitat": { "rock": 1, "seagrass": 0.4, "coarse": 0.7, "sand": 0.5, "mud": 0.4, "open": 0 },
    "structure": 0.8,
    "dropoff": 0.6,
    "shoreKm": [0.3, 8],
    "activity": { "dawn": 0.9, "day": 0.7, "dusk": 1, "night": 0.9 },
    "moon": { "new": 1, "full": 0.9 },
    "season": [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.8, 0.8, 0.9, 1, 1, 0.9],
    "waves": [0, 1.2],
    "current": 0.4,
    "front": 0.1,
    "chlorophyll": 0.2,
    "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Fish or squid strips on a two-hook bottom rig, slow drift over rocky and mixed ground 30–120 m; dusk best, autumn–winter.",
    "tips_el": "Λωρίδες ψαριού ή καλαμαριού σε αρματωσιά βυθού με δύο αγκίστρια, αργή ντρίφτα σε βράχο 30–120 m· καλύτερα σούρουπο, φθινόπωρο–χειμώνα.",
    "warning": "Venomous dorsal-fin and gill-cover spines (DFMR): handle with pliers or a cloth. If stung, immerse in hot water (as hot as bearable) and seek medical advice if severe.",
    "warning_el": "Δηλητηριώδη αγκάθια στο ραχιαίο πτερύγιο και στα βραγχιακά καλύμματα (ΤΑΘΕ): πιάστε με πένσα ή πανί. Αν τσιμπηθείτε, βάλτε το σημείο σε ζεστό νερό και ζητήστε ιατρική βοήθεια αν ο πόνος είναι έντονος.",
    "estimated": ["structure", "dropoff", "shoreKm", "activity", "moon", "season", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Scorpaena-scrofa.html",
      "https://publications.gov.cy/assets/user/publications/2017/2017_078/GEORG_ALIEIAS_Toxika%20psaria.pdf",
      "https://www.seaaroundus.org/doc/publications/wp/2013/Ulman-et-al-Cyprus.pdf",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/scorpaena-scrofa_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-30627",
      "https://www.fishbase.se/Ecology/FishEcologySummary.php?StockCode=1955&GenusName=Scorpaena&SpeciesName=scrofa"
    ]
  },
  {
    "id": "blackscorpion",
    "name": "Black scorpionfish",
    "scientific": "Scorpaena porcus",
    "local": "Skorpios (Σκορπιός)",
    "el": "Σκορπιός (μαύρος)",
    "group": "bottom",
    "methods": ["shore", "spear", "boat"],
    "depth": [0, 1, 30, 100],
    "sst": [13, 16, 28, 31],
    "habitat": { "rock": 1, "seagrass": 0.8, "coarse": 0.4, "sand": 0.1, "mud": 0.05, "open": 0 },
    "structure": 0.8,
    "dropoff": 0.3,
    "shoreKm": [0, 1],
    "activity": { "dawn": 0.8, "day": 0.4, "dusk": 1, "night": 0.9 },
    "moon": { "new": 1, "full": 0.9 },
    "season": [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.8, 0.8, 0.9, 1, 1, 0.9],
    "waves": [0, 1],
    "current": 0.2,
    "front": 0.05,
    "chlorophyll": 0.2,
    "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Shrimp, worm or squid on short bottom rigs tight to rocks and breakwaters after dark; spearos find it in holes at 2–15 m.",
    "tips_el": "Γαρίδα, σκουλήκι ή καλαμάρι σε κοντή αρματωσιά, κολλητά σε βράχια και κυματοθραύστες τη νύχτα· στο ψαροντούφεκο σε τρύπες 2–15 m.",
    "warning": "Venomous dorsal-fin and gill-cover spines (DFMR): handle with pliers or a cloth. If stung, immerse in hot water (as hot as bearable) and seek medical advice if severe.",
    "warning_el": "Δηλητηριώδη αγκάθια στο ραχιαίο πτερύγιο και στα βραγχιακά καλύμματα (ΤΑΘΕ): πιάστε με πένσα ή πανί. Αν τσιμπηθείτε, βάλτε το σημείο σε ζεστό νερό και ζητήστε ιατρική βοήθεια αν ο πόνος είναι έντονος.",
    "estimated": ["sst", "structure", "dropoff", "shoreKm", "activity", "moon", "season", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Scorpaena-porcus.html",
      "https://publications.gov.cy/assets/user/publications/2017/2017_078/GEORG_ALIEIAS_Toxika%20psaria.pdf",
      "https://ciesm.org/online/archives/abstracts/pdf/37/CIESM_Congress_2004_Barcelona_article_0431.htm",
      "https://journals.uot.edu.ly/index.php/ljs/article/view/138",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-30626",
      "https://www.fishbase.se/Reproduction/SpawningList.php?ID=1758&GenusName=Scorpaena&SpeciesName=porcus&fc=264&StockCode=1954"
    ]
  },
  {
    "id": "moray",
    "name": "Mediterranean moray",
    "scientific": "Muraena helena",
    "local": "Smerna (Σμέρνα)",
    "el": "Σμέρνα",
    "group": "bottom",
    "methods": ["shore", "boat", "spear"],
    "depth": [0, 2, 40, 200],
    "sst": [13, 16, 28, 31],
    "habitat": { "rock": 1, "seagrass": 0.3, "coarse": 0.5, "sand": 0.05, "mud": 0, "open": 0 },
    "structure": 1,
    "dropoff": 0.4,
    "shoreKm": [0, 1.5],
    "activity": { "dawn": 0.6, "day": 0.2, "dusk": 0.9, "night": 1 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.6, 0.6, 0.6, 0.7, 0.8, 0.9, 1, 1, 0.9, 0.8, 0.7, 0.6],
    "waves": [0, 1.5],
    "current": 0.2,
    "front": 0.05,
    "chlorophyll": 0.1,
    "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Whole sardine or squid on a wire trace, tight to rocky breakwaters and reef holes at dusk and night; May–October best.",
    "tips_el": "Ολόκληρη σαρδέλα ή καλαμάρι με συρματόπετονια, κολλητά σε βραχώδεις κυματοθραύστες και τρύπες, σούρουπο και νύχτα· Μάιο–Οκτώβριο.",
    "warning": "Powerful bite that infects easily. Never reach into holes; unhook with long pliers or cut the line.",
    "warning_el": "Δυνατό δάγκωμα που μολύνεται εύκολα. Μη βάζετε το χέρι σε τρύπες· ξαγκιστρώστε με μακριά πένσα ή κόψτε την πετονιά.",
    "estimated": ["depth", "sst", "dropoff", "shoreKm", "season", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Muraena-helena.html",
      "https://doi.org/10.3354/meps12379",
      "https://www.fishbase.se/Reproduction/1729",
      "https://www.seaaroundus.org/doc/publications/wp/2013/Ulman-et-al-Cyprus.pdf",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/muraena-helena_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-30321",
      "https://www.fishbase.se/Reproduction/SpawningList.php?ID=1729&GenusName=Muraena&SpeciesName=helena&fc=56&StockCode=1925"
    ]
  },
  {
    "id": "conger",
    "name": "European conger",
    "scientific": "Conger conger",
    "local": "Mougri (Μουγγρί)",
    "el": "Μουγγρί",
    "group": "bottom",
    "methods": ["shore", "boat"],
    "depth": [0, 5, 100, 500],
    "sst": [13, 15, 23, 28],
    "habitat": { "rock": 1, "seagrass": 0.2, "coarse": 0.6, "sand": 0.3, "mud": 0.3, "open": 0 },
    "structure": 1,
    "dropoff": 0.5,
    "shoreKm": [0, 3],
    "activity": { "dawn": 0.5, "day": 0.1, "dusk": 0.9, "night": 1 },
    "moon": { "new": 1, "full": 1 },
    "season": [1, 1, 0.9, 0.8, 0.6, 0.4, 0.3, 0.3, 0.4, 0.6, 0.8, 0.9],
    "waves": [0, 1.5],
    "current": 0.3,
    "front": 0.05,
    "chlorophyll": 0.1,
    "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Whole squid, cuttlefish or oily fish on heavy tackle by breakwaters, wrecks and rocky ledges on dark winter nights.",
    "tips_el": "Ολόκληρο καλαμάρι, σουπιά ή λιπαρό ψάρι σε βαριά εξαρτήματα, σε κυματοθραύστες, ναυάγια και βραχώδεις πεζούλες, σκοτεινές νύχτες χειμώνα.",
    "warning": "Very strong, bites hard and spins when hooked. Keep fingers clear; unhook with pliers or cut the line.",
    "warning_el": "Πολύ δυνατό, δαγκώνει άσχημα και στριφογυρίζει όταν πιαστεί. Μακριά τα δάχτυλα· ξαγκιστρώστε με πένσα ή κόψτε την πετονιά.",
    "estimated": ["structure", "dropoff", "shoreKm", "season", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Conger-conger.html",
      "https://doi.org/10.3354/meps12379",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/conger-conger_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/preMap.php?cache=1&SpecID=Fis-22866",
      "https://www.fishbase.se/Reproduction/SpawningList.php?ID=301&GenusName=Conger&SpeciesName=conger&fc=62&StockCode=315"
    ]
  },
  {
    "id": "rainbowwrasse",
    "name": "Mediterranean rainbow wrasse",
    "scientific": "Coris julis",
    "local": "Gylos (Γύλος)",
    "el": "Γύλος",
    "group": "bottom",
    "methods": ["shore", "boat"],
    "depth": [0, 2, 40, 120],
    "sst": [11, 14, 27, 31],
    "habitat": { "rock": 1, "seagrass": 0.9, "coarse": 0.5, "sand": 0.3, "mud": 0, "open": 0 },
    "structure": 0.5,
    "dropoff": 0.2,
    "shoreKm": [0, 1],
    "activity": { "dawn": 0.6, "day": 1, "dusk": 0.5, "night": 0 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.5, 0.5, 0.6, 0.8, 1, 1, 1, 1, 1, 0.9, 0.7, 0.6],
    "waves": [0, 1],
    "current": 0.2,
    "front": 0.05,
    "chlorophyll": 0.1,
    "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Size 12–14 hooks with worm or shrimp, float or light ledger by rocks and Posidonia; sunny days, April–October.",
    "tips_el": "Αγκίστρια Νο 12–14 με σκουλήκι ή γαρίδα, με φελλό ή ελαφρύ βυθό, δίπλα σε βράχια και ποσειδώνια· ηλιόλουστες μέρες, Απρίλιο–Οκτώβριο.",
    "warning": null,
    "warning_el": null,
    "estimated": ["sst", "structure", "dropoff", "shoreKm", "moon", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Coris-julis.html",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/coris-julis_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://fishes-fnam.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/nsr_taxon.php?id=109594",
      "https://doi.org/10.1007/s11160-022-09697-9",
      "https://agris.fao.org/search/ar/records/65de4b4c0f3e94b9e5cd1f43",
      "https://climadat.isprambiente.it/wp-content/uploads/2024/11/Scheda-indicatori_Thalassoma_definitiva.pdf"
    ]
  },
  {
    "id": "ornatewrasse",
    "name": "Ornate wrasse",
    "scientific": "Thalassoma pavo",
    "local": "Prasinogylos (Πρασινόγυλος)",
    "el": "Πρασινόγυλος",
    "group": "bottom",
    "methods": ["shore", "boat"],
    "depth": [0, 1, 20, 50],
    "sst": [13, 16, 29, 31],
    "habitat": { "rock": 1, "seagrass": 0.7, "coarse": 0.4, "sand": 0.2, "mud": 0, "open": 0 },
    "structure": 0.5,
    "dropoff": 0.1,
    "shoreKm": [0, 0.5],
    "activity": { "dawn": 0.4, "day": 1, "dusk": 0.7, "night": 0.05 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.4, 0.4, 0.4, 0.6, 0.8, 1, 1, 1, 1, 0.9, 0.7, 0.5],
    "waves": [0, 1],
    "current": 0.2,
    "front": 0.05,
    "chlorophyll": 0.1,
    "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Tiny hooks with shrimp, worm or bread paste off rocks and jetties in the shallows; hot sunny days, May–October.",
    "tips_el": "Μικρά αγκίστρια με γαρίδα, σκουλήκι ή ζύμη ψωμιού από βράχια και μόλους στα ρηχά· ζεστές ηλιόλουστες μέρες, Μάιο–Οκτώβριο.",
    "warning": null,
    "warning_el": null,
    "estimated": ["sst", "structure", "dropoff", "shoreKm", "moon", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Thalassoma-pavo.html",
      "https://climadat.isprambiente.it/wp-content/uploads/2024/11/Scheda-indicatori_Thalassoma_definitiva.pdf",
      "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11727560/",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/coris-julis_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://doi.org/10.1007/s11160-022-09697-9",
      "https://agris.fao.org/search/ar/records/65de4b4c0f3e94b9e5cd1f43"
    ]
  },
  {
    "id": "squirrelfish",
    "name": "Redcoat squirrelfish",
    "scientific": "Sargocentron rubrum",
    "local": "Rosos (Ρώσος)",
    "el": "Ρώσος",
    "group": "bottom",
    "methods": ["shore", "boat"],
    "depth": [1, 5, 40, 84],
    "sst": [14.5, 18, 30, 32],
    "habitat": { "rock": 1, "seagrass": 0.3, "coarse": 0.4, "sand": 0.1, "mud": 0.05, "open": 0 },
    "structure": 1,
    "dropoff": 0.4,
    "shoreKm": [0, 1.5],
    "activity": { "dawn": 0.4, "day": 0.1, "dusk": 0.9, "night": 1 },
    "moon": { "new": 1, "full": 0.9 },
    "season": [0.5, 0.4, 0.4, 0.5, 0.7, 0.9, 1, 1, 1, 0.9, 0.7, 0.6],
    "waves": [0, 1],
    "current": 0.5,
    "front": 0.05,
    "chlorophyll": 0.1,
    "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Small shrimp or squid baits on a light bottom rig close to rocks, caves and breakwaters after dusk; summer nights.",
    "tips_el": "Μικρή γαρίδα ή καλαμάρι σε ελαφριά αρματωσιά βυθού κοντά σε βράχια, σπηλιές και κυματοθραύστες μετά το σούρουπο· καλοκαιρινές νύχτες.",
    "warning": "Venomous spine on each gill cover (DFMR): hold it with a cloth behind the head. If stung, immerse in hot water (as hot as bearable) and seek medical advice if severe.",
    "warning_el": "Δηλητηριώδες αγκάθι σε κάθε βραγχιακό κάλυμμα (ΤΑΘΕ): πιάστε το με πανί πίσω από το κεφάλι. Αν τσιμπηθείτε, βάλτε το σημείο σε ζεστό νερό και ζητήστε ιατρική βοήθεια αν ο πόνος είναι έντονος.",
    "estimated": ["sst", "dropoff", "shoreKm", "moon", "waves", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Sargocentron-rubrum.html",
      "https://publications.gov.cy/assets/user/publications/2017/2017_078/GEORG_ALIEIAS_Toxika%20psaria.pdf",
      "https://fishes-fnam.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/taxon.php?id=108920",
      "https://www.seaaroundus.org/doc/publications/wp/2013/Ulman-et-al-Cyprus.pdf",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/sargocentron-rubrum_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://ciesm.org/atlas/fishes_2nd_edition/Sargocentron_rubrum.pdf",
      "https://doi.org/10.1007/s11160-022-09697-9"
    ]
  },
  {
    "id": "leatherjacket",
    "name": "Reticulated leatherjacket",
    "scientific": "Stephanolepis diaspros",
    "local": "Choiropsaro (Χοιρόψαρο)",
    "el": "Χοιρόψαρο",
    "group": "bottom",
    "methods": ["shore", "boat"],
    "depth": [0, 2, 30, 75],
    "sst": [13, 17, 29, 32],
    "habitat": { "rock": 1, "seagrass": 0.8, "coarse": 0.5, "sand": 0.5, "mud": 0.4, "open": 0 },
    "structure": 0.5,
    "dropoff": 0.2,
    "shoreKm": [0, 2],
    "activity": { "dawn": 0.7, "day": 1, "dusk": 0.8, "night": 0 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.5, 0.4, 0.4, 0.6, 0.8, 0.9, 1, 1, 1, 0.9, 0.7, 0.6],
    "waves": [0, 1],
    "current": 0.2,
    "front": 0.05,
    "chlorophyll": 0.2,
    "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Small strong hooks (it nibbles baits off) with squid or shrimp bits near rocks and seagrass; daytime, June–October.",
    "tips_el": "Μικρά γερά αγκίστρια (ξεδολώνει εύκολα) με κομματάκια καλαμαριού ή γαρίδας κοντά σε βράχια και φύκια· μέρα, Ιούνιο–Οκτώβριο.",
    "warning": null,
    "warning_el": null,
    "estimated": ["sst", "structure", "dropoff", "shoreKm", "moon", "season", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Stephanolepis-diaspros.html",
      "https://iucn-medmis.org/en/species/stephanolepis-diaspros",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/stephanolepis-diaspros_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://ciesm.org/atlas/fishes_2nd_edition/Stephanolepis_diaspros.pdf",
      "https://doi.org/10.1007/s11160-022-09697-9",
      "https://blackmeditjournal.org/wp-content/uploads/2018-242_149-156.pdf"
    ]
  },
  {
    "id": "toadfish",
    "name": "Silver-cheeked toadfish (invasive)",
    "scientific": "Lagocephalus sceleratus",
    "local": "Lagokefalos (Λαγοκέφαλος)",
    "el": "Λαγοκέφαλος (κουνελόψαρο)",
    "group": "bottom",
    "methods": ["boat", "shore", "spear"],
    "depth": [0, 5, 150, 200],
    "sst": [13, 16, 29, 32],
    "habitat": { "rock": 0.6, "seagrass": 1, "coarse": 0.7, "sand": 0.9, "mud": 0.7, "open": 0.5 },
    "structure": 0.3,
    "dropoff": 0.3,
    "shoreKm": [0, 10],
    "activity": { "dawn": 0.9, "day": 1, "dusk": 0.9, "night": 0.3 },
    "moon": { "new": 1, "full": 1 },
    "season": [0.3, 0.25, 0.3, 0.55, 0.85, 1, 1, 0.95, 0.85, 0.65, 0.5, 0.4],
    "waves": [0, 1.5],
    "current": 0.3,
    "front": 0.2,
    "chlorophyll": 0.3,
    "regulations": "Sale for food banned EU-wide: poisonous fish of the family Tetraodontidae must not be placed on the market (Reg. (EC) 853/2004, Annex III, Section VIII, Ch. V). The DFMR Director may modify the bag limit only for albacore and Lagocephalus, in approved competitions or fishing-tourism trips (Reg. 17B, KDP 416/2019). Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Απαγορεύεται σε όλη την ΕΕ η διάθεση στην αγορά δηλητηριωδών ψαριών της οικογένειας Tetraodontidae (Καν. (ΕΚ) 853/2004, Παράρτημα III, Τμήμα VIII, Κεφ. V). Ο Διευθυντής του ΤΑΘΕ μπορεί να τροποποιήσει το όριο αλιευμάτων μόνο για τον μακρύπτερο τόνο και τον λαγοκέφαλο, σε εγκεκριμένους διαγωνισμούς ή αλιευτικό τουρισμό (Καν. 17Β, ΚΔΠ 416/2019). Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Not a food fish. It shreds baits and line: use a wire leader, and move spot when it shows. Most common late spring–summer.",
    "tips_el": "Δεν τρώγεται. Κόβει δολώματα και πετονιές: βάλτε συρματόπετονια και αλλάξτε σημείο όταν εμφανιστεί. Πιο συχνός άνοιξη–καλοκαίρι.",
    "warning": "Deadly if eaten: tetrodotoxin survives cooking, no antidote; eating and selling it are banned. Beak bites: unhook with pliers. DFMR pays only professional fishers to remove it.",
    "warning_el": "Θανατηφόρος αν φαγωθεί: η τετροδοτοξίνη αντέχει στο μαγείρεμα, χωρίς αντίδοτο· απαγορεύεται η κατανάλωση και η πώληση. Δαγκώνει: ξαγκιστρώστε με πένσα. Το ΤΑΘΕ πληρώνει μόνο επαγγελματίες για την αφαίρεσή του.",
    "estimated": ["structure", "dropoff", "shoreKm", "moon", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://publications.gov.cy/assets/user/publications/2017/2017_078/GEORG_ALIEIAS_Toxika%20psaria.pdf",
      "https://www.fishbase.se/summary/Lagocephalus-sceleratus.html",
      "https://int-res.com/abstracts/sedao/v1/n1/p35-44",
      "https://www.seaaroundus.org/doc/publications/wp/2013/Ulman-et-al-Cyprus.pdf",
      "https://en.politis.com.cy/news/cy-news/1014698/cyprus-authorities-reassure-public-over-lagocephalus-fears",
      "https://en.politis.com.cy/news/cy-news/1014946/toxic-pufferfish-targeted-in-cyprus-as-fishers-paid-eur473-a-kilo",
      "https://www.cyprus-mail.com/2026/06/19/more-than-100-tonnes-of-invasive-pufferfish-removed-from-cypriot-waters",
      "https://eur-lex.europa.eu/eli/reg/2004/853/oj",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/lagocephalus-sceleratus_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://doi.org/10.4194/1303-2712-v17_4_08",
      "https://trjfas.org/pdf.php?id=1042",
      "https://doi.org/10.12681/mms.364",
      "https://ejournals.epublishing.ekt.gr/index.php/hcmr-med-mar-sc/article/view/12334",
      "https://www.mdpi.com/2076-3263/15/9/361",
      "https://orbit.dtu.dk/en/publications/forecasting-environmental-drivers-and-invasion-risk-of-ilagocepha/",
      "https://lionhare.hcmr.gr/wp-content/uploads/2022/10/Christidis_et_al.pdf",
      "https://ciesm.org/atlas/fishes_2nd_edition/Lagocephalus_sceleratus.pdf",
      "https://doi.org/10.1007/s11160-022-09697-9"
    ]
  },
  {
    "id": "weever",
    "name": "Greater weever",
    "scientific": "Trachinus draco",
    "local": "Drakaina (Δράκαινα)",
    "el": "Δράκαινα",
    "group": "bottom",
    "methods": ["shore", "boat"],
    "depth": [0, 1, 30, 150],
    "sst": [13, 16, 26, 29],
    "habitat": { "rock": 0.05, "seagrass": 0.2, "coarse": 0.6, "sand": 1, "mud": 0.8, "open": 0 },
    "structure": 0.1,
    "dropoff": 0.1,
    "shoreKm": [0, 3],
    "activity": { "dawn": 0.7, "day": 0.3, "dusk": 0.9, "night": 1 },
    "moon": { "new": 1, "full": 0.9 },
    "season": [0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1, 0.9, 0.8, 0.6, 0.5],
    "waves": [0.2, 1.5],
    "current": 0.3,
    "front": 0.05,
    "chlorophyll": 0.2,
    "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
    "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
    "tips": "Worm or shrimp on a running ledger over sandy bays such as Larnaca and Limassol, at dusk and night; summer. Unhook with pliers.",
    "tips_el": "Σκουλήκι ή γαρίδα σε αρματωσιά βυθού σε αμμώδεις κόλπους, όπως Λάρνακα και Λεμεσός, σούρουπο και νύχτα· καλοκαίρι. Ξαγκίστρωμα με πένσα.",
    "warning": "Venomous first dorsal fin and gill-cover spines (DFMR); it also stings waders who step on it in sand. If stung, immerse in hot water (as hot as bearable) and seek medical advice if severe.",
    "warning_el": "Δηλητηριώδη αγκάθια στο πρώτο ραχιαίο πτερύγιο και στα βραγχιακά καλύμματα (ΤΑΘΕ)· τσιμπά και λουόμενους που την πατούν στην άμμο. Αν τσιμπηθείτε, βάλτε το σημείο σε ζεστό νερό και ζητήστε ιατρική βοήθεια αν ο πόνος είναι έντονος.",
    "estimated": ["sst", "structure", "dropoff", "shoreKm", "moon", "waves", "current", "front", "chlorophyll"],
    "sources": [
      "https://www.fishbase.se/summary/Trachinus-draco.html",
      "https://publications.gov.cy/assets/user/publications/2017/2017_078/GEORG_ALIEIAS_Toxika%20psaria.pdf",
      "https://fish-commercial-names.ec.europa.eu/fish-names/species/trachinus-draco_en",
      "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
      "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
      "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
      "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text",
      "https://www.aquamaps.org/premap.php?cache=1&SpecID=Fis-30734"
    ]
  }
]);
// >>> round 11 species inventory (eval/species-inventory/new-species.mjs): do not edit by hand
// 19 fish added from the Cyprus species inventory (eval/species-inventory/INVENTORY.md: why each one, and what was left out).
// Sources per fish; every field in "estimated" is expert judgement. No existing profile was changed.
(window.PSAREMA_SPECIES ||= []).push(...[
 {
  "id": "stripedbream",
  "name": "Striped seabream",
  "scientific": "Lithognathus mormyrus",
  "local": "Mourmouros (Μούρμουρος)",
  "el": "Μουρμούρα",
  "group": "bottom",
  "methods": [
   "shore",
   "boat",
   "spear"
  ],
  "depth": [
   0,
   1,
   20,
   80
  ],
  "sst": [
   12,
   16,
   27,
   31
  ],
  "habitat": {
   "rock": 0.1,
   "seagrass": 0.5,
   "coarse": 0.5,
   "sand": 1,
   "mud": 0.7,
   "open": 0
  },
  "structure": 0.2,
  "dropoff": 0.1,
  "shoreKm": [
   0,
   2
  ],
  "activity": {
   "dawn": 0.9,
   "day": 0.5,
   "dusk": 1,
   "night": 0.9
  },
  "moon": {
   "new": 1,
   "full": 0.9
  },
  "season": [
   0.5,
   0.5,
   0.6,
   0.7,
   0.9,
   1,
   1,
   1,
   1,
   0.9,
   0.7,
   0.5
  ],
  "waves": [
   0.3,
   1.5
  ],
  "current": 0.3,
  "front": 0.1,
  "chlorophyll": 0.3,
  "regulations": "Minimum size 20 cm total length (Reg. (EU) 2019/1241 Annex IX, a size written for commercial catch; the DFMR recreational list, licence terms 2026 §13, does not name this fish, so whether it binds anglers is not clear: keep to 20 cm). Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Ελάχιστο μέγεθος 20 cm ολικό μήκος (Καν. (ΕΕ) 2019/1241, Παράρτημα IX, μέγεθος γραμμένο για την επαγγελματική αλιεία· ο κατάλογος του ΤΑΘΕ για τους ερασιτέχνες, όροι αδειών 2026 §13, δεν αναφέρει αυτό το ψάρι, άρα δεν είναι σαφές αν δεσμεύει τους ερασιτέχνες: κρατήστε τα 20 cm). Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Sandworm or shrimp on a light surf rig with a long trace, cast just behind the first breakers of sandy beaches; dusk into the night, May–October.",
  "tips_el": "Σκουλήκι της άμμου ή γαρίδα σε ελαφριά σύνθεση surf με μακρύ παράμαλλο, λίγο πίσω από το πρώτο κύμα σε αμμουδιές· από το σούρουπο ως τη νύχτα, Μάιο–Οκτώβριο.",
  "warning": "Minimum size 20 cm (EU list): small ones go back.",
  "warning_el": "Ελάχιστο μέγεθος 20 cm (κατάλογος ΕΕ): τα μικρά επιστρέφουν στη θάλασσα.",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Lithognathus-mormyrus.html",
   "https://eur-lex.europa.eu/eli/reg/2019/1241/oj",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY",
   "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text"
  ]
 },
 {
  "id": "picarel",
  "name": "Picarels",
  "scientific": "Spicara smaris, Spicara maena",
  "local": "Marida (Μαρίδα)",
  "el": "Μαρίδα",
  "group": "bottom",
  "methods": [
   "boat",
   "shore"
  ],
  "depth": [
   5,
   15,
   100,
   250
  ],
  "sst": [
   12,
   15,
   25,
   29
  ],
  "habitat": {
   "rock": 0.4,
   "seagrass": 1,
   "coarse": 0.6,
   "sand": 0.7,
   "mud": 0.7,
   "open": 0.4
  },
  "structure": 0.3,
  "dropoff": 0.3,
  "shoreKm": [
   0.2,
   8
  ],
  "activity": {
   "dawn": 1,
   "day": 0.8,
   "dusk": 0.9,
   "night": 0.3
  },
  "moon": {
   "new": 1,
   "full": 0.9
  },
  "season": [
   0.8,
   0.9,
   1,
   1,
   0.9,
   0.7,
   0.6,
   0.6,
   0.6,
   0.7,
   0.7,
   0.8
  ],
  "waves": [
   0,
   1.2
  ],
  "current": 0.4,
  "front": 0.3,
  "chlorophyll": 0.6,
  "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Sabiki, or size 12–14 hooks with tiny pieces of shrimp or fish, over groundbait from a boat above Posidonia at 15–50 m; late winter and spring.",
  "tips_el": "Τσαπαρί, ή αγκίστρια Νο 12–14 με μικρά κομματάκια γαρίδας ή ψαριού, με μαλάγρα από σκάφος πάνω από ποσειδωνία στα 15–50 m· τέλη χειμώνα και άνοιξη.",
  "warning": null,
  "warning_el": null,
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Spicara-smaris.html",
   "https://www.fishbase.se/summary/Spicara-maena.html",
   "https://www.seaaroundus.org/doc/publications/wp/2013/Ulman-et-al-Cyprus.pdf",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY",
   "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text"
  ]
 },
 {
  "id": "axillary",
  "name": "Axillary seabream",
  "scientific": "Pagellus acarne",
  "local": "Fatsoukli (Φατσούκλι)",
  "el": "Μουσμούλι",
  "group": "bottom",
  "methods": [
   "boat",
   "shore"
  ],
  "depth": [
   5,
   30,
   100,
   300
  ],
  "sst": [
   12,
   14,
   24,
   28
  ],
  "habitat": {
   "rock": 0.3,
   "seagrass": 0.8,
   "coarse": 0.8,
   "sand": 1,
   "mud": 0.7,
   "open": 0.1
  },
  "structure": 0.3,
  "dropoff": 0.4,
  "shoreKm": [
   0.3,
   10
  ],
  "activity": {
   "dawn": 1,
   "day": 0.8,
   "dusk": 0.9,
   "night": 0.4
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.8,
   0.8,
   0.8,
   0.8,
   0.9,
   1,
   1,
   1,
   0.9,
   0.9,
   0.8,
   0.8
  ],
  "waves": [
   0,
   1.2
  ],
  "current": 0.4,
  "front": 0.2,
  "chlorophyll": 0.3,
  "regulations": "Minimum size 17 cm total length (DFMR recreational licence terms 2026 §13, Fisheries Reg. 11; the same size as Reg. (EU) 2019/1241 Annex IX; applies to all recreational catch). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Ελάχιστο μέγεθος 17 cm ολικό μήκος (όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 §13, Καν. 11 των περί Αλιείας Κανονισμών· το ίδιο μέγεθος με τον Καν. (ΕΕ) 2019/1241, Παράρτημα IX· ισχύει για κάθε ερασιτεχνικό αλίευμα). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Size 8–10 hooks with shrimp, worm or squid on a 2–3 hook bottom rig, drifting over sand and seagrass edges at 30–80 m; it schools, so stay on the mark.",
  "tips_el": "Αγκίστρια Νο 8–10 με γαρίδα, σκουλήκι ή καλαμάρι σε σύνθεση βυθού 2–3 αγκιστριών, σε ντρίφτα πάνω από άμμο και άκρες ποσειδωνίας στα 30–80 m· κινείται σε κοπάδια, μείνετε στο σημείο.",
  "warning": "Minimum size 17 cm. The black spot at the base of the pectoral fin tells it from the pandora.",
  "warning_el": "Ελάχιστο μέγεθος 17 cm. Η μαύρη κηλίδα στη βάση του θωρακικού πτερυγίου το ξεχωρίζει από το λυθρίνι.",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Pagellus-acarne.html",
   "https://eur-lex.europa.eu/eli/reg/2019/1241/oj",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY",
   "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text"
  ]
 },
 {
  "id": "bluerunner",
  "name": "Blue runner",
  "scientific": "Caranx crysos",
  "local": "Souros (Σούρος)",
  "el": "Κοκάλι",
  "group": "pelagic",
  "methods": [
   "shore",
   "boat",
   "spear"
  ],
  "depth": [
   0,
   2,
   40,
   100
  ],
  "sst": [
   16,
   20,
   29,
   32
  ],
  "habitat": {
   "rock": 0.7,
   "seagrass": 0.4,
   "coarse": 0.5,
   "sand": 0.5,
   "mud": 0.2,
   "open": 0.7
  },
  "structure": 0.7,
  "dropoff": 0.5,
  "shoreKm": [
   0,
   6
  ],
  "activity": {
   "dawn": 1,
   "day": 0.7,
   "dusk": 1,
   "night": 0.2
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.2,
   0.2,
   0.2,
   0.4,
   0.6,
   0.8,
   1,
   1,
   1,
   0.9,
   0.6,
   0.3
  ],
  "waves": [
   0.2,
   1.5
  ],
  "current": 0.6,
  "front": 0.5,
  "chlorophyll": 0.5,
  "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Cast 10–30 g metal jigs, small minnows or poppers around harbour mouths, rocky points and fish-farm edges at dawn and dusk; summer and autumn.",
  "tips_el": "Μεταλλικά jig 10–30 g, μικρά ψαράκια ή poppers γύρω από στόμια λιμανιών, κάβους και άκρες ιχθυοκαλλιεργειών, χαράματα και σούρουπο· καλοκαίρι και φθινόπωρο.",
  "warning": null,
  "warning_el": null,
  "estimated": [
   "sst",
   "habitat",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Caranx-crysos.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY",
   "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text"
  ]
 },
 {
  "id": "triggerfish",
  "name": "Grey triggerfish",
  "scientific": "Balistes capriscus",
  "local": "Choiropsaro (Χοιρόψαρο)",
  "el": "Γουρουνόψαρο",
  "group": "bottom",
  "methods": [
   "boat",
   "spear",
   "shore"
  ],
  "depth": [
   0,
   5,
   55,
   100
  ],
  "sst": [
   14,
   18,
   28,
   31
  ],
  "habitat": {
   "rock": 1,
   "seagrass": 0.4,
   "coarse": 0.7,
   "sand": 0.4,
   "mud": 0.1,
   "open": 0.2
  },
  "structure": 0.8,
  "dropoff": 0.5,
  "shoreKm": [
   0,
   5
  ],
  "activity": {
   "dawn": 0.7,
   "day": 1,
   "dusk": 0.6,
   "night": 0.05
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.3,
   0.3,
   0.3,
   0.5,
   0.7,
   0.9,
   1,
   1,
   1,
   0.8,
   0.5,
   0.3
  ],
  "waves": [
   0,
   1.2
  ],
  "current": 0.3,
  "front": 0.2,
  "chlorophyll": 0.2,
  "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Small strong hooks (4–1) with shrimp, crab or squid on a bottom rig over rocky reefs and wrecks at 10–50 m; it nibbles, so wait before you strike. Summer.",
  "tips_el": "Μικρά, γερά αγκίστρια (4–1) με γαρίδα, καβούρι ή καλαμάρι σε σύνθεση βυθού πάνω από ξέρες και ναυάγια στα 10–50 m· τσιμπολογά, περιμένετε πριν καρφώσετε. Καλοκαίρι.",
  "warning": "It bites hard with beak-like teeth, and the first dorsal spine locks upright: unhook with pliers. IUCN Vulnerable.",
  "warning_el": "Δαγκώνει δυνατά με δόντια σαν ράμφος, και το πρώτο ραχιαίο αγκάθι κλειδώνει όρθιο: ξαγκίστρωμα με πένσα. Ευάλωτο είδος (IUCN).",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Balistes-capriscus.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY",
   "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text"
  ]
 },
 {
  "id": "razorfish",
  "name": "Pearly razorfish",
  "scientific": "Xyrichtys novacula",
  "local": "Pontikos (Ποντικός)",
  "el": "Κατσούλα",
  "group": "bottom",
  "methods": [
   "boat",
   "shore"
  ],
  "depth": [
   1,
   3,
   30,
   90
  ],
  "sst": [
   15,
   19,
   28,
   31
  ],
  "habitat": {
   "rock": 0.05,
   "seagrass": 0.4,
   "coarse": 0.7,
   "sand": 1,
   "mud": 0.2,
   "open": 0
  },
  "structure": 0.1,
  "dropoff": 0.1,
  "shoreKm": [
   0,
   3
  ],
  "activity": {
   "dawn": 0.5,
   "day": 1,
   "dusk": 0.5,
   "night": 0
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.1,
   0.1,
   0.2,
   0.4,
   0.7,
   1,
   1,
   1,
   1,
   0.7,
   0.3,
   0.1
  ],
  "waves": [
   0,
   1
  ],
  "current": 0.2,
  "front": 0.05,
  "chlorophyll": 0.1,
  "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Size 8–10 hooks with shrimp or worm on a light bottom rig over clean sand beside seagrass at 5–25 m, by day in summer. It dives into the sand when alarmed.",
  "tips_el": "Αγκίστρια Νο 8–10 με γαρίδα ή σκουλήκι σε ελαφριά σύνθεση βυθού πάνω από καθαρή άμμο δίπλα σε ποσειδωνία στα 5–25 m, μέρα, το καλοκαίρι. Όταν τρομάξει χώνεται στην άμμο.",
  "warning": "Sharp front teeth: it bites when unhooked.",
  "warning_el": "Κοφτερά μπροστινά δόντια: δαγκώνει στο ξαγκίστρωμα.",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Xyrichtys-novacula.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "shidrum",
  "name": "Shi drum",
  "scientific": "Umbrina cirrosa",
  "local": "Mylokopi (Μυλοκόπι)",
  "el": "Μυλοκόπι",
  "group": "bottom",
  "methods": [
   "shore",
   "boat",
   "spear"
  ],
  "depth": [
   0,
   2,
   30,
   100
  ],
  "sst": [
   12,
   16,
   26,
   30
  ],
  "habitat": {
   "rock": 0.5,
   "seagrass": 0.4,
   "coarse": 0.6,
   "sand": 1,
   "mud": 0.8,
   "open": 0
  },
  "structure": 0.4,
  "dropoff": 0.2,
  "shoreKm": [
   0,
   2
  ],
  "activity": {
   "dawn": 0.8,
   "day": 0.3,
   "dusk": 1,
   "night": 1
  },
  "moon": {
   "new": 1,
   "full": 0.9
  },
  "season": [
   0.4,
   0.4,
   0.5,
   0.7,
   0.9,
   1,
   1,
   0.9,
   0.9,
   0.8,
   0.6,
   0.4
  ],
  "waves": [
   0.3,
   1.8
  ],
  "current": 0.3,
  "front": 0.1,
  "chlorophyll": 0.4,
  "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Worm, shrimp or crab on a surf rig in the gutters of sandy beaches and beside river mouths after a blow; dusk and night, late spring to autumn.",
  "tips_el": "Σκουλήκι, γαρίδα ή καβούρι σε σύνθεση surf στα κανάλια των αμμουδιών και δίπλα σε εκβολές μετά από φουρτούνα· σούρουπο και νύχτα, τέλη άνοιξης ως φθινόπωρο.",
  "warning": "IUCN Vulnerable and uncommon around Cyprus: think about releasing it.",
  "warning_el": "Ευάλωτο είδος (IUCN) και όχι συχνό στην Κύπρο: σκεφτείτε να το απελευθερώσετε.",
  "estimated": [
   "sst",
   "habitat",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Umbrina-cirrosa.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "bluefin",
  "banned": true,
  "name": "Atlantic bluefin tuna",
  "scientific": "Thunnus thynnus",
  "local": "Erythros tonos (Ερυθρός τόνος)",
  "el": "Τόνος (ερυθρός)",
  "group": "pelagic",
  "methods": [
   "boat"
  ],
  "depth": [
   50,
   200,
   2500,
   3000
  ],
  "sst": [
   14,
   18,
   26,
   30
  ],
  "habitat": {
   "rock": 0,
   "seagrass": 0,
   "coarse": 0,
   "sand": 0,
   "mud": 0,
   "open": 1
  },
  "structure": 0.1,
  "dropoff": 0.5,
  "shoreKm": [
   3,
   60
  ],
  "activity": {
   "dawn": 1,
   "day": 0.7,
   "dusk": 0.8,
   "night": 0.2
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.1,
   0.1,
   0.2,
   0.5,
   1,
   1,
   0.6,
   0.3,
   0.3,
   0.3,
   0.2,
   0.1
  ],
  "waves": [
   0,
   1.5
  ],
  "current": 0.4,
  "front": 0.9,
  "chlorophyll": 0.4,
  "regulations": "Fishing for or keeping bluefin tuna is prohibited for recreational fishers in Cyprus (DFMR recreational licence terms 2026 §9); professionals need a special permit (DFMR notice, August 2024). A bluefin caught by accident must be released at once, in a way that gives it the best chance to survive. EU/ICCAT (Reg. (EU) 2023/2053): minimum size 30 kg or 115 cm fork length.",
  "regulations_el": "Η αλιεία και η κατοχή ερυθρού τόνου απαγορεύεται στους ερασιτέχνες στην Κύπρο (όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 §9)· οι επαγγελματίες χρειάζονται ειδική άδεια (ανακοίνωση ΤΑΘΕ, Αύγουστος 2024). Τόνος που πιάνεται κατά λάθος απελευθερώνεται αμέσως, με τρόπο που του δίνει τις περισσότερες πιθανότητες να ζήσει. ΕΕ/ICCAT (Καν. (ΕΕ) 2023/2053): ελάχιστο μέγεθος 30 kg ή 115 cm μήκος ως τη διχάλα της ουράς.",
  "tips": "Not a legal recreational target in Cyprus. Schools pass offshore in late spring; if one takes a lure meant for albacore, release it in the water.",
  "tips_el": "Δεν επιτρέπεται η ερασιτεχνική αλιεία του στην Κύπρο. Τα κοπάδια περνούν ανοιχτά στα τέλη της άνοιξης· αν πάρει τεχνητό που προοριζόταν για τονάκι, απελευθερώστε τον μέσα στο νερό.",
  "warning": "Keeping it is illegal for amateurs. Unlike the albacore, its pectoral fin is short and does not reach the second dorsal fin.",
  "warning_el": "Οι ερασιτέχνες απαγορεύεται να τον κρατήσουν. Σε αντίθεση με το τονάκι, το θωρακικό πτερύγιο είναι κοντό και δεν φτάνει στο δεύτερο ραχιαίο.",
  "estimated": [
   "depth",
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Thunnus-thynnus.html",
   "https://cyprus-mail.com/2024/08/05/fishermen-catching-bluefin-tuna-must-throw-it-back",
   "https://eur-lex.europa.eu/eli/reg/2023/2053/oj",
    "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "bullettuna",
  "name": "Bullet tuna",
  "scientific": "Auxis rochei",
  "local": "Palamida / Kopani (Κοπάνι)",
  "el": "Κοπάνι",
  "group": "pelagic",
  "methods": [
   "boat",
   "shore"
  ],
  "depth": [
   5,
   15,
   100,
   300
  ],
  "sst": [
   16,
   20,
   28,
   31
  ],
  "habitat": {
   "rock": 0.3,
   "seagrass": 0.2,
   "coarse": 0.3,
   "sand": 0.3,
   "mud": 0.1,
   "open": 0.9
  },
  "structure": 0.2,
  "dropoff": 0.5,
  "shoreKm": [
   0.2,
   15
  ],
  "activity": {
   "dawn": 1,
   "day": 0.7,
   "dusk": 0.9,
   "night": 0.1
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.2,
   0.2,
   0.2,
   0.4,
   0.7,
   0.9,
   1,
   1,
   1,
   0.9,
   0.6,
   0.3
  ],
  "waves": [
   0.2,
   1.5
  ],
  "current": 0.6,
  "front": 0.7,
  "chlorophyll": 0.5,
  "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Troll small feathers or 7–9 cm minnows at 5–7 knots, or cast 15–30 g jigs into surface boils; summer and autumn, at dawn.",
  "tips_el": "Συρτή με μικρά φτερά ή ψαράκια 7–9 cm στους 5–7 κόμβους, ή ρίψεις με jig 15–30 g εκεί που βράζει η επιφάνεια· καλοκαίρι και φθινόπωρο, χαράματα.",
  "warning": "Bluefin tuna may not be kept: recreational bluefin fishing is banned in Cyprus. The bullet tuna is small (to 50 cm), with a scaleless body behind the corselet and wavy dark bars on the back.",
  "warning_el": "Ο ερυθρός τόνος δεν κρατιέται: η ερασιτεχνική αλιεία του απαγορεύεται στην Κύπρο. Το κοπάνι είναι μικρό (ως 50 cm), χωρίς λέπια πίσω από τον θώρακα και με κυματιστές σκούρες γραμμές στη ράχη.",
  "estimated": [
   "depth",
   "sst",
   "habitat",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Auxis-rochei.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY",
   "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text"
  ]
 },
 {
  "id": "damselfish",
  "name": "Damselfish",
  "scientific": "Chromis chromis",
  "local": "Papadia (Παπαδιά)",
  "el": "Καλόγρια",
  "group": "bottom",
  "methods": [
   "shore",
   "boat"
  ],
  "depth": [
   1,
   3,
   25,
   40
  ],
  "sst": [
   12,
   15,
   28,
   31
  ],
  "habitat": {
   "rock": 1,
   "seagrass": 0.8,
   "coarse": 0.4,
   "sand": 0.1,
   "mud": 0,
   "open": 0.1
  },
  "structure": 0.7,
  "dropoff": 0.4,
  "shoreKm": [
   0,
   1.5
  ],
  "activity": {
   "dawn": 0.6,
   "day": 1,
   "dusk": 0.6,
   "night": 0
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.6,
   0.6,
   0.7,
   0.8,
   0.9,
   1,
   1,
   1,
   1,
   0.9,
   0.8,
   0.6
  ],
  "waves": [
   0,
   1
  ],
  "current": 0.3,
  "front": 0.05,
  "chlorophyll": 0.3,
  "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "A bait-stealer more than a target: size 14–16 hooks with bread paste or a speck of shrimp under a float by the rocks. If it strips your bait, fish deeper or use bigger baits.",
  "tips_el": "Περισσότερο κλέφτης δολωμάτων παρά στόχος: αγκίστρια Νο 14–16 με ζύμη ή ελάχιστη γαρίδα σε φελλό δίπλα στα βράχια. Αν σας καθαρίζει το δόλωμα, ψαρέψτε πιο βαθιά ή με μεγαλύτερα δολώματα.",
  "warning": null,
  "warning_el": null,
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Chromis-chromis.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "lizardfish",
  "name": "Atlantic lizardfish",
  "scientific": "Synodus saurus",
  "local": "Papanikolis (Παπανικολής)",
  "el": "Σκαρμός",
  "group": "bottom",
  "methods": [
   "shore",
   "boat"
  ],
  "depth": [
   1,
   3,
   20,
   100
  ],
  "sst": [
   14,
   18,
   28,
   31
  ],
  "habitat": {
   "rock": 0.3,
   "seagrass": 0.3,
   "coarse": 0.8,
   "sand": 1,
   "mud": 0.4,
   "open": 0
  },
  "structure": 0.2,
  "dropoff": 0.2,
  "shoreKm": [
   0,
   3
  ],
  "activity": {
   "dawn": 0.9,
   "day": 0.8,
   "dusk": 1,
   "night": 0.5
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.5,
   0.5,
   0.6,
   0.7,
   0.9,
   1,
   1,
   1,
   1,
   0.9,
   0.7,
   0.5
  ],
  "waves": [
   0,
   1.2
  ],
  "current": 0.3,
  "front": 0.1,
  "chlorophyll": 0.2,
  "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "It grabs small soft lures, metal jigs and fish strips worked along the sand near rocks at 2–20 m; a common by-catch when spinning.",
  "tips_el": "Αρπάζει μικρές σιλικόνες, μεταλλικά jig και λωρίδες ψαριού που δουλεύονται πάνω στην άμμο κοντά σε βράχια στα 2–20 m· συχνό παρεμπίπτον αλίευμα στο spinning.",
  "warning": "Many needle-like teeth: unhook with pliers.",
  "warning_el": "Πολλά δόντια σαν βελόνες: ξαγκίστρωμα με πένσα.",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Synodus-saurus.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "stargazer",
  "name": "Atlantic stargazer",
  "scientific": "Uranoscopus scaber",
  "local": "Lychnos (Λύχνος)",
  "el": "Λύχνος",
  "group": "bottom",
  "methods": [
   "boat",
   "shore"
  ],
  "depth": [
   5,
   15,
   100,
   400
  ],
  "sst": [
   13,
   15,
   25,
   28
  ],
  "habitat": {
   "rock": 0.05,
   "seagrass": 0.2,
   "coarse": 0.6,
   "sand": 1,
   "mud": 1,
   "open": 0
  },
  "structure": 0.1,
  "dropoff": 0.1,
  "shoreKm": [
   0.2,
   10
  ],
  "activity": {
   "dawn": 0.7,
   "day": 0.6,
   "dusk": 0.8,
   "night": 0.8
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.6,
   0.6,
   0.7,
   0.8,
   0.9,
   1,
   1,
   1,
   0.9,
   0.8,
   0.7,
   0.6
  ],
  "waves": [
   0,
   1.5
  ],
  "current": 0.2,
  "front": 0.05,
  "chlorophyll": 0.2,
  "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "By-catch on bottom rigs with shrimp, worm or fish strip over sand and mud at 15–80 m from a boat. Very good in fish soup.",
  "tips_el": "Παρεμπίπτον αλίευμα σε συνθέσεις βυθού με γαρίδα, σκουλήκι ή λωρίδα ψαριού, πάνω από άμμο και λάσπη στα 15–80 m από σκάφος. Πολύ καλός στην ψαρόσουπα.",
  "warning": "A large venomous spine behind each gill cover (DFMR), and it can give a weak electric shock. Hold it from below with a cloth and unhook with pliers. If stung, warm the spot and seek medical advice if the pain is strong.",
  "warning_el": "Μεγάλο δηλητηριώδες αγκάθι πίσω από κάθε βραγχιακό επικάλυμμα (ΤΑΘΕ), και μπορεί να δώσει ασθενή ηλεκτρική εκκένωση. Κρατήστε τον από κάτω με πανί και ξαγκιστρώστε με πένσα. Αν τσιμπηθείτε, ζεστάνετε το σημείο και ζητήστε ιατρική συμβουλή αν ο πόνος είναι έντονος.",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Uranoscopus-scaber.html",
   "https://publications.gov.cy/assets/user/publications/2017/2017_078/GEORG_ALIEIAS_Toxika%20psaria.pdf",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "peacockwrasse",
  "name": "Peacock wrasse",
  "scientific": "Symphodus tinca",
  "local": "Cheilou (Χειλού)",
  "el": "Χειλού",
  "group": "bottom",
  "methods": [
   "shore",
   "spear",
   "boat"
  ],
  "depth": [
   1,
   2,
   20,
   50
  ],
  "sst": [
   11,
   14,
   27,
   30
  ],
  "habitat": {
   "rock": 1,
   "seagrass": 1,
   "coarse": 0.4,
   "sand": 0.2,
   "mud": 0,
   "open": 0
  },
  "structure": 0.5,
  "dropoff": 0.2,
  "shoreKm": [
   0,
   1
  ],
  "activity": {
   "dawn": 0.6,
   "day": 1,
   "dusk": 0.5,
   "night": 0
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.5,
   0.5,
   0.6,
   0.9,
   1,
   1,
   0.9,
   0.9,
   0.9,
   0.8,
   0.6,
   0.5
  ],
  "waves": [
   0,
   1
  ],
  "current": 0.2,
  "front": 0.05,
  "chlorophyll": 0.1,
  "regulations": "Spearfishing: licence, over 15 years old (15–17 only with an adult licence holder), free-diving only, sunrise to sunset only, no lights or scuba, not in bathing areas or near fishing gear; max 5 kg + 1 fish per person, per trip/24 h (Reg. 17, 17B; terms §21–24). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Size 8–12 hooks with shrimp, worm or mussel under a float or on a light ledger beside weedy rocks and Posidonia at 1–10 m; by day, spring to autumn.",
  "tips_el": "Αγκίστρια Νο 8–12 με γαρίδα, σκουλήκι ή μύδι σε φελλό ή ελαφρύ βυθό, δίπλα σε βράχια με φύκια και ποσειδωνία στα 1–10 m· μέρα, άνοιξη ως φθινόπωρο.",
  "warning": null,
  "warning_el": null,
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Symphodus-tinca.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "yellowpuffer",
  "name": "Yellowspotted puffer (invasive)",
  "scientific": "Torquigener flavimaculosus",
  "local": "Mappouroui (Μαππουρούι)",
  "el": "Κιτρινόστικτος λαγοκέφαλος (ξενικό)",
  "group": "bottom",
  "methods": [
   "shore",
   "boat"
  ],
  "depth": [
   1,
   3,
   30,
   60
  ],
  "sst": [
   15,
   19,
   30,
   33
  ],
  "habitat": {
   "rock": 0.4,
   "seagrass": 0.9,
   "coarse": 0.7,
   "sand": 1,
   "mud": 0.5,
   "open": 0
  },
  "structure": 0.2,
  "dropoff": 0.1,
  "shoreKm": [
   0,
   3
  ],
  "activity": {
   "dawn": 0.7,
   "day": 1,
   "dusk": 0.7,
   "night": 0.1
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.4,
   0.4,
   0.5,
   0.7,
   0.9,
   1,
   1,
   1,
   1,
   0.9,
   0.7,
   0.5
  ],
  "waves": [
   0,
   1.2
  ],
  "current": 0.2,
  "front": 0.05,
  "chlorophyll": 0.2,
  "regulations": "Sale for food banned EU-wide: poisonous fish of the family Tetraodontidae must not be placed on the market (Reg. (EC) 853/2004, Annex III, Section VIII, Ch. V). Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Απαγορεύεται σε όλη την ΕΕ η διάθεση στην αγορά δηλητηριωδών ψαριών της οικογένειας Tetraodontidae (Καν. (ΕΚ) 853/2004, Παράρτημα III, Τμήμα VIII, Κεφ. V). Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Not a food fish. It swarms over sand and seagrass at 2–30 m and strips small baits: when it shows, move, fish bigger baits or go deeper.",
  "tips_el": "Δεν τρώγεται. Μαζεύεται σε πλήθος πάνω από άμμο και ποσειδωνία στα 2–30 m και καθαρίζει τα μικρά δολώματα: όταν εμφανιστεί, αλλάξτε σημείο, βάλτε μεγαλύτερα δολώματα ή ψαρέψτε πιο βαθιά.",
  "warning": "Do not eat it: a pufferfish. DFMR tells the public to avoid eating it and FishBase lists it as poisonous; no pufferfish may be sold in the EU. Its beak cuts thin line.",
  "warning_el": "Μην το φάτε: είναι λαγοκέφαλος. Το ΤΑΘΕ συστήνει να αποφεύγεται η κατανάλωσή του και η FishBase το αναφέρει ως δηλητηριώδες· κανένας λαγοκέφαλος δεν πωλείται στην ΕΕ. Το ράμφος του κόβει τις λεπτές πετονιές.",
  "estimated": [
   "sst",
   "habitat",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Torquigener-flavimaculosus.html",
   "https://publications.gov.cy/assets/user/publications/2017/2017_078/GEORG_ALIEIAS_Toxika%20psaria.pdf",
   "https://eur-lex.europa.eu/eli/reg/2004/853/oj",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "stingray",
  "banned": true,
  "name": "Common stingray",
  "scientific": "Dasyatis pastinaca",
  "local": "Vati (Βατί)",
  "el": "Τρυγόνα",
  "group": "bottom",
  "methods": [
   "shore",
   "boat"
  ],
  "depth": [
   1,
   5,
   35,
   200
  ],
  "sst": [
   13,
   16,
   27,
   30
  ],
  "habitat": {
   "rock": 0.2,
   "seagrass": 0.5,
   "coarse": 0.5,
   "sand": 1,
   "mud": 0.9,
   "open": 0
  },
  "structure": 0.1,
  "dropoff": 0.1,
  "shoreKm": [
   0,
   5
  ],
  "activity": {
   "dawn": 0.7,
   "day": 0.3,
   "dusk": 0.9,
   "night": 1
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.4,
   0.4,
   0.5,
   0.7,
   0.9,
   1,
   1,
   1,
   0.9,
   0.7,
   0.5,
   0.4
  ],
  "waves": [
   0,
   1.2
  ],
  "current": 0.2,
  "front": 0.05,
  "chlorophyll": 0.3,
  "regulations": "Protected in Cyprus: fishing for or keeping any shark or ray is prohibited by the DFMR recreational licence terms 2026 (§9). One caught by accident must be released at once, with the least possible harm. The term binds licence holders (boat, speargun, fish traps); for a rod from the shore, which needs no licence, we could not find a rule that says the same: release it there too.",
  "regulations_el": "Προστατεύεται στην Κύπρο: οι όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 (§9) απαγορεύουν την αλιεία και την κατοχή κάθε καρχαρία ή σελαχιού. Όποιο πιαστεί κατά λάθος απελευθερώνεται αμέσως, με όσο λιγότερη βλάβη γίνεται. Ο όρος δεσμεύει τους αδειούχους (σκάφος, ψαροντούφεκο, ψαροπαγίδες)· για το καλάμι από την ακτή, που δεν θέλει άδεια, δεν βρήκαμε κανόνα που να λέει το ίδιο: απελευθερώστε το κι εκεί.",
  "tips": "By-catch on fish or squid baits left on sandy bottom at night, from beaches and boats. Not to be fished for or kept (DFMR licence terms 2026 §9): release it by cutting the line close, without lifting it.",
  "tips_el": "Παρεμπίπτον αλίευμα σε δολώματα ψαριού ή καλαμαριού αφημένα σε αμμώδη βυθό τη νύχτα, από αμμουδιές και σκάφη. Δεν επιτρέπεται η αλιεία ούτε η κατοχή του (όροι αδειών ΤΑΘΕ 2026 §9): απελευθερώστε το κόβοντας την πετονιά κοντά, χωρίς να το σηκώσετε.",
  "warning": "Venomous barbed spine on the tail (DFMR): it whips the tail over its back. Keep clear of the tail and never stand on it. A sting needs medical care at once; warming the spot eases the pain.",
  "warning_el": "Δηλητηριώδες αγκάθι με δόντια στην ουρά (ΤΑΘΕ): τινάζει την ουρά πάνω από την πλάτη. Μακριά από την ουρά και ποτέ πάτημα. Το τσίμπημα θέλει άμεση ιατρική φροντίδα· η θέρμανση του σημείου ανακουφίζει τον πόνο.",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Dasyatis-pastinaca.html",
   "https://publications.gov.cy/assets/user/publications/2017/2017_078/GEORG_ALIEIAS_Toxika%20psaria.pdf",
   "https://mdpi.com/2410-3888/6/3/24",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "electricray",
  "banned": true,
  "name": "Marbled electric ray",
  "scientific": "Torpedo marmorata",
  "local": "Moudiastra (Μουδιάστρα)",
  "el": "Μουδιάστρα",
  "group": "bottom",
  "methods": [
   "boat",
   "shore"
  ],
  "depth": [
   2,
   5,
   60,
   300
  ],
  "sst": [
   12,
   14,
   22,
   28
  ],
  "habitat": {
   "rock": 0.4,
   "seagrass": 0.8,
   "coarse": 0.6,
   "sand": 1,
   "mud": 0.7,
   "open": 0
  },
  "structure": 0.2,
  "dropoff": 0.2,
  "shoreKm": [
   0,
   6
  ],
  "activity": {
   "dawn": 0.5,
   "day": 0.1,
   "dusk": 0.8,
   "night": 1
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   1,
   1,
   1,
   0.9,
   0.7,
   0.5,
   0.4,
   0.4,
   0.5,
   0.7,
   0.9,
   1
  ],
  "waves": [
   0,
   1.2
  ],
  "current": 0.2,
  "front": 0.05,
  "chlorophyll": 0.2,
  "regulations": "Protected in Cyprus: fishing for or keeping any shark or ray is prohibited by the DFMR recreational licence terms 2026 (§9). One caught by accident must be released at once, with the least possible harm. The term binds licence holders (boat, speargun, fish traps); for a rod from the shore, which needs no licence, we could not find a rule that says the same: release it there too.",
  "regulations_el": "Προστατεύεται στην Κύπρο: οι όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 (§9) απαγορεύουν την αλιεία και την κατοχή κάθε καρχαρία ή σελαχιού. Όποιο πιαστεί κατά λάθος απελευθερώνεται αμέσως, με όσο λιγότερη βλάβη γίνεται. Ο όρος δεσμεύει τους αδειούχους (σκάφος, ψαροντούφεκο, ψαροπαγίδες)· για το καλάμι από την ακτή, που δεν θέλει άδεια, δεν βρήκαμε κανόνα που να λέει το ίδιο: απελευθερώστε το κι εκεί.",
  "tips": "An occasional night by-catch on fish baits over sand and seagrass. Not to be fished for or kept (DFMR licence terms 2026 §9): release it without touching it.",
  "tips_el": "Πού και πού πιάνεται τη νύχτα σε δολώματα ψαριού πάνω από άμμο και ποσειδωνία. Δεν επιτρέπεται η αλιεία ούτε η κατοχή της (όροι αδειών ΤΑΘΕ 2026 §9): απελευθερώστε τη χωρίς να την αγγίξετε.",
  "warning": "It gives a painful electric shock when touched. Do not handle it with bare or wet hands: cut the line, or use long pliers.",
  "warning_el": "Δίνει επώδυνη ηλεκτρική εκκένωση όταν την αγγίξετε. Όχι με γυμνά ή βρεγμένα χέρια: κόψτε την πετονιά ή χρησιμοποιήστε μακριά πένσα.",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Torpedo-marmorata.html",
   "https://mdpi.com/2410-3888/6/3/24",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "guitarfish",
  "banned": true,
  "name": "Guitarfishes (protected)",
  "scientific": "Rhinobatos rhinobatos, Glaucostegus cemiculus",
  "local": "Viola (Βιόλα)",
  "el": "Ρινόβατος (κιθάρα)",
  "group": "bottom",
  "methods": [
   "shore",
   "boat"
  ],
  "depth": [
   0,
   3,
   40,
   100
  ],
  "sst": [
   14,
   18,
   28,
   31
  ],
  "habitat": {
   "rock": 0.1,
   "seagrass": 0.4,
   "coarse": 0.5,
   "sand": 1,
   "mud": 0.9,
   "open": 0
  },
  "structure": 0.1,
  "dropoff": 0.1,
  "shoreKm": [
   0,
   5
  ],
  "activity": {
   "dawn": 0.8,
   "day": 0.4,
   "dusk": 1,
   "night": 0.9
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.3,
   0.3,
   0.4,
   0.6,
   0.9,
   1,
   1,
   1,
   0.9,
   0.6,
   0.4,
   0.3
  ],
  "waves": [
   0,
   1.2
  ],
  "current": 0.2,
  "front": 0.05,
  "chlorophyll": 0.3,
  "regulations": "Protected: the sharks and rays of Annex II of the Barcelona Convention SPA/BD Protocol, which lists both guitarfishes, may not be retained on board, transhipped, landed, stored or sold, and must be released promptly and alive (Reg. (EU) 2023/2124, Art. 98, which replaced Reg. (EU) No 1343/2011). In Cyprus the recreational licence terms 2026 (§9) also prohibit fishing for or keeping any shark or ray. Both rules are written for vessels and licence holders; release one caught from the shore too: both species are Critically Endangered (IUCN).",
  "regulations_el": "Προστατευόμενα: οι καρχαρίες και τα σελάχια του Παραρτήματος II του Πρωτοκόλλου SPA/BD της Σύμβασης της Βαρκελώνης, όπου ανήκουν και οι δύο ρινόβατοι, απαγορεύεται να κρατούνται στο σκάφος, να μεταφορτώνονται, να εκφορτώνονται, να αποθηκεύονται ή να πωλούνται, και απελευθερώνονται αμέσως και ζωντανοί (Καν. (ΕΕ) 2023/2124, άρθρο 98, που αντικατέστησε τον Καν. (ΕΕ) 1343/2011). Στην Κύπρο οι όροι αδειών ερασιτεχνικής αλιείας 2026 (§9) απαγορεύουν επίσης την αλιεία και την κατοχή κάθε καρχαρία ή σελαχιού. Οι δύο κανόνες είναι γραμμένοι για σκάφη και αδειούχους· απελευθερώστε και όποιον πιαστεί από την ακτή: και τα δύο είδη είναι κρισίμως κινδυνεύοντα (IUCN).",
  "tips": "Protected: not a target. It takes fish and shrimp baits on sandy beaches and bays in summer; if hooked, keep it in the water, free the hook or cut the line short, and let it go.",
  "tips_el": "Προστατευόμενο: δεν στοχεύεται. Παίρνει δολώματα ψαριού και γαρίδας σε αμμουδιές και κόλπους το καλοκαίρι· αν πιαστεί, κρατήστε το μέσα στο νερό, βγάλτε το αγκίστρι ή κόψτε κοντά την πετονιά και αφήστε το.",
  "warning": "Must be released: Critically Endangered. Harmless to people; never drag it up the beach by the tail.",
  "warning_el": "Απελευθερώνεται υποχρεωτικά: κρισίμως κινδυνεύον είδος. Ακίνδυνο για τον άνθρωπο· ποτέ σύρσιμο στην άμμο από την ουρά.",
  "estimated": [
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "activity",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Rhinobatos-rhinobatos.html",
   "https://www.fishbase.se/summary/Glaucostegus-cemiculus.html",
   "https://eur-lex.europa.eu/eli/reg/2023/2124/oj",
    "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://mdpi.com/2410-3888/6/3/24",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 },
 {
  "id": "thornback",
  "banned": true,
  "name": "Thornback ray",
  "scientific": "Raja clavata",
  "local": "Raza (Ράζα)",
  "el": "Σαλάχι (βάτος)",
  "group": "bottom",
  "methods": [
   "boat"
  ],
  "depth": [
   5,
   20,
   150,
   400
  ],
  "sst": [
   10,
   13,
   22,
   26
  ],
  "habitat": {
   "rock": 0.1,
   "seagrass": 0.2,
   "coarse": 0.8,
   "sand": 1,
   "mud": 1,
   "open": 0
  },
  "structure": 0.1,
  "dropoff": 0.2,
  "shoreKm": [
   0.5,
   15
  ],
  "activity": {
   "dawn": 0.6,
   "day": 0.3,
   "dusk": 0.8,
   "night": 1
  },
  "moon": {
   "new": 1,
   "full": 1
  },
  "season": [
   0.9,
   1,
   1,
   0.9,
   0.8,
   0.6,
   0.5,
   0.5,
   0.6,
   0.7,
   0.8,
   0.9
  ],
  "waves": [
   0,
   1.5
  ],
  "current": 0.2,
  "front": 0.05,
  "chlorophyll": 0.2,
  "regulations": "Protected in Cyprus: fishing for or keeping any shark or ray is prohibited by the DFMR recreational licence terms 2026 (§9). One caught by accident must be released at once, with the least possible harm. The term binds licence holders (boat, speargun, fish traps); for a rod from the shore, which needs no licence, we could not find a rule that says the same: release it there too.",
  "regulations_el": "Προστατεύεται στην Κύπρο: οι όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 (§9) απαγορεύουν την αλιεία και την κατοχή κάθε καρχαρία ή σελαχιού. Όποιο πιαστεί κατά λάθος απελευθερώνεται αμέσως, με όσο λιγότερη βλάβη γίνεται. Ο όρος δεσμεύει τους αδειούχους (σκάφος, ψαροντούφεκο, ψαροπαγίδες)· για το καλάμι από την ακτή, που δεν θέλει άδεια, δεν βρήκαμε κανόνα που να λέει το ίδιο: απελευθερώστε το κι εκεί.",
  "tips": "By-catch on fish or squid baits on bottom rigs over sand and mud at 30–150 m. Not to be fished for or kept (DFMR licence terms 2026 §9): release it at once.",
  "tips_el": "Παρεμπίπτον αλίευμα σε δολώματα ψαριού ή καλαμαριού σε συνθέσεις βυθού πάνω από άμμο και λάσπη στα 30–150 m. Δεν επιτρέπεται η αλιεία ούτε η κατοχή του (όροι αδειών ΤΑΘΕ 2026 §9): απελευθερώστε το αμέσως.",
  "warning": "Rows of sharp thorns on the back and tail: hold it by the edge of the snout with gloves or a cloth. IUCN Near Threatened.",
  "warning_el": "Σειρές από κοφτερά αγκάθια στη ράχη και την ουρά: κρατήστε το από την άκρη του ρύγχους με γάντια ή πανί. Σχεδόν απειλούμενο είδος (IUCN).",
  "estimated": [
   "depth",
   "sst",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "season"
  ],
  "sources": [
   "https://www.fishbase.se/summary/Raja-clavata.html",
   "https://mdpi.com/2410-3888/6/3/24",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY",
   "https://datacollection.jrc.ec.europa.eu/documents/d/dcf/cyp_wp_2018-2019_text"
  ]
 },
 {
  "id": "reefsquid",
  "name": "Bigfin reef squid (invasive)",
  "scientific": "Sepioteuthis lessoniana",
  "local": "Soupiokalamaro (Σουπιοκαλάμαρο)",
  "el": "Σουπιοκαλάμαρο (ξενικό)",
  "group": "cephalopod",
  "methods": [
   "shore",
   "boat"
  ],
  "depth": [
   0,
   2,
   30,
   100
  ],
  "sst": [
   16,
   20,
   30,
   32
  ],
  "habitat": {
   "rock": 0.8,
   "seagrass": 1,
   "coarse": 0.6,
   "sand": 0.6,
   "mud": 0.2,
   "open": 0.3
  },
  "structure": 0.5,
  "dropoff": 0.3,
  "shoreKm": [
   0,
   3
  ],
  "activity": {
   "dawn": 0.7,
   "day": 0.2,
   "dusk": 1,
   "night": 1
  },
  "moon": {
   "new": 1,
   "full": 0.8
  },
  "season": [
   0.3,
   0.3,
   0.3,
   0.5,
   0.7,
   0.9,
   1,
   1,
   1,
   1,
   0.8,
   0.5
  ],
  "waves": [
   0,
   0.8
  ],
  "current": 0.3,
  "front": 0.2,
  "chlorophyll": 0.3,
  "regulations": "Boat: licence, with the boat declared for the year; max 10 kg, or 5 kg + 1 fish, per boat, per trip/24 h (Reg. 17A, 17B; terms §3, §20). Cut off the upper tail lobe of every fish you keep; sale banned (Reg. 17B).",
  "regulations_el": "Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).",
  "tips": "Egi 3.0–3.5 worked with sharp jerks and long pauses over seagrass and rocks from piers and rocky points at dusk and night; summer and autumn, when the native squid is scarce.",
  "tips_el": "Καλαμαριέρες 3,0–3,5 με κοφτά τινάγματα και μεγάλες παύσεις πάνω από ποσειδωνία και βράχια, από προβλήτες και κάβους, σούρουπο και νύχτα· καλοκαίρι και φθινόπωρο, όταν το ντόπιο καλαμάρι σπανίζει.",
  "warning": null,
  "warning_el": null,
  "estimated": [
   "sst",
   "habitat",
   "structure",
   "dropoff",
   "shoreKm",
   "moon",
   "waves",
   "current",
   "front",
   "chlorophyll",
   "season"
  ],
  "sources": [
   "https://www.sealifebase.se/summary/Sepioteuthis-lessoniana.html",
   "http://www.cylaw.org/KDP/data/2019_1_416.pdf",
   "https://www.gov.cy/media/sites/2/2026/05/Terms-of-recreational-fishing-licenses-2026-1.pdf",
   "https://www.checkincyprus.com/article/43743/ti-allazei-sten-erasitekhnike-alieia/",
   "https://fish-commercial-names.ec.europa.eu/fish-names/commercial-designations_el?ms=CY"
  ]
 }
]);
// <<< round 11 species inventory
