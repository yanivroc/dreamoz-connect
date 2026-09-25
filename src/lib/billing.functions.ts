import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_TRIAL_DAYS, PLAN_IDS, type PlanId, type PlanSetting } from "./plans";

export type BillingPayment = {
  id: number;
  plan: string;
  amountCents: number;
  currency: string;
  periodEnd: string;
  receiptUrl: string | null;
  createdAt: string;
};

export type BillingOverview = {
  plans: PlanSetting[];
  trialDays: number;
  square: {
    applicationId: string | null;
    locationId: string | null;
    configured: boolean;
    mode: "production" | "sandbox";
  };
  payments: BillingPayment[];
};

async function requireSessionUser() {
  const { readSession } = await import("./session.server");
  const session = await readSession();
  if (!session.userId) throw new Error("Not signed in.");
  const { dbClient, ensureUsersTable, ensureBillingTables } = await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureUsersTable(db);
  await ensureBillingTables(db);
  const res = await db.execute({
    sql: "SELECT id, name, email, role, plan_expires_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [session.userId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Not signed in.");
  return {
    db,
    userId: Number(row["id"]),
    name: String(row["name"]),
    email: String(row["email"]),
    isAdmin: String(row["role"] ?? "user") === "admin",
    planExpiresAt: row["plan_expires_at"] ? String(row["plan_expires_at"]) : null,
  };
}

type Db = Awaited<ReturnType<typeof requireSessionUser>>["db"];

async function loadPlans(db: Db): Promise<PlanSetting[]> {
  const res = await db.execute("SELECT * FROM plan_settings");
  const rows = res.rows.map((r) => r as unknown as Record<string, unknown>);
  return PLAN_IDS.flatMap((id) => {
    const row = rows.find((r) => String(r["id"]) === id);
    if (!row) return [];
    return [
      {
        id,
        label: String(row["label"]),
        amountCents: Number(row["amount_cents"]),
        currency: String(row["currency"] ?? "AUD"),
        days: Number(row["days"]),
        enabled: Number(row["enabled"]) === 1,
      },
    ];
  });
}

function billingSquare() {
  const prodApp = process.env["SQUARE_PROD_APPLICATION_ID"]?.trim();
  const prodLoc = process.env["SQUARE_PROD_LOCATION_ID"]?.trim();
  const prodToken = process.env["SQUARE_PROD_ACCESS_TOKEN"]?.trim();
  if (prodApp && prodLoc && prodToken) {
    const environment =
      (process.env["SQUARE_PROD_ENVIRONMENT"] ?? "production").trim().toLowerCase() === "sandbox"
        ? "sandbox"
        : "production";
    return { applicationId: prodApp, locationId: prodLoc, accessToken: prodToken, environment };
  }
  // Fall back to the existing sandbox settings so the flow can be tested
  // end-to-end before the production variables are added.
  const applicationId = process.env["SQUARE_APPLICATION_ID"]?.trim() || null;
  const locationId = process.env["SQUARE_LOCATION_ID"]?.trim() || null;
  const accessToken = process.env["SQUARE_ACCESS_TOKEN"]?.trim() || null;
  const environment =
    (process.env["SQUARE_ENVIRONMENT"] ?? "sandbox").trim().toLowerCase() === "production"
      ? "production"
      : "sandbox";
  return { applicationId, locationId, accessToken, environment };
}

export const getBillingOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<BillingOverview> => {
    const ctx = await requireSessionUser();
    const { getTrialDays } = await import("./plan-access.server");
    const sq = billingSquare();
    const pay = await ctx.db.execute({
      sql: "SELECT * FROM subscription_payments WHERE user_id = ? ORDER BY id DESC LIMIT 20",
      args: [ctx.userId],
    });
    return {
      plans: await loadPlans(ctx.db),
      trialDays: await getTrialDays(ctx.db),
      square: {
        applicationId: sq.applicationId,
        locationId: sq.locationId,
        configured: Boolean(sq.applicationId && sq.locationId && sq.accessToken),
        mode: sq.environment,
      },
      payments: pay.rows.map((r) => {
        const row = r as unknown as Record<string, unknown>;
        return {
          id: Number(row["id"]),
          plan: String(row["plan"]),
          amountCents: Number(row["amount_cents"]),
          currency: String(row["currency"]),
          periodEnd: String(row["period_end"]),
          receiptUrl: row["receipt_url"] ? String(row["receipt_url"]) : null,
          createdAt: String(row["created_at"]),
        };
      }),
    };
  },
);

