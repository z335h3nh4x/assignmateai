import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users as UsersIcon, Search, MoreHorizontal, Shield, ShieldOff, Ban, CircleCheck,
  RefreshCcw, Trash2, Pencil, Eye, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import {
  listAdminUsers, updateUserProfile, setUserAdminRole, setUserBanned,
  resetUserCredits, deleteUser, type AdminUserRow,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

const PAGE_SIZE = 10;

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function relTime(iso?: string | null) {
  if (!iso) return "Never";
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

function AdminUsers() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listAdminUsers);
  const updateFn = useServerFn(updateUserProfile);
  const roleFn = useServerFn(setUserAdminRole);
  const banFn = useServerFn(setUserBanned);
  const creditsFn = useServerFn(resetUserCredits);
  const deleteFn = useServerFn(deleteUser);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
    refetchInterval: 60_000,
  });

  const users = data?.users;
  const meId = data?.meId ?? "";
  const adminCount = data?.adminCount ?? 0;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "active">("newest");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [viewing, setViewing] = useState<AdminUserRow | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);
  const [promoting, setPromoting] = useState<AdminUserRow | null>(null);
  const [demoting, setDemoting] = useState<AdminUserRow | null>(null);

  const plans = useMemo(() => {
    const set = new Set<string>();
    for (const u of users ?? []) set.add(u.plan);
    return Array.from(set);
  }, [users]);

  const filtered = useMemo(() => {
    let list: AdminUserRow[] = users ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.display_name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q),
      );
    }
    if (planFilter !== "all") list = list.filter((u) => u.plan === planFilter);
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (statusFilter === "banned") list = list.filter((u) => !!u.banned_at);
    else if (statusFilter === "active") list = list.filter((u) => !u.banned_at);

    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    else if (sort === "oldest") sorted.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
    else sorted.sort((a, b) => (a.assignments_count === b.assignments_count
      ? ((a.last_active ?? "") < (b.last_active ?? "") ? 1 : -1)
      : b.assignments_count - a.assignments_count));
    return sorted;
  }, [users, search, planFilter, roleFilter, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);


  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  async function run<T>(label: string, p: Promise<T>) {
    try {
      await p;
      toast.success(label);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const mUpdate = useMutation({ mutationFn: (v: { userId: string; display_name: string; email: string }) => updateFn({ data: v }) });

  function openEdit(u: AdminUserRow) {
    setEditing(u);
    setEditName(u.display_name ?? "");
    setEditEmail(u.email ?? "");
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await mUpdate.mutateAsync({ userId: editing.id, display_name: editName, email: editEmail });
      toast.success("User updated");
      setEditing(null);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage registered users, roles, and access.</p>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {filtered.length} of {users?.length ?? 0} users

        </div>
      </div>

      <Card className="glass border-white/10 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-background/40"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-[150px] bg-background/40"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="active">Most active</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-background/40"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {plans.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-background/40"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-background/40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="glass border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Assignments</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-white/10">
                    <TableCell colSpan={9}>
                      <div className="h-10 rounded-md bg-white/5 animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableCell colSpan={9}>
                    <div className="py-14 text-center">
                      <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">No users match your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((u) => (
                  <TableRow key={u.id} className="border-white/10">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {u.avatar_url && <AvatarImage src={u.avatar_url} alt="" />}
                          <AvatarFallback className="gradient-bg text-white text-xs">
                            {initials(u.display_name, u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{u.display_name || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.email || "—"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge className="gradient-bg text-white border-0">Admin</Badge>
                      ) : u.role === "moderator" ? (
                        <Badge variant="secondary">Moderator</Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{u.plan}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{u.credits.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.assignments_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{relTime(u.last_active)}</TableCell>
                    <TableCell>
                      {u.banned_at ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setViewing(u)}>
                            <Eye className="h-4 w-4 mr-2" /> View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit user
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.role === "admin" ? (
                            <DropdownMenuItem
                              disabled={u.id === meId || adminCount <= 1}
                              title={
                                u.id === meId
                                  ? "You cannot remove your own admin role."
                                  : adminCount <= 1
                                    ? "At least one admin must remain."
                                    : undefined
                              }
                              onClick={() => setDemoting(u)}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" /> Remove admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setPromoting(u)}>
                              <Shield className="h-4 w-4 mr-2" /> Promote to admin
                            </DropdownMenuItem>
                          )}
                          {u.banned_at ? (
                            <DropdownMenuItem onClick={() => run("User unbanned", banFn({ data: { userId: u.id, banned: false } }))}>
                              <CircleCheck className="h-4 w-4 mr-2" /> Unban user
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={u.id === meId}
                              title={u.id === meId ? "You cannot ban yourself." : undefined}
                              onClick={() => run("User banned", banFn({ data: { userId: u.id, banned: true } }))}
                            >
                              <Ban className="h-4 w-4 mr-2" /> Ban user
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => run("Credits reset", creditsFn({ data: { userId: u.id } }))}>
                            <RefreshCcw className="h-4 w-4 mr-2" /> Reset credits
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={u.id === meId}
                            title={u.id === meId ? "You cannot delete your own account." : undefined}
                            onClick={() => setDeleting(u)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete user
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
            <div className="text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
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

      {/* View profile */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>User profile</DialogTitle>
            <DialogDescription>Details for the selected user.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {viewing.avatar_url && <AvatarImage src={viewing.avatar_url} />}
                  <AvatarFallback className="gradient-bg text-white">{initials(viewing.display_name, viewing.email)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{viewing.display_name || "—"}</div>
                  <div className="text-sm text-muted-foreground">{viewing.email || "—"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Role" value={viewing.role} />
                <Info label="Plan" value={`${viewing.plan} (${viewing.plan_status})`} />
                <Info label="Credits" value={viewing.credits.toLocaleString()} />
                <Info label="Credits used" value={viewing.used.toLocaleString()} />
                <Info label="Assignments" value={viewing.assignments_count.toString()} />
                <Info label="Status" value={viewing.banned_at ? "Banned" : "Active"} />
                <Info label="Registered" value={fmtDate(viewing.created_at)} />
                <Info label="Last active" value={relTime(viewing.last_active)} />
              </div>
              <div className="text-xs text-muted-foreground break-all">ID: {viewing.id}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit user */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update basic profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={mUpdate.isPending} className="gradient-bg text-white">
              {mUpdate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleting?.email || "the account"} and all of their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                const target = deleting;
                setDeleting(null);
                await run("User deleted", deleteFn({ data: { userId: target.id } }));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote to admin confirmation */}
      <AlertDialog open={!!promoting} onOpenChange={(o) => !o && setPromoting(null)}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {promoting?.display_name || promoting?.email || "This user"} will gain full admin access, including this dashboard and all destructive actions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gradient-bg text-white"
              onClick={async () => {
                if (!promoting) return;
                const target = promoting;
                setPromoting(null);
                await run("Promoted to admin", roleFn({ data: { userId: target.id, makeAdmin: true } }));
              }}
            >
              Promote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove admin confirmation */}
      <AlertDialog open={!!demoting} onOpenChange={(o) => !o && setDemoting(null)}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin role?</AlertDialogTitle>
            <AlertDialogDescription>
              {demoting?.display_name || demoting?.email || "This user"} will lose access to the admin dashboard and revert to a regular user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!demoting) return;
                const target = demoting;
                setDemoting(null);
                await run("Admin role removed", roleFn({ data: { userId: target.id, makeAdmin: false } }));
              }}
            >
              Remove admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium capitalize">{value}</div>
    </div>
  );
}
