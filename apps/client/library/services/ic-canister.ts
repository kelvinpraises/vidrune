import { HttpAgent, Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { IDL } from "@dfinity/candid";
import useStore from "../store";
import { getCanisterIds, validateCanisterIds, type CanisterIds } from "./ic-canister-ids";

// IDL for VI Token (ICRC-1/ICRC-2)
const viTokenIDL = () => {
  return IDL.Service({
    'icrc1_balance_of': IDL.Func(
      [IDL.Record({ 'owner': IDL.Principal, 'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)) })],
      [IDL.Nat],
      ['query']
    ),
    'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc2_approve': IDL.Func(
      [IDL.Record({
        'amount': IDL.Nat,
        'spender': IDL.Record({ 'owner': IDL.Principal, 'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)) }),
        'fee': IDL.Opt(IDL.Nat),
        'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'created_at_time': IDL.Opt(IDL.Nat64),
        'expected_allowance': IDL.Opt(IDL.Nat),
        'expires_at': IDL.Opt(IDL.Nat64)
      })],
      [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })],
      []
    ),
  });
};

// IDL for Access Control canister
const accessControlIDL = () => {
  const TokenBalance = IDL.Record({
    'viTokens': IDL.Nat,
    'lastUpdated': IDL.Nat64,
  });

  const Result = IDL.Variant({
    'Ok': IDL.Text,
    'Err': IDL.Text,
  });

  return IDL.Service({
    'getTestnetTokens': IDL.Func([], [Result], []),
    'getTokenBalance': IDL.Func([IDL.Principal], [TokenBalance], ['query']),
    'canUpload': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'storeVideoMetadata': IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
      [Result],
      []
    ),
    'getStats': IDL.Func([], [IDL.Record({
      'totalUploads': IDL.Nat,
      'totalUsers': IDL.Nat,
      'totalTokensDistributed': IDL.Nat,
    })], ['query']),
  });
};

export interface TokenBalance {
  viTokens: bigint;
  lastUpdated: bigint;
}

export interface UploadStats {
  totalUploads: bigint;
  totalUsers: bigint; 
  totalTokensDistributed: bigint;
}

class ICCanisterService {
  private agent: HttpAgent | null = null;
  private viTokenActor: any = null;
  private accessControlActor: any = null;
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
        // Initialize actors
        this.viTokenActor = Actor.createActor(viTokenIDL, {
          agent: this.agent,
          canisterId: this.canisterIds.viToken,
        });

        this.accessControlActor = Actor.createActor(accessControlIDL, {
          agent: this.agent,
          canisterId: this.canisterIds.accessControl,
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

      const principal = this.agent!.getPrincipal();
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
      
      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        return { success: false, message: result.Err };
      }
    } catch (error) {
      console.error("Failed to get testnet tokens:", error);
      return { success: false, message: "Network error occurred" };
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

      const principal = this.agent!.getPrincipal();
      return await this.accessControlActor.canUpload(principal);
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
        return { success: false, message: result.Err };
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

      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        return { success: false, message: result.Err };
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

      return await this.accessControlActor.getStats();
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