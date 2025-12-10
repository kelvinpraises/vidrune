import { useModal } from "connectkit";
import { useCallback } from "react";
import {
  useAccount,
  useConnect,
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
import { useMiniPay } from "@/hooks/use-minipay";
import { ellipsisAddress } from "@/utils";

export function ConnectButton() {
  const { address, isConnected, chainId, chain } = useAccount();
  const isMounted = useMounted();
  const { isInMiniPay } = useMiniPay();
  const { disconnect } = useDisconnect();
  const { reset } = useConnect();
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

  if (!isMounted) return null;

  if (!isConnected && !address) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[#33CB82] hover:bg-[#33CB82]/80 font-semibold px-6 py-4 transition-colors duration-200 text-black"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-[#33CB82] hover:bg-[#33CB82]/80 font-semibold px-6 py-4 transition-colors duration-200 text-black">
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
        {/* Hide disconnect option in MiniPay since wallet is managed by the app */}
        {!isInMiniPay && (
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleDisconnect}>
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
