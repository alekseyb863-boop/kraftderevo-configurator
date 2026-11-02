// Shared geometry for the kraftderevo previews (replicad).  Frame plane = XZ, depth = +Y, mm, Z up.
// Port of forms/kdlib.py (prism / box / inner_polygon / frame) + fuse + validity checks.
import * as R from "replicad";
import { getOC } from "replicad";

/** Extrude polygon pts=[[x,z],...] (plane XZ) over y0..y1. */
export function prism(pts, y0, y1) {
  // replicad plane "XZ" has local x = X, local y = Z and normal = -Y, so extrude(h) goes towards -Y.
  let d = R.draw(pts[0]);
  for (const p of pts.slice(1)) d = d.lineTo(p);
  return d.close().sketchOnPlane("XZ").extrude(y1 - y0).translate([0, y1, 0]);
}
/** Axis-aligned box (profile block) x0..x1, y0..y1, z0..z1. */
export const box = (x0, x1, y0, y1, z0, z1) => prism([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1);

function inter([p, d], [q, e]) {            // intersection of lines p+t d and q+s e
  const det = d[0] * -e[1] - -e[0] * d[1];
  const rx = q[0] - p[0], ry = q[1] - p[1];
  const t = (rx * -e[1] - -e[0] * ry) / det;
  return [p[0] + t * d[0], p[1] + t * d[1]];
}
/**
 * Corner-joint rule: the outer contour is a sharp polygon (like a bent strip); every member's inner face is the outer
 * edge offset inwards by its thickness; inner faces of neighbouring members meet along ONE line (no steps).
 * thick[i] = thickness of the member along edge i (pts[i] -> pts[i+1], polygon CCW); open edges = member absent.
 */
export function innerPolygon(outer, thick, openEdges = []) {
  const n = outer.length, lines = [];
  for (let i = 0; i < n; i++) {
    const a = outer[i], b = outer[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], nr = [-d[1], d[0]];
    const t = openEdges.includes(i) ? -400 : thick[i];
    lines.push([[a[0] + nr[0] * t, a[1] + nr[1] * t], d]);
  }
  return outer.map((_, i) => inter(lines[(i + n - 1) % n], lines[i]));
}
/** Bent-strip-like frame = outer prism minus inner prism.  Outer corners sharp, nothing protrudes. */
export function frame(outer, thick, y0, y1, openEdges = []) {
  const o = prism(outer, y0, y1);
  const inn = prism(innerPolygon(outer, thick, openEdges), y0 - 1, y1 + 1);
  const r = o.cut(inn);
  free(o, inn);
  return r;
}
/** release WASM memory of intermediate shapes (safe to call twice) */
export function free(...shapes) { for (const s of shapes.flat()) { try { s && s.delete(); } catch { /* already freed */ } } }
/** Fuse all parts into ONE solid and merge coplanar faces (= CadQuery union().clean()) -> no seam lines. */
export function fuseAll(parts) {
  let u = null;
  for (const p of parts) { if (!u) { u = p; continue; } const n = u.fuse(p); free(u, p); u = n; }
  const r = u.simplify();
  free(u);
  return r;
}
/** Solve f(a)=0 on [lo,hi] by bisection (replaces scipy brentq). */
export function bisect(f, lo, hi, it = 200) {
  let flo = f(lo);
  for (let i = 0; i < it; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m; }
  return (lo + hi) / 2;
}

/** Verification: one solid, valid, closed (watertight 2-manifold mesh), bbox == intended size. */
export function checkSolid(name, shape, expectBBox, tol = 0.01) {
  const oc = getOC();
  const res = { name, solids: shape.solids.length, faces: shape.faces.length };
  res.shapeType = shape.wrapped.ShapeType ? String(shape.wrapped.ShapeType().value ?? shape.wrapped.ShapeType()) : "n/a";
  try { res.occValid = new oc.BRepCheck_Analyzer(shape.wrapped, true).IsValid(); } catch (e) { res.occValid = "n/a: " + e.message; }
  try {
    const ex = new oc.TopExp_Explorer(shape.wrapped, oc.TopAbs_ShapeEnum.TopAbs_SHELL, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    let n = 0, closed = true; for (; ex.More(); ex.Next()) { n++; const sh = oc.TopoDS.Shell(ex.Current()); closed = closed && oc.BRep_Tool.IsClosed(sh); }
    res.shells = n; res.shellClosed = closed;
  } catch (e) { res.shells = "n/a: " + e.message; }
  res.volume = R.measureVolume(shape);
  // watertight mesh: weld vertices, every edge shared by exactly two triangles with opposite orientation
  const m = shape.mesh({ tolerance: 0.1, angularTolerance: 0.1 });
  const key = new Map(), idx = (i) => { const k = [0, 1, 2].map((c) => Math.round(m.vertices[3 * i + c] * 1e3)).join(","); if (!key.has(k)) key.set(k, key.size); return key.get(k); };
  const edges = new Map(); let bad = 0;
  for (let t = 0; t < m.triangles.length; t += 3) {
    const v = [idx(m.triangles[t]), idx(m.triangles[t + 1]), idx(m.triangles[t + 2])];
    for (let k = 0; k < 3; k++) { const a = v[k], b = v[(k + 1) % 3]; if (a === b) continue; const e = a + ">" + b; edges.set(e, (edges.get(e) || 0) + 1); }
  }
  for (const [e, c] of edges) { const [a, b] = e.split(">"); if (c !== 1 || edges.get(b + ">" + a) !== 1) bad++; }
  res.meshTriangles = m.triangles.length / 3; res.meshVertices = key.size; res.meshBadEdges = bad;
  res.meshEuler = key.size - edges.size / 2 + m.triangles.length / 3;       // V - E + F  (2 for a genus-0 solid)
  res.watertight = bad === 0;
  const bb = shape.boundingBox, size = [bb.bounds[1][0] - bb.bounds[0][0], bb.bounds[1][1] - bb.bounds[0][1], bb.bounds[1][2] - bb.bounds[0][2]];
  res.bbox = size.map((v) => +v.toFixed(4)); res.bboxMin = bb.bounds[0].map((v) => +v.toFixed(3));
  res.bboxOK = expectBBox ? size.every((v, i) => Math.abs(v - expectBBox[i]) <= tol) : null;
  res.ok = res.solids === 1 && res.watertight && res.bboxOK !== false && res.occValid === true && res.shellClosed !== false;
  return res;
}

/** Сборка из нескольких тел, которые касаются только в точках (не сливаются): один compound; исходные тела остаются живыми (берутся копии). */
export function assemble(parts) { return R.makeCompound(parts.map((s) => s.clone())); }
/**
 * Проверка сборки из отдельных тел: каждое тело валидно (1 solid, OCC-valid, замкнутая оболочка, герметичная сетка), габарит объединения == ожидаемому,
 * попарные объёмы пересечения ~ 0.  Поля как у checkSolid (solids = число тел), плюс maxPairVolume.
 */
export function checkAssembly(name, parts, expectBBox, tol = 0.01) {
  const per = parts.map((s, i) => checkSolid(name + "#" + (i + 1), s, null));
  const lo = [0, 1, 2].map((k) => Math.min(...parts.map((s) => s.boundingBox.bounds[0][k]))), hi = [0, 1, 2].map((k) => Math.max(...parts.map((s) => s.boundingBox.bounds[1][k])));
  let maxPairVolume = 0;
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    let v = 0; try { const c = parts[i].intersect(parts[j]); v = c ? Math.abs(R.measureVolume(c)) : 0; free(c); } catch { v = Infinity; }
    maxPairVolume = Math.max(maxPairVolume, v);
  }
  const size = hi.map((v, k) => v - lo[k]);
  const res = { name, solids: parts.length, faces: per.reduce((s, c) => s + c.faces, 0), occValid: per.every((c) => c.occValid === true), shellClosed: per.every((c) => c.shellClosed !== false),
    watertight: per.every((c) => c.watertight), volume: per.reduce((s, c) => s + c.volume, 0), maxPairVolume, perPartOK: per.every((c) => c.ok) };
  res.bbox = size.map((v) => +v.toFixed(4)); res.bboxMin = lo.map((v) => +v.toFixed(3));
  res.bboxOK = expectBBox ? size.every((v, i) => Math.abs(v - expectBBox[i]) <= tol) : null;
  res.ok = res.perPartOK && res.bboxOK !== false && maxPairVolume < 1e-3;
  return res;
}
