import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ApiCredentials = {
  appId: number;
  apiKey: string;
  apiSecret: string | null;
  createdAt: string;
  rotatedAt: string | null;
};

async function requireUser() {
  const { readSession } = await import("./session.server");
  const session = await readSession();
  if (!session.userId) throw new Error("Not signed in.");

  const { dbClient, ensureUsersTable, ensureWebAppsTable, ensureWebPagesTables } =
    await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureUsersTable(db);
  await ensureWebAppsTable(db);
  await ensureWebPagesTables(db);

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

type Ctx = Awaited<ReturnType<typeof requireUser>>;

async function assertApp(ctx: Ctx, appId: number) {
  const res = await ctx.db.execute({
    sql: "SELECT user_id FROM web_apps WHERE id = ? LIMIT 1",
    args: [appId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Web app not found.");
  const ownerId = Number(row["user_id"]);
  if (!ctx.isAdmin && ownerId !== ctx.userId) {
    throw new Error("You do not have permission to do that.");
  }
  return ownerId;
}

const appInput = (input: unknown) =>
  z.object({ appId: z.coerce.number().int() }).parse(input);

export const getApiCredentials = createServerFn({ method: "GET" })
  .inputValidator(appInput)
  .handler(async ({ data }): Promise<ApiCredentials> => {
    const ctx = await requireUser();
    const ownerId = await assertApp(ctx, data.appId);
    const { randomKey, hmacHex } = await import("./webapi.server");

    const existing = await ctx.db.execute({
      sql: "SELECT * FROM web_app_api_keys WHERE app_id = ? LIMIT 1",
      args: [data.appId],
    });
    const row = existing.rows[0] as Record<string, unknown> | undefined;
    if (row) {
      return {
        appId: data.appId,
        apiKey: String(row["api_key"] ?? ""),
        apiSecret: null,
        createdAt: String(row["created_at"] ?? ""),
        rotatedAt: row["rotated_at"] ? String(row["rotated_at"]) : null,
      };
    }

    const apiKey = randomKey("WA", 18);
    const apiSecret = randomKey("SEC", 32);
    const now = new Date().toISOString();
    await ctx.db.execute({
      sql: `INSERT INTO web_app_api_keys (app_id, user_id, api_key, secret_hash, created_at, rotated_at)
            VALUES (?, ?, ?, ?, ?, NULL)`,
      args: [data.appId, ownerId, apiKey, await hmacHex(`secret:${apiSecret}`), now],
    });
    return { appId: data.appId, apiKey, apiSecret, createdAt: now, rotatedAt: null };
  });

export const rotateApiSecret = createServerFn({ method: "POST" })
  .inputValidator(appInput)
  .handler(async ({ data }): Promise<ApiCredentials> => {
    const ctx = await requireUser();
    const ownerId = await assertApp(ctx, data.appId);
    const { randomKey, hmacHex } = await import("./webapi.server");

    const existing = await ctx.db.execute({
      sql: "SELECT api_key, created_at FROM web_app_api_keys WHERE app_id = ? LIMIT 1",
      args: [data.appId],
    });
    const row = existing.rows[0] as Record<string, unknown> | undefined;
    const apiKey = row ? String(row["api_key"] ?? "") : randomKey("WA", 18);
    const apiSecret = randomKey("SEC", 32);
    const now = new Date().toISOString();
    const secretHash = await hmacHex(`secret:${apiSecret}`);

    if (row) {
      await ctx.db.execute({
        sql: "UPDATE web_app_api_keys SET secret_hash = ?, rotated_at = ? WHERE app_id = ?",
        args: [secretHash, now, data.appId],
      });
    } else {
      await ctx.db.execute({
        sql: `INSERT INTO web_app_api_keys (app_id, user_id, api_key, secret_hash, created_at, rotated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [data.appId, ownerId, apiKey, secretHash, now, now],
      });
    }
    return {
      appId: data.appId,
      apiKey,
      apiSecret,
      createdAt: row ? String(row["created_at"] ?? now) : now,
      rotatedAt: now,
    };
  });
