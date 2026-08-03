import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteSpinner } from "./components/RouteSpinner";
import { rewriteInput, rewriteOutput } from "./lib/subdomain";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 200,
    defaultPendingMinMs: 100,
    defaultPendingComponent: RouteSpinner,
    // Mount each jenvu.com subdomain on its section without ever showing the
    // section prefix in the address bar (leads.jenvu.com/maps, dash.jenvu.com/billing).
    rewrite: {
      input: ({ url }) => rewriteInput(url),
      output: ({ url }) => rewriteOutput(url),
    },
  });

  return router;
};


