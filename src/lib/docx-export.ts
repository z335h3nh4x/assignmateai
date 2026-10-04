/**
 * Real OOXML (.docx) export.
 *
 * The previous export saved HTML with a .doc extension. Android Word / Google
 * Docs import that HTML loosely: source newlines inside paragraphs, inline
 * tags and KaTeX spans were collapsed to zero-width gaps, so words looked
 * glued together ("ruralIndia"). This module walks the rendered HTML and emits
 * a standards-compliant .docx: one run per formatting change, every whitespace
 * sequence normalised to a single U+0020, no character spacing / kerning /
 * scaling, standard <w:jc w:val="both"/> justification and a core font.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ShadingType,
} from "docx";

/** Collapse any whitespace (newline, tab, NBSP, thin spaces…) to one U+0020. */
export function normalizeWhitespace(s: string): string {
  return s.replace(/[\s\u00a0\u2000-\u200b\u202f\u205f\u3000\ufeff]+/g, " ");
}

type Fmt = { bold?: boolean; italics?: boolean; code?: boolean; underline?: boolean };

const CONTENT_WIDTH = 9026; // A4, 1" margins (DXA)

export async function buildDocxBlob(
  bodyHtml: string,
  opts: { title: string; font: string },
): Promise<Blob> {
  const font = opts.font;
  const container = document.createElement("div");
  container.innerHTML = bodyHtml;

  const blocks: Array<Paragraph | Table> = [];

  function runsFrom(node: Node, fmt: Fmt, out: TextRun[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeWhitespace(node.textContent ?? "");
      if (text) {
        out.push(
          new TextRun({
            text,
            bold: fmt.bold,
            italics: fmt.italics,
            underline: fmt.underline ? {} : undefined,
            font: fmt.code ? "Courier New" : font,
          }),
        );
      }
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      out.push(new TextRun({ break: 1 }));
      return;
    }
    if (node.classList.contains("katex")) {
      const tex = node.querySelector("annotation")?.textContent ?? node.textContent ?? "";
      const t = normalizeWhitespace(tex).trim();
      if (t) out.push(new TextRun({ text: t, italics: true, font: "Cambria Math" }));
      return;
    }
    const next: Fmt = { ...fmt };
    if (tag === "strong" || tag === "b" || tag === "th") next.bold = true;
    if (tag === "em" || tag === "i") next.italics = true;
    if (tag === "u") next.underline = true;
    if (tag === "code") next.code = true;
    node.childNodes.forEach((c) => runsFrom(c, next, out));
  }

  /** Trim leading/trailing spaces of a run list without touching inner spacing. */
  function inlineRuns(el: Node, fmt: Fmt = {}): TextRun[] {
    const out: TextRun[] = [];
    el.childNodes.forEach((c) => runsFrom(c, fmt, out));
    return out;
  }

  function trimmedText(el: Element) {
    return normalizeWhitespace(el.textContent ?? "").trim();
  }

  function list(el: Element, ordered: boolean, level: number) {
    for (const li of Array.from(el.children)) {
      if (li.tagName.toLowerCase() !== "li") continue;
      const clone = li.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(":scope > ul, :scope > ol").forEach((n) => n.remove());
      blocks.push(
        new Paragraph({
          numbering: { reference: ordered ? "numbers" : "bullets", level: Math.min(level, 2) },
          alignment: AlignmentType.LEFT,
          children: inlineRuns(clone),
        }),
      );
      li.querySelectorAll(":scope > ul, :scope > ol").forEach((sub) =>
        list(sub, sub.tagName.toLowerCase() === "ol", level + 1),
      );
    }
  }

  function table(el: Element) {
    const rows = Array.from(el.querySelectorAll("tr"));
    if (!rows.length) return;
    const cols = Math.max(...rows.map((r) => r.children.length)) || 1;
    const w = Math.floor(CONTENT_WIDTH / cols);
    const border = { style: BorderStyle.SINGLE, size: 4, color: "333333" };
    blocks.push(
      new Table({
        width: { size: w * cols, type: WidthType.DXA },
        columnWidths: Array(cols).fill(w),
        rows: rows.map(
          (r) =>
            new TableRow({
              children: Array.from(r.children).map((c) => {
                const head = c.tagName.toLowerCase() === "th";
                return new TableCell({
                  width: { size: w, type: WidthType.DXA },
                  borders: { top: border, bottom: border, left: border, right: border },
                  margins: { top: 60, bottom: 60, left: 100, right: 100 },
                  shading: head ? { fill: "F0F0F0", type: ShadingType.CLEAR } : undefined,
                  children: [
                    new Paragraph({ alignment: AlignmentType.LEFT, children: inlineRuns(c, { bold: head }) }),
                  ],
                });
              }),
            }),
        ),
      }),
    );
    blocks.push(new Paragraph({ children: [] }));
  }

  function block(el: Element) {
    const tag = el.tagName.toLowerCase();
    const heading: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
      h1: HeadingLevel.HEADING_1,
      h2: HeadingLevel.HEADING_2,
      h3: HeadingLevel.HEADING_3,
      h4: HeadingLevel.HEADING_4,
      h5: HeadingLevel.HEADING_4,
      h6: HeadingLevel.HEADING_4,
    };
    if (heading[tag]) {
      blocks.push(new Paragraph({ heading: heading[tag], children: [new TextRun({ text: trimmedText(el), font })] }));
    } else if (tag === "p") {
      blocks.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: inlineRuns(el) }));
    } else if (tag === "ul" || tag === "ol") {
      list(el, tag === "ol", 0);
    } else if (tag === "table") {
      table(el);
    } else if (tag === "pre") {
      for (const line of (el.textContent ?? "").replace(/\n$/, "").split("\n")) {
        blocks.push(
          new Paragraph({
            spacing: { after: 0, line: 240 },
            children: [new TextRun({ text: line.replace(/\t/g, "    "), font: "Courier New", size: 20 })],
          }),
        );
      }
      blocks.push(new Paragraph({ children: [] }));
    } else if (tag === "blockquote") {
      blocks.push(new Paragraph({ indent: { left: 720 }, alignment: AlignmentType.JUSTIFIED, children: inlineRuns(el, { italics: true }) }));
    } else if (tag === "hr") {
      blocks.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } }, children: [] }));
    } else if (el.classList.contains("katex-display") || el.querySelector(":scope > .katex-display")) {
      blocks.push(new Paragraph({ alignment: AlignmentType.CENTER, children: inlineRuns(el) }));
    } else if (el.classList.contains("mermaid")) {
      blocks.push(new Paragraph({ children: [new TextRun({ text: "[Diagram]", italics: true, font })] }));
    } else if (el.children.length) {
      Array.from(el.children).forEach(block);
    } else if (trimmedText(el)) {
      blocks.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: inlineRuns(el) }));
    }
  }

  Array.from(container.children).forEach(block);

  const headingRun = { font, bold: true, color: "000000" };
  const doc = new Document({
    title: opts.title,
    styles: {
      default: {
        document: { run: { font, size: 24 }, paragraph: { spacing: { after: 120, line: 360 } } },
      },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { ...headingRun, size: 32 }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { ...headingRun, size: 27 }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { ...headingRun, size: 24, italics: true }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
        { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true, run: { ...headingRun, size: 24 }, paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 3 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [0, 1, 2].map((l) => ({ level: l, format: LevelFormat.BULLET, text: ["•", "◦", "▪"][l], alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } } })) },
        { reference: "numbers", levels: [0, 1, 2].map((l) => ({ level: l, format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][l], text: `%${l + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } } })) },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: blocks.length ? blocks : [new Paragraph({ children: [] })],
      },
    ],
  });
  return Packer.toBlob(doc);
}
