import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";

const BASE_URL = "https://dreamoztech.com/";

function isoDate(v: unknown): string | undefined {
  if (!v) return undefined;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        try {
          const router = await getRouterInstance();
          const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

          // Site pages: /page/$slug (same source and enabled filter as the page route).
          const pageRouteId = "/page/$slug";
          if (isSitemapRouteIncluded(router.routesById[pageRouteId])) {
            const { fetchSiteContent } = await import("@/lib/content.server");
            const { flattenPages, slugify } = await import("@/lib/content-types");
            const content = await fetchSiteContent();
            for (const p of flattenPages(content.pages)) {
              const slug = slugify(p.title);
              if (!slug) continue;
              const location = router.buildLocation({
                to: "/page/$slug",
                params: { slug },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, pageRouteId);
              if (path) entries.push({ path });
            }
          }

          // Community listings: same visibility filters as the Community feed, paginated.
          const communityRouteId = "/community/$id";
          if (isSitemapRouteIncluded(router.routesById[communityRouteId])) {
            const { dbClient, ensureUsersTable, ensureWebAppsTable, ensureWebPagesTables } =
              await import("@/lib/db.server");
            const { communitySlug } = await import("@/lib/content-types");
            const db = dbClient();
            if (!db) throw new Error("Database is not configured.");
            await ensureUsersTable(db);
            await ensureWebAppsTable(db);
            await ensureWebPagesTables(db);
            const nowIso = new Date().toISOString();
            const pageSize = 500;
            for (let lastId = 0; ; ) {
              const res = await db.execute({
                sql: `SELECT p.id, p.title, p.updated_at
                        FROM web_pages p
                        JOIN web_apps a ON a.id = p.app_id
                        JOIN users u ON u.id = a.user_id
                       WHERE p.id > ? AND p.enabled = 1 AND p.deleted_at IS NULL AND p.feed_enabled = 1
                         AND a.enabled = 1 AND u.deleted_at IS NULL
                         AND (u.role = 'admin'
                              OR (u.plan_expires_at IS NOT NULL AND u.plan_expires_at > ?)
                              OR u.trial_ends_at IS NULL
                              OR u.trial_ends_at > ?)
                       ORDER BY p.id ASC
                       LIMIT ?`,
                args: [lastId, nowIso, nowIso, pageSize],
              });
              const rows = res.rows as unknown as Record<string, unknown>[];
              if (rows.length === 0) break;
              for (const r of rows) {
                const id = Number(r["id"]);
                const location = router.buildLocation({
                  to: "/community/$id",
                  params: { id: communitySlug(id, String(r["title"] ?? "")) },
                  search: () => ({}),
                  hash: "",
                });
                const path = sitemapPathForLocation(router, location, communityRouteId);
                if (path) entries.push({ path, lastmod: isoDate(r["updated_at"]) });
              }
              lastId = Number(rows[rows.length - 1]!["id"]);
              if (rows.length < pageSize) break;
            }
          }

          return new Response(sitemapXML(BASE_URL, entries), {
            headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
          });
        } catch (err) {
          console.error("sitemap failed", err);
          return new Response("Sitemap temporarily unavailable", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
