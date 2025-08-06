import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createJSONStorage } from "zustand/middleware";
import { Ed25519KeyIdentity } from "@dfinity/identity";

// Import our state slices
import { AnalyticsState } from "./create-analytics-slice";
import { IndexStoreState, IndexedVideo } from "./index-store-slice";
import { ICIdentityState } from "./ic-identity-store-slice";

// Define the complete state type
interface StoreState extends AnalyticsState, IndexStoreState, ICIdentityState {}

// Define the initial state and actions directly
const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Analytics state
        completedIndexes: 0,
        scenesProcessed: 0,
        updateStats: (scenesCount: number) =>
          set((state) => ({
            ...state,
            completedIndexes: state.completedIndexes + 1,
            scenesProcessed: state.scenesProcessed + scenesCount,
          })),

        // Index store state
        indexedVideos: {},
        addVideo: (
          videoCID: string,
          videoData: Omit<IndexedVideo, "videoCID" | "status"> & {
            status?: IndexedVideo["status"];
          }
        ) =>
          set((state) => ({
            ...state,
            indexedVideos: {
              ...state.indexedVideos,
              [videoCID]: {
                videoCID,
                status: videoData.status || "pending",
                ...videoData,
              },
            },
          })),

        updateVideo: (videoCID: string, videoData: Partial<IndexedVideo>) =>
          set((state) => {
            const currentVideo = state.indexedVideos[videoCID];
            if (!currentVideo) return state;

            return {
              ...state,
              indexedVideos: {
                ...state.indexedVideos,
                [videoCID]: {
                  ...currentVideo,
                  ...videoData,
                  lastChecked: Date.now(),
                },
              },
            };
          }),

        removeVideo: (videoCID: string) =>
          set((state) => {
            const newIndexedVideos = { ...state.indexedVideos };
            delete newIndexedVideos[videoCID];

            return {
              ...state,
              indexedVideos: newIndexedVideos,
            };
          }),

        getVideo: (videoCID: string): IndexedVideo | undefined => {
          return get().indexedVideos[videoCID];
        },

        getAllVideos: (): IndexedVideo[] => {
          return Object.values(get().indexedVideos);
        },

        // IC Identity state
        identitySeed: null,
        principal: null,
        isInitialized: false,

        setIdentity: (seed: number[], principal: string) =>
          set((state) => ({
            ...state,
            identitySeed: seed,
            principal,
            isInitialized: true,
          })),

        clearIdentity: () =>
          set((state) => ({
            ...state,
            identitySeed: null,
            principal: null,
            isInitialized: false,
          })),

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
              set((state) => ({
                ...state,
                identitySeed: seedArray,
                principal,
                isInitialized: true,
              }));
              
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
      }),
      {
        name: "vidrune-store",
        storage: createJSONStorage(() => localStorage),
      }
    ),
    { name: "Vidrune" }
  )
);

export default useStore;
