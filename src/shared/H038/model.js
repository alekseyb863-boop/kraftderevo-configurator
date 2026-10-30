// H038 Журнальные ножки из полосы: замкнутый прямоугольник, согнутый из полосы (по умолчанию 60×6: 6 в плоскости, 60 в глубину), 600 × 400.
import { frame } from "../lib/model.js";
import { STRIPS, range, stripCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [range("W", "Ширина", 150, 1200, 10, 600), range("H", "Высота", 150, 900, 10, 400), stripCtl("60x6", "strip", "Полоса"), colorCtl("черный")];
export const spec = {
  id: "H038", type: "Ножка", name: "Ножка Н038", about: "Журнальные ножки: прямоугольник, согнутый из полосы", controls,
  normalize(raw) { const { p, warnings } = baseNormalize(controls, raw); return { p, warnings }; },
  parts(p) { const st = findIn(STRIPS, p.strip), { W, H } = p; return [frame([[0, 0], [W, 0], [W, H], [0, H]], [st.b, st.b, st.b, st.b], 0, st.a)]; },
  expectBBox: (p) => [p.W, findIn(STRIPS, p.strip).a, p.H],
  view: { az: 50, el: 16 }, layout: "forms",
  dims(p, k = 1) {
    const { W, H } = p, O = 70 * k;
    return [dimAB([0, 0, 0], [W, 0, 0], [0, -O, 0], [W, -O, 0], `${W} мм`), dimAB([0, 0, 0], [0, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`)];
  },
  textLines: (p) => ["Ножка Н038", `Полоса ${findIn(STRIPS, p.strip).label} мм`, `Цвет: ${p.color}`, `Ширина: ${p.W} мм`, `Высота: ${p.H} мм`],
};
