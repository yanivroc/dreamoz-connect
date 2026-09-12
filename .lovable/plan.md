# SESSION_SECRET value + fix footer hydration error

## 1. SESSION_SECRET — what to put in Vercel

`SESSION_SECRET` is **not issued by any service** — it is a random password-like string your own app uses to sign login sessions. You invent it yourself.

- Easiest: reuse the one you already have — `95254987-d22d-4b29-88a6-3a401faa917f`
- Or generate a fresh one: run `openssl rand -hex 32` (or use a password manager's generator, 32+ characters)
- Add it in Vercel → Settings → Environment Variables → name `SESSION_SECRET`, scope **Production**, then **Redeploy**

Good news: since the recent API-key upgrade, your `WA-…` / `SEC-…` keys **no longer depend on SESSION_SECRET**, so any strong random value works. It only affects login sessions (changing it just logs people out).

## 2. Fix the footer hydration error

The preview logs a React hydration mismatch in `SiteFooter`: the server renders the web-app description text ("Digital growth requires…") but the client removes it. Root cause: the footer renders the description as plain text inside a `<p>`, but descriptions are now stored as rich-text HTML from the editor, so server and client disagree on the markup.

Changes:

1. **`src/components/site/SiteFooter.tsx`** — render the description as sanitized HTML inside a `<div>` (same approach as the page-detail view) instead of raw text inside `<p>`. Empty description renders nothing.
2. Reuse the existing HTML sanitizer already used for page content (no new dependency).
3. **Verify**: load the preview home page, confirm no hydration error in console and the footer description displays formatted as authored.

## Technical notes

- No changes to authentication, API keys, or the health endpoint.
- If the mismatch persists after the HTML fix, the fallback step is to check the dehydrated query data between the root loader and `useQuery`, but the HTML-nesting fix is expected to resolve it.
