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


export type PlanFeatures = Record<string, boolean>;

export type AdminPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  credits: number;
  monthly_limit: number;
  max_words: number;
  max_upload_mb: number;
  max_upload_pages: number;
  features: PlanFeatures;
  is_active: boolean;
  is_archived: boolean;
  is_recommended: boolean;
  sort_order: number;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
};

export type PlanInput = Omit<AdminPlan, "id" | "created_at" | "updated_at" | "subscriber_count"> & {
  id?: string;
};

export type SubscriberRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  plan_id: string | null;
  plan_slug: string;
  plan_name: string;
  status: string;
  billing_interval: string | null;
  started_at: string | null;
  renewal_at: string | null;
  cancelled_at: string | null;
  payment_method: string | null;
  lifetime_spending_cents: number;
  credits: number;
  used: number;
};

export type SubscriptionOverview = {
  totalActive: number;
  freeUsers: number;
  paidUsers: number;
  mrrCents: number;
  arrCents: number;
  churnRate: number;
  conversionRate: number;
};

export type SubscriptionAnalytics = {
  overTime: { date: string; value: number }[];
  revenueByPlan: { plan: string; revenue: number }[];
  popularPlans: { plan: string; count: number }[];
  cancellationRate: number;
};

// -------- PLANS ---------

export const listAdminPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPlan[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [plansRes, subsRes] = await Promise.all([
      supabaseAdmin.from("plans").select("*").order("sort_order", { ascending: true }),
      supabaseAdmin.from("subscriptions").select("plan_id, plan, status"),
    ]);
    const counts = new Map<string, number>();
    for (const s of (subsRes.data ?? []) as any[]) {
      const key = s.plan_id ?? `slug:${s.plan}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return ((plansRes.data ?? []) as any[]).map((p) => ({
      ...p,
      features: (p.features ?? {}) as PlanFeatures,
      subscriber_count: (counts.get(p.id) ?? 0) + (counts.get(`slug:${p.slug}`) ?? 0),
    })) as AdminPlan[];
  });

export const upsertPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PlanInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { subscriber_count: _sc, created_at: _ca, updated_at: _ua, ...payload } = data as any;
    if (payload.id) {
      const { error } = await supabaseAdmin.from("plans").update(payload).eq("id", payload.id);
      if (error) throw new Error(error.message);
      await logAudit(context, {
        action: "plan.update",
        entityType: "plan",
        entityId: payload.id,
        metadata: { slug: payload.slug, name: payload.name },
      });
      return { ok: true, id: payload.id as string };
    }
    delete payload.id;
    const { data: inserted, error } = await supabaseAdmin
      .from("plans")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const newId = (inserted as any).id as string;
    await logAudit(context, {
      action: "plan.create",
      entityType: "plan",
      entityId: newId,
      metadata: { slug: payload.slug, name: payload.name },
    });
    return { ok: true, id: newId };
  });



export const duplicatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src, error } = await supabaseAdmin.from("plans").select("*").eq("id", data.id).single();
    if (error || !src) throw new Error(error?.message ?? "Not found");
    const copy: any = { ...src };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    copy.slug = `${copy.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
    copy.name = `${copy.name} (copy)`;
    copy.is_recommended = false;
    const { error: iErr } = await supabaseAdmin.from("plans").insert(copy);
    if (iErr) throw new Error(iErr.message);
    await logAudit(context, {
      action: "plan.duplicate",
      entityType: "plan",
      entityId: data.id,
      metadata: { new_slug: copy.slug },
    });
    return { ok: true };
  });

export const setPlanFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; field: "is_active" | "is_archived" | "is_recommended"; value: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.field === "is_recommended" && data.value) {
      await supabaseAdmin.from("plans").update({ is_recommended: false }).neq("id", data.id);
    }
    const { error } = await supabaseAdmin
      .from("plans")
      .update({ [data.field]: data.value } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: "plan.flag",
      entityType: "plan",
      entityId: data.id,
      metadata: { field: data.field, value: data.value },
    });
    return { ok: true };
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: "plan.delete",
      entityType: "plan",
      entityId: data.id,
    });
    return { ok: true };
  });

