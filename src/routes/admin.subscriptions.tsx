import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CreditCard, Users, DollarSign, TrendingUp, TrendingDown, Percent, Plus, Search,
  MoreHorizontal, Star, Copy, Archive, ArchiveRestore, Trash2, Loader2, Pencil, Check, X,
  ArrowUp, ArrowDown, Sparkles, GitBranch,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listAdminPlans, upsertPlan, duplicatePlan, setPlanFlag, deletePlan, reorderPlans,
  listSubscribers, changeSubscriberPlan, setSubscriptionStatus, extendSubscription, adjustCredits,
  getSubscriptionOverview, getSubscriptionAnalytics,
  type AdminPlan, type PlanInput, type SubscriberRow,
} from "@/lib/admin-subscriptions.functions";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Admin" }] }),
  component: AdminSubscriptions,
});

const FEATURE_KEYS: { key: string; label: string }[] = [
  { key: "humanized_writing", label: "Humanized Writing" },
  { key: "ocr", label: "OCR" },
  { key: "ai_chat", label: "AI Chat" },
  { key: "pdf_export", label: "PDF Export" },
  { key: "docx_export", label: "DOCX Export" },
  { key: "notebook_pdf", label: "Notebook PDF" },
  { key: "citation_generator", label: "Citation Generator" },
  { key: "grammar_checker", label: "Grammar Checker" },
  { key: "priority_queue", label: "Priority Queue" },
  { key: "faster_generation", label: "Faster Generation" },
  { key: "premium_templates", label: "Premium Templates" },
  { key: "api_access", label: "API Access" },
  { key: "future_features", label: "Future Features" },
];

const EMPTY_PLAN: PlanInput = {
  slug: "",
  name: "",
  description: "",
  currency: "USD",
  monthly_price_cents: 0,
  yearly_price_cents: 0,
  credits: 0,
  daily_limit: 0,
  monthly_limit: 0,
  
  max_upload_mb: 0,
  max_upload_pages: 0,
  features: Object.fromEntries(FEATURE_KEYS.map((f) => [f.key, false])),
  is_active: true,
  is_archived: false,
  is_recommended: false,
  sort_order: 0,
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents ?? 0) / 100);
}
function initials(n?: string | null, e?: string | null) {
  const s = (n || e || "?").trim();
  return s.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <Card className="glass border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-display font-semibold tabular-nums truncate">{value}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
      </div>
    </Card>
  );
}

