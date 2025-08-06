"use client";

import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/library/utils";
import { useMediaQuery } from "@/library/hooks/use-media-query";
import { Button } from "@/library/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/library/components/atoms/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/library/components/atoms/drawer";
import { icCanisterService } from "@/library/services/ic-canister";

interface TokenFaucetProps {
  children: React.ReactNode;
  currentBalance: number;
  onBalanceUpdate: () => void;
}

export function TokenFaucet({ children, currentBalance, onBalanceUpdate }: TokenFaucetProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleClaimTokens = async () => {
    setIsLoading(true);
    try {
      const result = await icCanisterService.getTestnetTokens();
      
      if (result.success) {
        toast.success("Tokens claimed successfully!", {
          description: result.message,
        });
        onBalanceUpdate(); // Refresh balance
        setOpen(false);
      } else {
        toast.error("Failed to claim tokens", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.error("Network error occurred", {
        description: "Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const FaucetContent = ({ className }: { className?: string }) => (
    <div className={cn("grid items-start gap-6", className)}>
      <div className="grid gap-3">
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-green-600">{Math.round(currentBalance)} VI</div>
          <div className="text-sm text-muted-foreground">Current Balance</div>
        </div>
      </div>
      
      <div className="grid gap-3">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">Get Free Testnet Tokens</div>
          <div className="text-sm text-muted-foreground">
            Claim 100 VI tokens to start indexing videos
          </div>
        </div>
      </div>

      <Button 
        onClick={handleClaimTokens} 
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Claiming..." : "Claim 100 VI Tokens"}
      </Button>

      <div className="text-xs text-muted-foreground text-center">
        Each video upload costs 2 VI tokens
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Token Faucet</DialogTitle>
            <DialogDescription>
              Get free testnet VI tokens to start indexing videos
            </DialogDescription>
          </DialogHeader>
          <FaucetContent />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Token Faucet</DrawerTitle>
          <DrawerDescription>
            Get free testnet VI tokens to start indexing videos
          </DrawerDescription>
        </DrawerHeader>
        <FaucetContent className="px-4" />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}