export const reorderPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order: { id: string; sort_order: number }[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const row of data.order) {
      const { error } = await supabaseAdmin
        .from("plans")
        .update({ sort_order: row.sort_order })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    }
    await logAudit(context, {
      action: "plan.reorder",
      entityType: "plan",
      metadata: { count: data.order.length },
    });
    return { ok: true };
  });


// -------- SUBSCRIBERS --------

export const listSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriberRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profilesRes, subsRes, tokensRes, plansRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, display_name, avatar_url"),
      supabaseAdmin.from("subscriptions").select("*"),
      supabaseAdmin.from("tokens").select("user_id, balance, used"),
      supabaseAdmin.from("plans").select("id, slug, name"),
    ]);
    const planById = new Map<string, { id: string; slug: string; name: string }>();
    const planBySlug = new Map<string, { id: string; slug: string; name: string }>();
    for (const p of (plansRes.data ?? []) as any[]) {
      planById.set(p.id, { id: p.id, slug: p.slug, name: p.name });
      planBySlug.set(p.slug, { id: p.id, slug: p.slug, name: p.name });
    }
    const subMap = new Map<string, any>();
    for (const s of (subsRes.data ?? []) as any[]) subMap.set(s.user_id, s);
    const tokMap = new Map<string, { balance: number; used: number }>();
    for (const t of tokensRes.data ?? []) tokMap.set(t.user_id, { balance: t.balance, used: t.used });

    return (profilesRes.data ?? []).map((p) => {
      const sub = subMap.get(p.id);
      const planInfo = sub?.plan_id ? planById.get(sub.plan_id) : sub?.plan ? planBySlug.get(sub.plan) : undefined;
      return {
        user_id: p.id,
        email: p.email,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        plan_id: sub?.plan_id ?? planBySlug.get(sub?.plan ?? "free")?.id ?? null,
        plan_slug: planInfo?.slug ?? sub?.plan ?? "free",
        plan_name: planInfo?.name ?? sub?.plan ?? "Free",
        status: sub?.status ?? "inactive",
        billing_interval: sub?.billing_interval ?? null,
        started_at: sub?.started_at ?? sub?.created_at ?? null,
        renewal_at: sub?.renewal_at ?? sub?.current_period_end ?? null,
        cancelled_at: sub?.cancelled_at ?? null,
        payment_method: sub?.payment_method ?? null,
        lifetime_spending_cents: sub?.lifetime_spending_cents ?? 0,
        credits: tokMap.get(p.id)?.balance ?? 0,
        used: tokMap.get(p.id)?.used ?? 0,
      };
    });
  });

export const changeSubscriberPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      userId: string;
      planId: string;
      billing_interval?: "monthly" | "yearly" | null;
      /** undefined = derive from interval, null = permanent (no expiry). */
      durationDays?: number | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeGrantPeriod, defaultGrantDays, SUBSCRIPTION_SOURCES } = await import(
      "./subscription-lifecycle"
    );
    const { data: plan, error: pErr } = await supabaseAdmin
      .from("plans")
      .select("slug, credits, monthly_price_cents, yearly_price_cents")
      .eq("id", data.planId)
      .single();
    if (pErr || !plan) throw new Error(pErr?.message ?? "Plan not found");
    const isFree = (plan as any).slug === "free";
    const durationDays =
      data.durationDays === undefined ? defaultGrantDays(data.billing_interval) : data.durationDays;
    // Every non-free grant (including TEST MEMBER / promotional) gets a real
    // period end so it expires exactly like a paid Razorpay subscription.
    const { started_at, period_end } = computeGrantPeriod({
      start: new Date(),
      durationDays,
      isFree,
    });
    const patch: any = {
      plan_id: data.planId,
      plan: (plan as any).slug,
      status: "active",
      started_at,
      current_period_end: period_end,
      renewal_at: period_end,
      cancelled_at: null,
      // Source of the subscription, not the plan: an admin grant is never a
      // gateway payment. Free downgrades carry no source at all.
      payment_method: isFree ? null : SUBSCRIPTION_SOURCES.ADMIN,
    };

    if (data.billing_interval !== undefined) patch.billing_interval = data.billing_interval;
    const { error } = await supabaseAdmin.from("subscriptions").upsert({ user_id: data.userId, ...patch });
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: "subscription.change_plan",
      entityType: "subscription",
      entityId: data.userId,
      targetUserId: data.userId,
      metadata: {
        plan_id: data.planId,
        billing_interval: data.billing_interval ?? null,
        duration_days: durationDays,
        period_end,
        source: patch.payment_method,
      },
    });
    return { ok: true };
  });


