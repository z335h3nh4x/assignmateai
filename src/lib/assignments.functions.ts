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
  subjectDomain: z.string().max(80).optional(),
  detectedQuestions: z.array(z.string().max(4000)).max(30).optional(),
  detectedInstructions: z.string().max(4000).optional(),
  detectedMarks: z.array(z.object({ q: z.string().max(80), marks: z.string().max(40) })).max(30).optional(),
  requiresDiagrams: z.boolean().optional(),
  template: z.enum(["essay", "case_study", "lab_report", "research_paper", "presentation", "business_report"]).default("essay"),
  citationStyle: z.enum(["none", "apa7", "mla9", "harvard", "chicago", "ieee"]).default("none"),
  sources: z.array(SourceSchema).max(8).default([]),
  attachments: z.array(AttachmentSchema).max(6).optional(),
  regenerateOf: z.string().uuid().optional(),
});


export const generateAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GenerateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { callLovableAI } = await import("./ai-gateway.server");
    const { templatePrompt, citationPrompt, summariseSourcesForPrompt } = await import("./templates");
    const { fetchAllUrlTexts } = await import("./assignments.server");
    const { composeReasoning } = await import("./reasoning");
    const { humanizeChunk } = await import("./reasoning/humanize");
    const {
      assertFeature, assertUploadLimits, reserveAssignmentSlot, refundAssignmentSlot,
    } = await import("./entitlements.server");
    const { supabase, userId } = context;

    // ---- Centralized entitlement enforcement (feature access) ----
    const hasImageAttachments = (data.attachments ?? []).some((a) => a.mimeType.startsWith("image/"));
    if (data.outputStyle === "humanized") await assertFeature(userId, "humanized_writing");
    if (hasImageAttachments) await assertFeature(userId, "ocr");
    if (data.citationStyle && data.citationStyle !== "none") await assertFeature(userId, "citation_generator");
    if (data.template && data.template !== "essay") await assertFeature(userId, "premium_templates");

    // ---- Regeneration limit enforcement (plan-based, backend authoritative) ----
    const { maxRegenerationsForPlan } = await import("./regeneration-limits");
    const { getEntitlements } = await import("./entitlements.server");
    const planSlug = (await getEntitlements(userId)).plan.slug;
    let regenerationCount = 0;
    let maxRegenerations = maxRegenerationsForPlan(planSlug);

    if (data.regenerateOf) {
      const { data: parent, error: parentErr } = await supabase
        .from("assignments")
        .select("id, regeneration_count, max_regenerations")
        .eq("id", data.regenerateOf)
        .maybeSingle();
      if (parentErr || !parent) throw new Error("Original assignment not found");
      const used = parent.regeneration_count ?? 0;
      const cap = parent.max_regenerations ?? maxRegenerations;
      if (used >= cap) {
        throw new Error("Regeneration limit reached.");
      }
      regenerationCount = used + 1;
      maxRegenerations = cap;
      await supabase
        .from("assignments")
        .update({ regeneration_count: regenerationCount })
        .eq("id", parent.id);
    }

    // ---- Upload size / page limits ----
    const uploadItems = [
      ...(data.attachments ?? []).map((a) => ({ name: a.name, mimeType: a.mimeType, dataUrl: a.dataUrl })),
      ...data.sources.filter((s): s is Extract<typeof data.sources[number], { kind: "pdf" }> => s.kind === "pdf")
        .map((s) => ({ name: s.name, mimeType: "application/pdf", dataUrl: s.dataUrl })),
    ];
    if (uploadItems.length > 0) await assertUploadLimits(userId, uploadItems);

    // ---- Atomic quota reservation (monthly / credits) ----
    // Credit cost is a coarse pre-estimate; a hard cap prevents runaway usage.
    const estimatedCredits = Math.max(50, Math.min(20000, Math.round(data.wordCount * 1.2)));
    await reserveAssignmentSlot(userId, estimatedCredits);
    let slotReserved = true;



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
      ? `\nPRIMARY SOURCE OF TRUTH: The uploaded file(s) attached in this message ARE the assignment. Read them carefully (including OCR of any images / handwritten pages). Extract the actual questions and answer them. If any hint in the user's typed prompt conflicts with the uploaded file, TRUST THE UPLOADED FILE — the file wins.`
      : "";

    // Compose reasoning: GLOBAL RULES + SUBJECT profile + per-question INTENT profiles.
    const reasoning = composeReasoning({
      subjectDomain: data.subjectDomain,
      questions,
    });

    const instructionsBlock = data.detectedInstructions
      ? `\n\nTeacher's instructions detected in the file (must be followed exactly):\n${data.detectedInstructions}`
      : "";
    const marksBlock = (data.detectedMarks?.length ?? 0) > 0
      ? `\n\nMarks per question (scale the depth of each answer proportionally):\n${data
          .detectedMarks!.map((m) => `- ${m.q}: ${m.marks}`)
          .join("\n")}`
      : "";
    const diagramsBlock = data.requiresDiagrams
      ? `\n\nThe assignment explicitly asks for diagrams/figures — include them (Mermaid flowcharts, labelled sketches described in words, or K-map tables) wherever the question requires.`
      : "";

    const levelLine = `Write at ${levelMap[data.educationLevel]}. Output-style preference: ${styleMap[data.outputStyle]}`;
    const targetLine = `Target roughly ${data.wordCount} words in total across all answers.`;

    const systemPrompt = `${reasoning.systemBlock}

${levelLine}
${targetLine}
${primarySourceRule}

Document structure guidance (apply loosely — do not let it override the student-voice rules above):
${templatePrompt(data.template)}

Citations:
${citationPrompt(data.citationStyle)}
${sourcesBlock ? `\n${sourcesBlock}` : ""}${instructionsBlock}${marksBlock}${diagramsBlock}${questionsBlock}`;



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

    // ---------- Build shared attachments payload (files are always primary source) ----------
    type UserContent = Exclude<Parameters<typeof callLovableAI>[0]["messages"][number]["content"], string>;
    const attachmentParts: UserContent = [];
    for (const att of data.attachments ?? []) {
      if (att.mimeType.startsWith("image/")) {
        attachmentParts.push({ type: "image_url", image_url: { url: att.dataUrl } });
      } else if (att.mimeType === "application/pdf") {
        attachmentParts.push({ type: "file", file: { filename: att.name, file_data: att.dataUrl } });
      }
    }
    for (const s of data.sources) {
      if (s.kind === "pdf") {
        attachmentParts.push({ type: "file", file: { filename: s.name, file_data: s.dataUrl } });
      }
    }

    // ---------- Per-question status tracker ----------
    type QStatus = {
      id: string;
      text: string;
      status: "pending" | "completed" | "failed";
      attempts: number;
      answer?: string;
      error?: string;
    };
    const initialStatuses: QStatus[] = hasQuestions
      ? questions.map((q, i) => ({ id: `Q${i + 1}`, text: q, status: "pending", attempts: 0 }))
      : [];

    console.log("[generateAssignment] detected questions:", initialStatuses.length, initialStatuses.map((q) => q.id));

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
        question_statuses: initialStatuses.length ? initialStatuses : null,
        regeneration_count: regenerationCount,
        max_regenerations: maxRegenerations,
      })
      .select("id")
      .single();
    if (createErr || !created) throw new Error(createErr?.message ?? "Could not create assignment");

    async function persistStatuses(list: QStatus[]) {
      await supabase
        .from("assignments")
        .update({ question_statuses: list })
        .eq("id", created!.id);
    }

    async function generateOneQuestion(q: QStatus, perQuestionWords: number): Promise<string> {
      const perQuestionSystem = `${systemPrompt}

STRICT SCOPE: Answer ONLY the single question below. Do not answer other questions from the assignment. Do not repeat other answers. Begin the response with a heading exactly like: "## ${q.id}: <short question title>". Aim for roughly ${perQuestionWords} words.

QUESTION (${q.id}):
${q.text}`;

      const instructionText = hasAttachments
        ? `Solve ONLY ${q.id} from the attached assignment file(s). The exact question text is:\n\n${q.text}${userPrompt ? `\n\nExtra instructions from the student: ${userPrompt}` : ""}`
        : `Solve ONLY ${q.id}:\n\n${q.text}${userPrompt ? `\n\nExtra notes: ${userPrompt}` : ""}`;

      const userContent: UserContent = [{ type: "text", text: instructionText }, ...attachmentParts];

      return await callLovableAI({
        messages: [
          { role: "system", content: perQuestionSystem },
          { role: "user", content: userContent.length === 1 ? instructionText : userContent },
        ],
      });
    }

    async function generateSingleShot(): Promise<string> {
      const instructionText = hasAttachments
        ? `Read the attached assignment file(s) carefully and solve every question found in them.${
            userPrompt ? `\n\nExtra instructions from the student: ${userPrompt}` : ""
          }`
        : userPrompt;
      const userContent: UserContent = [{ type: "text", text: instructionText }, ...attachmentParts];
      return await callLovableAI({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent.length === 1 ? instructionText : userContent },
        ],
      });
    }

    try {
      let finalResult = "";
      let missingIds: string[] = [];
      const statuses = initialStatuses.map((s) => ({ ...s }));

      if (initialStatuses.length === 0) {
        // No detected questions -> single-shot path (legacy behaviour).
        const raw = await generateSingleShot();
        finalResult = await humanizeChunk(raw, {
          subjectDomain: data.subjectDomain,
          wordCount: data.wordCount,
          educationLevel: data.educationLevel,
        });
      } else {
        const perQuestionWords = Math.max(150, Math.floor(data.wordCount / statuses.length));
        // 1 initial attempt + 3 retries with exponential backoff.
        const MAX_ATTEMPTS = 4;
        const BACKOFF_MS = [0, 750, 2000, 5000];
        const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const targets = statuses.filter((s) => s.status !== "completed");
          if (targets.length === 0) break;

          const delay = BACKOFF_MS[attempt - 1] ?? 5000;
          if (delay > 0) {
            console.log(`[generateAssignment] backoff ${delay}ms before retry attempt ${attempt}`);
            await sleep(delay);
          }
          console.log(`[generateAssignment] attempt ${attempt}: generating`, targets.map((t) => t.id));

          for (const q of targets) {
            q.attempts += 1;
            try {
              const answer = await generateOneQuestion(q, perQuestionWords);
              if (!answer || answer.trim().length < 20) {
                throw new Error("Empty or too-short answer returned");
              }
              q.answer = answer.trim();
              q.status = "completed";
              q.error = undefined;
              console.log(`[generateAssignment] ${q.id} completed on attempt ${q.attempts}`);
            } catch (e) {
              q.status = "failed";
              q.error = e instanceof Error ? e.message : String(e);
              console.warn(`[generateAssignment] ${q.id} failed on attempt ${q.attempts}:`, q.error);
            }
            await persistStatuses(statuses);
          }
        }

        missingIds = statuses.filter((s) => s.status !== "completed").map((s) => s.id);

        // Human Writing Engine — polish each completed answer individually so
        // headings and question boundaries stay intact. Successful answers are
        // preserved even if some questions ultimately failed, so the user can
        // recover them.
        const humanized: string[] = [];
        for (const s of statuses) {
          if (s.status === "completed" && s.answer) {
            const polished = await humanizeChunk(s.answer, {
              subjectDomain: data.subjectDomain,
              wordCount: perQuestionWords,
              educationLevel: data.educationLevel,
            });
            humanized.push(polished.trim());
          }
        }
        finalResult = humanized.join("\n\n---\n\n");

        console.log("[generateAssignment] validation:", {
          detected: statuses.length,
          completed: statuses.length - missingIds.length,
          missing: missingIds,
        });

        await persistStatuses(statuses);

        // Never silently return a partial assignment. Preserve successful
        // answers on the row so the user can see what worked, mark the
        // assignment failed, and surface a clear error.
        if (missingIds.length > 0) {
          await supabase
            .from("assignments")
            .update({ result: finalResult || null, status: "failed" })
            .eq("id", created.id);
          throw new Error(
            `Could not generate ${missingIds.length} of ${statuses.length} question(s) (${missingIds.join(", ")}) after ${MAX_ATTEMPTS} attempts. The successful answers were saved to this assignment — please retry to complete the remaining question(s).`,
          );
        }
      }

      const tokens = Math.ceil(finalResult.length / 4);

      await supabase
        .from("assignments")
        .update({ result: finalResult, status: "completed", tokens_used: tokens })
        .eq("id", created.id);

      const { data: tokRow } = await supabase.from("tokens").select("used, balance").eq("user_id", userId).maybeSingle();
      if (tokRow) {
        await supabase
          .from("tokens")
          .update({ used: (tokRow.used ?? 0) + tokens, balance: Math.max(0, (tokRow.balance ?? 0) - tokens) })
          .eq("user_id", userId);
      }

      slotReserved = false; // committed — usage stays consumed
      return { id: created.id, result: finalResult, status: "completed" as const, missing: [] as string[] };
    } catch (err) {
      // If we already marked the row failed above (partial-recovery path), keep
      // the preserved result. Otherwise wipe status to failed here.
      const { data: row } = await supabase.from("assignments").select("status").eq("id", created.id).maybeSingle();
      if (row?.status !== "failed") {
        await supabase.from("assignments").update({ status: "failed" }).eq("id", created.id);
      }
      // Refund the reserved quota slot so the user isn't charged for a failure.
      if (slotReserved) {
        try { await refundAssignmentSlot(userId, estimatedCredits); } catch (_) { /* best-effort */ }
        slotReserved = false;
      }
      throw err;
    }
  });


