/** Locale/timezone-stable date formatting so SSR and client output match. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  // API dates have no timezone suffix; treat them as UTC so SSR and client agree.
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}


/** Formats a stored UTC timestamp in the viewer's own locale/timezone (DST-aware). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
