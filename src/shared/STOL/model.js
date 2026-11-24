// STOL «Столешница» — параметрическая столешница (прямоугольный брусок Длина × Ширина × Толщина). Вкладка «Столешницы», без артикулов.
// Оси: X — длина, Y — ширина, Z — вверх; z = 0 — низ столешницы.
// Тон: одна из 12 текстур (всегда выбрана, пишется на чертеже); галочка «Текстура» — накладывать ли её на видимые грани (spec.fills), иначе белое тело и чёрные линии;
// волокна идут вдоль длины. Покрытие (лак/масло) на вид не влияет — только строка на чертеже.
import { box } from "../lib/model.js";
import { range, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

export const SPECIES = ["Ясень", "Дуб", "Лиственница", "Сосна", "Бук", "Камень", "Слэб"];   // параметр «Материал» (ключ species оставлен для совместимости)
export const STONE = "Камень", SLAB = "Слэб";
/** папка текстур породы: public/tex/<папка>/<тон>.jpg и миниатюры public/tex/<папка>/thumb_<тон>.jpg */
export const SPECIES_DIR = { "Ясень": "yasen", "Дуб": "dub", "Лиственница": "listvennica", "Сосна": "sosna", "Бук": "buk", "Камень": "kamen", "Слэб": "sleb" };
const texId = (p) => `${SPECIES_DIR[p.species] || "dub"}/${p.tone}`;
export const COATINGS = ["Лак", "Масло"];
/** тона: текстура зависит от пары (порода, тон) — public/tex/<папка породы>/<id>.jpg (плитка 2×2 с зеркалированием, волокна по горизонтали) */
export const TONES = [
  ["705_12_dub", "705 1/2 Дуб"], ["705_moreny_dub", "705 Мореный дуб"], ["827_oreh", "827 Орех"], ["887_mokko", "887 Мокко"],
  ["825_oregon", "825 Орегон"], ["4_naturalny", "4 Натуральный"], ["821_zelenaya_trava", "821 Зелёная трава"], ["P6_ebenovoe", "Р6 Эбеновое дерево"],
  ["820_824_ryabina", "820 824 Рябина"], ["890_mahagon", "890 Махагон"], ["820_sliva", "820 Слива"], ["7108_palisandr", "7108 Палисандр"],
].map(([id, label]) => ({ id, label }));
/** размер одной плитки текстуры на изделии, мм (вдоль волокон × поперёк) */
export const TEX_MM = [1000, 780];
/** тона камня: public/tex/kamen/<id>.jpg; tile — размер плитки 2×2 на изделии, мм (крошка терраццо 5–25 мм, прожилки мрамора — плита ~0,9 м в четверти плитки) */
export const STONE_TONES = [
  { id: "belyj", label: "Белый камень", tile: [800, 600] },
  { id: "temnyj", label: "Тёмный камень", tile: [1800, 1200] },
];
/** слэб: одна текстура public/tex/sleb/sleb.jpg (кадр 965×456 px); одно фото ≈ 1270 × 600 мм, плитка 2×2 — 2540 × 1200 мм (столешница 1200×600 без повторов) */
export const SLAB_TONES = [{ id: "sleb", label: "Слэб", tile: [2540, 1200] }];
const ALL_TONES = [...TONES, ...STONE_TONES, ...SLAB_TONES];
/** группы тонов: дерево — 12 тонов, камень — 2, слэб — 1 */
const TONE_GROUPS = { wood: TONES, stone: STONE_TONES, slab: SLAB_TONES };
const GROUP_OF = { [STONE]: "stone", [SLAB]: "slab" };
export const toneGroup = (species) => GROUP_OF[species] || "wood";
const TONE_DEF = Object.fromEntries(Object.entries(TONE_GROUPS).map(([g, list]) => [g, list[0].id]));
/** тон недоступен для выбранного материала -> тон по умолчанию этого материала */
export function fixTone(p) {
  const g = toneGroup(p.species);
  if (!TONE_GROUPS[g].some((t) => t.id === p.tone)) p.tone = TONE_DEF[g];
  return p;
}

const opts = (list) => list.map((v) => ({ value: v, label: v }));
export const TOP_CONTROLS = [
  range("L", "Длина", 300, 3000, 1, 1200),
  range("W", "Ширина", 200, 1200, 1, 600),
  { type: "select", key: "T", label: "Толщина", def: "40", options: [{ value: "20", label: "20" }, { value: "40", label: "40" }] },
  { type: "select", key: "species", label: "Материал", def: "Дуб", unit: "", options: opts(SPECIES) },
  { type: "swatch", key: "tone", label: "Тон", def: TONES[0].id, thumbBy: "species", thumbDir: SPECIES_DIR,   // миниатюры меняются вместе с породой: {dir} -> папка выбранной породы
    groupBy: "species", groupOf: GROUP_OF, groupDef: TONE_DEF,   // видимые тона зависят от материала (камень — 2 тона, слэб — 1)
    options: Object.entries(TONE_GROUPS).flatMap(([group, list]) => list.map((t) => ({ group, ...t }))).map((t) => ({ value: t.id, label: t.label, group: t.group, thumb: `tex/{dir}/thumb_${t.id}.jpg` })) },
  { type: "check", key: "texture", label: "Текстура", def: false },        // как «Окрашивание» у ножек: выключено — тело белое, тон только в тексте
  { type: "select", key: "coat", label: "Покрытие", def: "Лак", unit: "", hideIf: { species: STONE }, options: opts(COATINGS) },   // у камня покрытия нет: поле скрыто, на чертеже не пишется
];
export const toneLabel = (id) => (ALL_TONES.find((t) => t.id === id) || {}).label;

const controls = TOP_CONTROLS;
/** грани столешницы под текстуру (низ столешницы на высоте z0); white = true — при выключенной «Текстуре» грани заливаются белым (стол: столешница закрывает ножки) */
export function topFills(p, z0 = 0, white = false) {
  const { L, W, T } = p, tex = p.texture ? texId(p) : null;
  if (!tex && !white) return [];
  const tile = (ALL_TONES.find((t) => t.id === p.tone) || {}).tile || TEX_MM;   // торцы — тем же материалом
  const f = (o, u, v, lu, lv, n, shade) => ({ tex, color: tex ? null : "#fff", o, u, v, lu, lv, n, shade: tex ? shade : 0, tile });
  const Z = z0 + T;
  return [
    f([0, 0, Z], [1, 0, 0], [0, 1, 0], L, W, [0, 0, 1], 0),
    f([0, 0, z0], [1, 0, 0], [0, 0, 1], L, T, [0, -1, 0], 0.14),
    f([0, W, z0], [1, 0, 0], [0, 0, 1], L, T, [0, 1, 0], 0.14),
    f([L, 0, z0], [0, 1, 0], [0, 0, 1], W, T, [1, 0, 0], 0.24),
    f([0, 0, z0], [0, 1, 0], [0, 0, 1], W, T, [-1, 0, 0], 0.24),
    f([0, 0, z0], [1, 0, 0], [0, 1, 0], L, W, [0, 0, -1], 0.3),
  ];
}
/** строки текстового блока о столешнице (без заголовка) */
// «Тон» — только у дерева (у камня и слэба не пишется); «Покрытие» — у всего, кроме камня
export const topLines = (p) => [`Материал: ${p.species}`, ...(toneGroup(p.species) === "wood" ? [`Тон: ${toneLabel(p.tone)}`] : []), ...(p.species === STONE ? [] : [`Покрытие: ${p.coat}`]), `Длина: ${p.L} мм`, `Ширина: ${p.W} мм`, `Толщина: ${p.T} мм`];

export const spec = {
  id: "STOL", tab: "tops", type: "Столешница", category: "Столешницы", name: "Столешница", cardLabel: "Столешница",
  about: "Столешница: длина, ширина, толщина 20 или 40 мм, материал (порода дерева, камень или слэб), тон (текстура) и покрытие", controls,
  normalize(raw) { const r = baseNormalize(controls, raw); r.p.T = Number(r.p.T); fixTone(r.p); return r; },
  parts: (p) => [box(0, p.L, 0, p.W, 0, p.T)],
  expectBBox: (p) => [p.L, p.W, p.T],
  view: { az: 32, el: 28 }, layout: "wide", auto: true,
  /** грани под текстуру: o — угол, u — вдоль волокон (вдоль длины; на торцах — вдоль ширины), v — поперёк, n — наружная нормаль, shade — затемнение боковых граней */
  fills: (p) => topFills(p),
  dims(p, k = 1) {
    const { L, W, T } = p, O = 60 * k, Ot = 40 * k;
    return [
      dimAB([0, 0, 0], [L, 0, 0], [0, -O, 0], [L, -O, 0], `${L} мм`),
      dimAB([L, 0, 0], [L, W, 0], [L + O, 0, 0], [L + O, W, 0], `${W} мм`),
      dimAB([0, 0, 0], [0, 0, T], [-Ot, 0, 0], [-Ot, 0, T], `${T} мм`, 0, 1),
    ];
  },
  textLines: (p) => ["Столешница", ...topLines(p)],
};