export const purchasePlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ plan: z.enum(["monthly", "annual"]), sourceId: z.string().min(1).max(2000) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; planExpiresAt: string } | { ok: false; error: string }> => {
    const ctx = await requireSessionUser();
    const sq = billingSquare();
    if (!sq.applicationId || !sq.locationId || !sq.accessToken) {
      return { ok: false, error: "Payments are not configured yet." };
    }
    const plan = (await loadPlans(ctx.db)).find((p) => p.id === data.plan);
    if (!plan || !plan.enabled) return { ok: false, error: "This plan is not available." };
    if (plan.amountCents <= 0) return { ok: false, error: "This plan has no price set." };

    const base =
      sq.environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";
    const res = await fetch(`${base}/v2/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sq.accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-10-17",
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        source_id: data.sourceId,
        location_id: sq.locationId,
        amount_money: { amount: plan.amountCents, currency: plan.currency },
        buyer_email_address: ctx.email,
        note: `DreamozTech ${plan.label} plan — user ${ctx.userId}`,
      }),
    });
    const body = (await res.json()) as {
      payment?: { id: string; receipt_url?: string };
      errors?: { detail?: string }[];
    };
    if (!res.ok || !body.payment) {
      console.error("Plan payment failed", res.status, JSON.stringify(body.errors));
      return { ok: false, error: body.errors?.[0]?.detail ?? "Payment failed. Please try again." };
    }

    const now = Date.now();
    const current = ctx.planExpiresAt ? Date.parse(ctx.planExpiresAt) : NaN;
    const start = Number.isFinite(current) && current > now ? current : now;
    const periodStart = new Date(start).toISOString();
    const periodEnd = new Date(start + plan.days * 24 * 60 * 60 * 1000).toISOString();

    try {
      await ctx.db.execute({
        sql: "UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?",
        args: [plan.id, periodEnd, ctx.userId],
      });
      await ctx.db.execute({
        sql: `INSERT INTO subscription_payments
                (user_id, plan, amount_cents, currency, square_payment_id, receipt_url, period_start, period_end, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          ctx.userId,
          plan.id,
          plan.amountCents,
          plan.currency,
          body.payment.id,
          body.payment.receipt_url ?? null,
          periodStart,
          periodEnd,
          new Date(now).toISOString(),
        ],
      });
    } catch (err) {
      console.error("Plan payment captured but saving failed", body.payment.id, err);
    }
    return { ok: true, planExpiresAt: periodEnd };
  });

async function requireAdminCtx() {
  const ctx = await requireSessionUser();
  if (!ctx.isAdmin) throw new Error("You do not have permission to do that.");
  return ctx;
}

const planSettingSchema = z.object({
  id: z.enum(["monthly", "annual"]),
  label: z.string().trim().min(1).max(40),
  amountCents: z.coerce.number().int().min(0).max(100_000_000),
  days: z.coerce.number().int().min(1).max(3660),
  enabled: z.boolean(),
});

export const updatePlanSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        plans: z.array(planSettingSchema).min(1).max(2),
        trialDays: z.coerce.number().int().min(1).max(365),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireAdminCtx();
    const now = new Date().toISOString();
    for (const p of data.plans) {
      await ctx.db.execute({
        sql: "UPDATE plan_settings SET label = ?, amount_cents = ?, days = ?, enabled = ?, updated_at = ? WHERE id = ?",
        args: [p.label, p.amountCents, p.days, p.enabled ? 1 : 0, now, p.id as PlanId],
      });
    }
    await ctx.db.execute({
      sql: "INSERT INTO platform_settings (key, value) VALUES ('trial_days', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: [String(data.trialDays || DEFAULT_TRIAL_DAYS)],
    });
    return { ok: true as const };
  });

export type UserAccessRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
};

export const listUserAccess = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserAccessRow[]> => {
    const ctx = await requireAdminCtx();
    const res = await ctx.db.execute(
      "SELECT id, name, email, role, plan, trial_ends_at, plan_expires_at FROM users WHERE deleted_at IS NULL ORDER BY id ASC",
    );
    return res.rows.map((r) => {
      const row = r as unknown as Record<string, unknown>;
      return {
        id: Number(row["id"]),
        name: String(row["name"]),
        email: String(row["email"]),
        role: String(row["role"] ?? "user"),
        plan: String(row["plan"] ?? "none"),
        trialEndsAt: row["trial_ends_at"] ? String(row["trial_ends_at"]) : null,
        planExpiresAt: row["plan_expires_at"] ? String(row["plan_expires_at"]) : null,
      };
    });
  },
);

export const extendTrial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int(), days: z.coerce.number().int().min(1).max(365) }).parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireAdminCtx();
    const res = await ctx.db.execute({
      sql: "SELECT trial_ends_at FROM users WHERE id = ? LIMIT 1",
      args: [data.id],
    });
    const cur = (res.rows[0] as Record<string, unknown> | undefined)?.["trial_ends_at"];
    const curMs = cur ? Date.parse(String(cur)) : NaN;
    const base = Number.isFinite(curMs) && curMs > Date.now() ? curMs : Date.now();
    await ctx.db.execute({
      sql: "UPDATE users SET trial_ends_at = ? WHERE id = ?",
      args: [new Date(base + data.days * 24 * 60 * 60 * 1000).toISOString(), data.id],
    });
    return { ok: true as const };
  });

export const setPlanUntil = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.coerce.number().int(),
        plan: z.enum(["none", "monthly", "annual"]),
        until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireAdminCtx();
    const until = data.plan === "none" || !data.until ? null : new Date(`${data.until}T23:59:59`).toISOString();
    await ctx.db.execute({
      sql: "UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?",
      args: [data.plan, until, data.id],
    });
    return { ok: true as const };
  });
