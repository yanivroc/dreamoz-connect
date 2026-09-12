import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  paymentId: z.string().min(1).max(200),
  receiptUrl: z.string().url().max(1000).optional().nullable(),
  buyer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(160),
    phone: z.string().max(40).optional().default(""),
    address: z.string().max(300).optional().default(""),
    city: z.string().max(120).optional().default(""),
    postcode: z.string().max(40).optional().default(""),
    country: z.string().max(60).optional().default("Australia"),
  }),
  items: z
    .array(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(300),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(50),
});

export interface OrderEmailResult {
  ok: boolean;
  error?: string;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

const fmt = (n: number, cur: string) => {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
};

/** Sends the buyer confirmation and an owner copy after a successful payment. */
export const sendOrderEmails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<OrderEmailResult> => {
    const { sendMail } = await import("./mail.server");
    const { fetchSiteContent } = await import("./dreamoz.server");
    const { flattenPages } = await import("./content-types");
    const { priceOrder } = await import("./pricing");

    let content;
    let priced;
    try {
      content = await fetchSiteContent();
      priced = priceOrder(data.items, flattenPages(content.pages), content);
    } catch (err) {
      console.error("order email pricing failed", err);
      return { ok: false, error: "Could not build the order summary." };
    }
    if (priced.error) return { ok: false, error: priced.error };

    const cur = priced.currency.toUpperCase();
    const brand = content.webApp.title || "DreamozTech";
    const ownerEmail = content.webApp.email;

    const rows = priced.lines
      .map(
        (l) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #eee;">${esc(l.title)}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${l.qty}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmt(l.lineTotal, cur)}</td>
</tr>`,
      )
      .join("");

    const summary = `
<table style="width:100%;max-width:560px;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
  <thead>
    <tr style="background:#f7f7f7;">
      <th style="padding:8px;text-align:left;">Item</th>
      <th style="padding:8px;text-align:center;">Qty</th>
      <th style="padding:8px;text-align:right;">Price</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr><td colspan="2" style="padding:6px 8px;text-align:right;">Subtotal</td><td style="padding:6px 8px;text-align:right;">${fmt(priced.subtotal, cur)}</td></tr>
    <tr><td colspan="2" style="padding:6px 8px;text-align:right;">Shipping</td><td style="padding:6px 8px;text-align:right;">${fmt(priced.shipping, cur)}</td></tr>
    <tr><td colspan="2" style="padding:8px;text-align:right;font-weight:bold;border-top:2px solid #333;">Total</td><td style="padding:8px;text-align:right;font-weight:bold;border-top:2px solid #333;">${fmt(priced.total, cur)}</td></tr>
  </tfoot>
</table>`;

    const buyerBlock = `
<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">
  <strong>Name:</strong> ${esc(data.buyer.name)}<br/>
  <strong>Email:</strong> ${esc(data.buyer.email)}<br/>
  ${data.buyer.phone ? `<strong>Phone:</strong> ${esc(data.buyer.phone)}<br/>` : ""}
  ${
    data.buyer.address
      ? `<strong>Address:</strong> ${esc(data.buyer.address)}${data.buyer.city ? ", " + esc(data.buyer.city) : ""}${data.buyer.postcode ? " " + esc(data.buyer.postcode) : ""}${data.buyer.country ? ", " + esc(data.buyer.country) : ""}`
      : ""
  }
</p>`;

    const receiptLine = data.receiptUrl
      ? `<p style="font-family:Arial,sans-serif;font-size:14px;"><a href="${esc(data.receiptUrl)}">View your Square receipt</a></p>`
      : "";

    const reference = `<p style="font-family:Arial,sans-serif;font-size:14px;">Payment reference: <strong>${esc(data.paymentId)}</strong></p>`;

    const buyerHtml = `
<div style="font-family:Arial,sans-serif;color:#111;">
  <h2>Thanks for your order, ${esc(data.buyer.name)}!</h2>
  <p style="font-size:14px;">We've received your payment and are getting your order ready.</p>
  ${reference}
  ${summary}
  ${buyerBlock}
  ${receiptLine}
  <p style="font-size:13px;color:#666;">— ${esc(brand)}</p>
</div>`;

    const ownerHtml = `
<div style="font-family:Arial,sans-serif;color:#111;">
  <h2>New order — ${esc(data.paymentId)}</h2>
  ${summary}
  <h3 style="font-size:15px;">Customer</h3>
  ${buyerBlock}
  ${receiptLine}
</div>`;

    const errors: string[] = [];

    try {
      await sendMail({
        to: [{ email: data.buyer.email, name: data.buyer.name }],
        subject: `Your ${brand} order (${data.paymentId})`,
        htmlContent: buyerHtml,
      });
    } catch (err) {
      console.error("buyer order email failed", err);
      errors.push("buyer");
    }

    if (ownerEmail) {
      try {
        await sendMail({
          to: [{ email: ownerEmail, name: brand }],
          subject: `New order from ${data.buyer.name} — ${fmt(priced.total, cur)}`,
          htmlContent: ownerHtml,
          replyTo: { email: data.buyer.email, name: data.buyer.name },
        });
      } catch (err) {
        console.error("owner order email failed", err);
        errors.push("owner");
      }
    }

    if (errors.length > 0) {
      return { ok: false, error: "Order confirmation email could not be sent." };
    }
    return { ok: true };
  });
