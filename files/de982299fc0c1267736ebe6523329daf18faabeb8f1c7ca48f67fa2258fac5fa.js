'use strict';
/* Psarema dive view: the seabed around a tapped spot in 3D, a ~5 km block cut from the 250 m grid (core.js dFit, habK), coloured by
   seabed, with the fish chance of the shown hour (model.js scores) draped on it and glowing in the water above.
   API: PsDive.open(i) → a promise that settles once the first frame is drawn; PsDive.close().
   three.js r128 loads on first open, as in js/help.js (mobile/sync-web.mjs swaps these two URLs for bundled copies in the app).
   It draws only while the view moves (a drag, its glide, the opening swoop), never in a loop, and frees everything on close. */
(function () {
  const THREE_JS = 'vendor/three/three.min.js';
  const ORBIT_JS = 'vendor/three/OrbitControls.js';
  const HALF_KM = 2.6, UP = 6; // the block: ±2.6 km around the spot; 6 mesh points per 250 m cell
  const SEABED = { rock: '#6f655b', seagrass: '#2f5f36', coarse: '#a39886', sand: '#d8c69c', mud: '#7c6c55', other: '#9a9078', unknown: '#a7a089', land: '#7b7558' };

  let loading = null, S = null, eatPop = false;
  function addScript(src) {
    return new Promise((ok, fail) => {
      const s = Object.assign(document.createElement('script'), { src, async: true, ...sri(src) }); // js/core.js: the CDN file's hash
      s.onload = ok; s.onerror = () => { s.remove(); fail(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadThree() { // shared with js/help.js: whichever opens first loads it, the other finds it on window
    if (window.THREE && window.THREE.OrbitControls) return Promise.resolve();
    return loading || (loading = (window.THREE ? Promise.resolve() : addScript(THREE_JS))
      .then(() => window.THREE.OrbitControls || addScript(ORBIT_JS))
      .catch(e => { loading = null; throw e; }));
  }

  const rgb = hex => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16) / 255);
  const nice = v => [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(s => s >= v) || 1000;
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };

  // Cell values (nx × ny, one per 250 m cell) → mesh points ((nx-1)·UP+1 per row): bilinear, then a Gaussian blur of sigma mesh points.
  function upsample(src, nx, ny, sigma) {
    const fw = (nx - 1) * UP + 1, fh = (ny - 1) * UP + 1, out = new Float32Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      const y0 = Math.min(ny - 2, y / UP | 0), ty = y / UP - y0;
      for (let x = 0; x < fw; x++) {
        const x0 = Math.min(nx - 2, x / UP | 0), tx = x / UP - x0, a = y0 * nx + x0;
        out[y * fw + x] = (src[a] * (1 - tx) + src[a + 1] * tx) * (1 - ty) + (src[a + nx] * (1 - tx) + src[a + nx + 1] * tx) * ty;
      }
    }
    if (!sigma) return out;
    const r = Math.ceil(sigma * 2), k = new Float32Array(2 * r + 1); let sum = 0;
    for (let j = -r; j <= r; j++) sum += k[j + r] = Math.exp(-j * j / (2 * sigma * sigma));
    for (let j = 0; j < k.length; j++) k[j] /= sum;
    const t = new Float32Array(out.length);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      let s = 0; for (let j = -r; j <= r; j++) s += out[y * fw + Math.min(fw - 1, Math.max(0, x + j))] * k[j + r];
      t[y * fw + x] = s;
    }
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      let s = 0; for (let j = -r; j <= r; j++) s += t[Math.min(fh - 1, Math.max(0, y + j)) * fw + x] * k[j + r];
      out[y * fw + x] = s;
    }
    return out;
  }

  // The block around cell i: per-cell depth (0 = land), seabed colour and fish chance; the spot is always its middle cell.
  function cut(i) {
    const cx = i % W, cy = i / W | 0, rx = Math.round(HALF_KM / KX), ry = Math.round(HALF_KM / KY), nx = 2 * rx + 1, ny = 2 * ry + 1, n = nx * ny;
    const dep = new Float32Array(n), cell = new Int32Array(n), col = [new Float32Array(n), new Float32Array(n), new Float32Array(n)], rough = new Float32Array(n);
    const C = Object.fromEntries(Object.entries(SEABED).map(([k, v]) => [k, rgb(v)]));
    let maxD = 1;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const k = y * nx + x, j = Math.min(H - 1, Math.max(0, cy - ry + y)) * W + Math.min(W - 1, Math.max(0, cx - rx + x));
      cell[k] = j;
      let c = C.land;
      if (depth[j]) {
        dep[k] = dFit[j] || depth[j]; if (dep[k] > maxD) maxD = dep[k];
        const h = habK[j], r = ((h / 11 | 0) % 11) / 10, g = (h % 11) / 10, cls = HAB?.classes[h / 121 | 0] ?? 'unknown';
        const rest = C[cls === 'rock' || cls === 'seagrass' ? 'sand' : cls] || C.unknown, f = 1 - r - g;
        c = [0, 1, 2].map(q => C.rock[q] * r + C.seagrass[q] * g + rest[q] * f);
        rough[k] = r + g * 0.3; // rock is rubble, seagrass a bumpy meadow, sand and mud smooth
      }
      for (let q = 0; q < 3; q++) col[q][k] = c[q];
    }
    // Land has no heights here: a low shore that rises a little inland (cells from the sea, 4-neighbour, up to 4)
    const inland = new Uint8Array(n).fill(9);
    for (let k = 0; k < n; k++) if (dep[k]) inland[k] = 0;
    for (let s = 1; s <= 4; s++) for (let k = 0; k < n; k++) if (inland[k] === 9) {
      const x = k % nx;
      if ((x > 0 && inland[k - 1] === s - 1) || (x < nx - 1 && inland[k + 1] === s - 1) || (k >= nx && inland[k - nx] === s - 1) || (k < n - nx && inland[k + nx] === s - 1)) inland[k] = s;
    }
    // The surface on the mesh points (half of the opening's work: open() runs it a task before the 3D scene). Heights: sea = −depth × ex;
    // land = a low shore rising inland (no land heights in the data); then the seabed's roughness and grain.
    const fw = (nx - 1) * UP + 1, fh = (ny - 1) * UP + 1, mx = KX * 1000, mz = KY * 1000, hx = rx * mx, hz = ry * mz, span = 2 * Math.max(hx, hz);
    const ex = Math.max(1, Math.min(40, Math.round(0.3 * span / maxD))), yc = new Float32Array(n);
    for (let k = 0; k < n; k++) yc[k] = dep[k] ? -dep[k] * ex : span * (0.012 + 0.011 * Math.min(4, inland[k]));
    const Y = upsample(yc, nx, ny, UP * 0.55), R = upsample(rough, nx, ny, UP * 0.3), Cc = col.map(c => upsample(c, nx, ny, UP * 0.35));
    for (let k = 0; k < Y.length; k++) {
      const h = hash(k % fw, k / fw | 0);
      if (Y[k] < 0) Y[k] += h * R[k] * 0.5 * ex; // rubble and meadow texture
      for (const c of Cc) c[k] *= 1 + 0.05 * h; // grain
    }
    let minY = 0; for (const v of Y) if (v < minY) minY = v;
    return { i, cx, cy, rx, ry, nx, ny, dep, cell, col, rough, inland, maxD, fw, fh, mx, mz, hx, hz, span, ex, yc, Y, Cc, minY };
  }

  const VERT = `attribute vec3 col; varying vec3 vCol; varying vec3 vN; varying vec2 vUv; varying vec3 vP;
void main() { vCol = col; vN = normal; vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const FRAG = `uniform sampler2D heat; uniform float heatOn, ex, cstep, span, t; uniform vec3 sun;
varying vec3 vCol; varying vec3 vN; varying vec2 vUv; varying vec3 vP;
void main() {
  vec3 n = normalize(vN);
  float dif = max(dot(n, sun), 0.0), dep = -vP.y / ex;
  vec3 c = vCol * (0.3 + 0.62 * dif + 0.22 * (0.5 + 0.5 * n.y));
  if (dep > 0.0) {
    c = mix(c, vec3(0.035, 0.16, 0.27), min(0.6, 1.0 - exp(-dep / 90.0))); // the water's blue grows with depth
    vec2 p = vP.xz / (span * 0.015);                                           // sunlight rippling over the shallows
    float a = sin(p.x + 1.7 * sin(p.y * 0.8 + t)) + sin(p.y * 1.1 + 1.5 * sin(p.x * 0.9 - t * 0.7));
    c += vec3(0.5, 0.75, 0.8) * pow(max(0.0, 1.0 - abs(a)), 6.0) * 0.2 * exp(-dep / 14.0) * (0.4 + 0.6 * dif);
  }
  vec4 h = texture2D(heat, vUv);
  float ha = h.a * heatOn;
  c = mix(c, h.rgb * (0.62 + 0.45 * dif), ha * 0.8) + h.rgb * ha * 0.1;
  c = mix(c, vec3(0.92, 0.95, 0.9), 0.55 * (1.0 - smoothstep(0.0, span * 0.004, abs(vP.y))));   // the waterline
  float d = dep / cstep, g = abs(fract(d + 0.5) - 0.5) / max(fwidth(d), 1e-4);                // depth lines, every fifth stronger
  float major = 1.0 - step(0.5, abs(mod(floor(d + 0.5), 5.0)));
  c = mix(c, vec3(0.93, 0.97, 1.0), clamp(1.15 - g, 0.0, 1.0) * step(0.5 * cstep, dep) * (0.2 + 0.25 * major));
  gl_FragColor = vec4(c, 1.0);
}`;

  // A grid surface of cols × rows points: put(c, r) → [x, y, z, r, g, b]
  function sheet(T, cols, rows, put, uvs) {
    const n = cols * rows, pos = new Float32Array(n * 3), colr = new Float32Array(n * 3), uv = uvs ? new Float32Array(n * 2) : null;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c, v = put(c, r);
      pos.set(v.slice(0, 3), k * 3); colr.set(v.slice(3, 6), k * 3);
      if (uv) uv.set(uvs(c, r), k * 2);
    }
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)((cols - 1) * (rows - 1) * 6);
    for (let r = 0, m = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx[m++] = a; idx[m++] = d; idx[m++] = b; idx[m++] = b; idx[m++] = d; idx[m++] = e;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('col', new T.BufferAttribute(colr, 3));
    g.setAttribute('color', g.getAttribute('col'));
    if (uv) g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.setIndex(new T.BufferAttribute(idx, 1));
    return g;
  }

  function fishTexture(T) { // the app's fish (core.js FISH_SVG), white: tinted per school
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
    const g = cv.getContext('2d'); g.scale(2, 2); g.fillStyle = '#fff';
    g.fill(new Path2D('M2 16c8-11 25-14 38-8l12-7-3 15 3 15-12-7C27 30 10 27 2 16zm40-3a2 2 0 100 4 2 2 0 000-4z'), 'evenodd');
    const tx = new T.CanvasTexture(cv); tx.minFilter = T.LinearFilter; tx.generateMipmaps = false;
    return tx;
  }
  function rippleTexture(T) { // a tiling normal map for the sea surface (sums of whole waves across the tile)
    const N0 = 64, d = new Uint8Array(N0 * N0 * 4), h = (x, y) => Math.sin(2 * Math.PI * (2 * x + y) / N0) + 0.6 * Math.sin(2 * Math.PI * (3 * y - x) / N0) + 0.35 * Math.sin(2 * Math.PI * (5 * x + 4 * y) / N0);
    for (let y = 0; y < N0; y++) for (let x = 0; x < N0; x++) {
      const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), l = Math.hypot(dx, dy, 4), k = (y * N0 + x) * 4;
      d[k] = 128 - 127 * dx / l; d[k + 1] = 128 - 127 * dy / l; d[k + 2] = 127 * 4 / l + 128; d[k + 3] = 255;
    }
    const tx = new T.DataTexture(d, N0, N0, T.RGBAFormat); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.magFilter = tx.minFilter = T.LinearFilter; tx.needsUpdate = true;
    return tx;
  }

  function build(B, host) {
    const T = window.THREE, t0 = performance.now(), coarse = matchMedia('(pointer: coarse)').matches;
    const { nx, ny, rx, ry, maxD, fw, fh, mx, mz, hx, hz, span, ex, yc, Y, Cc, minY } = B; // cut() shaped the surface
    const cstep = nice(maxD / 12), rstep = nice(maxD / 4.5), base = minY - span * 0.045;
    const X = c => (c / UP - rx) * mx, Z = r => (r / UP - ry) * mz;

    const renderer = new T.WebGLRenderer({ antialias: !coarse, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement, scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1, span / 500, span * 30);
    const sunV = new T.Vector3(-0.5, 0.8, -0.35).normalize();
    scene.add(new T.HemisphereLight(0xcfe8ff, 0x203040, 0.65));
    const sunL = new T.DirectionalLight(0xffffff, 0.9); sunL.position.copy(sunV); scene.add(sunL);

    // heat: the map's colours (core.js heatRgba), one texel per cell, smoothed by the GPU
    const hd = new Uint8Array(nx * ny * 4), sOf = k => B.dep[k] && !northMask[B.cell[k]] ? scores[B.cell[k]] : 0;
    for (let k = 0; k < nx * ny; k++) hd.set(heatRgba(sOf(k)), k * 4);
    for (let k = 0; k < nx * ny; k++) if (!hd[k * 4 + 3]) { // a clear texel takes its hottest neighbour's colour, so the edge fades in that colour, not in cyan
      let b = -1, bs = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = k % nx + dx, y = (k / nx | 0) + dy, q = y * nx + x; if (x >= 0 && y >= 0 && x < nx && y < ny && hd[q * 4 + 3] && sOf(q) > bs) { bs = sOf(q); b = q; } }
      if (b >= 0) hd.copyWithin(k * 4, b * 4, b * 4 + 3);
    }
    const heatTex = new T.DataTexture(hd, nx, ny, T.RGBAFormat, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, T.LinearFilter, T.LinearFilter);
    heatTex.needsUpdate = true;
    const uvOf = (c, r) => [(c / UP + 0.5) / nx, (r / UP + 0.5) / ny];

    // seabed
    const bedGeo = sheet(T, fw, fh, (c, r) => { const k = r * fw + c; return [X(c), Y[k], Z(r), Cc[0][k], Cc[1][k], Cc[2][k]]; }, uvOf);
    bedGeo.computeVertexNormals();
    const U = { heat: { value: heatTex }, heatOn: { value: 1 }, ex: { value: ex }, cstep: { value: cstep }, span: { value: span }, t: { value: 0 }, sun: { value: sunV } };
    const bedMat = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, extensions: { derivatives: true } });
    scene.add(new T.Mesh(bedGeo, bedMat));

    // the block's sides: sediment from the seabed down to the base, and the water column above it
    const edges = [[fw, c => c * 1, () => 0], [fw, c => c * 1, () => fh - 1], [fh, () => 0, r => r * 1], [fh, () => fw - 1, r => r * 1]]
      .map(([n, cOf, rOf]) => Array.from({ length: n }, (_, q) => { const c = cOf(q), r = rOf(q); return [X(c), Y[r * fw + c], Z(r)]; }));
    const STRATA = ['#6b563f', '#4e3d2c', '#5d4834', '#3c2f23', '#2a211a'].map(rgb), SF = [0, 0.12, 0.38, 0.68, 1];
    const wallMat = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
    const waterMat = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, transparent: true, opacity: 0.4, depthWrite: false });
    const wTop = rgb('#4aa6c8'), wBot = rgb('#06223a');
    for (const e of edges) {
      const ground = new T.Mesh(sheet(T, e.length, SF.length, (c, r) => { const [x, y, z] = e[c]; return [x, y + (base - y) * SF[r], z, ...STRATA[r]]; }), wallMat);
      const water = new T.Mesh(sheet(T, e.length, 2, (c, r) => { const [x, y, z] = e[c], yy = r ? Math.min(0, y) : 0, f = -yy / (-minY || 1); return [x, yy, z, ...wTop.map((v, q) => v + (wBot[q] - v) * f)]; }), waterMat);
      water.renderOrder = 2; scene.add(ground, water);
    }

    // fish chance in the water: three faint sheets over the seabed, lower for bottom fish, higher for fish of open water
    const lift = sp?.group === 'pelagic' ? [0.3, 0.5, 0.7] : [0.06, 0.15, 0.26], glow = [];
    const yg = upsample(yc, nx, ny, 0), G = 2, gw = (nx - 1) * G + 1, gh = (ny - 1) * G + 1;
    lift.forEach((f, q) => {
      const g = sheet(T, gw, gh, (c, r) => { const k = (r * UP / G) * fw + c * UP / G, y = Math.min(0, yg[k]); return [X(c * UP / G), y * (1 - f), Z(r * UP / G), 1, 1, 1]; }, (c, r) => uvOf(c * UP / G, r * UP / G));
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ map: heatTex, transparent: true, opacity: [0.34, 0.22, 0.12][q], blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      m.renderOrder = 1; glow.push(m); scene.add(m);
    });

    // schools over the best cells (score ≥ 60, at least ~750 m apart, up to 7)
    const fishTex = fishTexture(T), best = [];
    for (let k = 0; k < nx * ny; k++) { const j = B.cell[k]; if (B.dep[k] && !northMask[j] && scores[j] >= 60) best.push([scores[j], k]); }
    best.sort((a, b) => b[0] - a[0]);
    const picked = [];
    for (const [s, k] of best) {
      if (picked.length >= 7) break;
      if (picked.some(([, q]) => Math.hypot(q % nx - k % nx, (q / nx | 0) - (k / nx | 0)) < 3)) continue;
      picked.push([s, k]);
    }
    for (const [s, k] of picked) {
      const c = (k % nx) * UP, r = (k / nx | 0) * UP, y = Y[r * fw + c] * (1 - lift[1]);
      const mat = new T.SpriteMaterial({ map: fishTex, color: new T.Color(...heatRgba(s).slice(0, 3).map(v => v / 255)).lerp(new T.Color(1, 1, 1), 0.35), transparent: true, depthWrite: false });
      for (let q = 0; q < 3; q++) {
        const sp_ = new T.Sprite(mat), sz = span * (0.034 + 0.01 * hash(k, q));
        sp_.scale.set(sz * (hash(q, k) > 0 ? 1 : -1), sz / 2, 1);
        sp_.position.set(X(c) + hash(k, q + 7) * mx * 0.5, y + hash(q + 3, k) * span * 0.012, Z(r) + hash(k + 5, q) * mz * 0.5);
        sp_.renderOrder = 1.5; scene.add(sp_);
      }
    }

    // the sea surface
    const ripple = rippleTexture(T); ripple.repeat.set(10, 10);
    const surfGeo = new T.PlaneGeometry(2 * hx, 2 * hz); surfGeo.rotateX(-Math.PI / 2);
    const surf = new T.Mesh(surfGeo, new T.MeshPhongMaterial({ color: 0x2a86b0, specular: 0x6a95a5, shininess: 90, normalMap: ripple, normalScale: new T.Vector2(0.3, 0.3),
      transparent: true, opacity: 0.15, depthWrite: false, side: T.DoubleSide }));
    surf.renderOrder = 3; scene.add(surf);

    // frame: the surface rectangle and the four corner posts
    const lineMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 }), fr = [];
    const cs = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
    cs.forEach(([x, z], q) => { const [x2, z2] = cs[(q + 1) % 4]; fr.push(x, 0, z, x2, 0, z2, x, 0, z, x, base, z); });
    const frGeo = new T.BufferGeometry(); frGeo.setAttribute('position', new T.Float32BufferAttribute(fr, 3));
    scene.add(new T.LineSegments(frGeo, lineMat));

    // the spot: a line down from a buoy on the surface to a ring on the seabed
    const spotY = Math.min(Y[ry * UP * fw + rx * UP], -ex); // a smoothed coast can lift a shallow spot above the water: keep it under
    const pinGeo = new T.BufferGeometry(); pinGeo.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, spotY, 0], 3));
    const pin = new T.Line(pinGeo, new T.LineDashedMaterial({ color: 0xffffff, dashSize: span * 0.008, gapSize: span * 0.006, transparent: true, opacity: 0.85, depthTest: false }));
    pin.computeLineDistances(); pin.renderOrder = 4;
    const ringGeo = new T.RingGeometry(span * 0.012, span * 0.018, 40); ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false, side: T.DoubleSide });
    const ring = new T.Mesh(ringGeo, ringMat); ring.position.y = spotY; ring.renderOrder = 4;
    const ring2 = new T.Mesh(ringGeo, ringMat); ring2.scale.setScalar(0.6); ring2.renderOrder = 4;
    const buoyGeo = new T.SphereGeometry(span * 0.007, 16, 10), buoy = new T.Mesh(buoyGeo, new T.MeshBasicMaterial({ color: 0xff8a3d }));
    scene.add(pin, ring, ring2, buoy);

    // depth ruler, moved to the corner nearest the camera
    const ruler = new T.Group(), rl = [0, 0, 0, 0, -maxD * ex, 0], tick = span * 0.012, marks = [];
    for (let d = 0; d <= maxD + 1e-6; d += rstep) { rl.push(0, -d * ex, 0, tick, -d * ex, 0); marks.push(d); }
    const rulerGeo = new T.BufferGeometry(); rulerGeo.setAttribute('position', new T.Float32BufferAttribute(rl, 3));
    const rulerLine = new T.LineSegments(rulerGeo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false }));
    rulerLine.renderOrder = 5; ruler.add(rulerLine); scene.add(ruler);

    // HTML labels that follow points in the scene
    const labHost = host.querySelector('.dive-labels'), labels = [], tmp = new T.Vector3();
    const label = (html, cls, v) => { const el = document.createElement('div'); el.className = 'dive-lab ' + cls; el.innerHTML = `<span>${html}</span>`; labHost.append(el); const L = { el, v }; labels.push(L); return L; };
    const sc = scores[B.i]; label(`<b>${depth[B.i]} m</b> · ${esc(habName(B.i))}${sc && !northMask[B.i] ? ` <i class="dive-pill" style="background:${solid(sc)}">${sc}</i>` : ''}`, 'spot', new T.Vector3(0, spotY, 0));
    const rulerLabs = marks.map(d => label(`${d}${d ? ' m' : ''}`, 'tick', new T.Vector3()));
    label(esc(tr('dirs')[0]), 'north', new T.Vector3(0, 0, -hz - span * 0.06));

    // camera and touch controls
    const controls = new T.OrbitControls(camera, canvas);
    Object.assign(controls, { enableDamping: true, dampingFactor: 0.09, rotateSpeed: coarse ? 0.7 : 0.8, zoomSpeed: 0.9, panSpeed: 0.8, screenSpacePanning: false,
      maxPolarAngle: Math.PI * 0.47, minDistance: span * 0.12 });
    controls.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_PAN };
    const home = new T.Vector3(0, base * 0.45, 0), sph = new T.Spherical(), fov = camera.fov * Math.PI / 180;
    const radius = () => { const hf = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect), rs = 0.5 * Math.hypot(2 * hx, 2 * hz, span * 0.06 - base); return rs / Math.sin(Math.min(fov, hf) / 2); }; // the bounding sphere: the block always fits
    let fly = null, w0 = 0, h0 = 0, raf = 0, last = performance.now(), touched = false;
    const setView = (r, phi, theta, tg) => { controls.target.copy(tg); camera.position.setFromSpherical(sph.set(r, phi, theta)).add(tg); camera.lookAt(tg); };
    function flyTo(r, phi, theta, tg, ms) {
      sph.setFromVector3(tmp.copy(camera.position).sub(controls.target));
      const d = ((theta - sph.theta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; // the short way round
      fly = { a: [sph.radius, sph.phi, sph.theta], b: [r, phi, sph.theta + d], ta: controls.target.clone(), tb: tg.clone(), t0: performance.now(), ms };
      wake();
    }
    const clampTarget = () => { const tg = controls.target; tg.x = Math.max(-hx, Math.min(hx, tg.x)); tg.z = Math.max(-hz, Math.min(hz, tg.z)); tg.y = Math.max(minY, Math.min(0, tg.y)); };
    controls.addEventListener('start', () => { fly = null; if (!touched) { touched = true; host.classList.add('is-touched'); } wake(); });
    controls.addEventListener('change', () => { clampTarget(); wake(); });

    function fit() { // also checked every frame: ResizeObserver can lag behind on some WebViews
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h || (w === w0 && h === h0)) return;
      w0 = w; h0 = h; renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const pan = host.querySelector('.dive-panel'), lift = pan.offsetWidth > w * 0.6 ? (pan.offsetHeight - host.querySelector('.dive-top').offsetHeight) / 2 : 0;
      if (lift > 0) camera.setViewOffset(w, h, 0, lift, w, h); else camera.clearViewOffset(); // phones: centre the block in the room the panel leaves
      controls.maxDistance = radius() * 1.6; // a tall phone needs more room than a wide screen
      if (touched) return; // until the user turns the view, keep the whole block framed (the WebView can settle its size late, or the phone turn)
      if (fly) fly.b[0] = radius();
      else if (controls.target.lengthSq()) { sph.setFromVector3(tmp.copy(camera.position).sub(controls.target)); setView(radius(), sph.phi, sph.theta, controls.target); }
    }
    const rose = host.querySelector('.dive-rose');
    function draw() {
      // ruler at the nearest corner, ticks pointing out
      let bc = cs[0], bd = Infinity;
      for (const c of cs) { const d = (camera.position.x - c[0]) ** 2 + (camera.position.z - c[1]) ** 2; if (d < bd) { bd = d; bc = c; } }
      ruler.position.set(bc[0], 0, bc[1]); ruler.rotation.y = bc[0] > 0 ? 0 : Math.PI;
      marks.forEach((d, q) => rulerLabs[q].v.set(bc[0] + Math.sign(bc[0]) * tick * 1.6, -d * ex, bc[1]));
      renderer.render(scene, camera);
      for (const L of labels) {
        tmp.copy(L.v).project(camera);
        const off = tmp.z > 1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1;
        L.el.style.visibility = off ? 'hidden' : '';
        if (!off) L.el.style.transform = `translate(${((tmp.x + 1) / 2 * w0).toFixed(1)}px,${((1 - tmp.y) / 2 * h0).toFixed(1)}px)`;
      }
      rose.style.transform = `rotate(${Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z)}rad)`; // north on screen
    }
    const prev = new T.Vector3(), tg = new T.Vector3(), eps2 = (span * 2e-5) ** 2;
    function frame(now) {
      raf = -1; // a frame is running: wake() calls from inside it must not start a second loop
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      fit();
      let busy = false;
      if (fly) {
        const k = Math.min(1, (now - fly.t0) / fly.ms), e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2, [a, b] = [fly.a, fly.b];
        setView(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e, tg.copy(fly.ta).lerp(fly.tb, e));
        busy = k < 1; if (!busy) fly = null;
      } else {
        prev.copy(camera.position); controls.update();
        busy = prev.distanceToSquared(camera.position) > eps2;
      }
      if (busy) U.t.value += dt * 0.8; // the light on the shallows moves only while the view does
      draw();
      raf = busy && !document.hidden ? requestAnimationFrame(frame) : 0;
    }
    function wake() { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    const ro = new ResizeObserver(() => wake()); ro.observe(host);
    const onVis = () => { if (!document.hidden) wake(); };
    document.addEventListener('visibilitychange', onVis);
    const onLost = e => e.preventDefault(), onRestored = () => wake();
    canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);

    host.querySelector('.dive-stage').appendChild(canvas);
    fit();
    // open: from straight above (the map) swooping down to the side view
    const R0 = radius(), PHI = 0.98, THETA = -0.5;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setView(R0, PHI, THETA, home); wake(); }
    else { setView(R0 * 1.5, 0.02, 0, home); flyTo(R0, PHI, THETA, home, 1400); }

    const api = {
      ms: performance.now() - t0, ex, cstep, span, maxD,
      setHeat(on) { U.heatOn.value = on ? 1 : 0; glow.forEach(m => { m.visible = on; }); scene.children.forEach(o => { if (o.isSprite) o.visible = on; }); wake(); },
      north() { sph.setFromVector3(tmp.copy(camera.position).sub(controls.target)); flyTo(sph.radius, sph.phi, 0, controls.target, 700); },
      reset() { flyTo(radius(), PHI, THETA, home, 900); },
      renderer, camera, controls, frame: () => raf, radius,
      dispose() {
        if (raf > 0) cancelAnimationFrame(raf);
        raf = -1; fly = null; ro.disconnect(); controls.dispose();
        document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
        const seen = new Set();
        scene.traverse(o => { for (const x of [o.geometry, o.material]) if (x && !seen.has(x)) { seen.add(x); x.dispose(); } });
        [heatTex, fishTex, ripple].forEach(x => x.dispose());
        renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
      },
    };
    return api;
  }

  // ---------- the overlay ----------
  function shell(i) {
    const el = document.createElement('div'), x = hours?.[state.h], sc = scores[i];
    el.className = 'dive'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', tr('dive3d'));
    const words = ['poor', 'fair', 'good', 'excellent'].map(k => `<span>${esc(tr(k))}</span>`).join('');
    const bar = `linear-gradient(90deg,${HEAT.map(([s, c]) => `rgb(${c.slice(0, 3)}) ${(s - 35) / 60 * 100}%`)})`;
    const hab = tr('hab'), key = ['rock', 'seagrass', 'sand', 'coarse', 'mud'].map(k => `<span><i style="background:${SEABED[k]}"></i>${esc(hab[k])}</span>`).join('');
    el.innerHTML = `<div class="dive-stage"></div><div class="dive-labels" aria-hidden="true"></div>
