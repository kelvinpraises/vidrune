/**
 * Chunked Upload Service
 * 
 * Uploads video assets individually to Walrus for fast streaming and selective loading
 * - Video uploaded separately for direct streaming
 * - Captions uploaded separately for quick access
 * - Scenes uploaded individually for lazy loading
 * - Audio files bundled into audio.zip
 */

import { zipSync } from "fflate";
import { walrusStorage } from "./walrus-storage";

export interface AssetManifest {
  version: "1.0";
  videoId: string;
  title: string;
  description: string;
  uploadedBy: string;
  uploadTime: number;
  
  assets: {
    video: string;        // Walrus blob ID for video.mp4
    captions: string;     // Walrus blob ID for captions.srt
    scenes: string[];     // Array of Walrus blob IDs (individual PNGs)
    audio: string;        // Walrus blob ID for audio.zip (all audio files zipped)
  };
  
  // Rich metadata for display
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
  
  metadata: {
    duration: number;
    sceneCount: number;
    totalSize: number;
    videoSize: number;
    captionsSize: number;
    scenesTotalSize: number;
    audioZipSize: number;
    processing: {
      captionModel: string;
      sceneDetection: string;
      ttsModel: string;
    };
  };
}

export interface UploadProgress {
  stage: 'video' | 'captions' | 'scenes' | 'audio' | 'manifest';
  current: number;
  total: number;
  fileName?: string;
  percentage: number;
}

export interface ChunkedUploadResult {
  success: boolean;
  manifestBlobId?: string;
  manifest?: AssetManifest;
  error?: string;
}

/**
 * Upload video package with individual assets
 */
