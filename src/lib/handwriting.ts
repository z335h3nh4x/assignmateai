/**
 * Shared handwriting system for every export path (Notebook PDF, Academic PDF, DOCX).
 *
 * This is the single source of truth for handwriting style names, font stacks,
 * the Google Fonts stylesheet and the "natural jitter" script. Do not redefine
 * these anywhere else.
 */

export type HandwritingStyle = "clean" | "natural" | "cursive" | "exam" | "neat";

/** Export-level selection: "standard" keeps the export's original typography. */
export type ExportHandwriting = "standard" | HandwritingStyle;

export type StyleProfile = {
  fontFamily: string;
  fontSize: string;
  headerSize: string;
  titleSize: string;
  h1: string;
  h2: string;
  h3: string;
  tableSize: string;
  jitter: boolean;
};

export const STYLE_PROFILES: Record<HandwritingStyle, StyleProfile> = {
  clean: {
    fontFamily: `'Patrick Hand', 'Kalam', cursive`,
    fontSize: "22px",
    headerSize: "18px",
    titleSize: "28px",
    h1: "26px",
    h2: "24px",
    h3: "22px",
    tableSize: "18px",
    jitter: false,
  },
  natural: {
    fontFamily: `'Caveat', 'Patrick Hand', cursive`,
    fontSize: "26px",
    headerSize: "22px",
    titleSize: "34px",
    h1: "32px",
    h2: "28px",
    h3: "26px",
    tableSize: "20px",
    jitter: true,
  },
  cursive: {
    fontFamily: `'Dancing Script', 'Caveat', cursive`,
    fontSize: "26px",
    headerSize: "21px",
    titleSize: "33px",
    h1: "31px",
    h2: "28px",
    h3: "26px",
    tableSize: "20px",
    jitter: false,
  },
  exam: {
    fontFamily: `'Reenie Beanie', 'Caveat', cursive`,
    fontSize: "27px",
    headerSize: "22px",
    titleSize: "34px",
    h1: "32px",
    h2: "29px",
    h3: "27px",
    tableSize: "21px",
    jitter: true,
  },
  neat: {
    fontFamily: `'Architects Daughter', 'Patrick Hand', cursive`,
    fontSize: "20px",
    headerSize: "17px",
    titleSize: "26px",
    h1: "24px",
    h2: "22px",
    h3: "20px",
    tableSize: "17px",
    jitter: false,
  },
};

/** Options shown in every handwriting selector (labels shared across dialogs). */
export const HANDWRITING_OPTIONS: { value: HandwritingStyle; label: string }[] = [
  { value: "clean", label: "Clean Notebook" },
  { value: "natural", label: "Natural Handwriting" },
  { value: "cursive", label: "Student Cursive" },
  { value: "exam", label: "Fast Exam Writing" },
  { value: "neat", label: "Neat School Notes" },
];

/** Google Fonts stylesheet covering every handwriting family above. */
export const HANDWRITING_FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Patrick+Hand&family=Kalam:wght@400;700&family=Dancing+Script:wght@400;600&family=Reenie+Beanie&family=Architects+Daughter&display=swap">`;

export function isHandwriting(v: ExportHandwriting): v is HandwritingStyle {
  return v !== "standard";
}

export function getProfile(style: HandwritingStyle): StyleProfile {
  return STYLE_PROFILES[style] ?? STYLE_PROFILES.clean;
}

/**
 * Natural handwriting jitter — only applied to plain text nodes inside
 * `rootSelector` so KaTeX formulas, tables and code blocks stay intact.
 */
export function handwritingJitterScript(rootSelector: string): string {
  return `
    <script>
      (function () {
        var root = document.querySelector('${rootSelector}');
        if (!root) return;
        function rand(a, b) { return a + Math.random() * (b - a); }
        var SKIP = new Set(['CODE','PRE','TABLE','THEAD','TBODY','TR','TH','TD','SVG','MATH']);
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        var textNodes = [];
        while (walker.nextNode()) {
          var n = walker.currentNode;
          if (!n.nodeValue || !n.nodeValue.trim()) continue;
          var p = n.parentElement;
          var skip = false;
          while (p) {
            if (SKIP.has(p.tagName) || p.classList.contains('katex') || p.classList.contains('mermaid')) { skip = true; break; }
            p = p.parentElement;
          }
          if (!skip) textNodes.push(n);
        }
        textNodes.forEach(function (n) {
          var text = n.nodeValue;
          var frag = document.createDocumentFragment();
          var parts = text.split(/(\\s+)/);
          parts.forEach(function (p) {
            if (/^\\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span');
            s.textContent = p;
            s.style.display = 'inline-block';
            s.style.transform = 'translateY(' + rand(-1.2,1.2).toFixed(2) + 'px) rotate(' + rand(-0.8,0.8).toFixed(2) + 'deg)';
            s.style.letterSpacing = rand(-0.3,0.6).toFixed(2) + 'px';
            s.style.opacity = rand(0.85,1).toFixed(2);
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        });
      })();
    <\/script>
  `;
}

/**
 * CSS overriding a document's typography with a handwriting style, without
 * touching page/paper styling. Used by the Academic PDF and DOCX exports.
 */
export function handwritingOverrideCss(style: HandwritingStyle): string {
  const p = getProfile(style);
  return `
  html, body, p, li, td, th, blockquote, .title-meta, .toc, .toc a, .assignment-label {
    font-family: ${p.fontFamily} !important;
  }
  body { font-size: ${p.fontSize} !important; line-height: 1.65 !important; }
  h1, h2, h3, h4 { font-family: ${p.fontFamily} !important; }
  h1 { font-size: ${p.h1} !important; }
  h2 { font-size: ${p.h2} !important; }
  h3, h4 { font-size: ${p.h3} !important; }
  .title-page h1.doc-title { font-size: ${p.titleSize} !important; }
  table, td, th { font-size: ${p.tableSize} !important; }
  p { text-align: left !important; text-indent: 0 !important; hyphens: none !important; }
  code, pre, .katex, .katex * { font-family: inherit; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important; }
  .katex, .katex * { font-family: KaTeX_Main, 'Times New Roman', serif !important; }
`;
}

/**
 * Word (.doc HTML) cannot download webfonts, so the handwriting stack is
 * emitted with locally-installed fallbacks first and a generic cursive last.
 */
export function docxFontStack(style: HandwritingStyle): string {
  return `${getProfile(style).fontFamily}, 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive`;
}
