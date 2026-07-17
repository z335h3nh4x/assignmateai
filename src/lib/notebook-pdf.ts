// Builds a notebook-style HTML document for printing to PDF.
// Text stays selectable — the notebook look is pure HTML/CSS.

import {
  renderRichMarkdown,
  PRINT_HEAD_ASSETS,
  PRINT_RICH_CSS,
} from "./render-markdown";

export type NotebookInk = "blue" | "black";
export type NotebookStyle = "clean" | "natural";

export type NotebookMeta = {
  title: string;
  studentName: string;
  date: string;
  ink: NotebookInk;
  style: NotebookStyle;
  showDate: boolean;
  showStudentName: boolean;
  showPageNumbers: boolean;
};

const esc = (s: string) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

// Rich renderer produces standard HTML — we just tag it with a class so the
// notebook CSS below styles paragraphs, lists, tables etc. on ruled lines.
function mdToBlocks(md: string): string {
  return `<div class="nb-body">${renderRichMarkdown(md)}</div>`;
}


export function buildNotebookDocument(markdown: string, meta: NotebookMeta): string {
  const bodyHtml = mdToBlocks(markdown);
  const inkColor = meta.ink === "black" ? "#111318" : "#0e2a6b";
  const fontFamily =
    meta.style === "natural"
      ? `'Caveat', 'Patrick Hand', cursive`
      : `'Patrick Hand', 'Kalam', cursive`;
  const fontSize = meta.style === "natural" ? "26px" : "22px";
  // Line ruling height in px — text must sit on these lines.
  const RULE = 36;

  const headerRow = `
    <header class="nb-header">
      <div class="nb-header-left">${meta.showStudentName && meta.studentName ? esc(meta.studentName) : ""}</div>
      <div class="nb-header-right">${meta.showDate && meta.date ? esc(meta.date) : ""}</div>
    </header>
  `;

  // Natural handwriting jitter — only applied to plain text nodes so KaTeX
  // formulas, tables and code blocks stay intact.
  const naturalScript = meta.style === "natural" ? `
    <script>
      (function () {
        function rand(a, b) { return a + Math.random() * (b - a); }
        var SKIP = new Set(['CODE','PRE','TABLE','THEAD','TBODY','TR','TH','TD','SVG','MATH']);
        var walker = document.createTreeWalker(document.querySelector('.nb-body'), NodeFilter.SHOW_TEXT, null);
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
  ` : "";


  return `<!doctype html><html><head>
<meta charset="utf-8">
<title>${esc(meta.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Patrick+Hand&family=Kalam:wght@400;700&display=swap">
${PRINT_HEAD_ASSETS}
<style>${PRINT_RICH_CSS}</style>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #d9d9d9; }
  body {
    font-family: ${fontFamily};
    font-size: ${fontSize};
    line-height: ${RULE}px;
    color: ${inkColor};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Each .page is a single A4 sheet. Browsers auto-break long content across
     pages, but each .page carries its own notebook look and shadow. */
  .page {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 12mm auto;
    padding: ${RULE * 2}px 18mm ${RULE * 2}px 28mm;
    background-color: #fdfdf7;
    background-image:
      /* red left margin rule */
      linear-gradient(to right,
        transparent 0,
        transparent 22mm,
        rgba(220, 50, 50, 0.55) 22mm,
        rgba(220, 50, 50, 0.55) calc(22mm + 1.2px),
        transparent calc(22mm + 1.2px)),
      /* horizontal ruled lines */
      repeating-linear-gradient(to bottom,
        transparent 0,
        transparent ${RULE - 2}px,
        rgba(70, 130, 200, 0.42) ${RULE - 2}px,
        rgba(70, 130, 200, 0.42) ${RULE - 1}px,
        transparent ${RULE - 1}px);
    background-attachment: local;
    box-shadow: 0 4px 18px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1);
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .nb-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 0 0 ${RULE}px;
    height: ${RULE}px;
    line-height: ${RULE}px;
    font-size: ${meta.style === "natural" ? "22px" : "18px"};
  }
  .nb-header-left, .nb-header-right { min-height: ${RULE}px; }

  .nb-title {
    text-align: center;
    font-size: ${meta.style === "natural" ? "34px" : "28px"};
    line-height: ${RULE * 2}px;
    height: ${RULE * 2}px;
    margin: 0 0 ${RULE}px;
    text-decoration: underline;
    text-underline-offset: 6px;
    font-weight: 600;
  }

  .nb-body p {
    margin: 0 0 ${RULE}px;
    padding: 0;
    text-align: left;
    line-height: ${RULE}px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .nb-body h1, .nb-body h2, .nb-body h3 {
    margin: 0 0 ${RULE / 2}px;
    padding: 0;
    line-height: ${RULE}px;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  .nb-body h1 { font-size: ${meta.style === "natural" ? "32px" : "26px"}; line-height: ${RULE * 2}px; }
  .nb-body h2 { font-size: ${meta.style === "natural" ? "28px" : "24px"}; }
  .nb-body h3 { font-size: ${meta.style === "natural" ? "26px" : "22px"}; font-style: italic; }
  .nb-body ul, .nb-body ol { margin: 0 0 ${RULE}px; padding-left: 30px; }
  .nb-body li { line-height: ${RULE}px; margin: 0; }

  /* Tables, code, math, mermaid — same rules everywhere. */
  .nb-body .table-wrap { overflow-x: auto; margin: 0 0 ${RULE}px; }
  .nb-body table.md-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Kalam', 'Patrick Hand', cursive;
    font-size: ${meta.style === "natural" ? "20px" : "18px"};
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .nb-body table.md-table th, .nb-body table.md-table td {
    border: 1.5px solid ${inkColor};
    padding: 6px 10px;
    line-height: 1.3;
    text-align: left;
    vertical-align: top;
  }
  .nb-body table.md-table th { font-weight: 700; background: rgba(0,0,0,0.04); }
  .nb-body table.md-table tr { page-break-inside: avoid; break-inside: avoid; }
  .nb-body pre.code-block {
    background: #fafaf3;
    border: 1px solid ${inkColor};
    border-radius: 4px;
    padding: 10px 12px;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 14px;
    line-height: 1.45;
    color: ${inkColor};
    overflow-x: auto;
    margin: 0 0 ${RULE}px;
    white-space: pre-wrap;
    word-wrap: break-word;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .nb-body code { font-family: 'Courier New', Consolas, monospace; }
  .nb-body .katex, .nb-body .katex-display { color: ${inkColor}; }
  .nb-body .katex-display {
    margin: 0.5em 0 ${RULE / 2}px;
    overflow-x: auto;
    overflow-y: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .nb-body .mermaid {
    text-align: center;
    margin: 0 0 ${RULE}px;
    padding: 8px;
    background: #ffffff;
    border: 1px solid ${inkColor};
    border-radius: 4px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .nb-body .mermaid svg { max-width: 100%; height: auto; }
  .nb-body strong { font-weight: 700; }
  .nb-body em { font-style: italic; }

  ${meta.showPageNumbers ? `
  .nb-pgnum {
    position: absolute;
    bottom: 12mm;
    right: 18mm;
    font-size: 16px;
    line-height: 1;
    color: ${inkColor};
    opacity: 0.75;
  }
  ` : ""}

  @media print {
    html, body { background: #fff; }
    .page { margin: 0 auto; box-shadow: none; }
  }
</style>
</head>
<body>
  <article class="nb-doc">
    <section class="page">
      ${headerRow}
      <h1 class="nb-title">${esc(meta.title)}</h1>
      ${bodyHtml}
      ${meta.showPageNumbers ? `<div class="nb-pgnum">Page 1</div>` : ""}
    </section>
  </article>

  <script>
    // Split overflowing content across multiple notebook pages so each printed
    // page keeps the ruled background and header. Runs after fonts load.
    (function () {
      function paginate() {
        var doc = document.querySelector('.nb-doc');
        if (!doc) return;
        var first = doc.querySelector('.page');
        if (!first) return;
        var PAGE_HEIGHT_PX = first.clientHeight;
        // If content already fits, done.
        if (first.scrollHeight <= PAGE_HEIGHT_PX + 2) return;

        var headerHTML = ${JSON.stringify(headerRow)};
        var showPageNumbers = ${meta.showPageNumbers ? "true" : "false"};

        // Rich markdown is wrapped in a <div class="nb-body"> — paginate its
        // children across additional pages, each with its own .nb-body wrapper
        // so the descendant CSS selectors keep matching.
        var pgNumEl = first.querySelector('.nb-pgnum');
        if (pgNumEl) pgNumEl.remove();
        var firstBody = first.querySelector('.nb-body');
        if (!firstBody) return;
        var contentNodes = [];
        while (firstBody.firstChild) {
          var n = firstBody.firstChild;
          if (n.nodeType === 1) contentNodes.push(n);
          firstBody.removeChild(n);
        }



        function newPage(pageNum) {
          var p = document.createElement('section');
          p.className = 'page';
          p.innerHTML = headerHTML + '<div class="nb-body"></div>';
          if (showPageNumbers) {
            var n = document.createElement('div');
            n.className = 'nb-pgnum';
            n.textContent = 'Page ' + pageNum;
            p.appendChild(n);
          }
          doc.appendChild(p);
          return p;
        }

        function fits(page) {
          return page.scrollHeight <= PAGE_HEIGHT_PX + 2;
        }

        function bodyOf(page) { return page.querySelector('.nb-body'); }

        var pageNum = 1;
        if (showPageNumbers) {
          var n = document.createElement('div');
          n.className = 'nb-pgnum';
          n.textContent = 'Page 1';
          first.appendChild(n);
        }
        var current = first;

        contentNodes.forEach(function (el) {
          var body = bodyOf(current);
          body.appendChild(el);
          if (!fits(current)) {
            body.removeChild(el);
            pageNum += 1;
            current = newPage(pageNum);
            bodyOf(current).appendChild(el);
          }
        });
      }

      function ready() {
        paginate();
        // Give KaTeX/mermaid a moment to render before opening the print dialog.
        setTimeout(function () { window.print(); }, 1200);
      }

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { setTimeout(ready, 100); });
      } else {
        window.addEventListener('load', ready);
      }
    })();
  </script>
  ${naturalScript}
</body></html>`;
}
