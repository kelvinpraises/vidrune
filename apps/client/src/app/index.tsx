import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { useState } from "react";

import GridPattern from "@/components/atoms/grid-pattern";
import { PlaceholdersAndVanishInput } from "@/components/atoms/query-input";
import { Skeleton } from "@/components/atoms/skeleton";
import { Tabs, TabsContent } from "@/components/atoms/tabs";
import { AppHeader } from "@/components/molecules/app-header";
import IndexExplorerCards from "@/components/organisms/index-explorer-cards";
import { PredictionMarketCard } from "@/components/organisms/prediction-market-card";
import { usePredictionMarkets } from "@/hooks/use-prediction-markets";
import { useSearch } from "@/hooks/use-search";
import clampBuilder from "@/utils/clamp-builder";

function HomeComponent() {
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const { results, isSearching, error, search } = useSearch();
  const { markets, isLoading: marketsLoading } = usePredictionMarkets();

  const placeholders = [
    "Find trading videos with technical analysis",
    "Search for crypto market updates",
    "Find videos about FTM ecosystem growth",
    "Search for blockchain trading tutorials",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      search(searchQuery);
      setActiveTab("result");
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Header - Fixed Position with Frosted Glass Effect */}
      <AppHeader />

      <div className="relative z-1">
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent
            className="m-0 outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            value="home"
          >
            <main>
              {/* Hero Section with Search */}
              <div className="flex flex-col items-center px-4 min-h-[75vh] relative pt-50">
                <div className="flex flex-col justify-center items-center px-4 relative z-10">
                  <h2 className="mb-6 sm:mb-10 text-xl text-center sm:text-2xl dark:text-white text-[#3C4043] font-source-code-pro font-semibold">
                    Open compute. Open future. Unleashed insights.
                  </h2>
                  <div style={{ width: clampBuilder(350, 768, 20, 40) }}>
                    <PlaceholdersAndVanishInput
                      placeholders={placeholders}
                      onChange={handleChange}
                      onSubmit={onSubmit}
                      value={searchQuery}
                    />
                  </div>
                </div>
              </div>

              {/* Prediction Markets Section */}
              <div className="w-full max-w-6xl mx-auto px-4 py-16">
                <h2 className="text-2xl md:text-3xl font-medium mb-8 text-center">
                  Polls For You
                </h2>
                {marketsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-60 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {markets.map((market) => (
                        <PredictionMarketCard key={market.id} market={market} />
                      ))}
                    </div>
                    <div className="flex justify-center mt-10">
                      <Link to="/markets">
                        <button className="font-medium px-8 py-4 rounded-[0] text-xl flex items-center gap-4 bg-[#33CB82] hover:bg-[#33CB82]/80 transition-colors duration-200">
                          Show more
                          <div className="w-10 h-10 rounded-full bg-[#191A23] flex justify-center items-center">
                            <ArrowDown strokeWidth={3} className="text-emerald-400" />
                          </div>
                        </button>
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* Footer with Barcode */}
              <footer className="w-full flex justify-center py-12">
                <img alt="vidrune barcode" src="/vidrune.png" width={312} height={100} />
              </footer>
            </main>
          </TabsContent>
          <TabsContent
            value="result"
            className="m-0 outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <div className="relative flex flex-col items-center px-4 gap-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
                className="fixed inset-0 -z-10"
              >
                <div className="absolute top-0 left-[10%] w-[30rem] h-[30rem] bg-[#00ccb1]/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                <div className="absolute top-0 right-[10%] w-[30rem] h-[30rem] bg-[#7b61ff]/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute bottom-0 left-[20%] w-[30rem] h-[30rem] bg-[#ffc414]/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
                <div className="absolute bottom-0 right-[20%] w-[30rem] h-[30rem] bg-[#1ca0fb]/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-6000" />
              </motion.div>
              <div className="w-full max-w-6xl mx-auto py-8">
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={() => setActiveTab("home")}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-mono font-medium bg-white dark:bg-[#1D1F21] text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 rounded-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go back
                  </button>

                  <h2 className="text-xl font-display font-medium">
                    Search results for: <span className="font-bold">{searchQuery}</span>
                  </h2>
                </div>

                {isSearching ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4">
                      <Skeleton className="h-12 w-full" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex flex-col">
                            <Skeleton className="h-60 w-full rounded-lg" />
                            <Skeleton className="h-6 w-3/4 mt-4" />
                            <Skeleton className="h-4 w-1/2 mt-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center py-10">
                    <p className="text-red-500">Error: {error}</p>
                    <button
                      className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg font-mono"
                      onClick={() => search(searchQuery)}
                    >
                      Try Again
                    </button>
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-display font-medium mb-4">
                      No results found
                    </h3>
                    <p className="text-gray-500 mb-8">
                      Try another search query or browse the explore section
                    </p>
                    <button
                      onClick={() => setActiveTab("home")}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg font-mono font-medium"
                    >
                      Back to Search
                    </button>
                  </div>
                ) : (
                  <IndexExplorerCards
                    metadata={
                      results.map((result) => result.metadata).filter(Boolean) as any[]
                    }
                    defaultLayout="grid"
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed min-h-screen w-screen top-0 flex items-center justify-center">
        <div
          style={{
            width: clampBuilder(350, 768, 20, 40),
            height: clampBuilder(350, 768, 20, 40),
          }}
          className="[mask-image:radial-gradient(ellipse_at_center,white,transparent)] overflow-hidden"
        >
          <GridPattern />
        </div>
      </div>
    </div>
  );
}

export default HomeComponent;
