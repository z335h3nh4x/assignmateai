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

  const naturalScript = meta.style === "natural" ? `
    <script>
      (function () {
        function rand(a, b) { return a + Math.random() * (b - a); }
        var nodes = document.querySelectorAll('.nb-p, .nb-h1, .nb-h2, .nb-h3, .nb-ul li, .nb-ol li, .nb-title, .nb-header-left, .nb-header-right, .nb-table td, .nb-table th');
        nodes.forEach(function (n) {
          var text = n.textContent || '';
          if (!text.trim()) return;
          // Split into words, wrap each with a span carrying tiny random transforms.
          var frag = document.createDocumentFragment();
          var parts = text.split(/(\\s+)/);
          parts.forEach(function (p) {
            if (/^\\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span');
            s.textContent = p;
            var r = rand(-0.8, 0.8);
            var y = rand(-1.2, 1.2);
            var w = rand(0.97, 1.03);
            var o = rand(0.85, 1);
            s.style.display = 'inline-block';
            s.style.transform = 'translateY(' + y.toFixed(2) + 'px) rotate(' + r.toFixed(2) + 'deg)';
            s.style.letterSpacing = (rand(-0.3, 0.6)).toFixed(2) + 'px';
            s.style.fontWeight = Math.random() < 0.15 ? '600' : '400';
            s.style.opacity = o.toFixed(2);
            s.style.fontStretch = (w * 100).toFixed(0) + '%';
            frag.appendChild(s);
          });
          n.textContent = '';
          n.appendChild(frag);
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

        // Move content nodes after the initial header + title into a queue.
        var titleEl = first.querySelector('.nb-title');
        var pgNumEl = first.querySelector('.nb-pgnum');
        if (pgNumEl) pgNumEl.remove();
        var contentNodes = [];
        var node = titleEl ? titleEl.nextSibling : first.firstChild;
        while (node) {
          var next = node.nextSibling;
          if (node.nodeType === 1) contentNodes.push(node);
          first.removeChild(node);
          node = next;
        }

        function newPage(pageNum) {
          var p = document.createElement('section');
          p.className = 'page';
          p.innerHTML = headerHTML;
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

        var pageNum = 1;
        if (showPageNumbers) {
          var n = document.createElement('div');
          n.className = 'nb-pgnum';
          n.textContent = 'Page 1';
          first.appendChild(n);
        }
        var current = first;

        contentNodes.forEach(function (el) {
          // Insert before page number so it stays at the bottom.
          var pg = current.querySelector('.nb-pgnum');
          if (pg) current.insertBefore(el, pg); else current.appendChild(el);
          if (!fits(current)) {
            current.removeChild(el);
            pageNum += 1;
            current = newPage(pageNum);
            var pg2 = current.querySelector('.nb-pgnum');
            if (pg2) current.insertBefore(el, pg2); else current.appendChild(el);
            // If a single element is taller than a page (huge table/paragraph),
            // let the browser handle it naturally — keep it on this page.
          }
        });
      }

      function ready() {
        paginate();
        setTimeout(function () { window.print(); }, 400);
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
