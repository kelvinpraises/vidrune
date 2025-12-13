/**
 * Contract addresses on Story Aeneid testnet
 *
 * These addresses are populated from environment variables after deployment.
 * Default to zero address until contracts are deployed.
 */

export const contracts = {
  pointsRegistry:
    (import.meta.env.VITE_POINTS_REGISTRY_ADDRESS as string) ||
    "0x0000000000000000000000000000000000000000",
  videoRegistry:
    (import.meta.env.VITE_VIDEO_REGISTRY_ADDRESS as string) ||
    "0x0000000000000000000000000000000000000000",
  predictionMarket:
    (import.meta.env.VITE_PREDICTION_MARKET_ADDRESS as string) ||
    "0x0000000000000000000000000000000000000000",
} as const;

/**
 * Check if contracts are deployed
 * Returns true if at least one contract address is not the zero address
 */
export const areContractsDeployed = (): boolean => {
  return contracts.pointsRegistry !== "0x0000000000000000000000000000000000000000";
};

/**
 * Validate all contract addresses are deployed
 * Throws error if any contract is not deployed
 */
export const validateContractsDeployed = (): void => {
  const missingContracts: string[] = [];

  if (contracts.pointsRegistry === "0x0000000000000000000000000000000000000000") {
    missingContracts.push("VITE_POINTS_REGISTRY_ADDRESS");
  }
  if (contracts.videoRegistry === "0x0000000000000000000000000000000000000000") {
    missingContracts.push("VITE_VIDEO_REGISTRY_ADDRESS");
  }
  if (contracts.predictionMarket === "0x0000000000000000000000000000000000000000") {
    missingContracts.push("VITE_PREDICTION_MARKET_ADDRESS");
  }

  if (missingContracts.length > 0) {
    throw new Error(
      `Missing contract addresses. Please set the following environment variables:\n${missingContracts.join(
        "\n"
      )}`
    );
  }
};
