# Order summary currency code only on Total + toast X on the right

## What changes

### 1. Checkout order summary — currency code only on the Total
- `src/lib/content-types.ts` — `formatMoney` gains an optional third argument `{ code?: boolean }` (defaults to `true`, so product cards, product page, cart, emails and invoice are unchanged). Passing `{ code: false }` returns just the symbol amount, e.g. `$160.00`.
- `src/routes/checkout.index.tsx`:
  - Line items: `AUD $160.00` → `$160.00`
  - Shipping row: `AUD $20.00` → `$20.00`
  - Total row: keeps `AUD $180.00`
  - Pay button keeps `Pay AUD $180.00` (it mirrors the total — confirm if you'd rather it be plain too)

### 2. Toast close X moves to the top-right
- Sonner positions its close button on the left via its own inline styles, so the Tailwind override in `sonner.tsx` isn't winning. Fix in `src/styles.css` with a targeted override:
  ```css
  [data-sonner-toast] [data-close-button] {
    left: auto !important;
    right: -8px;
  }
  ```
- Simplify the now-redundant `closeButton` classNames in `src/components/ui/sonner.tsx` to just the colour/border styling.

## Verify
- `bunx tsgo --noEmit`
- Playwright: cart drawer and checkout show plain amounts for items/shipping, `AUD` only on Total; trigger a toast and confirm the X sits on the top-right and closes it.
