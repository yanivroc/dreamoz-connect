import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type OrderStatus =
  | "waiting_for_confirmation"
  | "payment_confirmed"
  | "order_complete"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  waiting_for_confirmation: "Waiting for confirmation",
  payment_confirmed: "Payment confirmed",
  order_complete: "Order complete",
  cancelled: "Cancelled",
};

/** Forward-only transitions (cancellation allowed until completion). */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  waiting_for_confirmation: ["payment_confirmed", "cancelled"],
  payment_confirmed: ["order_complete", "cancelled"],
  order_complete: [],
  cancelled: [],
};

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status] ?? [];
}

export type OrderItem = {
  id: number;
  pageId: number;
  title: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  appId: number;
  orderNo: string;
  status: OrderStatus;
  paymentProvider: string;
  paymentId: string;
  receiptUrl: string | null;
  buyer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postcode: string;
    country: string;
  };
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  paymentConfirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
};

async function requireUser() {
  const { readSession } = await import("./session.server");
  const session = await readSession();
  if (!session.userId) throw new Error("Not signed in.");

  const { dbClient, ensureUsersTable, ensureWebAppsTable, ensureOrdersTables } =
    await import("./db.server");
  const db = dbClient();
  if (!db) throw new Error("Database is not configured.");
  await ensureUsersTable(db);
  await ensureWebAppsTable(db);
  await ensureOrdersTables(db);

  const res = await db.execute({
    sql: "SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    args: [session.userId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Not signed in.");
  if (String(row["role"] ?? "user") !== "admin") {
    const { assertActiveAccess } = await import("./plan-access.server");
    await assertActiveAccess(db, Number(row["id"]));
  }
  return {
    db,
    userId: Number(row["id"]),
    isAdmin: String(row["role"] ?? "user") === "admin",
  };
}

type Ctx = Awaited<ReturnType<typeof requireUser>>;

async function assertAppAccess(ctx: Ctx, appId: number) {
  const res = await ctx.db.execute({
    sql: "SELECT user_id FROM web_apps WHERE id = ? LIMIT 1",
    args: [appId],
  });
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Web app not found.");
  if (!ctx.isAdmin && Number(row["user_id"]) !== ctx.userId) {
    throw new Error("You don't have access to this web app.");
  }
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const nul = (v: unknown) => (v === null || v === undefined ? null : String(v));

function mapOrder(r: unknown, items: OrderItem[]): Order {
  const row = r as Record<string, unknown>;
  return {
    id: Number(row["id"]),
    appId: Number(row["app_id"]),
    orderNo: str(row["order_no"]),
    status: (str(row["status"]) || "waiting_for_confirmation") as OrderStatus,
    paymentProvider: str(row["payment_provider"]),
    paymentId: str(row["payment_id"]),
    receiptUrl: nul(row["receipt_url"]),
    buyer: {
      name: str(row["buyer_name"]),
      email: str(row["buyer_email"]),
      phone: str(row["buyer_phone"]),
      address: str(row["buyer_address"]),
      city: str(row["buyer_city"]),
      postcode: str(row["buyer_postcode"]),
      country: str(row["buyer_country"]),
    },
    subtotal: Number(row["subtotal"] ?? 0),
    shipping: Number(row["shipping"] ?? 0),
    total: Number(row["total"] ?? 0),
    currency: str(row["currency"]) || "AUD",
    notes: str(row["notes"]),
    createdAt: str(row["created_at"]),
    updatedAt: str(row["updated_at"]),
    paymentConfirmedAt: nul(row["payment_confirmed_at"]),
    completedAt: nul(row["completed_at"]),
    cancelledAt: nul(row["cancelled_at"]),
    items,
  };
}

function mapItem(r: unknown): OrderItem {
  const row = r as Record<string, unknown>;
  return {
    id: Number(row["id"]),
    pageId: Number(row["page_id"]),
    title: str(row["title"]),
    qty: Number(row["qty"] ?? 0),
    unitPrice: Number(row["unit_price"] ?? 0),
    lineTotal: Number(row["line_total"] ?? 0),
  };
}

async function loadItems(ctx: Ctx, orderIds: number[]): Promise<Map<number, OrderItem[]>> {
  const map = new Map<number, OrderItem[]>();
  if (orderIds.length === 0) return map;
  const placeholders = orderIds.map(() => "?").join(",");
  const res = await ctx.db.execute({
    sql: `SELECT id, order_id, page_id, title, qty, unit_price, line_total
          FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
    args: orderIds,
  });
  for (const r of res.rows) {
    const row = r as Record<string, unknown>;
    const oid = Number(row["order_id"]);
    const list = map.get(oid) ?? [];
    list.push(mapItem(r));
    map.set(oid, list);
  }
  return map;
}

export const listOrders = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ appId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }): Promise<Order[]> => {
    const ctx = await requireUser();
    await assertAppAccess(ctx, data.appId);
    const res = await ctx.db.execute({
      sql: "SELECT * FROM orders WHERE app_id = ? ORDER BY created_at DESC, id DESC LIMIT 500",
      args: [data.appId],
    });
    const ids = res.rows.map((r) => Number((r as Record<string, unknown>)["id"]));
    const items = await loadItems(ctx, ids);
    return res.rows.map((r) =>
      mapOrder(r, items.get(Number((r as Record<string, unknown>)["id"])) ?? []),
    );
  });

export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.number().int().positive() }).parse(input))
  .handler(async ({ data }): Promise<Order | null> => {
    const ctx = await requireUser();
    const res = await ctx.db.execute({
      sql: "SELECT * FROM orders WHERE id = ? LIMIT 1",
      args: [data.id],
    });
    const row = res.rows[0];
    if (!row) return null;
    await assertAppAccess(ctx, Number((row as Record<string, unknown>)["app_id"]));
    const items = await loadItems(ctx, [data.id]);
    return mapOrder(row, items.get(data.id) ?? []);
  });

const statusSchema = z.enum([
  "waiting_for_confirmation",
  "payment_confirmed",
  "order_complete",
  "cancelled",
]);

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.number().int().positive(), status: statusSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<Order> => {
    const ctx = await requireUser();
    const res = await ctx.db.execute({
      sql: "SELECT id, app_id, status FROM orders WHERE id = ? LIMIT 1",
      args: [data.id],
    });
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error("Order not found.");
    await assertAppAccess(ctx, Number(row["app_id"]));

    const current = str(row["status"]) as OrderStatus;
    if (!nextStatuses(current).includes(data.status)) {
      throw new Error(
        `Cannot move an order from "${ORDER_STATUS_LABELS[current]}" to "${ORDER_STATUS_LABELS[data.status]}".`,
      );
    }

    const now = new Date().toISOString();
    const stampColumn =
      data.status === "payment_confirmed"
        ? "payment_confirmed_at"
        : data.status === "order_complete"
          ? "completed_at"
          : data.status === "cancelled"
            ? "cancelled_at"
            : null;

    await ctx.db.execute({
      sql: `UPDATE orders SET status = ?, updated_at = ?${stampColumn ? `, ${stampColumn} = ?` : ""} WHERE id = ?`,
      args: stampColumn ? [data.status, now, now, data.id] : [data.status, now, data.id],
    });

    const fresh = await ctx.db.execute({
      sql: "SELECT * FROM orders WHERE id = ? LIMIT 1",
      args: [data.id],
    });
    const items = await loadItems(ctx, [data.id]);
    return mapOrder(fresh.rows[0], items.get(data.id) ?? []);
  });
