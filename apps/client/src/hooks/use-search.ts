import { useState } from "react";
// import { MetadataTable } from "../db/config";

// Temporary MetadataTable interface for compilation
interface MetadataTable {
  id: string;
  title: string;
  description: string;
  summary: string;
  cover: string;
  uploadedBy: string;
  createAt: Date | string;
  scenes?: Array<{
    description: string;
    keywords: string[];
  }>;
  capturedimgs?: string[];
}

interface SearchResult {
  id: string;
  score: number;
  metadata: MetadataTable | null;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string, limit = 10) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Temporarily return mock search results instead of API call
      const mockResults: SearchResult[] = [
        {
          id: "search_result_1",
          score: 0.95,
          metadata: {
            id: "video_1",
            title: `Search Result for "${query}"`,
            description: `This is a mock search result for your query: ${query}`,
            summary: `Mock video content related to ${query}`,
            cover: "/placeholder-image.jpg",
            uploadedBy: "user123",
            createAt: new Date(),
            scenes: [
              {
                description: `Scene related to ${query}`,
                keywords: [query.toLowerCase(), "search", "result"]
              }
            ],
            capturedimgs: ["/placeholder-image.jpg"]
          }
        },
        {
          id: "search_result_2", 
          score: 0.87,
          metadata: {
            id: "video_2",
            title: `Another Result for "${query}"`,
            description: `This is another mock search result for: ${query}`,
            summary: `Additional mock video content about ${query}`,
            cover: "/placeholder-image.jpg",
            uploadedBy: "user456",
            createAt: new Date(),
            scenes: [
              {
                description: `Another scene about ${query}`,
                keywords: [query.toLowerCase(), "mock", "test"]
              }
            ],
            capturedimgs: ["/placeholder-image.jpg"]
          }
        }
      ].slice(0, limit);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setResults(mockResults);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    results,
    isSearching,
    error,
    search
  };
} 