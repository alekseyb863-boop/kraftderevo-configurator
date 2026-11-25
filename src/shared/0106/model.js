// 0106 Ножка для стола: как Н028, но рама — трапеция: ширина и глубина задаются отдельно для верха и низа.
// По умолчанию профиль 60×30 (30 в плоскости, 60 в глубину), верх 700×300, низ 500×200, высота 710, цвет черный;
// плюс боковая рама от середины верхней и нижней перемычек. Задняя стойка — тот же frame(), что и у остальных
// диагональных профилей: стыки «в ус», наружное ребро от верхней точки верха (y=DT, z=H) к нижней точке низа (y=DB, z=0).
import { frame, free } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { frameMembers, sum } from "../lib/length.js";

const controls = [
  range("WT", "Ширина верха", 250, 1000, 10, 700),
  range("WB", "Ширина низа", 250, 1000, 10, 500),
  range("DT", "Глубина верха", 100, 700, 10, 300),
  range("DB", "Глубина низа", 100, 700, 10, 200),
  range("H", "Высота", 300, 1100, 10, 710),
  profileCtl("60x30"), colorCtl("черный"),
];

/** Центрированная трапеция в плоскости XZ, габарит от x=0. */
const geo = (p) => {
  const Wmax = Math.max(p.WT, p.WB), x0b = (Wmax - p.WB) / 2, x0t = (Wmax - p.WT) / 2;
  return { Wmax, x0b, x0t, outer: [[x0b, 0], [x0b + p.WB, 0], [x0t + p.WT, p.H], [x0t, p.H]] };
};
/** Боковая рама в плоскости глубины (локально XZ = YZ модели): открыта спереди, где стыкуется с фасадной рамой. */
const sideOuter = (p, r) => [[r.a, 0], [p.DB, 0], [p.DT, p.H], [r.a, p.H]];

export const spec = {
  id: "0106", type: "Ножка", category: "Ножки и опоры", name: "Ножка 0106",
  about: "Ножки для стола: трапециевидная рама с боковой рамой (ширина и глубина верха и низа)", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    relax(p, controls, (q) => {
      const r = findIn(PROFILES, q.profile), { outer } = geo(q), t = r.b;
      return frameFeasible(outer, [t, t, t, t], 20) && frameFeasible(sideOuter(q, r), [t, t, t, 0], 20)
        && q.DT >= r.a + t + 30 && q.DB >= r.a + t + 30 && q.H >= 2 * t + 40;
    }, [["DT", 10], ["DB", 10], ["H", 10], ["WT", 10], ["WB", 10]], warnings, "иначе профиль не помещается");
    return { p, warnings };
  },
  parts(p) {
    const r = findIn(PROFILES, p.profile), { a: DEP, b: TIN } = r, { Wmax, outer } = geo(p);
    const cx1 = Wmax / 2 + DEP / 2;
    // frame в XZ (локальный x = глубина), затем поворот в YZ, как у 0320 / Н114
    const side = frame(sideOuter(p, r), [TIN, TIN, TIN, TIN], 0, DEP, [3]);
    const placed = side.rotate(90, [0, 0, 0], [0, 0, 1]).translate([cx1, 0, 0]);
    free(side);
    return [frame(outer, [TIN, TIN, TIN, TIN], 0, DEP), placed];
  },
  /** метраж: фасадная рама WT/WB × H + боковая рама (три элемента, наклонный — по оси, стыки «в ус») */
  profileLength(p) {
    const r = findIn(PROFILES, p.profile), t = r.b, { outer } = geo(p);
    return sum(frameMembers(outer, [t, t, t, t])) + sum(frameMembers(sideOuter(p, r), [t, t, t, t], [3]));
  },
  expectBBox: (p) => [Math.max(p.WT, p.WB), Math.max(p.DT, p.DB), p.H],
  view: { az: 35, el: 18 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const { WT, WB, DT, DB, H } = p, { Wmax, x0b, x0t } = geo(p), O = 80 * k, Od = 120 * k;
    return [
      dimAB([x0b, 0, 0], [x0b + WB, 0, 0], [x0b, -O, 0], [x0b + WB, -O, 0], `${WB} мм`),
      dimAB([x0t, 0, H], [x0t + WT, 0, H], [x0t, 0, H + O], [x0t + WT, 0, H + O], `${WT} мм`),
      dimAB([x0b, 0, 0], [x0t, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`),
      dimAB([Wmax, 0, 0], [Wmax, DB, 0], [Wmax + Od, 0, 0], [Wmax + Od, DB, 0], `${DB} мм`, 0, 1),
      dimAB([Wmax, 0, H], [Wmax, DT, H], [Wmax + Od, 0, H], [Wmax + Od, DT, H], `${DT} мм`, 30),
    ];
  },
  textLines: (p) => ["Ножка 0106", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`,
    `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Глубина верха: ${p.DT} мм`, `Глубина низа: ${p.DB} мм`, `Высота: ${p.H} мм`],
};
