// скриншоты селектора с категориями: node test/shot_categories.mjs [URL]  -> screens/live_categories.png (desktop), screens/live_categories_mobile.png (Pixel 7)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4179, URL_ = process.argv[2] || `http://localhost:${PORT}/`;
let srv; if (!process.argv[2]) { srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" }); await new Promise((r) => srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r())); }
const b = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
fs.mkdirSync(ROOT + "screens", { recursive: true });
for (const [f, o, full] of [["live_categories", { viewport: { width: 1500, height: 950 } }, false], ["live_categories_mobile", { ...devices["Pixel 7"] }, true]]) {
  const p = await (await b.newContext(o)).newPage(); await p.goto(URL_); await p.waitForSelector("#view svg", { timeout: 90000 });
  await p.click('#tiles .tile[data-article="H114"]'); await p.waitForFunction(() => window.__configurator.last?.article === "H114"); await p.waitForTimeout(400);
  await p.screenshot({ path: `${ROOT}screens/${f}.png`, fullPage: full });
}
await b.close(); srv?.kill();
