// «Ёж» (папка YOZH) — основание из 4 одинаковых «галочек», вписанное в коробку W × D × H (Длина × Ширина × Высота). Категория «Подстолья».
//
// ГАЛОЧКА. Два одинаковых бруска профиля a × b (a = 40 — толщина ИЗ плоскости галочки, b = 20 — ширина бруска В плоскости), сходятся в вершине
// на биссектрисе (стык «в ус», одно тело). Торцы срезаны плоскостью пола z = 0 и плоскостью верха z = A, поэтому торцевые грани горизонтальны.
//   A = H — полная высота; α — угол бруска от вертикали; w = b / cos α — горизонтальная ширина бруска.
//   B — горизонтальное расстояние от вертикали через внешние (по виду «наружу») углы торцов до ВНУТРЕННЕГО (вогнутого) угла вершины: B = (A/2)·tg α.
// Локальные оси галочки: s — по плане «от выпуклой вершины наружу», y — из плоскости (−a/2…a/2), z вверх.
//   контур в плоскости (s, z): (0, A/2) вершина-остриё, (B, A), (B+w, A), (w, A/2) вогнутый угол, (B+w, 0), (B, 0);  торцы: s ∈ [B, B+w], L = B + w.
//
// СБОРКА (4 галочки, симметрия D2: зеркала x → −x, y → −y), h = a/2:
//   галочка k лежит в своей четверти плана, её плоскость повернута на φ от оси X и НЕ проходит через ось: остриё (середина ребра вершины) в точке
//   T = h·(sin φ, cos φ),  ось галочки u = (cos φ, sin φ), нормаль n = (−sin φ, cos φ).  Ребро-остриё (z = A/2, ширина a) идёт от T − h·n = (2h·sin φ, 0)
//   до T + h·n = (0, 2h·cos φ); эти концы лежат ровно на осях X и Y, поэтому остриё первой галочки касается остриёв двух соседних (зеркальных) галочек
//   ровно в одной точке — в крайних точках ромба в центре: (±2h·sin φ, 0) и (0, ±2h·cos φ), z = A/2. Галочки лежат строго в разных четвертях (x ≥ 0, y ≥ 0 и т.д.),
//   так что общее — только эти 4 точки (объёмного пересечения нет). Это обобщение рис. 4 (при φ = 45° планы — квадрат, точки образуют квадрат 2h × 2h).
//   Габарит: x_max = L·cos φ + 2h·sin φ = W/2,   y_max = L·sin φ + 2h·cos φ = D/2   (крайние углы торцев, оба на торцах s = L).
//   Решение: (L + 2h)(cos φ + sin φ) = (W + D)/2,  (L − 2h)(cos φ − sin φ) = (W − D)/2  ⇒  g(L) = ((W+D)/2/(L+2h))² + ((W−D)/2/(L−2h))² − 2 = 0 (монотонна при L > 2h, корень один),
//   φ = atan2(sin, cos); затем (A/2)·tg α + b / cos α = L ⇒ α (монотонна, корень один), B = (A/2)·tg α.
// Ориентация: если D > W, расчёт для (D, W) и вся сборка поворачивается на 90° вокруг оси Z (derive().swap).
// Параметры: W, D, H (габарит коробки) и профиль a×b. Выходы: B, α, φ, L, T, точки контакта.
import { prism, bisect } from "../lib/model.js";
import { range, profileCtl, findIn, baseNormalize } from "../lib/params.js";
import { dim, dimAB } from "../render/dimhelpers.js";

const D2R = Math.PI / 180, MIN_LEN = 8;
/** сечения a × b: a = размер ИЗ плоскости галочки (толщина), b = ширина бруска В плоскости галочки */
export const PROFILES = [["40x20", 40, 20], ["50x25", 50, 25], ["40x40", 40, 40], ["60x30", 60, 30], ["60x40", 60, 40], ["80x40", 80, 40]].map(([id, a, b]) => ({ id, a, b, label: `${a}×${b}` }));
const controls = [range("W", "Длина", 200, 2500, 1, 1150), range("D", "Ширина", 200, 2500, 1, 1250), range("H", "Высота", 150, 1200, 1, 450), profileCtl("40x20", "profile", "Профиль", PROFILES)];
const prof = (p) => findIn(PROFILES, p.profile);

