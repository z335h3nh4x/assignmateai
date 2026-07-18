import type { SubjectProfile } from "../types";

// Fallback profile when no other subject matches. Kept deliberately light so it
// doesn't fight with the global rules.
export const generalAcademicProfile: SubjectProfile = {
  id: "general_academic",
  label: "General Academic",
  match: /.^/, // never auto-matches; used as explicit fallback
  guidance: `SUBJECT — GENERAL ACADEMIC
Reasoning strategy: figure out what a real student in this discipline would actually write, then write that. Prefer flowing paragraphs over lists.
Answer structure per question: brief restatement of the question → a direct answer in the first sentence or two → supporting reasoning with concrete examples → a short closing sentence.
Terminology: match the register of the discipline hinted at by the question wording.
Formatting: use tables, code, math or diagrams only when the question genuinely calls for them.
Avoid: over-formatting, forcing frameworks that don't fit, padding to hit the word count.`,
};
