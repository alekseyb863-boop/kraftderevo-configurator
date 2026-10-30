// Ножка 0011: стальная полоса (по умолчанию 80×6), согнутая в Z + вторая диагональ. мм. Плоскость ножки XZ (800 × 1100), глубина Y = 80 (ширина полосы),
// толщина полосы 6 в плоскости XZ. Верхняя планка z 1094..1100, нижняя z 0..6, Z-диагональ из левого верхнего в правый нижний угол
// (наружные углы в углах прямоугольника), задняя соединительная полоса: её грань (ширина полосы) лежит в плоскости ножки за Z (y T-B..T).
import { prism, bisect } from "../lib/model.js";
import { STRIPS, range, stripCtl, colorCtl, findIn, baseNormalize, relax } from "../lib/params.js";
import { dim } from "../render/dimhelpers.js";

const controls = [range("W", "Ширина", 400, 1400, 10, 800), range("H", "Высота", 400, 1400, 10, 1100), stripCtl("80x6", "strip", "Полоса"), colorCtl("черный")];
const geo = (p) => {
  const { a: T, b: B } = findIn(STRIPS, p.strip), { W, H } = p, W2 = T;                            // B = толщина полосы в плоскости, T = глубина (ширина полосы)
  const ALPHA = bisect((a) => Math.tan(a) * H + B / Math.cos(a) - W, 0, 1.55), WH = B / Math.cos(ALPHA);   // наклон Z-диагонали от вертикали
  const H2 = H - 2 * B, BETA = bisect((a) => Math.tan(a) * H2 + W2 / Math.cos(a) - W, 0, 1.55), WH2 = W2 / Math.cos(BETA);
  return { T, B, W2, ALPHA, WH, H2, BETA, WH2 };
};
export const spec = {
  id: "0011", type: "Ножка", name: "Ножка 0011", about: "Стальная полоса, согнутая в Z, плюс вторая диагональ", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    relax(p, controls, (q) => { const g = geo(q); return q.W > g.W2 + 60 && q.W > g.WH2 + 60 && q.H > 6 * g.B + 100; }, [["W", 10], ["H", 10]], warnings, "иначе диагонали не помещаются");
    return { p, warnings };
  },
  parts(p) {
    const { T, B, ALPHA, WH, WH2 } = geo(p), { W, H } = p, ta = Math.tan(ALPHA);
    // планки срезаны под углом по наружной грани Z-диагонали: нижняя грань нижней планки сходится с правой/наружной гранью диагонали в (W,0),
    // верхняя грань верхней планки с левой/наружной гранью в (0,H); за наружный контур ничего не выступает.
    const top = prism([[0, H], [W, H], [W, H - B], [B * ta, H - B]], 0, T);
    const bot = prism([[0, 0], [W, 0], [W - B * ta, B], [0, B]], 0, T);
    const d1 = prism([[0, H], [WH, H], [W, 0], [W - WH, 0]], 0, T);
    const d2 = prism([[W, H - B], [W - WH2, H - B], [0, B], [WH2, B]], T - B, T);      // задняя полоса y T-B..T
    return [top, bot, d1, d2];
  },
  expectBBox: (p) => [p.W, geo(p).T, p.H],
  view: { az: 40, el: 20 }, layout: "leg",
  dims(p, k = 1) { const O = 110 * k; return [dim([0, 0, 0], [p.W, 0, 0], `${p.W} мм`, [0, -O, 0]), dim([0, 0, 0], [0, 0, p.H], `${p.H} мм`, [-O, 0, 0])]; },
  textLines: (p) => ["Ножка 0011", `Полоса ${findIn(STRIPS, p.strip).label} мм`, `Цвет: ${p.color}`, `Ширина: ${p.W} мм`, `Высота: ${p.H} мм`],
};
