# Header and contact phone CTA tidy-up

## 1. Contact page — remove WhatsApp and duplicate phone display
- In `src/routes/contact.tsx`:
  - Remove the "Text Us" WhatsApp button and the `whatsappLink`/`MessageCircle` usage.
  - Change the phone button to match the "Email Us" button styling: `<Phone size={18} /> Call Us` with a `tel:` link using the internationalised number.
  - Remove the separate "Phone" row below the address block.
  - The phone number remains in the `href`, so mobile users can still tap to dial.

## 2. Header — align the "Call Us" CTA with the email button style
- In `src/components/SiteLayout.tsx`:
  - Keep the phone icon and `tel:` link.
  - Show only the label "Call Us" (no visible phone number text).
  - Use the same gradient button classes as the contact page "Email Us" button: `px-5 py-2.5`, `shadow-card`, `hover:opacity-90`.
  - Keep the fallback `/contact` link when no mobile number is available.

## Outcome
- The phone CTA is consistent across the header and contact details: a gradient rounded button with a phone icon and the label "Call Us".
- The WhatsApp "Text Us" button and the plain "Phone" row below the address are removed.
- The phone number itself is still usable because it lives in the `tel:` href.
