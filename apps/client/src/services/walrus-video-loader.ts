import { unzipSync } from 'fflate';

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
 * @param _blobId - Walrus blob ID for the video package (unused in mock implementation)
 * @returns Video package with all assets
 */
export async function loadVideoPackageFromWalrus(_blobId: string): Promise<VideoPackage> {
  // TODO: Replace with actual Walrus aggregator URL when integrated
  // const walrusUrl = `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`;

  // For now: load from local zip file (will be replaced with Walrus fetch)
  const zipResponse = await fetch('/vidrune.zip');
  const zipBuffer = await zipResponse.arrayBuffer();
  const decompressed = unzipSync(new Uint8Array(zipBuffer));

  // Read manifest.json from decompressed files
  const manifestData = decompressed['manifest.json'];
  const manifest: VideoManifest = JSON.parse(
    new TextDecoder().decode(manifestData)
  );

  // Create blob URLs from decompressed files
  const videoData = decompressed[manifest.assets.video];
  const videoBlob = new Blob([videoData.buffer as ArrayBuffer], { type: 'video/mp4' });
  const videoUrl = URL.createObjectURL(videoBlob);

  const captionsText = new TextDecoder().decode(decompressed[manifest.assets.captions]);

  // Scene URLs - dynamically map from manifest
  const sceneUrls = manifest.assets.scenes.map(scenePath => {
    const sceneData = decompressed[scenePath];
    const sceneBlob = new Blob([sceneData.buffer as ArrayBuffer], { type: 'image/png' });
    return URL.createObjectURL(sceneBlob);
  });

  // Audio URLs - dynamically map from manifest
  const audioUrls = manifest.assets.audio.map(audioPath => {
    const audioData = decompressed[audioPath];
    const audioBlob = new Blob([audioData.buffer as ArrayBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(audioBlob);
  });

  return {
    manifest,
    videoUrl,
    captionsText,
    sceneUrls,
    audioUrls,
  };
}

/**
 * Get list of all video packages
 * @returns Array of video manifests
 */
export async function listVideoPackages(): Promise<VideoManifest[]> {
  // TODO: Fetch from SUI smart contract registry
  // const registry = await fetchVideoRegistry();

  // For now: return single video from local zip
  const videoPackage = await loadVideoPackageFromWalrus('dummy-blob-id');
  return [videoPackage.manifest];
}
