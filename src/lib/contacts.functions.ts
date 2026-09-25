import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ContactMessage } from "./contacts.server";

export type { ContactMessage } from "./contacts.server";

/** Public: submit the contact form on a contact page of the public site. */
export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    return {
      raw: o,
      captchaAnswer: Number(o["captchaAnswer"]),
      captchaA: Number(o["captchaA"]),
      captchaB: Number(o["captchaB"]),
    };
  })
  .handler(async ({ data }) => {
    if (
      !Number.isFinite(data.captchaAnswer) ||
      data.captchaAnswer !== data.captchaA + data.captchaB
    ) {
      throw new Error("Spam check failed. Please try again.");
    }
    const { contactInputSchema, saveContactMessage, notifyContactMessage } = await import(
      "./contacts.server"
    );
    const parsed = contactInputSchema.safeParse(data.raw);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");

    const { resolveSiteAppId } = await import("./content.server");
    const { dbClient, ensureWebAppsTable, ensureWebPagesTables } = await import("./db.server");
    const db = dbClient();
    if (!db) throw new Error("Service unavailable.");
    await ensureWebAppsTable(db);
    await ensureWebPagesTables(db);
    const appId = await resolveSiteAppId();
    const saved = await saveContactMessage(db, appId, parsed.data);
    await notifyContactMessage(parsed.data, saved);
    return { ok: true as const, id: saved.id };
  });

async function requireAppAccess(appId: number) {
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
  const u = await db.execute({
    sql: "SELECT role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [session.userId],
  });
  const user = u.rows[0] as Record<string, unknown> | undefined;
  if (!user) throw new Error("Not signed in.");
  if (String(user["role"]) !== "admin") {
    const { assertActiveAccess } = await import("./plan-access.server");
    await assertActiveAccess(db, session.userId);
  }
  const a = await db.execute({
    sql: "SELECT user_id FROM web_apps WHERE id = ? LIMIT 1",
    args: [appId],
  });
  const app = a.rows[0] as Record<string, unknown> | undefined;
  if (!app) throw new Error("Web app not found.");
  if (String(user["role"]) !== "admin" && Number(app["user_id"]) !== session.userId) {
    throw new Error("You don't have access to this web app.");
  }
  return db;
}

async function appIdForMessage(id: number) {
  const { dbClient, ensureWebPagesTables } = await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureWebPagesTables(db);
  const r = await db.execute({
    sql: "SELECT app_id, attachment1_asset_id, attachment2_asset_id FROM contact_messages WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = r.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Message not found.");
  return row;
}

export const listContacts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ appId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }): Promise<ContactMessage[]> => {
    const db = await requireAppAccess(data.appId);
    const { listContactMessages } = await import("./contacts.server");
    return listContactMessages(db, data.appId, { limit: 500 });
  });

export const setContactRead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.number().int().positive(), read: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const row = await appIdForMessage(data.id);
    const db = await requireAppAccess(Number(row["app_id"]));
    await db.execute({
      sql: "UPDATE contact_messages SET is_read = ? WHERE id = ?",
      args: [data.read ? 1 : 0, data.id],
    });
    return { ok: true as const };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }) => {
    const row = await appIdForMessage(data.id);
    const db = await requireAppAccess(Number(row["app_id"]));
    const assets = [row["attachment1_asset_id"], row["attachment2_asset_id"]].filter(Boolean);
    for (const a of assets) {
      await db.execute({ sql: "DELETE FROM web_assets WHERE id = ? AND kind = 'contact'", args: [String(a)] });
    }
    await db.execute({ sql: "DELETE FROM contact_messages WHERE id = ?", args: [data.id] });
    return { ok: true as const };
  });
