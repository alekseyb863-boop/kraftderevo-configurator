// 1187 «Вешалка арт.1187» — настенная вешалка из одной гнутой трубы a×a (по умолчанию 20×20). Категория «Вешалки».
// Оси: X — вылет от стены (вправо на виде), Y — толщина трубы (0..a, y = 0 — лицевая сторона), Z — высота. Плоскость изгиба — XZ.
// ГЕОМЕТРИЯ (все размеры наружные, углы острые — как гнутая полоса без радиуса, одно тело):
//   вертикальный верх: левая грань x = 0, z от H − V до H (длина V по наружной грани);
//   наклонный участок вниз-вправо до нижнего правого угла (Wt, 0) — крайней правой точки; полоса толщиной a между прямой через (Wt, 0)
//   и параллельной ей через (0, H − V); угол наклона следует из размеров;
//   нижняя лапка: нижняя грань z = 0 от x = Wt − F до x = Wt (длина F), идёт обратно к стене;
//   ушко: вертикальная пластина 10 (над верхом лапки) × a (ширина трубы) × 3 мм на верхней грани лапки у её свободного конца, заподлицо с торцом;
//   2 сквозных отверстия Ø5 в вертикальном верхе, по оси X (через правую видимую грань x = a), по центру ширины, на 40 и 100 мм от верхнего торца.
//   На чертеже отверстия — только контуры, без размеров и выносок.
import * as R from "replicad";
import { prism, box } from "../lib/model.js";
import { SQUARES, range, profileCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { makeView } from "../render/projection.js";

const VIEW = { az: 38, el: 20 };
const EAR_H = 10, EAR_T = 3, HOLES = [40, 100], HOLE_D = 5;
const controls = [
  profileCtl("20x20", "profile", "Профиль", SQUARES),
  range("H", "Высота", 300, 1200, 1, 520),
  range("W", "Ширина", 100, 500, 1, 180),
  range("V", "Длина верха", 120, 600, 1, 150),
  range("F", "Длина лапки", 60, 500, 1, 150),
];
const prof = (p) => findIn(SQUARES, p.profile);

/** контур гнутой трубы в плоскости XZ и угол наклонного участка; null — наклон не строится */
export function outline(p) {
  const a = prof(p).a, { H, W, V, F } = p, B = [0, H - V], Fc = [W, 0];
  const Rr = Math.hypot(B[0] - Fc[0], B[1] - Fc[1]), phi = Math.atan2(Fc[0] - B[0], B[1] - Fc[1]);
  if (a / Rr >= 1) return null;
  const ang = Math.acos(-a / Rr) - phi, d = [-Math.cos(ang), Math.sin(ang)];            // B ниже-левее прямой через угол (W, 0)
  const G = [a, Fc[1] + (d[1] * (a - Fc[0])) / d[0]];                                    // правая грань наклона ∩ x = a
  const C = [B[0] + (d[0] * (a - B[1])) / d[1], a];                                      // левая грань наклона ∩ верх лапки z = a
  return { a, ang, G, C, pts: [[0, H], B, C, [W - F, a], [W - F, 0], Fc, G, [a, H]] };
}

export const spec = {
  id: "1187", type: "Вешалка", category: "Вешалки", name: "Вешалка арт.1187", cardLabel: "1187",
  about: "Настенная вешалка из одной гнутой трубы: вертикальный верх, наклон, лапка с ушком",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), a = prof(p).a;
    const minV = HOLES[1] + 2 * a; if (p.V < minV) { warnings.push(`«Длина верха»: ${p.V} → ${minV} мм (отверстия на 40 и 100 мм от верха).`); p.V = minV; }
    if (p.V > p.H - 3 * a - 60) { const n = p.H - 3 * a - 60; warnings.push(`«Длина верха»: ${p.V} → ${n} мм (остаётся место на наклон).`); p.V = n; }
    const minW = 3 * a + 40; if (p.W < minW) { warnings.push(`«Ширина»: ${p.W} → ${minW} мм.`); p.W = minW; }
    const maxF = Math.floor(p.W - a / 2); if (p.F > maxF) { warnings.push(`«Длина лапки»: ${p.F} → ${maxF} мм (не длиннее ширины).`); p.F = maxF; }
    // лапка должна выходить за наклон: свободный конец левее места, где наклон встречает лапку
    const o = outline(p); if (o && o.C[0] - (p.W - p.F) < a + EAR_T) { const n = Math.ceil(p.W - o.C[0] + a + EAR_T); warnings.push(`«Длина лапки»: ${p.F} → ${n} мм (лапка короче наклона).`); p.F = Math.min(n, maxF); }
    return { p, warnings };
  },
  parts(p) {
    const o = outline(p), a = o.a, { H, W, F } = p;
    const tube = HOLES.reduce((s, h) => s.cut(R.makeCylinder(HOLE_D / 2, a + 2, [-1, a / 2, H - h], [1, 0, 0])), prism(o.pts, 0, a));   // сквозные отверстия
    return [tube, box(W - F, W - F + EAR_T, 0, a, a, a + EAR_H)];
  },
  /** метраж трубы по оси: верх + наклон + лапка (ушко не считается) */
  profileLength(p) {
    const o = outline(p), a = o.a, { H, W, V, F } = p, d = [-Math.cos(o.ang), Math.sin(o.ang)], B = [0, H - V];
    const t = (B[0] - W) * d[0] + B[1] * d[1], foot = [W + t * d[0], t * d[1]];                 // проекция B на правую грань наклона
    const M = [(B[0] + foot[0]) / 2, (B[1] + foot[1]) / 2];                                     // точка осевой линии наклона
    const k1 = [a / 2, M[1] + (d[1] * (a / 2 - M[0])) / d[0]], k2 = [M[0] + (d[0] * (a / 2 - M[1])) / d[1], a / 2];
    return (H - k1[1]) + Math.hypot(k2[0] - k1[0], k2[1] - k1[1]) + (k2[0] - (W - F));
  },
  expectBBox: (p) => [p.W, prof(p).a, p.H],
  view: VIEW, layout: "forms", auto: true,
  dims(p, k = 1) {
    const { H, W, V, F } = p, O = 45 * k;
    return [
      dimAB([0, 0, H], [W, 0, 0], [0, 0, H + O], [W, 0, H + O], `${W} мм`),
      dimAB([0, 0, H], [0, 0, H - V], [-O, 0, H], [-O, 0, H - V], `${V} мм`),
      dimAB([0, 0, 0], [0, 0, H], [-2.2 * O, 0, 0], [-2.2 * O, 0, H], `${H} мм`),
      dimAB([W - F, 0, 0], [W, 0, 0], [W - F, 0, -O], [W, 0, -O], `${F} мм`),
      { leader: true, curve: [], tip: [W - F + EAR_T / 2, 0, prof(p).a + EAR_H * 0.6], elbow: earElbow(p, O), text: `Ушко ${EAR_H}×${prof(p).a}` },
    ];
  },
  textLines: (p) => ["Вешалка арт.1187", `Профиль ${prof(p).label} мм`, `Высота: ${p.H} мм`],
};

