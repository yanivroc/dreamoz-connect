# Diagnose and fix contact-form email on the live site

The form is failing on the deployed Vercel site. Right now every SMTP failure is collapsed into the same generic message, so the real reason (wrong password, blocked port, missing setting, timeout) is invisible. The plan is to make the failure visible first, then fix it.

## Step 1 — Make the real reason visible

Add a token-protected diagnostics endpoint at `/api/public/email-test` (guarded by the existing `CACHE_BUST_TOKEN`, same style as the cache endpoints). Visiting it:

- reports which SMTP settings are present (host, port, secure, user — never the password)
- opens a real connection to `mail.privateemail.com` and verifies the login
- optionally sends a test message to an address given in the query string
- returns the exact provider error code and message

That tells us in one request whether it's credentials, port/network, or something else.

## Step 2 — Harden the sender

- Distinguish the failure cases in `sendMail` so the user-facing text is accurate: "email is not configured" vs. "could not send right now".
- Log the full SMTP error server-side (code, response, command) so it shows in Vercel logs.
- Add a connection/greeting/socket timeout (10s) so a blocked port fails fast instead of hanging.
- If the connection on port 465 (SSL) fails at the network level, automatically retry once on port 587 with STARTTLS. Namecheap supports both, and one of the two is usually the one a host allows.

## Step 3 — Apply the fix the diagnostics point to

Most likely outcomes and their fixes:

- **Auth failure (535)** — the mailbox password in Vercel is wrong or was rotated; re-enter `SMTP_PASSWORD` in Vercel and redeploy. Note the password pasted in chat earlier should be rotated anyway.
- **Sender not allowed (550/553)** — the `From` address must be the authenticated mailbox. The contact form currently sends as `"<visitor name> via DreamozTech" <support@dreamoztech.com>`; if Namecheap rejects that, the display name is dropped and the visitor stays as reply-to only.
- **Connection timeout / refused** — the 587 STARTTLS fallback from step 2 covers it; if both are blocked, the runtime the function landed on has no outbound SMTP and we would need to revisit (you chose SMTP-only for now, so this would be reported rather than worked around).
- **Missing variables** — the endpoint lists exactly which ones are absent in Vercel.

## Notes

- The Lovable preview cannot open SMTP connections at all, so testing must be done against the deployed site.
- No change to email content, recipients, consent wording, or the sign-up flow beyond the shared sender helper.

## Technical detail

- New file `src/routes/api/public/email-test.ts` — token check, `nodemailer` dynamically imported inside the handler, `transport.verify()` plus optional `sendMail`, returns JSON with `{ config, verified, error }`; no secret values in the response.
- `src/lib/mailer.server.ts` — typed error propagation, timeouts, one 587 fallback attempt, structured `console.error`.
- `src/lib/contact.functions.ts` / `signup.functions.ts` — unchanged call sites.
