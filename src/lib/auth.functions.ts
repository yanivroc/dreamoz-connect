import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeAccess, type AccessInfo } from "./plans";

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
  captchaAnswer: z.coerce.number().int(),
  captchaA: z.coerce.number().int().min(0).max(99),
  captchaB: z.coerce.number().int().min(0).max(99),
});

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  plan: string;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  access: AccessInfo;
};

export type LoginResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: "invalid" | "not_configured" };

const USER_COLUMNS = "id, name, email, role, created_at, plan, trial_ends_at, plan_expires_at";

function toCurrentUser(row: Record<string, unknown>): CurrentUser {
  const role = String(row["role"] ?? "user");
  const trialEndsAt = row["trial_ends_at"] ? String(row["trial_ends_at"]) : null;
  const planExpiresAt = row["plan_expires_at"] ? String(row["plan_expires_at"]) : null;
  return {
    id: Number(row["id"]),
    name: String(row["name"]),
    email: String(row["email"]),
    role,
    createdAt: String(row["created_at"] ?? ""),
    plan: String(row["plan"] ?? "none"),
    trialEndsAt,
    planExpiresAt,
    access: computeAccess({ role, trialEndsAt, planExpiresAt }),
  };
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }): Promise<LoginResult> => {
    if (data.captchaAnswer !== data.captchaA + data.captchaB) {
      throw new Error("Captcha verification failed. Please try again.");
    }

    const { dbClient, ensureUsersTable } = await import("./db.server");
    const db = dbClient();
    if (!db) return { ok: false, reason: "not_configured" };
    await ensureUsersTable(db);

    const email = data.email.toLowerCase();
    const res = await db.execute({
      sql: `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      args: [email],
    });
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) return { ok: false, reason: "invalid" };

    const { verifyPassword } = await import("./auth.server");
    const valid = await verifyPassword(data.password, String(row["password_hash"]));
    if (!valid) return { ok: false, reason: "invalid" };

    const user = toCurrentUser(row);

    const { setSession } = await import("./session.server");
    await setSession({ userId: user.id, role: user.role });

    return { ok: true, user };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { destroySession } = await import("./session.server");
  await destroySession();
  return { ok: true as const };
});

export const me = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser | null> => {
    const { readSession } = await import("./session.server");
    const session = await readSession();
    if (!session.userId) return null;

    const { dbClient, ensureUsersTable } = await import("./db.server");
    const db = dbClient();
    if (!db) return null;
    await ensureUsersTable(db);

    const res = await db.execute({
      sql: `SELECT ${USER_COLUMNS} FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      args: [session.userId],
    });
    const row = res.rows[0] as Record<string, unknown> | undefined;
    return row ? toCurrentUser(row) : null;
  },
);
