// Столы (вкладка «Столы»): столешница (как на вкладке «Столешницы») + ножки одного из 9 артикулов вкладки «Ножки».
// Оси: X — длина столешницы, Y — ширина, Z — вверх; z = 0 — пол. Столешница: x ∈ [0, L], y ∈ [0, W], z ∈ [Hн, Hн + T] (Hн — высота ножек).
// Ширина ножки (параметр «Ширина» артикула) не задаётся: = ширина столешницы − 2 × «Отступ по ширине от края столешницы».
// «Отступ по длине от края столешницы» — расстояние от торца столешницы до наружной грани опоры (0 — вровень).
// Виды размещения:
//   pair   — 2 плоские опоры (рама в плоскости XZ артикула, глубина +Y) у торцов, поперёк ширины; деталь «сзади» (площадка, боковая рама Н028) — внутрь стола;
//   base   — подстолье целиком (Н114, Н098, Ёж): длина = L − 2·отступ по длине, ширина = W − 2·отступ по ширине, по центру под столешницей;
//   corner — 4 угловые ножки (Шпилька 3 прутка): наружный угол уголка — в углу столешницы, смещён внутрь на оба отступа.
// Окрашивание (по умолчанию выключено): при включённой галочке ножки на чертеже заливаются выбранным цветом (с освещением), иначе — белые (только линии); в тексте цвет указывается всегда.
// Отверстия ножек (окружности) на чертеже стола не рисуются.
import { fuseAll, box, free } from "../lib/model.js";
import { range, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";
import { TOP_CONTROLS, topFills, topLines, fixTone } from "../STOL/model.js";
import { spec as H031 } from "../H031/model.js";
import { spec as H050 } from "../H050/model.js";
import { spec as H028 } from "../H028/model.js";
import { spec as A0090 } from "../0090/model.js";
import { spec as H105 } from "../H105/model.js";
import { spec as SHP3, PL as SHP3_ARM } from "../SHP3/model.js";
import { spec as H114 } from "../H114/model.js";
import { spec as H098 } from "../H098/model.js";
import { spec as YOZH } from "../YOZH/model.js";

export const LEG_COLORS = [
  { id: "Черный", dark: [22, 22, 24], light: [92, 94, 98] },
  { id: "Серый", dark: [104, 107, 111], light: [184, 187, 191] },
  { id: "Белый", dark: [200, 200, 198], light: [252, 252, 250] },
  { id: "Матовое золото (RAL 1036)", dark: [112, 88, 52], light: [206, 172, 112] },
  { id: "Хром", dark: [118, 124, 132], light: [246, 248, 251] },
];
// leg: артикул; kind: вид размещения; w: ключ ширины (заменяется отступом), l: ключ длины (base)
const LEGS = [
  { leg: H031, kind: "pair", w: "W" },
  { leg: H050, kind: "pair", w: "WT" },
  { leg: H028, kind: "pair", w: "W" },
  { leg: A0090, kind: "pair", w: "W" },
  { leg: H105, kind: "pair", w: "WT", same: true },                     // Н105: правая опора — тот же поворот, что у левой (только перенос)
  { leg: SHP3, kind: "corner", w: null, arm: SHP3_ARM },
  { leg: H114, kind: "base", w: "W", l: "L" },
  { leg: H098, kind: "base", w: "D", l: "L" },
  { leg: YOZH, kind: "base", w: "D", l: "W" },
];
const PFX = "leg_", LEG_H_DEF = 710;
const rot = (s, a) => { if (!a) return s; const r = s.rotate(a, [0, 0, 0], [0, 0, 1]); free(s); return r; };
const mov = (s, v) => { const r = s.translate(v); free(s); return r; };
const bboxOf = (ss) => { const lo = [0, 1, 2].map((k) => Math.min(...ss.map((s) => s.boundingBox.bounds[0][k]))), hi = [0, 1, 2].map((k) => Math.max(...ss.map((s) => s.boundingBox.bounds[1][k]))); return [lo, hi]; };

function makeTable({ leg: LS, kind, w, l, arm, same }) {
  const own = LS.controls.filter((c) => c.key !== w && c.key !== l && c.key !== "color");
  // высота ножек на вкладке «Столы» по умолчанию 710 мм (у всех 9 артикулов; на вкладке «Ножки» — свои значения)
  const legCtls = own.map((c) => ({ ...c, key: PFX + c.key, group: "legs", ...(c.key === "H" ? { def: LEG_H_DEF } : {}), ...(c.depends ? { depends: PFX + c.depends } : {}) }));
  const tableCtls = [
    { ...range("offW", "Отступ по ширине от края столешницы", 0, 500, 1, 0), group: "legs" },
    { ...range("offL", "Отступ по длине от края столешницы", 0, 1000, 1, 0), group: "legs" },
    { type: "select", key: "legColor", label: "Цвет", def: "Черный", unit: "", group: "legs", options: LEG_COLORS.map((c) => ({ value: c.id, label: c.id })) },
    { type: "check", key: "paint", label: "Окрашивание", def: false, group: "legs" },
  ];
  const topCtls = TOP_CONTROLS.map((c) => ({ ...c, group: "top" }));
  const controls = [...topCtls, ...legCtls.filter((c) => !c.extra), ...tableCtls, ...legCtls.filter((c) => c.extra)];
  const legName = LS.name;
  const S = {
    id: "TABLE_" + LS.id, tab: "tables", legId: LS.id, type: "Стол", category: "Столы", name: "Стол", cardLabel: LS.cardLabel ?? LS.name.replace(/^(Ножка|Подстолье|Опора) /, ""), cardSubtitle: LS.type,
    about: `Стол: столешница + ${legName}`, controls, legName,
    normalize(raw) {
      const warnings = [], { p } = baseNormalize([...topCtls, ...tableCtls], raw);
      p.T = Number(p.T); fixTone(p);
      const maxW = Math.floor((p.W - 50) / 2), maxL = Math.floor(p.L / 2 - 50);
      if (p.offW > maxW) { warnings.push(`«Отступ по ширине»: ${p.offW} → ${maxW} мм (иначе ножка уже 50 мм).`); p.offW = maxW; }
      if (p.offL > maxL) { warnings.push(`«Отступ по длине»: ${p.offL} → ${maxL} мм.`); p.offL = maxL; }
      const lr = { color: p.legColor };
      for (const c of legCtls) { const v = raw[c.key] !== undefined ? raw[c.key] : c.def; if (v !== undefined) lr[c.key.slice(PFX.length)] = v; }   // нет значения — умолчание вкладки «Столы» (высота 710)
      if (w) lr[w] = p.W - 2 * p.offW;
      if (l) lr[l] = p.L - 2 * p.offL;
      const r = LS.normalize(lr);
      for (const m of r.warnings) warnings.push("Ножки: " + m);
      const lp = r.p;
      for (const c of own) p[PFX + c.key] = lp[c.key];
      p.lp = lp; p.legBB = LS.expectBBox(lp); p.legH = p.legBB[2];
      return { p, warnings };
    },
    /** тела: [столешница, ножки…] (assembly — не сливаются; ножка = одно тело или детали сборки артикула) */
    parts(p) {
      const { L, W, T, offL, offW, lp, legH } = p;
      const one = () => (LS.assembly ? LS.parts(lp) : [fuseAll(LS.parts(lp))]);
      const place = (ss, a, fn) => { ss = ss.map((s) => rot(s, a)); const [lo, hi] = bboxOf(ss), v = fn(lo, hi); return ss.map((s) => mov(s, v)); };
      let legs = [];
      if (kind === "pair") {
        const cy = (lo, hi) => W / 2 - (lo[1] + hi[1]) / 2;
        legs = [...place(one(), -90, (lo, hi) => [offL - lo[0], cy(lo, hi), -lo[2]]), ...place(one(), same ? -90 : 90, (lo, hi) => [L - offL - hi[0], cy(lo, hi), -lo[2]])];
      } else if (kind === "base") {
        legs = place(one(), 0, (lo, hi) => [L / 2 - (lo[0] + hi[0]) / 2, W / 2 - (lo[1] + hi[1]) / 2, -lo[2]]);
      } else {
        const C = [[offL, offW, 0], [L - offL, offW, 90], [L - offL, W - offW, 180], [offL, W - offW, -90]];
        for (const [x, y, a] of C) legs.push(...one().map((s) => mov(rot(s, a), [x, y, 0])));
      }
      return [box(0, L, 0, W, legH, legH + T), ...legs];
    },
    assembly: true,
    expectBBox(p) {
      const { L, W, T, offL, offW, legBB } = p;
      if (kind === "pair") return [L, Math.max(W, legBB[0]), legBB[2] + T];
      if (kind === "base") return [Math.max(L, legBB[0]), Math.max(W, legBB[1]), legBB[2] + T];
      const o = legBB[0] - arm;                                               // угловая ножка выступает за наружный угол уголка (петля внизу)
      return [Math.max(L, L - 2 * offL + 2 * o), Math.max(W, W - 2 * offW + 2 * o), legBB[2] + T];
    },
    fills: (p) => topFills(p, p.legH, p.paint),
    paint: (p, pieces) => (p.paint ? { shapes: pieces.slice(1), ...LEG_COLORS.find((c) => c.id === p.legColor) } : null),
    /** ножки с гладкими рёбрами (Шпилька): без касательных швов; швы стыка прутков у каждой из 4 ножек убираются, как на её карточке */
    hlr: (p) => (kind === "corner" && LS.hlr ? cornerHlr(p) : { occTol: 1 }),
  };
  const cornerHlr = (p) => {
      const h = LS.hlr(p.lp), [a, b] = h.dropSharpIn, { L, W, offL, offW } = p;
      const C = [[offL, offW, 0], [L - offL, offW, 90], [L - offL, W - offW, 180], [offL, W - offW, -90]];
      const tr = ([x, y, z], [cx, cy, ang]) => { const r = (ang * Math.PI) / 180, c = Math.round(Math.cos(r)), s = Math.round(Math.sin(r)); return [cx + c * x - s * y, cy + s * x + c * y, z]; };
      return { occTol: 1, smooth: false, dropSharpIn: C.map((cc) => { const q = [tr(a, cc), tr(b, cc)]; return [[0, 1, 2].map((k) => Math.min(q[0][k], q[1][k])), [0, 1, 2].map((k) => Math.max(q[0][k], q[1][k]))]; }) };
  };
  Object.assign(S, {
    view: { az: 32, el: 22 }, layout: "forms", auto: true,
    dims(p, k = 1) {
      const { L, W, T, offL, offW, legH } = p, Z = legH + T, O = 70 * k, Os = 45 * k, Ow = O, Oh = offL > 0 ? O + 110 * k : O, out = [
        dimAB([0, W, Z], [L, W, Z], [0, W, Z + O], [L, W, Z + O], `${L} мм`),
        dimAB([L, 0, Z], [L, W, Z], [L + Ow, 0, Z], [L + Ow, W, Z], `${W} мм`),
        dimAB([0, 0, 0], [0, 0, Z], [-Oh, 0, 0], [-Oh, 0, Z], `${Z} мм`),               // при отступе по длине — дальше, чтобы его подпись была между
      ];
      // отступы — под нижней кромкой столешницы, выносные линии вниз: по длине — у левого переднего угла, по ширине — у правого переднего
      // подписи горизонтальные, не сдвигаются поиском: по длине — вниз-влево, по ширине — вправо (за торец)
      if (offL > 0) out.push({ ...dimAB([0, 0, legH], [offL, 0, legH], [0, 0, legH - Os], [offL, 0, legH - Os], `${offL} мм`, 0, 0, { rot: "h", push: [[-0.6, 0, -1], 44 * k] }), fixed: k < 1.2 });
      if (offW > 0) out.push({ ...dimAB([L, 0, legH], [L, offW, legH], [L, 0, legH - Os], [L, offW, legH - Os], `${offW} мм`, 0, 0, { rot: "h", push: [k > 1.2 ? [0.5, 0, -1] : [1, 0, 0], 62 * k] }), fixed: k < 1.2 });
      return out;
    },
    textLines(p) {
      const pr = p.lp.profile && LS.textLines(p.lp).find((t) => /^Профиль /.test(t));
      return ["Стол", ...topLines(p), `Ножки: ${legName}`, `Цвет ножек: ${p.legColor}`, ...(pr ? [pr.replace(/^Профиль /, "Профиль ножек: ")] : []), `Высота стола: ${p.legH + p.T} мм`];
    },
  });
  return S;
}
export const TABLES = LEGS.map(makeTable);
