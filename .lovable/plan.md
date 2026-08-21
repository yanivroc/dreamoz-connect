# Collapsible parent rows in web page builder

## What to change

Add a collapse / expand control to each parent page row in `src/components/WebPagesPanel.tsx` so child pages can be hidden quickly, making it easier to drag-and-drop parent pages.

## How it will work

- Add component state to track which parent IDs are currently collapsed, e.g. `collapsed: Set<number>` or a `Record<number, boolean>`.
- In `renderPage`, when `isChild === false`, show a chevron / plus-minus toggle next to the drag handle on the parent row.
- Clicking the toggle flips that parent's collapsed state.
- Only parents with children show the toggle button.
- In the list renderer, wrap the child rows in a conditional container that is rendered only when the parent is expanded.
- Default all parents to expanded on first load so users do not lose their current view.
- Keep the existing drag-and-drop behavior for parent rows unchanged; child rows remain non-draggable.

## Files changed

- `src/components/WebPagesPanel.tsx` only.
