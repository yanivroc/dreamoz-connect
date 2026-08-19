import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type WebPageImage = {
  id: number;
  mime: string;
  data: string;
  alt: string;
  orderNo: number;
};

export type WebPage = {
  id: number;
  appId: number;
  parentId: number | null;
  orderNo: number;
  title: string;
  description: string;
  seoDescription: string;
  keywords: string;
  enabled: boolean;
  videoUrl: string;
  videoEmbed: string;
  productEnabled: boolean;
  price: number | null;
  minQty: number | null;
  maxQty: number | null;
  shippingPrice: number | null;
  createdAt: string;
  updatedAt: string;
  images: WebPageImage[];
};

export type AppSettings = {
  appId: number;
  logo: { mime: string; data: string } | null;
  favicon: { mime: string; data: string } | null;
  defaultShippingPrice: number | null;
};

const MAX_BASE64 = 1_400_000;
const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const ICON_MIMES = [...IMAGE_MIMES, "image/x-icon", "image/vnd.microsoft.icon"];

async function requireUser() {
  const { readSession } = await import("./session.server");
  const session = await readSession();
  if (!session.userId) throw new Error("Not signed in.");

  const { dbClient, ensureUsersTable, ensureWebAppsTable, ensureWebPagesTables } =
    await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureUsersTable(db);
  await ensureWebAppsTable(db);
  await ensureWebPagesTables(db);

  const res = await db.execute({
    sql: "SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [session.userId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Not signed in.");
  return {
    db,
    userId: Number(row["id"]),
    isAdmin: String(row["role"] ?? "user") === "admin",
  };
}

type Ctx = Awaited<ReturnType<typeof requireUser>>;

async function assertApp(ctx: Ctx, appId: number) {
  const res = await ctx.db.execute({
    sql: "SELECT user_id FROM web_apps WHERE id = ? LIMIT 1",
    args: [appId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Web app not found.");
  const ownerId = Number(row["user_id"]);
  if (!ctx.isAdmin && ownerId !== ctx.userId) {
    throw new Error("You do not have permission to do that.");
  }
  return ownerId;
}

async function assertPage(ctx: Ctx, pageId: number) {
  const res = await ctx.db.execute({
    sql: "SELECT id, app_id, user_id FROM web_pages WHERE id = ? LIMIT 1",
    args: [pageId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Page not found.");
  const appId = Number(row["app_id"]);
  await assertApp(ctx, appId);
  return { appId, ownerId: Number(row["user_id"]) };
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapPage(r: unknown): WebPage {
  const row = r as Record<string, unknown>;
  const parent = row["parent_id"];
  return {
    id: Number(row["id"]),
    appId: Number(row["app_id"]),
    parentId: parent === null || parent === undefined ? null : Number(parent),
    orderNo: Number(row["order_no"] ?? 0),
    title: String(row["title"] ?? ""),
    description: String(row["description"] ?? ""),
    seoDescription: String(row["seo_description"] ?? ""),
    keywords: String(row["keywords"] ?? ""),
    enabled: Number(row["enabled"] ?? 1) === 1,
    videoUrl: String(row["video_url"] ?? ""),
    videoEmbed: String(row["video_embed"] ?? ""),
    productEnabled: Number(row["product_enabled"] ?? 0) === 1,
    price: num(row["price"]),
    minQty: num(row["min_qty"]),
    maxQty: num(row["max_qty"]),
    shippingPrice: num(row["shipping_price"]),
    createdAt: String(row["created_at"] ?? ""),
    updatedAt: String(row["updated_at"] ?? ""),
    images: [],
  };
}

const pageShape = {
  appId: z.coerce.number().int(),
  parentId: z.coerce.number().int().nullable().optional(),
  orderNo: z.coerce.number().int().min(0).max(9999).default(0),
  title: z.string().trim().min(1, "Page title is required.").max(200),
  description: z.string().trim().max(4000),
  seoDescription: z.string().trim().max(300),
  keywords: z.string().trim().max(500),
  enabled: z.boolean(),
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), {
      message: "Video link must start with http:// or https://",
    }),
  videoEmbed: z.string().trim().max(4000),
  productEnabled: z.boolean(),
  price: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  minQty: z.coerce.number().int().min(0).max(1_000_000).nullable().optional(),
  maxQty: z.coerce.number().int().min(0).max(1_000_000).nullable().optional(),
  shippingPrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
};

type PageInput = z.infer<z.ZodObject<typeof pageShape>>;

function normalizeProduct(data: PageInput) {
  const parentId = data.parentId ?? null;
  const productEnabled = parentId !== null && data.productEnabled;
  if (!productEnabled) {
    return {
      parentId,
      productEnabled: false,
      price: null,
      minQty: null,
      maxQty: null,
      shippingPrice: null,
    };
  }
  const minQty = data.minQty ?? null;
  const maxQty = data.maxQty ?? null;
  if (minQty !== null && maxQty !== null && maxQty < minQty) {
    throw new Error("Maximum quantity must be greater than minimum quantity.");
  }
  return {
    parentId,
    productEnabled: true,
    price: data.price ?? null,
    minQty,
    maxQty,
    shippingPrice: data.shippingPrice ?? null,
  };
}

export const listWebPages = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ appId: z.coerce.number().int() }).parse(input),
  )
  .handler(async ({ data }): Promise<WebPage[]> => {
    const ctx = await requireUser();
    await assertApp(ctx, data.appId);
    const res = await ctx.db.execute({
      sql: `SELECT * FROM web_pages WHERE app_id = ? ORDER BY order_no ASC, id ASC`,
      args: [data.appId],
    });
    const pages = res.rows.map(mapPage);
    if (pages.length === 0) return pages;
    const imgs = await ctx.db.execute({
      sql: `SELECT i.id, i.page_id, i.mime, i.data, i.alt, i.order_no
            FROM web_page_images i
            JOIN web_pages p ON p.id = i.page_id
            WHERE p.app_id = ?
            ORDER BY i.order_no ASC, i.id ASC`,
      args: [data.appId],
    });
    const byPage = new Map<number, WebPageImage[]>();
    for (const r of imgs.rows) {
      const row = r as unknown as Record<string, unknown>;
      const pid = Number(row["page_id"]);
      const list = byPage.get(pid) ?? [];
      list.push({
        id: Number(row["id"]),
        mime: String(row["mime"] ?? ""),
        data: String(row["data"] ?? ""),
        alt: String(row["alt"] ?? ""),
        orderNo: Number(row["order_no"] ?? 0),
      });
      byPage.set(pid, list);
    }
    for (const p of pages) p.images = byPage.get(p.id) ?? [];
    return pages;
  });

export const createWebPage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object(pageShape).parse(input))
  .handler(async ({ data }) => {
    const ctx = await requireUser();
    const ownerId = await assertApp(ctx, data.appId);
    const p = normalizeProduct(data);
    if (p.parentId !== null) await assertPage(ctx, p.parentId);
    const now = new Date().toISOString();
    const res = await ctx.db.execute({
      sql: `INSERT INTO web_pages (app_id, user_id, parent_id, order_no, title, description,
              seo_description, keywords, enabled, video_url, video_embed, product_enabled,
              price, min_qty, max_qty, shipping_price, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.appId,
        ownerId,
        p.parentId,
        data.orderNo,
        data.title,
        data.description,
        data.seoDescription,
        data.keywords,
        data.enabled ? 1 : 0,
        data.videoUrl,
        data.videoEmbed,
        p.productEnabled ? 1 : 0,
        p.price,
        p.minQty,
        p.maxQty,
        p.shippingPrice,
        now,
        now,
      ],
    });
    return { ok: true as const, id: Number(res.lastInsertRowid ?? 0) };
  });

export const updateWebPage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int(), ...pageShape }).parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireUser();
    await assertPage(ctx, data.id);
    const p = normalizeProduct(data);
    if (p.parentId !== null) {
      if (p.parentId === data.id) throw new Error("A page cannot be its own parent.");
      await assertPage(ctx, p.parentId);
    }
    await ctx.db.execute({
      sql: `UPDATE web_pages SET parent_id = ?, order_no = ?, title = ?, description = ?,
              seo_description = ?, keywords = ?, enabled = ?, video_url = ?, video_embed = ?,
              product_enabled = ?, price = ?, min_qty = ?, max_qty = ?, shipping_price = ?,
              updated_at = ?
            WHERE id = ?`,
      args: [
        p.parentId,
        data.orderNo,
        data.title,
        data.description,
        data.seoDescription,
        data.keywords,
        data.enabled ? 1 : 0,
        data.videoUrl,
        data.videoEmbed,
        p.productEnabled ? 1 : 0,
        p.price,
        p.minQty,
        p.maxQty,
        p.shippingPrice,
        new Date().toISOString(),
        data.id,
      ],
    });
    return { ok: true as const };
  });

export const deleteWebPage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int() }).parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireUser();
    await assertPage(ctx, data.id);
    const children = await ctx.db.execute({
      sql: "SELECT id FROM web_pages WHERE parent_id = ?",
      args: [data.id],
    });
    const ids = [
      data.id,
      ...children.rows.map((r) =>
        Number((r as unknown as Record<string, unknown>)["id"]),
      ),
    ];
    for (const id of ids) {
      await ctx.db.execute({
        sql: "DELETE FROM web_page_images WHERE page_id = ?",
        args: [id],
      });
      await ctx.db.execute({ sql: "DELETE FROM web_pages WHERE id = ?", args: [id] });
    }
    return { ok: true as const };
  });

export const reorderWebPages = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        appId: z.coerce.number().int(),
        items: z
          .array(
            z.object({
              id: z.coerce.number().int(),
              orderNo: z.coerce.number().int().min(0).max(9999),
            }),
          )
          .max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireUser();
    await assertApp(ctx, data.appId);
    const now = new Date().toISOString();
    for (const item of data.items) {
      await ctx.db.execute({
        sql: "UPDATE web_pages SET order_no = ?, updated_at = ? WHERE id = ? AND app_id = ?",
        args: [item.orderNo, now, item.id, data.appId],
      });
    }
    return { ok: true as const };
  });

export const addPageImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        pageId: z.coerce.number().int(),
        mime: z.string().refine((v) => IMAGE_MIMES.includes(v), "Unsupported image type."),
        data: z.string().max(MAX_BASE64, "Image is too large."),
        alt: z.string().trim().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireUser();
    const { ownerId } = await assertPage(ctx, data.pageId);
    const next = await ctx.db.execute({
      sql: "SELECT COALESCE(MAX(order_no), -1) + 1 AS n FROM web_page_images WHERE page_id = ?",
      args: [data.pageId],
    });
    const orderNo = Number(
      (next.rows[0] as unknown as Record<string, unknown>)["n"] ?? 0,
    );
    await ctx.db.execute({
      sql: `INSERT INTO web_page_images (page_id, user_id, mime, data, alt, order_no, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.pageId,
        ownerId,
        data.mime,
        data.data,
        data.alt,
        orderNo,
        new Date().toISOString(),
      ],
    });
    return { ok: true as const };
  });

export const deletePageImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.coerce.number().int() }).parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireUser();
    const res = await ctx.db.execute({
      sql: "SELECT page_id FROM web_page_images WHERE id = ? LIMIT 1",
      args: [data.id],
    });
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error("Image not found.");
    await assertPage(ctx, Number(row["page_id"]));
    await ctx.db.execute({
      sql: "DELETE FROM web_page_images WHERE id = ?",
      args: [data.id],
    });
    return { ok: true as const };
  });

