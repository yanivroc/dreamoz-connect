import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type WebApp = {
  id: number;
  userId: number;
  ownerName: string;
  title: string;
  description: string;
  email: string;
  link: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Enter a valid email address.",
  });

const optionalLink = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), {
    message: "Link must start with http:// or https://",
  });

async function requireUser() {
  const { readSession } = await import("./session.server");
  const session = await readSession();
  if (!session.userId) throw new Error("Not signed in.");

  const { dbClient, ensureUsersTable, ensureWebAppsTable } = await import(
    "./db.server"
  );
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureUsersTable(db);
  await ensureWebAppsTable(db);

  const res = await db.execute({
    sql: "SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [session.userId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Not signed in.");
  return {
    db,
    userId: Number(row["id"]),
    isAdmin: String(row["role"] ?? "user") === "admin",
  };
}

function mapRow(r: unknown): WebApp {
  const row = r as Record<string, unknown>;
  return {
    id: Number(row["id"]),
    userId: Number(row["user_id"]),
    ownerName: String(row["owner_name"] ?? ""),
    title: String(row["title"] ?? ""),
    description: String(row["description"] ?? ""),
    email: String(row["email"] ?? ""),
    link: String(row["link"] ?? ""),
    enabled: Number(row["enabled"] ?? 1) === 1,
    createdAt: String(row["created_at"] ?? ""),
    updatedAt: String(row["updated_at"] ?? ""),
  };
}

export const listWebApps = createServerFn({ method: "GET" }).handler(
  async (): Promise<WebApp[]> => {
    const { db, userId, isAdmin } = await requireUser();
    const sql = `SELECT w.id, w.user_id, w.title, w.description, w.email, w.link, w.enabled,
        w.created_at, w.updated_at, u.name AS owner_name
      FROM web_apps w LEFT JOIN users u ON u.id = w.user_id
      ${isAdmin ? "" : "WHERE w.user_id = ?"}
      ORDER BY w.updated_at DESC, w.id DESC`;
    const res = isAdmin
      ? await db.execute(sql)
      : await db.execute({ sql, args: [userId] });
    return res.rows.map(mapRow);
  },
);

const upsertShape = {
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(4000),
  email: optionalEmail,
  link: optionalLink,
  enabled: z.boolean(),
};

export const createWebApp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object(upsertShape).parse(input))
  .handler(async ({ data }) => {
    const { db, userId } = await requireUser();
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO web_apps (user_id, title, description, email, link, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        data.title,
        data.description,
        data.email,
        data.link,
        data.enabled ? 1 : 0,
        now,
        now,
      ],
    });
    return { ok: true as const };
  });

async function assertOwnership(
  db: Awaited<ReturnType<typeof requireUser>>["db"],
  id: number,
  userId: number,
  isAdmin: boolean,
) {
  const res = await db.execute({
    sql: "SELECT user_id FROM web_apps WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Record not found.");
  if (!isAdmin && Number(row["user_id"]) !== userId) {
    throw new Error("You do not have permission to do that.");
  }
}

export const updateWebApp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int(), ...upsertShape }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, userId, isAdmin } = await requireUser();
    await assertOwnership(db, data.id, userId, isAdmin);
    await db.execute({
      sql: `UPDATE web_apps SET title = ?, description = ?, email = ?, link = ?, enabled = ?, updated_at = ?
            WHERE id = ?`,
      args: [
        data.title,
        data.description,
        data.email,
        data.link,
        data.enabled ? 1 : 0,
        new Date().toISOString(),
        data.id,
      ],
    });
    return { ok: true as const };
  });

export const toggleWebApp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int(), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, userId, isAdmin } = await requireUser();
    await assertOwnership(db, data.id, userId, isAdmin);
    await db.execute({
      sql: "UPDATE web_apps SET enabled = ?, updated_at = ? WHERE id = ?",
      args: [data.enabled ? 1 : 0, new Date().toISOString(), data.id],
    });
    return { ok: true as const };
  });

export const deleteWebApp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { db, userId, isAdmin } = await requireUser();
    await assertOwnership(db, data.id, userId, isAdmin);
    await db.execute({ sql: "DELETE FROM web_apps WHERE id = ?", args: [data.id] });
    return { ok: true as const };
  });
