import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Flag,
  Megaphone,
  History,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Loader2,
  Download,
  Search,
  Settings as SettingsIcon,
  Palette,
  LayoutTemplate,
  X,
} from "lucide-react";


import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  listFeatureFlags,
  setFeatureFlag,
  listAnnouncements,
  upsertAnnouncement,
  deleteAnnouncement,
  listAuditLogs,
  exportAuditLogsCsv,
  listPlatformSettings,
  upsertPlatformSettings,
  type FeatureFlag,
  type Announcement,
  type AuditLogRow,
  type PlatformSetting,
} from "@/lib/admin-settings.functions";


export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Platform Settings — Admin" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure the entire Assignmate platform — branding, landing page copy, feature flags,
          announcements and admin audit logs — all in one place.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="glass border border-white/10 flex flex-wrap h-auto p-1">
          <TabsTrigger value="general" className="gap-1.5">
            <SettingsIcon className="h-3.5 w-3.5" /> General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Branding
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-1.5">
            <LayoutTemplate className="h-3.5 w-3.5" /> Landing Page
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-1.5">
            <Flag className="h-3.5 w-3.5" /> Feature Flags
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" /> Announcements
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingsPanel />
        </TabsContent>
        <TabsContent value="branding" className="mt-6">
          <BrandingSettingsPanel />
        </TabsContent>
        <TabsContent value="landing" className="mt-6">
          <LandingSettingsPanel />
        </TabsContent>
        <TabsContent value="flags" className="mt-6">
          <FeatureFlagsPanel />
        </TabsContent>
        <TabsContent value="announcements" className="mt-6">
          <AnnouncementsPanel />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AuditLogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}


/* ============================ Feature Flags ============================ */

function FeatureFlagsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => listFeatureFlags(),
  });

  const [draft, setDraft] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (data) {
      const map: Record<string, boolean> = {};
      for (const f of data) map[f.key] = f.enabled;
      setDraft(map);
    }
  }, [data]);

  const dirty = useMemo(() => {
    if (!data) return false;
    return data.some((f) => draft[f.key] !== f.enabled);
  }, [data, draft]);
  useUnsavedChanges(dirty);

  const [saving, setSaving] = useState(false);
  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const changed = data.filter((f) => draft[f.key] !== f.enabled);
      for (const f of changed) {
        await setFeatureFlag({ data: { key: f.key, enabled: draft[f.key] } });
      }
      toast.success(`Saved ${changed.length} flag${changed.length === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save flags");
    } finally {
      setSaving(false);
    }
  }
  function reset() {
    if (!data) return;
    const map: Record<string, boolean> = {};
    for (const f of data) map[f.key] = f.enabled;
    setDraft(map);
  }

  return (
    <Card className="glass border-white/10 p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Global Feature Flags</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Master kill-switch layer. When a flag is <b>off</b> the feature is disabled for
            everyone — including paid plans. When <b>on</b>, plan-based entitlements decide who
            has access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} disabled={!dirty || saving}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={!dirty || saving}
            className="gradient-bg text-white border-0"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save changes
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {(data ?? []).map((f) => (
            <FlagRow
              key={f.key}
              flag={f}
              enabled={draft[f.key] ?? f.enabled}
              onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
            />
          ))}
        </div>
      )}
      {dirty && (
        <p className="text-xs text-amber-400">Unsaved changes — remember to save before leaving.</p>
      )}
    </Card>
  );
}

function FlagRow({
  flag,
  enabled,
  onChange,
}: {
  flag: FeatureFlag;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-foreground/90">{flag.key}</code>
          {!enabled && (
            <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">
              disabled
            </Badge>
          )}
        </div>
        {flag.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{flag.description}</p>
        )}
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}

/* ============================ Announcements ============================ */

const AUDIENCE_OPTIONS = [
  { value: "homepage", label: "Homepage" },
  { value: "dashboard", label: "Dashboard" },
  { value: "admin", label: "Admin" },
] as const;

type AnnouncementDraft = {
  id?: string;
  title: string;
  message: string;
  button_text: string;
  button_url: string;
  bg_color: string;
  audiences: string[];
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const EMPTY_ANNOUNCEMENT: AnnouncementDraft = {
  title: "",
  message: "",
  button_text: "",
  button_url: "",
  bg_color: "#6366f1",
  audiences: ["homepage"],
  starts_at: "",
  ends_at: "",
  is_active: true,
};

function AnnouncementsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => listAnnouncements(),
  });
  const [editing, setEditing] = useState<AnnouncementDraft | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteAnnouncement({ data: { id } }),
    onSuccess: () => {
      toast.success("Announcement deleted");
      qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  return (
    <Card className="glass border-white/10 p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Announcements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Banners shown on Homepage, Dashboard or Admin. Only active announcements inside their
            date window are visible.
          </p>
        </div>
        <Button
          size="sm"
          className="gradient-bg text-white border-0"
          onClick={() => setEditing({ ...EMPTY_ANNOUNCEMENT })}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New announcement
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
          No announcements yet. Create one to show a banner across the platform.
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((a) => (
            <AnnouncementRow
              key={a.id}
              a={a}
              onEdit={() => setEditing(toDraft(a))}
              onDelete={() => setDeleteId(a.id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <AnnouncementEditor
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
          }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the banner immediately for everyone. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && del.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function toDraft(a: Announcement): AnnouncementDraft {
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    button_text: a.button_text ?? "",
    button_url: a.button_url ?? "",
    bg_color: a.bg_color,
    audiences: a.audiences,
    starts_at: a.starts_at ? a.starts_at.slice(0, 16) : "",
    ends_at: a.ends_at ? a.ends_at.slice(0, 16) : "",
    is_active: a.is_active,
  };
}

function AnnouncementRow({
  a,
  onEdit,
  onDelete,
}: {
  a: Announcement;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const now = Date.now();
  const active =
    a.is_active &&
    (!a.starts_at || new Date(a.starts_at).getTime() <= now) &&
    (!a.ends_at || new Date(a.ends_at).getTime() >= now);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-start gap-3">
      <div
        className="h-10 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: a.bg_color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{a.title}</span>
          {active ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Inactive
            </Badge>
          )}
          {a.audiences.map((aud) => (
            <Badge key={aud} variant="outline" className="text-[10px] capitalize">
              {aud}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AnnouncementEditor({
  value,
  onClose,
  onSaved,
}: {
  value: AnnouncementDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);

  async function save() {
    if (!draft.title.trim() || !draft.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (draft.audiences.length === 0) {
      toast.error("Select at least one audience");
      return;
    }
    setSaving(true);
    try {
      await upsertAnnouncement({
        data: {
          id: draft.id,
          title: draft.title.trim(),
          message: draft.message.trim(),
          button_text: draft.button_text.trim() || null,
          button_url: draft.button_url.trim() || null,
          bg_color: draft.bg_color,
          audiences: draft.audiences as ("homepage" | "dashboard" | "admin")[],
          starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
          ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
          is_active: draft.is_active,
        },
      });
      toast.success(draft.id ? "Announcement updated" : "Announcement created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleAudience(v: string, checked: boolean) {
    setDraft((d) => ({
      ...d,
      audiences: checked ? Array.from(new Set([...d.audiences, v])) : d.audiences.filter((a) => a !== v),
    }));
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (o) return;
        if (dirty && !window.confirm("Discard unsaved changes?")) return;
        onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit announcement" : "New announcement"}</DialogTitle>
          <DialogDescription>Show a banner on the sites you choose during a time window.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Scheduled maintenance"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              rows={3}
              placeholder="Assignmate will be briefly unavailable on Saturday at 10 PM UTC."
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Button text</Label>
              <Input
                value={draft.button_text}
                onChange={(e) => setDraft({ ...draft, button_text: e.target.value })}
                placeholder="Learn more"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Button URL</Label>
              <Input
                value={draft.button_url}
                onChange={(e) => setDraft({ ...draft, button_url: e.target.value })}
                placeholder="https://…"
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Starts</Label>
              <Input
                type="datetime-local"
                value={draft.starts_at}
                onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Ends</Label>
              <Input
                type="datetime-local"
                value={draft.ends_at}
                onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Background color</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="color"
                  value={draft.bg_color}
                  onChange={(e) => setDraft({ ...draft, bg_color: e.target.value })}
                  className="h-9 w-12 rounded border border-white/10 bg-transparent"
                />
                <Input
                  value={draft.bg_color}
                  onChange={(e) => setDraft({ ...draft, bg_color: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex items-center gap-2 mt-3">
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
                />
                <span className="text-sm text-muted-foreground">
                  {draft.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Audiences</Label>
            <div className="flex flex-wrap gap-3">
              {AUDIENCE_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.audiences.includes(o.value)}
                    onCheckedChange={(v) => toggleAudience(o.value, !!v)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !dirty} className="gradient-bg text-white border-0">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ Audit Logs ============================ */

const ACTION_FILTERS = [
  "all",
  "admin.access",
  "user.role.grant_admin",
  "user.role.revoke_admin",
  "user.ban",
  "user.unban",
  "user.delete",
  "user.credits.reset",
  "user.profile.update",
  "plan.create",
  "plan.update",
  "plan.delete",
  "plan.duplicate",
  "plan.flag",
  "plan.reorder",
  "subscription.change_plan",
  "subscription.cancel",
  "subscription.reactivate",
  "subscription.extend",
  "credits.bonus",
  "credits.reset",
  "assignment.delete",
  "announcement.create",
  "announcement.update",
  "announcement.delete",
  "feature_flag.update",
  "settings.update",
] as const;

function AuditLogsPanel() {
  const [action, setAction] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(200);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "audit-logs", action, limit],
    queryFn: () =>
      listAuditLogs({
        data: { limit, action: action === "all" ? undefined : action },
      }),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (r) =>
        r.action.toLowerCase().includes(q) ||
        r.actor_email?.toLowerCase().includes(q) ||
        r.target_user_email?.toLowerCase().includes(q) ||
        r.entity_id?.toLowerCase().includes(q),
    );
  }, [data, search]);

  async function download() {
    try {
      const csv = await exportAuditLogsCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit logs exported");
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    }
  }

  return (
    <Card className="glass border-white/10 p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Audit Logs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Every admin action — role changes, bans, deletes, plan edits, credit changes,
            settings updates — is recorded here.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, email, entity id…"
            className="pl-9"
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTERS.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "all" ? "All actions" : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[50, 100, 200, 500].map((n) => (
              <SelectItem key={n} value={String(n)}>
                Last {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
          No audit events match those filters yet.
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 divide-y divide-white/5 overflow-hidden">
          {filtered.map((r) => (
            <AuditRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </Card>
  );
}

function AuditRow({ r }: { r: AuditLogRow }) {
  const when = new Date(r.created_at);
  return (
    <div className="p-3 hover:bg-white/[0.03] grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2">
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {when.toLocaleString()}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-[10px]">
            {r.action}
          </Badge>
          {r.entity_type && (
            <span className="text-xs text-muted-foreground">
              {r.entity_type}
              {r.entity_id ? `#${r.entity_id.slice(0, 8)}` : ""}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          by <span className="text-foreground/80">{r.actor_email ?? r.actor_id?.slice(0, 8) ?? "system"}</span>
          {r.target_user_email && (
            <>
              {" → "}
              <span className="text-foreground/80">{r.target_user_email}</span>
            </>
          )}
        </div>
        {Object.keys(r.metadata ?? {}).length > 0 && (
          <code className="mt-1 block text-[11px] text-muted-foreground/80 truncate">
            {JSON.stringify(r.metadata)}
          </code>
        )}
      </div>
      {r.ip && <div className="text-[11px] font-mono text-muted-foreground self-start">{r.ip}</div>}
    </div>
  );
}

