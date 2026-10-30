// H027-1 Ножка «V»: трапецеидальная рама Н050, согнутая по вертикальной оси симметрии (в плане верх и низ — «V» с одним углом).
//
// ПРОИСХОЖДЕНИЕ (шаги 1–5 эскиза): рама Н050 → копия, повёрнутая вокруг вертикальной оси симметрии (ось проходит через середину глубины
// профиля) → у каждой рамы остаётся одна половина → половины сливаются по оси, углы в месте сгиба — острый «биссектрисный» стык.
//
// ПАРАМЕТРЫ (обратная задача), все размеры по ВНЕШНЕМУ контуру вместе с толщиной профиля:
//   A = WT «Ширина верха»  — расстояние между крайними (внешними) точками верха: между внешними задними углами торцов верхней перекладины,
//                            измерено по прямой (хорда «V») перпендикулярно оси, т.е. ширина габарита в плане;
//   B = WB «Ширина низа»   — то же для низа (внешние точки нижней перекладины на z = 0);
//   C = D  «Глубина»       — глубина прямоугольника, в который вписан верх в плане: от внешней вершины «V» (сзади, на оси) до самой
//                            передней точки верха (внутренний передний угол торца верхней перекладины) = габарит ножки по глубине;
//   H      «Высота».
//   Профиль как в Н050: a = размер в глубину (в плане — ширина полосы «V», t), b = размер в плоскости рамы (толщина перекладины по высоте).
//
// ФОРМУЛЫ. α = половина угла «V» в плане, отсчитанная от прямой, перпендикулярной оси (α = 0 — плоская рама; угол излома = 2α;
// внутренний угол между крыльями = 180° − 2α). ℓt, ℓb = длина внешней (задней) кромки крыла от внешней вершины до торца (верх / низ).
//   A = 2·ℓt·cos α,   B = 2·ℓb·cos α,   C = ℓt·sin α + t·cos α      (t = a)
//   ⇒ ℓt = A / (2 cos α);  C = (A/2)·tg α + t·cos α  — f(α) = (A/2)tg α + t cos α − C монотонно растёт, корень единственный (метод бисекции),
//      существует при C > t; ℓb = B / (2 cos α) = ℓt·B/A.
// Проверка по эскизу (Н050 700/400/720, профиль 50×25, поворот копии на 70° = 2α, ось сгиба по середине глубины профиля): ℓt = 350 + (t/2)·tg35° = 367.5,
//   ℓb = 200 + (t/2)·tg35° = 217.5;  A = 2·367.5·cos35° = 602.1, B = 2·217.5·cos35° = 356.3, C = 367.5·sin35° + 50·cos35° = 251.8  ⇒  A=602, B=356, C=252, α=35.0°.
//
// ГЕОМЕТРИЯ. Крыло = рама-трапеция (как Н050) без стороны на оси, в локальных осях (u вдоль крыла от внешней вершины, глубина −t…0, z вверх):
// внешний контур [(u0,0), (ℓb,0), (ℓt,H), (u0,H)], внутренний контур — смещение внутрь на b (общие линии внутренних граней), ось «открыта».
// Крыло поворачивается на −α, обрезается плоскостью x ≥ 0 (плоскость биссектрисы = плоскость симметрии: острый стык, ничего не торчит), второе крыло —
// зеркало. Всё сливается в ОДНО тело (fuseAll + simplify → без швов). Вершина «V» сзади: Y = C, торцы спереди: Y → 0; x ∈ [−A/2, A/2].
import { frame, box, innerPolygon, bisect, free } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

const D2R = Math.PI / 180, MIN_EDGE = 12, MAX_ALPHA = 75;   // α ≤ 75° (излом ≤ 150°, внутренний угол «V» ≥ 30°)
const controls = [range("WT", "Ширина верха", 250, 1200, 1, 602), range("WB", "Ширина низа", 100, 1200, 1, 356), range("D", "Глубина", 60, 800, 1, 252),
  range("H", "Высота", 400, 1500, 10, 720), profileCtl("50x25"), colorCtl("черный")];

