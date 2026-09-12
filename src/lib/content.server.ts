// Server-only: loads the public site content straight from the web app that
// belongs to DREAMOZTECH_API_KEY / DREAMOZTECH_API_SECRET (the same keys the
// API tab issues). No HTTP round-trip to /api/public/wa/* is needed because the
// builder lives in this project.
import type { SiteContent } from "./content-types";

const CONTENT_TTL_MS = 60_000;

let cache: { content: SiteContent; expires: number } | null = null;
let inflight: Promise<SiteContent> | null = null;

async function resolveAppId(): Promise<number> {
  const apiKey = process.env["DREAMOZTECH_API_KEY"]?.trim();
  const apiSecret = process.env["DREAMOZTECH_API_SECRET"]?.trim();
  if (!apiKey || !apiSecret) {
    throw new Error("DREAMOZTECH_API_KEY / DREAMOZTECH_API_SECRET are not configured.");
  }
  const { dbClient, ensureWebPagesTables } = await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureWebPagesTables(db);

  const res = await db.execute({
    sql: "SELECT app_id, secret_hash FROM web_app_api_keys WHERE api_key = ? LIMIT 1",
    args: [apiKey],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  const { hmacHex } = await import("./webapi.server");
  const provided = await hmacHex(`secret:${apiSecret}`);
  const stored = row ? String(row["secret_hash"] ?? "") : "";
  let diff = provided.length === stored.length ? 0 : 1;
  for (let i = 0; i < provided.length && i < stored.length; i++) {
    diff |= provided.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  if (!row || diff !== 0) throw new Error("Invalid DREAMOZTECH API credentials.");
  return Number(row["app_id"]);
}

async function load(): Promise<SiteContent> {
  const appId = await resolveAppId();
  const { dbClient, ensureWebAppsTable, ensureWebPagesTables } = await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureWebAppsTable(db);
  await ensureWebPagesTables(db);
  const { buildWebAppPayload } = await import("./webapp-payload.server");
  const payload = await buildWebAppPayload(db, appId);
  if (!payload) throw new Error("Web app not found.");
  return payload as unknown as SiteContent;
}

export async function fetchSiteContent(): Promise<SiteContent> {
  if (cache && cache.expires > Date.now()) return cache.content;
  if (!inflight) {
    inflight = load()
      .then((content) => {
        cache = { content, expires: Date.now() + CONTENT_TTL_MS };
        return content;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (err) {
    if (cache) return cache.content;
    throw err;
  }
}

/** Drop the in-memory copy so the next request re-reads the database. */
export function invalidateSiteContent(): void {
  cache = null;
}
