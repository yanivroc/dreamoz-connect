# Replace the legacy home page with the Dream Connect site

## What changes
The public site (home, page detail, cart, checkout) will be the Dream Connect Integration experience, fed by the web app you build in this project's Web App Builder. The Azure API, the dreamoz.com.au snapshot cache and the Vercel Blob image proxy go away entirely.

1. **Content source** – The site reads the web app that belongs to `DREAMOZTECH_API_KEY` / `DREAMOZTECH_API_SECRET` (same values Dream Connect uses). Because the builder lives in this project, the lookup goes straight to the database instead of calling `/api/public/wa/*` over HTTP. Images are the builder's stored images (data URLs / asset links), no blob token needed.
2. **Public pages copied from Dream Connect** – Home (hero slider, sections, card grids), `/page/$slug` detail, `/cart`, `/checkout`, `/checkout/success`, header with logo/menu/cart, footer, cart drawer, Square payment and order emails.
3. **Contact page** – kept, but brand, email and address come from the web app (title, email, description). The header "Call Us" phone button is removed (no phone in web app data). Contact form emails go to the web app's email.
4. **Login / Sign up / Dashboard / Build Web Apps** – unchanged functionally; they only swap the brand name and favicon source from Member/Get to the web app title/favicon. Sign-up admin copy goes to the web app email.
5. **Legacy removal** – delete `dreamoz.server.ts`, `dreamoz.functions.ts`, `dreamoz.types.ts`, `snapshot-store.server.ts`, `MediaSlider`, `post.$slug` route, `api/media.ts`, `api/blob-proxy.ts`, cache-bust/cache-status routes, the `/api/media` rewrite in `vercel.json`, `@vercel/blob` dependency, and the `DREAMOZ_API_KEY/SECRET`, `VERCEL_BLOB_TOKEN`, `CACHE_BUST_TOKEN` usage.

## What you need to do
- Add `DREAMOZTECH_API_KEY` and `DREAMOZTECH_API_SECRET` (from the API tab of your web app) in Vercel and in this project's secrets.
- Square (`SQUARE_*`), `GoogleMapsKey` and SMTP variables are already documented in the API tab; the checkout/address/email features use those same names.

## Technical detail
- New `src/lib/content.server.ts`: resolves the app id by hashing the secret and matching `web_app_api_keys` (same check as `/api/public/wa/token`), then builds the same JSON shape as `/api/public/wa/webapp` by sharing a `buildWebAppPayload(db, appId)` helper extracted from that route (also reused by `api/wa-webapp.ts`). 60s in-memory cache, `EMPTY_CONTENT` fallback with an error string.
- Copied from Dream Connect into `src/lib/`: `content-types.ts`, `content-query.ts`, `content.functions.ts`, `cart.tsx`, `pricing.ts`, `square.functions.ts`, `google-maps.functions.ts`, `order-email.functions.ts` (adapted to this project's `mailer.server.ts` / `api/send-mail.ts` relay). Into `src/components/site/`: all 11 site components.
- Routes: replace `index.tsx`; add `page.$slug.tsx`, `cart.tsx`, `checkout.index.tsx`, `checkout.success.tsx`. `__root.tsx` wraps the app in `CartProvider` and mounts `SiteHeader`, `CartSheet`, `SiteFooter`; `SiteLayout.tsx` is reduced to the auth links (Login / Sign Up / Dashboard / Sign out) rendered inside `SiteHeader`.
- `contact.tsx`, `login.tsx`, `signup.tsx`, `dashboard.tsx`, `build-web-apps.tsx` switch their loaders to `siteContentQuery`; `contact.functions.ts` and `signup.functions.ts` read the admin email from the web app.
- `format.ts`: drop `toInternationalPhone` / `whatsappLink` / `brandName` if no longer referenced.
- Styles: port Dream Connect's `styles.css` tokens (site look) while keeping the `prose-site` utility and dashboard styling used by the builder.
- Head metadata per route from web app title/SEO description/keywords; favicon from `settings.favicon`.

## Verification
Load `/`, `/page/<slug>`, `/cart`, `/checkout`, `/contact`, `/login`, `/dashboard` in the preview with the keys set; confirm no requests to azurewebsites.net or blob.vercel-storage.com and that the token 403/525 errors are gone.
