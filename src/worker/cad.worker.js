// Web Worker: OpenCascade (WASM) + replicad + отрисовка чертежа. UI-поток остаётся свободным.
// main -> {type:"init", base}                       => worker -> {type:"meta", articles} (сразу) и {type:"ready"} (после загрузки WASM)
// main -> {id, type:"draw", article, params}        => {id, type:"drawn", svg, W, H, check, warnings, params, bbox, solid, adjust, ms}
// main -> {id, type:"export", format, article, params} => {id, type:"file", buffer, name}   (format: "stl" | "step")
import { setOC, exportSTEP } from "replicad";
import opencascade from "replicad-opencascadejs";
import wasmUrl from "replicad-opencascadejs/wasm?url";
import { BY_ID, meta } from "../shared/registry.js";
import { fuseAll, checkSolid, free } from "../shared/lib/model.js";
import { buildDrawing } from "../shared/render/drawing.js";
import { setFonts } from "../shared/render/fonts.js";

let resolveBase;
const basePromise = new Promise((r) => (resolveBase = r));
async function init() {
  const base = await basePromise, url = (n) => new URL(`fonts/${n}`, base).href;
  const [oc, reg, bold] = await Promise.all([opencascade({ locateFile: () => wasmUrl }),
    fetch(url("DejaVuSans.ttf")).then((r) => r.arrayBuffer()), fetch(url("DejaVuSans-Bold.ttf")).then((r) => r.arrayBuffer())]);
  setOC(oc);
  setFonts(reg, bold);
}
const ready = init().then(() => self.postMessage({ type: "ready" }));
self.postMessage({ type: "meta", articles: meta() });

function build(article, raw) {
  const S = BY_ID[article];
  if (!S) throw new Error("неизвестный артикул " + article);
  const { p, warnings } = S.normalize(raw), solid = fuseAll(S.parts(p));
  return { S, p, warnings, solid };
}
const sizeName = (S, p) => `${S.id}_${S.expectBBox(p).map((v) => Math.round(v)).join("x")}`;

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  if (type === "init") return resolveBase(data.base);
  try {
    await ready;
    if (type === "draw") {
      const t0 = performance.now(), { S, p, warnings, solid } = build(data.article, data.params);
      try {
        const exp = S.expectBBox(p), chk = checkSolid(S.id, solid, exp);
        const d = buildDrawing({ solid, view: S.view, layout: S.layout, makeDims: (k) => S.dims(p, k), textLines: S.textLines(p) });
        self.postMessage({ id, type: "drawn", article: S.id, svg: d.svg, W: d.W, H: d.H, check: d.check, adjust: d.adjust, params: p, warnings,
          bbox: chk.bbox, expectBBox: exp.map((v) => +v.toFixed(3)), solid: { solids: chk.solids, valid: chk.occValid, watertight: chk.watertight, bboxOK: chk.bboxOK, ok: chk.ok },
          name: sizeName(S, p), ms: Math.round(performance.now() - t0) });
      } finally { free(solid); }
    } else if (type === "export") {
      const { S, p, solid } = build(data.article, data.params);
      try {
        const blob = data.format === "stl" ? solid.blobSTL({ tolerance: 0.05, angularTolerance: 0.1, binary: true }) : exportSTEP([{ shape: solid, name: S.id }]);
        const buffer = await blob.arrayBuffer();
        self.postMessage({ id, type: "file", buffer, name: `${sizeName(S, p)}.${data.format}` }, [buffer]);
      } finally { free(solid); }
    }
  } catch (e) {
    self.postMessage({ id, type: "error", message: String((e && e.message) || e) });
  }
};
