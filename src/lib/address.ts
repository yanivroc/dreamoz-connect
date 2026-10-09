/** Split a registered address like "1 Main St, Donnybrook VIC 3064" into parts. */
export function splitAuAddress(full: string): { address: string; city: string; postcode: string } {
  const text = full.trim();
  const pc = text.match(/(\d{4})\s*(?:,?\s*Australia)?\s*$/i);
  const postcode = pc?.[1] ?? "";
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  let city = "";
  if (parts.length > 1) {
    city = parts[parts.length - 1]!
      .replace(/Australia/i, "")
      .replace(/\b\d{4}\b/, "")
      .replace(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i, "")
      .trim();
    if (!city && parts.length > 2) city = parts[parts.length - 2]!;
  }
  return { address: text, city: city || "—", postcode: postcode || "—" };
}
