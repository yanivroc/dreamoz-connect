import { createFileRoute, notFound } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import { MediaSlider } from "@/components/MediaSlider";
import type { SiteOverview } from "@/lib/dreamoz.types";

export const Route = createFileRoute("/$pageSlug")({
  loader: async ({ params }) => {
    const overview = await overviewFn();
    const page = overview.servicePages.find((p) => p.slug === params.pageSlug.toLowerCase());
    if (!page) throw notFound();
    return { overview, page };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Page unavailable — DreamozTech" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.page.title} — DreamozTech`;
    const description =
      loaderData.page.summary ||
      loaderData.page.posts[0]?.excerpt ||
      "Software development, web platforms and digital growth by DreamozTech.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: WebPageView,
});

function WebPageView() {
  const { overview, page } = Route.useLoaderData() as {
    overview: SiteOverview;
    page: SiteOverview["servicePages"][number];
  };
  const { member, logo, favicon } = overview;

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h1 className="text-4xl font-bold md:text-5xl">{page.title}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        {page.html ? (
          <div
            className="prose-site max-w-3xl"
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        ) : null}

        {page.posts.length > 0 && (
          <div className="mt-10 grid gap-6">
            {page.posts.map((s, pi) => (
              <article
                key={`${s.slug}-${pi}`}
                className="overflow-hidden rounded-xl border border-border/70 bg-surface p-7 shadow-card"
              >
                <h2 className="text-lg font-semibold">{s.title}</h2>
                {s.categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.categories.map((c, ci) => (
                      <span
                        key={`${c}-${ci}`}
                        className="rounded-full border border-border/70 px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {s.html ? (
                  <div
                    className="prose-site mt-4 max-w-3xl text-sm"
                    dangerouslySetInnerHTML={{ __html: s.html }}
                  />
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {s.excerpt}
                  </p>
                )}
                {s.attributes.length > 0 && (
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    {s.attributes.map((a, ai) => (
                      <div
                        key={`${a.title}-${ai}`}
                        className="rounded-lg border border-border/60 px-3 py-2"
                      >
                        <dt
                          className="prose-site text-xs text-muted-foreground [&_i]:text-base [&_i]:text-primary"
                          dangerouslySetInnerHTML={{ __html: a.title }}
                        />
                        <dd
                          className="prose-site mt-1 font-medium"
                          dangerouslySetInnerHTML={{ __html: a.value }}
                        />
                      </div>
                    ))}
                  </dl>
                )}
                {(s.images.length > 0 || s.videos.length > 0) && (
                  <div className="mt-5">
                    <MediaSlider
                      images={s.images}
                      videos={s.videos}
                      title={s.title}
                      variant={page.title.toLowerCase() === "brand" ? "brand" : "default"}
                    />
                  </div>
                )}
                {s.link ? (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
                  >
                    Learn more ↗
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
