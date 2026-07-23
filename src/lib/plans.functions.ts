import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  credits: number;
  daily_limit: number;
  monthly_limit: number;
  max_words: number;
  max_upload_mb: number;
  max_upload_pages: number;
  features: Record<string, boolean>;
  is_recommended: boolean;
  sort_order: number;
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

export const listPublicPlans = createServerFn({ method: "GET" }).handler(async (): Promise<PublicPlan[]> => {
  const sb = serverClient();
  const { data, error } = await sb
    .from("plans")
    .select(
      "id, slug, name, description, currency, monthly_price_cents, yearly_price_cents, credits, daily_limit, monthly_limit, max_words, max_upload_mb, max_upload_pages, features, is_recommended, sort_order",
    )
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as unknown as PublicPlan[];
});
