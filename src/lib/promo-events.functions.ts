import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENT = z.enum(["impression", "click", "dismiss"]);
const PLACEMENT = z.enum(["dashboard", "workspace", "sidebar", "bottom"]);

function serverClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

export const logPromoEvent = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        event: EVENT,
        placement: PLACEMENT,
        content_hash: z.string().min(1).max(64),
        user_id: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // Clients cannot write promo_events directly (restrictive policy); only this
    // validated server path may record events.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("promo_events").insert({
      event: data.event,
      placement: data.placement,
      content_hash: data.content_hash,
      user_id: data.user_id ?? null,
    });
    return { ok: true };
  });


export type PromoStats = {
  totals: { impressions: number; clicks: number; dismisses: number; ctr: number };
  daily: { date: string; impressions: number; clicks: number; dismisses: number }[];
  byPlacement: { placement: string; impressions: number; clicks: number; dismisses: number }[];
};

export const getPromoStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PromoStats> => {
    const isAdmin = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin.error || !isAdmin.data) {
      throw new Response("Forbidden", { status: 403 });
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("promo_events")
      .select("event, placement, created_at")
      .gte("created_at", since);
    if (error) throw error;

    const totals = { impressions: 0, clicks: 0, dismisses: 0, ctr: 0 };
    const dailyMap = new Map<string, { impressions: number; clicks: number; dismisses: number }>();
    const placeMap = new Map<string, { impressions: number; clicks: number; dismisses: number }>();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dailyMap.set(d, { impressions: 0, clicks: 0, dismisses: 0 });
    }

    for (const row of (data ?? []) as Array<{ event: string; placement: string; created_at: string }>) {
      const d = row.created_at.slice(0, 10);
      const day = dailyMap.get(d) ?? { impressions: 0, clicks: 0, dismisses: 0 };
      const place = placeMap.get(row.placement) ?? { impressions: 0, clicks: 0, dismisses: 0 };
      if (row.event === "impression") { totals.impressions++; day.impressions++; place.impressions++; }
      else if (row.event === "click") { totals.clicks++; day.clicks++; place.clicks++; }
      else if (row.event === "dismiss") { totals.dismisses++; day.dismisses++; place.dismisses++; }
      dailyMap.set(d, day);
      placeMap.set(row.placement, place);
    }
    totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

    return {
      totals,
      daily: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
      byPlacement: Array.from(placeMap.entries()).map(([placement, v]) => ({ placement, ...v })),
    };
  });
