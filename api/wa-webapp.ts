// Vercel Node.js serverless function: web app data endpoint.
// The in-app TanStack route (src/routes/api/public/wa/webapp.ts) is not served
// on Vercel, so this function handles /api/public/wa/webapp in production.
import { createClient } from "@libsql/client/web";
import { createHmac, timingSafeEqual } from "crypto";

export const config = { runtime: "nodejs" };

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type Row = Record<string, unknown>;

type PageImage = {
  id: number;
  alt: string;
  hyperlink: string;
  orderNo: number;
  url: string;
};

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

function tokenSecret(): string {
  return (
    process.env["SESSION_SECRET"]?.trim() ||
    "dev-only-insecure-session-password-change-me"
  );
}

function hmacHex(value: string): string {
  return createHmac("sha256", tokenSecret()).update(value).digest("hex");
}

function verifyToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  let payload: string;
  try {
    payload = Buffer.from(
      parts[0]!.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
  } catch {
    return null;
  }
  const expected = hmacHex(`token:${payload}`);
  const given = parts[1]!;
  if (expected.length !== given.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return null;
  const [appIdRaw, expRaw] = payload.split(".");
  const appId = Number(appIdRaw);
  const exp = Number(expRaw);
  if (!Number.isFinite(appId) || !Number.isFinite(exp)) return null;
  if (exp * 1000 < Date.now()) return null;
  return appId;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function send(res: any, status: number, body: unknown) {
  for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }

  const auth = String(req.headers?.["authorization"] ?? "");
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const appId = token ? verifyToken(token) : null;
  if (appId === null) {
    send(res, 401, { error: "Missing or invalid bearer token." });
    return;
  }

  const url = process.env["TURSO_DATABASE_URL"]?.trim();
  const authToken = process.env["TURSO_AUTH_TOKEN"]?.trim();
  if (!url) {
    send(res, 503, { error: "Service unavailable." });
    return;
  }
  const db = createClient(authToken ? { url, authToken } : { url });

  try {
    const appRes = await db.execute({
      sql: "SELECT * FROM web_apps WHERE id = ? LIMIT 1",
      args: [appId],
    });
    const app = appRes.rows[0] as unknown as Row | undefined;
    if (!app) {
      send(res, 404, { error: "Web app not found." });
      return;
    }

    const settingsRes = await db.execute({
      sql: "SELECT * FROM web_app_settings WHERE app_id = ? LIMIT 1",
      args: [appId],
    });
    const s = settingsRes.rows[0] as unknown as Row | undefined;

    const pagesRes = await db.execute({
      sql: "SELECT * FROM web_pages WHERE app_id = ? ORDER BY order_no ASC, id ASC",
      args: [appId],
    });
    const imgRes = await db.execute({
      sql: `SELECT i.id, i.page_id, i.mime, i.data, i.alt, i.hyperlink, i.order_no
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
        hyperlink: String(r["hyperlink"] ?? ""),
        orderNo: Number(r["order_no"] ?? 0),
        url: `data:${String(r["mime"] ?? "")};base64,${String(r["data"] ?? "")}`,
      });
      images.set(pid, list);
    }

    const mapPage = (r: Row): PageNode => ({
      id: Number(r["id"]),
      parentId:
        r["parent_id"] === null || r["parent_id"] === undefined
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
      children: [],
    });

    const all = (pagesRes.rows as unknown as Row[]).map(mapPage);
    const byId = new Map(all.map((p) => [p.id, p]));
    const roots: PageNode[] = [];
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

    send(res, 200, {
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
    });
  } catch {
    send(res, 503, { error: "Service unavailable." });
  }
}
