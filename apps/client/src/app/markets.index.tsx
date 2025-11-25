import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Skeleton } from "@/components/atoms/skeleton";
import { AppHeader } from "@/components/molecules/app-header";
import { PredictionMarketCard } from "@/components/organisms/prediction-market-card";
import { usePredictionMarkets } from "@/hooks/use-prediction-markets";
import { useEffect, useState } from "react";

function MarketsIndexPage() {
  const { markets, isLoading: originalLoading } = usePredictionMarkets();

  // TODO: Remove this delay after testing - temporary 10 second delay
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!originalLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [originalLoading]);

  return (
    <>
      {/* Header */}
      <AppHeader currentPage="markets" showConnectWallet />

      <div className="w-full max-w-6xl mx-auto px-4 py-16 mt-20">
        <h2 className="text-2xl md:text-3xl font-medium mb-8 text-center">
          All Prediction Markets
        </h2>

        {isLoading || originalLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="relative">
                    <Skeleton className="w-16 h-16 rounded-full" />
                  </div>
                  <CardTitle className="text-lg font-medium">
                    <Skeleton className="h-6 w-full" />
                  </CardTitle>
                  <div className="flex gap-2 mb-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mt-8">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
              <PredictionMarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default MarketsIndexPage;
