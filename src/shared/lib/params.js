// Parameter helpers shared by all article models (pure JS, browser + Node): controls, clamping, profiles/strips, feasibility.
import { innerPolygon } from "./model.js";

/** rectangular tube sections a×b: a = size in depth (Y), b = size in the plane of the frame (the "thickness" of the member) */
export const PROFILES = [["40x20", 40, 20], ["50x25", 50, 25], ["40x40", 40, 40], ["60x30", 60, 30], ["80x40", 80, 40]]
  .map(([id, a, b]) => ({ id, a, b, label: `${a}×${b}` }));
/** steel strips w×t: w = width (depth), t = thickness */
export const STRIPS = [["60x6", 60, 6], ["80x6", 80, 6], ["80x8", 80, 8]].map(([id, a, b]) => ({ id, a, b, label: `${a}×${b}` }));
/** square sections for the table base */
export const SQUARES = [20, 25, 30, 40, 50].map((a) => ({ id: `${a}x${a}`, a, b: a, label: `${a}×${a}` }));
export const COLORS = ["черный", "белый", "лофт", "серый", "графит", "RAL 9001 cream", "RAL 7016", "RAL 9005"];

// ---- control descriptors (plain data: sent to the UI) ----
export const range = (key, label, min, max, step, def, unit = "мм") => ({ type: "range", key, label, min, max, step, def, unit });
export const select = (key, label, list, def) => ({ type: "select", key, label, def, options: list.map(({ id, label }) => ({ value: id, label })) });
export const profileCtl = (def, key = "profile", label = "Профиль", list = PROFILES) => select(key, label, list, def);
export const stripCtl = (def, key = "strip", label = "Полоса") => select(key, label, STRIPS, def);
export const colorCtl = (def) => ({ type: "text", key: "color", label: "Цвет", def, suggestions: COLORS });

export const findIn = (list, id) => list.find((x) => x.id === id);

/** controls + raw values -> { p, warnings }: numbers clamped to [min,max] and rounded, selects validated, text trimmed. */
export function baseNormalize(controls, raw = {}) {
  const p = {}, warnings = [];
  for (const c of controls) {
    let v = raw[c.key];
    if (c.type === "range") {
      v = Number(v);
      if (!Number.isFinite(v)) v = c.def;
      const r = Math.min(c.max, Math.max(c.min, Math.round(v)));
      if (r !== Math.round(v) && Number.isFinite(Number(raw[c.key]))) warnings.push(`«${c.label}»: допустимо ${c.min}–${c.max} ${c.unit}, значение ${Math.round(v)} заменено на ${r}.`);
      v = r;
    } else if (c.type === "select") {
      if (!c.options.some((o) => o.value === v)) v = c.def;
    } else {
      v = String(v ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      if (!v) v = c.def;
    }
    p[c.key] = v;
  }
  return { p, warnings };
}

/** Is the inner contour of a bent frame valid (every inner edge keeps its direction and is at least `min` mm long)?
 *  open edges are treated as zero thickness here (the opening itself must still have a positive clear width). */
export function frameFeasible(outer, thick, min = 12) {
  const n = outer.length, inner = innerPolygon(outer, thick, []);
  for (let i = 0; i < n; i++) {
    const a = outer[i], b = outer[(i + 1) % n], c = inner[i], d = inner[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    if ((d[0] - c[0]) * t[0] + (d[1] - c[1]) * t[1] < min) return false;
  }
  return true;
}

/**
 * Make p feasible.  steps = [[key, delta, capKey?], ...]: first try each key ALONE (smallest change that makes ok(p) true, never past
 * p[capKey] / the control range); if no single key helps, move all keys together.  A message per changed key is added to `warnings`.
 * If it cannot be fixed at all -> the default sizes are restored and a message says so.
 */
export function relax(p, controls, ok, steps, warnings, why = "иначе профиль/полоса не помещается") {
  if (ok(p)) return;
  const orig = { ...p }, ctl = Object.fromEntries(controls.map((c) => [c.key, c]));
  const room = ([key, delta, cap]) => { const c = ctl[key], v = p[key] + delta; return v >= c.min && v <= c.max && (cap == null || (delta > 0 ? v <= p[cap] : v >= p[cap])); };
  let fixed = false;
  for (const st of steps) {                                   // phase 1: one key at a time
    const save = { ...p };
    while (!ok(p) && room(st)) p[st[0]] += st[1];
    if (ok(p)) { fixed = true; break; }
    Object.assign(p, save);
  }
  for (let guard = 0; !fixed && guard < 3000; guard++) {      // phase 2: all keys together
    const st = steps.find(room);
    if (!st) break;
    p[st[0]] += st[1];
    fixed = ok(p);
  }
  if (!fixed) {
    for (const c of controls) if (c.type === "range") p[c.key] = c.def;
    warnings.push("Сочетание параметров невозможно построить — возвращены размеры по умолчанию.");
    return;
  }
  for (const [k, v] of Object.entries(orig)) if (p[k] !== v) warnings.push(`«${ctl[k].label}»: ${v} → ${p[k]} ${ctl[k].unit} (${why}).`);
}
