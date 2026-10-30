// Geometry sweep: for every article, slider extremes + all profile/strip options + random points ->
// normalize -> build -> fuse -> check (1 solid, valid, watertight, bbox == expected) -> drawing with overlap check.
//   node test/sweep.mjs [N_random=25] [article ...]       (SHARED=../src/shared node test/sweep.mjs ... when run from configurator_v2)
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setOC } from "replicad";
import opencascade from "replicad-opencascadejs";
const SHARED = path.resolve(process.env.SHARED || new URL("..", import.meta.url).pathname);
const imp = (f) => import(pathToFileURL(path.join(SHARED, f)).href);
const { ARTICLES } = await imp("registry.js"), { fuseAll, checkSolid, free } = await imp("lib/model.js"), { buildDrawing } = await imp("render/drawing.js");
const { setFonts } = await imp("render/fonts.js");
import fs from "node:fs";
const fontDir = ["/usr/share/fonts/truetype/dejavu/", path.join(SHARED, "../../public/fonts/")].find((d) => fs.existsSync(d + "DejaVuSans.ttf"));
const ab = (f) => { const b = fs.readFileSync(fontDir + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
setFonts(ab("DejaVuSans.ttf"), ab("DejaVuSans-Bold.ttf"));
setOC(await opencascade());

const N = Number(process.argv[2] || 25), only = process.argv.slice(3);
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
let total = 0, bad = 0, adjusted = 0, warned = 0; const t0 = Date.now();
for (const S of ARTICLES) {
  if (only.length && !only.includes(S.id)) continue;
  const def = S.normalize({}).p, nums = S.controls.filter((c) => c.type === "range"), sels = S.controls.filter((c) => c.type === "select");
  const cases = [{ name: "default", raw: def }];
  cases.push({ name: "all-min", raw: Object.fromEntries(nums.map((c) => [c.key, c.min])) }, { name: "all-max", raw: Object.fromEntries(nums.map((c) => [c.key, c.max])) });
  for (const c of nums) for (const [nm, v] of [["min", c.min], ["max", c.max], ["lo", c.min + (c.max - c.min) * 0.25], ["hi", c.min + (c.max - c.min) * 0.75]]) cases.push({ name: `${c.key}=${nm}`, raw: { ...def, [c.key]: Math.round(v / c.step) * c.step } });
  for (const c of sels) for (const o of c.options) {
    cases.push({ name: `${c.key}=${o.value}`, raw: { ...def, [c.key]: o.value } });
    cases.push({ name: `${c.key}=${o.value}+allmin`, raw: { ...Object.fromEntries(nums.map((n) => [n.key, n.min])), [c.key]: o.value } });
    cases.push({ name: `${c.key}=${o.value}+allmax`, raw: { ...Object.fromEntries(nums.map((n) => [n.key, n.max])), [c.key]: o.value } });
  }
  for (let i = 0; i < N; i++) {
    const raw = { ...def }; for (const c of nums) raw[c.key] = Math.round((c.min + rnd() * (c.max - c.min)) / c.step) * c.step;
    for (const c of sels) raw[c.key] = c.options[Math.floor(rnd() * c.options.length)].value;
    cases.push({ name: `rnd${i}`, raw });
  }
  let nOK = 0, nAdj = 0;
  for (const cs of cases) {
    total++;
    try {
      const { p, warnings } = S.normalize(cs.raw); if (warnings.length) warned++;
      const exp = S.expectBBox(p), solid = fuseAll(S.parts(p)), chk = checkSolid(S.id, solid, exp);
      const dr = buildDrawing({ solid, view: S.view, layout: S.layout, makeDims: (k) => S.dims(p, k), textLines: S.textLines(p) });
      free(solid);
      if (dr.adjust.attempts > 1) { nAdj++; adjusted++; }
      const ok = chk.ok && dr.check.ok && S.normalize(p).warnings.length === 0;
      if (!ok) { bad++; console.log(`FAIL ${S.id} ${cs.name} ${JSON.stringify(p)} solids=${chk.solids} valid=${chk.occValid} wt=${chk.watertight} bbox=${chk.bbox} exp=${exp.map((v) => +v.toFixed(2))} overlap=${dr.check.ok} warn=${JSON.stringify(S.normalize(p).warnings)}`); } else nOK++;
    } catch (e) { bad++; console.log(`ERR  ${S.id} ${cs.name} ${JSON.stringify(cs.raw)}: ${e.message}`); }
  }
  console.log(`${S.id}: ${nOK}/${cases.length} OK (drawing auto-adjusted in ${nAdj})`);
}
console.log(`TOTAL ${total} cases, ${bad} failures, ${adjusted} auto-adjusted drawings, ${warned} cases with normalisation messages, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(bad ? 1 : 0);
