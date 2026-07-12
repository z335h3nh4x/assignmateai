export type TemplateId =
  | "essay"
  | "case_study"
  | "lab_report"
  | "research_paper"
  | "presentation"
  | "business_report";

export type CitationStyleId =
  | "none"
  | "apa7"
  | "mla9"
  | "harvard"
  | "chicago"
  | "ieee";

export const TEMPLATES: Record<TemplateId, { label: string; description: string }> = {
  essay: { label: "Essay", description: "Introduction, argued body, conclusion." },
  case_study: { label: "Case Study", description: "Background, problem, analysis, recommendations." },
  lab_report: { label: "Lab Report", description: "Abstract, methods, results, discussion." },
  research_paper: { label: "Research Paper", description: "Abstract, literature review, methodology, findings." },
  presentation: { label: "Presentation", description: "Slide-by-slide outline with speaker notes." },
  business_report: { label: "Business Report", description: "Executive summary, analysis, recommendations." },
};

export const CITATION_STYLES: Record<CitationStyleId, { label: string; description: string }> = {
  none: { label: "None", description: "No formal citations." },
  apa7: { label: "APA 7", description: "American Psychological Association, 7th edition." },
  mla9: { label: "MLA 9", description: "Modern Language Association, 9th edition." },
  harvard: { label: "Harvard", description: "Author–date Harvard referencing." },
  chicago: { label: "Chicago", description: "Chicago Manual of Style (Author-Date)." },
  ieee: { label: "IEEE", description: "Numbered IEEE style." },
};

export function templatePrompt(t: TemplateId): string {
  switch (t) {
    case "essay":
      return "Structure as an academic essay: an engaging introduction with a thesis, 3-5 body sections each with a clear topic sentence, and a conclusion that synthesises the argument.";
    case "case_study":
      return "Structure as a case study with these sections: ## Background, ## Problem Statement, ## Analysis, ## Alternatives, ## Recommendations, ## Conclusion.";
    case "lab_report":
      return "Structure as a scientific lab report with these sections: ## Abstract, ## Introduction, ## Materials and Methods, ## Results, ## Discussion, ## Conclusion.";
    case "research_paper":
      return "Structure as a research paper: ## Abstract, ## Introduction, ## Literature Review, ## Methodology, ## Findings, ## Discussion, ## Conclusion.";
    case "presentation":
      return "Structure as a slide-deck outline. Use ## Slide 1: Title, ## Slide 2: ... for each slide. Under each slide include a short bullet list of on-slide points and an italicised *Speaker notes:* paragraph.";
    case "business_report":
      return "Structure as a business report: ## Executive Summary, ## Introduction, ## Analysis, ## Findings, ## Recommendations, ## Conclusion.";
  }
}

export function citationPrompt(c: CitationStyleId): string {
  switch (c) {
    case "none":
      return "No formal citations are required unless the prompt explicitly asks for sources.";
    case "apa7":
      return "Use APA 7th edition citations. In-text: (Author, Year). End with a ## References section formatted per APA 7 (hanging indent, italic titles for books/journals).";
    case "mla9":
      return "Use MLA 9th edition citations. In-text: (Author Page). End with a ## Works Cited section formatted per MLA 9.";
    case "harvard":
      return "Use Harvard referencing. In-text: (Author, Year). End with a ## References section in Harvard author–date format.";
    case "chicago":
      return "Use Chicago Manual of Style (Author-Date). In-text: (Author Year, Page). End with a ## References section in Chicago Author-Date format.";
    case "ieee":
      return "Use IEEE numbered citations. In-text: [1], [2], etc. End with a ## References section numbered in order of first appearance, formatted per IEEE.";
  }
}

export type SourceItem =
  | { kind: "pdf"; name: string; dataUrl: string }
  | { kind: "docx"; name: string; text: string }
  | { kind: "url"; url: string }
  | { kind: "text"; label?: string; text: string };

export function summariseSourcesForPrompt(sources: SourceItem[], fetchedUrlText: Record<string, string>): string {
  if (!sources.length) return "";
  const parts: string[] = ["The user provided the following reference sources. Prioritise them, cite them accurately, and prefer their facts over your general knowledge."];
  let idx = 1;
  for (const s of sources) {
    if (s.kind === "text") {
      const body = s.text.slice(0, 8000);
      parts.push(`\nSOURCE ${idx} (pasted text${s.label ? ` — ${s.label}` : ""}):\n${body}${s.text.length > 8000 ? "\n[...truncated]" : ""}`);
    } else if (s.kind === "docx") {
      const body = s.text.slice(0, 8000);
      parts.push(`\nSOURCE ${idx} (DOCX — ${s.name}):\n${body}${s.text.length > 8000 ? "\n[...truncated]" : ""}`);
    } else if (s.kind === "url") {
      const fetched = fetchedUrlText[s.url];
      if (fetched) {
        const body = fetched.slice(0, 8000);
        parts.push(`\nSOURCE ${idx} (URL — ${s.url}):\n${body}${fetched.length > 8000 ? "\n[...truncated]" : ""}`);
      } else {
        parts.push(`\nSOURCE ${idx} (URL — ${s.url}): [content could not be fetched — cite the URL and use your general knowledge]`);
      }
    } else if (s.kind === "pdf") {
      parts.push(`\nSOURCE ${idx} (PDF — ${s.name}): [attached in message, read it]`);
    }
    idx++;
  }
  return parts.join("\n");
}
