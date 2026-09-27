import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type BankDetails = {
  accountName: string;
  bsb: string;
  accountNumber: string;
  bankName: string;
  updatedAt: string | null;
};

export type PayoutRecord = {
  id: number;
  amount: number;
  currency: string;
  reference: string;
  notes: string;
  createdAt: string;
};

export type Earnings = {
  currency: string;
  commissionPercent: number;
  grossSales: number;
  commission: number;
  netEarned: number;
  pending: number;
  paidOut: number;
  available: number;
  orderCount: number;
};

export type SellerBalance = {
  userId: number;
  name: string;
  email: string;
  earnings: Earnings;
  bank: BankDetails | null;
};

type Row = Record<string, unknown>;

const round2 = (n: number) => Math.round(n * 100) / 100;

async function openDb() {
  const { dbClient, ensureUsersTable, ensureWebAppsTable, ensureOrdersTables, ensurePayoutTables } =
    await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureUsersTable(db);
  await ensureWebAppsTable(db);
  await ensureOrdersTables(db);
  await ensurePayoutTables(db);
  return db;
}

async function requireUser() {
  const { readSession } = await import("./session.server");
  const session = await readSession();
  if (!session.userId) throw new Error("Not signed in.");
  const db = await openDb();
  const res = await db.execute({
    sql: "SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [session.userId],
  });
  const row = res.rows[0] as Row | undefined;
  if (!row) throw new Error("Not signed in.");
  return { db, userId: Number(row["id"]), isAdmin: String(row["role"] ?? "user") === "admin" };
}

async function commissionPercent(db: Awaited<ReturnType<typeof openDb>>): Promise<number> {
  try {
    const res = await db.execute(
      "SELECT value FROM platform_settings WHERE key = 'commission_percent' LIMIT 1",
    );
    const v = Number((res.rows[0] as Row | undefined)?.["value"]);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

async function earningsFor(
  db: Awaited<ReturnType<typeof openDb>>,
  userId: number,
  percent: number,
): Promise<Earnings> {
  const res = await db.execute({
    sql: `SELECT o.status, o.subtotal, o.shipping, o.total, o.currency
          FROM orders o JOIN web_apps a ON a.id = o.app_id
          WHERE a.user_id = ? AND o.status <> 'cancelled'`,
    args: [userId],
  });

  let gross = 0;
  let commission = 0;
  let net = 0;
  let pending = 0;
  let currency = "AUD";
  let count = 0;

  for (const r of res.rows as unknown as Row[]) {
    const subtotal = Number(r["subtotal"] ?? 0);
    const total = Number(r["total"] ?? 0);
    const fee = round2((subtotal * percent) / 100);
    const sellerNet = round2(total - fee);
    currency = String(r["currency"] ?? currency) || currency;
    count += 1;
    gross += total;
    commission += fee;
    if (String(r["status"]) === "order_complete") net += sellerNet;
    else pending += sellerNet;
  }

  const paidRes = await db.execute({
    sql: "SELECT COALESCE(SUM(amount), 0) AS paid FROM seller_payouts WHERE user_id = ?",
    args: [userId],
  });
  const paidOut = Number((paidRes.rows[0] as Row | undefined)?.["paid"] ?? 0);

  return {
    currency,
    commissionPercent: percent,
    grossSales: round2(gross),
    commission: round2(commission),
    netEarned: round2(net),
    pending: round2(pending),
    paidOut: round2(paidOut),
    available: round2(net - paidOut),
    orderCount: count,
  };
}

function mapBank(row: Row | undefined): BankDetails | null {
  if (!row) return null;
  return {
    accountName: String(row["account_name"] ?? ""),
    bsb: String(row["bsb"] ?? ""),
    accountNumber: String(row["account_number"] ?? ""),
    bankName: String(row["bank_name"] ?? ""),
    updatedAt: row["updated_at"] ? String(row["updated_at"]) : null,
  };
}

/** Seller view: bank details, earnings summary and payout history. */
export const getMyPayoutProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ bank: BankDetails | null; earnings: Earnings; payouts: PayoutRecord[] }> => {
    const { db, userId } = await requireUser();
    const percent = await commissionPercent(db);
    const bankRes = await db.execute({
      sql: "SELECT * FROM seller_bank_accounts WHERE user_id = ? LIMIT 1",
      args: [userId],
    });
    const payRes = await db.execute({
      sql: "SELECT id, amount, currency, reference, notes, created_at FROM seller_payouts WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100",
      args: [userId],
    });
    return {
      bank: mapBank(bankRes.rows[0] as Row | undefined),
      earnings: await earningsFor(db, userId, percent),
      payouts: (payRes.rows as unknown as Row[]).map((r) => ({
        id: Number(r["id"]),
        amount: Number(r["amount"] ?? 0),
        currency: String(r["currency"] ?? "AUD"),
        reference: String(r["reference"] ?? ""),
        notes: String(r["notes"] ?? ""),
        createdAt: String(r["created_at"] ?? ""),
      })),
    };
  },
);

