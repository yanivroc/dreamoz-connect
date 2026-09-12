import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, ShoppingCart, X } from "lucide-react";
import { siteContentQuery } from "@/lib/content-query";
import { slugify, sortPages } from "@/lib/content-types";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const { data } = useQuery(siteContentQuery);
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const content = data?.content;
  const pages = sortPages(content?.pages ?? []);
  const logo = content?.settings?.logo;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          {logo ? (
            <img src={logo} alt={content?.webApp?.title ?? "Logo"} className="h-8 w-auto" />
          ) : (
            <span className="truncate text-lg font-bold tracking-tight text-foreground">
              {content?.webApp?.title ?? "DreamozTech"}
            </span>
          )}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {count > 0 ? (
            <button
              onClick={() => setOpen(true)}
              aria-label="Open cart"
              className="relative rounded-md p-2 text-foreground transition-colors hover:text-primary"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {count}
              </span>
            </button>
          ) : null}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="rounded-md p-2 text-foreground transition-colors hover:text-primary"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="max-h-[70vh] overflow-y-auto border-t border-border bg-background/95">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
            {pages.map((page) => (
              <Link
                key={page.id}
                to="/page/$slug"
                params={{ slug: slugify(page.title) }}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-primary"
                activeProps={{ className: "text-primary" }}
              >
                {page.title}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
