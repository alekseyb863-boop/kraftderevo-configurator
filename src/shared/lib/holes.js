// Подбор положения отверстий вдоль профиля (чистый JS, без replicad; браузер + Node).
// Вход: L — длина профиля (внешняя), n — число отверстий, min..max — допустимый отступ крайних отверстий от края.
// Задача: первая пара (e — отступ крайних отверстий, s — равный шаг между всеми отверстиями) с 2e + (n−1)s = L, e ∈ [min, max];
// e перебирается от min вверх, прогоны по порядку (первый прогон, давший решение, побеждает):
//   1: e кратно 5,   s кратно 5
//   2: e кратно 1,   s кратно 5
//   3: e кратно 0.5, s кратно 5
//   4: e кратно 0.5, s кратно 1
// Если решения нет — запасной вариант: e = min, s = (L − 2e)/(n − 1) с округлением до 0.1 (округление вниз, e пересчитывается симметрично и остаётся ≥ min), чертёж строится всё равно.
// Арифметика целочисленная в единицах 0.5 мм, поэтому никаких ошибок float.
export const HOLE_PASSES = [[5, 5], [1, 5], [0.5, 5], [0.5, 1]];

/** -> { e, s, pass (1..4, 0 = запасной), exact, positions: [e, e+s, …, L−e], mids: [e+s/2, …] (n−1 шт.) } */
export function holePositions(L, n, min, max) {
  n = Math.max(2, Math.round(n));
  if (min > max) [min, max] = [max, min];
  const L2 = Math.round(L * 2), lo = Math.ceil(min * 2 - 1e-9), hi = Math.floor(max * 2 + 1e-9);
  for (let i = 0; i < HOLE_PASSES.length; i++) {
    const se = HOLE_PASSES[i][0] * 2, ss = HOLE_PASSES[i][1] * 2;                 // шаги в половинках миллиметра
    for (let E = Math.ceil(lo / se) * se; E <= hi; E += se) {
      const rem = L2 - 2 * E;
      if (rem <= 0) break;
      if (rem % (n - 1) !== 0) continue;
      const S = rem / (n - 1);
      if (S % ss === 0) return mk(E / 2, S / 2, i + 1, true);
    }
  }
  const e0 = min, s = Math.floor(((L - 2 * e0) / (n - 1)) * 10 + 1e-9) / 10;   // шаг вниз до 0.1 → e ≥ min
  return mk(Math.round(((L - (n - 1) * s) / 2) * 100) / 100, s, 0, false);
  function mk(e, s, pass, exact) {
    const r = (v) => Math.round(v * 100) / 100;
    return { e, s, pass, exact, n, L, positions: Array.from({ length: n }, (_, k) => r(e + k * s)), mids: Array.from({ length: n - 1 }, (_, k) => r(e + s / 2 + k * s)) };
  }
}
