// H050 Ножка для барной стойки: замкнутая трапеция из профиля (по умолчанию 50×25: 25 в плоскости, 50 в глубину), верх 500, низ 200, высота 1000.
import { frame } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [range("WT", "Ширина верха", 250, 1200, 10, 500), range("WB", "Ширина низа", 100, 1200, 10, 200), range("H", "Высота", 400, 1500, 10, 1000),
  profileCtl("50x25"), colorCtl("черный")];
const outer = (p) => { const d = (p.WT - p.WB) / 2; return [[d, 0], [d + p.WB, 0], [p.WT, p.H], [0, p.H]]; };
export const spec = {
  id: "H050", type: "Ножка", name: "Ножка Н050", about: "Ножка для барной стойки: замкнутая трапеция (низ уже верха)", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), pr = findIn(PROFILES, p.profile);
    if (p.WB > p.WT) { warnings.push(`«Ширина низа» не может быть больше ширины верха: ${p.WB} → ${p.WT} мм.`); p.WB = p.WT; }
    relax(p, controls, (q) => q.WB <= q.WT && frameFeasible(outer(q), [pr.b, pr.b, pr.b, pr.b]), [["WB", 10, "WT"], ["WT", 10], ["H", 10]], warnings, "иначе профиль не помещается");
    return { p, warnings };
  },
  parts(p) { const pr = findIn(PROFILES, p.profile); return [frame(outer(p), [pr.b, pr.b, pr.b, pr.b], 0, pr.a)]; },
  expectBBox: (p) => [p.WT, findIn(PROFILES, p.profile).a, p.H],
  view: { az: 50, el: 16 }, layout: "forms",
  dims(p, k = 1) {
    const { WT, WB, H } = p, d = (WT - WB) / 2, O = 90 * k;
    return [dimAB([d, 0, 0], [d + WB, 0, 0], [d, -O, 0], [d + WB, -O, 0], `${WB} мм`, WB <= 250 ? 135 : 0),
      dimAB([0, 0, H], [WT, 0, H], [0, 0, H + O], [WT, 0, H + O], `${WT} мм`),
      dimAB([0, 0, 0], [0, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`)];
  },
  textLines: (p) => ["Ножка Н050", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`, `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Высота: ${p.H} мм`],
};
