# Safer delete for web pages

## Current behaviour

- Delete uses a native browser confirm popup with the same text for every page: `Delete "<title>" and its sub pages?`
- Confirming deletes the page, all of its child pages, and all attached images. No count, no undo.
- Result is reported with a toast.

## Proposed change

Replace the native popup with an in-app confirmation dialog (shadcn AlertDialog) in the web pages panel:

- Title: `Delete "<page title>"?`
- For a page with no children: "This page and its images will be permanently deleted."
- For a parent page: "This will also permanently delete N sub page(s) and all their images." with the sub page titles listed.
- Buttons: Cancel (default focus) and Delete (destructive styling).
- On success keep the existing toast, but include the number of pages removed, e.g. "Deleted 1 page and 3 sub pages."

No change to the server logic — cascade delete stays as it is.

## Technical notes

- Edit `src/components/WebPagesPanel.tsx` only: hold `pendingDelete: WebPage | null` state, compute children from the already-loaded page list, and render one AlertDialog for the panel rather than one per row.
- `deleteWebPage` in `src/lib/webpages.functions.ts` remains unchanged.
