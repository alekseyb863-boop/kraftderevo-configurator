// UI конфигуратора: выбор артикула (плитки) -> ползунки/поля из описания параметров -> (debounce) -> воркер -> SVG на странице.
// Скачивание: SVG, PDF, STL, STEP.  Здесь нет ни replicad, ни OpenCascade: всё тяжёлое делает воркер.
import { svgToPdfBlob } from "./pdf.js";
import { svgToPngBlob } from "./png.js";

const $ = (id) => document.getElementById(id);
const BASE = import.meta.env.BASE_URL;
let articles = [], byId = {}, cur = null, values = {}, last = null, ready = false;
let reqId = 0, inflight = null, dirty = false, timer = 0, syncAll = false;
const pending = new Map();

const setStatus = (t, cls = "") => { const s = $("status"); s.textContent = t; s.className = "status " + cls; };
const call = (msg) => new Promise((resolve, reject) => { if (!worker) return reject(new Error("CAD-ядро не запущено")); const id = ++reqId; pending.set(id, { resolve, reject }); worker.postMessage({ id, ...msg }); });
// ---------- воркер, прогресс загрузки и показ ошибок (чтобы «загрузка CAD-ядра» никогда не висела молча) ----------
const mb = (n) => (n / 1048576).toFixed(1);
const diagText = () => [
  "Страница: " + location.href,
  "Браузер: " + navigator.userAgent,
  "Память устройства (deviceMemory, ГБ): " + (navigator.deviceMemory ?? "н/д") + "; ядер: " + (navigator.hardwareConcurrency ?? "н/д"),
  "Сеть: " + (navigator.connection ? [navigator.connection.effectiveType, navigator.connection.downlink && navigator.connection.downlink + " Мбит/с", navigator.connection.saveData && "экономия трафика ВКЛ"].filter(Boolean).join(", ") : "н/д"),
  "WebAssembly: " + (typeof WebAssembly === "object" ? "есть" : "НЕТ") + "; Worker: " + (typeof Worker === "function" ? "есть" : "НЕТ"),
  "Последний этап: " + lastStage,
].join("\n");
let lastStage = "старт", t0 = performance.now(), watchdog = 0;
function showError(text) {
  clearTimeout(watchdog); $("progress").hidden = true;
  setStatus("Ошибка: " + text, "err");
  const d = $("diag"); d.hidden = false; $("diag-text").textContent = "Ошибка: " + text + "\n" + diagText() + "\nВремя с начала загрузки: " + Math.round((performance.now() - t0) / 1000) + " с";
}
function showProgress(m) {
  lastStage = m.text + (m.total ? ` [${mb(m.loaded)} из ${mb(m.total)} МБ]` : "");
  const bar = $("progress"); bar.hidden = false;
  if (m.compiling) { bar.removeAttribute("value"); setStatus(m.text, "busy"); return; }
  if (m.total) { const pc = Math.min(99, Math.floor((m.loaded / m.total) * 100)); bar.value = pc; setStatus(`${m.text} ${pc}% (${mb(m.loaded)} МБ)`, "busy"); } else setStatus(m.text, "busy");
}
let worker;
try { worker = new Worker(new URL("./worker/cad.worker.js", import.meta.url), { type: "module" }); }
catch (e) { showError("не удалось создать фоновый поток (Web Worker): " + e.message + ". Нужен современный браузер (Chrome 80+/Safari 15+)."); }
if (worker) {
  worker.onmessage = ({ data }) => {
    if (data.type === "meta") { articles = data.articles; byId = Object.fromEntries(articles.map((a) => [a.id, a])); buildTiles(); selectArticle((location.hash.slice(1) in byId ? location.hash.slice(1) : articles[0].id)); return; }
    if (data.type === "stage") return showProgress(data);
    if (data.type === "initerror") return showError(data.message + (data.stack ? "\n" + data.stack : ""));
    if (data.type === "ready") { ready = true; clearTimeout(watchdog); $("progress").hidden = true; $("diag").hidden = true; setStatus("готово"); request(0); return; }
    const p = pending.get(data.id); if (!p) return; pending.delete(data.id);
    data.type === "error" ? p.reject(new Error(data.message)) : p.resolve(data);
  };
  worker.onerror = (e) => showError("воркер: " + (e.message || "скрипт воркера не загрузился или упал") + (e.filename ? ` (${e.filename}:${e.lineno})` : "") + (e.message ? "" : ". Возможные причины: блокировка скриптов, нехватка памяти, устаревший браузер."));
  worker.onmessageerror = () => showError("воркер: ошибка передачи данных");
  worker.postMessage({ type: "init", base: new URL(BASE, location.href).href });
  // если за минуту CAD-ядро не готово: не пугаем ошибкой (мобильный интернет может быть медленным), но показываем диагностику
  watchdog = setTimeout(() => { if (!ready) { const d = $("diag"); d.hidden = false; $("diag-text").textContent = "Загрузка идёт дольше обычного (> 60 с).\n" + diagText(); } }, 60000);
}
addEventListener("error", (e) => { if (!ready && e.message) showError(e.message); });
addEventListener("unhandledrejection", (e) => { if (!ready) showError(String(e.reason && e.reason.message || e.reason)); });
$("diag-copy").onclick = async () => { try { await navigator.clipboard.writeText($("diag-text").textContent); $("diag-copy").textContent = "Скопировано"; } catch { const r = document.createRange(); r.selectNodeContents($("diag-text")); getSelection().removeAllRanges(); getSelection().addRange(r); } };

