import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Download, RefreshCw, FileText, Loader2, Pencil, Eye, BookOpen,
} from "lucide-react";

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
import { incrementExport, saveAssignmentDraft } from "@/lib/assignments.functions";
import { buildNotebookDocument, type NotebookInk, type NotebookStyle } from "@/lib/notebook-pdf";

export const Route = createFileRoute("/_authenticated/assignment/$id")({
  head: () => ({ meta: [{ title: "Assignment — AssignAI" }] }),
  component: AssignmentView,
});

function renderMarkdown(md: string): string {
  // Minimal markdown to HTML: headings, bold, italic, bullets, paragraphs
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (let raw of lines) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) { closeList(); out.push(`<h3 class="font-display text-lg font-semibold mt-6 mb-2">${esc(line.replace(/^###\s+/, ""))}</h3>`); continue; }
    if (/^##\s+/.test(line))  { closeList(); out.push(`<h2 class="font-display text-2xl font-bold mt-8 mb-3">${esc(line.replace(/^##\s+/, ""))}</h2>`); continue; }
    if (/^#\s+/.test(line))   { closeList(); out.push(`<h1 class="font-display text-3xl font-bold mt-8 mb-4">${esc(line.replace(/^#\s+/, ""))}</h1>`); continue; }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-6 space-y-1 my-3">'); inList = true; }
      out.push(`<li>${inlineFmt(esc(line.replace(/^\s*[-*]\s+/, "")))}</li>`);
      continue;
    }
    closeList();
    if (line.trim() === "") { out.push(""); continue; }
    out.push(`<p class="my-3 leading-relaxed">${inlineFmt(esc(line))}</p>`);
  }
  closeList();
  return out.join("\n");

  function inlineFmt(s: string) {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }
}

