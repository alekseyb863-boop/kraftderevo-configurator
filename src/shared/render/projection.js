// HLR projection (replicad drawProjection + ProjectionCamera), hidden lines removed, with self-validation of the 2D frame.
import * as R from "replicad";
import { makeOccluder } from "./occlude.js";
const nrm = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** same camera as the Python renderers: azimuth/elevation of the viewer, Z up, screen x right. */
export function makeView(azDeg, elDeg) {
  const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
  const N = nrm([Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el)]);   // towards the viewer
  const RIGHT = nrm(cross([0, 0, 1], N)), UP = cross(N, RIGHT);
  return { N, RIGHT, UP, P2: (x, y, z) => [dot(RIGHT, [x, y, z]), dot(UP, [x, y, z])] };
}
function drawingPolylines(drawing) {
  const out = [], bps = drawing.innerShape.blueprints || [drawing.innerShape];
  for (const bp of bps) for (const c of bp.curves) {
    if (c.geomType === "LINE") out.push([c.firstPoint, c.lastPoint]);
    else { const a = c.firstParameter, b = c.lastParameter, pl = []; for (let i = 0; i <= 48; i++) pl.push(c.value(a + ((b - a) * i) / 48)); out.push(pl); }
  }
  return out;
}
const edgePolyline = (e) => {
  if (e.geomType === "LINE") { const a = e.startPoint, b = e.endPoint; return [[a.x, a.y], [b.x, b.y]]; }
  const pl = []; for (let i = 0; i <= 48; i++) { const q = e.pointAt(i / 48); pl.push([q.x, q.y]); } return pl;
};
const inHull = (H) => (q) => { let s = 0; for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length], c = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]); if (c) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } } return true; };
const hull2 = (P) => { P = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of P.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)]; };
/** returns { lines: polylines [[x,y]..] in screen mm (y up), P2, checks }
 *  hlr (опц.): { smooth: false — не рисовать гладкие (касательные) рёбра; dropSharpIn: [[x0,y0,z0],[x1,y1,z1]] — убрать острые рёбра (линии пересечений),
 *  целиком попадающие в проекцию этого 3D-бокса }. Силуэтные контуры (outline) остаются всегда. */
