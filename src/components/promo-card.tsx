import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useMyPlan } from "@/lib/use-plan-features";
import type { PromoPlacement } from "@/lib/site-settings.functions";
import { logPromoEvent } from "@/lib/promo-events.functions";

const FALLBACK = {
  title: "Upgrade to unlock more",
  description: "Get more assignments, faster exports, and premium writing styles.",
  button_text: "Learn more",
};

const FOREVER = Number.MAX_SAFE_INTEGER;

function promoHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

function withinSchedule(startDate: string, endDate: string) {
  const now = Date.now();
  if (startDate) {
    const s = Date.parse(startDate);
    if (Number.isFinite(s) && now < s) return false;
  }
  if (endDate) {
    // Include the full end day
    const e = Date.parse(endDate);
    if (Number.isFinite(e) && now > e + 24 * 60 * 60 * 1000 - 1) return false;
  }
  return true;
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
  const logFn = useServerFn(logPromoEvent);
  const [suppressed, setSuppressed] = useState(false);
  const impressionSentRef = useRef<string>("");

  const m = site?.monetization;
  const contentKey = useMemo(
    () =>
      m
        ? promoHash(
            [
              m.id,
              m.badge,
              m.title,
              m.description,
              m.button_text,
              m.button_url,
              m.image_url,
              m.icon_emoji,
              m.bg_color,
              m.accent_color,
              m.theme_mode,
              m.button_variant,
            ].join("|"),
          )
        : "",
    [m],
  );

  // Frequency → suppression window in ms after a shown/dismissed event
  const suppressMs = useMemo(() => {
    const f = m?.frequency ?? "always";
    if (f === "always") return 0;
    if (f === "daily") return 24 * 60 * 60 * 1000;
    if (f === "weekly") return 7 * 24 * 60 * 60 * 1000;
    return FOREVER; // "once" — until admin edits content (contentKey changes)
  }, [m?.frequency]);

  const suppressKey = contentKey ? `promo-suppress:${contentKey}:${placement}` : "";
  const dismissKey = contentKey ? `promo-dismissed:${contentKey}:${placement}` : "";

  // Check localStorage suppression on mount / when key changes
  useEffect(() => {
    if (typeof window === "undefined" || !contentKey) return;
    try {
      // Dismissals always suppress for the chosen frequency window (or forever)
      const dismissedAt = Number(window.localStorage.getItem(dismissKey) ?? "");
      if (Number.isFinite(dismissedAt) && dismissedAt > 0) {
        if (suppressMs === FOREVER || Date.now() - dismissedAt < suppressMs) {
          setSuppressed(true);
          return;
        }
        window.localStorage.removeItem(dismissKey);
      }
      // Frequency-based suppression (per shown event)
      if (suppressMs > 0 && suppressMs !== FOREVER) {
        const shownAt = Number(window.localStorage.getItem(suppressKey) ?? "");
        if (Number.isFinite(shownAt) && shownAt > 0 && Date.now() - shownAt < suppressMs) {
          setSuppressed(true);
          return;
        }
      }
      setSuppressed(false);
    } catch {
      /* ignore */
    }
  }, [contentKey, dismissKey, suppressKey, suppressMs]);

  // Visibility gating
  const enabled =
    !!m &&
    m.enabled &&
    m.audience !== "off" &&
    (m.placements?.includes(placement) ?? false) &&
    withinSchedule(m.start_date ?? "", m.end_date ?? "");

  let audienceOk = true;
  if (enabled && m) {
    const isFree = !plan?.planSlug || plan.planSlug === "free";
    if (m.audience === "free" && !isFree) audienceOk = false;
    if (m.audience === "premium" && isFree) audienceOk = false;
    if ((m.audience === "free" || m.audience === "premium") && !plan) audienceOk = false; // wait for plan
  }
  const visible = enabled && audienceOk && !suppressed;

  // Impression tracking + shown-timestamp for frequency
  useEffect(() => {
    if (!visible || !contentKey) return;
    const key = `${contentKey}:${placement}`;
    if (impressionSentRef.current === key) return;
    impressionSentRef.current = key;
    if (suppressMs > 0 && suppressMs !== FOREVER && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(suppressKey, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    logFn({
      data: { event: "impression", placement, content_hash: contentKey, user_id: null },
    }).catch(() => {});
  }, [visible, contentKey, placement, logFn, suppressMs, suppressKey]);

  if (!visible || !m) return null;

  function dismiss() {
    if (dismissKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(dismissKey, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    setSuppressed(true);
    if (contentKey) {
      logFn({
        data: { event: "dismiss", placement, content_hash: contentKey, user_id: null },
      }).catch(() => {});
    }
  }

  function onCtaClick() {
    if (!contentKey) return;
    logFn({
      data: { event: "click", placement, content_hash: contentKey, user_id: null },
    }).catch(() => {});
  }

  const auto = (m.theme_mode ?? "auto") === "auto";
  const accent = m.accent_color || "#8b5cf6";
  const bg = m.bg_color || "#0f172a";
  const fg = m.text_color || "#f8fafc";
  const title = m.title?.trim() || FALLBACK.title;
  const description = m.description?.trim() || FALLBACK.description;
  const buttonText = m.button_text?.trim() || FALLBACK.button_text;
  const hasBtn = !!m.button_url?.trim();
  const target = m.open_new_tab ? "_blank" : undefined;
  const rel = m.open_new_tab ? "noopener noreferrer" : undefined;
  const variant = m.button_variant ?? "primary";

  const btnStyle: React.CSSProperties =
    variant === "primary"
      ? { background: accent, color: "#fff" }
      : variant === "secondary"
        ? { background: "transparent", border: `1px solid ${accent}`, color: auto ? undefined : fg }
        : { background: "transparent", color: accent };

  const shellClass = auto
    ? "border border-border bg-card text-card-foreground"
    : "border";
  const shellStyle: React.CSSProperties = auto
    ? { borderColor: `${accent}55` }
    : { background: `linear-gradient(135deg, ${bg} 0%, ${accent}22 100%)`, color: fg, borderColor: `${accent}55` };

  // Compact / sidebar version
  if (placement === "sidebar" || compact) {
    return (
      <div className={`relative rounded-xl p-3 ${shellClass} ${className}`} style={shellStyle}>
        <button
          onClick={dismiss}
          aria-label="Dismiss promotion"
          className="absolute top-1.5 right-1.5 opacity-60 hover:opacity-100"
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
        {(m.icon_emoji && !m.image_url) ? (
          <div className="mt-1 text-xl leading-none">{m.icon_emoji}</div>
        ) : null}
        <div className="mt-1.5 text-sm font-semibold leading-snug">{title}</div>
        <p className="mt-1 text-xs opacity-80 leading-snug line-clamp-3">{description}</p>
        {hasBtn && (
          <a
            href={m.button_url}
            target={target}
            rel={rel}
            onClick={onCtaClick}
            className="mt-2 inline-flex text-xs font-medium px-2.5 py-1 rounded-md"
            style={btnStyle}
          >
            {buttonText}
          </a>
        )}
      </div>
    );
  }

  // Full version — responsive: stack on mobile
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start gap-4 ${shellClass} ${className}`}
      style={shellStyle}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss promotion"
        className="absolute top-2 right-2 opacity-60 hover:opacity-100 p-1"
      >
        <X className="h-4 w-4" />
      </button>
      {m.image_url ? (
        <img
          src={m.image_url}
          alt=""
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover shrink-0"
        />
      ) : m.icon_emoji ? (
        <div
          className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: `${accent}22` }}
        >
          {m.icon_emoji}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 pr-6">
        {m.badge && (
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: accent, color: "#fff" }}
          >
            {m.badge}
          </span>
        )}
        <div className="mt-1.5 text-base md:text-lg font-semibold leading-tight">{title}</div>
        <p className="mt-1 text-sm opacity-80 leading-snug">{description}</p>
      </div>
      {hasBtn && (
        <a
          href={m.button_url}
          target={target}
          rel={rel}
          onClick={onCtaClick}
          className="shrink-0 self-start sm:self-center inline-flex text-sm font-medium px-3.5 py-2 rounded-lg"
          style={btnStyle}
        >
          {buttonText}
        </a>
      )}
    </div>
  );
}
