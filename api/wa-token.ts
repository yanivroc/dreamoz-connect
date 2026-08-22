// Vercel Node.js serverless function: web app API token endpoint.
// The in-app TanStack route (src/routes/api/public/wa/token.ts) is not served
// on Vercel, so this function handles /api/public/wa/token in production.
import { createClient } from "@libsql/client/web";
import { createHmac, timingSafeEqual } from "crypto";

export const config = { runtime: "nodejs" };

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function tokenSecret(): string {
  return (
    process.env["SESSION_SECRET"]?.trim() ||
    "dev-only-insecure-session-password-change-me"
  );
}

function hmacHex(value: string): string {
  return createHmac("sha256", tokenSecret()).update(value).digest("hex");
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const TOKEN_TTL_SECONDS = 3600;

function send(res: any, status: number, body: unknown) {
  for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

async function readBody(req: any): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }

  let body: any;
  try {
    body = await readBody(req);
  } catch {
    send(res, 400, { error: "Invalid JSON body." });
    return;
  }

  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  const apiSecret = typeof body?.apiSecret === "string" ? body.apiSecret.trim() : "";
  if (
    apiKey.length < 8 ||
    apiKey.length > 200 ||
    apiSecret.length < 8 ||
    apiSecret.length > 300
  ) {
    send(res, 400, { error: "apiKey and apiSecret are required." });
    return;
  }

  const url = process.env["TURSO_DATABASE_URL"]?.trim();
  const authToken = process.env["TURSO_AUTH_TOKEN"]?.trim();
  if (!url) {
    send(res, 503, { error: "Service unavailable." });
    return;
  }
  const db = createClient(authToken ? { url, authToken } : { url });

  let row: Record<string, unknown> | undefined;
  try {
    const result = await db.execute({
      sql: "SELECT app_id, secret_hash FROM web_app_api_keys WHERE api_key = ? LIMIT 1",
      args: [apiKey],
    });
    row = result.rows[0] as unknown as Record<string, unknown> | undefined;
  } catch {
    send(res, 503, { error: "Service unavailable." });
    return;
  }

  const provided = hmacHex(`secret:${apiSecret}`);
  const stored = row ? String(row["secret_hash"] ?? "") : "";
  const ok =
    !!row &&
    provided.length === stored.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(stored));
  if (!ok) {
    send(res, 401, { error: "Invalid credentials." });
    return;
  }

  const appId = Number(row!["app_id"]);
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${appId}.${exp}`;
  const token = `${b64url(payload)}.${hmacHex(`token:${payload}`)}`;

  send(res, 200, { token, tokenType: "Bearer", expiresIn: TOKEN_TTL_SECONDS });
}
