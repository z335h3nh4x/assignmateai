import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Sparkles, Zap, Gauge, Crown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateLong, useMySubscription } from "@/hooks/use-my-subscription";

export type PaymentSuccessInfo = {
  planName: string;
  alreadyProcessed?: boolean;
};

const BENEFITS = [
  { icon: Sparkles, label: "More monthly assignments" },
  { icon: Gauge, label: "Higher credits" },
  { icon: Zap, label: "Faster generation" },
  { icon: Crown, label: "Premium features" },
];

export function PaymentSuccessDialog({
  info,
  onClose,
}: {
  info: PaymentSuccessInfo | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const sub = useMySubscription();
  const open = !!info;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass border-white/10 sm:max-w-md overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 gradient-bg opacity-20 blur-3xl" />
        <DialogHeader className="relative">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full gradient-bg glow animate-scale-in">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-center font-display text-2xl">
            🎉 Welcome to Assignmate!
          </DialogTitle>
          <DialogDescription className="text-center">
            Your {info?.planName ?? ""} subscription is now active.
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-3 animate-fade-in">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> Payment Successful
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Detail label="Current plan" value={info?.planName ?? "—"} />
            <Detail label="Activated" value="Today" />
            <Detail label="Next renewal" value={formatDateLong(sub?.renewal_at)} />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Benefits unlocked
            </p>
            <ul className="space-y-1.5 text-sm">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative flex flex-col-reverse sm:flex-row sm:justify-center gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Continue Exploring
          </Button>
          <Button
            className="gradient-bg text-white border-0"
            onClick={() => {
              onClose();
              navigate({ to: "/dashboard" });
            }}
          >
            Go to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5 leading-tight">{value}</p>
    </div>
  );
}
