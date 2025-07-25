import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createJSONStorage } from "zustand/middleware";

// Import our state slices
import { AnalyticsState } from "./create-analytics-slice";
import { IndexStoreState, IndexedVideo } from "./index-store-slice";

// Define the complete state type
interface StoreState extends AnalyticsState, IndexStoreState {}

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
