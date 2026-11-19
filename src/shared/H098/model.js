// H098 Подстолье для кухонного стола (вариант заказчика). мм, Z вверх, основание на Z=0, по центру в XY.
// Четыре ножки A×B на всю высоту (вровень с контуром) + верхняя рамка из четырёх царг между ножками, верх вровень.
// Блок «Дополнительно»: N доп. балок поперёк (между длинными царгами), верх вровень с рамкой, равные промежутки между торцевыми царгами.
// PREVIEW (не чертёж заказа): без номера заказа и без центрального текста.
import { box } from "../lib/model.js";
import { SQUARES, PROFILES, range, profileCtl, colorCtl, intCtl, findIn, baseNormalize } from "../lib/params.js";
import { dim } from "../render/dimhelpers.js";

// профили: квадратные + прямоугольные a×b (60×30 …). Прямоугольный стоит «на ребре»: у царг и доп. балок a — по высоте, b — по ширине;
// у ножек a — вдоль длины стола (X), b — вдоль ширины (Y). Для квадратных a = b — геометрия прежняя.
const PROFS = [...SQUARES, ...PROFILES.filter((x) => x.a !== x.b)];
const prof = (p) => findIn(PROFS, p.profile);
const controls = [range("L", "Длина", 600, 2400, 10, 1200), range("D", "Ширина", 400, 1200, 10, 700), range("H", "Высота", 300, 1100, 10, 710),
  profileCtl("40x40", "profile", "Профиль", PROFS), colorCtl("черный"),
  { ...intCtl("nBeams", "Кол-во доп. балок", 0, 5, 0), extra: true }];
/** x-интервалы доп. балок шириной B: внутренняя длина между торцевыми царгами L−2B делится на N+1 равных промежутков */
const beamXs = (L, B, n) => { const g = (L - 2 * B - n * B) / (n + 1); return Array.from({ length: n }, (_, i) => { const a = -L / 2 + B + (i + 1) * g + i * B; return [a, a + B]; }); };
export const spec = {
  id: "H098", type: "Подстолье", category: "Подстолья", name: "Подстолье Н098", about: "Подстолье для кухонного стола: 4 ножки и верхняя рамка", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), B = prof(p).b;
    const max = Math.max(0, Math.floor((p.L - 3 * B) / (2 * B)));               // промежуток между балками — не меньше ширины профиля
    if (p.nBeams > max) { warnings.push(`«Кол-во доп. балок»: ${p.nBeams} → ${max} (при длине ${p.L} мм и профиле ${prof(p).label} иначе промежутки меньше профиля).`); p.nBeams = max; }
    return { p, warnings };
  },
  parts(p) {
    const { a: A, b: B } = prof(p), { L, D, H } = p, hx = L / 2, hy = D / 2, s = (a, b) => (a <= b ? [a, b] : [b, a]), out = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const [xa, xb] = s(sx * hx, sx * (hx - A)), [ya, yb] = s(sy * hy, sy * (hy - B)); out.push(box(xa, xb, ya, yb, 0, H)); }
    for (const sy of [-1, 1]) { const [ya, yb] = s(sy * hy, sy * (hy - B)); out.push(box(-hx + A, hx - A, ya, yb, H - A, H)); }   // длинные царги: A по высоте
    for (const sx of [-1, 1]) { const [xa, xb] = s(sx * hx, sx * (hx - B)); out.push(box(xa, xb, -hy + B, hy - B, H - A, H)); }   // торцевые царги: вровень снаружи
    for (const [xa, xb] of beamXs(L, B, p.nBeams)) out.push(box(xa, xb, -hy + B, hy - B, H - A, H));
    return out;
  },
  /** метраж: 4 ножки + верхняя рамка + доп. балки */
  profileLength(p) { const { a: A, b: B } = prof(p); return 4 * p.H + 2 * (p.L - 2 * A) + (2 + p.nBeams) * (p.D - 2 * B); },
  expectBBox: (p) => [p.L, p.D, p.H],
  view: { az: 30, el: 22 }, layout: "table",
  dims(p, k = 1) {
    const { L, D, H } = p, hx = L / 2, hy = D / 2, O = 130 * k;
    return [dim([-hx, -hy, 0], [hx, -hy, 0], `${L} мм`, [0, -O, 0]), dim([hx, -hy, 0], [hx, hy, 0], `${D} мм`, [O, 0, 0]), dim([-hx, -hy, 0], [-hx, -hy, H], `${H} мм`, [-O, 0, 0])];
  },
  textLines: (p) => ["Подстолье Н098", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Длина: ${p.L} мм`, `Ширина: ${p.D} мм`, `Высота: ${p.H} мм`],
};
