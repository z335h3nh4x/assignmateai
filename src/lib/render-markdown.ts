// Shared rich Markdown renderer used by the on-screen preview, academic PDF
// export, notebook PDF export and DOCX export.
//
// Features:
//   - GitHub-flavoured Markdown (tables, fenced code, task lists, autolinks)
//   - LaTeX math via KaTeX ($inline$ and $$block$$)
//   - Syntax-highlighted code blocks via highlight.js
//   - ```mermaid fences pass through as <div class="mermaid"> for diagrams
//
// Consumers must ALSO load the matching stylesheets (see PRINT_HEAD_ASSETS).
import { Marked } from "marked";
import markedKatex from "marked-katex-extension";
import hljs from "highlight.js";

const marked = new Marked({
  gfm: true,
  breaks: false,
  async: false,
});

marked.use(
  markedKatex({
    throwOnError: false,
    output: "html",
    nonStandard: true,
  }) as unknown as Parameters<typeof marked.use>[0],
);

// Syntax highlighting + mermaid pass-through
marked.use({
  renderer: {
    code(this: unknown, token: { text: string; lang?: string }) {
      const lang = (token.lang ?? "").trim().toLowerCase();
      const code = token.text ?? "";
      if (lang === "mermaid") {
        return `<div class="mermaid">${escapeHtml(code)}</div>`;
      }
      let highlighted = escapeHtml(code);
      let langClass = "";
      if (lang && hljs.getLanguage(lang)) {
        try {
          highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
          langClass = ` language-${lang} hljs`;
        } catch {
          /* fall back to escaped */
        }
      } else if (code.trim()) {
        try {
          const auto = hljs.highlightAuto(code);
          highlighted = auto.value;
          langClass = ` hljs${auto.language ? ` language-${auto.language}` : ""}`;
        } catch {
          /* ignore */
        }
      }
      return `<pre class="code-block"><code class="${langClass.trim()}">${highlighted}</code></pre>`;
    },
    table(this: unknown, token: { header: Array<{ text: string }>; rows: Array<Array<{ text: string }>> }) {
      const headHtml = token.header.map((c) => `<th>${marked.parseInline(c.text) as string}</th>`).join("");
      const bodyHtml = token.rows
        .map((row) => `<tr>${row.map((c) => `<td>${marked.parseInline(c.text) as string}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="table-wrap"><table class="md-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
    },
  },
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/**
 * Tokenizer-based math preprocessor.
 *
 * The Markdown document is scanned once into a sequence of tokens:
 *   - fenced code blocks (```...```)
 *   - inline code spans (`...`)
 *   - display math ($$...$$ or \[...\])
 *   - inline math   ($...$   or \(...\))
 *   - plain text (everything else, byte-for-byte preserved)
 *
 * ONLY math tokens are ever rewritten (delimiter normalization + inline→display
 * promotion when the expression is heavy or when consecutive named equations
 * are chained). Text/code tokens are emitted verbatim. Blank lines around
 * display math are added by appending "\n\n" between tokens — never by
 * splicing characters into headings, bold, lists, tables, blockquotes, etc.
 *
 * This fixes the class of bugs where the previous regex-based preprocessor
 * merged `**bold**` with `$$...$$` producing garbage like `**...for$$`.
 */
type MathTok =
  | { type: "text"; value: string }
  | { type: "code_fence"; value: string }
  | { type: "code_inline"; value: string }
  | { type: "math_inline"; value: string }
  | { type: "math_display"; value: string };

function tokenizeForMath(md: string): MathTok[] {
  const toks: MathTok[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      toks.push({ type: "text", value: buf });
      buf = "";
    }
  };
  let i = 0;
  const n = md.length;

  while (i < n) {
    const c = md[i];
    const prev = i > 0 ? md[i - 1] : "";

    // fenced code block ```
    if (c === "`" && md.startsWith("```", i)) {
      const end = md.indexOf("```", i + 3);
      if (end !== -1) {
        flush();
        toks.push({ type: "code_fence", value: md.slice(i, end + 3) });
        i = end + 3;
        continue;
      }
    }

    // inline code (any run of backticks) — never treat contents as math
    if (c === "`") {
      let run = 0;
      while (md[i + run] === "`") run++;
      const marker = "`".repeat(run);
      const end = md.indexOf(marker, i + run);
      if (end !== -1) {
        flush();
        toks.push({ type: "code_inline", value: md.slice(i, end + run) });
        i = end + run;
        continue;
      }
    }

    // display math \[ ... \]
    if (c === "\\" && md[i + 1] === "[") {
      const end = md.indexOf("\\]", i + 2);
      if (end !== -1) {
        flush();
        toks.push({ type: "math_display", value: md.slice(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }

    // inline math \( ... \)
    if (c === "\\" && md[i + 1] === "(") {
      const end = md.indexOf("\\)", i + 2);
      if (end !== -1) {
        flush();
        toks.push({ type: "math_inline", value: md.slice(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }

    // display math $$ ... $$
    if (c === "$" && md[i + 1] === "$" && prev !== "\\") {
      const end = md.indexOf("$$", i + 2);
      if (end !== -1) {
        flush();
        toks.push({ type: "math_display", value: md.slice(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }

    // inline math $ ... $ (skip escaped \$; require non-empty content;
    // stop at blank line to avoid runaway matches on stray dollar signs)
    if (c === "$" && prev !== "\\") {
      let j = i + 1;
      let ok = false;
      while (j < n) {
        const cj = md[j];
        if (cj === "\n" && md[j + 1] === "\n") break;
        if (cj === "$" && md[j - 1] !== "\\") {
          ok = true;
          break;
        }
        j++;
      }
      if (ok) {
        const inner = md.slice(i + 1, j);
        // Only accept if it plausibly looks like math (has a LaTeX construct
        // or an operator / identifier without leading/trailing whitespace).
        // This avoids swallowing pairs of currency dollars in prose.
        const looksLikeMath =
          inner.trim().length > 0 &&
          (/\\[A-Za-z]+|[_^={}]|\\\\/.test(inner) ||
            /^\S.*\S$/.test(inner) ||
            /^\S$/.test(inner));
        if (looksLikeMath) {
          flush();
          toks.push({ type: "math_inline", value: inner.trim() });
          i = j + 1;
          continue;
        }
      }
    }

    buf += c;
    i++;
  }
  flush();
  return toks;
}

function isHeavyMath(expr: string): boolean {
  return (
    /\\begin\{|\\end\{|\\frac|\\sum|\\int|\\prod|\\lim|\\sqrt|\\left|\\right|\\\\|&/.test(
      expr,
    ) || expr.length > 60
  );
}

function transformMathTokens(toks: MathTok[]): MathTok[] {
  // 1. Promote heavy inline math to display.
  for (const t of toks) {
    if (t.type === "math_inline" && isHeavyMath(t.value)) {
      (t as MathTok).type = "math_display";
    }
  }

  // 2. Detect chains of named equations separated only by whitespace text:
  //    $M_1 = ...$ $M_2 = ...$ $M_3 = ...$  → each becomes display math.
  let i = 0;
  while (i < toks.length) {
    if (toks[i].type === "math_inline" && toks[i].value.includes("=")) {
      const group: number[] = [i];
      let j = i + 1;
      while (j < toks.length) {
        const t = toks[j];
        if (t.type === "text" && /^[ \t\r\n]+$/.test(t.value)) {
          j++;
          continue;
        }
        if (t.type === "math_inline" && t.value.includes("=")) {
          group.push(j);
          j++;
          continue;
        }
        break;
      }
      if (group.length >= 2) {
        for (const idx of group) {
          (toks[idx] as MathTok).type = "math_display";
        }
        i = j;
        continue;
      }
    }
    i++;
  }
  return toks;
}

function serializeMathTokens(toks: MathTok[]): string {
  let out = "";
  const ensureBlankLineBefore = () => {
    if (out.length === 0) return;
    if (out.endsWith("\n\n")) return;
    if (out.endsWith("\n")) out += "\n";
    else out += "\n\n";
  };

  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    switch (t.type) {
      case "text":
      case "code_fence":
      case "code_inline":
        out += t.value;
        break;
      case "math_inline":
        out += `$${t.value}$`;
        break;
      case "math_display": {
        ensureBlankLineBefore();
        out += `$$\n${t.value}\n$$`;
        // Trim trailing inline whitespace + optional single newline from the
        // very next text token so we control the paragraph gap ourselves.
        const next = toks[k + 1];
        if (next && next.type === "text") {
          next.value = next.value.replace(/^[ \t]*\n?[ \t]*/, "");
        }
        out += "\n\n";
        break;
      }
    }
  }
  return out;
}

export function preprocessMathLayout(md: string): string {
  const toks = tokenizeForMath(md);
  const transformed = transformMathTokens(toks);
  return serializeMathTokens(transformed);
}

export function renderRichMarkdown(md: string): string {
  if (!md) return "";
  const normalised = preprocessMathLayout(md);
  return marked.parse(normalised) as string;
}

// CDN assets to inject into a fresh print window so KaTeX / highlight.js /
// mermaid render correctly there. Kept in one place so every export uses the
// same versions.
export const KATEX_CSS_CDN =
  "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
export const HLJS_CSS_CDN_LIGHT =
  "https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css";
export const MERMAID_JS_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";

/** Common CSS to make rich content (tables, code, math, diagrams) look good in printed PDFs. */
export const PRINT_RICH_CSS = `
  .table-wrap { overflow-x: auto; margin: 0.6em 0 1em; }
  table.md-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95em;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  table.md-table th, table.md-table td {
    border: 1px solid #333;
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
    text-indent: 0;
  }
  table.md-table th { background: #f0f0f0; font-weight: 700; }
  table.md-table tr { page-break-inside: avoid; break-inside: avoid; }
  pre.code-block {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    padding: 10px 12px;
    overflow-x: auto;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 10.5pt;
    line-height: 1.45;
    page-break-inside: avoid;
    break-inside: avoid;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 0.92em; }
  p > code, li > code {
    background: #f0f0f0; padding: 1px 5px; border-radius: 3px;
  }
  .katex-display {
    margin: 1.3em 0 1.4em;
    padding: 0.15em 0;
    overflow-x: auto;
    overflow-y: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .katex-display + .katex-display { margin-top: 0.6em; }
  .katex-display + p, p + .katex-display { margin-top: 0.9em; }
  .katex { font-size: 1.05em; }
  .katex .mtable, .katex .array { margin: 0.2em 0; }
  .mermaid {
    text-align: center;
    margin: 1em 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .mermaid svg { max-width: 100%; height: auto; }
`;

/** <head> snippet: KaTeX + highlight.js CSS + mermaid boot script. */
export const PRINT_HEAD_ASSETS = `
  <link rel="stylesheet" href="${KATEX_CSS_CDN}">
  <link rel="stylesheet" href="${HLJS_CSS_CDN_LIGHT}">
  <script src="${MERMAID_JS_CDN}"></script>
  <script>
    window.addEventListener('DOMContentLoaded', function () {
      if (window.mermaid) {
        try {
          window.mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
          window.mermaid.run({ querySelector: '.mermaid' }).catch(function(){});
        } catch (e) { /* ignore */ }
      }
    });
  </script>
`;
