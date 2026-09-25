import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function auth(request: Request) {
  const h = request.headers.get("authorization") ?? "";
  const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
  const { verifyToken } = await import("@/lib/webapi.server");
  return token ? verifyToken(token) : null;
}

async function db() {
  const { dbClient, ensureWebAppsTable, ensureWebPagesTables } = await import("@/lib/db.server");
  const c = dbClient();
  if (!c) return null;
  await ensureWebAppsTable(c);
  await ensureWebPagesTables(c);
  return c;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/wa/contacts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const appId = await auth(request);
        if (appId === null) return json({ error: "Missing or invalid bearer token." }, 401);
        const c = await db();
        if (!c) return json({ error: "Service unavailable." }, 503);
        const url = new URL(request.url);
        const pageId = Number(url.searchParams.get("pageId") ?? "") || null;
        const limit = Number(url.searchParams.get("limit") ?? "") || 100;
        const offset = Number(url.searchParams.get("offset") ?? "") || 0;
        const { listContactMessages } = await import("@/lib/contacts.server");
        const messages = await listContactMessages(c, appId, { pageId, limit, offset });
        return json({ messages });
      },
      POST: async ({ request }) => {
        const appId = await auth(request);
        if (appId === null) return json({ error: "Missing or invalid bearer token." }, 401);
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body." }, 400);
        }
        const { contactInputSchema, saveContactMessage, notifyContactMessage } = await import(
          "@/lib/contacts.server"
        );
        const parsed = contactInputSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, 400);
        }
        const c = await db();
        if (!c) return json({ error: "Service unavailable." }, 503);
        try {
          const saved = await saveContactMessage(c, appId, parsed.data);
          await notifyContactMessage(parsed.data, saved);
          return json({ ok: true, id: saved.id }, 201);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "Could not save." }, 400);
        }
      },
    },
  },
});
