/**
 * Throttle/Idempotency Service
 *
 * Prevents duplicate processing when frontend polls backend every 20s.
 * Ensures each item is processed only once within a configurable TTL period.
 *
 * Features:
 * - Thread-safe for concurrent requests
 * - Configurable TTL per item type
 * - Automatic cleanup of expired entries
 * - Singleton pattern for global instance
 */

export class ThrottleService {
  private processed: Map<string, number>; // id => timestamp
  private cleanupInterval: NodeJS.Timeout | null;
  private readonly DEFAULT_TTL = 3600000; // 1 hour in milliseconds
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes in milliseconds

  constructor() {
    this.processed = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Check if an item should be processed (idempotent operation)
   *
   * @param id - Unique identifier for the item
   * @param ttl - Time-to-live in milliseconds (default: 1 hour)
   * @returns true if item should be processed, false if already processed within TTL
   */
  shouldProcess(id: string, ttl: number = this.DEFAULT_TTL): boolean {
    const now = Date.now();
    const lastProcessed = this.processed.get(id);

    // Not processed yet, or TTL expired
    if (!lastProcessed || now - lastProcessed >= ttl) {
      this.processed.set(id, now);
      return true;
    }

    // Still within TTL period
    return false;
  }

  /**
   * Mark an item as processed manually
   * Useful when you want to record processing without checking shouldProcess
   *
   * @param id - Unique identifier for the item
   */
  markProcessed(id: string): void {
    this.processed.set(id, Date.now());
  }

  /**
   * Check if an item was recently processed (without marking as processed)
   *
   * @param id - Unique identifier for the item
   * @param ttl - Time-to-live in milliseconds (default: 1 hour)
   * @returns true if item was processed within TTL
   */
  wasRecentlyProcessed(id: string, ttl: number = this.DEFAULT_TTL): boolean {
    const lastProcessed = this.processed.get(id);
    if (!lastProcessed) return false;

    const now = Date.now();
    return now - lastProcessed < ttl;
  }

  /**
   * Clear expired entries from the processed map
   * Removes entries older than their TTL
   */
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.processed.entries());

    for (const [id, timestamp] of entries) {
      // Remove entries older than default TTL
      // In practice, individual TTLs may vary, but we clean up conservatively
      if (now - timestamp >= this.DEFAULT_TTL) {
        this.processed.delete(id);
      }
    }
  }

  /**
   * Get the number of currently tracked items
   * Useful for monitoring and debugging
   */
  size(): number {
    return this.processed.size;
  }

  /**
   * Clear all tracked items
   * Use with caution - mainly for testing
   */
  clear(): void {
    this.processed.clear();
  }

  /**
   * Start periodic cleanup of expired entries
   * Runs every 5 minutes to prevent memory bloat
   */
  private startCleanup(): void {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Start new cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);

    // Allow Node.js to exit even if interval is active
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop the periodic cleanup
   * Call this when shutting down the service
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get processing timestamp for an item
   *
   * @param id - Unique identifier for the item
   * @returns timestamp when item was processed, or undefined if never processed
   */
  getProcessedTime(id: string): number | undefined {
    return this.processed.get(id);
  }
}

// Lazy singleton - only instantiate when first accessed
let throttleServiceInstance: ThrottleService | null = null;

/**
 * Get the throttle service singleton instance
 * 
 * @example
 * ```typescript
 * import { getThrottleService } from './services/throttle';
 *
 * // In polling endpoint
 * const throttle = getThrottleService();
 * if (throttle.shouldProcess(`market-create-${videoId}`, 3600000)) {
 *   await createMarket(videoId); // Only runs once per hour
 * }
 * ```
 */
export function getThrottleService(): ThrottleService {
  if (!throttleServiceInstance) {
    throttleServiceInstance = new ThrottleService();
  }
  return throttleServiceInstance;
}

// For backwards compatibility - lazy proxy
export const throttleService = {
  get instance() {
    return getThrottleService();
  },
  shouldProcess: (...args: Parameters<ThrottleService['shouldProcess']>) => getThrottleService().shouldProcess(...args),
  markProcessed: (...args: Parameters<ThrottleService['markProcessed']>) => getThrottleService().markProcessed(...args),
  wasRecentlyProcessed: (...args: Parameters<ThrottleService['wasRecentlyProcessed']>) => getThrottleService().wasRecentlyProcessed(...args),
  cleanup: () => getThrottleService().cleanup(),
  size: () => getThrottleService().size(),
  clear: () => getThrottleService().clear(),
  stopCleanup: () => getThrottleService().stopCleanup(),
  getProcessedTime: (...args: Parameters<ThrottleService['getProcessedTime']>) => getThrottleService().getProcessedTime(...args),
};
