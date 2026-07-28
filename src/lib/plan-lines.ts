import type { PublicPlan } from "@/lib/plans.functions";

export const PLAN_FEATURE_LABELS: Record<string, string> = {
  humanized_writing: "Humanized writing engine",
  ocr: "OCR for images & scans",
  ai_chat: "AI assignment chat",
  pdf_export: "Academic PDF export",
  docx_export: "DOCX export",
  notebook_export: "Notebook-style PDF export",
  notebook_pdf: "Notebook-style PDF export",
  grammar_check: "Grammar & quality score",
  grammar_checker: "Grammar & quality score",
  priority_speed: "Priority generation speed",
  priority_queue: "Priority generation speed",
  faster_generation: "Faster generation",
  references: "Auto references & citations",
  citation_generator: "Auto references & citations",
  all_styles: "All writing styles",
  premium_templates: "Premium templates",
  api_access: "API access",
  team_seats: "Team seats",
  early_features: "Early access to new features",
  future_features: "Early access to new features",
  priority_support: "Priority support",
};

export function planFeatureLines(p: PublicPlan): string[] {
  const lines: string[] = [];
  lines.push(p.credits ? `${p.credits.toLocaleString()} credits` : "Pay-as-you-go credits");
  if (p.monthly_limit) lines.push(`${p.monthly_limit.toLocaleString()} assignments / month`);
  if (p.max_upload_mb) lines.push(`${p.max_upload_mb} MB uploads · ${p.max_upload_pages || "∞"} pages`);
  lines.push(p.features?.ad_free ? "🚫 Ad-Free Experience" : "📢 Contains Ads");
  for (const [key, on] of Object.entries(p.features || {})) {
    if (key === "ad_free") continue;
    if (on && PLAN_FEATURE_LABELS[key]) lines.push(PLAN_FEATURE_LABELS[key]);
  }
  return lines;
}

export function formatPlanPrice(cents: number, currency?: string | null, locale?: string): string {
  if (!cents) return "Free";
  return formatMoneyCents(cents, currency, { locale, compactDecimals: true });
}
