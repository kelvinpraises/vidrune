import { useEffect, useState } from "react";

import { listVideoPackages } from "@/services/walrus-video-loader";

interface MetadataTable {
  id: string;
  title: string;
  description: string;
  summary: string;
  cover: string;
  uploadedBy: string;
  createAt: Date | string;
  videoUrl?: string;
  scenes?: Array<{
    description: string;
    keywords: string[];
  }>;
  capturedimgs?: string[];
}

// Module-level cache - survives component remounts
let cachedMetadata: MetadataTable[] | null = null;
let fetchPromise: Promise<MetadataTable[]> | null = null;

async function fetchOnce(): Promise<MetadataTable[]> {
  // Return cache if available
  if (cachedMetadata !== null) {
    return cachedMetadata;
  }

  // Return existing promise if fetch in progress (deduplication)
  if (fetchPromise !== null) {
    return fetchPromise;
  }

  // Start new fetch
  fetchPromise = (async () => {
    console.log("[useMetadata] Fetching video packages...");
    const videoPackages = await listVideoPackages();

    const transformed = videoPackages.map((pkg) => ({
      id: pkg.manifest.id,
      title: pkg.manifest.title,
      description: pkg.manifest.description,
      summary: pkg.manifest.summary || "",
      cover: pkg.sceneUrls && pkg.sceneUrls.length > 0 ? pkg.sceneUrls[0] : "",
      uploadedBy: pkg.manifest.uploadedBy,
      createAt: new Date(pkg.manifest.uploadTime),
      videoUrl: pkg.videoUrl,
      scenes: pkg.manifest.scenes,
      capturedimgs: pkg.sceneUrls,
    }));

    cachedMetadata = transformed;
    console.log(`[useMetadata] Cached ${transformed.length} videos`);
    return transformed;
  })();

  return fetchPromise;
}

export function useMetadata() {
  const [metadata, setMetadata] = useState<MetadataTable[]>(cachedMetadata || []);
  const [isLoading, setIsLoading] = useState(cachedMetadata === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already cached, use it immediately
    if (cachedMetadata !== null) {
      setMetadata(cachedMetadata);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    fetchOnce()
      .then((data) => {
        if (!cancelled) {
          setMetadata(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = async () => {
    // Clear cache and refetch
    cachedMetadata = null;
    fetchPromise = null;
    setIsLoading(true);
    try {
      const data = await fetchOnce();
      setMetadata(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return { metadata, isLoading, error, refetch };
}
