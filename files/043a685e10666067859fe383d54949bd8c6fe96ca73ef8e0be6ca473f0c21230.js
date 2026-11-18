'use strict';
/* Psarema area in 3D, the weather in the sky (round 12, phase 2): js/area3d.js loads this file with three.js and js/area3d-sea.js.
   The forecast's weather at the area and hour (js/sources.js F at the block's centre; rain and visibility from js/weather.js):
   - wind you can see: streaks drifting with the wind's direction and speed, brighter and longer in the gusts (in patches that run
     downwind); spray blown off the crests from Beaufort 7. They run at the wind's true speed up close and faster from afar (× the view's
     distance / 1.5 km) so they read at every zoom; they live in a box around the point looked at, anchored to the ground, so they don't
     slide when the view turns.
   - clouds: the forecast's cover as a layer ~1.5 km up (a tileable noise thresholded to the cover), drifting with the wind; their shadows
     on land, sea and buildings through js/area3d.js's LIGHT chunk (each pixel's point from its depth, then up toward the sun); an overcast
     or rainy sky makes the light flat and grey (light()).
   - rain streaks when rain is forecast, slanted by the wind; the haze of the forecast's visibility.
   Phase 3: the quality level (the device tier from js/area3d.js, then one lower each time frames run slower than ~25 fps: 1 no cloud
   shadows, wind streaks or spray, 2 no clouds or rain either, 3 the sea's least); the sun, moon and sky fade with the sea; the land's new
   shadows cross-fade in (LIGHT shadeOf); clouds shaded on their side away from the sun.
   Round 13: no wind forecast, no wind drawn (it was a made-up breeze); no streaks under 1 m/s; fainter streaks; spray short and seen
   close only; U.windO (the streaks' drift) for js/area3d-sea.js's gust patches.
   A new hour: the weather fades into the new one over 2.5 s and the sun's shadows on the land are baked again (as js/area3d-surface.js
   does, a few rows a task). prefers-reduced-motion: all still.
   API: PsArea3DSky.create(THREE, o) → { setHour(h, LT), setSurface(R), dispose(), info }; PsArea3DSky.light(LT, a, h) → the hour's
   light (js/area3d.js light()) under its clouds and rain. o: { U, span, a, h, cz, scene, renderer, bake (the sun the surface was baked
   for) }. */
