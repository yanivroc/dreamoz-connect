import { createFileRoute } from "@tanstack/react-router";
import { bustCache } from "@/lib/dreamoz.server";

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/cache-bust")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env["CACHE_BUST_TOKEN"];
        const token = new URL(request.url).searchParams.get("token");
        if (!expected || !token || token !== expected) return unauthorized();

        try {
          const result = await bustCache();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: err instanceof Error ? err.message : "Refresh failed",
            }),
            {
              status: 502,
              headers: {
                "content-type": "application/json",
                "cache-control": "no-store",
              },
            },
          );
        }
      },
    },
  },
});
