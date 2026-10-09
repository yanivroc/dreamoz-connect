import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });

  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Send the server's query cache to the browser so pages don't blank while refetching.
    dehydrate: () => ({ queryState: dehydrate(queryClient) }) as any,
    hydrate: (data: any) => {
      if (data?.queryState) hydrate(queryClient, data.queryState as DehydratedState);
    },
  });
};
