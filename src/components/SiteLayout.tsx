import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Phone } from "lucide-react";
import type { Member, ServicePage } from "@/lib/dreamoz.types";
import { brandName, toInternationalPhone } from "@/lib/format";
import { useEffect } from "react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/contact", label: "Contact" },
];

export function SiteLayout({
  children,
  member,
  logo,
  favicon,
}: {
  children: ReactNode;
  member?: Member | null;
  logo?: string | null;
  favicon?: string | null;
  footerPage?: ServicePage | null;
}) {
  const name = brandName(member?.memberFullName);
  const phone = member?.mobileNumber?.trim() || null;
  const dial = toInternationalPhone(member?.mobileNumber, member?.country);

  useEffect(() => {
    if (!favicon) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }, [favicon]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
          >
            {name}
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
          {phone ? (
            <a
              href={`tel:${dial ? `+${dial}` : phone}`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <Phone size={18} />
              <span className="hidden sm:inline">Call Us</span>
            </a>
          ) : (
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <Phone size={18} />
              <span className="hidden sm:inline">Call Us</span>
            </Link>
          )}
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-border/60 bg-surface/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
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