/** (W, D, H, a, b) -> derived geometry or { error } */
export function derive({ W, D, H }, a, b) {
  // ориентация: расчёт ведётся для длинной стороны вдоль X; если D > W, сборка поворачивается на 90° вокруг вертикальной оси (swap)
  const swap = D > W, r = derive0({ W: swap ? D : W, D: swap ? W : D, H }, a, b);
  if (r.error) return r;
  r.swap = swap; r.W = W; r.D = D;
  if (swap) r.contacts = r.contacts.map(([x, y, z]) => [-y, x, z]);
  return r;
}
function derive0({ W, D, H }, a, b) {
  const h = a / 2, X = W / 2, Y = D / 2;
  if (!(W > 0 && D > 0 && H > 0)) return { error: "размеры должны быть положительными" };
  const g = (L) => ((X + Y) / (L + 2 * h)) ** 2 + ((X - Y) / (L - 2 * h)) ** 2 - 2;
  let lo = 2 * h + 1e-6;
  if (g(lo) < 0) return { error: "коробка слишком мала для профиля" };
  let hi = Math.max(X, 4 * h) * 4;
  while (g(hi) > 0) hi *= 2;
  const L = bisect(g, lo, hi, 200);                                       // горизонтальный вынос торца от остриё: s_max
  const cs = (X + Y) / (L + 2 * h), cd = (X - Y) / (L - 2 * h), c = (cs + cd) / 2, s = (cs - cd) / 2;
  const phi = Math.atan2(s, c);
  if (!(L > b + MIN_LEN)) return { error: "коробка слишком узкая: брусок не помещается под углом" };
  const f = (al) => (H / 2) * Math.tan(al) + b / Math.cos(al) - L;
  const alpha = bisect(f, 0, 1.55, 200), ca = Math.cos(alpha), w = b / ca, B = (H / 2) * Math.tan(alpha);
  const T = [h * Math.sin(phi), h * Math.cos(phi)];
  return { h, X, Y, L, phi, phiDeg: phi / D2R, alpha, alphaDeg: alpha / D2R, apexDeg: 180 - 2 * alpha / D2R, w, B, T, A: H, a, b,
    // 4 точки контакта (z = H/2): остриё галочки 1 ↔ галочка 4 (ось X) и ↔ галочка 2 (ось Y), и зеркальные
    contacts: [[2 * h * Math.sin(phi), 0, H / 2], [0, 2 * h * Math.cos(phi), H / 2], [-2 * h * Math.sin(phi), 0, H / 2], [0, -2 * h * Math.cos(phi), H / 2]] };
}
const dv = (p) => { const pr = prof(p); return derive(p, pr.a, pr.b); };

/** одна галочка в локальных осях: s вдоль +X, толщина a по Y (−h…h), z 0…A */
export function chevron(p) {
  const g = dv(p), { B, w, A, h } = g;
  return prism([[0, A / 2], [B, A], [B + w, A], [w, A / 2], [B + w, 0], [B, 0]], -h, h);
}
/** 4 одинаковые галочки на своих местах (не сливаются: касаются только в точках) */
export function parts(p) {
  const g = dv(p), [Tx, Ty] = g.T, ph = g.phiDeg, one = chevron(p);
  const place = (theta, x, y) => one.clone().rotate(theta, [0, 0, 0], [0, 0, 1]).translate([x, y, 0]);
  const out = [place(ph, Tx, Ty), place(180 - ph, -Tx, Ty), place(180 + ph, -Tx, -Ty), place(-ph, Tx, -Ty)];
  one.delete();
  return g.swap ? out.map((s) => { const r = s.rotate(90, [0, 0, 0], [0, 0, 1]); s.delete(); return r; }) : out;
}

