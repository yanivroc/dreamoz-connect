# Fix Innovate section alignment

## What's wrong

The Brand section reads correctly: title on the left, description starting at the left of the content column. The Innovate section's description block is centered and pushed toward the middle of the page, and its post cards sit in a narrower, centered column. This is because the Innovate content coming from the API carries its own centering markup (centered text and auto-centred wrapper widths), which the page currently renders as-is, while Brand's content happens not to.

## The change

Normalize the API-supplied HTML so every section renders with the same alignment rules, regardless of what the source markup contains:

1. Page-level description HTML (the block next to the section number/title) is forced to left alignment and full column width in all sections.
2. Inline centering coming from the API — centered text, auto side margins, fixed narrow widths on wrappers — is neutralized so blocks fill the available column like Brand does.
3. Post bodies inside cards get the same treatment, so the Innovate cards line up with Brand cards.

Result: Innovate matches Brand — number and title on the left, description left-aligned across the row, cards full width in the section container.

## Technical notes

- `src/styles.css`: extend `prose-api` with the same left-alignment override `prose-site` already has, and add neutralizers for API inline styles: `[style*="text-align:center"]`, `margin-left/right: auto`, and inline `width`/`max-width` on direct children (`width: 100% !important; max-width: none !important; margin-left: 0 !important;`). Also force `text-align: left` on `[align="center"]` and `<center>` elements.
- `src/routes/index.tsx`: no structural change needed; the header grid and card layout already match Brand once the inherited centering is removed.
