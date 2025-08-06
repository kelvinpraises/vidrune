import { Ed25519KeyIdentity } from "@dfinity/identity";
import { HttpAgent } from "@dfinity/agent";
import type { AssetManager } from "@dfinity/assets";
import useStore from "../store";

// Dynamic import function for AssetManager to avoid Node.js dependencies in bundle
async function loadAssetManager() {
  try {
    const { AssetManager } = await import("@dfinity/assets");
    return AssetManager;
  } catch (error) {
    console.error("Failed to load @dfinity/assets:", error);
    throw new Error(
      "Failed to load IC Asset Manager. This might be due to missing dependencies or network issues."
    );
  }
}

// Properly typed AssetManager constructor
type AssetManagerConstructor = typeof AssetManager;

export interface ICStorageUploadResult {
  cid: string;
  key: string;
  fileName: string;
  fileSize: number;
}

export interface ICStorageUploadOptions {
  title?: string;
  description?: string;
  uploadedBy?: string;
}

class ICStorageService {
  private agent: HttpAgent | null = null;
  private assetManager: AssetManager | null = null;
  private canisterId: string | null = null;
  private AssetManagerClass: AssetManagerConstructor | null = null;

  constructor() {
    // Only initialize on client-side to avoid SSR issues
    if (typeof window !== 'undefined') {
      this.initializeAgent();
    }
  }

  private getOrCreateBrowserIdentity(): Ed25519KeyIdentity {
    try {
      // Use store to get or create identity
      const { identity } = useStore.getState().getOrCreateIdentity();
      return identity;
    } catch (error) {
      console.warn("Failed to manage browser identity via store, using temporary identity:", error);
      // Fallback to temporary identity if store fails
      return Ed25519KeyIdentity.generate();
    }
  }

  private initializeAgent() {
    try {
      // Generate or retrieve a unique identity for this browser
      const identity = this.getOrCreateBrowserIdentity();

      const isLocal = !window.location.host.endsWith("ic0.app");
      const host = isLocal ? `http://127.0.0.1:${window.location.port}` : "https://ic0.app";

      this.agent = HttpAgent.createSync({ host, identity });

      if (isLocal) {
        this.agent.fetchRootKey();
      }

      // Get canister ID from URL or environment
      this.canisterId = this.getCanisterId();

      // Load AssetManager dynamically when needed
      if (this.canisterId) {
        this.initializeAssetManager();
      }
    } catch (error) {
      console.error("Failed to initialize IC Storage Service:", error);
    }
  }

  private async initializeAssetManager() {
    try {
      this.AssetManagerClass = await loadAssetManager();
      if (this.AssetManagerClass && this.agent && this.canisterId) {
        this.assetManager = new this.AssetManagerClass({
          canisterId: this.canisterId,
          agent: this.agent,
        });
      }
    } catch (error) {
      console.error("Failed to initialize AssetManager:", error);
      // In development/testing, you might want to provide fallback behavior
    }
  }

  private getCanisterId(): string | null {
    // Try to get canister ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let canisterId = urlParams.get("canisterId");

    if (!canisterId) {
      // Try to extract from IC domain
      const icDomainMatch = /(.*?)(?:\.raw)?\.ic0.app/.exec(window.location.host);
      if (icDomainMatch) {
        canisterId = icDomainMatch[1];
      }
    }

    if (!canisterId) {
      // Try to extract from localhost
      const localhostMatch = /(.*)\.localhost/.exec(window.location.host);
      if (localhostMatch) {
        canisterId = localhostMatch[1];
      }
    }

    // TODO: Add environment variable fallback
    // canisterId = canisterId || process.env.NEXT_PUBLIC_CANISTER_ID;

    return canisterId;
  }

  private getVideoDetailsFromFile(file: File): { fileName: string; fileSize: number } {
    const name = file.name.split(".");
    const extension = name.pop();
    const baseName = name.join(".");
    const timestamp = Date.now();

    // Create a unique filename with timestamp
    const fileName = `${baseName}_${timestamp}.${extension}`;

    return {
      fileName,
      fileSize: file.size,
    };
  }

  async uploadVideo(
    file: File,
    _options: ICStorageUploadOptions = {}
  ): Promise<ICStorageUploadResult> {
    // Ensure AssetManager is loaded
    if (!this.assetManager && this.canisterId) {
      await this.initializeAssetManager();
    }

    if (!this.assetManager) {
      throw new Error(
        "IC Storage Service not initialized. Please check canister configuration."
      );
    }

    if (!file.type.startsWith("video/")) {
      throw new Error("Only video files are supported");
    }

    try {
      const { fileName, fileSize } = this.getVideoDetailsFromFile(file);

      // Create a batch for the upload
      const batch = this.assetManager.batch();

      // Store the file in the /videos directory
      const key = await batch.store(file, {
        path: "/videos",
        fileName: fileName,
      });

      // Commit the batch
      await batch.commit();

      // The key returned is the path to the file, which serves as our CID equivalent
      const cid = key.replace("/videos/", "");

      return {
        cid,
        key,
        fileName,
        fileSize,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Caller does not have Prepare permission")) {
          throw new Error(
            "Caller is not authorized. Please check your permissions or authentication."
          );
        }
        throw new Error(`Upload failed: ${error.message}`);
      }
      throw new Error("Upload failed: Unknown error");
    }
  }

  async listVideos(): Promise<Array<{ key: string; fileName: string; modified: bigint }>> {
    // Ensure AssetManager is loaded
    if (!this.assetManager && this.canisterId) {
      await this.initializeAssetManager();
    }

    if (!this.assetManager) {
      throw new Error(
        "IC Storage Service not initialized. Please check canister configuration."
      );
    }

    try {
      const assets = await this.assetManager.list();

      return assets
        .filter((asset) => asset.key.startsWith("/videos/"))
        .sort((a, b) => Number(b.encodings[0].modified - a.encodings[0].modified))
        .map((asset) => ({
          key: asset.key,
          fileName: asset.key.split("/").slice(-1)[0],
          modified: asset.encodings[0].modified,
        }));
    } catch (error) {
      console.error("Failed to list videos:", error);
      return [];
    }
  }

  getVideoUrl(key: string): string {
    if (!this.canisterId) {
      console.warn("Canister ID not available, cannot generate video URL");
      return "";
    }

    // For IC, the key is the path to the file which can be accessed directly
    const isLocal = !window.location.host.endsWith("ic0.app");

    if (isLocal) {
      return `http://127.0.0.1:${window.location.port}${key}`;
    } else {
      return `https://${this.canisterId}.ic0.app${key}`;
    }
  }

  isInitialized(): boolean {
    return this.assetManager !== null && this.canisterId !== null;
  }

  getCanisterInfo(): { canisterId: string | null; isLocal: boolean } {
    return {
      canisterId: this.canisterId,
      isLocal: !window.location.host.endsWith("ic0.app"),
    };
  }

  getCurrentPrincipal(): string | null {
    if (!this.agent) {
      return null;
    }
    return this.agent.getPrincipal().toString();
  }

  // Helper method to clear identity (for testing/debugging)
  clearIdentity(): void {
    localStorage.removeItem("vidrune_ic_identity");
    this.initializeAgent(); // Reinitialize with new identity
  }
}

// Create and export a singleton instance
export const icStorage = new ICStorageService();

// Export the class for custom instances if needed
export default ICStorageService;
