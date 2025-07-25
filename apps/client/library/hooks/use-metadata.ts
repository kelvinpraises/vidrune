import { useState, useEffect } from "react";
import { MetadataTable } from "../db/config";

export function useMetadata() {
  const [metadata, setMetadata] = useState<MetadataTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/metadata");
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setMetadata(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching metadata:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  return {
    metadata,
    isLoading,
    error,
    refetch: fetchMetadata
  };
} 