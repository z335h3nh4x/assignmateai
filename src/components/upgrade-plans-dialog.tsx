import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { listPublicPlans } from "@/lib/plans.functions";
import { planFeatureLines, formatPlanPrice } from "@/lib/plan-lines";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";

export function UpgradePlansDialog({
  open,
  onOpenChange,
  highlightPlanId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightPlanId?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => listPublicPlans(),
    staleTime: 60_000,
  });

  const paidPlans = (data ?? []).filter((p) => p.monthly_price_cents >= 100 && p.sort_order >= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Choose your plan</DialogTitle>
          <DialogDescription>
            Upgrade your Assignmate subscription to unlock more assignments, credits and premium
            features.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Loading plans…</p>}
        {!isLoading && paidPlans.length === 0 && (
          <p className="text-sm text-muted-foreground">No paid plans are available right now.</p>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          {paidPlans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col ${
                p.id === highlightPlanId || p.is_recommended ? "ring-1 ring-primary" : ""
              }`}
            >
              <p className="text-sm text-muted-foreground">{p.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold font-display">
                  {formatPlanPrice(p.monthly_price_cents, p.currency)}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm flex-1">
                {planFeatureLines(p).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full gradient-bg grid place-items-center mt-0.5 flex-shrink-0">
                      <ChevronRight className="h-2.5 w-2.5 text-white" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <RazorpayCheckoutButton
                planId={p.id}
                label={`Upgrade to ${p.name}`}
                className="mt-5 w-full rounded-xl gradient-bg text-white border-0 h-auto py-3 font-medium"
                onPaid={() => onOpenChange(false)}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
