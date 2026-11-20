// 0159 Подстолье 0159 (круглый стол): 4 ножки-«галки» через 90° в вертикальных радиальных плоскостях и два X-креста
// из прямых балок — внизу на полу и вверху под столешницей (вровень с верхом). Мм, Z вверх, ось — ось Z.
//
// РАЗМЕРЫ: D «Диаметр» — окружность, в которую вписаны наружные углы верхних концов и опор ножек; H «Высота» — общая;
//   g «Глубина галки» — горизонтальный отступ наружного угла колена внутрь от линии «верх — опора» (наружные точки).
//   Профиль квадратный a×a (по умолчанию 20×20).
// ГЕОМЕТРИЯ (всё — ОДНО тело): ножка — плоская галка толщиной a (по нормали к каждому отрезку) в плоскости (r, z), ширина a поперёк:
//   наружная линия (R,0) → колено (R−g, H/2) → (R,H), где R = √((D/2)² − (a/2)²) (наружные углы торцов на окружности D);
//   внутренняя линия — смещение наружной на a, концы срезаны горизонтально (пол / верх). Колено — на половине высоты.
//   Кресты: по 2 балки a×a вдоль направлений ножек, z ∈ [0,a] и [H−a,H], концы заходят в тело ножек.
import { prism, box } from "../lib/model.js";
import { range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { makeView } from "../render/projection.js";
import { circle3, extremeOn } from "../render/leaders.js";
import { frameMembers, stripLen, dist3, sum } from "../lib/length.js";
import { Irect, Arect, portalK, closedFrameK, fem2d, swayFromK } from "../lib/sway.js";

const SQ = [15, 20, 25, 30, 40].map((a) => ({ id: `${a}x${a}`, a, b: a, label: `${a}×${a}` }));
const LEGS = [10, 100, 190, 280];                         // ракурс: все 4 ножки видны (как у 0118)
const controls = [
  profileCtl("20x20", "profile", "Профиль", SQ),
  range("D", "Диаметр", 500, 1500, 5, 500),
  range("H", "Высота", 300, 1200, 5, 450),
  range("g", "Глубина галки", 0, 600, 5, 100),
  colorCtl("черный"),
];
const prof = (p) => findIn(SQ, p.profile);
const inter = (p, d, q, e) => { const det = d[0] * -e[1] + e[0] * d[1], rx = q[0] - p[0], ry = q[1] - p[1], t = (rx * -e[1] + e[0] * ry) / det; return [p[0] + t * d[0], p[1] + t * d[1]]; };
/** контур галки в плоскости (r, z): наружные F, K, T и внутренние Ti, Ki, Fi */
function chevron(p) {
  const a = prof(p).a, R = Math.sqrt((p.D / 2) ** 2 - (a / 2) ** 2), h = p.H / 2;
  const F = [R, 0], K = [R - p.g, h], T = [R, p.H];
  const off = (P, Q) => { const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]), d = [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L]; let n = [-d[1], d[0]]; if (n[0] > 0) n = [-n[0], -n[1]]; return [[P[0] + n[0] * a, P[1] + n[1] * a], d]; };
  const [p1, d1] = off(F, K), [p2, d2] = off(K, T);
  const Fi = inter(p1, d1, [0, 0], [1, 0]), Ti = inter(p2, d2, [0, p.H], [1, 0]);
  const Ki = Math.abs(d1[0] * d2[1] - d1[1] * d2[0]) < 1e-9 ? [p1[0], h] : inter(p1, d1, p2, d2);
  return { a, R, h, F, K, T, Ti, Ki, Fi };
}
const feasible = (p) => { const c = chevron(p); return c.Ki[0] >= c.a && c.Fi[0] < c.R - c.a / 2 - (p.g * c.a) / c.h + c.a / 2 && p.H >= 4 * c.a + 40; };

