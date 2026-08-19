import { describe, expect, it } from "vitest";
import { assertPdfBytes, base64ToBytes, bytesToBase64, isPdfBytes } from "./pdf-bytes";

const enc = (s: string) => new TextEncoder().encode(s);

describe("pdf byte validation", () => {
  it("accepts real PDF bytes", () => {
    expect(isPdfBytes(enc("%PDF-1.4\n%âãÏÓ\n1 0 obj"))).toBe(true);
  });

  it("rejects HTML renamed as a PDF", () => {
    expect(isPdfBytes(enc("<!doctype html><html><body>hi</body></html>"))).toBe(false);
    expect(() => assertPdfBytes(enc("<!doctype html>"))).toThrow(/not a valid PDF/);
  });

  it("rejects empty/short buffers", () => {
    expect(isPdfBytes(new Uint8Array())).toBe(false);
    expect(isPdfBytes(enc("%PD"))).toBe(false);
  });

  it("round-trips binary data through base64", () => {
    const bytes = new Uint8Array([37, 80, 68, 70, 45, 0, 255, 128, 10]);
    const restored = base64ToBytes(bytesToBase64(bytes));
    expect(Array.from(restored)).toEqual(Array.from(bytes));
    expect(isPdfBytes(restored)).toBe(true);
  });
});