function downloadFile(name: string, mime: string, content: string | Blob) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// Renders markdown into clean HTML for academic PDF, returning the body html,
// a separate references block (if any), and the H2/H3 outline for the TOC.
function renderAcademicMarkdown(md: string) {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const inline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Split off "References" section if present (## References or # References at end)
  let body = md;
  let references = "";
  const refMatch = md.match(/\n\s*#{1,3}\s*references\s*\n([\s\S]*)$/i);
  if (refMatch) {
    body = md.slice(0, refMatch.index);
    references = refMatch[1].trim();
  }

  const outline: { level: number; text: string; id: string }[] = [];
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "s";

  const toHtml = (src: string, collectOutline: boolean) => {
    const lines = src.split(/\r?\n/);
    const out: string[] = [];
    let inList = false;
    const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
    for (const raw of lines) {
      const line = raw.trimEnd();
      let m: RegExpMatchArray | null;
      if ((m = line.match(/^###\s+(.*)$/))) {
        closeList();
        const id = slug(m[1]);
        if (collectOutline) outline.push({ level: 3, text: m[1], id });
        out.push(`<h3 id="${id}">${inline(esc(m[1]))}</h3>`); continue;
      }
      if ((m = line.match(/^##\s+(.*)$/))) {
        closeList();
        const id = slug(m[1]);
        if (collectOutline) outline.push({ level: 2, text: m[1], id });
        out.push(`<h2 id="${id}">${inline(esc(m[1]))}</h2>`); continue;
      }
      if ((m = line.match(/^#\s+(.*)$/))) {
        closeList();
        const id = slug(m[1]);
        if (collectOutline) outline.push({ level: 1, text: m[1], id });
        out.push(`<h1 id="${id}">${inline(esc(m[1]))}</h1>`); continue;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        if (!inList) { out.push("<ul>"); inList = true; }
        out.push(`<li>${inline(esc(line.replace(/^\s*[-*]\s+/, "")))}</li>`);
        continue;
      }
      closeList();
      if (line.trim() === "") { out.push(""); continue; }
      out.push(`<p>${inline(esc(line))}</p>`);
    }
    closeList();
    return out.join("\n");
  };

  return {
    bodyHtml: toHtml(body.trim(), true),
    referencesHtml: references ? toHtml(references, false) : "",
    outline,
  };
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

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(meta.title)}</title>
<style>
  @page {
    size: Letter;
    margin: 1in;
    @bottom-center {
      content: counter(page);
      font-family: "Times New Roman", Times, serif;
      font-size: 10pt;
      color: #000;
    }
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
  /* Fallback footer for browsers without @page margin boxes */
  .page-footer {
    position: fixed;
    bottom: 0.4in;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10pt;
    color: #000;
  }
  h1, h2, h3, h4 { font-family: "Times New Roman", Times, serif; font-weight: bold; page-break-after: avoid; }
  h1 { font-size: 16pt; margin: 1.2em 0 0.6em; }
  h2 { font-size: 14pt; margin: 1.2em 0 0.5em; }
  h3 { font-size: 12pt; margin: 1em 0 0.4em; font-style: italic; font-weight: bold; }
  p  { text-align: justify; text-justify: inter-word; margin: 0 0 0.6em; text-indent: 0.4in; hyphens: auto; }
  p:first-of-type, h1 + p, h2 + p, h3 + p { text-indent: 0; }
  ul, ol { margin: 0.4em 0 0.8em 0.4in; padding: 0; }
  li { margin: 0.2em 0; text-align: justify; }
  a { color: #000; text-decoration: none; }

  /* Title page */
  .title-page {
    height: 9in;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    page-break-after: always;
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
  .title-meta { margin-top: 2em; line-height: 2; font-size: 12pt; }
  .title-meta > div { display: block; }
  .title-meta .lbl { display: block; text-transform: uppercase; letter-spacing: 0.15em; font-size: 9pt; color: #555; }
  .title-meta .val { display: block; font-size: 13pt; margin-bottom: 0.6em; }

  /* Table of contents */
  .toc { page-break-after: always; }
  .toc h2.centered { text-align: center; margin-bottom: 1.5em; }
  .toc ol { list-style: none; margin: 0; padding: 0; }
  .toc li { margin: 0.35em 0; }
  .toc li.lvl-3 { padding-left: 0.4in; }
  .toc a { display: block; }

  /* References */
  .references { page-break-before: always; }
  .references h2 { text-align: center; margin-bottom: 1em; }
  .references p { text-indent: -0.4in; padding-left: 0.4in; text-align: left; }

  @media screen {
    body { max-width: 7in; margin: 0.5in auto; padding: 1in; box-shadow: 0 0 20px rgba(0,0,0,.15); }
    .page-footer { display: none; }
  }
</style>
</head>
<body>
  <div class="page-footer"></div>

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

  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
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
  const [editing, setEditing] = useState(false);
  const [pdfMeta, setPdfMeta] = useState({
    studentName: "",
    institution: "",
    subject: "",
    date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
  });

  const { data: row, isLoading } = useQuery({
    queryKey: ["assignment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignments").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data && q.state.data.status === "generating" ? 2000 : false),
  });

  async function trackExport() {
    try { await incrementExportFn({ data: { id } }); } catch { /* non-blocking */ }
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  const html = useMemo(() => (row?.result ? renderMarkdown(row.result) : ""), [row?.result]);

  function copy() {
    if (!row?.result) return;
    navigator.clipboard.writeText(row.result);
    toast.success("Copied to clipboard");
    void trackExport();
  }

  function downloadTxt() {
    if (!row?.result) return;
    downloadFile(`${row.title}.txt`, "text/plain;charset=utf-8", row.result);
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
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${row.title}</title></head><body>${renderMarkdown(row.result)}</body></html>`;
    downloadFile(`${row.title}.doc`, "application/msword", html);
    void trackExport();
  }

  async function saveDraft(next: string) {
    await saveDraftFn({ data: { id, result: next } });
    qc.setQueryData(["assignment", id], (prev: typeof row) => (prev ? { ...prev, result: next } : prev));
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
      <div className="flex items-center gap-3">
        <Link to="/history" className="glass rounded-lg p-2 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl md:text-3xl font-bold truncate">{row.title}</h1>
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

      {row.status === "completed" && row.result && (
        <>
          <Card className="glass border-white/10 p-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={copy}><Copy className="h-4 w-4 mr-1.5" />Copy</Button>
            <Button size="sm" variant="ghost" onClick={() => setPdfOpen(true)}><Download className="h-4 w-4 mr-1.5" />PDF</Button>
            <Button size="sm" variant="ghost" onClick={downloadDocx}><FileText className="h-4 w-4 mr-1.5" />DOCX</Button>
            <Button size="sm" variant="ghost" onClick={downloadTxt}><Download className="h-4 w-4 mr-1.5" />TXT</Button>
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
                className="prose prose-invert max-w-none"
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
    </div>
  );
}
