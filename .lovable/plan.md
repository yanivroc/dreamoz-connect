# Update the web app API credentials and verify content loads

## Steps

1. **Update the secrets** `DREAMOZTECH_API_KEY` and `DREAMOZTECH_API_SECRET` in this project with the newly generated pair (WA-n7UL... key and SEC-_xsw... secret), created after `SESSION_SECRET` was fixed.
2. **Verify the credentials resolve** — the preview should find the API key row and match the secret hash (no more "Invalid DREAMOZTECH API credentials").
3. **Verify real content loads** across the routes: Home (title, logo, favicon, hero, sections), page detail (`/page/<slug>`), Cart, Checkout, Contact, Login, Sign Up, Dashboard, Build Web Apps.
4. **Final build check** so everything compiles for publishing.

## What you will see

- The home page and header/footer show your real web builder content instead of the fallback placeholder.

## What you need to do

- Update the same two `DREAMOZTECH_API_KEY` / `DREAMOZTECH_API_SECRET` values in **Vercel → Settings → Environment Variables**, so the deployed site uses the new pair too.

## Technical notes

- The old pair was generated under a different `SESSION_SECRET`, so its secret hash could never match; the new pair is created under the current secret and will validate.