export const spec = {
  id: "0159", type: "Подстолье", category: "Подстолья Круглые", name: "Подстолье 0159",
  about: "Круглое подстолье: 4 ножки-галки через 90°, X-кресты из балок внизу и вверху",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    if (p.H < 4 * prof(p).a + 40) { const v = 4 * prof(p).a + 40; warnings.push(`«Высота»: ${p.H} → ${v} мм.`); p.H = v; }
    const g0 = p.g;
    while (p.g > 0 && !feasible(p)) p.g -= 5;                 // колено не заходит за центр и не съедает опоры крестов
    if (p.g !== g0) warnings.push(`«Глубина галки»: ${g0} → ${p.g} мм (иначе колено упирается в центр / в кресты).`);
    return { p, warnings };
  },
  parts(p) {
    const c = chevron(p), { a } = c, out = [];
    const leg = prism([c.F, c.K, c.T, c.Ti, c.Ki, c.Fi], -a / 2, a / 2);           // в плоскости XZ (r = X), ширина по Y
    for (const th of LEGS) out.push(leg.clone().rotate(th, [0, 0, 0], [0, 0, 1]));
    leg.delete();
    // кресты: конец балки — посередине между внутренним углом опоры и наружной линией на высоте a (всегда внутри ножки)
    const xe = (c.Fi[0] + (c.R - (p.g * a) / c.h)) / 2;
    for (const z0 of [0, p.H - a])
      for (const th of [LEGS[0], LEGS[1]]) out.push(box(-xe, xe, -a / 2, a / 2, z0, z0 + a).rotate(th, [0, 0, 0], [0, 0, 1]));
    return out;
  },
  /** раскачка (круглое, любое горизонтальное направление; lib/sway.js): плоская рама через две противоположные ножки-галки с балками креста вверху и внизу,
   *  ножки — шарниры на полу; две такие рамы под 90° → жёсткость одинакова в любом направлении (k·cos² + k·sin² = k) */
  sway(p) {
    const c = chevron(p), a = c.a, I = Irect(a, a), Ar = Arect(a, a), r = c.R - a / 2, rk = c.R - p.g - a / 2, zt = p.H - a / 2, zb = a / 2;
    const nodes = [[r, zb], [rk, p.H / 2], [r, zt], [-r, zt], [-rk, p.H / 2], [-r, zb]];
    const el = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]].map((n) => ({ n, I, A: Ar }));
    const u = fem2d(nodes, el, [[0, "x"], [0, "z"], [5, "x"], [5, "z"]], [[2, 0.5, 0], [3, 0.5, 0]]);
    return swayFromK(1 / ((u[2][0] + u[3][0]) / 2), true);
  },
  /** метраж: 4 галки (по оси, обе части) + 4 балки крестов */
  profileLength(p) {
    const c = chevron(p), xe = (c.Fi[0] + (c.R - (p.g * c.a) / c.h)) / 2;
    return 4 * stripLen([c.F, c.K, c.T, c.Ti, c.Ki, c.Fi], c.a) + 4 * 2 * xe;
  },
  expectBBox: (p) => {
    const { a, R } = chevron(p), xs = [], ys = [];
    for (const th of LEGS) { const t = (th * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t); for (const k of [-1, 1]) { xs.push(R * c - k * (a / 2) * s); ys.push(R * s + k * (a / 2) * c); } }
    return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), p.H];
  },
  view: { az: 35, el: 28 }, layout: "forms", auto: true,
  dims(p, k = 1) {
    const c = chevron(p), P2 = makeView(spec.view.az, spec.view.el).P2, O = 80 * k;
    const dir = (th) => { const t = (th * Math.PI) / 180; return [Math.cos(t), Math.sin(t)]; };
    const scr = LEGS.map((th) => P2(...dir(th), 0)[0]);
    const uL = dir(LEGS[scr.indexOf(Math.min(...scr))]);
    const at = (u, r, z) => [r * u[0], r * u[1], z];
    const top = circle3(p.D / 2, p.H);
    const out = [
      // высота — слева, по наружным точкам самой левой ножки
      dimAB(at(uL, c.R, 0), at(uL, c.R, p.H), at(uL, c.R + O, 0), at(uL, c.R + O, p.H), `${p.H} мм`),
      // диаметр — пунктирная окружность через наружные углы верхних концов ножек + выноска (как у Н091)
      { leader: true, curve: top, tip: extremeOn(top, P2, [-0.45, 1]), elbow: [0.1 * p.D * k, 0.14 * p.D * k], text: `Ø${p.D} мм` },
    ];
    // глубина галки на чертеже не показывается (только параметр в форме)
    return out;
  },
  textLines: (p) => ["Подстолье 0159", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Диаметр: Ø${p.D} мм`, `Высота: ${p.H} мм`],
};
