import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currencyFor, normalizeCountry } from "./locale";

export type CommunityItem = {
  id: number;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  isProduct: boolean;
  isContact: boolean;
  price: number | null;
  currency: string;
  parentTitle: string | null;
  childCount: number;
  appId: number;
  appTitle: string;
  ownerName: string;
  minQty: number | null;
  maxQty: number | null;
  shippingPrice: number | null;
  internalSlug: string | null;
  updatedAt: string;
};

export type CommunityPage = {
  id: number;
  title: string;
  description: string;
  seoDescription: string;
  embedCode: string;
  hyperlink: string;
  isProduct: boolean;
  price: number | null;
  currency: string;
  parentTitle: string | null;
  parentId: number | null;
  appId: number;
  appTitle: string;
  ownerName: string;
  minQty: number | null;
  maxQty: number | null;
  shippingPrice: number | null;
  images: { id: number; url: string; alt: string; hyperlink: string }[];
  contactEnabled: boolean;
  children: {
    id: number;
    title: string;
    excerpt: string;
    price: number | null;
    isProduct: boolean;
    imageUrl: string | null;
  }[];
  internalSlug: string | null;
};


type Row = Record<string, unknown>;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function plain(html: string, len = 180): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, len);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function openDb() {
  const { dbClient, ensureUsersTable, ensureWebAppsTable, ensureWebPagesTables } =
    await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureUsersTable(db);
  await ensureWebAppsTable(db);
  await ensureWebPagesTables(db);
  return db;
}

async function siteAppId(): Promise<number | null> {
  try {
    const { resolveSiteAppId } = await import("./content.server");
    return await resolveSiteAppId();
  } catch {
    return null;
  }
}

/**
 * SQL fragment: the page owner is an admin, on a paid plan, or still in trial.
 * Expired members drop out of the Community directory automatically.
 */
const OWNER_ACTIVE_SQL = `(u.role = 'admin'
   OR (u.plan_expires_at IS NOT NULL AND u.plan_expires_at > ?)
   OR u.trial_ends_at IS NULL
   OR u.trial_ends_at > ?)`;

export const listCommunityFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<CommunityItem[]> => {
    let db;
    try {
      db = await openDb();
    } catch {
      return [];
    }
    const homeAppId = await siteAppId();
    const nowIso = new Date().toISOString();
    let res;
    try {
      res = await db.execute({
        sql: `
        SELECT p.id, p.title, p.description, p.seo_description, p.product_enabled,
               p.contact_enabled, p.price, p.min_qty, p.max_qty, p.shipping_price,
               p.app_id, p.updated_at,

               parent.title AS parent_title,
               a.title AS app_title,
               u.name AS owner_name,
               s.country AS country,
               (SELECT COUNT(*) FROM web_pages c WHERE c.parent_id = p.id AND c.enabled = 1) AS child_count
          FROM web_pages p
          JOIN web_apps a ON a.id = p.app_id
          JOIN users u ON u.id = a.user_id
          LEFT JOIN web_pages parent ON parent.id = p.parent_id
          LEFT JOIN web_app_settings s ON s.app_id = a.id
         WHERE p.enabled = 1 AND p.feed_enabled = 1 AND a.enabled = 1 AND u.deleted_at IS NULL
           AND ${OWNER_ACTIVE_SQL}
         ORDER BY p.updated_at DESC
         LIMIT 60`,
        args: [nowIso, nowIso],
      });
    } catch {
      return [];
    }
    const rows = res.rows as unknown as Row[];
    if (rows.length === 0) return [];

    const ids = rows.map((r) => Number(r["id"]));
    const imgRes = await db.execute({
      sql: `SELECT page_id, mime, data, alt FROM web_page_images
             WHERE page_id IN (${ids.map(() => "?").join(",")})
             ORDER BY order_no ASC, id ASC`,
      args: ids,
    });
    const firstImage = new Map<number, string>();
    for (const r of imgRes.rows as unknown as Row[]) {
      const pid = Number(r["page_id"]);
      if (firstImage.has(pid)) continue;
      firstImage.set(pid, `data:${String(r["mime"] ?? "")};base64,${String(r["data"] ?? "")}`);
    }

    return rows.map((r) => {
      const title = String(r["title"] ?? "");
      const appId = Number(r["app_id"]);
      return {
        id: Number(r["id"]),
        title,
        excerpt: String(r["seo_description"] ?? "") || plain(String(r["description"] ?? "")),
        imageUrl: firstImage.get(Number(r["id"])) ?? null,
        isProduct: Number(r["product_enabled"] ?? 0) === 1,
        isContact: Number(r["contact_enabled"] ?? 0) === 1,
        price: num(r["price"]),
        currency: currencyFor(normalizeCountry(r["country"])),
        parentTitle: r["parent_title"] ? String(r["parent_title"]) : null,
        childCount: Number(r["child_count"] ?? 0),
        appId,
        appTitle: String(r["app_title"] ?? ""),
        ownerName: String(r["owner_name"] ?? ""),
        minQty: num(r["min_qty"]),
        maxQty: num(r["max_qty"]),
        shippingPrice: num(r["shipping_price"]),

        internalSlug: homeAppId !== null && appId === homeAppId ? slugify(title) : null,
        updatedAt: String(r["updated_at"] ?? ""),
      };
    });
  },
);

