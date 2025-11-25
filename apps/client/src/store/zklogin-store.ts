/**
 * zkLogin Zustand Store
 *
 * Modular store for zkLogin authentication state management.
 * Follows the agentix pattern: State + Actions + Middleware
 *
 * Storage Strategy:
 * - localStorage: Persistent data (salt, jwt, maxEpoch)
 * - sessionStorage: Temporary data (ephemeralKeyPair, randomness)
 */

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
  initiateZkLoginFlow,
  completeZkLoginFlow,
  signAndExecuteTransaction,
  restoreZkLoginSession,
  clearAllZkLoginData,
  type ZkLoginAccount,
} from "@/services/zklogin-auth";

// State interface
interface ZkLoginState {
  // Authentication state
  account: ZkLoginAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Actions interface
interface ZkLoginActions {
  // Authentication actions
  initiateLogin: () => Promise<string>;
  completeLogin: (callbackUrl: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;

  // Transaction actions
  signAndExecute: (txb: Transaction, suiClient: SuiClient) => Promise<string>;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Combined store type
export type ZkLoginStore = ZkLoginState & ZkLoginActions;

/**
 * Custom storage for handling both localStorage and sessionStorage
 *
 * Note: Zustand persist middleware only supports one storage type,
 * so we use localStorage for persistent state. Ephemeral data (like
 * ephemeral keypair) is handled by the zklogin-auth service using
 * sessionStorage directly.
 */
const customStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    const item = localStorage.getItem(name);
    return item;
  },
  setItem: (name: string, value: string) => {
    localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
}));

export const useZkLoginStore = create<ZkLoginStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        account: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Authentication actions
        initiateLogin: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // Create SUI client
            const suiClient = new SuiClient({
              url: "https://fullnode.devnet.sui.io",
            });

            const { loginUrl } = await initiateZkLoginFlow(suiClient);
            set((state) => {
              state.isLoading = false;
            });
            return loginUrl;
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : "Failed to initiate login";
            });
            throw error;
          }
        },

        completeLogin: async (callbackUrl: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const account = await completeZkLoginFlow(callbackUrl);
            set((state) => {
              state.account = account;
              state.isAuthenticated = true;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : "Failed to complete login";
            });
            throw error;
          }
        },

        logout: () => {
          set((state) => {
            state.account = null;
            state.isAuthenticated = false;
            state.error = null;
          });

          // Clear all storage
          clearAllZkLoginData();
        },

        restoreSession: async () => {
          set((state) => {
            state.isLoading = true;
          });

          try {
            const account = await restoreZkLoginSession();
            if (account) {
              set((state) => {
                state.account = account;
                state.isAuthenticated = true;
              });
            }
          } catch (error) {
            console.error("Failed to restore session:", error);
            // Silently fail - user will need to login again
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        // Transaction actions
        signAndExecute: async (txb: Transaction, suiClient: SuiClient) => {
          const { account } = get();
          if (!account) {
            throw new Error("No account connected");
          }

          try {
            const digest = await signAndExecuteTransaction(txb, account, suiClient);

            // Refresh balances after transaction
            // TODO: Implement refreshBalances function
            // await get().refreshBalances();

            return digest;
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : "Transaction failed";
            });
            throw error;
          }
        },

        // State management
        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },
      })),
      {
        name: "zklogin-storage",
        storage: customStorage,
        partialize: (state) => ({
          account: state.account,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "ZkLoginStore" }
  )
);

// Selectors for convenient access
export const zkLoginSelectors = {
  useAccount: () => useZkLoginStore((state) => state.account),
  useIsAuthenticated: () => useZkLoginStore((state) => state.isAuthenticated),
  useIsLoading: () => useZkLoginStore((state) => state.isLoading),
  useError: () => useZkLoginStore((state) => state.error),
  useAddress: () => useZkLoginStore((state) => state.account?.address ?? null),
};