export async function uploadVideoPackage(
  video: File,
  captions: string,
  scenes: Blob[],
  audioFiles: Blob[],
  metadata: {
    videoId: string;
    title: string;
    description: string;
    uploadedBy: string;
    duration: number;
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
    processing: {
      captionModel: string;
      sceneDetection: string;
      ttsModel: string;
    };
  },
  onProgress?: (progress: UploadProgress) => void
): Promise<ChunkedUploadResult> {
  try {
    const uploadTime = Date.now();
    let totalSize = 0;
    
    // Track sizes
    const videoSize = video.size;
    const captionsSize = new Blob([captions]).size;
    
    // 1. Upload video
    onProgress?.({
      stage: 'video',
      current: 0,
      total: 1,
      fileName: video.name,
      percentage: 0
    });
    
    const videoResult = await walrusStorage.uploadFile(video);
    if (!videoResult.success || !videoResult.blobId) {
      throw new Error(`Video upload failed: ${videoResult.error}`);
    }
    totalSize += videoSize;
    
    onProgress?.({
      stage: 'video',
      current: 1,
      total: 1,
      fileName: video.name,
      percentage: 100
    });
    
    // 2. Upload captions
    onProgress?.({
      stage: 'captions',
      current: 0,
      total: 1,
      fileName: 'captions.srt',
      percentage: 0
    });
    
    const captionsBlob = new Blob([captions], { type: 'text/plain' });
    const captionsResult = await walrusStorage.uploadBlob(captionsBlob, 'captions.srt');
    if (!captionsResult.success || !captionsResult.blobId) {
      throw new Error(`Captions upload failed: ${captionsResult.error}`);
    }
    totalSize += captionsSize;
    
    onProgress?.({
      stage: 'captions',
      current: 1,
      total: 1,
      fileName: 'captions.srt',
      percentage: 100
    });
    
    // 3. Upload scenes individually
    const sceneBlobIds: string[] = [];
    let scenesTotalSize = 0;
    
    for (let i = 0; i < scenes.length; i++) {
      const sceneFileName = `scene-${String(i + 1).padStart(3, '0')}.png`;
      
      onProgress?.({
        stage: 'scenes',
        current: i,
        total: scenes.length,
        fileName: sceneFileName,
        percentage: Math.round((i / scenes.length) * 100)
      });
      
      const sceneResult = await walrusStorage.uploadBlob(scenes[i], sceneFileName);
      if (!sceneResult.success || !sceneResult.blobId) {
        console.warn(`Scene ${i + 1} upload failed, skipping:`, sceneResult.error);
        continue;
      }
      
      sceneBlobIds.push(sceneResult.blobId);
      scenesTotalSize += scenes[i].size;
    }
    
    totalSize += scenesTotalSize;
    
    onProgress?.({
      stage: 'scenes',
      current: scenes.length,
      total: scenes.length,
      fileName: 'all scenes',
      percentage: 100
    });
    
    // 4. Create and upload audio.zip
    onProgress?.({
      stage: 'audio',
      current: 0,
      total: 1,
      fileName: 'audio.zip',
      percentage: 0
    });
    
    const audioZipBlob = await createAudioZip(audioFiles);
    const audioZipResult = await walrusStorage.uploadBlob(audioZipBlob, 'audio.zip');
    if (!audioZipResult.success || !audioZipResult.blobId) {
      throw new Error(`Audio zip upload failed: ${audioZipResult.error}`);
    }
    
    const audioZipSize = audioZipBlob.size;
    totalSize += audioZipSize;
    
    onProgress?.({
      stage: 'audio',
      current: 1,
      total: 1,
      fileName: 'audio.zip',
      percentage: 100
    });
    
    // 5. Create and upload manifest
    onProgress?.({
      stage: 'manifest',
      current: 0,
      total: 1,
      fileName: 'manifest.json',
      percentage: 0
    });
    
    const manifest: AssetManifest = {
      version: "1.0",
      videoId: metadata.videoId,
      title: metadata.title,
      description: metadata.description,
      uploadedBy: metadata.uploadedBy,
      uploadTime,
      
      assets: {
        video: videoResult.blobId,
        captions: captionsResult.blobId,
        scenes: sceneBlobIds,
        audio: audioZipResult.blobId,
      },
      
      // Include rich metadata
      summary: metadata.summary,
      scenes: metadata.scenes,
      searchableContent: metadata.searchableContent,
      
      metadata: {
        duration: metadata.duration,
        sceneCount: scenes.length,
        totalSize,
        videoSize,
        captionsSize,
        scenesTotalSize,
        audioZipSize,
        processing: metadata.processing,
      },
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    
    const manifestResult = await walrusStorage.uploadBlob(manifestBlob, 'manifest.json');
    if (!manifestResult.success || !manifestResult.blobId) {
      throw new Error(`Manifest upload failed: ${manifestResult.error}`);
    }
    
    onProgress?.({
      stage: 'manifest',
      current: 1,
      total: 1,
      fileName: 'manifest.json',
      percentage: 100
    });
    
    return {
      success: true,
      manifestBlobId: manifestResult.blobId,
      manifest,
    };
    
  } catch (error) {
    console.error('Chunked upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Create audio.zip from audio files
 */
async function createAudioZip(audioFiles: Blob[]): Promise<Blob> {
  const audioData: Record<string, [Uint8Array, { level: 0 }]> = {};
  
  for (let i = 0; i < audioFiles.length; i++) {
    const audioBuffer = await audioFiles[i].arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    const fileName = `audio-${String(i + 1).padStart(3, '0')}.wav`;
    audioData[fileName] = [audioBytes, { level: 0 }]; // No compression for audio
  }
  
  const zipped = zipSync(audioData);
  return new Blob([zipped as BlobPart], { type: 'application/zip' });
}

/**
 * Load manifest from Walrus
 */
export async function loadManifest(manifestBlobId: string): Promise<AssetManifest | null> {
  try {
    const blob = await walrusStorage.downloadFile(manifestBlobId);
    if (!blob) {
      throw new Error('Failed to download manifest');
    }
    
    const text = await blob.text();
    const manifest = JSON.parse(text) as AssetManifest;
    
    return manifest;
  } catch (error) {
    console.error('Failed to load manifest:', error);
    return null;
  }
}

/**
 * Get direct Walrus URL for an asset
 */
export function getAssetUrl(blobId: string): string {
  return walrusStorage.getBlobUrl(blobId);
}
