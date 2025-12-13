/**
 * Storage Hook - React hook for file uploads/downloads
 *
 * Usage:
 *   const { upload, download, uploadJSON, isUploading, error } = useStorage();
 *   const result = await upload(file);
 */

import { useState } from 'react';
import {
  uploadFile,
  uploadBlob,
  downloadFile,
  getBlobUrl,
  type WalrusUploadResult,
} from '@/services/walrus-storage';

type UploadResult = WalrusUploadResult;
type DownloadResult = { success: boolean; data?: Blob; error?: string };

export function useStorage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Upload a file
   */
  const upload = async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadFile(file, onProgress);

      if (!result.success) {
        setError(result.error || 'Upload failed');
      } else {
        setProgress(100);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Upload a Blob
   */
  const uploadBlobData = async (
    blob: Blob,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadBlob(blob, filename, onProgress);

      if (!result.success) {
        setError(result.error || 'Upload failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Upload JSON data
   */
  const uploadJSON = async (
    data: any,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);

    try {
      const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const result = await uploadBlob(jsonBlob, filename, onProgress);

      if (!result.success) {
        setError(result.error || 'Upload failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Download a file by blob ID
   */
  const download = async (blobId: string): Promise<DownloadResult> => {
    setIsDownloading(true);
    setError(null);

    try {
      const blob = await downloadFile(blobId);
      return {
        success: true,
        data: blob || undefined,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Get public URL for a blob
   */
  const getUrl = (blobId: string): string => {
    return getBlobUrl(blobId);
  };

  /**
   * Reset error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    upload,
    uploadBlob: uploadBlobData,
    uploadJSON,
    download,
    getUrl,
    isUploading,
    isDownloading,
    progress,
    error,
    clearError,
  };
}
