/**
 * Walrus Storage Service
 *
 * Handles video uploads to Walrus decentralized storage
 * Free tier limit: 10 MiB per file
 */

// Walrus Configuration
const WALRUS_NETWORK = import.meta.env.VITE_WALRUS_NETWORK || "testnet";
const WALRUS_PUBLISHER = import.meta.env.VITE_WALRUS_PUBLISHER || getDefaultPublisher(WALRUS_NETWORK);
const WALRUS_AGGREGATOR = import.meta.env.VITE_WALRUS_AGGREGATOR || getDefaultAggregator(WALRUS_NETWORK);

// File size limits (10 MiB for free tier)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB in bytes
const MAX_FILE_SIZE_MB = 10;

function getDefaultPublisher(network: string): string {
  switch (network) {
    case "testnet":
      return "https://publisher.walrus-testnet.walrus.space";
    case "mainnet":
      return ""; // Mainnet requires authentication
    default:
      return "https://publisher.walrus-testnet.walrus.space";
  }
}

function getDefaultAggregator(network: string): string {
  switch (network) {
    case "testnet":
      return "https://aggregator.walrus-testnet.walrus.space";
    case "mainnet":
      return ""; // Mainnet requires authentication
    default:
      return "https://aggregator.walrus-testnet.walrus.space";
  }
}

// Walrus API Response Types
interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      storedEpoch: number;
      blobId: string;
      size: number;
      encodingType: string;
      certifiedEpoch: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
    };
    encodedSize: number;
    cost: number;
  };
  alreadyCertified?: {
    blobId: string;
    event: {
      txDigest: string;
      eventSeq: string;
    };
    endEpoch: number;
  };
}

export interface WalrusUploadResult {
  success: boolean;
  blobId?: string;
  objectId?: string;
  size?: number;
  cost?: number;
  message?: string;
  error?: string;
}

