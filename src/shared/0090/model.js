// Ножка 0090: X-образная стальная ножка, профиль (по умолчанию 60×30: 30 мм к зрителю, 60 мм в глубину). мм.
// XZ = плоскость X (ширина 800, высота 1100), Y = 60 (глубина). Основание Z=0, X 0..800, Y 0..60. Чёрная.
import { prism, bisect } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize, relax } from "../lib/params.js";
import { dim } from "../render/dimhelpers.js";

const controls = [range("W", "Ширина", 400, 1400, 10, 800), range("H", "Высота", 400, 1400, 10, 1100), profileCtl("60x30"), colorCtl("черный")];
// наклон оси прута от вертикали: горизонтальная ширина сечения wh = B/cos(a), dx = W - wh на dz = H
const geo = (p) => { const { a: T, b: B } = findIn(PROFILES, p.profile), alpha = bisect((a) => Math.tan(a) * p.H + B / Math.cos(a) - p.W, 0, 1.55); return { T, B, alpha, WH: B / Math.cos(alpha) }; };
export const spec = {
  id: "0090", type: "Ножка", category: "Ножки и опоры", name: "Ножка 0090", about: "X-образная стальная ножка из профиля", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    relax(p, controls, (q) => { const g = geo(q); return q.W > g.B + 50 && q.W - 2 * g.WH >= 40; }, [["W", 10], ["H", -10]], warnings, "иначе прутья сливаются");
    return { p, warnings };
  },
  parts(p) {
    const { T, WH } = geo(p), { W, H } = p;
    const bar = (mirror) => { let pts = [[0, H], [WH, H], [W, 0], [W - WH, 0]]; if (mirror) pts = pts.map(([x, z]) => [W - x, z]); return prism(pts, 0, T); };
    return [bar(false), bar(true)];
  },
  expectBBox: (p) => [p.W, geo(p).T, p.H],
  view: { az: 48, el: 18 }, layout: "leg",
  dims(p, k = 1) { const O = 110 * k; return [dim([0, 0, 0], [p.W, 0, 0], `${p.W} мм`, [0, -O, 0]), dim([0, 0, 0], [0, 0, p.H], `${p.H} мм`, [-O, 0, 0])]; },
  textLines: (p) => ["Ножка 0090", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`, `Ширина: ${p.W} мм`, `Высота: ${p.H} мм`],
};
