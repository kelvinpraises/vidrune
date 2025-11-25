import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SidebarProvider } from "@/components/atoms/sidebar";
import { ZkLoginProvider } from "./zklogin-provider";
import { ThemeProvider } from "./theme";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const RootProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ZkLoginProvider>
        <ThemeProvider defaultTheme="system" storageKey="vidrune-theme">
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </ZkLoginProvider>
    </QueryClientProvider>
  );
};

export default RootProvider;
