/**
 * Backend API Client
 * 
 * Handles all communication with the Express backend.
 * Backend emits SDS events when these endpoints are called.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Submit video index via backend
 * Backend will emit SDS event
 */
export const submitVideoViaBackend = async (
  videoId: string,
  walrusBlobId: string,
  userId: string,
  title?: string
): Promise<{ txHash: string }> => {
  const response = await fetch(`${BACKEND_URL}/api/markets/video/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, walrusBlobId, userId, title })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit video');
  }

  const data = await response.json();
  return { txHash: data.txHash };
};

/**
 * Submit conviction via backend
 * Backend will emit SDS event
 */
export const submitConvictionViaBackend = async (
  videoId: string,
  proofBlobId: string,
  userId: string,
  fact?: string
): Promise<{ txHash: string }> => {
  const response = await fetch(`${BACKEND_URL}/api/markets/video/conviction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, proofBlobId, userId, fact })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit conviction');
  }

  const data = await response.json();
  return { txHash: data.txHash };
};

/**
 * Create a prediction market via backend
 * Backend will emit SDS event after creating on-chain
 */
export const createMarketViaBackend = async (
  videoId: string,
  question: string,
  convictionIds: string[]
): Promise<{ marketId: string }> => {
  const response = await fetch(`${BACKEND_URL}/api/markets/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, question, convictionIds })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create market');
  }

  const data = await response.json();
  return { marketId: data.marketId };
};

/**
 * Vote on a market via backend
 * Backend will emit SDS event
 */
export const voteOnMarketViaBackend = async (
  marketId: string,
  isYes: boolean,
  userId: string
): Promise<void> => {
  const response = await fetch(`${BACKEND_URL}/api/markets/${marketId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isYes, userId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to vote');
  }
};

/**
 * Resolve a market via backend
 * Backend will use AI to analyze and emit SDS event
 */
export const resolveMarketViaBackend = async (
  marketId: string,
  options: {
    useAI?: boolean;
    winningSide?: boolean;
    videoUrl?: string;
    conviction?: string;
    proof?: string;
  }
): Promise<{ txHash: string; winningSide: boolean }> => {
  const response = await fetch(`${BACKEND_URL}/api/markets/${marketId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to resolve market');
  }

  const data = await response.json();
  return { txHash: data.txHash, winningSide: data.winningSide };
};

/**
 * Get all markets from backend
 */
export const getMarketsFromBackend = async () => {
  const response = await fetch(`${BACKEND_URL}/api/markets`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch markets');
  }

  const data = await response.json();
  return data.markets;
};

/**
 * Get specific market from backend
 */
export const getMarketFromBackend = async (marketId: string) => {
  const response = await fetch(`${BACKEND_URL}/api/markets/${marketId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch market');
  }

  const data = await response.json();
  return data.market;
};
