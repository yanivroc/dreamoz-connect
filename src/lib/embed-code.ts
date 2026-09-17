export type SafeEmbed = {
  src: string;
  title: string | null;
};

/** Parse one HTTPS iframe without ever injecting the supplied HTML into the page. */
export function parseEmbedCode(value: string): SafeEmbed | null {
  const code = value.trim();
  if (!code) return null;

  const match = code.match(/^<iframe\b([^>]*)>\s*<\/iframe>$/i);
  if (!match) return null;
  const attributes = match[1] ?? "";
  if (/\bon[a-z]+\s*=|\bsrcdoc\s*=/i.test(attributes)) return null;

  const readAttribute = (name: string) => {
    const attribute = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(
      attributes,
    );
    return attribute?.[2]?.trim() ?? null;
  };

  const rawSrc = readAttribute("src")?.replace(/&amp;/gi, "&");
  if (!rawSrc) return null;
  try {
    const url = new URL(rawSrc);
    if (url.protocol !== "https:") return null;
    return { src: url.toString(), title: readAttribute("title") };
  } catch {
    return null;
  }
}

export function isSafeEmbedCode(value: string): boolean {
  return value.trim() === "" || parseEmbedCode(value) !== null;
}