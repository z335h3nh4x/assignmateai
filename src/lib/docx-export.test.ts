// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { buildDocxBlob, normalizeWhitespace } from "./docx-export";

describe("docx export whitespace", () => {
  it("normalises whitespace to single U+0020", () => {
    expect(normalizeWhitespace("rural\nIndia\u00a0and\t\tthe")).toBe("rural India and the");
  });
  it("keeps spaces between words and runs, no character spacing", async () => {
    const words = Array.from({ length: 8000 }, (_, i) => `word${i}`).join(" ");
    const html = `<p>Doctors in rural\nIndia face <strong>National Medical</strong> Commission <em>policy</em> analysis.</p><p>${words}</p>`;
    const blob = await buildDocxBlob(html, { title: "T", font: "Times New Roman" });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")!.async("string");
    const text = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
    expect(text).toContain("Doctors in rural India face National Medical Commission policy analysis.");
    expect(text).toContain("word7998 word7999");
    expect(xml).not.toMatch(/<w:spacing w:val|<w:w w:val|<w:kern|<w:fitText/);
    expect(xml).toContain('w:val="both"');
    expect(xml).toContain('xml:space="preserve"');
  });
});
