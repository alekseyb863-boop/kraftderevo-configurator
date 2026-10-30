// H112 Опора-трапеция: профиль (по умолчанию 50×25), низ 600, верх 500; нижняя перемычка = профиль,
// верх = полоса-пластина (по умолчанию 80×8, длина = ширина низа), лежит плашмя на ножках. Общая высота 710 с пластиной.
import { frame, box } from "../lib/model.js";
import { PROFILES, STRIPS, range, profileCtl, stripCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [range("WB", "Ширина низа", 300, 1200, 10, 600), range("WT", "Ширина верха", 200, 1200, 10, 500), range("H", "Высота", 300, 1100, 10, 710),
  profileCtl("50x25"), stripCtl("80x8", "strip", "Полоса (верх)"), colorCtl("черный")];
const geo = (p) => { const pr = findIn(PROFILES, p.profile), st = findIn(STRIPS, p.strip); return { TIN: pr.b, DEP: pr.a, PL_D: st.a, PL_T: st.b, PL_L: p.WB, d: (p.WB - p.WT) / 2, HL: p.H - st.b }; };
const outer = (p) => { const g = geo(p); return [[0, 0], [p.WB, 0], [p.WB - g.d, g.HL], [g.d, g.HL]]; };
export const spec = {
  id: "H112", type: "Опора", name: "Опора Н112", about: "Опора-трапеция с верхней полосой-пластиной", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    let g = geo(p);
    if (g.PL_D < g.DEP) {                               // полоса уже профиля -> берём самую узкую подходящую
      const st = STRIPS.find((s) => s.a >= g.DEP) || STRIPS[STRIPS.length - 1];
      warnings.push(`Полоса ${findIn(STRIPS, p.strip).label} уже профиля ${findIn(PROFILES, p.profile).label} (глубина ${g.DEP} мм): выбрана полоса ${st.label}.`);
      p.strip = st.id; g = geo(p);
    }
    if (p.WT > p.WB) { warnings.push(`«Ширина верха» не может быть больше ширины низа: ${p.WT} → ${p.WB} мм.`); p.WT = p.WB; }
    relax(p, controls, (q) => q.WT <= q.WB && frameFeasible(outer(q), [geo(q).TIN, geo(q).TIN, 0, geo(q).TIN]), [["WT", 10, "WB"], ["WB", 10], ["H", 10]], warnings, "иначе профиль не помещается");
    return { p, warnings };
  },
  parts(p) {
    const { TIN, DEP, PL_D, PL_T, PL_L, HL } = geo(p), { WB, H } = p;
    return [frame(outer(p), [TIN, TIN, 0, TIN], (PL_D - DEP) / 2, (PL_D + DEP) / 2, [2]), box((WB - PL_L) / 2, (WB + PL_L) / 2, 0, PL_D, HL, H)];
  },
  expectBBox: (p) => [geo(p).PL_L, geo(p).PL_D, p.H],
  view: { az: 50, el: 16 }, layout: "forms",
  dims(p, k = 1) {
    const { WB, WT, H } = p, d = (WB - WT) / 2, O = 80 * k;
    return [dimAB([d, 0, H], [WB - d, 0, H], [d, 0, H + O], [WB - d, 0, H + O], `${WT} мм`),
      dimAB([0, 0, 0], [WB, 0, 0], [0, -O, 0], [WB, -O, 0], `${WB} мм`),
      dimAB([0, 0, 0], [0, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`)];
  },
  textLines: (p) => ["Опора Н112", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Полоса ${findIn(STRIPS, p.strip).label} мм (верх)`, `Цвет: ${p.color}`,
    `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Высота: ${p.H} мм`],
};
