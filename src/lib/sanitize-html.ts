const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "hr",
  "span",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel", "data-pdf"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
};

function safeUrl(value: string): string | null {
  const v = value.trim();
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (v.startsWith("/")) return v;
  return null;
}

function cleanAttrs(tag: string, raw: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed) return "";
  const out: string[] = [];
  const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const name = m[1]!.toLowerCase();
    if (!allowed.has(name)) continue;
    let value = (m[3] ?? m[4] ?? "").trim();
    if (name === "href" || name === "src") {
      const url = safeUrl(value);
      if (!url) continue;
      value = url;
    }
    if (/^on/i.test(name)) continue;
    out.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
  }
  if (tag === "a") {
    const hasTarget = out.some((a) => a.startsWith("target="));
    if (hasTarget && !out.some((a) => a.startsWith("rel="))) {
      out.push('rel="noreferrer noopener"');
    }
  }
  return out.length ? ` ${out.join(" ")}` : "";
}

/** Allowlist sanitiser for rich-text HTML. Runs without a DOM (Worker-safe). */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  let html = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?>/gi, "");

  html = html.replace(
    /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_all, slash: string, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (slash) return `</${tag}>`;
      if (tag === "img" || tag === "br" || tag === "hr") {
        return `<${tag}${cleanAttrs(tag, attrs)} />`;
      }
      return `<${tag}${cleanAttrs(tag, attrs)}>`;
    },
  );

  return html.trim();
}

/** True when the value contains no rendered text or media. */
export function isEmptyHtml(html: string): boolean {
  return (
    !html ||
    (!/<img/i.test(html) &&
      html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "")
  );
}

/** Strip all HTML tags and decode basic entities, returning plain text. */
export function stripHtml(input: string): string {
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
