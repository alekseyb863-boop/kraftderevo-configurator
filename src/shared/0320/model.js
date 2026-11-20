// 0320 Подстолье целиком: как Н114, но без нижней балки, а ножки — замкнутые трапеции (широкие сверху, узкие снизу). мм, Z вверх, по центру в XY, основание на Z = 0.
//
// ОСИ. X — длина стола (вдоль балок), Y — ширина стола, Z — вверх.
// НОЖКА: замкнутая рама-трапеция из профиля a×b (a — вдоль X, «вглубь рамы»; b — в плоскости рамы), стыки «в ус»:
//   верхняя перекладина шириной WT («Ширина верха», по Y), нижняя (на полу) — WB («Ширина низа»), две наклонные стойки, высота H.
//   Строится в плоскости XZ (frame) и поворачивается в YZ, как у Н114. Левая ножка x ∈ [0, a], правая x ∈ [L − a, L].
// L «Длина» — от наружной грани левой ножки до наружной грани правой.  S «Отступ от края» — как у Н114, от краёв верхней перекладины (ширина WT).
// Верхние балки: профиль лёжа (ширина по Y = a, высота по Z = b), верх вровень с ножками, x ∈ [a, L − a], y ∈ [S, S + a] и [WT − S − a, WT − S].
// Ограничения: WB ≤ WT; трапеция должна вмещать профиль (frameFeasible); S ≤ ⌊(WT − 2a − GAP_MIN)/2⌋ (зазор между верхними балками ≥ 20 мм).
import { PROFILES_BASE, range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { box, free, frame } from "../lib/model.js";
import { dim, dimAB } from "../render/dimhelpers.js";
import { frameMembers, sum } from "../lib/length.js";

export const GAP_MIN = 20;
const prof = (p) => findIn(PROFILES_BASE, p.profile);
export const maxOffset = (W, a) => Math.floor((W - 2 * a - GAP_MIN) / 2);
const controls = [range("L", "Длина", 600, 3000, 10, 1600), range("WT", "Ширина верха", 200, 1000, 10, 710), range("WB", "Ширина низа", 150, 1000, 10, 410),
  range("H", "Высота", 300, 1100, 10, 710), range("S", "Отступ от края", 0, 460, 5, 100), profileCtl("60x30", "profile", "Профиль", PROFILES_BASE), colorCtl("черный")];
/** наружный контур ножки в плоскости (ширина, высота), против часовой: низ, правая стойка, верх, левая стойка */
const outer = (p) => { const d = (p.WT - p.WB) / 2; return [[d, 0], [d + p.WB, 0], [p.WT, p.H], [0, p.H]]; };

export const spec = {
  id: "0320", type: "Подстолье", category: "Подстолья", name: "Подстолье 0320", about: "Подстолье целиком: 2 ножки-трапеции (шире сверху) и 2 верхние балки, без нижней балки", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), { a, b } = prof(p);
    if (p.WB > p.WT) { warnings.push(`«Ширина низа» не может быть больше ширины верха: ${p.WB} → ${p.WT} мм.`); p.WB = p.WT; }
    relax(p, controls, (q) => q.WB <= q.WT && frameFeasible(outer(q), [b, b, b, b]), [["WB", 10, "WT"], ["WT", 10], ["H", 10]], warnings, "иначе профиль не помещается");
    if (p.WB > p.WT) p.WB = p.WT;
    const max = maxOffset(p.WT, a);
    if (p.S > max) {
      warnings.push(`«Отступ от края»: максимум при ширине верха ${p.WT} мм и профиле ${prof(p).label} — ${max} мм (между верхними балками остаётся зазор ${GAP_MIN} мм): ${p.S} → ${max} мм.`);
      p.S = Math.max(0, max);
    }
    return { p, warnings };
  },
  derive: (p) => { const a = prof(p).a; return { clear: p.L - 2 * a, maxOffset: maxOffset(p.WT, a), gap: p.WT - 2 * p.S - 2 * a }; },
  parts(p) {
    const { a, b } = prof(p), { L, WT, H, S } = p;
    const rot = (s) => { const r = s.rotate(90, [0, 0, 0], [0, 0, 1]); free(s); return r; };        // плоскость рамы XZ (глубина +Y) -> YZ (глубина x ∈ [-a, 0])
    const left = rot(frame(outer(p), [b, b, b, b], 0, a)).translate([a, 0, 0]), right = left.clone().translate([L - a, 0, 0]);
    const parts = [left, right, box(a, L - a, S, S + a, H - b, H), box(a, L - a, WT - S - a, WT - S, H - b, H)];
    return parts.map((s) => s.translate([-L / 2, -WT / 2, 0]));
  },
  /** метраж: 2 рамы-трапеции (по оси, наклонные стойки — по своей оси) + 2 верхние балки */
  profileLength(p) { const { a, b } = prof(p); return 2 * sum(frameMembers(outer(p), [b, b, b, b])) + 2 * (p.L - 2 * a); },
  expectBBox: (p) => [p.L, p.WT, p.H],
  view: { az: 30, el: 22 }, layout: "table", shaded: true, auto: true,
  dims(p, k = 1) {
    const { L, WT, WB, H } = p, hx = L / 2, hy = WT / 2, hb = WB / 2, O = 130 * k;
    return [
      dim([-hx, -hy, H], [-hx, hy, H], `${WT} мм`, [0, 0, O]),                                     // ширина верха — над левой ножкой
      dim([-hx, hy, H], [hx, hy, H], `${L} мм`, [0, 0, O]),                                        // длина — над дальней балкой
      dimAB([-hx, -hb, 0], [-hx, -hy, H], [-hx, -hy - O, 0], [-hx, -hy - O, H], `${H} мм`),       // высота — слева
      dim([-hx, -hb, 0], [-hx, hb, 0], `${WB} мм`, [2 * O, 0, 0]),                                      // ширина низа — у нижней перекладины левой ножки
    ];
  },
  textLines: (p) => ["Подстолье 0320", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Длина: ${p.L} мм`, `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Высота: ${p.H} мм`, `Отступ от края: ${p.S} мм`],
};
