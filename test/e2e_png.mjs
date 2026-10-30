// E2E «Скачать PNG» (desktop + Pixel 7): кнопки SVG/STEP убраны, PNG скачивается, валидный, не пустой, белый фон.
//   node test/e2e_png.mjs  (локально: vite preview на :4176)   |   URL=https://… node test/e2e_png.mjs  (живой сайт)   |   OUT=dir — куда класть скачанные PNG
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4176, URL_ = process.env.URL || `http://localhost:${PORT}/`, OUT = process.env.OUT || "/tmp";
let srv; if (!process.env.URL) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r) => srv.stdout.on("data", (d) => /localhost/.test(String(d)) && r())); }
const browser = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [], ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails.push(m); };
for (const [name, opts] of [["desktop", { viewport: { width: 1500, height: 950 }, acceptDownloads: true }], ["mobile", { ...devices["Pixel 7"], acceptDownloads: true }]]) {
  const ctx = await browser.newContext(opts), page = await ctx.newPage(), errs = [];
  page.on("pageerror", (e) => errs.push(String(e))); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(URL_ + "#H027-1"); await page.waitForSelector("#view svg", { timeout: 120000 });
  await page.waitForFunction(() => window.__configurator.last && window.__configurator.last.article === "H027-1" && !document.getElementById("dl-png").disabled, null, { timeout: 60000 });
  const btns = await page.$$eval(".buttons button", (b) => b.map((x) => x.textContent));
  ok(JSON.stringify(btns) === JSON.stringify(["Скачать PNG", "Скачать PDF", "Скачать STL", "Сбросить"]), `${name}: кнопки: ${btns.join(" | ")}`);
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("#dl-png")]);
  const file = `${OUT}/png_${name}_${d.suggestedFilename()}`; await d.saveAs(file);
  const buf = fs.readFileSync(file), w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), W = await page.evaluate(() => window.__configurator.last.W), H = await page.evaluate(() => window.__configurator.last.H);
  // не пусто: считаем тёмные и белые пиксели на canvas в отдельной странице
  const probe = await ctx.newPage(); await probe.goto("about:blank");
  const st = await probe.evaluate(async (b64) => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let dark = 0, white = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] < 100 && d[i + 3] > 200) dark++; if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250 && d[i + 3] === 255) white++; } return { dark, white, total: d.length / 4, corner: Array.from(d.slice(0, 4)) }; }, buf.toString("base64"));
  ok(buf.subarray(1, 4).toString() === "PNG" && w === Math.round(W * 2.5) && h === Math.round(H * 2.5), `${name}: файл ${d.suggestedFilename()} ${w}×${h} (чертёж ${W}×${H} ×2.5), ${buf.length} байт`);
  ok(st.dark > 5000 && st.white / st.total > 0.9 && st.corner.join() === "255,255,255,255", `${name}: не пустой: тёмных пикселей ${st.dark}, белых ${(100 * st.white / st.total).toFixed(1)}%, фон белый непрозрачный`);
  ok(errs.length === 0, `${name}: ошибок консоли нет ${errs.join(" | ")}`);
  await page.screenshot({ path: `${OUT}/page_${name}.png` });
  await ctx.close();
}
await browser.close(); srv?.kill();
console.log(fails.length ? "FAILS" : "ALL PASS"); process.exit(fails.length ? 1 : 0);
