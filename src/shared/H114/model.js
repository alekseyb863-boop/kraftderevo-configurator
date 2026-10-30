// H114 Подстолье целиком (подстолье из профильной трубы, «loft»): 2 ножки Н031 + 1 нижняя балка + 2 верхние балки. мм, Z вверх, по центру в XY, основание на Z = 0.
//
// ОСИ. X — длина стола (вдоль балок), Y — ширина (глубина) стола, Z — вверх.
// НОЖКА = Н031 без изменений: прямоугольная рама W × H из профиля a×b (a — размер вдоль X, т.е. «вглубь рамы»; b — размер в плоскости рамы),
//   её параметры и модель берутся из ../H031/model.js (legFrame() → поворот плоскости рамы XZ → YZ на 90° вокруг Z). Левая ножка x ∈ [0, a], правая x ∈ [L − a, L].
//   Ширина ножки W = «Ширина» (по Y, у сайта «Глубина» 71 см), высота H = «Высота» (71 см).
//
// ПАРАМЕТРЫ И ФОРМУЛЫ.
//   L  «Длина» — габарит подстолья по X ОТ НАРУЖНОЙ грани левой ножки ДО наружной грани правой (как «Длина 160 см» в характеристиках на сайте).
//        Расстояние между ножками «в свету» = L − 2a (a — размер профиля вдоль длины, у 60×30 это 60 → в свету L − 120).
//   s  «Отступ от края» — на сколько каждая верхняя балка отступает от своего края ножки (от Y = 0 для первой, от Y = W для второй), s ≥ 0.
//        s = 0 — балки прижаты к краям (наружные грани балок вровень с наружными гранями ножек).
//   Верхние балки: профиль a×b лёжа (ширина по Y = a, высота по Z = b), верх вровень с верхом ножек (z ∈ [H − b, H]),
//        x ∈ [a, L − a] (упираются торцами во внутренние грани верхних перекладин ножек), y ∈ [s, s + a] и y ∈ [W − s − a, W − s].
//   Нижняя балка: тот же профиль лёжа, низ вровень с низом ножек (z ∈ [0, b]), x ∈ [a, L − a], по центру ширины ножки: y ∈ [(W − a)/2, (W + a)/2].
//
// ОГРАНИЧЕНИЕ «Отступ от края» (ножка прямоугольная, а не сужающаяся — ширина верхней перекладины ножки = W на всём протяжении):
//   между верхними балками должен остаться зазор g ≥ GAP_MIN = 20 мм:  W − 2s − 2a ≥ GAP_MIN   ⇒   s_max = ⌊(W − 2a − GAP_MIN)/2⌋.
//   (Без зазора s_max = (W − 2a)/2 — балки соприкоснулись бы, а при большем s перекрылись.) Балка при этом всегда целиком лежит на верхней перекладине ножки
//   (она занимает всю ширину W), y ∈ [s, W − s] ⊂ [0, W].  s_max зависит от «Ширины» и профиля; normalize() сам срезает s до s_max (русское предупреждение).
//   Для умолчаний W = 710, профиль 60×30: s_max = ⌊(710 − 120 − 20)/2⌋ = 285 мм.
//   «Ширина» W ≥ 2·a_max + GAP_MIN (для профиля 80 → 180): минимум W = 200, поэтому s_max ≥ 0 при любом профиле из списка.
// Всё сливается в ОДНО тело (fuseAll + simplify → без швов): внешние углы общие, ничего не выступает, внутренние грани по одной линии.
import { PROFILES_BASE, range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { box, free } from "../lib/model.js";
import { legFrame } from "../H031/model.js";
import { dim } from "../render/dimhelpers.js";

export const GAP_MIN = 20;
const prof = (p) => findIn(PROFILES_BASE, p.profile);
/** max «Отступ от края» for the given width and profile */
export const maxOffset = (W, a) => Math.floor((W - 2 * a - GAP_MIN) / 2);
const controls = [range("L", "Длина", 600, 3000, 10, 1600), range("W", "Ширина", 200, 1000, 10, 710), range("H", "Высота", 300, 1100, 10, 710),
  range("S", "Отступ от края", 0, 460, 5, 100), profileCtl("60x30", "profile", "Профиль", PROFILES_BASE), colorCtl("черный")];

export const spec = {
  id: "H114", type: "Подстолье", name: "Подстолье Н114", about: "Подстолье целиком: 2 ножки Н031, нижняя балка по центру и 2 верхние балки", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), a = prof(p).a, max = maxOffset(p.W, a);
    if (p.S > max) {
      warnings.push(`«Отступ от края»: максимум при ширине ${p.W} мм и профиле ${prof(p).label} — ${max} мм (между верхними балками остаётся зазор ${GAP_MIN} мм): ${p.S} → ${max} мм.`);
      p.S = max;
    }
    return { p, warnings };
  },
  /** derived numbers shown in the UI / drawing */
  derive: (p) => { const a = prof(p).a; return { clear: p.L - 2 * a, maxOffset: maxOffset(p.W, a), gap: p.W - 2 * p.S - 2 * a }; },
  parts(p) {
    const { a, b } = prof(p), { L, W, H, S } = p;
    const rot = (s) => { const r = s.rotate(90, [0, 0, 0], [0, 0, 1]); free(s); return r; };        // frame plane XZ (depth +Y) -> YZ (depth: x ∈ [-a, 0])
    const left = rot(legFrame(W, H, prof(p))).translate([a, 0, 0]), right = left.clone().translate([L - a, 0, 0]);
    const parts = [left, right,
      box(a, L - a, S, S + a, H - b, H), box(a, L - a, W - S - a, W - S, H - b, H),                  // 2 top beams, top flush with the legs
      box(a, L - a, (W - a) / 2, (W + a) / 2, 0, b)];                                                // bottom beam, centred
    return parts.map((s) => s.translate([-L / 2, -W / 2, 0]));
  },
  expectBBox: (p) => [p.L, p.W, p.H],
  view: { az: 30, el: 22 }, layout: "table", shaded: true, auto: true,
  dims(p, k = 1) {
    const { L, W, H } = p, hx = L / 2, hy = W / 2, O = 130 * k;
    return [dim([-hx, -hy, 0], [hx, -hy, 0], `${L} мм`, [0, -O, 0]), dim([hx, -hy, 0], [hx, hy, 0], `${W} мм`, [O, 0, 0]), dim([-hx, -hy, 0], [-hx, -hy, H], `${H} мм`, [-O, 0, 0])];
  },
  textLines: (p) => ["Подстолье Н114", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Длина: ${p.L} мм`, `Ширина: ${p.W} мм`, `Высота: ${p.H} мм`, `Отступ от края: ${p.S} мм`],
};
