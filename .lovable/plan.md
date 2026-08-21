# More formatting options in the web page rich text editor

Today the toolbar has: Bold, Italic, Underline, H2, H3, bullet list, numbered list, Link, Image, PDF, Clear format. Everything below is already supported by the editor engine — only the buttons (and one sanitizer tweak) are missing.

## What gets added

Headings and text blocks, grouped in a compact dropdown labelled "Style" so the toolbar stays tidy:

- Paragraph (normal text, `<p>`)
- Heading 1 through Heading 6 (H1 is included so the set is complete; H4, H5, H6 are new)
- Quote (blockquote)
- Code block

Inline marks (buttons next to Bold/Italic/Underline):

- Strikethrough
- Inline code

Insert actions:

- Horizontal line (the "insert line" divider, `<hr>`)
- Line break inside a paragraph (soft break, shift+enter equivalent)

Editing helpers:

- Undo and Redo buttons

Lists keep their existing buttons, plus:

- Indent / outdent for list items (sink and lift), so nested bullets are possible

## Not included, and why

- Text alignment (left/center/right): the site's shared content styling force-aligns everything left, so alignment buttons would have no visible effect. Say the word if you want that styling relaxed and I'll add alignment too.
- Tables, font size, and colour pickers: heavier additions that change how content renders across the public site; can be a follow-up.

## Technical notes

- `src/components/RichTextEditor.tsx`: add the toolbar controls above using existing StarterKit commands (`setParagraph`, `toggleHeading`, `toggleBlockquote`, `toggleCodeBlock`, `toggleStrike`, `toggleCode`, `setHorizontalRule`, `setHardBreak`, `sinkListItem`, `liftListItem`, `undo`, `redo`). No new packages.
- Toolbar layout: a native select for the block style, small icon-style buttons for the rest, wrapped in the existing flex row.
- `src/lib/sanitize-html.ts`: the allow-list already covers `p, h1-h4, blockquote, pre, code, hr, br, s`; add `h5` and `h6` so those headings survive saving.
- `prose-site` in `src/styles.css` already styles h1-h4; add h5/h6 sizing so they render sensibly on the public site and in the editor.
