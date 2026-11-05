// VA012 (В012) Напольная вешалка для полотенец. Габарит стандартной модели с сайта:
// высота 85 см, ширина 50 см, глубина 26 см, профиль 20×20. мм, Z вверх, начало в переднем левом углу основания.
//
// Три прямоугольные рамки одной ширины, сдвинутые по глубине: спереди самая низкая, сзади самая высокая.
// Стойки до пола, верхняя перекладина между ними. Снизу кольцо из четырёх профилей (перед, зад, два бока);
// средней поперечины на полу нет — средняя рамка стоит на боковых профилях. Всё сливается в одно тело.
//
// Высоты передней и средней планок на сайте не указаны. По фронтальному фото карточки, с поправкой
// на перспективу, они ложатся на 730 и 800 мм при задней 850.
import { box } from "../lib/model.js";
import { SQUARES, range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [
  profileCtl("20x20", "profile", "Профиль", SQUARES),
  range("W", "Ширина", 300, 1200, 10, 500),
  range("D", "Глубина", 160, 800, 10, 260),
  range("H", "Высота задней планки", 600, 1600, 10, 850),
  range("H2", "Высота средней планки", 400, 1500, 10, 800),
  range("H1", "Высота передней планки", 300, 1400, 10, 730),
  colorCtl("черный"),
];
const prof = (p) => findIn(SQUARES, p.profile);

/** y начала стойки: 0 перед, середина глубины, зад. Середина центрирует профиль. */
export function stations(D, a) {
  return [0, (D - a) / 2, D - a];
}

export const spec = {
  id: "VA012", type: "Вешалка", category: "Вешалки", name: "Вешалка В012",
  about: "Напольная вешалка для полотенец: три рамки разной высоты на общем основании",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    const a = prof(p).a;
    const gap = a + 10;
    if (p.H2 > p.H - gap) {
      const n = p.H - gap;
      warnings.push(`«Высота средней планки»: ${p.H2} → ${n} мм (ниже задней на зазор профиля).`);
      p.H2 = n;
    }
    if (p.H1 > p.H2 - gap) {
      const n = p.H2 - gap;
      warnings.push(`«Высота передней планки»: ${p.H1} → ${n} мм (ниже средней на зазор профиля).`);
      p.H1 = n;
    }
    const minD = 3 * a + 40;
    if (p.D < minD) {
      warnings.push(`«Глубина»: ${p.D} → ${minD} мм (три профиля ${a} мм с зазором).`);
      p.D = minD;
    }
    const minW = 2 * a + 80;
    if (p.W < minW) {
      warnings.push(`«Ширина»: ${p.W} → ${minW} мм (перекладина короче двух стоек).`);
      p.W = minW;
    }
    return { p, warnings };
  },
  parts(p) {
    const a = prof(p).a, { H, H2, H1, W, D } = p;
    const ys = stations(D, a);
    const heights = [H1, H2, H];
    const out = [
      box(a, W - a, 0, a, 0, a),
      box(a, W - a, D - a, D, 0, a),
      box(0, a, a, D - a, 0, a),
      box(W - a, W, a, D - a, 0, a),
    ];
    for (let i = 0; i < 3; i++) {
      const y0 = ys[i], y1 = y0 + a, top = heights[i];
      out.push(box(0, a, y0, y1, 0, top), box(W - a, W, y0, y1, 0, top), box(a, W - a, y0, y1, top - a, top));
    }
    return out;
  },
  expectBBox: (p) => [p.W, p.D, p.H],
  view: { az: 35, el: 16 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const a = prof(p).a, { H, H2, H1, W, D } = p;
    const [y1, y2, y3] = stations(D, a), O = 120 * k;
    return [
      dimAB([0, 0, 0], [W, 0, 0], [0, -O, 0], [W, -O, 0], `${W} мм`),
      dimAB([W, 0, 0], [W, D, 0], [W + O, 0, 0], [W + O, D, 0], `${D} мм`),
      dimAB([0, y1, 0], [0, y1, H1], [-O, y1, 0], [-O, y1, H1], `${H1} мм`, -70),
      dimAB([0, y2, 0], [0, y2, H2], [-O * 2.15, y2, 0], [-O * 2.15, y2, H2], `${H2} мм`, 40),
      dimAB([0, y3, 0], [0, y3, H], [-O * 3.3, y3, 0], [-O * 3.3, y3, H], `${H} мм`, 90),
    ];
  },
  textLines: (p) => ["Вешалка В012", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Ширина: ${p.W} мм`, `Глубина: ${p.D} мм`, `Задняя планка: ${p.H} мм`, `Средняя планка: ${p.H2} мм`, `Передняя планка: ${p.H1} мм`],
};
