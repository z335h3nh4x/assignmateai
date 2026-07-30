// Custom notebook background support.
//
// This module is intentionally independent from the handwriting engine:
// it only produces a *page background* (image + writable-area insets).
// A future personal-handwriting engine can be plugged in separately and
// will compose with whatever background is active.

export type NotebookInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type NotebookBackground = {
  imageUrl: string;
  insets: NotebookInsets;
};

export const DEFAULT_INSETS: NotebookInsets = {
  top: 0.09,
  right: 0.07,
  bottom: 0.08,
  left: 0.14,
};

export const ACCEPTED_NOTEBOOK_TYPES = "image/jpeg,image/jpg,image/png,application/pdf";

const MAX_EDGE = 1700;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Render the first page of a PDF into a canvas-ready bitmap. */
async function pdfFirstPageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  // Worker is bundled by Vite as a URL.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(MAX_EDGE / Math.max(base.width, base.height), 3);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
  return canvas;
}

async function imageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read that image"));
      i.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Flattens camera shadows / uneven lighting: estimates a slow-varying paper
 * brightness on a coarse grid and divides it out, then lifts near-paper pixels
 * to clean white. Ruled lines, red margins and printed headers survive because
 * they are far darker than the local paper level.
 */
function cleanPaper(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const cols = 12;
  const rows = 16;
  const cw = Math.ceil(w / cols);
  const ch = Math.ceil(h / rows);
  // Per-tile paper level = 92nd percentile luminance (approximated by max of samples).
  const level = new Float32Array(cols * rows);
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const samples: number[] = [];
      for (let y = ty * ch; y < Math.min((ty + 1) * ch, h); y += 3) {
        for (let x = tx * cw; x < Math.min((tx + 1) * cw, w); x += 3) {
          const i = (y * w + x) * 4;
          samples.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        }
      }
      samples.sort((a, b) => a - b);
      level[ty * cols + tx] = samples.length
        ? Math.max(60, samples[Math.floor(samples.length * 0.92)])
        : 255;
    }
  }

  const levelAt = (x: number, y: number) => {
    const tx = clamp(Math.floor(x / cw), 0, cols - 1);
    const ty = clamp(Math.floor(y / ch), 0, rows - 1);
    return level[ty * cols + tx];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const gain = 250 / levelAt(x, y);
      let r = d[i] * gain;
      let g = d[i + 1] * gain;
      let b = d[i + 2] * gain;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 232) { r = 255; g = 255; b = 255; }
      d[i] = clamp(r, 0, 255);
      d[i + 1] = clamp(g, 0, 255);
      d[i + 2] = clamp(b, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Detects the writable area of a notebook page:
 *  - the red vertical margin rule (if present) sets the left boundary
 *  - the vertical span of ruled lines sets the top / bottom boundaries
 * Falls back to sensible defaults when a page has no detectable ruling.
 */
function detectInsets(canvas: HTMLCanvasElement): NotebookInsets {
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const d = ctx.getImageData(0, 0, w, h).data;

  const redCols = new Int32Array(w);
  const inkRows = new Int32Array(h);

  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 244) continue;
      inkRows[y] += 1;
      if (r > 110 && r - g > 45 && r - b > 40) redCols[x] += 1;
    }
  }

  const rowThreshold = (w / 2) * 0.25;
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < h; y += 2) {
    if (inkRows[y] >= rowThreshold) {
      if (top < 0) top = y;
      bottom = y;
    }
  }

  // Red margin: strongest column within the left 45% of the page.
  let marginX = -1;
  let best = (h / 2) * 0.35;
  for (let x = 0; x < Math.floor(w * 0.45); x++) {
    if (redCols[x] > best) { best = redCols[x]; marginX = x; }
  }

  const insets: NotebookInsets = {
    top: top >= 0 ? clamp(top / h + 0.02, 0.03, 0.3) : DEFAULT_INSETS.top,
    bottom: bottom >= 0 ? clamp(1 - bottom / h + 0.02, 0.03, 0.3) : DEFAULT_INSETS.bottom,
    left: marginX >= 0 ? clamp(marginX / w + 0.025, 0.04, 0.35) : DEFAULT_INSETS.left,
    right: DEFAULT_INSETS.right,
  };
  return insets;
}

export type ProcessedNotebook = {
  blob: Blob;
  width: number;
  height: number;
  insets: NotebookInsets;
  previewUrl: string;
};

/** Normalize an uploaded notebook page and detect its writable area. */
export async function processNotebookFile(file: File): Promise<ProcessedNotebook> {
  const canvas =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name)
      ? await pdfFirstPageToCanvas(file)
      : await imageToCanvas(file);

  cleanPaper(canvas);
  const insets = detectInsets(canvas);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process that page"))),
      "image/jpeg",
      0.92,
    ),
  );

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    insets,
    previewUrl: URL.createObjectURL(blob),
  };
}

/** Convert a remote/blob image URL into a data URL so print windows never race on network loads. */
export async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not load notebook background"));
    fr.readAsDataURL(blob);
  });
}
