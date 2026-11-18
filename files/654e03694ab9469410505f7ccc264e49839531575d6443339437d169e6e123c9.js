// Empirical per-species stats of the shipped occurrences (data/sightings.js) against the app grids (depth m, shore distance km = app chamfer distance). Built by eval/build-truth.mjs --ship.
window.PSAREMA_CALIBRATION = {
 "sargos": {
  "n": 46,
  "depthQ": [
   1,
   3,
   4,
   6,
   9
  ],
  "habitat": {
   "seagrass": 0.43,
   "mud": 0.09,
   "sand": 0.11,
   "unknown": 0.33,
   "rock": 0.04
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.36
  ],
  "obisDepthQ": [
   10.1,
   11,
   11,
   16,
   16
  ],
  "obisDepthN": 3,
  "ncShare": 0.83,
  "bias": "98% divers/citizen science, 2% surveys/collections/literature; 39% moved from land to the nearest sea cell"
 },
 "tsipoura": {
  "n": 1,
  "depthQ": [
   6,
   6,
   6,
   6,
   6
  ],
  "habitat": {
   "sand": 1
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.23
  ],
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 100% moved from land to the nearest sea cell"
 },
 "grouper": {
  "n": 12,
  "depthQ": [
   3,
   8,
   40,
   40,
   40
  ],
  "habitat": {
   "mud": 0.75,
   "seagrass": 0.08,
   "unknown": 0.17
  },
  "shoreKmQ": [
   0.23,
   2.05,
   2.05
  ],
  "obisDepthQ": [
   15.5,
   15.5,
   15.9,
   16,
   16
  ],
  "obisDepthN": 7,
  "ncShare": 0.58,
  "bias": "67% divers/citizen science, 33% surveys/collections/literature; 8% moved from land to the nearest sea cell"
 },
 "dentex": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "amberjack": {
  "n": 6,
  "depthQ": [
   7,
   7,
   8,
   12,
   40
  ],
  "habitat": {
   "mud": 0.33,
   "sand": 0.17,
   "seagrass": 0.5
  },
  "shoreKmQ": [
   0.23,
   1.27,
   2.05
  ],
  "obisDepthQ": [
   15.1,
   15.1,
   15.1,
   15.1,
   15.1
  ],
  "obisDepthN": 1,
  "ncShare": 0.83,
  "bias": "83% divers/citizen science, 17% surveys/collections/literature; 0% moved from land to the nearest sea cell"
 },
 "dolphinfish": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "albacore": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "leerfish": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "barracuda": {
  "n": 24,
  "depthQ": [
   4,
   5,
   8,
   36,
   40
  ],
  "habitat": {
   "mud": 0.42,
   "seagrass": 0.25,
   "unknown": 0.17,
   "rock": 0.08,
   "sand": 0.08
  },
  "shoreKmQ": [
   0.23,
   0.63,
   2.05
  ],
  "obisDepthQ": [
   5,
   5,
   14.4,
   15.5,
   22
  ],
  "obisDepthN": 16,
  "ncShare": 0.83,
  "bias": "58% divers/citizen science, 42% surveys/collections/literature; 21% moved from land to the nearest sea cell"
 },
 "parrotfish": {
  "n": 58,
  "depthQ": [
   1,
   3,
   4,
   8,
   13
  ],
  "habitat": {
   "seagrass": 0.59,
   "mud": 0.09,
   "rock": 0.07,
   "unknown": 0.16,
   "sand": 0.1
  },
  "shoreKmQ": [
   0.23,
   0.23,
   1.27
  ],
  "obisDepthQ": [
   2,
   4.9,
   5.5,
   11.8,
   14.4
  ],
  "obisDepthN": 14,
  "ncShare": 0.83,
  "bias": "91% divers/citizen science, 9% surveys/collections/literature; 24% moved from land to the nearest sea cell"
 },
 "rabbitfish": {
  "n": 117,
  "depthQ": [
   1,
   2,
   4,
   7,
   13
  ],
  "habitat": {
   "mud": 0.06,
   "unknown": 0.24,
   "seagrass": 0.55,
   "rock": 0.08,
   "sand": 0.08
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.55
  ],
  "obisDepthQ": [
   2,
   3,
   10,
   15,
   20
  ],
  "obisDepthN": 29,
  "ncShare": 0.85,
  "bias": "66% divers/citizen science, 34% surveys/collections/literature; 39% moved from land to the nearest sea cell"
 },
 "lionfish": {
  "n": 423,
  "depthQ": [
   3,
   6,
   11,
   15,
   29
  ],
  "habitat": {
   "seagrass": 0.65,
   "unknown": 0.15,
   "sand": 0.07,
   "mud": 0.08,
   "rock": 0.05
  },
  "shoreKmQ": [
   0.23,
   0.36,
   1.35
  ],
  "obisDepthQ": [
   6,
   10,
   18,
   30,
   33.5
  ],
  "obisDepthN": 256,
  "ncShare": 0.98,
  "bias": "15% divers/citizen science, 85% surveys/collections/literature; 20% moved from land to the nearest sea cell"
 },
 "squid": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "cuttlefish": {
  "n": 9,
  "depthQ": [
   1,
   2,
   4,
   11,
   11
  ],
  "habitat": {
   "seagrass": 0.56,
   "rock": 0.11,
   "unknown": 0.22,
   "sand": 0.11
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.28
  ],
  "obisDepthQ": [
   5.2,
   5.2,
   5.2,
   5.2,
   5.2
  ],
  "obisDepthN": 1,
  "ncShare": 0.67,
  "bias": "78% divers/citizen science, 22% surveys/collections/literature; 22% moved from land to the nearest sea cell"
 },
 "octopus": {
  "n": 23,
  "depthQ": [
   3,
   3,
   4,
   5,
   8
  ],
  "habitat": {
   "seagrass": 0.57,
   "unknown": 0.35,
   "sand": 0.09
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.36
  ],
  "obisDepthQ": [
   4.6,
   4.6,
   5.2,
   5.2,
   5.2
  ],
  "obisDepthN": 2,
  "ncShare": 0.78,
  "bias": "91% divers/citizen science, 9% surveys/collections/literature; 48% moved from land to the nearest sea cell"
 },
 "twoband": {
  "n": 35,
  "depthQ": [
   1,
   4,
   6,
   33,
   40
  ],
  "habitat": {
   "mud": 0.31,
   "sand": 0.23,
   "seagrass": 0.29,
   "unknown": 0.11,
   "rock": 0.03,
   "coarse": 0.03
  },
  "shoreKmQ": [
   0.23,
   0.36,
   2.05
  ],
  "obisDepthQ": [
   5.1,
   7,
   12.9,
   15.2,
   15.5
  ],
  "obisDepthN": 9,
  "ncShare": 0.89,
  "bias": "94% divers/citizen science, 6% surveys/collections/literature; 23% moved from land to the nearest sea cell"
 },
 "annular": {
  "n": 2,
  "depthQ": [
   1,
   1,
   4,
   4,
   4
  ],
  "habitat": {
   "rock": 0.5,
   "seagrass": 0.5
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.23
  ],
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 50% moved from land to the nearest sea cell"
 },
 "sharpsnout": {
  "n": 4,
  "depthQ": [
   1,
   2,
   3,
   3,
   12
  ],
  "habitat": {
   "rock": 0.25,
   "seagrass": 0.75
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.68
  ],
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 25% moved from land to the nearest sea cell"
 },
 "melanouri": {
  "n": 33,
  "depthQ": [
   1,
   3,
   4,
   6,
   9
  ],
  "habitat": {
   "seagrass": 0.45,
   "unknown": 0.39,
   "mud": 0.12,
   "sand": 0.03
  },
  "shoreKmQ": [
   0.23,
   0.23,
   1.27
  ],
  "obisDepthQ": [
   3.9,
   3.9,
   7,
   7,
   7
  ],
  "obisDepthN": 2,
  "ncShare": 0.79,
  "bias": "85% divers/citizen science, 15% surveys/collections/literature; 42% moved from land to the nearest sea cell"
 },
 "salema": {
  "n": 11,
  "depthQ": [
   1,
   4,
   4,
   12,
   20
  ],
  "habitat": {
   "mud": 0.18,
   "unknown": 0.09,
   "seagrass": 0.45,
   "sand": 0.18,
   "rock": 0.09
  },
  "shoreKmQ": [
   0.23,
   0.23,
   1.79
  ],
  "obisDepthQ": [
   16,
   16,
   16,
   16,
   16
  ],
  "obisDepthN": 1,
  "ncShare": 0.82,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 18% moved from land to the nearest sea cell"
 },
 "bogue": {
  "n": 8,
  "depthQ": [
   2,
   2,
   4,
   4,
   6
  ],
  "habitat": {
   "seagrass": 0.63,
   "unknown": 0.25,
   "rock": 0.13
  },
  "shoreKmQ": [
   0.23,
   0.28,
   0.36
  ],
  "obisDepthQ": [
   6.8,
   6.8,
   6.8,
   6.8,
   6.8
  ],
  "obisDepthN": 1,
  "ncShare": 0.75,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 38% moved from land to the nearest sea cell"
 },
 "porgy": {
  "n": 4,
  "depthQ": [
   4,
   6,
   11,
   11,
   40
  ],
  "habitat": {
   "seagrass": 0.25,
   "unknown": 0.5,
   "mud": 0.25
  },
  "shoreKmQ": [
   0.23,
   0.28,
   2.05
  ],
  "obisDepthQ": [
   5,
   5,
   6.2,
   6.2,
   21
  ],
  "obisDepthN": 4,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 25% moved from land to the nearest sea cell"
 },
 "pandora": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "blackbream": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "redmullet": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "surmullet": {
  "n": 8,
  "depthQ": [
   3,
   3,
   4,
   6,
   7
  ],
  "habitat": {
   "seagrass": 0.38,
   "unknown": 0.38,
   "sand": 0.25
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.36
  ],
  "obisDepthQ": [
   5.1,
   5.1,
   5.1,
   5.1,
   5.1
  ],
  "obisDepthN": 1,
  "ncShare": 0.63,
  "bias": "75% divers/citizen science, 25% surveys/collections/literature; 38% moved from land to the nearest sea cell"
 },
 "greymullet": {
  "n": 5,
  "depthQ": [
   1,
   1,
   4,
   8,
   8
  ],
  "habitat": {
   "unknown": 0.6,
   "seagrass": 0.4
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.36
  ],
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": 0.8,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 20% moved from land to the nearest sea cell"
 },
 "meagre": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "seabass": {
  "n": 1,
  "depthQ": [
   6,
   6,
   6,
   6,
   6
  ],
  "habitat": {
   "seagrass": 1
  },
  "shoreKmQ": [
   0.63,
   0.63,
   0.63
  ],
  "obisDepthQ": [
   6.8,
   6.8,
   6.8,
   6.8,
   6.8
  ],
  "obisDepthN": 1,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 0% moved from land to the nearest sea cell"
 },
 "goatfish": {
  "n": 118,
  "depthQ": [
   1,
   3,
   5,
   8,
   17
  ],
  "habitat": {
   "unknown": 0.28,
   "sand": 0.14,
   "seagrass": 0.41,
   "mud": 0.07,
   "rock": 0.11
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.63
  ],
  "obisDepthQ": [
   3,
   5,
   15,
   25,
   30
  ],
  "obisDepthN": 29,
  "ncShare": 0.9,
  "bias": "71% divers/citizen science, 29% surveys/collections/literature; 41% moved from land to the nearest sea cell"
 },
 "littletunny": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "bonito": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "bluefish": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "horsemackerel": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "mackerel": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "garfish": {
  "n": 1,
  "depthQ": [
   3,
   3,
   3,
   3,
   3
  ],
  "habitat": {
   "seagrass": 1
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.23
  ],
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 0% moved from land to the nearest sea cell"
 },
 "pompano": {
  "n": 15,
  "depthQ": [
   2,
   3,
   4,
   7,
   12
  ],
  "habitat": {
   "unknown": 0.27,
   "seagrass": 0.33,
   "sand": 0.27,
   "mud": 0.07,
   "rock": 0.07
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.68
  ],
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": 0.87,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 40% moved from land to the nearest sea cell"
 },
 "swordfish": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "cornetfish": {
  "n": 168,
  "depthQ": [
   1,
   3,
   6,
   15,
   15
  ],
  "habitat": {
   "seagrass": 0.57,
   "mud": 0.05,
   "unknown": 0.23,
   "rock": 0.06,
   "sand": 0.09
  },
  "shoreKmQ": [
   0.23,
   0.28,
   1.27
  ],
  "obisDepthQ": [
   4,
   10,
   24,
   33.5,
   33.5
  ],
  "obisDepthN": 77,
  "ncShare": 0.89,
  "bias": "52% divers/citizen science, 48% surveys/collections/literature; 30% moved from land to the nearest sea cell"
 },
 "shortfinsquid": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "whitegrouper": {
  "n": 4,
  "depthQ": [
   4,
   40,
   40,
   40,
   40
  ],
  "habitat": {
   "unknown": 0.25,
   "mud": 0.75
  },
  "shoreKmQ": [
   0.23,
   2.05,
   2.05
  ],
  "obisDepthQ": [
   3.7,
   10.1,
   11,
   11,
   21
  ],
  "obisDepthN": 4,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 0% moved from land to the nearest sea cell"
 },
 "goldblotch": {
  "n": 11,
  "depthQ": [
   1,
   4,
   6,
   10,
   12
  ],
  "habitat": {
   "seagrass": 0.73,
   "rock": 0.27
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.55
  ],
  "obisDepthQ": [
   6.8,
   6.8,
   6.8,
   6.8,
   6.8
  ],
  "obisDepthN": 1,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 36% moved from land to the nearest sea cell"
 },
 "mottledgrouper": {
  "n": 22,
  "depthQ": [
   2,
   2,
   3,
   5,
   7
  ],
  "habitat": {
   "seagrass": 0.68,
   "mud": 0.05,
   "unknown": 0.05,
   "rock": 0.14,
   "sand": 0.09
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.68
  ],
  "obisDepthQ": [
   16,
   16,
   16,
   16,
   16
  ],
  "obisDepthN": 1,
  "ncShare": 0.95,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 32% moved from land to the nearest sea cell"
 },
 "comber": {
  "n": 10,
  "depthQ": [
   1,
   4,
   6,
   11,
   17
  ],
  "habitat": {
   "seagrass": 0.4,
   "sand": 0.1,
   "mud": 0.2,
   "unknown": 0.3
  },
  "shoreKmQ": [
   0.23,
   0.23,
   1.82
  ],
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": 0.7,
  "bias": "70% divers/citizen science, 30% surveys/collections/literature; 40% moved from land to the nearest sea cell"
 },
 "paintedcomber": {
  "n": 29,
  "depthQ": [
   2,
   3,
   5,
   8,
   30
  ],
  "habitat": {
   "seagrass": 0.66,
   "rock": 0.1,
   "mud": 0.07,
   "unknown": 0.14,
   "sand": 0.03
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.68
  ],
  "obisDepthQ": [
   4.9,
   4.9,
   6.8,
   14.6,
   15.9
  ],
  "obisDepthN": 8,
  "ncShare": 0.86,
  "bias": "86% divers/citizen science, 14% surveys/collections/literature; 38% moved from land to the nearest sea cell"
 },
 "scorpionfish": {
  "n": 1,
  "depthQ": [
   7,
   7,
   7,
   7,
   7
  ],
  "habitat": {
   "seagrass": 1
  },
  "shoreKmQ": [
   1.27,
   1.27,
   1.27
  ],
  "obisDepthQ": [
   5.1,
   5.1,
   5.1,
   5.1,
   5.1
  ],
  "obisDepthN": 1,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 0% moved from land to the nearest sea cell"
 },
 "blackscorpion": {
  "n": 2,
  "depthQ": [
   6,
   6,
   40,
   40,
   40
  ],
  "habitat": {
   "mud": 0.5,
   "unknown": 0.5
  },
  "shoreKmQ": [
   0.36,
   2.05,
   2.05
  ],
  "obisDepthQ": [
   15.3,
   15.3,
   15.3,
   15.3,
   15.3
  ],
  "obisDepthN": 1,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 0% moved from land to the nearest sea cell"
 },
 "moray": {
  "n": 22,
  "depthQ": [
   1,
   3,
   4,
   5,
   10
  ],
  "habitat": {
   "mud": 0.05,
   "unknown": 0.5,
   "seagrass": 0.36,
   "rock": 0.05,
   "sand": 0.05
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.55
  ],
  "obisDepthQ": [
   14.4,
   14.4,
   14.4,
   14.4,
   14.4
  ],
  "obisDepthN": 1,
  "ncShare": 0.95,
  "bias": "95% divers/citizen science, 5% surveys/collections/literature; 36% moved from land to the nearest sea cell"
 },
 "conger": {
  "n": 0,
  "depthQ": null,
  "habitat": {},
  "shoreKmQ": null,
  "obisDepthQ": null,
  "obisDepthN": 0,
  "ncShare": null,
  "bias": "no usable records"
 },
 "rainbowwrasse": {
  "n": 33,
  "depthQ": [
   1,
   3,
   4,
   8,
   14
  ],
  "habitat": {
   "seagrass": 0.64,
   "rock": 0.09,
   "mud": 0.15,
   "unknown": 0.09,
   "sand": 0.03
  },
  "shoreKmQ": [
   0.23,
   0.23,
   1.37
  ],
  "obisDepthQ": [
   2,
   3.9,
   5.2,
   6.8,
   7
  ],
  "obisDepthN": 10,
  "ncShare": 0.79,
  "bias": "85% divers/citizen science, 15% surveys/collections/literature; 21% moved from land to the nearest sea cell"
 },
 "ornatewrasse": {
  "n": 122,
  "depthQ": [
   1,
   3,
   4,
   8,
   12
  ],
  "habitat": {
   "seagrass": 0.43,
   "mud": 0.1,
   "rock": 0.16,
   "unknown": 0.25,
   "sand": 0.07
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.68
  ],
  "obisDepthQ": [
   2,
   5,
   6,
   14.4,
   15.5
  ],
  "obisDepthN": 25,
  "ncShare": 0.84,
  "bias": "95% divers/citizen science, 5% surveys/collections/literature; 40% moved from land to the nearest sea cell"
 },
 "squirrelfish": {
  "n": 75,
  "depthQ": [
   1,
   3,
   5,
   10,
   19
  ],
  "habitat": {
   "seagrass": 0.43,
   "rock": 0.12,
   "unknown": 0.25,
   "mud": 0.07,
   "sand": 0.13
  },
  "shoreKmQ": [
   0.23,
   0.23,
   1.37
  ],
  "obisDepthQ": [
   2,
   4,
   6.8,
   15,
   43.5
  ],
  "obisDepthN": 42,
  "ncShare": 0.88,
  "bias": "41% divers/citizen science, 59% surveys/collections/literature; 32% moved from land to the nearest sea cell"
 },
 "leatherjacket": {
  "n": 9,
  "depthQ": [
   1,
   1,
   4,
   6,
   7
  ],
  "habitat": {
   "seagrass": 0.33,
   "unknown": 0.56,
   "sand": 0.11
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.55
  ],
  "obisDepthQ": [
   3,
   6,
   7.5,
   20.5,
   22
  ],
  "obisDepthN": 8,
  "ncShare": 1,
  "bias": "0% divers/citizen science, 100% surveys/collections/literature; 56% moved from land to the nearest sea cell"
 },
 "toadfish": {
  "n": 71,
  "depthQ": [
   3,
   11,
   11,
   18,
   22
  ],
  "habitat": {
   "seagrass": 0.87,
   "rock": 0.03,
   "unknown": 0.06,
   "sand": 0.04
  },
  "shoreKmQ": [
   0.23,
   0.23,
   0.59
  ],
  "obisDepthQ": [
   10,
   11.5,
   15,
   20,
   20.5
  ],
  "obisDepthN": 59,
  "ncShare": 0.96,
  "bias": "15% divers/citizen science, 85% surveys/collections/literature; 7% moved from land to the nearest sea cell"
 },
 "weever": {
  "n": 2,
  "depthQ": [
   1,
   1,
   7,
   7,
   7
  ],
  "habitat": {
   "rock": 0.5,
   "seagrass": 0.5
  },
  "shoreKmQ": [
   0.23,
   1.27,
   1.27
  ],
  "obisDepthQ": [
   5.1,
   5.1,
   5.5,
   5.5,
   5.5
  ],
  "obisDepthN": 2,
  "ncShare": 1,
  "bias": "100% divers/citizen science, 0% surveys/collections/literature; 50% moved from land to the nearest sea cell"
 }
};
