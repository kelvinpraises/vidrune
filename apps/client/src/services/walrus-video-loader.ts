import { getAllVideoIds, getVideo } from "@/services/contracts";
import { loadManifest, getAssetUrl, type AssetManifest } from "@/services/chunked-upload";

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
    audio: string;
  };
  summary?: string;
  scenes?: Array<{
    description: string;
    keywords: string[];
  }>;
  searchableContent?: {
    transcription: string;
    sceneDescriptions: string;
    ttsContent: string;
  };
  duration?: number;
  sceneCount?: number;
}

export interface VideoPackage {
  manifest: VideoManifest;
  videoUrl: string;
  captionsUrl: string;
  captionsText?: string;
  sceneUrls: string[];
  audioZipUrl: string;
}

/**
 * Load a video package from Walrus storage (manifest-based)
 * @param manifestBlobId - Walrus blob ID for the manifest.json
 * @returns Video package with all asset URLs
 * @throws Error if blob not found or invalid
 */
export async function loadVideoPackageFromWalrus(manifestBlobId: string): Promise<VideoPackage> {
  try {
    // Load manifest from Walrus
    const assetManifest = await loadManifest(manifestBlobId);
    
    if (!assetManifest) {
      throw new Error(`Manifest ${manifestBlobId} not found in Walrus storage`);
    }

    // Convert AssetManifest to VideoManifest format
    const manifest: VideoManifest = {
      id: assetManifest.videoId,
      title: assetManifest.title,
      uploadedBy: assetManifest.uploadedBy,
      description: assetManifest.description,
      uploadTime: assetManifest.uploadTime,
      assetBaseUrl: "", // Not needed with direct blob IDs
      assets: {
        video: assetManifest.assets.video,
        captions: assetManifest.assets.captions,
        scenes: assetManifest.assets.scenes,
        audio: assetManifest.assets.audio,
      },
      summary: assetManifest.summary,
      scenes: assetManifest.scenes,
      searchableContent: assetManifest.searchableContent,
      duration: assetManifest.metadata.duration,
      sceneCount: assetManifest.metadata.sceneCount,
    };

    // Generate direct Walrus URLs for assets
    const videoUrl = getAssetUrl(assetManifest.assets.video);
    const captionsUrl = getAssetUrl(assetManifest.assets.captions);
    const sceneUrls = assetManifest.assets.scenes.map(blobId => getAssetUrl(blobId));
    const audioZipUrl = getAssetUrl(assetManifest.assets.audio);

    return {
      manifest,
      videoUrl,
      captionsUrl,
      sceneUrls,
      audioZipUrl,
    };
  } catch (error) {
    // Re-throw with more context
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load video package ${manifestBlobId}: ${errorMsg}`);
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
