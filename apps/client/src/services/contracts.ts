/**
 * Vidrune Contract Interaction Service
 *
 * Wagmi/Viem hooks for interacting with Somnia smart contracts.
 * Integrates with Somnia Data Streams for real-time event emissions.
 */
import type { Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import {
  pointsRegistryAbi,
  predictionMarketAbi,
  videoRegistryAbi,
} from "@/contracts/generated";
import {
  emitConvictionSubmitted,
  emitMarketCreated,
  emitMarketVote,
  emitProcessingUpdate,
  emitVideoIndexed,
} from "@/services/somnia-streams";

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
 * Submit a new video index to the blockchain
 *
 * @example
 * const { submitVideoIndex, isPending } = useSubmitVideoIndex();
 * await submitVideoIndex('video_123', 'walrus_blob_abc');
 */
export const useSubmitVideoIndex = () => {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  const { address } = useAccount();

  const submitVideoIndex = async (videoId: string, walrusBlobId: string) => {
    try {
      // Step 1: Submit the video index
      const tx = await writeContractAsync({
        address: VIDEO_REGISTRY_ADDRESS,
        abi: videoRegistryAbi,
        functionName: "submitIndex",
        args: [videoId, walrusBlobId],
      });

      // Step 2: Emit SDS event for real-time activity feed
      if (address) {
        await emitVideoIndexed(videoId, address);
      }

      return tx;
    } catch (err) {
      console.error("Failed to submit video index:", err);
      throw err;
    }
  };

  return {
    submitVideoIndex,
    isPending,
    isSuccess,
    error,
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
 * Create a new prediction market
 */
export const useCreateMarket = () => {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();

  const createMarket = async (videoId: string, question: string) => {
    try {
      const result = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: predictionMarketAbi,
        functionName: "createMarket",
        args: [videoId, question],
      });

      // Emit SDS event
      // Note: marketId is returned from the transaction, but we can't access it directly here
      // In production, you'd listen for the MarketCreated event to get the marketId
      await emitMarketCreated("pending", videoId, question);

      return result;
    } catch (err) {
      console.error("Failed to create market:", err);
      throw err;
    }
  };

  return {
    createMarket,
    isPending,
    isSuccess,
    error,
  };
};

/**
 * Vote YES on a prediction market
 */
export const useVoteYes = () => {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  const { address } = useAccount();

  const voteYes = async (marketId: string) => {
    try {
      const tx = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: predictionMarketAbi,
        functionName: "voteYes",
        args: [marketId],
      });

      // Get updated vote counts for SDS event
      // In production, listen for VoteCast event to get accurate counts
      if (address) {
        // Simplified: emit with placeholder counts
        // Real implementation would fetch current counts from contract
        await emitMarketVote(marketId, true, address, 0, 0);
      }

      return tx;
    } catch (err) {
      console.error("Failed to vote YES:", err);
      throw err;
    }
  };

  return {
    voteYes,
    isPending,
    isSuccess,
    error,
  };
};

/**
 * Vote NO on a prediction market
 */
export const useVoteNo = () => {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  const { address } = useAccount();

  const voteNo = async (marketId: string) => {
    try {
      const tx = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: predictionMarketAbi,
        functionName: "voteNo",
        args: [marketId],
      });

      // Emit SDS event
      if (address) {
        await emitMarketVote(marketId, false, address, 0, 0);
      }

      return tx;
    } catch (err) {
      console.error("Failed to vote NO:", err);
      throw err;
    }
  };

  return {
    voteNo,
    isPending,
    isSuccess,
    error,
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
 * Submit a conviction (challenge) against a video
 * Note: Convictions are now stored in VideoRegistry, not a separate contract
 */
export const useSubmitConviction = () => {
  const { writeContractAsync, isPending, isSuccess, error } = useWriteContract();
  const { address } = useAccount();

  const submitConviction = async (videoId: string, walrusBlobId: string) => {
    try {
      const result = await writeContractAsync({
        address: VIDEO_REGISTRY_ADDRESS,
        abi: videoRegistryAbi,
        functionName: "submitConviction",
        args: [videoId, walrusBlobId],
      });

      // Emit SDS event
      if (address) {
        await emitConvictionSubmitted(videoId, "pending", address);
      }

      return result;
    } catch (err) {
      console.error("Failed to submit conviction:", err);
      throw err;
    }
  };

  return {
    submitConviction,
    isPending,
    isSuccess,
    error,
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

  await emitProcessingUpdate(videoId, stageNames[stage], progress);
};
