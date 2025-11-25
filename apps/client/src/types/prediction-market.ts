export interface PredictionMarket {
  id: string;
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  question: string; // e.g., "Are tags incomplete?"
  status: "active" | "resolved";
  totalStaked: number; // ROHR amount
  yesPercentage: number;
  noPercentage: number;
  endDate: number; // Unix timestamp
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