export const getCommunityPage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.coerce.number().int() }).parse(input))
  .handler(async ({ data }): Promise<CommunityPage | null> => {
    const db = await openDb();
    const homeAppId = await siteAppId();
    const nowIso = new Date().toISOString();
    const res = await db.execute({
      sql: `SELECT p.*, parent.title AS parent_title, a.title AS app_title,
                   u.name AS owner_name, s.country AS country
              FROM web_pages p
              JOIN web_apps a ON a.id = p.app_id
              JOIN users u ON u.id = a.user_id
              LEFT JOIN web_pages parent ON parent.id = p.parent_id
              LEFT JOIN web_app_settings s ON s.app_id = a.id
             WHERE p.id = ? AND p.enabled = 1 AND p.feed_enabled = 1 AND a.enabled = 1 AND u.deleted_at IS NULL
               AND ${OWNER_ACTIVE_SQL}
             LIMIT 1`,
      args: [data.id, nowIso, nowIso],
    });
    const r = res.rows[0] as unknown as Row | undefined;
    if (!r) return null;

    const imgRes = await db.execute({
      sql: `SELECT id, mime, data, alt, hyperlink FROM web_page_images
             WHERE page_id = ? ORDER BY order_no ASC, id ASC`,
      args: [data.id],
    });
    const kidsRes = await db.execute({
      sql: `SELECT id, title, description, seo_description, price, product_enabled FROM web_pages
             WHERE parent_id = ? AND enabled = 1 AND feed_enabled = 1
             ORDER BY order_no ASC, id ASC`,
      args: [data.id],
    });
    const kidRows = kidsRes.rows as unknown as Row[];
    const kidImage = new Map<number, string>();
    if (kidRows.length > 0) {
      const kidIds = kidRows.map((c) => Number(c["id"]));
      const kImg = await db.execute({
        sql: `SELECT page_id, mime, data FROM web_page_images
               WHERE page_id IN (${kidIds.map(() => "?").join(",")})
               ORDER BY order_no ASC, id ASC`,
        args: kidIds,
      });
      for (const i of kImg.rows as unknown as Row[]) {
        const pid = Number(i["page_id"]);
        if (!kidImage.has(pid)) {
          kidImage.set(pid, `data:${String(i["mime"] ?? "")};base64,${String(i["data"] ?? "")}`);
        }
      }
    }

    const title = String(r["title"] ?? "");
    return {
      id: Number(r["id"]),
      title,
      description: String(r["description"] ?? ""),
      seoDescription: String(r["seo_description"] ?? ""),
      embedCode: String(r["embed_code"] ?? ""),
      hyperlink: String(r["hyperlink"] ?? ""),
      isProduct: Number(r["product_enabled"] ?? 0) === 1,
      contactEnabled: Number(r["contact_enabled"] ?? 0) === 1,
      price: num(r["price"]),
      currency: currencyFor(normalizeCountry(r["country"])),
      parentTitle: r["parent_title"] ? String(r["parent_title"]) : null,
      parentId: r["parent_title"] && r["parent_id"] != null ? Number(r["parent_id"]) : null,
      appId: Number(r["app_id"]),
      appTitle: String(r["app_title"] ?? ""),
      ownerName: String(r["owner_name"] ?? ""),
      minQty: num(r["min_qty"]),
      maxQty: num(r["max_qty"]),
      shippingPrice: num(r["shipping_price"]),

      internalSlug:
        homeAppId !== null && Number(r["app_id"]) === homeAppId ? slugify(title) : null,
      images: (imgRes.rows as unknown as Row[]).map((i) => ({
        id: Number(i["id"]),
        url: `data:${String(i["mime"] ?? "")};base64,${String(i["data"] ?? "")}`,
        alt: String(i["alt"] ?? ""),
        hyperlink: String(i["hyperlink"] ?? ""),
      })),
      children: kidRows.map((c) => ({
        id: Number(c["id"]),
        title: String(c["title"] ?? ""),
        excerpt:
          String(c["seo_description"] ?? "") || plain(String(c["description"] ?? ""), 120),
        price: num(c["price"]),
        isProduct: Number(c["product_enabled"] ?? 0) === 1,
        imageUrl: kidImage.get(Number(c["id"])) ?? null,
      })),
    };
  });

/** Global sale commission percentage, set by an admin. */
export const getCommissionSetting = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ percent: number; canEdit: boolean }> => {
    let db;
    try {
      db = await openDb();
    } catch {
      return { percent: 0, canEdit: false };
    }
    let percent = 0;
    try {
      const res = await db.execute(
        "SELECT value FROM platform_settings WHERE key = 'commission_percent' LIMIT 1",
      );
      const v = Number((res.rows[0] as Row | undefined)?.["value"]);
      if (Number.isFinite(v)) percent = v;
    } catch {
      percent = 0;
    }
    let canEdit = false;
    try {
      const { readSession } = await import("./session.server");
      const session = await readSession();
      if (session.userId) {
        const who = await db.execute({
          sql: "SELECT role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
          args: [session.userId],
        });
        canEdit = String((who.rows[0] as Row | undefined)?.["role"] ?? "user") === "admin";
      }
    } catch {
      canEdit = false;
    }
    return { percent, canEdit };
  },
);

export const saveCommissionSetting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ percent: z.coerce.number().min(0).max(100) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { readSession } = await import("./session.server");
    const session = await readSession();
    if (!session.userId) throw new Error("Not signed in.");
    const db = await openDb();
    const who = await db.execute({
      sql: "SELECT role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      args: [session.userId],
    });
    if (String((who.rows[0] as Row | undefined)?.["role"] ?? "user") !== "admin") {
      throw new Error("You do not have permission to do that.");
    }
    const { ensureBillingTables } = await import("./db.server");
    await ensureBillingTables(db);
    await db.execute({
      sql: "INSERT INTO platform_settings (key, value) VALUES ('commission_percent', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: [String(data.percent)],
    });
    return { ok: true as const };
  });
