import { useCallback, useEffect, useState } from "react";
import { icStorage } from "@/library/services/ic-storage";

interface SignedUrlResponse {
  url: string;
  data: JSON | string | Blob;
  contentType: string | null;
}

export const useGetVideoCID = () => {
  const [blobURL, setBlobURL] = useState<string>("");

  useEffect(() => {
    return () => {
      if (blobURL) {
        URL.revokeObjectURL(blobURL);
      }
    };
  }, [blobURL]);
  
  const getVideoCIDData = useCallback(
    async (videoCID: string): Promise<SignedUrlResponse | undefined> => {
      try {
        const url = icStorage.getVideoUrl(`/videos/${videoCID}`);
        const response = await fetch(url);
        const data = await response.blob();
        const contentType = response.headers.get("content-type");

        return { url, data, contentType };
      } catch (error) {
        console.error("Error fetching video from IC storage:", error);
        throw error;
      }
    },
    []
  );

  return { getVideoCIDData };
};