/**
 * (A,B,C,H,profile) -> derived geometry, or { error } when the combination cannot be built.
 * t = profile depth (a), b = profile size in the frame plane.
 */
export function derive({ A, B, C, H }, t, b) {
  if (!(A > 0 && B > 0 && C > 0 && H > 0)) return { error: "размеры должны быть положительными" };
  if (B > A) return { error: "«Ширина низа» не может быть больше «Ширины верха»" };
  if (C <= t) return { error: `«Глубина» должна быть больше толщины профиля (${t} мм): иначе нет изгиба`, tooSmallC: true };
  const f = (a) => (A / 2) * Math.tan(a) + t * Math.cos(a) - C;
  const hi = MAX_ALPHA * D2R;
  if (f(hi) < 0) return { error: "«Глубина» слишком велика для такой ширины верха (половина угла «V» α > 75°)", tooLargeC: true };
  const alpha = bisect(f, 0, hi, 100), ca = Math.cos(alpha), sa = Math.sin(alpha);
  const lt = A / (2 * ca), lb = B / (2 * ca), um = t * Math.tan(alpha);                   // um = u of the inner mitre point
  const outer = [[-5, 0], [lb, 0], [lt, H], [-5, H]], inner = innerPolygon(outer, [b, b, b, b], [3]);
  if (inner[1][0] - um < MIN_EDGE || inner[2][0] - um < MIN_EDGE) return { error: "профиль не помещается: внутренний проём слишком мал (угол слишком острый или рама слишком узкая)", tooLargeC: true };
  if (inner[2][1] - inner[1][1] < MIN_EDGE) return { error: "«Высота» слишком мала для профиля" };
  const legIn = Math.hypot(inner[2][0] - inner[1][0], inner[2][1] - inner[1][1]);
  if (legIn < MIN_EDGE) return { error: "ножка рамы слишком короткая для профиля" };
  return { alpha, alphaDeg: alpha / D2R, bendDeg: 2 * alpha / D2R, interiorDeg: 180 - 2 * alpha / D2R, lt, lb, halfA: A / 2, halfB: B / 2, um, outer, inner,
    // plan coordinates (x, y), apex at y = C, ends in front: outer back corners of the ends, inner front corner of the top end, inner apex
    plan: { apex: [0, C], topEnd: [lt * ca, C - lt * sa], botEnd: [lb * ca, C - lb * sa], frontInner: [lt * ca - t * sa, C - lt * sa - t * ca], innerApex: [0, C - t / ca] } };
}
const prof = (p) => findIn(PROFILES, p.profile);
const dv = (p) => { const pr = prof(p); return derive({ A: p.WT, B: p.WB, C: p.D, H: p.H }, pr.a, pr.b); };

