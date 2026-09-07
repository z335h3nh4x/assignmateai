// Scheduled endpoint: reconciles expired subscriptions and sends the
// expiring-soon / expired emails. Called hourly by the database scheduler.
// Public prefix, so the caller is verified inside the handler.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/subscription-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        // The scheduler's shared token lives in platform_settings (admin-only
        // row), so the database job can present it without a copy in code.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("platform_settings")
          .select("value")
          .eq("key", "cron.subscription_notifications")
          .maybeSingle();
        const expected =
          (row?.value as { token?: string } | null)?.token ??
          process.env["SUBSCRIPTION_CRON_SECRET"] ??
          "";

        if (!expected) {
          return Response.json({ error: "Scheduler token not configured" }, { status: 503 });
        }
        if (!provided || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }


        try {
          const { runSubscriptionNotifications } = await import(
            "@/lib/subscription-notifications.server"
          );
          const result = await runSubscriptionNotifications();
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("[subscription-notifications] run failed", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
