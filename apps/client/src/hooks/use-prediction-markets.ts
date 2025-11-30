import { useState, useEffect } from "react";
import type { PredictionMarket } from "@/types/prediction-market";
import { loadVideoPackageFromWalrus } from "@/services/walrus-video-loader";
import { readContract } from "wagmi/actions";
import { config } from "@/providers/wagmi/config";
import {
  useGetAllMarketIds,
  areContractsDeployed,
  PREDICTION_MARKET_ADDRESS,
  VIDEO_REGISTRY_ADDRESS,
} from "@/services/contracts";
import { predictionMarketAbi, videoRegistryAbi } from "@/contracts/generated";

/**
 * Hook to fetch and manage prediction markets
 *
 * Strategy:
 * 1. If contracts are deployed: fetch real data from blockchain
 * 2. If contracts not deployed: show empty state (no mock data)
 */
export function usePredictionMarkets() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if contracts are deployed
  const contractsDeployed = areContractsDeployed();

  // Fetch market IDs from blockchain (only if deployed)
  const {
    data: marketIds,
    isLoading: marketIdsLoading,
    error: marketIdsError,
  } = useGetAllMarketIds();

  const fetchMarketsFromBlockchain = async () => {
    if (!marketIds || marketIds.length === 0) {
      setMarkets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const fetchedMarkets: PredictionMarket[] = [];

      for (const marketId of marketIds) {
        try {
          // Fetch market data from blockchain
          const marketData = (await readContract(config, {
            address: PREDICTION_MARKET_ADDRESS,
            abi: predictionMarketAbi,
            functionName: "getMarket",
            args: [marketId],
          })) as any;

          // Fetch market odds
          const odds = (await readContract(config, {
            address: PREDICTION_MARKET_ADDRESS,
            abi: predictionMarketAbi,
            functionName: "getMarketOdds",
            args: [marketId],
          })) as [bigint, bigint];

          // Try to get video title from video registry
          let videoTitle = "Video";
          try {
            const videoData = (await readContract(config, {
              address: VIDEO_REGISTRY_ADDRESS,
              abi: videoRegistryAbi,
              functionName: "getVideo",
              args: [marketData.videoId],
            })) as any;

            // Try to load video package for title
            if (videoData.walrusBlobId) {
              try {
                const pkg = await loadVideoPackageFromWalrus(videoData.walrusBlobId);
                videoTitle = pkg.manifest.title || "Video";
              } catch {
                // Ignore - use default title
              }
            }
          } catch {
            // Ignore - use default title
          }

          // Determine market status
          const now = BigInt(Math.floor(Date.now() / 1000));
          let status: "active" | "closed" | "resolved" = "active";
          if (marketData.resolved) {
            status = "resolved";
          } else if (marketData.expiresAt <= now) {
            status = "closed";
          }

          // Fetch convictions for this video from Walrus
          let convictions: PredictionMarket["convictions"] = [];
          try {
            const convictionCount = (await readContract(config, {
              address: VIDEO_REGISTRY_ADDRESS,
              abi: videoRegistryAbi,
              functionName: "getConvictionCount",
              args: [marketData.videoId],
            })) as bigint;

            for (let i = 0; i < Number(convictionCount); i++) {
              try {
                const conviction = (await readContract(config, {
                  address: VIDEO_REGISTRY_ADDRESS,
                  abi: videoRegistryAbi,
                  functionName: "getConviction",
                  args: [marketData.videoId, BigInt(i)],
                })) as any;

                // Fetch conviction data from Walrus
                let fact = "Challenge submitted";
                let proofs: string[] = [];
                try {
                  const { downloadFile } = await import("@/services/walrus-storage");
                  const blob = await downloadFile(conviction.walrusBlobId);
                  if (blob) {
                    const text = await blob.text();
                    const convictionData = JSON.parse(text);
                    fact = convictionData.fact || fact;
                    proofs = convictionData.proofs || [];
                  }
                } catch {
                  // Failed to fetch from Walrus, use defaults
                }

                convictions.push({
                  id: `${marketData.videoId}_${i}`,
                  videoId: marketData.videoId,
                  submittedBy: conviction.challenger,
                  fact,
                  proofs,
                  stakeAmount: 0,
                  timestamp: Number(conviction.timestamp) * 1000,
                });
              } catch {
                // Skip failed conviction fetches
              }
            }
          } catch {
            // No convictions or failed to fetch
          }

          const market: PredictionMarket = {
            id: marketData.id,
            videoId: marketData.videoId,
            videoTitle,
            thumbnailUrl: "",
            question: marketData.question,
            status,
            totalStaked: Number(marketData.yesVotes + marketData.noVotes),
            yesVotes: Number(marketData.yesVotes),
            noVotes: Number(marketData.noVotes),
            yesPercentage: Number(odds[0]),
            noPercentage: Number(odds[1]),
            createdAt: Number(marketData.createdAt) * 1000,
            endDate: Number(marketData.expiresAt) * 1000,
            expiresAt: Number(marketData.expiresAt) * 1000,
            resolved: marketData.resolved,
            winningSide: marketData.winningSide,
            convictions,
          };

          fetchedMarkets.push(market);
        } catch (err) {
          console.warn(`Failed to fetch market ${marketId}:`, err);
        }
      }

      setMarkets(fetchedMarkets);
      setError(null);
    } catch (err) {
      console.error("Error fetching markets from blockchain:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMarkets = async () => {
    if (contractsDeployed) {
      await fetchMarketsFromBlockchain();
    } else {
      // No mock data - just show empty state
      setMarkets([]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contractsDeployed && !marketIdsLoading) {
      fetchMarketsFromBlockchain();
    } else if (!contractsDeployed) {
      setMarkets([]);
      setIsLoading(false);
    }
  }, [contractsDeployed, marketIds, marketIdsLoading]);

  return {
    markets,
    isLoading: contractsDeployed ? marketIdsLoading || isLoading : isLoading,
    error: contractsDeployed ? (marketIdsError as Error)?.message || error : error,
    refetch: fetchMarkets,
  };
}
