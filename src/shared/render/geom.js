// small 2D geometry helpers: segment/rectangle intersection etc.
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const norm = (a) => Math.hypot(a[0], a[1]);

function orient(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
export function segSeg(p1, p2, p3, p4) {
  const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2), d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)) && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0
    || [d1, d2, d3, d4].some((d) => d === 0) && onSegTouch(p1, p2, p3, p4);
}
function onSeg(a, b, p) {
  return Math.min(a[0], b[0]) - 1e-9 <= p[0] && p[0] <= Math.max(a[0], b[0]) + 1e-9 &&
    Math.min(a[1], b[1]) - 1e-9 <= p[1] && p[1] <= Math.max(a[1], b[1]) + 1e-9;
}
function onSegTouch(p1, p2, p3, p4) {
  return (orient(p3, p4, p1) === 0 && onSeg(p3, p4, p1)) || (orient(p3, p4, p2) === 0 && onSeg(p3, p4, p2)) ||
    (orient(p1, p2, p3) === 0 && onSeg(p1, p2, p3)) || (orient(p1, p2, p4) === 0 && onSeg(p1, p2, p4));
}
// axis-aligned rectangle r = {x0,y0,x1,y1}; does segment a-b touch it?
export function segRect(a, b, r) {
  const inside = (p) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1;
  if (inside(a) || inside(b)) return true;
  const c = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
  for (let i = 0; i < 4; i++) if (segSeg(a, b, c[i], c[(i + 1) % 4])) return true;
  return false;
}
export const inflate = (r, m) => ({ x0: r.x0 - m, y0: r.y0 - m, x1: r.x1 + m, y1: r.y1 + m });
// convex polygon -> list of edge segments
export function polyEdges(pts) { return pts.map((p, i) => [p, pts[(i + 1) % pts.length]]); }

// ---- convex polygon helpers (rotated dimension label boxes) ----
export function pointInConvex(p, poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (c !== 0) { if (s !== 0 && Math.sign(c) !== s) return false; s = Math.sign(c); }
  }
  return true;
}
export function segPoly(a, b, poly) {
  if (pointInConvex(a, poly) || pointInConvex(b, poly)) return true;
  return polyEdges(poly).some(([c, d]) => segSeg(a, b, c, d));
}
export function polyRect(poly, r) {
  if (polyEdges(poly).some(([a, b]) => segRect(a, b, r))) return true;
  return [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].some((p) => pointInConvex(p, poly));
}
export const rectsOverlap = (a, b) => !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
