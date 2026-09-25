// Basic safety caps to prevent runaway/abusive creation.
// Admins are exempt from these caps.
export const MAX_WEB_APPS_PER_USER = 10;
export const MAX_PAGES_PER_APP = 100;
export const MAX_PAGE_DEPTH = 2; // top-level page + one level of child pages
