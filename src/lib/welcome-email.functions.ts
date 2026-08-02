import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sends the branded welcome email once, right after a user confirms their
 * signup and lands in the app for the first time. Guarded by a timestamp on
 * the profile so repeat visits never resend.
 */
export const sendWelcomeEmailOnce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;

    // Only after the email is actually confirmed.
    const emailConfirmed =
      Boolean((claims as Record<string, unknown>)?.["email_verified"]) ||
      Boolean((claims as Record<string, unknown>)?.["email_confirmed_at"]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name, welcome_email_sent_at")
      .eq("id", userId)
      .maybeSingle();

    const email = profile?.email ?? (claims as Record<string, unknown>)?.["email"];
    if (!profile || profile.welcome_email_sent_at || typeof email !== "string" || !email) {
      return { sent: false as const, reason: "not_eligible" as const };
    }
    if (!emailConfirmed) {
      return { sent: false as const, reason: "not_confirmed" as const };
    }

    // Claim the send first so concurrent tabs can't double-send.
    const { data: claimed } = await supabaseAdmin
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcome_email_sent_at", null)
      .select("id")
      .maybeSingle();

    if (!claimed) {
      return { sent: false as const, reason: "already_sent" as const };
    }

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

    try {
      const result = await sendTemplateEmail("welcome", email, {
        templateData: {
          name: profile.display_name ?? undefined,
          appUrl: process.env["PUBLIC_APP_URL"] ?? "https://assignmateai.in",
        },
        idempotencyKey: `welcome-${userId}`,
      });
      return result.sent
        ? { sent: true as const }
        : { sent: false as const, reason: result.reason };
    } catch (error) {
      // Release the claim so a later visit can retry.
      await supabaseAdmin
        .from("profiles")
        .update({ welcome_email_sent_at: null })
        .eq("id", userId);
      throw error;
    }
  });
