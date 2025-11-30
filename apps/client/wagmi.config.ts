import { defineConfig } from "@wagmi/cli";
import { foundry, react } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/contracts/generated.ts",
  contracts: [],
  plugins: [
    foundry({
      project: "../../apps/contract",
      include: [
        "VideoRegistry.json",
        "PredictionMarket.json",
        "PointsRegistry.json",
      ],
    }),
    react(),
  ],
});
