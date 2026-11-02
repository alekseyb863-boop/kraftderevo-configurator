// Isometric projection drawing (browser-safe, no fs): replicad HLR projection + dimensions + top-left text block -> SVG string,
// with the geometric text-overlap check and an automatic layout adjustment (label shifts, dimension offsets, other layout, shrink).
import { projectSolid } from "./projection.js";
import { buildDim, pt } from "./dimensions.js";
import { layoutTextBlock, textSvg } from "./text.js";
import { overlapCheck } from "./overlap.js";
export { dim, dimAB } from "./dimhelpers.js";

const ext = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];

// ---- the three layouts of the Python originals ----
// "forms": forms/kdrender.py (1200x1400, fit to the free region below the header)
// "leg":   0090/0011 reference render script (render_*.py) (1200x1400, fixed margins, drawing at the bottom)
// "table": H098 reference render script (render_*.py) (1600x1000, equal-aspect axes with fixed data margins)
// opt.shrink (<=1) additionally scales the drawing down about the centre of its free region (used by the auto-adjust).
export const LAYOUTS = {
  forms(lines, dimPts, nText, opt = {}) {
    const W = 1200, H = 1400, shrink = opt.shrink ?? 1;
    const hdr = nText > 1 ? 36 + 52 + (nText - 2) * 40 + 50 : 100;
    const all = [...lines.flat(), ...dimPts], [xmin, ymin, xmax, ymax] = ext(all);
    const padx = 120, padb = 90, padt = 25;
    const px = Math.min((W - 2 * padx) / (xmax - xmin), (H - hdr - padb - padt) / (ymax - ymin)) * shrink;
    const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2, regCy = padb + (H - hdr - padb - padt) / 2;
    const X0 = cx - W / 2 / px, Y0 = cy - regCy / px, Y1 = Y0 + H / px;
    return { W, H, scale: px, toPx: (p) => [(p[0] - X0) * px, (Y1 - p[1]) * px],
      style: { geomLW: pt(1.8), dimLW: pt(0.9), fs: 16, extGap: (L, s) => Math.min(24 / s, L * 0.25), extOver: (s) => 14 / s,
        sizes: [30, 17], pos: (i) => ({ x: 30, top: 36 + (i === 0 ? 0 : 52 + (i - 1) * 40) }) } };
  },
  // "wide": как "forms", но страница 1600×1000 (альбомная) — для длинных фигур (Тумба кух.)
  wide(lines, dimPts, nText, opt = {}) {
    const W = 1600, H = 1000, shrink = opt.shrink ?? 1;
    const hdr = nText > 1 ? 36 + 52 + (nText - 2) * 40 + 50 : 100;
    const all = [...lines.flat(), ...dimPts], [xmin, ymin, xmax, ymax] = ext(all);
    const padx = 90, padb = 50, padt = 15;
    const px = Math.min((W - 2 * padx) / (xmax - xmin), (H - hdr - padb - padt) / (ymax - ymin)) * shrink;
    const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2, regCy = padb + (H - hdr - padb - padt) / 2;
    const X0 = cx - W / 2 / px, Y0 = cy - regCy / px, Y1 = Y0 + H / px;
    return { W, H, scale: px, toPx: (p) => [(p[0] - X0) * px, (Y1 - p[1]) * px],
      style: { geomLW: pt(1.8), dimLW: pt(0.9), fs: 16, extGap: (L, s) => Math.min(24 / s, L * 0.25), extOver: (s) => 14 / s,
        sizes: [30, 17], pos: (i) => ({ x: 30, top: 36 + (i === 0 ? 0 : 52 + (i - 1) * 40) }) } };
  },
  leg(lines, dimPts, nText, opt = {}) {
    const W = 1200, H = 1400, [xmin, ymin, xmax, ymax] = ext(lines.flat()), cx = (xmin + xmax) / 2, mx = 150, mb = 150, shrink = opt.shrink ?? 1;
    const px = Math.min(W / (xmax - xmin + 2 * mx), (H - 315 - 20) / (ymax - ymin + mb)) * shrink;
    const Y0 = ymin - mb - 20 / px, Y1 = Y0 + H / px, X0 = cx - W / px / 2;
    return { W, H, scale: px, toPx: (p) => [(p[0] - X0) * px, (Y1 - p[1]) * px],
      style: { geomLW: pt(1.8), dimLW: pt(0.9), fs: 16, extGap: (L) => Math.min(25, L * 0.2), extOver: () => 30,
        sizes: [26, 17], pos: (i) => ({ x: 30, top: 35 + (i === 0 ? 0 : 50 + (i - 1) * 42) }) } };
  },
  table(lines, dimPts, nText, opt = {}) {
    const W = 1600, H = 1000, [xmin, ymin, xmax, ymax] = ext(lines.flat()), shrink = opt.shrink ?? 1;
    const X0 = xmin - 300, X1 = xmax + 250, Y0 = ymin - 250, Y1 = ymax + 330;
    const sc = Math.min(W / (X1 - X0), H / (Y1 - Y0)) * shrink, offx = (W - (X1 - X0) * sc) / 2, offy = (H - (Y1 - Y0) * sc) / 2;
    const toPx = (p) => [(p[0] - X0) * sc + offx, (Y1 - p[1]) * sc + offy];
    return { W, H, scale: sc, toPx,
      style: { geomLW: pt(1.5), dimLW: pt(0.9), fs: 15, extGap: (L) => Math.min(60, L * 0.2), extOver: () => 40,
        sizes: [22, 15], pos: (i) => { const [x, top] = toPx([X0 + 40, Y1 - 45 - i * 62]); return { x, top }; } } };
  },
};