/** Колено выноски «Ушко»: подпись (справа от полки) должна поместиться между размерной линией высоты и наклонным участком.
 *  Ширина подписи в мм экрана оценивается по габариту (подписи в пикселях, масштаб чертежа ~ высоте); перебираются высоты колена.
 *  Если места нет нигде — подпись уходит левее размерной линии высоты. На умолчаниях — [-60, 90]. */
function earElbow(p, O) {
  const o = outline(p), a = o.a, { P2 } = makeView(VIEW.az, VIEW.el), { H, W, F } = p;
  const T = P2(W - F + EAR_T / 2, 0, a + EAR_H * 0.6), Lw = 0.2 * (H + 2 * O), hgt = 0.035 * (H + 2 * O);
  const xDim = P2(-2.2 * O, 0, 0)[0] + 0.02 * H;                                         // левая граница: размерная линия высоты (+ зазор)
  const s0 = P2(...[o.C[0], 0, a]), s1 = P2(o.pts[1][0], 0, o.pts[1][1]);                 // левая грань наклона на экране
  const slantX = (y) => s0[0] + ((s1[0] - s0[0]) * (y - s0[1])) / (s1[1] - s0[1]);
  for (const dy of [90, 70, 110, 130, 50, 150, 180]) for (const dx of [-60, -40, -80, -20, -100]) {
    const E = [T[0] + dx, T[1] + dy];
    if (E[0] > xDim && E[0] + Lw < Math.min(slantX(E[1] - hgt), slantX(E[1] + hgt)) - 0.015 * H) return [dx, dy];
  }
  return [xDim - 0.04 * H - Lw - 0.04 * (H + 2 * O) - T[0], 60];
}
