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

export type VerifyResult = { verified: true; payment_id: string } ;

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
  .handler(async ({ data }): Promise<VerifyResult> => {
    const { verifyRazorpaySignature } = await import("./razorpay.server");

    const ok = await verifyRazorpaySignature({
      orderId: data.razorpay_order_id,
      paymentId: data.razorpay_payment_id,
      signature: data.razorpay_signature,
    });

    if (!ok) {
      throw new Response(JSON.stringify({ error: "Signature verification failed" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    return { verified: true, payment_id: data.razorpay_payment_id };
  });
