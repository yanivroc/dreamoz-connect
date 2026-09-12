import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sortImages, type WaPage } from "@/lib/content-types";
import { RichText } from "./RichText";
import { cn } from "@/lib/utils";

export function HeroSlider({ page }: { page: WaPage }) {
  const images = sortImages(page.images ?? []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);

  const go = (delta: number) =>
    setIndex((i) => (i + delta + images.length) % Math.max(images.length, 1));

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <div className="absolute inset-0 -z-10">
        {images.map((img, i) => (
          <img
            key={img.id}
            src={img.url}
            alt={img.alt || page.title}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
      </div>

      <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-6 py-24 text-left">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">{page.title}</h1>
          <RichText html={page.description} className="mt-6" />
          {page.hyperlink ? (
            <a
              href={page.hyperlink}
              className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Learn more
            </a>
          ) : null}
        </div>

        {images.length > 1 ? (
          <div className="mt-10 flex items-center gap-3">
            <button
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="rounded-full border border-border bg-background/70 p-2 text-foreground transition-colors hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/50",
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => go(1)}
              aria-label="Next slide"
              className="rounded-full border border-border bg-background/70 p-2 text-foreground transition-colors hover:text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
