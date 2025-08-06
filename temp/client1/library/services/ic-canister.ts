import { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import useStore from "../store";
import { getCanisterIds, validateCanisterIds, type CanisterIds } from "./ic-canister-ids";

// Import generated declarations
import { createActor as createViTokenActor } from "@/library/types/ic-declarations/vi_token";
import { createActor as createAccessControlActor } from "@/library/types/ic-declarations/vidrune_access_control";
import type { _SERVICE as ViTokenService } from "@/library/types/ic-declarations/vi_token/vi_token.did";
import type { _SERVICE as AccessControlService } from "@/library/types/ic-declarations/vidrune_access_control/vidrune_access_control.did";

export interface UploadStats {
  totalVideos: bigint;
  totalUsers: bigint; 
  totalTokensDistributed: bigint;
}

class ICCanisterService {
  private agent: HttpAgent | null = null;
  private viTokenActor: ViTokenService | null = null;
  private accessControlActor: AccessControlService | null = null;
  private canisterIds: CanisterIds | null = null;

  constructor() {
    // Only initialize on client-side to avoid SSR issues
    if (typeof window !== 'undefined') {
      this.initializeService();
    }
  }

  private async initializeService() {
    try {
      // Get identity from store (reuse same agent setup as ic-storage)
      const { identity } = useStore.getState().getOrCreateIdentity();
      
      const isLocal = !window.location.host.endsWith("ic0.app");
      const host = isLocal ? `http://127.0.0.1:4943` : "https://ic0.app";

      this.agent = new HttpAgent({ host, identity });

      if (isLocal) {
        await this.agent.fetchRootKey();
      }

      // Get canister IDs dynamically
      this.canisterIds = await getCanisterIds();

      if (this.canisterIds && validateCanisterIds(this.canisterIds)) {
        // Initialize actors using generated declarations
        this.viTokenActor = createViTokenActor(this.canisterIds.viToken, {
          agent: this.agent,
        });

        this.accessControlActor = createAccessControlActor(this.canisterIds.accessControl, {
          agent: this.agent,
        });
      } else {
        console.error("Invalid canister IDs - service not initialized");
        throw new Error("Could not initialize IC Canister Service - invalid canister IDs");
      }
    } catch (error) {
      console.error("Failed to initialize IC Canister Service:", error);
      throw error;
    }
  }


  async getTokenBalance(): Promise<number> {
    try {
      if (!this.viTokenActor || !this.agent) {
        await this.initializeService();
      }

      if (!this.viTokenActor) {
        throw new Error("VI Token actor not initialized");
      }

      const principal = await this.agent!.getPrincipal();
      const balance = await this.viTokenActor.icrc1_balance_of({
        owner: principal,
        subaccount: [],
      });

      // Convert from e8s (100,000,000 e8s = 1 VI token)
      return Number(balance) / 100_000_000;
    } catch (error) {
      console.error("Failed to get token balance:", error);
      return 0;
    }
  }

  async getTestnetTokens(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.accessControlActor) {
        await this.initializeService();
      }

      if (!this.accessControlActor) {
        throw new Error("Access Control actor not initialized");
      }

      const result = await this.accessControlActor.getTestnetTokens();
      
      if ('ok' in result) {
        return { success: true, message: result.ok };
      } else {
        return { success: false, message: result.err };
      }
    } catch (error) {
      console.error("Failed to get testnet tokens:", error);
      return { success: false, message: `Failed to get testnet tokens: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async canUpload(): Promise<boolean> {
    try {
      if (!this.accessControlActor || !this.agent) {
        await this.initializeService();
      }

      if (!this.accessControlActor) {
        return false;
      }

      const result = await this.accessControlActor.canUpload();
      if ('ok' in result) {
        return result.ok;
      } else {
        console.error("canUpload error:", result.err);
        return false;
      }
    } catch (error) {
      console.error("Failed to check upload permission:", error);
      return false;
    }
  }

  async approveTokensForUpload(amount: number = 2): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.viTokenActor || !this.canisterIds) {
        await this.initializeService();
      }

      if (!this.viTokenActor || !this.canisterIds) {
        throw new Error("Service not initialized");
      }

      // Convert to e8s and approve tokens for access control canister
      const amountE8s = BigInt(amount * 100_000_000);
      const result = await this.viTokenActor.icrc2_approve({
        amount: amountE8s,
        spender: { 
          owner: Principal.fromText(this.canisterIds.accessControl),
          subaccount: [] 
        },
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        expected_allowance: [],
        expires_at: []
      });

      if ('Ok' in result) {
        return { success: true, message: `Approved ${amount} VI tokens for upload` };
      } else {
        return { success: false, message: String(result.Err) };
      }
    } catch (error) {
      console.error("Failed to approve tokens:", error);
      return { success: false, message: "Failed to approve tokens" };
    }
  }

  async storeVideoMetadata(
    title: string,
    description: string,
    fileKey: string,
    thumbnailKey?: string,
    metadataKey?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.accessControlActor) {
        await this.initializeService();
      }

      if (!this.accessControlActor) {
        throw new Error("Access Control actor not initialized");
      }

      const result = await this.accessControlActor.storeVideoMetadata(
        title,
        description,
        fileKey,
        thumbnailKey ? [thumbnailKey] : [],
        metadataKey ? [metadataKey] : []
      );

      if ('ok' in result) {
        return { success: true, message: result.ok };
      } else {
        return { success: false, message: result.err };
      }
    } catch (error) {
      console.error("Failed to store video metadata:", error);
      return { success: false, message: "Failed to store video metadata" };
    }
  }

  async getUploadStats(): Promise<UploadStats | null> {
    try {
      if (!this.accessControlActor) {
        await this.initializeService();
      }

      if (!this.accessControlActor) {
        return null;
      }

      const stats = await this.accessControlActor.getStats();
      return {
        totalVideos: stats.totalVideos,
        totalUsers: BigInt(0), // Not available in current canister interface
        totalTokensDistributed: stats.testnetGiftAmount,
      };
    } catch (error) {
      console.error("Failed to get upload stats:", error);
      return null;
    }
  }

  getCurrentPrincipal(): string | null {
    return this.agent?.getPrincipal().toString() || null;
  }

  isInitialized(): boolean {
    return this.agent !== null && this.viTokenActor !== null && this.accessControlActor !== null;
  }

  getCanisterInfo(): { canisterIds: CanisterIds | null; isLocal: boolean } {
    return {
      canisterIds: this.canisterIds,
      isLocal: !window.location.host.endsWith("ic0.app"),
    };
  }
}

// Create and export singleton instance
export const icCanisterService = new ICCanisterService();

// Export class for custom instances
export default ICCanisterService;