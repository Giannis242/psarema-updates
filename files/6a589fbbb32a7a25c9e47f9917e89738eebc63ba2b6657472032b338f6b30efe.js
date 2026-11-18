'use strict';
// Psarema round 17 day map, phase 2 (agent D): the sea worker (driven by js/seastate.js). It works out the waves at every sea cell for one
// hour (PsSea.at, the same pure function the page has) off the page's thread, and answers with a band per cell and, when asked, the layer's
// picture. It fetches data/exposure.bin itself; the page sends only small things. No DOM, no core.js: the bilinear weights between the
// forecast's nodes are worked out here per column and row (core.js bi / bx / by give the same numbers).
// Messages: init { grid constants, mask (1 = scoring sea), mrow (image row -> grid row), colors, limits }   F { at, T, wave, swell, swellDir, u, v, wx, wy }
//           { h, at, bmp } -> { h, at, a: Uint8Array(N) of bands (255 = land), bmp: ImageBitmap or null, ms }
self.window = self;
importScripts('seastate.js');
let G = null, Fc = null, grid = null, cc, cf, rr, rf;
onmessage = async ({ data: m }) => {
  if (m.init) {
    G = m.init; Object.assign(self, { W: G.W, H: G.H, N: G.N, NN: G.NN });
    grid = PsSea.load('../data/exposure.bin');
    cc = new Int32Array(G.W); cf = new Float64Array(G.W); rr = new Int32Array(G.H); rf = new Float64Array(G.H);
    for (let x = 0; x < G.W; x++) { const g = Math.min(Math.max((G.WEST + (x + .5) * G.RES - G.lon0) / G.step, 0), G.nx - 1.0001); cc[x] = Math.floor(g); cf[x] = g - cc[x]; }
    for (let y = 0; y < G.H; y++) { const g = Math.min(Math.max((G.NORTH - (y + .5) * G.RES - G.lat0) / G.step, 0), G.ny - 1.0001); rr[y] = Math.floor(g); rf[y] = g - rr[y]; }
  }
  if (m.F) Fc = m.F;
  if (m.h >= 0) try {
    const E = await grid, F = Fc; if (!F || F.at !== m.at) return; // a forecast that has gone: the page asks again
    const t = performance.now(), { W, H, N, NN, nx, mask, limits } = G, S = PsSea.fields(F), b = m.h * NN, a = new Uint8Array(N).fill(255), o = new Float64Array(4);
    const fw = F.wave, fu = F.u, fv = F.v, sw = S.sw, sx = S.sx, sy = S.sy;
    for (let y = 0; y < H; y++) {
      const fy = rf[y], gy = 1 - fy, r0 = b + rr[y] * nx;
      for (let x = 0, i = y * W; x < W; x++, i++) {
        if (!mask[i]) continue;
        const k = r0 + cc[x], fx = cf[x], gx = 1 - fx, w00 = gx * gy, w10 = fx * gy, w01 = gx * fy, w11 = fx * fy;
        const bl = q => q[k] * w00 + q[k + 1] * w10 + q[k + nx] * w01 + q[k + nx + 1] * w11;
        const wv = PsSea.at(E, N, i, bl(fw), bl(sw), bl(sx), bl(sy), bl(fu), bl(fv), o);
        let c = 0; while (wv >= limits[c]) c++;
        a[i] = c;
      }
    }
    let bmp = null;
    if (m.bmp && G.mrow && self.createImageBitmap) {
      const p = new Uint32Array(W * H), col = G.colors;
      for (let y = 0; y < H; y++) for (let x = 0, r = G.mrow[y] * W, q = y * W; x < W; x++) { const c = a[r + x]; if (c < 5) p[q + x] = col[c]; }
      bmp = await createImageBitmap(new ImageData(new Uint8ClampedArray(p.buffer), W, H));
    }
    postMessage({ h: m.h, at: m.at, a, bmp, ms: performance.now() - t }, bmp ? [a.buffer, bmp] : [a.buffer]);
  } catch (e) { postMessage({ h: m.h, at: m.at, fail: e.message || 'failed' }); }
};
