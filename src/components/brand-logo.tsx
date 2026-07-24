import { Sparkles } from "lucide-react";
import { useSiteSettings, useBrandLogo, platformName } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";

type Props = {
  /** Show the platform name next to the fallback icon (ignored when a logo image is available). */
  showName?: boolean;
  /** Tailwind size class for the logo height (e.g. "h-8"). */
  size?: string;
  /** Max-width class applied to the image (e.g. "max-w-[140px]"). */
  imgMaxWidth?: string;
  className?: string;
  /** Optional override — bypasses live theme detection. */
  variant?: "auto" | "light" | "dark";
};

export function BrandLogo({
  showName = true,
  size = "h-8",
  imgMaxWidth = "max-w-[140px]",
  className,
  variant = "auto",
}: Props) {
  const site = useSiteSettings();
  const autoLogo = useBrandLogo(site);
  const light = site?.branding.logo_url?.trim() || "";
  const dark = site?.branding.logo_dark_url?.trim() || "";
  const logo =
    variant === "light" ? (light || dark) :
    variant === "dark" ? (dark || light) :
    autoLogo;
  const name = platformName(site);

  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className={cn(size, "w-auto object-contain", imgMaxWidth, className)}
      />
    );
  }

  // Fallback: gradient sparkle mark + (optionally) name
  const iconBox = size.replace(/^h-/, "");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("rounded-lg gradient-bg grid place-items-center", size, `w-${iconBox}`)}>
        <Sparkles className="h-1/2 w-1/2 text-white" />
      </span>
      {showName && <span className="font-display font-semibold tracking-tight">{name}</span>}
    </span>
  );
}
