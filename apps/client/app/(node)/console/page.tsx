"use client";

import { motion } from "framer-motion";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Play, Pause, RotateCcw } from "lucide-react";

import { Card } from "@/library/components/atoms/card";
import { Button } from "@/library/components/atoms/button";
import { Progress } from "@/library/components/atoms/progress";
import { Input } from "@/library/components/atoms/input";
import { Label } from "@/library/components/atoms/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/library/components/atoms/tabs";

import IndexExplorerCards from "@/library/components/organisms/index-explorer-cards";
import { UserIndexedVideos } from "@/library/components/organisms/user-indexed-videos";
import { useMetadata } from "@/library/hooks/use-metadata";
import { useVideoPipeline } from "@/library/hooks/use-video-pipeline";
import { Skeleton } from "@/library/components/atoms/skeleton";

const ConsolePage = () => {
  // TODO: Replace with Internet Computer authentication
  const [icAuth] = useState({ isConnected: false, principal: null });

  // Video file input
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);

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

  const handleVideoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

  return (
    <div className="flex flex-col items-center px-4 gap-4 min-h-screen">
      {/* Background gradient */}
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-atyp text-4xl md:text-5xl text-balance leading-tight mb-4">
            Video Indexing Pipeline
          </h1>
          <p className="text-sm md:text-base font-medium leading-[17px] text-[#484E62]">
            Upload videos, extract scenes, generate captions, and create downloadable
            content
          </p>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex flex-col gap-2">
              <p className="font-outfit font-semibold text-sm text-[#484E62] dark:text-[#B7BDD5]">
                VISE Bin
              </p>
              <p className="text-2xl font-outfit font-bold">
                {pipelineState.viseBin.length}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-2">
              <p className="font-outfit font-semibold text-sm text-[#484E62] dark:text-[#B7BDD5]">
                Florence2 Bin
              </p>
              <p className="text-2xl font-outfit font-bold">
                {pipelineState.florence2Bin.length}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-2">
              <p className="font-outfit font-semibold text-sm text-[#484E62] dark:text-[#B7BDD5]">
                Kokoro Bin
              </p>
              <p className="text-2xl font-outfit font-bold">
                {pipelineState.kokoroBin.length}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-2">
              <p className="font-outfit font-semibold text-sm text-[#484E62] dark:text-[#B7BDD5]">
                Completed
              </p>
              <p className="text-2xl font-outfit font-bold">
                {pipelineState.completed.length}
              </p>
            </div>
          </Card>
        </div>

        {/* Video Processing Interface */}
        <Card className="p-6 mb-8">
          <h2 className="font-outfit font-semibold text-lg mb-4">Video Processing</h2>

          {/* Video File Input */}
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="video-upload" className="text-sm font-medium mb-2 block">
                Select Video File
              </Label>
              <Input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              {selectedVideo && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedVideo.name} (
                  {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          {/* Processing Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Button
              onClick={handleStartProcessing}
              disabled={!selectedVideo || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Processing
            </Button>

            <Button
              onClick={handleStopProcessing}
              disabled={!isProcessing}
              variant="destructive"
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop Processing
            </Button>

            <Button onClick={() => window.location.reload()} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-4 mb-6">
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
                  VISE Status: <span className="capitalize">{viseStatus}</span>
                </p>
                {viseEvent && (
                  <p>
                    Last Event: <span className="capitalize">{viseEvent}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Download Options */}
          {pipelineState.completed.length > 0 && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold">Download Results</h3>
              <div className="flex flex-wrap gap-4">
                <Button onClick={handleDownloadSRT} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download SRT
                </Button>
                <Button onClick={handleSaveMetadata} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Save Metadata
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {pipelineState.completed.length} scenes processed and ready for download
              </p>
            </div>
          )}
        </Card>

        {/* Hidden video and canvas elements for processing */}
        <div className="hidden">
          <video ref={videoRef} />
          <canvas ref={canvasRef} />
          <div ref={sceneRef} />
          <div ref={slicedRef} />
        </div>

        {/* Additional Content Tabs */}
        <Tabs defaultValue="explore" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="explore">Explore Index</TabsTrigger>
            <TabsTrigger value="my-videos">My Videos</TabsTrigger>
          </TabsList>

          {/* Explore Index Tab */}
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
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <IndexExplorerCards metadata={metadata} defaultLayout="grid" />
            )}
          </TabsContent>

          {/* My Videos Tab */}
          <TabsContent value="my-videos" className="mt-4">
            <UserIndexedVideos />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ConsolePage;
