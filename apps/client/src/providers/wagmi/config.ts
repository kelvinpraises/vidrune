import { getDefaultConfig } from "connectkit";
import { createConfig, http, custom } from "wagmi";
import { celoSepolia } from "viem/chains";
import { isMiniPay } from "@/utils/minipay";

// Use custom transport for MiniPay, otherwise use http
const getTransport = () => {
  if (typeof window !== 'undefined' && isMiniPay() && window.ethereum) {
    return custom(window.ethereum);
  }
  return http();
};

export const config = createConfig(
  getDefaultConfig({
    appName: "Vidrune",
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    chains: [celoSepolia],
    transports: {
      [celoSepolia.id]: getTransport(),
    },
  }),
);
