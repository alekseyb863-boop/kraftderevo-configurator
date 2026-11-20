// H105 Ножка: плоская сварная рама в плоскости XZ (глубина профиля по +Y), два треугольника, соединённые диагональю. мм, Z вверх, основание на Z = 0.
//
// ПОСТРОЕНИЕ (по эскизу заказчика, размеры — по наружному контуру профиля):
//   1) верхняя перекладина длиной WT («Ширина верха») на высоте H и нижняя длиной WB («Ширина низа») на полу, обе по центру общей вертикальной оси (ось не рисуется);
//   2) диагональ от правого конца верха (TR) к левому концу низа (BL) — правая грань диагонали проходит через TR, левая через BL (ширина диагонали = b);
//   3) от левого конца верха (TL) вниз-вправо — наклонная под углом A («Угол ножек», между верхом и наклонной, внутри треугольника) до диагонали → верхний треугольник;
//      от правого конца низа (BR) вверх-влево — наклонная под тем же углом A к низу до диагонали → нижний треугольник.
//   Модель = верхняя рама-треугольник ∪ нижняя рама-треугольник ∪ полоса диагонали (стыки «в ус», наружные углы острые).
// ПРОВЕРКА: наклонные должны упираться в диагональ в пределах её длины, треугольники — вмещать профиль; иначе угол подбирается ближайший допустимый (предупреждение).
import { prism, frame, innerPolygon } from "../lib/model.js";
import { range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible } from "../lib/params.js";
import { PROFILES_H031 } from "../H031/model.js";
import { dimAB } from "../render/dimhelpers.js";
import { angleArcXZ } from "../render/arcs.js";

const prof = (p) => findIn(PROFILES_H031, p.profile);
const controls = [range("WT", "Ширина верха", 150, 1200, 10, 500), range("WB", "Ширина низа", 150, 1200, 10, 300), range("H", "Высота", 300, 1500, 10, 710),
  range("A", "Угол ножек", 30, 89, 1, 70, "°"), profileCtl("40x20", "profile", "Профиль", PROFILES_H031), colorCtl("черный")];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const unit = (v) => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; };
/** пересечение прямых p + t·d и q + s·e */
const inter = ([p, d], [q, e]) => { const det = d[0] * -e[1] + e[0] * d[1], r = sub(q, p), t = (r[0] * -e[1] + e[0] * r[1]) / det; return add(p, mul(d, t)); };
/** смещение прямой на t в сторону точки toward */
const shift = ([p, d], t, toward) => { let n = [-d[1], d[0]]; if ((toward[0] - p[0]) * n[0] + (toward[1] - p[1]) * n[1] < 0) n = mul(n, -1); return [add(p, mul(n, t)), d]; };

/** вся плоская геометрия (x, z) для параметров p */
export function geo(p) {
  const b = prof(p).b, { WT, WB, H, A } = p, a = (A * Math.PI) / 180;
  const TL = [-WT / 2, H], TR = [WT / 2, H], BL = [-WB / 2, 0], BR = [WB / 2, 0];
  // направление диагонали: прямые через TR и BL с этим направлением отстоят друг от друга на b; правая грань — через TR
  const v = sub(BL, TR), Lv = Math.hypot(...v), phi = Math.asin(Math.min(1, b / Lv)), base = Math.atan2(v[1], v[0]);
  let d = null;
  for (const sgn of [1, -1]) {
    const dd = [Math.cos(base + sgn * phi), Math.sin(base + sgn * phi)], xR0 = TR[0] + dd[0] * (0 - H) / dd[1];
    if (xR0 > BL[0]) { d = dd; break; }
  }
  const right = [TR, d], left = [BL, d];
  const uUp = [Math.cos(a), -Math.sin(a)], uLo = [-Math.cos(a), Math.sin(a)];
  const P = inter([TL, uUp], right), Q = inter([BR, uLo], left);
  const R0 = inter(right, [[0, 0], [1, 0]]), L1 = inter(left, [[0, H], [1, 0]]);
  const upper = [TL, P, TR], lower = [BL, BR, Q], strip = [BL, R0, TR, L1];
  return { b, TL, TR, BL, BR, P, Q, d, right, left, uUp, uLo, upper, lower, strip };
}
/** форма собирается: наклонные упираются в диагональ в пределах высоты, треугольники вмещают профиль */
const feasible = (p) => {
  const g = geo(p), { b, P, Q, H = p.H } = { ...g, H: p.H };
  return P[1] >= b && P[1] <= p.H - b && Q[1] >= b && Q[1] <= p.H - b && P[0] > g.TL[0] && Q[0] < g.BR[0]
    && frameFeasible(g.upper, [b, b, b]) && frameFeasible(g.lower, [b, b, b]);
};

