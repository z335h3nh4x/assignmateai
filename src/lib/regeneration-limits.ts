// Plan-based regeneration caps. Shared by client (display) and server (enforcement).
export const REGENERATION_LIMITS: Record<string, number> = {
  free: 1,
  basic: 2,
  pro: 5,
};

export const DEFAULT_MAX_REGENERATIONS = 1;

export function maxRegenerationsForPlan(planSlug: string | null | undefined): number {
  if (!planSlug) return DEFAULT_MAX_REGENERATIONS;
  return REGENERATION_LIMITS[planSlug.toLowerCase()] ?? DEFAULT_MAX_REGENERATIONS;
}
