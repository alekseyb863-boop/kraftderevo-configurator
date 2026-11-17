// Leader (выноска) for a dashed circle on the drawing: dashed projected circle + slanted line with an arrow head touching it +
// short horizontal shelf + horizontal label to the right of the shelf.  Same return shape as buildDim (for the overlap check).
//   d = { leader: true, curve: [3D points of the closed circle] (may be empty: leader only), tip: 3D point on the circle, elbow: [dx, dy] screen-mm offset of the
//         elbow from the tip (y up), text }
import { layoutBox, textPathD } from "./fonts.js";
import { sub, add, mul, norm } from "./geom.js";
import { pt } from "./dimensions.js";
import { visibleIntervals } from "./occlude.js";
const f = (v) => +v.toFixed(2);

/** 3D circle (plane z = const) as a closed polyline */
export const circle3 = (r, z, n = 144) => Array.from({ length: n + 1 }, (_, i) => { const t = (2 * Math.PI * i) / n; return [r * Math.cos(t), r * Math.sin(t), z]; });
/** point of the circle whose projection is extreme in the screen direction dir ([x, y], y up) */
export const extremeOn = (curve, P2, dir) => curve.reduce((best, q) => { const s = P2(...q), v = s[0] * dir[0] + s[1] * dir[1]; return !best || v > best[0] ? [v, q] : best; }, null)[1];
/** screen-mm points that must fit on the page (for the layout): circle + elbow */
export const leaderPts = (d, P2) => { const t = P2(...d.tip); return [...d.curve.map((q) => P2(...q)), t, [t[0] + d.elbow[0], t[1] + d.elbow[1]]]; };

export function buildLeader(d, ctx) {
  const { P2, toPx, style, occ } = ctx, svg = [], line = [], arrows = [];
  const cpx = d.curve.map((q) => toPx(P2(...q)));
  for (let i = 0; i < cpx.length - 1; i++) line.push([cpx[i], cpx[i + 1]]);
  const dash = `${f(pt(3))} ${f(pt(2.2))}`;
  // скрытые участки окружности (за изделием по глубине) не рисуются; видимые куски соседних отрезков сшиваются в одну ломаную
  const chains = []; let cur = null;
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  for (let i = 0; i < d.curve.length - 1; i++) {
    const a3 = d.curve[i], b3 = d.curve[i + 1], iv = occ ? visibleIntervals(occ, P2(...a3), P2(...b3), occ.depth(a3), occ.depth(b3), 0, 1) : [[0, 1]];
    for (const [ta, tb] of iv) {
      const A = lerp(cpx[i], cpx[i + 1], ta), B = lerp(cpx[i], cpx[i + 1], tb);
      if (cur && ta < 1e-9) cur.push(B); else { cur = [A, B]; chains.push(cur); }
      if (tb < 1 - 1e-9) cur = null;
    }
    if (!iv.length) cur = null;
  }
  for (const ch of chains) svg.push(`<polyline points="${ch.map((p) => f(p[0]) + "," + f(p[1])).join(" ")}" fill="none" stroke-dasharray="${dash}"/>`);
  const t2 = P2(...d.tip), T = toPx(t2), E = toPx([t2[0] + d.elbow[0], t2[1] + d.elbow[1]]), shelf = pt(14);
  const S = add(E, [shelf, 0]);
  const v = sub(T, E), L = norm(v), u = mul(v, 1 / L), nv = [-u[1], u[0]], hl = 0.4 * pt(14), hw = 0.2 * pt(14);
  const base = sub(T, mul(u, hl)), p1 = add(base, mul(nv, hw)), p2 = add(base, mul(nv, -hw));
  svg.push(`<polyline points="${[S, E, sub(T, mul(u, hl * 0.9))].map((p) => f(p[0]) + "," + f(p[1])).join(" ")}" fill="none"/>`);
  svg.push(`<polygon points="${[T, p1, p2].map((p) => f(p[0]) + "," + f(p[1])).join(" ")}" stroke="none"/>`);
  line.push([E, T], [E, S]); arrows.push([T, p1], [p1, p2], [p2, T]);
  const size = pt(style.fs), lb = layoutBox(d.text, size), padp = pt(2.5);
  const x0 = S[0] + pt(3), baseline = S[1] + (lb.top - lb.bottom) / 2;
  svg.push(`<g class="dim-label" data-text="${d.text}"><path d="${textPathD(d.text, x0, baseline, size, false)}" stroke="none"/></g>`);
  const r = { x0: x0 - padp, x1: x0 + lb.width + padp, y0: baseline - lb.top - padp, y1: baseline + lb.bottom + padp };
  const poly = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
  return { svg, ext: [], line, arrows, label: { poly, text: d.text }, ends: [T, E, S] };
}
