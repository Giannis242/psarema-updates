'use strict';
/* Psarema area in 3D, street view (round 13): js/area3d.js loads this file when the panel's "Street view" toggle is first turned on.
   Where real-life street imagery exists, as markers standing on the terrain: 360° panoramas and flat photos (two icons), from the open,
   keyless sources scripts/street/build.mjs collects into data/street/<area>.json: Panoramax, KartaView and Wikimedia Commons (thinned to
   one marker per ~80 m of a sequence, ~40 m for Commons). Further away, the markers gather into clusters with their count, each on one of
   its markers and the next 150 m to 4.8 km away by its own distance from the camera (so they stay ~56 px apart: near ones single, the far
   field gathered); a tap on one flies two levels in. Two THREE.Points draws; nothing is built
   or fetched until the toggle is on, and nothing runs per frame but their few uniforms.
   A tap picks what the screen shows: the scene's depth, then the markers' ids, drawn once into a small target, so a marker behind a hill or a
   building is not taken; else the land under the finger.
   A marker's card: the place, its source, author, licence and date; "View" (the picture here: a 360° one on a sphere to drag round, a flat
   one fitted to the screen, pinched or double-tapped to zoom; a small preview first while the sharp one loads), "Look from here" (the 3D
   camera flies to stand over the marker, looking the same way) and links out (the source's own page, Google Street View, Mapillary).
   A tap or a long press on the land or the shore: "Open in Google Street View here" (the official Maps URL, no key) and Mapillary.
   API: PsArea3DStreet.toggle(S, button), S: js/area3d.js's open view ({ el, a, view }); .back(event): Back and Escape, before js/area3d.js. */
