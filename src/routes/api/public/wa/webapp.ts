import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/wa/webapp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ")
          ? auth.slice(7).trim()
          : "";
        const { verifyToken } = await import("@/lib/webapi.server");
        const appId = token ? await verifyToken(token) : null;
        if (appId === null) {
          return Response.json(
            { error: "Missing or invalid bearer token." },
            { status: 401, headers: cors },
          );
        }

        const { dbClient, ensureWebAppsTable, ensureWebPagesTables } = await import(
          "@/lib/db.server"
        );
        const db = dbClient();
        if (!db) {
          return Response.json(
            { error: "Service unavailable." },
            { status: 503, headers: cors },
          );
        }
        await ensureWebAppsTable(db);
        await ensureWebPagesTables(db);

        const { appOwnerHasAccess, PLAN_EXPIRED_BODY } = await import("@/lib/plan-access.server");
        if (!(await appOwnerHasAccess(db, appId))) {
          return Response.json(PLAN_EXPIRED_BODY, { status: 402, headers: cors });
        }

        const { buildWebAppPayload } = await import("@/lib/webapp-payload.server");
        const payload = await buildWebAppPayload(db, appId);
        if (!payload) {
          return Response.json(
            { error: "Web app not found." },
            { status: 404, headers: cors },
          );
        }
        return Response.json(payload, {
          headers: { ...cors, "Cache-Control": "no-store" },
        });
      },
    },
  },
});
