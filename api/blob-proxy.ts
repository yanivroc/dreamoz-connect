// Vercel Node.js serverless function: proxy for private Vercel Blob media.
// The in-app TanStack route (src/routes/api/media.ts) is not served on Vercel,
// so this function handles /api/media in production.
import type { IncomingMessage, ServerResponse } from "http";

export const config = { runtime: "nodejs" };

const ALLOWED_HOST_SUFFIX = ".blob.vercel-storage.com";

export default async function handler(
  req: IncomingMessage & { url?: string },
  res: ServerResponse,
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");
  const src = url.searchParams.get("src");
  if (!src) {
    res.statusCode = 400;
    res.end("Missing src");
    return;
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    res.statusCode = 400;
    res.end("Invalid src");
    return;
  }

  if (target.protocol !== "https:" || !target.hostname.endsWith(ALLOWED_HOST_SUFFIX)) {
    res.statusCode = 403;
    res.end("Forbidden host");
    return;
  }

  const token =
    process.env["VERCEL_BLOB_TOKEN"] || process.env["BLOB_READ_WRITE_TOKEN"] || "";

  try {
    const upstream = await fetch(target.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.end("Image unavailable");
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = 200;
    res.setHeader(
      "content-type",
      upstream.headers.get("content-type") ?? "application/octet-stream",
    );
    res.setHeader("content-length", String(buf.length));
    res.setHeader("cache-control", "public, max-age=86400, s-maxage=604800");
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(buf);
  } catch {
    res.statusCode = 502;
    res.end("Upstream fetch failed");
  }
}
