import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAssignments from "./tools/list-assignments";
import getAssignment from "./tools/get-assignment";
import getUsage from "./tools/get-usage";

// Issuer must be the direct Supabase host; the project ref is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "assignmate-mcp",
  title: "Assignmate",
  version: "0.1.0",
  instructions:
    "Tools for Assignmate, an AI assignment workspace. Use `list_assignments` to find the student's assignments, `get_assignment` to read one in full (Markdown answer included), and `get_usage` to check their plan and remaining monthly quota. All tools act as the signed-in student only.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listAssignments, getAssignment, getUsage],
});
