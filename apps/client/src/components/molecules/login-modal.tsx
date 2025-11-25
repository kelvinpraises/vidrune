"use client";

import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useZkLogin } from "@/providers/zklogin-provider";
import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/atoms/drawer";

interface LoginModalProps {
  children: React.ReactNode;
}

export function LoginModal({ children }: LoginModalProps) {
  const [open, setOpen] = React.useState(false);
  const { initiateLogin, isLoading, error } = useZkLogin();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleGoogleSignIn = async () => {
    try {
      const loginUrl = await initiateLogin();
      // Redirect to Google OAuth
      window.location.href = loginUrl;
    } catch (err) {
      toast.error("Failed to initiate login", {
        description: err instanceof Error ? err.message : "Please try again later",
      });
    }
  };

  const LoginContent = ({ className }: { className?: string }) => (
    <div className={cn("grid items-start gap-6", className)}>
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-semibold">Connect with Google</h3>
        <p className="text-sm text-muted-foreground">
          Sign in with your Google account to access Vidrune
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Sign In Button */}
      <Button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        <svg
          className="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {isLoading ? "Connecting..." : "Sign in with Google"}
      </Button>

      {/* Privacy Note */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>By continuing, you agree to our Terms of Service</p>
        <p>We use zkLogin for secure, privacy-preserving authentication</p>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Welcome to Vidrune</DialogTitle>
            <DialogDescription>
              Connect your account to start indexing and exploring videos
            </DialogDescription>
          </DialogHeader>
          <LoginContent />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Welcome to Vidrune</DrawerTitle>
          <DrawerDescription>
            Connect your account to start indexing and exploring videos
          </DrawerDescription>
        </DrawerHeader>
        <LoginContent className="px-4" />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
