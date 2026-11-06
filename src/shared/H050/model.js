// H050 Ножка для барной стойки: замкнутая трапеция из профиля (по умолчанию 50×25: 25 в плоскости, 50 в глубину), верх 500, низ 200, высота 1000.
// Блок «Дополнительно»: площадка 150×40×4 сзади верхней перекладины (верх вровень с рамой) и окружности отверстий Ø5 без выреза.
import { frame, box } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, checkCtl, intCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const PLATE_T = 4;
const HOLE_R = 2.5;
const HOLE_GAP = 8;

const controls = [
  range("WT", "Ширина верха", 250, 1200, 10, 500),
  range("WB", "Ширина низа", 100, 1200, 10, 200),
  range("H", "Высота", 400, 1500, 10, 1000),
  profileCtl("50x25"),
  colorCtl("черный"),
  { ...checkCtl("plate", "Площадка для крепления", true), extra: true },
  { ...range("PL", "Длина площадки", 40, 1000, 1, 150), extra: true, depends: "plate" },
  { ...range("PW", "Ширина площадки", 10, 200, 1, 40), extra: true, depends: "plate" },
  { ...intCtl("nTop", "Количество отверстий сверху", 0, 30, 3), extra: true },
  { ...intCtl("nPlate", "Количество отверстий в площадке", 0, 30, 2), extra: true, depends: "plate" },
];
const outer = (p) => { const d = (p.WT - p.WB) / 2; return [[d, 0], [d + p.WB, 0], [p.WT, p.H], [0, p.H]]; };
const prof = (p) => findIn(PROFILES, p.profile);

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

function circle(c, r = HOLE_R, m = 32) {
  const pts = [];
  for (let i = 0; i <= m; i++) {
    const t = (2 * Math.PI * i) / m;
    pts.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t), c[2]]);
  }
  return pts;
}

export const spec = {
  id: "H050", type: "Ножка", category: "Ножки и опоры", name: "Ножка Н050",
  about: "Ножка для барной стойки: замкнутая трапеция (низ уже верха). Площадка крепления и отверстия — в блоке «Дополнительно»",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), pr = prof(p);
    if (p.WB > p.WT) { warnings.push(`«Ширина низа» не может быть больше ширины верха: ${p.WB} → ${p.WT} мм.`); p.WB = p.WT; }
    relax(p, controls, (q) => q.WB <= q.WT && frameFeasible(outer(q), [pr.b, pr.b, pr.b, pr.b]), [["WB", 10, "WT"], ["WT", 10], ["H", 10]], warnings, "иначе профиль не помещается");
    if (p.PL > p.WT) {
      warnings.push(`«Длина площадки»: ${p.PL} → ${p.WT} мм (не длиннее ширины верха).`);
      p.PL = p.WT;
    }
    p.nTop = fitCount(p.nTop, p.WT, "Количество отверстий сверху", warnings);
    if (p.plate) p.nPlate = fitCount(p.nPlate, p.PL, "Количество отверстий в площадке", warnings);
    return { p, warnings };
  },
  parts(p) {
    const pr = prof(p);
    const out = [frame(outer(p), [pr.b, pr.b, pr.b, pr.b], 0, pr.a)];
    if (p.plate) {
      const x0 = (p.WT - p.PL) / 2, x1 = x0 + p.PL;
      out.push(box(x0, x1, pr.a - 1, pr.a + p.PW, p.H - PLATE_T, p.H));
    }
    return out;
  },
  expectBBox: (p) => [p.WT, p.plate ? prof(p).a + p.PW : prof(p).a, p.H],
  view: { az: 50, el: 16 }, layout: "forms",
  marks(p) {
    const pr = prof(p), out = [];
    for (const x of spaced(p.nTop, p.WT, 0)) out.push(circle([x, pr.a / 2, p.H]));
    if (p.plate) {
      const x0 = (p.WT - p.PL) / 2;
      for (const x of spaced(p.nPlate, p.PL, x0)) out.push(circle([x, pr.a + p.PW / 2, p.H]));
    }
    return out;
  },
  dims(p, k = 1) {
    const { WT, WB, H } = p, d = (WT - WB) / 2, O = 90 * k;
    return [dimAB([d, 0, 0], [d + WB, 0, 0], [d, -O, 0], [d + WB, -O, 0], `${WB} мм`, WB <= 250 ? 135 : 0),
      dimAB([0, 0, H], [WT, 0, H], [0, 0, H + O], [WT, 0, H + O], `${WT} мм`),
      dimAB([0, 0, 0], [0, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`)];
  },
  textLines: (p) => {
    const lines = ["Ножка Н050", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Высота: ${p.H} мм`];
    if (p.plate) lines.push(`Площадка: ${p.PL}×${p.PW}×${PLATE_T} мм`);
    return lines;
  },
};
