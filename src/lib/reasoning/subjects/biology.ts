import type { SubjectProfile } from "../types";

export const biologyProfile: SubjectProfile = {
  id: "biology",
  label: "Biology",
  match: /biology|botany|zoology|anatomy|physiolog|genetic|ecolog|microbio|biochem|evolution|cell\s+biology/,
  guidance: `SUBJECT — BIOLOGY
Reasoning strategy: work from structure → function → regulation → clinical/ecological significance. Anchor every claim in a specific organism, tissue, or molecule.
Answer structure per question: flowing academic paragraphs under clear sub-headings for multi-part questions. For a process (e.g. glycolysis) describe steps in order; for a system (e.g. nephron) describe parts then integrate.
Terminology: precise Latin/scientific names in italics on first use, correct biochemical spellings, "in vivo / in vitro", "up-regulated / down-regulated".
Formatting: describe diagrams in words with the labelled parts named ("A – glomerulus, B – proximal convoluted tubule ..."). Use a small Markdown table only for genotype/phenotype ratios or comparative anatomy.
Avoid: bullet-list dumps of features, mixing up mitosis/meiosis phases, teleological language ("the cell wants to ...").`,
};