// ---------- плитки артикулов ----------
function buildTiles() {
  const tile = (a) => `<button type="button" class="tile" role="radio" aria-checked="false" data-article="${a.id}" title="${a.about}"><b>${a.name.startsWith(a.type + " ") ? a.name.slice(a.type.length + 1) : a.name}</b><small>${a.type}</small></button>`;
  const cats = [...new Set(articles.map((a) => a.category))];                       // категории — в порядке реестра: Ножки и опоры, Подстолья, Рейлы, Вешалки, Под раковины, Другое
  $("tiles").innerHTML = cats.map((c) => `<section class="cat" data-category="${c}"><h2>${c}</h2><div class="tiles">${articles.filter((a) => a.category === c).map(tile).join("")}</div></section>`).join("");
  for (const b of $("tiles").querySelectorAll(".tile")) b.onclick = () => selectArticle(b.dataset.article);
}
function selectArticle(id) {
  cur = byId[id]; values = { ...cur.defaults }; last = null;
  for (const b of $("tiles").querySelectorAll(".tile")) b.setAttribute("aria-checked", String(b.dataset.article === id));
  $("about").textContent = cur.about; history.replaceState(null, "", "#" + id);
  buildControls(); setButtons(false); request(0);
}

// ---------- поля параметров ----------
function controlRow(c) {
  const row = document.createElement("div"); row.dataset.key = c.key;
  if (c.depends) row.dataset.depends = c.depends;
  if (c.type === "range") {
    row.className = "row";
    row.innerHTML = `<span>${c.label}</span><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.label}"><input type="number" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.label}, число"><span class="unit">${c.unit}</span>`;
    const [r, n] = row.querySelectorAll("input"); r.value = n.value = values[c.key];
    r.oninput = () => { n.value = r.value; values[c.key] = Number(r.value); request(); };
    n.oninput = () => { if (n.value === "" || !Number.isFinite(Number(n.value))) return; r.value = n.value; values[c.key] = Number(n.value); request(); };
    n.onchange = () => { if (n.value === "") n.value = values[c.key]; syncAll = true; request(0); };
    r.onchange = () => { syncAll = true; request(0); };
  } else if (c.type === "int") {
    row.className = "row int";
    row.innerHTML = `<span>${c.label}</span><input type="number" min="${c.min}" max="${c.max}" step="1" aria-label="${c.label}">`;
    const n = row.querySelector("input"); n.value = values[c.key];
    n.oninput = () => { if (n.value === "" || !Number.isFinite(Number(n.value))) return; values[c.key] = Number(n.value); request(); };
    n.onchange = () => { if (n.value === "") n.value = values[c.key]; syncAll = true; request(0); };
  } else if (c.type === "check") {
    row.className = "row check";
    row.innerHTML = `<span>${c.label}</span><input type="checkbox" aria-label="${c.label}">`;
    const box = row.querySelector("input"); box.checked = !!values[c.key];
    box.onchange = () => { values[c.key] = box.checked; applyDepends(); syncAll = true; request(0); };
  } else if (c.type === "select") {
    row.className = "row sel";
    row.innerHTML = `<span>${c.label}</span><select aria-label="${c.label}">${c.options.map((o) => `<option value="${o.value}">${o.label} мм</option>`).join("")}</select>`;
    const s = row.querySelector("select"); s.value = values[c.key];
    s.onchange = () => { values[c.key] = s.value; syncAll = true; request(0); };
  } else {
    row.className = "row txt";
    const dl = `dl-${c.key}`;
    row.innerHTML = `<span>${c.label}</span><input type="text" list="${dl}" maxlength="40" aria-label="${c.label}"><datalist id="${dl}">${(c.suggestions || []).map((s) => `<option value="${s}">`).join("")}</datalist>`;
    const t = row.querySelector("input"); t.value = values[c.key];
    t.oninput = () => { values[c.key] = t.value; request(); };
    t.onchange = () => { if (!t.value.trim()) { t.value = c.def; values[c.key] = c.def; request(0); } };
  }
  return row;
}
function applyDepends() {
  const plate = !!values.plate;
  for (const row of $("controls").querySelectorAll("[data-depends]")) row.hidden = row.dataset.depends === "plate" && !plate;
}
function buildControls() {
  const box = $("controls"); box.innerHTML = "";
  const main = cur.controls.filter((c) => !c.extra), extra = cur.controls.filter((c) => c.extra);
  for (const c of main) box.append(controlRow(c));
  if (extra.length) {
    const det = document.createElement("details"); det.className = "extra"; det.open = true;
    det.innerHTML = "<summary>Дополнительно</summary>";
    for (const c of extra) det.append(controlRow(c));
    box.append(det);
  }
  applyDepends();
}
/** показать в полях значения, которые вернул воркер после проверки (ограничения диапазонов, согласование параметров) */
function syncControls(p, force) {
  for (const row of $("controls").querySelectorAll("[data-key]")) {
    const k = row.dataset.key, box = row.querySelector("input[type=checkbox]");
    if (box) {
      if (!force && document.activeElement === box) continue;
      values[k] = !!p[k]; box.checked = !!p[k];
      continue;
    }
    const el = row.querySelector("select, input[type=number], input[type=text]"), r = row.querySelector("input[type=range]");
    if (!el) continue;
    if (!force && document.activeElement === el) continue;
    if (String(p[k]) === String(values[k]) && !force) continue;
    values[k] = p[k]; el.value = p[k]; if (r) r.value = p[k];
  }
  applyDepends();
}
$("reset").onclick = () => { values = { ...cur.defaults }; buildControls(); request(0); };