export const walrusStorage = {
  /**
   * Get current network configuration
   */
  getConfig: () => ({
    network: WALRUS_NETWORK,
    publisher: WALRUS_PUBLISHER,
    aggregator: WALRUS_AGGREGATOR,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE_MB,
  }),

  /**
   * Validate file size before upload
   */
  validateFileSize: (file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the ${MAX_FILE_SIZE_MB} MB limit for free tier`,
      };
    }
    return { valid: true };
  },

  /**
   * Upload a file to Walrus storage
   * @param file - File to upload (must be <= 10 MiB)
   * @param onProgress - Optional progress callback
   */
  async uploadFile(
    file: File,
    _onProgress?: (progress: number) => void
  ): Promise<WalrusUploadResult> {
    // Validate file size
    const validation = walrusStorage.validateFileSize(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    try {
      // Create upload URL
      const uploadUrl = `${WALRUS_PUBLISHER}/v1/blobs`;

      // Convert file to ArrayBuffer for proper upload
      const fileBuffer = await file.arrayBuffer();

      // Upload to Walrus
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: fileBuffer,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Upload failed with status ${response.status}: ${response.statusText}`,
        };
      }

      const data: WalrusUploadResponse = await response.json();

      // Check if newly created
      if (data.newlyCreated) {
        return {
          success: true,
          blobId: data.newlyCreated.blobObject.blobId,
          objectId: data.newlyCreated.blobObject.id,
          size: data.newlyCreated.blobObject.size,
          cost: data.newlyCreated.cost,
          message: "File uploaded successfully",
        };
      }
      // Check if already exists
      else if (data.alreadyCertified) {
        return {
          success: true,
          blobId: data.alreadyCertified.blobId,
          message: "File already exists in Walrus storage",
        };
      } else {
        return {
          success: false,
          error: "Unexpected response format from Walrus",
        };
      }
    } catch (error) {
      console.error("Walrus upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown upload error",
      };
    }
  },

  /**
   * Upload a blob (File or Blob)
   */
  async uploadBlob(
    blob: Blob,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<WalrusUploadResult> {
    const file = new File([blob], filename, { type: blob.type });
    return walrusStorage.uploadFile(file, onProgress);
  },

  /**
   * Get download URL for a blob
   */
  getBlobUrl(blobId: string): string {
    return `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;
  },

  /**
   * Download a file from Walrus
   * @param blobId - The blob ID to download
   * @param signal - Optional AbortSignal for cancellation
   */
  async downloadFile(blobId: string, signal?: AbortSignal): Promise<Blob | null> {
    try {
      // Use backend proxy to avoid CORS issues with Walrus
      // Walrus blocks requests with Origin: localhost
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
      const url = `${backendUrl}/api/storage/proxy/${blobId}`;
      console.log(`[Walrus] Downloading via proxy: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read error");
        console.error(`[Walrus] Download failed: ${response.status} ${response.statusText}`);
        console.error(`[Walrus] Error body:`, errorText);
        return null;
      }

      console.log(`[Walrus] ✓ Downloaded blob ${blobId}`);
      return await response.blob();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log(`[Walrus] Download aborted for ${blobId}`);
        return null;
      }
      console.error(`[Walrus] Download error for ${blobId}:`, error);
      return null;
    }
  },

  /**
   * Check if a blob exists
   */
  async blobExists(blobId: string): Promise<boolean> {
    try {
      const url = walrusStorage.getBlobUrl(blobId);
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      console.error("Failed to check blob existence:", error);
      return false;
    }
  },

  /**
   * Upload video package (video + metadata files)
   */
  async uploadVideoPackage(
    video: File,
    metadata: {
      manifest: any;
      captions?: string;
      scenes?: Blob[];
      ttsAudio?: Blob;
    },
    onProgress?: (overall: number, file: string) => void
  ): Promise<{
    success: boolean;
    videoId?: string;
    blobIds?: {
      video: string;
      manifest: string;
      captions?: string;
      ttsAudio?: string;
      scenes?: string[];
    };
    error?: string;
  }> {
    try {
      const blobIds: any = {};
      let totalFiles = 1; // video
      if (metadata.captions) totalFiles++;
      if (metadata.ttsAudio) totalFiles++;
      if (metadata.scenes?.length) totalFiles += metadata.scenes.length;
      totalFiles++; // manifest

      let completedFiles = 0;

      // Upload video
      const videoResult = await walrusStorage.uploadFile(video, (progress) => {
        const overall = ((completedFiles + progress / 100) / totalFiles) * 100;
        onProgress?.(overall, "video");
      });

      if (!videoResult.success) {
        return {
          success: false,
          error: `Failed to upload video: ${videoResult.error}`,
        };
      }

      blobIds.video = videoResult.blobId;
      completedFiles++;

      // Upload captions if exists
      if (metadata.captions) {
        const captionsBlob = new Blob([metadata.captions], { type: "text/plain" });
        const captionsResult = await walrusStorage.uploadBlob(
          captionsBlob,
          "captions.srt",
          (progress) => {
            const overall = ((completedFiles + progress / 100) / totalFiles) * 100;
            onProgress?.(overall, "captions");
          }
        );

        if (captionsResult.success) {
          blobIds.captions = captionsResult.blobId;
        }
        completedFiles++;
      }

      // Upload TTS audio if exists
      if (metadata.ttsAudio) {
        const ttsResult = await walrusStorage.uploadBlob(
          metadata.ttsAudio,
          "tts-audio.wav",
          (progress) => {
            const overall = ((completedFiles + progress / 100) / totalFiles) * 100;
            onProgress?.(overall, "tts-audio");
          }
        );

        if (ttsResult.success) {
          blobIds.ttsAudio = ttsResult.blobId;
        }
        completedFiles++;
      }

      // Upload scene images
      if (metadata.scenes?.length) {
        blobIds.scenes = [];
        for (let i = 0; i < metadata.scenes.length; i++) {
          const sceneResult = await walrusStorage.uploadBlob(
            metadata.scenes[i],
            `scene-${String(i + 1).padStart(3, "0")}.jpg`,
            (progress) => {
              const overall = ((completedFiles + progress / 100) / totalFiles) * 100;
              onProgress?.(overall, `scene-${i + 1}`);
            }
          );

          if (sceneResult.success) {
            blobIds.scenes.push(sceneResult.blobId);
          }
          completedFiles++;
        }
      }

      // Upload manifest (includes all blob IDs)
      const manifestData = {
        ...metadata.manifest,
        blobIds,
        uploadTime: Date.now(),
      };

      const manifestBlob = new Blob([JSON.stringify(manifestData, null, 2)], {
        type: "application/json",
      });

      const manifestResult = await walrusStorage.uploadBlob(
        manifestBlob,
        "manifest.json",
        (progress) => {
          const overall = ((completedFiles + progress / 100) / totalFiles) * 100;
          onProgress?.(overall, "manifest");
        }
      );

      if (!manifestResult.success) {
        return {
          success: false,
          error: `Failed to upload manifest: ${manifestResult.error}`,
        };
      }

      blobIds.manifest = manifestResult.blobId;

      return {
        success: true,
        videoId: videoResult.blobId!,
        blobIds,
      };
    } catch (error) {
      console.error("Video package upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

// Named exports for convenience
export const { downloadFile, uploadFile, uploadBlob, getBlobUrl, blobExists } = walrusStorage;

export default walrusStorage;
