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
  uploadJSON as uploadJSONService,
  downloadFile,
  getPublicUrl,
  type UploadResult,
  type DownloadResult,
} from '@/services/storage';

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
    filename?: string
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadFile(file, filename);

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
    filename: string
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadBlob(blob, filename);

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
    filename: string
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadJSONService(data, filename);

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
      const result = await downloadFile(blobId);

      if (!result.success) {
        setError(result.error || 'Download failed');
      }

      return result;
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
    return getPublicUrl(blobId);
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
