// E2E (Playwright, headless Chromium) по собранной странице (`npm run build` -> vite preview):
//  для каждого из 12 артикулов: выбрать плитку, проверить SVG/заголовок/строки, подвигать ползунок, сменить профиль/полосу и цвет,
//  проверить проверку пересечений (из воркера + независимая проверка в странице), сохранить скриншот screens/<артикул>.png;
//  плюс: валидация недопустимых значений, скачивание PNG/PDF/STL, ошибки консоли.
//  Запуск: npm run build && npm test     (CHROME_PATH=/usr/bin/google-chrome — системный Chrome)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCREENS = path.join(ROOT, "screens"); fs.mkdirSync(SCREENS, { recursive: true });
const PORT = 4173, URL = `http://localhost:${PORT}/`;
const srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" });
await new Promise((res, rej) => { srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && res()); srv.on("exit", rej); setTimeout(() => rej(new Error("preview не стартовал")), 20000); });
const fail = [];
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail.push(m); };
const chrome = process.env.CHROME_PATH || (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined);
const browser = await chromium.launch({ executablePath: chrome, args: ["--no-sandbox"] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const t0 = Date.now();
  await page.goto(URL);
  await page.waitForSelector("#view svg", { timeout: 90000 });
  console.log("первая отрисовка через", Date.now() - t0, "мс");
  const tiles = await page.$$eval("#tiles .tile", (t) => t.map((x) => x.dataset.article));
  const EXPECT = ["H031", "H005", "H050", "H027-1", "H112", "H028", "H030-2", "H043", "H038", "H098", "0090", "0011"];
  ok(JSON.stringify(tiles) === JSON.stringify(EXPECT), "плитки: все 12 артикулов в нужном порядке: " + tiles.join(" "));

  const lastP = () => page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__configurator.last, svg: undefined })));
  const waitLast = (pred, arg, timeout = 60000) => page.waitForFunction(`(() => { const l = window.__configurator.last; return !!l && (${pred})(l, ${JSON.stringify(arg)}); })()`, null, { timeout });
  const texts = () => page.$$eval("#view [data-text]", (e) => e.map((x) => x.dataset.text));
  // независимая проверка в странице: ни один прямоугольник текста (+поля) не пересекается с отрезками геометрии/размерных линий
  const domOverlap = () => page.evaluate(() => {
    const svg = document.querySelector("#view svg"), M = 6, segs = [], rects = [];
    const toRoot = (el) => { const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM()), b = el.getBBox(); const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]); return pts; };
    for (const pl of svg.querySelectorAll("#geometry polyline")) { const p = pl.getAttribute("points").split(" ").map((s) => s.split(",").map(Number)); for (let i = 0; i < p.length - 1; i++) segs.push([p[i], p[i + 1]]); }
    for (const l of svg.querySelectorAll("#dimensions line")) segs.push([[+l.getAttribute("x1"), +l.getAttribute("y1")], [+l.getAttribute("x2"), +l.getAttribute("y2")]]);
    for (const t of svg.querySelectorAll("#info path")) { const q = toRoot(t), xs = q.map((p) => p[0]), ys = q.map((p) => p[1]); rects.push({ t: t.dataset.text, x0: Math.min(...xs) - M, x1: Math.max(...xs) + M, y0: Math.min(...ys) - M, y1: Math.max(...ys) + M }); }
    const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
    const segX = (a, b, c, d) => ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
    const hit = (a, b, r) => { const inside = (p) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1; if (inside(a) || inside(b)) return true; const c = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]]; return [0, 1, 2, 3].some((i) => segX(a, b, c[i], c[(i + 1) % 4])); };
    const bad = []; for (const r of rects) for (const [a, b] of segs) if (hit(a, b, r)) { bad.push(r.t); break; }
    // подписи размеров (повёрнутые прямоугольники) против геометрии: берём их bbox-центр-линию грубо — проверяем только углы повёрнутой подложки
    const labels = [...svg.querySelectorAll("#dimensions g.dim-label rect")].map((r) => { const q = toRoot(r); return q; });
    const inPoly = (p, q) => { let s = 0; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if (c !== 0) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } } return true; };
    let labelHits = 0; for (const q of labels) for (const pl of svg.querySelectorAll("#geometry polyline")) { const p = pl.getAttribute("points").split(" ").map((s) => s.split(",").map(Number)); for (let i = 0; i < p.length - 1; i++) { if (inPoly(p[i], q) || inPoly(p[i + 1], q) || [0, 1, 2, 3].some((j) => segX(p[i], p[i + 1], q[j], q[(j + 1) % 4]))) labelHits++; } }
    return { rects: rects.length, segs: segs.length, bad, labelHits };
  });

  const results = [];
  for (const id of EXPECT) {
    const tt = Date.now();
    await page.click(`#tiles .tile[data-article="${id}"]`);
    await waitLast((l, a) => l.article === a, id);
    const meta = await lastP();
    const tx = await texts();
    // --- чертёж и текстовый блок
    const svgInfo = await page.$eval("#view svg", (s) => ({ lines: s.querySelectorAll("#geometry polyline").length, dims: s.querySelectorAll(".dim-label").length, vb: s.getAttribute("viewBox"), bg: s.querySelector("rect").getAttribute("fill") }));
    ok(svgInfo.lines > 10 && svgInfo.dims >= 1 && svgInfo.bg === "#fff", `${id}: SVG отрисован (${svgInfo.lines} линий, ${svgInfo.dims} размеров, белый фон, viewBox ${svgInfo.vb})`);
    const [title, line2, ...rest] = tx.filter((t, i) => i >= tx.findIndex((x) => /Н|\u041D/.test(x)) && true).filter((t) => !t.endsWith(" мм") || /:|Профиль|Полоса/.test(t));
    ok(/^(Опора|Ножка|Подстолье) /.test(title) && (id === "H098" || id.startsWith("00") || title.includes("\u041D")) && title.endsWith(id.replace(/^H/, "")) , `${id}: заголовок «${title}» (кириллическая Н: ${id.startsWith("H") ? title.includes("\u041D") : "n/a"})`);
    ok(/^(Профиль|Полоса) \d+×\d+ мм/.test(line2) && !tx.some((t) => /сплошн/i.test(t)), `${id}: вторая строка «${line2}», слова «сплошной» нет`);
    ok(tx.some((t) => /^Цвет: .+/.test(t)), `${id}: есть строка «Цвет: …»`);
    const ov = async (tag) => { const o = await page.textContent('[data-check="overlap"]'), s = await page.textContent('[data-check="solid"]'), d = await domOverlap(); ok(o === "OK" && s === "OK" && d.bad.length === 0 && d.labelHits === 0, `${id}${tag}: проверка пересечений OK (воркер: ${o}; в странице: ${d.rects} строк × ${d.segs} отрезков, пересечений ${d.bad.length}, подписи×геометрия ${d.labelHits}); тело: ${s}`); };
    await ov("");
    // --- ползунок
    const ctl = meta.params, ctls = await page.$$eval("#controls .row", (rows) => rows.map((r) => ({ key: r.dataset.key, kind: r.querySelector("input[type=range]") ? "range" : r.querySelector("select") ? "select" : "text", min: +(r.querySelector("input[type=range]")?.min), max: +(r.querySelector("input[type=range]")?.max), step: +(r.querySelector("input[type=range]")?.step), n: r.querySelectorAll("input[type=range]").length })));
    const first = ctls.find((c) => c.kind === "range"), cur = ctl[first.key];
    let target = Math.round((first.min + (first.max - first.min) * (cur / (first.max - first.min) > 0.5 ? 0.3 : 0.7)) / first.step) * first.step;
    if (target === cur) target += first.step;
    await page.$eval(`#controls [data-key="${first.key}"] input[type=range]`, (el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, target);
    await waitLast((l, a) => l.params[a[0]] === a[1], [first.key, target]);
    const num = await page.inputValue(`#controls [data-key="${first.key}"] input[type=number]`);
    ok(num === String(target) && (await texts()).some((t) => t === `${target} мм` || t.endsWith(`: ${target} мм`)), `${id}: ползунок «${first.key}» ${cur} → ${target}: число в поле ${num}, размер на чертеже обновился`);
    await ov(" после ползунка");
    // --- ещё несколько ползунков (каждый на 25% диапазона) — проверка живой перестройки
    for (const c of ctls.filter((c) => c.kind === "range" && c.key !== first.key).slice(0, 3)) {
      const v = Math.round((c.min + (c.max - c.min) * 0.4) / c.step) * c.step;
      await page.$eval(`#controls [data-key="${c.key}"] input[type=range]`, (el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, v);
      await waitLast((l, a) => l.params[a[0]] !== undefined && l.ms >= 0 && window.__configurator.values[a[0]] === l.params[a[0]], [c.key]);
      await page.waitForTimeout(150);
      await ov(` (${c.key}=${v})`);
    }
    // --- профиль / полоса и цвет
    const sel = ctls.find((c) => c.kind === "select");
    const opts = await page.$$eval(`#controls [data-key="${sel.key}"] option`, (o) => o.map((x) => x.value));
    const curSel = (await lastP()).params[sel.key], nextOpt = opts.find((o) => o !== curSel && o !== "40x20") || opts[0];
    await page.selectOption(`#controls [data-key="${sel.key}"] select`, nextOpt);
    await waitLast((l, a) => l.params[a[0]] === a[1], [sel.key, nextOpt].map((x) => x));
    const lab = await page.$eval(`#controls [data-key="${sel.key}"] option[value="${nextOpt}"]`, (o) => o.textContent.replace(" мм", ""));
    ok((await texts()).some((t) => new RegExp(`^(Профиль|Полоса) ${lab}( мм|$)`).test(t)), `${id}: «${sel.key}» → ${lab}: строка в блоке обновилась`);
    await page.fill('#controls [data-key="color"] input', "RAL 7016");
    await waitLast((l) => l.params.color === "RAL 7016");
    ok((await texts()).includes("Цвет: RAL 7016"), `${id}: цвет «RAL 7016» в блоке`);
    await page.waitForTimeout(250);
    await ov(" после профиля/цвета");
    const fin = await lastP();
    ok(fin.solid.ok && fin.solid.solids === 1 && fin.solid.bboxOK, `${id}: цельное тело (1 solid), габариты ${fin.bbox.join("×")} = заданным ${fin.expectBBox.join("×")}`);
    await page.screenshot({ path: path.join(SCREENS, `${id}.png`) });
    results.push({ id, ms: fin.ms, total: Date.now() - tt, adjust: fin.adjust.attempts });
  }
  console.log("время расчёта (мс) по артикулам:", results.map((r) => `${r.id}:${r.ms}`).join(" "));

  // ---------- валидация недопустимых значений ----------
  await page.click('#tiles .tile[data-article="H005"]'); await waitLast((l, a) => l.article === a, "H005");
  await page.fill('#controls [data-key="WT"] input[type=number]', "1200"); await page.dispatchEvent('#controls [data-key="WT"] input[type=number]', "change");
  await waitLast((l) => l.params.WT <= l.params.WB && l.warnings.length > 0);
  ok((await page.$$eval("#warnings li", (l) => l.map((x) => x.textContent))).length > 0 && (await page.textContent('[data-check="solid"]')) === "OK", "H005: ширина верха 1200 > ширины низа — сообщение вместо падения: " + (await page.$$eval("#warnings li", (l) => l.map((x) => x.textContent))).join(" | "));
  await page.fill('#controls [data-key="H"] input[type=number]', "99999"); await page.dispatchEvent('#controls [data-key="H"] input[type=number]', "change");
  await waitLast((l) => l.params.H === 1100);
  ok((await page.inputValue('#controls [data-key="H"] input[type=number]')) === "1100", "H005: высота 99999 ограничена максимумом 1100 (поле обновлено)");
  await page.click('#tiles .tile[data-article="H050"]'); await waitLast((l, a) => l.article === a, "H050");
  await page.selectOption('#controls [data-key="profile"] select', "80x40");
  await page.fill('#controls [data-key="WB"] input[type=number]', "100"); await page.dispatchEvent('#controls [data-key="WB"] input[type=number]', "change");
  await waitLast((l) => l.params.profile === "80x40" && l.params.WB >= 100);
  ok((await page.textContent('[data-check="solid"]')) === "OK" && (await page.textContent('[data-check="overlap"]')) === "OK", "H050: нижняя ширина 100 при профиле 80×40 — согласовано: WB=" + (await lastP()).params.WB + "; " + (await page.$$eval("#warnings li", (l) => l.map((x) => x.textContent))).join(" | "));
  await page.click('#tiles .tile[data-article="H112"]'); await waitLast((l, a) => l.article === a, "H112");
  await page.selectOption('#controls [data-key="profile"] select', "80x40"); await page.selectOption('#controls [data-key="strip"] select', "60x6");
  await waitLast((l) => l.params.profile === "80x40");
  ok((await lastP()).params.strip === "80x6" || (await lastP()).params.strip === "80x8", "H112: полоса 60 уже профиля 80 — выбрана подходящая: " + (await lastP()).params.strip);

  // ---------- сброс ----------
  await page.click("#reset"); await waitLast((l) => l.params.profile === "50x25");
  ok(true, "сброс к значениям по умолчанию");

  // ---------- обзорный скриншот: H112 со стандартными размерами и чуть изменёнными ползунками ----------
  await page.click('#tiles .tile[data-article="H043"]'); await waitLast((l, a) => l.article === a, "H043");
  await page.$eval('#controls [data-key="H"] input[type=range]', (el) => { el.value = 760; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitLast((l) => l.params.H === 760); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENS, "overview.png") });

  // ---------- скачивание ----------
  const dl = async (sel) => { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click(sel)]); const p = `/tmp/dl_${d.suggestedFilename()}`; await d.saveAs(p); return p; };
  ok((await page.$("#dl-svg")) === null && (await page.$("#dl-step")) === null && (await page.$("#dl-png")) !== null, "кнопки: SVG и STEP убраны, PNG есть");
  const pngP = await dl("#dl-png"), png = fs.readFileSync(pngP), pw = png.readUInt32BE(16), ph = png.readUInt32BE(20), lastW = await page.evaluate(() => window.__configurator.last.W);
  ok(png.subarray(1, 4).toString() === "PNG" && ph === 1280 && pw === Math.round(lastW * 1280 / (await page.evaluate(() => window.__configurator.last.H))) && png.length > 20000, `PNG скачан: ${pngP} (${pw}×${ph}, ${png.length} байт)`);
  const pdfP = await dl("#dl-pdf"), pdf = fs.readFileSync(pdfP);
  ok(pdf.subarray(0, 4).toString() === "%PDF" && pdf.length > 5000, `PDF скачан: ${pdfP} (${pdf.length} байт)`);
  const stlP = await dl("#dl-stl"), stl = fs.readFileSync(stlP), ntri = stl.readUInt32LE(80);
  ok(stl.length === 84 + 50 * ntri && ntri > 20, `STL скачан: ${stlP} (бинарный, ${ntri} треугольников)`);
  fs.copyFileSync(pngP, path.join(SCREENS, "sample_download.png"));

  ok(errors.length === 0, "нет ошибок в консоли" + (errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""));
} finally { await browser.close(); srv.kill(); }
if (fail.length) { console.error("ПРОВАЛЕНО:", fail); process.exit(1); } else { console.log("ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ"); process.exit(0); }
