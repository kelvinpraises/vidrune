/**
 * MiniPay Detection Utilities
 * 
 * MiniPay is a mobile wallet that injects itself into window.ethereum
 * with a special isMiniPay flag for detection.
 */

export interface MiniPayEthereum extends Window['ethereum'] {
  isMiniPay?: boolean;
}

/**
 * Check if the app is running inside MiniPay wallet
 */
export function isMiniPay(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ethereum = window.ethereum as MiniPayEthereum;
  return Boolean(ethereum && ethereum.isMiniPay);
}

/**
 * Check if window.ethereum is available
 */
export function hasEthereum(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.ethereum);
}
