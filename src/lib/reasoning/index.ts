// Composer that assembles: GLOBAL RULES + selected SUBJECT PROFILE +
// per-question INTENT PROFILES. Nothing else in the app should hand-roll
// system-prompt blocks for subject/intent behaviour.

import { GLOBAL_RULES } from "./global-rules";
import { selectSubjectProfile } from "./subjects";
import { detectIntent, intentGuidanceForQuestions } from "./intents";
import type { SubjectProfile, IntentProfile } from "./types";

export { selectSubjectProfile, detectIntent };
export type { SubjectProfile, IntentProfile };

export interface ComposedReasoning {
  subject: { id: string; label: string };
  intents: { id: string; label: string }[];
  systemBlock: string;
}

export function composeReasoning(opts: {
  subjectDomain: string | undefined;
  questions: string[];
}): ComposedReasoning {
  const subject = selectSubjectProfile(opts.subjectDomain);
  const intents = intentGuidanceForQuestions(opts.questions);

  const intentBlock = intents.length
    ? `Detected question intents in this assignment (apply the matching guidance per question):\n\n${intents
        .map((i) => i.guidance)
        .join("\n\n")}`
    : "";

  const systemBlock = [
    `DETECTED SUBJECT: ${subject.label}. Write in the style a real ${subject.label} student would submit.`,
    subject.guidance,
    intentBlock,
    GLOBAL_RULES,
  ]
    .filter((s) => s.trim().length > 0)
    .join("\n\n");

  return {
    subject: { id: subject.id, label: subject.label },
    intents: intents.map((i) => ({ id: i.id, label: i.label })),
    systemBlock,
  };
}
