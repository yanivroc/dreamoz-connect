export type Pic = {
  picPath: string | null;
  picThumbPath: string | null;
  picDescription: string | null;
  picUrl?: string | null;
  displayOrder: number;
};

export type Video = { videoPath: string | null };

export type Attribute = {
  title: string;
  value: string;
  attributeType: string | null;
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
  videos: Video[];
  attributes: Attribute[];
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

export type MediaImage = {
  src: string;
  thumb: string | null;
  caption: string | null;
};

export type ArticleCard = {
  slug: string;
  title: string;
  excerpt: string;
  image: string | null;
  images: MediaImage[];
  videos: string[];
  attributes: Attribute[];
  date: string;
  categories: string[];
  link: string | null;
  metaDesc: string;
  metaKey: string;
};

export type SiteOverview = {
  member: Member;
  logo: string | null;
  services: ArticleCard[];
  articles: ArticleCard[];
  products: ArticleCard[];
};