export const getAppSettings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ appId: z.coerce.number().int() }).parse(input),
  )
  .handler(async ({ data }): Promise<AppSettings> => {
    const ctx = await requireUser();
    await assertApp(ctx, data.appId);
    const res = await ctx.db.execute({
      sql: "SELECT * FROM web_app_settings WHERE app_id = ? LIMIT 1",
      args: [data.appId],
    });
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return { appId: data.appId, logo: null, favicon: null, defaultShippingPrice: null };
    }
    const logoData = row["logo_data"] ? String(row["logo_data"]) : "";
    const favData = row["favicon_data"] ? String(row["favicon_data"]) : "";
    return {
      appId: data.appId,
      logo: logoData ? { mime: String(row["logo_mime"] ?? ""), data: logoData } : null,
      favicon: favData
        ? { mime: String(row["favicon_mime"] ?? ""), data: favData }
        : null,
      defaultShippingPrice: num(row["default_shipping_price"]),
    };
  });

export const saveAppSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        appId: z.coerce.number().int(),
        logo: z
          .object({
            mime: z.string().refine((v) => IMAGE_MIMES.includes(v), "Unsupported image type."),
            data: z.string().max(MAX_BASE64, "Logo is too large."),
          })
          .nullable()
          .optional(),
        favicon: z
          .object({
            mime: z.string().refine((v) => ICON_MIMES.includes(v), "Unsupported icon type."),
            data: z.string().max(MAX_BASE64, "Favicon is too large."),
          })
          .nullable()
          .optional(),
        defaultShippingPrice: z.coerce
          .number()
          .min(0)
          .max(1_000_000)
          .nullable()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = await requireUser();
    const ownerId = await assertApp(ctx, data.appId);
    const now = new Date().toISOString();
    await ctx.db.execute({
      sql: `INSERT INTO web_app_settings (app_id, user_id, logo_mime, logo_data,
              favicon_mime, favicon_data, default_shipping_price, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(app_id) DO UPDATE SET
              logo_mime = excluded.logo_mime,
              logo_data = excluded.logo_data,
              favicon_mime = excluded.favicon_mime,
              favicon_data = excluded.favicon_data,
              default_shipping_price = excluded.default_shipping_price,
              updated_at = excluded.updated_at`,
      args: [
        data.appId,
        ownerId,
        data.logo?.mime ?? null,
        data.logo?.data ?? null,
        data.favicon?.mime ?? null,
        data.favicon?.data ?? null,
        data.defaultShippingPrice ?? null,
        now,
      ],
    });
    return { ok: true as const };
  });
