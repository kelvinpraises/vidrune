import { useRef, useEffect, useState, useCallback } from "react";

export default function usePollingEffect(
  asyncCallback: () => Promise<any> | void,
  dependencies: any[],
  {
    interval = 10_000, // 10 seconds
    onCleanUp = () => {},
  } = {}
) {
  const [dead, setDead] = useState(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const cycleCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(0);

  const clearCurrentTimeout = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const resetCycle = useCallback(() => {
    clearCurrentTimeout();
    const now = Date.now();
    const elapsedTime = now - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, interval - elapsedTime);
    startTimeRef.current = now;
    cycleCountRef.current += 1;
  }, [clearCurrentTimeout, interval]);

  useEffect(() => {
    if (dead) {
      return;
    }

    let isMounted = true;

    const runPollingCycle = async () => {
      resetCycle();
      const currentCycle = cycleCountRef.current;

      while (isMounted && cycleCountRef.current === currentCycle) {
        try {
          await asyncCallback();
        } catch (error) {
          console.error("Polling callback error:", error);
        }

        if (isMounted && cycleCountRef.current === currentCycle) {
          const waitTime =
            cycleCountRef.current === currentCycle
              ? remainingTimeRef.current
              : interval;
          remainingTimeRef.current = interval; // Reset for next cycle

          await new Promise((resolve) => {
            startTimeRef.current = Date.now();
            timeoutIdRef.current = setTimeout(resolve, waitTime);
          });
        }
      }
    };

    runPollingCycle();

    return () => {
      isMounted = false;
      resetCycle();
      onCleanUp();
    };
  }, [...dependencies, interval, dead]);

  const kill = useCallback(() => setDead(true), []);
  const revive = useCallback(() => setDead(false), []);

  return [kill, revive];
}
