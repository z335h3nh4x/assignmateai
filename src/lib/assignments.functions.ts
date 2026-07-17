import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pdf"), name: z.string(), dataUrl: z.string() }),
  z.object({ kind: z.literal("docx"), name: z.string(), text: z.string() }),
  z.object({ kind: z.literal("url"), url: z.string().url() }),
  z.object({ kind: z.literal("text"), label: z.string().optional(), text: z.string() }),
]);

const AttachmentSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  dataUrl: z.string(),
});

const GenerateInput = z.object({
  prompt: z.string().max(30000).optional().default(""),
  educationLevel: z.enum(["school", "college", "university", "masters"]),
  outputStyle: z.enum(["simple", "detailed", "academic", "humanized"]),
  wordCount: z.number().int().min(300).max(6000),
  title: z.string().max(200).optional(),
  subject: z.string().max(200).optional(),
  detectedQuestions: z.array(z.string().max(4000)).max(30).optional(),
  template: z.enum(["essay", "case_study", "lab_report", "research_paper", "presentation", "business_report"]).default("essay"),
  citationStyle: z.enum(["none", "apa7", "mla9", "harvard", "chicago", "ieee"]).default("none"),
  sources: z.array(SourceSchema).max(8).default([]),
  attachments: z.array(AttachmentSchema).max(6).optional(),
});

