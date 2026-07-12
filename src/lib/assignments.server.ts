// Server-only helpers used by assignments.functions.ts
import { callLovableAI } from "./ai-gateway.server";
import type { SourceItem } from "./templates";

const URL_FETCH_TIMEOUT_MS = 8000;

export async function fetchUrlText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AssignAI/1.0 (+https://lovable.dev)" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") ?? "";
    if (!ct.includes("text") && !ct.includes("html") && !ct.includes("json")) return null;
    const raw = await resp.text();
    // Strip tags/scripts/styles crudely
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return null;
  }
}

export async function fetchAllUrlTexts(sources: SourceItem[]): Promise<Record<string, string>> {
  const urls = sources.filter((s): s is Extract<SourceItem, { kind: "url" }> => s.kind === "url").map((s) => s.url);
  const out: Record<string, string> = {};
  await Promise.all(
    urls.map(async (u) => {
      const text = await fetchUrlText(u);
      if (text) out[u] = text;
    }),
  );
  return out;
}

// Ask the model to analyse assignment text and return strict JSON.
export async function analyseAssignmentText(text: string, citationStyle: string): Promise<{
  grammar: {
    suggestions: Array<{ type: string; severity: "low" | "medium" | "high"; excerpt: string; suggestion: string }>;
    tone: string;
    readability: string;
  };
  scores: {
    structure: number;
    grammar: number;
    completeness: number;
    readability: number;
    citations: number;
    overall: number;
  };
}> {
  const raw = await callLovableAI({
    messages: [
      {
        role: "system",
        content: `You are an academic writing reviewer. Analyse the assignment supplied by the user.
Return ONLY compact JSON, no prose, no markdown fences. Shape:
{
  "grammar": {
    "suggestions": [ { "type": "grammar|spelling|style|clarity", "severity": "low|medium|high", "excerpt": "<=120 chars", "suggestion": "<=200 chars" } ],
    "tone": "one-sentence tone assessment",
    "readability": "one-sentence readability assessment (mention approximate grade level)"
  },
  "scores": {
    "structure": 0-100,
    "grammar": 0-100,
    "completeness": 0-100,
    "readability": 0-100,
    "citations": 0-100,
    "overall": 0-100
  }
}
Citation style expected: ${citationStyle}. If citation style is "none", score citations based on general source usage. Return at most 12 suggestions, most impactful first.`,
      },
      { role: "user", content: text.slice(0, 20000) },
    ],
    temperature: 0.2,
  });

  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  return parsed;
}

export async function chatAboutAssignment(opts: {
  assignmentText: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}): Promise<string> {
  const system = `You are AssignAI's writing assistant. The user is working on the assignment below. Help them refine it: expand or shorten sections, rewrite paragraphs, explain difficult concepts, answer follow-up questions. Keep replies focused and useful. Use Markdown.

--- ASSIGNMENT START ---
${opts.assignmentText.slice(0, 18000)}
--- ASSIGNMENT END ---`;

  return callLovableAI({
    messages: [
      { role: "system", content: system },
      ...opts.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: opts.userMessage },
    ],
    temperature: 0.7,
  });
}
