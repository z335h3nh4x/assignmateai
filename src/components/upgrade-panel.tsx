import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";

import { Card } from "@/components/ui/card";
import { listPublicPlans } from "@/lib/plans.functions";
import { useMyEntitlements } from "@/lib/use-plan-features";
import { useBillingCurrency } from "@/hooks/use-site-settings";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";

export function UpgradePanel() {
  const ent = useMyEntitlements();
  const { formatCents } = useBillingCurrency();
  const { data } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => listPublicPlans(),
    staleTime: 60_000,
  });

  const paidPlans = (data ?? []).filter(
    (p) => p.monthly_price_cents >= 100 && p.slug !== ent?.plan.slug,
  );
  if (paidPlans.length === 0) return null;


  return (
    <Card className="glass border-white/10 p-6">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Upgrade your plan</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Secure checkout powered by Razorpay.
      </p>
      <div className="space-y-3">
        {paidPlans.map((p) => (
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
              label={`Pay ${formatCents(p.monthly_price_cents)}`}
              className="gradient-bg text-white border-0"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
