import { createFileRoute } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import { PostCard } from "@/components/PostCard";

export const Route = createFileRoute("/products")({
  loader: () => overviewFn(),
  head: () => ({
    meta: [
      { title: "Products — DreamozTech Hardware & Tech Store" },
      {
        name: "description",
        content:
          "Browse tech products curated and supplied by DreamozTech, from networking gear to everyday accessories.",
      },
      { property: "og:title", content: "DreamozTech Products" },
      {
        property: "og:description",
        content: "Tech products and accessories supplied by DreamozTech.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Products,
});

function Products() {
  const { member, logo, products } = Route.useLoaderData();

  return (
    <SiteLayout logo={logo} name={member.memberFullName}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h1 className="text-4xl font-bold md:text-5xl">Products</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Hardware and accessories we source and support for our clients.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {products.map((p) => (
            <PostCard key={p.slug} item={p} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
