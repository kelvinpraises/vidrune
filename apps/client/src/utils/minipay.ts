/**
 * MiniPay Detection Utilities
 * 
 * MiniPay is a mobile wallet that injects itself into window.ethereum
 * with a special isMiniPay flag for detection.
 */

/**
 * Check if the app is running inside MiniPay wallet
 */
export function isMiniPay(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ethereum = window.ethereum as any;
  return Boolean(ethereum?.isMiniPay);
}

/**
 * Check if window.ethereum is available
 */
export function hasEthereum(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.ethereum);
}
