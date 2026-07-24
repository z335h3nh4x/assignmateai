import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useMyPlan } from "@/lib/use-plan-features";
import type { PromoPlacement } from "@/lib/site-settings.functions";

const DISMISS_MS = 24 * 60 * 60 * 1000;

function promoHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

export function PromoCard({
  placement,
  className = "",
  compact = false,
}: {
  placement: PromoPlacement;
  className?: string;
  compact?: boolean;
}) {
  const site = useSiteSettings();
  const plan = useMyPlan();
  const [dismissed, setDismissed] = useState(false);

  const m = site?.monetization;
  const contentKey = useMemo(
    () =>
      m
        ? promoHash(
            [
              m.badge,
              m.title,
              m.description,
              m.button_text,
              m.button_url,
              m.image_url,
              m.bg_color,
              m.accent_color,
            ].join("|"),
          )
        : "",
    [m],
  );
  const storageKey = contentKey ? `promo-dismissed:${contentKey}:${placement}` : "";

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = Number(raw);
      if (!Number.isFinite(ts) || Date.now() - ts > DISMISS_MS) {
        window.localStorage.removeItem(storageKey);
        setDismissed(false);
      } else {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  if (!m || !m.enabled) return null;
  if (m.audience === "off") return null;
  if (!m.placements?.includes(placement)) return null;
  if (!m.title?.trim() && !m.description?.trim()) return null;

  // Audience gating — hide from paid users unless "everyone".
  if (m.audience === "free") {
    // If plan hasn't loaded yet, skip render to avoid flashing to paid users.
    if (!plan) return null;
    if (plan.planSlug && plan.planSlug !== "free") return null;
  }

  if (dismissed) return null;

  function dismiss() {
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  }

  const bg = m.bg_color || "#0f172a";
  const fg = m.text_color || "#f8fafc";
  const accent = m.accent_color || "#8b5cf6";
  const hasBtn = !!(m.button_text?.trim() && m.button_url?.trim());
  const target = m.open_new_tab ? "_blank" : undefined;
  const rel = m.open_new_tab ? "noopener noreferrer" : undefined;

  if (placement === "sidebar" || compact) {
    return (
      <div
        className={`relative rounded-xl border p-3 ${className}`}
        style={{ background: bg, color: fg, borderColor: `${accent}44` }}
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 opacity-60 hover:opacity-100"
          style={{ color: fg }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {m.badge && (
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: accent, color: "#fff" }}
          >
            {m.badge}
          </span>
        )}
        {m.title && (
          <div className="mt-1.5 text-sm font-semibold leading-snug">{m.title}</div>
        )}
        {m.description && (
          <p className="mt-1 text-xs opacity-80 leading-snug line-clamp-3">
            {m.description}
          </p>
        )}
        {hasBtn && (
          <a
            href={m.button_url}
            target={target}
            rel={rel}
            className="mt-2 inline-flex text-xs font-medium px-2.5 py-1 rounded-md"
            style={{ background: accent, color: "#fff" }}
          >
            {m.button_text}
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 md:p-5 flex items-start gap-4 ${className}`}
      style={{ background: bg, color: fg, borderColor: `${accent}55` }}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 opacity-60 hover:opacity-100 p-1"
        style={{ color: fg }}
      >
        <X className="h-4 w-4" />
      </button>
      {m.image_url && (
        <img
          src={m.image_url}
          alt=""
          className="hidden sm:block h-16 w-16 rounded-xl object-cover shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        {m.badge && (
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: accent, color: "#fff" }}
          >
            {m.badge}
          </span>
        )}
        {m.title && (
          <div className="mt-1.5 text-base md:text-lg font-semibold leading-tight">
            {m.title}
          </div>
        )}
        {m.description && (
          <p className="mt-1 text-sm opacity-80 leading-snug">{m.description}</p>
        )}
      </div>
      {hasBtn && (
        <a
          href={m.button_url}
          target={target}
          rel={rel}
          className="shrink-0 self-center inline-flex text-sm font-medium px-3.5 py-2 rounded-lg"
          style={{ background: accent, color: "#fff" }}
        >
          {m.button_text}
        </a>
      )}
    </div>
  );
}