export const setSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; action: "cancel" | "reactivate" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { defaultGrantDays, DAY_MS } = await import("./subscription-lifecycle");

    let patch: Record<string, unknown>;
    let restoredEnd: string | null = null;
    if (data.action === "cancel") {
      patch = { status: "cancelled", cancelled_at: new Date().toISOString() };
    } else {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, current_period_end, renewal_at, billing_interval")
        .eq("user_id", data.userId)
        .maybeSingle();
      const existing = (sub as any)?.current_period_end || (sub as any)?.renewal_at;
      const isFree = ((sub as any)?.plan ?? "free") === "free";
      patch = { status: "active", cancelled_at: null };
      // A reactivation whose period already lapsed would be re-expired on the
      // next entitlement read, so move the period forward by one full term.
      if (!isFree && existing && new Date(existing).getTime() <= Date.now()) {
        const days = defaultGrantDays((sub as any)?.billing_interval ?? null);
        restoredEnd = new Date(Date.now() + days * DAY_MS).toISOString();
        patch.current_period_end = restoredEnd;
        patch.renewal_at = restoredEnd;
      }
    }
    const { error } = await supabaseAdmin.from("subscriptions").update(patch).eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: `subscription.${data.action}`,
      entityType: "subscription",
      entityId: data.userId,
      targetUserId: data.userId,
      metadata: restoredEnd ? { restored_period_end: restoredEnd } : undefined,
    });
    return { ok: true };
  });


export const extendSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; days: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("renewal_at, current_period_end")
      .eq("user_id", data.userId)
      .maybeSingle();
    // Extend from whichever is later: the existing period end or now, so an
    // already-expired subscription is genuinely reactivated for `days` days.
    const existing = (sub as any)?.current_period_end || (sub as any)?.renewal_at;
    const baseMs = Math.max(existing ? new Date(existing).getTime() : 0, Date.now());
    const next = new Date(baseMs + data.days * 86400000).toISOString();

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ renewal_at: next, current_period_end: next, status: "active" })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit(context, {
      action: "subscription.extend",
      entityType: "subscription",
      entityId: data.userId,
      targetUserId: data.userId,
      metadata: { days: data.days, renewal_at: next },
    });
    return { ok: true };
  });

export const adjustCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; mode: "reset" | "bonus"; amount: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.mode === "reset") {
      const { error } = await supabaseAdmin
        .from("tokens")
        .upsert({ user_id: data.userId, balance: data.amount, used: 0 });
      if (error) throw new Error(error.message);
    } else {
      const { data: cur } = await supabaseAdmin
        .from("tokens")
        .select("balance")
        .eq("user_id", data.userId)
        .maybeSingle();
      const balance = ((cur as any)?.balance ?? 0) + data.amount;
      const { error } = await supabaseAdmin.from("tokens").upsert({ user_id: data.userId, balance });

      if (error) throw new Error(error.message);
    }
    await logAudit(context, {
      action: `credits.${data.mode}`,
      entityType: "user",
      entityId: data.userId,
      targetUserId: data.userId,
      metadata: { amount: data.amount },
    });
    return { ok: true };
  });


