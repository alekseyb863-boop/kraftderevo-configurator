// Geometric overlap check: every text rectangle (+margin) against every drawn segment / label box (not by pixels).
import { segRect, inflate, segPoly, polyRect, polyEdges, rectsOverlap } from "./geom.js";
/**
 * geom: array of px polylines; dims: array of buildDim results; header: array of items with .rect
 * returns { ok, margin, hdrVsLines, hdrVsDimSegs, hdrVsLabels, labelVsGeom, labelVsOtherDims, labelVsLabel, hdrVsHdr, inside, minClearance }
 */
export function overlapCheck({ geom, dims, header, W, H, margin = 8 }) {
  const gSegs = []; for (const pl of geom) for (let i = 0; i < pl.length - 1; i++) gSegs.push([pl[i], pl[i + 1]]);
  const dSegs = dims.flatMap((d) => [...d.ext, ...d.line, ...d.arrows]);
  const r = { margin, segments: gSegs.length + dSegs.length, hdrVsLines: 0, hdrVsDimSegs: 0, hdrVsLabels: 0, labelVsGeom: 0, labelVsOtherDims: 0, labelVsLabel: 0, hdrVsHdr: 0, outside: [] };
  const bad = [];
  for (const it of header) {
    const q = inflate(it.rect, margin);
    r.hdrVsLines += gSegs.filter(([a, b]) => segRect(a, b, q)).length;
    r.hdrVsDimSegs += dSegs.filter(([a, b]) => segRect(a, b, q)).length;
    r.hdrVsLabels += dims.filter((d) => polyRect(d.label.poly, q)).length;
    if (r.hdrVsLines + r.hdrVsDimSegs + r.hdrVsLabels) bad.push(it.t);
    for (const o of header) if (o !== it && rectsOverlap(it.rect, o.rect)) r.hdrVsHdr++;
    const c = [it.rect.x0, it.rect.y0, it.rect.x1, it.rect.y1];
    if (c[0] < 0 || c[1] < 0 || c[2] > W || c[3] > H) r.outside.push(it.t);
  }
  dims.forEach((d, i) => {
    const poly = d.label.poly;
    r.labelVsGeom += gSegs.filter(([a, b]) => segPoly(a, b, poly)).length;
    const own = new Set([...d.line, ...d.arrows]);
    r.labelVsOtherDims += dSegs.filter((s) => !own.has(s)).filter(([a, b]) => segPoly(a, b, poly)).length;
    dims.forEach((o, j) => { if (j > i && polyRect(poly, { x0: Math.min(...o.label.poly.map((p) => p[0])), x1: Math.max(...o.label.poly.map((p) => p[0])), y0: Math.min(...o.label.poly.map((p) => p[1])), y1: Math.max(...o.label.poly.map((p) => p[1])) })) r.labelVsLabel++; });
    for (const p of [...poly, ...d.ends]) if (p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H) r.outside.push("dim:" + d.label.text);
  });
  r.violatingLines = bad;
  r.ok = !(r.hdrVsLines || r.hdrVsDimSegs || r.hdrVsLabels || r.labelVsGeom || r.labelVsOtherDims || r.labelVsLabel || r.hdrVsHdr || r.outside.length);
  return r;
}
