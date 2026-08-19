import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  apiKey: z.string().trim().min(8).max(200),
  apiSecret: z.string().trim().min(8).max(300),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/wa/token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400, headers: cors });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "apiKey and apiSecret are required." }, { status: 400, headers: cors });
        }

        const { dbClient, ensureWebPagesTables } = await import("@/lib/db.server");
        const db = dbClient();
        if (!db) {
          return Response.json({ error: "Service unavailable." }, { status: 503, headers: cors });
        }
        await ensureWebPagesTables(db);

        const res = await db.execute({
          sql: "SELECT app_id, secret_hash FROM web_app_api_keys WHERE api_key = ? LIMIT 1",
          args: [parsed.data.apiKey],
        });
        const row = res.rows[0] as Record<string, unknown> | undefined;
        const { hmacHex, signToken } = await import("@/lib/webapi.server");
        const provided = await hmacHex(`secret:${parsed.data.apiSecret}`);
        const stored = row ? String(row["secret_hash"] ?? "") : "";
        let diff = provided.length === stored.length ? 0 : 1;
        for (let i = 0; i < provided.length && i < stored.length; i++) {
          diff |= provided.charCodeAt(i) ^ stored.charCodeAt(i);
        }
        if (!row || diff !== 0) {
          return Response.json({ error: "Invalid credentials." }, { status: 401, headers: cors });
        }

        const { token, expiresIn } = await signToken(Number(row["app_id"]));
        return Response.json({ token, tokenType: "Bearer", expiresIn }, { headers: { ...cors, "Cache-Control": "no-store" } });
      },
    },
  },
});
