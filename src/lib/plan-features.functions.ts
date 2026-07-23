import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyPlanFeatures = {
  planId: string | null;
  planSlug: string;
  planName: string;
  features: Record<string, boolean>;
};

export const getMyPlanFeatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPlanFeatures> => {
    const { loadUserPlan } = await import("./plan-features.server");
    return loadUserPlan(context.userId);
  });
