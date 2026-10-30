// H028 Ножки для стола: прямоугольная рама из профиля (по умолчанию 40×20: 20 в плоскости, 40 в глубину), 600 × 710, плюс боковая рама
// (верхняя и нижняя перемычки, задняя стойка) глубиной 230 от середины верхней/нижней перемычек.
import { frame, box } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [range("W", "Ширина", 250, 1000, 10, 600), range("H", "Высота", 300, 1100, 10, 710), range("D", "Глубина", 100, 700, 10, 230),
  profileCtl("40x20"), colorCtl("лофт")];
export const spec = {
  id: "H028", type: "Ножка", category: "Ножки и опоры", name: "Ножка Н028", about: "Ножки для стола: рама с боковой рамой глубиной D", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    relax(p, controls, (q) => { const r = findIn(PROFILES, q.profile); return frameFeasible([[0, 0], [q.W, 0], [q.W, q.H], [0, q.H]], [r.b, r.b, r.b, r.b], 20) && q.D >= r.a + r.b + 30 && q.H >= 2 * r.b + 40; },
      [["D", 10], ["H", 10], ["W", 10]], warnings, "иначе профиль не помещается");
    return { p, warnings };
  },
  parts(p) {
    const { a: DEP, b: TIN } = findIn(PROFILES, p.profile), { W, H, D } = p, cx0 = W / 2 - DEP / 2, cx1 = W / 2 + DEP / 2;
    return [frame([[0, 0], [W, 0], [W, H], [0, H]], [TIN, TIN, TIN, TIN], 0, DEP),
      box(cx0, cx1, DEP, D, 0, TIN), box(cx0, cx1, DEP, D, H - TIN, H), box(cx0, cx1, D - TIN, D, TIN, H - TIN)];
  },
  expectBBox: (p) => [p.W, p.D, p.H],
  view: { az: 35, el: 18 }, layout: "forms",
  dims(p, k = 1) {
    const { W, H, D } = p, O = 80 * k;
    return [dimAB([0, 0, 0], [W, 0, 0], [0, -O, 0], [W, -O, 0], `${W} мм`), dimAB([0, 0, 0], [0, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`),
      dimAB([W, 0, 0], [W, D, 0], [W + O, 0, 0], [W + O, D, 0], `${D} мм`)];
  },
  textLines: (p) => ["Ножка Н028", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`, `Ширина: ${p.W} мм`, `Глубина: ${p.D} мм`, `Высота: ${p.H} мм`],
};
