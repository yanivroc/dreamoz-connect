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

        const { verifyApiCredentials, signToken } = await import("@/lib/webapi.server");
        const appId = await verifyApiCredentials(
          db,
          parsed.data.apiKey,
          parsed.data.apiSecret,
        );
        if (appId === null) {
          return Response.json({ error: "Invalid credentials." }, { status: 401, headers: cors });
        }

        const { appOwnerHasAccess, PLAN_EXPIRED_BODY } = await import("@/lib/plan-access.server");
        if (!(await appOwnerHasAccess(db, appId))) {
          return Response.json(PLAN_EXPIRED_BODY, { status: 402, headers: cors });
        }

        const { token, expiresIn } = await signToken(appId);
        return Response.json({ token, tokenType: "Bearer", expiresIn }, { headers: { ...cors, "Cache-Control": "no-store" } });
      },
    },
  },
});