function AdminSubscriptions() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getSubscriptionOverview);
  const plansFn = useServerFn(listAdminPlans);
  const subsFn = useServerFn(listSubscribers);
  const analyticsFn = useServerFn(getSubscriptionAnalytics);

  const overviewQ = useQuery({ queryKey: ["adm-sub-overview"], queryFn: () => overviewFn() });
  const plansQ = useQuery({ queryKey: ["adm-plans"], queryFn: () => plansFn() });
  const subsQ = useQuery({ queryKey: ["adm-subs"], queryFn: () => subsFn() });
  const analyticsQ = useQuery({ queryKey: ["adm-sub-analytics"], queryFn: () => analyticsFn() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["adm-sub-overview"] });
    qc.invalidateQueries({ queryKey: ["adm-plans"] });
    qc.invalidateQueries({ queryKey: ["adm-subs"] });
    qc.invalidateQueries({ queryKey: ["adm-sub-analytics"] });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage pricing, plans, subscribers, and billing analytics.</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active" value={String(overviewQ.data?.totalActive ?? 0)} />
        <StatCard icon={Sparkles} label="Free" value={String(overviewQ.data?.freeUsers ?? 0)} />
        <StatCard icon={CreditCard} label="Paid" value={String(overviewQ.data?.paidUsers ?? 0)} />
        <StatCard icon={DollarSign} label="MRR" value={money(overviewQ.data?.mrrCents ?? 0)} />
        <StatCard icon={TrendingUp} label="ARR" value={money(overviewQ.data?.arrCents ?? 0)} />
        <StatCard icon={TrendingDown} label="Churn" value={`${overviewQ.data?.churnRate ?? 0}%`} />
        <StatCard icon={Percent} label="Free → Paid" value={`${overviewQ.data?.conversionRate ?? 0}%`} />
        <StatCard icon={GitBranch} label="Plans" value={String((plansQ.data ?? []).length)} />
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="glass border-white/10">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          <PlansTab plans={plansQ.data ?? []} loading={plansQ.isLoading} refresh={refresh} />
        </TabsContent>
        <TabsContent value="subscribers" className="mt-4">
          <SubscribersTab
            subscribers={subsQ.data ?? []}
            plans={plansQ.data ?? []}
            loading={subsQ.isLoading}
            refresh={refresh}
          />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab data={analyticsQ.data} loading={analyticsQ.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ================== PLANS TAB ==================

function PlansTab({ plans, loading, refresh }: { plans: AdminPlan[]; loading: boolean; refresh: () => void }) {
  const [editing, setEditing] = useState<PlanInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminPlan | null>(null);
  const upsertFn = useServerFn(upsertPlan);
  const dupFn = useServerFn(duplicatePlan);
  const flagFn = useServerFn(setPlanFlag);
  const delFn = useServerFn(deletePlan);
  const reorderFn = useServerFn(reorderPlans);

  async function toggleFlag(p: AdminPlan, field: "is_active" | "is_archived" | "is_recommended", value: boolean) {
    try {
      await flagFn({ data: { id: p.id, field, value } });
      toast.success("Updated");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  async function move(p: AdminPlan, dir: -1 | 1) {
    const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === p.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    try {
      await reorderFn({
        data: {
          order: [
            { id: p.id, sort_order: swap.sort_order },
            { id: swap.id, sort_order: p.sort_order },
          ],
        },
      });
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ ...EMPTY_PLAN, sort_order: (sorted.at(-1)?.sort_order ?? 0) + 1 })}>
          <Plus className="h-4 w-4 mr-2" /> Create Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : sorted.length === 0 ? (
        <Card className="glass border-white/10 rounded-2xl p-10 text-center">
          <CreditCard className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No plans yet — create your first plan.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((p, i) => (
            <Card
              key={p.id}
              className={`glass border-white/10 rounded-2xl p-5 flex flex-col gap-4 ${
                p.is_recommended ? "ring-2 ring-primary/60" : ""
              } ${p.is_archived ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-display font-semibold truncate">{p.name}</h3>
                    {p.is_recommended && <Badge className="gradient-bg text-white">Recommended</Badge>}
                    {!p.is_active && <Badge variant="outline">Disabled</Badge>}
                    {p.is_archived && <Badge variant="outline">Archived</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">/{p.slug}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing({ ...p })}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { try { await dupFn({ data: { id: p.id } }); toast.success("Duplicated"); refresh(); } catch (e: any) { toast.error(e.message); } }}>
                      <Copy className="h-4 w-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleFlag(p, "is_recommended", !p.is_recommended)}>
                      <Star className="h-4 w-4 mr-2" /> {p.is_recommended ? "Unmark" : "Mark"} Recommended
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleFlag(p, "is_active", !p.is_active)}>
                      {p.is_active ? <X className="h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      {p.is_active ? "Disable" : "Enable"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleFlag(p, "is_archived", !p.is_archived)}>
                      {p.is_archived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                      {p.is_archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => move(p, -1)} disabled={i === 0}>
                      <ArrowUp className="h-4 w-4 mr-2" /> Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => move(p, 1)} disabled={i === sorted.length - 1}>
                      <ArrowDown className="h-4 w-4 mr-2" /> Move down
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(p)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold">{money(p.monthly_price_cents, p.currency)}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
                {p.yearly_price_cents > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {money(p.yearly_price_cents, p.currency)}/yr
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric label="Credits" value={p.credits.toLocaleString()} />
                <Metric label="Daily limit" value={String(p.daily_limit)} />
                <Metric label="Monthly limit" value={String(p.monthly_limit)} />
                <Metric label="Upload MB" value={String(p.max_upload_mb)} />
                <Metric label="Upload pages" value={String(p.max_upload_pages)} />
              </div>

              <div className="flex flex-wrap gap-1">
                {FEATURE_KEYS.filter((f) => p.features?.[f.key]).map((f) => (
                  <Badge key={f.key} variant="outline" className="text-[10px]">{f.label}</Badge>
                ))}
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t border-white/5">
                {p.subscriber_count} subscribers
              </div>
            </Card>
          ))}
        </div>
      )}

      <PlanEditor
        plan={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          try {
            await upsertFn({ data });
            toast.success("Saved");
            setEditing(null);
            refresh();
          } catch (e: any) {
            toast.error(e.message ?? "Failed");
          }
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{confirmDelete?.name}”. Existing subscribers will keep their record but lose the linked plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => {
                if (!confirmDelete) return;
                try { await delFn({ data: { id: confirmDelete.id } }); toast.success("Deleted"); refresh(); }
                catch (e: any) { toast.error(e.message); }
                setConfirmDelete(null);
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

function PlanEditor({
  plan, onClose, onSave,
}: { plan: PlanInput | null; onClose: () => void; onSave: (p: PlanInput) => void }) {
  const [draft, setDraft] = useState<PlanInput | null>(plan);
  if (plan && (!draft || draft !== plan)) {
    // hydrate whenever a new plan is opened
    if (!draft || (plan as any).id !== (draft as any).id || plan.slug !== draft.slug) {
      // don't loop in render
    }
  }
  // re-init draft when plan reference changes
  useMemoInit(() => setDraft(plan), [plan]);

  if (!draft) return null;
  const setField = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setDraft({ ...draft, [k]: v });

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{(plan as any)?.id ? "Edit plan" : "Create plan"}</DialogTitle>
          <DialogDescription>Store any plan configuration — pricing, limits, and feature flags.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name"><Input value={draft.name} onChange={(e) => setField("name", e.target.value)} /></Field>
          <Field label="Slug (URL-safe)">
            <Input value={draft.slug} onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea rows={2} value={draft.description ?? ""} onChange={(e) => setField("description", e.target.value)} />
          </Field>
          <Field label="Currency">
            <Input value={draft.currency} onChange={(e) => setField("currency", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Sort order">
            <Input type="number" value={draft.sort_order} onChange={(e) => setField("sort_order", Number(e.target.value))} />
          </Field>
          <Field label="Monthly price (cents)">
            <Input type="number" value={draft.monthly_price_cents} onChange={(e) => setField("monthly_price_cents", Number(e.target.value))} />
          </Field>
          <Field label="Yearly price (cents)">
            <Input type="number" value={draft.yearly_price_cents} onChange={(e) => setField("yearly_price_cents", Number(e.target.value))} />
          </Field>
          <Field label="Credits"><Input type="number" value={draft.credits} onChange={(e) => setField("credits", Number(e.target.value))} /></Field>
          
          <Field label="Daily assignment limit"><Input type="number" value={draft.daily_limit} onChange={(e) => setField("daily_limit", Number(e.target.value))} /></Field>
          <Field label="Monthly assignment limit"><Input type="number" value={draft.monthly_limit} onChange={(e) => setField("monthly_limit", Number(e.target.value))} /></Field>
          <Field label="Max upload size (MB)"><Input type="number" value={draft.max_upload_mb} onChange={(e) => setField("max_upload_mb", Number(e.target.value))} /></Field>
          <Field label="Max upload pages"><Input type="number" value={draft.max_upload_pages} onChange={(e) => setField("max_upload_pages", Number(e.target.value))} /></Field>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Feature flags</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEATURE_KEYS.map((f) => (
              <label key={f.key} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span>{f.label}</span>
                <Switch
                  checked={!!draft.features?.[f.key]}
                  onCheckedChange={(v) => setField("features", { ...(draft.features ?? {}), [f.key]: v })}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={draft.is_active} onCheckedChange={(v) => setField("is_active", v)} /> Enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={draft.is_recommended} onCheckedChange={(v) => setField("is_recommended", v)} /> Recommended
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={draft.is_archived} onCheckedChange={(v) => setField("is_archived", v)} /> Archived
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(draft)} disabled={!draft.name || !draft.slug}>Save plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// tiny hook to reinit local state when a dep changes
import { useEffect, useRef } from "react";
function useMemoInit(fn: () => void, deps: any[]) {
  const first = useRef(true);
  const prev = useRef(deps);
  useEffect(() => {
    if (first.current) { first.current = false; fn(); return; }
    if (deps.some((d, i) => d !== prev.current[i])) { fn(); prev.current = deps; }
  });
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ================== SUBSCRIBERS TAB ==================

function SubscribersTab({
  subscribers, plans, loading, refresh,
}: { subscribers: SubscriberRow[]; plans: AdminPlan[]; loading: boolean; refresh: () => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [changePlanFor, setChangePlanFor] = useState<SubscriberRow | null>(null);
  const [creditsFor, setCreditsFor] = useState<{ user: SubscriberRow; mode: "reset" | "bonus" } | null>(null);
  const [extendFor, setExtendFor] = useState<SubscriberRow | null>(null);

  const changePlanFn = useServerFn(changeSubscriberPlan);
  const statusFn = useServerFn(setSubscriptionStatus);
  const extendFn = useServerFn(extendSubscription);
  const creditsFn = useServerFn(adjustCredits);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return subscribers.filter((s) => {
      if (q && !`${s.display_name ?? ""} ${s.email ?? ""} ${s.plan_name}`.toLowerCase().includes(q)) return false;
      if (filter === "all") return true;
      if (filter === "free") return (s.plan_slug === "free") || !s.plan_id;
      if (filter === "monthly") return s.billing_interval === "monthly";
      if (filter === "yearly") return s.billing_interval === "yearly";
      if (filter === "active") return s.status === "active";
      if (filter === "cancelled") return s.status === "cancelled";
      if (filter === "expired") return s.renewal_at ? new Date(s.renewal_at) < new Date() : false;
      return true;
    });
  }, [subscribers, search, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email, user, plan…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No subscribers match.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Lifetime</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8"><AvatarImage src={s.avatar_url ?? undefined} /><AvatarFallback>{initials(s.display_name, s.email)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{s.display_name || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{s.plan_name}</div>
                      <div className="text-xs text-muted-foreground">{s.billing_interval ?? "—"}</div>
                    </TableCell>
                    <TableCell><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></TableCell>
                    <TableCell className="text-xs">{s.started_at ? new Date(s.started_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-xs">{s.renewal_at ? new Date(s.renewal_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-xs">{s.payment_method ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.lifetime_spending_cents)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.credits.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.used.toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setChangePlanFor(s)}>Change plan (upgrade / downgrade)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setExtendFor(s)}>Extend subscription</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {s.status === "active" ? (
                            <DropdownMenuItem onClick={async () => { try { await statusFn({ data: { userId: s.user_id, action: "cancel" } }); toast.success("Cancelled"); refresh(); } catch (e: any) { toast.error(e.message); } }}>Cancel subscription</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={async () => { try { await statusFn({ data: { userId: s.user_id, action: "reactivate" } }); toast.success("Reactivated"); refresh(); } catch (e: any) { toast.error(e.message); } }}>Reactivate</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setCreditsFor({ user: s, mode: "reset" })}>Reset credits</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCreditsFor({ user: s, mode: "bonus" })}>Grant bonus credits</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Change plan */}
      <ChangePlanDialog
        open={!!changePlanFor}
        user={changePlanFor}
        plans={plans}
        onClose={() => setChangePlanFor(null)}
        onSave={async (planId, interval) => {
          if (!changePlanFor) return;
          try { await changePlanFn({ data: { userId: changePlanFor.user_id, planId, billing_interval: interval } }); toast.success("Plan updated"); setChangePlanFor(null); refresh(); }
          catch (e: any) { toast.error(e.message); }
        }}
      />

      {/* Extend */}
      <ExtendDialog
        open={!!extendFor}
        onClose={() => setExtendFor(null)}
        onSave={async (days) => {
          if (!extendFor) return;
          try { await extendFn({ data: { userId: extendFor.user_id, days } }); toast.success("Extended"); setExtendFor(null); refresh(); }
          catch (e: any) { toast.error(e.message); }
        }}
      />

      {/* Credits */}
      <CreditsDialog
        payload={creditsFor}
        onClose={() => setCreditsFor(null)}
        onSave={async (amount) => {
          if (!creditsFor) return;
          try { await creditsFn({ data: { userId: creditsFor.user.user_id, mode: creditsFor.mode, amount } }); toast.success("Credits updated"); setCreditsFor(null); refresh(); }
          catch (e: any) { toast.error(e.message); }
        }}
      />
    </div>
  );
}

function ChangePlanDialog({
  open, user, plans, onClose, onSave,
}: { open: boolean; user: SubscriberRow | null; plans: AdminPlan[]; onClose: () => void; onSave: (planId: string, interval: "monthly" | "yearly") => void }) {
  const [planId, setPlanId] = useState<string>("");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  useEffect(() => { if (user) { setPlanId(user.plan_id ?? ""); setInterval((user.billing_interval as any) ?? "monthly"); } }, [user]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-white/10">
        <DialogHeader><DialogTitle>Change plan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Plan">
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
              <SelectContent>
                {plans.filter((p) => !p.is_archived).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {money(p.monthly_price_cents, p.currency)}/mo</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Billing interval">
            <Select value={interval} onValueChange={(v) => setInterval(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(planId, interval)} disabled={!planId}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtendDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (days: number) => void }) {
  const [days, setDays] = useState(30);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-white/10">
        <DialogHeader><DialogTitle>Extend subscription</DialogTitle></DialogHeader>
        <Field label="Days to add"><Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(days)}>Extend</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreditsDialog({
  payload, onClose, onSave,
}: { payload: { user: SubscriberRow; mode: "reset" | "bonus" } | null; onClose: () => void; onSave: (amount: number) => void }) {
  const [amount, setAmount] = useState(1000);
  useEffect(() => { setAmount(payload?.mode === "reset" ? 10000 : 1000); }, [payload]);
  return (
    <Dialog open={!!payload} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-white/10">
        <DialogHeader>
          <DialogTitle>{payload?.mode === "reset" ? "Reset credits" : "Grant bonus credits"}</DialogTitle>
          <DialogDescription>
            {payload?.mode === "reset"
              ? "Sets the user's balance to this exact amount and clears used."
              : "Adds this amount to the user's current balance."}
          </DialogDescription>
        </DialogHeader>
        <Field label="Amount"><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(amount)}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ================== ANALYTICS TAB ==================

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#06b6d4", "#a855f7", "#6366f1", "#0ea5e9"];

function AnalyticsTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="glass border-white/10 rounded-2xl p-5">
        <h3 className="font-display font-semibold mb-4">Subscriptions over time (30d)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.overTime}>
            <defs><linearGradient id="s1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" fontSize={10} stroke="#888" />
            <YAxis fontSize={10} stroke="#888" />
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }} />
            <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#s1)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="glass border-white/10 rounded-2xl p-5">
        <h3 className="font-display font-semibold mb-4">Revenue by plan (monthly)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.revenueByPlan}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="plan" fontSize={10} stroke="#888" />
            <YAxis fontSize={10} stroke="#888" />
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="glass border-white/10 rounded-2xl p-5">
        <h3 className="font-display font-semibold mb-4">Most popular plans</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data.popularPlans} dataKey="count" nameKey="plan" outerRadius={80} label>
              {data.popularPlans.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="glass border-white/10 rounded-2xl p-5 flex flex-col justify-center">
        <div className="text-sm text-muted-foreground">Cancellation rate</div>
        <div className="text-5xl font-display font-bold mt-2">{data.cancellationRate}%</div>
        <div className="text-xs text-muted-foreground mt-1">Cancelled ÷ (Active + Cancelled)</div>
      </Card>
    </div>
  );
}
