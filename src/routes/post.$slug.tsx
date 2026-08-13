import { createFileRoute, Link } from "@tanstack/react-router";
import { overviewFn, articleFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import { MediaSlider } from "@/components/MediaSlider";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/post/$slug")({
  loader: async ({ params }) => {
    const [overview, article] = await Promise.all([
      overviewFn(),
      articleFn({ data: { slug: params.slug } }),
    ]);
    return { overview, article };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a) {
      return {
        meta: [
          { title: "Post unavailable — DreamozTech" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const desc = a.metaDesc || a.plain.slice(0, 155);
    return {
      meta: [
        { title: `${a.title} — DreamozTech` },
        { name: "description", content: desc },
        { property: "og:title", content: a.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(a.metaKey ? [{ name: "keywords", content: a.metaKey }] : []),
      ],
    };
  },
  component: PostPage,
});

function PostPage() {
  const { overview, article } = Route.useLoaderData();
  const { member, logo, favicon } = overview;

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <div className="mx-auto max-w-3xl px-5 py-14">
        <Link
          to="/"
          hash="blog"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back
        </Link>

        {!article ? (
          <p className="mt-10 text-muted-foreground">This post is not available.</p>
        ) : (
          <article className="mt-6">
            <h1 className="text-4xl font-bold md:text-5xl">{article.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(article.date)}</span>
              {article.categories.map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className="rounded-full border border-border/70 px-2.5 py-0.5"
                >
                  {c}
                </span>
              ))}
            </div>

            {(article.images.length > 0 || article.videos.length > 0) && (
              <div className="mt-6">
                <MediaSlider
                  images={article.images}
                  videos={article.videos}
                  title={article.title}
                />
              </div>
            )}

            {article.html ? (
              <div
                className="prose-site mt-6"
                dangerouslySetInnerHTML={{ __html: article.html }}
              />
            ) : null}

            {article.attributes.length > 0 && (
              <dl className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
                {article.attributes.map((a, i) => (
                  <div
                    key={`${a.title}-${i}`}
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

            {article.link ? (
              <a
                href={article.link}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex text-sm font-semibold text-primary hover:underline"
              >
                Learn more ↗
              </a>
            ) : null}
          </article>
        )}
      </div>
    </SiteLayout>
  );
}