// ---------- Autosave ----------
export const saveAssignmentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      id: z.string().uuid(),
      result: z.string().max(200000).optional(),
      title: z.string().trim().min(1).max(200).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: { result?: string; title?: string } = {};
    if (typeof data.result === "string") patch.result = data.result;
    if (typeof data.title === "string") patch.title = data.title;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("assignments")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ---------- Consume one export slot (atomic, server-enforced) ----------
export const incrementExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { MAX_EXPORTS_PER_ASSIGNMENT } = await import("./export-limits");
    const { data: res, error } = await context.supabase.rpc("consume_export_slot", {
      _assignment_id: data.id,
      _max_exports: MAX_EXPORTS_PER_ASSIGNMENT,
    });
    if (error) throw new Error(error.message);
    const parsed = res as unknown as { allowed: boolean; exports_count: number; max: number };
    if (!parsed?.allowed) {
      throw new Error(
        `Export limit reached — you've used all ${MAX_EXPORTS_PER_ASSIGNMENT} exports for this assignment.`,
      );
    }
    return {
      exports_count: parsed.exports_count,
      max: MAX_EXPORTS_PER_ASSIGNMENT,
      remaining: Math.max(0, MAX_EXPORTS_PER_ASSIGNMENT - parsed.exports_count),
    };
  });

