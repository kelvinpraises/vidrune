import { Link, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Download, HelpCircle, Pause, Play, RotateCcw, X } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GlobeMethods } from "react-globe.gl";
import { toast } from "sonner";

import { useAccount } from "wagmi";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";
import { Card } from "@/components/atoms/card";
import { Progress } from "@/components/atoms/progress";
import { ConnectButton } from "@/components/molecules/connect-button";
import { FileUpload } from "@/components/molecules/file-upload";
import StandbyButton from "@/components/molecules/standby-button";
import { useMiniPay } from "@/hooks/use-minipay";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useEffect } from "react";
import { ThemeSwitcher } from "@/components/molecules/theme-switcher";
import { UserIndexedVideos } from "@/components/organisms/user-indexed-videos";
import { useVideoPipeline } from "@/hooks/use-video-pipeline";
import { useSubmitVideoIndex, useGetUserPoints } from "@/services/contracts";
import { useTheme } from "@/providers/theme";
import useStore from "@/store";

const Globe = lazy(() => import("@/components/organisms/wrapped-globe"));

const GLOBE_POINTS = 250;
const CRYSTAL_TYPES = ["DePIN", "Video", "Indexes", "Network"] as const;
const POINT_COLORS = ["red", "white", "blue", "green"] as const;

function ConsoleComponent() {
  const [currentView, setCurrentView] = useState<"standby" | "dashboard">("standby");
  const globeRef = useRef<GlobeMethods>(null);
  const [loaded, setLoaded] = useState(false);
  const [showComponent, setShowComponent] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Wagmi authentication
  const { address, isConnected } = useAccount();
  const { isInMiniPay } = useMiniPay();
  const { connect } = useConnect();

  // Auto-connect when inside MiniPay
  useEffect(() => {
    if (isInMiniPay && !isConnected) {
      connect({ connector: injected({ target: "metaMask" }) });
    }
  }, [isInMiniPay, isConnected, connect]);

  // Video file input
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "my-videos">("upload");

  // Test mode detection - check if ?test exists in URL
  const location = useLocation();
  const isTestMode = location.search.test;
  const [videoMetadata, setVideoMetadata] = useState({
    title: "",
    description: "",
  });

  const {
    videoRef,
    canvasRef,
    sceneRef,
    slicedRef,
    pipelineState,
    isProcessing,
    startPipeline,
    stopPipeline,
    resetPipeline,
    generateSRTFile,
    generateMetadata,
    viseStatus,
    viseEvent,
  } = useVideoPipeline();

  // Model loading progress display states
  const [showFlorence2Progress, setShowFlorence2Progress] = useState(false);
  const [showKokoroProgress, setShowKokoroProgress] = useState(false);

  // Image preview modal state
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(true);

  const { addUserVideo } = useStore();
  const { resolvedTheme } = useTheme();
  const { submitVideoIndex } = useSubmitVideoIndex();
  
  // Get user points from blockchain
  const { data: userPoints } = useGetUserPoints(address ?? null);

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

  useEffect(() => {
    if (isTestMode) {
      console.log("🧪 Test mode activated - video processing will run locally");
    }

    // Check screen orientation for image modal sizing
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
    };
  }, [isTestMode]);

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

  const handleVideoUpload = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file && file.type.startsWith("video/")) {
        // Reset pipeline state before loading new video
        resetPipeline();

        setSelectedVideo(file);

        // Reset metadata for new video
        setVideoMetadata({
          title: file.name.replace(/\.[^/.]+$/, ""), // Auto-populate with filename
          description: "",
        });

        // ALWAYS load video for preview regardless of mode
        if (videoRef.current) {
          const videoUrl = URL.createObjectURL(file);
          videoRef.current.src = videoUrl;
          videoRef.current.load();
          console.log("Video loaded for preview:", file.name);
        }

        toast.success(`Video selected: ${file.name}`);
      } else {
        toast.error("Please select a valid video file");
      }
    },
    [resetPipeline, videoRef]
  );

  // Unused - keeping for potential future use
  // const handleStartProcessing = useCallback(() => {
  //   if (!selectedVideo) {
  //     toast.error("Please select a video file first");
  //     return;
  //   }

  //   if (videoRef.current && selectedVideo) {
  //     const videoUrl = URL.createObjectURL(selectedVideo);
  //     videoRef.current.src = videoUrl;
  //     videoRef.current.load();

  //     videoRef.current.onloadeddata = () => {
  //       startPipeline();
  //       toast.success("Video processing started!");
  //     };
  //   }
  // }, [selectedVideo, videoRef, startPipeline]);

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

  // Unused for now - will be used when we add metadata export feature
  // const handleSaveMetadata = useCallback(() => {
  //   const metadata = generateMetadata();
  //   const blob = new Blob([JSON.stringify(metadata, null, 2)], {
  //     type: "application/json",
  //   });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = `${selectedVideo?.name || "video"}_metadata.json`;
  //   document.body.appendChild(a);
  //   a.click();
  //   document.body.removeChild(a);
  //   URL.revokeObjectURL(url);
  //   toast.success("Metadata saved!");
  // }, [generateMetadata, selectedVideo]);

  const handleIndexVideo = useCallback(async () => {
    if (!selectedVideo) {
      toast.error("No video selected");
      return;
    }

    if (!videoMetadata.title || !videoMetadata.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    const processedScenes = pipelineState.allScenes.filter((s) => s.processed);
    if (processedScenes.length === 0) {
      toast.error("Please process the video first");
      return;
    }

    try {
      toast.info("Creating video index package...");

      // Generate SRT content
      const srtUrl = generateSRTFile();
      const srtResponse = await fetch(srtUrl);
      const srtContent = await srtResponse.text();
      URL.revokeObjectURL(srtUrl);

      // Generate metadata
      const metadata = generateMetadata();
      const enrichedMetadata = {
        ...metadata,
        title: videoMetadata.title,
        description: videoMetadata.description,
        uploadedBy: address || "anonymous",
        uploadTime: Date.now(),
      };

      // Merge all audio files
      const audioScenes = processedScenes.filter((s) => s.audioUrl);
      if (audioScenes.length === 0) {
        toast.error("No audio files generated. Please complete the pipeline.");
        return;
      }

      // Create ZIP package
      toast.info("Creating ZIP package...");
      const { createVideoIndexZip } = await import("@/services/create-zip");
      const sceneImages = processedScenes
        .filter((s) => s.imageUrl)
        .map((scene, index) => ({
          imageUrl: scene.imageUrl,
          index,
        }));
      const audioFiles = processedScenes
        .filter((s) => s.audioUrl)
        .map((scene, index) => ({
          audioUrl: scene.audioUrl!,
          index,
        }));
      const zipBlob = await createVideoIndexZip(
        selectedVideo,
        srtContent,
        JSON.stringify(enrichedMetadata, null, 2),
        sceneImages,
        audioFiles
      );

      // Check 10 MiB limit
      if (zipBlob.size > 10 * 1024 * 1024) {
        toast.error(
          `ZIP package size (${(zipBlob.size / 1024 / 1024).toFixed(
            2
          )} MB) exceeds 10 MB limit. Please use a shorter video.`
        );
        return;
      }

      toast.info(
        `Uploading ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB ZIP to storage...`
      );

      // Upload ZIP to backend storage
      const { uploadBlob } = await import("@/services/storage");
      const zipFile = new File([zipBlob], "video-index.zip", { type: "application/zip" });
      const uploadResult = await uploadBlob(zipFile, "video-index.zip");

      if (!uploadResult.success || !uploadResult.blobId) {
        toast.error(`Upload failed: ${uploadResult.error || "Unknown error"}`);
        return;
      }

      const blobId = uploadResult.blobId;

      // 1. Submit to blockchain first
      toast.info("Registering video on blockchain...");
      await submitVideoIndex(blobId, blobId);
      console.log('Video registered on blockchain');

      // 2. Index in backend (MeiliSearch + SDS events)
      toast.info("Indexing video for search...");
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const registerResponse = await fetch(`${backendUrl}/api/video/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: blobId,
          walrusBlobId: blobId,
          metadata: enrichedMetadata
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.message || 'Video registration failed');
      }

      const registerData = await registerResponse.json();
      console.log('Video indexed:', registerData);

      // Save to local store for "My Videos" tab
      addUserVideo({
        blobId,
        title: videoMetadata.title,
        description: videoMetadata.description,
        uploadedAt: Date.now(),
        fileSize: selectedVideo.size,
        scenesCount: processedScenes.length,
        status: "indexed",
      });

      toast.success(`Video package uploaded and indexed! Blob ID: ${blobId}`);
      console.log("Video Blob ID:", blobId);
      console.log("Access URL:", uploadResult.url);
    } catch (error) {
      console.error("Index upload error:", error);
      toast.error(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, [
    selectedVideo,
    videoMetadata,
    pipelineState.allScenes,
    generateSRTFile,
    generateMetadata,
    address,
    submitVideoIndex,
    addUserVideo,
  ]);

  const handleVideoProcessing = useCallback(async () => {
    if (!selectedVideo) {
      toast.error("Please select a video file first");
      return;
    }

    if (!videoMetadata.title || !videoMetadata.description) {
      toast.error("Please fill in all required fields (title and description)");
      return;
    }

    // ALWAYS use video pipeline - no token-gated nonsense
    if (videoRef.current && selectedVideo) {
      const videoUrl = URL.createObjectURL(selectedVideo);
      videoRef.current.src = videoUrl;
      videoRef.current.load();

      const handleVideoReady = () => {
        // Ensure video has dimensions before starting pipeline
        if (
          videoRef.current &&
          videoRef.current.videoWidth > 0 &&
          videoRef.current.videoHeight > 0
        ) {
          console.log(
            `Video ready: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`
          );
          startPipeline();
          toast.success("Video processing started!");
        } else {
          console.warn("Video loaded but dimensions not available");
          toast.error("Video failed to load properly");
        }
        videoRef.current?.removeEventListener("loadedmetadata", handleVideoReady);
      };

      videoRef.current.addEventListener("loadedmetadata", handleVideoReady);

      // Fallback for loadeddata if metadata already loaded
      videoRef.current.onloadeddata = () => {
        if (
          videoRef.current &&
          videoRef.current.videoWidth > 0 &&
          videoRef.current.videoHeight > 0
        ) {
          console.log(
            `Video data ready: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`
          );
          startPipeline();
          toast.success("Video processing started!");
        }
      };
    }
  }, [selectedVideo, videoMetadata, videoRef, startPipeline]);

  const handleStandbyClick = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet to continue");
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

  // Unused - keeping for potential future use
  // const handleClaimRewards = async () => {
  //   toast.info("Reward claiming will be available in a future update!");
  // };

  const handleImageClick = useCallback((imageUrl: string, index: number) => {
    setSelectedImageUrl(imageUrl);
    setSelectedImageIndex(index);
  }, []);

  const handleCloseImagePreview = useCallback(() => {
    setSelectedImageUrl(null);
    setSelectedImageIndex(null);
  }, []);

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
    <div className="relative flex w-full flex-col items-center gap-8 h-screen bg-dot-pattern overflow-scroll">
      <div className="fixed pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      <div className="relative z-10 flex flex-col items-center gap-8 flex-1 w-full">
        {/* Header */}
        <header className="flex items-center p-4 gap-4 w-full">
          <Link to="/">
            <img
              alt="vidrune logo"
              src="/logo-light.png"
              width={40}
              height={40}
              className="relative z-10 dark:hidden"
            />
            <img
              alt="vidrune logo"
              src="/logo-dark.png"
              width={40}
              height={40}
              className="relative z-10 hidden dark:block"
            />
          </Link>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitcher />
            <ConnectButton />
          </div>
        </header>

        {/* Main Content */}
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
                    Join the network, earn ROHR tokens, and{" "}
                    <Link to={"/datasets"} className="text-[#138FA8]">
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
                        <Card className="p-4 bg-card text-card-foreground min-w-full md:min-w-80">
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
                              {pipelineState.currentStage === "capturing"
                                ? pipelineState.allScenes.length
                                : 0}
                            </p>
                          </div>
                        </Card>

                        <Card className="p-4 bg-card text-card-foreground min-w-full md:min-w-80">
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
                              {pipelineState.currentStage === "captioning"
                                ? pipelineState.allScenes.filter((s) => !s.caption).length
                                : 0}
                            </p>
                          </div>
                        </Card>

                        <Card className="p-4 bg-card text-card-foreground min-w-full md:min-w-80">
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
                              {pipelineState.currentStage === "generating-audio"
                                ? pipelineState.allScenes.filter(
                                    (s) => s.caption && !s.audioUrl
                                  ).length
                                : 0}
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
                                  Points earned from indexing videos on the network
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <p className="text-3xl md:text-4xl font-outfit font-bold text-[#34C759]">
                                {userPoints !== undefined ? Number(userPoints) : 0}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </div>

                      {/* Live Tracker - Placeholder for future real-time updates */}
                      {/* TODO: Implement live tracker with alternative real-time solution */}

                      {/* Model Status Cards with Progress */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <Card className="p-4 bg-card text-card-foreground">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="font-outfit font-semibold text-sm text-[#484E62] dark:text-[#B7BDD5]">
                                  Florence2 Model
                                </p>
                                <div className="group relative">
                                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                    AI vision model for generating scene captions
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    pipelineState.modelsLoaded.florence2
                                      ? "bg-green-500"
                                      : "bg-yellow-500"
                                  }`}
                                />
                                <p className="text-sm font-medium">
                                  {pipelineState.modelsLoaded.florence2
                                    ? pipelineState.currentStage === "captioning"
                                      ? "In Use"
                                      : "Ready"
                                    : "Loading..."}
                                </p>
                              </div>
                            </div>

                            {!pipelineState.modelsLoaded.florence2 && (
                              <Accordion type="single" collapsible>
                                <AccordionItem value="progress" className="border-0">
                                  <AccordionTrigger
                                    className="py-2 text-xs"
                                    onClick={() =>
                                      setShowFlorence2Progress(!showFlorence2Progress)
                                    }
                                  >
                                    {showFlorence2Progress ? "Hide" : "Show"} Download
                                    Progress
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-2">
                                    <div className="space-y-2">
                                      {pipelineState.modelProgress.florence2.total &&
                                        pipelineState.modelProgress.florence2.total > 0 && (
                                          <div>
                                            <div className="flex justify-between text-xs mb-1">
                                              <span>
                                                {pipelineState.modelProgress.florence2
                                                  .file || "Downloading..."}
                                              </span>
                                              <span>
                                                {Math.round(
                                                  ((pipelineState.modelProgress.florence2
                                                    .progress || 0) /
                                                    pipelineState.modelProgress.florence2
                                                      .total) *
                                                    100
                                                )}
                                                %
                                              </span>
                                            </div>
                                            <Progress
                                              value={
                                                ((pipelineState.modelProgress.florence2
                                                  .progress || 0) /
                                                  pipelineState.modelProgress.florence2
                                                    .total) *
                                                100
                                              }
                                              className="h-1"
                                            />
                                          </div>
                                        )}
                                      <div className="text-xs text-muted-foreground">
                                        Status:{" "}
                                        {pipelineState.modelProgress.florence2.status ||
                                          "Initializing..."}
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            )}
                          </div>
                        </Card>

                        <Card className="p-4 bg-card text-card-foreground">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="font-outfit font-semibold text-sm text-[#484E62] dark:text-[#B7BDD5]">
                                  Kokoro TTS Model
                                </p>
                                <div className="group relative">
                                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                    Text-to-speech synthesis for audio generation
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    pipelineState.modelsLoaded.kokoro
                                      ? "bg-green-500"
                                      : "bg-yellow-500"
                                  }`}
                                />
                                <p className="text-sm font-medium">
                                  {pipelineState.modelsLoaded.kokoro
                                    ? pipelineState.currentStage === "generating-audio"
                                      ? "In Use"
                                      : "Ready"
                                    : "Loading..."}
                                </p>
                              </div>
                            </div>

                            {!pipelineState.modelsLoaded.kokoro && (
                              <Accordion type="single" collapsible>
                                <AccordionItem value="progress" className="border-0">
                                  <AccordionTrigger
                                    className="py-2 text-xs"
                                    onClick={() =>
                                      setShowKokoroProgress(!showKokoroProgress)
                                    }
                                  >
                                    {showKokoroProgress ? "Hide" : "Show"} Download Progress
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-2">
                                    <div className="space-y-2">
                                      {pipelineState.modelProgress.kokoro.total &&
                                        pipelineState.modelProgress.kokoro.total > 0 && (
                                          <div>
                                            <div className="flex justify-between text-xs mb-1">
                                              <span>Downloading model...</span>
                                              <span>
                                                {Math.round(
                                                  ((pipelineState.modelProgress.kokoro
                                                    .progress || 0) /
                                                    pipelineState.modelProgress.kokoro
                                                      .total) *
                                                    100
                                                )}
                                                %
                                              </span>
                                            </div>
                                            <Progress
                                              value={
                                                ((pipelineState.modelProgress.kokoro
                                                  .progress || 0) /
                                                  pipelineState.modelProgress.kokoro
                                                    .total) *
                                                100
                                              }
                                              className="h-1"
                                            />
                                          </div>
                                        )}
                                      <div className="text-xs text-muted-foreground">
                                        Status:{" "}
                                        {pipelineState.modelProgress.kokoro.status ||
                                          "Initializing..."}
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>

                    <div className="flex flex-col p-2 md:p-4 gap-2 md:gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h1 className="font-outfit font-semibold text-lg md:text-xl">
                            Video Indexer
                          </h1>
                          {isTestMode && (
                            <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-xs font-medium">
                              🧪 TEST
                            </div>
                          )}
                        </div>
                        {!isTestMode && (
                          <div className="text-sm text-muted-foreground">
                            💡 Add{" "}
                            <Link
                              to="/console"
                              search={{ test: true }}
                              className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-block font-mono text-sm group relative"
                            >
                              ?test=true
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Click to enable test mode
                              </span>
                            </Link>{" "}
                            to URL for detailed mode
                          </div>
                        )}
                      </div>

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

                            {/* Video Metadata Form */}
                            {selectedVideo && (
                              <div className="p-6 bg-card text-card-foreground border-dashed border border-neutral-200 dark:border-neutral-800 transition-colors rounded-lg">
                                <div className="space-y-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                      🎬
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="font-outfit font-semibold text-lg text-foreground flex items-center gap-2">
                                        Video Information
                                        {isTestMode && (
                                          <span className="text-red-500 text-sm">*</span>
                                        )}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        Add title and description for your video content
                                      </p>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-outfit font-medium text-foreground flex items-center gap-1">
                                        Title
                                        {isTestMode && (
                                          <span className="text-red-500">*</span>
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        value={videoMetadata.title}
                                        onChange={(e) =>
                                          setVideoMetadata((prev) => ({
                                            ...prev,
                                            title: e.target.value,
                                          }))
                                        }
                                        placeholder="Enter a descriptive title for your video..."
                                        className="w-full px-4 py-3 border-2 border-border/50 rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:border-solid transition-all"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-sm font-outfit font-medium text-foreground flex items-center gap-1">
                                        Description
                                        <span className="text-red-500">*</span>
                                      </label>
                                      <textarea
                                        value={videoMetadata.description}
                                        onChange={(e) =>
                                          setVideoMetadata((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                          }))
                                        }
                                        placeholder="Provide a detailed description of the video content (required)..."
                                        rows={4}
                                        required
                                        className="w-full px-4 py-3 border-2 border-border/50 rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:border-solid transition-all resize-none"
                                      />
                                    </div>

                                    {/* Video File Info */}
                                    <div className="pt-4 border-t border-dashed border-border/60">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="p-3 rounded-lg border border-border/40 bg-muted/30">
                                          <span className="text-muted-foreground">
                                            File Size:
                                          </span>
                                          <span className="ml-2 font-medium text-foreground">
                                            {(selectedVideo.size / 1024 / 1024).toFixed(1)}{" "}
                                            MB
                                          </span>
                                        </div>
                                        <div className="p-3 rounded-lg border border-border/40 bg-muted/30">
                                          <span className="text-muted-foreground">
                                            File Type:
                                          </span>
                                          <span className="ml-2 font-medium text-foreground">
                                            {selectedVideo.type}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Processing Controls */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <button
                                  onClick={handleVideoProcessing}
                                  disabled={!selectedVideo || isProcessing}
                                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                >
                                  <Play className="h-4 w-4" />
                                  {isProcessing ? "Indexing..." : "Start"}
                                </button>

                                <button
                                  onClick={handleStopProcessing}
                                  disabled={!isProcessing}
                                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                >
                                  <Pause className="h-4 w-4" />
                                  Stop
                                </button>

                                <button
                                  onClick={() => {
                                    // Clean up video source and blob URLs
                                    if (videoRef.current?.src) {
                                      if (videoRef.current.src.startsWith("blob:")) {
                                        URL.revokeObjectURL(videoRef.current.src);
                                      }
                                      videoRef.current.src = "";
                                      videoRef.current.load();
                                    }

                                    // Clean up all state
                                    setSelectedVideo(null);
                                    setVideoMetadata({ title: "", description: "" });
                                    resetPipeline();
                                  }}
                                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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
                                    <span>{pipelineState.progress.stage}</span>
                                    <span>{pipelineState.progress.percentage}%</span>
                                  </div>
                                  <Progress
                                    value={pipelineState.progress.percentage}
                                    className="h-2"
                                  />
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {pipelineState.progress.current} /{" "}
                                    {pipelineState.progress.total}
                                  </div>
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

                            {/* Index Video - Upload to Walrus */}
                            {pipelineState.allScenes.length > 0 && (
                              <div className="space-y-4 border-t pt-6">
                                <button
                                  onClick={handleIndexVideo}
                                  disabled={
                                    !videoMetadata.title ||
                                    !videoMetadata.description ||
                                    isProcessing ||
                                    pipelineState.currentStage !== "complete" ||
                                    pipelineState.allScenes.some(
                                      (s) => !s.caption || !s.audioUrl
                                    )
                                  }
                                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                                >
                                  <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                  </svg>
                                  Index Video to Walrus
                                </button>

                                {/* Test Download Button */}
                                <button
                                  onClick={async () => {
                                    try {
                                      toast.info("Creating test ZIP package...");

                                      // Generate SRT
                                      const srtUrl = generateSRTFile();
                                      const srtResponse = await fetch(srtUrl);
                                      const srtContent = await srtResponse.text();
                                      URL.revokeObjectURL(srtUrl);

                                      // Generate metadata
                                      const metadata = generateMetadata();
                                      const enrichedMetadata = {
                                        ...metadata,
                                        title: videoMetadata.title,
                                        description: videoMetadata.description,
                                        uploadedBy: address || "anonymous",
                                        uploadTime: Date.now(),
                                      };

                                      // Create ZIP with scenes and audio
                                      const { createVideoIndexZip } = await import(
                                        "@/services/create-zip"
                                      );
                                      const sceneImages = pipelineState.allScenes
                                        .filter((s) => s.imageUrl)
                                        .map((scene, index) => ({
                                          imageUrl: scene.imageUrl,
                                          index,
                                        }));
                                      const audioFiles = pipelineState.allScenes
                                        .filter((s) => s.audioUrl)
                                        .map((scene, index) => ({
                                          audioUrl: scene.audioUrl!,
                                          index,
                                        }));

                                      const zipBlob = await createVideoIndexZip(
                                        selectedVideo!,
                                        srtContent,
                                        JSON.stringify(enrichedMetadata, null, 2),
                                        sceneImages,
                                        audioFiles
                                      );

                                      // Download ZIP
                                      const url = URL.createObjectURL(zipBlob);
                                      const link = document.createElement("a");
                                      link.href = url;
                                      link.download = `${videoMetadata.title.replace(
                                        /[^a-z0-9]/gi,
                                        "-"
                                      )}-index.zip`;
                                      link.click();
                                      URL.revokeObjectURL(url);

                                      toast.success(
                                        `Test ZIP created! Size: ${(
                                          zipBlob.size /
                                          1024 /
                                          1024
                                        ).toFixed(2)} MB`
                                      );
                                    } catch (error) {
                                      console.error("Test ZIP error:", error);
                                      toast.error(
                                        `Failed to create test ZIP: ${
                                          error instanceof Error
                                            ? error.message
                                            : "Unknown error"
                                        }`
                                      );
                                    }
                                  }}
                                  disabled={
                                    !videoMetadata.title ||
                                    !videoMetadata.description ||
                                    isProcessing ||
                                    pipelineState.currentStage !== "complete" ||
                                    pipelineState.allScenes.some(
                                      (s) => !s.caption || !s.audioUrl
                                    )
                                  }
                                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                >
                                  <Download className="h-5 w-5" />
                                  Download Index Zip (no upload)
                                </button>

                                <p className="text-sm text-muted-foreground text-center">
                                  {pipelineState.currentStage === "complete"
                                    ? `${pipelineState.allScenes.length} scenes with captions and audio - ready to index`
                                    : `Processing: ${
                                        pipelineState.allScenes.filter((s) => s.caption)
                                          .length
                                      }/${pipelineState.allScenes.length} captions, ${
                                        pipelineState.allScenes.filter((s) => s.audioUrl)
                                          .length
                                      }/${pipelineState.allScenes.length} audio`}
                                </p>
                              </div>
                            )}

                            {/* Outputs Viewer - Show all generated assets */}
                          </div>
                        </div>

                        {/* My Videos Tab Content */}
                        <div className={activeTab === "my-videos" ? "block" : "hidden"}>
                          <UserIndexedVideos />
                        </div>
                      </Card>
                    </div>

                    {/* Processing Logs */}
                    {(pipelineState.error || isTestMode) && (
                      <div className="flex flex-col p-2 md:p-4 gap-2 md:gap-4">
                        <h1 className="font-outfit font-semibold text-lg md:text-xl">
                          Test Logs
                        </h1>

                        <div className="mb-4">
                          <Card
                            className={`p-4 ${
                              pipelineState.error
                                ? "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
                                : "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  pipelineState.error ? "bg-red-500" : "bg-blue-500"
                                }`}
                              />
                              <p
                                className={`text-sm font-medium ${
                                  pipelineState.error
                                    ? "text-red-800 dark:text-red-200"
                                    : "text-blue-800 dark:text-blue-200"
                                }`}
                              >
                                {pipelineState.error
                                  ? "Pipeline Error"
                                  : "Test Mode Active"}
                              </p>
                            </div>

                            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                              Video is being indexed locally.
                            </p>

                            <div className="space-y-4 pt-6">
                              {/* Processing Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-blue-600">
                                    {pipelineState.allScenes.length}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Total Scenes
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-green-600">
                                    {
                                      pipelineState.allScenes.filter((s) => s.caption)
                                        .length
                                    }
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Captions
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-purple-600">
                                    {
                                      pipelineState.allScenes.filter((s) => s.audioUrl)
                                        .length
                                    }
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Audio Files
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-emerald-600">
                                    {pipelineState.progress.percentage}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Progress
                                  </div>
                                </div>
                              </div>
                            </div>

                            {pipelineState.error && (
                              <p className="text-sm text-red-600 dark:text-red-300 mt-2">
                                {pipelineState.error}
                              </p>
                            )}

                            {/* Detailed Processing Steps - Only in debug mode */}
                            {isTestMode && (
                              <div className="mt-4">
                                <Accordion type="single" collapsible>
                                  <AccordionItem
                                    value="processing-logs"
                                    className="border-0"
                                  >
                                    <AccordionTrigger className="py-2 text-xs">
                                      View Detailed Processing Steps
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                      <div className="space-y-6">
                                        {/* Processing Pipeline Steps */}
                                        <div className="space-y-2">
                                          <h4 className="text-sm font-medium">
                                            Pipeline Stages
                                          </h4>

                                          {/* Video Load Stage */}
                                          <div className="flex items-center gap-2 text-xs">
                                            <div
                                              className={`w-2 h-2 rounded-full ${
                                                selectedVideo
                                                  ? "bg-green-500"
                                                  : "bg-gray-400"
                                              }`}
                                            />
                                            <span className="font-medium">Video Load</span>
                                            <span className="text-muted-foreground">
                                              {selectedVideo ? "✅ Complete" : "⏳ Pending"}
                                            </span>
                                            {selectedVideo && (
                                              <span className="text-muted-foreground">
                                                •{" "}
                                                {(selectedVideo.size / 1024 / 1024).toFixed(
                                                  1
                                                )}
                                                MB
                                              </span>
                                            )}
                                          </div>

                                          {/* VISE Stage */}
                                          <div className="flex items-center gap-2 text-xs">
                                            <div
                                              className={`w-2 h-2 rounded-full ${
                                                pipelineState.allScenes.filter(
                                                  (s) => s.processed
                                                ).length > 0
                                                  ? "bg-green-500"
                                                  : pipelineState.currentStage ===
                                                    "capturing"
                                                  ? "bg-yellow-500"
                                                  : "bg-gray-400"
                                              }`}
                                            />
                                            <span className="font-medium">
                                              VISE Processing
                                            </span>
                                            <span className="text-muted-foreground">
                                              {pipelineState.allScenes.filter(
                                                (s) => s.processed
                                              ).length > 0
                                                ? "✅ Active"
                                                : pipelineState.currentStage === "capturing"
                                                ? "⏳ Processing"
                                                : "⏸️ Idle"}
                                            </span>
                                            <span className="text-muted-foreground">
                                              •{" "}
                                              {
                                                pipelineState.allScenes.filter(
                                                  (s) => s.processed
                                                ).length
                                              }{" "}
                                              scenes extracted
                                            </span>
                                          </div>

                                          {/* Florence2 Stage */}
                                          <div className="flex items-center gap-2 text-xs">
                                            <div
                                              className={`w-2 h-2 rounded-full ${
                                                pipelineState.allScenes.filter(
                                                  (s) => s.caption
                                                ).length > 0
                                                  ? "bg-green-500"
                                                  : pipelineState.currentStage ===
                                                    "captioning"
                                                  ? "bg-yellow-500"
                                                  : "bg-gray-400"
                                              }`}
                                            />
                                            <span className="font-medium">
                                              Florence2 Captions
                                            </span>
                                            <span className="text-muted-foreground">
                                              {pipelineState.allScenes.filter(
                                                (s) => s.caption
                                              ).length > 0
                                                ? "✅ Active"
                                                : pipelineState.currentStage ===
                                                  "captioning"
                                                ? "⏳ Processing"
                                                : "⏸️ Idle"}
                                            </span>
                                            <span className="text-muted-foreground">
                                              •{" "}
                                              {
                                                pipelineState.allScenes.filter(
                                                  (s) => s.caption
                                                ).length
                                              }{" "}
                                              captions generated
                                            </span>
                                          </div>

                                          {/* Kokoro Stage */}
                                          <div className="flex items-center gap-2 text-xs">
                                            <div
                                              className={`w-2 h-2 rounded-full ${
                                                pipelineState.allScenes.filter(
                                                  (s) => s.audioUrl
                                                ).length > 0
                                                  ? "bg-green-500"
                                                  : pipelineState.currentStage ===
                                                    "generating-audio"
                                                  ? "bg-yellow-500"
                                                  : "bg-gray-400"
                                              }`}
                                            />
                                            <span className="font-medium">Kokoro TTS</span>
                                            <span className="text-muted-foreground">
                                              {pipelineState.allScenes.filter(
                                                (s) => s.audioUrl
                                              ).length > 0
                                                ? "✅ Active"
                                                : pipelineState.currentStage ===
                                                  "generating-audio"
                                                ? "⏳ Processing"
                                                : "⏸️ Idle"}
                                            </span>
                                            <span className="text-muted-foreground">
                                              •{" "}
                                              {
                                                pipelineState.allScenes.filter(
                                                  (s) => s.audioUrl
                                                ).length
                                              }{" "}
                                              audio files generated
                                            </span>
                                          </div>
                                        </div>

                                        {/* Timing Information */}
                                        <div className="space-y-2">
                                          <h4 className="text-sm font-medium">
                                            Timing Information
                                          </h4>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                              <span className="text-muted-foreground">
                                                Pipeline Started:
                                              </span>
                                              <span className="ml-1 font-medium">
                                                {isProcessing
                                                  ? new Date().toLocaleTimeString()
                                                  : "Not started"}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">
                                                Current Stage:
                                              </span>
                                              <span className="ml-1 font-medium capitalize">
                                                {pipelineState.currentStage || "idle"}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">
                                                Progress:
                                              </span>
                                              <span className="ml-1 font-medium">
                                                {pipelineState.progress.percentage}%
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">
                                                Est. Remaining:
                                              </span>
                                              <span className="ml-1 font-medium">
                                                {isProcessing &&
                                                pipelineState.progress.percentage > 0
                                                  ? Math.round(
                                                      (100 -
                                                        pipelineState.progress.percentage) *
                                                        0.5
                                                    ) + "s"
                                                  : "N/A"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Model Status */}
                                        <div className="space-y-2">
                                          <h4 className="text-sm font-medium">
                                            Model Status
                                          </h4>
                                          <div className="space-y-1 text-xs">
                                            <div className="flex items-center gap-2">
                                              <div
                                                className={`w-2 h-2 rounded-full ${
                                                  pipelineState.modelsLoaded.florence2
                                                    ? "bg-green-500"
                                                    : "bg-yellow-500"
                                                }`}
                                              />
                                              <span>Florence2:</span>
                                              <span className="font-medium">
                                                {pipelineState.modelsLoaded.florence2
                                                  ? "Ready"
                                                  : "Loading..."}
                                              </span>
                                              {!pipelineState.modelsLoaded.florence2 &&
                                                pipelineState.modelProgress.florence2
                                                  .progress &&
                                                pipelineState.modelProgress.florence2
                                                  .total && (
                                                  <span className="text-muted-foreground">
                                                    {Math.round(
                                                      (pipelineState.modelProgress.florence2
                                                        .progress /
                                                        pipelineState.modelProgress
                                                          .florence2.total) *
                                                        100
                                                    )}
                                                    %
                                                  </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div
                                                className={`w-2 h-2 rounded-full ${
                                                  pipelineState.modelsLoaded.kokoro
                                                    ? "bg-green-500"
                                                    : "bg-yellow-500"
                                                }`}
                                              />
                                              <span>Kokoro:</span>
                                              <span className="font-medium">
                                                {pipelineState.modelsLoaded.kokoro
                                                  ? "Ready"
                                                  : "Loading..."}
                                              </span>
                                              {!pipelineState.modelsLoaded.kokoro &&
                                                pipelineState.modelProgress.kokoro
                                                  .progress &&
                                                pipelineState.modelProgress.kokoro
                                                  .total && (
                                                  <span className="text-muted-foreground">
                                                    {Math.round(
                                                      (pipelineState.modelProgress.kokoro
                                                        .progress /
                                                        pipelineState.modelProgress.kokoro
                                                          .total) *
                                                        100
                                                    )}
                                                    %
                                                  </span>
                                                )}
                                            </div>
                                          </div>
                                        </div>

                                        {pipelineState.allScenes.filter((s) => s.processed)
                                          .length > 0 && (
                                          <div className="space-y-6">
                                            {/* Scenes Grid */}
                                            <div>
                                              <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-medium text-sm">
                                                  Scene Images
                                                </h4>
                                                <button
                                                  onClick={() => {
                                                    const scenes =
                                                      pipelineState.allScenes.filter(
                                                        (s) => s.processed && s.imageUrl
                                                      );
                                                    scenes.forEach((scene, index) => {
                                                      const link =
                                                        document.createElement("a");
                                                      link.href = scene.imageUrl;
                                                      link.download = `scene-${
                                                        index + 1
                                                      }-${scene.timestamp?.toFixed(
                                                        1
                                                      )}s.png`;
                                                      link.click();
                                                    });
                                                    toast.success(
                                                      `Saving ${scenes.length} scene images...`
                                                    );
                                                  }}
                                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                >
                                                  <Download className="h-3 w-3" />
                                                  Save All Scenes
                                                </button>
                                              </div>
                                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {pipelineState.allScenes
                                                  .filter((s) => s.processed && s.imageUrl)
                                                  .map((scene, index) => (
                                                    <Card
                                                      key={index}
                                                      className="p-3 hover:shadow-md transition-shadow"
                                                    >
                                                      <div className="space-y-2">
                                                        <div
                                                          className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden cursor-pointer group relative"
                                                          onClick={() =>
                                                            handleImageClick(
                                                              scene.imageUrl,
                                                              index
                                                            )
                                                          }
                                                        >
                                                          <img
                                                            src={scene.imageUrl}
                                                            alt={`Scene ${
                                                              index + 1
                                                            } at ${scene.timestamp?.toFixed(
                                                              1
                                                            )}s`}
                                                            width={120}
                                                            height={80}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                          />
                                                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
                                                              View Full
                                                            </span>
                                                          </div>
                                                        </div>
                                                        <div className="text-xs">
                                                          <div className="font-medium">
                                                            Scene {index + 1}
                                                          </div>
                                                          <div className="text-muted-foreground">
                                                            {scene.timestamp?.toFixed(1)}s
                                                          </div>
                                                          <div className="text-muted-foreground">
                                                            {scene.caption
                                                              ? `"${scene.caption.substring(
                                                                  0,
                                                                  30
                                                                )}..."`
                                                              : "Processing..."}
                                                          </div>
                                                        </div>
                                                        <button
                                                          onClick={() => {
                                                            const link =
                                                              document.createElement("a");
                                                            link.href = scene.imageUrl;
                                                            link.download = `scene-${
                                                              index + 1
                                                            }-${scene.timestamp?.toFixed(
                                                              1
                                                            )}s.png`;
                                                            link.click();
                                                          }}
                                                          className="w-full text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                        >
                                                          Save
                                                        </button>
                                                      </div>
                                                    </Card>
                                                  ))}
                                              </div>
                                            </div>

                                            {/* Captions List */}
                                            <div>
                                              <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-medium text-sm">
                                                  Generated Captions
                                                </h4>
                                                <button
                                                  onClick={handleDownloadSRT}
                                                  className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                                                >
                                                  <Download className="h-3 w-3" />
                                                  Save SRT
                                                </button>
                                              </div>
                                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {pipelineState.allScenes
                                                  .filter((scene) => scene.caption)
                                                  .map((scene, index) => (
                                                    <Card key={index} className="p-3">
                                                      <div className="flex items-start gap-3">
                                                        <div className="text-xs text-muted-foreground font-mono min-w-12">
                                                          {scene.timestamp?.toFixed(1)}s
                                                        </div>
                                                        <div className="flex-1 text-sm">
                                                          {scene.caption}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                          {scene.caption?.length} chars
                                                        </div>
                                                      </div>
                                                    </Card>
                                                  ))}
                                              </div>
                                            </div>

                                            {/* Audio Files */}
                                            <div>
                                              <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-medium text-sm">
                                                  Generated Audio
                                                </h4>
                                                <button
                                                  onClick={() => {
                                                    const audioScenes =
                                                      pipelineState.allScenes.filter(
                                                        (s) => s.audioUrl
                                                      );
                                                    audioScenes.forEach(
                                                      async (scene, index) => {
                                                        try {
                                                          const response = await fetch(
                                                            scene.audioUrl!
                                                          );
                                                          const blob =
                                                            await response.blob();
                                                          const url =
                                                            URL.createObjectURL(blob);
                                                          const link =
                                                            document.createElement("a");
                                                          link.href = url;
                                                          link.download = `audio-${
                                                            index + 1
                                                          }-${scene.timestamp?.toFixed(
                                                            1
                                                          )}s.wav`;
                                                          link.click();
                                                          URL.revokeObjectURL(url);
                                                        } catch (error) {
                                                          console.error(
                                                            "Failed to download audio:",
                                                            error
                                                          );
                                                        }
                                                      }
                                                    );
                                                    toast.success(
                                                      `Saving ${audioScenes.length} audio files...`
                                                    );
                                                  }}
                                                  className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                                >
                                                  <Download className="h-3 w-3" />
                                                  Save All Audio
                                                </button>
                                              </div>
                                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {pipelineState.allScenes
                                                  .filter((scene) => scene.audioUrl)
                                                  .map((scene, index) => (
                                                    <Card key={index} className="p-3">
                                                      <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center">
                                                          🔊
                                                        </div>
                                                        <div className="flex-1">
                                                          <div className="text-sm font-medium">
                                                            Audio {index + 1}
                                                          </div>
                                                          <div className="text-xs text-muted-foreground">
                                                            {scene.timestamp?.toFixed(1)}s •
                                                            ~3.2s duration • 45KB
                                                          </div>
                                                        </div>
                                                        {scene.audioUrl && (
                                                          <audio
                                                            controls
                                                            className="w-32 h-8"
                                                          >
                                                            <source
                                                              src={scene.audioUrl}
                                                              type="audio/wav"
                                                            />
                                                          </audio>
                                                        )}
                                                        <button
                                                          onClick={async () => {
                                                            try {
                                                              const response = await fetch(
                                                                scene.audioUrl!
                                                              );
                                                              const blob =
                                                                await response.blob();
                                                              const url =
                                                                URL.createObjectURL(blob);
                                                              const link =
                                                                document.createElement("a");
                                                              link.href = url;
                                                              link.download = `audio-${
                                                                index + 1
                                                              }-${scene.timestamp?.toFixed(
                                                                1
                                                              )}s.wav`;
                                                              link.click();
                                                              URL.revokeObjectURL(url);
                                                              toast.success(
                                                                "Audio file saved!"
                                                              );
                                                            } catch (error) {
                                                              toast.error(
                                                                "Failed to save audio"
                                                              );
                                                            }
                                                          }}
                                                          className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 px-2 py-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                                        >
                                                          Save
                                                        </button>
                                                      </div>
                                                    </Card>
                                                  ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Warnings/Issues */}
                                        {(pipelineState.allScenes.length > 20 ||
                                          pipelineState.error) && (
                                          <div className="space-y-2">
                                            <h4 className="text-xs font-medium text-yellow-600">
                                              Warnings
                                            </h4>
                                            <div className="space-y-1 text-xs">
                                              {pipelineState.allScenes.length > 20 && (
                                                <div className="text-yellow-600">
                                                  ⚠️ Large video with{" "}
                                                  {pipelineState.allScenes.length} scenes -
                                                  processing may take time
                                                </div>
                                              )}
                                              {pipelineState.error && (
                                                <div className="text-red-600">
                                                  ❌ {pipelineState.error}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                            )}
                          </Card>
                        </div>
                      </div>
                    )}

                    <div className="overflow-y-auto max-h-0">
                      <canvas ref={canvasRef} className="border rounded ml-2" />
                      <video
                        crossOrigin="anonymous"
                        ref={videoRef}
                        controls={false}
                        muted
                        preload="metadata"
                        width="560px"
                        height="315px"
                        onEnded={() => console.log("Video ended event fired")}
                      />

                      <div
                        ref={slicedRef}
                        style={{ display: "flex", flexWrap: "wrap" }}
                      ></div>
                      <div
                        ref={sceneRef}
                        style={{ display: "flex", flexWrap: "wrap" }}
                      ></div>
                    </div>
                    <AnimatePresence>
                      {showComponent && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-center overflow-hidden mb-4 h-[275px]"
                        >
                          <div className="-mt-4">
                            <Suspense fallback={<div>Loading Globe...</div>}>
                              <Globe
                                onGlobeReady={() => setLoaded(true)}
                                globeRef={globeRef}
                                width={600}
                                height={500}
                                globeImageUrl={
                                  resolvedTheme === "dark"
                                    ? "/earth-night.jpg"
                                    : "/earth-day.jpeg"
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
                            </Suspense>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Image Preview Modal */}
          <AnimatePresence>
            {selectedImageUrl && selectedImageIndex !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
                onClick={handleCloseImagePreview}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden flex flex-col"
                  style={{
                    maxHeight: "90vh",
                    maxWidth: "95vw",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleCloseImagePreview}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="relative flex items-center justify-center bg-black">
                    <img
                      src={selectedImageUrl}
                      alt={`Scene ${selectedImageIndex + 1} preview`}
                      width={800}
                      height={600}
                      className="max-w-full w-auto h-auto object-contain"
                      style={{
                        maxHeight: isLandscape ? "60vh" : "70vh",
                        maxWidth: "90vw",
                      }}
                    />
                  </div>

                  <div className="p-4 bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">
                          Scene {selectedImageIndex + 1}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Timestamp:{" "}
                          {pipelineState.allScenes
                            .filter((s) => s.processed && s.imageUrl)
                            [selectedImageIndex]?.timestamp?.toFixed(1)}
                          s
                        </p>
                        {pipelineState.allScenes.filter((s) => s.processed && s.imageUrl)[
                          selectedImageIndex
                        ]?.caption && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Caption: "
                            {
                              pipelineState.allScenes.filter(
                                (s) => s.processed && s.imageUrl
                              )[selectedImageIndex]?.caption
                            }
                            "
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const scene = pipelineState.allScenes.filter(
                            (s) => s.processed && s.imageUrl
                          )[selectedImageIndex];
                          if (scene) {
                            const link = document.createElement("a");
                            link.href = scene.imageUrl;
                            link.download = `scene-${
                              selectedImageIndex + 1
                            }-${scene.timestamp?.toFixed(1)}s.png`;
                            link.click();
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Save
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="font-outfit p-4 text-sm text-center">
            Vidrune powered by VISE x Florence2 x KokoroTTS x Transformer.js
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConsoleComponent;
