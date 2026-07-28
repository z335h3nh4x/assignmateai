import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_assignment",
  title: "Get assignment",
  description:
    "Read one of the signed-in student's assignments in full, including the generated answer text in Markdown.",
  inputSchema: {
    id: z.string().describe("The assignment id returned by list_assignments."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();

    const { data, error } = await supabaseForUser(ctx)
      .from("assignments")
      .select(
        "id,title,status,prompt,result,template,citation_style,education_level,output_style,word_count,question_statuses,quality_score,created_at,updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Assignment not found." }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { assignment: data },
    };
  },
});
