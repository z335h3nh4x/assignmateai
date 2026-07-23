// Server-only helpers for plan feature enforcement.
// Reads the caller's subscription + plan features from the DB.

export type PlanFeatures = Record<string, boolean>;

export type UserPlanInfo = {
  planId: string | null;
  planSlug: string;
  planName: string;
  features: PlanFeatures;
};

// Cache within a single handler invocation only.
export async function loadUserPlan(userId: string): Promise<UserPlanInfo> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, plan_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  const isActive = !sub || sub.status === "active" || sub.status === "trialing";
  const targetSlug = isActive ? (sub?.plan ?? "free") : "free";
  const targetId = isActive ? sub?.plan_id ?? null : null;

  let planRow: any = null;
  if (targetId) {
    const { data } = await supabaseAdmin.from("plans").select("id, slug, name, features").eq("id", targetId).maybeSingle();
    planRow = data;
  }
  if (!planRow) {
    const { data } = await supabaseAdmin
      .from("plans")
      .select("id, slug, name, features")
      .eq("slug", targetSlug)
      .maybeSingle();
    planRow = data;
  }
  if (!planRow) {
    const { data } = await supabaseAdmin
      .from("plans")
      .select("id, slug, name, features")
      .eq("slug", "free")
      .maybeSingle();
    planRow = data;
  }

  return {
    planId: planRow?.id ?? null,
    planSlug: planRow?.slug ?? "free",
    planName: planRow?.name ?? "Free",
    features: ((planRow?.features ?? {}) as PlanFeatures) || {},
  };
}

export class FeatureLockedError extends Error {
  feature: string;
  planName: string;
  constructor(feature: string, planName: string) {
    super(`FEATURE_LOCKED:${feature}`);
    this.feature = feature;
    this.planName = planName;
  }
}

export async function assertFeature(userId: string, feature: string): Promise<UserPlanInfo> {
  const info = await loadUserPlan(userId);
  if (!info.features[feature]) throw new FeatureLockedError(feature, info.planName);
  return info;
}
