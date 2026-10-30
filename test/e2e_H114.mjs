// E2E H114 (подстолье целиком; desktop + Pixel 7): подписи, «Длина», «Отступ от края» (min 0 / max = ⌊(Ширина − 2a − 20)/2⌋ + русские предупреждения), цельное тело, PNG/PDF/STL.
//   node test/e2e_H114.mjs  (URL=https://… — живой сайт;  SHOT=файл — скриншот десктопа после сброса)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4177, URL_ = process.env.URL || `http://localhost:${PORT}/`;
let srv; if (!process.env.URL) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r) => srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r())); }
const browser = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [];
for (const [name, opts] of [["desktop", { viewport: { width: 1500, height: 950 }, acceptDownloads: true }], ["mobile", { ...devices["Pixel 7"], acceptDownloads: true }]]) {
  const ctx = await browser.newContext(opts), page = await ctx.newPage(), errs = [];
  const ok = (c, m) => { console.log(name, c ? "PASS" : "FAIL", m); if (!c) fails.push(name + ": " + m); };
  page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(URL_ + "#H114"); await page.waitForSelector("#view svg", { timeout: 120000 });
  const last = () => page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__configurator.last, svg: undefined })));
  const wait = (pred, arg) => page.waitForFunction(`(() => { const l = window.__configurator.last; return !!l && (${pred})(l, ${JSON.stringify(arg)}); })()`, null, { timeout: 60000 });
  const texts = () => page.$$eval("#view [data-text]", (e) => e.map((x) => x.dataset.text));
  const warns = () => page.$$eval("#warnings li", (l) => l.map((x) => x.textContent));
  const set = async (key, v) => { await page.fill(`#controls [data-key="${key}"] input[type=number]`, String(v)); await page.dispatchEvent(`#controls [data-key="${key}"] input[type=number]`, "change"); };
  await page.click('#tiles .tile[data-article="H114"]'); await wait((l) => l.article === "H114");
  const labels = await page.$$eval("#controls .row > span:first-child", (s) => s.map((x) => x.textContent));
  ok(JSON.stringify(labels) === JSON.stringify(["Длина", "Ширина", "Высота", "Отступ от края", "Профиль", "Цвет"]), "подписи: " + labels.join(", "));
  let L = await last();
  ok(L.params.L === 1600 && L.params.W === 710 && L.params.H === 710 && L.params.S === 100 && L.params.profile === "60x30" && L.bbox.join() === "1600,710,710", "умолчания 1600×710×710, отступ 100, профиль 60×30: " + JSON.stringify(L.params));
  const solidOK = async (m) => { const l = await last(); ok(l.solid.ok && l.solid.solids === 1 && l.solid.bboxOK && (await page.textContent('[data-check="overlap"]')) === "OK", `${m}: одно тело, габариты ${l.bbox.join("×")}, пересечений текста нет`); return l; };
  await solidOK("умолчания");
  ok((await texts()).includes("Отступ от края: 100 мм") && (await texts()).includes("Длина: 1600 мм"), "блок текста: «Длина: 1600 мм», «Отступ от края: 100 мм»");
  // Длина
  await set("L", 2000); await wait((l) => l.params.L === 2000 && l.solid.ok);
  L = await solidOK("Длина=2000"); ok((await texts()).includes("Длина: 2000 мм") && L.bbox[0] === 2000, "Длина 2000 на чертеже, габарит по X = 2000");
  await set("L", 100); await wait((l) => l.params.L === 600 && l.warnings.length > 0);
  ok(/Длина/.test((await warns()).join("")) && (await page.inputValue('#controls [data-key="L"] input[type=number]')) === "600", "Длина=100 → 600 + предупреждение: " + (await warns()).join(" | "));
  await set("L", 1600); await wait((l) => l.params.L === 1600);
  // Отступ: 0 (балки вровень с краями)
  await set("S", 0); await wait((l) => l.params.S === 0 && l.solid.ok); await solidOK("Отступ=0");
  await set("S", -20); await page.waitForTimeout(700); await wait((l) => l.params.S === 0);
  ok((await warns()).some((w) => /Отступ от края/.test(w)) && (await page.inputValue('#controls [data-key="S"] input[type=number]')) === "0", "Отступ=−20 → 0 + предупреждение: " + (await warns()).join(" | "));
  // максимум: W=710, профиль 60×30 → ⌊(710 − 120 − 20)/2⌋ = 285; зазор между балками 20 мм
  await set("S", 285); await wait((l) => l.params.S === 285 && l.solid.ok);
  ok((await warns()).length === 0, "Отступ=285 (максимум при Ширина 710, 60×30) допустим без предупреждений"); await solidOK("Отступ=285");
  await set("S", 300); await wait((l) => l.params.S === 285 && l.warnings.length > 0);
  ok(/Отступ от края.*285/.test((await warns()).join("")) && (await page.inputValue('#controls [data-key="S"] input[type=number]')) === "285", "Отступ=300 → 285 + предупреждение: " + (await warns()).join(" | ")); await solidOK("Отступ=300→285");
  // уменьшили ширину — максимум стал меньше: W=400 → ⌊(400 − 120 − 20)/2⌋ = 130
  await set("W", 400); await wait((l) => l.params.W === 400 && l.params.S === 130 && l.solid.ok);
  ok(/Отступ от края.*285 → 130/.test((await warns()).join("")), "Ширина=400 → отступ 285 → 130: " + (await warns()).join(" | ")); await solidOK("Ширина=400");
  // другой профиль: 80×40, W=710 → ⌊(710 − 160 − 20)/2⌋ = 265
  await set("W", 710); await wait((l) => l.params.W === 710); await set("S", 285); await wait((l) => l.params.S === 285);
  await page.selectOption('#controls [data-key="profile"] select', "80x40"); await wait((l) => l.params.profile === "80x40" && l.params.S === 265 && l.solid.ok);
  ok(/Отступ от края.*265/.test((await warns()).join("")), "профиль 80×40 → отступ 285 → 265: " + (await warns()).join(" | ")); await solidOK("профиль 80×40");
  ok((await texts()).some((t) => /^Профиль 80×40/.test(t)), "строка профиля обновилась");
  // скачивание PNG (высота 1280), PDF, STL
  const dl = async (sel) => { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click(sel)]); const p = `/tmp/h114_dl_${name}_${d.suggestedFilename()}`; await d.saveAs(p); return [p, d.suggestedFilename()]; };
  const [pp, pn] = await dl("#dl-png"), png = fs.readFileSync(pp), Wd = await page.evaluate(() => window.__configurator.last.W), Hd = await page.evaluate(() => window.__configurator.last.H);
  ok(png.readUInt32BE(20) === 1280 && png.readUInt32BE(16) === Math.round(Wd * 1280 / Hd) && png.length > 15000, `PNG ${pn}: ${png.readUInt32BE(16)}×${png.readUInt32BE(20)} (чертёж ${Wd}×${Hd})`);
  const [pdf, pdn] = await dl("#dl-pdf"); ok(fs.readFileSync(pdf).subarray(0, 4).toString() === "%PDF", `PDF ${pdn}`);
  const [stl, sn] = await dl("#dl-stl"); ok(fs.statSync(stl).size > 3000, `STL ${sn}: ${fs.statSync(stl).size} байт`);
  // сброс
  await page.click("#reset"); await wait((l) => l.params.S === 100 && l.params.profile === "60x30" && l.params.W === 710 && l.solid.ok);
  ok(errs.length === 0, "ошибок консоли нет " + errs.join(" | "));
  await page.screenshot({ path: process.env.SHOT && name === "desktop" ? process.env.SHOT : `/tmp/h114_${name}.png`, fullPage: name === "mobile" });
  await ctx.close();
}
await browser.close(); srv?.kill();
console.log(fails.length ? "FAILS: " + fails.join("; ") : "ALL PASS"); process.exit(fails.length ? 1 : 0);
