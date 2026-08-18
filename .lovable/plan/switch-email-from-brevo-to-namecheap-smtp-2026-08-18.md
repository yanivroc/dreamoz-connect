# Switch email from Brevo to Namecheap SMTP

## What changes
All outgoing email (contact form, welcome email, admin sign-up notification) is sent through your Namecheap Private Email mailbox instead of Brevo. Message content, recipients and consent wording stay exactly the same.

Sender: `support@dreamoztech.com`, display name `DreamozTech` (reply-to still points at the person who submitted the form).

## Important limitation
SMTP needs a direct mail-server connection, which the Lovable preview runtime cannot open. On the preview, submitting the contact or sign-up form will show a clear "email is not configured in preview" message; everything works normally once deployed to Vercel (Node runtime).

## Settings you add in Vercel
- `SMTP_HOST` = mail.privateemail.com
- `SMTP_PORT` = 465
- `SMTP_SECURE` = true
- `SMTP_USER` = support@dreamoztech.com
- `SMTP_PASSWORD` = your mailbox password
- `SMTP_FROM_EMAIL` = support@dreamoztech.com (optional, defaults to the username)
- `SMTP_FROM_NAME` = DreamozTech (optional)

Note: the password you pasted in chat is now in the message history — worth rotating it in Namecheap after setup and using the new one in Vercel. `BREVO_API_KEY` / `BREVO_FROM_*` can be deleted afterwards.

## Technical notes
- Add `nodemailer` (+ `@types/nodemailer`). It is Node-only, so it is imported dynamically inside handlers, never at module scope.
- Replace `src/lib/brevo.server.ts` with `src/lib/mailer.server.ts` exporting `mailConfig()` and `sendMail({ from, to, replyTo, subject, htmlContent, textContent })` — same call signature as `sendBrevoEmail`, so call sites change only in their import and function name.
- Transport built lazily per send from `process.env` inside the handler; SSL on 465 (`secure: true`), STARTTLS on 587 (`secure: false`).
- Missing SMTP env vars, or a runtime without TCP sockets, throw/return the same user-facing "could not send right now" message already used; provider errors are logged server-side only.
- Update `src/lib/contact.functions.ts` and `src/lib/signup.functions.ts` to use the new helper. Sign-up keeps its current behaviour: email failures are logged but do not fail account creation.
- Delete `src/lib/brevo.server.ts`.
