/**
 * Document delivery for exports.
 *
 * Mobile browsers and WebView wrappers frequently refuse to save blob:/data:
 * URLs and get stuck on `window.open("")` + document.write. So every export is
 * POSTed to a same-origin server route which streams it back as a normal HTTP
 * response — the browser then uses its native download / print handling.
 *
 * A blob download is kept as a last-resort fallback for offline situations.
 */

import { bytesToBase64 } from "./pdf-bytes";

const ENDPOINT = "/api/public/export-doc";

function postForm(fields: Record<string, string>, target: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = ENDPOINT;
  form.target = target;
  form.style.display = "none";
  form.acceptCharset = "utf-8";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("textarea");
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 2000);
}

function blobFallback(name: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Opens a generated HTML document (print-ready PDF view) in a new tab as a real
 * URL response so the device's native print / "Save as PDF" flow works.
 */
export function openDocument(html: string, filename: string): boolean {
  try {
    // Open the tab synchronously inside the user gesture, then post into it.
    const w = window.open("about:blank", "_blank");
    if (w) {
      w.document.write(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preparing…</title><body style="font-family:system-ui;padding:24px">Preparing your document…</body>',
      );
      const name = `docexport_${Date.now()}`;
      w.name = name;
      postForm({ html, filename, mode: "inline" }, name);
      return true;
    }
    // Popup blocked (common in WebViews): navigate the current tab instead.
    postForm({ html, filename, mode: "inline" }, "_self");
    return true;
  } catch {
    blobFallback(filename, "text/html", html);
    return false;
  }
}

/**
 * Triggers a native file download (Content-Disposition: attachment) via a
 * hidden iframe — no popup, works in mobile browsers and app WebViews.
 */
export function downloadDocument(html: string, filename: string, mime: string) {
  try {
    const name = `dl_${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = name;
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    postForm({ html, filename, mime, mode: "attachment" }, name);
    setTimeout(() => iframe.remove(), 60_000);
  } catch {
    blobFallback(filename, mime, html);
  }
}

/**
 * Downloads real binary bytes (e.g. generated PDF) as an attachment. The bytes
 * are posted base64-encoded and streamed back with the correct MIME type so
 * mobile browsers use their native download handling.
 */
export function downloadBinaryDocument(bytes: Uint8Array, filename: string, mime: string) {
  try {
    const base64 = bytesToBase64(bytes);
    const name = `dl_${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = name;
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    postForm({ html: base64, encoding: "base64", filename, mime, mode: "attachment" }, name);
    setTimeout(() => iframe.remove(), 60_000);
  } catch {
    const url = URL.createObjectURL(
      new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

