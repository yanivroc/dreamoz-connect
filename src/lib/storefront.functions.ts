import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SiteContent } from "./content-types";

export type Storefront = Pick<SiteContent, "settings" | "shippingRates"> & {
  appId: number;
  title: string;
};

/**
 * Currency and shipping rules for one seller's storefront, so a cart built
 * from the Community feed prices exactly like that seller's own site.
 */
export const getStorefront = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ appId: z.coerce.number().int() }).parse(input))
  .handler(async ({ data }): Promise<Storefront | null> => {
    try {
      const { fetchContentForApp } = await import("./content.server");
      const content = await fetchContentForApp(data.appId);
      return {
        appId: data.appId,
        title: content.webApp.title,
        settings: content.settings,
        shippingRates: content.shippingRates,
      };
    } catch {
      return null;
    }
  });
