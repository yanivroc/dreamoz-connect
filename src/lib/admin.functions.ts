import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  deletedAt: string | null;
};

async function requireAdmin() {
  const { readSession } = await import("./session.server");
  const session = await readSession();
  if (!session.userId) throw new Error("Not signed in.");

  const { dbClient, ensureUsersTable } = await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureUsersTable(db);

  const res = await db.execute({
    sql: "SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [session.userId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row || String(row["role"] ?? "user") !== "admin") {
    throw new Error("You do not have permission to do that.");
  }
  return { db, adminId: Number(row["id"]) };
}

export const listUsers = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ includeDeleted: z.boolean().optional() })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<AdminUser[]> => {
    const { db } = await requireAdmin();
    const where = data?.includeDeleted ? "" : "WHERE deleted_at IS NULL";
    const res = await db.execute(
      `SELECT id, name, email, role, created_at, deleted_at FROM users ${where} ORDER BY id ASC`,
    );
    return res.rows.map((r) => {
      const row = r as unknown as Record<string, unknown>;
      const deleted = row["deleted_at"];
      return {
        id: Number(row["id"]),
        name: String(row["name"]),
        email: String(row["email"]),
        role: String(row["role"] ?? "user"),
        createdAt: String(row["created_at"] ?? ""),
        deletedAt: deleted ? String(deleted) : null,
      };
    });
  });

export const setUserRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.coerce.number().int(), role: z.enum(["user", "admin"]) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db, adminId } = await requireAdmin();
    if (data.id === adminId) throw new Error("You cannot change your own role.");
    await db.execute({
      sql: "UPDATE users SET role = ? WHERE id = ?",
      args: [data.role, data.id],
    });
    return { ok: true as const };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, adminId } = await requireAdmin();
    if (data.id === adminId) throw new Error("You cannot delete your own account.");
    await db.execute({
      sql: "UPDATE users SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
      args: [new Date().toISOString(), data.id],
    });
    return { ok: true as const };
  });

export const restoreUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    await db.execute({
      sql: "UPDATE users SET deleted_at = NULL WHERE id = ?",
      args: [data.id],
    });
    return { ok: true as const };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.coerce.number().int(),
        password: z.string().min(8).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { db } = await requireAdmin();
    const { hashPassword } = await import("./auth.server");
    const hash = await hashPassword(data.password);
    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [hash, data.id],
    });
    return { ok: true as const };
  });
