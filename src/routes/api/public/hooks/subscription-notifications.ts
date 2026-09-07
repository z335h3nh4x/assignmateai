// Scheduled endpoint: reconciles expired subscriptions and sends the
// expiring-soon / expired emails. Called hourly by the database scheduler.
// Public prefix, so the caller is verified inside the handler.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/subscription-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SUBSCRIPTION_CRON_SECRET"];
        if (!secret) {
          return Response.json({ error: "Scheduler secret not configured" }, { status: 503 });
        }
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (provided !== secret) {
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