const bankSchema = z.object({
  accountName: z.string().trim().min(2).max(80),
  bsb: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 6, "BSB must be 6 digits."),
  accountNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 5 && v.length <= 10, "Account number must be 5–10 digits."),
  bankName: z.string().trim().max(60).optional().default(""),
});

export const saveMyBankDetails = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bankSchema.parse(input))
  .handler(async ({ data }) => {
    const { db, userId } = await requireUser();
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO seller_bank_accounts (user_id, account_name, bsb, account_number, bank_name, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              account_name = excluded.account_name,
              bsb = excluded.bsb,
              account_number = excluded.account_number,
              bank_name = excluded.bank_name,
              updated_at = excluded.updated_at`,
      args: [userId, data.accountName, data.bsb, data.accountNumber, data.bankName ?? "", now],
    });
    return { ok: true as const };
  });

/** Admin view: every member's payable balance and bank details. */
export const listSellerBalances = createServerFn({ method: "GET" }).handler(
  async (): Promise<SellerBalance[]> => {
    const { db, isAdmin } = await requireUser();
    if (!isAdmin) throw new Error("You do not have permission to do that.");
    const percent = await commissionPercent(db);
    const users = await db.execute(
      `SELECT DISTINCT u.id, u.name, u.email FROM users u
       JOIN web_apps a ON a.user_id = u.id
       WHERE u.deleted_at IS NULL ORDER BY u.name ASC`,
    );
    const out: SellerBalance[] = [];
    for (const r of users.rows as unknown as Row[]) {
      const userId = Number(r["id"]);
      const earnings = await earningsFor(db, userId, percent);
      if (earnings.orderCount === 0 && earnings.paidOut === 0) continue;
      const bankRes = await db.execute({
        sql: "SELECT * FROM seller_bank_accounts WHERE user_id = ? LIMIT 1",
        args: [userId],
      });
      out.push({
        userId,
        name: String(r["name"] ?? ""),
        email: String(r["email"] ?? ""),
        earnings,
        bank: mapBank(bankRes.rows[0] as Row | undefined),
      });
    }
    return out;
  },
);

export const recordSellerPayout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.number().int().positive(),
        amount: z.coerce.number().positive().max(1000000),
        currency: z.string().trim().min(3).max(3).default("AUD"),
        reference: z.string().trim().max(60).optional().default(""),
        notes: z.string().trim().max(300).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, userId: actorId, isAdmin } = await requireUser();
    if (!isAdmin) throw new Error("You do not have permission to do that.");
    const bankRes = await db.execute({
      sql: "SELECT * FROM seller_bank_accounts WHERE user_id = ? LIMIT 1",
      args: [data.userId],
    });
    const bank = mapBank(bankRes.rows[0] as Row | undefined);
    await db.execute({
      sql: `INSERT INTO seller_payouts
              (user_id, amount, currency, reference, notes, account_name, bsb, account_number, paid_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.userId,
        round2(data.amount),
        data.currency.toUpperCase(),
        data.reference ?? "",
        data.notes ?? "",
        bank?.accountName ?? "",
        bank?.bsb ?? "",
        bank?.accountNumber ?? "",
        actorId,
        new Date().toISOString(),
      ],
    });
    return { ok: true as const };
  });

export const listPayoutsForUser = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ userId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }): Promise<PayoutRecord[]> => {
    const { db, isAdmin } = await requireUser();
    if (!isAdmin) throw new Error("You do not have permission to do that.");
    const res = await db.execute({
      sql: "SELECT id, amount, currency, reference, notes, created_at FROM seller_payouts WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100",
      args: [data.userId],
    });
    return (res.rows as unknown as Row[]).map((r) => ({
      id: Number(r["id"]),
      amount: Number(r["amount"] ?? 0),
      currency: String(r["currency"] ?? "AUD"),
      reference: String(r["reference"] ?? ""),
      notes: String(r["notes"] ?? ""),
      createdAt: String(r["created_at"] ?? ""),
    }));
  });
