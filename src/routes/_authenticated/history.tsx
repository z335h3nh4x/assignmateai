import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock, FileText, ChevronRight, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  title: string;
  status: string;
  education_level: string;
  output_style: string;
  word_count: number;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — AssignAI" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["assignments", refreshKey],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id,title,status,education_level,output_style,word_count,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  async function del(id: string) {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => { /* just to silence */ }, [data]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground mt-1">All the assignments you've generated.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No assignments yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate your first one to see it here.</p>
          <Link to="/dashboard" className="mt-6 inline-flex rounded-lg gradient-bg text-white px-5 py-2.5 text-sm font-medium">
            New assignment
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((row) => (
            <Card key={row.id} className="glass border-white/10 p-4 flex items-center gap-4 hover:bg-white/5 transition">
              <div className="h-10 w-10 rounded-lg gradient-bg grid place-items-center shrink-0">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{row.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {row.education_level} · {row.output_style} · {row.word_count}w ·{" "}
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                row.status === "completed" ? "bg-green-500/10 text-green-400" :
                row.status === "failed" ? "bg-destructive/10 text-destructive" :
                "bg-primary/10 text-primary"
              }`}>{row.status}</span>
              <Button size="icon" variant="ghost" onClick={() => del(row.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Link to="/assignment/$id" params={{ id: row.id }} className="p-2">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
