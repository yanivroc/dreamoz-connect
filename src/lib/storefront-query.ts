import { queryOptions } from "@tanstack/react-query";
import { getStorefront, type Storefront } from "./storefront.functions";
import { EMPTY_CONTENT } from "./content-types";

export const FALLBACK_STOREFRONT = {
  settings: EMPTY_CONTENT.settings,
  shippingRates: EMPTY_CONTENT.shippingRates,
};

/** Currency + shipping rules for the seller the current cart belongs to. */
export const storefrontQuery = (appId: number | null) =>
  queryOptions({
    queryKey: ["storefront", appId],
    queryFn: (): Promise<Storefront | null> =>
      appId ? getStorefront({ data: { appId } }) : Promise.resolve(null),
    enabled: appId != null,
    staleTime: 60_000,
  });
