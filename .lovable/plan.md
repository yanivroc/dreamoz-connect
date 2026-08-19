# Builder updates: defaults, SEO field, and API tab

## 1. Enabled off by default
- New web app form and new web page form start with Enabled unchecked.
- After a successful save, the form resets back to Enabled unchecked (editing an existing record still shows its real value).

## 2. SEO description as multi-line
- On the Add/Edit web page form, SEO description becomes a multi-line textarea (3-4 rows) instead of a single-line input.

## 3. New "API" tab
- A fourth tab after General settings, scoped to the selected web app.
- Each web app gets an API key and API secret, generated on first visit to the tab.
- The key is always visible; the secret is shown once at generation, then masked with a "Regenerate secret" action (regenerating invalidates the old one).
- Copy buttons for key, secret and endpoint URLs.

## 4. API documentation + public endpoints
The tab documents two public endpoints:

- `POST /api/public/wa/token` — body `{ apiKey, apiSecret }`, returns `{ token, expiresIn }` (bearer token, ~1 hour).
- `GET /api/public/wa/webapp` — header `Authorization: Bearer <token>`, returns the full web app JSON:

```text
{
  webApp: { id, title, description, email, link, enabled, createdAt, updatedAt },
  settings: { logo, favicon, defaultShippingPrice },
  pages: [
    { id, orderNo, title, description, seoDescription, keywords, enabled,
      videoUrl, videoEmbed, images: [...],
      product: { enabled, price, minQty, maxQty, shippingPrice },
      children: [ ...same shape... } ]
}
```

Docs show request/response samples with curl, plus an in-page "Try it" that fetches the live response for the selected app.

## Technical notes
- `src/lib/db.server.ts`: new `web_app_api_keys` table (`app_id` PK, `user_id`, `api_key`, `secret_hash`, `created_at`, `rotated_at`) created inside `ensureWebPagesTables`. Secret stored hashed (same hashing helper as `auth.server.ts`); never returned after creation.
- `src/lib/webapi.functions.ts` (new): `getApiCredentials` (create-if-missing, returns key + one-time secret), `rotateApiSecret`. Both reuse the existing session/ownership pattern from `webapps.functions.ts`.
- `src/routes/api/public/wa/token.ts`: validates key+secret, issues a signed token (HMAC with `SESSION_SECRET`, payload `{ appId, exp }`), no cookies.
- `src/routes/api/public/wa/webapp.ts`: verifies the bearer token, then assembles web app + settings + nested pages/images from the existing tables. Read-only; returns 401 on bad/expired token; images returned as data URLs.
- `src/components/ApiPanel.tsx` (new): credentials + documentation UI; registered as the `api` tab in `src/routes/build-web-apps.tsx`.
- `src/components/WebAppsPanel.tsx` / `WebPagesPanel.tsx`: change `enabled` default to `false` in the empty-form constants; SEO description switched to `<textarea>`.
