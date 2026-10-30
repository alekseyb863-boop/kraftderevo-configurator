// H030-2 Ножка: одиночная ножка из профиля (по умолчанию 40×40), высота 1000 с верхней пластиной 4 мм 80×80.
import { box } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [range("H", "Высота", 200, 1200, 10, 1000), profileCtl("40x40"), range("PS", "Пластина, сторона", 60, 150, 5, 80), range("PT", "Пластина, толщина", 3, 10, 1, 4), colorCtl("черный")];
export const spec = {
  id: "H030-2", type: "Ножка", category: "Ножки и опоры", name: "Ножка Н030-2", about: "Одиночная ножка из профиля с верхней пластиной", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), pr = findIn(PROFILES, p.profile), need = Math.ceil((Math.max(pr.a, pr.b) + 10) / 5) * 5;
    if (p.PS < need) { warnings.push(`«Пластина, сторона»: ${p.PS} → ${need} мм (пластина должна выступать за профиль ${pr.label}).`); p.PS = need; }
    return { p, warnings };
  },
  parts(p) {
    const pr = findIn(PROFILES, p.profile), { H, PS, PT } = p, ox = (PS - pr.b) / 2, oy = (PS - pr.a) / 2;
    return [box(ox, ox + pr.b, oy, oy + pr.a, 0, H - PT), box(0, PS, 0, PS, H - PT, H)];
  },
  expectBBox: (p) => [p.PS, p.PS, p.H],
  view: { az: 40, el: 16 }, layout: "forms",
  dims: (p, k = 1) => [dimAB([0, 0, 0], [0, 0, p.H], [-90 * k, 0, 0], [-90 * k, 0, p.H], `${p.H} мм`)],
  textLines: (p) => ["Ножка Н030-2", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`, `Высота: ${p.H} мм`],
};
