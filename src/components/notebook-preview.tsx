import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FileText, Info } from "lucide-react";
import { buildNotebookDocument, type NotebookMeta } from "@/lib/notebook-pdf";
import { cn } from "@/lib/utils";

type Mode = "multi" | "continuous";

const STORAGE_KEY = "assignmate.notebook-preview-mode";
const PAGE_WIDTH_PX = 794; // 210mm @ 96dpi
const INITIAL_PAGES = 3;

/**
 * Takes the exact document produced by the notebook PDF engine and adapts it
 * for on-screen preview: no print dialog, reports page count/height back to the
 * parent, and lets the parent show only N pages at a time.
 */
function toPreviewDocument(doc: string, mode: Mode): string {
  let out = doc.replace("window.print();", "");
  if (mode === "continuous") {
    // Skip splitting into sheets — one long page instead.
    out = out.replace(/\n\s*paginate\(\);/, "");
    out = out.replace(
      "</head>",
      `<style>.page{min-height:0 !important;page-break-after:auto;margin:0 auto !important;}</style></head>`,
    );
  }
  const bridge = `
<script>
(function () {
  function report() {
    try {
      window.parent.postMessage({
        __nb: true,
        type: 'meta',
        total: document.querySelectorAll('.nb-doc > .page').length,
        height: document.documentElement.scrollHeight
      }, '*');
    } catch (e) {}
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || !d.__nb || d.type !== 'show') return;
    var st = document.getElementById('nb-vis');
    if (!st) { st = document.createElement('style'); st.id = 'nb-vis'; document.head.appendChild(st); }
    st.textContent = d.n > 0 ? '.nb-doc > .page:nth-of-type(n+' + (d.n + 1) + '){display:none !important;}' : '';
    setTimeout(report, 60);
  });
  setTimeout(report, 400);
  setTimeout(report, 1500);
  setTimeout(report, 2600);
})();
<\/script>`;
  return out.replace("</body>", `${bridge}</body>`);
}

export function NotebookPreview({ markdown, meta }: { markdown: string; meta: NotebookMeta }) {
  const [mode, setMode] = useState<Mode>("multi");
  const [visible, setVisible] = useState(INITIAL_PAGES);
  const [total, setTotal] = useState(0);
  const [height, setHeight] = useState(600);
  const [scale, setScale] = useState(0.5);
  const [ready, setReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "multi" || saved === "continuous") setMode(saved);
  }, []);

  const pickMode = useCallback((m: Mode) => {
    setMode(m);
    setReady(false);
    setVisible(INITIAL_PAGES);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const srcDoc = useMemo(
    () => toPreviewDocument(buildNotebookDocument(markdown, meta), mode),
    [markdown, meta, mode],
  );

  // Fit the A4 sheet into the available width.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, el.clientWidth / PAGE_WIDTH_PX));
    });
    ro.observe(el);
    setScale(Math.min(1, el.clientWidth / PAGE_WIDTH_PX));
    return () => ro.disconnect();
  }, []);

  // Listen for page count / height from the preview document.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data as { __nb?: boolean; type?: string; total?: number; height?: number };
      if (!d || !d.__nb || d.type !== "meta") return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (typeof d.total === "number") setTotal(d.total);
      if (typeof d.height === "number") setHeight(Math.max(200, d.height));
      setReady(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Tell the document how many pages to show.
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ __nb: true, type: "show", n: mode === "multi" ? visible : 0 }, "*");
  }, [visible, mode, ready]);

  // Lazy-load more pages as the user scrolls to the bottom of the preview.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || mode !== "multi") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        setVisible((v) => (total && v >= total ? v : v + 2));
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [mode, total]);

  const remaining = Math.max(0, total - (mode === "multi" ? Math.min(visible, total) : total));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-sm font-medium">How would you like to preview your notebook?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === "multi"}
            onClick={() => pickMode("multi")}
            icon={<BookOpen className="h-5 w-5" />}
            title="Multi-Page Notebook"
            badge="Recommended"
            description="Preview real notebook pages exactly as they will appear in the exported PDF."
          />
          <ModeCard
            active={mode === "continuous"}
            onClick={() => pickMode("continuous")}
            icon={<FileText className="h-5 w-5" />}
            title="Continuous Page"
            description="Show the notebook as one long scrolling page."
          />
        </div>
      </div>

      <div
        key={mode}
        className="animate-in fade-in zoom-in-95 duration-300 rounded-xl border border-white/10 bg-background/40 p-3"
      >
        <div className="max-h-[52vh] overflow-y-auto rounded-lg" style={{ scrollBehavior: "smooth" }}>
          <div ref={shellRef} className="relative w-full">
            <div
              style={{ height: height * scale, transition: "height 250ms ease" }}
              className={cn("relative w-full overflow-hidden", !ready && "opacity-0")}
            >
              <iframe
                ref={iframeRef}
                title="Notebook preview"
                srcDoc={srcDoc}
                sandbox="allow-scripts"
                scrolling="no"
                style={{
                  width: PAGE_WIDTH_PX,
                  height,
                  border: 0,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              />
            </div>
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center py-16 text-sm text-muted-foreground">
                Rendering notebook pages…
              </div>
            )}
            <div ref={sentinelRef} className="h-px w-full" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          This is a preview. The downloaded Notebook PDF contains all pages.
        </span>
        {mode === "multi" && remaining > 0 && (
          <span className="rounded-full border border-white/10 bg-primary/10 px-2.5 py-1 text-primary">
            +{remaining} more {remaining === 1 ? "page" : "pages"} in PDF
          </span>
        )}
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  badge,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200",
        active
          ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", active ? "text-primary" : "text-muted-foreground")}>{icon}</span>
      <span className="min-w-0 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {badge && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              {badge}
            </span>
          )}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn(
          "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border transition-colors",
          active ? "border-primary bg-primary" : "border-white/25",
        )}
      />
    </button>
  );
}
