/** Guesses the viewer's currency from their locale / IANA timezone. */
const ZONE_CURRENCY: Record<string, string> = {
  Australia: "AUD",
  Pacific_Auckland: "NZD",
  "Pacific/Auckland": "NZD",
};

const COUNTRY_CURRENCY: Record<string, string> = {
  AU: "AUD",
  NZ: "NZD",
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  IN: "INR",
  SG: "SGD",
  AE: "AED",
  ZA: "ZAR",
  JP: "JPY",
  CN: "CNY",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  IE: "EUR",
};

export function detectCurrency(): string {
  if (typeof Intl === "undefined") return "AUD";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (ZONE_CURRENCY[tz]) return ZONE_CURRENCY[tz]!;
    const region = tz.split("/")[0] ?? "";
    if (ZONE_CURRENCY[region]) return ZONE_CURRENCY[region]!;

    const locale =
      (typeof navigator !== "undefined" && navigator.language) || "en-AU";
    const country = locale.split("-")[1]?.toUpperCase() ?? "";
    if (COUNTRY_CURRENCY[country]) return COUNTRY_CURRENCY[country]!;

    if (tz.startsWith("America/")) return "USD";
    if (tz.startsWith("Europe/London")) return "GBP";
    if (tz.startsWith("Europe/")) return "EUR";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "INR";
  } catch {
    // Fall through to the default.
  }
  return "AUD";
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
