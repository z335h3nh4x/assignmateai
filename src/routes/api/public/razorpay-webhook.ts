import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature");
        const eventId = request.headers.get("x-razorpay-event-id");

        const { verifyWebhookSignature, processRazorpayWebhook } = await import(
          "@/lib/razorpay-webhook.server"
        );

        let valid = false;
        try {
          valid = await verifyWebhookSignature(rawBody, signature);
        } catch (err) {
          console.error("[razorpay-webhook] signature check error", err);
          return new Response("Webhook not configured", { status: 500 });
        }
        if (!valid) return new Response("Invalid signature", { status: 401 });

        const result = await processRazorpayWebhook({ rawBody, eventId });
        // Always 200 on handled/ignored/duplicate so Razorpay stops retrying;
        // 500 only when we genuinely failed and want a retry.
        return new Response(JSON.stringify({ status: result.status }), {
          status: result.ok ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
