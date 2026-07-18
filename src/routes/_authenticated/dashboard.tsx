import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, X, Wand2, Loader2, Link as LinkIcon, FileStack, Plus,
  ClipboardList, BarChart3, Download, Award, Sparkles, ScanSearch, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { generateAssignment, getDashboardStats, analyzeUpload } from "@/lib/assignments.functions";
import {
  TEMPLATES, CITATION_STYLES, type TemplateId, type CitationStyleId, type SourceItem,
} from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AssignAI" }] }),
  component: Dashboard,
});

type Attachment = { name: string; mimeType: string; dataUrl: string; size: number };
type Detection = {
  title: string;
  subject: string;
  subjectDomain: string;
  handwritten: boolean;
  requiresDiagrams: boolean;
  instructions: string;
  wordCountSuggested: number | null;
  marks: { q: string; marks: string }[];
  questions: string[];
};


const ACCEPT = ".pdf,.docx,.txt,image/*";
const SOURCE_ACCEPT = ".pdf,.docx,.txt";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

function Dashboard() {
  const navigate = useNavigate();
  const generateFn = useServerFn(generateAssignment);
  const statsFn = useServerFn(getDashboardStats);
  const analyzeFn = useServerFn(analyzeUpload);

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<"school" | "college" | "university" | "masters">("college");
  const [style, setStyle] = useState<"simple" | "detailed" | "academic" | "humanized">("humanized");
  const [wordCount, setWordCount] = useState<string>("1000");
  const [template, setTemplate] = useState<TemplateId>("essay");
  const [citation, setCitation] = useState<CitationStyleId>("none");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [pastedRef, setPastedRef] = useState("");
  const [progress, setProgress] = useState(0);
  const [pastedAssignmentText, setPastedAssignmentText] = useState("");
  const [detection, setDetection] = useState<Detection | null>(null);
  const [selectedQ, setSelectedQ] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const sourceFileRef = useRef<HTMLInputElement>(null);

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsFn(),
  });

  const analyseMutation = useMutation({
    mutationFn: async () => {
      const analysable = attachments.filter(
        (a) => a.mimeType.startsWith("image/") || a.mimeType === "application/pdf",
      );
      if (!analysable.length && pastedAssignmentText.trim().length < 20) {
        throw new Error("Upload a file or paste the assignment text first.");
      }
      // Text-only path: build a synthetic detection with the pasted text as one question.
      if (!analysable.length) {
        return {
          title: "",
          subject: "",
          handwritten: false,
          questions: [pastedAssignmentText.trim()],
        } satisfies Detection;
      }
      return await analyzeFn({
        data: {
          attachments: analysable.map(({ name, mimeType, dataUrl }) => ({ name, mimeType, dataUrl })),
          extraText: pastedAssignmentText.trim() || undefined,
        },
      });
    },
    onSuccess: (res) => {
      setDetection(res);
      setSelectedQ(new Set(res.questions.map((_, i) => i)));
      if (res.title && !title) {
        setTitle(res.subject ? `${res.subject} — ${res.title}` : res.title);
      }
      toast.success(
        res.questions.length
          ? `Detected ${res.questions.length} question${res.questions.length === 1 ? "" : "s"}`
          : "File analysed",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not analyse file"),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      setProgress(10);
      const timer = setInterval(() => setProgress((p) => Math.min(p + 5, 90)), 700);
      try {
        const detectedQuestions = detection
          ? detection.questions.filter((_, i) => selectedQ.has(i))
          : undefined;
        const res = await generateFn({
          data: {
            prompt,
            educationLevel: level,
            outputStyle: style,
            wordCount: parseInt(wordCount, 10),
            title: title || detection?.title || undefined,
            subject: detection?.subject || undefined,
            detectedQuestions,
            template,
            citationStyle: citation,
            sources,
            attachments: attachments.map(({ name, mimeType, dataUrl }) => ({ name, mimeType, dataUrl })),
          },
        });
        setProgress(100);
        return res;
      } finally {
        clearInterval(timer);
      }
    },
    onSuccess: (res) => {
      toast.success("Assignment ready!");
      navigate({ to: "/assignment/$id", params: { id: res.id } });
    },
    onError: (e) => {
      setProgress(0);
      toast.error(e instanceof Error ? e.message : "Generation failed");
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 6);
    const next: Attachment[] = [];
    let textAppend = "";
    for (const f of arr) {
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`${f.name} is too large (15MB max).`);
        continue;
      }
      if (f.type === "text/plain" || f.name.endsWith(".txt")) {
        const text = await readFileAsText(f);
        textAppend += `\n\n--- ${f.name} ---\n${text}`;
      } else if (f.type.startsWith("image/") || f.type === "application/pdf") {
        const dataUrl = await readFileAsDataURL(f);
        next.push({ name: f.name, mimeType: f.type || "application/octet-stream", dataUrl, size: f.size });
      } else {
        toast.message(`${f.name}: DOCX preview isn't supported yet — paste key text below.`);
      }
    }
    if (textAppend) {
      setPastedAssignmentText((p) => (p ? p + textAppend : textAppend.trim()));
    }
    if (next.length) setAttachments((cur) => [...cur, ...next].slice(0, 6));
    // Reset stale detection when files change.
    setDetection(null);
    setSelectedQ(new Set());
  }

  async function handleSourceFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 8);
    const next: SourceItem[] = [];
    for (const f of arr) {
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`${f.name} is too large (15MB max).`);
        continue;
      }
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        const dataUrl = await readFileAsDataURL(f);
        next.push({ kind: "pdf", name: f.name, dataUrl });
      } else if (f.name.toLowerCase().endsWith(".docx")) {
        toast.message(`${f.name}: paste the key text into "Paste reference text" for best results.`);
      } else if (f.type === "text/plain" || f.name.toLowerCase().endsWith(".txt")) {
        const text = await readFileAsText(f);
        next.push({ kind: "docx", name: f.name, text });
      }
    }
    if (next.length) setSources((cur) => [...cur, ...next].slice(0, 8));
  }

  function addUrl() {
    const u = urlInput.trim();
    if (!u) return;
    try { new URL(u); } catch { toast.error("Enter a valid URL (include https://)"); return; }
    setSources((cur) => [...cur, { kind: "url" as const, url: u }].slice(0, 8));
    setUrlInput("");
  }

  function addPastedRef() {
    const t = pastedRef.trim();
    if (t.length < 20) { toast.error("Paste at least 20 characters of reference text."); return; }
    setSources((cur) => [...cur, { kind: "text" as const, text: t }].slice(0, 8));
    setPastedRef("");
  }

  function removeSource(i: number) {
    setSources((cur) => cur.filter((_, j) => j !== i));
  }

  function toggleQ(i: number) {
    setSelectedQ((cur) => {
      const n = new Set(cur);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }
  function toggleAll() {
    if (!detection) return;
    if (selectedQ.size === detection.questions.length) setSelectedQ(new Set());
    else setSelectedQ(new Set(detection.questions.map((_, i) => i)));
  }

  const hasAnalysableUpload =
    attachments.some((a) => a.mimeType.startsWith("image/") || a.mimeType === "application/pdf")
    || pastedAssignmentText.trim().length >= 20;

  const canGenerate =
    !mutation.isPending && (
      (detection && selectedQ.size > 0) ||
      attachments.length > 0 ||
      pastedAssignmentText.trim().length >= 20 ||
      prompt.trim().length > 5
    );
  const s = stats.data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
          New assignment
        </h1>
        <p className="text-muted-foreground mt-1">Upload your assignment — AssignAI reads it, detects the questions and writes the solution.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ClipboardList className="h-4 w-4" />} label="Assignments" value={s ? String(s.total) : "—"} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Words generated" value={s ? s.totalWords.toLocaleString() : "—"} />
        <StatCard icon={<Download className="h-4 w-4" />} label="Exports" value={s ? String(s.exports) : "—"} />
        <StatCard icon={<Award className="h-4 w-4" />} label="Avg score" value={s?.avgScore != null ? `${s.avgScore}/100` : "—"} />
      </div>

      {s && s.recent.length > 0 && (
        <Card className="glass border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Recent assignments</h2>
            <Link to="/history" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-1.5">
            {s.recent.map((r) => (
              <Link key={r.id} to="/assignment/$id" params={{ id: r.id }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5 text-sm">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate flex-1">{r.title}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="glass border-white/10 p-6 space-y-6">
        {/* Upload */}
        <div>
          <Label className="text-sm">Upload assignment</Label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="mt-1.5 rounded-xl border border-dashed border-white/20 p-8 text-center cursor-pointer hover:bg-white/5 transition"
          >
            <Upload className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-sm font-medium">Drop your assignment — PDF, DOCX, TXT or images (JPG/PNG)</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse (max 6 files, 15MB each). AssignAI will OCR handwriting and detect every question.</p>
            <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden"
              onChange={(e) => handleFiles(e.target.files)} />
          </div>
          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate flex-1">{a.name}</span>
                  <span className="text-xs text-muted-foreground">{Math.round(a.size / 1024)}kb</span>
                  <button onClick={() => {
                    setAttachments((c) => c.filter((_, j) => j !== i));
                    setDetection(null); setSelectedQ(new Set());
                  }}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {hasAnalysableUpload && (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => analyseMutation.mutate()}
                disabled={analyseMutation.isPending}
                className="border-white/15"
              >
                {analyseMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Reading assignment...</>
                ) : detection ? (
                  <><ScanSearch className="h-4 w-4 mr-1.5" /> Re-scan uploaded files</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-1.5" /> Scan & detect questions</>
                )}
              </Button>
              {!detection && (
                <span className="text-xs text-muted-foreground ml-2">
                  Optional — you can skip and generate directly.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Detection panel */}
        {detection && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Detected assignment</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[detection.subject, detection.title].filter(Boolean).join(" — ") || "Untitled"}
                  {detection.handwritten ? " · handwritten" : ""}
                </div>
              </div>
            </div>

            {detection.questions.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Questions ({detection.questions.length})</Label>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {selectedQ.size === detection.questions.length ? "Deselect all" : "Solve all"}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {detection.questions.map((q, i) => (
                    <label key={i} className="flex gap-2 items-start rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm cursor-pointer hover:bg-white/10">
                      <Checkbox
                        checked={selectedQ.has(i)}
                        onCheckedChange={() => toggleQ(i)}
                        className="mt-0.5"
                      />
                      <span className="flex-1">
                        <span className="text-xs text-primary font-medium">Q{i + 1}.</span>{" "}
                        <span className="text-foreground/90">{q}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No individual questions were detected — AssignAI will solve the whole document.</p>
            )}
          </div>
        )}

        {/* Core options — always visible */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Education level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
              <SelectTrigger className="mt-1.5 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="masters">Masters</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Output style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
              <SelectTrigger className="mt-1.5 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="humanized">Humanized</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Word count</Label>
            <Select value={wordCount} onValueChange={setWordCount}>
              <SelectTrigger className="mt-1.5 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="500">500 words</SelectItem>
                <SelectItem value="1000">1,000 words</SelectItem>
                <SelectItem value="1500">1,500 words</SelectItem>
                <SelectItem value="2000">2,000+ words</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced options */}
        <Accordion type="single" collapsible className="border border-white/10 rounded-xl bg-white/5">
          <AccordionItem value="advanced" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="text-sm font-medium">Advanced options</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-5">
              <div>
                <Label htmlFor="title">Title (optional — auto-detected from file)</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 bg-white/5 border-white/10"
                  placeholder="e.g., Engineering Physics — Free and Forced Oscillations" />
              </div>

              <div>
                <Label htmlFor="prompt">Extra instructions or pasted assignment (optional)</Label>
                <Textarea
                  id="prompt" value={pastedAssignmentText} onChange={(e) => { setPastedAssignmentText(e.target.value); setDetection(null); }}
                  rows={5}
                  className="mt-1.5 bg-white/5 border-white/10 resize-none"
                  placeholder="Only needed if you didn't upload a file. Paste the assignment question(s) here."
                />
                <div className="mt-2">
                  <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes for the AI (tone, focus, things to include)</Label>
                  <Textarea
                    id="notes" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="mt-1 bg-white/5 border-white/10 resize-none"
                    placeholder="e.g., focus on real-world examples; keep math simple"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Template</Label>
                  <Select value={template} onValueChange={(v) => setTemplate(v as TemplateId)}>
                    <SelectTrigger className="mt-1.5 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TEMPLATES) as TemplateId[]).map((k) => (
                        <SelectItem key={k} value={k}>{TEMPLATES[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{TEMPLATES[template].description}</p>
                </div>
                <div>
                  <Label>Citation style</Label>
                  <Select value={citation} onValueChange={(v) => setCitation(v as CitationStyleId)}>
                    <SelectTrigger className="mt-1.5 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CITATION_STYLES) as CitationStyleId[]).map((k) => (
                        <SelectItem key={k} value={k}>{CITATION_STYLES[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{CITATION_STYLES[citation].description}</p>
                </div>
              </div>

              {/* Sources */}
              <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <FileStack className="h-4 w-4 text-primary" />
                  <Label className="text-sm m-0">Reference sources (optional)</Label>
                  <span className="text-xs text-muted-foreground ml-auto">{sources.length}/8</span>
                </div>
                <p className="text-xs text-muted-foreground">The AI will prioritise these when writing.</p>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" type="button" onClick={() => sourceFileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1.5" /> Upload PDF / DOCX / TXT
                  </Button>
                  <input ref={sourceFileRef} type="file" multiple accept={SOURCE_ACCEPT} className="hidden"
                    onChange={(e) => handleSourceFiles(e.target.files)} />
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/article"
                      className="pl-8 bg-white/5 border-white/10"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} />
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={addUrl}><Plus className="h-4 w-4" /></Button>
                </div>

                <div className="space-y-1.5">
                  <Textarea rows={3} value={pastedRef} onChange={(e) => setPastedRef(e.target.value)}
                    placeholder="Paste reference text (from DOCX, article, notes...)"
                    className="bg-white/5 border-white/10 resize-none text-sm" />
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="ghost" onClick={addPastedRef}>
                      <Plus className="h-4 w-4 mr-1" /> Add text reference
                    </Button>
                  </div>
                </div>

                {sources.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {sources.map((src, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-black/20 border border-white/5 px-3 py-1.5 text-xs">
                        <span className="uppercase text-[10px] tracking-wide text-primary shrink-0">{src.kind}</span>
                        <span className="truncate flex-1">
                          {src.kind === "url" ? src.url
                            : src.kind === "text" ? (src.text.slice(0, 80) + (src.text.length > 80 ? "..." : ""))
                            : src.name}
                        </span>
                        <button onClick={() => removeSource(i)}>
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {mutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating...</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </motion.div>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={!canGenerate}
          className="w-full h-12 gradient-bg text-white glow border-0 text-base font-medium"
        >
          <Wand2 className="h-5 w-5 mr-2" />
          Generate assignment
        </Button>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="glass border-white/10 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-xl font-semibold font-display">{value}</div>
    </Card>
  );
}
