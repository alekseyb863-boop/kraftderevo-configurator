// Optional grey flat shading for a preview: the solid's mesh triangles (subdivided, painter's order by depth) are inserted into the SVG
// right after the white background; the black HLR line drawing stays on top.  d = buildDrawing() result ({ toPx, P2, N }).
export function shadeSvg(svg, solid, d, { maxEdge = 25, light = [-0.45, -0.6, 0.66] } = {}) {
  const m = solid.mesh({ tolerance: 0.05, angularTolerance: 0.05 }), V = (i) => [m.vertices[3 * i], m.vertices[3 * i + 1], m.vertices[3 * i + 2]];
  const sub = (a, b) => a.map((x, i) => x - b[i]), mid = (a, b) => a.map((x, i) => (x + b[i]) / 2), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(...a);
  const L = (() => { const n = len(light); return light.map((x) => x / n); })(), tris = [];
  const split = (a, b, c, nrm) => {
    const e = [len(sub(b, a)), len(sub(c, b)), len(sub(a, c))], mx = Math.max(...e);
    if (mx <= maxEdge) { tris.push([a, b, c, nrm]); return; }
    const i = e.indexOf(mx), [p, q, r] = i === 0 ? [a, b, c] : i === 1 ? [b, c, a] : [c, a, b], h = mid(p, q);
    split(p, h, r, nrm); split(h, q, r, nrm);
  };
  for (let t = 0; t < m.triangles.length; t += 3) {
    const a = V(m.triangles[t]), b = V(m.triangles[t + 1]), c = V(m.triangles[t + 2]), n = cross(sub(b, a), sub(c, a)), l = len(n);
    if (l < 1e-9) continue;
    const nn = n.map((x) => x / l);
    if (dot(nn, d.N) <= 1e-6) continue;                        // back-facing (closed solid): never visible
    split(a, b, c, nn);
  }
  tris.sort((x, y) => dot(d.N, x[0].map((v, i) => v + x[1][i] + x[2][i])) - dot(d.N, y[0].map((v, i) => v + y[1][i] + y[2][i])));   // far -> near
  const f = (v) => +v.toFixed(2), out = tris.map(([a, b, c, n]) => {
    const g = Math.round(150 + 85 * Math.max(0, Math.min(1, 0.45 + 0.55 * dot(n, L)))), col = `rgb(${g},${g},${g})`;
    return `<polygon points="${[a, b, c].map((p) => d.toPx(d.P2(...p)).map(f).join(",")).join(" ")}" fill="${col}" stroke="${col}" stroke-width="0.8" stroke-linejoin="round"/>`;
  });
  return svg.replace('<g id="geometry"', `<g id="shading">\n    ${out.join("\n    ")}\n  </g>\n  <g id="geometry"`);
}
