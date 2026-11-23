// SHP3 «Шпилька 3 прутка» — ножка-шпилька из круглого прутка Ø12 под угловую пластину. Раздел «Ножки-шпильки».
// Оси: X, Y — вдоль полок уголка, Z — вверх, z = 0 — пол. Наружный угол уголка — в начале координат.
// УГОЛОК (одно тело): две горизонтальные полки 100 × 24 × 3 в одной плоскости, буквой Г в плане, общий квадрат 24 × 24 в углу:
//   полка A: x ∈ [0, 100], y ∈ [0, 24];  полка B: x ∈ [0, 24], y ∈ [0, 100];  z ∈ [H − 3, H]. Высота H — от пола до верха полок.
// ПРУТКИ Ø12:
//   крайние — у дальнего конца каждой полки: центр в 18 мм от дальнего короткого края (край прутка в 12 мм), по центру ширины 24 (по 6 мм с боков):
//   A — (82, 12), B — (12, 82) под полкой. Оба крайних — ОДИН пруток-петля: A → U-изгиб внизу → B, внутренний радиус изгиба 12 (по оси 18).
//   Самая нижняя точка петли — точно под осью центрального прутка (12, 12), низ прутка касается пола. Центр (12, 12) не лежит на прямой A–B,
//   поэтому петля — плоская и симметричная, но в НАКЛОННОЙ плоскости через A, B и нижнюю точку L = (12, 12, 6) (ось прутка);
//   прямые участки — касательные к дуге изгиба.
//   центральный — вертикально из центра углового квадрата вниз до петли, упирается в верх изгиба (обрезан по оси петли z = 6 — сварной стык равных прутков).
import * as R from "replicad";
import { box } from "../lib/model.js";
import { range, colorCtl, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

export const PL = 100, PW = 24, PT = 3, ROD_D = 12, BEND_R = 12, EDGE = 12;
const r = ROD_D / 2, RC = BEND_R + r, C = PW / 2, U_OUT = PL - EDGE - r - C;   // U_OUT — смещение крайнего прутка от центрального (70)
const controls = [range("H", "Высота", 150, 1200, 1, 710), colorCtl("Черный")];

/** петля в своей плоскости: локальные координаты (s — вдоль A→B по горизонтали, t — вверх по плоскости от нижней точки L) */
export function hairpin(H) {
  const zt = H - PT, L = [C, C, r], M = [(U_OUT + C + C) / 2 + 0, (U_OUT + C + C) / 2, zt];   // M — середина A–B под полкой
  const v = [M[0] - L[0], M[1] - L[1], M[2] - L[2]], tv = Math.hypot(...v), e2 = v.map((q) => q / tv), e1 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
  const sA = U_OUT / Math.SQRT2, O = [0, RC], P = [sA, tv];
  const dx = P[0] - O[0], dz = P[1] - O[1], d = Math.hypot(dx, dz), th = Math.atan2(dz, dx) - Math.acos(RC / d);   // касание с наружной стороны
  const T = [O[0] + RC * Math.cos(th), O[1] + RC * Math.sin(th)];
  return { zt, L, e1, e2, n: [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], O, P, T, th, sA, tv };
}

export const spec = {
  id: "SHP3", type: "Шпилька", category: "Ножки-шпильки", name: "Шпилька 3 прутка", cardLabel: "3 прутка",
  about: "Ножка-шпилька: угловая пластина из двух полок 100×24×3, крайние прутки — одна петля с U-изгибом R12, центральный упирается в петлю", controls,
  normalize(raw) { return baseNormalize(controls, raw); },
  parts(p) {
    const { H } = p, g = hairpin(H), k = 1 + PT / 2 / (g.tv - g.T[1]);           // прутки заходят в полку на 1,5 мм — сливаются с ней
    const ext = (Q) => [g.T[0] * (Q[0] < 0 ? -1 : 1) + (Q[0] - g.T[0] * (Q[0] < 0 ? -1 : 1)) * k, g.T[1] + (Q[1] - g.T[1]) * k];
    const PA = ext(g.P), PB = ext([-g.P[0], g.P[1]]);
    const path = R.draw(PA).lineTo(g.T).threePointsArcTo([-g.T[0], g.T[1]], [0, 0]).lineTo(PB).done();
    const plane = new R.Plane(g.L, g.e1, g.n);
    const loop = path.sketchOnPlane(plane).sweepSketch((pl, origin) => R.sketchCircle(r, { plane: pl, origin }));
    const mid = R.makeCylinder(r, H - PT / 2 - g.L[2], g.L, [0, 0, 1]);           // от оси петли до середины полки
    return [box(0, PL, 0, PW, H - PT, H), box(0, PW, PW, PL, H - PT, H), loop, mid];
  },
  /** метраж прутка по оси: центральный (до оси петли) + петля (2 прямых + дуга) */
  profileLength(p) {
    const g = hairpin(p.H);
    return (g.zt - g.L[2]) + 2 * Math.hypot(g.P[0] - g.T[0], g.P[1] - g.T[1]) + RC * (Math.PI + 2 * g.th);
  },
  /** габарит: петля внизу выходит за наружный угол уголка по диагонали — минимум x (= y) трубы по дуге изгиба */
  expectBBox(p) {
    const g = hairpin(p.H); let mn = 0;
    for (let a = Math.PI + g.th; a >= -g.th; a -= 1e-4) {                                // дуга в локальных (s, t): угол от левого касания до правого
      const s = RC * Math.cos(-a), t = RC + RC * Math.sin(-a), tau = [Math.sin(-a), -Math.cos(-a)];   // точка и касательная (знак не важен)
      const x = g.L[0] + s * g.e1[0] + (t) * g.e2[0], tx = tau[0] * g.e1[0] + tau[1] * g.e2[0];
      mn = Math.min(mn, x - r * Math.sqrt(1 - tx * tx));
    }
    return [PL - mn, PL - mn, p.H];
  },
  view: { az: -45, el: 18 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const { H } = p, O = 45 * k;
    return [
      dimAB([C, C, 0], [C, C, H], [C, PL + O, 0], [C, PL + O, H], `${H} мм`),                      // высота — от низа петли (под центральным прутком) до верха полок, выносные вдоль полки B
      dimAB([0, 0, H], [PL, 0, H], [0, -O, H], [PL, -O, H], `${PL} мм`),                              // полка A
      dimAB([0, 0, H], [0, PL, H], [-O, 0, H], [-O, PL, H], `${PL} мм`),                              // полка B
      dimAB([PL, 0, H], [PL, PW, H], [PL + O, 0, H], [PL + O, PW, H], `${PW} мм`),                    // ширина полки A
    ];
  },
  textLines: (p) => ["Шпилька 3 прутка", `Пруток Ø${ROD_D} мм`, `Цвет: ${p.color}`, `Высота: ${p.H} мм`],
};
