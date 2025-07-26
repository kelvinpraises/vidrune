"use client";

import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/library/components/atoms/dropdown-menu";
import { useMounted } from "@/library/hooks/use-mounted";
import { cn, ellipsisAddress } from "@/library/utils";
import { TokenFaucet } from "./token-faucet";
import { icCanisterService } from "@/library/services/ic-canister";
import useStore from "@/library/store";

interface ICAuth {
  isConnected: boolean;
  principal: string | null;
  tokenBalance: number;
  isLoadingBalance: boolean;
}

export function ConnectButton() {
  const isMounted = useMounted();
  const { getOrCreateIdentity, isInitialized } = useStore();
  
  const [icAuth, setICAuth] = useState<ICAuth>({
    isConnected: false,
    principal: null,
    tokenBalance: 0,
    isLoadingBalance: false,
  });

  const handleConnect = useCallback(async () => {
    try {
      const { identity, principal } = getOrCreateIdentity();
      setICAuth(prev => ({
        ...prev,
        isConnected: true,
        principal,
        isLoadingBalance: true,
      }));
      
      // Fetch initial token balance
      const balance = await icCanisterService.getTokenBalance();
      setICAuth(prev => ({
        ...prev,
        tokenBalance: balance,
        isLoadingBalance: false,
      }));
      
      // Show warning if balance is low
      if (balance < 6) {
        toast.warning("Low token balance!", {
          description: `You have ${Math.round(balance)} VI tokens. Get more from the faucet to continue indexing.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error("Connection failed", {
        description: "Please try again",
      });
    }
  }, [getOrCreateIdentity]);

  const handleDisconnect = useCallback(() => {
    setICAuth({
      isConnected: false,
      principal: null,
      tokenBalance: 0,
      isLoadingBalance: false,
    });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!icAuth.isConnected) return;
    
    setICAuth(prev => ({ ...prev, isLoadingBalance: true }));
    try {
      const balance = await icCanisterService.getTokenBalance();
      setICAuth(prev => ({
        ...prev,
        tokenBalance: balance,
        isLoadingBalance: false,
      }));
    } catch (error) {
      console.error("Failed to refresh balance:", error);
      setICAuth(prev => ({ ...prev, isLoadingBalance: false }));
    }
  }, [icAuth.isConnected]);

  // Auto-connect if identity exists in store
  useEffect(() => {
    if (isInitialized && !icAuth.isConnected) {
      handleConnect();
    }
  }, [isInitialized, icAuth.isConnected, handleConnect]);

  // Periodic balance refresh
  useEffect(() => {
    if (!icAuth.isConnected) return;
    
    const interval = setInterval(refreshBalance, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [icAuth.isConnected, refreshBalance]);

  if (!icAuth.isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={!isMounted}
        className={cn(
          "bg-[#33CB82] hover:bg-[#33CB82]/80 w-[18ch] flex items-center justify-center font-bold px-6 rounded-[0] py-4 transition-colors duration-200 whitespace-nowrap",
          !isMounted && "opacity-20 cursor-not-allowed"
        )}
      >
        Connect Identity
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-[#33CB82] hover:bg-[#33CB82]/80 w-[18ch] flex flex-col items-center justify-center font-medium px-6 rounded-[0] py-4 transition-colors duration-200">
          <div className="text-xs opacity-80">
            {icAuth.isLoadingBalance ? "Loading..." : `${Math.round(icAuth.tokenBalance)} VI`}
          </div>
          <div className="text-sm">
            {ellipsisAddress(icAuth.principal || "")}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Connected</p>
            <p className="text-xs leading-none text-muted-foreground">
              {Math.round(icAuth.tokenBalance)} VI tokens
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <TokenFaucet
            currentBalance={icAuth.tokenBalance}
            onBalanceUpdate={refreshBalance}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Get Tokens
            </DropdownMenuItem>
          </TokenFaucet>
          <DropdownMenuItem onClick={refreshBalance} disabled={icAuth.isLoadingBalance}>
            {icAuth.isLoadingBalance ? "Refreshing..." : "Refresh Balance"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleDisconnect}>
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
