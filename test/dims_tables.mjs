// Юнит-тест размеров чертежа стола: только длина, ширина и высота стола — отступов ножек от краёв на чертеже нет (все 10 ножек, любые отступы).
//   node test/dims_tables.mjs
import assert from "node:assert/strict";
import { TABLES } from "../src/shared/TABLE/model.js";
let n = 0;
for (const S of TABLES) for (const raw of [{}, { offW: 50, offL: 100 }, { offW: 120, offL: 300 }]) {
  const { p } = S.normalize(raw);
  for (const k of [1, 1.5]) {
    const labels = S.dims(p, k).map((d) => d.label ?? d.text ?? JSON.stringify(d).match(/"(\d+ мм)"/)?.[1]);
    assert.deepEqual(labels, [`${p.L} мм`, `${p.W} мм`, `${p.legH + p.T} мм`], `${S.id} ${JSON.stringify(raw)} k=${k}: ${labels}`);
    n++;
  }
}
console.log(`PASS размеры столов: ${n} проверок, только длина / ширина / высота`);
