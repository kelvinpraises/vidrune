"use client";

import { useModal } from "connectkit";
import { useCallback } from "react";
import {
  useAccount,
  useConnect as useConnect$1,
  useDisconnect,
  useEnsName,
} from "wagmi";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";
import { cn, ellipsisAddress } from "@/utils";

export function UserNav() {
  const { address, isConnected, chainId, chain } = useAccount();
  const isMounted = useMounted();
  const { disconnect } = useDisconnect();
  const { reset } = useConnect$1();
  const { setOpen } = useModal();
  const { data: ensName } = useEnsName({
    chainId: chainId,
    address: address,
  });

  const handleDisconnect = useCallback(() => {
    setOpen(false);
    disconnect();
    reset();
  }, [disconnect, reset, setOpen]);

  if (!isConnected && !address) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={!isMounted}
        className={cn(
          "bg-[#33CB82] hover:bg-[#33CB82]/80 font-medium px-6 rounded-[0] py-4 transition-colors duration-200",
          !isMounted && "opacity-20 cursor-not-allowed"
        )}
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-[#33CB82] hover:bg-[#33CB82]/80 font-medium px-6 rounded-[0] py-4 transition-colors duration-200">
          {ensName || ellipsisAddress(address || "")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Connected</p>
            <p className="text-xs leading-none text-muted-foreground">
              {chain?.name}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            Profile
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
