# Make all checkout fields mandatory

## Current state (verified)
- `src/routes/checkout.index.tsx` only enforces name, email, and phone in `handlePay`. Address, city, postcode, and country are optional.
- The Phone input label is currently "Phone *".
- `src/lib/square.functions.ts` marks `address`, `city`, `postcode`, and `country` as `.optional().default(...)`, so the server also accepts empty values.

## Changes

1. **Checkout page (`src/routes/checkout.index.tsx`)**
   - Change the Phone label from "Phone *" to "Phone".
   - Update `handlePay` to block submission if any of `name`, `email`, `phone`, `address`, `city`, `postcode`, or `country` is empty/whitespace.
   - Update the error toast to say "Please enter your full name, email, phone, address, city, postcode, and country."
   - Mark address, city, postcode, and country inputs as `required` alongside name, email, and phone.

2. **Server validation (`src/lib/square.functions.ts`)**
   - Change `address`, `city`, `postcode`, and `country` in `checkoutSchema` from optional to required with `.min(1)` so the payment is rejected server-side if any field is missing (protects against bypassing the page).
   - Keep existing `.max(...)` length limits.

## Verification
- Typecheck (`bunx tsc --noEmit`).
- Playwright: open checkout with an item in cart, try paying with each required field empty → blocked with toast; fill all fields → proceeds to card tokenization step.
