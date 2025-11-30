/**
 * Walrus Storage Service
 *
 * Handles interactions with Walrus decentralized storage network
 * - Upload files and blobs to Walrus
 * - Retrieve blobs from Walrus
 * - Generate public URLs for stored content
 */

import { WalrusUploadResult } from "../types";

interface WalrusStoreResponse {
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
    endEpoch: number;
  };
}

export class WalrusService {
  private publisherUrl: string;
  private aggregatorUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second
  private isConfigured: boolean = false;

  constructor() {
    this.publisherUrl = process.env.WALRUS_PUBLISHER_URL || "";
    this.aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || "";

    if (!this.publisherUrl || !this.aggregatorUrl) {
      console.warn("⚠️  Walrus not configured - storage features will be disabled");
      console.warn("   Set WALRUS_PUBLISHER_URL and WALRUS_AGGREGATOR_URL in .env to enable storage");
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      console.log("✅ WalrusService initialized");
    }
  }

  /**
   * Check if service is configured
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error("WalrusService is not configured. Set WALRUS_PUBLISHER_URL and WALRUS_AGGREGATOR_URL in environment.");
    }
  }

  /**
   * Upload a file buffer to Walrus
   * @param file - File buffer to upload
   * @param filename - Optional filename for metadata
   * @returns Upload result with blobId and public URL
   */
  async uploadFile(file: Buffer, filename?: string): Promise<WalrusUploadResult> {
    this.ensureConfigured();

    return this.retryOperation(async () => {
      const response = await fetch(`${this.publisherUrl}/v1/blobs`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          ...(filename && { "X-Filename": filename }),
        },
        body: new Uint8Array(file),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Walrus upload failed: ${response.status} ${errorText}`);
      }

      const result = (await response.json()) as WalrusStoreResponse;

      const blobId =
        result.newlyCreated?.blobObject.blobId || result.alreadyCertified?.blobId || "";

      if (!blobId) {
        throw new Error("No blob ID returned from Walrus");
      }

      const size = result.newlyCreated?.blobObject.size || file.length;

      return {
        blobId,
        url: this.getPublicUrl(blobId),
        size,
      };
    });
  }

  /**
   * Upload JSON data or any serializable object as a blob
   * @param data - Data to serialize and upload
   * @param filename - Optional filename for metadata
   * @returns Upload result with blobId and public URL
   */
  async uploadBlob(data: any, filename?: string): Promise<WalrusUploadResult> {
    let buffer: Buffer;

    if (typeof data === "string") {
      buffer = Buffer.from(data, "utf-8");
    } else if (Buffer.isBuffer(data)) {
      buffer = data;
    } else {
      // Assume it's a JSON-serializable object
      buffer = Buffer.from(JSON.stringify(data), "utf-8");
    }

    return this.uploadFile(buffer, filename);
  }

  /**
   * Download a file from Walrus by blob ID
   * @param blobId - The blob ID to retrieve
   * @returns File buffer
   */
  async downloadFile(blobId: string): Promise<Buffer> {
    this.ensureConfigured();

    if (!blobId) {
      throw new Error("Blob ID is required");
    }

    return this.retryOperation(async () => {
      const response = await fetch(`${this.aggregatorUrl}/v1/blobs/${blobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Blob not found: ${blobId}`);
        }
        const errorText = await response.text();
        throw new Error(`Walrus download failed: ${response.status} ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    });
  }

  /**
   * Get the public URL for a blob
   * @param blobId - The blob ID
   * @returns Public URL to access the blob
   */
  getPublicUrl(blobId: string): string {
    if (!blobId) {
      throw new Error("Blob ID is required");
    }
    return `${this.aggregatorUrl}/v1/blobs/${blobId}`;
  }



  /**
   * Retry an operation with exponential backoff
   * @param operation - Async operation to retry
   * @returns Result of the operation
   */
  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (400-499) except 408 (timeout) and 429 (rate limit)
        if (error instanceof Error && error.message.includes("Walrus")) {
          const statusMatch = error.message.match(/: (\d{3})/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1], 10);
            if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
              throw error;
            }
          }
        }

        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.warn(
            `Walrus operation failed (attempt ${attempt + 1}/${
              this.maxRetries
            }), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Operation failed after retries");
  }
}
