/**
 * Vidrune Contract Interaction Service
 *
 * Wagmi/Viem hooks for interacting with Celo smart contracts.
 * All transactions are signed by users via their wallet.
 */
import type { Address } from "viem";
import { useReadContract, useWriteContract } from "wagmi";

import {
  pointsRegistryAbi,
  predictionMarketAbi,
  videoRegistryAbi,
} from "@/contracts/generated";

// ============================================================================
// Contract Addresses (from .env)
// ============================================================================

export const POINTS_REGISTRY_ADDRESS = import.meta.env
  .VITE_POINTS_REGISTRY_ADDRESS as Address;
export const VIDEO_REGISTRY_ADDRESS = import.meta.env
  .VITE_VIDEO_REGISTRY_ADDRESS as Address;
export const PREDICTION_MARKET_ADDRESS = import.meta.env
  .VITE_PREDICTION_MARKET_ADDRESS as Address;

/**
 * Check if all contracts are deployed (addresses set in .env)
 */
export const areContractsDeployed = (): boolean => {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  return (
    !!POINTS_REGISTRY_ADDRESS &&
    !!VIDEO_REGISTRY_ADDRESS &&
    !!PREDICTION_MARKET_ADDRESS &&
    POINTS_REGISTRY_ADDRESS !== zeroAddress &&
    VIDEO_REGISTRY_ADDRESS !== zeroAddress &&
    PREDICTION_MARKET_ADDRESS !== zeroAddress
  );
};

// ============================================================================
// VideoRegistry Hooks
// ============================================================================

/**
 * Submit a new video index - USER SIGNS WITH WALLET
 *
 * @example
 * const { submitVideoIndex, isPending } = useSubmitVideoIndex();
 * await submitVideoIndex('video_123', 'walrus_blob_abc');
 */
export const useSubmitVideoIndex = () => {
  const { writeContractAsync } = useWriteContract();

  const submitVideoIndex = async (videoId: string, walrusBlobId: string) => {
    const hash = await writeContractAsync({
      address: VIDEO_REGISTRY_ADDRESS,
      abi: videoRegistryAbi,
      functionName: 'submitIndex',
      args: [videoId, walrusBlobId],
    });
    
    return hash;
  };

  return {
    submitVideoIndex,
  };
};

/**
 * Get video details from blockchain
 */
export const useGetVideo = (videoId: string | null) => {
  return useReadContract({
    address: VIDEO_REGISTRY_ADDRESS,
    abi: videoRegistryAbi,
    functionName: "getVideo",
    args: videoId ? [videoId] : undefined,
    query: {
      enabled: !!videoId && areContractsDeployed(),
    },
  });
};

/**
 * Get all video IDs from blockchain
 */
export const useGetAllVideoIds = () => {
  return useReadContract({
    address: VIDEO_REGISTRY_ADDRESS,
    abi: videoRegistryAbi,
    functionName: "getAllVideoIds",
    query: {
      enabled: areContractsDeployed(),
    },
  });
};

/**
 * Get total video count
 */
export const useGetVideoCount = () => {
  return useReadContract({
    address: VIDEO_REGISTRY_ADDRESS,
    abi: videoRegistryAbi,
    functionName: "getVideoCount",
    query: {
      enabled: areContractsDeployed(),
    },
  });
};

// ============================================================================
// Async Contract Functions (Non-Hooks)
// ============================================================================

import { readContract } from "wagmi/actions";
import { config } from "@/providers/wagmi/config";

/**
 * Get all video IDs (Async)
 */
export const getAllVideoIds = async (): Promise<string[]> => {
  if (!areContractsDeployed()) return [];

  try {
    const ids = await readContract(config, {
      address: VIDEO_REGISTRY_ADDRESS,
      abi: videoRegistryAbi,
      functionName: "getAllVideoIds",
    });
    return ids as string[];
  } catch (error) {
    console.error("Failed to fetch video IDs:", error);
    return [];
  }
};

/**
 * Get video details (Async)
 */
export const getVideo = async (videoId: string) => {
  if (!areContractsDeployed()) throw new Error("Contracts not deployed");

  try {
    const video = await readContract(config, {
      address: VIDEO_REGISTRY_ADDRESS,
      abi: videoRegistryAbi,
      functionName: "getVideo",
      args: [videoId],
    });
    return video;
  } catch (error) {
    console.error(`Failed to fetch video ${videoId}:`, error);
    throw error;
  }
};

// ============================================================================
// PredictionMarket Hooks
// ============================================================================

/**
 * Create a new prediction market - USER SIGNS WITH WALLET
 */
export const useCreateMarket = () => {
  const { writeContractAsync } = useWriteContract();

  const createMarket = async (videoId: string, question: string) => {
    const hash = await writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: predictionMarketAbi,
      functionName: 'createMarket',
      args: [videoId, question],
    });
    
    return hash;
  };

  return {
    createMarket,
  };
};

/**
 * Vote YES on a prediction market - USER SIGNS WITH WALLET
 */
export const useVoteYes = () => {
  const { writeContractAsync } = useWriteContract();

  const voteYes = async (marketId: string) => {
    const hash = await writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: predictionMarketAbi,
      functionName: 'voteYes',
      args: [marketId],
    });
    
    return hash;
  };

  return {
    voteYes,
  };
};

/**
 * Vote NO on a prediction market - USER SIGNS WITH WALLET
 */
export const useVoteNo = () => {
  const { writeContractAsync } = useWriteContract();

  const voteNo = async (marketId: string) => {
    const hash = await writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: predictionMarketAbi,
      functionName: 'voteNo',
      args: [marketId],
    });
    
    return hash;
  };

  return {
    voteNo,
  };
};

