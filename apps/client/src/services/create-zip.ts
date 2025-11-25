import { zipSync } from "fflate";

/**
 * Creates a ZIP file containing video index package files
 * @param videoFile - The video file (MP4)
 * @param srtContent - SRT caption content as string
 * @param manifestContent - Manifest JSON content as string
 * @param sceneImages - Array of scene image URLs
 * @param audioFiles - Array of individual audio file URLs
 * @returns Blob containing the ZIP file
 */
export async function createVideoIndexZip(
  videoFile: File,
  srtContent: string,
  manifestContent: string,
  sceneImages: { imageUrl: string; index: number }[],
  audioFiles: { audioUrl: string; index: number }[],
): Promise<Blob> {
  // Convert files to Uint8Array for fflate
  const videoData = new Uint8Array(await videoFile.arrayBuffer());
  const srtData = new TextEncoder().encode(srtContent);
  const manifestData = new TextEncoder().encode(manifestContent);

  // Fetch and convert all scene images
  const sceneData: Record<string, [Uint8Array, { level: number }]> = {};
  for (const scene of sceneImages) {
    const response = await fetch(scene.imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const imageData = new Uint8Array(imageBuffer);
    sceneData[`scenes/scene-${String(scene.index + 1).padStart(3, "0")}.png`] = [
      imageData,
      { level: 0 }, // No compression for images
    ];
  }

  // Fetch and convert all individual audio files
  const audioData_individual: Record<string, [Uint8Array, { level: number }]> = {};
  for (const audio of audioFiles) {
    const response = await fetch(audio.audioUrl);
    const audioBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    audioData_individual[`audio/audio-${String(audio.index + 1).padStart(3, "0")}.wav`] = [
      audioBytes,
      { level: 0 }, // No compression for audio
    ];
  }

  // Create ZIP using synchronous API (simpler and works well for <10MB files)
  // Using compression level 0 for video/audio/images (already compressed)
  // Using compression level 9 for text files (SRT, JSON)
  const zipped = zipSync({
    "video.mp4": [videoData, { level: 0 }], // No compression for video
    "captions.srt": [srtData, { level: 9 }], // Max compression for text
    "manifest.json": [manifestData, { level: 9 }], // Max compression for JSON
    ...sceneData, // Add all scene images
    ...audioData_individual, // Add all individual audio files
  });

  return new Blob([zipped as BlobPart], { type: "application/zip" });
}
