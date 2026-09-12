# Refine checkout email and home-page typography

## Changes

1. **Remove the Square receipt link from order emails**
   - Remove the “View your Square receipt” line from both the customer confirmation and the owner’s order copy.
   - Keep the payment reference, order summary, customer details, and all other email content unchanged.

2. **Improve API-loaded text on the home page**
   - Apply the site’s existing display and body fonts consistently to the home hero, section titles, paragraphs, lists, and headings contained in API descriptions.
   - Add a clearer heading hierarchy, balanced spacing between paragraphs and lists, comfortable line lengths, and consistent text colors.
   - Normalize formatting embedded in API HTML so unexpected font families, font sizes, alignment, or margins do not disrupt the home-page layout.
   - Keep these presentation changes focused on the home page and preserve the current section order, content, imagery, links, and responsive layouts.

3. **Rename the home-page link**
   - Change every home-section link currently labelled “Visit link” to “Learn More”.
   - Preserve its current destination and new-tab behavior.

## Verification

- Check the generated customer and owner email HTML no longer contains the Square receipt wording or link.
- Review the home page at desktop and mobile widths to confirm API text has a consistent hierarchy and does not overflow or overlap.
- Confirm “Learn More” appears wherever the former “Visit link” was shown and still opens the configured hyperlink.

## Technical notes

- Update `src/lib/order-email.functions.ts` to remove the shared receipt block from both email bodies; checkout payment handling remains unchanged.
- Add a dedicated home-content typography utility in `src/styles.css`, using the existing semantic colors and Space Grotesk/DM Sans font tokens.
- Apply that utility through the home route and hero rich-text rendering, without altering API data or sanitization.
- Update the label in `src/routes/index.tsx`.
