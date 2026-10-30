// H043 Ножки для стола (U без верхней перемычки): профиль (по умолчанию 50×25: 25 в плоскости, 50 в глубину), низ 500, верх 555,
// высота 710 с верхними пластинами 4 мм 80×80.
import { frame, box } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [range("WB", "Ширина низа", 200, 1000, 5, 500), range("WT", "Ширина верха", 250, 1200, 5, 555), range("H", "Высота", 300, 1100, 10, 710),
  profileCtl("50x25"), range("PS", "Пластина, сторона", 60, 150, 5, 80), range("PT", "Пластина, толщина", 3, 10, 1, 4), colorCtl("черный")];
const geo = (p) => {
  const pr = findIn(PROFILES, p.profile), d = (p.WT - p.WB) / 2, HL = p.H - p.PT, TIN = pr.b;
  return { TIN, DEP: pr.a, d, HL, wh: TIN / Math.cos(Math.atan2(d, HL)) };            // wh = горизонтальная ширина сечения ножки
};
const outer = (p) => { const g = geo(p); return [[g.d, 0], [g.d + p.WB, 0], [p.WT, g.HL], [0, g.HL]]; };
export const spec = {
  id: "H043", type: "Ножка", category: "Ножки и опоры", name: "Ножка Н043", about: "Ножки для стола: U-образные, с верхними пластинами", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), pr = findIn(PROFILES, p.profile), need = Math.ceil((pr.a + 10) / 5) * 5;
    if (p.PS < need) { warnings.push(`«Пластина, сторона»: ${p.PS} → ${need} мм (пластина должна перекрывать профиль ${pr.label}).`); p.PS = need; }
    if (p.WB > p.WT) { warnings.push(`«Ширина низа» не может быть больше ширины верха: ${p.WB} → ${p.WT} мм.`); p.WB = p.WT; }
    relax(p, controls, (q) => q.WB <= q.WT && frameFeasible(outer(q), [geo(q).TIN, geo(q).TIN, 0, geo(q).TIN]), [["WB", 5, "WT"], ["WT", 5], ["H", 10]], warnings, "иначе профиль не помещается");
    return { p, warnings };
  },
  parts(p) {
    const { DEP, HL, wh } = geo(p), { WT, PS, H } = p;
    return [frame(outer(p), [geo(p).TIN, geo(p).TIN, 0, geo(p).TIN], PS / 2 - DEP / 2, PS / 2 + DEP / 2, [2]),
      ...[wh / 2, WT - wh / 2].map((cx) => box(cx - PS / 2, cx + PS / 2, 0, PS, HL, H))];
  },
  expectBBox: (p) => [p.WT - geo(p).wh + p.PS, p.PS, p.H],
  view: { az: 50, el: 16 }, layout: "forms",
  dims(p, k = 1) {
    const { WB, WT, H } = p, { d } = geo(p), O = 80 * k;
    return [dimAB([0, 0, H], [WT, 0, H], [0, 0, H + O], [WT, 0, H + O], `${WT} мм`),
      dimAB([d, 0, 0], [d + WB, 0, 0], [d, -O, 0], [d + WB, -O, 0], `${WB} мм`),
      dimAB([0, 0, 0], [0, 0, H], [-O - 40 * k, 0, 0], [-O - 40 * k, 0, H], `${H} мм`)];
  },
  textLines: (p) => ["Ножка Н043", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`, `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Высота: ${p.H} мм`],
};