export const spec = {
  id: "H027-1", type: "Ножка", category: "Ножки и опоры", name: "Ножка Н027-1", about: "Ножка-трапеция Н050, согнутая по оси: в плане верх и низ — «V» с одним углом", controls,
  normalize(raw) {
    const { p, warnings } = baseNormalize(controls, raw), pr = prof(p), lab = Object.fromEntries(controls.map((c) => [c.key, c]));
    const ok = (q) => !derive({ A: q.WT, B: q.WB, C: q.D, H: q.H }, pr.a, pr.b).error;
    if (p.WB > p.WT) { warnings.push(`«Ширина низа» не может быть больше ширины верха: ${p.WB} → ${p.WT} мм.`); p.WB = p.WT; }
    if (ok(p)) return { p, warnings };
    const why = dv(p).error, orig = { ...p };
    for (const key of ["D", "WB", "WT", "H"]) {                   // smallest single-key change (nearest valid integer) that makes the shape buildable
      const c = lab[key];
      for (let d = 1; d <= c.max - c.min; d++) {
        const cand = [orig[key] - d, orig[key] + d].filter((v) => v >= c.min && v <= c.max && (key !== "WB" || v <= p.WT) && (key !== "WT" || v >= p.WB));
        const hit = cand.find((v) => ok({ ...orig, [key]: v }));
        if (hit != null) { p[key] = hit; warnings.push(`«${c.label}»: ${orig[key]} → ${hit} мм (${why}).`); return { p, warnings }; }
      }
    }
    for (const c of controls) if (c.type === "range") p[c.key] = c.def;
    warnings.push("Сочетание параметров невозможно построить — возвращены размеры по умолчанию.");
    return { p, warnings };
  },
  derive: (p) => dv(p),
  parts(p) {
    const pr = prof(p), g = dv(p), t = pr.a, { H } = p;
    const local = frame(g.outer, [pr.b, pr.b, pr.b, pr.b], -t, 0, [3]);                      // trapezoid frame, open on the bend axis side
    const rot = local.rotate(-g.alphaDeg, [0, 0, 0], [0, 0, 1]); free(local);
    const half = box(0, 5000, -5000, 5000, -10, H + 10), cut = rot.intersect(half); free(rot, half);   // mitre = plane x = 0
    const right = cut.translate([0, p.D, 0]); free(cut);
    return [right, right.clone().mirror("YZ", [0, 0, 0])];
  },
  expectBBox: (p) => [p.WT, p.D, p.H],
  view: { az: -35, el: 16 }, layout: "forms", shaded: true,
  dims(p, k = 1) {
    const { WT, WB, D, H } = p, g = dv(p), O = 90 * k, P = g.plan;
    return [dimAB([-WT / 2, P.topEnd[1], H], [WT / 2, P.topEnd[1], H], [-WT / 2, D + O, H], [WT / 2, D + O, H], `${WT} мм`),
      dimAB([-WB / 2, P.botEnd[1], 0], [WB / 2, P.botEnd[1], 0], [-WB / 2, -O, 0], [WB / 2, -O, 0], `${WB} мм`),
      dimAB([WT / 2, P.topEnd[1], 0], [WT / 2, P.topEnd[1], H], [WT / 2 + O, P.topEnd[1], 0], [WT / 2 + O, P.topEnd[1], H], `${H} мм`)];
  },
  textLines: (p) => ["Ножка Н027-1", `Профиль ${prof(p).label} мм`, `Цвет: ${p.color}`, `Ширина верха: ${p.WT} мм`, `Ширина низа: ${p.WB} мм`, `Глубина: ${p.D} мм`, `Высота: ${p.H} мм`],
  // additional preview: plan (top) view with A, B, C
  extraViews: [{
    name: "plan", view: { az: 0, el: 89.99 }, layout: "forms",
    dims(p, k = 1) {
      const { WT, WB, D, H } = p, g = dv(p), O = 60 * k, P = g.plan;
      return [dimAB([-WT / 2, P.topEnd[1], H], [WT / 2, P.topEnd[1], H], [-WT / 2, D + 2 * O, H], [WT / 2, D + 2 * O, H], `A = ${WT} мм`),
        dimAB([-WB / 2, P.botEnd[1], 0], [WB / 2, P.botEnd[1], 0], [-WB / 2, D + O, 0], [WB / 2, D + O, 0], `B = ${WB} мм`),
        dimAB([P.apex[0], D, H], [P.frontInner[0], 0, H], [WT / 2 + O, D, H], [WT / 2 + O, 0, H], `C = ${D} мм`)];
    },
    textLines: (p) => { const g = dv(p); return ["Ножка Н027-1 — вид сверху", `Профиль ${prof(p).label} мм`, `Угол «V»: половина α = ${g.alphaDeg.toFixed(1)}°, излом ${g.bendDeg.toFixed(1)}°, внутр. ${g.interiorDeg.toFixed(1)}°`,
      `Длина внешней кромки крыла: верх ${g.lt.toFixed(1)}, низ ${g.lb.toFixed(1)} мм`]; },
  }],
};
