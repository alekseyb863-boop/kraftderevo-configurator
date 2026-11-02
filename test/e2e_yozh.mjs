// E2E «Ёж» (подстолье из 4 галочек в коробке Длина × Ширина × Высота; desktop): плитка без артикула, подписи полей, умолчания 1150×1250×450 / 40×20,
//   сборка из 4 отдельных тел (касание в точках), габарит == коробке, проверка пересечений, другие размеры/профили, недопустимые значения, PNG 1280.
//   node test/e2e_yozh.mjs  (URL=https://… — живой сайт;  SHOT=файл — скриншот страницы Ёж)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4178, URL_ = process.env.URL || `http://localhost:${PORT}/`;
let srv; if (!process.env.URL) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r, j) => { srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r()); srv.on("exit", j); setTimeout(() => j(new Error("preview не стартовал")), 20000); }); }
const browser = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [], errs = [];
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails.push(m); };
try {
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true })).newPage();
  page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const t0 = Date.now();
  await page.goto(URL_ + "#YOZH"); await page.waitForSelector("#view svg", { timeout: 120000 });
  console.log("первая отрисовка через", Date.now() - t0, "мс");
  const last = () => page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__configurator.last, svg: undefined })));
  const wait = (pred, arg) => page.waitForFunction(`(() => { const l = window.__configurator.last; return !!l && (${pred})(l, ${JSON.stringify(arg)}); })()`, null, { timeout: 60000 });
  const texts = () => page.$$eval("#view [data-text]", (e) => e.map((x) => x.dataset.text));
  const warns = () => page.$$eval("#warnings li", (l) => l.map((x) => x.textContent));
  const set = async (key, v) => { await page.fill(`#controls [data-key="${key}"] input[type=number]`, String(v)); await page.dispatchEvent(`#controls [data-key="${key}"] input[type=number]`, "change"); };
  await wait((l) => l.article === "YOZH");
  // плитка: просто «Ёж», в «Подстольях», без артикула
  const tile = await page.$eval('#tiles .tile[data-article="YOZH"]', (t) => ({ txt: t.innerText, cat: t.closest("section.cat").dataset.category, sel: t.getAttribute("aria-checked") }));
  ok(tile.txt.split("\n")[0] === "Ёж" && tile.cat === "Подстолья" && tile.sel === "true" && !/YOZH|CHEVRON/i.test(tile.txt), "плитка: «" + tile.txt.replace("\n", " / ") + "», категория «" + tile.cat + "»");
  const labels = await page.$$eval("#controls .row > span:first-child", (s) => s.map((x) => x.textContent));
  ok(JSON.stringify(labels) === JSON.stringify(["Длина", "Ширина", "Высота", "Профиль"]), "подписи полей: " + labels.join(", "));
  const opts = await page.$$eval('#controls [data-key="profile"] option', (o) => o.map((x) => x.textContent.replace(" мм", "")));
  ok(["40×20", "40×40", "60×30", "60×40", "80×40"].every((o) => opts.includes(o)), "профили: " + opts.join(", "));
  let L = await last();
  ok(L.params.W === 1150 && L.params.D === 1250 && L.params.H === 450 && L.params.profile === "40x20", "умолчания 1150×1250×450, профиль 40×20: " + JSON.stringify(L.params));
  const good = async (m, box) => { const l = await last(), ov = await page.getAttribute("#checks", "data-overlap"), so = await page.getAttribute("#checks", "data-solid");
    ok(l.solid.ok && l.solid.solids === 4 && l.solid.valid && l.solid.watertight && l.solid.bboxOK && ov === "OK" && so === "OK" && (!box || l.bbox.join("×") === box.join("×")), `${m}: 4 тела, габарит ${l.bbox.join("×")}${box ? " = коробке" : ""}, пересечения ${ov}, тело ${so}, ${l.ms} мс`); return l; };
  await good("умолчания", [1150, 1250, 450]);
  const body = await page.evaluate(() => document.body.innerText), chk = await page.evaluate(() => window.__checks);
  ok(!/Проверка пересечений|Расположение подобрано|Тело: |герметичн|отрезков, поля/.test(body) && (await page.isHidden("#info")) && chk.overlap === "OK" && chk.solid === "OK", "отчёт о проверках не виден в интерфейсе, window.__checks OK");
  let tx = await texts();
  ok(tx.includes("Ёж") && tx.includes("Чертеж в изометрической проекции") && tx.includes("Коробка: Длина 1150 × Ширина 1250 × Высота 450 мм") && tx.includes("Профиль 40×20 мм") && ["Длина 1150 мм", "Ширина 1250 мм", "Высота 450 мм"].every((t) => tx.includes(t)), "чертёж: заголовок, «Чертеж в изометрической проекции», размеры коробки и профиль: " + tx.join(" | "));
  const svgInfo = await page.$eval("#view svg", (s) => ({ box: s.querySelectorAll("#box polyline").length, geo: s.querySelectorAll("#geometry polyline").length, bg: s.querySelector("rect").getAttribute("fill") }));
  ok(svgInfo.box === 12 && svgInfo.geo > 20 && svgInfo.bg === "#fff", "SVG: белый фон, " + svgInfo.geo + " линий модели, тонкий контур коробки (" + svgInfo.box + " рёбер)");
  // другие размеры и профили (в т.ч. Длина > Ширина — без поворота)
  for (const [W, D, H, pr] of [[1300, 700, 500, "60x40"], [600, 1800, 750, "40x40"], [2000, 2000, 300, "80x40"], [400, 400, 400, "60x30"]]) {
    await page.selectOption('#controls [data-key="profile"] select', pr); await set("W", W); await set("D", D); await set("H", H);
    await wait((l, a) => l.params.W === a[0] && l.params.D === a[1] && l.params.H === a[2] && l.params.profile === a[3], [W, D, H, pr]);
    await page.waitForTimeout(200);
    await good(`${W}×${D}×${H}, ${pr}`, [W, D, H]);
    tx = await texts(); const lab = pr.replace("x", "×");
    ok(tx.includes(`Профиль ${lab} мм`) && tx.includes(`Длина ${W} мм`) && tx.includes(`Ширина ${D} мм`) && tx.includes(`Высота ${H} мм`), `  подписи обновились (профиль ${lab})`);
  }
  // недопустимое
  await page.selectOption('#controls [data-key="profile"] select', "80x40"); await set("W", 200); await set("D", 200); await set("H", 450);
  await wait((l) => l.params.profile === "80x40" && l.warnings.length > 0 && l.solid.ok);
  L = await good("200×200 при профиле 80×40: коробка увеличена", null);
  ok(L.params.W + L.params.D > 400 && (await warns()).length > 0, `  предупреждение вместо падения: ${L.params.W}×${L.params.D}; ` + (await warns()).join(" | "));
  await set("W", 99999); await wait((l) => l.params.W === 2500);
  ok((await page.inputValue('#controls [data-key="W"] input[type=number]')) === "2500", "Длина 99999 ограничена максимумом 2500");
  await set("H", 5); await wait((l) => l.params.H === 150);
  await good("высота 5 → 150", null);
  // сброс и PNG
  await page.click("#reset"); await wait((l) => l.params.W === 1150 && l.params.D === 1250 && l.params.H === 450 && l.params.profile === "40x20");
  await good("сброс", [1150, 1250, 450]);
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("#dl-png")]); const p = "/tmp/dl_" + d.suggestedFilename(); await d.saveAs(p);
  const png = fs.readFileSync(p), pw = png.readUInt32BE(16), ph = png.readUInt32BE(20);
  ok(png.subarray(1, 4).toString() === "PNG" && ph === 1280 && png.length > 20000 && /1150x1250x450/.test(p), `PNG: ${p} (${pw}×${ph}, ${png.length} байт)`);
  if (process.env.SHOT) { await page.waitForTimeout(300); await page.screenshot({ path: process.env.SHOT }); console.log("скриншот:", process.env.SHOT); }
  ok(errs.length === 0, "нет ошибок в консоли" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));
} finally { await browser.close(); srv?.kill(); }
if (fails.length) { console.error("ПРОВАЛЕНО:", fails); process.exit(1); } console.log("ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ"); process.exit(0);