// -------- OVERVIEW & ANALYTICS --------

export const getSubscriptionOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionOverview> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [subsRes, plansRes, profilesRes] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("plan, plan_id, status, billing_interval, cancelled_at, created_at"),
      supabaseAdmin.from("plans").select("id, slug, monthly_price_cents, yearly_price_cents"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    const planPrice = new Map<string, { m: number; y: number; slug: string }>();
    for (const p of (plansRes.data ?? []) as any[]) {
      planPrice.set(p.id, { m: p.monthly_price_cents, y: p.yearly_price_cents, slug: p.slug });
    }
    let mrr = 0;
    let paid = 0;
    let free = 0;
    let active = 0;
    let cancelled = 0;
    for (const s of (subsRes.data ?? []) as any[]) {
      const info = s.plan_id ? planPrice.get(s.plan_id) : undefined;
      const price = info ? (s.billing_interval === "yearly" ? info.y / 12 : info.m) : 0;
      if (s.status === "active") active++;
      if (s.status === "cancelled") cancelled++;
      if (s.status === "active" && price > 0) {
        paid++;
        mrr += price;
      } else if (s.status === "active") {
        free++;
      }
    }
    const totalProfiles = profilesRes.count ?? active;
    const totalTerminal = active + cancelled;
    const churn = totalTerminal > 0 ? (cancelled / totalTerminal) * 100 : 0;
    const conversion = totalProfiles > 0 ? (paid / totalProfiles) * 100 : 0;
    return {
      totalActive: active,
      freeUsers: free,
      paidUsers: paid,
      mrrCents: Math.round(mrr),
      arrCents: Math.round(mrr * 12),
      churnRate: Math.round(churn * 10) / 10,
      conversionRate: Math.round(conversion * 10) / 10,
    };
  });

export const getSubscriptionAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionAnalytics> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [subsRes, plansRes] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("plan, plan_id, status, billing_interval, created_at, cancelled_at"),
      supabaseAdmin.from("plans").select("id, slug, name, monthly_price_cents, yearly_price_cents"),
    ]);
    const planById = new Map<string, any>();
    for (const p of (plansRes.data ?? []) as any[]) planById.set(p.id, p);

    // over time: 30d
    const days: string[] = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const dayMap = new Map(days.map((d) => [d, 0]));
    const revByPlan = new Map<string, number>();
    const countByPlan = new Map<string, number>();
    let active = 0;
    let cancelled = 0;
    for (const s of (subsRes.data ?? []) as any[]) {
      const d = (s.created_at ?? "").slice(0, 10);
      if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
      const plan = s.plan_id ? planById.get(s.plan_id) : null;
      const name = plan?.name ?? s.plan ?? "Free";
      countByPlan.set(name, (countByPlan.get(name) ?? 0) + 1);
      if (plan && s.status === "active") {
        const price = s.billing_interval === "yearly" ? plan.yearly_price_cents / 12 : plan.monthly_price_cents;
        revByPlan.set(name, (revByPlan.get(name) ?? 0) + price);
      }
      if (s.status === "active") active++;
      if (s.status === "cancelled") cancelled++;
    }
    return {
      overTime: days.map((d) => ({ date: d, value: dayMap.get(d) ?? 0 })),
      revenueByPlan: Array.from(revByPlan.entries()).map(([plan, revenue]) => ({ plan, revenue: revenue / 100 })),
      popularPlans: Array.from(countByPlan.entries())
        .map(([plan, count]) => ({ plan, count }))
        .sort((a, b) => b.count - a.count),
      cancellationRate: active + cancelled > 0 ? Math.round((cancelled / (active + cancelled)) * 1000) / 10 : 0,
    };
  });
