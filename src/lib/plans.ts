// Client-safe plan helpers (no server imports).

export type PlanId = "base_monthly" | "base_annual" | "pro_monthly" | "pro_annual";
export const PLAN_IDS: PlanId[] = ["base_monthly", "base_annual", "pro_monthly", "pro_annual"];
export const DEFAULT_TRIAL_DAYS = 14;

export type PlanTier = "base" | "pro";

export type PlanSetting = {
  id: PlanId;
  label: string;
  amountCents: number;
  currency: string;
  days: number;
  enabled: boolean;
};

export const DEFAULT_PLANS: PlanSetting[] = [
  { id: "base_monthly", label: "Base Monthly", amountCents: 1000, currency: "AUD", days: 30, enabled: true },
  { id: "base_annual", label: "Base Annual", amountCents: 10000, currency: "AUD", days: 365, enabled: true },
  { id: "pro_monthly", label: "Pro Monthly", amountCents: 2000, currency: "AUD", days: 30, enabled: true },
  { id: "pro_annual", label: "Pro Annual", amountCents: 20000, currency: "AUD", days: 365, enabled: true },
];

/** Legacy single-tier ids map onto the Pro tier (they had API access). */
export function normalisePlanId(value: string | null | undefined): PlanId | "none" {
  switch (value) {
    case "monthly":
      return "pro_monthly";
    case "annual":
      return "pro_annual";
    case "base_monthly":
    case "base_annual":
    case "pro_monthly":
    case "pro_annual":
      return value;
    default:
      return "none";
  }
}

export function planTier(value: string | null | undefined): PlanTier | null {
  const id = normalisePlanId(value);
  if (id === "none") return null;
  return id.startsWith("pro_") ? "pro" : "base";
}

export function planInterval(id: PlanId): "monthly" | "annual" {
  return id.endsWith("_annual") ? "annual" : "monthly";
}

export const TIER_LABEL: Record<PlanTier, string> = { base: "Base", pro: "Pro" };

export const TIER_FEATURES: Record<PlanTier, string[]> = {
  base: [
    "Unlimited web pages and child pages",
    "Sell products with Square checkout",
    "Contact forms and enquiry inbox",
    "Share your pages on the Community feed",
    "Orders, shipping rates and payouts",
  ],
  pro: [
    "Everything in Base",
    "Full REST API access (token, web app, contacts)",
    "Build your own front end on any platform",
  ],
};

export type AccessState = "admin" | "trial" | "active" | "expired";

export type AccessInfo = {
  state: AccessState;
  endsAt: string | null;
  daysLeft: number;
};

const DAY = 24 * 60 * 60 * 1000;

export function computeAccess(
  input: { role: string; trialEndsAt: string | null; planExpiresAt: string | null },
  now = Date.now(),
): AccessInfo {
  if (input.role === "admin") return { state: "admin", endsAt: null, daysLeft: 0 };
  const planEnd = input.planExpiresAt ? Date.parse(input.planExpiresAt) : NaN;
  if (Number.isFinite(planEnd) && planEnd > now) {
    return { state: "active", endsAt: input.planExpiresAt, daysLeft: Math.ceil((planEnd - now) / DAY) };
  }
  // A missing trial date means the account predates plans and hasn't been backfilled yet.
  if (!input.trialEndsAt) return { state: "trial", endsAt: null, daysLeft: DEFAULT_TRIAL_DAYS };
  const trialEnd = Date.parse(input.trialEndsAt);
  if (Number.isFinite(trialEnd) && trialEnd > now) {
    return { state: "trial", endsAt: input.trialEndsAt, daysLeft: Math.ceil((trialEnd - now) / DAY) };
  }
  return { state: "expired", endsAt: input.planExpiresAt ?? input.trialEndsAt, daysLeft: 0 };
}

export function hasAccess(info: AccessInfo): boolean {
  return info.state !== "expired";
}

/**
 * API access: admins and trial users get everything, paid access needs the Pro tier.
 */
export function hasApiAccess(info: AccessInfo, plan: string | null | undefined): boolean {
  if (info.state === "admin" || info.state === "trial") return true;
  if (info.state !== "active") return false;
  return planTier(plan) === "pro";
}

export function formatPlanPrice(cents: number, currency: string): string {
  return `${currency.toUpperCase()} $${(cents / 100).toFixed(2)}`;
}
