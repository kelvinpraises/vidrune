import { useCallback, useState } from "react";
import { toast } from "sonner";
import { icCanisterService } from "@/library/services/ic-canister";
import { icStorage } from "@/library/services/ic-storage";
import useStore from "@/library/store";

export interface TokenGatedUploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

export function useTokenGatedUpload() {
  const { updateStats } = useStore();
  const [uploadState, setUploadState] = useState<TokenGatedUploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null,
  });

  const checkTokenBalance = useCallback(async (): Promise<boolean> => {
    try {
      const balance = await icCanisterService.getTokenBalance();
      if (balance < 2) {
        toast.error("Insufficient VI tokens", {
          description: `You need at least 2 VI tokens to upload. You have ${Math.round(balance)} VI.`,
          action: {
            label: "Get Tokens",
            onClick: () => {
              // This will trigger the faucet - handled by connect button
              toast.info("Use the faucet in your connect button to get more tokens");
            },
          },
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to check token balance:", error);
      toast.error("Network error", {
        description: "Could not check token balance. Please try again.",
      });
      return false;
    }
  }, []);

  const uploadVideo = useCallback(
    async (
      file: File,
      metadata: {
        title: string;
        description: string;
        scenes?: Array<{ description: string; keywords: string[] }>;
      }
    ): Promise<{ success: boolean; videoCID?: string }> => {
      // Check token balance first
      const hasTokens = await checkTokenBalance();
      if (!hasTokens) {
        return { success: false };
      }

      setUploadState({
        isUploading: true,
        uploadProgress: 0,
        error: null,
      });

      try {
        // Step 1: Upload video to IC storage (20% progress)
        setUploadState(prev => ({ ...prev, uploadProgress: 20 }));
        const uploadResult = await icStorage.uploadVideo(file);
        
        // Step 2: Store metadata in access control canister (60% progress)
        setUploadState(prev => ({ ...prev, uploadProgress: 60 }));
        const metadataResult = await icCanisterService.storeVideoMetadata(
          metadata.title,
          metadata.description,
          uploadResult.key
        );

        if (!metadataResult.success) {
          throw new Error(metadataResult.message);
        }

        // Step 3: Update analytics and award points (100% progress)
        setUploadState(prev => ({ ...prev, uploadProgress: 100 }));
        const scenesCount = metadata.scenes?.length || 0;
        updateStats(scenesCount);

        // Success!
        toast.success("Video uploaded successfully!", {
          description: `${metadata.title} has been indexed. You earned points for ${scenesCount} scenes.`,
        });

        setUploadState({
          isUploading: false,
          uploadProgress: 100,
          error: null,
        });

        return { success: true, videoCID: uploadResult.cid };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        
        setUploadState({
          isUploading: false,
          uploadProgress: 0,
          error: errorMessage,
        });

        toast.error("Upload failed", {
          description: errorMessage,
        });

        return { success: false };
      }
    },
    [checkTokenBalance, updateStats]
  );

  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      uploadProgress: 0,
      error: null,
    });
  }, []);

  return {
    uploadState,
    uploadVideo,
    checkTokenBalance,
    resetUploadState,
  };
}