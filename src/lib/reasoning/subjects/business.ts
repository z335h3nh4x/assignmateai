import type { SubjectProfile } from "../types";

export const businessProfile: SubjectProfile = {
  id: "business",
  label: "Business & Management",
  match: /business|management|marketing|finance|accounting|human\s+resource|entrepreneur|strategy|operations/,
  guidance: `SUBJECT — BUSINESS & MANAGEMENT
Reasoning strategy: frame the problem as a decision facing a specific stakeholder. Apply a named framework only when it fits (SWOT, PESTLE, Porter's Five Forces, 4Ps, BCG matrix, Ansoff, DuPont).
Answer structure per question: Executive summary in 2–3 sentences → Analysis using the chosen framework → Options with pros/cons → Recommendation with clear justification and expected outcome.
Terminology: professional report register — "stakeholders", "value proposition", "competitive advantage", "unit economics", "ROI", "market segmentation".
Formatting: numbered sub-headings, Markdown tables for framework outputs (e.g. SWOT as a 2×2 table) and for financial comparisons. Small charts as Mermaid \`pie\` where meaningful.
Avoid: dropping a framework name without applying it, generic recommendations that could apply to any company, ignoring the actual context / data in the case.`,
};
