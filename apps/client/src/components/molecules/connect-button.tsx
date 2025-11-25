import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SuiClient } from "@mysten/sui/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { cn } from "@/utils";
import { useZkLogin } from "@/providers/zklogin-provider";
import { LoginModal } from "./login-modal";
import { TokenFaucet } from "./token-faucet";

const ellipsisAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function ConnectButton() {
  const { isAuthenticated, account, logout } = useZkLogin();
  const [suiBalance, setSuiBalance] = useState(0);
  const [rohrBalance, setRohrBalance] = useState(100); // Mock for now
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!account?.address) return;

    setIsLoadingBalances(true);
    try {
      const suiClient = new SuiClient({
        url: import.meta.env.VITE_SUI_RPC_URL || "https://fullnode.devnet.sui.io",
      });

      const balanceResult = await suiClient.getBalance({
        owner: account.address,
      });

      const balance = Number(balanceResult.totalBalance) / 1e9;
      setSuiBalance(balance);

      // TODO: Fetch ROHR token balance from contract
      setRohrBalance(100); // Mock
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [account?.address]);

  // Fetch balances on mount and when account changes
  useEffect(() => {
    if (isAuthenticated && account?.address) {
      fetchBalances();
    }
  }, [isAuthenticated, account?.address, fetchBalances]);

  const handleDisconnect = useCallback(() => {
    logout();
    setSuiBalance(0);
    setRohrBalance(0);
    toast.success("Disconnected successfully");
  }, [logout]);

  const handleRefreshBalance = useCallback(async () => {
    try {
      await fetchBalances();
      toast.success("Balances refreshed");
    } catch (error) {
      toast.error("Failed to refresh balances", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  }, [fetchBalances]);

  const handleGetSUITokens = useCallback(() => {
    if (!account?.address) {
      toast.error("No address found");
      return;
    }

    const faucetUrl = `https://faucet.sui.io/?network=devnet&address=${account.address}`;
    window.open(faucetUrl, "_blank", "noopener,noreferrer");
  }, [account?.address]);

  const handleCopyAddress = useCallback(async () => {
    if (!account?.address) {
      toast.error("No address found");
      return;
    }

    try {
      await navigator.clipboard.writeText(account.address);
      toast.success("Address copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy address");
    }
  }, [account?.address]);

  if (!isAuthenticated) {
    return (
      <LoginModal>
        <button
          className={cn(
            "bg-[#33CB82] hover:bg-[#33CB82]/80 w-[18ch] flex items-center justify-center font-bold px-6 rounded-[0] py-4 transition-colors duration-200 whitespace-nowrap"
          )}
        >
          Connect Wallet
        </button>
      </LoginModal>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-[#33CB82] hover:bg-[#33CB82]/80 w-[18ch] flex items-center justify-center font-bold px-6 rounded-[0] py-4 transition-colors duration-200">
          {ellipsisAddress(account?.address || "")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Connected</p>
            <p className="text-xs leading-none text-muted-foreground">
              {rohrBalance.toFixed(1)} ROHR | {suiBalance.toFixed(2)} SUI
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleCopyAddress}>
            Copy Address
          </DropdownMenuItem>
          <TokenFaucet
            currentBalance={rohrBalance}
            onBalanceUpdate={handleRefreshBalance}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Get ROHR Tokens
            </DropdownMenuItem>
          </TokenFaucet>
          <DropdownMenuItem onClick={handleGetSUITokens}>
            Get SUI Tokens
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleRefreshBalance();
            }}
            disabled={isLoadingBalances}
          >
            {isLoadingBalances ? "Refreshing..." : "Refresh Balances"}
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
