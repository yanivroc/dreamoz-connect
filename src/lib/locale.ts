/** Supported selling countries, with the currency and weight unit shown to shoppers. */
export type CountryCode = "AU";

export type CountryInfo = {
  label: string;
  currency: string;
  weightUnit: string;
};

// Australia only: Square settles in AUD and payouts are domestic AUD transfers.
export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  AU: { label: "Australia", currency: "AUD", weightUnit: "kg" },
};

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

export const DEFAULT_COUNTRY: CountryCode = "AU";

export function normalizeCountry(code: unknown): CountryCode {
  const c = String(code ?? "").toUpperCase();
  return (COUNTRY_CODES as string[]).includes(c) ? (c as CountryCode) : DEFAULT_COUNTRY;
}

export function currencyFor(code: unknown): string {
  return COUNTRIES[normalizeCountry(code)].currency;
}

export function weightUnitFor(code: unknown): string {
  return COUNTRIES[normalizeCountry(code)].weightUnit;
}
