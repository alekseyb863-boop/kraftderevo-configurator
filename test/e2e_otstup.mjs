// «Столы»: умолчание отступов ножек при живом крае слэба — 50 мм; ручное значение не перезаписывается; «Сбросить» — по той же логике.
//   node test/e2e_otstup.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4185;
const srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" });
await new Promise((r) => srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r()));
const b = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [], ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails.push(m); };
for (const [name, o] of [["desktop", { viewport: { width: 1500, height: 950 } }], ["mobile", { ...devices["Pixel 7"] }]]) {
  const p = await (await b.newContext(o)).newPage(), errs = [];
  p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const last = (f, a) => p.waitForFunction(f, a, { timeout: 90000 });
  const off = () => p.evaluate(() => { const q = window.__configurator.last.params; return `${q.offW}/${q.offL}`; });
  const inp = (k) => p.$eval(`[data-key="${k}"] input[type=number]`, (i) => i.value);
  const top = 'details.acc[data-acc="top"]', legs = 'details.acc[data-acc="legs"]';
  const open = async (sel) => { if (!(await p.$eval(sel, (d) => d.open))) { await p.click(`${sel} summary`); await p.waitForTimeout(150); } };
  const params = (f) => last(f);
  await p.goto(`http://localhost:${PORT}/#tables`); await p.waitForSelector("#view svg", { timeout: 120000 });
  await last(() => window.__configurator.last?.article === "TABLE_H098");
  ok(await off() === "0/0", `${name}: по умолчанию (дерево) отступы 0/0`);
  await open(top); await p.selectOption(`${top} [data-key="species"] select`, "Слэб");
  await params(() => window.__configurator.last?.params.species === "Слэб");
  ok(await off() === "50/50", `${name}: слэб с живым краем — отступы 50/50`);
  await open(legs); ok(await inp("offW") === "50" && await inp("offL") === "50", `${name}: поля отступов показывают 50`);
  await p.click(`${legs} .tile[data-article="TABLE_H031"]`); await params(() => window.__configurator.last?.article === "TABLE_H031");
  ok(await off() === "50/50", `${name}: другие ножки — тоже 50/50`);
  await open(top);
  for (const k of ["edgeB", "edgeF"]) await p.click(`${top} [data-key="${k}"] input`);
  await params(() => { const q = window.__configurator.last?.params; return q && !q.edgeB && !q.edgeF; });
  ok(await off() === "0/0", `${name}: все галочки живого края сняты — отступы 0/0`);
  await p.click(`${top} [data-key="edgeF"] input`); await params(() => window.__configurator.last?.params.edgeF);
  ok(await off() === "50/50", `${name}: галочка снова есть — 50/50`);
  // ручное уменьшение до 20 — без предупреждений и не перезаписывается
  await open(legs);
  for (const k of ["offW", "offL"]) { await p.fill(`[data-key="${k}"] input[type=number]`, "20"); await p.press(`[data-key="${k}"] input[type=number]`, "Tab"); }
  await params(() => { const q = window.__configurator.last?.params; return q.offW === 20 && q.offL === 20; });
  ok(await off() === "20/20" && (await p.evaluate(() => window.__configurator.last.warnings.length)) === 0, `${name}: вручную 20/20, без предупреждений`);
  await open(top); await p.click(`${top} [data-key="edgeL"] input`); await params(() => window.__configurator.last?.params.edgeL);
  ok(await off() === "20/20", `${name}: ручные 20/20 не перезаписаны при перерисовке`);
  await p.selectOption(`${top} [data-key="species"] select`, "Дуб"); await params(() => window.__configurator.last?.params.species === "Дуб");
  ok(await off() === "20/20", `${name}: смена на дерево — ручные значения не тронуты`);
  await p.click("#reset"); await params(() => window.__configurator.last?.params.species === "Дуб" && window.__configurator.last.params.offW === 0);
  ok(await off() === "0/0", `${name}: «Сбросить» (дерево) — 0/0`);
  await open(top); await p.selectOption(`${top} [data-key="species"] select`, "Слэб"); await params(() => window.__configurator.last?.params.species === "Слэб");
  ok(await off() === "50/50", `${name}: после сброса снова слэб — 50/50`);
  await p.selectOption(`${top} [data-key="species"] select`, "Камень"); await params(() => window.__configurator.last?.params.species === "Камень");
  ok(await off() === "0/0", `${name}: материал не слэб — 0/0`);
  ok(errs.length === 0, `${name}: ошибок консоли нет ${errs.join(" | ")}`);
}
await b.close(); srv.kill();
console.log(fails.length ? "FAILS" : "ALL PASS"); process.exit(fails.length ? 1 : 0);
