/**
 * DOM-free helpers for validating and transporting generated PDF bytes.
 * Kept separate from the renderer so they can be unit tested in Node.
 */

export const PDF_MAGIC = "%PDF-";

/** True when the buffer starts with the PDF magic bytes. */
export function isPdfBytes(bytes: Uint8Array | ArrayBuffer): boolean {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.length < 5) return false;
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (view[i] !== PDF_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

/** Throws when the produced file is not a real PDF (e.g. HTML renamed .pdf). */
export function assertPdfBytes(bytes: Uint8Array | ArrayBuffer): void {
  if (!isPdfBytes(bytes)) {
    throw new Error("Generated file is not a valid PDF (missing %PDF- header)");
  }
}

/** Binary-safe base64 encoding for transporting PDF bytes to the server. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Inverse of {@link bytesToBase64}; used by the delivery endpoint. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
