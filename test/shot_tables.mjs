// вкладка «Столы»: аккордеон, карточки ножек, окрашивание, скачивание: node test/shot_tables.mjs [URL]  -> OUT (по умолчанию /workspace/orders/stoly)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4182, URL_ = process.argv[2] || `http://localhost:${PORT}/`, OUT = process.env.OUT || "/workspace/orders/stoly";
let srv; if (!process.argv[2]) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r) => srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r())); }
const b = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [], ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails.push(m); };
const wait = (p, f, a) => p.waitForFunction(f, a, { timeout: 90000 });
for (const [name, o] of [["desktop", { viewport: { width: 1500, height: 950 }, acceptDownloads: true }], ["mobile", { ...devices["Pixel 7"], acceptDownloads: true }]]) {
  const ctx = await b.newContext(o), p = await ctx.newPage(), errs = [];
  p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(URL_); await p.waitForSelector("#view svg", { timeout: 120000 }); await wait(p, () => window.__configurator.last?.article === "H031");
  await p.click('.tab[data-tab="tables"]'); await wait(p, () => window.__configurator.last?.article === "TABLE_H098");
  const st = () => p.$$eval("details.acc", (d) => d.map((x) => x.dataset.acc + ":" + x.open).join(","));
  ok(await st() === "top:true,legs:false", `${name}: по умолчанию открыт блок «Столешница»: ${await st()}`);
  await p.click('details.acc[data-acc="top"] .sw[data-v="705_moreny_dub"]'); await p.click('details.acc[data-acc="top"] [data-key="texture"] input'); await wait(p, () => window.__configurator.last?.params.tone === "705_moreny_dub" && window.__configurator.last?.params.texture);
  await p.click('details.acc[data-acc="legs"] summary'); await p.waitForTimeout(150);
  ok(await st() === "top:false,legs:true", `${name}: открыт «Ножки», «Столешница» закрыт: ${await st()}`);
  await p.click('details.acc[data-acc="legs"] summary'); await p.waitForTimeout(100);
  ok(await st() === "top:false,legs:true", `${name}: повторный щелчок не закрывает единственный открытый блок`);
  const n = await p.$$eval(".leg-tiles .tile", (t) => t.map((x) => x.textContent.trim()).join(" | ")); ok((await p.$$(".leg-tiles .tile")).length === 10, `${name}: 10 карточек ножек: ${n}`);
  ok(!(await p.$('details.acc[data-acc="legs"] [data-key="leg_W"]')) && !!(await p.$('[data-key="offW"]')) && !!(await p.$('[data-key="offL"]')) && !!(await p.$('[data-key="paint"]')), `${name}: Ширина ножки заменена отступами, есть «Окрашивание»`);
  await p.screenshot({ path: `${OUT}/ui_${name}_stoly_nozhki.png`, fullPage: name === "mobile" });
  await p.click('.leg-tiles .tile[data-article="TABLE_SHP3"]'); await wait(p, () => window.__configurator.last?.article === "TABLE_SHP3");
  ok(await p.evaluate(() => window.__configurator.last.params.tone) === "705_moreny_dub" && await st() === "top:false,legs:true", `${name}: смена ножек сохраняет столешницу и открытый блок`);
  ok(await p.$eval("#view svg", (s) => !s.querySelector("#paint") && !!s.querySelector('[data-text="Цвет ножек: Черный"]')), `${name}: по умолчанию без окрашивания — белые, в тексте «Цвет ножек: Черный»`);
  await p.click('[data-key="paint"] input'); await wait(p, () => window.__configurator.last?.params.paint === true);
  ok(await p.$eval("#view svg", (s) => !!s.querySelector("#paint path")), `${name}: с окрашиванием — ножки залиты`);
  await p.click("#reset"); await wait(p, () => window.__configurator.last?.params.paint === false && window.__configurator.last?.params.legColor === "Черный");
  ok(true, `${name}: «Сбросить» — Черный, без окрашивания`);
  if (name === "desktop") {
    for (const btn of ["#dl-png", "#dl-pdf", "#dl-stl"]) { const [d] = await Promise.all([p.waitForEvent("download", { timeout: 90000 }), p.click(btn)]); const f = `/tmp/${d.suggestedFilename()}`; await d.saveAs(f); ok(fs.statSync(f).size > 1000, `${name}: ${d.suggestedFilename()} ${fs.statSync(f).size} байт`); }
  }
  for (const id of ["TABLE_H031", "TABLE_H050", "TABLE_H028", "TABLE_0106", "TABLE_0090", "TABLE_H105", "TABLE_H114", "TABLE_H098", "TABLE_YOZH"]) {
    await p.click(`.leg-tiles .tile[data-article="${id}"]`); await wait(p, (a) => window.__configurator.last?.article === a, id);
    const c = await p.evaluate(() => window.__checks); ok(c.solid === "OK" && c.overlap === "OK", `${name}: ${id} тело ${c.solid}, текст ${c.overlap}`);
  }
  await p.click('.tab[data-tab="legs"]'); await wait(p, () => window.__configurator.last?.article === "H031"); ok(true, `${name}: назад в «Ножки»`);
  ok(errs.length === 0, `${name}: ошибок консоли нет ${errs.join(" | ")}`);
  await ctx.close();
}
await b.close(); srv?.kill();
console.log(fails.length ? "FAILS" : "ALL PASS"); process.exit(fails.length ? 1 : 0);
