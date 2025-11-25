import { useState, useEffect } from "react";
import { loadVideoPackageFromWalrus } from "@/services/walrus-video-loader";

interface MetadataTable {
  id: string;
  title: string;
  description: string;
  summary: string;
  cover: string;
  uploadedBy: string;
  createAt: Date | string;
  videoUrl?: string; // Blob URL for the video
  scenes?: Array<{
    description: string;
    keywords: string[];
  }>;
  capturedimgs?: string[];
}

export function useMetadata() {
  const [metadata, setMetadata] = useState<MetadataTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = async () => {
    setIsLoading(true);
    try {
      // Load video package from Walrus (currently loading from local zip)
      const videoPackage = await loadVideoPackageFromWalrus('dummy-blob-id');

      // Transform to MetadataTable format
      const transformedData: MetadataTable = {
        id: videoPackage.manifest.id,
        title: videoPackage.manifest.title,
        description: videoPackage.manifest.description,
        summary: videoPackage.manifest.summary,
        cover: videoPackage.sceneUrls[0] || "", // Use first scene as cover
        uploadedBy: videoPackage.manifest.uploadedBy,
        createAt: new Date(videoPackage.manifest.uploadTime),
        videoUrl: videoPackage.videoUrl, // Blob URL for the video
        scenes: videoPackage.manifest.scenes,
        capturedimgs: videoPackage.sceneUrls, // All scene URLs
      };

      setMetadata([transformedData]);
      setError(null);
    } catch (err) {
      console.error("Error fetching metadata:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  return {
    metadata,
    isLoading,
    error,
    refetch: fetchMetadata
  };
} 