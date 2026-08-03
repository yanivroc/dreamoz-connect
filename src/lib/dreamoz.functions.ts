import { createServerFn } from "@tanstack/react-start";
import type {
  ArticleCard,
  Attribute,
  MediaImage,
  Member,
  SiteOverview,
} from "./dreamoz.types";
import {
  getOverview,
  getArticles,
  getProducts,
  getArticle,
  getContactInfo,
} from "./dreamoz.server";

export type ArticleDetail = {
  title: string;
  html: string;
  plain: string;
  metaDesc: string;
  metaKey: string;
  date: string;
  categories: string[];
  images: MediaImage[];
  videos: string[];
  attributes: Attribute[];
  postType: string | null;
  link: string | null;
};


export const overviewFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteOverview> => getOverview(),
);

export const articlesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArticleCard[]> => getArticles(),
);

export const productsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArticleCard[]> => getProducts(),
);

export const contactFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Member> => getContactInfo(),
);

export const articleFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<ArticleDetail | null> => getArticle(data.slug));
