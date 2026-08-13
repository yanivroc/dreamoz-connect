import { createFileRoute } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { MediaSlider } from "@/components/MediaSlider";

export const Route = createFileRoute("/")({
  loader: () => overviewFn(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "DreamozTech — Software Development & Web Platforms" },
      {
        name: "description",
        content:
          "DreamozTech builds custom software, websites and growth platforms for businesses in Melbourne and beyond.",
      },
      { property: "og:title", content: "DreamozTech — Software Development Company" },
      {
        property: "og:description",
        content:
          "Custom software, web platforms and digital growth engineering from Melbourne, Australia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.member?.metaKey
        ? [{ name: "keywords", content: loaderData.member.metaKey.replace(/\s+/g, " ").trim() }]
        : []),
    ],
  }),
  component: Home,
});

function Home() {
  const { member, servicePages, logo, favicon } =
    Route.useLoaderData() as SiteOverview;

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <span className="inline-flex rounded-full border border-primary/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            {member.suburb}, {member.state}
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] md:text-6xl">
            Software that <span className="text-gradient">ships</span>, websites that
            grow your business.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {member.metaDesc}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-5 py-16">
        {servicePages.map((page, i) => (
          <section key={`${page.title}-${i}`} id={page.slug}>
            <h2 className="text-3xl font-bold">{page.title}</h2>
            {page.html ? (
              <div
                className="prose-api mt-4 max-w-3xl"
                dangerouslySetInnerHTML={{ __html: page.html }}
              />
            ) : null}

            {page.title.toLowerCase() === "blog" ? (
              page.posts.length > 0 && (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {page.posts.map((s, pi) => (
                    <Link
                      key={`${page.slug}-${s.slug}-${pi}`}
                      to="/post/$slug"
                      params={{ slug: s.slug }}
                      className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-surface shadow-card transition hover:border-primary/50"
                    >
                      {s.image ? (
                        <img
                          src={s.image}
                          alt={s.title}
                          loading="lazy"
                          className="h-44 w-full object-cover"
                        />
                      ) : null}
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="text-base font-semibold group-hover:text-primary">
                          {s.title}
                        </h3>
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
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {s.excerpt}
                        </p>
                        <span className="mt-4 text-sm font-semibold text-primary">
                          Read more →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : page.posts.length > 0 ? (
              <div className="mt-8 grid gap-6">
                {page.posts.map((s, pi) => (
                  <article
                    key={`${page.slug}-${s.slug}-${pi}`}
                    className="overflow-hidden rounded-xl border border-border/70 bg-surface p-7 shadow-card"
                  >
                    <h3 className="text-lg font-semibold">{s.title}</h3>
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
                          variant={
                            page.title.toLowerCase() === "brand" ? "brand" : "default"
                          }
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
            ) : null}
          </section>
        ))}
      </div>
    </SiteLayout>
  );
}
