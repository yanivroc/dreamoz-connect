import type { ReactNode } from "react";

/**
 * Page wrapper for inner routes. The header, footer and cart drawer are
 * mounted once in the root route, so this only provides the page surface.
 */
export function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
