/**
 * Subscription lifecycle helpers (display + client-side mirror only).
 *
 * The AUTHORITATIVE expiry rule lives in the database:
 *   public.subscription_is_valid(status, coalesce(current_period_end, renewal_at))
 * used by `_resolve_user_plan`, `get_entitlements` and `reserve_assignment_slot`,
 * with lazy reconciliation via `expire_subscription_if_due` and an hourly
 * `reconcile_expired_subscriptions()` cron job.
 *
 * These helpers exist so the UI renders the same verdict the server already
 * computed — never to grant access.
 */

export const ACTIVE_STATUSES = ["active", "trialing"] as const;

export type SubscriptionState = {
  status: string;
  /** Authoritative end of the paid period; null = no expiry information. */
  period_end: string | null;
  valid: boolean;
  is_paid: boolean;
};

/** Mirror of the SQL rule. `now` must come from the server payload, not Date.now(). */
export function isSubscriptionValid(
  status: string | null | undefined,
  periodEnd: string | null | undefined,
  now: Date,
): boolean {
  if (!status || !ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number])) return false;
  if (!periodEnd) return true; // no expiry recorded — never invent one
  return now.getTime() < new Date(periodEnd).getTime();
}

export type DisplayStatus = "active" | "expired" | "cancelled" | "none";

export function displayStatus(sub: SubscriptionState | null | undefined): DisplayStatus {
  if (!sub || sub.status === "none") return "none";
  if (sub.status === "cancelled") return "cancelled";
  // A subscription that ran out reads as "expired" until the resolver has
  // fully fallen back — an expired paid/test plan can never read "active".
  if (sub.status === "expired" || !sub.valid) return "expired";
  return "active";
}


/**
 * Assignmate does not charge automatically — a period end is when the plan
 * stops, not when money is taken. Never call it "Next renewal".
 */
export function periodEndLabel(sub: SubscriptionState | null | undefined): string {
  if (!sub || !sub.is_paid || !sub.period_end) return "Usage resets";
  return sub.valid ? "Plan ends" : "Expired on";
}
