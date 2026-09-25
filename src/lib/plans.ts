// Client-safe plan helpers (no server imports).

export type PlanId = "monthly" | "annual";
export const PLAN_IDS: PlanId[] = ["monthly", "annual"];
export const DEFAULT_TRIAL_DAYS = 14;

export type PlanSetting = {
  id: PlanId;
  label: string;
  amountCents: number;
  currency: string;
  days: number;
  enabled: boolean;
};

export const DEFAULT_PLANS: PlanSetting[] = [
  { id: "monthly", label: "Monthly", amountCents: 4900, currency: "AUD", days: 30, enabled: true },
  { id: "annual", label: "Annual", amountCents: 47000, currency: "AUD", days: 365, enabled: true },
];

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

export function formatPlanPrice(cents: number, currency: string): string {
  return `${currency.toUpperCase()} $${(cents / 100).toFixed(2)}`;
}
