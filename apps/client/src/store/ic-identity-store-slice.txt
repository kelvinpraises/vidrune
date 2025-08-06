import { StateCreator } from "zustand";
import { createJSONStorage } from "zustand/middleware";
import { Ed25519KeyIdentity } from "@dfinity/identity";

export interface ICIdentityState {
  identitySeed: number[] | null;
  principal: string | null;
  isInitialized: boolean;
  setIdentity: (seed: number[], principal: string) => void;
  clearIdentity: () => void;
  getOrCreateIdentity: () => { identity: Ed25519KeyIdentity; principal: string };
}

// Create a local storage persister for IC identity
export const icIdentityStorePersist = {
  name: "vidrune-ic-identity",
  storage: createJSONStorage(() => localStorage),
};

// Export a store slice creator function
const createICIdentitySlice: StateCreator<ICIdentityState> = (set, get) => ({
  identitySeed: null,
  principal: null,
  isInitialized: false,

  setIdentity: (seed: number[], principal: string) =>
    set({
      identitySeed: seed,
      principal,
      isInitialized: true,
    }),

  clearIdentity: () =>
    set({
      identitySeed: null,
      principal: null,
      isInitialized: false,
    }),

  getOrCreateIdentity: () => {
    const state = get();
    
    try {
      // Try to use existing identity from store
      if (state.identitySeed && state.principal) {
        const seed = new Uint8Array(state.identitySeed);
        const identity = Ed25519KeyIdentity.generate(seed);
        return { identity, principal: state.principal };
      } else {
        // Generate new random identity
        const identity = Ed25519KeyIdentity.generate();
        const principal = identity.getPrincipal().toString();
        
        // Store the seed for future sessions
        const seed = identity.getKeyPair().secretKey.slice(0, 32);
        const seedArray = Array.from(seed);
        
        // Update store
        set({
          identitySeed: seedArray,
          principal,
          isInitialized: true,
        });
        
        return { identity, principal };
      }
    } catch (error) {
      console.warn("Failed to manage IC identity, using temporary identity:", error);
      // Fallback to temporary identity if store fails
      const identity = Ed25519KeyIdentity.generate();
      const principal = identity.getPrincipal().toString();
      return { identity, principal };
    }
  },
});

export default createICIdentitySlice;