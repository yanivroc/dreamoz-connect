# Make phone number mandatory at checkout

## Current state (verified)
- `src/routes/checkout.index.tsx` — `handlePay` only validates `form.name` and `form.email`; phone can be left blank.
- `src/lib/square.functions.ts` — `checkoutSchema` has `phone: z.string().max(40).optional().default("")`, so the server also accepts an empty phone.
- The Phone input has no "required" indicator.

## Changes

1. **Checkout page (`src/routes/checkout.index.tsx`)**
   - Require phone in `handlePay`: block submission with a toast "Please enter your name, email, and phone number." if it's empty.
   - Mark the Phone label as required (e.g. "Phone *") so it's clear before submitting.

2. **Server validation (`src/lib/square.functions.ts`)**
   - Change phone in `checkoutSchema` to `z.string().min(1).max(40)` so the payment is rejected server-side too if phone is missing (protects against bypassing the page).

3. **Order confirmation emails (`src/lib/order-email.functions.ts`)**
   - Verify the phone field renders fine (it already passes the customer object through); no change expected unless it tolerates empty strings differently.

## Verification
- Typecheck (`bunx tsc --noEmit`).
- Playwright: open checkout with an item in cart, try paying with empty phone → blocked with toast; fill phone → proceeds to card tokenization step.
