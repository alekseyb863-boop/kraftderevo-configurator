// материалы «Камень» (2 тона, без покрытия) и «Слэб» (1 тон, с покрытием, «Живой край»): тон по умолчанию при смене материала, текст без «Тон», текстура на обеих вкладках: node test/e2e_kamen.mjs  -> OUT (/workspace/orders/stoleshnica/kamen)
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium, devices } from "playwright";
const ROOT = new URL("..", import.meta.url).pathname, PORT = 4184, OUT = process.env.OUT || "/workspace/orders/stoleshnica/kamen";
const srv = spawn("node", ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "pipe" });
await new Promise((r) => srv.stdout.on("data", (d) => /Local|localhost/.test(String(d)) && r()));
const b = await chromium.launch({ executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined, args: ["--no-sandbox"] });
const fails = [], ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails.push(m); };
for (const [name, o] of [["desktop", { viewport: { width: 1500, height: 950 } }], ["mobile", { ...devices["Pixel 7"] }]]) {
  const p = await (await b.newContext(o)).newPage(), errs = [];
  p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const last = (f, a) => p.waitForFunction(f, a, { timeout: 90000 });
  const text = () => p.$eval("#view svg", (s) => [...s.querySelectorAll("[data-text]")].map((t) => t.dataset.text).join("|"));
  const vis = (sc) => p.$$eval(`${sc} [data-key="tone"] .sw`, (a) => a.filter((x) => !x.hidden).map((x) => x.dataset.v).join());
  const coatVis = (sc) => p.$eval(`${sc} [data-key="coat"]`, (r) => !r.hidden && r.offsetParent !== null);
  const boxVis = (sc) => p.$eval(`${sc} [data-box="Живой край"]`, (r) => !r.hidden && r.offsetParent !== null);
  const edges = (sc) => p.$$eval(`${sc} [data-box="Живой край"] [data-key]`, (a) => a.map((r) => `${r.dataset.key}:${r.querySelector("input").checked ? 1 : 0}`).join());
  const solidOK = () => p.evaluate(() => { const l = window.__configurator.last; return l.solid.bboxOK && l.solid.valid && window.__checks?.overlap === "OK" && l.check?.ok !== false; });
  const texHref = () => p.$eval("#view svg", (s) => (s.querySelector("defs image")?.getAttribute("href") || "").length);
  await p.goto(`http://localhost:${PORT}/`); await p.waitForSelector("#view svg", { timeout: 120000 });
  for (const [tab, art, sc] of [["tops", "STOL", "#controls"], ["tables", "TABLE_H098", 'details.acc[data-acc="top"]']]) {
    await p.click(`.tab[data-tab="${tab}"]`); await last((a) => window.__configurator.last?.article === a, art);
    if (tab === "tables") { await p.click(`${sc} summary`); await p.waitForTimeout(200); }
    const lab = await p.$eval(`${sc} [data-key="species"] span`, (s) => s.textContent);
    ok(lab === "Материал", `${name}/${tab}: подпись «${lab}»`);
    const t0 = await text(); ok(t0.includes("Материал: Дуб") && t0.includes("Тон: 705 1/2 Дуб") && !t0.includes("Порода"), `${name}/${tab}: по умолчанию «Материал: Дуб», «Тон» есть`);
    ok((await vis(sc)).split(",").length === 12, `${name}/${tab}: у дерева 12 тонов`);
    ok(!(await boxVis(sc)), `${name}/${tab}: у дерева «Живой край» скрыт`);
    ok(await coatVis(sc) && t0.includes("Покрытие: Лак"), `${name}/${tab}: у дерева «Покрытие» видно и на чертеже`);
    await p.selectOption(`${sc} [data-key="coat"] select`, "Масло"); await last(() => window.__configurator.last?.params.coat === "Масло");
    await p.click(`${sc} .sw[data-v="827_oreh"]`); await last(() => window.__configurator.last?.params.tone === "827_oreh");
    await p.selectOption(`${sc} [data-key="species"] select`, "Камень"); await last(() => window.__configurator.last?.params.species === "Камень");
    ok(await vis(sc) === "belyj,temnyj", `${name}/${tab}: у камня 2 тона`);
    ok((await p.$eval(`${sc} [data-key="tone"] b`, (x) => x.textContent)) === "Белый камень" && (await p.evaluate(() => window.__configurator.last.params.tone)) === "belyj", `${name}/${tab}: тон по умолчанию — Белый камень`);
    ok(await p.$$eval(`${sc} [data-key="tone"] .sw:not([hidden]) i`, (a) => a.every((i) => i.style.backgroundImage.includes("tex/kamen/thumb_"))), `${name}/${tab}: миниатюры камня`);
    let t = await text(); ok(t.includes("Материал: Камень") && !t.includes("Тон") && !t.includes("Покрытие"), `${name}/${tab}: «Материал: Камень», без «Тон» и «Покрытие» (Текстура выкл.)`);
    ok(!(await coatVis(sc)), `${name}/${tab}: у камня поле «Покрытие» скрыто`);
    ok(!(await boxVis(sc)), `${name}/${tab}: у камня «Живой край» скрыт`);
    ok(await p.evaluate(() => window.__checks?.overlap ?? "OK") === "OK", `${name}/${tab}: текст не налезает на геометрию`);
    await p.click(`${sc} [data-key="texture"] input`); await last(() => window.__configurator.last?.params.texture);
    ok(await texHref() > 1000, `${name}/${tab}: текстура Белого камня в SVG`);
    if (name === "desktop") { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/ui_${tab}_belyj.png` }); }
    await p.click(`${sc} .sw[data-v="temnyj"]`); await last(() => window.__configurator.last?.params.tone === "temnyj");
    t = await text(); ok(t.includes("Материал: Камень") && !t.includes("Тон") && !t.includes("Покрытие"), `${name}/${tab}: Тёмный камень — текст тот же`);
    ok(await p.evaluate(() => window.__configurator.last.check?.ok !== false), `${name}/${tab}: Тёмный камень — проверка чертежа OK`);
    ok(await texHref() > 1000, `${name}/${tab}: текстура Тёмного камня в SVG`);
    if (name === "desktop") { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/ui_${tab}_temnyj.png` }); }
    await p.selectOption(`${sc} [data-key="species"] select`, "Ясень"); await last(() => window.__configurator.last?.params.species === "Ясень");
    ok((await p.evaluate(() => window.__configurator.last.params.tone)) === "705_12_dub" && (await vis(sc)).split(",").length === 12, `${name}/${tab}: обратно на дерево — тон по умолчанию, 12 тонов`);
    ok(await coatVis(sc) && (await p.$eval(`${sc} [data-key="coat"] select`, (s) => s.value)) === "Масло" && (await text()).includes("Покрытие: Масло"), `${name}/${tab}: обратно на дерево — «Покрытие» снова видно, значение прежнее (Масло)`);
    // слэб: одна текстура «Слэб», «Покрытие» видно и пишется, «Тон» не пишется
    await p.selectOption(`${sc} [data-key="species"] select`, "Слэб"); await last(() => window.__configurator.last?.params.species === "Слэб");
    ok(await vis(sc) === "sleb" && (await p.evaluate(() => window.__configurator.last.params.tone)) === "sleb" && (await p.$eval(`${sc} [data-key="tone"] b`, (x) => x.textContent)) === "Слэб", `${name}/${tab}: у слэба одна миниатюра «Слэб», выбрана автоматически`);
    ok(await p.$eval(`${sc} [data-key="tone"] .sw:not([hidden]) i`, (i) => i.style.backgroundImage.includes("tex/sleb/thumb_sleb")), `${name}/${tab}: миниатюра слэба`);
    t = await text(); ok(t.includes("Материал: Слэб") && t.includes("Покрытие: Масло") && !t.includes("Тон"), `${name}/${tab}: «Материал: Слэб», «Покрытие: Масло», без «Тон»`);
    ok(await coatVis(sc), `${name}/${tab}: у слэба поле «Покрытие» видно`);
    // живой край: по умолчанию сзади и спереди; строки на чертеже нет; габариты по номиналу, тело и текст в порядке
    ok(await boxVis(sc) && await edges(sc) === "edgeL:0,edgeB:1,edgeF:1,edgeR:0", `${name}/${tab}: «Живой край» виден, по умолчанию сзади и спереди`);
    ok(!t.includes("Живой край"), `${name}/${tab}: строки «Живой край» на чертеже нет`);
    ok(await solidOK(), `${name}/${tab}: живой край — тело верно, габариты по номиналу, текст не налезает`);
    await p.click(`${sc} [data-key="edgeL"] input`); await p.click(`${sc} [data-key="edgeR"] input`);
    await last(() => window.__configurator.last?.params.edgeL && window.__configurator.last?.params.edgeR);
    ok(await solidOK(), `${name}/${tab}: все 4 края — тело верно, габариты по номиналу`);
    if (name === "desktop") { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT.replace(/kamen$/, "sleb")}/ui_${tab}_sleb_vse_kraya.png` }); }
    await p.click(`${sc} [data-key="edgeB"] input`); await p.click(`${sc} [data-key="edgeF"] input`); await p.click(`${sc} [data-key="edgeL"] input`); await p.click(`${sc} [data-key="edgeR"] input`);
    await last(() => { const q = window.__configurator.last?.params; return q && !q.edgeL && !q.edgeR && !q.edgeB && !q.edgeF; });
    ok(await solidOK() && (await p.evaluate(() => window.__configurator.last.svg.length)) > 0, `${name}/${tab}: без живого края — прямоугольник`);
    await p.click(`${sc} [data-key="edgeB"] input`); await p.click(`${sc} [data-key="edgeF"] input`);
    await last(() => { const q = window.__configurator.last?.params; return q && q.edgeB && q.edgeF; });
    ok(await p.evaluate(() => window.__configurator.last.params.texture) && await texHref() > 1000, `${name}/${tab}: текстура слэба в SVG`);
    ok(await p.evaluate(() => window.__checks?.overlap ?? "OK") === "OK", `${name}/${tab}: слэб — текст не налезает на геометрию`);
    if (name === "desktop") { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT.replace(/kamen$/, "sleb")}/ui_${tab}_sleb.png` }); }
    await p.click(`${sc} [data-key="texture"] input`); await last(() => window.__configurator.last?.params.texture === false);
    ok(await texHref() === 0 && (await text()).includes("Материал: Слэб"), `${name}/${tab}: слэб без «Текстуры» — белое тело, текст тот же`);
    await p.selectOption(`${sc} [data-key="species"] select`, "Дуб"); await last(() => window.__configurator.last?.params.species === "Дуб");
    ok((await p.evaluate(() => window.__configurator.last.params.tone)) === "705_12_dub" && (await vis(sc)).split(",").length === 12, `${name}/${tab}: со слэба на дерево — тон по умолчанию, 12 тонов`);
    ok(!(await boxVis(sc)), `${name}/${tab}: со слэба на дерево — «Живой край» скрыт`);
    // «Сбросить» возвращает живой край к умолчанию (сзади и спереди)
    await p.selectOption(`${sc} [data-key="species"] select`, "Слэб"); await last(() => window.__configurator.last?.params.species === "Слэб");
    await p.click(`${sc} [data-key="edgeL"] input`); await p.click(`${sc} [data-key="edgeF"] input`); await last(() => window.__configurator.last?.params.edgeL && !window.__configurator.last.params.edgeF);
    await p.click("#reset"); await last(() => window.__configurator.last?.params.species === "Дуб" && !window.__configurator.last.params.edgeL);
    ok(await p.evaluate(() => { const v = window.__configurator.values; return !v.edgeL && v.edgeB && v.edgeF && !v.edgeR; }), `${name}/${tab}: «Сбросить» — живой край по умолчанию`);
    if (tab === "tables") { await p.click(`${sc} summary`); await p.waitForTimeout(200); }
  }
  ok(errs.length === 0, `${name}: ошибок консоли нет ${errs.join(" | ")}`);
}
await b.close(); srv.kill();
console.log(fails.length ? "FAILS" : "ALL PASS"); process.exit(fails.length ? 1 : 0);
