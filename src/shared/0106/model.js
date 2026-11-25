// 0106 Ножка для стола: как Н028, но рама — трапеция: ширина и глубина задаются отдельно для верха и низа.
// По умолчанию профиль 60×30 (30 в плоскости, 60 в глубину), верх 700×300, низ 500×200, высота 710, цвет черный;
// плюс боковая рама от середины верхней и нижней перемычек. Задняя стойка — тот же frame(), что и у остальных
// диагональных профилей: стыки «в ус», наружное ребро от верхней точки верха (y=DT, z=H) к нижней точке низа (y=DB, z=0).
import { frame, free, innerPolygon } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize, frameFeasible, relax } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { angleArcXZ, angleArcYZ } from "../render/arcs.js";
import { frameMembers, sum } from "../lib/length.js";

const controls = [
  range("WT", "Ширина верха", 250, 1000, 10, 700),
  range("WB", "Ширина низа", 250, 1000, 10, 500),
  range("DT", "Глубина верха", 100, 700, 10, 300),
  range("DB", "Глубина низа", 100, 700, 10, 200),
  range("H", "Высота", 300, 1100, 10, 710),
  profileCtl("60x30"), colorCtl("черный"),
];

/** Центрированная трапеция в плоскости XZ, габарит от x=0. */
const geo = (p) => {
  const Wmax = Math.max(p.WT, p.WB), x0b = (Wmax - p.WB) / 2, x0t = (Wmax - p.WT) / 2;
  return { Wmax, x0b, x0t, outer: [[x0b, 0], [x0b + p.WB, 0], [x0t + p.WT, p.H], [x0t, p.H]] };
};
/** Боковая рама в плоскости глубины (локально XZ = YZ модели): открыта спереди, где стыкуется с фасадной рамой. */
const sideOuter = (p, r) => [[r.a, 0], [p.DB, 0], [p.DT, p.H], [r.a, p.H]];

