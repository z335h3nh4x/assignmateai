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

/* ------------------------------------------------------------------ */
/* Subscription source (how the subscription came to exist)            */
/* ------------------------------------------------------------------ */

/**
 * Stored in `subscriptions.payment_method` — the existing column, reused
 * rather than duplicated. It records the SOURCE of the subscription, which is
 * independent of the plan: a paid plan can be granted by an admin without any
 * payment, and a payment always carries its gateway name.
 */
export const SUBSCRIPTION_SOURCES = {
  RAZORPAY: "razorpay",
  ADMIN: "admin",
  PROMO: "promo",
  TEST: "test",
} as const;

export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[keyof typeof SUBSCRIPTION_SOURCES];

const SOURCE_LABELS: Record<string, string> = {
  razorpay: "Razorpay",
  admin: "Admin",
  promo: "Promotional",
  promotional: "Promotional",
  test: "Test",
  manual: "Admin",
};

/** Human label for the source column. Never guesses "Razorpay" from the plan. */
export function sourceLabel(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) return "—";
  return SOURCE_LABELS[paymentMethod.toLowerCase()] ?? paymentMethod;
}

/* ------------------------------------------------------------------ */
/* Admin grant periods                                                 */
/* ------------------------------------------------------------------ */

export const DAY_MS = 86_400_000;

/** Duration presets offered in the admin grant dialog. null = no expiry. */
export const GRANT_DURATIONS: { label: string; days: number | null }[] = [
  { label: "30 days (1 month)", days: 30 },
  { label: "90 days (3 months)", days: 90 },
  { label: "180 days (6 months)", days: 180 },
  { label: "365 days (1 year)", days: 365 },
  { label: "Permanent (no expiry)", days: null },
];

export function defaultGrantDays(interval: "monthly" | "yearly" | null | undefined): number {
  return interval === "yearly" ? 365 : 30;
}

/**
 * Computes the real subscription period for an admin grant.
 * `durationDays === null` means the admin explicitly chose "permanent".
 * A free plan never carries a period.
 */
export function computeGrantPeriod(opts: {
  start: Date;
  durationDays: number | null;
  isFree: boolean;
}): { started_at: string; period_end: string | null } {
  const started_at = opts.start.toISOString();
  if (opts.isFree || opts.durationDays === null) return { started_at, period_end: null };
  const days = Math.max(1, Math.round(opts.durationDays));
  return { started_at, period_end: new Date(opts.start.getTime() + days * DAY_MS).toISOString() };
}

