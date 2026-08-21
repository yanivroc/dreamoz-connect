import { createFileRoute } from "@tanstack/react-router";

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export const Route = createFileRoute("/api/asset/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
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

        const bytes = decodeBase64(String(row["data"] ?? ""));
        const name = String(row["name"] ?? "file");
        const isPdf = String(row["kind"]) === "pdf";

        return new Response(bytes, {
          status: 200,
          headers: {
            "content-type": String(row["mime"] ?? "application/octet-stream"),
            "cache-control": "public, max-age=31536000, immutable",
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
