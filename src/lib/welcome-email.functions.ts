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
    const claimRecord = (claims ?? {}) as Record<string, any>;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name, welcome_email_sent_at")
      .eq("id", userId)
      .maybeSingle();

    // The JWT keeps email_verified under user_metadata (not as a top-level
    // claim), so fall back to the Auth Admin record before giving up.
    let emailConfirmed =
      claimRecord["email_verified"] === true ||
      claimRecord["user_metadata"]?.["email_verified"] === true ||
      Boolean(claimRecord["email_confirmed_at"]);

    let adminEmail: string | undefined;
    if (!emailConfirmed) {
      const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const u = adminUser?.user;
      emailConfirmed = Boolean(u?.email_confirmed_at || u?.confirmed_at);
      adminEmail = u?.email ?? undefined;
    }

    const email = profile?.email ?? adminEmail ?? claimRecord["email"];
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
