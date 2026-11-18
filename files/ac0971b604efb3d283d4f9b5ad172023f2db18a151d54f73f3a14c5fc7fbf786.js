// Greek texts for the data files (species.js, protected.js). Interface strings live in psarema.html.
window.PSAREMA_EL = {
  species: {
    sargos: 'Σαργός', tsipoura: 'Τσιπούρα', grouper: 'Ροφός', dentex: 'Συναγρίδα', amberjack: 'Μαγιάτικο',
    dolphinfish: 'Κυνηγός (Λαμπούκα)', albacore: 'Μακρύπτερος τόνος', leerfish: 'Λίτσα', barracuda: 'Λούτσος',
    parrotfish: 'Σκάρος', rabbitfish: 'Κουρκούνα', lionfish: 'Λεοντόψαρο (ξενικό)', squid: 'Καλαμάρι',
    cuttlefish: 'Σουπιά', octopus: 'Χταπόδι',
  },

  // Built from the parts of the English rules text, which uses the same few clauses for every species.
  regulations(en) { // round 14: the clauses as checked against the DFMR licence terms 2026 and KDP 416/2019 (eval/LOG.md)
    if (!en) return '';
    const size = en.match(/^Minimum size (\d+) cm/);
    let s = size ? `Ελάχιστο μέγεθος ${size[1]} cm ολικό μήκος (όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 §13, Καν. 11 των περί Αλιείας Κανονισμών· το ίδιο μέγεθος με τον Καν. (ΕΕ) 2019/1241, Παράρτημα IX· ισχύει για κάθε ερασιτεχνικό αλίευμα). ` : '';
    if (/one dusky grouper/.test(en)) s += 'Μόνο ένας ροφός ανά ψαρά, ή ανά σκάφος, ανά έξοδο/24 ώρες (όροι §11). ';
    if (/one common dentex/.test(en)) s += 'Μόνο μία συναγρίδα ανά ψαρά, ή ανά σκάφος, ανά έξοδο/24 ώρες (όροι αδειών ερασιτεχνικής αλιείας ΤΑΘΕ 2026 §11). ';
    if (/albacore/.test(en)) s += 'Όριο σκάφους στην Κύπρο: 3 μακρύπτεροι τόνοι + 5 kg άλλων ειδών ανά σκάφος, ανά έξοδο/24 ώρες, όσοι αδειούχοι κι αν είναι πάνω (Καν. 17Β· όροι αδειών ΤΑΘΕ 2026 §20). Απαγορεύεται 1–31 Μαρτίου και 1 Οκτωβρίου–30 Νοεμβρίου (§10)· σκάφος που πήρε άδεια και δηλώθηκε μετά την προθεσμία αιτήσεων του ΤΑΘΕ για τη χρονιά δεν επιτρέπεται να ψαρέψει μακρύπτερο τόνο (§10). ';
    if (/Spearfishing:/.test(en)) s += 'Ψαροντούφεκο: άδεια, ηλικία άνω των 15 (15–17 μόνο με συνοδεία ενήλικα αδειούχου), μόνο με ελεύθερη κατάδυση, μόνο από την ανατολή ως τη δύση του ηλίου, χωρίς φώτα ή αναπνευστική συσκευή, όχι σε περιοχές λουομένων ούτε κοντά σε αλιευτικά εργαλεία· έως 5 kg + 1 ψάρι ανά άτομο, ανά έξοδο/24 ώρες (Καν. 17, 17Β· όροι §21–24). ';
    if (/Boat: licence/.test(en)) s += 'Σκάφος: άδεια, με το σκάφος δηλωμένο για τη χρονιά· έως 10 kg, ή 5 kg + 1 ψάρι, ανά σκάφος, ανά έξοδο/24 ώρες (Καν. 17Α, 17Β· όροι §3, §20). ';
    if (/Octopus jigs/.test(en)) s += 'Χταποδιέρες, και χταπόδι πάνω στο σκάφος, μόνο τη μέρα και μόνο Δευτέρα, Τετάρτη, Σάββατο, Κυριακή και αργίες· Ιούλιο και Αύγουστο χωρίς αυτόν τον περιορισμό (όροι §18). ';
    if (/tail lobe/.test(en)) s += 'Κόβεται ο πάνω λοβός της ουράς σε κάθε ψάρι που κρατάτε· απαγορεύεται η πώληση (Καν. 17Β).';
    return s.trim() || en;
  },

  zoneKind: { 'no-take': 'πλήρης απαγόρευση', restricted: 'περιορισμοί', protected: 'προστατευόμενη' },

  zoneName(en) {
    const fixed = this.zoneNames[en];
    if (fixed) return fixed;
    let m = en.match(/^Fish farm 100 m zone \((.*)\)$/);
    if (m) return `Ζώνη 100 m ιχθυοκαλλιέργειας (${m[1]})`;
    m = en.match(/^Seamark restricted area \((.*)\)$/);
    if (m) return `Περιορισμένη περιοχή σημαδούρας (${m[1]})`;
    return en;
  },
  zoneNames: {
    'Dasoudi (Limassol) artificial-reef MPA': 'ΘΠΠ τεχνητού υφάλου Δασουδίου (Λεμεσός)',
    'Amathounta MPA - core': 'ΘΠΠ Αμαθούντας – πυρήνας',
    'Amathounta MPA - neutral zone': 'ΘΠΠ Αμαθούντας – ουδέτερη ζώνη',
    'Larnaca artificial-reef MPA (wrecks LEF1, Elpida)': 'ΘΠΠ τεχνητού υφάλου Λάρνακας (ναυάγια LEF1, Ελπίδα)',
    'Ayia Napa artificial-reef MPA (MUSAN, Kyrenia replica wreck)': 'ΘΠΠ τεχνητού υφάλου Αγίας Νάπας (MUSAN, αντίγραφο πλοίου Κερύνειας)',
    'Cape Greco MPA - core': 'ΘΠΠ Κάβο Γκρέκο – πυρήνας',
    'Cape Greco MPA - neutral zone (north)': 'ΘΠΠ Κάβο Γκρέκο – ουδέτερη ζώνη (βόρεια)',
    'Cape Greco MPA - neutral zone (south-west)': 'ΘΠΠ Κάβο Γκρέκο – ουδέτερη ζώνη (νοτιοδυτικά)',
    'Cape Greco MPA - full reported extent': 'ΘΠΠ Κάβο Γκρέκο – πλήρης δηλωμένη έκταση',
    'Paralimni artificial-reef MPA': 'ΘΠΠ τεχνητού υφάλου Παραλιμνίου',
    'Geroskipou artificial-reef MPA (Laboe wreck)': 'ΘΠΠ τεχνητού υφάλου Γεροσκήπου (ναυάγιο Laboe)',
    'Bania (Paphos) MPA': 'ΘΠΠ Μπάνια (Πάφος)',
    'Pegeia sea caves MPA - core': 'ΘΠΠ θαλάσσιων σπηλιών Πέγειας – πυρήνας',
    'Pegeia sea caves MPA - neutral zone': 'ΘΠΠ θαλάσσιων σπηλιών Πέγειας – ουδέτερη ζώνη',
    'Pegeia sea caves MPA - full reported extent': 'ΘΠΠ θαλάσσιων σπηλιών Πέγειας – πλήρης δηλωμένη έκταση',
    'Kakoskali MPA - core': 'ΘΠΠ Κακοσκάλι – πυρήνας',
    'Kakoskali MPA - neutral zone': 'ΘΠΠ Κακοσκάλι – ουδέτερη ζώνη',
    'Chalavro (Halavro) MPA': 'ΘΠΠ Χαλαυρού',
    'Agios Georgios Alamanou MPA': 'ΘΠΠ Αγίου Γεωργίου Αλαμάνου',
    'Ayia Napa sea caves MPA': 'ΘΠΠ θαλάσσιων σπηλιών Αγίας Νάπας',
    'Larnaca desalination plant zone': 'Ζώνη μονάδας αφαλάτωσης Λάρνακας',
    'Zenobia wreck (500 m)': 'Ναυάγιο Zenobia (500 m)',
    'Lara-Toxeftra turtle reserve': 'Περιοχή προστασίας χελωνών Λάρας–Τοξεύτρας',
    'Mazotos ancient shipwreck': 'Αρχαίο ναυάγιο Μαζωτού',
    'Moulia marine area (Natura 2000 CY4000006)': 'Θαλάσσια περιοχή Μουλιά (Natura 2000 CY4000006)',
    'Nisia marine area, Ayia Napa (Natura 2000 CY3000006)': 'Θαλάσσια περιοχή Νησιά, Αγία Νάπα (Natura 2000 CY3000006)',
    'Oceanid (Natura 2000 SPA/SCI)': 'Oceanid (Natura 2000 ΖΕΠ/ΤΚΣ)',
    'Polis - Gialia (Natura 2000 SCI)': 'Πόλη – Γιαλιά (Natura 2000 ΤΚΣ)',
    'Cape Aspro - Petra tou Romiou (Natura 2000)': 'Κάβο Άσπρο – Πέτρα του Ρωμιού (Natura 2000)',
    'Akamas Peninsula (Natura 2000 SCI)': 'Χερσόνησος Ακάμα (Natura 2000 ΤΚΣ)',
    'Akamas Peninsula (Natura 2000 SPA)': 'Χερσόνησος Ακάμα (Natura 2000 ΖΕΠ)',
    'Cape Greco (Natura 2000 SCI)': 'Κάβο Γκρέκο (Natura 2000 ΤΚΣ)',
    'Cape Greco (Natura 2000 SPA)': 'Κάβο Γκρέκο (Natura 2000 ΖΕΠ)',
  },

  zoneRules: {
    'All fishing banned, including recreational (KDP 29/2021). Motor boats only in the marked transit corridor (state, sailing-club safety and flagged dive boats excepted).':
      'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική (ΚΔΠ 29/2021). Μηχανοκίνητα σκάφη μόνο στον σημαδεμένο διάδρομο διέλευσης (εκτός από κρατικά σκάφη, σκάφη ασφαλείας ναυτικών ομίλων και σκάφη καταδύσεων με σημαία).',
    'All fishing banned, including recreational; motor-boat passage banned except state and flagged dive boats (KDP 445/2017).':
      'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική· απαγορεύεται η διέλευση μηχανοκίνητων σκαφών, εκτός από κρατικά και σκάφη καταδύσεων με σημαία (ΚΔΠ 445/2017).',
    'All fishing banned, including recreational, except licensed small-scale coastal fishing vessels of categories A and B (KDP 445/2017).':
      'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική, εκτός από αδειούχα σκάφη παράκτιας αλιείας μικρής κλίμακας κατηγορίας Α και Β (ΚΔΠ 445/2017).',
    'All fishing banned, including recreational (KDP 124/2020). Motor boats banned within 200 m of wrecks LEF1 and Elpida (state and flagged dive boats excepted).':
      'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική (ΚΔΠ 124/2020). Απαγορεύονται τα μηχανοκίνητα σκάφη σε απόσταση 200 m από τα ναυάγια LEF1 και Ελπίδα (εκτός από κρατικά και σκάφη καταδύσεων με σημαία).',
    'All fishing banned, including recreational (KDP 322/2021). No boats over the MUSAN underwater museum, or within 150 m of the Kyrenia wreck point (state and flagged dive boats excepted at the wreck).':
      'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική (ΚΔΠ 322/2021). Κανένα σκάφος πάνω από το υποβρύχιο μουσείο MUSAN, ούτε σε απόσταση 150 m από το ναυάγιο «Κερύνεια» (στο ναυάγιο εξαιρούνται τα κρατικά και τα σκάφη καταδύσεων με σημαία).',
    'All fishing banned, including recreational (KDP 115/2018; as on the DFMR restricted-areas map, June 2026).':
      'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική (ΚΔΠ 115/2018· όπως στον χάρτη απαγορευμένων περιοχών του ΤΑΘΕ, Ιούνιος 2026).',
    'All fishing banned except holders of a professional coastal fishing licence; recreational fishing banned (KDP 115/2018; as on the DFMR restricted-areas map, June 2026).':
      'Απαγορεύεται κάθε αλιεία, εκτός από τους κατόχους επαγγελματικής άδειας παράκτιας αλιείας· η ερασιτεχνική αλιεία απαγορεύεται (ΚΔΠ 115/2018· όπως στον χάρτη απαγορευμένων περιοχών του ΤΑΘΕ, Ιούνιος 2026).',
    'Officially reported MPA extent (EEA NatDA CY073), larger than the core and neutral zones of KDP 115/2018. The DFMR restricted-areas map (June 2026) shows no fishing ban outside those zones, but says it may not be complete: check with DFMR before you fish here.':
      'Επίσημα δηλωμένη έκταση της ΘΠΠ (ΕΟΠ NatDA CY073), μεγαλύτερη από τον πυρήνα και τις ουδέτερες ζώνες της ΚΔΠ 115/2018. Ο χάρτης απαγορευμένων περιοχών του ΤΑΘΕ (Ιούνιος 2026) δεν δείχνει απαγόρευση αλιείας έξω από αυτές τις ζώνες, αλλά αναφέρει ότι ίσως δεν είναι πλήρης: ρωτήστε το ΤΑΘΕ πριν ψαρέψετε εδώ.',
    'All fishing banned, including recreational (KDP 404/2017).': 'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική (ΚΔΠ 404/2017).',
    'All fishing banned, including recreational (KDP 489/2014). Boats banned within 150 m of the Laboe wreck point except for mooring.':
      'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική (ΚΔΠ 489/2014). Απαγορεύονται τα σκάφη σε απόσταση 150 m από το ναυάγιο Laboe, εκτός για πρόσδεση.',
    'All fishing banned, including recreational (KDP 66/2017).': 'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική (ΚΔΠ 66/2017).',
    'All fishing banned, including rod fishing from the shore; boat passage and anchoring banned (KDP 98/2025).':
      'Απαγορεύεται κάθε αλιεία, και με καλάμι από την ακτή· απαγορεύονται η διέλευση και η αγκυροβολία σκαφών (ΚΔΠ 98/2025).',
    'All fishing banned, including rod fishing from the shore, except holders of a professional coastal fishing licence; boat passage and anchoring banned (KDP 98/2025).':
      'Απαγορεύεται κάθε αλιεία, και με καλάμι από την ακτή, εκτός από κατόχους επαγγελματικής άδειας παράκτιας αλιείας· απαγορεύονται η διέλευση και η αγκυροβολία σκαφών (ΚΔΠ 98/2025).',
    'Whole MPA (EEA NatDA CY079): all fishing banned except licensed professional coastal fishers in the neutral zone; no boats or anchoring (KDP 98/2025).':
      'Ολόκληρη η ΘΠΠ (ΕΟΠ NatDA CY079): απαγορεύεται κάθε αλιεία, εκτός από αδειούχους επαγγελματίες παράκτιους αλιείς στην ουδέτερη ζώνη· χωρίς σκάφη ή αγκυροβολία (ΚΔΠ 98/2025).',
    'All fishing banned, including recreational (KDP 258/2019).': 'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική (ΚΔΠ 258/2019).',
    'All fishing banned, including recreational, except holders of a professional coastal fishing licence (KDP 258/2019).':
      'Απαγορεύεται κάθε αλιεία, και η ερασιτεχνική, εκτός από κατόχους επαγγελματικής άδειας παράκτιας αλιείας (ΚΔΠ 258/2019).',
    'All fishing banned, including rod fishing from the shore; all boat passage banned (KDP 91/2023).':
      'Απαγορεύεται κάθε αλιεία, και με καλάμι από την ακτή· απαγορεύεται κάθε διέλευση σκαφών (ΚΔΠ 91/2023).',
    'All fishing banned, including rod fishing from the shore; boat passage and anchoring banned (KDP 47/2023). Shore to 5 m depth.':
      'Απαγορεύεται κάθε αλιεία, και με καλάμι από την ακτή· απαγορεύονται η διέλευση και η αγκυροβολία σκαφών (ΚΔΠ 47/2023). Από την ακτή ως βάθος 5 m.',
    'All fishing banned, including rod fishing from the shore (KDP 46/2023). Boat passage and anchoring banned 1 Nov-30 Apr.':
      'Απαγορεύεται κάθε αλιεία, και με καλάμι από την ακτή (ΚΔΠ 46/2023). Η διέλευση και η αγκυροβολία σκαφών απαγορεύονται από 1 Νοεμβρίου ως 30 Απριλίου.',
    'All fishing banned (KDP 379/2021).': 'Απαγορεύεται κάθε αλιεία (ΚΔΠ 379/2021).',
    "All fishing banned within 500 m of the wreck point 34°53.830'N 33°39.450'E (KDP 379/2021).":
      "Απαγορεύεται κάθε αλιεία σε ακτίνα 500 m από το σημείο του ναυαγίου 34°53.830'N 33°39.450'E (ΚΔΠ 379/2021).",
    '1 Jun-30 Sep: no boat passage or anchoring and no fishing of any kind except from the shore. May and Oct: no boat passage (licensed small-scale coastal fishers excepted) and no anchoring (KDP 234/2018; as on the DFMR restricted-areas map, June 2026). The legal zone runs from the shore to 20 m depth, from Aspros to Argaki tou Giousoufi; the outline drawn here is the EEA one and differs from the DFMR outline by up to about 170 m.':
      '1 Ιουν.–30 Σεπτ.: απαγορεύεται η διέλευση και η αγκυροβόληση σκαφών και κάθε αλιεία εκτός από την ακτή. Μάιο και Οκτώβριο: απαγορεύεται η διέλευση (εκτός από αδειούχους παράκτιας αλιείας μικρής κλίμακας) και η αγκυροβόληση σκαφών (ΚΔΠ 234/2018· όπως στον χάρτη απαγορευμένων περιοχών του ΤΑΘΕ, Ιούνιος 2026). Η νόμιμη ζώνη είναι από την ακτή ως τα 20 m βάθος, από τον «Άσπρο» ως το «Αργάκι του Γιουσούφη»· το περίγραμμα εδώ είναι του ΕΟΠ και διαφέρει από του ΤΑΘΕ έως περίπου 170 m.',
    'All fishing banned (Antiquities Law Cap. 31 s.18C, KDP 237/2019 and the fishing licence terms; as on the DFMR restricted-areas map, June 2026).':
      'Απαγορεύεται κάθε αλιεία (περί Αρχαιοτήτων Νόμος Κεφ. 31 άρθρο 18Γ, ΚΔΠ 237/2019 και όροι αδειών αλιείας· όπως στον χάρτη απαγορευμένων περιοχών του ΤΑΘΕ, Ιούνιος 2026).',
    'Within 100 m of fish-farm installations: no spearfishing, no fishing with lights or compressed air, no nets, longlines, handlines or any hook gear (KDP 533/2002 reg. 14). Farm outline from OSM + 100 m.':
      'Σε απόσταση 100 m από εγκαταστάσεις ιχθυοκαλλιέργειας: απαγορεύονται η υποβρύχια αλιεία, η αλιεία με φώτα ή πεπιεσμένο αέρα, τα δίχτυα, τα παραγάδια, οι πετονιές και κάθε εργαλείο με αγκίστρι (ΚΔΠ 533/2002, κανονισμός 14). Περίγραμμα μονάδας από το OpenStreetMap + 100 m.',
    'OpenStreetMap seamark: no fishing and no anchoring. Legal basis not stated in OSM; check with DFMR.':
      'Σήμανση OpenStreetMap: απαγορεύονται η αλιεία και η αγκυροβολία. Η νομική βάση δεν αναφέρεται· ρωτήστε το ΤΑΘΕ.',
    'Trawling and coastal fishing methods (as defined in the Fisheries Law) banned; anchoring banned except within 200 m of two set points (KDP 264/2025). Recreational fishing not addressed; check with DFMR.':
      'Απαγορεύονται η τράτα και οι μέθοδοι παράκτιας αλιείας (όπως ορίζονται στον Περί Αλιείας Νόμο)· η αγκυροβολία απαγορεύεται, εκτός σε ακτίνα 200 m από δύο καθορισμένα σημεία (ΚΔΠ 264/2025). Η ερασιτεχνική αλιεία δεν ρυθμίζεται ρητά· ρωτήστε το ΤΑΘΕ.',
    'Trawling and coastal fishing methods (as defined in the Fisheries Law) banned; anchoring banned at 15-40 m depth (KDP 263/2025). Recreational fishing not addressed; check with DFMR.':
      'Απαγορεύονται η τράτα και οι μέθοδοι παράκτιας αλιείας (όπως ορίζονται στον Περί Αλιείας Νόμο)· απαγορεύεται η αγκυροβολία σε βάθος 15–40 m (ΚΔΠ 263/2025). Η ερασιτεχνική αλιεία δεν ρυθμίζεται ρητά· ρωτήστε το ΤΑΘΕ.',
    'Natura 2000 site; no fishing ban confirmed. Fishing rules not confirmed; check with DFMR.':
      'Περιοχή Natura 2000· δεν επιβεβαιώθηκε απαγόρευση αλιείας. Ρωτήστε το ΤΑΘΕ για τους κανόνες.',
    'Special Environmental Protection Area (northern Cyprus). Fishing rules not confirmed; outside DFMR control, check with local authorities.':
      'Ειδική Περιοχή Περιβαλλοντικής Προστασίας (βόρεια Κύπρος). Οι κανόνες αλιείας δεν επιβεβαιώθηκαν· εκτός ελέγχου του ΤΑΘΕ.',
  },
};
