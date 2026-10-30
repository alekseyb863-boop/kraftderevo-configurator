// PDF: jsPDF + svg2pdf.js. Чертёж целиком состоит из контуров (текст — кривые), шрифты в PDF не нужны.
import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";

/** @param {string} svgString чертёж, @param {number} W ширина в px @param {number} H высота в px -> Blob PDF (страница по размеру чертежа, px*0.75 pt) */
export async function svgToPdfBlob(svgString, W, H) {
  const w = W * 0.75, h = H * 0.75;
  const doc = new jsPDF({ orientation: w >= h ? "landscape" : "portrait", unit: "pt", format: [w, h] });
  const el = new DOMParser().parseFromString(svgString, "image/svg+xml").documentElement;
  el.style.cssText = "position:absolute;left:-99999px;top:0";                // svg2pdf нужен элемент в DOM
  document.body.appendChild(el);
  try { await svg2pdf(el, doc, { x: 0, y: 0, width: w, height: h }); } finally { el.remove(); }
  return doc.output("blob");
}
