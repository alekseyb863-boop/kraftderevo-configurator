// «Живой край» слэба: неровные кромки в плане, только внутрь номинального прямоугольника L × W (0…50 мм), наружу — никогда.
// Каждая отмеченная сторона — плавная кривая (монотонный кубический сплайн по точкам с шагом 80–200 мм, глубина 0–50 мм, редкие «ступеньки»
// и мелкий шум), детерминированная: seed = размеры + сторона. На каждой живой кромке есть точка ровно на номинале (габариты не меняются).
// Стороны: F — спереди (y = 0), B — сзади (y = W), L — слева (x = 0), R — справа (x = L).
export const EDGE_MAX = 50, EDGE_STEP = 10;

function rng(seed) {                                    // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** монотонная кубическая интерполяция (Фрич–Карлсон): без выбросов за значения точек */
function monotone(xs, ys) {
  const n = xs.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);   // гармоническое среднее
  return (x) => {
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = Math.min(1, Math.max(0, (x - xs[i]) / h)), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/** профиль глубины d(s) ≥ 0 вдоль стороны длиной len (s ∈ [0, len]) */
export function edgeProfile(len, seed) {
  const r = rng(seed), xs = [0], ys = [];
  let s = 0;
  while (true) {
    const step = 80 + 120 * r();
    if (len - s - step < 60) break;
    s += step;
    if (r() < 0.25 && len - s > 100) { xs.push(s); s += 12 + 10 * r(); }   // «ступенька»: резкий перепад на 12–22 мм
    xs.push(s);
  }
  xs.push(len);
  for (let i = 0; i < xs.length; i++) ys.push(EDGE_MAX * Math.pow(r(), 0.8));
  const base = monotone(xs, ys);
  const nz = [0, 1, 2].map(() => ({ a: 0.4 + 0.6 * r(), l: 40 + 50 * r(), ph: 6.283 * r() }));
  const raw = (x) => base(x) + nz.reduce((acc, q) => acc + q.a * Math.sin((6.283 * x) / q.l + q.ph), 0);
  // нормировка: минимум во внутренней части стороны (≥ 60 мм от углов) = 0 -> касание номинала; максимум ≤ 50 мм
  let mn = Infinity, mx = -Infinity, at = 60;
  for (let x = 60; x <= len - 60; x += 0.5) { const v = raw(x); if (v < mn) { mn = v; at = x; } }
  for (let x = 0; x <= len; x += 1) mx = Math.max(mx, raw(x) - mn);
  const k = mx > EDGE_MAX ? EDGE_MAX / mx : 1;
  const fn = (x) => Math.max(0, (raw(x) - mn) * k);
  fn.touch = at;                                          // точка касания номинала (d = 0) — обязательно входит в контур
  return fn;
}

const bis = (f, lo, hi) => { let flo = f(lo); if (flo === 0) return lo; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m; } return (lo + hi) / 2; };
const samples = (a, b, step, extra) => {
  const n = Math.max(1, Math.ceil(Math.abs(b - a) / step)), out = [];
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  if (extra === undefined || (extra - a) * (extra - b) >= 0) return out;
  const keep = out.filter((v, i) => i === 0 || i === out.length - 1 || Math.abs(v - extra) > 0.5);   // точка касания важнее соседней
  return [...keep, extra].sort((p, q) => (b > a ? p - q : q - p));
};

/**
 * Контур столешницы в плане (против часовой стрелки, вид сверху) и разбивка точек по сторонам.
 * edges = { L, B, F, R } — булевы. Возвращает { pts: [[x,y]…], sides: { F:[[x,y]…], R, B, L } } (цепочки включают угловые точки).
 */
export function liveOutline(L, W, edges) {
  const prof = (side, len) => (edges[side] ? edgeProfile(len, hash(`${L}x${W}:${side}`)) : () => 0);
  const f = prof("F", L), b = prof("B", L), g = prof("L", W), r = prof("R", W);
  // углы: пересечения соседних кромок (единственный корень на [0, 60] — уклоны у углов малы)
  const xFL = bis((x) => x - g(f(x)), 0, 60), xFR = bis((x) => L - r(f(x)) - x, L, L - 60);
  const xBR = bis((x) => L - r(W - b(x)) - x, L, L - 60), xBL = bis((x) => x - g(W - b(x)), 0, 60);
  const yFL = f(xFL), yFR = f(xFR), yBR = W - b(xBR), yBL = W - b(xBL);
  const step = (on) => (on ? EDGE_STEP : 1e9);
  const F = samples(xFL, xFR, step(edges.F), f.touch).map((x) => [x, f(x)]);
  const R = samples(yFR, yBR, step(edges.R), r.touch).map((y) => [L - r(y), y]);
  const B = samples(xBR, xBL, step(edges.B), b.touch).map((x) => [x, W - b(x)]);
  const Lf = samples(yBL, yFL, step(edges.L), g.touch).map((y) => [g(y), y]);
  // точки углов — общие (берём точные значения на обеих кромках)
  F[0] = Lf[Lf.length - 1] = [xFL, yFL]; F[F.length - 1] = R[0] = [xFR, yFR]; R[R.length - 1] = B[0] = [xBR, yBR]; B[B.length - 1] = Lf[0] = [xBL, yBL];
  const pts = [...F.slice(0, -1), ...R.slice(0, -1), ...B.slice(0, -1), ...Lf.slice(0, -1)].map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]);
  return { pts, sides: { F, R, B, L: Lf } };
}

/** контур без самопересечений (проверка для тестов) */
export function isSimple(pts) {
  const n = pts.length, cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const x = (p1, p2, q1, q2) => cr(p1, p2, q1) * cr(p1, p2, q2) < 0 && cr(q1, q2, p1) * cr(q1, q2, p2) < 0;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (x(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return false; }
  return true;
}
