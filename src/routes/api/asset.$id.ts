import { createFileRoute } from "@tanstack/react-router";

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Contact attachments: only the app owner/admin session or that app's API token. */
async function canReadContactAsset(request: Request, id: string): Promise<boolean> {
  const { dbClient } = await import("@/lib/db.server");
  const db = dbClient();
  if (!db) return false;
  const a = await db.execute({
    sql: `SELECT w.app_id, a.user_id FROM web_assets w JOIN web_apps a ON a.id = w.app_id
          WHERE w.id = ? LIMIT 1`,
    args: [id],
  });
  const row = a.rows[0] as Record<string, unknown> | undefined;
  if (!row) return false;
  const h = request.headers.get("authorization") ?? "";
  if (h.toLowerCase().startsWith("bearer ")) {
    const { verifyToken } = await import("@/lib/webapi.server");
    return (await verifyToken(h.slice(7).trim())) === Number(row["app_id"]);
  }
  const { readSession } = await import("@/lib/session.server");
  const session = await readSession();
  if (!session.userId) return false;
  if (session.userId === Number(row["user_id"])) return true;
  const u = await db.execute({
    sql: "SELECT role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [session.userId],
  });
  return String((u.rows[0] as Record<string, unknown> | undefined)?.["role"]) === "admin";
}

export const Route = createFileRoute("/api/asset/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = String(params.id ?? "");
        if (!/^[a-f0-9]{8,64}$/i.test(id)) {
          return new Response("Not found", { status: 404 });
        }

        const { dbClient, ensureWebPagesTables } = await import("@/lib/db.server");
        const db = dbClient();
        if (!db) return new Response("Not configured", { status: 500 });
        await ensureWebPagesTables(db);

        const res = await db.execute({
          sql: "SELECT mime, name, kind, data FROM web_assets WHERE id = ? LIMIT 1",
          args: [id],
        });
        const row = res.rows[0] as Record<string, unknown> | undefined;
        if (!row) return new Response("Not found", { status: 404 });

        if (String(row["kind"]) === "contact") {
          const ok = await canReadContactAsset(request, id);
          if (!ok) return new Response("Not found", { status: 404 });
        }

        const bytes = decodeBase64(String(row["data"] ?? ""));
        const name = String(row["name"] ?? "file");
        const isPdf = String(row["mime"]) === "application/pdf";

        return new Response(bytes.buffer as ArrayBuffer, {
          status: 200,
          headers: {
            "content-type": String(row["mime"] ?? "application/octet-stream"),
            "cache-control":
              String(row["kind"]) === "contact"
                ? "private, no-store"
                : "public, max-age=31536000, immutable",
            ...(isPdf
              ? {
                  "content-disposition": `inline; filename="${name.replace(/[^\w.\-]/g, "_")}"`,
                }
              : {}),
          },
        });
      },
    },
  },
});
