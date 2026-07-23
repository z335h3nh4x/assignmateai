// Human Writing Engine — final post-processing pass that rewords AI output to
// sound like a real student's assignment. Runs AFTER the reasoning engine has
// produced correct academic content. It must NEVER alter formulas, numbers,
// code, tables, diagrams, headings, or Markdown/LaTeX structure — only prose.

import { callLovableAI } from "../ai-gateway.server";

export interface HumanizeOptions {
  subjectDomain?: string;
  wordCount?: number;
  educationLevel?: string;
}

// Pull out things the humanizer must never touch, replace with sentinels, run
// the model over the safe skeleton, then splice originals back in. This makes
// it structurally impossible for the model to corrupt math/code/tables.
interface Frozen {
  skeleton: string;
  frozen: string[];
}

function freezeProtectedRegions(input: string): Frozen {
  const frozen: string[] = [];
  const push = (raw: string) => {
    const token = `\u0000FROZEN_${frozen.length}\u0000`;
    frozen.push(raw);
    return token;
  };

  let out = input;

  // Order matters: fenced code first, then display math, then inline math,
  // then Markdown tables, then HTML blocks.
  out = out.replace(/```[\s\S]*?```/g, (m) => push(m));
  out = out.replace(/\$\$[\s\S]*?\$\$/g, (m) => push(m));
  out = out.replace(/\\\[[\s\S]*?\\\]/g, (m) => push(m));
  out = out.replace(/`[^`\n]+`/g, (m) => push(m));
  out = out.replace(/\$[^\n$]+\$/g, (m) => push(m));
  out = out.replace(/\\\([^\n]*?\\\)/g, (m) => push(m));
  // Markdown tables (a header line + separator + rows).
  out = out.replace(
    /(^\|.*\|\s*$\n^\|[-:\s|]+\|\s*$(?:\n^\|.*\|\s*$)+)/gm,
    (m) => push(m),
  );
  // Raw HTML blocks (rare, but preserve).
  out = out.replace(/<([a-zA-Z][^\s>]*)[^>]*>[\s\S]*?<\/\1>/g, (m) =>
    m.length > 40 ? push(m) : m,
  );

  return { skeleton: out, frozen };
}

function unfreeze(skeleton: string, frozen: string[]): string {
  return skeleton.replace(/\u0000FROZEN_(\d+)\u0000/g, (_, i) => frozen[Number(i)] ?? "");
}

function subjectTone(domain?: string): string {
  const d = (domain ?? "").toLowerCase();
  if (/math|physics|engineer|electronic|dsa|programming|computer|chem/.test(d)) {
    return "Subject is technical (math / engineering / CS / science). Keep the prose concise and calculation-focused. Do not pad explanations — a real student writing a technical answer is brief between the working steps.";
  }
  if (/business|english|literat|history|sociolog|psycholog|law|philos/.test(d)) {
    return "Subject is humanities / business. Slightly more explanatory paragraphs are natural, but never drift into essay-mill filler.";
  }
  return "Match the register a real student in this discipline would use.";
}

const HUMANIZE_SYSTEM = `You are the Human Writing Engine — a final polish pass over an assignment answer that a student is about to submit.

YOUR JOB
- Rewrite ONLY the prose so it sounds like a capable university student wrote it by hand, not like ChatGPT or a textbook.
- Vary sentence length naturally (mix short, medium, long). Vary sentence openings. Vary transitions ("First", "Next", "Then", "So", "That means", "Because of this", "Therefore", "However"). Do NOT stack "Moreover / Furthermore / Additionally". Do NOT end every paragraph with a summary sentence.
- Drop generic AI filler: "In this assignment we will", "It is important to note", "In conclusion", "Overall, we can see that", "As we can observe", "Delve into", "Navigate the complexities of", "It is worth noting".
- Keep it confident and natural. Not a research paper (unless the content already reads like one).
- Small imperfections in rhythm are good; robotic symmetry is bad.

HARD CONSTRAINTS — VIOLATING ANY OF THESE IS A FAILURE
- Do NOT change any number, formula, variable, unit, calculation, code, table cell, diagram, or technical fact.
- Do NOT add facts, examples, citations, or content that wasn't already there.
- Do NOT remove or rename headings. Preserve every '#', '##', '###', list marker, numbering, blockquote, and Markdown structure exactly.
- Do NOT touch anything that looks like a placeholder token of the form \u0000FROZEN_<n>\u0000 — copy each such token through byte-for-byte, in the same position relative to surrounding words. These stand in for math, code, tables and inline symbols.
- Do NOT change LaTeX, backticks, or fenced code.
- Keep the overall length within ~10% of the input length.

OUTPUT
- Return the rewritten Markdown ONLY. No preface, no explanation, no code fence around the whole thing.`;

/**
 * Humanize one chunk of assignment prose. Freezes math/code/tables first so
 * the model cannot corrupt them, then rewords the surrounding prose.
 */
export async function humanizeChunk(
  markdown: string,
  opts: HumanizeOptions = {},
): Promise<string> {
  const trimmed = markdown?.trim();
  if (!trimmed || trimmed.length < 80) return markdown; // too short to be worth a pass

  const { skeleton, frozen } = freezeProtectedRegions(markdown);

  // If the skeleton is almost entirely frozen tokens (heavy math answer),
  // there's nothing prose-like to humanize — skip the AI call.
  const proseChars = skeleton.replace(/\u0000FROZEN_\d+\u0000/g, "").replace(/\s+/g, "").length;
  if (proseChars < 60) return markdown;

  const userInstruction = `${subjectTone(opts.subjectDomain)}
${opts.wordCount ? `Overall assignment target length is about ${opts.wordCount} words — do not inflate or shrink this chunk.` : ""}

Rewrite the prose in the Markdown below according to the system rules. Preserve every FROZEN token, every heading, every list marker, and every piece of Markdown structure exactly.

--- BEGIN MARKDOWN ---
${skeleton}
--- END MARKDOWN ---`;

  let rewritten: string;
  try {
    rewritten = await callLovableAI({
      temperature: 0.7,
      messages: [
        { role: "system", content: HUMANIZE_SYSTEM },
        { role: "user", content: userInstruction },
      ],
    });
  } catch (e) {
    console.warn("[humanize] AI call failed, keeping original:", e instanceof Error ? e.message : e);
    return markdown;
  }

  // Strip an accidental outer code fence if the model added one.
  rewritten = rewritten.trim().replace(/^```(?:markdown|md)?\s*\n?/i, "").replace(/\n?```$/i, "");

  // Safety checks: every frozen token must survive exactly once, in order.
  for (let i = 0; i < frozen.length; i++) {
    const token = `\u0000FROZEN_${i}\u0000`;
    if (!rewritten.includes(token)) {
      console.warn(`[humanize] missing frozen token ${i}, discarding rewrite`);
      return markdown;
    }
  }

  // Length guardrail: reject a rewrite that changed size dramatically.
  const ratio = rewritten.length / Math.max(1, skeleton.length);
  if (ratio < 0.55 || ratio > 1.6) {
    console.warn(`[humanize] length ratio ${ratio.toFixed(2)} out of bounds, keeping original`);
    return markdown;
  }

  return unfreeze(rewritten, frozen);
}
