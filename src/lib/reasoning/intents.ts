// Question-intent profiles. Each detected question is classified into ONE
// intent; that intent's guidance is appended to the composed system prompt
// alongside the selected subject profile.

import type { IntentProfile, IntentId } from "./types";

export const INTENT_PROFILES: IntentProfile[] = [
  {
    id: "define",
    label: "Define",
    match: /^\s*(define|what\s+is|what\s+are|meaning\s+of|state\s+the\s+definition)\b/i,
    guidance:
      "INTENT — DEFINE: Give the formal definition in one crisp sentence, then unpack it in 2–3 sentences of plain student English, then give one short concrete example. Do not derive or evaluate.",
  },
  {
    id: "explain",
    label: "Explain",
    match: /^\s*(explain|describe|elaborate|how\s+does|why\s+does|discuss\s+how)\b/i,
    guidance:
      "INTENT — EXPLAIN: Open with a one-sentence answer to what/why, then build understanding in flowing paragraphs: mechanism → key terms → a small illustrative example. End with one line linking it back to the bigger picture.",
  },
  {
    id: "compare",
    label: "Compare",
    match: /^\s*(compare|contrast)\b/i,
    guidance:
      "INTENT — COMPARE: Lead with a one-sentence framing of what is being compared and on what axes. Then a Markdown table with the two/three items as columns and the axes as rows. Close with a short paragraph on which is preferable in which context.",
  },
  {
    id: "differentiate",
    label: "Differentiate",
    match: /^\s*(differentiate|distinguish|difference\s+between)\b/i,
    guidance:
      "INTENT — DIFFERENTIATE: Markdown table with the items as columns and 4–6 discriminating criteria as rows (definition, purpose, key feature, example, limitation). Add a one-line summary of the single most important difference.",
  },
  {
    id: "derive",
    label: "Derive",
    match: /\bderive|derivation\b/i,
    guidance:
      "INTENT — DERIVE: Start from stated assumptions / first principles, name each law or identity as you invoke it, and show each algebraic step on its own line in display math (\`$$ ... $$\`). Box or bold the final result and add one sentence on its physical / mathematical meaning.",
  },
  {
    id: "prove",
    label: "Prove",
    match: /\bprove|show\s+that|verify\s+that|hence\s+show\b/i,
    guidance:
      "INTENT — PROVE: State the claim clearly. Choose the proof technique explicitly (direct, contradiction, induction, contrapositive). Show every logical step with justifications in words. End with a Q.E.D. line or a clear \"which was to be shown\".",
  },
  {
    id: "calculate",
    label: "Calculate",
    match: /\bcalculate|compute|find\s+the\s+value|evaluate\s+the\s+integral|determine\b/i,
    guidance:
      "INTENT — CALCULATE: List given data with units, name the formula, substitute numbers in display math, carry units through every line, and finish with the final answer bolded and its unit. Add one sentence interpreting the number.",
  },
  {
    id: "solve",
    label: "Solve",
    match: /\bsolve\b/i,
    guidance:
      "INTENT — SOLVE: Restate the problem in your own words in one line. Choose a method and say why in one sentence. Work through step by step with reasoning between steps, not just symbols. State the solution set clearly at the end.",
  },
  {
    id: "design",
    label: "Design",
    match: /\bdesign\b/i,
    guidance:
      "INTENT — DESIGN: Requirements → constraints → design choice with a one-line justification → the design itself (circuit, schema, algorithm, plan) → a short verification that it meets the requirements.",
  },
  {
    id: "draw",
    label: "Draw",
    match: /\b(draw|sketch|construct|plot)\b/i,
    guidance:
      "INTENT — DRAW: Produce the diagram as Mermaid where possible (flowchart / stateDiagram / sequenceDiagram / gate-level flowchart) or as a labelled Markdown table for truth tables / K-maps. Below the diagram add 2–3 sentences describing what each labelled part does.",
  },
  {
    id: "implement",
    label: "Implement",
    match: /\b(implement|write\s+a\s+program|code\s+for|write\s+code|write\s+a\s+function)\b/i,
    guidance:
      "INTENT — IMPLEMENT: Restate the problem, outline the approach in one short paragraph, give a fenced code block in the correct language with clear names and comments only where non-obvious, then a dry-run / sample I/O, then a one-line time & space complexity note.",
  },
  {
    id: "analyze",
    label: "Analyze",
    match: /\banaly[sz]e|analysis\s+of\b/i,
    guidance:
      "INTENT — ANALYZE: Break the subject into its parts, examine each part with evidence, then synthesise back to what the analysis reveals overall. Use paragraphs; use a small table only if the analysis is inherently multi-dimensional.",
  },
  {
    id: "evaluate",
    label: "Evaluate",
    match: /\bevaluate|assess|critically\s+examine|judge\b/i,
    guidance:
      "INTENT — EVALUATE: Weigh strengths against weaknesses using explicit criteria. Present both sides fairly, then take a clear position in the final paragraph and justify it.",
  },
  {
    id: "case_study",
    label: "Case Study",
    match: /\bcase\s+study\b/i,
    guidance:
      "INTENT — CASE STUDY: Background → key issues → analysis using a named framework where relevant (e.g. SWOT, PESTLE, Porter, IRAC) → options → recommendation with reasoning.",
  },
  {
    id: "discuss",
    label: "Discuss",
    match: /\bdiscuss\b/i,
    guidance:
      "INTENT — DISCUSS: Present multiple perspectives in flowing paragraphs, engage with counter-arguments, and close with a balanced conclusion that reflects your own view.",
  },
];

// Fallback used when no matcher fires.
const DEFAULT_INTENT: IntentProfile = {
  id: "explain",
  label: "Explain",
  match: /.^/,
  guidance:
    "INTENT — GENERAL: Restate the question in your own words, answer it directly, and support the answer with reasoning and one concrete example.",
};

export function detectIntent(question: string): IntentProfile {
  const q = question.trim();
  for (const p of INTENT_PROFILES) {
    if (p.match.test(q)) return p;
  }
  return DEFAULT_INTENT;
}

export function intentGuidanceForQuestions(
  questions: string[],
): { id: IntentId; label: string; guidance: string }[] {
  const seen = new Map<IntentId, { id: IntentId; label: string; guidance: string }>();
  for (const q of questions) {
    const p = detectIntent(q);
    if (!seen.has(p.id)) seen.set(p.id, { id: p.id, label: p.label, guidance: p.guidance });
  }
  return Array.from(seen.values());
}
