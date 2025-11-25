import { describe, test, expect } from "vitest";
import { walrusStorage } from "./walrus-storage";

// Helper to create text files using TextEncoder
function createTextFile(content: string, name = "test.txt"): File {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return new File([data], name, { type: "text/plain" });
}

// Helper to create large files using ArrayBuffer
function createLargeFile(sizeInMB: number, name = "large-file.bin"): File {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  const buffer = new ArrayBuffer(sizeInBytes);
  const view = new Uint8Array(buffer);

  // Fill with repeating pattern for verification
  for (let i = 0; i < sizeInBytes; i++) {
    view[i] = i % 256;
  }

  return new File([buffer], name, { type: "application/octet-stream" });
}

// Helper to decode blob to text
async function blobToText(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// Helper to compare binary content (browser-only)
async function compareContent(file: File, downloadedBlob: Blob): Promise<boolean> {
  const originalBuffer = await file.arrayBuffer();
  const downloadedBuffer = await downloadedBlob.arrayBuffer();

  if (originalBuffer.byteLength !== downloadedBuffer.byteLength) {
    console.error(
      `Size mismatch: original=${originalBuffer.byteLength}, downloaded=${downloadedBuffer.byteLength}`
    );
    return false;
  }

  const originalArray = new Uint8Array(originalBuffer);
  const downloadedArray = new Uint8Array(downloadedBuffer);

  for (let i = 0; i < originalArray.length; i++) {
    if (originalArray[i] !== downloadedArray[i]) {
      console.error(`Byte mismatch at position ${i}: original=${originalArray[i]}, downloaded=${downloadedArray[i]}`);
      return false;
    }
  }

  return true;
}

describe("Walrus Storage - Real Upload/Download Integration", () => {
  // Set longer timeout for network operations
  const TEST_TIMEOUT = 60000;

  describe("File size validation (no network)", () => {
    test("should reject files over 10 MiB", () => {
      const largeFile = createLargeFile(11);
      const result = walrusStorage.validateFileSize(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds the 10 MB limit");
    });

    test("should accept files at exactly 10 MiB", () => {
      const file = createLargeFile(10);
      const result = walrusStorage.validateFileSize(file);

      expect(result.valid).toBe(true);
    });

    test("should accept small files", () => {
      const file = createTextFile("Hello");
      const result = walrusStorage.validateFileSize(file);

      expect(result.valid).toBe(true);
    });
  });

  describe("Upload and Download Integrity", () => {
    test(
      "should upload and download simple text with exact match",
      async () => {
        const originalContent = "Hello, Walrus Storage!";
        const file = createTextFile(originalContent, "simple.txt");

        // Upload
        const uploadResult = await walrusStorage.uploadFile(file);
        expect(uploadResult.success).toBe(true);
        expect(uploadResult.blobId).toBeDefined();

        const blobId = uploadResult.blobId!;

        // Download
        const downloadedBlob = await walrusStorage.downloadFile(blobId);
        expect(downloadedBlob).not.toBeNull();

        // Verify content
        const downloadedText = await blobToText(downloadedBlob!);
        expect(downloadedText).toBe(originalContent);

        // Verify byte-by-byte
        const isIdentical = await compareContent(file, downloadedBlob!);
        expect(isIdentical).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      "should preserve multiline text with UTF-8 characters",
      async () => {
        const originalContent = `Line 1: English
Line 2: Emoji 🌍🚀
Line 3: Chinese 你好世界
Line 4: Japanese こんにちは
Line 5: Arabic مرحبا`;

        const file = createTextFile(originalContent, "multilingual.txt");

        const uploadResult = await walrusStorage.uploadFile(file);
        expect(uploadResult.success).toBe(true);

        const downloadedBlob = await walrusStorage.downloadFile(uploadResult.blobId!);
        const downloadedText = await blobToText(downloadedBlob!);

        expect(downloadedText).toBe(originalContent);

        const isIdentical = await compareContent(file, downloadedBlob!);
        expect(isIdentical).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      "should preserve JSON structure exactly",
      async () => {
        const jsonData = {
          videoId: "video-123",
          title: "Test Video",
          metadata: {
            duration: 120,
            tags: ["test", "demo", "walrus"],
            nested: {
              deep: {
                value: 42,
              },
            },
          },
          timestamp: 1234567890,
          unicode: "测试 🎥",
        };

        const originalContent = JSON.stringify(jsonData, null, 2);
        const file = createTextFile(originalContent, "manifest.json");

        const uploadResult = await walrusStorage.uploadFile(file);
        expect(uploadResult.success).toBe(true);

        const downloadedBlob = await walrusStorage.downloadFile(uploadResult.blobId!);
        const downloadedText = await blobToText(downloadedBlob!);

        // Parse and compare structure
        const parsedData = JSON.parse(downloadedText);
        expect(parsedData).toEqual(jsonData);

        // Verify byte-by-byte
        const isIdentical = await compareContent(file, downloadedBlob!);
        expect(isIdentical).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      "should preserve binary data patterns exactly",
      async () => {
        // Create small binary file with pattern
        const size = 1024 * 100; // 100KB
        const buffer = new ArrayBuffer(size);
        const view = new Uint8Array(buffer);

        // Fill with specific pattern
        for (let i = 0; i < size; i++) {
          view[i] = (i * 13) % 256;
        }

        const file = new File([buffer], "binary.bin", {
          type: "application/octet-stream",
        });

        const uploadResult = await walrusStorage.uploadFile(file);
        expect(uploadResult.success).toBe(true);

        const downloadedBlob = await walrusStorage.downloadFile(uploadResult.blobId!);
        expect(downloadedBlob).not.toBeNull();

        // Verify size
        expect(downloadedBlob!.size).toBe(file.size);

        // Verify byte-by-byte
        const isIdentical = await compareContent(file, downloadedBlob!);
        expect(isIdentical).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      "should handle larger file (near 10MB limit)",
      async () => {
        // Create ~5MB file
        const chunkSize = 1024;
        const numChunks = 5 * 1024; // 5MB
        const chunk = "X".repeat(chunkSize);
        const largeContent = chunk.repeat(numChunks);

        const file = createTextFile(largeContent, "large.txt");
        expect(file.size).toBeLessThan(10 * 1024 * 1024);

        const uploadResult = await walrusStorage.uploadFile(file);
        expect(uploadResult.success).toBe(true);

        const downloadedBlob = await walrusStorage.downloadFile(uploadResult.blobId!);
        expect(downloadedBlob!.size).toBe(file.size);

        const downloadedText = await blobToText(downloadedBlob!);
        expect(downloadedText.length).toBe(largeContent.length);

        const isIdentical = await compareContent(file, downloadedBlob!);
        expect(isIdentical).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      "should handle empty file",
      async () => {
        const file = createTextFile("", "empty.txt");

        const uploadResult = await walrusStorage.uploadFile(file);
        expect(uploadResult.success).toBe(true);

        const downloadedBlob = await walrusStorage.downloadFile(uploadResult.blobId!);
        expect(downloadedBlob!.size).toBe(0);

        const downloadedText = await blobToText(downloadedBlob!);
        expect(downloadedText).toBe("");
      },
      TEST_TIMEOUT
    );
  });

  describe("Error handling", () => {
    test("should fail to download non-existent blob", async () => {
      const result = await walrusStorage.downloadFile("non-existent-blob-id-12345");
      expect(result).toBeNull();
    });

    test("should immediately reject oversized file", async () => {
      const oversizedFile = createLargeFile(11);

      const result = await walrusStorage.uploadFile(oversizedFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds the 10 MB limit");
    });
  });

  describe("Configuration", () => {
    test("should have correct configuration", () => {
      const config = walrusStorage.getConfig();

      expect(config.maxFileSizeMB).toBe(10);
      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
      expect(config.publisher).toBeTruthy();
      expect(config.aggregator).toBeTruthy();
    });

    test("should generate valid blob URLs", () => {
      const blobId = "test-blob-123";
      const url = walrusStorage.getBlobUrl(blobId);

      expect(url).toContain("/v1/blobs/");
      expect(url).toContain(blobId);
    });
  });
});
