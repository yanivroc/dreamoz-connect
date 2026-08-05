import type {
  Member,
  Post,
  Web,
  ArticleCard,
  ServicePage,
  SiteOverview,
} from "./dreamoz.types";

const BASE = "https://dreamoz.com.au";
const MEDIA_BASE = "https://dreamoztech.com/";

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return MEDIA_BASE + path.replace(/\\/g, "/").replace(/^\/+/, "");
}

let cachedToken: { value: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;

  const res = await fetch(`${BASE}/Client/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: process.env["DREAMOZ_API_KEY"],
      apiSecret: process.env["DREAMOZ_API_SECRET"],
    }),
  });
  if (!res.ok) throw new Error(`Token request failed (${res.status})`);
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new Error("No token returned by API");
  cachedToken = { value: json.token, expires: Date.now() + 20 * 60 * 1000 };
  return json.token;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return (await res.json()) as T;
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = (bodyMatch?.[1] ?? html) as string;
  return inner
    .replace(/<\/?(html|head|body|meta|title|link)[^>]*>/gi, "")
    .trim();
}

export function videoSrc(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = html.match(/src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

function toCard(post: Post): ArticleCard {
  const text = stripHtml(post.metaDesc) || stripHtml(post.bizDesc);
  const images = (post.pics ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((p) => ({
      src: mediaUrl(p.picPath) ?? mediaUrl(p.picThumbPath) ?? "",
      thumb: mediaUrl(p.picThumbPath),
      caption: p.picDescription ?? null,
    }))
    .filter((p) => Boolean(p.src));
  return {
    slug: post.bizDisplayTitle,
    title: post.bizCustomTitle?.trim() || post.bizName,
    excerpt: text.slice(0, 190),
    image: images[0]?.thumb ?? images[0]?.src ?? null,
    images,
    videos: (post.videos ?? [])
      .map((v) => videoSrc(v.videoPath))
      .filter((v): v is string => Boolean(v)),
    attributes: post.attributes ?? [],
    date: post.createDateTime,
    categories: (post.categories ?? []).map((c) => c.categoryTitle),
    link: post.bizWeb?.trim() || null,
    metaDesc: stripHtml(post.metaDesc),
    metaKey: (post.metaKey ?? "").replace(/\s+/g, " ").trim(),
  };
}


async function loadAll() {
  const [memberRes, postsRes, websRes] = await Promise.all([
    apiGet<{ member: Member }>("Member/Get"),
    apiGet<{ posts: Post[] }>("Member/Posts?item=500"),
    apiGet<{ webs: Web[] }>("Member/Webs"),
  ]);
  return {
    member: memberRes.member,
    posts: postsRes.posts ?? [],
    webs: websRes.webs ?? [],
  };
}

const SITE_PATH = "dreamoz-tech-consulting";
const EXCLUDED_PAGES = ["footer", "case", "blog", "return policy"];
const PAGE_ORDER = ["home", "about", "services", "feature", "growth", "innovate", "brand", "testimonial"];

function isPublicPost(p: Post): boolean {
  return p.bizEnable === true && p.bizPublic === true;
}

function isInsight(p: Post): boolean {
  const t = (p.postType ?? "").toLowerCase();
  return (t === "tech" || t === "blog") && isPublicPost(p);
}

function siteWeb(webs: Web[]): Web | undefined {
  return (
    webs.find((w) => (w.webDisplayPath ?? "").toLowerCase() === SITE_PATH) ?? webs[0]
  );
}

function servicePages(web: Web | undefined): ServicePage[] {
  const out: ServicePage[] = [];
  for (const page of web?.webPages ?? []) {
    const title = (page.pageTitle ?? "").trim();
    if (EXCLUDED_PAGES.includes(title.toLowerCase())) continue;
    const html = sanitizeHtml(page.description);
    const posts = (page.posts ?? []).filter(isPublicPost).map(toCard);
    if (!html && posts.length === 0) continue;
    out.push({
      title,
      html,
      summary: stripHtml(page.description).slice(0, 220),
      posts,
    });

  }
  return out.sort((a, b) => {
    const ai = PAGE_ORDER.indexOf(a.title.toLowerCase());
    const bi = PAGE_ORDER.indexOf(b.title.toLowerCase());
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
}

export async function getOverview(): Promise<SiteOverview> {
  const { member, posts, webs } = await loadAll();
  const web = siteWeb(webs);
  const pages = servicePages(web);
  return {
    member,
    logo: mediaUrl(web?.logoImage) ?? mediaUrl(member.profilePicture),
    favicon: mediaUrl(web?.logoFavicon),
    email: web?.emailId?.trim() || member.memberEmail,
    webTitle: web?.webTitle ?? null,
    servicePages: pages,
    services: pages.flatMap((p) => p.posts).slice(0, 6),
    articles: posts.filter(isInsight).map(toCard).slice(0, 25),
  };
}


export async function getArticles() {
  const { posts } = await loadAll();
  return posts.filter(isInsight).map(toCard);
}

export async function getArticle(slug: string) {
  const { posts, webs } = await loadAll();
  const webPosts = webs.flatMap((w) =>
    (w.webPages ?? []).flatMap((p) => p.posts ?? []),
  );
  const post = [...posts, ...webPosts].find(
    (p) => p.bizDisplayTitle?.toLowerCase() === slug.toLowerCase(),
  );
  if (!post) return null;
  const card = toCard(post);
  return {
    title: card.title,
    html: sanitizeHtml(post.bizDesc),
    plain: stripHtml(post.bizDesc),
    metaDesc: card.metaDesc,
    metaKey: card.metaKey,
    date: card.date,
    categories: card.categories,
    images: card.images,
    videos: card.videos,
    attributes: card.attributes,
    postType: post.postType,
    link: card.link,
  };
}


export async function getContactInfo() {
  const { member } = await loadAll();
  return member;
}