export const generateAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GenerateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { callLovableAI } = await import("./ai-gateway.server");
    const { templatePrompt, citationPrompt, summariseSourcesForPrompt } = await import("./templates");
    const { fetchAllUrlTexts } = await import("./assignments.server");
    const { supabase, userId } = context;

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

    const fetchedUrlText = await fetchAllUrlTexts(data.sources);
    const sourcesBlock = summariseSourcesForPrompt(data.sources, fetchedUrlText);

    const hasAttachments = (data.attachments?.length ?? 0) > 0;
    const questions = (data.detectedQuestions ?? []).filter((q) => q.trim().length > 0);
    const hasQuestions = questions.length > 0;
    const userPrompt = data.prompt?.trim() ?? "";

    if (!hasAttachments && !hasQuestions && userPrompt.length < 3) {
      throw new Error("Upload an assignment file or enter a prompt to continue.");
    }

    const questionsBlock = hasQuestions
      ? `\n\nThe student wants you to answer ONLY the following question(s) detected from their assignment. Answer each one separately with its own heading. Do not skip any.\n\n${questions
          .map((q, i) => `Question ${i + 1}: ${q}`)
          .join("\n\n")}`
      : "";

    const primarySourceRule = hasAttachments
      ? `\nPRIMARY SOURCE: The uploaded file(s) attached in this message ARE the assignment. Read them carefully (including OCR of any images / handwritten pages). Extract the actual questions and answer them. Do NOT summarise or rewrite the uploaded assignment — solve it.`
      : "";

    const systemPrompt = `You are AssignAI, an expert assignment writer for students.

Rules:
- Answer EVERY question in the assignment fully and individually.
- Format with clear headings (##) per question, subheadings (###), bullet points, and proper paragraphs.
- Target length: approximately ${data.wordCount} words total. Do not go far under.
- Target level: ${levelMap[data.educationLevel]}.
- Writing style: ${styleMap[data.outputStyle]}
- Do NOT use AI clichés like "In today's fast-paced world", "It is important to note", "delve into".
- Never summarise, quote back, or restate the uploaded assignment. Produce the SOLUTION.
- Include equations (in LaTeX-style \`$...$\` or plain text) and simple ASCII/described diagrams where the subject requires them.
- Return the answer in clean Markdown.
${primarySourceRule}

Document structure:
${templatePrompt(data.template)}

Citations:
${citationPrompt(data.citationStyle)}
${sourcesBlock ? `\n${sourcesBlock}` : ""}${questionsBlock}`;

    const detectedTitle = data.title?.trim();
    const subjectPrefix = data.subject?.trim();
    // Never let a generic instruction prompt become the assignment title.
    const GENERIC_PROMPT_RE = /^(please\s+)?(solve|complete|do|finish|answer|write|help( me)?( with)?)( this| it| the assignment| my assignment)?[.!?]*$/i;
    const looksGeneric = (s: string) => !s || s.length < 8 || GENERIC_PROMPT_RE.test(s.trim());
    const titleFromFile = (name?: string) =>
      name ? name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() : "";
    const firstAttachmentTitle = titleFromFile(data.attachments?.[0]?.name);
    const firstQuestionTitle = questions[0]
      ? questions[0].replace(/^[\s\d.)]+/, "").split(/[.?\n]/)[0].slice(0, 70).trim()
      : "";
    let title: string;
    if (detectedTitle) {
      title = subjectPrefix && !detectedTitle.toLowerCase().includes(subjectPrefix.toLowerCase())
        ? `${subjectPrefix} — ${detectedTitle}`
        : detectedTitle;
    } else if (subjectPrefix) {
      title = `${subjectPrefix} Assignment`;
    } else if (!looksGeneric(userPrompt)) {
      title = userPrompt.slice(0, 80);
    } else if (firstAttachmentTitle && !/^(assignment|scan|img|image|doc|document|untitled|new)\b/i.test(firstAttachmentTitle)) {
      title = firstAttachmentTitle;
    } else if (firstQuestionTitle) {
      title = firstQuestionTitle;
    } else {
      title = "Assignment";
    }

    const { data: created, error: createErr } = await supabase
      .from("assignments")
      .insert({
        user_id: userId,
        title,
        prompt: userPrompt || (hasQuestions ? questions.join("\n\n") : "[uploaded assignment]"),
        education_level: data.educationLevel,
        output_style: data.outputStyle,
        word_count: data.wordCount,
        template: data.template,
        citation_style: data.citationStyle,
        sources: data.sources,
        status: "generating",
      })
      .select("id")
      .single();
    if (createErr || !created) throw new Error(createErr?.message ?? "Could not create assignment");

    try {
      const instructionText = hasAttachments
        ? `Read the attached assignment file(s) carefully and solve every question found in them.${
            userPrompt ? `\n\nExtra instructions from the student: ${userPrompt}` : ""
          }`
        : hasQuestions
          ? `Solve the detected questions listed in the system prompt.${userPrompt ? `\n\nExtra notes: ${userPrompt}` : ""}`
          : userPrompt;

      const userContent: Exclude<Parameters<typeof callLovableAI>[0]["messages"][number]["content"], string> = [
        { type: "text", text: instructionText },
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
      // Also attach any PDF sources
      for (const s of data.sources) {
        if (s.kind === "pdf") {
          userContent.push({
            type: "file",
            file: { filename: s.name, file_data: s.dataUrl },
          });
        }
      }

      const result = await callLovableAI({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent.length === 1 ? instructionText : userContent },
        ],
      });

      const tokens = Math.ceil(result.length / 4);

      await supabase
        .from("assignments")
        .update({ result, status: "completed", tokens_used: tokens })
        .eq("id", created.id);

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

// ---------- Autosave ----------
export const saveAssignmentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), result: z.string().max(200000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("assignments")
      .update({ result: data.result })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Increment export counter ----------
export const incrementExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("assignments")
      .select("exports_count")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    const next = (row?.exports_count ?? 0) + 1;
    await context.supabase
      .from("assignments")
      .update({ exports_count: next })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { exports_count: next };
  });

// ---------- Chat about assignment ----------
export const chatWithAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ assignmentId: z.string().uuid(), message: z.string().min(1).max(4000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { chatAboutAssignment } = await import("./assignments.server");
    const { supabase, userId } = context;

    const { data: assignment, error: aErr } = await supabase
      .from("assignments")
      .select("id, result, user_id")
      .eq("id", data.assignmentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (aErr || !assignment) throw new Error("Assignment not found");
    if (!assignment.result) throw new Error("Assignment has no content yet");

    const { data: prior, error: pErr } = await supabase
      .from("assignment_messages")
      .select("role, content")
      .eq("assignment_id", data.assignmentId)
      .order("created_at", { ascending: true });
    if (pErr) throw new Error(pErr.message);

    // Persist user message first
    const { error: uErr } = await supabase.from("assignment_messages").insert({
      assignment_id: data.assignmentId,
      user_id: userId,
      role: "user",
      content: data.message,
    });
    if (uErr) throw new Error(uErr.message);

    const history = (prior ?? []).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    const reply = await chatAboutAssignment({
      assignmentText: assignment.result,
      history,
      userMessage: data.message,
    });

    const { error: rErr } = await supabase.from("assignment_messages").insert({
      assignment_id: data.assignmentId,
      user_id: userId,
      role: "assistant",
      content: reply,
    });
    if (rErr) throw new Error(rErr.message);

    return { reply };
  });

