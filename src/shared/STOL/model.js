// STOL «Столешница» — параметрическая столешница (прямоугольный брусок Длина × Ширина × Толщина). Вкладка «Столешницы», без артикулов.
// Оси: X — длина, Y — ширина, Z — вверх; z = 0 — низ столешницы.
// Тон: «без текстуры» (белое тело, чёрные линии) или одна из 12 текстур — на чертеже накладывается на видимые грани (spec.fills),
// волокна идут вдоль длины. Покрытие (лак/масло) на вид не влияет — только строка на чертеже.
import { box } from "../lib/model.js";
import { range, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

export const SPECIES = ["Ясень", "Дуб", "Лиственница", "Сосна", "Бук"];
export const COATINGS = ["Лак", "Масло"];
/** тона: id = имя файла текстуры в public/tex/<id>.jpg (плитка 2×2 с зеркалированием, волокна по горизонтали), миниатюра — public/tex/thumb_<id>.jpg */
export const TONES = [
  ["705_12_dub", "705 1/2 Дуб"], ["705_moreny_dub", "705 Мореный дуб"], ["827_oreh", "827 Орех"], ["887_mokko", "887 Мокко"],
  ["825_oregon", "825 Орегон"], ["4_naturalny", "4 Натуральный"], ["821_zelenaya_trava", "821 Зелёная трава"], ["P6_ebenovoe", "Р6 Эбеновое дерево"],
  ["820_824_ryabina", "820 824 Рябина"], ["890_mahagon", "890 Махагон"], ["820_sliva", "820 Слива"], ["7108_palisandr", "7108 Палисандр"],
].map(([id, label]) => ({ id, label }));
export const NO_TONE = "none";
/** размер одной плитки текстуры на изделии, мм (вдоль волокон × поперёк) */
export const TEX_MM = [1000, 780];

const opts = (list) => list.map((v) => ({ value: v, label: v }));
const controls = [
  range("L", "Длина", 300, 3000, 1, 1200),
  range("W", "Ширина", 200, 1200, 1, 600),
  { type: "select", key: "T", label: "Толщина", def: "40", options: [{ value: "20", label: "20" }, { value: "40", label: "40" }] },
  { type: "select", key: "species", label: "Порода", def: "Дуб", unit: "", options: opts(SPECIES) },
  { type: "swatch", key: "tone", label: "Тон", def: NO_TONE, options: [{ value: NO_TONE, label: "Без текстуры", thumb: "" }, ...TONES.map((t) => ({ value: t.id, label: t.label, thumb: `tex/thumb_${t.id}.jpg` }))] },
  { type: "select", key: "coat", label: "Покрытие", def: "Лак", unit: "", options: opts(COATINGS) },
];
const toneLabel = (id) => (TONES.find((t) => t.id === id) || {}).label;

export const spec = {
  id: "STOL", tab: "tops", type: "Столешница", category: "Столешницы", name: "Столешница", cardLabel: "Столешница",
  about: "Столешница из массива: длина, ширина, толщина 20 или 40 мм, порода, тон (текстура) и покрытие", controls,
  normalize(raw) { const r = baseNormalize(controls, raw); r.p.T = Number(r.p.T); return r; },
  parts: (p) => [box(0, p.L, 0, p.W, 0, p.T)],
  expectBBox: (p) => [p.L, p.W, p.T],
  view: { az: 32, el: 28 }, layout: "wide", auto: true,
  /** грани под текстуру: o — угол, u — вдоль волокон (вдоль длины; на торцах — вдоль ширины), v — поперёк, n — наружная нормаль, shade — затемнение боковых граней */
  fills(p) {
    if (p.tone === NO_TONE) return [];
    const { L, W, T } = p, f = (o, u, v, lu, lv, n, shade) => ({ tex: p.tone, o, u, v, lu, lv, n, shade, tile: TEX_MM });
    return [
      f([0, 0, T], [1, 0, 0], [0, 1, 0], L, W, [0, 0, 1], 0),
      f([0, 0, 0], [1, 0, 0], [0, 0, 1], L, T, [0, -1, 0], 0.14),
      f([0, W, 0], [1, 0, 0], [0, 0, 1], L, T, [0, 1, 0], 0.14),
      f([L, 0, 0], [0, 1, 0], [0, 0, 1], W, T, [1, 0, 0], 0.24),
      f([0, 0, 0], [0, 1, 0], [0, 0, 1], W, T, [-1, 0, 0], 0.24),
      f([0, 0, 0], [1, 0, 0], [0, 1, 0], L, W, [0, 0, -1], 0.3),
    ];
  },
  dims(p, k = 1) {
    const { L, W, T } = p, O = 60 * k, Ot = 40 * k;
    return [
      dimAB([0, 0, 0], [L, 0, 0], [0, -O, 0], [L, -O, 0], `${L} мм`),
      dimAB([L, 0, 0], [L, W, 0], [L + O, 0, 0], [L + O, W, 0], `${W} мм`),
      dimAB([0, 0, 0], [0, 0, T], [-Ot, 0, 0], [-Ot, 0, T], `${T} мм`, 0, 1),
    ];
  },
  textLines: (p) => ["Столешница", `Порода: ${p.species}`, p.tone === NO_TONE ? "Тон: без текстуры" : `Тон: ${toneLabel(p.tone)}`, `Покрытие: ${p.coat}`,
    `Длина: ${p.L} мм`, `Ширина: ${p.W} мм`, `Толщина: ${p.T} мм`],
};
