// скриншоты вкладок (Ножки / Столешницы / Столы) + PNG/PDF/STL столешницы: node test/shot_tabs.mjs [URL]  -> OUT (по умолчанию /workspace/orders/stoleshnica)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4181, URL_ = process.argv[2] || `http://localhost:${PORT}/`, OUT = process.env.OUT || "/workspace/orders/stoleshnica";
let srv; if (!process.argv[2]) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r) => srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r())); }
const b = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [], ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails.push(m); };
for (const [name, o] of [["desktop", { viewport: { width: 1500, height: 950 }, acceptDownloads: true }], ["mobile", { ...devices["Pixel 7"], acceptDownloads: true }]]) {
  const ctx = await b.newContext(o), p = await ctx.newPage(), errs = [];
  p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(URL_); await p.waitForSelector("#view svg", { timeout: 120000 });
  await p.waitForFunction(() => window.__configurator.last?.article === "H031");
  ok(true, `${name}: Ножки по умолчанию, H031 нарисован`);
  await p.click('#tiles .tile[data-article="H098"]'); await p.waitForFunction(() => window.__configurator.last?.article === "H098", null, { timeout: 60000 }); ok(true, `${name}: H098`);
  await p.screenshot({ path: `${OUT}/ui_${name}_nozhki.png`, fullPage: name === "mobile" });
  await p.click('.tab[data-tab="tops"]'); await p.waitForFunction(() => window.__configurator.last?.article === "STOL", null, { timeout: 60000 });
  await p.click('.sw[data-v="705_moreny_dub"]'); await p.waitForFunction(() => window.__configurator.last?.params.tone === "705_moreny_dub", null, { timeout: 60000 });
  ok(await p.$eval("#view svg", (s) => !!s.querySelector("#texture use") && s.querySelector("defs image")), `${name}: текстура в SVG`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/ui_${name}_stoleshnicy.png`, fullPage: name === "mobile" });
  if (name === "desktop") {
    for (const [btn, ext] of [["#dl-png", "png"], ["#dl-pdf", "pdf"], ["#dl-stl", "stl"]]) {
      const [d] = await Promise.all([p.waitForEvent("download", { timeout: 60000 }), p.click(btn)]); const f = `${OUT}/site_${d.suggestedFilename()}`; await d.saveAs(f);
      ok(fs.statSync(f).size >= 684, `${name}: ${d.suggestedFilename()} ${fs.statSync(f).size} байт`);
    }
    await p.check("#show-order"); await p.fill("#order-no", "123/45"); await p.waitForTimeout(800);
    const [d] = await Promise.all([p.waitForEvent("download", { timeout: 60000 }), p.click("#dl-png")]); ok(d.suggestedFilename() === "123_45.png", `${name}: имя по № заказа: ${d.suggestedFilename()}`);
  }
  await p.click('.tab[data-tab="tables"]'); await p.waitForFunction(() => window.__configurator.last?.article === "TABLE_H098", null, { timeout: 60000 });
  ok(await p.isVisible("details.acc"), `${name}: Столы — блоки «Столешница» / «Ножки»`);
  await p.screenshot({ path: `${OUT}/ui_${name}_stoly.png` });
  await p.click('.tab[data-tab="legs"]'); await p.waitForFunction(() => window.__configurator.last?.article === "H098", null, { timeout: 60000 }); ok(true, `${name}: назад в Ножки — H098`);
  ok(errs.length === 0, `${name}: ошибок консоли нет ${errs.join(" | ")}`);
  await ctx.close();
}
await b.close(); srv?.kill();
console.log(fails.length ? "FAILS" : "ALL PASS"); process.exit(fails.length ? 1 : 0);
