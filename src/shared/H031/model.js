// H031 Опора для барной стойки: прямоугольная рама из профиля (по умолчанию 40×20: 20 в плоскости, 40 в глубину), 450 × 1050, чёрная.
import { frame } from "../lib/model.js";
import { PROFILES, range, profileCtl, colorCtl, findIn, baseNormalize } from "../lib/params.js";
import { dimAB } from "../render/dimhelpers.js";

/** the leg itself (also used by Н114): rectangular frame W×H of a profile pr (pr.b in the plane, pr.a deep), plane XZ, depth +Y */
export const legFrame = (W, H, pr) => frame([[0, 0], [W, 0], [W, H], [0, H]], [pr.b, pr.b, pr.b, pr.b], 0, pr.a);
const controls = [range("W", "Ширина", 150, 1000, 10, 450), range("H", "Высота", 300, 1500, 10, 1050), profileCtl("40x20"), colorCtl("черный")];
export const spec = {
  id: "H031", type: "Опора", name: "Опора Н031", about: "Опора для барной стойки, прямоугольная рама", controls,
  normalize(raw) { const { p, warnings } = baseNormalize(controls, raw); return { p, warnings }; },
  parts(p) {
    const pr = findIn(PROFILES, p.profile), { W, H } = p;
    return [legFrame(W, H, pr)];
  },
  expectBBox: (p) => [p.W, findIn(PROFILES, p.profile).a, p.H],
  view: { az: 50, el: 16 }, layout: "forms",
  dims(p, k = 1) {
    const { W, H } = p, O = 90 * k;
    return [dimAB([0, 0, 0], [W, 0, 0], [0, -O, 0], [W, -O, 0], `${W} мм`), dimAB([0, 0, 0], [0, 0, H], [-O, 0, 0], [-O, 0, H], `${H} мм`)];
  },
  textLines: (p) => ["Опора Н031", `Профиль ${findIn(PROFILES, p.profile).label} мм`, `Цвет: ${p.color}`, `Ширина: ${p.W} мм`, `Высота: ${p.H} мм`],
};
