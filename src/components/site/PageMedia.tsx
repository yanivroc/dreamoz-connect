import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sortImages, type WaPage } from "@/lib/content-types";
import { parseEmbedCode } from "@/lib/embed-code";

export function PageEmbed({ page, className = "" }: { page: WaPage; className?: string }) {
  const embed = parseEmbedCode(page.embedCode ?? "");
  if (!embed) return null;
  return (
    <div className={`aspect-video overflow-hidden rounded-xl border border-border ${className}`}>
      <iframe
        src={embed.src}
        title={embed.title || `${page.title} embedded content`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        allowFullScreen
      />
    </div>
  );
}

export function PageMedia({
  page,
  wide = false,
  float = false,
  compact = false,
  embed: showEmbed = true,
}: {
  page: WaPage;
  wide?: boolean;
  float?: boolean;
  compact?: boolean;
  embed?: boolean;
}) {
  const images = sortImages(page.images ?? []);
  const embed = showEmbed ? parseEmbedCode(page.embedCode ?? "") : null;
  const [index, setIndex] = useState(0);

  if (images.length === 0 && !embed) return null;

  const current = images[Math.min(index, images.length - 1)];
  const go = (delta: number) =>
    setIndex((i) => (i + delta + images.length) % Math.max(images.length, 1));

  const imageHref = current?.hyperlink || page.hyperlink || null;

  const img = current ? (
    <img
      src={current.url}
      alt={current.alt || page.title}
      loading="lazy"
      className={`mx-auto max-w-full rounded-lg object-contain ${
        compact
          ? "h-auto max-h-64 w-auto sm:max-h-80"
          : wide
            ? "w-auto max-h-[70vh]"
            : "h-auto w-full"
      }`}
    />
  ) : null;

  return (
    <div
      className={
        compact
          ? "mx-auto mt-8 w-full max-w-2xl space-y-6"
          : float
            ? "mt-8 w-full space-y-6 md:float-right md:mb-4 md:ml-8 md:mt-2 md:w-1/2 lg:w-[46%]"
            : "mt-8 space-y-6"
      }
    >
      {embed ? (
        <div className="aspect-video overflow-hidden rounded-xl border border-border">
          <iframe
            src={embed.src}
            title={embed.title || `${page.title} embedded content`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allowFullScreen
          />
        </div>
      ) : null}

      {current ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/40 p-3">
          {imageHref ? (
            <a href={imageHref} target="_blank" rel="noreferrer" className="block">
              {img}
            </a>
          ) : (
            img
          )}

          {images.length > 1 ? (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground transition-colors hover:text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-foreground transition-colors hover:text-primary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                {Math.min(index, images.length - 1) + 1} / {images.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
