import { useCallback, useEffect, useState } from "react";

import type { AudioProcessingResult } from "./use-local-audio-processing";
import type { CaptionProcessingResult } from "./use-local-caption-processing";

export interface VideoIndexEntry {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  duration: number;
  uploadedAt: number;
  uploadedBy: string;

  // Processing results
  audioTranscript?: string;
  audioSegments?: AudioProcessingResult["segments"];
  captionSegments?: CaptionProcessingResult["segments"];

  // Metadata
  language: string;
  tags: string[];
  thumbnail?: string;

  // Processing info
  processedAt?: number;
  processingMethod: "local" | "api";
  processingOptions: {
    localAudio: boolean;
    localCaptions: boolean;
  };

  // Search optimization
  searchableText: string; // Combined text for easy searching
  keywords: string[];
}

export interface VideoSearchResult {
  entry: VideoIndexEntry;
  matches: {
    field: string;
    snippet: string;
    score: number;
  }[];
}

const STORAGE_KEY = "vidrune_video_index";

export const useVideoIndex = () => {
  const [index, setIndex] = useState<Record<string, VideoIndexEntry>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load index from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedIndex = JSON.parse(stored);
        setIndex(parsedIndex);
      }
    } catch (error) {
      console.error("Failed to load video index from storage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save index to storage whenever it changes
  const saveIndex = useCallback((newIndex: Record<string, VideoIndexEntry>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIndex));
    } catch (error) {
      console.error("Failed to save video index to storage:", error);
    }
  }, []);

  const addVideoToIndex = useCallback(
    (
      videoData: {
        id: string;
        title: string;
        description: string;
        fileName: string;
        fileSize: number;
        duration: number;
        uploadedBy: string;
      },
      processingResults: {
        audio?: AudioProcessingResult;
        captions?: CaptionProcessingResult;
      },
      processingOptions: {
        localAudio: boolean;
        localCaptions: boolean;
      }
    ) => {
      const searchableText = [
        videoData.title,
        videoData.description,
        processingResults.audio?.transcript || "",
        processingResults.captions?.segments.map((s) => s.text).join(" ") || "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const keywords = extractKeywords(searchableText);

      const entry: VideoIndexEntry = {
        ...videoData,
        uploadedAt: Date.now(),
        processedAt: Date.now(),
        processingMethod:
          processingOptions.localAudio || processingOptions.localCaptions ? "local" : "api",
        processingOptions,
        audioTranscript: processingResults.audio?.transcript,
        audioSegments: processingResults.audio?.segments,
        captionSegments: processingResults.captions?.segments,
        language:
          processingResults.audio?.language || processingResults.captions?.language || "en",
        tags: [],
        searchableText,
        keywords,
      };

      const newIndex = { ...index, [videoData.id]: entry };
      setIndex(newIndex);
      saveIndex(newIndex);

      return entry;
    },
    [index, saveIndex]
  );

  const updateVideoInIndex = useCallback(
    (id: string, updates: Partial<VideoIndexEntry>) => {
      if (!index[id]) return null;

      const updatedEntry = { ...index[id], ...updates };

      // Regenerate searchable text if content changed
      if (
        updates.audioTranscript ||
        updates.captionSegments ||
        updates.title ||
        updates.description
      ) {
        updatedEntry.searchableText = [
          updatedEntry.title,
          updatedEntry.description,
          updatedEntry.audioTranscript || "",
          updatedEntry.captionSegments?.map((s) => s.text).join(" ") || "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        updatedEntry.keywords = extractKeywords(updatedEntry.searchableText);
      }

      const newIndex = { ...index, [id]: updatedEntry };
      setIndex(newIndex);
      saveIndex(newIndex);

      return updatedEntry;
    },
    [index, saveIndex]
  );

  const removeVideoFromIndex = useCallback(
    (id: string) => {
      const newIndex = { ...index };
      delete newIndex[id];
      setIndex(newIndex);
      saveIndex(newIndex);
    },
    [index, saveIndex]
  );

  const searchVideos = useCallback(
    (
      query: string,
      options?: {
        limit?: number;
        fields?: ("title" | "description" | "audioTranscript" | "captions")[];
      }
    ): VideoSearchResult[] => {
      if (!query.trim()) return [];

      const searchTerms = query
        .toLowerCase()
        .split(" ")
        .filter((term) => term.length > 1);
      const results: VideoSearchResult[] = [];

      Object.values(index).forEach((entry) => {
        const matches: VideoSearchResult["matches"] = [];
        let totalScore = 0;

        // Search in different fields
        const searchFields = options?.fields || [
          "title",
          "description",
          "audioTranscript",
          "captions",
        ];

        searchFields.forEach((field) => {
          let fieldText = "";
          let fieldWeight = 1;

          switch (field) {
            case "title":
              fieldText = entry.title.toLowerCase();
              fieldWeight = 3; // Title matches are more important
              break;
            case "description":
              fieldText = entry.description.toLowerCase();
              fieldWeight = 2;
              break;
            case "audioTranscript":
              fieldText = entry.audioTranscript?.toLowerCase() || "";
              fieldWeight = 1;
              break;
            case "captions":
              fieldText =
                entry.captionSegments
                  ?.map((s) => s.text)
                  .join(" ")
                  .toLowerCase() || "";
              fieldWeight = 1;
              break;
          }

          searchTerms.forEach((term) => {
            const index = fieldText.indexOf(term);
            if (index !== -1) {
              const snippet = getTextSnippet(fieldText, index, term.length);
              const score = fieldWeight * (term.length / fieldText.length);

              matches.push({
                field,
                snippet,
                score,
              });

              totalScore += score;
            }
          });
        });

        if (matches.length > 0) {
          results.push({
            entry,
            matches: matches.sort((a, b) => b.score - a.score),
          });
        }
      });

      // Sort by total score and apply limit
      return results
        .sort((a, b) => {
          const scoreA = a.matches.reduce((sum, match) => sum + match.score, 0);
          const scoreB = b.matches.reduce((sum, match) => sum + match.score, 0);
          return scoreB - scoreA;
        })
        .slice(0, options?.limit || 50);
    },
    [index]
  );

  const getVideoById = useCallback(
    (id: string): VideoIndexEntry | null => {
      return index[id] || null;
    },
    [index]
  );

  const getAllVideos = useCallback((): VideoIndexEntry[] => {
    return Object.values(index).sort((a, b) => b.uploadedAt - a.uploadedAt);
  }, [index]);

  const getIndexStats = useCallback(() => {
    const videos = Object.values(index);
    return {
      totalVideos: videos.length,
      totalDuration: videos.reduce((sum, video) => sum + video.duration, 0),
      totalSize: videos.reduce((sum, video) => sum + video.fileSize, 0),
      totalCaptions: videos.reduce(
        (sum, video) => sum + (video.captionSegments?.length || 0),
        0
      ),
      localProcessed: videos.filter((video) => video.processingMethod === "local").length,
      apiProcessed: videos.filter((video) => video.processingMethod === "api").length,
    };
  }, [index]);

  return {
    index,
    isLoading,
    addVideoToIndex,
    updateVideoInIndex,
    removeVideoFromIndex,
    searchVideos,
    getVideoById,
    getAllVideos,
    getIndexStats,
  };
};

// Helper functions
function extractKeywords(text: string): string[] {
  // Simple keyword extraction - remove common words and short words
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "will",
    "would",
    "could",
    "should",
    "this",
    "that",
    "these",
    "those",
  ]);

  return text
    .split(/\s+/)
    .map((word) => word.replace(/[^\w]/g, "").toLowerCase())
    .filter((word) => word.length > 2 && !commonWords.has(word))
    .slice(0, 20); // Limit to top 20 keywords
}

function getTextSnippet(
  text: string,
  matchIndex: number,
  _matchLength: number,
  maxLength = 100
): string {
  const start = Math.max(0, matchIndex - Math.floor(maxLength / 2));
  const end = Math.min(text.length, start + maxLength);

  let snippet = text.slice(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}
