import { JSX, useEffect, useState, useRef } from "react";

import Canvas from "@/library/components/molecules/canvas";
import useCaptureStills from "@/library/hooks/use-capture-stills";
import { useGetVideoCID } from "@/library/hooks/use-get-videoCID";

interface AudioVideoMinerProps {
  videoCID: string;
  onComplete: (capturedImages: string[], extractedAudio: Blob) => void;
}

const AudioVideoMiner = ({
  videoCID,
  onComplete,
}: AudioVideoMinerProps): JSX.Element => {
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const hasCompletedRef = useRef(false);

  const { getVideoCIDData } = useGetVideoCID();
  const {
    canvasRef,
    captureSliced,
    sceneRef,
    videoRef,
    slicedRef,
    stopPolling,
    startPolling,
    capturedImages,
    capturedScenes,
    processStatus,
    lastEvent,
  } = useCaptureStills();

  useEffect(() => {
    if (lastEvent === "all_complete" && videoBlob && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete(capturedImages, videoBlob);
    }
  }, [lastEvent, processStatus, capturedImages, videoBlob]);

  useEffect(() => {
    const fetchData = async () => {
      if (videoCID) {
        startPolling();
        try {
          const response = await getVideoCIDData(videoCID);
          if (response?.url) {
            setVideoUrl(response.url);
            if (response.data instanceof Blob) {
              setVideoBlob(response.data);
            } else {
              console.error("Invalid data type for audio extraction");
            }
          } else {
            // TODO: Implement proper error handling
            console.error("Video URL didn't load");
          }
        } catch (error) {
          console.error("Error fetching videoCID data:", error);
        }
      }
    };

    fetchData();

    return () => {
      stopPolling();
    };
  }, [videoCID, startPolling, stopPolling, getVideoCIDData]);

  return (
    <div>
      <Canvas {...{ canvasRef }} />

      <div className="mb-4">
        <button
          onClick={() => setIsVideoVisible(!isVideoVisible)}
          className="bg-[#550EFB] hover:bg-[#360C99] text-white rounded px-4 py-2"
        >
          {isVideoVisible ? "Hide Video Player" : "Show Video Player"}
        </button>
      </div>

      {videoUrl && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isVideoVisible ? "max-h-[500px]" : "max-h-0"
          }`}
        >
          <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
            <video
              crossOrigin="anonymous"
              ref={videoRef}
              controls={false}
              autoPlay
              muted
              preload="none"
              width="560px"
              height="315px"
            >
              <source src={videoUrl} type="video/mp4" />
            </video>

            <div
              ref={slicedRef}
              style={{ display: "flex", flexWrap: "wrap" }}
            ></div>
            <div
              ref={sceneRef}
              style={{ display: "flex", flexWrap: "wrap" }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioVideoMiner;
