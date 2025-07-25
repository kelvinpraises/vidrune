"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import GridPattern from "@/library/components/atoms/grid-pattern";
import { PlaceholdersAndVanishInput } from "@/library/components/atoms/query-input";
import { Tabs, TabsContent } from "@/library/components/atoms/tabs";
import { Skeleton } from "@/library/components/atoms/skeleton";
import IndexExplorerCards from "@/library/components/organisms/index-explorer-cards";
import { useSearch } from "@/library/hooks/use-search";
import clampBuilder from "@/library/utils/clamp-builder";

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const { results, isSearching, error, search } = useSearch();

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
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsContent
        className="m-0 outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        value="home"
      >
        <div className="flex flex-col items-center px-4 justify-between h-[80vh]">
          <div className="h-[25rem] flex flex-col justify-center items-center px-4 relative z-10">
            <h2 className="mb-10 sm:mb-18 text-xl text-center sm:text-2xl dark:text-white text-black">
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
          <div className="relative">
            <div
              style={{
                width: clampBuilder(350, 768, 20, 40),
                height: clampBuilder(350, 768, 20, 40),
              }}
              className="absolute left-1/2 -translate-y-[80%] -translate-x-1/2 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] -z-10 overflow-hidden"
            >
              <GridPattern />
            </div>
          </div>
          <Image
            alt="vidrune logo"
            src="/vidrune.png"
            width={312}
            height={100}
            className="relative z-10"
          />
        </div>
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
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium bg-white dark:bg-[#1D1F21] text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 rounded-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Go back
              </button>
              
              <h2 className="text-xl font-medium">
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
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg"
                  onClick={() => search(searchQuery)}
                >
                  Try Again
                </button>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-16">
                <h3 className="text-xl font-medium mb-4">No results found</h3>
                <p className="text-gray-500 mb-8">Try another search query or browse the explore section</p>
                <button
                  onClick={() => setActiveTab("home")}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium"
                >
                  Back to Search
                </button>
              </div>
            ) : (
              <IndexExplorerCards 
                metadata={results.map(result => result.metadata).filter(Boolean) as any[]} 
                defaultLayout="grid" 
              />
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
