import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Entitlements } from "./entitlements.server";

export type MyEntitlements = Entitlements;

export const getMyEntitlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyEntitlements> => {
    const { getEntitlements } = await import("./entitlements.server");
    return getEntitlements(context.userId);
  });
