// VA008 (ВА008) Каркас под раковину: 4 стойки, верхняя и нижняя рамки, боковые поперечины на сторонах глубины.
// мм, Z вверх, начало в углу. Деревянной полки нет. Просвет между рамками = H − zBot − 2·a (на умолчаниях 550).
//
// РАЗМЕРЫ: H «Высота», W «Длина» (по X), D «Ширина» (по Y = глубина на сайте), zBot «Высота нижней обвязки» (пол → низ нижней рамки),
//   topOff «Расстояние от верха» (верх изделия → верх боковой поперечины). Профиль квадратный (по умолчанию 25×25).
// ГЕОМЕТРИЯ (a — сторона профиля; внешние грани вровень, углы острые, всё — ОДНО тело):
//   Стойки: 4 шт., x ∈ [0,a]/[W−a,W], y ∈ [0,a]/[D−a,D], z ∈ [0,H].
//   Верхняя рамка z ∈ [H−a, H]; нижняя рамка z ∈ [zBot, zBot+a]; боковые поперечины на x ∈ [0,a]/[W−a,W], y ∈ [a, D−a], z ∈ [H−topOff−a, H−topOff].
import { box } from "../lib/model.js";
import { SQUARES, range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const controls = [
  profileCtl("25x25", "profile", "Профиль", SQUARES),
  range("H", "Высота", 400, 1200, 10, 800),
  range("W", "Длина", 300, 2000, 5, 495),
  range("D", "Ширина", 300, 1200, 5, 495),
  range("zBot", "Высота нижней обвязки", 50, 600, 5, 200),
  range("topOff", "Расстояние от верха", 40, 400, 5, 125),
  colorCtl("серый"),
];
const prof = (p) => findIn(SQUARES, p.profile);
/** просвет между верхней гранью нижней рамки и нижней гранью верхней */
const clearOf = (p) => p.H - p.zBot - 2 * prof(p).a;

export const spec = {
  id: "VA008", type: "Каркас", category: "Под раковины", name: "Каркас ВА008",
  about: "Каркас под раковину: верхняя и нижняя рамки, боковые поперечины, без полки",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    const a = prof(p).a, say = (m) => warnings.push(m);
    // нижняя обвязка и поперечина должны помещаться с зазором под/над профилем рамки
    const zBotMax = p.H - 3 * a - 20;                       // место под верхнюю рамку, поперечину и просвет ≥ 20
    if (p.zBot > zBotMax) { say(`«Высота нижней обвязки»: ${p.zBot} → ${zBotMax} мм (иначе не помещаются верхняя рамка и поперечины).`); p.zBot = Math.max(controls.find((c) => c.key === "zBot").min, zBotMax); }
    const topMin = a + 5, topMax = Math.min(p.H - p.zBot - 2 * a - 20, p.H - a - 5);
    let t = Math.min(Math.max(p.topOff, topMin), Math.max(topMin, topMax));
    if (t !== p.topOff) { say(`«Расстояние от верха»: ${p.topOff} → ${t} мм (поперечина между рамками).`); p.topOff = t; }
    if (clearOf(p) < 20) {
      const z2 = Math.max(controls.find((c) => c.key === "zBot").min, p.H - 2 * a - 20);
      if (z2 !== p.zBot) { say(`«Высота нижней обвязки»: ${p.zBot} → ${z2} мм (просвет между рамками).`); p.zBot = z2; }
    }
    return { p, warnings };
  },
  parts(p) {
    const a = prof(p).a, { H, W, D, zBot, topOff } = p, zCrossTop = H - topOff, out = [];
    for (const [x0, x1] of [[0, a], [W - a, W]])
      for (const [y0, y1] of [[0, a], [D - a, D]])
        out.push(box(x0, x1, y0, y1, 0, H));
    out.push(box(a, W - a, 0, a, H - a, H), box(a, W - a, D - a, D, H - a, H));
    out.push(box(0, a, a, D - a, H - a, H), box(W - a, W, a, D - a, H - a, H));
    out.push(box(a, W - a, 0, a, zBot, zBot + a), box(a, W - a, D - a, D, zBot, zBot + a));
    out.push(box(0, a, a, D - a, zBot, zBot + a), box(W - a, W, a, D - a, zBot, zBot + a));
    out.push(box(0, a, a, D - a, zCrossTop - a, zCrossTop), box(W - a, W, a, D - a, zCrossTop - a, zCrossTop));
    return out;
  },
  expectBBox: (p) => [p.W, p.D, p.H],
  view: { az: 35, el: 18 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const a = prof(p).a, { H, W, D, zBot, topOff } = p, zCrossTop = H - topOff, clear = clearOf(p);
    const O = 90 * k, O2 = 55 * k, Ou = 110 * k;          // Ou — вынос длины вверх над задним ребром
    return [
      // Длина — по заднему верхнему ребру, размерная линия над изделием
      dimAB([0, D, H], [W, D, H], [0, D, H + Ou], [W, D, H + Ou], `${W} мм`),
      // Ширина справа сверху
      dimAB([W, 0, H], [W, D, H], [W + O, 0, H], [W + O, D, H], `${D} мм`),
      // Высота справа
      dimAB([W, 0, 0], [W, 0, H], [W + O + O2, 0, 0], [W + O + O2, 0, H], `${H} мм`),
      // расстояние от верха до поперечины
      dimAB([0, 0, H], [0, 0, zCrossTop], [-O2, 0, H], [-O2, 0, zCrossTop], `${topOff} мм`),
      // просвет между рамками
      dimAB([0, 0, zBot + a], [0, 0, H - a], [-O, 0, zBot + a], [-O, 0, H - a], `${clear} мм`),
      // высота нижней обвязки
      dimAB([0, 0, 0], [0, 0, zBot], [-O, 0, 0], [-O, 0, zBot], `${zBot} мм`),
    ];
  },
  textLines: (p) => {
    const a = prof(p).a;
    return ["Каркас под раковину ВА008", `Профиль ${a}×${a} мм`, `Цвет: ${p.color}`, `Длина: ${p.W} мм`, `Ширина: ${p.D} мм`, `Высота: ${p.H} мм`];
  },
};
