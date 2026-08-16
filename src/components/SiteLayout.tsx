import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Phone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Member, ServicePage } from "@/lib/dreamoz.types";
import { brandName, toInternationalPhone } from "@/lib/format";
import { useEffect } from "react";
import { me, logout, type CurrentUser } from "@/lib/auth.functions";

const baseNav = [
  { to: "/", label: "Home" },
  { to: "/contact", label: "Contact" },
];

function useSessionUser() {
  const fetchMe = useServerFn(me);
  return useQuery<CurrentUser | null>({
    queryKey: ["session-user"],
    queryFn: () => fetchMe(),
    staleTime: 30_000,
  });
}

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOut = useServerFn(logout);
  const { data: user } = useSessionUser();

  const nav = user
    ? [...baseNav, { to: "/dashboard", label: "Dashboard" }]
    : [...baseNav, { to: "/signup", label: "Sign Up" }, { to: "/login", label: "Login" }];

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    await router.invalidate();
    router.navigate({ to: "/login", search: {}, replace: true });
  }

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
          <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-full border border-border/70 px-4 py-2 text-sm transition hover:bg-surface/60"
              >
                Sign out
              </button>
            </div>
          ) : null}
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
