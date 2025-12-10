import { useEffect, useState } from 'react';
import { isMiniPay } from '@/utils/minipay';

/**
 * Hook to detect if the app is running inside MiniPay wallet
 * and manage MiniPay-specific state
 */
export function useMiniPay() {
  const [isInMiniPay, setIsInMiniPay] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    // Check on mount
    const checkMiniPay = () => {
      setIsInMiniPay(isMiniPay());
      setIsChecked(true);
    };

    // Check immediately
    checkMiniPay();

    // Also check after a short delay in case ethereum is injected late
    const timeout = setTimeout(checkMiniPay, 100);

    return () => clearTimeout(timeout);
  }, []);

  return {
    isInMiniPay,
    isChecked,
  };
}
