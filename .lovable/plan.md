# Country setting + product weight

## 1. General settings: Country

A new "Country" dropdown in the General settings tab of the web app builder, defaulting to **Australia**:

| Country | Currency shown | Weight unit |
|---|---|---|
| Australia | AUD | kg |
| United States | USD | lb |
| United Kingdom | GBP | lb |

Changing the country changes the currency label and weight unit everywhere on the public site — product cards, product detail, cart, checkout, order emails and invoices. Prices keep the same numbers (no exchange-rate conversion); you set prices to suit the country you sell in.

Existing web apps with no country saved are treated as Australia, so nothing changes until you pick something else.

## 2. Product weight

Product pages (child pages with "This page sells a product" on) get an optional **Weight** field, labelled with the country's unit (kg for Australia, lb for USA/UK). What you type is what shoppers see.

On the public product page, when a weight is set it appears with the other product details as e.g. "Weight: 1.2 kg". When empty, nothing is shown.

## 3. Shipping rates

The Shipping rates tab currently guesses currency from the visitor's timezone. It will use the web app's country instead, so builder and shop always agree.

## Technical notes

- `src/lib/db.server.ts`: add `country TEXT NOT NULL DEFAULT 'AU'` to `web_app_settings` (with the existing try/catch `ALTER TABLE ... ADD COLUMN` pattern) and `weight REAL` to `web_pages`.
- New `src/lib/locale.ts`: `COUNTRIES` map (`AU`/`US`/`GB` → `{ label, currency, weightUnit }`) plus `currencyFor(code)` and `weightUnitFor(code)` helpers. `src/lib/currency.ts` keeps `formatMoney`; `detectCurrency` is no longer used for shop pricing.
- `src/lib/webpages.functions.ts`: `AppSettings` gains `country`; `saveAppSettings` validates it with a Zod enum of supported codes. Page create/update accept optional `weight` (non-negative, ≤ 100000, only when `product_enabled`), returned in page rows.
- `src/lib/webapp-payload.server.ts`: include `settings.country` and `page.product.weight` in the public JSON payload (API tab docs updated accordingly).
- `src/lib/content-types.ts`: `SiteContent.settings` gains `country`; `WaProduct` gains `weight: number | null`.
- Currency resolution: add a `siteCurrency(content)` helper returning the currency for `settings.country` (fallback AUD). Replace hard-coded `"AUD"` defaults and `detectCurrency()` calls in `src/lib/cart.tsx` (`calcTotals`), `src/lib/pricing.ts`, `ProductCard`, `page.$slug.tsx`, `cart.tsx`, `checkout.index.tsx`, `order-email.functions.ts` and `invoice.server.ts` with it.
- `src/components/AppSettingsPanel.tsx`: country `<select>` wired into the existing save flow.
- `src/components/WebPagesPanel.tsx`: weight input inside the product fields block, label suffix driven by the app's country.
- `src/routes/page.$slug.tsx` (and `AddToCartPanel` area): render weight when `product.weight != null`.
- `src/components/ShippingRatesPanel.tsx`: currency from the app's country rather than `detectCurrency()`.

Adding more countries later is a one-line entry in the `COUNTRIES` map.
