import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { generateAssignment } from "@/lib/assignments.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AssignAI" }] }),
  component: Dashboard,
});

type Attachment = { name: string; mimeType: string; dataUrl: string; size: number };

const ACCEPT = ".pdf,.docx,.txt,image/*";

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
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<"school" | "college" | "university" | "masters">("college");
  const [style, setStyle] = useState<"simple" | "detailed" | "academic" | "humanized">("humanized");
  const [wordCount, setWordCount] = useState<string>("1000");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      // simulated progress while generating
      setProgress(10);
      const timer = setInterval(() => setProgress((p) => Math.min(p + 5, 90)), 700);
      try {
        const res = await generateFn({
          data: {
            prompt,
            educationLevel: level,
            outputStyle: style,
            wordCount: parseInt(wordCount, 10),
            title: title || undefined,
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
    const arr = Array.from(files).slice(0, 4);
    const next: Attachment[] = [];
    let promptAppend = "";
    for (const f of arr) {
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`${f.name} is too large (15MB max).`);
        continue;
      }
      if (f.type === "text/plain" || f.name.endsWith(".txt")) {
        const text = await readFileAsText(f);
        promptAppend += `\n\n--- ${f.name} ---\n${text}`;
      } else if (f.type === "image/*" || f.type.startsWith("image/") || f.type === "application/pdf") {
        const dataUrl = await readFileAsDataURL(f);
        next.push({ name: f.name, mimeType: f.type || "application/octet-stream", dataUrl, size: f.size });
      } else {
        // DOCX or other: keep as note, ask user to paste content
        toast.message(`${f.name}: DOCX preview isn't supported yet — paste key text below.`);
      }
    }
    if (promptAppend) setPrompt((p) => (p ? p + promptAppend : promptAppend.trim()));
    if (next.length) setAttachments((cur) => [...cur, ...next].slice(0, 4));
  }

  const canGenerate = prompt.trim().length > 5 && !mutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
          New assignment
        </h1>
        <p className="text-muted-foreground mt-1">Upload files or paste your prompt — AssignAI does the rest.</p>
      </div>

      <Card className="glass border-white/10 p-6 space-y-6">
        {/* Upload */}
        <div>
          <Label className="text-sm">Attachments</Label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="mt-1.5 rounded-xl border border-dashed border-white/20 p-8 text-center cursor-pointer hover:bg-white/5 transition"
          >
            <Upload className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-sm font-medium">Drop PDF, DOCX, TXT or images</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse (max 4 files, 15MB each)</p>
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
                  <button onClick={() => setAttachments((c) => c.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="title">Title (optional)</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 bg-white/5 border-white/10"
            placeholder="e.g., Photosynthesis essay" />
        </div>

        <div>
          <Label htmlFor="prompt">Assignment prompt</Label>
          <Textarea
            id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}
            rows={7}
            className="mt-1.5 bg-white/5 border-white/10 resize-none"
            placeholder="Paste the full question(s), or describe what you need..."
          />
        </div>

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
