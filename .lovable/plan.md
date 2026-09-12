# Fix content not loading on the live site

## What I checked

- The live site at dreamoztech.com returns a page, but it is the "content temporarily unavailable" fallback.
- Calling the live token endpoint with the new key/secret pair returns `401 Invalid credentials`, while the same pair works in the preview.

So the key pair is fine; the live site rejects it.

## Why this happens

The API secret is not stored directly. It is stored as a fingerprint calculated with `SESSION_SECRET`. The fingerprint currently saved in the database was calculated with the preview's `SESSION_SECRET`. The live site therefore only accepts the pair when its `SESSION_SECRET` is byte-for-byte identical.

A 401 on live means the live `SESSION_SECRET` is different: a different value, extra quotes/spaces, set on the wrong environment (Preview vs Production), or the change was saved but the site was not redeployed afterwards (environment values only apply to a new deployment).

## Plan

1. **Make the login/session secret consistent.** Set `SESSION_SECRET` in Vercel (Production, and Preview if used) to exactly `95254987-d22d-4b29-88a6-3a401faa917f` — no quotes, no trailing space — then trigger a fresh deployment.
2. **Remove the fragile link between the two.** Change the way API secrets are fingerprinted so it no longer depends on `SESSION_SECRET`: use a plain SHA-256 fingerprint of the secret instead. This means changing the login session key in the future can never again break the website content or the API.
3. **Migrate existing keys safely.** On verification, accept the new SHA-256 fingerprint, and fall back once to the old `SESSION_SECRET`-based fingerprint; when the old one matches, silently rewrite the stored fingerprint to the new format. Newly generated keys use the new format only. Nobody has to regenerate anything.
4. **Re-verify.** Confirm the live token endpoint returns a token and the home page shows the real title, logo, pages and images instead of the fallback.

## Technical notes

- Files touched: `src/lib/webapi.server.ts` (add `secretFingerprint`), `src/routes/api/public/wa/token.ts`, `api/wa-token.ts` (Vercel Node function), `src/lib/content.server.ts` (server-side content resolver), and the API key generation path in `src/lib/webapi.functions.ts`.
- Session cookies keep using `SESSION_SECRET`; only API-key verification stops using it.
- Step 1 is still needed for logged-in sessions to stay valid across preview and production.