(function () {
  const SRC = ['Panoramax', 'KartaView', 'Wikimedia Commons'];
  const PANO = 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM3.5 12c0 1.8 3.8 3.3 8.5 3.3s8.5-1.5 8.5-3.3M12 3.5c-2.2 2.3-3.3 5.1-3.3 8.5M15.3 14.6l2.2 1.1-1.1 2.1'; // a sphere, its equator, a turn
  const PHOTO = 'M4.5 8h3l1.6-2.3h5.8L16.5 8h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-8A1.5 1.5 0 0 1 4.5 8zM12 10.3a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4z'; // a camera
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const files = new Map(), ST = new WeakMap(), SZ = [12000, 12, 30]; // a marker's size on screen: SZ[0] / its distance, from SZ[1] to SZ[2] px
  const LV = [0, 150, 300, 600, 1200, 2400, 4800], GAP = 56; // clusters' spacing (m) by level (0: the markers themselves; then 150 · 2^(L-1)); ~GAP px apart on screen
  const LVL = `float lvOf(float d) { float need = ${GAP.toFixed(1)} * d / ppu; return need <= 90.0 ? 0.0 : clamp(1.0 + ceil(log2(need / 150.0)), 1.0, 6.0); } // a point's level by its distance
`;
  const load = id => files.get(id) || files.set(id, fetch(`data/street/${id}.json`).then(r => r.ok ? r.json() : null).catch(() => null).then(d => d || (files.delete(id), null))).get(id);
  const link = (href, text, main) => `<a class="sv-btn${main ? ' main' : ''}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${ic('external')}${esc(text)}</a>`;
  const gsv = (la, lo) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${la.toFixed(6)},${lo.toFixed(6)}`;
  const mly = (la, lo) => `https://www.mapillary.com/app/?lat=${la.toFixed(6)}&lng=${lo.toFixed(6)}&z=17`;
  const place = (la, lo) => typeof describe === 'function' ? describe(la, lo) : `${la.toFixed(5)}, ${lo.toFixed(5)}`;
  const loc = () => state.lang === 'el' ? 'el-GR' : 'en-GB';
  const month = s => { const [y, m] = String(s || '').split('-').map(Number); return !y ? '' : !m ? String(y) : new Date(y, m - 1, 15).toLocaleDateString(loc(), { month: 'short', year: 'numeric' }); };
  const lim = (x, a, b) => x < a ? a : x > b ? b : x;
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  const ppuOf = (r, cam) => r.domElement.clientHeight / (2 * Math.tan(cam.fov * Math.PI / 360)) || 1000; // screen px per metre at 1 m
  const exOf = v => v.mode === 'real' ? 1 : v.ex;

  let cur = null; // the open 3D view's session (for Back)
  function toggle(S, btn) {
    const s = ST.get(S) || ST.set(S, { on: false }).get(S); cur = S;
    s.on = !s.on; btn.setAttribute('aria-pressed', String(s.on)); S.el.classList.toggle('sv-on', s.on);
    if (!s.on) { closeViewer(S, s); stopFly(s); for (const o of [s.pts, s.cls]) if (o) o.visible = false; card(S, s, null); S.view?.V.wake(); return; }
    status(S, tr('sv_loading')); btn.classList.add('is-busy');
    Promise.all([load(S.a.id), new Promise(ok => { const t = () => S.view ? ok() : S.el.isConnected && setTimeout(t, 150); t(); })]).then(([d]) => {
      btn.classList.remove('is-busy');
      if (!s.on || !S.el.isConnected) return;
      s.d = d;
      const n = d?.p.length || 0;
      status(S, !d ? tr('sv_none') : n ? tr('sv_count', n.toLocaleString(loc()), [...new Set(d.p.map(p => SRC[p[2] >> 1]))].join(', ')) : tr('sv_none'));
      if (s.view !== S.view) attach(S, s);
      for (const o of [s.pts, s.cls]) if (o) o.visible = true;
      S.view.V.wake();
    });
  }
  const status = (S, text) => { const el = S.el.querySelector('.a3-svs'); if (el) el.textContent = text; };

  // the markers and their clusters. Markers: one point each (x, the true ground height, z), lifted by the view's height scale, sized by
  // distance (SZ), each icon raised over its point; shown when alone at the level its distance asks for (solo: a bit per level). Near a
  // level's distance a marker and its cluster's leader can fall either side: a rare marker shown twice or not at all, for a moment.
  // Clusters: per level, leaders at least LV apart, each with the markers nearest it within LV; drawn on the leader with its count from a
  // texture of numbers. Their twins with an id colour draw into the picking target (pick()).
  const VS_M = pick => `attribute float pano, solo, idx, pid; uniform float ex, pr, ppu, sel; varying float vP; varying vec3 vId;
${LVL}void main() { vId = mod(floor(pid / vec3(1.0, 256.0, 65536.0)), 256.0) / 255.0; vP = pano;
  vec4 mv = modelViewMatrix * vec4(position.x, position.y * ex + 2.0, position.z, 1.0); float d = max(-mv.z, 1.0);
  if (mod(floor(solo / exp2(lvOf(length(mv.xyz)))), 2.0) < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; } // inside a cluster at this distance
  float s = clamp(${SZ[0].toFixed(1)} / d, ${SZ[1].toFixed(1)}, ${SZ[2].toFixed(1)}) * (abs(idx - sel) < 0.5 ? 1.4 : 1.0); mv.y += s * 0.5 / ppu * d;
  gl_PointSize = s * pr${pick ? ' + 6.0' : ''}; gl_Position = projectionMatrix * mv; }`; // picking: a little wider than drawn (a finger)
  const FS_M = pick => `uniform sampler2D icons; varying float vP; varying vec3 vId;
void main() { vec4 c = texture2D(icons, vec2((gl_PointCoord.x + vP) * 0.5, 1.0 - gl_PointCoord.y)); ${pick ? 'if (length(gl_PointCoord - 0.5) > 0.5) discard; gl_FragColor = vec4(vId, 1.0);' : 'if (c.a < 0.04) discard; gl_FragColor = c;'} }`;
  const VS_C = pick => `attribute float slot, lv, pano, n, pid; uniform float ex, pr, ppu; varying float vS, vP; varying vec3 vId;
${LVL}void main() { vId = mod(floor(pid / vec3(1.0, 256.0, 65536.0)), 256.0) / 255.0; vS = slot; vP = pano;
  vec4 mv = modelViewMatrix * vec4(position.x, max(position.y, 0.0) * ex + 2.0, position.z, 1.0); float d = max(-mv.z, 1.0);
  if (abs(lv - lvOf(length(mv.xyz))) > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  float s = clamp(26.0 + 4.0 * log2(n), 30.0, 46.0); mv.y += s * 0.5 / ppu * d;
  gl_PointSize = s * pr${pick ? ' + 6.0' : ''}; gl_Position = projectionMatrix * mv; }`;
  const FS_C = pick => `uniform sampler2D counts; varying float vS, vP; varying vec3 vId;
void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q); if (r > 1.0) discard;
  ${pick ? 'gl_FragColor = vec4(vId, 1.0);' : `vec3 col = mix(vec3(0.11), vP > 0.5 ? vec3(1.0) : vec3(0.75), smoothstep(0.76, 0.84, r)); // a dark disc, its rim white when it holds a 360°
  vec2 uv = (vec2(mod(vS, 16.0), floor(vS / 16.0)) + gl_PointCoord) / 16.0;
  col = mix(col, vec3(1.0), texture2D(counts, vec2(uv.x, 1.0 - uv.y)).a * step(r, 0.78));
  gl_FragColor = vec4(col, 0.96 * (1.0 - smoothstep(0.92, 1.0, r)));`} }`;
  const label = n => n < 100 ? String(n) : n < 1000 ? String(Math.round(n / 10) * 10) : (n / 1000).toFixed(n < 9500 ? 1 : 0).replace(/\.0$/, '') + 'k'; // ≤ ~220 different

  function attach(S, s) {
    const T = window.THREE, v = S.view, B = v.V.B, span = v.span, half = span / 2, d = s.d;
    s.view = v; s.pts = s.cls = null;
    const xOf = lo => (lo - B.lo0) / (B.lo1 - B.lo0) * span - half, zOf = la => (B.la1 - la) / (B.la1 - B.la0) * span - half;
    const list = s.list = (d?.p || []).map(p => { const la = d.lat + p[0] / 1e5, lo = d.lon + p[1] / 1e5; return { la, lo, x: xOf(lo), z: zOf(la), k: p[2], ref: p[3], id: p[4], h: p[5] }; }).filter(p => Math.abs(p.x) < half && Math.abs(p.z) < half);
    const n = list.length;
    if (n) {
      const solo = new Float32Array(n).fill(1), C = s.clusters = []; // bit L: alone at level L (level 0: always)
      for (let L = 1; L < LV.length; L++) { // leader clustering: a marker joins the nearest leader within R, else leads; leaders stay R apart
        const R = LV[L], grid = new Map(), lead = [], key = (a, b) => a * 65536 + b;
        list.forEach((p, i) => {
          const gx = Math.floor((p.x + half) / R), gz = Math.floor((p.z + half) / R); let best = null, bd = R * R;
          for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const c of grid.get(key(gx + a, gz + b)) || []) { const d = (c.x - p.x) ** 2 + (c.z - p.z) ** 2; if (d < bd) { bd = d; best = c; } }
          if (best) { best.m.push(i); return; }
          const c = { x: p.x, z: p.z, m: [i] }; lead.push(c); (grid.get(key(gx, gz)) || grid.set(key(gx, gz), []).get(key(gx, gz))).push(c);
        });
        for (const c of lead) if (c.m.length > 1) C.push({ x: c.x, z: c.z, n: c.m.length, pano: c.m.some(i => list[i].k & 1) ? 1 : 0, lv: L }); else solo[c.m[0]] += 2 ** L;
      }
      const labels = [...new Set(C.map(c => label(c.n)))].slice(0, 256);
      const geo = (cols, put) => { const g = new T.BufferGeometry(), A = Object.fromEntries(Object.entries(cols).map(([k, w]) => [k, new Float32Array(cols.len * w)])); delete A.len; put(A); for (const [k, a] of Object.entries(A)) g.setAttribute(k, new T.BufferAttribute(a, cols[k])); return g; };
      const gm = geo({ len: n, position: 3, pano: 1, solo: 1, idx: 1, pid: 1 }, A => list.forEach((p, i) => { A.position.set([p.x, 0, p.z], i * 3); A.pano[i] = p.k & 1; A.solo[i] = solo[i]; A.idx[i] = i; A.pid[i] = i + 1; }));
      const gc = geo({ len: C.length, position: 3, slot: 1, lv: 1, pano: 1, n: 1, pid: 1 }, A => C.forEach((c, j) => { A.position.set([c.x, 0, c.z], j * 3); A.slot[j] = Math.max(0, labels.indexOf(label(c.n))); A.lv[j] = c.lv; A.pano[j] = c.pano; A.n[j] = c.n; A.pid[j] = n + j + 1; }));
      const U = s.U = { icons: { value: icons(T) }, counts: { value: counts(T, labels) }, ex: { value: 1 }, pr: { value: 1 }, ppu: { value: 1000 }, sel: { value: -1 } };
      const PU = s.PU = { ...U, pr: { value: 1 } }; // the picking pass: its own pixel ratio, the rest shared
      const mat = (vs, fs, u) => new T.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: u === U, depthWrite: false }); // the ids: opaque
      const pts = s.pts = new T.Points(gm, mat(VS_M(0), FS_M(0), U)), cls = s.cls = new T.Points(gc, mat(VS_C(0), FS_C(0), U));
      s.pick = new T.Scene(); s.pick.add(new T.Points(gm, mat(VS_M(1), FS_M(1), PU)), new T.Points(gc, mat(VS_C(1), FS_C(1), PU)));
      for (const o of [pts, cls, ...s.pick.children]) { o.frustumCulled = false; o.renderOrder = 7; }
      s.M = -1;
      pts.onBeforeRender = (r, sc, cam) => { // the height scale and the surface (the pack replaces the coarse one) as they are now
        U.ex.value = exOf(v); U.pr.value = r.getPixelRatio(); U.ppu.value = ppuOf(r, cam);
        if (s.M !== v.M) {
          s.M = v.M; const a = gm.attributes.position.array, b = gc.attributes.position.array;
          list.forEach((p, i) => { a[i * 3 + 1] = v.ground(p.x, p.z); }); C.forEach((c, j) => { b[j * 3 + 1] = v.ground(c.x, c.z); });
          gm.attributes.position.needsUpdate = gc.attributes.position.needsUpdate = true;
        }
      };
      v.scene.add(pts, cls);
    }
    input(S, s, v);
  }
  function icons(T) { // two icons side by side, 64 px each: the camera, the 360° sphere; white on a dark disc with a light rim
    const cv = Object.assign(document.createElement('canvas'), { width: 128, height: 64 }), g = cv.getContext('2d');
    [PHOTO, PANO].forEach((d, k) => { // u 0–0.5 a photo, 0.5–1 a 360° (the shader: (x + pano) / 2)
      g.setTransform(1, 0, 0, 1, k * 64, 0);
      g.beginPath(); g.arc(32, 32, 28, 0, 2 * Math.PI); g.fillStyle = 'rgba(28,28,28,.94)'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = k ? '#ffffff' : 'rgba(200,200,200,.8)'; g.stroke();
      g.setTransform(1.75, 0, 0, 1.75, k * 64 + 32 - 21, 11); g.lineWidth = 1.9; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.stroke(new Path2D(d));
    });
    const t = new T.CanvasTexture(cv); t.minFilter = T.LinearFilter; t.generateMipmaps = false;
    return t;
  }
  function counts(T, labels) { // the clusters' numbers, white, 16 × 16 cells of 64 px
    const cv = Object.assign(document.createElement('canvas'), { width: 1024, height: 1024 }), g = cv.getContext('2d');
    const font = getComputedStyle(document.body).fontFamily || 'sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    labels.forEach((t, k) => { g.font = `700 ${t.length > 3 ? 19 : 23}px ${font}`; g.fillText(t, (k % 16) * 64 + 32, Math.floor(k / 16) * 64 + 33); });
    const tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
    return tex;
  }

  // taps: what is drawn under the finger (a marker, a cluster), else the land under it; a long press (0.55 s, still) the same
  function input(S, s, v) {
    const cv = v.renderer.domElement; let down = null, timer = 0;
    const at = (x, y) => { const r = cv.getBoundingClientRect(); return [x - r.left, y - r.top, r.width, r.height]; };
    cv.addEventListener('pointerdown', e => {
      if (!s.on || down) { down = null; clearTimeout(timer); return; } // a second finger: a pinch, not a tap
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      timer = setTimeout(() => { if (down) { const p = at(down.x, down.y); down = null; tap(S, s, v, ...p); } }, 550);
    });
    cv.addEventListener('pointermove', e => { if (down && e.pointerId === down.id && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { down = null; clearTimeout(timer); } });
    const up = e => {
      clearTimeout(timer);
      if (!down || e.pointerId !== down.id) return;
      const ok = e.type === 'pointerup' && performance.now() - down.t < 450 && Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 8; down = null;
      if (ok && s.on) tap(S, s, v, ...at(e.clientX, e.clientY));
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  function tap(S, s, v, px, py, w, h) {
    if (S.view !== v) return;
    const id = s.pts ? pick(s, v, px, py, w, h) : 0, n = s.list.length;
    if (id > 0 && id <= n) { card(S, s, s.list[id - 1], id - 1); return; }
    if (id > n) { into(S, s, s.clusters[id - n - 1]); return; }
    const g = ground(v, (px / w) * 2 - 1, 1 - (py / h) * 2, exOf(v));
    if (!g) { card(S, s, null); return; }
    const B = v.V.B, span = v.span, lo = B.lo0 + (g.x / span + .5) * (B.lo1 - B.lo0), la = B.la1 - (g.z / span + .5) * (B.la1 - B.la0);
    card(S, s, { here: true, la, lo });
  }
  // the marker or cluster drawn nearest the finger (within 16 px), as the screen shows it: the whole scene once into a half-size target for
  // its depth, then the markers' and clusters' ids over it with the same depth test (a hidden one draws nothing); 0: none. ~a frame's work.
  function pick(s, v, px, py, w, h) {
    const T = window.THREE, r = v.renderer, k = .5 * r.getPixelRatio(), W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
    if (!s.rt) s.rt = new T.WebGLRenderTarget(W, H); else if (s.rt.width !== W || s.rt.height !== H) s.rt.setSize(W, H);
    s.PU.pr.value = k; const auto = r.autoClear;
    try {
      r.setRenderTarget(s.rt); r.autoClear = true; r.render(v.scene, v.camera);
      r.autoClear = false; r.clear(true, false, false); r.render(s.pick, v.camera);
    } finally { r.autoClear = auto; r.setRenderTarget(null); }
    const R = Math.ceil(16 * k), cx = Math.round(px * k), cy = H - 1 - Math.round(py * k), x0 = lim(cx - R, 0, W - 1), y0 = lim(cy - R, 0, H - 1), ww = lim(cx + R, 0, W - 1) - x0 + 1, hh = lim(cy + R, 0, H - 1) - y0 + 1;
    const buf = new Uint8Array(ww * hh * 4); r.readRenderTargetPixels(s.rt, x0, y0, ww, hh, buf);
    let best = 0, bd = 1e9;
    for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) {
      const o = (j * ww + i) * 4, id = buf[o] + buf[o + 1] * 256 + buf[o + 2] * 65536, dd = (x0 + i - cx) ** 2 + (y0 + j - cy) ** 2;
      if (id && dd < bd) { bd = dd; best = id; }
    }
    return best;
  }
  function ground(v, nx, ny, ex) { // where the ray under the finger meets the land or the sea's surface: marched, then halved; null over open sea
    const T = window.THREE, cam = v.camera, o = cam.position, dir = new T.Vector3(nx, ny, .5).unproject(cam).sub(o).normalize(), half = v.span / 2;
    const above = t => { const x = o.x + dir.x * t, z = o.z + dir.z * t; return o.y + dir.y * t - Math.max(v.ground(x, z) * ex, 0); };
    let t0 = 0, t = Math.max(1, cam.near);
    for (let n = 0; n < 4000 && above(t) > 0; n++) { t0 = t; t += Math.max(2, t * .01); if (t > v.span * 4) return null; }
    for (let k = 0; k < 14; k++) { const m = (t0 + t) / 2; if (above(m) > 0) t0 = m; else t = m; }
    const x = o.x + dir.x * t, z = o.z + dir.z * t;
    return Math.abs(x) < half && Math.abs(z) < half && v.ground(x, z) > -4 ? { x, z } : null; // land, or the shallows at its edge
  }

  // camera moves: the target and the camera eased to new places together (a touch on the view stops it), the view's own controls kept
  function fly(S, s, tg, cp, ms) {
    const v = S.view, c = v.controls, a = c.target.clone(), b = v.camera.position.clone(), t0 = performance.now();
    stopFly(s); c.addEventListener('start', s.flyStop = () => stopFly(s));
    const step = now => {
      const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      c.target.lerpVectors(a, tg, e); v.camera.position.lerpVectors(b, cp, e); c.update(); c.dispatchEvent({ type: 'change' });
      if (k < 1) s.flyRaf = requestAnimationFrame(step); else stopFly(s);
    };
    s.flyRaf = requestAnimationFrame(step);
    s.flyC = c;
  }
  function stopFly(s) { cancelAnimationFrame(s.flyRaf); s.flyRaf = 0; if (s.flyStop) s.flyC?.removeEventListener('start', s.flyStop); s.flyStop = null; }
  function into(S, s, c) { // a cluster: two levels in (the markers themselves from levels 1 and 2), the view's angle kept
    const T = window.THREE, v = S.view, cam = v.camera, ppu = ppuOf(v.renderer, cam), d = Math.max(300, (LV[c.lv - 2] || 80) * ppu / GAP * .85);
    const tg = new T.Vector3(c.x, Math.max(v.ground(c.x, c.z), 0) * exOf(v), c.z), dir = cam.position.clone().sub(v.controls.target).normalize();
    card(S, s, null); fly(S, s, tg, tg.clone().addScaledVector(dir, d), 900);
  }
  function lookFrom(S, s, p) { // 100 m behind the marker and 80 m up, looking the way the view looked, 350 m past it: the marker in the
    // foreground, the place around it beyond (at street height the 3D buildings would fill the view)
    const T = window.THREE, v = S.view, ex = exOf(v), gy = (x, z) => Math.max(v.ground(x, z), 0) * ex, f = v.controls.target.clone().sub(v.camera.position);
    f.y = 0; if (f.lengthSq() < 1) f.set(0, 0, -1); f.normalize();
    const cp = new T.Vector3(p.x - f.x * 100, gy(p.x, p.z) + 80, p.z - f.z * 100), tx = p.x + f.x * 350, tz = p.z + f.z * 350;
    fly(S, s, new T.Vector3(tx, Math.min(gy(tx, tz), cp.y - 50), tz), cp, 1400);
  }

  // what a marker shows: its source, author, licence and date, its own page, and how to get its picture: pic() → { full, thumb } (null: none here)
  function info(s, p) {
    const d = s.d, src = p.k >> 1, pano = p.k & 1, r = src < 2 ? d.seq[p.ref] : d.com[p.ref], la = p.la.toFixed(6), lo = p.lo.toFixed(6);
    const hex = src === 0 && p.id ? [...atob(p.id.replace(/-/g, '+').replace(/_/g, '/'))].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') : '';
    const uuid = hex && `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`, tpl = src === 0 && d.tpl?.[r[5]];
    const wide = coarse() ? 2048 : 4096, file = src === 2 && `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(r[0])}?width=`; // a 360° Commons picture's width: phones' memory
    return { src, pano, who: d.who[r[src < 2 ? 2 : 1]], lic: d.lic[r[src < 2 ? 3 : 2]], when: month(r[src < 2 ? 4 : 3]), file: src === 2 ? r[0].replace(/\.[a-z]+$/i, '') : '', head: p.h,
      own: src === 0 ? `https://api.panoramax.xyz/#focus=${uuid ? `pic&pic=${uuid}&` : 'map&'}map=19/${la}/${lo}`
        : src === 1 ? `https://kartaview.org/details/${encodeURIComponent(r[1])}/${p.id ?? 0}/track-info` : `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(r[0].replace(/ /g, '_'))}`,
      pic: src === 0 ? tpl && uuid ? async () => { const u = tpl.replace('{p}', `${hex.slice(0, 2)}/${hex.slice(2, 4)}/${hex.slice(4, 6)}/${hex.slice(6, 8)}/${uuid.slice(9)}`); return { full: u, thumb: u.replace(/sd\.jpg$/, 'thumb.jpg') }; } : null // the instance's 2048 px "sd" picture; its 500 px thumb
        : src === 1 ? async () => { const j = await fetch(`https://api.kartaview.org/2.0/photo/?sequenceId=${encodeURIComponent(r[1])}&sequenceIndex=${p.id ?? 0}`).then(x => x.json()), q = j?.result?.data?.[0]; return { full: q?.imageProcUrl || q?.fileurlProc, thumb: q?.imageThUrl || q?.fileurlTh }; }
        : pano ? async () => ({ full: (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=${wide}&titles=${encodeURIComponent('File:' + r[0])}`).then(x => x.json()))?.query?.pages?.[0]?.imageinfo?.[0]?.thumburl, thumb: file + 330 })
        : async () => ({ full: file + 1600, thumb: file + 330 }) };
  }
  const credit = I => `${I.file ? `<b>${esc(I.file)}</b><br>` : ''}${esc([SRC[I.src], tr('sv_by', I.who), I.lic, I.when].filter(Boolean).join(' · '))}`;
  const kindOf = I => tr(I.pano ? (I.src < 2 ? 'sv_pano' : 'sv_cpano') : I.src < 2 ? 'sv_photo' : 'sv_cphoto');

  // the card: a marker's place, source, author, licence and date, "View", "Look from here" and its links; or the point tapped on the land
  function card(S, s, p, i = -1) {
    let el = S.el.querySelector('.sv-card');
    if (s.U) { s.U.sel.value = p && !p.here ? i : -1; S.view?.V.wake(); }
    s.cardP = p;
    if (!p) { if (el) el.hidden = true; return; }
    if (!el) {
      el = Object.assign(document.createElement('div'), { className: 'sv-card' }); el.setAttribute('role', 'dialog');
      el.addEventListener('click', e => { const b = e.target.closest('[data-sv]')?.dataset.sv, q = s.cardP; if (b === 'x') card(S, s, null); else if (b === 'view' && q) viewer(S, s, q); else if (b === 'look' && q) lookFrom(S, s, q); });
      S.el.querySelector('.a3-panel').before(el);
    }
    const where = esc(place(p.la, p.lo)), x = `<button type="button" class="sv-x" data-sv="x" aria-label="${esc(tr('sv_close'))}">${ic('close') || '×'}</button>`;
    let html;
    if (p.here) {
      html = `<div class="sv-hd"><span class="sv-ic">${svg(PANO)}</span><div class="sv-tt"><b>${esc(tr('sv_here'))}</b><small>${where}</small></div>${x}</div>
<p class="sv-meta">${esc(tr('sv_hereTxt'))}</p><div class="sv-acts">${link(gsv(p.la, p.lo), tr('sv_gsvHere'), true)}${link(mly(p.la, p.lo), tr('sv_mly'))}</div>`;
    } else {
      const I = info(s, p);
      html = `<div class="sv-hd"><span class="sv-ic">${svg(I.pano ? PANO : PHOTO)}</span><div class="sv-tt"><b>${esc(kindOf(I))}</b><small>${where}</small></div>${x}</div>
<p class="sv-meta">${credit(I)}</p>
<div class="sv-acts">${I.pic ? `<button type="button" class="sv-btn main" data-sv="view">${svg(I.pano ? PANO : PHOTO)}${esc(tr(I.pano ? 'sv_view360' : 'sv_viewPhoto'))}</button>` : ''}<button type="button" class="sv-btn" data-sv="look">${ic('eye')}${esc(tr('sv_look'))}</button>${link(I.own, I.pic ? SRC[I.src].replace('Wikimedia ', '') : tr('sv_open', SRC[I.src]), !I.pic)}${link(gsv(p.la, p.lo), tr('sv_gsvShort'))}${link(mly(p.la, p.lo), tr('sv_mly'))}</div>`; // the links short: two rows
    }
    el.innerHTML = html; el.setAttribute('aria-label', el.querySelector('.sv-tt b').textContent); el.hidden = false;
  }

  // the picture viewer, over the 3D view (which draws nothing meanwhile: view.paused): a 360° picture on the inside of a sphere, dragged
  // round and pinched (or the wheel) to zoom; a flat one fitted to the screen, pinched, double-tapped or wheeled to zoom and then dragged;
  // its author and licence always at the foot. While it loads: a spinner over the small preview (a 360°'s preview is its front, blurred),
  // then a small spinner by the title until the sharp picture is in; if it fails, "Try again". ‹, Back or Escape return to the 3D view as it was.
  async function viewer(S, s, p) {
    const v = S.view, I = info(s, p); if (!v || !I.pic) return;
    closeViewer(S, s);
    const el = Object.assign(document.createElement('div'), { className: 'sv-view' }); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', kindOf(I));
    el.innerHTML = `<div class="sv-stage"></div>
<header class="sv-vtop"><button type="button" class="sv-x" data-sv="back" aria-label="${esc(tr('nav_back'))}">${ic('chevron-left') || '‹'}</button><div class="sv-tt"><b>${esc(kindOf(I))}</b><small>${esc(place(p.la, p.lo))}</small></div><span class="a3-spin sv-sharp" hidden></span></header>
<div class="sv-vfoot"><p class="sv-vhint">${esc(tr(I.pano ? 'sv_drag' : 'sv_pinch'))}</p><p class="sv-meta">${credit(I)}</p><div class="sv-acts">${link(I.own, tr('sv_open', SRC[I.src]))}</div></div>
<div class="sv-msg" role="status"><span class="a3-spin"></span><span>${esc(tr('sv_loadingPic'))}</span></div>`;
    el.addEventListener('click', e => { const b = e.target.closest('[data-sv]')?.dataset.sv; if (b === 'back') closeViewer(S, s); else if (b === 'retry') viewer(S, s, p); });
    S.el.append(el); v.paused = true;
    const me = s.viewer = { el, stop: null }, msg = el.querySelector('.sv-msg'), sharp = el.querySelector('.sv-sharp');
    el.querySelector('[data-sv="back"]').focus({ preventScroll: true });
    try {
      const u = await I.pic(); if (s.viewer !== me) return;
      if (!u?.full) throw new Error('no picture');
      const fw = v.controls.target.clone().sub(v.camera.position), H = Math.atan2(fw.x, -fw.z) * 180 / Math.PI; // where the 3D view looks, ° from north
      me.stop = await (I.pano ? sphere(el, u, I.head != null ? 180 + H - I.head : 180) : photo(el, u, on => { if (s.viewer === me) { msg.hidden = true; sharp.hidden = !on; } }));
      if (s.viewer !== me) { me.stop(); return; }
      msg.hidden = true;
    } catch (e) {
      if (s.viewer !== me) return;
      console.warn('Psarema street view:', e?.message || e);
      msg.hidden = false; sharp.hidden = true;
      msg.innerHTML = `<span>${esc(tr(navigator.onLine === false ? 'sv_offline' : 'sv_failPic'))}</span><button type="button" class="a3-btn" data-sv="retry">${esc(tr('retry'))}</button>`;
    }
  }
  function closeViewer(S, s) {
    const me = s.viewer; if (!me) return false;
    s.viewer = null; me.stop?.(); me.el.remove();
    if (S.view) { S.view.paused = false; S.view.V.wake(); }
    S.el.querySelector('.sv-card [data-sv="view"]')?.focus({ preventScroll: true });
    return true;
  }
  const img = src => new Promise((ok, fail) => { const im = Object.assign(new Image(), { decoding: 'async', referrerPolicy: 'no-referrer' }); im.onload = () => ok(im); im.onerror = () => fail(new Error('picture: ' + src)); im.src = src; });
  // a flat picture: its thumb first (busy(true): the sharp one on its way), then the sharp one in its place; resolves to its stop()
  async function photo(el, u, busy) {
    const stage = el.querySelector('.sv-stage'); let sharp = null;
    const full = img(u.full).then(f => sharp = f), th = u.thumb ? img(u.thumb).catch(() => null) : Promise.resolve(null);
    const im = await Promise.race([full, th.then(t => t || full)]); // the thumb if it comes first, else the sharp one (its failure: the viewer's)
    im.className = 'sv-img'; im.alt = ''; stage.append(im);
    const z = zoomable(stage, im, el.querySelector('.sv-vhint'));
    if (!sharp) { busy(true); full.then(f => { if (im.isConnected) im.src = f.src; busy(false); }, () => busy(false)); } else busy(false); // the sharp one in its place, the zoom kept
    return () => { z.stop(); im.src = ''; };
  }
  // pinch, double-tap or the wheel to zoom (1–6×) about the fingers or the pointer; one finger drags a zoomed picture, held inside the screen
  function zoomable(stage, im, hint) {
    const ptr = new Map(); let k = 1, x = 0, y = 0, pinch = 0, lastTap = 0;
    const box = () => { const w = stage.clientWidth, h = stage.clientHeight, f = Math.min(w / (im.naturalWidth || w), h / (im.naturalHeight || h)); return [w, h, (im.naturalWidth || w) * f, (im.naturalHeight || h) * f]; };
    const set = () => { const [w, h, fw, fh] = box(); k = lim(k, 1, 6); x = lim(x, -Math.max(0, (fw * k - w) / 2), Math.max(0, (fw * k - w) / 2)); y = lim(y, -Math.max(0, (fh * k - h) / 2), Math.max(0, (fh * k - h) / 2)); im.style.transform = `translate(${x}px,${y}px) scale(${k})`; };
    const about = (k2, cx, cy) => { const r = stage.getBoundingClientRect(), px = cx - r.left - r.width / 2, py = cy - r.top - r.height / 2, f = lim(k2, 1, 6) / k; x = px - (px - x) * f; y = py - (py - y) * f; k = lim(k2, 1, 6); set(); };
    const down = e => {
      stage.setPointerCapture?.(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); pinch = 0; if (hint) hint.hidden = true;
      if (ptr.size === 1) { const t = performance.now(); if (t - lastTap < 300) { about(k > 1.2 ? 1 : 2.5, e.clientX, e.clientY); lastTap = 0; } else lastTap = t; }
    };
    const move = e => {
      const q = ptr.get(e.pointerId); if (!q) return;
      if (ptr.size === 1 && k > 1) { x += e.clientX - q[0]; y += e.clientY - q[1]; set(); }
      q[0] = e.clientX; q[1] = e.clientY;
      if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) about(k * d / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch = d; }
    };
    const up = e => { ptr.delete(e.pointerId); pinch = 0; };
    const wheel = e => { e.preventDefault(); about(k * Math.exp(-e.deltaY * .0015), e.clientX, e.clientY); };
    stage.addEventListener('pointerdown', down); stage.addEventListener('pointermove', move); stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up); stage.addEventListener('wheel', wheel, { passive: false });
    const ro = new ResizeObserver(set); ro.observe(stage); im.addEventListener('load', set); // the sharp picture swapped in
    return { stop: () => ro.disconnect() };
  }
  // an equirectangular picture inside a sphere: u = lon / 360 (lon 180: its middle, which faces "head"), drawn only when it moves; while it
  // loads, its thumb (the front, flat) blurred behind the spinner
  function sphere(el, u, lon) {
    return new Promise((ok, fail) => {
      const T = window.THREE, stage = el.querySelector('.sv-stage'), r = new T.WebGLRenderer({ antialias: false }), cam = new T.PerspectiveCamera(75, 1, 1, 1100), sc = new T.Scene();
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); stage.append(r.domElement);
      const prev = u.thumb && Object.assign(new Image(), { className: 'sv-img sv-prev', alt: '', referrerPolicy: 'no-referrer', src: u.thumb }); if (prev) stage.prepend(prev);
      const g = new T.SphereGeometry(500, 64, 32); g.scale(-1, 1, 1);
      const m = new T.MeshBasicMaterial(), ptr = new Map(), at = new T.Vector3();
      let lat = 0, raf = 0, w = 0, h = 0, tex = null, pinch = 0;
      const draw = () => {
        raf = 0;
        if (stage.clientWidth !== w || stage.clientHeight !== h) { w = stage.clientWidth; h = stage.clientHeight; r.setSize(w, h, false); cam.aspect = w / h || 1; cam.updateProjectionMatrix(); }
        const ph = (90 - lat) * Math.PI / 180, th = lon * Math.PI / 180;
        cam.lookAt(at.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th))); r.render(sc, cam);
      };
      const ask = () => { raf ||= requestAnimationFrame(draw); };
      const zoom = f => { cam.fov = lim(cam.fov * f, 25, 95); cam.updateProjectionMatrix(); ask(); };
      const cv = r.domElement, hint = el.querySelector('.sv-vhint');
      cv.addEventListener('pointerdown', e => { cv.setPointerCapture?.(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); pinch = 0; if (hint) hint.hidden = true; });
      cv.addEventListener('pointermove', e => {
        const q = ptr.get(e.pointerId); if (!q) return;
        if (ptr.size === 1) { const k = cam.fov / (h || 1); lon -= (e.clientX - q[0]) * k; lat = lim(lat + (e.clientY - q[1]) * k, -85, 85); ask(); } // the picture follows the finger
        q[0] = e.clientX; q[1] = e.clientY;
        if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoom(pinch / d); pinch = d; }
      });
      const up = e => { ptr.delete(e.pointerId); pinch = 0; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(e.deltaY * .0012)); }, { passive: false });
      const ro = new ResizeObserver(ask); ro.observe(stage);
      const stop = () => { cancelAnimationFrame(raf); ro.disconnect(); tex?.dispose(); g.dispose(); m.dispose(); r.dispose(); r.forceContextLoss(); cv.remove(); prev?.remove(); };
      new T.TextureLoader().setCrossOrigin('anonymous').load(u.full, t => {
        tex = t; t.minFilter = T.LinearFilter; t.generateMipmaps = false; m.map = t; m.needsUpdate = true; sc.add(new T.Mesh(g, m)); draw(); prev?.remove(); ok(stop);
      }, undefined, () => { stop(); fail(new Error('picture: ' + u.full)); });
    });
  }

  // Back and Escape (js/area3d.js calls this before its own listeners): the viewer, then the card, close; the 3D view's history step stays
  function back(e) {
    const S = cur, s = S && ST.get(S);
    if (!s || !S.el.isConnected || !(closeViewer(S, s) || (s.cardP && (card(S, s, null), true)))) return;
    e.stopImmediatePropagation(); if (e.type === 'keydown') e.preventDefault();
    if (e.type === 'popstate') try { history.pushState({ ...(history.state || {}), psArea3d: 1 }, ''); } catch {}
  }

  window.PsArea3DStreet ||= { toggle, back }; // a second load (a quick double tap while the first was on its way) keeps the first one's state
})();
