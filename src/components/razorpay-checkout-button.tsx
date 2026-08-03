import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createPlanOrder, verifyPlanPayment } from "@/lib/razorpay.functions";
import { PaymentSuccessDialog, type PaymentSuccessInfo } from "@/components/payment-success-dialog";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
      close?: () => void;
    };
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const RZP_ORIGINS = ["https://checkout.razorpay.com", "https://api.razorpay.com"];

// Module-level singleton: no matter how many checkout buttons render, the
// script tag is created once and every caller awaits the same promise.
let scriptPromise: Promise<void> | null = null;
let hintsAdded = false;

function addConnectionHints() {
  if (hintsAdded || typeof document === "undefined") return;
  hintsAdded = true;
  for (const origin of RZP_ORIGINS) {
    for (const rel of ["preconnect", "dns-prefetch"]) {
      if (document.querySelector(`link[rel="${rel}"][href="${origin}"]`)) continue;
      const link = document.createElement("link");
      link.rel = rel;
      link.href = origin;
      if (rel === "preconnect") link.crossOrigin = "";
      document.head.appendChild(link);
    }
  }
}

function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in browser"));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const raw = new Promise<void>((resolve, reject) => {
    addConnectionHints();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        scriptPromise = null; // allow a retry on the next click
        reject(new Error("Failed to load Razorpay checkout"));
      },
      { once: true },
    );
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  scriptPromise = timeScriptLoad(raw, false);
  return scriptPromise;
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
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [success, setSuccess] = useState<PaymentSuccessInfo | null>(null);
  const inFlight = useRef(false);
  const rzpRef = useRef<InstanceType<NonNullable<Window["Razorpay"]>> | null>(null);
  const queryClient = useQueryClient();
  const createOrder = useServerFn(createPlanOrder);
  const verifyPayment = useServerFn(verifyPlanPayment);

  // Warm the checkout script while the browser is idle so the first tap on
  // mobile opens instantly instead of waiting on a cold script fetch.
  useEffect(() => {
    if (typeof window === "undefined" || window.Razorpay || scriptPromise) return;
    const warm = () => void loadCheckoutScript().catch(() => {});
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (idle) {
      const id = idle(warm, { timeout: 3000 });
      return () => (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(t);
  }, []);

  function release() {
    inFlight.current = false;
    rzpRef.current = null;
    setBusy(false);
    setCreatingOrder(false);
  }

  async function handleClick() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setCreatingOrder(true);
    try {
      // Script load, order creation and the (local, cached) session read all
      // run in parallel — nothing is serialised before the checkout opens.
      const [, order, sessionResult] = await Promise.all([
        loadCheckoutScript(),
        createOrder({ data: { planId } }),
        supabase.auth.getSession(),
      ]);
      setCreatingOrder(false);
      const user = sessionResult.data.session?.user;

      if (!window.Razorpay) throw new Error("Razorpay checkout unavailable");
      if (rzpRef.current) return; // never build a second instance for one click

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "Assignmate",
        description: `${order.plan_name} plan`,
        prefill: {
          email: user?.email ?? "",
          name: (user?.user_metadata?.display_name as string) ?? "",
        },
        theme: { color: "#7c3aed" },
        modal: {
          ondismiss: () => {
            release();
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
            setSuccess({
              planName: result.plan_name ?? "your new",
              alreadyProcessed: result.already_processed,
            });
            onPaid?.(result.payment_id);
            // Refresh cached data after the success UI is already on screen.
            void queryClient.invalidateQueries();
          } catch (err) {
            toast.error(await readError(err, "Payment verification failed"));
          } finally {
            release();
          }
        },
      });

      rzpRef.current = rzp;

      rzp.on("payment.failed", (response: unknown) => {
        const description =
          (response as { error?: { description?: string } })?.error?.description ??
          "Payment failed. Please try again.";
        toast.error(description);
        release();
      });

      rzp.open();
    } catch (err) {
      const detail = await readError(err, "");
      toast.error("Unable to start payment.", {
        description: detail || "Please try again.",
      });
      release();
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        onPointerEnter={() => void loadCheckoutScript().catch(() => {})}
        disabled={busy}
        aria-busy={busy}
        className={`${className ?? ""} transition-all duration-200`}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1" />
        )}
        {creatingOrder ? "Creating secure payment…" : busy ? "Processing…" : label}
      </Button>
      <PaymentSuccessDialog info={success} onClose={() => setSuccess(null)} />
    </>
  );
}
