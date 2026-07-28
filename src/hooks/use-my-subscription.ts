import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MySubscription = {
  status: string;
  renewal_at: string | null;
  started_at: string | null;
  billing_interval: string | null;
};

/**
 * Lightweight read of the signed-in user's subscription row (RLS-scoped).
 * Used for renewal date display only — entitlements remain the source of truth
 * for plan limits and features.
 */
export function useMySubscription() {
  const [data, setData] = useState<MySubscription | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: row } = await supabase
        .from("subscriptions")
        .select("status, renewal_at, started_at, billing_interval")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (active) setData((row as MySubscription) ?? null);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") load();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return data;
}

export function formatDateLong(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
