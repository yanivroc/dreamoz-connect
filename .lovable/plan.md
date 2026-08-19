# Hide the timezone suffix on timestamps

Right now dates render as `20 Aug 2026, 05:35 GMT+10`. The times are already converted to each viewer's own local zone — only the trailing zone label is noise.

## Change

In `src/lib/format.ts`, drop `timeZoneName: "short"` from `formatDateTime()`. Output becomes `20 Aug 2026, 05:35` (still the viewer's local time, DST-aware).

The hover tooltip keeps the full UTC value, so the underlying zone is still checkable when needed.
