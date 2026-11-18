'use strict';
/* Psarema area in 3D, the surface (js/area3d.js runs this file as a worker; on the page as PsArea3DSurface when workers are unavailable).
   In: { pack } (scripts/area3d/build-packs.mjs) or { n, H } (true metres on an n × n grid, land > 0), span (m), ex (the heights' exaggeration
   in "Fish chance"; computed when absent), sun [x, y, z] (scene axes: x east, y up, z south) or null, budget (triangles), coast: the
   coastline rings that reach the block as segments x0, z0, x1, z1 (scene metres; data/coast.js); part: 'mesh' (all but the light and the
   coastline) or 'light' (only those: { light (n × n), coast, ms }), so two workers share the work (js/area3d.js); without it, everything.
   Out: { n, H, ex, theta, minH, maxH, pos, idx, aux, b, head, tris, coast }:
   - coast: the coastline as a 2048 × 2048 distance field (coastC × coastC when given) (128 at the shore, more at sea, less on land, ±4 texels to 0 / 255), so the shore
     is drawn smooth and true to OpenStreetMap at any zoom instead of along the 17–27 m grid's steps (the water discards below 128);
   - pos / idx: a mesh with level of detail, after Agafonkin's "martini" (a right-triangulated irregular network): every right triangle's
     long-edge midpoint error, finest first, then the coarsest mesh within the budget; the threshold grows from 1× at the coast to 5× some
     6 km out, so the coast and the hills are fine and the open sea and the far edges light. Heights stay true (the shaders scale them).
   - aux: RGBA per grid point: the slopes east and south (Sobel, from neighbours on the same side of the coast; sqrt-coded so gentle seabed
     slopes keep their detail under a 12× exaggeration), the depth (0 on land, else 1 + 254 √(depth / 400 m)), and the light at true scale
     for the hour's sun (255 lit; the steepest rise towards the sun, soft over ~2°).
   - b: the pack's buildings, piers and breakwaters { k: kind (bits 0-3; 4-6: the roof shape; bit 7: the roof needs a full triangulation),
     h: height (m), c: colours (walls, roof: RGB565 each, 0 none), s: first vertex, v: x, z per vertex (m from the block's centre) }.
   - w: the world around them (OpenStreetMap): { tk, txy: single trees' kinds and x, z; areas, rows, roads: { k: kind (trees: kind | density
     << 3; roads: class), s: first vertex, v: x, z }; lights: lighthouses x, z, height } (m from the block's centre). */
