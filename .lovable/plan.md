# Wire up the new environment variables and verify content loads

## Goal

Now that the environment variables are updated and `SESSION_SECRET` matches Vercel, finish the switch from the legacy Azure/Blob site to the web builder content: save the secret here, then verify every page shows real web builder data.

## Steps

1. **Save `SESSION_SECRET`** in this project's secrets with the provided value, so the preview can validate the API key/secret hashes the same way Vercel does.
2. **Confirm the other variables are present**: `DREAMOZTECH_API_KEY`, `DREAMOZTECH_API_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (already updated per your message).
3. **Verify content loading**: the preview home page should now show the web app title, logo, favicon, and pages from the builder instead of the fallback "DreamozTech" placeholder.
4. **Verify all routes load**: Home, Contact, Login, Sign Up, Dashboard, Build Web Apps, Cart, Checkout, and dynamic page detail (`/page/<slug>`).
5. **Final build check** to make sure everything compiles for publishing.

## What you will see

- The home page and header/footer show your real web builder content (title, logo, pages, images).
- Cart and checkout work against the same content.
- The API endpoints (`/api/public/wa/token`, `/api/public/wa/webapp`) keep working with the same keys.

## Technical notes

- `SESSION_SECRET` is used both to sign login sessions and to hash/verify API keys (`web_app_api_keys.secret_hash` and token HMAC). It must be identical in Lovable and in Vercel (Settings → Environment Variables) — use the same value in both.
- After this, remove the legacy `VERCEL_BLOB_TOKEN`, `BREVO_API_KEY`, and old `DREAMOZ_API_KEY`/`DREAMOZ_API_SECRET` secrets when you are ready (they are no longer used by any code).
- If the preview still shows fallback content after secrets are saved, the next check will be the server logs for the exact error (missing Turso URL vs. invalid API credentials).