(function () {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)'), FADE = 2500, TAU = Math.PI * 2;
  const lim = (x, a, b) => x < a ? a : x > b ? b : x, mix = (p, q, k) => p.map((v, i) => v + (q[i] - v) * k);
  const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; // mulberry32
  const zOf = p => { const q = lim(Math.min(p, 1 - p), 1e-6, .5), t = Math.sqrt(-2 * Math.log(q)), z = t - (2.515517 + .802853 * t + .010328 * t * t) / (1 + 1.432788 * t + .189269 * t * t + .001308 * t * t * t); return p < .5 ? -z : z; }; // the normal quantile (Abramowitz & Stegun 26.2.23)

  // the weather at the area and hour: wind toward (x east, z south), its speed and gusts (m/s), cloud cover (0..1), rain (mm/h), visibility (m)
  function weatherAt(a, h) {
    const f = window.PsArea3DSea?.forecastAt(a, h), w = h >= 0 && window.PsWeather?.at?.(a.lat, a.lon, h) || {};
    if (!(f?.wind >= 0)) return { U: 0, Ug: 0, wx: 1, wz: 0, cloud: f?.cloud >= 0 ? lim(f.cloud / 100, 0, 1) : 0, rain: w.rain > 0 ? w.rain : 0, vis: w.vis > 0 ? w.vis : 30000 }; // no wind forecast: no wind drawn (round 13: was a made-up light breeze)
    const to = (f.windDir + 180) * Math.PI / 180;
    return { U: f.wind / 3.6, Ug: Math.max(f.gust, f.wind) / 3.6, wx: Math.sin(to), wz: -Math.cos(to), cloud: lim(f.cloud / 100, 0, 1), rain: w.rain > 0 ? w.rain : 0, vis: w.vis > 0 ? w.vis : 30000 };
  }
  // the hour's light (js/area3d.js light()) under its clouds and rain: less direct sun (or moon), a fuller, greyer sky
  function light(LT, a, h) {
    const w = weatherAt(a, h), o = Math.min(1, w.cloud ** 1.6 + Math.min(1, w.rain / 3) * .5), day = 1 - LT.night * .85, grey = (v, g) => mix(v, g.map(x => x * day), .72 * o);
    const av = (LT.amb[0] + LT.amb[1] + LT.amb[2]) / 3;
    return { ...LT, sunCol: LT.sunCol.map(v => v * (1 - .72 * o)), amb: LT.amb.map(v => (v + (av - v) * .4 * o) * (1 + .18 * w.cloud * day)),
      zen: grey(LT.zen, [.6, .63, .68]), hor: grey(LT.hor, [.72, .74, .77]), weather: w };
  }

  // the clouds' tile: a sum of waves in whole cycles (it repeats unseen), the longer stronger (mean .5, sd ~.17); 128 × 128, once a session
  let CLD = null;
  function cloudData(n) {
    const r = rng(29), v = new Float32Array(n * n), cx = new Float32Array(n), sx = new Float32Array(n);
    for (let i = 0; i < 56; i++) {
      let m, q, k; do { m = Math.round((r() * 2 - 1) * 20); q = Math.round((r() * 2 - 1) * 20); k = Math.hypot(m, q); } while (k < 2 || k > 20);
      const ph = r() * TAU, amp = k ** -.9; // cells of a few hundred metres to ~2 km, as cumulus
      for (let x = 0; x < n; x++) { cx[x] = Math.cos(TAU * m * x / n); sx[x] = Math.sin(TAU * m * x / n); }
      for (let y = 0; y < n; y++) { const cy = Math.cos(TAU * q * y / n + ph) * amp, sy = Math.sin(TAU * q * y / n + ph) * amp; for (let x = 0, j = y * n; x < n; x++, j++) v[j] += cx[x] * cy - sx[x] * sy; }
    }
    let s = 0, s2 = 0; for (const x of v) { s += x; s2 += x * x; }
    const mean = s / v.length, sd = Math.sqrt(s2 / v.length - mean * mean), d = new Uint8Array(n * n);
    for (let j = 0; j < v.length; j++) d[j] = lim(Math.round(255 * (.5 + .17 * (v[j] - mean) / sd)), 0, 255);
    return d;
  }

  /* ---------- Shaders ---------- */
  // the cloud layer: the LIGHT chunk's cloudAt(); lit from above, greyer underneath where thick, fading near the camera and far off
  const CLD_V = 'varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }';
  const CLD_F = LIGHT => `${LIGHT}uniform vec4 uCl; varying vec3 vW; // uCl: opacity from below, from above, the fade's distance, the block
void main() {
  float d = cloudAt(vW.xz) + 0.12 * (texture2D(cloudT, vW.xz / (cloudK.y * 0.23) + cloudO.xy * 4.3).r - 0.5), a = smoothstep(cloudK.z - 0.02, cloudK.z + 0.2, d), th = smoothstep(cloudK.z, cloudK.z + 0.4, d); // + lumps
  if (a < 0.01) discard;
  bool below = cameraPosition.y < vW.y;
  float d2 = cloudAt(vW.xz + normalize(sun.xz + 1e-4) * 180.0), self = smoothstep(0.0, 0.18, d2 - d), rim = smoothstep(0.0, 0.12, d - d2); // more cloud toward the sun: this side in its shade
  vec3 lit = (amb * 0.85 + sunCol * (0.3 + 0.7 * max(sun.y, 0.0)) * (1.0 - 0.55 * self)) * (1.0 + 0.18 * rim * (1.0 - night));
  vec3 col = (below ? mix(vec3(0.97), vec3(0.6, 0.63, 0.68), th) : mix(vec3(1.0), vec3(0.86, 0.88, 0.92), th * 0.5)) * lit;
  float fade = smoothstep(80.0, 500.0, abs(cameraPosition.y - vW.y)) * (below ? 1.0 - smoothstep(uCl.z, uCl.z * 3.0, length(vW.xz - cameraPosition.xz)) : 1.0 - smoothstep(0.55, 0.8, max(abs(vW.x), abs(vW.z)) / uCl.w)); // from above: over the block only
  gl_FragColor = vec4(hazed(min(col, vec3(1.0)), vW), a * fade * (below ? uCl.x : uCl.y * (0.4 + 0.6 * th)));
}`;
  // streaks (MODE 0: the wind, 1: spray, 2: rain): quads (position: a seed in 0..1³; c: along 0 head..1 tail, across ±1), widened on the
  // screen; anchored to the ground, wrapped round a box about the point looked at
  const P_V = `attribute vec2 c; uniform sampler2D uHt, cloudT, aux; uniform vec2 auxK, cloudVp; uniform float span, uHtMax;
uniform vec4 pBox, pWind, pK, pD; // pBox: the box's centre (x, z), size, height over the ground; pWind: toward (x, z), the wind and gust (m/s)
// pK: the drift (x, z, m, wrapped), the fall (m), the streak's length; pD: width (px), opacity, time (s), the rain's column
varying vec3 vC;
float groundAt(vec2 xz) { vec2 uv = xz / span + 0.5; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0; float v = texture2D(uHt, uv).r; return v * v * uHtMax; }
void main() {
  float B = pBox.z; vec2 rel = mod(position.xy * B + pK.xy * (0.8 + 0.4 * position.z) - pBox.xy, B) - 0.5 * B, xz = pBox.xy + rel;
  float a = pD.y * (1.0 - smoothstep(0.36, 0.5, max(abs(rel.x), abs(rel.y)) / B)) * step(max(abs(xz.x), abs(xz.y)), 0.5 * span); // fades at the box's sides; only over the block
  float g = smoothstep(0.45, 0.72, texture2D(cloudT, (xz - pK.xy * 0.9) / 2300.0).r); // the gusts: patches that run with the wind
  vec3 w = vec3(pWind.x, 0.0, pWind.y), head, dir; float len = pK.w;
#if MODE == 2
  float top = pD.w, y = mod(position.z * top - pK.z, top); // rain: falling through its column, slanted by the wind
  head = vec3(xz.x, groundAt(xz) + y, xz.y);
  dir = normalize(vec3(pWind.x * pWind.z * 0.6, -7.0, pWind.y * pWind.z * 0.6));
  a *= smoothstep(0.0, 0.15, y / top) * (1.0 - smoothstep(0.85, 1.0, y / top));
#else
  float life = MODE == 1 ? 1.4 : 5.0, f = fract(pD.z / life + position.z * 7.31); a *= sin(3.1416 * f); // each lives a few seconds
  float gr = groundAt(xz);
  head = vec3(xz.x, gr + pBox.w * (MODE == 1 ? 0.15 + position.z : 0.35 + 0.65 * position.z), xz.y);
  dir = w; len *= 0.6 + 0.8 * g; a *= MODE == 1 ? 1.0 : 0.55 + 0.7 * g;
  vec2 vd = normalize(xz - cameraPosition.xz + 1e-3); a *= 0.35 + 0.65 * abs(vd.x * w.z - vd.y * w.x); // fainter running along the view (foreshortened, they read as falling rain)
#if MODE == 1
  if (gr > 0.5 || texture2D(aux, (xz / span + 0.5) * auxK.x + auxK.y).b < 0.6 / 255.0) a = 0.0; // spray: over the sea only
#endif
#endif
  a *= smoothstep(0.1, 0.25, distance(head, cameraPosition) / B); // none right in front of the camera
  vec3 p = head - dir * len * c.x;
  vec4 h0 = projectionMatrix * viewMatrix * vec4(head, 1.0), h1 = projectionMatrix * viewMatrix * vec4(head - dir * len, 1.0), q = projectionMatrix * viewMatrix * vec4(p, 1.0);
  vec2 s = (h1.xy / h1.w - h0.xy / h0.w) * cloudVp + 1e-4, n = normalize(vec2(-s.y, s.x));
  q.xy += n * c.y * pD.x / cloudVp * 2.0 * q.w;
  vC = vec3(c.x, c.y, a);
  gl_Position = q;
}`;
  const P_F = `uniform vec3 sunCol, amb; varying vec3 vC;
void main() {
  float a = vC.z * smoothstep(0.0, 0.15, vC.x) * (1.0 - vC.x) * (1.0 - vC.y * vC.y); // a soft line: a short bright head (downwind), a long fading tail
  if (a < 0.003) discard;
  vec3 col = (MODE == 2 ? vec3(0.78, 0.82, 0.88) : vec3(1.0)) * min(amb * 1.2 + sunCol * 0.7, vec3(1.0));
  gl_FragColor = vec4(col, a);
}`;

  // the land's shadows for another sun (as js/area3d-surface.js bakes them, into the same texture's alpha), a few rows a task; → a stop
  function bakeJob(R, sun, span, done) { // → done(Uint8Array: the light per grid point)
    const n = R.n, H = R.H, step = span / (n - 1), out = new Uint8Array(n * n).fill(255);
    if (!sun || sun[1] <= .01) { done(out); return () => {}; } // no sun: all lit (the moon's light is soft)
    const sk = n > 600 ? 2 : 1, hz = Math.hypot(sun[0], sun[2]) || 1, dx = sun[0] / hz * sk, dz = sun[2] / hz * sk, rise = sun[1] / hz * step * sk, run = step * sk, maxH = R.maxH;
    let r = 0, timer = 0;
    const slice = () => {
      const t0 = performance.now();
      for (; r < n && performance.now() - t0 < 8; r += sk) for (let c = 0; c < n; c += sk) {
        let worst = -1, x = c + .5, z = r + .5, y = Math.max(H[r * n + c], -60);
        for (let s = 1; s < 160; s++) {
          x += dx; z += dz; y += rise; if (x < 0 || z < 0 || x >= n || z >= n || y > maxH) break;
          const t = (H[(z | 0) * n + (x | 0)] - y) / (s * run); if (t > worst) worst = t;
        }
        const l = Math.round(255 * lim(.5 - worst / .07, 0, 1));
        for (let rr = r; rr < Math.min(n, r + sk); rr++) for (let cc = c; cc < Math.min(n, c + sk); cc++) out[rr * n + cc] = l;
      }
      if (r < n) timer = setTimeout(slice); else done(out);
    };
    timer = setTimeout(slice);
    return () => clearTimeout(timer);
  }

  function create(T, o) {
    const { U, span, renderer, cz, scene } = o, rnd = rng(7);
    CLD ||= cloudData(128);
    const cloudTex = new T.DataTexture(CLD, 128, 128, T.LuminanceFormat, T.UnsignedByteType, T.UVMapping, T.RepeatWrapping, T.RepeatWrapping, T.LinearFilter, T.LinearMipmapLinearFilter);
    cloudTex.unpackAlignment = 1; cloudTex.generateMipmaps = true; cloudTex.needsUpdate = true;
    U.cloudT.value = cloudTex;
    U.windO = { value: new T.Vector2() }; // round 13: the streaks' drift (m), for js/area3d-sea.js's gust patches on the water (made before it)
    let htTex = new T.DataTexture(new Uint8Array(1), 1, 1, T.LuminanceFormat), R = null, stopBake = null, sunNow = o.bake, sunBaked = o.bake, shT = -1e9, fade = null, fade0 = null, toldQ = -1;
    const KEYS = ['sunCol', 'amb', 'haze', 'skyZ', 'skyH', 'sun']; // the light's uniforms that fade from one hour to the next
    // quality (0 all; 1 no cloud shadows, wind streaks or spray; 2 no clouds or rain either; 3 js/area3d-sea.js's least): from the GPU, then lower while frames run slow
    let level = 0, locked = false, qT = 0; const gaps = [];
    const setQ = l => { level = l; }; // the sea hears of it on the next frame (it is made after the sky)
    setQ(o.tier === 0 ? 1 : 0); // js/area3d.js's device tier: a low-end phone starts without cloud shadows and streaks
    const P = { uHt: { value: htTex }, uHtMax: { value: 1 } };

    // the cloud layer: a plane wide enough to fill the sky from low down
    const cg = new T.PlaneGeometry(span * 6, span * 6); cg.rotateX(-Math.PI / 2);
    const cm = new T.ShaderMaterial({ uniforms: { ...U, uCl: { value: new T.Vector4(.9, .45, span, 0) } }, vertexShader: CLD_V, fragmentShader: CLD_F(o.LIGHT), transparent: true, depthWrite: false, side: T.DoubleSide });
    const clouds = new T.Mesh(cg, cm); clouds.renderOrder = 7; clouds.frustumCulled = false; scene.add(clouds);

    // the streaks: wind, spray, rain (fewer on phones)
    function streaks(mode, N) {
      const pos = new Float32Array(N * 12), c = new Float32Array(N * 8), idx = new Uint16Array(N * 6);
      for (let i = 0; i < N; i++) {
        const s = [rnd(), rnd(), rnd()];
        for (let v = 0; v < 4; v++) { pos.set(s, (i * 4 + v) * 3); c.set([v >> 1, v & 1 ? 1 : -1], (i * 4 + v) * 2); }
        idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6);
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('c', new T.BufferAttribute(c, 2)); g.setIndex(new T.BufferAttribute(idx, 1));
      const m = new T.ShaderMaterial({ uniforms: { ...U, ...P, pBox: { value: new T.Vector4() }, pWind: { value: new T.Vector4() }, pK: { value: new T.Vector4() }, pD: { value: new T.Vector4() } },
        vertexShader: P_V, fragmentShader: P_F, defines: { MODE: mode }, transparent: true, depthWrite: false, side: T.DoubleSide }); // either winding: the quads turn with the view
      const mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.N = N; scene.add(mesh);
      return mesh;
    }
    const wind = streaks(0, cz ? 450 : 1000), spray = streaks(1, cz ? 300 : 700), rain = streaks(2, cz ? 900 : 2400);

    // the weather now and, for FADE ms after a change, the one before
    let cur = weatherAt(o.a, o.h), old = null, t0 = 0, last = 0, drift = [0, 0], cdrift = [0, 0], fall = 0, h0 = o.h;
    const vp = new T.Vector2(), tmp = new T.Vector3();
    const prevHook = scene.onBeforeRender;
    scene.onBeforeRender = (r, s, cam) => { prevHook?.(r, s, cam); frame(cam); };
    function frame(cam) {
      const now = performance.now(), still = REDUCED.matches, gap = now - last, dt = last && !still ? Math.min(.1, gap / 1000) : 0; last = now;
      if (!locked && gap > 0 && gap < 400 && level < 3 && gaps.push(gap) >= 24) { // frames slower than ~25 fps: a lower quality, before js/area3d.js drops pixels (~22 fps)
        const m = gaps.sort((a, b) => a - b)[12]; gaps.length = 0;
        if (m > 40 && now - qT > 1500) { setQ(level + 1); qT = now; }
      }
      if (fade === 'start') fade = { from: fade0, to: snap(), t0: now }; // the new hour's light was just set: from the old one to it
      if (fade?.t0) { const e = lim((now - fade.t0) / FADE, 0, 1), k = e * e * (3 - 2 * e); put(fade.from, fade.to, k); if (e >= 1) fade = null; }
      U.shMix.value = lim((now - shT) / 1500, 0, 1);
      if (toldQ !== level) { toldQ = level; o.quality?.(level); }
      const e = old ? lim((now - t0) / FADE, 0, 1) : 1, k = e * e * (3 - 2 * e); if (e >= 1) old = null;
      const W = {}; for (const key in cur) W[key] = old ? old[key] + (cur[key] - old[key]) * k : cur[key];
      const wl = Math.hypot(W.wx, W.wz) || 1, wx = W.wx / wl, wz = W.wz / wl, real = U.real.value > .5;
      const tg = window.PsArea3D?.view?.controls?.target || tmp.set(0, 0, 0), cd = cam.position.distanceTo(tg), kv = Math.max(1, cd / 1500);
      // the LIGHT chunk's clouds: each pixel's point from its depth; the layer's height, tile, threshold for the cover, shadow
      U.cloudInv.value.multiplyMatrices(cam.matrixWorld, cam.projectionMatrixInverse); renderer.getDrawingBufferSize(vp); U.cloudVp.value.copy(vp);
      const alt = Math.max(1500, (R?.maxH || 0) + 400), tile = 7000, thr = W.cloud < .02 ? 9 : .5 + .123 * zOf(1 - W.cloud), sunUp = lim((U.sun.value.y + .02) / .12, 0, 1) * (1 - U.night.value);
      const kc = Math.max(1, cd / 4000) * 1.6; cdrift[0] = (cdrift[0] + wx * W.U * kc * dt) % (tile * 63); cdrift[1] = (cdrift[1] + wz * W.U * kc * dt) % (tile * 63);
      const up = 1 - .65 * lim((cam.position.y - alt - 4000) / 16000, 0, 1); // high above them (the whole area in view): fainter, so the area shows
      U.cloudK.value.set(alt, tile, thr, real && level < 1 ? .38 * sunUp * lim(W.cloud * 3, 0, 1) * (.5 + .5 * up) : 0);
      U.cloudO.value.set(-(cdrift[0] / tile) % 1, -(cdrift[1] / tile) % 1, -((cdrift[0] * .77 + cdrift[1] * .64) / (tile * .63)) % 1, -((cdrift[1] * .77 - cdrift[0] * .64) / (tile * .63)) % 1);
      clouds.visible = real && W.cloud >= .02 && level < 2; clouds.position.set(cam.position.x, alt, cam.position.z); cm.uniforms.uCl.value.set(.88, .32 * up, span * .9, span);
      U.hazeK.value = Math.max(1 / span, 1.4 / W.vis); // the forecast's visibility (Koschmieder: contrast 2% at 3.9 / extinction)
      // the streaks: world-anchored seeds in a box (a power of two of 250 m, so the drift wraps the same at every size)
      const B = 250 * 2 ** lim(Math.round(Math.log2(cd * 1.4 / 250)), 1, 8), wrap = 128000;
      drift[0] = (drift[0] + wx * W.U * kv * dt) % wrap; drift[1] = (drift[1] + wz * W.U * kv * dt) % wrap; U.windO.value.set(drift[0], drift[1]);
      const ts = still ? 0 : now / 1000, wPx = cz ? 1.3 : 1.1;
      for (const [m, on, alpha, len, hOff, frac] of [
        [wind, real && level < 1, .08 + .14 * lim((W.U - 1.5) / 11, 0, 1), B * (.01 + .016 * lim(W.U / 14, 0, 1)), 4 + cd * .004, lim((W.U - 1) / 9, 0, 1)], // none in a calm (under 1 m/s)
        [spray, real && level < 1 && W.Ug > 13.5 && cd < 5500, .45 * (1 - lim((cd - 1500) / 4000, 0, 1)), Math.max(4, B * .002), 1.5 + cd * .0015, lim((W.Ug - 13.5) / 8, 0, 1)], // round 13: short, near the water and seen close (it is metres long)
        [rain, real && level < 2 && W.rain > .05, .32, Math.max(8, B * .02), 0, lim(W.rain / 3, .15, 1)]]) {
        m.visible = on && frac > 0; if (!m.visible) continue;
        const u = m.material.uniforms, Bm = m === rain ? Math.max(500, B * .7) : B, top = Math.min(alt, Bm * .5);
        if (m === rain) fall = (fall + 7 * kv * dt) % top;
        u.pBox.value.set(tg.x, tg.z, Bm, hOff); u.pWind.value.set(wx, wz, W.U, W.Ug); u.pK.value.set(drift[0], drift[1], fall, len); u.pD.value.set(wPx, alpha, ts, top);
        m.geometry.setDrawRange(0, Math.round(m.N * frac) * 6);
      }
    }

    return {
      info: { streaks: wind.N + spray.N + rain.N },
      get level() { return level; },
      quality(l, lock = true) { locked = lock; setQ(l); }, // a test's fixed level (scripts: SwiftShader numbers per level)
      fadeFrom() { if (!REDUCED.matches) { fade0 = snap(); fade = 'start'; } }, // js/area3d.js, before it sets another hour's light: it fades in over the sea's 2.5 s
      get weather() { return cur; },
      setHour(h, LT) { // another hour: the weather fades into it; the sun's shadows on the land are baked again
        if (h === h0) return; h0 = h;
        const next = weatherAt(o.a, h); old = cur; cur = next; t0 = REDUCED.matches ? -1e9 : performance.now();
        sunNow = LT?.bake || null; bake();
      },
      setSurface(R2) { // the depth grid (the pack's after the coarse one): the ground under the streaks; the shadows if the hour has changed
        R = R2; sunBaked = o.bake;
        const n = R.n, M = 257, st = (n - 1) / (M - 1), d = new Uint8Array(M * M), hm = Math.max(1, R.maxH);
        for (let r = 0; r < M; r++) for (let c = 0; c < M; c++) d[r * M + c] = Math.round(255 * Math.sqrt(Math.max(0, R.H[Math.round(r * st) * n + Math.round(c * st)]) / hm));
        htTex.dispose(); htTex = P.uHt.value = new T.DataTexture(d, M, M, T.LuminanceFormat, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, T.LinearFilter, T.LinearFilter);
        htTex.unpackAlignment = 1; htTex.needsUpdate = true; P.uHt.value = htTex; P.uHtMax.value = hm;
        for (const m of [wind, spray, rain]) { m.material.uniforms.uHt.value = htTex; m.material.uniforms.uHtMax.value = hm; }
        bake();
      },
      dispose() { stopBake?.(); U.shOld.value?.dispose(); U.shOld.value = null; U.shMix.value = 1; scene.onBeforeRender = prevHook || (() => {}); for (const x of [cloudTex, htTex, cg, cm, ...[wind, spray, rain].flatMap(m => [m.geometry, m.material])]) x.dispose(); U.cloudT.value = null; U.cloudK.value.set(0, 0, 0, 0); },
    };
    // the light's uniforms (and the sky behind the view) as numbers, and between two of them
    function snap() { const r = {}; for (const k of KEYS) r[k] = U[k].value.toArray(); r.night = U.night.value; return r; }
    function put(a, b, k) {
      for (const key of KEYS) U[key].value.fromArray(a[key].map((v, i) => v + (b[key][i] - v) * k));
      U.sun.value.normalize(); U.night.value = a.night + (b.night - a.night) * k;
      if (U.real.value > .5 && o.host) { const c = v => `rgb(${v.map(x => Math.round(x * 255)).join(',')})`, z = U.skyZ.value.toArray(), h = U.skyH.value.toArray(); o.host.style.background = `linear-gradient(180deg, ${c(z)} 0%, ${c(h)} 62%, ${c(h)} 100%)`; }
    }
    function bake() { // the land's shadows for the sun now, when it isn't the one they were baked for
      if (!R || sunNow === sunBaked || (sunNow && sunBaked && sunNow.every((v, i) => Math.abs(v - sunBaked[i]) < 1e-4))) return;
      stopBake?.(); const want = sunNow, R1 = R;
      stopBake = bakeJob(R1, want, span, lit => { // the old light kept a moment in shOld, the new one in the surface's texture; js/area3d.js's LIGHT fades between them
        stopBake = null; if (R1 !== R || !U.aux.value) return; sunBaked = want;
        const n = R.n, aux = R.aux; let so = U.shOld.value;
        if (!so || so.image.width !== n) { so?.dispose(); so = U.shOld.value = new T.DataTexture(new Uint8Array(n * n), n, n, T.LuminanceFormat, T.UnsignedByteType, T.UVMapping, T.ClampToEdgeWrapping, T.ClampToEdgeWrapping, T.LinearFilter, T.LinearFilter); so.unpackAlignment = 1; }
        const od = so.image.data; for (let k = 0; k < n * n; k++) { od[k] = aux[k * 4 + 3]; aux[k * 4 + 3] = lit[k]; }
        so.needsUpdate = true; U.aux.value.needsUpdate = true; shT = REDUCED.matches ? -1e9 : performance.now(); o.wake?.();
      });
    }
  }
  window.PsArea3DSky = { create, light, weatherAt };
})();
