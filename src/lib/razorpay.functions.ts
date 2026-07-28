import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CreateOrderResult = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan_name: string;
};

export const createPlanOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ planId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<CreateOrderResult> => {
    const { createRazorpayOrder, getRazorpayCreds } = await import("./razorpay.server");

    const { data: plan, error } = await context.supabase
      .from("plans")
      .select("id, name, slug, currency, monthly_price_cents, is_active, is_archived")
      .eq("id", data.planId)
      .maybeSingle();

    if (error || !plan || !plan.is_active || plan.is_archived) {
      throw new Response(JSON.stringify({ error: "Plan not available" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Razorpay amounts are in the smallest currency unit (paise for INR).
    const amount = Math.round(Number(plan.monthly_price_cents) || 0);
    if (amount < 100) {
      throw new Response(JSON.stringify({ error: "Amount must be at least 100 (minor units)" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const order = await createRazorpayOrder({
      amount,
      currency: plan.currency || "INR",
      receipt: `plan_${plan.slug}_${Date.now()}`.slice(0, 40),
      notes: { user_id: context.userId, plan_id: plan.id, plan_slug: plan.slug },
    });

    return {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: getRazorpayCreds().keyId,
      plan_name: plan.name,
    };
  });

export type VerifyResult = {
  verified: true;
  payment_id: string;
  activated: boolean;
  already_processed: boolean;
  plan_name: string | null;
};

export const verifyPlanPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const { verifyRazorpaySignature, fetchRazorpayOrder, fetchRazorpayPayment } = await import(
      "./razorpay.server"
    );

    const bad = (message: string, status = 400) =>
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "content-type": "application/json" },
      });

    const ok = await verifyRazorpaySignature({
      orderId: data.razorpay_order_id,
      paymentId: data.razorpay_payment_id,
      signature: data.razorpay_signature,
    });
    if (!ok) throw bad("Signature verification failed");

    // Re-read the order & payment from Razorpay: never trust client-supplied
    // plan/amount data. The plan id lives in the order notes we set at creation.
    const order = await fetchRazorpayOrder(data.razorpay_order_id);
    if (!order) throw bad("Could not verify order with Razorpay", 502);

    const planId = order.notes?.plan_id;
    const orderUserId = order.notes?.user_id;
    if (!planId || orderUserId !== context.userId) throw bad("Order does not belong to this account", 403);

    const payment = await fetchRazorpayPayment(data.razorpay_payment_id);
    if (!payment || payment.order_id !== data.razorpay_order_id) throw bad("Payment not found for order");
    if (!["captured", "authorized"].includes(payment.status)) throw bad("Payment not completed");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("activate_paid_subscription", {
      _user_id: context.userId,
      _plan_id: planId,
      _provider: "razorpay",
      _order_id: data.razorpay_order_id,
      _payment_id: data.razorpay_payment_id,
      _signature: data.razorpay_signature,
      _amount_cents: Math.round(payment.amount),
      _currency: payment.currency,
      _billing_interval: "monthly",
    } as never);

    if (error) {
      console.error("[razorpay] activation failed", error.message);
      throw bad("Payment verified but activation failed. Contact support.", 500);
    }

    const r = (result ?? {}) as {
      activated?: boolean;
      already_processed?: boolean;
      plan?: { name?: string };
    };

    return {
      verified: true,
      payment_id: data.razorpay_payment_id,
      activated: !!r.activated,
      already_processed: !!r.already_processed,
      plan_name: r.plan?.name ?? null,
    };
  });

