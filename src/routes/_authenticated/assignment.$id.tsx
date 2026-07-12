import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Download, RefreshCw, FileText, Loader2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function AssignmentView() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [regenerating, setRegenerating] = useState(false);

  const { data: row, isLoading, refetch } = useQuery({
    queryKey: ["assignment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignments").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data && q.state.data.status === "generating" ? 2000 : false),
  });

  const html = useMemo(() => (row?.result ? renderMarkdown(row.result) : ""), [row?.result]);

  function copy() {
    if (!row?.result) return;
    navigator.clipboard.writeText(row.result);
    toast.success("Copied to clipboard");
  }

  function downloadTxt() {
    if (!row?.result) return;
    downloadFile(`${row.title}.txt`, "text/plain;charset=utf-8", row.result);
  }

  function downloadPdf() {
    if (!row?.result) return;
    // Print-to-PDF via a styled new window (works in all modern browsers)
    const w = window.open("", "_blank");
    if (!w) return toast.error("Popup blocked");
    w.document.write(`<html><head><title>${row.title}</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}
      h1,h2,h3{font-family:'Helvetica Neue',sans-serif}
      </style></head><body>${renderMarkdown(row.result)}<script>window.onload=()=>setTimeout(()=>window.print(),200);</script></body></html>`);
    w.document.close();
  }

  function downloadDocx() {
    if (!row?.result) return;
    // Minimal Word-compatible HTML (.doc). Fully-featured DOCX would need a lib.
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${row.title}</title></head><body>${renderMarkdown(row.result)}</body></html>`;
    downloadFile(`${row.title}.doc`, "application/msword", html);
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
            <Button size="sm" variant="ghost" onClick={downloadPdf}><Download className="h-4 w-4 mr-1.5" />PDF</Button>
            <Button size="sm" variant="ghost" onClick={downloadDocx}><FileText className="h-4 w-4 mr-1.5" />DOCX</Button>
            <Button size="sm" variant="ghost" onClick={downloadTxt}><Download className="h-4 w-4 mr-1.5" />TXT</Button>
            <div className="flex-1" />
            <Button size="sm" onClick={regenerate} disabled={regenerating} className="gradient-bg text-white border-0">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${regenerating ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </Card>

          <Card className="glass border-white/10 p-8">
            <article
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
