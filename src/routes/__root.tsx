import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Analytics } from "@vercel/analytics/react";

import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart";
import { siteContentQuery } from "@/lib/content-query";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CartSheet } from "@/components/site/CartSheet";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  const links = [
    { to: "/community", title: "Explore Community", text: "Browse live web apps, pages and products." },
    { to: "/signup", title: "Start free trial", text: "Full access, no credit card required." },
    { to: "/login", title: "Member login", text: "Return to your dashboard and projects." },
    { to: "/contact", title: "Contact us", text: "Tell us what you were looking for." },
  ] as const;
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-3xl text-center">
        <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary">
          ERROR 404
        </span>
        <h1 className="mt-5 text-4xl font-bold text-foreground md:text-5xl">This page has moved or no longer exists</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Some older links from our previous site are no longer available. Here are the best places to continue.
        </p>
        <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60"
            >
              <div className="font-semibold text-foreground group-hover:text-primary">{l.title} →</div>
              <p className="mt-1 text-sm text-muted-foreground">{l.text}</p>
            </Link>
          ))}
        </div>
        <Link
          to="/"
          className="mt-10 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  loader: async ({ context }) => {
    try {
      const result = await context.queryClient.ensureQueryData(siteContentQuery);
      return { favicon: result.content.settings.favicon ?? result.content.settings.logo ?? null };
    } catch {
      return { favicon: null };
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DreamozTech — Software Development Company" },
      {
        name: "description",
        content:
          "DreamozTech builds custom software, web platforms and digital growth systems from Melbourne, Australia.",
      },
      { name: "author", content: "DreamozTech" },
      { property: "og:title", content: "DreamozTech — Software Development Company" },
      {
        property: "og:description",
        content: "Custom software, web platforms and digital growth engineering.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap",
      },
      ...((loaderData as { favicon: string | null } | undefined)?.favicon
        ? [{ rel: "icon", href: (loaderData as { favicon: string }).favicon }]
        : []),
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        <CartSheet />
        <Toaster />
        <Analytics />
      </CartProvider>
    </QueryClientProvider>
  );
}
