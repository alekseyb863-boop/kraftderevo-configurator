// H031 Опора для барной стойки: прямоугольная рама из профиля (по умолчанию 40×20: 20 в плоскости, 40 в глубину), 450 × 1050, чёрная.
// Блок «Дополнительно»: площадка 150×40×4 сзади верхней перекладины (верх вровень с рамой) и окружности отверстий Ø5 без выреза.
import { frame, box } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, checkCtl, intCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

/** the leg itself (also used by Н114): rectangular frame W×H of a profile pr (pr.b in the plane, pr.a deep), plane XZ, depth +Y */
export const legFrame = (W, H, pr) => frame([[0, 0], [W, 0], [W, H], [0, H]], [pr.b, pr.b, pr.b, pr.b], 0, pr.a);

const PLATE_T = 4;
const HOLE_R = 2.5;
const HOLE_GAP = 8;
/** те же сечения, что у остальных опор, плюс квадрат 20×20 */
const PROFILES_H031 = [{ id: "20x20", a: 20, b: 20, label: "20×20" }, ...PROFILES];

const controls = [
  range("W", "Ширина", 150, 1000, 10, 450),
  range("H", "Высота", 300, 1500, 10, 1050),
  profileCtl("40x20", "profile", "Профиль", PROFILES_H031),
  colorCtl("черный"),
  { ...checkCtl("plate", "Площадка для крепления", true), extra: true },
  { ...range("PL", "Длина площадки", 40, 1000, 1, 150), extra: true, depends: "plate" },
  { ...range("PW", "Ширина площадки", 10, 200, 1, 40), extra: true, depends: "plate" },
  { ...intCtl("nTop", "Количество отверстий сверху", 0, 30, 3), extra: true },
  { ...intCtl("nPlate", "Количество отверстий в площадке", 0, 30, 2), extra: true, depends: "plate" },
  { ...checkCtl("wallTop", "Отверстие к стене сверху", false), extra: true },
  { ...checkCtl("wallBot", "Отверстие к стене снизу", false), extra: true },
];

const prof = (p) => findIn(PROFILES_H031, p.profile);

/** i-е отверстие из n на отрезке длиной L, с тем же зазором от краёв, что и между центрами. */
function spaced(n, length, origin) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push(origin + (i * length) / (n + 1));
  return out;
}

function fitCount(n, length, label, warnings) {
  let c = n;
  while (c > 0 && length / (c + 1) < HOLE_GAP) c--;
  if (c !== n) warnings.push(`«${label}»: ${n} → ${c} (между отверстиями меньше ${HOLE_GAP} мм).`);
  return c;
}

function circle(c, axis, r = HOLE_R, m = 32) {
  const pts = [];
  for (let i = 0; i <= m; i++) {
    const t = (2 * Math.PI * i) / m, u = r * Math.cos(t), v = r * Math.sin(t);
    if (axis === "x") pts.push([c[0], c[1] + u, c[2] + v]);
    else pts.push([c[0] + u, c[1] + v, c[2]]);
  }
  return pts;
}

export const spec = {
  id: "H031", type: "Опора", category: "Ножки и опоры", name: "Опора Н031",
  about: "Опора для барной стойки, прямоугольная рама. Площадка крепления и отверстия — в блоке «Дополнительно»",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    const pr = prof(p);
    if (p.PL > p.W) {
      warnings.push(`«Длина площадки»: ${p.PL} → ${p.W} мм (не длиннее ширины опоры).`);
      p.PL = p.W;
    }
    p.nTop = fitCount(p.nTop, p.W, "Количество отверстий сверху", warnings);
    if (p.plate) p.nPlate = fitCount(p.nPlate, p.PL, "Количество отверстий в площадке", warnings);
    const clear = p.H - 2 * pr.b;
    if ((p.wallTop || p.wallBot) && clear < 50 + HOLE_GAP) {
      if (p.wallTop) warnings.push("«Отверстие к стене сверху»: выключено (на стойке нет 50 мм свободной грани).");
      if (p.wallBot) warnings.push("«Отверстие к стене снизу»: выключено (на стойке нет 50 мм свободной грани).");
      p.wallTop = false;
      p.wallBot = false;
    }
    return { p, warnings };
  },
  parts(p) {
    const pr = prof(p);
    const out = [legFrame(p.W, p.H, pr)];
    if (p.plate) {
      const x0 = (p.W - p.PL) / 2, x1 = x0 + p.PL;
      out.push(box(x0, x1, pr.a - 1, pr.a + p.PW, p.H - PLATE_T, p.H));
    }
    return out;
  },
  expectBBox: (p) => {
    const pr = prof(p);
    return [p.W, p.plate ? pr.a + p.PW : pr.a, p.H];
  },
  view: { az: 50, el: 16 }, layout: "forms",
  marks(p) {
    const pr = prof(p), out = [];
    for (const x of spaced(p.nTop, p.W, 0)) out.push(circle([x, pr.a / 2, p.H], "z"));
    if (p.plate) {
      const x0 = (p.W - p.PL) / 2;
      for (const x of spaced(p.nPlate, p.PL, x0)) out.push(circle([x, pr.a + p.PW / 2, p.H], "z"));
    }
    if (p.wallTop) out.push(circle([pr.b, pr.a / 2, p.H - pr.b - 50], "x"));
    if (p.wallBot) out.push(circle([pr.b, pr.a / 2, pr.b + 50], "x"));
    return out;
  },
  dims(p, k = 1) {
    const { W, H } = p, O = 90 * k;
    return [dimAB([0, 0, 0], [W, 0, 0], [0, -O, 0], [W, -O, 0], `${W} мм`), dimAB([0, 0, 0], [0, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`)];
  },
  textLines: (p) => {
    const lines = ["Опора Н031", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Ширина: ${p.W} мм`, `Высота: ${p.H} мм`];
    if (p.plate) lines.push(`Площадка: ${p.PL}×${p.PW}×${PLATE_T} мм`);
    return lines;
  },
};
