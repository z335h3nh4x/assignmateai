import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard } from "lucide-react";

import { Card } from "@/components/ui/card";
import { listPublicPlans } from "@/lib/plans.functions";
import { useMyEntitlements } from "@/lib/use-plan-features";
import { useBillingCurrency } from "@/hooks/use-site-settings";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";

type RankedPlan = { slug: string; sort_order: number; monthly_price_cents: number };

/** Plan hierarchy: tier order first, then monthly price as a tie-breaker. */
export function planRank(p: RankedPlan): [number, number] {
  return [p.sort_order ?? 0, p.monthly_price_cents ?? 0];
}

export function isHigherPlan(candidate: RankedPlan, current: RankedPlan | null): boolean {
  if (!current) return true;
  const [a1, a2] = planRank(candidate);
  const [b1, b2] = planRank(current);
  return a1 > b1 || (a1 === b1 && a2 > b2);
}

export function UpgradePanel() {
  const ent = useMyEntitlements();
  const { formatCents } = useBillingCurrency();
  const { data } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => listPublicPlans(),
    staleTime: 60_000,
  });

  // Wait for both the real current plan and the plan list before deciding.
  if (!ent || !data) return null;

  const plans = data;
  const currentSlug = ent.plan?.slug ?? "free";
  const current = plans.find((p) => p.slug === currentSlug) ?? null;
  const currentName = current?.name ?? ent.plan?.name ?? "Free";
  const isPaidCurrent = currentSlug !== "free";

  const upgrades = plans.filter(
    (p) => p.monthly_price_cents >= 100 && p.slug !== currentSlug && isHigherPlan(p, current),
  );

  if (upgrades.length === 0) {
    if (!isPaidCurrent) return null;
    return (
      <Card className="glass border-white/10 p-6">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">You're on the top plan</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Current plan: <span className="font-medium text-foreground">{currentName}</span>. You already have our highest tier.
        </p>
      </Card>
    );
  }

  return (
    <Card className="glass border-white/10 p-6">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Upgrade your plan</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {isPaidCurrent ? (
          <>Current plan: <span className="font-medium text-foreground">{currentName}</span>. </>
        ) : null}
        Secure checkout powered by Razorpay.
      </p>
      <div className="space-y-3">
        {upgrades.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCents(p.monthly_price_cents)} / month
                {p.monthly_limit ? ` · ${p.monthly_limit} assignments` : ""}
              </p>
            </div>
            <RazorpayCheckoutButton
              planId={p.id}
              label={`Upgrade · ${formatCents(p.monthly_price_cents)}`}
              className="gradient-bg text-white border-0"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
