# Save checkout orders and track their status

## Current state (verified)
Checkout today charges the card through Square and sends the confirmation emails, but nothing is written to the database. There is no orders table in Turso — only users, web apps, pages, images, settings, shipping rates, API keys and assets.

## What you get
1. Every successful payment is saved as an order in the database (new tables), including the buyer details, each item with its price, subtotal, shipping, total, currency and the Square payment ID.
2. Each order carries a status that moves through three stages:

```text
waiting_for_confirmation  -->  payment_confirmed  -->  order_complete
   (set automatically           (you verify the           (you mark it once
    when Square accepts          money arrived and         shipped / delivered)
    the payment)                 click "Confirm payment")
```

3. A new "Orders" tab inside Build Web Apps (per web app) where the app owner (or admin) can:
   - See all orders, newest first, with order number, date, buyer, total and a status badge.
   - Open an order to see items, address/phone and the Square payment ID.
   - Move the status forward with buttons: "Confirm payment" then "Mark complete". Status can only move forward (plus an optional "Cancelled" for exceptions). Each change is timestamped.
4. The confirmation email and the success page show the order number, so you can match emails to database rows.

## Technical details
- `src/lib/db.server.ts`: add `ensureOrdersTables()` creating
  - `orders` (id, app_id, user_id, order_no TEXT unique e.g. `DT-20260913-XXXX`, status TEXT default `waiting_for_confirmation`, payment_provider `square`, payment_id, receipt_url, buyer_name/email/phone/address/city/postcode/country, subtotal, shipping, total, currency, notes, created_at, updated_at, payment_confirmed_at, completed_at, cancelled_at) with indexes on app_id, status, payment_id (unique).
  - `order_items` (id, order_id, page_id, title, qty, unit_price, line_total) indexed on order_id.
- `src/lib/square.functions.ts`: after Square returns `payment.id`, insert the order + items using the already server-priced `priced.lines`, resolve `app_id`/`user_id` from the same `resolveAppId` path used by content loading. The DB write is wrapped so a failure never loses a captured payment (logged, still returns ok). Return `orderNo` in `CheckoutResult`.
- `src/lib/order-email.functions.ts`, `src/routes/checkout.index.tsx`, `src/routes/checkout.success.tsx`: pass and display `orderNo`; include it in both buyer and owner emails.
- New `src/lib/orders.functions.ts`: session-protected `listOrders({ appId })`, `getOrder({ id })`, `updateOrderStatus({ id, status })` scoped to the app owner (admins see all), enforcing the forward-only transition rules and stamping the matching timestamp.
- New `src/components/OrdersPanel.tsx` and an `orders` entry in the tab list of `src/routes/build-web-apps.tsx`, following the existing panel/toast patterns.
- No change to Square, pricing or shipping logic.
