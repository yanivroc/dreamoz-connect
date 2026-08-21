# Web page builder: ordering, cleaner list, better image attachments

## 1. Order numbers start at 1 and auto-increment

- New page form pre-fills the next order number: for a top-level page it is (highest parent order) + 1, for a child page it is (highest order among that parent's children) + 1. Changing the "Parent page" dropdown re-computes it.
- Numbering starts at 1, not 0. Drag-and-drop reordering renumbers 1, 2, 3... instead of 0, 1, 2.
- Existing pages keep working; anything currently at 0 is renumbered next time its group is reordered or saved.

## 2. Compact page list

- The list shows only the page title (plus the order badge, enabled/product markers and Edit/Delete actions). Descriptions are no longer rendered in the list.
- The full description is still there and editable when you click Edit.
- Result: rows are short and uniform, so dragging parents to reorder is much easier.

## 3. Images: drag to order, max 10, optional hyperlink

- Each page can hold up to 10 images; the upload control is disabled with a note once 10 are attached.
- Image thumbnails can be dragged to reorder; the new order is saved immediately.
- Each image gets an optional "Hyperlink" field (a URL the image links to), editable inline per image and saved on blur.

## 4. Attachment section moves into the form

- The "Add image" control moves out of the list rows and into the page form, below the product fields.
- When editing an existing page it shows that page's thumbnails, ordering and hyperlink fields. When creating a new page it shows a short note that images can be added after the page is saved.

## Technical notes

- `src/lib/db.server.ts`: add a `hyperlink` column to `web_page_images` (additive `ALTER TABLE` guarded like the other migrations).
- `src/lib/webpages.functions.ts`:
  - `listWebPages` returns `hyperlink` on each image.
  - `addPageImage` rejects the upload when the page already has 10 images and accepts an optional `hyperlink` (URL, ≤ 500 chars).
  - New `updatePageImage` (hyperlink and/or alt) and `reorderPageImages` (array of `{id, orderNo}` scoped to one page, ownership checked via `assertPage`).
  - `createWebPage`/`updateWebPage`/`reorderWebPages` order bounds become `min(1)`.
- `src/components/WebPagesPanel.tsx`:
  - Compute the suggested next order number from the current tree when opening the create form or switching parent.
  - Reorder handler emits `orderNo: i + 1`.
  - Row renderer drops the `dangerouslySetInnerHTML` description block and the per-row image strip/upload.
  - New in-form image manager: grid of thumbnails with HTML5 drag-and-drop, remove button, hyperlink input, and the file input gated at 10 images.
- `src/routes/api/public/wa/webapp.ts`: include `hyperlink` in each page image object so API consumers get it.
