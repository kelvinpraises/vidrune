import React from "react";

import { SidebarProvider } from "@/components/atoms/sidebar";
import { WagmiProvider } from "./wagmi";
import { ConnectKitProvider } from "./connectkit";
import { ThemeProvider } from "./theme";
import { useBackendPoller } from "@/hooks/use-backend-poller";

const PollingIndicator = () => {
  const { isPolling, lastPollTime, error } = useBackendPoller();

  // Don't show indicator in production or if disabled
  if (import.meta.env.PROD && !import.meta.env.VITE_SHOW_POLL_INDICATOR) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-black/80 backdrop-blur-sm text-white text-xs font-mono"
      title={
        error
          ? `Polling error: ${error}`
          : lastPollTime
          ? `Last poll: ${new Date(lastPollTime).toLocaleTimeString()}`
          : "Waiting for first poll..."
      }
    >
      <div
        className={`w-2 h-2 rounded-full ${
          error
            ? "bg-red-500"
            : isPolling
            ? "bg-yellow-500 animate-pulse"
            : "bg-green-500"
        }`}
      />
      <span className="hidden sm:inline">
        {error ? "Poll Error" : isPolling ? "Polling..." : "Poll Active"}
      </span>
    </div>
  );
};

const RootProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider>
      <ConnectKitProvider>
        <ThemeProvider defaultTheme="system" storageKey="vidrune-theme">
          <SidebarProvider>
            {children}
            <PollingIndicator />
          </SidebarProvider>
        </ThemeProvider>
      </ConnectKitProvider>
    </WagmiProvider>
  );
};

export default RootProvider;
