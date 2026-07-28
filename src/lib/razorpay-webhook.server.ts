// Server-only Razorpay webhook processing.
// Verifies the HMAC signature over the RAW body, records every delivery for
// audit, and activates subscriptions idempotently for successful payments.

import { fetchRazorpayOrder } from "./razorpay.server";

const HANDLED_EVENTS = new Set(["payment.captured", "payment.authorized"]);

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return timingSafeEqualHex(toHex(mac), signature.trim().toLowerCase());
}

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        currency?: string;
      };
    };
  };
};

export async function processRazorpayWebhook(input: {
  rawBody: string;
  eventId: string | null;
}): Promise<{ ok: boolean; status: string; detail?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let body: WebhookPayload;
  try {
    body = JSON.parse(input.rawBody) as WebhookPayload;
  } catch {
    return { ok: false, status: "invalid_json" };
  }

  const eventType = body.event ?? "unknown";
  const payment = body.payload?.payment?.entity;
  // Razorpay always sends x-razorpay-event-id; fall back to a deterministic key.
  const eventId = input.eventId ?? `${eventType}:${payment?.id ?? "unknown"}`;

  // Duplicate deliveries: the unique index makes this insert fail — that's our dedupe.
  const { error: insertError } = await supabaseAdmin
    .from("razorpay_webhook_events" as never)
    .insert({
      event_id: eventId,
      event_type: eventType,
      payment_id: payment?.id ?? null,
      order_id: payment?.order_id ?? null,
      status: "received",
      payload: body as unknown as Record<string, unknown>,
    } as never);

  if (insertError) {
    if (insertError.code === "23505") return { ok: true, status: "duplicate" };
    console.error("[razorpay-webhook] failed to record event", insertError.message);
    return { ok: false, status: "log_failed", detail: insertError.message };
  }

  const finish = async (status: string, detail?: string) => {
    await supabaseAdmin
      .from("razorpay_webhook_events" as never)
      .update({ status, error: detail ?? null } as never)
      .eq("event_id", eventId);
    if (status === "failed") {
      console.error("[razorpay-webhook] processing failed", eventType, eventId, detail);
    }
    return { ok: status !== "failed", status, detail };
  };

  if (!HANDLED_EVENTS.has(eventType)) return finish("ignored", `Unhandled event ${eventType}`);
  if (!payment?.id || !payment.order_id) return finish("failed", "Missing payment entity fields");
  // Never activate for failed / created / refunded payments.
  if (!["captured", "authorized"].includes(payment.status ?? "")) {
    return finish("ignored", `Payment status ${payment.status}`);
  }

  const order = await fetchRazorpayOrder(payment.order_id);
  if (!order) return finish("failed", "Could not fetch order from Razorpay");

  const planId = order.notes?.plan_id;
  const userId = order.notes?.user_id;
  if (!planId || !userId) return finish("failed", "Order notes missing plan_id/user_id");

  const { data: result, error } = await supabaseAdmin.rpc("activate_paid_subscription", {
    _user_id: userId,
    _plan_id: planId,
    _provider: "razorpay",
    _order_id: payment.order_id,
    _payment_id: payment.id,
    _signature: "webhook",
    _amount_cents: Math.round(payment.amount ?? 0),
    _currency: payment.currency ?? "INR",
    _billing_interval: "monthly",
  } as never);

  if (error) return finish("failed", error.message);

  const r = (result ?? {}) as { already_processed?: boolean };
  return finish(r.already_processed ? "already_active" : "activated");
}
