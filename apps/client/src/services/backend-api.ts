/**
 * Backend API Client
 * 
 * Handles all communication with the Express backend.
 * NOTE: All blockchain transactions are now signed by users via wallet.
 * Backend only handles indexing, search, and data aggregation.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

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
