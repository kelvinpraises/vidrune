import type { StateCreator } from "zustand";
import { createJSONStorage } from "zustand/middleware";

export interface AnalyticsState {
  completedIndexes: number;
  scenesProcessed: number;
  updateStats: (scenesCount: number) => void;
}

export const analyticsStorePersist = {
  name: "analytics-storage",
  storage: createJSONStorage(() => localStorage),
};

// Export a store slice creator function
const createAnalyticsSlice: StateCreator<AnalyticsState> = (set) => ({
  completedIndexes: 0,
  scenesProcessed: 0,

  updateStats: (scenesCount: number) =>
    set((state: AnalyticsState) => {
      const newState = { ...state };
      newState.completedIndexes += 1; // Increment caption count by 1
      newState.scenesProcessed += scenesCount; // Add the number of scenes processed
      return newState;
    }),
});

export default createAnalyticsSlice;
