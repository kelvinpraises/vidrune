import { useState, useEffect } from "react";
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

export function useMetadata() {
  const [metadata, setMetadata] = useState<MetadataTable[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Set to false to avoid loading state
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = async () => {
    setIsLoading(true);
    try {
      // Temporarily return mock data instead of API call
      const mockData: MetadataTable[] = [
        {
          id: "video_1",
          title: "Sample Video 1",
          description: "A sample video for testing",
          summary: "This is a sample video used for testing the interface",
          cover: "/placeholder-image.jpg",
          uploadedBy: "user123",
          createAt: new Date(),
          scenes: [
            {
              description: "Opening scene",
              keywords: ["intro", "start", "beginning"]
            }
          ],
          capturedimgs: ["/placeholder-image.jpg"]
        },
        {
          id: "video_2",
          title: "Sample Video 2",
          description: "Another sample video",
          summary: "This is another sample video for testing",
          cover: "/placeholder-image.jpg",
          uploadedBy: "user456",
          createAt: new Date(),
          scenes: [
            {
              description: "Main content",
              keywords: ["content", "main", "video"]
            }
          ],
          capturedimgs: ["/placeholder-image.jpg"]
        }
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setMetadata(mockData);
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