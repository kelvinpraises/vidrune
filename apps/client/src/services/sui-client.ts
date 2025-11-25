import { SuiClient, SuiHTTPTransport } from "@mysten/sui/client";

// SUI Network Configuration
const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK || "testnet";
const SUI_RPC_URL = import.meta.env.VITE_SUI_RPC_URL || getDefaultRpcUrl(SUI_NETWORK);

function getDefaultRpcUrl(network: string): string {
  switch (network) {
    case "mainnet":
      return "https://fullnode.mainnet.sui.io:443";
    case "testnet":
      return "https://fullnode.testnet.sui.io:443";
    case "devnet":
      return "https://fullnode.devnet.sui.io:443";
    case "localnet":
      return "http://localhost:9000";
    default:
      return "https://fullnode.testnet.sui.io:443";
  }
}

// Create SUI client instance
export const suiClient = new SuiClient({
  transport: new SuiHTTPTransport({
    url: SUI_RPC_URL,
  }),
});

// Helper functions for SUI operations
export const suiService = {
  /**
   * Get current network
   */
  getNetwork: () => SUI_NETWORK,

  /**
   * Get SUI balance for an address
   */
  async getBalance(address: string): Promise<bigint> {
    try {
      const balance = await suiClient.getBalance({
        owner: address,
      });
      return BigInt(balance.totalBalance);
    } catch (error) {
      console.error("Failed to get SUI balance:", error);
      return BigInt(0);
    }
  },

  /**
   * Get all objects owned by an address
   */
  async getOwnedObjects(address: string) {
    try {
      const objects = await suiClient.getOwnedObjects({
        owner: address,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
        },
      });
      return objects.data;
    } catch (error) {
      console.error("Failed to get owned objects:", error);
      return [];
    }
  },

  /**
   * Get transaction details
   */
  async getTransaction(digest: string) {
    try {
      const tx = await suiClient.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
          showObjectChanges: true,
        },
      });
      return tx;
    } catch (error) {
      console.error("Failed to get transaction:", error);
      return null;
    }
  },

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(digest: string, timeout = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const tx = await suiClient.getTransactionBlock({
          digest,
          options: { showEffects: true },
        });
        if (tx.effects?.status?.status === "success") {
          return true;
        }
        if (tx.effects?.status?.status === "failure") {
          console.error("Transaction failed:", tx.effects.status.error);
          return false;
        }
      } catch (error) {
        // Transaction not found yet, continue waiting
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.error("Transaction timeout");
    return false;
  },

  /**
   * Get current epoch
   */
  async getCurrentEpoch() {
    try {
      const epoch = await suiClient.getLatestSuiSystemState();
      return epoch.epoch;
    } catch (error) {
      console.error("Failed to get current epoch:", error);
      return null;
    }
  },

  /**
   * Dry run a transaction to estimate gas
   */
  async dryRunTransaction(txBytes: Uint8Array) {
    try {
      const result = await suiClient.dryRunTransactionBlock({
        transactionBlock: txBytes,
      });
      return result;
    } catch (error) {
      console.error("Failed to dry run transaction:", error);
      return null;
    }
  },
};

export default suiClient;
