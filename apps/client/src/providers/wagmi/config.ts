import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";
import { celoSepolia } from "viem/chains";

export const config = createConfig(
  getDefaultConfig({
    appName: "Vidrune",
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    chains: [celoSepolia],
    transports: {
      [celoSepolia.id]: http(),
    },
  }),
);