export const spec = {
  id: "0106", type: "Ножка", category: "Ножки и опоры", name: "Ножка 0106",
  about: "Ножки для стола: трапециевидная рама с боковой рамой (ширина и глубина верха и низа)", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw);
    relax(p, controls, (q) => {
      const r = findIn(PROFILES, q.profile), { outer } = geo(q), t = r.b;
      return frameFeasible(outer, [t, t, t, t], 20) && frameFeasible(sideOuter(q, r), [t, t, t, 0], 20)
        && q.DT >= r.a + t + 30 && q.DB >= r.a + t + 30 && q.H >= 2 * t + 40;
    }, [["DT", 10], ["DB", 10], ["H", 10], ["WT", 10], ["WB", 10]], warnings, "иначе профиль не помещается");
    return { p, warnings };
  },
  parts(p) {
    const r = findIn(PROFILES, p.profile), { a: DEP, b: TIN } = r, { Wmax, outer } = geo(p);
    const cx1 = Wmax / 2 + DEP / 2;
    // frame в XZ (локальный x = глубина), затем поворот в YZ, как у 0320 / Н114
    const side = frame(sideOuter(p, r), [TIN, TIN, TIN, TIN], 0, DEP, [3]);
    const placed = side.rotate(90, [0, 0, 0], [0, 0, 1]).translate([cx1, 0, 0]);
    free(side);
    return [frame(outer, [TIN, TIN, TIN, TIN], 0, DEP), placed];
  },
  /** метраж: фасадная рама WT/WB × H + боковая рама (три элемента, наклонный — по оси, стыки «в ус») */
  profileLength(p) {
    const r = findIn(PROFILES, p.profile), t = r.b, { outer } = geo(p);
    return sum(frameMembers(outer, [t, t, t, t])) + sum(frameMembers(sideOuter(p, r), [t, t, t, t], [3]));
  },
  expectBBox: (p) => [Math.max(p.WT, p.WB), Math.max(p.DT, p.DB), p.H],
  view: { az: -31, el: 23, mirrorY: true }, layout: "forms", auto: true,  // слева сверху, зеркало только на чертеже: фасад к зрителю, глубина вправо-вниз
  dims(p, k = 1) {
    const { WT, WB, DT, DB, H } = p, { Wmax, x0b, x0t } = geo(p), O = 80 * k;
    const D = Math.max(DT, DB), yf = (y) => D - y;                 // координаты чертежа после view.mirrorY: фасад на y=D, торец глубины ближе к зрителю
    const xr = x0b + WB, yF = yf(0);                               // плоскость фасада; xr — правый край нижней перемычки
    const Od = DB + O;                                             // 500: вынос вдоль глубины за низ боковой рамы
    return [
      dimAB([x0t, yF, H], [x0t + WT, yF, H], [x0t, yF, H + O], [x0t + WT, yF, H + O], `${WT} мм`),                 // ширина верха — над рамой (как было)
      dimAB([Wmax, yF, H], [Wmax, yf(DT), H], [Wmax + O, yF, H], [Wmax + O, yf(DT), H], `${DT} мм`),             // глубина верха: выносы вправо от правого края верха, размер вдоль глубины
      dimAB([x0b, yF, 0], [x0t, yF, H], [-O, yF, 0], [-O, yF, H], `${H} мм`),                                     // высота — слева (как было)
      dimAB([x0b, yF, 0], [xr, yF, 0], [x0b, yF - Od, 0], [xr, yF - Od, 0], `${WB} мм`),                           // ширина низа: выносы к зрителю вдоль глубины
      dimAB([xr, yF, 0], [xr, yf(DB), 0], [xr + O, yF, 0], [xr + O, yf(DB), 0], `${DB} мм`),                         // глубина низа: как 300 — короткие выносы от правого края низа, размер вдоль глубины
    ];
  },
  /** при галочке «№ заказа»: полные длины наружных рёбер наклонных профилей и внутренние углы дугами без стрелок */
  orderDims(p, k = 1) {
    const { WT, WB, DT, DB, H } = p, { Wmax, x0b, x0t, outer } = geo(p);
    const r = findIn(PROFILES, p.profile), t = r.b, DEP = r.a;
    const D = Math.max(DT, DB), yf = (y) => D - y, yF = yf(0);
    const innW = innerPolygon(outer, [t, t, t, t]), innS = innerPolygon(sideOuter(p, r), [t, t, t, t], [3]);
    const nrm = (x, z) => { const L = Math.hypot(x, z) || 1; return [x / L, z / L]; };
    const lenW = Math.hypot(x0t - x0b, H), lenS = Math.hypot(DT - DB, H);
    const aW = Math.atan2(Math.abs(x0b - x0t), H), aS = Math.atan2(Math.abs(DT - DB), H);
    const wTop = Math.round(90 - aW * 180 / Math.PI), wBot = Math.round(90 + aW * 180 / Math.PI);
    const sTop = Math.round(90 - aS * 180 / Math.PI), sBot = Math.round(90 + aS * 180 / Math.PI);
    // 717 слева: параллельно наружному левому ребру, снаружи, дальше вертикали 710
    const Lslant = 220 * k, nL = nrm(-(H), -(x0b - x0t));                                   // наружная нормаль в XZ (влево-вниз)
    const pLT = [x0t, yF, H], pLB = [x0b, yF, 0];
    const dimLeft = dimAB(pLT, pLB, [pLT[0] + nL[0] * Lslant, yF, pLT[2] + nL[1] * Lslant], [pLB[0] + nL[0] * Lslant, yF, pLB[2] + nL[1] * Lslant], `${Math.round(lenW)} мм`);
    // 717 боковой рамы: выносы влево вдоль оси ширины (как ребро 700), размер между ними в проёме
    const xFace = Wmax / 2 - DEP / 2, Ox = 180 * k;
    const pST = [xFace, yf(DT), H], pSB = [xFace, yf(DB), 0];              // верх и низ наружного ребра наклона, левая грань
    const dimSide = dimAB(pST, pSB, [pST[0] - Ox, pST[1], H], [pSB[0] - Ox, pSB[1], 0], `${Math.round(lenS)} мм`);
    const rA = 50 * k, rlTop = 82 * k, rlBot = 115 * k;
    const yFront = yf(DEP);                                               // ближняя к зрителю грань фасадной рамы (не задняя)
    // 82° — внутренний верхний левый угол передней грани, подпись справа-ниже в проёме
    const arcWT = angleArcXZ(innW[3], [1, 0], nrm(x0b - x0t, -H), rA, 68 * k, `${wTop}°`, yFront);
    // 98° — внутренний нижний левый угол передней грани, подпись справа-выше в проёме
    const arcWB = angleArcXZ(innW[0], [1, 0], nrm(x0t - x0b, H), rA, 70 * k, `${wBot}°`, yFront);
    // боковая рама: внутренние углы у наклона, в плоскости левой грани (YZ, координаты после mirrorY)
    const vST = [yf(innS[2][0]), innS[2][1]], vSB = [yf(innS[1][0]), innS[1][1]];
    const arcST = angleArcYZ(vST, [1, 0], nrm(yf(innS[1][0]) - yf(innS[2][0]), innS[1][1] - innS[2][1]), rA, rlTop, `${sTop}°`, xFace);
    arcST.at = [xFace, arcST.at[1] + 25 * k, arcST.at[2] - 20 * k];
    // 98° у низа наклона: дуга во внутреннем углу, подпись слева-сверху у дуги; можно заезжать на модель
    const arcSB = angleArcYZ(vSB, [1, 0], nrm(yf(innS[2][0]) - yf(innS[1][0]), innS[2][1] - innS[1][1]), rA, 62 * k, `${sBot}°`, xFace);
    arcSB.at = [xFace - 28 * k, vSB[0] + 10 * k, vSB[1] + 55 * k];     // слева-сверху от дуги, в проёме
    arcSB.overGeom = true;
    return [dimLeft, dimSide, arcWT, arcWB, arcST, arcSB];
  },
  textLines: (p) => ["Ножка 0106", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`,
    `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Глубина верха: ${p.DT} мм`, `Глубина низа: ${p.DB} мм`, `Высота: ${p.H} мм`],
};
