// Угловой размер (дуга с подписью, например «70°») — тонкая дуга без стрелок и горизонтальная подпись у середины дуги.
//   d = { arc: true, pts: [3D точки дуги], at: 3D точка центра подписи, text, lead?: подпись вынесена — линия-выноска от дуги (или от точки from) к подписи,
//         arrows?: стрелки на обоих концах дуги (по умолчанию без стрелок) }
// Возвращает то же, что buildDim (для проверки наложений): дуга — как размерная линия, подпись — прямоугольник.
import { layoutBox, textPathD } from "./fonts.js";
import { pt } from "./dimensions.js";
const f = (v) => +v.toFixed(2);

/** экранные точки, которые должны поместиться на странице */
export const arcPts = (d, P2) => [...d.pts.map((q) => P2(...q)), P2(...d.at)];

export function buildArc(d, ctx) {
  const { P2, toPx, style } = ctx, svg = [], line = [];
  const px = d.pts.map((q) => toPx(P2(...q)));
  for (let i = 0; i < px.length - 1; i++) line.push([px[i], px[i + 1]]);
  svg.push(`<polyline points="${px.map((p) => f(p[0]) + "," + f(p[1])).join(" ")}" fill="none"/>`);
  const arrows = [];
  if (d.arrows) {                                                         // стрелки на концах дуги — как у линейных размеров (длина 0.4, полуширина 0.2 от 14 pt)
    const hl = 0.4 * pt(14), hw = 0.2 * pt(14);
    for (const [tip, from] of [[px[0], px[Math.min(3, px.length - 1)]], [px[px.length - 1], px[Math.max(px.length - 4, 0)]]]) {
      const v = [from[0] - tip[0], from[1] - tip[1]], L = Math.hypot(v[0], v[1]) || 1, u = [v[0] / L, v[1] / L], nv = [-u[1], u[0]];
      const base = [tip[0] + u[0] * hl, tip[1] + u[1] * hl], p1 = [base[0] + nv[0] * hw, base[1] + nv[1] * hw], p2 = [base[0] - nv[0] * hw, base[1] - nv[1] * hw];
      svg.push(`<polygon points="${[tip, p1, p2].map((q) => f(q[0]) + "," + f(q[1])).join(" ")}" stroke="none"/>`);
      arrows.push([tip, p1], [p1, p2], [p2, tip]);
    }
  }
  const size = pt(style.fs), lb = layoutBox(d.text, size), padp = pt(2.5), c = toPx(P2(...d.at));
  const x0 = c[0] - lb.width / 2, baseline = c[1] + (lb.top - lb.bottom) / 2;
  svg.push(`<g class="dim-label" data-text="${d.text}"><path d="${textPathD(d.text, x0, baseline, size, false)}" stroke="none"/></g>`);
  if (d.lead) {                                                           // подпись вынесена наружу: тонкая линия от середины дуги до края подписи
    const m = d.from ? toPx(P2(...d.from)) : px[Math.floor(px.length / 2)], v = [c[0] - m[0], c[1] - m[1]], L = Math.hypot(v[0], v[1]), hw = lb.width / 2 + padp, hh = (lb.top + lb.bottom) / 2 + padp;
    const t = Math.min(Math.abs(v[0]) > 1e-9 ? hw / Math.abs(v[0]) : Infinity, Math.abs(v[1]) > 1e-9 ? hh / Math.abs(v[1]) : Infinity) * L;   // от центра до края прямоугольника
    const e = [c[0] - (v[0] / L) * t, c[1] - (v[1] / L) * t];
    svg.push(`<polyline points="${f(m[0])},${f(m[1])} ${f(e[0])},${f(e[1])}" fill="none"/>`); line.push([m, e]);
  }
  const r = { x0: x0 - padp, x1: x0 + lb.width + padp, y0: baseline - lb.top - padp, y1: baseline + lb.bottom + padp };
  const poly = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
  return { svg, ext: [], line, arrows, label: { poly, text: d.text }, ends: [px[0], px[px.length - 1]] };
}

/**
 * Дуга угла в плоскости XZ (y = const): вершина v = [x, z], единичные направления сторон u1, u2 ([x, z]), радиус r (мм модели);
 * подпись — на биссектрисе на расстоянии rl от вершины.
 */
export function angleArcXZ(v, u1, u2, r, rl, text, y = 0, n = 32, lead = false) {
  const a1 = Math.atan2(u1[1], u1[0]); let a2 = Math.atan2(u2[1], u2[0]), da = a2 - a1;
  while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const pts = Array.from({ length: n + 1 }, (_, i) => { const t = a1 + (da * i) / n; return [v[0] + r * Math.cos(t), y, v[1] + r * Math.sin(t)]; });
  const tm = a1 + da / 2;
  return { arc: true, pts, at: [v[0] + rl * Math.cos(tm), y, v[1] + rl * Math.sin(tm)], text, lead };
}
