import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ListItem = {
  question?: string | null;
  answer?: string | null;
  title?: string | null;
  body?: string | null;
  name?: string | null;
  role?: string | null;
  quote?: string | null;
};

export type SiteSettings = {
  general: {
    platform_name: string;
    tagline: string;
    support_email: string;
    contact_email: string;
    website_url: string;
    copyright_text: string;
    footer_text: string;
    maintenance_mode: boolean;
  };
  branding: {
    logo_url: string;
    logo_dark_url: string;
    favicon_url: string;
    og_image_url: string;
    primary_color: string;
    accent_color: string;
    brand_font: string;
  };
  landing: {
    hero_eyebrow: string;
    hero_title: string;
    hero_subtitle: string;
    hero_cta_text: string;
    hero_cta_url: string;
    hero_secondary_cta_text: string;
    hero_secondary_cta_url: string;
    show_pricing: boolean;
    show_testimonials: boolean;
    show_faq: boolean;
    features_heading: string;
    features_subheading: string;
    pricing_heading: string;
    pricing_subheading: string;
    faq_heading: string;
    testimonials_heading: string;
    features: ListItem[];
    faq: ListItem[];
    testimonials: ListItem[];
  };
};

const DEFAULTS: SiteSettings = {
  general: {
    platform_name: "Assignmate",
    tagline: "AI-powered assignment workspace for students.",
    support_email: "",
    contact_email: "",
    website_url: "",
    copyright_text: "© 2026 Assignmate. All rights reserved.",
    footer_text: "Built for students who ship.",
    maintenance_mode: false,
  },
  branding: {
    logo_url: "",
    logo_dark_url: "",
    favicon_url: "",
    og_image_url: "",
    primary_color: "#6366f1",
    accent_color: "#8b5cf6",
    brand_font: "Inter",
  },
  landing: {
    hero_eyebrow: "",
    hero_title: "",
    hero_subtitle: "",
    hero_cta_text: "Try Free",
    hero_cta_url: "/auth",
    hero_secondary_cta_text: "See how it works",
    hero_secondary_cta_url: "#features",
    show_pricing: true,
    show_testimonials: false,
    show_faq: true,
    features_heading: "",
    features_subheading: "",
    pricing_heading: "",
    pricing_subheading: "",
    faq_heading: "Frequently asked",
    testimonials_heading: "Loved by students",
    features: [],
    faq: [],
    testimonials: [],
  },
};

function serverClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function apply(target: any, key: string, value: any) {
  const [scope, ...rest] = key.split(".");
  const field = rest.join(".");
  if (!scope || !field) return;
  if (!(scope in target)) return;
  if (!(field in target[scope])) return;
  if (value === null || value === undefined) return;
  target[scope][field] = value;
}

export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    const sb = serverClient();
    const merged: SiteSettings = JSON.parse(JSON.stringify(DEFAULTS));
    const { data, error } = await sb
      .from("platform_settings")
      .select("key, value")
      .or("key.like.general.%,key.like.branding.%,key.like.landing.%");
    if (error || !data) return merged;
    for (const row of data as Array<{ key: string; value: unknown }>) {
      apply(merged, row.key, row.value);
    }
    return merged;
  },
);
