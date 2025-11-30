import { useState } from "react";

// MetadataTable interface matching frontend expectations
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

// Backend VideoManifest type (from MeiliSearch)
interface BackendSearchResult {
  id: string;
  title: string;
  description?: string;
  transcription: string;
  sceneDescriptions: string;
  ttsContent: string;
  uploadedBy: string;
  uploadTime: number;
  tags?: string[];
}

interface BackendSearchResponse {
  success: boolean;
  results: BackendSearchResult[];
  total: number;
  query: string;
  limit: number;
  offset: number;
}

/**
 * Transform backend search result to frontend MetadataTable format
 */
function transformToMetadata(backendResult: BackendSearchResult): MetadataTable {
  // Extract cover image from backend result if available
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  
  return {
    id: backendResult.id,
    title: backendResult.title,
    description: backendResult.description || '',
    summary: backendResult.transcription.substring(0, 200) + '...', // Use first 200 chars of transcription as summary
    cover: `${backendUrl}/api/storage/public/${backendResult.id}`, // Use video ID to construct cover URL
    uploadedBy: backendResult.uploadedBy,
    createAt: new Date(backendResult.uploadTime),
    scenes: backendResult.sceneDescriptions ? [{
      description: backendResult.sceneDescriptions,
      keywords: backendResult.tags || []
    }] : undefined,
    capturedimgs: undefined
  };
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const url = `${backendUrl}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: BackendSearchResponse = await response.json();

      if (!data.success) {
        throw new Error('Search request was not successful');
      }

      // Transform backend results to frontend format
      const transformedResults: SearchResult[] = data.results.map((result, index) => ({
        id: result.id,
        score: 1 - (index * 0.05), // Approximate score based on result order
        metadata: transformToMetadata(result)
      }));
      
      setResults(transformedResults);
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