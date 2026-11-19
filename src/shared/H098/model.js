// H098 Подстолье для кухонного стола (вариант заказчика). мм, Z вверх, основание на Z=0, по центру в XY.
// Четыре ножки P×P на всю высоту (вровень с контуром) + верхняя рамка из четырёх царг P×P между ножками, верх вровень.
// Блок «Дополнительно»: N доп. балок P×P поперёк (между длинными царгами), верх вровень с рамкой, равные промежутки между торцевыми царгами.
// PREVIEW (не чертёж заказа): без номера заказа и без центрального текста.
import { box } from "../lib/model.js";
import { SQUARES, range, profileCtl, colorCtl, intCtl, findIn, baseNormalize } from "../lib/params.js";
import { dim } from "../render/dimhelpers.js";

const controls = [range("L", "Длина", 600, 2400, 10, 1200), range("D", "Ширина", 400, 1200, 10, 700), range("H", "Высота", 300, 1100, 10, 710),
  profileCtl("40x40", "profile", "Профиль", SQUARES), colorCtl("черный"),
  { ...intCtl("nBeams", "Кол-во доп. балок", 0, 5, 0), extra: true }];
/** x-интервалы доп. балок: внутренняя длина L−2P делится на N+1 равных промежутков */
const beamXs = (L, P, n) => { const g = (L - 2 * P - n * P) / (n + 1); return Array.from({ length: n }, (_, i) => { const a = -L / 2 + P + (i + 1) * g + i * P; return [a, a + P]; }); };
export const spec = {
  id: "H098", type: "Подстолье", category: "Подстолья", name: "Подстолье Н098", about: "Подстолье для кухонного стола: 4 ножки и верхняя рамка", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), P = findIn(SQUARES, p.profile).a;
    const max = Math.max(0, Math.floor((p.L - 3 * P) / (2 * P)));               // промежуток между балками — не меньше профиля
    if (p.nBeams > max) { warnings.push(`«Кол-во доп. балок»: ${p.nBeams} → ${max} (при длине ${p.L} мм и профиле ${findIn(SQUARES, p.profile).label} иначе промежутки меньше профиля).`); p.nBeams = max; }
    return { p, warnings };
  },
  parts(p) {
    const P = findIn(SQUARES, p.profile).a, { L, D, H } = p, hx = L / 2, hy = D / 2, s = (a, b) => (a <= b ? [a, b] : [b, a]), out = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const [xa, xb] = s(sx * hx, sx * (hx - P)), [ya, yb] = s(sy * hy, sy * (hy - P)); out.push(box(xa, xb, ya, yb, 0, H)); }
    for (const sy of [-1, 1]) { const [ya, yb] = s(sy * hy, sy * (hy - P)); out.push(box(-hx + P, hx - P, ya, yb, H - P, H)); }
    for (const sx of [-1, 1]) { const [xa, xb] = s(sx * hx, sx * (hx - P)); out.push(box(xa, xb, -hy + P, hy - P, H - P, H)); }
    for (const [xa, xb] of beamXs(L, P, p.nBeams)) out.push(box(xa, xb, -hy + P, hy - P, H - P, H));
    return out;
  },
  /** метраж: 4 ножки + верхняя рамка + доп. балки */
  profileLength(p) { const P = findIn(SQUARES, p.profile).a; return 4 * p.H + 2 * (p.L - 2 * P) + (2 + p.nBeams) * (p.D - 2 * P); },
  expectBBox: (p) => [p.L, p.D, p.H],
  view: { az: 30, el: 22 }, layout: "table",
  dims(p, k = 1) {
    const { L, D, H } = p, hx = L / 2, hy = D / 2, O = 130 * k;
    return [dim([-hx, -hy, 0], [hx, -hy, 0], `${L} мм`, [0, -O, 0]), dim([hx, -hy, 0], [hx, hy, 0], `${D} мм`, [O, 0, 0]), dim([-hx, -hy, 0], [-hx, -hy, H], `${H} мм`, [-O, 0, 0])];
  },
  textLines: (p) => ["Подстолье Н098", `Профиль ${findIn(SQUARES, p.profile).label} мм`, `Цвет: ${p.color}`, `Длина: ${p.L} мм`, `Ширина: ${p.D} мм`, `Высота: ${p.H} мм`],
};