const score = (r) => r.hdrVsLines + r.hdrVsDimSegs + r.hdrVsLabels + r.labelVsGeom + r.labelVsOtherDims + r.labelVsLabel + r.hdrVsHdr + r.outside.length;
const f2 = (v) => +v.toFixed(2);

export function svgString({ W, H, style, geom, built, header, extra = [], marks = [] }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fff"/>
  <g id="geometry" fill="none" stroke="#000" stroke-width="${f2(style.geomLW)}" stroke-linecap="round" stroke-linejoin="round">
    ${geom.map((pl) => `<polyline points="${pl.map((p) => f2(p[0]) + "," + f2(p[1])).join(" ")}"/>`).join("\n    ")}
  </g>
${extra.length ? `  <g id="box" fill="none" stroke="#000" stroke-width="${f2(pt(0.7))}" stroke-linecap="round">
    ${extra.map((pl) => `<polyline points="${pl.map((p) => f2(p[0]) + "," + f2(p[1])).join(" ")}"/>`).join("\n    ")}
  </g>
` : ""}${marks.length ? `  <g id="holes" fill="none" stroke="#000" stroke-width="${f2(style.geomLW * 0.6)}" stroke-linecap="round" stroke-linejoin="round">
    ${marks.map((pl) => `<polyline points="${pl.map((p) => f2(p[0]) + "," + f2(p[1])).join(" ")}"/>`).join("\n    ")}
  </g>
` : ""}  <g id="dimensions" fill="#000" stroke="#000" stroke-width="${f2(style.dimLW)}" stroke-linecap="butt">
    ${built.flatMap((b) => b.svg).join("\n    ")}
  </g>
  <g id="info" fill="#000" stroke="none">
    ${textSvg(header)}
  </g>
</svg>
`;
}

/**
 * solid, view {az,el}, layout name, makeDims(k) -> dims (k = offset multiplier), textLines.
 * auto=false -> exactly one pass with the reference layout (what build.js uses so previews stay identical).
 * returns { svg, W, H, check, projection, header, adjust }
 */
export function buildDrawing({ solid, view, layout, makeDims, textLines, auto = true, margin = 8, extra = [], marks = [], soft = false }) {
  const proj = projectSolid(solid, view.az, view.el);
  const attempt = (layoutName, k, shrink, search) => {
    const dims = makeDims(k);
    const dimPts = [...dims.flatMap((d) => [proj.P2(...d.a), proj.P2(...d.b)]), ...extra.flatMap(([a, b]) => [proj.P2(...a), proj.P2(...b)]), ...marks.flat().map((q) => proj.P2(...q))];
    const L = LAYOUTS[layoutName](proj.lines, dimPts, textLines.length, { shrink }), { W, H, toPx, style } = L;
    const geom = proj.lines.map((pl) => pl.map(toPx)), extraPx = extra.map(([a, b]) => [toPx(proj.P2(...a)), toPx(proj.P2(...b))]), marksPx = marks.map((pl) => pl.map((q) => toPx(proj.P2(...q)))), geomAll = [...geom, ...extraPx, ...marksPx];
    const header = layoutTextBlock(textLines, style);
    const shifts = dims.map((d) => d.shift || 0);
    const build = () => dims.map((d, i) => buildDim({ ...d, shift: shifts[i] }, { P2: proj.P2, toPx, scale: L.scale, style, occ: proj.occ }));
    const run = () => { const built = build(); return { built, check: overlapCheck({ geom: geomAll, dims: built, header, W, H, margin }) }; };
    let cur = run();
    // part of the score that moving the labels can never change (header vs geometry / dimension lines / header, header outside the page)
    const fixed = (c) => c.hdrVsLines + c.hdrVsDimSegs + c.hdrVsHdr + c.outside.filter((o) => !o.startsWith("dim:")).length;
    const finish = () => {
    if (search && !cur.check.ok) {
      // coordinate descent: slide every dimension label along its line to the position with the fewest conflicts
      for (let pass = 0; pass < 3 && !cur.check.ok; pass++) {
        let improved = false;
        dims.forEach((d, i) => {
          const base = d.shift || 0, a = toPx(proj.P2(...d.a)), b = toPx(proj.P2(...d.b)), Ln = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const range = Ln / 2 + 120, cands = [shifts[i]];
          for (let s = 0; s <= range * 2; s += 12) { cands.push(base + s, base - s); }
          let best = score(cur.check), bestS = shifts[i];
          for (const s of cands) {
            if (s === shifts[i]) continue;
            const old = shifts[i]; shifts[i] = s; const r = run(), sc = score(r.check); shifts[i] = old;
            if (sc < best) { best = sc; bestS = s; cur = r; if (sc === 0) break; }
          }
          if (bestS !== shifts[i]) { shifts[i] = bestS; improved = true; }
          cur = run();
        });
        if (!improved) break;
      }
    }
    return { ...cur, geom, extra: extraPx, marks: marksPx, header, W, H, style, toPx, layoutName, k, shrink, shifts, sc: score(cur.check) };
    };
    // search can only help if the unfixable part of the score is zero; otherwise it is deferred (see buildDrawing)
    return { sc0: score(cur.check), hopeless: !!search && fixed(cur.check) > 0, finish };
  };
  const tries = auto
    ? [[layout, 1, 1, false], [layout, 1, 1, true], [layout, 1.5, 1, true], [layout, 2, 1, true],
       ["forms", 1, 1, true], ["forms", 1.5, 1, true], ["forms", 1, 0.85, true], ["forms", 1.5, 0.85, true], ["forms", 1.5, 0.7, true], ["forms", 2, 0.7, true]]
    : [[layout, 1, 1, false]];
  if (soft) tries.length = Math.min(tries.length, 4);                        // смягчённая проверка: только варианты основной раскладки (портретная "forms" не годится)
  // Identical result to running every search in order, but a search that cannot reach score 0 (its label-independent conflicts are non-zero) is postponed:
  // if a later attempt gets a clean layout the postponed ones were not needed at all (this is what made H114 build ~10x slower than the other articles).
  const results = [], deferred = []; let n = 0;
  for (const t of tries) {
    n++;
    const a = attempt(...t), i = results.length;
    if (a.sc0 === 0 || !a.hopeless) { const r = a.finish(); results.push(r); if (r.sc === 0) break; }
    else { results.push(null); deferred.push([i, a]); }
  }
  if (!results.some((r) => r && r.sc === 0)) for (const [i, a] of deferred) results[i] = a.finish();
  let best = null;
  for (const r of results) if (r && (!best || r.sc < best.sc)) best = r;
  // soft (смягчённая проверка, только для фигур с флагом softOverlap): допускаются лишь касания подписей размеров друг с другом / с чужими размерными линиями;
  // подписи на модели, на шапке, за краем страницы — по-прежнему ошибка
  const c0 = best.check, softOk = soft && !c0.ok && !c0.hdrVsLines && !c0.hdrVsDimSegs && !c0.hdrVsLabels && !c0.hdrVsHdr && !c0.labelVsGeom && !c0.outside.length && !c0.violatingLines.length;
  if (softOk) best.check = { ...c0, ok: true, soft: true, softConflicts: c0.labelVsLabel + c0.labelVsOtherDims };
  const svg = svgString(best);
  return { svg, W: best.W, H: best.H, toPx: best.toPx, P2: proj.P2, N: proj.N, check: best.check, projection: proj.checks, header: best.header,
    adjust: { attempts: n, layout: best.layoutName, offsetK: best.k, shrink: best.shrink, labelShifts: best.shifts.map(f2) } };
}
