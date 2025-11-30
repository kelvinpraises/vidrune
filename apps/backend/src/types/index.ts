// Shared types for Vidrune backend

export interface Market {
  id: string;
  question: string;
  description: string;
  endTime: number;
  totalStake: bigint;
  resolved: boolean;
  outcome?: boolean;
}

export interface Prediction {
  marketId: string;
  user: string;
  amount: bigint;
  prediction: boolean;
  timestamp: number;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

export interface WalrusUploadResult {
  blobId: string;
  url: string;
  size: number;
}

export interface StreamData {
  feedId: string;
  timestamp: number;
  value: any;
  metadata?: Record<string, any>;
}

export interface GeminiAnalysisResult {
  summary: string;
  topics: string[];
  sentiment?: string;
  confidence?: number;
}

export interface Conviction {
  id: string;
  fact: string;
  proof: string;
}

export interface MarketGroup {
  convictionIds: string[];
  question: string;
}

export interface MarketResolution {
  verdict: boolean;
  reasoning: string;
}
