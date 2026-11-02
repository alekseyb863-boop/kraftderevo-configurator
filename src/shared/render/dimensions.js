// Isometric projection drawing dimension: extension lines, dimension line with filled arrow heads, rotated label on a white box.
import { textWidth, textPathD, layoutBox } from "./fonts.js";
import { sub, add, mul, norm, polyEdges } from "./geom.js";
import { visibleIntervals } from "./occlude.js";
const PT = 100 / 72;                           // matplotlib 100 dpi: 1 pt = 100/72 px
export const pt = (v) => v * PT;
const f = (v) => +v.toFixed(2);

/**
 * d = { s0, s1 (3D points on the part), a, b (3D ends of the dimension line), text, shift (px along the line) }
 * ctx = { P2 (3D -> screen mm, y up), toPx (screen mm -> px), scale (px/mm), style:{ dimLW, fs, extGap(L,scale), extOver(scale) } }
 * returns { svg:[strings], segs:{ext:[],line:[]...}, label:{poly,mid,ang} }
 */
export function buildDim(d, ctx) {
  const { P2, toPx, scale, style, occ } = ctx;
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  // the drawn pieces: parts of a line hidden behind the model are cut out (hidden-line removal); full segments stay in ext/line for the overlap check
  const pieces = (p3, q3, t0, t1, from, to) => { const sp = P2(...p3), ep = P2(...q3), dp = occ ? occ.depth(p3) : 0, dq = occ ? occ.depth(q3) : 0;
    return visibleIntervals(occ, sp, ep, dp, dq, t0, t1).map(([ta, tb]) => [lerp(from, to, (ta - t0) / (t1 - t0)), lerp(from, to, (tb - t0) / (t1 - t0))]); };
  const lineSvg = ([x, y], [x2, y2]) => `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  const a = P2(...d.a), b = P2(...d.b), svg = [], ext = [], line = [], arrows = [];
  for (const [p, q] of [[d.s0, d.a], [d.s1, d.b]]) {                 // extension lines (computed in data units like the Python code)
    const s = P2(...p), e = P2(...q), v = sub(e, s), L = norm(v);
    if (L < 1e-6) continue;
    const u = mul(v, 1 / L);
    const s2 = toPx(add(s, mul(u, style.extGap(L, scale)))), e2 = toPx(add(e, mul(u, style.extOver(scale))));
    ext.push([s2, e2]);
    const t0 = style.extGap(L, scale) / L, t1 = 1 + style.extOver(scale) / L;
    for (const [pa, pb] of pieces(p, q, t0, t1, s2, e2)) svg.push(lineSvg(pa, pb));
  }
  // dimension line, arrow heads (matplotlib "<|-|>", mutation_scale 14 pt: length 0.4, half-width 0.2)
  const A = toPx(a), B = toPx(b), dpx = sub(B, A), Ln = norm(dpx), u = mul(dpx, 1 / Ln), nv = [-u[1], u[0]];
  const hl = 0.4 * pt(14), hw = 0.2 * pt(14);
  const A2 = add(A, mul(u, hl * 0.9)), B2 = sub(B, mul(u, hl * 0.9));
  { const t0 = (hl * 0.9) / Ln, t1 = 1 - (hl * 0.9) / Ln;
    for (const [pa, pb] of pieces(d.a, d.b, t0, t1, A2, B2)) svg.push(lineSvg(pa, pb)); }
  line.push([A, B]);
  for (const [tip, dir] of [[A, u], [B, mul(u, -1)]]) {
    const base = add(tip, mul(dir, hl)), p1 = add(base, mul(nv, hw)), p2 = add(base, mul(nv, -hw));
    svg.push(`<polygon points="${[tip, p1, p2].map((p) => f(p[0]) + "," + f(p[1])).join(" ")}" stroke="none"/>`);
    arrows.push([tip, p1], [p1, p2], [p2, tip]);
  }
  // label: centred on the line (optionally shifted along it), rotated along it, kept readable (angle in [-90,90]), white box
  let mid = mul(add(A, B), 0.5);
  if (d.shift) mid = add(mid, mul(u, d.shift));
  let ang = (Math.atan2(dpx[1], dpx[0]) * 180) / Math.PI;                 // screen angle (px y down), clockwise positive == SVG rotate
  if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
  const size = pt(style.fs), lb = layoutBox(d.text, size), padp = pt(2.5);
  const boxW = lb.width + 2 * padp, boxH = lb.h + 2 * padp;
  if (d.out && (Math.abs(d.out) > 1 || boxW + 2 * hl > Ln)) mid = add(d.out > 0 ? B : A, mul(u, (d.out > 0 ? 1 : -1) * (boxW / 2 + 22) + (d.shift || 0)));   // label does not fit between the arrows: beyond the end
  const cy = (lb.top - lb.bottom) / 2;                                    // box centre is (top-bottom)/2 above the baseline
  const tw = lb.width, base = cy;                                         // baseline offset from centre (y down: +)
  const pathD = textPathD(d.text, -tw / 2, base, size, false);
  svg.push(`<g class="dim-label" data-text="${d.text}" transform="translate(${f(mid[0])} ${f(mid[1])}) rotate(${f(ang)})"><rect x="${f(-boxW / 2)}" y="${f(-boxH / 2)}" width="${f(boxW)}" height="${f(boxH)}" fill="#fff" stroke="none"/><path d="${pathD}" stroke="none"/></g>`);
  const c = (ang * Math.PI) / 180, cs = Math.cos(c), sn = Math.sin(c);
  const poly = [[-boxW / 2, -boxH / 2], [boxW / 2, -boxH / 2], [boxW / 2, boxH / 2], [-boxW / 2, boxH / 2]]
    .map(([x, y]) => [mid[0] + x * cs - y * sn, mid[1] + x * sn + y * cs]);
  return { svg, ext, line, arrows, label: { poly, text: d.text }, ends: [A, B] };
}
