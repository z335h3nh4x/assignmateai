import { useQuery } from "@tanstack/react-query";
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
