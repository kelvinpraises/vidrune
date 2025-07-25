"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Grid2X2, List, Search } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useId, useRef, useState } from "react";

import { useOutsideClick } from "@/library/hooks/use-outside-click";

interface Card {
  description: string;
  title: string;
  src: string;
  ctaText: string;
  ctaLink: string;
  content: () => React.ReactNode;
}

interface SceneResultCardsProps {
  cards: Card[];
  defaultLayout?: "grid" | "list";
}

const SceneResultCards = ({
  cards,
  defaultLayout = "grid",
}: SceneResultCardsProps) => {
  const [active, setActive] = useState<Card | boolean | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">(defaultLayout);
  const [search, setSearch] = useState("");
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  const filteredCards = cards.filter(
    (card) =>
      card.title.toLowerCase().includes(search.toLowerCase()) ||
      card.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(false);
      }
    }

    if (active && typeof active === "object") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref as React.RefObject<HTMLDivElement>, () =>
    setActive(null)
  );

  return (
    <>
      <div className="max-w-2xl mx-auto w-full mb-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <button
              onClick={() => setLayout("grid")}
              className={`p-2 rounded ${
                layout === "grid"
                  ? "bg-black/80 dark:bg-white text-white dark:text-black"
                  : "hover:bg-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLayout("list")}
              className={`p-2 rounded ${
                layout === "list"
                  ? "bg-black/80 dark:bg-white text-white dark:text-black"
                  : "hover:bg-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {active && typeof active === "object" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 h-full w-full z-10"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {active && typeof active === "object" ? (
            <div className="fixed inset-0  grid place-items-center z-[100]">
              <motion.button
                key={`button-${active.title}-${id}`}
                layout
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                  transition: {
                    duration: 0.05,
                  },
                }}
                className="flex absolute top-2 right-2 lg:hidden items-center justify-center bg-white rounded-full h-6 w-6"
                onClick={() => setActive(null)}
              >
                <CloseIcon />
              </motion.button>
              <motion.div
                layoutId={`card-${active.title}-${id}`}
                ref={ref}
                className="w-full max-w-[500px]  h-full md:h-fit md:max-h-[90%]  flex flex-col bg-white dark:bg-gray-800 sm:rounded-3xl overflow-hidden"
              >
                <motion.div layoutId={`image-${active.title}-${id}`}>
                  <Image
                    priority
                    width={200}
                    height={200}
                    src={active.src}
                    alt={active.title}
                    className="w-full h-80 lg:h-80 sm:rounded-tr-lg sm:rounded-tl-lg object-cover object-top"
                  />
                </motion.div>

                <div>
                  <div className="flex justify-between items-start p-4">
                    <div className="">
                      <motion.h3
                        layoutId={`title-${active.title}-${id}`}
                        className="font-bold text-neutral-700 dark:text-neutral-200"
                      >
                        {active.title}
                      </motion.h3>
                      <motion.p
                        layoutId={`description-${active.description}-${id}`}
                        className="text-neutral-600 dark:text-neutral-400"
                      >
                        {active.description}
                      </motion.p>
                    </div>

                    <motion.a
                      layoutId={`button-${active.title}-${id}`}
                      href={active.ctaLink}
                      target="_blank"
                      className="px-4 py-3 text-sm rounded-full font-bold bg-green-500 text-white"
                    >
                      {active.ctaText}
                    </motion.a>
                  </div>
                  <div className="pt-4 relative px-4">
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-neutral-600 text-xs md:text-sm lg:text-base h-40 md:h-fit pb-10 flex flex-col items-start gap-4 overflow-auto dark:text-neutral-400 [mask:linear-gradient(to_bottom,white,white,transparent)] [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch]"
                    >
                      {typeof active.content === "function"
                        ? active.content()
                        : active.content}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>

        <ul
          className={`grid ${
            layout === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          } gap-4`}
        >
          {filteredCards.map((card) => (
            <motion.div
              layoutId={`card-${card.title}-${id}`}
              key={card.title}
              onClick={() => setActive(card)}
              className={`p-4 flex ${
                layout === "grid" ? "flex-col" : "flex-row items-center"
              } hover:bg-neutral-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer`}
            >
              <motion.div
                layoutId={`image-${card.title}-${id}`}
                className={layout === "grid" ? "w-full" : "w-40 flex-shrink-0"}
              >
                <Image
                  width={100}
                  height={100}
                  src={card.src}
                  alt={card.title}
                  className={`${
                    layout === "grid" ? "h-60 w-full" : "h-40 w-40"
                  } rounded-lg object-cover object-top`}
                />
              </motion.div>
              <div
                className={`flex ${
                  layout === "grid"
                    ? "justify-center items-center flex-col mt-4"
                    : "flex-col ml-4"
                }`}
              >
                <motion.h3
                  layoutId={`title-${card.title}-${id}`}
                  className="font-medium text-neutral-800 dark:text-neutral-200 text-base"
                >
                  {card.title}
                </motion.h3>
                <motion.p
                  layoutId={`description-${card.description}-${id}`}
                  className="text-neutral-600 dark:text-neutral-400 text-base"
                >
                  {card.description}
                </motion.p>
              </div>
            </motion.div>
          ))}
        </ul>
      </div>
    </>
  );
};

export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
        transition: {
          duration: 0.05,
        },
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-black"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};

export default SceneResultCards;
