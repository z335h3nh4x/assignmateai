import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Gauge, Infinity as InfinityIcon, Sparkles, CalendarClock, AlertTriangle } from "lucide-react";
import { useMyEntitlements } from "@/lib/use-plan-features";

function formatResetDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function formatResetIn(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const hours = Math.max(0, Math.round(diffMs / 3_600_000));
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

function MetricBlock({
  label, used, limit,
}: { label: string; used: number; limit: number | null }) {
  const unlimited = limit == null;
  const remaining = unlimited ? null : Math.max(0, (limit ?? 0) - used);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit!)) * 100));
  const exhausted = !unlimited && remaining === 0;
  const nearCap = !unlimited && pct >= 80;

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {unlimited ? (
        <div className="flex items-center gap-1.5 text-lg font-semibold">
          <InfinityIcon className="h-4 w-4" /> Unlimited
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-semibold ${exhausted ? "text-destructive" : nearCap ? "text-amber-400" : "text-foreground"}`}>
              {used}
            </span>
            <span className="text-sm text-muted-foreground">/ {limit} used</span>
          </div>
          <Progress value={pct} className="h-1.5" />
          <div className={`text-xs ${exhausted ? "text-destructive" : "text-muted-foreground"}`}>
            {remaining} remaining
          </div>
        </>
      )}
    </div>
  );
}

export function UsagePanel() {
  const ent = useMyEntitlements();
  if (!ent) return null;
  const { plan, usage, remaining, resets } = ent;
  const monthlyExhausted = remaining.monthly === 0;
  const creditsExhausted = remaining.credits === 0;
  const anyExhausted = monthlyExhausted || creditsExhausted;
  const showUpgrade = plan.slug === "free" || anyExhausted;
  const showCredits = plan.credits > 0;

  return (
    <Card className="glass border-white/10 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-sm">Monthly assignment usage</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wide rounded-full bg-primary/20 text-primary px-2 py-0.5">
          {plan.name} plan
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${showCredits ? "sm:grid-cols-2" : ""}`}>
        <MetricBlock
          label="Assignments this month"
          used={usage.month_used}
          limit={plan.monthly_limit > 0 ? plan.monthly_limit : null}
        />
        {showCredits && (
          <MetricBlock
            label="Credits"
            used={usage.credits_used}
            limit={plan.credits}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Next reset: <span className="text-foreground/90 font-medium">{formatResetDate(resets.monthly)}</span>
          <span className="text-muted-foreground/70">({formatResetIn(resets.monthly)})</span>
        </div>
        {showUpgrade && (
          <Button asChild size="sm" className="gradient-bg text-white border-0">
            <Link to="/" hash="pricing"><Sparkles className="h-3.5 w-3.5 mr-1" /> Upgrade to Pro</Link>
          </Button>
        )}
      </div>

      {anyExhausted && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-destructive">
              {monthlyExhausted ? "Monthly assignment limit reached" : "Credit limit reached"}
            </div>
            <div className="text-muted-foreground mt-0.5">
              You can generate again on {formatResetDate(resets.monthly)}, or upgrade for a higher limit.
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