export const spec = {
  id: "H105", type: "Ножка", category: "Ножки и опоры", name: "Ножка Н105", about: "Ножка из двух треугольников, соединённых диагональю; угол наклонных — «Угол ножек»", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    if (!feasible(p)) {
      const c = controls.find((x) => x.key === "A"), A0 = p.A;
      let found = null;
      for (let k = 1; k <= c.max - c.min && found == null; k++) for (const A of [A0 - k, A0 + k]) if (found == null && A >= c.min && A <= c.max && feasible({ ...p, A })) found = A;
      if (found != null) { warnings.push(`«Угол ножек»: ${A0}° → ${found}° (иначе наклонные не доходят до диагонали или профиль не помещается).`); p.A = found; }
      else {
        const def = baseNormalize(controls, {}).p;
        warnings.push("Форма не строится при этих размерах и профиле — восстановлены размеры по умолчанию.");
        Object.assign(p, { WT: def.WT, WB: def.WB, H: def.H, A: def.A });
      }
    }
    return { p, warnings };
  },
  parts(p) {
    const g = geo(p), y1 = prof(p).a;
    return [frame(g.upper, [g.b, g.b, g.b], 0, y1), frame(g.lower, [g.b, g.b, g.b], 0, y1), prism(g.strip, 0, y1)];
  },
  /** метраж по осям: верх, низ, диагональ — между осями соседних перекладин; наклонные — от оси перекладины до грани диагонали */
  profileLength(p) {
    const g = geo(p), b = g.b, mid = [0, p.H / 2], h = b / 2;
    const top = shift([[0, p.H], [1, 0]], h, mid), bot = shift([[0, 0], [1, 0]], h, mid), dc = shift(g.right, h, g.BL);
    const up = shift([g.TL, g.uUp], h, g.TR), lo = shift([g.BR, g.uLo], h, g.BL);
    const len = (a, c) => Math.hypot(c[0] - a[0], c[1] - a[1]);
    const cTL = inter(top, up), cTR = inter(top, dc), cBL = inter(bot, dc), cBR = inter(bot, lo);
    return len(cTL, cTR) + len(cBL, cBR) + len(cTR, cBL) + len(cTL, inter(up, g.left)) + len(cBR, inter(lo, g.right));
  },
  expectBBox: (p) => [Math.max(p.WT, p.WB), prof(p).a, p.H],
  view: { az: -30, el: 16 }, layout: "forms",          // 3/4 спереди-слева, как на фото заказчика: плоскость ножки уходит вправо вглубь
  dims(p, k = 1) {
    const g = geo(p), { WT, WB, H } = p, O = 70 * k, xr = Math.max(g.TR[0], g.BR[0]);
    const iu = innerPolygon(g.upper, [g.b, g.b, g.b]), il = innerPolygon(g.lower, [g.b, g.b, g.b]);
    // подпись — на биссектрисе: при остром угле дальше от вершины, но не дальше центра вписанной окружности внутреннего треугольника (самое просторное место)
    const inc = (t) => { const [A, B, C] = t, la = Math.hypot(B[0] - C[0], B[1] - C[1]), lb = Math.hypot(A[0] - C[0], A[1] - C[1]), lc = Math.hypot(A[0] - B[0], A[1] - B[1]), s = la + lb + lc;
      return [(la * A[0] + lb * B[0] + lc * C[0]) / s, (la * A[1] + lb * B[1] + lc * C[1]) / s]; };
    const arcAt = (inner, i, u1, u2) => { const v = inner[i], c = inc(inner), dc = Math.hypot(c[0] - v[0], c[1] - v[1]);
      const r = Math.min(Math.max(30, Math.min(70, 0.12 * Math.min(WT, WB, H))), 0.45 * dc), rl = Math.min(Math.max(r + 38, 48 / Math.sin((p.A * Math.PI) / 360)), dc);
      return angleArcXZ(v, u1, u2, r, rl, `${p.A}°`); };
    return [
      dimAB([-WT / 2, 0, H], [WT / 2, 0, H], [-WT / 2, 0, H + O], [WT / 2, 0, H + O], `${WT} мм`),
      dimAB([-WB / 2, 0, 0], [WB / 2, 0, 0], [-WB / 2, 0, -O], [WB / 2, 0, -O], `${WB} мм`),
      dimAB([WB / 2, 0, 0], [WT / 2, 0, H], [xr + O, 0, 0], [xr + O, 0, H], `${H} мм`),             // высота — справа, от правых концов верха и низа
      arcAt(iu, 0, [1, 0], g.uUp),                                                                         // угол у верхнего треугольника
      arcAt(il, 1, [-1, 0], g.uLo),                                                                        // угол у нижнего треугольника
    ];
  },
  textLines: (p) => ["Ножка Н105", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Высота: ${p.H} мм`, `Угол ножек: ${p.A}°`],
};
