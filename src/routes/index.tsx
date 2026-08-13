import { createFileRoute, Link } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { PostCard } from "@/components/PostCard";
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
  const { member, articles, servicePages, logo, favicon, footerPage } =
    Route.useLoaderData() as SiteOverview;


  return (
    <SiteLayout member={member} logo={logo} favicon={favicon} footerPage={footerPage}>
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
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div>
            <h2 className="text-3xl font-bold">What we do</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              End-to-end delivery: discovery, engineering, launch and ongoing growth.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {servicePages.map((page, i) => (
              <Link
                key={`${page.title}-${i}`}
                to="/$pageSlug"
                params={{ pageSlug: page.slug }}
                className="group rounded-xl border border-border/70 bg-surface p-7 shadow-card transition-transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-semibold group-hover:text-primary">
                  {page.title}
                </h3>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                  {page.summary || page.posts[0]?.excerpt}
                </p>
                <span className="mt-5 inline-flex text-sm font-semibold text-primary">
                  Learn more ↗
                </span>
              </Link>
            ))}
          </div>
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
