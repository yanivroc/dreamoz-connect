/**
 * Australian phone numbers are stored in E.164 form (+61...) so that SMS/OTP
 * providers can be used later without any conversion.
 */

/** Returns +61XXXXXXXXX when the input is a valid Australian number, else null. */
export function normalizeAuPhone(input: unknown): string | null {
  const raw = String(input ?? "").replace(/[\s()\-.]/g, "");
  if (!raw) return null;

  let digits: string;
  if (raw.startsWith("+61")) digits = raw.slice(3);
  else if (raw.startsWith("0061")) digits = raw.slice(4);
  else if (raw.startsWith("61") && raw.length === 11) digits = raw.slice(2);
  else if (raw.startsWith("0")) digits = raw.slice(1);
  else digits = raw;

  if (!/^[2-9]\d{8}$/.test(digits)) return null;
  return `+61${digits}`;
}

export function isAuPhone(input: unknown): boolean {
  return normalizeAuPhone(input) !== null;
}

/** Display helper: +61412345678 -> +61 412 345 678 */
export function formatAuPhone(input: unknown): string {
  const e164 = normalizeAuPhone(input);
  if (!e164) return String(input ?? "");
  const d = e164.slice(3);
  return `+61 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export const AU_PHONE_HINT = "Australian number in +61 format, e.g. +61 412 345 678";
