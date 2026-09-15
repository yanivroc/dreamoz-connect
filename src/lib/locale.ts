/** Supported selling countries, with the currency and weight unit shown to shoppers. */
export type CountryCode = "AU" | "US" | "GB";

export type CountryInfo = {
  label: string;
  currency: string;
  weightUnit: string;
};

export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  AU: { label: "Australia", currency: "AUD", weightUnit: "kg" },
  US: { label: "United States", currency: "USD", weightUnit: "lb" },
  GB: { label: "United Kingdom", currency: "GBP", weightUnit: "lb" },
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
