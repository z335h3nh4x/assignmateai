import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GenerateInput = z.object({
  prompt: z.string().min(3).max(30000),
  educationLevel: z.enum(["school", "college", "university", "masters"]),
  outputStyle: z.enum(["simple", "detailed", "academic", "humanized"]),
  wordCount: z.number().int().min(300).max(6000),
  title: z.string().max(200).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        mimeType: z.string(),
        dataUrl: z.string(), // data:mime;base64,....
      }),
    )
    .max(4)
    .optional(),
});

function systemPrompt(level: string, style: string, wc: number) {
  const styleMap: Record<string, string> = {
    simple: "Use short sentences and plain language. Explain like a student is reading it for the first time.",
    detailed: "Provide thorough, in-depth coverage with examples, subheadings and bullet points.",
    academic: "Use a formal academic register, cite sources, include references, structured sections.",
    humanized: "Write in a natural, human voice with slight imperfections, varied sentence rhythm, and no AI clichés.",
  };
  const levelMap: Record<string, string> = {
    school: "high-school level (roughly grade 9-12)",
    college: "college / undergraduate level",
    university: "university level with critical analysis",
    masters: "masters level with advanced synthesis and critique",
  };

  return `You are AssignAI, an expert assignment writer for students.

Rules:
- Answer EVERY question in the assignment fully.
- Format with clear headings (##), subheadings (###), bullet points, and proper paragraphs.
- Include a "References" section at the end when relevant using numbered citations.
- Target length: approximately ${wc} words. Do not go far under.
- Target level: ${levelMap[level] ?? level}.
- Writing style: ${styleMap[style] ?? style}
- Do NOT use AI clichés like "In today's fast-paced world", "It is important to note", "delve into".
- Return the answer in clean Markdown.`;
}

export const generateAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GenerateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { callLovableAI } = await import("./ai-gateway.server");
    const { supabase, userId } = context;

    // Create pending assignment row
    const title = data.title?.trim() || data.prompt.slice(0, 80);
    const { data: created, error: createErr } = await supabase
      .from("assignments")
      .insert({
        user_id: userId,
        title,
        prompt: data.prompt,
        education_level: data.educationLevel,
        output_style: data.outputStyle,
        word_count: data.wordCount,
        status: "generating",
      })
      .select("id")
      .single();
    if (createErr || !created) throw new Error(createErr?.message ?? "Could not create assignment");

    try {
      const userContent: Exclude<Parameters<typeof callLovableAI>[0]["messages"][number]["content"], string> = [
        { type: "text", text: data.prompt },
      ];
      for (const att of data.attachments ?? []) {
        if (att.mimeType.startsWith("image/")) {
          userContent.push({ type: "image_url", image_url: { url: att.dataUrl } });
        } else if (att.mimeType === "application/pdf") {
          userContent.push({
            type: "file",
            file: { filename: att.name, file_data: att.dataUrl },
          });
        }
      }

      const result = await callLovableAI({
        messages: [
          { role: "system", content: systemPrompt(data.educationLevel, data.outputStyle, data.wordCount) },
          { role: "user", content: userContent.length === 1 ? data.prompt : userContent },
        ],
      });

      const tokens = Math.ceil(result.length / 4);

      await supabase
        .from("assignments")
        .update({ result, status: "completed", tokens_used: tokens })
        .eq("id", created.id);

      // Best-effort token counter
      await supabase.rpc; // no-op to satisfy TS; use direct update below
      const { data: tokRow } = await supabase.from("tokens").select("used, balance").eq("user_id", userId).maybeSingle();
      if (tokRow) {
        await supabase
          .from("tokens")
          .update({ used: (tokRow.used ?? 0) + tokens, balance: Math.max(0, (tokRow.balance ?? 0) - tokens) })
          .eq("user_id", userId);
      }

      return { id: created.id, result };
    } catch (err) {
      await supabase.from("assignments").update({ status: "failed" }).eq("id", created.id);
      throw err;
    }
  });
