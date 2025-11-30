import {
  Outlet,
  RouterProvider,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { z } from "zod";

import ConsoleComponent from "@/app/console.tsx";
import ExploreComponent from "@/app/explore.tsx";
import HomeComponent from "@/app/index.tsx";
import MarketsIndexComponent from "@/app/markets.index.tsx";
import MarketDetailComponent from "@/app/markets.$marketId.tsx";
import { Toaster } from "@/components/atoms/sonner";
import RootProvider from "@/providers";
import "@/styles/globals.css";
import reportWebVitals from "./reportWebVitals.ts";

const rootRoute = createRootRoute({
  component: () => (
    <RootProvider>
      <Outlet />
      <Toaster />

      <TanStackRouterDevtools />
    </RootProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeComponent,
});

const consoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "console",
  component: ConsoleComponent,
  validateSearch: z.object({
    test: z.boolean().optional(),
  }),
});

const datasetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "datasets",
  component: ExploreComponent,
});

const marketsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "markets",
  component: MarketsIndexComponent,
});

const marketDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "markets/$marketId",
  component: MarketDetailComponent,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  consoleRoute,
  datasetsRoute,
  marketsIndexRoute,
  marketDetailRoute,
]);

const browserHistory = createBrowserHistory();
const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  history: browserHistory,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
