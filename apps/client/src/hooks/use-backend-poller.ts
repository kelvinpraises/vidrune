import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

interface BackendPollerState {
  isPolling: boolean;
  lastPollTime: number | null;
  error: string | null;
}

const POLL_INTERVAL = Number(import.meta.env.VITE_POLL_INTERVAL) || 20000; // 20 seconds
const ENABLE_POLLING = import.meta.env.VITE_ENABLE_POLLING !== 'false'; // Default true
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Hook that polls the backend every 20 seconds to trigger market creation/resolution.
 * This runs globally and is safe to call multiple times (idempotent).
 *
 * @returns {BackendPollerState} Current polling state
 */
export function useBackendPoller(): BackendPollerState {
  const { isConnected } = useAccount();
  const [state, setState] = useState<BackendPollerState>({
    isPolling: false,
    lastPollTime: null,
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const pollBackend = async () => {
    // Prevent concurrent polls
    if (isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    setState(prev => ({ ...prev, isPolling: true, error: null }));

    try {
      const response = await fetch(`${BACKEND_URL}/api/poll-updates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });


      if (!response.ok) {
        // Don't spam console with errors - just track the error state
        const errorText = await response.text().catch(() => 'Unknown error');
        setState(prev => ({
          ...prev,
          isPolling: false,
          error: `Poll failed: ${response.status} ${errorText}`,
        }));
        return;
      }

      // Success - update last poll time
      setState({
        isPolling: false,
        lastPollTime: Date.now(),
        error: null,
      });
    } catch (error) {
            console.log(error)

      // Network error or fetch failed - don't spam console
      setState(prev => ({
        ...prev,
        isPolling: false,
        error: error instanceof Error ? error.message : 'Network error',
      }));
    } finally {
      isPollingRef.current = false;
    }
  };

  useEffect(() => {
    // Only poll if:
    // 1. Polling is enabled via env
    // 2. User is connected to wallet (optional optimization)
    if (!ENABLE_POLLING || !isConnected) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling immediately
    pollBackend();

    // Set up interval for subsequent polls
    intervalRef.current = setInterval(pollBackend, POLL_INTERVAL);

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isConnected]); // Re-run when wallet connection changes

  return state;
}
