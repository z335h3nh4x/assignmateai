/**
 * Pure decision logic for subscription expiry notifications.
 *
 * Deliberately dependency-free so it can be unit-tested and so the same rule
 * used by the scheduler is the rule that is asserted in tests. Enforcement of
 * expiry itself lives in the database (`subscription_is_valid`,
 * `expire_subscription_if_due`, `reconcile_expired_subscriptions`) — this
 * module never grants or revokes access, it only decides which email is due.
 */

import { ACTIVE_STATUSES, DAY_MS } from "./subscription-lifecycle";

/** How long before the period end the "expiring soon" email goes out. */
export const WARNING_WINDOW_DAYS = 3;

export type NotificationKind = "warning" | "expired";

export type NotifiableSubscription = {
  user_id: string;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  renewal_at: string | null;
};

/** Authoritative period end: current_period_end wins, renewal_at is the fallback. */
export function periodEndOf(sub: NotifiableSubscription): string | null {
  return sub.current_period_end || sub.renewal_at || null;
}

export type NotificationDecision =
  | { kind: null; reason: string }
  | { kind: NotificationKind; periodEnd: string; daysLeft: number };

/**
 * Decides which email (if any) a subscription is due, at the given server time.
 * Never guesses: a subscription with no recorded end date is never notified.
 */
export function decideNotification(
  sub: NotifiableSubscription,
  opts: { now: Date; isAdmin: boolean },
): NotificationDecision {
  // Admin authorization is a role, not a plan — admins are excluded from the
  // normal expiry lifecycle and therefore from its emails.
  if (opts.isAdmin) return { kind: null, reason: "admin" };

  const slug = (sub.plan ?? "free").toLowerCase();
  if (!slug || slug === "free") return { kind: null, reason: "free_plan" };

  const end = periodEndOf(sub);
  if (!end) return { kind: null, reason: "no_period_end" };
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(endMs)) return { kind: null, reason: "invalid_period_end" };

  const status = (sub.status ?? "").toLowerCase();
  const nowMs = opts.now.getTime();
  const msLeft = endMs - nowMs;
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));

  const isActive = ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);

  // Already lapsed (either reconciled to "expired", or still flagged active
  // but past its end — the reconciler will flip it in the same run).
  if (msLeft <= 0) {
    if (status === "expired" || isActive) return { kind: "expired", periodEnd: end, daysLeft: 0 };
    return { kind: null, reason: `status_${status || "unknown"}` };
  }

  if (!isActive) return { kind: null, reason: `status_${status || "unknown"}` };
  if (msLeft <= WARNING_WINDOW_DAYS * DAY_MS) {
    return { kind: "warning", periodEnd: end, daysLeft: Math.max(1, daysLeft) };
  }
  return { kind: null, reason: "not_due" };
}

/**
 * Dedupe key stored in `subscription_emails.provider_payment_id`. It embeds the
 * period end, so a Razorpay renewal (or admin extension) that moves the period
 * forward starts a fresh notification lifecycle, while repeated scheduler runs,
 * lazy entitlement checks and reconciliations all collide on the same key.
 */
export function notificationKey(kind: NotificationKind, userId: string, periodEnd: string): string {
  return `${kind}:${userId}:${new Date(periodEnd).toISOString()}`;
}

export const NOTIFICATION_PROVIDER = "lifecycle";

/** Human-friendly date for the email body (IST, the product's primary audience). */
export function formatExpiryForEmail(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    timeZoneName: "short",
  });
}
