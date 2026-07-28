import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_assignments",
  title: "List assignments",
  description:
    "List the signed-in student's Assignmate assignments, newest first. Optionally filter by a title search or status.",
  inputSchema: {
    query: z.string().optional().describe("Optional text to match against the assignment title."),
    status: z.string().optional().describe("Optional status filter, e.g. 'complete' or 'draft'."),
    limit: z.number().int().min(1).max(50).optional().describe("How many assignments to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();

    let q = supabaseForUser(ctx)
      .from("assignments")
      .select("id,title,status,subject:template,education_level,word_count,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);

    if (status) q = q.eq("status", status);
    if (query) q = q.ilike("title", `%${query}%`);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { assignments: data ?? [] },
    };
  },
});