/**
 * Get market details
 */
export const useGetMarket = (marketId: string | null) => {
  return useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: predictionMarketAbi,
    functionName: "getMarket",
    args: marketId ? [marketId] : undefined,
    query: {
      enabled: !!marketId && areContractsDeployed(),
    },
  });
};

/**
 * Get all market IDs
 */
export const useGetAllMarketIds = () => {
  return useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: predictionMarketAbi,
    functionName: "getAllMarketIds",
    query: {
      enabled: areContractsDeployed(),
    },
  });
};

/**
 * Get market count
 */
export const useGetMarketCount = () => {
  return useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: predictionMarketAbi,
    functionName: "getMarketCount",
    query: {
      enabled: areContractsDeployed(),
    },
  });
};

/**
 * Get market odds (YES/NO percentages)
 */
export const useGetMarketOdds = (marketId: string | null) => {
  return useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: predictionMarketAbi,
    functionName: "getMarketOdds",
    args: marketId ? [marketId] : undefined,
    query: {
      enabled: !!marketId && areContractsDeployed(),
    },
  });
};

/**
 * Get user's position in a market
 */
export const useGetUserPosition = (
  marketId: string | null,
  userAddress: Address | null,
) => {
  return useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: predictionMarketAbi,
    functionName: "getPosition",
    args: marketId && userAddress ? [marketId, userAddress] : undefined,
    query: {
      enabled: !!marketId && !!userAddress && areContractsDeployed(),
    },
  });
};

// ============================================================================
// Conviction Hooks (now part of VideoRegistry)
// ============================================================================

/**
 * Submit a conviction (challenge) against a video - USER SIGNS WITH WALLET
 */
export const useSubmitConviction = () => {
  const { writeContractAsync } = useWriteContract();

  const submitConviction = async (videoId: string, proofBlobId: string) => {
    const hash = await writeContractAsync({
      address: VIDEO_REGISTRY_ADDRESS,
      abi: videoRegistryAbi,
      functionName: 'submitConviction',
      args: [videoId, proofBlobId],
    });
    
    return hash;
  };

  return {
    submitConviction,
  };
};

/**
 * Get conviction details by index
 * Note: Convictions are now stored in VideoRegistry
 */
export const useGetConviction = (
  videoId: string | null,
  convictionIndex: bigint | null,
) => {
  return useReadContract({
    address: VIDEO_REGISTRY_ADDRESS,
    abi: videoRegistryAbi,
    functionName: "getConviction",
    args: videoId && convictionIndex !== null ? [videoId, convictionIndex] : undefined,
    query: {
      enabled: !!videoId && convictionIndex !== null && areContractsDeployed(),
    },
  });
};

/**
 * Get conviction count for a video
 */
export const useGetConvictionCount = (videoId: string | null) => {
  return useReadContract({
    address: VIDEO_REGISTRY_ADDRESS,
    abi: videoRegistryAbi,
    functionName: "getConvictionCount",
    args: videoId ? [videoId] : undefined,
    query: {
      enabled: !!videoId && areContractsDeployed(),
    },
  });
};

// ============================================================================
// PointsRegistry Hooks
// ============================================================================

/**
 * Get user's points balance
 */
export const useGetUserPoints = (userAddress: Address | null) => {
  return useReadContract({
    address: POINTS_REGISTRY_ADDRESS,
    abi: pointsRegistryAbi,
    functionName: "getPoints",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && areContractsDeployed(),
      // Refetch every 10 seconds to keep points up-to-date
      refetchInterval: 10000,
    },
  });
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format video status enum to human-readable string
 */
export const formatVideoStatus = (status: number): string => {
  const statuses = ["Pending", "Finalized", "Challenged"];
  return statuses[status] || "Unknown";
};

/**
 * Format market status enum to human-readable string
 */
export const formatMarketStatus = (status: number): string => {
  const statuses = ["Active", "Closed", "Resolved"];
  return statuses[status] || "Unknown";
};

/**
 * Format conviction status enum to human-readable string
 */
export const formatConvictionStatus = (status: number): string => {
  const statuses = ["Active", "Resolved", "Dismissed"];
  return statuses[status] || "Unknown";
};

/**
 * Check if video is in conviction period
 * Note: Conviction period starts from block.timestamp when submitIndex() is confirmed on-chain
 */
export const useIsInConvictionPeriod = (videoId: string | null) => {
  return useReadContract({
    address: VIDEO_REGISTRY_ADDRESS,
    abi: videoRegistryAbi,
    functionName: "isInConvictionPeriod",
    args: videoId ? [videoId] : undefined,
    query: {
      enabled: !!videoId && areContractsDeployed(),
      // Refetch every 30 seconds to keep conviction period status accurate
      refetchInterval: 30000,
    },
  });
};

// ============================================================================
// Processing Integration Helpers
// ============================================================================

/**
 * Emit processing updates during video upload flow
 * These are called from the video pipeline hooks
 */
export const emitVideoProcessingUpdate = async (
  videoId: string,
  stage: "uploading" | "extracting" | "captioning" | "analyzing" | "complete",
  progress: number,
) => {
  const stageNames = {
    uploading: "Uploading to Walrus",
    extracting: "Extracting Scenes",
    captioning: "Generating Captions",
    analyzing: "Analyzing Content",
    complete: "Complete",
  };

  // TODO: Implement processing update emission
  console.log(`Processing ${videoId}: ${stageNames[stage]} - ${progress}%`);
};
