// Server-only: detects upcoming/completed subscription expiries and sends the
// matching email exactly once per subscription period.
//
// Enforcement always runs first and never depends on email success: the
// database reconciler expires and downgrades subscriptions, and only then are
// emails attempted. A delivery failure is recorded, never rolled back into
// subscription state.

import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import {
  decideNotification,
  formatExpiryForEmail,
  notificationKey,
  NOTIFICATION_PROVIDER,
  WARNING_WINDOW_DAYS,
  type NotificationKind,
} from "@/lib/subscription-notifications";
import { DAY_MS } from "@/lib/subscription-lifecycle";

const APP_URL = "https://assignmateai.in";
const SUPPORT_EMAIL = "support@assignmateai.in";

export type NotificationRunResult = {
  reconciled: number;
  considered: number;
  sent: number;
  duplicates: number;
  skipped: number;
  failed: number;
  details: Array<{ user_id: string; kind: NotificationKind; outcome: string }>;
};

export async function runSubscriptionNotifications(): Promise<NotificationRunResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result: NotificationRunResult = {
    reconciled: 0,
    considered: 0,
    sent: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  // 1. Enforcement first — expiry/downgrade must happen regardless of email.
  const { data: reconciled, error: recErr } = await supabaseAdmin.rpc(
    "reconcile_expired_subscriptions" as never,
  );
  if (recErr) console.error("[subscription-notifications] reconcile failed", recErr.message);
  else result.reconciled = Number(reconciled ?? 0);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * DAY_MS).toISOString();
  const windowEnd = new Date(now.getTime() + (WARNING_WINDOW_DAYS + 1) * DAY_MS).toISOString();

  // 2. Candidates: any non-free subscription whose period end sits inside the
  //    notification window (recently lapsed, or about to lapse).
  const { data: subs, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, plan, plan_id, status, current_period_end, renewal_at")
    .neq("plan", "free")
    .or(
      `and(current_period_end.gte.${windowStart},current_period_end.lte.${windowEnd}),and(current_period_end.is.null,renewal_at.gte.${windowStart},renewal_at.lte.${windowEnd})`,
    );
  if (subErr) throw new Error(`Subscription scan failed: ${subErr.message}`);
  const rows = (subs ?? []) as any[];
  if (rows.length === 0) return result;

  const userIds = rows.map((r) => r.user_id);
  const [{ data: adminRoles }, { data: profiles }, { data: plans }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").in("user_id", userIds),
    supabaseAdmin.from("profiles").select("id, email, display_name").in("id", userIds),
    supabaseAdmin.from("plans").select("id, slug, name"),
  ]);
  const admins = new Set((adminRoles ?? []).map((r: any) => r.user_id));
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const planById = new Map((plans ?? []).map((p: any) => [p.id, p]));
  const planBySlug = new Map((plans ?? []).map((p: any) => [p.slug, p]));
  const freePlanName = planBySlug.get("free")?.name ?? "Basic";

  for (const sub of rows) {
    const decision = decideNotification(sub, { now, isAdmin: admins.has(sub.user_id) });
    if (!decision.kind) continue;
    result.considered += 1;

    const key = notificationKey(decision.kind, sub.user_id, decision.periodEnd);
    const planName = planById.get(sub.plan_id)?.name ?? planBySlug.get(sub.plan)?.name ?? "Pro";

    // 3. The claim insert IS the lock: the unique (provider, provider_payment_id)
    //    index means concurrent or repeated runs can never double-send.
    const { error: claimError } = await supabaseAdmin.from("subscription_emails" as never).insert({
      user_id: sub.user_id,
      plan_id: sub.plan_id ?? null,
      plan_name: planName,
      amount_cents: 0,
      currency: "INR",
      provider: NOTIFICATION_PROVIDER,
      provider_payment_id: key,
      status: "pending",
    } as never);

    if (claimError) {
      if (claimError.code === "23505") {
        result.duplicates += 1;
        result.details.push({ user_id: sub.user_id, kind: decision.kind, outcome: "duplicate" });
        continue;
      }
      result.failed += 1;
      result.details.push({ user_id: sub.user_id, kind: decision.kind, outcome: "claim_failed" });
      continue;
    }

    const finish = async (status: string, error: string | null) => {
      await supabaseAdmin
        .from("subscription_emails" as never)
        .update({
          status,
          error: error?.slice(0, 500) ?? null,
          sent_at: status === "sent" ? new Date().toISOString() : null,
        } as never)
        .eq("provider", NOTIFICATION_PROVIDER)
        .eq("provider_payment_id", key);
    };

    const profile = profileById.get(sub.user_id) as any;
    const email = (profile?.email ?? "").trim();
    if (!email || !email.includes("@")) {
      result.skipped += 1;
      await finish("skipped", "no_email");
      result.details.push({ user_id: sub.user_id, kind: decision.kind, outcome: "no_email" });
      continue;
    }

    try {
      const sendResult = await sendTemplateEmail(
        decision.kind === "warning" ? "plan-expiring" : "plan-expired",
        email,
        {
          idempotencyKey: `${NOTIFICATION_PROVIDER}-${key}`,
          replyTo: SUPPORT_EMAIL,
          templateData: {
            name: profile?.display_name ?? "",
            planName,
            freePlanName,
            appUrl: APP_URL,
            ...(decision.kind === "warning"
              ? { expiresOn: formatExpiryForEmail(decision.periodEnd), daysLeft: decision.daysLeft }
              : { expiredOn: formatExpiryForEmail(decision.periodEnd) }),
          },
        },
      );
      if (sendResult.sent) {
        result.sent += 1;
        await finish("sent", null);
        result.details.push({ user_id: sub.user_id, kind: decision.kind, outcome: "sent" });
      } else {
        result.skipped += 1;
        await finish("suppressed", "recipient_suppressed");
        result.details.push({ user_id: sub.user_id, kind: decision.kind, outcome: "suppressed" });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown email failure";
      console.error("[subscription-notifications] delivery failed", sub.user_id, reason);
      result.failed += 1;
      await finish("failed", reason);
      result.details.push({ user_id: sub.user_id, kind: decision.kind, outcome: "failed" });
    }
  }

  return result;
}
