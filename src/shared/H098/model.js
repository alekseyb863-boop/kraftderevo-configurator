// H098 Подстолье для кухонного стола (вариант заказчика). мм, Z вверх, основание на Z=0, по центру в XY.
// Четыре ножки P×P на всю высоту (вровень с контуром) + верхняя рамка из четырёх царг P×P между ножками, верх вровень.
// PREVIEW (не чертёж заказа): без номера заказа и без центрального текста.
import { box } from "../lib/model.js";
import { SQUARES, range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dim } from "../render/dimhelpers.js";

const controls = [range("L", "Длина", 600, 2400, 10, 1200), range("D", "Ширина", 400, 1200, 10, 700), range("H", "Высота", 300, 1100, 10, 710),
  profileCtl("40x40", "profile", "Профиль", SQUARES), colorCtl("RAL 9001 cream")];
export const spec = {
  id: "H098", type: "Подстолье", name: "Подстолье Н098", about: "Подстолье для кухонного стола: 4 ножки и верхняя рамка", controls,
  normalize(raw) { const { p, warnings } = baseNormalize(controls, raw); return { p, warnings }; },
  parts(p) {
    const P = findIn(SQUARES, p.profile).a, { L, D, H } = p, hx = L / 2, hy = D / 2, s = (a, b) => (a <= b ? [a, b] : [b, a]), out = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const [xa, xb] = s(sx * hx, sx * (hx - P)), [ya, yb] = s(sy * hy, sy * (hy - P)); out.push(box(xa, xb, ya, yb, 0, H)); }
    for (const sy of [-1, 1]) { const [ya, yb] = s(sy * hy, sy * (hy - P)); out.push(box(-hx + P, hx - P, ya, yb, H - P, H)); }
    for (const sx of [-1, 1]) { const [xa, xb] = s(sx * hx, sx * (hx - P)); out.push(box(xa, xb, -hy + P, hy - P, H - P, H)); }
    return out;
  },
  expectBBox: (p) => [p.L, p.D, p.H],
  view: { az: 30, el: 22 }, layout: "table",
  dims(p, k = 1) {
    const { L, D, H } = p, hx = L / 2, hy = D / 2, O = 130 * k;
    return [dim([-hx, -hy, 0], [hx, -hy, 0], `${L} мм`, [0, -O, 0]), dim([hx, -hy, 0], [hx, hy, 0], `${D} мм`, [O, 0, 0]), dim([-hx, -hy, 0], [-hx, -hy, H], `${H} мм`, [-O, 0, 0])];
  },
  textLines: (p) => ["Подстолье Н098", `Профиль ${findIn(SQUARES, p.profile).label} мм`, `Цвет: ${p.color}`, `Длина: ${p.L} мм`, `Ширина: ${p.D} мм`, `Высота: ${p.H} мм`],
};
