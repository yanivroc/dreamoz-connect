import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_BASE64 = 1_400_000;
const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const PDF_MIME = "application/pdf";

export type UploadedAsset = { id: string; url: string; name: string; kind: string };

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

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const uploadSchema = z.object({
  appId: z.number().int().positive().nullable().optional(),
  kind: z.enum(["image", "pdf"]),
  mime: z.string().trim().max(100),
  name: z.string().trim().max(200).default(""),
  data: z.string().max(MAX_BASE64),
});

export const uploadAsset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => uploadSchema.parse(d))
  .handler(async ({ data }): Promise<UploadedAsset> => {
    const ctx = await requireUser();

    const allowed = data.kind === "pdf" ? [PDF_MIME] : IMAGE_MIMES;
    if (!allowed.includes(data.mime)) throw new Error("Unsupported file type.");
    if (!data.data) throw new Error("That file is empty.");
    if (data.data.length > MAX_BASE64) throw new Error("That file is too large (max 1MB).");

    if (data.appId) {
      const res = await ctx.db.execute({
        sql: "SELECT user_id FROM web_apps WHERE id = ? LIMIT 1",
        args: [data.appId],
      });
      const row = res.rows[0] as Record<string, unknown> | undefined;
      if (!row) throw new Error("Web app not found.");
      if (!ctx.isAdmin && Number(row["user_id"]) !== ctx.userId) {
        throw new Error("You do not have permission to do that.");
      }
    }

    const id = newId();
    await ctx.db.execute({
      sql: `INSERT INTO web_assets (id, user_id, app_id, kind, mime, name, data, size, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        ctx.userId,
        data.appId ?? null,
        data.kind,
        data.mime,
        data.name ?? "",
        data.data,
        Math.round((data.data.length * 3) / 4),
        new Date().toISOString(),
      ],
    });

    return { id, url: `/api/asset/${id}`, name: data.name ?? "", kind: data.kind };
  });

export const deleteAsset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().max(64) }).parse(d))
  .handler(async ({ data }) => {
    const ctx = await requireUser();
    const res = await ctx.db.execute({
      sql: "SELECT user_id FROM web_assets WHERE id = ? LIMIT 1",
      args: [data.id],
    });
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) return { ok: true };
    if (!ctx.isAdmin && Number(row["user_id"]) !== ctx.userId) {
      throw new Error("You do not have permission to do that.");
    }
    await ctx.db.execute({ sql: "DELETE FROM web_assets WHERE id = ?", args: [data.id] });
    return { ok: true };
  });
