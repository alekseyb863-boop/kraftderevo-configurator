// Юнит-тест подбора отверстий (src/shared/lib/holes.js): 2e + (n−1)s = L, e ∈ [min, max]; 4 прогона по порядку; запасной вариант.
//   node test/holes.mjs
import assert from "node:assert/strict";
import { holePositions as H, HOLE_PASSES } from "../src/shared/lib/holes.js";
let n = 0;
const t = (name, f) => { f(); n++; console.log("PASS", name); };
const mult = (v, m) => Math.abs(v / m - Math.round(v / m)) < 1e-9;
// независимый перебор (в float с допуском) — эталон
const ref = (L, cnt, min, max) => { for (let p = 0; p < 4; p++) { const [me, ms] = HOLE_PASSES[p]; for (let e = Math.ceil(min / me - 1e-9) * me; e <= max + 1e-9; e += me) { const s = (L - 2 * e) / (cnt - 1); if (s > 0 && mult(s, ms) && mult(e, me)) return { e, s, pass: p + 1 }; } } return null; };

t("прогоны заданы в нужном порядке", () => assert.deepEqual(HOLE_PASSES, [[5, 5], [1, 5], [0.5, 5], [0.5, 1]]));
t("умолчание 780 / 4 / 75–85 → e=75, s=210, прогон 1", () => {
  const r = H(780, 4, 75, 85);
  assert.equal(r.e, 75); assert.equal(r.s, 210); assert.equal(r.pass, 1); assert.ok(r.exact);
  assert.deepEqual(r.positions, [75, 285, 495, 705]); assert.deepEqual(r.mids, [180, 390, 600]);   // 180/210/210/180 по нижнему рельсу
});
t("e перебирается от min вверх (755 → 85/195, раньше решений нет)", () => { const r = H(755, 4, 75, 85); assert.deepEqual([r.e, r.s, r.pass], [85, 195, 1]); });
t("первое подходящее e: 1000 / 5 → 80/210", () => { const r = H(1000, 5, 75, 85); assert.deepEqual([r.e, r.s, r.pass], [80, 210, 1]); });
t("прогон 2 (e кратно 1, s кратно 5): 752 → 76/200", () => { const r = H(752, 4, 75, 85); assert.deepEqual([r.e, r.s, r.pass], [76, 200, 2]); });
t("прогон 3 (e кратно 0.5, s кратно 5): 757 → 78.5/200", () => { const r = H(757, 4, 75, 85); assert.deepEqual([r.e, r.s, r.pass], [78.5, 200, 3]); assert.deepEqual(r.mids, [178.5, 378.5, 578.5]); });
t("прогон 4 (e кратно 0.5, s кратно 1): 321 / 6 → 75.5/34", () => { const r = H(321, 6, 75, 85); assert.deepEqual([r.e, r.s, r.pass], [75.5, 34, 4]); });
t("n = 2: единственный шаг, 300 → 75/150", () => { const r = H(300, 2, 75, 85); assert.deepEqual([r.e, r.s, r.pass], [75, 150, 1]); assert.deepEqual(r.mids, [150]); });
t("запасной вариант: нет решения → e ≥ min, s с округлением вниз до 0.1, симметрично", () => {
  const r = H(300.5, 4, 75, 85);
  assert.equal(r.pass, 0); assert.ok(!r.exact); assert.ok(r.e >= 75 - 1e-9);
  assert.ok(Math.abs(r.positions[0] + r.positions[3] - 300.5) < 1e-6); assert.equal(r.positions.length, 4);
});
t("min > max: границы меняются местами", () => { const r = H(780, 4, 85, 75); assert.deepEqual([r.e, r.s, r.pass], [75, 210, 1]); });
t("перебор L 300…1500 шаг 0.5, n 2…8: совпадает с независимым эталоном, формула сходится, e в границах", () => {
  let cnt = 0, fb = 0;
  for (let c = 2; c <= 8; c++) for (let L = 300; L <= 1500; L += 0.5) {
    const r = H(L, c, 75, 85), e = ref(L, c, 75, 85);
    if (e) { assert.ok(r.exact && r.pass === e.pass && Math.abs(r.e - e.e) < 1e-9 && Math.abs(r.s - e.s) < 1e-9, `L=${L} n=${c}`); assert.ok(Math.abs(2 * r.e + (c - 1) * r.s - L) < 1e-9); assert.ok(r.e >= 75 && r.e <= 85); cnt++; } else { assert.equal(r.pass, 0); fb++; }
    assert.equal(r.positions.length, c); assert.equal(r.mids.length, c - 1);
  }
  console.log("   точных:", cnt, " запасных:", fb);
});
// ограничение числа отверстий в модели: шаг между отверстиями не меньше 100 мм
const { spec: S, derive } = await import("../src/shared/TUMBA_KUH/model.js");
t("модель: Длина 780, n=12 → n=7 (e=75, s=105, прогон 1), с предупреждением; повторная нормализация без предупреждений", () => {
  const r = S.normalize({ n: 12 }), g = derive(r.p);
  assert.equal(r.p.n, 7); assert.deepEqual([g.e, g.s, g.pass], [75, 105, 1]); assert.ok(r.warnings.some((w) => w.includes("Количество отверстий")));
  assert.equal(S.normalize(r.p).warnings.length, 0);
});
t("модель: n=8 при 780 → 7; n=6/7 не меняются; шаг ≥ 100 у всех n при Длине 300…3000", () => {
  assert.equal(S.normalize({ n: 8 }).p.n, 7); assert.equal(S.normalize({ n: 7 }).warnings.length, 0); assert.equal(S.normalize({ n: 6 }).p.n, 6);
  for (let W = 300; W <= 3000; W += 7) for (let c = 2; c <= 12; c++) {
    const p = S.normalize({ W, n: c }).p, s = derive(p).s;
    assert.ok(p.n === 2 || s >= 100, `W=${W} n=${c} -> n=${p.n} s=${s}`);
    if (p.n < c) assert.ok(H(W, p.n + 1, p.hmin, p.hmax).s < 100, `W=${W}: n=${p.n + 1} ещё допустимо`);   // взято наибольшее допустимое n
  }
});
console.log(`ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ (${n})`);
