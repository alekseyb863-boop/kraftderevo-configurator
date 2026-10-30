// H005 Ножки для обеденного стола: трапеция из профиля (по умолчанию 80×40: 40 в плоскости, 80 в глубину) без нижней перемычки.
// Верх (наружный) 550, низ 650, высота 710.  Ножки наклонены внутрь к верху.
import { frame } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [range("WB", "Ширина низа", 300, 1200, 10, 650), range("WT", "Ширина верха", 200, 1200, 10, 550), range("H", "Высота", 300, 1100, 10, 710),
  profileCtl("80x40", "profile", "Профиль"), colorCtl("черный")];
const outer = (p) => { const d = (p.WB - p.WT) / 2; return [[0, 0], [p.WB, 0], [p.WB - d, p.H], [d, p.H]]; };
export const spec = {
  id: "H005", type: "Ножка", category: "Ножки и опоры", name: "Ножка Н005", about: "Ножки для обеденного стола: трапеция без нижней перемычки", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), pr = findIn(PROFILES, p.profile);
    if (p.WT > p.WB) { warnings.push(`«Ширина верха» не может быть больше ширины низа: ${p.WT} → ${p.WB} мм.`); p.WT = p.WB; }
    relax(p, controls, (q) => q.WT <= q.WB && frameFeasible(outer(q), [0, pr.b, pr.b, pr.b]), [["WT", 10, "WB"], ["WB", 10], ["H", 10]], warnings, "иначе профиль не помещается");
    if (p.WT > p.WB) p.WT = p.WB;
    return { p, warnings };
  },
  parts(p) {
    const pr = findIn(PROFILES, p.profile);
    // рёбра: 0 низ (открыт), 1 правая ножка, 2 верх, 3 левая
    return [frame(outer(p), [0, pr.b, pr.b, pr.b], 0, pr.a, [0])];
  },
  expectBBox: (p) => [p.WB, findIn(PROFILES, p.profile).a, p.H],
  view: { az: 50, el: 16 }, layout: "forms",
  dims(p, k = 1) {
    const { WB, WT, H } = p, d = (WB - WT) / 2, O = 80 * k;
    return [dimAB([0, 0, 0], [WB, 0, 0], [0, -O, 0], [WB, -O, 0], `${WB} мм`), dimAB([d, 0, H], [WB - d, 0, H], [d, 0, H + O], [WB - d, 0, H + O], `${WT} мм`),
      dimAB([0, 0, 0], [d, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`)];
  },
  textLines: (p) => ["Ножка Н005", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`, `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Высота: ${p.H} мм`],
};
