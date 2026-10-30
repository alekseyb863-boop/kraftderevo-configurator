// Hidden-line treatment for dimension / extension lines: the parts of a 3D line that lie BEHIND the model's faces are not drawn.
// Orthographic projection: the model is tessellated, every triangle is projected to the screen (mm, y up) and keeps the depth (dot(N, p), larger = closer
// to the viewer).  For a dimension line given by its two 3D end points the visible parameter intervals are exactly computed (linear constraints), so the
// output stays vector (just fewer / shorter <line> elements).
export function makeOccluder(solid, P2, N, tolerance = 0.1) {
  const m = solid.mesh({ tolerance, angularTolerance: 0.1 }), V = m.vertices, tris = [];
  const dep = (i) => N[0] * V[3 * i] + N[1] * V[3 * i + 1] + N[2] * V[3 * i + 2];
  for (let k = 0; k < m.triangles.length; k += 3) {
    const ids = [m.triangles[k], m.triangles[k + 1], m.triangles[k + 2]];
    const p = ids.map((i) => P2(V[3 * i], V[3 * i + 1], V[3 * i + 2])), d = ids.map(dep);
    const det = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]);
    if (Math.abs(det) < 1e-9) continue;                                   // edge-on triangle: covers no area on the screen
    tris.push({ p, d, det, bb: [Math.min(p[0][0], p[1][0], p[2][0]), Math.min(p[0][1], p[1][1], p[2][1]), Math.max(p[0][0], p[1][0], p[2][0]), Math.max(p[0][1], p[1][1], p[2][1])] });
  }
  return { tris, N, depth: (q) => N[0] * q[0] + N[1] * q[1] + N[2] * q[2] };
}

/**
 * Visible sub-intervals of the segment S(t) = s + t (e - s), t in [t0, t1] (screen mm points s, e; ds, de = their depths; the line is parametrised linearly so
 * t may lie outside [0,1] for the extension parts).  Returns a list of [ta, tb].
 */
export function visibleIntervals(occ, s, e, ds, de, t0 = 0, t1 = 1, eps = 1) {
  if (!occ) return [[t0, t1]];
  const dx = e[0] - s[0], dy = e[1] - s[1], hidden = [];
  const sx0 = Math.min(s[0] + t0 * dx, s[0] + t1 * dx), sx1 = Math.max(s[0] + t0 * dx, s[0] + t1 * dx);
  const sy0 = Math.min(s[1] + t0 * dy, s[1] + t1 * dy), sy1 = Math.max(s[1] + t0 * dy, s[1] + t1 * dy);
  for (const T of occ.tris) {
    if (T.bb[2] < sx0 || T.bb[0] > sx1 || T.bb[3] < sy0 || T.bb[1] > sy1) continue;
    const [a, b, c] = T.p, [da, db, dc] = T.d;
    // barycentric coordinates of S(t): l_i(t) = A_i + B_i t (linear)
    const lam = (qx, qy, ax, ay, bx, by) => ((bx - ax) * (qy - ay) - (by - ay) * (qx - ax)) / T.det;     // area-ratio for the edge opposite the vertex
    const l0 = [lam(s[0], s[1], b[0], b[1], c[0], c[1]), lam(e[0], e[1], b[0], b[1], c[0], c[1])];
    const l1 = [lam(s[0], s[1], c[0], c[1], a[0], a[1]), lam(e[0], e[1], c[0], c[1], a[0], a[1])];
    const l2 = [lam(s[0], s[1], a[0], a[1], b[0], b[1]), lam(e[0], e[1], a[0], a[1], b[0], b[1])];
    // l_i(t) = lam(start) + t * (lam(end) - lam(start))  (the area ratio is affine in the point)
    const cons = [];                                                      // each: [A, B] meaning A + B t >= 0
    for (const l of [l0, l1, l2]) cons.push([l[0], l[1] - l[0]]);
    // depth of the triangle at S(t) minus depth of the line, minus eps
    const tdS = l0[0] * da + l1[0] * db + l2[0] * dc, tdE = l0[1] * da + l1[1] * db + l2[1] * dc;
    cons.push([tdS - ds - eps, (tdE - tdS) - (de - ds)]);
    let lo = t0, hi = t1, ok = true;
    for (const [A, B] of cons) {
      if (Math.abs(B) < 1e-12) { if (A < -1e-9) { ok = false; break; } continue; }
      const r = -A / B;
      if (B > 0) lo = Math.max(lo, r); else hi = Math.min(hi, r);
      if (lo >= hi) { ok = false; break; }
    }
    if (ok && hi - lo > 1e-9) hidden.push([lo, hi]);
  }
  hidden.sort((x, y) => x[0] - y[0]);
  const out = []; let cur = t0;
  for (const [lo, hi] of hidden) {
    if (lo > cur + 1e-9) out.push([cur, lo]);
    cur = Math.max(cur, hi);
  }
  if (cur < t1 - 1e-9) out.push([cur, t1]);
  return out;
}
