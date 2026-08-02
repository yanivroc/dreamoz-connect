import type {
  Member,
  Post,
  Web,
  ArticleCard,
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

function toCard(post: Post): ArticleCard {
  const text = stripHtml(post.metaDesc) || stripHtml(post.bizDesc);
  return {
    slug: post.bizDisplayTitle,
    title: post.bizCustomTitle?.trim() || post.bizName,
    excerpt: text.slice(0, 190),
    image: mediaUrl(post.pics?.[0]?.picThumbPath || post.pics?.[0]?.picPath),
    date: post.createDateTime,
    categories: (post.categories ?? []).map((c) => c.categoryTitle),
  };
}

async function loadAll() {
  const [memberRes, postsRes, websRes] = await Promise.all([
    apiGet<{ member: Member }>("Member/Get"),
    apiGet<{ posts: Post[] }>("Member/Posts"),
    apiGet<{ webs: Web[] }>("Member/Webs"),
  ]);
  return {
    member: memberRes.member,
    posts: postsRes.posts ?? [],
    webs: websRes.webs ?? [],
  };
}

function servicePosts(webs: Web[]): Post[] {
  const wanted = ["services", "growth", "brand", "innovate"];
  const out: Post[] = [];
  for (const web of webs) {
    for (const page of web.webPages ?? []) {
      if (wanted.includes(page.pageUrl?.toLowerCase() ?? "")) {
        out.push(...(page.posts ?? []).slice(0, 2));
      }
    }
  }
  return out;
}

export async function getOverview(): Promise<SiteOverview> {
  const { member, posts, webs } = await loadAll();
  const logo = mediaUrl(webs[0]?.logoImage) ?? mediaUrl(member.profilePicture);
  return {
    member,
    logo,
    services: servicePosts(webs).map(toCard).slice(0, 6),
    articles: posts
      .filter((p) => p.postType === "Tech")
      .map(toCard)
      .slice(0, 12),
    products: posts
      .filter((p) => p.postType === "Products")
      .map(toCard)
      .slice(0, 12),
  };
}

export async function getArticles() {
  const { posts } = await loadAll();
  return posts.filter((p) => p.postType === "Tech").map(toCard);
}

export async function getProducts() {
  const { posts } = await loadAll();
  return posts.filter((p) => p.postType === "Products").map(toCard);
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
  return {
    title: post.bizCustomTitle?.trim() || post.bizName,
    html: sanitizeHtml(post.bizDesc),
    plain: stripHtml(post.bizDesc),
    metaDesc: stripHtml(post.metaDesc),
    date: post.createDateTime,
    categories: (post.categories ?? []).map((c) => c.categoryTitle),
    images: (post.pics ?? [])
      .map((p) => mediaUrl(p.picPath))
      .filter((v): v is string => Boolean(v)),
    link: post.bizWeb || null,
  };
}

export async function getContactInfo() {
  const { member } = await loadAll();
  return member;
}
