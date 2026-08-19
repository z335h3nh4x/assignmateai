/**
 * Academic PDF renderer.
 *
 * The academic export used to be delivered as raw HTML with a `.pdf` filename,
 * which browsers/Acrobat correctly rejected as a corrupt PDF. This module takes
 * the same generated HTML document (identical styling/layout), renders it in an
 * offscreen iframe at real Letter dimensions and produces genuine PDF bytes.
 */

import { assertPdfBytes } from "./pdf-bytes";

const DPI = 96;
const PAGE_W_IN = 8.5;
const PAGE_H_IN = 11;
const MARGIN_IN = 1;
const CONTENT_W_IN = PAGE_W_IN - MARGIN_IN * 2; // 6.5in
const CONTENT_H_IN = PAGE_H_IN - MARGIN_IN * 2; // 9in
const CONTENT_W_PX = CONTENT_W_IN * DPI; // 624

/** CSS that maps the print-oriented document onto a fixed-width screen render. */
const RENDER_WIDTH_PX = 800;
const SCREEN_FIT_CSS = `
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body {
    width: ${RENDER_WIDTH_PX}px !important;
    overflow: visible !important;
    line-height: 1.6 !important;
    word-break: break-word !important;
    white-space: normal !important;
    letter-spacing: normal !important;
  }
  img, svg, table, pre { max-width: 100% !important; }
  /* Keep the cover page exactly one printed page tall so slicing lines up. */
  .title-page { height: ${CONTENT_H_IN * DPI}px !important; min-height: ${CONTENT_H_IN * DPI}px !important; box-sizing: border-box !important; }
`;

async function renderInIframe(html: string): Promise<HTMLCanvasElement> {
  const [{ default: html2canvas }] = await Promise.all([import("html2canvas")]);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${CONTENT_W_PX}px;height:${CONTENT_H_IN * DPI}px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();

    const style = doc.createElement("style");
    style.textContent = SCREEN_FIT_CSS;
    doc.head.appendChild(style);

    // Wait for fonts (handwriting/KaTeX) and images before rasterising.
    await new Promise<void>((resolve) => {
      if (doc.readyState === "complete") return resolve();
      iframe.contentWindow!.addEventListener("load", () => resolve(), { once: true });
      setTimeout(resolve, 4000);
    });
    try {
      await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
    } catch {
      /* font loading is best-effort */
    }
    await Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((r) => {
              img.addEventListener("load", () => r(), { once: true });
              img.addEventListener("error", () => r(), { once: true });
              setTimeout(r, 4000);
            }),
      ),
    );
    // Give layout/KaTeX one frame to settle.
    await new Promise((r) => setTimeout(r, 120));

    const body = doc.body;
    const height = Math.max(body.scrollHeight, doc.documentElement.scrollHeight, 1);
    iframe.style.height = `${height}px`;

    return await html2canvas(body, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      width: CONTENT_W_PX,
      height,
      windowWidth: CONTENT_W_PX,
      windowHeight: height,
    });
  } finally {
    iframe.remove();
  }
}

/**
 * Renders the academic HTML document into real PDF bytes (Letter, 1in margins).
 * Throws when the produced buffer is not a valid PDF.
 */
export async function generateAcademicPdfBytes(html: string): Promise<Uint8Array> {
  const canvas = await renderInIframe(html);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });

  const pxPerIn = canvas.width / CONTENT_W_IN;
  const pageSlicePx = Math.floor(CONTENT_H_IN * pxPerIn);
  const totalPages = Math.max(1, Math.ceil(canvas.height / pageSlicePx));

  const slice = document.createElement("canvas");
  const ctx = slice.getContext("2d")!;

  for (let page = 0; page < totalPages; page++) {
    const sourceY = page * pageSlicePx;
    const sliceHeight = Math.min(pageSlicePx, canvas.height - sourceY);
    if (sliceHeight <= 0) break;

    slice.width = canvas.width;
    slice.height = sliceHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (page > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL("image/jpeg", 0.92),
      "JPEG",
      MARGIN_IN,
      MARGIN_IN,
      CONTENT_W_IN,
      sliceHeight / pxPerIn,
      undefined,
      "FAST",
    );
  }

  const bytes = new Uint8Array(pdf.output("arraybuffer"));
  assertPdfBytes(bytes);
  return bytes;
}
