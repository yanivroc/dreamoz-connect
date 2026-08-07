import { createFileRoute, Link } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { PostCard } from "@/components/PostCard";

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
  const { member, articles, servicePages, logo, favicon } =
    Route.useLoaderData() as SiteOverview;


  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-24 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <span className="inline-flex rounded-full border border-primary/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
              {member.suburb}, {member.state}
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] md:text-6xl">
              Software that <span className="text-gradient">ships</span>, websites
              that grow your business.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              {member.metaDesc}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="rounded-full bg-gradient-accent px-6 py-3 font-semibold text-primary-foreground shadow-glow"
              >
                Talk to our team
              </Link>
              <Link
                to="/services"
                className="rounded-full border border-border px-6 py-3 font-semibold text-foreground hover:bg-surface"
              >
                Explore services
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-surface/70 p-6 shadow-card">
            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Live from our platform
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <dt className="text-3xl font-bold text-primary">{articles.length}+</dt>
                <dd className="text-sm text-muted-foreground">Technical insights</dd>
              </div>
              <div>
                <dt className="text-3xl font-bold text-primary">
                  {servicePages.length}+
                </dt>
                <dd className="text-sm text-muted-foreground">Service areas</dd>
              </div>
              <div>
                <dt className="text-3xl font-bold text-primary">
                  {new Date().getFullYear() - 2020}
                </dt>
                <dd className="text-sm text-muted-foreground">Years building</dd>
              </div>
              <div>
                <dt className="text-3xl font-bold text-primary">AU</dt>
                <dd className="text-sm text-muted-foreground">Melbourne based</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {servicePages.length > 0 && (
        <section className="mx-auto max-w-6xl space-y-16 px-5 py-20">
          <div>
            <h2 className="text-3xl font-bold">What we do</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              End-to-end delivery: discovery, engineering, launch and ongoing growth.
            </p>
          </div>
          {servicePages.map((page, i) => (
            <div key={`${page.title}-${i}`}>
              <h3 className="text-2xl font-bold">{page.title}</h3>
              {page.html ? (
                <div
                  className="prose-api mt-4 max-w-3xl"
                  dangerouslySetInnerHTML={{ __html: page.html }}
                />
              ) : null}
              {page.posts.length > 0 && (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {page.posts.map((s, pi) => (
                    <article
                      key={`${page.title}-${i}-${s.slug}-${pi}`}
                      className="overflow-hidden rounded-xl border border-border/70 bg-surface p-7 shadow-card"
                    >
                      <h4 className="text-lg font-semibold">{s.title}</h4>
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
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {s.excerpt}
                      </p>
                      {s.attributes.length > 0 && (
                        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                          {s.attributes.map((a, ai) => (
                            <div
                              key={`${a.title}-${ai}`}
                              className="rounded-lg border border-border/60 px-3 py-2"
                            >
                              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                                {a.title}
                              </dt>
                              <dd className="font-medium">{a.value}</dd>
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
            </div>
          ))}
        </section>
      )}


      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold">Latest insights</h2>
          <Link to="/insights" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {articles.slice(0, 25).map((a) => (
            <PostCard key={a.slug} item={a} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
