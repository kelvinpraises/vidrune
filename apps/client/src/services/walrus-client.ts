/**
 * Walrus Client - Backward compatibility wrapper
 *
 * This file re-exports storage functions for backward compatibility
 * with existing code that imports from walrus-client
 */

export { uploadBlob as uploadToWalrus, uploadFile, uploadJSON, downloadFile, getPublicUrl } from './storage';
