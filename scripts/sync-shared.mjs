// Копирует общий код (модели, геометрию, отрисовку чертежа) из ../replicad в src/shared.
// Источник правды — проект replicad (его же использует `node build.js`). В архиве src/shared уже лежит, запускать не нужно.
//   npm run sync [путь-к-replicad]
import fs from "node:fs";
import path from "node:path";
const SRC = path.resolve(process.argv[2] || "../replicad"), DST = path.resolve("src/shared");
if (!fs.existsSync(path.join(SRC, "registry.js"))) { console.error("нет", SRC + "/registry.js"); process.exit(1); }
const skip = new Set(["oc.js", "preview.js", "fonts-node.js"]);               // только для Node
fs.rmSync(DST, { recursive: true, force: true });
const copy = (rel) => { fs.mkdirSync(path.dirname(path.join(DST, rel)), { recursive: true }); fs.copyFileSync(path.join(SRC, rel), path.join(DST, rel)); };
copy("registry.js");
for (const dir of ["lib", "render"]) for (const f of fs.readdirSync(path.join(SRC, dir))) if (f.endsWith(".js") && !skip.has(f)) copy(`${dir}/${f}`);
for (const d of fs.readdirSync(SRC)) if (fs.existsSync(path.join(SRC, d, "model.js"))) copy(`${d}/model.js`);
console.log("src/shared обновлён из", SRC);