(function () {
  async function surface(m) {
    let { n, H } = m, head = null, b = null, w = null; const ms = {}, t0 = performance.now(), lap = k => { ms[k] = Math.round(performance.now() - t0); };
    if (m.pack) {
      let u = new Uint8Array(m.pack);
      if (u[0] === 0x1f && u[1] === 0x8b) u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      if (String.fromCharCode(u[0], u[1], u[2], u[3]) !== 'P3D3') throw new Error('not a 3D pack (or an old one)');
      const hl = (u[4] | u[5] << 8 | u[6] << 16 | u[7] << 24) >>> 0;
      head = JSON.parse(new TextDecoder().decode(u.subarray(8, 8 + hl)));
      if (head.v !== 3) throw new Error('3D pack version ' + head.v);
      let p = 8 + hl;
      const rd = () => { let v = 0, s = 1, c; do { c = u[p++]; v += (c & 127) * s; s *= 128; } while (c & 128); return v; };
      const zz = () => { const v = rd(); return v % 2 ? -(v + 1) / 2 : v / 2; };
      n = head.n; H = new Float32Array(n * n);
      const Q = new Int32Array(n * n);
      for (let r = 0, k = 0; r < n; r++) for (let c = 0; c < n; c++, k++) { Q[k] = (r && c ? Q[k - 1] + Q[k - n] - Q[k - n - 1] : c ? Q[k - 1] : r ? Q[k - n] : 0) + zz(); H[k] = Q[k] * head.q; }
      if (m.part !== 'light') { // the light needs the heights only
      const nb = rd(), k8 = new Uint8Array(nb), hh = new Float32Array(nb), cc = new Uint16Array(nb * 2), st = new Uint32Array(nb + 1), xy = [], half = head.span / 2;
      let px = 0, pz = 0;
      for (let i = 0; i < nb; i++) {
        k8[i] = u[p++]; const hc = rd(); hh[i] = (hc >> 1) / 2;
        if (hc & 1) { cc[2 * i] = u[p] | u[p + 1] << 8; cc[2 * i + 1] = u[p + 2] | u[p + 3] << 8; p += 4; }
        const nv = rd(); st[i + 1] = st[i] + nv;
        let lx = px, lz = pz;
        for (let j = 0; j < nv; j++) { lx += zz(); lz += zz(); if (!j) { px = lx; pz = lz; } xy.push(lx / 2 - half, lz / 2 - half); }
      }
      b = { k: k8, h: hh, c: cc, s: st, v: Float32Array.from(xy) };
      const nt = rd(), tk = new Uint8Array(nt), txy = new Float32Array(nt * 2); // the world: trees, tree areas, tree rows, lit roads, lighthouses
      for (let i = 0, x = 0, z = 0; i < nt; i++) { tk[i] = u[p++]; x += zz(); z += zz(); txy[2 * i] = x - half; txy[2 * i + 1] = z - half; }
      const lines = unit => {
        const nl = rd(), k = new Uint8Array(nl), s = new Uint32Array(nl + 1), v = []; let ax = 0, az = 0;
        for (let i = 0; i < nl; i++) { k[i] = u[p++]; const nv = rd(); s[i + 1] = s[i] + nv; let lx = ax, lz = az; for (let j = 0; j < nv; j++) { lx += zz(); lz += zz(); if (!j) { ax = lx; az = lz; } v.push(lx * unit - half, lz * unit - half); } }
        return { k, s, v: Float32Array.from(v) };
      };
      const areas = lines(2), rows = lines(1), roads = lines(2), nh = rd(), lights = new Float32Array(nh * 3);
      for (let i = 0; i < nh; i++) { lights[3 * i] = zz() - half; lights[3 * i + 1] = zz() - half; lights[3 * i + 2] = rd() / 2; }
      if (p > u.length) throw new Error('3D pack cut short');
      w = { tk, txy, areas, rows, roads, lights };
      }
    }
    lap('decode');
    const span = m.span, N2 = n * n, step = span / (n - 1);
    // the exaggeration, as js/area3d.js always had it: the relief about a sixth of the block across
    let maxH = 0, minH = 0, lx = 0, lz = 0, nl = 0; const ds = [];
    for (let k = 0; k < N2; k++) { const v = H[k]; if (v > maxH) maxH = v; if (v < minH) minH = v; if (v > 0) { lx += k % n - n / 2; lz += (k / n | 0) - n / 2; nl++; } else if (!(k % 7)) ds.push(-v); }
    ds.sort((p, q) => p - q);
    const ex = m.ex || Math.max(1, Math.min(12, Math.round(.16 * span / Math.max(ds[Math.floor(ds.length * .9)] || 20, maxH * 1.3, 40))));
    const theta = nl && Math.hypot(lx, lz) / nl > n * .04 ? Math.atan2(-lx, -lz) : -.5; // the camera over the sea, looking at the coast
    if (m.part === 'light') { // the other worker's half (js/area3d.js runs both at once): the hour's light and the coastline
      const light = new Uint8Array(N2).fill(255); shade(H, n, m.sun, step, maxH, light, 1, 0); lap('shadows');
      const coast = m.coast ? coastField(m.coast, span, m.coastC || 2048) : null; lap('coast');
      return { light, coast, ms };
    }
    // slopes, depth and light per grid point
    const aux = new Uint8Array(N2 * 4), enc = g => Math.round((Math.sign(g) * Math.sqrt(Math.min(.9801, Math.abs(g) / (1 + Math.abs(g)))) + 1) * 127.5);
    for (let r = 0; r < n; r++) {
      const r0 = Math.max(0, r - 1) * n, r1 = r * n, r2 = Math.min(n - 1, r + 1) * n;
      for (let c = 0; c < n; c++) {
        const k = r1 + c, h0 = H[k], up = h0 > 0, c0 = Math.max(0, c - 1), c2 = Math.min(n - 1, c + 1);
        let a = H[r0 + c0], b = H[r0 + c], d = H[r0 + c2], e = H[r1 + c0], f = H[r1 + c2], g = H[r2 + c0], h = H[r2 + c], i = H[r2 + c2];
        if ((a > 0) !== up) a = h0; if ((b > 0) !== up) b = h0; if ((d > 0) !== up) d = h0; if ((e > 0) !== up) e = h0; // neighbours across the coast count as the point itself
        if ((f > 0) !== up) f = h0; if ((g > 0) !== up) g = h0; if ((h > 0) !== up) h = h0; if ((i > 0) !== up) i = h0;
        aux[k * 4] = enc((d + 2 * f + i - a - 2 * e - g) / (8 * step)); aux[k * 4 + 1] = enc((g + 2 * h + i - a - 2 * b - d) / (8 * step));
        aux[k * 4 + 2] = up ? 0 : 1 + Math.round(Math.sqrt(Math.min(-h0, 400) / 400) * 254); aux[k * 4 + 3] = 255;
      }
    }
    lap('slopes');
    if (m.part !== 'mesh') { shade(H, n, m.sun, step, maxH, aux, 4, 3); lap('shadows'); }
    // the mesh: errors on the "Fish chance" heights (the most exaggerated the view shows). The triangles' corners top-down (martini decodes
    // each from its id; here the children from their parent: id → id + 2^k and id + 2^(k+1) at depth k), then the errors bottom-up.
    const D = new Float32Array(N2); for (let k = 0; k < N2; k++) D[k] = H[k] * ex;
    const tile = n - 1, nTri = tile * tile * 2 - 2, nPar = nTri - tile * tile, err = new Float32Array(N2), co = new Uint16Array(nTri * 4);
    co.set([tile, tile, 0, 0, 0, 0, tile, tile]); // id 2: a (tile, tile), b (0, 0); id 3: a (0, 0), b (tile, tile)
    for (let k = 1, lo = 2; lo + lo - 2 < nTri; k++, lo *= 2) for (let id = lo; id < lo * 2; id++) {
      const q = (id - 2) * 4, ax = co[q], ay = co[q + 1], bx = co[q + 2], by = co[q + 3], mx = (ax + bx) >> 1, my = (ay + by) >> 1, cx = mx + my - ay, cy = my + ax - mx;
      const c0 = (id + lo - 2) * 4, c1 = (id + 2 * lo - 2) * 4;
      if (c0 < co.length) { co[c0] = bx; co[c0 + 1] = by; co[c0 + 2] = cx; co[c0 + 3] = cy; }
      if (c1 < co.length) { co[c1] = cx; co[c1 + 1] = cy; co[c1 + 2] = ax; co[c1 + 3] = ay; }
    }
    for (let i = nTri - 1; i >= 0; i--) {
      const q = i * 4, ax = co[q], ay = co[q + 1], bx = co[q + 2], by = co[q + 3];
      const mx = (ax + bx) >> 1, my = (ay + by) >> 1, qx = mx + my - ay, qy = my + ax - mx, mi = my * n + mx;
      let e = Math.abs((D[ay * n + ax] + D[by * n + bx]) / 2 - D[mi]);
      if (err[mi] > e) e = err[mi];
      if (i < nPar) { const l = err[((ay + qy) >> 1) * n + ((ax + qx) >> 1)], r = err[((by + qy) >> 1) * n + ((bx + qx) >> 1)]; if (l > e) e = l; if (r > e) e = r; }
      err[mi] = e;
    }
    lap('errors');
    // the threshold's weight: distance to the coast on a 64 × 64 grid (chamfer), 1 at the coast to 5 at ~6 km
    const G = Math.min(64, tile), sh = Math.log2(tile / G), wg = new Float32Array(G * G).fill(1e9);
    for (let r = 0; r < tile; r++) for (let c = 0; c < tile; c++) { const k = r * n + c; if ((H[k] > 0) !== (H[k + 1] > 0) || (H[k] > 0) !== (H[k + n] > 0)) wg[(r >> sh) * G + (c >> sh)] = 0; }
    for (let pass = 0; pass < 2; pass++) for (let q = 0; q < G * G; q++) {
      const k = pass ? G * G - 1 - q : q, x = k % G, y = k / G | 0, d = pass ? 1 : -1;
      for (const [ox, oy] of [[d, 0], [0, d], [d, d], [-d, d]]) { const xx = x + ox, yy = y + oy; if (xx >= 0 && yy >= 0 && xx < G && yy < G) wg[k] = Math.min(wg[k], wg[yy * G + xx] + (ox && oy ? 1.41 : 1)); }
    }
    for (let k = 0; k < G * G; k++) wg[k] = 1 + Math.min(4, wg[k] * span / G / 1500);
    const wAt = new Float32Array(N2); // per grid point (the points on the south and east edges take the last cell's)
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) wAt[r * n + c] = wg[Math.min(G - 1, r >> sh) * G + Math.min(G - 1, c >> sh)];
    let maxE = 1.2 * Math.max(1, ex / 3), nT = 0;
    const count = (ax, ay, bx, by, cx, cy) => {
      const mx = (ax + bx) >> 1, my = (ay + by) >> 1, mi = my * n + mx;
      if (Math.abs(ax - cx) + Math.abs(ay - cy) > 1 && err[mi] > maxE * wAt[mi]) { count(cx, cy, ax, ay, mx, my); count(bx, by, cx, cy, mx, my); } else nT++;
    };
    for (let tries = 0; tries < 12; tries++) { // a threshold that fills about half to all of the triangle budget
      nT = 0; count(0, 0, tile, tile, tile, 0); count(tile, tile, 0, 0, 0, tile);
      if (nT > m.budget) maxE *= Math.max(1.15, (nT / m.budget) ** .9);
      else if (nT < m.budget * .5 && tries < 4 && maxE > .05) maxE /= Math.max(1.15, (m.budget / nT) ** .6);
      else break;
    }
    const idx = new Uint32Array(nT * 3), idxOf = new Uint32Array(N2), xyz = []; let t = 0, nV = 0;
    const vert = (x, y) => { const k = y * n + x; if (!idxOf[k]) { idxOf[k] = ++nV; xyz.push((x / tile - .5) * span, H[k], (y / tile - .5) * span); } return idxOf[k] - 1; };
    const emit = (ax, ay, bx, by, cx, cy) => {
      const mx = (ax + bx) >> 1, my = (ay + by) >> 1, mi = my * n + mx;
      if (Math.abs(ax - cx) + Math.abs(ay - cy) > 1 && err[mi] > maxE * wAt[mi]) { emit(cx, cy, ax, ay, mx, my); emit(bx, by, cx, cy, mx, my); }
      else { idx[t++] = vert(ax, ay); idx[t++] = vert(bx, by); idx[t++] = vert(cx, cy); }
    };
    emit(0, 0, tile, tile, tile, 0); emit(tile, tile, 0, 0, 0, tile); lap('mesh');
    const coast = m.coast && m.part !== 'mesh' ? coastField(m.coast, span, m.coastC || 2048) : null; lap('coast');
    return { n, H, ex, theta, minH, maxH, pos: Float32Array.from(xyz), idx, aux, b, w, head, tris: nT, maxE, ms, coast };
  }
  function shade(H, n, sun, step, maxH, out, stride, off) { // the light at true scale for the sun (255 lit): every other point on fine grids; the rise ahead as a slope over the distance
    if (!sun || sun[1] <= .01) return;
    const sk = n > 600 ? 2 : 1, hz = Math.hypot(sun[0], sun[2]) || 1, dx = sun[0] / hz * sk, dz = sun[2] / hz * sk, rise = sun[1] / hz * step * sk, run = step * sk;
    for (let r = 0; r < n; r += sk) for (let c = 0; c < n; c += sk) {
      let worst = -1, x = c + .5, z = r + .5, y = Math.max(H[r * n + c], -60);
      for (let s = 1; s < 160; s++) {
        x += dx; z += dz; y += rise; if (x < 0 || z < 0 || x >= n || z >= n || y > maxH) break;
        const t = (H[(z | 0) * n + (x | 0)] - y) / (s * run); if (t > worst) worst = t;
      }
      const l = Math.round(255 * Math.min(1, Math.max(0, .5 - worst / .07)));
      for (let rr = r; rr < Math.min(n, r + sk); rr++) for (let cc = c; cc < Math.min(n, c + sk); cc++) out[(rr * n + cc) * stride + off] = l;
    }
  }
  function coastField(sg, span, C = 2048) {
    const ts = span / C, half = span / 2, R = 4 * ts, out = new Uint8Array(C * C), dist = new Float32Array(C * C).fill(R), ns = sg.length / 4;
    for (let q = 0; q < ns; q++) { // the distance near each segment (within R)
      const ax = sg[4 * q], az = sg[4 * q + 1], bx = sg[4 * q + 2], bz = sg[4 * q + 3], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1e-9;
      const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - R + half) / ts)), c1 = Math.min(C - 1, Math.ceil((Math.max(ax, bx) + R + half) / ts));
      const r0 = Math.max(0, Math.floor((Math.min(az, bz) - R + half) / ts)), r1 = Math.min(C - 1, Math.ceil((Math.max(az, bz) + R + half) / ts));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const x = (c + .5) * ts - half, z = (r + .5) * ts - half, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2)), dx = x - ax - t * ex, dz = z - az - t * ez, d = Math.sqrt(dx * dx + dz * dz), k = r * C + c;
        if (d < dist[k]) dist[k] = d;
      }
    }
    const rows = Array.from({ length: C }, () => []);
    for (let q = 0; q < ns; q++) { // where each segment crosses the rows' centres
      const ax = sg[4 * q], az = sg[4 * q + 1], bx = sg[4 * q + 2], bz = sg[4 * q + 3];
      for (let r = Math.max(0, Math.ceil((Math.min(az, bz) + half) / ts - .5)); r < C && (r + .5) * ts - half < Math.max(az, bz); r++) {
        const z = (r + .5) * ts - half; if ((az > z) !== (bz > z)) rows[r].push(ax + (z - az) / (bz - az) * (bx - ax));
      }
    }
    for (let r = 0; r < C; r++) { // land or sea: even-odd along each row
      const xs = rows[r].sort((p, q) => p - q);
      let j = 0, land = false;
      for (let c = 0; c < C; c++) {
        const x = (c + .5) * ts - half; while (j < xs.length && xs[j] < x) { land = !land; j++; }
        out[r * C + c] = Math.round(127.5 + (land ? -1 : 1) * dist[r * C + c] / R * 127.5);
      }
    }
    return out;
  }
  if (typeof window === 'undefined') self.onmessage = async e => {
    try {
      const r = await surface(e.data), t = r.light ? [r.light.buffer] : [r.H.buffer, r.pos.buffer, r.idx.buffer, r.aux.buffer];
      if (r.coast) t.push(r.coast.buffer);
      if (r.w) t.push(r.w.tk.buffer, r.w.txy.buffer, r.w.lights.buffer, ...['areas', 'rows', 'roads'].flatMap(k => [r.w[k].k.buffer, r.w[k].s.buffer, r.w[k].v.buffer]));
      if (r.b) t.push(r.b.k.buffer, r.b.h.buffer, r.b.c.buffer, r.b.s.buffer, r.b.v.buffer);
      self.postMessage(r, t);
    } catch (err) { self.postMessage({ error: String(err && err.message || err) }); }
  };
  else window.PsArea3DSurface = surface;
})();