// ---------- перерисовка: debounce + «последний запрос побеждает» ----------
function request(delay = 220) { clearTimeout(timer); timer = setTimeout(pump, delay); }
async function pump() {
  if (!ready || !cur) return;
  if (inflight) { dirty = true; return; }
  const art = cur.id, snapshot = { ...values }, force = syncAll; syncAll = false;
  inflight = art; dirty = false; setStatus("считаю…", "busy");
  try {
    const r = await call({ type: "draw", article: art, params: snapshot });
    if (!dirty && cur.id === art) show(r, force);
  } catch (e) { setStatus("ошибка: " + e.message, "err"); console.error(e); }
  finally { inflight = null; if (dirty) request(0); }
}
function show(r, force) {
  last = r; $("view").innerHTML = r.svg; $("view").dataset.article = r.article;
  syncControls(r.params, force);
  $("warnings").innerHTML = r.warnings.map((w) => `<li>${w}</li>`).join("");
  const c = r.check, s = r.solid, a = r.adjust;
  // Отчёт о проверках в интерфейсе не показываем: результаты доступны тестам (window.__checks, data-атрибуты на #checks) и в console.debug.
  const checks = { overlap: c.ok ? "OK" : "FAIL", solid: s.ok ? "OK" : "FAIL", article: r.article, segments: c.segments, margin: c.margin, attempts: a.attempts, layout: a.layout,
    solids: s.solids, bbox: r.bbox, bboxOK: s.bboxOK };
  window.__checks = checks; Object.assign($("checks").dataset, { overlap: checks.overlap, solid: checks.solid, attempts: String(a.attempts), solids: String(s.solids), bboxOk: String(!!s.bboxOK) });
  console.debug("[проверки]", checks);
  if (!c.ok) console.warn("[проверки] есть пересечения текста с линиями чертежа", c);        // для пользователя — ничего (чертёж всё равно подобран лучшим из вариантов)
  $("info").textContent = s.ok ? "" : "Не удалось построить корректное тело для этих параметров — измените размеры или профиль.";   // реальная ошибка геометрии остаётся видимой
  $("info").hidden = s.ok;
  setStatus(`готово · ${r.ms} мс`); setButtons(true);
}
const setButtons = (on) => { for (const id of ["dl-png", "dl-pdf", "dl-stl"]) $(id).disabled = !on; };

// ---------- скачивание ----------
function save(blob, name) { const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
$("dl-png").onclick = async () => { if (!last) return; setStatus("PNG…", "busy"); try { save(await svgToPngBlob(last.svg, last.W, last.H), last.name + ".png"); setStatus("PNG готов"); } catch (e) { setStatus("PNG: " + e.message, "err"); console.error(e); } };
$("dl-pdf").onclick = async () => { if (!last) return; setStatus("PDF…", "busy"); try { save(await svgToPdfBlob(last.svg, last.W, last.H), last.name + ".pdf"); setStatus("PDF готов"); } catch (e) { setStatus("PDF: " + e.message, "err"); console.error(e); } };
$("dl-stl").onclick = async () => {
  if (!last) return; setStatus("STL…", "busy");
  try { const r = await call({ type: "export", format: "stl", article: last.article, params: last.params }); save(new Blob([r.buffer], { type: "model/stl" }), r.name); setStatus("STL готов"); }
  catch (e) { setStatus("STL: " + e.message, "err"); }
};
setButtons(false);
window.__configurator = { get last() { return last; }, get values() { return values; } };   // для автотестов
