// Top-left text block: bold title (with article), then regular lines.  Positions copied from the Python renderers.
import { layoutBox, textPathD } from "./fonts.js";
import { pt } from "./dimensions.js";
/**
 * style.pos(i) -> { x, top } in px (top = top of the matplotlib text box); style.sizes = [titlePt, linePt]
 */
export function layoutTextBlock(lines, style) {
  return lines.map((t, i) => {
    const bold = i === 0, size = pt(bold ? style.sizes[0] : style.sizes[1]);
    const { x, top } = style.pos(i), lb = layoutBox(t, size, bold), baseline = top + lb.top;
    return { t, bold, size, x, baseline, rect: { x0: x, x1: x + lb.width, y0: baseline - lb.top, y1: baseline + lb.bottom } };
  });
}
export const textSvg = (items) => items.map((it) => `<path data-text="${it.t}" d="${textPathD(it.t, it.x, it.baseline, it.size, it.bold)}"/>`).join("\n    ");
