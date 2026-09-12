import { queryOptions } from "@tanstack/react-query";
import { getSiteContent } from "./content.functions";

export const siteContentQuery = queryOptions({
  queryKey: ["site-content"],
  queryFn: () => getSiteContent(),
  staleTime: 60_000,
});