// ---------- Chat about assignment ----------
export const chatWithAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ assignmentId: z.string().uuid(), message: z.string().min(1).max(4000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { chatAboutAssignment } = await import("./assignments.server");
    const { assertFeature } = await import("./entitlements.server");
    const { supabase, userId } = context;
    await assertFeature(userId, "ai_chat");

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
    const { assertFeature } = await import("./entitlements.server");
    const { supabase, userId } = context;
    await assertFeature(userId, "grammar_checker");

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
  .handler(async ({ data, context }) => {
    const { callLovableAI } = await import("./ai-gateway.server");
    const { assertFeature, assertUploadLimits } = await import("./entitlements.server");
    // Analysing an uploaded image / PDF uses OCR/multimodal — gate it.
    if (data.attachments.some((a) => a.mimeType.startsWith("image/") || a.mimeType === "application/pdf")) {
      await assertFeature(context.userId, "ocr");
    }
    // Enforce plan upload limits even for the analyse step.
    await assertUploadLimits(context.userId, data.attachments);


    const userContent: Exclude<Parameters<typeof callLovableAI>[0]["messages"][number]["content"], string> = [
      {
        type: "text",
        text: `Analyse the attached student assignment file(s). Perform OCR on any images / handwritten pages. Detect thoroughly:
- The assignment title (short, e.g. "Free and Forced Oscillations")
- The specific subject / course as written on the paper (e.g. "Engineering Physics", "DBMS Lab")
- The broad subject DOMAIN in ONE of these canonical labels so downstream can adapt writing style:
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Electronics", "Electrical Engineering",
  "Mechanical Engineering", "Civil Engineering", "English / Literature", "Business / Management", "Economics",
  "Law", "History", "Geography", "Humanities / Social Science", "Other"
- Every distinct question in the assignment, preserving their original numbering (Q1, Q2, 1(a), 1(b) …) when present.
- Any general instructions the teacher wrote at the top (e.g. "Answer any 5", "Show all working", "Submit handwritten").
- Marks per question if written (e.g. "Q1: 5 marks", "Q2(a): 10").
- Whether the assignment explicitly requires diagrams / figures / circuits / flowcharts.
- Whether the assignment is handwritten.
- The teacher-suggested total word count / page count if mentioned (else null).

Return ONLY compact JSON, no markdown fences. Shape:
{
  "title": "string (short, may be empty)",
  "subject": "string (may be empty)",
  "subjectDomain": "one canonical label from the list above (may be empty)",
  "handwritten": true|false,
  "requiresDiagrams": true|false,
  "instructions": "string of teacher's general instructions, may be empty",
  "wordCountSuggested": number|null,
  "marks": [{ "q": "Q1", "marks": "5" }, ...],
  "questions": ["full text of question 1", "full text of question 2", ...]
}
Never invent questions, marks, or instructions that are not in the document. Return empty strings / empty arrays / null when a field is not present.${
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
    let parsed: {
      title?: string;
      subject?: string;
      subjectDomain?: string;
      handwritten?: boolean;
      requiresDiagrams?: boolean;
      instructions?: string;
      wordCountSuggested?: number | null;
      marks?: unknown;
      questions?: unknown;
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Could not analyse the uploaded file. Please try again.");
    }
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 30)
      : [];
    const marks = Array.isArray(parsed.marks)
      ? (parsed.marks as unknown[])
          .map((m) => (m && typeof m === "object" ? (m as { q?: unknown; marks?: unknown }) : null))
          .filter((m): m is { q?: unknown; marks?: unknown } => !!m)
          .map((m) => ({
            q: typeof m.q === "string" ? m.q.trim().slice(0, 80) : "",
            marks: typeof m.marks === "string" ? m.marks.trim().slice(0, 40) : String(m.marks ?? "").slice(0, 40),
          }))
          .filter((m) => m.q.length > 0)
          .slice(0, 30)
      : [];
    return {
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      subject: typeof parsed.subject === "string" ? parsed.subject.trim() : "",
      subjectDomain: typeof parsed.subjectDomain === "string" ? parsed.subjectDomain.trim() : "",
      handwritten: Boolean(parsed.handwritten),
      requiresDiagrams: Boolean(parsed.requiresDiagrams),
      instructions: typeof parsed.instructions === "string" ? parsed.instructions.trim().slice(0, 4000) : "",
      wordCountSuggested:
        typeof parsed.wordCountSuggested === "number" && parsed.wordCountSuggested > 0
          ? Math.min(6000, Math.round(parsed.wordCountSuggested))
          : null,
      marks,
      questions,
    };
  });

