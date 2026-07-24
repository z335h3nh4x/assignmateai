import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSiteSettings, type SiteSettings } from "@/lib/site-settings.functions";

export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => getSiteSettings(),
    staleTime: 30_000,
  });
  return data;
}

export function platformName(site?: SiteSettings) {
  return site?.general.platform_name?.trim() || "Assignmate";
}

export function supportEmail(site?: SiteSettings) {
  return site?.general.support_email?.trim() || "";
}

export function contactEmail(site?: SiteSettings) {
  return site?.general.contact_email?.trim() || "";
}

export function websiteUrl(site?: SiteSettings) {
  return site?.general.website_url?.trim() || "";
}

/** Live-tracks whether the document is in light mode (documentElement has `.light`). */
export function useIsLightTheme() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const update = () => setLight(el.classList.contains("light"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    const onStorage = (e: StorageEvent) => { if (e.key === "theme") update(); };
    window.addEventListener("storage", onStorage);
    return () => { obs.disconnect(); window.removeEventListener("storage", onStorage); };
  }, []);
  return light;
}

/** Returns the theme-appropriate logo URL, falling back to whichever is set. */
export function useBrandLogo(site?: SiteSettings): string {
  const isLight = useIsLightTheme();
  const light = site?.branding.logo_url?.trim() || "";
  const dark = site?.branding.logo_dark_url?.trim() || "";
  if (isLight) return light || dark;
  return dark || light;
}