<header class="dive-top"><button class="dive-x" data-dive="close" aria-label="${esc(tr('nav_back'))}">${ic('chevron-left') || '‹'}</button><div class="dive-ttl"><b>${esc(tr('dive3d'))}</b><small>${esc([fishName(sp), x && whenT(x.t), typeof describe === 'function' ? describe(latOf(i), lonOf(i)) : ''].filter(Boolean).join(' · '))}</small></div></header>
<button class="dive-compass" data-dive="north" aria-label="${esc(tr('diveNorth'))}" title="${esc(tr('diveNorth'))}"><svg class="dive-rose" viewBox="-20 -20 40 40" aria-hidden="true"><path d="M0-15 5 0H-5z" fill="#ff6b5e"/><path d="M0 15 5 0H-5z" fill="#d9e2ea"/><text y="-17.5" text-anchor="middle">${esc(tr('dirs')[0])}</text></svg></button>
<div class="dive-panel">
  <div class="dive-seg" role="group"><button data-dive="heat" aria-pressed="true">${esc(tr('l_heat'))}${sc && !northMask[i] ? ` <i class="dive-pill" style="background:${solid(sc)}">${sc}</i>` : ''}</button><button data-dive="bed" aria-pressed="false">${esc(tr('f_seabed'))}</button></div>
  <div class="dive-heat"><div class="dive-bar" style="background:${bar}"></div><div class="dive-words">${words}</div></div>
  <div class="dive-key">${key}</div>
  <small class="dive-meta"></small>
