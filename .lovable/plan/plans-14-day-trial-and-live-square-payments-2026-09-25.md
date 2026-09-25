# Plans, 14-day trial and live Square payments

## What you get

- **14-day free trial** starts automatically at sign-up. Existing users get a fresh 14-day trial from launch day.
- **Two plans**: Monthly (AUD $49) and Annual (AUD $470, about 2 months free) to start. Admins get a **Plan settings** screen on the Dashboard to change each plan's price, the trial length, and whether a plan is on or off. Changes apply to new payments straight away. (Technical: stored in a `plan_settings` table and edited through admin-only functions; the payment step always reads the price from this table, never from the browser.)
- **Plan tab** on the Dashboard: shows your status (Trial – X days left / Active until date / Expired), a Monthly/Annual switch, and a card payment form.
- **Expired lock-out**: once a trial or plan ends, you can still sign in, but Build Web Apps and other member pages send you to the Plan tab until you pay. **The API also stops working for that user's web apps.** Getting a token, the web app data and the contacts address all answer with a clear "plan expired" message (technical: HTTP 402, `{"error":"plan_expired"}`), checked against the web app owner's plan on every call. Access comes back as soon as they pay. The admin's own showcase site, cart and demo checkout are never blocked. (Technical: the same owner-plan check is added to both the TanStack routes and the Vercel `api/wa-token.ts`, `api/wa-webapp.ts`, `api/wa-contacts.ts` handlers.)
- **No API request counting.** It isn't needed with flat plans, so there's no usage tracker.
- **Admins** are never locked out. In the Users panel they can see each user's plan status, add trial days, or switch a plan on by hand.
- **Payments**: plans use **live (production) Square** settings once you add them. Until then, they automatically use the existing **sandbox** settings so you can test the whole flow end-to-end with Square's test cards. The Plan tab shows a small "Test mode (sandbox)" note while the sandbox fallback is active. The product cart/checkout stays on the sandbox settings exactly as it is today.
- Paying ahead adds time to the end of the current period. There are no automatic renewals: the user pays again when the plan runs out, and gets a reminder in the Plan tab 7 days before.

## 4 new settings to add in Vercel (and Lovable) when you're ready to go live

- `SQUARE_PROD_APPLICATION_ID`
- `SQUARE_PROD_LOCATION_ID`
- `SQUARE_PROD_ACCESS_TOKEN`
- `SQUARE_PROD_ENVIRONMENT` = `production`

You can test everything first with the existing sandbox settings — no new variables needed. Once these four are set, plan payments switch to real cards automatically, with no code change.

## Technical details

- `db.server.ts`: add columns to `users`: `trial_ends_at`, `plan` (none/monthly/annual), `plan_expires_at`. Add a `subscription_payments` table (user_id, plan, amount, currency, square_payment_id unique, period_start, period_end, created_at). All changes are idempotent ALTERs; existing rows get `trial_ends_at = now + 14d`.
- `signup.functions.ts`: set `trial_ends_at` on insert.
- `src/lib/plans.ts`: `PLANS` config (id, label, amountCents, currency AUD, days 30/365), `TRIAL_DAYS = 14`, and `accessStatus(user)` returning trial / active / expired plus days left.
- `auth.functions.ts`: `CurrentUser` gains `plan`, `trialEndsAt`, `planExpiresAt`, `access`.
- `src/lib/billing.functions.ts`: `getBillingConfig` (reads SQUARE_PROD_* first, falls back to the existing sandbox SQUARE_* variables and reports which mode is active), `purchasePlan({plan, sourceId})`. This checks the session, takes the amount from the server-side config only, charges through Square (production or sandbox depending on mode) with an idempotency key, records the payment, and extends `plan_expires_at = max(now, current) + days`.
- `src/lib/access.server.ts`: `requireActiveAccess(userId)` guard, called in the webapps/webpages/orders/contacts/assets/API-keys server functions (admins exempt). It throws `PLAN_EXPIRED`. This is the real boundary; the route redirects only improve the experience.
- Routes: `/dashboard` gets tabs (Overview, Plan, Users for admins). Support `?tab=plan`. The `build-web-apps` `beforeLoad` redirects expired users to `/dashboard?tab=plan`.
- `src/components/PlanPanel.tsx`: loads the Square Web Payments SDK from the URL matching the active mode (production or sandbox), renders the card form, shows a "Test mode (sandbox)" note when on the fallback, shows toasts on success or failure, then refreshes the user.
- `admin.functions.ts` + `AdminUsersPanel`: status column, "Extend trial" (+N days), and "Set plan until" actions.
- Existing `square.functions.ts` stays untouched (sandbox for the cart).
- The public API endpoints for existing web apps keep serving, so published sites don't go down when an owner's trial lapses.
