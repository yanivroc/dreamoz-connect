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

  const { verifyApiCredentials } = await import("./webapi.server");
  const appId = await verifyApiCredentials(db, apiKey, apiSecret);
  if (appId === null) throw new Error("Invalid DREAMOZTECH API credentials.");
  return appId;
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
