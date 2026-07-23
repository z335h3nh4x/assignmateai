import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FileStack, Search, MoreHorizontal, Eye, ExternalLink, Copy, Trash2, Loader2,
  Clock, FileText, Download, BookOpen,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  listAdminAssignments, getAdminAssignment, deleteAdminAssignments,
  type AdminAssignmentRow,
} from "@/lib/admin-assignments.functions";
import { renderRichMarkdown } from "@/lib/render-markdown";

export const Route = createFileRoute("/admin/assignments")({
  head: () => ({ meta: [{ title: "Assignments — Admin" }] }),
  component: AdminAssignments,
});

const PAGE_SIZE = 15;

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function relTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}
function fmtSeconds(s: number) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="glass border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-display font-semibold tabular-nums">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function AdminAssignments() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminAssignments);
  const getFn = useServerFn(getAdminAssignment);
  const delFn = useServerFn(deleteAdminAssignments);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });

  const rows = data?.rows ?? [];
  const stats = data?.stats;

  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportedFilter, setExportedFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "exports" | "words" | "updated">("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminAssignmentRow | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const users = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const label = r.user_name || r.user_email || r.user_id.slice(0, 8);
      if (!map.has(r.user_id)) map.set(r.user_id, label);
    }
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [rows]);

  const subjects = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.subject) s.add(r.subject);
    return Array.from(s);
  }, [rows]);
  const templates = useMemo(() => Array.from(new Set(rows.map((r) => r.template))), [rows]);
  const levels = useMemo(() => Array.from(new Set(rows.map((r) => r.education_level))), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))), [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        (r.user_name ?? "").toLowerCase().includes(q) ||
        (r.user_email ?? "").toLowerCase().includes(q) ||
        (r.subject ?? "").toLowerCase().includes(q),
      );
    }
    if (userFilter !== "all") list = list.filter((r) => r.user_id === userFilter);
    if (subjectFilter !== "all") list = list.filter((r) => r.subject === subjectFilter);
    if (levelFilter !== "all") list = list.filter((r) => r.education_level === levelFilter);
    if (templateFilter !== "all") list = list.filter((r) => r.template === templateFilter);
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (exportedFilter === "exported") list = list.filter((r) => r.exports_count > 0);
    else if (exportedFilter === "not") list = list.filter((r) => r.exports_count === 0);
    if (dateFrom) list = list.filter((r) => r.created_at >= dateFrom);
    if (dateTo) list = list.filter((r) => r.created_at <= `${dateTo}T23:59:59Z`);

    const sorted = [...list];
    switch (sort) {
      case "newest": sorted.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); break;
      case "oldest": sorted.sort((a, b) => (a.created_at > b.created_at ? 1 : -1)); break;
      case "exports": sorted.sort((a, b) => b.exports_count - a.exports_count); break;
      case "words": sorted.sort((a, b) => b.word_count - a.word_count); break;
      case "updated": sorted.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)); break;
    }
    return sorted;
  }, [rows, search, userFilter, subjectFilter, levelFilter, templateFilter, statusFilter, exportedFilter, dateFrom, dateTo, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  function toggleAllOnPage(checked: boolean) {
    const next = new Set(selected);
    for (const r of pageRows) {
      if (checked) next.add(r.id);
      else next.delete(r.id);
    }
    setSelected(next);
  }
  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  async function runDelete(ids: string[]) {
    try {
      await delFn({ data: { ids } });
      toast.success(`Deleted ${ids.length} assignment${ids.length === 1 ? "" : "s"}`);
      setSelected((prev) => {
        const n = new Set(prev);
        ids.forEach((id) => n.delete(id));
        return n;
      });
      qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function copyAssignment(id: string) {
    try {
      const detail = await getFn({ data: { id } });
      await navigator.clipboard.writeText(detail.result ?? "");
      toast.success("Copied to clipboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Copy failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">Review, preview, and manage every assignment generated on AssignAI.</p>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {filtered.length} of {rows.length}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={FileStack} label="Total" value={stats?.total ?? 0} />
        <StatCard icon={Clock} label="Today" value={stats?.today ?? 0} />
        <StatCard icon={FileText} label="Avg words" value={stats?.avgWordCount ?? 0} />
        <StatCard icon={Download} label="Exports" value={stats?.totalExports ?? 0} />
        <StatCard icon={BookOpen} label="Avg gen time" value={fmtSeconds(stats?.avgGenerationSeconds ?? 0)} />
      </div>

      <Card className="glass border-white/10 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, user, email, subject…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-background/40"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-[170px] bg-background/40"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="exports">Most exported</SelectItem>
              <SelectItem value="words">Largest word count</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-3 items-center mt-3">
          <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-background/40"><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All users</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-background/40"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] bg-background/40"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {levels.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={templateFilter} onValueChange={(v) => { setTemplateFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-background/40"><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {templates.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] bg-background/40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={exportedFilter} onValueChange={(v) => { setExportedFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] bg-background/40"><SelectValue placeholder="Exports" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="exported">Exported</SelectItem>
              <SelectItem value="not">Not exported</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-[150px] bg-background/40"
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-[150px] bg-background/40"
            placeholder="To"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-3 mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-sm">
              <span className="font-medium">{selected.size}</span> selected
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleting(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete selected
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="glass border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-8">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={(c) => toggleAllOnPage(!!c)}
                    aria-label="Select all on page"
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Words</TableHead>
                <TableHead className="text-right">Exports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-white/10">
                    <TableCell colSpan={12}>
                      <div className="h-10 rounded-md bg-white/5 animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableCell colSpan={12}>
                    <div className="py-14 text-center">
                      <FileStack className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">No assignments match your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => (
                  <TableRow key={r.id} className="border-white/10">
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(c) => toggleOne(r.id, !!c)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <button
                        onClick={() => setPreviewId(r.id)}
                        className="font-medium text-left hover:underline truncate block w-full"
                        title={r.title}
                      >
                        {r.title}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7">
                          {r.user_avatar && <AvatarImage src={r.user_avatar} alt="" />}
                          <AvatarFallback className="gradient-bg text-white text-[10px]">
                            {initials(r.user_name, r.user_email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm truncate max-w-[160px]">{r.user_name || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[160px]">{r.user_email || "—"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.subject || "—"}</TableCell>
                    <TableCell className="text-sm capitalize">{r.education_level}</TableCell>
                    <TableCell className="text-sm capitalize">{r.template.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.word_count.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.exports_count}</TableCell>
                    <TableCell>
                      {r.status === "completed" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Completed</Badge>
                      ) : r.status === "partial" ? (
                        <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">Partial</Badge>
                      ) : r.status === "generating" ? (
                        <Badge className="bg-sky-500/15 text-sky-400 border border-sky-500/30">Generating</Badge>
                      ) : r.status === "failed" ? (
                        <Badge variant="destructive">Failed</Badge>
                      ) : (
                        <Badge variant="outline" className="capitalize">{r.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{relTime(r.updated_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setPreviewId(r.id)}>
                            <Eye className="h-4 w-4 mr-2" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/assignment/$id" params={{ id: r.id }}>
                              <ExternalLink className="h-4 w-4 mr-2" /> Open assignment
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyAssignment(r.id)}>
                            <Copy className="h-4 w-4 mr-2" /> Copy content
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10 text-sm">
            <div className="text-muted-foreground">Page {currentPage} of {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <PreviewDrawer id={previewId} onClose={() => setPreviewId(null)} getFn={getFn} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be permanently removed for {deleting?.user_email || "the user"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleting) return;
                const id = deleting.id;
                setDeleting(null);
                runDelete([id]);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleting} onOpenChange={setBulkDeleting}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} assignments?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every selected assignment across users. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const ids = Array.from(selected);
                setBulkDeleting(false);
                runDelete(ids);
              }}
            >
              Delete {selected.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PreviewDrawer({
  id, onClose, getFn,
}: {
  id: string | null;
  onClose: () => void;
  getFn: ReturnType<typeof useServerFn<typeof getAdminAssignment>>;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "assignments", "detail", id],
    queryFn: () => getFn({ data: { id: id! } }),
    enabled: !!id,
  });

  const html = useMemo(() => (detail?.result ? renderRichMarkdown(detail.result) : ""), [detail?.result]);
  const questions = Array.isArray(detail?.question_statuses) ? (detail!.question_statuses as any[]) : [];

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="glass border-white/10 w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-display">{detail?.title ?? "Loading…"}</SheetTitle>
          <SheetDescription>
            {detail ? (
              <span className="text-xs">
                {detail.user_name || detail.user_email || "Unknown user"} · {fmtDate(detail.created_at)}
              </span>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !detail ? (
          <div className="mt-6 space-y-3">
            <div className="h-16 rounded-md bg-white/5 animate-pulse" />
            <div className="h-40 rounded-md bg-white/5 animate-pulse" />
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {detail.user_avatar && <AvatarImage src={detail.user_avatar} />}
                <AvatarFallback className="gradient-bg text-white text-xs">
                  {initials(detail.user_name, detail.user_email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium truncate">{detail.user_name || "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{detail.user_email || "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Subject" value={detail.subject || "—"} />
              <Info label="Level" value={detail.education_level} />
              <Info label="Template" value={detail.template.replace(/_/g, " ")} />
              <Info label="Style" value={detail.output_style} />
              <Info label="Citations" value={detail.citation_style} />
              <Info label="Word target" value={detail.word_count.toLocaleString()} />
              <Info label="Exports" value={detail.exports_count.toString()} />
              <Info label="Tokens used" value={detail.tokens_used?.toLocaleString() ?? "—"} />
              <Info label="Chat messages" value={detail.messages_count.toString()} />
              <Info label="Status" value={detail.status} />
            </div>

            {questions.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Questions</div>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((q) => (
                    <Badge
                      key={q.id}
                      variant="outline"
                      className={
                        q.status === "completed"
                          ? "border-emerald-500/40 text-emerald-400"
                          : q.status === "failed"
                            ? "border-red-500/40 text-red-400"
                            : "border-amber-500/40 text-amber-400"
                      }
                    >
                      {q.id} · {q.status}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Assignment</div>
              <div className="rounded-xl bg-background/40 border border-white/10 p-5 max-h-[60vh] overflow-y-auto prose prose-invert prose-sm max-w-none">
                {detail.result ? (
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                  <p className="text-muted-foreground italic">No content generated yet.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(detail.result ?? "");
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy
              </Button>
              <Button asChild className="gradient-bg text-white">
                <Link to="/assignment/$id" params={{ id: detail.id }}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Open full view
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium capitalize truncate">{value}</div>
    </div>
  );
}
