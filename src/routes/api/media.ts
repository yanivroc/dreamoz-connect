import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOST_SUFFIX = ".blob.vercel-storage.com";

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const src = new URL(request.url).searchParams.get("src");
        if (!src) return new Response("Missing src", { status: 400 });

        let target: URL;
        try {
          target = new URL(src);
        } catch {
          return new Response("Invalid src", { status: 400 });
        }
        if (
          target.protocol !== "https:" ||
          !target.hostname.endsWith(ALLOWED_HOST_SUFFIX)
        ) {
          return new Response("Forbidden host", { status: 403 });
        }

        const token =
          process.env["VERCEL_BLOB_TOKEN"] || process.env["BLOB_READ_WRITE_TOKEN"];
        const upstream = await fetch(target.toString(), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!upstream.ok || !upstream.body) {
          return new Response("Image unavailable", { status: upstream.status });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ?? "application/octet-stream",
            "cache-control": "public, max-age=86400, s-maxage=604800",
          },
        });
      },
    },
  },
});
