import { Link } from "@tanstack/react-router";
import type { ArticleCard } from "@/lib/dreamoz.types";

export function PostCard({ item }: { item: ArticleCard }) {
  return (
    <Link
      to="/insights/$slug"
      params={{ slug: item.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-surface shadow-card transition-transform hover:-translate-y-1"
    >
      {item.image ? (
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="h-44 w-full bg-gradient-accent opacity-30" />
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          {item.categories.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs uppercase tracking-wide text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
        <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">
          {item.title}
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>
        <span className="mt-auto pt-2 text-xs text-muted-foreground">
          {new Date(item.date).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
