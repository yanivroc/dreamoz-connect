# Marketing consent opt-in on Contact and Sign Up

Add an explicit, unchecked, mandatory consent checkbox to both forms so submissions qualify as valid marketing consent under Brevo's Anti-Spam Policy.

## Consent wording

Checkbox label (improved wording):

> I agree to receive marketing emails from DreamozTech about its services, product updates, offers and news. I understand I can unsubscribe at any time using the link in any email.

Small helper text under the checkbox:

> We only use your details to respond to your enquiry and to send the communications you consent to.

The box starts unchecked, is required, and shows a clear error if the user submits without ticking it.

## Contact page

- `src/components/ContactForm.tsx`: add the checkbox (unchecked by default, `required`), styled to match the existing fields, placed above the submit button. Block submit and show a toast if not ticked.
- `src/lib/contact.functions.ts`: add `marketingConsent: z.literal(true)` to the Zod schema so consent is enforced server-side too, and include a "Marketing consent: Yes — given <timestamp UTC>" line in the notification email sent to the team (text and HTML), providing an auditable record.

## Sign Up page

- `src/components/SignUpForm.tsx`: same checkbox, same behaviour, placed after the captcha field.
- `src/lib/signup.functions.ts`: add `marketingConsent: z.literal(true)` to the schema; store consent with the account and include it in the admin notification email.
- `src/lib/db.server.ts`: extend the existing auto-migration for `users` with two nullable columns, added only if missing:
  - `marketing_consent` integer (0/1)
  - `marketing_consent_at` text (ISO timestamp)
  New signups write `1` plus the timestamp; existing rows stay null.

## Notes

- The other two pages mentioned by Brevo (Service Inquiry Form, Project Checkout/Consultation Request) do not exist in this project — only Contact and Sign Up collect emails here. If those live elsewhere, they need the same change on that platform.
- No change to the welcome email itself, but the admin copy will record consent for compliance evidence.
