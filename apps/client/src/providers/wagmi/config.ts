import { getDefaultConfig } from "connectkit";
import { createConfig, http, custom } from "wagmi";
import { celoSepolia, anvil } from "viem/chains";
import { isMiniPay } from "@/utils/minipay";

// Detect if we're running against Anvil (local development)
const isAnvil = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
  return backendUrl.includes("localhost") || backendUrl.includes("127.0.0.1");
};

// Get the appropriate chain based on environment
const getChain = () => {
  return isAnvil() ? anvil : celoSepolia;
};

// Use custom transport for MiniPay, otherwise use http
const getTransport = () => {
  if (typeof window !== "undefined" && isMiniPay() && window.ethereum) {
    return custom(window.ethereum);
  }
  return http();
};

const activeChain = getChain();

export const config = createConfig(
  getDefaultConfig({
    appName: "Vidrune",
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    chains: [activeChain],
    transports: {
      [activeChain.id]: getTransport(),
    },
  }),
);
