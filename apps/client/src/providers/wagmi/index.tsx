import { WagmiProvider as _WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./config";

const queryClient = new QueryClient();

export const WagmiProvider = ({ children }: { children: React.ReactNode }) => (
  <_WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </_WagmiProvider>
);
