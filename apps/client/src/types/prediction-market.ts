export interface PredictionMarket {
  id: string;
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  question: string; // e.g., "Are tags incomplete?"
  status: "active" | "closed" | "resolved";
  totalStaked: number; // ROHR amount
  yesVotes: number; // Actual vote count
  noVotes: number; // Actual vote count
  yesPercentage: number;
  noPercentage: number;
  createdAt: number; // Unix timestamp when market was created
  endDate: number; // Unix timestamp when market expires
  expiresAt?: number; // Unix timestamp when market expires (from contract)
  resolved?: boolean; // Whether market has been resolved
  winningSide?: boolean; // true = YES won, false = NO won
  convictions: Conviction[]; // Convictions that seeded this market
}

export interface Conviction {
  id: string;
  videoId: string;
  submittedBy: string;
  fact: string;
  proofs: string[];
  stakeAmount: number;
  timestamp: number;
}

export interface MarketActivity {
  id: string;
  user: string;
  action: "staked";
  choice: "Yes" | "No";
  amount: number;
  timestamp: number;
  avatar?: string;
}
