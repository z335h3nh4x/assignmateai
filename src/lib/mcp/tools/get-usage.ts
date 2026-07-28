import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_usage",
  title: "Get plan and usage",
  description:
    "Get the signed-in student's Assignmate plan, included features, monthly assignment usage and remaining quota.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();

    const { data, error } = await supabaseForUser(ctx).rpc("get_entitlements", {
      _user_id: ctx.getUserId(),
    } as never);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { entitlements: data as unknown },
    };
  },
});
