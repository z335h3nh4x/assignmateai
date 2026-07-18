import type { SubjectProfile } from "../types";

export const mathematicsProfile: SubjectProfile = {
  id: "mathematics",
  label: "Mathematics",
  match: /math|calculus|algebra|statistic|probability|geometry|trigonom|linear\s+algebra|discrete/,
  guidance: `SUBJECT — MATHEMATICS
Reasoning strategy: identify the class of problem first (algebraic, calculus, combinatorial, statistical, geometric), pick the theorem or method by name, then execute cleanly.
Answer structure per question: (1) short problem restatement, (2) one line naming the method, (3) fully worked step-by-step solution in display math, (4) final answer boxed or bolded, (5) one sentence interpreting the result.
Terminology: "let", "hence", "by [theorem name]", "we obtain", "it follows that". Never say "the AI computes".
Formatting: every symbol lives inside \`$...$\` or \`$$...$$\`. Matrices via \`\\begin{bmatrix}\`, piecewise via \`\\begin{cases}\`, systems aligned with \`\\begin{aligned}\`. Use \`\\therefore\` and \`\\implies\` where natural.
Avoid: skipping algebraic steps, mixing plain-text math with rendered math, giving a decimal without saying to how many places you rounded.`,
};
