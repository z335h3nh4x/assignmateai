import { describe, expect, it } from "vitest";
import { sanitizeExportFilename } from "./export-limits";

describe("sanitizeExportFilename", () => {
  it("uses a normal assignment title with the .pdf extension", () => {
    expect(sanitizeExportFilename("Principles of Economics Assignment", ".pdf")).toBe(
      "Principles of Economics Assignment.pdf",
    );
  });

  it("removes invalid filename characters", () => {
    expect(
      sanitizeExportFilename('My/Question: What is 2*2? "Answer" <here> | yes', ".pdf"),
    ).toBe("MyQuestion What is 22 Answer here  yes.pdf");
  });

  it("falls back to assignment.pdf for empty or whitespace-only titles", () => {
    expect(sanitizeExportFilename("", ".pdf")).toBe("assignment.pdf");
    expect(sanitizeExportFilename("   ", ".pdf")).toBe("assignment.pdf");
    expect(sanitizeExportFilename(null, ".pdf")).toBe("assignment.pdf");
    expect(sanitizeExportFilename(undefined, ".pdf")).toBe("assignment.pdf");
  });

  it("trims leading and trailing spaces and periods", () => {
    expect(sanitizeExportFilename("  ..My Assignment..  ", ".pdf")).toBe(
      "My Assignment.pdf",
    );
  });

  it("truncates very long titles while keeping the .pdf extension", () => {
    const longTitle = "A".repeat(300);
    const result = sanitizeExportFilename(longTitle, ".pdf");
    expect(result.endsWith(".pdf")).toBe(true);
    expect(result).toMatch(/^A+\.pdf$/);
    expect(result.length).toBeLessThanOrEqual(128);
  });

  it("does not duplicate the .pdf extension when the title already includes it", () => {
    expect(sanitizeExportFilename("My Assignment.pdf", ".pdf")).toBe("My Assignment.pdf");
  });

  it("preserves the requested extension for non-pdf exports", () => {
    expect(sanitizeExportFilename("My Assignment", ".doc")).toBe("My Assignment.doc");
  });
});
