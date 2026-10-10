/** Australian Business Number helpers (browser + server safe). */

export const digitsOnly = (v: string) => (v ?? "").replace(/\D/g, "");

/** Validates an 11-digit ABN using the official ATO checksum. */
export function isValidAbn(v: string): boolean {
  const d = digitsOnly(v);
  if (d.length !== 11) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const nums = d.split("").map(Number);
  nums[0] = (nums[0] ?? 0) - 1;
  const sum = nums.reduce((acc, n, i) => acc + n * (weights[i] ?? 0), 0);
  return sum % 89 === 0;
}

/** Formats as "XX XXX XXX XXX". */
export function formatAbn(v: string): string {
  const d = digitsOnly(v);
  if (d.length !== 11) return v;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}
