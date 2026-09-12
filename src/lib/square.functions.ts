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
    phone: z.string().max(40).optional().default(""),
    address: z.string().max(200).optional().default(""),
    city: z.string().max(80).optional().default(""),
    postcode: z.string().max(20).optional().default(""),
    country: z.string().max(60).optional().default("Australia"),
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
  amount?: number;
  currency?: string;
  error?: string;
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
    const { fetchSiteContent } = await import("./dreamoz.server");
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

    // Confirmation emails are sent separately (see order-email.functions.ts) so
    // a mail problem can never fail a captured payment.


    return {
      ok: true,
      paymentId: body.payment.id,
      ...(body.payment.receipt_url ? { receiptUrl: body.payment.receipt_url } : {}),
      amount: priced.total,
      currency: priced.currency,
    };
  });
