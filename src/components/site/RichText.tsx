import { sanitizeHtml } from "@/lib/content-types";
import { cn } from "@/lib/utils";

export function RichText({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  return (
    <div
      className={cn("rich-text", className)}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
