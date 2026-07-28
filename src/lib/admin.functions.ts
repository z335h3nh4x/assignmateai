import { createServerFn } from "@tanstack/react-start";
import { formatMoneyCents } from "@/lib/currency";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [usersRes, assignmentsRes, exportsRes, revenueRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("assignments").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("assignments").select("exports_count"),
      supabaseAdmin.from("payments").select("amount_cents").eq("status", "completed"),
    ]);

    const totalExports = (exportsRes.data ?? []).reduce(
      (sum: number, row: { exports_count: number | null }) => sum + (row.exports_count ?? 0),
      0,
    );
    const totalRevenueCents = (revenueRes.data ?? []).reduce(
      (sum: number, row: { amount_cents: number | null }) => sum + (row.amount_cents ?? 0),
      0,
    );

    // Recent activity: pull latest rows across sources, tag, merge, sort.
    const [recentUsers, recentAssignments, recentPayments] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, display_name, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("assignments")
        .select("id, user_id, title, status, exports_count, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("payments")
        .select("id, user_id, amount_cents, currency, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    type Activity = {
      kind: "signup" | "assignment" | "export" | "payment";
      at: string;
      title: string;
      subtitle?: string;
    };
    const activity: Activity[] = [];

    for (const u of recentUsers.data ?? []) {
      activity.push({
        kind: "signup",
        at: u.created_at,
        title: "New user registered",
        subtitle: u.display_name || u.email || u.id,
      });
    }
    for (const a of recentAssignments.data ?? []) {
      activity.push({
        kind: "assignment",
        at: a.created_at,
        title: `Assignment generated`,
        subtitle: a.title,
      });
      if ((a.exports_count ?? 0) > 0) {
        activity.push({
          kind: "export",
          at: a.updated_at,
          title: `Assignment exported (${a.exports_count})`,
          subtitle: a.title,
        });
      }
    }
    for (const p of recentPayments.data ?? []) {
      activity.push({
        kind: "payment",
        at: p.created_at,
        title: `Payment ${p.status}`,
        subtitle: formatMoneyCents(p.amount_cents, p.currency),
      });
    }

    activity.sort((a, b) => (a.at < b.at ? 1 : -1));

    return {
      totals: {
        users: usersRes.count ?? 0,
        assignments: assignmentsRes.count ?? 0,
        exports: totalExports,
        revenueCents: totalRevenueCents,
      },
      activity: activity.slice(0, 20),
    };
  });

function daysBack(n: number) {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function bucket(rows: Array<{ created_at: string }>, days: string[]) {
  const map = new Map(days.map((d) => [d, 0]));
  for (const r of rows) {
    const d = r.created_at.slice(0, 10);
    if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1);
  }
  return days.map((d) => ({ date: d, value: map.get(d) ?? 0 }));
}

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const days = daysBack(30);
    const since = `${days[0]}T00:00:00Z`;

    const [usersRes, assignmentsRes, paymentsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("created_at").gte("created_at", since),
      supabaseAdmin
        .from("assignments")
        .select("created_at, updated_at, exports_count")
        .gte("created_at", since),
      supabaseAdmin
        .from("payments")
        .select("created_at, amount_cents, status")
        .eq("status", "completed")
        .gte("created_at", since),
    ]);

    const users = bucket(usersRes.data ?? [], days);
    const assignments = bucket(assignmentsRes.data ?? [], days);

    // Exports approximated by updated_at bucket weighted by exports_count.
    const exportsMap = new Map(days.map((d) => [d, 0]));
    for (const a of assignmentsRes.data ?? []) {
      const d = (a.updated_at ?? a.created_at).slice(0, 10);
      if (exportsMap.has(d)) {
        exportsMap.set(d, (exportsMap.get(d) ?? 0) + (a.exports_count ?? 0));
      }
    }
    const exportsSeries = days.map((d) => ({ date: d, value: exportsMap.get(d) ?? 0 }));

    const revenueMap = new Map(days.map((d) => [d, 0]));
    for (const p of paymentsRes.data ?? []) {
      const d = p.created_at.slice(0, 10);
      if (revenueMap.has(d)) {
        revenueMap.set(d, (revenueMap.get(d) ?? 0) + (p.amount_cents ?? 0));
      }
    }
    const revenue = days.map((d) => ({ date: d, value: (revenueMap.get(d) ?? 0) / 100 }));

    return { users, assignments, exports: exportsSeries, revenue };
  });
