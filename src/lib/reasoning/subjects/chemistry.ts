import type { SubjectProfile } from "../types";

export const chemistryProfile: SubjectProfile = {
  id: "chemistry",
  label: "Chemistry",
  match: /chemistry|organic|inorganic|physical\s+chem|reaction|stoichiom|equilibrium|thermochem|electrochem/,
  guidance: `SUBJECT — CHEMISTRY
Reasoning strategy: identify the branch (organic mechanism, inorganic bonding, physical/thermodynamic, analytical). For reactions, think in terms of electron flow and thermodynamic favourability.
Answer structure per question: state reagents and conditions, write the balanced equation, then either (mechanism) show arrow-pushing steps described in words with intermediates, or (calculation) show the mole/stoichiometry work step by step with units.
Terminology: IUPAC names, oxidation states with roman numerals, "at STP", "under reflux", "in the presence of \`$H_2SO_4$\`".
Formatting: equations as \`$$2H_2 + O_2 \\rightarrow 2H_2O$$\`, arrows with conditions above written in words below the equation. Use tables for pKa / periodic trends comparisons.
Avoid: unbalanced equations, missing state symbols where they matter, ignoring stereochemistry when the question is stereochemical.`,
};
