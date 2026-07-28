import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Gauge, Infinity as InfinityIcon, Sparkles, CalendarClock, AlertTriangle,
  HardDrive, FileStack, CheckCircle2,
} from "lucide-react";
import { useMyEntitlements } from "@/lib/use-plan-features";
import { PlanBadge } from "@/components/plan-badge";
import { LimitReachedDialog } from "@/components/upgrade-limit-dialog";
import { UpgradePlansDialog } from "@/components/upgrade-plans-dialog";
import { formatDateLong, useMySubscription } from "@/hooks/use-my-subscription";

function formatResetDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function daysUntil(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
}

function formatResetIn(iso: string): string {
  const d = daysUntil(iso);
  return `${d} day${d === 1 ? "" : "s"} remaining`;
}

function MetricBlock({
  label, used, limit, unit, icon,
}: {
  label: string;
  used: number;
  limit: number | null;
  unit?: string;
  icon?: React.ReactNode;
}) {
  const unlimited = limit == null;
  const remaining = unlimited ? null : Math.max(0, (limit ?? 0) - used);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit!)) * 100));
  const exhausted = !unlimited && remaining === 0;
  const nearCap = !unlimited && pct >= 80;

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2 transition-colors duration-300">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      {unlimited ? (
        <div className="flex items-center gap-1.5 text-lg font-semibold">
          <InfinityIcon className="h-4 w-4" /> Unlimited
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-semibold transition-colors duration-300 ${exhausted ? "text-destructive" : nearCap ? "text-amber-400" : "text-foreground"}`}>
              {used.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              / {limit.toLocaleString()}{unit ? ` ${unit}` : ""} used
            </span>
          </div>
          <Progress
            value={pct}
            className="h-1.5 [&>div]:transition-all [&>div]:duration-700 [&>div]:ease-out"
          />
          <div className={`text-xs ${exhausted ? "text-destructive" : "text-muted-foreground"}`}>
            {(remaining ?? 0).toLocaleString()}{unit ? ` ${unit}` : ""} remaining
          </div>
        </>
      )}
    </div>
  );
}

function CapacityBlock({
  label, value, icon,
}: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
      <Progress value={100} className="h-1.5 [&>div]:transition-all [&>div]:duration-700" />
      <div className="text-xs text-muted-foreground">Per upload allowance</div>
    </div>
  );
}

export function UsagePanel() {
  const ent = useMyEntitlements();
  const sub = useMySubscription();
  const [limitOpen, setLimitOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  if (!ent) return null;
  const { plan, usage, remaining, resets } = ent;
  const monthlyExhausted = remaining.monthly === 0;
  const creditsExhausted = remaining.credits === 0;
  const anyExhausted = monthlyExhausted || creditsExhausted;
  const isFree = plan.slug === "free";
  const showCredits = plan.credits > 0;

  return (
    <Card className="glass border-white/10 p-5 space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <Gauge className="h-3.5 w-3.5 text-primary" /> Current plan
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PlanBadge size="md" />
            <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground sm:text-right space-y-0.5">
          <div className="flex items-center gap-1.5 sm:justify-end">
            <CalendarClock className="h-3.5 w-3.5" />
            Next renewal:{" "}
            <span className="text-foreground/90 font-medium">
              {sub?.renewal_at ? formatDateLong(sub.renewal_at) : formatResetDate(resets.monthly)}
            </span>
          </div>
          <div className="sm:text-right">
            {remaining.monthly == null ? "Unlimited" : `${remaining.monthly} assignments`} ·{" "}
            {remaining.credits == null ? "Unlimited" : `${remaining.credits.toLocaleString()} credits`} remaining
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricBlock
          label="Assignments this month"
          used={usage.month_used}
          limit={plan.monthly_limit > 0 ? plan.monthly_limit : null}
          icon={<Sparkles className="h-3 w-3" />}
        />
        {showCredits && (
          <MetricBlock
            label="Credits"
            used={usage.credits_used}
            limit={plan.credits}
            icon={<Gauge className="h-3 w-3" />}
          />
        )}
        {plan.max_upload_mb > 0 && (
          <CapacityBlock
            label="Upload size"
            value={`${plan.max_upload_mb} MB`}
            icon={<HardDrive className="h-3 w-3" />}
          />
        )}
        {plan.max_upload_pages > 0 && (
          <CapacityBlock
            label="Upload pages"
            value={`${plan.max_upload_pages} pages`}
            icon={<FileStack className="h-3 w-3" />}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Usage resets: <span className="text-foreground/90 font-medium">{formatResetDate(resets.monthly)}</span>
          <span className="text-muted-foreground/70">({formatResetIn(resets.monthly)})</span>
        </div>
        {(isFree || anyExhausted) && (
          <Button
            size="sm"
            className="gradient-bg text-white border-0 transition-transform duration-200 hover:scale-105"
            onClick={() => (anyExhausted ? setLimitOpen(true) : setPlansOpen(true))}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Upgrade plan
          </Button>
        )}
      </div>

      {anyExhausted && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs animate-fade-in">
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

      <LimitReachedDialog
        open={limitOpen}
        onOpenChange={setLimitOpen}
        reason={monthlyExhausted ? "monthly" : "credits"}
      />
      <UpgradePlansDialog open={plansOpen} onOpenChange={setPlansOpen} />
    </Card>
  );
}
