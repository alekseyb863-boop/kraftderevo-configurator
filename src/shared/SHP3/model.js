// SHP3 «Шпилька 3 прутка» — ножка-шпилька из круглого прутка Ø12 под угловую пластину. Раздел «Ножки-шпильки».
// Оси: X, Y — вдоль полок уголка, Z — вверх, z = 0 — пол. Наружный угол уголка — в начале координат.
// УГОЛОК (одно тело): две горизонтальные полки 100 × 24 × 3 в одной плоскости, буквой Г в плане, общий квадрат 24 × 24 в углу:
//   полка A: x ∈ [0, 100], y ∈ [0, 24];  полка B: x ∈ [0, 24], y ∈ [0, 100];  z ∈ [H − 3, H]. Высота H — от пола до верха полок.
// ПРУТКИ Ø12 (одно тело с уголком):
//   центральный — в центре углового квадрата (12, 12), вертикально вниз от полки;
//   крайние — у дальнего конца каждой полки: центр в 18 мм от дальнего короткого края (край прутка в 12 мм), по центру ширины 24 (по 6 мм с боков):
//   A — (82, 12), B — (12, 82). Каждый крайний пруток с центральным образует шпильку в своей вертикальной плоскости (y = 12 и x = 12, под 90°):
//   внизу U-изгиб с внутренним радиусом 12 (по оси 18), низ изгиба касается пола; центральный пруток — прямая ветвь изгиба,
//   крайний идёт от полки вниз-внутрь по касательной к дуге. Обе шпильки — одна и та же кривая, вторая повёрнута на 90° вокруг оси центрального прутка.
import * as R from "replicad";
import { box } from "../lib/model.js";
import { range, colorCtl, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

export const PL = 100, PW = 24, PT = 3, ROD_D = 12, BEND_R = 12, EDGE = 12;
const r = ROD_D / 2, RC = BEND_R + r, C = PW / 2, U_OUT = PL - EDGE - r - C;   // U_OUT — смещение крайнего прутка от центрального (70)
const controls = [range("H", "Высота", 150, 1200, 1, 710), colorCtl("Черный")];

/** ось шпильки в локальных координатах (u — от оси центрального прутка к крайнему, z): центр изгиба, точка касания, угол */
export function hairpin(H) {
  const zt = H - PT, O = [RC, r + RC], P = [U_OUT, zt];
  const dx = P[0] - O[0], dz = P[1] - O[1], d = Math.hypot(dx, dz), th = Math.atan2(dz, dx) - Math.acos(RC / d);   // касание с наружной (правой) стороны
  const T = [O[0] + RC * Math.cos(th), O[1] + RC * Math.sin(th)];
  return { zt, O, P, T, th };
}

export const spec = {
  id: "SHP3", type: "Шпилька", category: "Ножки-шпильки", name: "Шпилька 3 прутка", cardLabel: "3 прутка",
  about: "Ножка-шпилька: угловая пластина из двух полок 100×24×3, три прутка Ø12, крайние сходятся с центральным внизу U-изгибом R12", controls,
  normalize(raw) { return baseNormalize(controls, raw); },
  parts(p) {
    const { H } = p, g = hairpin(H), ztop = g.zt + PT / 2;                       // прутки заходят в полку на 1,5 мм — сливаются с ней
    const mA = (g.th + Math.PI + (g.th < 0 ? 2 * Math.PI : 0)) / 2 + (g.th < 0 ? 0 : Math.PI);   // середина дуги между 180° и углом касания (через низ)
    const a0 = Math.PI, a1 = g.th < 0 ? g.th + 2 * Math.PI : g.th, am = (a0 + a1) / 2;
    const path = R.draw([0, ztop]).lineTo([0, g.O[1]])
      .threePointsArcTo(g.T, [g.O[0] + RC * Math.cos(am), g.O[1] + RC * Math.sin(am)]).lineTo([U_OUT, g.zt]).lineTo([U_OUT, ztop]).done();
    const pin = () => path.sketchOnPlane("XZ", [C, C, 0]).sweepSketch((plane, origin) => R.sketchCircle(r, { plane, origin }));
    const pinA = pin(), pinB = pin().rotate(90, [C, C, 0], [0, 0, 1]);
    void mA;
    return [box(0, PL, 0, PW, H - PT, H), box(0, PW, PW, PL, H - PT, H), pinA, pinB];
  },
  /** метраж прутка по оси: центральный + 2 × (дуга + наклонный) */
  profileLength(p) {
    const g = hairpin(p.H), a1 = g.th < 0 ? g.th + 2 * Math.PI : g.th;
    return (g.zt - g.O[1]) + 2 * (RC * (a1 - Math.PI) + Math.hypot(g.P[0] - g.T[0], g.P[1] - g.T[1]));
  },
  expectBBox: (p) => [PL, PL, p.H],
  view: { az: -45, el: 18 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const { H } = p, O = 45 * k;
    return [
      dimAB([C, C + RC, 0], [C, C + RC, H], [C, PL + O, 0], [C, PL + O, H], `${H} мм`),            // высота — от низа изгиба шпильки B до верха полки B, выносные вдоль полки B
      dimAB([0, 0, H], [PL, 0, H], [0, -O, H], [PL, -O, H], `${PL} мм`),                              // полка A
      dimAB([0, 0, H], [0, PL, H], [-O, 0, H], [-O, PL, H], `${PL} мм`),                              // полка B
      dimAB([PL, 0, H], [PL, PW, H], [PL + O, 0, H], [PL + O, PW, H], `${PW} мм`),                    // ширина полки A
    ];
  },
  textLines: (p) => ["Шпилька 3 прутка", `Пруток Ø${ROD_D} мм`, `Цвет: ${p.color}`, `Высота: ${p.H} мм`],
};
