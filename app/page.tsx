"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import GridPattern from "@/components/atoms/grid-pattern";
import { PlaceholdersAndVanishInput } from "@/components/atoms/query-input";
import { Tabs, TabsContent } from "@/components/atoms/tabs";
import SceneResultCards from "@/components/organisms/scene-result-cards";
import clampBuilder from "@/utils/clamp-builder";

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
          <button
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium bg-white dark:bg-[#1D1F21] text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 rounded-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
          <div className="">Your search results here.</div>
          <SceneResultCards cards={cards} defaultLayout="grid" />
        </div>
      </TabsContent>
    </Tabs>
  );
}

const cards = [
  {
    description: "Lana Del Rey",
    title: "Summertime Sadness",
    src: "https://assets.aceternity.com/demos/lana-del-rey.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Lana Del Rey, an iconic American singer-songwriter, is celebrated for
          her melancholic and cinematic music style. Born Elizabeth Woolridge
          Grant in New York City, she has captivated audiences worldwide with
          her haunting voice and introspective lyrics. <br /> <br /> Her songs
          often explore themes of tragic romance, glamour, and melancholia,
          drawing inspiration from both contemporary and vintage pop culture.
          With a career that has seen numerous critically acclaimed albums, Lana
          Del Rey has established herself as a unique and influential figure in
          the music industry, earning a dedicated fan base and numerous
          accolades.
        </p>
      );
    },
  },
  {
    description: "Babbu Maan",
    title: "Mitran Di Chhatri",
    src: "https://assets.aceternity.com/demos/babbu-maan.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Babu Maan, a legendary Punjabi singer, is renowned for his soulful
          voice and profound lyrics that resonate deeply with his audience. Born
          in the village of Khant Maanpur in Punjab, India, he has become a
          cultural icon in the Punjabi music industry. <br /> <br /> His songs
          often reflect the struggles and triumphs of everyday life, capturing
          the essence of Punjabi culture and traditions. With a career spanning
          over two decades, Babu Maan has released numerous hit albums and
          singles that have garnered him a massive fan following both in India
          and abroad.
        </p>
      );
    },
  },

  {
    description: "Metallica",
    title: "For Whom The Bell Tolls",
    src: "https://assets.aceternity.com/demos/metallica.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Metallica, an iconic American heavy metal band, is renowned for their
          powerful sound and intense performances that resonate deeply with
          their audience. Formed in Los Angeles, California, they have become a
          cultural icon in the heavy metal music industry. <br /> <br /> Their
          songs often reflect themes of aggression, social issues, and personal
          struggles, capturing the essence of the heavy metal genre. With a
          career spanning over four decades, Metallica has released numerous hit
          albums and singles that have garnered them a massive fan following
          both in the United States and abroad.
        </p>
      );
    },
  },
  {
    description: "Led Zeppelin",
    title: "Stairway To Heaven",
    src: "https://assets.aceternity.com/demos/led-zeppelin.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Led Zeppelin, a legendary British rock band, is renowned for their
          innovative sound and profound impact on the music industry. Formed in
          London in 1968, they have become a cultural icon in the rock music
          world. <br /> <br /> Their songs often reflect a blend of blues, hard
          rock, and folk music, capturing the essence of the 1970s rock era.
          With a career spanning over a decade, Led Zeppelin has released
          numerous hit albums and singles that have garnered them a massive fan
          following both in the United Kingdom and abroad.
        </p>
      );
    },
  },
  {
    description: "Mustafa Zahid",
    title: "Toh Phir Aao",
    src: "https://assets.aceternity.com/demos/toh-phir-aao.jpeg",
    ctaText: "Play",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          &quot;Aawarapan&quot;, a Bollywood movie starring Emraan Hashmi, is
          renowned for its intense storyline and powerful performances. Directed
          by Mohit Suri, the film has become a significant work in the Indian
          film industry. <br /> <br /> The movie explores themes of love,
          redemption, and sacrifice, capturing the essence of human emotions and
          relationships. With a gripping narrative and memorable music,
          &quot;Aawarapan&quot; has garnered a massive fan following both in
          India and abroad, solidifying Emraan Hashmi&apos;s status as a
          versatile actor.
        </p>
      );
    },
  },
];
