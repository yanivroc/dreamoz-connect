// Server-only plan checks. Imported by server functions, TanStack API routes
// and the Vercel api/* handlers, so it must stay free of path aliases.
import { computeAccess, hasAccess, DEFAULT_TRIAL_DAYS, type AccessInfo } from "./plans";

type Db = { execute: (q: any) => Promise<{ rows: any[] }> };

export const PLAN_EXPIRED_MESSAGE =
  "Your trial or plan has ended. Choose a plan on the Dashboard to continue.";

export const PLAN_EXPIRED_BODY = { error: "plan_expired", message: PLAN_EXPIRED_MESSAGE };

function rowAccess(row: Record<string, unknown>): AccessInfo {
  return computeAccess({
    role: String(row["role"] ?? "user"),
    trialEndsAt: row["trial_ends_at"] ? String(row["trial_ends_at"]) : null,
    planExpiresAt: row["plan_expires_at"] ? String(row["plan_expires_at"]) : null,
  });
}

export async function userAccess(db: Db, userId: number): Promise<AccessInfo | null> {
  const res = await db.execute({
    sql: "SELECT role, trial_ends_at, plan_expires_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [userId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  return row ? rowAccess(row) : null;
}

/** Throws for non-admin users whose trial/plan has ended. */
export async function assertActiveAccess(db: Db, userId: number): Promise<void> {
  const info = await userAccess(db, userId);
  if (info && !hasAccess(info)) throw new Error(PLAN_EXPIRED_MESSAGE);
}

/** True when the web app's owner may use the API (admins always can). */
export async function appOwnerHasAccess(db: Db, appId: number): Promise<boolean> {
  try {
    const res = await db.execute({
      sql: `SELECT u.role, u.trial_ends_at, u.plan_expires_at
              FROM web_apps a JOIN users u ON u.id = a.user_id
             WHERE a.id = ? AND u.deleted_at IS NULL LIMIT 1`,
      args: [appId],
    });
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) return false;
    return hasAccess(rowAccess(row));
  } catch (err) {
    // Plan columns not migrated yet — don't take published sites down.
    console.error("plan check failed", err);
    return true;
  }
}

export async function getTrialDays(db: Db): Promise<number> {
  try {
    const res = await db.execute({
      sql: "SELECT value FROM platform_settings WHERE key = 'trial_days' LIMIT 1",
      args: [],
    });
    const v = Number((res.rows[0] as Record<string, unknown> | undefined)?.["value"]);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_TRIAL_DAYS;
  } catch {
    return DEFAULT_TRIAL_DAYS;
  }
}
