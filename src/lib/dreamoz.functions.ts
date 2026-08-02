import { createServerFn } from "@tanstack/react-start";
import {
  getOverview,
  getArticles,
  getProducts,
  getArticle,
  getContactInfo,
} from "./dreamoz.server";

export const overviewFn = createServerFn({ method: "GET" }).handler(async () =>
  getOverview(),
);

export const articlesFn = createServerFn({ method: "GET" }).handler(async () =>
  getArticles(),
);

export const productsFn = createServerFn({ method: "GET" }).handler(async () =>
  getProducts(),
);

export const contactFn = createServerFn({ method: "GET" }).handler(async () =>
  getContactInfo(),
);

export const articleFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => getArticle(data.slug));
