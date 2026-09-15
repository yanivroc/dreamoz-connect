# Currency code on prices, closable toasts, no more browser popups

## 1. Show the currency code with every price

Today a price shows only a symbol ("$80.00"), so an Australian and a US price look identical. Prices will show the code in front of the amount:

- Australia: `AUD $80.00`
- United States: `USD $80.00`
- United Kingdom: `GBP £80.00`

This applies everywhere prices appear: product cards on list pages, the product detail page, the cart drawer, the cart page, checkout (order summary and totals), the confirmation emails, and the PDF invoice. All of these already read the currency from the Country setting in General settings, so one change to the shared formatter updates them all.

## 2. Close button on notifications

Pop-up notifications get a small X in the top-right corner so they can be dismissed straight away instead of waiting for them to fade.

## 3. Replace remaining browser popups with in-app dialogs

Three places still use the plain browser confirm box:

- Deleting a web app
- Deleting a user (admin list)
- Regenerating an API secret

These become the same in-app confirmation dialog already used when deleting a page, with the result reported as a notification. Removing an attached image already uses notifications and needs no change (it deletes immediately, with an error notification if it fails).

## Technical notes

- `formatMoney` in `src/lib/content-types.ts`: prefix the `Intl.NumberFormat` currency output with the uppercase currency code (`AUD $80.00`). Keep the same signature so every caller benefits.
- `src/lib/invoice.server.ts` has its own `en-AU` formatter — align it with the same output.
- `src/components/ui/sonner.tsx`: pass `closeButton` to `<Sonner>` and add a `closeButton` entry to `toastOptions.classNames` so the X matches the theme.
- Replace `window.confirm` in `src/components/WebAppsPanel.tsx`, `src/components/AdminUsersPanel.tsx`, and `src/components/ApiPanel.tsx` with shadcn `AlertDialog`, mirroring the pending-item state pattern in `WebPagesPanel.tsx` (single dialog per panel, destructive action button, buttons disabled while the request runs).
