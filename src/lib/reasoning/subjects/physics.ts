import type { SubjectProfile } from "../types";

export const physicsProfile: SubjectProfile = {
  id: "physics",
  label: "Physics",
  match: /physics|mechanic|thermo|electromagnet|oscillation|optic|quantum|astro|relativity|wave/,
  guidance: `SUBJECT — PHYSICS
Reasoning strategy: identify the physical regime (kinematic, dynamic, thermal, wave, field, quantum), draw or describe a free-body / ray / circuit picture, pick the governing law, then substitute.
Answer structure per question: (a) Given data with symbols and SI units, (b) the governing law/formula with one line on what it means physically, (c) derivation or substitution in display math, (d) numerical answer with units, (e) short physical interpretation ("this means the block decelerates at ...").
Terminology: SI units always, "let \`$m$\` denote ...", "applying Newton's second law", "conservation of energy gives".
Formatting: SI units inside math (\`$9.8\\,\\text{m/s}^2$\`). Vectors bold or with \`\\vec{}\`. Include a labelled Mermaid or ASCII sketch only when the physics genuinely needs one.
Avoid: unit-less numbers, dropping the negative sign on vectors, treating scalar and vector magnitudes as interchangeable.`,
};
