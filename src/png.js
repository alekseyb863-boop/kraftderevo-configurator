// PNG: чертёж (SVG целиком из контуров, текст — кривые, шрифты не нужны) -> canvas -> Blob PNG.  Без внешних библиотек; работает в мобильном Chrome/Safari.
// Размер файла: фиксированная высота 1280 px, ширина по пропорции чертежа (1200×1400 -> 1097×1280).
export const PNG_HEIGHT = 1280;
export const pngSize = (W, H) => [Math.round((W * PNG_HEIGHT) / H), PNG_HEIGHT];
const loadImage = (url) => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error("браузер не смог растеризовать чертёж")); img.src = url; });
const toBlob = (cv) => new Promise((res) => cv.toBlob((b) => res(b), "image/png"));

/** @param {string} svgString чертёж, @param {number} W ширина SVG в px, @param {number} H высота SVG в px -> Blob PNG на белом фоне, высота 1280 px */
export async function svgToPngBlob(svgString, W, H) {
  const [w, h] = pngSize(W, H), svgUrl = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(svgUrl), cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("canvas недоступен");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);                                   // SVG векторный: растеризуется сразу в целевом размере
    const blob = await toBlob(cv);
    cv.width = cv.height = 0;                                         // освободить память canvas
    if (!blob || !blob.size) throw new Error("не удалось создать PNG");
    return blob;
  } finally { URL.revokeObjectURL(svgUrl); }
}
