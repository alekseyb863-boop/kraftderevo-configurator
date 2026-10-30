// PNG: чертёж (SVG целиком из контуров, текст — кривые, шрифты не нужны) -> canvas -> Blob PNG.  Без внешних библиотек; работает в мобильном Chrome/Safari.
const loadImage = (url) => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error("браузер не смог растеризовать чертёж")); img.src = url; });
const toBlob = (cv) => new Promise((res) => cv.toBlob((b) => res(b), "image/png"));

/** @param {string} svgString чертёж, @param {number} W ширина в px, @param {number} H высота в px, @param {number} scale увеличение (по умолчанию 2.5)
 *  -> Blob PNG на белом фоне.  Если у устройства не хватает памяти под большой canvas, масштаб уменьшается (2.5 → 2 → 1.5 → 1). */
export async function svgToPngBlob(svgString, W, H, scale = 2.5) {
  const svgUrl = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(svgUrl);
    for (const s of [scale, 2, 1.5, 1].filter((v, i, a) => v <= scale && a.indexOf(v) === i)) {
      const cv = document.createElement("canvas");
      cv.width = Math.round(W * s); cv.height = Math.round(H * s);
      const ctx = cv.getContext("2d");
      if (!ctx) continue;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const blob = await toBlob(cv);
      cv.width = cv.height = 0;                                       // освободить память canvas
      if (blob && blob.size > 0) return blob;
    }
    throw new Error("не удалось создать PNG (не хватило памяти)");
  } finally { URL.revokeObjectURL(svgUrl); }
}
