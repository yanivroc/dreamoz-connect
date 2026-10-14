// Sends cancellation notices to buyer, seller and admin (admin processes Square refunds).
import type { Client } from "@libsql/client";
import type { Order } from "./orders.functions";

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

const money = (n: number, cur: string) => {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
};

function wrap(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
<h2 style="margin:0 0 16px">${title}</h2>${body}
<p style="color:#666;font-size:12px;margin-top:24px">Questions? Contact DreamozTech Support at support@dreamoztech.com.</p></div>`;
}

export async function sendCancellationEmails(db: Client, order: Order) {
  const { sendMail, getMailConfig } = await import("./mailer.server");
  const cfg = getMailConfig();
  const from = { email: cfg.emailFrom, name: cfg.fromName };

  const appRes = await db.execute({
    sql: `SELECT a.title, u.email, u.name FROM web_apps a LEFT JOIN users u ON u.id = a.user_id WHERE a.id = ? LIMIT 1`,
    args: [order.appId],
  });
  const app = (appRes.rows[0] ?? {}) as Record<string, unknown>;
  const store = String(app["title"] ?? "") || "DreamozTech";
  const sellerEmail = String(app["email"] ?? "");
  const sellerName = String(app["name"] ?? "") || store;

  const adminRes = await db.execute(
    "SELECT email FROM users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY id ASC LIMIT 1",
  );
  const adminEmail = String((adminRes.rows[0] as Record<string, unknown> | undefined)?.["email"] ?? "") || cfg.emailFrom;

  const total = money(order.total, order.currency);
  const date = new Date(order.createdAt).toLocaleDateString("en-AU");
  const addr = [order.buyer.address, order.buyer.city, order.buyer.postcode, order.buyer.country]
    .filter(Boolean)
    .join(", ");
  const items = `<ul>${order.items
    .map((i) => `<li>${i.qty}× ${esc(i.title)} — ${money(i.lineTotal, order.currency)}</li>`)
    .join("")}</ul>`;
  const details = `<h3>Order details</h3><p><strong>Order total:</strong> ${total}<br/>
<strong>Customer:</strong> ${esc(order.buyer.name)} (${esc(order.buyer.email)})<br/>
<strong>Shipping address:</strong> ${esc(addr)}</p>${items}`;

  const sends: Promise<unknown>[] = [];

  if (sellerEmail) {
    sends.push(
      sendMail({
        from,
        to: [{ email: sellerEmail, name: sellerName }],
        subject: `[Cancelled] Order #${order.orderNo} has been cancelled — ${store}`,
        htmlContent: wrap(
          `Order #${esc(order.orderNo)} has been cancelled`,
          `<p>Hello ${esc(sellerName)},</p>
<p>Order <strong>#${esc(order.orderNo)}</strong> placed by <strong>${esc(order.buyer.name)}</strong> on ${date} has been marked as <strong>Cancelled</strong>.</p>
<h3>What you need to do</h3><ol><li><strong>Do not fulfil or dispatch:</strong> if this order has not shipped, please stop fulfilment.</li>
<li><strong>Restock items:</strong> any stock reserved for this order can go back into your inventory.</li></ol>
<h3>Refund &amp; payout notice</h3><ul><li><strong>Customer refund:</strong> card payments are processed through DreamozTech's central payment gateway. DreamozTech Administration has been alerted and will refund the customer's original card directly. You do not need to send any funds.</li>
<li><strong>Seller balance:</strong> pending earnings and commission for this order have been voided and will not be credited to your payout balance.</li></ul>
${details}`,
        ),
      }),
    );
  }

  if (order.buyer.email) {
    sends.push(
      sendMail({
        from,
        to: [{ email: order.buyer.email, name: order.buyer.name }],
        subject: `Your order #${order.orderNo} has been cancelled`,
        htmlContent: wrap(
          `Your order #${esc(order.orderNo)} has been cancelled`,
          `<p>Hello ${esc(order.buyer.name)},</p>
<p>Your order <strong>#${esc(order.orderNo)}</strong> from <strong>${esc(store)}</strong> has been cancelled.</p>
<p>A full refund of <strong>${total}</strong> will be issued to your original payment card. Refunds usually appear within 3–5 business days, depending on your bank.</p>
${details}`,
        ),
      }),
    );
  }

  sends.push(
    sendMail({
      from,
      to: [{ email: adminEmail, name: "DreamozTech Admin" }],
      subject: `[Action Required] Refund needed: Order #${order.orderNo} cancelled (${total})`,
      htmlContent: wrap(
        `Refund required for order #${esc(order.orderNo)}`,
        `<p>This order was cancelled. Please issue the refund in the Square Dashboard.</p>
<p><strong>Refund amount:</strong> ${total}<br/>
<strong>Payment provider:</strong> ${esc(order.paymentProvider || "square")}<br/>
<strong>Square Payment ID:</strong> ${esc(order.paymentId || "—")}</p>
<p><strong>Seller:</strong> ${esc(store)} (${esc(sellerEmail || "—")})</p>
${details}`,
      ),
    }),
  );

  const results = await Promise.allSettled(sends);
  for (const r of results) if (r.status === "rejected") console.error("cancel email failed", r.reason);
}
