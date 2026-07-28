import { useQuery } from "@tanstack/react-query";
import { Sparkles, Zap, Gauge, ShieldOff, FileText } from "lucide-react";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listPublicPlans } from "@/lib/plans.functions";
import { useMyEntitlements } from "@/lib/use-plan-features";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";

export type LimitReason = "monthly" | "credits";

/**
 * Premium "you hit a limit" prompt. Instead of blocking, it offers the next
 * paid tier with one-click Razorpay checkout.
 */
export function LimitReachedDialog({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason: LimitReason;
}) {
  const ent = useMyEntitlements();
  const { data } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => listPublicPlans(),
    staleTime: 60_000,
  });

  const paidPlans = (data ?? [])
    .filter((p) => p.monthly_price_cents >= 100)
    .sort((a, b) => a.monthly_price_cents - b.monthly_price_cents);
  const currentPrice =
    paidPlans.find((p) => p.slug === ent?.plan.slug)?.monthly_price_cents ?? 0;
  const next = paidPlans.find((p) => p.monthly_price_cents > currentPrice);

  const usedLine =
    reason === "monthly"
      ? `You've used all ${ent?.plan.monthly_limit ?? 0} monthly assignments.`
      : `You've used all ${(ent?.plan.credits ?? 0).toLocaleString()} credits for this cycle.`;

  const perks = next
    ? [
        { icon: Sparkles, label: `${next.monthly_limit.toLocaleString()} assignments/month` },
        { icon: Gauge, label: `${next.credits.toLocaleString()} credits` },
        { icon: Zap, label: "Faster generation" },
        next.features?.ad_free
          ? { icon: ShieldOff, label: "Ad-free experience" }
          : { icon: FileText, label: "Premium export formats" },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-md animate-scale-in">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full gradient-bg glow">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center font-display text-xl">{usedLine}</DialogTitle>
          <DialogDescription className="text-center">
            {next
              ? `Upgrade to ${next.name} to unlock:`
              : "Your limits reset at the start of your next billing cycle."}
          </DialogDescription>
        </DialogHeader>

        {next && (
          <ul className="space-y-2 text-sm rounded-xl border border-white/10 bg-white/5 p-4 animate-fade-in">
            {perks.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          {next && (
            <RazorpayCheckoutButton
              planId={next.id}
              label={`Upgrade to ${next.name}`}
              className="gradient-bg text-white border-0"
              onPaid={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