/* ============================ Settings Framework ============================ */

type FieldType = "text" | "textarea" | "email" | "url" | "color" | "number" | "switch";

type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  default?: any;
  rows?: number;
  min?: number;
  max?: number;
};

function useSettingsMap() {
  return useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: () => listPlatformSettings(),
    select: (rows: PlatformSetting[]) => {
      const map: Record<string, any> = {};
      for (const r of rows) map[r.key] = r.value;
      return map;
    },
  });
}

function useSettingsDraft(prefix: string, fields: FieldDef[]) {
  const qc = useQueryClient();
  const { data, isLoading } = useSettingsMap();
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [initial, setInitial] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!data) return;
    const next: Record<string, any> = {};
    for (const f of fields) {
      const k = `${prefix}.${f.key}`;
      next[f.key] = data[k] ?? f.default ?? (f.type === "switch" ? false : f.type === "number" ? 0 : "");
    }
    setDraft(next);
    setInitial(next);
  }, [data, prefix]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );
  useUnsavedChanges(dirty);

  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const entries = fields
        .filter((f) => JSON.stringify(draft[f.key]) !== JSON.stringify(initial[f.key]))
        .map((f) => ({ key: `${prefix}.${f.key}`, value: draft[f.key] }));
      if (entries.length === 0) {
        toast.info("Nothing to save");
        return;
      }
      await upsertPlatformSettings({ data: { entries } });
      toast.success(`Saved ${entries.length} setting${entries.length === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }
  function reset() {
    setDraft(initial);
  }
  function setValue(key: string, value: any) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  return { draft, setValue, isLoading, dirty, saving, save, reset };
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.type === "switch") {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="min-w-0">
          <Label className="text-sm">{field.label}</Label>
          {field.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
          )}
        </div>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        <Label>{field.label}</Label>
        <Textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          className="mt-1.5"
        />
        {field.description && (
          <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
        )}
      </div>
    );
  }
  if (field.type === "color") {
    return (
      <div>
        <Label>{field.label}</Label>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 rounded border border-white/10 bg-transparent"
          />
          <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
        </div>
        {field.description && (
          <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
        )}
      </div>
    );
  }
  return (
    <div>
      <Label>{field.label}</Label>
      <Input
        type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
        value={value ?? ""}
        min={field.min}
        max={field.max}
        onChange={(e) =>
          onChange(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
        }
        placeholder={field.placeholder}
        className="mt-1.5"
      />
      {field.description && (
        <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
      )}
    </div>
  );
}

function SettingsPanelShell({
  title,
  description,
  children,
  saving,
  dirty,
  onSave,
  onReset,
  isLoading,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
  isLoading: boolean;
}) {
  return (
    <Card className="glass border-white/10 p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReset} disabled={!dirty || saving}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!dirty || saving}
            className="gradient-bg text-white border-0"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save changes
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        children
      )}
      {dirty && (
        <p className="text-xs text-amber-400">Unsaved changes — remember to save before leaving.</p>
      )}
    </Card>
  );
}

/* ============================ General ============================ */

const GENERAL_FIELDS: FieldDef[] = [
  { key: "platform_name", label: "Platform name", type: "text", default: "Assignmate", placeholder: "Assignmate" },
  { key: "tagline", label: "Tagline", type: "text", default: "AI-powered assignment workspace for students.", placeholder: "One-line description" },
  { key: "support_email", label: "Support email", type: "email", placeholder: "support@assignmate.app" },
  { key: "contact_email", label: "Contact email", type: "email", placeholder: "hello@assignmate.app" },
  { key: "footer_text", label: "Footer text", type: "text", placeholder: "© 2026 Assignmate. All rights reserved." },
  { key: "default_locale", label: "Default locale", type: "text", default: "en-US", placeholder: "en-US" },
  { key: "timezone", label: "Default timezone", type: "text", default: "UTC", placeholder: "UTC" },
  { key: "maintenance_mode", label: "Maintenance mode", type: "switch", description: "When on, non-admins see a maintenance notice on the app.", default: false },
];

function GeneralSettingsPanel() {
  const s = useSettingsDraft("general", GENERAL_FIELDS);
  return (
    <SettingsPanelShell
      title="General"
      description="Platform identity, contact channels and global operating defaults."
      saving={s.saving}
      dirty={s.dirty}
      onSave={s.save}
      onReset={s.reset}
      isLoading={s.isLoading}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GENERAL_FIELDS.map((f) => (
          <FieldRow key={f.key} field={f} value={s.draft[f.key]} onChange={(v) => s.setValue(f.key, v)} />
        ))}
      </div>
    </SettingsPanelShell>
  );
}

/* ============================ Branding ============================ */

const BRANDING_FIELDS: FieldDef[] = [
  { key: "logo_url", label: "Logo URL (light)", type: "url", placeholder: "https://…/logo.svg" },
  { key: "logo_dark_url", label: "Logo URL (dark)", type: "url", placeholder: "https://…/logo-dark.svg" },
  { key: "favicon_url", label: "Favicon URL", type: "url", placeholder: "https://…/favicon.ico" },
  { key: "og_image_url", label: "Social share image", type: "url", placeholder: "https://…/og.png", description: "1200×630 recommended." },
  { key: "primary_color", label: "Primary color", type: "color", default: "#6366f1" },
  { key: "accent_color", label: "Accent color", type: "color", default: "#8b5cf6" },
  { key: "brand_font", label: "Brand font", type: "text", default: "Inter", placeholder: "Inter, Sora, …" },
];

function BrandingSettingsPanel() {
  const s = useSettingsDraft("branding", BRANDING_FIELDS);
  const logo = s.draft.logo_url as string | undefined;
  const dark = s.draft.logo_dark_url as string | undefined;
  return (
    <SettingsPanelShell
      title="Branding"
      description="Logos, favicon, social preview image and brand palette."
      saving={s.saving}
      dirty={s.dirty}
      onSave={s.save}
      onReset={s.reset}
      isLoading={s.isLoading}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BRANDING_FIELDS.map((f) => (
          <FieldRow key={f.key} field={f} value={s.draft[f.key]} onChange={(v) => s.setValue(f.key, v)} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <LogoPreview label="Light preview" src={logo} background="#ffffff" />
        <LogoPreview label="Dark preview" src={dark || logo} background="#0b0b12" />
      </div>
    </SettingsPanelShell>
  );
}

function LogoPreview({ label, src, background }: { label: string; src?: string; background: string }) {
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-3 py-1.5 bg-white/5">
        {label}
      </div>
      <div className="h-24 flex items-center justify-center" style={{ background }}>
        {src ? (
          <img src={src} alt={label} className="max-h-16 max-w-[70%] object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground/70">No image set</span>
        )}
      </div>
    </div>
  );
}

/* ============================ Landing Page ============================ */

const LANDING_FIELDS: FieldDef[] = [
  { key: "hero_eyebrow", label: "Hero eyebrow", type: "text", placeholder: "New — AI assignment workspace" },
  { key: "hero_title", label: "Hero title", type: "text", placeholder: "Turn any assignment into a polished submission" },
  { key: "hero_subtitle", label: "Hero subtitle", type: "textarea", rows: 2, placeholder: "Upload, generate, humanize, export — in one click." },
  { key: "hero_cta_text", label: "Primary CTA text", type: "text", default: "Get started", placeholder: "Get started" },
  { key: "hero_cta_url", label: "Primary CTA URL", type: "url", default: "/auth", placeholder: "/auth" },
  { key: "hero_secondary_cta_text", label: "Secondary CTA text", type: "text", placeholder: "See pricing" },
  { key: "hero_secondary_cta_url", label: "Secondary CTA URL", type: "url", placeholder: "/#pricing" },
  { key: "show_pricing", label: "Show pricing section", type: "switch", default: true },
  { key: "show_testimonials", label: "Show testimonials section", type: "switch", default: false },
  { key: "show_faq", label: "Show FAQ section", type: "switch", default: true },
  { key: "pricing_heading", label: "Pricing heading", type: "text", default: "Simple, transparent pricing", placeholder: "Pricing heading" },
  { key: "faq_heading", label: "FAQ heading", type: "text", default: "Frequently asked questions", placeholder: "FAQ heading" },
];

type ListItem = { question?: string; answer?: string; title?: string; body?: string };

function LandingSettingsPanel() {
  const s = useSettingsDraft("landing", LANDING_FIELDS);
  const qc = useQueryClient();
  const { data: settingsMap, isLoading } = useSettingsMap();
  const [faq, setFaq] = useState<ListItem[]>([]);
  const [features, setFeatures] = useState<ListItem[]>([]);
  const [initialLists, setInitialLists] = useState<{ faq: ListItem[]; features: ListItem[] }>({ faq: [], features: [] });
  const [listSaving, setListSaving] = useState(false);

  useEffect(() => {
    if (!settingsMap) return;
    const f = Array.isArray(settingsMap["landing.faq"]) ? settingsMap["landing.faq"] : [];
    const feats = Array.isArray(settingsMap["landing.features"]) ? settingsMap["landing.features"] : [];
    setFaq(f);
    setFeatures(feats);
    setInitialLists({ faq: f, features: feats });
  }, [settingsMap]);

  const listsDirty =
    JSON.stringify(faq) !== JSON.stringify(initialLists.faq) ||
    JSON.stringify(features) !== JSON.stringify(initialLists.features);
  useUnsavedChanges(listsDirty);

  async function saveLists() {
    setListSaving(true);
    try {
      await upsertPlatformSettings({
        data: {
          entries: [
            { key: "landing.faq", value: faq.filter((i) => (i.question || "").trim() || (i.answer || "").trim()) },
            { key: "landing.features", value: features.filter((i) => (i.title || "").trim() || (i.body || "").trim()) },
          ],
        },
      });
      toast.success("Landing content saved");
      qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setListSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPanelShell
        title="Landing page — hero & sections"
        description="Hero copy, primary calls to action and visibility of home page sections."
        saving={s.saving}
        dirty={s.dirty}
        onSave={s.save}
        onReset={s.reset}
        isLoading={s.isLoading}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LANDING_FIELDS.map((f) => (
            <FieldRow key={f.key} field={f} value={s.draft[f.key]} onChange={(v) => s.setValue(f.key, v)} />
          ))}
        </div>
      </SettingsPanelShell>

      <Card className="glass border-white/10 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display text-xl font-semibold">Features & FAQ</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Editable lists rendered on the landing page. Empty rows are dropped on save.
            </p>
          </div>
          <Button
            size="sm"
            onClick={saveLists}
            disabled={!listsDirty || listSaving}
            className="gradient-bg text-white border-0"
          >
            {listSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save lists
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ListEditor
              heading="Features"
              items={features}
              onChange={setFeatures}
              fields={[
                { key: "title", label: "Title", placeholder: "Multi-format uploads" },
                { key: "body", label: "Description", placeholder: "PDF, DOCX, images, or plain text — we handle all of it.", textarea: true },
              ]}
              addLabel="Add feature"
            />
            <ListEditor
              heading="FAQ"
              items={faq}
              onChange={setFaq}
              fields={[
                { key: "question", label: "Question", placeholder: "Is my data private?" },
                { key: "answer", label: "Answer", placeholder: "Yes — assignments and files stay in your account.", textarea: true },
              ]}
              addLabel="Add question"
            />
          </div>
        )}
        {listsDirty && (
          <p className="text-xs text-amber-400">Unsaved list changes — remember to save.</p>
        )}
      </Card>
    </div>
  );
}

function ListEditor({
  heading,
  items,
  onChange,
  fields,
  addLabel,
}: {
  heading: string;
  items: ListItem[];
  onChange: (v: ListItem[]) => void;
  fields: { key: keyof ListItem; label: string; placeholder?: string; textarea?: boolean }[];
  addLabel: string;
}) {
  function update(i: number, key: keyof ListItem, value: string) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, {}]);
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{heading}</h3>
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> {addLabel}
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
          Nothing here yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 relative">
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-2 right-2 h-6 w-6 rounded hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {fields.map((f) => (
                <div key={String(f.key)}>
                  <Label className="text-xs">{f.label}</Label>
                  {f.textarea ? (
                    <Textarea
                      value={(it[f.key] as string) ?? ""}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={2}
                      className="mt-1"
                    />
                  ) : (
                    <Input
                      value={(it[f.key] as string) ?? ""}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

