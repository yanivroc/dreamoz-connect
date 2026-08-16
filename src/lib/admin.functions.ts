import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
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
    sql: "SELECT id, role FROM users WHERE id = ? LIMIT 1",
    args: [session.userId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row || String(row["role"] ?? "user") !== "admin") {
    throw new Error("You do not have permission to do that.");
  }
  return { db, adminId: Number(row["id"]) };
}

export const listUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminUser[]> => {
    const { db } = await requireAdmin();
    const res = await db.execute(
      "SELECT id, name, email, role, created_at FROM users ORDER BY id ASC",
    );
    return res.rows.map((r) => {
      const row = r as unknown as Record<string, unknown>;
      return {
        id: Number(row["id"]),
        name: String(row["name"]),
        email: String(row["email"]),
        role: String(row["role"] ?? "user"),
        createdAt: String(row["created_at"] ?? ""),
      };
    });
  },
);

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
    await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [data.id] });
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
