// Web Worker: OpenCascade (WASM) + replicad + отрисовка чертежа. UI-поток остаётся свободным.
// main -> {type:"init", base}                       => worker -> {type:"meta", articles} (сразу) и {type:"ready"} (после загрузки WASM)
// main -> {id, type:"draw", article, params}        => {id, type:"drawn", svg, W, H, check, warnings, params, bbox, solid, adjust, ms}
// main -> {id, type:"export", format, article, params} => {id, type:"file", buffer, name}   (format: "stl")
import { setOC } from "replicad";
import opencascade from "replicad-opencascadejs";
import wasmUrl from "replicad-opencascadejs/wasm?url";
import { BY_ID, meta } from "../shared/registry.js";
import { fuseAll, checkSolid, free } from "../shared/lib/model.js";
import { buildDrawing } from "../shared/render/drawing.js";
import { setFonts } from "../shared/render/fonts.js";

let resolveBase;
const basePromise = new Promise((r) => (resolveBase = r));
const WASM_SIZE_HINT = 22_980_260;                       // ~23 МБ: ориентир для процентов (сервер отдаёт gzip, content-length не совпадает с реальным размером)
const stage = (text, extra = {}) => self.postMessage({ type: "stage", text, ...extra });
/** скачать файл с отчётом о ходе загрузки (мобильный интернет: 23 МБ видно, что идёт, а не «висит») */
async function fetchBytes(url, label, sizeHint, report = false) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`не скачался файл ${url.split("/").pop()}: HTTP ${resp.status} ${resp.statusText}`);
  const enc = resp.headers.get("content-encoding"), cl = Number(resp.headers.get("content-length")) || 0;
  const total = !enc && cl ? cl : sizeHint || cl;
  if (!resp.body || !resp.body.getReader || !total) return new Uint8Array(await resp.arrayBuffer());
  const reader = resp.body.getReader(), chunks = []; let loaded = 0, lastPost = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.length;
    const now = performance.now();
    if (report && now - lastPost > 150) { lastPost = now; stage(label, { loaded, total }); }
  }
  const out = new Uint8Array(loaded); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  if (report) stage(label, { loaded, total });
  return out;
}
async function init() {
  const base = await basePromise, url = (n) => new URL(`fonts/${n}`, base).href;
  stage("Скачиваю CAD-ядро (OpenCascade WASM, ~23 МБ)…", { loaded: 0, total: WASM_SIZE_HINT });
  const [wasmBinary, reg, bold] = await Promise.all([
    fetchBytes(wasmUrl, "Скачиваю CAD-ядро (OpenCascade WASM, ~23 МБ)…", WASM_SIZE_HINT, true),
    fetchBytes(url("DejaVuSans.ttf"), "Шрифт…").then((u) => u.buffer),
    fetchBytes(url("DejaVuSans-Bold.ttf"), "Шрифт…").then((u) => u.buffer)]);
  stage("Запускаю CAD-ядро (компиляция WASM, на телефоне до 10–20 секунд)…", { loaded: wasmBinary.length, total: wasmBinary.length, compiling: true });
  let oc;
  try {
    // wasmBinary: без instantiateStreaming (не зависит от MIME-типа ответа), любая ошибка компиляции/памяти попадает сюда
    oc = await opencascade({ wasmBinary, locateFile: () => wasmUrl });
  } catch (e) {
    const mem = /memory|alloc|RangeError/i.test(String(e && (e.stack || e.message || e))) ? " (похоже, браузеру не хватило памяти под WASM)" : "";
    throw new Error("не удалось запустить WASM: " + String((e && e.message) || e) + mem);
  }
  setOC(oc);
  setFonts(reg, bold);
}
const fail = (e) => self.postMessage({ type: "initerror", message: String((e && e.message) || e), stack: String((e && e.stack) || "").split("\n").slice(0, 4).join(" | ") });
const ready = init().then(() => self.postMessage({ type: "ready" }), (e) => { fail(e); throw e; });
ready.catch(() => {});                                   // ошибка уже отправлена в UI; без unhandled rejection
self.addEventListener("unhandledrejection", (ev) => fail(ev.reason));
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
        const blob = solid.blobSTL({ tolerance: 0.05, angularTolerance: 0.1, binary: true });
        const buffer = await blob.arrayBuffer();
        self.postMessage({ id, type: "file", buffer, name: `${sizeName(S, p)}.${data.format}` }, [buffer]);
      } finally { free(solid); }
    }
  } catch (e) {
    self.postMessage({ id, type: "error", message: String((e && e.message) || e) });
  }
};
