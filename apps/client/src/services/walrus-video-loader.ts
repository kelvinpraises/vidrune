import { unzipSync } from "fflate";

import { getAllVideoIds, getVideo } from "@/services/contracts";

export interface VideoManifest {
  id: string;
  title: string;
  uploadedBy: string;
  description: string;
  uploadTime: number;
  assetBaseUrl: string;
  assets: {
    video: string;
    captions: string;
    scenes: string[];
    audio: string[];
  };
  summary: string;
  scenes: Array<{
    description: string;
    keywords: string[];
  }>;
  searchableContent: {
    transcription: string;
    sceneDescriptions: string;
    ttsContent: string;
  };
}

export interface VideoPackage {
  manifest: VideoManifest;
  videoUrl: string;
  captionsText: string;
  sceneUrls: string[];
  audioUrls: string[];
}

/**
 * Load a video package from Walrus storage
 * @param blobId - Walrus blob ID for the video package
 * @returns Video package with all assets
 * @throws Error if blob not found or invalid
 */
export async function loadVideoPackageFromWalrus(blobId: string): Promise<VideoPackage> {
  // Download directly from Walrus (no backend proxy needed)
  const { downloadFile } = await import("@/services/walrus-storage");
  
  try {
    const blob = await downloadFile(blobId);

    if (!blob) {
      throw new Error(`Blob ${blobId} not found in Walrus storage (404)`);
    }

    const zipBuffer = await blob.arrayBuffer();
  const decompressed = unzipSync(new Uint8Array(zipBuffer));

  // Read manifest.json from decompressed files
  const manifestData = decompressed["manifest.json"];
  if (!manifestData) {
    throw new Error("Invalid package: manifest.json not found");
  }

  const manifest: VideoManifest = JSON.parse(new TextDecoder().decode(manifestData));

  // Create blob URLs from decompressed files
  // Helper to get blob URL for a file in the zip
  const getBlobUrl = (path: string, type: string) => {
    const data = decompressed[path];
    if (!data) {
      console.warn(`Asset not found in zip: ${path}`);
      return "";
    }
    const blob = new Blob([data.buffer as ArrayBuffer], { type });
    return URL.createObjectURL(blob);
  };

  const videoUrl = getBlobUrl(manifest.assets.video || "video.mp4", "video/mp4");

  const captionsData = decompressed[manifest.assets.captions || "captions.srt"];
  const captionsText = captionsData ? new TextDecoder().decode(captionsData) : "";

  // Scene URLs
  const sceneUrls = (manifest.assets.scenes || []).map((scenePath) =>
    getBlobUrl(scenePath, "image/png")
  );

  // Audio URLs
  const audioUrls = (manifest.assets.audio || []).map((audioPath) =>
    getBlobUrl(audioPath, "audio/wav")
  );

  return {
    manifest,
    videoUrl,
    captionsText,
    sceneUrls,
    audioUrls,
  };
  } catch (error) {
    // Re-throw with more context
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load video package ${blobId}: ${errorMsg}`);
  }
}

/**
 * Get list of all video packages
 * @returns Array of VideoPackage (not just manifests, so we have assets)
 */
export async function listVideoPackages(): Promise<VideoPackage[]> {
  try {
    const videoIds = await getAllVideoIds();
    const packages: VideoPackage[] = [];

    console.log(`Found ${videoIds.length} videos on blockchain, loading packages...`);

    for (const id of videoIds) {
      try {
        const video = (await getVideo(id)) as any;
        // video is [id, walrusBlobId, uploader, uploadTime, convictionPeriodEnd, status, convictions]
        const walrusBlobId = video.walrusBlobId || video[1];

        console.log(`[VideoLoader] Video ${id}:`, {
          id: video.id || video[0],
          walrusBlobId: walrusBlobId,
          uploader: video.uploader || video[2],
          status: video.status || video[5],
        });

        if (!walrusBlobId || walrusBlobId === '0x0' || walrusBlobId === '') {
          console.warn(`[VideoLoader] Video ${id} has no valid blob ID, skipping...`);
          continue;
        }

        // Load full package to get assets (images, etc)
        console.log(`[VideoLoader] Loading video package ${id} from Walrus blob ${walrusBlobId}...`);
        const pkg = await loadVideoPackageFromWalrus(walrusBlobId);
        
        // IMPORTANT: Override manifest.id with blockchain videoId for conviction period checks
        // The manifest.id is generated locally (video_timestamp), but blockchain uses blobId
        pkg.manifest.id = id;
        
        packages.push(pkg);
        console.log(`[VideoLoader] ✓ Loaded video ${id}`);
      } catch (err) {
        // Gracefully handle missing blobs - don't crash the entire page
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`⚠️  Failed to load video ${id}: ${errorMsg}`);
        
        // Check if it's a 404 (blob not found)
        if (errorMsg.includes('404') || errorMsg.includes('NOT_FOUND') || errorMsg.includes('not found')) {
          console.warn(`   → Blob does not exist in Walrus (may be test data or expired)`);
        }
        // Continue loading other videos
      }
    }

    console.log(`Successfully loaded ${packages.length} out of ${videoIds.length} videos`);
    return packages;
  } catch (error) {
    console.error("Failed to list video packages:", error);
    return [];
  }
}
