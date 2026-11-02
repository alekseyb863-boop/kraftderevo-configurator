// «Тумба кух.» (папка TUMBA_KUH) — настенный каркас-кронштейн из профильной трубы (по заказу 8099: 780 × 300 × 300, профиль 20×20). Категория «Другое». Артикула нет.
// Оси: X — Длина (вдоль стены), Y — Ширина (глубина; Y = 0 — передний край, Y = D — стена), Z — Высота (вверх). Начало — левый передний нижний угол габарита.
// Профиль a × b: a — размер в плане (ширина профиля по горизонтали), b — высота профиля (по вертикали у горизонтальных перекладин; в боковой плоскости — толщина раскоса).
// ГЕОМЕТРИЯ (все внешние грани вровень, углы острые, габарит ровно Длина × Ширина × Высота, всё сливается в ОДНО тело):
//   верхняя рама (z ∈ [H − b, H]): задний длинный профиль y ∈ [D − a, D] и передний y ∈ [0, a] на всю длину, два коротких боковых x ∈ [0, a] / [L − a, L], y ∈ [a, D − a];
//   стойки под задним верхним профилем на обоих концах: x ∈ [0, a] / [L − a, L], y ∈ [D − a, D], z ∈ [0, H − b];
//   нижний длинный профиль у стены между стойками: x ∈ [a, L − a], y ∈ [D − a, D], z ∈ [0, b];
//   раскос на каждом конце (вид сбоку — прямоугольный треугольник: верх — глубина, вертикаль — высота, гипотенуза — раскос): полоса толщиной b вдоль линии
//   от переднего верхнего угла (y = 0, z = H − b) вниз к низу стойки (y = D − a, z = 0), обрезанная прямоугольником y ∈ [0, D], z ∈ [0, H − b]; ширина в плане a.
// ОТВЕРСТИЯ Ø5 — только окружности на гранях (настоящих отверстий нет), положение — lib/holes.js (логика из файла «hole_logic.md»):
//   1) n отверстий на верхней грани заднего верхнего профиля: x = e, e+s, …, L−e;   2) те же на верхней грани переднего профиля;
//   3) n−1 промежуточных ровно посередине между ними (x = e + s/2 + k·s) — на передней (комнатной) вертикальной грани нижнего профиля и заднего верхнего профиля;
//   4) по одному на верхней грани каждого бокового профиля — на середине Ширины;
//   5) по одному на каждой стойке, на её передней грани, на «Высоте отверстий к стене» от верха (зеркально на обеих стойках).
import { box, prismYZ } from "../lib/model.js";
import { range, select, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { holePositions } from "../lib/holes.js";
import { makeView } from "../render/projection.js";
export { holePositions };

const HOLE_D = 5, MIN_STEP = 100, MIN_POST_HOLE = 8;
/** сечения a × b (a — в плане, b — по высоте) */
export const PROFILES = [["20x20", 20, 20], ["25x25", 25, 25], ["30x30", 30, 30], ["40x40", 40, 40], ["30x20", 30, 20], ["40x20", 40, 20], ["50x25", 50, 25]]
  .map(([id, a, b]) => ({ id, a, b, label: `${a}×${b}` }));
const controls = [range("W", "Длина", 300, 3000, 1, 780), range("D", "Ширина", 150, 1000, 1, 300), range("H", "Высота", 150, 1000, 1, 300),
  select("profile", "Профиль", PROFILES, "20x20"),
  range("hmin", "Отступ отверстий мин", 20, 300, 1, 75), range("hmax", "Отступ отверстий макс", 20, 300, 1, 85),
  range("n", "Количество отверстий", 2, 12, 1, 4, "шт"), range("hh", "Высота отверстий к стене", 20, 900, 1, 100)];
/** Размерные линии заданы в мм модели, а подписи — в пикселях: на мелком чертеже (большая Ширина/Высота) отступы линий растягиваются, чтобы подписи помещались.
 *  Оценка масштаба — как у раскладки "wide" по габариту и базовым отступам; на умолчаниях (780×300×300) множитель 1. */
const REF_PX = 0.974;                                                  // оценка масштаба на умолчаниях
const pxFor = (p, g) => {
  const { P2 } = makeView(32, 21), pts = [];
  for (const x of [-140 * g, 0, p.W, p.W + 130 * g]) for (const y of [-60 * g, 0, p.D, p.D + 165 * g]) for (const z of [-60 * g, 0, p.H]) pts.push(P2(x, y, z));
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return Math.min(1420 / (Math.max(...xs) - Math.min(...xs)), 677 / (Math.max(...ys) - Math.min(...ys)));
};
const spread = (p) => Math.min(3, Math.max(1, REF_PX / pxFor(p, 1)));
const prof = (p) => findIn(PROFILES, p.profile);
const fmt = (v) => String(+(+v).toFixed(1));

/** высота (от пола), до которой раскос примыкает к передней грани стойки */
const braceTouch = (p, a, b) => b * Math.hypot(p.D - a, p.H - b) / (p.D - a);
/** производные величины: положение отверстий и пределы высоты отверстия в стойке */
export function derive(p) {
  const { a, b } = prof(p), g = holePositions(p.W, p.n, p.hmin, p.hmax), zu = braceTouch(p, a, b);
  return { a, b, ...g, zu, hhMin: Math.ceil(b + MIN_POST_HOLE), hhMax: Math.floor(p.H - zu - MIN_POST_HOLE) };
}
/** полоса раскоса в плоскости (y, z): между линией (0, H−b)→(D−a, 0) и параллельной ей на расстоянии b выше, внутри прямоугольника [0, D] × [0, H−b] */
export function bracePolygon(D, H, a, b) {
  const Ht = H - b, dy = D - a, N = Math.hypot(dy, Ht), n = [Ht / N, dy / N], P = [0, Ht];
  const clip = (poly, f) => {                                          // оставить точки с f(p) >= 0
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], fa = f(A), fb = f(B);
      if (fa >= 0) out.push(A);
      if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
    }
    return out;
  };
  const side = (q) => (q[0] - P[0]) * n[0] + (q[1] - P[1]) * n[1];
  let poly = [[0, 0], [D, 0], [D, Ht], [0, Ht]];
  poly = clip(poly, (q) => side(q)); poly = clip(poly, (q) => b - side(q));
  return poly.filter((q, i) => Math.hypot(q[0] - poly[(i + 1) % poly.length][0], q[1] - poly[(i + 1) % poly.length][1]) > 1e-6);
}

