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
  appTitle: string;
  ownerName: string;
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
  appTitle: string;
  ownerName: string;
  internalSlug: string | null;
  images: { id: number; url: string; alt: string; hyperlink: string }[];
  children: { id: number; title: string; excerpt: string; price: number | null }[];
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

export const listCommunityFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<CommunityItem[]> => {
    let db;
    try {
      db = await openDb();
    } catch {
      return [];
    }
    const homeAppId = await siteAppId();
    let res;
    try {
      res = await db.execute(`
        SELECT p.id, p.title, p.description, p.seo_description, p.product_enabled,
               p.contact_enabled, p.price, p.app_id, p.updated_at,
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
         WHERE p.enabled = 1 AND p.feed_enabled = 1 AND u.deleted_at IS NULL
         ORDER BY p.updated_at DESC
         LIMIT 60`);
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
        appTitle: String(r["app_title"] ?? ""),
        ownerName: String(r["owner_name"] ?? ""),
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
    const res = await db.execute({
      sql: `SELECT p.*, parent.title AS parent_title, a.title AS app_title,
                   u.name AS owner_name, s.country AS country
              FROM web_pages p
              JOIN web_apps a ON a.id = p.app_id
              JOIN users u ON u.id = a.user_id
              LEFT JOIN web_pages parent ON parent.id = p.parent_id
              LEFT JOIN web_app_settings s ON s.app_id = a.id
             WHERE p.id = ? AND p.enabled = 1 AND p.feed_enabled = 1 AND u.deleted_at IS NULL
             LIMIT 1`,
      args: [data.id],
    });
    const r = res.rows[0] as unknown as Row | undefined;
    if (!r) return null;

    const imgRes = await db.execute({
      sql: `SELECT id, mime, data, alt, hyperlink FROM web_page_images
             WHERE page_id = ? ORDER BY order_no ASC, id ASC`,
      args: [data.id],
    });
    const kidsRes = await db.execute({
      sql: `SELECT id, title, description, seo_description, price FROM web_pages
             WHERE parent_id = ? AND enabled = 1 AND feed_enabled = 1
             ORDER BY order_no ASC, id ASC`,
      args: [data.id],
    });

    const title = String(r["title"] ?? "");
    return {
      id: Number(r["id"]),
      title,
      description: String(r["description"] ?? ""),
      seoDescription: String(r["seo_description"] ?? ""),
      embedCode: String(r["embed_code"] ?? ""),
      hyperlink: String(r["hyperlink"] ?? ""),
      isProduct: Number(r["product_enabled"] ?? 0) === 1,
      price: num(r["price"]),
      currency: currencyFor(normalizeCountry(r["country"])),
      parentTitle: r["parent_title"] ? String(r["parent_title"]) : null,
      appTitle: String(r["app_title"] ?? ""),
      ownerName: String(r["owner_name"] ?? ""),
      internalSlug:
        homeAppId !== null && Number(r["app_id"]) === homeAppId ? slugify(title) : null,
      images: (imgRes.rows as unknown as Row[]).map((i) => ({
        id: Number(i["id"]),
        url: `data:${String(i["mime"] ?? "")};base64,${String(i["data"] ?? "")}`,
        alt: String(i["alt"] ?? ""),
        hyperlink: String(i["hyperlink"] ?? ""),
      })),
      children: (kidsRes.rows as unknown as Row[]).map((c) => ({
        id: Number(c["id"]),
        title: String(c["title"] ?? ""),
        excerpt:
          String(c["seo_description"] ?? "") || plain(String(c["description"] ?? ""), 120),
        price: num(c["price"]),
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
