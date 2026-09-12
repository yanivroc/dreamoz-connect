import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content-query";
import { slugify, sortPages } from "@/lib/content-types";

export function SiteFooter() {
  const { data } = useQuery(siteContentQuery);
  const content = data?.content;
  const pages = sortPages(content?.pages ?? []);

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-foreground">
            {content?.webApp?.title ?? "DreamozTech"}
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {content?.webApp?.description}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Explore</p>
          <ul className="mt-3 space-y-2">
            {pages.map((page) => (
              <li key={page.id}>
                <Link
                  to="/page/$slug"
                  params={{ slug: slugify(page.title) }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Contact</p>
          {content?.webApp?.email ? (
            <a
              href={`mailto:${content.webApp.email}`}
              className="mt-3 block text-sm text-muted-foreground hover:text-primary"
            >
              {content.webApp.email}
            </a>
          ) : null}
          {content?.webApp?.link ? (
            <a
              href={content.webApp.link}
              className="mt-2 block text-sm text-muted-foreground hover:text-primary"
            >
              {content.webApp.link}
            </a>
          ) : null}
        </div>
      </div>
      <p className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {content?.webApp?.title ?? "DreamozTech"}. All rights reserved.
      </p>
    </footer>
  );
}
