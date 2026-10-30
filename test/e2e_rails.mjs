// E2E рейлов В006-2 и В004 (desktop + Pixel 7): подписи, умолчания 1500×800×400 (Высота × Ширина × Глубина), ограничения диапазонов, профиль, цельное тело, PNG (1280)/PDF/STL,
//   отчёт о проверках не показан (только window.__checks).   node test/e2e_rails.mjs   (URL=https://… — живой сайт;  SHOT_DIR=каталог — скриншоты live_<арт>.png, PNG_DIR=каталог — скачанные PNG)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4178, URL_ = process.env.URL || `http://localhost:${PORT}/`;
let srv; if (!process.env.URL) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r) => srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r())); }
const browser = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [];
const SHOT_DIR = process.env.SHOT_DIR, PNG_DIR = process.env.PNG_DIR || "/tmp";
try {
  for (const [name, opts] of [["desktop", { viewport: { width: 1500, height: 950 }, acceptDownloads: true }], ["mobile", { ...devices["Pixel 7"], acceptDownloads: true }]]) {
    for (const [id, title, extraMin] of [["V006-2", "Рейл \u0412006-2"], ["V004", "Рейл \u0412004"]]) {
      const ctx = await browser.newContext(opts), page = await ctx.newPage(), errs = [], tag = `${name} ${id}`;
      const ok = (c, m) => { console.log(tag, c ? "PASS" : "FAIL", m); if (!c) fails.push(tag + ": " + m); };
      page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
      await page.goto(URL_); await page.waitForSelector("#view svg", { timeout: 120000 });
      const last = () => page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__configurator.last, svg: undefined })));
      const wait = (pred, arg) => page.waitForFunction(`(() => { const l = window.__configurator.last; return !!l && (${pred})(l, ${JSON.stringify(arg)}); })()`, null, { timeout: 60000 });
      const texts = () => page.$$eval("#view [data-text]", (e) => e.map((x) => x.dataset.text));
      const warns = () => page.$$eval("#warnings li", (l) => l.map((x) => x.textContent));
      const set = async (key, v) => { await page.fill(`#controls [data-key="${key}"] input[type=number]`, String(v)); await page.dispatchEvent(`#controls [data-key="${key}"] input[type=number]`, "change"); };
      await page.click(`#tiles .tile[data-article="${id}"]`); await wait((l, a) => l.article === a, id);
      const labels = await page.$$eval("#controls .row > span:first-child", (s) => s.map((x) => x.textContent));
      ok(JSON.stringify(labels) === JSON.stringify(["Высота", "Ширина", "Глубина", "Профиль", "Цвет"]), "подписи: " + labels.join(", "));
      let L = await last();
      ok(L.params.H === 1500 && L.params.W === 800 && L.params.D === 400 && L.params.profile === "25x25" && L.bbox.join() === "800,400,1500", "умолчания Высота 1500, Ширина 800, Глубина 400, профиль 25×25: bbox " + L.bbox.join("×"));
      const tx = await texts(); console.log(tag, "texts:", tx.join(" | "));
      ok(tx.includes(title) && tx.includes("Профиль 25×25 мм") && tx.includes("Высота: 1500 мм") && tx.includes("Ширина: 800 мм") && tx.includes("Глубина: 400 мм"), "блок текста: " + tx.slice(0, 6).join(" | "));
      const checks = async (m) => { const c = await page.evaluate(() => window.__checks), l = await last(); ok(c.overlap === "OK" && c.solid === "OK" && l.solid.ok && l.solid.solids === 1 && l.solid.bboxOK && (await page.getAttribute("#checks", "data-overlap")) === "OK", `${m}: проверки OK, одно тело, bbox ${l.bbox.join("×")}`); return l; };
      await checks("умолчания");
      const body = await page.evaluate(() => document.body.innerText);
      ok(!/Проверка пересечений|Расположение подобрано|Тело: |герметичн|отрезков, поля/.test(body) && (await page.isHidden("#info")), "отчёт о проверках не виден");
      // диапазоны
      await set("H", 99999); await wait((l) => l.params.H === 2200); ok((await warns()).some((w) => /Высота/.test(w)) && (await page.inputValue('#controls [data-key="H"] input[type=number]')) === "2200", "Высота 99999 → 2200 + предупреждение: " + (await warns()).join(" | "));
      await set("W", 10); await wait((l) => l.params.W === 300 && l.solid.ok); ok((await warns()).some((w) => /Ширина/.test(w)), "Ширина 10 → 300 + предупреждение"); await checks("H=2200, W=300");
      await set("D", 5000); await wait((l) => l.params.D === 1000 && l.solid.ok); await checks("D=1000");
      await set("H", 1800); await set("W", 1000); await set("D", 500); await wait((l) => l.params.H === 1800 && l.params.W === 1000 && l.params.D === 500 && l.solid.ok);
      L = await checks("1800×1000×500"); ok(L.bbox.join() === "1000,500,1800" && (await texts()).includes("Ширина: 1000 мм"), "размеры на чертеже обновились");
      await page.selectOption('#controls [data-key="profile"] select', "40x40"); await wait((l) => l.params.profile === "40x40" && l.solid.ok);
      ok((await texts()).some((t) => /^Профиль 40×40/.test(t)), "профиль 40×40 в блоке"); await checks("профиль 40×40");
      // скачивание
      const dl = async (sel) => { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click(sel)]); const p = `${PNG_DIR}/${id}_${name}_${d.suggestedFilename()}`; await d.saveAs(p); return [p, d.suggestedFilename()]; };
      const [pp, pn] = await dl("#dl-png"), png = fs.readFileSync(pp), Wd = await page.evaluate(() => window.__configurator.last.W), Hd = await page.evaluate(() => window.__configurator.last.H);
      ok(png.readUInt32BE(20) === 1280 && png.readUInt32BE(16) === Math.round(Wd * 1280 / Hd) && png.length > 10000, `PNG ${pn}: ${png.readUInt32BE(16)}×${png.readUInt32BE(20)} (чертёж ${Wd}×${Hd})`);
      const [pdf, pdn] = await dl("#dl-pdf"); ok(fs.readFileSync(pdf).subarray(0, 4).toString() === "%PDF", `PDF ${pdn}`);
      const [stl, sn] = await dl("#dl-stl"); ok(fs.statSync(stl).size > 1500, `STL ${sn}: ${fs.statSync(stl).size} байт`);
      await page.click("#reset"); await wait((l) => l.params.H === 1500 && l.params.W === 800 && l.params.D === 400 && l.params.profile === "25x25" && l.solid.ok);
      ok(errs.length === 0, "ошибок консоли нет " + errs.join(" | "));
      if (SHOT_DIR && name === "desktop") await page.screenshot({ path: `${SHOT_DIR}/live_${id}.png` });
      await ctx.close();
    }
  }
} finally { await browser.close(); srv?.kill(); }
console.log(fails.length ? "FAILS: " + fails.join("; ") : "ALL PASS"); process.exit(fails.length ? 1 : 0);
