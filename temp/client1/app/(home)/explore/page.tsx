"use client";

import { motion } from "framer-motion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/library/components/atoms/tabs";

import IndexExplorerCards from "@/library/components/organisms/index-explorer-cards";
import { UserIndexedVideos } from "@/library/components/organisms/user-indexed-videos";
import { useMetadata } from "@/library/hooks/use-metadata";
import { Skeleton } from "@/library/components/atoms/skeleton";

export default function Explore() {
  const { metadata, isLoading, error } = useMetadata();

  return (
    <div className="relative flex flex-col items-center px-4 gap-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="fixed inset-0 -z-10"
      >
        <div className="absolute top-0 left-[10%] w-[30rem] h-[30rem] bg-[#00ccb1]/10 rounded-full mix-blend-multiply filter blur-3xl" />
        <div className="absolute top-0 right-[10%] w-[30rem] h-[30rem] bg-[#7b61ff]/10 rounded-full mix-blend-multiply filter blur-3xl" />
        <div className="absolute bottom-0 left-[20%] w-[30rem] h-[30rem] bg-[#ffc414]/10 rounded-full mix-blend-multiply filter blur-3xl" />
        <div className="absolute bottom-0 right-[20%] w-[30rem] h-[30rem] bg-[#1ca0fb]/10 rounded-full mix-blend-multiply filter blur-3xl" />
      </motion.div>

      <div className="w-full max-w-6xl mx-auto mt-8">
        <Tabs defaultValue="explore" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="explore" className="font-mono">Explore</TabsTrigger>
            <TabsTrigger value="my-videos" className="font-mono">My Indexed Videos</TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="mt-4">
            {isLoading ? (
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
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <IndexExplorerCards metadata={metadata} defaultLayout="grid" />
            )}
          </TabsContent>

          <TabsContent value="my-videos" className="mt-4">
            <UserIndexedVideos />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
