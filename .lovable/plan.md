# Hyperlink field + Shipping rates tab

## 1. Hyperlink on web pages

Add an optional "Hyperlink" field to the Add/Edit web page form, stored with the page and returned with page data (including the public web app API JSON).

- Validation: optional, max 500 chars, must start with `http://` or `https://` when filled.
- Shown as a multi-purpose single-line input next to Video link in the builder.

## 2. Shipping rates

- Remove "Default shipping price (optional)" from General settings (field stays in the database, no longer edited or used by the UI).
- New tab after General settings: **Shipping rates**.
- If the selected web app has no page with products enabled, the tab shows only:
  "No products are configured, setup product to create shipping rates".
- Otherwise two rate modes, each a repeatable list:
  - **By quantity** — rows of (quantity, shipping rate)
  - **By amount** — rows of (amount, shipping rate)
- Validation (client + server): no duplicate quantity within the quantity list, no duplicate amount within the amount list; values >= 0 and <= 1,000,000; max 100 rows per type.
- Currency: derived on the client from the visitor's locale/timezone (e.g. `Intl.DateTimeFormat().resolvedOptions().timeZone` mapped to a country, then to a currency such as AUD/USD/GBP/INR/NZD/EUR), used for display and formatting only. Values are stored as plain numbers plus the resolved currency code.

## Technical notes

- Migration in `src/lib/db.server.ts`: `ALTER TABLE web_pages ADD COLUMN hyperlink TEXT NOT NULL DEFAULT ''`, and a new table:
  `web_app_shipping_rates (id, app_id, user_id, rate_type TEXT ['qty'|'amount'], threshold REAL, rate REAL, currency TEXT, created_at, updated_at)` with an index on `app_id` and a unique index on `(app_id, rate_type, threshold)`.
- `src/lib/webpages.functions.ts`: add `hyperlink` to `pageShape`, `WebPage`, `mapPage`, insert/update SQL; add `listShippingRates` / `saveShippingRates` server functions (ownership checked via existing `assertApp`, product presence checked with a `product_enabled = 1` count).
- New `src/components/ShippingRatesPanel.tsx`; new tab entry in `src/routes/build-web-apps.tsx`.
- `src/components/AppSettingsPanel.tsx`: drop the shipping price input.
- Public API (`src/routes/api/public/wa/webapp.ts`): include `hyperlink` per page and a `shippingRates` block on the web app.