// ---------- Analyse assignment (grammar + quality) ----------
export const analyzeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { analyseAssignmentText } = await import("./assignments.server");
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("assignments")
      .select("result, citation_style")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !row) throw new Error("Assignment not found");
    if (!row.result) throw new Error("Assignment is empty");

    const analysis = await analyseAssignmentText(row.result, row.citation_style ?? "none");

    const { error: uErr } = await supabase
      .from("assignments")
      .update({
        grammar_report: analysis.grammar,
        quality_score: analysis.scores,
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (uErr) throw new Error(uErr.message);

    return analysis;
  });

// ---------- Dashboard stats ----------
export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("assignments")
      .select("id, title, created_at, word_count, exports_count, quality_score, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    let totalWords = 0;
    let exports = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    for (const r of list) {
      if (r.status === "completed") totalWords += r.word_count ?? 0;
      exports += r.exports_count ?? 0;
      const qs = r.quality_score as { overall?: number } | null;
      if (qs && typeof qs.overall === "number") {
        scoreSum += qs.overall;
        scoreCount++;
      }
    }
    return {
      total: list.length,
      totalWords,
      exports,
      avgScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
      recent: list.slice(0, 5).map((r) => ({
        id: r.id,
        title: r.title,
        created_at: r.created_at,
        status: r.status,
      })),
    };
  });

// ---------- Analyse uploaded assignment files ----------
const AnalyzeInput = z.object({
  attachments: z.array(AttachmentSchema).min(1).max(6),
  extraText: z.string().max(20000).optional(),
});

export const analyzeUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data }) => {
    const { callLovableAI } = await import("./ai-gateway.server");

    const userContent: Exclude<Parameters<typeof callLovableAI>[0]["messages"][number]["content"], string> = [
      {
        type: "text",
        text: `Analyse the attached student assignment file(s). Perform OCR on any images or handwritten pages. Detect:
- The assignment title (short, e.g. "Free and Forced Oscillations")
- The subject / course (e.g. "Engineering Physics")
- Every distinct question in the assignment, preserving their original numbering when present
- Whether the assignment is handwritten

Return ONLY compact JSON, no markdown fences. Shape:
{
  "title": "string (short, may be empty)",
  "subject": "string (may be empty)",
  "handwritten": true|false,
  "questions": ["full text of question 1", "full text of question 2", ...]
}
If you can only find one question, return it as a single-item array. Never invent questions that are not in the document.${
          data.extraText ? `\n\nAdditional pasted text from the student:\n${data.extraText.slice(0, 8000)}` : ""
        }`,
      },
    ];
    for (const att of data.attachments) {
      if (att.mimeType.startsWith("image/")) {
        userContent.push({ type: "image_url", image_url: { url: att.dataUrl } });
      } else if (att.mimeType === "application/pdf") {
        userContent.push({ type: "file", file: { filename: att.name, file_data: att.dataUrl } });
      }
    }

    const raw = await callLovableAI({
      messages: [
        { role: "system", content: "You are an assignment analyser. Reply with strict JSON only." },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
    });

    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    let parsed: { title?: string; subject?: string; handwritten?: boolean; questions?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Could not analyse the uploaded file. Please try again.");
    }
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 30)
      : [];
    return {
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      subject: typeof parsed.subject === "string" ? parsed.subject.trim() : "",
      handwritten: Boolean(parsed.handwritten),
      questions,
    };
  });
