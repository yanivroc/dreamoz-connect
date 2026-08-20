import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type Row = Record<string, unknown>;

type PageImage = { id: number; alt: string; orderNo: number; url: string };

type PageNode = {
  id: number;
  parentId: number | null;
  orderNo: number;
  title: string;
  description: string;
  seoDescription: string;
  keywords: string;
  enabled: boolean;
  videoUrl: string;
  videoEmbed: string;
  hyperlink: string;
  product: {
    enabled: boolean;
    price: number | null;
    minQty: number | null;
    maxQty: number | null;
    shippingPrice: number | null;
  };
  images: PageImage[];
  createdAt: string;
  updatedAt: string;
  children: PageNode[];
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const Route = createFileRoute("/api/public/wa/webapp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ")
          ? auth.slice(7).trim()
          : "";
        const { verifyToken } = await import("@/lib/webapi.server");
        const appId = token ? await verifyToken(token) : null;
        if (appId === null) {
          return Response.json(
            { error: "Missing or invalid bearer token." },
            { status: 401, headers: cors },
          );
        }

        const { dbClient, ensureWebAppsTable, ensureWebPagesTables } = await import(
          "@/lib/db.server"
        );
        const db = dbClient();
        if (!db) {
          return Response.json(
            { error: "Service unavailable." },
            { status: 503, headers: cors },
          );
        }
        await ensureWebAppsTable(db);
        await ensureWebPagesTables(db);

        const appRes = await db.execute({
          sql: "SELECT * FROM web_apps WHERE id = ? LIMIT 1",
          args: [appId],
        });
        const app = appRes.rows[0] as Row | undefined;
        if (!app) {
          return Response.json(
            { error: "Web app not found." },
            { status: 404, headers: cors },
          );
        }

        const settingsRes = await db.execute({
          sql: "SELECT * FROM web_app_settings WHERE app_id = ? LIMIT 1",
          args: [appId],
        });
        const s = settingsRes.rows[0] as Row | undefined;

        const pagesRes = await db.execute({
          sql: "SELECT * FROM web_pages WHERE app_id = ? ORDER BY order_no ASC, id ASC",
          args: [appId],
        });
        const imgRes = await db.execute({
          sql: `SELECT i.id, i.page_id, i.mime, i.data, i.alt, i.order_no
                FROM web_page_images i
                JOIN web_pages p ON p.id = i.page_id
                WHERE p.app_id = ?
                ORDER BY i.order_no ASC, i.id ASC`,
          args: [appId],
        });

        const images = new Map<number, PageImage[]>();
        for (const r of imgRes.rows as unknown as Row[]) {
          const pid = Number(r["page_id"]);
          const list = images.get(pid) ?? [];
          list.push({
            id: Number(r["id"]),
            alt: String(r["alt"] ?? ""),
            orderNo: Number(r["order_no"] ?? 0),
            url: `data:${String(r["mime"] ?? "")};base64,${String(r["data"] ?? "")}`,
          });
          images.set(pid, list);
        }

        const mapPage = (r: Row): PageNode => ({
          id: Number(r["id"]),
          parentId: r["parent_id"] === null || r["parent_id"] === undefined
            ? null
            : Number(r["parent_id"]),
          orderNo: Number(r["order_no"] ?? 0),
          title: String(r["title"] ?? ""),
          description: String(r["description"] ?? ""),
          seoDescription: String(r["seo_description"] ?? ""),
          keywords: String(r["keywords"] ?? ""),
          enabled: Number(r["enabled"] ?? 0) === 1,
          videoUrl: String(r["video_url"] ?? ""),
          videoEmbed: String(r["video_embed"] ?? ""),
          hyperlink: String(r["hyperlink"] ?? ""),
          product: {
            enabled: Number(r["product_enabled"] ?? 0) === 1,
            price: num(r["price"]),
            minQty: num(r["min_qty"]),
            maxQty: num(r["max_qty"]),
            shippingPrice: num(r["shipping_price"]),
          },
          images: images.get(Number(r["id"])) ?? [],
          createdAt: String(r["created_at"] ?? ""),
          updatedAt: String(r["updated_at"] ?? ""),
          children: [] as PageNode[],
        });

        const all = (pagesRes.rows as unknown as Row[]).map(mapPage);
        const byId = new Map(all.map((p) => [p.id, p]));
        const roots: typeof all = [];
        for (const p of all) {
          if (p.parentId !== null && byId.has(p.parentId)) {
            byId.get(p.parentId)!.children.push(p);
          } else {
            roots.push(p);
          }
        }

        const ratesRes = await db.execute({
          sql: `SELECT rate_type, threshold, rate, currency
                FROM web_app_shipping_rates WHERE app_id = ?
                ORDER BY rate_type ASC, threshold ASC`,
          args: [appId],
        });
        const shippingRates = (ratesRes.rows as unknown as Row[]).map((r) => ({
          type: String(r["rate_type"] ?? "qty"),
          threshold: Number(r["threshold"] ?? 0),
          rate: Number(r["rate"] ?? 0),
          currency: String(r["currency"] ?? "AUD"),
        }));

        const logoData = s?.["logo_data"] ? String(s["logo_data"]) : "";
        const favData = s?.["favicon_data"] ? String(s["favicon_data"]) : "";

        return Response.json(
          {
            webApp: {
              id: Number(app["id"]),
              title: String(app["title"] ?? ""),
              description: String(app["description"] ?? ""),
              email: String(app["email"] ?? ""),
              link: String(app["link"] ?? ""),
              enabled: Number(app["enabled"] ?? 0) === 1,
              createdAt: String(app["created_at"] ?? ""),
              updatedAt: String(app["updated_at"] ?? ""),
            },
            settings: {
              logo: logoData
                ? `data:${String(s?.["logo_mime"] ?? "")};base64,${logoData}`
                : null,
              favicon: favData
                ? `data:${String(s?.["favicon_mime"] ?? "")};base64,${favData}`
                : null,
            },
            shippingRates: {
              byQuantity: shippingRates.filter((r) => r.type === "qty"),
              byAmount: shippingRates.filter((r) => r.type === "amount"),
            },
            pages: roots,
          },
          { headers: { ...cors, "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
