/**
 * Escape HTML special characters to prevent XSS / HTML injection
 * when interpolating user-controlled values into HTML templates.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Escape special characters for safe use in PostgreSQL ILIKE patterns.
 * Prevents user input containing %, _, or \ from being interpreted as wildcards.
 */
export function escapeIlike(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}
