import bufferToWav from "audiobuffer-to-wav";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const useAudioExtractor = () => {
  const [audioBlob, setAudiBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const extractAudio = async (videoData: Blob) => {
    setIsLoading(true);
    setError(null);

    try {
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(
        await videoData.arrayBuffer()
      );

      const wavBuffer = bufferToWav(audioBuffer);
      const blob = new Blob([new DataView(wavBuffer)], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      setAudiBlob(blob);
      setAudioUrl(url);
      toast.success("Audio extracted and converted successfully");

      return { audioBlob: blob, audioUrl: url };
    } catch (error: unknown) {
      console.error("Error in audio mining:", error);
      if (error instanceof Error) {
        setError(error.message);
        toast.error(`Failed to extract audio: ${error.message}`);
      } else {
        setError("An unknown error occurred");
        toast.error("Failed to extract audio: An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    extractAudio,
    audioBlob,
    audioUrl,
    isLoading,
    error,
  };
};
