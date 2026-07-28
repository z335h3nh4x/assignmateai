import { useMyEntitlements } from "@/lib/use-plan-features";
import { cn } from "@/lib/utils";

type Tone = { dot: string; text: string; ring: string; bg: string };

const TONES: Record<string, Tone> = {
  free: {
    dot: "🟢",
    text: "text-emerald-300",
    ring: "ring-emerald-400/30",
    bg: "bg-emerald-400/10",
  },
  basic: {
    dot: "🟣",
    text: "text-violet-300",
    ring: "ring-violet-400/30",
    bg: "bg-violet-400/10",
  },
  plus: {
    dot: "🟡",
    text: "text-amber-300",
    ring: "ring-amber-400/30",
    bg: "bg-amber-400/10",
  },
};

export function planTone(slug?: string): Tone {
  if (!slug) return TONES.free;
  return TONES[slug] ?? TONES.plus;
}

export function planBadgeLabel(slug: string, name: string): string {
  if (slug === "free") return "FREE";
  return `${name.toUpperCase()} MEMBER`;
}

/** Compact plan badge — reads live entitlements so it updates on plan change. */
export function PlanBadge({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const ent = useMyEntitlements();
  if (!ent) return null;
  const tone = planTone(ent.plan.slug);
  const label = planBadgeLabel(ent.plan.slug, ent.plan.name);

  return (
    <span
      key={ent.plan.slug}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full ring-1 font-semibold tracking-wide uppercase animate-scale-in transition-colors duration-300",
        size === "sm" ? "text-[10px] px-2.5 py-1" : "text-xs px-3 py-1.5",
        tone.bg,
        tone.ring,
        tone.text,
        className,
      )}
    >
      <span aria-hidden>{tone.dot}</span>
      {label}
    </span>
  );
}
