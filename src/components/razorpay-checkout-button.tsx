import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createPlanOrder, verifyPlanPayment } from "@/lib/razorpay.functions";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Not in browser"));
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

async function readError(err: unknown, fallback: string): Promise<string> {
  if (err instanceof Response) {
    try {
      const body = (await err.clone().json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* ignore */
    }
    if (err.status === 401) return "Please sign in again to continue.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function RazorpayCheckoutButton({
  planId,
  label,
  className,
  onPaid,
}: {
  planId: string;
  label: string;
  className?: string;
  onPaid?: (paymentId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const createOrder = useServerFn(createPlanOrder);
  const verifyPayment = useServerFn(verifyPlanPayment);

  async function handleClick() {
    setBusy(true);
    try {
      await loadCheckoutScript();
      const order = await createOrder({ data: { planId } });
      const { data: userData } = await supabase.auth.getUser();

      if (!window.Razorpay) throw new Error("Razorpay checkout unavailable");

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "Assignmate",
        description: `${order.plan_name} plan`,
        prefill: {
          email: userData.user?.email ?? "",
          name: (userData.user?.user_metadata?.display_name as string) ?? "",
        },
        theme: { color: "#7c3aed" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            toast.info("Payment cancelled");
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const result = await verifyPayment({ data: response });
            toast.success("Payment verified successfully");
            onPaid?.(result.payment_id);
          } catch (err) {
            toast.error(await readError(err, "Payment verification failed"));
          } finally {
            setBusy(false);
          }
        },
      });

      rzp.on("payment.failed", (response: unknown) => {
        const description =
          (response as { error?: { description?: string } })?.error?.description ??
          "Payment failed. Please try again.";
        toast.error(description);
        setBusy(false);
      });

      rzp.open();
    } catch (err) {
      toast.error(await readError(err, "Could not start checkout"));
      setBusy(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={busy} className={className}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 mr-1" />
      )}
      {busy ? "Processing…" : label}
    </Button>
  );
}
