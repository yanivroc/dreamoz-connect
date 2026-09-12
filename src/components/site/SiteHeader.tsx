import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu, ShoppingCart, X } from "lucide-react";
import { siteContentQuery } from "@/lib/content-query";
import { slugify, sortPages } from "@/lib/content-types";
import { useCart } from "@/lib/cart";
import { me, logout, type CurrentUser } from "@/lib/auth.functions";

function useSessionUser() {
  const fetchMe = useServerFn(me);
  return useQuery<CurrentUser | null>({
    queryKey: ["session-user"],
    queryFn: () => fetchMe(),
    staleTime: 30_000,
  });
}

export function SiteHeader() {
  const { data } = useQuery(siteContentQuery);
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOut = useServerFn(logout);
  const { data: user } = useSessionUser();

  const content = data?.content;
  const pages = sortPages(content?.pages ?? []);
  const logo = content?.settings?.logo;
  const brand = content?.webApp?.title?.trim() || "DreamozTech";

  const accountLinks = user
    ? [{ to: "/dashboard", label: "Dashboard" }]
    : [
        { to: "/signup", label: "Sign Up" },
        { to: "/login", label: "Login" },
      ];

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    queryClient.clear();
    await router.invalidate();
    router.navigate({ to: "/login", search: {}, replace: true });
  }

  const linkClass =
    "text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          {logo ? (
            <img src={logo} alt={brand} className="h-8 w-auto" />
          ) : (
            <span className="truncate text-lg font-bold tracking-tight text-foreground">
              {brand}
            </span>
          )}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/" className={linkClass}>
              Home
            </Link>
            <Link to="/contact" className={linkClass}>
              Contact
            </Link>
            {accountLinks.map((item) => (
              <Link key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </Link>
            ))}
            {user ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-full border border-border/70 px-4 py-1.5 text-sm transition hover:bg-card"
              >
                Sign out
              </button>
            ) : null}
          </nav>
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
            <div className="my-1 border-t border-border" />
            <Link
              to="/contact"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-primary"
            >
              Contact
            </Link>
            {accountLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-md px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-card hover:text-primary"
              >
                Sign out ({user.name})
              </button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
