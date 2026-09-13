# Attach an invoice to the order confirmation email

## Current state (verified)

Checkout emails no longer carry any invoice. The order email code (`src/lib/order-email.functions.ts`) builds the buyer and owner messages with an HTML order summary only — there is no attachment anywhere in the project. The mail relay (`api/send-mail.ts`) and the send helper (`src/lib/mailer.server.ts`) already support attachments (base64), so nothing new is needed on the delivery side.

Orders are saved to the database and visible in the Orders tab; that part still works and stays unchanged.

## What you get

Every successful checkout sends a proper invoice PDF attached to the email:

- File name: `Invoice-<order number>.pdf` (falls back to the payment reference if no order number).
- Contents: your business name and email, invoice/order number, date, payment reference, customer name, email, phone and address, a line-item table (item, quantity, unit price, line total), then subtotal, shipping and total with currency.
- Attached to the customer's confirmation email and to the owner's copy, so both sides keep a record.
- The email body stays exactly as it is today (no Square receipt line, same summary table).

If the PDF cannot be generated for any reason, the email is still sent without it rather than failing the order.

## Technical notes

- Add `pdf-lib` (pure JavaScript, works in the edge/Worker runtime — no native binaries).
- New `src/lib/invoice.server.ts` exporting `buildInvoicePdf({ orderNo, paymentId, date, brand, ownerEmail, buyer, lines, subtotal, shipping, total, currency })`, returning base64 using the existing standard fonts and a simple table layout with text wrapping for long titles.
- In `src/lib/order-email.functions.ts`, generate the invoice once after pricing and pass `attachment: [{ name, content }]` to both `sendMail` calls, wrapped in try/catch so a generation failure only logs and skips the attachment.
- No changes to Square, pricing, shipping, order saving, or the Orders panel.

## Verification

- Run a checkout in preview/deploy and confirm both emails arrive with `Invoice-<order no>.pdf` attached and the totals match the order in the Orders tab.
