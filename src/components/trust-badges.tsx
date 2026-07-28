import { Lock, Zap, ShieldCheck, GraduationCap, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const TRUST_POINTS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Lock, label: "Secure payments powered by Razorpay" },
  { icon: Zap, label: "Instant subscription activation" },
  { icon: ShieldCheck, label: "Safe & encrypted checkout" },
  { icon: GraduationCap, label: "Built for Indian students" },
  { icon: CreditCard, label: "Supports UPI, Cards, Net Banking & Wallets" },
];

/**
 * Accurate payment trust messaging shown around checkout surfaces.
 * Deliberately contains no refund / money-back claims — subscriptions are
 * non-refundable once activated (see /subscription-policy).
 */
export function TrustBadges({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-2 ${className}`}
    >
      {TRUST_POINTS.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className={`glass flex items-center gap-2 rounded-full border border-white/10 text-muted-foreground ${
            compact ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
