import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  const { member, servicePages, logo, favicon, webTitle, webDescription } =
    Route.useLoaderData() as SiteOverview;
  const [activeSlug, setActiveSlug] = useState<string>("");

  useEffect(() => {
    const sections = servicePages
      .map((p) => document.getElementById(p.slug))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSlug(visible.target.id);
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [servicePages]);

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <span className="inline-flex rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            {member.suburb}, {member.state}
          </span>
          <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.05] md:text-6xl">
            {webTitle ?? member.memberFullName}
          </h1>
          {webDescription ? (
            <div
              className="prose-site mt-6 max-w-2xl text-lg text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: webDescription }}
            />
          ) : (
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              {member.metaDesc}
            </p>
          )}
        </div>
      </section>

      <nav className="sticky top-[72px] z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {servicePages.map((p, i) => (
            <a
              key={`nav-${p.slug}-${i}`}
              href={`#${p.slug}`}
              aria-current={activeSlug === p.slug ? "true" : undefined}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
                activeSlug === p.slug
                  ? "border-primary/60 bg-primary/10 font-semibold text-primary shadow-glow"
                  : "border-border/70 bg-surface/60 text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {p.title}
            </a>
          ))}
        </div>
      </nav>


      {servicePages.map((page, i) => (
        <section
          key={`${page.title}-${i}`}
          id={page.slug}
          className={`scroll-mt-36 border-b border-border/50 ${
            i % 2 === 1 ? "bg-surface/40" : "bg-background"
          }`}
        >
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <header className="max-w-3xl">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-2 text-3xl font-bold md:text-4xl">{page.title}</h2>
              <div className="mt-4 h-px w-16 bg-gradient-accent" />
              {page.html ? (
                <div
                  className="prose-api mt-5"
                  dangerouslySetInnerHTML={{ __html: page.html }}
                />
              ) : null}
            </header>

            {page.title.toLowerCase() === "blog" ? (
              page.posts.length > 0 && (
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {page.posts.map((s, pi) => (
                    <Link
                      key={`${page.slug}-${s.slug}-${pi}`}
                      to="/post/$slug"
                      params={{ slug: s.slug }}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
                    >
                      {s.image ? (
                        <img
                          src={s.image}
                          alt={s.title}
                          loading="lazy"
                          className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
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
              <div className="mt-10 grid gap-8">
                {page.posts.map((s, pi) => {
                  const split =
                    ["about", "growth"].includes(page.title.toLowerCase()) &&
                    page.posts.length === 1 &&
                    s.images.length + s.videos.length === 1;
                  const media =
                    s.images.length > 0 || s.videos.length > 0 ? (
                      <MediaSlider
                        images={s.images}
                        videos={s.videos}
                        title={s.title}
                        variant={
                          page.title.toLowerCase() === "brand"
                            ? "brand"
                            : split
                              ? "split"
                              : "default"
                        }
                      />
                    ) : null;
                  return (
                    <article
                      key={`${page.slug}-${s.slug}-${pi}`}
                      className={
                        split
                          ? "grid gap-10 overflow-hidden rounded-2xl border border-border/70 bg-surface p-7 shadow-card transition hover:border-primary/40 md:grid-cols-2 md:items-center md:p-9"
                          : "overflow-hidden rounded-2xl border border-border/70 bg-surface p-7 shadow-card transition hover:border-primary/40 md:p-9"
                      }
                    >
                      <div>
                        <h3 className="text-xl font-semibold">{s.title}</h3>
                        {s.categories.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {s.categories.map((c, ci) => (
                              <span
                                key={`${c}-${ci}`}
                                className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs text-primary"
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
                          <dl
                            className={`mt-6 grid gap-3 text-sm ${split ? "" : "sm:grid-cols-2"}`}
                          >
                            {s.attributes.map((a, ai) => (
                              <div
                                key={`${a.title}-${ai}`}
                                className="rounded-xl border border-border/60 bg-background/40 px-4 py-3 transition hover:border-primary/40"
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
                        {!split && media ? <div className="mt-6">{media}</div> : null}
                        {s.link ? (
                          <a
                            href={s.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
                          >
                            Learn more ↗
                          </a>
                        ) : null}
                      </div>
                      {split && media ? <div>{media}</div> : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </SiteLayout>
  );
}

