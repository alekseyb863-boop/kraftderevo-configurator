// E2E H027-1 (desktop + Pixel 7): подписи, A/B/C/H, русские предупреждения.  node test/e2e_H027-1.mjs  (URL=https://… — проверить живой сайт)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = "/workspace/kraftderevo/configurator_v2", PORT = 4175, URL = process.env.URL || `http://localhost:${PORT}/`;
let srv; if (!process.env.URL) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r) => srv.stdout.on("data", (d) => /localhost/.test(String(d)) && r())); }
const chrome = fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined;
const browser = await chromium.launch({ executablePath: chrome, args: ["--no-sandbox"] });
const fails = [];
for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1500, height: 950 } }], ["mobile", { ...devices["Pixel 7"] }]]) {
  const ctx = await browser.newContext(ctxOpts), page = await ctx.newPage(), errs = [];
  page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(URL + "#H027-1"); await page.waitForSelector("#view svg", { timeout: 120000 });
  const last = () => page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__configurator.last, svg: undefined })));
  const wait = (pred, arg) => page.waitForFunction(`(() => { const l = window.__configurator.last; return !!l && (${pred})(l, ${JSON.stringify(arg)}); })()`, null, { timeout: 60000 });
  const texts = () => page.$$eval("#view [data-text]", (e) => e.map((x) => x.dataset.text));
  await page.click('#tiles .tile[data-article="H027-1"]'); await wait((l) => l.article === "H027-1");
  const labels = await page.$$eval("#controls .row > span:first-child", (s) => s.map((x) => x.textContent));
  const ok = (c, m) => { console.log(name, c ? "PASS" : "FAIL", m); if (!c) fails.push(name + ": " + m); };
  ok(JSON.stringify(labels.slice(0, 4)) === JSON.stringify(["Ширина верха", "Ширина низа", "Глубина", "Высота"]), "подписи: " + labels.join(", "));
  const set = async (key, v) => { await page.fill(`#controls [data-key="${key}"] input[type=number]`, String(v)); await page.dispatchEvent(`#controls [data-key="${key}"] input[type=number]`, "change"); };
  for (const [key, v, expectText] of [["WT", 700, "700 мм"], ["WB", 420, "420 мм"], ["D", 300, "300 мм"], ["H", 800, "800 мм"]]) {
    await set(key, v); await wait((l, a) => l.params[a[0]] === a[1] && l.solid.ok, [key, v]);
    const tx = await texts(), L = await last();
    ok(tx.includes(expectText) || tx.some((t) => t.endsWith(": " + expectText)), `${key}=${v}: размер на чертеже; bbox ${L.bbox.join("×")}; solids=${L.solid.solids}; overlap=${await page.textContent('[data-check="overlap"]')}`);
  }
  // невозможные значения -> русские предупреждения
  await set("D", 30); await wait((l) => l.params.D === 60 && l.warnings.length > 0);
  let w = await page.$$eval("#warnings li", (l) => l.map((x) => x.textContent)); ok(w.length > 0 && /[А-Яа-я]/.test(w.join("")), "D=30 → " + w.join(" | "));
  await set("D", 252); await wait((l) => l.params.D === 252); await set("WB", 1000); await wait((l) => l.params.WB === l.params.WT && l.warnings.length > 0);
  w = await page.$$eval("#warnings li", (l) => l.map((x) => x.textContent)); ok(w.length > 0 && /[А-Яа-я]/.test(w.join("")), "WB=1000 → " + w.join(" | "));
  await set("WT", 300); await set("D", 800); await page.waitForTimeout(1500);
  w = await page.$$eval("#warnings li", (l) => l.map((x) => x.textContent)); const L2 = await last(); ok(L2.solid.ok, "WT=300 D=800 → params " + JSON.stringify([L2.params.WT, L2.params.WB, L2.params.D]) + " | " + w.join(" | "));
  // reset to defaults, screenshot
  await page.reload(); await page.waitForSelector("#view svg", { timeout: 120000 }); await wait((l) => l.article === "H027-1" && l.params.WT === 602);
  ok(errs.length === 0, "ошибок консоли нет " + errs.join(" | "));
  await page.screenshot({ path: process.env.SHOT && name === "desktop" ? process.env.SHOT : `/tmp/n027_${name}.png`, fullPage: name === "mobile" });
  await ctx.close();
}
await browser.close(); srv?.kill();
console.log(fails.length ? "FAILS: " + fails.join("; ") : "ALL PASS"); process.exit(fails.length ? 1 : 0);
