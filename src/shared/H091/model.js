// H091 (Н091) Подстолье для круглого стола: сверху и снизу трёхлучевые звёзды (лучи всегда через 120°),
// концы верхних и нижних лучей соединены наклонными ножками. Мм, Z вверх, ось подстолья — ось Z.
//
// РАЗМЕРЫ: Dt «Верхний диаметр», Db «Нижний диаметр» — окружности, в которые вписаны наружные углы концов лучей
//   верхней / нижней звезды; H «Высота» (пол → верх). Углы 120° не параметр и на чертеже не подписываются.
// ГЕОМЕТРИЯ: три одинаковые плоские рамы (нижний луч + ножка + верхний луч) в вертикальных плоскостях через ось,
//   повёрнутые на 0/120/240°. Профиль a×b (по умолчанию 50×25): b — в плоскости рамы (высота луча, толщина ножки),
//   a — поперёк рамы (широкая сторона лучей лежит горизонтально, как на референсе). Углы рамы — острые (как у остальных рам),
//   в центре лучи продлены на a/(2√3) за ось, так что три луча сходятся в чистый «Y» без щелей. Всё — ОДНО тело.
import { frame, free } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { makeView } from "../render/projection.js";
import { circle3, extremeOn } from "../render/leaders.js";
import { frameMembers, stripLen, dist3, sum } from "../lib/length.js";

const ARMS = [228, 108, -12];                             // направления лучей, град (между лучами всегда 120°); ракурс как на референсе, 228° — левый луч
const controls = [
  profileCtl("50x25", "profile", "Профиль", PROFILES),
  range("Dt", "Верхний диаметр", 300, 1500, 5, 700),
  range("Db", "Нижний диаметр", 300, 1800, 5, 900),
  range("H", "Высота", 300, 1200, 5, 630),
  colorCtl("черный"),
];
const prof = (p) => findIn(PROFILES, p.profile);
/** радиус до наружной грани торца луча (по оси луча), чтобы наружные углы торца легли на окружность D */
const rad = (D, a) => Math.sqrt((D / 2) ** 2 - (a / 2) ** 2);
/** контур одной рамы в плоскости (r, z); ребро 3 (по оси) открыто */
function outline(p) {
  const { a } = prof(p), e = a / (2 * Math.sqrt(3)), Rt = rad(p.Dt, a), Rb = rad(p.Db, a);
  return [[-e, 0], [Rb, 0], [Rt, p.H], [-e, p.H]];
}
const feasible = (p) => { const { a, b } = prof(p); return rad(p.Dt, a) > a + 2 * b && rad(p.Db, a) > a + 2 * b && frameFeasible(outline(p), [b, b, b, 0], 12); };
/** габарит: крайние углы торцов лучей по X/Y */
function extent(p) {
  const { a } = prof(p), pts = [];
  for (const R of [rad(p.Dt, a), rad(p.Db, a)])
    for (const th of ARMS) { const c = Math.cos((th * Math.PI) / 180), s = Math.sin((th * Math.PI) / 180);
      for (const k of [-1, 1]) pts.push([R * c - k * (a / 2) * s, R * s + k * (a / 2) * c]); }
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

export const spec = {
  id: "H091", type: "Подстолье", category: "Подстолья Круглые", name: "Подстолье Н091",
  about: "Подстолье для круглого стола: верхняя и нижняя трёхлучевые звёзды (120°) и три наклонные ножки",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    relax(p, controls, feasible, [["H", 5], ["Db", 5], ["Dt", 5]], warnings);
    return { p, warnings };
  },
  parts(p) {
    const { a, b } = prof(p), one = frame(outline(p), [b, b, b, 0], -a / 2, a / 2, [3]);
    const out = ARMS.map((th) => one.clone().rotate(th, [0, 0, 0], [0, 0, 1]));
    free(one);
    return out;
  },
  /** метраж: 3 рамы (нижний луч + ножка + верхний луч) по оси */
  profileLength(p) { const b = prof(p).b; return 3 * sum(frameMembers(outline(p), [b, b, b, 0], [3])); },
  expectBBox: (p) => { const e = extent(p); return [e.x1 - e.x0, e.y1 - e.y0, p.H]; },
  view: { az: 35, el: 28 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const { a } = prof(p), Rt = rad(p.Dt, a), Rb = rad(p.Db, a), O = 80 * k, R = Math.max(Rt, Rb) + O;
    const t = (ARMS[0] * Math.PI) / 180, u = [Math.cos(t), Math.sin(t)], at = (r, z) => [r * u[0], r * u[1], z];
    // высота — слева, по торцам левого луча (как на референсе), размерная линия снаружи по направлению луча
    // диаметры — пунктирные окружности (через наружные углы концов лучей) с выносками, как на референсе
    const P2 = makeView(spec.view.az, spec.view.el).P2, top = circle3(p.Dt / 2, p.H), bot = circle3(p.Db / 2, 0), s = Math.max(p.Dt, p.Db);
    return [dimAB(at(Rb, 0), at(Rt, p.H), at(R, 0), at(R, p.H), `${p.H} мм`),
      { leader: true, curve: top, tip: extremeOn(top, P2, [-0.45, 1]), elbow: [0.07 * s * k, 0.12 * s * k], text: `Ø${p.Dt} мм` },
      { leader: true, curve: bot, tip: extremeOn(bot, P2, [1, 0]), elbow: [0.12 * s * k, 0], text: `Ø${p.Db} мм` }];
  },
  textLines: (p) => ["Подстолье Н091", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`,
    `Верхний диаметр: Ø${p.Dt} мм`, `Нижний диаметр: Ø${p.Db} мм`, `Высота: ${p.H} мм`],
};
