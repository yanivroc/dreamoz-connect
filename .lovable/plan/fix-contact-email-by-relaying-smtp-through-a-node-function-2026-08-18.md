# Fix contact email by relaying SMTP through a Node function

## What's wrong

Your other project ("Dreamoztech Image Fetcher") uses the same mailbox settings but works, because it does **not** send SMTP from the app itself. This project's app runs in an edge runtime that cannot open a mail-server connection, so every send fails and the form shows "Could not send your message right now."

The working project solves it with a small Vercel Node serverless function (`api/send-mail.ts`) that lives outside the app bundle, in the Node runtime where SMTP works. The app posts the message to that function, and the function talks to `mail.privateemail.com`.

## The fix

Port that exact working setup into this project:

1. Add `api/send-mail.ts` — a Vercel Node function that validates the request, connects to Namecheap Private Email over SSL (465, with your `SMTP_*` settings) and sends the message. It authenticates callers with an internal token derived from `SMTP_PASSWORD`, so no new secret is needed.
2. Rewrite `src/lib/mailer.server.ts` so `sendMail()` posts to `/api/send-mail` on the same deployment instead of opening SMTP directly. Same call signature, so the contact form and sign-up flow are unchanged apart from the config helper name.
3. Keep the sender identity on the relay side: `From` is always the authenticated mailbox (`support@dreamoztech.com`, display name DreamozTech) and the visitor stays as reply-to — this is what keeps Namecheap from rejecting the message.
4. Surface the real error text when a send fails, so future problems are diagnosable instead of showing the generic message.

## Environment variables (Vercel)

Same ones you already have, plus the two optional sender overrides used by the relay:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`
- `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` (optional; default to the mailbox and "DreamozTech")

## Notes

- Sending still won't work in the Lovable preview — there is no Node serverless function there. It works on the deployed Vercel site.
- Email content, recipients, captcha and marketing-consent wording stay exactly as they are.

## Technical detail

- New `api/send-mail.ts` (`export const config = { runtime: "nodejs" }`), copied from the working project: Zod-free manual validation of `to`/`subject`/`htmlContent`/`replyTo`/`attachment`, HMAC-SHA256 `x-mail-secret` header compared with `timingSafeEqual`, `nodemailer.createTransport` from `SMTP_*`, returns `{ ok, messageId }` or a 502 with the SMTP error.
- `src/lib/mailer.server.ts`: export `getMailConfig()` and `sendMail()`; relay URL from `getRequestUrl()` with a `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` fallback; token via `crypto.subtle` HMAC of the same label.
- `src/lib/contact.functions.ts` and `src/lib/signup.functions.ts`: swap `mailConfig` for `getMailConfig`; no other change.
- `nodemailer` stays a dependency (now used only by the Node function).
