"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";

import GridPattern from "@/components/atoms/grid-pattern";
import { PlaceholdersAndVanishInput } from "@/components/atoms/query-input";
import { Tabs, TabsContent } from "@/components/atoms/tabs";
import clampBuilder from "@/utils/clamp-builder";
import { useState } from "react";
import { motion } from "framer-motion";
import { ExpandableCard } from "@/components/organisms/expandable-cards";

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");

  const placeholders = [
    "Find videos containing people eating",
    "Search for outdoor scenes with cars",
    "Show me clips with animals in nature",
    "Find videos of people dancing",
    "Search for scenes with water activities",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveTab("result");
    console.log("submitted");
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
              Decentralized Video Indexing - Discover, Preview, and Purchase
              Clips
            </h2>
            <div style={{ width: clampBuilder(350, 768, 20, 40) }}>
              <PlaceholdersAndVanishInput
                placeholders={placeholders}
                onChange={handleChange}
                onSubmit={onSubmit}
                value={""}
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
        <div className="relative flex flex-col items-center px-4 h-[80vh] gap-4">
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
          <button
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium bg-white dark:bg-[#1D1F21] text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 rounded-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
          <div className="">Your search results here.</div>
          <ExpandableCard
            cards={cards}
            defaultLayout="grid" // or "list"
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

