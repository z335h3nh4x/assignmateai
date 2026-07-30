// Builds a notebook-style HTML document for printing to PDF.
// Text stays selectable — the notebook look is pure HTML/CSS.

import {
  renderRichMarkdown,
  PRINT_HEAD_ASSETS,
  PRINT_RICH_CSS,
} from "./render-markdown";

export type NotebookInk = "blue" | "black";
export type NotebookStyle = "clean" | "natural" | "cursive" | "exam" | "neat";
export type NotebookTemplate = "ruled" | "classic_school";

type StyleProfile = {
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

const STYLE_PROFILES: Record<NotebookStyle, StyleProfile> = {
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


export type NotebookMeta = {
  title: string;
  studentName: string;
  date: string;
  ink: NotebookInk;
  style: NotebookStyle;
  showDate: boolean;
  showStudentName: boolean;
  showPageNumbers: boolean;
  /** Built-in paper template. Defaults to the CSS-drawn ruled paper. */
  template?: NotebookTemplate;
  /** Absolute URL of the template background image (used by image templates). */
  backgroundUrl?: string;
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
  const profile = STYLE_PROFILES[meta.style] ?? STYLE_PROFILES.clean;
  const fontFamily = profile.fontFamily;
  const fontSize = profile.fontSize;
  // Line ruling height in px — text must sit on these lines.
  const RULE = 36;
  // Built-in image-based paper templates keep every page independent: the
  // image paints from the top-left of each .page box, never scrolls or tiles.
  const paperUrl = meta.backgroundUrl ?? "";
  const useImagePaper = meta.template === "classic_school" && !!paperUrl;
  

  const headerRow = `
    <header class="nb-header">
      <div class="nb-header-left">${meta.showStudentName && meta.studentName ? esc(meta.studentName) : ""}</div>
      <div class="nb-header-right">${meta.showDate && meta.date ? esc(meta.date) : ""}</div>
    </header>
  `;

  // Natural handwriting jitter — only applied to plain text nodes so KaTeX
  // formulas, tables and code blocks stay intact.
  const naturalScript = profile.jitter ? `
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Patrick+Hand&family=Kalam:wght@400;700&family=Dancing+Script:wght@400;600&family=Reenie+Beanie&family=Architects+Daughter&display=swap">
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
${useImagePaper ? `
    background-color: #ffffff;
    background-image: url("${paperUrl}");
    background-repeat: no-repeat;
    background-position: 0 0;
    background-origin: border-box;
    background-size: cover;
` : `
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
    background-position: 0 0, 0 0;
`}

    box-shadow: 0 4px 18px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1);
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: hidden;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .page:last-child { page-break-after: auto; }


  .nb-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 0 0 ${RULE}px;
    height: ${RULE}px;
    line-height: ${RULE}px;
    font-size: ${profile.headerSize};
  }
  .nb-header-left, .nb-header-right { min-height: ${RULE}px; }

  .nb-title {
    text-align: center;
    font-size: ${profile.titleSize};
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
  .nb-body h1 { font-size: ${profile.h1}; line-height: ${RULE * 2}px; }
  .nb-body h2 { font-size: ${profile.h2}; }
  .nb-body h3 { font-size: ${profile.h3}; font-style: italic; }
  .nb-body ul, .nb-body ol { margin: 0 0 ${RULE}px; padding-left: 30px; }
  .nb-body li { line-height: ${RULE}px; margin: 0; }

  /* Tables, code, math, mermaid — same rules everywhere. */
  .nb-body .table-wrap { overflow-x: auto; margin: 0 0 ${RULE}px; }
  .nb-body table.md-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Kalam', 'Patrick Hand', cursive;
    font-size: ${profile.tableSize};
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
    /* Exact A4 height keeps each sheet a single unfragmented box, so its
       background layer paints in full on every printed page. */
    .page { margin: 0; box-shadow: none; height: 297mm; min-height: 297mm; width: 210mm; }
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
      // Measure the printable content height of ONE empty A4 notebook sheet.
      // Must be done with a probe page that is NOT expanded by content.
      function measurePrintableHeight(doc) {
        var probe = document.createElement('section');
        probe.className = 'page';
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.left = '-10000px';
        probe.style.top = '0';
        probe.style.height = '297mm';
        probe.style.minHeight = '297mm';
        probe.style.maxHeight = '297mm';
        probe.innerHTML = '';
        doc.appendChild(probe);
        // clientHeight excludes borders/scrollbars and includes padding, so
        // subtract padding to get the usable content box.
        var cs = getComputedStyle(probe);
        var h = probe.clientHeight
          - parseFloat(cs.paddingTop || '0')
          - parseFloat(cs.paddingBottom || '0');
        probe.remove();
        return h;
      }

      function paginate() {
        var doc = document.querySelector('.nb-doc');
        if (!doc) return;
        var first = doc.querySelector('.page');
        if (!first) return;

        var LIMIT = measurePrintableHeight(doc);
        if (!(LIMIT > 0)) return;

        var headerHTML = ${JSON.stringify(headerRow)};
        var showPageNumbers = ${meta.showPageNumbers ? "true" : "false"};

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

        function bodyOf(page) { return page.querySelector('.nb-body'); }

        // Used height = sum of the page's direct children boxes (header, body,
        // page number), compared against ONE sheet's printable area.
        function usedHeight(page) {
          var total = 0;
          Array.prototype.forEach.call(page.children, function (c) {
            var r = c.getBoundingClientRect();
            var cs = getComputedStyle(c);
            total += r.height
              + parseFloat(cs.marginTop || '0')
              + parseFloat(cs.marginBottom || '0');
          });
          return total;
        }

        function fits(page) { return usedHeight(page) <= LIMIT + 2; }

        var pageNum = 1;
        if (showPageNumbers) {
          var n0 = document.createElement('div');
          n0.className = 'nb-pgnum';
          n0.textContent = 'Page 1';
          first.appendChild(n0);
        }
        var current = first;

        contentNodes.forEach(function (el) {
          var body = bodyOf(current);
          body.appendChild(el);
          if (!fits(current) && body.children.length > 1) {
            body.removeChild(el);
            pageNum += 1;
            current = newPage(pageNum);
            bodyOf(current).appendChild(el);
          }
        });

        var totalContent = 0;
        contentNodes.forEach(function (el) {
          var r = el.getBoundingClientRect();
          totalContent += r.height;
        });
        console.log('Printable height per sheet:', LIMIT);
        console.log('Expected pages (approx):', Math.max(1, Math.ceil(totalContent / LIMIT)));
        console.log('Created pages:', pageNum);
        console.log('Final .page count:', document.querySelectorAll('.page').length);
      }


      function raf() {
        return new Promise(function (r) { requestAnimationFrame(function () { r(); }); });
      }

      function allImagesLoaded() {
        var imgs = Array.prototype.slice.call(document.images);
        return Promise.all(imgs.map(function (img) {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(function (r) {
            img.addEventListener('load', function () { r(); }, { once: true });
            img.addEventListener('error', function () { r(); }, { once: true });
          });
        }));
      }

      // Background images live in CSS, not the DOM — decode them explicitly.
      function backgroundsPainted() {
        var urls = [];
        document.querySelectorAll('.page').forEach(function (el) {
          var bg = getComputedStyle(el).backgroundImage || '';
          var re = /url\\((['"]?)(.*?)\\1\\)/g, m;
          while ((m = re.exec(bg))) { if (m[2]) urls.push(m[2]); }
        });
        return Promise.all(urls.map(function (u) {
          return new Promise(function (r) {
            var i = new Image();
            i.onload = function () { r(); };
            i.onerror = function () { r(); };
            i.src = u;
          });
        }));
      }

      // Resolves once the DOM stops mutating for two consecutive frames —
      // covers async KaTeX/mermaid rendering without a fixed delay.
      function domSettled() {
        return new Promise(function (resolve) {
          var dirty = true;
          var obs = new MutationObserver(function () { dirty = true; });
          obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
          (function tick() {
            if (!dirty) { obs.disconnect(); resolve(); return; }
            dirty = false;
            requestAnimationFrame(function () { requestAnimationFrame(tick); });
          })();
        });
      }

      function pagesReady() {
        var pages = document.querySelectorAll('.page');
        if (!pages.length) return false;
        for (var i = 0; i < pages.length; i++) {
          if (!(pages[i].getBoundingClientRect().height > 0)) return false;
        }
        return true;
      }

      async function ready() {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await domSettled();
        paginate();
        await domSettled();
        await allImagesLoaded();
        await backgroundsPainted();
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await raf();
        await raf();
        // Final guard: never print before every page has a real height.
        for (var attempt = 0; attempt < 60 && !pagesReady(); attempt++) await raf();
        window.print();
      }

      if (document.readyState === 'complete') {
        ready();
      } else {
        window.addEventListener('load', function () { ready(); });
      }

    })();
  </script>
  ${naturalScript}
</body></html>`;
}
