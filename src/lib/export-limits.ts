/** Single source of truth for the per-assignment export cap. */
export const MAX_EXPORTS_PER_ASSIGNMENT = 5;

/** Maximum total length for a downloaded export filename. */
const MAX_FILENAME_LENGTH = 128;

export function exportsRemaining(exportsCount: number | null | undefined): number {
  return Math.max(0, MAX_EXPORTS_PER_ASSIGNMENT - (exportsCount ?? 0));
}

/**
 * Turn an assignment title into a safe download filename.
 *
 * - Strips Windows/Unix reserved characters: \ / : * ? " < > |
 * - Trims leading/trailing spaces and periods
 * - Falls back to "assignment" when the title is empty
 * - Preserves (and deduplicates) the .pdf extension
 * - Truncates overly long names while keeping the extension intact
 */
export function sanitizeExportFilename(
  title: string | null | undefined,
  ext = ".pdf",
): string {
  const trimmed = (title || "").trim();
  if (!trimmed) return `assignment${ext}`;

  // Strip reserved filesystem characters.
  let name = trimmed.replace(/[\\/: *?"<>|]+/g, "");

  // Trim leading/trailing spaces and periods.
  name = name.replace(/^[.\s]+|[.\s]+$/g, "");

  if (!name) return `assignment${ext}`;

  // Avoid duplicate extension if the title already ends with it.
  const lowerName = name.toLowerCase();
  const lowerExt = ext.toLowerCase();
  const namePart = lowerName.endsWith(lowerExt)
    ? name.slice(0, -lowerExt.length)
    : name;

  // Truncate the name portion so the final filename fits within the limit.
  const maxNameLength = Math.max(1, MAX_FILENAME_LENGTH - ext.length);
  const truncated = namePart.slice(0, maxNameLength).replace(/[.\s]+$/g, "");

  return `${truncated || "assignment"}${ext}`;
}
