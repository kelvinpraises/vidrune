import { useCallback, useRef, useState } from "react";

import useCaptureCanvas from "@/hooks/use-capture-canvas";
import useColourAnalysis from "@/hooks/use-colour-analysis";
import usePollingEffect from "@/hooks/use-polling-effect";

type ProcessStatus = "idle" | "capturing" | "complete";
type ProcessEvent =
  | "capture_start"
  | "capture_end"
  | "video_end"
  | "all_complete";

const useCaptureStills = (isProcessing?: boolean) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slicedRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<{ r: number; g: number; b: number }[]>([]);
  const [capturedScenes, setCapturedScenes] = useState<Record<number, string>>(
    {}
  );
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("idle");
  const [lastEvent, setLastEvent] = useState<ProcessEvent | null>(null);
  const videoEndedRef = useRef<boolean>(false);
  const captureCompleteRef = useRef<boolean>(false);
  const hasFirstValidFrameRef = useRef<boolean>(false);

  const { canvasRef, setUpCanvas } = useCaptureCanvas(videoRef);
  const { getAverageColor, compareColorSimilarity } = useColourAnalysis();

  const updateProcessStatus = useCallback((event: ProcessEvent) => {
    setLastEvent(event);
    switch (event) {
      case "capture_start":
        setProcessStatus("capturing");
        break;
      case "video_end":
        videoEndedRef.current = true;
        console.log(
          "Video playback has ended. Processing captures complete."
        );
        break;
      case "all_complete":
        setProcessStatus("complete");
        console.log("All captures have been processed.");
        break;
      default:
        break;
    }
  }, []);

  const captureImage = useCallback(
    async (
      onCapture: (params: {
        clone: HTMLCanvasElement;
        similar: boolean;
        w: number;
        h: number;
        colWidth: number;
        rowHeight: number;
        accumulatedColors: { r: number; g: number; b: number }[];
      }) => void
    ) => {
      const video = videoRef.current;

      if (!video) {
        throw new Error("No video ref");
      }

      try {
        updateProcessStatus("capture_start");
        const { canvas, context, w, h } = setUpCanvas();
        const clone = canvas.cloneNode(true) as HTMLCanvasElement;
        clone.getContext("2d")?.drawImage(canvas, 0, 0);

        const col = 8;
        const row = 4;
        const colWidth = canvas.width / col;
        const rowHeight = canvas.height / row;
        const accumulatedColors: { r: number; g: number; b: number }[] = [];

        for (let i = 0; i < row; i++) {
          for (let j = 0; j < col; j++) {
            canvas.width = colWidth;
            canvas.height = rowHeight;

            context.clearRect(0, 0, colWidth, rowHeight);
            context.drawImage(
              clone,
              j * colWidth,
              i * rowHeight,
              colWidth,
              rowHeight,
              0,
              0,
              colWidth,
              rowHeight
            );

            accumulatedColors.push(
              getAverageColor(context, colWidth, rowHeight)
            );
          }
        }

        const { similar, newColors } = compareColorSimilarity(
          accumulatedColors,
          colorsRef.current
        );

        colorsRef.current = newColors;

        onCapture({
          clone,
          similar,
          w,
          h,
          colWidth,
          rowHeight,
          accumulatedColors,
        });

        context.clearRect(0, 0, w, h);
        updateProcessStatus("capture_end");
      } catch (e) {
        console.log(e);
      }
    },
    [setUpCanvas, getAverageColor, compareColorSimilarity, updateProcessStatus]
  );

  const captureSliced = useCallback(() => {
    const sliced = slicedRef.current;

    if (!sliced) {
      throw new Error("No sliced ref");
    }

    captureImage(({ w, colWidth, rowHeight, accumulatedColors }) => {
      while (sliced.firstChild) {
        sliced.lastChild && sliced.removeChild(sliced.lastChild);
      }

      sliced.style.width = w + "px";

      accumulatedColors.forEach(({ r, g, b }) => {
        let cell = document.createElement("div");
        cell.style.width = colWidth + "px";
        cell.style.height = rowHeight + "px";
        cell.style.backgroundColor = `rgb(${r},${g},${b})`;
        sliced.appendChild(cell);
      });
    });
  }, [captureImage]);


  // Check if frame is mostly black (all color values below threshold)
  const isBlackFrame = useCallback(
    (colors: { r: number; g: number; b: number }[]): boolean => {
      const BLACK_THRESHOLD = 15; // RGB values below this are considered black
      const BLACK_RATIO = 0.9; // 90% of cells must be black to skip frame

      const blackCells = colors.filter(
        ({ r, g, b }) => r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD
      );

      const isBlack = blackCells.length / colors.length >= BLACK_RATIO;
      if (isBlack) {
        console.log("Skipping black frame");
      }
      return isBlack;
    },
    []
  );

  const captureScene = useCallback(() => {
    const scene = sceneRef.current;
    const video = videoRef.current;

    // Stop polling if capture is complete
    if (captureCompleteRef.current || !scene || !video || !isProcessing) {
      return;
    }

    captureImage(async ({ clone, similar, accumulatedColors }) => {
      // Skip black frames only at the start (before first valid frame captured)
      if (!hasFirstValidFrameRef.current && isBlackFrame(accumulatedColors)) {
        return;
      }

      if (!similar) {
        hasFirstValidFrameRef.current = true; // Mark that we've captured a valid frame
        clone.toBlob(async (blob) => {
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            const timestamp = video.currentTime;
            setCapturedScenes((prev) => ({
              ...prev,
              [timestamp]: blobUrl,
            }));
          }
        }, "image/jpeg");
      }

      // Check for video end more aggressively
      if ((video.ended || video.paused) && !captureCompleteRef.current) {
        console.log("Video ended/paused - finalizing capture");
        captureCompleteRef.current = true;
        updateProcessStatus("video_end");
        updateProcessStatus("all_complete");
      }
    });
  }, [captureImage, updateProcessStatus, isProcessing, isBlackFrame]);

  usePollingEffect(captureScene, [isProcessing], {
    interval: 500, // Faster polling for smoother movement
    onCleanUp: () => {},
  });

  // Reset function to clear state for new processing (but preserve captured scenes)
  const resetCapture = useCallback(() => {
    captureCompleteRef.current = false;
    videoEndedRef.current = false;
    hasFirstValidFrameRef.current = false;
    setProcessStatus("idle");
    setLastEvent(null);
    colorsRef.current = [];
    // Note: NOT clearing setCapturedScenes - preserving blob URLs for pipeline
  }, []);

  // Separate function to fully clear everything (for complete reset)
  const clearAllCaptures = useCallback(() => {
    // Clean up blob URLs to prevent memory leaks
    Object.values(capturedScenes).forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });

    captureCompleteRef.current = false;
    videoEndedRef.current = false;
    hasFirstValidFrameRef.current = false;
    setCapturedScenes({});
    setProcessStatus("idle");
    setLastEvent(null);
    colorsRef.current = [];
  }, [capturedScenes]);

  return {
    canvasRef,
    captureSliced,
    sceneRef,
    videoRef,
    slicedRef,
    capturedScenes,
    processStatus,
    lastEvent,
    resetCapture,
    clearAllCaptures,
  };
};

export default useCaptureStills;
