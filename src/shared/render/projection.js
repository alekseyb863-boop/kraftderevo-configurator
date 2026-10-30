// HLR projection (replicad drawProjection + ProjectionCamera), hidden lines removed, with self-validation of the 2D frame.
import * as R from "replicad";
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
/** returns { lines: polylines [[x,y]..] in screen mm (y up), P2, checks } */
export function projectSolid(solid, azDeg, elDeg) {
  const view = makeView(azDeg, elDeg), { N, RIGHT, P2 } = view;
  const camera = new R.ProjectionCamera(N.map((x) => x * 5000), N, RIGHT);
  const { visible, hidden } = R.drawProjection(solid, camera);
  let lines = drawingPolylines(visible);
  for (const d of [visible, hidden]) { try { d && d.delete(); } catch { /* already freed */ } }
  // reference projection of the true model vertices (mesh vertices of a polyhedron = its vertices)
  const m = solid.mesh({ tolerance: 0.1, angularTolerance: 0.1 }), ref = [];
  for (let i = 0; i < m.vertices.length; i += 3) ref.push(P2(m.vertices[i], m.vertices[i + 1], m.vertices[i + 2]));
  const ext = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  const rb = ext(ref), db = ext(lines.flat());
  const err = [rb[2] - rb[0] - (db[2] - db[0]), rb[3] - rb[1] - (db[3] - db[1])];
  const shift = [rb[0] - db[0], rb[1] - db[1]];
  lines = lines.map((pl) => pl.map((p) => [p[0] + shift[0], p[1] + shift[1]]));
  // mirror/orientation check: each extreme model vertex (min/max x, min/max y) must coincide with a visible line end point
  const ends = lines.flatMap((pl) => [pl[0], pl[pl.length - 1]]);
  const near = (q) => ends.some((e) => Math.hypot(e[0] - q[0], e[1] - q[1]) < 0.05);
  const extremeOK = [0, 1].every((c) => [Math.min(...ref.map((p) => p[c])), Math.max(...ref.map((p) => p[c]))]
    .every((v) => ref.filter((p) => Math.abs(p[c] - v) < 1e-6).some(near)));
  const checks = { extentErr: err.map((e) => +e.toFixed(4)), extremeVerticesMatch: extremeOK, lineCount: lines.length };
  if (Math.abs(err[0]) > 0.05 || Math.abs(err[1]) > 0.05 || !extremeOK) throw new Error("replicad projection does not match reference camera: " + JSON.stringify(checks));
  return { lines, P2, N, checks };
}