export function parts(p) {
  const { a, b } = prof(p), { W: L, D, H } = p, out = [];
  out.push(box(0, L, D - a, D, H - b, H), box(0, L, 0, a, H - b, H));                         // задний и передний верхние длинные профили
  const poly = bracePolygon(D, H, a, b);
  for (const x0 of [0, L - a]) {
    out.push(box(x0, x0 + a, a, D - a, H - b, H));                                             // боковой верхний профиль (по глубине)
    out.push(box(x0, x0 + a, D - a, D, 0, H - b));                                             // стойка у стены
    out.push(prismYZ(poly, x0, x0 + a));                                                       // раскос
  }
  out.push(box(a, L - a, D - a, D, 0, b));                                                     // нижний длинный профиль
  return out;
}

/** окружность Ø5 на грани: ось = нормаль грани ("z" — верхняя грань, "y" — передняя/задняя) */
function circle(c, axis, r = HOLE_D / 2, m = 28) {
  const pts = [];
  for (let i = 0; i <= m; i++) { const t = (2 * Math.PI * i) / m, u = r * Math.cos(t), v = r * Math.sin(t); pts.push(axis === "z" ? [c[0] + u, c[1] + v, c[2]] : [c[0] + u, c[1], c[2] + v]); }
  return pts;
}

