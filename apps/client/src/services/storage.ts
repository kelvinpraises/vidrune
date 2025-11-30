/**
 * Storage Service - Backend API integration for file uploads/downloads
 *
 * This service abstracts away storage implementation (Walrus, IPFS, etc.)
 * Frontend only needs to know about upload/download endpoints
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const STORAGE_API_BASE = `${BACKEND_URL}/api/storage`;

export interface UploadResult {
  success: boolean;
  blobId?: string;
  error?: string;
  url?: string;
}

export interface DownloadResult {
  success: boolean;
  data?: Blob;
  url?: string;
  error?: string;
}

/**
 * Upload a file to backend storage
 */
export async function uploadFile(
  file: File,
  filename?: string
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (filename) {
      formData.append('filename', filename);
    }

    const response = await fetch(`${STORAGE_API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      blobId: result.blobId,
      url: result.url,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload a Blob (for manifests, JSON data, etc.)
 */
export async function uploadBlob(
  blob: Blob,
  filename: string
): Promise<UploadResult> {
  const file = new File([blob], filename, { type: blob.type });
  return uploadFile(file, filename);
}

/**
 * Upload JSON data
 */
export async function uploadJSON(
  data: any,
  filename: string
): Promise<UploadResult> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return uploadBlob(blob, filename);
}

/**
 * Download a file from storage by blob ID
 */
export async function downloadFile(blobId: string): Promise<DownloadResult> {
  try {
    const response = await fetch(`${STORAGE_API_BASE}/download/${blobId}`);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    return {
      success: true,
      data: blob,
      url: URL.createObjectURL(blob),
    };
  } catch (error) {
    console.error('Download error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Get public URL for a blob (if backend supports it)
 */
export function getPublicUrl(blobId: string): string {
  return `${STORAGE_API_BASE}/public/${blobId}`;
}

/**
 * Upload multiple files at once
 */
export async function uploadMultipleFiles(
  files: File[]
): Promise<UploadResult[]> {
  return Promise.all(files.map(file => uploadFile(file)));
}

// Re-export for backward compatibility with existing code
export { uploadBlob as uploadToWalrus };
