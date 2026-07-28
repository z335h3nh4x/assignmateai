import { defineTool } from "@lovable.dev/mcp-js";
import { unauthenticated } from "../supabase";

export default defineTool({
  name: "get_usage",
  title: "Get plan and usage",
  description:
    "Get the signed-in student's Assignmate plan, included features, monthly assignment usage and remaining quota.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();

    // The entitlements routine is server-only (clients may not execute it).
    // We read it through trusted server code, scoped to the verified caller id.
    const { getEntitlements } = await import("@/lib/entitlements.server");

    try {
      const data = await getEntitlements(ctx.getUserId());
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        structuredContent: { entitlements: data as unknown },
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: "Could not read plan usage." }],
        isError: true,
      };
    }
  },
});
