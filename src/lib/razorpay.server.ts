// Razorpay REST helpers (server-only).
// We call the REST API with fetch instead of the `razorpay` npm SDK because the
// server runtime is a Cloudflare Worker (no Node-only native/HTTP client support).

const API_BASE = "https://api.razorpay.com/v1";

export type RazorpayCreds = { keyId: string; keySecret: string };

export function getRazorpayCreds(): RazorpayCreds {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  }
  return { keyId, keySecret };
}

function basicAuth({ keyId, keySecret }: RazorpayCreds): string {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
};

export async function createRazorpayOrder(input: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const creds = getRazorpayCreds();
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: basicAuth(creds) },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      message = (JSON.parse(text)?.error?.description as string) || text;
    } catch {
      /* keep raw text */
    }
    console.error("[razorpay] order creation failed", res.status, message);
    throw new Response(JSON.stringify({ error: `Razorpay order failed: ${message}` }), {
      status: res.status === 401 ? 401 : 500,
      headers: { "content-type": "application/json" },
    });
  }
  return JSON.parse(text) as RazorpayOrder;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) compared to the client signature. */
export async function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<boolean> {
  const { keySecret } = getRazorpayCreds();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${input.orderId}|${input.paymentId}`),
  );
  return timingSafeEqualHex(toHex(mac), input.signature.trim().toLowerCase());
}

export async function fetchRazorpayPayment(paymentId: string) {
  const creds = getRazorpayCreds();
  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { authorization: basicAuth(creds) },
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: string; status: string; amount: number; currency: string; order_id: string };
}

export type RazorpayOrderDetails = RazorpayOrder & {
  notes?: Record<string, string> | null;
};

export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrderDetails | null> {
  const creds = getRazorpayCreds();
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    headers: { authorization: basicAuth(creds) },
  });
  if (!res.ok) {
    console.error("[razorpay] order fetch failed", res.status);
    return null;
  }
  return (await res.json()) as RazorpayOrderDetails;
}
