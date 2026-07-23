import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Gauge, Infinity as InfinityIcon, Sparkles } from "lucide-react";
import { useMyEntitlements } from "@/lib/use-plan-features";

function fmtReset(iso: string): string {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  const hours = Math.max(0, Math.round(diffMs / 3_600_000));
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function Row({
  label, used, limit, resetIn,
}: { label: string; used: number; limit: number | null; resetIn?: string }) {
  const unlimited = limit == null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const nearCap = !unlimited && pct >= 80;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={nearCap ? "text-amber-400 font-medium" : "text-foreground/90"}>
          {unlimited ? (
            <span className="inline-flex items-center gap-1"><InfinityIcon className="h-3 w-3" /> unlimited</span>
          ) : (
            <>{used} / {limit}{resetIn ? <span className="text-muted-foreground"> · resets in {resetIn}</span> : null}</>
          )}
        </span>
      </div>
      {!unlimited && <Progress value={pct} className="h-1.5" />}
    </div>
  );
}

export function UsagePanel() {
  const ent = useMyEntitlements();
  if (!ent) return null;
  const { plan, usage, remaining, resets } = ent;
  const dailyExhausted = remaining.daily === 0;
  const monthlyExhausted = remaining.monthly === 0;
  const creditsExhausted = remaining.credits === 0;
  const showUpgrade = plan.slug === "free" || dailyExhausted || monthlyExhausted || creditsExhausted;

  return (
    <Card className="glass border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-sm">Your usage</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wide rounded-full bg-primary/20 text-primary px-2 py-0.5">
          {plan.name}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Row label="Today" used={usage.day_used} limit={plan.daily_limit > 0 ? plan.daily_limit : null}
          resetIn={fmtReset(resets.daily)} />
        <Row label="This month" used={usage.month_used} limit={plan.monthly_limit > 0 ? plan.monthly_limit : null}
          resetIn={fmtReset(resets.monthly)} />
        <Row label="Credits" used={usage.credits_used} limit={plan.credits > 0 ? plan.credits : null}
          resetIn={fmtReset(resets.monthly)} />
      </div>
      {showUpgrade && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {dailyExhausted || monthlyExhausted || creditsExhausted
              ? "You've reached a limit on your current plan."
              : "Upgrade for higher daily & monthly limits, larger uploads, and premium features."}
          </p>
          <Button asChild size="sm" className="gradient-bg text-white border-0">
            <Link to="/" hash="pricing"><Sparkles className="h-3.5 w-3.5 mr-1" /> Upgrade</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
