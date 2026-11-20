// 0118 Подстолье 0118 (круглый журнальный столик): верхнее и нижнее кольца одного диаметра, гнутые из квадратного профиля,
// и 4 вертикальные ножки через 90°. Мм, Z вверх, ось — ось Z.
//
// РАЗМЕРЫ: D «Диаметр» — наружный диаметр колец; H «Высота» — общая, с кольцами. Профиль квадратный a×a (по умолчанию 20×20).
// ГЕОМЕТРИЯ (всё — ОДНО тело): кольца — квадратное сечение a×a, повёрнутое вокруг оси (наружный радиус D/2, внутренний D/2 − a),
//   нижнее z ∈ [0, a], верхнее z ∈ [H − a, H]; ножки a×a стоят на нижнем кольце и упираются в верхнее, z ∈ [a, H − a],
//   центры ножек — на средней линии колец (радиус D/2 − a/2), через 90° (10°/100°/190°/280°).
import * as R from "replicad";
import { box, free } from "../lib/model.js";
import { range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { makeView } from "../render/projection.js";
import { circle3, extremeOn } from "../render/leaders.js";
import { Irect, Arect, portalK, closedFrameK, fem2d, swayFromK } from "../lib/sway.js";

const SQ = [15, 20, 25, 30, 40].map((a) => ({ id: `${a}x${a}`, a, b: a, label: `${a}×${a}` }));
const LEGS = [10, 100, 190, 280];                       // ракурс как на фото: все 4 ножки видны, две ближе, две дальше
const controls = [
  profileCtl("20x20", "profile", "Профиль", SQ),
  range("D", "Диаметр", 500, 1500, 5, 500),
  range("H", "Высота", 150, 1200, 5, 450),
  colorCtl("черный"),
];
const prof = (p) => findIn(SQ, p.profile);
/** кольцо квадратного сечения: наружный радиус r, толщина a, z ∈ [z0, z0 + a] (настоящие цилиндрические поверхности) */
function ring(r, a, z0) {
  const o = R.makeCylinder(r, a, [0, 0, z0], [0, 0, 1]), i = R.makeCylinder(r - a, a + 2, [0, 0, z0 - 1], [0, 0, 1]);
  const res = o.cut(i); free(o, i); return res;
}

export const spec = {
  id: "0118", type: "Подстолье", category: "Подстолья Круглые", name: "Подстолье 0118",
  about: "Круглое подстолье: верхнее и нижнее кольца из квадратного профиля и 4 ножки через 90°",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), a = prof(p).a, Hmin = 2 * a + 50;
    if (p.H < Hmin) { warnings.push(`«Высота»: ${p.H} → ${Hmin} мм (иначе не помещаются кольца и ножки).`); p.H = Hmin; }
    return { p, warnings };
  },
  parts(p) {
    const a = prof(p).a, { D, H } = p, rc = D / 2 - a / 2, out = [ring(D / 2, a, 0), ring(D / 2, a, H - a)];
    for (const th of LEGS) {
      const t = (th * Math.PI) / 180, leg = box(-a / 2, a / 2, -a / 2, a / 2, a, H - a);
      const r = leg.rotate(th, [0, 0, 0], [0, 0, 1]).translate([rc * Math.cos(t), rc * Math.sin(t), 0]);
      out.push(r);
    }
    return out;
  },
  /** раскачка (круглое; lib/sway.js), ГРУБО: 4 ножки a×a между кольцами; кольца заменены прямыми ригелями длиной в четверть окружности π(D − a)/4
   *  (между соседними ножками) с сечением кольца; 2 замкнутые рамы, ножки — шарниры на полу (нижнее кольцо лежит на полу) */
  sway(p) { const a = prof(p).a, I = Irect(a, a), Ar = Arect(a, a); return swayFromK(2 * closedFrameK(p.H - a, I, (Math.PI * (p.D - a)) / 4, I, I, Ar, Ar), true); },
  /** метраж: 2 кольца по средней линии π·(D − a) + 4 ножки (H − 2a) */
  profileLength(p) { const a = prof(p).a; return 2 * Math.PI * (p.D - a) + 4 * (p.H - 2 * a); },
  expectBBox: (p) => [p.D, p.D, p.H],
  view: { az: 35, el: 28 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const { D, H } = p, P2 = makeView(spec.view.az, spec.view.el).P2, r = D / 2;
    // высота — слева, по самой левой (на экране) точке колец
    const L = extremeOn(circle3(r, 0), P2, [-1, 0]), u = [L[0] / r, L[1] / r], O = 80 * k, at = (rr, z) => [rr * u[0], rr * u[1], z];
    const top = circle3(r, H);
    return [dimAB(at(r, 0), at(r, H), at(r + O, 0), at(r + O, H), `${H} мм`),
      // диаметр — выноска с полкой к наружной кромке верхнего кольца (как у Н091)
      { leader: true, curve: [], tip: extremeOn(top, P2, [-0.45, 1]), elbow: [0.1 * D * k, 0.16 * D * k], text: `Ø${D} мм` }];
  },
  textLines: (p) => ["Подстолье 0118", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Диаметр: Ø${p.D} мм`, `Высота: ${p.H} мм`],
};