export function projectSolid(solid, azDeg, elDeg, hlr = null) {
  const view = makeView(azDeg, elDeg), { N, RIGHT, P2 } = view;
  const camera = new R.ProjectionCamera(N.map((x) => x * 5000), N, RIGHT);
  let lines, sharp = null;
  if (!hlr || (hlr.smooth !== false && !hlr.dropSharpIn && !hlr.dropEdges)) {                                 // hlr только с occTol — обычная проекция
    const { visible, hidden } = R.drawProjection(solid, camera);
    lines = drawingPolylines(visible);
    for (const d of [visible, hidden]) { try { d && d.delete(); } catch { /* already freed */ } }
  } else {
    const oc = R.getOC(), hl = new oc.HLRBRep_Algo(); hl.Add(solid.wrapped, 0);
    const pj = new oc.HLRAlgo_Projector(camera.wrapped); hl.Projector(pj); hl.Update(); hl.Hide();
    const h = new oc.HLRBRep_HLRToShape(hl), get = (sh) => (sh.IsNull() ? [] : R.cast(sh).edges);
    const conv = (es) => es.map((e) => { oc.BRepLib.BuildCurves3d(e.wrapped); return edgePolyline(e); });
    sharp = conv(get(h.VCompound()));
    lines = [...(hlr.smooth === false ? [] : conv(get(h.Rg1LineVCompound()))), ...conv(get(h.OutLineVCompound()))];
    for (const o of [h, pj, hl]) { try { o.delete(); } catch { /* ok */ } }
  }
  if (sharp) { lines = [...sharp, ...lines]; }
  let nSharp = sharp ? sharp.length : 0;                                                 // острые рёбра идут первыми в lines
  // reference projection of the true model vertices (mesh vertices of a polyhedron = its vertices)
  const m = solid.mesh({ tolerance: 0.1, angularTolerance: 0.1 }), ref = [];
  for (let i = 0; i < m.vertices.length; i += 3) ref.push(P2(m.vertices[i], m.vertices[i + 1], m.vertices[i + 2]));
  const ext = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  const rb = ext(ref), db = ext(lines.flat());
  const err = [rb[2] - rb[0] - (db[2] - db[0]), rb[3] - rb[1] - (db[3] - db[1])];
  const shift = [rb[0] - db[0], rb[1] - db[1]];
  lines = lines.map((pl) => pl.map((p) => [p[0] + shift[0], p[1] + shift[1]]));
  if (sharp && hlr.dropSharpIn) {                                                       // острые рёбра внутри зоны — убрать (силуэты не трогаем)
    // один бокс [[x0,y0,z0],[x1,y1,z1]] или список боксов
    const boxes = Array.isArray(hlr.dropSharpIn[0][0]) ? hlr.dropSharpIn : [hlr.dropSharpIn];
    const ins = boxes.map(([a, b]) => inHull(hull2([0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => P2(i ? b[0] : a[0], j ? b[1] : a[1], k ? b[2] : a[2])))))));
    const keep = lines.map((pl, i) => i >= sharp.length || !ins.some((inside) => pl.every(inside)));
    nSharp = keep.slice(0, sharp.length).filter(Boolean).length;
    lines = lines.filter((_, i) => keep[i]);
  }
  if (sharp && hlr.dropEdges) {
    // dropEdges: [{ a, b, n1, n2 }] — 3D-рёбра (вертикали живой кромки) между почти касательными гранями: не рисовать,
    // если обе грани смотрят в одну сторону (не силуэт); линия убирается, только если целиком лежит на проекции ребра
    const dot = (n) => n[0] * N[0] + n[1] * N[1] + n[2] * N[2];
    const segs = hlr.dropEdges.filter((e) => (dot(e.n1) > 0) === (dot(e.n2) > 0)).map((e) => [P2(...e.a), P2(...e.b)]);
    const dseg = (q, [a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0; return Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]); };
    lines = lines.filter((pl, i) => i >= nSharp || !segs.some((sg) => pl.every((q) => dseg(q, sg) < 0.05)));
  }
  // mirror/orientation check: each extreme model vertex (min/max x, min/max y) must coincide with a visible line end point
  const ends = lines.flatMap((pl) => [pl[0], pl[pl.length - 1]]);
  // curved edges (e.g. cylinders) are sampled polylines: an extreme mesh vertex on a circle lies on the curve, not at its end point
  const segD = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0; return Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]); };
  const curves = lines.filter((pl) => pl.length > 2);
  const onCurve = (q) => curves.some((pl) => pl.some((p, i) => i > 0 && segD(q, pl[i - 1], p) < 0.2));
  const near = (q) => ends.some((e) => Math.hypot(e[0] - q[0], e[1] - q[1]) < 0.05) || onCurve(q);
  const extremeOK = [0, 1].every((c) => [Math.min(...ref.map((p) => p[c])), Math.max(...ref.map((p) => p[c]))]
    .every((v) => ref.filter((p) => Math.abs(p[c] - v) < 1e-6).some(near)));
  const checks = { extentErr: err.map((e) => +e.toFixed(4)), extremeVerticesMatch: extremeOK, lineCount: lines.length };
  // curved edges are drawn as 48-point polylines and the reference mesh is tessellated (0.1 mm): their extents may differ by a fraction of a mm
  const tolE = curves.length ? 1 : 0.05;
  if (Math.abs(err[0]) > tolE || Math.abs(err[1]) > tolE || !extremeOK) throw new Error("replicad projection does not match reference camera: " + JSON.stringify(checks));
  return { lines, P2, N, checks, occ: makeOccluder(solid, P2, N, (hlr && hlr.occTol) || 0.1, !!(hlr && hlr.occTol)) };
}
