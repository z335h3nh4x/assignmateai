import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAudit } from "./audit.server";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}


export type AdminUserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  banned_at: string | null;
  role: "admin" | "moderator" | "user";
  plan: string;
  plan_status: string;
  credits: number;
  used: number;
  assignments_count: number;
  last_active: string | null;
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  meId: string;
  adminCount: number;
};

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUsersResponse> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, rolesRes, subsRes, plansRes, usageRes, assignmentsRes, authRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, display_name, avatar_url, created_at, banned_at, updated_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("subscriptions").select("user_id, plan, plan_id, status"),
      supabaseAdmin.from("plans").select("id, slug, credits"),
      supabaseAdmin.from("usage_counters").select("user_id, credits_used, cycle_started_at, updated_at"),
      supabaseAdmin.from("assignments").select("user_id, updated_at").range(0, 49999),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const roleMap = new Map<string, "admin" | "moderator" | "user">();
    let adminCount = 0;
    for (const r of rolesRes.data ?? []) {
      const prev = roleMap.get(r.user_id);
      if (r.role === "admin" || (r.role === "moderator" && prev !== "admin")) {
        roleMap.set(r.user_id, r.role);
      } else if (!prev) roleMap.set(r.user_id, r.role);
      if (r.role === "admin") adminCount += 1;
    }

    // Plan credit allowances (source of truth for balances)
    const planById = new Map<string, { slug: string; credits: number }>();
    const planBySlug = new Map<string, { slug: string; credits: number }>();
    for (const p of plansRes.data ?? []) {
      planById.set(p.id, { slug: p.slug, credits: p.credits ?? 0 });
      planBySlug.set(p.slug, { slug: p.slug, credits: p.credits ?? 0 });
    }
    const freeCredits = planBySlug.get("free")?.credits ?? 0;

    const subMap = new Map<string, { plan: string; status: string; allowance: number }>();
    for (const s of subsRes.data ?? []) {
      const active = !s.status || s.status === "active" || s.status === "trialing";
      const plan = (active && (s.plan_id ? planById.get(s.plan_id) : undefined)) ||
        (active && s.plan ? planBySlug.get(s.plan) : undefined);
      subMap.set(s.user_id, {
        plan: plan?.slug ?? s.plan ?? "free",
        status: s.status ?? "inactive",
        allowance: plan?.credits ?? freeCredits,
      });
    }

    // Credits used within the current 30-day cycle
    const CYCLE_MS = 30 * 24 * 60 * 60 * 1000;
    const usageMap = new Map<string, { used: number; updated_at: string | null }>();
    for (const u of usageRes.data ?? []) {
      const start = u.cycle_started_at ? new Date(u.cycle_started_at).getTime() : 0;
      const inCycle = start > 0 && Date.now() < start + CYCLE_MS;
      usageMap.set(u.user_id, { used: inCycle ? (u.credits_used ?? 0) : 0, updated_at: u.updated_at ?? null });
    }

    const countMap = new Map<string, { count: number; last: string | null }>();
    for (const a of assignmentsRes.data ?? []) {
      const cur = countMap.get(a.user_id) ?? { count: 0, last: null };
      cur.count += 1;
      if (!cur.last || (a.updated_at && a.updated_at > cur.last)) cur.last = a.updated_at;
      countMap.set(a.user_id, cur);
    }

    const signInMap = new Map<string, string | null>();
    for (const u of authRes.data?.users ?? []) {
      signInMap.set(u.id, (u.last_sign_in_at as string | null) ?? null);
    }

    const latest = (...vals: (string | null | undefined)[]) =>
      vals.filter(Boolean).sort().pop() ?? null;

    const users = (profilesRes.data ?? []).map((p) => {
      const sub = subMap.get(p.id);
      const allowance = sub?.allowance ?? freeCredits;
      const usage = usageMap.get(p.id);
      const used = usage?.used ?? 0;
      return {
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        banned_at: (p as any).banned_at ?? null,
        role: roleMap.get(p.id) ?? "user",
        plan: sub?.plan ?? "free",
        plan_status: sub?.status ?? "inactive",
        credits: Math.max(0, allowance - used),
        used,
        assignments_count: countMap.get(p.id)?.count ?? 0,
        last_active: latest(
          signInMap.get(p.id),
          countMap.get(p.id)?.last,
          usage?.updated_at,
          (p as any).updated_at,
        ),
      };
    });

    return { users, meId: context.userId, adminCount };
  });



export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; display_name?: string | null; email?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { display_name?: string | null; email?: string | null } = {};
    if (data.display_name !== undefined) patch.display_name = data.display_name;
    if (data.email !== undefined) patch.email = data.email;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: "user.profile.update",
      entityType: "user",
      entityId: data.userId,
      targetUserId: data.userId,
      metadata: patch,
    });
    return { ok: true };
  });

export const setUserAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; makeAdmin: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      if (data.userId === context.userId) throw new Error("You cannot remove your own admin role.");
      const { count, error: countErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countErr) throw new Error(countErr.message);
      if ((count ?? 0) <= 1) throw new Error("At least one admin must remain.");
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    await logAudit(context, {
      action: data.makeAdmin ? "user.role.grant_admin" : "user.role.revoke_admin",
      entityType: "user",
      entityId: data.userId,
      targetUserId: data.userId,
    });
    return { ok: true };
  });

export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; banned: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.banned && data.userId === context.userId) throw new Error("You cannot ban yourself.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ banned_at: data.banned ? new Date().toISOString() : null } as any)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: data.banned ? "user.ban" : "user.unban",
      entityType: "user",
      entityId: data.userId,
      targetUserId: data.userId,
    });
    return { ok: true };
  });

export const resetUserCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; balance?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    // Restore the user's full plan allowance by clearing this cycle's usage.
    const { error } = await supabaseAdmin
      .from("usage_counters")
      .upsert(
        { user_id: data.userId, month_used: 0, credits_used: 0, cycle_started_at: now, updated_at: now },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("tokens")
      .upsert({ user_id: data.userId, balance: data.balance ?? 10000, used: 0 }, { onConflict: "user_id" });
    await logAudit(context, {
      action: "user.credits.reset",
      entityType: "user",
      entityId: data.userId,
      targetUserId: data.userId,
      metadata: { cycle_reset: true },
    });
    return { ok: true };
  });


export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: "user.delete",
      entityType: "user",
      entityId: data.userId,
      targetUserId: data.userId,
    });
    return { ok: true };
  });

