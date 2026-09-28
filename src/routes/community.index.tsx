import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listCommunityFeed, type CommunityItem } from "@/lib/community.functions";
import { formatMoney } from "@/lib/content-types";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


const feedQuery = queryOptions({
  queryKey: ["community-feed"],
  queryFn: () => listCommunityFeed(),
});

export const Route = createFileRoute("/community/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(feedQuery),
  head: () => {
    const title = "Community — DreamozTech";
    const description =
      "Browse pages, articles and products shared by DreamozTech members in one place.";
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
  component: CommunityPage,
});

type Filter = "all" | "products" | "pages";

function Card({ item }: { item: CommunityItem }) {
  const to = item.internalSlug
    ? { to: "/page/$slug" as const, params: { slug: item.internalSlug } }
    : { to: "/community/$id" as const, params: { id: String(item.id) } };
  const { add, setOpen } = useCart();
  const buyable = item.isProduct && item.price != null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60">
      <Link {...to} className="flex flex-1 flex-col">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        ) : null}
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {item.parentTitle ? (
              <span className="rounded-full bg-surface/70 px-2.5 py-1 text-muted-foreground">
                {item.parentTitle}
              </span>
            ) : item.childCount > 0 ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                Collection · {item.childCount} inside
              </span>
            ) : null}
            {item.isProduct ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                For sale
              </span>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
            {item.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{item.excerpt}</p>
          <div className="mt-auto flex items-center justify-between pt-3 text-sm">
            <span className="text-xs text-muted-foreground">
              by {item.ownerName || item.appTitle}
            </span>
            {buyable ? (
              <span className="font-semibold text-primary">
                {formatMoney(item.price!, item.currency)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      {buyable ? (
        <div className="px-5 pb-5">
          <Button
            className="w-full"
            onClick={() => {
              add(
                {
                  id: item.id,
                  title: item.title,
                  slug: item.title,
                  price: item.price!,
                  ...(item.imageUrl ? { image: item.imageUrl } : {}),
                  shippingPrice: item.shippingPrice ?? 0,
                  minQty: item.minQty,
                  maxQty: item.maxQty,
                  appId: item.appId,
                  sellerName: item.ownerName || item.appTitle,
                },
                item.minQty ?? 1,
              );
              toast.success(`${item.title} added to cart`);
              setOpen(true);
            }}
          >
            Add to cart
          </Button>
        </div>
      ) : null}
    </div>
  );
}


function CommunityPage() {
  const { data } = useSuspenseQuery(feedQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((item) => {
      if (filter === "products" && !item.isProduct) return false;
      if (filter === "pages" && item.isProduct) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q)
      );
    });
  }, [data, filter, search]);

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "products", label: "Products" },
    { id: "pages", label: "Articles & pages" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Community</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Articles, pages and products shared by members of the platform.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                filter === tab.id
                  ? "bg-primary/15 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-card"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the community"
          className="ml-auto w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
        />
      </div>

      {items.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">
          Nothing shared here yet. Members can add a page to the community from their page
          settings.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
