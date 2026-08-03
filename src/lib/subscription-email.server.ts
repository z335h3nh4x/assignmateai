// Server-only: sends the one-per-payment subscription confirmation email.
// Dedupe is enforced by the unique (provider, provider_payment_id) index on
// public.subscription_emails — the insert IS the lock, so concurrent callers
// (checkout verify + Razorpay webhook) can never both send.

import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { PLAN_FEATURE_LABELS } from "@/lib/plan-lines";

const APP_URL = "https://assignmateai.in";
const SUPPORT_EMAIL = "support@assignmateai.in";

type PlanRow = {
  id: string;
  name: string;
  credits: number | null;
  monthly_limit: number | null;
  max_upload_mb: number | null;
  features: Record<string, boolean> | null;
};

/** Plan-aware benefit list; falls back to the generic premium bullets. */
function benefitsForPlan(plan: PlanRow | null): string[] {
  const out: string[] = [];
  if (plan?.monthly_limit) out.push(`${plan.monthly_limit.toLocaleString()} assignments every month`);
  if (plan?.credits) out.push(`${plan.credits.toLocaleString()} generation credits`);
  if (plan?.max_upload_mb) out.push(`Uploads up to ${plan.max_upload_mb} MB`);
  for (const [key, on] of Object.entries(plan?.features ?? {})) {
    if (!on || key === "ad_free") continue;
    const label = PLAN_FEATURE_LABELS[key];
    if (label && !out.includes(label)) out.push(label);
  }
  if (plan?.features?.ad_free) out.push("Ad-free experience");
  return out.length
    ? out.slice(0, 8)
    : [
        "Higher assignment limits",
        "Faster AI generation",
        "Larger uploads",
        "Premium exports",
        "Priority performance",
      ];
}

function formatAmount(amountCents: number): string {
  // Razorpay INR amounts arrive in paise.
  return (Math.max(amountCents, 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type SubscriptionEmailInput = {
  userId: string;
  planId: string;
  paymentId: string;
  amountCents: number;
  currency?: string | null;
  provider?: string;
};

export type SubscriptionEmailOutcome =
  | { status: "sent" }
  | { status: "duplicate" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

/**
 * Fire-and-forget safe: never throws. Payment activation must not be rolled
 * back because an email could not be delivered — failures are recorded on the
 * row so they can be retried later.
 */
export async function sendSubscriptionConfirmationEmail(
  input: SubscriptionEmailInput,
): Promise<SubscriptionEmailOutcome> {
  const provider = input.provider ?? "razorpay";
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Claim this payment first. A duplicate key here means the email was
    // already sent (or is being sent) for this payment — stop.
    const { error: claimError } = await supabaseAdmin
      .from("subscription_emails" as never)
      .insert({
        user_id: input.userId,
        plan_id: input.planId,
        amount_cents: Math.max(Math.round(input.amountCents), 0),
        currency: input.currency ?? "INR",
        provider,
        provider_payment_id: input.paymentId,
        status: "pending",
      } as never);

    if (claimError) {
      if (claimError.code === "23505") return { status: "duplicate" };
      console.error("[subscription-email] could not claim payment", claimError.message);
      return { status: "failed", reason: claimError.message };
    }

    const markFailed = async (reason: string) => {
      await supabaseAdmin
        .from("subscription_emails" as never)
        .update({ status: "failed", error: reason.slice(0, 500) } as never)
        .eq("provider", provider)
        .eq("provider_payment_id", input.paymentId);
    };

    const [{ data: profile }, { data: plan }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("email, display_name")
        .eq("id", input.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("plans")
        .select("id, name, credits, monthly_limit, max_upload_mb, features")
        .eq("id", input.planId)
        .maybeSingle(),
    ]);

    const email = profile?.email?.trim();
    if (!email) {
      await markFailed("No email address on profile");
      return { status: "skipped", reason: "no_email" };
    }

    const planRow = (plan ?? null) as PlanRow | null;
    const purchaseDate = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let result: Awaited<ReturnType<typeof sendTemplateEmail>>;
    try {
      result = await sendTemplateEmail("subscription-confirmation", email, {
        // Same payment => same key, so a retry can never double-deliver.
        idempotencyKey: `subscription-confirmation-${provider}-${input.paymentId}`,
        replyTo: SUPPORT_EMAIL,
        templateData: {
          name: profile?.display_name ?? "",
          planName: planRow?.name ?? "Pro",
          amount: formatAmount(input.amountCents),
          paymentId: input.paymentId,
          purchaseDate,
          benefits: benefitsForPlan(planRow),
          appUrl: APP_URL,
          supportEmail: SUPPORT_EMAIL,
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown email failure";
      console.error("[subscription-email] delivery failed", input.paymentId, reason);
      await markFailed(reason);
      return { status: "failed", reason };
    }

    await supabaseAdmin
      .from("subscription_emails" as never)
      .update({
        email,
        plan_name: planRow?.name ?? null,
        status: result.sent ? "sent" : "suppressed",
        error: result.sent ? null : "recipient_suppressed",
        sent_at: new Date().toISOString(),
      } as never)
      .eq("provider", provider)
      .eq("provider_payment_id", input.paymentId);

    return result.sent ? { status: "sent" } : { status: "skipped", reason: "recipient_suppressed" };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    console.error("[subscription-email] unexpected failure", input.paymentId, reason);
    return { status: "failed", reason };
  }
}
