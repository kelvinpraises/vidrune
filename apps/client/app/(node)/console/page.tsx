"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, HelpCircle, Pause, Play, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GlobeMethods } from "react-globe.gl";
import { toast } from "sonner";

import { Card } from "@/library/components/atoms/card";
import { Progress } from "@/library/components/atoms/progress";
import { FileUpload } from "@/library/components/molecules/file-upload";
import StandbyButton from "@/library/components/molecules/standby-button";

import { UserIndexedVideos } from "@/library/components/organisms/user-indexed-videos";
import { useMetadata } from "@/library/hooks/use-metadata";
import { useVideoPipeline } from "@/library/hooks/use-video-pipeline";
import useStore from "@/library/store";

const Globe = dynamic(() => import("@/library/components/organisms/wrapped-globe"), {
  ssr: false,
});

const GLOBE_POINTS = 250;
const CRYSTAL_TYPES = ["DePIN", "Video", "Indexes", "Network"] as const;
const POINT_COLORS = ["red", "white", "blue", "green"] as const;

const ConsolePage = () => {
  const [currentView, setCurrentView] = useState<"standby" | "dashboard">("standby");
  const globeRef = useRef<GlobeMethods>(null);
  const [loaded, setLoaded] = useState(false);
  const [showComponent, setShowComponent] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [sessionRewards, setSessionRewards] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  // TODO: Replace with Internet Computer authentication
  const [icAuth] = useState({ isConnected: true, principal: "mock-principal" });

  // Video file input
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "my-videos">("upload");

  // Video pipeline hook
  const {
    videoRef,
    canvasRef,
    sceneRef,
    slicedRef,
    pipelineState,
    isProcessing,
    startPipeline,
    stopPipeline,
    generateSRTFile,
    generateMetadata,
    viseStatus,
    viseEvent,
  } = useVideoPipeline();

  const { metadata, isLoading, error } = useMetadata();
  const { completedIndexes, scenesProcessed } = useStore();
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const gData = useMemo(
    () =>
      Array.from({ length: GLOBE_POINTS }, () => ({
        lat: (Math.random() - 0.5) * 180,
        lng: (Math.random() - 0.5) * 360,
        size: Math.random() / 3,
        color: POINT_COLORS[Math.floor(Math.random() * POINT_COLORS.length)],
        crystal: CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)],
      })),
    []
  );

  useLayoutEffect(() => {
    if (globeRef.current && typeof window !== "undefined") {
      const controls = globeRef.current.controls();
      controls.autoRotate = false;
      controls.maxDistance = 320;
      controls.minDistance = 320;
      controls.enableZoom = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 2.0;
    }
  }, [loaded]);

  const handleVideoUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (file && file.type.startsWith("video/")) {
      setSelectedVideo(file);
      toast.success(`Video selected: ${file.name}`);
    } else {
      toast.error("Please select a valid video file");
    }
  }, []);

  const handleStartProcessing = useCallback(() => {
    if (!selectedVideo) {
      toast.error("Please select a video file first");
      return;
    }

    if (videoRef.current && selectedVideo) {
      const videoUrl = URL.createObjectURL(selectedVideo);
      videoRef.current.src = videoUrl;
      videoRef.current.load();

      videoRef.current.onloadeddata = () => {
        startPipeline();
        toast.success("Video processing started!");
      };
    }
  }, [selectedVideo, videoRef, startPipeline]);

  const handleStopProcessing = useCallback(() => {
    stopPipeline();
    toast.info("Video processing stopped");
  }, [stopPipeline]);

  const handleDownloadSRT = useCallback(() => {
    const srtUrl = generateSRTFile();
    const a = document.createElement("a");
    a.href = srtUrl;
    a.download = `${selectedVideo?.name || "video"}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(srtUrl);
    toast.success("SRT file downloaded!");
  }, [generateSRTFile, selectedVideo]);

  const handleSaveMetadata = useCallback(() => {
    const metadata = generateMetadata();
    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedVideo?.name || "video"}_metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Metadata saved!");
  }, [generateMetadata, selectedVideo]);

  const handleStandbyClick = async () => {
    if (!icAuth.isConnected) {
      toast.error("Please connect your identity to continue");
      return;
    }

    // Start loading animation
    setIsJoining(true);

    try {
      // Simulate joining process
      const joinPromise = new Promise((resolve) => setTimeout(resolve, 1000));
      const animationPromise = new Promise((resolve) => setTimeout(resolve, 1500));

      // Wait for both the animation and the network request to complete
      await Promise.all([joinPromise, animationPromise]);

      toast.success("Successfully joined the node pool!");

      // Proceed to dashboard view
      setCurrentView("dashboard");
      // Show globe after animation completes
      setTimeout(() => {
        setShowComponent(true);
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Ensure animation has time to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.error(`Failed to join pool: ${errorMessage}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleClaimRewards = async () => {
    toast.info("Reward claiming will be available in a future update!");
  };

  const standbyVariants = {
    enter: {
      scale: 1,
      opacity: 1,
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      transition: {
        duration: 0.4,
        ease: "easeInOut" as const,
      },
    },
  };

  const dashboardVariants = {
    enter: {
      scale: 2.5,
      opacity: 0,
      y: 500,
    },
    center: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 80,
        damping: 15,
      },
    },
    exit: {
      opacity: 0,
    },
  };

  return (
    <div className="flex flex-col justify-between items-center flex-1 overflow-hidden w-full">
      <AnimatePresence mode="wait" initial={false}>
        {currentView !== "dashboard" && (
          <motion.div
            key="setup"
            initial="enter"
            animate="enter"
            exit="exit"
            variants={standbyVariants}
            className="flex flex-col justify-start items-center gap-8 md:gap-16 w-full px-4 transform-gpu"
          >
            <div className="flex flex-col justify-center gap-2 p-0">
              <p className="font-atyp text-4xl md:text-5xl max-w-[30ch] text-balance leading-tight text-center">
                Decentralize each story. Unleash it's insights.
              </p>
              <p className="text-sm md:text-base font-medium leading-[17px] text-[#484E62] text-center">
                Join the network, earn VI tokens, and{" "}
                <Link
                  href={"/explore"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#138FA8]"
                >
                  explore
                </Link>{" "}
                indexed videos or add your own.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {currentView === "standby" && (
                <motion.div
                  key="standby"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <StandbyButton onClick={handleStandbyClick} isLoading={isJoining} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {currentView === "dashboard" && (
          <motion.div
            key="dashboard"
            initial="enter"
            animate="center"
            exit="exit"
            variants={dashboardVariants}
            className="w-full flex-1 transform-gpu"
          >
            <div className="flex justify-center flex-1 w-full px-2 md:px-4">
              <div className="flex flex-col w-full max-w-4xl">
                <div className="flex flex-col p-2 md:p-4 gap-2 md:gap-4">
                  <h1 className="font-outfit font-semibold text-lg md:text-xl">
                    Indexer Analytics
                  </h1>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="flex flex-row justify-between p-4 bg-card text-card-foreground min-w-full md:min-w-80">
                      <div className="flex flex-col gap-3 md:gap-6">
                        <div className="flex items-center gap-2">
                          <p className="font-outfit font-semibold text-sm md:text-base text-[#484E62] dark:text-[#B7BDD5]">
                            VISE Processing
                          </p>
                          <div className="group relative">
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              Video scene extraction and analysis queue
                            </div>
                          </div>
                        </div>
                        <p className="text-3xl md:text-4xl font-outfit font-bold">
                          {pipelineState.viseBin.length}
                        </p>
                      </div>
                    </Card>

                    <Card className="flex flex-row justify-between p-4 bg-card text-card-foreground min-w-full md:min-w-80">
                      <div className="flex flex-col gap-3 md:gap-6">
                        <div className="flex items-center gap-2">
                          <p className="font-outfit font-semibold text-sm md:text-base text-[#484E62] dark:text-[#B7BDD5]">
                            Florence2 Queue
                          </p>
                          <div className="group relative">
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              AI vision model generating scene captions
                            </div>
                          </div>
                        </div>
                        <p className="text-3xl md:text-4xl font-outfit font-bold">
                          {pipelineState.florence2Bin.length}
                        </p>
                      </div>
                    </Card>

                    <Card className="flex flex-row justify-between p-4 bg-card text-card-foreground min-w-full md:min-w-80">
                      <div className="flex flex-col gap-3 md:gap-6">
                        <div className="flex items-center gap-2">
                          <p className="font-outfit font-semibold text-sm md:text-base text-[#484E62] dark:text-[#B7BDD5]">
                            Kokoro Processing
                          </p>
                          <div className="group relative">
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              Audio synthesis from generated captions
                            </div>
                          </div>
                        </div>
                        <p className="text-3xl md:text-4xl font-outfit font-bold">
                          {pipelineState.kokoroBin.length}
                        </p>
                      </div>
                    </Card>

                    <Card className="flex flex-wrap justify-between p-4 bg-card text-card-foreground gap-2">
                      <div className="flex flex-col gap-3 md:gap-6">
                        <div className="flex items-center gap-2">
                          <p className="font-outfit font-semibold text-sm md:text-base text-[#484E62] dark:text-[#B7BDD5]">
                            Points Earned
                          </p>
                          <div className="group relative">
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              Points earned from successful video uploads (2 VI tokens each)
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-3xl md:text-4xl font-outfit font-bold text-[#34C759]">
                            {completedIndexes}
                          </p>
                          <p className="text-xs text-muted-foreground text-end">
                            {scenesProcessed} scenes processed
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="flex flex-col p-2 md:p-4 gap-2 md:gap-4">
                  <h1 className="font-outfit font-semibold text-lg md:text-xl">
                    Video Processing
                  </h1>

                  <Card className="p-6 relative overflow-hidden">
                    {/* Tab Navigation using same style as existing tabs */}
                    <div className="grid w-full grid-cols-2 mb-8 bg-muted p-1 rounded-lg">
                      <button
                        onClick={() => setActiveTab("upload")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          activeTab === "upload"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Upload Video
                      </button>
                      <button
                        onClick={() => setActiveTab("my-videos")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          activeTab === "my-videos"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        My Videos
                      </button>
                    </div>

                    {/* Upload Tab Content */}
                    <div className={activeTab === "upload" ? "block" : "hidden"}>
                      <div className="space-y-12">
                        <div className="w-full max-w-4xl mx-auto border border-dashed bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-lg">
                          <FileUpload onChange={handleVideoUpload} />
                        </div>

                        {/* Processing Controls */}
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={handleStartProcessing}
                              disabled={!selectedVideo || isProcessing}
                              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                              <Play className="h-4 w-4" />
                              Start Processing
                            </button>

                            <button
                              onClick={handleStopProcessing}
                              disabled={!isProcessing}
                              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                              <Pause className="h-4 w-4" />
                              Stop Processing
                            </button>

                            <button
                              onClick={() => window.location.reload()}
                              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reset
                            </button>
                          </div>
                        </div>

                        {/* Processing Progress */}
                        {isProcessing && (
                          <div className="space-y-4 border-t pt-6">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Processing Progress</span>
                                <span>{pipelineState.progress.toFixed(1)}%</span>
                              </div>
                              <Progress value={pipelineState.progress} className="h-2" />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>
                                Current Stage:{" "}
                                <span className="capitalize font-medium">
                                  {pipelineState.currentStage}
                                </span>
                              </p>
                              <p>
                                VISE Status:{" "}
                                <span className="capitalize">{viseStatus}</span>
                              </p>
                              {viseEvent && (
                                <p>
                                  Last Event:{" "}
                                  <span className="capitalize">{viseEvent}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Download Options */}
                        {pipelineState.completed.length > 0 && (
                          <div className="space-y-4 border-t pt-6">
                            <div className="flex items-center gap-2">
                              <h3 className="font-outfit font-semibold text-base text-[#484E62] dark:text-[#B7BDD5]">
                                Download Results
                              </h3>
                              <div className="group relative">
                                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                  Download SRT captions and metadata JSON files
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={handleDownloadSRT}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                              >
                                <Download className="h-4 w-4" />
                                Download SRT
                              </button>
                              <button
                                onClick={handleSaveMetadata}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                              >
                                <Download className="h-4 w-4" />
                                Save Metadata
                              </button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {pipelineState.completed.length} scenes processed and ready
                              for download
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* My Videos Tab Content */}
                    <div className={activeTab === "my-videos" ? "block" : "hidden"}>
                      <UserIndexedVideos />
                    </div>
                  </Card>
                </div>

                {/* Hidden video and canvas elements for processing - always present to preserve state */}
                <div className="hidden">
                  <video ref={videoRef} />
                  <canvas ref={canvasRef} />
                  <div ref={sceneRef} />
                  <div ref={slicedRef} />
                </div>
                <AnimatePresence>
                  {showComponent && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-center overflow-hidden mb-4 h-[275px]"
                    >
                      <div className="-mt-4">
                        <Globe
                          onGlobeReady={() => setLoaded(true)}
                          globeRef={globeRef}
                          width={600}
                          height={500}
                          globeImageUrl={
                            currentTheme == "dark" ? "/earth-night.jpg" : "/earth-day.jpeg"
                          }
                          backgroundColor="rgba(0, 0, 0, 0)"
                          atmosphereColor="rgba(0, 234, 255, 0.665)"
                          atmosphereAltitude={0.3}
                          pointsData={gData}
                          arcsData={gData}
                          pointAltitude="size"
                          pointColor="color"
                          pointLabel="crystal"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="font-outfit p-4 text-sm text-center">
        Vidrune powered by VISE x Florence2 x KokoroTTS x Transformer.js
      </p>
    </div>
  );
};

export default ConsolePage;
