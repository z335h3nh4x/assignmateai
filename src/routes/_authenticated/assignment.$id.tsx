import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Download, RefreshCw, FileText, Loader2, Pencil, Eye, BookOpen, AlertTriangle, Lock,
} from "lucide-react";
import { useFeature } from "@/lib/use-plan-features";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AssignmentAssistant, AutosaveEditor } from "@/components/assignment-assistant";
import { PromoCard } from "@/components/promo-card";
import { incrementExport, saveAssignmentDraft } from "@/lib/assignments.functions";
import { buildNotebookDocument, type NotebookInk, type NotebookStyle } from "@/lib/notebook-pdf";
import {
  renderRichMarkdown,
  PRINT_HEAD_ASSETS,
  PRINT_RICH_CSS,
} from "@/lib/render-markdown";

export const Route = createFileRoute("/_authenticated/assignment/$id")({
  head: () => ({ meta: [{ title: "Assignment — Assignmate" }] }),
  component: AssignmentView,
});


function downloadFile(name: string, mime: string, content: string | Blob) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// Split off "References" section (## References or # References at end)
// and inject stable ids into every heading so the TOC and internal anchors work.
function renderAcademicMarkdown(md: string) {
  let body = md;
  let referencesMd = "";
  const refMatch = md.match(/\n\s*#{1,3}\s*references\s*\n([\s\S]*)$/i);
  if (refMatch) {
    body = md.slice(0, refMatch.index);
    referencesMd = refMatch[1].trim();
  }

  const bodyRaw = renderRichMarkdown(body.trim());
  const referencesRaw = referencesMd ? renderRichMarkdown(referencesMd) : "";

  const outline: { level: number; text: string; id: string }[] = [];
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "s";
  const seen = new Map<string, number>();
  const uniq = (base: string) => {
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };

  const bodyHtml = bodyRaw.replace(
    /<h([1-3])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g,
    (_full, lvl: string, attrs: string | undefined, inner: string) => {
      const level = Number(lvl);
      const text = inner.replace(/<[^>]+>/g, "").trim();
      const id = uniq(slug(text));
      outline.push({ level, text, id });
      return `<h${lvl}${attrs ?? ""} id="${id}">${inner}</h${lvl}>`;
    },
  );

  return { bodyHtml, referencesHtml: referencesRaw, outline };
}

type AcademicMeta = {
  title: string;
  studentName: string;
  institution: string;
  subject: string;
  date: string;
};



function buildAcademicDocument(md: string, meta: AcademicMeta) {
  const { bodyHtml, referencesHtml, outline } = renderAcademicMarkdown(md);
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

  const wordCount = md.split(/\s+/).filter(Boolean).length;
  // Show TOC only when there is meaningful structure and length
  const tocEntries = outline.filter((o) => o.level <= 3);
  const showToc = wordCount >= 1200 && tocEntries.filter((o) => o.level === 2).length >= 3;

  const tocHtml = showToc
    ? `<section class="toc">
        <h2 class="centered">Table of Contents</h2>
        <ol>
          ${tocEntries
            .map(
              (o) =>
                `<li class="lvl-${o.level}"><a href="#${o.id}">${esc(o.text)}</a></li>`,
            )
            .join("")}
          ${referencesHtml ? `<li class="lvl-2"><a href="#references">References</a></li>` : ""}
        </ol>
      </section>`
    : "";

  const metaRows = [
    meta.studentName && `<div><span class="lbl">Submitted by</span><span class="val">${esc(meta.studentName)}</span></div>`,
    meta.subject && `<div><span class="lbl">Subject</span><span class="val">${esc(meta.subject)}</span></div>`,
    meta.institution && `<div><span class="lbl">Institution</span><span class="val">${esc(meta.institution)}</span></div>`,
    `<div><span class="lbl">Date</span><span class="val">${esc(meta.date)}</span></div>`,
  ].filter(Boolean).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title> </title>
${PRINT_HEAD_ASSETS}
<style>${PRINT_RICH_CSS}</style>
<style>
  @page {
    size: Letter;
    margin: 1in;
    @top-left { content: ""; }
    @top-center { content: ""; }
    @top-right { content: ""; }
    @bottom-center {
      content: counter(page);
      font-family: "Times New Roman", Times, serif;
      font-size: 10pt;
      color: #000;
    }
  }
  @page :first {
    @bottom-center { content: ""; }
  }
  html, body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  h1, h2, h3, h4 { font-family: "Times New Roman", Times, serif; font-weight: bold; page-break-after: avoid; break-after: avoid; }
  h1 { font-size: 16pt; margin: 1.1em 0 0.5em; }
  h2 { font-size: 13.5pt; margin: 1em 0 0.4em; }
  h3 { font-size: 12pt; margin: 0.8em 0 0.3em; font-style: italic; font-weight: bold; }
  p  { text-align: justify; text-justify: inter-word; margin: 0 0 0.55em; text-indent: 0.4in; hyphens: auto; orphans: 3; widows: 3; }
  p:first-of-type, h1 + p, h2 + p, h3 + p { text-indent: 0; }
  ul, ol { margin: 0.3em 0 0.7em 0.4in; padding: 0; }
  li { margin: 0.15em 0; text-align: justify; }
  a { color: #000; text-decoration: none; }

  /* Title page */
  .title-page {
    min-height: 8.5in;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    page-break-after: always;
    break-after: page;
  }
  .title-page .assignment-label {
    font-size: 12pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 1.5em;
  }
  .title-page h1.doc-title {
    font-size: 24pt;
    line-height: 1.3;
    margin: 0 0 2em;
    max-width: 6in;
  }
  .title-meta { margin-top: 2em; line-height: 1.9; font-size: 12pt; }
  .title-meta > div { display: block; }
  .title-meta .lbl { display: block; text-transform: uppercase; letter-spacing: 0.15em; font-size: 9pt; color: #555; }
  .title-meta .val { display: block; font-size: 13pt; margin-bottom: 0.6em; }

  /* Table of contents */
  .toc { page-break-after: always; break-after: page; }
  .toc h2.centered { text-align: center; margin-bottom: 1.5em; }
  .toc ol { list-style: none; margin: 0; padding: 0; }
  .toc li { margin: 0.3em 0; }
  .toc li.lvl-3 { padding-left: 0.4in; }
  .toc a { display: block; }

  /* Main content: keep flow tight, only force a break for references */
  main.content { page-break-after: avoid; }

  /* References */
  .references { page-break-before: always; break-before: page; }
  .references h2 { text-align: center; margin-bottom: 1em; }
  .references p { text-indent: -0.4in; padding-left: 0.4in; text-align: left; }

  @media screen {
    body { max-width: 7in; margin: 0.5in auto; padding: 1in; box-shadow: 0 0 20px rgba(0,0,0,.15); }
  }
</style>
</head>
<body>
  <section class="title-page">
    <div class="assignment-label">Academic Assignment</div>
    <h1 class="doc-title">${esc(meta.title)}</h1>
    <div class="title-meta">${metaRows}</div>
  </section>

  ${tocHtml}

  <main class="content">
    ${bodyHtml}
  </main>

  ${referencesHtml ? `<section class="references"><h2 id="references">References</h2>${referencesHtml}</section>` : ""}

  <script>
    document.title = " ";
    // Wait for KaTeX/highlight.js CSS + mermaid diagrams to settle before printing.
    window.addEventListener('load', () => setTimeout(() => window.print(), 1200));
  </script>
</body></html>`;
}


function AssignmentView() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const saveDraftFn = useServerFn(saveAssignmentDraft);
  const incrementExportFn = useServerFn(incrementExport);
  const [regenerating, setRegenerating] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pdfMeta, setPdfMeta] = useState({
    studentName: "",
    institution: "",
    subject: "",
    date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
  });
  const [notebookMeta, setNotebookMeta] = useState({
    studentName: "",
    date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    ink: "blue" as NotebookInk,
    style: "clean" as NotebookStyle,
    showDate: true,
    showStudentName: true,
    showPageNumbers: true,
  });

  const pdfFeature = useFeature("pdf_export");
  const notebookFeature = useFeature("notebook_pdf");
  const docxFeature = useFeature("docx_export");


  const { data: row, isLoading } = useQuery({
    queryKey: ["assignment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignments").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data && q.state.data.status === "generating" ? 2000 : false),
  });

  type QStatus = { id: string; text: string; status: "pending" | "completed" | "failed"; attempts: number; error?: string };
  const questionStatuses = (row?.question_statuses as QStatus[] | null | undefined) ?? [];
  const missingQuestions = questionStatuses.filter((q) => q.status !== "completed");
  const hasMissing = missingQuestions.length > 0;
  const canExport = !!row?.result && !hasMissing;

  function guardExport(fn: () => void) {
    if (!canExport) {
      toast.error(
        hasMissing
          ? `Cannot export — missing answers for ${missingQuestions.map((q) => q.id).join(", ")}. Regenerate first.`
          : "Assignment has no content yet.",
      );
      return;
    }
    fn();
  }

  async function trackExport() {
    try { await incrementExportFn({ data: { id } }); } catch { /* non-blocking */ }
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  const html = useMemo(() => (row?.result ? renderRichMarkdown(row.result) : ""), [row?.result]);
  const previewRef = useRef<HTMLElement | null>(null);

  // Render mermaid diagrams in the on-screen preview when content changes.
  useEffect(() => {
    if (!html || !previewRef.current) return;
    const el = previewRef.current;
    if (!el.querySelector(".mermaid")) return;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        if (cancelled) return;
        mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
        await mermaid.run({ nodes: el.querySelectorAll<HTMLElement>(".mermaid") });
      } catch {
        /* silently ignore diagram failures — the raw code stays visible */
      }
    })();
    return () => { cancelled = true; };
  }, [html]);

  function copy() {
    if (!row?.result) return;
    navigator.clipboard.writeText(row.result);
    toast.success("Copied to clipboard");
    void trackExport();
  }


  function downloadPdf() {
    if (!row?.result) return;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Popup blocked — allow popups to export PDF");
    const doc = buildAcademicDocument(row.result, {
      title: row.title,
      studentName: pdfMeta.studentName.trim(),
      institution: pdfMeta.institution.trim(),
      subject: pdfMeta.subject.trim(),
      date: pdfMeta.date.trim() || new Date().toLocaleDateString(),
    });
    w.document.open();
    w.document.write(doc);
    w.document.close();
    setPdfOpen(false);
    void trackExport();
  }

  function downloadDocx() {
    if (!row?.result) return;
    const body = renderRichMarkdown(row.result);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${row.title}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
      <style>${PRINT_RICH_CSS}</style>
      </head><body>${body}</body></html>`;
    downloadFile(`${row.title}.doc`, "application/msword", html);
    void trackExport();
  }

  async function downloadNotebookPdf() {
    if (!row?.result) return;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Popup blocked — allow popups to export PDF");
    const doc = buildNotebookDocument(row.result, {
      title: row.title,
      studentName: notebookMeta.studentName.trim(),
      date: notebookMeta.date.trim() || new Date().toLocaleDateString(),
      ink: notebookMeta.ink,
      style: notebookMeta.style,
      showDate: notebookMeta.showDate,
      showStudentName: notebookMeta.showStudentName,
      showPageNumbers: notebookMeta.showPageNumbers,
    });

    w.document.open();
    w.document.write(doc);
    w.document.close();
    setNotebookOpen(false);
    void trackExport();
  }

  async function saveDraft(next: string) {
    await saveDraftFn({ data: { id, result: next } });
    qc.setQueryData(["assignment", id], (prev: typeof row) => (prev ? { ...prev, result: next } : prev));
  }

  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onTitleChange(next: string) {
    qc.setQueryData(["assignment", id], (prev: typeof row) => (prev ? { ...prev, title: next } : prev));
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(async () => {
      const trimmed = next.trim();
      if (!trimmed) return;
      try {
        await saveDraftFn({ data: { id, title: trimmed } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save title");
      }
    }, 600);
  }


  async function regenerate() {
    if (!row) return;
    setRegenerating(true);
    try {
      const { generateAssignment } = await import("@/lib/assignments.functions");
      const res = await generateAssignment({
        data: {
          prompt: row.prompt,
          educationLevel: row.education_level as "school" | "college" | "university" | "masters",
          outputStyle: row.output_style as "simple" | "detailed" | "academic" | "humanized",
          wordCount: row.word_count,
          title: row.title,
          template: (row.template ?? "essay") as "essay" | "case_study" | "lab_report" | "research_paper" | "presentation" | "business_report",
          citationStyle: (row.citation_style ?? "none") as "none" | "apa7" | "mla9" | "harvard" | "chicago" | "ieee",
        },
      });
      toast.success("Regenerated");
      navigate({ to: "/assignment/$id", params: { id: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setRegenerating(false);
    }
  }

  if (isLoading) return <div className="max-w-4xl mx-auto"><p className="text-muted-foreground">Loading...</p></div>;
  if (!row) return <div className="max-w-4xl mx-auto"><p>Not found.</p></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PromoCard placement="workspace" />
      <div className="flex items-center gap-3">
        <Link to="/history" className="glass rounded-lg p-2 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={row.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Assignment title"
              aria-label="Assignment title"
              className="font-display text-2xl md:text-3xl font-bold h-auto py-1.5 px-2 bg-transparent border-white/10 focus-visible:ring-1"
            />
          ) : (
            <h1 className="font-display text-2xl md:text-3xl font-bold truncate">{row.title}</h1>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {row.education_level} · {row.output_style} · ~{row.word_count} words
          </p>
        </div>

      </div>

      {row.status === "generating" && (
        <Card className="glass border-white/10 p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
          <p className="font-medium">Generating your assignment...</p>
          <p className="text-sm text-muted-foreground mt-1">This usually takes 10-30 seconds.</p>
        </Card>
      )}

      {row.status === "failed" && (
        <Card className="glass border-white/10 p-8 text-center">
          <p className="font-medium">Generation failed.</p>
          <Button onClick={regenerate} className="mt-4 gradient-bg text-white border-0">Try again</Button>
        </Card>
      )}

      {(row.status === "completed" || row.status === "partial") && row.result && (
        <>
          {hasMissing && (
            <Card className="glass border-amber-400/40 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-200">
                  Unable to generate answers for {missingQuestions.map((q) => q.id).join(", ")}. Please regenerate or try again.
                </p>
                <p className="text-amber-100/80 mt-1">
                  PDF, Notebook and DOCX export are disabled until every detected question has a completed answer.
                </p>
              </div>
              <Button size="sm" onClick={regenerate} disabled={regenerating} className="gradient-bg text-white border-0 shrink-0">
                <RefreshCw className={`h-4 w-4 mr-1.5 ${regenerating ? "animate-spin" : ""}`} />
                Retry
              </Button>
            </Card>
          )}

          {questionStatuses.length > 0 && (
            <Card className="glass border-white/10 p-3 text-xs">
              <div className="font-medium mb-1.5 text-muted-foreground">
                Questions ({questionStatuses.filter((q) => q.status === "completed").length}/{questionStatuses.length} completed)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {questionStatuses.map((q) => (
                  <span
                    key={q.id}
                    title={q.text}
                    className={`px-2 py-0.5 rounded-md border ${
                      q.status === "completed"
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : q.status === "failed"
                          ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                          : "border-white/20 bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {q.id} · {q.status}
                    {q.attempts > 0 && q.status !== "completed" ? ` (×${q.attempts})` : ""}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <Card className="glass border-white/10 p-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={copy}><Copy className="h-4 w-4 mr-1.5" />Copy</Button>
            <Button size="sm" variant="ghost" disabled={pdfFeature.allowed && !canExport}
              onClick={() => pdfFeature.guard(() => guardExport(() => setPdfOpen(true)))}>
              {pdfFeature.allowed ? <Download className="h-4 w-4 mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
              Academic PDF
            </Button>
            <Button size="sm" variant="ghost" disabled={notebookFeature.allowed && !canExport}
              onClick={() => notebookFeature.guard(() => guardExport(() => setNotebookOpen(true)))}>
              {notebookFeature.allowed ? <BookOpen className="h-4 w-4 mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
              Notebook PDF
            </Button>
            <Button size="sm" variant="ghost" disabled={docxFeature.allowed && !canExport}
              onClick={() => docxFeature.guard(() => guardExport(downloadDocx))}>
              {docxFeature.allowed ? <FileText className="h-4 w-4 mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
              DOCX
            </Button>

            <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)}>
              {editing ? <><Eye className="h-4 w-4 mr-1.5" />View</> : <><Pencil className="h-4 w-4 mr-1.5" />Edit</>}
            </Button>
            <div className="flex-1" />
            <Button size="sm" onClick={regenerate} disabled={regenerating} className="gradient-bg text-white border-0">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${regenerating ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </Card>

          <Card className="glass border-white/10 p-8">
            {editing ? (
              <AutosaveEditor value={row.result} onSave={saveDraft} />
            ) : (
              <article
                ref={previewRef}
                className="assignment-preview prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </Card>

          <AssignmentAssistant assignmentId={id} />
        </>
      )}


      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export academic PDF</DialogTitle>
            <DialogDescription>
              These details appear on the cover page. All fields are optional except date.
              A print dialog opens next — choose "Save as PDF" as the destination.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pdf-name">Student name</Label>
              <Input id="pdf-name" value={pdfMeta.studentName}
                onChange={(e) => setPdfMeta({ ...pdfMeta, studentName: e.target.value })}
                placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdf-subject">Subject / Course</Label>
              <Input id="pdf-subject" value={pdfMeta.subject}
                onChange={(e) => setPdfMeta({ ...pdfMeta, subject: e.target.value })}
                placeholder="e.g. PSY 201 — Introduction to Psychology" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdf-inst">Institution</Label>
              <Input id="pdf-inst" value={pdfMeta.institution}
                onChange={(e) => setPdfMeta({ ...pdfMeta, institution: e.target.value })}
                placeholder="University of ..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdf-date">Date</Label>
              <Input id="pdf-date" value={pdfMeta.date}
                onChange={(e) => setPdfMeta({ ...pdfMeta, date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPdfOpen(false)}>Cancel</Button>
            <Button onClick={downloadPdf} className="gradient-bg text-white border-0">
              <Download className="h-4 w-4 mr-1.5" />Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notebookOpen} onOpenChange={setNotebookOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export notebook PDF</DialogTitle>
            <DialogDescription>
              Exports your assignment as a ruled-notebook page with handwriting-style text.
              A print dialog opens next — choose "Save as PDF" as the destination.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Notebook template</Label>
              <Select value={notebookMeta.template}
                onValueChange={(v) => setNotebookMeta({ ...notebookMeta, template: v as NotebookTemplate })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ruled">Ruled Notebook</SelectItem>
                  <SelectItem value="classic_school">Classic School</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ink color</Label>
                <Select value={notebookMeta.ink} onValueChange={(v) => setNotebookMeta({ ...notebookMeta, ink: v as NotebookInk })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue pen</SelectItem>
                    <SelectItem value="black">Black pen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Handwriting</Label>
                <Select value={notebookMeta.style} onValueChange={(v) => setNotebookMeta({ ...notebookMeta, style: v as NotebookStyle })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">Clean Notebook</SelectItem>
                    <SelectItem value="natural">Natural Handwriting</SelectItem>
                    <SelectItem value="cursive">Student Cursive</SelectItem>
                    <SelectItem value="exam">Fast Exam Writing</SelectItem>
                    <SelectItem value="neat">Neat School Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nb-name">Student name</Label>
              <Input id="nb-name" value={notebookMeta.studentName}
                onChange={(e) => setNotebookMeta({ ...notebookMeta, studentName: e.target.value })}
                placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nb-date">Date</Label>
              <Input id="nb-date" value={notebookMeta.date}
                onChange={(e) => setNotebookMeta({ ...notebookMeta, date: e.target.value })} />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="nb-show-name" className="cursor-pointer">Show student name</Label>
                <Switch id="nb-show-name" checked={notebookMeta.showStudentName}
                  onCheckedChange={(v) => setNotebookMeta({ ...notebookMeta, showStudentName: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="nb-show-date" className="cursor-pointer">Show date</Label>
                <Switch id="nb-show-date" checked={notebookMeta.showDate}
                  onCheckedChange={(v) => setNotebookMeta({ ...notebookMeta, showDate: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="nb-show-pg" className="cursor-pointer">Show page numbers</Label>
                <Switch id="nb-show-pg" checked={notebookMeta.showPageNumbers}
                  onCheckedChange={(v) => setNotebookMeta({ ...notebookMeta, showPageNumbers: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotebookOpen(false)}>Cancel</Button>
            <Button onClick={downloadNotebookPdf} className="gradient-bg text-white border-0">
              <BookOpen className="h-4 w-4 mr-1.5" />Generate Notebook PDF
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
