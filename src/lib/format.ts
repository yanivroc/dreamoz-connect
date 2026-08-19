const DIAL_CODES: Record<string, string> = {
  australia: "61",
  "new zealand": "64",
  india: "91",
  "united states": "1",
  "united kingdom": "44",
};

/** Builds an E.164-ish digits-only phone number using the member's country. */
export function toInternationalPhone(
  mobile: string | null | undefined,
  country: string | null | undefined,
): string | null {
  if (!mobile) return null;
  const raw = mobile.replace(/[^\d+]/g, "");
  if (raw.startsWith("+")) return raw.slice(1);
  const code = DIAL_CODES[(country ?? "").trim().toLowerCase()] ?? "61";
  const local = raw.replace(/^0+/, "");
  if (local.startsWith(code)) return local;
  return code + local;
}

export function whatsappLink(
  mobile: string | null | undefined,
  country: string | null | undefined,
  message = "Hi DreamozTech, I'd like to start a project.",
): string | null {
  const phone = toInternationalPhone(mobile, country);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

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
    timeZoneName: "short",
  }).format(d);
}

export function brandName(memberFullName: string | null | undefined): string {
  const cleaned = (memberFullName ?? "").replace(/\s+/g, "");
  return cleaned || "DreamozTech";
}
