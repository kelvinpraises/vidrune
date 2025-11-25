import { useState, useEffect } from "react";
import type { PredictionMarket } from "@/types/prediction-market";
import { loadVideoPackageFromWalrus } from "@/services/walrus-video-loader";

export function usePredictionMarkets() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = async () => {
    setIsLoading(true);
    try {
      // TODO: Fetch from SUI smart contract
      // const marketRegistry = await fetchMarketRegistry();

      // For now: create dummy market from loaded video
      const videoPackage = await loadVideoPackageFromWalrus('dummy-blob-id');

      const dummyMarket: PredictionMarket = {
        id: "market_1",
        videoId: videoPackage.manifest.id,
        videoTitle: videoPackage.manifest.title,
        thumbnailUrl: videoPackage.sceneUrls[0] || "",
        question: "Are the tags incomplete for this video?",
        status: "active",
        totalStaked: 12.5,
        yesPercentage: 65,
        noPercentage: 35,
        endDate: Date.now() + 48 * 60 * 60 * 1000, // 48 hours from now
        convictions: [
          {
            id: "conv_1",
            videoId: videoPackage.manifest.id,
            submittedBy: "0x123...456",
            fact: "Tags are incomplete",
            proofs: [
              "Video mentions 'blockchain' and 'cryptocurrency' multiple times but these tags are missing",
              "Transcript analysis shows 15 mentions of crypto-related terms"
            ],
            stakeAmount: 0.5,
            timestamp: Date.now() - 60 * 60 * 1000,
          }
        ]
      };

      setMarkets([dummyMarket]);
      setError(null);
    } catch (err) {
      console.error("Error fetching markets:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  return {
    markets,
    isLoading,
    error,
    refetch: fetchMarkets
  };
}