export const spec = {
  id: "YOZH", type: "Подстолье", category: "Подстолья", name: "Ёж", about: "4 одинаковые галочки, вписанные в коробку Длина × Ширина × Высота; соседние касаются в одной точке", controls,
  assembly: true,                                  // тела не сливаются (касание в точках): compound + проверка по телам
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    const err = dv(p).error;
    if (err) {                                                     // слишком маленькая коробка для профиля: увеличиваем меньшую сторону до минимально допустимой
      const o = { ...p }; let n = 0;
      while (dv(p).error && n++ < 600) { const k = p.W <= p.D ? "W" : "D"; p[k] = Math.min(2500, p[k] + 5); if (p.W === 2500 && p.D === 2500) break; }
      if (dv(p).error) { warnings.push(`${err} — возвращены размеры по умолчанию.`); for (const c of controls) if (c.type === "range") p[c.key] = c.def; }
      else for (const k of ["W", "D"]) if (p[k] !== o[k]) warnings.push(`«${controls.find((c) => c.key === k).label}»: ${o[k]} → ${p[k]} мм (${err}).`);
    }
    return { p, warnings };
  },
  derive: (p) => dv(p),
  parts,
  expectBBox: (p) => [p.W, p.D, p.H],
  view: { az: 30, el: 20 }, layout: "forms",
  // тонкий контур коробки (12 рёбер) — отдельным тонким слоем под размерами
  extraLines(p) {
    const { W, D, H } = p, x = W / 2, y = D / 2, c = (i, j, k) => [i * x, j * y, k * H], seg = [];
    for (const k of [0, 1]) for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) seg.push([c(a[0], a[1], k), c(b[0], b[1], k)]);
    for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) seg.push([c(i, j, 0), c(i, j, 1)]);
    return seg;
  },
  dims(p, k = 1) {
    const { W, D, H } = p, O = 70 * k;
    return [dim([-W / 2, -D / 2, 0], [W / 2, -D / 2, 0], `Длина ${W} мм`, [0, -O, 0]), dim([W / 2, -D / 2, 0], [W / 2, D / 2, 0], `Ширина ${D} мм`, [O, 0, 0]),
      dimAB([W / 2, D / 2, 0], [W / 2, D / 2, H], [W / 2 + O, D / 2, 0], [W / 2 + O, D / 2, H], `Высота ${H} мм`)];
  },
  textLines: (p) => ["Ёж", "Чертеж в изометрической проекции", `Коробка: Длина ${p.W} × Ширина ${p.D} × Высота ${p.H} мм`, `Профиль ${prof(p).label} мм`],
  // one chevron (local frame) with A, B, a, b
  oneView: { az: -35, el: 18 },
  oneDims(p, k = 1) {
    const g = dv(p), { A, B, w, L, h, b, a } = g, O = 90 * k, tg = Math.tan(g.alpha), ca = Math.cos(g.alpha), sa = Math.sin(g.alpha);
    // ширина бруска b — по перпендикуляру к оси нижнего бруска: выносные линии продолжают кромки бруска ниже торца
    const e = 60 * k, e1 = e - b * tg, dd = [sa, -ca], nn = [ca, sa], c0 = [B, -h, 0], c1 = [L, -h, 0];
    const a0 = [c0[0] + e * dd[0], -h, e * dd[1]], a1 = [c1[0] + e1 * dd[0], -h, e1 * dd[1]];
    return [
      dimAB([B, -h, A], [B, -h, 0], [-O, -h, A], [-O, -h, 0], `A = ${A} мм`),
      dimAB([L, -h, A], [w, -h, A / 2], [L, -h, A / 2], [w, -h, A / 2], `B = ${+B.toFixed(1)} мм`),
      dimAB([L, -h, A], [L, h, A], [L, -h, A + 60 * k], [L, h, A + 60 * k], `${a} мм`),
      dimAB(c0, c1, a0, a1, `${b} мм`),
    ];
  },
  oneTextLines: (p) => { const g = dv(p); return ["Галочка", "Чертеж в изометрической проекции", `A = ${p.H} мм, B = ${+g.B.toFixed(1)} мм`, `Угол бруска от вертикали α = ${g.alphaDeg.toFixed(2)}°`, `Профиль ${prof(p).label} мм`]; },
};
