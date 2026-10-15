// Vercel Node.js serverless function: serves uploaded editor images/PDFs.
// Handles /api/asset/:id in production (the in-app TanStack route is not served on Vercel).
// Contact attachments are private and are not served from here.
import { createClient } from "@libsql/client/web";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any) {
  const id = String(req.query?.id ?? "");
  if (!/^[a-f0-9]{8,64}$/i.test(id)) {
    res.statusCode = 404;
    return res.end("Not found");
  }
  const url = process.env["TURSO_DATABASE_URL"]?.trim();
  const authToken = process.env["TURSO_AUTH_TOKEN"]?.trim();
  if (!url) {
    res.statusCode = 500;
    return res.end("Not configured");
  }
  const db = createClient(authToken ? { url, authToken } : { url });
  try {
    const r = await db.execute({
      sql: "SELECT mime, name, kind, data FROM web_assets WHERE id = ? LIMIT 1",
      args: [id],
    });
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row || String(row["kind"]) === "contact") {
      res.statusCode = 404;
      return res.end("Not found");
    }
    const mime = String(row["mime"] ?? "application/octet-stream");
    const bytes = Buffer.from(String(row["data"] ?? ""), "base64");
    res.statusCode = 200;
    res.setHeader("content-type", mime);
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    if (mime === "application/pdf") {
      const name = String(row["name"] ?? "file").replace(/[^\w.\-]/g, "_");
      res.setHeader("content-disposition", `inline; filename="${name}"`);
    }
    return res.end(bytes);
  } catch {
    res.statusCode = 500;
    return res.end("Error");
  } finally {
    db.close();
  }
}
