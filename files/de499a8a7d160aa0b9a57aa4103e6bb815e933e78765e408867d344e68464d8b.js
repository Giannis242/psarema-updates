'use strict';
/* Psarema area in 3D, the sea (round 12): js/area3d.js loads this file with three.js and makes its "Realistic" water here.
   The sea of the forecast at the area and the hour (js/sources.js F, at the block's centre): the wind sea and the swell as two wave systems,
   each a JONSWAP spectrum (peak enhancement 3.3 and 6) with cos^2n directional spreading, sampled into Gerstner (trochoidal) waves at true
   scale with deep-water dispersion (ω² = gk: a 6 s swell is 56 m long and runs at 9.4 m/s). The wind sea's height is what the total leaves
   the swell (their energies add); its direction the wind's. Without the split (an older forecast cache) its peak period comes from the
   JONSWAP growth laws for the wind and its height.
   The surface: a projected grid (a mesh over the screen laid onto the sea each frame: detailed close up, light far away). Waves too short
   for the grid or for a pixel fade out; the rest of the wind's roughness (Cox & Munk 1954: slope variance 0.003 + 0.00512 U) goes to two
   scrolling normal maps made here (a tile of short waves in whole cycles, so it repeats unseen), and what no pixel resolves widens the
   sun's or moon's glitter. The depth-coloured water, fresnel sky and the imagery under the shallows are js/area3d.js's as before.
   Near the coast (the depth the scene has: js/area3d-surface.js aux): the waves shorten and grow (linear shoaling), are held to Hs ≤ 0.55 d
   and break; in shallow water their crests slow down and turn to the shore (the time waves take to reach it, solved over the seabed:
   refraction), with a surf band and foam at the waterline; waves running off the shore bring none. Behind land, breakwaters and quays (the pack's buildings, kinds 8 and 9) the sea is calmer: the swell by the shadow, the wind
   sea by its fetch (JONSWAP growth: Hs ∝ √fetch). Whitecaps: Monahan & O'Muircheartaigh 1980 (cover 3.84e-6 U^3.41, U in m/s at 10 m) on
   the wind sea's crests; foam streaks along the wind from Beaufort 7; gusts as rougher patches (cat's paws) that run with the wind.
   Phase 2: the water shows the imagery only through its first metres (deeper, Esri's photos meet in seams the water would show);
   at night a night sky's glow, the moon's path and the town's lights drawn out on the water; the panel's hour row (‹ time ›, js/area3d.js).
   Phase 3: quality levels (setQuality, from js/area3d-sky.js: the device's tier, then lower while frames run slow): 1 without the shore's
   waves, 2 without the extras and with half the waves on a coarser grid (a lighter pixel shader), 3 a flat quad of four waves' light (about
   the old water's work); at night the lamps near the water (as js/area3d.js places them) as columns of light on it.
   A new hour: the old sea fades into the new over 2.5 s. prefers-reduced-motion: a still sea (and no frames for it). Phones: 14 waves (low-end 11) on a
   96 × 160 grid; computers: 32 on 224 × 224 (fewer where the GPU allows fewer uniforms).
   Round 13, the open sea (why it looked flat: from above a deep sea's colour is its body's, which ignored the waves, and the waves'
   reflections change by a few per cent; the few phone waves spread to 4× the peak lined up in a lattice, and waves down to 2 pixels
   long aliased into stripes): the waves now shade the water's own light (a hill shade of their true slopes, ×4, and lighter crests by
   their true height; the panel says the shading is boosted), the wind sea's few waves sit about its peak with their directions in strata
   of the spreading, a wave fades out from ~4 pixels long (the glitter takes it over), the first ripple tile starts where the waves stop.
   No forecast at the point and hour: a flat sea, and the panel says so.
   Round 13, phase 2, the wind on the open sea (its true speed and gusts; the aids stronger than in life, the panel says so): wind-roughened
   water reflects an average of the sky instead of its mirror image (calm glassy; rough and gusts darker seen low across the sea, lighter
   from above), gust patches a km or two long running with js/area3d-sky.js's streaks (seen from the overview); whitecaps on the crests
   up close and, where the crests are too fine to see, their cover as specks (none to Beaufort 3, scattered at 4, many at 5); old foam's
   lace from 5; from afar faint windrows along the wind from Beaufort 3 and foam streaks from 7; the body darker in a gale. The drifts
   are summed, so a new hour's wind changes their speed, not where they are.
   Round 13, phase 3: from a camera under ~1.2 km the sea goes on past the block's edges to the horizon (past a water edge only; it fades
   out by 3.5 km up, where the block stands alone); the panel's "Sea level" button flies the camera ~25 m over 30 m of water or more
   near the point looked at, the way it looked (again: back up); the specks and lines never under ~1.5 pixels (no shimmer), the lines
   none seen low across the sea.
   API: PsArea3DSea.create(THREE, o) → { mesh, moving, info, setHour(h), setSurface(R), dispose() }; o: { U (the view's shared uniforms),
   span, a (the area), h, cz (a phone), tier (js/area3d.js's device tier), LIGHT (the shaders' light chunk), renderer, host, wake, fly(r, phi, theta, target, ms) and controls()
   (js/area3d.js's camera flight and its OrbitControls, for the sea-level view) }. */
