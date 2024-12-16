"use client";

import Image from "next/image";

import GridPattern from "@/components/atoms/grid-pattern";
import { PlaceholdersAndVanishInput } from "@/components/atoms/query-input";
import clampBuilder from "@/utils/clamp-builder";

export default function Home() {
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
    console.log("submitted");
  };
  return (
    <div className="flex flex-col items-center px-4 justify-between h-[80vh]">
      <div className="h-[25rem] flex flex-col justify-center items-center px-4 relative z-10">
        <h2 className="mb-10 sm:mb-18 text-xl text-center sm:text-2xl dark:text-white text-black">
          Decentralized Video Indexing - Discover, Preview, and Purchase Clips
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
  );
}
