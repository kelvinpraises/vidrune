import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/**
 * User's indexed video stored locally
 */
export interface UserIndexedVideo {
  blobId: string;
  title: string;
  description: string;
  uploadedAt: number;
  fileSize?: number;
  scenesCount?: number;
  status: "pending" | "indexed" | "challenged";
}

interface StoreState {
  // User's indexed videos (persisted to localStorage)
  userVideos: Record<string, UserIndexedVideo>;
  addUserVideo: (video: UserIndexedVideo) => void;
  updateUserVideo: (blobId: string, updates: Partial<UserIndexedVideo>) => void;
  removeUserVideo: (blobId: string) => void;
  getUserVideos: () => UserIndexedVideo[];
}

const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        userVideos: {},

        addUserVideo: (video) =>
          set((state) => ({
            userVideos: {
              ...state.userVideos,
              [video.blobId]: video,
            },
          })),

        updateUserVideo: (blobId, updates) =>
          set((state) => {
            const existing = state.userVideos[blobId];
            if (!existing) return state;
            return {
              userVideos: {
                ...state.userVideos,
                [blobId]: { ...existing, ...updates },
              },
            };
          }),

        removeUserVideo: (blobId) =>
          set((state) => {
            const { [blobId]: _, ...rest } = state.userVideos;
            return { userVideos: rest };
          }),

        getUserVideos: () => Object.values(get().userVideos),
      }),
      {
        name: "vidrune-user-videos",
      }
    ),
    { name: "Vidrune" }
  )
);

export default useStore;
