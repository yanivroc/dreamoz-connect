import { Link } from "@tanstack/react-router";
import type { ArticleCard } from "@/lib/dreamoz.types";
import { formatDate } from "@/lib/format";

export function PostCard({ item }: { item: ArticleCard }) {
  const price = item.attributes.find(
    (a) => a.title.toLowerCase() === "price",
  )?.value;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-surface shadow-card transition-transform hover:-translate-y-1">
      <Link to="/insights/$slug" params={{ slug: item.slug }} className="block">
        {item.image ? (
          <img
            src={item.image}
            alt={item.images[0]?.caption || item.title}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="h-44 w-full bg-gradient-accent opacity-30" />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(item.date)}</span>
          {item.categories.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-full border border-border px-2.5 py-0.5 uppercase tracking-wide"
            >
              {c}
            </span>
          ))}
        </div>
        <Link to="/insights/$slug" params={{ slug: item.slug }}>
          <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">
            {item.title}
          </h3>
        </Link>
        <p className="line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>
        {price ? (
          <p className="text-base font-semibold text-primary">${price}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-3 pt-2">
          <Link
            to="/insights/$slug"
            params={{ slug: item.slug }}
            className="text-sm font-semibold text-primary hover:underline"
          >
            View details
          </Link>
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Learn more ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
