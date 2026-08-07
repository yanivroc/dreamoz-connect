import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { articleFn, overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import { MediaSlider } from "@/components/MediaSlider";
import type { SiteOverview } from "@/lib/dreamoz.types";
import type { ArticleDetail } from "@/lib/dreamoz.functions";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/insights/$slug")({
  loader: async ({ params }) => {
    const [article, overview] = await Promise.all([
      articleFn({ data: { slug: params.slug } }),
      overviewFn(),
    ]);
    if (!article) throw notFound();
    return { article, overview };
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;
    const title = article?.title ?? "Article";
    const desc =
      article?.metaDesc || article?.plain.slice(0, 150) || "DreamozTech article";
    const image = article?.images[0]?.src;
    return {
      meta: [
        { title: `${title} — DreamozTech` },
        { name: "description", content: desc },
        ...(article?.metaKey
          ? [{ name: "keywords", content: article.metaKey }]
          : []),
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: Article,
});

function Article() {
  const { article, overview } = Route.useLoaderData() as {
    article: ArticleDetail;
    overview: SiteOverview;
  };

  return (
    <SiteLayout
      member={overview.member}
      logo={overview.logo}
      favicon={overview.favicon}
      footerPage={overview.footerPage}
    >
      <article className="mx-auto max-w-3xl px-5 py-16">
        <Link to="/insights" className="text-sm text-primary hover:underline">
          ← All insights
        </Link>
        <h1 className="mt-6 text-3xl font-bold leading-tight md:text-4xl">
          {article.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDate(article.date)}</span>
          {article.categories.map((c) => (
            <span key={c} className="rounded-full border border-border px-2.5 py-0.5">
              {c}
            </span>
          ))}
        </div>

        <div className="mt-8">
          <MediaSlider
            images={article.images}
            videos={article.videos}
            title={article.title}
          />
        </div>

        {article.attributes.length > 0 && (
          <dl className="mt-8 grid gap-4 rounded-xl border border-border/70 bg-surface p-6 shadow-card sm:grid-cols-2">
            {article.attributes.map((a) => (
              <div key={a.title}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {a.title}
                </dt>
                <dd className="text-base font-semibold text-foreground">
                  {a.title.toLowerCase().includes("price") ? `$${a.value}` : a.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div
          className="prose-api mt-10"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />
        {article.link ? (
          <a
            href={article.link}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Learn more
          </a>
        ) : null}
      </article>
    </SiteLayout>
  );
}
