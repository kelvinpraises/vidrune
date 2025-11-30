// import { getDefaultConfig } from "connectkit";
// import { createConfig, webSocket } from "wagmi";

// const somniaTestnet = {
//   id: 50312,
//   name: "Somnia Testnet",
//   nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
//   rpcUrls: {
//     default: {
//       http: ["https://dream-rpc.somnia.network"],
//       webSocket: ["wss://dream-rpc.somnia.network"], // For SDS
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "Shannon Explorer",
//       url: "https://shannon-explorer.somnia.network",
//     },
//   },
//   testnet: true,
// };

// export const config = createConfig(
//   getDefaultConfig({
//     appName: "Vidrune",
//     walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
//     chains: [somniaTestnet],
//     transports: {
//       [50312]: webSocket("wss://dream-rpc.somnia.network"),
//     },
//   })
// );
import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";

const anvilLocal = {
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
    },
  },
  testnet: true,
};

export const config = createConfig(
  getDefaultConfig({
    appName: "Vidrune",
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    chains: [anvilLocal],
    transports: {
      [31337]: http("http://localhost:8545"),
    },
  })
);
