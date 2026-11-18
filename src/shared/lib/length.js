// Метраж профиля: длины элементов по их оси (мм), считаются аналитически из параметров (без геометрического ядра).
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** длина отрезка в 3D */
export const dist3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0));
/** площадь многоугольника (шнуровка, по модулю) */
export const polyArea = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
/** длина по оси плоской полосы постоянной ширины t (раскос, галка, крыло): площадь / ширина */
export const stripLen = (pts, t) => polyArea(pts) / t;
function inter([p, d], [q, e]) {
  const det = d[0] * -e[1] + e[0] * d[1], r = sub(q, p), t = (r[0] * -e[1] + e[0] * r[1]) / det;
  return [p[0] + t * d[0], p[1] + t * d[1]];
}
/**
 * Рама «в ус» (как lib/model.js frame): outer — наружный контур (против часовой), thick[i] — толщина элемента вдоль ребра i, open — рёбра без элемента.
 * Длина каждого элемента = среднее наружной и внутренней кромок (= длина по оси для стыка «в ус»); у открытого ребра элемент срезан по его наружной линии.
 * Возвращает массив длин элементов (мм).
 */
export function frameMembers(outer, thick, open = []) {
  const n = outer.length, L = [], O = [];
  for (let i = 0; i < n; i++) {
    const a = outer[i], b = outer[(i + 1) % n], l = len2(a, b), d = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], nr = [-d[1], d[0]];
    O.push([a, d]); L.push([[a[0] + nr[0] * thick[i], a[1] + nr[1] * thick[i]], d]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    if (open.includes(i)) continue;
    const pv = (i + n - 1) % n, nx = (i + 1) % n;
    const s = inter(L[i], open.includes(pv) ? O[pv] : L[pv]), e = inter(L[i], open.includes(nx) ? O[nx] : L[nx]);
    out.push((len2(outer[i], outer[nx]) + len2(s, e)) / 2);
  }
  return out;
}
export const sum = (xs) => xs.reduce((s, v) => s + v, 0);
/** «Метраж профиля: X.X м» (точка — как в остальных дробных числах на чертежах) */
export const lengthLine = (mm) => `Метраж профиля: ${(mm / 1000).toFixed(1)} м`;
