// Backward-compat shim. All logic now lives in ./entitlements.server.
// Kept so existing imports (`assertFeature`, `FeatureLockedError`, `loadUserPlan`)
// continue to work while the codebase migrates.

export { assertFeature, EntitlementError as FeatureLockedError } from "./entitlements.server";
export type { Entitlements as UserPlanInfo } from "./entitlements.server";

import { getEntitlements } from "./entitlements.server";
export async function loadUserPlan(userId: string) {
  const ent = await getEntitlements(userId);
  return {
    planId: ent.plan.id,
    planSlug: ent.plan.slug,
    planName: ent.plan.name,
    features: ent.plan.features,
  };
}
