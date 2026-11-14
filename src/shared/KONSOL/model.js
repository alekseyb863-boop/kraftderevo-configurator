// KONSOL «Консоль» — подстолье-консоль из прямоугольной трубы (по умолчанию 30×15), 888 × 418 × 620 (высота с регуляторами).
// мм, Z вверх, начало в левом переднем нижнем углу. X — «Длина», Y — «Ширина» (глубина), Z — «Высота».
//
// ГЕОМЕТРИЯ (w — большая сторона профиля 30, t — малая 15; всё — ОДНО тело):
//   Регуляторы высоты: 4 шайбы Ø20×10 (цилиндры) под ножками, центр (w/2, 10) от угла; рама начинается с z = 10.
//   Ножки: 4 шт., сторона w вдоль длины, t вглубь: x ∈ [0,w]/[L−w,L], y ∈ [0,t]/[D−t,D], z ∈ [10, H].
//   Верхний контур z ∈ [H−t, H]: передняя/задняя продольные трубы x ∈ [w, L−w], y ∈ [0,w]/[D−w,D] (w вглубь, t по высоте);
//     боковые x ∈ [0,w]/[L−w,L], y ∈ [t, D−t].
//   Низ z ∈ [10, 10+t]: боковые перемычки у пола x ∈ [0,w]/[L−w,L], y ∈ [t, D−t]; задняя продольная x ∈ [w, L−w], y ∈ [D−w, D].
//   Площадки 50×20×4: верх вровень с рамой, 20 мм внутрь проёма. Короткие стороны — по 1 ровно по центру;
//     длинные — по 2 с равными промежутками ножка–площадка–площадка–ножка.
import * as R from "replicad";
import { box } from "../lib/model.js";
import { range, profileCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

/** прямоугольная труба: a — большая сторона (30), b — малая (15) */
const RECTS = [["20x10", 20, 10], ["30x15", 30, 15], ["40x20", 40, 20], ["50x25", 50, 25]].map(([id, a, b]) => ({ id, a, b, label: `${a}×${b}` }));
const FOOT_H = 10, FOOT_R = 10;                        // регулятор высоты Ø20×10
const PAD_L = 50, PAD_W = 20, PAD_T = 4;               // площадка для крепления

const controls = [
  range("L", "Длина", 400, 2000, 1, 888),
  range("D", "Ширина", 200, 1000, 1, 418),
  range("H", "Высота", 300, 1200, 1, 620),
  profileCtl("30x15", "profile", "Профиль", RECTS),
];
const prof = (p) => findIn(RECTS, p.profile);
/** положения площадок: [x0,x1] на длинных сторонах и [y0,y1] на коротких */
function pads(p) {
  const { a: w } = prof(p), { L, D } = p, gap = (L - 2 * w - 2 * PAD_L) / 3, midY = D / 2;
  return { gap, xs: [[w + gap, w + gap + PAD_L], [w + 2 * gap + PAD_L, w + 2 * gap + 2 * PAD_L]], ys: [midY - PAD_L / 2, midY + PAD_L / 2] };
}

export const spec = {
  id: "KONSOL", type: "Подстолье", category: "Подстолья", name: "Консоль",
  about: "Консоль из трубы 30×15: верхний контур, задняя нижняя перемычка, 6 площадок для крепления и 4 регулятора высоты",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    const { a: w, b: t } = prof(p);
    // промежуток между площадками на длинной стороне ≥ 20 (иначе площадки упираются в боковые), просвет по ширине ≥ 2 площадок
    const Lmin = 2 * w + 2 * PAD_L + 3 * (PAD_W + 5);
    if (p.L < Lmin) { warnings.push(`«Длина»: ${p.L} → ${Lmin} мм (иначе не помещаются площадки).`); p.L = Lmin; }
    const Dmin = 2 * w + PAD_L + 2 * (PAD_W + 5);
    if (p.D < Dmin) { warnings.push(`«Ширина»: ${p.D} → ${Dmin} мм (иначе не помещаются площадки).`); p.D = Dmin; }
    const Hmin = FOOT_H + 3 * t + 20;
    if (p.H < Hmin) { warnings.push(`«Высота»: ${p.H} → ${Hmin} мм.`); p.H = Hmin; }
    return { p, warnings };
  },
  parts(p) {
    const { a: w, b: t } = prof(p), { L, D, H } = p, z0 = FOOT_H, out = [];
    for (const [x0, x1] of [[0, w], [L - w, L]])
      for (const [y0, y1] of [[0, t], [D - t, D]])
        out.push(box(x0, x1, y0, y1, z0, H));                               // ножки
    out.push(box(w, L - w, 0, w, H - t, H), box(w, L - w, D - w, D, H - t, H));  // передняя и задняя верхние
    out.push(box(0, w, t, D - t, H - t, H), box(L - w, L, t, D - t, H - t, H));  // боковые верхние
    out.push(box(0, w, t, D - t, z0, z0 + t), box(L - w, L, t, D - t, z0, z0 + t)); // боковые нижние у пола
    out.push(box(w, L - w, D - w, D, z0, z0 + t));                          // задняя нижняя продольная
    const { xs, ys } = pads(p);
    for (const [x0, x1] of xs) out.push(box(x0, x1, w, w + PAD_W, H - PAD_T, H), box(x0, x1, D - w - PAD_W, D - w, H - PAD_T, H));
    out.push(box(w, w + PAD_W, ys[0], ys[1], H - PAD_T, H), box(L - w - PAD_W, L - w, ys[0], ys[1], H - PAD_T, H));
    for (const [cx, cy] of [[w / 2, FOOT_R], [L - w / 2, FOOT_R], [w / 2, D - FOOT_R], [L - w / 2, D - FOOT_R]])
      out.push(R.makeCylinder(FOOT_R, FOOT_H, [cx, cy, 0], [0, 0, 1]));      // регуляторы высоты
    return out;
  },
  expectBBox: (p) => [p.L, p.D, p.H],
  view: { az: 35, el: 18 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const { L, D, H } = p, O = 90 * k, O2 = 55 * k;
    return [
      // Длина — по заднему верхнему ребру, над изделием
      dimAB([0, D, H], [L, D, H], [0, D, H + O], [L, D, H + O], `${L} мм`),
      // Ширина — по нижнему правому ребру (глубина)
      dimAB([L, 0, 0], [L, D, 0], [L + O, 0, 0], [L + O, D, 0], `${D} мм`),
      // Высота — справа, от пола до верха
      dimAB([L, D, 0], [L, D, H], [L + O + O2, D, 0], [L + O + O2, D, H], `${H} мм`),
    ];
  },
  textLines: (p) => {
    const { a, b } = prof(p);
    return ["Консоль", `Профиль ${a}×${b} мм`, `Длина: ${p.L} мм`, `Ширина: ${p.D} мм`, `Высота: ${p.H} мм`, "Площадки для крепления: 6шт", "Регуляторы высоты: 4шт"];
  },
};
