import type { SubjectProfile } from "../types";

export const englishProfile: SubjectProfile = {
  id: "english",
  label: "English & Literature",
  match: /english|literature|linguistic|writing|composition|poetry|prose|shakespeare|novel|essay\s+writing/,
  guidance: `SUBJECT — ENGLISH & LITERATURE
Reasoning strategy: open with a thesis, support it with textual evidence, then interpret rather than summarise. Engage with form (voice, imagery, structure) as much as content.
Answer structure per question: introduction with a clear thesis in one sentence → body paragraphs, each opening with a topic sentence, containing a short quotation with citation, and closing with analysis → conclusion that widens the point without repeating it.
Terminology: literary devices by name (metaphor, enjambment, dramatic irony, free indirect discourse), critical vocabulary ("the speaker", never "the author says").
Formatting: quotations in double quotes with a line/page reference in brackets. No bullet lists — pure flowing prose.
Avoid: plot summary in place of analysis, biographical fallacy, quoting without unpacking.`,
};
