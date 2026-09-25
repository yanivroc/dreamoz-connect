# Show current plans on the sign-up page

## What will change

- Add a clean pricing section beside the sign-up form.
- Show the current free-trial length and every enabled plan, including its admin-set name, price, currency, and access period.
- Read these values from the same Plan settings used for payment, so admin changes appear automatically.
- Keep sign-up itself unchanged; no card is required to begin the trial.

## Technical details

- Add a public, read-only billing function that returns only trial length and enabled plan display data, with the existing defaults as a safe fallback.
- Load that data with the sign-up page and render a two-column desktop layout that stacks cleanly on smaller screens.