export const spec = {
  id: "TUMBA_KUH", type: "Каркас", category: "Другое", name: "Тумба кух.",
  about: "Настенный каркас-кронштейн из профильной трубы: верхняя рама, две стойки у стены, нижний профиль и два раскоса; отверстия Ø5 подбираются по длине",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), { a, b } = prof(p), say = (m) => warnings.push(m);
    // отступ отверстий: не меньше ширины профиля (чтобы промежуточные отверстия не попали на стойки) и не больше, чем помещается при минимальном шаге
    const cap = Math.floor((p.W - 60) / 2);
    for (const k of ["hmin", "hmax"]) { const v = Math.min(cap, Math.max(a, p[k])); if (v !== p[k]) { say(`«${controls.find((c) => c.key === k).label}»: ${p[k]} → ${v} мм (не меньше ширины профиля и не больше половины длины за вычетом шага).`); p[k] = v; } }
    if (p.hmax < p.hmin) { say(`«Отступ отверстий макс»: ${p.hmax} → ${p.hmin} мм (не может быть меньше минимального).`); p.hmax = p.hmin; }
    // число отверстий: шаг между ними не меньше MIN_STEP
    for (let g = holePositions(p.W, p.n, p.hmin, p.hmax); p.n > 2 && g.s < MIN_STEP; g = holePositions(p.W, p.n, p.hmin, p.hmax)) { say(`«Количество отверстий»: ${p.n} → ${p.n - 1} (шаг между отверстиями меньше ${MIN_STEP} мм).`); p.n--; }
    // высота отверстия в стойке: ниже верхнего профиля и выше места, где раскос примыкает к стойке
    const g = derive(p), hhMax = Math.max(g.hhMin, g.hhMax), hh = Math.min(hhMax, Math.max(g.hhMin, p.hh));
    if (hh !== p.hh) { say(`«Высота отверстий к стене»: ${p.hh} → ${hh} мм (отверстие должно быть на стойке: от ${g.hhMin} до ${hhMax} мм от верха).`); p.hh = hh; }
    return { p, warnings };
  },
  derive,
  parts,
  expectBBox: (p) => [p.W, p.D, p.H],
  view: { az: 32, el: 21 }, layout: "wide", auto: true,
  // смягчённая проверка наложений (только для этой фигуры): на предельных размерах допускается касание подписей размеров друг с другом / с чужими размерными линиями
  softOverlap: true,
  // окружности отверстий Ø5 (3D-ломаные), рисуются тонкой линией поверх модели
  marks(p) {
    const { a, b, positions, mids } = derive(p), { W: L, D, H } = p, out = [];
    for (const x of positions) out.push(circle([x, D - a / 2, H], "z"), circle([x, a / 2, H], "z"));      // верх заднего и переднего профилей
    for (const x of mids) out.push(circle([x, D - a, b / 2], "y"), circle([x, D - a, H - b / 2], "y"));      // нижний и задний верхний профили, комнатная грань
    for (const x of [a / 2, L - a / 2]) out.push(circle([x, D / 2, H], "z"), circle([x, D - a, H - p.hh], "y"));   // боковые профили и стойки
    return out;
  },
  dims(p, k0 = 1) {
    const k = k0 * spread(p);
    const { a, b, positions, mids } = derive(p), { W: L, D, H, hh } = p, d = [], t = (v) => `${fmt(v)} мм`;
    // сверху, дальняя сторона: общая Длина и под ней цепочка отступ / шаг / … / отступ вдоль отверстий заднего профиля
    const yo1 = D + 85 * k, yo2 = D + 165 * k, yh = D - a / 2, xs = [0, ...positions, L];
    d.push(dimAB([0, D, H], [L, D, H], [0, yo2, H], [L, yo2, H], t(L)));
    for (let i = 0; i < xs.length - 1; i++) d.push(dimAB(i === 0 ? [0, D, H] : [xs[i], yh, H], i === xs.length - 2 ? [L, D, H] : [xs[i + 1], yh, H], [xs[i], yo1, H], [xs[i + 1], yo1, H], t(xs[i + 1] - xs[i]), 0, i === 0 ? -1 : i === xs.length - 2 ? 1 : 0));
    // слева сверху: общая Ширина и цепочка 50 % / 50 % до бокового отверстия
    const xo1 = -35 * k, xo2 = -140 * k;
    d.push(dimAB([0, 0, H], [0, D, H], [xo2, 0, H], [xo2, D, H], t(D)));
    d.push(dimAB([0, 0, H], [a / 2, D / 2, H], [xo1, 0, H], [xo1, D / 2, H], t(D / 2), 0, -2), dimAB([a / 2, D / 2, H], [0, D, H], [xo1, D / 2, H], [xo1, D, H], t(D / 2), 0, 2));
    // справа: общая Высота и расстояние от верха до отверстия в стойке
    const zy = D - a;
    d.push(dimAB([L, zy, 0], [L, zy, H], [L + 130 * k, zy, 0], [L + 130 * k, zy, H], t(H)));
    d.push(dimAB([L, zy, H], [L - a / 2, zy, H - hh], [L + 60 * k, zy, H], [L + 60 * k, zy, H - hh], t(hh)));
    // снизу: цепочка 180 / 210 / … / 180 по промежуточным отверстиям нижнего профиля
    const zo = -60 * k, bx = [0, ...mids, L];
    for (let i = 0; i < bx.length - 1; i++) d.push(dimAB(i === 0 ? [0, zy, 0] : [bx[i], zy, b / 2], i === bx.length - 2 ? [L, zy, 0] : [bx[i + 1], zy, b / 2], [bx[i], zy, zo], [bx[i + 1], zy, zo], t(bx[i + 1] - bx[i])));
    return d;
  },
  textLines: (p) => { const g = derive(p); return ["Тумба кух.", "Чертеж в изометрической проекции", `Длина ${p.W} × Ширина ${p.D} × Высота ${p.H} мм`, `Профиль ${prof(p).label} мм`, `Отверстия Ø${HOLE_D}: ${p.n} шт., отступ ${fmt(g.e)} мм, шаг ${fmt(g.s)} мм`]; },
};
