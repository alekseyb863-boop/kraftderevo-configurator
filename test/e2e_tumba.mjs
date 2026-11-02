// E2E «Тумба кух.» (настенный каркас-кронштейн, категория «Другое»; desktop): плитка без артикула, подписи полей и умолчания 780×300×300 / 20×20 / 75–85 / 4 / 100,
//   одно валидное тело, габарит == Длина×Ширина×Высота, проверка пересечений, размерные линии как на фото заказа 8099 (780 + 75/210/210/210/75, 300 + 150/150, 300 + 100, 180/210/210/180),
//   окружности отверстий Ø5, другие параметры (подбор отступа/шага), недопустимые значения, PNG 1280.
//   node test/e2e_tumba.mjs  (URL=https://… — живой сайт;  SHOT=файл — скриншот страницы;  PNG_OUT=файл — копия скачанного PNG)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4179, URL_ = process.env.URL || `http://localhost:${PORT}/`;
let srv; if (!process.env.URL) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r, j) => { srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r()); srv.on("exit", j); setTimeout(() => j(new Error("preview не стартовал")), 20000); }); }
const browser = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [], errs = [];
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails.push(m); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
try {
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true })).newPage();
  page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const t0 = Date.now();
  await page.goto(URL_ + "#TUMBA_KUH"); await page.waitForSelector("#view svg", { timeout: 120000 });
  console.log("первая отрисовка через", Date.now() - t0, "мс");
  const last = () => page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__configurator.last, svg: undefined })));
  const wait = (pred, arg) => page.waitForFunction(`(() => { const l = window.__configurator.last; return !!l && (${pred})(l, ${JSON.stringify(arg)}); })()`, null, { timeout: 60000 });
  const texts = () => page.$$eval("#view [data-text]", (e) => e.map((x) => x.dataset.text));
  const warns = () => page.$$eval("#warnings li", (l) => l.map((x) => x.textContent));
  const set = async (key, v) => { await page.fill(`#controls [data-key="${key}"] input[type=number]`, String(v)); await page.dispatchEvent(`#controls [data-key="${key}"] input[type=number]`, "change"); };
  await wait((l) => l.article === "TUMBA_KUH");
  // плитка: «Тумба кух.», в новой категории «Другое» (после «Рейлов»), без артикула
  const tile = await page.$eval('#tiles .tile[data-article="TUMBA_KUH"]', (t) => ({ txt: t.innerText, cat: t.closest("section.cat").dataset.category, sel: t.getAttribute("aria-checked") }));
  const cats = await page.$$eval("#tiles section.cat h2", (h) => h.map((x) => x.textContent));
  ok(tile.txt.split("\n")[0] === "Тумба кух." && tile.cat === "Другое" && tile.sel === "true" && !/TUMBA|H\d{3}|\d{4}/.test(tile.txt), "плитка: «" + tile.txt.replace("\n", " / ") + "», категория «" + tile.cat + "»");
  ok(same(cats, ["Ножки и опоры", "Подстолья", "Рейлы", "Другое"]), "категории по порядку: " + cats.join(" / "));
  const labels = await page.$$eval("#controls .row > span:first-child", (s) => s.map((x) => x.textContent));
  ok(same(labels, ["Длина", "Ширина", "Высота", "Профиль", "Отступ отверстий мин", "Отступ отверстий макс", "Количество отверстий", "Высота отверстий к стене"]), "подписи полей: " + labels.join(", "));
  const opts = await page.$$eval('#controls [data-key="profile"] option', (o) => o.map((x) => x.textContent.replace(" мм", "")));
  ok(["20×20", "25×25", "30×30", "40×40", "40×20"].every((o) => opts.includes(o)), "профили: " + opts.join(", "));
  let L = await last();
  const P = L.params;
  ok(P.W === 780 && P.D === 300 && P.H === 300 && P.profile === "20x20" && P.hmin === 75 && P.hmax === 85 && P.n === 4 && P.hh === 100, "умолчания 780×300×300, 20×20, отступ 75–85, 4 отверстия, 100 к стене: " + JSON.stringify(P));
  const good = async (m, box) => { const l = await last(), ov = await page.getAttribute("#checks", "data-overlap"), so = await page.getAttribute("#checks", "data-solid");
    ok(l.solid.ok && l.solid.solids === 1 && l.solid.valid && l.solid.watertight && l.solid.bboxOK && ov === "OK" && so === "OK" && (!box || l.bbox.join("×") === box.join("×")), `${m}: 1 тело, габарит ${l.bbox.join("×")}${box ? " = Длина×Ширина×Высота" : ""}, пересечения ${ov}, тело ${so}, ${l.ms} мс`); return l; };
  await good("умолчания", [780, 300, 300]);
  const body = await page.evaluate(() => document.body.innerText), chk = await page.evaluate(() => window.__checks);
  ok(!/Проверка пересечений|Расположение подобрано|Тело: |герметичн|отрезков, поля/.test(body) && (await page.isHidden("#info")) && chk.overlap === "OK" && chk.solid === "OK", "отчёт о проверках не виден в интерфейсе, window.__checks OK");
  const dl = await page.$$eval("#downloads button, .downloads button, button[id^=dl-]", (b) => b.map((x) => x.textContent.trim()));
  ok(["Скачать PNG", "Скачать PDF", "Скачать STL"].every((t) => dl.includes(t)) && !dl.some((t) => /SVG|STEP/i.test(t)), "кнопки выгрузки: " + dl.join(", "));
  // чертёж: подписи по фото
  let tx = await texts();
  const cnt = (s) => tx.filter((t) => t === s).length;
  ok(tx.includes("Тумба кух.") && tx.includes("Чертеж в изометрической проекции") && tx.includes("Длина 780 × Ширина 300 × Высота 300 мм") && tx.includes("Профиль 20×20 мм") && !tx.some((t) => /IKEA/i.test(t)), "заголовок, «Чертеж в изометрической проекции», размеры, профиль: " + tx.slice(0, 5).join(" | "));
  ok(cnt("780 мм") === 1 && cnt("75 мм") === 2 && cnt("210 мм") === 5 && cnt("180 мм") === 2, "верхняя цепочка: 780 над 75/210/210/210/75 и нижняя 180/210/210/180");
  ok(cnt("300 мм") === 2 && cnt("150 мм") === 2 && cnt("100 мм") === 1, "слева 300 + 150/150, справа 300 + 100: " + tx.filter((t) => /мм$/.test(t) && !/×/.test(t)).join(" "));
  ok(tx.filter((t) => /^[\d.]+ мм$/.test(t)).length === 15, "всего размеров: 15 (780+5, 300+2, 300+1, 4 снизу)");
  const svgInfo = await page.$eval("#view svg", (s) => ({ holes: s.querySelectorAll("#holes polyline").length, geo: s.querySelectorAll("#geometry polyline").length, bg: s.querySelector("rect").getAttribute("fill"), fills: [...s.querySelectorAll("*")].filter((e) => /^(#?[0-9a-f]{3,6}|grey|gray)$/i.test(e.getAttribute("fill") || "") && !/^(#fff|#ffffff|#000|#000000)$/i.test(e.getAttribute("fill"))).length }));
  ok(svgInfo.holes === 4 * 2 + 3 * 2 + 2 + 2 && svgInfo.geo > 20 && svgInfo.bg === "#fff" && svgInfo.fills === 0, `SVG: белый фон, без серых заливок, ${svgInfo.geo} линий модели и ${svgInfo.holes} окружностей Ø5 (4+4 сверху, 3+3 промежуточных, 2 боковых, 2 на стойках)`);
  // другие параметры: подбор отступа и шага, профили, число отверстий
  const cases = [
    { v: { W: 1000, n: 5 }, e: 80, s: 210},                  // 80 + 4·210 + 80
    { v: { W: 755, n: 4 }, e: 85, s: 195 },                                                // e перебирается от минимума вверх
    { v: { W: 752, n: 4 }, e: 76, s: 200 },                                                // прогон 2
    { v: { W: 757, n: 4 }, e: 78.5, s: 200 },                                              // прогон 3
  ];
  for (const c of cases) {
    for (const [k, v] of Object.entries({ W: 780, n: 4, ...c.v })) await set(k, v);
    await wait((l, a) => l.params.W === a.W && l.params.n === a.n, { W: c.v.W, n: c.v.n });
    await page.waitForTimeout(200);
    await good(`Длина ${c.v.W}, ${c.v.n} отв.`, [c.v.W, 300, 300]);
    tx = await texts();
    ok(tx.includes(`Отверстия Ø5: ${c.v.n} шт., отступ ${c.e} мм, шаг ${c.s} мм`) && tx.includes(`${c.e} мм`) && tx.includes(`${c.s} мм`), `  отступ ${c.e}, шаг ${c.s} (подпись и размерные линии обновились)`);
  }
  await set("W", 780); await set("n", 4); await wait((l) => l.params.W === 780 && l.params.n === 4);
  for (const [W, D, H, pr] of [[1200, 400, 500, "40x40"], [600, 250, 350, "30x20"], [2000, 600, 800, "50x25"], [500, 800, 200, "25x25"]]) {
    await page.selectOption('#controls [data-key="profile"] select', pr); await set("W", W); await set("D", D); await set("H", H);
    await wait((l, a) => l.params.W === a[0] && l.params.D === a[1] && l.params.H === a[2] && l.params.profile === a[3], [W, D, H, pr]);
    await page.waitForTimeout(200);
    const l = await good(`${W}×${D}×${H}, ${pr}`, [W, D, H]);
    tx = await texts(); const lab = pr.replace("x", "×");
    ok(tx.includes(`Профиль ${lab} мм`) && tx.includes(`${W} мм`) && tx.includes(`${D} мм`) && tx.includes(`${H} мм`) && tx.includes(`${l.params.hh} мм`), `  подписи обновились (профиль ${lab}, ${W}/${D}/${H}, высота отверстия ${l.params.hh})`);
  }
  // недопустимое
  await page.selectOption('#controls [data-key="profile"] select', "20x20"); await set("W", 780); await set("D", 300); await set("H", 300);
  await wait((l) => l.params.W === 780 && l.params.D === 300 && l.params.H === 300 && l.params.profile === "20x20");
  await set("hh", 5); await wait((l) => l.params.hh > 5 && l.params.hh < 100);
  L = await good("высота отверстий к стене 5 → допустимый минимум", null);
  ok(L.params.hh >= 28 && (await warns()).length > 0, `  предупреждение вместо падения: hh=${L.params.hh}; ` + (await warns()).join(" | "));
  await set("hh", 100); await wait((l) => l.params.hh === 100);
  await set("hmin", 90); await set("hmax", 80); await wait((l) => l.params.hmin === 90 && l.params.hmax === 90);
  L = await good("отступ мин 90 > макс 80 → макс = 90", null);
  ok((await warns()).length > 0, "  предупреждение: " + (await warns()).join(" | "));
  await set("hmin", 75); await set("hmax", 85); await wait((l) => l.params.hmin === 75 && l.params.hmax === 85);
  await set("n", 12); await wait((l) => l.params.n === 7);
  await page.waitForTimeout(300); L = await good("12 отверстий при Длине 780: шаг < 100 мм → число уменьшено до наибольшего с шагом ≥ 100 (7: отступ 75, шаг 105)", [780, 300, 300]);
  ok((await warns()).length > 0 && L.params.n === 7 && (await page.inputValue('#controls [data-key="n"] input[type=number]')) === "7", `  n=${L.params.n}, поле ввода обновлено; ` + (await warns()).join(" | "));
  await set("n", 3); await wait((l) => l.params.n === 3); await good("3 отверстия", [780, 300, 300]);
  await set("W", 99999); await wait((l) => l.params.W === 3000);
  ok((await page.inputValue('#controls [data-key="W"] input[type=number]')) === "3000", "Длина 99999 ограничена максимумом 3000");
  await set("H", 5); await wait((l) => l.params.H === 150);
  await good("высота 5 → 150", null);
  // сброс и PNG
  await page.click("#reset"); await wait((l) => l.params.W === 780 && l.params.D === 300 && l.params.H === 300 && l.params.n === 4 && l.params.hh === 100 && l.params.profile === "20x20");
  await good("сброс", [780, 300, 300]);
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("#dl-png")]); const p = "/tmp/dl_" + d.suggestedFilename(); await d.saveAs(p);
  const png = fs.readFileSync(p), pw = png.readUInt32BE(16), ph = png.readUInt32BE(20);
  ok(png.subarray(1, 4).toString() === "PNG" && ph === 1280 && png.length > 20000, `PNG: ${p} (${pw}×${ph}, ${png.length} байт)`);
  if (process.env.PNG_OUT) { fs.copyFileSync(p, process.env.PNG_OUT); console.log("PNG:", process.env.PNG_OUT); }
  if (process.env.SHOT) { await page.waitForTimeout(300); await page.screenshot({ path: process.env.SHOT }); console.log("скриншот:", process.env.SHOT); }
  ok(errs.length === 0, "нет ошибок в консоли" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));
} finally { await browser.close(); srv?.kill(); }
if (fails.length) { console.error("ПРОВАЛЕНО:", fails); process.exit(1); } console.log("ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ"); process.exit(0);
