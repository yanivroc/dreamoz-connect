import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { articleFn, overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import type { ArticleDetail } from "@/lib/dreamoz.functions";

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
    const title = loaderData?.article.title ?? "Article";
    const desc =
      loaderData?.article.metaDesc ||
      loaderData?.article.plain.slice(0, 150) ||
      "DreamozTech article";
    const image = loaderData?.article.images[0];
    return {
      meta: [
        { title: `${title} — DreamozTech` },
        { name: "description", content: desc },
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
    <SiteLayout logo={overview.logo} name={overview.member.memberFullName}>
      <article className="mx-auto max-w-3xl px-5 py-16">
        <Link to="/insights" className="text-sm text-primary hover:underline">
          ← All insights
        </Link>
        <h1 className="mt-6 text-3xl font-bold leading-tight md:text-4xl">
          {article.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{new Date(article.date).toLocaleDateString()}</span>
          {article.categories.map((c) => (
            <span key={c} className="rounded-full border border-border px-2.5 py-0.5">
              {c}
            </span>
          ))}
        </div>
        {article.images[0] ? (
          <img
            src={article.images[0]}
            alt={article.title}
            className="mt-8 w-full rounded-xl border border-border/70"
          />
        ) : null}
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
