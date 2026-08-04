import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Member } from "@/lib/dreamoz.types";
import { brandName, whatsappLink } from "@/lib/format";

const nav = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/insights", label: "Insights" },
  
  { to: "/contact", label: "Contact" },
];

export function SiteLayout({
  children,
  member,
}: {
  children: ReactNode;
  member?: Member | null;
}) {
  const name = brandName(member?.memberFullName);
  const wa = whatsappLink(member?.mobileNumber, member?.country);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="font-display text-lg font-bold tracking-tight">
              {name}
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-gradient-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Start a project
            </a>
          ) : (
            <Link
              to="/contact"
              className="rounded-full bg-gradient-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Start a project
            </Link>
          )}
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-border/60 bg-surface/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {name}. Software development, web platforms
            and growth engineering.
          </p>
          <nav className="flex flex-wrap gap-4">
            {nav.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
