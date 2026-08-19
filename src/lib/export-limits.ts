/** Single source of truth for the per-assignment export cap. */
export const MAX_EXPORTS_PER_ASSIGNMENT = 5;

export function exportsRemaining(exportsCount: number | null | undefined): number {
  return Math.max(0, MAX_EXPORTS_PER_ASSIGNMENT - (exportsCount ?? 0));
}
