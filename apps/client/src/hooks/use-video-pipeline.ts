import { useCallback, useState, useRef, useEffect } from "react";
import useCaptureStills from "./use-capture-stills";
import { Florence2Service } from "../services/florence2-service";
import { KokoroService } from "../services/kokoro-service";

type PipelineStage = "idle" | "capturing" | "captioning" | "generating-audio" | "complete";

interface ProcessedScene {
  imageUrl: string;
  timestamp: number;
  caption?: string;
  audioUrl?: string;
  processed: boolean;
}

interface FileProgress {
  loaded: number;
  total: number;
}

interface ModelProgress {
  status: string;
  progress?: number;
  total?: number;
  file?: string;
  files?: Record<string, FileProgress>; // Track all files being downloaded
  aggregateLoaded?: number;
  aggregateTotal?: number;
}

interface PipelineState {
  allScenes: ProcessedScene[];
  currentStage: PipelineStage;
  progress: {
    stage: string;
    current: number;
    total: number;
    percentage: number;
  };
  modelsLoaded: {
    florence2: boolean;
    kokoro: boolean;
  };
  modelProgress: {
    florence2: ModelProgress;
    kokoro: ModelProgress;
  };
  error?: string;
}

const INITIAL_PIPELINE_STATE: PipelineState = {
  allScenes: [],
  currentStage: "idle",
  progress: {
    stage: "Waiting",
    current: 0,
    total: 0,
    percentage: 0,
  },
  modelsLoaded: {
    florence2: false,
    kokoro: false,
  },
  modelProgress: {
    florence2: { status: "initializing" },
    kokoro: { status: "initializing" },
  },
};

// Helper functions for state updates
const updateProgress = (stage: string, current: number, total: number) => ({
  stage,
  current,
  total,
  percentage: total > 0 ? Math.round((current / total) * 100) : 0,
});

// Helper function for updating model progress (unused but kept for future use)
// const updateModelProgress =
//   (model: "florence2" | "kokoro", progress: Partial<ModelProgress>) =>
//   (prev: PipelineState) => ({
//     ...prev,
//     modelProgress: {
//       ...prev.modelProgress,
//       [model]: { ...prev.modelProgress[model], ...progress },
//     },
//     modelsLoaded: {
//       ...prev.modelsLoaded,
//       [model]:
//         progress.status === "ready" ||
//         progress.status === "complete" ||
//         prev.modelsLoaded[model],
//     },
//   });

const updateSceneInList = (
  scenes: ProcessedScene[],
  targetScene: ProcessedScene,
  updates: Partial<ProcessedScene>,
) =>
  scenes.map((scene) =>
    scene.imageUrl === targetScene.imageUrl ? { ...scene, ...updates } : scene,
  );

const getProgressStatus = (status: string, data?: string): string => {
  switch (status) {
    case "loading":
      return data || "Loading model...";
    case "initiate":
      return "Starting download...";
    case "progress":
      return "Downloading...";
    case "done":
      return "Processing...";
    case "ready":
      return "Ready";
    case "complete":
      return "Ready";
    case "error":
      return "Error";
    case "device":
      return `Using ${data} device`;
    default:
      return status;
  }
};

const formatSRTTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
};

