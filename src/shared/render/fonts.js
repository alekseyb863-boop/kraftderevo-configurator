// DejaVu Sans / Bold through opentype.js: exact text metrics + glyph outlines as SVG paths (no font needed to view the SVG).
import opentype from "opentype.js";
// Browser-safe: no fs.  Call setFonts(regularArrayBuffer, boldArrayBuffer) once (render/fonts-node.js does it in Node,
// the Web Worker does it after fetch()).
const fonts = { regular: null, bold: null };
export function setFonts(regular, bold) {
  fonts.regular = opentype.parse(regular); fonts.bold = opentype.parse(bold);
}
const F = (bold) => { const f = fonts[bold ? "bold" : "regular"]; if (!f) throw new Error("fonts are not loaded: call setFonts()"); return f; };
// glyph-by-glyph layout (cmap + advance + kerning); avoids opentype.js GSUB shaping
function layout(str, px, bold, x0 = 0, baseline = 0, wantPath = false) {
  const font = F(bold), k = px / font.unitsPerEm;
  let x = 0, prev = null, box = null; const d = [];
  for (const ch of str) {
    const g = font.charToGlyph(ch);
    if (prev) x += font.getKerningValue(prev, g) * k;
    const bb = g.getBoundingBox();
    if (bb.x2 > bb.x1 || bb.y2 > bb.y1) {
      const b = { x0: x + bb.x1 * k, x1: x + bb.x2 * k, y0: -bb.y2 * k, y1: -bb.y1 * k };
      box = box ? { x0: Math.min(box.x0, b.x0), x1: Math.max(box.x1, b.x1), y0: Math.min(box.y0, b.y0), y1: Math.max(box.y1, b.y1) } : b;
    }
    if (wantPath) d.push(g.getPath(x0 + x, baseline, px).toPathData(2));
    x += g.advanceWidth * k; prev = g;
  }
  return { width: x, box: box || { x0: 0, x1: 0, y0: 0, y1: 0 }, d: d.join("") };
}
export const textWidth = (s, px, bold = false) => layout(s, px, bold).width;
/** ink bbox relative to (origin x, baseline), px units, y down */
export const textInkBox = (s, px, bold = false) => layout(s, px, bold).box;
/** SVG path data of the string with its origin at (x, baseline) */
export const textPathD = (s, x, baseline, px, bold = false) => layout(s, px, bold, x, baseline, true).d;
/**
 * matplotlib text layout box: height h = max(ink height, height of "lp"), descent d = max(ink descent, descent of "lp").
 * Returns distances from the baseline: top = h - d above the baseline, bottom = d below it, plus the advance width.
 */
export function layoutBox(s, px, bold = false) {
  const lp = layout("lp", px, bold).box, ink = layout(s, px, bold);
  const lpH = lp.y1 - lp.y0, lpD = lp.y1;
  const inkH = ink.box.y1 - ink.box.y0, inkD = Math.max(ink.box.y1, 0);
  const h = Math.max(lpH, inkH), d = Math.max(lpD, inkD);
  return { width: ink.width, top: h - d, bottom: d, h };
}
