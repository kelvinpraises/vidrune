import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useZkLogin } from "@/providers/zklogin-provider";

export default function GoogleCallbackComponent() {
  const navigate = useNavigate();
  const { completeLogin } = useZkLogin();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full URL with hash fragment (contains JWT)
        const callbackUrl = window.location.href;

        // Complete the zkLogin flow
        await completeLogin(callbackUrl);

        toast.success("Successfully signed in!");

        // Redirect to home
        navigate({ to: "/" });
      } catch (error) {
        console.error("OAuth callback error:", error);
        toast.error("Failed to complete sign in", {
          description: error instanceof Error ? error.message : "Please try again",
        });

        // Redirect to home on error
        navigate({ to: "/" });
      }
    };

    handleCallback();
  }, [completeLogin, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
