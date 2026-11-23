// 1187 «Вешалка арт.1187» — настенная вешалка из одной гнутой трубы a×a (по умолчанию 20×20). Категория «Вешалки».
// Оси: X — вылет от стены (вправо на виде), Y — толщина трубы (0..a, y = 0 — лицевая сторона), Z — высота. Плоскость изгиба — XZ.
// ГЕОМЕТРИЯ (все размеры наружные, углы острые — как гнутая полоса без радиуса, одно тело):
//   вертикальный верх: левая грань x = 0, z от H − V до H (длина V по наружной грани);
//   наклонный участок вниз-вправо до нижнего правого угла (Wt, 0) — крайней правой точки; полоса толщиной a между прямой через (Wt, 0)
//   и параллельной ей через (0, H − V); угол наклона следует из размеров;
//   нижняя лапка: нижняя грань z = 0 от x = Wt − F до x = Wt (длина F), идёт обратно к стене;
//   ушко: вертикальная пластина 10 (над верхом лапки) × a (ширина трубы) × 3 мм на верхней грани лапки у её свободного конца, заподлицо с торцом;
//   2 отверстия Ø5 — имитация: окружности на правой видимой грани вертикального верха (x = a), по центру ширины, на 40 и 100 мм от верха;
//   в модели не вырезаются (как отверстия «Тумба кух.»: spec.marks), на чертеже без размеров и выносок.
import { prism, box } from "../lib/model.js";
import { SQUARES, range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { makeView } from "../render/projection.js";
import { angleArcXZ } from "../render/arcs.js";

const VIEW = { az: 38, el: 20 };
const EAR_H = 10, EAR_T = 3, HOLES = [40, 100], HOLE_D = 5;
const controls = [
  profileCtl("20x20", "profile", "Профиль", SQUARES),
  range("W", "Общая глубина", 100, 500, 1, 180),
  range("F", "Глубина плечика", 60, 500, 1, 150),
  range("H", "Общая высота", 300, 1200, 1, 520),
  range("V", "Высота настенной части", 120, 600, 1, 150),
  colorCtl("черный"),
];
const prof = (p) => findIn(SQUARES, p.profile);

/** контур гнутой трубы в плоскости XZ и угол наклонного участка; null — наклон не строится */
export function outline(p) {
  const a = prof(p).a, { H, W, V, F } = p, B = [0, H - V], Fc = [W, 0];
  const Rr = Math.hypot(B[0] - Fc[0], B[1] - Fc[1]), phi = Math.atan2(Fc[0] - B[0], B[1] - Fc[1]);
  if (a / Rr >= 1) return null;
  const ang = Math.acos(-a / Rr) - phi, d = [-Math.cos(ang), Math.sin(ang)];            // B ниже-левее прямой через угол (W, 0)
  const G = [a, Fc[1] + (d[1] * (a - Fc[0])) / d[0]];                                    // правая грань наклона ∩ x = a
  const C = [B[0] + (d[0] * (a - B[1])) / d[1], a];                                      // левая грань наклона ∩ верх лапки z = a
  return { a, ang, G, C, pts: [[0, H], B, C, [W - F, a], [W - F, 0], Fc, G, [a, H]] };
}

export const spec = {
  id: "1187", type: "Вешалка", category: "Вешалки", name: "Вешалка арт.1187", cardLabel: "1187",
  about: "Настенная вешалка из одной гнутой трубы: вертикальный верх, наклон, лапка с ушком",
  controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), a = prof(p).a;
    const minV = HOLES[1] + 2 * a; if (p.V < minV) { warnings.push(`«Высота настенной части»: ${p.V} → ${minV} мм (отверстия на 40 и 100 мм от верха).`); p.V = minV; }
    if (p.V > p.H - 3 * a - 60) { const n = p.H - 3 * a - 60; warnings.push(`«Высота настенной части»: ${p.V} → ${n} мм (остаётся место на наклон).`); p.V = n; }
    const minW = 3 * a + 40; if (p.W < minW) { warnings.push(`«Общая глубина»: ${p.W} → ${minW} мм.`); p.W = minW; }
    const maxF = Math.floor(p.W - a / 2); if (p.F > maxF) { warnings.push(`«Глубина плечика»: ${p.F} → ${maxF} мм (не больше общей глубины).`); p.F = maxF; }
    // лапка должна выходить за наклон: свободный конец левее места, где наклон встречает лапку
    const o = outline(p); if (o && o.C[0] - (p.W - p.F) < a + EAR_T) { const n = Math.ceil(p.W - o.C[0] + a + EAR_T); warnings.push(`«Глубина плечика»: ${p.F} → ${n} мм (плечико короче наклона).`); p.F = Math.min(n, maxF); }
    return { p, warnings };
  },
  parts(p) {
    const o = outline(p), a = o.a, { H, W, F } = p;
    return [prism(o.pts, 0, a), box(W - F, W - F + EAR_T, 0, a, a, a + EAR_H)];
  },
  // отверстия Ø5 — только окружности на правой видимой грани x = a (как у «Тумба кух.»), в теле/STL их нет
  marks(p) {
    const a = prof(p).a;
    return HOLES.map((h) => Array.from({ length: 29 }, (_, i) => { const t = (2 * Math.PI * i) / 28; return [a, a / 2 + (HOLE_D / 2) * Math.cos(t), p.H - h + (HOLE_D / 2) * Math.sin(t)]; }));
  },
  /** метраж трубы по оси: верх + наклон + лапка (ушко не считается) */
  profileLength(p) {
    const o = outline(p), a = o.a, { H, W, V, F } = p, d = [-Math.cos(o.ang), Math.sin(o.ang)], B = [0, H - V];
    const t = (B[0] - W) * d[0] + B[1] * d[1], foot = [W + t * d[0], t * d[1]];                 // проекция B на правую грань наклона
    const M = [(B[0] + foot[0]) / 2, (B[1] + foot[1]) / 2];                                     // точка осевой линии наклона
    const k1 = [a / 2, M[1] + (d[1] * (a / 2 - M[0])) / d[0]], k2 = [M[0] + (d[0] * (a / 2 - M[1])) / d[1], a / 2];
    return (H - k1[1]) + Math.hypot(k2[0] - k1[0], k2[1] - k1[1]) + (k2[0] - (W - F));
  },
  expectBBox: (p) => [p.W, prof(p).a, p.H],
  view: VIEW, layout: "forms", auto: true,
  dims(p, k = 1) {
    const { H, W, V, F } = p, O = 45 * k;
    return [
      dimAB([0, 0, H], [W, 0, 0], [0, 0, H + O], [W, 0, H + O], `${W} мм`),
      dimAB([0, 0, H], [0, 0, H - V], [-O, 0, H], [-O, 0, H - V], `${V} мм`),
      dimAB([0, 0, 0], [0, 0, H], [-2.2 * O, 0, 0], [-2.2 * O, 0, H], `${H} мм`),
      dimAB([W - F, 0, 0], [W, 0, 0], [W - F, 0, -O], [W, 0, -O], `${F} мм`),
      { leader: true, curve: [], tip: [W - F + EAR_T / 2, 0, prof(p).a + EAR_H * 0.6], elbow: earElbow(p, O), text: `Ушко ${EAR_H}×${prof(p).a}` },
    ];
  },
  /** при включённой галочке «№ заказа»: углы изгибов (выноски к внутренним углам) и длина наклонного профиля по его правой (наружной) грани */
  orderDims(p, k = 1) {
    const g = bendInfo(p), O = 45 * k, n = [Math.sin(g.ang), Math.cos(g.ang)];             // n — наружу от правой грани наклона (вверх-вправо)
    const a3 = [g.G[0], 0, g.G[1]], b3 = [p.W, 0, 0];
    return [
      dimAB(a3, b3, [a3[0] + n[0] * O, 0, a3[2] + n[1] * O], [b3[0] + n[0] * O, 0, b3[2] + n[1] * O], `${Math.round(g.len)} мм`),
      ...angleArcs(p, k),
    ];
  },
  textLines: (p) => ["Вешалка арт.1187", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Высота: ${p.H} мм`],
};

/** Колено выноски «Ушко»: подпись (справа от полки) должна поместиться между размерной линией высоты и наклонным участком.
 *  Ширина подписи в мм экрана оценивается по габариту (подписи в пикселях, масштаб чертежа ~ высоте); перебираются высоты колена.
 *  Если места нет нигде — подпись уходит левее размерной линии высоты. На умолчаниях — [-60, 90]. */
function earElbow(p, O) {
  const o = outline(p), a = o.a, { P2 } = makeView(VIEW.az, VIEW.el), { H, W, F } = p;
  const T = P2(W - F + EAR_T / 2, 0, a + EAR_H * 0.6), Lw = 0.2 * (H + 2 * O), hgt = 0.035 * (H + 2 * O);
  const xDim = P2(-2.2 * O, 0, 0)[0] + 0.02 * H;                                         // левая граница: размерная линия высоты (+ зазор)
  const s0 = P2(...[o.C[0], 0, a]), s1 = P2(o.pts[1][0], 0, o.pts[1][1]);                 // левая грань наклона на экране
  const slantX = (y) => s0[0] + ((s1[0] - s0[0]) * (y - s0[1])) / (s1[1] - s0[1]);
  for (const dy of [90, 70, 110, 130, 50, 150, 180]) for (const dx of [-60, -40, -80, -20, -100]) {
    const E = [T[0] + dx, T[1] + dy];
    if (E[0] > xDim && E[0] + Lw < Math.min(slantX(E[1] - hgt), slantX(E[1] + hgt)) - 0.015 * H) return [dx, dy];
  }
  return [xDim - 0.04 * H - Lw - 0.04 * (H + 2 * O) - T[0], 60];
}

/** углы изгибов и длина наклонного участка. Длина — по правой грани наклона: от внутреннего угла верхнего изгиба (x = a) до нижнего правого угла;
 *  на умолчаниях 406,9 → 407 мм (по левой грани было бы 380,7, по оси ≈ 394). Верхний угол = 90° + наклон к горизонтали, нижний = наклон. */
export function bendInfo(p) {
  const o = outline(p), deg = (o.ang * 180) / Math.PI;
  return { a: o.a, ang: o.ang, G: o.G, C: o.C, top: 90 + deg, bottom: deg, len: Math.hypot(p.W - o.G[0], o.G[1]) };
}
/** угловые размеры дугами без стрелок (как у Н105). Верхний: центр — внутренний угол верхнего изгиба на дальнем ребре (y = a, видимый край
 *  внутренних граней), подпись правее настенной части выше дуги и выносной линии размера длины наклона. Нижний: центр — видимый внутренний угол
 *  на передней грани (верхнее переднее ребро плечика ∩ внутреннее переднее ребро наклона), радиус ≈ 1,5 ширины профиля, подпись выше-левее дуги,
 *  левее наклона. Подписи ставятся в экранных координатах (размер подписи на экране ~ габарит чертежа S) и переводятся в 3D на плоскости y = a. */
function angleArcs(p, k = 1) {
  const g = bendInfo(p), a = g.a, { P2, RIGHT, UP } = makeView(VIEW.az, VIEW.el), S = p.H + 90 * k;
  const r = 0.035 * S, hw = 0.036 * S, hh = 0.015 * S, m = 0.008 * S;
  const n = (q) => { const L = Math.hypot(q[0], q[1]); return [q[0] / L, q[1] / L]; };
  const to3 = ([tx, ty]) => {                                                   // P2(x, a, z) = (tx, ty) → x, z
    const bx = tx - RIGHT[1] * a, by = ty - UP[1] * a, det = RIGHT[0] * UP[2] - RIGHT[2] * UP[0];
    return [(bx * UP[2] - RIGHT[2] * by) / det, a, (RIGHT[0] * by - bx * UP[0]) / det];
  };
  // верх
  const Gt = P2(g.G[0], a, g.G[1]), G0 = P2(g.G[0], 0, g.G[1]), nn = [Math.sin(g.ang), Math.cos(g.ang)], E = P2(g.G[0] + nn[0], 0, g.G[1] + nn[1]);
  const slope = (E[1] - G0[1]) / (E[0] - G0[0]), cxT = Gt[0] + m + hw + 0.2 * r;
  const cyT = Math.max(Gt[1] + r + m + hh, G0[1] + (cxT + hw - G0[0]) * slope + m + hh);
  const top = angleArcXZ(g.G, [0, 1], n([p.W - g.G[0], -g.G[1]]), r, 0, fmtDeg(g.top), a);
  top.at = to3([cxT, cyT]);
  // низ: вершина — видимый внутренний угол на передней грани (верхнее переднее ребро плечика ∩ внутреннее переднее ребро наклона), y = 0;
  // дуга малого радиуса (≈ ширина профиля) поверх верхней грани плечика в V-зазоре; подпись выше-левее дуги, левее наклона
  const rb = 1.5 * a, C0 = P2(g.C[0], 0, g.C[1]), Cf = P2(g.C[0], a, g.C[1]);
  const s0 = P2(g.C[0], 0, a), s1 = P2(0, 0, p.H - p.V), slantX = (y) => s0[0] + ((s1[0] - s0[0]) * (y - s0[1])) / (s1[1] - s0[1]);
  const fs = UP[0] / RIGHT[0], farY = (x) => Cf[1] + (x - Cf[0]) * fs;                  // дальнее ребро верха плечика на экране (наклонено)
  const arcTop = P2(g.C[0] - rb * Math.cos(g.ang / 2), 0, g.C[1] + rb * Math.sin(g.ang / 2))[1];
  let cx = C0[0] - hw, cy = 0;
  for (let i = 0; i < 6; i++) { cy = Math.max(arcTop, farY(cx - hw)) + m + hh; cx = Math.min(C0[0] - hw, slantX(cy + hh) - m - hw); }
  const bot = angleArcXZ(g.C, [-1, 0], [-Math.cos(g.ang), Math.sin(g.ang)], rb, 0, fmtDeg(g.bottom), 0);
  bot.at = to3([cx, cy]);
  return [top, bot];
}
const fmtDeg = (v) => `${v.toFixed(1).replace(".", ",")}°`;
