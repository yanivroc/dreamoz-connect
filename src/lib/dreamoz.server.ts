const BASE = "https://dreamoz.com.au";
const MEDIA_BASE = "https://dreamoztech.com/";

export type Pic = {
  picPath: string | null;
  picThumbPath: string | null;
  picDescription: string | null;
  displayOrder: number;
};

export type Category = { categoryTitle: string; categoryDisplayTitle: string };

export type Post = {
  bizName: string;
  bizDesc: string;
  bizCustomTitle: string | null;
  bizDisplayTitle: string;
  bizEmail: string | null;
  bizWeb: string | null;
  bizMobilePhone: string | null;
  postType: string | null;
  metaDesc: string | null;
  metaKey: string | null;
  createDateTime: string;
  pics: Pic[];
  categories: Category[];
};

export type Member = {
  memberFullName: string | null;
  memberEmail: string | null;
  description: string | null;
  profilePicture: string | null;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postCode: string | null;
  country: string | null;
  mobileNumber: string | null;
  landLine: string | null;
  metaDesc: string | null;
  metaKey: string | null;
  facebookProfile: string | null;
  twitterProfile: string | null;
  instagramProfile: string | null;
  youtubeProfile: string | null;
  linkedinProfile: string | null;
  bizLat: string | null;
  bizLong: string | null;
  customerName: string | null;
};

export type WebPage = {
  pageTitle: string;
  pageUrl: string;
  description: string | null;
  posts: Post[];
};

export type Web = {
  webTitle: string;
  domainName: string | null;
  description: string | null;
  logoImage: string | null;
  webDisplayPath: string;
  webPages: WebPage[];
};

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
  // Token is valid ~30min; refresh a little earlier.
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

export async function fetchMember(): Promise<Member> {
  const data = await apiGet<{ member: Member }>("Member/Get");
  return data.member;
}

export async function fetchPosts(): Promise<Post[]> {
  const data = await apiGet<{ posts: Post[] }>("Member/Posts");
  return data.posts ?? [];
}

export async function fetchWebs(): Promise<Web[]> {
  const data = await apiGet<{ webs: Web[] }>("Member/Webs");
  return data.webs ?? [];
}
