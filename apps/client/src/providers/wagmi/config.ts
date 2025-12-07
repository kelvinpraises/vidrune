import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";

const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Shannon Explorer",
      url: "https://shannon-explorer.somnia.network",
    },
  },
  testnet: true,
};

export const config = createConfig(
  getDefaultConfig({
    appName: "Vidrune",
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    chains: [somniaTestnet],
    transports: {
      [50312]: http("https://dream-rpc.somnia.network"),
    },
  }),
);