export const useVideoPipeline = () => {
  const [pipelineState, setPipelineState] = useState<PipelineState>(INITIAL_PIPELINE_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingStage = useRef<PipelineStage>("idle");
  const florence2Service = useRef<Florence2Service | null>(null);
  const kokoroService = useRef<KokoroService | null>(null);

  // Initialize services
  useEffect(() => {
    let isMounted = true;

    const initializeServices = async () => {
      try {
        // Initialize Florence2
        if (!florence2Service.current) {
          florence2Service.current = new Florence2Service();

          const handleFlorence2Progress = (e: MessageEvent) => {
            if (!isMounted) return;
            const { status, data } = e.data;

            setPipelineState((prev) => {
              const currentFiles = prev.modelProgress.florence2.files || {};
              let updatedFiles = { ...currentFiles };
              let aggregateLoaded = 0;
              let aggregateTotal = 0;

              // Update file progress if we have file info
              if (e.data.file && e.data.total) {
                // Calculate loaded bytes from percentage if loaded is not provided
                const loadedBytes = e.data.loaded ?? 
                  (e.data.progress && e.data.total ? (e.data.progress / 100) * e.data.total : 0);
                
                updatedFiles[e.data.file] = {
                  loaded: loadedBytes,
                  total: e.data.total,
                };
              }

              // Calculate aggregate progress across all files
              Object.values(updatedFiles).forEach((fileProgress) => {
                aggregateLoaded += fileProgress.loaded;
                aggregateTotal += fileProgress.total;
              });

              return {
                ...prev,
                modelProgress: {
                  ...prev.modelProgress,
                  florence2: {
                    status: getProgressStatus(status, data),
                    progress: aggregateLoaded || e.data.loaded || 
                      (e.data.progress && e.data.total ? (e.data.progress / 100) * e.data.total : 0),
                    total: aggregateTotal || e.data.total,
                    file: e.data.file,
                    files: updatedFiles,
                    aggregateLoaded,
                    aggregateTotal,
                  },
                },
                modelsLoaded: {
                  ...prev.modelsLoaded,
                  florence2: status === "ready" || status === "complete",
                },
                error: status === "error" ? `Florence2 model failed: ${data}` : prev.error,
              };
            });
          };

          florence2Service.current
            .getWorker()
            ?.addEventListener("message", handleFlorence2Progress);
        }

        // Initialize Kokoro
        if (!kokoroService.current) {
          kokoroService.current = new KokoroService();

          const handleKokoroProgress = (e: MessageEvent) => {
            if (!isMounted) return;
            const { status, data } = e.data;

            setPipelineState((prev) => {
              const currentFiles = prev.modelProgress.kokoro.files || {};
              let updatedFiles = { ...currentFiles };
              let aggregateLoaded = 0;
              let aggregateTotal = 0;

              // Update file progress if we have file info
              if (e.data.file && e.data.total) {
                // Calculate loaded bytes from percentage if loaded is not provided
                const loadedBytes = e.data.loaded ?? 
                  (e.data.progress && e.data.total ? (e.data.progress / 100) * e.data.total : 0);
                
                updatedFiles[e.data.file] = {
                  loaded: loadedBytes,
                  total: e.data.total,
                };
              }

              // Calculate aggregate progress across all files
              Object.values(updatedFiles).forEach((fileProgress) => {
                aggregateLoaded += fileProgress.loaded;
                aggregateTotal += fileProgress.total;
              });

              return {
                ...prev,
                modelProgress: {
                  ...prev.modelProgress,
                  kokoro: {
                    status: getProgressStatus(status, data || e.data.device),
                    progress: aggregateLoaded || e.data.loaded || 
                      (e.data.progress && e.data.total ? (e.data.progress / 100) * e.data.total : 0),
                    total: aggregateTotal || e.data.total,
                    file: e.data.file,
                    files: updatedFiles,
                    aggregateLoaded,
                    aggregateTotal,
                  },
                },
                modelsLoaded: {
                  ...prev.modelsLoaded,
                  kokoro: status === "ready" || status === "complete",
                },
                error:
                  status === "error" ? `Kokoro model failed: ${e.data.error}` : prev.error,
              };
            });
          };

          kokoroService.current
            .getWorker()
            ?.addEventListener("message", handleKokoroProgress);

          try {
            await kokoroService.current.waitForModelLoad();
          } catch (error) {
            if (isMounted) {
              setPipelineState((prev) => ({
                ...prev,
                error: `Kokoro initialization failed: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              }));
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          setPipelineState((prev) => ({
            ...prev,
            error: `Service initialization failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          }));
        }
      }
    };

    initializeServices();

    return () => {
      isMounted = false;
      if (florence2Service.current) {
        florence2Service.current.dispose();
        florence2Service.current = null;
      }
      if (kokoroService.current) {
        kokoroService.current.dispose();
        kokoroService.current = null;
      }
    };
  }, []);

  const {
    videoRef,
    canvasRef,
    sceneRef,
    slicedRef,
    capturedScenes,
    processStatus,
    lastEvent,
    resetCapture,
    clearAllCaptures,
  } = useCaptureStills(isProcessing);

  // Stage 1: Capture all scenes first - wait for complete video processing
  useEffect(() => {
    if (!isProcessing || processingStage.current !== "capturing") return;

    const sceneEntries = Object.entries(capturedScenes);

    // Update scenes as they come in
    if (sceneEntries.length > 0) {
      const newScenes: ProcessedScene[] = sceneEntries
        .map(([timestamp, imageUrl]) => ({
          imageUrl,
          timestamp: parseFloat(timestamp),
          processed: true,
        }))
        .filter((scene) => {
          return !pipelineState.allScenes.some(
            (existing) => existing.imageUrl === scene.imageUrl,
          );
        });

      if (newScenes.length > 0) {
        setPipelineState((prev) => ({
          ...prev,
          allScenes: [...prev.allScenes, ...newScenes],
          progress: updateProgress(
            "Capturing scenes...",
            prev.allScenes.length + newScenes.length,
            prev.allScenes.length + newScenes.length,
          ),
        }));
      }
    }

    // Move to captioning when capture is completely finished (video ended + all scenes processed)
    const isVideoEnded = lastEvent === "video_end" || lastEvent === "all_complete";
    const hasScenes = sceneEntries.length > 0;

    if (isVideoEnded && hasScenes && processingStage.current === "capturing") {
      processingStage.current = "captioning";

      setPipelineState((prev) => ({
        ...prev,
        currentStage: "captioning",
        progress: updateProgress(
          "Capture complete, starting captions...",
          sceneEntries.length,
          sceneEntries.length,
        ),
      }));

      processAllCaptions();
    }
  }, [capturedScenes, lastEvent, isProcessing, pipelineState.allScenes.length]);

  // Stage 2: Process all captions at once
  const processAllCaptions = useCallback(async () => {
    if (!florence2Service.current || !pipelineState.modelsLoaded.florence2) {
      return;
    }

    if (processingStage.current !== "captioning") {
      return;
    }

    const sceneEntries = Object.entries(capturedScenes);
    const scenesToCaption: ProcessedScene[] = sceneEntries.map(([timestamp, imageUrl]) => ({
      imageUrl,
      timestamp: parseFloat(timestamp),
      processed: true,
    }));

    setPipelineState((prev) => ({
      ...prev,
      allScenes: scenesToCaption,
      currentStage: "captioning",
      progress: updateProgress("Generating captions...", 0, scenesToCaption.length),
    }));

    try {
      const captionedScenes: ProcessedScene[] = [];

      for (let i = 0; i < scenesToCaption.length; i++) {
        const scene = scenesToCaption[i];

        const { result } = await florence2Service.current.generateCaption(
          scene.imageUrl,
          "<DETAILED_CAPTION>",
        );
        const caption = result["<DETAILED_CAPTION>"] as string;

        const updatedScene = { ...scene, caption };
        captionedScenes.push(updatedScene);

        setPipelineState((prev) => ({
          ...prev,
          allScenes: updateSceneInList(prev.allScenes, scene, { caption }),
          progress: updateProgress("Generating captions...", i + 1, scenesToCaption.length),
        }));
      }

      processingStage.current = "generating-audio";
      processAllAudio(captionedScenes);
    } catch (error) {
      setPipelineState((prev) => ({
        ...prev,
        error: `Captioning failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
    }
  }, [capturedScenes, pipelineState.modelsLoaded.florence2]);

  // Stage 3: Generate all audio at once - only after captions are complete
  const processAllAudio = useCallback(
    async (scenesWithCaptions?: ProcessedScene[]) => {
      if (!kokoroService.current || !pipelineState.modelsLoaded.kokoro) {
        return;
      }

      if (processingStage.current !== "generating-audio") {
        return;
      }

      const scenesToProcess =
        scenesWithCaptions || pipelineState.allScenes.filter((scene) => scene.caption);

      setPipelineState((prev) => ({
        ...prev,
        currentStage: "generating-audio",
        progress: updateProgress("Generating audio...", 0, scenesToProcess.length),
      }));

      try {
        for (let i = 0; i < scenesToProcess.length; i++) {
          const scene = scenesToProcess[i];

          try {
            const audioResult = await kokoroService.current.generateAudio(scene.caption!);

            setPipelineState((prev) => ({
              ...prev,
              allScenes: updateSceneInList(prev.allScenes, scene, {
                audioUrl: audioResult.audio,
                processed: true,
              }),
              progress: updateProgress(
                "Generating audio...",
                i + 1,
                scenesToProcess.length,
              ),
            }));
          } catch (sceneError) {
            setPipelineState((prev) => ({
              ...prev,
              progress: updateProgress(
                "Generating audio...",
                i + 1,
                scenesToProcess.length,
              ),
            }));
          }
        }
      } catch (error) {
        // Continue to completion even if audio fails
      }

      processingStage.current = "complete";
      setIsProcessing(false);

      setPipelineState((prev) => ({
        ...prev,
        currentStage: "complete",
        progress: updateProgress("Complete!", prev.allScenes.length, prev.allScenes.length),
      }));
    },
    [pipelineState.allScenes, pipelineState.modelsLoaded.kokoro],
  );

  // Auto-advance when video ends and no new scenes are being captured
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoEnd = () => {
      if (isProcessing && processingStage.current === "capturing") {
        setTimeout(() => {
          const sceneEntries = Object.entries(capturedScenes);
          if (sceneEntries.length > 0) {
            processingStage.current = "captioning";

            setPipelineState((prev) => ({
              ...prev,
              currentStage: "captioning",
              progress: updateProgress(
                "Video complete, starting captions...",
                sceneEntries.length,
                sceneEntries.length,
              ),
            }));

            processAllCaptions();
          }
        }, 1000);
      }
    };

    video.addEventListener("ended", handleVideoEnd);
    return () => video.removeEventListener("ended", handleVideoEnd);
  }, [isProcessing, capturedScenes, processAllCaptions]);

  const startPipeline = useCallback(() => {
    resetCapture();
    processingStage.current = "capturing";
    setIsProcessing(true);
    setPipelineState((prev) => ({
      ...prev,
      currentStage: "capturing",
      error: undefined,
      allScenes: [],
      progress: updateProgress("Starting capture...", 0, 0),
    }));

    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
  }, [videoRef, pipelineState.modelsLoaded, resetCapture]);

  const stopPipeline = useCallback(() => {
    processingStage.current = "idle";
    setIsProcessing(false);
    videoRef.current?.pause();
    setPipelineState((prev) => ({ ...prev, currentStage: "idle" }));
  }, [videoRef]);

  const resetPipeline = useCallback(() => {
    // Clean up any audio blob URLs from processed scenes
    pipelineState.allScenes.forEach((scene) => {
      if (scene.audioUrl && scene.audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(scene.audioUrl);
      }
    });

    processingStage.current = "idle";
    setIsProcessing(false);

    // Reset pipeline state but preserve model loading states
    setPipelineState((prev) => ({
      ...INITIAL_PIPELINE_STATE,
      // Preserve model loading states and progress
      modelsLoaded: prev.modelsLoaded,
      modelProgress: prev.modelProgress,
    }));

    videoRef.current?.pause();
    clearAllCaptures();
  }, [videoRef, clearAllCaptures, pipelineState.allScenes]);

  const generateSRTFile = useCallback(() => {
    const sortedScenes = pipelineState.allScenes
      .filter((scene) => scene.caption)
      .sort((a, b) => a.timestamp - b.timestamp);

    const srtContent = sortedScenes
      .map((scene, index) => {
        const start = formatSRTTime(scene.timestamp);
        // Calculate end time: either 3 seconds later or until next scene
        const nextScene = sortedScenes[index + 1];
        const duration = nextScene ? Math.min(3, nextScene.timestamp - scene.timestamp) : 3;
        const end = formatSRTTime(scene.timestamp + duration);
        return `${index + 1}\n${start} --> ${end}\n${scene.caption}\n`;
      })
      .join("\n\n");

    const blob = new Blob([srtContent], { type: "text/srt" });
    return URL.createObjectURL(blob);
  }, [pipelineState.allScenes]);

  const generateMetadata = useCallback(() => {
    const completedScenes = pipelineState.allScenes.filter((scene) => scene.processed);

    return {
      id: `video_${Date.now()}`,
      title: "Processed Video",
      uploadedBy: "User",
      description: "Video processed through local pipeline",
      uploadTime: Date.now(),
      assetBaseUrl: "",
      assets: {
        video: "video.mp4",
        captions: "captions.srt",
        scenes: completedScenes.map(
          (_, index) => `scenes/scene-${String(index + 1).padStart(3, "0")}.png`,
        ),
        audio: completedScenes.map(
          (_, index) => `audio/audio-${String(index + 1).padStart(3, "0")}.wav`,
        ),
      },
      summary: `Video with ${completedScenes.length} processed scenes`,
      scenes: completedScenes.map((scene) => ({
        description: scene.caption || "Scene description",
        keywords: ["video", "scene", "processed"],
      })),
      searchableContent: {
        transcription: completedScenes
          .map((s) => s.caption)
          .filter(Boolean)
          .join(" "),
        sceneDescriptions: completedScenes
          .map((s) => s.caption)
          .filter(Boolean)
          .join(" "),
        ttsContent: completedScenes
          .map((s) => s.caption)
          .filter(Boolean)
          .join(" "),
      },
    };
  }, [pipelineState.allScenes]);

  return {
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
    viseStatus: processStatus,
    viseEvent: lastEvent,
  };
};
