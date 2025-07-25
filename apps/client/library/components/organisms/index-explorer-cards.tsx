"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Grid2X2, List, Play, Search, X } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useId, useRef, useState } from "react";

import { useOutsideClick } from "@/library/hooks/use-outside-click";
import { MetadataTable } from "../../db/config";

import { icStorage } from "@/library/services/ic-storage";

// Helper to get IC storage URL
const getICStorageUrl = (cid: string): string => {
  return icStorage.getVideoUrl(`/videos/${cid}`);
};

interface IndexExplorerCardsProps {
  metadata: MetadataTable[];
  defaultLayout?: "grid" | "list";
}

const IndexExplorerCards = ({
  metadata,
  defaultLayout = "grid",
}: IndexExplorerCardsProps) => {
  const [active, setActive] = useState<MetadataTable | boolean | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">(defaultLayout);
  const [search, setSearch] = useState("");
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  const filteredMetadata = metadata.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.summary.toLowerCase().includes(search.toLowerCase())
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
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      setIsPlayingVideo(false); // Reset video state when modal closes
    };
  }, [active]);

  useOutsideClick(ref as React.RefObject<HTMLDivElement>, (event: MouseEvent) => {
    // If the image preview is open, don't close the main modal
    if (selectedImageIndex !== null) {
      // Check if the click is on the image preview backdrop or within its content
      const target = event.target as HTMLElement;
      const isImagePreviewClick = target.closest(".image-preview-container") !== null;

      if (isImagePreviewClick) {
        return;
      }
    }

    setActive(null);
    setIsPlayingVideo(false);
  });

  const handlePlayVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayingVideo(true);
  };

  const handleThumbnailClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setSelectedImageIndex(idx);
  };

  const handleCloseImagePreview = (e: React.MouseEvent) => {
    // Ensure the event doesn't propagate and trigger other click handlers
    e.preventDefault();
    e.stopPropagation();

    // Only close the image preview, not the main modal
    setSelectedImageIndex(null);
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search indexed content..."
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
          <div
            className="fixed inset-0 grid place-items-center z-[100]"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              key={`button-${active.id}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.05 },
              }}
              className="flex absolute top-2 right-2 lg:hidden items-center justify-center bg-white rounded-full h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setActive(null);
                setIsPlayingVideo(false);
              }}
            >
              <X className="h-4 w-4" />
            </motion.button>
            <motion.div
              layoutId={`card-${active.id}-${id}`}
              ref={ref}
              className="w-full max-w-[500px] h-full md:h-[90vh] flex flex-col bg-white dark:bg-gray-800 sm:rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div layoutId={`image-${active.id}-${id}`}>
                {isPlayingVideo ? (
                  <div className="relative w-full aspect-video bg-black">
                    <video
                      src={getICStorageUrl(active.id)}
                      controls
                      autoPlay
                      className="absolute inset-0 w-full h-full sm:rounded-tr-lg sm:rounded-tl-lg object-contain"
                    />
                  </div>
                ) : (
                  <div className="relative group aspect-video bg-black">
                    <Image
                      priority
                      width={500}
                      height={300}
                      src={getICStorageUrl(active.cover)}
                      alt={active.title}
                      className="w-full h-full sm:rounded-tr-lg sm:rounded-tl-lg object-contain"
                    />
                    <button
                      onClick={handlePlayVideo}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    </button>
                  </div>
                )}
              </motion.div>

              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex justify-between items-start p-4">
                  <div className="space-y-1">
                    <motion.h3
                      layoutId={`title-${active.id}-${id}`}
                      className="font-bold text-neutral-700 dark:text-neutral-200"
                    >
                      {active.title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${active.id}-${id}`}
                      className="text-neutral-600 dark:text-neutral-400 line-clamp-2"
                    >
                      {active.description}
                    </motion.p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-500">
                      Uploaded by: {active.uploadedBy.substring(0, 6)}...
                      {active.uploadedBy.substring(active.uploadedBy.length - 4)}
                    </p>
                  </div>

                  <button
                    onClick={handlePlayVideo}
                    className="px-4 py-3 text-sm rounded-full font-bold bg-green-500 text-white"
                  >
                    Play
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-neutral-600 text-xs md:text-sm lg:text-base flex flex-col items-start gap-4 dark:text-neutral-400"
                  >
                    <div>
                      <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                        Summary
                      </h4>
                      <p>{active.summary}</p>
                    </div>

                    {active.scenes && active.scenes.length > 0 && (
                      <div className="w-full">
                        <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                          Scenes
                        </h4>

                        {/* Scene Thumbnails Gallery */}
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                            Captured Frames
                          </h5>
                          <div className="overflow-x-auto pb-2">
                            <div className="flex space-x-2">
                              {active.scenes.map((scene, idx) => (
                                <div
                                  key={`thumb-${idx}`}
                                  className="flex-shrink-0 relative group cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleThumbnailClick(e, idx);
                                  }}
                                >
                                  <Image
                                    width={120}
                                    height={80}
                                    src={
                                      active.capturedImages &&
                                      idx < active.capturedImages.length
                                        ? getICStorageUrl(active.capturedImages[idx])
                                        : getICStorageUrl(active.cover)
                                    }
                                    alt={`Scene ${idx + 1}`}
                                    className="h-20 w-32 rounded-md object-cover border border-gray-200 dark:border-gray-700"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                    <span className="text-white text-xs font-medium">
                                      Scene {idx + 1}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {active.scenes.map((scene, idx) => (
                          <div
                            key={idx}
                            className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700"
                          >
                            <p className="mb-2 line-clamp-3">{scene.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {scene.keywords.map((keyword, kidx) => (
                                <span
                                  key={kidx}
                                  className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {active && typeof active === "object" && selectedImageIndex !== null && (
          <div
            className="fixed inset-0 z-[200] grid place-items-center bg-black/80 image-preview-container"
            onClick={(e) => {
              // Prevent any propagation to parent elements or document
              e.preventDefault();
              e.stopPropagation();
              handleCloseImagePreview(e);
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent mousedown from triggering useOutsideClick
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative w-[90vw] h-[80vh] max-w-4xl overflow-hidden image-preview-content"
              onClick={(e) => e.stopPropagation()} // Prevent clicks on the content from closing
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseImagePreview(e);
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors z-20"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-full h-full bg-black flex items-center justify-center">
                <Image
                  width={800}
                  height={600}
                  src={
                    active.capturedImages &&
                    selectedImageIndex < active.capturedImages.length
                      ? getICStorageUrl(active.capturedImages[selectedImageIndex])
                      : getICStorageUrl(active.cover)
                  }
                  alt={
                    selectedImageIndex !== null
                      ? `Scene ${selectedImageIndex + 1}`
                      : "Preview"
                  }
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="line-clamp-2">
                  <p className="text-white text-sm">
                    {selectedImageIndex !== null &&
                    active.scenes &&
                    active.scenes[selectedImageIndex]
                      ? `Scene ${selectedImageIndex + 1}: ${
                          active.scenes[selectedImageIndex].description
                        }`
                      : "No description available"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ul
        className={`grid ${
          layout === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        } gap-4`}
      >
        {filteredMetadata.map((item) => (
          <motion.div
            layoutId={`card-${item.id}-${id}`}
            key={item.id}
            onClick={() => setActive(item)}
            className={`p-4 flex ${
              layout === "grid" ? "flex-col" : "flex-row items-center"
            } hover:bg-neutral-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer`}
          >
            <motion.div
              layoutId={`image-${item.id}-${id}`}
              className={layout === "grid" ? "w-full" : "w-40 flex-shrink-0"}
            >
              <Image
                width={layout === "grid" ? 400 : 160}
                height={layout === "grid" ? 240 : 160}
                src={getICStorageUrl(item.cover)}
                alt={item.title}
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
                layoutId={`title-${item.id}-${id}`}
                className="font-medium text-neutral-800 dark:text-neutral-200 text-base"
              >
                {item.title}
              </motion.h3>
              <motion.p
                layoutId={`description-${item.id}-${id}`}
                className="text-neutral-600 dark:text-neutral-400 text-base line-clamp-2"
              >
                {item.description}
              </motion.p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                {item.scenes?.length || 0} scenes • {formatDate(item.createAt)}
              </p>
            </div>
          </motion.div>
        ))}
      </ul>
    </div>
  );
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString();
};

const CloseIcon = () => {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: { duration: 0.05 },
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

export default IndexExplorerCards;
