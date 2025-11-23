import type { StateCreator } from "zustand";
import { createJSONStorage } from "zustand/middleware";

export interface IndexedVideo {
  videoCID: string;
  indexCID?: string;
  nodeAddress?: string;
  requestTimestamp?: number;
  deadline?: number;
  status: "pending" | "completed" | "failed" | "reassignable";
  fileName?: string;
  fileSize?: number;
  lastChecked?: number;
  title?: string;
  description?: string;
}

export interface IndexStoreState {
  indexedVideos: Record<string, IndexedVideo>;
  addVideo: (
    videoCID: string,
    videoData: Omit<IndexedVideo, "videoCID" | "status"> & {
      status?: IndexedVideo["status"];
    }
  ) => void;
  updateVideo: (videoCID: string, videoData: Partial<IndexedVideo>) => void;
  removeVideo: (videoCID: string) => void;
  getVideo: (videoCID: string) => IndexedVideo | undefined;
  getAllVideos: () => IndexedVideo[];
}

// Create a local storage persister to use in the main store
export const indexStorePersist = {
  name: "vise-indexed-videos",
  storage: createJSONStorage(() => localStorage),
};

// Export a store slice creator function
const createIndexSlice: StateCreator<IndexStoreState> = (set, get) => ({
  indexedVideos: {},

  addVideo: (videoCID: string, videoData: Omit<IndexedVideo, "videoCID" | "status"> & {
    status?: IndexedVideo["status"];
  }) =>
    set((state: IndexStoreState) => {
      // Using immer to handle immutable updates
      const newState = { ...state };
      newState.indexedVideos = { ...newState.indexedVideos };
      newState.indexedVideos[videoCID] = {
        videoCID,
        status: videoData.status || "pending",
        ...videoData,
      };
      return newState;
    }),

  updateVideo: (videoCID: string, videoData: Partial<IndexedVideo>) =>
    set((state: IndexStoreState) => {
      const currentVideo = state.indexedVideos[videoCID];
      if (!currentVideo) return state;

      const newState = { ...state };
      newState.indexedVideos = { ...newState.indexedVideos };
      newState.indexedVideos[videoCID] = {
        ...currentVideo,
        ...videoData,
        lastChecked: Date.now(),
      };
      return newState;
    }),

  removeVideo: (videoCID: string) =>
    set((state: IndexStoreState) => {
      const newState = { ...state };
      newState.indexedVideos = { ...newState.indexedVideos };
      delete newState.indexedVideos[videoCID];
      return newState;
    }),

  getVideo: (videoCID: string) => {
    return get().indexedVideos[videoCID];
  },

  getAllVideos: () => {
    return Object.values(get().indexedVideos);
  },
});

export default createIndexSlice;
