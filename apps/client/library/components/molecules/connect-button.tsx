"use client";

import { useCallback, useState } from "react";

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

// TODO: Replace with Internet Computer authentication
interface MockICAuth {
  isConnected: boolean;
  principal: string | null;
}

export function ConnectButton() {
  const isMounted = useMounted();
  
  // TODO: Replace with actual Internet Identity integration
  const [icAuth, setICAuth] = useState<MockICAuth>({
    isConnected: false,
    principal: null,
  });

  const handleConnect = useCallback(async () => {
    // TODO: Implement Internet Identity login
    console.log("TODO: Implement Internet Identity login");
    // Placeholder mock connection
    setICAuth({
      isConnected: true,
      principal: "rdmx6-jaaaa-aaaah-qcaiq-cai", // Mock principal
    });
  }, []);

  const handleDisconnect = useCallback(() => {
    // TODO: Implement Internet Identity logout
    console.log("TODO: Implement Internet Identity logout");
    setICAuth({
      isConnected: false,
      principal: null,
    });
  }, []);

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
        <button className="bg-[#33CB82] hover:bg-[#33CB82]/80 w-[18ch] flex items-center justify-center font-medium px-6 rounded-[0] py-4 transition-colors duration-200">
          {ellipsisAddress(icAuth.principal || "")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Connected</p>
            <p className="text-xs leading-none text-muted-foreground">
              Internet Computer
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => console.log("TODO: Profile")}>
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