(function () {
  const G = 9.81, TAU = Math.PI * 2, REDUCED = matchMedia('(prefers-reduced-motion: reduce)'), MARGIN = .12, FADE = 2500;
  const lim = (x, a, b) => x < a ? a : x > b ? b : x;
  const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; // mulberry32
  const canvas = n => Object.assign(document.createElement('canvas'), { width: n, height: n });

  /* ---------- The forecast at a point and hour: m, s, degrees (from), km/h ---------- */
  function forecastAt(a, h) {
    if (typeof F === 'undefined' || !F || !(h >= 0)) return null; // F, C, NN: js/sources.js and js/core.js (globals)
    const gx = lim((a.lon - C.lon0) / C.step, 0, C.nx - 1.0001), gy = lim((a.lat - C.lat0) / C.step, 0, C.ny - 1.0001), c = gx | 0, r = gy | 0, tx = gx - c, ty = gy - r, b = h * NN + r * C.nx + c;
    const P = [[b, (1 - tx) * (1 - ty)], [b + 1, tx * (1 - ty)], [b + C.nx, (1 - tx) * ty], [b + C.nx + 1, tx * ty]];
    const bil = A => A ? P.reduce((s, [k, w]) => s + A[k] * w, 0) : 0;
    const dir = A => { let x = 0, y = 0; for (const [k, w] of P) { x += Math.sin(A[k] * Math.PI / 180) * w; y += Math.cos(A[k] * Math.PI / 180) * w; } return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360; }; // as vectors: 350° and 10° make 0°
    return { wave: bil(F.wave), period: bil(F.period), waveDir: dir(F.waveDir), swell: bil(F.swell), swellPer: bil(F.swellPer), swellDir: F.swellDir ? dir(F.swellDir) : 0,
      windPer: bil(F.windPer), wind: bil(F.wind), windDir: dir(F.windDir), gust: bil(F.gust), cloud: bil(F.cloud) };
  }
  // no forecast here (none loaded, or none at this point and hour): a flat sea, and the panel says so (round 13: not a made-up calm)
  const FLAT = { wave: 0, period: 0, waveDir: 270, swell: 0, swellPer: 0, swellDir: 0, windPer: 0, wind: 0, windDir: 270, gust: 0 };
  const known = f => f && f.wave >= 0 && f.wind >= 0 ? f : null; // NaN: none

  /* ---------- A sea state → Gerstner waves ---------- */
  // JONSWAP's spectrum shape at peak wp (not normalised)
  const jonswap = (w, wp, gam) => { const s = w <= wp ? .07 : .09; return w ** -5 * Math.exp(-1.25 * (wp / w) ** 4) * gam ** Math.exp(-((w - wp) ** 2) / (2 * s * s * wp * wp)); };
  // n waves of one system (hs m, tp s, toward bearing rad): frequency bands log-spaced over [w0, w1]·wp, each band's share of Hs²/16 (all of
  // it in these bands: the forecast's height exactly), a direction drawn from cos^2s about the mean, a random phase: [kx, kz, a, ω, φ]
  // (scene axes: x east, z south)
  // round 13: the directions in strata of the spreading (its quantiles in van der Corput order: the mean, then either side, then between),
  // so the few bands near the peak cross at ±15–30° as a real sea's do (random draws could line them all up: long, parallel "corduroy" crests)
  const vdc = i => { let q = 0, b = .5; for (; i; i >>= 1, b /= 2) if (i & 1) q += b; return q; };
  function spreadAt(q, s) { // the angle off the mean (rad) at quantile q of cos^2s
    const N = 64, C = []; let acc = 0; for (let j = 0; j < N; j++) C.push(acc += Math.cos(((j + .5) / N - .5) * Math.PI) ** (2 * s));
    const j = C.findIndex(v => v >= q * acc); return ((j + .5) / N - .5) * Math.PI;
  }
  function system(out, n, hs, tp, toward, gam, s, w0, w1, seed, swell) {
    const wp = TAU / tp, r = rng(seed), S = w => jonswap(w, wp, gam), band = i => wp * w0 * (w1 / w0) ** (i / n), E = [];
    for (let i = 0; i < n; i++) { const a0 = band(i), a1 = band(i + 1); let e = 0; for (let j = 0; j < 8; j++) e += S(a0 + (a1 - a0) * (j + .5) / 8) * (a1 - a0) / 8; E.push(e); }
    const tot = E.reduce((x, y) => x + y);
    for (let i = 0; i < n; i++) {
      const a0 = band(i), a1 = band(i + 1), e = E[i];
      const w = a0 + (a1 - a0) * (.25 + .5 * r()), k = w * w / G, amp = Math.sqrt(2 * e / tot * hs * hs / 16);
      const d = spreadAt(lim(vdc(i + 1) + (r() - .5) / n, .01, .99), s); // spreading
      const th = toward + d;
      out.push([k * Math.sin(th), -k * Math.cos(th), swell ? -amp : amp, w, r() * TAU]);
    }
  }
  // JONSWAP's fetch-limited growth with the fetch eliminated (gHs/U² = 0.0016 √X, gTp/U = 0.286 X^(1/3), fully grown at 0.243 and 8.13):
  // the wind sea's peak period from its height and the wind
  const growTp = (U, hs) => { const u = Math.max(U, .5), H = G * hs / (u * u); return Math.max(3.6 * Math.sqrt(hs), Math.min(8.13, .286 * (Math.min(H, .243) / .0016) ** (2 / 3)) * u / G); };
  const w1Of = kw => lim(.75 * 1.11 ** kw, 1.6, 4); // the wind sea's highest band (× its peak frequency) for kw waves
  // the whitecaps' cover at wind U m/s (Monahan & O'Muircheartaigh 1980) and the normal quantile above which that share of the crests lies (Abramowitz & Stegun 26.2.23)
  const cover = U => { const W = lim(3.84e-6 * U ** 3.41, 1e-6, .3), t = Math.sqrt(-2 * Math.log(W)); return [W, t - (2.515517 + .802853 * t + .010328 * t * t) / (1 + 1.432788 * t + .189269 * t * t + .001308 * t * t * t)]; };
  function seaOf(f, t, g) { // → { c: the waves, p: what the shaders lerp, dirs } for the forecast f; t: the tier; g: a new draw each change (the fade adds energies)
    const U = f.wind / 3.6, Ug = Math.max(f.gust, f.wind) / 3.6, swH = Math.min(f.swell, f.wave), wsH = Math.sqrt(Math.max(0, f.wave ** 2 - swH ** 2));
    const split = f.swellPer > .5, swT = split ? Math.max(f.swellPer, 3) : Math.max(5, f.period * 1.25), wsT = split && f.windPer > .5 ? Math.max(f.windPer, 1) : growTp(U, Math.max(wsH, .02));
    const rad = d => d * Math.PI / 180, swTo = rad((split ? f.swellDir : f.waveDir) + 180), wsTo = rad((U > 1.5 ? f.windDir : f.waveDir) + 180), windTo = rad(f.windDir + 180);
    const c = [];
    system(c, t.kw, Math.max(wsH, .01), wsT, wsTo, 3.3, 2, .75, w1Of(t.kw), 101 + 7 * g, false); // round 13: few waves (phones) packed about the peak, ~11% apart, as many: the eye sees the peak's waves (the shorter ones go to the ripples and the glitter); with few spread to 4× the peak, its 2–3 lined up in a lattice
    system(c, t.ks, Math.max(swH, .01), swT, swTo, 6, 12, .85, 1.6, 202 + 7 * g, true);
    let ka = 0, mss = 0; for (const [kx, kz, a] of c) { const k = Math.hypot(kx, kz); if (a > 0) ka += k * a; mss += (k * a) ** 2 / 2; }
    const kpW = (TAU / wsT) ** 2 / G, kpS = (TAU / swT) ** 2 / G;
    const ws = swH * swH * swT > wsH * wsH * wsT ? TAU / swT : TAU / wsT; // the shore's waves: the system that brings the most energy (∝ H²T)
    return { c, f, dirs: [[Math.sin(swTo), -Math.cos(swTo)], [Math.sin(wsTo), -Math.cos(wsTo)]],
      p: [wsH, swH, kpW, kpS, U, Ug, Math.sin(windTo), -Math.cos(windTo), Math.min(1, .7 / Math.max(ka, 1e-3)), mss, ws] };
  }

  /* ---------- The normal maps' tile: RG ripples' slopes (±1), B a fine noise, A a coarse noise (mean .5, sd ~.17) ---------- */
  let NMD = null; // made once a session
  function nmData(n) {
    const r = rng(11), d = new Uint8Array(n * n * 4), F4 = [new Float32Array(n * n), new Float32Array(n * n), new Float32Array(n * n), new Float32Array(n * n)];
    const add = (cnt, k0, k1, ripple, ch) => {
      for (let i = 0; i < cnt; i++) {
        let m, q, k;
        do { m = Math.round((r() * 2 - 1) * k1); q = Math.round((r() * 2 - 1) * k1); k = Math.hypot(m, q); } while (k < k0 || k > k1 || (ripple && (m <= 0 || r() > (m / k) ** 2))); // ripples: downwind (+x), cos² spread
        const ph = r() * TAU, kx = TAU * m / n, kz = TAU * q / n, amp = ripple ? k ** -1.5 : 1;
        for (let y = 0, j = 0; y < n; y++) for (let x = 0; x < n; x++, j++) {
          const th = kx * x + kz * y + ph;
          if (ripple) { const s = Math.sin(th) * amp * k; F4[0][j] -= s * m / k; F4[1][j] -= s * q / k; } else F4[ch][j] += Math.cos(th);
        }
      }
    };
    add(40, 3, 22, true); add(24, 6, 18, false, 2); add(24, 1.5, 5, false, 3);
    let sm = 0, v = 0; for (let j = 0; j < n * n; j++) sm = Math.max(sm, Math.abs(F4[0][j]), Math.abs(F4[1][j]));
    for (let j = 0; j < n * n; j++) {
      const a = F4[0][j] / sm, b = F4[1][j] / sm; v += a * a + b * b;
      d[j * 4] = 127.5 + 127.5 * a; d[j * 4 + 1] = 127.5 + 127.5 * b;
      d[j * 4 + 2] = lim(127.5 + 255 * .17 * F4[2][j] / Math.sqrt(12), 0, 255); d[j * 4 + 3] = lim(127.5 + 255 * .17 * F4[3][j] / Math.sqrt(12), 0, 255); // 24 unit cosines: sd √12
    }
    return { n, d, v: v / (n * n) };
  }

  /* ---------- The coast: land, breakwaters and quays on every other grid point; when waves reach it; the open water upwave ---------- */
  function coast(R, span) { // → { m, land, dep (m) }
    const n = R.n, m = (n - 1) / 2 + 1, land = new Uint8Array(m * m), dep = new Float32Array(m * m), b = R.b;
    for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) { const v = R.aux[(2 * r * n + 2 * c) * 4 + 2], q = r * m + c; land[q] = v === 0 ? 1 : 0; dep[q] = ((Math.max(v, 1) - 1) / 254) ** 2 * 400; } // js/area3d-surface.js's depth code
    if (b?.k.length) { // breakwaters and quays: harbour walls the waves break on and stop at
      const cv = canvas(m), g = cv.getContext('2d', { willReadFrequently: true }), k = (m - 1) / span, p = new Path2D();
      g.setTransform(k, 0, 0, k, (m - 1) / 2 + .5, (m - 1) / 2 + .5); g.lineWidth = 1.2 / k; g.fillStyle = g.strokeStyle = '#fff';
      for (let i = 0; i < b.k.length; i++) { const kd = b.k[i] & 15; if (kd !== 8 && kd !== 9) continue; for (let j = b.s[i]; j < b.s[i + 1]; j++) p[j === b.s[i] ? 'moveTo' : 'lineTo'](b.v[2 * j], b.v[2 * j + 1]); p.closePath(); }
      g.fill(p); g.stroke(p);
      const px = g.getImageData(0, 0, m, m).data; cv.width = 0;
      for (let q = 0; q < m * m; q++) if (px[q * 4 + 3] > 60) land[q] = 1;
    }
    return { m, land, dep };
  }
  // when waves of frequency w reach the shore from each point (s, in 5 ms steps, high byte first): the eikonal |∇T| = 1 / c(depth), solved
  // by fast sweeping (Zhao 2005) from the land, so its level sets, the crests, slow down and turn over the seabed as real ones do (refraction);
  // a sweep a task (a few ms each), so the view keeps drawing. → done(Uint8Array (m × m × 2)); returns a stop
  function arrivalJob(L, w, span, done) {
    const { m, land, dep } = L, h = span / (m - 1), N = m * m, T = new Float32Array(N).fill(1e9), sl = new Float32Array(N), k0 = w * w / G;
    for (let q = 0; q < N; q++) if (land[q]) T[q] = 0; else sl[q] = h * k0 / Math.sqrt(Math.tanh(k0 * Math.max(dep[q], .5))) / w; // a cell over the phase speed (Eckart's k)
    let it = 0, timer = 0;
    const sweep = () => {
      const [dx, dy] = [[1, 1], [-1, 1], [1, -1], [-1, -1]][it % 4];
      for (let y = dy > 0 ? 0 : m - 1; y >= 0 && y < m; y += dy) for (let x = dx > 0 ? 0 : m - 1; x >= 0 && x < m; x += dx) {
        const q = y * m + x; if (land[q]) continue;
        const a = Math.min(x > 0 ? T[q - 1] : 1e9, x < m - 1 ? T[q + 1] : 1e9), b = Math.min(y > 0 ? T[q - m] : 1e9, y < m - 1 ? T[q + m] : 1e9), f = sl[q];
        const t = Math.abs(a - b) >= f ? Math.min(a, b) + f : (a + b + Math.sqrt(2 * f * f - (a - b) ** 2)) / 2;
        if (t < T[q]) T[q] = t;
      }
      if (++it < 8) { timer = setTimeout(sweep); return; } // the four directions twice
      const out = new Uint8Array(N * 2); for (let q = 0; q < N; q++) { const v = Math.min(65535, Math.round(T[q] / .005)); out[q * 2] = v >> 8; out[q * 2 + 1] = v & 255; }
      done(out);
    };
    timer = setTimeout(sweep);
    return () => clearTimeout(timer);
  }
  // how open every other point of the coast's grid is to the swell and to the wind sea (0..255): the open water upwave of it along 5 rays over
  // each system's spread (10.2 km or the block's edge: open), as the swell's share past the land's shadow (it bends in over ~1.5 km) and
  // the wind sea's √(fetch / 10.2 km) (JONSWAP growth); a few rows at a time, so the view keeps drawing. → Uint8Array (q × q × 2) to done()
  const FAN = [[[-.3, .5], [-.15, .85], [0, 1], [.15, .85], [.3, .5]], [[-.7, .34], [-.35, .78], [0, 1], [.35, .78], [.7, .34]]]; // [angle, weight]: the swell's cos^24, the wind sea's cos^4
  function fetchJob(L, dirs, span, done) {
    const { m, land } = L, q = (m - 1) / 2 + 1, cell = span / (m - 1), max = Math.ceil(10200 / cell), out = new Uint8Array(q * q * 2), rays = [];
    dirs.forEach(([x, z], s) => { for (const [da, wt] of FAN[s]) rays.push([-(x * Math.cos(da) - z * Math.sin(da)), -(x * Math.sin(da) + z * Math.cos(da)), wt / 3.48]); }); // upwave; weights sum to 1
    let r = 0, timer = 0, stop = false;
    const step = () => {
      const t0 = performance.now();
      for (; r < q && performance.now() - t0 < 8; r++) for (let c = 0; c < q; c++) for (let s = 0; s < 2; s++) {
        let sum = 0;
        for (let j = s * 5; j < s * 5 + 5; j++) {
          const [ux, uz, wt] = rays[j]; let d = 1, hit = max;
          for (; d < max; d += 1 + (d >> 4)) { const x = Math.round(2 * c + ux * d), z = Math.round(2 * r + uz * d); if (x < 0 || z < 0 || x >= m || z >= m) break; if (land[z * m + x]) { hit = d; break; } }
          const F = Math.min(hit * cell, 10200), e = Math.min(1, F / 1500); sum += wt * (s ? Math.sqrt(F / 10200) : e * e * (3 - 2 * e));
        }
        out[(r * q + c) * 2 + s] = Math.round(Math.min(1, sum) * 255);
      }
      if (stop) return;
      if (r < q) timer = setTimeout(step); else done(out, q);
    };
    timer = setTimeout(step);
    return () => { stop = true; clearTimeout(timer); };
  }

  /* ---------- Shaders ---------- */
  const COMMON = `uniform sampler2D aux, uDist, uFetch; uniform vec2 auxK; uniform float span, uDq;
uniform vec4 uC[K2], uSea, uShore, uFetchK, uGrid, uTexK, uSys, uQ; uniform int uN; // uQ: the quality's switches (x: the shore's waves, y: the extras)
// uC: the waves (kx, kz, amplitude: < 0 the swell, phase now); uSea: the wind sea's and swell's Hs (m) and peak wavenumbers; uShore: the
// shore's waves (ω, phase now, deep k, steepness); uFetchK: –, √(10.2 km / the fetch the wind sea needs),
// the old fetch → the new, the block's half; uGrid: the grid's angle per cell, the far limit, choppiness; uTexK: texel centres of the fetch;
// uSys: where the swell and the wind sea run (x, z)
float tanhF(float x) { float e = exp(-2.0 * abs(x)); return sign(x) * (1.0 - e) / (1.0 + e); }
float depthAt(vec2 uv) { float b = texture2D(aux, uv * auxK.x + auxK.y).b; return b < 0.6 / 255.0 ? -1.0 : pow(max(b * 255.0 - 1.0, 0.0) / 254.0, 2.0) * 400.0; }
float shoalK(float kd) { kd = max(kd, 0.02); float e = exp(-2.0 * kd); return inversesqrt(tanhF(kd) * (1.0 + 4.0 * kd * e / (1.0 - e * e))); } // linear theory: sqrt(cg0 / cg)
vec2 shelter(vec2 uv) { // (swell, wind sea) here: the swell past the land's shadow, the wind sea by its fetch (fetchJob)
  vec4 f = texture2D(uFetch, uv * uTexK.z + uTexK.w); vec2 m = mix(f.rg, f.ba, uFetchK.z);
  return vec2(mix(0.08, 1.0, m.x), clamp(m.y * uFetchK.y, 0.08, 1.0));
}
vec4 local(float dep, vec2 sh, vec2 face) { // the deep waves' factors (wind sea, swell), the shore's waves' amplitude (m), Hs / depth (breaking past ~0.45)
  vec2 kp = uSea.zw, k = kp * inversesqrt(max(vec2(tanhF(kp.x * dep), tanhF(kp.y * dep)), 1e-3)), kd = k * dep; // Eckart 1952: k in shallow water
  vec2 Ks = vec2(shoalK(kd.x), shoalK(kd.y)), h = uSea.xy * sh.yx * Ks;
  float H = length(h), cap = min(1.0, 0.55 * dep / max(H, 1e-3)); vec2 dw = smoothstep(0.3, 1.0, kd);
  return vec4(sh.y * Ks.x * cap * sqrt(dw.x), sh.x * Ks.y * cap * sqrt(dw.y), 0.5 * cap * length(h * sqrt((1.0 - dw) * face)), H / max(dep, 0.05)); // face: (wind sea, swell) running shoreward
}
float dAt(vec2 c) { vec4 t = texture2D(uDist, c); return (t.r * 65280.0 + t.a * 255.0) * 0.005; }
vec2 faceOf(vec2 g) { float l = length(g); g /= l + 1e-9; return smoothstep(-0.3, 0.4, -vec2(dot(uSys.zw, g), dot(uSys.xy, g))) * step(1e-4, l); } // waves running off the shore bring no surf (nor any before the times are in)
vec3 distAt(vec2 uv) { // when the shore's waves reach the shore (s) and its gradient (offshore), filtered here: the GPU's filter would mix the two bytes
  vec2 q = uv * (uDq - 1.0), i = floor(q), f = q - i, s = vec2(1.0 / uDq, 0.0), c = (i + 0.5) / uDq;
  float a = dAt(c), b = dAt(c + s.xy), d = dAt(c + s.yx), e = dAt(c + s.xx), cell = span / (uDq - 1.0);
  return vec3(mix(mix(a, b, f.x), mix(d, e, f.x), f.y), vec2(mix(b - a, e - d, f.y), mix(d - a, e - b, f.x)) / cell);
}
`;
  const SEA_V = `${COMMON}uniform mat4 uInv; uniform vec4 uFx; varying vec3 vW; varying vec2 vB;
#if LITE == 2
void main() { vB = position.xz; vW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); } // level 3: a flat quad
#else
void main() {
  vec2 ndc = position.xy * (2.0 + 2.0 * MARGIN) - 1.0 - MARGIN; // the screen and a margin, for the waves' sideways movement
  vec4 f = uInv * vec4(ndc, 1.0, 1.0);
  vec3 o = cameraPosition, d = normalize(f.xyz / f.w - o);
  float t = -o.y / (abs(d.y) < 1e-6 ? -1e-6 : d.y), hd = length(d.xz) + 1e-6;
  if (t <= 0.0 || t * hd > uGrid.y) t = uGrid.y / hd; // above the horizon or past the far limit: on the sea at the limit
  vec2 xz = o.xz + d.xz * t; vec3 p = vec3(xz.x, 0.0, xz.y);
#if VTF && LITE < 2 // level 3: no waves in the geometry
  float sc = t * uGrid.x, sv = sc / max(abs(d.y), 0.06), ob = max(abs(xz.x), abs(xz.y)) - uFetchK.w, edge = max(1.0 - smoothstep(-150.0, 0.0, ob), uFx.z); // m per cell across and along the view; still at the block's sides (round 13: unless the sea goes on past them)
  vec2 ev = normalize(d.xz + 1e-6), ec = vec2(-ev.y, ev.x);
  vec2 uv = xz / span + 0.5; float dep = depthAt(uv); if (ob > 0.0 && dep > 0.0) dep = max(dep, 60.0); // past the edge: open water
  if (dep > 0.0 && edge > 0.0 && o.y > 0.0 && sc < 60.0) {
    vec3 ds = dep < 40.0 && uQ.x > 0.5 ? distAt(uv) : vec3(0.0); vec4 lc = local(dep, shelter(uv), faceOf(ds.yz)) * edge;
    for (int i = 0; i < K2; i++) {
      if (i >= uN) break;
      vec4 c = uC[i]; float k = length(c.xy), a = abs(c.z) * (c.z < 0.0 ? lc.y : lc.x) * (1.0 - smoothstep(0.9, 2.2, max(abs(dot(c.xy, ev)) * sv, abs(dot(c.xy, ec)) * sc))), th = dot(c.xy, xz) - c.w; // the phase a cell: ≥ ~4 cells a wave
      p.y += a * cos(th); p.xz -= c.xy / k * (uGrid.w * (c.z < 0.0 ? 0.5 : 1.0) * a * sin(th));
    }
    vec2 kv = uShore.x * ds.yz; float as = lc.z * (1.0 - smoothstep(0.9, 2.2, max(abs(dot(kv, ev)) * sv, abs(dot(kv, ec)) * sc))), th = uShore.x * ds.x + uShore.y; // phase ωT: crests run shoreward
    p.y += as * cos(th); p.xz -= normalize(kv + 1e-6) * (min(as, uShore.w / (length(kv) + 1e-6)) * sin(th)); // steep, short of a loop
  }
#endif
  vB = xz; vW = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
#endif`;
  const SEA_F = LIGHT => `${COMMON}${LIGHT}uniform sampler2D uNMt, map, glow, coast; uniform vec3 skyZ, skyH; uniform vec4 uWind, uNM, uNMo, uDrift, uDirs, uWc, uFx; uniform vec2 windO;
// uWind: the wind toward (x, z), its mean and gust (m/s); uNM: the waves' slope variance, the two tiles (m), the tiles' slope variance a unit;
// uWc: the whitecaps' cover and its normal quantile at the mean wind and in the gusts (round 13: made once a frame, not a pixel); uNMo: the two tiles' offsets; uDrift: the foam's and the gusts' offsets downwind; uDirs: the second tile's direction, the streaks' offset;
// round 13, phase 2: uFx: the foam's drift downwind (m), the time (s); windO: js/area3d-sky.js's streaks' drift (m), its gust patches
varying vec3 vW; varying vec2 vB;
float hash12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); } // Hoskins: no sin, steady on phones
// whitecaps too small for a pixel (their crests unresolved): world-anchored cells about a pixel wide, a share of them holding a soft
// dot for a few seconds (dot ~0.38 of a cell, lit 0.53 of the time: a share 4.2 W gives the mean brightness 0.84 W, the cover as the
// crests' whitecaps give it close up), so the cover shows as specks you can see from far off
float speck1(vec2 p, float c, float W, float t, float fw) {
  vec2 i = floor(p / c); float h = hash12(i + 0.0137 * c), k = t / 3.0 + h, f = fract(k); vec2 o = p / c - i - 0.5 - 0.3 * (fract(h * vec2(37.3, 91.7)) - 0.5); // one hash: its phase and the dot's place
  float rr = max(0.44, 0.7 * fw / c); // round 13: never under ~1.4 pixels across (sharper ones twinkle as the view moves), as bright in all
  return step(hash12(i + floor(k) * 17.13), 4.2 * W) * (1.0 - smoothstep(0.6 * rr, rr, length(o))) * min(1.0, 0.19 / (rr * rr)) * smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.35, 0.8, f));
}
float specks(vec2 p, float fw, float W, float t) { // cells a power of 2 m; the next size up fades in only near the switch, so most pixels do one
  float L = log2(fw), l = floor(L), c = exp2(l), k = smoothstep(0.6, 1.0, L - l), s = speck1(p, c, W, t, fw);
  if (k > 0.0) s = mix(s, speck1(p, 2.0 * c, W, t, fw), k);
  return s;
}
// lines along the wind (a: along, across it, m; wa: m a pixel across it): rows ~2 pixels (2 m at least) across, a share p of them
// holding a line about a pixel wide, long and broken (segments 8 rows long, 7 in 10 there)
float line1(vec2 a, float c, float p, float wa) {
  a.y += 0.4 * c * sin(a.x / (6.0 * c) + a.y / (23.0 * c)); // meandering a little
  float row = floor(a.y / c), hr = hash12(vec2(row, 1.7 + 0.0137 * c)), x = a.x / (8.0 * c) + 9.0 * fract(hr * 37.3), fx = fract(x), fy = fract(a.y / c);
  return step(hr, p) * step(0.3, hash12(vec2(floor(x), row))) * smoothstep(0.0, 0.25, fx) * (1.0 - smoothstep(0.75, 1.0, fx)) * (1.0 - smoothstep(0.4, 1.2, abs(fy - 0.5) * c / wa)); // round 13: ~1.6 pixels wide at every size (thinner ones shimmered)
}
float lines(vec2 a, float wa, float p) { float L = log2(max(2.0 * wa, 2.0)), l = floor(L), c = exp2(l), k = smoothstep(0.6, 1.0, L - l), s = line1(a, c, p, wa); if (k > 0.0) s = mix(s, line1(a, 2.0 * c, p, wa), k); return s; }
#if LITE == 2
void main() { // level 3, weak GPUs: about the old water's work: four waves' and one ripple tile's light, the depth's colour, the sun's glint, foam as cover and at the waterline
  if (abs(vB.x) > uFetchK.w || abs(vB.y) > uFetchK.w) discard;
  vec2 uv = vB / span + 0.5;
  if (texture2D(coast, uv).r < 0.5) discard;
  float dep = max(depthAt(uv), 0.05), fw = max(length(fwidth(vB)), 1e-3);
  vec2 s = vec2(0.0), w = uWind.xy, wp = vec2(-w.y, w.x);
  for (int i = 0; i < 4; i++) { if (i >= uN) break; vec4 c = uC[i]; s -= c.xy * (abs(c.z) * (1.0 - smoothstep(0.75, 2.8, length(c.xy) * fw)) * sin(dot(c.xy, vB) - c.w)); }
  vec2 r1 = texture2D(uNMt, vec2(dot(vB, w), dot(vB, wp)) / uNM.y + uNMo.xy).rg * 2.0 - 1.0;
  s += sqrt(max(0.0, 0.85 * (0.003 + 0.00512 * uWind.z) - uNM.x) / (2.0 * uNM.w)) * (1.0 - smoothstep(uNM.y / 60.0, uNM.y / 12.0, fw)) * (w * r1.x + wp * r1.y);
  vec3 n = normalize(vec3(-s.x, 1.0, -s.y)), V = normalize(cameraPosition - vW), R = reflect(-V, n);
  float f = 1.0 - max(dot(n, V), 0.0), fres = 0.02 + 0.98 * f * f * f * f * f, lk = lightK(), clr = mix(7.0, 2.5, smoothstep(0.4, 1.6, length(uSea.xy)));
  vec3 sky = mix(skyH, skyZ, sqrt(clamp(R.y, 0.0, 1.0))) + vec3(0.05, 0.07, 0.11) * night;
  vec3 body = mix(vec3(0.07, 0.41, 0.44), vec3(0.01, 0.07, 0.15), 1.0 - exp(-dep / (clr * 5.7))) * (amb + sunCol * max(sun.y, 0.0)) * lk;
  float rough = mix(700.0, 40.0, smoothstep(1.0, 30.0, fw)) / (1.0 + 4.0 * uWind.z / 10.0), spec = pow(max(dot(R, sun), 0.0), rough) * rough / 700.0 * 3.0;
  float Hin = length(uSea.xy), foam = uWc.x * 0.8 + (1.0 - smoothstep(0.0, 0.2 + 0.7 * Hin, dep)) * 0.7 * smoothstep(0.05, 0.9, Hin);
  vec3 col = mix(mix(body, sky, fres) * (1.0 - 0.28 * smoothstep(1.0, 17.0, uWind.z)) + sunCol * spec, vec3(0.93, 0.96, 0.98) * (amb + sunCol * 0.8) * lk, foam);
  gl_FragColor = vec4(hazed(col, vW), max(max(clamp(1.0 - exp(-dep / (clr * 0.35)), 0.18, 0.97), fres), foam));
}
#else
void main() {
  float ob = max(abs(vB.x), abs(vB.y)) - uFetchK.w; // round 13: past the block's edge, the open sea to the horizon from a low camera (uFx.z)
  if (ob > 0.0 && uFx.z < 0.01) discard;
  vec2 uv = vB / span + 0.5;
  if (texture2D(coast, uv).r < 0.5) discard; // land: the coastline's distance field (js/area3d-surface.js), smooth at any zoom, not the grid's steps
  float dep = max(depthAt(uv), 0.05); // the depth grid's own coast can lag it by a cell: shallow there
  if (ob > 0.0) dep = mix(max(dep, 60.0), 400.0, smoothstep(0.0, 3000.0, ob)); // past the edge (the textures hold the edge's, past a land edge no sea): deep water
  vec2 dx = dFdx(vB), dy = dFdy(vB); float fw = max(length(fwidth(vB)), 1e-3), far = smoothstep(0.4, 1.4, uSea.z * fw); // m a pixel; far: the wind sea's crests too fine to see (round 13: was 0.6–4 m a pixel, whatever their size)
  vec2 sh = shelter(uv), w = uWind.xy, wp = vec2(-w.y, w.x), al = vec2(dot(vB, w), dot(vB, wp)); vec3 ds = dep < 40.0 && uQ.x > 0.5 ? distAt(uv) : vec3(0.0); vec4 lc = local(dep, sh, faceOf(ds.yz)); // al: along and across the wind; the shore's waves need water shallower than ~40 m
#if LITE
  float gn = 0.5; // weak GPUs: no gusts
#elif PHONE
  float gn = 0.5 + 0.7 * (texture2D(uNMt, al / 330.0 + vec2(uDrift.z, 0.0)).a - 0.5); // one scale on phones
#else
  float gn = 0.5 * (texture2D(uNMt, al / 260.0 + vec2(uDrift.z, 0.0)).a + texture2D(uNMt, al / vec2(430.0, 370.0) + vec2(uDrift.w, 0.31)).a); // two scales that never line up
#endif
#if LITE
  float gk = 0.0;
#else
  float gk = max(smoothstep(0.55, 0.75, gn), smoothstep(0.45, 0.72, texture2D(cloudT, vec2(al.x - dot(windO, w), al.y - dot(windO, wp)) / vec2(3400.0, 1500.0)).r)); // round 13: and gust patches a km or two long, drawn out downwind, running with the sky's streaks: seen from afar
#endif
  float Ul = uWind.z + 0.35 * (uWind.w - uWind.z) * gk; // the wind here: gusts in patches that run downwind
  vec2 s = vec2(0.0); float eta = 0.0, vr = 1e-6, mss = 0.0, ea = 0.0;
  for (int i = 0; i < K2; i++) { // the waves this pixel resolves
    if (i >= uN) break;
    vec4 c = uC[i]; float dp = max(abs(dot(c.xy, dx)), abs(dot(c.xy, dy))); // the phase a pixel, each way
    if (dp > 1.6) continue; // too short to see here (under ~4 pixels a wave: it would alias into stripes): the glitter's width has it
    float a = abs(c.z) * (c.z < 0.0 ? lc.y : lc.x) * (1.0 - smoothstep(0.5, 1.6, dp)), th = dot(c.xy, vB) - c.w, e = a * cos(th);
    s -= c.xy * (a * sin(th)); mss += 0.5 * a * a * dot(c.xy, c.xy); ea += e;
    if (c.z > 0.0) { eta += e; vr += 0.5 * a * a; } // the wind sea: what breaks out at sea
  }
  // round 13: textures fetched only where they show (the pixel's work far out at sea, where the wind's specks and lines are drawn)
  float f1 = 1.0 - smoothstep(uNM.y / 60.0, uNM.y / 12.0, fw), f2 = 1.0 - smoothstep(uNM.z / 60.0, uNM.z / 12.0, fw); // resolved: in the normal; beyond: roughness
#if LITE
  vec4 t1 = texture2D(uNMt, al / uNM.y + uNMo.xy), fa = t1, fb = t1.abgr; // the first ripple tile, its noises the foam's too
#else
  vec4 t1 = f1 > 0.0 || night > 0.2 ? texture2D(uNMt, al / uNM.y + uNMo.xy) : vec4(0.5), fa = vec4(0.5), fb = vec4(0.5); // the first ripple tile
  if (far < 1.0 || dep < 40.0) { fa = texture2D(uNMt, vec2(al.x / 18.0 + uDrift.x, al.y / 40.0)); fb = texture2D(uNMt, vec2(al.x / 29.0 + uDrift.y, al.y / 63.0 + 0.47)); } // foam's noises, stretched along the crests (far out on deep water the specks have it)
#endif
  vec2 kv = uShore.x * ds.yz; float sf = smoothstep(0.75, 2.8, max(abs(dot(kv, dx)), abs(dot(kv, dy)))), as = lc.z * (1.0 - sf), th = uShore.x * ds.x + uShore.y;
  s -= kv * (as * sin(th) * (0.35 + 1.3 * smoothstep(0.3, 0.7, fb.a))); mss += 0.5 * as * as * dot(kv, kv); // the shore's waves, their crests uneven (not drawn rings)
  vec2 sw = s; // the waves' own slopes (not the ripples'): their shape in the water's light below
  float cm = 0.003 + 0.00512 * Ul, nk = sqrt(max(0.0, 0.85 * cm - uNM.x * lc.x * lc.x) / (2.0 * uNM.w)); // ripples: Cox & Munk's roughness the waves here leave over
  vec2 a2 = vec2(dot(vB, uDirs.xy), dot(vB, vec2(-uDirs.y, uDirs.x)));
  vec2 r1 = t1.rg * 2.0 - 1.0, r2 = uQ.y > 0.5 && f2 > 0.0 ? texture2D(uNMt, a2 / uNM.z + uNMo.zw).rg * 2.0 - 1.0 : vec2(0.0);
  s += nk * (f1 * (w * r1.x + wp * r1.y) + f2 * (uDirs.xy * r2.x + vec2(-uDirs.y, uDirs.x) * r2.y));
  mss += nk * nk * uNM.w * (f1 * f1 + f2 * f2);
  float mu = max(cm - mss, 0.12 * cm) + 0.0015; // what no pixel resolves: the glitter's width
  vec3 n = normalize(vec3(-s.x, 1.0, -s.y)), V = normalize(cameraPosition - vW), R = reflect(-V, n), Hh = normalize(sun + V);
  float nv = max(dot(n, V), 0.0), f5 = 1.0 - nv, fres = 0.02 + 0.98 * f5 * f5 * f5 * f5 * f5;
  vec3 sky = mix(skyH, skyZ, sqrt(clamp(R.y, 0.0, 1.0))) + vec3(0.05, 0.07, 0.11) * night; // a night sky's glow (towns, stars): the sea not black
  // the water: turquoise where the seabed shows through, deep blue beyond; the imagery only through the first metres (deeper, Esri's
  // photos meet in seams that the water would show), and there as its pattern (the photo over its ~150 m mean) as well
  float clr = mix(7.0, 2.5, smoothstep(0.4, 1.6, length(uSea.xy))); // m of water the seabed shows through: clear in a calm, stirred up in a blow
  float pat = 1.0, lk = lightK();
  if (uQ.y > 0.5 && dep < 15.0) { vec3 img = texture2D(map, uv).rgb, imgB = texture2D(map, uv, max(0.0, log2(150.0 / fw))).rgb; pat = clamp(dot(img, vec3(0.3, 0.55, 0.15)) / max(dot(imgB, vec3(0.3, 0.55, 0.15)), 0.02), 0.6, 1.5); }
  // round 13: the waves in the water's own light, so they show from above and far off, where what they reflect barely changes: each face
  // lighter as it turns to the sun's side (a hill shade of the true slopes, ×4: water is not lit so; a visual aid, the panel says so)
  // and the crests lighter by their true height (the light through their thinner water). A calm sea's small slopes stay glassy.
  vec2 sd = normalize(sun.xz + vec2(1e-4, 0.0)); float relief = clamp(1.0 + 4.0 * ((0.6 - 0.8 * dot(sw, sd)) * inversesqrt(1.0 + dot(sw, sw)) - 0.6), 0.45, 1.7); // the face's normal (-sw, 1) on a light 37° up on the sun's side
  vec3 body = (mix(vec3(0.07, 0.41, 0.44), vec3(0.01, 0.07, 0.15), 1.0 - exp(-dep / (clr * 5.7))) * relief + vec3(0.02, 0.16, 0.15) * smoothstep(0.0, 1.6, ea)) * mix(1.0, pat, exp(-dep / (clr * 0.4)) * 0.7) * (amb + sunCol * max(sun.y, 0.0)) * lk;
  float nh = max(dot(n, Hh), 0.05), t2 = (1.0 - nh * nh) / (nh * nh), f5h = 1.0 - max(dot(Hh, V), 0.0);
  float spec = exp(-t2 / mu) / (3.1416 * mu * nh * nh * nh * nh) * (0.02 + 0.98 * f5h * f5h * f5h * f5h * f5h) / (4.0 * max(nv, 0.1)) * step(0.0, sun.y); // Beckmann
  // round 13, phase 2: the wind on the water. Wind-roughened water reflects an average of the sky (a water surface's mean reflectance,
  // 0.066, of its mean colour) instead of its mirror image: seen low across the sea, where the mirror shows the bright horizon, rough
  // water and gusts are darker patches (as sailors read them); from above, where it shows the dark zenith, lighter ones. Calm water
  // keeps the mirror (glassy). Stronger than in life, gusts most (a visual aid, the panel says so); and the body darker in a gale.
  float rr = clamp(0.75 * smoothstep(1.0, 17.0, Ul) + 0.5 * gk * smoothstep(2.0, 6.0, uWind.z), 0.0, 0.9), Fe = mix(fres, 0.066, rr);
  vec3 col = body * (1.0 - Fe) * (1.0 - 0.25 * smoothstep(10.0, 22.0, Ul)) + mix(sky * fres, mix(skyH, skyZ, 0.6) * 0.066, rr) + sunCol * min(spec, 40.0) * mix(0.5, 9.0, night); // the moon's path brighter: eyes adapt at night
  if (night > 0.2 && uQ.y > 0.5 && ob < 0.0) { // the town's glow on the water, beyond this point from the camera, drawn out toward it by the waves (the lamps: columns, lights())
    vec2 dv = normalize(vB - cameraPosition.xz + 1e-3); float gw = 0.0, sl = 25.0 + 0.05 * distance(cameraPosition, vW);
    for (int j = 1; j <= 4; j++) gw += texture2D(glow, (vB + dv * sl * float(j)) / span + 0.5).r * (1.25 - 0.25 * float(j));
    col += vec3(1.0, 0.68, 0.36) * gw * night * (0.1 + 0.45 * fres) * (0.12 + 3.0 * r1.x * r1.x); // glints where the ripples face them
  }
  // foam: whitecaps on the wind sea's crests, in patches (their cover far away), streaks along the wind, the surf, the waterline
  vec2 Wq = mix(uWc.xy, uWc.zw, gk); float W = Wq.x, q = Wq.y; // the cover and its quantile
  float X = 0.85 * eta * inversesqrt(vr) + 0.55 * (fa.a + fb.a - 1.0) / 0.24; // ~N(0, 1): the crest's height and a patchiness
#if LITE
  float spk = W * 0.8, stl = 0.0;
#else
  float spk = far > 0.0 ? specks(vB, fw, W, uFx.y) : 0.0; // far off: the cover in specks (round 13: was an even tint)
  // lines along the wind, seen from afar (round 13): faint windrows from Beaufort 3 (an aid: the wind's direction), foam blown in streaks from 7
  float stl = uWind.w < 3.0 || fw < 1.5 ? 0.0 : lines(vec2(al.x - uFx.x, al.y), length(vec2(dot(dx, wp), dot(dy, wp))), 0.08 + 0.14 * smoothstep(13.0, 20.0, Ul)) * (0.18 * smoothstep(2.5, 7.0, Ul) + 0.4 * smoothstep(12.5, 18.0, Ul)) * smoothstep(1.5, 8.0, fw) * smoothstep(0.12, 0.35, V.y); // close up, the gale's streaks are the foam texture below; none seen low across the sea (end-on they made a grid)
#endif
  float wc = sqrt(lc.x) * mix(smoothstep(q, q + 0.6, X) * (0.5 + 0.5 * smoothstep(0.3, 0.7, fa.b)) + smoothstep(q - 0.9, q, X) * 0.25 * fb.b, spk, far) * step(2e-4, W); // a broken bright core, a fainter fringe
  float st = (Ul < 9.0 || LITE == 1 ? 0.0 : (smoothstep(13.0, 20.0, Ul) * smoothstep(0.7, 0.9, texture2D(uNMt, al / vec2(160.0, 14.0) + vec2(uDirs.z, 0.0)).a) * smoothstep(0.4, 0.7, fb.a) * 0.3 // Beaufort 7 up
    + smoothstep(9.0, 16.0, Ul) * smoothstep(0.62, 0.8, fa.b) * smoothstep(0.45, 0.65, fb.a) * 0.3 * sqrt(lc.x)) * (1.0 - far)) + stl; // round 13: from Beaufort 5, old foam's lace between the crests: a rough sea broken
  float Hin = length(uSea.xy * sh.yx), brk = smoothstep(0.38, 0.6, lc.w) * step(0.01, lc.z), front = mix(pow(max(cos(th + 0.6), 0.0), 6.0), 0.2, sf);
  float surf = brk * (0.6 * front * smoothstep(0.35, 0.75, fb.b) + 0.4 * smoothstep(0.35, 0.7, fa.b)) + smoothstep(0.6, 1.1, lc.w) * 0.5 * smoothstep(0.3, 0.7, fb.a);
  float wash = (1.0 - smoothstep(0.0, 0.2 + 0.7 * Hin, dep)) * (0.55 + 0.45 * sin(th)) * smoothstep(0.05, 0.9, Hin);
  float foam = clamp(wc + st + surf + wash, 0.0, 1.0); // (st: the lines too)
  col = mix(col, vec3(0.93, 0.96, 0.98) * (amb + sunCol * (0.35 + 0.65 * max(dot(n, sun), 0.0))) * lk, foam);
  float alpha = max(max(clamp(1.0 - exp(-dep / (clr * 0.35)), 0.18, 0.97), fres), foam); // the imagery itself: the first metres
  gl_FragColor = vec4(hazed(col, vW), ob > 0.0 ? alpha * uFx.z : alpha);
}
#endif`;

  // the street lights near the water (as js/area3d.js places its lamps: every ~30 m along the pack's lit roads) and the lighthouses → [x, z, strength]
  function lamps(w, L, span, max) {
    if (!w?.roads) return [];
    const { m, land } = L, out = [], wet = (x, z) => { const c = Math.round((x / span + .5) * (m - 1)), r = Math.round((z / span + .5) * (m - 1)); // water within ~3 cells (~160 m)
      for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < m && cc < m && !land[rr * m + cc]) return true; } return false; };
    const R = w.roads;
    for (let i = 0; i < R.k.length; i++) {
      const c = R.k[i], step = c ? 32 : 28, off = c ? 5 : 9; let carry = step / 2, side = 1;
      for (let j = R.s[i]; j < R.s[i + 1] - 1; j++) {
        const ax = R.v[2 * j], az = R.v[2 * j + 1], dx = R.v[2 * j + 2] - ax, dz = R.v[2 * j + 3] - az, l = Math.hypot(dx, dz);
        for (; carry < l; carry += step, side = -side) { const x = ax + dx * carry / l - dz / l * off * side, z = az + dz * carry / l + dx / l * off * side; if (wet(x, z)) out.push([x, z, c === 2 ? .7 : 1]); }
        carry -= l;
      }
    }
    for (let i = 0; i < (w.lights?.length || 0); i += 3) out.push([w.lights[i], w.lights[i + 1], 3]); // lighthouses
    return out.length > max ? out.filter((_, i) => i % Math.ceil(out.length / max) === 0) : out;
  }
  const COL_V = `attribute vec2 c; uniform vec4 uCol; uniform vec2 cloudVp; varying vec3 vC; // uCol: on (night), length (m), time, width (px)
void main() {
  vec3 L = vec3(position.x, 0.3, position.y); vec2 d = cameraPosition.xz - L.xz; float dist = length(d); d /= max(dist, 1.0);
  float len = min(dist * 0.6, uCol.y * clamp(dist / max(cameraPosition.y, 1.0) / 6.0, 0.12, 1.0)); vec3 e = vec3(d.x, 0.0, d.y) * len; // toward the camera: a light's path on the water, long seen low across it, short from above
  vec4 q0 = projectionMatrix * viewMatrix * vec4(L, 1.0), q1 = projectionMatrix * viewMatrix * vec4(L + e, 1.0), q = projectionMatrix * viewMatrix * vec4(L + e * c.x, 1.0);
  vec2 s = (q1.xy / q1.w - q0.xy / q0.w) * cloudVp + 1e-4, n = normalize(vec2(-s.y, s.x));
  q.xy += n * c.y * max(uCol.w, 2.5 * projectionMatrix[1][1] * cloudVp.y * 0.5 / q.w) / cloudVp * 2.0 * q.w; // ~2.5 m either side, at least uCol.w px
  vC = vec3(c.x, c.y, position.z * (1.0 - smoothstep(3000.0, 9000.0, dist)));
  gl_Position = q;
}`;
  const COL_F = `uniform vec4 uCol; varying vec3 vC;
void main() {
  float g = 0.5 + 0.5 * sin(vC.x * 70.0 - uCol.z * 2.6 + vC.z * 17.0) * sin(vC.x * 27.0 + uCol.z * 1.3); // glints that run along it
  float a = uCol.x * min(vC.z, 1.6) * (1.0 - vC.y * vC.y) * smoothstep(0.0, 0.06, vC.x) * (1.0 - vC.x) * (0.2 + 0.8 * g * g);
  gl_FragColor = vec4(vec3(1.0, 0.7, 0.38) * a, 1.0);
}`;

  function create(T, o) {
    const { U, span, renderer, cz } = o, half = span / 2, cap = renderer.capabilities;
    const t = cz ? { kw: o.tier === 0 ? 8 : 10, ks: o.tier === 0 ? 3 : 4, cols: 96, rows: 160 } : { kw: 24, ks: 8, cols: 224, rows: 224 }; // round 13: low-end phones 11 waves
    while (2 * (t.kw + t.ks) > (cap.maxFragmentUniforms || 64) - 48 && t.kw > 4) t.kw -= 2; // older GPUs: fewer waves
    const K = t.kw + t.ks, K2 = 2 * K, vtf = cap.maxVertexTextures > 0;
    NMD ||= nmData(128);
    // the grid: points over the screen (0..1), laid on the sea by the vertex shader
    const grid = (cols, rows) => {
      const pos = new Float32Array(cols * rows * 3), idx = new Uint16Array((cols - 1) * (rows - 1) * 6);
      for (let r = 0, j = 0; r < rows; r++) for (let c = 0; c < cols; c++, j++) { pos[j * 3] = c / (cols - 1); pos[j * 3 + 1] = r / (rows - 1); }
      for (let r = 0, j = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) { const q = r * cols + c; idx.set([q, q + 1, q + cols, q + 1, q + cols + 1, q + cols], j); j += 6; }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(new T.BufferAttribute(idx, 1)); return g;
    };
    const geo = grid(t.cols, t.rows);
    const tex = (d, n, fmt, filter) => { const x = new T.DataTexture(d, n, n, fmt, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, filter, filter); x.unpackAlignment = 1; x.needsUpdate = true; return x; }; // rows of any width
    const nmTex = new T.DataTexture(NMD.d, 128, 128, T.RGBAFormat, T.UnsignedByteType, T.UVMapping, T.RepeatWrapping, T.RepeatWrapping, T.LinearFilter, T.LinearMipmapLinearFilter);
    nmTex.generateMipmaps = true; nmTex.anisotropy = Math.min(4, cap.getMaxAnisotropy()); nmTex.needsUpdate = true;
    let distTex = tex(Uint8Array.of(255, 255), 1, T.LuminanceAlphaFormat, T.NearestFilter), fetchTex = tex(new Uint8Array(4).fill(255), 1, T.RGBAFormat, T.LinearFilter), fq = 1;
    const v4 = () => ({ value: new T.Vector4() });
    const my = { uInv: { value: new T.Matrix4() }, uC: { value: new Float32Array(K2 * 4) }, uN: { value: 0 }, uSea: v4(), uShore: v4(), uFetchK: v4(), uGrid: v4(), uTexK: { value: new T.Vector4(1, 0, 1, 0) },
      uWind: v4(), uWc: v4(), uFx: v4(), windO: o.U.windO || { value: new T.Vector2() }, uNM: v4(), uNMo: v4(), uDrift: v4(), uDirs: v4(), uSys: v4(), uQ: { value: new T.Vector4(1, 1, 0, 0) }, uDq: { value: 1 }, uNMt: { value: nmTex }, uDist: { value: distTex }, uFetch: { value: fetchTex } };
    const mat = new T.ShaderMaterial({ uniforms: { ...U, ...my }, vertexShader: SEA_V, fragmentShader: SEA_F(o.LIGHT), defines: { K2, VTF: vtf ? 1 : 0, PHONE: cz ? 1 : 0, LITE: 0, MARGIN: MARGIN.toFixed(2) },
      extensions: { derivatives: true }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: T.DoubleSide });
    const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 3;
    // the lamps' columns (night; made with the coast, lights())
    const colU = { uCol: v4(), cloudVp: U.cloudVp || { value: new T.Vector2(1, 1) } };
    const colMat = new T.ShaderMaterial({ uniforms: colU, vertexShader: COL_V, fragmentShader: COL_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const cols = new T.Mesh(new T.BufferGeometry(), colMat); cols.frustumCulled = false; cols.renderOrder = 4; cols.visible = false; mesh.add(cols); // a child: shown and hidden with the sea
    let q = 0;
    function lights() { // the columns' quads from the lamps near the water
      const P = lamps(L.w, L, span, cz ? 400 : 900), N = P.length, pos = new Float32Array(N * 12), c = new Float32Array(N * 8), idx = new Uint16Array(N * 6);
      P.forEach((l, i) => { for (let v = 0; v < 4; v++) { pos.set(l, (i * 4 + v) * 3); c.set([v >> 1, v & 1 ? 1 : -1], (i * 4 + v) * 2); } idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6); });
      cols.geometry.dispose(); const g = cols.geometry = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('c', new T.BufferAttribute(c, 2)); g.setIndex(new T.BufferAttribute(idx, 1));
      cols.n = N;
    }

    // the readout, in the panel: the forecast's waves and wind here at this hour
    const el = document.createElement('div'); el.className = 'a3-sea'; o.host.querySelector('.a3-panel')?.prepend(el);
    el.innerHTML = `<div class="a3-hr"><button type="button" data-a3="h-" aria-label="${esc(tr('a3_hPrev'))}">${ic('chevron-left') || '‹'}</button><b></b><button type="button" data-a3="h+" aria-label="${esc(tr('a3_hNext'))}">${ic('chevron-right') || '›'}</button><button type="button" class="a3-lvl" aria-pressed="false">${ic('waves')}<span>${esc(tr('a3_seaLvl'))}</span></button></div><div class="a3-wx"></div>`;
    const [hPrev, hNext] = el.querySelectorAll('.a3-hr [data-a3]'), hTime = el.querySelector('.a3-hr b'), wx = el.querySelector('.a3-wx');
    function readout(f, h) { // f: the forecast here, or null (none: the sea is drawn flat and the panel says so)
      const hr = typeof F !== 'undefined' && F && hours[h]; el.firstChild.hidden = !hr;
      if (hr) { hTime.textContent = whenT(hours[h].t); hPrev.disabled = h <= 0; hNext.disabled = h >= F.T - 1; }
      if (!f) { wx.innerHTML = `<span>${esc(tr('a3_noSea'))}</span>`; return; }
      const dn = d => tr('dirs')[Math.round(d / 45) % 8], rows = [tr('a3_waves', nf(f.wave, 1), Math.round(f.period), dn(f.waveDir))];
      if (f.swellPer > .5 && f.swell >= .3 && f.wave ** 2 - f.swell ** 2 > .04) rows.push(tr('a3_swell', nf(f.swell, 1), Math.round(f.swellPer), dn(f.swellDir)));
      rows.push(tr('a3_wind', Math.round(f.wind), dn(f.windDir), Math.round(f.gust)));
      wx.innerHTML = rows.map(x => `<span>${esc(x)}</span>`).join('') + `<small>${esc(tr('a3_seaAid'))}</small>`; // the waves' light is a visual aid (SEA_F)
    }

    // round 13: the sea-level view: the camera ~25 m over open water (as low as js/area3d.js's controls go: their nearest distance at
    // their lowest angle), looking the way it looked, over a point with 30 m of water or more under it and under the camera; again: back up
    const lvl = el.querySelector('.a3-lvl'); let back = null;
    lvl.onclick = () => {
      const C = o.controls?.(), cam = C?.object; if (!C || !o.fly) return;
      const tg = C.target, sp = new T.Spherical().setFromVector3(cam.position.clone().sub(tg));
      if (back) { o.fly(back.r, back.phi, back.theta, back.tg, 1400); back = null; }
      else {
        const r = C.minDistance * 1.04, phi = C.maxPolarAngle, ox = Math.sin(sp.theta) * r * Math.sin(phi), oz = Math.cos(sp.theta) * r * Math.sin(phi), wet = (x, z) => depthAt(x, z) >= 30 && depthAt(x + ox, z + oz) >= 30;
        let at = null; // the nearest such point to the one looked at, toward the camera first (the views open from the sea)
        for (let d = 0; d <= span && !at; d += 150) for (let k = 0; k < 24 && !at; k++) { const a = sp.theta + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 12, x = tg.x + Math.sin(a) * d, z = tg.z + Math.cos(a) * d; if (Math.max(Math.abs(x), Math.abs(z)) < half - 300 && wet(x, z)) at = [x, z]; if (!d) break; }
        if (!at) return;
        back = { r: sp.radius, phi: sp.phi, theta: sp.theta, tg: tg.clone() };
        o.fly(r, phi, sp.theta, new T.Vector3(at[0], 0, at[1]), 1600);
      }
      lvl.setAttribute('aria-pressed', back ? 'true' : 'false'); lvl.lastChild.textContent = tr(back ? 'a3_seaUp' : 'a3_seaLvl');
    };
    const depthAt = (x, z) => { if (!L) return -1; const c = Math.round((x / span + .5) * (L.m - 1)), r = Math.round((z / span + .5) * (L.m - 1)), q = r * L.m + c; return c < 0 || r < 0 || c >= L.m || r >= L.m || L.land[q] ? -1 : L.dep[q]; }; // m (the coast's grid), -1 on land

    // the sea now (cur) and, for FADE ms after a change, the one before (old); the coast's grid; the fetch job running
    let cur = null, old = null, t0 = 0, tf = -1e9, L = null, job = null, stopT = null, gone = false, last = 0, shoreTh = 0, h0 = o.h, gen = 0, tw = 0, o1 = 0, o2 = 0, run = 0;
    const st = h => { const f = known(forecastAt(o.a, h)); readout(f, h); return seaOf(f || FLAT, t, gen++); };
    function arrive(w) { // the shore's waves' arrival times for their period, again when it changes by > 8% (until then, the last ones)
      if (!L || Math.abs(w - tw) < .08 * w) return;
      tw = w; stopT?.(); const m = L.m;
      stopT = arrivalJob(L, w, span, d => { stopT = null; if (gone) return; distTex.dispose(); distTex = my.uDist.value = tex(d, m, T.LuminanceAlphaFormat, T.NearestFilter); my.uDq.value = m; o.wake?.(); });
    }
    function begin(next, fb, q) { // the new sea fades in; with the fetch for it (fb), the old fetch fades out alongside
      arrive(next.p[10]);
      const ft = fetchTex.image.data;
      if (fb && q === fq) for (let j = 0; j < q * q; j++) { ft[j * 4] = ft[j * 4 + 2]; ft[j * 4 + 1] = ft[j * 4 + 3]; ft[j * 4 + 2] = fb[j * 2]; ft[j * 4 + 3] = fb[j * 2 + 1]; }
      else if (fb) { // a new grid (the pack after the coarse surface): from open water
        const d = new Uint8Array(q * q * 4).fill(255); for (let j = 0; j < q * q; j++) { d[j * 4 + 2] = fb[j * 2]; d[j * 4 + 3] = fb[j * 2 + 1]; }
        fetchTex.dispose(); fetchTex = my.uFetch.value = tex(d, q, T.RGBAFormat, T.LinearFilter); fq = q; my.uTexK.value.setZ((q - 1) / q).setW(.5 / q);
      } else for (let j = 0; j < fq * fq; j++) { ft[j * 4] = ft[j * 4 + 2]; ft[j * 4 + 1] = ft[j * 4 + 3]; }
      fetchTex.needsUpdate = true;
      const now = REDUCED.matches ? -1e9 : performance.now(); tf = now;
      if (next !== cur) { old = cur; cur = next; t0 = now; }
      o.wake?.();
    }
    const turned = (p, q) => !p || p.dirs.some((d, k) => d[0] * q.dirs[k][0] + d[1] * q.dirs[k][1] < .996); // > 5°: the fetch again
    function refetch(next) {
      job?.(); job = null;
      if (!L) { begin(next); return; }
      job = fetchJob(L, next.dirs, span, (fb, q) => { job = null; if (!gone) begin(next, fb, q); });
    }
    cur = st(h0);

    function frame(cam) { // each frame, before the sea is drawn: the camera's ray matrix, the waves' phases, the sea between old and new
      const now = performance.now(), ts = REDUCED.matches ? 0 : now / 1000, e = old ? lim((now - t0) / FADE, 0, 1) : 1, k = e * e * (3 - 2 * e), ef = lim((now - tf) / FADE, 0, 1);
      if (e >= 1) old = null;
      my.uInv.value.multiplyMatrices(cam.matrixWorld, cam.projectionMatrixInverse);
      const C4 = my.uC.value; let n = 0;
      for (const [S, wt] of [[cur, Math.sqrt(k)], [old, Math.sqrt(1 - k)]]) if (S && wt > 0) for (const [kx, kz, a, w, ph] of S.c) {
        C4[n * 4] = kx; C4[n * 4 + 1] = kz; C4[n * 4 + 2] = a * wt; C4[n * 4 + 3] = (w * ts - ph) % TAU; n++;
      }
      my.uN.value = n;
      const p = cur.p.map((v, j) => old ? old.p[j] + (v - old.p[j]) * k : v), [hw, hs, kpW, kpS, Uw, Ug, wx, wz, chop, mss, ws] = p, wl = Math.hypot(wx, wz) || 1;
      const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now; if (ts) shoreTh = (shoreTh + ws * dt) % TAU;
      my.uSea.value.set(hw, hs, kpW, kpS);
      const sd = cur.dirs.map((d, j) => old ? d.map((v, i) => old.dirs[j][i] + (v - old.dirs[j][i]) * k) : d); my.uSys.value.set(...sd[0], ...sd[1]);
      my.uShore.value.set(ws, shoreTh, ws * ws / G, .85);
      const need = Math.min(10200, Math.max(1, (Math.max(hw, .02) * G / (.0016 * Math.max(Uw, 1) ** 2)) ** 2 * Math.max(Uw, 1) ** 2 / G)); // the fetch the wind sea's height needs (≥ 10 km: the open sea's, the forecast's own)
      my.uFetchK.value.set(0, Math.sqrt(10200 / need), ef * ef * (3 - 2 * ef), half);
      my.uGrid.value.set(2 * Math.tan(cam.fov * Math.PI / 360) * (1 + 2 * MARGIN) * Math.max(1 / (t.rows - 1), cam.aspect / (t.cols - 1)), span * 3, 0, chop); // the grid's coarser way
      my.uWind.value.set(wx / wl, wz / wl, Uw, Ug); my.uWc.value.set(...cover(Uw), ...cover(Uw + .35 * (Ug - Uw)));
      const w2 = [wx / wl * Math.cos(.6) - wz / wl * Math.sin(.6), wx / wl * Math.sin(.6) + wz / wl * Math.cos(.6)], T1 = Math.max(7, 3 * TAU / (kpW * w1Of(t.kw) ** 2)), T2 = 2.6; // round 13: the first ripple tile's longest waves (a third of it) where the wind sea's stop
      if (ts) { o1 = (o1 - Math.sqrt(G * T1 / 6 / TAU) * dt / T1) % 1; o2 = (o2 - (.55 + .03 * Uw) * dt / T2) % 1; run += Uw * dt; } // the first tile's waves at the phase speed of its middle ones (a sixth of it); run: the wind's (m). Summed, so a new hour's wind changes their speed, not where they are (round 13)
      my.uNM.value.set(mss, T1, T2, NMD.v);
      my.uNMo.value.set(o1, 0, o2, 0); // ripples run downwind (tile frames: x along their direction)
      my.uDrift.value.set(-(.03 * run / 18) % 1, -(.03 * run / 29) % 1, -(.8 * run / 260) % 1, -(.8 * run / 430) % 1); // downwind (the wind's frame): foam at 3% of the wind, gusts at 80%
      my.uDirs.value.set(w2[0], w2[1], -(.03 * run / 110) % 1, 0);
      my.uFx.value.set(.03 * run, ts % 3000, 1 - lim((cam.position.y - 1200) / 2300, 0, 1), 0); // z: the sea past the block's edge, from a camera under ~1.2 km (gone by 3.5 km: from high above the block stands alone) // the foam's lines drift downwind; the whitecaps' specks come and go
      const on = q < 2 && cols.n ? lim((U.night.value - .3) / .5, 0, 1) : 0; cols.visible = on > 0; // the lamps light from dusk, as js/area3d.js's
      colU.uCol.value.set(on * .55, 80 + 500 * lim(Math.sqrt(Math.max(.003 + .00512 * Uw, mss) / .06), 0, 1.5), ts, cz ? 1.2 : 1); // longer on a rougher sea
    }
    mesh.onBeforeRender = (r, s, cam) => { if (!gone) frame(cam); };

    return {
      mesh, info: { verts: t.cols * t.rows, waves: K, vtf, tier: cz ? 'phone' : 'desktop', get lamps() { return cols.n || 0; }, get quality() { return q; } },
      setQuality(level) { // 0 all; 1 without the shore's waves (refraction); 2 also without the extras (the seabed's pattern, the town's glow and lamps, a second ripple tile, gusts) and half the waves; 3 a flat sea of four waves' light, foam as its cover only
        if (level === q) return; q = level; my.uQ.value.set(q < 1 ? 1 : 0, q < 2 ? 1 : 0, 0, 0);
        const lite = q >= 3 ? 2 : q >= 2 ? 1 : 0; if (lite > mat.defines.LITE) { mat.defines.LITE = lite; mat.needsUpdate = true; }
        if (q === 2 && mesh.geometry === geo) { t.cols >>= 1; t.rows >>= 1; mesh.geometry = grid(t.cols, t.rows); } // level 2: a quarter of the points
        if (q >= 3 && mesh.geometry.attributes.position.count > 4) { if (mesh.geometry !== geo) mesh.geometry.dispose(); const g = new T.PlaneGeometry(span, span); g.rotateX(-Math.PI / 2); mesh.geometry = g; } // the block's quad // lighter pixel shaders (compiled once each)
        if (q >= 3 && t.kw > 3) { t.kw = 3; t.ks = 1; begin(seaOf(cur.f, t, gen++)); } // level 3: four waves
        if (q >= 2 && t.kw > 6) { t.kw = Math.max(4, t.kw >> 1); t.ks = Math.max(2, t.ks >> 1); begin(seaOf(cur.f, t, gen++)); } // the sea fades into fewer waves
      },
      get moving() { return !REDUCED.matches; },
      get state() { return cur.f; },
      setHour(h) { // the forecast of another hour: the sea fades into it
        if (h === h0) return; h0 = h;
        const next = st(h);
        if (old) { old = null; } // a change during a fade: the fade ends where it is (a small jump) and the new one starts
        if (turned(cur, next)) refetch(next); else begin(next);
      },
      setSurface(R) { // the depth grid (coarse first, then the pack's): the coast, then the waves' arrival times and the fetch, in slices
        job?.(); job = null;
        setTimeout(() => {
          if (gone) return;
          const t1 = performance.now(); L = coast(R, span); L.w = R.w; tw = 0; arrive(cur.p[10]); lights();
          this.info.coastMs = Math.round(performance.now() - t1);
          refetch(cur);
        }, 60);
      },
      dispose() { gone = true; job?.(); stopT?.(); el.remove(); for (const x of [nmTex, distTex, fetchTex, geo, mesh.geometry, mat, cols.geometry, colMat]) x.dispose(); },
    };
  }
  console.assert((() => { const c = []; system(c, 10, 2, 7, 0, 3.3, 2, .75, 4, 1, false); const hs = 4 * Math.sqrt(c.reduce((x, w) => x + w[2] ** 2 / 2, 0));
    return Math.abs(hs - 2) < .01 && Math.abs(TAU / ((TAU / 6) ** 2 / G) - 56.2) < .1 && Math.abs(growTp(12.5, 2.3) - 7.33) < .05; })(), 'the 3D sea: the waves carry the forecast height; a 6 s wave is 56 m long'); // the waves' sums and dispersion
  window.PsArea3DSea = { create, forecastAt, growTp };
})();
