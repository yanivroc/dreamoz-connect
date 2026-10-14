import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { me, type CurrentUser } from "./auth.functions";

export const OWN_PRODUCT_MESSAGE = "You cannot purchase products from your own storefront.";

/** Shares the header's session query; returns a checker for "is this my store?". */
export function useIsOwnApp() {
  const fetchMe = useServerFn(me);
  const { data } = useQuery<CurrentUser | null>({
    queryKey: ["session-user"],
    queryFn: () => fetchMe(),
    staleTime: 30_000,
  });
  const owned = data?.ownedAppIds ?? [];
  return (appId: number) => owned.includes(appId);
}