</div>
<p class="dive-hint">${esc(tr(matchMedia('(pointer: coarse)').matches ? 'p_diveTouch' : 'diveHint'))}</p>
<div class="dive-msg" role="status"><span class="dive-spin"></span><span>${esc(tr('diveLoading'))}</span></div>`;
    return el;
  }

  function setMsg(text, retry) {
    const m = S?.el.querySelector('.dive-msg'); if (!m) return;
    m.hidden = !text;
    if (text) m.innerHTML = `<span>${esc(text)}</span>${retry ? `<button class="dive-btn" data-dive="retry">${esc(tr('retry'))}</button>` : ''}`;
  }

  function open(i) {
    i = +i;
    if (!(i >= 0 && i < N) || !depth[i]) return Promise.reject(new Error('PsDive.open: not a sea cell'));
    if (S) teardown();
    const el = shell(i), t0 = performance.now();
    document.body.appendChild(el);
    S = { el, i, view: null };
    el.addEventListener('click', onClick);
    try { history.pushState({ ...(history.state || {}), psDive: 1 }, ''); } catch {}
    el.querySelector('.dive-x').focus({ preventScroll: true });
    return start(S, t0);
  }
  function start(s, t0) {
    const next = () => new Promise(ok => setTimeout(ok)); // the surface, then the 3D scene, each a task of its own: a tap on × never waits for both
    return loadThree().then(next).then(() => S === s && cut(s.i)).then(B => B && next().then(() => {
      if (S !== s) return;
      try { s.view = build(B, s.el); }
      catch (e) { console.warn('Psarema dive: 3D view unavailable', e); setMsg(tr('diveNoGl')); return; }
      setMsg('');
      s.el.querySelector('.dive-meta').textContent = tr('diveMeta', fmtKm(B.nx * KX), fmtKm(B.ny * KY), s.view.ex, s.view.cstep);
      s.view.openMs = performance.now() - t0;
    }), e => {
      if (S !== s) return;
      console.warn('Psarema dive:', e.message);
      setMsg(tr('diveOffline'), true);
    });
  }
  function onClick(e) {
    const b = e.target.closest('[data-dive]'); if (!b || !S) return;
    const act = b.dataset.dive;
    if (act === 'close') close();
    else if (act === 'retry') { S.el.querySelector('.dive-msg').innerHTML = `<span class="dive-spin"></span><span>${esc(tr('diveLoading'))}</span>`; start(S, performance.now()); }
    else if (act === 'north') S.view?.north();
    else if (act === 'heat' || act === 'bed') {
      S.el.querySelectorAll('.dive-seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      S.el.classList.toggle('no-heat', act === 'bed');
      S.view?.setHeat(act === 'heat');
    }
  }
  function teardown() {
    if (!S) return;
    const s = S; S = null;
    try { s.view?.dispose(); } catch (e) { console.warn(e); }
    s.el.remove();
  }
  function close() {
    if (!S) return;
    teardown();
    if (history.state?.psDive) { eatPop = true; history.back(); }
  }
  // Back (Android, browser) closes the view, not the spot under it: this listener must run before js/mobile.js's own, and
  // listeners on window run in the order they were added, so index.html loads this file before js/mobile.js.
  addEventListener('popstate', e => {
    if (eatPop) { eatPop = false; e.stopImmediatePropagation(); return; }
    if (S && !history.state?.psDive) { e.stopImmediatePropagation(); teardown(); }
  }, true);
  addEventListener('keydown', e => { if (S && e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); close(); } }, true);
  document.addEventListener('click', e => { const b = e.target.closest('[data-dive-open]'); if (b) open(b.dataset.diveOpen).catch(err => console.warn(err.message)); }); // entry buttons: <button data-dive-open="i">

  window.PsDive = { open, close, get view() { return S?.view || null; } };
})();
