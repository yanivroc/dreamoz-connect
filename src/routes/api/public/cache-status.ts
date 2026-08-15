import { createFileRoute } from "@tanstack/react-router";
import { cacheStatus } from "@/lib/dreamoz.server";

const JSON_HEADERS = {
  "content-type": "application/json",
  "cache-control": "no-store",
};

export const Route = createFileRoute("/api/public/cache-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env["CACHE_BUST_TOKEN"];
        const token = new URL(request.url).searchParams.get("token");
        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
            status: 401,
            headers: JSON_HEADERS,
          });
        }
        try {
          const status = await cacheStatus();
          return new Response(JSON.stringify({ ok: true, ...status }), {
            status: 200,
            headers: JSON_HEADERS,
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: err instanceof Error ? err.message : "Status failed",
            }),
            { status: 500, headers: JSON_HEADERS },
          );
        }
      },
    },
  },
});
