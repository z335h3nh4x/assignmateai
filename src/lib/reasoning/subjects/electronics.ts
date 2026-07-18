import type { SubjectProfile } from "../types";

export const electronicsProfile: SubjectProfile = {
  id: "electronics",
  label: "Electronics",
  match: /electronics|digital|analog|vlsi|microprocessor|microcontroller|embedded|signal|logic\s+design|boolean/,
  guidance: `SUBJECT — ELECTRONICS
Reasoning strategy: classify the question (combinational logic, sequential logic, analog small-signal, digital timing, embedded). For logic problems: truth table first, then K-map, then simplified Boolean expression, then gate-level circuit.
Answer structure per question: For logic — a proper Markdown truth table, then a K-map as a Markdown table, then the simplified expression in math, then a Mermaid \`flowchart LR\` showing inputs → gates → output. For analog — small-signal model, KVL/KCL, substitution with units. For embedded — register-level explanation plus code in \`\`\`c\` or \`\`\`asm\`.
Terminology: SOP / POS, minterms / maxterms, propagation delay, fan-in / fan-out, "active-low", biasing point.
Formatting: Boolean expressions as \`$Y = \\overline{A}\\cdot B + A \\cdot \\overline{B}$\`. Gate diagrams as Mermaid nodes labelled AND / OR / NAND / XOR.
Avoid: giving the simplified expression without showing the K-map grouping, mixing SOP and POS in the same answer, dropping \`don't-care\` conditions.`,
};
