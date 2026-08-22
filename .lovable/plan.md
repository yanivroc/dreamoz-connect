# Make the Web App API reachable on dreamoztech.com

## What I found

The API code itself is fine — the problem is that the live Vercel site never routes to it.

Tested just now:

```text
POST https://dreamoztech.com/api/public/wa/token   -> 404 NOT_FOUND (Vercel)
GET  https://dreamoztech.com/api/public/wa/webapp  -> 404 NOT_FOUND
GET  https://dreamoztech.com/api/public/cache-status -> 404
GET  https://dreamoztech.com/api/media             -> 400 (works: it is a Vercel /api function)
GET  https://dreamoztech.com/                      -> 200
```

Locally the same token endpoint answers correctly (400 for bad input, 503 only because the
sandbox has no database credentials), so the route exists and is registered.

Pattern: every framework route under `/api/...` returns 404 in production, while the two
plain Vercel functions in the `api/` folder (`blob-proxy`, `send-mail`) work. The deployed
site is serving the pre-rendered pages plus the `api/` functions only — the framework's
server endpoints are not being served at all. So Postman is hitting Vercel's own 404 page,
which is exactly what your screenshot shows ("The page could not be found / NOT_FOUND").

## Proposed fix

Serve the two API endpoints the same way the working ones are served, as Vercel functions:

1. Add `api/wa-token.ts` — same logic as the current token route: validate `apiKey`/`apiSecret`
   with Zod, look up `web_app_api_keys`, timing-safe compare the HMAC secret hash, return
   `{ token, tokenType, expiresIn }`.
2. Add `api/wa-webapp.ts` — same logic as the current webapp route: verify the bearer token,
   then return web app, settings (logo/favicon), shipping rates and the nested pages/images tree.
3. Both reuse the existing signing/verifying helpers and the Turso client, keep the CORS headers
   and an `OPTIONS` handler, and read all secrets inside the handler.
4. Add rewrites in `vercel.json` so the documented URLs keep working:
   `/api/public/wa/token -> /api/wa-token`, `/api/public/wa/webapp -> /api/wa-webapp`.
5. Leave the existing framework routes in place so the endpoints also work in preview.

The API tab documentation URLs stay unchanged.

## Verification

After deploy, run the exact Postman calls: POST the token endpoint with your key/secret and
confirm a token comes back, then GET the webapp endpoint with `Authorization: Bearer <token>`
and confirm the JSON payload. Also confirm a bad secret returns 401 and a missing token 401.

## Note

This needs a redeploy of the site on Vercel to take effect; preview will show it immediately.
