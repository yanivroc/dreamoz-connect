import { useState } from "react";
import type { MediaImage } from "@/lib/dreamoz.types";

export function MediaSlider({
  images,
  videos = [],
  title,
  variant = "default",
}: {
  images: MediaImage[];
  videos?: string[];
  title: string;
  variant?: "default" | "brand";
}) {
  const [index, setIndex] = useState(0);
  const slides = [
    ...images.map((img) => ({ kind: "image" as const, ...img })),
    ...videos.map((src) => ({
      kind: "video" as const,
      src,
      thumb: null,
      caption: null,
      url: null,
    })),
  ];
  if (slides.length === 0) return null;

  const current = slides[Math.min(index, slides.length - 1)]!;
  const go = (dir: number) =>
    setIndex((i) => (i + dir + slides.length) % slides.length);

  return (
    <div
      className={`mx-auto overflow-hidden rounded-xl border border-border/70 bg-surface shadow-card ${
        variant === "brand" ? "max-w-2xl" : "max-w-3xl"
      }`}
    >
      {current.kind === "image" && current.caption ? (
        <p className="border-b border-border/60 bg-background/40 px-4 py-2 text-center text-sm font-medium text-muted-foreground">
          {current.caption}
        </p>
      ) : null}
      <div
        className={`relative mx-auto w-full bg-surface ${
          variant === "brand" ? "h-64" : "aspect-video max-h-[360px]"
        }`}
      >
        {current.kind === "image" ? (
          current.url ? (
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="block h-full w-full transition hover:opacity-90"
            >
              <img
                src={current.src}
                alt={current.caption || title}
                className="h-full w-full object-contain p-4"
              />
            </a>
          ) : (
            <img
              src={current.src}
              alt={current.caption || title}
              className="h-full w-full object-contain p-4"
            />
          )
        ) : (
          <iframe
            src={current.src}
            title={`${title} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        )}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm text-foreground backdrop-blur hover:bg-background"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm text-foreground backdrop-blur hover:bg-background"
            >
              ›
            </button>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-border/60 p-3">
          {slides.map((s, i) => (
            <button
              key={`${s.kind}-${s.src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show item ${i + 1}`}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border ${
                i === index ? "border-primary" : "border-border/60 opacity-70"
              }`}
            >
              {s.kind === "image" ? (
                <img
                  src={s.thumb ?? s.src}
                  alt={s.caption || `${title} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-accent text-xs font-semibold text-primary-foreground">
                  ▶
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
