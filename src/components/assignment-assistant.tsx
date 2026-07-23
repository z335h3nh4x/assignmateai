import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, ClipboardCheck, Award, Loader2, Send, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { analyzeAssignment, chatWithAssignment } from "@/lib/assignments.functions";
import { useFeature } from "@/lib/use-plan-features";

type QualityScores = {
  structure: number;
  grammar: number;
  completeness: number;
  readability: number;
  citations: number;
  overall: number;
};

type GrammarReport = {
  suggestions: Array<{ type: string; severity: "low" | "medium" | "high"; excerpt: string; suggestion: string }>;
  tone?: string;
  readability?: string;
};

export function AssignmentAssistant({ assignmentId }: { assignmentId: string }) {
  const qc = useQueryClient();
  const chatFn = useServerFn(chatWithAssignment);
  const analyseFn = useServerFn(analyzeAssignment);
  const chatFeature = useFeature("ai_chat");
  const grammarFeature = useFeature("grammar_checker");

  const messages = useQuery({
    queryKey: ["assignment-messages", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_messages")
        .select("id, role, content, created_at")
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const analysisRow = useQuery({
    queryKey: ["assignment-analysis", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("grammar_report, quality_score")
        .eq("id", assignmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: async (text: string) => chatFn({ data: { assignmentId, message: text } }),
    onSuccess: () => {
      setInput("");
      qc.invalidateQueries({ queryKey: ["assignment-messages", assignmentId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Chat failed"),
  });

  const analyse = useMutation({
    mutationFn: async () => analyseFn({ data: { id: assignmentId } }),
    onSuccess: () => {
      toast.success("Analysis complete");
      qc.invalidateQueries({ queryKey: ["assignment-analysis", assignmentId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Analysis failed"),
  });

  const scores = analysisRow.data?.quality_score as QualityScores | null | undefined;
  const grammar = analysisRow.data?.grammar_report as GrammarReport | null | undefined;

  return (
    <Card className="glass border-white/10 p-4">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-1.5" />Chat
            {!chatFeature.allowed && !chatFeature.loading && <Lock className="h-3 w-3 ml-1.5 opacity-70" />}
          </TabsTrigger>
          <TabsTrigger value="grammar">
            <ClipboardCheck className="h-4 w-4 mr-1.5" />Grammar
            {!grammarFeature.allowed && !grammarFeature.loading && <Lock className="h-3 w-3 ml-1.5 opacity-70" />}
          </TabsTrigger>
          <TabsTrigger value="quality"><Award className="h-4 w-4 mr-1.5" />Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4 space-y-3">
          {!chatFeature.allowed && !chatFeature.loading && (
            <LockedNotice
              label="AI Assignment Chat"
              planName={chatFeature.planName}
              onUpgrade={chatFeature.requestUpgrade}
            />
          )}
          <div ref={listRef} className="max-h-80 overflow-y-auto space-y-3 pr-1">
            {(messages.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask a follow-up, request an expansion of a section, or ask the AI to rewrite a paragraph. The AI has the full assignment as context.
              </p>
            )}
            {(messages.data ?? []).map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
                <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-primary/20 border border-primary/30" : "bg-white/5 border border-white/10"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {send.isPending && (
              <div className="text-left">
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={chatFeature.allowed ? "e.g. Expand the introduction, or explain paragraph 3 more simply" : "Upgrade to unlock AI Chat"}
              disabled={!chatFeature.allowed}
              className="bg-white/5 border-white/10 resize-none disabled:opacity-60"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  chatFeature.guard(() => { if (input.trim()) send.mutate(input.trim()); });
                }
              }} />
            <Button onClick={() => chatFeature.guard(() => input.trim() && send.mutate(input.trim()))}
              disabled={chatFeature.allowed ? (!input.trim() || send.isPending) : false}
              className="gradient-bg text-white border-0">
              {chatFeature.allowed ? <Send className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="grammar" className="mt-4 space-y-3">
          {!grammarFeature.allowed && !grammarFeature.loading && (
            <LockedNotice
              label="Grammar Checker"
              planName={grammarFeature.planName}
              onUpgrade={grammarFeature.requestUpgrade}
            />
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {grammar ? "Suggestions from the last analysis. Nothing is changed automatically." : "Run an analysis to see grammar, spelling and tone suggestions."}
            </p>
            <Button size="sm" onClick={() => grammarFeature.guard(() => analyse.mutate())} disabled={grammarFeature.allowed && analyse.isPending} className="gradient-bg text-white border-0">
              {!grammarFeature.allowed ? <Lock className="h-4 w-4 mr-1.5" /> : analyse.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {grammar ? "Re-analyze" : "Analyze"}
            </Button>
          </div>

          {grammar && (
            <div className="space-y-3">
              {(grammar.tone || grammar.readability) && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {grammar.tone && <p><span className="text-foreground font-medium">Tone:</span> {grammar.tone}</p>}
                  {grammar.readability && <p><span className="text-foreground font-medium">Readability:</span> {grammar.readability}</p>}
                </div>
              )}
              {(grammar.suggestions ?? []).length === 0 ? (
                <p className="text-sm text-emerald-400">No issues found.</p>
              ) : (
                <ul className="space-y-2">
                  {grammar.suggestions.map((s, i) => (
                    <li key={i} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase">{s.type}</Badge>
                        <SeverityBadge s={s.severity} />
                      </div>
                      {s.excerpt && <p className="text-xs text-muted-foreground italic">"{s.excerpt}"</p>}
                      <p className="mt-1">{s.suggestion}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quality" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {scores ? "AI-assessed quality score." : "Run an analysis to compute a quality score."}
            </p>
            <Button size="sm" onClick={() => analyse.mutate()} disabled={analyse.isPending} className="gradient-bg text-white border-0">
              {analyse.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {scores ? "Re-score" : "Score"}
            </Button>
          </div>

          {scores && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall</div>
                <div className="text-4xl font-display font-bold mt-1">{scores.overall}<span className="text-lg text-muted-foreground">/100</span></div>
              </div>
              <ScoreBar label="Structure" v={scores.structure} />
              <ScoreBar label="Grammar" v={scores.grammar} />
              <ScoreBar label="Completeness" v={scores.completeness} />
              <ScoreBar label="Readability" v={scores.readability} />
              <ScoreBar label="Citations" v={scores.citations} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function ScoreBar({ label, v }: { label: string; v: number }) {
  const clamped = Math.max(0, Math.min(100, v));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">{clamped}/100</span>
      </div>
      <Progress value={clamped} className="h-1.5" />
    </div>
  );
}

function SeverityBadge({ s }: { s: "low" | "medium" | "high" }) {
  const cls = s === "high" ? "text-red-400 border-red-400/40"
    : s === "medium" ? "text-amber-400 border-amber-400/40"
    : "text-emerald-400 border-emerald-400/40";
  return <Badge variant="outline" className={`text-[10px] uppercase ${cls}`}>{s}</Badge>;
}

function LockedNotice({ label, planName, onUpgrade }: { label: string; planName: string; onUpgrade: () => void }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-3">
      <Lock className="h-4 w-4 text-primary shrink-0" />
      <p className="text-xs text-muted-foreground flex-1">
        <span className="text-foreground font-medium">{label}</span> isn't included in your {planName} plan.
      </p>
      <Button size="sm" variant="outline" className="border-primary/40 text-primary" onClick={onUpgrade}>
        Upgrade
      </Button>
    </div>
  );
}

// Autosave editor: swaps the read-only view for a Textarea and saves on debounce.
export function AutosaveEditor(props: {
  value: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [text, setText] = useState(props.value);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = useMemo(() => props.value, []);

  useEffect(() => {
    if (text === initial && !savedAt) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await props.onSave(text);
        setSavedAt(new Date());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Autosave failed");
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={24}
        className="bg-white/5 border-white/10 font-mono text-sm resize-y min-h-[400px]"
      />
      <div className="flex justify-end text-xs text-muted-foreground">
        {saving ? (<span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>)
          : savedAt ? `Saved ${savedAt.toLocaleTimeString()}`
          : "Changes autosave every 1.5s"}
      </div>
    </div>
  );
}
