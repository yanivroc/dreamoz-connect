import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface SquareConfig {
  applicationId: string | null;
  locationId: string | null;
  environment: "sandbox" | "production";
  configured: boolean;
}

export const getSquareConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<SquareConfig> => {
    const applicationId = process.env["SQUARE_APPLICATION_ID"] ?? null;
    const locationId = process.env["SQUARE_LOCATION_ID"] ?? null;
    const environment =
      (process.env["SQUARE_ENVIRONMENT"] ?? "sandbox").toLowerCase() === "production"
        ? "production"
        : "sandbox";
    return {
      applicationId,
      locationId,
      environment,
      configured: Boolean(applicationId && locationId && process.env["SQUARE_ACCESS_TOKEN"]),
    };
  },
);

const checkoutSchema = z.object({
  sourceId: z.string().min(1).max(2000),
  currency: z.string().min(3).max(3),
  customer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(160),
    phone: z.string().trim().min(1, "Phone number is required").max(40),
    address: z.string().trim().min(1, "Address is required").max(200),
    city: z.string().trim().min(1, "City is required").max(80),
    postcode: z.string().trim().min(1, "Postcode is required").max(20),
    country: z.string().trim().min(1, "Country is required").max(60),
  }),
  items: z
    .array(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(50),
});

export interface CheckoutResult {
  ok: boolean;
  paymentId?: string;
  receiptUrl?: string;
  orderNo?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

function makeOrderNo(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let suffix = "";
  for (const b of bytes) suffix += alphabet[b % alphabet.length];
  return `DT-${ymd}-${suffix}`;
}

export const createSquarePayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const accessToken = process.env["SQUARE_ACCESS_TOKEN"];
    const locationId = process.env["SQUARE_LOCATION_ID"];
    const environment = (process.env["SQUARE_ENVIRONMENT"] ?? "sandbox").toLowerCase();
    if (!accessToken || !locationId) {
      return { ok: false, error: "Payments are not configured yet." };
    }

    // Price the order server-side from the CMS — never trust client amounts.
    const { fetchSiteContent } = await import("./content.server");
    const { flattenPages } = await import("./content-types");
    const { priceOrder } = await import("./pricing");

    let priced;
    try {
      const content = await fetchSiteContent();
      const pages = flattenPages(content.pages);
      priced = priceOrder(data.items, pages, content);
    } catch (err) {
      console.error("pricing failed", err);
      return { ok: false, error: "Could not price this order. Please try again." };
    }
    if (priced.error) return { ok: false, error: priced.error };

    const amountCents = Math.round(priced.total * 100);
    if (amountCents <= 0) return { ok: false, error: "Order total is invalid." };

    const base =
      environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    const res = await fetch(`${base}/v2/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-10-17",
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        source_id: data.sourceId,
        location_id: locationId,
        amount_money: { amount: amountCents, currency: priced.currency || data.currency },
        buyer_email_address: data.customer.email,
        note: `Order for ${data.customer.name}`,
      }),
    });

    const body = (await res.json()) as {
      payment?: { id: string; receipt_url?: string };
      errors?: { detail?: string; code?: string }[];
    };

    if (!res.ok || !body.payment) {
      const detail = body.errors?.[0]?.detail ?? `Payment failed [${res.status}]`;
      console.error("Square payment failed", res.status, JSON.stringify(body.errors));
      return { ok: false, error: detail };
    }

    // Persist the order. A DB problem must never lose a captured payment, so
    // failures are logged and checkout still succeeds.
    let orderNo: string | undefined;
    try {
      const { resolveSiteAppId } = await import("./content.server");
      const { dbClient, ensureOrdersTables } = await import("./db.server");
      const db = dbClient();
      if (!db) throw new Error("Database is not configured.");
      await ensureOrdersTables(db);
      const appId = await resolveSiteAppId();
      const ownerRes = await db.execute({
        sql: "SELECT user_id FROM web_apps WHERE id = ? LIMIT 1",
        args: [appId],
      });
      const ownerId = Number((ownerRes.rows[0] as Record<string, unknown> | undefined)?.["user_id"] ?? 0);
      const now = new Date().toISOString();
      const candidate = makeOrderNo();
      const ins = await db.execute({
        sql: `INSERT INTO orders (app_id, user_id, order_no, status, payment_provider, payment_id, receipt_url,
                buyer_name, buyer_email, buyer_phone, buyer_address, buyer_city, buyer_postcode, buyer_country,
                subtotal, shipping, total, currency, created_at, updated_at)
              VALUES (?, ?, ?, 'waiting_for_confirmation', 'square', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          appId,
          ownerId,
          candidate,
          body.payment.id,
          body.payment.receipt_url ?? null,
          data.customer.name,
          data.customer.email,
          data.customer.phone,
          data.customer.address,
          data.customer.city,
          data.customer.postcode,
          data.customer.country,
          priced.subtotal,
          priced.shipping,
          priced.total,
          priced.currency,
          now,
          now,
        ],
      });
      const orderId = Number(ins.lastInsertRowid);
      for (const line of priced.lines) {
        await db.execute({
          sql: `INSERT INTO order_items (order_id, page_id, title, qty, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [orderId, line.id, line.title, line.qty, line.price, line.lineTotal],
        });
      }
      orderNo = candidate;
    } catch (err) {
      console.error("order persistence failed", body.payment.id, err);
    }

    // Confirmation emails are sent separately (see order-email.functions.ts) so
    // a mail problem can never fail a captured payment.
    return {
      ok: true,
      paymentId: body.payment.id,
      ...(body.payment.receipt_url ? { receiptUrl: body.payment.receipt_url } : {}),
      ...(orderNo ? { orderNo } : {}),
      amount: priced.total,
      currency: priced.currency,
    };
  });
