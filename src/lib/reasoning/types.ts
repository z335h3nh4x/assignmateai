// Types for the modular reasoning-profile engine used by assignment generation.
// A "profile" is a small block of guidance text plus a matcher. The generator
// composes: GLOBAL RULES + one SUBJECT profile + one INTENT profile per question.

export interface SubjectProfile {
  /** Canonical id, e.g. "mathematics". */
  id: string;
  /** Human label shown in the prompt header. */
  label: string;
  /** Regex tested against the detected `subjectDomain` (lowercased). */
  match: RegExp;
  /** Full guidance block injected into the system prompt. */
  guidance: string;
}

export type IntentId =
  | "explain"
  | "define"
  | "compare"
  | "differentiate"
  | "calculate"
  | "derive"
  | "prove"
  | "solve"
  | "design"
  | "draw"
  | "implement"
  | "analyze"
  | "discuss"
  | "evaluate"
  | "case_study";

export interface IntentProfile {
  id: IntentId;
  label: string;
  /** Regex tested against the question text (lowercased). */
  match: RegExp;
  /** Guidance for how to structure an answer of this intent. */
  guidance: string;
}
