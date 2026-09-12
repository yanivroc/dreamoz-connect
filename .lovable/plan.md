# Contact, footer, login captcha, and testimonial image updates

## Changes

1. **Contact page**
   - Remove the entire right-hand “Contact details” panel.
   - Let the “Send us a message” form use the available content width with a comfortable maximum width, rather than leaving an empty second column.

2. **Footer**
   - Remove the Contact column, including the email address and website link.
   - Rebalance the remaining brand description and Explore links into a clean two-column layout.

3. **Login captcha**
   - Generate a fresh math question whenever the login form opens instead of always starting at `3 + 2`.
   - Keep generating another question after an unsuccessful sign-in attempt.
   - Avoid repeating the immediately previous question when the page is reopened in the same browser tab.

4. **Testimonials image**
   - Add a compact media presentation specifically for the Testimonial section.
   - Constrain the image and carousel to a balanced maximum width and height, center it, and preserve the full image without cropping.
   - Keep multiple-image arrows and the image counter working.

## Verification

- Check Contact, Login, Footer, and the Testimonial section at desktop and mobile widths.
- Confirm the contact panel and footer contact links are gone, captcha changes between visits, and testimonial media is visibly smaller without distortion.
