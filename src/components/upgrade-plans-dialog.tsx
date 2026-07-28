import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Crown } from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listPublicPlans } from "@/lib/plans.functions";
import { planFeatureLines, formatPlanPrice } from "@/lib/plan-lines";
import { useBillingCurrency } from "@/hooks/use-site-settings";
import { useMyEntitlements } from "@/lib/use-plan-features";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";
import { TrustBadges } from "@/components/trust-badges";
import { Link } from "@tanstack/react-router";

export function UpgradePlansDialog({
  open,
  onOpenChange,
  highlightPlanId,
  title = "Choose your plan",
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightPlanId?: string;
  title?: string;
  description?: string;
}) {
  const { currency, locale } = useBillingCurrency();
  const ent = useMyEntitlements();
  const { data, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => listPublicPlans(),
    staleTime: 60_000,
  });

  const paidPlans = (data ?? []).filter((p) => p.monthly_price_cents >= 100 && p.sort_order >= 0);
  const currentPrice =
    paidPlans.find((p) => p.slug === ent?.plan.slug)?.monthly_price_cents ?? 0;
  const maxPrice = paidPlans.reduce((m, p) => Math.max(m, p.monthly_price_cents), 0);
  const onHighestPlan = !!ent && currentPrice > 0 && currentPrice >= maxPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription>
            {description ??
              "Upgrade your Assignmate subscription to unlock more assignments, credits and premium features."}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Loading plans…</p>}
        {!isLoading && paidPlans.length === 0 && (
          <p className="text-sm text-muted-foreground">No paid plans are available right now.</p>
        )}

        {onHighestPlan && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-300 animate-fade-in">
            <Crown className="h-4 w-4" /> You already have the highest available plan.
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          {paidPlans.map((p) => {
            const isCurrent = ent?.plan.slug === p.slug;
            const isDowngrade = !isCurrent && p.monthly_price_cents < currentPrice;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col transition-all duration-300 hover:border-white/20 ${
                  p.id === highlightPlanId || p.is_recommended ? "ring-1 ring-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{p.name}</p>
                  {isCurrent && (
                    <span className="text-[10px] uppercase tracking-wide rounded-full bg-primary/20 text-primary px-2 py-0.5">
                      Current plan
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-display">
                    {formatPlanPrice(p.monthly_price_cents, currency, locale)}
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

                {isCurrent ? (
                  <Button
                    disabled
                    variant="secondary"
                    className="mt-5 w-full rounded-xl h-auto py-3 font-medium"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    You are already subscribed to {p.name}
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    disabled
                    variant="secondary"
                    className="mt-5 w-full rounded-xl h-auto py-3 font-medium"
                  >
                    Included in your plan
                  </Button>
                ) : (
                  <RazorpayCheckoutButton
                    planId={p.id}
                    label={`Upgrade to ${p.name}`}
                    className="mt-5 w-full rounded-xl gradient-bg text-white border-0 h-auto py-3 font-medium"
                    onPaid={() => onOpenChange(false)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 space-y-3">
          <TrustBadges compact />
          <p className="text-center text-[11px] text-muted-foreground">
            Subscriptions activate instantly and are non-refundable once active. See our{" "}
            <Link to="/subscription-policy" className="underline underline-offset-2 hover:text-foreground">
              Subscription Policy
            </Link>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
